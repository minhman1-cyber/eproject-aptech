// src/components/DoctorProfile.js (Phiên bản đã sửa lỗi và cải tiến giao diện)
import React, { useState, useEffect } from 'react';

// Giả định dữ liệu ban đầu của Bác sĩ (thường load từ API)
const initialDoctorData = {
    id: 1,
    fullName: 'Nguyễn Văn A',
    email: 'van.a@mediconnect.com',
    phone: '0901234567',
    cityId: 1, // HCM
    // Các trường này sẽ được quản lý ở tab riêng
    // specializationId: 101, 
    qualification: 'MD, PhD',
    bio: 'Chuyên gia 10 năm kinh nghiệm trong lĩnh vực Tim mạch, đã điều trị thành công hàng ngàn ca bệnh phức tạp.',
    profilePicture: 'https://placehold.co/150x150/AFD1E4/FFFFFF/png?text=Bác+Sĩ', // URL hiện tại
};

// Dữ liệu giả định (Thực tế nên load từ API)
const dummyCities = [{ id: 1, name: 'Hồ Chí Minh' }, { id: 2, name: 'Hà Nội' }, { id: 3, name: 'Đà Nẵng' }];
const dummyAllSpecializations = [
    { id: 101, name: 'Tim mạch' },
    { id: 102, name: 'Nhi khoa' },
    { id: 103, name: 'Da liễu' },
    { id: 104, name: 'Phụ sản' },
    { id: 105, name: 'Tiêu hóa' },
    { id: 106, name: 'Mắt' }
];

// Chuyên khoa bác sĩ hiện có (thực tế lấy từ doctor_specializations)
const initialDoctorSpecializations = [101, 103]; // ID của các chuyên khoa mà bác sĩ này có

// Bằng cấp bác sĩ hiện có (thực tế lấy từ doctor_qualifications)
const initialQualifications = [
    { id: 1, title: 'Bác sĩ Đa khoa', institution: 'ĐH Y Dược TPHCM', year: 2010, document_url: '#', is_verified: 1 },
    { id: 2, title: 'Chuyên khoa I Tim mạch', institution: 'BV Chợ Rẫy', year: 2015, document_url: '#', is_verified: 0 },
    { id: 3, title: 'Thạc sĩ Y học', institution: 'ĐH Y Hà Nội', year: 2018, document_url: '#', is_verified: 1 }
];

const DoctorProfile = () => {
    const [activeTab, setActiveTab] = useState('personal');
    const [formData, setFormData] = useState(initialDoctorData);
    const [avatarFile, setAvatarFile] = useState(null);

    // State cho chuyên khoa, cần đồng bộ với dummyAllSpecializations
    const [selectedSpecializationIds, setSelectedSpecializationIds] = useState(initialDoctorSpecializations);
    const [allSpecializations, setAllSpecializations] = useState(
        dummyAllSpecializations.map(spec => ({
            ...spec,
            checked: initialDoctorSpecializations.includes(spec.id)
        }))
    );

    // State cho bằng cấp
    const [qualifications, setQualifications] = useState(initialQualifications);
    const [newQualification, setNewQualification] = useState({ title: '', institution: '', year: '', documentFile: null });

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

    const handleSpecializationToggle = (id) => {
        const updatedSpecializations = allSpecializations.map(spec => 
            spec.id === id ? { ...spec, checked: !spec.checked } : spec
        );
        setAllSpecializations(updatedSpecializations);
        setSelectedSpecializationIds(updatedSpecializations.filter(s => s.checked).map(s => s.id));
    };

    const handleNewQualificationChange = (e) => {
        if (e.target.name === 'documentFile') {
            setNewQualification({ ...newQualification, documentFile: e.target.files[0] });
        } else {
            setNewQualification({ ...newQualification, [e.target.name]: e.target.value });
        }
    };

    const handleAddQualification = (e) => {
        e.preventDefault();
        if (!newQualification.title || !newQualification.institution || !newQualification.year || !newQualification.documentFile) {
            alert('Vui lòng điền đủ thông tin bằng cấp và tải lên file.');
            return;
        }

        console.log("Đang tải lên bằng cấp mới:", newQualification);
        // THỰC TẾ:
        // 1. Tải newQualification.documentFile lên server, nhận về document_url
        // 2. Gửi request POST/PUT để thêm bằng cấp vào bảng doctor_qualifications
        
        const newRecord = { 
            id: Date.now(), // ID tạm thời
            title: newQualification.title,
            institution: newQualification.institution,
            year: parseInt(newQualification.year),
            document_url: URL.createObjectURL(newQualification.documentFile), // Preview URL
            is_verified: 0, // Mặc định là CHƯA XÁC MINH
        };
        setQualifications([...qualifications, newRecord]);
        setNewQualification({ title: '', institution: '', year: '', documentFile: null }); // Reset form
        alert('Bằng cấp đã được thêm. Vui lòng chờ ADMIN xác minh.');
    };

    const handleSubmitPersonal = (e) => {
        e.preventDefault();
        console.log("Cập nhật thông tin cá nhân:", formData);
        // API call để cập nhật bảng users và doctors (fullName, phone, cityId, bio)
        if (avatarFile) {
            console.log("Đang tải lên Avatar mới:", avatarFile.name);
            // API tải ảnh lên server, sau đó nhận lại URL mới và cập nhật vào DB
        }
        alert('Thông tin cá nhân đã được cập nhật!');
    };

    const handleSubmitSpecializations = (e) => {
        e.preventDefault();
        console.log("Cập nhật chuyên khoa:", selectedSpecializationIds);
        // API call để cập nhật bảng doctor_specializations
        alert('Chuyên khoa đã được cập nhật!');
    };

    return (
        <div className="container py-5">
            <h2 className="mb-4 text-success d-flex align-items-center">
                <i className="bi bi-person-badge-fill me-3"></i> Quản lý Profile Bác Sĩ
            </h2>
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
                                <i className="bi bi-hospital-fill me-2"></i> Chuyên khoa
                            </button>
                        </li>
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${activeTab === 'qualifications' ? 'active text-primary fw-bold' : 'text-muted'}`} 
                                onClick={() => setActiveTab('qualifications')}
                            >
                                <i className="bi bi-award-fill me-2"></i> Bằng cấp & Xác minh
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
                                            <input type="tel" className="form-control" id="phone" name="phone" value={formData.phone} onChange={handleChange} />
                                        </div>
                                        <div className="col-md-6">
                                            <label htmlFor="cityId" className="form-label fw-bold">Thành phố làm việc</label>
                                            <select className="form-select" id="cityId" name="cityId" value={formData.cityId} onChange={handleChange} required>
                                                {dummyCities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mb-4">
                                <label htmlFor="bio" className="form-label fw-bold">Tiểu sử ngắn (Bio)</label>
                                <textarea className="form-control" id="bio" name="bio" value={formData.bio} onChange={handleChange} rows="4" placeholder="Giới thiệu về bản thân, kinh nghiệm, chuyên môn..."></textarea>
                                <div className="form-text">Mô tả ngắn gọn về bạn, sẽ hiển thị công khai trên hồ sơ bác sĩ.</div>
                            </div>

                            <button type="submit" className="btn btn-primary btn-lg px-5">
                                <i className="bi bi-save-fill me-2"></i> Lưu Thông tin cá nhân
                            </button>
                        </form>
                    )}

                    {/* TAB CONTENT 2: SPECIALIZATIONS */}
                    {activeTab === 'specializations' && (
                        <form onSubmit={handleSubmitSpecializations}>
                            <h4 className="mb-4 text-primary">Chọn các Chuyên khoa bạn tham gia</h4>
                            <p className="text-muted mb-4">
                                <i className="bi bi-info-circle-fill me-2"></i> Thông tin này sẽ được công khai và dùng để lọc tìm kiếm bác sĩ. Vui lòng chọn chính xác các chuyên khoa mà bạn có đủ điều kiện hành nghề.
                            </p>
                            <div className="row row-cols-1 row-cols-md-3 g-3">
                                {allSpecializations.map(spec => (
                                    <div className="col" key={spec.id}>
                                        <div className="form-check form-check-inline form-control-lg border rounded p-3 bg-light">
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
                            <button type="submit" className="btn btn-primary btn-lg mt-4 px-5">
                                <i className="bi bi-save-fill me-2"></i> Lưu Chuyên khoa
                            </button>
                        </form>
                    )}

                    {/* TAB CONTENT 3: QUALIFICATIONS & VERIFICATION */}
                    {activeTab === 'qualifications' && (
                        <div>
                            <h4 className="mb-4 text-primary">Bằng cấp & Trình độ chuyên môn</h4>
                            <p className="text-muted mb-4">
                                <i className="bi bi-exclamation-triangle-fill me-2"></i> Để tăng độ tin cậy, vui lòng tải lên bản scan (PDF/ảnh) của các bằng cấp. Bằng cấp ĐÃ XÁC MINH sẽ hiển thị huy hiệu xác thực trên Profile công khai của bạn.
                            </p>
                            
                            <h5 className="mb-3 text-dark">Các bằng cấp hiện có</h5>
                            {qualifications.length > 0 ? (
                                <div className="table-responsive">
                                    <table className="table table-hover table-bordered align-middle">
                                        <thead className="table-light">
                                            <tr>
                                                <th>#</th>
                                                <th>Bằng cấp</th>
                                                <th>Tổ chức cấp</th>
                                                <th>Năm</th>
                                                <th>Trạng thái xác minh</th>
                                                <th>Hành động</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {qualifications.map((q, index) => (
                                                <tr key={q.id}>
                                                    <td>{index + 1}</td>
                                                    <td>{q.title}</td>
                                                    <td>{q.institution}</td>
                                                    <td>{q.year}</td>
                                                    <td>
                                                        {q.is_verified 
                                                            ? <span className="badge bg-success-subtle text-success border border-success-subtle"><i className="bi bi-check-circle-fill me-1"></i> Đã xác minh</span> 
                                                            : <span className="badge bg-warning-subtle text-warning border border-warning-subtle"><i className="bi bi-hourglass-split me-1"></i> Chờ xác minh</span>
                                                        }
                                                    </td>
                                                    <td>
                                                        <a href={q.document_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-info me-2">
                                                            <i className="bi bi-file-earmark-text-fill me-1"></i> Xem File
                                                        </a>
                                                        {/* Thêm nút Xóa bằng cấp nếu cần */}
                                                        <button className="btn btn-sm btn-outline-danger">
                                                            <i className="bi bi-trash-fill"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="alert alert-info" role="alert">
                                    Bạn chưa có bằng cấp nào được thêm. Hãy thêm bằng cấp của bạn bên dưới!
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
                                    <div className="form-text">Chỉ chấp nhận file PDF hoặc hình ảnh (JPG, PNG). Dung lượng tối đa 5MB.</div>
                                </div>
                                <button type="submit" className="btn btn-primary px-5">
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

export default DoctorProfile;