import React, { useState, useEffect, useCallback, useMemo } from 'react';

// URL API Backend (Sử dụng API chung cho CRUD)
const API_BASE_URL = 'http://localhost:8888/api/v1/controllers/';
const API_CITY_CRUD_URL = API_BASE_URL + 'admin_city_crud.php';

// Cấu hình phân trang
const ITEMS_PER_PAGE = 10;

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
// COMPONENT PHỤ: 1. MODAL THÊM/SỬA THÀNH PHỐ
// =======================================================

const CityFormModal = ({ city, mode, isModalOpen, closeModal, refreshList, fetchApi }) => {
    const isEditing = mode === 'edit';
    const [cityName, setCityName] = useState(isEditing ? city?.name || '' : '');
    const [localError, setLocalError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Reset state khi mở/đóng modal
    useEffect(() => {
        if (isModalOpen) {
            setCityName(isEditing ? city?.name || '' : '');
            setLocalError('');
        }
    }, [isModalOpen, isEditing, city]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');
        setIsLoading(true);

        if (!cityName.trim()) {
            setLocalError('Tên thành phố không được để trống.');
            setIsLoading(false);
            return;
        }

        const payload = {
            id: isEditing ? city.id : undefined,
            name: cityName.trim(),
        };
        
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const data = await fetchApi(API_CITY_CRUD_URL, {
                method: method,
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
            });

            window.alert(data.message || `Đã ${isEditing ? 'cập nhật' : 'thêm'} thành phố thành công.`);
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
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header bg-primary text-white">
                        <h5 className="modal-title">{isEditing ? `Sửa Thành phố ID: ${city.id}` : 'Thêm Thành phố Mới'}</h5>
                        <button type="button" className="btn-close btn-close-white" onClick={closeModal} disabled={isLoading}></button>
                    </div>
                    <div className="modal-body">
                        {localError && (<div className="alert alert-danger" role="alert">{localError}</div>)}

                        <form onSubmit={handleSubmit}>
                            <div className="mb-3">
                                <label className="form-label">Tên Thành phố (*)</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    name="cityName" 
                                    value={cityName} 
                                    onChange={(e) => setCityName(e.target.value)} 
                                    required 
                                />
                            </div>

                            <button type="submit" className="btn btn-primary w-100 mt-4" disabled={isLoading}>
                                {isLoading ? 'Đang xử lý...' : isEditing ? 'Lưu Thay Đổi' : 'Thêm Thành phố'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};


// =======================================================
// COMPONENT 2: QUẢN LÝ CHÍNH (ADMINCITYMANAGER)
// =======================================================

const AdminCityManager = () => {
    const [cities, setCities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingCity, setEditingCity] = useState(null); 
    const [deletingCityId, setDeletingCityId] = useState(null); // ID thành phố đang xóa

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const fetchApi = useFetchApi();

    // ------------------- TẢI DỮ LIỆU CHÍNH -------------------
    const fetchCities = useCallback(async () => {
        setError(null);
        setIsLoading(true);
        try {
            // API GET trả về: { data: { cities: [...] } }
            const data = await fetchApi(API_CITY_CRUD_URL, { method: 'GET' });
            
            setCities(data.data.cities || []);

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [fetchApi]);

    useEffect(() => {
        fetchCities();
    }, [fetchCities]);

    // ------------------- LOGIC TÌM KIẾM & PHÂN TRANG -------------------
    const filteredCities = useMemo(() => {
        if (!searchTerm) return cities;
        const term = searchTerm.toLowerCase();
        
        return cities.filter(city => 
            city.name.toLowerCase().includes(term) || String(city.id) === term
        );
    }, [cities, searchTerm]);

    const totalPages = Math.ceil(filteredCities.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentCities = filteredCities.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handleSearch = (e) => {
        e.preventDefault();
        setCurrentPage(1); 
    };

    const handlePageChange = (page) => {
        if (page > 0 && page <= totalPages) {
            setCurrentPage(page);
        }
    };


    // ------------------- LOGIC HÀNH ĐỘNG -------------------
    
    // 1. Mở modal Sửa
    const handleEditCity = (city) => {
        setEditingCity(city);
    };

    // 2. Xóa Thành phố
    const handleDeleteCity = useCallback(async (cityId, cityName) => {
        if (!window.confirm(`Bạn có chắc chắn muốn XÓA thành phố "${cityName}" (ID: ${cityId}) không? Thao tác này KHÔNG THỂ hoàn tác.`)) {
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // API DELETE: Gửi ID qua body hoặc query param
            await fetchApi(API_CITY_CRUD_URL, {
                method: 'DELETE',
                body: JSON.stringify({ id: cityId }),
                headers: { 'Content-Type': 'application/json' },
            });

            setSuccessMessage(`Đã xóa thành phố "${cityName}" thành công.`);
            fetchCities(); 

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }

    }, [fetchApi, fetchCities]);


    // ------------------- RENDER -------------------
    return (
        <div className="container py-5">

            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            {successMessage && <div className="alert alert-success" role="alert">{successMessage}</div>}

            <div className="card shadow-sm p-4">
                
                {/* THANH TÌM KIẾM & THÊM MỚI */}
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <form onSubmit={handleSearch} className="d-flex">
                        <input
                            type="text"
                            className="form-control me-2"
                            placeholder="Tìm kiếm theo Tên hoặc ID Thành phố"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '300px' }}
                        />
                        <button type="submit" className="btn btn-outline-primary">
                            <i className="bi bi-search">Tìm kiếm thành phố</i>
                        </button>
                    </form>
                    
                    <button 
                        className="btn btn-success" 
                        onClick={() => setIsAddModalOpen(true)}
                        disabled={isLoading}
                    >
                        <i className="bi bi-plus-lg"></i> Thêm Thành phố
                    </button>
                </div>

                {/* Bảng Danh sách Thành phố */}
                <div className="table-responsive">
                    <table className="table table-striped align-middle">
                        <thead className="table-light">
                            <tr>
                                <th>ID</th>
                                <th>Tên Thành phố</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="3" className="text-center py-4 text-muted">Đang tải dữ liệu...</td>
                                </tr>
                            ) : filteredCities.length === 0 ? (
                                <tr>
                                    <td colSpan="3" className="text-center py-4 text-muted">Không tìm thấy thành phố nào.</td>
                                </tr>
                            ) : (
                                currentCities.map(city => (
                                    <tr key={city.id}>
                                        <td>{city.id}</td>
                                        <td>{city.name}</td>
                                        <td className='text-nowrap'>
                                            <button 
                                                className="btn btn-sm btn-outline-primary me-2"
                                                onClick={() => handleEditCity(city)}
                                            >
                                                Sửa
                                            </button>
                                            <button 
                                                className={`btn btn-sm btn-danger`}
                                                onClick={() => handleDeleteCity(city.id, city.name)}
                                            >
                                                Xóa
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Phân trang */}
                {totalPages > 1 && (
                    <nav className="mt-4 d-flex justify-content-center">
                        <ul className="pagination">
                            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                <button className="page-link" onClick={() => handlePageChange(currentPage - 1)}>Trước</button>
                            </li>
                            {[...Array(totalPages)].map((_, index) => (
                                <li key={index} className={`page-item ${currentPage === index + 1 ? 'active' : ''}`}>
                                    <button className="page-link" onClick={() => handlePageChange(index + 1)}>
                                        {index + 1}
                                    </button>
                                </li>
                            ))}
                            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                <button className="page-link" onClick={() => handlePageChange(currentPage + 1)}>Sau</button>
                            </li>
                        </ul>
                    </nav>
                )}
            </div>
            
            {/* Modal Thêm */}
            <CityFormModal 
                city={null}
                mode={'add'}
                isModalOpen={isAddModalOpen}
                closeModal={() => setIsAddModalOpen(false)}
                refreshList={fetchCities}
                fetchApi={fetchApi}
            />
            
            {/* Modal Sửa */}
            <CityFormModal 
                city={editingCity}
                mode={'edit'}
                isModalOpen={!!editingCity}
                closeModal={() => setEditingCity(null)}
                refreshList={fetchCities}
                fetchApi={fetchApi}
            />
        </div>
    );
};

export default AdminCityManager;