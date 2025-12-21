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
    header("Access-Control-Allow-Methods: GET, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    http_response_code(200);
    exit();
}

header("Access-Control-Allow-Origin: $allowed_origin");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET"); 

// ===================================
// LOAD MODELS & DB
// ===================================
try {
    require_once '../config/database.php';
    require_once '../models/Appointment.php'; 
    require_once '../models/Doctor.php'; // Để lấy tên bác sĩ
    require_once '../models/Patient.php'; 
    
    $database = new Database();
    $db = $database->getConnection();
    if (!$db) { throw new Exception("Lỗi kết nối database."); }

    $appointmentModel = new Appointment($db);
    $doctorModel = new Doctor($db);
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

$userId = $_SESSION['user_id']; 

// Lấy patient_id từ bảng patients dựa trên user_id
$patientId = $patientModel->getIdByUserId($userId);

if (!$patientId) {
    http_response_code(404);
    echo json_encode(["message" => "Không tìm thấy hồ sơ bệnh nhân. Vui lòng cập nhật thông tin cá nhân."]);
    exit();
}

// ===================================
// GET: Lấy danh sách Lịch Hẹn
// ===================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // Lấy danh sách từ bảng appointments
        $stmt = $appointmentModel->getAppointmentsByPatientId($patientId);
        $appointments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Lấy danh sách ID bác sĩ để query tên 1 lần (tối ưu hiệu suất)
        $doctorIds = array_unique(array_column($appointments, 'doctor_id'));
        $doctorsDetails = [];
        
        if (!empty($doctorIds)) {
            $doctorsDetails = $doctorModel->getDoctorDetailsByIds($doctorIds); 
        }

        // Ánh xạ dữ liệu cho Frontend
        $mappedAppointments = array_map(function($app) use ($doctorsDetails) {
            $doctorDetail = $doctorsDetails[$app['doctor_id']] ?? ['full_name' => 'Không xác định'];
            
            return [
                "id" => $app['id'],
                "doctor_id" => (int)$app['doctor_id'], 
                "doctorName" => $doctorDetail['full_name'],
                "cityId" => $doctorDetail['city_id'] ?? null, // Thêm cityId nếu cần filter
                "appointmentDate" => $app['appointment_date'],
                "appointmentTime" => substr($app['appointment_time'], 0, 5), // Chỉ lấy HH:MM
                "reason" => $app['reason'],
                "status" => $app['status'],
                "createdAt" => $app['created_at'],
            ];
        }, $appointments);

        http_response_code(200);
        echo json_encode([
            "message" => "Tải danh sách lịch hẹn thành công.",
            "data" => ["appointments" => $mappedAppointments]
        ]);
        exit();

    } catch (Exception $e) {
        debug_exit($e);
    }
}

// ===================================
// DEFAULT
// ===================================
http_response_code(405);
echo json_encode(["message" => "Method không được hỗ trợ."]);
exit;