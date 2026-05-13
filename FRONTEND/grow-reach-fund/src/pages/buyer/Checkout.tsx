import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, CheckCircle, Smartphone, MapPin, Handshake } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { djangoAPI } from "@/integrations/django/client";
import { useCreateOrder } from "@/hooks/useOrders";
import type { CartItem } from "./Marketplace";

const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const createOrder = useCreateOrder();
  
  const { cart = [], cartTotal = 0, isBidCheckout, bid } = location.state as any || {};
  const [paid, setPaid] = useState(false);
  const [phone, setPhone] = useState("");
  
  // Flexible Payment State
  const [paymentTerm, setPaymentTerm] = useState<"upfront" | "deposit" | "on_delivery">("upfront");
  const [depositAmount, setDepositAmount] = useState<string>("");

  const baseTotal = isBidCheckout ? bid.total_price : cartTotal;
  
  // Calculate how much needs to be paid right now
  let amountToPay = baseTotal;
  if (paymentTerm === "on_delivery") amountToPay = 0;
  if (paymentTerm === "deposit") {
    amountToPay = depositAmount ? Number(depositAmount) : Math.round(baseTotal * 0.2); // 20% default
  }

  // Prevent accessing checkout with zero total or empty cart
  useEffect(() => {
    if (baseTotal <= 0) {
      toast.error("Cart is empty or invalid. Redirecting to marketplace.");
      navigate("/buyer/marketplace");
    }
  }, [baseTotal, navigate]);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();

    if (paymentTerm === "deposit" && (amountToPay < baseTotal * 0.1 || amountToPay >= baseTotal)) {
      toast.error("Deposit must be at least 10% and less than the full amount.");
      return;
    }

    if (amountToPay > 0 && !/^0[0-9]{9}$/.test(phone)) {
      toast.error("Please enter a valid 10-digit phone number (e.g., 0712345678)");
      return;
    }

    try {
      if (amountToPay > 0) {
        toast.info("Initiating M-Pesa STK Push...");
        await djangoAPI.post("/payments/mpesa/stk-push/", {
          phone_number: "254" + phone.substring(1), // Convert 07... to 2547...
          amount: amountToPay, // Flexible amount
          transaction_type: "cart_purchase",
          reference: isBidCheckout ? `bid_${bid.id}` : "cart_checkout"
        });
      }

      if (isBidCheckout) {
        // Handle Bid Checkout (Counter Offer Acceptance)
        await createOrder.mutateAsync({
          listing_id: bid.listing_id,
          farmer_id: bid.farmer_id || "",
          quantity_kg: bid.quantity_kg,
          total_price: baseTotal,
          bid_id: bid.id,
          payment_term: paymentTerm,
          amount_paid: amountToPay,
          phone_number: phone || "+254000000000"
        });
      } else {
        // Standard Cart Checkout
        await djangoAPI.post("/orders/checkout/", {
          phone_number: phone || "+254000000000",
          payment_term: paymentTerm,
          amount_paid: amountToPay,
          items: cart.map((item: CartItem) => ({
            listing_id: Number(item.listing_id),
            quantity_kg: item.quantity,
          })),
        });
      }
      
      setPaid(true);
      if (amountToPay > 0) {
        toast.success("Payment successful! Orders created.");
      } else {
        toast.success("Order confirmed. Pay on delivery.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
    }
  };

  if (paid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">Order Confirmed!</h1>
          <p className="text-muted-foreground mb-6">
            Your orders have been placed. Invoices and tracking details have been generated.
          </p>
          <div className="flex flex-col gap-3">
            <Link to="/buyer/dashboard">
              <Button className="w-full">Track Orders</Button>
            </Link>
            <Link to="/buyer/marketplace">
              <Button variant="outline" className="w-full">Continue Shopping</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background/80 relative z-0">
      <div className="fixed inset-0 z-[-1] opacity-80 bg-[url('/farmpics/TEA.jpg')] bg-cover bg-center bg-no-repeat pointer-events-none" />
      <div className="container mx-auto px-4 py-8 max-w-4xl relative">
        <Link to="/buyer/marketplace" className="inline-flex items-center text-sm font-semibold hover:text-black mb-8 bg-white/80 py-1 px-3 rounded-full shadow-sm">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to marketplace
        </Link>

        <h1 className="text-3xl font-display font-bold text-foreground mb-8">Checkout</h1>

        <div className="grid md:grid-cols-5 gap-8">
          {/* Main Checkout Form */}
          <form onSubmit={handlePay} className="md:col-span-3 space-y-6">
            
            {/* Payment Terms Section (Only available for bids currently, but UI handles both) */}
            <div className="bg-card p-6 rounded-xl shadow-soft border border-border space-y-5">
              <h3 className="font-semibold text-foreground text-lg border-b border-border pb-3">Payment Terms</h3>
              
              <RadioGroup value={paymentTerm} onValueChange={(val: any) => setPaymentTerm(val)} className="space-y-3">
                <div className="flex items-start space-x-3 border border-border p-4 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setPaymentTerm("upfront")}>
                  <RadioGroupItem value="upfront" id="upfront" className="mt-1" />
                  <div>
                    <Label htmlFor="upfront" className="font-semibold text-base cursor-pointer">Pay Upfront (100%)</Label>
                    <p className="text-sm text-muted-foreground">Pay the full amount immediately via M-Pesa.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 border border-border p-4 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setPaymentTerm("deposit")}>
                  <RadioGroupItem value="deposit" id="deposit" className="mt-1" />
                  <div className="w-full">
                    <Label htmlFor="deposit" className="font-semibold text-base cursor-pointer">Pay a Deposit</Label>
                    <p className="text-sm text-muted-foreground mb-3">Pay a fraction now to secure the goods, pay balance on delivery.</p>
                    {paymentTerm === "deposit" && (
                      <div className="flex gap-3 items-center">
                        <Label>Deposit Amount (KES):</Label>
                        <Input 
                          type="number" 
                          placeholder={(baseTotal * 0.2).toString()}
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          className="max-w-[120px]"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start space-x-3 border border-border p-4 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setPaymentTerm("on_delivery")}>
                  <RadioGroupItem value="on_delivery" id="on_delivery" className="mt-1" />
                  <div>
                    <Label htmlFor="on_delivery" className="font-semibold text-base cursor-pointer">Pay on Delivery</Label>
                    <p className="text-sm text-muted-foreground">Order will be placed. Farmer reserves the right to reject deferred payments.</p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* M-Pesa Section (Conditional) */}
            {amountToPay > 0 && (
              <div className="bg-card p-6 rounded-xl shadow-soft border border-border space-y-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-primary" /> M-Pesa Payment
                </h3>
                <div>
                  <Label>Phone Number</Label>
                  <Input
                    required
                    placeholder="0712345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">You'll receive an STK prompt on this number for KES {amountToPay.toLocaleString()}</p>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={createOrder.isPending}>
              {createOrder.isPending ? "Processing..." : amountToPay > 0 ? `Pay KES ${amountToPay.toLocaleString()}` : "Confirm Order"}
            </Button>
          </form>

          {/* Order Summary Sidebar */}
          <div className="md:col-span-2 space-y-6 flex flex-col h-fit">
            <div className="bg-card rounded-xl shadow-soft border border-border p-6 h-fit">
              <h3 className="font-semibold text-foreground mb-4">Order Summary</h3>
              <div className="space-y-3 mb-4">
                {isBidCheckout ? (
                  <div className="flex justify-between text-sm">
                    <div>
                      <span className="text-foreground font-medium">{bid.product_name || "Accepted Counter"}</span>
                      <span className="text-muted-foreground ml-1">x{bid.quantity_kg} kg</span>
                    </div>
                    <span className="font-medium text-foreground">KES {baseTotal.toLocaleString()}</span>
                  </div>
                ) : (
                  cart.map((item: CartItem) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <div>
                        <span className="text-foreground font-medium">{item.name}</span>
                        <span className="text-muted-foreground ml-1">x{item.quantity} kg</span>
                        <p className="text-xs text-muted-foreground">{item.farm}</p>
                      </div>
                      <span className="font-medium text-foreground">KES {(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-border pt-3 space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span>KES {baseTotal.toLocaleString()}</span>
                </div>
                {paymentTerm !== "upfront" && (
                  <div className="flex justify-between text-sm font-medium text-muted-foreground">
                    <span>Balance Due Later</span>
                    <span>KES {(baseTotal - amountToPay).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-border mt-2">
                  <span className="font-semibold text-foreground">Total to Pay Now</span>
                  <span className="font-bold text-primary text-lg">KES {amountToPay.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="bg-primary/5 rounded-xl border border-primary/10 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <Handshake className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Farmer Protection</h4>
                  <p className="text-xs text-muted-foreground">Farmers can review Pay on Delivery terms. High fulfillment rates earn better trust scores.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
