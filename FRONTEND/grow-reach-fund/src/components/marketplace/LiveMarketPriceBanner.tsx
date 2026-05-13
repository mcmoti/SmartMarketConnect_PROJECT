import { useState, useEffect } from "react";
import { marketService, type LivePrice } from "@/integrations/django/services";
import { TrendingUp, AlertCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  crop?: string;
  market?: string;
}

const LiveMarketPriceBanner = ({ crop = "maize", market = "Nairobi" }: Props) => {
  const [data, setData] = useState<LivePrice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchLivePrice = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch Blended Price (UjuziKilimo + Farmer averages)
        const priceData = await marketService.getBlendedPrice(crop, market);
        if (mounted) {
          if (priceData.error) {
             setError(priceData.error);
          } else {
             setData(priceData);
          }
        }
      } catch (err: any) {
        if (mounted) setError(err.message || "Failed to fetch live price");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void fetchLivePrice();
    return () => { mounted = false; };
  }, [crop, market]);

  if (loading) {
    return (
      <div className="w-full bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-sm animate-pulse mb-6">
        <div className="flex items-center gap-3">
           <div className="h-10 w-10 bg-muted rounded-full"></div>
           <div className="h-4 w-24 bg-muted rounded"></div>
        </div>
        <div className="h-6 w-16 bg-muted rounded"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full bg-destructive/10 border border-destructive/20 text-destructive rounded-xl p-4 flex items-center gap-2 mb-6">
        <AlertCircle className="h-5 w-5" />
        <p className="text-sm font-medium">Failed to load real-time market data for {crop}. ({error})</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-sm mb-6 gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/20 rounded-full text-primary">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-display font-semibold text-foreground flex items-center gap-2">
            Live Market Price: {crop.charAt(0).toUpperCase() + crop.slice(1)}
            {data.fallback_used && (
                <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 border-muted-foreground/30 text-muted-foreground">Cached</Badge>
            )}
          </h4>
          <p className="text-xs text-muted-foreground">
            {market} Market • Updated {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-4 text-right">
        {data.blend_weights ? (
          <div className="hidden sm:block text-xs text-muted-foreground mr-2">
            <p className="mb-0.5">UjuziKilimo: KES {data.external_price?.toFixed(1)}/kg</p>
            <p>Farmers: KES {data.farmer_avg_price?.toFixed(1)}/kg</p>
          </div>
        ) : (
             <div className="hidden sm:block text-xs text-muted-foreground mr-2">
                 <p>Source KES {data.price}/kg</p>
             </div>
        )}
        <div>
          <div className="text-2xl font-bold tracking-tight text-primary">
            <span className="text-sm font-medium mr-1 text-foreground/70">KES</span>
            {data.price.toFixed(2)}
            <span className="text-sm font-normal text-muted-foreground ml-1">/kg</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMarketPriceBanner;
