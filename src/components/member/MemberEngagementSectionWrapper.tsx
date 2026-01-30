import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { MemberEngagementSection } from "@/components/engagement/MemberEngagementSection";

interface MemberEngagementSectionWrapperProps {
  memberId: string;
  churchId: string;
  branchId: string | null;
  memberName: string;
  currentStreak: number;
  lastAttendance: string | null;
  attendanceCount: number;
  onBack: () => void;
}

export function MemberEngagementSectionWrapper({ 
  memberId,
  churchId,
  branchId,
  memberName,
  currentStreak,
  lastAttendance,
  attendanceCount,
  onBack 
}: MemberEngagementSectionWrapperProps) {
  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>

      <MemberEngagementSection
        memberId={memberId}
        churchId={churchId}
        branchId={branchId}
        memberName={memberName}
        currentStreak={currentStreak}
        lastAttendance={lastAttendance}
        attendanceCount={attendanceCount}
      />
    </div>
  );
}
