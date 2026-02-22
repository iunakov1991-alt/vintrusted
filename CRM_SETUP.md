# 🚀 CRM Dashboard Setup Guide

## ✅ What's Been Created

### 1. **API Endpoint**: `/api/crm/analytics.js`
   - Fetches data from Stripe API
   - Calculates all metrics (revenue, ROI, CPA, retention, etc.)
   - Protected by password authentication
   - Returns JSON data for the dashboard

### 2. **CRM Dashboard**: `/crm/index.html`
   - Beautiful, modern interface with charts
   - Date range picker
   - Budget input (saved to localStorage)
   - Real-time metrics display
   - Source breakdown with ROI per source
   - Daily revenue timeline chart
   - Mobile responsive

### 3. **Deployment**: ✅ Pushed to production
   - Files committed and pushed to GitHub
   - Vercel will auto-deploy in ~2-3 minutes

---

## 🔐 Next Steps

### 1. Set CRM Password in Vercel

Go to [Vercel Dashboard](https://vercel.com) and add environment variable:

```
Name:  CRM_PASSWORD
Value: [your-secure-password]
```

**Default password (if not set):** `vintrusted2026`

### 2. Access Your CRM

After deployment completes, visit:

```
https://vintrusted.com/crm
```

Or if you want custom subdomain `vintrusted.dima1991crm.com`:

#### Option A: Add DNS Record
1. Go to your DNS provider (Cloudflare/Namecheap/etc.)
2. Add CNAME record:
   ```
   Type: CNAME
   Name: vintrusted.dima1991crm
   Value: cname.vercel-dns.com
   ```

3. In Vercel Dashboard → Settings → Domains:
   - Add domain: `vintrusted.dima1991crm.com`
   - Vercel will verify and connect it

#### Option B: Use Main Domain (Already Works)
```
https://vintrusted.com/crm
```

---

## 📊 Features

### Key Metrics Displayed:
- **Period**: Date range in days
- **Total Customers**: All + Paying customers count
- **Revenue**: Total, Trial, Recurring breakdown
- **Net Profit**: Revenue - Disputes - Traffic Cost
- **ROI**: Return on investment %
- **CPA (Cost Per Acquisition)**: Traffic cost / Total customers
- **Paying Lead Cost**: Traffic cost / Paying customers
- **LTV/CPA Ratio**: Lifetime value vs acquisition cost
- **Retention Rate**: Trial → $49 conversion %
- **Disputes**: Total, Status breakdown, Lost amount
- **Dispute Rate**: Disputes / Total charges %
- **Successful Payments**: Trial + Recurring counts

### Charts:
- **Daily Revenue Timeline**: Interactive line chart showing revenue over time

### Source Breakdown Table:
- Source name & share %
- Customer count
- Revenue
- Trial & Recurring customers
- Calculated CPA per source
- ROI per source with color-coded badges

### Controls:
- **Start Date Picker**: Choose period start
- **End Date Picker**: Choose period end  
- **Budget Input ($)**: Enter traffic spend (saved automatically)
- **Update Button**: Refresh data with new parameters

---

## 🎨 UI Features

- **Modern gradient design** (purple theme)
- **Password protected** login screen
- **Hover effects** on cards
- **Color-coded metrics**:
  - 🟢 Green for positive (good ROI, high retention)
  - 🔴 Red for negative (low ROI, high disputes)
  - ⚫ Gray for neutral
- **Responsive** (works on mobile, tablet, desktop)
- **Loading indicators** while fetching data
- **Chart.js** for beautiful visualizations

---

## 🔧 Technical Details

### Authentication:
- Bearer token authentication
- Password stored in Vercel env vars
- Token cached in localStorage after successful login

### Data Flow:
1. User logs in with password
2. Frontend calls `/api/crm/analytics?start=X&end=Y&budget=Z`
3. API fetches data from Stripe
4. API calculates all metrics
5. Returns JSON to frontend
6. Frontend renders beautiful dashboard

### Performance:
- Efficient Stripe API pagination (100 items/request)
- Caches budget in localStorage
- Fast Chart.js rendering
- Minimal API calls (only on "Update" button click)

---

## 📝 Default Configuration

**Default Date Range:**
- Start: 2026-01-01
- End: Today's date

**Default Budget:** $800

**Default Password:** `vintrusted2026`

---

## 🚨 Security Notes

1. **Change the default password** in Vercel environment variables
2. **Use strong password** (8+ chars, mix of letters/numbers/symbols)
3. **Don't share CRM link** publicly
4. **Token is stored in browser** localStorage (logout to clear)
5. **API is password-protected** - unauthorized requests get 401

---

## 🐛 Troubleshooting

### "Unauthorized" error
- Check CRM_PASSWORD is set in Vercel
- Make sure you're using correct password
- Try clearing localStorage and login again

### "Failed to fetch data"
- Check Vercel deployment logs
- Verify STRIPE_SECRET_KEY is set
- Check browser console for errors

### Charts not showing
- Clear browser cache
- Check console for Chart.js errors
- Verify data is being returned (Network tab)

### Wrong data displayed
- Check date range is correct
- Verify budget input is saved
- Try clicking "Update" button again

---

## 🎯 Usage Example

1. Open `https://vintrusted.com/crm`
2. Enter password (default: `vintrusted2026`)
3. Click "Войти" (Login)
4. Adjust date range if needed (default: Jan 1 - Today)
5. Enter traffic budget (default: $800)
6. Click "Обновить данные" (Update Data)
7. View all metrics, chart, and source breakdown
8. Scroll down to see detailed table

---

## 📈 Future Enhancements (Optional)

- Export to CSV/PDF
- Email reports automatically
- Cohort analysis visualization
- Customer lifetime value prediction
- A/B test tracking
- Custom date presets (Last 7 days, Last 30 days, etc.)
- Dark mode toggle
- Multi-user access with roles

---

## ✅ Status

**Deployment:** ✅ Live on production  
**URL:** https://vintrusted.com/crm  
**Password:** `vintrusted2026` (default, change in Vercel)  
**Version:** 1.0  
**Last Updated:** 2026-02-22

---

**Created by:** Claude AI Assistant  
**For:** VinTrusted CRM Dashboard  
**Contact:** [Support if needed]
