import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { creditService, productService, userProfileService } from "@/integrations/django/services";
import { djangoAPI } from "@/integrations/django/client";
import { toast } from "sonner";

export const useCreditors = () => {
  return useQuery({
    queryKey: ["creditors"],
    queryFn: () => creditService.getCreditors(),
    staleTime: 10 * 60 * 1000,
  });
};

type PaginatedResponse<T> = {
  results: T[];
};

type Transaction = {
  id: number;
  amount: number;
  transaction_type: string;
  status: string;
  created_at: string;
  description: string;
};

const normalizeList = <T>(response: PaginatedResponse<T> | T[]): T[] => {
  if (Array.isArray(response)) {
    return response;
  }
  return response.results;
};

export const useFarmerInventory = () => {
  return useQuery({
    queryKey: ["farmer_inventory"],
    queryFn: () => productService.getInventory(),
  });
};

export const useAddInventory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (item: { crop: string; quantity_kg: number; expected_harvest_date?: string; notes?: string }) =>
      productService.addInventory(item),
    onSuccess: () => {
      toast.success("Inventory item added");
      queryClient.invalidateQueries({ queryKey: ["farmer_inventory"] });
      queryClient.invalidateQueries({ queryKey: ["farmer_listings"] });
      queryClient.invalidateQueries({ queryKey: ["produce_listings"] });
    },
    onError: (error: Error) => toast.error(error.message || "Failed to add inventory item"),
  });
};

export const useDeleteInventory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => productService.deleteInventory(id),
    onSuccess: () => {
      toast.success("Inventory item removed");
      queryClient.invalidateQueries({ queryKey: ["farmer_inventory"] });
    },
    onError: (error: Error) => toast.error(error.message || "Failed to delete inventory item"),
  });
};

export const useFarmerStaff = () => {
  return useQuery({
    queryKey: ["farmer_staff"],
    queryFn: () => userProfileService.getStaffHours(),
  });
};

export const useAddStaffHours = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (item: { staff_name: string; role?: string; hours: number; date: string; rate_per_hour?: number }) =>
      userProfileService.addStaffHours({ ...item, role: item.role ?? "" }),
    onSuccess: () => {
      toast.success("Staff hours logged");
      queryClient.invalidateQueries({ queryKey: ["farmer_staff"] });
    },
    onError: (error: Error) => toast.error(error.message || "Failed to log staff hours"),
  });
};

export const useFarmerPayments = () => {
  return useQuery({
    queryKey: ["farmer_payments"],
    queryFn: async () => {
      const response = await djangoAPI.get<PaginatedResponse<Transaction> | Transaction[]>("/transactions/", {
        params: { status: "completed" },
      });
      return normalizeList(response).map((payment) => ({
        ...payment,
        date: payment.created_at,
        buyer_name: "Platform Payment",
        crop_name: payment.description || payment.transaction_type,
      }));
    },
  });
};

export const useFarmerListings = () => {
  return useQuery({
    queryKey: ["farmer_listings"],
    queryFn: () => productService.getFarmerListings(),
  });
};

export const useCreateListing = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listing: Parameters<typeof productService.createProduct>[0]) => productService.createProduct(listing),
    onSuccess: () => {
      toast.success("Listing created");
      queryClient.invalidateQueries({ queryKey: ["farmer_listings"] });
      queryClient.invalidateQueries({ queryKey: ["produce_listings"] });
    },
    onError: (error: Error) => toast.error(error.message || "Failed to create listing"),
  });
};

export const useFarmerLoans = () => {
  return useQuery({
    queryKey: ["farmer_loans"],
    queryFn: async () => {
      const loans = await creditService.getCreditRequests();
      return loans.map((loan) => ({
        ...loan,
        // backend returns credit_score_at_request; normalise for UI
        credit_score: loan.credit_score ?? loan.credit_score_at_request ?? null,
      }));
    },
  });
};

export const useApplyForLoan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (loan: {
      amount: number;
      purpose: string;
      target_creditor: number;
      supporting_documents?: string[];
      duration_months?: number;
      collateral_description?: string;
      collateral_value?: number;
    }) => creditService.createCreditRequest(loan),
    onSuccess: () => {
      toast.success("Loan application submitted");
      queryClient.invalidateQueries({ queryKey: ["farmer_loans"] });
      queryClient.invalidateQueries({ queryKey: ["credit-requests"] });
    },
    onError: (error: Error) => toast.error(error.message || "Failed to submit loan application"),
  });
};
