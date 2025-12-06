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
$allowed_origin = 'http://localhost:5173'; // Giả định Frontend chạy ở 5173
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
    require_once '../models/Doctor.php'; 
    
    $database = new Database();
    $db = $database->getConnection();
    if (!$db) { throw new Exception("Lỗi kết nối database."); }

    $doctorModel = new Doctor($db);
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

// ===================================
// POST: Tìm kiếm Doctor
// ===================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true); 
    
    // Kiểm tra dữ liệu bắt buộc từ Frontend
    if (empty($data['cityId']) || empty($data['specializationId']) || empty($data['appointmentDate'])) {
        http_response_code(400);
        echo json_encode(["message" => "Thiếu tiêu chí tìm kiếm (Thành phố, Chuyên khoa, Ngày khám)."]);
        exit();
    }
    
    try {
        // Gọi hàm tìm kiếm trong Model Doctor
        $stmt = $doctorModel->searchAvailableDoctors(
            $data['cityId'],
            $data['specializationId'],
            $data['appointmentDate']
        );
        
        $doctors_list = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Chuẩn bị dữ liệu trả về Frontend
        $mapped_doctors = array_map(function($doc) {
            return [
                "user_id" => (int)$doc['user_id'],
                "doctor_id" => (int)$doc['doctor_id'],
                "full_name" => $doc['full_name'],
                "qualification" => $doc['qualification'],
            ];
        }, $doctors_list);

        http_response_code(200);
        echo json_encode([
            "message" => "Tìm kiếm thành công.",
            "data" => ["doctors" => $mapped_doctors]
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