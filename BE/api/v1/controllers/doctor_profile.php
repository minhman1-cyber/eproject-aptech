<?php
// Bắt đầu Output Buffering để bắt mọi lỗi/cảnh báo PHP
ob_start();
session_start();

// ==============================
// HÀM DEBUG & BẮT LỖI JSON
// ==============================
function debug_exit($e = null) {
    $buffer = ob_get_contents();
    ob_end_clean(); 

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
         $response['message'] = "Lỗi hệ thống: " . $e->getMessage();
    }

    echo json_encode($response);
    exit;
}

// ==============================
// CẤU HÌNH CORS
// ==============================
$allowed_origin = 'http://localhost:5173'; // Cổng frontend
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: $allowed_origin");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Methods: GET, PUT, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    http_response_code(200);
    exit();
}

header("Access-Control-Allow-Origin: $allowed_origin");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, PUT"); // Cho phép GET (tải) và PUT (cập nhật)

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/Doctor.php';
require_once __DIR__ . '/../models/Qualification.php'; // Cần Qualification Model

// === HÀNH ĐỘNG DEBUG MỚI: Bắt Output ngay tại đây ===
$output_after_includes = ob_get_clean(); // Lấy và xóa nội dung buffer
ob_start(); // Bắt đầu buffer lại cho logic chính
// === KẾT THÚC HÀNH ĐỘNG DEBUG MỚI ===

if (!empty(trim($output_after_includes))) {
    // Nếu có bất kỳ ký tự nào bị lọt ra từ các file include, ta báo lỗi ngay lập tức
    http_response_code(500);
    echo json_encode([
        "message" => "LỖI FATAL: Ký tự thừa bị lọt ra ngoài từ file Config/Model.",
        "debug_output" => $output_after_includes,
        "exception" => "Ký tự/khoảng trắng/BOM sau thẻ ?> đã làm hỏng JSON."
    ]);
    exit();
}

// ==============================
// KIỂM TRA SESSION LOGIN (DOCTOR)
// ==============================
if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'DOCTOR') {
    http_response_code(401);
    echo json_encode(["message" => "Truy cập bị từ chối. Vui lòng đăng nhập với vai trò Bác sĩ."]);
    exit();
}

$userId = $_SESSION['user_id'];

// ==============================
// KẾT NỐI DB & KHỞI TẠO MODEL
// ==============================
try {
    $database = new Database();
    $db = $database->getConnection();
    if (!$db) {
         throw new Exception("Lỗi kết nối database.");
    }
    $user = new User($db);
    $doctor = new Doctor($db);
    $qualification = new Qualification($db);
} catch (Exception $e) {
    debug_exit($e);
}

// ===================================
// 1. API GET PROFILE (Lấy tất cả dữ liệu cho 3 tab)
// ===================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $doctor->getProfileByUserId($userId);
        
        if (!$stmt || $stmt->rowCount() === 0) {
             throw new Exception("Không tìm thấy hồ sơ bác sĩ.");
        }

        $profileRow = $stmt->fetch(PDO::FETCH_ASSOC);
        $doctorId = $profileRow['doctor_id'];

        // Lấy chuyên khoa và bằng cấp
        $selectedSpecs = $doctor->getSpecializationIds($doctorId);
        $allSpecs = $doctor->getAllSpecializations();
        $qualsStmt = $qualification->getByDoctorId($doctorId);
        $quals = $qualsStmt ? $qualsStmt->fetchAll(PDO::FETCH_ASSOC) : [];
        
        // Chuẩn hóa dữ liệu trả về cho Frontend
        $profile = [
            "id" => $profileRow['user_id'],
            "doctorId" => $doctorId,
            "fullName" => $profileRow['full_name'],
            "email" => $profileRow['email'],
            "phone" => $profileRow['phone'],
            "cityId" => $profileRow['city_id'],
            "qualification" => $profileRow['qualification'],
            "bio" => $profileRow['bio'],
            "profilePicture" => $profileRow['profile_picture'],
            "is_active" => $profileRow['is_active'],
            "selectedSpecializationIds" => $selectedSpecs,
            "allSpecializations" => $allSpecs,
            "qualifications" => $quals
        ];

        http_response_code(200);
        echo json_encode(["data" => $profile]);
        exit();

    } catch (Exception $e) {
        debug_exit($e);
    }
}

// ===================================
// 2. API PUT/POST: CẬP NHẬT
// ===================================
if ($_SERVER['REQUEST_METHOD'] === 'PUT' || $_SERVER['REQUEST_METHOD'] === 'POST') {

    $body = file_get_contents("php://input");
    $data = json_decode($body);

    if (!$data) {
        http_response_code(400);
        echo json_encode(["message" => "Body gửi lên không phải JSON hợp lệ!"]);
        exit();
    }

    // Lấy doctor_id
    $doctorProfileStmt = $doctor->getProfileByUserId($userId);
    if ($doctorProfileStmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(["message" => "Không tìm thấy hồ sơ bác sĩ chi tiết."]);
        exit();
    }
    $doctorRow = $doctorProfileStmt->fetch(PDO::FETCH_ASSOC);
    $doctorId = $doctorRow['doctor_id'];

    $db->beginTransaction();
    $updateType = $data->updateType ?? 'personal'; // personal, specializations

    try {
        if ($updateType === 'personal') {
            // Cập nhật Tab Thông tin cá nhân
            if (empty($data->fullName) || empty($data->cityId) || empty($data->phone)) {
                 throw new Exception("Họ tên, Thành phố và Điện thoại là bắt buộc.");
            }
            
            // Cập nhật bảng USERS (full_name, city_id)
            $user->id = $userId;
            $user->full_name = $data->fullName;
            $user->city_id = (int)$data->cityId;
            if (!$user->updateProfile()) { throw new Exception("Lỗi cập nhật bảng Users."); }

            // Cập nhật bảng DOCTORS (name, phone, qualification, bio)
            $doctor->user_id = $userId;
            $doctor->name = $data->fullName;
            $doctor->phone = $data->phone;
            $doctor->qualification = $data->qualification ?? '';
            $doctor->bio = $data->bio ?? '';
            if (!$doctor->updateDetails()) { throw new Exception("Lỗi cập nhật bảng Doctors."); }
            
            $responseMessage = "Cập nhật thông tin cá nhân thành công!";

        } elseif ($updateType === 'specializations') {
            // Cập nhật Tab Chuyên khoa (Sync N:N)
            $specializationIds = $data->specializationIds ?? [];

            if (!$doctor->syncSpecializations($doctorId, $specializationIds)) {
                throw new Exception("Lỗi đồng bộ hóa chuyên khoa.");
            }

            $responseMessage = "Cập nhật chuyên khoa thành công!";
        } else {
            http_response_code(400);
            echo json_encode(["message" => "Loại cập nhật không hợp lệ."]);
            exit();
        }

        $db->commit();
        http_response_code(200);
        echo json_encode(["message" => $responseMessage]);
        exit();
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollback();
        }
        debug_exit($e);
    }
}

// ===================================
// DEFAULT — METHOD NOT ALLOWED
// ===================================
http_response_code(405);
echo json_encode(["message" => "Method không được hỗ trợ."]);
exit;