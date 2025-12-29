import React, { useState, useEffect, useCallback } from 'react';

// Backend API URL (Using port 5173 for Frontend and 8888 for Backend)
const API_BASE_URL = 'http://localhost:8888/api/v1/controllers/';
const API_PROFILE_URL = API_BASE_URL + 'doctor_profile.php';
const API_AVATAR_UPLOAD_URL = 'http://localhost:8888/api/v1/upload/doctor_avatar.php';
const API_QUALIFICATION_UPLOAD_URL = 'http://localhost:8888/api/v1/upload/doctor_qualification_upload.php';

// Default form values
const initialDoctorData = {
    doctorId: null,
    fullName: '',
    email: '',
    phone: '',
    cityId: '',
    qualification: '',
    bio: '',
    profilePicture: 'https://placehold.co/120x120/AFD1E4/FFFFFF/png?text=Doctor',
};

const initialNewQualification = { 
    title: '', 
    institution: '', 
    year: '', 
    documentFile: null 
};

const DoctorProfiles = () => {
    const [activeTab, setActiveTab] = useState('personal');
    const [formData, setFormData] = useState(initialDoctorData);
    const [avatarFile, setAvatarFile] = useState(null);
    const [allCities, setAllCities] = useState([]); // Cities from DB
    
    // Specialization State
    const [allSpecializations, setAllSpecializations] = useState([]);
    const [selectedSpecializationIds, setSelectedSpecializationIds] = useState([]);

    // Qualification State
    const [qualifications, setQualifications] = useState([]);
    const [newQualification, setNewQualification] = useState(initialNewQualification);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);


    // Shared Fetch API Function
    const fetchApi = useCallback(async (url, options) => {
        
        // Configure headers for JSON or skip for FormData
        let headers = { ...(options.headers || {}) };
        if (!(options.body instanceof FormData)) {
             headers['Content-Type'] = 'application/json';
        } else {
             // For FormData, let the browser set Content-Type: multipart/form-data
             delete headers['Content-Type']; 
        }

        const response = await fetch(url, {
            ...options,
            credentials: 'include',
            headers: headers,
        });

        // 1. Check HTTP Status (Session Error, General Server Error)
        if (response.status === 401) {
            throw new Error("Session expired. Please login again.");
        }
        
        // 2. Check Content-Type before calling .json()
        const contentType = response.headers.get('content-type');
        const isJson = contentType && contentType.includes('application/json');

        if (isJson) {
            const data = await response.json();
            if (!response.ok) {
                // JSON body error from Server (e.g., 400 Bad Request, 500 Internal Server Error)
                throw new Error(data.message || 'Unknown system error.');
            }
            return data;
        }

        // 3. If not JSON (Upload successful but no JSON return, or unstructured Server error)
        if (!response.ok) {
             // Read response text to check for PHP errors
             const rawText = await response.text();
             if (rawText.length > 0) {
                 // This is where JSON errors often occur (PHP Warning/Notice)
                 throw new Error(`Update failed (Server Error: ${rawText.substring(0, 100)}...)`);
             }
             throw new Error('Update failed (Server Error).');
        }

        return {}; // Return empty object if response.ok and no JSON body (e.g., HTTP 204 No Content)
    }, []);

    // ============================================
    // 1. INITIAL DATA LOADING (useEffect)
    // ============================================
    useEffect(() => {
        const fetchProfileData = async () => {
            setError(null);
            try {
                // Load main data (Profile, Specializations, Qualifications)
                const data = await fetchApi(API_PROFILE_URL, { method: 'GET' });
                const profile = data.data;

                // Update Cities State (Mock data if API not fully ready, but logic assumes DB fetch)
                setAllCities(profile.allCities || [{ id: 1, name: 'Ho Chi Minh' }, { id: 2, name: 'Ha Noi' }]);

                // Update Form Data
                setFormData({
                    doctorId: profile.doctorId,
                    fullName: profile.fullName || '',
                    email: profile.email || '',
                    phone: profile.phone || '',
                    cityId: profile.cityId,
                    qualification: profile.qualification || '',
                    bio: profile.bio || '',
                    profilePicture: profile.profilePicture || initialDoctorData.profilePicture,
                });

                // Update Specializations
                setSelectedSpecializationIds(profile.selectedSpecializationIds || []);
                
                // Normalize available specialization list
                setAllSpecializations(profile.allSpecializations.map(spec => ({
                    ...spec,
                    checked: profile.selectedSpecializationIds.includes(spec.id)
                })));

                // Update Qualifications
                setQualifications(profile.qualifications || []);

            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        setIsLoading(true);
        fetchProfileData();
    }, [fetchApi]);


    // ============================================
    // 2. GENERAL FORM & AVATAR HANDLING
    // ============================================
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatarFile(file);
            setFormData({ ...formData, profilePicture: URL.createObjectURL(file) }); // Preview image
        }
    };
    
    const uploadAvatar = useCallback(async () => {
        setError(null);
        setSuccessMessage(null);
        if (!avatarFile) return true; // No file to upload

        const uploadFormData = new FormData();
        uploadFormData.append('avatar', avatarFile);

        try {
            const data = await fetchApi(API_AVATAR_UPLOAD_URL, {
                method: 'POST',
                body: uploadFormData,
            });
            
            // Update new avatar URL from server
            setFormData(prev => ({...prev, profilePicture: data.newAvatarUrl})); 
            setAvatarFile(null); 
            return true;
            
        } catch (err) {
            setError(err.message);
            return false;
        }
    }, [avatarFile, fetchApi]);


    // ============================================
    // 3. TAB SUBMIT HANDLERS
    // ============================================

    // Tab 1: Update Personal Information
    const handleSubmitPersonal = useCallback(async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setIsLoading(true);

        // 1. Upload Avatar first (if new file exists)
        let uploadSuccess = true;
        if (avatarFile) {
            uploadSuccess = await uploadAvatar();
        }
        if (!uploadSuccess) {
            setIsLoading(false);
            return;
        }
        
        // 2. Update text profile info
        const payload = {
            updateType: 'personal', // Used for Backend Router
            fullName: formData.fullName,
            phone: formData.phone,
            cityId: parseInt(formData.cityId),
            qualification: formData.qualification,
            bio: formData.bio,
        };

        try {
            const data = await fetchApi(API_PROFILE_URL, {
                method: 'PUT',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
            });

            setSuccessMessage(data.message || "Personal information updated successfully!");
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [formData, avatarFile, uploadAvatar, fetchApi]);


    // Tab 2: Update Specializations
    const handleSubmitSpecializations = useCallback(async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setIsLoading(true);

        if (selectedSpecializationIds.length === 0) {
             setError("Please select at least one specialization.");
             setIsLoading(false);
             return;
        }

        const payload = {
            updateType: 'specializations', // Used for Backend Router
            specializationIds: selectedSpecializationIds,
        };

        try {
            const data = await fetchApi(API_PROFILE_URL, {
                method: 'PUT',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
            });
            
            setSuccessMessage(data.message || "Specializations synchronized successfully!");
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [selectedSpecializationIds, fetchApi]);

    // === NEW FUNCTION: HANDLE QUALIFICATION DELETION ===
    const handleDeleteQualification = useCallback(async (qualificationId) => {
        if (!window.confirm("Are you sure you want to delete this qualification? This action cannot be undone.")) {
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // Using updateType 'delete_qualification' defined in PHP
            const payload = {
                updateType: 'delete_qualification',
                qualificationId: qualificationId
            };

            const data = await fetchApi(API_PROFILE_URL, {
                method: 'PUT', // Using PUT or POST to send JSON body
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
            });

            // Delete successful, update UI by filtering out the item
            setQualifications(prev => prev.filter(q => q.id !== qualificationId));
            setSuccessMessage(data.message || "Qualification deleted successfully!");

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [fetchApi]);


    // Tab 3: Add Qualification
    const handleAddQualification = useCallback(async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        if (!newQualification.title || !newQualification.institution || !newQualification.year || !newQualification.documentFile) {
             setError('Please fill in all qualification details and upload the file.');
             return;
        }
        
        setIsLoading(true);

        // 1. Upload qualification file to server (FormData)
        const uploadFormData = new FormData();
        uploadFormData.append('qualification_document', newQualification.documentFile);
        uploadFormData.append('title', newQualification.title);
        uploadFormData.append('institution', newQualification.institution);
        uploadFormData.append('year', newQualification.year);

        try {
            const data = await fetchApi(API_QUALIFICATION_UPLOAD_URL, {
                method: 'POST',
                body: uploadFormData,
            });

            // 2. Update state with new record from server
            const newRecord = {
                ...data.data, // Receive ID, URL, is_verified=0 from Server
                document_url: data.data.document_url,
                is_verified: 0,
            };
            setQualifications(prev => [...prev, newRecord]);
            setNewQualification(initialNewQualification); // Reset form
            setSuccessMessage(data.message || 'Qualification added and pending verification!');

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [newQualification, fetchApi]);

    // Handle Specialization Checkbox
    const handleSpecializationToggle = (id) => {
        setAllSpecializations(prevSpecs => prevSpecs.map(spec => 
            spec.id === id ? { ...spec, checked: !spec.checked } : spec
        ));

        setSelectedSpecializationIds(prevIds => 
            prevIds.includes(id) ? prevIds.filter(specId => specId !== id) : [...prevIds, id]
        );
    };

    // Add to DoctorProfiles component
    const handleNewQualificationChange = (e) => {
        const { name, value, files } = e.target;
        if (name === 'documentFile') {
            setNewQualification(prev => ({ ...prev, documentFile: files[0] }));
        } else {
            setNewQualification(prev => ({ ...prev, [name]: value }));
        }
    };



    if (isLoading) {
        return <div className="text-center py-5 text-primary"><i className="bi bi-arrow-clockwise fs-3 animate-spin me-2"></i>Loading doctor profile data...</div>;
    }
    
    // If critical error (e.g., 401 Unauthorized), show error
    if (error && error.includes('login again')) {
        return <div className="alert alert-danger text-center py-5">{error}</div>;
    }


    return (
        <div className="container py-5">
            {/* <h2 className="mb-4 text-success d-flex align-items-center">
                <i className="bi bi-person-badge-fill me-3"></i> Doctor Profile Management
                {formData.doctorId && <span className="badge bg-secondary ms-3">ID Doctor: {formData.doctorId}</span>}
            </h2> */}
            
            {/* Display Error/Success Messages */}
            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            {successMessage && <div className="alert alert-success" role="alert">{successMessage}</div>}

            <div className="card shadow-lg border-0">
                
                {/* NAVIGATION TABS */}
                <div className="card-header bg-white border-bottom-0 pt-3">
                    <ul className="nav nav-tabs card-header-tabs" role="tablist">
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${activeTab === 'personal' ? 'active text-primary fw-bold' : 'text-muted'}`} 
                                onClick={() => setActiveTab('personal')}
                            >
                                <i className="bi bi-person-fill me-2"></i> Personal Information
                            </button>
                        </li>
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${activeTab === 'specializations' ? 'active text-primary fw-bold' : 'text-muted'}`} 
                                onClick={() => setActiveTab('specializations')}
                            >
                                <i className="bi bi-hospital-fill me-2"></i> Specializations ({selectedSpecializationIds.length})
                            </button>
                        </li>
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${activeTab === 'qualifications' ? 'active text-primary fw-bold' : 'text-muted'}`} 
                                onClick={() => setActiveTab('qualifications')}
                            >
                                <i className="bi bi-award-fill me-2"></i> Qualifications & Verification ({qualifications.length})
                            </button>
                        </li>
                        <li className="nav-item ms-auto">
                            <button className="btn btn-sm btn-outline-warning d-flex align-items-center" style={{marginTop: '4px'}}>
                                <i className="bi bi-key-fill me-2"></i> Change Password
                            </button>
                        </li>
                    </ul>
                </div>

                <div className="card-body p-4">
                    {/* TAB CONTENT 1: PERSONAL INFORMATION */}
                    {activeTab === 'personal' && (
                        <form onSubmit={handleSubmitPersonal}>
                            <h4 className="mb-4 text-primary">Update Personal & Contact Information</h4>
                            
                            <div className="row mb-4 align-items-center">
                                {/* Avatar Section */}
                                <div className="col-md-3 text-center">
                                    <img 
                                        src={formData.profilePicture} 
                                        className="rounded-circle border border-primary p-1 mb-3" 
                                        alt="Doctor Avatar" 
                                        style={{ width: '120px', height: '120px', objectFit: 'cover' }}
                                    />
                                    <label htmlFor="avatarUpload" className="btn btn-outline-primary btn-sm d-block mx-auto" style={{maxWidth: '120px'}}>
                                        <i className="bi bi-camera-fill me-2"></i> Change Avatar
                                    </label>
                                    <input 
                                        type="file" 
                                        id="avatarUpload" 
                                        name="avatar"
                                        accept="image/*" 
                                        onChange={handleAvatarChange} 
                                        style={{ display: 'none' }}
                                    />
                                </div>

                                {/* Personal Details Form */}
                                <div className="col-md-9">
                                    <div className="row mb-3">
                                        <div className="col-md-6">
                                            <label htmlFor="fullName" className="form-label fw-bold">Full Name</label>
                                            <input type="text" className="form-control" id="fullName" name="fullName" value={formData.fullName} onChange={handleChange} required />
                                        </div>
                                        <div className="col-md-6">
                                            <label htmlFor="email" className="form-label fw-bold">Email</label>
                                            <input type="email" className="form-control" id="email" name="email" value={formData.email} onChange={handleChange} disabled />
                                            <div className="form-text">Email cannot be changed.</div>
                                        </div>
                                    </div>
                                    <div className="row mb-3">
                                        <div className="col-md-6">
                                            <label htmlFor="phone" className="form-label fw-bold">Phone Number</label>
                                            <input type="tel" className="form-control" id="phone" name="phone" value={formData.phone} onChange={handleChange} required />
                                        </div>
                                        <div className="col-md-6">
                                            <label htmlFor="cityId" className="form-label fw-bold">Working City</label>
                                            <select className="form-select" id="cityId" name="cityId" value={formData.cityId} onChange={handleChange} required>
                                                {allCities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-3">
                                <label htmlFor="qualification" className="form-label fw-bold">Qualification/Degree (Short)</label>
                                <input type="text" className="form-control" id="qualification" name="qualification" value={formData.qualification} onChange={handleChange} required />
                                <div className="form-text">e.g., MD, PhD, Dermatology Specialist.</div>
                            </div>
                            
                            <div className="mb-4">
                                <label htmlFor="bio" className="form-label fw-bold">Short Bio</label>
                                <textarea className="form-control" id="bio" name="bio" value={formData.bio} onChange={handleChange} rows="4" placeholder="Introduction about yourself, experience, expertise..."></textarea>
                                <div className="form-text">Short description, publicly visible.</div>
                            </div>

                            <button type="submit" className="btn btn-success btn-lg px-5" disabled={isLoading}>
                                <i className="bi bi-save-fill me-2"></i> {isLoading ? 'Saving...' : 'Save Personal Info'}
                            </button>
                        </form>
                    )}

                    {/* TAB CONTENT 2: SPECIALIZATIONS */}
                    {activeTab === 'specializations' && (
                        <form onSubmit={handleSubmitSpecializations}>
                            <h4 className="mb-4 text-primary">Select your Specializations</h4>
                            <p className="text-muted mb-4">
                                <i className="bi bi-info-circle-fill me-2"></i> This information is synced immediately and used for search filtering.
                            </p>
                            <div className="row row-cols-1 row-cols-md-3 g-3">
                                {allSpecializations.map(spec => (
                                    <div className="col" key={spec.id}>
                                        <div className="form-check form-check-inline form-control-lg border rounded p-3 bg-light w-100">
                                            <input 
                                                className="form-check-input mt-0 me-2" 
                                                type="checkbox" 
                                                id={`spec-${spec.id}`} 
                                                checked={spec.checked}
                                                onChange={() => handleSpecializationToggle(spec.id)}
                                                style={{transform: 'scale(1.2)'}}
                                            />
                                            <label className="form-check-label fw-bold text-dark" htmlFor={`spec-${spec.id}`}>
                                                {spec.name}
                                            </label>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button type="submit" className="btn btn-primary btn-lg mt-4 px-5" disabled={isLoading}>
                                <i className="bi bi-save-fill me-2"></i> {isLoading ? 'Syncing...' : 'Save Specializations'}
                            </button>
                        </form>
                    )}

                    {/* TAB CONTENT 3: QUALIFICATIONS & VERIFICATION */}
                    {activeTab === 'qualifications' && (
                        <div>
                            <h4 className="mb-4 text-primary">Qualifications & Verification Status</h4>
                            <p className="text-muted mb-4">
                                <i className="bi bi-exclamation-triangle-fill me-2"></i> Upload scanned qualifications. UNVERIFIED qualifications will not show the verification badge.
                            </p>
                            
                            <h5 className="mb-3 text-dark">Existing Qualifications ({qualifications.length})</h5>
                            {qualifications.length > 0 ? (
                                <div className="table-responsive">
                                    <table className="table table-hover table-bordered align-middle">
                                        <thead className="table-light">
                                            <tr>
                                                <th>Title</th>
                                                <th>Institution</th>
                                                <th>Year</th>
                                                <th>Status</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {qualifications.map(q => (
                                                <tr key={q.id}>
                                                    <td>{q.title}</td>
                                                    <td>{q.institution}</td>
                                                    <td>{q.year}</td>
                                                    <td>
                                                        {q.is_verified 
                                                            ? <span className="badge bg-success-subtle text-success border border-success-subtle"><i className="bi bi-check-circle-fill me-1"></i> Verified</span> 
                                                            : <span className="badge bg-warning-subtle text-warning border border-warning-subtle"><i className="bi bi-hourglass-split me-1"></i> Pending</span>
                                                        }
                                                    </td>
                                                    <td>
                                                        <a href={q.document_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-info me-2">
                                                            <i className="bi bi-file-earmark-text-fill me-1"></i> View File
                                                        </a>
                                                        <button 
                                                            className="btn btn-sm btn-outline-danger"
                                                            onClick={() => handleDeleteQualification(q.id)}
                                                            disabled={isLoading}
                                                        >
                                                            <i className="bi bi-trash-fill"> Delete</i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="alert alert-info" role="alert">
                                    No qualifications added yet.
                                </div>
                            )}

                            <h5 className="mt-5 mb-3 text-dark">Add New Qualification</h5>
                            <form onSubmit={handleAddQualification} className="p-4 border rounded bg-light">
                                <div className="row g-3 mb-3">
                                    <div className="col-md-6">
                                        <label htmlFor="newQualTitle" className="form-label">Degree Title (*)</label>
                                        <input type="text" className="form-control" id="newQualTitle" name="title" value={newQualification.title} onChange={handleNewQualificationChange} required />
                                    </div>
                                    <div className="col-md-4">
                                        <label htmlFor="newQualInstitution" className="form-label">Issuing Institution (*)</label>
                                        <input type="text" className="form-control" id="newQualInstitution" name="institution" value={newQualification.institution} onChange={handleNewQualificationChange} required />
                                    </div>
                                    <div className="col-md-2">
                                        <label htmlFor="newQualYear" className="form-label">Year Completed (*)</label>
                                        <input type="number" className="form-control" id="newQualYear" name="year" value={newQualification.year} onChange={handleNewQualificationChange} min="1900" max={new Date().getFullYear()} required />
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <label htmlFor="newQualDocument" className="form-label">Upload Qualification Scan (PDF/Image) (*)</label>
                                    <input type="file" className="form-control" id="newQualDocument" name="documentFile" accept=".pdf,.jpg,.jpeg,.png" onChange={handleNewQualificationChange} required />
                                    <div className="form-text">Only PDF or image files (JPG, PNG) are accepted.</div>
                                </div>
                                <button type="submit" className="btn btn-primary px-5" disabled={isLoading}>
                                    <i className="bi bi-plus-circle-fill me-2"></i> Add Qualification
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DoctorProfiles;