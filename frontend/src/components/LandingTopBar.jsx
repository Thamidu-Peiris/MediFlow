import { Link } from "react-router-dom";

export default function LandingTopBar({ active = "home", onHomePage = false }) {
  const sec = (id) => (onHomePage ? `#${id}` : `/#${id}`);
  const linkClass = "font-medium text-on-surface-variant transition-all duration-300 hover:text-primary";
  const activeClass = "border-b-2 border-primary pb-1 font-semibold text-primary";

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-outline-variant/10 bg-white/80 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-8 py-4">
        <Link to="/" className="font-headline text-2xl font-extrabold tracking-tight text-primary">MediFlow</Link>
        <div className="hidden items-center gap-8 md:flex">
          <Link className={active === "home" ? activeClass : linkClass} to="/">Home</Link>
          <Link className={active === "about" ? activeClass : linkClass} to="/about">About Us</Link>
          <Link className={active === "doctors" ? activeClass : linkClass} to="/doctors">Doctors</Link>
          <Link className={active === "privacy" ? activeClass : linkClass} to="/privacy">Privacy Policy</Link>
          <Link className={active === "contact" ? activeClass : linkClass} to="/contact">Contact Us</Link>
        </div>
        <div className="flex items-center gap-4">
          <Link className="hidden rounded-full px-4 py-2 font-bold text-primary transition-all hover:bg-primary-fixed/30 lg:block" to="/login">Login</Link>
          <Link className="rounded-full bg-primary px-6 py-3 font-bold text-on-primary transition-all duration-150 hover:shadow-lg active:scale-95" to="/doctors">Book Appointment</Link>
        </div>
      </div>
    </nav>
  );
}
