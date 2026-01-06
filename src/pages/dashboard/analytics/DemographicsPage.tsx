import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronRight,
  Users,
  UserCircle,
  Calendar,
  MapPin,
  Briefcase,
  Heart,
  TrendingUp,
  X,
  Award,
} from "lucide-react";
import { AnalyticsFilterBar } from "@/components/analytics/AnalyticsFilterBar";
import { useAnalyticsFilters, formatDateRangeLabel } from "@/hooks/useAnalyticsFilters";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useBranchAccess, applyBranchFilter } from "@/hooks/useBranchAccess";
import { useBranches } from "@/hooks/useChurchData";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, differenceInYears, parseISO } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

// Color palette for charts
const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(142 76% 36%)",
  "hsl(38 92% 50%)",
  "hsl(280 65% 60%)",
  "hsl(200 80% 50%)",
  "hsl(340 75% 55%)",
  "hsl(170 70% 40%)",
];

// Age bucket configuration
const AGE_BUCKETS = [
  { label: "0-12", min: 0, max: 12 },
  { label: "13-19", min: 13, max: 19 },
  { label: "20-29", min: 20, max: 29 },
  { label: "30-39", min: 30, max: 39 },
  { label: "40-49", min: 40, max: 49 },
  { label: "50-59", min: 50, max: 59 },
  { label: "60+", min: 60, max: 150 },
];

// Label formatters
const genderLabels: Record<string, string> = {
  male: "Male",
  female: "Female",
  prefer_not_to_say: "Prefer not to say",
  unknown: "Not specified",
};

const membershipLabels: Record<string, string> = {
  member: "Member",
  visitor: "Visitor",
  first_timer: "First Timer",
};

const maritalLabels: Record<string, string> = {
  single: "Single",
  married: "Married",
  divorced: "Divorced",
  widowed: "Widowed",
  unknown: "Not specified",
};

const occupationLabels: Record<string, string> = {
  student: "Student",
  public_sector: "Public Sector",
  private_sector: "Private Sector",
  self_employed: "Self Employed",
  unemployed: "Unemployed",
  other: "Other",
  unknown: "Not specified",
};

// =================== Demographics Data Hook ===================
interface MemberDemographic {
  id: string;
  full_name: string;
  phone: string | null;
  gender: string | null;
  date_of_birth: string | null;
  membership_status: string | null;
  marital_status: string | null;
  occupation: string | null;
  residential_area: string | null;
  area_zone: string | null;
  branch_id: string;
}

function useDemographicsData() {
  const { profile } = useAuth();
  const { filters } = useAnalyticsFilters();
  const { accessibleBranchIds } = useBranchAccess();

  // Determine if user has applied a filter (service selected or non-default date range)
  const isFiltered = filters.serviceIds.length > 0 || filters.serviceId !== null;

  return useQuery({
    queryKey: ["demographics-data", profile?.church_id, filters.branchId, filters.startDate.toISOString(), filters.endDate.toISOString(), filters.serviceIds, filters.serviceId, accessibleBranchIds, isFiltered],
    queryFn: async () => {
      if (!profile?.church_id) return null;

      let uniqueMemberIds: string[] = [];

      if (isFiltered) {
        // Filter by attendance when a specific service/date is selected
        let attendanceQuery = supabase
          .from("attendance")
          .select("member_id")
          .eq("church_id", profile.church_id)
          .gte("checked_in_at", filters.startDate.toISOString())
          .lte("checked_in_at", filters.endDate.toISOString());

        attendanceQuery = applyBranchFilter(attendanceQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);

        const { data: attendanceData } = await attendanceQuery;
        uniqueMemberIds = [...new Set((attendanceData || []).map(a => a.member_id))];

        if (uniqueMemberIds.length === 0) {
          return {
            members: [],
            totalAttendees: 0,
            genderDistribution: [],
            ageDistribution: [],
            membershipDistribution: [],
            maritalDistribution: [],
            areaDistribution: [],
            occupationDistribution: [],
            spiritualJourneyDistribution: [],
          };
        }
      }

      // Fetch member demographics - all members if unfiltered, or only attendees if filtered
      let membersQuery = supabase
        .from("members")
        .select("id, full_name, phone, gender, date_of_birth, membership_status, marital_status, occupation, residential_area, area_zone, branch_id")
        .eq("church_id", profile.church_id)
        .eq("is_active", true);

      if (isFiltered) {
        membersQuery = membersQuery.in("id", uniqueMemberIds);
      } else {
        // Default: all members, apply branch filter
        membersQuery = applyBranchFilter(membersQuery, "branch_id", filters.branchId || undefined, accessibleBranchIds);
      }

      const { data: members } = await membersQuery;
      uniqueMemberIds = (members || []).map(m => m.id);
      const memberData = (members || []) as MemberDemographic[];

      // Calculate age from DOB
      const today = new Date();
      const membersWithAge = memberData.map(m => ({
        ...m,
        age: m.date_of_birth ? differenceInYears(today, parseISO(m.date_of_birth)) : null,
      }));

      // Gender distribution
      const genderCounts: Record<string, number> = {};
      membersWithAge.forEach(m => {
        const gender = m.gender || "unknown";
        genderCounts[gender] = (genderCounts[gender] || 0) + 1;
      });
      const genderDistribution = Object.entries(genderCounts).map(([key, count]) => ({
        name: genderLabels[key] || key,
        value: count,
        key,
      }));

      // Age distribution (bucketed)
      const ageCounts: Record<string, number> = {};
      AGE_BUCKETS.forEach(b => { ageCounts[b.label] = 0; });
      ageCounts["Unknown"] = 0;
      
      membersWithAge.forEach(m => {
        if (m.age === null) {
          ageCounts["Unknown"]++;
        } else {
          const bucket = AGE_BUCKETS.find(b => m.age! >= b.min && m.age! <= b.max);
          if (bucket) {
            ageCounts[bucket.label]++;
          }
        }
      });
      const ageDistribution = Object.entries(ageCounts)
        .filter(([_, count]) => count > 0)
        .map(([label, count]) => ({
          name: label,
          value: count,
          key: label,
        }));

      // Membership status distribution
      const membershipCounts: Record<string, number> = {};
      membersWithAge.forEach(m => {
        const status = m.membership_status || "unknown";
        membershipCounts[status] = (membershipCounts[status] || 0) + 1;
      });
      const membershipDistribution = Object.entries(membershipCounts).map(([key, count]) => ({
        name: membershipLabels[key] || key,
        value: count,
        key,
      }));

      // Marital status distribution (optional)
      const maritalCounts: Record<string, number> = {};
      membersWithAge.forEach(m => {
        if (m.marital_status) {
          maritalCounts[m.marital_status] = (maritalCounts[m.marital_status] || 0) + 1;
        }
      });
      const maritalDistribution = Object.entries(maritalCounts).map(([key, count]) => ({
        name: maritalLabels[key] || key,
        value: count,
        key,
      }));

      // Area/community distribution (optional)
      const areaCounts: Record<string, number> = {};
      membersWithAge.forEach(m => {
        const area = m.residential_area || m.area_zone;
        if (area) {
          areaCounts[area] = (areaCounts[area] || 0) + 1;
        }
      });
      const areaDistribution = Object.entries(areaCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({
          name,
          value: count,
          key: name,
        }));

      // Occupation distribution (optional)
      const occupationCounts: Record<string, number> = {};
      membersWithAge.forEach(m => {
        if (m.occupation) {
          occupationCounts[m.occupation] = (occupationCounts[m.occupation] || 0) + 1;
        }
      });
      const occupationDistribution = Object.entries(occupationCounts).map(([key, count]) => ({
        name: occupationLabels[key] || key,
        value: count,
        key,
      }));

      // Spiritual Journey distribution
      const { data: spiritualJourneys } = await supabase
        .from("spiritual_journeys")
        .select("id, name")
        .eq("church_id", profile.church_id)
        .eq("is_active", true);

      const { data: memberJourneys } = await supabase
        .from("member_spiritual_journeys")
        .select("member_id, spiritual_journey_id")
        .in("member_id", uniqueMemberIds);

      const journeyCounts: Record<string, number> = {};
      const journeyIdToName: Record<string, string> = {};
      (spiritualJourneys || []).forEach(sj => {
        journeyIdToName[sj.id] = sj.name;
      });

      (memberJourneys || []).forEach(mj => {
        const journeyId = mj.spiritual_journey_id;
        if (journeyIdToName[journeyId]) {
          journeyCounts[journeyId] = (journeyCounts[journeyId] || 0) + 1;
        }
      });

      const spiritualJourneyDistribution = Object.entries(journeyCounts).map(([key, count]) => ({
        name: journeyIdToName[key] || key,
        value: count,
        key,
      }));

      return {
        members: membersWithAge,
        totalAttendees: uniqueMemberIds.length,
        genderDistribution,
        ageDistribution,
        membershipDistribution,
        maritalDistribution,
        areaDistribution,
        occupationDistribution,
        spiritualJourneyDistribution,
      };
    },
    enabled: !!profile?.church_id,
  });
}

// =================== Distribution Chart Component ===================
interface DistributionChartProps {
  title: string;
  description: string;
  icon: React.ElementType;
  data: Array<{ name: string; value: number; key: string }>;
  type: "pie" | "bar";
  isLoading: boolean;
  onSegmentClick?: (key: string, label: string) => void;
  emptyMessage?: string;
}

function DistributionChart({ 
  title, 
  description, 
  icon: Icon, 
  data, 
  type, 
  isLoading, 
  onSegmentClick,
  emptyMessage = "No data available"
}: DistributionChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Icon className="w-5 h-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : data.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            {emptyMessage}
          </div>
        ) : type === "pie" ? (
          <div className="flex flex-col lg:flex-row items-center gap-4">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  onClick={(entry) => onSegmentClick?.(entry.key, entry.name)}
                  className="cursor-pointer"
                >
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${value} (${Math.round((value / total) * 100)}%)`, "Count"]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 justify-center lg:flex-col lg:gap-1">
              {data.map((item, index) => (
                <button
                  key={item.key}
                  onClick={() => onSegmentClick?.(item.key, item.name)}
                  className="flex items-center gap-2 text-sm hover:bg-muted/50 px-2 py-1 rounded transition-colors"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span>{item.name}</span>
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {item.value}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={80} 
                tick={{ fontSize: 12 }} 
              />
              <Tooltip
                formatter={(value: number) => [`${value} (${Math.round((value / total) * 100)}%)`, "Count"]}
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar
                dataKey="value"
                fill="hsl(var(--primary))"
                radius={[0, 4, 4, 0]}
                onClick={(entry) => onSegmentClick?.(entry.key, entry.name)}
                className="cursor-pointer"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// =================== Member List Modal ===================
interface MemberListModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  members: Array<{
    id: string;
    full_name: string;
    phone: string | null;
    gender: string | null;
    age: number | null;
    membership_status: string | null;
  }>;
  filterContext: string;
}

function MemberListModal({ open, onClose, title, members, filterContext }: MemberListModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {members.length} attendee{members.length !== 1 ? "s" : ""} • {filterContext}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.full_name}</TableCell>
                  <TableCell>{member.phone || "—"}</TableCell>
                  <TableCell>
                    {member.gender ? genderLabels[member.gender] || member.gender : "—"}
                  </TableCell>
                  <TableCell>{member.age !== null ? member.age : "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {member.membership_status ? membershipLabels[member.membership_status] || member.membership_status : "—"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No members found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// =================== Main Component ===================
export default function DemographicsPage() {
  const { filters } = useAnalyticsFilters();
  const { data: demographics, isLoading } = useDemographicsData();
  const periodLabel = formatDateRangeLabel(filters);

  // Modal state for drill-down
  const [modalState, setModalState] = useState<{
    open: boolean;
    title: string;
    filterType: string;
    filterValue: string;
  }>({
    open: false,
    title: "",
    filterType: "",
    filterValue: "",
  });

  // Get filtered members for the modal
  const filteredMembers = useMemo(() => {
    if (!demographics?.members || !modalState.open) return [];

    switch (modalState.filterType) {
      case "gender":
        return demographics.members.filter(m => (m.gender || "unknown") === modalState.filterValue);
      case "age":
        if (modalState.filterValue === "Unknown") {
          return demographics.members.filter(m => m.age === null);
        }
        const bucket = AGE_BUCKETS.find(b => b.label === modalState.filterValue);
        if (bucket) {
          return demographics.members.filter(m => m.age !== null && m.age >= bucket.min && m.age <= bucket.max);
        }
        return [];
      case "membership":
        return demographics.members.filter(m => (m.membership_status || "unknown") === modalState.filterValue);
      case "marital":
        return demographics.members.filter(m => m.marital_status === modalState.filterValue);
      case "area":
        return demographics.members.filter(m => m.residential_area === modalState.filterValue || m.area_zone === modalState.filterValue);
      case "occupation":
        return demographics.members.filter(m => m.occupation === modalState.filterValue);
      default:
        return [];
    }
  }, [demographics?.members, modalState]);

  const handleSegmentClick = (filterType: string, key: string, label: string) => {
    setModalState({
      open: true,
      title: label,
      filterType,
      filterValue: key,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/app/analytics" className="hover:text-foreground transition-colors">Analytics</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">Demographics</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Demographics</h1>
        <p className="text-muted-foreground">
          Member demographics based on attendance for {periodLabel.toLowerCase()}
        </p>
      </div>

      {/* Filter Bar */}
      <AnalyticsFilterBar showServiceFilter={false} />

      {/* Summary Card */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Attendees Analyzed</p>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <p className="text-3xl font-bold">{demographics?.totalAttendees?.toLocaleString() || 0}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Primary Charts Grid - 2 cards per row */}
      <div className="grid gap-6 md:grid-cols-2">
        <DistributionChart
          title="Gender Distribution"
          description="Attendees by gender"
          icon={UserCircle}
          data={demographics?.genderDistribution || []}
          type="pie"
          isLoading={isLoading}
          onSegmentClick={(key, label) => handleSegmentClick("gender", key, label)}
        />

        <DistributionChart
          title="Age Distribution"
          description="Attendees by age group"
          icon={Calendar}
          data={demographics?.ageDistribution || []}
          type="bar"
          isLoading={isLoading}
          onSegmentClick={(key, label) => handleSegmentClick("age", key, label)}
        />

        <DistributionChart
          title="Marital Status"
          description="Relationship status breakdown"
          icon={Heart}
          data={demographics?.maritalDistribution || []}
          type="pie"
          isLoading={isLoading}
          onSegmentClick={(key, label) => handleSegmentClick("marital", key, label)}
          emptyMessage="No marital status data"
        />

        <DistributionChart
          title="Occupation"
          description="Employment breakdown"
          icon={Briefcase}
          data={demographics?.occupationDistribution || []}
          type="pie"
          isLoading={isLoading}
          onSegmentClick={(key, label) => handleSegmentClick("occupation", key, label)}
          emptyMessage="No occupation data"
        />

        <DistributionChart
          title="Membership Status"
          description="Members vs Visitors"
          icon={TrendingUp}
          data={demographics?.membershipDistribution || []}
          type="pie"
          isLoading={isLoading}
          onSegmentClick={(key, label) => handleSegmentClick("membership", key, label)}
        />

        <DistributionChart
          title="Spiritual Journey"
          description="Milestones completed"
          icon={Award}
          data={demographics?.spiritualJourneyDistribution || []}
          type="pie"
          isLoading={isLoading}
          onSegmentClick={(key, label) => handleSegmentClick("spiritual_journey", key, label)}
          emptyMessage="No spiritual journey data"
        />
      </div>

      {/* Drill-down Modal */}
      <MemberListModal
        open={modalState.open}
        onClose={() => setModalState(prev => ({ ...prev, open: false }))}
        title={modalState.title}
        members={filteredMembers}
        filterContext={periodLabel}
      />
    </div>
  );
}
