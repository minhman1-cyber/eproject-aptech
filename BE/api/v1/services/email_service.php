<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../../../phpmailer/src/Exception.php';
require_once __DIR__ . '/../../../phpmailer/src/PHPMailer.php';
require_once __DIR__ . '/../../../phpmailer/src/SMTP.php';

function sendEmail($to, $name, $subject, $html) {
    $mail = new PHPMailer(true);

    try {
        $mail->isSMTP();
        $mail->Host = 'smtp.gmail.com';
        $mail->SMTPAuth = true;
        $mail->Username = 'picgroupinsurance@gmail.com';
        $mail->Password = '';
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS; 
        $mail->Port = 587;

        $mail->CharSet = 'UTF-8';
        $mail->Encoding = 'base64';

        $mail->setFrom('picgroupinsurance@gmail.com', 'MediConnect');
        $mail->addAddress($to, $name);

        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body = $html;

        $mail->send();
        return true;

    } catch (Exception $e) {
        return $e->getMessage();
    }
}
