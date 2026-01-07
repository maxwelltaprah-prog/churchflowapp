import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, startOfDay, endOfDay, subDays } from "date-fns";
import {
  MessageSquare,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSMSCampaigns, useDeliveryStatusSummary } from "@/hooks/useSMSData";
import { useResendFailedSMS } from "@/hooks/useSMSMutations";
import { PageHeader } from "@/components/dashboard/PageHeader";

export default function SMSDashboardPage() {
  const navigate = useNavigate();
  const { data: campaigns, isLoading: campaignsLoading } = useSMSCampaigns();
  const { data: deliverySummary, isLoading: summaryLoading } = useDeliveryStatusSummary();
  const resendMutation = useResendFailedSMS();
  
  // Date filter state
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  // Filter campaigns by date
  const filteredCampaigns = useMemo(() => {
    if (!campaigns) return [];
    return campaigns.filter((campaign) => {
      const campaignDate = new Date(campaign.created_at);
      if (dateRange.from && campaignDate < startOfDay(dateRange.from)) return false;
      if (dateRange.to && campaignDate > endOfDay(dateRange.to)) return false;
      return true;
    });
  }, [campaigns, dateRange]);

  // Calculate stats from filtered campaigns
  const totalSent = filteredCampaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0);
  const totalFailed = filteredCampaigns.reduce((sum, c) => sum + (c.failed_count || 0), 0);
  const totalCampaigns = filteredCampaigns.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="SMS Dashboard"
        description="Manage your SMS campaigns"
        icon={MessageSquare}
        backTo="/app"
        actions={
          <Button onClick={() => navigate("/app/sms/send")}>
            <Send className="h-4 w-4 mr-2" />
            Send SMS
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        {/* Total Campaigns */}
        <Card className="border border-border border-l-4 border-l-violet-500 bg-gradient-to-r from-violet-500/5 to-transparent hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <div className="p-2.5 rounded-xl bg-violet-500/10">
              <MessageSquare className="h-5 w-5 text-violet-600" />
            </div>
          </CardHeader>
          <CardContent>
            {campaignsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{totalCampaigns}</div>
            )}
            <p className="text-xs text-muted-foreground">In selected period</p>
          </CardContent>
        </Card>

        {/* Messages Sent */}
        <Card className="border border-border border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-500/5 to-transparent hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
            <div className="p-2.5 rounded-xl bg-blue-500/10">
              <ArrowUpRight className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            {campaignsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-blue-600">{totalSent}</div>
            )}
            <p className="text-xs text-muted-foreground">Submitted to provider</p>
          </CardContent>
        </Card>

        {/* Delivered */}
        <Card className="border border-border border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-500/5 to-transparent hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <div className="p-2.5 rounded-xl bg-emerald-500/10">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-emerald-600">
                {deliverySummary?.delivered ?? 0}
              </div>
            )}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{deliverySummary?.sent ?? 0} awaiting delivery</span>
            </div>
          </CardContent>
        </Card>

        {/* Failed Messages */}
        <Card className="border border-border border-l-4 border-l-rose-500 bg-gradient-to-r from-rose-500/5 to-transparent hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <div className="p-2.5 rounded-xl bg-rose-500/10">
              <XCircle className="h-5 w-5 text-rose-600" />
            </div>
          </CardHeader>
          <CardContent>
            {campaignsLoading || summaryLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-rose-600">
                {deliverySummary?.failed ?? totalFailed}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Failed to deliver</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Campaigns */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Campaigns</CardTitle>
          {/* Date Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Calendar className="h-4 w-4 mr-2" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}
                    </>
                  ) : (
                    format(dateRange.from, "MMM d, yyyy")
                  )
                ) : (
                  "Filter by date"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="range"
                selected={dateRange}
                onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                numberOfMonths={2}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </CardHeader>
        <CardContent>
          {campaignsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : filteredCampaigns.length > 0 ? (
            <div className="space-y-3">
              {filteredCampaigns.slice(0, 10).map((campaign) => (
                <div
                  key={campaign.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          campaign.status === "completed"
                            ? "default"
                            : campaign.status === "sending"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {campaign.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground capitalize">
                        {campaign.audience_type.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-sm mt-1 truncate">{campaign.message_body}</p>
                  </div>
                  <div className="text-right text-sm">
                    <div className="flex items-center gap-1 text-blue-600">
                      <ArrowUpRight className="h-3 w-3" />
                      {campaign.sent_count ?? 0} sent
                    </div>
                    {(campaign.failed_count ?? 0) > 0 && (
                      <div className="flex items-center gap-1 text-destructive">
                        <XCircle className="h-3 w-3" />
                        {campaign.failed_count} failed
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(campaign.created_at), "MMM d, h:mm a")}
                    </div>
                    {(campaign.failed_count ?? 0) > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          resendMutation.mutate(campaign.id);
                        }}
                        disabled={resendMutation.isPending}
                      >
                        <RefreshCw className={`h-3 w-3 mr-1 ${resendMutation.isPending ? 'animate-spin' : ''}`} />
                        Resend Failed
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No campaigns yet</p>
              <Button
                variant="link"
                onClick={() => navigate("/app/sms/send")}
                className="mt-2"
              >
                Send your first SMS
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
