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
  "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80";

function fallbackToPlaceholder(e, placeholder) {
  e.currentTarget.onerror = null;
  e.currentTarget.src = placeholder;
}

export default function HomePage() {
  return (
    <main className="mf-page">
      <header className="mf-navbar">
        <div className="mf-container mf-nav-inner">
          <div className="mf-logo">MediFlow</div>
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
            <Link className="mf-dark-btn" to="/doctors">
              Book Appointment
            </Link>
          </div>
        </div>
      </header>

      <section className="mf-hero">
        <div className="mf-container mf-hero-grid">
          <div>
            <h1>
              Smart Healthcare at Your Fingertips
            </h1>
            <p>
              Book appointments, consult doctors online, and get AI-based health insights
              instantly.
            </p>
            <div className="mf-search-row">
              <input placeholder="Search doctor or specialty (e.g., Cardiologist)" />
              <button type="button">Search</button>
            </div>
            <div className="mf-row">
              <Link className="mf-primary-btn" to="/doctors">
                Find a Doctor
              </Link>
              <button className="mf-secondary-btn" type="button">
                Start AI Symptom Check
              </button>
            </div>
          </div>
          <div className="mf-hero-image">
            <img
              src="https://images.unsplash.com/photo-1584432810601-6c7f27d2362b?q=80&w=1083&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
              alt="Doctor consultation"
              onError={(e) => fallbackToPlaceholder(e, bannerFallback)}
            />
          </div>
        </div>
      </section>

      <section id="services" className="mf-section">
        <div className="mf-container">
          <h2 className="mf-title">Quick Services</h2>
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
          <h2 className="mf-title">Featured Doctors</h2>
          <div className="mf-doctor-grid">
            {doctors.map((doctor) => (
              <article key={doctor.name} className="mf-doctor-card">
                <img
                  src={doctor.image}
                  alt={doctor.name}
                  onError={(e) => fallbackToPlaceholder(e, doctorFallback)}
                />
                <h4>{doctor.name}</h4>
                <p>{doctor.specialty}</p>
                <small>⭐ {doctor.rating}</small>
                <button type="button">Book Now</button>
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
            <button type="button">Try Now</button>
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
          <h2 className="mf-title">How It Works</h2>
          <div className="mf-step-grid">
            <article>1. Search doctor / enter symptoms</article>
            <article>2. Book appointment</article>
            <article>3. Join video consultation</article>
            <article>4. Get digital prescription</article>
          </div>
        </div>
      </section>

      <section id="about" className="mf-section">
        <div className="mf-container">
          <h2 className="mf-title">Testimonials</h2>
          <div className="mf-testimonial-grid">
            <article>
              <p>"Easy booking and helpful doctors."</p>
              <strong>- Patient Review</strong>
            </article>
            <article>
              <p>"Smooth consultation flow and clear records."</p>
              <strong>- Doctor Review</strong>
            </article>
            <article>
              <p>"A trusted platform for online care."</p>
              <strong>- Patient Review</strong>
            </article>
          </div>
        </div>
      </section>

      <section className="mf-section mf-soft">
        <div className="mf-container">
          <h2 className="mf-title">Why Choose Us</h2>
          <div className="mf-step-grid">
            <article>Secure & private consultations</article>
            <article>Verified doctors</article>
            <article>Fast booking</article>
            <article>Online payments</article>
          </div>
        </div>
      </section>

      <section className="mf-section">
        <div className="mf-container mf-mobile-box">
          <h2>Access Anywhere - Web & Mobile</h2>
          <p>Use MediFlow on desktop and mobile for uninterrupted healthcare access.</p>
        </div>
      </section>

      <section id="contact" className="mf-section mf-soft">
        <div className="mf-container mf-contact">
          <h2>Contact / Support</h2>
          <p>Email: support@mediflow.lk</p>
          <p>Phone: +94 11 234 5678</p>
          <p>Help Center: help.mediflow.lk</p>
        </div>
      </section>

      <footer className="mf-footer">
        <div className="mf-container">
          <div className="mf-footer-links">
            <a href="/">Privacy Policy</a>
            <a href="/">Terms</a>
            <a href="/">FAQ</a>
            <a href="/">Social</a>
          </div>
          <p>© {new Date().getFullYear()} MediFlow. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
