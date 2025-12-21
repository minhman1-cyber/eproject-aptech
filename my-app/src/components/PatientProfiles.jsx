import React, { useState, useEffect, useCallback } from 'react';
import ChangePasswordModal from './ChangePasswordModal'; // Giữ nguyên import theo yêu cầu của bạn

// URL API Backend
const API_PROFILE_URL = 'http://localhost:8888/api/v1/controllers/patient_profile.php';
const API_AVATAR_UPLOAD_URL = 'http://localhost:8888/api/v1/upload/patient_avatar.php'; 

const dummyCities = [{ id: 1, name: 'Hồ Chí Minh' }, { id: 2, name: 'Hà Nội' }];

// Hàm fetch API chung
const useFetchApi = () => {
    return useCallback(async (url, options = {}) => {
        const response = await fetch(url, {
            ...options,
            credentials: 'include',
            headers: {
                ...(options.headers || {}),
                'Content-Type': options.body instanceof FormData ? undefined : 'application/json',
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
            throw new Error('Thao tác thất bại (Lỗi Server).');
        }
        return {};
    }, []);
};

const PatientProfiles = ({ isWidget = false, setActiveTab }) => {
    const [formData, setFormData] = useState({
        id: null, 
        fullName: 'Đang tải...',
        email: '',
        phone: '',
        address: '',
        cityId: '',
        profilePicture: 'https://placehold.co/150x150/AFD1E4/FFFFFF/png?text=Avatar',
    });
    const [avatarFile, setAvatarFile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    
    const fetchApi = useFetchApi();

    // 1. FETCH DỮ LIỆU
    const fetchProfile = useCallback(async () => {
        setError(null);
        // Nếu là widget thì không cần set loading toàn trang để tránh giật UI chính
        if (!isWidget) setIsLoading(true);
        
        try {
            const data = await fetchApi(API_PROFILE_URL, { method: 'GET' });

            setFormData({
                id: data.data.id,
                fullName: data.data.fullName || '',
                email: data.data.email || '',
                phone: data.data.phone || '',
                address: data.data.address || '',
                cityId: String(data.data.cityId || ''),
                profilePicture: data.data.profilePicture || 'https://placehold.co/150x150/AFD1E4/FFFFFF/png?text=Avatar',
            });

        } catch (err) {
            // Ở chế độ widget, log lỗi ra console thay vì hiện lên UI để tránh làm xấu giao diện chính
            if (isWidget) console.error("Widget Profile Error:", err.message);
            else setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [fetchApi, isWidget]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    // 2. LOGIC XỬ LÝ FORM
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatarFile(file);
            setFormData(prev => ({ ...prev, profilePicture: URL.createObjectURL(file) }));
        }
    };
    
    const uploadAvatar = async (file) => {
        setError(null);
        setSuccessMessage(null);
        const avatarFormData = new FormData();
        avatarFormData.append('avatar', file);

        try {
            const data = await fetchApi(API_AVATAR_UPLOAD_URL, {
                method: 'POST',
                body: avatarFormData, 
            });
            
            setFormData(prev => ({...prev, profilePicture: data.newAvatarUrl})); 
            setSuccessMessage("Avatar đã được cập nhật thành công!");
            setAvatarFile(null); 
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setIsLoading(true);

        if (avatarFile) {
            const uploaded = await uploadAvatar(avatarFile);
            if (!uploaded) {
                setIsLoading(false);
                return; 
            }
        }
        
        const payload = {
            fullName: formData.fullName,
            phone: formData.phone,
            address: formData.address,
            cityId: parseInt(formData.cityId),
        };

        try {
            await fetchApi(API_PROFILE_URL, {
                method: 'PUT',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
            });

            setSuccessMessage("Thông tin hồ sơ đã được cập nhật thành công!");

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // ============================================
    // GIAO DIỆN 1: CHẾ ĐỘ WIDGET (Dùng cho Dashboard Home)
    // ============================================
    if (isWidget) {
        return (
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body text-center p-4">
                    <div className="position-relative d-inline-block mb-3">
                        <img 
                            src={formData.profilePicture} 
                            alt="Avatar" 
                            className="rounded-circle border border-3 border-white shadow-sm"
                            width="100" height="100"
                            style={{ objectFit: 'cover' }} 
                        />
                        <span className="position-absolute bottom-0 end-0 p-2 bg-success border border-light rounded-circle"></span>
                    </div>
                    <h5 className="fw-bold mb-1">{isLoading ? 'Đang tải...' : formData.fullName}</h5>
                    <div className="badge bg-light text-secondary mb-3 border">
                        <i className="fas fa-id-card me-1"></i> {formData.id ? `BN-${formData.id}` : '...'}
                    </div>
                    
                    <div className="d-grid gap-2">
                        {/* Nút này chuyển sang tab Profile đầy đủ thông qua prop setActiveTab */}
                        <button 
                            className="btn btn-outline-primary btn-sm" 
                            onClick={() => setActiveTab && setActiveTab('profile')}
                        >
                            <i className="fas fa-user-edit me-1"></i> Chỉnh sửa hồ sơ
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ============================================
    // GIAO DIỆN 2: CHẾ ĐỘ FULL (Dùng cho trang Tài khoản)
    // ============================================

    if (isLoading) {
        return <div className="text-center py-5"><div className="spinner-border text-primary me-2" role="status"></div>Đang tải dữ liệu hồ sơ...</div>;
    }
    
    if (error && error.includes('đăng nhập lại')) {
        return <div className="alert alert-danger text-center py-5">{error}</div>;
    }

    return (
        <div className="container py-2">
            <h4 className="mb-4 text-primary fw-bold">Hồ sơ cá nhân</h4>
            
            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            {successMessage && <div className="alert alert-success" role="alert">{successMessage}</div>}
            
            <div className="row">
                {/* Cột 1: Avatar */}
                <div className="col-md-4">
                    <div className="card shadow-sm p-3 mb-4 text-center border-0">
                        <img 
                            src={formData.profilePicture} 
                            className="rounded-circle mx-auto mb-3" 
                            alt="Patient Avatar" 
                            style={{ width: '150px', height: '150px', objectFit: 'cover' }}
                        />
                        <div className="mb-3">
                            <label htmlFor="avatarUpload" className="btn btn-outline-secondary btn-sm">
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
                        <button 
                            type="button" 
                            className="btn btn-warning btn-sm"
                            onClick={() => setIsPasswordModalOpen(true)}
                        >
                            Đổi Mật khẩu
                        </button>
                    </div>
                </div>

                {/* Cột 2: Form Cập Nhật */}
                <div className="col-md-8">
                    <form onSubmit={handleSubmit} className="card p-4 shadow-sm border-0">
                        <h5 className="mb-3 text-secondary fw-bold">Thông tin chi tiết</h5>

                        <div className="row mb-3">
                            <div className="col-md-6 mb-3">
                                <label className="form-label fw-bold small text-muted">Họ tên đầy đủ</label>
                                <input type="text" className="form-control" name="fullName" value={formData.fullName} onChange={handleChange} required />
                            </div>
                            <div className="col-md-6 mb-3">
                                <label className="form-label fw-bold small text-muted">Email</label>
                                <input type="email" className="form-control" name="email" value={formData.email} onChange={handleChange} disabled /> 
                            </div>
                            
                            <div className="col-md-6 mb-3">
                                <label className="form-label fw-bold small text-muted">Số điện thoại</label>
                                <input type="tel" className="form-control" name="phone" value={formData.phone} onChange={handleChange} />
                            </div>
                            <div className="col-md-6 mb-3">
                                <label className="form-label fw-bold small text-muted">Thành phố</label>
                                <select className="form-select" name="cityId" value={formData.cityId} onChange={handleChange} required>
                                    <option value="">Chọn thành phố...</option>
                                    {dummyCities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            
                            <div className="col-md-12 mb-3">
                                <label className="form-label fw-bold small text-muted">Địa chỉ</label>
                                <input type="text" className="form-control" name="address" value={formData.address} onChange={handleChange} />
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={isLoading}>
                             {isLoading ? 'Đang lưu...' : 'Cập nhật Thông tin'}
                        </button>
                    </form>
                </div>
            </div>
            
            {/* Modal Đổi mật khẩu được import từ file ngoài */}
            <ChangePasswordModal 
                isModalOpen={isPasswordModalOpen}
                closeModal={() => setIsPasswordModalOpen(false)}
                fetchApi={fetchApi}
            />
        </div>
    );
};

export default PatientProfiles;