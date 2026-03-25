
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Index from "./pages/Index";
import Home from "./pages/Home";
import ItemDetails from "./pages/ItemDetails";
import PostItem from "./pages/PostItem";
import EditItem from "./pages/EditItem";
import Profile from "./pages/Profile";
import SellerProfile from "./pages/SellerProfile";
import NotFound from "./pages/NotFound";
import SignUp from "./pages/SignUp";
import AuthCallback from "./pages/AuthCallback";
import Messages from "./pages/Messages";
import Notifications from "./pages/Notifications";
import SavedItems from "./pages/SavedItems";
import Settings from "./pages/Settings";
// Removed PaymentMethods import - using direct Paymob integration instead
import PromotedItems from "./pages/PromotedItems";
import HelpSupport from "./pages/HelpSupport";
import Channels from "./pages/Channels";
import CreateChannel from "./pages/CreateChannel";
import LocationMap from "./pages/LocationMap";
import PaymentSuccess from "./pages/PaymentSuccess";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <LanguageProvider>
        <AuthProvider>
          <HashRouter>
            <TooltipProvider>
              <SidebarProvider>
              <div className="min-h-screen flex w-full">
                {/* <AppSidebar /> */}
                <main className="flex-1">
                  {/* <SidebarTrigger className="fixed top-4 left-4 z-50" /> */}
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Index />} />
                    <Route path="/signup" element={<SignUp />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route path="/home" element={<Home />} />
                    <Route path="/location-map" element={<LocationMap />} />
                    <Route path="/items/:id" element={<ItemDetails />} />
                    <Route path="/seller/:id" element={<SellerProfile />} />
                    <Route path="/help-support" element={<HelpSupport />} />

                    {/* Protected Routes */}
                    <Route
                      path="/channels"
                      element={
                        <ProtectedRoute>
                          <Channels />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/channels/create"
                      element={
                        <ProtectedRoute>
                          <CreateChannel />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/post"
                      element={
                        <ProtectedRoute>
                          <PostItem />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/edit-item/:id"
                      element={
                        <ProtectedRoute>
                          <EditItem />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/profile"
                      element={
                        <ProtectedRoute>
                          <Profile />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/messages"
                      element={
                        <ProtectedRoute>
                          <Messages />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/notifications"
                      element={
                        <ProtectedRoute>
                          <Notifications />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/saved-items"
                      element={
                        <ProtectedRoute>
                          <SavedItems />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings"
                      element={
                        <ProtectedRoute>
                          <Settings />
                        </ProtectedRoute>
                      }
                    />
                    {/* Removed payment-methods route - using direct Paymob integration instead */}
                    <Route
                      path="/promoted-items"
                      element={
                        <ProtectedRoute>
                          <PromotedItems />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/payment-success"
                      element={
                        <ProtectedRoute>
                          <PaymentSuccess />
                        </ProtectedRoute>
                      }
                    />

                    {/* Catch all route */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
              </div>
            </SidebarProvider>
              <Toaster />
              <Sonner />
            </TooltipProvider>
          </HashRouter>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
