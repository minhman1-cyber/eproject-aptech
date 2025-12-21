import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom'; // Giả sử bạn dùng react-router-dom

// URL API Backend
const API_BASE_URL = 'http://localhost:8888/api/v1/controllers/';
const API_QUAL_VERIFICATION_URL = API_BASE_URL + 'admin_qual_verification.php';

// Cấu hình phân trang mặc định
const DEFAULT_ITEMS_PER_PAGE = 10;

// =======================================================
// HÀM FETCH API CHUNG
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

// =======================================================
// COMPONENT CHÍNH
// =======================================================

const AdminQualificationManager = ({ isWidget = false }) => {
    const [qualifications, setQualifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const fetchApi = useFetchApi();
    
    // Nếu là widget, chỉ lấy 5 item và không phân trang phức tạp
    const ITEMS_PER_PAGE = isWidget ? 5 : DEFAULT_ITEMS_PER_PAGE;

    // ------------------- TẢI DỮ LIỆU -------------------
    const fetchQualifications = useCallback(async () => {
        setError(null);
        setIsLoading(true);
        try {
            const searchUrl = searchTerm 
                ? `${API_QUAL_VERIFICATION_URL}?search=${encodeURIComponent(searchTerm)}` 
                : API_QUAL_VERIFICATION_URL;
                
            const data = await fetchApi(searchUrl, { method: 'GET' });
            setQualifications(data.data.qualifications || []);

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [fetchApi, searchTerm]);

    useEffect(() => {
        fetchQualifications();
    }, [fetchQualifications]);

    // ------------------- LOGIC HIỂN THỊ -------------------
    const totalPages = Math.ceil(qualifications.length / ITEMS_PER_PAGE);
    
    // Nếu là widget, luôn hiển thị trang 1
    const displayPage = isWidget ? 1 : currentPage;
    const startIndex = (displayPage - 1) * ITEMS_PER_PAGE;
    const currentQualifications = qualifications.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setCurrentPage(1); 
        fetchQualifications();
    };

    const handlePageChange = (page) => {
        if (page > 0 && page <= totalPages) {
            setCurrentPage(page);
        }
    };
    
    // ------------------- LOGIC DUYỆT -------------------
    const handleVerification = useCallback(async (qualId, status) => {
        const statusText = status === 1 ? 'DUYỆT' : 'TỪ CHỐI';
        const statusValue = status === 1 ? 1 : -1;
        
        if (!window.confirm(`Xác nhận ${statusText} Bằng cấp ID: ${qualId}?`)) {
            return;
        }

        setIsLoading(true);
        setSuccessMessage(null); // Reset message local nếu cần

        try {
            const payload = { id: qualId, status: statusValue };
            const data = await fetchApi(API_QUAL_VERIFICATION_URL, {
                method: 'PUT',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
            });

            // Nếu là widget, ta có thể hiển thị alert nhỏ hoặc cập nhật state cha
            if (!isWidget) {
                setSuccessMessage(data.message || `Đã ${statusText} bằng cấp thành công.`);
            } else {
                // Widget thì refresh luôn cho nhanh
                fetchQualifications();
            }

            if (!isWidget) fetchQualifications();

        } catch (err) {
            if (!isWidget) setError(err.message);
            else alert(`Lỗi: ${err.message}`); // Widget dùng alert cho gọn
        } finally {
            setIsLoading(false);
        }
    }, [fetchApi, fetchQualifications, isWidget]);

    // ------------------- RENDER -------------------
    
    // Giao diện Widget rút gọn
    if (isWidget) {
        return (
            <div className="card h-100 shadow-sm border-0">
                <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
                    <h5 className="mb-0 text-primary fw-bold">
                        <i className="bi bi-mortarboard-fill me-2"></i>Duyệt Bằng Cấp Mới
                    </h5>
                    {/* Link tới trang quản lý đầy đủ */}
                    <Link to="/admin/qualifications" className="btn btn-sm btn-outline-primary rounded-pill">
                        Xem tất cả <i className="bi bi-arrow-right"></i>
                    </Link>
                </div>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover mb-0 align-middle">
                            <thead className="table-light text-secondary">
                                <tr>
                                    <th className="ps-4">Bác sĩ</th>
                                    <th>Bằng cấp</th>
                                    <th className="text-end pe-4">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr><td colSpan="3" className="text-center py-3">Đang tải...</td></tr>
                                ) : currentQualifications.length === 0 ? (
                                    <tr><td colSpan="3" className="text-center py-3 text-muted">Không có yêu cầu nào.</td></tr>
                                ) : (
                                    currentQualifications.map(qual => (
                                        <tr key={qual.qual_id}>
                                            <td className="ps-4">
                                                <div className="fw-bold text-dark">{qual.doctor_name}</div>
                                                <small className="text-muted" style={{fontSize: '0.8rem'}}>{qual.email}</small>
                                            </td>
                                            <td>
                                                <div className="text-primary">{qual.title}</div>
                                                <a href={qual.document_url} target="_blank" rel="noreferrer" className="text-decoration-none small text-info">
                                                    <i className="bi bi-paperclip"></i> Xem file
                                                </a>
                                            </td>
                                            <td className="text-end pe-4">
                                                <button onClick={() => handleVerification(qual.qual_id, 1)} className="btn btn-sm btn-success me-1" title="Duyệt">
                                                    <i className="bi bi-check-lg">✔</i>
                                                </button>
                                                <button onClick={() => handleVerification(qual.qual_id, -1)} className="btn btn-sm btn-outline-danger" title="Từ chối">
                                                    <i className="bi bi-x-lg">X</i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    // Giao diện Đầy đủ (Giữ nguyên logic của bạn nhưng bọc trong div thay vì container nếu muốn flexible hơn)
    return (
        <div className="container-fluid py-4">

            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            {successMessage && <div className="alert alert-success" role="alert">{successMessage}</div>}

            <div className="card shadow-sm p-4">
                <form onSubmit={handleSearchSubmit} className="d-flex flex-grow-1 mb-4">
                    <input
                        type="text"
                        className="form-control me-2"
                        placeholder="Tìm kiếm theo Tên Bác sĩ / Email"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary">
                        <i className="bi bi-search"></i> Tìm
                    </button>
                </form>

                <div className="table-responsive">
                    <table className="table table-hover align-middle">
                        <thead className="table-light">
                            <tr>
                                <th>ID</th>
                                <th>Bác sĩ</th>
                                <th>Email</th>
                                <th>Tên Bằng cấp</th>
                                <th>Tổ chức / Năm</th>
                                <th>File</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan="7" className="text-center py-4">Đang tải dữ liệu...</td></tr>
                            ) : currentQualifications.length === 0 ? (
                                <tr><td colSpan="7" className="text-center py-4 text-muted">Không có dữ liệu.</td></tr>
                            ) : (
                                currentQualifications.map(qual => (
                                    <tr key={qual.qual_id}>
                                        <td>{qual.qual_id}</td>
                                        <td>
                                            <div className="fw-bold">{qual.doctor_name}</div>
                                            <small className="text-muted">ID: {qual.doctor_id}</small>
                                        </td>
                                        <td>{qual.email}</td>
                                        <td>{qual.title}</td>
                                        <td>{qual.institution} ({qual.year_completed})</td>
                                        <td>
                                            <a href={qual.document_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-info">
                                                <i className="bi bi-download"></i> Xem
                                            </a>
                                        </td>
                                        <td>
                                            <button className="btn btn-sm btn-success me-2" onClick={() => handleVerification(qual.qual_id, 1)}>
                                                Duyệt
                                            </button>
                                            <button className="btn btn-sm btn-danger" onClick={() => handleVerification(qual.qual_id, -1)}>
                                                Từ chối
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <nav className="mt-4 d-flex justify-content-center">
                        <ul className="pagination">
                            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                <button className="page-link" onClick={() => handlePageChange(currentPage - 1)}>Trước</button>
                            </li>
                            {[...Array(totalPages)].map((_, index) => (
                                <li key={index} className={`page-item ${currentPage === index + 1 ? 'active' : ''}`}>
                                    <button className="page-link" onClick={() => handlePageChange(index + 1)}>{index + 1}</button>
                                </li>
                            ))}
                            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                <button className="page-link" onClick={() => handlePageChange(currentPage + 1)}>Sau</button>
                            </li>
                        </ul>
                    </nav>
                )}
            </div>
        </div>
    );
};

export default AdminQualificationManager;