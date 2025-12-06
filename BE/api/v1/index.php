<?php
// Thiết lập múi giờ
date_default_timezone_set('Asia/Ho_Chi_Minh');

// Lấy đường dẫn URI
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = explode( '/', $uri );

// Chuyển hướng request dựa trên phần cuối của URI (ví dụ: /api/login -> login.php)
$last_uri_segment = end($uri);

switch ($last_uri_segment) {
    case 'login':
        require 'controllers/login.php';
        break;
    case 'register':
        require 'controllers/register.php';
        break;
    case 'auth_check': // Thêm case mới
        require 'controllers/auth_check.php';
        break;
    case 'patient_profile': // Thêm case mới
        require 'controllers/patient_profile.php';
        break;
    case 'patient_avatar': // Endpoint: /api/v1/patient_avatar (Nếu bạn dùng router đơn giản)
        require 'upload/patient_avatar.php';
        break;
    // Thêm các endpoint khác tại đây (ví dụ: /api/profile)
    default:
        http_response_code(404);
        echo json_encode(array("message" => "Endpoint không tồn tại."));
        break;
}
?>