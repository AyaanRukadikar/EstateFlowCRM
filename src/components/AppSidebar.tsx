import { NavLink } from "@/components/NavLink";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
  Handshake,
  Activity,
  ChevronLeft,
  ChevronRight,
  LogOut,
  UserCircle,
  ShieldCheck,
  BarChart3,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Badge } from "@/components/ui/badge";

const baseNav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Properties", url: "/properties", icon: Building2 },
  { title: "Leads", url: "/leads", icon: Users },
  { title: "Deals", url: "/deals", icon: Handshake },
  { title: "Activities", url: "/activities", icon: Activity },
  { title: "Profile", url: "/profile", icon: UserCircle },
];

const roleLabel: Record<string, string> = {
  admin: "Admin",
  sales_manager: "Manager",
  agent: "Agent",
};

interface Props {
  onNavigate?: () => void;
}

export function AppSidebar({ onNavigate }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { role, isAdmin, isManager } = useUserRole();

  const navItems = [
    ...baseNav,
    ...(isManager ? [{ title: "Reports", url: "/reports", icon: BarChart3 }] : []),
    ...(isAdmin ? [{ title: "Team", url: "/admin/users", icon: ShieldCheck }] : []),
  ];

  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 min-h-screen",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0">
          <Building2 className="w-4 h-4 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold text-sidebar-accent-foreground tracking-tight">
            EstateFlow
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => {
          return (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === "/"}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed && "justify-center px-2"
              )}
              activeClassName="bg-sidebar-accent text-sidebar-primary"
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User & controls */}
      <div className="p-2 border-t border-sidebar-border space-y-1">
        {!collapsed && user && (
          <div className="px-3 py-2 space-y-1">
            <div className="text-xs text-sidebar-muted truncate">{user.email}</div>
            {role && (
              <Badge variant="outline" className="text-[10px] h-5">
                {roleLabel[role]}
              </Badge>
            )}
          </div>
        )}
        <div className="flex items-center justify-center gap-1">
          <ThemeToggle />
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sidebar-muted hover:bg-sidebar-accent hover:text-destructive transition-colors text-sm"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Sign Out</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors text-sm"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
