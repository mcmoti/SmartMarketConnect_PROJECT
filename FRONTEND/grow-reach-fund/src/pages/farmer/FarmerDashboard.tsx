import { Suspense, lazy, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BarChart3,
  ClipboardList,
  Clock,
  CreditCard,
  Download,
  Gavel,
  Landmark,
  Loader2,
  LogOut,
  MessageSquare,
  Package,
  Plus,
  Sprout,
  Store,
  Trash2,
  TrendingUp,
  Upload,
  X,
  MapPin,
  Wheat,
  Building2,
} from "lucide-react";
import { resolveImageUrl } from "@/utils/imageUtils";
import { Checkbox } from "@/components/ui/checkbox";
import { userProfileService } from "@/integrations/django/services";
import { useAuth } from "@/contexts/AuthContext";
import { useRespondToBid, useFarmerBids } from "@/hooks/useBids";
import { useDeleteListing } from "@/hooks/useListings";
import { useFarmerOrders, useUpdateOrderStatus } from "@/hooks/useOrders";
import {
  useAddInventory,
  useAddStaffHours,
  useDeleteInventory,
  useFarmerInventory,
  useFarmerListings,
  useFarmerLoans,
  useFarmerPayments,
  useFarmerStaff,
} from "@/hooks/useFarmerData";
import OrderTracker from "@/components/orders/OrderTracker";
import CreateListingDialog from "@/components/farmer/CreateListingDialog";
import LoanApplicationDialog from "@/components/farmer/LoanApplicationDialog";
import { exportCSV, exportPDF } from "@/utils/exportUtils";

const MarketPriceCharts = lazy(() => import("@/components/marketplace/MarketPriceCharts"));
const MarketPriceBoard = lazy(() => import("@/components/marketplace/MarketPriceBoard"));
const RevenueChart = lazy(() => import("@/components/analytics/RevenueChart"));
const FarmerAnalyticsDashboard = lazy(() => import("@/components/analytics/FarmerAnalyticsDashboard"));
const InventoryCharts = lazy(() => import("@/components/farmer/InventoryCharts"));
import { BillingAndInvoices } from "@/components/orders/BillingAndInvoices";
import UserProfileDialog from "@/components/layout/UserProfileDialog";
import { SMCCopilot } from "@/components/SMCCopilot";
import LiveMarketPriceBanner from "@/components/marketplace/LiveMarketPriceBanner";

type Tab = "inventory" | "listings" | "orders" | "bids" | "payments" | "staff" | "prices" | "loans" | "analytics" | "copilot";

const tabs: { id: Tab; label: string; icon: typeof Package }[] = [
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "listings", label: "Listings", icon: Store },
  { id: "orders", label: "Orders", icon: ClipboardList },
  { id: "bids", label: "Bids", icon: Gavel },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "staff", label: "Staff", icon: Clock },
  { id: "prices", label: "Prices", icon: TrendingUp },
  { id: "loans", label: "Loans", icon: Landmark },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "copilot", label: "Copilot", icon: MessageSquare },
];

const badgeStyles: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  accepted: "bg-primary/10 text-primary",
  rejected: "bg-destructive/10 text-destructive",
  countered: "bg-accent/20 text-accent-foreground",
  checked_out: "bg-emerald-500/20 text-emerald-700",
  approved: "bg-primary/10 text-primary",
  disbursed: "bg-accent/20 text-accent-foreground",
};

const FarmerDashboard = () => {
  const [activeTab, setActiveTab] = useState<Tab>("inventory");
  const [createListingOpen, setCreateListingOpen] = useState(false);
  const [loanDialogOpen, setLoanDialogOpen] = useState(false);
  const [addInventoryOpen, setAddInventoryOpen] = useState(false);
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [invForm, setInvForm] = useState({ 
    crop: "", 
    quantity_kg: "", 
    expected_harvest_date: "", 
    notes: "",
    category: "general",
    price: "",
    location: "",
    is_listed: false
  });
  const [invPhotos, setInvPhotos] = useState<string[]>([]);
  const [invUploading, setInvUploading] = useState(false);
  const [staffForm, setStaffForm] = useState({ staff_name: "", role: "", hours: "", date: "", rate_per_hour: "" });
  const [counterBidId, setCounterBidId] = useState<number | null>(null);
  const [counterPrice, setCounterPrice] = useState("");

  const navigate = useNavigate();
  const { signOut } = useAuth();

  const { data: inventory = [], isLoading: invLoading } = useFarmerInventory();
  const addInventory = useAddInventory();
  const deleteInventory = useDeleteInventory();
  const { data: staffHours = [], isLoading: staffLoading } = useFarmerStaff();
  const addStaffHours = useAddStaffHours();
  const { data: payments = [], isLoading: paymentsLoading } = useFarmerPayments();
  const { data: listings = [], isLoading: listingsLoading } = useFarmerListings();
  const { data: loans = [], isLoading: loansLoading } = useFarmerLoans();
  const { data: farmerOrders = [], isLoading: ordersLoading } = useFarmerOrders();
  const updateOrderStatus = useUpdateOrderStatus();
  const { data: bids = [], isLoading: bidsLoading } = useFarmerBids();
  const respondToBid = useRespondToBid();
  const deleteListing = useDeleteListing();

  const totalRevenue = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const revenueByMonth = useMemo(() => {
    const grouped: Record<string, number> = {};
    payments.forEach((payment) => {
      const label = new Date(payment.date).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      grouped[label] = (grouped[label] || 0) + Number(payment.amount);
    });
    return Object.entries(grouped).map(([month, revenue]) => ({ month, revenue }));
  }, [payments]);

  const uniqueCrops = Array.from(new Set(inventory.map((item) => item.crop.toLowerCase())));

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const handleAddInventory = (e: React.FormEvent) => {
    e.preventDefault();
    addInventory.mutate(
      {
        crop: invForm.crop,
        quantity_kg: parseFloat(invForm.quantity_kg),
        expected_harvest_date: invForm.expected_harvest_date || undefined,
        notes: invForm.notes || undefined,
        photo_urls: invPhotos,
        category: invForm.category,
        price: invForm.price ? parseFloat(invForm.price) : undefined,
        location: invForm.location || undefined,
        is_listed: invForm.is_listed,
      },
      {
        onSuccess: () => {
          setInvForm({ 
            crop: "", 
            quantity_kg: "", 
            expected_harvest_date: "", 
            notes: "",
            category: "general",
            price: "",
            location: "",
            is_listed: false
          });
          setInvPhotos([]);
          setAddInventoryOpen(false);
        },
      }
    );
  };

  const handleInvPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setInvUploading(true);
    try {
      const uploaded = await userProfileService.uploadFiles(Array.from(e.target.files));
      setInvPhotos((prev) => [...prev, ...uploaded.map((f) => f.url)]);
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setInvUploading(false);
    }
  };

  const removeInvPhoto = (idx: number) => {
    setInvPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    addStaffHours.mutate(
      {
        staff_name: staffForm.staff_name,
        role: staffForm.role,
        hours: parseFloat(staffForm.hours),
        date: staffForm.date,
        rate_per_hour: staffForm.rate_per_hour ? parseFloat(staffForm.rate_per_hour) : undefined,
      },
      {
        onSuccess: () => {
          setStaffForm({ staff_name: "", role: "", hours: "", date: "", rate_per_hour: "" });
          setAddStaffOpen(false);
        },
      }
    );
  };

  const handleExport = (type: "csv" | "pdf", tab: Tab) => {
    if (tab === "inventory") {
      const headers = ["Crop", "Quantity (kg)", "Harvest Date", "Notes"];
      const rows = inventory.map((item) => [item.crop, String(item.quantity_kg), item.expected_harvest_date ?? "-", item.notes ?? ""]);
      if (type === "csv") {
        exportCSV("inventory", headers, rows);
      } else {
        exportPDF("Inventory", "inventory", headers, rows);
      }
    }

    if (tab === "payments") {
      const headers = ["Description", "Amount", "Date", "Status"];
      const rows = payments.map((payment) => [payment.crop_name, String(payment.amount), new Date(payment.date).toLocaleDateString(), payment.status]);
      if (type === "csv") {
        exportCSV("payments", headers, rows);
      } else {
        exportPDF("Payments", "payments", headers, rows);
      }
    }

    if (tab === "staff") {
      const headers = ["Staff Name", "Role", "Hours", "Date", "Rate"];
      const rows = staffHours.map((item) => [item.staff_name, item.role || "-", String(item.hours), item.date, item.rate_per_hour ? String(item.rate_per_hour) : "-"]);
      if (type === "csv") {
        exportCSV("staff", headers, rows);
      } else {
        exportPDF("Staff Logs", "staff", headers, rows);
      }
    }
  };

  const loader = (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background relative z-0">
      <div className="fixed inset-0 z-[-1] opacity-5 bg-[url('/farmpics/COFFEE.jpg')] bg-cover bg-center bg-no-repeat pointer-events-none" />
      
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-card/95 backdrop-blur-xl border-r border-border flex flex-col transition-all duration-300 z-20">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Sprout className="h-6 w-6 text-primary" />
          </div>
          <span className="font-display font-bold text-xl text-foreground">SMC Farmer</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <tab.icon className={`h-5 w-5 ${activeTab === tab.id ? "text-primary-foreground" : "text-muted-foreground"}`} />
              {tab.label}
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-border mt-auto">
          <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-3" /> Logout
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        {/* Top Header */}
        <header className="bg-card/80 backdrop-blur-md border-b border-border h-16 flex items-center px-8 justify-between shrink-0 sticky top-0 z-10">
          <h2 className="text-xl font-semibold text-foreground tracking-tight">
            {tabs.find(t => t.id === activeTab)?.label}
          </h2>
          <div className="flex items-center gap-4">
            <UserProfileDialog />
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <LiveMarketPriceBanner crops={uniqueCrops} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card p-5 rounded-xl shadow-soft border border-border">
            <p className="text-sm text-muted-foreground">Inventory Items</p>
            <p className="text-3xl font-display font-bold text-foreground">{inventory.length}</p>
          </div>
          <div className="bg-card p-5 rounded-xl shadow-soft border border-border">
            <p className="text-sm text-muted-foreground">Active Listings</p>
            <p className="text-3xl font-display font-bold text-primary">{listings.filter((listing) => listing.status === "available").length}</p>
          </div>
          <div className="bg-card p-5 rounded-xl shadow-soft border border-border">
            <p className="text-sm text-muted-foreground">Revenue</p>
            <p className="text-3xl font-display font-bold text-primary">KES {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-card p-5 rounded-xl shadow-soft border border-border">
            <p className="text-sm text-muted-foreground">Pending Bids</p>
            <p className="text-3xl font-display font-bold text-foreground">{bids.filter((bid) => bid.status === "pending").length}</p>
          </div>
        </div>



        {activeTab === "inventory" && (
          <div className="space-y-6">
            <div className="bg-card rounded-xl shadow-soft border border-border">
              <div className="p-4 flex items-center justify-between border-b border-border">
                <h3 className="font-semibold text-foreground">Inventory</h3>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleExport("csv", "inventory")}><Download className="h-4 w-4 mr-1" /> CSV</Button>
                  <Button size="sm" variant="outline" onClick={() => handleExport("pdf", "inventory")}><Download className="h-4 w-4 mr-1" /> PDF</Button>
                  <Button size="sm" onClick={() => setAddInventoryOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add</Button>
                </div>
              </div>
              {invLoading ? loader : inventory.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No inventory items yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground w-12">Photo</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Crop</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Quantity</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Harvest Date</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Notes</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.map((item) => (
                        <tr key={item.id} className="border-b border-border last:border-0">
                          <td className="p-4">
                            <div className="w-10 h-10 rounded bg-muted overflow-hidden">
                              {(item as any).photo_urls?.[0] ? (
                                <img src={resolveImageUrl((item as any).photo_urls[0])} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs opacity-50">🌱</div>
                              )}
                            </div>
                          </td>
                          <td className="p-4 font-medium text-foreground">{item.crop}</td>
                          <td className="p-4 text-muted-foreground">{Number(item.quantity_kg).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</td>
                          <td className="p-4 text-muted-foreground">{item.expected_harvest_date ?? "-"}</td>
                          <td className="p-4 text-muted-foreground">{item.notes ?? "-"}</td>
                          <td className="p-4">
                            <Button variant="ghost" size="sm" onClick={() => deleteInventory.mutate(item.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <Suspense fallback={<div className="h-[360px] bg-muted animate-pulse rounded-xl" />}>
              <InventoryCharts inventory={inventory} payments={payments} staffHours={staffHours} />
            </Suspense>
          </div>
        )}

        {activeTab === "listings" && (
          <div className="bg-card rounded-xl shadow-soft border border-border">
            <div className="p-4 flex items-center justify-between border-b border-border">
              <h3 className="font-semibold text-foreground">My Listings</h3>
              <Button size="sm" onClick={() => setCreateListingOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Listing</Button>
            </div>
            {listingsLoading ? loader : listings.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Store className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No listings created yet.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4 p-4">
                {listings.map((listing) => (
                  <div key={listing.id} className="border border-border rounded-xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-semibold text-foreground">{listing.crop_name}</h4>
                        <p className="text-sm text-muted-foreground">{Number(listing.quantity_kg).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg · KES {Number(listing.price_per_kg).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/kg</p>
                        <p className="text-sm text-muted-foreground">{listing.location}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badgeStyles[listing.status] ?? "bg-muted text-muted-foreground"}`}>
                        {listing.status}
                      </span>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button size="sm" variant="outline" onClick={() => deleteListing.mutate(listing.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "orders" && (
          <div className="space-y-4">
            {ordersLoading ? loader : farmerOrders.length === 0 ? (
              <div className="bg-card rounded-xl shadow-soft border border-border text-center py-16 text-muted-foreground">
                <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No orders yet.</p>
              </div>
            ) : (
              farmerOrders.map((order) => (
                <OrderTracker
                  key={order.id}
                  order={order}
                  role="farmer"
                  onUpdateStatus={(id, status) => updateOrderStatus.mutate({ orderId: id, status })}
                  updating={updateOrderStatus.isPending}
                />
              ))
            )}
          </div>
        )}

        {activeTab === "bids" && (
          <div className="space-y-4">
            {bidsLoading ? loader : bids.length === 0 ? (
              <div className="bg-card rounded-xl shadow-soft border border-border text-center py-16 text-muted-foreground">
                <Gavel className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No bids received yet.</p>
              </div>
            ) : (
              bids.map((bid) => (
                <div key={bid.id} className="bg-card rounded-xl shadow-soft border border-border p-5">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h4 className="font-semibold text-foreground">{bid.buyer_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {bid.product_name} · {Number(bid.quantity_kg).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg · KES {Number(bid.price_per_kg).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/kg
                      </p>
                      {bid.message && <p className="text-sm text-muted-foreground mt-1">{bid.message}</p>}
                      {bid.counter_price && <p className="text-sm text-primary mt-1">Counter: KES {Number(bid.counter_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/kg</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badgeStyles[bid.status] ?? "bg-muted text-muted-foreground"}`}>
                        {bid.status}
                      </span>
                      {bid.status === "pending" && (
                        <>
                          <Button size="sm" onClick={() => respondToBid.mutate({ bidId: bid.id, status: "accepted" })}>Accept</Button>
                          <Button size="sm" variant="outline" onClick={() => { setCounterBidId(bid.id); setCounterPrice(String(bid.price_per_kg)); }}>Counter</Button>
                          <Button size="sm" variant="destructive" onClick={() => respondToBid.mutate({ bidId: bid.id, status: "rejected" })}>Reject</Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "payments" && (
          <Suspense fallback={<div className="h-[420px] bg-muted animate-pulse rounded-xl" />}>
            <BillingAndInvoices role="farmer" />
          </Suspense>
        )}

        {activeTab === "staff" && (
          <div className="bg-card rounded-xl shadow-soft border border-border">
            <div className="p-4 flex items-center justify-between border-b border-border">
              <h3 className="font-semibold text-foreground">Staff Logs</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleExport("csv", "staff")}><Download className="h-4 w-4 mr-1" /> CSV</Button>
                <Button size="sm" variant="outline" onClick={() => handleExport("pdf", "staff")}><Download className="h-4 w-4 mr-1" /> PDF</Button>
                <Button size="sm" onClick={() => setAddStaffOpen(true)}><Plus className="h-4 w-4 mr-1" /> Log Hours</Button>
              </div>
            </div>
            {staffLoading ? loader : staffHours.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Clock className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No staff hours logged yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Name</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Role</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Hours</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffHours.map((item) => (
                      <tr key={item.id} className="border-b border-border last:border-0">
                        <td className="p-4 text-foreground">{item.staff_name}</td>
                        <td className="p-4 text-muted-foreground">{item.role || "-"}</td>
                        <td className="p-4 text-muted-foreground">{Number(item.hours).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="p-4 text-muted-foreground">{item.date}</td>
                        <td className="p-4 text-muted-foreground">{item.rate_per_hour ? `KES ${Number(item.rate_per_hour).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "prices" && (
          <div className="space-y-6">
            <Suspense fallback={<div className="h-48 bg-muted animate-pulse rounded-xl" />}>
              <MarketPriceBoard />
            </Suspense>
            <Suspense fallback={<div className="h-[420px] bg-muted animate-pulse rounded-xl" />}>
              <MarketPriceCharts />
            </Suspense>
          </div>
        )}

        {activeTab === "loans" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground text-lg">My Loan Applications</h3>
              <Button size="sm" onClick={() => setLoanDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Apply</Button>
            </div>
            {loansLoading ? loader : loans.length === 0 ? (
              <div className="bg-card rounded-xl shadow-soft border border-border text-center py-16 text-muted-foreground">
                <Landmark className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No loan applications yet.</p>
              </div>
            ) : (
              loans.map((loan) => (
                <div key={loan.id} className="bg-card rounded-xl shadow-soft border border-border p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-foreground">KES {Number(loan.amount_requested || loan.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      {loan.target_creditor_name && (
                        <p className="text-sm font-medium text-emerald-700 flex items-center gap-1 mt-0.5 mb-1">
                          <Building2 className="h-3 w-3" /> {loan.target_creditor_name}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">{loan.purpose}</p>
                      <p className="text-xs text-muted-foreground mt-1">Applied {new Date(loan.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${badgeStyles[loan.status] ?? "bg-muted text-muted-foreground"}`}>
                        {loan.status.replace("_", " ")}
                      </span>
                      <p className="text-xs text-muted-foreground mt-2">Score: {loan.credit_score_at_request || loan.credit_score}</p>
                    </div>
                  </div>
                  {(loan.status === "approved" || loan.status === "disbursed") && (
                    <div className="bg-emerald-50 rounded-lg p-3 text-sm text-emerald-800 border border-emerald-100 mt-2">
                      <p className="font-medium flex items-center gap-2">
                        <Landmark className="h-4 w-4" /> 
                        You will be contacted within 72 hours regarding your loan.
                      </p>
                      {loan.reviewer_name && (
                        <p className="mt-2 text-xs border-t border-emerald-100/50 pt-2 text-emerald-700">
                          <strong>Contact Person:</strong> {loan.reviewer_name}
                          {loan.reviewer_phone && ` • Phone: ${loan.reviewer_phone}`}
                          {loan.reviewer_email && ` • Email: ${loan.reviewer_email}`}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "analytics" && (
          <Suspense fallback={<div className="h-[320px] bg-muted animate-pulse rounded-xl" />}>
            <FarmerAnalyticsDashboard payments={payments} staffHours={staffHours} />
          </Suspense>
        )}

        {/* SMC Copilot */}
        {activeTab === "copilot" && (
          <div className="h-[calc(100vh-200px)]">
            <SMCCopilot embedded />
          </div>
        )}
          </div>
        </main>
      </div>

      <CreateListingDialog open={createListingOpen} onOpenChange={setCreateListingOpen} />
      <LoanApplicationDialog open={loanDialogOpen} onOpenChange={setLoanDialogOpen} />

      <Dialog open={addInventoryOpen} onOpenChange={setAddInventoryOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle></DialogHeader>
          <form onSubmit={handleAddInventory} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Crop Name</Label><Input required value={invForm.crop} onChange={(e) => setInvForm({ ...invForm, crop: e.target.value })} placeholder="e.g. Maize" /></div>
              <div><Label>Quantity (kg)</Label><Input type="number" required min={1} value={invForm.quantity_kg} onChange={(e) => setInvForm({ ...invForm, quantity_kg: e.target.value })} /></div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label>
                <select 
                  value={invForm.category} 
                  onChange={(e) => setInvForm({ ...invForm, category: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="vegetables">Vegetables</option>
                  <option value="cereals">Cereals</option>
                  <option value="fruits">Fruits</option>
                  <option value="tubers">Tubers</option>
                  <option value="pulses">Pulses</option>
                  <option value="general">General</option>
                </select>
              </div>
              <div><Label>Exp. Harvest Date</Label><Input type="date" value={invForm.expected_harvest_date} onChange={(e) => setInvForm({ ...invForm, expected_harvest_date: e.target.value })} /></div>
            </div>

            <div><Label>Notes</Label><Input value={invForm.notes} onChange={(e) => setInvForm({ ...invForm, notes: e.target.value })} placeholder="Any specific details..." /></div>

            {/* Photo Upload Section */}
            <div>
              <Label>Produce Photos</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {invPhotos.map((url, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                    <img src={resolveImageUrl(url)} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeInvPhoto(i)} className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <label className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                  {invUploading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Upload className="h-4 w-4 text-muted-foreground" />}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleInvPhotoUpload} disabled={invUploading} />
                </label>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox id="is_listed" checked={invForm.is_listed} onCheckedChange={(checked) => setInvForm({ ...invForm, is_listed: !!checked })} />
                <Label htmlFor="is_listed" className="cursor-pointer">List automatically in Marketplace</Label>
              </div>

              {invForm.is_listed && (
                <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-300">
                  <div><Label>Price per kg (KES)</Label><Input type="number" step="0.5" value={invForm.price} onChange={(e) => setInvForm({ ...invForm, price: e.target.value })} placeholder="45.00" /></div>
                  <div><Label>Location</Label><Input value={invForm.location} onChange={(e) => setInvForm({ ...invForm, location: e.target.value })} placeholder="e.g. Nakuru" /></div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddInventoryOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={addInventory.isPending || invUploading}>
                {addInventory.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={addStaffOpen} onOpenChange={setAddStaffOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Staff Hours</DialogTitle></DialogHeader>
          <form onSubmit={handleAddStaff} className="space-y-4">
            <div><Label>Staff Name</Label><Input required value={staffForm.staff_name} onChange={(e) => setStaffForm({ ...staffForm, staff_name: e.target.value })} /></div>
            <div><Label>Role</Label><Input value={staffForm.role} onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Hours</Label><Input type="number" required min={0.5} step={0.5} value={staffForm.hours} onChange={(e) => setStaffForm({ ...staffForm, hours: e.target.value })} /></div>
              <div><Label>Date</Label><Input type="date" required value={staffForm.date} onChange={(e) => setStaffForm({ ...staffForm, date: e.target.value })} /></div>
            </div>
            <div><Label>Rate per Hour</Label><Input type="number" min={0} value={staffForm.rate_per_hour} onChange={(e) => setStaffForm({ ...staffForm, rate_per_hour: e.target.value })} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddStaffOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={addStaffHours.isPending}>
                {addStaffHours.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={counterBidId !== null} onOpenChange={(open) => { if (!open) { setCounterBidId(null); setCounterPrice(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send Counter Offer</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Counter Price (KES/kg)</Label>
              <Input type="number" min={0.01} step={0.01} value={counterPrice} onChange={(e) => setCounterPrice(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setCounterBidId(null); setCounterPrice(""); }}>Cancel</Button>
            <Button
              onClick={() => {
                if (!counterBidId) return;
                respondToBid.mutate(
                  { bidId: counterBidId, status: "countered", counterPrice: parseFloat(counterPrice) },
                  {
                    onSuccess: () => {
                      setCounterBidId(null);
                      setCounterPrice("");
                    },
                  }
                );
              }}
              disabled={!counterPrice}
            >
              Send Counter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FarmerDashboard;
