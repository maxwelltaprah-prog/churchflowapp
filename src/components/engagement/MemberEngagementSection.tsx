import { TodayAtChurchCard } from "./TodayAtChurchCard";
import { PrayerWallCard } from "./PrayerWallCard";
import { SermonFollowupCard } from "./SermonFollowupCard";
import { PersonalizedFeedCard } from "./PersonalizedFeedCard";
import { useMemberEngagementSettings } from "@/hooks/useEngagementSettings";
import { Skeleton } from "@/components/ui/skeleton";

interface MemberEngagementSectionProps {
  memberId: string;
  churchId: string;
  branchId: string | null;
  memberName: string;
  currentStreak: number;
  lastAttendance: string | null;
  attendanceCount: number;
}

export function MemberEngagementSection({
  memberId,
  churchId,
  branchId,
  memberName,
  currentStreak,
  lastAttendance,
  attendanceCount,
}: MemberEngagementSectionProps) {
  const { data: settings, isLoading } = useMemberEngagementSettings(memberId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
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
    return null;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        ✨ Your Engagement
      </h2>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {settings?.enableTodayAtChurch && (
            <TodayAtChurchCard memberId={memberId} />
          )}
          
          {settings?.enablePrayerWall && (
            <PrayerWallCard
              memberId={memberId}
              churchId={churchId}
              branchId={branchId}
            />
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {settings?.enablePersonalizedFeed && (
            <PersonalizedFeedCard
              memberId={memberId}
              memberName={memberName}
              currentStreak={currentStreak}
              lastAttendance={lastAttendance}
              attendanceCount={attendanceCount}
            />
          )}
          
          {settings?.enableSermonFollowups && (
            <SermonFollowupCard memberId={memberId} />
          )}
        </div>
      </div>
    </div>
  );
}
