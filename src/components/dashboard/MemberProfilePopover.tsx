import { Calendar, MapPin, Phone, Mail, User, Briefcase, Heart, Clock, Tag } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface MemberDetails {
  id: string;
  fullName: string;
  photo?: string | null;
  phone?: string | null;
  email?: string | null;
  memberStatus?: string | null;
  memberType?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  maritalStatus?: string | null;
  occupation?: string | null;
  residentialArea?: string | null;
  areaZone?: string | null;
  dateJoined?: string | null;
  branchName?: string;
}

interface MemberProfilePopoverProps {
  member: MemberDetails;
  children: React.ReactNode;
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

function getStatusVariant(status?: string | null): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "member":
      return "default";
    case "visitor":
      return "secondary";
    case "first_timer":
      return "destructive";
    default:
      return "secondary";
  }
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

export function MemberProfilePopover({ member, children }: MemberProfilePopoverProps) {
  const age = member.dateOfBirth
    ? Math.floor((Date.now() - new Date(member.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="cursor-pointer hover:opacity-80 transition-opacity text-left">
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        align="start"
        side="right"
        sideOffset={8}
      >
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-14 w-14 ring-2 ring-background shadow-lg">
              {member.photo ? (
                <AvatarImage src={member.photo} alt={member.fullName} />
              ) : null}
              <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                {getInitials(member.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-base truncate">{member.fullName}</h4>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant={getStatusVariant(member.memberStatus)} className="text-xs">
                  {formatLabel(member.memberStatus)}
                </Badge>
                {member.memberType && (
                  <Badge variant="outline" className="text-xs">
                    {formatLabel(member.memberType)}
                  </Badge>
                )}
              </div>
              {member.branchName && (
                <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {member.branchName}
                </p>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Contact Info */}
        <div className="p-4 space-y-3">
          {(member.phone || member.email) && (
            <>
              <div className="space-y-2">
                {member.phone && (
                  <a 
                    href={`tel:${member.phone}`}
                    className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                  >
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{member.phone}</span>
                  </a>
                )}
                {member.email && (
                  <a 
                    href={`mailto:${member.email}`}
                    className="flex items-center gap-2 text-sm hover:text-primary transition-colors truncate"
                  >
                    <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{member.email}</span>
                  </a>
                )}
              </div>
              <Separator />
            </>
          )}

          {/* Personal Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            <InfoRow
              icon={User}
              label="Gender"
              value={formatLabel(member.gender)}
            />
            <InfoRow
              icon={Calendar}
              label="Age"
              value={age ? `${age} years` : null}
            />
            <InfoRow
              icon={Heart}
              label="Marital Status"
              value={formatLabel(member.maritalStatus)}
            />
            <InfoRow
              icon={Briefcase}
              label="Occupation"
              value={formatLabel(member.occupation)}
            />
          </div>

          {/* Location */}
          {(member.residentialArea || member.areaZone) && (
            <>
              <Separator />
              <InfoRow
                icon={MapPin}
                label="Location"
                value={[member.residentialArea, member.areaZone].filter(Boolean).join(", ")}
              />
            </>
          )}

          {/* Member Since */}
          {member.dateJoined && (
            <>
              <Separator />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>Member since {format(new Date(member.dateJoined), "MMM yyyy")}</span>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
