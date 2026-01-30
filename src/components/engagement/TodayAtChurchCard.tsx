import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sun, BookOpen, Megaphone, Heart, Sparkles } from "lucide-react";
import { useTodayContent, DailyContent } from "@/hooks/useEngagementData";
import { format } from "date-fns";

interface TodayAtChurchCardProps {
  memberId: string;
}

const contentTypeConfig: Record<
  DailyContent["content_type"],
  { icon: typeof Sun; label: string; color: string }
> = {
  devotional: { icon: BookOpen, label: "Daily Devotional", color: "bg-kpi-purple/15 text-kpi-purple" },
  announcement: { icon: Megaphone, label: "Announcement", color: "bg-kpi-blue/15 text-kpi-blue" },
  encouragement: { icon: Heart, label: "Encouragement", color: "bg-kpi-rose/15 text-kpi-rose" },
  scripture: { icon: Sparkles, label: "Scripture of the Day", color: "bg-kpi-amber/15 text-kpi-amber" },
};

export function TodayAtChurchCard({ memberId }: TodayAtChurchCardProps) {
  const { data: content, isLoading } = useTodayContent(memberId);

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!content) {
    return null; // Don't render if no content available
  }

  const config = contentTypeConfig[content.content_type];
  const Icon = config.icon;

  return (
    <Card className="overflow-hidden border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sun className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Today at Church</CardTitle>
              <CardDescription>
                {format(new Date(content.publish_date), "EEEE, MMMM d")}
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className={config.color}>
            <Icon className="w-3 h-3 mr-1" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <h3 className="font-semibold text-lg">{content.title}</h3>
        <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {content.content}
        </p>
        {content.media_url && (
          <div className="mt-4">
            <img
              src={content.media_url}
              alt={content.title}
              className="w-full h-48 object-cover rounded-lg"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
