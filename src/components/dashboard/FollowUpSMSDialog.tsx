import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MessageSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useSendSMSCampaign } from "@/hooks/useSMSMutations";
import { useCreateFollowup } from "@/hooks/useVisitorMutations";
import { FollowUpPerson } from "@/hooks/useNewPeopleToFollowUp";

interface FollowUpSMSDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person: FollowUpPerson;
}

const smsFormSchema = z.object({
  message: z.string().min(1, "Message is required").max(160, "Message must be 160 characters or less"),
});

type SMSFormData = z.infer<typeof smsFormSchema>;

export function FollowUpSMSDialog({ open, onOpenChange, person }: FollowUpSMSDialogProps) {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const sendSMS = useSendSMSCampaign();
  const createFollowup = useCreateFollowup();

  const isVisitor = person.type === 'first_time_visitor' || person.type === 'returning_visitor';
  const firstName = person.name.split(" ")[0];

  const form = useForm<SMSFormData>({
    resolver: zodResolver(smsFormSchema),
    defaultValues: {
      message: "",
    },
  });

  const onSubmit = async (data: SMSFormData) => {
    if (!person.phone) {
      toast({
        title: "No phone number",
        description: "This person doesn't have a phone number on record.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      // Personalize message with first name
      const personalizedMessage = data.message.replace(/\{name\}/g, firstName);

      if (isVisitor) {
        // Send SMS to visitor
        await sendSMS.mutateAsync({
          audienceType: "visitor",
          audienceMemberIds: [],
          audienceVisitorIds: [person.id],
          visitorPhone: person.phone,
          visitorName: person.name,
          messageBody: personalizedMessage,
          recipientCount: 1,
        });

        // Automatically log a follow-up entry for visitors
        await createFollowup.mutateAsync({
          visitor_id: person.id,
          followup_date: new Date().toISOString().split("T")[0],
          followup_type: "sms",
          notes: `SMS sent: ${firstName}`,
        });
      } else {
        // Send SMS to member
        await sendSMS.mutateAsync({
          audienceType: "selected",
          audienceMemberIds: [person.id],
          audienceVisitorIds: [],
          messageBody: personalizedMessage,
          recipientCount: 1,
          useFirstName: true,
        });
      }

      toast({ title: "SMS sent successfully" });
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast({
        title: "Failed to send SMS",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Send SMS to {firstName}
          </DialogTitle>
          <DialogDescription>
            Send a text message to {person.phone || "this person"}. Use {"{name}"} to personalize with their first name.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={`Hi {name}, we noticed you haven't been around lately. We miss you and would love to see you again...`}
                      rows={4}
                    />
                  </FormControl>
                  <div className="text-xs text-muted-foreground text-right">
                    {field.value.length}/160 characters
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSending || !person.phone}>
                {isSending ? "Sending..." : "Send SMS"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
