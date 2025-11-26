# ClearVin API Integration Setup

## Environment Variables

Add the following environment variable to your Vercel project:

### CLEARVIN_API_TOKEN
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbnZpcm9ubWVudCI6InRlc3QiLCJ1c2VyIjp7ImlkIjoyNjYyNDIsImVtYWlsIjoicmVkc3RlcGxlckBnbWFpbC5jb20ifSwidmVuZG9yIjp7ImlkIjo0MzAsInN0YXR1cyI6ImFjdGl2ZSJ9LCJpYXQiOjE3NjI5NjYxNzIsImV4cCI6MTc2NTU1ODE3Mn0.x9DK0eAie7Jo-PTgXabjeRPk7s-T21TRcp5d7CbHYo4`
- **Note**: This is a test token valid until 12/12/2025. Replace with production token when ready.

## How to Add Environment Variable in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Click **Add New**
4. Name: `CLEARVIN_API_TOKEN`
5. Value: Paste the token above
6. Select all environments (Production, Preview, Development)
7. Click **Save**
8. **Redeploy** your application for changes to take effect

## API Endpoints Created

### 1. `/api/get-clearvin-report`
- **Method**: GET
- **Query Parameters**: `vin` (17-character VIN)
- **Returns**: HTML report from ClearVin
- **Usage**: Fetches the full HTML report for display on success page

### 2. `/api/send-clearvin-report`
- **Method**: POST
- **Body**: `{ email: string, vin: string }`
- **Returns**: Success confirmation
- **Usage**: Sends PDF report to user's email (email integration needed)

### 3. `/api/get-vin-from-setup-intent`
- **Method**: GET
- **Query Parameters**: `setup_intent` (Stripe SetupIntent ID)
- **Returns**: VIN from SetupIntent metadata
- **Usage**: Retrieves VIN stored in Stripe SetupIntent metadata

## Success Page Flow

1. User completes payment
2. Redirected to `/success.html?setup_intent=xxx&vin=xxx`
3. Page loads with:
   - Email form overlay (visible, centered)
   - Report container below (blurred, scrollable but not interactive)
4. User enters email and submits
5. Report is sent to email via `/api/send-clearvin-report`
6. Form overlay disappears
7. Report becomes fully visible and interactive (unblurred)

## Test VINs

Use these VINs for testing:
- `5TDYK3DC8DS290235`
- `2T1LR32E35C508537`
- `KNDJD733865514567`
- `WAUDG74F25N111998`

## Next Steps

1. ✅ Add `CLEARVIN_API_TOKEN` to Vercel environment variables
2. ⚠️ Integrate email service (SendGrid/Mailgun/etc) in `/api/send-clearvin-report.js`
3. ⚠️ Replace test token with production token when ready
4. ✅ Test the flow with a test VIN

## Email Integration TODO

The `/api/send-clearvin-report.js` endpoint currently generates the PDF but doesn't send it. You need to:

1. Choose an email service provider (SendGrid, Mailgun, AWS SES, etc.)
2. Install the provider's SDK
3. Add API keys to environment variables
4. Implement email sending with PDF attachment in the endpoint

Example with SendGrid:
```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const msg = {
  to: email,
  from: 'noreply@vintrusted.com',
  subject: 'Your VIN Report',
  text: 'Please find your VIN report attached.',
  attachments: [{
    content: pdfBase64,
    filename: `vin-report-${vin}.pdf`,
    type: 'application/pdf',
    disposition: 'attachment'
  }]
};

await sgMail.send(msg);
```

