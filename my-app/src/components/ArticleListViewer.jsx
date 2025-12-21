import React, { useState, useEffect, useCallback, useMemo } from 'react';

// URL API Backend
const API_PUBLIC_ARTICLES_URL = 'http://localhost:8888/api/v1/controllers/public_article_list.php'; 

const ITEMS_PER_PAGE = 8; // Cấu hình phân trang

// =======================================================
// HÀM FETCH API CHUNG
// =======================================================
const useFetchApi = () => {
    return useCallback(async (url, options = {}) => {
        const response = await fetch(url, {
            ...options,
            credentials: 'include',
            headers: options.headers || {},
        });

        if (response.status === 401) {
            // Với trang tin tức công khai, có thể không cần bắt lỗi 401 chặt chẽ nếu cho phép khách xem
            // Nhưng nếu yêu cầu đăng nhập thì giữ nguyên
            throw new Error("Vui lòng đăng nhập để xem nội dung.");
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
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', overflowY: 'auto' }} tabIndex="-1">
            <div className="modal-dialog modal-xl modal-dialog-scrollable">
                <div className="modal-content border-0 shadow-lg">
                    <div className="modal-header bg-white border-bottom-0">
                        <h5 className="modal-title fw-bold text-primary w-100 pe-3">{article.title}</h5>
                        <button type="button" className="btn-close" onClick={closeModal}></button>
                    </div>
                    
                    <div className="modal-body px-4 px-md-5 pb-5">
                        {/* Ảnh Thumbnail lớn */}
                        {article.thumbnail && (
                            <div className="mb-4 text-center rounded overflow-hidden shadow-sm">
                                <img 
                                    src={article.thumbnail} 
                                    alt={article.title} 
                                    className="img-fluid w-100 object-fit-cover" 
                                    style={{ maxHeight: '450px' }} 
                                />
                            </div>
                        )}

                        {/* Meta Data */}
                        <div className="d-flex flex-wrap align-items-center mb-3 text-muted small">
                            <span className={`badge me-2 bg-${article.category === 'NEWS' ? 'info' : 'success'}`}>
                                {getCategoryLabel(article.category)}
                            </span>
                            <span className="me-3"><i className="bi bi-person-fill me-1"></i>{article.author_name}</span>
                            <span><i className="bi bi-calendar3 me-1"></i>{new Date(article.created_at).toLocaleDateString('vi-VN')}</span>
                        </div>

                        {/* Subtitle (Mô tả ngắn/Sapo) */}
                        {article.subtitle && (
                            <div className="lead fst-italic text-secondary mb-4 border-start border-4 border-primary ps-3">
                                {article.subtitle}
                            </div>
                        )}
                        
                        <hr className="my-4 opacity-10" />

                        {/* Nội dung chi tiết */}
                        {/* Lưu ý: Nếu nội dung có HTML từ CKEditor thì dùng dangerouslySetInnerHTML,
                            còn nếu là text thuần thì dùng style whiteSpace */}
                        <div className="article-content" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8', fontSize: '1.1rem', color: '#333' }}>
                             {article.content}
                        </div>
                    </div>

                    <div className="modal-footer border-top-0">
                        <button type="button" className="btn btn-secondary px-4" onClick={closeModal}>Đóng</button>
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
            
            // Dữ liệu từ API đã bao gồm thumbnail, subtitle
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
                a.title.toLowerCase().includes(term) || (a.subtitle && a.subtitle.toLowerCase().includes(term))
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
            <div className="text-center mb-5">
                <h2 className="display-6 fw-bold text-primary mb-3">📚 Thư Viện Y Tế & Sức Khỏe</h2>
                <p className="text-muted lead">Cập nhật những kiến thức y khoa mới nhất và lời khuyên hữu ích.</p>
            </div>

            {error && <div className="alert alert-danger shadow-sm" role="alert"><i className="bi bi-exclamation-triangle me-2"></i>{error}</div>}

            <div className="card shadow-sm border-0 rounded-4 p-4 mb-5 bg-white">
                
                {/* THANH LỌC & TÌM KIẾM */}
                <div className="d-flex flex-wrap justify-content-between align-items-center">
                    <form onSubmit={handleSearch} className="d-flex flex-grow-1 flex-md-grow-0 w-md-50 w-100">
                        <div className="input-group">
                             <select 
                                className="form-select bg-light border-0" 
                                style={{ maxWidth: '160px' }}
                                value={filterCategory}
                                onChange={(e) => {setFilterCategory(e.target.value); setCurrentPage(1);}}
                            >
                                <option value="ALL">Tất cả Chủ đề</option>
                                {categories.map(cat => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                            </select>
                            <input
                                type="text"
                                className="form-control border-start-0 bg-light border-0"
                                placeholder="Tìm kiếm bài viết..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <button type="submit" className="btn btn-primary px-4">
                                <i className="bi bi-search"></i>
                            </button>
                        </div>
                    </form>
                    <div className="mt-3 mt-md-0 text-muted small">
                        Hiển thị {currentArticles.length} / {filteredArticles.length} bài viết
                    </div>
                </div>
            </div>

            {/* DANH SÁCH BÀI VIẾT (GRID CARD) */}
            {isLoading ? (
                <div className="text-center py-5 text-secondary">
                    <div className="spinner-border text-primary mb-3" style={{width: '3rem', height: '3rem'}} role="status"></div>
                    <p>Đang tải thư viện...</p>
                </div>
            ) : filteredArticles.length === 0 ? (
                <div className="alert alert-light text-center py-5 shadow-sm rounded-4">
                    <i className="bi bi-journal-x fs-1 text-muted mb-3 d-block"></i>
                    Không tìm thấy bài viết nào khớp với tiêu chí tìm kiếm.
                </div>
            ) : (
                <div className="row g-4">
                    {currentArticles.map(article => (
                        <div key={article.id} className="col-md-6 col-lg-4 col-xl-3 d-flex">
                            <div className="card h-100 shadow-sm border-0 rounded-4 overflow-hidden w-100 card-hover-effect" style={{transition: 'transform 0.2s'}}>
                                {/* Ảnh Thumbnail */}
                                <div className="position-relative" style={{ height: '200px', overflow: 'hidden' }}>
                                    <img 
                                        src={article.thumbnail || 'https://placehold.co/600x400/e9ecef/6c757d?text=Medicenter'} 
                                        className="card-img-top w-100 h-100 object-fit-cover" 
                                        alt={article.title}
                                    />
                                    <span className={`position-absolute top-0 end-0 m-3 badge rounded-pill bg-${article.category === 'NEWS' ? 'info' : 'success'} shadow-sm`}>
                                        {categories.find(c => c.value === article.category)?.label || article.category}
                                    </span>
                                </div>
                                
                                <div className="card-body d-flex flex-column p-4">
                                    <h5 className="card-title fw-bold mb-2 text-dark text-truncate-2-lines" title={article.title}>
                                        {article.title}
                                    </h5>
                                    
                                    {/* Subtitle / Mô tả ngắn */}
                                    <p className="card-text text-muted small flex-grow-1 mb-3 text-truncate-3-lines">
                                        {article.subtitle 
                                            ? article.subtitle 
                                            : article.content.replace(/<[^>]+>/g, '').substring(0, 100) + '...'
                                        }
                                    </p>
                                    
                                    <div className="d-flex justify-content-between align-items-center mt-auto pt-3 border-top border-light">
                                        <small className="text-muted" style={{fontSize: '0.75rem'}}>
                                            <i className="bi bi-clock me-1"></i>
                                            {new Date(article.created_at).toLocaleDateString('vi-VN')}
                                        </small>
                                        <button 
                                            className="btn btn-sm btn-outline-primary rounded-pill px-3"
                                            onClick={() => setViewingArticle(article)}
                                        >
                                            Đọc tiếp
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {/* Phân trang */}
            {totalPages > 1 && (
                <nav className="mt-5 d-flex justify-content-center">
                    <ul className="pagination shadow-sm rounded-pill overflow-hidden">
                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                            <button className="page-link border-0 py-2 px-3" onClick={() => handlePageChange(currentPage - 1)}>
                                <i className="bi bi-chevron-left"></i>
                            </button>
                        </li>
                        {[...Array(totalPages)].map((_, index) => (
                            <li key={index} className={`page-item ${currentPage === index + 1 ? 'active' : ''}`}>
                                <button className="page-link border-0 py-2 px-3" onClick={() => handlePageChange(index + 1)}>
                                    {index + 1}
                                </button>
                            </li>
                        ))}
                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                            <button className="page-link border-0 py-2 px-3" onClick={() => handlePageChange(currentPage + 1)}>
                                <i className="bi bi-chevron-right"></i>
                            </button>
                        </li>
                    </ul>
                </nav>
            )}

            {/* Modal Xem Chi tiết */}
            <ArticleDetailModal 
                article={viewingArticle}
                isModalOpen={!!viewingArticle}
                closeModal={() => setViewingArticle(null)}
            />
            
            {/* CSS nội bộ để xử lý text truncate nhiều dòng (nếu Bootstrap class không đủ) */}
            <style>{`
                .text-truncate-2-lines {
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .text-truncate-3-lines {
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .card-hover-effect:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 .5rem 1rem rgba(0,0,0,.15)!important;
                }
            `}</style>
        </div>
    );
};

export default ArticleListViewer;