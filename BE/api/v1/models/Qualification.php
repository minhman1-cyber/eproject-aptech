<?php
class Qualification {
    private $conn;
    private $table = 'doctor_qualifications';

    public $doctor_id;
    public $title;
    public $institution;
    public $year_completed;
    public $document_url;

    public function __construct($db) {
        $this->conn = $db;
    }

    // Lấy tất cả bằng cấp của một bác sĩ
    public function getByDoctorId($doctor_id) {
        $query = "SELECT id, title, institution, year_completed as year, document_url, is_verified 
                  FROM " . $this->table . " 
                  WHERE doctor_id = :doctor_id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':doctor_id', $doctor_id);
        $stmt->execute();
        return $stmt;
    }
    
    // Thêm bằng cấp mới (sau khi file đã được upload)
    public function create() {
        $query = "INSERT INTO " . $this->table . " 
                  SET doctor_id=:doctor_id, title=:title, institution=:institution, 
                      year_completed=:year_completed, document_url=:document_url, is_verified=0";
        
        $stmt = $this->conn->prepare($query);

        $this->doctor_id      = htmlspecialchars(strip_tags((string)$this->doctor_id));
        $this->title          = htmlspecialchars(strip_tags((string)$this->title));
        $this->institution    = htmlspecialchars(strip_tags((string)$this->institution));
        $this->year_completed = htmlspecialchars(strip_tags((string)$this->year_completed));
        $this->document_url   = htmlspecialchars(strip_tags((string)$this->document_url));

        $stmt->bindParam(":doctor_id", $this->doctor_id);
        $stmt->bindParam(":title", $this->title);
        $stmt->bindParam(":institution", $this->institution);
        $stmt->bindParam(":year_completed", $this->year_completed);
        $stmt->bindParam(":document_url", $this->document_url);

        return $stmt->execute();
    }
}