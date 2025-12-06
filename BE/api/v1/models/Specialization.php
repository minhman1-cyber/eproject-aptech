<?php
class Specialization {
    private $conn;
    private $table = 'specializations';

    public $id;
    public $name;

    public function __construct($db) {
        $this->conn = $db;
    }

    // Hàm lấy tất cả chuyên khoa (được sử dụng bởi DoctorManager Controller)
    public function getAll() {
        $query = "SELECT id, name FROM " . $this->table . " ORDER BY name";
        
        $stmt = $this->conn->prepare($query);
        
        if (!$stmt->execute()) {
            // Trả về false nếu có lỗi truy vấn
            return false;
        }
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
