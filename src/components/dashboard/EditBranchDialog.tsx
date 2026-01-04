import { useEffect } from "react";
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
import { useUpdateBranch } from "@/hooks/useChurchMutations";

const branchSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  location: z.string().optional(),
  overseer_name: z.string().optional(),
  overseer_phone: z.string().optional(),
  overseer_email: z.string().email("Invalid email address").optional().or(z.literal("")),
});

type BranchFormData = z.infer<typeof branchSchema>;

interface EditBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch: {
    id: string;
    name: string;
    location?: string | null;
    overseer_name?: string | null;
    overseer_phone?: string | null;
    overseer_email?: string | null;
  } | null;
}

export function EditBranchDialog({ open, onOpenChange, branch }: EditBranchDialogProps) {
  const updateBranch = useUpdateBranch();

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

  useEffect(() => {
    if (branch) {
      form.reset({
        name: branch.name,
        location: branch.location || "",
        overseer_name: branch.overseer_name || "",
        overseer_phone: branch.overseer_phone || "",
        overseer_email: branch.overseer_email || "",
      });
    }
  }, [branch, form]);

  const onSubmit = async (data: BranchFormData) => {
    if (!branch) return;
    
    await updateBranch.mutateAsync({
      id: branch.id,
      name: data.name,
      location: data.location || undefined,
      overseer_name: data.overseer_name || undefined,
      overseer_phone: data.overseer_phone || undefined,
      overseer_email: data.overseer_email || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Branch</DialogTitle>
          <DialogDescription>
            Update the branch details.
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
                    <Input placeholder="e.g., Downtown Campus" {...field} />
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
                  <FormLabel>Location (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 123 Main Street" {...field} />
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
              <Button type="submit" disabled={updateBranch.isPending}>
                {updateBranch.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
