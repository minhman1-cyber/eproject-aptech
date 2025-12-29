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
        // CRITICAL: Allow browser to send and receive Session Cookies
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password
        }),
      });

      // 1. Check HTTP status
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.message || 'Login failed. Please check your credentials.';
        throw new Error(errorMessage);
      }

      // 2. Handle success
      const data = await response.json();
      const userData = data.data;
      const role = userData.role;

      // Session Cookie automatically set in browser
      // alert(`Login successful! Role: ${role}`); // Can remove alert for smoother experience

      // 3. Redirect based on role
      if (role === 'PATIENT') {
        navigate('/patient/dashboard');
      } else if (role === 'DOCTOR') {
        navigate('/doctor/dashboard');
      } else if (role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/home');
      }

      localStorage.setItem('user_role', role);

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
            max-width: 1000px;
            width: 90%;
            min-height: 600px;
        }
        .login-image-col {
            background-image: url('https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=800&q=80');
            background-size: cover;
            background-position: center;
            position: relative;
        }
        .login-image-overlay {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: linear-gradient(135deg, rgba(37, 99, 235, 0.8), rgba(30, 58, 138, 0.6));
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: white;
            padding: 2rem;
            text-align: center;
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
        .btn-login {
            border-radius: 10px;
            padding: 12px;
            font-weight: 600;
            background-color: #2563eb;
            border: none;
            transition: all 0.3s;
        }
        .btn-login:hover {
            background-color: #1d4ed8;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }
        .social-btn {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid #e2e8f0;
            color: #64748b;
            transition: all 0.2s;
            text-decoration: none;
        }
        .social-btn:hover {
            background-color: #f1f5f9;
            color: #2563eb;
        }
        @media (max-width: 768px) {
            .login-image-col {
                display: none;
            }
        }
      `}</style>
      
      <div className="card login-card row flex-row mx-0">
        {/* Left Column: Image & Brand Info */}
        <div className="col-md-6 login-image-col p-0">
            <div className="login-image-overlay">
                <div className="mb-4">
                    <i className="fas fa-heartbeat fa-4x mb-3"></i>
                    <h2 className="fw-bold display-6">Mediconnect</h2>
                </div>
                <p className="lead px-4">
                    "Connecting you with the best healthcare professionals. Your health is our priority."
                </p>
                <div className="mt-5 small opacity-75">
                    © 2024 Mediconnect System
                </div>
            </div>
        </div>

        {/* Right Column: Login Form */}
        <div className="col-md-6 bg-white p-5 d-flex flex-column justify-content-center">
            <div className="text-center mb-4">
                <h3 className="fw-bold text-dark mb-2">Welcome Back!</h3>
                <p className="text-muted">Please sign in to access your account</p>
            </div>

            {error && (
                <div className="alert alert-danger d-flex align-items-center" role="alert">
                    <i className="fas fa-exclamation-circle me-2"></i>
                    <div>{error}</div>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="mb-3">
                    <label htmlFor="loginEmail" className="form-label text-secondary fw-semibold small">Email Address</label>
                    <div className="input-group">
                        <span className="input-group-text bg-light border-end-0 text-secondary" style={{borderTopLeftRadius: '10px', borderBottomLeftRadius: '10px', border: '1px solid #e2e8f0'}}>
                            <i className="fas fa-envelope"></i>
                        </span>
                        <input
                            type="email"
                            className="form-control form-control-custom border-start-0 ps-0"
                            id="loginEmail"
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{borderTopLeftRadius: 0, borderBottomLeftRadius: 0}}
                        />
                    </div>
                </div>

                <div className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                        <label htmlFor="loginPassword" class="form-label text-secondary fw-semibold small">Password</label>
                        <Link to="/forgot-password" class="text-primary small text-decoration-none fw-semibold">Forgot Password?</Link>
                    </div>
                    <div className="input-group">
                        <span className="input-group-text bg-light border-end-0 text-secondary" style={{borderTopLeftRadius: '10px', borderBottomLeftRadius: '10px', border: '1px solid #e2e8f0'}}>
                            <i className="fas fa-lock"></i>
                        </span>
                        <input
                            type="password"
                            className="form-control form-control-custom border-start-0 ps-0"
                            id="loginPassword"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{borderTopLeftRadius: 0, borderBottomLeftRadius: 0}}
                        />
                    </div>
                </div>

                <button type="submit" className="btn btn-primary btn-lg w-100 btn-login text-white mb-4" disabled={isLoading}>
                    {isLoading ? (
                        <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Signing In...
                        </>
                    ) : (
                        'Sign In'
                    )}
                </button>
            </form>

            <div className="text-center">
                <p className="text-muted mb-4 position-relative">
                    <span className="bg-white px-3 position-relative z-1 small">Or continue with</span>
                    <span className="position-absolute top-50 start-0 w-100 border-top z-0"></span>
                </p>
                <div className="d-flex justify-content-center gap-3 mb-4">
                    <a href="#" className="social-btn"><i className="fab fa-google"></i></a>
                    <a href="#" className="social-btn"><i className="fab fa-facebook-f"></i></a>
                    <a href="#" className="social-btn"><i className="fab fa-twitter"></i></a>
                </div>
                <p className="mb-0">
                    Don't have an account? 
                    <Link to="/signup" className="fw-bold text-primary ms-1 text-decoration-none">Sign Up Now</Link>
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;