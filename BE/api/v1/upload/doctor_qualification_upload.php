<?php
// Bắt đầu Output Buffering để bắt mọi lỗi/cảnh báo PHP
ob_start();
session_start();

// ==============================
// HÀM DEBUG & BẮT LỖI JSON
// ==============================
function debug_exit($e = null) {
    // Lấy nội dung buffer hiện tại (chứa PHP Warnings, Notices, hoặc echo thừa)
    $buffer = ob_get_contents();
    ob_end_clean(); 

    header("Content-Type: application/json; charset=UTF-8");
    http_response_code(500);

    $response = [
        "message" => "Lỗi hệ thống! Vui lòng kiểm tra log.",
        "debug_output" => trim($buffer), // <<< Trim nội dung debug
        "exception" => $e ? $e->getMessage() : null
    ];

    if ($e && $e instanceof PDOException) {
        $response['message'] = "Lỗi Database: " . $e->getMessage() . " (Code: " . $e->getCode() . ")";
    } else if ($e) {
         $response['message'] = "Lỗi hệ thống: " . $e->getMessage();
    }

    echo json_encode($response);
    exit;
}

// ==============================
// CẤU HÌNH CORS
// ==============================
$allowed_origin = 'http://localhost:5173'; // Cổng frontend
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

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/Doctor.php'; 
require_once __DIR__ . '/../models/Qualification.php'; 

// ===================================
// KIỂM TRA LỖI UPLOAD NGAY TỪ ĐẦU (MỚI)
// ===================================
// Kiểm tra lỗi PHP upload cơ bản trước khi load DB/Model
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_SERVER['CONTENT_TYPE'] && strpos($_SERVER['CONTENT_TYPE'], 'multipart/form-data') !== false) {
    if (empty($_FILES)) {
        // Kiểm tra lỗi cấp Server/cấu hình PHP (post_max_size, file size)
        if ($_SERVER['CONTENT_LENGTH'] > 0 && $_SERVER['CONTENT_LENGTH'] > ini_get('post_max_size')) {
            http_response_code(400);
            echo json_encode(["message" => "Lỗi: Kích thước dữ liệu gửi lên (post_max_size) vượt quá giới hạn Server. Hiện tại là " . ini_get('post_max_size')]);
            exit();
        }
    }
}

// ==============================
// KIỂM TRA SESSION LOGIN (DOCTOR)
// ==============================
if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'DOCTOR') {
    http_response_code(401);
    echo json_encode(["message" => "Truy cập bị từ chối. Vui lòng đăng nhập với vai trò Bác sĩ."]);
    exit();
}

$userId = $_SESSION['user_id'];

// ==============================
// KẾT NỐI DB & KHỞI TẠO MODEL
// ==============================
try {
    $database = new Database();
    $db = $database->getConnection();
    if (!$db) {
         throw new Exception("Lỗi kết nối database.");
    }
    $doctor = new Doctor($db);
    $qualification = new Qualification($db);
} catch (Exception $e) {
    debug_exit($e);
}

// ===================================
// CHỈ XỬ LÝ POST
// ===================================
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["message" => "Method không được hỗ trợ."]);
    exit;
}

// ===================================
// LẤY VÀ KIỂM TRA DỮ LIỆU FORM
// ===================================
$title = $_POST['title'] ?? null;
$institution = $_POST['institution'] ?? null;
$year = $_POST['year'] ?? null;

if (empty($title) || empty($institution) || empty($year)) {
    http_response_code(400);
    echo json_encode(["message" => "Vui lòng điền đầy đủ Tên bằng cấp, Tổ chức và Năm hoàn thành."]);
    exit();
}

// ===================================
// TẢI FILE BẰNG CẤP
// ===================================
$upload_dir = __DIR__ . '/../uploads/qualifications/'; // Đường dẫn thư mục lưu file
$public_url_base = 'http://localhost:8888/api/v1/uploads/qualifications/'; // URL công khai

if (empty($_FILES['qualification_document'])) {
    http_response_code(400);
    echo json_encode(array("message" => "Không có file bằng cấp nào được gửi lên."));
    exit();
}

$file = $_FILES['qualification_document'];
$max_size = 10 * 1024 * 1024; // 10 MB
$allowed_types = ['application/pdf', 'image/jpeg', 'image/png'];

if ($file['error'] !== 0) {
    http_response_code(500);
    echo json_encode(array("message" => "Lỗi tải file (Code: {$file['error']})."));
    exit();
}
if ($file['size'] > $max_size) {
    http_response_code(400);
    echo json_encode(array("message" => "Kích thước file vượt quá 10MB."));
    exit();
}
if (!in_array($file['type'], $allowed_types)) {
    http_response_code(400);
    echo json_encode(array("message" => "Định dạng file không hợp lệ. Chỉ chấp nhận PDF, JPG, PNG."));
    exit();
}

// 1. Lấy doctor_id
try {
    $doctorProfileStmt = $doctor->getProfileByUserId($userId);
    if ($doctorProfileStmt->rowCount() === 0) {
        throw new Exception("Không tìm thấy hồ sơ bác sĩ chi tiết.");
    }
    $doctorRow = $doctorProfileStmt->fetch(PDO::FETCH_ASSOC);
    $doctorId = $doctorRow['doctor_id'];
} catch (Exception $e) {
    debug_exit($e);
}

// 2. Tạo tên file duy nhất và đường dẫn
$file_extension = pathinfo($file['name'], PATHINFO_EXTENSION);
$file_name = "qual_" . $doctorId . "_" . time() . "." . $file_extension;
$target_file = $upload_dir . $file_name;
$new_document_url = $public_url_base . $file_name;

// 3. Di chuyển file vào thư mục cố định
if (move_uploaded_file($file['tmp_name'], $target_file)) {
    
    // 4. Cập nhật vào Database
    $db->beginTransaction();

    try {
        $qualification->doctor_id = $doctorId;
        $qualification->title = $title;
        $qualification->institution = $institution;
        $qualification->year_completed = $year;
        $qualification->document_url = $new_document_url;
        
        if (!$qualification->create()) {
            throw new Exception("Lỗi DB: Không thể lưu thông tin bằng cấp.");
        }
        
        $db->commit();
        
        http_response_code(200);
        echo json_encode(array(
            "message" => "Bằng cấp đã được tải lên thành công và đang chờ xác minh.",
            "data" => [
                // Trả về dữ liệu cần thiết cho Frontend để cập nhật State
                "title" => $title,
                "institution" => $institution,
                "year" => (int)$year,
                "document_url" => $new_document_url,
                "is_verified" => 0, // Mặc định là chưa xác minh
                // Lưu ý: ID của bản ghi mới sẽ cần được trả về nếu bạn muốn xóa/cập nhật sau này.
                // Hiện tại, ta giả định ID được tạo tự động bởi DB.
            ]
        ));
        exit();
    } catch (Exception $e) {
        if ($db->inTransaction()) { $db->rollback(); }
        // Nếu DB lỗi, xóa file đã tải lên
        if (file_exists($target_file)) { unlink($target_file); }
        debug_exit($e);
    }
    
} else {
    http_response_code(500);
    echo json_encode(array("message" => "Lỗi Server: Không thể lưu file bằng cấp vào thư mục (Kiểm tra quyền ghi)."));
}

ob_end_clean();
exit();