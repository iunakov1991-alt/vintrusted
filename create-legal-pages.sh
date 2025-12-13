#!/usr/bin/env bash
set -e

# ============================================
# VINTRUSTED — LEGAL PAGES BOOTSTRAP
# Purpose: Full legal protection for billing,
# ClearVin, NMVTIS, Stripe, chargebacks
# ============================================

LEGAL_DIR="public/legal"
mkdir -p "$LEGAL_DIR"

# ------------------------------------------------
# TERMS & CONDITIONS
# ------------------------------------------------
cat > "$LEGAL_DIR/terms-and-conditions.html" <<'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Terms & Conditions</title>
</head>
<body>

<h1>Terms & Conditions</h1>

<p>By accessing or using this Service, you agree to be bound by these Terms & Conditions. If you do not agree, you must not use the Service.</p>

<h2>Nature of the Service</h2>
<p>The Service provides time-based access to vehicle-related information for informational purposes only. The Service does not sell individual vehicle reports and does not guarantee the accuracy, completeness, or availability of any specific data.</p>

<h2>Subscription & Billing</h2>
<p>The Service operates on a subscription-based, time-access model. Users are charged for temporary access during defined billing periods, not per individual report.</p>

<p>A trial activation fee of <strong>$3</strong> grants initial access to the Service. After 10 days, a charge of <strong>$49</strong> is applied for the next access period. This charge may repeat every 10 days for a maximum of three (3) billing cycles. After the final billing cycle, the subscription is automatically canceled.</p>

<p>Billing is aggregated and applied once per billing period. Charges are not based on daily usage or per-report consumption.</p>

<h2>Usage Limits</h2>
<p>Access to the Service is subject to daily usage limits, including a maximum of two (2) reports per day. Daily limits apply regardless of actual usage.</p>

<h2>Cancellation & Refunds</h2>
<p>Users may cancel the subscription at any time. Cancellation prevents future charges but does not retroactively refund processed payments.</p>

<p>All charges are non-refundable except where required by law. Unused access time or unused report capacity does not constitute grounds for refunds.</p>

<h2>ClearVin Vehicle Reports</h2>
<p>Vehicle reports are provided through ClearVin and are for personal or internal informational use only. Redistribution, resale, modification, or public display is prohibited.</p>

<p>Reports are provided "as is" without warranties of any kind. Users use the reports at their own risk.</p>

<p>CLEARVIN retains all rights, title, and interest in and to the reports and related intellectual property.</p>

<h2>NMVTIS Disclaimer</h2>
<p>
[PASTE NMVTIS DISCLAIMER TEXT HERE — WORD FOR WORD FROM CLEARVIN]
</p>

<h2>Disclaimer of Warranties</h2>
<p>The Service is provided "as is" and "as available" without warranties of any kind.</p>

<h2>Limitation of Liability</h2>
<p>In no event shall the Company be liable for any indirect, incidental, or consequential damages arising from use of the Service.</p>

<h2>Indemnification</h2>
<p>You agree to indemnify and hold the Company harmless from any claims arising from misuse of the Service.</p>

<h2>Governing Law</h2>
<p>These Terms are governed by the laws of the United States and the State of California.</p>

</body>
</html>
EOF

# ------------------------------------------------
# SUBSCRIPTION & BILLING POLICY
# ------------------------------------------------
cat > "$LEGAL_DIR/subscription-policy.html" <<'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Subscription & Billing Policy</title>
</head>
<body>

<h1>Subscription & Billing Policy</h1>

<p>The Service uses a time-based subscription model.</p>

<ul>
  <li>Trial activation: <strong>$3</strong></li>
  <li>Recurring charge: <strong>$49 every 10 days</strong></li>
  <li>Maximum of three billing cycles</li>
  <li>Automatic cancellation after final cycle</li>
</ul>

<p>Payment grants temporary access to the Service with a usage limit of up to two (2) reports per day. Charges are applied once every 10 days and are not based on daily usage.</p>

<p>All charges are non-refundable once processed.</p>

</body>
</html>
EOF

# ------------------------------------------------
# REFUND & CANCELLATION POLICY
# ------------------------------------------------
cat > "$LEGAL_DIR/refund-policy.html" <<'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Refund & Cancellation Policy</title>
</head>
<body>

<h1>Refund & Cancellation Policy</h1>

<p>Users may cancel their subscription at any time to prevent future charges.</p>

<p>All payments are final and non-refundable once processed, except where required by law.</p>

<p>Unused access time, unused reports, or failure to use the Service do not qualify for refunds.</p>

</body>
</html>
EOF

# ------------------------------------------------
# PRIVACY POLICY
# ------------------------------------------------
cat > "$LEGAL_DIR/privacy-policy.html" <<'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Privacy Policy</title>
</head>
<body>

<h1>Privacy Policy</h1>

<p>We collect limited personal information necessary to operate the Service, including email addresses, payment tokens, and technical identifiers.</p>

<p>Payments are processed by third-party providers such as Stripe. Vehicle data is provided by ClearVin.</p>

<p>We do not sell or rent personal data.</p>

</body>
</html>
EOF

# ------------------------------------------------
# CONTACT PAGE
# ------------------------------------------------
cat > "$LEGAL_DIR/contact.html" <<'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Contact</title>
</head>
<body>

<h1>Contact Us</h1>

<p>Email: support@vintrusted.com</p>

</body>
</html>
EOF

echo "✅ Legal pages generated in /public/legal"
