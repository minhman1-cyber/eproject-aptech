import React, { useState, useEffect, useCallback } from 'react';

// URL API Backend
const API_BASE_URL = 'http://localhost:8888/api/v1/controllers/';
const API_APPOINTMENTS_URL = API_BASE_URL + 'patient_appointment_list.php'; 
const API_MANAGE_URL = API_BASE_URL + 'manage_appointments.php'; 
const API_AVAILABILITY_URL = API_BASE_URL + 'doctor_availability_view.php'; 

// Cấu hình các lớp CSS cho trạng thái
const STATUS_CLASSES = {
    'BOOKED': 'bg-primary',
    'RESCHEDULED': 'bg-info',
    'CANCELLED': 'bg-danger',
    'COMPLETED': 'bg-success',
};

// Cấu hình các trạng thái lọc
const FILTER_OPTIONS = [
    { value: 'ALL', label: 'Tất cả' },
    { value: 'BOOKED', label: 'Đã đặt' },
    { value: 'RESCHEDULED', label: 'Đã đổi lịch' },
    { value: 'COMPLETED', label: 'Đã hoàn thành' },
    { value: 'CANCELLED', label: 'Đã hủy' },
];

// =======================================================
// COMPONENT PHỤ: MODAL ĐỔI LỊCH (RESCHEDULE)
// =======================================================
const RescheduleModal = ({ appointment, isModalOpen, closeModal, refreshList, fetchApi }) => {
    
    const [currentDate, setCurrentDate] = useState(''); // Ngày đang chọn để xem lịch
    const [availableTimes, setAvailableTimes] = useState([]);
    const [selectedTime, setSelectedTime] = useState('');

    const [localError, setLocalError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Hàm tải lịch rảnh cho ngày đã chọn
    const fetchAvailability = useCallback(async (doctorId, date) => {
        if (!doctorId || !date) return;
        
        setIsLoading(true);
        setLocalError(null);
        setSelectedTime('');

        try {
            const payload = { doctorId, appointmentDate: date };
            const data = await fetchApi(API_AVAILABILITY_URL, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            
            // API trả về mảng các object: { id, time, endTime, isBooked }
            setAvailableTimes(data.data.availableTimes || []);

        } catch (err) {
            setLocalError("Lỗi tải lịch rảnh: " + err.message);
            setAvailableTimes([]);
        } finally {
            setIsLoading(false);
        }
    }, [fetchApi]);

    // Hàm set ngày từ Modal Date Picker
    const handleSetDate = (dateString) => {
        setCurrentDate(dateString);
        // fetchAvailability sẽ được gọi bởi useEffect
    };

    // Effect: Thiết lập ngày ban đầu
    useEffect(() => {
        if (isModalOpen && appointment) {
            setCurrentDate(appointment.appointmentDate);
        }
    }, [isModalOpen, appointment]);

    // Effect: Tự động tải lịch rảnh khi ngày thay đổi
    useEffect(() => {
        if (currentDate && appointment?.doctor_id) { 
            fetchAvailability(appointment.doctor_id, currentDate);
        }
    }, [currentDate, appointment, fetchAvailability]); 


    if (!isModalOpen || !appointment) return null;

    // Helper tạo danh sách 7 ngày tới
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

    // Xử lý đổi lịch
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError(null);
        setIsLoading(true);

        if (!currentDate || !selectedTime) {
            setLocalError("Vui lòng chọn Ngày và Giờ mới.");
            setIsLoading(false);
            return;
        }

        // Validate trùng lịch cũ
        if (currentDate === appointment.appointmentDate && selectedTime === appointment.appointmentTime) {
             setLocalError("Bạn phải chọn ngày giờ khác với lịch hẹn hiện tại.");
             setIsLoading(false);
             return;
        }

        const payload = {
            actionType: 'RESCHEDULE',
            id: appointment.id,
            newDate: currentDate,
            newTime: selectedTime,
        };

        try {
            const data = await fetchApi(API_MANAGE_URL, {
                method: 'PUT',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
            });

            window.alert(data.message || `Đổi lịch hẹn #${appointment.id} thành công!`);
            closeModal();
            refreshList();

        } catch (err) {
            setLocalError(err.message);
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }} tabIndex="-1">
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content">
                    <form onSubmit={handleSubmit}>
                        <div className="modal-header bg-info text-white">
                            <h5 className="modal-title">Đổi Lịch Hẹn với BS. {appointment.doctorName}</h5>
                            <button type="button" className="btn-close btn-close-white" onClick={closeModal} disabled={isLoading}></button>
                        </div>
                        <div className="modal-body">
                            {localError && <div className="alert alert-danger" role="alert">{localError}</div>}
                            
                            {/* 1. Chọn Ngày */}
                            <label className="form-label fw-bold">Chọn Ngày Khám mới:</label>
                            <div className="mb-4 overflow-auto d-flex border p-2 rounded bg-light" style={{ flexWrap: 'nowrap' }}>
                                {nextSevenDays.map(day => {
                                    const isActive = day.dateString === currentDate;
                                    return (
                                        <button
                                            key={day.dateString}
                                            type="button"
                                            className={`btn p-2 me-2 text-center border ${isActive ? 'btn-success text-white shadow' : 'btn-white bg-white'}`}
                                            onClick={() => handleSetDate(day.dateString)}
                                            style={{ minWidth: '80px', flexShrink: 0 }}
                                        >
                                            <span className="d-block fw-bold">{day.displayDate}</span>
                                            <span style={{ fontSize: '0.8rem' }}>{day.dayName}</span>
                                        </button>
                                    );
                                })}
                                {/* Input date picker cho ngày xa hơn */}
                                <input
                                    type="date"
                                    className="form-control"
                                    style={{ width: 'auto', minWidth: '130px' }}
                                    onChange={(e) => handleSetDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    title="Chọn ngày khác"
                                />
                            </div>

                            {/* 2. Hiển thị Slot Rảnh */}
                            <h6 className='mt-4 fw-bold text-muted'>Khung giờ rảnh ngày {currentDate}:</h6>
                            
                            {isLoading ? (
                                <div className="text-center py-3">
                                    <div className="spinner-border text-info" role="status"></div>
                                    <p className="text-muted mt-2">Đang tải lịch...</p>
                                </div>
                            ) : availableTimes.length === 0 ? (
                                <p className="alert alert-warning">Bác sĩ không có lịch rảnh vào ngày này.</p>
                            ) : (
                                <div>
                                    <div className="d-flex flex-wrap gap-2">
                                        {availableTimes.map(slot => (
                                            <button 
                                                key={slot.id} // Dùng ID slot làm key
                                                type="button"
                                                className={`btn ${slot.isBooked ? 'btn-secondary disabled' : selectedTime === slot.time ? 'btn-info text-white' : 'btn-outline-info'}`}
                                                onClick={() => !slot.isBooked && setSelectedTime(slot.time)}
                                                disabled={slot.isBooked}
                                                style={{ minWidth: '110px' }}
                                            >
                                                {slot.time} - {slot.endTime}
                                                {slot.isBooked && <span className="d-block small" style={{fontSize: '0.7em'}}>(Đã kín)</span>}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="mt-3 p-2 bg-light rounded text-center">
                                        Giờ chọn: <strong>{selectedTime ? selectedTime : 'Chưa chọn'}</strong>
                                    </div>
                                </div>
                            )}

                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={isLoading}>Hủy</button>
                            <button type="submit" className="btn btn-info text-white" disabled={!selectedTime || isLoading}>
                                {isLoading ? 'Đang xử lý...' : 'Xác nhận Đổi lịch'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};


// =======================================================
// COMPONENT CHÍNH: DANH SÁCH LỊCH HẸN
// =======================================================

const PatientAppointmentList = () => {
    const [appointments, setAppointments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    
    const [filterStatus, setFilterStatus] = useState('ALL'); 
    
    const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
    const [rescheduleAppointment, setRescheduleAppointment] = useState(null); 

    // Hàm gọi API FETCH chung
    const fetchApi = useCallback(async (url, options) => {
        const response = await fetch(url, {
            ...options,
            credentials: 'include',
            headers: options.headers || {},
        });

        if (response.status === 401) {
            throw new Error("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
        }
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            if (!response.ok) {
                const errorMessage = (response.status === 409 ? 'Lỗi trùng lặp: ' : '') + (data.message || 'Lỗi hệ thống không xác định.');
                throw new Error(errorMessage);
            }
            return data;
        }
        
        if (!response.ok) {
            throw new Error('Thao tác thất bại (Lỗi Server).');
        }
        return {};
    }, []);

    // ------------------- TẢI DANH SÁCH LỊCH HẸN -------------------
    const fetchAppointments = useCallback(async () => {
        setError(null);
        setIsLoading(true);
        try {
            const data = await fetchApi(API_APPOINTMENTS_URL, { method: 'GET' });
            setAppointments(data.data.appointments || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [fetchApi]);

    useEffect(() => {
        fetchAppointments();
    }, [fetchAppointments]);


    // ------------------- LOGIC HỦY LỊCH -------------------
    const handleCancel = async (appointmentId) => {
        if (!window.confirm(`Bạn có chắc chắn muốn HỦY lịch hẹn #${appointmentId} này không?`)) return; 
        
        try {
            setSuccessMessage(null);
            setIsLoading(true);

            const payload = {
                id: appointmentId,
                actionType: 'CANCEL',
            };

            const data = await fetchApi(API_MANAGE_URL, {
                method: 'PUT',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
            });

            setSuccessMessage(data.message || 'Đã hủy lịch hẹn thành công.');
            fetchAppointments(); 

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Mở Modal đổi lịch
    const openRescheduleModal = (app) => {
        if (!app.doctor_id) {
            console.error("Doctor ID không hợp lệ:", app);
            return;
        }
        // Clone object để tránh tham chiếu
        const appToEdit = { ...app, doctor_id: Number(app.doctor_id) };
        setRescheduleAppointment(appToEdit);
        setIsRescheduleModalOpen(true);
    };

    // ------------------- LOGIC LỌC DỮ LIỆU -------------------
    const filteredAppointments = appointments.filter(app => {
        if (filterStatus === 'ALL') return true;
        return app.status === filterStatus;
    });
    
    // ------------------- RENDER UI -------------------
    return (
        <div className="container py-5">
            <h2 className="mb-4 text-primary fw-bold"><i className="bi bi-calendar-check me-2"></i>Lịch Hẹn Của Tôi</h2>

            {error && <div className="alert alert-danger shadow-sm" role="alert"><i className="bi bi-exclamation-triangle-fill me-2"></i> {error}</div>}
            {successMessage && <div className="alert alert-success shadow-sm" role="alert"><i className="bi bi-check-circle-fill me-2"></i> {successMessage}</div>}

            <div className="card shadow border-0 rounded-3">
                <div className="card-header bg-white py-3">
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                        <div className="d-flex align-items-center">
                            <label className="form-label mb-0 me-2 fw-bold text-muted">Trạng thái:</label>
                            <select 
                                className="form-select" 
                                style={{ width: '200px' }}
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                {FILTER_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                        <button className="btn btn-primary" onClick={() => window.location.href = '/patient/booking'}>
                            <i className="bi bi-plus-lg me-2"></i> Đặt lịch mới
                        </button>
                    </div>
                </div>

                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th className="ps-4">#ID</th>
                                    <th>Bác sĩ</th>
                                    <th>Thời gian</th>
                                    <th>Lý do</th>
                                    <th>Trạng thái</th>
                                    <th>Ngày tạo</th>
                                    <th className="text-end pe-4">Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="7" className="text-center py-5 text-muted">
                                            <div className="spinner-border text-primary me-2" role="status"></div>
                                            Đang tải dữ liệu...
                                        </td>
                                    </tr>
                                ) : filteredAppointments.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="text-center py-5 text-muted">
                                            <i className="bi bi-inbox fs-1 d-block mb-2 opacity-50"></i>
                                            Bạn chưa có lịch hẹn nào.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAppointments.map(app => (
                                        <tr key={app.id}>
                                            <td className="ps-4 fw-bold text-muted">#{app.id}</td>
                                            <td className="fw-bold text-primary">{app.doctorName}</td>
                                            <td>
                                                <div className="d-flex flex-column">
                                                    <span className="fw-bold">{app.appointmentTime}</span>
                                                    <span className="small text-muted">{new Date(app.appointmentDate).toLocaleDateString('vi-VN')}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="d-inline-block text-truncate" style={{maxWidth: '150px'}} title={app.reason}>
                                                    {app.reason}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge ${STATUS_CLASSES[app.status] || 'bg-secondary'} rounded-pill px-3`}>
                                                    {app.status}
                                                </span>
                                            </td>
                                            <td className="small text-muted">{new Date(app.createdAt).toLocaleDateString('vi-VN')}</td>
                                            <td className="text-end pe-4">
                                                {(app.status === 'BOOKED' || app.status === 'RESCHEDULED') ? (
                                                    <div className="d-flex justify-content-end gap-2">
                                                        <button 
                                                            className="btn btn-sm btn-outline-info"
                                                            onClick={() => openRescheduleModal(app)}
                                                            disabled={isLoading}
                                                            title="Đổi sang ngày/giờ khác"
                                                        >
                                                            <i className="bi bi-calendar-range me-1"></i> Đổi lịch
                                                        </button>
                                                        <button 
                                                            className="btn btn-sm btn-outline-danger" 
                                                            onClick={() => handleCancel(app.id)}
                                                            disabled={isLoading}
                                                            title="Hủy lịch hẹn"
                                                        >
                                                            <i className="bi bi-x-lg me-1"></i> Hủy
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted small fst-italic">Không khả dụng</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            {/* Modal Đổi lịch */}
            <RescheduleModal
                appointment={rescheduleAppointment}
                isModalOpen={isRescheduleModalOpen}
                closeModal={() => {
                    setIsRescheduleModalOpen(false);
                    setRescheduleAppointment(null);
                }}
                refreshList={fetchAppointments}
                fetchApi={fetchApi}
            />
        </div>
    );
};

export default PatientAppointmentList;