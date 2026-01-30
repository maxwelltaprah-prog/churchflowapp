import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sun, BookOpen, Megaphone, Heart, Sparkles, Calendar } from "lucide-react";
import { useTodayContent, DailyContent } from "@/hooks/useEngagementData";
import { format } from "date-fns";

interface TodayAtChurchCardProps {
  memberId: string;
}

const contentTypeConfig: Record<
  DailyContent["content_type"],
  { icon: typeof Sun; label: string; bgColor: string; iconColor: string }
> = {
  devotional: { 
    icon: BookOpen, 
    label: "Daily Devotional", 
    bgColor: "bg-violet-500/10",
    iconColor: "text-violet-500"
  },
  announcement: { 
    icon: Megaphone, 
    label: "Announcement", 
    bgColor: "bg-blue-500/10",
    iconColor: "text-blue-500"
  },
  encouragement: { 
    icon: Heart, 
    label: "Encouragement", 
    bgColor: "bg-rose-500/10",
    iconColor: "text-rose-500"
  },
  scripture: { 
    icon: Sparkles, 
    label: "Scripture of the Day", 
    bgColor: "bg-amber-500/10",
    iconColor: "text-amber-500"
  },
};

export function TodayAtChurchCard({ memberId }: TodayAtChurchCardProps) {
  const { data: content, isLoading } = useTodayContent(memberId);

  if (isLoading) {
    return <Skeleton className="h-32 w-full rounded-xl" />;
  }

  if (!content) {
    return null;
  }

  const config = contentTypeConfig[content.content_type];
  const Icon = config.icon;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${config.bgColor} shrink-0`}>
            <Icon className={`w-5 h-5 ${config.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge variant="secondary" className="text-xs">
                {config.label}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(content.publish_date), "MMM d")}
              </span>
            </div>
            <h3 className="font-semibold">{content.title}</h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
              {content.content}
            </p>
            {content.media_url && (
              <img
                src={content.media_url}
                alt={content.title}
                className="w-full h-32 object-cover rounded-lg mt-3"
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
