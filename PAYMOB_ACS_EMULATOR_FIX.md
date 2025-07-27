# 🔧 Fix Paymob ACS Emulator Issue

## 🎯 **Problem**
When users complete payments, they see a weird "ACS emulator" page instead of a smooth payment experience.

## 🚨 **Root Cause**
- **ACS Emulator** = Access Control Server emulator for 3D Secure authentication
- **Appears in test/sandbox environment** only
- **Poor user experience** and looks unprofessional

## ✅ **Solutions** (in order of preference)

### **🏆 Solution 1: Use Production Environment**

Update your `.env.local` file:

```env
# ========================================
# Payment System Toggle
# ========================================
VITE_ENABLE_REAL_PAYMENTS="true"  # Enable production payments

# ========================================
# Paymob Credentials - GET FROM PRODUCTION DASHBOARD
# ========================================
# ⚠️ IMPORTANT: Get these from PRODUCTION dashboard, NOT sandbox
VITE_PAYMOB_API_KEY="your_production_api_key_here"
VITE_PAYMOB_INTEGRATION_ID="your_production_integration_id_here"

# 🎯 CRITICAL: Set iframe ID to avoid ACS emulator
VITE_PAYMOB_IFRAME_ID="your_production_iframe_id_here"

# Optional but recommended
VITE_PAYMOB_HMAC_SECRET="your_production_hmac_secret_here"

# Force iframe integration (avoids ACS emulator)
VITE_PAYMOB_USE_IFRAME="true"

# Production API URL
VITE_PAYMOB_BASE_URL="https://accept.paymob.com/api"
```

### **🎯 Solution 2: Create iframe Integration in Paymob Dashboard**

1. **Login to**: https://accept.paymob.com/
2. **Go to**: Developers → iFrames
3. **Click**: "Create New iFrame"
4. **Configure**:
   - **Name**: "Marketplace Checkout"
   - **Integration**: Select your integration
   - **Return URL**: `https://yourdomain.com/payment-success`
   - **Logo**: Upload your logo (optional)
5. **Save** and copy the **iframe ID**
6. **Add to `.env.local`**: `VITE_PAYMOB_IFRAME_ID="your_iframe_id"`

### **🔄 Solution 3: Configure Return URLs Properly**

In your Paymob dashboard:
1. **Go to**: Developers → Payment Integrations
2. **Edit your integration**
3. **Set Return URL**:
   - Development: `http://localhost:8080/payment-success`
   - Production: `https://yourdomain.com/payment-success`
4. **Set Callback URL**: Same as return URL
5. **Save changes**

## 🚀 **Testing the Fix**

### **Before Fix** (ACS Emulator appears):
```
User pays → Redirected to accept.paymob.com → ACS Emulator page → Confusion
```

### **After Fix** (Smooth iframe experience):
```
User pays → Iframe checkout → Direct success → No ACS emulator
```

## 🔍 **How to Verify It's Working**

1. **Check browser console** for these logs:
   - `🎯 Using iframe integration - no ACS emulator`
   - `✅ Paymob payment session created`

2. **Payment URL should look like**:
   ```
   https://accept.paymob.com/api/acceptance/iframes/YOUR_IFRAME_ID?payment_token=...
   ```

3. **Should NOT see**:
   - "ACS emulator" text
   - Weird authentication pages
   - Test environment messages

## ⚠️ **Important Notes**

- **Production credentials** are different from sandbox
- **iframe integration** requires setup in dashboard
- **Test with small amounts** first (1 EGP)
- **ACS emulator only appears in sandbox** - production won't show it

## 🆘 **If Still Seeing ACS Emulator**

1. **Double-check environment**:
   ```bash
   echo $VITE_PAYMOB_API_KEY  # Should be production key
   ```

2. **Verify iframe ID**:
   ```bash
   echo $VITE_PAYMOB_IFRAME_ID  # Should be set
   ```

3. **Check browser network tab**:
   - URL should contain `/iframes/` not `/post_pay`

4. **Contact Paymob support**:
   - Email: support@paymob.com
   - Ask about "disabling ACS emulator in production"

## ✅ **Success Indicators**

- ✅ No "ACS emulator" page
- ✅ Smooth payment flow
- ✅ Professional appearance
- ✅ Direct redirect to success page
- ✅ Users complete payments without confusion

The code has been updated to automatically prefer iframe integration when available!