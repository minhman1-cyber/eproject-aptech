<?php
class MedicalArticle {
    private $conn;
    private $table = 'medical_articles';
    private $user_table = 'users';

    public $id;
    public $title;
    public $content;
    public $category;
    public $created_by;
    // status (Ẩn/Hiện) sẽ được quản lý bằng một trường mới hoặc logic khác nếu cần,
    // nhưng hiện tại ta dùng logic xóa mềm (soft-delete) nếu cần.

    public function __construct($db) {
        $this->conn = $db;
    }

    // GET: Lấy tất cả bài viết cho Admin
    public function getAll() {
        $query = "SELECT ma.id, ma.title, ma.content, ma.category, ma.created_at, u.full_name AS author_name
                  FROM " . $this->table . " ma
                  LEFT JOIN " . $this->user_table . " u ON ma.created_by = u.id
                  ORDER BY ma.created_at DESC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    // POST: Thêm bài viết mới
    public function create($data) {
        $query = "INSERT INTO " . $this->table . " 
                  SET title=:title, content=:content, category=:category, created_by=:created_by";
        
        $stmt = $this->conn->prepare($query);
        
        $stmt->bindParam(":title", $data['title']);
        $stmt->bindParam(":content", $data['content']);
        $stmt->bindParam(":category", $data['category']);
        $stmt->bindParam(":created_by", $data['created_by']);

        return $stmt->execute();
    }

    // PUT: Sửa bài viết
    public function update($data) {
        $query = "UPDATE " . $this->table . " 
                  SET title=:title, content=:content, category=:category, updated_at=NOW()
                  WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);
        
        $stmt->bindParam(":id", $data['id']);
        $stmt->bindParam(":title", $data['title']);
        $stmt->bindParam(":content", $data['content']);
        $stmt->bindParam(":category", $data['category']);

        return $stmt->execute();
    }

    // DELETE: Xóa bài viết
    public function delete($id) {
        $query = "DELETE FROM " . $this->table . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        return $stmt->execute();
    }
}