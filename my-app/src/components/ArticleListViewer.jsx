import React, { useState, useEffect, useCallback, useMemo } from 'react';

// Backend API URL
const API_PUBLIC_ARTICLES_URL = 'http://localhost:8888/api/v1/controllers/public_article_list.php'; 

const ITEMS_PER_PAGE = 8; // Pagination configuration

// =======================================================
// SHARED FETCH API HOOK
// =======================================================
const useFetchApi = () => {
    return useCallback(async (url, options = {}) => {
        const response = await fetch(url, {
            ...options,
            credentials: 'include',
            headers: options.headers || {},
        });

        if (response.status === 401) {
            // For public news pages, tight 401 handling might not be needed if guests are allowed
            // But if login is required, keep it
            throw new Error("Please log in to view content.");
        }
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            if (!response.ok) {
                const errorMessage = data.message || 'Unknown system error.';
                throw new Error(errorMessage);
            }
            return data;
        }
        
        if (!response.ok) {
            throw new Error('Data load failed (Server Error).');
        }
        return {};
    }, []);
};


// =======================================================
// SUB-COMPONENT: ARTICLE DETAIL MODAL
// =======================================================
const ArticleDetailModal = ({ article, isModalOpen, closeModal }) => {
    if (!isModalOpen || !article) return null;

    // Utility function to display correct Category label
    const getCategoryLabel = (value) => {
        const categories = [
            { value: 'NEWS', label: 'Medical News' },
            { value: 'DISEASE', label: 'Pathology/Disease' },
            { value: 'PREVENTION', label: 'Prevention' },
            { value: 'CURE', label: 'Treatment/Cure' },
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
                        {/* Large Thumbnail Image */}
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
                            <span><i className="bi bi-calendar3 me-1"></i>{new Date(article.created_at).toLocaleDateString('en-US')}</span>
                        </div>

                        {/* Subtitle (Short description/Lead) */}
                        {article.subtitle && (
                            <div className="lead fst-italic text-secondary mb-4 border-start border-4 border-primary ps-3">
                                {article.subtitle}
                            </div>
                        )}
                        
                        <hr className="my-4 opacity-10" />

                        {/* Detailed Content */}
                        {/* Note: If content has HTML from CKEditor, use dangerouslySetInnerHTML,
                            otherwise use whiteSpace style for plain text */}
                        <div className="article-content" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8', fontSize: '1.1rem', color: '#333' }}>
                             {article.content}
                        </div>
                    </div>

                    <div className="modal-footer border-top-0">
                        <button type="button" className="btn btn-secondary px-4" onClick={closeModal}>Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
};


// =======================================================
// MAIN COMPONENT: ARTICLE LIST
// =======================================================
const ArticleListViewer = () => {
    const [articles, setArticles] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('ALL'); 
    const [currentPage, setCurrentPage] = useState(1);
    
    const [viewingArticle, setViewingArticle] = useState(null); // Article being viewed in detail

    const fetchApi = useFetchApi();

    // ------------------- FETCH ARTICLE DATA -------------------
    const fetchArticles = useCallback(async () => {
        setError(null);
        setIsLoading(true);
        try {
            const data = await fetchApi(API_PUBLIC_ARTICLES_URL, { method: 'GET' });
            
            // Data from API already includes thumbnail, subtitle
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


    // ------------------- FILTER & PAGINATION LOGIC -------------------
    const filteredArticles = useMemo(() => {
        let result = articles;

        // Filter by Category
        if (filterCategory !== 'ALL') {
            result = result.filter(a => a.category === filterCategory);
        }

        // Search by Title
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
            // Scroll to top (better UX)
            window.scrollTo({ top: 0, behavior: 'smooth' }); 
        }
    };


    // ------------------- RENDER -------------------
    return (
        <div className="container py-5">
            <div className="text-center mb-5">
                <h2 className="display-6 fw-bold text-primary mb-3">📚 Medical & Health Library</h2>
                <p className="text-muted lead">Stay updated with the latest medical knowledge and useful advice.</p>
            </div>

            {error && <div className="alert alert-danger shadow-sm" role="alert"><i className="bi bi-exclamation-triangle me-2"></i>{error}</div>}

            <div className="card shadow-sm border-0 rounded-4 p-4 mb-5 bg-white">
                
                {/* FILTER & SEARCH BAR */}
                <div className="d-flex flex-wrap justify-content-between align-items-center">
                    <form onSubmit={handleSearch} className="d-flex flex-grow-1 flex-md-grow-0 w-md-50 w-100">
                        <div className="input-group">
                             <select 
                                className="form-select bg-light border-0" 
                                style={{ maxWidth: '160px' }}
                                value={filterCategory}
                                onChange={(e) => {setFilterCategory(e.target.value); setCurrentPage(1);}}
                            >
                                <option value="ALL">All Topics</option>
                                {categories.map(cat => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                            </select>
                            <input
                                type="text"
                                className="form-control border-start-0 bg-light border-0"
                                placeholder="Search articles..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <button type="submit" className="btn btn-primary px-4">
                                <i className="bi bi-search"></i>
                            </button>
                        </div>
                    </form>
                    <div className="mt-3 mt-md-0 text-muted small">
                        Showing {currentArticles.length} / {filteredArticles.length} articles
                    </div>
                </div>
            </div>

            {/* ARTICLE LIST (GRID CARD) */}
            {isLoading ? (
                <div className="text-center py-5 text-secondary">
                    <div className="spinner-border text-primary mb-3" style={{width: '3rem', height: '3rem'}} role="status"></div>
                    <p>Loading library...</p>
                </div>
            ) : filteredArticles.length === 0 ? (
                <div className="alert alert-light text-center py-5 shadow-sm rounded-4">
                    <i className="bi bi-journal-x fs-1 text-muted mb-3 d-block"></i>
                    No articles found matching your search criteria.
                </div>
            ) : (
                <div className="row g-4">
                    {currentArticles.map(article => (
                        <div key={article.id} className="col-md-6 col-lg-4 col-xl-3 d-flex">
                            <div className="card h-100 shadow-sm border-0 rounded-4 overflow-hidden w-100 card-hover-effect" style={{transition: 'transform 0.2s'}}>
                                {/* Thumbnail Image */}
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
                                    
                                    {/* Subtitle / Short Description */}
                                    <p className="card-text text-muted small flex-grow-1 mb-3 text-truncate-3-lines">
                                        {article.subtitle 
                                            ? article.subtitle 
                                            : article.content.replace(/<[^>]+>/g, '').substring(0, 100) + '...'
                                        }
                                    </p>
                                    
                                    <div className="d-flex justify-content-between align-items-center mt-auto pt-3 border-top border-light">
                                        <small className="text-muted" style={{fontSize: '0.75rem'}}>
                                            <i className="bi bi-clock me-1"></i>
                                            {new Date(article.created_at).toLocaleDateString('en-US')}
                                        </small>
                                        <button 
                                            className="btn btn-sm btn-outline-primary rounded-pill px-3"
                                            onClick={() => setViewingArticle(article)}
                                        >
                                            Read More
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {/* Pagination */}
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

            {/* View Detail Modal */}
            <ArticleDetailModal 
                article={viewingArticle}
                isModalOpen={!!viewingArticle}
                closeModal={() => setViewingArticle(null)}
            />
            
            {/* Internal CSS to handle multi-line text truncation (if Bootstrap class is insufficient) */}
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