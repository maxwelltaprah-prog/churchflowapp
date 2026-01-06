import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { useCreateFollowup } from "@/hooks/useVisitorMutations";
import { useSendSMSCampaign } from "@/hooks/useSMSMutations";
import { Visitor } from "@/hooks/useVisitorsData";

interface SendVisitorSMSDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitor: Visitor;
}

const smsFormSchema = z.object({
  message: z.string().min(1, "Message is required").max(160, "Message must be 160 characters or less"),
});

type SMSFormData = z.infer<typeof smsFormSchema>;

export function SendVisitorSMSDialog({ open, onOpenChange, visitor }: SendVisitorSMSDialogProps) {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const createFollowup = useCreateFollowup();
  const sendSMS = useSendSMSCampaign();

  const form = useForm<SMSFormData>({
    resolver: zodResolver(smsFormSchema),
    defaultValues: {
      message: "",
    },
  });

  const onSubmit = async (data: SMSFormData) => {
    setIsSending(true);
    try {
      // Personalize message with first name
      const personalizedMessage = data.message.replace(/\{name\}/g, visitor.first_name);

      // Send SMS via the campaign function using "individual" type
      await sendSMS.mutateAsync({
        audienceType: "individual",
        audienceMemberIds: [],
        messageBody: personalizedMessage,
        recipientCount: 1,
      });

      // Automatically log a follow-up entry
      await createFollowup.mutateAsync({
        visitor_id: visitor.id,
        followup_date: new Date().toISOString().split("T")[0],
        followup_type: "sms",
        notes: `SMS sent: ${visitor.first_name}`,
      });

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
          <DialogTitle>Send SMS to {visitor.first_name} {visitor.last_name}</DialogTitle>
          <DialogDescription>
            Send a text message to {visitor.phone}. Use {"{name}"} to personalize with the visitor's first name.
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
                      placeholder={`Hi {name}, thank you for visiting our church...`}
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
              <Button type="submit" disabled={isSending}>
                {isSending ? "Sending..." : "Send SMS"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
