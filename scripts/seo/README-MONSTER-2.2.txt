
SEO-MONSTER 2.2 NOTES (Vercel Pro):

- Монстр НЕ создаёт новых Serverless Functions.

- Весь контент генерится на build-этапе в:

    public/seo/pages

    public/seo/sitemaps

- Лимиты по количеству функций Vercel Pro к нему не относятся.

Рекомендации под Pro:

- Если билд подходит к лимиту по времени:

  - Уменьшите "targetPagesPerBuild" в data/seo/config.json (например, до 10000).

  - Убедитесь, что Stripe/ClearVIN API НЕ вызываются на этапе билда

    (только фронт + статика).

AI:

- Чтобы выключить AI, не меняя код:

  - В .env: SEO_ENABLE_AI=0

  - Или в data/seo/config.json: "enableAI": false

- Для включения AI:

  - В .env:

      SEO_ENABLE_AI=1

      GROQ_API_KEY=sk_xxx...

      DEEPSEEK_API_KEY=sk_xxx...

