import React, { useState, useEffect, useCallback, useMemo } from 'react';

// Backend API URL
const API_BASE_URL = 'http://localhost:8888/api/v1/controllers/';
const API_QUAL_VERIFICATION_URL = API_BASE_URL + 'admin_qual_verification.php';

// Pagination Configuration
const ITEMS_PER_PAGE = 10;

// =======================================================
// SHARED FETCH API HOOK (Reused from Admin files)
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
            throw new Error("Session expired. Please login again as Admin.");
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
            throw new Error('Operation failed (Server Error).');
        }
        return {};
    }, []);
};


// =======================================================
// MAIN COMPONENT: QUALIFICATION VERIFICATION MANAGER
// =======================================================

const AdminQualificationManager = () => {
    const [qualifications, setQualifications] = useState([]); // List of pending qualifications
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const fetchApi = useFetchApi();
    const ITEMS_PER_PAGE = 10; 

    // ------------------- FETCH MAIN DATA (Pending Qualifications) -------------------
    const fetchQualifications = useCallback(async () => {
        setError(null);
        setIsLoading(true);
        try {
            // Add search parameter to GET URL
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


    // ------------------- SEARCH & PAGINATION LOGIC -------------------
    
    // Search is handled by Backend, Frontend only handles pagination
    const totalPages = Math.ceil(qualifications.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentQualifications = qualifications.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setCurrentPage(1); 
        fetchQualifications(); // Reload data from Backend with new searchTerm
    };

    const handlePageChange = (page) => {
        if (page > 0 && page <= totalPages) {
            setCurrentPage(page);
        }
    };
    
    // ------------------- VERIFICATION ACTION LOGIC -------------------

    const handleVerification = useCallback(async (qualId, status) => {
        const statusText = status === 1 ? 'APPROVE' : 'REJECT';
        const statusValue = status === 1 ? 1 : -1; // 1: ACCEPTED, -1: REJECTED
        
        if (!window.confirm(`Confirm ${statusText} Qualification ID: ${qualId}?`)) {
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const payload = {
                id: qualId,
                status: statusValue,
            };

            const data = await fetchApi(API_QUAL_VERIFICATION_URL, {
                method: 'PUT',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
            });

            setSuccessMessage(data.message || `Qualification ${status === 1 ? 'approved' : 'rejected'} successfully.`);
            fetchQualifications(); // Reload list after update

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [fetchApi, fetchQualifications]);


    // ------------------- RENDER -------------------
    return (
        <div className="container py-5">
            <h2 className="mb-4 text-primary">✅ Doctor Qualification Verification (Admin)</h2>

            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            {successMessage && <div className="alert alert-success" role="alert">{successMessage}</div>}

            <div className="card shadow-sm p-4">
                
                {/* SEARCH BAR */}
                <form onSubmit={handleSearchSubmit} className="d-flex flex-grow-1 mb-4">
                    <input
                        type="text"
                        className="form-control me-2"
                        placeholder="Search by Doctor Name / Email"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary">
                        <i className="bi bi-search"></i> Search Doctor
                    </button>
                </form>

                {/* Qualification List Table */}
                <div className="table-responsive">
                    <table className="table table-hover align-middle">
                        <thead className="table-light">
                            <tr>
                                <th>Qual ID</th>
                                <th>Doctor</th>
                                <th>Email</th>
                                <th>Degree Title</th>
                                <th>Institution / Year</th>
                                <th>File</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-4 text-muted">Loading data...</td>
                                </tr>
                            ) : currentQualifications.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-4 text-muted">No qualifications pending verification.</td>
                                </tr>
                            ) : (
                                currentQualifications.map(qual => (
                                    <tr key={qual.qual_id}>
                                        <td>{qual.qual_id}</td>
                                        <td>
                                            <div className="fw-bold">{qual.doctor_name}</div>
                                            <small className="text-muted">Doc ID: {qual.doctor_id}</small>
                                        </td>
                                        <td>{qual.email}</td>
                                        <td>{qual.title}</td>
                                        <td>{qual.institution} ({qual.year_completed})</td>
                                        <td className="text-nowrap">
                                            <a href={qual.document_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-info">
                                                <i className="bi bi-file-earmark-arrow-down"></i> Download
                                            </a>
                                        </td>
                                        <td className='text-nowrap'>
                                            <button 
                                                className="btn btn-sm btn-success me-2"
                                                onClick={() => handleVerification(qual.qual_id, 1)}
                                                disabled={isLoading}
                                            >
                                                Approve (Accept)
                                            </button>
                                            <button 
                                                className={`btn btn-sm btn-danger`}
                                                onClick={() => handleVerification(qual.qual_id, -1)}
                                                disabled={isLoading}
                                            >
                                                Reject
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <nav className="mt-4 d-flex justify-content-center">
                        <ul className="pagination shadow-sm">
                            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                <button className="page-link" onClick={() => handlePageChange(currentPage - 1)}>Previous</button>
                            </li>
                            {[...Array(totalPages)].map((_, index) => (
                                <li key={index} className={`page-item ${currentPage === index + 1 ? 'active' : ''}`}>
                                    <button className="page-link" onClick={() => handlePageChange(index + 1)}>
                                        {index + 1}
                                    </button>
                                </li>
                            ))}
                            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                <button className="page-link" onClick={() => handlePageChange(currentPage + 1)}>Next</button>
                            </li>
                        </ul>
                    </nav>
                )}
            </div>
        </div>
    );
};

export default AdminQualificationManager;