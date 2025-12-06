<?php
class User {
    private $conn;
    private $table = 'users';

    public $id;
    public $full_name;
    public $email;
    public $password; // Cần HASH trước khi lưu!
    public $role;
    public $city_id;

    public function __construct($db) {
        $this->conn = $db;
    }

    // Hàm kiểm tra email tồn tại
    public function emailExists() {
        $query = "SELECT id, full_name, password, role, is_active FROM " . $this->table . " WHERE email = ? LIMIT 0,1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $this->email);
        $stmt->execute();
        
        return $stmt; // Trả về statement để kiểm tra và lấy dữ liệu
    }

    // Hàm tạo user mới (Dùng cho cả Doctor và Patient ở bước 1)
    public function create() {
        $query = "INSERT INTO " . $this->table . " 
                  SET full_name=:full_name, email=:email, password=:password, 
                      role=:role, city_id=:city_id";
        
        $stmt = $this->conn->prepare($query);

        // Làm sạch dữ liệu và gán tham số
        $this->full_name = htmlspecialchars(strip_tags($this->full_name));
        $this->email     = htmlspecialchars(strip_tags($this->email));
        // Mật khẩu PHẢI được mã hóa trước khi gán
        $password_hash   = password_hash($this->password, PASSWORD_BCRYPT);
        $this->role      = htmlspecialchars(strip_tags($this->role));
        $this->city_id   = htmlspecialchars(strip_tags($this->city_id));

        $stmt->bindParam(":full_name", $this->full_name);
        $stmt->bindParam(":email", $this->email);
        $stmt->bindParam(":password", $password_hash);
        $stmt->bindParam(":role", $this->role);
        $stmt->bindParam(":city_id", $this->city_id);

        if ($stmt->execute()) {
            $this->id = $this->conn->lastInsertId(); // Lấy ID vừa tạo
            return true;
        }

        return false;
    }
    // Hàm cập nhật thông tin chung (tên, thành phố)
    public function updateProfile() {
        $query = "UPDATE " . $this->table . " 
                  SET full_name = :full_name, city_id = :city_id, updated_at = NOW()
                  WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);

        $this->id        = htmlspecialchars(strip_tags($this->id));
        $this->full_name = htmlspecialchars(strip_tags($this->full_name));
        $this->city_id   = htmlspecialchars(strip_tags($this->city_id));

        $stmt->bindParam(":id", $this->id);
        $stmt->bindParam(":full_name", $this->full_name);
        $stmt->bindParam(":city_id", $this->city_id);

        if ($stmt->execute()) {
            return true;
        }
        return false;
    }

    // HÀM MỚI: Cập nhật thông tin User cơ bản (Admin)
    public function adminUpdateUser($data) {
        $query = "UPDATE " . $this->table . " 
                  SET full_name = :full_name, city_id = :city_id, is_active = :is_active 
                  WHERE id = :id AND role = 'PATIENT'"; // Thêm điều kiện role cho an toàn
        
        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(":id", $data['userId']);
        $stmt->bindParam(":full_name", $data['full_name']);
        $stmt->bindParam(":city_id", $data['city_id']);
        $stmt->bindParam(":is_active", $data['is_active']);

        return $stmt->execute();
    }

    // Hàm mới: Lấy mật khẩu hash hiện tại và role
    public function getCredentials() {
        $query = "SELECT password, role FROM " . $this->table . " WHERE id = :id LIMIT 1";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $this->id);
        $stmt->execute();
        
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // HÀM MỚI: Đổi mật khẩu
    public function changePassword($newPassword) {
        $query = "UPDATE " . $this->table . " 
                  SET password = :password_hash, updated_at = NOW() 
                  WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);
        
        // Hash mật khẩu mới trước khi lưu
        $password_hash = password_hash($newPassword, PASSWORD_DEFAULT);
        
        $stmt->bindParam(":password_hash", $password_hash);
        $stmt->bindParam(":id", $this->id);

        return $stmt->execute();
    }
}