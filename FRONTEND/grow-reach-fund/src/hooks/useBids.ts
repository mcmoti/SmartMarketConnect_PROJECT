import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productService, type Bid } from "@/integrations/django/services";
import { toast } from "sonner";

export type BidStatus = "pending" | "accepted" | "rejected" | "countered";
export type { Bid };

export const useBidsForListing = (listingId: number | null) => {
  return useQuery({
    queryKey: ["listing_bids", listingId],
    enabled: listingId !== null,
    queryFn: () => (listingId !== null ? productService.getBidsForListing(listingId) : Promise.resolve([])),
  });
};

export const useFarmerBids = () => {
  return useQuery({
    queryKey: ["farmer_bids"],
    queryFn: () => productService.getFarmerBids(),
  });
};

export const useBuyerBids = () => {
  return useQuery({
    queryKey: ["buyer_bids"],
    queryFn: () => productService.getBuyerBids(),
  });
};

export const useMyBids = useBuyerBids;

export const usePlaceBid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bid: { listing_id: number; price_per_kg: number; quantity_kg: number; message?: string }) =>
      productService.placeBid(bid),
    onSuccess: () => {
      toast.success("Bid placed successfully");
      queryClient.invalidateQueries({ queryKey: ["listing_bids"] });
      queryClient.invalidateQueries({ queryKey: ["buyer_bids"] });
      queryClient.invalidateQueries({ queryKey: ["farmer_bids"] });
    },
    onError: (error: Error) => toast.error(error.message || "Failed to place bid"),
  });
};

export const useRespondToBid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bidId,
      status,
      counterPrice,
    }: {
      bidId: number;
      status: BidStatus;
      counterPrice?: number;
    }) => productService.respondToBid(bidId, status, counterPrice),
    onSuccess: () => {
      toast.success("Bid updated successfully");
      queryClient.invalidateQueries({ queryKey: ["listing_bids"] });
      queryClient.invalidateQueries({ queryKey: ["buyer_bids"] });
      queryClient.invalidateQueries({ queryKey: ["farmer_bids"] });
    },
    onError: (error: Error) => toast.error(error.message || "Failed to update bid"),
  });
};
