// src/App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import SignUpForm from './components/SignUpForm';
import PatientProfile from './components/PatientProfile';
import DoctorProfile from './components/DoctorProfile';
import PatientProfiles from './components/PatientProfiles';
import DoctorProfiles from './components/DoctorProfiles';
import AdminDoctorManager from './components/AdminDoctorManager';
import AdminDoctorManagers from './components/AdminDoctorManagers';
import DoctorAvailabilityManager from './components/DoctorAvailabilityManager';
import PatientAppointmentBooker from './components/PatientAppointmentBooker';
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

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LoginForm  />} />
          <Route path="/signup" element={< SignUpForm/>} />
          <Route path="/signuptest" element={< SignUpForms/>} />
          <Route path='/patientPF' element={< PatientProfiles />}/>
          <Route path='/doctorPF' element={< DoctorProfiles />}/>
          <Route path='/admin' element={< AdminDoctorManager />}/>
          <Route path='/avai' element={< DoctorAvailabilityManager />}/>
          <Route path='/booking' element={< PatientAppointmentBookers />}/>
          <Route path='/patientappointlist' element={< PatientAppointmentList />}/>
          <Route path='/doctorappointlist' element={< DoctorAppointmentList />}/>
          <Route path='/patientManager' element={< AdminPatientManager />}/>
          <Route path='/cityManager' element={< AdminCityManager />}/>
          <Route path='/articleManager' element={< AdminArticleManager />}/>
          <Route path='/articleViewer' element={< ArticleListViewer />}/>
          <Route path='/qualificationManager' element={< AdminQualificationManager />}/>
          <Route path='/changePass' element={< ChangePasswordModal />}/>
          {/* Thêm Route cho trang Dashboard/Home sau khi đăng nhập */}
          {/* <Route path="/home" element={<Dashboard />} /> */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;