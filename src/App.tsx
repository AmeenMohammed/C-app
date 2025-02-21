
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <main className="flex-1">
              <SidebarTrigger className="fixed top-4 left-4 z-50" />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/home" element={<Home />} />
                <Route path="/items/:id" element={<ItemDetails />} />
                <Route path="/post" element={<PostItem />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
        </SidebarProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
