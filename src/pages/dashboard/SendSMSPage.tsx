import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, Users, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useMembersWithPhone } from "@/hooks/useSMSData";
import { useSendSMSCampaign } from "@/hooks/useSMSMutations";
import { useGroups } from "@/hooks/useGroupsData";
import { Skeleton } from "@/components/ui/skeleton";

export default function SendSMSPage() {
  const navigate = useNavigate();
  
  // Data hooks
  const { data: members, isLoading: membersLoading } = useMembersWithPhone();
  const { data: groups } = useGroups();
  const sendCampaign = useSendSMSCampaign();

  // State
  const [audienceTab, setAudienceTab] = useState("all");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [senderName, setSenderName] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Filter members based on search
  const filteredMembers = useMemo(() => {
    if (!members) return [];
    if (!memberSearch) return members;
    const search = memberSearch.toLowerCase();
    return members.filter(
      (m) =>
        m.full_name.toLowerCase().includes(search) ||
        m.phone?.toLowerCase().includes(search)
    );
  }, [members, memberSearch]);

  // Calculate recipients based on selection
  const recipientCount = useMemo(() => {
    if (audienceTab === "all") {
      return members?.length || 0;
    } else if (audienceTab === "group") {
      return selectedGroupIds.length > 0 ? "Selected groups" : 0;
    } else {
      return selectedMemberIds.length;
    }
  }, [audienceTab, members, selectedGroupIds, selectedMemberIds]);

  // Handle group selection
  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  // Handle member selection
  const toggleMember = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const selectAllMembers = () => {
    setSelectedMemberIds(filteredMembers.map((m) => m.id));
  };

  const deselectAllMembers = () => {
    setSelectedMemberIds([]);
  };

  // Handle send
  const handleSend = async () => {
    setShowConfirmDialog(false);
    
    const actualRecipientCount = typeof recipientCount === "number" ? recipientCount : selectedMemberIds.length;
    
    await sendCampaign.mutateAsync({
      audienceType: audienceTab === "all" ? "all_members" : audienceTab === "group" ? "group" : "individual",
      audienceGroupIds: audienceTab === "group" ? selectedGroupIds : undefined,
      audienceMemberIds: audienceTab === "individual" ? selectedMemberIds : undefined,
      messageBody: message,
      subject,
      senderName: senderName.trim() || undefined,
      recipientCount: actualRecipientCount,
    });

    // Reset form
    setSenderName("");
    setSubject("");
    setMessage("");
    setSelectedGroupIds([]);
    setSelectedMemberIds([]);
  };

  const canSend =
    message.length >= 10 &&
    message.length <= 1000 &&
    (audienceTab === "all" ||
      (audienceTab === "group" && selectedGroupIds.length > 0) ||
      (audienceTab === "individual" && selectedMemberIds.length > 0));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Send SMS</h1>
          <p className="text-muted-foreground">Send bulk SMS to your congregation</p>
        </div>
        
        <Button variant="outline" onClick={() => navigate("/app/sms")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to SMS Dashboard
        </Button>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Panel - Select Recipients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Select Recipients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={audienceTab} onValueChange={setAudienceTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">
                  All Members
                  {audienceTab === "all" && members && (
                    <Badge variant="secondary" className="ml-2">{members.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="group">
                  By Group
                  {selectedGroupIds.length > 0 && (
                    <Badge variant="secondary" className="ml-2">{selectedGroupIds.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="individual">
                  Individual
                  {selectedMemberIds.length > 0 && (
                    <Badge variant="secondary" className="ml-2">{selectedMemberIds.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-4">
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="font-medium">All Members Selected</p>
                  <p className="text-sm text-muted-foreground">
                    {members?.length || 0} members with valid phone numbers
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="group" className="mt-4 space-y-3">
                {groups && groups.length > 0 ? (
                  groups.map((group) => (
                    <div
                      key={group.id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleGroup(group.id)}
                    >
                      <Checkbox
                        checked={selectedGroupIds.includes(group.id)}
                        onCheckedChange={() => toggleGroup(group.id)}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{group.name}</p>
                        {group.description && (
                          <p className="text-sm text-muted-foreground">{group.description}</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No groups available
                  </div>
                )}
              </TabsContent>

              <TabsContent value="individual" className="mt-4 space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search members..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Select/Deselect buttons */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAllMembers}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAllMembers}>
                    Deselect All
                  </Button>
                  <span className="text-sm text-muted-foreground self-center ml-auto">
                    {selectedMemberIds.length} selected
                  </span>
                </div>

                {/* Member List */}
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {membersLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-14" />
                      ))}
                    </div>
                  ) : filteredMembers.length > 0 ? (
                    filteredMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => toggleMember(member.id)}
                      >
                        <Checkbox
                          checked={selectedMemberIds.includes(member.id)}
                          onCheckedChange={() => toggleMember(member.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{member.full_name}</p>
                          <p className="text-sm text-muted-foreground">{member.phone}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No members found
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Right Panel - Message Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Message Content
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sender Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Sender Name</label>
              <Input
                placeholder="e.g. MyChurch (max 11 characters)"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value.replace(/[^a-zA-Z0-9\s]/g, "").substring(0, 11))}
                maxLength={11}
              />
              <p className="text-xs text-muted-foreground">
                This name will appear as the sender on recipients' phones. Letters and numbers only.
              </p>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject (Optional)</label>
              <Input
                placeholder="Enter subject..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={100}
              />
            </div>

            {/* Message Textarea */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <Textarea
                placeholder="Type your message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[200px] resize-none"
                maxLength={1000}
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{message.length} / 1000 characters</span>
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Recipients:</span>
                <span className="font-medium">
                  {typeof recipientCount === "number" ? recipientCount : recipientCount}
                </span>
              </div>
            </div>

            {/* Send Button */}
            <Button
              className="w-full"
              size="lg"
              disabled={!canSend || sendCampaign.isPending}
              onClick={() => setShowConfirmDialog(true)}
            >
              {sendCampaign.isPending ? "Sending..." : "Send SMS"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm SMS Send</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to send this SMS to{" "}
              {typeof recipientCount === "number" ? recipientCount : "selected"} recipients?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend}>Send SMS</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
