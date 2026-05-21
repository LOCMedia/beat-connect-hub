import { Checkbox } from "@/components/ui/checkbox";
import { Instagram } from "lucide-react";

export function FollowConfirmCheckbox({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
      <a
        href="https://instagram.com/locbeatx"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
      >
        <Instagram className="h-4 w-4" /> Follow @locbeatx on Instagram
      </a>
      <label className="flex items-start gap-2 text-sm cursor-pointer">
        <Checkbox checked={checked} onCheckedChange={(v) => onCheckedChange(v === true)} />
        <span>I confirm I follow <strong>@locbeatx</strong> on Instagram. (Required to enter)</span>
      </label>
    </div>
  );
}
