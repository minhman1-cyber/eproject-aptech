import React, { useState, useEffect, useCallback, useMemo } from 'react';

// Backend API URL
// Ensure the port matches your PHP server (e.g., 8888 or 80)
const API_BASE_URL = 'http://localhost:8888/api/v1/controllers/';
const API_APPOINTMENTS_URL = API_BASE_URL + 'doctor_appointment_list.php'; 

// Status Badge Classes Configuration
const STATUS_CLASSES = {
    'BOOKED': 'bg-primary',       // Blue
    'RESCHEDULED': 'bg-info',     // Light Blue
    'CANCELLED': 'bg-danger',     // Red
    'COMPLETED': 'bg-success',    // Green
};

// Filter Options
const FILTER_OPTIONS = [
    { value: 'ALL', label: 'All' },
    { value: 'BOOKED', label: 'Booked' },
    { value: 'RESCHEDULED', label: 'Rescheduled' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
];

const DoctorAppointmentList = () => {
    // --- State Management ---
    const [appointments, setAppointments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    
    // --- Filter States ---
    const [filterStatus, setFilterStatus] = useState('ALL'); 
    const [filterDate, setFilterDate] = useState(''); // YYYY-MM-DD
    const [searchTerm, setSearchTerm] = useState(''); // Search by name or ID

    // --- Helper: Shared API Fetch Function ---
    const fetchApi = useCallback(async (url, options = {}) => {
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        const response = await fetch(url, {
            ...options,
            credentials: 'include', // Important: Send Cookie/Session
            headers: headers,
        });

        // 1. Check 401 error (Session expired)
        if (response.status === 401) {
            throw new Error("Session expired. Please login again.");
        }
        
        // 2. Handle JSON response
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            if (!response.ok) {
                // Get error message from backend
                const errorMessage = (response.status === 409 ? 'Data conflict: ' : '') + (data.message || 'System error.');
                throw new Error(errorMessage);
            }
            return data;
        }
        
        // 3. Handle non-JSON errors (e.g., PHP Fatal Error outputting text)
        if (!response.ok) {
            throw new Error('Operation failed (Server Error not returning JSON).');
        }
        return {};
    }, []);

    // --- 1. Fetch Appointment List ---
    const fetchAppointments = useCallback(async () => {
        setError(null);
        setIsLoading(true);
        try {
            const data = await fetchApi(API_APPOINTMENTS_URL, { method: 'GET' });
            // API returns: { message: "...", data: { appointments: [...] } }
            setAppointments(data.data?.appointments || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [fetchApi]);

    // Call API on component mount
    useEffect(() => {
        fetchAppointments();
    }, [fetchAppointments]);

    // --- 2. Handle Actions (Cancel / Complete) ---
    const handleAction = useCallback(async (appointmentId, actionType) => {
        const actionMap = {
            'CANCEL': 'CANCEL appointment',
            'COMPLETE': 'COMPLETE appointment',
        };
        
        if (!window.confirm(`Are you sure you want to ${actionMap[actionType]} #${appointmentId}?`)) return; 
        
        try {
            setSuccessMessage(null);
            setError(null);
            setIsLoading(true);

            // Payload sent to backend
            const payload = {
                id: appointmentId,
                actionType: actionType,
            };

            // Call API with PUT method
            const data = await fetchApi(API_APPOINTMENTS_URL, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });

            setSuccessMessage(data.message || `${actionMap[actionType]} successful.`);
            
            // Reload list to update latest status
            fetchAppointments(); 

        } catch (err) {
            setError(err.message);
            setIsLoading(false); // Only turn off loading here on error, fetchAppointments handles it on success
        }
    }, [fetchApi, fetchAppointments]);

    // --- 3. Filter Logic (Client-side Filtering) ---
    const filteredAppointments = useMemo(() => {
        return appointments.filter(app => {
            // Filter by Status
            if (filterStatus !== 'ALL' && app.status !== filterStatus) {
                return false;
            }

            // Filter by Date
            if (filterDate && app.appointmentDate !== filterDate) {
                return false;
            }

            // Search by Patient Name or ID
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const matchesName = (app.patientName || '').toLowerCase().includes(term);
                const matchesId = String(app.id) === term; 
                if (!matchesName && !matchesId) {
                    return false;
                }
            }

            return true;
        });
    }, [appointments, filterStatus, filterDate, searchTerm]);
    
    // --- Render ---
    return (
        <div className="container py-5">
            <h2 className="mb-4 text-primary fw-bold">
                <i className="bi bi-calendar-check-fill me-2"></i> Appointment Management
            </h2>

            {/* Error / Success Messages */}
            {error && <div className="alert alert-danger shadow-sm" role="alert"><i className="bi bi-exclamation-triangle-fill me-2"></i>{error}</div>}
            {successMessage && <div className="alert alert-success shadow-sm" role="alert"><i className="bi bi-check-circle-fill me-2"></i>{successMessage}</div>}

            <div className="card shadow border-0 rounded-3">
                <div className="card-body p-4">
                    
                    {/* --- TOOLBAR (FILTER & SEARCH) --- */}
                    <div className="row g-3 mb-4">
                        {/* Filter Status */}
                        <div className="col-md-3 col-sm-6">
                            <label className="form-label fw-bold text-muted small">Status</label>
                            <select 
                                className="form-select" 
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                {FILTER_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Filter Date */}
                        <div className="col-md-3 col-sm-6">
                            <label className="form-label fw-bold text-muted small">Date</label>
                            <input
                                type="date"
                                className="form-control"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                            />
                        </div>
                        
                        {/* Search */}
                        <div className="col-md-6 col-sm-12">
                            <label className="form-label fw-bold text-muted small">Search</label>
                            <div className="input-group">
                                <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Patient Name or Appointment ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* --- DATA TABLE --- */}
                    <div className="table-responsive">
                        <table className="table table-hover align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th scope="col">#ID</th>
                                    <th scope="col">Patient</th>
                                    <th scope="col">Time</th>
                                    <th scope="col">Reason</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">Created At</th>
                                    <th scope="col" className="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="7" className="text-center py-5 text-muted">
                                            <div className="spinner-border text-primary me-2" role="status"></div>
                                            Loading data...
                                        </td>
                                    </tr>
                                ) : filteredAppointments.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="text-center py-5 text-muted">
                                            <i className="bi bi-inbox fs-1 d-block mb-2 opacity-50"></i>
                                            No matching appointments found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAppointments.map(app => (
                                        <tr key={app.id}>
                                            <td className="fw-bold text-muted">#{app.id}</td>
                                            <td className="fw-bold text-primary">{app.patientName}</td>
                                            <td>
                                                <div className="d-flex flex-column">
                                                    <span className="fw-bold">{app.appointmentTime}</span>
                                                    <span className="small text-muted">{app.appointmentDate}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="d-inline-block text-truncate" style={{maxWidth: '150px'}} title={app.reason}>
                                                    {app.reason}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge ${STATUS_CLASSES[app.status] || 'bg-secondary'} rounded-pill px-3`}>
                                                    {app.status}
                                                </span>
                                            </td>
                                            <td className="small text-muted">{new Date(app.createdAt).toLocaleDateString('en-US')}</td>
                                            <td className="text-end">
                                                {/* Button logic based on status */}
                                                {(app.status === 'BOOKED' || app.status === 'RESCHEDULED') && (
                                                    <div className="d-flex justify-content-end gap-2">
                                                        <button 
                                                            className="btn btn-sm btn-outline-success d-flex align-items-center"
                                                            onClick={() => handleAction(app.id, 'COMPLETE')}
                                                            disabled={isLoading}
                                                            title="Mark as Completed"
                                                        >
                                                            <i className="bi bi-check-lg me-1"></i> Done
                                                        </button>
                                                        <button 
                                                            className="btn btn-sm btn-outline-danger d-flex align-items-center" 
                                                            onClick={() => handleAction(app.id, 'CANCEL')}
                                                            disabled={isLoading}
                                                            title="Cancel this appointment"
                                                        >
                                                            <i className="bi bi-x-lg me-1"></i> Cancel
                                                        </button>
                                                    </div>
                                                )}
                                                
                                                {(app.status === 'CANCELLED' || app.status === 'COMPLETED') && (
                                                    <span className="text-muted small fst-italic">Closed</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* End Table Responsive */}
                    
                    <div className="mt-3 text-muted small text-end">
                        Total: <strong>{filteredAppointments.length}</strong> records
                    </div>

                </div>
            </div>
        </div>
    );
};

export default DoctorAppointmentList;