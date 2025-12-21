import React, { useState, useEffect, useCallback, useMemo } from 'react';

// URL API Backend
// Đảm bảo cổng (port) khớp với server PHP của bạn (ví dụ: 8888 hoặc 80)
const API_BASE_URL = 'http://localhost:8888/api/v1/controllers/';
const API_APPOINTMENTS_URL = API_BASE_URL + 'doctor_appointment_list.php'; 

// Cấu hình các lớp CSS cho trạng thái (Badge colors)
const STATUS_CLASSES = {
    'BOOKED': 'bg-primary',       // Xanh dương
    'RESCHEDULED': 'bg-info',     // Xanh nhạt
    'CANCELLED': 'bg-danger',     // Đỏ
    'COMPLETED': 'bg-success',    // Xanh lá
};

// Các tùy chọn lọc trạng thái
const FILTER_OPTIONS = [
    { value: 'ALL', label: 'Tất cả' },
    { value: 'BOOKED', label: 'Đã đặt' },
    { value: 'RESCHEDULED', label: 'Đã đổi lịch' },
    { value: 'COMPLETED', label: 'Đã hoàn thành' },
    { value: 'CANCELLED', label: 'Đã hủy' },
];

const DoctorAppointmentList = () => {
    // --- State Management ---
    const [appointments, setAppointments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    
    // --- Filter States ---
    const [filterStatus, setFilterStatus] = useState('ALL'); 
    const [filterDate, setFilterDate] = useState(''); // YYYY-MM-DD
    const [searchTerm, setSearchTerm] = useState(''); // Tìm theo tên hoặc ID

    // --- Helper: Hàm gọi API chung ---
    const fetchApi = useCallback(async (url, options = {}) => {
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        const response = await fetch(url, {
            ...options,
            credentials: 'include', // Quan trọng: Gửi kèm Cookie/Session
            headers: headers,
        });

        // 1. Check lỗi 401 (Session expired)
        if (response.status === 401) {
            throw new Error("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
        }
        
        // 2. Xử lý response JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            if (!response.ok) {
                // Lấy message lỗi từ backend trả về
                const errorMessage = (response.status === 409 ? 'Xung đột dữ liệu: ' : '') + (data.message || 'Lỗi hệ thống.');
                throw new Error(errorMessage);
            }
            return data;
        }
        
        // 3. Xử lý lỗi không phải JSON (VD: Lỗi PHP Fatal Error in ra text)
        if (!response.ok) {
            throw new Error('Thao tác thất bại (Lỗi Server không trả về JSON).');
        }
        return {};
    }, []);

    // --- 1. Tải danh sách lịch hẹn ---
    const fetchAppointments = useCallback(async () => {
        setError(null);
        setIsLoading(true);
        try {
            const data = await fetchApi(API_APPOINTMENTS_URL, { method: 'GET' });
            // API trả về: { message: "...", data: { appointments: [...] } }
            setAppointments(data.data?.appointments || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [fetchApi]);

    // Gọi API khi component mount
    useEffect(() => {
        fetchAppointments();
    }, [fetchAppointments]);

    // --- 2. Xử lý hành động (Hủy / Hoàn thành) ---
    const handleAction = useCallback(async (appointmentId, actionType) => {
        const actionMap = {
            'CANCEL': 'HỦY lịch hẹn',
            'COMPLETE': 'HOÀN THÀNH lịch hẹn',
        };
        
        if (!window.confirm(`Bạn có chắc chắn muốn ${actionMap[actionType]} #${appointmentId} này không?`)) return; 
        
        try {
            setSuccessMessage(null);
            setError(null);
            setIsLoading(true);

            // Payload gửi lên backend
            const payload = {
                id: appointmentId,
                actionType: actionType,
            };

            // Gọi API với method PUT
            const data = await fetchApi(API_APPOINTMENTS_URL, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });

            setSuccessMessage(data.message || `${actionMap[actionType]} thành công.`);
            
            // Tải lại danh sách để cập nhật trạng thái mới nhất
            fetchAppointments(); 

        } catch (err) {
            setError(err.message);
            setIsLoading(false); // Chỉ tắt loading ở đây nếu lỗi, nếu thành công thì fetchAppointments sẽ xử lý loading
        }
    }, [fetchApi, fetchAppointments]);

    // --- 3. Logic Lọc dữ liệu (Client-side Filtering) ---
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

            // Tìm kiếm theo Tên Bệnh nhân hoặc ID
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const matchesName = (app.patientName || '').toLowerCase().includes(term);
                const matchesId = String(app.id) === term; 
                if (!matchesName && !matchesId) {
                    return false;
                }
            }

            return true;
        });
    }, [appointments, filterStatus, filterDate, searchTerm]);
    
    // --- Render ---
    return (
        <div className="container py-5">
            <h2 className="mb-4 text-primary fw-bold">
                <i className="bi bi-calendar-check-fill me-2"></i> Quản lý Lịch hẹn
            </h2>

            {/* Thông báo lỗi / thành công */}
            {error && <div className="alert alert-danger shadow-sm" role="alert"><i className="bi bi-exclamation-triangle-fill me-2"></i>{error}</div>}
            {successMessage && <div className="alert alert-success shadow-sm" role="alert"><i className="bi bi-check-circle-fill me-2"></i>{successMessage}</div>}

            <div className="card shadow border-0 rounded-3">
                <div className="card-body p-4">
                    
                    {/* --- THANH CÔNG CỤ (FILTER & SEARCH) --- */}
                    <div className="row g-3 mb-4">
                        {/* Lọc Trạng thái */}
                        <div className="col-md-3 col-sm-6">
                            <label className="form-label fw-bold text-muted small">Trạng thái</label>
                            <select 
                                className="form-select" 
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                {FILTER_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Lọc Ngày */}
                        <div className="col-md-3 col-sm-6">
                            <label className="form-label fw-bold text-muted small">Ngày khám</label>
                            <input
                                type="date"
                                className="form-control"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                            />
                        </div>
                        
                        {/* Tìm kiếm */}
                        <div className="col-md-6 col-sm-12">
                            <label className="form-label fw-bold text-muted small">Tìm kiếm</label>
                            <div className="input-group">
                                <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Tên bệnh nhân hoặc Mã số lịch hẹn..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* --- BẢNG DỮ LIỆU --- */}
                    <div className="table-responsive">
                        <table className="table table-hover align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th scope="col">#ID</th>
                                    <th scope="col">Bệnh nhân</th>
                                    <th scope="col">Thời gian</th>
                                    <th scope="col">Lý do khám</th>
                                    <th scope="col">Trạng thái</th>
                                    <th scope="col">Ngày tạo</th>
                                    <th scope="col" className="text-end">Hành động</th>
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
                                            Không tìm thấy lịch hẹn nào phù hợp.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAppointments.map(app => (
                                        <tr key={app.id}>
                                            <td className="fw-bold text-muted">#{app.id}</td>
                                            <td className="fw-bold text-primary">{app.patientName}</td>
                                            <td>
                                                <div className="d-flex flex-column">
                                                    <span className="fw-bold">{app.appointmentTime}</span>
                                                    <span className="small text-muted">{app.appointmentDate}</span>
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
                                            <td className="text-end">
                                                {/* Logic hiển thị nút bấm dựa trên trạng thái */}
                                                {(app.status === 'BOOKED' || app.status === 'RESCHEDULED') && (
                                                    <div className="d-flex justify-content-end gap-2">
                                                        <button 
                                                            className="btn btn-sm btn-outline-success d-flex align-items-center"
                                                            onClick={() => handleAction(app.id, 'COMPLETE')}
                                                            disabled={isLoading}
                                                            title="Đánh dấu đã khám xong"
                                                        >
                                                            <i className="bi bi-check-lg me-1"></i> Xong
                                                        </button>
                                                        <button 
                                                            className="btn btn-sm btn-outline-danger d-flex align-items-center" 
                                                            onClick={() => handleAction(app.id, 'CANCEL')}
                                                            disabled={isLoading}
                                                            title="Hủy lịch hẹn này"
                                                        >
                                                            <i className="bi bi-x-lg me-1"></i> Hủy
                                                        </button>
                                                    </div>
                                                )}
                                                
                                                {(app.status === 'CANCELLED' || app.status === 'COMPLETED') && (
                                                    <span className="text-muted small fst-italic">Đã đóng</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* End Table Responsive */}
                    
                    <div className="mt-3 text-muted small text-end">
                        Tổng cộng: <strong>{filteredAppointments.length}</strong> bản ghi
                    </div>

                </div>
            </div>
        </div>
    );
};

export default DoctorAppointmentList;