import { useState, useEffect } from "react";
import { Settings, User, Building2, Bell, Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useChurch } from "@/hooks/useChurchData";
import { useUpdateChurchSettings, useUpdateProfile } from "@/hooks/useChurchMutations";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function SettingsPage() {
  const { data: church, isLoading: churchLoading } = useChurch();
  const { profile } = useAuth();
  const updateChurchSettings = useUpdateChurchSettings();
  const updateProfile = useUpdateProfile();

  // Church settings state
  const [churchName, setChurchName] = useState("");
  const [churchSlug, setChurchSlug] = useState("");

  // Profile state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Registration settings state
  const [allowSelfRegistration, setAllowSelfRegistration] = useState(true);
  const [requireApproval, setRequireApproval] = useState(false);
  const [allowCrossBranchCheckin, setAllowCrossBranchCheckin] = useState(true);


  // Notification settings state
  const [notifyNewMembers, setNotifyNewMembers] = useState(true);
  const [dailySummary, setDailySummary] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);

  // Initialize form values when data loads
  useEffect(() => {
    if (church) {
      setChurchName(church.name || "");
      setChurchSlug(church.slug || "");
      
      const settings = church.settings as {
        allow_self_registration?: boolean;
        require_approval?: boolean;
        allow_cross_branch_checkin?: boolean;
      } | null;
      
      if (settings) {
        setAllowSelfRegistration(settings.allow_self_registration ?? true);
        setRequireApproval(settings.require_approval ?? false);
        setAllowCrossBranchCheckin(settings.allow_cross_branch_checkin ?? true);
      }
    }
  }, [church]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setEmail(profile.email || "");
    }
  }, [profile]);

  const handleSaveChurchInfo = async () => {
    await updateChurchSettings.mutateAsync({
      name: churchName,
    });
  };

  const handleSaveProfile = async () => {
    await updateProfile.mutateAsync({
      full_name: fullName,
    });
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
    }
  };

  const handleSaveRegistrationSettings = async () => {
    await updateChurchSettings.mutateAsync({
      settings: {
        allow_self_registration: allowSelfRegistration,
        require_approval: requireApproval,
        allow_cross_branch_checkin: allowCrossBranchCheckin,
      },
    });
  };


  const handleSaveNotifications = () => {
    // For now, just show a success message
    // In a real app, these would be stored in user preferences
    toast.success("Notification preferences saved");
  };

  if (churchLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your church settings and preferences
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3 bg-muted/50">
          <TabsTrigger value="general" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">General</TabsTrigger>
          <TabsTrigger value="registration" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Registration</TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Notifications</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card className="border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                Church Information
              </CardTitle>
              <CardDescription>
                Update your church's basic information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="churchName">Church Name</Label>
                  <Input 
                    id="churchName" 
                    value={churchName}
                    onChange={(e) => setChurchName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="churchSlug">Church URL Slug</Label>
                  <Input 
                    id="churchSlug" 
                    value={churchSlug}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">URL slug cannot be changed</p>
                </div>
              </div>
              <div className="pt-4">
                <Button 
                  onClick={handleSaveChurchInfo}
                  disabled={updateChurchSettings.isPending}
                >
                  {updateChurchSettings.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-violet-500 bg-gradient-to-r from-violet-500/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-violet-500/10">
                  <User className="w-5 h-5 text-violet-600" />
                </div>
                Your Profile
              </CardTitle>
              <CardDescription>
                Manage your personal account settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input 
                    id="fullName" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
              </div>
              <div className="pt-4">
                <Button 
                  onClick={handleSaveProfile}
                  disabled={updateProfile.isPending}
                >
                  {updateProfile.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Update Profile"
                  )}
                </Button>
              </div>
              
              <Separator className="my-6" />
              
              <div className="space-y-4">
                <Label>Change Password</Label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input 
                    type="password" 
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <Input 
                    type="password" 
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleChangePassword}
                  disabled={!newPassword}
                >
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Registration Settings */}
        <TabsContent value="registration" className="space-y-6">
          <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-500/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Shield className="w-5 h-5 text-emerald-600" />
                </div>
                Member Registration
              </CardTitle>
              <CardDescription>
                Control how new members can join your church
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Self-Registration</Label>
                  <p className="text-sm text-muted-foreground">
                    Members can register themselves via branch join links
                  </p>
                </div>
                <Switch 
                  checked={allowSelfRegistration}
                  onCheckedChange={setAllowSelfRegistration}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Approval</Label>
                  <p className="text-sm text-muted-foreground">
                    New registrations require admin approval before activation
                  </p>
                </div>
                <Switch 
                  checked={requireApproval}
                  onCheckedChange={setRequireApproval}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Cross-Branch Check-in</Label>
                  <p className="text-sm text-muted-foreground">
                    Members can check in at branches other than their home branch
                  </p>
                </div>
                <Switch 
                  checked={allowCrossBranchCheckin}
                  onCheckedChange={setAllowCrossBranchCheckin}
                />
              </div>
              <div className="pt-4">
                <Button 
                  onClick={handleSaveRegistrationSettings}
                  disabled={updateChurchSettings.isPending}
                >
                  {updateChurchSettings.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Settings"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-500/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Bell className="w-5 h-5 text-amber-600" />
                </div>
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose what notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>New Member Registrations</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when new members register
                  </p>
                </div>
                <Switch 
                  checked={notifyNewMembers}
                  onCheckedChange={setNotifyNewMembers}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Daily Attendance Summary</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive a daily summary of attendance across branches
                  </p>
                </div>
                <Switch 
                  checked={dailySummary}
                  onCheckedChange={setDailySummary}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Weekly Analytics Report</Label>
                  <p className="text-sm text-muted-foreground">
                    Get a weekly report with detailed analytics
                  </p>
                </div>
                <Switch 
                  checked={weeklyReport}
                  onCheckedChange={setWeeklyReport}
                />
              </div>
              <div className="pt-4">
                <Button onClick={handleSaveNotifications}>
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}