import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:8888/api/v1/controllers/register.php'; 
// Dữ liệu giả định (Thực tế nên load từ API)
const dummyCities = [
    { id: 1, name: 'Hà Nội' },
    { id: 2, name: 'Hồ Chí Minh' },
    { id: 3, name: 'Đà Nẵng' }
];

// const dummySpecializations = [ /* Commented out as not needed for Patient */ ]; 

const SignUpForms = () => {
    // Chúng ta sẽ bỏ qua Bước 1 chọn vai trò và mặc định là PATIENT,
    // nên ta bắt đầu từ Step 2 (Thông tin cơ bản)
    const [step, setStep] = useState(1); 
    const [formData, setFormData] = useState({
        role: 'PATIENT', // Mặc định là PATIENT
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        
        // PATIENT fields:
        patient_phone: '',
        patient_address: '',
        patient_cityId: '', 
        
        // DOCTOR fields (Giữ lại trong state để đảm bảo cấu trúc data nếu cần):
        doctor_specializationIds: [], 
        doctor_qualification: '',
        doctor_phone: '',
        doctor_cityId: '', 
        doctor_bio: ''
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleNextStep = (e) => {
        e.preventDefault();
        setError('');
        
        // Bỏ qua kiểm tra vai trò (Step 1)

        if (step === 1) { // Giờ là Step 1 (Thông tin cơ bản)
            if (formData.password !== formData.confirmPassword) {
                setError('Mật khẩu xác nhận không khớp.');
                return;
            }
            // Kiểm tra các trường bắt buộc cơ bản
            if (!formData.fullName || !formData.email || !formData.password) {
                 setError('Vui lòng điền đầy đủ các trường bắt buộc.');
                 return;
            }
            setStep(2); // Chuyển sang Step 2 (Chi tiết Patient)
        }
    };

    const handlePrevStep = () => {
        setStep(step - 1);
    };

    const buildPayload = () => {
        // Payload chỉ xây dựng cho vai trò PATIENT
        return {
            full_name: formData.fullName,
            email: formData.email,
            password: formData.password,
            role: 'PATIENT',
            
            // Thông tin chi tiết Patient
            city_id: parseInt(formData.patient_cityId),
            patient_phone: formData.patient_phone,
            patient_address: formData.patient_address,
        };
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        
        // Kiểm tra validation cuối cùng
        if (!formData.patient_cityId) {
             setError('Vui lòng chọn Thành phố.');
             setIsLoading(false);
             return;
        }

        const payload = buildPayload();

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                credentials: 'include', // Bắt buộc cho Session-based
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Đăng ký thất bại. Vui lòng kiểm tra dữ liệu.');
            }

            window.alert(`Đăng ký Bệnh nhân thành công! Vui lòng Đăng nhập.`);
            navigate('/'); // Chuyển hướng về trang Login

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // --- RENDER FUNCTION (Phần JSX) ---
    
    // Đã cố định chỉ hiển thị form Patient
    const renderPatientSpecificFields = () => {
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
    };
    
    // Tính toán bước hiện tại
    const currentStep = step; // Step 1: Cơ bản, Step 2: Chi tiết

    return (
        <div className="container d-flex align-items-center justify-content-center py-5 bg-light">
            <div className="card shadow-lg p-4" style={{ maxWidth: '500px', width: '100%' }}>
                <h3 className="card-title text-center text-dark mb-4 fw-bold">
                    <i className="bi bi-person-add me-2"></i> Đăng Ký Tài Khoản Bệnh nhân
                </h3>
                
                {/* Stepper (Chỉ 2 bước) */}
                <div className="d-flex justify-content-center mb-4">
                    <span className={`badge p-2 ${currentStep === 1 ? 'bg-primary' : 'bg-secondary'} me-2`}>1. Tài khoản cơ bản</span>
                    <span className={`badge p-2 ${currentStep === 2 ? 'bg-primary' : 'bg-secondary'}`}>2. Chi tiết</span>
                </div>

                {error && (
                    <div className="alert alert-danger" role="alert">{error}</div>
                )}

                <form onSubmit={currentStep === 2 ? handleSubmit : handleNextStep}>
                    
                    {/* STEP 1: General User Info */}
                    {currentStep === 1 && (
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
                            
                            <button type="submit" className="btn btn-primary w-100 mt-3" disabled={isLoading}>
                                Tiếp tục
                            </button>
                        </>
                    )}

                    {/* STEP 2: Patient Specific Details */}
                    {currentStep === 2 && (
                        <>
                            {renderPatientSpecificFields()}
                            
                            <button type="submit" className="btn btn-primary btn-lg w-100 mt-3" disabled={isLoading}>
                                {isLoading ? 'Đang gửi...' : 'Hoàn tất Đăng ký'}
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

export default SignUpForms;