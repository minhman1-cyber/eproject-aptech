import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom'; // Assuming you use react-router-dom

// Backend API URL
const API_BASE_URL = 'http://localhost:8888/api/v1/controllers/';
const API_QUAL_VERIFICATION_URL = API_BASE_URL + 'admin_qual_verification.php';

// Default Pagination Configuration
const DEFAULT_ITEMS_PER_PAGE = 10;

// =======================================================
// SHARED FETCH API HOOK
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
            throw new Error("Session expired. Please login again.");
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
// MAIN COMPONENT
// =======================================================

const AdminQualificationManager = ({ isWidget = false }) => {
    const [qualifications, setQualifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const fetchApi = useFetchApi();
    
    // If widget, only fetch 5 items and use simplified pagination
    const ITEMS_PER_PAGE = isWidget ? 5 : DEFAULT_ITEMS_PER_PAGE;

    // ------------------- FETCH DATA -------------------
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

    // ------------------- DISPLAY LOGIC -------------------
    const totalPages = Math.ceil(qualifications.length / ITEMS_PER_PAGE);
    
    // If widget, always show page 1
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
    
    // ------------------- VERIFICATION LOGIC -------------------
    const handleVerification = useCallback(async (qualId, status) => {
        const statusText = status === 1 ? 'APPROVE' : 'REJECT';
        const statusValue = status === 1 ? 1 : -1;
        
        if (!window.confirm(`Confirm ${statusText} Qualification ID: ${qualId}?`)) {
            return;
        }

        setIsLoading(true);
        setSuccessMessage(null); // Reset local message if needed

        try {
            const payload = { id: qualId, status: statusValue };
            const data = await fetchApi(API_QUAL_VERIFICATION_URL, {
                method: 'PUT',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
            });

            // If not widget, show success message
            if (!isWidget) {
                setSuccessMessage(data.message || `Qualification ${statusText.toLowerCase()}d successfully.`);
            } else {
                // If widget, just refresh quickly
                fetchQualifications();
            }

            if (!isWidget) fetchQualifications();

        } catch (err) {
            if (!isWidget) setError(err.message);
            else alert(`Error: ${err.message}`); // Use alert for widget compactness
        } finally {
            setIsLoading(false);
        }
    }, [fetchApi, fetchQualifications, isWidget]);

    // ------------------- RENDER -------------------
    
    // Widget View (Simplified)
    if (isWidget) {
        return (
            <div className="card h-100 shadow-sm border-0">
                <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
                    <h5 className="mb-0 text-primary fw-bold">
                        <i className="bi bi-mortarboard-fill me-2"></i>New Qualifications
                    </h5>
                    {/* Link to full manager page */}
                    <Link to="/admin/qualifications" className="btn btn-sm btn-outline-primary rounded-pill">
                        View All <i className="bi bi-arrow-right"></i>
                    </Link>
                </div>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover mb-0 align-middle">
                            <thead className="table-light text-secondary">
                                <tr>
                                    <th className="ps-4">Doctor</th>
                                    <th>Qualification</th>
                                    <th className="text-end pe-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr><td colSpan="3" className="text-center py-3">Loading...</td></tr>
                                ) : currentQualifications.length === 0 ? (
                                    <tr><td colSpan="3" className="text-center py-3 text-muted">No pending requests.</td></tr>
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
                                                    <i className="bi bi-paperclip"></i> View File
                                                </a>
                                            </td>
                                            <td className="text-end pe-4">
                                                <button onClick={() => handleVerification(qual.qual_id, 1)} className="btn btn-sm btn-success me-1" title="Approve">
                                                    <i className="bi bi-check-lg">✔</i>
                                                </button>
                                                <button onClick={() => handleVerification(qual.qual_id, -1)} className="btn btn-sm btn-outline-danger" title="Reject">
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

    // Full View
    return (
        <div className="container-fluid py-4">

            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            {successMessage && <div className="alert alert-success" role="alert">{successMessage}</div>}

            <div className="card shadow-sm p-4">
                <form onSubmit={handleSearchSubmit} className="d-flex flex-grow-1 mb-4">
                    <input
                        type="text"
                        className="form-control me-2"
                        placeholder="Search by Doctor Name / Email"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary">
                        <i className="bi bi-search"></i> Search
                    </button>
                </form>

                <div className="table-responsive">
                    <table className="table table-hover align-middle">
                        <thead className="table-light">
                            <tr>
                                <th>ID</th>
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
                                <tr><td colSpan="7" className="text-center py-4">Loading data...</td></tr>
                            ) : currentQualifications.length === 0 ? (
                                <tr><td colSpan="7" className="text-center py-4 text-muted">No data found.</td></tr>
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
                                                <i className="bi bi-download"></i> View
                                            </a>
                                        </td>
                                        <td>
                                            <button className="btn btn-sm btn-success me-2" onClick={() => handleVerification(qual.qual_id, 1)}>
                                                Approve
                                            </button>
                                            <button className="btn btn-sm btn-danger" onClick={() => handleVerification(qual.qual_id, -1)}>
                                                Reject
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
                                <button className="page-link" onClick={() => handlePageChange(currentPage - 1)}>Previous</button>
                            </li>
                            {[...Array(totalPages)].map((_, index) => (
                                <li key={index} className={`page-item ${currentPage === index + 1 ? 'active' : ''}`}>
                                    <button className="page-link" onClick={() => handlePageChange(index + 1)}>{index + 1}</button>
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