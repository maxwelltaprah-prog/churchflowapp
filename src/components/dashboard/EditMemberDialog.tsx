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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useUpdateMember } from "@/hooks/useChurchMutations";
import { useBranches } from "@/hooks/useChurchData";
import { useActiveGroups, useMemberGroups } from "@/hooks/useGroupsData";
import { useSetMemberGroups } from "@/hooks/useGroupMutations";

const memberSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  gender: z.enum(["male", "female"]).optional(),
  membership_status: z.enum(["member", "visitor", "new_convert"]).optional(),
  branch_id: z.string().min(1, "Please select a branch"),
  group_ids: z.array(z.string()).optional(),
});

type MemberFormData = z.infer<typeof memberSchema>;

interface EditMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    id: string;
    full_name: string;
    phone?: string | null;
    email?: string | null;
    gender?: "male" | "female" | null;
    membership_status?: "member" | "visitor" | "new_convert" | null;
    branch_id: string;
  } | null;
}

export function EditMemberDialog({ open, onOpenChange, member }: EditMemberDialogProps) {
  const updateMember = useUpdateMember();
  const setMemberGroups = useSetMemberGroups();
  const { data: branches } = useBranches();
  const { data: memberGroups } = useMemberGroups(member?.id || null);
  
  const form = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      email: "",
      gender: undefined,
      membership_status: "visitor",
      branch_id: "",
      group_ids: [],
    },
  });

  const watchedBranchId = form.watch("branch_id");
  const { data: availableGroups } = useActiveGroups(watchedBranchId);

  useEffect(() => {
    if (member) {
      const currentGroupIds = memberGroups?.map((mg) => mg.group_id) || [];
      form.reset({
        full_name: member.full_name,
        phone: member.phone || "",
        email: member.email || "",
        gender: member.gender || undefined,
        membership_status: member.membership_status || "visitor",
        branch_id: member.branch_id,
        group_ids: currentGroupIds,
      });
    }
  }, [member, memberGroups, form]);

  const onSubmit = async (data: MemberFormData) => {
    if (!member) return;
    
    await updateMember.mutateAsync({
      id: member.id,
      full_name: data.full_name,
      phone: data.phone || undefined,
      email: data.email || undefined,
      gender: data.gender,
      membership_status: data.membership_status,
      branch_id: data.branch_id,
    });
    
    // Update member groups
    await setMemberGroups.mutateAsync({
      memberId: member.id,
      groupIds: data.group_ids || [],
    });
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Member</DialogTitle>
          <DialogDescription>
            Update member information
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="membership_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="visitor">Visitor</SelectItem>
                        <SelectItem value="new_convert">New Convert</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="branch_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select branch" />
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

            {/* Groups Multi-Select */}
            {availableGroups && availableGroups.length > 0 && (
              <FormField
                control={form.control}
                name="group_ids"
                render={() => (
                  <FormItem>
                    <FormLabel>Groups / Ministries</FormLabel>
                    <div className="border rounded-md p-3 space-y-2 max-h-[150px] overflow-y-auto">
                      {availableGroups.map((group) => (
                        <FormField
                          key={group.id}
                          control={form.control}
                          name="group_ids"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(group.id)}
                                  onCheckedChange={(checked) => {
                                    const currentValue = field.value || [];
                                    if (checked) {
                                      field.onChange([...currentValue, group.id]);
                                    } else {
                                      field.onChange(
                                        currentValue.filter((id) => id !== group.id)
                                      );
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal cursor-pointer">
                                {group.name}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMember.isPending || setMemberGroups.isPending}>
                {updateMember.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
