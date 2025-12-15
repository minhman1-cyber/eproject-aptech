import React, { useEffect, useState, useMemo, useCallback } from 'react';
import DoctorProfiles from '../components/DoctorProfiles';
import DoctorAppointmentList from '../components/DoctorAppointmentList';
import DoctorAvailabilityManager from '../components/DoctorAvailabilityManager';

// --- CONFIGURATION ---
const BASE_API_URL = 'http://localhost:8888/api/v1/controllers';
const API_APPOINTMENTS_URL = `${BASE_API_URL}/doctor_appointment_list.php`;
const API_PROFILE_URL = `${BASE_API_URL}/doctor_profile.php`;

// --- COMPONENTS ---

const Sidebar = ({ activeTab, setActiveTab, profile }) => (
  <div className="d-flex flex-column flex-shrink-0 p-3 bg-white shadow-sm h-100" style={{ width: '280px' }}>
    <a href="/" className="d-flex align-items-center mb-3 mb-md-0 me-md-auto link-dark text-decoration-none">
      <i className="fas fa-plus-square text-primary-custom fa-2x me-2"></i>
      <span className="fs-4 fw-bold">Mediconnect</span>
    </a>
    <hr />
    <ul className="nav nav-pills flex-column mb-auto">
      <li className="nav-item">
        <button 
          className={`nav-link w-100 text-start ${activeTab === 'dashboard' ? 'active bg-primary-custom' : 'link-dark'}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <i className="fas fa-home me-2"></i> Tổng quan
        </button>
      </li>
      <li>
        <button 
          className={`nav-link w-100 text-start ${activeTab === 'patients' ? 'active bg-primary-custom' : 'link-dark'}`}
          onClick={() => setActiveTab('patients')}
        >
          <i className="fas fa-user-injured me-2"></i> Bệnh nhân
        </button>
      </li>
      <li>
        <button 
          className={`nav-link w-100 text-start ${activeTab === 'schedule' ? 'active bg-primary-custom' : 'link-dark'}`}
          onClick={() => setActiveTab('schedule')}
        >
          <i className="fas fa-calendar-alt me-2"></i> Lịch làm việc
        </button>
      </li>
    </ul>
    <hr />
    
    {/* User Profile Section - Click to open Profile */}
    <div 
        className={`d-flex align-items-center p-2 rounded ${activeTab === 'profile' ? 'bg-light border' : 'hover-bg-light'}`}
        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
        onClick={() => setActiveTab('profile')}
        title="Bấm để xem hồ sơ cá nhân"
    >
      <img 
          src={profile?.profilePicture || "https://via.placeholder.com/150"} 
          alt="Avatar" 
          width="40" height="40" 
          className="rounded-circle me-2 object-fit-cover shadow-sm" 
      />
      <div className="d-flex flex-column" style={{ overflow: 'hidden' }}>
          <strong className="text-truncate text-dark" style={{ maxWidth: '160px' }}>{profile?.fullName || "Bác sĩ"}</strong>
          <small className="text-muted text-truncate" style={{ fontSize: '0.75rem' }}>{profile?.specialization || "Đang tải..."}</small>
      </div>
      <div className="ms-auto text-muted">
          <i className="fas fa-chevron-right small"></i>
      </div>
    </div>
  </div>
);

const StatCard = ({ title, value, subtext, icon, color }) => (
  <div className="card border-0 shadow-sm h-100">
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

const AppointmentItem = ({ item, onUpdateStatus, isUpdating }) => {
  // Map API status to Display status & Color
  const getStatusInfo = (status) => {
    switch (status) {
      case 'BOOKED': return { label: 'Sắp tới', color: 'primary', icon: 'fa-clock' };
      case 'COMPLETED': return { label: 'Đã khám', color: 'success', icon: 'fa-check-circle' };
      case 'CANCELLED': return { label: 'Đã hủy', color: 'danger', icon: 'fa-times-circle' };
      case 'RESCHEDULED': return { label: 'Dời lịch', color: 'info', icon: 'fa-calendar-alt' };
      default: return { label: status, color: 'secondary', icon: 'fa-question' };
    }
  };

  const statusInfo = getStatusInfo(item.status);
  const isBooked = item.status === 'BOOKED' || item.status === 'RESCHEDULED';

  return (
    <div className={`d-flex align-items-center p-3 border-bottom ${isBooked ? 'bg-white' : 'bg-light'}`}>
      <div className="me-4 text-center" style={{ minWidth: '70px' }}>
        <span className="d-block fw-bold fs-5">{item.appointmentTime}</span>
        <small className="text-muted">{item.appointmentDate}</small>
      </div>
      <div className="flex-grow-1">
        <h6 className="fw-bold mb-1">{item.patientName}</h6>
        <small className="text-muted d-block"><i className="fas fa-notes-medical me-1"></i> Lý do: {item.reason || 'Khám tổng quát'}</small>
      </div>
      
      <div className="d-flex align-items-center gap-2">
        <span className={`badge bg-${statusInfo.color} rounded-pill d-flex align-items-center`}>
          <i className={`fas ${statusInfo.icon} me-1`}></i> {statusInfo.label}
        </span>
        
        {/* Action Buttons for Booked appointments */}
        {isBooked && (
          <div className="dropdown ms-2">
            <button className="btn btn-light btn-sm rounded-circle shadow-sm" type="button" data-bs-toggle="dropdown" disabled={isUpdating}>
              <i className="fas fa-ellipsis-v text-muted"></i>
            </button>
            <ul className="dropdown-menu dropdown-menu-end border-0 shadow">
              <li>
                <button className="dropdown-item text-success" onClick={() => onUpdateStatus(item.id, 'COMPLETE')}>
                  <i className="fas fa-check me-2"></i> Hoàn thành
                </button>
              </li>
              <li>
                <button className="dropdown-item text-danger" onClick={() => onUpdateStatus(item.id, 'CANCEL')}>
                  <i className="fas fa-ban me-2"></i> Hủy lịch
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

const AvailabilityBar = ({ day, booked, total }) => {
  // Nếu chưa có API tính tổng slot, ta giả định capacity là max(booked, 10) để hiển thị đẹp
  const capacity = Math.max(booked, 10); 
  const percentage = total > 0 ? (booked / total) * 100 : (booked / capacity) * 100;
  
  let color = "success";
  if (percentage > 50) color = "primary";
  if (percentage > 80) color = "warning";
  if (percentage >= 100) color = "danger";

  return (
    <div className="mb-3">
      <div className="d-flex justify-content-between mb-1">
        <span className="fw-bold text-dark">{day}</span>
        <span className="small text-muted">{booked} lịch hẹn</span>
      </div>
      <div className="progress" style={{ height: '8px' }}>
        <div className={`progress-bar bg-${color}`} role="progressbar" style={{ width: `${percentage}%` }} aria-valuenow={booked} aria-valuemin="0" aria-valuemax={100}></div>
      </div>
    </div>
  );
};

const PerformanceWidget = ({ stats }) => {
  const { completedDay, completedWeek, completedMonth } = stats;
  // Giả lập targets (Vì chưa có API Setting KPI)
  const targets = { day: 8, week: 40, month: 150 };
  
  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white py-3">
        <h5 className="mb-0 fw-bold"><i className="fas fa-tachometer-alt text-primary-custom me-2"></i>Hiệu Suất (Ca hoàn thành)</h5>
      </div>
      <div className="card-body">
        <div className="row text-center mb-4">
          <div className="col-4 border-end">
            <h3 className="fw-bold text-primary-custom mb-0">{completedDay}</h3>
            <small className="text-muted">Hôm nay</small>
          </div>
          <div className="col-4 border-end">
            <h3 className="fw-bold text-success mb-0">{completedWeek}</h3>
            <small className="text-muted">Tuần này</small>
          </div>
          <div className="col-4">
            <h3 className="fw-bold text-info mb-0">{completedMonth}</h3>
            <small className="text-muted">Tháng này</small>
          </div>
        </div>

        <h6 className="text-uppercase text-muted small fw-bold mb-3">Tiến độ mục tiêu</h6>
        
        <div className="mb-3">
          <div className="d-flex justify-content-between small mb-1">
            <span>Ngày ({completedDay}/{targets.day})</span>
            <span>{Math.round((completedDay/targets.day)*100)}%</span>
          </div>
          <div className="progress" style={{ height: '6px' }}>
            <div className="progress-bar bg-primary-custom" style={{ width: `${Math.min((completedDay/targets.day)*100, 100)}%` }}></div>
          </div>
        </div>

        <div className="mb-3">
          <div className="d-flex justify-content-between small mb-1">
            <span>Tháng ({completedMonth}/{targets.month})</span>
            <span>{Math.round((completedMonth/targets.month)*100)}%</span>
          </div>
          <div className="progress" style={{ height: '6px' }}>
            <div className="progress-bar bg-info" style={{ width: `${Math.min((completedMonth/targets.month)*100, 100)}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN LAYOUT COMPONENT ---

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Data States
  const [appointments, setAppointments] = useState([]);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Filter States
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'today'

  // Derived Data States
  const [todayStats, setTodayStats] = useState({
    totalPatients: 0,
    completed: 0,
    nextAppointment: "N/A",
    pendingRequests: 0 
  });

  const [performanceStats, setPerformanceStats] = useState({
    completedDay: 0,
    completedWeek: 0,
    completedMonth: 0
  });

  const [weeklyStats, setWeeklyStats] = useState([]);

  // Responsive check
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Inject Styles
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
    fontLink.href = "https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap";
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

  // --- API HELPER ---
  const fetchApi = useCallback(async (url, options = {}) => {
    const response = await fetch(url, {
        ...options,
        credentials: 'include', // QUAN TRỌNG: Gửi cookie session
        headers: {
            ...options.headers,
        },
    });

    if (response.status === 401) {
        throw new Error("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Lỗi hệ thống không xác định.');
        }
        return data;
    }
    
    if (!response.ok) {
        throw new Error(`Lỗi Server (Status: ${response.status})`);
    }
    return {};
  }, []);


  // --- API INTERACTION ---

  // 1. Fetch Profile
  const fetchProfile = useCallback(async () => {
    try {
        const data = await fetchApi(API_PROFILE_URL, { method: 'GET' });
        if (data && data.data) {
            // Xử lý dữ liệu chuyên khoa (nếu trả về mảng)
            let specName = "Đa khoa";
            if (data.data.allSpecializations && data.data.selectedSpecializationIds) {
                 const specs = data.data.allSpecializations
                    .filter(s => data.data.selectedSpecializationIds.includes(s.id))
                    .map(s => s.name);
                 if (specs.length > 0) specName = specs.join(', ');
            }
            
            setDoctorProfile({
                fullName: data.data.fullName,
                profilePicture: data.data.profilePicture,
                specialization: specName || data.data.qualification,
                email: data.data.email,
                phone: data.data.phone,
                cityId: data.data.cityId,
                qualification: data.data.qualification,
                bio: data.data.bio,
                doctorId: data.data.doctorId
            });
        }
    } catch (err) {
        console.warn("Profile fetch error:", err);
        // Không block app nếu lỗi profile, chỉ hiện fallback
    }
  }, [fetchApi]);

  // 2. Fetch Appointments & Calculate Stats
  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi(API_APPOINTMENTS_URL, { method: 'GET' });
      
      const apps = data.data?.appointments || [];
      
      // Sort by Date then Time DESC (Newest first)
      const sortedApps = apps.sort((a, b) => {
        const dateA = new Date(`${a.appointmentDate} ${a.appointmentTime}`);
        const dateB = new Date(`${b.appointmentDate} ${b.appointmentTime}`);
        return dateB - dateA;
      });

      setAppointments(sortedApps);
      processData(sortedApps);

    } catch (err) {
      console.error("API Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchApi]);

  // --- DATA PROCESSING (Client-side Calculations) ---
  const processData = (data) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // --- 1. Today Stats ---
    const todayApps = data.filter(app => app.appointmentDate === todayStr);
    const completedToday = todayApps.filter(app => app.status === 'COMPLETED').length;
    const bookedToday = todayApps.filter(app => app.status === 'BOOKED');
    
    // Tìm lịch hẹn kế tiếp
    const nowTimeStr = now.toTimeString().substr(0, 5);
    const nextApp = bookedToday
      .filter(app => app.appointmentTime > nowTimeStr)
      .sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime))[0];

    setTodayStats({
      totalPatients: todayApps.length,
      completed: completedToday,
      nextAppointment: nextApp ? nextApp.appointmentTime : "Hết lịch",
      pendingRequests: bookedToday.length
    });

    // --- 2. Performance Stats (Completed Counts) ---
    // Month logic: Check if date string starts with "YYYY-MM"
    const currentMonthPrefix = todayStr.substr(0, 7);
    const completedMonth = data.filter(app => app.status === 'COMPLETED' && app.appointmentDate.startsWith(currentMonthPrefix)).length;
    
    // Week logic: Đơn giản hóa, lấy 7 ngày gần nhất
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const completedWeek = data.filter(app => {
        if (app.status !== 'COMPLETED') return false;
        const appDate = new Date(app.appointmentDate);
        return appDate >= oneWeekAgo && appDate <= now;
    }).length;

    setPerformanceStats({
      completedDay: completedToday,
      completedWeek: completedWeek,
      completedMonth: completedMonth
    });

    // --- 3. Weekly Availability (Forecast for next 5 days) ---
    const nextDays = [];
    for (let i = 0; i < 5; i++) {
        const d = new Date();
        d.setDate(now.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        
        // Count booked slots for this date
        const bookedCount = data.filter(app => app.appointmentDate === dateStr && (app.status === 'BOOKED' || app.status === 'COMPLETED')).length;
        
        // Format day name (e.g. Thứ 2)
        const dayName = new Intl.DateTimeFormat('vi-VN', { weekday: 'long' }).format(d);
        
        nextDays.push({
            day: dayName,
            booked: bookedCount,
            total: 0 // Chưa có API tổng slot, để 0 để component tự xử lý hiển thị
        });
    }
    setWeeklyStats(nextDays);
  };
  
  // --- FILTERED APPOINTMENTS LOGIC ---
  const filteredAppointments = useMemo(() => {
    if (filterMode === 'all') return appointments;
    if (filterMode === 'today') {
        const todayStr = new Date().toISOString().split('T')[0];
        return appointments.filter(app => app.appointmentDate === todayStr);
    }
    return appointments;
  }, [appointments, filterMode]);

  const handleUpdateStatus = async (id, actionType) => {
    const actionLabel = actionType === 'CANCEL' ? 'hủy' : 'hoàn thành';
    if (!window.confirm(`Bạn có chắc chắn muốn ${actionLabel} lịch hẹn này?`)) return;

    setLoading(true);
    setSuccessMessage(null);

    try {
      await fetchApi(API_APPOINTMENTS_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, actionType }),
      });

      setSuccessMessage(`Đã ${actionLabel} thành công!`);
      // Refresh data without full page reload
      const data = await fetchApi(API_APPOINTMENTS_URL, { method: 'GET' });
      const apps = data.data?.appointments || [];
      const sortedApps = apps.sort((a, b) => {
          const dateA = new Date(`${a.appointmentDate} ${a.appointmentTime}`);
          const dateB = new Date(`${b.appointmentDate} ${b.appointmentTime}`);
          return dateB - dateA;
      });
      setAppointments(sortedApps);
      processData(sortedApps);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchAppointments();
  }, [fetchProfile, fetchAppointments]);


  return (
    <div className="d-flex h-100 bg-light" style={{ minHeight: '100vh', fontFamily: "'Open Sans', sans-serif" }}>
      <style>{`
        :root {
          --primary-color: #439fe0;
          --secondary-color: #333333;
        }
        .text-primary-custom { color: var(--primary-color) !important; }
        .bg-primary-custom { background-color: var(--primary-color) !important; }
        .object-fit-cover { object-fit: cover; }
        
        .card { transition: transform 0.2s; }
        .card:hover { transform: translateY(-2px); }
        .hover-bg-light:hover { background-color: #f8f9fa; }
        
        /* Custom scrollbar for schedule */
        .schedule-list {
          max-height: 500px;
          overflow-y: auto;
        }
        .schedule-list::-webkit-scrollbar { width: 6px; }
        .schedule-list::-webkit-scrollbar-thumb { background-color: #ccc; border-radius: 4px; }
      `}</style>

      {/* Sidebar */}
      {!isMobile && <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} profile={doctorProfile} />}

      <div className="flex-grow-1 overflow-auto">
        {/* Mobile Header */}
        {isMobile && (
          <nav className="navbar navbar-light bg-white border-bottom px-3 mb-3">
             <div className="d-flex align-items-center">
                <i className="fas fa-plus-square text-primary-custom fa-lg me-2"></i>
                <span className="fw-bold">Medicenter</span>
             </div>
             <div className="d-flex align-items-center">
                 <img src={doctorProfile?.profilePicture || "https://via.placeholder.com/32"} className="rounded-circle me-2 object-fit-cover" width="32" height="32" alt="" />
                 <button className="btn btn-sm btn-outline-secondary">Menu</button>
             </div>
          </nav>
        )}

        <div className="container-fluid p-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="fw-bold text-dark mb-0">
                {activeTab === 'profile' ? 'Thông Tin Cá Nhân' : 
                 activeTab === 'patients' ? 'Danh sách Bệnh nhân' :
                 activeTab === 'schedule' ? 'Quản lý Lịch làm việc' : 'Dashboard'}
              </h2>
              <p className="text-muted mb-0">Xin chào, {doctorProfile?.fullName || "Bác sĩ"}</p>
            </div>
            {activeTab === 'dashboard' && (
                <button className="btn btn-primary bg-primary-custom border-0 shadow-sm" onClick={fetchAppointments} disabled={loading}>
                <i className={`fas fa-sync-alt me-2 ${loading ? 'fa-spin' : ''}`}></i> Làm mới
                </button>
            )}
          </div>

          {error && <div className="alert alert-danger shadow-sm border-0"><i className="fas fa-exclamation-triangle me-2"></i>{error}</div>}
          {successMessage && <div className="alert alert-success shadow-sm border-0"><i className="fas fa-check-circle me-2"></i>{successMessage}</div>}

          {/* Conditional Rendering */}
          {activeTab === 'profile' ? (
              <DoctorProfiles profile={doctorProfile} />
          ) : activeTab === 'patients' ? (
              <DoctorAppointmentList />
          ) : activeTab === 'schedule' ? (
              <DoctorAvailabilityManager />
          ) : activeTab === 'dashboard' ? (
              <>
                {/* Row 1: Summary Cards */}
                <div className="row g-3 mb-4">
                    <div className="col-md-3">
                    <StatCard 
                        title="Bệnh nhân hôm nay" 
                        value={todayStats.totalPatients} 
                        subtext={`${todayStats.completed} đã hoàn thành`}
                        icon="user-md" 
                        color="primary"
                    />
                    </div>
                    <div className="col-md-3">
                    <StatCard 
                        title="Lịch hẹn kế tiếp" 
                        value={todayStats.nextAppointment} 
                        subtext={todayStats.nextAppointment !== "Hết lịch" ? "Hôm nay" : ""}
                        icon="clock" 
                        color="warning"
                    />
                    </div>
                    <div className="col-md-3">
                    <StatCard 
                        title="Chờ khám" 
                        value={todayStats.pendingRequests} 
                        subtext="Cần xử lý ngay"
                        icon="clipboard-list" 
                        color="danger"
                    />
                    </div>
                    <div className="col-md-3">
                    <StatCard 
                        title="Đánh giá TB" 
                        value="4.8/5.0" 
                        subtext="+12% so với tháng trước"
                        icon="star" 
                        color="success"
                    />
                    </div>
                </div>

                {/* Row 2: Main Content */}
                <div className="row g-4">
                    {/* Left Column: Schedule */}
                    <div className="col-lg-8">
                    <div className="card border-0 shadow-sm mb-4">
                        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                        <h5 className="mb-0 fw-bold">Danh sách Lịch Khám</h5>
                        <div className="btn-group">
                            <button 
                                className={`btn btn-sm btn-outline-primary ${filterMode === 'all' ? 'active' : ''}`}
                                onClick={() => setFilterMode('all')}
                            >
                                Tất cả
                            </button>
                            <button 
                                className={`btn btn-sm btn-outline-primary ${filterMode === 'today' ? 'active' : ''}`}
                                onClick={() => setFilterMode('today')}
                            >
                                Hôm nay
                            </button>
                        </div>
                        </div>
                        <div className="card-body p-0 schedule-list position-relative">
                        {loading && !appointments.length && (
                            <div className="position-absolute top-0 start-0 w-100 h-100 bg-white bg-opacity-75 d-flex align-items-center justify-content-center" style={{ zIndex: 10 }}>
                            <div className="spinner-border text-primary" role="status"></div>
                            </div>
                        )}
                        
                        {filteredAppointments.length === 0 && !loading ? (
                            <div className="text-center p-5 text-muted">
                            <i className="fas fa-calendar-times fa-3x mb-3 opacity-50"></i>
                            <p>{filterMode === 'today' ? "Hôm nay không có lịch hẹn nào." : "Chưa có lịch hẹn nào."}</p>
                            </div>
                        ) : (
                            filteredAppointments.map((item) => (
                            <AppointmentItem key={item.id} item={item} onUpdateStatus={handleUpdateStatus} isUpdating={loading} />
                            ))
                        )}
                        </div>
                    </div>
                    </div>

                    {/* Right Column: Stats & Availability */}
                    <div className="col-lg-4">
                    {/* Performance */}
                    <div className="mb-4">
                        <PerformanceWidget stats={performanceStats} />
                    </div>

                    {/* Weekly Availability */}
                    <div className="card border-0 shadow-sm">
                        <div className="card-header bg-white py-3">
                        <h5 className="mb-0 fw-bold">Lịch Trình (5 ngày tới)</h5>
                        </div>
                        <div className="card-body">
                        <p className="small text-muted mb-3">Số lượng lịch đã đặt dự kiến.</p>
                        {weeklyStats.length > 0 ? (
                            weeklyStats.map((stat, idx) => (
                                <AvailabilityBar key={idx} day={stat.day} booked={stat.booked} total={stat.total} />
                            ))
                        ) : (
                            <div className="text-center text-muted py-3">Đang tải...</div>
                        )}
                        </div>
                    </div>
                    </div>
                </div>
              </>
          ) : (
              <div className="text-center p-5 text-muted">Chức năng đang phát triển</div>
          )}
        </div>
      </div>
    </div>
  );
}