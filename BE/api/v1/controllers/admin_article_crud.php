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
    require_once '../models/MedicalArticle.php'; 
    
    $database = new Database();
    $db = $database->getConnection();
    if (!$db) { throw new Exception("Lỗi kết nối database."); }

    $articleModel = new MedicalArticle($db);
} catch (Exception $e) {
    debug_exit($e);
}

// ===================================
// KIỂM TRA SESSION & VAI TRÒ ADMIN
// ===================================
if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'ADMIN') {
    http_response_code(401);
    echo json_encode(["message" => "Truy cập bị từ chối. Chỉ Admin mới được quản lý nội dung."]);
    exit();
}

$adminUserId = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents("php://input"), true); 

// ===================================
// GET: Lấy danh sách Bài viết
// ===================================
if ($method === 'GET') {
    try {
        $articles = $articleModel->getAll();

        http_response_code(200);
        echo json_encode([
            "message" => "Tải danh sách bài viết thành công.",
            "data" => ["articles" => $articles]
        ]);
        exit();

    } catch (Exception $e) {
        debug_exit($e);
    }
}

// ===================================
// POST / PUT / DELETE LOGIC
// ===================================

try {
    $db->beginTransaction();
    $message = "";

    if ($method === 'POST') {
        // THÊM MỚI BÀI VIẾT
        if (empty($data['title']) || empty($data['content']) || empty($data['category'])) { 
            http_response_code(400); 
            throw new Exception("Thiếu tiêu đề, nội dung hoặc thể loại."); 
        }
        
        $articleData = [
            'title' => trim($data['title']),
            'content' => $data['content'],
            'category' => $data['category'],
            'created_by' => $adminUserId, // Lấy ID Admin từ Session
        ];
        
        if (!$articleModel->create($articleData)) {
            throw new Exception("Không thể đăng bài viết mới.");
        }
        $message = "Đăng bài viết mới thành công.";
        http_response_code(201); // Created
        
    } elseif ($method === 'PUT') {
        // SỬA BÀI VIẾT
        if (empty($data['id']) || empty($data['title']) || empty($data['content']) || empty($data['category'])) { 
            http_response_code(400); 
            throw new Exception("Thiếu ID, tiêu đề, nội dung hoặc thể loại để cập nhật."); 
        }
        
        $articleData = [
            'id' => (int)$data['id'],
            'title' => trim($data['title']),
            'content' => $data['content'],
            'category' => $data['category'],
        ];

        if (!$articleModel->update($articleData)) {
             throw new Exception("Không thể cập nhật bài viết (ID: {$articleData['id']}).");
        }
        $message = "Cập nhật bài viết thành công.";
        http_response_code(200);
        
    } elseif ($method === 'DELETE') {
        // XÓA BÀI VIẾT
        if (empty($data['id'])) { 
            http_response_code(400); 
            throw new Exception("Thiếu ID bài viết để xóa."); 
        }
        
        $articleId = (int)$data['id'];
        
        if (!$articleModel->delete($articleId)) {
            throw new Exception("Xóa bài viết thất bại.");
        }
        $message = "Xóa bài viết thành công.";
        http_response_code(200);
    } else {
        // Nếu không phải GET, POST, PUT, DELETE
        http_response_code(405);
        echo json_encode(["message" => "Method không được hỗ trợ."]);
        exit();
    }

    $db->commit();
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

// Script sẽ không bao giờ chạy đến đây