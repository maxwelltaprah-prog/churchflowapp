import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, Calendar, Info, MapPin } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { useVisitor } from "@/hooks/useVisitorsData";
import { useCreateFollowup } from "@/hooks/useVisitorMutations";

const followupFormSchema = z.object({
  followup_date: z.string().min(1, "Follow-up date is required"),
  followup_type: z.enum(["sms", "phone_call", "visit", "other"], {
    required_error: "Please select a follow-up type",
  }),
  notes: z.string().optional(),
});

type FollowupFormData = z.infer<typeof followupFormSchema>;

const howHeardLabels: Record<string, string> = {
  friend_family: "Family",
  social_media: "Social Media",
  walk_in: "Walk-in",
  outreach: "Outreach",
  other: "Other",
};

const statusConfig = {
  new: { label: "New", className: "bg-orange-100 text-orange-800" },
  in_follow_up: { label: "In follow up", className: "bg-yellow-100 text-yellow-800" },
  converted: { label: "Converted", className: "bg-green-100 text-green-800" },
};

export default function AddFollowupPage() {
  const { visitorId } = useParams();
  const navigate = useNavigate();
  const { data: visitor, isLoading } = useVisitor(visitorId);
  const createFollowup = useCreateFollowup();

  const form = useForm<FollowupFormData>({
    resolver: zodResolver(followupFormSchema),
    defaultValues: {
      followup_date: new Date().toISOString().split("T")[0],
      followup_type: undefined,
      notes: "",
    },
  });

  const onSubmit = async (data: FollowupFormData) => {
    if (!visitorId) return;
    await createFollowup.mutateAsync({
      visitor_id: visitorId,
      followup_date: data.followup_date,
      followup_type: data.followup_type,
      notes: data.notes || undefined,
    });
    navigate(`/app/visitors/${visitorId}`);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add Follow-up</h1>
          <p className="text-muted-foreground">
            Record a follow-up interaction with {visitor.first_name} {visitor.last_name}
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate(`/app/visitors/${visitorId}`)} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Visitor
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Follow-up Form */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="followup_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Follow-up Date <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input {...field} type="date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="followup_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Follow-up Type <span className="text-destructive">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="sms">SMS</SelectItem>
                            <SelectItem value="phone_call">Phone Call</SelectItem>
                            <SelectItem value="visit">Visit</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Enter notes about the follow-up..."
                          rows={5}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button type="submit" disabled={createFollowup.isPending}>
                    {createFollowup.isPending ? "Saving..." : "Save Follow-up"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Visitor Info Sidebar */}
        <Card>
          <CardHeader>
            <CardTitle>Visitor Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                {getInitials(visitor.first_name, visitor.last_name)}
              </div>
              <div>
                <h3 className="font-semibold">{visitor.first_name} {visitor.last_name}</h3>
                <Badge className={statusConfig[visitor.status].className}>
                  {statusConfig[visitor.status].label}
                </Badge>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{visitor.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span><strong>First Visit:</strong> {format(new Date(visitor.first_visit_date), "MMM d, yyyy")}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Info className="w-4 h-4 text-muted-foreground" />
                <span><strong>Heard From:</strong> {howHeardLabels[visitor.how_heard]}</span>
              </div>
              {visitor.address && (
                <>
                  <div className="pt-2 border-t">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Address</p>
                    <p className="text-sm">{visitor.address}</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
