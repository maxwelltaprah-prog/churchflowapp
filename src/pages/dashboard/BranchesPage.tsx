import { Plus, MoreHorizontal, Users, MapPin, Edit, Trash2, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

// Mock data
const branches = [
  { 
    id: 1, 
    name: "Main Branch", 
    location: "Accra Central, Ghana",
    joinCode: "GCC-MAIN-001",
    memberCount: 450,
    isMain: true,
    isActive: true,
    servicesThisWeek: 4,
    attendanceRate: "85%"
  },
  { 
    id: 2, 
    name: "Takoradi Branch", 
    location: "Takoradi, Western Region",
    joinCode: "GCC-TAK-002",
    memberCount: 280,
    isMain: false,
    isActive: true,
    servicesThisWeek: 3,
    attendanceRate: "82%"
  },
  { 
    id: 3, 
    name: "Cape Coast Branch", 
    location: "Cape Coast, Central Region",
    joinCode: "GCC-CPE-003",
    memberCount: 195,
    isMain: false,
    isActive: true,
    servicesThisWeek: 3,
    attendanceRate: "78%"
  },
  { 
    id: 4, 
    name: "Kumasi Branch", 
    location: "Kumasi, Ashanti Region",
    joinCode: "GCC-KUM-004",
    memberCount: 310,
    isMain: false,
    isActive: true,
    servicesThisWeek: 4,
    attendanceRate: "88%"
  },
];

export default function BranchesPage() {
  const copyJoinLink = (code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/join?code=${code}`);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Branches</h1>
          <p className="text-muted-foreground mt-1">
            Manage your church locations and sub-branches
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Branch
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Branches</CardDescription>
            <CardTitle className="text-3xl">{branches.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {branches.filter(b => b.isActive).length} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Members</CardDescription>
            <CardTitle className="text-3xl">
              {branches.reduce((sum, b) => sum + b.memberCount, 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Across all branches</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Attendance</CardDescription>
            <CardTitle className="text-3xl">83%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">This week</p>
          </CardContent>
        </Card>
      </div>

      {/* Branches Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {branches.map((branch) => (
          <Card key={branch.id} className="relative overflow-hidden">
            {branch.isMain && (
              <div className="absolute top-0 right-0">
                <Badge className="rounded-none rounded-bl-lg bg-accent text-accent-foreground">
                  Main Branch
                </Badge>
              </div>
            )}
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{branch.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" />
                    {branch.location}
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => copyJoinLink(branch.joinCode)}>
                      <LinkIcon className="w-4 h-4 mr-2" />
                      Copy Join Link
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Branch
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Deactivate
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Join Code */}
                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Join Code</p>
                    <p className="font-mono font-medium">{branch.joinCode}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => copyJoinLink(branch.joinCode)}
                  >
                    <LinkIcon className="w-4 h-4" />
                  </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-secondary/30 rounded-lg">
                    <p className="text-2xl font-bold text-primary">{branch.memberCount}</p>
                    <p className="text-xs text-muted-foreground">Members</p>
                  </div>
                  <div className="text-center p-3 bg-secondary/30 rounded-lg">
                    <p className="text-2xl font-bold text-accent">{branch.servicesThisWeek}</p>
                    <p className="text-xs text-muted-foreground">Services/wk</p>
                  </div>
                  <div className="text-center p-3 bg-secondary/30 rounded-lg">
                    <p className="text-2xl font-bold text-foreground">{branch.attendanceRate}</p>
                    <p className="text-xs text-muted-foreground">Attendance</p>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${branch.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className="text-sm text-muted-foreground">
                      {branch.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <Button variant="outline" size="sm">
                    <Users className="w-4 h-4 mr-1" />
                    View Members
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
