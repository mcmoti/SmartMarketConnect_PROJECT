import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Star } from "lucide-react";
import { djangoAPI } from "@/integrations/django/client";
import { toast } from "sonner";
import type { Order } from "@/hooks/useOrders";

interface Props {
  order: Order | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ReviewDialog({ order, onClose, onSuccess }: Props) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  if (!order) return null;

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await djangoAPI.post("/reviews/", {
        product: order.listing_id,
        transaction: (order as any).transaction,
        rating,
        comment,
      });
      toast.success("Review submitted successfully");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.non_field_errors?.[0] || "Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!order} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review your purchase</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <p className="font-semibold">{order.crop_name}</p>
            <p className="text-sm text-muted-foreground">Purchased from {order.farmer_name}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="text-2xl transition-colors hover:text-yellow-500 focus:outline-none"
                >
                  <Star
                    className={`h-8 w-8 ${star <= rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground/30"}`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Comment</label>
            <Textarea
              placeholder="How was the quality of the produce?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="resize-none"
              rows={4}
            />
          </div>
        </div>
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
