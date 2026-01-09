import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Edit } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
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
import { useBranches } from "@/hooks/useChurchData";
import { useVisitor } from "@/hooks/useVisitorsData";
import { useUpdateVisitor } from "@/hooks/useVisitorMutations";

const DAY_BORN_OPTIONS = [
  { value: "sunday", label: "Sunday" },
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
];

const visitorFormSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(50),
  last_name: z.string().min(1, "Last name is required").max(50),
  phone: z.string().min(8, "Phone number is required").max(20),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().max(200).optional(),
  gender: z.enum(["male", "female", "prefer_not_to_say"]).optional(),
  date_of_birth: z.string().optional(),
  day_born: z.enum(["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]).optional(),
  first_visit_date: z.string().min(1, "First visit date is required"),
  how_heard: z.enum(["friend_family", "social_media", "walk_in", "outreach", "other"], {
    required_error: "Please select how they heard about us",
  }),
  branch_id: z.string().min(1, "Please select a branch"),
});

type VisitorFormData = z.infer<typeof visitorFormSchema>;

export default function EditVisitorPage() {
  const { visitorId } = useParams();
  const navigate = useNavigate();
  const { data: branches } = useBranches();
  const { data: visitor, isLoading } = useVisitor(visitorId);
  const updateVisitor = useUpdateVisitor();

  const form = useForm<VisitorFormData>({
    resolver: zodResolver(visitorFormSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      phone: "",
      email: "",
      address: "",
      gender: undefined,
      date_of_birth: "",
      day_born: undefined,
      first_visit_date: "",
      how_heard: undefined,
      branch_id: "",
    },
  });

  useEffect(() => {
    if (visitor) {
      form.reset({
        first_name: visitor.first_name,
        last_name: visitor.last_name,
        phone: visitor.phone,
        email: visitor.email || "",
        address: visitor.address || "",
        gender: visitor.gender || undefined,
        date_of_birth: visitor.date_of_birth || "",
        day_born: (visitor as any).day_born || undefined,
        first_visit_date: visitor.first_visit_date,
        how_heard: visitor.how_heard,
        branch_id: visitor.branch_id,
      });
    }
  }, [visitor, form]);

  const onSubmit = async (data: VisitorFormData) => {
    if (!visitorId) return;
    await updateVisitor.mutateAsync({
      id: visitorId,
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone,
      gender: data.gender,
      date_of_birth: data.date_of_birth || undefined,
      day_born: data.day_born || undefined,
      first_visit_date: data.first_visit_date,
      how_heard: data.how_heard,
      branch_id: data.branch_id,
      email: data.email || undefined,
      address: data.address || undefined,
    });
    navigate(`/app/visitors/${visitorId}`);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <PageHeader
        title="Edit Visitor"
        description="Update visitor information"
        icon={Edit}
        backTo={`/app/visitors/${visitorId}`}
      />

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Personal Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter first name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter last name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter phone number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="Enter email address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
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
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="day_born"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Day Born</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select day born" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DAY_BORN_OPTIONS.map((opt) => (
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

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Enter address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Visit Information */}
              <div className="space-y-4 mt-8">
                <h3 className="font-semibold text-lg border-b pb-2">Visit Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="first_visit_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Visit Date <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input {...field} type="date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="how_heard"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>How Did They Hear About Us <span className="text-destructive">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="-- Select Option --" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="friend_family">Family</SelectItem>
                            <SelectItem value="social_media">Social Media</SelectItem>
                            <SelectItem value="walk_in">Walk-in</SelectItem>
                            <SelectItem value="outreach">Outreach</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="branch_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Branch <span className="text-destructive">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select branch" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {branches?.map((branch) => (
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
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex gap-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate(`/app/visitors/${visitorId}`)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={updateVisitor.isPending}
            >
              {updateVisitor.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
