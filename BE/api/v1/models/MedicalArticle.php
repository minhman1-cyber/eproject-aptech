<?php
class MedicalArticle {
    private $conn;
    private $table = 'medical_articles';
    private $users_table = 'users'; // Để join lấy tên tác giả

    public function __construct($db) {
        $this->conn = $db;
    }

    // 1. Lấy tất cả bài viết (Dành cho Admin - Xem cả Draft và Published)
    public function getAll() {
        $query = "SELECT a.id, a.title, a.thumbnail, a.subtitle, a.category, a.status, a.created_at, 
                         u.full_name as author_name
                  FROM " . $this->table . " a
                  LEFT JOIN " . $this->users_table . " u ON a.created_by = u.id
                  ORDER BY a.created_at DESC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // 2. Lấy bài viết công khai (Dành cho Public/Patient - Chỉ xem Published)
    public function getPublished() {
        $query = "SELECT a.id, a.title, a.thumbnail, a.subtitle, a.content, a.category, a.created_at, 
                         u.full_name as author_name
                  FROM " . $this->table . " a
                  LEFT JOIN " . $this->users_table . " u ON a.created_by = u.id
                  WHERE a.status = 'PUBLISHED'
                  ORDER BY a.created_at DESC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // [MỚI] 3. Lấy chi tiết bài viết theo ID
    public function getById($id) {
        $query = "SELECT a.id, a.title, a.thumbnail, a.subtitle, a.content, a.category, a.status, a.created_at, 
                         u.full_name as author_name
                  FROM " . $this->table . " a
                  LEFT JOIN " . $this->users_table . " u ON a.created_by = u.id
                  WHERE a.id = :id
                  LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->execute();

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // 4. Tạo bài viết mới
    public function create($data) {
        $query = "INSERT INTO " . $this->table . " 
                  SET title = :title, 
                      thumbnail = :thumbnail, 
                      subtitle = :subtitle, 
                      content = :content, 
                      category = :category, 
                      status = :status, 
                      created_by = :created_by";
        
        $stmt = $this->conn->prepare($query);

        // Sanitize & Bind
        $title = htmlspecialchars(strip_tags($data['title']));
        $content = $data['content']; // HTML content, cẩn thận khi strip tags nếu dùng editor
        $category = htmlspecialchars(strip_tags($data['category']));
        $status = htmlspecialchars(strip_tags($data['status']));
        $created_by = htmlspecialchars(strip_tags($data['created_by']));
        
        // Thumbnail & Subtitle có thể null
        $thumbnail = !empty($data['thumbnail']) ? htmlspecialchars(strip_tags($data['thumbnail'])) : null;
        $subtitle = !empty($data['subtitle']) ? htmlspecialchars(strip_tags($data['subtitle'])) : null;

        $stmt->bindParam(":title", $title);
        $stmt->bindParam(":thumbnail", $thumbnail);
        $stmt->bindParam(":subtitle", $subtitle);
        $stmt->bindParam(":content", $content);
        $stmt->bindParam(":category", $category);
        $stmt->bindParam(":status", $status);
        $stmt->bindParam(":created_by", $created_by);

        return $stmt->execute();
    }

    // 5. Cập nhật bài viết
    public function update($data) {
        // Chỉ cập nhật các trường có gửi lên (Logic động)
        $fields = [];
        $params = [':id' => $data['id']];

        if (isset($data['title'])) { $fields[] = "title = :title"; $params[':title'] = $data['title']; }
        if (isset($data['content'])) { $fields[] = "content = :content"; $params[':content'] = $data['content']; }
        if (isset($data['category'])) { $fields[] = "category = :category"; $params[':category'] = $data['category']; }
        if (isset($data['status'])) { $fields[] = "status = :status"; $params[':status'] = $data['status']; }
        
        // Cập nhật Thumbnail & Subtitle (Cho phép set về NULL hoặc giá trị mới)
        if (array_key_exists('thumbnail', $data)) { 
            $fields[] = "thumbnail = :thumbnail"; 
            $params[':thumbnail'] = $data['thumbnail']; 
        }
        if (array_key_exists('subtitle', $data)) { 
            $fields[] = "subtitle = :subtitle"; 
            $params[':subtitle'] = $data['subtitle']; 
        }

        if (empty($fields)) { return true; } // Không có gì để update

        $query = "UPDATE " . $this->table . " SET " . implode(', ', $fields) . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);

        return $stmt->execute($params);
    }

    // 6. Xóa bài viết
    public function delete($id) {
        $query = "DELETE FROM " . $this->table . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        return $stmt->execute();
    }
}
?>