import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Eye, Edit, Phone, Users, UserPlus, PhoneCall, UserCheck, Search, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, formatDistanceToNow } from "date-fns";
import { useVisitors, useVisitorStats } from "@/hooks/useVisitorsData";

const howHeardLabels: Record<string, string> = {
  friend_family: "Family",
  social_media: "Social Media",
  walk_in: "Walk-in",
  outreach: "Outreach",
  other: "Other",
};

const statusConfig = {
  new: { label: "New", variant: "default" as const, className: "bg-orange-100 text-orange-800 hover:bg-orange-100" },
  in_follow_up: { label: "In follow up", variant: "secondary" as const, className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" },
  converted: { label: "Converted", variant: "outline" as const, className: "bg-green-100 text-green-800 hover:bg-green-100" },
};

export default function VisitorsPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: visitors, isLoading } = useVisitors(undefined, statusFilter);
  const { data: stats } = useVisitorStats();

  const filteredVisitors = visitors?.filter((visitor) => {
    const fullName = `${visitor.first_name} ${visitor.last_name}`.toLowerCase();
    const phone = visitor.phone?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || phone.includes(query);
  });

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Visitor Management</h1>
          <p className="text-muted-foreground">Track and manage church visitors</p>
        </div>
        <Button onClick={() => navigate("/app/visitors/new")} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4" />
          Register New Visitor
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-600 text-white border-0">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Total Visitors</p>
              <p className="text-3xl font-bold">{stats?.total || 0}</p>
            </div>
            <Users className="w-10 h-10 opacity-80" />
          </CardContent>
        </Card>

        <Card className="bg-orange-500 text-white border-0">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">New Visitors</p>
              <p className="text-3xl font-bold">{stats?.new || 0}</p>
            </div>
            <UserPlus className="w-10 h-10 opacity-80" />
          </CardContent>
        </Card>

        <Card className="bg-yellow-500 text-white border-0">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">In Follow-up</p>
              <p className="text-3xl font-bold">{stats?.inFollowUp || 0}</p>
            </div>
            <PhoneCall className="w-10 h-10 opacity-80" />
          </CardContent>
        </Card>

        <Card className="bg-green-600 text-white border-0">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Converted to Members</p>
              <p className="text-3xl font-bold">{stats?.converted || 0}</p>
            </div>
            <UserCheck className="w-10 h-10 opacity-80" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Visitors Table */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-4">
            <CardTitle>Visitors</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search visitors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                {["all", "new", "in_follow_up", "converted"].map((status) => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter(status)}
                    className={statusFilter === status ? "bg-primary" : ""}
                  >
                    {status === "all" ? "All" : status === "in_follow_up" ? "In Follow-up" : status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>NAME</TableHead>
                    <TableHead>CONTACT</TableHead>
                    <TableHead>FIRST VISIT</TableHead>
                    <TableHead>STATUS</TableHead>
                    <TableHead>ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        Loading visitors...
                      </TableCell>
                    </TableRow>
                  ) : filteredVisitors?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No visitors found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredVisitors?.map((visitor) => (
                      <TableRow key={visitor.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                              {getInitials(visitor.first_name, visitor.last_name)}
                            </div>
                            <div>
                              <p className="font-medium">{visitor.first_name} {visitor.last_name}</p>
                              <p className="text-sm text-muted-foreground">
                                Heard from: {howHeardLabels[visitor.how_heard]}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p>{visitor.phone}</p>
                            {visitor.email && (
                              <p className="text-sm text-muted-foreground">{visitor.email}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p>{format(new Date(visitor.first_visit_date), "MMM dd, yyyy")}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(visitor.first_visit_date), { addSuffix: true })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusConfig[visitor.status].className}>
                            {statusConfig[visitor.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/app/visitors/${visitor.id}`)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/app/visitors/${visitor.id}/edit`)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/app/visitors/${visitor.id}/followup`)}
                            >
                              <Phone className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Follow-ups */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Follow-ups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <CheckSquare className="w-12 h-12 mb-3 opacity-50" />
              <p>No upcoming follow-ups</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
