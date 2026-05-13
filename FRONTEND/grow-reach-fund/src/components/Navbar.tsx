import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import smcLogo from "@/assets/smc-logo.png";

const navLinks = [
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

const Navbar = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isLanding = location.pathname === "/";

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all ${isLanding ? "bg-transparent" : "bg-card shadow-soft"}`}>
      <div className="container mx-auto flex items-center justify-between py-4 px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={smcLogo} alt="SMC Logo" className="h-10 w-10 rounded-full object-cover" />
          <span className={`text-xl font-bold font-display ${isLanding ? "text-primary-foreground" : "text-foreground"}`}>
            SMC
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-medium transition-colors ${
                isLanding
                  ? "text-primary-foreground/80 hover:text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link to="/signin" className={`text-sm font-medium transition-colors ${isLanding ? "text-primary-foreground/80 hover:text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            Sign In
          </Link>
          <Link to="/signup">
            <Button variant={isLanding ? "heroOutline" : "default"} size="sm">
              Get Started
            </Button>
          </Link>
        </div>

        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? (
            <X className={`h-6 w-6 ${isLanding ? "text-primary-foreground" : "text-foreground"}`} />
          ) : (
            <Menu className={`h-6 w-6 ${isLanding ? "text-primary-foreground" : "text-foreground"}`} />
          )}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-card border-t border-border p-4 flex flex-col gap-3">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm font-medium text-foreground py-2"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link to="/signin" className="text-sm font-medium text-foreground py-2" onClick={() => setMobileOpen(false)}>
            Sign In
          </Link>
          <Link to="/signup" onClick={() => setMobileOpen(false)}>
            <Button className="w-full min-h-[48px]">Get Started</Button>
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
