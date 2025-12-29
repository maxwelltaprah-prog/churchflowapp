import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Eye, EyeOff } from "lucide-react";
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
import { useBranches } from "@/hooks/useChurchData";
import { useCreateAdmin } from "@/hooks/useAdminMutations";

const formSchema = z.object({
  email: z.string().email("Valid email required"),
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
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

interface AddAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddAdminDialog({ open, onOpenChange }: AddAdminDialogProps) {
  const [showPassword, setShowPassword] = useState(false);
  const { data: branches } = useBranches();
  const createAdmin = useCreateAdmin();

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
      email: "",
      fullName: "",
      password: "",
      role: "branch_admin",
      branchIds: [],
    },
  });

  const selectedRole = watch("role");
  const selectedBranchIds = watch("branchIds");

  const onSubmit = async (data: FormData) => {
    await createAdmin.mutateAsync({
      email: data.email,
      fullName: data.fullName,
      password: data.password,
      role: data.role,
      branchIds: data.role === "church_admin" ? [] : data.branchIds,
    });
    reset();
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
          <DialogTitle>Add Administrator</DialogTitle>
          <DialogDescription>
            Create a new administrator account with specific permissions
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              placeholder="John Doe"
              {...register("fullName")}
            />
            {errors.fullName && (
              <p className="text-sm text-destructive">{errors.fullName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
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
            <Label htmlFor="password">Initial Password</Label>
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
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
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
                      id={`branch-${branch.id}`}
                      checked={selectedBranchIds?.includes(branch.id)}
                      onCheckedChange={(checked) =>
                        handleBranchToggle(branch.id, checked as boolean)
                      }
                    />
                    <label
                      htmlFor={`branch-${branch.id}`}
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
            <Button type="submit" disabled={createAdmin.isPending}>
              {createAdmin.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Add Administrator
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
