<?php
// Bắt đầu Output Buffering
ob_start(); 
session_start();

// HÀM DEBUG & BẮT LỖI JSON
function debug_exit($e = null) {
    $buffer = ob_get_contents();
    if (ob_get_level() > 0) {
        ob_end_clean(); 
    }

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
    require_once '../models/User.php'; // Cần cho updateProfile
    require_once '../models/Doctor.php'; 
    
    $database = new Database();
    $db = $database->getConnection();
    if (!$db) { throw new Exception("Lỗi kết nối database."); }

    $doctor = new Doctor($db);
    $user = new User($db);
} catch (Exception $e) {
    debug_exit($e);
}

// ===================================
// KIỂM TRA SESSION & VAI TRÒ ADMIN
// ===================================
if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'ADMIN') {
    http_response_code(401);
    echo json_encode(["message" => "Truy cập bị từ chối. Chỉ Admin mới được chỉnh sửa."]);
    exit();
}

// ===================================
// PUT: Cập nhật chi tiết Doctor
// ===================================
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true); // Decode thành mảng liên kết

    if (!isset($data['updateType']) || $data['updateType'] !== 'update_doctor_details') {
        http_response_code(400);
        echo json_encode(["message" => "Loại cập nhật không hợp lệ."]);
        exit();
    }
    
    if (empty($data['userId']) || empty($data['fullName']) || empty($data['cityId']) || empty($data['isApproved']) || empty($data['specializationIds'])) {
        http_response_code(400);
        echo json_encode(["message" => "Thiếu các trường bắt buộc (User ID, Tên, Thành phố, Trạng thái Duyệt, Chuyên khoa)."]);
        exit();
    }
    
    $userId = (int)$data['userId'];

    try {
        $db->beginTransaction();

        // 1. Cập nhật bảng USERS (full_name, city_id, is_active)
        $user->id = $userId;
        $user->full_name = $data['fullName'];
        $user->city_id = (int)$data['cityId'];
        $user->is_active = (int)$data['isActive'];
        if (!$doctor->adminUpdateUser($user)) {
             throw new Exception("Không thể cập nhật thông tin User cơ bản.");
        }

        // 2. Cập nhật bảng DOCTORS (phone, qualification, bio, is_active/is_approved)
        $doctor->user_id = $userId;
        $doctor->name = $data['fullName'];
        $doctor->phone = $data['phone'] ?? null;
        $doctor->qualification = $data['qualification'] ?? null;
        $doctor->bio = $data['bio'] ?? null;
        $doctor->is_active = $data['isApproved']; // ENUM: PENDING/APPROVED/REJECTED

        if (!$doctor->adminUpdateDoctorDetails()) {
             throw new Exception("Không thể cập nhật thông tin Doctor chi tiết.");
        }
        
        // 3. Đồng bộ hóa Chuyên khoa (Bảng N:N)
        $doctorProfileStmt = $doctor->getProfileByUserId($userId);
        $doctorRow = $doctorProfileStmt->fetch(PDO::FETCH_ASSOC);
        $doctorId = $doctorRow['doctor_id'];

        // Lọc và chuyển về mảng số nguyên
        $specializationIds = array_filter($data['specializationIds'], 'is_numeric');
        $specializationIds = array_map('intval', $specializationIds);
        

        if (!$doctor->syncSpecializations($doctorId, $specializationIds)) {
            
            throw new Exception("Lỗi đồng bộ hóa chuyên khoa.");
        }

        $db->commit();

        http_response_code(200);
        echo json_encode(["message" => "Hồ sơ bác sĩ đã được cập nhật thành công."]);
        exit();

    } catch (Exception $e) {
        if ($db->inTransaction()) { $db->rollback(); }
        debug_exit($e);
    }
}

// ===================================
// DEFAULT — METHOD NOT ALLOWED
// ===================================
http_response_code(405);
echo json_encode(["message" => "Method không được hỗ trợ."]);
exit;