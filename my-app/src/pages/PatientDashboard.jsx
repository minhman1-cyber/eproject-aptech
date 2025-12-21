import React, { useState, useEffect, useCallback } from 'react';

// --- MÔI TRƯỜNG DEV LOCAL: BỎ COMMENT CÁC DÒNG DƯỚI ĐỂ SỬ DỤNG FILE THẬT ---
import PatientAppointmentList from '../components/PatientAppointmentList';
import PatientAppointmentBookers from '../components/PatientAppointmentBookers';
import PatientProfile from '../components/PatientProfiles';

// =======================================================
// 1. CÁC COMPONENT GIẢ LẬP (PLACEHOLDER)
// =======================================================
// const PatientAppointmentList = () => (
//   <div className="card shadow-sm border-0 rounded-3 h-100">
//     <div className="card-body text-center p-5">
//       <i className="fas fa-calendar-check fa-3x text-primary mb-3"></i>
//       <h5 className="text-secondary fw-bold">Patient Appointment List Component</h5>
//       <p className="text-muted small">
//         Component này sẽ được load từ file <code>../components/PatientAppointmentList</code>
//       </p>
//     </div>
//   </div>
// );

// const PatientAppointmentBookers = () => (
//   <div className="card shadow-sm border-0 rounded-3 h-100">
//     <div className="card-body text-center p-5">
//       <i className="fas fa-user-md fa-3x text-success mb-3"></i>
//       <h5 className="text-secondary fw-bold">Patient Appointment Bookers Component</h5>
//       <p className="text-muted small">
//         Component này sẽ được load từ file <code>../components/PatientAppointmentBookers</code>
//       </p>
//       <div className="alert alert-info d-inline-block mt-3">
//          Chức năng: Tìm bác sĩ, Xem lịch rảnh, Đặt lịch hẹn
//       </div>
//     </div>
//   </div>
// );

// // Mock Modal Đổi Mật Khẩu (để code chạy được)
// const ChangePasswordModal = ({ isModalOpen, closeModal }) => {
//     if (!isModalOpen) return null;
//     return (
//         <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
//             <div className="modal-dialog modal-dialog-centered">
//                 <div className="modal-content">
//                     <div className="modal-header"><h5 className="modal-title">Đổi mật khẩu</h5><button className="btn-close" onClick={closeModal}></button></div>
//                     <div className="modal-body text-center p-4">
//                         <p>Form đổi mật khẩu sẽ hiển thị ở đây.</p>
//                         <button className="btn btn-secondary" onClick={closeModal}>Đóng</button>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// =======================================================
// 2. TÍCH HỢP PATIENT PROFILE (VỚI CHẾ ĐỘ WIDGET)
// =======================================================

const API_PROFILE_URL = 'http://localhost:8888/api/v1/controllers/patient_profile.php';
const API_AVATAR_UPLOAD_URL = 'http://localhost:8888/api/v1/upload/patient_avatar.php'; 
const dummyCities = [{ id: 1, name: 'Hồ Chí Minh' }, { id: 2, name: 'Hà Nội' }];

// Hàm fetch API chung
const useFetchApi = () => {
    return useCallback(async (url, options = {}) => {
        const response = await fetch(url, {
            ...options,
            credentials: 'include',
            headers: {
                ...(options.headers || {}),
                'Content-Type': options.body instanceof FormData ? undefined : 'application/json',
            },
        });

        if (response.status === 401) throw new Error("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Lỗi hệ thống không xác định.');
            return data;
        }
        if (!response.ok) throw new Error('Thao tác thất bại (Lỗi Server).');
        return {};
    }, []);
};

// Component PatientProfiles (Đã sửa để hỗ trợ Widget)
const PatientProfiles = ({ isWidget = false, setActiveTab }) => {
    const [formData, setFormData] = useState({
        id: null,
        fullName: 'Đang tải...',
        email: '',
        phone: '',
        address: '',
        cityId: '',
        profilePicture: 'https://placehold.co/150x150/AFD1E4/FFFFFF/png?text=Avatar',
    });
    const [avatarFile, setAvatarFile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    
    const fetchApi = useFetchApi();

    const fetchProfile = useCallback(async () => {
        setError(null);
        // Nếu là widget thì không set loading toàn màn hình để tránh giật giao diện chính
        if (!isWidget) setIsLoading(true); 
        try {
            const data = await fetchApi(API_PROFILE_URL, { method: 'GET' });
            setFormData({
                id: data.data.id,
                fullName: data.data.fullName || '',
                email: data.data.email || '',
                phone: data.data.phone || '',
                address: data.data.address || '',
                cityId: String(data.data.cityId || ''),
                profilePicture: data.data.profilePicture || 'https://placehold.co/150x150/AFD1E4/FFFFFF/png?text=Avatar',
            });
        } catch (err) {
            // Ở chế độ widget, nếu lỗi cũng không cần hiện quá to
            if(!isWidget) setError(err.message);
            console.error("Lỗi profile:", err.message);
        } finally {
            setIsLoading(false);
        }
    }, [fetchApi, isWidget]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatarFile(file);
            setFormData(prev => ({ ...prev, profilePicture: URL.createObjectURL(file) }));
        }
    };
    
    const uploadAvatar = async (file) => {
        setError(null); setSuccessMessage(null);
        const avatarFormData = new FormData();
        avatarFormData.append('avatar', file);
        try {
            const data = await fetchApi(API_AVATAR_UPLOAD_URL, { method: 'POST', body: avatarFormData });
            setFormData(prev => ({...prev, profilePicture: data.newAvatarUrl})); 
            setSuccessMessage("Avatar đã được cập nhật thành công!");
            setAvatarFile(null); 
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null); setSuccessMessage(null); setIsLoading(true);
        if (avatarFile) {
            const uploaded = await uploadAvatar(avatarFile);
            if (!uploaded) { setIsLoading(false); return; }
        }
        const payload = {
            fullName: formData.fullName,
            phone: formData.phone,
            address: formData.address,
            cityId: parseInt(formData.cityId),
        };
        try {
            await fetchApi(API_PROFILE_URL, {
                method: 'PUT',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
            });
            setSuccessMessage("Thông tin hồ sơ đã được cập nhật thành công!");
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // --- RENDER CHẾ ĐỘ WIDGET (DÙNG CHO DASHBOARD HOME) ---
    if (isWidget) {
        return (
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body text-center p-4">
                    <div className="position-relative d-inline-block mb-3">
                        <img 
                            src={formData.profilePicture} 
                            alt="Avatar" 
                            className="rounded-circle border border-3 border-white shadow-sm" 
                            width="100" height="100" 
                            style={{objectFit: 'cover'}}
                        />
                        <span className="position-absolute bottom-0 end-0 p-2 bg-success border border-light rounded-circle"></span>
                    </div>
                    <h5 className="fw-bold mb-1">{isLoading ? 'Đang tải...' : formData.fullName}</h5>
                    <div className="badge bg-light text-secondary mb-3 border">
                        <i className="fas fa-id-card me-1"></i> {formData.id ? `BN-${formData.id}` : '...'}
                    </div>
                    <div className="d-grid gap-2">
                        <button className="btn btn-outline-primary btn-sm" onClick={() => setActiveTab('profile')}>
                            <i className="fas fa-user-edit me-1"></i> Chỉnh sửa hồ sơ
                        </button>
                    </div>
                </div>
                {/* Phần thống kê bên dưới sẽ được DashboardHome render riêng hoặc có thể đưa vào đây nếu muốn */}
            </div>
        );
    }

    // --- RENDER CHẾ ĐỘ FULL (DÙNG CHO TAB TÀI KHOẢN) ---
    if (isLoading) return <div className="text-center py-5"><i className="bi bi-arrow-clockwise fs-3 animate-spin me-2"></i>Đang tải dữ liệu hồ sơ...</div>;
    
    return (
        <div className="container py-2">
            <h4 className="fw-bold text-primary mb-4">Hồ sơ cá nhân</h4>
            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            {successMessage && <div className="alert alert-success" role="alert">{successMessage}</div>}
            
            <div className="row">
                {/* Cột 1: Avatar */}
                <div className="col-md-4">
                    <div className="card shadow-sm p-3 mb-4 text-center border-0">
                        <img 
                            src={formData.profilePicture} 
                            className="rounded-circle mx-auto mb-3" 
                            alt="Patient Avatar" 
                            style={{ width: '150px', height: '150px', objectFit: 'cover' }}
                        />
                        <div className="mb-3">
                            <label htmlFor="avatarUpload" className="btn btn-outline-secondary btn-sm">
                                <i className="bi bi-camera-fill me-2"></i> Đổi Avatar
                            </label>
                            <input type="file" id="avatarUpload" name="avatar" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
                        </div>
                        <button type="button" className="btn btn-warning btn-sm" onClick={() => setIsPasswordModalOpen(true)}>
                            Đổi Mật khẩu
                        </button>
                    </div>
                </div>

                {/* Cột 2: Form Cập Nhật */}
                <div className="col-md-8">
                    <form onSubmit={handleSubmit} className="card p-4 shadow-sm border-0">
                        <h5 className="mb-3 text-secondary">Thông tin chi tiết</h5>
                        <div className="row mb-3">
                            <div className="col-md-6 mb-3">
                                <label className="form-label fw-bold small text-muted">Họ tên đầy đủ</label>
                                <input type="text" className="form-control" name="fullName" value={formData.fullName} onChange={handleChange} required />
                            </div>
                            <div className="col-md-6 mb-3">
                                <label className="form-label fw-bold small text-muted">Email</label>
                                <input type="email" className="form-control" name="email" value={formData.email} onChange={handleChange} disabled /> 
                            </div>
                            <div className="col-md-6 mb-3">
                                <label className="form-label fw-bold small text-muted">Số điện thoại</label>
                                <input type="tel" className="form-control" name="phone" value={formData.phone} onChange={handleChange} />
                            </div>
                            <div className="col-md-6 mb-3">
                                <label className="form-label fw-bold small text-muted">Thành phố</label>
                                <select className="form-select" name="cityId" value={formData.cityId} onChange={handleChange} required>
                                    <option value="">Chọn thành phố...</option>
                                    {dummyCities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="col-md-12 mb-3">
                                <label className="form-label fw-bold small text-muted">Địa chỉ</label>
                                <input type="text" className="form-control" name="address" value={formData.address} onChange={handleChange} />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={isLoading}>
                             {isLoading ? 'Đang lưu...' : 'Cập nhật Thông tin'}
                        </button>
                    </form>
                </div>
            </div>
            {/* <ChangePasswordModal isModalOpen={isPasswordModalOpen} closeModal={() => setIsPasswordModalOpen(false)} /> */}
        </div>
    );
};

// =======================================================
// 3. MAIN DASHBOARD UI
// =======================================================

// --- MOCK DATA (DỮ LIỆU GIẢ LẬP CHO TRANG HOME - Phần Lịch hẹn) ---
const MOCK_APPOINTMENTS_HOME = [
  { id: 101, doctorName: 'ThS. BS. Trần Minh Tuấn', specialty: 'Tim mạch', date: '2025-05-20', time: '09:00', status: 'CONFIRMED', location: 'Phòng 201, Tầng 2' },
  { id: 102, doctorName: 'BS. Lê Thị Hoa', specialty: 'Da liễu', date: '2025-05-25', time: '14:30', status: 'PENDING', location: 'Phòng 105, Tầng 1' }
];

const StatusBadge = ({ status }) => {
  let color = 'secondary';
  let text = status;
  let icon = 'question-circle';
  switch (status) {
    case 'CONFIRMED': color = 'success'; text = 'Đã xác nhận'; icon = 'check-circle'; break;
    case 'PENDING': color = 'warning'; text = 'Chờ xác nhận'; icon = 'clock'; break;
    case 'CANCELLED': color = 'danger'; text = 'Đã hủy'; icon = 'times-circle'; break;
    case 'COMPLETED': color = 'primary'; text = 'Đã hoàn thành'; icon = 'file-medical-alt'; break;
    case 'BOOKED': color = 'primary'; text = 'Đã đặt'; icon = 'bookmark-check'; break;
    case 'RESCHEDULED': color = 'info'; text = 'Đã đổi lịch'; icon = 'arrow-repeat'; break;
    default: break;
  }
  return <span className={`badge bg-${color} bg-opacity-10 text-${color} border border-${color} px-2 py-1 rounded-pill`}><i className={`fas fa-${icon} me-1`}></i> {text}</span>;
};

// 1. DASHBOARD HOME TAB
const DashboardHome = ({ user, setActiveTab }) => {
  const appointments = MOCK_APPOINTMENTS_HOME;
  const upcoming = appointments.filter(a => (a.status === 'CONFIRMED' || a.status === 'PENDING') && new Date(a.date) >= new Date().setHours(0,0,0,0)).sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="fade-in">
      {/* Welcome Banner */}
      <div className="card border-0 shadow-sm mb-4 bg-primary-custom text-white overflow-hidden position-relative">
        <div className="card-body p-4 position-relative" style={{zIndex: 2}}>
          <h2 className="fw-bold">Xin chào! 👋</h2>
          <p className="mb-0 opacity-75">Chúc bạn một ngày tốt lành. Đừng quên giữ gìn sức khỏe nhé.</p>
        </div>
        <i className="fas fa-heartbeat position-absolute" style={{ fontSize: '150px', right: '-20px', bottom: '-40px', opacity: 0.15, transform: 'rotate(-20deg)' }}></i>
      </div>

      <div className="row g-4">
        {/* Cột trái: Sử dụng PatientProfiles ở chế độ WIDGET */}
        <div className="col-lg-4">
          
          {/* GỌI COMPONENT PROFILE Ở ĐÂY */}
          <PatientProfiles isWidget={true} setActiveTab={setActiveTab} />

          <div className="card border-0 shadow-sm mb-4">
             <div className="card-footer bg-white px-4 py-3">
                <div className="row text-center">
                    <div className="col-6 border-end">
                        <h6 className="mb-0 fw-bold text-primary">{appointments.length}</h6>
                        <small className="text-muted" style={{fontSize: '0.75rem'}}>Tổng lịch khám</small>
                    </div>
                    <div className="col-6">
                        <h6 className="mb-0 fw-bold text-success">{upcoming.length}</h6>
                        <small className="text-muted" style={{fontSize: '0.75rem'}}>Sắp tới</small>
                    </div>
                </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm bg-success text-white" style={{cursor: 'pointer'}} onClick={() => setActiveTab('booking')}>
             <div className="card-body d-flex align-items-center justify-content-between">
                 <div>
                     <h6 className="fw-bold mb-1">Đặt lịch khám mới</h6>
                     <small className="opacity-75">Chọn bác sĩ ngay</small>
                 </div>
                 <div className="bg-white bg-opacity-25 rounded-circle d-flex align-items-center justify-content-center" style={{width: '40px', height: '40px'}}>
                     <i className="fas fa-plus"></i>
                 </div>
             </div>
          </div>
        </div>

        {/* Cột phải */}
        <div className="col-lg-8">
            <h5 className="fw-bold text-secondary mb-3">
                <i className="fas fa-calendar-alt me-2 text-primary"></i>
                Lịch khám sắp tới
            </h5>
            {upcoming.length > 0 ? (
                upcoming.map((appt, index) => (
                    <div key={appt.id} className={`card border-0 shadow-sm mb-3 ${index === 0 ? 'border-start border-4 border-primary' : ''}`}>
                        <div className="card-body">
                            <div className="row align-items-center">
                                <div className="col-md-2 text-center mb-3 mb-md-0">
                                    <div className="bg-light rounded p-2 border">
                                        <h4 className="mb-0 fw-bold text-primary">{appt.date.split('-')[2]}</h4>
                                        <small className="text-uppercase fw-bold text-muted">Thg {appt.date.split('-')[1]}</small>
                                    </div>
                                    <div className="mt-1 badge bg-primary">{appt.time}</div>
                                </div>
                                <div className="col-md-7 mb-3 mb-md-0">
                                    <h6 className="fw-bold mb-1 text-dark">{appt.doctorName}</h6>
                                    <p className="text-muted small mb-2"><i className="fas fa-stethoscope me-1"></i> Chuyên khoa: {appt.specialty}</p>
                                    <p className="text-secondary small mb-0"><i className="fas fa-map-marker-alt me-1"></i> {appt.location}</p>
                                </div>
                                <div className="col-md-3 text-md-end">
                                    <StatusBadge status={appt.status} />
                                    {index === 0 && <div className="mt-2 text-muted small"><i className="fas fa-bell text-warning me-1"></i> Sắp diễn ra</div>}
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <div className="card border-0 shadow-sm py-5 text-center">
                    <div className="card-body">
                        <img src="https://cdn-icons-png.flaticon.com/512/7486/7486831.png" alt="No Data" width="80" className="mb-3 opacity-50" />
                        <h6 className="text-muted">Bạn không có lịch khám nào sắp tới.</h6>
                        <button className="btn btn-primary btn-sm mt-2" onClick={() => setActiveTab('booking')}>Đặt lịch ngay</button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

// --- MAIN LAYOUT COMPONENT ---
const PatientDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showSidebar, setShowSidebar] = useState(false);
  
  // App State (MOCK_USER không còn cần thiết cho profile, nhưng có thể giữ cho Header nếu cần)
  const [user] = useState({ fullName: 'Bệnh Nhân', avatar: 'https://placehold.co/60x60' });

  // Responsive check
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Inject CSS Libraries
  useEffect(() => {
    const bsLink = document.createElement("link");
    bsLink.href = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css";
    bsLink.rel = "stylesheet";
    document.head.appendChild(bsLink);

    const faLink = document.createElement("link");
    faLink.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
    faLink.rel = "stylesheet";
    document.head.appendChild(faLink);

    const biLink = document.createElement("link");
    biLink.href = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css";
    biLink.rel = "stylesheet";
    document.head.appendChild(biLink);

    const fontLink = document.createElement("link");
    fontLink.href = "https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap";
    fontLink.rel = "stylesheet";
    document.head.appendChild(fontLink);

    const bsScript = document.createElement("script");
    bsScript.src = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js";
    document.body.appendChild(bsScript);

    return () => {
      document.head.removeChild(bsLink);
      document.head.removeChild(faLink);
      document.head.removeChild(biLink);
      document.head.removeChild(fontLink);
      document.body.removeChild(bsScript);
    };
  }, []);

  const toggleSidebar = () => setShowSidebar(!showSidebar);

  const renderContent = () => {
      switch (activeTab) {
          case 'dashboard': return <DashboardHome user={user} setActiveTab={setActiveTab} />;
          case 'booking': return <PatientAppointmentBookers />; 
          case 'appointments': return <PatientAppointmentList />;
          case 'profile': return <PatientProfiles />; // Full Mode
          default: return <DashboardHome user={user} setActiveTab={setActiveTab} />;
      }
  };

  return (
    <div className="d-flex w-100 position-relative" style={{ minHeight: '600px', fontFamily: "'Open Sans', sans-serif", backgroundColor: '#f0f2f5', overflow: 'hidden' }}>
      <style>{`
        :root { --primary-color: #0D8ABC; --secondary-color: #333333; }
        .text-primary { color: var(--primary-color) !important; }
        .bg-primary-custom { background-color: var(--primary-color) !important; }
        .btn-primary { background-color: var(--primary-color); border-color: var(--primary-color); }
        .btn-outline-primary { color: var(--primary-color); border-color: var(--primary-color); }
        .btn-outline-primary:hover { background-color: var(--primary-color); color: #fff; }
        .nav-link { color: #555; border-radius: 8px; margin-bottom: 5px; transition: all 0.2s; }
        .nav-link:hover { background-color: #e9ecef; color: var(--primary-color); }
        .nav-link.active { background-color: var(--primary-color) !important; color: white !important; }
        .fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .sidebar-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); z-index: 1040; opacity: 0; animation: fadeInOverlay 0.3s forwards; }
        @keyframes fadeInOverlay { to { opacity: 1; } }
      `}</style>

      {/* Sidebar */}
      <div 
        className={`bg-white shadow p-3 d-flex flex-column ${isMobile ? 'position-absolute h-100' : ''}`}
        style={{ width: '280px', zIndex: 1050, transform: (isMobile && !showSidebar) ? 'translateX(-100%)' : 'translateX(0)', transition: 'transform 0.3s ease-in-out', flexShrink: 0, height: !isMobile ? 'auto' : '100%' }}
      >
         <div className="d-flex justify-content-between align-items-center mb-4">
             <a href="/" className="d-flex align-items-center link-dark text-decoration-none">
                <i className="fas fa-heartbeat text-primary fa-2x me-2"></i>
                <span className="fs-5 fw-bold text-dark">HealthCare <span className="text-primary">Portal</span></span>
             </a>
             {isMobile && <button className="btn btn-sm btn-light rounded-circle" onClick={toggleSidebar}><i className="fas fa-times"></i></button>}
         </div>
         <ul className="nav nav-pills flex-column mb-auto">
            <li><button className={`nav-link w-100 text-start ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => {setActiveTab('dashboard'); if(isMobile) toggleSidebar();}}><i className="fas fa-home me-3" style={{width: '20px'}}></i> Tổng quan</button></li>
            <li><button className={`nav-link w-100 text-start ${activeTab === 'booking' ? 'active' : ''}`} onClick={() => {setActiveTab('booking'); if(isMobile) toggleSidebar();}}><i className="fas fa-calendar-plus me-3" style={{width: '20px'}}></i> Đặt lịch khám</button></li>
            <li><button className={`nav-link w-100 text-start ${activeTab === 'appointments' ? 'active' : ''}`} onClick={() => {setActiveTab('appointments'); if(isMobile) toggleSidebar();}}><i className="fas fa-calendar-alt me-3" style={{width: '20px'}}></i> Lịch sử khám</button></li>
            <li><button className={`nav-link w-100 text-start ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => {setActiveTab('profile'); if(isMobile) toggleSidebar();}}><i className="fas fa-user-circle me-3" style={{width: '20px'}}></i> Tài khoản</button></li>
         </ul>
         <hr />
         <div className="d-flex align-items-center px-2 pb-2">
             <small className="text-muted">Phiên bản 1.0.0</small>
             <a href="#" className="ms-auto text-danger fw-bold small text-decoration-none">Đăng xuất</a>
         </div>
      </div>

      {isMobile && showSidebar && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

      <div className="flex-grow-1 d-flex flex-column" style={{ minWidth: 0 }}>
         {isMobile && (
             <nav className="navbar navbar-light bg-white shadow-sm px-3 sticky-top">
                 <div className="d-flex align-items-center">
                     <button className="btn btn-light me-2 text-primary" onClick={toggleSidebar}><i className="fas fa-bars"></i></button>
                     <span className="fw-bold">HealthCare Portal</span>
                 </div>
                 <img src={user.avatar} className="rounded-circle" width="32" height="32" />
             </nav>
         )}

         {!isMobile && (
             <header className="bg-white shadow-sm py-3 px-4 d-flex justify-content-between align-items-center sticky-top">
                 <div className="d-flex align-items-center">
                     <h5 className="mb-0 fw-bold text-secondary">
                         {activeTab === 'dashboard' ? 'Trang chủ' : activeTab === 'booking' ? 'Đặt lịch khám' : activeTab === 'appointments' ? 'Lịch sử khám' : 'Cài đặt tài khoản'}
                     </h5>
                 </div>
                 {/* <div className="d-flex align-items-center gap-3">
                     <button className="btn btn-light position-relative rounded-circle text-secondary">
                         <i className="fas fa-bell"></i>
                         <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle"></span>
                     </button>
                     <div className="d-flex align-items-center gap-2 border-start ps-3">
                         <div className="text-end lh-1">
                             <div className="fw-bold small">{user.fullName}</div>
                             <small className="text-muted" style={{fontSize: '10px'}}>Bệnh nhân</small>
                         </div>
                         <img src={user.avatar} className="rounded-circle border" width="36" height="36" />
                     </div>
                 </div> */}
             </header>
         )}

         <div className="p-4 flex-grow-1 h-100 overflow-auto">
             <div className="container-fluid" style={{ maxWidth: '1200px' }}>
                 {renderContent()}
             </div>
         </div>
      </div>
    </div>
  );
};

export default PatientDashboard;