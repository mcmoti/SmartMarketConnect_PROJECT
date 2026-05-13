import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
  readonly?: boolean;
}

const sizes = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-7 w-7" };

const StarRating = ({ value, onChange, size = "md", readonly = false }: StarRatingProps) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        disabled={readonly}
        onClick={() => onChange?.(star)}
        className={`${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"} transition-transform`}
      >
        <Star
          className={`${sizes[size]} ${
            star <= value ? "fill-secondary text-secondary" : "text-border"
          }`}
        />
      </button>
    ))}
  </div>
);

export default StarRating;
