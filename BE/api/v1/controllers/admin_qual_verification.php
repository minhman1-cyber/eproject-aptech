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
    
    $database = new Database();
    $db = $database->getConnection();
    if (!$db) { throw new Exception("Lỗi kết nối database."); }

    $doctorModel = new Doctor($db);
} catch (Exception $e) {
    debug_exit($e);
}

// ===================================
// KIỂM TRA SESSION & VAI TRÒ ADMIN
// ===================================
if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'ADMIN') {
    http_response_code(401);
    echo json_encode(["message" => "Truy cập bị từ chối. Chỉ Admin mới được quản lý xác minh."]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

// ===================================
// GET: Lấy danh sách bằng cấp CHỜ DUYỆT (Có thể tìm kiếm)
// ===================================
if ($method === 'GET') {
    try {
        $searchTerm = $_GET['search'] ?? null;
        
        $stmt = $doctorModel->getPendingQualifications($searchTerm);
        $qualifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

        http_response_code(200);
        echo json_encode([
            "message" => "Tải danh sách bằng cấp thành công.",
            "data" => ["qualifications" => $qualifications]
        ]);
        exit();

    } catch (Exception $e) {
        debug_exit($e);
    }
}

// ===================================
// PUT: Xác minh hoặc Từ chối bằng cấp
// ===================================
if ($method === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true); 
    
    $qualId = $data['id'] ?? null;
    $status = $data['status'] ?? null; // 1 (ACCEPTED) hoặc -1 (REJECTED)

    if (empty($qualId) || !isset($status)) {
        http_response_code(400);
        echo json_encode(["message" => "Thiếu ID bằng cấp hoặc trạng thái xác minh."]);
        exit();
    }
    
    // Đảm bảo trạng thái là số hợp lệ
    $status = (int)$status;
    if ($status !== 1 && $status !== -1) {
         http_response_code(400);
         echo json_encode(["message" => "Trạng thái không hợp lệ. Chỉ chấp nhận 1 (Duyệt) hoặc -1 (Từ chối)."]);
         exit();
    }

    try {
        $db->beginTransaction();

        // 1. Cập nhật trạng thái trong DB
        if (!$doctorModel->verifyQualification((int)$qualId, $status)) {
             throw new Exception("Không thể cập nhật trạng thái bằng cấp.");
        }

        $db->commit();
        $message = ($status === 1) ? "Đã xác minh (ACCEPTED) thành công." : "Đã từ chối (REJECTED) thành công.";

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