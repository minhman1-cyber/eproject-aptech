<?php
class Doctor {
    private $conn;
    private $table = 'doctors';
    private $specialization_table = 'doctor_specializations';

    private $city_table = 'cities';

    private $user_table = 'users';

    private $availability_table = 'doctor_availability'; // Thêm bảng Availability

    public $id; // ID của bảng doctors

    public $user_id;
    public $phone;

    public $name;

    public $city_id;
    public $qualification;
    public $bio;
    public $is_active = 0; // Bác sĩ mặc định chưa hoạt động, chờ duyệt

    public function __construct($db) {
        $this->conn = $db;
    }

     // Hàm mới: Lấy tất cả Bác sĩ đã được duyệt (Cho Patient duyệt)
    // Hàm mới: Lấy tất cả Bác sĩ đã được duyệt (Cho Patient duyệt) - ĐÃ SỬA LỖI 1055
    public function getAllApprovedDoctors2() {
        $query = "
            SELECT 
                u.id as user_id, 
                d.id as doctor_id, 
                u.full_name, 
                u.email, 
                u.city_id,
                d.phone, 
                d.qualification,
                d.bio,
                d.profile_picture,
                -- Lấy ID chuyên khoa đầu tiên làm đại diện cho hiển thị card
                SUBSTRING_INDEX(GROUP_CONCAT(ds.specialization_id), ',', 1) AS specializationId,
                c.name AS city_name
            FROM " . $this->user_table . " u
            JOIN " . $this->table . " d ON u.id = d.user_id
            LEFT JOIN " . $this->specialization_table . " ds ON d.id = ds.doctor_id
            LEFT JOIN " . $this->city_table . " c ON u.city_id = c.id
            WHERE 
                u.role = 'DOCTOR' 
                AND u.is_active = 1
                AND d.is_active = 'APPROVED'
            GROUP BY u.id, d.id, u.full_name, u.email, u.city_id, d.phone, d.qualification, d.bio, d.profile_picture, c.name 
            ORDER BY u.id DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt;
    }

    // Hàm mới: Lấy tất cả Bác sĩ đã được duyệt (Cho Patient duyệt) - ĐÃ SỬA
    public function getAllApprovedDoctors() {
        $query = "
            SELECT 
                u.id as user_id, 
                d.id as doctor_id, 
                u.full_name, 
                u.email, 
                u.city_id,
                d.phone, 
                d.qualification,
                d.bio,
                d.profile_picture,
                -- LẤY TẤT CẢ ID CHUYÊN KHOA (GROUP_CONCAT)
                GROUP_CONCAT(DISTINCT ds.specialization_id) AS specializationIds,
                c.name AS city_name
            FROM " . $this->user_table . " u
            JOIN " . $this->table . " d ON u.id = d.user_id
            LEFT JOIN " . $this->specialization_table . " ds ON d.id = ds.doctor_id
            LEFT JOIN " . $this->city_table . " c ON u.city_id = c.id
            WHERE 
                u.role = 'DOCTOR' 
                AND u.is_active = 1
                AND d.is_active = 'APPROVED'
            GROUP BY u.id, d.id, u.full_name, u.email, u.city_id, d.phone, d.qualification, d.bio, d.profile_picture, c.name 
            ORDER BY u.id DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt;
    }


    // Hàm tạo Doctor (Chèn vào bảng doctors)
    public function create() {
        // Cập nhật câu lệnh SQL: Thêm name=:name
        $query = "INSERT INTO " . $this->table . " 
          SET user_id=:user_id, name=:name, phone=:phone, qualification=:qualification, 
              bio=:bio, is_active=:is_active, city_id=:city_id";
        
        $stmt = $this->conn->prepare($query);

        // Làm sạch dữ liệu và gán tham số
        $this->user_id       = htmlspecialchars(strip_tags((string)$this->user_id));
        $this->phone         = htmlspecialchars(strip_tags((string)$this->phone));
        $this->name          = htmlspecialchars(strip_tags((string)$this->name)); // <<< THÊM: Gán giá trị
        $this->qualification = htmlspecialchars(strip_tags((string)$this->qualification));
        $this->bio           = htmlspecialchars(strip_tags((string)$this->bio));
        $this->is_active     = htmlspecialchars(strip_tags((string)$this->is_active));
        $this->city_id     = htmlspecialchars(strip_tags((string)$this->city_id));

        $stmt->bindParam(":user_id", $this->user_id);
        $stmt->bindParam(":phone", $this->phone);
        $stmt->bindParam(":name", $this->name); // <<< THÊM: Bind tham số
        $stmt->bindParam(":qualification", $this->qualification);
        $stmt->bindParam(":bio", $this->bio);
        $stmt->bindParam(":is_active", $this->is_active);
        $stmt->bindParam(":city_id", $this->city_id);

        return $stmt->execute();
    }
    
    // Hàm thêm chuyên khoa cho Doctor (Chèn vào doctor_specializations)
    public function addSpecializations($doctor_id, $specialization_ids) {
        if (empty($specialization_ids) || !is_array($specialization_ids)) {
            return true; // Không có chuyên khoa để thêm
        }
        
        $sql = "INSERT INTO doctor_specializations (doctor_id, specialization_id) VALUES ";
        $values = [];
        foreach ($specialization_ids as $spec_id) {
            $values[] = "({$doctor_id}, " . (int)$spec_id . ")";
        }
        
        $sql .= implode(', ', $values);
        
        $stmt = $this->conn->prepare($sql);
        return $stmt->execute();
    }

    // Hàm CẬP NHẬT AVATAR (Mới được thêm vào)
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

    // Hàm lấy tất cả dữ liệu Profile Doctor + User
    // public function getProfileByUserId($userId) {
    //     $query = "SELECT u.id as user_id, u.full_name, u.email, u.city_id, 
    //                      d.id as doctor_id, d.phone, d.qualification, d.bio, d.profile_picture, d.is_active
    //               FROM users u
    //               LEFT JOIN " . $this->table . " d ON u.id = d.user_id
    //               WHERE u.id = :user_id LIMIT 0,1";

    //     $stmt = $this->conn->prepare($query);
    //     $stmt->bindParam(':user_id', $userId);
    //     $stmt->execute();
    //     return $stmt;
    // }
    public function getProfileByUserId($userId) {
        $query = "SELECT u.id as user_id, u.full_name, u.email, u.city_id, 
                          d.id as doctor_id, d.phone, d.qualification, d.bio, d.profile_picture, d.is_active
                  FROM " . $this->user_table . " u
                  LEFT JOIN " . $this->table . " d ON u.id = d.user_id
                  WHERE u.id = :user_id LIMIT 0,1";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $userId); // <<< ĐÃ SỬA: BINDING ĐÃ KHỚP VỚI QUERY
        $stmt->execute();
        return $stmt;
    }

    // Hàm tìm kiếm Bác sĩ có lịch rảnh (ĐÃ SỬA)
    public function searchAvailableDoctors($cityId, $specializationId, $appointmentDate) {
        // Lấy ngày trong tuần (0=Sun, 1=Mon, ..., 6=Sat) từ ngày yêu cầu
        $dayOfWeek = date('w', strtotime($appointmentDate));
        
        $query = "
            SELECT 
                u.id as user_id, 
                d.id as doctor_id, 
                u.full_name, 
                d.qualification 
            FROM " . $this->user_table . " u
            JOIN " . $this->table . " d ON u.id = d.user_id
            JOIN " . $this->specialization_table . " ds ON d.id = ds.doctor_id
            WHERE 
                u.role = 'DOCTOR' 
                AND d.is_active = 'APPROVED'
                AND u.city_id = :city_id
                AND ds.specialization_id = :specialization_id
                
                -- KIỂM TRA LỊCH RẢNH: Bác sĩ phải có lịch rảnh vào ngày này
                AND d.id IN (
                    SELECT da.doctor_id FROM " . $this->availability_table . " da
                    WHERE 
                        -- Lịch cố định (NONE) vào ngày cụ thể
                        (da.frequency = 'NONE' AND da.date = :appointment_date)
                        -- HOẶC Lịch lặp lại hàng ngày (DAILY)
                        OR (da.frequency = 'DAILY' AND (da.repeat_end_date IS NULL OR da.repeat_end_date >= :appointment_date))
                        -- HOẶC Lịch lặp lại hàng tuần (WEEKLY) vào ngày trong tuần yêu cầu
                        OR (da.frequency = 'WEEKLY' 
                            AND da.day_of_week = :day_of_week 
                            AND (da.repeat_end_date IS NULL OR da.repeat_end_date >= :appointment_date)
                        )
                )
            GROUP BY u.id
            ORDER BY u.id DESC";

        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(':city_id', $cityId);
        $stmt->bindParam(':specialization_id', $specializationId);
        $stmt->bindParam(':appointment_date', $appointmentDate);
        $stmt->bindParam(':day_of_week', $dayOfWeek);

        $stmt->execute();
        return $stmt;
    }

    // Hàm lấy danh sách ID chuyên khoa hiện tại của bác sĩ
    public function getSpecializationIds($doctorId) {
        $query = "SELECT specialization_id FROM " . $this->specialization_table . " WHERE doctor_id = :doctor_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':doctor_id', $doctorId);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_COLUMN, 0); // Trả về mảng các ID
    }

    // Hàm lấy tất cả chuyên khoa có sẵn
    public function getAllSpecializations() {
        $query = "SELECT id, name FROM specializations ORDER BY name";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Hàm cập nhật thông tin cơ bản của Doctor (phone, qualification, bio)
    public function updateDetails() {
        $query = "UPDATE " . $this->table . " 
                  SET name = :name, phone = :phone, qualification = :qualification, bio = :bio
                  WHERE user_id = :user_id";

        $stmt = $this->conn->prepare($query);

        $this->user_id       = htmlspecialchars(strip_tags((string)$this->user_id));
        $this->name          = htmlspecialchars(strip_tags((string)$this->name));
        $this->phone         = htmlspecialchars(strip_tags((string)$this->phone));
        $this->qualification = htmlspecialchars(strip_tags((string)$this->qualification));
        $this->bio           = htmlspecialchars(strip_tags((string)$this->bio));

        $stmt->bindParam(":user_id", $this->user_id);
        $stmt->bindParam(":name", $this->name);
        $stmt->bindParam(":phone", $this->phone);
        $stmt->bindParam(":qualification", $this->qualification);
        $stmt->bindParam(":bio", $this->bio);

        return $stmt->execute();
    }
    
    // Hàm cập nhật danh sách chuyên khoa (Xóa cũ, Chèn mới)
    public function syncSpecializations($doctorId, $specializationIds) {
        // 1. Xóa tất cả chuyên khoa cũ
        $delete_query = "DELETE FROM " . $this->specialization_table . " WHERE doctor_id = :doctor_id";
        $delete_stmt = $this->conn->prepare($delete_query);
        $delete_stmt->bindParam(":doctor_id", $doctorId);
        $delete_stmt->execute();

        // 2. Chèn chuyên khoa mới (nếu có)
        if (empty($specializationIds)) {
            return true;
        }

        $sql = "INSERT INTO " . $this->specialization_table . " (doctor_id, specialization_id) VALUES ";
        $values = [];
        // LỖI NẰM Ở ĐÂY: Khi specializationIds rỗng, nó vẫn cố gắng tạo giá trị
        if (!empty($specializationIds)) { 
            foreach ($specializationIds as $specId) {
                // Biến $doctorId phải là số nguyên đã được truyền vào
                $values[] = "({$doctorId}, " . (int)$specId . ")"; 
            }
        }
        
        $sql .= implode(', ', $values);
        
        $stmt = $this->conn->prepare($sql);
        return $stmt->execute();
    }

    // HÀM: Lấy danh sách tất cả Doctors cho Admin (ĐÃ SỬA)
    public function getAllDoctorsForAdmin() {
        $query = "
            SELECT 
                u.id as user_id, 
                u.full_name, 
                u.email, 
                u.is_active as user_is_active, 
                u.city_id,                             -- <<< THÊM: city_id (từ users)
                d.id as doctor_id, 
                d.phone, 
                d.qualification,                       -- <<< THÊM: qualification
                d.bio,                                 -- <<< THÊM: bio
                d.is_active,                           -- <<< TRẠNG THÁI DUYỆT (ENUM)
                GROUP_CONCAT(ds.specialization_id) as specialization_ids
            FROM " . $this->user_table . " u
            JOIN " . $this->table . " d ON u.id = d.user_id
            LEFT JOIN " . $this->specialization_table . " ds ON d.id = ds.doctor_id
            WHERE u.role = 'DOCTOR'
            GROUP BY u.id
            ORDER BY u.id DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt;
    }

    // HÀM BỊ THIẾU 1: Cập nhật bảng Users (Admin)
    public function adminUpdateUser(object $userObj) {
        $query = "UPDATE " . $this->user_table . " 
                  SET is_active = :is_active 
                  WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(":id", $userObj->id);
        $stmt->bindParam(":is_active", $userObj->is_active);

        return $stmt->execute();
    }

    // HÀM BỊ THIẾU 2: Cập nhật bảng Doctors (Admin)
    public function adminUpdateDoctorDetails() {
        $query = "UPDATE " . $this->table . " 
                  SET name = :name, phone = :phone, qualification = :qualification, 
                      bio = :bio, is_active = :is_active 
                  WHERE user_id = :user_id";

        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(":user_id", $this->user_id);
        $stmt->bindParam(":name", $this->name);
        $stmt->bindParam(":phone", $this->phone);
        $stmt->bindParam(":qualification", $this->qualification);
        $stmt->bindParam(":bio", $this->bio);
        $stmt->bindParam(":is_active", $this->is_active); 

        return $stmt->execute();
    }

    // HÀM MỚI: Cập nhật trạng thái is_active của User
    public function toggleUserActive($userId, $newStatus) {
        $query = "UPDATE " . $this->user_table . " 
                  SET is_active = :status 
                  WHERE id = :id AND role = 'DOCTOR'";
        
        $stmt = $this->conn->prepare($query);
        
        // Đảm bảo status là số nguyên (0 hoặc 1)
        $status = (int)$newStatus;
        
        $stmt->bindParam(":status", $status);
        $stmt->bindParam(":id", $userId);

        return $stmt->execute();
    }

    // HÀM MỚI: Lấy danh sách tất cả Thành phố (Cities)
    public function getAllCities() {
        $query = "SELECT id, name FROM " . $this->city_table . " ORDER BY name";
        
        $stmt = $this->conn->prepare($query);
        
        if (!$stmt->execute()) {
            // Trả về false nếu có lỗi truy vấn
            return false;
        }
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getDoctorDetailsByIds(array $doctorIds) {
        if (empty($doctorIds)) return [];
        
        $in_placeholders = str_repeat('?,', count($doctorIds) - 1) . '?';
        
        $query = "SELECT d.id, u.full_name, u.city_id, d.qualification 
                FROM doctors d 
                JOIN users u ON d.user_id = u.id 
                WHERE d.id IN ({$in_placeholders})";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute($doctorIds);
        
        // Trả về mảng key-value (id => details)
        $details = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $result = [];
        foreach ($details as $detail) {
            $result[$detail['id']] = $detail;
        }
        return $result;
    }

    // Hàm MỚI: Lấy tất cả bằng cấp đã xác minh cho một danh sách ID Bác sĩ
    public function getVerifiedQualificationsByDoctorIds(array $doctorIds) {
        if (empty($doctorIds)) return [];
        
        $placeholders = implode(',', array_fill(0, count($doctorIds), '?'));
        
        $query = "SELECT doctor_id, title, institution, year_completed as year, document_url, is_verified 
                FROM doctor_qualifications 
                WHERE doctor_id IN ({$placeholders}) AND is_verified = 1
                ORDER BY year_completed DESC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute($doctorIds);
        
        // Trả về mảng groups: [doctorId => [qual1, qual2, ...]]
        $results = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $results[$row['doctor_id']][] = $row;
        }
        return $results;
    }

    // Hàm MỚI: Lấy tất cả bằng cấp đang chờ duyệt (hoặc đã xác minh)
    public function getPendingQualifications($searchTerm = null) {
        $query = "
            SELECT 
                dq.id as qual_id, 
                dq.title, 
                dq.institution, 
                dq.year_completed, 
                dq.document_url, 
                dq.doctor_id,
                u.full_name AS doctor_name,
                u.email
            FROM doctor_qualifications dq
            JOIN doctors d ON dq.doctor_id = d.id
            JOIN users u ON d.user_id = u.id
            WHERE 
                dq.is_verified = 0"; // Lấy tất cả bằng cấp CHỜ DUYỆT (is_verified = 0)
        
        // Thêm điều kiện tìm kiếm nếu có
        if ($searchTerm) {
            $query .= " AND (u.full_name LIKE :search_term OR u.email LIKE :search_term OR u.id = :user_id_search)";
        }
        
        $query .= " ORDER BY dq.id DESC";

        $stmt = $this->conn->prepare($query);
        
        if ($searchTerm) {
            $likeTerm = "%" . $searchTerm . "%";
            $stmt->bindParam(":search_term", $likeTerm);
            $stmt->bindParam(":user_id_search", $searchTerm); // Bind cả dạng ID
        }

        $stmt->execute();
        return $stmt;
    }
    
    // HÀM MỚI: Xác minh/Từ chối bằng cấp (UPDATE is_verified)
    public function verifyQualification($qualId, $status) {
        $query = "UPDATE doctor_qualifications 
                  SET is_verified = :status 
                  WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":status", $status); // 1 (Accepted) hoặc -1 (Rejected/Denied)
        $stmt->bindParam(":id", $qualId);

        return $stmt->execute();
    }
}
