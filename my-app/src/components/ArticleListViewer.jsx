import React, { useState, useEffect, useCallback, useMemo } from 'react';

// URL API Backend
const API_PUBLIC_ARTICLES_URL = 'http://localhost:8888/api/v1/controllers/public_article_list.php'; 

const ITEMS_PER_PAGE = 8; // Cấu hình phân trang

// Hàm gọi API FETCH chung
const useFetchApi = () => {
    return useCallback(async (url, options = {}) => {
        const response = await fetch(url, {
            ...options,
            credentials: 'include',
            headers: options.headers || {},
        });

        if (response.status === 401) {
            throw new Error("Vui lòng đăng nhập lại để xem nội dung.");
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
            throw new Error('Tải dữ liệu thất bại (Lỗi Server).');
        }
        return {};
    }, []);
};


// =======================================================
// COMPONENT PHỤ: MODAL XEM CHI TIẾT BÀI VIẾT
// =======================================================
const ArticleDetailModal = ({ article, isModalOpen, closeModal }) => {
    if (!isModalOpen || !article) return null;

    // Hàm tiện ích để hiển thị đúng nhãn Category
    const getCategoryLabel = (value) => {
        const categories = [
            { value: 'NEWS', label: 'Tin tức Y tế' },
            { value: 'DISEASE', label: 'Bệnh lý' },
            { value: 'PREVENTION', label: 'Phòng bệnh' },
            { value: 'CURE', label: 'Cách chữa' },
        ];
        return categories.find(c => c.value === value)?.label || value;
    };

    return (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
            <div className="modal-dialog modal-xl">
                <div className="modal-content">
                    <div className="modal-header bg-secondary text-white">
                        <h5 className="modal-title">{article.title}</h5>
                        <button type="button" className="btn-close btn-close-white" onClick={closeModal}></button>
                    </div>
                    <div className="modal-body">
                        <div className="mb-3 d-flex justify-content-between align-items-center">
                            <span className="badge bg-primary me-2">{getCategoryLabel(article.category)}</span>
                            <small className="text-muted">Đăng bởi: {article.author_name} | Ngày: {new Date(article.created_at).toLocaleDateString()}</small>
                        </div>
                        <hr />
                        {/* Hiển thị nội dung (Tận dụng div để trình duyệt xử lý nội dung TEXT) */}
                        <div className="mt-3" style={{ whiteSpace: 'pre-wrap' }}>
                             {article.content}
                        </div>
                        
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={closeModal}>Đóng</button>
                    </div>
                </div>
            </div>
        </div>
    );
};


// =======================================================
// COMPONENT CHÍNH: DANH SÁCH BÀI VIẾT
// =======================================================
const ArticleListViewer = () => {
    const [articles, setArticles] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('ALL'); 
    const [currentPage, setCurrentPage] = useState(1);
    
    const [viewingArticle, setViewingArticle] = useState(null); // Bài viết đang được xem chi tiết

    const fetchApi = useFetchApi();

    // ------------------- TẢI DỮ LIỆU BÀI VIẾT -------------------
    const fetchArticles = useCallback(async () => {
        setError(null);
        setIsLoading(true);
        try {
            const data = await fetchApi(API_PUBLIC_ARTICLES_URL, { method: 'GET' });
            
            setArticles(data.data.articles || []);
            setCategories(data.data.categories || []);

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [fetchApi]);

    useEffect(() => {
        fetchArticles();
    }, [fetchArticles]);


    // ------------------- LOGIC LỌC & PHÂN TRANG -------------------
    const filteredArticles = useMemo(() => {
        let result = articles;

        // Lọc theo Thể loại
        if (filterCategory !== 'ALL') {
            result = result.filter(a => a.category === filterCategory);
        }

        // Tìm kiếm theo Tiêu đề
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(a => 
                a.title.toLowerCase().includes(term)
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

    const handlePageChange = (page) => {
        if (page > 0 && page <= totalPages) {
            setCurrentPage(page);
            // Cuộn lên đầu trang (UX tốt hơn)
            window.scrollTo({ top: 0, behavior: 'smooth' }); 
        }
    };


    // ------------------- RENDER -------------------
    return (
        <div className="container py-5">
            <h2 className="mb-4 text-secondary">📚 Thư viện Y tế</h2>

            {error && <div className="alert alert-danger" role="alert">{error}</div>}

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
                            <option value="ALL">Tất cả</option>
                            {categories.map(cat => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                        </select>

                        {/* Input Tìm kiếm */}
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Tìm kiếm theo Tiêu đề..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button type="submit" className="btn btn-outline-secondary ms-2">
                            <i className="bi bi-search"></i>
                        </button>
                    </form>
                </div>

                {/* Danh sách Bài viết */}
                {isLoading ? (
                    <div className="text-center py-5 text-secondary">
                        <i className="bi bi-arrow-clockwise spinner-border mr-2"></i> Đang tải bài viết...
                    </div>
                ) : filteredArticles.length === 0 ? (
                    <div className="alert alert-info text-center">Không tìm thấy bài viết nào khớp với tiêu chí lọc.</div>
                ) : (
                    <div className="row">
                        {currentArticles.map(article => (
                            <div key={article.id} className="col-md-6 col-lg-4 mb-4">
                                <div className="card h-100 shadow-sm border-light-subtle">
                                    <div className="card-body d-flex flex-column">
                                        <span className={`badge mb-2 bg-${article.category === 'NEWS' ? 'info' : 'success'}`}>
                                            {categories.find(c => c.value === article.category)?.label || article.category}
                                        </span>
                                        <h5 className="card-title text-primary">{article.title}</h5>
                                        <p className="card-text text-muted flex-grow-1" style={{ fontSize: '0.9rem' }}>
                                            {article.content.substring(0, 100)}...
                                        </p>
                                        <small className="text-end text-muted mt-2">
                                            Tác giả: {article.author_name} | {new Date(article.created_at).toLocaleDateString()}
                                        </small>
                                        <button 
                                            className="btn btn-sm btn-outline-secondary mt-3"
                                            onClick={() => setViewingArticle(article)}
                                        >
                                            Xem chi tiết &rarr;
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                {/* Phân trang */}
                {totalPages > 1 && (
                    <nav className="mt-4 d-flex justify-content-center">
                        <ul className="pagination shadow-sm">
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
            
            {/* Modal Xem Chi tiết */}
            <ArticleDetailModal 
                article={viewingArticle}
                isModalOpen={!!viewingArticle}
                closeModal={() => setViewingArticle(null)}
            />
        </div>
    );
};

export default ArticleListViewer;