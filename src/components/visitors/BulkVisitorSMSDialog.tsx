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
import { useSendSMSCampaign } from "@/hooks/useSMSMutations";
import { Visitor } from "@/hooks/useVisitorsData";
import { Users } from "lucide-react";

interface BulkVisitorSMSDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitors: Visitor[];
  onSuccess?: () => void;
}

const smsFormSchema = z.object({
  message: z.string().min(1, "Message is required").max(160, "Message must be 160 characters or less"),
});

type SMSFormData = z.infer<typeof smsFormSchema>;

export function BulkVisitorSMSDialog({ open, onOpenChange, visitors, onSuccess }: BulkVisitorSMSDialogProps) {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const sendSMS = useSendSMSCampaign();

  const form = useForm<SMSFormData>({
    resolver: zodResolver(smsFormSchema),
    defaultValues: {
      message: "",
    },
  });

  const onSubmit = async (data: SMSFormData) => {
    if (visitors.length === 0) {
      toast({ title: "No visitors selected", variant: "destructive" });
      return;
    }

    setIsSending(true);
    try {
      // Send SMS via the campaign function using "visitors" type for bulk
      await sendSMS.mutateAsync({
        audienceType: "visitors",
        audienceMemberIds: [],
        audienceVisitorIds: visitors.map(v => v.id),
        messageBody: data.message,
        recipientCount: visitors.length,
        useFirstName: true, // Enable first name personalization
      });

      toast({ 
        title: "Care Messages sent successfully",
        description: `Sent to ${visitors.length} guest${visitors.length > 1 ? 's' : ''}`
      });
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Failed to send messages",
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
            <Users className="w-5 h-5" />
            Send Care Message to {visitors.length} Guest{visitors.length > 1 ? 's' : ''}
          </DialogTitle>
          <DialogDescription>
            Each guest will receive a personalized message with their first name as the salutation.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          <p className="font-medium mb-1">Selected Guests:</p>
          <p className="text-muted-foreground">
            {visitors.slice(0, 5).map(v => v.first_name).join(", ")}
            {visitors.length > 5 && ` and ${visitors.length - 5} more...`}
          </p>
        </div>

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
                      placeholder="Thank you for visiting our church! We hope to see you again soon..."
                      rows={4}
                    />
                  </FormControl>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Each message will start with "Hi [First Name], "</span>
                    <span>{field.value.length}/160 characters</span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSending || visitors.length === 0}>
                {isSending ? "Sending..." : `Send to ${visitors.length} Guest${visitors.length > 1 ? 's' : ''}`}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
