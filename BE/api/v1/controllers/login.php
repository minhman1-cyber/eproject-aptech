<?php
// Bắt đầu Session. PHẢI ĐẶT TRƯỚC headers.
session_start();

// Thiết lập Headers CORS và JSON
$allowed_origin = 'http://localhost:5173';
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: " . $allowed_origin);
    header("Access-Control-Allow-Credentials: true"); 
    header("Access-Control-Allow-Methods: POST, GET, OPTIONS"); 
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

include_once '../config/database.php';
include_once '../models/User.php';

$database = new Database();
$db = $database->getConnection();
$user = new User($db);

// Nhận dữ liệu từ POST request (dạng JSON)
$data = json_decode(file_get_contents("php://input"));

// 1. Kiểm tra dữ liệu input
if (empty($data->email) || empty($data->password)) {
    http_response_code(400);
    echo json_encode(array("message" => "Vui lòng nhập Email và Mật khẩu."));
    exit; // Dừng script
}

$user->email = $data->email;
$stmt = $user->emailExists();
$num = $stmt->rowCount();

if ($num > 0) {
    // 2. Lấy dữ liệu người dùng
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    $password_hash = $row['password'];

    // Xác thực mật khẩu
    if (password_verify($data->password, $password_hash)) {

        // ===========================================
        // 3. THIẾT LẬP SESSION (THÀNH CÔNG)
        // ===========================================
        $_SESSION['user_id'] = $row['id'];
        $_SESSION['user_role'] = $row['role'];
        $_SESSION['is_logged_in'] = true;
        
        // Tạo đối tượng trả về
        $user_item = array(
            "id" => $row['id'],
            "full_name" => $row['full_name'],
            "email" => $user->email,
            "role" => $row['role'],
            "isActive" => $row['is_active']
        );

        http_response_code(200);
        echo json_encode(array(
            "message" => "Đăng nhập thành công.",
            "data" => $user_item,
            "session_status" => "Session đã được tạo."
        ));
    } else {
        // Mật khẩu sai
        http_response_code(401);
        echo json_encode(array("message" => "Thông tin đăng nhập không hợp lệ."));
    }
} else {
    // Email không tồn tại
    http_response_code(401);
    echo json_encode(array("message" => "Thông tin đăng nhập không hợp lệ."));
}

exit; // Đảm bảo script dừng lại sau khi đã gửi phản hồi.
?>