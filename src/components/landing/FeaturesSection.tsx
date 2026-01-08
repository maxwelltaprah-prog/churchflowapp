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
  },
  {
    icon: BarChart3,
    title: "Engagement Insights",
    description: "See who's connected, who's drifting, and when to follow up—all in real time.",
  },
  {
    icon: MessageSquare,
    title: "Care Messages",
    description: "Send personalized messages that feel human—birthdays, follow-ups, encouragements.",
  },
  {
    icon: Shield,
    title: "Serve as a Team",
    description: "Granular roles for church admins, branch managers, and ushers to care together.",
  },
];

const memberFeatures = [
  {
    icon: Smartphone,
    title: "Personal Member Pass",
    description: "Your unique QR code—Scan to Connect at any service, any branch.",
  },
  {
    icon: Users,
    title: "Simple Registration",
    description: "Join via branch link or with help from church staff. No app download needed.",
  },
  {
    icon: Zap,
    title: "Fast Check-in, Care Signal",
    description: "6-second connection that becomes a care signal for your church leaders.",
  },
  {
    icon: Globe,
    title: "One Member, Every Location",
    description: "Visiting another branch? Connect seamlessly with your same member pass.",
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

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 lg:py-32 bg-secondary/50">
      <div className="container">
        {/* Pain Points Section */}
        <div className="mb-24">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-destructive/10 text-destructive text-sm font-medium mb-4">
              The Challenge
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              When people drift, you should know—<span className="text-gradient">early.</span>
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
                className="group relative bg-card rounded-2xl p-6 shadow-soft border border-border"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/5 rounded-full blur-2xl" />
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                    <span className="text-destructive font-bold">{index + 1}</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{pain.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* For Churches */}
        <div className="mb-24">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              For Churches
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Tools for <span className="text-gradient">Intentional Care</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to know your members, follow up with care, 
              and serve more personally across every branch.
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
        <div className="mb-24">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-accent/20 text-accent text-sm font-medium mb-4">
              For Members
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              A Welcome, <span className="text-gradient-accent">Not a Tally</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Join your church, get your personal Member Pass, and stay connected 
              with your community. It just works.
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

        {/* Member Hub */}
        <div>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              Member Hub
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              A Home for <span className="text-gradient">Your Members</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Members feel like part of something—not just names on a list.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {memberHubFeatures.map((feature, index) => (
              <div
                key={index}
                className="group relative bg-card rounded-2xl p-6 shadow-soft border border-border hover:shadow-card transition-all duration-300 hover:-translate-y-1"
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
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
