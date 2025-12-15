import { Link } from "react-router-dom"

function Footer() {
    return (
        <>
            <div className="footer-cta">
                <div className="container-fluid">
                    <div className="row">
                        <div className="col-md-4 p-0 bg-blue-1">
                            <div className="cta-box">
                                <i className="fas fa-map-marked-alt cta-icon"></i>
                                <div >
                                    <h6 className="m-0 fw-bold">Emergency Contact</h6>
                                    <a
                                        href="https://maps.app.goo.gl/gst9BkxPtP8TAsym6"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{color:'white', textDecoration:'none'}}
                                    >
                                        Find us on Map
                                    </a>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4 p-0 bg-blue-2">
                            <div className="cta-box">
                                <i className="fas fa-phone-alt cta-icon"></i>
                                <div>
                                    <h6 className="m-0 fw-bold">1-800-123-4567</h6>
                                    <small>Call us now 24/7</small>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4 p-0 bg-blue-3">
                            <div className="cta-box">
                                <i className="fas fa-envelope cta-icon"></i>
                                <div>
                                    <h6 className="m-0 fw-bold">contact@medicenter.com</h6>
                                    <small>Send us an Email</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <footer className="main-footer">
                <div className="container">
                    <div className="row">
                        <div className="col-lg-3 col-md-6 mb-4">
                            <h5 className="footer-title">About Us</h5>
                            <p>Medicenter is a responsive React template perfect for medical and health websites. It includes all the features you need to create a professional site.</p>
                            <div className="d-flex gap-3 mt-3">
                                <a href="#" className="text-secondary"><i className="fab fa-facebook-f"></i></a>
                                <a href="#" className="text-secondary"><i className="fab fa-twitter"></i></a>
                                <a href="#" className="text-secondary"><i className="fab fa-youtube"></i></a>
                            </div>
                        </div>
                        <div className="col-lg-3 col-md-6 mb-4">
                            <h5 className="footer-title">Quick Links</h5>
                            <ul className="footer-links p-0">
                                {['Home', 'About Us', 'Services', 'Doctors', 'Blog', 'Contact'].map(link => (
                                    <li key={link}><a href="#">› {link}</a></li>
                                ))}
                            </ul>
                        </div>
                        <div className="col-lg-3 col-md-6 mb-4">
                            <h5 className="footer-title">Latest Posts</h5>
                            <ul className="footer-links p-0">
                                <li className="mb-3">
                                    <a href="#" className="d-block text-white">Advanced Medical Research</a>
                                    <small className="text-muted">Dec 15, 2023</small>
                                </li>
                                <li>
                                    <a href="#" className="d-block text-white">New Operating Theatre</a>
                                    <small className="text-muted">Nov 20, 2023</small>
                                </li>
                            </ul>
                        </div>
                        <div className="col-lg-3 col-md-6 mb-4">
                            <h5 className="footer-title">Get Smart</h5>
                            <p>Subscribe to our newsletter to get the latest updates.</p>
                            <div className="input-group mb-3">
                                <input type="text" className="form-control bg-dark border-secondary text-light" placeholder="Email Address" />
                                <button className="btn btn-primary" type="button">Go</button>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>

            <div className="footer-bottom">
                <div className="container">
                    <div className="row">
                        <div className="col-md-6">
                            &copy; 2023 Medicenter Template. All Rights Reserved.
                        </div>
                        <div className="col-md-6 text-md-end">
                            <a href="#" className="text-muted ms-2">Privacy Policy</a>
                            <a href="#" className="text-muted ms-2">Terms of Use</a>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
export default Footer