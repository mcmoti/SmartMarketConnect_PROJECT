import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { djangoAPI } from "@/integrations/django/client";
import { toast } from "sonner";

type PaginatedResponse<T> = {
  results: T[];
};

export type OrderStatus = "pending" | "confirmed" | "in_transit" | "delivered" | "cancelled";

export interface Order {
  id: number;
  buyer_name: string;
  farmer_name: string;
  crop_name?: string;
  listing_id?: number | null;
  quantity_kg: number;
  unit_price: number;
  amount: number;
  phone_number: string;
  status: OrderStatus;
  payment_term: PaymentTerm;
  amount_paid: number;
  payment_status: "pending" | "partial" | "completed";
  date: string;
  created_at: string;
}

export interface Invoice {
  id: number;
  order: number;
  invoice_number: string;
  buyer_name: string;
  farmer_name: string;
  crop_name?: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  due_date: string | null;
  status: "unpaid" | "partial" | "paid";
  created_at: string;
}

export interface Receipt {
  id: number;
  order: number;
  transaction: number | null;
  receipt_number: string;
  amount: number;
  payment_method: string;
  notes: string;
  buyer_name?: string;
  farmer_name?: string;
  crop_name?: string;
  quantity?: number;
  unit_price?: number;
  created_at: string;
}

const normalizeOrders = (response: PaginatedResponse<Order> | Order[]) => {
  const items = Array.isArray(response) ? response : response.results;
  return items.map((order) => ({
    ...order,
    quantity_kg: Number(order.quantity_kg),
    unit_price: Number(order.unit_price),
    amount: Number(order.amount),
  }));
};

export const useFarmerOrders = () => {
  return useQuery({
    queryKey: ["farmer_orders"],
    queryFn: async () => {
      const response = await djangoAPI.get<PaginatedResponse<Order> | Order[]>("/orders/");
      return normalizeOrders(response);
    },
  });
};

export const useBuyerOrders = () => {
  return useQuery({
    queryKey: ["buyer_orders"],
    queryFn: async () => {
      const response = await djangoAPI.get<PaginatedResponse<Order> | Order[]>("/orders/");
      return normalizeOrders(response);
    },
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: OrderStatus }) =>
      djangoAPI.patch<Order>(`/orders/${orderId}/`, { status }),
    onSuccess: () => {
      toast.success("Order status updated");
      queryClient.invalidateQueries({ queryKey: ["farmer_orders"] });
      queryClient.invalidateQueries({ queryKey: ["buyer_orders"] });
    },
    onError: (error: Error) => toast.error(error.message || "Failed to update order"),
  });
};

export type PaymentTerm = "upfront" | "deposit" | "on_delivery";

export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { 
      listing_id: number; 
      farmer_id: string | number; 
      quantity_kg: number; 
      total_price: number; 
      bid_id?: number;
      payment_term?: PaymentTerm;
      amount_paid?: number;
      phone_number?: string;
    }) => {
      if (data.bid_id) {
        return djangoAPI.post(`/bids/${data.bid_id}/accept_counter/`, {
          payment_term: data.payment_term || "upfront",
          amount_paid: data.amount_paid,
          phone_number: data.phone_number || "+254000000000"
        });
      }
      
      // Fallback for regular ordering
      return djangoAPI.post("/orders/checkout/", {
        items: [{ product_id: data.listing_id, quantity: data.quantity_kg }],
        phone_number: data.phone_number || "+254000000000"
      });
    },
    onSuccess: () => {
      toast.success("Order created successfully");
      queryClient.invalidateQueries({ queryKey: ["buyer_orders"] });
      queryClient.invalidateQueries({ queryKey: ["buyer_bids"] });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
    onError: (error: Error) => toast.error(error.message || "Failed to create order"),
  });
};

export const useInvoices = () => {
  return useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const response = await djangoAPI.get<PaginatedResponse<Invoice> | Invoice[]>("/invoices/");
      return Array.isArray(response) ? response : response.results;
    },
  });
};

export const useReceipts = () => {
  return useQuery({
    queryKey: ["receipts"],
    queryFn: async () => {
      const response = await djangoAPI.get<PaginatedResponse<Receipt> | Receipt[]>("/receipts/");
      return Array.isArray(response) ? response : response.results;
    },
  });
};

