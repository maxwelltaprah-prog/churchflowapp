import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles } from "lucide-react";
import { useTodayContent } from "@/hooks/useEngagementData";

interface PersonalizedFeedCardProps {
  memberId: string;
  memberName: string;
}

interface FeedItem {
  id: string;
  type: "welcome";
  icon: typeof Sparkles;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
}

export function PersonalizedFeedCard({
  memberId,
  memberName,
}: PersonalizedFeedCardProps) {
  const { data: todayContent, isLoading } = useTodayContent(memberId);

  const feedItems = useMemo(() => {
    const items: FeedItem[] = [];
    const firstName = memberName.split(" ")[0];

    // Default welcome message
    items.push({
      id: "default-welcome",
      type: "welcome",
      icon: Sparkles,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      title: `Welcome, ${firstName}! ✨`,
      description: "Check back for personalized updates and encouragement.",
    });

    return items;
  }, [memberName]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {feedItems.map((item) => (
        <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${item.iconBg} shrink-0`}>
                <item.icon className={`w-5 h-5 ${item.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {item.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
