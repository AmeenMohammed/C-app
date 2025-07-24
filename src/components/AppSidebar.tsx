
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
import { useLanguage } from "@/contexts/LanguageContext";

export function AppSidebar() {
  const location = useLocation();
  const { t } = useLanguage();

  const menuItems = [
    {
      label: t('main'),
      items: [
        { title: t('browse'), icon: LayoutGrid, url: "/home" },
        { title: t('messages'), icon: MessageSquare, url: "/messages" },
        { title: t('notifications'), icon: Bell, url: "/notifications" },
        { title: t('savedItems'), icon: Heart, url: "/saved-items" },
      ],
    },
    {
      label: t('account'),
      items: [
        { title: t('settings'), icon: Settings, url: "/settings" },
        { title: t('paymentMethods'), icon: CreditCard, url: "/payment-methods" },
        { title: t('helpSupport'), icon: HelpCircle, url: "/help-support" },
      ],
    },
  ];

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
