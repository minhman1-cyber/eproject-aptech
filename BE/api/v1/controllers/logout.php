<?php
// Bắt đầu Session để có thể hủy nó
session_start();

// Thiết lập Headers CORS (Giống hệt login.php để tránh lỗi chặn request)
$allowed_origin = 'http://localhost:5173';

// Xử lý Preflight Request (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: " . $allowed_origin);
    header("Access-Control-Allow-Credentials: true"); 
    header("Access-Control-Allow-Methods: POST, GET, OPTIONS"); 
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
    http_response_code(200);
    exit();
}

// Headers cho Request chính
header("Access-Control-Allow-Origin: " . $allowed_origin);
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// --- LOGIC ĐĂNG XUẤT ---

// 1. Xóa tất cả các biến session ($_SESSION['user_id'], v.v.)
$_SESSION = array();

// 2. Hủy cookie session trên trình duyệt (Quan trọng để xóa hoàn toàn session ID cũ)
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

// 3. Hủy Session trên server
session_destroy();

// 4. Trả về phản hồi JSON
http_response_code(200);
echo json_encode(array(
    "message" => "Đăng xuất thành công.",
    "status" => "success"
));
?>