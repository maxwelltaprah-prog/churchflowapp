import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Star,
  Phone,
  Mail,
  Eye,
  Download,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useBranchAccess, applyBranchFilter } from "@/hooks/useBranchAccess";
import { useBranches } from "@/hooks/useChurchData";
import { format, parseISO, differenceInYears } from "date-fns";

const DAY_LABELS: Record<string, string> = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};

interface MemberResult {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  gender: string | null;
  date_of_birth: string | null;
  day_born: string | null;
  branch_id: string;
  membership_status: string | null;
  branches?: { name: string } | null;
}

function useDayBornMembers(dayBorn: string, branchId?: string, serviceIds?: string[]) {
  const { profile } = useAuth();
  const { accessibleBranchIds, isLoading: accessLoading } = useBranchAccess();

  return useQuery({
    queryKey: ["day-born-members", profile?.church_id, dayBorn, branchId, serviceIds, accessibleBranchIds],
    queryFn: async () => {
      if (!profile?.church_id || !dayBorn) return [];

      if (accessibleBranchIds !== null && accessibleBranchIds.length === 0) {
        return [];
      }

      // If serviceIds provided, get members who checked in to those services with matching day_born
      if (serviceIds && serviceIds.length > 0) {
        const { data: attendanceData, error: attendanceError } = await supabase
          .from("attendance")
          .select("member_id")
          .eq("church_id", profile.church_id)
          .in("service_id", serviceIds);

        if (attendanceError) throw attendanceError;

        const uniqueMemberIds = [...new Set(attendanceData?.map(a => a.member_id) || [])];

        if (uniqueMemberIds.length === 0) return [];

        let query = supabase
          .from("members")
          .select("id, full_name, phone, email, photo_url, gender, date_of_birth, day_born, branch_id, membership_status, branches(name)")
          .eq("church_id", profile.church_id)
          .eq("day_born", dayBorn as any)
          .in("id", uniqueMemberIds)
          .order("full_name");

        query = applyBranchFilter(query, "branch_id", branchId, accessibleBranchIds);

        const { data, error } = await query;
        if (error) throw error;
        return data as MemberResult[];
      }

      // Default: all active members with matching day_born
      let query = supabase
        .from("members")
        .select("id, full_name, phone, email, photo_url, gender, date_of_birth, day_born, branch_id, membership_status, branches(name)")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .eq("day_born", dayBorn as any)
        .order("full_name");

      query = applyBranchFilter(query, "branch_id", branchId, accessibleBranchIds);

      const { data, error } = await query;
      if (error) throw error;
      return data as MemberResult[];
    },
    enabled: !!profile?.church_id && !!dayBorn && !accessLoading,
  });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function DayBornDrilldownPage() {
  const [searchParams] = useSearchParams();
  const dayBorn = searchParams.get("day") || "";
  const branchId = searchParams.get("branch") || undefined;
  const serviceIdsParam = searchParams.get("services");
  const serviceIds = serviceIdsParam ? serviceIdsParam.split(",") : undefined;

  const { data: members, isLoading } = useDayBornMembers(dayBorn, branchId, serviceIds);
  const { data: branches } = useBranches();

  const branchName = useMemo(() => {
    if (!branchId || !branches) return null;
    return branches.find(b => b.id === branchId)?.name;
  }, [branchId, branches]);

  const dayLabel = DAY_LABELS[dayBorn] || dayBorn;

  const handleExport = () => {
    if (!members?.length) return;
    
    const csvContent = [
      ["Name", "Phone", "Email", "Gender", "Date of Birth", "Age", "Branch", "Status"].join(","),
      ...members.map(m => [
        `"${m.full_name}"`,
        m.phone || "",
        m.email || "",
        m.gender || "",
        m.date_of_birth || "",
        m.date_of_birth ? differenceInYears(new Date(), parseISO(m.date_of_birth)) : "",
        (m.branches as any)?.name || "",
        m.membership_status || "",
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${dayLabel}-born-members.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${dayLabel}-Born Members`}
        description={`Members born on ${dayLabel}${branchName ? ` • ${branchName}` : ""}`}
        icon={Star}
        backTo="/app"
        actions={
          <Button variant="outline" onClick={handleExport} disabled={!members?.length}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                {dayLabel}-Born
              </CardTitle>
              <CardDescription>
                {isLoading ? "Loading..." : `${members?.length || 0} member${members?.length !== 1 ? "s" : ""}`}
              </CardDescription>
            </div>
            <Badge className="text-lg px-4 py-1 capitalize">{dayLabel}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !members?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No members found born on {dayLabel}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => {
                    const age = member.date_of_birth 
                      ? differenceInYears(new Date(), parseISO(member.date_of_birth))
                      : null;
                    
                    return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              {member.photo_url && <AvatarImage src={member.photo_url} />}
                              <AvatarFallback>{getInitials(member.full_name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{member.full_name}</p>
                              {member.date_of_birth && (
                                <p className="text-xs text-muted-foreground">
                                  {format(parseISO(member.date_of_birth), "MMM d, yyyy")}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {member.phone && (
                              <a href={`tel:${member.phone}`} className="flex items-center gap-1 text-sm text-primary hover:underline">
                                <Phone className="w-3 h-3" />
                                {member.phone}
                              </a>
                            )}
                            {member.email && (
                              <a href={`mailto:${member.email}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:underline">
                                <Mail className="w-3 h-3" />
                                {member.email}
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{member.gender || "—"}</TableCell>
                        <TableCell>{age !== null ? `${age} yrs` : "—"}</TableCell>
                        <TableCell>{(member.branches as any)?.name || "—"}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              member.membership_status === "active" ? "default" :
                              member.membership_status === "inactive" ? "secondary" : "outline"
                            }
                            className="capitalize"
                          >
                            {member.membership_status || "active"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Link to={`/app/members/${member.id}`}>
                            <Button variant="ghost" size="icon">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
