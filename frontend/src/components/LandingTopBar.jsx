import { Link } from "react-router-dom";

export default function LandingTopBar({ active = "home", onHomePage = false }) {
  const sec = (id) => (onHomePage ? `#${id}` : `/#${id}`);
  const linkClass = "relative font-semibold text-[15px] text-on-surface-variant transition-all duration-300 hover:text-[#437A00] after:content-[''] after:absolute after:bottom-[-6px] after:left-0 after:w-0 after:h-[2px] after:bg-[#437A00] after:transition-all after:duration-300 hover:after:w-full whitespace-nowrap";
  const activeClass = "relative font-bold text-[15px] text-[#437A00] after:content-[''] after:absolute after:bottom-[-6px] after:left-0 after:w-full after:h-[3px] after:bg-[#437A00] whitespace-nowrap";

  return (
    <nav className="fixed top-0 z-50 w-full h-[72px] border-b border-outline-variant/10 bg-white shadow-sm backdrop-blur-md flex items-center font-sans">
      <div className="mx-auto w-full max-w-screen-2xl flex items-center justify-between px-8">
        <Link to="/" className="font-headline text-2xl font-extrabold tracking-tight text-[#043927]">MediFlow</Link>
        <div className="hidden items-center gap-8 md:flex">
          <Link className={active === "home" ? activeClass : linkClass} to="/">Home</Link>
          <Link className={active === "about" ? activeClass : linkClass} to="/about">About Us</Link>
          <Link className={active === "doctors" ? activeClass : linkClass} to="/doctors">Doctors</Link>
          <Link className={active === "privacy" ? activeClass : linkClass} to="/privacy">Privacy Policy</Link>
          <Link className={active === "contact" ? activeClass : linkClass} to="/contact">Contact Us</Link>
        </div>
        <div className="flex items-center gap-4">
          <Link className="hidden rounded-full px-4 py-2 font-bold text-[#437A00] transition-all hover:bg-[#437A00]/10 lg:block" to="/login">Login</Link>
          <Link className="rounded-full bg-[#437A00] px-6 py-3 font-bold text-on-primary transition-all duration-150 hover:shadow-lg active:scale-95" to="/doctors">Book Appointment</Link>
        </div>
      </div>
    </nav>
  );
}
