import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Eye, EyeOff, Search, Check, User, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useBranches } from "@/hooks/useChurchData";
import { useCreateAdminFromMember } from "@/hooks/useAdminMutations";
import { useSearchMembersForAdmin, useMemberAdminStatus } from "@/hooks/useAdminsData";
import { ALL_MENUS } from "@/hooks/useAdminPermissions";
import { AdminCredentialsDialog } from "./AdminCredentialsDialog";

const formSchema = z.object({
  memberId: z.string().min(1, "Please select a member"),
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["church_admin", "branch_admin", "usher"]),
  menuPermissions: z.array(z.string()),
  branchIds: z.array(z.string()),
}).refine((data) => {
  if (data.role !== "church_admin" && data.branchIds.length === 0) {
    return false;
  }
  return true;
}, {
  message: "Select at least one branch",
  path: ["branchIds"],
});

type FormData = z.infer<typeof formSchema>;

interface AddAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddAdminDialog({ open, onOpenChange }: AddAdminDialogProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<{
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    photo_url: string | null;
    branch_id: string;
    branches: { name: string } | null;
  } | null>(null);
  
  // Success dialog state
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
  const [createdAdminCredentials, setCreatedAdminCredentials] = useState<{
    name: string;
    email: string;
    password: string;
  } | null>(null);

  const { data: branches } = useBranches();
  const { data: searchResults, isLoading: isSearching } = useSearchMembersForAdmin(memberSearch);
  const { data: existingAdminRole } = useMemberAdminStatus(selectedMember?.id || null);
  const createAdmin = useCreateAdminFromMember();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      memberId: "",
      email: "",
      password: "",
      role: "branch_admin",
      menuPermissions: ["dashboard", "members", "checkin"],
      branchIds: [],
    },
  });

  const selectedRole = watch("role");
  const selectedBranchIds = watch("branchIds");
  const selectedMenus = watch("menuPermissions");

  const handleMemberSelect = (member: typeof selectedMember) => {
    if (!member) return;
    setSelectedMember(member);
    setValue("memberId", member.id);
    setValue("email", member.email || "");
    setValue("branchIds", [member.branch_id]);
    setMemberSearch("");
    setStep(2);
  };

  const onSubmit = async (data: FormData) => {
    await createAdmin.mutateAsync({
      memberId: data.memberId,
      email: data.email,
      password: data.password,
      role: data.role,
      menuPermissions: data.role === "church_admin" ? [] : data.menuPermissions,
      branchIds: data.role === "church_admin" ? [] : data.branchIds,
    });
    
    // Store credentials for success dialog
    setCreatedAdminCredentials({
      name: selectedMember?.full_name || "Administrator",
      email: data.email,
      password: data.password,
    });
    
    // Close main dialog and show credentials
    handleCloseMainDialog();
    setShowCredentialsDialog(true);
  };

  const handleCloseMainDialog = () => {
    setStep(1);
    setMemberSearch("");
    setSelectedMember(null);
    reset();
    onOpenChange(false);
  };

  const handleClose = () => {
    handleCloseMainDialog();
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

  const getInitials = (name: string) => {
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

  return (
  <>
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && "Step 1: Select Member"}
            {step === 2 && "Step 2: Set Credentials"}
            {step === 3 && "Step 3: Assign Permissions"}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Search and select an existing member to promote to admin"}
            {step === 2 && "Set login credentials for the administrator"}
            {step === 3 && "Configure menu and branch access"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col">
          {/* Step 1: Member Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>

              <ScrollArea className="h-[300px] border rounded-lg">
                {isSearching ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : memberSearch.length < 2 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <User className="w-12 h-12 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">
                      Type at least 2 characters to search members
                    </p>
                  </div>
                ) : searchResults?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <p className="text-muted-foreground">No members found</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {searchResults?.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => handleMemberSelect(member as typeof selectedMember)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={member.photo_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(member.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{member.full_name}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {member.email || member.phone || "No contact"}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {(member.branches as any)?.name || "No branch"}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
              {errors.memberId && (
                <p className="text-sm text-destructive">{errors.memberId.message}</p>
              )}
            </div>
          )}

          {/* Step 2: Credentials */}
          {step === 2 && selectedMember && (
            <div className="space-y-4">
              {/* Selected member info */}
              <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={selectedMember.photo_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(selectedMember.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{selectedMember.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedMember.branches?.name || "No branch"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedMember(null);
                    setStep(1);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {existingAdminRole && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    This member already has an admin role ({existingAdminRole.role}).
                    {!existingAdminRole.is_active && " (Currently inactive)"}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email (Login Username)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@church.org"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 6 characters"
                    {...register("password")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Permissions */}
          {step === 3 && (
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
                            id={`menu-${menu.key}`}
                            checked={selectedMenus?.includes(menu.key)}
                            onCheckedChange={(checked) =>
                              handleMenuToggle(menu.key, checked as boolean)
                            }
                          />
                          <div className="grid gap-0.5">
                            <label
                              htmlFor={`menu-${menu.key}`}
                              className="text-sm font-medium leading-none cursor-pointer"
                            >
                              {menu.label}
                            </label>
                            <p className="text-xs text-muted-foreground">
                              {menu.description}
                            </p>
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
                            id={`branch-${branch.id}`}
                            checked={selectedBranchIds?.includes(branch.id)}
                            onCheckedChange={(checked) =>
                              handleBranchToggle(branch.id, checked as boolean)
                            }
                          />
                          <label
                            htmlFor={`branch-${branch.id}`}
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
          )}

          {/* Footer Actions */}
          <div className="flex justify-between gap-3 pt-4 border-t mt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <div className="flex gap-2">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                >
                  Back
                </Button>
              )}
              {step < 3 && (
                <Button
                  type="button"
                  onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                  disabled={step === 1 && !selectedMember}
                >
                  Next
                </Button>
              )}
              {step === 3 && (
                <Button type="submit" disabled={createAdmin.isPending}>
                  {createAdmin.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Administrator
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    
    {/* Credentials Dialog - shown after successful creation */}
    {createdAdminCredentials && (
      <AdminCredentialsDialog
        open={showCredentialsDialog}
        onOpenChange={(open) => {
          setShowCredentialsDialog(open);
          if (!open) {
            setCreatedAdminCredentials(null);
          }
        }}
        adminName={createdAdminCredentials.name}
        email={createdAdminCredentials.email}
        password={createdAdminCredentials.password}
      />
    )}
  </>
  );
}
