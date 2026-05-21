import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export const NotificationBell = () => {
  const { items, unreadCount, markRead, markAllRead } = useNotifications();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-[11px] font-normal text-primary hover:underline">
              Mark all read
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            You're all caught up 🎉
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {items.map((n) => {
              const inner = (
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-sm leading-tight">{n.title}</span>
                    {!n.is_read && <span className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />}
                  </div>
                  {n.message && (
                    <span className="text-xs text-muted-foreground line-clamp-2">{n.message}</span>
                  )}
                  <span className="text-[10px] text-muted-foreground/70 mt-0.5">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </span>
                </div>
              );
              return (
                <DropdownMenuItem
                  key={n.id}
                  onSelect={() => markRead(n.id)}
                  className={cn("cursor-pointer items-start py-2.5", !n.is_read && "bg-primary/5")}
                  asChild={!!n.link}
                >
                  {n.link ? <Link to={n.link}>{inner}</Link> : inner}
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};