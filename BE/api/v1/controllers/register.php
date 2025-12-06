<?php

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
$allowed_origin = 'http://localhost:5173';
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: " . $allowed_origin);
    header("Access-Control-Allow-Credentials: true"); 
    header("Access-Control-Allow-Methods: POST, GET, OPTIONS"); 
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
    http_response_code(200);
    exit(); // Dừng xử lý sau Preflight
}
header("Access-Control-Allow-Origin: " . $allowed_origin);
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/Patient.php';
require_once __DIR__ . '/../models/Doctor.php';

$database = new Database();
$db = $database->getConnection();
$user = new User($db);
$patient = new Patient($db);

$doctor = new Doctor($db);

 // Khởi tạo Model Doctor

$data = json_decode(file_get_contents("php://input"));

// 1. Kiểm tra dữ liệu cơ bản
if (empty($data->email) || empty($data->password) || empty($data->full_name) || empty($data->role)) {
    http_response_code(400);
    echo json_encode(array("message" => "Vui lòng điền đủ thông tin cơ bản: Tên, Email, Mật khẩu, Vai trò."));
    return;
}


// 2. Kiểm tra Email đã tồn tại chưa
$user->email = $data->email;
if ($user->emailExists()->rowCount() > 0) {
    http_response_code(400);
    echo json_encode(array("message" => "Email đã được đăng ký."));
    return;
}


// 3. Tạo User cơ bản
$user->full_name = $data->full_name;
$user->password  = $data->password; // Model sẽ hash
$user->role      = strtoupper($data->role); 
$user->city_id   = $data->city_id ?? 1; 
if ($user->create()) {
    $new_user_id = $user->id; 
    $success = false;

    // Bắt đầu giao dịch (Transaction)
    $db->beginTransaction();

    try {
        // 4. Tạo thông tin chi tiết dựa trên Role
        if ($user->role === 'PATIENT') {
            // Logic tạo Patient
            $patient->user_id = $new_user_id;
            $patient->name    = $data->full_name; 
            $patient->address = $data->patient_address ?? null;
            $patient->phone   = $data->patient_phone ?? null;

            if ($patient->create()) {
                $message = "Đăng ký Bệnh nhân thành công.";
                $success = true;
            } else {
                throw new Exception("Lỗi hệ thống khi tạo chi tiết Bệnh nhân.");
            }
        } 
        
        elseif ($user->role === 'DOCTOR') { 
            // Logic tạo Doctor và Specializations
            $city_id_value = isset($data->city_id) ? (int)$data->city_id : null;
            // Kiểm tra các trường bắt buộc cho Doctor
            if (empty($data->doctor_phone) || empty($data->doctor_qualification) || empty($data->city_id)) {
                 throw new Exception("Vui lòng nhập đủ thông tin chi tiết cho Bác sĩ (Phone, Qualification, City ID).");
            }
            
            $doctor->user_id       = $new_user_id;
            $doctor->phone         = $data->doctor_phone;
            $doctor->name          = $data->full_name; // <<< THÊM: Gán tên
            $doctor->qualification = $data->doctor_qualification; // Bằng cấp chính
            $doctor->bio           = $data->doctor_bio ?? '';
            $doctor->city_id       = $city_id_value;

            if ($doctor->create()) {
                $doctor_id = $db->lastInsertId(); // Lấy doctor_id vừa tạo
                
                // Thêm chuyên khoa (doctor_specializations)
                $specialization_ids = $data->specialization_ids ?? [];
                
                if ($doctor->addSpecializations($doctor_id, $specialization_ids)) {
                    $message = "Đăng ký Bác sĩ thành công. Tài khoản đang chờ duyệt.";
                    $success = true;
                } else {
                    throw new Exception("Lỗi hệ thống khi thêm chuyên khoa.");
                }
            } else {
                throw new Exception("Lỗi hệ thống khi tạo chi tiết Bác sĩ.");
            }
        } 
        
        else {
            // Vai trò ADMIN hoặc role không xác định
            $message = "Đăng ký User thành công (Vai trò không yêu cầu chi tiết).";
            $success = true;
        }

        // Hoàn tất Transaction
        $db->commit();
        
    } catch (Exception $e) {
        // Nếu có bất kỳ lỗi nào, thực hiện Rollback
        if ($db->inTransaction()) {
            $db->rollBack();
        }

        // Cần xóa User đã tạo nếu lỗi xảy ra sau khi User được tạo thành công
        $delete_user_query = "DELETE FROM users WHERE id = :id";
        $delete_stmt = $db->prepare($delete_user_query);
        $delete_stmt->bindParam(":id", $new_user_id);
        $delete_stmt->execute();

        http_response_code(500);
        echo json_encode(array("message" => "Đăng ký thất bại: " . $e->getMessage(), "error" => true));
        return;
    }


    // Phản hồi thành công
    if ($success) {
        http_response_code(201);
        echo json_encode(array("message" => $message, "user_id" => $new_user_id));
    }

} else {
    // Lỗi khi tạo User cơ bản
    http_response_code(503);
    echo json_encode(array("message" => "Không thể tạo tài khoản User."));
}
?>