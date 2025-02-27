
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Index from "./pages/Index";
import Channels from "./pages/Channels";
import Messages from "./pages/Messages";
import Notifications from "./pages/Notifications";
import PostItem from "./pages/PostItem";
import Profile from "./pages/Profile";
import SavedItems from "./pages/SavedItems";
import SellerProfile from "./pages/SellerProfile";
import SignUp from "./pages/SignUp";
import Settings from "./pages/Settings";
import ItemDetails from "./pages/ItemDetails";
import PaymentMethods from "./pages/PaymentMethods";
import HelpSupport from "./pages/HelpSupport";
import NotFound from "./pages/NotFound";
import { Toaster } from "@/components/ui/toaster";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/home" element={<Home />} />
        <Route path="/channels" element={<Channels />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/post-item" element={<PostItem />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/saved-items" element={<SavedItems />} />
        <Route path="/seller/:id" element={<SellerProfile />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/item/:id" element={<ItemDetails />} />
        <Route path="/payment-methods" element={<PaymentMethods />} />
        <Route path="/help-support" element={<HelpSupport />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App;
