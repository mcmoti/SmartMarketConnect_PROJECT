import { LucideIcon } from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

interface MobileBottomNavProps {
  items: NavItem[];
  activeId: string;
  onSelect: (id: string) => void;
}

const MobileBottomNav = ({ items, activeId, onSelect }: MobileBottomNavProps) => (
  <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-bottom">
    <div className="flex">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 min-h-[56px] transition-colors relative ${
            activeId === item.id ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <item.icon className="h-5 w-5" />
          <span className="text-[10px] font-medium">{item.label}</span>
          {item.badge && item.badge > 0 && (
            <span className="absolute top-1.5 right-1/2 translate-x-3 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {item.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  </nav>
);

export default MobileBottomNav;
