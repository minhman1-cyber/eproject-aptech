<?php
class Appointment {
    private $conn;
    private $table = 'appointments';
    private $patient_table = 'patients';

    public $id;
    public $patient_id;
    public $doctor_id;
    public $availability_id; // Khóa ngoại liên kết với bảng doctor_availability
    public $appointment_date;
    public $appointment_time;
    public $reason;

    public function __construct($db) {
        $this->conn = $db;
    }

    // Lấy danh sách giờ đã đặt của bác sĩ trong ngày (để hiển thị các slot đã kín)
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

        return $stmt->fetchAll(PDO::FETCH_COLUMN); 
    }

    // Kiểm tra xem một slot cụ thể đã có appointment nào chưa
    public function isSlotBooked($doctorId, $date, $time) {
        $query = "SELECT id FROM " . $this->table . " 
                  WHERE doctor_id = :doctor_id 
                  AND appointment_date = :appointment_date 
                  AND appointment_time = :appointment_time 
                  AND status IN ('BOOKED', 'RESCHEDULED') LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':doctor_id', $doctorId);
        $stmt->bindParam(':appointment_date', $date);
        $stmt->bindParam(':appointment_time', $time);
        
        $stmt->execute();
        return $stmt->rowCount() > 0;
    }

    // Tạo lịch hẹn mới (Sử dụng availability_id để liên kết slot)
    public function createAppointment() {
        $query = "INSERT INTO " . $this->table . " 
                  SET patient_id = :patient_id, 
                      doctor_id = :doctor_id, 
                      availability_id = :availability_id,
                      appointment_date = :appointment_date, 
                      appointment_time = :appointment_time, 
                      reason = :reason, 
                      status = 'BOOKED'";
        
        $stmt = $this->conn->prepare($query);
        
        // Làm sạch và gán tham số
        $stmt->bindParam(":patient_id", $this->patient_id);
        $stmt->bindParam(":doctor_id", $this->doctor_id);
        
        // Xử lý availability_id (Nếu controller chưa set thì là null, nhưng nên set để đảm bảo FK)
        $availId = !empty($this->availability_id) ? $this->availability_id : null;
        $stmt->bindParam(":availability_id", $availId);

        $stmt->bindParam(":appointment_date", $this->appointment_date);
        $stmt->bindParam(":appointment_time", $this->appointment_time);
        $stmt->bindParam(":reason", $this->reason);
        
        return $stmt->execute();
    }

    // Lấy chi tiết một lịch hẹn theo ID
    public function getAppointmentDetails($appointmentId) {
        $query = "SELECT id, doctor_id, patient_id, availability_id, appointment_date, appointment_time, status 
                  FROM " . $this->table . " 
                  WHERE id = :id LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $appointmentId);
        $stmt->execute();
        
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Cập nhật trạng thái (CANCELLED, COMPLETED,...)
    public function updateStatus($appointmentId, $status) {
        $query = "UPDATE " . $this->table . " SET status = :status WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":status", $status);
        $stmt->bindParam(":id", $appointmentId);
        
        return $stmt->execute();
    }

    // Đổi lịch (Reschedule) - Cập nhật ngày giờ và availability_id mới
    public function reschedule($appointmentId, $newDate, $newTime, $newAvailabilityId = null) {
        $query = "UPDATE " . $this->table . " 
                  SET appointment_date = :new_date, 
                      appointment_time = :new_time, 
                      status = 'RESCHEDULED'";
        
        // Nếu có availability_id mới (khi chuyển sang slot khác)
        if ($newAvailabilityId !== null) {
            $query .= ", availability_id = :availability_id";
        }

        $query .= " WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":new_date", $newDate);
        $stmt->bindParam(":new_time", $newTime);
        $stmt->bindParam(":id", $appointmentId);

        if ($newAvailabilityId !== null) {
            $stmt->bindParam(":availability_id", $newAvailabilityId);
        }
        
        return $stmt->execute();
    }

    // Lấy danh sách lịch hẹn của Patient
    public function getAppointmentsByPatientId($patientId) {
        $query = "SELECT id, doctor_id, availability_id, appointment_date, appointment_time, reason, status, created_at 
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

    // Lấy danh sách lịch hẹn của Doctor
    public function getAppointmentsByDoctorId($doctorId) {
        $query = "SELECT id, patient_id, doctor_id, availability_id, appointment_date, appointment_time, reason, status, created_at 
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

    public function getAllAppointmentsForAdmin() {
        // Truy vấn JOIN 3 bảng: appointments, doctors (join users), patients (join users)
        // Để lấy tên bác sĩ và tên bệnh nhân
        $query = "SELECT 
                    a.id as appointment_id,
                    a.appointment_date,
                    a.appointment_time,
                    a.status,
                    a.created_at,
                    doc_u.full_name as doctor_name,
                    pat_u.full_name as patient_name
                FROM " . $this->table . " a
                LEFT JOIN doctors d ON a.doctor_id = d.id
                LEFT JOIN users doc_u ON d.user_id = doc_u.id
                LEFT JOIN patients p ON a.patient_id = p.id
                LEFT JOIN users pat_u ON p.user_id = pat_u.id
                ORDER BY a.appointment_date DESC, a.appointment_time DESC";

        $stmt = $this->conn->prepare($query);
        if (!$stmt->execute()) {
             return false;
        }
        return $stmt;
    }
    
}