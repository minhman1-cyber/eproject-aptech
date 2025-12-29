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
$allowed_origin = 'http://localhost:5173'; 
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: $allowed_origin");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Methods: GET, PUT, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    http_response_code(200);
    exit();
}

header("Access-Control-Allow-Origin: $allowed_origin");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, PUT"); 

// ===================================
// LOAD MODELS & DB
// ===================================
try {
    require_once '../config/database.php';
    require_once '../models/Appointment.php'; 
    require_once '../models/Doctor.php'; 
    require_once '../models/Patient.php'; 
    require_once '../models/DoctorAvailability.php'; // Load thêm Model Availability
    
    // --- THÊM: Load Email Service ---
    require_once __DIR__ . '/../services/email_service.php';
    
    $database = new Database();
    $db = $database->getConnection();
    if (!$db) { throw new Exception("Lỗi kết nối database."); }

    $appointmentModel = new Appointment($db);
    $doctorModel = new Doctor($db);
    $patientModel = new Patient($db);
    $availabilityModel = new DoctorAvailability($db); // Khởi tạo

} catch (Exception $e) {
    debug_exit($e);
}

// ===================================
// KIỂM TRA SESSION & VAI TRÒ DOCTOR
// ===================================
if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'DOCTOR') {
    http_response_code(401);
    echo json_encode(["message" => "Truy cập bị từ chối. Vui lòng đăng nhập với vai trò Bác sĩ."]);
    exit();
}

$userId = $_SESSION['user_id']; 

// Lấy doctor_id (ID chính của bảng doctors)
$doctorProfileStmt = $doctorModel->getProfileByUserId($userId);
if ($doctorProfileStmt->rowCount() === 0) {
    http_response_code(404);
    echo json_encode(["message" => "Không tìm thấy hồ sơ bác sĩ chi tiết."]);
    exit();
}
$doctorRow = $doctorProfileStmt->fetch(PDO::FETCH_ASSOC);
$doctorId = $doctorRow['doctor_id'];


// ===================================
// GET: Lấy danh sách Lịch Hẹn của Doctor
// ===================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $appointmentModel->getAppointmentsByDoctorId($doctorId); 
        $appointments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $patientIds = array_unique(array_column($appointments, 'patient_id'));
        $patientsDetails = [];
        
        if (!empty($patientIds)) {
            // Lấy tên bệnh nhân từ bảng patients/users
            $patientsDetails = $patientModel->getPatientDetailsByIds($patientIds); 
        }

        // Ánh xạ dữ liệu cho Frontend
        $mappedAppointments = array_map(function($app) use ($patientsDetails) {
            $patientDetail = $patientsDetails[$app['patient_id']] ?? ['full_name' => 'N/A'];
            
            return [
                "id" => $app['id'],
                "patientName" => $patientDetail['full_name'],
                "appointmentDate" => $app['appointment_date'],
                "appointmentTime" => substr($app['appointment_time'], 0, 5), // Chỉ lấy HH:MM
                "reason" => $app['reason'],
                "status" => $app['status'],
                "createdAt" => $app['created_at'],
                "patient_id" => (int)$app['patient_id'],
            ];
        }, $appointments);

        http_response_code(200);
        echo json_encode([
            "message" => "Tải danh sách lịch hẹn thành công.",
            "data" => ["appointments" => $mappedAppointments]
        ]);
        exit();

    } catch (Exception $e) {
        debug_exit($e);
    }
}

// ===================================
// PUT: Quản lý Lịch hẹn (Hủy & Hoàn thành)
// ===================================
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true); 
    
    $appointmentId = $data['id'] ?? null;
    $actionType = $data['actionType'] ?? null; // 'CANCEL' hoặc 'COMPLETE'

    if (empty($appointmentId) || empty($actionType)) {
        http_response_code(400);
        echo json_encode(["message" => "Thiếu ID lịch hẹn hoặc loại hành động."]);
        exit();
    }
    
    try {
        $db->beginTransaction();

        // 1. Kiểm tra quyền sở hữu (Đảm bảo lịch hẹn thuộc về bác sĩ này)
        $appointmentDetails = $appointmentModel->getAppointmentDetails($appointmentId); 
        if (!$appointmentDetails || (int)$appointmentDetails['doctor_id'] !== (int)$doctorId) {
             http_response_code(403);
             throw new Exception("Bạn không có quyền thao tác trên lịch hẹn này.");
        }
        
        // 2. Lấy thông tin bệnh nhân để gửi email
        $patientStmt = $patientModel->getPatientDetailsById($appointmentDetails['patient_id']);
        $patientInfo = $patientStmt->fetch(PDO::FETCH_ASSOC);

        $message = "";
        $newStatus = "";
        
        // Biến chuẩn bị cho việc gửi email
        $shouldSendEmail = false;
        $emailSubject = "";
        $emailContent = "";
        
        if ($actionType === 'CANCEL') {
            $newStatus = 'CANCELLED';
            if ($appointmentDetails['status'] === 'COMPLETED' || $appointmentDetails['status'] === 'CANCELLED') {
                 throw new Exception("Lịch hẹn không thể hủy (đã hoàn thành hoặc đã hủy).");
            }
            
            // === LOGIC MỚI: TRẢ LẠI SLOT (IS_BOOKED = 0) ===
            // Tìm slot tương ứng trong bảng doctor_availability
            $slotQuery = "SELECT id FROM doctor_availability 
                          WHERE doctor_id = :doctor_id 
                          AND date = :date 
                          AND start_time = :time 
                          LIMIT 1";
            $slotStmt = $db->prepare($slotQuery);
            $slotStmt->bindParam(':doctor_id', $doctorId);
            $slotStmt->bindParam(':date', $appointmentDetails['appointment_date']);
            $slotStmt->bindParam(':time', $appointmentDetails['appointment_time']);
            $slotStmt->execute();
            
            if ($slotId = $slotStmt->fetchColumn()) {
                // Cập nhật trạng thái slot về 0 (Available)
                $availabilityModel->updateBookingStatus($slotId, 0);
            }
            // ==============================================

            $message = "Đã hủy lịch hẹn và mở lại slot khám.";
            
            // Cấu hình Email Hủy
            if ($patientInfo && !empty($patientInfo['email'])) {
                $shouldSendEmail = true;
                $emailSubject = "Thông báo hủy lịch hẹn - Mediconnect";
                $timeShort = substr($appointmentDetails['appointment_time'], 0, 5);
                $emailContent = "
                    <p>Xin chào <strong>{$patientInfo['full_name']}</strong>,</p>
                    <p>Bác sĩ đã hủy lịch hẹn khám bệnh của bạn.</p>
                    <p><strong>Chi tiết:</strong></p>
                    <ul>
                        <li>Ngày: {$appointmentDetails['appointment_date']}</li>
                        <li>Giờ: {$timeShort}</li>
                    </ul>
                    <p>Vui lòng truy cập hệ thống để đặt lại lịch khác nếu bạn vẫn có nhu cầu khám.</p>
                    <p>Xin lỗi vì sự bất tiện này.</p>
                ";
            }
            
        } elseif ($actionType === 'COMPLETE') {
            $newStatus = 'COMPLETED';
            if ($appointmentDetails['status'] !== 'BOOKED' && $appointmentDetails['status'] !== 'RESCHEDULED') {
                 throw new Exception("Lịch hẹn chỉ có thể hoàn thành từ trạng thái Đã đặt hoặc Đã đổi lịch.");
            }
            $message = "Đã đánh dấu lịch hẹn hoàn thành thành công.";
            
            // Cấu hình Email Hoàn thành
            if ($patientInfo && !empty($patientInfo['email'])) {
                $shouldSendEmail = true;
                $emailSubject = "Cảm ơn đã sử dụng dịch vụ - Mediconnect";
                $timeShort = substr($appointmentDetails['appointment_time'], 0, 5);
                $emailContent = "
                    <p>Xin chào <strong>{$patientInfo['full_name']}</strong>,</p>
                    <p>Lịch khám của bạn vào lúc <strong>{$timeShort}</strong> ngày <strong>{$appointmentDetails['appointment_date']}</strong> đã hoàn tất.</p>
                    <p>Cảm ơn bạn đã tin tưởng đội ngũ bác sĩ của Mediconnect.</p>
                    <p>Chúc bạn luôn mạnh khỏe!</p>
                ";
            }
            
        } else {
            http_response_code(400);
            throw new Exception("Hành động không xác định.");
        }

        // Cập nhật trạng thái Appointment
        if (!$appointmentModel->updateStatus($appointmentId, $newStatus)) {
             throw new Exception("Lỗi khi cập nhật trạng thái lịch hẹn.");
        }

        $db->commit();
        
        // --- GỬI EMAIL (Thực hiện sau khi commit DB thành công) ---
        if ($shouldSendEmail) {
            try {
                sendEmail(
                    $patientInfo['email'], 
                    $patientInfo['full_name'], 
                    $emailSubject, 
                    $emailContent
                );
            } catch (Exception $e) {
                // Chỉ log lỗi email, không làm fail request chính
                error_log("Lỗi gửi email cho bệnh nhân (ID: {$patientInfo['id']}): " . $e->getMessage());
            }
        }

        http_response_code(200);
        echo json_encode([
            "message" => $message,
            "email_sent" => $shouldSendEmail // Flag debug để biết có cố gửi email không
        ]);
        exit();

    } catch (Exception $e) {
        if ($db->inTransaction()) { $db->rollback(); }
        debug_exit($e);
    }
}

// ===================================
// DEFAULT
// ===================================
http_response_code(405);
echo json_encode(["message" => "Method không được hỗ trợ."]);
exit;