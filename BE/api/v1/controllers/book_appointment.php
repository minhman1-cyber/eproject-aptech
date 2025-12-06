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
    header("Access-Control-Allow-Methods: POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    http_response_code(200);
    exit();
}

header("Access-Control-Allow-Origin: $allowed_origin");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST"); 

// ===================================
// LOAD MODELS & DB
// ===================================
try {
    require_once '../config/database.php';
    require_once '../models/Appointment.php'; 
    require_once '../models/Patient.php'; 
    require_once __DIR__ . '/../services/email_service.php';
    
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
if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'PATIENT') {
    http_response_code(401);
    echo json_encode(["message" => "Truy cập bị từ chối. Vui lòng đăng nhập với vai trò Bệnh nhân."]);
    exit();
}

$patientId = $_SESSION['user_id']; // ID của Bệnh nhân đang đặt lịch

// ===================================
// POST: Đặt Lịch Hẹn
// ===================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true); 
    
    $doctorId = $data['doctorId'] ?? null;
    $appointmentDate = $data['appointmentDate'] ?? null;
    $appointmentTime = $data['appointmentTime'] ?? null;
    $reason = $data['reason'] ?? null;
    
    // 1. Kiểm tra dữ liệu bắt buộc
    if (empty($doctorId) || empty($appointmentDate) || empty($appointmentTime) || empty($reason)) {
        http_response_code(400);
        echo json_encode(["message" => "Thiếu thông tin đặt lịch bắt buộc."]);
        exit();
    }
    
    try {
        $db->beginTransaction();

        // 1. CHUYỂN ĐỔI USER ID sang PATIENT ID CHÍNH
        $patientIds = $patientModel->getIdByUserId($patientId);
        if (!$patientIds) {
            http_response_code(404);
            throw new Exception("Không tìm thấy hồ sơ Patient tương ứng. Vui lòng cập nhật hồ sơ cá nhân.");
        }
        if (empty($patientIds)) {
            http_response_code(400);
            echo json_encode(["message" => "Thiếu Patient id"]);
            exit();
        }
        $patientDetailsStmt = $patientModel->getPatientDetailsById($patientIds); 
        $details = $patientDetailsStmt->fetch(PDO::FETCH_ASSOC);
        if (!$details) {
            http_response_code(404);
            throw new Exception("Không tìm thấy hồ sơ bệnh nhân.");
        }
        
        $doctorId = $data['doctorId'] ?? null;
        $appointmentDate = $data['appointmentDate'] ?? null;
        $appointmentTime = $data['appointmentTime'] ?? null;
        $reason = $data['reason'] ?? null;
        

        // 2. Kiểm tra trùng lặp (Double Booking)
        if ($appointmentModel->isSlotBooked($doctorId, $appointmentDate, $appointmentTime)) {
            // Rollback ngay lập tức nếu đã bị đặt
            http_response_code(409); // Conflict
            throw new Exception("Khung giờ này đã được đặt bởi bệnh nhân khác. Vui lòng chọn giờ khác.");
        }
        
        // 3. Tạo lịch hẹn
        $appointmentModel->patient_id = $patientIds;
        $appointmentModel->doctor_id = (int)$doctorId;
        $appointmentModel->appointment_date = $appointmentDate;
        // Chuẩn hóa thời gian sang định dạng DB (HH:MM:SS)
        $appointmentModel->appointment_time = $appointmentTime . ':00'; 
        $appointmentModel->reason = $reason;
        
        if (!$appointmentModel->createAppointment()) {
             throw new Exception("Lỗi khi chèn lịch hẹn vào database.");
        }
        
        $db->commit();
        
        http_response_code(201); // Created
        sendEmail($details['email'], $patientIds, "Xác nhận đặt lịch", "<p>Bạn đã đặt lịch thành công vào $appointmentTime</p>");
        echo json_encode([
            "message" => "Đặt lịch hẹn thành công!",
            "appointmentId" => $db->lastInsertId()
        ]);
        
        exit();

    } catch (Exception $e) {
        if ($db->inTransaction()) { $db->rollback(); }
        // Trả về lỗi 409 nếu là lỗi trùng lặp
        if ($e->getCode() === 409) {
            http_response_code(409);
        }
        debug_exit($e);
    }
}

// ===================================
// DEFAULT — METHOD NOT ALLOWED
// ===================================
http_response_code(405);
echo json_encode(["message" => "Method không được hỗ trợ."]);
exit;