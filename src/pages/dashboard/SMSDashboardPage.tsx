import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  MessageSquare,
  Send,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSMSCampaigns } from "@/hooks/useSMSData";

export default function SMSDashboardPage() {
  const navigate = useNavigate();
  const { data: campaigns, isLoading: campaignsLoading } = useSMSCampaigns();

  // Calculate stats
  const totalSent = campaigns?.reduce((sum, c) => sum + (c.sent_count || 0), 0) ?? 0;
  const totalFailed = campaigns?.reduce((sum, c) => sum + (c.failed_count || 0), 0) ?? 0;
  const totalCampaigns = campaigns?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">SMS Dashboard</h1>
          <p className="text-muted-foreground">Manage your SMS campaigns</p>
        </div>
        <Button onClick={() => navigate("/app/sms/send")}>
          <Send className="h-4 w-4 mr-2" />
          Send SMS
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
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
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        {/* Messages Sent */}
        <Card className="border border-border border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-500/5 to-transparent hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
            <div className="p-2.5 rounded-xl bg-emerald-500/10">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            {campaignsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-emerald-600">{totalSent}</div>
            )}
            <p className="text-xs text-muted-foreground">Successfully delivered</p>
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
            {campaignsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-rose-600">{totalFailed}</div>
            )}
            <p className="text-xs text-muted-foreground">Failed to send</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {campaignsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : campaigns && campaigns.length > 0 ? (
            <div className="space-y-3">
              {campaigns.slice(0, 10).map((campaign) => (
                <div
                  key={campaign.id}
                  className="flex items-center gap-4 p-4 border rounded-lg"
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
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      {campaign.sent_count ?? 0}
                    </div>
                    {(campaign.failed_count ?? 0) > 0 && (
                      <div className="flex items-center gap-1 text-destructive">
                        <XCircle className="h-3 w-3" />
                        {campaign.failed_count}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(campaign.created_at), "MMM d, h:mm a")}
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
