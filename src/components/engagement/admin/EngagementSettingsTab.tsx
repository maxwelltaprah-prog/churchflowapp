import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, Sun, Heart, Sparkles, BookOpen, Save } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEngagementSettings, EngagementSettings } from "@/hooks/useEngagementSettings";
import { useUpdateEngagementSettings } from "@/hooks/useAdminEngagementData";

export function EngagementSettingsTab() {
  const { profile } = useAuth();
  const { data: currentSettings, isLoading } = useEngagementSettings(profile?.church_id);
  const updateSettings = useUpdateEngagementSettings();

  const [settings, setSettings] = useState<EngagementSettings>({
    enableTodayAtChurch: true,
    enablePrayerWall: true,
    enablePersonalizedFeed: true,
    enableSermonFollowups: true,
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (currentSettings) {
      setSettings(currentSettings);
    }
  }, [currentSettings]);

  const handleChange = (key: keyof EngagementSettings, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSettings.mutate(settings, {
      onSuccess: () => setHasChanges(false),
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Engagement Settings
            </CardTitle>
            <CardDescription>
              Control which engagement features are available to members
            </CardDescription>
          </div>
          {hasChanges && (
            <Button onClick={handleSave} disabled={updateSettings.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {updateSettings.isPending ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-kpi-amber/10">
              <Sun className="w-5 h-5 text-kpi-amber" />
            </div>
            <div>
              <Label className="text-base">Today at Church</Label>
              <p className="text-sm text-muted-foreground">
                Daily devotionals, announcements, and scripture for members
              </p>
            </div>
          </div>
          <Switch
            checked={settings.enableTodayAtChurch}
            onCheckedChange={(checked) => handleChange("enableTodayAtChurch", checked)}
          />
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-kpi-rose/10">
              <Heart className="w-5 h-5 text-kpi-rose" />
            </div>
            <div>
              <Label className="text-base">Prayer Wall</Label>
              <p className="text-sm text-muted-foreground">
                Members can share and pray for each other's requests
              </p>
            </div>
          </div>
          <Switch
            checked={settings.enablePrayerWall}
            onCheckedChange={(checked) => handleChange("enablePrayerWall", checked)}
          />
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-kpi-purple/10">
              <Sparkles className="w-5 h-5 text-kpi-purple" />
            </div>
            <div>
              <Label className="text-base">Personalized Feed</Label>
              <p className="text-sm text-muted-foreground">
                Show members personalized encouragements and milestones
              </p>
            </div>
          </div>
          <Switch
            checked={settings.enablePersonalizedFeed}
            onCheckedChange={(checked) => handleChange("enablePersonalizedFeed", checked)}
          />
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-kpi-blue/10">
              <BookOpen className="w-5 h-5 text-kpi-blue" />
            </div>
            <div>
              <Label className="text-base">Sermon Follow-ups</Label>
              <p className="text-sm text-muted-foreground">
                Multi-day devotional plans to deepen sermon understanding
              </p>
            </div>
          </div>
          <Switch
            checked={settings.enableSermonFollowups}
            onCheckedChange={(checked) => handleChange("enableSermonFollowups", checked)}
          />
        </div>

        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Disabling a feature will hide it from the member portal.
            Existing data (prayer requests, enrollments, etc.) will be preserved.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
