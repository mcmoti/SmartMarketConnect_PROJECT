import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ClipboardList, MessageSquare, BarChart3, LogOut, Loader2, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBuyerOrders, useUpdateOrderStatus } from "@/hooks/useOrders";
import OrderTracker from "@/components/orders/OrderTracker";
import SpendingTrends from "@/components/analytics/SpendingTrends";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { BillingAndInvoices } from "@/components/orders/BillingAndInvoices";
import UserProfileDialog from "@/components/layout/UserProfileDialog";
import ReviewDialog from "@/components/orders/ReviewDialog";
import { Star } from "lucide-react";

type Tab = "orders" | "reviews" | "analytics" | "billing";

const BuyerDashboard = () => {
  const [activeTab, setActiveTab] = useState<Tab>("orders");
  const [reviewOrder, setReviewOrder] = useState<any>(null);
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { data: orders = [], isLoading: ordersLoading } = useBuyerOrders();
  const updateOrderStatus = useUpdateOrderStatus();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  // Mock spending data from orders
  const spendingData = orders.length > 0
    ? Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        return { month: d.toLocaleString("default", { month: "short" }), spent: Math.round(Math.random() * 50000) };
      })
    : [];

  const navItems = [
    { id: "orders" as Tab, label: "Orders", icon: ClipboardList },
    { id: "billing" as Tab, label: "Billing", icon: FileText },
    { id: "reviews" as Tab, label: "Reviews", icon: Star },
    { id: "analytics" as Tab, label: "Insights", icon: BarChart3 },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background relative z-0">
      <div className="fixed inset-0 z-[-1] opacity-5 bg-[url('/farmpics/GREEN%20HOUSE.jpg')] bg-cover bg-center bg-no-repeat pointer-events-none" />
      
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-shrink-0 bg-card/95 backdrop-blur-xl border-r border-border flex-col transition-all duration-300 z-20">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <ShoppingCart className="h-6 w-6 text-primary" />
          </div>
          <span className="font-display font-bold text-xl text-foreground">SMC Buyer</span>
        </div>
        
        <div className="p-4 border-b border-border">
            <Button variant="default" className="w-full justify-start shadow-md" onClick={() => navigate("/buyer/marketplace")}>
              <ShoppingCart className="h-4 w-4 mr-2" /> Browse Marketplace
            </Button>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 px-4 flex flex-col gap-1.5">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === item.id 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <item.icon className={`h-5 w-5 ${activeTab === item.id ? "text-primary-foreground" : "text-muted-foreground"}`} />
              {item.label}
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
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10 pb-16 md:pb-0">
        {/* Top Header */}
        <header className="bg-card/80 backdrop-blur-md border-b border-border h-16 flex items-center px-4 md:px-8 justify-between shrink-0 sticky top-0 z-10">
          <h2 className="text-xl font-semibold text-foreground tracking-tight hidden md:block">
            {navItems.find(t => t.id === activeTab)?.label}
          </h2>
          {/* Mobile Header elements */}
          <div className="flex md:hidden items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            <span className="font-display font-bold text-lg">Buyer</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate("/buyer/marketplace")} className="md:hidden">
              <ShoppingCart className="h-4 w-4" />
            </Button>
            <UserProfileDialog />
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">


        {activeTab === "orders" && (
          ordersLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : orders.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No orders yet. Browse the marketplace to start buying!</p>
              <Button className="mt-4 min-h-[48px]" onClick={() => navigate("/buyer/marketplace")}>
                Browse Marketplace
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 max-w-2xl">
              {orders.map((order) => (
                <OrderTracker
                  key={order.id}
                  order={order}
                  role="buyer"
                  onUpdateStatus={(id, status) => updateOrderStatus.mutate({ orderId: id, status })}
                  updating={updateOrderStatus.isPending}
                />
              ))}
            </div>
          )
        )}

        {activeTab === "reviews" && (
          <div className="grid gap-4 max-w-2xl">
            <h2 className="text-xl font-semibold mb-2">Orders to Review</h2>
            {orders.filter((o) => o.status === "delivered").length === 0 ? (
              <div className="text-center py-20 text-muted-foreground border border-border rounded-xl bg-card">
                <Star className="h-10 w-10 mx-auto mb-4 opacity-50" />
                <p>No delivered orders to review yet.</p>
              </div>
            ) : (
              orders.filter((o) => o.status === "delivered").map((order) => (
                <div key={order.id} className="bg-card rounded-xl border border-border p-5 flex items-center justify-between">
                   <div>
                      <h4 className="font-semibold text-foreground">{order.crop_name}</h4>
                      <p className="text-sm text-muted-foreground">From {order.farmer_name} • KES {order.amount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">Order Date: {new Date(order.created_at).toLocaleDateString()}</p>
                   </div>
                   <Button onClick={() => setReviewOrder(order)} variant="outline">Leave Review</Button>
                </div>
              ))
            )}
          </div>
        )}



        {activeTab === "analytics" && (
          <div className="space-y-6 max-w-3xl">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-card p-5 rounded-xl shadow-soft border border-border">
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-3xl font-display font-bold text-foreground">{orders.length}</p>
              </div>
              <div className="bg-card p-5 rounded-xl shadow-soft border border-border">
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-3xl font-display font-bold text-primary">
                  KES {orders.reduce((s, o) => s + o.amount, 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-card p-5 rounded-xl shadow-soft border border-border">
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-3xl font-display font-bold text-foreground">
                  {orders.filter((o) => o.status === "delivered").length}
                </p>
              </div>
            </div>
            <SpendingTrends data={spendingData} />
          </div>
        )}

        {activeTab === "billing" && (
          <div className="max-w-4xl mx-auto">
            <BillingAndInvoices role="buyer" />
          </div>
        )}
          </div>
        </main>
      </div>
      <ReviewDialog 
         order={reviewOrder} 
         onClose={() => setReviewOrder(null)} 
         onSuccess={() => {}} 
      />

      <MobileBottomNav items={navItems} activeId={activeTab} onSelect={(id) => setActiveTab(id as Tab)} />
    </div>
  );
};

export default BuyerDashboard;
