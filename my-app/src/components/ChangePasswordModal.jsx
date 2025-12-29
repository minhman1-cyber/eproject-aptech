import React, { useState, useCallback } from 'react';

const API_CHANGE_PASSWORD_URL = 'http://localhost:8888/api/v1/controllers/change_password.php';

const ChangePasswordModal = ({ isModalOpen, closeModal, fetchApi }) => {
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [localError, setLocalError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    if (!isModalOpen) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setLocalError(null);
        setSuccessMsg(null);
        setIsLoading(true);

        const { currentPassword, newPassword, confirmPassword } = formData;

        // Client-side Validation
        if (newPassword !== confirmPassword) {
            setLocalError("New password and confirmation do not match.");
            setIsLoading(false);
            return;
        }
        if (newPassword.length < 8) {
            setLocalError("New password must be at least 8 characters long.");
            setIsLoading(false);
            return;
        }

        const payload = {
            currentPassword,
            newPassword,
            confirmPassword,
        };

        try {
            const data = await fetchApi(API_CHANGE_PASSWORD_URL, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
            });

            setSuccessMsg(data.message || "Password changed successfully!");
            
            // Clear Session and force logout
            window.alert("Password changed. Please log in again.");
            // Assume redirect to Login page
            window.location.href = "/login"; 
            
        } catch (err) {
            setLocalError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
            <div className="modal-dialog modal-md">
                <div className="modal-content">
                    <div className="modal-header bg-warning text-dark">
                        <h5 className="modal-title"><i className="bi bi-key-fill me-2"></i> Change Password</h5>
                        <button type="button" className="btn-close" onClick={closeModal} disabled={isLoading}></button>
                    </div>
                    <div className="modal-body">
                        {localError && <div className="alert alert-danger" role="alert">{localError}</div>}
                        {successMsg && <div className="alert alert-success" role="alert">{successMsg}</div>}

                        <form onSubmit={handlePasswordChange}>
                            <div className="mb-3">
                                <label className="form-label">Current Password (*)</label>
                                <input 
                                    type="password" 
                                    className="form-control" 
                                    name="currentPassword" 
                                    value={formData.currentPassword} 
                                    onChange={handleChange} 
                                    required 
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">New Password (*)</label>
                                <input 
                                    type="password" 
                                    className="form-control" 
                                    name="newPassword" 
                                    value={formData.newPassword} 
                                    onChange={handleChange} 
                                    required 
                                    minLength={8}
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Confirm New Password (*)</label>
                                <input 
                                    type="password" 
                                    className="form-control" 
                                    name="confirmPassword" 
                                    value={formData.confirmPassword} 
                                    onChange={handleChange} 
                                    required 
                                    minLength={8}
                                />
                            </div>
                            <button type="submit" className="btn btn-warning w-100 mt-3" disabled={isLoading}>
                                {isLoading ? 'Processing...' : 'Change Password'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChangePasswordModal;