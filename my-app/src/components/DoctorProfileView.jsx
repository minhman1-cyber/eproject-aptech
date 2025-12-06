import React, { useState, useEffect, useCallback } from 'react';

// URL API Backend (Sửa port 8888 nếu cần)
const API_QUALIFICATIONS_URL = 'http://localhost:8888/api/v1/controllers/doctor_qualifications_get.php';


// =======================================================
// COMPONENT: THÔNG TIN PROFILE BÁC SĨ 
// =======================================================

const DoctorProfileView = ({ doctor, allCities, allSpecializations, fetchApi }) => {
    
    const [qualifications, setQualifications] = useState([]);
    const [isLoadingQuals, setIsLoadingQuals] = useState(false);
    const [qualsError, setQualsError] = useState(null);

    // Effect để tải bằng cấp khi doctor thay đổi
    useEffect(() => {
        const fetchQualifications = async () => {
            // Đảm bảo doctor_id là số nguyên hợp lệ trước khi fetch
            if (!doctor?.doctor_id || typeof doctor.doctor_id !== 'number' || doctor.doctor_id <= 0) return;
            console.log("hello");
            setIsLoadingQuals(true);
            setQualsError(null);

            try {
                // Sử dụng hàm fetchApi đã được truyền vào
                const data = await fetchApi(`${API_QUALIFICATIONS_URL}?doctor_id=${doctor.doctor_id}`, { method: 'GET' });
                
                // Dữ liệu trả về: { data: { qualifications: [...] } }
                setQualifications(data.data.qualifications || []);
                
            } catch (err) {
                setQualsError('Lỗi tải bằng cấp: ' + err.message);
                setQualifications([]);
            } finally {
                setIsLoadingQuals(false);
            }
        };

        fetchQualifications();
    }, [doctor?.doctor_id, fetchApi]); // Chạy lại khi doctor_id thay đổi

    
    // Đảm bảo doctor object tồn tại
    if (!doctor) return <div className="alert alert-danger">Không thể tải thông tin Bác sĩ.</div>;
    
    // Lấy tên các chuyên khoa
    const specNames = doctor.specializationIds 
        ? doctor.specializationIds.map(id => allSpecializations.find(s => s.id === id)?.name).filter(Boolean).join(', ')
        : 'N/A';
        
    // Lấy tên thành phố
    const cityName = allCities.find(c => c.id === doctor.cityId)?.name;


    return (
        <div className="card mb-4 shadow-sm border-info">
            <div className="card-body">
                <div className="row">
                    <div className="col-md-3 text-center">
                        <img 
                            src={doctor.profile_picture || 'https://placehold.co/100x100/3498db/ffffff?text=BS'} 
                            alt={doctor.full_name} 
                            className="rounded-circle mb-3"
                            style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                        />
                        {/* Dùng một badge đơn giản để đánh dấu vai trò */}
                        <span className="badge bg-primary">Chuyên gia</span> 
                    </div>
                    <div className="col-md-9">
                        <h4 className="card-title text-info">{doctor.full_name}</h4>
                        <p className="mb-1"><strong>Chuyên khoa:</strong> {specNames}</p>
                        <p className="mb-1"><strong>Thành phố:</strong> {cityName || 'N/A'}</p>
                        <p className="mb-1"><strong>Bằng cấp tóm tắt:</strong> {doctor.qualification || 'Chưa cập nhật'}</p>
                    </div>
                </div>
                <hr />
                <h6 className="mt-3">Tiểu sử (Bio)</h6>
                <p className="small text-muted">{doctor.bio || 'Không có tiểu sử chi tiết.'}</p>

                {/* BẢNG BẰNG CẤP ĐÃ XÁC MINH (MỚI) */}
                <h6 className="mt-4 text-info">Bằng cấp & Chứng chỉ Đã Xác minh ({qualifications.length})</h6>
                {qualsError && <div className="alert alert-danger p-2 small">{qualsError}</div>}
                
                {isLoadingQuals ? (
                    <div className="text-center small text-muted">Đang tải bằng cấp...</div>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-sm table-borderless small">
                            <thead>
                                <tr>
                                    <th>Bằng cấp</th>
                                    <th>Tổ chức</th>
                                    <th>Năm</th>
                                </tr>
                            </thead>
                            <tbody>
                                {qualifications.length === 0 ? (
                                    <tr><td colSpan="3" className="text-muted">Không có bằng cấp nào được xác minh.</td></tr>
                                ) : (
                                    qualifications.map((q, index) => (
                                        <tr key={index}>
                                            <td>{q.title}</td>
                                            <td>{q.institution}</td>
                                            <td>{q.year}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

            </div>
        </div>
    );
};

export default DoctorProfileView;