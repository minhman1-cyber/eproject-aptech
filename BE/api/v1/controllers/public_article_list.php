<?php
// Bắt đầu Output Buffering
ob_start(); 
session_start();

// ==============================
// HÀM DEBUG & BẮT LỖI JSON
// ==============================
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

// ==============================
// LOAD MODELS & DB
// ==============================
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

// ==============================
// GET: Lấy danh sách Bài viết Public
// ==============================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // Lấy danh sách bài viết ĐÃ XUẤT BẢN (PUBLISHED)
        // Kèm theo các trường mới: thumbnail, subtitle
        $articles = $articleModel->getPublished(); 
        
        // Danh sách categories cố định (hoặc lấy từ DB nếu có bảng riêng)
        $categories = [
            ['value' => 'NEWS', 'label' => 'Tin tức Y tế'],
            ['value' => 'DISEASE', 'label' => 'Bệnh lý'],
            ['value' => 'PREVENTION', 'label' => 'Phòng bệnh'],
            ['value' => 'CURE', 'label' => 'Điều trị'],
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

// ==============================
// DEFAULT
// ==============================
http_response_code(405);
echo json_encode(["message" => "Method không được hỗ trợ."]);
exit;