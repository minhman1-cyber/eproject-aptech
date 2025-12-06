import React, { useState, useEffect, useCallback, useMemo } from 'react';

// URL API Backend
const API_BASE_URL = 'http://localhost:8888/api/v1/controllers/';
const API_ARTICLE_CRUD_URL = API_BASE_URL + 'admin_article_crud.php';

// Cấu hình phân trang
const ITEMS_PER_PAGE = 10;

// Các giá trị mặc định cho form
const initialArticleForm = {
    id: null,
    title: '',
    content: '',
    category: 'NEWS', // Mặc định là NEWS
    is_active: 1, // Giả định trường này cho ẩn/hiện (Nếu không có trong DB, sẽ bỏ qua)
};

const CATEGORIES = [
    { value: 'NEWS', label: 'Tin tức Y tế' },
    { value: 'DISEASE', label: 'Bệnh lý' },
    { value: 'PREVENTION', label: 'Phòng bệnh' },
    { value: 'CURE', label: 'Cách chữa' },
];

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
// COMPONENT PHỤ: 1. MODAL THÊM/SỬA BÀI VIẾT
// =======================================================

const ArticleFormModal = ({ article, mode, isModalOpen, closeModal, refreshList, fetchApi }) => {
    const isEditing = mode === 'edit';
    const [formData, setFormData] = useState(initialArticleForm);
    const [localError, setLocalError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Ánh xạ dữ liệu khi mở chế độ sửa
    useEffect(() => {
        if (isModalOpen) {
            setLocalError('');
            if (isEditing && article) {
                setFormData(article); // Sử dụng dữ liệu article được truyền vào
            } else {
                setFormData(initialArticleForm);
            }
        }
    }, [isModalOpen, isEditing, article]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');
        setIsLoading(true);

        if (!formData.title || !formData.content || !formData.category) {
            setLocalError('Vui lòng điền đầy đủ Tiêu đề, Nội dung và Thể loại.');
            setIsLoading(false);
            return;
        }

        const payload = {
            id: isEditing ? formData.id : undefined,
            title: formData.title,
            content: formData.content,
            category: formData.category,
            // created_by sẽ được lấy từ Session (Doctor ID) ở Backend
        };
        
        const method = isEditing ? 'PUT' : 'POST';

        try {
            await fetchApi(API_ARTICLE_CRUD_URL, {
                method: method,
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
            });

            window.alert(`Bài viết đã được ${isEditing ? 'cập nhật' : 'đăng tải'} thành công.`);
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
                        <h5 className="modal-title">{isEditing ? `Sửa Bài viết ID: ${formData.id}` : 'Đăng Bài viết Mới'}</h5>
                        <button type="button" className="btn-close btn-close-white" onClick={closeModal} disabled={isLoading}></button>
                    </div>
                    <div className="modal-body">
                        {localError && (<div className="alert alert-danger" role="alert">{localError}</div>)}

                        <form onSubmit={handleSubmit}>
                            <div className="row">
                                <div className="col-md-9 mb-3">
                                    <label className="form-label">Tiêu đề (*)</label>
                                    <input type="text" className="form-control" name="title" value={formData.title} onChange={handleChange} required />
                                </div>
                                <div className="col-md-3 mb-3">
                                    <label className="form-label">Thể loại (*)</label>
                                    <select className="form-select" name="category" value={formData.category} onChange={handleChange} required>
                                        {CATEGORIES.map(cat => (
                                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            
                            <div className="mb-3">
                                <label className="form-label">Nội dung (*)</label>
                                <textarea 
                                    className="form-control" 
                                    name="content" 
                                    value={formData.content} 
                                    onChange={handleChange} 
                                    rows="10" 
                                    required 
                                />
                            </div>

                            <button type="submit" className="btn btn-primary w-100 mt-4" disabled={isLoading}>
                                {isLoading ? 'Đang xử lý...' : isEditing ? 'Lưu Bài viết' : 'Đăng Bài viết'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};


// =======================================================
// COMPONENT 2: QUẢN LÝ CHÍNH (ADMINARTICLEMANAGER)
// =======================================================

const AdminArticleManager = () => {
    const [articles, setArticles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingArticle, setEditingArticle] = useState(null); 

    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('ALL'); 

    const fetchApi = useFetchApi();
    const ITEMS_PER_PAGE = 10; // Giữ lại hằng số này

    // ------------------- TẢI DỮ LIỆU CHÍNH -------------------
    const fetchArticles = useCallback(async () => {
        setError(null);
        setIsLoading(true);
        try {
            // Giả định API GET trả về: { data: { articles: [...] } }
            const data = await fetchApi(API_ARTICLE_CRUD_URL, { method: 'GET' });
            
            // Dữ liệu từ DB đã bao gồm author_name
            setArticles(data.data.articles || []);

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [fetchApi]);

    useEffect(() => {
        fetchArticles();
    }, [fetchArticles]);


    // ------------------- LOGIC TÌM KIẾM & LỌC -------------------
    const filteredArticles = useMemo(() => {
        let result = articles;

        // Lọc theo Thể loại
        if (filterCategory !== 'ALL') {
            result = result.filter(a => a.category === filterCategory);
        }

        // Tìm kiếm theo Tiêu đề/ID
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(a => 
                a.title.toLowerCase().includes(term) || String(a.id) === term
            );
        }
        return result;
    }, [articles, filterCategory, searchTerm]);

    const totalPages = Math.ceil(filteredArticles.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentArticles = filteredArticles.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handleSearch = (e) => {
        e.preventDefault();
        setCurrentPage(1); 
    };
    
    // ------------------- LOGIC HÀNH ĐỘNG -------------------

    // 1. Mở Modal Sửa
    const openEditModal = (article) => {
        setEditingArticle(article);
    };
    
    // 2. Xóa Bài viết
    const handleDeleteArticle = useCallback(async (id, title) => {
        if (!window.confirm(`Bạn có chắc chắn muốn XÓA vĩnh viễn bài viết "${title}" không?`)) {
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            await fetchApi(API_ARTICLE_CRUD_URL, {
                method: 'DELETE',
                body: JSON.stringify({ id }),
                headers: { 'Content-Type': 'application/json' },
            });

            setSuccessMessage(`Đã xóa bài viết "${title}" thành công.`);
            fetchArticles(); 

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [fetchApi, fetchArticles]);


    // ------------------- RENDER -------------------
    return (
        <div className="container py-5">
            <h2 className="mb-4 text-primary">📰 Quản lý Nội dung Y tế (Admin)</h2>

            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            {successMessage && <div className="alert alert-success" role="alert">{successMessage}</div>}

            <div className="card shadow-sm p-4">
                
                {/* THANH LỌC & TÌM KIẾM */}
                <div className="d-flex flex-wrap justify-content-between align-items-center mb-4">
                    
                    <form onSubmit={handleSearch} className="d-flex flex-grow-1 me-3">
                        {/* Lọc Thể loại */}
                        <select 
                            className="form-select me-2" 
                            style={{ width: '150px' }}
                            value={filterCategory}
                            onChange={(e) => {setFilterCategory(e.target.value); setCurrentPage(1);}}
                        >
                            <option value="ALL">Tất cả Thể loại</option>
                            {CATEGORIES.map(cat => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                        </select>

                        {/* Input Tìm kiếm */}
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Tìm kiếm theo Tiêu đề hoặc ID"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button type="submit" className="btn btn-outline-primary ms-2">
                            <i className="bi bi-search">Search</i>
                        </button>
                    </form>
                    
                    {/* Nút Thêm mới */}
                    <button 
                        className="btn btn-success" 
                        onClick={() => setIsAddModalOpen(true)}
                        disabled={isLoading}
                    >
                        <i className="bi bi-plus-lg"></i> Đăng bài mới
                    </button>
                </div>

                {/* Bảng Danh sách Bài viết */}
                <div className="table-responsive">
                    <table className="table table-hover align-middle">
                        <thead className="table-light">
                            <tr>
                                <th>ID</th>
                                <th>Tiêu đề</th>
                                <th>Thể loại</th>
                                <th>Tác giả</th>
                                <th>Ngày đăng</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-4 text-muted">Đang tải dữ liệu...</td>
                                </tr>
                            ) : currentArticles.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-4 text-muted">Không tìm thấy bài viết nào.</td>
                                </tr>
                            ) : (
                                currentArticles.map(article => (
                                    <tr key={article.id}>
                                        <td>{article.id}</td>
                                        <td>{article.title}</td>
                                        <td>
                                            <span className="badge bg-secondary">{CATEGORIES.find(c => c.value === article.category)?.label || article.category}</span>
                                        </td>
                                        <td>{article.author_name}</td>
                                        <td>{new Date(article.created_at).toLocaleDateString()}</td>
                                        <td className='text-nowrap'>
                                            <button 
                                                className="btn btn-sm btn-outline-primary me-2"
                                                onClick={() => openEditModal(article)}
                                            >
                                                Sửa
                                            </button>
                                            <button 
                                                className={`btn btn-sm btn-danger`}
                                                onClick={() => handleDeleteArticle(article.id, article.title)}
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
                            {/* Logic phân trang */}
                        </ul>
                    </nav>
                )}
            </div>
            
            {/* Modal Thêm */}
            <ArticleFormModal 
                article={null}
                mode={'add'}
                isModalOpen={isAddModalOpen}
                closeModal={() => setIsAddModalOpen(false)}
                refreshList={fetchArticles}
                fetchApi={fetchApi}
            />
            
            {/* Modal Sửa */}
            <ArticleFormModal 
                article={editingArticle}
                mode={'edit'}
                isModalOpen={!!editingArticle}
                closeModal={() => setEditingArticle(null)}
                refreshList={fetchArticles}
                fetchApi={fetchApi}
            />
        </div>
    );
};

export default AdminArticleManager;