import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  Users,
  TrendingUp,
  Activity,
  Layers,
  UserCircle,
  Briefcase,
  Calendar,
  Heart,
  Award,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useBranchAccess, applyBranchFilter } from "@/hooks/useBranchAccess";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { format, subMonths, endOfMonth, parseISO, differenceInYears } from "date-fns";

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

const AGE_BUCKETS = [
  { label: "0-12", min: 0, max: 12 },
  { label: "13-19", min: 13, max: 19 },
  { label: "20-29", min: 20, max: 29 },
  { label: "30-39", min: 30, max: 39 },
  { label: "40-49", min: 40, max: 49 },
  { label: "50-59", min: 50, max: 59 },
  { label: "60+", min: 60, max: 150 },
];

const genderLabels: Record<string, string> = {
  male: "Male",
  female: "Female",
  prefer_not_to_say: "Prefer not to say",
  unknown: "Not specified",
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

const membershipLabels: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  transferred: "Transferred",
  unknown: "Not specified",
};

// =================== Groups List Hook ===================
function useGroupsList() {
  const { profile } = useAuth();
  const { accessibleBranchIds } = useBranchAccess();

  return useQuery({
    queryKey: ["groups-list", profile?.church_id, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id) return [];

      const { data: groups } = await supabase
        .from("groups")
        .select("id, name, description, is_active")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .order("sort_order");

      if (!groups?.length) return [];

      // Get member counts for each group
      const { data: memberGroups } = await supabase
        .from("member_groups")
        .select("group_id, member_id");

      const groupCounts: Record<string, number> = {};
      groups.forEach(g => { groupCounts[g.id] = 0; });

      (memberGroups || []).forEach(mg => {
        if (groupCounts[mg.group_id] !== undefined) {
          groupCounts[mg.group_id]++;
        }
      });

      return groups.map(g => ({
        ...g,
        memberCount: groupCounts[g.id] || 0,
      }));
    },
    enabled: !!profile?.church_id,
  });
}

// =================== Group Demographics Hook ===================
function useGroupDemographics(groupId: string | null) {
  const { profile } = useAuth();
  const { accessibleBranchIds } = useBranchAccess();

  return useQuery({
    queryKey: ["group-demographics", profile?.church_id, groupId, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id || !groupId) return null;

      // Get member IDs in this group
      const { data: memberGroups } = await supabase
        .from("member_groups")
        .select("member_id")
        .eq("group_id", groupId);

      const memberIds = (memberGroups || []).map(mg => mg.member_id);

      if (memberIds.length === 0) {
        return {
          totalMembers: 0,
          genderDistribution: [],
          ageDistribution: [],
          maritalDistribution: [],
          occupationDistribution: [],
          membershipDistribution: [],
          spiritualJourneyDistribution: [],
        };
      }

      // Fetch member details
      let membersQuery = supabase
        .from("members")
        .select("id, gender, date_of_birth, marital_status, occupation, membership_status")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .in("id", memberIds);

      membersQuery = applyBranchFilter(membersQuery, "branch_id", undefined, accessibleBranchIds);

      const { data: members } = await membersQuery;
      const memberData = members || [];

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

      // Age distribution
      const ageCounts: Record<string, number> = {};
      AGE_BUCKETS.forEach(b => { ageCounts[b.label] = 0; });
      ageCounts["Unknown"] = 0;

      membersWithAge.forEach(m => {
        if (m.age === null) {
          ageCounts["Unknown"]++;
        } else {
          const bucket = AGE_BUCKETS.find(b => m.age! >= b.min && m.age! <= b.max);
          if (bucket) ageCounts[bucket.label]++;
        }
      });
      const ageDistribution = Object.entries(ageCounts)
        .filter(([, count]) => count > 0)
        .map(([label, count]) => ({ name: label, value: count, key: label }));

      // Marital distribution
      const maritalCounts: Record<string, number> = {};
      membersWithAge.forEach(m => {
        const status = m.marital_status || "unknown";
        maritalCounts[status] = (maritalCounts[status] || 0) + 1;
      });
      const maritalDistribution = Object.entries(maritalCounts).map(([key, count]) => ({
        name: maritalLabels[key] || key,
        value: count,
        key,
      }));

      // Occupation distribution
      const occupationCounts: Record<string, number> = {};
      membersWithAge.forEach(m => {
        const occ = m.occupation || "unknown";
        occupationCounts[occ] = (occupationCounts[occ] || 0) + 1;
      });
      const occupationDistribution = Object.entries(occupationCounts).map(([key, count]) => ({
        name: occupationLabels[key] || key,
        value: count,
        key,
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

      // Spiritual Journey distribution
      const { data: spiritualJourneys } = await supabase
        .from("spiritual_journeys")
        .select("id, name")
        .eq("church_id", profile.church_id)
        .eq("is_active", true);

      const { data: memberJourneys } = await supabase
        .from("member_spiritual_journeys")
        .select("member_id, spiritual_journey_id")
        .in("member_id", memberIds);

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
        totalMembers: memberData.length,
        genderDistribution,
        ageDistribution,
        maritalDistribution,
        occupationDistribution,
        membershipDistribution,
        spiritualJourneyDistribution,
      };
    },
    enabled: !!profile?.church_id && !!groupId,
  });
}

// =================== Group Growth Hook (6 months) ===================
function useGroupGrowth(groupId: string | null) {
  const { profile } = useAuth();
  const { accessibleBranchIds } = useBranchAccess();

  return useQuery({
    queryKey: ["group-growth", profile?.church_id, groupId, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id || !groupId) return [];

      // Get member IDs in this group
      const { data: memberGroups } = await supabase
        .from("member_groups")
        .select("member_id")
        .eq("group_id", groupId);

      const memberIds = (memberGroups || []).map(mg => mg.member_id);

      if (memberIds.length === 0) return [];

      // Get last 6 months
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const monthEnd = endOfMonth(subMonths(new Date(), i));
        months.push({
          end: monthEnd,
          label: format(monthEnd, "MMM"),
          fullLabel: format(monthEnd, "MMM yyyy"),
        });
      }

      // Get active member count at end of each month
      const results = await Promise.all(
        months.map(async ({ end, label, fullLabel }) => {
          let query = supabase
            .from("members")
            .select("id", { count: "exact", head: true })
            .eq("church_id", profile.church_id)
            .eq("is_active", true)
            .eq("membership_status", "active")
            .in("id", memberIds)
            .lte("date_joined", format(end, "yyyy-MM-dd"));

          query = applyBranchFilter(query, "branch_id", undefined, accessibleBranchIds);

          const { count } = await query;

          return {
            month: label,
            fullMonth: fullLabel,
            activeMembers: count || 0,
          };
        })
      );

      return results;
    },
    enabled: !!profile?.church_id && !!groupId,
  });
}

// =================== Distribution Chart Component ===================
interface DistributionChartProps {
  title: string;
  description: string;
  icon: React.ElementType;
  data: { name: string; value: number; key: string }[];
  type: "pie" | "bar";
  isLoading: boolean;
  emptyMessage?: string;
}

function DistributionChart({
  title,
  description,
  icon: Icon,
  data,
  type,
  isLoading,
  emptyMessage = "No data available",
}: DistributionChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasData = data.length > 0 && data.some(d => d.value > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          {title}
        </CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          type === "pie" ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {data.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [value, "Members"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {data.slice(0, 4).map((item, index) => (
                  <div key={item.key} className="flex items-center gap-1.5 text-xs">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    <span>{item.name}: <strong>{item.value}</strong></span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="value" name="Members" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )
        ) : (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            {emptyMessage}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =================== Main Component ===================
export default function GroupsAnalyticsPage() {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const { data: groups, isLoading: groupsLoading } = useGroupsList();
  const { data: demographics, isLoading: demographicsLoading } = useGroupDemographics(selectedGroupId);
  const { data: growthData, isLoading: growthLoading } = useGroupGrowth(selectedGroupId);

  const selectedGroup = useMemo(() => {
    if (!selectedGroupId || !groups) return null;
    return groups.find(g => g.id === selectedGroupId);
  }, [selectedGroupId, groups]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Groups & Ministries"
        description="Select a group to view member demographics and growth trends"
        icon={Layers}
        backTo="/app/analytics"
      />

      {/* Group Selection Cards */}
      {!selectedGroupId && (
        <>
          {groupsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : groups && groups.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => (
                <Card
                  key={group.id}
                  className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                  onClick={() => setSelectedGroupId(group.id)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg">{group.name}</h3>
                        {group.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {group.description}
                          </p>
                        )}
                      </div>
                      <div className="p-2.5 rounded-xl bg-primary/10">
                        <Layers className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Layers className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-muted-foreground">No groups found</p>
                <p className="text-sm text-muted-foreground">Create groups in the Groups & Ministries section</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Selected Group View */}
      {selectedGroupId && selectedGroup && (
        <>
          {/* Group Header with Back Button */}
          <PageHeader
            title={selectedGroup.name}
            description={`${demographics?.totalMembers || 0} members`}
            icon={Layers}
            onBack={() => setSelectedGroupId(null)}
            backLabel="Back to Groups"
          />

          {/* Summary Stats Row */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Members</p>
                    {demographicsLoading ? (
                      <Skeleton className="h-7 w-16 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold">{demographics?.totalMembers || 0}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-green-500/10">
                    <Activity className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active %</p>
                    {demographicsLoading ? (
                      <Skeleton className="h-7 w-16 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold">
                        {demographics?.totalMembers
                          ? Math.round(
                              ((demographics.membershipDistribution.find(d => d.key === "active")?.value || 0) /
                                demographics.totalMembers) *
                                100
                            )
                          : 0}
                        %
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Age</p>
                    {demographicsLoading ? (
                      <Skeleton className="h-7 w-16 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold">
                        {(() => {
                          const ageData = demographics?.ageDistribution || [];
                          let totalAge = 0;
                          let totalCount = 0;
                          ageData.forEach(bucket => {
                            if (bucket.key !== "Unknown") {
                              const ageBucket = AGE_BUCKETS.find(b => b.label === bucket.key);
                              if (ageBucket) {
                                const midAge = (ageBucket.min + ageBucket.max) / 2;
                                totalAge += midAge * bucket.value;
                                totalCount += bucket.value;
                              }
                            }
                          });
                          return totalCount > 0 ? Math.round(totalAge / totalCount) : "-";
                        })()}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Member Demographics Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Member Demographics
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <DistributionChart
                title="Gender Distribution"
                description="Members by gender"
                icon={UserCircle}
                data={demographics?.genderDistribution || []}
                type="pie"
                isLoading={demographicsLoading}
              />

              <DistributionChart
                title="Age Distribution"
                description="Members by age group"
                icon={Calendar}
                data={demographics?.ageDistribution || []}
                type="bar"
                isLoading={demographicsLoading}
              />

              <DistributionChart
                title="Marital Status"
                description="Relationship status"
                icon={Heart}
                data={demographics?.maritalDistribution || []}
                type="pie"
                isLoading={demographicsLoading}
              />

              <DistributionChart
                title="Occupation"
                description="Employment breakdown"
                icon={Briefcase}
                data={demographics?.occupationDistribution || []}
                type="pie"
                isLoading={demographicsLoading}
              />

              <DistributionChart
                title="Membership Status"
                description="Active vs Inactive"
                icon={Activity}
                data={demographics?.membershipDistribution || []}
                type="pie"
                isLoading={demographicsLoading}
              />

              <DistributionChart
                title="Spiritual Journey"
                description="Milestones completed"
                icon={Award}
                data={demographics?.spiritualJourneyDistribution || []}
                type="pie"
                isLoading={demographicsLoading}
                emptyMessage="No spiritual journey data"
              />
            </div>
          </div>

          {/* Member Growth Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Member Growth
            </h3>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Active Members Over 6 Months</CardTitle>
                <CardDescription>Cumulative active member count at end of each month</CardDescription>
              </CardHeader>
              <CardContent>
                {growthLoading ? (
                  <Skeleton className="h-[280px] w-full" />
                ) : growthData && growthData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={growthData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} />
                      <YAxis tick={{ fontSize: 12 }} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        labelFormatter={(_, payload) => payload[0]?.payload?.fullMonth || ""}
                      />
                      <Legend />
                      <Line
                        type="linear"
                        dataKey="activeMembers"
                        name="Active Members"
                        stroke="hsl(142 76% 36%)"
                        strokeWidth={2}
                        dot={{ fill: "hsl(142 76% 36%)", strokeWidth: 2, r: 5 }}
                        activeDot={{ r: 7 }}
                        label={{
                          position: "top",
                          fontSize: 11,
                          fontWeight: 600,
                          fill: "hsl(142 76% 36%)",
                          dy: -8,
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground">
                    <TrendingUp className="w-12 h-12 mb-3 opacity-20" />
                    <p>No growth data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
