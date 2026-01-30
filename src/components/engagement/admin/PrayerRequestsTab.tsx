import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Heart, MoreHorizontal, CheckCircle, Archive, Eye, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  useAdminPrayerRequests,
  useUpdatePrayerRequest,
} from "@/hooks/useAdminEngagementData";

export function PrayerRequestsTab() {
  const { data: requests, isLoading } = useAdminPrayerRequests();
  const updateRequest = useUpdatePrayerRequest();

  const handleMarkAnswered = (id: string) => {
    updateRequest.mutate({ id, is_answered: true, status: "answered" });
  };

  const handleArchive = (id: string) => {
    updateRequest.mutate({ id, status: "archived" });
  };

  const handleMakePublic = (id: string, isPublic: boolean) => {
    updateRequest.mutate({ id, is_public: isPublic });
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

  const activeRequests = requests?.filter((r) => r.status === "active") || [];
  const answeredRequests = requests?.filter((r) => r.status === "answered") || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Active Prayer Requests</CardTitle>
          <CardDescription>
            Review and manage prayer requests from members
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Heart className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No active prayer requests</p>
              <p className="text-sm">Requests from members will appear here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="max-w-[300px]">
                      <p className="line-clamp-2">{request.request_text}</p>
                    </TableCell>
                    <TableCell>
                      {request.is_anonymous ? (
                        <Badge variant="outline">
                          <User className="w-3 h-3 mr-1" />
                          Anonymous
                        </Badge>
                      ) : (
                        <span className="text-sm">
                          {request.member?.full_name || "Unknown"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={request.is_public ? "default" : "secondary"}>
                        {request.is_public ? "Public" : "Private"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleMarkAnswered(request.id)}>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Mark as Answered
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleMakePublic(request.id, !request.is_public)}>
                            <Eye className="w-4 h-4 mr-2" />
                            {request.is_public ? "Make Private" : "Make Public"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleArchive(request.id)}>
                            <Archive className="w-4 h-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {answeredRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-kpi-green" />
              Answered Prayers
            </CardTitle>
            <CardDescription>
              Testimonies of answered prayers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Answered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {answeredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="max-w-[300px]">
                      <p className="line-clamp-2">{request.request_text}</p>
                    </TableCell>
                    <TableCell>
                      {request.is_anonymous ? "Anonymous" : request.member?.full_name || "Unknown"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {request.answered_at
                        ? formatDistanceToNow(new Date(request.answered_at), { addSuffix: true })
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
