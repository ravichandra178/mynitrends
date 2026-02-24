import { TrendingUp, FileText, Settings, ClipboardCheck } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";

const navItems = [
  { title: "Trends", url: "/trends", icon: TrendingUp },
  { title: "Posts", url: "/posts", icon: FileText },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Review", url: "/review", icon: ClipboardCheck },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-surface min-h-screen flex flex-col">
      <div className="p-4 border-b border-border">
        <h1 className="text-base font-semibold tracking-tight">Myni TrendBot</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Social Media Automation</p>
      </div>
      <nav className="flex-1 p-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.url;
          return (
            <NavLink
              key={item.url}
              to={item.url}
              end
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-accent font-medium text-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
              activeClassName=""
            >
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
