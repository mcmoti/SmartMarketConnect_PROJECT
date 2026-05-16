/**
 * Product, inventory, bid, and market data services.
 */

import { djangoAPI } from "../client";

export interface Listing {
  id: number;
  crop_name: string;
  category: string;
  quantity_kg: number;
  unit: string;
  price_per_kg: number;
  location: string;
  description: string;
  availability: "available" | "pre_harvest" | "limited";
  quality_grade: "A" | "B" | "C";
  status: "available" | "sold_out" | "archived";
  photo_urls: string[];
  expected_harvest_date?: string | null;
  farmer_id: number;
  farmer_name: string;
  gps_lat?: number | null;
  gps_lng?: number | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: number;
  crop: string;
  quantity_kg: number;
  expected_harvest_date?: string | null;
  notes?: string;
  created_at: string;
}

export interface Bid {
  id: number;
  listing_id: number;
  product_name: string;
  buyer_id: number;
  buyer_name: string;
  price_per_kg: number;
  quantity_kg: number;
  message?: string;
  counter_price?: number | null;
  status: "pending" | "accepted" | "rejected" | "countered" | "checked_out";
  created_at: string;
  updated_at: string;
}

type BidResponse = Omit<Bid, "price_per_kg" | "quantity_kg" | "counter_price"> & {
  price_per_kg: string | number;
  quantity_kg: string | number;
  counter_price?: string | number | null;
};

export interface MarketPrice {
  id: number;
  crop_name: string;
  category: string;
  unit_price: number;
  average_price?: number | null;
  min_price?: number | null;
  max_price?: number | null;
  price_trend: "up" | "down" | "stable";
  updated_at: string;
}

type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

type ProductResponse = {
  id: number;
  crop_name?: string;
  name: string;
  category: string;
  quantity_kg?: string | number;
  quantity: string | number;
  unit: string;
  price_per_kg?: string | number;
  price: string | number;
  location: string;
  description: string;
  availability: "available" | "pre_harvest" | "limited";
  quality_grade: "A" | "B" | "C";
  status: "active" | "sold_out" | "archived";
  photo_urls?: string[];
  expected_harvest_date?: string | null;
  farmer_id?: number;
  farmer_name?: string;
  gps_lat?: number | null;
  gps_lng?: number | null;
  created_at: string;
  updated_at: string;
};

const mapListing = (product: ProductResponse): Listing => ({
  id: product.id,
  crop_name: product.crop_name ?? product.name,
  category: product.category,
  quantity_kg: Number(product.quantity_kg ?? product.quantity),
  unit: product.unit,
  price_per_kg: Number(product.price_per_kg ?? product.price),
  location: product.location,
  description: product.description,
  availability: product.availability,
  quality_grade: product.quality_grade,
  status: product.status === "active" ? "available" : product.status,
  photo_urls: product.photo_urls ?? [],
  expected_harvest_date: product.expected_harvest_date ?? null,
  farmer_id: product.farmer_id ?? 0,
  farmer_name: product.farmer_name ?? "",
  gps_lat: product.gps_lat ?? null,
  gps_lng: product.gps_lng ?? null,
  created_at: product.created_at,
  updated_at: product.updated_at,
});

const normalizeList = <T>(response: PaginatedResponse<T> | T[]): T[] => {
  if (Array.isArray(response)) {
    return response;
  }
  return response.results;
};

const mapBid = (bid: BidResponse): Bid => ({
  ...bid,
  price_per_kg: Number(bid.price_per_kg),
  quantity_kg: Number(bid.quantity_kg),
  counter_price: bid.counter_price === null || bid.counter_price === undefined ? null : Number(bid.counter_price),
});

class ProductService {
  async getProducts(filters?: Record<string, unknown>): Promise<Listing[]> {
    const response = await djangoAPI.get<PaginatedResponse<ProductResponse> | ProductResponse[]>("/products/", {
      params: filters,
    });
    return normalizeList(response).map(mapListing);
  }

  async getProductDetail(id: number): Promise<Listing> {
    const response = await djangoAPI.get<ProductResponse>(`/products/${id}/`);
    return mapListing(response);
  }

  async createProduct(data: Partial<Listing>): Promise<Listing> {
    const response = await djangoAPI.post<ProductResponse>("/products/", {
      crop_name: data.crop_name,
      category: data.category ?? "general",
      quantity_kg: data.quantity_kg,
      unit: data.unit ?? "kg",
      price_per_kg: data.price_per_kg,
      location: data.location,
      description: data.description ?? "",
      photo_urls: data.photo_urls ?? [],
      expected_harvest_date: data.expected_harvest_date ?? null,
      quality_grade: data.quality_grade ?? "A",
      availability: data.availability ?? "available",
    });

    return mapListing(response);
  }

  async updateProduct(id: number, data: Partial<Listing>): Promise<Listing> {
    const response = await djangoAPI.patch<ProductResponse>(`/products/${id}/`, data);
    return mapListing(response);
  }

  async deleteProduct(id: number): Promise<void> {
    await djangoAPI.delete(`/products/${id}/`);
  }

  async getFarmerListings(): Promise<Listing[]> {
    const response = await djangoAPI.get<PaginatedResponse<ProductResponse> | ProductResponse[]>("/products/");
    return normalizeList(response).map(mapListing);
  }

  async getInventory(): Promise<InventoryItem[]> {
    const response = await djangoAPI.get<PaginatedResponse<InventoryItem> | InventoryItem[]>("/inventory-items/");
    return normalizeList(response);
  }

  async addInventory(data: Omit<InventoryItem, "id" | "created_at">): Promise<InventoryItem> {
    return djangoAPI.post<InventoryItem>("/inventory-items/", data);
  }

  async deleteInventory(id: number): Promise<void> {
    await djangoAPI.delete(`/inventory-items/${id}/`);
  }

  async getBids(filters?: Record<string, unknown>): Promise<Bid[]> {
    const response = await djangoAPI.get<PaginatedResponse<BidResponse> | BidResponse[]>("/bids/", { params: filters });
    return normalizeList(response).map(mapBid);
  }

  async getBidsForListing(listingId: number): Promise<Bid[]> {
    return this.getBids({ product: listingId });
  }

  async getFarmerBids(): Promise<Bid[]> {
    return this.getBids();
  }

  async getBuyerBids(): Promise<Bid[]> {
    return this.getBids();
  }

  async placeBid(data: { listing_id: number; price_per_kg: number; quantity_kg: number; message?: string }): Promise<Bid> {
    const response = await djangoAPI.post<BidResponse>("/bids/", {
      listing_id: data.listing_id,
      price_per_kg: data.price_per_kg,
      quantity_kg: data.quantity_kg,
      message: data.message ?? "",
    });
    return mapBid(response);
  }

  async respondToBid(bidId: number, status: "accepted" | "rejected" | "countered", counterPrice?: number): Promise<Bid> {
    if (status === "accepted") {
      return mapBid(await djangoAPI.post<BidResponse>(`/bids/${bidId}/accept/`, {}));
    }
    if (status === "rejected") {
      return mapBid(await djangoAPI.post<BidResponse>(`/bids/${bidId}/reject/`, {}));
    }
    return mapBid(await djangoAPI.post<BidResponse>(`/bids/${bidId}/counter/`, { counter_price: counterPrice }));
  }
}

// ===========================================================================
// Live price types
// ===========================================================================

export interface LivePrice {
  commodity: string;
  market: string;
  price: number;
  currency: string;
  source: string;
  timestamp: string;
  fallback_used: boolean;
  external_price?: number;
  farmer_avg_price?: number;
  blend_weights?: { external: number; farmer: number };
  error?: string;
}

export interface TrendPoint {
  date: string;
  price: number;
}

export interface PriceTrend {
  commodity: string;
  market: string;
  period_days: number;
  data: TrendPoint[];
  trend: "up" | "down" | "stable";
  error?: string;
}

// ===========================================================================
// Market service
// ===========================================================================

class MarketService {
  /** Paginated DB table — historical rows for existing components */
  async getMarketPrices(filters?: Record<string, unknown>): Promise<MarketPrice[]> {
    const response = await djangoAPI.get<PaginatedResponse<MarketPrice> | MarketPrice[]>(
      "/market-prices/",
      { params: filters }
    );
    return normalizeList(response);
  }

  /**
   * Fetch live price from the fault-tolerant service layer.
   * Falls back: NextYield → KAMIS → DB cache.
   */
  async getLivePrice(commodity: string, market = "Nairobi"): Promise<LivePrice> {
    return djangoAPI.get<LivePrice>("/market/live-price/", {
      params: { commodity, market },
    });
  }

  /**
   * Blended price: 70% external + 30% avg farmer listings.
   */
  async getBlendedPrice(commodity: string, market = "Nairobi"): Promise<LivePrice> {
    return djangoAPI.get<LivePrice>("/market/live-price/", {
      params: { commodity, market, blended: "true" },
    });
  }

  /**
   * Historical price trend for chart display.
   * @param period  e.g. "7d", "30d", "90d"
   */
  async getPriceTrend(commodity: string, market = "Nairobi", period = "7d"): Promise<PriceTrend> {
    return djangoAPI.get<PriceTrend>("/market/price-trends/", {
      params: { commodity, market, period },
    });
  }
}

export const productService = new ProductService();
export const marketService = new MarketService();
