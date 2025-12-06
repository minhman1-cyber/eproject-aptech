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
    header("Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    http_response_code(200);
    exit();
}

header("Access-Control-Allow-Origin: $allowed_origin");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT"); 

// ===================================
// LOAD MODELS & DB
// ===================================
try {
    require_once '../config/database.php';
    require_once '../models/User.php'; 
    require_once '../models/Patient.php';
    require_once '../models/Doctor.php'; // Chứa hàm getAllCities và adminUpdateUser

    $database = new Database();
    $db = $database->getConnection();
    if (!$db) { throw new Exception("Lỗi kết nối database."); }

    $patientModel = new Patient($db);
    $userModel = new User($db);
    $doctorModel = new Doctor($db); // Dùng để lấy Cities và hàm adminUpdateUser
} catch (Exception $e) {
    debug_exit($e);
}

// ===================================
// KIỂM TRA SESSION & VAI TRÒ ADMIN
// ===================================
if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'ADMIN') {
    http_response_code(401);
    echo json_encode(["message" => "Truy cập bị từ chối. Chỉ Admin mới được quản lý."]);
    exit();
}

// ===================================
// GET: Lấy danh sách Patients
// ===================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $patientModel->getAllPatientsForAdmin();
        $patients_list = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Lấy danh sách Cities (Dùng hàm trong Doctor Model)
        $allCities = $doctorModel->getAllCities(); 

        http_response_code(200);
        echo json_encode([
            "message" => "Tải danh sách bệnh nhân thành công.",
            "data" => [
                "patients" => $patients_list,
                "cities" => $allCities,
                // "specializations" => [], // Không cần cho Patient
            ]
        ]);
        exit();

    } catch (Exception $e) {
        debug_exit($e);
    }
}

// ===================================
// PUT: Cập nhật Patient (Sửa/Khóa/Mở khóa)
// ===================================
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true); 
    $updateType = $data['updateType'] ?? 'update_patient_details';

    if (empty($data['userId'])) {
        http_response_code(400);
        echo json_encode(["message" => "Thiếu User ID để cập nhật."]);
        exit();
    }
    
    $userId = (int)$data['userId'];

    try {
        $db->beginTransaction();

        if ($updateType === 'toggle_user_active') {
            // KHÓA/MỞ KHÓA TÀI KHOẢN (users.is_active)
            $isActive = (int)$data['isActive'];
            
            // Tái sử dụng logic AdminUpdateUser (cần tạo object User)
            $userModel->id = $userId;
            $userModel->is_active = $isActive;
            
            if (!$doctorModel->adminUpdateUser($userModel)) { 
                throw new Exception("Không thể cập nhật trạng thái kích hoạt User."); 
            }
            $message = ($isActive === 1) ? "Đã mở khóa tài khoản thành công." : "Đã khóa tài khoản thành công.";
            
        } elseif ($updateType === 'update_patient_details') {
            // SỬA THÔNG TIN CÁ NHÂN (users + patients)
            if (empty($data['full_name']) || empty($data['city_id']) || empty($data['phone'])) {
                if(empty($data['full_name'])){
                    throw new Exception("Thiếu các trường bắt buộc (Tên).");
                }else if(empty($data['city_id'])){
                    throw new Exception("Thiếu các trường bắt buộc (Thành phố).");
                }else{
                    throw new Exception("Thiếu các trường bắt buộc (Tên, Thành phố, SĐT).");
                }
                 
            }
            
            // 1. Cập nhật bảng USERS (full_name, city_id)
            $userModel->id = $userId;
            $userModel->full_name = $data['full_name'];
            $userModel->city_id = (int)$data['city_id'];
            $userModel->is_active = (int)$data['is_active']; // Cập nhật trạng thái
            
            if (!$doctorModel->adminUpdateUser($userModel)) { 
                 throw new Exception("Không thể cập nhật thông tin User cơ bản."); 
            }

            // 2. Cập nhật bảng PATIENTS (name, phone, address)
            $patientModel->adminUpdatePatientDetails($data);
            
            $message = "Cập nhật hồ sơ bệnh nhân thành công!";

        } else {
            http_response_code(400);
            throw new Exception("Loại hành động PUT không được hỗ trợ.");
        }

        $db->commit();

        http_response_code(200);
        echo json_encode(["message" => $message]);
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