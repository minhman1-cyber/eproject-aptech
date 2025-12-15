function Partners() {
    return (
        <>
            <section className="section-partners bg-white">
                <div className="container">
                    <div className="row justify-content-center align-items-center text-center">
                        {['PHARMA', 'foveris', 'AETNA', 'QUANTUM'].map((p, i) => (
                            <div className="col-6 col-md-2 mb-3" key={i} data-aos="fade-in" data-aos-delay={(i + 1) * 100}>
                                <div className="partner-logo fs-2 text-secondary fw-bold">{p}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </>
    )
}
export default Partners