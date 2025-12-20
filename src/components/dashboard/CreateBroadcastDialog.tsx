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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useCreateBroadcast } from "@/hooks/useChurchMutations";
import { useBranches } from "@/hooks/useChurchData";

const broadcastSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
  target_scope: z.string(),
  branch_id: z.string().optional(),
});

type BroadcastFormData = z.infer<typeof broadcastSchema>;

interface CreateBroadcastDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateBroadcastDialog({ open, onOpenChange }: CreateBroadcastDialogProps) {
  const createBroadcast = useCreateBroadcast();
  const { data: branches } = useBranches();

  const form = useForm<BroadcastFormData>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: {
      title: "",
      message: "",
      target_scope: "all",
      branch_id: undefined,
    },
  });

  const targetScope = form.watch("target_scope");

  const onSubmit = async (data: BroadcastFormData) => {
    await createBroadcast.mutateAsync({
      title: data.title,
      message: data.message,
      target_scope: data.target_scope,
      branch_id: data.target_scope === "branch" ? data.branch_id : undefined,
    });
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Broadcast</DialogTitle>
          <DialogDescription>
            Send a message to your congregation
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Sunday Service Reminder" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Write your message here..." 
                      className="min-h-[120px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="target_scope"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Send To</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select recipients" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">All Members</SelectItem>
                      <SelectItem value="branch">Specific Branch</SelectItem>
                      <SelectItem value="members">Members Only</SelectItem>
                      <SelectItem value="visitors">Visitors Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {targetScope === "branch" && (
              <FormField
                control={form.control}
                name="branch_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Branch</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a branch" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {branches?.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createBroadcast.isPending}>
                {createBroadcast.isPending ? "Sending..." : "Send Broadcast"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}