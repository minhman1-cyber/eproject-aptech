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
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS"); 
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    http_response_code(200);
    exit();
}

header("Access-Control-Allow-Origin: $allowed_origin");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE"); 

// ==============================
// LOAD MODELS & DB
// ==============================
try {
    // Đảm bảo đường dẫn file chính xác với cấu trúc thư mục của bạn
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
// KIỂM TRA SESSION & VAI TRÒ ADMIN
// ==============================
if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'ADMIN') {
    http_response_code(401);
    echo json_encode(["message" => "Truy cập bị từ chối. Chỉ Admin mới được quản lý nội dung."]);
    exit();
}

$adminUserId = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents("php://input"), true); 

// ==============================
// GET: Lấy danh sách HOẶC Chi tiết Bài viết
// ==============================
if ($method === 'GET') {
    try {
        // [MỚI] Kiểm tra xem có tham số ID không (VD: admin_article_crud.php?id=1)
        if (isset($_GET['id'])) {
            $id = intval($_GET['id']);
            
            // Gọi hàm getById từ Model
            // Lưu ý: Bạn cần đảm bảo class MedicalArticle có method getById($id)
            $article = $articleModel->getById($id); 

            if ($article) {
                http_response_code(200);
                echo json_encode([
                    "message" => "Lấy chi tiết bài viết thành công.",
                    "data" => $article // Trả về object bài viết
                ]);
            } else {
                http_response_code(404);
                echo json_encode(["message" => "Không tìm thấy bài viết có ID: $id"]);
            }
        } 
        // Nếu không có ID => Lấy danh sách
        else {
            $articles = $articleModel->getAll();
            
            http_response_code(200);
            echo json_encode([
                "message" => "Tải danh sách bài viết thành công.",
                "data" => ["articles" => $articles]
            ]);
        }
        exit();

    } catch (Exception $e) {
        debug_exit($e);
    }
}

// ==============================
// POST / PUT / DELETE LOGIC
// ==============================

try {
    $db->beginTransaction();
    $message = "";

    if ($method === 'POST') {
        // --- THÊM MỚI BÀI VIẾT ---
        if (empty($data['title']) || empty($data['content']) || empty($data['category'])) { 
            http_response_code(400); 
            throw new Exception("Thiếu tiêu đề, nội dung hoặc thể loại."); 
        }
        
        $articleData = [
            'title' => trim($data['title']),
            'subtitle' => $data['subtitle'] ?? null,       // Map với cột subtitle
            'thumbnail' => $data['thumbnail'] ?? null,     // Map với cột thumbnail
            'content' => $data['content'],
            'category' => $data['category'],
            'status' => $data['status'] ?? 'PUBLISHED',    // Default là PUBLISHED theo DB mới
            'created_by' => $adminUserId,
        ];
        
        // Lưu ý: Model MedicalArticle cần có hàm create nhận các trường này
        if (!$articleModel->create($articleData)) {
            throw new Exception("Không thể đăng bài viết mới.");
        }
        
        $message = "Đăng bài viết mới thành công.";
        http_response_code(201); // Created
        
    } elseif ($method === 'PUT') {
        // --- SỬA BÀI VIẾT ---
        if (empty($data['id'])) { 
            http_response_code(400); 
            throw new Exception("Thiếu ID bài viết cần cập nhật."); 
        }
        
        // Chỉ cập nhật các trường được gửi lên
        $articleData = [
            'id' => (int)$data['id'],
            'title' => isset($data['title']) ? trim($data['title']) : null,
            'subtitle' => $data['subtitle'] ?? null,
            'thumbnail' => $data['thumbnail'] ?? null,
            'content' => $data['content'] ?? null,
            'category' => $data['category'] ?? null,
            'status' => $data['status'] ?? null,
        ];

        if (!$articleModel->update($articleData)) {
             throw new Exception("Không thể cập nhật bài viết (ID: {$articleData['id']}).");
        }
        
        $message = "Cập nhật bài viết thành công.";
        http_response_code(200);
        
    } elseif ($method === 'DELETE') {
        // --- XÓA BÀI VIẾT ---
        $id = $data['id'] ?? null;
        
        if (empty($id)) { 
            http_response_code(400); 
            throw new Exception("Thiếu ID bài viết để xóa."); 
        }
        
        if (!$articleModel->delete((int)$id)) {
            throw new Exception("Xóa bài viết thất bại.");
        }
        
        $message = "Xóa bài viết thành công.";
        http_response_code(200);
        
    } else {
        http_response_code(405);
        echo json_encode(["message" => "Method không được hỗ trợ."]);
        exit();
    }

    $db->commit();
    echo json_encode(["message" => $message]);
    exit();

} catch (Exception $e) {
    if ($db->inTransaction()) { $db->rollback(); }
    
    $code = $e->getCode();
    if (!is_int($code) || $code < 100 || $code > 599) {
        $code = 500;
    }
    
    http_response_code($code);
    echo json_encode(["message" => $e->getMessage()]);
    exit();
}
?>