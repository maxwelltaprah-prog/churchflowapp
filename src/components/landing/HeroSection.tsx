import { Button } from "@/components/ui/button";
import { ArrowRight, Church, Heart, Users, QrCode, Bell, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

export function HeroSection() {
  return (
    <section className="relative min-h-screen bg-gradient-hero overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute top-1/2 -left-20 w-72 h-72 bg-accent/10 rounded-full blur-3xl animate-float-delayed" />
        <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse-slow" />
      </div>

      <div className="container relative z-10 pt-32 pb-20 lg:pt-40 lg:pb-32">
        <div className="max-w-4xl mx-auto text-center animate-fade-in">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border shadow-soft mb-8">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-sm font-medium text-muted-foreground">
              No complicated setup • Works on any phone
            </span>
          </div>

          {/* Main headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight mb-6">
            <span className="text-foreground">From Congregation</span>
            <br />
            <span className="text-gradient">to Connection.</span>
          </h1>

          {/* Subtext */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            ChurchFlow helps you know your members, follow up with care, and 
            serve more personally—across every branch.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Link to="/signup/church">
              <Button variant="hero" size="xl">
                <Church className="w-5 h-5" />
                Create Church Account
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/join">
              <Button variant="heroOutline" size="xl">
                <Users className="w-5 h-5" />
                Join as Member
              </Button>
            </Link>
          </div>

          {/* Trust line */}
          <p className="text-sm text-muted-foreground mb-16">
            Set up in minutes. No complicated hardware needed.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { icon: QrCode, text: "Scan to Connect" },
              { icon: Heart, text: "Care Signals" },
              { icon: Users, text: "People Directory" },
            ].map((feature, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-card/80 backdrop-blur-sm border border-border shadow-soft"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <feature.icon className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hero visual - Care Dashboard Mock */}
        <div className="mt-16 lg:mt-24 max-w-5xl mx-auto animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="relative">
            {/* Main card */}
            <div className="bg-card rounded-2xl shadow-elevated border border-border p-6 md:p-8">
              <div className="grid md:grid-cols-3 gap-6">
                {/* Care Signals Preview */}
                <div className="bg-secondary rounded-xl p-6 text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-card">
                    <Heart className="w-10 h-10 text-primary-foreground" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">People We Miss</h3>
                  <p className="text-sm text-muted-foreground">Care follow-up needed</p>
                </div>

                {/* Birthday Preview */}
                <div className="bg-secondary rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-5 h-5 text-accent" />
                    <span className="font-semibold text-foreground">Birthdays This Week</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 bg-background rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-sm font-medium">SK</div>
                      <span className="text-sm">Sarah Kofi</span>
                      <span className="ml-auto text-xs text-muted-foreground">Today!</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-background rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">JA</div>
                      <span className="text-sm">John Agyei</span>
                      <span className="ml-auto text-xs text-muted-foreground">Wed</span>
                    </div>
                  </div>
                </div>

                {/* Welcome Back Preview */}
                <div className="bg-secondary rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Bell className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-foreground">Welcome Back</span>
                  </div>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-green-700">AM</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-green-900">Amina Mensah</div>
                        <div className="text-xs text-green-700">Returned after 3 weeks</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating elements */}
            <div className="absolute -top-4 -left-4 bg-accent text-accent-foreground px-4 py-2 rounded-full shadow-card text-sm font-medium animate-float">
              ✓ You're connected!
            </div>
            <div className="absolute -bottom-4 -right-4 bg-card border border-border px-4 py-2 rounded-full shadow-card text-sm font-medium animate-float-delayed">
              💛 Engagement Insights
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
