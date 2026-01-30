import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Eye, Heart, Share2, Bookmark, Sun, TrendingUp, Users } from "lucide-react";
import { format } from "date-fns";
import { useAdminContentEngagement, useAdminContentStats } from "@/hooks/useAdminEngagementData";

const interactionIcons = {
  view: Eye,
  like: Heart,
  share: Share2,
  bookmark: Bookmark,
};

const interactionColors = {
  view: "bg-blue-500/15 text-blue-600",
  like: "bg-rose-500/15 text-rose-600",
  share: "bg-violet-500/15 text-violet-600",
  bookmark: "bg-amber-500/15 text-amber-600",
};

export function ContentEngagementTab() {
  const { data: engagements, isLoading: engagementsLoading } = useAdminContentEngagement();
  const { data: stats, isLoading: statsLoading } = useAdminContentStats();

  const isLoading = engagementsLoading || statsLoading;

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Eye className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.views || 0}</p>
                <p className="text-sm text-muted-foreground">Total Views</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-500/10">
                <Heart className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.likes || 0}</p>
                <p className="text-sm text-muted-foreground">Total Likes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/10">
                <Share2 className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.shares || 0}</p>
                <p className="text-sm text-muted-foreground">Total Shares</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Users className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.uniqueMembers || 0}</p>
                <p className="text-sm text-muted-foreground">Active Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Content */}
      {stats?.topContent && stats.topContent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-kpi-purple" />
              Top Performing Content
            </CardTitle>
            <CardDescription>Most engaged content this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topContent.map((content, index) => (
                <div key={content.id} className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{content.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(content.publish_date), "MMM d, yyyy")}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" /> {content.views}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-4 h-4" /> {content.likes}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Engagements */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Engagements</CardTitle>
          <CardDescription>
            Track how members interact with your daily content
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!engagements || engagements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Sun className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No engagements yet</p>
              <p className="text-sm">Member interactions with content will appear here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {engagements.map((engagement) => {
                  const Icon = interactionIcons[engagement.interaction_type as keyof typeof interactionIcons] || Eye;
                  const colorClass = interactionColors[engagement.interaction_type as keyof typeof interactionColors] || interactionColors.view;

                  return (
                    <TableRow key={engagement.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {getInitials(engagement.member_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{engagement.member_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <div className="font-medium truncate">{engagement.content_title}</div>
                          <div className="text-sm text-muted-foreground">
                            {engagement.content_type}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={colorClass}>
                          <Icon className="w-3 h-3 mr-1" />
                          {engagement.interaction_type.charAt(0).toUpperCase() + engagement.interaction_type.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(engagement.created_at), "MMM d, h:mm a")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
