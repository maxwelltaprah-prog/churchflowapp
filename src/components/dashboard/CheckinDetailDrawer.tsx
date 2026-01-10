import { Link } from "react-router-dom";
import { 
  Calendar, MapPin, Phone, Mail, User, Briefcase, Heart, Clock, 
  ExternalLink, History, QrCode, Smartphone, Building2
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { format } from "date-fns";
import { CheckinFeedItem, formatCheckinTime } from "@/hooks/useLiveCheckinFeed";

interface CheckinDetailDrawerProps {
  item: CheckinFeedItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getStatusColor(status?: string | null): string {
  switch (status) {
    case "active":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
    case "inactive":
      return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
    case "transferred":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value || value === "—") return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium text-sm truncate">{value}</p>
      </div>
    </div>
  );
}

export function CheckinDetailDrawer({ item, open, onOpenChange }: CheckinDetailDrawerProps) {
  if (!item) return null;

  const { relative, exact } = formatCheckinTime(item.checkedInAt);
  const checkinDate = new Date(item.checkedInAt);
  const age = item.memberDateOfBirth
    ? Math.floor((Date.now() - new Date(item.memberDateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const isToday = new Date().toDateString() === checkinDate.toDateString();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 overflow-y-auto">
        {/* Header with gradient background */}
        <div className="relative bg-gradient-to-br from-primary/15 via-primary/5 to-transparent px-6 pt-8 pb-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
          
          <SheetHeader className="relative">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 ring-4 ring-background shadow-xl">
                {item.memberPhoto ? (
                  <AvatarImage src={item.memberPhoto} alt={item.memberName} />
                ) : null}
                <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                  {getInitials(item.memberName)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0 pt-1">
                <SheetTitle className="text-xl font-bold truncate text-left">
                  {item.memberName}
                </SheetTitle>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge className={`${getStatusColor(item.memberStatus)} border text-xs font-medium`}>
                    {formatLabel(item.memberStatus)}
                  </Badge>
                  {item.memberType && (
                    <Badge variant="outline" className="text-xs">
                      {formatLabel(item.memberType)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Check-in Details Card */}
        <div className="px-6 -mt-2">
          <div className="bg-card border rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-foreground">Check-in Details</h4>
              {isToday && (
                <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-700 dark:text-green-400">
                  Today
                </Badge>
              )}
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Time</p>
                  <p className="font-medium text-sm">{exact} <span className="text-muted-foreground">({relative})</span></p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Branch & Service</p>
                  <p className="font-medium text-sm truncate">{item.branchName}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.serviceName}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  {item.checkinMethod === "self_scan" ? (
                    <Smartphone className="h-4 w-4 text-primary" />
                  ) : (
                    <QrCode className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Method</p>
                  <p className="font-medium text-sm">
                    {item.checkinMethod === "self_scan" ? "Self Check-in (QR)" : "Staff Scan"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        {(item.memberPhone || item.memberEmail) && (
          <div className="px-6 mt-4">
            <h4 className="text-sm font-semibold text-foreground mb-2">Contact</h4>
            <div className="space-y-1">
              {item.memberPhone && (
                <a 
                  href={`tel:${item.memberPhone}`}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Phone className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-sm font-medium">{item.memberPhone}</span>
                </a>
              )}
              {item.memberEmail && (
                <a 
                  href={`mailto:${item.memberEmail}`}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Mail className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-sm font-medium truncate">{item.memberEmail}</span>
                </a>
              )}
            </div>
          </div>
        )}

        <Separator className="my-4" />

        {/* Personal Info */}
        <div className="px-6">
          <h4 className="text-sm font-semibold text-foreground mb-2">Personal Info</h4>
          <div className="grid grid-cols-2 gap-x-4">
            <InfoRow icon={User} label="Gender" value={formatLabel(item.memberGender)} />
            <InfoRow icon={Calendar} label="Age" value={age ? `${age} years` : null} />
            <InfoRow icon={Heart} label="Marital Status" value={formatLabel(item.memberMaritalStatus)} />
            <InfoRow icon={Briefcase} label="Occupation" value={formatLabel(item.memberOccupation)} />
          </div>
          
          {(item.memberResidentialArea || item.memberAreaZone) && (
            <InfoRow 
              icon={MapPin} 
              label="Location" 
              value={[item.memberResidentialArea, item.memberAreaZone].filter(Boolean).join(", ")} 
            />
          )}

          {item.memberDateJoined && (
            <div className="flex items-center gap-2 mt-3 py-2 px-3 rounded-lg bg-muted/30">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Member since {format(new Date(item.memberDateJoined), "MMMM yyyy")}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-6 mt-4 border-t bg-muted/20">
          <div className="grid grid-cols-2 gap-3">
            <Link 
              to={item.isVisitor ? `/app/visitors/${item.memberId}` : `/app/members/${item.memberId}`} 
              onClick={() => onOpenChange(false)}
            >
              <Button variant="outline" className="w-full h-11" size="sm">
                <User className="h-4 w-4 mr-2" />
                View Profile
              </Button>
            </Link>
            <Link 
              to={item.isVisitor ? `/app/visitors/${item.memberId}#checkins` : `/app/members/${item.memberId}#attendance`} 
              onClick={() => onOpenChange(false)}
            >
              <Button variant="outline" className="w-full h-11" size="sm">
                <History className="h-4 w-4 mr-2" />
                {item.isVisitor ? "Check-ins" : "Attendance"}
              </Button>
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
