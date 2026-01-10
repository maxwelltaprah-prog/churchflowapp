import { useEffect, useState } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useUpdateMember } from "@/hooks/useChurchMutations";
import { useBranches } from "@/hooks/useChurchData";
import { useActiveGroups, useMemberGroups } from "@/hooks/useGroupsData";
import { useSetMemberGroups } from "@/hooks/useGroupMutations";
import { useActiveSpiritualJourneys, useMemberSpiritualJourneys } from "@/hooks/useSpiritualJourneyData";
import { useSetMemberSpiritualJourneys } from "@/hooks/useSpiritualJourneyMutations";
import { MemberForm } from "@/components/member/MemberForm";
import { memberEditSchema, type MemberEditFormData } from "@/lib/member-form-schema";

interface EditMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    id: string;
    full_name: string;
    phone?: string | null;
    email?: string | null;
    gender?: "male" | "female" | "prefer_not_to_say" | null;
    date_of_birth?: string | null;
    membership_status?: "active" | "inactive" | "transferred" | null;
    branch_id: string;
    how_heard?: "friend_family" | "social_media" | "walk_in" | "outreach" | "other" | null;
    residential_area?: string | null;
    marital_status?: "single" | "married" | "divorced" | "widowed" | null;
    occupation?: "student" | "public_sector" | "private_sector" | "self_employed" | "unemployed" | "other" | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    emergency_contact_relationship?: string | null;
    admin_notes?: string | null;
    date_joined?: string | null;
  } | null;
}

export function EditMemberDialog({ open, onOpenChange, member }: EditMemberDialogProps) {
  const updateMember = useUpdateMember();
  const setMemberGroups = useSetMemberGroups();
  const setMemberSpiritualJourneys = useSetMemberSpiritualJourneys();
  const { data: branches } = useBranches();
  const { data: memberGroups } = useMemberGroups(member?.id || null);
  const { data: memberSpiritualJourneys } = useMemberSpiritualJourneys(member?.id || null);
  const { data: availableSpiritualJourneys } = useActiveSpiritualJourneys();
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");

  // Check if member has incomplete required fields
  const hasMissingFields = member && (!member.gender || !member.date_of_birth);
  
  const form = useForm<MemberEditFormData>({
    resolver: zodResolver(memberEditSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      gender: undefined,
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
      date_joined: "",
    },
  });

  const watchedBranchId = form.watch("branch_id");
  const { data: availableGroups } = useActiveGroups(watchedBranchId);

  useEffect(() => {
    setSelectedBranchId(watchedBranchId || "");
  }, [watchedBranchId]);

  useEffect(() => {
    if (member) {
      const currentGroupIds = memberGroups?.map((mg) => mg.group_id) || [];
      form.reset({
        full_name: member.full_name,
        phone: member.phone || "",
        email: member.email || "",
        gender: member.gender || undefined,
        date_of_birth: member.date_of_birth || "",
        membership_status: member.membership_status || "active",
        branch_id: member.branch_id,
        group_ids: currentGroupIds,
        spiritual_journey_ids: memberSpiritualJourneys || [],
        how_heard: member.how_heard || null,
        residential_area: member.residential_area || "",
        marital_status: member.marital_status || null,
        occupation: member.occupation || null,
        emergency_contact_name: member.emergency_contact_name || "",
        emergency_contact_phone: member.emergency_contact_phone || "",
        emergency_contact_relationship: member.emergency_contact_relationship || "",
        admin_notes: member.admin_notes || "",
        date_joined: member.date_joined || "",
      });
    }
  }, [member, memberGroups, memberSpiritualJourneys, form]);

  const onSubmit = async (data: MemberEditFormData) => {
    if (!member) return;
    
    await updateMember.mutateAsync({
      id: member.id,
      full_name: data.full_name,
      phone: data.phone,
      email: data.email || undefined,
      gender: data.gender || undefined,
      date_of_birth: data.date_of_birth || undefined,
      membership_status: data.membership_status,
      branch_id: data.branch_id,
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
    
    // Update member groups
    await setMemberGroups.mutateAsync({
      memberId: member.id,
      groupIds: data.group_ids || [],
    });
    
    // Update member spiritual journeys
    await setMemberSpiritualJourneys.mutateAsync({
      memberId: member.id,
      journeyIds: data.spiritual_journey_ids || [],
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
        
        {hasMissingFields && (
          <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              This member is missing some required information (Gender or Date of Birth). 
              Please update their profile to complete their record.
            </AlertDescription>
          </Alert>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <MemberForm
              form={form}
              branches={branches}
              availableGroups={availableGroups}
              availableSpiritualJourneys={availableSpiritualJourneys}
              mode="edit"
              showAdminFields={true}
            />

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateMember.isPending || setMemberGroups.isPending || setMemberSpiritualJourneys.isPending}
              >
                {updateMember.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
