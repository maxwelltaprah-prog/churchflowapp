import { 
  Building2, 
  BarChart3, 
  Smartphone, 
  Shield, 
  Users, 
  MessageSquare,
  Globe,
  Zap,
  Heart,
  Download,
  Clock
} from "lucide-react";

const churchFeatures = [
  {
    icon: Building2,
    title: "Care Across Every Branch",
    description: "One dashboard for all your locations. Know every member, serve every community.",
    color: "indigo",
  },
  {
    icon: BarChart3,
    title: "Engagement Insights",
    description: "See who's connected, who's drifting, and when to follow up—all in real time.",
    color: "purple",
  },
  {
    icon: MessageSquare,
    title: "Care Messages",
    description: "Send personalized messages that feel human—birthdays, follow-ups, encouragements.",
    color: "rose",
  },
  {
    icon: Shield,
    title: "Serve as a Team",
    description: "Granular roles for church admins, branch managers, and ushers to care together.",
    color: "teal",
  },
];

const memberFeatures = [
  {
    icon: Smartphone,
    title: "Personal Member Pass",
    description: "Your unique QR code—Scan to Connect at any service, any branch.",
    color: "amber",
  },
  {
    icon: Users,
    title: "Simple Registration",
    description: "Join via branch link or with help from church staff. No app download needed.",
    color: "emerald",
  },
  {
    icon: Zap,
    title: "Fast Check-in, Care Signal",
    description: "6-second connection that becomes a care signal for your church leaders.",
    color: "orange",
  },
  {
    icon: Globe,
    title: "One Member, Every Location",
    description: "Visiting another branch? Connect seamlessly with your same member pass.",
    color: "blue",
  },
];

const memberHubFeatures = [
  {
    icon: Download,
    title: "Download Today's Program",
    description: "Access service programs immediately after connecting.",
  },
  {
    icon: Clock,
    title: "View Engagement History",
    description: "See your connection journey with your church community.",
  },
  {
    icon: Heart,
    title: "Access Church Resources",
    description: "Sermons, devotionals, and training materials—all in one place.",
  },
];

const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
  indigo: { bg: "bg-indigo-100", text: "text-indigo-600", border: "border-indigo-200" },
  purple: { bg: "bg-purple-100", text: "text-purple-600", border: "border-purple-200" },
  rose: { bg: "bg-rose-100", text: "text-rose-600", border: "border-rose-200" },
  teal: { bg: "bg-teal-100", text: "text-teal-600", border: "border-teal-200" },
  amber: { bg: "bg-amber-100", text: "text-amber-600", border: "border-amber-200" },
  emerald: { bg: "bg-emerald-100", text: "text-emerald-600", border: "border-emerald-200" },
  orange: { bg: "bg-orange-100", text: "text-orange-600", border: "border-orange-200" },
  blue: { bg: "bg-blue-100", text: "text-blue-600", border: "border-blue-200" },
};

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 lg:py-32 relative overflow-hidden">
      {/* Creative layered background */}
      <div className="absolute inset-0">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-indigo-50/20 to-purple-50/30" />
        
        {/* Floating shapes */}
        <div className="absolute top-40 -right-20 w-[400px] h-[400px] bg-gradient-to-br from-indigo-200/30 to-purple-200/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-[350px] h-[350px] bg-gradient-to-br from-rose-200/25 to-pink-200/15 rounded-full blur-3xl" />
        <div className="absolute bottom-40 right-1/3 w-[300px] h-[300px] bg-gradient-to-br from-amber-200/30 to-orange-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-1/4 w-[250px] h-[250px] bg-gradient-to-br from-teal-200/25 to-cyan-200/15 rounded-full blur-3xl" />
        
        {/* Dot pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(99,102,241,0.05)_1px,transparent_1px)] bg-[size:30px_30px]" />
        
        {/* Decorative curved line */}
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-10" preserveAspectRatio="none">
          <path d="M0,100 Q400,50 800,150 T1600,100" fill="none" stroke="url(#gradient)" strokeWidth="2" />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      
      <div className="container relative z-10">
        {/* Pain Points Section */}
        <div className="mb-24">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-rose-100 text-rose-700 text-sm font-medium mb-4">
              The Challenge
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
              When people drift, you should know—
              <span className="bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">early.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { text: "People drift quietly—leaders notice too late." },
              { text: "Visitors slip through without clear follow-up." },
              { text: "Birthdays and milestones get missed across branches." },
              { text: "Messages feel generic—care should be personal." },
            ].map((pain, index) => (
              <div
                key={index}
                className="group relative bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md hover:border-rose-200 transition-all"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-100/50 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center mb-4">
                    <span className="text-rose-600 font-bold">{index + 1}</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{pain.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* For Churches */}
        <div className="mb-24">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium mb-4">
              For Churches
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
              Tools for{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Intentional Care
              </span>
            </h2>
            <p className="text-lg text-slate-600">
              Everything you need to know your members, follow up with care, 
              and serve more personally across every branch.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {churchFeatures.map((feature, index) => {
              const colors = colorClasses[feature.color];
              return (
                <div
                  key={index}
                  className="group relative bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="relative">
                    <div className={`w-14 h-14 rounded-xl ${colors.bg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                      <feature.icon className={`w-7 h-7 ${colors.text}`} />
                    </div>
                    
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* For Members */}
        <div className="mb-24">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm font-medium mb-4">
              For Members
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
              A Welcome,{" "}
              <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                Not a Tally
              </span>
            </h2>
            <p className="text-lg text-slate-600">
              Join your church, get your personal Member Pass, and stay connected 
              with your community. It just works.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {memberFeatures.map((feature, index) => {
              const colors = colorClasses[feature.color];
              return (
                <div
                  key={index}
                  className="group relative bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="relative">
                    <div className={`w-14 h-14 rounded-xl ${colors.bg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                      <feature.icon className={`w-7 h-7 ${colors.text}`} />
                    </div>
                    
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Member Hub */}
        <div>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-purple-100 text-purple-700 text-sm font-medium mb-4">
              Member Hub
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
              A Home for{" "}
              <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                Your Members
              </span>
            </h2>
            <p className="text-lg text-slate-600">
              Members feel like part of something—not just names on a list.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {memberHubFeatures.map((feature, index) => (
              <div
                key={index}
                className="group relative bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="w-6 h-6 text-purple-600" />
                  </div>
                  
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
