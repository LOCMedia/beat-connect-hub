import type { ReactNode } from "react";

// USD-only pricing. All stored prices are in GBP pence (legacy field name);
// we treat the integer as USD cents for display to keep things simple and reliable.
const fmt = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format((cents || 0) / 100);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => <>{children}</>;

export const Price = ({
  gbpPence,
  className,
}: {
  gbpPence: number;
  className?: string;
  secondary?: boolean;
}) => <span className={className}>{fmt(gbpPence)}</span>;
