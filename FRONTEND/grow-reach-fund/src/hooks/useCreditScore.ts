import { useState } from "react";
import { djangoAPI } from "@/integrations/django/client";
import { useToast } from "@/hooks/use-toast";

export interface CreditAssessment {
  score: number;
  risk_level: "Low" | "Medium" | "High";
  summary: string;
  strengths: string[];
  risks: string[];
  recommended_limit: number;
  farmer_data: {
    farmerName: string;
    farmSize: number;
    produce: string[];
    amountProduced: number;
    totalRevenue: number;
    completedOrders: number;
    totalOrders: number;
    totalListings: number;
    repaidLoans: number;
    defaultedLoans: number;
    totalPastLoans: number;
    accountAgeDays: number;
    location: string;
  };
}

export const useCreditScore = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const scoreFarmer = async (farmerId: string, loanId?: string): Promise<CreditAssessment | null> => {
    setLoading(true);
    try {
      const { data } = await djangoAPI.post("/credit-scores/recalculate/", {
        farmer_id: farmerId, loan_id: loanId
      });
      return data as CreditAssessment;
    } catch (e: any) {
      toast({
        title: "Scoring failed",
        description: e.message || "Could not generate credit score",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { scoreFarmer, loading };
};
