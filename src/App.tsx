
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Index from "./pages/Index";
import Home from "./pages/Home";
import ItemDetails from "./pages/ItemDetails";
import PostItem from "./pages/PostItem";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import SignUp from "./pages/SignUp";
import Messages from "./pages/Messages";
import Notifications from "./pages/Notifications";
import SavedItems from "./pages/SavedItems";
import Settings from "./pages/Settings";
import PaymentMethods from "./pages/PaymentMethods";
import HelpSupport from "./pages/HelpSupport";
import Channels from "./pages/Channels";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <TooltipProvider>
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <main className="flex-1">
              <SidebarTrigger className="fixed top-4 left-4 z-50" />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/home" element={<Home />} />
                <Route path="/channels" element={<Channels />} />
                <Route path="/items/:id" element={<ItemDetails />} />
                <Route path="/post" element={<PostItem />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/saved-items" element={<SavedItems />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/payment-methods" element={<PaymentMethods />} />
                <Route path="/help-support" element={<HelpSupport />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
        </SidebarProvider>
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
