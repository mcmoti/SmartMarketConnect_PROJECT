import { useState, useEffect } from "react";
import { djangoAPI } from "@/integrations/django/client";
import { TrendingUp, AlertCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CategorizedPrice {
  commodity: string;
  market: string;
  price: number;
  currency: string;
  source: string;
  timestamp: string;
  fallback_used: boolean;
  category: string;
}

const MarketPriceBoard = () => {
  const [data, setData] = useState<CategorizedPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchPrices = async () => {
      try {
        setLoading(true);
        const responseData = await djangoAPI.get<CategorizedPrice[]>("/market/dashboard-prices/");
        if (mounted) {
          setData(responseData);
        }
      } catch (err: any) {
        if (mounted) setError(err.message || "Failed to fetch market data");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void fetchPrices();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="w-full bg-card border border-border rounded-xl p-8 flex flex-col items-center justify-center min-h-[200px] shadow-sm animate-pulse mb-6 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
        <div className="h-4 w-48 bg-muted rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full bg-destructive/10 border border-destructive/20 text-destructive rounded-xl p-4 flex items-center gap-2 mb-6">
        <AlertCircle className="h-5 w-5" />
        <p className="text-sm font-medium">Failed to load real-time market data. ({error})</p>
      </div>
    );
  }

  // Group by category
  const grouped = data.reduce((acc, curr) => {
    const cat = curr.category || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(curr);
    return acc;
  }, {} as Record<string, CategorizedPrice[]>);

  return (
    <div className="space-y-6 mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-primary/20 rounded-full text-primary">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-foreground text-lg">Live Market Board</h3>
          <p className="text-sm text-muted-foreground">Real-time aggregate & fallback pricing based on your inventory</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="bg-muted px-4 py-2 border-b border-border">
              <span className="text-sm font-semibold text-foreground capitalize">{category}</span>
            </div>
            <div className="divide-y divide-border">
              {items.map((item, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div>
                    <span className="font-medium text-foreground capitalize block">{item.commodity}</span>
                    <span className="text-xs text-muted-foreground">{item.market}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-primary">KES {item.price.toFixed(2)}<span className="text-xs font-normal text-muted-foreground">/kg</span></span>
                    {item.fallback_used && (
                      <Badge variant="outline" className="text-[9px] h-3 px-1 py-0 border-muted-foreground/30 text-muted-foreground ml-2 block mt-1 w-fit ml-auto">EST</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarketPriceBoard;
