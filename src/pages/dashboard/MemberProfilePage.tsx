import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Clock,
  Activity,
  AlertCircle,
  Edit,
  CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, parseISO, differenceInYears, subDays } from "date-fns";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  inactive: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
  transferred: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
};

const statusLabels: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  transferred: "Transferred",
};

export default function MemberProfilePage() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  // Fetch member details
  const { data: member, isLoading: memberLoading } = useQuery({
    queryKey: ["member-profile", memberId],
    queryFn: async () => {
      if (!memberId || !profile?.church_id) return null;

      const { data, error } = await supabase
        .from("members")
        .select(`
          *,
          branches (name)
        `)
        .eq("id", memberId)
        .eq("church_id", profile.church_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!memberId && !!profile?.church_id,
  });

  // Fetch member groups
  const { data: memberGroups } = useQuery({
    queryKey: ["member-profile-groups", memberId],
    queryFn: async () => {
      if (!memberId) return [];
      
      const { data, error } = await supabase
        .from("member_groups")
        .select("groups(name)")
        .eq("member_id", memberId);

      if (error) throw error;
      return data?.map((mg: any) => mg.groups?.name).filter(Boolean) || [];
    },
    enabled: !!memberId,
  });

  // Fetch member spiritual journeys
  const { data: spiritualJourneys } = useQuery({
    queryKey: ["member-profile-spiritual-journeys", memberId],
    queryFn: async () => {
      if (!memberId) return [];
      
      const { data, error } = await supabase
        .from("member_spiritual_journeys")
        .select("spiritual_journeys(name)")
        .eq("member_id", memberId);

      if (error) throw error;
      return data?.map((msj: any) => msj.spiritual_journeys?.name).filter(Boolean) || [];
    },
    enabled: !!memberId,
  });

  // Fetch attendance history
  const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
    queryKey: ["member-attendance", memberId],
    queryFn: async () => {
      if (!memberId) return { records: [], totalCount: 0, last30Days: 0, lastCheckin: null };

      // Get all attendance records
      const { data: records, error } = await supabase
        .from("attendance")
        .select(`
          id,
          checked_in_at,
          services (
            name,
            service_date
          )
        `)
        .eq("member_id", memberId)
        .order("checked_in_at", { ascending: false });

      if (error) throw error;

      const totalCount = records?.length || 0;
      
      // Count check-ins in last 30 days
      const thirtyDaysAgo = subDays(new Date(), 30);
      const last30Days = (records || []).filter(
        (r) => new Date(r.checked_in_at) >= thirtyDaysAgo
      ).length;

      // Get last check-in date
      const lastCheckin = records && records.length > 0 ? records[0].checked_in_at : null;

      return { 
        records: records || [], 
        totalCount, 
        last30Days, 
        lastCheckin 
      };
    },
    enabled: !!memberId,
  });

  const age = useMemo(() => {
    if (!member?.date_of_birth) return null;
    return differenceInYears(new Date(), parseISO(member.date_of_birth));
  }, [member?.date_of_birth]);

  if (memberLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Member not found</h2>
        <p className="text-muted-foreground mt-2">The member you're looking for doesn't exist.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/app/members")}>
          Back to Members
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={member.full_name}
        description={`${member.member_code} • ${statusLabels[member.membership_status || "active"]}`}
        icon={User}
        backTo="/app/members"
        actions={
          <Button variant="outline" onClick={() => navigate(`/app/members?edit=${member.id}`)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        }
      />

      {/* Attendance Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Check-ins</p>
                <p className="text-2xl font-bold">{attendanceData?.totalCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-accent/10">
                <Activity className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last 30 Days</p>
                <p className="text-2xl font-bold">{attendanceData?.last30Days || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-muted">
                <Clock className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Check-in</p>
                <p className="text-lg font-semibold">
                  {attendanceData?.lastCheckin 
                    ? format(parseISO(attendanceData.lastCheckin), "MMM d, yyyy")
                    : "Never"
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Member Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Member Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  {member.phone || "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  {member.email || "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gender</p>
                <p className="font-medium capitalize">{member.gender?.replace("_", " ") || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date of Birth</p>
                <p className="font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  {member.date_of_birth 
                    ? `${format(parseISO(member.date_of_birth), "MMM d, yyyy")} (${age} yrs)`
                    : "—"
                  }
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Day Born</p>
                <p className="font-medium capitalize">{member.day_born || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Branch</p>
                <p className="font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  {(member.branches as any)?.name || "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date Joined</p>
                <p className="font-medium">
                  {member.date_joined 
                    ? format(parseISO(member.date_joined), "MMM d, yyyy")
                    : "—"
                  }
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Residential Area</p>
                <p className="font-medium">{member.residential_area || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Marital Status</p>
                <p className="font-medium capitalize">{member.marital_status || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Occupation</p>
                <p className="font-medium capitalize">{member.occupation?.replace("_", " ") || "—"}</p>
              </div>
            </div>

            {/* Groups */}
            {memberGroups && memberGroups.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Groups / Ministries</p>
                <div className="flex flex-wrap gap-2">
                  {memberGroups.map((name: string, idx: number) => (
                    <Badge key={idx} variant="outline">{name}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Spiritual Journey */}
            {spiritualJourneys && spiritualJourneys.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Spiritual Journey</p>
                <div className="flex flex-wrap gap-2">
                  {spiritualJourneys.map((name: string, idx: number) => (
                    <Badge key={idx} variant="secondary">{name}</Badge>
                  ))}
                </div>
              </div>
            )}


            {/* How Heard */}
            {member.how_heard && (
              <div>
                <p className="text-sm text-muted-foreground">How they heard about us</p>
                <p className="font-medium capitalize">{member.how_heard.replace("_", " ")}</p>
              </div>
            )}

            {/* Admin Notes */}
            {member.admin_notes && (
              <div>
                <p className="text-sm text-muted-foreground">Admin Notes</p>
                <p className="font-medium text-sm">{member.admin_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Emergency Contact
            </CardTitle>
          </CardHeader>
          <CardContent>
            {member.emergency_contact_name || member.emergency_contact_phone ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Contact Name</p>
                  <p className="font-medium">{member.emergency_contact_name || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contact Phone</p>
                  <p className="font-medium flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    {member.emergency_contact_phone || "—"}
                  </p>
                </div>
                {member.emergency_contact_relationship && (
                  <div>
                    <p className="text-sm text-muted-foreground">Relationship</p>
                    <p className="font-medium capitalize">{member.emergency_contact_relationship}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">No emergency contact on file</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Attendance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Attendance
          </CardTitle>
          <CardDescription>Latest check-in records</CardDescription>
        </CardHeader>
        <CardContent>
          {attendanceLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : attendanceData?.records.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No attendance records found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Check-in Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceData?.records.slice(0, 10).map((record: any) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {record.services?.service_date 
                        ? format(parseISO(record.services.service_date), "MMM d, yyyy")
                        : "—"
                      }
                    </TableCell>
                    <TableCell>{record.services?.name || "—"}</TableCell>
                    <TableCell>
                      {format(parseISO(record.checked_in_at), "h:mm a")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Full Attendance History */}
      {attendanceData && attendanceData.records.length > 10 && (
        <Card>
          <CardHeader>
            <CardTitle>Full Attendance History</CardTitle>
            <CardDescription>All {attendanceData.totalCount} check-in records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Check-in Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceData.records.map((record: any) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        {record.services?.service_date 
                          ? format(parseISO(record.services.service_date), "MMM d, yyyy")
                          : "—"
                        }
                      </TableCell>
                      <TableCell>{record.services?.name || "—"}</TableCell>
                      <TableCell>
                        {format(parseISO(record.checked_in_at), "h:mm a")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
