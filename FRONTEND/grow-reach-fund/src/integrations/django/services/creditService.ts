/**
 * Credit request and score services.
 */

import { djangoAPI } from "../client";

type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

const normalizeList = <T>(response: PaginatedResponse<T> | T[]): T[] => {
  if (Array.isArray(response)) {
    return response;
  }
  return response.results;
};

export interface CreditorProfile {
  id: number;
  creditor_id: number;
  name: string;
  contact_name: string;
  photo: string | null;
  bio: string | null;
  logo: string | null;
  description: string | null;
  min_loan_amount: string;
  max_loan_amount: string;
  rates: {
    prime: string;
    low: string;
    medium: string;
    high: string;
  };
}

export interface CreditRequest {
  id: number;
  amount: number;
  amount_requested: number;
  purpose: string;
  duration_months: number;
  supporting_documents: string[];
  collateral_description?: string;
  collateral_value?: string | number | null;
  status: "pending" | "under_review" | "approved" | "rejected" | "disbursed";
  credit_score: number;
  credit_score_at_request?: number;
  recommended_amount?: number | null;
  approval_amount?: number | null;
  interest_rate?: number | null;
  suggested_interest_rate?: number | null;
  target_creditor?: number | null;
  target_creditor_name?: string | null;
  farmer_name?: string;
  reviewer_name?: string | null;
  reviewer_email?: string | null;
  reviewer_phone?: string | null;
  created_at: string;
}

export interface CreditScore {
  id: number;
  score: number;
  overall_score: number;
  risk_level: "low" | "medium" | "high";
  total_transactions: number;
  total_sales_volume: number;
  avg_monthly_cashflow?: number;
  completed_trades: number;
  active_listings_count: number;
  last_calculated: string;
}

export interface FarmerProductSummary {
  id: number;
  name: string;
  category: string;
  quantity: string | number;
  unit: string;
  price: string | number;
  status: string;
  created_at: string;
}

export interface ApplicantDossier {
  loan: CreditRequest;
  credit_score: CreditScore | null;
  farmer: {
    id: number;
    full_name: string;
    username: string;
    email: string;
    phone_number: string;
    profile_image: string | null;
    bio: string;
    location: string;
    profile_data: any;
    days_on_platform: number;
    is_verified: boolean;
  };
  products: FarmerProductSummary[];
}


class CreditService {
  async getCreditRequests(filters?: Record<string, unknown>): Promise<CreditRequest[]> {
    const response = await djangoAPI.get<PaginatedResponse<CreditRequest> | CreditRequest[]>("/credit-requests/", {
      params: filters,
    });
    return normalizeList(response);
  }

  async getCreditRequest(id: number): Promise<CreditRequest> {
    return djangoAPI.get<CreditRequest>(`/credit-requests/${id}/`);
  }

  async getApplicantDossier(id: number): Promise<ApplicantDossier> {
    return djangoAPI.get<ApplicantDossier>(`/credit-requests/${id}/applicant-profile/`);
  }

  async getCreditors(): Promise<CreditorProfile[]> {
    const response = await djangoAPI.get<PaginatedResponse<CreditorProfile> | CreditorProfile[]>("/creditors/");
    return normalizeList(response);
  }

  async createCreditRequest(data: {
    amount: number;
    purpose: string;
    target_creditor: number;
    duration_months?: number;
    supporting_documents?: string[];
    collateral_description?: string;
    collateral_value?: number;
  }): Promise<CreditRequest> {
    return djangoAPI.post<CreditRequest>("/credit-requests/", {
      amount_requested: data.amount,
      purpose: data.purpose,
      target_creditor: data.target_creditor,
      duration_months: data.duration_months ?? 12,
      supporting_documents: data.supporting_documents ?? [],
      collateral_description: data.collateral_description ?? "",
      collateral_value: data.collateral_value ?? null,
    });
  }

  async approveCreditRequest(id: number, payload?: { approval_amount?: number; interest_rate?: number; review_notes?: string }) {
    return djangoAPI.post<CreditRequest>(`/credit-requests/${id}/approve/`, payload ?? {});
  }

  async rejectCreditRequest(id: number, review_notes?: string) {
    return djangoAPI.post<CreditRequest>(`/credit-requests/${id}/reject/`, {
      review_notes: review_notes ?? "",
    });
  }

  async getMyCreditScores(): Promise<CreditScore[]> {
    const response = await djangoAPI.get<PaginatedResponse<CreditScore> | CreditScore[]>("/credit-scores/");
    return normalizeList(response);
  }

  async recalculateMyCreditScore(): Promise<CreditScore> {
    return djangoAPI.post<CreditScore>("/credit-scores/recalculate/", {});
  }
}

export const creditService = new CreditService();
