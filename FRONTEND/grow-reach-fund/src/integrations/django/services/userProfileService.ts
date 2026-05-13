/**
 * User profile and form persistence services.
 */

import { djangoAPI, type User } from "../client";

export interface FarmerProfilePayload {
  location?: string;
  farm_size?: number;
  crops?: string[];
  amount_produced?: number;
  target_market?: string;
  gps_lat?: number;
  gps_lng?: number;
}

export interface BuyerProfilePayload {
  business_name?: string;
  location?: string;
  buyer_type?: string;
  preferred_products?: string[];
  purchase_volume?: string;
  gps_lat?: number;
  gps_lng?: number;
}

export interface CreditorProfilePayload {
  business_number?: string;
  company_name?: string;
  institution_type?: string;
  contact_person?: string;
  min_loan?: number;
  max_loan?: number;
  interest_rate_min?: number;
  interest_rate_max?: number;
  loan_duration?: string;
  risk_preference?: string;
  location?: string;
  gps_lat?: number;
  gps_lng?: number;
}

export interface StaffLog {
  id: number;
  staff_name: string;
  role: string;
  hours: number;
  date: string;
  rate_per_hour?: number | null;
  created_at: string;
}

export interface ContactInquiryPayload {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

export interface UploadedFile {
  name: string;
  path: string;
  url: string;
}

class UserProfileService {
  private async mergeProfileData(profilePatch: Record<string, unknown>, rootPatch?: Partial<User>): Promise<User> {
    const current = await djangoAPI.getCurrentUser();
    if (!current) {
      throw new Error("User is not authenticated");
    }

    const response = await djangoAPI.patch<User>("/users/me/", {
      ...(rootPatch ?? {}),
      profile_data: {
        ...(current.profile_data ?? {}),
        ...profilePatch,
      },
    });

    return response;
  }

  async getCurrentUserProfile(): Promise<User | null> {
    return djangoAPI.getCurrentUser();
  }

  async updateFarmerProfile(data: FarmerProfilePayload): Promise<User> {
    return this.mergeProfileData(
      {
        farmer_profile: {
          farm_size: data.farm_size ?? null,
          crops: data.crops ?? [],
          amount_produced: data.amount_produced ?? null,
          target_market: data.target_market ?? "",
        },
      },
      {
        location: data.location ?? "",
        latitude: data.gps_lat ?? null,
        longitude: data.gps_lng ?? null,
      }
    );
  }

  async updateBuyerProfile(data: BuyerProfilePayload): Promise<User> {
    return this.mergeProfileData(
      {
        buyer_profile: {
          business_name: data.business_name ?? "",
          buyer_type: data.buyer_type ?? "",
          preferred_products: data.preferred_products ?? [],
          purchase_volume: data.purchase_volume ?? "",
        },
      },
      {
        location: data.location ?? "",
        latitude: data.gps_lat ?? null,
        longitude: data.gps_lng ?? null,
      }
    );
  }

  async updateCreditorProfile(data: CreditorProfilePayload): Promise<User> {
    return this.mergeProfileData(
      {
        creditor_profile: {
          business_number: data.business_number ?? "",
          company_name: data.company_name ?? "",
          institution_type: data.institution_type ?? "",
          contact_person: data.contact_person ?? "",
          min_loan: data.min_loan ?? null,
          max_loan: data.max_loan ?? null,
          interest_rate_min: data.interest_rate_min ?? null,
          interest_rate_max: data.interest_rate_max ?? null,
          loan_duration: data.loan_duration ?? "",
          risk_preference: data.risk_preference ?? "",
        },
      },
      {
        location: data.location ?? "",
        latitude: data.gps_lat ?? null,
        longitude: data.gps_lng ?? null,
      }
    );
  }

  async getStaffHours(): Promise<StaffLog[]> {
    const response = await djangoAPI.get<{results: StaffLog[]} | StaffLog[]>("/staff-logs/");
    return Array.isArray(response) ? response : response.results;
  }

  async addStaffHours(data: Omit<StaffLog, "id" | "created_at">): Promise<StaffLog> {
    return djangoAPI.post<StaffLog>("/staff-logs/", data);
  }

  async deleteStaffHours(id: number): Promise<void> {
    await djangoAPI.delete(`/staff-logs/${id}/`);
  }

  async submitContactInquiry(data: ContactInquiryPayload) {
    return djangoAPI.post("/contact-inquiries/", data);
  }

  async uploadFiles(files: File[]): Promise<UploadedFile[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const response = await djangoAPI.post<{ files: UploadedFile[] }>("/uploads/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.files;
  }
}

export const userProfileService = new UserProfileService();
