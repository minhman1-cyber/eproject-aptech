import React, { useState, useEffect, useCallback } from 'react';

// URL API Backend (Giả định)
const API_AVAILABILITY_URL = 'http://localhost:8888/api/v1/controllers/doctor_availability.php'; 

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
    frequency: 'NONE', // NONE, DAILY, WEEKLY, MONTHLY
    date: '',           // Dùng cho NONE
    startTime: '08:00',
    endTime: '17:00',
    dayOfWeeks: [],     // Dùng cho WEEKLY (array of numbers)
    repeatEndDate: '',
};

const DoctorAvailabilityManager = () => {
    const [formData, setFormData] = useState(initialFormState);
    const [availabilityList, setAvailabilityList] = useState([]); // Danh sách lịch rảnh
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // Hàm gọi API FETCH chung
    const fetchApi = useCallback(async (url, options) => {
        const response = await fetch(url, {
            ...options,
            credentials: 'include',
            headers: {
                ...(options.headers || {}),
                'Content-Type': options.method !== 'POST' || options.body instanceof FormData ? options.headers?.['Content-Type'] : 'application/json',
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
            throw new Error('Cập nhật thất bại (Lỗi Server).');
        }
        return {};
    }, []);

    // ============================================
    // 1. FETCH DỮ LIỆU BAN ĐẦU (GET LIST)
    // ============================================

    const mapAvailabilityData = (items) => {
        // Hàm ánh xạ dữ liệu phức tạp từ DB sang hiển thị Frontend
        return items.map(item => {
            let scheduleDetails = `${item.start_time.substring(0, 5)} - ${item.end_time.substring(0, 5)}`;
            let typeLabel = item.frequency;
            let endLabel = item.repeat_end_date || 'Vô thời hạn';
            let scheduleText = '';

            if (item.frequency === 'NONE') {
                typeLabel = 'Lịch Cố Định';
                scheduleText = `${item.date} (${scheduleDetails})`;
            } else if (item.frequency === 'DAILY') {
                typeLabel = 'Lặp Hàng Ngày';
                scheduleText = scheduleDetails;
            } else if (item.frequency === 'WEEKLY') {
                typeLabel = 'Lặp Hàng Tuần';
                
                // --- PHẦN SỬA LỖI day_of_week === 0 ---
                // Ép kiểu item.day_of_week thành số nguyên
                const dayValue = item.day_of_week !== null ? parseInt(item.day_of_week) : null;
                
                // Dùng find để tìm chính xác giá trị 0
                const dayObject = DAYS_OF_WEEK.find(d => d.value === dayValue);
                
                // Nếu dayObject không tìm thấy (do lỗi dữ liệu hoặc null), hiển thị N/A
                scheduleText = `${dayObject ? dayObject.label : 'N/A'} (${scheduleDetails})`;
            }

            return {
                id: item.id,
                schedule: scheduleText,
                type: typeLabel,
                frequency: item.frequency,
                end: endLabel,
            };
        });
    };

    const fetchAvailability = useCallback(async () => {
        setError(null);
        setIsLoading(true);
        try {
            const data = await fetchApi(API_AVAILABILITY_URL, { method: 'GET' });
            
            // Lấy dữ liệu thô (raw data) từ API
            const rawList = data.data || [];
            
            // Ánh xạ và cập nhật state
            setAvailabilityList(mapAvailabilityData(rawList));
            
        } catch (err) {
            setError('Lỗi khi tải lịch rảnh: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    }, [fetchApi]);

    useEffect(() => {
        fetchAvailability();
    }, [fetchApi]); // Đã sửa dependency array

    // ============================================
    // 2. LOGIC XỬ LÝ FORM
    // ============================================

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleDayToggle = (dayValue) => {
        setFormData(prev => {
            const currentDays = prev.dayOfWeeks;
            // dayValue phải là số nguyên (tương ứng với DB)
            const dayNum = parseInt(dayValue); 
            if (currentDays.includes(dayNum)) {
                return {
                    ...prev,
                    dayOfWeeks: currentDays.filter(day => day !== dayNum)
                };
            } else {
                return {
                    ...prev,
                    dayOfWeeks: [...currentDays, dayNum].sort((a, b) => a - b)
                };
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        
        const { frequency, date, startTime, endTime, dayOfWeeks, repeatEndDate } = formData;

        // Validation cơ bản
        if (!startTime || !endTime) {
            setError("Vui lòng chọn Giờ Bắt đầu và Giờ Kết thúc.");
            return;
        }

        if (frequency === 'NONE' && !date) {
            setError("Vui lòng chọn Ngày cụ thể cho lịch không lặp.");
            return;
        }
        
        if (frequency === 'WEEKLY' && dayOfWeeks.length === 0) {
            setError("Vui lòng chọn ít nhất một Ngày trong tuần.");
            return;
        }

        // Chuẩn bị Payload cho API
        const payload = {
            frequency,
            startTime,
            endTime,
            // Đảm bảo chỉ gửi các trường liên quan đến frequency đã chọn
            date: frequency === 'NONE' ? date : null,
            day_of_week: frequency === 'WEEKLY' ? dayOfWeeks : null,
            day_of_month: null, // Chưa triển khai
            repeat_end_date: repeatEndDate || null,
        };
        
        try {
            setIsLoading(true);
            
            await fetchApi(API_AVAILABILITY_URL, { 
                method: 'POST', 
                body: JSON.stringify(payload) 
            });

            setSuccessMessage("Lịch rảnh đã được thiết lập thành công!");
            setFormData(initialFormState); // Reset form
            fetchAvailability(); // Tải lại danh sách
        } catch (err) {
            setError('Lỗi khi thiết lập lịch: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa lịch rảnh này không?")) return;
        
        try {
            setIsLoading(true);
            
            await fetchApi(API_AVAILABILITY_URL, { 
                method: 'DELETE', 
                body: JSON.stringify({ id: id })
            });
            
            setSuccessMessage("Đã xóa lịch rảnh thành công.");
            fetchAvailability(); 
        } catch (err) {
            setError('Lỗi khi xóa lịch: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // ============================================
    // 3. RENDER
    // ============================================

    const { frequency, dayOfWeeks } = formData;

    return (
        <div className="container py-5">
            
            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            {successMessage && <div className="alert alert-success" role="alert">{successMessage}</div>}

            <div className="row">
                {/* Cột 1: Form Thêm lịch */}
                <div className="col-lg-5">
                    <div className="card shadow-sm p-4">
                        <h4 className="mb-4 text-info">Thiết lập Khung giờ Rảnh</h4>
                        <form onSubmit={handleSubmit}>
                            
                            {/* Tần suất lặp lại */}
                            <div className="mb-3">
                                <label className="form-label fw-bold">Tần suất Lặp lại (*)</label>
                                <select className="form-select" name="frequency" value={frequency} onChange={handleChange} required>
                                    <option value="NONE">Không lặp lại (Lịch cố định)</option>
                                    <option value="DAILY">Hàng ngày</option>
                                    <option value="WEEKLY">Hàng tuần</option>
                                    {/* <option value="MONTHLY">Hàng tháng (Logic phức tạp hơn)</option> */}
                                </select>
                            </div>

                            {/* Ngày cụ thể (Chỉ hiện khi NONE) */}
                            {frequency === 'NONE' && (
                                <div className="mb-3">
                                    <label className="form-label">Ngày cụ thể (*)</label>
                                    <input type="date" className="form-control" name="date" value={formData.date} onChange={handleChange} required />
                                </div>
                            )}

                            {/* Giờ Bắt đầu/Kết thúc */}
                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <label className="form-label">Giờ Bắt đầu (*)</label>
                                    <input type="time" className="form-control" name="startTime" value={formData.startTime} onChange={handleChange} required />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Giờ Kết thúc (*)</label>
                                    <input type="time" className="form-control" name="endTime" value={formData.endTime} onChange={handleChange} required />
                                </div>
                            </div>
                            
                            {/* Ngày trong tuần (Chỉ hiện khi WEEKLY) */}
                            {frequency === 'WEEKLY' && (
                                <div className="mb-3">
                                    <label className="form-label fw-bold">Chọn Ngày trong tuần (*)</label>
                                    <div className="d-flex flex-wrap border p-2 rounded bg-light">
                                        {DAYS_OF_WEEK.map(day => (
                                            <div key={day.value} className="form-check form-check-inline">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    id={`day-${day.value}`}
                                                    // dayValue phải là số nguyên cho includes
                                                    checked={dayOfWeeks.includes(day.value)} 
                                                    onChange={() => handleDayToggle(day.value)}
                                                    value={day.value}
                                                />
                                                <label className="form-check-label" htmlFor={`day-${day.value}`}>
                                                    {day.label}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {/* Ngày kết thúc lặp (Cho DAILY, WEEKLY) */}
                            {(frequency === 'DAILY' || frequency === 'WEEKLY') && (
                                <div className="mb-3">
                                    <label className="form-label">Ngày Kết thúc Lặp (Tùy chọn)</label>
                                    <input type="date" className="form-control" name="repeatEndDate" value={formData.repeatEndDate} onChange={handleChange} />
                                    <small className="form-text text-muted">Nếu để trống, lịch sẽ lặp vô thời hạn.</small>
                                </div>
                            )}

                            <button type="submit" className="btn btn-info w-100 mt-3" disabled={isLoading}>
                                {isLoading ? 'Đang lưu lịch...' : 'Thiết lập Lịch rảnh'}
                            </button>
                        </form>
                    </div>
                </div>
                
                {/* Cột 2: Danh sách lịch đã thiết lập */}
                <div className="col-lg-7">
                    <h4 className="mb-4">Danh sách Lịch Rảnh Đã Thiết lập</h4>
                    <div className="card shadow-sm p-3">
                        <div className="table-responsive">
                            <table className="table table-striped align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th>Loại Lịch</th>
                                        <th>Khung giờ</th>
                                        <th>Lặp lại đến</th>
                                        <th>Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {availabilityList.map(item => (
                                        <tr key={item.id}>
                                            <td><span className={`badge bg-${item.frequency === 'WEEKLY' ? 'primary' : item.frequency === 'DAILY' ? 'success' : 'secondary'}`}>{item.type}</span></td>
                                            <td>{item.schedule}</td>
                                            <td>{item.end || 'Vô thời hạn'}</td>
                                            <td>
                                                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}>
                                                    <i className="bi bi-trash"></i> Xóa
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {availabilityList.length === 0 && (
                                        <tr><td colSpan="4" className="text-center text-muted">Chưa có khung giờ rảnh nào được thiết lập.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DoctorAvailabilityManager;