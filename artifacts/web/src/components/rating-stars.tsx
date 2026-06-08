import { Star, StarHalf } from "lucide-react";

interface RatingStarsProps {
  rating: number;
  size?: "sm" | "md" | "lg";
}

export function RatingStars({ rating, size = "md" }: RatingStarsProps) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  const sizeClass = size === "sm" ? "w-3 h-3" : size === "md" ? "w-5 h-5" : "w-8 h-8";

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star key={`full-${i}`} className={`${sizeClass} fill-amber-500 text-amber-500`} />
      ))}
      {hasHalfStar && <StarHalf className={`${sizeClass} fill-amber-500 text-amber-500`} />}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Star key={`empty-${i}`} className={`${sizeClass} text-muted-foreground/30`} />
      ))}
    </div>
  );
}
