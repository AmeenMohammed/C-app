
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Settings,
  CreditCard,
  LayoutGrid,
  MessageSquare,
  Bell,
  Heart,
  HelpCircle,
} from "lucide-react";
import { useLocation } from "react-router-dom";

const menuItems = [
  {
    label: "Main",
    items: [
      { title: "Browse", icon: LayoutGrid, url: "/home" },
      { title: "Messages", icon: MessageSquare, url: "/messages" },
      { title: "Notifications", icon: Bell, url: "/notifications" },
      { title: "Saved Items", icon: Heart, url: "/saved-items" },
    ],
  },
  {
    label: "Account",
    items: [
      { title: "Settings", icon: Settings, url: "/settings" },
      { title: "Payment Methods", icon: CreditCard, url: "/payment-methods" },
      { title: "Help & Support", icon: HelpCircle, url: "/help-support" },
    ],
  },
];

export function AppSidebar() {
  const location = useLocation();

  // Don't show sidebar on login or signup pages
  const isAuthPage = location.pathname === "/" || location.pathname === "/signup";

  if (isAuthPage) {
    return null;
  }

  return (
    <Sidebar className="mt-16">
      <SidebarContent>
        {menuItems.map((group, index) => (
          <SidebarGroup key={index}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <a href={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
