import { useState } from "react";
import { Link } from "react-router-dom";
import { Phone, MapPin, ExternalLink, Calendar, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { FollowUpPerson, FollowUpPersonType } from "@/hooks/useNewPeopleToFollowUp";
import { FollowUpSMSDialog } from "./FollowUpSMSDialog";

interface FollowUpDetailDrawerProps {
  person: FollowUpPerson | null;
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

function getTypeConfig(type: FollowUpPersonType, metadata?: FollowUpPerson['metadata']) {
  switch (type) {
    case 'first_time_visitor':
      return {
        label: "First-time Guest",
        className: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
        description: "This is their first visit to the church"
      };
    case 'returning_visitor':
      return {
        label: metadata?.previousVisits ? `Returning Guest (${metadata.previousVisits} prior visits)` : "Returning Guest",
        className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
        description: "They have visited before and came back again"
      };
    case 'returnee':
      return {
        label: "Returnee",
        className: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30",
        description: metadata?.missedCount 
          ? `Missed ${metadata.missedCount} previous services but came back` 
          : "Missed several services but came back"
      };
    case 'missed_3_plus':
      return {
        label: "Needs Follow-up",
        className: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
        description: metadata?.missedCount 
          ? `Has missed ${metadata.missedCount} consecutive services` 
          : "Has missed 3+ consecutive services"
      };
    default:
      return {
        label: "Unknown",
        className: "bg-muted text-muted-foreground",
        description: ""
      };
  }
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value) return null;
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

export function FollowUpDetailDrawer({ person, open, onOpenChange }: FollowUpDetailDrawerProps) {
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);

  if (!person) return null;

  const typeConfig = getTypeConfig(person.type, person.metadata);
  const isVisitor = person.type === 'first_time_visitor' || person.type === 'returning_visitor';
  const profileUrl = isVisitor ? `/app/visitors/${person.id}` : `/app/members/${person.id}`;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="text-left pb-4">
            <SheetTitle className="sr-only">Follow-up Details</SheetTitle>
            
            {/* Profile Header */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 ring-2 ring-background shadow-lg">
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-lg">
                  {getInitials(person.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-lg truncate">{person.name}</h2>
                <Badge 
                  variant="outline" 
                  className={`text-xs mt-1 ${typeConfig.className}`}
                >
                  {typeConfig.label}
                </Badge>
              </div>
            </div>
          </SheetHeader>

          <Separator className="my-4" />

          {/* Status Description */}
          <div className="p-3 rounded-lg bg-muted/30 mb-4">
            <p className="text-sm text-muted-foreground">{typeConfig.description}</p>
          </div>

          {/* Contact Info */}
          <div className="space-y-1">
            <InfoRow icon={Phone} label="Phone" value={person.phone} />
            <InfoRow icon={MapPin} label="Branch" value={person.branchName} />
            {person.metadata?.firstVisitDate && (
              <InfoRow icon={Calendar} label="First Visit" value={person.metadata.firstVisitDate} />
            )}
          </div>

          <Separator className="my-4" />

          {/* Actions */}
          <div className="space-y-3">
            {person.phone && (
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2"
                onClick={() => setSmsDialogOpen(true)}
              >
                <MessageSquare className="h-4 w-4" />
                Send SMS
              </Button>
            )}
            
            <Button asChild className="w-full justify-start gap-2">
              <Link to={profileUrl}>
                <ExternalLink className="h-4 w-4" />
                View Full Profile
              </Link>
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {person && (
        <FollowUpSMSDialog
          open={smsDialogOpen}
          onOpenChange={setSmsDialogOpen}
          person={person}
        />
      )}
    </>
  );
}
