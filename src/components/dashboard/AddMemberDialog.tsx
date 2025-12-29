import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useBranches } from "@/hooks/useChurchData";
import { useCreateMember } from "@/hooks/useChurchMutations";
import { useActiveGroups } from "@/hooks/useGroupsData";
import { useSetMemberGroups } from "@/hooks/useGroupMutations";
import { MemberForm } from "@/components/member/MemberForm";
import { memberFormSchema, type MemberFormData } from "@/lib/member-form-schema";

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddMemberDialog({ open, onOpenChange }: AddMemberDialogProps) {
  const { data: branches } = useBranches();
  const createMember = useCreateMember();
  const setMemberGroups = useSetMemberGroups();
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  
  const { data: availableGroups } = useActiveGroups(selectedBranchId);

  const form = useForm<MemberFormData>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      gender: undefined, // Required - will show validation error if not selected
      date_of_birth: "",
      membership_status: "first_timer",
      branch_id: "",
      group_ids: [],
      member_type: null,
      how_heard: null,
      residential_area: "",
      marital_status: null,
      occupation: null,
      email: "",
      admin_notes: "",
      date_joined: new Date().toISOString().split("T")[0],
    },
  });

  // Watch branch_id to update available groups
  const watchedBranchId = form.watch("branch_id");
  useEffect(() => {
    setSelectedBranchId(watchedBranchId || "");
  }, [watchedBranchId]);

  const onSubmit = async (data: MemberFormData) => {
    const member = await createMember.mutateAsync({
      full_name: data.full_name,
      branch_id: data.branch_id,
      phone: data.phone,
      email: data.email || undefined,
      gender: data.gender,
      date_of_birth: data.date_of_birth,
      membership_status: data.membership_status,
      member_type: data.member_type || undefined,
      how_heard: data.how_heard || undefined,
      residential_area: data.residential_area || undefined,
      marital_status: data.marital_status || undefined,
      occupation: data.occupation || undefined,
      admin_notes: data.admin_notes || undefined,
      date_joined: data.date_joined || undefined,
    });
    
    // Set member groups if any selected
    if (data.group_ids && data.group_ids.length > 0) {
      await setMemberGroups.mutateAsync({
        memberId: member.id,
        groupIds: data.group_ids,
      });
    }
    
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Member</DialogTitle>
          <DialogDescription>
            Register a new member with their details.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <MemberForm
              form={form}
              branches={branches}
              availableGroups={availableGroups}
              mode="add"
              showAdminFields={true}
            />
            
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMember.isPending || setMemberGroups.isPending}>
                {createMember.isPending ? "Adding..." : "Add Member"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
