// LoginForm.js (Sử dụng Fetch API)
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:8888/api/v1/controllers/login.php';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        
        // CỰC KỲ QUAN TRỌNG: Cho phép trình duyệt gửi và nhận Cookie Session
        credentials: 'include', 
        
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email, 
          password: password 
        }),
      });

      // 1. Kiểm tra trạng thái HTTP (200 OK, 401 Unauthorized,...)
      if (!response.ok) {
        // Đọc response body để lấy thông báo lỗi từ PHP
        const errorData = await response.json();
        const errorMessage = errorData.message || 'Đăng nhập thất bại. Vui lòng kiểm tra thông tin.';
        throw new Error(errorMessage);
      }

      // 2. Xử lý thành công (Response 200 OK)
      const data = await response.json();
      const userData = data.data;
      const role = userData.role;

      // Session Cookie đã được thiết lập tự động trong trình duyệt
      alert(`Đăng nhập thành công! Vai trò: ${role}`);
      
      // 3. Chuyển hướng dựa trên vai trò
      if (role === 'PATIENT') {
        navigate('/patient/dashboard');
      } else if (role === 'DOCTOR') {
        navigate('/doctor/dashboard');
      } else if (role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/home');
      }

    } catch (err) {
      // Bắt lỗi mạng hoặc lỗi custom từ bước 1
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container d-flex align-items-center justify-content-center vh-100 bg-light">
        <div className="card shadow-lg p-4" style={{ maxWidth: '400px', width: '100%' }}>
            {/* ... Phần hiển thị tiêu đề và lỗi ... */}
            <h3 className="card-title text-center text-primary mb-4 fw-bold">
                <i className="bi bi-person-circle me-2"></i> Mediconnect Login
            </h3>
            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}
            <form onSubmit={handleSubmit}>
                {/* Email và Mật khẩu Inputs giữ nguyên */}
                <div className="form-floating mb-3">
                    <input
                        type="email"
                        className="form-control"
                        id="loginEmail"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <label htmlFor="loginEmail">Email</label>
                </div>
                <div className="form-floating mb-3">
                    <input
                        type="password"
                        className="form-control"
                        id="loginPassword"
                        placeholder="Mật khẩu"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <label htmlFor="loginPassword">Mật khẩu</label>
                </div>
                
                <button type="submit" className="btn btn-primary btn-lg w-100 mb-3" disabled={isLoading}>
                    {isLoading ? 'Đang Đăng Nhập...' : 'Đăng Nhập'}
                </button>
            </form>
            
            {/* ... Phần Quên mật khẩu và Đăng ký giữ nguyên ... */}
            <div className="text-center mt-3">
                <Link to="/forgot-password" className="d-block mb-2">Quên Mật khẩu?</Link>
                <p className="mt-2">
                    Chưa có tài khoản? 
                    <Link to="/signup" className="fw-bold ms-1">Đăng ký ngay</Link>
                </p>
            </div>
        </div>
    </div>
  );
};

export default LoginForm;