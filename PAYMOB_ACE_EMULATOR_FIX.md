# 🎯 Fix Paymob ACE Emulator Issue

## 🔍 **What's Happening**

The **ACE Emulator page** means you're using **Paymob's test environment** instead of live payments. This is actually **good news** - your integration works! We just need to switch to production.

## 🚀 **Solution Steps**

### **Step 1: Switch to Production in Paymob Dashboard**

1. **Login to your Paymob Dashboard**
2. **Look for environment toggle**:
   - Top-right corner or settings
   - Switch from **"Sandbox"** → **"Live"** or **"Production"**
   - Some accounts show **"Test Mode"** toggle - turn it **OFF**

### **Step 2: Get Production Credentials**

Once in **Production Mode**, collect these:

```bash
✅ Production API Key (different from test key)
✅ Production Integration ID (different from test ID)
✅ Production iFrame ID (optional, different from test)
```

**Where to find them:**
- **API Key**: Settings → API Keys → **Live** tab
- **Integration ID**: Settings → Integrations → **Live** integrations
- **iFrame ID**: Settings → iFrames → **Live** iframes

### **Step 3: Update Supabase Secrets**

In your **Supabase Dashboard** → **Edge Functions** → **Secrets**:

1. **Update existing secrets** with **production values**:
   ```bash
   PAYMOB_API_KEY = [Your LIVE API key - starts differently than test]
   PAYMOB_INTEGRATION_ID = [Your LIVE integration ID - different number]
   PAYMOB_IFRAME_ID = [Your LIVE iframe ID - optional]
   ```

2. **Redeploy** your Edge Function if needed

### **Step 4: Test Again**

1. Try promoting an item
2. Check **Supabase Edge Function logs** for debug messages
3. Should redirect to **real Paymob checkout** (not ACE Emulator)

## 🔍 **How to Verify You're Using Production**

### **Check Edge Function Logs**

In **Supabase** → **Edge Functions** → **Logs**, look for:

```bash
✅ Good: "🔗 Checkout URL: https://accept.paymob.com/api/acceptance/post_pay?payment_token=ZXlKaGJHY2lPaU..."

❌ Bad: "⚠️ WARNING: This appears to be a TEST payment token"
```

### **Check Payment Token**

- **Test tokens** often contain obvious test indicators
- **Live tokens** are longer and more complex

## 🚨 **Important Notes**

### **Production vs Test Differences**

| Environment | API Key Prefix | Integration ID | Behavior |
|-------------|---------------|----------------|----------|
| **Test** | Usually shorter | Lower numbers | ACE Emulator |
| **Production** | Usually starts with `ZXlK...` | Higher numbers | Real checkout |

### **Security Reminder**

- ✅ **Production keys** = Real money transactions
- ✅ Always test with **small amounts** first
- ✅ Keep credentials secure in Supabase secrets only

## 🐛 **Still Seeing ACE Emulator?**

### **Double-check:**

1. **Environment**: Are you in **Live mode** in Paymob dashboard?
2. **Credentials**: Are you using **production** API key and integration ID?
3. **Cache**: Clear browser cache and try again
4. **Logs**: Check Supabase function logs for any warnings

### **Contact Paymob Support**

If still having issues:
- Email: support@paymob.com
- Tell them: "Getting ACE Emulator instead of live checkout"
- Provide: Your merchant ID and integration details

## ✅ **Success Indicators**

You'll know it's working when:
- ✅ Real payment form (not emulator)
- ✅ Actual card processing
- ✅ Real transaction IDs
- ✅ Money movement in your Paymob dashboard

## 💡 **Pro Tips**

1. **Test with small amounts** first (1 EGP)
2. **Keep test credentials** handy for development
3. **Monitor transactions** in Paymob dashboard
4. **Set up webhooks** for payment confirmations (optional)