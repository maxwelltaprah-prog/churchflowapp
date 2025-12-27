import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { ChevronDown, ChevronUp, Clock, User, Phone, Calendar, Users } from "lucide-react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MemberFormProps {
  form: UseFormReturn<any>;
  branches?: { id: string; name: string }[];
  availableGroups?: { id: string; name: string }[];
  mode: "add" | "edit" | "self-register";
  branchLocked?: boolean;
  showAdminFields?: boolean;
}

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const MEMBERSHIP_STATUS_OPTIONS = [
  { value: "first_timer", label: "First Timer / New" },
  { value: "visitor", label: "Visitor" },
  { value: "member", label: "Member" },
  { value: "new_convert", label: "New Convert" },
];

const MEMBER_TYPE_OPTIONS = [
  { value: "regular", label: "Regular Attender" },
  { value: "occasional", label: "Occasional Attender" },
  { value: "worker", label: "Worker / Volunteer" },
];

const HOW_HEARD_OPTIONS = [
  { value: "friend_family", label: "Friend / Family" },
  { value: "social_media", label: "Social Media" },
  { value: "walk_in", label: "Walk-in" },
  { value: "outreach", label: "Outreach" },
  { value: "other", label: "Other" },
];

const MARITAL_STATUS_OPTIONS = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
];

const OCCUPATION_OPTIONS = [
  { value: "student", label: "Student" },
  { value: "public_sector", label: "Public Sector" },
  { value: "private_sector", label: "Private Sector" },
  { value: "self_employed", label: "Self-Employed" },
  { value: "unemployed", label: "Unemployed" },
  { value: "other", label: "Other" },
];

export function MemberForm({
  form,
  branches,
  availableGroups,
  mode,
  branchLocked = false,
  showAdminFields = false,
}: MemberFormProps) {
  const [optionalOpen, setOptionalOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Time estimate */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3">
        <Clock className="w-4 h-4" />
        <span>Takes about 1 minute</span>
      </div>

      {/* SECTION A: Basic Info (Required) */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <User className="w-4 h-4" />
          Basic Information
        </h3>

        {/* Full Name */}
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name *</FormLabel>
              <FormControl>
                <Input placeholder="Enter full name" className="h-12" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Phone Number */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number *</FormLabel>
              <FormControl>
                <Input 
                  type="tel" 
                  placeholder="+233 XX XXX XXXX" 
                  className="h-12" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Gender and Date of Birth */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gender *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {GENDER_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="date_of_birth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date of Birth *</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    className="h-12"
                    value={field.value || ""}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Membership Status */}
        <FormField
          control={form.control}
          name="membership_status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Membership Status *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""}>
                <FormControl>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {MEMBERSHIP_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Branch (only for admin/staff modes) */}
        {mode !== "self-register" && branches && (
          <FormField
            control={form.control}
            name="branch_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Branch *</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value || ""}
                  disabled={branchLocked}
                >
                  <FormControl>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      {/* OPTIONAL SECTIONS (Collapsed) */}
      <Collapsible open={optionalOpen} onOpenChange={setOptionalOpen}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-between h-12 border border-dashed border-border hover:border-primary/50"
          >
            <span className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4" />
              Add more details (optional)
            </span>
            {optionalOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-6 pt-4">
          {/* SECTION B: Church Connection (Optional, High Value) */}
          <div className="space-y-4 p-4 bg-secondary/30 rounded-lg">
            <h4 className="text-sm font-medium text-foreground">Church Connection</h4>

            {/* Ministry / Group - Multi-select */}
            {availableGroups && availableGroups.length > 0 && (
              <FormField
                control={form.control}
                name="group_ids"
                render={() => (
                  <FormItem>
                    <FormLabel>Ministry / Group</FormLabel>
                    <div className="border rounded-md p-3 space-y-2 max-h-[120px] overflow-y-auto bg-background">
                      {availableGroups.map((group) => (
                        <FormField
                          key={group.id}
                          control={form.control}
                          name="group_ids"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(group.id)}
                                  onCheckedChange={(checked) => {
                                    const currentValue = field.value || [];
                                    if (checked) {
                                      field.onChange([...currentValue, group.id]);
                                    } else {
                                      field.onChange(
                                        currentValue.filter((id: string) => id !== group.id)
                                      );
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal cursor-pointer">
                                {group.name}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Member Type */}
            <FormField
              control={form.control}
              name="member_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Member Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MEMBER_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* How did you hear about us? */}
            <FormField
              control={form.control}
              name="how_heard"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How did you hear about us?</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select option" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {HOW_HEARD_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* SECTION C: Location & Life Stage (Optional) */}
          <div className="space-y-4 p-4 bg-secondary/30 rounded-lg">
            <h4 className="text-sm font-medium text-foreground">Location & Life Stage</h4>

            {/* Residential Area */}
            <FormField
              control={form.control}
              name="residential_area"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Residential Area / Community</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., East Legon, Accra" 
                      className="h-12" 
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Marital Status and Occupation */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="marital_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marital Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MARITAL_STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="occupation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Occupation</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {OCCUPATION_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Email (optional, moved here) */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="email@example.com" 
                      className="h-12" 
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Admin-only fields */}
          {showAdminFields && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg border border-dashed">
              <h4 className="text-sm font-medium text-foreground">Admin Notes</h4>
              
              <FormField
                control={form.control}
                name="admin_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Internal Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Notes visible only to staff..." 
                        className="min-h-[80px]" 
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date_joined"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date Joined</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="h-12"
                        value={field.value || ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
