import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sun, BookOpen, Megaphone, Heart, Sparkles, Calendar, Share2, Bookmark } from "lucide-react";
import { useTodayContent, DailyContent, useContentInteraction, useMyContentInteractions } from "@/hooks/useEngagementData";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  const { data: myInteractions } = useMyContentInteractions(memberId, content?.id);
  const { mutate: trackInteraction } = useContentInteraction();

  // Track view when content is displayed
  useEffect(() => {
    if (content && memberId) {
      trackInteraction({ 
        contentId: content.id, 
        memberId, 
        type: "view" 
      });
    }
  }, [content?.id, memberId]);

  if (isLoading) {
    return <Skeleton className="h-32 w-full rounded-xl" />;
  }

  if (!content) {
    return null;
  }

  const config = contentTypeConfig[content.content_type];
  const Icon = config.icon;

  const hasLiked = myInteractions?.includes("like");
  const hasBookmarked = myInteractions?.includes("bookmark");

  const handleLike = () => {
    trackInteraction({ 
      contentId: content.id, 
      memberId, 
      type: "like",
      toggle: true
    });
  };

  const handleBookmark = () => {
    trackInteraction({ 
      contentId: content.id, 
      memberId, 
      type: "bookmark",
      toggle: true
    });
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: content.title,
          text: content.content.substring(0, 200) + "...",
        });
        trackInteraction({ 
          contentId: content.id, 
          memberId, 
          type: "share" 
        });
      } else {
        await navigator.clipboard.writeText(content.content);
        toast.success("Content copied to clipboard");
        trackInteraction({ 
          contentId: content.id, 
          memberId, 
          type: "share" 
        });
      }
    } catch (error) {
      // User cancelled share
    }
  };

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
            
            {/* Interaction buttons */}
            <div className="flex items-center gap-1 mt-3 pt-3 border-t">
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "gap-1.5 h-8",
                  hasLiked && "text-rose-500 hover:text-rose-600"
                )}
                onClick={handleLike}
              >
                <Heart className={cn("w-4 h-4", hasLiked && "fill-current")} />
                <span className="text-xs">Like</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1.5 h-8"
                onClick={handleShare}
              >
                <Share2 className="w-4 h-4" />
                <span className="text-xs">Share</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "gap-1.5 h-8",
                  hasBookmarked && "text-amber-500 hover:text-amber-600"
                )}
                onClick={handleBookmark}
              >
                <Bookmark className={cn("w-4 h-4", hasBookmarked && "fill-current")} />
                <span className="text-xs">Save</span>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
