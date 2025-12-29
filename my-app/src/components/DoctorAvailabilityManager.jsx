import React, { useState, useEffect, useCallback } from 'react';

// Backend API URL
const API_BASE_URL = 'http://localhost:8888/api/v1/controllers/';
const API_AVAILABILITY_URL = API_BASE_URL + 'doctor_availability.php'; 

// Days of week configuration
const DAYS_OF_WEEK = [
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
    { value: 0, label: 'Sun' },
];

const initialFormState = {
    startDate: '',      // YYYY-MM-DD
    endDate: '',        // YYYY-MM-DD
    startTime: '08:00',
    endTime: '17:00',
    daysOfWeek: [1, 2, 3, 4, 5], // Default Mon-Fri
    duration: 30        // Default 30 mins
};

const DoctorAvailabilityManager = () => {
    // --- Mode State ---
    const [mode, setMode] = useState('CREATE'); // 'CREATE' or 'LOCK' (Time off)
    const [lockDate, setLockDate] = useState(''); // Date to lock entirely

    // --- Create Form State ---
    const [formData, setFormData] = useState(initialFormState);
    
    // --- View List State ---
    const [availabilityList, setAvailabilityList] = useState([]);
    const [viewStartDate, setViewStartDate] = useState(new Date().toISOString().split('T')[0]); // View from today
    const [viewEndDate, setViewEndDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 14); // Default view next 2 weeks
        return d.toISOString().split('T')[0];
    });

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // --- Helper: Shared API Fetch ---
    const fetchApi = useCallback(async (url, options = {}) => {
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        const response = await fetch(url, {
            ...options,
            credentials: 'include',
            headers: headers,
        });

        if (response.status === 401) {
            throw new Error("Session expired. Please login again.");
        }
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'System error.');
            }
            return data;
        }
        
        if (!response.ok) {
            throw new Error('Operation failed (Server Error).');
        }
        return {};
    }, []);

    // ============================================
    // 1. FETCH AVAILABILITY SLOTS (GET)
    // ============================================
    const fetchAvailability = useCallback(async () => {
        setError(null);
        setIsLoading(true);
        try {
            // Send query params to filter by view date range
            const queryParams = new URLSearchParams({
                start: viewStartDate,
                end: viewEndDate
            }).toString();

            const data = await fetchApi(`${API_AVAILABILITY_URL}?${queryParams}`, { method: 'GET' });
            setAvailabilityList(data.data || []);
            
        } catch (err) {
            setError('Error loading schedule: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    }, [fetchApi, viewStartDate, viewEndDate]);

    useEffect(() => {
        fetchAvailability();
    }, [fetchAvailability]);

    // ============================================
    // 2. HANDLE CREATE FORM (POST)
    // ============================================
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleDayToggle = (dayValue) => {
        setFormData(prev => {
            const currentDays = prev.daysOfWeek;
            const dayNum = parseInt(dayValue); 
            if (currentDays.includes(dayNum)) {
                return { ...prev, daysOfWeek: currentDays.filter(day => day !== dayNum) };
            } else {
                return { ...prev, daysOfWeek: [...currentDays, dayNum].sort((a, b) => a - b) };
            }
        });
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        
        const { startDate, endDate, startTime, endTime, daysOfWeek } = formData;

        // Frontend Validation
        if (!startDate || !endDate) return setError("Please select Start Date and End Date.");
        if (new Date(startDate) > new Date(endDate)) return setError("End date must be after start date.");
        if (!startTime || !endTime) return setError("Please select working hours.");
        if (daysOfWeek.length === 0) return setError("Please select at least one day of the week.");

        try {
            setIsSubmitting(true);
            const payload = { startDate, endDate, daysOfWeek, startTime, endTime, duration: 30 };
            
            const res = await fetchApi(API_AVAILABILITY_URL, { 
                method: 'POST', 
                body: JSON.stringify(payload) 
            });

            setSuccessMessage(res.message || "Schedule created successfully!");
            fetchAvailability(); 

        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ============================================
    // 3. HANDLE LOCK / UNLOCK DAY (PUT)
    // ============================================
    const handleLockDaySubmit = async (e, type) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        if (!lockDate) return setError("Please select a date.");
        
        const actionText = type === 'LOCK' ? 'LOCK' : 'UNLOCK';
        if (!window.confirm(`Are you sure you want to ${actionText} all EMPTY slots on ${lockDate}? (Booked slots will not be affected)`)) return;

        try {
            setIsSubmitting(true);
            const payload = {
                action: 'lock_day',
                date: lockDate,
                type: type // 'LOCK' or 'UNLOCK'
            };

            const res = await fetchApi(API_AVAILABILITY_URL, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });

            setSuccessMessage(res.message);
            fetchAvailability();

        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ============================================
    // 4. HANDLE TOGGLE SINGLE SLOT LOCK (PUT)
    // ============================================
    const handleToggleSlotLock = async (id, currentStatus) => {
        // currentStatus: 1 (Locked) -> Want to unlock (0)
        // currentStatus: 0 (Open) -> Want to lock (1)
        const newStatus = parseInt(currentStatus) === 1 ? 0 : 1;
        
        try {
            // Optimistic update
            setAvailabilityList(prev => prev.map(item => 
                item.id === id ? { ...item, is_locked: newStatus } : item
            ));

            await fetchApi(API_AVAILABILITY_URL, {
                method: 'PUT',
                body: JSON.stringify({
                    action: 'toggle_slot',
                    id: id,
                    is_locked: newStatus
                })
            });

        } catch (err) {
            setError("Error updating status: " + err.message);
            fetchAvailability(); // Revert on error
        }
    };

    // ============================================
    // 5. HANDLE DELETE SLOT (DELETE)
    // ============================================
    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to permanently delete this slot?")) return;
        
        try {
            await fetchApi(API_AVAILABILITY_URL, { 
                method: 'DELETE', 
                body: JSON.stringify({ id: id })
            });
            
            setAvailabilityList(prev => prev.filter(item => item.id !== id));
            setSuccessMessage("Slot deleted successfully.");
            
        } catch (err) {
            setError(err.message);
        }
    };

    // Helper: Format date/time display
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const dayOfWeek = DAYS_OF_WEEK.find(d => d.value === date.getDay())?.label || '';
        return `${dayOfWeek}, ${date.toLocaleDateString('en-US')}`;
    };

    const formatTime = (timeStr) => {
        return timeStr ? timeStr.substring(0, 5) : '';
    };

    // ============================================
    // 6. RENDER UI
    // ============================================
    const { daysOfWeek } = formData;

    return (
        <div className="container py-5">
            
            {error && <div className="alert alert-danger shadow-sm" role="alert"><i className="bi bi-exclamation-triangle-fill me-2"></i>{error}</div>}
            {successMessage && <div className="alert alert-success shadow-sm" role="alert"><i className="bi bi-check-circle-fill me-2"></i>{successMessage}</div>}

            <div className="row g-4">
                {/* ---------------- LEFT COL: CONTROLS (CREATE / LOCK) ---------------- */}
                <div className="col-lg-5">
                    <div className="card shadow border-0 h-100">
                        {/* Tabs */}
                        <div className="card-header bg-white p-0">
                            <ul className="nav nav-tabs card-header-tabs m-0 row g-0">
                                <li className="nav-item col-6 text-center">
                                    <button 
                                        className={`nav-link w-100 py-3 border-0 rounded-0 ${mode === 'CREATE' ? 'active fw-bold text-primary border-bottom border-primary border-3' : 'text-muted'}`}
                                        onClick={() => setMode('CREATE')}
                                    >
                                        <i className="bi bi-calendar-plus me-2"></i>Create Schedule
                                    </button>
                                </li>
                                <li className="nav-item col-6 text-center">
                                    <button 
                                        className={`nav-link w-100 py-3 border-0 rounded-0 ${mode === 'LOCK' ? 'active fw-bold text-danger border-bottom border-danger border-3' : 'text-muted'}`}
                                        onClick={() => setMode('LOCK')}
                                    >
                                        <i className="bi bi-slash-circle me-2"></i>Time Off / Lock Day
                                    </button>
                                </li>
                            </ul>
                        </div>

                        <div className="card-body p-4">
                            {mode === 'CREATE' ? (
                                /* --- CREATE FORM --- */
                                <form onSubmit={handleCreateSubmit}>
                                    <div className="mb-3">
                                        <label className="form-label fw-bold text-muted small">Date Range</label>
                                        <div className="input-group mb-2">
                                            <span className="input-group-text">From</span>
                                            <input type="date" className="form-control" name="startDate" value={formData.startDate} onChange={handleChange} required />
                                        </div>
                                        <div className="input-group">
                                            <span className="input-group-text">To</span>
                                            <input type="date" className="form-control" name="endDate" value={formData.endDate} onChange={handleChange} required />
                                        </div>
                                        <div className="form-text">Slots will be created for all selected days within this range.</div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-bold text-muted small">Working Hours (30min/slot)</label>
                                        <div className="d-flex gap-2">
                                            <div className="flex-grow-1">
                                                <input type="time" className="form-control" name="startTime" value={formData.startTime} onChange={handleChange} required />
                                            </div>
                                            <div className="d-flex align-items-center">-</div>
                                            <div className="flex-grow-1">
                                                <input type="time" className="form-control" name="endTime" value={formData.endTime} onChange={handleChange} required />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <label className="form-label fw-bold text-muted small">Apply to Days</label>
                                        <div className="d-flex flex-wrap gap-2">
                                            {DAYS_OF_WEEK.map(day => (
                                                <div key={day.value} className="form-check form-check-inline m-0">
                                                    <input
                                                        className="btn-check"
                                                        type="checkbox"
                                                        id={`day-${day.value}`}
                                                        checked={daysOfWeek.includes(day.value)} 
                                                        onChange={() => handleDayToggle(day.value)}
                                                    />
                                                    <label 
                                                        className={`btn btn-sm ${daysOfWeek.includes(day.value) ? 'btn-primary' : 'btn-outline-secondary'}`} 
                                                        htmlFor={`day-${day.value}`}
                                                        style={{minWidth: '60px'}}
                                                    >
                                                        {day.label}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <button type="submit" className="btn btn-primary w-100 py-2" disabled={isSubmitting}>
                                        {isSubmitting ? <span className="spinner-border spinner-border-sm"></span> : <span><i className="bi bi-save me-2"></i> Save Schedule</span>}
                                    </button>
                                </form>
                            ) : (
                                /* --- LOCK FORM --- */
                                <div>
                                    <div className="alert alert-warning border-0 bg-warning bg-opacity-10 text-warning-emphasis small">
                                        <i className="bi bi-info-circle-fill me-2"></i>
                                        This feature allows you to quickly lock availability for a specific day (e.g., for sickness or sudden leave). <strong>Booked slots will not be affected.</strong>
                                    </div>
                                    
                                    <div className="mb-4">
                                        <label className="form-label fw-bold">Select Date:</label>
                                        <input 
                                            type="date" 
                                            className="form-control form-control-lg border-danger" 
                                            value={lockDate} 
                                            onChange={(e) => setLockDate(e.target.value)} 
                                        />
                                    </div>

                                    <div className="d-grid gap-3">
                                        <button 
                                            onClick={(e) => handleLockDaySubmit(e, 'LOCK')} 
                                            className="btn btn-danger py-2" 
                                            disabled={isSubmitting || !lockDate}
                                        >
                                            <i className="bi bi-lock-fill me-2"></i> Lock Entire Day
                                        </button>
                                        
                                        <button 
                                            onClick={(e) => handleLockDaySubmit(e, 'UNLOCK')} 
                                            className="btn btn-outline-secondary py-2" 
                                            disabled={isSubmitting || !lockDate}
                                        >
                                            <i className="bi bi-unlock-fill me-2"></i> Unlock Day (If available again)
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* ---------------- RIGHT COL: SLOT LIST ---------------- */}
                <div className="col-lg-7">
                    <div className="card shadow border-0 h-100">
                        <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
                            <h5 className="mb-0 text-primary fw-bold"><i className="bi bi-list-ul me-2"></i>Slot List</h5>
                            
                            {/* Quick View Filters */}
                            <div className="d-flex gap-2 align-items-center">
                                <input 
                                    type="date" 
                                    className="form-control form-control-sm" 
                                    value={viewStartDate}
                                    onChange={(e) => setViewStartDate(e.target.value)}
                                />
                                <span>-</span>
                                <input 
                                    type="date" 
                                    className="form-control form-control-sm" 
                                    value={viewEndDate}
                                    onChange={(e) => setViewEndDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="card-body p-0">
                            <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                                <table className="table table-hover table-striped mb-0 align-middle">
                                    <thead className="table-light sticky-top">
                                        <tr>
                                            <th>Date</th>
                                            <th>Time Range</th>
                                            <th>Status</th>
                                            <th className="text-end">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isLoading ? (
                                            <tr><td colSpan="4" className="text-center py-5 text-muted">Loading data...</td></tr>
                                        ) : availabilityList.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="text-center py-5 text-muted">
                                                    <i className="bi bi-calendar-x fs-1 d-block mb-2 opacity-50"></i>
                                                    No slots found in this date range.
                                                </td>
                                            </tr>
                                        ) : (
                                            availabilityList.map((item) => (
                                                <tr key={item.id} className={parseInt(item.is_locked) === 1 ? 'table-secondary text-muted' : ''}>
                                                    <td className="fw-bold small">{formatDate(item.date)}</td>
                                                    <td>
                                                        <span className="badge bg-light text-dark border">
                                                            {formatTime(item.start_time)} - {formatTime(item.end_time)}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {parseInt(item.is_booked) === 1 ? (
                                                            <span className="badge bg-warning text-dark"><i className="bi bi-person-check-fill me-1"></i>Booked</span>
                                                        ) : parseInt(item.is_locked) === 1 ? (
                                                            <span className="badge bg-secondary"><i className="bi bi-lock-fill me-1"></i>Locked</span>
                                                        ) : (
                                                            <span className="badge bg-success"><i className="bi bi-check-circle me-1"></i>Available</span>
                                                        )}
                                                    </td>
                                                    <td className="text-end">
                                                        {/* Lock/Unlock Button */}
                                                        <button 
                                                            className={`btn btn-sm me-1 ${parseInt(item.is_locked) === 1 ? 'btn-secondary' : 'btn-outline-warning'}`} 
                                                            onClick={() => handleToggleSlotLock(item.id, item.is_locked)}
                                                            disabled={parseInt(item.is_booked) === 1} 
                                                            title={parseInt(item.is_locked) === 1 ? "Unlock this slot" : "Lock this slot (Unavailable)"}
                                                        >
                                                            <i className={`bi ${parseInt(item.is_locked) === 1 ? 'bi-unlock-fill' : 'bi-lock-fill'}`}>Lock/Unlock</i>
                                                        </button>

                                                        {/* Delete Button */}
                                                        <button 
                                                            className="btn btn-sm btn-outline-danger" 
                                                            onClick={() => handleDelete(item.id)}
                                                            disabled={parseInt(item.is_booked) === 1}
                                                            title="Delete permanently"
                                                        >
                                                            <i className="bi bi-trash">Delete</i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="card-footer bg-light text-muted small text-end">
                            Total: {availabilityList.length} slots.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DoctorAvailabilityManager;