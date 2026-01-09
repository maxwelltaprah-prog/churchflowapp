import { z } from "zod";

// Validate date of birth is a real date and not in the future
const validateDateOfBirth = (dateStr: string) => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;
  if (date > new Date()) return false;
  // Reasonable age limit (0-150 years)
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 150);
  return date >= minDate;
};

// Shared member form schema
export const memberFormSchema = z.object({
  // Required fields (Section A)
  full_name: z.string().min(2, "Name must be at least 2 characters").max(100),
  phone: z.string().min(8, "Phone number is required").max(20),
  gender: z.enum(["male", "female", "prefer_not_to_say"], {
    required_error: "Please select your gender",
    invalid_type_error: "Please select your gender",
  }),
  date_of_birth: z.string()
    .min(1, "Date of birth is required")
    .refine(validateDateOfBirth, "Please enter a valid date of birth"),
  day_born: z.enum(["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]).optional().nullable(),
  membership_status: z.enum(["active", "inactive", "transferred"]),
  branch_id: z.string().min(1, "Please select a branch"),
  
  // Optional fields (Section B - Church Connection)
  group_ids: z.array(z.string()).optional(),
  member_type: z.enum(["regular", "occasional", "worker"]).optional().nullable(),
  how_heard: z.enum(["friend_family", "social_media", "walk_in", "outreach", "other"]).optional().nullable(),
  
  // Optional fields (Section C - Location & Life Stage)
  residential_area: z.string().max(100).optional().nullable(),
  marital_status: z.enum(["single", "married", "divorced", "widowed"]).optional().nullable(),
  occupation: z.enum(["student", "public_sector", "private_sector", "self_employed", "unemployed", "other"]).optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  
  // Spiritual Journey - required, at least one must be selected
  spiritual_journey_ids: z.array(z.string()).min(1, "Please select at least one spiritual journey option"),
  
  // Optional fields (Section D - Spiritual Journey)
  is_baptized: z.boolean().optional().nullable(),
  
  // Emergency Contact fields
  emergency_contact_name: z.string().max(100).optional().nullable(),
  emergency_contact_phone: z.string().max(20).optional().nullable(),
  emergency_contact_relationship: z.string().max(50).optional().nullable(),
  
  // Admin-only fields
  admin_notes: z.string().max(1000).optional().nullable(),
  
  // Date joined - required, defaults to today
  date_joined: z.string().min(1, "Date joined is required"),
});

// Schema for editing members - allows empty optional fields for data quality handling
// (existing members may not have all fields filled in)
export const memberEditSchema = memberFormSchema.extend({
  // Make gender optional for editing (existing members may not have it set)
  // but require it to be valid if provided
  gender: z.enum(["male", "female", "prefer_not_to_say"]).optional(),
  date_of_birth: z.string().optional().refine(
    (val) => !val || validateDateOfBirth(val),
    "Please enter a valid date of birth"
  ),
  // Spiritual journey can be empty for existing members
  spiritual_journey_ids: z.array(z.string()).optional(),
});

// Schema for self-registration (without branch_id - it's auto-filled)
export const selfRegisterSchema = memberFormSchema.omit({ branch_id: true }).extend({
  // PIN fields for self-registration (4 digits, padded internally)
  pin: z.string().length(4, "PIN must be exactly 4 digits"),
  confirmPin: z.string(),
  // Spiritual journey is required for self-registration too
  spiritual_journey_ids: z.array(z.string()).min(1, "Please select at least one spiritual journey option"),
}).refine((data) => data.pin === data.confirmPin, {
  message: "PINs don't match",
  path: ["confirmPin"],
});

export type MemberFormData = z.infer<typeof memberFormSchema>;
export type MemberEditFormData = z.infer<typeof memberEditSchema>;
export type SelfRegisterFormData = z.infer<typeof selfRegisterSchema>;
