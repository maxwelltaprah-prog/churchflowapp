import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <Construction className="w-10 h-10 text-primary" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
      <p className="text-muted-foreground max-w-md">{description}</p>
    </div>
  );
}

export function ServicesPage() {
  return (
    <PlaceholderPage 
      title="Services" 
      description="Create and manage church services. Track attendance for each service across all branches."
    />
  );
}

export function AnalyticsPage() {
  return (
    <PlaceholderPage 
      title="Analytics" 
      description="View detailed analytics and reports on attendance trends, member growth, and branch performance."
    />
  );
}

export function BroadcastsPage() {
  return (
    <PlaceholderPage 
      title="Broadcasts" 
      description="Send messages and announcements to specific branches, groups, or your entire congregation."
    />
  );
}
