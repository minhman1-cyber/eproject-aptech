function IntroSection() {
    return (
        <>
            <section className="container mb-5">
                <div className="row">
                    <div className="col-lg-6 mb-4" data-aos="fade-up" data-aos-duration="1000">
                        <div className="about-img-collage">
                            <img src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Doctor" className="img-fluid img-main" />
                            <img src="https://images.unsplash.com/photo-1581056771107-24ca5f033842?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" alt="Care" className="img-fluid img-sub" />
                        </div>
                    </div>
                    <div className="col-lg-6" data-aos="fade-up" data-aos-delay="200" data-aos-duration="1000">
                        <h6 className="text-primary-custom fw-bold text-uppercase mb-3">Welcome to Medicenter</h6>
                        <h3 className="mb-4">Medicenter holds the privilege of being Chicago's first choice hospital.</h3>
                        <p className="mb-4">Since its founding, we have become an integral part of the city, advancing our mission of providing access to compassionate care to our communities. Today, patients find care that combines world-class medicine with compassion.</p>
                        <ul className="check-list p-0">
                            <li>Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat.</li>
                            <li>Vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim.</li>
                            <li>Qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.</li>
                            <li>Nam liber tempor cum soluta nobis eleifend option congue nihil imperdiet doming.</li>
                        </ul>
                    </div>
                </div>
            </section>
        </>
    )
}
export default IntroSection