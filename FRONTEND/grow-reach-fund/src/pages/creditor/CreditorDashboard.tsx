import { Suspense, lazy, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  TrendingUp,
  User,
  ArrowRightLeft,
  Home,
  Store,
  MessageSquare,
  Menu,
  Banknote,
  Loader2
} from "lucide-react";
import smcLogo from "@/assets/smc-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { useCreditRequests } from "@/hooks/useCredit";
import UserProfileDialog from "@/components/layout/UserProfileDialog";
import ApplicantDossierDialog from "@/components/creditor/ApplicantDossierDialog";

const PortfolioChart = lazy(() => import("@/components/analytics/PortfolioChart"));

type Tab = "loans" | "scoring" | "portfolio";

const badgeStyles: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  approved: "bg-primary/10 text-primary",
  rejected: "bg-destructive/10 text-destructive",
  disbursed: "bg-accent/20 text-accent-foreground",
  under_review: "bg-accent/20 text-accent-foreground",
};

const CreditorDashboard = () => {
  const [activeTab, setActiveTab] = useState<Tab>("loans");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const { data: loans = [], isLoading } = useCreditRequests();
  
  const [selectedLoanId, setSelectedLoanId] = useState<number | null>(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const filteredLoans = loans.filter((loan) => {
    const farmerName = loan.farmer_name ?? "";
    return (
      farmerName.toLowerCase().includes(search.toLowerCase()) ||
      loan.purpose.toLowerCase().includes(search.toLowerCase())
    );
  });

  const portfolioData = useMemo(() => [
    { name: "Approved", value: loans.filter((loan) => loan.status === "approved" || loan.status === "disbursed").length, color: "hsl(152, 45%, 28%)" },
    { name: "Pending", value: loans.filter((loan) => loan.status === "pending" || loan.status === "under_review").length, color: "hsl(38, 72%, 56%)" },
    { name: "Rejected", value: loans.filter((loan) => loan.status === "rejected").length, color: "hsl(0, 72%, 51%)" },
  ], [loans]);

  const avgScore = loans.length > 0
    ? Math.round(loans.reduce((sum, loan) => sum + Number(loan.credit_score || 0), 0) / loans.length)
    : 0;

  const totalPortfolio = loans.reduce((sum, loan) => sum + Number(loan.amount || loan.amount_requested || 0), 0);

  const loader = (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/80 pb-20 font-sans relative z-0">
      <div className="fixed inset-0 z-[-1] opacity-80 bg-[url('/farmpics/COFFEE.jpg')] bg-cover bg-center bg-no-repeat pointer-events-none" />
      {/* Header */}
      <header className="px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserProfileDialog />
          <span className="font-bold text-lg text-foreground tracking-tight ml-1">SMC</span>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:bg-[#E8F5E9] hover:text-[#205E41]">
          <ArrowRightLeft className="h-5 w-5" />
        </Button>
      </header>

      <div className="px-4 space-y-6">
        <h1 className="text-2xl font-bold text-[#1a4a33] tracking-tight">Creditor Dashboard</h1>

        {/* Top Dark Green Card */}
        <div className="bg-[#205E41] rounded-[24px] p-6 text-white shadow-md leading-none">
          <p className="text-[10px] uppercase font-semibold text-white/70 tracking-widest mb-1.5">Total Lent</p>
          <h2 className="text-3xl font-bold mb-8">KES {totalPortfolio.toLocaleString()}</h2>
          
          <div className="flex justify-between items-end border-t border-white/10 pt-4">
            <div>
              <p className="text-[10px] uppercase font-semibold text-white/70 tracking-widest mb-1">Year To Date</p>
              <p className="font-bold text-sm">+12.4%</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-semibold text-white/70 tracking-widest mb-1">Active Loans</p>
              <p className="font-bold text-sm">{loans.filter((l) => l.status === "disbursed" || l.status === "approved").length}</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#F3F4F6] rounded-[20px] p-5">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2">Pending Approvals</p>
            <p className="text-2xl font-bold text-[#A56324] flex items-baseline gap-1">
              {loans.filter((l) => l.status === "pending" || l.status === "under_review").length} <span className="text-xs font-medium text-muted-foreground">Requests</span>
            </p>
          </div>
          <div className="bg-[#F3F4F6] rounded-[20px] p-5">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2">Portfolio Risk</p>
            <p className="text-2xl font-bold text-[#205E41] flex items-center gap-2">
              2.4% <span className="text-[10px] bg-green-200 text-green-900 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Low</span>
            </p>
          </div>
        </div>

        {/* Pending Loan Requests */}
        <div>
          <div className="flex justify-between items-baseline mb-4">
            <div>
              <h3 className="font-bold text-foreground text-lg tracking-tight">Pending Loan Requests</h3>
              <p className="text-sm text-muted-foreground">Review and action new farmer applications.</p>
            </div>
            <button className="text-sm font-bold text-[#205E41] flex items-center gap-1">
              View All &rarr;
            </button>
          </div>

        {isLoading ? loader : activeTab === "portfolio" && false ? null : filteredLoans.length === 0 ? (
          <div className="bg-white rounded-[24px] border border-border text-center py-20 text-muted-foreground">
            <Banknote className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No loan applications found.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredLoans.map((loan) => {
              const farmerProfile = ((loan as any).farmer_profile_data?.farmer_profile ?? {}) as Record<string, unknown>;
              const crops = Array.isArray(farmerProfile.crops) ? farmerProfile.crops.join(", ") : "-";

              return (
                <div key={loan.id} className="bg-white rounded-[24px] shadow-sm border border-border/50 p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-14 w-14 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                      {/* Placeholder for actual farmer avatar */}
                      <User className="h-full w-full text-slate-400 p-2" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">{loan.farmer_name ?? "Farmer Name"}</h3>
                      <p className="text-xs text-muted-foreground">{crops} &bull; {String(farmerProfile.location ?? "Nakuru")}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Requested</p>
                      <p className="font-bold text-sm text-foreground">KES {Number(loan.amount || loan.amount_requested).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Credit Score</p>
                      <p className="font-bold text-sm flex items-center gap-2">
                        {loan.credit_score} <span className="h-2 w-2 rounded-full bg-[#205E41]"></span><span className="text-[9px] uppercase tracking-wider text-[#205E41]">Low Risk</span>
                      </p>
                    </div>
                  </div>

                  {loan.status === "pending" || loan.status === "under_review" ? (
                    <div className="grid grid-cols-1 gap-3">
                      <Button
                        className="rounded-full h-11 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground w-full"
                        onClick={() => {
                          setSelectedLoanId(loan.id);
                          setIsDossierOpen(true);
                        }}
                      >
                        Review Application
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-center text-sm font-semibold capitalize text-muted-foreground">
                       {loan.status}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Agricultural Market Trends */}
        <div className="bg-[#EAECEB] rounded-[24px] p-6 mb-8 hidden md:block">
           <h3 className="font-bold text-foreground flex items-center gap-2 mb-4"><TrendingUp className="h-5 w-5 text-[#205E41]" /> Agricultural Market Trends</h3>
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-[16px] p-4">
                 <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Maize Price</p>
                 <p className="font-bold text-[#205E41]">+2.1%</p>
              </div>
              <div className="bg-white rounded-[16px] p-4">
                 <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Fertilizer Cost</p>
                 <p className="font-bold text-destructive">-0.4%</p>
              </div>
              <div className="bg-white rounded-[16px] p-4">
                 <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Fuel Index</p>
                 <p className="font-bold text-[#A56324]">+1.8%</p>
              </div>
              <div className="bg-white rounded-[16px] p-4">
                 <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Yield Forecast</p>
                 <p className="font-bold text-[#205E41]">Strong</p>
              </div>
           </div>
        </div>
      </div>

      </div>
      
      {/* Dossier Review Dialog */}
      <ApplicantDossierDialog 
        loanId={selectedLoanId}
        open={isDossierOpen}
        onOpenChange={(open) => {
          setIsDossierOpen(open);
          if (!open) setTimeout(() => setSelectedLoanId(null), 300);
        }}
      />
    </div>
  );
};

export default CreditorDashboard;
