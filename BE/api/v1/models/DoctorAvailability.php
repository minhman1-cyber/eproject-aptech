<?php
class DoctorAvailability {
    private $conn;
    private $table = 'doctor_availability';

    // Các thuộc tính khớp với bảng database mới
    public $id;
    public $doctor_id;
    public $date;
    public $start_time;
    public $end_time;
    public $is_booked; // 0 hoặc 1
    public $is_locked; // 0 hoặc 1

    public function __construct($db) {
        $this->conn = $db;
    }

    // ==========================================
    // 1. LẤY DANH SÁCH SLOT
    // ==========================================
    
    // Lấy tất cả slot của một bác sĩ trong một ngày cụ thể (Dùng cho cả Admin/Doctor/Patient view)
    public function getSlotsByDate($doctorId, $date) {
        $query = "SELECT id, start_time, end_time, is_booked, is_locked 
                  FROM " . $this->table . " 
                  WHERE doctor_id = :doctor_id 
                  AND date = :date 
                  ORDER BY start_time ASC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':doctor_id', $doctorId);
        $stmt->bindParam(':date', $date);
        
        $stmt->execute();
        return $stmt;
    }

    // Lấy slot theo ID (Dùng để kiểm tra trước khi xóa hoặc đặt lịch)
    public function getById($id) {
        $query = "SELECT * FROM " . $this->table . " WHERE id = :id LIMIT 1";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        
        $stmt->execute();
        return $stmt;
    }

    // ==========================================
    // 2. THÊM / SỬA / XÓA
    // ==========================================

    // Tạo một slot đơn lẻ (Ít dùng nếu dùng batch, nhưng vẫn cần cho các case đặc biệt)
    public function create() {
        $query = "INSERT INTO " . $this->table . " 
                  SET doctor_id = :doctor_id, 
                      date = :date, 
                      start_time = :start_time, 
                      end_time = :end_time, 
                      is_booked = 0, 
                      is_locked = 0";
        
        $stmt = $this->conn->prepare($query);

        // Sanitize
        $this->doctor_id  = htmlspecialchars(strip_tags($this->doctor_id));
        $this->date       = htmlspecialchars(strip_tags($this->date));
        $this->start_time = htmlspecialchars(strip_tags($this->start_time));
        $this->end_time   = htmlspecialchars(strip_tags($this->end_time));

        // Bind
        $stmt->bindParam(":doctor_id", $this->doctor_id);
        $stmt->bindParam(":date", $this->date);
        $stmt->bindParam(":start_time", $this->start_time);
        $stmt->bindParam(":end_time", $this->end_time);

        return $stmt->execute();
    }

    // Xóa slot (Chỉ xóa được nếu chưa ai đặt - Logic kiểm tra nên nằm ở Controller)
    public function delete($id) {
        $query = "DELETE FROM " . $this->table . " WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        
        return $stmt->execute();
    }

    // ==========================================
    // 3. CẬP NHẬT TRẠNG THÁI (Booking / Locking)
    // ==========================================

    // Cập nhật trạng thái đặt chỗ (Book/Unbook)
    public function updateBookingStatus($id, $status) {
        $query = "UPDATE " . $this->table . " SET is_booked = :status WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":status", $status); // 0 hoặc 1
        $stmt->bindParam(":id", $id);
        
        return $stmt->execute();
    }

    // Khóa/Mở khóa slot (Cho Admin/Doctor nghỉ đột xuất)
    public function toggleLock($id, $status) {
        $query = "UPDATE " . $this->table . " SET is_locked = :status WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":status", $status); // 0 hoặc 1
        $stmt->bindParam(":id", $id);
        
        return $stmt->execute();
    }
}