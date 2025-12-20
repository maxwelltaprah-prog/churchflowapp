import { 
  Building2, 
  BarChart3, 
  Smartphone, 
  Shield, 
  Users, 
  Bell,
  Globe,
  Zap
} from "lucide-react";

const churchFeatures = [
  {
    icon: Building2,
    title: "Multi-Branch Management",
    description: "One dashboard for all your locations. Create, manage, and monitor branches effortlessly.",
  },
  {
    icon: BarChart3,
    title: "Real-time Analytics",
    description: "Track attendance trends, compare branches, and make data-driven decisions.",
  },
  {
    icon: Bell,
    title: "Broadcast Messaging",
    description: "Send announcements to specific branches, groups, or your entire congregation.",
  },
  {
    icon: Shield,
    title: "Role-Based Access",
    description: "Granular permissions for church admins, branch managers, and ushers.",
  },
];

const memberFeatures = [
  {
    icon: Smartphone,
    title: "Personal QR Code",
    description: "Your unique QR code for instant check-in at any service, any branch.",
  },
  {
    icon: Users,
    title: "Simple Registration",
    description: "Join via branch link or with help from church staff. No app download needed.",
  },
  {
    icon: Zap,
    title: "6-Second Check-in",
    description: "Show your QR, get scanned, you're done. The fastest church check-in experience.",
  },
  {
    icon: Globe,
    title: "Cross-Branch Access",
    description: "Visiting another location? Check in seamlessly with your same member code.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 lg:py-32 bg-secondary/50">
      <div className="container">
        {/* For Churches */}
        <div className="mb-24">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              For Churches
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Powerful Tools for <span className="text-gradient">Church Leaders</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to manage attendance across multiple locations, 
              with insights that help your church grow.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {churchFeatures.map((feature, index) => (
              <div
                key={index}
                className="group relative bg-card rounded-2xl p-6 shadow-soft border border-border hover:shadow-card transition-all duration-300 hover:-translate-y-1"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-accent opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-opacity" />
                
                <div className="relative">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-7 h-7 text-primary" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* For Members */}
        <div>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-accent/20 text-accent text-sm font-medium mb-4">
              For Members
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Seamless Experience for <span className="text-gradient-accent">Members</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Join your church, get your personal QR code, and check in faster than ever. 
              It just works.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {memberFeatures.map((feature, index) => (
              <div
                key={index}
                className="group relative bg-card rounded-2xl p-6 shadow-soft border border-border hover:shadow-card transition-all duration-300 hover:-translate-y-1"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-primary opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-opacity" />
                
                <div className="relative">
                  <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-5 group-hover:bg-accent/20 transition-colors">
                    <feature.icon className="w-7 h-7 text-accent" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
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
