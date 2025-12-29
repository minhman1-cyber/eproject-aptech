import React, { useState } from 'react';

const ContactUs = () => {
  // --- STATE MANAGEMENT ---
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  
  const [errors, setErrors] = useState({});

  // --- HANDLERS ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    let newErrors = {};
    let isValid = true;

    if (!formData.name.trim()) {
      newErrors.name = 'Please enter your name';
      isValid = false;
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Please enter your email.';
      isValid = false;
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ.';
      isValid = false;
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Please enter your message';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Demo submit thành công
      alert(`Thank you ${formData.name}! Your message is sent sucessfully.`);
      setFormData({ name: '', email: '', subject: '', message: '' });
    } else {
      // Focus vào lỗi đầu tiên
      const firstErrorKey = Object.keys(errors)[0];
      if(firstErrorKey) {
        document.getElementById(firstErrorKey)?.focus();
      }
    }
  };

  // --- ICONS (SVG) ---
  const Icons = {
    MapPin: () => (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--brand)'}}>
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
      </svg>
    ),
    Phone: () => (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--brand)'}}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
      </svg>
    ),
    Mail: () => (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--brand)'}}>
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
        <polyline points="22,6 12,13 2,6"></polyline>
      </svg>
    ),
    Form: () => (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--brand)'}}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
    )
  };

  return (
    <div className="contact-page-wrapper">
      {/* --- CSS STYLES --- */}
      <style>{`
        :root {
          --brand: #2aa6cb;
          --brand-dark: #238ea3;
          --muted: #6c7a83;
          --bg: #f6fbfc;
          --card-bg: #ffffff;
          --max-width: 1200px;
          --radius: 8px;
          --shadow: 0 8px 28px rgba(12, 20, 28, 0.06);
          
          /* Cập nhật font stack Sans-serif đầy đủ và mạnh hơn */
          --font-main: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          
          /* New validation color (Blue theme) */
          --error-color: #238ea3; 
          --error-bg: #f0f8fa;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        /* Áp dụng font cho wrapper và FORCE apply cho các thẻ input/textarea/button */
        .contact-page-wrapper,
        .contact-page-wrapper input,
        .contact-page-wrapper textarea,
        .contact-page-wrapper button {
          font-family: var(--font-main) !important;
        }

        .contact-page-wrapper {
          background: var(--bg);
          color: #0b2530;
          line-height: 1.45;
          font-size: 15px;
          overflow-x: hidden;
          width: 100%;
          position: relative;
        }

        .container { width: 94%; margin: 0 auto; }

        /* Hero Map */
        .hero-map { width: 100%; background: transparent; margin: 0 auto; padding: 0; position: relative; height: 360px; }
        .hero-map-inner { width: 100%; max-width: var(--max-width); margin: 0 auto; height: 100%; position: relative; border-radius: 12px; overflow: hidden; box-shadow: var(--shadow); background: #e9f5f7; }
        .hero-map iframe { width: 100%; height: 100%; display: block; border: 0; }
        .hero-overlay { position: absolute; left: 0; right: 0; bottom: 0; height: 120px; background: linear-gradient(180deg, rgba(0, 0, 0, 0), rgba(6, 20, 28, 0.08)); pointer-events: none; }

        /* Main Content */
        .main-content { padding: 48px 0; }
        .content-row { display: grid; grid-template-columns: 2fr 1fr; gap: 28px; align-items: start; }

        .section-title { font-size: 26px; margin-bottom: 12px; color: #0b2b34; font-weight: 700; }
        
        /* Form */
        .contact-form { background: var(--card-bg); padding: 22px; border-radius: 12px; box-shadow: var(--shadow); }
        .form-row { display: flex; gap: 16px; }
        .col { flex: 1; }
        .form-field { margin-bottom: 14px; }
        .form-field label { display: block; font-weight: 700; color: #27464b; margin-bottom: 6px; }
        .form-field input, .form-field textarea { width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #e6f0f3; background: #fbfeff; font-size: 14px; outline: none; transition: border 0.2s; }
        
        .form-field input:focus, .form-field textarea:focus { border-color: var(--brand); }
        
        /* UPDATED: Error Styling to Blue */
        .form-field.error input, .form-field.error textarea { border-color: var(--error-color); background: var(--error-bg); }
        .error-msg { color: var(--error-color); font-size: 12px; margin-top: 4px; font-weight: 600; }
        .req { color: var(--brand); font-weight: 700; margin-left: 6px; font-size: 13px; }
        
        .btn-send { display: inline-block; background: var(--brand); color: #fff; border: 0; padding: 12px 18px; border-radius: 8px; font-weight: 800; cursor: pointer; box-shadow: 0 6px 18px rgba(42, 166, 203, 0.18); transition: all 0.2s; }
        .btn-send:hover { background: var(--brand-dark); transform: translateY(-2px); }

        /* Sidebar Widgets */
        .right-col .widget { background: var(--card-bg); padding: 18px; border-radius: 12px; box-shadow: var(--shadow); margin-bottom: 18px; }
        .widget-title { font-size: 18px; margin-bottom: 12px; color: #0b2b34; font-weight: 700; }
        .info-item { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 12px; }
        .info-item .icon { display: flex; align-items: center; justify-content: center; width: 24px; }
        .info-text a { color: var(--brand); text-decoration: none; }
        .appointment-widget .small-desc { color: var(--muted); margin-bottom: 12px; }
        .appt-item { display: flex; gap: 10px; align-items: center; padding: 8px 0; border-top: 1px dashed #eef6f8; }
        .appt-item:first-of-type { border-top: 0; }
        .appt-icon { display: flex; align-items: center; justify-content: center; width: 24px; }

        /* Responsive */
        @media (max-width: 1000px) {
          .content-row { grid-template-columns: 1fr; }
          .hero-map { height: 320px; }
        }
        @media (max-width: 640px) {
          .hero-map { height: 260px; }
          .form-row { flex-direction: column; gap: 0; }
        }
      `}</style>

      {/* --- HERO MAP --- */}
      <section className="hero-map">
        <div className="hero-map-inner">
          <iframe 
            src="https://maps.google.com/maps?q=-27.4705,153.0260&z=13&output=embed"
            allowFullScreen="" 
            loading="lazy"
            title="Google Map"
          ></iframe>
          <div className="hero-overlay"></div>
        </div>
      </section>

      {/* --- MAIN CONTENT --- */}
      <main className="main-content">
        <div className="container">
          <div className="content-row">

            {/* LEFT COLUMN: FORM */}
            <section className="left-col">
              <h2 className="section-title">Send Us a Message</h2>

              <form id="contactForm" className="contact-form" onSubmit={handleSubmit} noValidate>
                <div className="form-row">
                  <div className="col">
                    <div className={`form-field ${errors.name ? 'error' : ''}`}>
                      <label htmlFor="name">Your Name <span className="req">(required)</span></label>
                      <input 
                        id="name" 
                        name="name" 
                        type="text" 
                        placeholder="Your name" 
                        value={formData.name}
                        onChange={handleChange}
                      />
                      {errors.name && <div className="error-msg">{errors.name}</div>}
                    </div>
                  </div>

                  <div className="col">
                    <div className={`form-field ${errors.email ? 'error' : ''}`}>
                      <label htmlFor="email">Your Email <span className="req">(required)</span></label>
                      <input 
                        id="email" 
                        name="email" 
                        type="email" 
                        placeholder="you@domain.com" 
                        value={formData.email}
                        onChange={handleChange}
                      />
                      {errors.email && <div className="error-msg">{errors.email}</div>}
                    </div>
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="subject">Subject</label>
                  <input 
                    id="subject" 
                    name="subject" 
                    type="text" 
                    placeholder="Subject" 
                    value={formData.subject}
                    onChange={handleChange}
                  />
                </div>

                <div className={`form-field ${errors.message ? 'error' : ''}`}>
                  <label htmlFor="message">Your Message <span className="req">(required)</span></label>
                  <textarea 
                    id="message" 
                    name="message" 
                    rows="8" 
                    placeholder="Write your message..."
                    value={formData.message}
                    onChange={handleChange}
                  ></textarea>
                  {errors.message && <div className="error-msg">{errors.message}</div>}
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-send">SEND</button>
                </div>
              </form>
            </section>

            {/* RIGHT COLUMN: INFO */}
            <aside className="right-col">
              <div className="widget contact-widget">
                <h3 className="widget-title">Contact Info</h3>
                <div className="info-item">
                  <span className="icon"><Icons.MapPin /></span>
                  <div className="info-text">
                    <strong>No: 58 A, East Madison St</strong><br />Baltimore, MD, USA
                  </div>
                </div>
                <div className="info-item">
                  <span className="icon"><Icons.Phone /></span>
                  <div className="info-text">
                    <strong>Phone :</strong><br />+1 200 258 2145
                  </div>
                </div>
                <div className="info-item">
                  <span className="icon"><Icons.Mail /></span>
                  <div className="info-text">
                    <strong>Email :</strong><br />
                    <a href="mailto:yourname@somemail.com">yourname@somemail.com</a>
                  </div>
                </div>
              </div>

              <div className="widget appointment-widget">
                <h3 className="widget-title">Book an Appointment</h3>
                <p className="small-desc">Fox that is her thing smoaasa lase lemedds laasd pamade eleifend sapien.</p>
                <div className="appt-item">
                  <span className="appt-icon"><Icons.Phone /></span>
                  <div>Phone : +1 200 258 2145</div>
                </div>
                <div className="appt-item">
                  <span className="appt-icon"><Icons.Mail /></span>
                  <div>Email : yourname@somemail.com</div>
                </div>
                <div className="appt-item">
                  <span className="appt-icon"><Icons.Form /></span>
                  <div>Online Form : <a href="#">Fill out this form</a></div>
                </div>
              </div>
            </aside>

          </div>
        </div>
      </main>
    </div>
  );
};

export default ContactUs;