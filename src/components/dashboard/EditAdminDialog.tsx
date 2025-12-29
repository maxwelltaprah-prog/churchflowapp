import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useBranches } from "@/hooks/useChurchData";
import { useUpdateAdmin } from "@/hooks/useAdminMutations";

const formSchema = z.object({
  role: z.enum(["church_admin", "branch_admin", "usher"]),
  branchIds: z.array(z.string()),
}).refine((data) => {
  if (data.role !== "church_admin" && data.branchIds.length === 0) {
    return false;
  }
  return true;
}, {
  message: "Select at least one branch for Branch Admin or Usher roles",
  path: ["branchIds"],
});

type FormData = z.infer<typeof formSchema>;

interface AdminToEdit {
  user_id: string;
  profile: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
  role: "church_admin" | "branch_admin" | "usher";
  branches: { id: string; name: string }[];
  roleIds: string[];
}

interface EditAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admin: AdminToEdit | null;
}

export function EditAdminDialog({ open, onOpenChange, admin }: EditAdminDialogProps) {
  const { data: branches } = useBranches();
  const updateAdmin = useUpdateAdmin();

  const {
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: "branch_admin",
      branchIds: [],
    },
  });

  const selectedRole = watch("role");
  const selectedBranchIds = watch("branchIds");

  useEffect(() => {
    if (admin) {
      reset({
        role: admin.role,
        branchIds: admin.branches.map((b) => b.id),
      });
    }
  }, [admin, reset]);

  const onSubmit = async (data: FormData) => {
    if (!admin) return;

    await updateAdmin.mutateAsync({
      userId: admin.user_id,
      role: data.role,
      branchIds: data.role === "church_admin" ? [] : data.branchIds,
      currentRoleIds: admin.roleIds,
    });
    onOpenChange(false);
  };

  const handleBranchToggle = (branchId: string, checked: boolean) => {
    const current = selectedBranchIds || [];
    if (checked) {
      setValue("branchIds", [...current, branchId]);
    } else {
      setValue("branchIds", current.filter((id) => id !== branchId));
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case "church_admin":
        return "Full access to all branches and settings";
      case "branch_admin":
        return "Can manage members, services, and attendance for selected branches";
      case "usher":
        return "Can perform check-ins for selected branches only";
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Administrator</DialogTitle>
          <DialogDescription>
            Update role and branch access for {admin?.profile?.full_name || admin?.profile?.email}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="p-3 bg-secondary/50 rounded-lg">
            <p className="font-medium">{admin?.profile?.full_name || "Unknown"}</p>
            <p className="text-sm text-muted-foreground">{admin?.profile?.email}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={selectedRole}
              onValueChange={(value: FormData["role"]) => {
                setValue("role", value);
                if (value === "church_admin") {
                  setValue("branchIds", []);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="church_admin">Church Admin</SelectItem>
                <SelectItem value="branch_admin">Branch Admin</SelectItem>
                <SelectItem value="usher">Usher / Staff</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {getRoleDescription(selectedRole)}
            </p>
          </div>

          {selectedRole !== "church_admin" && (
            <div className="space-y-2">
              <Label>Branch Access</Label>
              <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                {branches?.map((branch) => (
                  <div key={branch.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-branch-${branch.id}`}
                      checked={selectedBranchIds?.includes(branch.id)}
                      onCheckedChange={(checked) =>
                        handleBranchToggle(branch.id, checked as boolean)
                      }
                    />
                    <label
                      htmlFor={`edit-branch-${branch.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {branch.name}
                      {branch.is_main_branch && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (Main)
                        </span>
                      )}
                    </label>
                  </div>
                ))}
                {(!branches || branches.length === 0) && (
                  <p className="text-sm text-muted-foreground">No branches available</p>
                )}
              </div>
              {errors.branchIds && (
                <p className="text-sm text-destructive">{errors.branchIds.message}</p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateAdmin.isPending}>
              {updateAdmin.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
