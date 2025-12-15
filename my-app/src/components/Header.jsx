function Header() {
    return (
        <>
            <header>
                <div className="container py-3">
                    <div className="row align-items-center">
                        <div className="col-md-3">
                            <div className="d-flex align-items-center gap-2">
                                <i className="fas fa-plus-square text-primary-custom fa-2x"></i>
                                <h3 className="m-0 fw-bold text-dark">Mediconnect</h3>
                            </div>
                        </div>
                        <div className="col-md-9">
                            <nav className="navbar navbar-expand-lg navbar-light navbar-custom justify-content-end">
                                <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                                    <span className="navbar-toggler-icon"></span>
                                </button>
                                <div className="collapse navbar-collapse justify-content-end" id="navbarNav">
                                    <ul className="navbar-nav align-items-center">
                                        {['Home', 'Blog', 'Pages', 'Departments', 'Timetable', 'Gallery', 'Contact'].map((item, index) => (
                                            <li className="nav-item" key={index}>
                                                <a className={`nav-link ${index === 0 ? 'active' : ''}`} href="#">{item}</a>
                                            </li>
                                        ))}
                                        <li className="nav-item ms-2">
                                            <div className="input-group input-group-sm">
                                                <input type="text" className="form-control bg-light border-0" placeholder="Search..." />
                                                <button className="btn btn-light text-secondary" type="button"><i className="fas fa-search"></i></button>
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                            </nav>
                        </div>
                    </div>
                </div>
            </header>
        </>
    )
}
export default Header