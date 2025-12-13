# 📋 ПЛАН РЕАЛИЗАЦИИ TERMS & CONDITIONS

## 🎯 ЦЕЛИ

1. ✅ Обязательное согласие перед оплатой
2. ✅ Не сломать Stripe checkout flow
3. ✅ Минимальный вред для UX
4. ✅ Логирование для аудита
5. ✅ Соответствие требованиям ClearVin + NMVTIS

---

## 🏗️ АРХИТЕКТУРА РЕШЕНИЯ

### **Вариант A: Модал перед Stripe (РЕКОМЕНДУЕМЫЙ)**

```
User clicks "Get Report" 
    ↓
Terms Modal появляется
    ↓
User reads & checks ☑️
    ↓
[Accept & Continue] активируется
    ↓
Log consent → POST /api/log-consent
    ↓
Redirect to Stripe Checkout (текущий flow)
    ↓
Success page
```

**✅ Плюсы:**
- Не трогаем Stripe вообще
- Минимальные изменения
- Отличный UX (clear separation)
- Легко протестировать
- Можно показать модал повторно для уже оплаченных отчетов

**❌ Минусы:**
- Нет (это best practice)

---

### **Вариант B: Чекбокс на странице результатов**

```
Results page с чекбоксом
    ↓
User checks ☑️ "I agree..."
    ↓
"Get Report" button активируется
    ↓
Log consent + Stripe checkout
```

**✅ Плюсы:**
- Проще визуально
- Меньше кликов

**❌ Минусы:**
- Меняем layout results page
- Плохой UX (legal text отвлекает)
- Неудобно на mobile

---

## 🎖️ РЕКОМЕНДАЦИЯ: ВАРИАНТ A

**Модал-окно** — это индустриальный стандарт для Terms & Conditions.

---

## 📝 ДЕТАЛИ РЕАЛИЗАЦИИ

### 1. **Компоненты**

```
/api/log-consent.js         - Endpoint для логирования
/public/terms-modal.html    - HTML модала (или inline)
/public/terms-modal.js      - Логика модала
/public/terms-content.html  - Текст Terms (ClearVin + NMVTIS)
/logs/consent-logs/         - Директория для логов (gitignored)
```

---

### 2. **Модал UI (Mockup)**

```
┌─────────────────────────────────────────────────┐
│  Terms & Conditions                         [X] │
├─────────────────────────────────────────────────┤
│                                                 │
│  [Scrollable content - 400px max height]        │
│                                                 │
│  📋 ClearVin Terms:                             │
│  1. Limited to personal use only               │
│  2. Use at your own risk (No warranties)       │
│  3. Intellectual property remains ClearVin     │
│                                                 │
│  ⚠️ NMVTIS Disclaimer:                          │
│  [Full NMVTIS text from provider...]           │
│                                                 │
│  ☐ I have read and agree to these terms       │
│                                                 │
│  [Accept & Continue]  [Cancel]                 │
└─────────────────────────────────────────────────┘
```

---

### 3. **Логирование Consent**

**Что сохраняем:**
```json
{
  "timestamp": "2025-12-11T20:30:45.123Z",
  "ip": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "session_id": "sess_abc123",
  "vin": "1HGBH41JXMN109186",
  "email": "user@example.com",
  "order_id": null,  // Заполнится после checkout
  "terms_version": "v1.0_20251211",
  "terms_hash": "sha256:abc123...",
  "consent_given": true,
  "checkout_session_id": null  // Заполнится при checkout
}
```

**Где хранить:**
- `logs/consent-logs/YYYY-MM/consent-YYYY-MM-DD.jsonl`
- JSONL format (one JSON per line)
- Ротация по дням/месяцам
- Backup на S3/Cloud Storage (опционально)

---

### 4. **API Endpoint: `/api/log-consent.js`**

```javascript
// Vercel serverless function
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    vin,
    email,
    termsVersion,
    consentGiven
  } = req.body;

  // Validate
  if (!vin || !consentGiven) {
    return res.status(400).json({ error: 'Invalid data' });
  }

  // Generate consent record
  const consentRecord = {
    timestamp: new Date().toISOString(),
    ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    user_agent: req.headers['user-agent'],
    session_id: generateSessionId(),  // Cookie-based or UUID
    vin,
    email: email || null,
    terms_version: termsVersion,
    terms_hash: hashTermsContent(),
    consent_given: consentGiven
  };

  // Log to file (Vercel ephemeral, needs external storage)
  await logToCloudStorage(consentRecord);  // S3, Firestore, etc.

  // OR: Log to database
  // await db.consent_logs.insert(consentRecord);

  return res.status(200).json({
    ok: true,
    consent_id: consentRecord.session_id
  });
};
```

---

### 5. **Integration Flow**

#### **a) Modify `public/vin-stripe.js`:**

```javascript
// BEFORE (current):
const checkoutResponse = await fetch('/api/checkout-trial-then-two-charges', {
  method: 'POST',
  body: JSON.stringify({ vin, email })
});

// AFTER (new):
// Show terms modal FIRST
const consentAccepted = await showTermsModal(vin, email);

if (!consentAccepted) {
  return; // User cancelled
}

// Log consent
await fetch('/api/log-consent', {
  method: 'POST',
  body: JSON.stringify({
    vin,
    email,
    termsVersion: 'v1.0_20251211',
    consentGiven: true
  })
});

// Then proceed to checkout (existing code)
const checkoutResponse = await fetch('/api/checkout-trial-then-two-charges', {
  method: 'POST',
  body: JSON.stringify({ vin, email })
});
```

#### **b) Create `showTermsModal()` function:**

```javascript
function showTermsModal(vin, email) {
  return new Promise((resolve) => {
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'terms-modal';
    modal.innerHTML = `
      <div class="terms-modal-content">
        <div class="terms-header">
          <h2>Terms & Conditions</h2>
          <button class="terms-close">&times;</button>
        </div>
        <div class="terms-body">
          ${getTermsContent()}  // ClearVin + NMVTIS
        </div>
        <div class="terms-footer">
          <label>
            <input type="checkbox" id="terms-checkbox">
            I have read and agree to these terms
          </label>
          <div class="terms-actions">
            <button class="btn-cancel">Cancel</button>
            <button class="btn-accept" disabled>Accept & Continue</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Enable/disable Accept button based on checkbox
    const checkbox = modal.querySelector('#terms-checkbox');
    const acceptBtn = modal.querySelector('.btn-accept');
    
    checkbox.addEventListener('change', () => {
      acceptBtn.disabled = !checkbox.checked;
    });
    
    // Handle Accept
    acceptBtn.addEventListener('click', () => {
      modal.remove();
      resolve(true);
    });
    
    // Handle Cancel/Close
    const closeBtn = modal.querySelector('.terms-close');
    const cancelBtn = modal.querySelector('.btn-cancel');
    
    [closeBtn, cancelBtn].forEach(btn => {
      btn.addEventListener('click', () => {
        modal.remove();
        resolve(false);
      });
    });
  });
}
```

---

### 6. **Terms Content (ClearVin + NMVTIS)**

```html
<!-- getTermsContent() returns this: -->
<div class="terms-content">
  <section class="terms-section">
    <h3>📋 ClearVin Terms of Use</h3>
    <ol>
      <li>
        <strong>Limited Use:</strong> This report is for personal, non-commercial 
        use only. You may not resell, redistribute, or use this data for any 
        commercial purpose without written permission.
      </li>
      <li>
        <strong>Use at Your Own Risk:</strong> The information is provided "as is" 
        without warranties of any kind, either express or implied. ClearVin makes 
        no representations about the accuracy, reliability, or completeness of 
        the data. You assume all risk associated with your use of this report.
      </li>
      <li>
        <strong>Intellectual Property:</strong> All data, trademarks, logos, and 
        content remain the property of ClearVin and its licensors. You may not 
        reverse engineer, modify, or create derivative works from this report.
      </li>
    </ol>
  </section>
  
  <section class="terms-section nmvtis-disclaimer">
    <h3>⚠️ NMVTIS Consumer Access Product Disclaimer</h3>
    <div class="nmvtis-text">
      <!-- PASTE EXACT TEXT FROM NMVTIS PROVIDER HERE -->
      <!-- Example (replace with actual): -->
      <p>
        The National Motor Vehicle Title Information System (NMVTIS) is an 
        electronic system that contains information on certain automobiles 
        titled in the United States...
      </p>
      <p>
        <strong>Limitation of Liability:</strong> The data in NMVTIS comes 
        from various sources, and the accuracy of the information depends on 
        the accuracy and timeliness of the data provided by those sources...
      </p>
      <!-- etc. -->
    </div>
  </section>
</div>
```

**⚠️ ВАЖНО:** 
- Получи **точный текст** NMVTIS disclaimer от твоего поставщика
- Скопируй его **слово в слово** (они требуют это)

---

### 7. **CSS для модала**

```css
/* terms-modal.css */
.terms-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.3s;
}

.terms-modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s;
}

.terms-header {
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.terms-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
  font-size: 14px;
  line-height: 1.6;
}

.terms-section {
  margin-bottom: 24px;
}

.terms-section h3 {
  margin-bottom: 12px;
  color: #1f2937;
}

.nmvtis-disclaimer {
  background: #fef3c7;
  padding: 16px;
  border-radius: 8px;
  border-left: 4px solid #f59e0b;
}

.terms-footer {
  padding: 20px;
  border-top: 1px solid #e5e7eb;
}

.terms-footer label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  cursor: pointer;
}

.terms-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-accept {
  background: #3b82f6;
  color: white;
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}

.btn-accept:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.btn-cancel {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
  padding: 10px 24px;
  border-radius: 6px;
  cursor: pointer;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
```

---

## 🗄️ STORAGE OPTIONS

### **Вариант 1: Vercel KV (Redis)**
```javascript
import { kv } from '@vercel/kv';

await kv.lpush('consent_logs', JSON.stringify(consentRecord));
```

**✅ Pros:** Simple, fast, included in Vercel
**❌ Cons:** Limited storage, не для долгосрочного хранения

---

### **Вариант 2: Vercel Postgres**
```sql
CREATE TABLE consent_logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL,
  ip VARCHAR(45),
  vin VARCHAR(17) NOT NULL,
  email VARCHAR(255),
  terms_version VARCHAR(50),
  terms_hash VARCHAR(64),
  consent_given BOOLEAN,
  session_id VARCHAR(255),
  checkout_session_id VARCHAR(255)
);
```

**✅ Pros:** Reliable, queryable, backup built-in
**❌ Cons:** Need Vercel Postgres plan

---

### **Вариант 3: AWS S3 / Cloud Storage**
```javascript
import AWS from 'aws-sdk';

const s3 = new AWS.S3();
await s3.putObject({
  Bucket: 'vintrusted-consent-logs',
  Key: `${year}/${month}/${date}/${sessionId}.json`,
  Body: JSON.stringify(consentRecord)
}).promise();
```

**✅ Pros:** Cheap, scalable, immutable
**❌ Cons:** Slower, need AWS setup

---

### **Вариант 4: Simple File Logging (Dev/Small Scale)**
```javascript
const fs = require('fs').promises;
const path = require('path');

const logDir = path.join('/tmp', 'consent-logs');
const logFile = path.join(logDir, `${date}.jsonl`);

await fs.mkdir(logDir, { recursive: true });
await fs.appendFile(logFile, JSON.stringify(consentRecord) + '\n');
```

**⚠️ Warning:** Vercel `/tmp` is ephemeral - data lost on redeploy!

---

## 🎯 РЕКОМЕНДАЦИЯ ПО STORAGE

**Для Production:** Vercel Postgres или AWS S3
**Для Start:** Vercel KV (быстро стартовать, потом мигрировать)

---

## 📱 MOBILE UX

Модал отлично работает на mobile:
- Responsive width (90% на mobile)
- Scrollable content
- Large touch targets (buttons)
- Clear checkbox

---

## ✅ CHECKLIST РЕАЛИЗАЦИИ

### Phase 1: Core (MVP)
- [ ] Создать модал UI (HTML + CSS)
- [ ] Создать Terms content (ClearVin + NMVTIS)
- [ ] Добавить логику показа модала перед checkout
- [ ] Создать `/api/log-consent.js`
- [ ] Выбрать storage solution
- [ ] Протестировать flow

### Phase 2: Production Ready
- [ ] Добавить версионирование Terms (v1.0, v1.1, etc.)
- [ ] Hash content для проверки изменений
- [ ] Добавить Session ID tracking
- [ ] Настроить backup логов
- [ ] Добавить admin panel для просмотра consent logs
- [ ] Legal review Terms content

### Phase 3: Compliance
- [ ] Получить точный NMVTIS disclaimer текст
- [ ] Проверить с юристом ClearVin terms
- [ ] Добавить Terms link в footer/menu
- [ ] Создать standalone Terms page (/terms)
- [ ] GDPR compliance (если EU users)

---

## 🚀 TIMELINE

**Day 1:**
- Создать модал UI
- Получить NMVTIS текст
- Создать `/api/log-consent.js` с KV storage

**Day 2:**
- Интегрировать в checkout flow
- Тестирование (desktop + mobile)
- Staging deploy

**Day 3:**
- Legal review
- Production deploy
- Monitoring

**Total:** 3 дня до Production

---

## 💰 COSTS

```
Vercel KV (Hobby):    $0 (included)
Vercel Postgres:      $20/month (optional)
AWS S3:               ~$1/month for logs
Development time:     3 days
```

---

## 🎨 UX IMPACT

**Клики:**
- Before: 1 click ("Get Report")
- After: 3 clicks ("Get Report" → Check ☑️ → "Accept")

**Time:**
- +15-30 seconds для прочтения (первый раз)
- +5 seconds для returning users (знают текст)

**Conversion Drop:**
- Expected: ~2-5% (индустриальная норма)
- Mitigated by: Clear UI, fast modal, mobile-friendly

---

## 📊 METRICS TO TRACK

```javascript
{
  modal_shown: 1000,          // Сколько раз показали
  modal_accepted: 950,        // Сколько согласились
  modal_cancelled: 50,        // Сколько отказались
  acceptance_rate: 95%,       // Conversion rate
  time_to_accept_avg: 25s     // Среднее время решения
}
```

---

## 🔒 SECURITY

1. **Rate Limiting:** Prevent spam consent logging
2. **CSRF Protection:** Add CSRF token to form
3. **Input Validation:** Sanitize all inputs
4. **Access Control:** Only authorized access to logs
5. **Encryption:** Consider encrypting PII (email, IP)

---

## ✅ READY TO START?

Хочешь начать с **Phase 1 (MVP)**?

Я могу создать:
1. ✅ Модал UI + CSS
2. ✅ Terms content template (ты вставишь NMVTIS текст)
3. ✅ `/api/log-consent.js` с Vercel KV
4. ✅ Integration в checkout flow

**Начинаем? 🚀**

