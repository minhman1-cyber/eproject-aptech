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

    if ($e && $e instanceof PDOException) {
        $response['message'] = "Lỗi Database: " . $e->getMessage() . " (Code: " . $e->getCode() . ")";
    } else if ($e) {
         $response['message'] = "Lỗi Server: " . $e->getMessage();
    }

    echo json_encode($response);
    exit;
}

// ==============================
// CẤU HÌNH CORS (ĐÃ TỐI ƯU)
// ==============================
$allowed_origin = 'http://localhost:5173'; // Frontend URL

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Xử lý Preflight Request OPTIONS
    header("Access-Control-Allow-Origin: $allowed_origin");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS"); // Mở rộng methods
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    http_response_code(200);
    exit();
}

// Headers cho request POST/GET/DELETE thực tế
header("Access-Control-Allow-Origin: $allowed_origin");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");
// Đặt tất cả các phương thức cần thiết để tránh lỗi
header("Access-Control-Allow-Methods: GET, POST, DELETE"); 

// ===================================
// LOAD MODELS & DB
// ... (Logic khởi tạo Model/DB giữ nguyên) ...

try {
    require_once '../config/database.php';
    require_once '../models/Doctor.php'; 
    require_once '../models/DoctorAvailability.php'; 
    require_once '../models/Appointment.php'; 
    
    $database = new Database();
    $db = $database->getConnection();
    if (!$db) { throw new Exception("Lỗi kết nối database."); }

    $doctorModel = new Doctor($db);
    $availabilityModel = new DoctorAvailability($db);
    $appointmentModel = new Appointment($db);

} catch (Exception $e) {
    debug_exit($e);
}

// ===================================
// KIỂM TRA SESSION (PATIENT)
// ... (Logic kiểm tra Session giữ nguyên) ...

if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'PATIENT') {
    http_response_code(401);
    echo json_encode(["message" => "Truy cập bị từ chối. Vui lòng đăng nhập."]);
    exit();
}

$userId = $_SESSION['user_id'];
$doctorProfileStmt = $doctorModel->getProfileByUserId($userId);
if ($doctorProfileStmt->rowCount() === 0) {
    http_response_code(404);
    echo json_encode(["message" => "Không tìm thấy hồ sơ bệnh nhân chi tiết."]);
    exit();
}
$doctorRow = $doctorProfileStmt->fetch(PDO::FETCH_ASSOC);
$doctorId = $doctorRow['doctor_id'];


// Hàm chia khung giờ thành các slot 30 phút (Giữ nguyên)
function generate_slots($startTime, $endTime, $bookedSlots) {
    $slots = [];
    $start = strtotime($startTime);
    $end = strtotime($endTime);
    $slotDuration = 30 * 60; // 30 phút

    while ($start < $end) {
        $currentTime = date('H:i', $start);

        // Kiểm tra đúng với format lưu trong DB
        $isBooked = in_array($currentTime, $bookedSlots);

        $slots[] = [
            'time' => $currentTime,
            'isBooked' => $isBooked
        ];
        
        $start += $slotDuration;
    }

    return $slots;
}


// ===================================
// POST: Lấy Khung giờ Rảnh (Slots)
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
        // 1. Lấy tất cả lịch rảnh (availability) cho ngày này
        $dayOfWeek = date('w', strtotime($appointmentDate)); // 0=Sun, 6=Sat
        $availabilityStmt = $availabilityModel->getAvailableSchedule($doctorId, $appointmentDate, $dayOfWeek);
        $schedules = $availabilityStmt->fetchAll(PDO::FETCH_ASSOC);

        // 2. Lấy tất cả các slot đã được đặt (appointments)
        $bookedTimes = $appointmentModel->getBookedSlots($doctorId, $appointmentDate);
        
        $allAvailableSlots = [];
        $uniqueSlots = [];

        // 3. Tạo các slot 30 phút từ các khung giờ rảnh
        foreach ($schedules as $schedule) {
            $slotsForSchedule = generate_slots(
                $schedule['start_time'], 
                $schedule['end_time'], 
                $bookedTimes
            );
            
            // Thêm các slot vào danh sách tổng (tránh trùng lặp)
            foreach ($slotsForSchedule as $slot) {
                if (!isset($uniqueSlots[$slot['time']])) {
                    $uniqueSlots[$slot['time']] = $slot;
                }
            }
        }
        
        // Sắp xếp các slot theo thời gian
        ksort($uniqueSlots);
        
        http_response_code(200);
        echo json_encode([
            "message" => "Tải lịch rảnh thành công.",
            "data" => ["availableTimes" => array_values($uniqueSlots)]
        ]);
        exit();

    } catch (Exception $e) {
        debug_exit($e);
    }
}

// ===================================
// DEFAULT — METHOD NOT ALLOWED
// ===================================
http_response_code(405);
echo json_encode(["message" => "Method không được hỗ trợ."]);
exit;