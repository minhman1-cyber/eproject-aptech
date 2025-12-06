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
    header("Access-Control-Allow-Methods: GET, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    http_response_code(200);
    exit();
}

header("Access-Control-Allow-Origin: $allowed_origin");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET"); 

// ===================================
// LOAD MODELS & DB
// ===================================
try {
    // Không cần kiểm tra vai trò, chỉ cần người dùng đã đăng nhập (hoặc không)
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
// GET: Lấy danh sách Bài viết
// ===================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // Hàm getAll() đã được định nghĩa để lấy tên tác giả
        $articles = $articleModel->getAll(); 
        
        // Cần lấy danh sách categories (Giả định lấy từ một nguồn cố định nếu không có bảng categories riêng)
        $categories = [
            ['value' => 'NEWS', 'label' => 'Tin tức Y tế'],
            ['value' => 'DISEASE', 'label' => 'Bệnh lý'],
            ['value' => 'PREVENTION', 'label' => 'Phòng bệnh'],
            ['value' => 'CURE', 'label' => 'Cách chữa'],
        ];

        http_response_code(200);
        echo json_encode([
            "message" => "Tải danh sách bài viết thành công.",
            "data" => [
                "articles" => $articles,
                "categories" => $categories
            ]
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