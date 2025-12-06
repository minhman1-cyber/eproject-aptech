import React, { useState, useEffect, useCallback } from 'react';

// URL API Backend (Sử dụng cổng 5173 cho Frontend và 8888 cho Backend)
const API_BASE_URL = 'http://localhost:8888/api/v1/controllers/';
const API_PROFILE_URL = API_BASE_URL + 'doctor_profile.php';
const API_AVATAR_UPLOAD_URL = 'http://localhost:8888/api/v1/upload/doctor_avatar.php';
const API_QUALIFICATION_UPLOAD_URL = 'http://localhost:8888/api/v1/upload/doctor_qualification_upload.php';

// Các giá trị mặc định cho form
const initialDoctorData = {
    doctorId: null,
    fullName: '',
    email: '',
    phone: '',
    cityId: '',
    qualification: '',
    bio: '',
    profilePicture: 'https://placehold.co/120x120/AFD1E4/FFFFFF/png?text=Bác+Sĩ',
};

const initialNewQualification = { 
    title: '', 
    institution: '', 
    year: '', 
    documentFile: null 
};

const DoctorProfiles = () => {
    const [activeTab, setActiveTab] = useState('personal');
    const [formData, setFormData] = useState(initialDoctorData);
    const [avatarFile, setAvatarFile] = useState(null);
    const [allCities, setAllCities] = useState([]); // Cities từ DB
    
    // State cho chuyên khoa
    const [allSpecializations, setAllSpecializations] = useState([]);
    const [selectedSpecializationIds, setSelectedSpecializationIds] = useState([]);

    // State cho bằng cấp
    const [qualifications, setQualifications] = useState([]);
    const [newQualification, setNewQualification] = useState(initialNewQualification);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);


    // Hàm gọi API FETCH chung (ĐÃ SỬA)
    const fetchApi = useCallback(async (url, options) => {
        
        // Cấu hình headers cho JSON hoặc bỏ qua cho FormData
        let headers = { ...(options.headers || {}) };
        if (!(options.body instanceof FormData)) {
             headers['Content-Type'] = 'application/json';
        } else {
             // Với FormData, trình duyệt tự đặt Content-Type: multipart/form-data
             delete headers['Content-Type']; 
        }

        const response = await fetch(url, {
            ...options,
            credentials: 'include',
            headers: headers,
        });

        // 1. Kiểm tra trạng thái HTTP (Lỗi Session, Lỗi Server chung)
        if (response.status === 401) {
            throw new Error("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
        }
        
        // 2. Kiểm tra Content-Type trước khi gọi .json()
        const contentType = response.headers.get('content-type');
        const isJson = contentType && contentType.includes('application/json');

        if (isJson) {
            const data = await response.json();
            if (!response.ok) {
                // Lỗi từ Server có body JSON (ví dụ: 400 Bad Request, 500 Internal Server Error)
                throw new Error(data.message || 'Lỗi hệ thống không xác định.');
            }
            return data;
        }

        // 3. Nếu không phải JSON (File upload thành công nhưng không trả về JSON, hoặc lỗi Server không cấu trúc)
        if (!response.ok) {
             // Đọc response text để kiểm tra lỗi PHP
             const rawText = await response.text();
             if (rawText.length > 0) {
                 // Đây là nơi lỗi JSON thường xảy ra (PHP Warning/Notice)
                 throw new Error(`Cập nhật thất bại (Lỗi Server: ${rawText.substring(0, 100)}...)`);
             }
             throw new Error('Cập nhật thất bại (Lỗi Server).');
        }

        return {}; // Trả về object rỗng nếu response.ok và không có JSON body (ví dụ: HTTP 204 No Content)
    }, []);

    // ============================================
    // 1. TẢI DỮ LIỆU BAN ĐẦU (useEffect)
    // ============================================
    useEffect(() => {
        const fetchProfileData = async () => {
            setError(null);
            try {
                // Tải dữ liệu chính (Profile, Chuyên khoa, Bằng cấp)
                const data = await fetchApi(API_PROFILE_URL, { method: 'GET' });
                const profile = data.data;

                // Cập nhật State Cities (Giả định tải cities từ một API riêng, nhưng hiện tại dùng dummy)
                // THỰC TẾ: Cần fetch cities từ DB
                setAllCities(profile.allCities || [{ id: 1, name: 'Hồ Chí Minh' }, { id: 2, name: 'Hà Nội' }]);

                // Cập nhật Form Data
                setFormData({
                    doctorId: profile.doctorId,
                    fullName: profile.fullName || '',
                    email: profile.email || '',
                    phone: profile.phone || '',
                    cityId: profile.cityId,
                    qualification: profile.qualification || '',
                    bio: profile.bio || '',
                    profilePicture: profile.profilePicture || initialDoctorData.profilePicture,
                });

                // Cập nhật Chuyên khoa
                setSelectedSpecializationIds(profile.selectedSpecializationIds || []);
                
                // Chuẩn hóa danh sách chuyên khoa có sẵn
                setAllSpecializations(profile.allSpecializations.map(spec => ({
                    ...spec,
                    checked: profile.selectedSpecializationIds.includes(spec.id)
                })));

                // Cập nhật Bằng cấp
                setQualifications(profile.qualifications || []);

            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        setIsLoading(true);
        fetchProfileData();
    }, [fetchApi]);


    // ============================================
    // 2. XỬ LÝ FORM CHUNG & AVATAR
    // ============================================
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatarFile(file);
            setFormData({ ...formData, profilePicture: URL.createObjectURL(file) }); // Preview ảnh
        }
    };
    
    const uploadAvatar = useCallback(async () => {
        setError(null);
        setSuccessMessage(null);
        if (!avatarFile) return true; // Không có file để tải

        const uploadFormData = new FormData();
        uploadFormData.append('avatar', avatarFile);

        try {
            const data = await fetchApi(API_AVATAR_UPLOAD_URL, {
                method: 'POST',
                body: uploadFormData,
            });
            
            // Cập nhật URL ảnh mới từ server
            setFormData(prev => ({...prev, profilePicture: data.newAvatarUrl})); 
            setAvatarFile(null); 
            return true;
            
        } catch (err) {
            setError(err.message);
            return false;
        }
    }, [avatarFile, fetchApi]);


    // ============================================
    // 3. HANDLER SUBMIT TABS
    // ============================================

    // Tab 1: Cập nhật Thông tin cá nhân
    const handleSubmitPersonal = useCallback(async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setIsLoading(true);

        // 1. Tải Avatar trước (nếu có file mới)
        let uploadSuccess = true;
        if (avatarFile) {
            uploadSuccess = await uploadAvatar();
        }
        if (!uploadSuccess) {
            setIsLoading(false);
            return;
        }
        
        // 2. Cập nhật thông tin text profile
        const payload = {
            updateType: 'personal', // Dùng cho Backend Router
            fullName: formData.fullName,
            phone: formData.phone,
            cityId: parseInt(formData.cityId),
            qualification: formData.qualification,
            bio: formData.bio,
        };

        try {
            const data = await fetchApi(API_PROFILE_URL, {
                method: 'PUT',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
            });

            setSuccessMessage(data.message || "Thông tin cá nhân đã được cập nhật thành công!");
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [formData, avatarFile, uploadAvatar, fetchApi]);


    // Tab 2: Cập nhật Chuyên khoa
    const handleSubmitSpecializations = useCallback(async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setIsLoading(true);

        if (selectedSpecializationIds.length === 0) {
             setError("Vui lòng chọn ít nhất một chuyên khoa.");
             setIsLoading(false);
             return;
        }

        const payload = {
            updateType: 'specializations', // Dùng cho Backend Router
            specializationIds: selectedSpecializationIds,
        };

        try {
            const data = await fetchApi(API_PROFILE_URL, {
                method: 'PUT',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
            });
            
            setSuccessMessage(data.message || "Chuyên khoa đã được đồng bộ hóa thành công!");
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [selectedSpecializationIds, fetchApi]);


    // Tab 3: Thêm bằng cấp
    const handleAddQualification = useCallback(async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        if (!newQualification.title || !newQualification.institution || !newQualification.year || !newQualification.documentFile) {
             setError('Vui lòng điền đủ thông tin bằng cấp và tải lên file.');
             return;
        }
        
        setIsLoading(true);

        // 1. Tải file bằng cấp lên server (FormData)
        const uploadFormData = new FormData();
        uploadFormData.append('qualification_document', newQualification.documentFile);
        uploadFormData.append('title', newQualification.title);
        uploadFormData.append('institution', newQualification.institution);
        uploadFormData.append('year', newQualification.year);

        try {
            const data = await fetchApi(API_QUALIFICATION_UPLOAD_URL, {
                method: 'POST',
                body: uploadFormData,
            });

            // 2. Cập nhật state với bản ghi mới từ server
            const newRecord = {
                ...data.data, // Nhận ID, URL, is_verified=0 từ Server
                document_url: data.data.document_url,
                is_verified: 0,
            };
            setQualifications(prev => [...prev, newRecord]);
            setNewQualification(initialNewQualification); // Reset form
            setSuccessMessage(data.message || 'Bằng cấp đã được thêm và đang chờ xác minh!');

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [newQualification, fetchApi]);

    // Xử lý Checkbox Chuyên khoa
    const handleSpecializationToggle = (id) => {
        setAllSpecializations(prevSpecs => prevSpecs.map(spec => 
            spec.id === id ? { ...spec, checked: !spec.checked } : spec
        ));

        setSelectedSpecializationIds(prevIds => 
            prevIds.includes(id) ? prevIds.filter(specId => specId !== id) : [...prevIds, id]
        );
    };

    // Thêm vào DoctorProfiles component
const handleNewQualificationChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'documentFile') {
        setNewQualification(prev => ({ ...prev, documentFile: files[0] }));
    } else {
        setNewQualification(prev => ({ ...prev, [name]: value }));
    }
};



    if (isLoading) {
        return <div className="text-center py-5 text-primary"><i className="bi bi-arrow-clockwise fs-3 animate-spin me-2"></i>Đang tải dữ liệu hồ sơ bác sĩ...</div>;
    }
    
    // Nếu có lỗi nghiêm trọng (ví dụ: 401 Unauthorized), hiển thị lỗi
    if (error && error.includes('đăng nhập lại')) {
        return <div className="alert alert-danger text-center py-5">{error}</div>;
    }


    return (
        <div className="container py-5">
            <h2 className="mb-4 text-success d-flex align-items-center">
                <i className="bi bi-person-badge-fill me-3"></i> Quản lý Profile Bác Sĩ
                {formData.doctorId && <span className="badge bg-secondary ms-3">ID Doctor: {formData.doctorId}</span>}
            </h2>
            
            {/* Hiển thị thông báo lỗi/thành công */}
            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            {successMessage && <div className="alert alert-success" role="alert">{successMessage}</div>}

            <div className="card shadow-lg border-0">
                
                {/* NAVIGATION TABS */}
                <div className="card-header bg-white border-bottom-0 pt-3">
                    <ul className="nav nav-tabs card-header-tabs" role="tablist">
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${activeTab === 'personal' ? 'active text-primary fw-bold' : 'text-muted'}`} 
                                onClick={() => setActiveTab('personal')}
                            >
                                <i className="bi bi-person-fill me-2"></i> Thông tin cá nhân
                            </button>
                        </li>
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${activeTab === 'specializations' ? 'active text-primary fw-bold' : 'text-muted'}`} 
                                onClick={() => setActiveTab('specializations')}
                            >
                                <i className="bi bi-hospital-fill me-2"></i> Chuyên khoa ({selectedSpecializationIds.length})
                            </button>
                        </li>
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${activeTab === 'qualifications' ? 'active text-primary fw-bold' : 'text-muted'}`} 
                                onClick={() => setActiveTab('qualifications')}
                            >
                                <i className="bi bi-award-fill me-2"></i> Bằng cấp & Xác minh ({qualifications.length})
                            </button>
                        </li>
                        <li className="nav-item ms-auto">
                            <button className="btn btn-sm btn-outline-warning d-flex align-items-center" style={{marginTop: '4px'}}>
                                <i className="bi bi-key-fill me-2"></i> Đổi mật khẩu
                            </button>
                        </li>
                    </ul>
                </div>

                <div className="card-body p-4">
                    {/* TAB CONTENT 1: PERSONAL INFORMATION */}
                    {activeTab === 'personal' && (
                        <form onSubmit={handleSubmitPersonal}>
                            <h4 className="mb-4 text-primary">Cập nhật Thông tin cá nhân & Liên hệ</h4>
                            
                            <div className="row mb-4 align-items-center">
                                {/* Avatar Section */}
                                <div className="col-md-3 text-center">
                                    <img 
                                        src={formData.profilePicture} 
                                        className="rounded-circle border border-primary p-1 mb-3" 
                                        alt="Doctor Avatar" 
                                        style={{ width: '120px', height: '120px', objectFit: 'cover' }}
                                    />
                                    <label htmlFor="avatarUpload" className="btn btn-outline-primary btn-sm d-block mx-auto" style={{maxWidth: '120px'}}>
                                        <i className="bi bi-camera-fill me-2"></i> Đổi Avatar
                                    </label>
                                    <input 
                                        type="file" 
                                        id="avatarUpload" 
                                        name="avatar"
                                        accept="image/*" 
                                        onChange={handleAvatarChange} 
                                        style={{ display: 'none' }}
                                    />
                                </div>

                                {/* Personal Details Form */}
                                <div className="col-md-9">
                                    <div className="row mb-3">
                                        <div className="col-md-6">
                                            <label htmlFor="fullName" className="form-label fw-bold">Họ tên đầy đủ</label>
                                            <input type="text" className="form-control" id="fullName" name="fullName" value={formData.fullName} onChange={handleChange} required />
                                        </div>
                                        <div className="col-md-6">
                                            <label htmlFor="email" className="form-label fw-bold">Email</label>
                                            <input type="email" className="form-control" id="email" name="email" value={formData.email} onChange={handleChange} disabled />
                                            <div className="form-text">Email không thể thay đổi.</div>
                                        </div>
                                    </div>
                                    <div className="row mb-3">
                                        <div className="col-md-6">
                                            <label htmlFor="phone" className="form-label fw-bold">Số điện thoại</label>
                                            <input type="tel" className="form-control" id="phone" name="phone" value={formData.phone} onChange={handleChange} required />
                                        </div>
                                        <div className="col-md-6">
                                            <label htmlFor="cityId" className="form-label fw-bold">Thành phố làm việc</label>
                                            <select className="form-select" id="cityId" name="cityId" value={formData.cityId} onChange={handleChange} required>
                                                {allCities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-3">
                                <label htmlFor="qualification" className="form-label fw-bold">Bằng cấp/Trình độ (Ngắn gọn)</label>
                                <input type="text" className="form-control" id="qualification" name="qualification" value={formData.qualification} onChange={handleChange} required />
                                <div className="form-text">Ví dụ: Tiến sĩ Y học, Chuyên khoa II Da Liễu.</div>
                            </div>
                            
                            <div className="mb-4">
                                <label htmlFor="bio" className="form-label fw-bold">Tiểu sử ngắn (Bio)</label>
                                <textarea className="form-control" id="bio" name="bio" value={formData.bio} onChange={handleChange} rows="4" placeholder="Giới thiệu về bản thân, kinh nghiệm, chuyên môn..."></textarea>
                                <div className="form-text">Mô tả ngắn gọn, hiển thị công khai.</div>
                            </div>

                            <button type="submit" className="btn btn-success btn-lg px-5" disabled={isLoading}>
                                <i className="bi bi-save-fill me-2"></i> {isLoading ? 'Đang lưu...' : 'Lưu Thông tin cá nhân'}
                            </button>
                        </form>
                    )}

                    {/* TAB CONTENT 2: SPECIALIZATIONS */}
                    {activeTab === 'specializations' && (
                        <form onSubmit={handleSubmitSpecializations}>
                            <h4 className="mb-4 text-primary">Chọn các Chuyên khoa bạn tham gia</h4>
                            <p className="text-muted mb-4">
                                <i className="bi bi-info-circle-fill me-2"></i> Thông tin này sẽ được đồng bộ ngay lập tức và dùng để lọc tìm kiếm.
                            </p>
                            <div className="row row-cols-1 row-cols-md-3 g-3">
                                {allSpecializations.map(spec => (
                                    <div className="col" key={spec.id}>
                                        <div className="form-check form-check-inline form-control-lg border rounded p-3 bg-light w-100">
                                            <input 
                                                className="form-check-input mt-0 me-2" 
                                                type="checkbox" 
                                                id={`spec-${spec.id}`} 
                                                checked={spec.checked}
                                                onChange={() => handleSpecializationToggle(spec.id)}
                                                style={{transform: 'scale(1.2)'}}
                                            />
                                            <label className="form-check-label fw-bold text-dark" htmlFor={`spec-${spec.id}`}>
                                                {spec.name}
                                            </label>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button type="submit" className="btn btn-primary btn-lg mt-4 px-5" disabled={isLoading}>
                                <i className="bi bi-save-fill me-2"></i> {isLoading ? 'Đang đồng bộ...' : 'Lưu Chuyên khoa'}
                            </button>
                        </form>
                    )}

                    {/* TAB CONTENT 3: QUALIFICATIONS & VERIFICATION */}
                    {activeTab === 'qualifications' && (
                        <div>
                            <h4 className="mb-4 text-primary">Bằng cấp & Tình trạng Xác minh</h4>
                            <p className="text-muted mb-4">
                                <i className="bi bi-exclamation-triangle-fill me-2"></i> Tải lên bản scan bằng cấp. Các bằng cấp CHƯA XÁC MINH sẽ không hiển thị huy hiệu xác thực.
                            </p>
                            
                            <h5 className="mb-3 text-dark">Các bằng cấp hiện có ({qualifications.length})</h5>
                            {qualifications.length > 0 ? (
                                <div className="table-responsive">
                                    <table className="table table-hover table-bordered align-middle">
                                        <thead className="table-light">
                                            <tr>
                                                <th>Bằng cấp</th>
                                                <th>Tổ chức</th>
                                                <th>Năm</th>
                                                <th>Trạng thái</th>
                                                <th>Hành động</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {qualifications.map(q => (
                                                <tr key={q.id}>
                                                    <td>{q.title}</td>
                                                    <td>{q.institution}</td>
                                                    <td>{q.year}</td>
                                                    <td>
                                                        {q.is_verified 
                                                            ? <span className="badge bg-success-subtle text-success border border-success-subtle"><i className="bi bi-check-circle-fill me-1"></i> Đã xác minh</span> 
                                                            : <span className="badge bg-warning-subtle text-warning border border-warning-subtle"><i className="bi bi-hourglass-split me-1"></i> Chờ duyệt</span>
                                                        }
                                                    </td>
                                                    <td>
                                                        <a href={q.document_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-info me-2">
                                                            <i className="bi bi-file-earmark-text-fill me-1"></i> Xem File
                                                        </a>
                                                        <button className="btn btn-sm btn-outline-danger">
                                                            <i className="bi bi-trash-fill">Xóa</i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="alert alert-info" role="alert">
                                    Bạn chưa có bằng cấp nào được thêm.
                                </div>
                            )}

                            <h5 className="mt-5 mb-3 text-dark">Thêm Bằng cấp mới</h5>
                            <form onSubmit={handleAddQualification} className="p-4 border rounded bg-light">
                                <div className="row g-3 mb-3">
                                    <div className="col-md-6">
                                        <label htmlFor="newQualTitle" className="form-label">Tên bằng cấp (*)</label>
                                        <input type="text" className="form-control" id="newQualTitle" name="title" value={newQualification.title} onChange={handleNewQualificationChange} required />
                                    </div>
                                    <div className="col-md-4">
                                        <label htmlFor="newQualInstitution" className="form-label">Tổ chức cấp (*)</label>
                                        <input type="text" className="form-control" id="newQualInstitution" name="institution" value={newQualification.institution} onChange={handleNewQualificationChange} required />
                                    </div>
                                    <div className="col-md-2">
                                        <label htmlFor="newQualYear" className="form-label">Năm hoàn thành (*)</label>
                                        <input type="number" className="form-control" id="newQualYear" name="year" value={newQualification.year} onChange={handleNewQualificationChange} min="1900" max={new Date().getFullYear()} required />
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <label htmlFor="newQualDocument" className="form-label">Tải lên bản scan bằng cấp (PDF/Image) (*)</label>
                                    <input type="file" className="form-control" id="newQualDocument" name="documentFile" accept=".pdf,.jpg,.jpeg,.png" onChange={handleNewQualificationChange} required />
                                    <div className="form-text">Chỉ chấp nhận file PDF hoặc hình ảnh (JPG, PNG).</div>
                                </div>
                                <button type="submit" className="btn btn-primary px-5" disabled={isLoading}>
                                    <i className="bi bi-plus-circle-fill me-2"></i> Thêm Bằng cấp
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DoctorProfiles;