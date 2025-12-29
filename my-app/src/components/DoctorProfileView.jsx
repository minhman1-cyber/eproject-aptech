import React, { useState, useEffect, useCallback } from 'react';

// Backend API URL (Change port 8888 if needed)
const API_QUALIFICATIONS_URL = 'http://localhost:8888/api/v1/controllers/doctor_qualifications_get.php';


// =======================================================
// COMPONENT: DOCTOR PROFILE VIEW 
// =======================================================

const DoctorProfileView = ({ doctor, allCities, allSpecializations, fetchApi }) => {
    
    const [qualifications, setQualifications] = useState([]);
    const [isLoadingQuals, setIsLoadingQuals] = useState(false);
    const [qualsError, setQualsError] = useState(null);

    // Effect to fetch qualifications when doctor changes
    useEffect(() => {
        const fetchQualifications = async () => {
            // Ensure doctor_id is a valid integer before fetching
            if (!doctor?.doctor_id || typeof doctor.doctor_id !== 'number' || doctor.doctor_id <= 0) return;
            console.log("hello");
            setIsLoadingQuals(true);
            setQualsError(null);

            try {
                // Use the passed fetchApi function
                const data = await fetchApi(`${API_QUALIFICATIONS_URL}?doctor_id=${doctor.doctor_id}`, { method: 'GET' });
                
                // Response data: { data: { qualifications: [...] } }
                setQualifications(data.data.qualifications || []);
                
            } catch (err) {
                setQualsError('Error loading qualifications: ' + err.message);
                setQualifications([]);
            } finally {
                setIsLoadingQuals(false);
            }
        };

        fetchQualifications();
    }, [doctor?.doctor_id, fetchApi]); // Re-run when doctor_id changes

    
    // Ensure doctor object exists
    if (!doctor) return <div className="alert alert-danger">Unable to load Doctor information.</div>;
    
    // Get specialization names
    const specNames = doctor.specializationIds 
        ? doctor.specializationIds.map(id => allSpecializations.find(s => s.id === id)?.name).filter(Boolean).join(', ')
        : 'N/A';
        
    // Get city name
    const cityName = allCities.find(c => c.id === doctor.cityId)?.name;


    return (
        <div className="card mb-4 shadow-sm border-info">
            <div className="card-body">
                <div className="row">
                    <div className="col-md-3 text-center">
                        <img 
                            src={doctor.profile_picture || 'https://placehold.co/100x100/3498db/ffffff?text=DR'} 
                            alt={doctor.full_name} 
                            className="rounded-circle mb-3"
                            style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                        />
                        {/* Simple badge to mark role */}
                        <span className="badge bg-primary">Specialist</span> 
                    </div>
                    <div className="col-md-9">
                        <h4 className="card-title text-info">{doctor.full_name}</h4>
                        <p className="mb-1"><strong>Specialization:</strong> {specNames}</p>
                        <p className="mb-1"><strong>City:</strong> {cityName || 'N/A'}</p>
                        <p className="mb-1"><strong>Qualification Summary:</strong> {doctor.qualification || 'Not updated'}</p>
                    </div>
                </div>
                <hr />
                <h6 className="mt-3">Bio</h6>
                <p className="small text-muted">{doctor.bio || 'No detailed bio available.'}</p>

                {/* VERIFIED QUALIFICATIONS TABLE (NEW) */}
                <h6 className="mt-4 text-info">Verified Qualifications & Certificates ({qualifications.length})</h6>
                {qualsError && <div className="alert alert-danger p-2 small">{qualsError}</div>}
                
                {isLoadingQuals ? (
                    <div className="text-center small text-muted">Loading qualifications...</div>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-sm table-borderless small">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Institution</th>
                                    <th>Year</th>
                                </tr>
                            </thead>
                            <tbody>
                                {qualifications.length === 0 ? (
                                    <tr><td colSpan="3" className="text-muted">No verified qualifications found.</td></tr>
                                ) : (
                                    qualifications.map((q, index) => (
                                        <tr key={index}>
                                            <td>{q.title}</td>
                                            <td>{q.institution}</td>
                                            <td>{q.year}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

            </div>
        </div>
    );
};

export default DoctorProfileView;