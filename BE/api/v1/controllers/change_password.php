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
// KIỂM TRA SESSION
// ===================================
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(["message" => "Truy cập bị từ chối. Vui lòng đăng nhập."]);
    exit();
}

// ===================================
// LOAD MODELS & DB
// ===================================
try {
    require_once '../config/database.php';
    require_once '../models/User.php'; 
    
    $database = new Database();
    $db = $database->getConnection();
    if (!$db) { throw new Exception("Lỗi kết nối database."); }

    $userModel = new User($db);
} catch (Exception $e) {
    debug_exit($e);
}

// ===================================
// POST: Đổi Mật khẩu
// ===================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true); 
    
    $currentPassword = $data['currentPassword'] ?? null;
    $newPassword = $data['newPassword'] ?? null;
    $confirmPassword = $data['confirmPassword'] ?? null;
    
    // 1. Kiểm tra input cơ bản
    if (empty($currentPassword) || empty($newPassword) || empty($confirmPassword)) {
        http_response_code(400);
        echo json_encode(["message" => "Vui lòng điền đầy đủ mật khẩu cũ và mật khẩu mới."]);
        exit();
    }
    if ($newPassword !== $confirmPassword) {
        http_response_code(400);
        echo json_encode(["message" => "Mật khẩu mới và xác nhận mật khẩu không khớp."]);
        exit();
    }
    if (strlen($newPassword) < 8) {
        http_response_code(400);
        echo json_encode(["message" => "Mật khẩu mới phải có ít nhất 8 ký tự."]);
        exit();
    }
    
    try {
        $db->beginTransaction();

        $userModel->id = $_SESSION['user_id'];
        
        // 2. Lấy mật khẩu hash hiện tại từ DB
        $credentials = $userModel->getCredentials();
        
        if (!$credentials) {
            http_response_code(404);
            throw new Exception("Không tìm thấy người dùng.");
        }
        
        // 3. Xác thực mật khẩu cũ
        if (!password_verify($currentPassword, $credentials['password'])) {
            http_response_code(400);
            throw new Exception("Mật khẩu cũ không chính xác.");
        }
        
        // 4. Cập nhật mật khẩu mới
        if (!$userModel->changePassword($newPassword)) {
            throw new Exception("Lỗi khi cập nhật mật khẩu trong database.");
        }
        
        $db->commit();
        
        http_response_code(200); 
        echo json_encode(["message" => "Đổi mật khẩu thành công! Vui lòng đăng nhập lại."]);
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