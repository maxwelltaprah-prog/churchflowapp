import { Button } from "@/components/ui/button";
import { Church, Users, ArrowRight, Heart } from "lucide-react";
import { Link } from "react-router-dom";

export function CTASection() {
  return (
    <section className="py-24 lg:py-32 relative overflow-hidden">
      {/* Rich creative background */}
      <div className="absolute inset-0">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/60" />
        
        {/* Large central glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-gradient-to-br from-indigo-200/40 via-purple-200/30 to-pink-200/20 rounded-full blur-3xl" />
        
        {/* Corner accents */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-purple-300/30 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-gradient-to-tr from-teal-200/30 to-transparent rounded-full blur-3xl" />
        
        {/* Radial pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_50%,rgba(99,102,241,0.02)_50%,rgba(99,102,241,0.02)_51%,transparent_51%)] bg-[size:100px_100px]" />
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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-700 text-sm font-medium mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
              Now in Testing Phase — 1 Month Free Access
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
              Be part of something
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {" "}great.
              </span>
            </h2>

            <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-6">
              Join our 1-month testing phase with full access to all features. 
              Your feedback shapes the future of ChurchFlow.
            </p>

            {/* Testing phase info box */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-5 max-w-xl mx-auto mb-8">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-900 mb-1">We value your feedback!</p>
                  <p className="text-sm text-slate-600">
                    During testing, all features are free. Share your feedback at{" "}
                    <span className="font-semibold text-indigo-600">info@easychurchflow.com</span> and receive a 
                    <span className="font-semibold text-purple-600"> special discount</span> when production begins.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/signup/church">
                <Button size="xl" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300 hover:scale-[1.02]">
                  <Church className="w-5 h-5" />
                  Join Testing Phase
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
