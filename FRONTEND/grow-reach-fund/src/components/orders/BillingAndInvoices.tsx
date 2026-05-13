import { useInvoices, useReceipts, Receipt, Invoice } from "@/hooks/useOrders";
import { FileText, Receipt as ReceiptIcon, Loader2, Download, AlertCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { TransactionDocumentDialog } from "./TransactionDocumentDialog";
import { TransactionDocumentProps } from "../TransactionDocument";

export const BillingAndInvoices = ({ role }: { role: "buyer" | "farmer" }) => {
  const { data: invoices = [], isLoading: loadingInvoices } = useInvoices();
  const { data: receipts = [], isLoading: loadingReceipts } = useReceipts();
  const [selectedDoc, setSelectedDoc] = useState<TransactionDocumentProps | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openReceipt = (receipt: Receipt) => {
    setSelectedDoc({
      type: "RECEIPT",
      documentNumber: receipt.receipt_number,
      date: receipt.created_at,
      buyerName: receipt.buyer_name || "Buyer",
      farmerName: receipt.farmer_name || "SMC Farmer",
      items: [
        {
          description: receipt.crop_name || "Assorted Items",
          quantity: receipt.quantity || 1,
          unitPrice: receipt.unit_price || Number(receipt.amount),
          amount: Number(receipt.amount),
        }
      ],
      subtotal: Number(receipt.amount),
      total: Number(receipt.amount),
      signatureName: receipt.farmer_name || "SMC Farmer"
    });
    setDialogOpen(true);
  };

  const openInvoice = (invoice: Invoice) => {
    setSelectedDoc({
      type: "INVOICE",
      documentNumber: invoice.invoice_number || `INV-${invoice.id}`,
      date: invoice.created_at,
      dueDate: invoice.due_date || undefined,
      buyerName: invoice.buyer_name || "Buyer",
      farmerName: invoice.farmer_name || "SMC Farmer",
      items: [
        {
          description: invoice.crop_name || "Assorted Items",
          quantity: 1, // Quantity not directly on invoice, we can default or fetch
          unitPrice: Number(invoice.total_amount),
          amount: Number(invoice.total_amount),
        }
      ],
      subtotal: Number(invoice.total_amount),
      total: Number(invoice.total_amount),
      signatureName: invoice.farmer_name || "SMC Farmer"
    });
    setDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case "paid": return "bg-primary/20 text-primary";
      case "partial": return "bg-accent/20 text-accent-foreground";
      case "unpaid": return "bg-destructive/20 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (loadingInvoices || loadingReceipts) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Receipts Section */}
      <div className="bg-card rounded-xl shadow-soft border border-border p-6">
        <div className="flex items-center gap-2 border-b border-border pb-4 mb-4">
          <ReceiptIcon className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Transaction Receipts</h3>
        </div>

        {receipts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ReceiptIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No receipts generated yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left p-3">Receipt No.</th>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Method</th>
                  <th className="text-left p-3">Amount</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map(receipt => (
                  <tr key={receipt.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="p-3 font-medium">{receipt.receipt_number}</td>
                    <td className="p-3 text-muted-foreground">{new Date(receipt.created_at).toLocaleDateString()}</td>
                    <td className="p-3 text-muted-foreground">{receipt.payment_method}</td>
                    <td className="p-3 font-semibold text-primary">KES {Number(receipt.amount).toLocaleString()}</td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => openReceipt(receipt)}>
                        <Download className="h-4 w-4 mr-1" /> PDF
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoices Section */}
      <div className="bg-card rounded-xl shadow-soft border border-border p-6">
        <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Invoices ({role === "buyer" ? "Debts" : "Receivables"})</h3>
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No active invoices or debts.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {invoices.map(invoice => (
              <div key={invoice.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border border-border rounded-lg bg-card">
                <div>
                  <h4 className="font-semibold text-foreground">
                    {role === "buyer" ? `To: ${invoice.farmer_name}` : `From: ${invoice.buyer_name}`}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Order for {invoice.crop_name || "Assorted Items"}
                  </p>
                  <div className="text-xs text-muted-foreground mt-2">
                    Total: KES {Number(invoice.total_amount).toLocaleString()} • Paid: KES {Number(invoice.amount_paid).toLocaleString()}
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <p className="text-xs text-muted-foreground">Balance Due</p>
                    <p className="text-lg font-bold text-destructive">KES {Number(invoice.balance_due).toLocaleString()}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(invoice.status)}`}>
                      {invoice.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openInvoice(invoice)}>
                      <Eye className="h-4 w-4 mr-1" /> View
                    </Button>
                    {role === "buyer" && invoice.status !== "paid" && (
                      <Button variant="outline" size="sm">Pay Balance</Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TransactionDocumentDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        documentData={selectedDoc} 
      />
    </div>
  );
};
