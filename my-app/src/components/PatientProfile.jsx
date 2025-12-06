// src/components/PatientProfile.js
import React, { useState } from 'react';

// Giả định dữ liệu ban đầu của Bệnh nhân (thường load từ API)
const initialPatientData = {
    id: 1,
    fullName: 'Trần Thị B',
    email: 'thi.b@gmail.com',
    phone: '0908765432',
    address: '123 Đường ABC, Quận X',
    cityId: 2, // Hà Nội
    profilePicture: 'https://placehold.co/150x150?text=Avatar',
};

const dummyCities = [{ id: 1, name: 'Hồ Chí Minh' }, { id: 2, name: 'Hà Nội' }];

const PatientProfile = () => {
    const [formData, setFormData] = useState(initialPatientData);
    const [avatarFile, setAvatarFile] = useState(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatarFile(file);
            // Tạo URL tạm thời để preview ảnh
            setFormData({ ...formData, profilePicture: URL.createObjectURL(file) });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Cần 2 API call:
        // 1. Cập nhật bảng users (full_name, city_id)
        // 2. Cập nhật bảng patients (phone, address)
        
        if (avatarFile) {
            console.log("Đang tải lên Avatar mới:", avatarFile.name);
        }

        console.log("Đang cập nhật Profile Bệnh nhân:", formData);
        alert('Cập nhật thành công!');
    };

    return (
        <div className="container py-5">
            <h2 className="mb-4 text-primary">🧍 Trang Profile Bệnh Nhân</h2>
            
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
                                Đổi Avatar
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
                        <button className="btn btn-warning btn-sm">Đổi Mật khẩu</button>
                    </div>
                </div>

                {/* Cột 2: Form Cập Nhật */}
                <div className="col-md-8">
                    <form onSubmit={handleSubmit} className="card p-4 shadow-sm">
                        <h4 className="mb-3">Thông tin Cá nhân</h4>

                        {/* Thông tin Bảng USERS & PATIENTS */}
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
                                    {dummyCities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="form-label">Địa chỉ</label>
                            <input type="text" className="form-control" name="address" value={formData.address} onChange={handleChange} />
                        </div>

                        <button type="submit" className="btn btn-primary btn-lg">
                            Cập nhật Thông tin
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PatientProfile;