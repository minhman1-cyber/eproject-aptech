<?php
class Patient {
    private $conn;
    private $table = 'patients';

    private $user_table = 'users'; // Thêm user table để lấy full_name

    public $user_id;
    public $name; // Thường dùng full_name từ bảng users
    public $address;
    public $phone;

    public function __construct($db) {
        $this->conn = $db;
    }

    // Hàm tạo patient (Dùng ở bước 2 của Đăng ký)
    public function create() {
        $query = "INSERT INTO " . $this->table . " 
                  SET user_id=:user_id, name=:name, address=:address, phone=:phone";
        
        $stmt = $this->conn->prepare($query);

        // Làm sạch dữ liệu và gán tham số
        $this->user_id = htmlspecialchars(strip_tags($this->user_id));
        $this->name    = htmlspecialchars(strip_tags($this->name));
        $this->address = htmlspecialchars(strip_tags($this->address));
        $this->phone   = htmlspecialchars(strip_tags($this->phone));

        $stmt->bindParam(":user_id", $this->user_id);
        $stmt->bindParam(":name", $this->name);
        $stmt->bindParam(":address", $this->address);
        $stmt->bindParam(":phone", $this->phone);

        if ($stmt->execute()) {
            return true;
        }

        return false;
    }

    // Hàm lấy dữ liệu chi tiết Patient + User
    public function getProfileByUserId($userId) {
        $query = "SELECT u.id as user_id, u.full_name, u.email, u.city_id, 
                         p.id as patient_id, p.address, p.phone, p.profile_picture
                  FROM users u
                  LEFT JOIN " . $this->table . " p ON u.id = p.user_id
                  WHERE u.id = :user_id LIMIT 0,1";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $userId);
        $stmt->execute();

        return $stmt;
    }

    // Hàm cập nhật chi tiết Patient
    public function updateDetails() {
        $query = "UPDATE " . $this->table . " 
                  SET name = :name, address = :address, phone = :phone
                  WHERE user_id = :user_id";

        $stmt = $this->conn->prepare($query);

        $this->user_id = htmlspecialchars(strip_tags($this->user_id));
        $this->name    = htmlspecialchars(strip_tags($this->name));
        $this->address = htmlspecialchars(strip_tags($this->address));
        $this->phone   = htmlspecialchars(strip_tags($this->phone));

        $stmt->bindParam(":user_id", $this->user_id);
        $stmt->bindParam(":name", $this->name);
        $stmt->bindParam(":address", $this->address);
        $stmt->bindParam(":phone", $this->phone);

        if ($stmt->execute()) {
            return true;
        }
        return false;
    }
    
    // Hàm cập nhật Avatar
    public function updateAvatar($userId, $profilePictureUrl) {
        $query = "UPDATE " . $this->table . " 
                  SET profile_picture = :profile_picture 
                  WHERE user_id = :user_id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":profile_picture", $profilePictureUrl);
        $stmt->bindParam(":user_id", $userId);

        if ($stmt->execute()) {
            return true;
        }
        return false;
    }

    // HÀM MỚI: Lấy ID chính của Patient từ User ID
    public function getIdByUserId($userId) {
        $query = "SELECT id FROM " . $this->table . " WHERE user_id = :user_id LIMIT 1";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $userId);
        $stmt->execute();
        
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? (int)$row['id'] : null;
    }

    // HÀM MỚI: Lấy chi tiết bệnh nhân dựa trên mảng IDs (ĐÃ THÊM)
    public function getPatientDetailsByIds(array $patientIds) {
        if (empty($patientIds)) return [];
        
        $placeholders = implode(',', array_fill(0, count($patientIds), '?'));
        
        // Truy vấn bảng users để lấy full_name, vì full_name thường là thông tin hiển thị
        $query = "SELECT p.id, u.full_name, p.user_id 
                  FROM " . $this->table . " p
                  JOIN " . $this->user_table . " u ON p.user_id = u.id
                  WHERE p.id IN ({$placeholders})";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute($patientIds);
        
        // Trả về mảng key-value (patient_id => details)
        $details = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $result = [];
        foreach ($details as $detail) {
            $result[$detail['id']] = $detail;
        }
        return $result;
    }

    public function getPatientDetailsById($patientId) {
        // Truy vấn LEFT JOIN giữa users và patients để lấy thông tin chi tiết
        $query = "
            SELECT 
                u.id as user_id, 
                u.full_name, 
                u.email, 
                u.city_id,
                u.is_active as user_is_active,
                p.phone,
                p.address,
                p.profile_picture
            FROM " . $this->user_table . " u
            LEFT JOIN " . $this->table . " p ON u.id = p.user_id
            WHERE p.id = :patient_id AND u.role = 'PATIENT'
            LIMIT 1";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':patient_id', $patientId);
        
        if (!$stmt->execute()) {
             return false;
        }
        
        // Trả về một bản ghi duy nhất
        return $stmt;
    }

    // HÀM MỚI: Lấy chi tiết đầy đủ Patient (User + Patient Details)
    public function getPatientFullDetails($userId) {
        // Truy vấn LEFT JOIN giữa users và patients để lấy thông tin chi tiết
        $query = "
            SELECT 
                u.id as user_id, 
                u.full_name, 
                u.email, 
                u.city_id,
                u.is_active as user_is_active,
                p.phone,
                p.address,
                p.profile_picture
            FROM " . $this->user_table . " u
            LEFT JOIN " . $this->table . " p ON u.id = p.user_id
            WHERE u.id = :user_id AND u.role = 'PATIENT'
            LIMIT 1";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $userId);
        
        if (!$stmt->execute()) {
             return false;
        }
        
        // Trả về một bản ghi duy nhất
        return $stmt;
    }

    // Hàm MỚI: Lấy danh sách tất cả Patient (cho Admin)
    public function getAllPatientsForAdmin() {
        $query = "
            SELECT 
                u.id as user_id, 
                u.full_name, 
                u.email, 
                u.city_id,
                u.is_active as user_is_active,
                p.phone,
                p.address
            FROM " . $this->user_table . " u
            LEFT JOIN " . $this->table . " p ON u.id = p.user_id
            WHERE u.role = 'PATIENT'
            ORDER BY u.id DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt;
    }
    
    // HÀM MỚI: Cập nhật thông tin chi tiết Patient (Cho Admin)
    public function adminUpdatePatientDetails($data) {
        // Cần UPDATE hoặc INSERT nếu chưa có bản ghi patient chi tiết (dù User có)
        // Vì Admin đang sửa, ta giả định bản ghi Patient đã tồn tại
        $query = "UPDATE " . $this->table . " 
                  SET name = :full_name, phone = :phone, address = :address
                  WHERE user_id = :user_id";
        
        $stmt = $this->conn->prepare($query);
        
        $stmt->bindParam(":full_name", $data['full_name']);
        $stmt->bindParam(":phone", $data['phone']);
        $stmt->bindParam(":address", $data['address']);
        $stmt->bindParam(":user_id", $data['userId']);

        return $stmt->execute();
    }
}