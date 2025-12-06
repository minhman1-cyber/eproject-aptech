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
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS"); // Mở tất cả CRUD
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    http_response_code(200);
    exit();
}

header("Access-Control-Allow-Origin: $allowed_origin");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE"); 

// ===================================
// LOAD MODELS & DB
// ===================================
try {
    require_once '../config/database.php';
    require_once '../models/City.php'; 
    
    $database = new Database();
    $db = $database->getConnection();
    if (!$db) { throw new Exception("Lỗi kết nối database."); }

    $cityModel = new City($db);
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

$method = $_SERVER['REQUEST_METHOD'];

// ===================================
// GET: Lấy danh sách Thành phố
// ===================================
if ($method === 'GET') {
    try {
        $cities = $cityModel->getAll();

        http_response_code(200);
        echo json_encode([
            "message" => "Tải danh sách thành phố thành công.",
            "data" => ["cities" => $cities]
        ]);
        exit();

    } catch (Exception $e) {
        debug_exit($e);
    }
}

// ===================================
// POST / PUT / DELETE LOGIC
// ===================================

// Đọc dữ liệu từ input (chỉ cần cho POST/PUT/DELETE)
$data = json_decode(file_get_contents("php://input"), true); 
$name = trim($data['name'] ?? '');
$id = (int)($data['id'] ?? 0);

try {
    $db->beginTransaction();
    $message = "";

    if ($method === 'POST') {
        // THÊM MỚI
        if (empty($name)) { throw new Exception("Tên thành phố không được để trống."); }
        if (!$cityModel->create($name)) {
            throw new Exception("Không thể thêm thành phố mới.");
        }
        $message = "Thêm thành phố mới thành công.";
        
    } elseif ($method === 'PUT') {
        // SỬA
        if ($id <= 0 || empty($name)) { throw new Exception("Thiếu ID hoặc Tên thành phố để cập nhật."); }
        if (!$cityModel->update($id, $name)) {
             throw new Exception("Không thể cập nhật thành phố.");
        }
        $message = "Cập nhật thành phố thành công.";
        
    } elseif ($method === 'DELETE') {
        // XÓA
        if ($id <= 0) { throw new Exception("Thiếu ID thành phố để xóa."); }
        if (!$cityModel->delete($id)) {
            throw new Exception("Xóa thành phố thất bại.");
        }
        $message = "Xóa thành phố thành công.";
    }

    $db->commit();
    http_response_code(200);
    echo json_encode(["message" => $message]);
    exit();

} catch (Exception $e) {
    if ($db->inTransaction()) { $db->rollback(); }
    
    // Ghi đè lỗi 500 nếu là lỗi Bad Request/Conflict/Not Found
    if ($e->getCode() === 400 || $e->getCode() === 409 || $e->getCode() === 404) {
         http_response_code($e->getCode());
         echo json_encode(["message" => $e->getMessage()]);
         exit();
    }
    
    debug_exit($e);
}