// ═══════════════════════════════════════════════════════════════════════
// DISPOSABLE EMAIL DETECTION
// ═══════════════════════════════════════════════════════════════════════
// Блокировка временных/одноразовых email адресов для предотвращения fraud

/**
 * Список популярных disposable email domains
 * Источник: https://github.com/disposable/disposable-email-domains
 * Обновлен: 2026-02
 */
const DISPOSABLE_DOMAINS = new Set([
  // Самые популярные
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamail.biz',
  'guerrillamail.de',
  'guerrillamailblock.com',
  'sharklasers.com',
  'grr.la',
  'spam4.me',
  'pokemail.net',
  'tempmail.com',
  'tempmail.org',
  'temp-mail.org',
  'temp-mail.io',
  'tempmail.net',
  'tempmailaddress.com',
  '10minutemail.com',
  '10minutemail.net',
  '10minutemail.org',
  '10minutemail.de',
  '20minutemail.com',
  'mailinator.com',
  'mailinator.net',
  'mailinator2.com',
  'maildrop.cc',
  'maildrop.com',
  'throwaway.email',
  'throwawaymail.com',
  'trashmail.com',
  'trashmail.net',
  'trash-mail.com',
  'getnada.com',
  'fakeinbox.com',
  'getairmail.com',
  'airmail.net',
  'yopmail.com',
  'yopmail.net',
  'cool.fr.nf',
  'jetable.fr.nf',
  'nospam.ze.tc',
  'nomail.xl.cx',
  'mega.zik.dj',
  'speed.1s.fr',
  'courriel.fr.nf',
  'moncourrier.fr.nf',
  'monemail.fr.nf',
  'monmail.fr.nf',
  'hide.biz.st',
  'mymail.infos.st',
  'dispostable.com',
  'mailnesia.com',
  'mintemail.com',
  'mytrashmail.com',
  'spamgourmet.com',
  'spambox.us',
  'spamcannon.com',
  'spamcannon.net',
  'spamhole.com',
  'emailsensei.com',
  'emailthe.net',
  'emailtemporanea.com',
  'emailtemporanea.net',
  'emailtemporar.ro',
  'emailtemporario.com.br',
  'emaildienst.de',
  'wegwerfmail.de',
  'wegwerfemail.de',
  'wegwerfemail.com',
  'wegwerfemail.net',
  'wegwerfemail.org',
  'trashmailer.com',
  'spambog.com',
  'spambog.de',
  'spambog.ru',
  'spamfree24.org',
  'spamfree24.de',
  'spamfree24.com',
  'spamfree24.net',
  'spamfree24.eu',
  'spambox.info',
  'spambox.irishspringrealty.com',
  'spamcero.com',
  'spamcowboy.com',
  'spamcowboy.net',
  'spamcowboy.org',
  'spamday.com',
  'spamex.com',
  'spamgourmet.com',
  'spamgourmet.net',
  'spamgourmet.org',
  'spaml.com',
  'spaml.de',
  'spammotel.com',
  'spamspot.com',
  'spamthis.co.uk',
  'spamthisplease.com',
  'spamtrail.com',
  'speed.1s.fr',
  'supergreatmail.com',
  'supermailer.jp',
  'suremail.info',
  'tafmail.com',
  'teewars.org',
  'teleworm.com',
  'teleworm.us',
  'temp.emeraldwebmail.com',
  'temp15.com',
  'tempail.com',
  'tempalias.com',
  'tempe-mail.com',
  'tempemail.biz',
  'tempemail.co.za',
  'tempemail.com',
  'tempemail.net',
  'tempinbox.co.uk',
  'tempinbox.com',
  'tempmail.eu',
  'tempmail.it',
  'tempmailer.com',
  'tempmailer.de',
  'tempomail.fr',
  'temporarily.de',
  'temporarioemail.com.br',
  'temporaryemail.net',
  'temporaryemail.us',
  'temporaryforwarding.com',
  'temporaryinbox.com',
  'temporarymailaddress.com',
  'thanksnospam.info',
  'thankyou2010.com',
  'thisisnotmyrealemail.com',
  'throwaway.email',
  'throwawayemailaddress.com',
  'tilien.com',
  'tittbit.in',
  'tmail.ws',
  'tmailinator.com',
  'tradermail.info',
  'trash2009.com',
  'trash2010.com',
  'trash2011.com',
  'trashdevil.com',
  'trashemail.de',
  'trashymail.com',
  'trashymail.net',
  'trillianpro.com',
  'turual.com',
  'twinmail.de',
  'tyldd.com',
  'uggsrock.com',
  'umail.net',
  'upliftnow.com',
  'uplipht.com',
  'venompen.com',
  'veryrealemail.com',
  'viditag.com',
  'viewcastmedia.com',
  'viewcastmedia.net',
  'viewcastmedia.org',
  'viralplays.com',
  'wegwerfadresse.de',
  'wegwerfemail.de',
  'wegwerfemail.net',
  'wegwerfemail.org',
  'wetrainbayarea.com',
  'wetrainbayarea.org',
  'wh4f.org',
  'whatiaas.com',
  'whyspam.me',
  'wilemail.com',
  'willselfdestruct.com',
  'winemaven.info',
  'wronghead.com',
  'www.e4ward.com',
  'www.gishpuppy.com',
  'www.mailinator.com',
  'wwwnew.eu',
  'xagloo.com',
  'xemaps.com',
  'xents.com',
  'xmaily.com',
  'xoxy.net',
  'yapped.net',
  'yogamaven.com',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'yourdomain.com',
  'yuurok.com',
  'zehnminuten.de',
  'zehnminutenmail.de',
  'zetmail.com',
  'zippymail.info',
  'zoaxe.com',
  'zoemail.com',
  'zomg.info',
]);

/**
 * Паттерны для определения disposable emails (regex)
 */
const DISPOSABLE_PATTERNS = [
  /temp.*mail/i,
  /throw.*away/i,
  /disposable/i,
  /trash.*mail/i,
  /spam.*mail/i,
  /fake.*mail/i,
  /guerrilla.*mail/i,
  /minute.*mail/i,
  /\d+minute/i, // 10minutemail, 20minutemail, etc.
  /mailinator/i,
  /maildrop/i,
  /yopmail/i,
];

/**
 * Проверка является ли email disposable/temporary
 * @param {string} email - Email адрес для проверки
 * @returns {Object} { isDisposable: boolean, reason: string }
 */
export function isDisposableEmail(email) {
  if (!email || typeof email !== 'string') {
    return { isDisposable: false, reason: null };
  }

  const normalizedEmail = email.toLowerCase().trim();
  
  // Извлекаем domain
  const atIndex = normalizedEmail.lastIndexOf('@');
  if (atIndex === -1) {
    return { isDisposable: false, reason: 'invalid_format' };
  }
  
  const domain = normalizedEmail.substring(atIndex + 1);
  
  // 1. Проверяем в static list
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { 
      isDisposable: true, 
      reason: 'known_disposable_domain',
      domain 
    };
  }
  
  // 2. Проверяем по patterns
  for (const pattern of DISPOSABLE_PATTERNS) {
    if (pattern.test(domain)) {
      return { 
        isDisposable: true, 
        reason: 'disposable_pattern_match',
        domain,
        pattern: pattern.toString()
      };
    }
  }
  
  // 3. Проверяем подозрительные характеристики
  // - Слишком короткий domain (< 4 символов)
  // - Много цифр в domain
  // - TLD подозрительный (.tk, .ml, .ga, .cf, .gq - бесплатные)
  const suspiciousTLDs = ['tk', 'ml', 'ga', 'cf', 'gq', 'xyz', 'top'];
  const tld = domain.split('.').pop();
  
  if (suspiciousTLDs.includes(tld)) {
    const digitCount = (domain.match(/\d/g) || []).length;
    if (digitCount > 3) {
      return { 
        isDisposable: true, 
        reason: 'suspicious_characteristics',
        domain,
        details: `suspicious_tld=${tld}, digit_count=${digitCount}`
      };
    }
  }
  
  return { isDisposable: false, reason: null };
}

/**
 * Добавить domain в whitelist (для business emails, которые могут выглядеть подозрительно)
 */
const WHITELIST_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'aol.com',
  'protonmail.com',
  'mail.ru',
  'yandex.ru',
  // Добавь сюда легитимные domains при необходимости
]);

/**
 * Проверка с учетом whitelist
 */
export function isDisposableEmailWithWhitelist(email) {
  const normalizedEmail = email.toLowerCase().trim();
  const atIndex = normalizedEmail.lastIndexOf('@');
  if (atIndex === -1) {
    return { isDisposable: false, reason: 'invalid_format' };
  }
  
  const domain = normalizedEmail.substring(atIndex + 1);
  
  // Whitelist всегда разрешен
  if (WHITELIST_DOMAINS.has(domain)) {
    return { isDisposable: false, reason: 'whitelisted' };
  }
  
  return isDisposableEmail(email);
}

export default {
  isDisposableEmail,
  isDisposableEmailWithWhitelist,
  DISPOSABLE_DOMAINS,
};
