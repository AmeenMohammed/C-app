# 🏪 Amazon Payment Services (APS) Environment Setup

This guide shows you exactly what environment variables to set in your `.env.local` file for APS integration.

## 📋 **Environment Variables Checklist**

Copy these to your `.env.local` file and replace with your actual APS credentials:

```env
# ========================================
# Payment System Toggle
# ========================================
VITE_ENABLE_REAL_PAYMENTS="false"  # Set to "true" when ready for real payments

# ========================================
# Amazon Payment Services Credentials
# ========================================
# Get these from your APS merchant dashboard after account approval
VITE_APS_MERCHANT_ID="your_merchant_identifier_here"
VITE_APS_ACCESS_CODE="your_access_code_here"
VITE_APS_SHA_REQUEST_PHRASE="your_sha_request_phrase_here"
VITE_APS_SHA_RESPONSE_PHRASE="your_sha_response_phrase_here"

# Environment URLs
VITE_APS_BASE_URL="https://sbcheckout.payfort.com"  # Sandbox
# VITE_APS_BASE_URL="https://checkout.payfort.com"  # Production

# ========================================
# Backend API Configuration
# ========================================
VITE_API_URL="http://localhost:3000/api"  # Your backend API base URL

# ========================================
# Promotion Pricing (Egyptian Pounds - EGP)
# ========================================
# Competitive pricing for Egyptian market
VITE_BASIC_PROMOTION_PRICE="10"     # ~$0.32 USD - Basic promotion
VITE_STANDARD_PROMOTION_PRICE="15"  # ~$0.48 USD - Standard promotion
VITE_PREMIUM_PROMOTION_PRICE="20"   # ~$0.64 USD - Premium promotion

# ========================================
# APS Feature Configuration
# ========================================
# Payment methods to enable
VITE_APS_PAYMENT_METHODS="VISA,MASTERCARD,MEEZA,INSTALLMENTS"
VITE_APS_CURRENCY="EGP"  # Egyptian Pounds
VITE_APS_LANGUAGE="ar"   # Arabic (or "en" for English)

# ========================================
# Security & Compliance
# ========================================
# Additional security settings for Egyptian market
VITE_APS_3DS_ENABLED="true"      # Enable 3D Secure for cards
VITE_APS_TOKENIZATION="true"     # Enable card tokenization for repeat customers
VITE_APS_FRAUD_CHECK="true"      # Enable advanced fraud detection
```

## 🔑 **Getting Your APS Credentials**

### **Step 1: Create APS Account**
1. **Visit**: https://paymentservices.amazon.com/
2. **Click**: "Get Started" or "Contact Sales"
3. **Select**: Egypt as your country
4. **Fill out**: Business registration form

### **Step 2: Required Documents (Egypt)**
- 📄 **Commercial Registration** (Egyptian business license)
- 🏦 **Bank Account Details** (Egyptian bank account for settlements)
- 📋 **Tax Registration** (Tax card/VAT certificate)
- 🆔 **Owner ID** (National ID of business owner)
- 📊 **Business Description** (Explain your marketplace model)

### **Step 3: Get Credentials**
After approval, you'll receive:
- **Merchant Identifier** → `VITE_APS_MERCHANT_ID`
- **Access Code** → `VITE_APS_ACCESS_CODE`
- **SHA Request Phrase** → `VITE_APS_SHA_REQUEST_PHRASE`
- **SHA Response Phrase** → `VITE_APS_SHA_RESPONSE_PHRASE`

## 🧪 **Testing Configuration**

### **Sandbox Testing**
```env
# Use these settings for testing
VITE_ENABLE_REAL_PAYMENTS="false"  # Keep simulation mode
VITE_APS_BASE_URL="https://sbcheckout.payfort.com"  # Sandbox URL
```

### **Production Setup**
```env
# Only change these when ready for real payments
VITE_ENABLE_REAL_PAYMENTS="true"   # Enable real payments
VITE_APS_BASE_URL="https://checkout.payfort.com"  # Production URL
```

## 🚀 **Your Integration Status**

### ✅ **Already Complete**
- ✅ **Toggle system** - Works perfectly with APS
- ✅ **Frontend components** - Payment method selection ready
- ✅ **Database schema** - Payment methods table exists
- ✅ **Error handling** - Comprehensive error management
- ✅ **APS implementation** - `apsPayment.production.ts` created

### 🔧 **Next Steps**
1. **Set environment variables** (using this guide)
2. **Create APS account** and get credentials
3. **Test with sandbox** credentials
4. **Implement backend endpoints** (see backend guide below)
5. **Go live** with production credentials

## 🔗 **Backend Integration Required**

You'll need these API endpoints in your backend:

### **Endpoint 1: Create Payment**
`POST /api/payments/aps/create`

### **Endpoint 2: Process Saved Payment**
`POST /api/payments/aps/process-saved`

### **Endpoint 3: Webhook Handler**
`POST /api/webhooks/aps`

## 🎯 **Quick Test Commands**

After setting up environment variables, test your configuration:

```bash
# Check if APS config is loaded correctly
npm run dev
# Look for: "🏪 Amazon Payment Services enabled" in console

# Test payment flow (will use simulation)
# Go to: http://localhost:5173/promoted-items
# Try to promote an item
```

## 🔒 **Security Best Practices**

- ✅ **Never commit** `.env.local` to git
- ✅ **Use different credentials** for sandbox vs production
- ✅ **Enable 3D Secure** for card payments
- ✅ **Implement proper webhook validation**
- ✅ **Log all payment events** for debugging

## 📞 **APS Support**

If you need help with APS setup:
- **Email**: support@payfort.com
- **Phone**: Available in merchant dashboard
- **Documentation**: https://paymentservices.amazon.com/docs/

---

**🎉 Ready to go!** Your toggle system architecture makes APS integration seamless. Just set these environment variables and you're ready to process payments through Amazon Payment Services in Egypt!