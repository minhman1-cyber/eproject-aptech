import React, { useState, useEffect, useCallback } from 'react';

// Backend API URL (Using port 5173 for Frontend and 8888 for Backend)
const API_BASE_URL = 'http://localhost:8888/api/v1/controllers/';
const API_LIST_URL = API_BASE_URL + 'admin_doctor_manager.php';
const API_REGISTER_URL = API_BASE_URL + 'register.php';
const API_UPDATE_URL = API_BASE_URL + 'admin_update_doctor.php'; // New API for updating

// Pagination Configuration
const ITEMS_PER_PAGE = 10;

// =======================================================
// DATA CONVERSION FUNCTION (Doctor object -> Form data)
// =======================================================

// Function to map doctor data from API to form structure
const mapDoctorToForm = (doctor) => ({
    userId: doctor.user_id, // Keep ID for update
    fullName: doctor.full_name || '',
    email: doctor.email || '',
    phone: doctor.phone || '',
    cityId: doctor.city_id || '',
    qualification: doctor.qualification || '',
    bio: doctor.bio || '',
    is_active: doctor.user_is_active, // Activation status (1/0)
    is_approved: doctor.is_active, // Approval status (APPROVED/PENDING/REJECTED)
    specializationIds: doctor.specializationIds ? doctor.specializationIds.map(id => String(id)) : [], // Must be string array for Checkbox
});


// =======================================================
// COMPONENT 1: ADD NEW DOCTOR FORM (MODAL CONTENT)
// =======================================================

const initialDoctorForm = {
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    cityId: '',
    qualification: '',
    bio: '',
    specializationIds: [], 
};

const AddDoctorForm = ({ isModalOpen, closeModal, cities, specializations, refreshList }) => {
    // Step 1: Basic, Step 2: Details
    const [step, setStep] = useState(1); 
    const [formData, setFormData] = useState(initialDoctorForm);
    const [localError, setLocalError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Reset form when modal opens/closes
    useEffect(() => {
        if (isModalOpen) {
            setFormData(initialDoctorForm);
            setStep(1);
            setLocalError('');
        }
    }, [isModalOpen]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleNextStep = (e) => {
        e.preventDefault();
        setLocalError('');

        if (step === 1) {
            // Validate required fields in step 1
            if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
                setLocalError('Please fill in Full Name, Email, and Password.');
                return;
            }
            if (formData.password !== formData.confirmPassword) {
                setLocalError('Confirm password does not match.');
                return;
            }
            setStep(2);
        }
    };
    
    // Handle Specialization Checkbox
    const handleSpecializationToggle = (id) => {
        setFormData(prevData => {
            const currentSpecs = prevData.specializationIds;
            const specIdStr = String(id);
            if (currentSpecs.includes(specIdStr)) {
                return {
                    ...prevData,
                    specializationIds: currentSpecs.filter(spec => spec !== specIdStr)
                };
            }
            return {
                ...prevData,
                specializationIds: [...currentSpecs, specIdStr]
            };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');
        setIsLoading(true);

        // Validate required fields in step 2
        if (!formData.phone || !formData.cityId || formData.specializationIds.length === 0 || !formData.qualification) {
            setLocalError('Please fill in Phone, City, Specialization, and Qualification.');
            setIsLoading(false);
            return;
        }

        // Prepare Payload for register.php API
        const payload = {
            full_name: formData.fullName,
            email: formData.email,
            password: formData.password,
            role: 'DOCTOR', // Fixed role
            city_id: parseInt(formData.cityId),
            doctor_phone: formData.phone,
            doctor_qualification: formData.qualification,
            doctor_bio: formData.bio,
            specialization_ids: formData.specializationIds.map(Number), // Convert to integer array
        };

        try {
            const response = await fetch(API_REGISTER_URL, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed. System error.');
            }

            // Use window.alert for visibility
            window.alert(`Doctor ${formData.fullName} registered successfully! Account is pending approval.`);
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
                    <div className="modal-header bg-success text-white">
                        <h5 className="modal-title">Add New Doctor</h5>
                        <button type="button" className="btn-close btn-close-white" onClick={closeModal} disabled={isLoading}></button>
                    </div>
                    <div className="modal-body">
                        {/* Stepper */}
                        <div className="d-flex justify-content-between mb-4">
                            <span className={`badge p-2 ${step === 1 ? 'bg-primary' : 'bg-secondary'}`}>1. Basic Account</span>
                            <span className={`badge p-2 ${step === 2 ? 'bg-primary' : 'bg-secondary'}`}>2. Professional Details</span>
                        </div>
                        
                        {localError && (
                            <div className="alert alert-danger" role="alert">{localError}</div>
                        )}

                        <form onSubmit={step === 2 ? handleSubmit : handleNextStep}>
                            
                            {/* STEP 1: Basic Account */}
                            {step === 1 && (
                                <>
                                    <div className="row">
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Full Name (*)</label>
                                            <input type="text" className="form-control" name="fullName" value={formData.fullName} onChange={handleChange} required />
                                        </div>
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Email (*)</label>
                                            <input type="email" className="form-control" name="email" value={formData.email} onChange={handleChange} required />
                                        </div>
                                    </div>
                                    <div className="row">
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Password (*)</label>
                                            <input type="password" className="form-control" name="password" value={formData.password} onChange={handleChange} required minLength="8" />
                                        </div>
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Confirm Password (*)</label>
                                            <input type="password" className="form-control" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required />
                                        </div>
                                    </div>
                                    <button type="submit" className="btn btn-primary w-100 mt-3" disabled={isLoading}>
                                        Next
                                    </button>
                                </>
                            )}

                            {/* STEP 2: Professional Details */}
                            {step === 2 && (
                                <>
                                    <div className="row">
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Phone Number (*)</label>
                                            <input type="tel" className="form-control" name="phone" value={formData.phone} onChange={handleChange} required />
                                        </div>
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Working City (*)</label>
                                            <select className="form-select" name="cityId" value={formData.cityId} onChange={handleChange} required>
                                                <option value="">Select City...</option>
                                                {cities.map(city => (<option key={city.id} value={city.id}>{city.name}</option>))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label d-block">Registered Specializations (*)</label>
                                        <div className="border p-3 rounded bg-light overflow-auto" style={{ maxHeight: '150px' }}>
                                            {specializations.map(spec => (
                                                <div className="form-check form-check-inline" key={spec.id}>
                                                    <input
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        id={`modal-add-spec-${spec.id}`}
                                                        checked={formData.specializationIds.includes(String(spec.id))}
                                                        onChange={() => handleSpecializationToggle(spec.id)}
                                                    />
                                                    <label className="form-check-label" htmlFor={`modal-add-spec-${spec.id}`}>{spec.name}</label>
                                                </div>
                                            ))}
                                        </div>
                                        {formData.specializationIds.length === 0 && <small className="text-danger">Please select at least one specialization.</small>}
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Qualification/Degree (*)</label>
                                        <input type="text" className="form-control" name="qualification" value={formData.qualification} onChange={handleChange} required />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Short Bio</label>
                                        <textarea className="form-control" name="bio" value={formData.bio} onChange={handleChange} rows="2"></textarea>
                                    </div>

                                    <div className="d-flex justify-content-between mt-4">
                                        <button type="button" className="btn btn-secondary" onClick={() => setStep(1)} disabled={isLoading}>
                                            Back
                                        </button>
                                        <button type="submit" className="btn btn-success" disabled={isLoading}>
                                            {isLoading ? 'Adding...' : 'Finish Adding Doctor'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};


// =======================================================
// COMPONENT 2: EDIT DOCTOR FORM (MODAL CONTENT)
// =======================================================

const EditDoctorModal = ({ doctor, closeModal, cities, specializations, refreshList, updateDoctorApi }) => {
    const [formData, setFormData] = useState({});
    const [localError, setLocalError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Initialize form data from doctor prop when modal opens
    useEffect(() => {
        if (doctor) {
            console.log(doctor);
            setFormData(mapDoctorToForm(doctor));
            console.log(formData.cityId);
            setLocalError('');
        }
    }, [doctor]);

    // Do not render if no doctor is being edited
    if (!doctor) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Handle Specialization Checkbox
    const handleSpecializationToggle = (id) => {
        const specIdStr = String(id);
        setFormData(prevData => {
            const currentSpecs = prevData.specializationIds;
            if (currentSpecs.includes(specIdStr)) {
                return {
                    ...prevData,
                    specializationIds: currentSpecs.filter(spec => spec !== specIdStr)
                };
            }
            return {
                ...prevData,
                specializationIds: [...currentSpecs, specIdStr]
            };
        });
    };

    // Handle Approval Status Change
    const handleApprovalChange = (e) => {
        setFormData({ ...formData, is_approved: e.target.value });
    };
    
    // Handle Activation Status Change
    const handleActiveChange = (e) => {
        // Ensure value is a number (1 or 0)
        setFormData({ ...formData, is_active: parseInt(e.target.value, 10) });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');
        setIsLoading(true);

        // Validation check
        if (!formData.fullName || !formData.email || !formData.phone || !formData.cityId || formData.specializationIds.length === 0 || !formData.qualification) {
            setLocalError('Please fill in all required fields.');
            setIsLoading(false);
            return;
        }

        // Prepare Payload for update API
        const payload = {
            updateType: 'update_doctor_details',
            userId: formData.userId,
            fullName: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            cityId: parseInt(formData.cityId, 10),
            qualification: formData.qualification,
            bio: formData.bio,
            specializationIds: formData.specializationIds.map(Number),
            isApproved: formData.is_approved,
            isActive: formData.is_active,
        };

        try {
            const data = await updateDoctorApi(API_UPDATE_URL, {
                method: 'PUT',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
            });

            window.alert(data.message || `Updated Doctor ${formData.fullName} (ID: ${formData.userId}) successfully!`);
            refreshList(); // Reload list
            closeModal();

        } catch (err) {
            setLocalError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header bg-info text-white">
                        <h5 className="modal-title">Edit Doctor Info (ID: {formData.userId})</h5>
                        <button type="button" className="btn-close btn-close-white" onClick={closeModal} disabled={isLoading}></button>
                    </div>
                    <div className="modal-body">
                        {localError && (
                            <div className="alert alert-danger" role="alert">{localError}</div>
                        )}
                        
                        <form onSubmit={handleSubmit}>
                            {/* Basic Info */}
                            <h6 className="text-primary mb-3">1. Personal & Contact Info</h6>
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Full Name (*)</label>
                                    <input type="text" className="form-control" name="fullName" value={formData.fullName || ''} onChange={handleChange} required />
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Email (*)</label>
                                    <input type="email" className="form-control" name="email" value={formData.email || ''} onChange={handleChange} required />
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Phone Number (*)</label>
                                    <input type="tel" className="form-control" name="phone" value={formData.phone || ''} onChange={handleChange} required />
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Working City (*)</label>
                                    <select className="form-select" name="cityId" value={formData.cityId || ''} onChange={handleChange} required>
                                            <option value="">Select City...</option>
                                            {cities.map(city => (<option key={city.id} value={city.id}>{city.name}</option>))}
                                    </select>
                                </div>
                            </div>
                            
                            {/* Professional Info */}
                            <h6 className="text-primary my-3">2. Professional Info</h6>
                            <div className="mb-3">
                                <label className="form-label">Qualification/Degree (*)</label>
                                <input type="text" className="form-control" name="qualification" value={formData.qualification || ''} onChange={handleChange} required />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Short Bio</label>
                                <textarea className="form-control" name="bio" value={formData.bio || ''} onChange={handleChange} rows="2"></textarea>
                            </div>
                            <div className="mb-3">
                                <label className="form-label d-block">Registered Specializations (*)</label>
                                <div className="border p-3 rounded bg-light overflow-auto" style={{ maxHeight: '150px' }}>
                                    {specializations.map(spec => (
                                        <div className="form-check form-check-inline" key={spec.id}>
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                id={`modal-edit-spec-${spec.id}`}
                                                checked={formData.specializationIds?.includes(String(spec.id)) || false}
                                                onChange={() => handleSpecializationToggle(spec.id)}
                                            />
                                            <label className="form-check-label" htmlFor={`modal-edit-spec-${spec.id}`}>{spec.name}</label>
                                        </div>
                                    ))}
                                </div>
                                {formData.specializationIds?.length === 0 && <small className="text-danger">Please select at least one specialization.</small>}
                            </div>

                            {/* Admin Status */}
                            <h6 className="text-primary my-3">3. Admin Settings</h6>
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Profile Approval Status (*)</label>
                                    <select className="form-select" name="is_approved" value={formData.is_approved || 'PENDING'} onChange={handleApprovalChange} required>
                                        <option value="PENDING">PENDING</option>
                                        <option value="APPROVED">APPROVED</option>
                                        <option value="REJECTED">REJECTED</option>
                                    </select>
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Account Status (*)</label>
                                    <select className="form-select" name="is_active" value={formData.is_active !== undefined ? formData.is_active : 1} onChange={handleActiveChange} required>
                                        <option value={1}>1 - Active</option>
                                        <option value={0}>0 - Inactive</option>
                                    </select>
                                </div>
                            </div>

                            <button type="submit" className="btn btn-info text-white w-100 mt-4" disabled={isLoading}>
                                {isLoading ? 'Updating...' : 'Update Doctor Info'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};


// =======================================================
// COMPONENT 3: MAIN MANAGER (ADMINDOCTORMANAGER)
// =======================================================

const AdminDoctorManager = () => {
    const [doctors, setDoctors] = useState([]);
    const [cities, setCities] = useState([]);
    const [specializations, setSpecializations] = useState([]);
    
    // Add New Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    
    // Edit Modal State
    const [editingDoctor, setEditingDoctor] = useState(null); // Stores Doctor object being edited
    
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchType, setSearchType] = useState('name'); // 'name' or 'id'

    // Shared FETCH API Function (Keep safe fetch logic)
    const fetchApi = useCallback(async (url, options) => {
        let headers = { ...(options.headers || {}) };
        if (!(options.body instanceof FormData)) {
             headers['Content-Type'] = 'application/json';
        }
        
        const response = await fetch(url, {
            ...options,
            credentials: 'include',
            headers: headers,
        });

        if (response.status === 401) {
            throw new Error("Session expired. Please login again as Admin.");
        }
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Unknown system error.');
            }
            return data;
        }
        
        if (!response.ok) {
            throw new Error('Update failed (Server Error).');
        }
        return {};
    }, []);

    // ------------------- FETCH MAIN DATA -------------------
    const fetchDoctors = useCallback(async () => {
        setError(null);
        setIsLoading(true);
        try {
            const data = await fetchApi(API_LIST_URL, { method: 'GET' });
            
            // Convert specializationIds from string/null/number[] to string array (for Checkbox)
            const mappedDoctors = (data.data.doctors || []).map(doctor => ({
                ...doctor,
                specializationIds: (doctor.specializationIds || []).map(String),
                city_id: String(doctor.city_id) // Ensure city_id is string
            }));

            setDoctors(mappedDoctors);
            setCities(data.data.cities || []);
            setSpecializations(data.data.specializations || []);

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [fetchApi]);

    useEffect(() => {
        fetchDoctors();
    }, [fetchDoctors]);


    // ------------------- SEARCH & PAGINATION LOGIC -------------------
    const filteredDoctors = doctors.filter(doctor => {
        if (!searchTerm) return true;

        const term = searchTerm.toLowerCase();
        
        if (searchType === 'name') {
            return doctor.full_name.toLowerCase().includes(term);
        } else if (searchType === 'id') {
            // Search by user_id (integer)
            return String(doctor.user_id) === term; 
        }
        return true;
    });

    const totalPages = Math.ceil(filteredDoctors.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentDoctors = filteredDoctors.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handleSearch = () => {
        setCurrentPage(1); // Reset to page 1 when searching
    };

    // ------------------- ACTION LOGIC -------------------

    // Open Edit Modal
    const handleEditDoctor = (doctor) => {
        setEditingDoctor(doctor);
    };

    // Close Edit Modal
    const closeEditModal = () => {
        setEditingDoctor(null);
    };

    // Activate/Deactivate Account
    const handleToggleActivation = useCallback(async (userId, currentStatus) => {
        const newStatus = currentStatus === 1 ? 0 : 1;
        const confirmMessage = newStatus === 0 
            ? 'Are you sure you want to DEACTIVATE this account?' 
            : 'Are you sure you want to REACTIVATE this account?';

        // NOTE: Using window.confirm() for Admin tasks
        if (!window.confirm(confirmMessage)) return; 

        try {
            const payload = {
                updateType: 'toggle_user_active',
                userId: userId,
                isActive: newStatus,
            };

            const data = await fetchApi(API_LIST_URL, {
                method: 'PUT',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
            });

            setSuccessMessage(data.message || 'Status updated successfully.');
            fetchDoctors(); // Reload list after update

        } catch (err) {
            setError(err.message);
        }
    }, [fetchApi, fetchDoctors]);
    

    // ------------------- RENDER -------------------
    return (
        <div className="container py-5">

            {/* Error/Success Messages */}
            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            {successMessage && <div className="alert alert-success" role="alert">{successMessage}</div>}

            <div className="card shadow-sm p-4">
                {/* Search and Add New */}
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div className="d-flex">
                        {/* Search Combobox */}
                        <select 
                            className="form-select me-2" 
                            style={{ width: '160px' }}
                            value={searchType}
                            onChange={(e) => setSearchType(e.target.value)}
                        >
                            <option value="name">Search by Name</option>
                            <option value="id">Search by ID</option>
                        </select>
                        {/* Search Input */}
                        <input 
                            type="text" 
                            className="form-control me-2" 
                            placeholder={`Enter ${searchType === 'name' ? 'name' : 'ID'}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button className="btn btn-outline-primary" onClick={handleSearch}>
                            <i className="bi bi-search"></i> Search
                        </button>
                    </div>

                    {/* Add New Button */}
                    <button 
                        className="btn btn-success" 
                        onClick={() => setIsAddModalOpen(true)}
                    >
                        <i className="bi bi-plus-lg"></i> Add New Doctor
                    </button>
                </div>

                {/* Doctor List Table */}
                <div className="table-responsive">
                    <table className="table table-hover align-middle">
                        <thead className="table-light">
                            <tr>
                                <th>ID</th>
                                <th>Full Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Specializations</th>
                                <th>Approval Status</th>
                                <th>Account Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="8" className="text-center py-4 text-muted">Loading data...</td>
                                </tr>
                            ) : currentDoctors.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="text-center py-4 text-muted">No doctors found.</td>
                                </tr>
                            ) : (
                                currentDoctors.map(doctor => (
                                    <tr key={doctor.user_id}>
                                        <td>{doctor.user_id}</td>
                                        <td>{doctor.full_name}</td>
                                        <td>{doctor.email}</td>
                                        <td>{doctor.phone || 'N/A'}</td>
                                        <td>
                                            {doctor.specializationIds.length > 0 ? doctor.specializationIds.length : 0} Specializations
                                        </td>
                                        <td>
                                            <span className={`badge ${doctor.is_active === 'APPROVED' ? 'bg-success' : doctor.is_active === 'PENDING' ? 'bg-warning text-dark' : 'bg-danger'}`}>
                                                {doctor.is_active}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${doctor.user_is_active === 1 ? 'bg-success' : 'bg-secondary'}`}>
                                                {doctor.user_is_active === 1 ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            {/* EDIT Button */}
                                            <button 
                                                className="btn btn-sm btn-info me-2 text-white"
                                                onClick={() => handleEditDoctor(doctor)}
                                            >
                                                <i className="bi bi-pencil-square"></i> Edit
                                            </button>
                                            {/* ACTIVATE/DEACTIVATE Button */}
                                            <button 
                                                className={`btn btn-sm ${doctor.user_is_active === 1 ? 'btn-secondary' : 'btn-success'}`}
                                                onClick={() => handleToggleActivation(doctor.user_id, doctor.user_is_active)}
                                            >
                                                {doctor.user_is_active === 1 ? 'Deactivate' : 'Activate'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="d-flex justify-content-between align-items-center mt-3">
                    <div>
                        Showing {currentDoctors.length} of {filteredDoctors.length} results.
                    </div>
                    <nav>
                        <ul className="pagination mb-0">
                            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                <button className="page-link" onClick={() => setCurrentPage(currentPage - 1)}>Previous</button>
                            </li>
                            {[...Array(totalPages)].map((_, index) => (
                                <li key={index} className={`page-item ${currentPage === index + 1 ? 'active' : ''}`}>
                                    <button className="page-link" onClick={() => setCurrentPage(index + 1)}>
                                        {index + 1}
                                    </button>
                                </li>
                            ))}
                            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                <button className="page-link" onClick={() => setCurrentPage(currentPage + 1)}>Next</button>
                            </li>
                        </ul>
                    </nav>
                </div>

            </div>
            
            {/* Add Doctor Modal Component */}
            <AddDoctorForm 
                isModalOpen={isAddModalOpen}
                closeModal={() => setIsAddModalOpen(false)}
                cities={cities}
                specializations={specializations}
                refreshList={fetchDoctors}
            />

            {/* Edit Doctor Modal Component */}
            <EditDoctorModal
                doctor={editingDoctor}
                closeModal={closeEditModal}
                cities={cities}
                specializations={specializations}
                refreshList={fetchDoctors}
                updateDoctorApi={fetchApi} // Pass fetchApi for update
            />
        </div>
    );
};

export default AdminDoctorManager;