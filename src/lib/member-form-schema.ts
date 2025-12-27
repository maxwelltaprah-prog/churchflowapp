import { z } from "zod";

// Shared member form schema
export const memberFormSchema = z.object({
  // Required fields (Section A)
  full_name: z.string().min(2, "Name must be at least 2 characters").max(100),
  phone: z.string().min(8, "Phone number is required").max(20),
  gender: z.enum(["male", "female", "prefer_not_to_say"]),
  date_of_birth: z.string().min(1, "Date of birth is required"),
  membership_status: z.enum(["member", "visitor", "new_convert", "first_timer"]),
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
  
  // Admin-only fields
  admin_notes: z.string().max(1000).optional().nullable(),
  date_joined: z.string().optional().nullable(),
});

// Schema for self-registration (without branch_id - it's auto-filled)
export const selfRegisterSchema = memberFormSchema.omit({ branch_id: true }).extend({
  // PIN fields for self-registration
  pin: z.string().min(4, "PIN must be at least 4 digits").max(6),
  confirmPin: z.string(),
}).refine((data) => data.pin === data.confirmPin, {
  message: "PINs don't match",
  path: ["confirmPin"],
});

export type MemberFormData = z.infer<typeof memberFormSchema>;
export type SelfRegisterFormData = z.infer<typeof selfRegisterSchema>;
