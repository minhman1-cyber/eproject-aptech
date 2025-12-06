<?php
class DoctorAvailability {
    private $conn;
    private $table = 'doctor_availability';

    public $id;
    public $doctor_id;
    public $date;
    public $start_time;
    public $end_time;
    public $frequency;
    public $day_of_week;
    public $repeat_end_date;
    // day_of_month không được sử dụng trong phiên bản Frontend hiện tại

    public function __construct($db) {
        $this->conn = $db;
    }

    // HÀM MỚI: Lấy tất cả lịch rảnh (availability) cho một ngày cụ thể
    public function getAvailableSchedule($doctorId, $date, $dayOfWeek) {
        // Kiểm tra logic để lấy các loại lịch: NONE (cố định), DAILY, WEEKLY
        $query = "
            SELECT 
                start_time, 
                end_time
            FROM " . $this->table . "
            WHERE 
                doctor_id = :doctor_id
                AND (
                    -- Lịch cố định (NONE) vào ngày cụ thể
                    (frequency = 'NONE' AND date = :date)
                    -- HOẶC Lịch lặp lại hàng ngày (DAILY)
                    OR (frequency = 'DAILY' AND (repeat_end_date IS NULL OR repeat_end_date >= :date))
                    -- HOẶC Lịch lặp lại hàng tuần (WEEKLY)
                    OR (frequency = 'WEEKLY' 
                        AND day_of_week = :day_of_week 
                        AND (repeat_end_date IS NULL OR repeat_end_date >= :date)
                    )
                )
            ORDER BY start_time";
        
        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(':doctor_id', $doctorId);
        $stmt->bindParam(':date', $date);
        // dayOfWeek là giá trị số (0-6)
        $stmt->bindParam(':day_of_week', $dayOfWeek);
        
        if (!$stmt->execute()) {
             return false;
        }
        return $stmt;
    }

    // Hàm tạo lịch rảnh mới (Dùng cho NONE, DAILY, WEEKLY)
    public function create() {
        $query = "INSERT INTO " . $this->table . " 
                  SET doctor_id = :doctor_id, date = :date, start_time = :start_time, 
                      end_time = :end_time, frequency = :frequency, day_of_week = :day_of_week, 
                      repeat_end_date = :repeat_end_date";
        
        $stmt = $this->conn->prepare($query);

        // Làm sạch và gán tham số
        $stmt->bindParam(":doctor_id", $this->doctor_id);
        $stmt->bindParam(":start_time", $this->start_time);
        $stmt->bindParam(":end_time", $this->end_time);
        $stmt->bindParam(":frequency", $this->frequency);

        // Xử lý các trường có thể là NULL (ĐÃ SỬA LỖI 0 thành NULL)
        
        // 1. Dùng toán tử ?? (Null Coalescing) thay vì ?: (Elvis) để chỉ kiểm tra null/undefined
        // Tuy nhiên, vì các thuộc tính này là public properties, chúng ta nên kiểm tra rõ ràng
        
        $date = (isset($this->date) && $this->date !== '') ? $this->date : NULL;
        $day_of_week = (isset($this->day_of_week) && $this->day_of_week !== '') ? $this->day_of_week : NULL;
        $repeat_end_date = (isset($this->repeat_end_date) && $this->repeat_end_date !== '') ? $this->repeat_end_date : NULL;
        
        // Hoặc đơn giản hóa (đã kiểm tra và fix trong Controller)
        // Dùng ternary operator an toàn hơn
        $day_of_week_safe = ($this->day_of_week === 0 || $this->day_of_week > 0) ? $this->day_of_week : NULL;
        $date_safe = $this->date ? $this->date : NULL;
        $repeat_end_date_safe = $this->repeat_end_date ? $this->repeat_end_date : NULL;


        $stmt->bindParam(":date", $date_safe);
        $stmt->bindParam(":day_of_week", $day_of_week_safe);
        $stmt->bindParam(":repeat_end_date", $repeat_end_date_safe);
        
        // Cần đảm bảo kiểu dữ liệu trong bindParam (PARAM_INT/PARAM_STR/PARAM_NULL)
        // Vì đây là các tham số, ta dùng PARAM_STR và để MySQL tự ép kiểu, nhưng vẫn cần kiểm tra giá trị.
        
        try {
            return $stmt->execute();
        } catch (PDOException $e) {
            // Trong trường hợp lỗi SQL, ném lại exception để Controller xử lý Rollback
            throw $e; 
        }
    }

    // Lấy tất cả lịch rảnh của một bác sĩ
    public function getAvailabilityByDoctorId($doctorId) {
        $query = "SELECT * FROM " . $this->table . " WHERE doctor_id = :doctor_id ORDER BY id DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':doctor_id', $doctorId);
        
        if (!$stmt->execute()) {
             return false;
        }
        return $stmt; // Trả về statement
    }

    // Lấy lịch rảnh theo ID (dùng để kiểm tra quyền xóa)
    public function getById($id) {
        $query = "SELECT doctor_id FROM " . $this->table . " WHERE id = :id LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        
        if (!$stmt->execute()) {
             return false;
        }
        return $stmt;
    }

    // Xóa lịch rảnh
    public function delete($id) {
        $query = "DELETE FROM " . $this->table . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        
        return $stmt->execute();
    }
}