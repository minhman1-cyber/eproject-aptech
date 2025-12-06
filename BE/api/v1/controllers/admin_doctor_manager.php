<?php
// Bắt đầu Output Buffering
ob_start(); 
session_start();

// ==============================
// HÀM DEBUG & BẮT LỖI JSON
// ==============================
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
$allowed_origin = 'http://localhost:5173'; // Giả định Frontend chạy ở 5173
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
    require_once '../models/Doctor.php'; 
    require_once '../models/User.php';
    require_once '../models/Specialization.php'; // Giả định bạn có Model này
    
    $database = new Database();
    $db = $database->getConnection();
    if (!$db) { throw new Exception("Lỗi kết nối database."); }

    $doctor = new Doctor($db);
    $specModel = new Specialization($db); // Giả định có Specialization Model
    $user = new User($db); // Cần Model User cho updateProfile
} catch (Exception $e) {
    echo 'hello excep';
    debug_exit($e);
}

// ===================================
// KIỂM TRA SESSION & VAI TRÒ ADMIN
// ===================================

if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'ADMIN') {

    http_response_code(401);
    echo json_encode(["message" => "Truy cập bị từ chối. Vui lòng đăng nhập với vai trò Admin."]);
    exit();
}


// ===================================
// GET: Lấy danh sách Doctor
// ===================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $doctor->getAllDoctorsForAdmin();
        $doctors_raw = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $doctors_list = [];
        foreach ($doctors_raw as $doc) {
            // Chuyển chuỗi specialization_ids thành mảng số nguyên
            $spec_ids = $doc['specialization_ids'] ? array_map('intval', explode(',', $doc['specialization_ids'])) : [];
            
            $doctors_list[] = [
                "user_id" => (int)$doc['user_id'],
                "city_id" => (int)$doc['city_id'],
                "full_name" => $doc['full_name'],
                "qualification" => $doc['qualification'],
                "bio" => $doc['bio'],
                "email" => $doc['email'],
                "phone" => $doc['phone'],
                "is_active" => $doc['is_active'], // Trạng thái duyệt của doctor
                "user_is_active" => (int)$doc['user_is_active'], // Trạng thái tài khoản (users.is_active)
                "specializationIds" => $spec_ids
            ];
        }

        // Lấy danh sách Cities và Specializations để Frontend hiển thị combobox
        $allCities = $doctor->getAllCities(); // Giả định hàm này tồn tại
        $allSpecializations = $doctor->getAllSpecializations(); 

        http_response_code(200);
        echo json_encode([
            "data" => [
                "doctors" => $doctors_list,
                "cities" => $allCities,
                "specializations" => $allSpecializations
            ]
        ]);
        exit();

    } catch (Exception $e) {
        debug_exit($e);
    }
}

// ===================================
// PUT: Cập nhật Trạng thái Tài khoản
// ===================================
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data = json_decode(file_get_contents("php://input"));
    $updateType = $data->updateType ?? null;

    if ($updateType === 'toggle_user_active') {
        // Logic từ hàm handleToggleActivation trong React
        $userId = $data->userId ?? null;
        $newStatus = $data->isActive ?? null;

        if ($userId === null || $newStatus === null) {
            http_response_code(400);
            echo json_encode(["message" => "Thiếu User ID hoặc trạng thái mới."]);
            exit();
        }
        
        try {
            $db->beginTransaction();
            // Sử dụng hàm mới để cập nhật users.is_active
            if (!$doctor->toggleUserActive((int)$userId, (int)$newStatus)) {
                throw new Exception("Không thể cập nhật trạng thái User (ID: {$userId}).");
            }
            $db->commit();

            $statusText = $newStatus === 1 ? 'Kích hoạt' : 'Ngừng hoạt động';
            http_response_code(200);
            echo json_encode(["message" => "Đã chuyển tài khoản sang trạng thái {$statusText} thành công."]);
            exit();

        } catch (Exception $e) {
            if ($db->inTransaction()) { $db->rollback(); }
            debug_exit($e);
        }

    } else {
        http_response_code(400);
        echo json_encode(["message" => "Loại cập nhật không được hỗ trợ."]);
    }
}

// ===================================
// DEFAULT — METHOD NOT ALLOWED
// ===================================
http_response_code(405);
echo json_encode(["message" => "Method không được hỗ trợ."]);
exit;