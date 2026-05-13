import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Truck, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import type { Order, OrderStatus } from "@/hooks/useOrders";

const steps: { status: OrderStatus; label: string; icon: typeof Package }[] = [
  { status: "pending", label: "Pending", icon: Clock },
  { status: "confirmed", label: "Confirmed", icon: Package },
  { status: "in_transit", label: "In Transit", icon: Truck },
  { status: "delivered", label: "Delivered", icon: CheckCircle },
];

const statusIndex = (s: OrderStatus) => {
  if (s === "cancelled") return -1;
  return steps.findIndex((st) => st.status === s);
};

const statusColor: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  confirmed: "bg-primary/10 text-primary",
  in_transit: "bg-accent/20 text-accent-foreground",
  delivered: "bg-primary/15 text-primary",
  cancelled: "bg-destructive/10 text-destructive",
};

interface Props {
  order: Order;
  role: "farmer" | "buyer";
  onUpdateStatus?: (orderId: number, status: OrderStatus) => void;
  updating?: boolean;
}

const nextStatusMap: Record<string, OrderStatus> = {
  pending: "confirmed",
  confirmed: "in_transit",
  in_transit: "delivered",
};

export default function OrderTracker({ order, role, onUpdateStatus, updating }: Props) {
  const currentIdx = statusIndex(order.status);
  const isCancelled = order.status === "cancelled";
  const canAdvance = role === "farmer" && !isCancelled && order.status !== "delivered" && nextStatusMap[order.status];
  const canCancel = !isCancelled && order.status === "pending";
  const counterpartName = role === "farmer" ? order.buyer_name : order.farmer_name;

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="font-semibold text-foreground">{order.crop_name}</h4>
          <p className="text-sm text-muted-foreground">
            {role === "farmer" ? "Buyer" : "Farmer"}: <span className="font-medium text-foreground">{counterpartName}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            {order.quantity_kg} kg · <span className="font-semibold text-foreground">KES {order.amount.toLocaleString()}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">{new Date(order.created_at).toLocaleDateString()}</p>
        </div>
        <Badge className={statusColor[order.status] ?? ""} variant="outline">
          {order.status === "in_transit" ? "In Transit" : order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </Badge>
      </div>

      {/* Progress Steps */}
      {!isCancelled && (
        <div className="flex items-center gap-1">
          {steps.map((step, i) => {
            const done = i <= currentIdx;
            const Icon = step.icon;
            return (
              <div key={step.status} className="flex items-center flex-1">
                <div className={`flex flex-col items-center flex-1 ${done ? "text-primary" : "text-muted-foreground/40"}`}>
                  <Icon className="h-5 w-5 mb-1" />
                  <span className="text-[10px] font-medium text-center leading-tight">{step.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-1 rounded ${i < currentIdx ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {isCancelled && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <XCircle className="h-4 w-4" /> This order has been cancelled.
        </div>
      )}

      {/* Actions */}
      {(canAdvance || canCancel) && onUpdateStatus && (
        <div className="flex gap-2 pt-1">
          {canAdvance && (
            <Button
              size="sm"
              onClick={() => onUpdateStatus(order.id, nextStatusMap[order.status])}
              disabled={updating}
            >
              {updating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Mark as {nextStatusMap[order.status] === "in_transit" ? "In Transit" : nextStatusMap[order.status].charAt(0).toUpperCase() + nextStatusMap[order.status].slice(1)}
            </Button>
          )}
          {canCancel && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onUpdateStatus(order.id, "cancelled")}
              disabled={updating}
            >
              Cancel Order
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
