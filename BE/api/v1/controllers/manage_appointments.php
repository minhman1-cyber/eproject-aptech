<?php
// Bắt đầu Output Buffering
ob_start(); 
session_start();

// HÀM DEBUG & BẮT LỖI JSON
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
    header("Access-Control-Allow-Methods: PUT, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    http_response_code(200);
    exit();
}

header("Access-Control-Allow-Origin: $allowed_origin");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: PUT"); 

// ===================================
// LOAD MODELS & DB
// ===================================
try {
    require_once '../config/database.php';
    require_once '../models/Appointment.php'; 
    require_once '../models/Patient.php'; 
    $database = new Database();
    $db = $database->getConnection();
    if (!$db) { throw new Exception("Lỗi kết nối database."); }

    $appointmentModel = new Appointment($db);
    $patientModel = new Patient($db);

} catch (Exception $e) {
    debug_exit($e);
}

// ===================================
// KIỂM TRA SESSION (PATIENT)
// ===================================
// if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'PATIENT') {
//     http_response_code(401);
//     echo json_encode(["message" => "Truy cập bị từ chối. Vui lòng đăng nhập với vai trò Bệnh nhân."]);
//     exit();
// }

if (
    !isset($_SESSION['user_id']) ||
    !in_array($_SESSION['user_role'], ['ADMIN', 'PATIENT'])
) {
    
    http_response_code(401);
    echo json_encode(["message" => "Truy cập bị từ chối. Vai trò không hợp lệ."]);
    exit();
}


$patientIds = $_SESSION['user_id']; 
$patientId = $patientIds;

if ($_SESSION['user_role'] === 'PATIENT') {
    $patientId = $patientModel->getIdByUserId($patientIds);
    if (!$patientId) {
        http_response_code(404);
        throw new Exception("Không tìm thấy hồ sơ Patient tương ứng. Vui lòng cập nhật hồ sơ cá nhân.");
    }
}else if ($_SESSION['user_role'] === 'ADMIN') {
    $payload = json_decode(file_get_contents("php://input"), true);

    if (!isset($payload['id'])) {
        http_response_code(400);
        echo json_encode(["message" => "Admin cần cung cấp patientId trong payload."]);
        exit();
    }

    $patientIds = $payload['id'];

    $patientId = $patientIds;
    
}

// ===================================
// PUT: Quản lý Lịch hẹn (Hủy & Đổi lịch)
// ===================================
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true); 
    
    $appointmentId = $data['id'] ?? null;
    $actionType = $data['actionType'] ?? null; // 'CANCEL' hoặc 'RESCHEDULE'
    

    if (empty($appointmentId) || empty($actionType)) {
        http_response_code(400);
        echo json_encode(["message" => "Thiếu ID lịch hẹn hoặc loại hành động."]);
        exit();
    }
    
    try {
        $db->beginTransaction();

        // 1. Kiểm tra quyền sở hữu (Bắt buộc)
        $appointmentDetails = $appointmentModel->getAppointmentDetails($appointmentId); // Giả định hàm này trả về chi tiết lịch
        if (!$appointmentDetails || ((int)$appointmentDetails['patient_id'] !== (int)$patientId && $_SESSION['user_role'] !== 'ADMIN' )) {
             http_response_code(403);
             throw new Exception("Bạn không có quyền thực hiện thao tác này.");
        }
        
        $message = "";
        
        if ($actionType === 'CANCEL') {
            // 2. Xử lý HỦY LỊCH
            if ($appointmentDetails['status'] !== 'BOOKED' && $appointmentDetails['status'] !== 'RESCHEDULED') {
                 throw new Exception("Lịch hẹn không thể hủy (Trạng thái hiện tại: {$appointmentDetails['status']}).");
            }

            if (!$appointmentModel->updateStatus($appointmentId, 'CANCELLED')) {
                 throw new Exception("Lỗi khi cập nhật trạng thái hủy lịch.");
            }
            $message = "Hủy lịch hẹn thành công!";
            
        } elseif ($actionType === 'RESCHEDULE') {
            // 3. Xử lý ĐỔI LỊCH
            $newDate = $data['newDate'] ?? null;
            $newTime = $data['newTime'] ?? null;
            
            if (empty($newDate) || empty($newTime)) {
                http_response_code(400);
                throw new Exception("Thiếu Ngày hoặc Giờ mới để đổi lịch.");
            }

            // Kiểm tra trùng lặp cho slot mới
            $newTimeFormatted = $newTime . ':00';
            if ($appointmentModel->isSlotBooked($appointmentDetails['doctor_id'], $newDate, $newTimeFormatted)) {
                http_response_code(409); // Conflict
                throw new Exception("Khung giờ mới này đã có người đặt.");
            }
            
            // Thực hiện đổi lịch
            if (!$appointmentModel->reschedule($appointmentId, $newDate, $newTimeFormatted)) {
                throw new Exception("Lỗi khi cập nhật thời gian đổi lịch.");
            }
            $message = "Đổi lịch hẹn thành công!";
            
        } else {
            http_response_code(400);
            throw new Exception("Hành động không xác định.");
        }

        $db->commit();

        http_response_code(200);
        echo json_encode(["message" => $message]);
        exit();

    } catch (Exception $e) {
        if ($db->inTransaction()) { $db->rollback(); }
        // Lỗi này sẽ gọi hàm debug_exit và in ra message/exception
        debug_exit($e);
    }
}

// ===================================
// DEFAULT — METHOD NOT ALLOWED
// ===================================
http_response_code(405);
echo json_encode(["message" => "Method không được hỗ trợ."]);
exit;