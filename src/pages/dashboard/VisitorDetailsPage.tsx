import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Edit, 
  Phone, 
  UserPlus, 
  MessageSquare, 
  Trash2, 
  Calendar, 
  Info, 
  Clock,
  MapPin,
  Plus,
  QrCode,
  ClipboardList
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useVisitor, useVisitorFollowups, useVisitorCheckinHistory } from "@/hooks/useVisitorsData";
import { useDeleteVisitor, useDeleteFollowup } from "@/hooks/useVisitorMutations";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SendVisitorSMSDialog } from "@/components/visitors/SendVisitorSMSDialog";

const howHeardLabels: Record<string, string> = {
  friend_family: "Family",
  social_media: "Social Media",
  walk_in: "Walk-in",
  outreach: "Outreach",
  other: "Other",
};

const followupTypeLabels: Record<string, string> = {
  sms: "Sms Follow-up",
  phone_call: "Phone Call Follow-up",
  visit: "Visit Follow-up",
  other: "Other Follow-up",
};

const statusConfig = {
  new: { label: "New", className: "bg-orange-100 text-orange-800" },
  in_follow_up: { label: "In follow up", className: "bg-yellow-100 text-yellow-800" },
  converted: { label: "Converted", className: "bg-green-100 text-green-800" },
};

export default function VisitorDetailsPage() {
  const { visitorId } = useParams();
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showSMSDialog, setShowSMSDialog] = useState(false);
  const [deletingFollowupId, setDeletingFollowupId] = useState<string | null>(null);

  const { data: visitor, isLoading } = useVisitor(visitorId);
  const { data: followups } = useVisitorFollowups(visitorId);
  const { data: checkinHistory } = useVisitorCheckinHistory(visitorId);
  const deleteVisitor = useDeleteVisitor();
  const deleteFollowup = useDeleteFollowup();

  const handleDelete = async () => {
    if (!visitor) return;
    await deleteVisitor.mutateAsync(visitor.id);
    navigate("/app/visitors");
  };

  const handleConvert = () => {
    if (!visitor) return;
    // Navigate to member registration page with visitor data pre-filled
    const visitorData = {
      first_name: visitor.first_name,
      last_name: visitor.last_name,
      phone: visitor.phone,
      email: visitor.email || "",
      gender: visitor.gender || "",
      date_of_birth: visitor.date_of_birth || "",
      how_heard: visitor.how_heard,
      branch_id: visitor.branch_id,
      address: visitor.address || "",
      visitor_id: visitor.id,
    };
    navigate(`/app/members/new?from_visitor=${encodeURIComponent(JSON.stringify(visitorData))}`);
  };

  const handleDeleteFollowup = async () => {
    if (!deletingFollowupId) return;
    await deleteFollowup.mutateAsync(deletingFollowupId);
    setDeletingFollowupId(null);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12">Loading...</div>;
  }

  if (!visitor) {
    return <div className="text-center py-12">Visitor not found</div>;
  }

  const isConverted = visitor.status === "converted";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Visitor Details</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            First visit: {format(new Date(visitor.first_visit_date), "MMMM d, yyyy")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate("/app/visitors")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Visitors
          </Button>
          <Button variant="outline" onClick={() => navigate(`/app/visitors/${visitor.id}/edit`)} className="gap-2">
            <Edit className="w-4 h-4" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visitor Information Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Visitor Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Profile Header */}
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-xl font-semibold">
                {getInitials(visitor.first_name, visitor.last_name)}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{visitor.first_name} {visitor.last_name}</h2>
                <Badge className={statusConfig[visitor.status].className}>
                  {statusConfig[visitor.status].label}
                </Badge>
              </div>
            </div>

            {/* Contact and Visit Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Contact Information</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{visitor.phone}</span>
                  </div>
                  {visitor.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <span>{visitor.address}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Visit Information</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span><strong>First Visit:</strong> {format(new Date(visitor.first_visit_date), "MMMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-muted-foreground" />
                    <span><strong>Heard From:</strong> {howHeardLabels[visitor.how_heard]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span><strong>Registered:</strong> {format(new Date(visitor.created_at), "MMMM d, yyyy")}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Primary Actions */}
            {!isConverted && (
              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  onClick={() => setShowConvertDialog(true)} 
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  <UserPlus className="w-4 h-4" />
                  Convert to Member
                </Button>
                <Button 
                  variant="secondary"
                  onClick={() => navigate(`/app/visitors/${visitor.id}/followup`)} 
                  className="gap-2 bg-yellow-500 hover:bg-yellow-600 text-white"
                >
                  <Phone className="w-4 h-4" />
                  Add Follow-up
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              onClick={() => navigate(`/app/visitors/${visitor.id}/edit`)}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Edit className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-blue-900">Edit Visitor</p>
                <p className="text-sm text-blue-700">Update visitor information</p>
              </div>
            </button>

            {!isConverted && (
              <>
                <button
                  onClick={() => navigate(`/app/visitors/${visitor.id}/followup`)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-yellow-50 hover:bg-yellow-100 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium text-yellow-900">Add Follow-up</p>
                    <p className="text-sm text-yellow-700">Record a follow-up interaction</p>
                  </div>
                </button>

                <button
                  onClick={() => setShowConvertDialog(true)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-900">Convert to Member</p>
                    <p className="text-sm text-green-700">Register as a church member</p>
                  </div>
                </button>

                <button
                  onClick={() => setShowSMSDialog(true)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-purple-900">Send SMS</p>
                    <p className="text-sm text-purple-700">Send a text message to this visitor</p>
                  </div>
                </button>
              </>
            )}

            <button
              onClick={() => setShowDeleteDialog(true)}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-red-50 hover:bg-red-100 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-medium text-red-900">Delete Visitor</p>
                <p className="text-sm text-red-700">Permanently remove this visitor</p>
              </div>
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Follow-up History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Follow-up History</CardTitle>
          {!isConverted && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/app/visitors/${visitor.id}/followup`)}
              className="gap-1 text-green-600"
            >
              <Plus className="w-4 h-4" />
              Add New
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {followups?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No follow-ups recorded yet</p>
          ) : (
            <div className="space-y-4">
              {followups?.map((followup) => (
                <div key={followup.id} className="flex items-start gap-4 border-l-4 border-yellow-400 pl-4 py-2">
                  <div className="flex-1">
                    <p className="font-medium">
                      {followupTypeLabels[followup.followup_type]}
                      <span className="font-normal text-muted-foreground ml-2">
                        {format(new Date(followup.followup_date), "MMM d, yyyy")}
                      </span>
                    </p>
                    {followup.notes && <p className="text-sm text-muted-foreground">{followup.notes}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      Conducted by: {followup.profiles?.full_name || "Unknown"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletingFollowupId(followup.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Check-in History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Check-in History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {checkinHistory?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No check-ins recorded yet</p>
          ) : (
            <div className="space-y-4">
              {checkinHistory?.map((checkin) => (
                <div key={checkin.id} className="flex items-start gap-4 border-l-4 border-primary pl-4 py-2">
                  <div className="flex-1">
                    <p className="font-medium">
                      {checkin.services?.name || "Unknown Service"}
                      <span className="font-normal text-muted-foreground ml-2">
                        {checkin.services?.service_date 
                          ? format(new Date(checkin.services.service_date), "MMM d, yyyy")
                          : "Unknown date"}
                      </span>
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(checkin.checked_in_at), "h:mm a")}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {checkin.checkin_method === "qr" ? (
                          <span className="flex items-center gap-1">
                            <QrCode className="w-3 h-3" />
                            QR Scan
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <ClipboardList className="w-3 h-3" />
                            Manual
                          </span>
                        )}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Visitor Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Visitor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this visitor? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Convert to Member Dialog */}
      <AlertDialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert to Member</AlertDialogTitle>
            <AlertDialogDescription>
              You will be redirected to the member registration form with the visitor's information pre-filled.
              Complete the registration to convert this visitor to a member.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConvert} className="bg-green-600 hover:bg-green-700">
              Continue to Registration
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Followup Dialog */}
      <AlertDialog open={!!deletingFollowupId} onOpenChange={() => setDeletingFollowupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Follow-up</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this follow-up record?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFollowup} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send SMS Dialog */}
      <SendVisitorSMSDialog
        open={showSMSDialog}
        onOpenChange={setShowSMSDialog}
        visitor={visitor}
      />
    </div>
  );
}
