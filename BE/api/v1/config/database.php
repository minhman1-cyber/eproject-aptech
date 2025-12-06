<?php
class Database
{
    private $host = "localhost";
    private $port = "8889";         // Thêm dòng này
    private $db_name = "mediconnect";
    private $username = "root";
    private $password = "root";
    public $conn;

    public function getConnection()
    {
        $this->conn = null;
        try {
            $this->conn = new PDO(
                "mysql:host={$this->host};port={$this->port};dbname={$this->db_name}",
                $this->username,
                $this->password
            );
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch (PDOException $exception) {
            echo "Lỗi kết nối database: " . $exception->getMessage();
        }
        return $this->conn;
    }
}
