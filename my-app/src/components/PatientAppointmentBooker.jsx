import React, { useState, useEffect, useCallback } from 'react';

// URL API Backend (Giả định)
const API_BASE_URL = 'http://localhost:8888/api/v1/controllers/';
const API_SEARCH_DOCTORS_URL = API_BASE_URL + 'patient_doctor_search.php'; 
const API_AVAILABILITY_URL = API_BASE_URL + 'doctor_availability_view.php'; 
const API_BOOKING_URL = API_BASE_URL + 'book_appointment.php'; 
const API_REFERENCE_DATA_URL = API_BASE_URL + 'reference_data.php'; // API MỚI

const initialSearchState = {
    cityId: '',
    specializationId: '',
    appointmentDate: '',
};

const DoctorAppointmentBooker = () => {
    const [step, setStep] = useState(1); 
    const [searchParams, setSearchParams] = useState(initialSearchState);
    const [doctorsList, setDoctorsList] = useState([]);
    const [availableTimes, setAvailableTimes] = useState([]); 
    
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [selectedTime, setSelectedTime] = useState('');
    const [reason, setReason] = useState('');

    const [allCities, setAllCities] = useState([]); 
    const [allSpecializations, setAllSpecializations] = useState([]);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // Hàm gọi API FETCH chung (Giữ nguyên)
    const fetchApi = useCallback(async (url, options) => {
        const response = await fetch(url, {
            ...options,
            credentials: 'include',
            headers: {
                ...(options.headers || {}),
                'Content-Type': options.body && typeof options.body === 'string' ? 'application/json' : undefined,
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
            throw new Error('Thao tác thất bại (Lỗi Server).');
        }
        return {};
    }, []);

    // ------------------- TẢI DỮ LIỆU THAM CHIẾU (CITIES/SPECIALIZATIONS) -------------------
    useEffect(() => {
        const loadReferenceData = async () => {
            setError(null);
            try {
                // GỌI API THỰC TẾ
                const data = await fetchApi(API_REFERENCE_DATA_URL, { method: 'GET' });

                setAllCities(data.data.cities || []);
                setAllSpecializations(data.data.specializations || []);
            } catch (err) {
                setError("Lỗi tải dữ liệu tham chiếu: " + err.message);
            }
        };
        loadReferenceData();
    }, [fetchApi]);
    

    // ------------------- BƯỚC 1: TÌM KIẾM BÁC SĨ (Giữ nguyên) -------------------

    const handleSearchChange = (e) => {
        setSearchParams(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSearchSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setIsLoading(true);

        const { cityId, specializationId, appointmentDate } = searchParams;
        if (!cityId || !specializationId || !appointmentDate) {
            setError("Vui lòng chọn Thành phố, Chuyên khoa và Ngày khám.");
            setIsLoading(false);
            return;
        }

        try {
            const data = await fetchApi(API_SEARCH_DOCTORS_URL, {
                method: 'POST',
                body: JSON.stringify(searchParams)
            });
            
            setDoctorsList(data.data.doctors || []);
            
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    // ------------------- BƯỚC 2: CHỌN GIỜ & BÁC SĨ (Giữ nguyên) -------------------
    
    const handleDoctorSelect = async (doctor) => {
        setSelectedDoctor(doctor);
        setSelectedTime(''); // Reset giờ đã chọn
        setAvailableTimes([]);
        
        // Gọi API lấy lịch rảnh chi tiết của bác sĩ đã chọn
        setIsLoading(true);
        try {
            // Payload cho API lịch rảnh (cần doctor_id và ngày)
            const payload = {
                doctorId: doctor.doctor_id, 
                appointmentDate: searchParams.appointmentDate
            };
            
            const data = await fetchApi(API_AVAILABILITY_URL, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            
            setAvailableTimes(data.data.availableTimes || []);
            setStep(2);

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    // ------------------- BƯỚC 3: XÁC NHẬN ĐẶT LỊCH (Giữ nguyên) -------------------
    
    const handleBookingConfirm = async (e) => {
        e.preventDefault();
        setError(null);
        
        if (!selectedTime || !reason) {
            setError("Vui lòng chọn Giờ khám và nhập Lý do khám bệnh.");
            return;
        }
        
        setIsLoading(true);

        // Payload đặt lịch
        const payload = {
            doctorId: selectedDoctor.doctor_id,
            appointmentDate: searchParams.appointmentDate,
            appointmentTime: selectedTime,
            reason: reason,
        };

        try {
            const data = await fetchApi(API_BOOKING_URL, {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            setSuccessMessage(data.message || "Đặt lịch hẹn thành công!");
            setStep(3); // Chuyển sang màn hình xác nhận cuối cùng
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };


    // ------------------- RENDER STEPS -------------------

    const renderStepContent = () => {
        if (step === 1) {
            // --- BƯỚC 1: TÌM KIẾM VÀ CHỌN BÁC SĨ ---
            return (
                <div className="card p-4 shadow-sm">
                    <h5 className="text-info mb-3">1. Tìm kiếm Bác sĩ</h5>
                    <form onSubmit={handleSearchSubmit}>
                        {/* Lựa chọn Tìm kiếm */}
                        <div className="row mb-3">
                            <div className="col-md-4 mb-3">
                                <label className="form-label">Thành phố (*)</label>
                                <select className="form-select" name="cityId" value={searchParams.cityId} onChange={handleSearchChange} required>
                                    <option value="">Chọn TP...</option>
                                    {allCities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="col-md-4 mb-3">
                                <label className="form-label">Chuyên khoa (*)</label>
                                <select className="form-select" name="specializationId" value={searchParams.specializationId} onChange={handleSearchChange} required>
                                    <option value="">Chọn CK...</option>
                                    {allSpecializations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="col-md-4 mb-3">
                                <label className="form-label">Ngày Khám (*)</label>
                                <input type="date" className="form-control" name="appointmentDate" value={searchParams.appointmentDate} onChange={handleSearchChange} required />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary w-100" disabled={isLoading}>
                            {isLoading ? 'Đang tìm kiếm...' : 'Tìm kiếm Bác sĩ'}
                        </button>
                    </form>

                    {/* Kết quả Tìm kiếm */}
                    <div className="mt-4">
                        <h6>Kết quả tìm kiếm ({doctorsList.length} bác sĩ)</h6>
                        {doctorsList.length === 0 ? (
                            <p className="text-muted">Vui lòng nhập tiêu chí tìm kiếm ở trên.</p>
                        ) : (
                            <div className="list-group">
                                {doctorsList.map(doctor => (
                                    <button 
                                        key={doctor.doctor_id} 
                                        className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                                        onClick={() => handleDoctorSelect(doctor)}
                                    >
                                        <div>
                                            <strong>{doctor.full_name}</strong>
                                            <small className="d-block text-muted">{doctor.qualification}</small>
                                        </div>
                                        <span className="badge bg-primary rounded-pill">Chọn & xem lịch</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            );
        } else if (step === 2) {
            // --- BƯỚC 2: CHỌN KHUNG GIỜ ---
            return (
                <div className="card p-4 shadow-sm">
                    <h5 className="text-info mb-3">2. Chọn Khung giờ Khám</h5>
                    <p>Bác sĩ: <strong>{selectedDoctor?.full_name}</strong> | Ngày: <strong>{searchParams.appointmentDate}</strong></p>
                    
                    {isLoading ? (
                        <p className="text-center text-muted">Đang tải lịch rảnh...</p>
                    ) : availableTimes.length === 0 ? (
                        <p className="alert alert-warning">Không có khung giờ rảnh nào cho ngày này.</p>
                    ) : (
                        <div>
                            <label className="form-label">Chọn giờ khám (Slots 30 phút):</label>
                            <div className="d-flex flex-wrap">
                                {availableTimes.map(slot => (
                                    <button 
                                        key={slot.time}
                                        type="button"
                                        className={`btn m-1 ${slot.isBooked ? 'btn-danger disabled' : selectedTime === slot.time ? 'btn-primary' : 'btn-outline-primary'}`}
                                        onClick={() => !slot.isBooked && setSelectedTime(slot.time)}
                                        disabled={slot.isBooked}
                                        style={{ pointerEvents: slot.isBooked ? 'none' : 'auto' }}
                                    >
                                        {slot.time} {slot.isBooked && '(Đã đặt)'}
                                    </button>
                                ))}
                            </div>
                            
                            <p className="mt-3">Giờ đã chọn: <strong>{selectedTime || 'Chưa chọn'}</strong></p>

                            <form onSubmit={handleBookingConfirm} className="mt-4">
                                <div className="mb-3">
                                    <label className="form-label">Lý do khám bệnh (*)</label>
                                    <textarea 
                                        className="form-control" 
                                        rows="3" 
                                        value={reason} 
                                        onChange={(e) => setReason(e.target.value)} 
                                        required
                                    ></textarea>
                                </div>
                                <div className="d-flex justify-content-between">
                                    <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                                        &larr; Quay lại
                                    </button>
                                    <button type="submit" className="btn btn-success" disabled={!selectedTime || isLoading}>
                                        {isLoading ? 'Đang đặt...' : 'Xác nhận Đặt lịch'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            );
        } else if (step === 3) {
            // --- BƯỚC 3: XÁC NHẬN THÀNH CÔNG ---
            return (
                <div className="alert alert-success text-center p-5">
                    <h4 className="alert-heading">Đặt lịch hẹn thành công!</h4>
                    <p>Bạn đã đặt lịch khám với Bác sĩ <strong>{selectedDoctor.full_name}</strong> vào lúc <strong>{selectedTime}</strong> ngày <strong>{searchParams.appointmentDate}</strong>.</p>
                    <hr />
                    <p className="mb-0">Vui lòng kiểm tra mục Lịch hẹn để xem chi tiết.</p>
                    <button className="btn btn-primary mt-3" onClick={() => setStep(1)}>
                        Đặt lịch khác
                    </button>
                </div>
            );
        }
    };


    return (
        <div className="container py-5">
            <h2 className="mb-4 text-primary">🏥 Đặt Lịch Khám Bệnh</h2>
            
            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            {successMessage && <div className="alert alert-success" role="alert">{successMessage}</div>}

            <div className="d-flex justify-content-center mb-4">
                <div className={`p-2 border rounded-start ${step === 1 ? 'bg-primary text-white' : 'bg-light'}`}>1. Tìm kiếm Bác sĩ</div>
                <div className={`p-2 border ${step === 2 ? 'bg-primary text-white' : 'bg-light'}`}>2. Chọn Khung giờ</div>
                <div className={`p-2 border rounded-end ${step === 3 ? 'bg-primary text-white' : 'bg-light'}`}>3. Xác nhận</div>
            </div>

            <div className="row justify-content-center">
                <div className="col-lg-8">
                    {renderStepContent()}
                </div>
            </div>
        </div>
    );
};

export default DoctorAppointmentBooker;