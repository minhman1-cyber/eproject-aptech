import React, { useState, useEffect } from 'react';
import AdminArticleManager from '../components/AdminArticleManager';
import AdminQualificationManager from '../components/AdminQualificationManagers';
import AdminCityManager from '../components/AdminCityManager';
import AdminDoctorManager from '../components/AdminDoctorManager';
import AdminPatientManager from '../components/AdminPatientManager';

// --- COMPONENT PHỤ: THẺ THỐNG KÊ (STAT CARD) ---
const StatCard = ({ title, value, subtext, icon, color }) => (
  <div className="card border-0 shadow-sm h-100 feature-box m-0"> {/* Thêm class feature-box để có hiệu ứng hover từ CSS mới */}
    <div className="card-body">
      <div className="d-flex align-items-center mb-3">
        <div className={`icon-square rounded-3 bg-${color} bg-opacity-10 text-${color} me-3 d-flex align-items-center justify-content-center`} style={{ width: '48px', height: '48px' }}>
          <i className={`fas ${icon} fa-lg`}></i>
        </div>
        <h6 className="card-subtitle text-muted text-uppercase mb-0">{title}</h6>
      </div>
      <h2 className="card-title mb-0 fw-bold">{value}</h2>
      <small className="text-muted">{subtext}</small>
    </div>
  </div>
);

// --- COMPONENT PHỤ: SIDEBAR ---
const Sidebar = ({ activeTab, setActiveTab }) => (
  <div className="d-flex flex-column flex-shrink-0 p-3 bg-white shadow-sm h-100" style={{ width: '280px', transition: 'all 0.3s', zIndex: 1000 }}>
    <a href="/" className="d-flex align-items-center mb-3 mb-md-0 me-md-auto link-dark text-decoration-none">
      {/* Đổi màu icon sang primary-custom */}
      <i className="fas fa-user-shield text-primary-custom fa-2x me-2"></i>
      <span className="fs-4 fw-bold" style={{ color: 'var(--secondary-color)' }}>Admin Portal</span>
    </a>
    <hr />
    <ul className="nav nav-pills flex-column mb-auto">
      <li className="nav-item mb-1">
        <button 
          className={`nav-link w-100 text-start ${activeTab === 'dashboard' ? 'active bg-primary-custom' : 'link-dark'}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <i className="fas fa-tachometer-alt me-2" style={{width: '24px'}}></i> Tổng quan
        </button>
      </li>
      <li className="nav-item mb-1">
        <button 
          className={`nav-link w-100 text-start ${activeTab === 'articles' ? 'active bg-primary-custom' : 'link-dark'}`}
          onClick={() => setActiveTab('articles')}
        >
          <i className="fas fa-newspaper me-2" style={{width: '24px'}}></i> Quản lý Bài viết
        </button>
      </li>
      <li className="nav-item mb-1">
        <button 
          className={`nav-link w-100 text-start ${activeTab === 'doctors' ? 'active bg-primary-custom' : 'link-dark'}`}
          onClick={() => setActiveTab('doctors')}
        >
          <i className="fas fa-user-md me-2" style={{width: '24px'}}></i> Quản lý Bác sĩ
        </button>
      </li>
      <li className="nav-item mb-1">
        <button 
          className={`nav-link w-100 text-start ${activeTab === 'patients' ? 'active bg-primary-custom' : 'link-dark'}`}
          onClick={() => setActiveTab('patients')}
        >
          <i className="fas fa-users me-2" style={{width: '24px'}}></i> Quản lý Bệnh nhân
        </button>
      </li>
      <li className="nav-item mb-1">
        <button 
          className={`nav-link w-100 text-start ${activeTab === 'cities' ? 'active bg-primary-custom' : 'link-dark'}`}
          onClick={() => setActiveTab('cities')}
        >
          <i className="fas fa-city me-2" style={{width: '24px'}}></i> Quản lý Thành phố
        </button>
      </li>
      <li className="nav-item mb-1">
        <button 
          className={`nav-link w-100 text-start ${activeTab === 'degrees' ? 'active bg-primary-custom' : 'link-dark'}`}
          onClick={() => setActiveTab('degrees')}
        >
          <i className="fas fa-graduation-cap me-2" style={{width: '24px'}}></i> Quản lý Bằng cấp
        </button>
      </li>
    </ul>
    <hr />
    <div className="d-flex align-items-center p-2 rounded hover-bg-light" style={{ cursor: 'pointer' }}>
      {/* Cập nhật màu background avatar theo mã màu #439fe0 */}
      <img src="https://ui-avatars.com/api/?name=Admin+User&background=439fe0&color=fff" alt="Admin" width="40" height="40" className="rounded-circle me-2" />
      <div>
        <strong>Administrator</strong>
        <div className="small text-muted">Super Admin</div>
      </div>
      <div className="ms-auto text-muted"><i className="fas fa-sign-out-alt"></i></div>
    </div>
  </div>
);

// --- COMPONENT MOCK (GIAO DIỆN GIẢ CHO CÁC CHỨC NĂNG CHƯA CÓ) ---
const MockManager = ({ title, icon, color }) => (
  <div className="card shadow-sm border-0">
    <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
      <h5 className="mb-0 fw-bold text-secondary"><i className={`fas ${icon} me-2 text-${color}`}></i>{title}</h5>
      <button className={`btn btn-${color} btn-sm`}><i className="fas fa-plus me-1"></i> Thêm mới</button>
    </div>
    <div className="card-body text-center py-5">
      <div className={`bg-${color} bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3`} style={{width: '80px', height: '80px'}}>
        <i className={`fas ${icon} fa-3x text-${color}`}></i>
      </div>
      <h4 className="text-muted">Chức năng đang phát triển</h4>
      <p className="text-muted mb-4">Giao diện quản lý {title} sẽ được cập nhật sớm.</p>
      <div className="table-responsive">
        <table className="table table-bordered table-hover">
            <thead className="table-light">
                <tr><th>ID</th><th>Tên</th><th>Trạng thái</th><th>Hành động</th></tr>
            </thead>
            <tbody>
                <tr><td>1</td><td>Dữ liệu mẫu A</td><td><span className="badge bg-success">Active</span></td><td><button className="btn btn-sm btn-outline-primary">Sửa</button></td></tr>
                <tr><td>2</td><td>Dữ liệu mẫu B</td><td><span className="badge bg-secondary">Inactive</span></td><td><button className="btn btn-sm btn-outline-primary">Sửa</button></td></tr>
            </tbody>
        </table>
      </div>
    </div>
  </div>
);

// --- COMPONENT TRANG TỔNG QUAN (DASHBOARD HOME) ---
const DashboardHome = () => (
  <div className="fade-in">
    {/* Stats Row */}
    <div className="row g-3 mb-4">
      <div className="col-md-3">
        <StatCard title="Tổng Bác sĩ" value="124" subtext="+5 tuần này" icon="user-md" color="primary" />
      </div>
      <div className="col-md-3">
        <StatCard title="Tổng Bệnh nhân" value="8,540" subtext="+120 hôm nay" icon="users" color="success" />
      </div>
      <div className="col-md-3">
        <StatCard title="Lịch hẹn (Hôm nay)" value="42" subtext="8 đang chờ xử lý" icon="calendar-check" color="warning" />
      </div>
      <div className="col-md-3">
        <StatCard title="Doanh thu (Tháng)" value="450M" subtext="+12% so với tháng trước" icon="coins" color="danger" />
      </div>
    </div>

    <div className="row g-4">
      {/* Biểu đồ / Hoạt động gần đây */}
      <div className="col-lg-7">
        <AdminArticleManager isWidget={true} />
      </div>

      {/* Thống kê nhanh */}
      <div className="col-lg-5">
        <div className="card border-0 shadow-sm mb-4">
              
           <AdminQualificationManager isWidget={true} />
        </div>

        <div className="card bg-primary-custom text-white border-0 shadow-sm">
            <div className="card-body text-center">
                <h5 className="mb-2">Cần hỗ trợ?</h5>
                <p className="small text-white-50 mb-3">Liên hệ đội ngũ kỹ thuật nếu gặp sự cố.</p>
                <button className="btn btn-light btn-sm fw-bold text-primary-custom">Liên hệ IT</button>
            </div>
        </div>
      </div>
    </div>
  </div>
);

// --- MAIN COMPONENT: ADMIN DASHBOARD ---
const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Responsive check
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Inject Styles (Bootstrap & FontAwesome)
  useEffect(() => {
    const bsLink = document.createElement("link");
    bsLink.href = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css";
    bsLink.rel = "stylesheet";
    document.head.appendChild(bsLink);

    const faLink = document.createElement("link");
    faLink.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
    faLink.rel = "stylesheet";
    document.head.appendChild(faLink);

    const fontLink = document.createElement("link");
    fontLink.href = "https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap"; // Đổi sang Open Sans cho khớp CSS
    fontLink.rel = "stylesheet";
    document.head.appendChild(fontLink);

    const bsScript = document.createElement("script");
    bsScript.src = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js";
    document.body.appendChild(bsScript);

    return () => {
      document.head.removeChild(bsLink);
      document.head.removeChild(faLink);
      document.head.removeChild(fontLink);
      document.body.removeChild(bsScript);
    };
  }, []);

  // Render Content based on Active Tab
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardHome />;
      case 'articles':
        return (
          <div className="fade-in">
             {/* Import component quản lý bài viết thực tế */}
             <AdminArticleManager /> 
          </div>
        );
      case 'doctors':
        return (
          <div className="fade-in">
             {/* Import component quản lý bài viết thực tế */}
             <AdminDoctorManager /> 
          </div>
        );
      case 'patients':
        return (
          <div className="fade-in">
             {/* Import component quản lý bài viết thực tế */}
             <AdminPatientManager /> 
          </div>
        );
      case 'cities':
        return (
          <div className="fade-in">
             {/* Import component quản lý bài viết thực tế */}
             <AdminCityManager /> 
          </div>
        );
      case 'degrees':
        return (
          <div className="fade-in">
             {/* Import component quản lý bài viết thực tế */}
             <AdminQualificationManager /> 
          </div>
        );
      default:
        return <DashboardHome />;
    }
  };

  return (
    <div className="d-flex h-100" style={{ minHeight: '100vh', fontFamily: "'Open Sans', sans-serif", backgroundColor: 'var(--bg-light)' }}>
      {/* GHÉP CSS CỦA BẠN VÀO ĐÂY */}
      <style>{`
        /* --- CUSTOM STYLES TỪ USER --- */
        :root {
            --primary-color: #439fe0; /* Xanh y tế sáng */
            --secondary-color: #333333; /* Đen xám */
            --text-color: #777777; /* Xám chữ */
            --bg-light: #f5f5f5;
            --dark-footer: #1e1e1e;
            --footer-blue-1: #439fe0;
            --footer-blue-2: #358cd2;
            --footer-blue-3: #297bbf;
        }

        body {
            font-family: 'Open Sans', sans-serif;
            color: var(--text-color);
            overflow-x: hidden;
        }

        h1, h2, h3, h4, h5, h6 {
            color: var(--secondary-color);
            font-weight: 700;
        }

        a { text-decoration: none; }

        .text-primary-custom { color: var(--primary-color) !important; }
        .bg-primary-custom { background-color: var(--primary-color) !important; }

        /* Dashboard Specific Overrides */
        .hover-bg-light:hover { background-color: #e9ecef; }
        .fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
        /* Ghi đè class active của Bootstrap Nav Pills để dùng màu xanh */
        .nav-pills .nav-link.active { 
            background-color: var(--primary-color) !important; 
        }
        
        /* Thêm hiệu ứng hover cho feature-box (dùng cho StatCard) */
        .feature-box {
            background: #fff;
            transition: transform 0.3s;
        }
        .feature-box:hover {
            transform: translateY(-5px);
        }
      `}</style>

      {/* Sidebar (Desktop) */}
      {!isMobile && <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />}

      <div className="flex-grow-1 d-flex flex-column" style={{ maxHeight: '100vh', overflow: 'hidden' }}>
        {/* Mobile Header */}
        {isMobile && (
          <nav className="navbar navbar-light bg-white border-bottom px-3 flex-shrink-0">
             <div className="d-flex align-items-center">
                <i className="fas fa-user-shield text-primary-custom fa-lg me-2"></i>
                <span className="fw-bold" style={{color: 'var(--secondary-color)'}}>Admin Portal</span>
             </div>
             <button className="btn btn-sm btn-outline-secondary" onClick={() => alert("Menu mobile chưa implement")}>
                <i className="fas fa-bars"></i>
             </button>
          </nav>
        )}

        {/* Top Header (Desktop) */}
        {!isMobile && (
            <div className="bg-white border-bottom px-4 py-3 d-flex justify-content-between align-items-center flex-shrink-0">
                <h4 className="mb-0 fw-bold" style={{ color: 'var(--secondary-color)' }}>
                    {activeTab === 'dashboard' ? 'Tổng Quan Hệ Thống' : 
                     activeTab === 'articles' ? 'Quản Lý Bài Viết Y Tế' : 
                     activeTab === 'doctors' ? 'Danh Sách Bác Sĩ' :
                     activeTab === 'patients' ? 'Hồ Sơ Bệnh Nhân' :
                     activeTab === 'cities' ? 'Danh Mục Thành Phố' : 'Danh Mục Bằng Cấp'}
                </h4>
                <div className="d-flex gap-3">
                    <button className="btn btn-light rounded-circle position-relative">
                        <i className="fas fa-bell text-muted"></i>
                        <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle"></span>
                    </button>
                    <button className="btn btn-light rounded-circle">
                        <i className="fas fa-cog text-muted"></i>
                    </button>
                </div>
            </div>
        )}

        {/* Main Content Scrollable Area */}
        <div className="p-4 overflow-auto flex-grow-1" style={{ backgroundColor: 'var(--bg-light)' }}>
            {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;