import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { StreakDashboard } from "./StreakDashboard";
import { RecentServicesStreak } from "./RecentServicesStreak";

interface AttendanceStats {
  totalAttendance: number;
  currentStreak: number;
  longestStreak: number;
  thisMonthCount: number;
  lastAttendance: string | null;
}

interface ChurchService {
  id: string;
  name: string;
  service_date: string;
  branches: { name: string } | null;
}

interface MemberStreakSectionProps {
  stats: AttendanceStats | null;
  attendanceHistory: any[];
  churchServices: ChurchService[];
  memberName: string;
  churchName?: string;
  onBack: () => void;
}

export function MemberStreakSection({ 
  stats, 
  attendanceHistory, 
  churchServices,
  memberName,
  churchName,
  onBack 
}: MemberStreakSectionProps) {
  const attendedServiceIds = new Set(
    attendanceHistory.map(a => (a as any).service_id).filter(Boolean)
  );
  const attendanceDates = attendanceHistory
    .map(a => a.services?.service_date)
    .filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>

      <StreakDashboard 
        stats={stats} 
        attendanceDates={attendanceDates}
        services={churchServices}
        attendedServiceIds={attendedServiceIds}
        memberName={memberName}
        churchName={churchName}
      />

      <RecentServicesStreak
        services={churchServices}
        attendedServiceIds={attendedServiceIds}
        currentStreak={stats?.currentStreak || 0}
      />
    </div>
  );
}
