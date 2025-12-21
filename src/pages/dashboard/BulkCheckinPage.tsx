import { useState } from "react";
import { format } from "date-fns";
import { 
  Users, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Loader2,
  UserCheck,
  UserX
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useServices, useBranches, useMembers, useAttendance } from "@/hooks/useChurchData";
import { useRecordAttendance } from "@/hooks/useChurchMutations";
import { toast } from "sonner";

export default function BulkCheckinPage() {
  const [selectedService, setSelectedService] = useState("");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: branches } = useBranches();
  const { data: services, isLoading: servicesLoading } = useServices();
  const { data: members, isLoading: membersLoading } = useMembers(
    selectedBranch === "all" ? undefined : selectedBranch,
    "approved"
  );
  const { data: attendance } = useAttendance(selectedService || undefined);
  
  const recordAttendance = useRecordAttendance();

  const selectedServiceData = services?.find(s => s.id === selectedService);

  // Get list of already checked-in member IDs
  const checkedInMemberIds = new Set(attendance?.map((a: any) => a.member_id) || []);

  // Filter members based on search and exclude already checked in
  const filteredMembers = members?.filter((member) => {
    const matchesSearch = searchQuery === "" || 
      member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.member_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone?.includes(searchQuery);
    
    const notCheckedIn = !checkedInMemberIds.has(member.id);
    
    return matchesSearch && notCheckedIn;
  }) || [];

  const handleToggleMember = (memberId: string) => {
    setSelectedMembers(prev => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedMembers.size === filteredMembers.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(filteredMembers.map(m => m.id)));
    }
  };

  const handleBulkCheckin = async () => {
    if (!selectedService || !selectedServiceData || selectedMembers.size === 0) {
      toast.error("Please select a service and at least one member");
      return;
    }

    setIsProcessing(true);
    let successCount = 0;
    let errorCount = 0;

    for (const memberId of selectedMembers) {
      const member = members?.find(m => m.id === memberId);
      if (!member) continue;

      try {
        await recordAttendance.mutateAsync({
          service_id: selectedService,
          member_id: memberId,
          branch_id: selectedServiceData.branch_id,
          member_home_branch_id: member.branch_id,
          checkin_method: "staff_scan",
        });
        successCount++;
      } catch (error) {
        errorCount++;
        console.error(`Failed to check in member ${memberId}:`, error);
      }
    }

    setIsProcessing(false);
    setSelectedMembers(new Set());

    if (successCount > 0) {
      toast.success(`Successfully checked in ${successCount} member${successCount > 1 ? "s" : ""}`);
    }
    if (errorCount > 0) {
      toast.error(`Failed to check in ${errorCount} member${errorCount > 1 ? "s" : ""}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bulk Check-in</h1>
          <p className="text-muted-foreground mt-1">
            Check in multiple members at once
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedService} onValueChange={setSelectedService}>
            <SelectTrigger className="w-full sm:w-[280px]">
              <SelectValue placeholder="Select a service" />
            </SelectTrigger>
            <SelectContent>
              {servicesLoading ? (
                <div className="p-4 text-center">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                </div>
              ) : services?.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No services scheduled
                </div>
              ) : (
                services?.map((service) => {
                  const branch = branches?.find(b => b.id === service.branch_id);
                  return (
                    <SelectItem key={service.id} value={service.id}>
                      <div className="flex flex-col">
                        <span>{service.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(service.service_date), "EEE, MMM d")}
                          {service.start_time && ` at ${service.start_time}`}
                          {branch && ` · ${branch.name}`}
                        </span>
                      </div>
                    </SelectItem>
                  );
                })
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <UserCheck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{checkedInMemberIds.size}</p>
                <p className="text-sm text-muted-foreground">Already Checked In</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-accent/10 rounded-xl">
                <UserX className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{filteredMembers.length}</p>
                <p className="text-sm text-muted-foreground">Not Checked In</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{selectedMembers.size}</p>
                <p className="text-sm text-muted-foreground">Selected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Member Selection */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Select Members
              </CardTitle>
              <CardDescription>
                Choose members to check in to the selected service
              </CardDescription>
            </div>
            <Button 
              onClick={handleBulkCheckin}
              disabled={!selectedService || selectedMembers.size === 0 || isProcessing}
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Check In {selectedMembers.size} Member{selectedMembers.size !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, code, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches?.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Select All */}
          {filteredMembers.length > 0 && (
            <div className="flex items-center gap-2 mb-4 pb-4 border-b">
              <Checkbox
                id="select-all"
                checked={selectedMembers.size === filteredMembers.length && filteredMembers.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                Select All ({filteredMembers.length} members)
              </label>
            </div>
          )}

          {/* Members List */}
          {!selectedService ? (
            <p className="text-muted-foreground text-center py-8">
              Please select a service first
            </p>
          ) : membersLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-8">
              <XCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "No members match your search" : "All members are already checked in"}
              </p>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filteredMembers.map((member) => {
                const isSelected = selectedMembers.has(member.id);
                const branch = branches?.find(b => b.id === member.branch_id);
                
                return (
                  <div
                    key={member.id}
                    onClick={() => handleToggleMember(member.id)}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                      ${isSelected 
                        ? "bg-primary/10 border-primary" 
                        : "bg-card hover:bg-secondary/50 border-border"
                      }
                    `}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleMember(member.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {member.full_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{member.full_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono">{member.member_code}</span>
                        {branch && (
                          <Badge variant="outline" className="text-xs">
                            {branch.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
