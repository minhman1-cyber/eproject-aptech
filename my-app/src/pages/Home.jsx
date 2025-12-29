import React from 'react';
import { Container, Row, Col, Button, Carousel, Card, Accordion, Form } from 'react-bootstrap';
import { 
  Phone, CalendarPlus, 
  CalendarClock, Ambulance, UserSearch, CheckCircle2, 
  Send, ArrowRight
} from 'lucide-react';

// Component để load CSS Bootstrap và Font chữ
const HeadResources = () => (
  <>
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"
      crossOrigin="anonymous"
    />
    <link 
      href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap" 
      rel="stylesheet"
    />
  </>
);

export default function Home() {
  const handleImageError = (e, text = 'Image') => {
    e.target.src = `https://placehold.co/800x600/e2e8f0/1e293b?text=${text}`;
  };

  return (
    <div className="medical-app">
      <HeadResources />
      
      {/* --- CUSTOM CSS & RESPONSIVE --- */}
      <style>{`
        :root {
          --primary: #2563eb;       /* Blue 600 */
          --secondary: #10b981;     /* Emerald 500 */
          --dark: #0f172a;          /* Slate 900 */
          --light: #f8fafc;         /* Slate 50 */
          --font-main: sans-serif;
        }

        /* FIX: Đã xóa overflow-x: hidden ở html, body để Header sticky hoạt động lại */
        /* html, body {
          overflow-x: hidden;
          width: 100%;
          position: relative;
        } */

        .medical-app {
          overflow-x: hidden; /* Chỉ cắt bỏ phần tử con tràn trong phạm vi component này */
          width: 100%;
          position: relative;
        }

        body {
          font-family: var(--font-main);
          color: #334155;
          background-color: var(--light);
        }

        h1, h2, h3, h4, h5, h6 {
          font-weight: 700;
          color: var(--dark);
        }

        /* Buttons */
        .btn-primary-custom {
          background-color: var(--primary);
          border: none;
          border-radius: 50px;
          padding: 0.8rem 2rem;
          font-weight: 600;
          transition: 0.3s;
        }
        .btn-primary-custom:hover {
          background-color: #1d4ed8;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }

        /* Hero Section */
        .hero-section {
          position: relative;
          margin-top: 0;
        }
        .carousel-item {
          height: 85vh; /* Mặc định cho Desktop */
          min-height: 500px;
          max-height: 700px;
        }
        .carousel-item img {
          height: 100%;
          object-fit: cover;
          filter: brightness(0.65);
        }
        .hero-caption {
          text-align: left;
          bottom: 20%;
          left: 5%;
          right: 5%;
          z-index: 2;
        }
        .hero-title {
          font-size: 3.5rem;
          font-weight: 800;
          margin-bottom: 1.5rem;
          line-height: 1.1;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        /* Responsive Hero */
        @media (max-width: 991px) {
           .carousel-item { height: 600px; }
           .hero-title { font-size: 2.5rem; }
        }
        @media (max-width: 576px) {
           .carousel-item { height: 550px; }
           .hero-title { font-size: 2rem; }
           .hero-caption { bottom: 10%; text-align: center; }
           .hero-btns { justify-content: center; }
        }

        /* Info Cards */
        .info-cards-container {
          margin-top: -80px;
          position: relative;
          z-index: 10;
        }
        @media (max-width: 991px) {
          .info-cards-container {
            margin-top: 2rem; /* Trên mobile tách ra khỏi hero */
          }
        }

        .info-card {
          border: none;
          border-radius: 1rem;
          padding: 2rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          height: 100%;
          transition: transform 0.3s;
          background: white;
        }
        .info-card:hover { transform: translateY(-5px); }
        .info-card.blue { border-top: 4px solid var(--primary); }
        .info-card.dark { background: var(--primary); color: white; border-top: 4px solid #60a5fa; }
        .info-card.green { border-top: 4px solid var(--secondary); }
        
        .icon-box {
          width: 60px; height: 60px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 1rem;
          font-size: 1.5rem;
        }
        .bg-light-blue { background: #eff6ff; color: var(--primary); }
        .bg-light-white { background: rgba(255,255,255,0.2); color: white; }
        .bg-light-green { background: #ecfdf5; color: var(--secondary); }

        /* Stats Section */
        .stats-section {
          background-color: var(--primary);
          color: white;
          padding: 4rem 0;
        }
        .stat-item {
            position: relative;
        }
        /* Đường kẻ dọc chỉ hiện trên màn hình lớn */
        @media (min-width: 768px) {
            .stat-item:not(:last-child)::after {
                content: '';
                position: absolute;
                right: 0;
                top: 10%;
                height: 80%;
                width: 1px;
                background-color: rgba(255,255,255,0.3);
            }
        }
        @media (max-width: 767px) {
            .stat-item { margin-bottom: 2rem; }
            .stat-item:last-child { margin-bottom: 0; }
        }
        .stat-number { font-size: 3rem; font-weight: 700; line-height: 1; }
        .stat-label { font-size: 0.9rem; text-transform: uppercase; opacity: 0.9; letter-spacing: 1px; }

        /* Services & Doctors */
        .service-card, .doctor-card {
          border: none;
          border-radius: 1rem;
          overflow: hidden;
          transition: 0.3s;
          height: 100%;
          background: white;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        .service-card:hover, .doctor-card:hover {
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          transform: translateY(-5px);
        }
        .card-img-wrapper {
            height: 220px;
            overflow: hidden;
        }
        .service-card .card-img-top, .doctor-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: 0.5s;
        }
        .service-card:hover .card-img-top { transform: scale(1.05); }
        .doctor-img { object-position: top; height: 320px; }

        /* Process Steps */
        .step-circle {
          width: 80px; height: 80px;
          background: white;
          border: 4px solid #eff6ff;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 1rem auto;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--primary);
          transition: 0.3s;
          position: relative;
          z-index: 2;
        }
        .step-item:hover .step-circle {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
          transform: scale(1.1);
        }
        .process-line {
            position: absolute;
            top: 40px;
            left: 0;
            width: 100%;
            height: 3px;
            background: #e2e8f0;
            z-index: 1;
        }

        /* Booking Section */
        .booking-section {
          background: #1e3a8a;
          color: white;
          padding: 5rem 0;
          position: relative;
          overflow: hidden;
        }
        .booking-form {
          background: white;
          padding: 2.5rem;
          border-radius: 1.5rem;
          color: var(--dark);
        }
        .form-control, .form-select {
          border-radius: 0.5rem;
          padding: 0.8rem 1rem;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          font-size: 0.95rem;
        }
        .form-control:focus, .form-select:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        
        /* About Image Blob */
        .about-blob {
            position: absolute;
            top: -20px;
            left: -20px;
            width: 100%;
            height: 100%;
            background: #dbeafe;
            border-radius: 1rem;
            z-index: -1;
        }
        @media (max-width: 991px) {
            .about-blob { 
              top: -10px; 
              left: 0; /* FIX: Về 0 để không bị tràn trái trên mobile */
              width: 100%;
            }
            .booking-section { padding: 3rem 0; }
            .booking-form { padding: 1.5rem; }
        }
      `}</style>

      {/* --- HERO CAROUSEL --- */}
      <section className="hero-section" id="home">
        <Carousel fade controls={false} indicators={true} interval={5000}>
          {[
            {
                img: "https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1600&q=80",
                title: <>Comprehensive & <br/> <span className="text-info">Dedicated Healthcare</span></>,
                desc: "Modern equipment system and leading experts, bringing absolute peace of mind to your entire family.",
                badge: "JCI International Standard"
            },
            {
                img: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1600&q=80",
                title: <>Experienced <br/> <span className="text-info">Leading Doctors</span></>,
                desc: "Gathering professors and doctors from central hospitals to directly examine and treat patients.",
                badge: "Top Experts Team"
            }
          ].map((item, index) => (
            <Carousel.Item key={index}>
                <img
                className="d-block w-100"
                src={item.img}
                alt="Healthcare"
                onError={(e) => handleImageError(e, 'Medical')}
                />
                <Carousel.Caption className="hero-caption">
                <Container>
                    <div className="hero-badge mb-3 d-inline-block px-3 py-1 rounded-pill fw-bold text-uppercase" 
                         style={{background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(5px)', border: '1px solid rgba(255,255,255,0.3)'}}>
                        {item.badge}
                    </div>
                    <h1 className="hero-title text-white">{item.title}</h1>
                    <p className="lead mb-4 text-white-50 d-none d-md-block" style={{maxWidth: '600px'}}>{item.desc}</p>
                    <div className="d-flex gap-3 hero-btns">
                        <Button size="lg" className="btn-primary-custom d-flex align-items-center gap-2">
                            Learn More <ArrowRight size={20} />
                        </Button>
                        <Button size="lg" variant="outline-light" className="rounded-pill fw-bold px-4 py-2">
                            Price List
                        </Button>
                    </div>
                </Container>
                </Carousel.Caption>
            </Carousel.Item>
          ))}
        </Carousel>
      </section>

      {/* --- INFO CARDS --- */}
      <Container className="info-cards-container">
        {/* FIX: g-3 trên mobile để khoảng cách nhỏ hơn, tránh vỡ layout */}
        <Row className="g-3 g-md-4">
          <Col lg={4} md={6}>
            <Card className="info-card blue">
              <div className="d-flex justify-content-between align-items-start">
                <div className="icon-box bg-light-blue"><CalendarClock /></div>
                <span className="badge bg-primary-subtle text-primary rounded-pill px-3">24/7</span>
              </div>
              <h3 className="h4 fw-bold mb-2">Online Booking</h3>
              <p className="text-muted mb-4 flex-grow-1">Proactive time management, no waiting. Prioritize examination when booking via website or app.</p>
              <a href="#booking" className="fw-bold text-decoration-none text-primary d-flex align-items-center gap-2 stretched-link">Book Now <ArrowRight size={16}/></a>
            </Card>
          </Col>
          <Col lg={4} md={6}>
            <Card className="info-card dark">
              <div className="icon-box bg-light-white"><Ambulance /></div>
              <h3 className="h4 fw-bold mb-2 text-white">Emergency</h3>
              <p className="text-white-50 mb-4 flex-grow-1">Emergency team and specialized ambulances are ready 24/7 to support you promptly.</p>
              <Button variant="light" className="fw-bold text-primary w-100 rounded-pill stretched-link">Call 1900 123 456</Button>
            </Card>
          </Col>
          <Col lg={4} md={12}>
            <Card className="info-card green">
              <div className="icon-box bg-light-green"><UserSearch /></div>
              <h3 className="h4 fw-bold mb-2">Find Doctors</h3>
              <p className="text-muted mb-4 flex-grow-1">Look up information, experience, and schedules of leading experts at the clinic.</p>
              <a href="#doctors" className="fw-bold text-decoration-none text-success d-flex align-items-center gap-2 stretched-link">View List <ArrowRight size={16}/></a>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* --- ABOUT SECTION --- */}
      <section id="about" className="py-5 mt-lg-5">
        <Container>
          {/* FIX: g-3 trên mobile, g-5 trên desktop */}
          <Row className="align-items-center g-3 g-lg-5">
            <Col lg={6} className="order-2 order-lg-1">
              <div className="position-relative ps-3 pt-3">
                <div className="about-blob"></div>
                <img 
                  src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1000&q=80" 
                  alt="Hospital Building" 
                  className="img-fluid rounded-4 shadow-lg w-100 position-relative" 
                  onError={(e) => handleImageError(e, 'Hospital')}
                />
              </div>
            </Col>
            <Col lg={6} className="order-1 order-lg-2">
              <span className="text-primary fw-bold text-uppercase ls-1 small">About Mediconnect</span>
              <h2 className="display-6 fw-bold mb-4 mt-2">Over 10 years of dedication <br className="d-none d-lg-block"/>to community health</h2>
              <p className="text-muted fs-5 mb-4">Established in 2014, Mediconnect Clinic always strives to provide high-quality medical services at reasonable costs.</p>
              <ul className="list-unstyled">
                {['Spacious facilities, 100% imported equipment.', 'Closed, fast examination process, information security.', 'Transparent costs, support for Health Insurance payment.'].map((text, i) => (
                  <li key={i} className="mb-3 d-flex align-items-start gap-3">
                    <CheckCircle2 className="text-primary flex-shrink-0 mt-1" size={20} />
                    <span className="text-dark">{text}</span>
                  </li>
                ))}
              </ul>
              <Button className="btn-primary-custom mt-3" style={{backgroundColor: '#0f172a'}}>View Details <ArrowRight size={18} /></Button>
            </Col>
          </Row>
        </Container>
      </section>

      {/* --- STATS --- */}
      <section className="stats-section mt-5">
        <Container>
          <Row className="text-center">
            {[
                { num: '10+', label: 'Years' },
                { num: '50+', label: 'Doctors' },
                { num: '150k', label: 'Visits/Year' },
                { num: '99%', label: 'Satisfaction' }
            ].map((stat, i) => (
                <Col md={3} xs={6} className="stat-item" key={i}>
                    <div className="stat-number">{stat.num}</div>
                    <div className="stat-label">{stat.label}</div>
                </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* --- SERVICES --- */}
      <section id="services" className="py-5 bg-light">
        <Container>
          <div className="text-center mb-5" style={{maxWidth: '700px', margin: '0 auto'}}>
            <span className="text-primary fw-bold text-uppercase small">Key Specialties</span>
            <h2 className="fw-bold mt-2 display-6">Diverse Medical Services</h2>
            <p className="text-muted">We provide full clinical to paraclinical specialties, meeting all examination and treatment needs.</p>
          </div>

          <Row className="g-3 g-md-4">
            {[
              { img: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80', title: 'Cardiology', desc: 'Diagnosis and treatment of hypertension, coronary artery disease...' },
              { img: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=800&q=80', title: 'Pediatrics', desc: 'Friendly examination space, psychological doctors for children.' },
              { img: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=800&q=80', title: 'Neurology', desc: 'Diagnosis of headache, insomnia, vestibular disorders.' },
              { img: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80', title: 'Musculoskeletal', desc: 'Treatment of osteoarthritis using physical therapy methods.' },
              { img: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=800&q=80', title: 'Laboratory', desc: 'Automatic testing system from Roche, Abbott for accurate results.' },
              { img: 'https://images.unsplash.com/photo-1631815589968-fdb09a223b1e?auto=format&fit=crop&w=800&q=80', title: 'Dentistry', desc: 'Cosmetic dentistry and intensive dental treatment services.' },
            ].map((s, i) => {
              return (
                <Col lg={4} md={6} key={i}>
                  <Card className="service-card h-100">
                    <div className="card-img-wrapper">
                          <Card.Img 
                           variant="top" 
                           src={s.img} 
                           className="card-img-top"
                           onError={(e) => handleImageError(e, s.title)}
                          />
                    </div>
                    <Card.Body className="service-card-body p-4 d-flex flex-column">
                        <h4 className="fw-bold mb-2">{s.title}</h4>
                        <p className="text-muted mb-4 small flex-grow-1">{s.desc}</p>
                        <a href="#" className="fw-bold text-decoration-none d-flex align-items-center gap-2 text-primary stretched-link">
                          View Details <ArrowRight size={16} />
                        </a>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </Container>
      </section>

      {/* --- PROCESS --- */}
      <section className="py-5">
        <Container>
          <div className="text-center mb-5">
            <h2 className="fw-bold display-6">Examination Process</h2>
            <p className="text-muted">Simplifying procedures to save your valuable time</p>
          </div>
          
          <Row className="g-3 g-md-4 position-relative">
            {/* Process Line */}
            <div className="process-line d-none d-lg-block"></div>
            
            {[
              { step: 1, title: 'Registration', desc: 'Book via hotline/website or at the counter.' },
              { step: 2, title: 'Examination', desc: 'Specialist doctor examines and prescribes tests.' },
              { step: 3, title: 'Treatment', desc: 'Receive results, consultation and prescription.' },
              { step: 4, title: 'Aftercare', desc: 'Health monitoring and follow-up appointment.' }
            ].map((item, i) => (
              <Col lg={3} md={6} className="text-center step-item" key={i}>
                <div className="step-circle shadow-sm">{item.step}</div>
                <h5 className="fw-bold">{item.title}</h5>
                <p className="text-muted small px-lg-3">{item.desc}</p>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* --- DOCTORS --- */}
      <section id="doctors" className="py-5 bg-light">
        <Container>
          <div className="d-flex justify-content-between align-items-end mb-4">
             <div>
               <span className="text-primary fw-bold text-uppercase small">Our Experts</span>
               <h2 className="fw-bold mb-0 display-6">Reputable Doctors</h2>
             </div>
             <a href="#" className="btn btn-outline-primary rounded-pill fw-bold d-none d-md-block px-4">View All</a>
          </div>

          <Row className="g-3 g-md-4">
             {[
              { name: 'PhD.MD Nguyen T. Nam', spec: 'Cardiology', img: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=800&q=80' },
              { name: 'MSc.MD Tran T. Linh', spec: 'Pediatrics', img: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=800&q=80' },
              { name: 'MD.CKII Le V. Hung', spec: 'Neurology', img: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=800&q=80' },
              { name: 'MD.CKI Pham T. Mai', spec: 'Dermatology', img: 'https://images.unsplash.com/photo-1559839734-2b71ea86b48e?auto=format&fit=crop&w=800&q=80' }
            ].map((doc, i) => (
              <Col md={6} lg={3} key={i}>
                <div className="doctor-card bg-white h-100">
                  <div style={{height: '320px', overflow: 'hidden'}}>
                      <img 
                       src={doc.img} 
                       alt={doc.name} 
                       className="doctor-img" 
                       onError={(e) => handleImageError(e, 'Doctor')}
                      />
                  </div>
                  <div className="p-3 text-center">
                    <h5 className="fw-bold mb-1">{doc.name}</h5>
                    <div className="text-primary fw-bold small mb-3">{doc.spec}</div>
                    <div className="d-flex justify-content-center gap-2">
                        <Button size="sm" variant="outline-primary" className="rounded-circle"><i className="fas fa-phone"></i></Button>
                        <Button size="sm" variant="primary" className="rounded-pill px-3">Book</Button>
                    </div>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
          <div className="text-center mt-4 d-md-none">
             <a href="#" className="btn btn-outline-primary rounded-pill fw-bold w-100">View All Doctors</a>
          </div>
        </Container>
      </section>

      {/* --- FAQ --- */}
      <section className="py-5">
        <Container style={{maxWidth: '800px'}}>
           <h2 className="fw-bold text-center mb-5 display-6">Frequently Asked Questions</h2>
           <Accordion defaultActiveKey="0" flush>
             <Accordion.Item eventKey="0" className="mb-3 border rounded-3 shadow-sm overflow-hidden">
               <Accordion.Header>Does the clinic work on weekends?</Accordion.Header>
               <Accordion.Body className="text-muted bg-light">
                 Yes. Mediconnect works all days of the week, including Saturday and Sunday, from 7:00 AM to 8:00 PM for your convenience.
               </Accordion.Body>
             </Accordion.Item>
             <Accordion.Item eventKey="1" className="mb-3 border rounded-3 shadow-sm overflow-hidden">
               <Accordion.Header>Do I get Health Insurance payment?</Accordion.Header>
               <Accordion.Body className="text-muted bg-light">
                 Yes. We accept Health Insurance payment according to state regulations. In addition, we also link hospital fee guarantees with over 20 private insurance units.
               </Accordion.Body>
             </Accordion.Item>
             <Accordion.Item eventKey="2" className="mb-3 border rounded-3 shadow-sm overflow-hidden">
               <Accordion.Header>How long in advance do I need to book?</Accordion.Header>
               <Accordion.Body className="text-muted bg-light">
                 To be best served and not have to wait, please book at least 2 hours in advance via Hotline or Website.
               </Accordion.Body>
             </Accordion.Item>
           </Accordion>
        </Container>
      </section>

      {/* --- BOOKING --- */}
      <section id="booking" className="booking-section mb-0 pb-5">
        {/* Background Overlay */}
        <div style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.1, zIndex: 0}}>
           <img 
            src="https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1920&q=80" 
            style={{width: '100%', height: '100%', objectFit: 'cover'}} 
            alt="bg"
            onError={(e) => handleImageError(e, 'Clinic+Background')}
           />
        </div>
        
        <Container style={{position: 'relative', zIndex: 2}}>
          {/* FIX: g-3 trên mobile để an toàn hơn */}
          <Row className="align-items-center g-3 g-lg-5">
            <Col lg={5} className="text-center text-lg-start">
              <h2 className="display-5 fw-bold mb-3"><span style={{color: 'white'}}>Book Appointment</span> <br/> <span className="text-info">Fast & Convenient</span></h2>
              <p className="lead text-light mb-4 opacity-75">Leave your information, we will contact to confirm within 15 minutes. No waiting.</p>
              
              <div className="d-inline-flex align-items-center gap-3 p-3 rounded-4 mx-auto mx-lg-0" style={{background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)'}}>
                <div className="bg-primary rounded-circle p-3 d-flex align-items-center justify-content-center shadow">
                  <Phone color="white" size={24} />
                </div>
                <div className="text-start">
                  <div className="text-info text-uppercase small fw-bold ls-1">Emergency Hotline</div>
                  <div className="fw-bold fs-3 text-white">1900 123 456</div>
                </div>
              </div>
            </Col>
            
            <Col lg={7}>
              <div className="booking-form shadow-lg">
                <Form>
                  <Row className="g-3">
                    <Col md={12}>
                      <Form.Group>
                        <Form.Label className="fw-bold small text-uppercase text-secondary">Full Name <span className="text-danger">*</span></Form.Label>
                        <Form.Control type="text" placeholder="Enter full name..." required />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-bold small text-uppercase text-secondary">Phone Number <span className="text-danger">*</span></Form.Label>
                        <Form.Control type="tel" placeholder="09xxxxxxx" required />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-bold small text-uppercase text-secondary">Date of Birth</Form.Label>
                        <Form.Control type="date" />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-bold small text-uppercase text-secondary">Specialty</Form.Label>
                        <Form.Select>
                          <option>General Checkup</option>
                          <option>Cardiology</option>
                          <option>Pediatrics</option>
                          <option>Dermatology</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                      <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-bold small text-uppercase text-secondary">Expected Date</Form.Label>
                        <Form.Control type="date" />
                      </Form.Group>
                    </Col>
                    <Col md={12}>
                      <Form.Group>
                        <Form.Label className="fw-bold small text-uppercase text-secondary">Symptoms / Notes</Form.Label>
                        <Form.Control as="textarea" rows={3} placeholder="Describe your condition..." />
                      </Form.Group>
                    </Col>
                    <Col md={12}>
                      <Button className="btn-primary-custom w-100 py-3 mt-3 shadow" onClick={() => alert('Information sent!')}>
                        Confirm Booking <Send size={18} className="ms-2" />
                      </Button>
                    </Col>
                  </Row>
                </Form>
              </div>
            </Col>
          </Row>
        </Container>
      </section>
    </div>
  );
}