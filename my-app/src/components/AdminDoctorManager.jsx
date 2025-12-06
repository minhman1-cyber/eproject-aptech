import React, { useState, useEffect, useCallback } from 'react';

// URL API Backend (Sử dụng cổng 5173 cho Frontend và 8888 cho Backend)
const API_BASE_URL = 'http://localhost:8888/api/v1/controllers/';
const API_LIST_URL = API_BASE_URL + 'admin_doctor_manager.php';
const API_REGISTER_URL = API_BASE_URL + 'register.php';
const API_UPDATE_URL = API_BASE_URL + 'admin_update_doctor.php'; // API mới cho việc sửa

// Cấu hình phân trang
const ITEMS_PER_PAGE = 10;

// =======================================================
// HÀM CHUYỂN ĐỔI DATA (Doctor object -> Form data)
// =======================================================

// Hàm ánh xạ dữ liệu doctor từ API sang cấu trúc form
const mapDoctorToForm = (doctor) => ({
    userId: doctor.user_id, // Giữ lại ID để update
    fullName: doctor.full_name || '',
    email: doctor.email || '',
    phone: doctor.phone || '',
    cityId: doctor.city_id || '',
    qualification: doctor.qualification || '',
    bio: doctor.bio || '',
    is_active: doctor.user_is_active, // Trạng thái kích hoạt (1/0)
    is_approved: doctor.is_active, // Trạng thái duyệt (APPROVED/PENDING/REJECTED)
    specializationIds: doctor.specializationIds ? doctor.specializationIds.map(id => String(id)) : [], // Phải là string array cho Checkbox
});


// =======================================================
// COMPONENT 1: FORM THÊM BÁC SĨ MỚI (MODAL CONTENT)
// =======================================================

const initialDoctorForm = {
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    cityId: '',
    qualification: '',
    bio: '',
    specializationIds: [], 
};

const AddDoctorForm = ({ isModalOpen, closeModal, cities, specializations, refreshList }) => {
    // Bước 1: Cơ bản, Bước 2: Chi tiết
    const [step, setStep] = useState(1); 
    const [formData, setFormData] = useState(initialDoctorForm);
    const [localError, setLocalError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Reset form khi modal đóng/mở
    useEffect(() => {
        if (isModalOpen) {
            setFormData(initialDoctorForm);
            setStep(1);
            setLocalError('');
        }
    }, [isModalOpen]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleNextStep = (e) => {
        e.preventDefault();
        setLocalError('');

        if (step === 1) {
            // Kiểm tra các trường bắt buộc ở bước 1
            if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
                setLocalError('Vui lòng điền đầy đủ Họ tên, Email và Mật khẩu.');
                return;
            }
            if (formData.password !== formData.confirmPassword) {
                setLocalError('Mật khẩu xác nhận không khớp.');
                return;
            }
            setStep(2);
        }
    };
    
    // Xử lý Checkbox Chuyên khoa
    const handleSpecializationToggle = (id) => {
        setFormData(prevData => {
            const currentSpecs = prevData.specializationIds;
            const specIdStr = String(id);
            if (currentSpecs.includes(specIdStr)) {
                return {
                    ...prevData,
                    specializationIds: currentSpecs.filter(spec => spec !== specIdStr)
                };
            }
            return {
                ...prevData,
                specializationIds: [...currentSpecs, specIdStr]
            };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');
        setIsLoading(true);

        // Kiểm tra các trường bắt buộc ở bước 2
        if (!formData.phone || !formData.cityId || formData.specializationIds.length === 0 || !formData.qualification) {
            setLocalError('Vui lòng điền đầy đủ SĐT, Thành phố, Chuyên khoa và Bằng cấp.');
            setIsLoading(false);
            return;
        }

        // Chuẩn bị Payload cho API register.php
        const payload = {
            full_name: formData.fullName,
            email: formData.email,
            password: formData.password,
            role: 'DOCTOR', // Cố định vai trò
            city_id: parseInt(formData.cityId),
            doctor_phone: formData.phone,
            doctor_qualification: formData.qualification,
            doctor_bio: formData.bio,
            specialization_ids: formData.specializationIds.map(Number), // Chuyển về mảng số nguyên
        };

        try {
            const response = await fetch(API_REGISTER_URL, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Đăng ký thất bại. Lỗi hệ thống.');
            }

            // Dùng window.alert thay vì alert để dễ nhận biết trong React
            window.alert(`Đăng ký Bác sĩ ${formData.fullName} thành công! Tài khoản đang chờ duyệt.`);
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
                    <div className="modal-header bg-success text-white">
                        <h5 className="modal-title">Thêm Bác sĩ Mới</h5>
                        <button type="button" className="btn-close btn-close-white" onClick={closeModal} disabled={isLoading}></button>
                    </div>
                    <div className="modal-body">
                        {/* Stepper */}
                        <div className="d-flex justify-content-between mb-4">
                            <span className={`badge p-2 ${step === 1 ? 'bg-primary' : 'bg-secondary'}`}>1. Tài khoản cơ bản</span>
                            <span className={`badge p-2 ${step === 2 ? 'bg-primary' : 'bg-secondary'}`}>2. Chi tiết chuyên môn</span>
                        </div>
                        
                        {localError && (
                            <div className="alert alert-danger" role="alert">{localError}</div>
                        )}

                        <form onSubmit={step === 2 ? handleSubmit : handleNextStep}>
                            
                            {/* STEP 1: Tài khoản cơ bản */}
                            {step === 1 && (
                                <>
                                    <div className="row">
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Họ tên đầy đủ (*)</label>
                                            <input type="text" className="form-control" name="fullName" value={formData.fullName} onChange={handleChange} required />
                                        </div>
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Email (*)</label>
                                            <input type="email" className="form-control" name="email" value={formData.email} onChange={handleChange} required />
                                        </div>
                                    </div>
                                    <div className="row">
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Mật khẩu (*)</label>
                                            <input type="password" className="form-control" name="password" value={formData.password} onChange={handleChange} required minLength="8" />
                                        </div>
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Xác nhận Mật khẩu (*)</label>
                                            <input type="password" className="form-control" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required />
                                        </div>
                                    </div>
                                    <button type="submit" className="btn btn-primary w-100 mt-3" disabled={isLoading}>
                                        Tiếp tục
                                    </button>
                                </>
                            )}

                            {/* STEP 2: Chi tiết chuyên môn */}
                            {step === 2 && (
                                <>
                                    <div className="row">
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Số điện thoại (*)</label>
                                            <input type="tel" className="form-control" name="phone" value={formData.phone} onChange={handleChange} required />
                                        </div>
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Thành phố làm việc (*)</label>
                                            <select className="form-select" name="cityId" value={formData.cityId} onChange={handleChange} required>
                                                <option value="">Chọn Thành phố...</option>
                                                {cities.map(city => (<option key={city.id} value={city.id}>{city.name}</option>))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label d-block">Chuyên khoa đăng ký (*)</label>
                                        <div className="border p-3 rounded bg-light overflow-auto" style={{ maxHeight: '150px' }}>
                                            {specializations.map(spec => (
                                                <div className="form-check form-check-inline" key={spec.id}>
                                                    <input
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        id={`modal-add-spec-${spec.id}`}
                                                        checked={formData.specializationIds.includes(String(spec.id))}
                                                        onChange={() => handleSpecializationToggle(spec.id)}
                                                    />
                                                    <label className="form-check-label" htmlFor={`modal-add-spec-${spec.id}`}>{spec.name}</label>
                                                </div>
                                            ))}
                                        </div>
                                        {formData.specializationIds.length === 0 && <small className="text-danger">Vui lòng chọn ít nhất một chuyên khoa.</small>}
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Bằng cấp/Trình độ (*)</label>
                                        <input type="text" className="form-control" name="qualification" value={formData.qualification} onChange={handleChange} required />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Tiểu sử ngắn (Bio)</label>
                                        <textarea className="form-control" name="bio" value={formData.bio} onChange={handleChange} rows="2"></textarea>
                                    </div>

                                    <div className="d-flex justify-content-between mt-4">
                                        <button type="button" className="btn btn-secondary" onClick={() => setStep(1)} disabled={isLoading}>
                                            Quay lại
                                        </button>
                                        <button type="submit" className="btn btn-success" disabled={isLoading}>
                                            {isLoading ? 'Đang thêm...' : 'Hoàn tất Thêm Bác sĩ'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};


// =======================================================
// COMPONENT 2: FORM SỬA BÁC SĨ (MODAL CONTENT)
// =======================================================

const EditDoctorModal = ({ doctor, closeModal, cities, specializations, refreshList, updateDoctorApi }) => {
    const [formData, setFormData] = useState({});
    const [localError, setLocalError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Khởi tạo form data từ doctor prop khi modal mở
    useEffect(() => {
        if (doctor) {
            console.log(doctor);
            setFormData(mapDoctorToForm(doctor));
            console.log(formData.cityId);
            setLocalError('');
        }
    }, [doctor]);

    // Không render nếu không có doctor nào đang được chỉnh sửa
    if (!doctor) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Xử lý Checkbox Chuyên khoa
    const handleSpecializationToggle = (id) => {
        const specIdStr = String(id);
        setFormData(prevData => {
            const currentSpecs = prevData.specializationIds;
            if (currentSpecs.includes(specIdStr)) {
                return {
                    ...prevData,
                    specializationIds: currentSpecs.filter(spec => spec !== specIdStr)
                };
            }
            return {
                ...prevData,
                specializationIds: [...currentSpecs, specIdStr]
            };
        });
    };

    // Xử lý thay đổi trạng thái Duyệt
    const handleApprovalChange = (e) => {
        setFormData({ ...formData, is_approved: e.target.value });
    };
    
    // Xử lý thay đổi trạng thái Kích hoạt
    const handleActiveChange = (e) => {
        // Phải đảm bảo giá trị là số (1 hoặc 0)
        setFormData({ ...formData, is_active: parseInt(e.target.value, 10) });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');
        setIsLoading(true);

        // Kiểm tra validation
        if (!formData.fullName || !formData.email || !formData.phone || !formData.cityId || formData.specializationIds.length === 0 || !formData.qualification) {
            setLocalError('Vui lòng điền đầy đủ các trường thông tin bắt buộc.');
            setIsLoading(false);
            return;
        }

        // Chuẩn bị Payload cho API update
        const payload = {
            updateType: 'update_doctor_details',
            userId: formData.userId,
            fullName: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            cityId: parseInt(formData.cityId, 10),
            qualification: formData.qualification,
            bio: formData.bio,
            specializationIds: formData.specializationIds.map(Number),
            isApproved: formData.is_approved,
            isActive: formData.is_active,
        };

        try {
            const data = await updateDoctorApi(API_UPDATE_URL, {
                method: 'PUT',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
            });

            window.alert(data.message || `Cập nhật Bác sĩ ${formData.fullName} (ID: ${formData.userId}) thành công!`);
            refreshList(); // Tải lại danh sách
            closeModal();

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
                    <div className="modal-header bg-info text-white">
                        <h5 className="modal-title">Sửa thông tin Bác sĩ (ID: {formData.userId})</h5>
                        <button type="button" className="btn-close btn-close-white" onClick={closeModal} disabled={isLoading}></button>
                    </div>
                    <div className="modal-body">
                        {localError && (
                            <div className="alert alert-danger" role="alert">{localError}</div>
                        )}
                        
                        <form onSubmit={handleSubmit}>
                            {/* Thông tin Cơ bản */}
                            <h6 className="text-primary mb-3">1. Thông tin Cá nhân & Liên hệ</h6>
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Họ tên đầy đủ (*)</label>
                                    <input type="text" className="form-control" name="fullName" value={formData.fullName || ''} onChange={handleChange} required />
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Email (*)</label>
                                    <input type="email" className="form-control" name="email" value={formData.email || ''} onChange={handleChange} required />
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Số điện thoại (*)</label>
                                    <input type="tel" className="form-control" name="phone" value={formData.phone || ''} onChange={handleChange} required />
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Thành phố làm việc (*)</label>
                                    <select className="form-select" name="cityId" value={formData.cityId || ''} onChange={handleChange} required>
                                        <option value="">Chọn Thành phố...</option>
                                        {cities.map(city => (<option key={city.id} value={city.id}>{city.name}</option>))}
                                    </select>
                                </div>
                            </div>
                            
                            {/* Thông tin Chuyên môn */}
                            <h6 className="text-primary my-3">2. Chuyên môn</h6>
                            <div className="mb-3">
                                <label className="form-label">Bằng cấp/Trình độ (*)</label>
                                <input type="text" className="form-control" name="qualification" value={formData.qualification || ''} onChange={handleChange} required />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Tiểu sử ngắn (Bio)</label>
                                <textarea className="form-control" name="bio" value={formData.bio || ''} onChange={handleChange} rows="2"></textarea>
                            </div>
                            <div className="mb-3">
                                <label className="form-label d-block">Chuyên khoa đăng ký (*)</label>
                                <div className="border p-3 rounded bg-light overflow-auto" style={{ maxHeight: '150px' }}>
                                    {specializations.map(spec => (
                                        <div className="form-check form-check-inline" key={spec.id}>
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                id={`modal-edit-spec-${spec.id}`}
                                                checked={formData.specializationIds?.includes(String(spec.id)) || false}
                                                onChange={() => handleSpecializationToggle(spec.id)}
                                            />
                                            <label className="form-check-label" htmlFor={`modal-edit-spec-${spec.id}`}>{spec.name}</label>
                                        </div>
                                    ))}
                                </div>
                                {formData.specializationIds?.length === 0 && <small className="text-danger">Vui lòng chọn ít nhất một chuyên khoa.</small>}
                            </div>

                            {/* Trạng thái Admin */}
                            <h6 className="text-primary my-3">3. Cài đặt Admin</h6>
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Trạng thái Duyệt hồ sơ (*)</label>
                                    <select className="form-select" name="is_approved" value={formData.is_approved || 'PENDING'} onChange={handleApprovalChange} required>
                                        <option value="PENDING">PENDING (Chờ duyệt)</option>
                                        <option value="APPROVED">APPROVED (Đã duyệt)</option>
                                        <option value="REJECTED">REJECTED (Từ chối)</option>
                                    </select>
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Trạng thái Tài khoản (*)</label>
                                    <select className="form-select" name="is_active" value={formData.is_active !== undefined ? formData.is_active : 1} onChange={handleActiveChange} required>
                                        <option value={1}>1 - Đã Kích hoạt</option>
                                        <option value={0}>0 - Đã Ngừng</option>
                                    </select>
                                </div>
                            </div>

                            <button type="submit" className="btn btn-info text-white w-100 mt-4" disabled={isLoading}>
                                {isLoading ? 'Đang cập nhật...' : 'Cập nhật Thông tin Bác sĩ'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};


// =======================================================
// COMPONENT 3: QUẢN LÝ CHÍNH (ADMINDOCTORMANAGER)
// =======================================================

const AdminDoctorManager = () => {
    const [doctors, setDoctors] = useState([]);
    const [cities, setCities] = useState([]);
    const [specializations, setSpecializations] = useState([]);
    
    // State cho Modal Thêm mới
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    
    // State cho Modal Sửa
    const [editingDoctor, setEditingDoctor] = useState(null); // Lưu trữ Doctor object đang được sửa
    
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchType, setSearchType] = useState('name'); // 'name' hoặc 'id'

    // Hàm gọi API FETCH chung (Giữ nguyên logic fetch API an toàn)
    const fetchApi = useCallback(async (url, options) => {
        let headers = { ...(options.headers || {}) };
        if (!(options.body instanceof FormData)) {
             headers['Content-Type'] = 'application/json';
        }
        
        const response = await fetch(url, {
            ...options,
            credentials: 'include',
            headers: headers,
        });

        if (response.status === 401) {
            throw new Error("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại với vai trò Admin.");
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

    // ------------------- TẢI DỮ LIỆU CHÍNH -------------------
    const fetchDoctors = useCallback(async () => {
        setError(null);
        setIsLoading(true);
        try {
            const data = await fetchApi(API_LIST_URL, { method: 'GET' });
            
            // Chuyển specializationIds từ chuỗi/null/number[] sang mảng string (cho Checkbox)
            const mappedDoctors = (data.data.doctors || []).map(doctor => ({
                ...doctor,
                specializationIds: (doctor.specializationIds || []).map(String),
                city_id: String(doctor.city_id) // Đảm bảo city_id là string
            }));

            setDoctors(mappedDoctors);
            setCities(data.data.cities || []);
            setSpecializations(data.data.specializations || []);

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [fetchApi]);

    useEffect(() => {
        fetchDoctors();
    }, [fetchDoctors]);


    // ------------------- LOGIC TÌM KIẾM & PHÂN TRANG -------------------
    const filteredDoctors = doctors.filter(doctor => {
        if (!searchTerm) return true;

        const term = searchTerm.toLowerCase();
        
        if (searchType === 'name') {
            return doctor.full_name.toLowerCase().includes(term);
        } else if (searchType === 'id') {
            // Tìm theo user_id (số nguyên)
            return String(doctor.user_id) === term; 
        }
        return true;
    });

    const totalPages = Math.ceil(filteredDoctors.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentDoctors = filteredDoctors.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handleSearch = () => {
        setCurrentPage(1); // Reset về trang 1 khi tìm kiếm
        // Việc lọc đã xảy ra ở biến filteredDoctors
    };

    // ------------------- LOGIC HÀNH ĐỘNG -------------------

    // Mở modal Sửa
    const handleEditDoctor = (doctor) => {
        setEditingDoctor(doctor);
    };

    // Đóng modal Sửa
    const closeEditModal = () => {
        setEditingDoctor(null);
    };

    // Kích hoạt/Ngừng kích hoạt tài khoản
    const handleToggleActivation = useCallback(async (userId, currentStatus) => {
        const newStatus = currentStatus === 1 ? 0 : 1;
        const confirmMessage = newStatus === 0 
            ? 'Bạn có chắc chắn muốn NGỪNG kích hoạt tài khoản này không?' 
            : 'Bạn có chắc chắn muốn KÍCH HOẠT lại tài khoản này không?';

        // NOTE: Sử dụng window.confirm() cho các tác vụ Admin vì nó nằm ngoài luồng UX chính
        if (!window.confirm(confirmMessage)) return; 

        try {
            const payload = {
                updateType: 'toggle_user_active',
                userId: userId,
                isActive: newStatus,
            };

            const data = await fetchApi(API_LIST_URL, {
                method: 'PUT',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
            });

            setSuccessMessage(data.message || 'Cập nhật trạng thái thành công.');
            fetchDoctors(); // Tải lại danh sách sau khi cập nhật

        } catch (err) {
            setError(err.message);
        }
    }, [fetchApi, fetchDoctors]);
    

    // ------------------- RENDER -------------------
    return (
        <div className="container py-5">
            <h2 className="mb-4 text-primary">Quản lý Bác sĩ (Admin Panel)</h2>

            {/* Thông báo lỗi/thành công */}
            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            {successMessage && <div className="alert alert-success" role="alert">{successMessage}</div>}

            <div className="card shadow-sm p-4">
                {/* Thanh Tìm kiếm và Thêm mới */}
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div className="d-flex">
                        {/* Combobox Tìm kiếm */}
                        <select 
                            className="form-select me-2" 
                            style={{ width: '150px' }}
                            value={searchType}
                            onChange={(e) => setSearchType(e.target.value)}
                        >
                            <option value="name">Tìm theo Tên</option>
                            <option value="id">Tìm theo User ID</option>
                        </select>
                        {/* Input Tìm kiếm */}
                        <input 
                            type="text" 
                            className="form-control me-2" 
                            placeholder={`Nhập ${searchType === 'name' ? 'tên' : 'ID'}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button className="btn btn-outline-primary" onClick={handleSearch}>
                            <i className="bi bi-search"></i> Tìm
                        </button>
                    </div>

                    {/* Nút Thêm mới */}
                    <button 
                        className="btn btn-success" 
                        onClick={() => setIsAddModalOpen(true)}
                    >
                        <i className="bi bi-plus-lg"></i> Thêm Bác sĩ mới
                    </button>
                </div>

                {/* Bảng Danh sách Bác sĩ */}
                <div className="table-responsive">
                    <table className="table table-hover align-middle">
                        <thead className="table-light">
                            <tr>
                                <th>ID</th>
                                <th>Họ Tên</th>
                                <th>Email</th>
                                <th>SĐT</th>
                                <th>Chuyên khoa</th>
                                <th>Trạng thái Duyệt</th>
                                <th>Trạng thái TK</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="8" className="text-center py-4 text-muted">Đang tải dữ liệu...</td>
                                </tr>
                            ) : currentDoctors.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="text-center py-4 text-muted">Không tìm thấy Bác sĩ nào.</td>
                                </tr>
                            ) : (
                                currentDoctors.map(doctor => (
                                    <tr key={doctor.user_id}>
                                        <td>{doctor.user_id}</td>
                                        <td>{doctor.full_name}</td>
                                        <td>{doctor.email}</td>
                                        <td>{doctor.phone || 'N/A'}</td>
                                        <td>
                                            {doctor.specializationIds.length > 0 ? doctor.specializationIds.length : 0} Chuyên khoa
                                        </td>
                                        <td>
                                            <span className={`badge ${doctor.is_active === 'APPROVED' ? 'bg-success' : doctor.is_active === 'PENDING' ? 'bg-warning text-dark' : 'bg-danger'}`}>
                                                {doctor.is_active}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${doctor.user_is_active === 1 ? 'bg-success' : 'bg-secondary'}`}>
                                                {doctor.user_is_active === 1 ? 'Đã Kích hoạt' : 'Đã Ngừng'}
                                            </span>
                                        </td>
                                        <td>
                                            {/* Nút SỬA */}
                                            <button 
                                                className="btn btn-sm btn-info me-2 text-white"
                                                onClick={() => handleEditDoctor(doctor)}
                                            >
                                                <i className="bi bi-pencil-square"></i> Sửa
                                            </button>
                                            {/* Nút KÍCH HOẠT/NGỪNG */}
                                            <button 
                                                className={`btn btn-sm ${doctor.user_is_active === 1 ? 'btn-secondary' : 'btn-success'}`}
                                                onClick={() => handleToggleActivation(doctor.user_id, doctor.user_is_active)}
                                            >
                                                {doctor.user_is_active === 1 ? 'Ngừng' : 'Kích hoạt'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Phân trang */}
                <div className="d-flex justify-content-between align-items-center mt-3">
                    <div>
                        Hiển thị {currentDoctors.length} trên tổng số {filteredDoctors.length} kết quả.
                    </div>
                    <nav>
                        <ul className="pagination mb-0">
                            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                <button className="page-link" onClick={() => setCurrentPage(currentPage - 1)}>Trước</button>
                            </li>
                            {[...Array(totalPages)].map((_, index) => (
                                <li key={index} className={`page-item ${currentPage === index + 1 ? 'active' : ''}`}>
                                    <button className="page-link" onClick={() => setCurrentPage(index + 1)}>
                                        {index + 1}
                                    </button>
                                </li>
                            ))}
                            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                <button className="page-link" onClick={() => setCurrentPage(currentPage + 1)}>Sau</button>
                            </li>
                        </ul>
                    </nav>
                </div>

            </div>
            
            {/* Component Modal Thêm Bác sĩ */}
            <AddDoctorForm 
                isModalOpen={isAddModalOpen}
                closeModal={() => setIsAddModalOpen(false)}
                cities={cities}
                specializations={specializations}
                refreshList={fetchDoctors}
            />

            {/* Component Modal Sửa Bác sĩ Mới */}
            <EditDoctorModal
                doctor={editingDoctor}
                closeModal={closeEditModal}
                cities={cities}
                specializations={specializations}
                refreshList={fetchDoctors}
                updateDoctorApi={fetchApi} // Truyền hàm fetchApi vào để dùng cho update
            />
        </div>
    );
};

export default AdminDoctorManager;