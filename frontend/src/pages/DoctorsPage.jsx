import { Link } from "react-router-dom";

const doctors = [
  { id: 1, name: "Dr. Nimal Perera", specialization: "Cardiology" },
  { id: 2, name: "Dr. Ayesha Silva", specialization: "Dermatology" },
  { id: 3, name: "Dr. Kavinda Fernando", specialization: "Neurology" },
  { id: 4, name: "Dr. S. Jayasinghe", specialization: "General Medicine" }
];

export default function DoctorsPage() {
  return (
    <main className="page">
      <section className="topbar">
        <h2>Doctors Listing</h2>
        <Link to="/" className="btn-secondary">
          Home
        </Link>
      </section>
      <section className="doctor-grid">
        {doctors.map((doctor) => (
          <article key={doctor.id} className="doctor-card">
            <h3>{doctor.name}</h3>
            <p className="muted">{doctor.specialization}</p>
            <button type="button">Book Appointment</button>
          </article>
        ))}
      </section>
    </main>
  );
}
