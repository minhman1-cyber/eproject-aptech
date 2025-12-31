<?php
// Cấu hình CORS và Headers
$allowed_origin = 'http://localhost:5173';
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: " . $allowed_origin);
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Methods: POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    http_response_code(200);
    exit();
}
header("Access-Control-Allow-Origin: " . $allowed_origin);
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");

include_once '../config/database.php';
include_once '../models/User.php';
// Import file gửi mail (Dựa trên code book_appointment.php bạn cung cấp)
require_once __DIR__ . '/../services/email_service.php'; 

$database = new Database();
$db = $database->getConnection();
$user = new User($db);

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->action)) {
    http_response_code(400);
    echo json_encode(["message" => "Thiếu tham số action."]);
    exit();
}

// === ACTION 1: GỬI OTP (send_otp) ===
if ($data->action === 'send_otp') {
    if (empty($data->email)) {
        http_response_code(400);
        echo json_encode(["message" => "Vui lòng nhập Email."]);
        exit();
    }

    $user->email = $data->email;

    // 1. Kiểm tra email có tồn tại trong hệ thống không
    if ($user->emailExists()->rowCount() > 0) {
        
        // 2. Tạo OTP ngẫu nhiên 6 số
        $otp = rand(100000, 999999);

        // 3. Lưu OTP vào DB
        if ($user->saveOtp($otp)) {
            // 4. Gửi Email
            try {
                $subject = "Mã xác nhận quên mật khẩu - Mediconnect";
                $body = "
                    <h3>Yêu cầu đặt lại mật khẩu</h3>
                    <p>Xin chào,</p>
                    <p>Mã OTP xác nhận của bạn là: <b style='font-size: 20px; color: #2563eb;'>$otp</b></p>
                    <p>Mã này có hiệu lực trong 10 phút. Tuyệt đối không chia sẻ mã này cho ai khác.</p>
                ";

                // Gọi hàm sendEmail từ service của bạn
                sendEmail($user->email, "Người dùng", $subject, $body);

                http_response_code(200);
                echo json_encode(["message" => "Mã OTP đã được gửi đến email của bạn."]);

            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(["message" => "Lỗi gửi email: " . $e->getMessage()]);
            }
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Không thể tạo mã OTP. Vui lòng thử lại."]);
        }
    } else {
        http_response_code(404);
        echo json_encode(["message" => "Email này không tồn tại trong hệ thống."]);
    }
}

// === ACTION 2: XÁC NHẬN OTP & ĐỔI MẬT KHẨU (reset_password) ===
elseif ($data->action === 'reset_password') {
    if (empty($data->email) || empty($data->otp) || empty($data->newPassword)) {
        http_response_code(400);
        echo json_encode(["message" => "Vui lòng nhập đầy đủ thông tin."]);
        exit();
    }

    $user->email = $data->email;

    // 1. Kiểm tra OTP
    if ($user->verifyOtp(trim($data->otp))) {
        
        // 2. Cập nhật mật khẩu mới
        if ($user->updatePasswordByEmail($data->newPassword)) {
            
            // 3. Xóa OTP sau khi thành công
            $user->deleteOtp();

            http_response_code(200);
            echo json_encode(["message" => "Đổi mật khẩu thành công. Bạn có thể đăng nhập ngay."]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Lỗi hệ thống khi cập nhật mật khẩu."]);
        }
    } else {
        http_response_code(400);
        echo json_encode(["message" => "Mã OTP không chính xác hoặc đã hết hạn."]);
    }
} else {
    http_response_code(400);
    echo json_encode(["message" => "Action không hợp lệ."]);
}
?>