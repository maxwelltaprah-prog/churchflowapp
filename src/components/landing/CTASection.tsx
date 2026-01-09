import { Button } from "@/components/ui/button";
import { Church, Users, ArrowRight, Heart } from "lucide-react";
import { Link } from "react-router-dom";

export function CTASection() {
  return (
    <section className="py-24 lg:py-32 bg-gradient-to-b from-slate-50 via-white to-indigo-50/50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-100/50 rounded-full blur-3xl" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-100/50 rounded-full blur-3xl" />
      </div>

      <div className="container relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Smart Care Alerts Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-200 shadow-xl p-8 md:p-12 mb-12">
            <div className="text-center mb-8">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-100 text-rose-700 text-sm font-medium mb-4">
                <Heart className="w-4 h-4" />
                Smart Care Reminders
              </span>
              <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
                Reminders that protect connection.
              </h3>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="font-medium text-amber-900 mb-1">Missed 3 consecutive services</div>
                <div className="text-sm text-amber-700">Care follow-up needed</div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="font-medium text-emerald-900 mb-1">Welcome back alert</div>
                <div className="text-sm text-emerald-700">They're back—reach out</div>
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                <div className="font-medium text-rose-900 mb-1">Absent 2 months</div>
                <div className="text-sm text-rose-700">Personalized care recommended</div>
              </div>
              <div className="bg-pink-50 border border-pink-200 rounded-xl p-4">
                <div className="font-medium text-pink-900 mb-1">Birthdays & anniversaries</div>
                <div className="text-sm text-pink-700">Celebrate them on time</div>
              </div>
            </div>
          </div>

          {/* Main CTA Card */}
          <div className="bg-white rounded-3xl shadow-2xl shadow-slate-900/10 border border-slate-200 p-8 md:p-12 lg:p-16 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Get started for free
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
              Start building connection—
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                this week.
              </span>
            </h2>

            <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-10">
              Set up in minutes and serve people more personally. 
              Know your members. Care better.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/signup/church">
                <Button size="xl" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300 hover:scale-[1.02]">
                  <Church className="w-5 h-5" />
                  Create Church Account
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/join">
                <Button size="xl" variant="outline" className="border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300">
                  <Users className="w-5 h-5" />
                  Join as Member
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 mt-12 pt-12 border-t border-slate-200">
              <div>
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">500+</div>
                <div className="text-sm text-slate-500 mt-1">Churches</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">50K+</div>
                <div className="text-sm text-slate-500 mt-1">Members</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">1M+</div>
                <div className="text-sm text-slate-500 mt-1">Connections</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
