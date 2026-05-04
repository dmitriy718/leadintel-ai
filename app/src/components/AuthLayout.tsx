import { useAuth } from "@/hooks/useAuth";
import { useShowAds } from "@/hooks/useShowAds";
import AdSlot from "@/components/AdSlot";
import EmailVerificationBanner from "./EmailVerificationBanner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { LayoutDashboard, Target, Users, LogOut, PanelLeft, Zap, CreditCard, Trophy, Globe } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { AuthLayoutSkeleton } from "./AuthLayoutSkeleton";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Target, label: "Campaigns", path: "/campaigns" },
  { icon: Users, label: "Leads", path: "/leads" },
  { icon: Globe, label: "Visitors", path: "/visitors" },
  { icon: Trophy, label: "Leaderboard", path: "/leaderboard" },
  { icon: CreditCard, label: "Billing", path: "/billing" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function AuthLayout({ children }: { children: ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { isLoading, user } = useAuth({ redirectOnUnauthenticated: true });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (isLoading) return <AuthLayoutSkeleton />;

  if (!user) return null;

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <AuthLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </AuthLayoutContent>
    </SidebarProvider>
  );
}

type AuthLayoutContentProps = {
  children: ReactNode;
  setSidebarWidth: (width: number) => void;
};

function AuthLayoutContent({ children, setSidebarWidth }: AuthLayoutContentProps) {
  const { user, logout, isAdmin } = useAuth();
  const showAds = useShowAds();
  const location = useLocation();
  const navigate = useNavigate();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location.pathname);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const displayName = user?.name || user?.username || "User";
  const initials = (user?.name || user?.username || "U").charAt(0).toUpperCase();

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r-0">
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-6 w-6 bg-stone-900 flex items-center justify-center">
                    <Zap className="h-3.5 w-3.5 text-stone-50" />
                  </div>
                  <span className="font-bold tracking-tight truncate text-sm">LeadIntel AI</span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            {showAds && !isCollapsed && (
              <div className="px-3 py-2">
                <AdSlot slot="dashboard-sidebar" format="rectangle" className="mx-auto" />
              </div>
            )}
            <SidebarMenu className="px-2 py-1">
              {menuItems.map(item => {
                const isActive = location.pathname === item.path || (item.path !== "/dashboard" && location.pathname.startsWith(item.path));
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => navigate(item.path)}
                      tooltip={item.label}
                      className="h-10 transition-all font-normal"
                    >
                      <item.icon className={`h-4 w-4 ${isActive ? "text-stone-900" : ""}`} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={location.pathname.startsWith("/admin")}
                    onClick={() => navigate("/admin")}
                    tooltip="Admin"
                    className="h-10 transition-all font-normal"
                  >
                    <Users className={`h-4 w-4 ${location.pathname.startsWith("/admin") ? "text-stone-900" : ""}`} />
                    <span>Admin</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-stone-900 text-stone-50">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">{user?.email || "-"}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer">
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => { if (isCollapsed) return; setIsResizing(true); }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        <EmailVerificationBanner />
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-backdrop-filter:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <span className="tracking-tight text-foreground font-medium">{activeMenuItem?.label ?? "Menu"}</span>
            </div>
          </div>
        )}
        <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">{children}</main>
      </SidebarInset>
    </>
  );
}
