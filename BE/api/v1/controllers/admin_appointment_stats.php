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
    header("Access-Control-Allow-Methods: GET, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    http_response_code(200);
    exit();
}

header("Access-Control-Allow-Origin: $allowed_origin");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");

// ===================================
// LOAD MODELS & DB
// ===================================
try {
    require_once '../config/database.php';
    // Chúng ta không cần require Model Appointment nếu chỉ chạy query đếm đơn giản,
    // nhưng để đúng chuẩn MVC hoặc nếu mở rộng sau này thì nên include.
    // Ở đây tôi sẽ dùng query trực tiếp trên $conn để tối ưu hiệu năng cho việc đếm.
    
    $database = new Database();
    $db = $database->getConnection();
    if (!$db) { throw new Exception("Lỗi kết nối database."); }

} catch (Exception $e) {
    debug_exit($e);
}

// ===================================
// KIỂM TRA SESSION & VAI TRÒ ADMIN
// ===================================
if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'ADMIN') {
    http_response_code(401);
    echo json_encode(["message" => "Truy cập bị từ chối. Chỉ Admin mới được xem thống kê."]);
    exit();
}

// ===================================
// GET: Lấy tổng số lịch hẹn trong ngày
// ===================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // Lấy ngày hiện tại của Server (định dạng YYYY-MM-DD)
        $today = date('Y-m-d');

        // Query đếm số lịch hẹn trong ngày (Trừ những lịch đã hủy nếu cần thiết)
        // Ở đây tôi đếm tất cả các trạng thái 'BOOKED', 'RESCHEDULED', 'COMPLETED'
        $query = "SELECT COUNT(*) as total 
                  FROM appointments 
                  WHERE appointment_date = :today 
                  AND status != 'CANCELLED'";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':today', $today);
        $stmt->execute();
        
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $total = $row['total'] ?? 0;

        http_response_code(200);
        echo json_encode([
            "message" => "Lấy thống kê thành công.",
            "data" => [
                "total_appointments_today" => (int)$total,
                "date" => $today
            ]
        ]);
        exit();

    } catch (Exception $e) {
        debug_exit($e);
    }
}

// ===================================
// DEFAULT
// ===================================
http_response_code(405);
echo json_encode(["message" => "Method không được hỗ trợ."]);
exit;