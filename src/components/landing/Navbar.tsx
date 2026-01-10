import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Church, Menu, X } from "lucide-react";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm">
      <div className="container">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Church className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">ChurchFlow</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">
              How It Works
            </a>
            <a href="#features" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">
              Features
            </a>
            <a href="#faq" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">
              FAQ
            </a>
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/member/login">
              <Button variant="ghost" size="default" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                Church Member Login
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="default" className="border-slate-300 text-slate-700 hover:bg-slate-50">
                Church Admin Login
              </Button>
            </Link>
            <Link to="/signup/church">
              <Button size="default" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25">
                Start Free Trial
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            {isOpen ? <X className="w-6 h-6 text-slate-700" /> : <Menu className="w-6 h-6 text-slate-700" />}
          </button>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="md:hidden border-t border-slate-200 py-4 animate-fade-in bg-white">
            <div className="flex flex-col gap-4">
              <a
                href="#how-it-works"
                className="text-slate-600 hover:text-slate-900 transition-colors font-medium px-2 py-2"
                onClick={() => setIsOpen(false)}
              >
                How It Works
              </a>
              <a
                href="#features"
                className="text-slate-600 hover:text-slate-900 transition-colors font-medium px-2 py-2"
                onClick={() => setIsOpen(false)}
              >
                Features
              </a>
              <a
                href="#faq"
                className="text-slate-600 hover:text-slate-900 transition-colors font-medium px-2 py-2"
                onClick={() => setIsOpen(false)}
              >
                FAQ
              </a>
              <div className="flex flex-col gap-2 pt-4 border-t border-slate-200">
                <Link to="/member/login" onClick={() => setIsOpen(false)}>
                  <Button variant="ghost" className="w-full text-slate-600">
                    Church Member Login
                  </Button>
                </Link>
                <Link to="/login" onClick={() => setIsOpen(false)}>
                  <Button variant="outline" className="w-full border-slate-300">
                    Church Admin Login
                  </Button>
                </Link>
                <Link to="/signup/church" onClick={() => setIsOpen(false)}>
                  <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                    Start Free Trial
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
