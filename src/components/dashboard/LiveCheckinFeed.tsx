import { useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Radio, Clock, ChevronRight, User } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  useLiveCheckinFeed,
  formatCheckinTime,
  getInitials,
  getStatusVariant,
  formatStatusLabel,
  FeedMode,
  CheckinFeedItem,
} from "@/hooks/useLiveCheckinFeed";
import { SectionHeader, EmptyState } from "./DashboardCards";
import { MemberProfilePopover } from "./MemberProfilePopover";

interface LiveCheckinFeedProps {
  branchId?: string;
  maxItems?: number;
}

function FeedItem({ item, index }: { item: CheckinFeedItem; index: number }) {
  const { relative, exact } = formatCheckinTime(item.checkedInAt);

  const memberDetails = {
    id: item.memberId,
    fullName: item.memberName,
    photo: item.memberPhoto,
    phone: item.memberPhone,
    email: item.memberEmail,
    memberStatus: item.memberStatus,
    memberType: item.memberType,
    gender: item.memberGender,
    dateOfBirth: item.memberDateOfBirth,
    maritalStatus: item.memberMaritalStatus,
    occupation: item.memberOccupation,
    residentialArea: item.memberResidentialArea,
    areaZone: item.memberAreaZone,
    dateJoined: item.memberDateJoined,
    branchName: item.branchName,
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg transition-all duration-500",
        item.isNew 
          ? "bg-primary/10 ring-1 ring-primary/30 animate-pulse" 
          : "bg-muted/30 hover:bg-muted/50"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Avatar & Name - Clickable for profile */}
      <MemberProfilePopover member={memberDetails}>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 flex-shrink-0">
            {item.memberPhoto ? (
              <AvatarImage src={item.memberPhoto} alt={item.memberName} />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {getInitials(item.memberName)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate hover:text-primary transition-colors">
                {item.memberName}
              </span>
              {item.isNew && (
                <span className="flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">checked in</p>
          </div>
        </div>
      </MemberProfilePopover>

      {/* Service info */}
      <div className="flex-1 min-w-0 hidden sm:block">
        <p className="text-xs text-muted-foreground truncate">
          {item.branchName} • {item.serviceName}
        </p>
      </div>

      {/* Right side: time & badge */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span title={exact}>{relative}</span>
        </div>
        <Badge 
          variant={getStatusVariant(item.memberStatus)} 
          className="text-[10px] px-1.5 py-0"
        >
          {formatStatusLabel(item.memberStatus)}
        </Badge>
      </div>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="flex flex-col items-end gap-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LiveCheckinFeed({ branchId, maxItems = 10 }: LiveCheckinFeedProps) {
  const [mode, setMode] = useState<FeedMode>("today");
  const { items, isLoading, error } = useLiveCheckinFeed(mode, branchId);

  const displayItems = items.slice(0, maxItems);
  const hasMore = items.length > maxItems;

  // Build analytics link based on mode
  const getViewAllLink = () => {
    const params = new URLSearchParams();
    if (mode === "today") params.set("period", "today");
    else if (mode === "last_24h") params.set("period", "last_24h");
    if (branchId) params.set("branch", branchId);
    return `/app/analytics/attendance?${params.toString()}`;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Activity className="h-5 w-5 text-primary" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-sm">Live Check-in Activity</h3>
              <p className="text-xs text-muted-foreground">Real-time arrivals</p>
            </div>
          </div>
          {hasMore && (
            <Link to={getViewAllLink()}>
              <Button variant="ghost" size="sm" className="text-xs">
                View all <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>

      <div className="px-4 pb-2">
        <Tabs value={mode} onValueChange={(v) => setMode(v as FeedMode)}>
          <TabsList className="h-8 w-full grid grid-cols-3">
            <TabsTrigger value="today" className="text-xs py-1">Today</TabsTrigger>
            <TabsTrigger value="open_service" className="text-xs py-1">Open Service</TabsTrigger>
            <TabsTrigger value="last_24h" className="text-xs py-1">Last 24h</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <CardContent className="pt-2">
        {isLoading ? (
          <FeedSkeleton />
        ) : error ? (
          <EmptyState 
            icon={Activity} 
            title="Error loading feed" 
            description="Unable to fetch check-in data" 
          />
        ) : displayItems.length === 0 ? (
          <EmptyState
            icon={Radio}
            title="No check-ins yet"
            description={
              mode === "today"
                ? "Check-ins will appear here as members arrive"
                : mode === "open_service"
                ? "No open service check-ins found"
                : "No check-ins in the last 24 hours"
            }
          />
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {displayItems.map((item, index) => (
              <FeedItem key={item.id} item={item} index={index} />
            ))}
          </div>
        )}

        {!isLoading && displayItems.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Radio className="h-3 w-3 text-green-500" />
              Live updates enabled
            </span>
            <span>{items.length} check-in{items.length !== 1 ? "s" : ""}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
