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
    header("Access-Control-Allow-Methods: GET, PUT, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    http_response_code(200);
    exit();
}

header("Access-Control-Allow-Origin: $allowed_origin");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, PUT");

// ===================================
// LOAD MODELS & DB
// ===================================
try {
    require_once '../config/database.php';
    // Đảm bảo bạn đã có Model Appointment
    require_once '../models/Appointment.php'; 
    
    $database = new Database();
    $db = $database->getConnection();
    if (!$db) { throw new Exception("Lỗi kết nối database."); }

    $appointment = new Appointment($db);
} catch (Exception $e) {
    debug_exit($e);
}

// ===================================
// KIỂM TRA SESSION & VAI TRÒ ADMIN
// ===================================
if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'ADMIN') {
    http_response_code(401);
    echo json_encode(["message" => "Truy cập bị từ chối. Chỉ Admin mới được truy cập."]);
    exit();
}

// ===================================
// GET: Lấy danh sách Lịch Hẹn
// ===================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // Gọi hàm lấy toàn bộ lịch hẹn (bao gồm thông tin bác sĩ và bệnh nhân)
        // Hàm này cần được định nghĩa trong Model Appointment.php
        $stmt = $appointment->getAllAppointmentsForAdmin(); 
        $appointments_list = $stmt->fetchAll(PDO::FETCH_ASSOC);

        http_response_code(200);
        echo json_encode([
            "message" => "Tải danh sách lịch hẹn thành công.",
            "data" => [
                "appointments" => $appointments_list
            ]
        ]);
        exit();

    } catch (Exception $e) {
        debug_exit($e);
    }
}

// ===================================
// PUT: Cập nhật trạng thái Lịch Hẹn
// ===================================
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data = json_decode(file_get_contents("php://input"));
    
    if (empty($data->appointment_id) || empty($data->status)) {
        http_response_code(400);
        echo json_encode(["message" => "Thiếu ID lịch hẹn hoặc trạng thái mới."]);
        exit();
    }

    try {
        // CẬP NHẬT: Gọi hàm updateStatus với tham số như bạn đã định nghĩa trong Model
        if ($appointment->updateStatus($data->appointment_id, $data->status)) {
            http_response_code(200);
            echo json_encode(["message" => "Cập nhật trạng thái lịch hẹn thành công."]);
        } else {
            throw new Exception("Không thể cập nhật trạng thái lịch hẹn.");
        }
    } catch (Exception $e) {
        debug_exit($e);
    }
}

// ===================================
// DEFAULT — METHOD NOT ALLOWED
// ===================================
http_response_code(405);
echo json_encode(["message" => "Method không được hỗ trợ."]);
exit;