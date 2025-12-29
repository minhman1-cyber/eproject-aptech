import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from "react-router-dom";

// Backend API URLs
const API_BASE_URL = 'http://localhost:8888/api/v1/controllers/';
const API_LIST_URL = API_BASE_URL + 'admin_patient_manager.php';
const API_DETAIL_URL = API_BASE_URL + 'admin_patient_details.php';
const API_REGISTER_URL = API_BASE_URL + 'register.php';
const API_APPOINTMENT_MANAGE_URL = API_BASE_URL + 'manage_appointments.php'; 

// Pagination Configuration
const ITEMS_PER_PAGE = 10;

// Default values for form
const initialPatientForm = {
    userId: null,
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '', // Only used when creating new
    phone: '',
    address: '',
    cityId: '',
    is_active: 1, // Default active
};

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
// SUB-COMPONENT: 1. ADD/EDIT PATIENT MODAL
// =======================================================

const PatientFormModal = ({ patient, mode, isModalOpen, closeModal, cities, refreshList, fetchApi }) => {
    const [formData, setFormData] = useState(initialPatientForm);
    const [localError, setLocalError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const isEditing = mode === 'edit';

    // Map data from patient object to form structure
    const mapPatientToForm = (p) => ({
        userId: p.user_id,
        fullName: p.full_name || '',
        email: p.email || '',
        phone: p.phone || '',
        address: p.address || '',
        cityId: String(p.city_id || ''),
        is_active: p.user_is_active,
        password: '',
        confirmPassword: '',
    });

    useEffect(() => {
        if (isModalOpen) {
            setLocalError('');
            if (isEditing && patient) {
                setFormData(mapPatientToForm(patient));
            } else {
                setFormData(initialPatientForm);
            }
        }
    }, [isModalOpen, isEditing, patient]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');
        setIsLoading(true);

        // Basic Validation
        if (!formData.fullName || !formData.email || !formData.phone || !formData.cityId) {
            setLocalError('Please fill in all required fields.');
            setIsLoading(false);
            return;
        }
        if (!isEditing && formData.password !== formData.confirmPassword) {
            setLocalError('Confirm password does not match.');
            setIsLoading(false);
            return;
        }

        const payload = {
            userId: isEditing ? formData.userId : undefined,
            full_name: formData.fullName,
            email: formData.email,
            password: formData.password || undefined, 
            role: 'PATIENT',
            city_id: parseInt(formData.cityId),
            phone: formData.phone,
            address: formData.address,
            is_active: formData.is_active,
        };
        
        // <<< CORRECT API ROUTING >>>
        // Use API_LIST_URL (admin_patient_manager.php handling PUT) for Edit
        // Use API_REGISTER_URL for POST (Add)
        const url = isEditing ? API_LIST_URL : API_REGISTER_URL; 
        const method = isEditing ? 'PUT' : 'POST';

        try {
            await fetchApi(url, {
                method: method,
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
            });

            window.alert(`Patient profile has been ${isEditing ? 'updated' : 'added'} successfully.`);
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
                        <h5 className="modal-title">{isEditing ? `Edit Patient ID: ${formData.userId}` : 'Add New Patient'}</h5>
                        <button type="button" className="btn-close btn-close-white" onClick={closeModal} disabled={isLoading}></button>
                    </div>
                    <div className="modal-body">
                        {localError && (<div className="alert alert-danger" role="alert">{localError}</div>)}

                        <form onSubmit={handleSubmit}>
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Full Name (*)</label>
                                    <input type="text" className="form-control" name="fullName" value={formData.fullName} onChange={handleChange} required />
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Email (*)</label>
                                    <input type="email" className="form-control" name="email" value={formData.email} onChange={handleChange} required disabled={isEditing} />
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Phone Number (*)</label>
                                    <input type="tel" className="form-control" name="phone" value={formData.phone} onChange={handleChange} required />
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Address</label>
                                    <input type="text" className="form-control" name="address" value={formData.address} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-md-4 mb-3">
                                    <label className="form-label">City (*)</label>
                                    <select className="form-select" name="cityId" value={formData.cityId} onChange={handleChange} required>
                                        <option value="">Select City...</option>
                                        {cities.map(city => (<option key={city.id} value={city.id}>{city.name}</option>))}
                                    </select>
                                </div>
                                {!isEditing && (
                                    <>
                                        <div className="col-md-4 mb-3">
                                            <label className="form-label">Password (*)</label>
                                            <input type="password" className="form-control" name="password" value={formData.password} onChange={handleChange} required />
                                        </div>
                                        <div className="col-md-4 mb-3">
                                            <label className="form-label">Confirm Password (*)</label>
                                            <input type="password" className="form-control" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required />
                                        </div>
                                    </>
                                )}
                                {isEditing && (
                                     <div className="col-md-4 mb-3">
                                        <label className="form-label">Activation Status (*)</label>
                                        <select className="form-select" name="is_active" value={formData.is_active} onChange={handleChange} required>
                                            <option value={1}>1 - Active</option>
                                            <option value={0}>0 - Inactive</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            <button type="submit" className="btn btn-primary w-100 mt-4" disabled={isLoading}>
                                {isLoading ? 'Processing...' : isEditing ? 'Save Changes' : 'Add Patient'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};


// =======================================================
// SUB-COMPONENT: 2. MODAL VIEW DETAILS & APPOINTMENT HISTORY
// =======================================================

const PatientDetailModal = ({ user, isModalOpen, closeModal, fetchApi, cities, refreshList }) => {
    const [patientDetails, setPatientDetails] = useState(null);
    const [history, setHistory] = useState([]);
    const [isLoadingDetails, setIsLoadingDetails] = useState(true);
    const [detailError, setDetailError] = useState(null);
    const [isCancelling, setIsCancelling] = useState(false);

    const STATUS_CLASSES = {
        'BOOKED': 'bg-primary',
        'RESCHEDULED': 'bg-info',
        'CANCELLED': 'bg-danger',
        'COMPLETED': 'bg-success',
    };

    // Fetch patient details and history
    const fetchDetails = useCallback(async () => {
        if (!user?.user_id) return;
        setIsLoadingDetails(true);
        setDetailError(null);
        try {
            // API GET details returns { details: {...}, appointments: [...] }
            const data = await fetchApi(`${API_DETAIL_URL}?user_id=${user.user_id}`, { method: 'GET' });
            setPatientDetails(data.data.details);
            setHistory(data.data.appointments || []);
        } catch (err) {
            setDetailError(err.message);
        } finally {
            setIsLoadingDetails(false);
        }
    }, [user, fetchApi]);

    // Effect to fetch data when Modal opens
    useEffect(() => {
        if (isModalOpen) {
            fetchDetails();
        }
    }, [isModalOpen, fetchDetails]);
    
    // Handle Cancel Appointment (Admin on behalf of Patient)
    const handleAdminCancelAppointment = async (appointmentId) => {
        if (!window.confirm(`Admin Confirmation: Are you sure you want to CANCEL appointment #${appointmentId} for this patient?`)) return; 
        
        setIsCancelling(true);
        try {
            const payload = {
                id: appointmentId,
                actionType: 'CANCEL',
            };

            const data = await fetchApi(API_APPOINTMENT_MANAGE_URL, {
                method: 'PUT',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
            });

            window.alert(data.message || `Appointment #${appointmentId} cancelled successfully.`);
            fetchDetails(); // Reload history in modal
            refreshList();  // Reload main patient list

        } catch (err) {
            setDetailError('Cancellation error: ' + err.message);
        } finally {
            setIsCancelling(false);
        }
    };


    if (!isModalOpen || !user) return null;
    
    // Function to get city name
    const getCityName = (cityId) => {
        const city = cities.find(c => c.id === cityId);
        return city ? city.name : 'N/A';
    };

    return (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
            <div className="modal-dialog modal-xl">
                <div className="modal-content">
                    <div className="modal-header bg-primary text-white">
                        <h5 className="modal-title">Patient Profile: {user.full_name}</h5>
                        <button type="button" className="btn-close btn-close-white" onClick={closeModal}></button>
                    </div>
                    <div className="modal-body">
                        {isLoadingDetails ? (
                            <div className="text-center py-5">Loading details...</div>
                        ) : detailError ? (
                            <div className="alert alert-danger">{detailError}</div>
                        ) : (
                            <div>
                                {/* Profile Details */}
                                <h6 className="text-primary">Basic Information</h6>
                                <div className="row mb-4">
                                    <div className="col-md-4"><strong>Email:</strong> {patientDetails?.email}</div>
                                    <div className="col-md-4"><strong>Phone:</strong> {patientDetails?.phone || 'N/A'}</div>
                                    <div className="col-md-4"><strong>City:</strong> {getCityName(patientDetails?.city_id)}</div>
                                </div>
                                <div className="row mb-4">
                                    <div className="col-md-12"><strong>Address:</strong> {patientDetails?.address || 'N/A'}</div>
                                </div>

                                {/* Appointment History */}
                                <h6 className="text-primary mt-4">Appointment History ({history.length})</h6>
                                <div className="table-responsive">
                                    <table className="table table-sm table-striped">
                                        <thead className="table-light">
                                            <tr>
                                                <th>ID</th>
                                                <th>Doctor</th>
                                                <th>Date/Time</th>
                                                <th>Reason</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {history.map(app => (
                                                <tr key={app.id}>
                                                    <td>{app.id}</td>
                                                    <td>{app.doctorName}</td>
                                                    <td>{app.appointmentDate} at {app.appointmentTime}</td>
                                                    <td>{app.reason.substring(0, 30)}...</td>
                                                    <td>
                                                         <span className={`badge ${STATUS_CLASSES[app.status] || 'bg-secondary'}`}>
                                                            {app.status}
                                                         </span>
                                                    </td>
                                                    <td className='text-nowrap'>
                                                        {(app.status === 'BOOKED' || app.status === 'RESCHEDULED') && (
                                                            <button 
                                                                className="btn btn-sm btn-danger"
                                                                onClick={() => handleAdminCancelAppointment(app.id)}
                                                                disabled={isCancelling}
                                                            >
                                                                {isCancelling ? 'Cancelling...' : 'Cancel Appt'}
                                                            </button>
                                                        )}
                                                        {(app.status === 'CANCELLED' || app.status === 'COMPLETED') && (
                                                            <span className="text-muted">Ended</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={closeModal}>Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
};


// =======================================================
// COMPONENT 3: MAIN MANAGER (ADMINPATIENTMANAGER)
// =======================================================

const AdminPatientManager = () => {
    const [patients, setPatients] = useState([]);
    const [cities, setCities] = useState([]);
    const [specializations, setSpecializations] = useState([]); // Keep for future use
    
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingPatient, setEditingPatient] = useState(null); 
    const [viewingPatient, setViewingPatient] = useState(null); // Patient being viewed

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchType, setSearchType] = useState('name'); 
    const [filterActive, setFilterActive] = useState('ALL'); 
    const navigate = useNavigate();

    const fetchApi = useFetchApi();

    // ------------------- FETCH MAIN DATA -------------------
    const fetchPatients = useCallback(async () => {
        setError(null);
        setIsLoading(true);
        try {
            // Assume API GET returns: { data: { patients: [...], cities: [...] } }
            const data = await fetchApi(API_LIST_URL + '?role=PATIENT', { method: 'GET' });
            
            // Assume API returns user_id, full_name, email, user_is_active, phone, address, city_id
            setPatients(data.data.patients || []);
            setCities(data.data.cities || []);
            setSpecializations(data.data.specializations || []); // Load specs even if unused here

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [fetchApi]);

    useEffect(() => {
        fetchPatients();
    }, [fetchPatients]);


    // ------------------- SEARCH & FILTER LOGIC -------------------
    const filteredPatients = useMemo(() => {
        let result = patients;

        // Filter Active Status
        if (filterActive !== 'ALL') {
            const isActive = filterActive === 'ACTIVE' ? 1 : 0;
            result = result.filter(p => p.user_is_active === isActive);
        }

        // Search
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(p => {
                if (searchType === 'name') return p.full_name?.toLowerCase().includes(term);
                if (searchType === 'email') return p.email?.toLowerCase().includes(term);
                if (searchType === 'phone') return p.phone?.includes(term);
                if (searchType === 'id') return String(p.user_id) === term;
                return true;
            });
        }
        return result;
    }, [patients, filterActive, searchTerm, searchType]);

    const totalPages = Math.ceil(filteredPatients.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentPatients = filteredPatients.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setCurrentPage(1); 
    };

    // ------------------- ACTION LOGIC -------------------

    // 1. Lock / Unlock Account
    const handleToggleActivation = useCallback(async (patient, newStatus) => {
        const statusText = newStatus === 1 ? 'activate' : 'deactivate';
        const confirmMessage = `Are you sure you want to ${statusText} account ${patient.full_name}?`;

        if (!window.confirm(confirmMessage)) return; 

        try {
            const payload = {
                updateType: 'toggle_user_active',
                userId: patient.user_id,
                isActive: newStatus,
            };

            await fetchApi(API_LIST_URL, {
                method: 'PUT',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
            });

            setSuccessMessage(`Account ${statusText}d successfully.`);
            fetchPatients();

        } catch (err) {
            setError(err.message);
        }
    }, [fetchApi, fetchPatients]);
    
    // 2. Open Edit Modal
    const openEditModal = (patient) => {
        setEditingPatient(patient);
    };

    // 3. Open Detail Modal
    const openDetailModal = (patient) => {
        setViewingPatient(patient);
    };


    // ------------------- RENDER -------------------
    return (
        <div className="container py-5">

            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            {successMessage && <div className="alert alert-success" role="alert">{successMessage}</div>}

            <div className="card shadow-sm p-4">
                
                {/* SEARCH & FILTER BAR */}
                <form onSubmit={handleSearchSubmit}>
                <div className="d-flex flex-wrap align-items-center mb-4">
                    {/* Filter Status */}
                    <div className="d-flex align-items-center me-3 mb-2">
                        <label className="form-label mb-0 me-2">Status:</label>
                        <select 
                            className="form-select" 
                            style={{ width: '150px' }}
                            value={filterActive}
                            onChange={(e) => setFilterActive(e.target.value)}
                        >
                            <option value="ALL">All</option>
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                        </select>
                    </div>

                    {/* Filter By Attribute */}
                    <div className="d-flex me-3 mb-2" style={{ flexShrink: 0 }}>
                        <select 
                            className="form-select me-2" 
                            style={{ width: '150px' }}
                            value={searchType}
                            onChange={(e) => setSearchType(e.target.value)}
                        >
                            <option value="name">Name</option>
                            <option value="email">Email</option>
                            <option value="phone">Phone</option>
                            <option value="id">User ID</option>
                        </select>
                        <input
                            type="text"
                            className="form-control"
                            placeholder={`Search by ${searchType}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <button type="submit" className="btn btn-outline-primary me-3 mb-2">
                        <i className="bi bi-search"></i> Filter
                    </button>
                    
                    <button 
                        className="btn btn-success mb-2 ms-auto" 
                        onClick={() => navigate('/signup')}
                    >
                        <i className="bi bi-plus-lg"></i> Add Patient
                    </button>
                </div>
                </form>

                {/* Patient List Table */}
                <div className="table-responsive">
                    <table className="table table-hover align-middle">
                        <thead className="table-light">
                            <tr>
                                <th>ID</th>
                                <th>Full Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>City</th>
                                <th>Account Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-4 text-muted">Loading data...</td>
                                </tr>
                            ) : currentPatients.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-4 text-muted">No patients found.</td>
                                </tr>
                            ) : (
                                currentPatients.map(patient => (
                                    <tr key={patient.user_id}>
                                        <td>{patient.user_id}</td>
                                        <td>{patient.full_name}</td>
                                        <td>{patient.email}</td>
                                        <td>{patient.phone || 'N/A'}</td>
                                        <td>{cities.find(c => c.id === patient.city_id)?.name || 'N/A'}</td>
                                        <td>
                                            <span className={`badge ${patient.user_is_active === 1 ? 'bg-success' : 'bg-secondary'}`}>
                                                {patient.user_is_active === 1 ? 'ACTIVE' : 'INACTIVE'}
                                            </span>
                                        </td>
                                        <td className='text-nowrap'>
                                            <button 
                                                className="btn btn-sm btn-outline-info me-2"
                                                onClick={() => openDetailModal(patient)}
                                            >
                                                View Details
                                            </button>
                                            <button 
                                                className="btn btn-sm btn-outline-primary me-2"
                                                onClick={() => openEditModal(patient)}
                                            >
                                                Edit
                                            </button>
                                            <button 
                                                className={`btn btn-sm ${patient.user_is_active === 1 ? 'btn-danger' : 'btn-success'}`}
                                                onClick={() => handleToggleActivation(patient, patient.user_is_active === 1 ? 0 : 1)}
                                            >
                                                {patient.user_is_active === 1 ? 'Deactivate' : 'Activate'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="d-flex justify-content-center mt-3">
                    {/* Pagination logic remains same */}
                </div>

            </div>
            
            {/* Add Patient Modal */}
            <PatientFormModal 
                patient={null} // Don't pass patient object when adding
                mode={'add'}
                isModalOpen={isAddModalOpen}
                closeModal={() => setIsAddModalOpen(false)}
                cities={cities}
                refreshList={fetchPatients}
                fetchApi={fetchApi}
            />
            
            {/* Edit Patient Modal */}
            <PatientFormModal 
                patient={editingPatient}
                mode={'edit'}
                isModalOpen={!!editingPatient} // Open if editingPatient has value
                closeModal={() => setEditingPatient(null)}
                cities={cities}
                refreshList={fetchPatients}
                fetchApi={fetchApi}
            />
            
            {/* View Patient Detail Modal */}
            <PatientDetailModal
                user={viewingPatient}
                isModalOpen={!!viewingPatient}
                closeModal={() => setViewingPatient(null)}
                cities={cities}
                fetchApi={fetchApi}
                refreshList={fetchPatients} // Add refreshList to reload after cancelling
            />
        </div>
    );
};

export default AdminPatientManager;