import React, { useState, useEffect, useCallback } from 'react';
import ChangePasswordModal from './ChangePasswordModal'; // Import Modal đổi mật khẩu

// URL API Backend (Sửa port 8888 nếu cần)
const API_PROFILE_URL = 'http://localhost:8888/api/v1/controllers/patient_profile.php';
// Đây là URL API tải lên avatar (Giả định)
const API_AVATAR_UPLOAD_URL = 'http://localhost:8888/api/v1/upload/patient_avatar.php'; 

const dummyCities = [{ id: 1, name: 'Hồ Chí Minh' }, { id: 2, name: 'Hà Nội' }];

// Hàm fetch API chung (Được định nghĩa lại để sử dụng trong component này)
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


const PatientProfiles = () => {
    const [formData, setFormData] = useState({
        id: null, // user_id
        fullName: '',
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
    
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false); // State mở Modal
    
    const fetchApi = useFetchApi(); // Khởi tạo hàm fetch

    // ============================================
    // 1. FETCH DỮ LIỆU BAN ĐẦU (GET)
    // ============================================
    const fetchProfile = useCallback(async () => {
        setError(null);
        setIsLoading(true);
        try {
            const data = await fetchApi(API_PROFILE_URL, { method: 'GET' });

            setFormData({
                id: data.data.id,
                fullName: data.data.fullName || '',
                email: data.data.email || '',
                phone: data.data.phone || '',
                address: data.data.address || '',
                cityId: String(data.data.cityId || ''), // Đảm bảo là string cho select
                profilePicture: data.data.profilePicture || 'https://placehold.co/150x150/AFD1E4/FFFFFF/png?text=Avatar',
            });

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [fetchApi]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    // ============================================
    // 2. LOGIC XỬ LÝ FORM
    // ============================================

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatarFile(file);
            // Tạo URL tạm thời để preview ảnh
            setFormData(prev => ({ ...prev, profilePicture: URL.createObjectURL(file) }));
        }
    };
    
    // Hàm tải lên Avatar (Tách biệt khỏi cập nhật form)
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

    // Hàm cập nhật Profile chính
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setIsLoading(true);

        // 1. Nếu có file Avatar mới, tải lên trước
        if (avatarFile) {
            const uploaded = await uploadAvatar(avatarFile);
            if (!uploaded) {
                setIsLoading(false);
                return; 
            }
        }
        
        // 2. Cập nhật thông tin text profile
        const payload = {
            fullName: formData.fullName,
            phone: formData.phone,
            address: formData.address,
            cityId: parseInt(formData.cityId),
        };

        try {
            await fetchApi(API_PROFILE_URL, {
                method: 'PUT', // Sử dụng PUT để cập nhật
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

    if (isLoading) {
        return <div className="text-center py-5"><i className="bi bi-arrow-clockwise fs-3 animate-spin me-2"></i>Đang tải dữ liệu hồ sơ...</div>;
    }
    
    // Nếu có lỗi nghiêm trọng (ví dụ: 401 Unauthorized), hiển thị lỗi
    if (error && error.includes('đăng nhập lại')) {
        return <div className="alert alert-danger text-center py-5">{error}</div>;
    }

    return (
        <div className="container py-5">
            <h2 className="mb-4 text-primary">🧍 Trang Profile Bệnh Nhân</h2>
            
            {/* Hiển thị thông báo lỗi/thành công */}
            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            {successMessage && <div className="alert alert-success" role="alert">{successMessage}</div>}
            
            <div className="row">
                {/* Cột 1: Avatar */}
                <div className="col-md-4">
                    <div className="card shadow-sm p-3 mb-4 text-center">
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
                            onClick={() => setIsPasswordModalOpen(true)} // <<< MỞ MODAL
                        >
                            Đổi Mật khẩu
                        </button>
                    </div>
                </div>

                {/* Cột 2: Form Cập Nhật */}
                <div className="col-md-8">
                    <form onSubmit={handleSubmit} className="card p-4 shadow-sm">
                        <h4 className="mb-3">Thông tin Cá nhân</h4>

                        <div className="row mb-3">
                            <div className="col-md-6">
                                <label className="form-label">Họ tên đầy đủ</label>
                                <input type="text" className="form-control" name="fullName" value={formData.fullName} onChange={handleChange} required />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label">Email</label>
                                <input type="email" className="form-control" name="email" value={formData.email} onChange={handleChange} disabled /> 
                            </div>
                        </div>

                        <div className="row mb-3">
                            <div className="col-md-6">
                                <label className="form-label">Số điện thoại</label>
                                <input type="tel" className="form-control" name="phone" value={formData.phone} onChange={handleChange} />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label">Thành phố</label>
                                <select className="form-select" name="cityId" value={formData.cityId} onChange={handleChange} required>
                                    <option value="">Chọn thành phố...</option>
                                    {dummyCities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="form-label">Địa chỉ</label>
                            <input type="text" className="form-control" name="address" value={formData.address} onChange={handleChange} />
                        </div>

                        <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading}>
                             {isLoading ? 'Đang lưu...' : 'Cập nhật Thông tin'}
                        </button>
                    </form>
                </div>
            </div>
            
            {/* Component Modal Đổi Mật khẩu */}
            <ChangePasswordModal 
                isModalOpen={isPasswordModalOpen}
                closeModal={() => setIsPasswordModalOpen(false)}
                fetchApi={fetchApi}
            />
        </div>
    );
};

export default PatientProfiles;