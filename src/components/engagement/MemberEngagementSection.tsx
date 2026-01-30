import { TodayAtChurchCard } from "./TodayAtChurchCard";
import { PrayerWallCard } from "./PrayerWallCard";
import { SermonFollowupCard } from "./SermonFollowupCard";
import { PersonalizedFeedCard } from "./PersonalizedFeedCard";
import { useMemberEngagementSettings } from "@/hooks/useEngagementSettings";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Heart, BookOpen, MessageCircle } from "lucide-react";

interface MemberEngagementSectionProps {
  memberId: string;
  churchId: string;
  branchId: string | null;
  memberName: string;
}

export function MemberEngagementSection({
  memberId,
  churchId,
  branchId,
  memberName,
}: MemberEngagementSectionProps) {
  const { data: settings, isLoading } = useMemberEngagementSettings(memberId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-[200px]" />
        <Skeleton className="h-[200px]" />
      </div>
    );
  }

  // If no features are enabled, don't render the section
  const anyFeatureEnabled =
    settings?.enableTodayAtChurch ||
    settings?.enablePrayerWall ||
    settings?.enablePersonalizedFeed ||
    settings?.enableSermonFollowups;

  if (!anyFeatureEnabled) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="font-medium">No engagement features enabled</p>
        <p className="text-sm">Check back soon for updates from your church</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Updates Section - For You / Today at Church */}
      {(settings?.enablePersonalizedFeed || settings?.enableTodayAtChurch) && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-muted-foreground">Updates</h2>
          </div>
          
          <div className="space-y-4">
            {settings?.enablePersonalizedFeed && (
              <PersonalizedFeedCard
                memberId={memberId}
                memberName={memberName}
              />
            )}
            
            {settings?.enableTodayAtChurch && (
              <TodayAtChurchCard memberId={memberId} />
            )}
          </div>
        </section>
      )}

      {/* Prayer Section */}
      {settings?.enablePrayerWall && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Heart className="w-4 h-4 text-kpi-rose" />
            <h2 className="font-semibold text-muted-foreground">Prayer</h2>
          </div>
          
          <PrayerWallCard
            memberId={memberId}
            churchId={churchId}
            branchId={branchId}
          />
        </section>
      )}

      {/* Learning Section - Sermon Follow-ups */}
      {settings?.enableSermonFollowups && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <BookOpen className="w-4 h-4 text-kpi-blue" />
            <h2 className="font-semibold text-muted-foreground">Learning</h2>
          </div>
          
          <SermonFollowupCard memberId={memberId} />
        </section>
      )}
    </div>
  );
}
