import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext.jsx";
import { Badge, Button } from "@/components/ui/index.jsx";
import { Landmark, LayoutDashboard, Database, History, LogOut, Home, Search, Map, Rss, Table2 } from "lucide-react";
import { cn } from "@/lib/utils.js";

const NAV_ITEMS = [
  { to: "/", label: "Overview", icon: Home, end: true },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/explorer", label: "Data Explorer", icon: Database },
  { to: "/search", label: "Search", icon: Search },
  { to: "/map", label: "Site Map", icon: Map },
  { to: "/feed", label: "My Feed", icon: Rss },
  { to: "/history", label: "Change History", icon: History },
  { to: "/schema", label: "Schema Editor", icon: Table2, adminOnly: true },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === "ADMIN");

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <Landmark className="h-6 w-6 text-primary" />
          <div>
            <div className="font-semibold leading-tight">UNESCO WHC</div>
            <div className="text-xs text-muted-foreground">Heritage Database</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-auto p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{user?.name || user?.email}</div>
              <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
            </div>
            <Badge tone={user?.role === "ADMIN" ? "blue" : "green"}>{user?.role}</Badge>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 md:hidden">
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
