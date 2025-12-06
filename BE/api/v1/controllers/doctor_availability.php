<?php
// Bắt đầu Output Buffering
ob_start(); 
session_start();

// ==============================
// HÀM DEBUG & BẮT LỖI JSON
// Hàm này tương tự debug_exit, sử dụng cho lỗi chung
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
// CẤU HÌNH CORS & HEADERS
// ==============================
$allowed_origin = 'http://localhost:5173';
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: $allowed_origin");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    http_response_code(200);
    exit();
}

header("Access-Control-Allow-Origin: $allowed_origin");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, DELETE"); 

// ===================================
// LOAD MODELS & DB
// ===================================
try {
    require_once '../config/database.php';
    require_once '../models/Doctor.php'; 
    require_once '../models/DoctorAvailability.php'; 
    
    $database = new Database();
    $db = $database->getConnection();
    if (!$db) { throw new Exception("Lỗi kết nối database."); }

    $doctorModel = new Doctor($db);
    $availabilityModel = new DoctorAvailability($db);
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
// GET: Lấy danh sách Lịch
// ===================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $availabilityModel->getAvailabilityByDoctorId($doctorId);
        $list = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];

        http_response_code(200);
        echo json_encode(["data" => $list]);
        exit();

    } catch (Exception $e) {
        debug_exit($e);
    }
}

// ===================================
// POST: Thêm lịch mới
// ===================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (empty($data['frequency']) || empty($data['startTime']) || empty($data['endTime'])) {
        http_response_code(400);
        echo json_encode(["message" => "Thiếu thông tin bắt buộc (Tần suất, Giờ bắt đầu/kết thúc)."]);
        exit();
    }
    
    // Gán dữ liệu cho Model
    $availabilityModel->doctor_id = $doctorId;
    $availabilityModel->frequency = $data['frequency'];
    $availabilityModel->start_time = $data['startTime'];
    $availabilityModel->end_time = $data['endTime'];
    $availabilityModel->repeat_end_date = $data['repeat_end_date'] ?? null;
    $availabilityModel->date = null;
    $availabilityModel->day_of_week = null;
    
    // Xử lý các trường phụ thuộc vào Frequency
    if ($data['frequency'] === 'NONE') {
        if (empty($data['date'])) { throw new Exception("Ngày cụ thể là bắt buộc."); }
        $availabilityModel->date = $data['date'];
    } elseif ($data['frequency'] === 'WEEKLY') {
        // day_of_week phải là một mảng và được lưu từng bản ghi một (nếu bạn muốn lưu nhiều ngày)
        if (!is_array($data['day_of_week']) || empty($data['day_of_week'])) { throw new Exception("Vui lòng chọn ít nhất một ngày trong tuần."); }
    }
    
    try {
        $db->beginTransaction();
        $success = false;

        if ($data['frequency'] === 'WEEKLY') {
            // Trường hợp WEEKLY: Tạo nhiều bản ghi, mỗi bản ghi cho một ngày trong tuần
            foreach ($data['day_of_week'] as $day) {
                $availabilityModel->day_of_week = (int)$day;
                if (!$availabilityModel->create()) {
                    throw new Exception("Lỗi khi tạo lịch lặp lại.");
                }
            }
            $success = true;
        } else {
            // Trường hợp NONE, DAILY
            if (!$availabilityModel->create()) {
                throw new Exception("Lỗi khi tạo lịch cố định.");
            }
            $success = true;
        }
        
        $db->commit();

        http_response_code(201);
        echo json_encode(["message" => "Lịch rảnh đã được thiết lập thành công!"]);
        exit();

    } catch (Exception $e) {
        if ($db->inTransaction()) { $db->rollback(); }
        debug_exit($e);
    }
}

// ===================================
// DELETE: Xóa lịch
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
        // Kiểm tra quyền: Chỉ cho phép xóa lịch của chính bác sĩ này
        $stmt = $availabilityModel->getById($id); 
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            throw new Exception("Không tìm thấy lịch rảnh.");
        }
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ((int)$row['doctor_id'] !== (int)$doctorId) {
            http_response_code(403);
            throw new Exception("Bạn không có quyền xóa lịch này.");
        }

        if (!$availabilityModel->delete($id)) {
            throw new Exception("Lỗi xóa lịch rảnh.");
        }
        
        $db->commit();
        http_response_code(200);
        echo json_encode(["message" => "Đã xóa lịch rảnh thành công."]);
        exit();

    } catch (Exception $e) {
        if ($db->inTransaction()) { $db->rollback(); }
        debug_exit($e);
    }
}

// ===================================
// DEFAULT — METHOD NOT ALLOWED
// ===================================
http_response_code(405);
echo json_encode(["message" => "Method không được hỗ trợ."]);
exit;