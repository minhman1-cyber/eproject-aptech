function Testimonials() {
    return (
        <>
            <section className="container py-5">
                <div className="row">
                    <div className="col-md-6" data-aos="fade-up" data-aos-delay="100">
                        <div className="testimonial-box">
                            <i className="fas fa-quote-left testimonial-icon"></i>
                            <p className="testimonial-text">"Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore."</p>
                            <span className="testimonial-author">- JOHN DOE, Patient</span>
                        </div>
                    </div>
                    <div className="col-md-6" data-aos="fade-up" data-aos-delay="300">
                        <div className="testimonial-box">
                            <i className="fas fa-quote-left testimonial-icon"></i>
                            <p className="testimonial-text">"Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi."</p>
                            <span className="testimonial-author">- JANE SMITH, Patient</span>
                        </div>
                    </div>
                </div>
            </section>
        </>
    )
}
export default Testimonials