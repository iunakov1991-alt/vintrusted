# Deployment Checklist

## ✅ Pre-Deployment (Completed)
- [x] All API files syntax validated
- [x] vercel.json validated and corrected
- [x] All builds exist in vercel.json
- [x] All routes configured
- [x] Main pages exist (index.html, report.html, success.html)
- [x] No missing dependencies
- [x] Removed non-existent stripe-config.js from builds

## 🔍 Post-Deployment Checks

### 1. Check Vercel Dashboard
- Go to https://vercel.com/dashboard
- Find your project
- Check latest deployment status
- Review build logs for errors

### 2. Test API Endpoints
Run: `./check-deployment.sh https://vintrusted.com`

Or manually check:
- `/api/health` - Should return status
- `/api/stripe-config` - Should return publishableKey
- `/` - Main page should load
- `/report.html` - Report page should load
- `/success.html` - Success page should load

### 3. Verify Environment Variables
In Vercel Dashboard → Settings → Environment Variables, ensure:
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `CLEARVIN_API_TOKEN` - ClearVIN API token
- `VINAUDIT_API_KEY` - VinAudit API key (optional)
- `APP_URL` - Your domain URL

### 4. Common Issues

**Issue: API returns 500**
- Check function logs in Vercel
- Verify environment variables are set
- Check API key validity

**Issue: Pages return 404**
- Verify routes in vercel.json
- Check file paths are correct
- Ensure files are committed to git

**Issue: Stripe checkout fails**
- Verify Stripe keys are correct
- Check webhook endpoint is configured
- Verify APP_URL matches your domain

**Issue: VIN not loading**
- Check `/api/get-checkout-session` endpoint
- Verify VIN is passed in checkout metadata
- Check browser console for errors

## 📊 Deployment Summary

- **API Endpoints**: 13 configured
- **Main Pages**: 3 (index, report, success)
- **Builds**: 24 configured
- **Routes**: 6763 configured

## 🚀 Next Steps After Deployment

1. Test full payment flow:
   - Enter VIN on main page
   - Complete checkout
   - Verify report loads on success page

2. Monitor error logs:
   - Check Vercel function logs
   - Monitor browser console errors
   - Check network requests

3. Verify integrations:
   - Stripe webhook receives events
   - ClearVIN API returns reports
   - VIN data loads correctly
