import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { type TithePayment, useTitheSettings } from "@/hooks/useTitheData";
import { useChurch } from "@/hooks/useChurchData";
import { format } from "date-fns";
import { Printer, Download } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

interface TitheReceiptDialogProps {
  payment: TithePayment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TitheReceiptDialog({ payment, open, onOpenChange }: TitheReceiptDialogProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { data: church } = useChurch();
  const { data: settings } = useTitheSettings();

  const formatCurrency = (amount: number) => {
    const currency = settings?.default_currency || "GHS";
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Tithe Receipt</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              max-width: 400px;
              margin: 0 auto;
            }
            .receipt {
              border: 2px solid #333;
              padding: 20px;
              border-radius: 8px;
            }
            .header {
              text-align: center;
              border-bottom: 1px dashed #ccc;
              padding-bottom: 15px;
              margin-bottom: 15px;
            }
            .church-name {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .receipt-title {
              font-size: 14px;
              color: #666;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .details {
              margin: 15px 0;
            }
            .row {
              display: flex;
              justify-content: space-between;
              margin: 8px 0;
              font-size: 14px;
            }
            .label {
              color: #666;
            }
            .value {
              font-weight: 500;
            }
            .amount-row {
              border-top: 1px dashed #ccc;
              border-bottom: 1px dashed #ccc;
              padding: 12px 0;
              margin: 15px 0;
            }
            .amount {
              font-size: 24px;
              font-weight: bold;
              text-align: center;
            }
            .footer {
              text-align: center;
              font-size: 12px;
              color: #666;
              margin-top: 15px;
            }
            .status {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
            }
            .status-paid {
              background: #dcfce7;
              color: #166534;
            }
            .status-reversed {
              background: #fee2e2;
              color: #991b1b;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tithe Receipt</DialogTitle>
        </DialogHeader>

        <div ref={receiptRef} className="receipt border-2 border-border rounded-lg p-6 bg-card">
          {/* Header */}
          <div className="header text-center border-b border-dashed pb-4 mb-4">
            <div className="church-name text-xl font-bold">{church?.name}</div>
            <div className="receipt-title text-sm text-muted-foreground uppercase tracking-wider mt-1">
              Tithe Payment Receipt
            </div>
          </div>

          {/* Details */}
          <div className="details space-y-3">
            <div className="row flex justify-between text-sm">
              <span className="label text-muted-foreground">Receipt ID:</span>
              <span className="value font-mono text-xs">{payment.id.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="row flex justify-between text-sm">
              <span className="label text-muted-foreground">Member:</span>
              <span className="value font-medium">{payment.member?.full_name}</span>
            </div>
            <div className="row flex justify-between text-sm">
              <span className="label text-muted-foreground">Period:</span>
              <span className="value">{MONTHS[payment.period_month - 1]} {payment.period_year}</span>
            </div>
            <div className="row flex justify-between text-sm">
              <span className="label text-muted-foreground">Payment Date:</span>
              <span className="value">{format(new Date(payment.payment_date), "MMM d, yyyy")}</span>
            </div>
            <div className="row flex justify-between text-sm">
              <span className="label text-muted-foreground">Method:</span>
              <span className="value capitalize">{payment.payment_method}</span>
            </div>
            {payment.reference_note && (
              <div className="row flex justify-between text-sm">
                <span className="label text-muted-foreground">Reference:</span>
                <span className="value">{payment.reference_note}</span>
              </div>
            )}
          </div>

          {/* Amount */}
          <div className="amount-row border-t border-b border-dashed py-4 my-4">
            <div className="amount text-2xl font-bold text-center">
              {formatCurrency(Number(payment.amount))}
            </div>
          </div>

          {/* Status */}
          <div className="text-center mb-4">
            <span
              className={`status inline-block px-3 py-1 rounded text-xs font-semibold uppercase ${
                payment.status === "paid"
                  ? "status-paid bg-green-100 text-green-800"
                  : "status-reversed bg-red-100 text-red-800"
              }`}
            >
              {payment.status}
            </span>
          </div>

          {/* Footer */}
          <div className="footer text-center text-xs text-muted-foreground mt-4">
            <p>Thank you for your faithful giving!</p>
            <p className="mt-1">
              Generated on {format(new Date(), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
