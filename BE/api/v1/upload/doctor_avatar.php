<?php
// Bắt đầu Output Buffering
ob_start(); 
session_start();

// HÀM DEBUG: Được gọi khi có lỗi (Exception hoặc Fatal)
function debug_exit($e = null) {
    $buffer = ob_get_contents();
    // Chắc chắn buffer được dọn dẹp TRƯỚC khi in ra response
    if (ob_get_level() > 0) {
        ob_end_clean(); 
    }

    header("Content-Type: application/json; charset=UTF-8");
    http_response_code(500);

    $response = [
        "message" => "Lỗi hệ thống khi upload! Vui lòng kiểm tra log.",
        "debug_output" => trim($buffer),
        "exception" => $e ? $e->getMessage() : null
    ];

    if ($e && $e instanceof PDOException) {
        $response['message'] = "Lỗi DB: " . $e->getMessage() . " (Code: " . $e->getCode() . ")";
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

// Kiểm tra đăng nhập (Session)
if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'DOCTOR') {
    http_response_code(401);
    echo json_encode(array("message" => "Truy cập bị từ chối. Vui lòng đăng nhập với vai trò Bác sĩ."));
    exit();
}

// ===================================
// KẾT NỐI DB & KHỞI TẠO
// ===================================
$userId = $_SESSION['user_id'];
try {
    require_once '../config/database.php';
    require_once '../models/Doctor.php'; 

    $database = new Database();
    $db = $database->getConnection();
    if (!$db) { throw new Exception("Không thể kết nối DB."); }
    $doctor = new Doctor($db);
    
    // Lấy doctor_id
    $doctorProfileStmt = $doctor->getProfileByUserId($userId);
    if ($doctorProfileStmt->rowCount() === 0) { throw new Exception("Không tìm thấy hồ sơ bác sĩ chi tiết."); }
    $doctorRow = $doctorProfileStmt->fetch(PDO::FETCH_ASSOC);
    $doctorId = $doctorRow['doctor_id'];

} catch (Exception $e) {
    debug_exit($e);
}

// ===================================
// LOGIC TẢI FILE
// ===================================
$upload_dir = __DIR__ . '/../uploads/avatars/'; // Đường dẫn từ /api/v1/upload/
$public_url_base = 'http://localhost:8888/api/v1/uploads/avatars/'; 

$file = $_FILES['avatar'] ?? null;
if (empty($file)) {
    http_response_code(400);
    echo json_encode(array("message" => "Không có file ảnh nào được gửi lên."));
    exit();
}

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

// 1. Tạo tên file duy nhất và đường dẫn
$file_extension = pathinfo($file['name'], PATHINFO_EXTENSION);
$file_name = "doctor_" . $userId . "_" . time() . "." . $file_extension;
$target_file = $upload_dir . $file_name;
$new_avatar_url = $public_url_base . $file_name;

// 2. Di chuyển file vào thư mục cố định
if (move_uploaded_file($file['tmp_name'], $target_file)) {
    
    // 3. Cập nhật đường dẫn vào Database
    try {
        if (!$doctor->updateAvatar($userId, $new_avatar_url)) {
             throw new Exception("Không thể cập nhật đường dẫn ảnh vào DB.");
        }

        http_response_code(200);
        echo json_encode(array(
            "message" => "Tải lên và cập nhật Avatar thành công.",
            "newAvatarUrl" => $new_avatar_url
        ));
        
    } catch (Exception $e) {
        // Nếu DB lỗi, xóa file đã tải lên
        if (file_exists($target_file)) { unlink($target_file); }
        debug_exit($e);
    }
    
} else {
    // Lỗi này xảy ra do quyền hạn thư mục (permissions)
    http_response_code(500);
    echo json_encode(array("message" => "Lỗi Server: Không thể lưu file vào thư mục (Kiểm tra quyền ghi)."));
}

exit();