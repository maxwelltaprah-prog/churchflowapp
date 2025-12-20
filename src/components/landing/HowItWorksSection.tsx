import { Church, GitBranch, UserPlus, QrCode, CheckCircle2 } from "lucide-react";

const steps = [
  {
    icon: Church,
    title: "Church Creates Account",
    description: "Register your church in minutes. Your main branch is created automatically.",
    number: "01",
  },
  {
    icon: GitBranch,
    title: "Add Sub-Branches",
    description: "Set up additional locations with unique join codes and links for each branch.",
    number: "02",
  },
  {
    icon: UserPlus,
    title: "Members Join",
    description: "Members register via branch link or staff adds them. Instant QR code generated.",
    number: "03",
  },
  {
    icon: QrCode,
    title: "Scan to Check-in",
    description: "Staff scans member QR codes at services. Fast, accurate, paperless attendance.",
    number: "04",
  },
  {
    icon: CheckCircle2,
    title: "Track & Engage",
    description: "Real-time analytics across all branches. Identify trends and engage members.",
    number: "05",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 lg:py-32 bg-background">
      <div className="container">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Simple Process
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            How It <span className="text-gradient">Works</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Get started in minutes. No complicated setup, no special hardware needed.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/20 via-primary/40 to-primary/20 hidden lg:block" />

          <div className="space-y-12 lg:space-y-0">
            {steps.map((step, index) => (
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
                    <span className="text-sm font-bold text-accent">{step.number}</span>
                    <div className="h-px w-8 bg-accent" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                </div>

                {/* Icon */}
                <div
                  className={`mt-6 lg:mt-0 ${
                    index % 2 === 0 ? "lg:pl-16" : "lg:pr-16 lg:order-1"
                  }`}
                >
                  <div className="relative">
                    {/* Center dot on line */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary shadow-glow hidden lg:block" />

                    <div
                      className={`flex ${
                        index % 2 === 0 ? "lg:justify-start" : "lg:justify-end"
                      }`}
                    >
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-accent rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                        <div className="relative w-24 h-24 bg-card rounded-2xl shadow-card border border-border flex items-center justify-center group-hover:scale-105 transition-transform">
                          <step.icon className="w-10 h-10 text-primary" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
