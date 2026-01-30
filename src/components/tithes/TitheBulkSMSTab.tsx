import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTithePayments, useTitheSettings } from "@/hooks/useTitheData";
import { useBranches } from "@/hooks/useChurchData";
import { useComplementarySMSStatus } from "@/hooks/useSMSData";
import { useSendSMSCampaign } from "@/hooks/useSMSMutations";
import { MessageSquare, Send, Users, AlertCircle, Eye, Save, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 3 }, (_, i) => currentYear - i);

const DEFAULT_TEMPLATES = [
  {
    name: "Thank You",
    body: "Hi {{first_name}}, thank you for faithfully paying your tithe this month. God bless you abundantly!",
  },
  {
    name: "Appreciation",
    body: "Dear {{first_name}}, we are grateful for your generous tithe contribution. May the Lord multiply your blessings!",
  },
  {
    name: "Blessing",
    body: "{{first_name}}, your faithfulness in tithing is a blessing to our church. May God open the windows of heaven for you!",
  },
];

export function TitheBulkSMSTab() {
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [periodMonth, setPeriodMonth] = useState(new Date().getMonth() + 1);
  const [periodYear, setPeriodYear] = useState(currentYear);
  const [message, setMessage] = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [previewMemberId, setPreviewMemberId] = useState<string | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const { data: branches } = useBranches();
  const { data: settings } = useTitheSettings();
  const { data: smsStatus } = useComplementarySMSStatus();
  const sendSMS = useSendSMSCampaign();

  const { data: payments } = useTithePayments({
    branchId: branchFilter === "all" ? undefined : branchFilter,
    periodMonth,
    periodYear,
    status: "paid",
  });

  // Get unique members who paid
  const paidMembers = useMemo(() => {
    if (!payments) return [];
    const memberMap = new Map();
    payments.forEach((payment) => {
      if (payment.member && payment.member.phone) {
        if (!memberMap.has(payment.member.id)) {
          memberMap.set(payment.member.id, {
            ...payment.member,
            amount: Number(payment.amount),
            paymentDate: payment.payment_date,
          });
        } else {
          const existing = memberMap.get(payment.member.id);
          existing.amount += Number(payment.amount);
        }
      }
    });
    return Array.from(memberMap.values());
  }, [payments]);

  const formatCurrency = (amount: number) => {
    const currency = settings?.default_currency || "GHS";
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getFirstName = (fullName: string) => {
    const parts = fullName.trim().split(" ");
    return parts[0] || "there";
  };

  const personalizeMessage = (msg: string, member: { full_name: string }) => {
    const firstName = getFirstName(member.full_name);
    return msg.replace(/\{\{first_name\}\}/gi, firstName);
  };

  const handleSelectAll = () => {
    if (selectedRecipients.size === paidMembers.length) {
      setSelectedRecipients(new Set());
    } else {
      setSelectedRecipients(new Set(paidMembers.map((m) => m.id)));
    }
  };

  const handleToggleRecipient = (memberId: string) => {
    const newSelected = new Set(selectedRecipients);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
    }
    setSelectedRecipients(newSelected);
  };

  const handleLoadTemplate = (template: { name: string; body: string }) => {
    setMessage(template.body);
    toast.success(`Loaded "${template.name}" template`);
  };

  const handlePreview = (memberId: string) => {
    setPreviewMemberId(memberId);
    setShowPreviewDialog(true);
  };

  const handleSendSMS = async () => {
    if (selectedRecipients.size === 0) {
      toast.error("Please select at least one recipient");
      return;
    }

    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    const recipientIds = Array.from(selectedRecipients);
    
    setIsSending(true);
    try {
      await sendSMS.mutateAsync({
        audienceType: "individual",
        audienceMemberIds: recipientIds,
        audienceVisitorIds: [],
        messageBody: message,
        recipientCount: recipientIds.length,
        useFirstName: message.includes("{{first_name}}"),
      });
      
      setSelectedRecipients(new Set());
      setMessage("");
    } catch (error) {
      console.error("Failed to send SMS:", error);
    } finally {
      setIsSending(false);
    }
  };

  const previewMember = paidMembers.find((m) => m.id === previewMemberId);
  const characterCount = message.length;
  const segmentCount = Math.ceil(characterCount / 160) || 1;

  return (
    <div className="space-y-6">
      {/* SMS Credits Status */}
      <Card className="bg-gradient-to-r from-kpi-purple/10 to-kpi-blue/10 border-kpi-purple/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-kpi-purple/20 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-kpi-purple" />
              </div>
              <div>
                <p className="font-medium">SMS Credits Available</p>
                <p className="text-2xl font-bold">
                  {smsStatus?.remaining || 0} credits
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-sm">
              {smsStatus?.tier || "Starter"} Plan
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recipients Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Select Recipients
            </CardTitle>
            <CardDescription>
              Members who paid tithe for the selected period
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex gap-4">
              <Select value={periodMonth.toString()} onValueChange={(v) => setPeriodMonth(parseInt(v))}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={periodYear.toString()} onValueChange={(v) => setPeriodYear(parseInt(v))}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="All Branches" />
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

            {/* Recipients List */}
            <div className="border rounded-lg">
              <div className="p-3 border-b bg-muted/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedRecipients.size === paidMembers.length && paidMembers.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm font-medium">
                    {selectedRecipients.size} of {paidMembers.length} selected
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                  {selectedRecipients.size === paidMembers.length ? "Clear All" : "Select All"}
                </Button>
              </div>
              <ScrollArea className="h-[300px]">
                {paidMembers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mb-2" />
                    <p>No members with valid phone numbers found</p>
                    <p className="text-sm">for this period</p>
                  </div>
                ) : (
                  <Table>
                    <TableBody>
                      {paidMembers.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="w-12">
                            <Checkbox
                              checked={selectedRecipients.has(member.id)}
                              onCheckedChange={() => handleToggleRecipient(member.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{member.full_name}</p>
                              <p className="text-xs text-muted-foreground">{member.phone}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(member.amount)}
                          </TableCell>
                          <TableCell className="w-12">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePreview(member.id)}
                              disabled={!message}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </div>
          </CardContent>
        </Card>

        {/* Message Composer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Compose Message
            </CardTitle>
            <CardDescription>
              Use {"{{first_name}}"} to personalize with member's first name
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Templates */}
            <div>
              <p className="text-sm font-medium mb-2">Quick Templates</p>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_TEMPLATES.map((template) => (
                  <Button
                    key={template.name}
                    variant="outline"
                    size="sm"
                    onClick={() => handleLoadTemplate(template)}
                  >
                    {template.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Message Input */}
            <div>
              <Textarea
                placeholder="Hi {{first_name}}, thank you for your tithe..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className="resize-none"
              />
              <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                <span>{characterCount} characters</span>
                <span>{segmentCount} SMS segment{segmentCount > 1 ? "s" : ""}</span>
              </div>
            </div>

            {/* Variable Chips */}
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setMessage((prev) => prev + "{{first_name}}")}
              >
                + First Name
              </Button>
            </div>

            {/* Send Button */}
            <div className="pt-4">
              <Button
                className="w-full"
                size="lg"
                onClick={handleSendSMS}
                disabled={selectedRecipients.size === 0 || !message.trim() || isSending}
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send to {selectedRecipients.size} recipient{selectedRecipients.size !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
              {selectedRecipients.size > 0 && (
                <p className="text-center text-sm text-muted-foreground mt-2">
                  This will use approximately {selectedRecipients.size * segmentCount} SMS credits
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message Preview</DialogTitle>
          </DialogHeader>
          {previewMember && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">To: {previewMember.full_name}</p>
                <p className="text-sm text-muted-foreground">{previewMember.phone}</p>
              </div>
              <div className="bg-primary/10 p-4 rounded-lg">
                <p className="whitespace-pre-wrap">
                  {personalizeMessage(message, previewMember)}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
