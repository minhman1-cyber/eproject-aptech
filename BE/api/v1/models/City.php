<?php
class City {
    private $conn;
    private $table = 'cities';

    public $id;
    public $name;

    public function __construct($db) {
        $this->conn = $db;
    }

    // GET: Lấy tất cả thành phố
    public function getAll() {
        $query = "SELECT id, name FROM " . $this->table . " ORDER BY name";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // POST: Thêm thành phố mới
    public function create($name) {
        $query = "INSERT INTO " . $this->table . " SET name = :name";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":name", $name);
        try {
            return $stmt->execute();
        } catch (PDOException $e) {
            // Lỗi trùng lặp UNIQUE (name)
            if ($e->getCode() == 23000) {
                 throw new Exception("Tên thành phố này đã tồn tại.");
            }
            throw $e;
        }
    }

    // PUT: Sửa tên thành phố
    public function update($id, $name) {
        $query = "UPDATE " . $this->table . " SET name = :name WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":name", $name);
        $stmt->bindParam(":id", $id);
        try {
            return $stmt->execute();
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) {
                 throw new Exception("Tên thành phố này đã tồn tại.");
            }
            throw $e;
        }
    }

    // DELETE: Xóa thành phố
    public function delete($id) {
        $query = "DELETE FROM " . $this->table . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        try {
            return $stmt->execute();
        } catch (PDOException $e) {
            // Lỗi khóa ngoại (1451) nếu thành phố đang được sử dụng
            if ($e->getCode() == 23000) {
                 throw new Exception("Không thể xóa. Thành phố này đang được sử dụng bởi Bác sĩ/Người dùng.");
            }
            throw $e;
        }
    }
}