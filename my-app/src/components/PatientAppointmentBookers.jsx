import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DoctorProfileView from './DoctorProfileView';


// URL API Backend (Giả định)
const API_BASE_URL = 'http://localhost:8888/api/v1/controllers/';
const API_SEARCH_DOCTORS_URL = API_BASE_URL + 'patient_doctor_search.php'; 
const API_AVAILABILITY_URL = API_BASE_URL + 'doctor_availability_view.php'; 
const API_BOOKING_URL = API_BASE_URL + 'book_appointment.php'; 
const API_REFERENCE_DATA_URL = API_BASE_URL + 'reference_data.php'; 
const API_ALL_DOCTORS_URL = API_BASE_URL + 'patient_all_doctors.php'; // API MỚI: Lấy tất cả bác sĩ

const ITEMS_PER_PAGE = 10; // Cấu hình phân trang

// =======================================================
// COMPONENT PHỤ: MODAL CHỌN NGÀY THỦ CÔNG
// =======================================================
const DatePickerModal = ({ isOpen, currentDate, setDate, closeModal }) => {
    const [selectedManualDate, setSelectedManualDate] = useState(currentDate);

    useEffect(() => {
        setSelectedManualDate(currentDate);
    }, [currentDate]);

    const handleConfirm = (e) => {
        e.preventDefault();
        if (selectedManualDate) {
            setDate(selectedManualDate); // Cập nhật searchParams.appointmentDate
            closeModal();
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
            <div className="modal-dialog modal-sm">
                <div className="modal-content">
                    <form onSubmit={handleConfirm}>
                        <div className="modal-header bg-primary text-white">
                            <h5 className="modal-title">Chọn Ngày Khám</h5>
                            <button type="button" className="btn-close btn-close-white" onClick={closeModal}></button>
                        </div>
                        <div className="modal-body">
                            <label className="form-label">Chọn một ngày trong tương lai:</label>
                            <input 
                                type="date" 
                                className="form-control" 
                                value={selectedManualDate}
                                min={new Date().toISOString().split('T')[0]} 
                                onChange={(e) => setSelectedManualDate(e.target.value)}
                                required
                            />
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={closeModal}>Hủy</button>
                            <button type="submit" className="btn btn-primary">Xác nhận</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};


const PatientAppointmentBookers = () => {
    // Chỉ giữ lại cityId và specializationId trong state tìm kiếm ban đầu
    const initialSearchState = {
        cityId: '',
        specializationId: '',
        appointmentDate: '', // Vẫn giữ để sử dụng trong Bước 2 & 3
    };
    
    const [step, setStep] = useState(1); 
    const [searchParams, setSearchParams] = useState(initialSearchState);
    const [doctorsList, setDoctorsList] = useState([]); // Kết quả tìm kiếm chính (đã lọc lịch rảnh)
    const [allDoctors, setAllDoctors] = useState([]); // Toàn bộ danh sách bác sĩ (để hiển thị/duyệt)
    const [availableTimes, setAvailableTimes] = useState([]); 
    
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [selectedTime, setSelectedTime] = useState('');
    const [reason, setReason] = useState('');

    const [allCities, setAllCities] = useState([]); 
    const [allSpecializations, setAllSpecializations] = useState([]);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    
    // State phân trang và tìm kiếm cho "Duyệt tất cả"
    const [allSearchTerm, setAllSearchTerm] = useState('');
    const [allCurrentPage, setAllCurrentPage] = useState(1);
    
    // State mới cho Modal chọn ngày
    const [isDatePickerModalOpen, setIsDatePickerModalOpen] = useState(false);


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

    // ------------------- TẢI DỮ LIỆU THAM CHIẾU VÀ TẤT CẢ BÁC SĨ -------------------
    useEffect(() => {
        const loadReferenceData = async () => {
            setError(null);
            try {
                // Tải Cities và Specs
                const refData = await fetchApi(API_REFERENCE_DATA_URL, { method: 'GET' });
                setAllCities(refData.data.cities || []);
                setAllSpecializations(refData.data.specializations || []);
                
                // Tải TẤT CẢ Bác sĩ (API mới)
                const allDocData = await fetchApi(API_ALL_DOCTORS_URL, { method: 'GET' });
                
                // Chuẩn hóa dữ liệu chuyên khoa (từ chuỗi/số thành mảng số nguyên)
                const mappedDoctors = (allDocData.data.doctors || []).map(doc => {
                    const raw = doc.specializationIds ?? doc.specializationId ?? null;
                    let specializationIds = [];

                    if (Array.isArray(raw)) {
                        specializationIds = raw.map(Number).filter(x => !Number.isNaN(x));
                    } else if (typeof raw === 'string') {
                        specializationIds = raw.split(',').map(s => Number(s.trim())).filter(x => !Number.isNaN(x));
                    } else if (typeof raw === 'number') {
                        specializationIds = [raw];
                    }
                    
                    return {
                        ...doc,
                        specializationIds,
                        specializationId: specializationIds.length ? specializationIds[0] : null,
                        cityId: Number(doc.cityId) 
                    };
                });

                setAllDoctors(mappedDoctors);

            } catch (err) {
                setError("Lỗi tải dữ liệu tham chiếu: " + err.message);
            }
        };
        loadReferenceData();
    }, [fetchApi]);
    

    // ------------------- BƯỚC 1: TÌM KIẾM BÁC SĨ -------------------

    const handleSearchChange = (e) => {
        // Cho phép thay đổi tất cả các trường
        setSearchParams(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSearchSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setIsLoading(true);

        // KIỂM TRA TẤT CẢ 3 TIÊU CHÍ (BẮT BUỘC CHO TÌM KIẾM CHÍNH)
        const { cityId, specializationId, appointmentDate } = searchParams;
        if (!cityId || !specializationId || !appointmentDate) {
            setError("Vui lòng chọn Thành phố, Chuyên khoa và Ngày khám.");
            setIsLoading(false);
            return;
        }

        try {
            // API chỉ trả về bác sĩ có lịch rảnh khớp
            const data = await fetchApi(API_SEARCH_DOCTORS_URL, {
                method: 'POST',
                // Gửi tất cả 3 tiêu chí: cityId, specializationId, appointmentDate
                body: JSON.stringify(searchParams) 
            });
            
            // Lọc kết quả tìm kiếm API với dữ liệu đầy đủ từ allDoctors
            const resultDoctors = (data.data.doctors || []).map(apiDoc => {
                const fullData = allDoctors.find(d => d.doctor_id === apiDoc.doctor_id);
                return fullData || apiDoc; 
            });

            setDoctorsList(resultDoctors);
            
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    // ------------------- LOGIC TẢI LỊCH RẢNH -------------------

    const fetchAvailability = useCallback(async (doctorId, date) => {
        if (!doctorId || !date) return;
        
        setIsLoading(true);
        setError(null);
        setSelectedTime(''); // Reset giờ khi tải lịch mới

        try {
            const payload = {
                doctorId: doctorId, 
                appointmentDate: date, 
            };
            
            const data = await fetchApi(API_AVAILABILITY_URL, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            
            // Giả lập slot 30 phút nếu API chỉ trả về danh sách giờ bắt đầu
            const rawTimes = data.data.availableTimes || [];
            const slots = rawTimes.map(time => ({
                time: time.time || time, // Giả sử time là chuỗi HH:MM
                isBooked: time.isBooked || false 
            }));

            setAvailableTimes(slots);

        } catch (err) {
            setError("Lỗi tải lịch rảnh: " + err.message);
            setAvailableTimes([]);
        } finally {
            setIsLoading(false);
        }
    }, [fetchApi]);

    // Effect để tải lịch rảnh khi chuyển sang Bước 2 HOẶC ngày khám thay đổi
    useEffect(() => {
        if (step === 2 && selectedDoctor && searchParams.appointmentDate) {
            fetchAvailability(selectedDoctor.doctor_id, searchParams.appointmentDate);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, selectedDoctor, searchParams.appointmentDate]); 

    
    // ------------------- BƯỚC 2: CHỌN BÁC SĨ VÀ CHUYỂN BƯỚC -------------------
    
    // HÀM SỬA ĐỔI: Chỉ cần doctor object
    const handleDoctorSelect = (doctor) => {
        setSelectedDoctor(doctor);
        setSelectedTime(''); 
        setAvailableTimes([]);
        setError(null);
        setSuccessMessage(null);

        // Thiết lập ngày khám mặc định là hôm nay khi chuyển sang bước 2 (Nếu chưa có ngày)
        const today = new Date().toISOString().split('T')[0];
        setSearchParams(prev => ({
            ...prev,
            // CHỈ SET NGÀY HÔM NAY NẾU CHƯA CÓ NGÀY NÀO ĐƯỢC CHỌN TRONG FORM
            appointmentDate: prev.appointmentDate || today, 
            cityId: String(doctor.cityId),
            specializationId: String(doctor.specializationId),
        }));
        
        setStep(2);
    };

    // Hàm set ngày từ Modal (gọi sau khi chọn ngày trong Modal)
    const handleSetAppointmentDate = (dateString) => {
        setSearchParams(prev => ({
            ...prev,
            appointmentDate: dateString,
        }));
        setIsDatePickerModalOpen(false); // Đóng modal sau khi chọn
    };

    // ------------------- BƯỚC 3: XÁC NHẬN ĐẶT LỊCH -------------------
    
    const handleBookingConfirm = async (e) => {
        e.preventDefault();
        setError(null);
        
        if (!selectedTime || !reason || !searchParams.appointmentDate) {
            setError("Vui lòng chọn Giờ khám, Ngày Khám và nhập Lý do khám bệnh.");
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

    // ------------------- LOGIC DUYỆT TẤT CẢ -------------------

    const filteredAllDoctors = useMemo(() => {
        if (!allSearchTerm) return allDoctors;
        const term = allSearchTerm.toLowerCase();
        
        return allDoctors.filter(doctor => 
            doctor.full_name.toLowerCase().includes(term)
        );
    }, [allDoctors, allSearchTerm]);

    const totalAllPages = Math.ceil(filteredAllDoctors.length / ITEMS_PER_PAGE);
    const startAllIndex = (allCurrentPage - 1) * ITEMS_PER_PAGE;
    const currentAllDoctors = filteredAllDoctors.slice(startAllIndex, startAllIndex + ITEMS_PER_PAGE);

    const handleAllSearch = (e) => {
        e.preventDefault();
        setAllCurrentPage(1); // Reset trang khi tìm kiếm
    };


    // ------------------- RENDER COMPONENTS -------------------

    const renderDoctorCard = (doctor) => {
        const specNames = doctor.specializationIds 
            ? doctor.specializationIds.map(id => allSpecializations.find(s => s.id === id)?.name).filter(Boolean)
            : [];

        const cityName = allCities.find(c => c.id === doctor.cityId)?.name;

        return (
            <div key={doctor.doctor_id} className="col-md-6 mb-4">
                <div className="card shadow-sm h-100">
                    <div className="card-body d-flex flex-column">
                        <div className="d-flex align-items-center mb-3">
                            <img 
                                src={doctor.profile_picture || 'https://placehold.co/60x60/3498db/ffffff?text=BS'} 
                                alt={doctor.full_name} 
                                className="rounded-circle me-3"
                                style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                            />
                            <div>
                                <h5 className="card-title mb-0">{doctor.full_name}</h5>
                                <p className="card-text text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                                    {doctor.qualification || 'Chưa cập nhật bằng cấp'}
                                </p>
                            </div>
                        </div>
                        
                        <div className="mb-3">
                            <span className="badge bg-secondary me-2">
                                Chuyên khoa: {specNames.length > 0 ? specNames.join(', ') : 'N/A'}
                            </span>
                            <span className="badge bg-light text-dark border">Thành phố: {cityName || 'N/A'}</span>
                        </div>

                        <p className="flex-grow-1" style={{ fontSize: '0.9rem' }}>
                            {doctor.bio ? doctor.bio.substring(0, 80) + (doctor.bio.length > 80 ? '...' : '') : 'Không có tiểu sử.'}
                        </p>

                        <button 
                            className="btn btn-primary mt-auto" 
                            onClick={() => handleDoctorSelect(doctor)}
                        >
                            Chọn & Xem Lịch Rảnh &rarr;
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderAllDoctorsSection = () => (
        <div className="mt-5 pt-4 border-top">
            <h5 className="text-primary mb-3">Duyệt tất cả Bác sĩ có sẵn</h5>
            
            {/* Thanh Tìm kiếm Tên Bác sĩ */}
            <form onSubmit={handleAllSearch} className="d-flex mb-3">
                <input 
                    type="text" 
                    className="form-control me-2" 
                    placeholder="Tìm kiếm theo Tên Bác sĩ..."
                    value={allSearchTerm}
                    onChange={(e) => setAllSearchTerm(e.target.value)}
                />
                <button type="submit" className="btn btn-outline-primary">
                    <i className="bi bi-search"></i>
                </button>
            </form>

            {/* Danh sách Bác sĩ và Phân trang */}
            {isLoading && allDoctors.length === 0 ? (
                <p className="text-center text-primary">Đang tải danh sách bác sĩ...</p>
            ) : filteredAllDoctors.length === 0 ? (
                <p className="alert alert-info">Không tìm thấy Bác sĩ nào trong hệ thống.</p>
            ) : (
                <>
                    <div className="row">
                        {currentAllDoctors.map(doctor => renderDoctorCard(doctor))}
                    </div>

                    {/* Phân trang */}
                    <div className="d-flex justify-content-center mt-3">
                        <nav>
                            <ul className="pagination mb-0">
                                <li className={`page-item ${allCurrentPage === 1 ? 'disabled' : ''}`}>
                                    <button className="page-link" onClick={() => setAllCurrentPage(Math.max(1, allCurrentPage - 1))}>Trước</button>
                                </li>
                                {/* Render các nút trang */}
                                {[...Array(totalAllPages)].map((_, index) => (
                                    <li key={index} className={`page-item ${allCurrentPage === index + 1 ? 'active' : ''}`}>
                                        <button className="page-link" onClick={() => setAllCurrentPage(index + 1)}>
                                            {index + 1}
                                        </button>
                                    </li>
                                ))}
                                <li className={`page-item ${allCurrentPage === totalAllPages ? 'disabled' : ''}`}>
                                    <button className="page-link" onClick={() => setAllCurrentPage(Math.min(totalAllPages, allCurrentPage + 1))}>Sau</button>
                                </li>
                            </ul>
                        </nav>
                    </div>
                </>
            )}
        </div>
    );

    const renderStepContent = () => {
        if (step === 1) {
            // --- BƯỚC 1: TÌM KIẾM VÀ CHỌN BÁC SĨ ---
            return (
                <div className="card p-4 shadow-sm">
                    <h5 className="text-info mb-3">1. Tìm kiếm Bác sĩ theo tiêu chí</h5>
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
                                <input 
                                    type="date" 
                                    className="form-control" 
                                    name="appointmentDate" 
                                    value={searchParams.appointmentDate} 
                                    onChange={handleSearchChange} 
                                    required 
                                />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary w-100" disabled={isLoading}>
                            {isLoading ? 'Đang tìm kiếm...' : 'Tìm kiếm Lịch Rảnh'}
                        </button>
                    </form>

                    {/* Kết quả Tìm kiếm Lịch Rảnh */}
                    <div className="mt-4">
                        <h6>Kết quả tìm kiếm Bác sĩ có lịch rảnh khớp ({doctorsList.length} bác sĩ)</h6>
                        {isLoading ? (
                            <p className="text-center text-primary">Đang tải...</p>
                        ) : doctorsList.length === 0 && searchParams.cityId ? (
                            <p className="alert alert-warning">Không tìm thấy Bác sĩ có lịch rảnh khớp với tiêu chí trên.</p>
                        ) : doctorsList.length > 0 ? (
                            <div className="row">
                                {doctorsList.map(doctor => renderDoctorCard(doctor))}
                            </div>
                        ) : null}
                    </div>
                    
                    {/* Phần duyệt TẤT CẢ Bác sĩ */}
                    {renderAllDoctorsSection()}
                </div>
            );
        } else if (step === 2) {
            // --- BƯỚC 2: CHỌN NGÀY VÀ KHUNG GIỜ ---
            
            // Hàm tiện ích để lấy tên thứ/ngày
            const getNextSevenDays = () => {
                const dates = [];
                for (let i = 0; i < 7; i++) {
                    const targetDate = new Date();
                    targetDate.setDate(targetDate.getDate() + i);
                    const dateString = targetDate.toISOString().split('T')[0];
                    const dayName = targetDate.toLocaleDateString('vi-VN', { weekday: 'short' });
                    const displayDate = targetDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                    
                    dates.push({ dateString, dayName, displayDate });
                }
                return dates;
            };
            
            const nextSevenDays = getNextSevenDays();

            // Lấy TÊN TẤT CẢ CHUYÊN KHOA
            const doctorSpecNames = selectedDoctor.specializationIds 
                ? selectedDoctor.specializationIds.map(id => allSpecializations.find(s => s.id === id)?.name).filter(Boolean).join(', ')
                : 'N/A';

            return (
                <div className="card p-4 shadow-sm">
                    <h5 className="text-info mb-3">2. Chọn Ngày và Khung giờ Khám</h5>
                    
                    {/* Thẻ thông tin bác sĩ đã chọn */}
                    <DoctorProfileView 
                        doctor={selectedDoctor} 
                        allCities={allCities} 
                        allSpecializations={allSpecializations} 
                        fetchApi={fetchApi}
                    />
                    
                    {/* Thanh chọn ngày trực quan (7 ngày) */}
                    <div className="mb-4 overflow-auto d-flex" style={{ flexWrap: 'nowrap' }}>
                        {nextSevenDays.map(day => {
                            const isActive = day.dateString === searchParams.appointmentDate;
                            return (
                                <button
                                    key={day.dateString}
                                    type="button"
                                    className={`btn p-3 me-2 text-center border ${isActive ? 'btn-success text-white shadow' : 'btn-light'}`}
                                    onClick={() => {
                                        // Cập nhật ngày và kích hoạt useEffect để tải lịch rảnh
                                        setSearchParams(prev => ({ ...prev, appointmentDate: day.dateString }));
                                        setSelectedTime('');
                                    }}
                                    style={{ minWidth: '80px' }}
                                >
                                    <span className="d-block fw-bold">{day.displayDate}</span>
                                    <span style={{ fontSize: '0.8rem' }}>{day.dayName}</span>
                                </button>
                            );
                        })}
                        {/* Thêm nút Ngày khác (Mở lịch đầy đủ - Tùy chọn) */}
                         <button
                            type="button"
                            className={`btn p-3 me-2 text-center border btn-light`}
                            style={{ minWidth: '80px' }}
                            onClick={() => setIsDatePickerModalOpen(true)}
                        >
                            <span className="d-block fw-bold"><i className="bi bi-calendar-plus"></i></span>
                            <span style={{ fontSize: '0.8rem' }}>Ngày khác</span>
                        </button>
                    </div>


                    <h6 className='mt-4'>Khung giờ rảnh ngày {searchParams.appointmentDate}:</h6>
                    
                    {/* Hiển thị lịch rảnh (Slot 30 phút) */}
                    {isLoading ? (
                        <p className="text-center text-muted">Đang tải lịch rảnh...</p>
                    ) : (
                        <div>
                            {availableTimes.length === 0 ? (
                                <p className="alert alert-warning">Không có khung giờ rảnh nào cho ngày này.</p>
                            ) : (
                                <div>
                                    {/* Slot buttons */}
                                    <label className="form-label mt-3">Chọn giờ khám (Slots 30 phút):</label>
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
                                </div>
                            )}
                            
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
                    <button className="btn btn-primary mt-3" onClick={() => {
                        setStep(1);
                        setSearchParams(initialSearchState); // Reset form tìm kiếm
                        setDoctorsList([]); // Xóa kết quả tìm kiếm
                    }}>
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

            {/* Thanh tiến trình */}
            <div className="d-flex justify-content-center mb-4">
                <div className={`p-2 border rounded-start ${step === 1 ? 'bg-primary text-white' : 'bg-light'}`}>1. Chọn Bác sĩ</div>
                <div className={`p-2 border ${step === 2 ? 'bg-primary text-white' : 'bg-light'}`}>2. Chọn Ngày & Giờ</div>
                <div className={`p-2 border rounded-end ${step === 3 ? 'bg-primary text-white' : 'bg-light'}`}>3. Xác nhận</div>
            </div>

            <div className="row justify-content-center">
                <div className="col-lg-8">
                    {renderStepContent()}
                </div>
            </div>
            
            {/* Modal chọn ngày thủ công */}
            <DatePickerModal
                isOpen={isDatePickerModalOpen}
                currentDate={searchParams.appointmentDate || new Date().toISOString().split('T')[0]}
                setDate={handleSetAppointmentDate}
                closeModal={() => setIsDatePickerModalOpen(false)}
            />
        </div>
    );
};

export default PatientAppointmentBookers;