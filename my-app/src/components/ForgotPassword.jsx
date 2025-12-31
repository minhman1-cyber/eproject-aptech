import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:8888/api/v1/controllers/forgot_password.php';

const ForgotPassword = () => {
    // Step 1: Nhập Email, Step 2: Nhập OTP & Pass mới
    const [step, setStep] = useState(1);
    
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const navigate = useNavigate();

    // Xử lý gửi OTP
    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setIsLoading(true);

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'send_otp', email: email })
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.message || 'Lỗi gửi OTP');

            setMessage(data.message);
            setStep(2); // Chuyển sang bước nhập OTP

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Xử lý đổi mật khẩu
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (newPassword !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp.');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'reset_password',
                    email: email,
                    otp: otp,
                    newPassword: newPassword
                })
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.message || 'Lỗi đổi mật khẩu');

            alert('Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');
            navigate('/login');

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page-wrapper d-flex align-items-center justify-content-center min-vh-100 bg-light">
            <style>{`
                .login-card {
                    overflow: hidden;
                    border: none;
                    border-radius: 20px;
                    box-shadow: 0 15px 35px rgba(0,0,0,0.1);
                    background: #fff;
                    max-width: 500px; /* Nhỏ hơn form login */
                    width: 90%;
                    min-height: 400px;
                }
                .form-control-custom {
                    border-radius: 10px;
                    padding: 12px 15px;
                    border: 1px solid #e2e8f0;
                    background-color: #f8fafc;
                    transition: all 0.3s;
                }
                .form-control-custom:focus {
                    background-color: #fff;
                    border-color: #2563eb;
                    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
                }
                .btn-primary-custom {
                    border-radius: 10px;
                    padding: 12px;
                    font-weight: 600;
                    background-color: #2563eb;
                    border: none;
                    transition: all 0.3s;
                }
                .btn-primary-custom:hover {
                    background-color: #1d4ed8;
                    transform: translateY(-2px);
                }
            `}</style>

            <div className="card login-card p-4">
                <div className="text-center mb-4">
                    <i className="fas fa-lock fa-3x text-primary mb-3"></i>
                    <h3 className="fw-bold text-dark">Forgot Password</h3>
                    <p className="text-muted small">
                        {step === 1 ? "Enter your email to receive an OTP code." : "Check your email for the OTP code."}
                    </p>
                </div>

                {error && <div className="alert alert-danger small"><i className="fas fa-exclamation-circle me-1"></i> {error}</div>}
                {message && <div className="alert alert-success small"><i className="fas fa-check-circle me-1"></i> {message}</div>}

                {step === 1 ? (
                    // FORM BƯỚC 1: NHẬP EMAIL
                    <form onSubmit={handleSendOtp}>
                        <div className="mb-3">
                            <label className="form-label text-secondary fw-semibold small">Email Address</label>
                            <input
                                type="email"
                                className="form-control form-control-custom"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-primary btn-primary-custom w-100 text-white" disabled={isLoading}>
                            {isLoading ? 'Sending OTP...' : 'Send OTP'}
                        </button>
                    </form>
                ) : (
                    // FORM BƯỚC 2: NHẬP OTP VÀ PASS MỚI
                    <form onSubmit={handleResetPassword}>
                        <div className="mb-3">
                            <label className="form-label text-secondary fw-semibold small">OTP Code</label>
                            <input
                                type="text"
                                className="form-control form-control-custom"
                                placeholder="Enter 6-digit code"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                            />
                        </div>
                        <div className="mb-3">
                            <label className="form-label text-secondary fw-semibold small">New Password</label>
                            <input
                                type="password"
                                className="form-control form-control-custom"
                                placeholder="New password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="mb-3">
                            <label className="form-label text-secondary fw-semibold small">Confirm Password</label>
                            <input
                                type="password"
                                className="form-control form-control-custom"
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-primary btn-primary-custom w-100 text-white" disabled={isLoading}>
                            {isLoading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                )}

                <div className="text-center mt-4">
                    <Link to="/login" className="text-decoration-none text-secondary small fw-bold">
                        <i className="fas fa-arrow-left me-1"></i> Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;