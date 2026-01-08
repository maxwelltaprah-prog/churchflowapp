import { Button } from "@/components/ui/button";
import { Church, Users, ArrowRight, Heart } from "lucide-react";
import { Link } from "react-router-dom";

export function CTASection() {
  return (
    <section className="py-24 lg:py-32 bg-gradient-hero relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="container relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Smart Care Alerts Section */}
          <div className="bg-card/50 backdrop-blur-sm rounded-3xl border border-border p-8 md:p-12 mb-12">
            <div className="text-center mb-8">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <Heart className="w-4 h-4" />
                Smart Care Reminders
              </span>
              <h3 className="text-2xl md:text-3xl font-bold mb-4">
                Reminders that protect connection.
              </h3>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="font-medium text-amber-900 mb-1">Missed 3 consecutive services</div>
                <div className="text-sm text-amber-700">Care follow-up needed</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="font-medium text-green-900 mb-1">Welcome back alert</div>
                <div className="text-sm text-green-700">They're back—reach out</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="font-medium text-red-900 mb-1">Absent 2 months</div>
                <div className="text-sm text-red-700">Personalized care recommended</div>
              </div>
              <div className="bg-pink-50 border border-pink-200 rounded-xl p-4">
                <div className="font-medium text-pink-900 mb-1">Birthdays & anniversaries</div>
                <div className="text-sm text-pink-700">Celebrate them on time</div>
              </div>
            </div>
          </div>

          {/* Main CTA Card */}
          <div className="bg-card rounded-3xl shadow-elevated border border-border p-8 md:p-12 lg:p-16 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
              </span>
              Get started for free
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Start building connection—<span className="text-gradient">this week.</span>
            </h2>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
              Set up in minutes and serve people more personally. 
              Know your members. Care better.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
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

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 mt-12 pt-12 border-t border-border">
              <div>
                <div className="text-3xl md:text-4xl font-bold text-primary">500+</div>
                <div className="text-sm text-muted-foreground mt-1">Churches</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-accent">50K+</div>
                <div className="text-sm text-muted-foreground mt-1">Members</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-primary">1M+</div>
                <div className="text-sm text-muted-foreground mt-1">Connections</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
