import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Sparkles, 
  Trophy, 
  Heart, 
  PartyPopper,
  TrendingUp,
  CheckCircle
} from "lucide-react";
import { useTodayContent } from "@/hooks/useEngagementData";
import { isToday, differenceInDays } from "date-fns";

interface PersonalizedFeedCardProps {
  memberId: string;
  memberName: string;
  currentStreak: number;
  lastAttendance: string | null;
  attendanceCount: number;
}

interface FeedItem {
  id: string;
  type: "streak" | "milestone" | "encouragement" | "welcome";
  icon: typeof Sparkles;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
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

    // Check if attended today
    const attendedToday = lastAttendance && isToday(new Date(lastAttendance));
    
    // Today's attendance celebration
    if (attendedToday) {
      items.push({
        id: "today-attendance",
        type: "welcome",
        icon: CheckCircle,
        iconBg: "bg-emerald-500/10",
        iconColor: "text-emerald-500",
        title: "Thanks for joining us today! 🙏",
        description: "We're blessed to have you worship with us.",
      });
    }

    // Streak celebration
    if (currentStreak >= 2) {
      items.push({
        id: "streak",
        type: "streak",
        icon: Trophy,
        iconBg: "bg-amber-500/10",
        iconColor: "text-amber-500",
        title: `🔥 ${currentStreak}-Service Streak!`,
        description: `Amazing consistency, ${firstName}! Keep attending to grow your streak.`,
      });
    }

    // Milestone celebrations
    const milestones = [
      { count: 10, emoji: "🎉", title: "10 Services Milestone!", desc: "Your dedication is inspiring!" },
      { count: 25, emoji: "🏆", title: "25 Services Milestone!", desc: "You're a pillar of our community." },
      { count: 50, emoji: "👑", title: "50 Services Milestone!", desc: "Incredible dedication!" },
      { count: 100, emoji: "🌟", title: "100 Services Milestone!", desc: "What an incredible journey!" },
    ];
    
    const milestone = milestones.find(m => attendanceCount >= m.count && attendanceCount < m.count + 5);
    if (milestone) {
      items.push({
        id: `milestone-${milestone.count}`,
        type: "milestone",
        icon: PartyPopper,
        iconBg: "bg-violet-500/10",
        iconColor: "text-violet-500",
        title: `${milestone.emoji} ${milestone.title}`,
        description: milestone.desc,
      });
    }

    // We miss you - only when no streak and haven't attended recently
    if (lastAttendance && currentStreak === 0) {
      const daysSince = differenceInDays(new Date(), new Date(lastAttendance));
      if (daysSince > 14) {
        items.push({
          id: "miss-you",
          type: "encouragement",
          icon: Heart,
          iconBg: "bg-rose-500/10",
          iconColor: "text-rose-500",
          title: `We miss you, ${firstName}! 💙`,
          description: "It's been a while. We'd love to see you at our next service.",
        });
      }
    }

    // Growth encouragement for newer members
    if (attendanceCount > 0 && attendanceCount < 5 && currentStreak > 0) {
      items.push({
        id: "growth",
        type: "encouragement",
        icon: TrendingUp,
        iconBg: "bg-blue-500/10",
        iconColor: "text-blue-500",
        title: "You're on a great path! 📈",
        description: `${5 - attendanceCount} more services to reach your first milestone.`,
      });
    }

    // Default welcome if nothing else
    if (items.length === 0) {
      items.push({
        id: "default-welcome",
        type: "welcome",
        icon: Sparkles,
        iconBg: "bg-primary/10",
        iconColor: "text-primary",
        title: `Welcome, ${firstName}! ✨`,
        description: "Check back for personalized updates and encouragement.",
      });
    }

    return items;
  }, [memberId, memberName, currentStreak, lastAttendance, attendanceCount]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
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
