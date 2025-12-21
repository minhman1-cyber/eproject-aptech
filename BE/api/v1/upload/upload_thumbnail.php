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
if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'ADMIN') {
    http_response_code(401);
    echo json_encode(array("message" => "Truy cập bị từ chối. Vui lòng đăng nhập với vai trò Bác sĩ."));
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    http_response_code(200);
    exit();
}

// 1. Cấu hình thư mục upload
// Đường dẫn vật lý trên server
$target_dir = __DIR__ . "/../uploads/thumbnails/"; 
// Đường dẫn URL để truy cập (Frontend sẽ dùng cái này)
$public_url_base = "http://localhost:8888/api/v1/uploads/thumbnails/";

// Tạo thư mục nếu chưa tồn tại
if (!file_exists($target_dir)) {
    mkdir($target_dir, 0777, true);
}

// 2. Xử lý Upload
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_FILES['thumbnail']) && $_FILES['thumbnail']['error'] === UPLOAD_ERR_OK) {
        
        $file_tmp = $_FILES['thumbnail']['tmp_name'];
        $file_name = basename($_FILES['thumbnail']['name']);
        $file_size = $_FILES['thumbnail']['size'];
        $file_type = strtolower(pathinfo($file_name, PATHINFO_EXTENSION));

        // Kiểm tra định dạng
        $allowed_types = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
        if (!in_array($file_type, $allowed_types)) {
            http_response_code(400);
            echo json_encode(["message" => "Chỉ chấp nhận file ảnh (JPG, PNG, WEBP, GIF)."]);
            exit();
        }

        // Kiểm tra kích thước (ví dụ max 2MB)
        if ($file_size > 2 * 1024 * 1024) {
            http_response_code(400);
            echo json_encode(["message" => "File quá lớn. Vui lòng chọn ảnh dưới 2MB."]);
            exit();
        }

        // Tạo tên file mới để tránh trùng lặp (timestamp + random)
        $new_file_name = uniqid('thumb_') . '.' . $file_type;
        $target_file = $target_dir . $new_file_name;

        // Di chuyển file từ bộ nhớ tạm vào thư mục đích
        if (move_uploaded_file($file_tmp, $target_file)) {
            $full_url = $public_url_base . $new_file_name;
            
            http_response_code(200);
            echo json_encode([
                "message" => "Upload thành công.",
                "url" => $full_url // Trả về đường dẫn đầy đủ
            ]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Lỗi server: Không thể lưu file."]);
        }
    } else {
        http_response_code(400);
        echo json_encode(["message" => "Không tìm thấy file hoặc file bị lỗi."]);
    }
} else {
    http_response_code(405);
    echo json_encode(["message" => "Method not allowed."]);
}
?>