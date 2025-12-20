import { useState } from "react";
import { 
  Search, 
  Plus, 
  Filter, 
  MoreHorizontal, 
  UserCheck, 
  UserX,
  Mail,
  Phone,
  QrCode,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Mock data
const members = [
  { id: 1, name: "Sarah Johnson", email: "sarah@email.com", phone: "+233 24 123 4567", branch: "Main Branch", status: "member", attendance: 48, rate: "94%", lastSeen: "Today" },
  { id: 2, name: "Michael Owusu", email: "michael@email.com", phone: "+233 20 987 6543", branch: "Takoradi", status: "member", attendance: 42, rate: "87%", lastSeen: "Yesterday" },
  { id: 3, name: "Grace Adu", email: "grace@email.com", phone: "+233 55 111 2222", branch: "Cape Coast", status: "visitor", attendance: 5, rate: "100%", lastSeen: "Today" },
  { id: 4, name: "James Mensah", email: "james@email.com", phone: "+233 24 333 4444", branch: "Main Branch", status: "new_convert", attendance: 8, rate: "88%", lastSeen: "3 days ago" },
  { id: 5, name: "Abena Serwaa", email: "abena@email.com", phone: "+233 50 555 6666", branch: "Kumasi", status: "member", attendance: 52, rate: "98%", lastSeen: "Today" },
  { id: 6, name: "Kwame Asante", email: "kwame@email.com", phone: "+233 27 777 8888", branch: "Main Branch", status: "member", attendance: 36, rate: "75%", lastSeen: "1 week ago" },
];

const statusColors: Record<string, string> = {
  member: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  visitor: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  new_convert: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
};

const statusLabels: Record<string, string> = {
  member: "Member",
  visitor: "Visitor",
  new_convert: "New Convert",
};

export default function MembersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredMembers = members.filter((member) => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBranch = branchFilter === "all" || member.branch === branchFilter;
    const matchesStatus = statusFilter === "all" || member.status === statusFilter;
    return matchesSearch && matchesBranch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Members</h1>
          <p className="text-muted-foreground mt-1">
            Manage your church members across all branches
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Member
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Branches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            <SelectItem value="Main Branch">Main Branch</SelectItem>
            <SelectItem value="Takoradi">Takoradi</SelectItem>
            <SelectItem value="Cape Coast">Cape Coast</SelectItem>
            <SelectItem value="Kumasi">Kumasi</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="member">Members</SelectItem>
            <SelectItem value="visitor">Visitors</SelectItem>
            <SelectItem value="new_convert">New Converts</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Members Table */}
      <div className="bg-card rounded-xl border border-border shadow-soft overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead className="hidden md:table-cell">Branch</TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
              <TableHead className="hidden lg:table-cell">Attendance</TableHead>
              <TableHead className="hidden xl:table-cell">Last Seen</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMembers.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {member.name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-foreground">{member.name}</div>
                      <div className="text-sm text-muted-foreground">{member.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="text-sm">{member.branch}</span>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant="secondary" className={statusColors[member.status]}>
                    {statusLabels[member.status]}
                  </Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{member.attendance}</span>
                    <span className="text-muted-foreground text-sm">({member.rate})</span>
                  </div>
                </TableCell>
                <TableCell className="hidden xl:table-cell">
                  <span className="text-sm text-muted-foreground">{member.lastSeen}</span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <QrCode className="w-4 h-4 mr-2" />
                        View QR Code
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Mail className="w-4 h-4 mr-2" />
                        Send Message
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Phone className="w-4 h-4 mr-2" />
                        Call
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>Edit Member</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        Deactivate
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination placeholder */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredMembers.length} of {members.length} members
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm" disabled>Next</Button>
        </div>
      </div>
    </div>
  );
}
