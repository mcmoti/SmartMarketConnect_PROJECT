import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, LogOut, Gavel, ShoppingCart, Package, Map, TrendingUp, ClipboardList, Loader2, Clock, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useListings } from "@/hooks/useListings";
import { useMyBids } from "@/hooks/useBids";
import { useBuyerOrders, useUpdateOrderStatus, useCreateOrder } from "@/hooks/useOrders";
import ListingCard from "@/components/marketplace/ListingCard";
import BidDialog from "@/components/marketplace/BidDialog";
import RateFarmerDialog from "@/components/marketplace/RateFarmerDialog";
import MarketplaceMap from "@/components/maps/MarketplaceMap";
import MarketPriceCharts from "@/components/marketplace/MarketPriceCharts";
import LiveMarketPriceBanner from "@/components/marketplace/LiveMarketPriceBanner";
import OrderTracker from "@/components/orders/OrderTracker";
import { toast } from "sonner";
import smcLogo from "@/assets/smc-logo.png";
import type { Listing } from "@/hooks/useListings";

export type CartItem = { id: number; name: string; price: number; quantity: number; unit: string; farm: string; farmer_id: number; listing_id: number; available_quantity: number; };

const Marketplace = () => {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [bidListing, setBidListing] = useState<Listing | null>(null);
  const [bidOpen, setBidOpen] = useState(false);
  const [rateListing, setRateListing] = useState<Listing | null>(null);
  const [rateOpen, setRateOpen] = useState(false);
  const [tab, setTab] = useState<"browse" | "map" | "prices" | "my-bids" | "orders">("browse");
  const [category, setCategory] = useState<string>("all");

  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { data: listings = [], isLoading } = useListings();
  const { data: myBids = [], isLoading: bidsLoading } = useMyBids();
  const createOrder = useCreateOrder();
  const { data: buyerOrders = [], isLoading: ordersLoading } = useBuyerOrders();
  const updateOrderStatus = useUpdateOrderStatus();

  const filtered = listings.filter((p) => {
    const matchesSearch =
      p.crop_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.farmer_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.location ?? "").toLowerCase().includes(search.toLowerCase());

    const matchesCategory = category === "all" || p.category?.toLowerCase() === category.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  const categories = [
    { id: "all", label: "All Items" },
    { id: "vegetables", label: "Vegetables" },
    { id: "cereals", label: "Cereals" },
    { id: "fruits", label: "Fruits" },
    { id: "tubers", label: "Tubers" },
    { id: "pulses", label: "Pulses" },
  ];

  const addToCart = (listing: Listing, qty: number = 1) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === listing.id);

      if (existing) {
        const newQty = Math.min(existing.quantity + qty, listing.quantity_kg);

        return prev.map((c) =>
          c.id === listing.id ? { ...c, quantity: newQty } : c
        );
      }

      return [
        ...prev,
        {
          id: listing.id,
          name: listing.crop_name,
          price: listing.price_per_kg,
          quantity: Math.min(qty, listing.quantity_kg),
          unit: "kg",
          farm: listing.farmer_name ?? "Unknown",
          farmer_id: listing.farmer_id,
          listing_id: listing.id,
          available_quantity: listing.quantity_kg, // ✅ store max
        },
      ];
    });

    setShowCart(true);
  };

  const removeFromCart = (id: number) => setCart((prev) => prev.filter((c) => c.id !== id));
  const acceptedBids = myBids.filter((b: any) => b.status === "accepted");
  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0) + acceptedBids.length;

  const handleCheckout = () => navigate("/buyer/checkout", { state: { cart, cartTotal } });
  const handleLogout = async () => { await signOut(); navigate("/"); };



  const statusColors: Record<string, string> = {
    pending: "bg-warning/15 text-warning",
    accepted: "bg-primary/15 text-primary",
    rejected: "bg-destructive/15 text-destructive",
    countered: "bg-secondary/15 text-secondary",
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={smcLogo} alt="SMC" className="h-8 w-8 rounded-full" />
            <span className="font-display font-bold text-lg text-foreground hidden sm:inline">Marketplace</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCart(!showCart)} className="relative p-2 rounded-lg hover:bg-muted transition-colors">
              <ShoppingCart className="h-5 w-5 text-foreground" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 amber-gradient rounded-full text-xs font-bold text-primary-foreground flex items-center justify-center">{cartCount}</span>
              )}
            </button>
            <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="h-4 w-4 mr-1" /> Logout</Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border">
          {([
            { id: "browse" as const, label: "Browse", icon: Package },
            { id: "map" as const, label: "Map View", icon: Map },
            { id: "prices" as const, label: "Market Prices", icon: TrendingUp },
            { id: "my-bids" as const, label: "My Bids", icon: Gavel },
            { id: "orders" as const, label: "Orders", icon: ClipboardList },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
              {t.id === "my-bids" && myBids.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">{myBids.length}</Badge>
              )}
            </button>
          ))}
        </div>

        {/* Browse Tab */}
        {tab === "browse" && (
          <>
            <LiveMarketPriceBanner crop={category === "all" ? "maize" : category} />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="relative max-w-md w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search crops, farmers, or location..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${category === cat.id
                      ? "bg-primary border-primary text-primary-foreground shadow-md"
                      : "bg-card border-border text-muted-foreground hover:border-primary/50"
                      }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-8">
              <div className="flex-1">
                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="space-y-3"><Skeleton className="h-36 rounded-xl" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-16">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <h3 className="font-display text-lg font-semibold text-foreground mb-1">No listings found</h3>
                    <p className="text-sm text-muted-foreground">{search ? "Try a different search term" : "No produce is currently available."}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filtered.map((listing) => (
                      <ListingCard key={listing.id} listing={listing} onBid={(l) => { setBidListing(l); setBidOpen(true); }} onBuyNow={addToCart} onRateFarmer={(l) => { setRateListing(l); setRateOpen(true); }} />
                    ))}
                  </div>
                )}
              </div>
              {showCart && (
                <div className="hidden md:block w-80 bg-card rounded-xl shadow-soft border border-border p-5 h-fit sticky top-20">
                  <h3 className="font-display font-bold text-foreground text-lg mb-4">Your Cart</h3>
                  {cart.length === 0 && acceptedBids.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Cart is empty</p>
                  ) : (
                    <>
                      {cart.length > 0 && (
                        <div className="space-y-3 mb-4">
                          {cart.map((item) => (
                            <div key={item.id} className="flex justify-between items-center">
                              <div><p className="text-sm font-medium text-foreground">{item.name}</p><p className="text-xs text-muted-foreground">x{item.quantity} kg · {item.farm}</p></div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-foreground">KES {(item.price * item.quantity).toLocaleString()}</p>
                                <button onClick={() => removeFromCart(item.id)} className="text-xs text-destructive hover:underline">✕</button>
                              </div>
                            </div>
                          ))}
                          <div className="border-t border-border pt-4 mb-4">
                            <div className="flex justify-between items-center">
                              <p className="font-semibold text-foreground">Cart Total</p>
                              <p className="text-lg font-bold text-primary">KES {cartTotal.toLocaleString()}</p>
                            </div>
                          </div>
                          <Button className="w-full" size="lg" onClick={handleCheckout}>Checkout Cart</Button>
                        </div>
                      )}

                      {acceptedBids.length > 0 && (
                        <div className={`space-y-3 ${cart.length > 0 ? "mt-6 pt-4 border-t border-border" : ""}`}>
                          <p className="text-sm font-semibold text-primary mb-2 flex items-center gap-1"><Gavel className="h-4 w-4" /> Accepted Bids (Ready to Checkout)</p>
                          {acceptedBids.map((bid: any) => (
                            <div key={bid.id} className="flex justify-between items-center bg-primary/5 p-3 rounded-lg border border-primary/20">
                              <div>
                                <p className="text-sm font-medium text-foreground">{bid.produce_listings?.crop_name || "Listing"}</p>
                                <p className="text-xs text-muted-foreground">x{bid.quantity_kg} kg @ KES {bid.price_per_kg}/kg</p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <p className="text-sm font-semibold text-foreground">KES {(bid.price_per_kg * bid.quantity_kg).toLocaleString()}</p>
                                <Button size="sm" className="h-7 text-xs px-2" onClick={() => {
                                  navigate("/buyer/checkout", {
                                    state: {
                                      isBidCheckout: true,
                                      bid: {
                                        ...bid,
                                        total_price: bid.price_per_kg * bid.quantity_kg,
                                      }
                                    }
                                  });
                                }}>Checkout Bid</Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Map Tab */}
        {tab === "map" && (
          <MarketplaceMap listings={listings} />
        )}

        {/* Market Prices Tab */}
        {tab === "prices" && <MarketPriceCharts />}

        {/* My Bids Tab */}
        {tab === "my-bids" && (
          <div className="max-w-2xl">
            {bidsLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
            ) : myBids.length === 0 ? (
              <div className="text-center py-16">
                <Gavel className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-display text-lg font-semibold text-foreground mb-1">No bids yet</h3>
                <p className="text-sm text-muted-foreground">Browse listings and place your first bid!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myBids.map((bid: import("@/hooks/useBids").Bid & { produce_listings?: any }) => (
                  <div key={bid.id} className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold text-foreground">{bid.produce_listings?.crop_name ?? "Listing"}</p>
                        <p className="text-sm text-muted-foreground">Your bid: KES {bid.price_per_kg}/kg × {bid.quantity_kg} kg = KES {(bid.price_per_kg * bid.quantity_kg).toLocaleString()}</p>
                      </div>
                      <Badge variant="outline" className={statusColors[bid.status] ?? ""}>{bid.status}</Badge>
                    </div>
                    {bid.status === "accepted" && (
                      <div className="mt-3">
                        <Button size="sm" onClick={() => {
                          navigate("/buyer/checkout", {
                            state: {
                              isBidCheckout: true,
                              bid: {
                                ...bid,
                                total_price: bid.price_per_kg * bid.quantity_kg,
                              }
                            }
                          });
                        }}>
                          Proceed to Checkout
                        </Button>
                      </div>
                    )}
                    {bid.counter_price && (
                      <div className="mt-2 p-3 rounded-lg bg-secondary/10 border border-secondary/20">
                        <p className="text-sm font-medium text-secondary">Counter offer: KES {bid.counter_price}/kg</p>
                        {bid.status === "countered" && (
                          <div className="mt-2 flex gap-2">
                            <Button size="sm" onClick={() => {
                              navigate("/buyer/checkout", {
                                state: {
                                  isBidCheckout: true,
                                  bid: {
                                    ...bid,
                                    total_price: bid.counter_price * bid.quantity_kg,
                                  }
                                }
                              });
                            }}>
                              Accept Counter & Pay
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                    {bid.message && <p className="text-xs text-muted-foreground mt-2 italic">"{bid.message}"</p>}
                    {/* Timeline */}
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Placed: {new Date(bid.created_at).toLocaleDateString()} {new Date(bid.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      {bid.updated_at !== bid.created_at && (
                        <>
                          <span>·</span>
                          <span>Updated: {new Date(bid.updated_at).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Orders Tab */}
        {tab === "orders" && (
          <div className="max-w-2xl">
            {ordersLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : buyerOrders.length === 0 ? (
              <div className="text-center py-16">
                <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-display text-lg font-semibold text-foreground mb-1">No orders yet</h3>
                <p className="text-sm text-muted-foreground">Your orders will appear here after checkout.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {buyerOrders.map((order) => (
                  <OrderTracker
                    key={order.id}
                    order={order}
                    role="buyer"
                    onUpdateStatus={(id, status) => updateOrderStatus.mutate({ orderId: id, status })}
                    updating={updateOrderStatus.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        )}


      </div>

      <BidDialog listing={bidListing} open={bidOpen} onOpenChange={setBidOpen} />
      <RateFarmerDialog listing={rateListing} open={rateOpen} onOpenChange={setRateOpen} />
    </div>
  );
};

export default Marketplace;
