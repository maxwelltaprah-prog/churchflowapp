import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useTitheSettings, useTitheMutations } from "@/hooks/useTitheData";
import { Loader2, Settings, Eye, EyeOff, Bell, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const formSchema = z.object({
  tithe_rate_percent: z.number().min(0).max(100),
  default_currency: z.string().min(1),
  privacy_mode: z.boolean(),
  enable_pledge_targets: z.boolean(),
  enable_reminders: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

const CURRENCIES = [
  { value: "GHS", label: "Ghanaian Cedi (GHS)" },
  { value: "USD", label: "US Dollar (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "GBP", label: "British Pound (GBP)" },
  { value: "NGN", label: "Nigerian Naira (NGN)" },
  { value: "KES", label: "Kenyan Shilling (KES)" },
  { value: "ZAR", label: "South African Rand (ZAR)" },
];

export function TitheSettingsTab() {
  const { data: settings, isLoading } = useTitheSettings();
  const { updateSettings } = useTitheMutations();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tithe_rate_percent: 10,
      default_currency: "GHS",
      privacy_mode: false,
      enable_pledge_targets: false,
      enable_reminders: false,
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        tithe_rate_percent: Number(settings.tithe_rate_percent),
        default_currency: settings.default_currency,
        privacy_mode: settings.privacy_mode,
        enable_pledge_targets: settings.enable_pledge_targets,
        enable_reminders: settings.enable_reminders,
      });
    }
  }, [settings, form]);

  const onSubmit = async (values: FormValues) => {
    await updateSettings.mutateAsync(values);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                General Settings
              </CardTitle>
              <CardDescription>
                Configure basic tithe settings for your church
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="default_currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Currency</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CURRENCIES.map((currency) => (
                          <SelectItem key={currency.value} value={currency.value}>
                            {currency.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Currency used for all tithe transactions
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tithe_rate_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Standard Tithe Rate (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      Default tithe percentage (typically 10%)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {form.watch("privacy_mode") ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
                Privacy Settings
              </CardTitle>
              <CardDescription>
                Control who can see tithe amounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="privacy_mode"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Privacy Mode</FormLabel>
                      <FormDescription>
                        Hide tithe amounts from non-finance roles. Only show status and counts.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Feature Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Feature Settings
              </CardTitle>
              <CardDescription>
                Enable or disable optional tithe features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="enable_pledge_targets"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Pledge Targets</FormLabel>
                      <FormDescription>
                        Allow members to set annual tithe pledge targets
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enable_reminders"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        Payment Reminders
                      </FormLabel>
                      <FormDescription>
                        Enable SMS reminders for members who haven't paid
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={updateSettings.isPending}>
              {updateSettings.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Settings
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
