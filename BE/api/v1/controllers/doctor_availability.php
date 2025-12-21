<?php
// Bắt đầu Output Buffering
ob_start(); 
session_start();

// ==============================
// HÀM DEBUG & BẮT LỖI JSON
// ==============================
function debug_exit($e = null) {
    $buffer = ob_get_contents();
    if (ob_get_level() > 0) { ob_end_clean(); }

    header("Content-Type: application/json; charset=UTF-8");
    http_response_code(500);

    $response = [
        "message" => "Lỗi hệ thống! Vui lòng kiểm tra log.",
        "debug_output" => trim($buffer),
        "exception" => $e ? $e->getMessage() : null
    ];

    if ($e && $e instanceof PDOException) {
        $response['message'] = "Lỗi Database: " . $e->getMessage() . " (Code: " . $e->getCode() . ")";
    } else if ($e) {
         $response['message'] = "Lỗi Server: " . $e->getMessage();
    }

    echo json_encode($response);
    exit;
}

// ==============================
// CẤU HÌNH CORS
// ==============================
$allowed_origin = 'http://localhost:5173';
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: $allowed_origin");
    header("Access-Control-Allow-Credentials: true");
    // Thêm PUT vào danh sách các method cho phép
    header("Access-Control-Allow-Methods: GET, POST, DELETE, PUT, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    http_response_code(200);
    exit();
}

header("Access-Control-Allow-Origin: $allowed_origin");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, DELETE, PUT"); 

// ===================================
// LOAD MODELS & DB
// ===================================
try {
    require_once '../config/database.php';
    require_once '../models/Doctor.php'; 
    require_once '../models/DoctorAvailability.php'; // Load thêm Model Availability để dùng các hàm tiện ích
    
    $database = new Database();
    $db = $database->getConnection();
    if (!$db) { throw new Exception("Lỗi kết nối database."); }

    $doctorModel = new Doctor($db);
    $availabilityModel = new DoctorAvailability($db); // Khởi tạo model

} catch (Exception $e) {
    debug_exit($e);
}

// ===================================
// KIỂM TRA SESSION & VAI TRÒ DOCTOR
// ===================================
if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'DOCTOR') {
    http_response_code(401);
    echo json_encode(["message" => "Truy cập bị từ chối. Chỉ Doctor mới được thiết lập lịch."]);
    exit();
}

$userId = $_SESSION['user_id'];
$doctorProfileStmt = $doctorModel->getProfileByUserId($userId);

if ($doctorProfileStmt->rowCount() === 0) {
    http_response_code(404);
    echo json_encode(["message" => "Không tìm thấy hồ sơ bác sĩ chi tiết."]);
    exit();
}
$doctorRow = $doctorProfileStmt->fetch(PDO::FETCH_ASSOC);
$doctorId = $doctorRow['doctor_id'];

// ===================================
// 1. GET: Lấy danh sách các Slot (Có filter)
// ===================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // Lấy tham số filter từ URL
        $startDate = $_GET['start'] ?? date('Y-m-d');
        $endDate = $_GET['end'] ?? date('Y-m-d', strtotime('+14 days')); 

        $query = "SELECT id, date, start_time, end_time, is_booked, is_locked 
                  FROM doctor_availability 
                  WHERE doctor_id = :doctor_id 
                  AND date BETWEEN :start_date AND :end_date
                  ORDER BY date ASC, start_time ASC";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':doctor_id', $doctorId);
        $stmt->bindParam(':start_date', $startDate);
        $stmt->bindParam(':end_date', $endDate);
        $stmt->execute();

        $list = $stmt->fetchAll(PDO::FETCH_ASSOC);

        http_response_code(200);
        echo json_encode(["data" => $list]);
        exit();

    } catch (Exception $e) {
        debug_exit($e);
    }
}

// ===================================
// 2. POST: Tạo lịch hàng loạt (Batch Create)
// ===================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (empty($data['startDate']) || empty($data['endDate']) || 
        empty($data['startTime']) || empty($data['endTime']) || 
        empty($data['daysOfWeek'])) {
        
        http_response_code(400);
        echo json_encode(["message" => "Thiếu thông tin bắt buộc."]);
        exit();
    }
    
    try {
        $db->beginTransaction();

        $duration = $data['duration'] ?? 30; // Mặc định 30 phút

        // Gọi hàm tạo lịch hàng loạt trong Doctor Model
        $success = $doctorModel->createAvailabilityBatch(
            $doctorId,
            $data['startDate'],
            $data['endDate'],
            $data['daysOfWeek'], 
            $data['startTime'],
            $data['endTime'],
            $duration
        );

        if (!$success) {
            throw new Exception("Lỗi khi tạo các slot lịch (Có thể do lỗi DB hoặc logic).");
        }
        
        $db->commit();

        http_response_code(201);
        echo json_encode(["message" => "Đã tạo lịch làm việc thành công!"]);
        exit();

    } catch (Exception $e) {
        if ($db->inTransaction()) { $db->rollback(); }
        debug_exit($e);
    }
}

// ===================================
// 3. PUT: Khóa / Mở khóa Lịch (Action: toggle_slot | lock_day)
// ===================================
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);
    $action = $data['action'] ?? ''; 

    try {
        $db->beginTransaction();

        if ($action === 'toggle_slot') {
            // --- CASE A: KHÓA/MỞ 1 SLOT CỤ THỂ ---
            $id = $data['id'] ?? null;
            // Nhận trạng thái mới từ client (1 hoặc 0)
            $isLocked = isset($data['is_locked']) ? (int)$data['is_locked'] : 1;

            if (!$id) throw new Exception("Thiếu ID slot.");

            // Kiểm tra quyền sở hữu và xem slot có bị book chưa
            // Chỉ cho phép khóa nếu is_booked = 0. Nếu đã book thì không khóa được (phải hủy trước)
            // Tuy nhiên, nếu đang MỞ KHÓA (isLocked=0) thì không cần check is_booked (vì slot đang bị khóa thì chắc chắn chưa book)
            
            $checkQuery = "SELECT is_booked FROM doctor_availability WHERE id = :id AND doctor_id = :doctor_id LIMIT 1";
            $checkStmt = $db->prepare($checkQuery);
            $checkStmt->bindParam(':id', $id);
            $checkStmt->bindParam(':doctor_id', $doctorId);
            $checkStmt->execute();
            
            $slot = $checkStmt->fetch(PDO::FETCH_ASSOC);
            if (!$slot) throw new Exception("Slot không tồn tại hoặc không thuộc về bạn.");
            
            // Nếu muốn khóa mà slot đã có người đặt -> Lỗi
            if ($isLocked === 1 && (int)$slot['is_booked'] === 1) {
                throw new Exception("Không thể khóa slot này vì đã có bệnh nhân đặt.");
            }

            // Thực hiện update dùng Model DoctorAvailability
            $availabilityModel->toggleLock($id, $isLocked);
            
            $message = $isLocked ? "Đã khóa slot thành công." : "Đã mở khóa slot.";

        } elseif ($action === 'lock_day') {
            // --- CASE B: KHÓA TOÀN BỘ NGÀY (BÁO NGHỈ) ---
            $date = $data['date'] ?? null;
            $type = $data['type'] ?? 'LOCK'; // LOCK hoặc UNLOCK

            if (!$date) throw new Exception("Thiếu ngày cần khóa.");

            $lockVal = ($type === 'LOCK') ? 1 : 0;

            // Update SQL: Chỉ cập nhật các slot của bác sĩ trong ngày đó
            // QUAN TRỌNG: Nếu LOCK -> Chỉ khóa các slot CHƯA ĐẶT (is_booked=0). Các slot đã đặt phải giữ nguyên hoặc xử lý riêng.
            // Nếu UNLOCK -> Mở khóa tất cả các slot đang bị khóa.
            
            $query = "UPDATE doctor_availability 
                      SET is_locked = :is_locked 
                      WHERE doctor_id = :doctor_id 
                      AND date = :date 
                      AND is_booked = 0"; // Chỉ tác động slot chưa ai đặt
            
            $stmt = $db->prepare($query);
            $stmt->bindParam(':is_locked', $lockVal);
            $stmt->bindParam(':doctor_id', $doctorId);
            $stmt->bindParam(':date', $date);
            
            if (!$stmt->execute()) {
                throw new Exception("Lỗi khi cập nhật trạng thái ngày.");
            }

            $affected = $stmt->rowCount();
            $message = ($type === 'LOCK') 
                ? "Đã khóa $affected slot trống trong ngày $date." 
                : "Đã mở lại $affected slot trong ngày $date.";
                
        } else {
            http_response_code(400);
            throw new Exception("Hành động (action) không hợp lệ.");
        }

        $db->commit();
        http_response_code(200);
        echo json_encode(["message" => $message]);
        exit();

    } catch (Exception $e) {
        if ($db->inTransaction()) { $db->rollback(); }
        debug_exit($e);
    }
}

// ===================================
// 4. DELETE: Xóa 1 Slot cụ thể
// ===================================
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $data = json_decode(file_get_contents("php://input"), true);
    $id = $data['id'] ?? null;

    if (!$id) {
        http_response_code(400);
        echo json_encode(["message" => "Thiếu ID lịch cần xóa."]);
        exit();
    }

    try {
        $db->beginTransaction();
        
        // Kiểm tra quyền và trạng thái
        $checkQuery = "SELECT doctor_id, is_booked FROM doctor_availability WHERE id = :id LIMIT 1";
        $checkStmt = $db->prepare($checkQuery);
        $checkStmt->bindParam(':id', $id);
        $checkStmt->execute();

        if ($checkStmt->rowCount() === 0) {
            http_response_code(404);
            throw new Exception("Không tìm thấy slot lịch này.");
        }

        $row = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if ((int)$row['doctor_id'] !== (int)$doctorId) {
            http_response_code(403);
            throw new Exception("Bạn không có quyền xóa lịch này.");
        }

        if ((int)$row['is_booked'] === 1) {
            http_response_code(400);
            throw new Exception("Không thể xóa lịch đã có bệnh nhân đặt. Vui lòng hủy hẹn trước.");
        }

        // Thực hiện xóa
        $delQuery = "DELETE FROM doctor_availability WHERE id = :id";
        $delStmt = $db->prepare($delQuery);
        $delStmt->bindParam(':id', $id);

        if (!$delStmt->execute()) {
            throw new Exception("Lỗi Database khi xóa lịch.");
        }
        
        $db->commit();
        http_response_code(200);
        echo json_encode(["message" => "Đã xóa slot lịch thành công."]);
        exit();

    } catch (Exception $e) {
        if ($db->inTransaction()) { $db->rollback(); }
        debug_exit($e);
    }
}

// ===================================
// DEFAULT
// ===================================
http_response_code(405);
echo json_encode(["message" => "Method không được hỗ trợ."]);
exit;