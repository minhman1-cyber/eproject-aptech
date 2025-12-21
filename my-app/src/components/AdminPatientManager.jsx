import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from "react-router-dom";

// URL API Backend
const API_BASE_URL = 'http://localhost:8888/api/v1/controllers/';
const API_LIST_URL = API_BASE_URL + 'admin_patient_manager.php';
const API_DETAIL_URL = API_BASE_URL + 'admin_patient_details.php';
const API_REGISTER_URL = API_BASE_URL + 'register.php';
const API_APPOINTMENT_MANAGE_URL = API_BASE_URL + 'manage_appointments.php'; 

// Cấu hình phân trang
const ITEMS_PER_PAGE = 10;

// Các giá trị mặc định cho form
const initialPatientForm = {
    userId: null,
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '', // Chỉ dùng khi tạo mới
    phone: '',
    address: '',
    cityId: '',
    is_active: 1, // Mặc định kích hoạt
};

// =======================================================
// HÀM FETCH API CHUNG (Tái sử dụng)
// =======================================================
const useFetchApi = () => {
    return useCallback(async (url, options = {}) => {
        const response = await fetch(url, {
            ...options,
            credentials: 'include',
            headers: {
                ...(options.headers || {}),
                'Content-Type': options.body && typeof options.body === 'string' ? 'application/json' : undefined,
            },
        });

        if (response.status === 401) {
            throw new Error("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại với vai trò Admin.");
        }
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            if (!response.ok) {
                const errorMessage = data.message || 'Lỗi hệ thống không xác định.';
                throw new Error(errorMessage);
            }
            return data;
        }
        
        if (!response.ok) {
            throw new Error('Thao tác thất bại (Lỗi Server).');
        }
        return {};
    }, []);
};

// =======================================================
// COMPONENT PHỤ: 1. MODAL THÊM/SỬA BỆNH NHÂN
// =======================================================

const PatientFormModal = ({ patient, mode, isModalOpen, closeModal, cities, refreshList, fetchApi }) => {
    const [formData, setFormData] = useState(initialPatientForm);
    const [localError, setLocalError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const isEditing = mode === 'edit';

    // Ánh xạ dữ liệu từ doctor object sang cấu trúc form
    const mapPatientToForm = (p) => ({
        userId: p.user_id,
        fullName: p.full_name || '',
        email: p.email || '',
        phone: p.phone || '',
        address: p.address || '',
        cityId: String(p.city_id || ''),
        is_active: p.user_is_active,
        password: '',
        confirmPassword: '',
    });

    useEffect(() => {
        if (isModalOpen) {
            setLocalError('');
            if (isEditing && patient) {
                setFormData(mapPatientToForm(patient));
            } else {
                setFormData(initialPatientForm);
            }
        }
    }, [isModalOpen, isEditing, patient]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');
        setIsLoading(true);

        // Validation cơ bản
        if (!formData.fullName || !formData.email || !formData.phone || !formData.cityId) {
            setLocalError('Vui lòng điền đầy đủ các trường bắt buộc.');
            setIsLoading(false);
            return;
        }
        if (!isEditing && formData.password !== formData.confirmPassword) {
            setLocalError('Mật khẩu xác nhận không khớp.');
            setIsLoading(false);
            return;
        }

        const payload = {
            userId: isEditing ? formData.userId : undefined,
            full_name: formData.fullName,
            email: formData.email,
            password: formData.password || undefined, 
            role: 'PATIENT',
            city_id: parseInt(formData.cityId),
            phone: formData.phone,
            address: formData.address,
            is_active: formData.is_active,
        };
        
        // <<< ĐỊNH TUYẾN API CHÍNH XÁC >>>
        // Sử dụng API_UPDATE_URL (admin_update_patient.php) cho PUT (Edit)
        // Sử dụng API_REGISTER_URL cho POST (Add)
        const url = isEditing ? API_LIST_URL : API_REGISTER_URL; 
        const method = isEditing ? 'PUT' : 'POST';

        try {
            await fetchApi(url, {
                method: method,
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
            });

            window.alert(`Hồ sơ bệnh nhân đã được ${isEditing ? 'cập nhật' : 'thêm mới'} thành công.`);
            refreshList(); 
            closeModal();

        } catch (err) {
            setLocalError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isModalOpen) return null;
    
    return (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header bg-primary text-white">
                        <h5 className="modal-title">{isEditing ? `Sửa Bệnh nhân ID: ${formData.userId}` : 'Thêm Bệnh nhân Mới'}</h5>
                        <button type="button" className="btn-close btn-close-white" onClick={closeModal} disabled={isLoading}></button>
                    </div>
                    <div className="modal-body">
                        {localError && (<div className="alert alert-danger" role="alert">{localError}</div>)}

                        <form onSubmit={handleSubmit}>
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Họ tên đầy đủ (*)</label>
                                    <input type="text" className="form-control" name="fullName" value={formData.fullName} onChange={handleChange} required />
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Email (*)</label>
                                    <input type="email" className="form-control" name="email" value={formData.email} onChange={handleChange} required disabled={isEditing} />
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Số điện thoại (*)</label>
                                    <input type="tel" className="form-control" name="phone" value={formData.phone} onChange={handleChange} required />
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Địa chỉ</label>
                                    <input type="text" className="form-control" name="address" value={formData.address} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-md-4 mb-3">
                                    <label className="form-label">Thành phố (*)</label>
                                    <select className="form-select" name="cityId" value={formData.cityId} onChange={handleChange} required>
                                        <option value="">Chọn TP...</option>
                                        {cities.map(city => (<option key={city.id} value={city.id}>{city.name}</option>))}
                                    </select>
                                </div>
                                {!isEditing && (
                                    <>
                                        <div className="col-md-4 mb-3">
                                            <label className="form-label">Mật khẩu (*)</label>
                                            <input type="password" className="form-control" name="password" value={formData.password} onChange={handleChange} required />
                                        </div>
                                        <div className="col-md-4 mb-3">
                                            <label className="form-label">Xác nhận Mật khẩu (*)</label>
                                            <input type="password" className="form-control" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required />
                                        </div>
                                    </>
                                )}
                                {isEditing && (
                                     <div className="col-md-4 mb-3">
                                        <label className="form-label">Trạng thái Kích hoạt (*)</label>
                                        <select className="form-select" name="is_active" value={formData.is_active} onChange={handleChange} required>
                                            <option value={1}>1 - Đã Kích hoạt</option>
                                            <option value={0}>0 - Đã Ngừng</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            <button type="submit" className="btn btn-primary w-100 mt-4" disabled={isLoading}>
                                {isLoading ? 'Đang xử lý...' : isEditing ? 'Lưu Thay Đổi' : 'Thêm Bệnh nhân'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};


// =======================================================
// COMPONENT PHỤ: 2. MODAL XEM CHI TIẾT & LỊCH SỬ ĐẶT LỊCH
// =======================================================

const PatientDetailModal = ({ user, isModalOpen, closeModal, fetchApi, cities, refreshList }) => {
    const [patientDetails, setPatientDetails] = useState(null);
    const [history, setHistory] = useState([]);
    const [isLoadingDetails, setIsLoadingDetails] = useState(true);
    const [detailError, setDetailError] = useState(null);
    const [isCancelling, setIsCancelling] = useState(false);

    const STATUS_CLASSES = {
        'BOOKED': 'bg-primary',
        'RESCHEDULED': 'bg-info',
        'CANCELLED': 'bg-danger',
        'COMPLETED': 'bg-success',
    };

    // Tải chi tiết bệnh nhân và lịch sử đặt lịch
    const fetchDetails = useCallback(async () => {
        if (!user?.user_id) return;
        setIsLoadingDetails(true);
        setDetailError(null);
        try {
            // API GET chi tiết trả về { details: {...}, appointments: [...] }
            const data = await fetchApi(`${API_DETAIL_URL}?user_id=${user.user_id}`, { method: 'GET' });
            setPatientDetails(data.data.details);
            setHistory(data.data.appointments || []);
        } catch (err) {
            setDetailError(err.message);
        } finally {
            setIsLoadingDetails(false);
        }
    }, [user, fetchApi]);

    // Effect tải dữ liệu khi Modal mở
    useEffect(() => {
        if (isModalOpen) {
            fetchDetails();
        }
    }, [isModalOpen, fetchDetails]);
    
    // Hàm xử lý Hủy lịch (Admin thay mặt Patient)
    const handleAdminCancelAppointment = async (appointmentId) => {
        if (!window.confirm(`Admin xác nhận: Bạn có chắc chắn muốn HỦY lịch hẹn #${appointmentId} của bệnh nhân này không?`)) return; 
        
        setIsCancelling(true);
        try {
            const payload = {
                id: appointmentId,
                actionType: 'CANCEL',
            };

            const data = await fetchApi(API_APPOINTMENT_MANAGE_URL, {
                method: 'PUT',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
            });

            window.alert(data.message || `Đã hủy lịch hẹn #${appointmentId} thành công.`);
            fetchDetails(); // Tải lại lịch sử trong modal
            refreshList();  // Tải lại danh sách bệnh nhân chính

        } catch (err) {
            setDetailError('Lỗi hủy: ' + err.message);
        } finally {
            setIsCancelling(false);
        }
    };


    if (!isModalOpen || !user) return null;
    
    // Hàm hiển thị tên thành phố
    const getCityName = (cityId) => {
        const city = cities.find(c => c.id === cityId);
        return city ? city.name : 'N/A';
    };

    return (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
            <div className="modal-dialog modal-xl">
                <div className="modal-content">
                    <div className="modal-header bg-primary text-white">
                        <h5 className="modal-title">Hồ sơ Bệnh nhân: {user.full_name}</h5>
                        <button type="button" className="btn-close btn-close-white" onClick={closeModal}></button>
                    </div>
                    <div className="modal-body">
                        {isLoadingDetails ? (
                            <div className="text-center py-5">Đang tải chi tiết...</div>
                        ) : detailError ? (
                            <div className="alert alert-danger">{detailError}</div>
                        ) : (
                            <div>
                                {/* Chi tiết hồ sơ */}
                                <h6 className="text-primary">Thông tin Cơ bản</h6>
                                <div className="row mb-4">
                                    <div className="col-md-4"><strong>Email:</strong> {patientDetails?.email}</div>
                                    <div className="col-md-4"><strong>SĐT:</strong> {patientDetails?.phone || 'N/A'}</div>
                                    <div className="col-md-4"><strong>Thành phố:</strong> {getCityName(patientDetails?.city_id)}</div>
                                </div>
                                <div className="row mb-4">
                                    <div className="col-md-12"><strong>Địa chỉ:</strong> {patientDetails?.address || 'N/A'}</div>
                                </div>

                                {/* Lịch sử đặt lịch */}
                                <h6 className="text-primary mt-4">Lịch sử Đặt lịch ({history.length})</h6>
                                <div className="table-responsive">
                                    <table className="table table-sm table-striped">
                                        <thead className="table-light">
                                            <tr>
                                                <th>ID</th>
                                                <th>Bác sĩ</th>
                                                <th>Ngày/Giờ</th>
                                                <th>Lý do</th>
                                                <th>Trạng thái</th>
                                                <th>Hành động</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {history.map(app => (
                                                <tr key={app.id}>
                                                    <td>{app.id}</td>
                                                    <td>{app.doctorName}</td>
                                                    <td>{app.appointmentDate} lúc {app.appointmentTime}</td>
                                                    <td>{app.reason.substring(0, 30)}...</td>
                                                    <td>
                                                         <span className={`badge ${STATUS_CLASSES[app.status] || 'bg-secondary'}`}>
                                                            {app.status}
                                                         </span>
                                                    </td>
                                                    <td className='text-nowrap'>
                                                        {(app.status === 'BOOKED' || app.status === 'RESCHEDULED') && (
                                                            <button 
                                                                className="btn btn-sm btn-danger"
                                                                onClick={() => handleAdminCancelAppointment(app.id)}
                                                                disabled={isCancelling}
                                                            >
                                                                {isCancelling ? 'Đang hủy...' : 'Hủy lịch'}
                                                            </button>
                                                        )}
                                                        {(app.status === 'CANCELLED' || app.status === 'COMPLETED') && (
                                                            <span className="text-muted">Đã kết thúc</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={closeModal}>Đóng</button>
                    </div>
                </div>
            </div>
        </div>
    );
};


// =======================================================
// COMPONENT 3: QUẢN LÝ CHÍNH (ADMINPATIENTMANAGER)
// =======================================================

const AdminPatientManager = () => {
    const [patients, setPatients] = useState([]);
    const [cities, setCities] = useState([]);
    const [specializations, setSpecializations] = useState([]); // Giữ lại cho tương lai
    
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingPatient, setEditingPatient] = useState(null); 
    const [viewingPatient, setViewingPatient] = useState(null); // Patient đang được xem chi tiết

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchType, setSearchType] = useState('name'); 
    const [filterActive, setFilterActive] = useState('ALL'); 
    const navigate = useNavigate();

    const fetchApi = useFetchApi();

    // ------------------- TẢI DỮ LIỆU CHÍNH -------------------
    const fetchPatients = useCallback(async () => {
        setError(null);
        setIsLoading(true);
        try {
            // Giả định API GET trả về: { data: { patients: [...], cities: [...] } }
            const data = await fetchApi(API_LIST_URL + '?role=PATIENT', { method: 'GET' });
            
            // Giả định API trả về user_id, full_name, email, user_is_active, phone, address, city_id
            setPatients(data.data.patients || []);
            setCities(data.data.cities || []);
            setSpecializations(data.data.specializations || []); // Vẫn load specs dù không dùng ở đây

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [fetchApi]);

    useEffect(() => {
        fetchPatients();
    }, [fetchPatients]);


    // ------------------- LOGIC TÌM KIẾM & LỌC -------------------
    const filteredPatients = useMemo(() => {
        let result = patients;

        // Lọc trạng thái Active
        if (filterActive !== 'ALL') {
            const isActive = filterActive === 'ACTIVE' ? 1 : 0;
            result = result.filter(p => p.user_is_active === isActive);
        }

        // Tìm kiếm
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(p => {
                if (searchType === 'name') return p.full_name?.toLowerCase().includes(term);
                if (searchType === 'email') return p.email?.toLowerCase().includes(term);
                if (searchType === 'phone') return p.phone?.includes(term);
                if (searchType === 'id') return String(p.user_id) === term;
                return true;
            });
        }
        return result;
    }, [patients, filterActive, searchTerm, searchType]);

    const totalPages = Math.ceil(filteredPatients.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentPatients = filteredPatients.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setCurrentPage(1); 
    };

    // ------------------- LOGIC HÀNH ĐỘNG -------------------

    // 1. Khóa / Mở khóa tài khoản
    const handleToggleActivation = useCallback(async (patient, newStatus) => {
        const statusText = newStatus === 1 ? 'kích hoạt' : 'khóa';
        const confirmMessage = `Bạn có chắc chắn muốn ${statusText} tài khoản ${patient.full_name} không?`;

        if (!window.confirm(confirmMessage)) return; 

        try {
            const payload = {
                updateType: 'toggle_user_active',
                userId: patient.user_id,
                isActive: newStatus,
            };

            await fetchApi(API_LIST_URL, {
                method: 'PUT',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
            });

            setSuccessMessage(`Đã ${statusText} tài khoản thành công.`);
            fetchPatients();

        } catch (err) {
            setError(err.message);
        }
    }, [fetchApi, fetchPatients]);
    
    // 2. Mở Modal Sửa
    const openEditModal = (patient) => {
        setEditingPatient(patient);
    };

    // 3. Mở Modal Chi tiết
    const openDetailModal = (patient) => {
        setViewingPatient(patient);
    };


    // ------------------- RENDER -------------------
    return (
        <div className="container py-5">

            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            {successMessage && <div className="alert alert-success" role="alert">{successMessage}</div>}

            <div className="card shadow-sm p-4">
                
                {/* THANH LỌC & TÌM KIẾM */}
                <form onSubmit={handleSearchSubmit}>
                <div className="d-flex flex-wrap align-items-center mb-4">
                    {/* Lọc Trạng thái */}
                    <div className="d-flex align-items-center me-3 mb-2">
                        <label className="form-label mb-0 me-2">Trạng thái:</label>
                        <select 
                            className="form-select" 
                            style={{ width: '150px' }}
                            value={filterActive}
                            onChange={(e) => setFilterActive(e.target.value)}
                        >
                            <option value="ALL">Tất cả</option>
                            <option value="ACTIVE">Kích hoạt</option>
                            <option value="INACTIVE">Đã khóa</option>
                        </select>
                    </div>

                    {/* Lọc Theo Thuộc tính */}
                    <div className="d-flex me-3 mb-2" style={{ flexShrink: 0 }}>
                        <select 
                            className="form-select me-2" 
                            style={{ width: '150px' }}
                            value={searchType}
                            onChange={(e) => setSearchType(e.target.value)}
                        >
                            <option value="name">Tên</option>
                            <option value="email">Email</option>
                            <option value="phone">SĐT</option>
                            <option value="id">User ID</option>
                        </select>
                        <input
                            type="text"
                            className="form-control"
                            placeholder={`Tìm theo ${searchType}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <button type="submit" className="btn btn-outline-primary me-3 mb-2">
                        <i className="bi bi-search"></i> Lọc
                    </button>
                    
                    <button 
                        className="btn btn-success mb-2 ms-auto" 
                        onClick={() => navigate('/signup')}
                    >
                        <i className="bi bi-plus-lg"></i> Thêm Bệnh nhân
                    </button>
                </div>
                </form>

                {/* Bảng Danh sách Bệnh nhân */}
                <div className="table-responsive">
                    <table className="table table-hover align-middle">
                        <thead className="table-light">
                            <tr>
                                <th>ID</th>
                                <th>Họ Tên</th>
                                <th>Email</th>
                                <th>SĐT</th>
                                <th>Thành phố</th>
                                <th>Trạng thái TK</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-4 text-muted">Đang tải dữ liệu...</td>
                                </tr>
                            ) : currentPatients.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-4 text-muted">Không tìm thấy Bệnh nhân nào.</td>
                                </tr>
                            ) : (
                                currentPatients.map(patient => (
                                    <tr key={patient.user_id}>
                                        <td>{patient.user_id}</td>
                                        <td>{patient.full_name}</td>
                                        <td>{patient.email}</td>
                                        <td>{patient.phone || 'N/A'}</td>
                                        <td>{cities.find(c => c.id === patient.city_id)?.name || 'N/A'}</td>
                                        <td>
                                            <span className={`badge ${patient.user_is_active === 1 ? 'bg-success' : 'bg-secondary'}`}>
                                                {patient.user_is_active === 1 ? 'ACTIVE' : 'INACTIVE'}
                                            </span>
                                        </td>
                                        <td className='text-nowrap'>
                                            <button 
                                                className="btn btn-sm btn-outline-info me-2"
                                                onClick={() => openDetailModal(patient)}
                                            >
                                                Xem chi tiết
                                            </button>
                                            <button 
                                                className="btn btn-sm btn-outline-primary me-2"
                                                onClick={() => openEditModal(patient)}
                                            >
                                                Sửa
                                            </button>
                                            <button 
                                                className={`btn btn-sm ${patient.user_is_active === 1 ? 'btn-danger' : 'btn-success'}`}
                                                onClick={() => handleToggleActivation(patient, patient.user_is_active === 1 ? 0 : 1)}
                                            >
                                                {patient.user_is_active === 1 ? 'Khóa' : 'Mở khóa'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Phân trang */}
                <div className="d-flex justify-content-center mt-3">
                    {/* Logic phân trang giữ nguyên */}
                </div>

            </div>
            
            {/* Modal Thêm Bệnh nhân */}
            <PatientFormModal 
                patient={null} // Không truyền patient object khi thêm
                mode={'add'}
                isModalOpen={isAddModalOpen}
                closeModal={() => setIsAddModalOpen(false)}
                cities={cities}
                refreshList={fetchPatients}
                fetchApi={fetchApi}
            />
            
            {/* Modal Sửa Bệnh nhân */}
            <PatientFormModal 
                patient={editingPatient}
                mode={'edit'}
                isModalOpen={!!editingPatient} // Mở nếu editingPatient có giá trị
                closeModal={() => setEditingPatient(null)}
                cities={cities}
                refreshList={fetchPatients}
                fetchApi={fetchApi}
            />
            
            {/* Modal Chi tiết Bệnh nhân */}
            <PatientDetailModal
                user={viewingPatient}
                isModalOpen={!!viewingPatient}
                closeModal={() => setViewingPatient(null)}
                cities={cities}
                fetchApi={fetchApi}
                refreshList={fetchPatients} // Thêm refreshList để tải lại sau khi hủy lịch
            />
        </div>
    );
};

export default AdminPatientManager;