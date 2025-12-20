import { Settings, User, Building2, Bell, Shield, Palette } from "lucide-react";
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

export default function SettingsPage() {
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
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="registration">Registration</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
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
                  <Input id="churchName" defaultValue="Grace Community Church" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="churchSlug">Church URL Slug</Label>
                  <Input id="churchSlug" defaultValue="grace-community" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" placeholder="https://yourchurch.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input id="contactEmail" type="email" defaultValue="info@gracechurch.com" />
              </div>
              <div className="pt-4">
                <Button>Save Changes</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
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
                  <Input id="fullName" defaultValue="John Doe" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue="john@gracechurch.com" />
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Change Password</Label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input type="password" placeholder="Current password" />
                  <Input type="password" placeholder="New password" />
                </div>
              </div>
              <div className="pt-4">
                <Button>Update Profile</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Registration Settings */}
        <TabsContent value="registration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
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
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Approval</Label>
                  <p className="text-sm text-muted-foreground">
                    New registrations require admin approval before activation
                  </p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Cross-Branch Check-in</Label>
                  <p className="text-sm text-muted-foreground">
                    Members can check in at branches other than their home branch
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="pt-4">
                <Button>Save Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
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
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Daily Attendance Summary</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive a daily summary of attendance across branches
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Weekly Analytics Report</Label>
                  <p className="text-sm text-muted-foreground">
                    Get a weekly report with detailed analytics
                  </p>
                </div>
                <Switch />
              </div>
              <div className="pt-4">
                <Button>Save Preferences</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
