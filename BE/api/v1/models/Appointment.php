<?php
class Appointment {
    private $conn;
    private $table = 'appointments';
    private $patient_table = 'patients';

    public $id;
    public $patient_id;
    public $doctor_id;
    public $appointment_date;
    public $appointment_time;
    public $reason;

    public function __construct($db) {
        $this->conn = $db;
    }

    // Lấy tất cả các cuộc hẹn đã đặt cho một bác sĩ vào một ngày cụ thể
    // public function getBookedSlots($doctorId, $date) {
    //     $query = "SELECT appointment_time 
    //               FROM " . $this->table . " 
    //               WHERE doctor_id = :doctor_id AND appointment_date = :appointment_date 
    //               AND status = 'BOOKED'";
        
    //     $stmt = $this->conn->prepare($query);
    //     $stmt->bindParam(':doctor_id', $doctorId);
    //     $stmt->bindParam(':appointment_date', $date);
        
    //     $stmt->execute();
    //     return $stmt;
    // }

    // Lấy tất cả các cuộc hẹn đã đặt cho một bác sĩ vào một ngày cụ thể
    public function getBookedSlots($doctorId, $date) {
        $query = "SELECT TIME_FORMAT(appointment_time, '%H:%i') AS appointment_time
                FROM " . $this->table . "
                WHERE doctor_id = :doctor_id 
                    AND appointment_date = :appointment_date
                    AND status IN ('BOOKED', 'RESCHEDULED')";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':doctor_id', $doctorId);
        $stmt->bindParam(':appointment_date', $date);

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_COLUMN); // Trả về ['08:30', '12:00']
    }


    // HÀM MỚI: Kiểm tra trùng lặp lịch hẹn
    public function isSlotBooked($doctorId, $date, $time) {
        $query = "SELECT id FROM " . $this->table . " 
                  WHERE doctor_id = :doctor_id AND appointment_date = :appointment_date 
                  AND appointment_time = :appointment_time AND status = 'BOOKED' LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':doctor_id', $doctorId);
        $stmt->bindParam(':appointment_date', $date);
        $stmt->bindParam(':appointment_time', $time);
        
        $stmt->execute();
        return $stmt->rowCount() > 0;
    }

    // HÀM MỚI: Tạo lịch hẹn mới
    public function createAppointment() {
        $query = "INSERT INTO " . $this->table . " 
                  SET patient_id = :patient_id, doctor_id = :doctor_id, 
                      appointment_date = :appointment_date, appointment_time = :appointment_time, 
                      reason = :reason, status = 'BOOKED'";
        
        $stmt = $this->conn->prepare($query);
        
        // Làm sạch và gán tham số
        $stmt->bindParam(":patient_id", $this->patient_id);
        $stmt->bindParam(":doctor_id", $this->doctor_id);
        $stmt->bindParam(":appointment_date", $this->appointment_date);
        $stmt->bindParam(":appointment_time", $this->appointment_time);
        $stmt->bindParam(":reason", $this->reason);
        
        return $stmt->execute();
    }

     // HÀM MỚI BỊ THIẾU: Lấy chi tiết lịch hẹn (Dùng cho Manage Controller)
    public function getAppointmentDetails($appointmentId) {
        $query = "SELECT doctor_id, patient_id, appointment_date, appointment_time, status 
                  FROM " . $this->table . " 
                  WHERE id = :id LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $appointmentId);
        $stmt->execute();
        
        // Trả về mảng liên kết
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // HÀM MỚI: Hủy Lịch (Chỉ cập nhật trạng thái)
    public function updateStatus($appointmentId, $status) {
        $query = "UPDATE " . $this->table . " SET status = :status WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":status", $status);
        $stmt->bindParam(":id", $appointmentId);
        
        return $stmt->execute();
    }

    // HÀM MỚI: Đổi Lịch
    public function reschedule($appointmentId, $newDate, $newTime) {
        $query = "UPDATE " . $this->table . " 
                  SET appointment_date = :new_date, appointment_time = :new_time, 
                      status = 'RESCHEDULED'
                  WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":new_date", $newDate);
        $stmt->bindParam(":new_time", $newTime);
        $stmt->bindParam(":id", $appointmentId);
        
        return $stmt->execute();
    }

    // HÀM MỚI: Lấy tất cả lịch hẹn của Patient
    public function getAppointmentsByPatientId($patientId) {
        $query = "SELECT id, doctor_id, appointment_date, appointment_time, reason, status, created_at 
                  FROM " . $this->table . " 
                  WHERE patient_id = :patient_id 
                  ORDER BY appointment_date DESC, appointment_time DESC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':patient_id', $patientId);
        
        if (!$stmt->execute()) {
             return false;
        }
        return $stmt;
    }

    // Hàm lấy tất cả lịch hẹn của Doctor (ĐÃ THÊM)
    public function getAppointmentsByDoctorId($doctorId) {
        $query = "SELECT id, patient_id, doctor_id, appointment_date, appointment_time, reason, status, created_at 
                  FROM " . $this->table . " 
                  WHERE doctor_id = :doctor_id 
                  ORDER BY appointment_date ASC, appointment_time ASC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':doctor_id', $doctorId);
        
        if (!$stmt->execute()) {
             return false;
        }
        return $stmt;
    }
}