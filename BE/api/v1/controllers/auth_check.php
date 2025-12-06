<?php
// Khởi động session để truy cập dữ liệu session đã lưu
session_start();

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

if (isset($_SESSION['is_logged_in']) && $_SESSION['is_logged_in'] === true) {
    
    // Đã đăng nhập
    http_response_code(200);
    echo json_encode(array(
        "isLoggedIn" => true,
        "userId" => $_SESSION['user_id'],
        "userRole" => $_SESSION['user_role'],
        "message" => "Người dùng đã đăng nhập."
    ));
} else {
    
    // Chưa đăng nhập
    http_response_code(401); // Unauthorized
    echo json_encode(array(
        "isLoggedIn" => false,
        "message" => "Người dùng chưa đăng nhập hoặc Session đã hết hạn."
    ));
}
?>