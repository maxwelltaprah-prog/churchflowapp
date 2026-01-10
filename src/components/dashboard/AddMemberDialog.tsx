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
import { useActiveSpiritualJourneys } from "@/hooks/useSpiritualJourneyData";
import { useSetMemberSpiritualJourneys } from "@/hooks/useSpiritualJourneyMutations";
import { MemberForm } from "@/components/member/MemberForm";
import { memberFormSchema, type MemberFormData } from "@/lib/member-form-schema";
import { useMemberTierLimit } from "@/hooks/useMemberTierLimit";
import { MemberTierWarning } from "@/components/member/MemberTierWarning";

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddMemberDialog({ open, onOpenChange }: AddMemberDialogProps) {
  const { data: branches } = useBranches();
  const createMember = useCreateMember();
  const setMemberGroups = useSetMemberGroups();
  const setMemberSpiritualJourneys = useSetMemberSpiritualJourneys();
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const tierStatus = useMemberTierLimit();
  
  const { data: availableGroups } = useActiveGroups(selectedBranchId);
  const { data: availableSpiritualJourneys } = useActiveSpiritualJourneys();

  const form = useForm<MemberFormData>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      gender: undefined, // Required - will show validation error if not selected
      date_of_birth: "",
      membership_status: "active",
      branch_id: "",
      group_ids: [],
      spiritual_journey_ids: [],
      how_heard: null,
      residential_area: "",
      marital_status: null,
      occupation: null,
      email: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      emergency_contact_relationship: "",
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
      how_heard: data.how_heard || undefined,
      residential_area: data.residential_area || undefined,
      marital_status: data.marital_status || undefined,
      occupation: data.occupation || undefined,
      emergency_contact_name: data.emergency_contact_name || undefined,
      emergency_contact_phone: data.emergency_contact_phone || undefined,
      emergency_contact_relationship: data.emergency_contact_relationship || undefined,
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
    // Set member spiritual journeys
    if (data.spiritual_journey_ids && data.spiritual_journey_ids.length > 0) {
      await setMemberSpiritualJourneys.mutateAsync({
        memberId: member.id,
        journeyIds: data.spiritual_journey_ids,
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
        {/* Tier Limit Warning */}
        <MemberTierWarning tierStatus={tierStatus} className="mb-4" />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <MemberForm
              form={form}
              branches={branches}
              availableGroups={availableGroups}
              availableSpiritualJourneys={availableSpiritualJourneys}
              mode="add"
              showAdminFields={true}
            />
            
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMember.isPending || setMemberGroups.isPending || setMemberSpiritualJourneys.isPending || !tierStatus.canAddMember}
              >
                {createMember.isPending ? "Adding..." : "Add Member"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
