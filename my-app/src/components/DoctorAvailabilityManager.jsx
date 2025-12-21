import React, { useState, useEffect, useCallback } from 'react';

// URL API Backend
const API_BASE_URL = 'http://localhost:8888/api/v1/controllers/';
const API_AVAILABILITY_URL = API_BASE_URL + 'doctor_availability.php'; 

// Cấu hình các ngày trong tuần
const DAYS_OF_WEEK = [
    { value: 1, label: 'Thứ 2' },
    { value: 2, label: 'Thứ 3' },
    { value: 3, label: 'Thứ 4' },
    { value: 4, label: 'Thứ 5' },
    { value: 5, label: 'Thứ 6' },
    { value: 6, label: 'Thứ 7' },
    { value: 0, label: 'Chủ Nhật' },
];

const initialFormState = {
    startDate: '',      // YYYY-MM-DD
    endDate: '',        // YYYY-MM-DD
    startTime: '08:00',
    endTime: '17:00',
    daysOfWeek: [1, 2, 3, 4, 5], // Mặc định chọn T2-T6
    duration: 30        // Mặc định 30 phút
};

const DoctorAvailabilityManager = () => {
    // --- State điều khiển chế độ ---
    const [mode, setMode] = useState('CREATE'); // 'CREATE' (Tạo lịch) hoặc 'LOCK' (Báo nghỉ)
    const [lockDate, setLockDate] = useState(''); // Ngày muốn khóa toàn bộ

    // --- State cho Form tạo lịch ---
    const [formData, setFormData] = useState(initialFormState);
    
    // --- State cho Danh sách lịch (View) ---
    const [availabilityList, setAvailabilityList] = useState([]);
    const [viewStartDate, setViewStartDate] = useState(new Date().toISOString().split('T')[0]); // Xem từ hôm nay
    const [viewEndDate, setViewEndDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 14); // Mặc định xem 2 tuần tới
        return d.toISOString().split('T')[0];
    });

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // --- Helper: Hàm gọi API chung ---
    const fetchApi = useCallback(async (url, options = {}) => {
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        const response = await fetch(url, {
            ...options,
            credentials: 'include',
            headers: headers,
        });

        if (response.status === 401) {
            throw new Error("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
        }
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Lỗi hệ thống.');
            }
            return data;
        }
        
        if (!response.ok) {
            throw new Error('Thao tác thất bại (Lỗi Server).');
        }
        return {};
    }, []);

    // ============================================
    // 1. TẢI DANH SÁCH SLOT (GET)
    // ============================================
    const fetchAvailability = useCallback(async () => {
        setError(null);
        setIsLoading(true);
        try {
            // Gửi query params để lọc theo ngày xem
            const queryParams = new URLSearchParams({
                start: viewStartDate,
                end: viewEndDate
            }).toString();

            const data = await fetchApi(`${API_AVAILABILITY_URL}?${queryParams}`, { method: 'GET' });
            setAvailabilityList(data.data || []);
            
        } catch (err) {
            setError('Lỗi khi tải lịch: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    }, [fetchApi, viewStartDate, viewEndDate]);

    useEffect(() => {
        fetchAvailability();
    }, [fetchAvailability]);

    // ============================================
    // 2. XỬ LÝ FORM TẠO LỊCH (POST)
    // ============================================
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleDayToggle = (dayValue) => {
        setFormData(prev => {
            const currentDays = prev.daysOfWeek;
            const dayNum = parseInt(dayValue); 
            if (currentDays.includes(dayNum)) {
                return { ...prev, daysOfWeek: currentDays.filter(day => day !== dayNum) };
            } else {
                return { ...prev, daysOfWeek: [...currentDays, dayNum].sort((a, b) => a - b) };
            }
        });
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        
        const { startDate, endDate, startTime, endTime, daysOfWeek } = formData;

        // Validation frontend
        if (!startDate || !endDate) return setError("Vui lòng chọn Ngày bắt đầu và Ngày kết thúc.");
        if (new Date(startDate) > new Date(endDate)) return setError("Ngày kết thúc phải sau Ngày bắt đầu.");
        if (!startTime || !endTime) return setError("Vui lòng chọn khung giờ làm việc.");
        if (daysOfWeek.length === 0) return setError("Vui lòng chọn ít nhất một ngày trong tuần.");

        try {
            setIsSubmitting(true);
            const payload = { startDate, endDate, daysOfWeek, startTime, endTime, duration: 30 };
            
            const res = await fetchApi(API_AVAILABILITY_URL, { 
                method: 'POST', 
                body: JSON.stringify(payload) 
            });

            setSuccessMessage(res.message || "Đã tạo lịch làm việc thành công!");
            fetchAvailability(); 

        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ============================================
    // 3. XỬ LÝ KHÓA / MỞ KHÓA NGÀY (PUT)
    // ============================================
    const handleLockDaySubmit = async (e, type) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        if (!lockDate) return setError("Vui lòng chọn ngày cần thao tác.");
        
        const actionText = type === 'LOCK' ? 'KHÓA' : 'MỞ';
        if (!window.confirm(`Bạn có chắc chắn muốn ${actionText} toàn bộ các slot TRỐNG trong ngày ${lockDate}? (Các slot đã có người đặt sẽ không bị ảnh hưởng)`)) return;

        try {
            setIsSubmitting(true);
            const payload = {
                action: 'lock_day',
                date: lockDate,
                type: type // 'LOCK' hoặc 'UNLOCK'
            };

            const res = await fetchApi(API_AVAILABILITY_URL, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });

            setSuccessMessage(res.message);
            fetchAvailability();

        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ============================================
    // 4. XỬ LÝ KHÓA / MỞ KHÓA 1 SLOT (PUT)
    // ============================================
    const handleToggleSlotLock = async (id, currentStatus) => {
        // currentStatus: 1 (Đang khóa) -> Muốn mở (0)
        // currentStatus: 0 (Đang mở) -> Muốn khóa (1)
        const newStatus = parseInt(currentStatus) === 1 ? 0 : 1;
        
        try {
            // Optimistic update (Cập nhật UI trước khi gọi API để cảm giác nhanh hơn)
            setAvailabilityList(prev => prev.map(item => 
                item.id === id ? { ...item, is_locked: newStatus } : item
            ));

            await fetchApi(API_AVAILABILITY_URL, {
                method: 'PUT',
                body: JSON.stringify({
                    action: 'toggle_slot',
                    id: id,
                    is_locked: newStatus
                })
            });

        } catch (err) {
            setError("Lỗi cập nhật trạng thái: " + err.message);
            fetchAvailability(); // Revert lại dữ liệu cũ nếu lỗi
        }
    };

    // ============================================
    // 5. XỬ LÝ XÓA SLOT (DELETE)
    // ============================================
    const handleDelete = async (id) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa vĩnh viễn slot này không?")) return;
        
        try {
            await fetchApi(API_AVAILABILITY_URL, { 
                method: 'DELETE', 
                body: JSON.stringify({ id: id })
            });
            
            setAvailabilityList(prev => prev.filter(item => item.id !== id));
            setSuccessMessage("Đã xóa slot thành công.");
            
        } catch (err) {
            setError(err.message);
        }
    };

    // Helper: Format hiển thị ngày giờ
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const dayOfWeek = DAYS_OF_WEEK.find(d => d.value === date.getDay())?.label || '';
        return `${dayOfWeek}, ${date.toLocaleDateString('vi-VN')}`;
    };

    const formatTime = (timeStr) => {
        return timeStr ? timeStr.substring(0, 5) : '';
    };

    // ============================================
    // 6. RENDER UI
    // ============================================
    const { daysOfWeek } = formData;

    return (
        <div className="container py-5">
            
            {error && <div className="alert alert-danger shadow-sm" role="alert"><i className="bi bi-exclamation-triangle-fill me-2"></i>{error}</div>}
            {successMessage && <div className="alert alert-success shadow-sm" role="alert"><i className="bi bi-check-circle-fill me-2"></i>{successMessage}</div>}

            <div className="row g-4">
                {/* ---------------- CỘT TRÁI: ĐIỀU KHIỂN (TẠO / KHÓA) ---------------- */}
                <div className="col-lg-5">
                    <div className="card shadow border-0 h-100">
                        {/* Tabs chuyển đổi */}
                        <div className="card-header bg-white p-0">
                            <ul className="nav nav-tabs card-header-tabs m-0 row g-0">
                                <li className="nav-item col-6 text-center">
                                    <button 
                                        className={`nav-link w-100 py-3 border-0 rounded-0 ${mode === 'CREATE' ? 'active fw-bold text-primary border-bottom border-primary border-3' : 'text-muted'}`}
                                        onClick={() => setMode('CREATE')}
                                    >
                                        <i className="bi bi-calendar-plus me-2"></i>Tạo Lịch
                                    </button>
                                </li>
                                <li className="nav-item col-6 text-center">
                                    <button 
                                        className={`nav-link w-100 py-3 border-0 rounded-0 ${mode === 'LOCK' ? 'active fw-bold text-danger border-bottom border-danger border-3' : 'text-muted'}`}
                                        onClick={() => setMode('LOCK')}
                                    >
                                        <i className="bi bi-slash-circle me-2"></i>Báo Nghỉ / Khóa
                                    </button>
                                </li>
                            </ul>
                        </div>

                        <div className="card-body p-4">
                            {mode === 'CREATE' ? (
                                /* --- FORM TẠO LỊCH --- */
                                <form onSubmit={handleCreateSubmit}>
                                    <div className="mb-3">
                                        <label className="form-label fw-bold text-muted small">Khoảng thời gian áp dụng</label>
                                        <div className="input-group mb-2">
                                            <span className="input-group-text">Từ</span>
                                            <input type="date" className="form-control" name="startDate" value={formData.startDate} onChange={handleChange} required />
                                        </div>
                                        <div className="input-group">
                                            <span className="input-group-text">Đến</span>
                                            <input type="date" className="form-control" name="endDate" value={formData.endDate} onChange={handleChange} required />
                                        </div>
                                        <div className="form-text">Hệ thống sẽ tạo lịch cho tất cả các ngày trong khoảng này.</div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-bold text-muted small">Khung giờ làm việc (30p/ca)</label>
                                        <div className="d-flex gap-2">
                                            <div className="flex-grow-1">
                                                <input type="time" className="form-control" name="startTime" value={formData.startTime} onChange={handleChange} required />
                                            </div>
                                            <div className="d-flex align-items-center">-</div>
                                            <div className="flex-grow-1">
                                                <input type="time" className="form-control" name="endTime" value={formData.endTime} onChange={handleChange} required />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <label className="form-label fw-bold text-muted small">Áp dụng cho các thứ</label>
                                        <div className="d-flex flex-wrap gap-2">
                                            {DAYS_OF_WEEK.map(day => (
                                                <div key={day.value} className="form-check form-check-inline m-0">
                                                    <input
                                                        className="btn-check"
                                                        type="checkbox"
                                                        id={`day-${day.value}`}
                                                        checked={daysOfWeek.includes(day.value)} 
                                                        onChange={() => handleDayToggle(day.value)}
                                                    />
                                                    <label 
                                                        className={`btn btn-sm ${daysOfWeek.includes(day.value) ? 'btn-primary' : 'btn-outline-secondary'}`} 
                                                        htmlFor={`day-${day.value}`}
                                                        style={{minWidth: '60px'}}
                                                    >
                                                        {day.label}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <button type="submit" className="btn btn-primary w-100 py-2" disabled={isSubmitting}>
                                        {isSubmitting ? <span className="spinner-border spinner-border-sm"></span> : <span><i className="bi bi-save me-2"></i> Lưu Lịch Làm Việc</span>}
                                    </button>
                                </form>
                            ) : (
                                /* --- FORM BÁO NGHỈ / KHÓA --- */
                                <div>
                                    <div className="alert alert-warning border-0 bg-warning bg-opacity-10 text-warning-emphasis small">
                                        <i className="bi bi-info-circle-fill me-2"></i>
                                        Tính năng này giúp bạn khóa nhanh lịch làm việc khi bị ốm hoặc có việc bận đột xuất. Các lịch <strong>đã có người đặt</strong> sẽ không bị ảnh hưởng.
                                    </div>
                                    
                                    <div className="mb-4">
                                        <label className="form-label fw-bold">Chọn ngày nghỉ:</label>
                                        <input 
                                            type="date" 
                                            className="form-control form-control-lg border-danger" 
                                            value={lockDate} 
                                            onChange={(e) => setLockDate(e.target.value)} 
                                        />
                                    </div>

                                    <div className="d-grid gap-3">
                                        <button 
                                            onClick={(e) => handleLockDaySubmit(e, 'LOCK')} 
                                            className="btn btn-danger py-2" 
                                            disabled={isSubmitting || !lockDate}
                                        >
                                            <i className="bi bi-lock-fill me-2"></i> Khóa Toàn Bộ Ngày
                                        </button>
                                        
                                        <button 
                                            onClick={(e) => handleLockDaySubmit(e, 'UNLOCK')} 
                                            className="btn btn-outline-secondary py-2" 
                                            disabled={isSubmitting || !lockDate}
                                        >
                                            <i className="bi bi-unlock-fill me-2"></i> Mở Lại Ngày (Nếu đi làm lại)
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* ---------------- CỘT PHẢI: DANH SÁCH SLOT ĐÃ TẠO ---------------- */}
                <div className="col-lg-7">
                    <div className="card shadow border-0 h-100">
                        <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
                            <h5 className="mb-0 text-primary fw-bold"><i className="bi bi-list-ul me-2"></i>Danh sách Slot</h5>
                            
                            {/* Bộ lọc xem nhanh */}
                            <div className="d-flex gap-2 align-items-center">
                                <input 
                                    type="date" 
                                    className="form-control form-control-sm" 
                                    value={viewStartDate}
                                    onChange={(e) => setViewStartDate(e.target.value)}
                                />
                                <span>-</span>
                                <input 
                                    type="date" 
                                    className="form-control form-control-sm" 
                                    value={viewEndDate}
                                    onChange={(e) => setViewEndDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="card-body p-0">
                            <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                                <table className="table table-hover table-striped mb-0 align-middle">
                                    <thead className="table-light sticky-top">
                                        <tr>
                                            <th>Ngày</th>
                                            <th>Khung giờ</th>
                                            <th>Trạng thái</th>
                                            <th className="text-end">Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isLoading ? (
                                            <tr><td colSpan="4" className="text-center py-5 text-muted">Đang tải dữ liệu...</td></tr>
                                        ) : availabilityList.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="text-center py-5 text-muted">
                                                    <i className="bi bi-calendar-x fs-1 d-block mb-2 opacity-50"></i>
                                                    Không có lịch nào trong khoảng thời gian này.
                                                </td>
                                            </tr>
                                        ) : (
                                            availabilityList.map((item) => (
                                                <tr key={item.id} className={parseInt(item.is_locked) === 1 ? 'table-secondary text-muted' : ''}>
                                                    <td className="fw-bold small">{formatDate(item.date)}</td>
                                                    <td>
                                                        <span className="badge bg-light text-dark border">
                                                            {formatTime(item.start_time)} - {formatTime(item.end_time)}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {parseInt(item.is_booked) === 1 ? (
                                                            <span className="badge bg-warning text-dark"><i className="bi bi-person-check-fill me-1"></i>Đã Đặt</span>
                                                        ) : parseInt(item.is_locked) === 1 ? (
                                                            <span className="badge bg-secondary"><i className="bi bi-lock-fill me-1"></i>Đã Khóa</span>
                                                        ) : (
                                                            <span className="badge bg-success"><i className="bi bi-check-circle me-1"></i>Rảnh</span>
                                                        )}
                                                    </td>
                                                    <td className="text-end">
                                                        {/* Nút Khóa Nhanh */}
                                                        <button 
                                                            className={`btn btn-sm me-1 ${parseInt(item.is_locked) === 1 ? 'btn-secondary' : 'btn-outline-warning'}`} 
                                                            onClick={() => handleToggleSlotLock(item.id, item.is_locked)}
                                                            disabled={parseInt(item.is_booked) === 1} 
                                                            title={parseInt(item.is_locked) === 1 ? "Mở khóa slot này" : "Khóa slot này (Nghỉ)"}
                                                        >
                                                            <i className={`bi ${parseInt(item.is_locked) === 1 ? 'bi-unlock-fill' : 'bi-lock-fill'}`}>Khóa/Mở</i>
                                                        </button>

                                                        {/* Nút Xóa */}
                                                        <button 
                                                            className="btn btn-sm btn-outline-danger" 
                                                            onClick={() => handleDelete(item.id)}
                                                            disabled={parseInt(item.is_booked) === 1}
                                                            title="Xóa vĩnh viễn"
                                                        >
                                                            <i className="bi bi-trash">Xóa</i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="card-footer bg-light text-muted small text-end">
                            Tổng cộng: {availabilityList.length} slot.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DoctorAvailabilityManager;