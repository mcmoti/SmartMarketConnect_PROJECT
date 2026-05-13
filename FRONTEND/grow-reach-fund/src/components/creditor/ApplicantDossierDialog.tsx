import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApplicantDossier, useApproveCreditRequest, useRejectCreditRequest } from "@/hooks/useCredit";
import { CreditRequest } from "@/integrations/django/services/creditService";
import { User, FileText, Briefcase, TrendingUp, DollarSign, Shield, Paperclip } from "lucide-react";
import { useState } from "react";
import { resolveImageUrl } from "@/utils/imageUtils";

interface Props {
  loanId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ApplicantDossierDialog({ loanId, open, onOpenChange }: Props) {
  const { data: dossier, isLoading } = useApplicantDossier(loanId);
  const approveLoan = useApproveCreditRequest();
  const rejectLoan = useRejectCreditRequest();

  const handleApprove = async () => {
    if (!loanId) return;
    await approveLoan.mutateAsync({ id: loanId });
    onOpenChange(false);
  };

  const handleReject = async () => {
    if (!loanId) return;
    await rejectLoan.mutateAsync({ id: loanId, reason: "Rejected after dossier review" });
    onOpenChange(false);
  };

  if (!loanId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[90vw]">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-2xl font-display font-bold">Applicant Dossier & Financial Statements</DialogTitle>
          <DialogDescription>
            Comprehensive review of the applicant's profile, collateral, and transaction history.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !dossier ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-[200px] w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Applicant Profile */}
            <div className="flex flex-col md:flex-row gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <div className="h-24 w-24 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                {dossier.farmer.profile_image ? (
                  <img src={dossier.farmer.profile_image} className="h-full w-full object-cover" alt="Farmer" />
                ) : (
                  <User className="h-12 w-12 text-slate-400" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="text-xl font-bold">{dossier.farmer.full_name}</h3>
                <p className="text-sm text-slate-500">
                  {dossier.farmer.location} &bull; Joined {dossier.farmer.days_on_platform} days ago
                </p>
                <p className="text-sm border-l-2 border-primary pl-3 text-slate-700 italic">
                  "{dossier.farmer.bio || "No bio provided."}"
                </p>
              </div>

              {/* Loan Synopsis */}
              <div className="bg-white p-4 rounded-xl border shadow-sm min-w-[200px] flex flex-col justify-center">
                 <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Requested Amount</p>
                 <p className="text-2xl font-bold text-primary">KES {Number(dossier.loan.amount_requested).toLocaleString()}</p>
                 <div className="mt-2 text-xs font-medium px-2 py-1 bg-amber-100 text-amber-800 rounded-full inline-flex w-fit">
                    {dossier.loan.duration_months} Months Term
                 </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Financial Statements */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <TrendingUp className="text-emerald-600 h-5 w-5" />
                  <h4 className="font-bold text-lg">Financial Statements</h4>
                </div>
                
                {dossier.credit_score ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100/50">
                       <p className="text-[10px] uppercase font-bold text-emerald-800/60 mb-1">Total Sales Volume</p>
                       <p className="text-lg font-bold text-emerald-900">KES {Number(dossier.credit_score.total_sales_volume).toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100/50">
                       <p className="text-[10px] uppercase font-bold text-emerald-800/60 mb-1">Complete Trades</p>
                       <p className="text-lg font-bold text-emerald-900">{dossier.credit_score.completed_trades}</p>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100/50">
                       <p className="text-[10px] uppercase font-bold text-emerald-800/60 mb-1">Avg Cashflow/Month</p>
                       <p className="text-lg font-bold text-emerald-900">KES {Number(dossier.credit_score.avg_monthly_cashflow).toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100/50">
                       <p className="text-[10px] uppercase font-bold text-emerald-800/60 mb-1">Credit Score</p>
                       <p className="text-lg font-bold text-emerald-900">{dossier.credit_score.overall_score} / 100</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">No financial history available yet.</p>
                )}
              </div>

              {/* Collateral & Purpose */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <Shield className="text-indigo-600 h-5 w-5" />
                  <h4 className="font-bold text-lg">Collateral & Purpose</h4>
                </div>

                <div className="bg-indigo-50/50 p-4 rounded-xl space-y-4 border border-indigo-100/50">
                  <div>
                    <p className="text-xs font-semibold text-indigo-900/60 mb-1 uppercase tracking-wider">Loan Purpose</p>
                    <p className="text-sm text-indigo-950">{dossier.loan.purpose}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 mb-1">Declared Collateral</p>
                    <p className="text-sm font-medium">{dossier.loan.collateral_description || "None provided"}</p>
                    {dossier.loan.collateral_value && (
                      <p className="text-xs text-slate-500 mt-2 border-t pt-2">
                        Estimated Value: <span className="font-bold text-slate-700">KES {Number(dossier.loan.collateral_value).toLocaleString()}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Documentation & Assets */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b pb-2">
                <Paperclip className="text-amber-600 h-5 w-5" />
                <h4 className="font-bold text-lg">Supporting Documents</h4>
              </div>

               {dossier.loan.supporting_documents && dossier.loan.supporting_documents.length > 0 ? (
                 <div className="flex flex-wrap gap-3">
                   {dossier.loan.supporting_documents.map((doc, idx) => (
                      <a key={idx} href={resolveImageUrl(doc)} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-3 bg-white border rounded-xl hover:border-amber-400 hover:bg-amber-50 transition-colors shadow-sm">
                         <FileText className="h-5 w-5 text-amber-500" />
                         <span className="text-sm font-medium">Document {idx + 1}</span>
                      </a>
                   ))}
                 </div>
              ) : (
                <p className="text-sm text-slate-500 italic p-4 bg-slate-50 rounded-xl">No documentation was uploaded by the farmer.</p>
              )}
            </div>

            {/* Active Products Context */}
            <div className="space-y-4">
               <h4 className="font-bold text-sm text-slate-400 uppercase tracking-widest">Active Marketplace Stocks</h4>
               <div className="flex flex-wrap gap-2">
                  {dossier.products.length > 0 ? dossier.products.map(p => (
                     <span key={p.id} className="text-xs px-3 py-1.5 bg-slate-100 rounded-full border text-slate-600 font-medium">
                        {p.name} ({p.quantity} {p.unit})
                     </span>
                  )) : (
                     <span className="text-xs text-slate-400">No active products currently.</span>
                  )}
               </div>
            </div>

            {/* Action Bar */}
            <div className="pt-6 border-t mt-8 flex justify-end gap-4 bg-white sticky bottom-0 py-4 -mb-6">
              <Button 
                variant="outline" 
                size="lg" 
                onClick={handleReject} 
                disabled={rejectLoan.isPending || approveLoan.isPending}
              >
                {rejectLoan.isPending ? "Rejecting..." : "Reject Loan"}
              </Button>
              <Button 
                size="lg" 
                className="bg-emerald-700 hover:bg-emerald-800"
                onClick={handleApprove}
                disabled={approveLoan.isPending || rejectLoan.isPending}
              >
                {approveLoan.isPending ? "Approving..." : "Approve Loan"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
