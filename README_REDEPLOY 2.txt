1️⃣ Подключись к серверу через SSH.

2️⃣ Скопируй конфиг в нужные каталоги:
   sudo cp nginx-vintrusted.conf /etc/nginx/sites-available/vintrusted.conf
   sudo ln -sf /etc/nginx/sites-available/vintrusted.conf /etc/nginx/sites-enabled/vintrusted.conf

3️⃣ Проверь синтаксис и перезапусти nginx:
   sudo nginx -t && sudo systemctl reload nginx

4️⃣ Убедись, что фронт лежит по пути, указанному в root в конфиге — например /var/www/vintrusted/current (там должны быть index.html и сборка сайта).

5️⃣ После этого:
   • https://vintrusted.com → откроется сайт
   • https://vintrusted.com/api/health → {\"ok\":true}

6️⃣ Если всё работает — переходим к добавлению Stripe формы на страницу отчёта.
