function WhyChooseUs() {
    const features = [
        { icon: "fas fa-user-md", title: "Professional Doctors", desc: "Our doctors are highly skilled and experienced in their fields." },
        { icon: "fas fa-hospital-alt", title: "Exclusive Facilities", desc: "State of the art facilities to ensure the best care possible." },
        { icon: "fas fa-file-medical-alt", title: "Global Network", desc: "Connected with top medical institutions worldwide." },
        { icon: "fas fa-syringe", title: "Latest Technologies", desc: "We use the latest medical technologies for treatment." },
        { icon: "fas fa-leaf", title: "Spiritual Therapies", desc: "Holistic approaches to healing mind, body, and soul." },
        { icon: "fas fa-heartbeat", title: "Muscle Relax", desc: "Specialized therapies for muscle recovery and relaxation." }
    ];

    return (
        <section className="section-features">
            <div className="container">
                <div className="text-center mb-5" data-aos="fade-up">
                    <h3>Why Choose Us</h3>
                    <div className="bg-primary mx-auto mt-3" style={{ width: '50px', height: '3px' }}></div>
                    <p className="mt-3 text-muted w-75 mx-auto">We offer a wide range of procedures to help you get the perfect smile.</p>
                </div>
                <div className="row">
                    {features.map((f, i) => (
                        <div className="col-md-6 col-lg-4" key={i} data-aos="fade-up" data-aos-delay={(i + 1) * 100}>
                            <div className="feature-box">
                                <div className="feature-icon"><i className={f.icon}></i></div>
                                <div>
                                    <h5 className="fs-6 fw-bold mb-2 text-primary-custom">{f.title}</h5>
                                    <p className="small text-muted mb-0">{f.desc}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
export default WhyChooseUs