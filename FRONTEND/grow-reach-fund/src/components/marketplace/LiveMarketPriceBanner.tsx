import { useState, useEffect } from "react";
import { marketService, type LivePrice } from "@/integrations/django/services";
import { TrendingUp, AlertCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  crops: string[];
  market?: string;
  defaultCrop?: string;
}

const DEFAULT_PRICES: Record<string, number> = {
  maize: 45.0,
  beans: 120.0,
  potatoes: 60.0,
  tomatoes: 80.0,
  onions: 90.0,
  cabbage: 30.0,
  coffee: 800.0,
  tea: 150.0,
  wheat: 55.0,
  rice: 180.0,
};

const getFallbackPrice = (crop: string) => {
  const normalized = crop.toLowerCase();
  return DEFAULT_PRICES[normalized] || 50.0;
};

const LiveMarketPriceBanner = ({ crops = [], market = "Nairobi", defaultCrop = "maize" }: Props) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [data, setData] = useState<LivePrice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter out any invalid crop names and use a default fallback if empty
  const validCrops = crops.filter(c => c && c.trim() !== "");
  const activeCrops = validCrops.length > 0 ? validCrops : [defaultCrop];

  // Current crop being displayed
  const currentCrop = activeCrops[currentIndex % activeCrops.length];

  // Rotation logic
  useEffect(() => {
    // Rotate every 5 seconds
    const intervalId = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeCrops.length);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [activeCrops.length]);

  // Fetch price logic when currentCrop changes
  useEffect(() => {
    let mounted = true;

    const fetchLivePrice = async () => {
      setLoading(true);
      setError(null);
      try {
        const priceData = await marketService.getBlendedPrice(currentCrop.toLowerCase(), market);
        if (mounted) {
          if (priceData.error) {
            setData({
              commodity: currentCrop,
              market: market,
              price: getFallbackPrice(currentCrop),
              currency: "KES",
              source: "Default Fallback",
              timestamp: new Date().toISOString(),
              fallback_used: true,
            });
          } else {
            setData(priceData);
          }
        }
      } catch (err: any) {
        if (mounted) {
          setData({
            commodity: currentCrop,
            market: market,
            price: getFallbackPrice(currentCrop),
            currency: "KES",
            source: "Default Fallback",
            timestamp: new Date().toISOString(),
            fallback_used: true,
          });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void fetchLivePrice();
    return () => { mounted = false; };
  }, [currentCrop, market]);

  return (
    <div className="w-full bg-gradient-to-r from-[#1e8b2f] to-[#177a28] border border-[#146c22] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-sm mb-6 gap-4 text-white relative overflow-hidden">
      {/* Progress Bar indicator */}
      {activeCrops.length > 1 && (
        <div className="absolute top-0 left-0 h-1 bg-[#146c22] w-full">
          <div 
            className="h-full bg-[#82e091] animate-[progress_5s_linear_infinite]"
            key={currentIndex} // Reset animation on crop change
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="p-2 bg-white/20 rounded-full text-white">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-display font-semibold flex items-center gap-2">
            Live Market Price: {currentCrop.charAt(0).toUpperCase() + currentCrop.slice(1)}
            {data?.fallback_used && (
              <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 border-[#82e091]/30 text-[#82e091] bg-transparent">Cached</Badge>
            )}
          </h4>
          <p className="text-xs text-[#a2e8af]">
            {market} Market {data && `• Updated ${new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-4 text-right">
        {loading ? (
          <div className="h-8 w-32 bg-white/20 animate-pulse rounded"></div>
        ) : error || !data ? (
           <div className="flex items-center gap-2 text-[#ffb3b3]">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm font-medium">Data unavailable</p>
          </div>
        ) : (
          <>
            {data.blend_weights ? (
              <div className="hidden sm:block text-xs text-[#a2e8af] mr-2">
                <p className="mb-0.5">UjuziKilimo: KES {data.external_price?.toFixed(1)}/kg</p>
                <p>Farmers: KES {data.farmer_avg_price?.toFixed(1)}/kg</p>
              </div>
            ) : (
              <div className="hidden sm:block text-xs text-[#a2e8af] mr-2">
                <p>Source KES {data.price}/kg</p>
              </div>
            )}
            <div>
              <div className="text-2xl font-bold tracking-tight text-white drop-shadow-sm">
                <span className="text-sm font-medium mr-1 text-[#c2f2c9]">KES</span>
                {data.price.toFixed(2)}
                <span className="text-sm font-normal text-[#a2e8af] ml-1">/kg</span>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default LiveMarketPriceBanner;
