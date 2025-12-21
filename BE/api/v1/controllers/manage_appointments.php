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
// CẤU HÌNH CORS
// ==============================
$allowed_origin = 'http://localhost:5173'; 
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: $allowed_origin");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Methods: PUT, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    http_response_code(200);
    exit();
}

header("Access-Control-Allow-Origin: $allowed_origin");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: PUT"); 

// ===================================
// LOAD MODELS & DB
// ===================================
try {
    require_once '../config/database.php';
    require_once '../models/Appointment.php'; 
    require_once '../models/Patient.php'; 
    require_once '../models/DoctorAvailability.php'; // Load thêm Model Availability
    
    $database = new Database();
    $db = $database->getConnection();
    if (!$db) { throw new Exception("Lỗi kết nối database."); }

    $appointmentModel = new Appointment($db);
    $patientModel = new Patient($db);
    $availabilityModel = new DoctorAvailability($db); // Khởi tạo

} catch (Exception $e) {
    debug_exit($e);
}

// ===================================
// KIỂM TRA SESSION & QUYỀN
// ===================================
if (!isset($_SESSION['user_id']) || !in_array($_SESSION['user_role'], ['ADMIN', 'PATIENT'])) {
    http_response_code(401);
    echo json_encode(["message" => "Truy cập bị từ chối. Vai trò không hợp lệ."]);
    exit();
}

// Xử lý xác định Patient ID dựa trên Role
$patientIds = $_SESSION['user_id']; 
$patientId = $patientIds;

if ($_SESSION['user_role'] === 'PATIENT') {
    $patientId = $patientModel->getIdByUserId($patientIds);
    if (!$patientId) {
        http_response_code(404);
        throw new Exception("Không tìm thấy hồ sơ Patient tương ứng. Vui lòng cập nhật hồ sơ cá nhân.");
    }
} else if ($_SESSION['user_role'] === 'ADMIN') {
    $payload = json_decode(file_get_contents("php://input"), true);
    // Với Admin, có thể không cần check patientId sở hữu nếu chỉ thao tác dựa trên appointmentId,
    // nhưng nếu cần validate logic thì có thể giữ nguyên. 
    // Ở đây ta tạm thời ưu tiên lấy ID từ DB của appointment.
}

// ===================================
// PUT: Quản lý Lịch hẹn (Hủy & Đổi lịch)
// ===================================
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true); 
    
    $appointmentId = $data['id'] ?? null;
    $actionType = $data['actionType'] ?? null; // 'CANCEL' hoặc 'RESCHEDULE'
    
    if (empty($appointmentId) || empty($actionType)) {
        http_response_code(400);
        echo json_encode(["message" => "Thiếu ID lịch hẹn hoặc loại hành động."]);
        exit();
    }
    
    try {
        $db->beginTransaction();

        // 1. Kiểm tra quyền sở hữu & Lấy thông tin hiện tại
        $appointmentDetails = $appointmentModel->getAppointmentDetails($appointmentId); 
        
        if (!$appointmentDetails) {
            http_response_code(404);
            throw new Exception("Không tìm thấy lịch hẹn.");
        }

        // Nếu là Patient thì phải đúng là người đặt
        if ($_SESSION['user_role'] === 'PATIENT' && (int)$appointmentDetails['patient_id'] !== (int)$patientId) {
             http_response_code(403);
             throw new Exception("Bạn không có quyền thực hiện thao tác trên lịch hẹn này.");
        }
        
        $message = "";
        
        // ==================================================================
        // CASE 1: HỦY LỊCH (CANCEL)
        // ==================================================================
        if ($actionType === 'CANCEL') {
            if ($appointmentDetails['status'] !== 'BOOKED' && $appointmentDetails['status'] !== 'RESCHEDULED') {
                 throw new Exception("Lịch hẹn không thể hủy (Trạng thái hiện tại: {$appointmentDetails['status']}).");
            }

            // A. Cập nhật trạng thái Appointment -> CANCELLED
            if (!$appointmentModel->updateStatus($appointmentId, 'CANCELLED')) {
                 throw new Exception("Lỗi khi cập nhật trạng thái hủy lịch.");
            }

            // B. Mở lại Slot trong bảng doctor_availability (is_booked = 0)
            $slotQuery = "SELECT id FROM doctor_availability 
                          WHERE doctor_id = :doctor_id 
                          AND date = :date 
                          AND start_time = :time 
                          LIMIT 1";
            $slotStmt = $db->prepare($slotQuery);
            $slotStmt->bindParam(':doctor_id', $appointmentDetails['doctor_id']);
            $slotStmt->bindParam(':date', $appointmentDetails['appointment_date']);
            $slotStmt->bindParam(':time', $appointmentDetails['appointment_time']);
            $slotStmt->execute();
            
            if ($slotId = $slotStmt->fetchColumn()) {
                $availabilityModel->updateBookingStatus($slotId, 0);
            }

            $message = "Hủy lịch hẹn thành công! Slot khám đã được mở lại.";
            
        // ==================================================================
        // CASE 2: ĐỔI LỊCH (RESCHEDULE)
        // ==================================================================
        } elseif ($actionType === 'RESCHEDULE') {
            $newDate = $data['newDate'] ?? null;
            $newTime = $data['newTime'] ?? null;
            
            if (empty($newDate) || empty($newTime)) {
                http_response_code(400);
                throw new Exception("Thiếu Ngày hoặc Giờ mới để đổi lịch.");
            }

            // Chuẩn hóa giờ
            $newTimeFormatted = date('H:i:s', strtotime($newTime));

            // A. Kiểm tra Slot MỚI có rảnh không
            $newSlotQuery = "SELECT id, is_booked, is_locked FROM doctor_availability 
                             WHERE doctor_id = :doctor_id 
                             AND date = :date 
                             AND start_time = :start_time 
                             LIMIT 1 FOR UPDATE";
            $newSlotStmt = $db->prepare($newSlotQuery);
            $newSlotStmt->bindParam(':doctor_id', $appointmentDetails['doctor_id']);
            $newSlotStmt->bindParam(':date', $newDate);
            $newSlotStmt->bindParam(':start_time', $newTimeFormatted);
            $newSlotStmt->execute();
            
            $newSlot = $newSlotStmt->fetch(PDO::FETCH_ASSOC);

            // Nếu không tìm thấy slot hoặc slot đã bị khóa/đặt
            if (!$newSlot || (int)$newSlot['is_booked'] === 1 || (int)$newSlot['is_locked'] === 1) {
                http_response_code(409); // Conflict
                throw new Exception("Khung giờ mới này không khả dụng (đã có người đặt hoặc bác sĩ nghỉ).");
            }

            // B. Khóa Slot MỚI (is_booked = 1)
            if (!$availabilityModel->updateBookingStatus($newSlot['id'], 1)) {
                throw new Exception("Lỗi khi giữ chỗ khung giờ mới.");
            }

            // C. Mở khóa Slot CŨ (is_booked = 0)
            $oldSlotQuery = "SELECT id FROM doctor_availability 
                             WHERE doctor_id = :doctor_id 
                             AND date = :date 
                             AND start_time = :time 
                             LIMIT 1";
            $oldSlotStmt = $db->prepare($oldSlotQuery);
            $oldSlotStmt->bindParam(':doctor_id', $appointmentDetails['doctor_id']);
            $oldSlotStmt->bindParam(':date', $appointmentDetails['appointment_date']);
            $oldSlotStmt->bindParam(':time', $appointmentDetails['appointment_time']);
            $oldSlotStmt->execute();

            if ($oldSlotId = $oldSlotStmt->fetchColumn()) {
                $availabilityModel->updateBookingStatus($oldSlotId, 0);
            }
            
            // D. Cập nhật Appointment với ngày giờ mới
            if (!$appointmentModel->reschedule($appointmentId, $newDate, $newTimeFormatted)) {
                throw new Exception("Lỗi khi cập nhật thời gian đổi lịch.");
            }

            $message = "Đổi lịch hẹn thành công!";
            
        } else {
            http_response_code(400);
            throw new Exception("Hành động không xác định.");
        }

        $db->commit();

        http_response_code(200);
        echo json_encode(["message" => $message]);
        exit();

    } catch (Exception $e) {
        if ($db->inTransaction()) { $db->rollback(); }
        
        // Trả về lỗi 409 nếu conflict slot
        if ($e->getCode() === 409) {
            http_response_code(409);
        }
        
        debug_exit($e);
    }
}

// ===================================
// DEFAULT
// ===================================
http_response_code(405);
echo json_encode(["message" => "Method không được hỗ trợ."]);
exit;