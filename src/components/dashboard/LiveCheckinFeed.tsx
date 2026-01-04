import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Activity, Radio, Clock, ChevronRight, ChevronDown, 
  Smartphone, QrCode, Zap, Filter, Building2 
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  useLiveCheckinFeed,
  formatCheckinTime,
  getInitials,
  formatStatusLabel,
  FeedMode,
  CheckinFeedItem,
} from "@/hooks/useLiveCheckinFeed";
import { EmptyState } from "./DashboardCards";
import { CheckinDetailDrawer } from "./CheckinDetailDrawer";
import { useBranches } from "@/hooks/useChurchData";
import { useTodayServices, useRecentServices } from "@/hooks/useDashboardData";
import { format, parseISO, isToday } from "date-fns";

interface LiveCheckinFeedProps {
  branchId?: string;
  maxItems?: number;
}

// Helper to format service display name with differentiation
function formatServiceDisplay(service: any): string {
  const parts: string[] = [service.name];
  
  // Add time if available
  if (service.start_time) {
    parts.push(`@ ${service.start_time.slice(0, 5)}`);
  }
  
  // Add date if not today
  if (service.service_date) {
    const serviceDate = parseISO(service.service_date);
    if (!isToday(serviceDate)) {
      parts.push(`• ${format(serviceDate, "MMM d")}`);
    }
  }
  
  return parts.join(" ");
}

// Status color mappings for consistent branding
function getStatusStyles(status: string): { bg: string; text: string; border: string } {
  switch (status) {
    case "first_timer":
      return { 
        bg: "bg-amber-500/10", 
        text: "text-amber-700 dark:text-amber-400", 
        border: "border-amber-500/30" 
      };
    case "visitor":
      return { 
        bg: "bg-blue-500/10", 
        text: "text-blue-700 dark:text-blue-400", 
        border: "border-blue-500/30" 
      };
    default: // member
      return { 
        bg: "bg-emerald-500/10", 
        text: "text-emerald-700 dark:text-emerald-400", 
        border: "border-emerald-500/30" 
      };
  }
}

// Branch color palette for consistent branch badges
const BRANCH_COLORS = [
  "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30",
  "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30",
  "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30",
  "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30",
  "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/30",
];

function getBranchColor(branchId: string): string {
  const hash = branchId.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
  return BRANCH_COLORS[hash % BRANCH_COLORS.length];
}

interface FeedItemProps {
  item: CheckinFeedItem;
  index: number;
  onClick: () => void;
}

function FeedItem({ item, index, onClick }: FeedItemProps) {
  const { relative, exact } = formatCheckinTime(item.checkedInAt);
  const statusStyles = getStatusStyles(item.memberStatus);
  const branchColor = getBranchColor(item.branchId);
  const [showNewBadge, setShowNewBadge] = useState(item.isNew);

  // Hide NEW badge after 10 seconds
  useEffect(() => {
    if (item.isNew) {
      setShowNewBadge(true);
      const timer = setTimeout(() => setShowNewBadge(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [item.isNew]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.02 }}
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-300",
        "hover:bg-muted/60 hover:shadow-md",
        item.isNew && "bg-primary/5 ring-1 ring-primary/20 shadow-sm shadow-primary/10"
      )}
    >
      {/* Live indicator pulse for new items */}
      {item.isNew && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
          </span>
        </div>
      )}

      {/* Avatar */}
      <div className={cn("relative", item.isNew && "ml-3")}>
        <Avatar className="h-12 w-12 ring-2 ring-background shadow-sm group-hover:ring-primary/20 transition-all">
          {item.memberPhoto ? (
            <AvatarImage src={item.memberPhoto} alt={item.memberName} className="object-cover" />
          ) : null}
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-sm">
            {getInitials(item.memberName)}
          </AvatarFallback>
        </Avatar>
        
        {/* Method indicator */}
        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-background border-2 border-background shadow flex items-center justify-center">
          {item.checkinMethod === "self_scan" ? (
            <Smartphone className="h-3 w-3 text-muted-foreground" />
          ) : (
            <QrCode className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
            {item.memberName}
          </span>
          {showNewBadge && (
            <Badge className="bg-primary/20 text-primary border-0 text-[10px] px-1.5 py-0 h-4 font-medium animate-pulse">
              NEW
            </Badge>
          )}
        </div>
        
        {/* Badges row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge 
            variant="outline" 
            className={cn("text-[10px] px-2 py-0.5 h-5 font-medium border", statusStyles.bg, statusStyles.text, statusStyles.border)}
          >
            {formatStatusLabel(item.memberStatus)}
          </Badge>
          <Badge 
            variant="outline" 
            className={cn("text-[10px] px-2 py-0.5 h-5 font-medium border", branchColor)}
          >
            {item.branchName}
          </Badge>
          <span className="text-[10px] text-muted-foreground hidden sm:inline-flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
            {item.serviceName}
          </span>
        </div>
      </div>

      {/* Time column */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span title={`Checked in at ${exact}`}>{relative}</span>
        </div>
        <span className="text-[10px] text-muted-foreground">{exact}</span>
      </div>

      {/* Hover arrow indicator */}
      <ChevronRight className="h-4 w-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </motion.div>
  );
}

function FeedSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-muted/30">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-36" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LiveCheckinFeed({ branchId: initialBranchId, maxItems = 20 }: LiveCheckinFeedProps) {
  const [mode, setMode] = useState<FeedMode>("today");
  const [branchFilter, setBranchFilter] = useState<string | undefined>(initialBranchId);
  const [serviceFilter, setServiceFilter] = useState<string | undefined>();
  const [selectedItem, setSelectedItem] = useState<CheckinFeedItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [displayCount, setDisplayCount] = useState(maxItems);

  const { items: rawItems, isLoading, error } = useLiveCheckinFeed(mode, branchFilter);
  const { data: branches } = useBranches();
  const { data: todayServices } = useTodayServices(branchFilter);
  const { data: recentServices } = useRecentServices(branchFilter);

  // Combine and dedupe services
  const services = [...(todayServices || []), ...(recentServices || [])].filter(
    (s, i, a) => a.findIndex(x => x.id === s.id) === i
  );

  // Filter items by selected service
  const items = serviceFilter 
    ? rawItems.filter(item => item.serviceId === serviceFilter)
    : rawItems;

  const displayItems = items.slice(0, displayCount);
  const hasMore = items.length > displayCount;
  const totalCount = items.length;

  const handleItemClick = (item: CheckinFeedItem) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  const loadMore = () => {
    setDisplayCount((prev) => Math.min(prev + 20, 50));
  };

  // Build analytics link based on mode
  const getViewAllLink = () => {
    const params = new URLSearchParams();
    if (mode === "today") params.set("period", "today");
    else if (mode === "last_24h") params.set("period", "last_24h");
    if (branchFilter) params.set("branch", branchFilter);
    if (serviceFilter) params.set("service", serviceFilter);
    return `/app/analytics/attendance?${params.toString()}`;
  };

  return (
    <>
      <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-b from-card to-card/95">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                <Activity className="h-5 w-5 text-primary" />
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
              </div>
              <div>
                <h3 className="font-bold text-lg">Live Check-ins</h3>
                <p className="text-sm text-muted-foreground">Real-time arrivals across branches</p>
              </div>
            </div>

            <Link to={getViewAllLink()}>
              <Button variant="ghost" size="sm" className="text-xs gap-1 -mr-2">
                View all <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          {/* Filters row */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Mode filter */}
            <Select value={mode} onValueChange={(v) => setMode(v as FeedMode)}>
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <SelectValue placeholder="Time filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="open_service">Open Service</SelectItem>
                <SelectItem value="last_24h">Last 24 Hours</SelectItem>
              </SelectContent>
            </Select>

            {/* Branch filter */}
            {branches && branches.length > 1 && (
              <Select value={branchFilter || "all"} onValueChange={(v) => setBranchFilter(v === "all" ? undefined : v)}>
                <SelectTrigger className="w-[160px] h-9 text-xs">
                  <Building2 className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="All branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Service filter */}
            {services.length > 0 && (
              <Select value={serviceFilter || "all"} onValueChange={(v) => setServiceFilter(v === "all" ? undefined : v)}>
                <SelectTrigger className="w-[200px] h-9 text-xs">
                  <Clock className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="All services" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {formatServiceDisplay(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Live indicator */}
            <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-green-500" />
                <span className="hidden sm:inline">Live updates</span>
              </span>
              {totalCount > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5">
                  {totalCount} check-in{totalCount !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Feed content */}
        <CardContent className="px-4 pb-4">
          {isLoading ? (
            <FeedSkeleton count={5} />
          ) : error ? (
            <div className="py-12">
              <EmptyState 
                icon={Activity} 
                title="Unable to load feed" 
                description="There was an error fetching check-in data" 
              />
            </div>
          ) : displayItems.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={Radio}
                title="No check-ins yet"
                description={
                  mode === "today"
                    ? "Check-ins will appear here as members arrive"
                    : mode === "open_service"
                    ? "No active service check-ins found"
                    : "No check-ins in the last 24 hours"
                }
              />
            </div>
          ) : (
            <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {displayItems.map((item, index) => (
                  <FeedItem 
                    key={item.id} 
                    item={item} 
                    index={index} 
                    onClick={() => handleItemClick(item)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Load more / Footer */}
          {!isLoading && displayItems.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border/50">
              {hasMore ? (
                <Button 
                  variant="ghost" 
                  className="w-full text-sm text-muted-foreground hover:text-foreground"
                  onClick={loadMore}
                >
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Load more ({items.length - displayCount} remaining)
                </Button>
              ) : (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
                  <Radio className="h-3.5 w-3.5 text-green-500 animate-pulse" />
                  <span>Watching for new check-ins</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Member Detail Drawer */}
      <CheckinDetailDrawer 
        item={selectedItem}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </>
  );
}
