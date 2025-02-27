
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
  LogOut
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export function AppSidebar() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({
          variant: "destructive",
          description: "Error logging out. Please try again.",
        });
        return;
      }
      navigate("/");
      toast({
        description: "Successfully logged out",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        description: "An unexpected error occurred",
      });
    }
  };

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
        { 
          title: "Logout", 
          icon: LogOut, 
          onClick: handleLogout,
          className: "text-destructive hover:text-destructive"
        },
      ],
    },
  ];

  return (
    <Sidebar>
      <SidebarContent>
        {menuItems.map((group, index) => (
          <SidebarGroup key={index}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      {item.onClick ? (
                        <button 
                          onClick={item.onClick}
                          className={`flex items-center gap-2 w-full ${item.className || ''}`}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </button>
                      ) : (
                        <a href={item.url} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </a>
                      )}
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
