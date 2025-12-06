import React, { useState, useEffect, useCallback } from 'react';

// URL API Backend (Sửa port 8888 nếu cần)
const API_APPOINTMENTS_URL = 'http://localhost:8888/api/v1/controllers/patient_appointment_list.php'; 
const API_MANAGE_URL = 'http://localhost:8888/api/v1/controllers/manage_appointments.php'; 
const API_AVAILABILITY_URL = 'http://localhost:8888/api/v1/controllers/doctor_availability_view.php'; 

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

// Cấu hình các ngày trong tuần cho Modal
const DAYS_OF_WEEK = [
    { value: 1, label: 'Thứ 2' }, { value: 2, label: 'Thứ 3' }, { value: 3, label: 'Thứ 4' },
    { value: 4, label: 'Thứ 5' }, { value: 5, label: 'Thứ 6' }, { value: 6, label: 'Thứ 7' },
    { value: 0, label: 'Chủ Nhật' },
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
        console.log("DEBUG: FETCH START for Doctor:", doctorId, "on Date:", date); // Log BẮT ĐẦU FETCH
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
            
            setAvailableTimes(data.data.availableTimes || []);

        } catch (err) {
            setLocalError("Lỗi tải lịch rảnh: " + err.message);
            setAvailableTimes([]);
        } finally {
            setIsLoading(false);
        }
    }, [fetchApi]);

    // Hàm set ngày từ Modal Date Picker (Kích hoạt fetch trực tiếp)
    const handleSetDate = (dateString) => {
        // Bước 1: Cập nhật state
        setCurrentDate(dateString);
        setSelectedTime('');
        
        // Bước 2: Kích hoạt fetchAvailability trực tiếp
        // Điều kiện: Chỉ fetch khi appointment và doctor_id đã có
        if (appointment?.doctor_id) {
             console.log("DEBUG: Manual Date Set, initiating fetch for date:", dateString); // Log khi click
             fetchAvailability(appointment.doctor_id, dateString);
        }
    };

    // Effect 1: Thiết lập ngày ban đầu khi Modal mở
    useEffect(() => {
        if (isModalOpen && appointment) {
            const initialDate = appointment.appointmentDate;
            setCurrentDate(initialDate);
        }
    }, [isModalOpen, appointment]);

    // Effect 2: Tự động tải lịch rảnh khi ngày thay đổi (QUAN TRỌNG)
    useEffect(() => {
        // Chỉ tải lịch nếu ngày đã có và doctor_id là số hợp lệ
        if (currentDate && typeof appointment?.doctor_id === 'number' && appointment.doctor_id > 0) { 
            fetchAvailability(appointment.doctor_id, currentDate);
        } else if (isModalOpen) {
            console.log("DEBUG: Fetch skipped due to invalid Doctor ID or missing date.", { date: currentDate, id: appointment?.doctor_id });
        }

    }, [currentDate, appointment]); 


    if (!isModalOpen || !appointment) return null;

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

    // HÀM BỊ THIẾU: XỬ LÝ SUBMIT ĐỔI LỊCH
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError(null);
        setIsLoading(true);

        if (!currentDate || !selectedTime) {
            setLocalError("Vui lòng chọn Ngày và Giờ mới.");
            setIsLoading(false);
            return;
        }

        // Kiểm tra xem giờ mới có trùng với giờ cũ không
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
            await fetchApi(API_MANAGE_URL, {
                method: 'PUT',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
            });

            window.alert(`Đổi lịch hẹn #${appointment.id} thành công!`);
            closeModal();
            refreshList();

        } catch (err) {
            setLocalError(err.message);
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <form onSubmit={handleSubmit}>
                        <div className="modal-header bg-info text-white">
                            <h5 className="modal-title">Đổi Lịch Hẹn với BS. {appointment.doctorName}</h5>
                            <button type="button" className="btn-close btn-close-white" onClick={closeModal} disabled={isLoading}></button>
                        </div>
                        <div className="modal-body">
                            {localError && <div className="alert alert-danger" role="alert">{localError}</div>}
                            
                            {/* Thanh chọn ngày trực quan (7 ngày) */}
                            <label className="form-label fw-bold">Chọn Ngày Khám mới:</label>
                            <div className="mb-4 overflow-auto d-flex border p-2 rounded" style={{ flexWrap: 'nowrap' }}>
                                {nextSevenDays.map(day => {
                                    const isActive = day.dateString === currentDate;
                                    return (
                                        <button
                                            key={day.dateString}
                                            type="button"
                                            className={`btn p-2 me-2 text-center border ${isActive ? 'btn-success text-white shadow' : 'btn-light'}`}
                                            onClick={() => handleSetDate(day.dateString)} // <<< Dòng này gọi handleSetDate
                                            style={{ minWidth: '80px', flexShrink: 0 }}
                                        >
                                            <span className="d-block fw-bold">{day.displayDate}</span>
                                            <span style={{ fontSize: '0.8rem' }}>{day.dayName}</span>
                                        </button>
                                    );
                                })}
                                {/* Nút Ngày khác (Mở input date picker) */}
                                <input
                                    type="date"
                                    className="btn btn-light p-2 me-2 text-center border"
                                    style={{ minWidth: '80px', flexShrink: 0 }}
                                    onChange={(e) => handleSetDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    title="Chọn ngày khác"
                                />
                            </div>

                            {/* Hiển thị Slot Rảnh */}
                            <h6 className='mt-4'>Khung giờ rảnh ngày {currentDate}:</h6>
                            
                            {isLoading ? (
                                <p className="text-center text-muted">Đang tải lịch...</p>
                            ) : availableTimes.length === 0 ? (
                                <p className="alert alert-warning">Không có khung giờ rảnh nào cho ngày này.</p>
                            ) : (
                                <div>
                                    <label className="form-label mt-3">Chọn giờ khám (Slots 30 phút):</label>
                                    <div className="d-flex flex-wrap">
                                        {availableTimes.map(slot => (
                                            <button 
                                                key={slot.time}
                                                type="button"
                                                className={`btn m-1 ${slot.isBooked ? 'btn-danger disabled' : selectedTime === slot.time ? 'btn-primary' : 'btn-outline-primary'}`}
                                                onClick={() => !slot.isBooked && setSelectedTime(slot.time)}
                                                disabled={slot.isBooked}
                                            >
                                                {slot.time} {slot.isBooked && '(Đã đặt)'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={isLoading}>Hủy</button>
                            <button type="submit" className="btn btn-info text-white" disabled={!selectedTime || isLoading}>
                                {isLoading ? 'Đang lưu...' : 'Xác nhận Đổi lịch'}
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
    
    const [filterStatus, setFilterStatus] = useState('ALL'); // Lọc theo trạng thái
    
    const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
    const [rescheduleAppointment, setRescheduleAppointment] = useState(null); // Lịch hẹn đang được đổi

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
                // Kiểm tra lỗi 409 Conflict từ Backend
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


    // ------------------- LOGIC HÀNH ĐỘNG (Hủy lịch) -------------------
    const handleCancel = async (appointmentId) => {
        if (!window.confirm(`Bạn có chắc chắn muốn HỦY lịch hẹn #${appointmentId} này không?`)) return; 
        
        try {
            setSuccessMessage(null);
            setIsLoading(true);

            const payload = {
                id: appointmentId,
                actionType: 'CANCEL',
            };

            await fetchApi(API_MANAGE_URL, {
                method: 'PUT',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
            });

            setSuccessMessage('Đã hủy lịch hẹn thành công.');
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
        return; // Không mở modal nếu thiếu doctor_id
    }
    // Chuyển sang number nếu cần
    app.doctor_id = Number(app.doctor_id);
    setRescheduleAppointment(app);
    setIsRescheduleModalOpen(true);
};

    // ------------------- LOGIC LỌC DỮ LIỆU -------------------
    const filteredAppointments = appointments.filter(app => {
        if (filterStatus === 'ALL') return true;
        return app.status === filterStatus;
    });
    
    // ------------------- RENDER -------------------
    return (
        <div className="container py-5">
            <h2 className="mb-4 text-primary">📋 Lịch Hẹn Khám Bệnh Của Tôi</h2>

            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            {successMessage && <div className="alert alert-success" role="alert">{successMessage}</div>}

            <div className="card shadow-sm p-4">
                {/* Thanh Lọc */}
                <div className="d-flex justify-content-between mb-4">
                    <div className="d-flex align-items-center">
                        <label className="form-label mb-0 me-2">Lọc theo Trạng thái:</label>
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
                    {/* Thêm nút Quay lại Đặt lịch nếu cần */}
                    <button className="btn btn-primary" onClick={() => window.location.href = '/'}>
                        <i className="bi bi-calendar-plus me-2"></i> Đặt lịch mới
                    </button>
                </div>

                {/* Bảng Danh sách Lịch hẹn */}
                <div className="table-responsive">
                    <table className="table table-striped align-middle">
                        <thead className="table-light">
                            <tr>
                                <th>#ID</th>
                                <th>Bác sĩ</th>
                                <th>Thời gian</th>
                                <th>Lý do</th>
                                <th>Trạng thái</th>
                                <th>Ngày tạo</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-4 text-muted">Đang tải lịch hẹn...</td>
                                </tr>
                            ) : filteredAppointments.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-4 text-muted">Bạn chưa có lịch hẹn nào.</td>
                                </tr>
                            ) : (
                                filteredAppointments.map(app => (
                                    <tr key={app.id}>
                                        <td>{app.id}</td>
                                        <td>{app.doctorName}</td>
                                        <td>{app.appointmentDate} lúc <strong>{app.appointmentTime}</strong></td>
                                        <td>{app.reason}</td>
                                        <td>
                                            <span className={`badge ${STATUS_CLASSES[app.status] || 'bg-secondary'}`}>
                                                {app.status}
                                            </span>
                                        </td>
                                        <td>{new Date(app.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            {/* Chỉ hiển thị nút khi trạng thái là BOOKED hoặc RESCHEDULED */}
                                            {(app.status === 'BOOKED' || app.status === 'RESCHEDULED') && (
                                                <>
                                                    <button 
                                                        className="btn btn-sm btn-outline-info me-2"
                                                        onClick={() => openRescheduleModal(app)}
                                                        disabled={isLoading}
                                                    >
                                                        Đổi lịch
                                                    </button>
                                                    <button 
                                                        className="btn btn-sm btn-danger" 
                                                        onClick={() => handleCancel(app.id)}
                                                        disabled={isLoading}
                                                    >
                                                        Hủy
                                                    </button>
                                                </>
                                            )}
                                            {(app.status === 'CANCELLED' || app.status === 'COMPLETED') && (
                                                <span className="text-muted">Không có</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
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