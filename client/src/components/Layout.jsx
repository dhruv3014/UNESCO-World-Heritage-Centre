import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth.jsx";
import { Badge, Button } from "@/components/ui/index.jsx";
import { Landmark, LayoutDashboard, Database, History, LogOut, Home, Search, Map, Rss, Table2 } from "lucide-react";
import { cn } from "@/lib/utils.js";

const navItems = [
  { to: "/", label: "Overview", icon: Home, end: true },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: false },
  { to: "/browse", label: "Data Explorer", icon: Database, end: false },
  { to: "/search", label: "Search", icon: Search, end: false },
  { to: "/map", label: "Site Map", icon: Map, end: false },
  { to: "/feed", label: "My Feed", icon: Rss, end: false },
  { to: "/history", label: "Change History", icon: History, end: false },
  { to: "/schema", label: "Schema Editor", icon: Table2, end: false, adminOnly: true },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const visibleNav = navItems.filter((item) => !item.adminOnly || user?.role === "ADMIN");

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 shrink-0 border-r border-border bg-card hidden md:flex flex-col">
        <div className="flex items-center gap-2 px-5 h-16 border-b border-border">
          <Landmark className="h-6 w-6 text-primary" />
          <div>
            <div className="font-semibold leading-tight">UNESCO WHC</div>
            <div className="text-xs text-muted-foreground">Heritage Database</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-auto">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{user?.name || user?.email}</div>
              <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            </div>
            <Badge tone={user?.role === "ADMIN" ? "blue" : "green"}>{user?.role}</Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between h-14 px-4 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            <span className="font-semibold">UNESCO WHC</span>
          </div>
          <Badge tone={user?.role === "ADMIN" ? "blue" : "green"}>{user?.role}</Badge>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
