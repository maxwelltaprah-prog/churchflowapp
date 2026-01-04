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
import { Button } from "@/components/ui/button";
import { useCreateBranch } from "@/hooks/useChurchMutations";

const branchSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  location: z.string().optional(),
  overseer_name: z.string().optional(),
  overseer_phone: z.string().optional(),
  overseer_email: z.string().email("Invalid email address").optional().or(z.literal("")),
});

type BranchFormData = z.infer<typeof branchSchema>;

interface AddBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddBranchDialog({ open, onOpenChange }: AddBranchDialogProps) {
  const createBranch = useCreateBranch();

  const form = useForm<BranchFormData>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      name: "",
      location: "",
      overseer_name: "",
      overseer_phone: "",
      overseer_email: "",
    },
  });

  const onSubmit = async (data: BranchFormData) => {
    await createBranch.mutateAsync({
      name: data.name,
      location: data.location || undefined,
      overseer_name: data.overseer_name || undefined,
      overseer_phone: data.overseer_phone || undefined,
      overseer_email: data.overseer_email || undefined,
    });
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Branch</DialogTitle>
          <DialogDescription>
            Create a new branch for your church.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Takoradi Branch" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Takoradi, Western Region" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="overseer_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Overseer Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Pastor John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="overseer_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Overseer Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., +233 XX XXX XXXX" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="overseer_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Overseer Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="e.g., pastor@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createBranch.isPending}>
                {createBranch.isPending ? "Creating..." : "Create Branch"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
