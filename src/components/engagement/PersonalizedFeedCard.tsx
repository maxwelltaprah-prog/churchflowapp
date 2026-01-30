import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Sparkles, 
  Calendar, 
  Trophy, 
  Heart, 
  BookOpen,
  Bell,
  ChevronRight
} from "lucide-react";
import { useTodayContent } from "@/hooks/useEngagementData";
import { format, isToday, isTomorrow, differenceInDays } from "date-fns";

interface PersonalizedFeedCardProps {
  memberId: string;
  memberName: string;
  currentStreak: number;
  lastAttendance: string | null;
  attendanceCount: number;
}

interface FeedItem {
  id: string;
  type: "streak" | "milestone" | "encouragement" | "reminder" | "content";
  icon: typeof Sparkles;
  iconColor: string;
  title: string;
  description: string;
  timestamp?: Date;
}

export function PersonalizedFeedCard({
  memberId,
  memberName,
  currentStreak,
  lastAttendance,
  attendanceCount,
}: PersonalizedFeedCardProps) {
  const { data: todayContent, isLoading } = useTodayContent(memberId);

  const feedItems = useMemo(() => {
    const items: FeedItem[] = [];
    const firstName = memberName.split(" ")[0];

    // Add streak celebration if applicable
    if (currentStreak >= 2) {
      items.push({
        id: "streak",
        type: "streak",
        icon: Trophy,
        iconColor: "text-kpi-amber",
        title: `🔥 ${currentStreak}-Service Streak!`,
        description: `Amazing consistency, ${firstName}! Keep attending to grow your streak.`,
      });
    }

    // Add milestone celebrations
    if (attendanceCount === 10) {
      items.push({
        id: "milestone-10",
        type: "milestone",
        icon: Trophy,
        iconColor: "text-kpi-purple",
        title: "🎉 10 Services Milestone!",
        description: "You've attended 10 services. Your dedication is inspiring!",
      });
    } else if (attendanceCount === 25) {
      items.push({
        id: "milestone-25",
        type: "milestone",
        icon: Trophy,
        iconColor: "text-kpi-purple",
        title: "🏆 25 Services Milestone!",
        description: "What a commitment! You're a pillar of our community.",
      });
    } else if (attendanceCount === 50) {
      items.push({
        id: "milestone-50",
        type: "milestone",
        icon: Trophy,
        iconColor: "text-kpi-purple",
        title: "👑 50 Services Milestone!",
        description: "Incredible dedication! Half a century of services!",
      });
    }

    // Add encouragement based on attendance patterns
    // Only show "we miss you" if NO active streak (streak = 0 means they've missed services)
    if (lastAttendance) {
      const lastDate = new Date(lastAttendance);
      const daysSince = differenceInDays(new Date(), lastDate);
      
      if (daysSince > 14 && currentStreak === 0) {
        items.push({
          id: "return-welcome",
          type: "encouragement",
          icon: Heart,
          iconColor: "text-kpi-rose",
          title: `We miss you, ${firstName}!`,
          description: "It's been a while. We'd love to see you at our next service.",
        });
      } else if (isToday(lastDate)) {
        items.push({
          id: "today-attendance",
          type: "encouragement",
          icon: Sparkles,
          iconColor: "text-kpi-green",
          title: "Thanks for joining us today!",
          description: "We're blessed to have you worship with us.",
        });
      }
    } else if (currentStreak === 0) {
      // No last attendance and no streak - new or inactive member
      items.push({
        id: "welcome-new",
        type: "encouragement",
        icon: Heart,
        iconColor: "text-kpi-rose",
        title: `Welcome, ${firstName}!`,
        description: "We'd love to see you at our next service.",
      });
    }

    // Add today's content if available
    if (todayContent) {
      items.push({
        id: "daily-content",
        type: "content",
        icon: BookOpen,
        iconColor: "text-kpi-blue",
        title: todayContent.title,
        description: todayContent.content.substring(0, 100) + (todayContent.content.length > 100 ? "..." : ""),
        timestamp: new Date(todayContent.publish_date),
      });
    }

    // Add a default encouragement if feed is empty
    if (items.length === 0) {
      items.push({
        id: "default-welcome",
        type: "encouragement",
        icon: Sparkles,
        iconColor: "text-primary",
        title: `Welcome, ${firstName}!`,
        description: "Check back for personalized updates and encouragement.",
      });
    }

    return items;
  }, [memberId, memberName, currentStreak, lastAttendance, attendanceCount, todayContent]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-52 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-kpi-purple/20 to-kpi-blue/20">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">For You</CardTitle>
            <CardDescription>
              Personalized updates and encouragement
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[280px] pr-4">
          <div className="space-y-3">
            {feedItems.map((item) => (
              <FeedItemCard key={item.id} item={item} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

interface FeedItemCardProps {
  item: FeedItem;
}

function FeedItemCard({ item }: FeedItemCardProps) {
  const Icon = item.icon;

  return (
    <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 hover:bg-secondary/50 transition-colors">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg bg-background ${item.iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">{item.title}</h4>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {item.description}
          </p>
          {item.timestamp && (
            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(item.timestamp, "MMM d")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
