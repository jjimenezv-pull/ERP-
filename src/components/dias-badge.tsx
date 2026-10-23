import { Badge } from "@/components/ui/badge";
import { claseDias } from "@/lib/dias";
import { cn } from "@/lib/utils";

// Pastilla con el número de días coloreada por antigüedad (ver claseDias).
export function DiasBadge({ dias, className }: { dias: number | null; className?: string }) {
  if (dias === null) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge variant="outline" className={cn("tabular-nums", claseDias(dias), className)}>
      {dias}
    </Badge>
  );
}
