<?php
// ===========================================
// BẮT ĐẦU OUTPUT BUFFERING (chỉ 1 lần duy nhất)
// ===========================================
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
        "message" => "Lỗi hệ thống!",
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
    header("Access-Control-Allow-Methods: GET, PUT, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    http_response_code(200);
    exit();
}

header("Access-Control-Allow-Origin: $allowed_origin");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/Patient.php';

// ==============================
// KIỂM TRA SESSION LOGIN
// ==============================
if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'PATIENT') {
    http_response_code(401);
    echo json_encode(["message" => "Vui lòng đăng nhập lại."]);
    exit();
}

$userId = $_SESSION['user_id'];

// ==============================
// KẾT NỐI DB
// ==============================
try {
    $database = new Database();
    $db = $database->getConnection();
} catch (Exception $e) {
    debug_exit($e);
}

$user = new User($db);
$patient = new Patient($db);

// ===================================
// 1. API GET PROFILE
// ===================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $patient->getProfileByUserId($userId);
        if (!$stmt || $stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(["message" => "Không tìm thấy hồ sơ bệnh nhân."]);
            exit;
        }

        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        $profile = [
            "id" => $row['user_id'],
            "fullName" => $row['full_name'],
            "email" => $row['email'],
            "phone" => $row['phone'],
            "address" => $row['address'],
            "cityId" => $row['city_id'],
            "profilePicture" => $row['profile_picture']
        ];

        http_response_code(200);
        echo json_encode(["data" => $profile]);
        exit();

    } catch (Exception $e) {
        debug_exit($e);
    }
}

// ===================================
// 2. API PUT UPDATE PROFILE
// ===================================
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {

    $body = file_get_contents("php://input");
    $data = json_decode($body);

    if (!$data) {
        http_response_code(400);
        echo json_encode(["message" => "Body gửi lên không phải JSON hợp lệ!"]);
        exit();
    }

    if (empty($data->fullName) || empty($data->cityId)) {
        http_response_code(400);
        echo json_encode(["message" => "Họ tên và Thành phố là bắt buộc."]);
        exit();
    }

    try {
        $db->beginTransaction();

        // UPDATE user table
        $user->id = $userId;
        $user->full_name = $data->fullName;
        $user->city_id = (int)$data->cityId;
        if (!$user->updateProfile()) {
            throw new Exception("Không thể cập nhật bảng Users");
        }

        // UPDATE patient table
        $patient->user_id = $userId;
        $patient->name = $data->fullName;
        $patient->phone = $data->phone ?? null;
        $patient->address = $data->address ?? null;

        if (!$patient->updateDetails()) {
            throw new Exception("Không thể cập nhật bảng Patients");
        }

        $db->commit();

        http_response_code(200);
        echo json_encode(["message" => "Cập nhật hồ sơ thành công!"]);
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

