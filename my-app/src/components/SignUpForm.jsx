// src/components/SignUpForm.js (PHIÊN BẢN SỬA ĐỔI)
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Thêm useNavigate

const API_URL = 'http://localhost:8888/api/v1/controllers/register.php'; // Đảm bảo URL này là đúng
// Dữ liệu giả định (Thực tế nên load từ API)
const dummyCities = [
    { id: 1, name: 'Hà Nội' },
    { id: 2, name: 'Hồ Chí Minh' },
    { id: 3, name: 'Đà Nẵng' }
];

const dummySpecializations = [
    { id: 101, name: 'Tim mạch' },
    { id: 102, name: 'Nhi khoa' },
    { id: 103, name: 'Da liễu' }
];

const SignUpForm = () => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        // ... (Khối formData giữ nguyên)
        role: '',
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        
        patient_phone: '',
        patient_address: '',
        patient_cityId: '', // City cho Patient
        
        doctor_specializationIds: [], // Chuyển thành MẢNG ID
        doctor_qualification: '',
        doctor_phone: '',
        doctor_cityId: '', // City cho Doctor
        doctor_bio: ''
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Hàm xử lý multi-select cho chuyên khoa (chỉnh sửa lại)
    const handleSpecializationChange = (e) => {
        // NOTE: Hiện tại trong form chỉ là select 1 chuyên khoa, 
        // nhưng API của bạn cần mảng specialization_ids. 
        // Tôi sẽ sửa logic để gửi mảng 1 phần tử cho form hiện tại.
        setFormData({ ...formData, doctor_specializationIds: [parseInt(e.target.value)] });
    };

    const handleNextStep = (e) => {
        e.preventDefault();
        setError('');

        if (step === 1 && !formData.role) {
            setError('Vui lòng chọn vai trò của bạn.');
            return;
        }

        if (step === 2) {
            if (formData.password !== formData.confirmPassword) {
                setError('Mật khẩu xác nhận không khớp.');
                return;
            }
        }
        
        setStep(step + 1);
    };

    const handlePrevStep = () => {
        setStep(step - 1);
    };

    const buildPayload = () => {
        const basePayload = {
            full_name: formData.fullName,
            email: formData.email,
            password: formData.password,
            role: formData.role.toUpperCase(),
        };

        if (formData.role === 'PATIENT') {
            return {
                ...basePayload,
                city_id: parseInt(formData.patient_cityId),
                patient_phone: formData.patient_phone,
                patient_address: formData.patient_address,
            };
        }

        if (formData.role === 'DOCTOR') {
            // Chuẩn bị payload khớp với API PHP của bạn
            return {
                ...basePayload,
                city_id: parseInt(formData.doctor_cityId), // Gán city_id chung
                doctor_phone: formData.doctor_phone,
                doctor_qualification: formData.doctor_qualification,
                doctor_bio: formData.doctor_bio,
                specialization_ids: formData.doctor_specializationIds, // Mảng ID
            };
        }
        return basePayload;
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const payload = buildPayload();

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                credentials: 'include', // Bắt buộc cho Session-based
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                // Lỗi từ server (400, 500,...)
                throw new Error(data.message || 'Đăng ký thất bại. Vui lòng kiểm tra dữ liệu.');
            }

            // Đăng ký thành công
            alert(`Đăng ký vai trò ${formData.role} thành công! Vui lòng Đăng nhập.`);
            navigate('/'); // Chuyển hướng về trang Đăng nhập

        } catch (err) {
            // Lỗi mạng hoặc lỗi logic từ server
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // --- RENDER FUNCTION (Phần JSX) ---
    const renderRoleSpecificFields = () => {
        if (formData.role === 'PATIENT') {
            return (
                <>
                    <h5 className="mb-3 text-primary">Chi tiết Bệnh nhân</h5>
                    <div className="mb-3">
                        <label className="form-label">Thành phố (*)</label>
                        <select className="form-select" name="patient_cityId" value={formData.patient_cityId} onChange={handleChange} required>
                            <option value="">Chọn Thành phố...</option>
                            {dummyCities.map(city => (<option key={city.id} value={city.id}>{city.name}</option>))}
                        </select>
                    </div>
                    {/* Các trường khác giữ nguyên */}
                    <div className="mb-3">
                        <label className="form-label">Số điện thoại</label>
                        <input type="tel" className="form-control" name="patient_phone" value={formData.patient_phone} onChange={handleChange} />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Địa chỉ</label>
                        <input type="text" className="form-control" name="patient_address" value={formData.patient_address} onChange={handleChange} />
                    </div>
                </>
            );
        } 
        
        if (formData.role === 'DOCTOR') {
            return (
                <>
                    <h5 className="mb-3 text-success">Chi tiết Bác sĩ</h5>
                    {/* SỬA TÊN input thành doctor_specializationIds để khớp với state */}
                    <div className="mb-3">
                        <label className="form-label">Chuyên khoa chính (*)</label>
                        {/* NOTE: Form này chỉ cho phép chọn 1, nhưng API cần mảng. Tạm thời sử dụng mảng 1 phần tử */}
                        <select className="form-select" name="doctor_specializationId" onChange={handleSpecializationChange} required>
                            <option value="">Chọn Chuyên khoa...</option>
                            {dummySpecializations.map(spec => (<option key={spec.id} value={spec.id}>{spec.name}</option>))}
                        </select>
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Thành phố làm việc (*)</label>
                        <select className="form-select" name="doctor_cityId" value={formData.doctor_cityId} onChange={handleChange} required>
                            <option value="">Chọn Thành phố...</option>
                            {dummyCities.map(city => (<option key={city.id} value={city.id}>{city.name}</option>))}
                        </select>
                    </div>
                    {/* Các trường khác giữ nguyên */}
                    <div className="mb-3">
                        <label className="form-label">Số điện thoại liên hệ (*)</label>
                        <input type="tel" className="form-control" name="doctor_phone" value={formData.doctor_phone} onChange={handleChange} required />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Bằng cấp/Trình độ (*)</label>
                        <textarea className="form-control" name="doctor_qualification" value={formData.doctor_qualification} onChange={handleChange} rows="2" required></textarea>
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Tiểu sử ngắn (Bio)</label>
                        <textarea className="form-control" name="doctor_bio" value={formData.doctor_bio} onChange={handleChange} rows="2"></textarea>
                    </div>
                </>
            );
        }

        return null;
    };
    
    return (
        <div className="container d-flex align-items-center justify-content-center py-5 bg-light">
            <div className="card shadow-lg p-4" style={{ maxWidth: '500px', width: '100%' }}>
                {/* ... (Phần Stepper, Errors, và form JSX) ... */}
                <h3 className="card-title text-center text-dark mb-4 fw-bold">
                  <i className="bi bi-person-add me-2"></i> Đăng Ký Tài Khoản MediConnect
                </h3>
                
                {/* Stepper */}
                <div className="d-flex justify-content-between mb-4">
                    <span className={`badge p-2 ${step === 1 ? 'bg-primary' : 'bg-secondary'}`}>1. Vai trò</span>
                    <span className={`badge p-2 ${step === 2 ? 'bg-primary' : 'bg-secondary'}`}>2. Cơ bản</span>
                    <span className={`badge p-2 ${step === 3 ? 'bg-primary' : 'bg-secondary'}`}>3. Chi tiết</span>
                </div>

                {error && (
                  <div className="alert alert-danger" role="alert">{error}</div>
                )}

                <form onSubmit={step === 3 ? handleSubmit : handleNextStep}>
                    
                    {/* STEP 1: Role Selection */}
                    {step === 1 && (
                        <>
                            <h5 className="mb-3">Bạn muốn đăng ký với vai trò nào?</h5>
                            <div className="list-group mb-3">
                                <button 
                                  type="button" 
                                  className={`list-group-item list-group-item-action ${formData.role === 'PATIENT' ? 'active list-group-item-primary' : ''}`}
                                  onClick={() => setFormData({...formData, role: 'PATIENT'})}
                                >
                                  <i className="bi bi-person-fill me-2"></i> Bệnh nhân (Tìm bác sĩ, đặt lịch)
                                </button>
                                <button 
                                  type="button" 
                                  className={`list-group-item list-group-item-action ${formData.role === 'DOCTOR' ? 'active list-group-item-success' : ''}`}
                                  onClick={() => setFormData({...formData, role: 'DOCTOR'})}
                                >
                                  <i className="bi bi-heart-fill me-2"></i> Bác sĩ (Quản lý lịch hẹn, thông tin)
                                </button>
                            </div>
                            <button type="submit" className="btn btn-primary w-100" disabled={!formData.role}>
                                Tiếp tục
                            </button>
                        </>
                    )}

                    {/* STEP 2: General User Info */}
                    {step === 2 && (
                        <>
                            <h5 className="mb-3">Thông tin tài khoản cơ bản</h5>
                            <div className="mb-3">
                                <label className="form-label">Họ tên đầy đủ (*)</label>
                                <input type="text" className="form-control" name="fullName" value={formData.fullName} onChange={handleChange} required />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Email (*)</label>
                                <input type="email" className="form-control" name="email" value={formData.email} onChange={handleChange} required />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Mật khẩu (*)</label>
                                <input type="password" className="form-control" name="password" value={formData.password} onChange={handleChange} required minLength="8" />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Xác nhận Mật khẩu (*)</label>
                                <input type="password" className="form-control" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required />
                            </div>
                            
                            <button type="submit" className="btn btn-primary w-100 mt-3">
                                Tiếp tục
                            </button>
                            <button type="button" className="btn btn-link w-100 text-decoration-none" onClick={handlePrevStep}>
                                Quay lại
                            </button>
                        </>
                    )}

                    {/* STEP 3: Role Specific Details */}
                    {step === 3 && (
                        <>
                            {renderRoleSpecificFields()}
                            
                            <button type="submit" className={`btn btn-lg w-100 mt-3 ${formData.role === 'DOCTOR' ? 'btn-success' : 'btn-primary'}`} disabled={isLoading}>
                                {isLoading ? 'Đang gửi...' : `Hoàn tất Đăng ký (${formData.role === 'DOCTOR' ? 'Bác sĩ' : 'Bệnh nhân'})`}
                            </button>
                            <button type="button" className="btn btn-link w-100 text-decoration-none" onClick={handlePrevStep} disabled={isLoading}>
                                Quay lại
                            </button>
                        </>
                    )}
                </form>
                
                <p className="text-center mt-3">
                  Đã có tài khoản? <Link to="/" className="fw-bold ms-1">Đăng nhập</Link>
                </p>
            </div>
        </div>
    );
};

export default SignUpForm;