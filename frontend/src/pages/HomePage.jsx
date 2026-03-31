import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const doctors = [
  {
    name: "Dr. Ruwan Senanayake",
    specialty: "Orthopedics",
    rating: "4.8",
    image:
      "https://images.unsplash.com/photo-1612277795421-9bc7706a4a41?auto=format&fit=crop&w=700&q=80"
  },
  {
    name: "Dr. Tharushi Wijesinghe",
    specialty: "Pediatrics",
    rating: "4.9",
    image:
      "https://images.unsplash.com/photo-1591604466107-ec97de577aff?auto=format&fit=crop&w=700&q=80"
  },
  {
    name: "Dr. Malith Gunasekara",
    specialty: "ENT",
    rating: "4.7",
    image:
      "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=700&q=80"
  },
  {
    name: "Dr. Dinithi Fernando",
    specialty: "Endocrinology",
    rating: "4.8",
    image:
      "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=700&q=80"
  }
];

const doctorFallback =
  "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=700&q=80";
const bannerFallback =
  "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=800&q=80";
const testimonialFallback =
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80";

function fallbackToPlaceholder(e, placeholder) {
  e.currentTarget.onerror = null;
  e.currentTarget.src = placeholder;
}

export default function HomePage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function closeMobileMenu() {
    setIsMobileMenuOpen(false);
  }

  return (
    <main className="mf-page">
      <header className={`mf-navbar${scrolled ? " mf-navbar-scrolled" : ""}`}>
        <div className="mf-container mf-nav-inner">
          <div className="mf-logo">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="mf-logo-icon">
              <defs>
                <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#1e40af" />
                </linearGradient>
              </defs>
              <circle cx="20" cy="20" r="18" stroke="url(#logoGrad)" strokeWidth="2.5" fill="none"/>
              <rect x="18" y="12" width="4" height="16" rx="2" fill="url(#logoGrad)"/>
              <rect x="12" y="18" width="16" height="4" rx="2" fill="url(#logoGrad)"/>
            </svg>
            <span className="mf-logo-text">MediFlow</span>
          </div>
          <nav className="mf-nav-links">
            <a href="/">Home</a>
            <Link to="/doctors">Find Doctors</Link>
            <a href="#services">Services</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
          </nav>
          <div className="mf-auth-actions">
            <Link className="mf-link-btn" to="/login">
              Login
            </Link>
            <Link className="mf-primary-btn" to="/register">
              Register
            </Link>
          </div>
          <button
            type="button"
            className={`mf-menu-toggle${isMobileMenuOpen ? " is-open" : ""}`}
            aria-label="Toggle mobile menu"
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
        <div className={`mf-mobile-menu${isMobileMenuOpen ? " is-open" : ""}`}>
          <div className="mf-container mf-mobile-menu-inner">
            <a href="/" onClick={closeMobileMenu}>
              Home
            </a>
            <Link to="/doctors" onClick={closeMobileMenu}>
              Find Doctors
            </Link>
            <a href="#services" onClick={closeMobileMenu}>
              Services
            </a>
            <a href="#about" onClick={closeMobileMenu}>
              About
            </a>
            <a href="#contact" onClick={closeMobileMenu}>
              Contact
            </a>
            <div className="mf-mobile-menu-actions">
              <Link className="mf-link-btn" to="/login" onClick={closeMobileMenu}>
                Login
              </Link>
              <Link className="mf-primary-btn" to="/register" onClick={closeMobileMenu}>
                Register
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section className="mf-hero">
        <div className="mf-hero-bg-shapes">
          <div className="mf-shape mf-shape-1"></div>
          <div className="mf-shape mf-shape-2"></div>
          <div className="mf-shape mf-shape-3"></div>
        </div>
        <div className="mf-container mf-hero-grid">
          <div className="mf-hero-content">
            <div className="mf-hero-badge">
              <span className="mf-badge-dot"></span>
              Trusted by 10,000+ Patients
            </div>
            <h1 className="mf-hero-title">
              Smart Healthcare
              <span className="mf-gradient-text"> at Your Fingertips</span>
            </h1>
            <p className="mf-hero-subtitle">
              Book appointments, consult doctors online, and get AI-based health insights
              instantly with our premium telemedicine platform.
            </p>
            <div className="mf-search-row">
              <svg className="mf-search-icon" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
                <path d="M16 16L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <input placeholder="Search doctor or specialty (e.g., Cardiologist)" />
              <button type="button" className="mf-search-btn">
                <span>Search</span>
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"/>
                </svg>
              </button>
            </div>
            <div className="mf-hero-actions">
              <Link className="mf-btn mf-btn-primary" to="/doctors">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                  <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Book Appointment
              </Link>
              <button className="mf-btn mf-btn-secondary" type="button">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                AI Symptom Check
              </button>
            </div>
            <div className="mf-hero-stats">
              <div className="mf-stat">
                <strong>500+</strong>
                <span>Expert Doctors</span>
              </div>
              <div className="mf-stat">
                <strong>50K+</strong>
                <span>Happy Patients</span>
              </div>
              <div className="mf-stat">
                <strong>4.9★</strong>
                <span>Average Rating</span>
              </div>
            </div>
          </div>
          <div className="mf-hero-visual">
            <div className="mf-hero-image-wrapper">
              <div className="mf-floating-card mf-float-1">
                <div className="mf-card-icon">💊</div>
                <div>
                  <strong>Digital Prescription</strong>
                  <span>Instant delivery</span>
                </div>
              </div>
              <div className="mf-floating-card mf-float-2">
                <div className="mf-card-icon">🎥</div>
                <div>
                  <strong>Video Consultation</strong>
                  <span>HD Quality</span>
                </div>
              </div>
              <img
                className="mf-hero-main-image"
                src="/assets/hero-doctor.png"
                alt="Pharmacist with prescription"
                onError={(e) => fallbackToPlaceholder(e, bannerFallback)}
              />
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="mf-section">
        <div className="mf-container">
          <div className="mf-section-header">
            <span className="mf-section-badge">Our Services</span>
            <h2 className="mf-title">Everything You Need for Better Healthcare</h2>
            <p className="mf-section-subtitle">Comprehensive medical services at your fingertips</p>
          </div>
          <div className="mf-service-grid">
            <article className="mf-service-card">
              <div className="mf-service-icon">📅</div>
              <h3>Book Appointment</h3>
              <p>Choose doctor, date, and time in seconds.</p>
            </article>
            <article className="mf-service-card">
              <div className="mf-service-icon">🎥</div>
              <h3>Video Consultation</h3>
              <p>Secure telemedicine sessions from anywhere.</p>
            </article>
            <article className="mf-service-card">
              <div className="mf-service-icon">🤖</div>
              <h3>AI Symptom Checker</h3>
              <p>Get instant preliminary health suggestions.</p>
            </article>
            <article className="mf-service-card">
              <div className="mf-service-icon">📄</div>
              <h3>Upload Medical Reports</h3>
              <p>Store reports and share with doctors quickly.</p>
            </article>
            <article className="mf-service-card">
              <div className="mf-service-icon">💊</div>
              <h3>Digital Prescriptions</h3>
              <p>Receive and review prescriptions online.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="mf-section mf-soft">
        <div className="mf-container">
          <div className="mf-section-header">
            <span className="mf-section-badge">Meet Our Experts</span>
            <h2 className="mf-title">Featured Doctors</h2>
            <p className="mf-section-subtitle">Consult with highly qualified medical professionals</p>
          </div>
          <div className="mf-doctor-grid">
            {doctors.map((doctor) => (
              <article key={doctor.name} className="mf-doctor-card">
                <div className="mf-doctor-img-wrap">
                  <img
                    src={doctor.image}
                    alt={doctor.name}
                    onError={(e) => fallbackToPlaceholder(e, doctorFallback)}
                  />
                  <div className="mf-doctor-specialty-badge">{doctor.specialty}</div>
                  <div className="mf-doctor-rating-badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    {doctor.rating}
                  </div>
                </div>
                <div className="mf-doctor-info">
                  <h4>{doctor.name}</h4>
                  <Link className="mf-doctor-book-btn" to="/doctors">
                    Book Now
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mf-section">
        <div className="mf-container mf-ai-highlight">
          <div>
            <h2>AI Symptom Checker</h2>
            <p>
              Describe your symptoms and get instant suggestions powered by AI before consulting a
              doctor.
            </p>
            <button type="button" className="mf-try-now-btn">Try Now →</button>
          </div>
          <img
            src="https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80"
            alt="AI healthcare"
            onError={(e) => fallbackToPlaceholder(e, bannerFallback)}
          />
        </div>
      </section>

      <section className="mf-section mf-soft">
        <div className="mf-container">
          <div className="mf-section-header">
            <span className="mf-section-badge">Simple Process</span>
            <h2 className="mf-title">How It Works</h2>
            <p className="mf-section-subtitle">Get started in 4 easy steps</p>
          </div>
          <div className="mf-step-grid">
            <article className="mf-step-card">
              <div className="mf-step-icon">
                <svg viewBox="0 0 64 64" role="img" aria-label="Search doctor">
                  <circle cx="28" cy="28" r="14" />
                  <line x1="39" y1="39" x2="54" y2="54" />
                </svg>
              </div>
              <span className="mf-step-badge">Step 01</span>
              <h3>Search doctor or enter symptoms</h3>
              <p>Find specialists quickly or start with AI-based symptom guidance.</p>
            </article>
            <article className="mf-step-card">
              <div className="mf-step-icon">
                <svg viewBox="0 0 64 64" role="img" aria-label="Book appointment">
                  <rect x="10" y="12" width="44" height="42" rx="8" />
                  <line x1="10" y1="24" x2="54" y2="24" />
                  <line x1="21" y1="8" x2="21" y2="18" />
                  <line x1="43" y1="8" x2="43" y2="18" />
                </svg>
              </div>
              <span className="mf-step-badge">Step 02</span>
              <h3>Book appointment</h3>
              <p>Select a time slot and confirm your consultation in seconds.</p>
            </article>
            <article className="mf-step-card">
              <div className="mf-step-icon">
                <svg viewBox="0 0 64 64" role="img" aria-label="Video consultation">
                  <rect x="8" y="14" width="34" height="36" rx="7" />
                  <polygon points="44,24 56,20 56,44 44,40" />
                  <circle cx="25" cy="32" r="7" />
                </svg>
              </div>
              <span className="mf-step-badge">Step 03</span>
              <h3>Join video consultation</h3>
              <p>Connect securely with your doctor from any device.</p>
            </article>
            <article className="mf-step-card">
              <div className="mf-step-icon">
                <svg viewBox="0 0 64 64" role="img" aria-label="Digital prescription">
                  <rect x="14" y="8" width="36" height="48" rx="6" />
                  <line x1="22" y1="22" x2="42" y2="22" />
                  <line x1="22" y1="30" x2="42" y2="30" />
                  <line x1="22" y1="38" x2="36" y2="38" />
                  <polyline points="17,44 24,50 33,40" />
                </svg>
              </div>
              <span className="mf-step-badge">Step 04</span>
              <h3>Get digital prescription</h3>
              <p>Receive prescriptions and follow-up instructions instantly.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="about" className="mf-section">
        <div className="mf-container">
          <div className="mf-section-header">
            <span className="mf-section-badge">What People Say</span>
            <h2 className="mf-title">Patient Testimonials</h2>
            <p className="mf-section-subtitle">Real experiences from our valued patients</p>
          </div>
          <div className="mf-testimonial-grid">
            <article className="mf-testimonial-card">
              <div className="mf-testimonial-top">
                <img
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80"
                  alt="Nadeesha Perera"
                  onError={(e) => fallbackToPlaceholder(e, testimonialFallback)}
                />
                <div>
                  <h4>Nadeesha Perera</h4>
                  <span>Patient - Colombo</span>
                </div>
              </div>
              <div className="mf-stars" aria-label="5 star rating">
                ★★★★★
              </div>
              <p>
                "The booking flow is smooth and the doctor joined on time. I got my prescription
                right after the consultation."
              </p>
            </article>
            <article className="mf-testimonial-card">
              <div className="mf-testimonial-top">
                <img
                  src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80"
                  alt="Dr. Charith Mendis"
                  onError={(e) => fallbackToPlaceholder(e, testimonialFallback)}
                />
                <div>
                  <h4>Dr. Charith Mendis</h4>
                  <span>Consultant Physician</span>
                </div>
              </div>
              <div className="mf-stars" aria-label="5 star rating">
                ★★★★★
              </div>
              <p>
                "MediFlow gives clear patient history, uploaded reports, and a reliable video
                channel for consultations."
              </p>
            </article>
            <article className="mf-testimonial-card">
              <div className="mf-testimonial-top">
                <img
                  src="https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=300&q=80"
                  alt="Thilini Fernando"
                  onError={(e) => fallbackToPlaceholder(e, testimonialFallback)}
                />
                <div>
                  <h4>Thilini Fernando</h4>
                  <span>Patient - Kandy</span>
                </div>
              </div>
              <div className="mf-stars" aria-label="4.5 star rating">
                ★★★★☆
              </div>
              <p>
                "I can manage appointments and reports in one place. The interface is clean and
                very easy to use on mobile."
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="mf-section mf-soft">
        <div className="mf-container">
          <div className="mf-section-header">
            <span className="mf-section-badge">Our Advantages</span>
            <h2 className="mf-title">Why Choose MediFlow</h2>
            <p className="mf-section-subtitle">Experience healthcare reimagined</p>
          </div>
          <div className="mf-why-grid">
            <article className="mf-why-card">
              <img
                className="mf-why-vector"
                src="https://cdn-icons-png.flaticon.com/512/3063/3063822.png"
                alt="Secure and private consultations"
              />
              <h3>Secure & private consultations</h3>
              <p>Encrypted sessions and protected medical data for complete peace of mind.</p>
            </article>
            <article className="mf-why-card">
              <img
                className="mf-why-vector"
                src="https://cdn-icons-png.flaticon.com/512/2785/2785544.png"
                alt="Verified doctors"
              />
              <h3>Verified doctors</h3>
              <p>Consult trusted, qualified professionals across multiple specialties.</p>
            </article>
            <article className="mf-why-card">
              <img
                className="mf-why-vector"
                src="https://cdn-icons-png.flaticon.com/512/2920/2920349.png"
                alt="Fast booking"
              />
              <h3>Fast booking</h3>
              <p>Find available slots quickly and confirm appointments in a few taps.</p>
            </article>
            <article className="mf-why-card">
              <img
                className="mf-why-vector"
                src="https://cdn-icons-png.flaticon.com/512/2331/2331941.png"
                alt="Online payments"
              />
              <h3>Online payments</h3>
              <p>Pay consultation fees securely with seamless digital transactions.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="contact" className="mf-section mf-soft">
        <div className="mf-container mf-contact mf-contact-premium">
          <div className="mf-contact-main">
            <span className="mf-chip">24/7 Assistance</span>
            <h2>Contact / Support</h2>
            <p>
              Our care support team is ready to help with appointments, video consultation access,
              billing, and technical issues.
            </p>
            <div className="mf-contact-actions">
              <a href="mailto:support@mediflow.lk">support@mediflow.lk</a>
              <a href="tel:+94112345678">+94 11 234 5678</a>
              <a href="https://help.mediflow.lk" target="_blank" rel="noreferrer">
                help.mediflow.lk
              </a>
            </div>
          </div>
          <div className="mf-contact-cards">
            <article>
              <h4>Average Response</h4>
              <p>Under 5 minutes</p>
            </article>
            <article>
              <h4>Support Channels</h4>
              <p>Email, Phone, Help Center</p>
            </article>
            <article>
              <h4>Availability</h4>
              <p>24 hours, 7 days</p>
            </article>
          </div>
        </div>
      </section>

      <footer className="mf-footer">
        <div className="mf-container">
          <div className="mf-footer-grid">
            <div className="mf-footer-brand">
              <div className="mf-footer-logo">
                <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
                  <defs>
                    <linearGradient id="footerLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#60a5fa" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                  <circle cx="20" cy="20" r="18" stroke="url(#footerLogoGrad)" strokeWidth="2.5" fill="none"/>
                  <rect x="18" y="12" width="4" height="16" rx="2" fill="url(#footerLogoGrad)"/>
                  <rect x="12" y="18" width="16" height="4" rx="2" fill="url(#footerLogoGrad)"/>
                </svg>
                <span>MediFlow</span>
              </div>
              <p>Your trusted partner in digital healthcare. Connecting patients with expert doctors anytime, anywhere.</p>
              <div className="mf-social-links">
                <a href="#" aria-label="Facebook">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a href="#" aria-label="Twitter">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </a>
                <a href="#" aria-label="LinkedIn">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
                <a href="#" aria-label="Instagram">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
                  </svg>
                </a>
              </div>
            </div>
            <div className="mf-footer-links-group">
              <h4>Quick Links</h4>
              <a href="/">Home</a>
              <Link to="/doctors">Find Doctors</Link>
              <a href="#services">Services</a>
              <a href="#about">About Us</a>
            </div>
            <div className="mf-footer-links-group">
              <h4>Support</h4>
              <a href="#contact">Contact Us</a>
              <a href="/">Help Center</a>
              <a href="/">FAQ</a>
              <a href="/">Privacy Policy</a>
            </div>
            <div className="mf-footer-links-group">
              <h4>Contact</h4>
              <a href="mailto:support@mediflow.lk">support@mediflow.lk</a>
              <a href="tel:+94112345678">+94 11 234 5678</a>
              <p className="mf-footer-address">123 Healthcare Ave,<br/>Colombo, Sri Lanka</p>
            </div>
          </div>
          <div className="mf-footer-bottom">
            <p>© {new Date().getFullYear()} MediFlow. All rights reserved.</p>
            <div className="mf-footer-bottom-links">
              <a href="/">Terms of Service</a>
              <a href="/">Privacy Policy</a>
              <a href="/">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
