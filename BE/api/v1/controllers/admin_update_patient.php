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
    require_once '../models/User.php'; 
    require_once '../models/Patient.php';
    
    $database = new Database();
    $db = $database->getConnection();
    if (!$db) { throw new Exception("Lỗi kết nối database."); }

    $patientModel = new Patient($db);
    $userModel = new User($db); 
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
// PUT: Cập nhật chi tiết Patient
// ===================================
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true); 
    
    if (empty($data['userId'])) {
        http_response_code(400);
        echo json_encode(["message" => "Thiếu User ID để cập nhật."]);
        exit();
    }
    
    $userId = (int)$data['userId'];

    // 1. Kiểm tra dữ liệu bắt buộc (cần cho cả Khóa/Mở khóa)
    // SỬA ĐIỀU KIỆN: Kiểm tra fullName
    if (empty($data['full_name']) || empty($data['city_id']) || empty($data['phone'])) {
        if(empty($data['city_id'])){
            http_response_code(400);
            echo json_encode(["message" => "Thiếu các trường bắt buộc (Thành phố)."]);
        }else if(empty($data['full_name'])){
            http_response_code(400);
        echo json_encode(["message" => "Thiếu các trường bắt buộc (Tên)."]);
        }else{
            http_response_code(400);
            echo json_encode(["message" => "Thiếu các trường bắt buộc (Tên, Thành phố, SĐT)."]);
        }
        
        exit();
    }
    
    try {
        $db->beginTransaction();
        $message = "";

        // Tái sử dụng dữ liệu từ Payload để cập nhật cả hai bảng
        
        // 1. CẬP NHẬT BẢNG USERS (Tên, Thành phố, Trạng thái Active)
        $userUpdateData = [
            'userId' => $userId,
            'full_name' => $data['full_name'], // <<< KHÔNG DÙNG ?? null
            'city_id' => $data['city_id'],
            'is_active' => $data['is_active'] ?? 1, // Mặc định là Active nếu không gửi
        ];
        
        // Cập nhật User Model (giả định hàm này tồn tại và được bind đúng cách)
        if (!$userModel->adminUpdateUser($userUpdateData)) { 
            throw new Exception("Không thể cập nhật thông tin User cơ bản."); 
        }

        // 2. CẬP NHẬT BẢNG PATIENTS (Phone, Address, Name)
        $patientUpdateData = [
            'userId' => $userId,
            'full_name' => $data['full_name'], // <<< KHÔNG DÙNG ?? null
            'phone' => $data['phone'] ?? null,
            'address' => $data['address'] ?? null,
        ];
        
        if (!$patientModel->adminUpdatePatientDetails($patientUpdateData)) {
             throw new Exception("Không thể cập nhật thông tin Patient chi tiết.");
        }
        
        $db->commit();
        $message = "Hồ sơ bệnh nhân đã được cập nhật thành công!";

        http_response_code(200);
        echo json_encode(["message" => $message]);
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