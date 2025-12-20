import { Button } from "@/components/ui/button";
import { ArrowRight, Church, QrCode, Users } from "lucide-react";
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
              No hardware required • Works on any phone
            </span>
          </div>

          {/* Main headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight mb-6">
            <span className="text-foreground">Smart Church Attendance</span>
            <br />
            <span className="text-gradient">Across All Branches</span>
          </h1>

          {/* Subtext */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            QR-based check-in, branch-level insights, and member engagement — 
            all from phones. One platform for your entire church network.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
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
                Join Your Branch
              </Button>
            </Link>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { icon: QrCode, text: "QR Check-in" },
              { icon: Church, text: "Multi-Branch" },
              { icon: Users, text: "Member Management" },
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

        {/* Hero visual */}
        <div className="mt-16 lg:mt-24 max-w-5xl mx-auto animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="relative">
            {/* Main card */}
            <div className="bg-card rounded-2xl shadow-elevated border border-border p-6 md:p-8">
              <div className="grid md:grid-cols-3 gap-6">
                {/* QR Scanner Preview */}
                <div className="bg-secondary rounded-xl p-6 text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-card">
                    <QrCode className="w-10 h-10 text-primary-foreground" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Scan & Check-in</h3>
                  <p className="text-sm text-muted-foreground">Under 6 seconds</p>
                </div>

                {/* Stats Preview */}
                <div className="bg-secondary rounded-xl p-6">
                  <div className="text-3xl font-bold text-primary mb-1">2,847</div>
                  <div className="text-sm text-muted-foreground mb-4">Total Attendance This Week</div>
                  <div className="flex gap-2">
                    <div className="flex-1 h-2 bg-primary/20 rounded-full overflow-hidden">
                      <div className="h-full w-3/4 bg-gradient-primary rounded-full" />
                    </div>
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>5 Branches</span>
                    <span>↑ 12% growth</span>
                  </div>
                </div>

                {/* Member Card Preview */}
                <div className="bg-secondary rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-accent flex items-center justify-center text-accent-foreground font-bold">
                      JD
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">John Doe</div>
                      <div className="text-xs text-muted-foreground">Main Branch • Member</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-background rounded-lg p-2">
                      <div className="text-lg font-bold text-primary">48</div>
                      <div className="text-xs text-muted-foreground">Attendance</div>
                    </div>
                    <div className="bg-background rounded-lg p-2">
                      <div className="text-lg font-bold text-accent">94%</div>
                      <div className="text-xs text-muted-foreground">Rate</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating elements */}
            <div className="absolute -top-4 -left-4 bg-accent text-accent-foreground px-4 py-2 rounded-full shadow-card text-sm font-medium animate-float">
              ✓ Member Checked In
            </div>
            <div className="absolute -bottom-4 -right-4 bg-card border border-border px-4 py-2 rounded-full shadow-card text-sm font-medium animate-float-delayed">
              📊 Real-time Analytics
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
