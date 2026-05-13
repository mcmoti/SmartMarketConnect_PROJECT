import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, X, FileText, Building2, ChevronRight, Check, Percent } from "lucide-react";
import { useApplyForLoan, useCreditors } from "@/hooks/useFarmerData";
import { userProfileService } from "@/integrations/django/services";
import type { CreditorProfile } from "@/integrations/django/services/creditService";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "select-creditor" | "fill-form";

const LoanApplicationDialog = ({ open, onOpenChange }: Props) => {
  const applyForLoan = useApplyForLoan();
  const { data: creditors = [], isLoading: creditorsLoading } = useCreditors();

  const [step, setStep] = useState<Step>("select-creditor");
  const [selectedCreditor, setSelectedCreditor] = useState<CreditorProfile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [docUrls, setDocUrls] = useState<string[]>([]);
  const [form, setForm] = useState({
    amount: "",
    purpose: "",
    duration_months: "12",
    collateral_description: "",
    collateral_value: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setUploading(true);
    try {
      const uploaded = await userProfileService.uploadFiles(Array.from(e.target.files));
      setDocUrls((prev) => [...prev, ...uploaded.map((file) => file.url)]);
    } finally {
      setUploading(false);
    }
  };

  const removeDoc = (idx: number) => {
    setDocUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset everything when dialog closes
    setTimeout(() => {
      setStep("select-creditor");
      setSelectedCreditor(null);
      setForm({ amount: "", purpose: "", duration_months: "12", collateral_description: "", collateral_value: "" });
      setDocUrls([]);
    }, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCreditor) return;
    applyForLoan.mutate(
      {
        amount: parseFloat(form.amount),
        purpose: form.purpose,
        target_creditor: selectedCreditor.creditor_id,
        duration_months: parseInt(form.duration_months, 10),
        supporting_documents: docUrls.length > 0 ? docUrls : undefined,
        collateral_description: form.collateral_description || undefined,
        collateral_value: form.collateral_value ? parseFloat(form.collateral_value) : undefined,
      },
      {
        onSuccess: () => {
          handleClose();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "select-creditor" ? "Select a Lender" : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep("select-creditor")}
                  className="text-muted-foreground hover:text-foreground transition-colors text-sm font-normal underline underline-offset-2"
                >
                  ← Change lender
                </button>
                <span className="text-muted-foreground">·</span>
                <span>{selectedCreditor?.name}</span>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* ── Step 1: Pick a Creditor ── */}
        {step === "select-creditor" && (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 pb-4">
            {creditorsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : creditors.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No lenders are currently accepting applications.</p>
              </div>
            ) : (
              creditors.map((creditor) => (
                <button
                  key={creditor.id}
                  type="button"
                  onClick={() => {
                    setSelectedCreditor(creditor);
                    setStep("fill-form");
                  }}
                  className={`w-full text-left rounded-xl border p-4 transition-all hover:border-primary hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                    selectedCreditor?.id === creditor.id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Logo / initials */}
                    <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {creditor.logo ? (
                        <img src={creditor.logo} alt={creditor.name} className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="h-5 w-5 text-primary" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-foreground truncate">{creditor.name}</p>
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                      {creditor.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{creditor.description}</p>
                      )}

                      {/* Loan range */}
                      <p className="text-xs text-muted-foreground mt-1">
                        Loan range: KES {Number(creditor.min_loan_amount).toLocaleString()} –{" "}
                        {Number(creditor.max_loan_amount).toLocaleString()}
                      </p>

                      {/* Interest rates */}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {[
                          { label: "Prime", value: creditor.rates.prime, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                          { label: "Low risk", value: creditor.rates.low, color: "bg-blue-50 text-blue-700 border-blue-200" },
                          { label: "Medium risk", value: creditor.rates.medium, color: "bg-amber-50 text-amber-700 border-amber-200" },
                          { label: "High risk", value: creditor.rates.high, color: "bg-red-50 text-red-700 border-red-200" },
                        ].map((rate) => (
                          <span
                            key={rate.label}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${rate.color}`}
                          >
                            <Percent className="h-3 w-3" />
                            {rate.value}% {rate.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* ── Step 2: Application Form ── */}
        {step === "fill-form" && selectedCreditor && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Creditor summary */}
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {selectedCreditor.logo ? (
                  <img src={selectedCreditor.logo} alt={selectedCreditor.name} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="h-4 w-4 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{selectedCreditor.name}</p>
                <p className="text-xs text-muted-foreground">
                  Rates: {selectedCreditor.rates.prime}%–{selectedCreditor.rates.high}% · Max KES{" "}
                  {Number(selectedCreditor.max_loan_amount).toLocaleString()}
                </p>
              </div>
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
            </div>

            {/* Amount & Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Loan Amount (KES)</Label>
                <Input
                  name="amount"
                  type="number"
                  required
                  min={Number(selectedCreditor.min_loan_amount) || 1000}
                  max={Number(selectedCreditor.max_loan_amount) || undefined}
                  step={500}
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="e.g. 50000"
                />
                <p className="text-xs text-muted-foreground mt-0.5">
                  Min: KES {Number(selectedCreditor.min_loan_amount).toLocaleString()}
                </p>
              </div>
              <div>
                <Label>Duration</Label>
                <select
                  name="duration_months"
                  value={form.duration_months}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {[3, 6, 12, 18, 24, 36].map((m) => (
                    <option key={m} value={m}>{m} months</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Purpose */}
            <div>
              <Label>Purpose</Label>
              <Textarea
                name="purpose"
                required
                value={form.purpose}
                onChange={handleChange}
                placeholder="What will the loan be used for?"
                rows={3}
              />
            </div>

            {/* Collateral */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Collateral Description</Label>
                <Input
                  name="collateral_description"
                  value={form.collateral_description}
                  onChange={handleChange}
                  placeholder="e.g. 5-acre farm"
                />
              </div>
              <div>
                <Label>Collateral Value (KES)</Label>
                <Input
                  name="collateral_value"
                  type="number"
                  min={0}
                  value={form.collateral_value}
                  onChange={handleChange}
                  placeholder="e.g. 200000"
                />
              </div>
            </div>

            {/* Document Upload */}
            <div>
              <Label>Collateral Documents</Label>
              <div className="mt-1 space-y-2">
                {docUrls.map((url, i) => (
                  <div key={i} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                    <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm text-foreground truncate flex-1">Document {i + 1}</span>
                    <button type="button" onClick={() => removeDoc(i)} className="text-destructive hover:text-destructive/80">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed border-border cursor-pointer hover:border-primary transition-colors">
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Upload className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {uploading ? "Uploading..." : "Upload documents (title deed, ID, etc.)"}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    multiple
                    className="hidden"
                    onChange={handleDocUpload}
                    disabled={uploading}
                  />
                </label>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Upload proof of collateral to improve your credit assessment
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setStep("select-creditor")}>
                Back
              </Button>
              <Button type="submit" disabled={applyForLoan.isPending || uploading}>
                {applyForLoan.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Submit Application
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LoanApplicationDialog;
