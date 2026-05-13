import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { creditService } from "@/integrations/django/services";
import { useToast } from "@/hooks/use-toast";

const CREDIT_REQUESTS_QUERY_KEY = ["credit-requests"];
const CREDIT_SCORE_QUERY_KEY = ["credit-score"];

export const useCreditRequests = (params?: Record<string, unknown>) => {
  return useQuery({
    queryKey: [...CREDIT_REQUESTS_QUERY_KEY, params],
    queryFn: () => creditService.getCreditRequests(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreditRequest = (id: number | undefined) => {
  return useQuery({
    queryKey: ["credit-request", id],
    queryFn: async () => {
      if (!id) {
        throw new Error("No credit request ID provided");
      }
      return creditService.getCreditRequest(id);
    },
    enabled: !!id,
  });
};

export const useMyCredScore = () => {
  return useQuery({
    queryKey: CREDIT_SCORE_QUERY_KEY,
    queryFn: () => creditService.getMyCreditScores(),
    staleTime: 30 * 60 * 1000,
  });
};

export const useCreditAssessment = () => useMyCredScore();

export const useCreditEligibility = (amount: number) => {
  return useQuery({
    queryKey: ["credit-eligibility", amount],
    queryFn: async () => ({
      eligible: amount > 0,
      requested_amount: amount,
    }),
    enabled: amount > 0,
  });
};

export const useCreateCreditRequest = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { 
      amount: number; 
      purpose: string; 
      target_creditor: number;
      duration_months?: number; 
      supporting_documents?: string[];
      collateral_description?: string;
      collateral_value?: number;
    }) => creditService.createCreditRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CREDIT_REQUESTS_QUERY_KEY });
      toast({ title: "Success", description: "Credit request submitted successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit credit request",
        variant: "destructive",
      });
    },
  });
};

export const useApproveCreditRequest = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, reviewNotes }: { id: number; reviewNotes?: string }) =>
      creditService.approveCreditRequest(id, { review_notes: reviewNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CREDIT_REQUESTS_QUERY_KEY });
      toast({ title: "Success", description: "Loan approved. It will be disbursed within 72 hours." });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve credit request",
        variant: "destructive",
      });
    },
  });
};

export const useRejectCreditRequest = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      creditService.rejectCreditRequest(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CREDIT_REQUESTS_QUERY_KEY });
      toast({ title: "Success", description: "Credit request rejected" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject credit request",
        variant: "destructive",
      });
    },
  });
};

export const useCreditHistory = (farmerId: string) => {
  return useQuery({
    queryKey: ["credit-history", farmerId],
    queryFn: () => creditService.getCreditRequests({ farmer: farmerId }),
    enabled: !!farmerId,
  });
};

export const useApplicantDossier = (id: number | null) => {
  return useQuery({
    queryKey: ["applicant-dossier", id],
    queryFn: async () => {
      if (!id) throw new Error("No loan ID provided");
      return creditService.getApplicantDossier(id);
    },
    enabled: !!id,
  });
};
