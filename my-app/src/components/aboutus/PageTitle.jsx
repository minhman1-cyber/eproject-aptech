function PageTitle() {
    return (
        <>
            <section className="page-title-area">
                <div className="container">
                    <div className="row align-items-center">
                        <div className="col-md-6" data-aos="fade-right">
                            <h2 className="mb-0">
                                About{" "}
                                <small className="text-muted fs-6 fw-normal">
                                    Health & Medical
                                </small>
                            </h2>
                        </div>
                        <div className="col-md-6" data-aos="fade-left">
                            <nav aria-label="breadcrumb">
                                <ol className="breadcrumb">
                                    <li className="breadcrumb-item">
                                        <a href="#" className="text-secondary">
                                            Home
                                        </a>
                                    </li>
                                    <li className="breadcrumb-item active" aria-current="page">
                                        About
                                    </li>
                                </ol>
                            </nav>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
export default PageTitle;
