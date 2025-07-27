# 🇪🇬 Paymob Integration Setup Guide

Congratulations on setting up your Paymob dashboard! Now let's integrate it with your marketplace code.

## 🔑 **Getting Your Paymob Credentials**

### **Step 1: Login to Your Paymob Dashboard**
1. **Visit**: https://accept.paymob.com/
2. **Login** with your credentials
3. **Navigate** to the developer/integration section

### **Step 2: Find Your Credentials**
In your Paymob dashboard, look for these 4 key values:

#### **🔑 API Key**
- **Location**: Settings → API Keys
- **What it looks like**: `ZXlKaGJHY2lPaUpKVXpVeE1pSXNJbVY0...` (long string)
- **Purpose**: Authenticates your app with Paymob

#### **🔗 Integration ID**
- **Location**: Developers → Payment Integrations
- **What it looks like**: `1234567` (numeric ID)
- **Purpose**: Identifies which payment method to use

#### **🖼️ iFrame ID** (Optional)
- **Location**: Developers → iFrames (if you created one)
- **What it looks like**: `123456` (numeric ID)
- **Purpose**: For embedded checkout (optional)

#### **🔒 HMAC Secret** (Optional)
- **Location**: Settings → HMAC
- **What it looks like**: `abcd1234...` (string)
- **Purpose**: For webhook verification (optional)

## 📋 **Environment Variables Setup**

### **Step 3: Update Your `.env.local`**

Add these variables to your `.env.local` file:

```env
# ========================================
# Payment System Toggle
# ========================================
VITE_ENABLE_REAL_PAYMENTS="false"  # Set to "true" when ready for real payments

# ========================================
# Paymob Credentials (from your dashboard)
# ========================================
VITE_PAYMOB_API_KEY="your_api_key_here"
VITE_PAYMOB_INTEGRATION_ID="your_integration_id_here"

# Optional - if you want to use iFrame checkout
VITE_PAYMOB_IFRAME_ID="your_iframe_id_here"

# Optional - for webhook verification
VITE_PAYMOB_HMAC_SECRET="your_hmac_secret_here"

# Paymob API base URL (usually don't change this)
VITE_PAYMOB_BASE_URL="https://accept.paymob.com/api"

# Integration method - choose one:
VITE_PAYMOB_DIRECT_INTEGRATION="true"   # Direct frontend (faster setup)
# VITE_PAYMOB_DIRECT_INTEGRATION="false" # Backend integration (production)

# ========================================
# Backend API Configuration
# ========================================
VITE_API_URL="http://localhost:3000/api"  # Your backend API

# ========================================
# Promotion Pricing (Egyptian Pounds - EGP)
# ========================================
VITE_BASIC_PROMOTION_PRICE="10"     # ~$0.32 USD - Basic promotion
VITE_STANDARD_PROMOTION_PRICE="15"  # ~$0.48 USD - Standard promotion
VITE_PREMIUM_PROMOTION_PRICE="20"   # ~$0.64 USD - Premium promotion

# ========================================
# Paymob Feature Configuration
# ========================================
VITE_PAYMOB_CURRENCY="EGP"          # Egyptian Pounds
VITE_PAYMOB_LANGUAGE="ar"           # Arabic (or "en" for English)

# ========================================
# Development & Debugging
# ========================================
VITE_DEBUG_PAYMENTS="true"          # Enable detailed payment logs
VITE_LOG_LEVEL="info"              # Log level: debug, info, warn, error
```

## 🧪 **Testing Your Integration**

### **Step 4: Test Configuration**

After setting your environment variables:

```bash
# Start your development server
npm run dev

# Check the console for:
# "🇪🇬 Paymob Egypt payments enabled - real payments!"
# OR
# "✅ Safe simulation mode" (if VITE_ENABLE_REAL_PAYMENTS="false")
```

### **Step 5: Test Payment Flow**

1. **Go to**: http://localhost:5173/promoted-items
2. **Try to promote an item**
3. **Check console** for detailed logs
4. **Expected behavior**:
   - If `VITE_ENABLE_REAL_PAYMENTS="false"`: Uses simulation ✅
   - If `VITE_ENABLE_REAL_PAYMENTS="true"`: Redirects to Paymob checkout ✅

## 🔧 **Integration Modes Explained**

### **Mode 1: Direct Frontend Integration** ⚡ **(Recommended for Testing)**
```env
VITE_PAYMOB_DIRECT_INTEGRATION="true"
```

**How it works**:
1. Your app calls Paymob API directly from frontend
2. Gets auth token → Creates order → Gets payment key
3. Redirects user to Paymob checkout
4. **Faster setup, perfect for development**

### **Mode 2: Backend Integration** 🏗️ **(Recommended for Production)**
```env
VITE_PAYMOB_DIRECT_INTEGRATION="false"
```

**How it works**:
1. Your app calls your backend API
2. Backend handles Paymob integration securely
3. Returns checkout URL to frontend
4. **More secure, better for production**

## 🎯 **Quick Start Checklist**

### **✅ Essential Setup** (Do this first)
- [ ] **Get API Key** from Paymob dashboard
- [ ] **Get Integration ID** from Paymob dashboard
- [ ] **Set environment variables** in `.env.local`
- [ ] **Test with simulation mode** (`VITE_ENABLE_REAL_PAYMENTS="false"`)

### **⚡ Quick Test** (5 minutes)
- [ ] **Start dev server**: `npm run dev`
- [ ] **Check console** for Paymob status
- [ ] **Go to promoted items** page
- [ ] **Try promoting an item**
- [ ] **Verify simulation works**

### **🚀 Go Live** (When ready)
- [ ] **Verify Paymob dashboard** is fully set up
- [ ] **Test with real small amount** first
- [ ] **Set** `VITE_ENABLE_REAL_PAYMENTS="true"`
- [ ] **Test real payment flow**

## 🔍 **Troubleshooting**

### **❌ "Paymob credentials missing"**
- **Fix**: Check your `.env.local` file has `VITE_PAYMOB_API_KEY` and `VITE_PAYMOB_INTEGRATION_ID`
- **Verify**: No typos in variable names
- **Restart**: Your dev server after changing `.env.local`

### **❌ "Failed to get Paymob auth token"**
- **Fix**: Check your API Key is correct
- **Verify**: API Key is active in Paymob dashboard
- **Check**: No extra spaces or characters in API Key

### **❌ "Failed to create Paymob order"**
- **Fix**: Check your Integration ID is correct
- **Verify**: Integration is active in Paymob dashboard
- **Check**: Amount is greater than 0

### **❌ "Network connection error"**
- **Fix**: Check your internet connection
- **Verify**: Paymob API is not blocked by firewall
- **Try**: Different network (mobile hotspot)

## 🎉 **Your Integration Status**

### **✅ Already Complete**
- ✅ **Toggle system** - Works perfectly with Paymob
- ✅ **Frontend components** - Payment method selection ready
- ✅ **Database schema** - Payment methods table exists
- ✅ **Error handling** - Comprehensive error management
- ✅ **Paymob implementation** - `paymobPayment.production.ts` created
- ✅ **Payment routing** - Updated to use Paymob

### **🔧 What You Just Need to Do**
1. **Get credentials** from your Paymob dashboard ← **You're here!**
2. **Set environment variables** (using this guide)
3. **Test with simulation** (keep it safe)
4. **Test with real Paymob** (when ready)

## 📞 **Paymob Support**

If you need help:
- **Email**: support@paymob.com
- **Documentation**: https://docs.paymob.com/
- **Dashboard**: https://accept.paymob.com/

## 🚀 **Example Integration Flow**

Here's what happens when a user promotes an item:

```
User clicks "Promote Item"
    ↓
Your app creates promotion as 'pending'
    ↓
Your app calls Paymob payment processor
    ↓
Paymob creates order and payment key
    ↓
User redirected to Paymob checkout
    ↓
User pays with their preferred method
    ↓
Paymob processes payment
    ↓
User redirected to /payment-success page
    ↓
Payment confirmed & promotion activated! ✅
```

## 🔗 **Important: Configure Return URL in Paymob Dashboard**

**You must also configure the return URL in your Paymob dashboard:**

1. **Login to**: https://accept.paymob.com/
2. **Go to**: Developers → Payment Integrations
3. **Edit your integration**
4. **Set Return URL to**: `http://localhost:8080/payment-success` (development)
5. **For production**: `https://yourdomain.com/payment-success`

This ensures Paymob redirects users back to your app after payment completion.

---

**🇪🇬 Perfect choice!** Paymob is Egyptian-built and perfectly suited for your marketplace. Your toggle system makes this integration seamless - just set those environment variables and you're ready to process real payments through Paymob!

**Next step**: Get your credentials from the Paymob dashboard and update your `.env.local` file! 🎯