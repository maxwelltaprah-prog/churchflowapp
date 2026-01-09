import { Church, GitBranch, UserPlus, QrCode, Heart } from "lucide-react";

const steps = [
  {
    icon: Church,
    title: "Create Church Account",
    description: "Register your church in minutes. Your main branch is created automatically.",
    number: "01",
    color: "indigo",
  },
  {
    icon: GitBranch,
    title: "Add Your Locations",
    description: "Set up additional branches with unique join codes and links for each location.",
    number: "02",
    color: "purple",
  },
  {
    icon: UserPlus,
    title: "Members Join & Get Their Pass",
    description: "Members register via branch link or staff adds them. Instant Member Pass generated.",
    number: "03",
    color: "teal",
  },
  {
    icon: QrCode,
    title: "Scan to Connect",
    description: "Members connect at services with a quick scan. Programs and resources shared instantly.",
    number: "04",
    color: "amber",
  },
  {
    icon: Heart,
    title: "Care with Intention",
    description: "Engagement insights across all branches. Know who needs follow-up and celebrate milestones.",
    number: "05",
    color: "rose",
  },
];

const colorClasses = {
  indigo: {
    bg: "bg-indigo-100",
    text: "text-indigo-600",
    gradient: "from-indigo-500 to-indigo-600",
    line: "text-indigo-500",
    glow: "bg-indigo-500",
  },
  purple: {
    bg: "bg-purple-100",
    text: "text-purple-600",
    gradient: "from-purple-500 to-purple-600",
    line: "text-purple-500",
    glow: "bg-purple-500",
  },
  teal: {
    bg: "bg-teal-100",
    text: "text-teal-600",
    gradient: "from-teal-500 to-teal-600",
    line: "text-teal-500",
    glow: "bg-teal-500",
  },
  amber: {
    bg: "bg-amber-100",
    text: "text-amber-600",
    gradient: "from-amber-500 to-amber-600",
    line: "text-amber-500",
    glow: "bg-amber-500",
  },
  rose: {
    bg: "bg-rose-100",
    text: "text-rose-600",
    gradient: "from-rose-500 to-rose-600",
    line: "text-rose-500",
    glow: "bg-rose-500",
  },
};

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 lg:py-32 relative overflow-hidden">
      {/* Creative background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-indigo-50/30 to-white" />
        
        {/* Decorative shapes */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-gradient-to-br from-purple-200/40 to-pink-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-64 h-64 bg-gradient-to-br from-teal-200/30 to-cyan-200/20 rounded-full blur-3xl" />
        
        {/* Subtle diagonal lines */}
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_49.5%,rgba(99,102,241,0.03)_49.5%,rgba(99,102,241,0.03)_50.5%,transparent_50.5%)] bg-[size:40px_40px]" />
      </div>
      
      <div className="container relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium mb-4">
            Simple Process
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
            How It{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Works
            </span>
          </h2>
          <p className="text-lg text-slate-600">
            Get started in minutes. No complicated setup, no special hardware needed.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-200 via-purple-200 to-rose-200 hidden lg:block" />

          <div className="space-y-12 lg:space-y-0">
            {steps.map((step, index) => {
              const colors = colorClasses[step.color as keyof typeof colorClasses];
              return (
                <div
                  key={index}
                  className={`relative lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center ${
                    index % 2 === 0 ? "" : "lg:direction-rtl"
                  }`}
                >
                  {/* Content */}
                  <div
                    className={`lg:py-12 ${
                      index % 2 === 0 ? "lg:text-right lg:pr-16" : "lg:text-left lg:pl-16 lg:order-2"
                    }`}
                  >
                    <div
                      className={`inline-flex items-center gap-3 mb-4 ${
                        index % 2 === 0 ? "lg:flex-row-reverse" : ""
                      }`}
                    >
                      <span className={`text-sm font-bold ${colors.text}`}>{step.number}</span>
                      <div className={`h-px w-8 ${colors.bg}`} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">{step.title}</h3>
                    <p className="text-slate-600 leading-relaxed">{step.description}</p>
                  </div>

                  {/* Icon */}
                  <div
                    className={`mt-6 lg:mt-0 ${
                      index % 2 === 0 ? "lg:pl-16" : "lg:pr-16 lg:order-1"
                    }`}
                  >
                    <div className="relative">
                      {/* Center dot on line */}
                      <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full ${colors.glow} shadow-lg hidden lg:block`} />

                      <div
                        className={`flex ${
                          index % 2 === 0 ? "lg:justify-start" : "lg:justify-end"
                        }`}
                      >
                        <div className="relative group">
                          <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity`} />
                          <div className={`relative w-24 h-24 bg-white rounded-2xl shadow-lg border border-slate-200 flex items-center justify-center group-hover:scale-105 transition-transform`}>
                            <step.icon className={`w-10 h-10 ${colors.text}`} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
