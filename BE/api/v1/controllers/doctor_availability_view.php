<?php
// Bắt đầu Output Buffering
ob_start(); 
session_start();

// ==============================
// HÀM DEBUG & BẮT LỖI JSON
// ==============================
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
$allowed_origin = 'http://localhost:5173'; // Frontend URL

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
// LOAD DB & MODELS
// ===================================
try {
    require_once '../config/database.php';
    require_once '../models/DoctorAvailability.php'; // Load Model
    
    $database = new Database();
    $db = $database->getConnection();
    if (!$db) { throw new Exception("Lỗi kết nối database."); }

    // Khởi tạo Model
    $availabilityModel = new DoctorAvailability($db);

} catch (Exception $e) {
    debug_exit($e);
}

// ===================================
// KIỂM TRA SESSION (PATIENT)
// ===================================
// Chỉ cho phép Bệnh nhân (hoặc user đã đăng nhập) xem để đặt lịch
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(["message" => "Vui lòng đăng nhập để xem lịch khám."]);
    exit();
}

// ===================================
// POST: Lấy Slot Rảnh (Theo cấu trúc Slot-based mới)
// ===================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true); 
    
    $doctorId = $data['doctorId'] ?? null;
    $appointmentDate = $data['appointmentDate'] ?? null;
    
    if (empty($doctorId) || empty($appointmentDate)) {
        http_response_code(400);
        echo json_encode(["message" => "Thiếu ID Bác sĩ hoặc Ngày khám."]);
        exit();
    }
    
    try {
        // Sử dụng Model để lấy dữ liệu thay vì query trực tiếp
        $stmt = $availabilityModel->getSlotsByDate($doctorId, $appointmentDate);
        $slots = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Format lại dữ liệu cho Frontend dễ sử dụng
        $formattedSlots = [];
        foreach ($slots as $slot) {
            // MVC Logic: Controller quyết định dữ liệu nào được trả về View
            // Lọc bỏ các slot bị khóa (is_locked = 1)
            if ((int)$slot['is_locked'] === 1) {
                continue;
            }

            // Cắt chuỗi giây (08:00:00 -> 08:00)
            $timeDisplay = date('H:i', strtotime($slot['start_time']));
            $endTimeDisplay = date('H:i', strtotime($slot['end_time']));
            
            $formattedSlots[] = [
                'id' => $slot['id'],            // ID này dùng để Booking
                'time' => $timeDisplay,         // Giờ hiển thị
                'endTime' => $endTimeDisplay,   // Giờ kết thúc
                'isBooked' => (int)$slot['is_booked'] === 1 // True/False
            ];
        }
        
        http_response_code(200);
        echo json_encode([
            "message" => "Tải lịch rảnh thành công.",
            "data" => [
                "availableTimes" => $formattedSlots
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