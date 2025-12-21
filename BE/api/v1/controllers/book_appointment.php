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
// LOAD MODELS & DB
// ===================================
try {
    require_once '../config/database.php';
    require_once '../models/Appointment.php'; 
    require_once '../models/Patient.php'; 
    require_once '../models/DoctorAvailability.php'; // Load thêm Model Availability
    require_once __DIR__ . '/../services/email_service.php';
    
    $database = new Database();
    $db = $database->getConnection();
    if (!$db) { throw new Exception("Lỗi kết nối database."); }

    $appointmentModel = new Appointment($db);
    $patientModel = new Patient($db);
    $availabilityModel = new DoctorAvailability($db); // Khởi tạo Model Availability

} catch (Exception $e) {
    debug_exit($e);
}

// ===================================
// KIỂM TRA SESSION (PATIENT)
// ===================================
if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'PATIENT') {
    http_response_code(401);
    echo json_encode(["message" => "Truy cập bị từ chối. Vui lòng đăng nhập với vai trò Bệnh nhân."]);
    exit();
}

$patientId = $_SESSION['user_id']; // ID của User (Role Patient)

// ===================================
// POST: Đặt Lịch Hẹn
// ===================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true); 
    
    $doctorId = $data['doctorId'] ?? null;
    $appointmentDate = $data['appointmentDate'] ?? null;
    $appointmentTime = $data['appointmentTime'] ?? null;
    $reason = $data['reason'] ?? null;
    
    // 1. Kiểm tra dữ liệu bắt buộc
    if (empty($doctorId) || empty($appointmentDate) || empty($appointmentTime) || empty($reason)) {
        http_response_code(400);
        echo json_encode(["message" => "Thiếu thông tin đặt lịch bắt buộc."]);
        exit();
    }
    
    try {
        $db->beginTransaction();

        // 2. Lấy Patient ID thực từ User ID
        $realPatientIds = $patientModel->getIdByUserId($patientId);
        if (!$realPatientIds) {
            http_response_code(404);
            throw new Exception("Không tìm thấy hồ sơ bệnh nhân. Vui lòng cập nhật thông tin cá nhân trước khi đặt lịch.");
        }
        
        // Lấy thông tin chi tiết để gửi email
        $patientDetailsStmt = $patientModel->getPatientDetailsById($realPatientIds); 
        $patientDetails = $patientDetailsStmt->fetch(PDO::FETCH_ASSOC);

        // ==================================================================
        // LOGIC MỚI: KIỂM TRA & KHÓA SLOT TRONG BẢNG DOCTOR_AVAILABILITY
        // ==================================================================
        
        // Chuẩn hóa thời gian (đảm bảo format HH:MM:SS cho query)
        $formattedTime = date('H:i:s', strtotime($appointmentTime));

        // 3. Tìm slot tương ứng trong bảng Availability
        // Query kiểm tra xem slot này có tồn tại, có bị khóa hay đã bị đặt chưa
        $slotQuery = "SELECT id, is_booked, is_locked FROM doctor_availability 
                      WHERE doctor_id = :doctor_id 
                      AND date = :date 
                      AND start_time = :start_time 
                      LIMIT 1 FOR UPDATE"; // FOR UPDATE để khóa dòng này trong transaction
        
        $slotStmt = $db->prepare($slotQuery);
        $slotStmt->bindParam(':doctor_id', $doctorId);
        $slotStmt->bindParam(':date', $appointmentDate);
        $slotStmt->bindParam(':start_time', $formattedTime);
        $slotStmt->execute();
        
        $slot = $slotStmt->fetch(PDO::FETCH_ASSOC);

        // Case A: Không tìm thấy slot (Bác sĩ không có lịch làm việc giờ này)
        if (!$slot) {
            http_response_code(400);
            throw new Exception("Bác sĩ không có lịch làm việc vào khung giờ $appointmentTime ngày $appointmentDate.");
        }

        // Case B: Slot đã bị khóa hoặc đã có người đặt
        if ((int)$slot['is_booked'] === 1 || (int)$slot['is_locked'] === 1) {
            http_response_code(409); // Conflict
            throw new Exception("Khung giờ này vừa có người đặt hoặc đã bị khóa. Vui lòng chọn giờ khác.");
        }

        // 4. Cập nhật trạng thái Slot thành ĐÃ ĐẶT (is_booked = 1)
        if (!$availabilityModel->updateBookingStatus($slot['id'], 1)) {
            throw new Exception("Lỗi khi giữ chỗ khung giờ này.");
        }

        // ==================================================================
        // TẠO LỊCH HẸN TRONG BẢNG APPOINTMENTS
        // ==================================================================
        
        $appointmentModel->patient_id = $realPatientIds;
        $appointmentModel->doctor_id = (int)$doctorId;
        $appointmentModel->appointment_date = $appointmentDate;
        $appointmentModel->appointment_time = $formattedTime;
        $appointmentModel->reason = $reason;
        
        if (!$appointmentModel->createAppointment()) {
             throw new Exception("Lỗi khi tạo hồ sơ lịch hẹn.");
        }
        
        $newAppointmentId = $db->lastInsertId();

        $db->commit();
        
        // Gửi email xác nhận (Không chặn luồng chính nếu lỗi email)
        if (!empty($patientDetails['email'])) {
            try {
                sendEmail(
                    $patientDetails['email'], 
                    $patientDetails['full_name'], 
                    "Xác nhận đặt lịch khám", 
                    "<p>Xin chào {$patientDetails['full_name']},</p>
                     <p>Bạn đã đặt lịch khám thành công với Bác sĩ (ID: $doctorId).</p>
                     <p><strong>Thời gian:</strong> $appointmentTime - $appointmentDate</p>
                     <p><strong>Lý do:</strong> $reason</p>
                     <p>Vui lòng đến đúng giờ.</p>"
                );
            } catch (Exception $emailError) {
                // Log lỗi email nhưng không throw exception để tránh rollback giao dịch thành công
                error_log("Lỗi gửi email: " . $emailError->getMessage());
            }
        }

        http_response_code(201); // Created
        echo json_encode([
            "message" => "Đặt lịch hẹn thành công!",
            "appointmentId" => $newAppointmentId,
            "slotId" => $slot['id']
        ]);
        
        exit();

    } catch (Exception $e) {
        if ($db->inTransaction()) { $db->rollback(); }
        
        // Trả về lỗi 409 nếu là lỗi trùng lặp/conflict
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