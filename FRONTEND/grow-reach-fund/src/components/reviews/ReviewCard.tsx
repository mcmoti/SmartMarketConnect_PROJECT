import StarRating from "./StarRating";

interface ReviewCardProps {
  reviewerName: string;
  rating: number;
  comment: string;
  date: string;
}

const ReviewCard = ({ reviewerName, rating, comment, date }: ReviewCardProps) => (
  <div className="bg-card rounded-xl border border-border p-5">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
          {reviewerName.charAt(0).toUpperCase()}
        </div>
        <p className="font-medium text-foreground text-sm">{reviewerName}</p>
      </div>
      <p className="text-xs text-muted-foreground">{date}</p>
    </div>
    <StarRating value={rating} readonly size="sm" />
    <p className="text-sm text-muted-foreground mt-2">{comment}</p>
  </div>
);

export default ReviewCard;
