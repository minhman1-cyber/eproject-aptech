import React, { useState, useEffect, useCallback } from 'react';

// URL API Backend (Sửa port 8888 nếu cần)
const API_APPOINTMENTS_URL = 'http://localhost:8888/api/v1/controllers/patient_appointment_list.php'; 

const STATUS_CLASSES = {
    'BOOKED': 'bg-primary',
    'RESCHEDULED': 'bg-info',
    'CANCELLED': 'bg-danger',
    'COMPLETED': 'bg-success',
};

const PatientAppointmentList = () => {
    const [appointments, setAppointments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    
    const [filterStatus, setFilterStatus] = useState('ALL'); // Lọc theo trạng thái

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
                throw new Error(data.message || 'Lỗi hệ thống không xác định.');
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
    const handleCancel = async (id) => {
        if (!window.confirm("Bạn có chắc chắn muốn HỦY lịch hẹn này không?")) return; 
        
        // THỰC TẾ: Cần API PUT/POST riêng để thay đổi trạng thái status = 'CANCELLED'
        try {
            setSuccessMessage(null);
            setIsLoading(true);

            // Giả định API PUT/POST để hủy lịch
            await new Promise(resolve => setTimeout(resolve, 800)); 

            setSuccessMessage(`Đã hủy lịch hẹn #${id} thành công.`);
            fetchAppointments(); 

        } catch (err) {
            setError('Lỗi khi hủy lịch: ' + err.message);
        } finally {
            setIsLoading(false);
        }
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
                            <option value="ALL">Tất cả</option>
                            <option value="BOOKED">Đã đặt</option>
                            <option value="RESCHEDULED">Đã đổi lịch</option>
                            <option value="COMPLETED">Đã hoàn thành</option>
                            <option value="CANCELLED">Đã hủy</option>
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
                                            {app.status === 'BOOKED' && (
                                                <>
                                                    <button className="btn btn-sm btn-outline-info me-2">Đổi lịch</button>
                                                    <button 
                                                        className="btn btn-sm btn-danger" 
                                                        onClick={() => handleCancel(app.id)}
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
        </div>
    );
};

export default PatientAppointmentList;