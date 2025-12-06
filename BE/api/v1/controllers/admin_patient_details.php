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
    require_once '../models/Patient.php';
    require_once '../models/Doctor.php'; 
    
    $database = new Database();
    $db = $database->getConnection();
    if (!$db) { throw new Exception("Lỗi kết nối database."); }

    $patientModel = new Patient($db);
    $appointmentModel = new Appointment($db);
    $doctorModel = new Doctor($db); // Để lấy tên Bác sĩ cho lịch sử hẹn

} catch (Exception $e) {
    debug_exit($e);
}

// ===================================
// KIỂM TRA SESSION & VAI TRÒ ADMIN
// ===================================
if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'ADMIN') {
    http_response_code(401);
    echo json_encode(["message" => "Truy cập bị từ chối. Chỉ Admin mới được quản lý."]);
    exit();
}

// ===================================
// GET: Lấy chi tiết hồ sơ và lịch sử
// ===================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $userId = $_GET['user_id'] ?? null;
    
    if (empty($userId)) {
        http_response_code(400);
        echo json_encode(["message" => "Thiếu User ID để xem chi tiết hồ sơ."]);
        exit();
    }
    
    try {
        // Giả định: Hàm này lấy thông tin từ users và patients
        $patientDetailsStmt = $patientModel->getPatientFullDetails($userId); 
        $details = $patientDetailsStmt->fetch(PDO::FETCH_ASSOC);

        if (!$details) {
            http_response_code(404);
            throw new Exception("Không tìm thấy hồ sơ bệnh nhân.");
        }
        
        $patientId = $patientModel->getIdByUserId($userId); // Lấy ID chính của bảng patients
        
        // 1. Lấy lịch sử đặt lịch
        $appointmentsStmt = $appointmentModel->getAppointmentsByPatientId($patientId);
        $appointments = $appointmentsStmt ? $appointmentsStmt->fetchAll(PDO::FETCH_ASSOC) : [];
        
        // 2. Lấy chi tiết Bác sĩ (Tên) cho các cuộc hẹn
        $doctorIds = array_unique(array_column($appointments, 'doctor_id'));
        $doctorsDetails = $doctorModel->getDoctorDetailsByIds($doctorIds); 

        // 3. Ánh xạ lịch hẹn (Gán tên Bác sĩ)
        $mappedAppointments = array_map(function($app) use ($doctorsDetails) {
            $doctorDetail = $doctorsDetails[$app['doctor_id']] ?? ['full_name' => 'Bác sĩ không tồn tại'];
            
            return [
                "id" => $app['id'],
                "doctorName" => $doctorDetail['full_name'],
                "appointmentDate" => $app['appointment_date'],
                "appointmentTime" => substr($app['appointment_time'], 0, 5),
                "reason" => $app['reason'],
                "status" => $app['status'],
            ];
        }, $appointments);


        http_response_code(200);
        echo json_encode([
            "message" => "Tải chi tiết hồ sơ thành công.",
            "data" => [
                "details" => [
                    "user_id" => $details['user_id'],
                    "email" => $details['email'],
                    "full_name" => $details['full_name'],
                    "phone" => $details['phone'],
                    "address" => $details['address'],
                    "city_id" => (int)$details['city_id'],
                ],
                "appointments" => $mappedAppointments
            ]
        ]);
        exit();

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