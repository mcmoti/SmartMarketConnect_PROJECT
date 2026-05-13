import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productService, type Listing } from "@/integrations/django/services";
import { useToast } from "@/hooks/use-toast";

const LISTINGS_QUERY_KEY = ["produce_listings"];
const LISTING_DETAIL_QUERY_KEY = (id: number) => ["listing", id];

export type { Listing };

export const useListings = (filters?: Record<string, unknown>) => {
  return useQuery({
    queryKey: [...LISTINGS_QUERY_KEY, filters],
    queryFn: () => productService.getProducts(filters),
    staleTime: 5 * 60 * 1000,
  });
};

export const useListing = (id: number | undefined) => {
  return useQuery({
    queryKey: id ? LISTING_DETAIL_QUERY_KEY(id) : ["listing"],
    queryFn: async () => {
      if (!id) {
        throw new Error("No listing ID provided");
      }
      return productService.getProductDetail(id);
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
};

export const useCreateListing = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: Partial<Listing>) => productService.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LISTINGS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["farmer_listings"] });
      toast({ title: "Success", description: "Listing created successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create listing",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateListing = (id: number) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: Partial<Listing>) => productService.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LISTING_DETAIL_QUERY_KEY(id) });
      queryClient.invalidateQueries({ queryKey: LISTINGS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["farmer_listings"] });
      toast({ title: "Success", description: "Listing updated successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update listing",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteListing = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: number) => productService.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LISTINGS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["farmer_listings"] });
      toast({ title: "Success", description: "Listing deleted successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete listing",
        variant: "destructive",
      });
    },
  });
};

export const useFarmerListings = () => {
  return useQuery({
    queryKey: ["farmer_listings"],
    queryFn: () => productService.getFarmerListings(),
  });
};
