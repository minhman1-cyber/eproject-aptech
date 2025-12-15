// src/App.js
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import SignUpForm from './components/SignUpForm';
import PatientProfiles from './components/PatientProfiles';
import DoctorProfiles from './components/DoctorProfiles';
import AdminDoctorManager from './components/AdminDoctorManager';
import DoctorAvailabilityManager from './components/DoctorAvailabilityManager';
import PatientAppointmentBookers from './components/PatientAppointmentBookers';
import PatientAppointmentList from './components/PatientAppointmentList';
import DoctorAppointmentList from './components/DoctorAppointmentList';
import AdminPatientManager from './components/AdminPatientManager';
import AdminCityManager from './components/AdminCityManager';
import AdminArticleManager from './components/AdminArticleManager';
import ArticleListViewer from './components/ArticleListViewer';
import SignUpForms from './components/SignUpForms';
import AdminQualificationManager from './components/AdminQualificationManager';
import ChangePasswordModal from './components/ChangePasswordModal';
import Header from './components/Header';
import Footer from './components/Footer';
import AboutUs from './pages/AboutUs';
import DoctorDashboard from './pages/DoctorDashboard';
import DoctorDash from './pages/DoctorDash';

function App() {
  
  const [stylesLoaded, setStylesLoaded] = useState(false);

  useEffect(() => {
    // 1. Load Bootstrap 5 CSS
    const bsLink = document.createElement("link");
    bsLink.href = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css";
    bsLink.rel = "stylesheet";
    document.head.appendChild(bsLink);

    // 2. Load FontAwesome
    const faLink = document.createElement("link");
    faLink.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
    faLink.rel = "stylesheet";
    document.head.appendChild(faLink);

    // 3. Load Google Fonts
    const fontLink = document.createElement("link");
    fontLink.href = "https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap";
    fontLink.rel = "stylesheet";
    document.head.appendChild(fontLink);

    // 4. Load AOS CSS
    const aosCss = document.createElement("link");
    aosCss.href = "https://unpkg.com/aos@2.3.1/dist/aos.css";
    aosCss.rel = "stylesheet";
    document.head.appendChild(aosCss);

    // 5. Load AOS JS & Initialize
    const aosScript = document.createElement("script");
    aosScript.src = "https://unpkg.com/aos@2.3.1/dist/aos.js";
    aosScript.onload = () => {
      if (window.AOS) {
        window.AOS.init({
          once: true,
          offset: 100,
          duration: 800,
          easing: 'ease-out-cubic'
        });
      }
    };
    document.body.appendChild(aosScript);

    // 6. Load Bootstrap JS Bundle (for navbar toggle, etc.)
    const bsScript = document.createElement("script");
    bsScript.src = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js";
    document.body.appendChild(bsScript);

    setStylesLoaded(true);

    // Cleanup
    return () => {
      document.head.removeChild(bsLink);
      document.head.removeChild(faLink);
      document.head.removeChild(fontLink);
      document.head.removeChild(aosCss);
      document.body.removeChild(aosScript);
      document.body.removeChild(bsScript);
    };
  }, []);

  if (!stylesLoaded) return <div className="p-5 text-center">Loading styles...</div>;

  return (
    <Router>
      <Header></Header>
      <div className="App">
        <Routes>
          <Route path="/" element={<LoginForm />} />
          <Route path="/signup" element={< SignUpForm />} />
          <Route path="/signupbenhnhan" element={< SignUpForms />} />
          <Route path='/patientPF' element={< PatientProfiles />} />
          <Route path='/doctorPF' element={< DoctorProfiles />} />
          <Route path='/admin' element={< AdminDoctorManager />} />
          <Route path='/avai' element={< DoctorAvailabilityManager />} />
          <Route path='/booking' element={< PatientAppointmentBookers />} />
          <Route path='/patientappointlist' element={< PatientAppointmentList />} />
          <Route path='/doctorappointlist' element={< DoctorAppointmentList />} />
          <Route path='/patientManager' element={< AdminPatientManager />} />
          <Route path='/cityManager' element={< AdminCityManager />} />
          <Route path='/articleManager' element={< AdminArticleManager />} />
          <Route path='/articleViewer' element={< ArticleListViewer />} />
          <Route path='/qualificationManager' element={< AdminQualificationManager />} />
          <Route path='/changePass' element={< ChangePasswordModal />} />
          <Route path='/aboutus' element={< AboutUs />} />
          <Route path='/doctor/dashboard2' element={< DoctorDashboard />} />
          <Route path='/doctor/dashboard' element={< DoctorDash />} />
        </Routes>
      </div>
      <Footer></Footer>
    </Router>
  );
}

export default App;