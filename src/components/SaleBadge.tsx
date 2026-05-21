import { Flame } from "lucide-react";
import { CountdownTimer } from "./CountdownTimer";

export interface FlashSale {
  id: string;
  beat_id: string;
  discount_percent: number;
  original_price: number;
  sale_price: number;
  start_time: string;
  end_time: string;
  active: boolean;
}

export const isSaleLive = (s: FlashSale | null | undefined) => {
  if (!s || !s.active) return false;
  const now = Date.now();
  return new Date(s.start_time).getTime() <= now && new Date(s.end_time).getTime() > now;
};

export const SaleBadge = ({ sale, onEnd }: { sale: FlashSale; onEnd?: () => void }) => (
  <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-heat to-primary px-2.5 py-1 text-[10px] font-bold text-white shadow-glow">
    <Flame className="h-3 w-3" />
    <span>FLASH {sale.discount_percent}% OFF</span>
    <span className="opacity-80">·</span>
    <CountdownTimer to={sale.end_time} onEnd={onEnd} className="tabular-nums" />
  </div>
);

export default SaleBadge;