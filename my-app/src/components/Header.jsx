import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';

function Header() {
    // State để quản lý trạng thái đóng/mở của menu
    const [isOpen, setIsOpen] = useState(false);
    // State để kiểm tra trạng thái đăng nhập
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    
    const navigate = useNavigate();
    const location = useLocation(); // Hook để theo dõi sự thay đổi của URL

    // URL API Logout
    const LOGOUT_API_URL = 'http://localhost:8888/api/v1/controllers/logout.php';

    // Hàm toggle menu
    const toggleMenu = () => {
        setIsOpen(!isOpen);
    };

    // Hàm tiện ích để lấy User Role từ LocalStorage (thay vì Cookie)
    const getUserRole = () => {
        return localStorage.getItem('user_role');
    };

    // Kiểm tra trạng thái đăng nhập mỗi khi đường dẫn (location) thay đổi
    useEffect(() => {
        const role = getUserRole();
        // Chuyển đổi sang boolean để set state
        setIsLoggedIn(!!role);
    }, [location]); 

    // Xử lý khi click vào nút Dashboard
    const handleDashboardClick = () => {
        const role = getUserRole();
        
        if (!role) {
            setIsLoggedIn(false);
            navigate('/'); // Về trang login
            return;
        }

        // Chuyển hướng dựa trên role
        switch (role) {
            case 'PATIENT':
                navigate('/patient/dashboard');
                break;
            case 'DOCTOR':
                navigate('/doctor/dashboard');
                break;
            case 'ADMIN':
                navigate('/admin/dashboard');
                break;
            default:
                navigate('/home'); 
                break;
        }
    };

    // Hàm xử lý Đăng xuất (Updated)
    const handleLogout = async () => {
        try {
            // 1. Gọi API Logout phía Server để hủy session PHP
            // Sử dụng credentials: 'include' để gửi cookie session hiện tại lên server
            await fetch(LOGOUT_API_URL, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error("Lỗi khi gọi API đăng xuất:", error);
            // Vẫn tiếp tục xử lý client logout dù API lỗi mạng
        }

        // 2. Xóa thông tin trong localStorage phía Client
        localStorage.removeItem('user_role');
        
        // 3. Cập nhật state
        setIsLoggedIn(false);
        
        // 4. Chuyển hướng về trang login
        navigate('/');
    };

    // Định nghĩa danh sách menu và đường dẫn tương ứng
    const menuItems = [
        { name: 'Home', path: '/home' },
        { name: 'Library', path: '/lib' },
        { name: 'Pages', path: '/pages' },
        { name: 'Departments', path: '/departments' },
        { name: 'Timetable', path: '/timetable' },
        { name: 'Gallery', path: '/gallery' },
        { name: 'Contact', path: '/contactus' },
    ];

    return (
        <div className="mediconnect-header-wrapper">
            <style>
                {`
                    /* Cô lập style bằng class wrapper */
                    .mediconnect-header-wrapper {
                        /* Đặt lại các thuộc tính cơ bản để tránh bị ảnh hưởng bởi global css */
                        font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
                        font-size: 15px !important; /* Giảm cỡ chữ xuống 15px */
                        line-height: 1.5 !important;
                        color: #212529 !important;
                        text-align: left !important;

                        /* Sticky properties moved here */
                        position: sticky !important;
                        top: 0 !important;
                        z-index: 1020 !important; /* Bootstrap sticky z-index */
                        width: 100% !important;
                        background-color: #fff !important; /* Đảm bảo nền trắng khi dính */
                    }

                    .mediconnect-header-wrapper a {
                        text-decoration: none !important;
                    }

                    /* Style riêng cho Header Bar để thêm viền dưới */
                    .mediconnect-header-wrapper .header-bar {
                        border-bottom: 3px solid #0d6efd !important; /* Viền xanh dưới cùng tạo điểm nhấn */
                    }

                    /* Hiệu ứng hover cho nav-link (Desktop) */
                    @media (min-width: 992px) {
                        .mediconnect-header-wrapper .navbar-custom .nav-link {
                            position: relative;
                            transition: color 0.3s ease;
                            font-size: 13px !important; /* Giảm cỡ chữ menu */
                            font-weight: 500 !important;
                        }
                        .mediconnect-header-wrapper .navbar-custom .nav-link::after {
                            content: '';
                            position: absolute;
                            width: 0;
                            height: 2px;
                            bottom: 0;
                            left: 50%;
                            background-color: #0d6efd;
                            transition: all 0.3s ease;
                            transform: translateX(-50%);
                        }
                        .mediconnect-header-wrapper .navbar-custom .nav-link:hover::after,
                        .mediconnect-header-wrapper .navbar-custom .nav-link.active::after {
                            width: 80%;
                        }
                        .mediconnect-header-wrapper .navbar-custom .nav-link:hover {
                            color: #0d6efd !important;
                        }
                    }

                    /* Tùy chỉnh cho Mobile Menu (Responsive) */
                    @media (max-width: 991.98px) {
                        /* Ẩn menu mặc định nhưng giữ transition */
                        .mediconnect-header-wrapper .navbar-collapse {
                            max-height: 0;
                            overflow: hidden;
                            transition: max-height 0.4s ease-in-out, opacity 0.4s ease-in-out;
                            opacity: 0;
                            display: block !important; /* Ghi đè display: none của Bootstrap */
                        }
                        
                        /* Khi có class show */
                        .mediconnect-header-wrapper .navbar-collapse.show {
                            max-height: 500px; /* Chiều cao đủ lớn để chứa nội dung */
                            opacity: 1;
                        }

                        /* Style cho các item trong mobile để đẹp hơn */
                        .mediconnect-header-wrapper .navbar-nav {
                            padding-top: 1rem;
                            padding-bottom: 1rem;
                            background-color: #f8f9fa; /* Màu nền nhẹ cho menu mobile */
                            border-radius: 0.5rem;
                            margin-top: 0.5rem;
                        }
                        
                        .mediconnect-header-wrapper .nav-item {
                            padding: 5px 15px;
                        }
                    }

                    /* Nút bấm cô lập style */
                    .mediconnect-header-wrapper .btn-header {
                        font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
                        font-weight: 700 !important;
                        font-size: 13px !important; /* Giảm nhẹ cỡ chữ nút bấm */
                        padding: 0.375rem 1.25rem !important;
                        border-radius: 50rem !important; /* rounded-pill */
                        display: inline-flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        min-width: 110px !important;
                        transition: all 0.2s ease-in-out !important;
                        cursor: pointer !important;
                    }
                    
                    /* Primary Button */
                    .mediconnect-header-wrapper .btn-header-primary {
                        color: #fff !important;
                        background-color: #0d6efd !important;
                        border: 1px solid #0d6efd !important;
                    }
                    .mediconnect-header-wrapper .btn-header-primary:hover {
                        background-color: #0b5ed7 !important;
                        border-color: #0a58ca !important;
                    }

                    /* Outline Button */
                    .mediconnect-header-wrapper .btn-header-outline {
                        color: #0d6efd !important;
                        background-color: transparent !important;
                        border: 1px solid #0d6efd !important;
                    }
                    .mediconnect-header-wrapper .btn-header-outline:hover {
                        color: #fff !important;
                        background-color: #0d6efd !important;
                        border-color: #0d6efd !important;
                    }
                    
                    /* Danger Button (Logout) */
                    .mediconnect-header-wrapper .btn-header-danger {
                        color: #dc3545 !important;
                        background-color: transparent !important;
                        border: 1px solid #dc3545 !important;
                        min-width: auto !important; /* Nút logout nhỏ hơn */
                        padding: 0.375rem 1rem !important;
                    }
                    .mediconnect-header-wrapper .btn-header-danger:hover {
                        color: #fff !important;
                        background-color: #dc3545 !important;
                    }
                `}
            </style>
            
            <header className="bg-white shadow-sm header-bar">
                <div className="container py-2">
                    <div className="row align-items-center">
                        {/* Logo Section */}
                        <div className="col-lg-3 col-md-12 mb-3 mb-lg-0">
                            <div className="d-flex align-items-center justify-content-between">
                                {/* Logo Link to Home */}
                                <Link to="/home" className="d-flex align-items-center gap-2 text-decoration-none">
                                    <i className="fas fa-plus-square text-primary fa-2x"></i>
                                    <h3 className="m-0 fw-bold text-dark" style={{fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '1.5rem'}}>Mediconnect</h3>
                                </Link>

                                {/* Nút Toggler */}
                                <button 
                                    className={`navbar-toggler ms-auto ${!isOpen ? 'collapsed' : ''}`} 
                                    type="button" 
                                    onClick={toggleMenu} 
                                    aria-expanded={isOpen}
                                    aria-label="Toggle navigation"
                                    style={{ border: 'none', padding: '0.5rem' }} 
                                >
                                    <i className="fas fa-bars fa-lg text-primary d-lg-none"></i>
                                </button>
                            </div>
                        </div>

                        {/* Navigation Section */}
                        <div className="col-lg-9 col-md-12">
                            <nav className="navbar navbar-expand-lg navbar-light navbar-custom p-0">
                                <div className={`collapse navbar-collapse justify-content-end ${isOpen ? 'show' : ''}`} id="navbarNav">
                                    <ul className="navbar-nav align-items-center gap-1">
                                        {/* Menu Items */}
                                        {menuItems.map((item, index) => (
                                            <li className="nav-item w-100 w-lg-auto" key={index}>
                                                <NavLink 
                                                    to={item.path}
                                                    className={({ isActive }) => 
                                                        `nav-link px-3 ${isActive ? 'active text-primary' : 'text-secondary'}`
                                                    }
                                                >
                                                    {item.name}
                                                </NavLink>
                                            </li>
                                        ))}

                                        {/* Divider for Mobile View */}
                                        <li className="d-lg-none w-100 border-top my-2"></li>

                                        {/* Action Buttons: Thay đổi dựa trên trạng thái đăng nhập */}
                                        <li className="nav-item ms-lg-3 d-flex flex-column flex-lg-row align-items-stretch align-items-lg-center gap-2 px-3 px-lg-0 pb-2 pb-lg-0">
                                            {isLoggedIn ? (
                                                <div className="d-flex gap-2">
                                                    <button 
                                                        onClick={handleDashboardClick}
                                                        className="btn-header btn-header-primary shadow-sm text-decoration-none border-0"
                                                    >
                                                        Dashboard
                                                    </button>
                                                    <button 
                                                        onClick={handleLogout}
                                                        className="btn-header btn-header-danger text-decoration-none"
                                                        title="Sign Out"
                                                    >
                                                        <i className="fas fa-sign-out-alt"></i>
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <Link 
                                                        to="/" 
                                                        className="btn-header btn-header-primary shadow-sm text-decoration-none"
                                                    >
                                                        Sign In
                                                    </Link>
                                                    
                                                    <Link 
                                                        to="/signupbenhnhan" 
                                                        className="btn-header btn-header-outline text-decoration-none"
                                                    >
                                                        Sign Up
                                                    </Link>
                                                </>
                                            )}
                                        </li>
                                    </ul>
                                </div>
                            </nav>
                        </div>
                    </div>
                </div>
            </header>
        </div>
    )
}

export default Header;