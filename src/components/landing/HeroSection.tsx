import { Button } from "@/components/ui/button";
import { ArrowRight, Church, Heart, Users, QrCode, Bell, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

export function HeroSection() {
  return (
    <section className="relative min-h-screen bg-gradient-to-b from-slate-50 via-white to-indigo-50/30 overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl animate-float" />
        <div className="absolute top-1/2 -left-20 w-72 h-72 bg-purple-200/30 rounded-full blur-3xl animate-float-delayed" />
        <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-orange-200/25 rounded-full blur-3xl animate-pulse-slow" />
      </div>

      <div className="container relative z-10 pt-32 pb-20 lg:pt-40 lg:pb-32">
        <div className="max-w-4xl mx-auto text-center animate-fade-in">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm mb-8">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-slate-600">
              No complicated setup • Works on any phone
            </span>
          </div>

          {/* Main headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight mb-6">
            <span className="text-slate-900">From Congregation</span>
            <br />
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
              to Connection.
            </span>
          </h1>

          {/* Subtext */}
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            ChurchFlow helps you know your members, follow up with care, and 
            serve more personally—across every branch.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
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

          {/* Trust line */}
          <p className="text-sm text-slate-500 mb-16">
            Set up in minutes. No complicated hardware needed.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { icon: QrCode, text: "Scan to Connect", color: "indigo" },
              { icon: Heart, text: "Care Signals", color: "rose" },
              { icon: Users, text: "People Directory", color: "purple" },
            ].map((feature, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <feature.icon className={`w-4 h-4 ${
                  feature.color === 'indigo' ? 'text-indigo-600' :
                  feature.color === 'rose' ? 'text-rose-500' : 'text-purple-600'
                }`} />
                <span className="text-sm font-medium text-slate-700">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hero visual - Care Dashboard Mock */}
        <div className="mt-16 lg:mt-24 max-w-5xl mx-auto animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="relative">
            {/* Main card */}
            <div className="bg-white rounded-2xl shadow-2xl shadow-slate-900/10 border border-slate-200 p-6 md:p-8">
              <div className="grid md:grid-cols-3 gap-6">
                {/* Care Signals Preview */}
                <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-6 text-center border border-rose-100">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-rose-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/25">
                    <Heart className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">People We Miss</h3>
                  <p className="text-sm text-slate-600">Care follow-up needed</p>
                </div>

                {/* Birthday Preview */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-5 h-5 text-amber-600" />
                    <span className="font-semibold text-slate-900">Birthdays This Week</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-amber-100">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-sm font-medium text-white">SK</div>
                      <span className="text-sm text-slate-700">Sarah Kofi</span>
                      <span className="ml-auto text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Today!</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-amber-100">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-sm font-medium text-white">JA</div>
                      <span className="text-sm text-slate-700">John Agyei</span>
                      <span className="ml-auto text-xs text-slate-500">Wed</span>
                    </div>
                  </div>
                </div>

                {/* Welcome Back Preview */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Bell className="w-5 h-5 text-emerald-600" />
                    <span className="font-semibold text-slate-900">Welcome Back</span>
                  </div>
                  <div className="p-3 bg-white border border-emerald-200 rounded-lg shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center">
                        <span className="text-sm font-medium text-white">AM</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">Amina Mensah</div>
                        <div className="text-xs text-emerald-600">Returned after 3 weeks</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating elements */}
            <div className="absolute -top-4 -left-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 rounded-full shadow-lg shadow-emerald-500/25 text-sm font-medium animate-float">
              ✓ You're connected!
            </div>
            <div className="absolute -bottom-4 -right-4 bg-white border border-slate-200 px-4 py-2 rounded-full shadow-lg text-sm font-medium text-slate-700 animate-float-delayed">
              💛 Engagement Insights
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
