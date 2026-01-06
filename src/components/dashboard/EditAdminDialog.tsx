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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useBranches } from "@/hooks/useChurchData";
import { useUpdateAdminPermissions } from "@/hooks/useAdminMutations";
import { ALL_MENUS } from "@/hooks/useAdminPermissions";
import type { AdminUser } from "@/hooks/useAdminsData";

const formSchema = z.object({
  role: z.enum(["church_admin", "branch_admin", "usher"]),
  menuPermissions: z.array(z.string()),
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

interface EditAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admin: AdminUser | null;
}

export function EditAdminDialog({ open, onOpenChange, admin }: EditAdminDialogProps) {
  const { data: branches } = useBranches();
  const updateAdmin = useUpdateAdminPermissions();

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
      menuPermissions: [],
      branchIds: [],
    },
  });

  const selectedRole = watch("role");
  const selectedBranchIds = watch("branchIds");
  const selectedMenus = watch("menuPermissions");

  useEffect(() => {
    if (admin) {
      reset({
        role: admin.role,
        menuPermissions: admin.menuPermissions || [],
        branchIds: admin.branchPermissions?.map((b) => b.id) || [],
      });
    }
  }, [admin, reset]);

  const onSubmit = async (data: FormData) => {
    if (!admin) return;

    await updateAdmin.mutateAsync({
      userRoleId: admin.id,
      role: data.role,
      menuPermissions: data.role === "church_admin" ? [] : data.menuPermissions,
      branchIds: data.role === "church_admin" ? [] : data.branchIds,
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

  const handleMenuToggle = (menuKey: string, checked: boolean) => {
    const current = selectedMenus || [];
    if (checked) {
      setValue("menuPermissions", [...current, menuKey]);
    } else {
      setValue("menuPermissions", current.filter((k) => k !== menuKey));
    }
  };

  const handleSelectAllMenus = () => {
    const allKeys = ALL_MENUS.map((m) => m.key);
    setValue("menuPermissions", allKeys);
  };

  const handleSelectAllBranches = () => {
    const allIds = branches?.map((b) => b.id) || [];
    setValue("branchIds", allIds);
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case "church_admin":
        return "Full access to all branches, menus, and settings. Cannot be restricted.";
      case "branch_admin":
        return "Can manage members, services, and attendance for selected branches.";
      case "usher":
        return "Limited access based on assigned menus and branches.";
      default:
        return "";
    }
  };

  const displayName = admin?.member?.full_name || admin?.profile?.full_name || "Unknown";
  const displayEmail = admin?.member?.email || admin?.profile?.email || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Administrator Permissions</DialogTitle>
          <DialogDescription>
            Update role, menu access, and branch permissions
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col">
          {/* Admin info header */}
          <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg mb-4">
            <Avatar className="w-10 h-10">
              <AvatarImage src={admin?.member?.photo_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{displayName}</p>
              <p className="text-sm text-muted-foreground">{displayEmail}</p>
            </div>
          </div>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 pb-4">
              {/* Role Selection */}
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={selectedRole}
                  onValueChange={(value: FormData["role"]) => {
                    setValue("role", value);
                    if (value === "church_admin") {
                      setValue("branchIds", []);
                      setValue("menuPermissions", []);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="church_admin">Church Admin (Superadmin)</SelectItem>
                    <SelectItem value="branch_admin">Branch Admin</SelectItem>
                    <SelectItem value="usher">Usher / Staff</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {getRoleDescription(selectedRole)}
                </p>
              </div>

              {/* Menu Permissions (only for non-church_admin) */}
              {selectedRole !== "church_admin" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Menu Access</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAllMenus}
                    >
                      Select All
                    </Button>
                  </div>
                  <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                    {ALL_MENUS.filter((m) => m.key !== "admins").map((menu) => (
                      <div key={menu.key} className="flex items-start space-x-2">
                        <Checkbox
                          id={`edit-menu-${menu.key}`}
                          checked={selectedMenus?.includes(menu.key)}
                          onCheckedChange={(checked) =>
                            handleMenuToggle(menu.key, checked as boolean)
                          }
                        />
                        <div className="grid gap-0.5">
                          <label
                            htmlFor={`edit-menu-${menu.key}`}
                            className="text-sm font-medium leading-none cursor-pointer"
                          >
                            {menu.label}
                          </label>
                          <p className="text-xs text-muted-foreground">{menu.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Branch Permissions (only for non-church_admin) */}
              {selectedRole !== "church_admin" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Branch Access</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAllBranches}
                    >
                      Select All
                    </Button>
                  </div>
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
                          className="text-sm font-medium leading-none cursor-pointer"
                        >
                          {branch.name}
                          {branch.is_main_branch && (
                            <span className="ml-2 text-xs text-muted-foreground">(Main)</span>
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
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-3 pt-4 border-t mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateAdmin.isPending}>
              {updateAdmin.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
