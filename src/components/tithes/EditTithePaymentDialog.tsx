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
import { format, parseISO } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useTitheMutations, useTitheSettings, type TithePayment } from "@/hooks/useTitheData";

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
  amount: z.number().positive("Amount must be greater than 0"),
  payment_date: z.date(),
  period_month: z.number().min(1).max(12),
  period_year: z.number().min(2000).max(2100),
  payment_method: z.enum(["cash", "momo", "bank", "card", "other"]),
  reference_note: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditTithePaymentDialogProps {
  payment: TithePayment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTithePaymentDialog({ payment, open, onOpenChange }: EditTithePaymentDialogProps) {
  const { data: settings } = useTitheSettings();
  const { updatePayment } = useTitheMutations();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: Number(payment.amount),
      payment_date: parseISO(payment.payment_date),
      period_month: payment.period_month,
      period_year: payment.period_year,
      payment_method: payment.payment_method,
      reference_note: payment.reference_note || "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    await updatePayment.mutateAsync({
      id: payment.id,
      member_id: payment.member_id,
      branch_id: payment.branch_id,
      amount: values.amount,
      currency: settings?.default_currency || "GHS",
      payment_date: format(values.payment_date, "yyyy-MM-dd"),
      period_month: values.period_month,
      period_year: values.period_year,
      payment_method: values.payment_method,
      reference_note: values.reference_note,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Tithe Payment</DialogTitle>
        </DialogHeader>

        <div className="bg-muted p-3 rounded-lg mb-4">
          <p className="font-medium">{payment.member?.full_name}</p>
          <p className="text-sm text-muted-foreground">{payment.member?.phone || "No phone"}</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updatePayment.isPending}>
                {updatePayment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Payment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
