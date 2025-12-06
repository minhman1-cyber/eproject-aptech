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
    require_once '../models/Doctor.php'; 
    
    $database = new Database();
    $db = $database->getConnection();
    if (!$db) { throw new Exception("Lỗi kết nối database."); }

    $doctorModel = new Doctor($db);
} catch (Exception $e) {
    debug_exit($e);
}

// ===================================
// GET: Lấy tất cả Doctor đã được duyệt
// ===================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $doctorModel->getAllApprovedDoctors();
        $doctors_list = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Chuẩn bị dữ liệu trả về Frontend
        $mapped_doctors = array_map(function($doc) {
            return [
                "user_id" => (int)$doc['user_id'],
                "doctor_id" => (int)$doc['doctor_id'],
                "full_name" => $doc['full_name'],
                "qualification" => $doc['qualification'],
                "bio" => $doc['bio'],
                "profile_picture" => $doc['profile_picture'],
                "specializationIds" => $doc['specializationIds'] 
            ? array_map('intval', explode(',', $doc['specializationIds']))
            : [],
                "cityId" => (int)$doc['city_id'],
            ];
        }, $doctors_list);

        http_response_code(200);
        echo json_encode([
            "message" => "Dữ liệu tất cả bác sĩ đã tải thành công.",
            "data" => ["doctors" => $mapped_doctors]
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