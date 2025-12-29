import React, { useState, useEffect } from 'react';
import AdminArticleManager from '../components/AdminArticleManager';
import AdminQualificationManager from '../components/AdminQualificationManagers';
import AdminCityManager from '../components/AdminCityManager';
import AdminDoctorManager from '../components/AdminDoctorManager';
import AdminPatientManager from '../components/AdminPatientManager';

// --- CONFIGURATION ---
const API_BASE_URL = 'http://localhost:8888/api/v1/controllers';

// --- SUB COMPONENT: STAT CARD ---
const StatCard = ({ title, value, subtext, icon, color, isLoading }) => (
  <div className="card border-0 shadow-sm h-100 feature-box m-0">
    <div className="card-body">
      <div className="d-flex align-items-center mb-3">
        <div
          className={`icon-square rounded-3 bg-${color} bg-opacity-10 text-${color} me-3 d-flex align-items-center justify-content-center`}
          style={{ width: '48px', height: '48px' }}
        >
          {/* Đã sửa: Thêm tiền tố 'fa-' vào trước tên icon để FontAwesome hiển thị đúng */}
          <i className={`fas fa-${icon} fa-lg`}></i>
        </div>
        <h6 className="card-subtitle text-muted text-uppercase mb-0">{title}</h6>
      </div>
      {isLoading ? (
        <div className="spinner-border spinner-border-sm text-secondary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      ) : (
        <h2 className="card-title mb-0 fw-bold">{value}</h2>
      )}
      <small className="text-muted">{subtext}</small>
    </div>
  </div>
);

// --- SUB COMPONENT: SIDEBAR ---
const Sidebar = ({ activeTab, setActiveTab }) => (
  <div
    className="d-flex flex-column flex-shrink-0 p-3 bg-white shadow-sm h-100"
    style={{ width: '280px', transition: 'all 0.3s', zIndex: 1000 }}
  >
    <a href="/" className="d-flex align-items-center mb-3 mb-md-0 me-md-auto link-dark text-decoration-none">
      <i className="fas fa-user-shield text-primary-custom fa-2x me-2"></i>
      <span className="fs-4 fw-bold" style={{ color: 'var(--secondary-color)' }}>
        Admin Portal
      </span>
    </a>
    <hr />
    <ul className="nav nav-pills flex-column mb-auto">
      <li className="nav-item mb-1">
        <button
          className={`nav-link w-100 text-start ${
            activeTab === 'dashboard' ? 'active bg-primary-custom' : 'link-dark'
          }`}
          onClick={() => setActiveTab('dashboard')}
        >
          <i className="fas fa-tachometer-alt me-2" style={{ width: '24px' }}></i>
          Dashboard Overview
        </button>
      </li>

      <li className="nav-item mb-1">
        <button
          className={`nav-link w-100 text-start ${
            activeTab === 'articles' ? 'active bg-primary-custom' : 'link-dark'
          }`}
          onClick={() => setActiveTab('articles')}
        >
          <i className="fas fa-newspaper me-2" style={{ width: '24px' }}></i>
          Article Management
        </button>
      </li>

      <li className="nav-item mb-1">
        <button
          className={`nav-link w-100 text-start ${
            activeTab === 'doctors' ? 'active bg-primary-custom' : 'link-dark'
          }`}
          onClick={() => setActiveTab('doctors')}
        >
          <i className="fas fa-user-md me-2" style={{ width: '24px' }}></i>
          Doctor Management
        </button>
      </li>

      <li className="nav-item mb-1">
        <button
          className={`nav-link w-100 text-start ${
            activeTab === 'patients' ? 'active bg-primary-custom' : 'link-dark'
          }`}
          onClick={() => setActiveTab('patients')}
        >
          <i className="fas fa-users me-2" style={{ width: '24px' }}></i>
          Patient Management
        </button>
      </li>

      <li className="nav-item mb-1">
        <button
          className={`nav-link w-100 text-start ${
            activeTab === 'cities' ? 'active bg-primary-custom' : 'link-dark'
          }`}
          onClick={() => setActiveTab('cities')}
        >
          <i className="fas fa-city me-2" style={{ width: '24px' }}></i>
          City Management
        </button>
      </li>

      <li className="nav-item mb-1">
        <button
          className={`nav-link w-100 text-start ${
            activeTab === 'degrees' ? 'active bg-primary-custom' : 'link-dark'
          }`}
          onClick={() => setActiveTab('degrees')}
        >
          <i className="fas fa-graduation-cap me-2" style={{ width: '24px' }}></i>
          Qualification Management
        </button>
      </li>
    </ul>

    <hr />
    <div className="d-flex align-items-center p-2 rounded hover-bg-light" style={{ cursor: 'pointer' }}>
      <img
        src="https://ui-avatars.com/api/?name=Admin+User&background=439fe0&color=fff"
        alt="Admin"
        width="40"
        height="40"
        className="rounded-circle me-2"
      />
      <div>
        <strong>Administrator</strong>
        <div className="small text-muted">Super Admin</div>
      </div>
      <div className="ms-auto text-muted">
        <i className="fas fa-sign-out-alt"></i>
      </div>
    </div>
  </div>
);

// --- DASHBOARD HOME COMPONENT ---
const DashboardHome = () => {
  const [stats, setStats] = useState({
    totalDoctors: 0,
    totalPatients: 0,
    activeDoctors: 0,
    todayAppointments: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        // Fetch Doctors, Patients, and Appointments (Today) in parallel
        const [doctorsRes, patientsRes, apptsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/admin_doctor_manager.php`, { credentials: 'include' }),
          fetch(`${API_BASE_URL}/admin_patient_manager.php`, { credentials: 'include' }),
          fetch(`${API_BASE_URL}/admin_appointment_stats.php`, { credentials: 'include' })
        ]);

        const doctorsData = await doctorsRes.json();
        const patientsData = await patientsRes.json();
        const apptsData = await apptsRes.json();

        // Calculate stats
        const doctors = doctorsData.data?.doctors || [];
        const patients = patientsData.data?.patients || [];
        const todayAppts = apptsData.data?.total_appointments_today || 0;
        
        // Count active doctors (is_active = 1)
        const activeDocs = doctors.filter(d => d.is_active === 1 || d.is_active === '1').length;

        setStats({
          totalDoctors: doctors.length,
          totalPatients: patients.length,
          activeDoctors: activeDocs,
          todayAppointments: todayAppts
        });

      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="fade-in">
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <StatCard 
            title="Total Doctors" 
            value={stats.totalDoctors} 
            subtext={``} 
            icon="user-md" 
            color="primary" 
            isLoading={isLoading} 
          />
        </div>
        <div className="col-md-3">
          <StatCard 
            title="Total Patients" 
            value={stats.totalPatients.toLocaleString()} 
            subtext="Registered users" 
            icon="users" 
            color="success" 
            isLoading={isLoading}
          />
        </div>
        <div className="col-md-3">
          <StatCard 
            title="Appointments (Today)" 
            value={stats.todayAppointments} 
            subtext="Scheduled for today" 
            icon="calendar-check" 
            color="warning" 
            isLoading={isLoading}
          />
        </div>
        <div className="col-md-3">
          <StatCard
            title="Revenue (Monthly)"
            value="N/A"
            subtext="Feature coming soon"
            icon="coins"
            color="danger"
            isLoading={false}
          />
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-7">
          <AdminArticleManager isWidget={true} />
        </div>

        <div className="col-lg-5">
          <div className="card border-0 shadow-sm mb-4">
            <AdminQualificationManager isWidget={true} />
          </div>

          <div className="card bg-primary-custom text-white border-0 shadow-sm">
            <div className="card-body text-center">
              <h5 className="mb-2">Need Support?</h5>
              <p className="small text-white-50 mb-3">
                Contact the technical team if you encounter any issues.
              </p>
              <button className="btn btn-light btn-sm fw-bold text-primary-custom">
                Contact IT
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT: ADMIN DASHBOARD ---
const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Inject Font Awesome styles
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      className="d-flex h-100"
      style={{
        // minHeight: '100vh',
        fontFamily: "'Open Sans', sans-serif",
        backgroundColor: 'var(--bg-light)',
      }}
    >
      {!isMobile && <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />}

      <div className="flex-grow-1 d-flex flex-column">
        <div className="p-4 overflow-auto flex-grow-1">
          {activeTab === 'dashboard' && <DashboardHome />}
          {activeTab === 'articles' && <AdminArticleManager />}
          {activeTab === 'doctors' && <AdminDoctorManager />}
          {activeTab === 'patients' && <AdminPatientManager />}
          {activeTab === 'cities' && <AdminCityManager />}
          {activeTab === 'degrees' && <AdminQualificationManager />}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;