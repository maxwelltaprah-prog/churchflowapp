import { Link } from "react-router-dom";
import { Church, Mail, Phone, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                <Church className="w-6 h-6 text-accent-foreground" />
              </div>
              <span className="text-xl font-bold">ChurchFlow</span>
            </Link>
            <p className="text-primary-foreground/70 max-w-md mb-6 leading-relaxed">
              Modern church attendance management for growing congregations. 
              QR-based check-in, multi-branch support, and powerful analytics — all from phones.
            </p>
            <div className="flex flex-col gap-2 text-sm text-primary-foreground/70">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>support@churchflow.app</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>+1 (555) 123-4567</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/signup/church" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  Create Church Account
                </Link>
              </li>
              <li>
                <Link to="/join" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  Join Your Branch
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  Log In
                </Link>
              </li>
              <li>
                <a href="#how-it-works" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#features" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  Features
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/privacy" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/support" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  Support
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-primary-foreground/10 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-primary-foreground/60">
            © {new Date().getFullYear()} ChurchFlow. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors text-sm">
              Facebook
            </a>
            <a href="#" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors text-sm">
              Twitter
            </a>
            <a href="#" className="text-primary-foreground/60 hover:text-primary-foreground transition-colors text-sm">
              Instagram
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
