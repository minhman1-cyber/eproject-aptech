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

        // Validation phía client
        if (newPassword !== confirmPassword) {
            setLocalError("Mật khẩu mới và xác nhận mật khẩu không khớp.");
            setIsLoading(false);
            return;
        }
        if (newPassword.length < 8) {
            setLocalError("Mật khẩu mới phải có ít nhất 8 ký tự.");
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

            setSuccessMsg(data.message || "Mật khẩu đã được thay đổi thành công!");
            
            // Xóa Session và buộc đăng nhập lại
            window.alert("Mật khẩu đã thay đổi. Vui lòng đăng nhập lại.");
            // Giả định chuyển hướng về trang Login
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
                        <h5 className="modal-title"><i className="bi bi-key-fill me-2"></i> Đổi Mật Khẩu</h5>
                        <button type="button" className="btn-close" onClick={closeModal} disabled={isLoading}></button>
                    </div>
                    <div className="modal-body">
                        {localError && <div className="alert alert-danger" role="alert">{localError}</div>}
                        {successMsg && <div className="alert alert-success" role="alert">{successMsg}</div>}

                        <form onSubmit={handlePasswordChange}>
                            <div className="mb-3">
                                <label className="form-label">Mật khẩu cũ (*)</label>
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
                                <label className="form-label">Mật khẩu mới (*)</label>
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
                                <label className="form-label">Xác nhận Mật khẩu mới (*)</label>
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
                                {isLoading ? 'Đang xác thực...' : 'Đổi Mật Khẩu'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChangePasswordModal;