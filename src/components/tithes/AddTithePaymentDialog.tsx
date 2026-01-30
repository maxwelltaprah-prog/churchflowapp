import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useTitheMutations, useTitheSettings } from "@/hooks/useTitheData";
import { useMembers } from "@/hooks/useChurchData";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

const formSchema = z.object({
  member_id: z.string().min(1, "Please select a member"),
  amount: z.number().positive("Amount must be greater than 0"),
  payment_date: z.date(),
  period_month: z.number().min(1).max(12),
  period_year: z.number().min(2000).max(2100),
  payment_method: z.enum(["cash", "momo", "bank", "card", "other"]),
  reference_note: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddTithePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedMemberId?: string;
}

export function AddTithePaymentDialog({ open, onOpenChange, preselectedMemberId }: AddTithePaymentDialogProps) {
  const [memberSearchOpen, setMemberSearchOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [saveAndAddAnother, setSaveAndAddAnother] = useState(false);

  const { data: members } = useMembers();
  const { data: settings } = useTitheSettings();
  const { addPayment } = useTitheMutations();

  const now = new Date();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      member_id: preselectedMemberId || "",
      amount: 0,
      payment_date: now,
      period_month: now.getMonth() + 1,
      period_year: now.getFullYear(),
      payment_method: "cash",
      reference_note: "",
    },
  });

  const selectedMember = members?.find((m) => m.id === form.watch("member_id"));

  const filteredMembers = members?.filter((member) => {
    if (!memberSearch) return true;
    const searchLower = memberSearch.toLowerCase();
    return (
      member.full_name.toLowerCase().includes(searchLower) ||
      member.member_code?.toLowerCase().includes(searchLower) ||
      member.phone?.includes(searchLower)
    );
  });

  const onSubmit = async (values: FormValues) => {
    const member = members?.find((m) => m.id === values.member_id);
    if (!member) return;

    await addPayment.mutateAsync({
      member_id: values.member_id,
      branch_id: member.branch_id,
      amount: values.amount,
      currency: settings?.default_currency || "GHS",
      payment_date: format(values.payment_date, "yyyy-MM-dd"),
      period_month: values.period_month,
      period_year: values.period_year,
      payment_method: values.payment_method,
      reference_note: values.reference_note,
    });

    if (saveAndAddAnother) {
      form.reset({
        member_id: "",
        amount: 0,
        payment_date: now,
        period_month: now.getMonth() + 1,
        period_year: now.getFullYear(),
        payment_method: "cash",
        reference_note: "",
      });
      setSaveAndAddAnother(false);
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Tithe Payment</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Member Selection */}
            <FormField
              control={form.control}
              name="member_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Member</FormLabel>
                  <Popover open={memberSearchOpen} onOpenChange={setMemberSearchOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {selectedMember ? selectedMember.full_name : "Select member..."}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[350px] p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Search by name, code, or phone..."
                          value={memberSearch}
                          onValueChange={setMemberSearch}
                        />
                        <CommandList>
                          <CommandEmpty>No member found.</CommandEmpty>
                          <CommandGroup className="max-h-[200px] overflow-auto">
                            {filteredMembers?.slice(0, 50).map((member) => (
                              <CommandItem
                                key={member.id}
                                value={member.id}
                                onSelect={() => {
                                  form.setValue("member_id", member.id);
                                  setMemberSearchOpen(false);
                                  setMemberSearch("");
                                }}
                              >
                                <div className="flex flex-col">
                                  <span>{member.full_name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {member.member_code} • {member.phone || "No phone"}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount ({settings?.default_currency || "GHS"})</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Period */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="period_month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period Month</FormLabel>
                    <Select
                      value={field.value.toString()}
                      onValueChange={(v) => field.onChange(parseInt(v))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MONTHS.map((month) => (
                          <SelectItem key={month.value} value={month.value.toString()}>
                            {month.label}
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
                name="period_year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period Year</FormLabel>
                    <Select
                      value={field.value.toString()}
                      onValueChange={(v) => field.onChange(parseInt(v))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {YEARS.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Payment Date */}
            <FormField
              control={form.control}
              name="payment_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? format(field.value, "PPP") : "Select date"}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Method */}
            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="momo">Mobile Money</SelectItem>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reference Note */}
            <FormField
              control={form.control}
              name="reference_note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference Note (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Receipt number, transaction ID, etc."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSaveAndAddAnother(true);
                  form.handleSubmit(onSubmit)();
                }}
                disabled={addPayment.isPending}
              >
                Save & Add Another
              </Button>
              <Button type="submit" disabled={addPayment.isPending}>
                {addPayment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Payment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
