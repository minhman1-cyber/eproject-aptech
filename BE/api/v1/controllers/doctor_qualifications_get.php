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
    require_once '../models/Doctor.php'; // Chứa hàm lấy bằng cấp
    
    $database = new Database();
    $db = $database->getConnection();
    if (!$db) { throw new Exception("Lỗi kết nối database."); }

    $doctorModel = new Doctor($db);
} catch (Exception $e) {
    debug_exit($e);
}

// ===================================
// GET: Lấy Bằng cấp đã xác minh
// ===================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $doctorId = $_GET['doctor_id'] ?? null;
    
    if (empty($doctorId)) {
        http_response_code(400);
        echo json_encode(["message" => "Thiếu ID Bác sĩ để lấy bằng cấp."]);
        exit();
    }
    
    try {
        // Lấy bằng cấp đã xác minh cho Bác sĩ này
        // Hàm này trả về [doctorId => [qual1, qual2, ...]]
        $qualsByDoctor = $doctorModel->getVerifiedQualificationsByDoctorIds([(int)$doctorId]);
        
        $qualifications = $qualsByDoctor[(int)$doctorId] ?? [];

        http_response_code(200);
        echo json_encode([
            "message" => "Tải bằng cấp thành công.",
            "data" => ["qualifications" => $qualifications]
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