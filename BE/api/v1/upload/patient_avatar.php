<?php
session_start();

$allowed_origin = 'http://localhost:5173';
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: " . $allowed_origin);
    header("Access-Control-Allow-Credentials: true"); 
    header("Access-Control-Allow-Methods: POST, OPTIONS"); 
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
    http_response_code(200);
    exit(); // Dừng xử lý sau Preflight
}
header("Access-Control-Allow-Origin: " . $allowed_origin);
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Kiểm tra đăng nhập (Session)
if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'PATIENT') {
    http_response_code(401);
    echo json_encode(array("message" => "Truy cập bị từ chối. Vui lòng đăng nhập."));
    exit();
}

// ===================================
// LOGIC TẢI FILE
// ===================================
$userId = $_SESSION['user_id'];

// Thư mục lưu trữ file (Tính toán đường dẫn tuyệt đối)
$upload_dir = __DIR__ . '/../uploads/avatars/';
$public_url_base = 'http://localhost:8888/api/v1/uploads/avatars/'; // URL công khai

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/Patient.php';

$database = new Database();
$db = $database->getConnection();
$patient = new Patient($db);

// 1. Kiểm tra file có được tải lên không
if (empty($_FILES['avatar'])) {
    http_response_code(400);
    echo json_encode(array("message" => "Không có file ảnh nào được gửi lên."));
    exit();
}

$file = $_FILES['avatar'];
$max_size = 5 * 1024 * 1024; // 5 MB
$allowed_types = ['image/jpeg', 'image/png', 'image/gif'];

if ($file['error'] !== 0) {
    http_response_code(500);
    echo json_encode(array("message" => "Lỗi tải file (Code: {$file['error']})."));
    exit();
}
if ($file['size'] > $max_size) {
    http_response_code(400);
    echo json_encode(array("message" => "Kích thước file vượt quá 5MB."));
    exit();
}
if (!in_array($file['type'], $allowed_types)) {
    http_response_code(400);
    echo json_encode(array("message" => "Định dạng file không hợp lệ. Chỉ chấp nhận JPG, PNG, GIF."));
    exit();
}

// 2. Tạo tên file duy nhất và đường dẫn
$file_extension = pathinfo($file['name'], PATHINFO_EXTENSION);
$file_name = "patient_" . $userId . "_" . time() . "." . $file_extension;
$target_file = $upload_dir . $file_name;
$new_avatar_url = $public_url_base . $file_name;

// 3. Di chuyển file vào thư mục cố định
if (move_uploaded_file($file['tmp_name'], $target_file)) {
    
    // 4. Cập nhật đường dẫn vào Database
    if ($patient->updateAvatar($userId, $new_avatar_url)) {
        
        http_response_code(200);
        echo json_encode(array(
            "message" => "Tải lên và cập nhật Avatar thành công.",
            "newAvatarUrl" => $new_avatar_url
        ));
        
    } else {
        // Nếu DB lỗi, xóa file đã tải lên
        unlink($target_file); 
        http_response_code(500);
        echo json_encode(array("message" => "Lỗi DB: Không thể cập nhật đường dẫn ảnh."));
    }
    
} else {
    http_response_code(500);
    echo json_encode(array("message" => "Lỗi Server: Không thể lưu file vào thư mục."));
}

exit();
?>