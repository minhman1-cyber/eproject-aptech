import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:8888/api/v1/controllers/register.php';

const dummyCities = [
    { id: 1, name: 'Hanoi' },
    { id: 2, name: 'Ho Chi Minh City' },
    { id: 3, name: 'Da Nang' }
];

const SignUpForms = () => {
    // --- KEEPING YOUR ORIGINAL LOGIC ---
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        role: 'PATIENT',
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        patient_phone: '',
        patient_address: '',
        patient_cityId: '',
        doctor_specializationIds: [],
        doctor_qualification: '',
        doctor_phone: '',
        doctor_cityId: '',
        doctor_bio: ''
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleNextStep = (e) => {
        e.preventDefault();
        setError('');
        if (step === 1) {
            if (formData.password !== formData.confirmPassword) {
                setError('Passwords do not match.');
                return;
            }
            if (!formData.fullName || !formData.email || !formData.password) {
                setError('Please fill in all required fields.');
                return;
            }
            setStep(2);
        }
    };

    const handlePrevStep = () => {
        setStep(step - 1);
    };

    const buildPayload = () => {
        return {
            full_name: formData.fullName,
            email: formData.email,
            password: formData.password,
            role: 'PATIENT',
            city_id: parseInt(formData.patient_cityId),
            patient_phone: formData.patient_phone,
            patient_address: formData.patient_address,
        };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (!formData.patient_cityId) {
            setError('Please select a city.');
            setIsLoading(false);
            return;
        }

        const payload = buildPayload();

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed.');
            }

            window.alert(`Registration successful! Please login.`);
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // --- NEW UI COMPONENTS ---

    // Progress Bar Component
    const ProgressBar = ({ currentStep }) => (
        <div className="mb-4">
            <div className="d-flex justify-content-between mb-2">
                <small className={`fw-bold ${currentStep >= 1 ? 'text-primary' : 'text-muted'}`}>Account</small>
                <small className={`fw-bold ${currentStep >= 2 ? 'text-primary' : 'text-muted'}`}>Personal</small>
            </div>
            <div className="progress" style={{ height: '6px' }}>
                <div
                    className="progress-bar bg-primary"
                    role="progressbar"
                    style={{ width: currentStep === 1 ? '50%' : '100%', transition: 'width 0.3s ease' }}
                ></div>
            </div>
        </div>
    );

    return (
        <div className="d-flex min-vh-100 bg-light align-items-center justify-content-center py-5">
            {/* Inject minimal CSS specifically for this component */}
            <style>{`
                .form-card {
                    border-radius: 20px;
                    overflow: hidden;
                    box-shadow: 0 15px 35px rgba(0,0,0,0.1);
                }
                .bg-gradient-primary {
                    background: linear-gradient(135deg, #0D8ABC 0%, #3FABD6 100%);
                }
                .input-group-text {
                    background-color: #f8f9fa;
                    border-right: none;
                }
                .form-control {
                    border-left: none;
                    padding-left: 0;
                }
                .form-control:focus {
                    box-shadow: none;
                    border-color: #ced4da;
                }
                .input-group:focus-within .input-group-text, 
                .input-group:focus-within .form-control {
                    border-color: #0D8ABC;
                }
                .input-group:focus-within .input-group-text {
                    color: #0D8ABC;
                }
            `}</style>

            <div className="container">
                <div className="card form-card border-0 mx-auto" style={{ maxWidth: '900px' }}>
                    <div className="row g-0">
                        
                        {/* LEFT SIDE: Decorative / Branding */}
                        <div className="col-lg-5 d-none d-lg-flex flex-column align-items-center justify-content-center bg-gradient-primary text-white p-5 text-center">
                            <div className="mb-4">
                                <i className="bi bi-shield-plus display-1"></i>
                            </div>
                            <h2 className="fw-bold mb-3">MediConnect</h2>
                            <p className="opacity-75">Join thousands of patients for quick and convenient appointment booking.</p>
                            <div className="mt-5">
                                <small className="d-block mb-2">Already have an account?</small>
                                <Link to="/" className="btn btn-outline-light rounded-pill px-4">Login Now</Link>
                            </div>
                        </div>

                        {/* RIGHT SIDE: Form */}
                        <div className="col-lg-7 bg-white p-4 p-md-5">
                            <div className="d-flex align-items-center mb-4">
                                <h3 className="fw-bold text-dark mb-0">Member Registration</h3>
                            </div>

                            <ProgressBar currentStep={step} />

                            {error && (
                                <div className="alert alert-danger d-flex align-items-center" role="alert">
                                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                    <div>{error}</div>
                                </div>
                            )}

                            <form onSubmit={step === 2 ? handleSubmit : handleNextStep}>
                                
                                {/* STEP 1: ACCOUNT INFO */}
                                {step === 1 && (
                                    <div className="animate__animated animate__fadeIn">
                                        <div className="mb-3">
                                            <label className="form-label text-muted small fw-bold">FULL NAME</label>
                                            <div className="input-group">
                                                <span className="input-group-text"><i className="bi bi-person"></i></span>
                                                <input type="text" className="form-control form-control-lg bg-light" placeholder="John Doe" name="fullName" value={formData.fullName} onChange={handleChange} required />
                                            </div>
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label text-muted small fw-bold">EMAIL</label>
                                            <div className="input-group">
                                                <span className="input-group-text"><i className="bi bi-envelope"></i></span>
                                                <input type="email" className="form-control form-control-lg bg-light" placeholder="name@example.com" name="email" value={formData.email} onChange={handleChange} required />
                                            </div>
                                        </div>

                                        <div className="row">
                                            <div className="col-md-6 mb-3">
                                                <label className="form-label text-muted small fw-bold">PASSWORD</label>
                                                <div className="input-group">
                                                    <span className="input-group-text"><i className="bi bi-lock"></i></span>
                                                    <input type="password" className="form-control form-control-lg bg-light" placeholder="******" name="password" value={formData.password} onChange={handleChange} required minLength="8" />
                                                </div>
                                            </div>
                                            <div className="col-md-6 mb-3">
                                                <label className="form-label text-muted small fw-bold">CONFIRM PASSWORD</label>
                                                <div className="input-group">
                                                    <span className="input-group-text"><i className="bi bi-lock-fill"></i></span>
                                                    <input type="password" className="form-control form-control-lg bg-light" placeholder="******" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required />
                                                </div>
                                            </div>
                                        </div>

                                        <button type="submit" className="btn btn-primary btn-lg w-100 rounded-pill mt-3 shadow-sm">
                                            Continue <i className="bi bi-arrow-right ms-2"></i>
                                        </button>
                                    </div>
                                )}

                                {/* STEP 2: PATIENT DETAILS */}
                                {step === 2 && (
                                    <div className="animate__animated animate__fadeIn">
                                        <div className="mb-3">
                                            <label className="form-label text-muted small fw-bold">CITY (*)</label>
                                            <div className="input-group">
                                                <span className="input-group-text"><i className="bi bi-geo-alt"></i></span>
                                                <select className="form-select form-select-lg bg-light" style={{borderLeft: 'none'}} name="patient_cityId" value={formData.patient_cityId} onChange={handleChange} required>
                                                    <option value="">Select city...</option>
                                                    {dummyCities.map(city => (<option key={city.id} value={city.id}>{city.name}</option>))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label text-muted small fw-bold">PHONE NUMBER</label>
                                            <div className="input-group">
                                                <span className="input-group-text"><i className="bi bi-telephone"></i></span>
                                                <input type="tel" className="form-control form-control-lg bg-light" placeholder="09xxxxxxx" name="patient_phone" value={formData.patient_phone} onChange={handleChange} />
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <label className="form-label text-muted small fw-bold">DETAILED ADDRESS</label>
                                            <div className="input-group">
                                                <span className="input-group-text"><i className="bi bi-house-door"></i></span>
                                                <input type="text" className="form-control form-control-lg bg-light" placeholder="House number, Street name..." name="patient_address" value={formData.patient_address} onChange={handleChange} />
                                            </div>
                                        </div>

                                        <div className="d-flex gap-2">
                                            <button type="button" className="btn btn-light btn-lg w-50 rounded-pill" onClick={handlePrevStep} disabled={isLoading}>
                                                Back
                                            </button>
                                            <button type="submit" className="btn btn-primary btn-lg w-50 rounded-pill shadow-sm" disabled={isLoading}>
                                                {isLoading ? (
                                                    <span><span className="spinner-border spinner-border-sm me-2"></span>Processing...</span>
                                                ) : (
                                                    <span>Complete <i className="bi bi-check-lg ms-1"></i></span>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </form>

                            {/* Mobile only Login link */}
                            <div className="d-lg-none text-center mt-4">
                                <p className="mb-0 text-muted">Already have an account? <Link to="/" className="text-primary fw-bold text-decoration-none">Login</Link></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignUpForms;