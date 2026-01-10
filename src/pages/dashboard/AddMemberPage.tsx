import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { UserPlus, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MemberForm } from "@/components/member/MemberForm";
import { memberFormSchema, type MemberFormData } from "@/lib/member-form-schema";
import { useBranches } from "@/hooks/useChurchData";
import { useActiveGroups } from "@/hooks/useGroupsData";
import { useActiveSpiritualJourneys } from "@/hooks/useSpiritualJourneyData";
import { useCreateMember } from "@/hooks/useChurchMutations";
import { useSetMemberGroups } from "@/hooks/useGroupMutations";
import { useSetMemberSpiritualJourneys } from "@/hooks/useSpiritualJourneyMutations";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMemberTierLimit } from "@/hooks/useMemberTierLimit";
import { MemberTierWarning } from "@/components/member/MemberTierWarning";

interface VisitorData {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  gender: string;
  date_of_birth: string;
  how_heard: string;
  branch_id: string;
  address: string;
  visitor_id: string;
}

export default function AddMemberPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: branches } = useBranches();
  const createMember = useCreateMember();
  const setMemberGroups = useSetMemberGroups();
  const setMemberSpiritualJourneys = useSetMemberSpiritualJourneys();
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [isUpdatingVisitor, setIsUpdatingVisitor] = useState(false);
  const tierStatus = useMemberTierLimit();

  const { data: availableGroups } = useActiveGroups(selectedBranchId);
  const { data: availableSpiritualJourneys } = useActiveSpiritualJourneys();

  // Parse visitor data from URL if converting from visitor
  const visitorData = useMemo<VisitorData | null>(() => {
    const fromVisitor = searchParams.get("from_visitor");
    if (fromVisitor) {
      try {
        return JSON.parse(decodeURIComponent(fromVisitor));
      } catch (e) {
        return null;
      }
    }
    return null;
  }, [searchParams]);

  const isConvertingVisitor = !!visitorData;

  const form = useForm<MemberFormData>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: {
      full_name: visitorData ? `${visitorData.first_name} ${visitorData.last_name}` : "",
      phone: visitorData?.phone || "",
      gender: (visitorData?.gender as "male" | "female" | "prefer_not_to_say") || undefined,
      date_of_birth: visitorData?.date_of_birth || "",
      membership_status: "active",
      branch_id: visitorData?.branch_id || "",
      group_ids: [],
      spiritual_journey_ids: [],
      how_heard: (visitorData?.how_heard as "friend_family" | "social_media" | "walk_in" | "outreach" | "other") || null,
      residential_area: visitorData?.address || "",
      marital_status: null,
      occupation: null,
      email: visitorData?.email || "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      emergency_contact_relationship: "",
      admin_notes: isConvertingVisitor ? `Converted from visitor on ${new Date().toLocaleDateString()}` : "",
      date_joined: new Date().toISOString().split("T")[0],
    },
  });

  // Watch branch_id to update available groups
  const watchedBranchId = form.watch("branch_id");
  useEffect(() => {
    setSelectedBranchId(watchedBranchId || "");
  }, [watchedBranchId]);

  // Set branch from visitor data
  useEffect(() => {
    if (visitorData?.branch_id && branches?.length) {
      const branchExists = branches.some(b => b.id === visitorData.branch_id);
      if (branchExists) {
        form.setValue("branch_id", visitorData.branch_id);
      }
    }
  }, [visitorData, branches, form]);

  const onSubmit = async (data: MemberFormData) => {
    try {
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

      // If converting from visitor, update visitor status
      if (visitorData?.visitor_id) {
        setIsUpdatingVisitor(true);
        const { error: updateError } = await supabase
          .from("visitors")
          .update({
            status: "converted",
            converted_member_id: member.id,
          })
          .eq("id", visitorData.visitor_id);

        if (updateError) {
          console.error("Failed to update visitor status:", updateError);
        }
        setIsUpdatingVisitor(false);
        toast.success("Visitor successfully converted to member!");
        navigate("/app/visitors");
      } else {
        toast.success("Member added successfully!");
        navigate("/app/members");
      }
    } catch (error) {
      toast.error("Failed to add member");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={isConvertingVisitor ? "Convert Visitor to Member" : "Add New Member"}
        description={isConvertingVisitor 
          ? "Complete the registration form to convert this visitor to a member"
          : "Register a new member with their details"
        }
        icon={UserPlus}
        backTo={isConvertingVisitor ? `/app/visitors/${visitorData?.visitor_id}` : "/app/members"}
      />

      {/* Conversion Alert */}
      {isConvertingVisitor && (
        <Alert className="border-green-200 bg-green-50">
          <AlertCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Converting visitor <strong>{visitorData?.first_name} {visitorData?.last_name}</strong> to a member. 
            The visitor's information has been pre-filled. Please complete any missing required fields.
          </AlertDescription>
        </Alert>
      )}

      {/* Tier Limit Warning */}
      <MemberTierWarning tierStatus={tierStatus} />

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Member Information
          </CardTitle>
          <CardDescription>
            Fields marked with * are required
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <MemberForm
                form={form}
                branches={branches}
                availableGroups={availableGroups}
                availableSpiritualJourneys={availableSpiritualJourneys}
                mode="add"
                showAdminFields={true}
              />

              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate(isConvertingVisitor ? `/app/visitors/${visitorData?.visitor_id}` : "/app/members")}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMember.isPending || setMemberGroups.isPending || setMemberSpiritualJourneys.isPending || isUpdatingVisitor || !tierStatus.canAddMember}
                  className="gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  {createMember.isPending 
                    ? "Adding..." 
                    : isConvertingVisitor 
                      ? "Convert to Member" 
                      : "Add Member"
                  }
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
