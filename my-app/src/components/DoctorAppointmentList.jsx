import React, { useState, useEffect, useCallback, useMemo } from 'react';

// URL API Backend
const API_APPOINTMENTS_URL = 'http://localhost:8888/api/v1/controllers/doctor_appointment_list.php'; 
const API_MANAGE_URL = 'http://localhost:8888/api/v1/controllers/doctor_appointment_list.php'; 

// Cấu hình các lớp CSS cho trạng thái
const STATUS_CLASSES = {
    'BOOKED': 'bg-primary',
    'RESCHEDULED': 'bg-info',
    'CANCELLED': 'bg-danger',
    'COMPLETED': 'bg-success',
};

const FILTER_OPTIONS = [
    { value: 'ALL', label: 'Tất cả' },
    { value: 'BOOKED', label: 'Đã đặt' },
    { value: 'RESCHEDULED', label: 'Đã đổi lịch' },
    { value: 'COMPLETED', label: 'Đã hoàn thành' },
    { value: 'CANCELLED', label: 'Đã hủy' },
];


const DoctorAppointmentList = () => {
    const [appointments, setAppointments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    
    // State Lọc
    const [filterStatus, setFilterStatus] = useState('ALL'); 
    const [filterDate, setFilterDate] = useState(''); // Lọc theo ngày
    const [searchTerm, setSearchTerm] = useState(''); // Tìm kiếm bệnh nhân

    // Hàm gọi API FETCH chung (Giữ nguyên)
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


    // ------------------- LOGIC HÀNH ĐỘNG (Hủy & Hoàn thành) -------------------
    const handleAction = useCallback(async (appointmentId, actionType) => {
        const actionMap = {
            'CANCEL': 'HỦY lịch hẹn',
            'COMPLETE': 'HOÀN THÀNH lịch hẹn',
        };
        
        if (!window.confirm(`Bạn có chắc chắn muốn ${actionMap[actionType]} #${appointmentId} này không?`)) return; 
        
        try {
            setSuccessMessage(null);
            setIsLoading(true);

            const payload = {
                id: appointmentId,
                actionType: actionType,
            };

            await fetchApi(API_MANAGE_URL, {
                method: 'PUT',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
            });

            setSuccessMessage(actionMap[actionType] + ' thành công.');
            fetchAppointments(); // Tải lại danh sách

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [fetchApi, fetchAppointments]);


    // ------------------- LOGIC LỌC DỮ LIỆU (MỚI) -------------------
    const filteredAppointments = useMemo(() => {
        return appointments.filter(app => {
            // Lọc theo Trạng thái
            if (filterStatus !== 'ALL' && app.status !== filterStatus) {
                return false;
            }

            // Lọc theo Ngày
            if (filterDate && app.appointmentDate !== filterDate) {
                return false;
            }

            // Tìm kiếm theo Tên Bệnh nhân (hoặc ID)
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const matchesName = app.patientName.toLowerCase().includes(term);
                const matchesId = String(app.id) === term; // Tìm theo ID cuộc hẹn
                if (!matchesName && !matchesId) {
                    return false;
                }
            }

            return true;
        });
    }, [appointments, filterStatus, filterDate, searchTerm]);
    
    // ------------------- RENDER -------------------
    return (
        <div className="container py-5">
            <h2 className="mb-4 text-success">🩺 Lịch Hẹn Khám Bệnh (Doctor Panel)</h2>

            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            {successMessage && <div className="alert alert-success" role="alert">{successMessage}</div>}

            <div className="card shadow-sm p-4">
                {/* Thanh Lọc & Tìm kiếm */}
                <div className="d-flex flex-wrap align-items-center mb-4">
                    
                    {/* Lọc Trạng thái */}
                    <div className="d-flex align-items-center me-4 mb-2">
                        <label className="form-label mb-0 me-2">Trạng thái:</label>
                        <select 
                            className="form-select" 
                            style={{ width: '150px' }}
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            {FILTER_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Lọc Ngày */}
                    <div className="d-flex align-items-center me-4 mb-2">
                        <label className="form-label mb-0 me-2">Ngày khám:</label>
                        <input
                            type="date"
                            className="form-control"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            style={{ width: '150px' }}
                        />
                    </div>
                    
                    {/* Tìm kiếm Bệnh nhân */}
                    <div className="d-flex align-items-center flex-grow-1 mb-2">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Tìm kiếm theo Tên Bệnh nhân / ID lịch hẹn"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Bảng Danh sách Lịch hẹn */}
                <div className="table-responsive">
                    <table className="table table-striped align-middle">
                        <thead className="table-light">
                            <tr>
                                <th>#ID</th>
                                <th>Bệnh nhân</th>
                                <th>Thời gian</th>
                                <th>Lý do khám</th>
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
                                    <td colSpan="7" className="text-center py-4 text-muted">Không tìm thấy lịch hẹn nào khớp với tiêu chí lọc.</td>
                                </tr>
                            ) : (
                                filteredAppointments.map(app => (
                                    <tr key={app.id}>
                                        <td>{app.id}</td>
                                        <td>{app.patientName}</td>
                                        <td>{app.appointmentDate} lúc <strong>{app.appointmentTime}</strong></td>
                                        <td>{app.reason}</td>
                                        <td>
                                            <span className={`badge ${STATUS_CLASSES[app.status] || 'bg-secondary'}`}>
                                                {app.status}
                                            </span>
                                        </td>
                                        <td>{new Date(app.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            {/* Nút chỉ hiện khi trạng thái cho phép (BOOKED/RESCHEDULED) */}
                                            {(app.status === 'BOOKED' || app.status === 'RESCHEDULED') && (
                                                <>
                                                    <button 
                                                        className="btn btn-sm btn-success me-2"
                                                        onClick={() => handleAction(app.id, 'COMPLETE')}
                                                        disabled={isLoading}
                                                    >
                                                        Hoàn thành
                                                    </button>
                                                    <button 
                                                        className="btn btn-sm btn-danger" 
                                                        onClick={() => handleAction(app.id, 'CANCEL')}
                                                        disabled={isLoading}
                                                    >
                                                        Hủy
                                                    </button>
                                                </>
                                            )}
                                            {(app.status === 'CANCELLED' || app.status === 'COMPLETED') && (
                                                <span className="text-muted">Đã kết thúc</span>
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

export default DoctorAppointmentList;