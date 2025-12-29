import React, { useState, useEffect, useCallback, useMemo } from 'react';

// Backend API URL (Shared CRUD API)
const API_BASE_URL = 'http://localhost:8888/api/v1/controllers/';
const API_CITY_CRUD_URL = API_BASE_URL + 'admin_city_crud.php';

// Pagination Configuration
const ITEMS_PER_PAGE = 10;

// =======================================================
// SHARED FETCH API HOOK (Reusable)
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
// SUB-COMPONENT: 1. ADD/EDIT CITY MODAL
// =======================================================

const CityFormModal = ({ city, mode, isModalOpen, closeModal, refreshList, fetchApi }) => {
    const isEditing = mode === 'edit';
    const [cityName, setCityName] = useState(isEditing ? city?.name || '' : '');
    const [localError, setLocalError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Reset state on modal open/close
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
            setLocalError('City name cannot be empty.');
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

            window.alert(data.message || `City ${isEditing ? 'updated' : 'added'} successfully.`);
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
                        <h5 className="modal-title">{isEditing ? `Edit City ID: ${city.id}` : 'Add New City'}</h5>
                        <button type="button" className="btn-close btn-close-white" onClick={closeModal} disabled={isLoading}></button>
                    </div>
                    <div className="modal-body">
                        {localError && (<div className="alert alert-danger" role="alert">{localError}</div>)}

                        <form onSubmit={handleSubmit}>
                            <div className="mb-3">
                                <label className="form-label">City Name (*)</label>
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
                                {isLoading ? 'Processing...' : isEditing ? 'Save Changes' : 'Add City'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};


// =======================================================
// COMPONENT 2: MAIN MANAGER (ADMINCITYMANAGER)
// =======================================================

const AdminCityManager = () => {
    const [cities, setCities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingCity, setEditingCity] = useState(null); 
    const [deletingCityId, setDeletingCityId] = useState(null); // ID of the city being deleted

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const fetchApi = useFetchApi();

    // ------------------- FETCH MAIN DATA -------------------
    const fetchCities = useCallback(async () => {
        setError(null);
        setIsLoading(true);
        try {
            // API GET returns: { data: { cities: [...] } }
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

    // ------------------- SEARCH & PAGINATION LOGIC -------------------
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


    // ------------------- ACTION LOGIC -------------------
    
    // 1. Open Edit Modal
    const handleEditCity = (city) => {
        setEditingCity(city);
    };

    // 2. Delete City
    const handleDeleteCity = useCallback(async (cityId, cityName) => {
        if (!window.confirm(`Are you sure you want to DELETE city "${cityName}" (ID: ${cityId})? This action CANNOT be undone.`)) {
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // API DELETE: Send ID via body or query param
            await fetchApi(API_CITY_CRUD_URL, {
                method: 'DELETE',
                body: JSON.stringify({ id: cityId }),
                headers: { 'Content-Type': 'application/json' },
            });

            setSuccessMessage(`City "${cityName}" deleted successfully.`);
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
                
                {/* SEARCH BAR & ADD NEW */}
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <form onSubmit={handleSearch} className="d-flex">
                        <input
                            type="text"
                            className="form-control me-2"
                            placeholder="Search by Name or City ID"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '300px' }}
                        />
                        <button type="submit" className="btn btn-outline-primary">
                            <i className="bi bi-search">Search City</i>
                        </button>
                    </form>
                    
                    <button 
                        className="btn btn-success" 
                        onClick={() => setIsAddModalOpen(true)}
                        disabled={isLoading}
                    >
                        <i className="bi bi-plus-lg"></i> Add New City
                    </button>
                </div>

                {/* City List Table */}
                <div className="table-responsive">
                    <table className="table table-striped align-middle">
                        <thead className="table-light">
                            <tr>
                                <th>ID</th>
                                <th>City Name</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="3" className="text-center py-4 text-muted">Loading data...</td>
                                </tr>
                            ) : filteredCities.length === 0 ? (
                                <tr>
                                    <td colSpan="3" className="text-center py-4 text-muted">No cities found.</td>
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
                                                Edit
                                            </button>
                                            <button 
                                                className={`btn btn-sm btn-danger`}
                                                onClick={() => handleDeleteCity(city.id, city.name)}
                                            >
                                                Delete
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
                        <ul className="pagination">
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
            
            {/* Add Modal */}
            <CityFormModal 
                city={null}
                mode={'add'}
                isModalOpen={isAddModalOpen}
                closeModal={() => setIsAddModalOpen(false)}
                refreshList={fetchCities}
                fetchApi={fetchApi}
            />
            
            {/* Edit Modal */}
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