import React, { useState, useEffect, useCallback, useMemo } from 'react';

// Backend API URLs
const API_BASE_URL = 'http://localhost:8888/api/v1/controllers/';
const API_ARTICLE_CRUD_URL = API_BASE_URL + 'admin_article_crud.php';
const API_UPLOAD_URL = 'http://localhost:8888/api/v1/upload/upload_thumbnail.php';

// Default Pagination Configuration
const DEFAULT_ITEMS_PER_PAGE = 10;

// Initial form values
const initialArticleForm = {
    id: null,
    title: '',
    subtitle: '',
    thumbnail: '',
    content: '',
    category: 'NEWS',
    status: 'PUBLISHED',
};

const CATEGORIES = [
    { value: 'NEWS', label: 'Medical News' },
    { value: 'DISEASE', label: 'Pathology/Disease' },
    { value: 'PREVENTION', label: 'Prevention' },
    { value: 'CURE', label: 'Treatment/Cure' },
];

const STATUS_OPTIONS = [
    { value: 'DRAFT', label: 'Draft', color: 'secondary' },
    { value: 'PUBLISHED', label: 'Published', color: 'success' },
];

// =======================================================
// SHARED FETCH API HOOK
// =======================================================
const useFetchApi = () => {
    return useCallback(async (url, options = {}) => {
        const headers = options.body instanceof FormData 
            ? { ...(options.headers || {}) }
            : { 
                'Content-Type': options.body && typeof options.body === 'string' ? 'application/json' : undefined,
                ...(options.headers || {}) 
              };

        try {
            const response = await fetch(url, {
                ...options,
                credentials: 'include',
                headers: headers,
            });

            if (response.status === 401) {
                // Handle logout or notification
                console.warn("Session expired");
            }
            
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.message || 'Unknown system error.');
                }
                return data;
            }
            return {};
        } catch (error) {
            console.error("API Error:", error);
            throw error;
        }
    }, []);
};

// =======================================================
// SUB-COMPONENT: ADD/EDIT ARTICLE MODAL
// =======================================================
const ArticleFormModal = ({ article, mode, isModalOpen, closeModal, refreshList, fetchApi }) => {
    const isEditing = mode === 'edit';
    const [formData, setFormData] = useState(initialArticleForm);
    const [localError, setLocalError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (isModalOpen) {
            setLocalError('');
            if (isEditing && article) {
                setFormData({
                    ...initialArticleForm,
                    ...article,
                    subtitle: article.subtitle || '',
                    thumbnail: article.thumbnail || '',
                    status: article.status || 'PUBLISHED',
                    content: article.content || ''
                }); 
            } else {
                setFormData(initialArticleForm);
            }
        }
    }, [isModalOpen, isEditing, article]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setLocalError("Please select a valid image file.");
            return;
        }

        const uploadData = new FormData();
        uploadData.append('thumbnail', file);

        setIsUploading(true);
        setLocalError('');

        try {
            const data = await fetchApi(API_UPLOAD_URL, {
                method: 'POST',
                body: uploadData
            });
            setFormData(prev => ({ ...prev, thumbnail: data.url }));
        } catch (err) {
            setLocalError("Image upload error: " + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');
        setIsLoading(true);

        if (!formData.title || !formData.content || !formData.category) {
            setLocalError('Please fill in all required fields (*).');
            setIsLoading(false);
            return;
        }

        const payload = {
            id: isEditing ? formData.id : undefined,
            title: formData.title,
            subtitle: formData.subtitle,
            thumbnail: formData.thumbnail,
            content: formData.content,
            category: formData.category,
            status: formData.status,
        };
        
        try {
            await fetchApi(API_ARTICLE_CRUD_URL, {
                method: isEditing ? 'PUT' : 'POST',
                body: JSON.stringify(payload)
            });

            alert(`Article has been ${isEditing ? 'updated' : 'published'} successfully.`);
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
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', overflowY: 'auto', zIndex: 1050 }} tabIndex="-1">
            <div className="modal-dialog modal-xl">
                <div className="modal-content">
                    <div className="modal-header bg-primary text-white">
                        <h5 className="modal-title">{isEditing ? `Edit Article ID: ${formData.id}` : 'Post New Article'}</h5>
                        <button type="button" className="btn-close btn-close-white" onClick={closeModal} disabled={isLoading}></button>
                    </div>
                    <div className="modal-body">
                        {localError && (<div className="alert alert-danger" role="alert">{localError}</div>)}
                        <form onSubmit={handleSubmit}>
                            <div className="row">
                                <div className="col-lg-8">
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">Title (*)</label>
                                        <input type="text" className="form-control" name="title" value={formData.title} onChange={handleChange} required />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">Subtitle</label>
                                        <textarea className="form-control" name="subtitle" value={formData.subtitle} onChange={handleChange} rows="2" />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">Content (*)</label>
                                        <textarea className="form-control" name="content" value={formData.content} onChange={handleChange} rows="10" required />
                                    </div>
                                </div>
                                <div className="col-lg-4">
                                    <div className="card bg-light border-0 mb-3">
                                        <div className="card-body">
                                            <h6 className="card-title fw-bold text-primary">Settings</h6>
                                            <div className="mb-3">
                                                <label className="form-label">Status</label>
                                                <select className="form-select" name="status" value={formData.status} onChange={handleChange}>
                                                    {STATUS_OPTIONS.map(st => (
                                                        <option key={st.value} value={st.value}>{st.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="mb-3">
                                                <label className="form-label">Category (*)</label>
                                                <select className="form-select" name="category" value={formData.category} onChange={handleChange} required>
                                                    {CATEGORIES.map(cat => (
                                                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="mb-3">
                                                <label className="form-label">Thumbnail</label>
                                                {formData.thumbnail && <img src={formData.thumbnail} alt="Preview" className="img-fluid rounded mb-2 d-block" style={{maxHeight: '150px'}} />}
                                                <input type="file" className="form-control" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                                                {isUploading && <small className="text-primary">Uploading image...</small>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <hr />
                            <div className="d-flex justify-content-end gap-2">
                                <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={isLoading}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={isLoading || isUploading}>
                                    {isLoading && <span className="spinner-border spinner-border-sm me-2"></span>}
                                    {isEditing ? 'Save Changes' : 'Post Article'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

// =======================================================
// MAIN COMPONENT: ARTICLE MANAGER
// =======================================================

const AdminArticleManager = ({ isWidget = false }) => {
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
    
    // If widget, only grab 5 items
    const ITEMS_PER_PAGE = isWidget ? 5 : DEFAULT_ITEMS_PER_PAGE;

    // ------------------- FETCH DATA -------------------
    const fetchArticles = useCallback(async () => {
        setError(null);
        setIsLoading(true);
        try {
            const data = await fetchApi(API_ARTICLE_CRUD_URL, { method: 'GET' });
            setArticles(data.data.articles || []);
        } catch (err) {
            setError(err.message);
            // Mock data on error (for better Widget preview)
            if (isWidget && articles.length === 0) {
                 setArticles([
                    { id: 991, title: 'Dengue Fever Prevention Guide', subtitle: 'Measures to prevent Aedes mosquitoes...', category: 'PREVENTION', created_at: '2023-10-25', status: 'DRAFT', thumbnail: '' },
                    { id: 992, title: 'Nutrition for Diabetics', subtitle: 'Scientific 7-day menu', category: 'DISEASE', created_at: '2023-10-24', status: 'PUBLISHED', thumbnail: '' },
                    { id: 993, title: 'Extended Vaccination Schedule 2024', subtitle: 'Latest updates from the Ministry of Health', category: 'NEWS', created_at: '2023-10-23', status: 'DRAFT', thumbnail: '' },
                ]);
            }
        } finally {
            setIsLoading(false);
        }
    }, [fetchApi, isWidget, articles.length]);

    useEffect(() => {
        fetchArticles();
    }, [fetchArticles]);

    // ------------------- FILTER & PAGINATION LOGIC -------------------
    const filteredArticles = useMemo(() => {
        let result = articles;
        if (filterCategory !== 'ALL') {
            result = result.filter(a => a.category === filterCategory);
        }
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(a => 
                a.title.toLowerCase().includes(term) || String(a.id) === term
            );
        }
        return result;
    }, [articles, filterCategory, searchTerm]);

    const totalPages = Math.ceil(filteredArticles.length / ITEMS_PER_PAGE);
    
    // If Widget, always show page 1
    const displayPage = isWidget ? 1 : currentPage;
    const startIndex = (displayPage - 1) * ITEMS_PER_PAGE;
    const currentArticles = filteredArticles.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // ------------------- ACTIONS -------------------
    const openEditModal = useCallback(async (article) => {
        if (isWidget) return; // Widget does not support deep editing
        setIsLoading(true); 
        try {
            const detailUrl = `${API_ARTICLE_CRUD_URL}?id=${article.id}`;
            const data = await fetchApi(detailUrl, { method: 'GET' });
            let detailData = data.data || data;
            if (Array.isArray(detailData)) detailData = detailData[0];
            
            if (detailData) setEditingArticle(detailData);
        } catch (err) {
            alert("Error loading details: " + err.message);
        } finally {
            setIsLoading(false);
        }
    }, [fetchApi, isWidget]);

    const handleDeleteArticle = useCallback(async (id, title) => {
        if (!window.confirm(`Delete article "${title}"?`)) return;
        setIsLoading(true);
        try {
            await fetchApi(API_ARTICLE_CRUD_URL, {
                method: 'DELETE',
                body: JSON.stringify({ id }),
            });
            if (!isWidget) setSuccessMessage(`Article deleted successfully.`);
            fetchArticles(); 
        } catch (err) {
            if (!isWidget) setError(err.message);
            else alert(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [fetchApi, fetchArticles, isWidget]);

    // Quick action for Widget: Approve (Draft -> Published)
    const handleQuickPublish = useCallback(async (article) => {
        if (!window.confirm(`Approve and publish article "${article.title}"?`)) return;
        setIsLoading(true);
        try {
            const payload = { ...article, status: 'PUBLISHED' };
            await fetchApi(API_ARTICLE_CRUD_URL, {
                method: 'PUT',
                body: JSON.stringify(payload),
            });
            fetchArticles();
        } catch (err) {
            alert(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [fetchApi, fetchArticles]);

    // ------------------- RENDER: WIDGET VIEW -------------------
    if (isWidget) {
        return (
            <div className="card h-100 shadow-sm border-0">
                <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
                    <h5 className="mb-0 text-dark fw-bold">
                        <i className="bi bi-pencil-square me-2 text-success"></i>Article Management
                    </h5>
                    <a href="/admin/posts" className="btn btn-sm btn-outline-success rounded-pill">
                        View All <i className="bi bi-arrow-right"></i>
                    </a>
                </div>
                <div className="card-body p-0">
                    <ul className="list-group list-group-flush">
                        {isLoading ? (
                            <li className="list-group-item text-center py-3">Loading...</li>
                        ) : currentArticles.length === 0 ? (
                            <li className="list-group-item text-center py-3 text-muted">No articles found.</li>
                        ) : (
                            currentArticles.map(article => (
                                <li key={article.id} className="list-group-item p-3 d-flex justify-content-between align-items-center hover-bg-light">
                                    <div className="d-flex align-items-center" style={{ overflow: 'hidden' }}>
                                        <div className="me-3 flex-shrink-0">
                                            {article.thumbnail ? (
                                                <img src={article.thumbnail} alt="" className="rounded" style={{width: '50px', height: '50px', objectFit: 'cover'}} />
                                            ) : (
                                                <div className="bg-light rounded d-flex align-items-center justify-content-center" style={{width: '50px', height: '50px'}}>
                                                    <i className="bi bi-file-text text-secondary h4 mb-0"></i>
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-truncate">
                                            <h6 className="mb-1 fw-bold text-dark text-truncate" title={article.title}>{article.title}</h6>
                                            <small className="text-muted d-block text-truncate">
                                                {CATEGORIES.find(c => c.value === article.category)?.label || article.category}
                                                <span className="mx-1">•</span>
                                                {article.status === 'PUBLISHED' ? <span className="text-success">Published</span> : <span className="text-secondary">Draft</span>}
                                            </small>
                                        </div>
                                    </div>
                                    <div className="d-flex gap-2 ms-2">
                                        {article.status === 'DRAFT' && (
                                            <button 
                                                className="btn btn-sm btn-light text-success" 
                                                title="Approve / Publish Now"
                                                onClick={() => handleQuickPublish(article)}
                                            >
                                                <i className="bi bi-check-lg fs-10">Publish</i>
                                            </button>
                                        )}
                                        <button 
                                            className="btn btn-sm btn-light text-danger" 
                                            title="Delete"
                                            onClick={() => handleDeleteArticle(article.id, article.title)}
                                        >
                                            <i className="bi bi-x fs-10">Delete</i>
                                        </button>
                                    </div>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            </div>
        );
    }

    // ------------------- RENDER: FULL VIEW -------------------
    return (
        <div className="container py-5">
            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            {successMessage && <div className="alert alert-success" role="alert">{successMessage}</div>}

            <div className="card shadow-sm p-4">
                <div className="d-flex flex-wrap justify-content-between align-items-center mb-4">
                    <form onSubmit={(e) => { e.preventDefault(); setCurrentPage(1); }} className="d-flex flex-grow-1 me-3">
                        <select 
                            className="form-select me-2" 
                            style={{ width: '180px' }}
                            value={filterCategory}
                            onChange={(e) => {setFilterCategory(e.target.value); setCurrentPage(1);}}
                        >
                            <option value="ALL">All Categories</option>
                            {CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                        </select>

                        <input
                            type="text"
                            className="form-control"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button type="submit" className="btn btn-outline-primary ms-2"><i class="fas fa-search"></i></button>
                    </form>
                    
                    <button className="btn btn-success" onClick={() => setIsAddModalOpen(true)} disabled={isLoading}>
                        <i className="bi bi-plus-lg me-1"></i> Post New Article
                    </button>
                </div>

                <div className="table-responsive">
                    <table className="table table-hover align-middle">
                        <thead className="table-light">
                            <tr>
                                <th style={{width: '50px'}}>ID</th>
                                <th style={{width: '80px'}}>Image</th>
                                <th>Title / Summary</th>
                                <th>Status</th>
                                <th>Category</th>
                                <th>Date Posted</th>
                                <th className="text-end">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan="7" className="text-center py-4">Loading...</td></tr>
                            ) : currentArticles.length === 0 ? (
                                <tr><td colSpan="7" className="text-center py-4 text-muted">No data found.</td></tr>
                            ) : (
                                currentArticles.map(article => (
                                    <tr key={article.id}>
                                        <td>{article.id}</td>
                                        <td>
                                            <img src={article.thumbnail || 'https://placehold.co/60x60?text=No+Img'} alt="" className="rounded border" style={{ width: '60px', height: '40px', objectFit: 'cover' }} />
                                        </td>
                                        <td style={{maxWidth: '300px'}}>
                                            <div className="fw-bold text-truncate" title={article.title}>{article.title}</div>
                                            <small className="text-muted text-truncate d-block">{article.subtitle || 'No description'}</small>
                                        </td>
                                        <td>
                                            {article.status === 'PUBLISHED' ? <span className="badge bg-success">Published</span> : <span className="badge bg-secondary">Draft</span>}
                                        </td>
                                        <td>
                                            <span className="badge bg-light text-dark border">
                                                {CATEGORIES.find(c => c.value === article.category)?.label || article.category}
                                            </span>
                                        </td>
                                        <td>{new Date(article.created_at).toLocaleDateString('en-US')}</td>
                                        <td className='text-end'>
                                            <button className="btn btn-sm btn-outline-primary me-2" onClick={() => openEditModal(article)}>Edit</button>
                                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteArticle(article.id, article.title)}>Delete</button>
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
                                <button className="page-link" onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>Previous</button>
                            </li>
                            <li className={`page-item disabled`}><span className="page-link">{currentPage} / {totalPages}</span></li>
                            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                <button className="page-link" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>Next</button>
                            </li>
                        </ul>
                    </nav>
                )}
            </div>
            
            <ArticleFormModal article={null} mode={'add'} isModalOpen={isAddModalOpen} closeModal={() => setIsAddModalOpen(false)} refreshList={fetchArticles} fetchApi={fetchApi} />
            <ArticleFormModal article={editingArticle} mode={'edit'} isModalOpen={!!editingArticle} closeModal={() => setEditingArticle(null)} refreshList={fetchArticles} fetchApi={fetchApi} />
        </div>
    );
};

export default AdminArticleManager;