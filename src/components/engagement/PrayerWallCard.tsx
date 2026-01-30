import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Heart, Plus, User, CheckCircle } from "lucide-react";
import {
  usePrayerRequests,
  useMemberPrayerInteractions,
  useAddPrayerInteraction,
  PrayerRequest,
} from "@/hooks/useEngagementData";
import { formatDistanceToNow } from "date-fns";
import { SubmitPrayerDialog } from "./SubmitPrayerDialog";

interface PrayerWallCardProps {
  memberId: string;
  churchId: string;
  branchId: string | null;
}

export function PrayerWallCard({ memberId, churchId, branchId }: PrayerWallCardProps) {
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const { data: prayerRequests, isLoading } = usePrayerRequests(memberId);
  const { data: prayedFor = [] } = useMemberPrayerInteractions(memberId);
  const addPrayer = useAddPrayerInteraction();

  const handlePray = (prayerRequestId: string) => {
    addPrayer.mutate({ prayerRequestId, memberId });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-kpi-rose/10">
                <Heart className="w-5 h-5 text-kpi-rose" />
              </div>
              <div>
                <CardTitle className="text-lg">Prayer Wall</CardTitle>
                <CardDescription>
                  Lift up our community in prayer
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSubmitDialog(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Request
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!prayerRequests || prayerRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Heart className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No prayer requests yet</p>
              <p className="text-sm">Be the first to share a prayer need</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-4">
                {prayerRequests.map((request) => (
                  <PrayerRequestItem
                    key={request.id}
                    request={request}
                    hasPrayed={prayedFor.includes(request.id)}
                    onPray={() => handlePray(request.id)}
                    isLoading={addPrayer.isPending}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <SubmitPrayerDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        memberId={memberId}
        churchId={churchId}
        branchId={branchId}
      />
    </>
  );
}

interface PrayerRequestItemProps {
  request: PrayerRequest;
  hasPrayed: boolean;
  onPray: () => void;
  isLoading: boolean;
}

function PrayerRequestItem({ request, hasPrayed, onPray, isLoading }: PrayerRequestItemProps) {
  return (
    <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {request.is_anonymous ? (
              <Badge variant="outline" className="text-xs">
                <User className="w-3 h-3 mr-1" />
                Anonymous
              </Badge>
            ) : (
              <span className="text-sm font-medium">
                {request.member?.full_name || "Member"}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed">
            {request.request_text}
          </p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Button
            variant={hasPrayed ? "secondary" : "outline"}
            size="sm"
            onClick={onPray}
            disabled={hasPrayed || isLoading}
            className="gap-1"
          >
            {hasPrayed ? (
              <>
                <CheckCircle className="w-4 h-4 text-kpi-green" />
                Prayed
              </>
            ) : (
              <>
                🙏
              </>
            )}
          </Button>
          {(request.prayer_count ?? 0) > 0 && (
            <span className="text-xs text-muted-foreground">
              {request.prayer_count} {request.prayer_count === 1 ? "prayer" : "prayers"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
