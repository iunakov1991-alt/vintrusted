// public/seo-events.js
// Лёгкий трекинг поведенческих сигналов (EN/ES раздельно)
// Без сторонних библиотек, только window.dispatchEvent/console.log.
// Интеграция с GA/Ads — через прослушку custom events на стороне клиента.

(function () {
  try {
    var lang =
      document.documentElement.getAttribute("lang") ||
      document.body.getAttribute("data-lang") ||
      "en";
    var firedScroll = false;

    function emit(name, detail) {
      var ev = new CustomEvent("vintrusted-seo-event", {
        detail: Object.assign({ name: name, lang: lang }, detail || {}),
      });
      window.dispatchEvent(ev);
      // На отладку:
      // console.log("SEO EVENT:", ev.detail);
    }

    // Скролл до таблицы
    function onScroll() {
      if (firedScroll) return;
      var table = document.querySelector("table");
      if (!table) return;
      var rect = table.getBoundingClientRect();
      if (rect.top < window.innerHeight) {
        firedScroll = true;
        emit("scroll_to_table", {});
        window.removeEventListener("scroll", onScroll);
      }
    }
    window.addEventListener("scroll", onScroll);

    // FAQ клики (предполагаем data-faq-item)
    document.addEventListener("click", function (e) {
      var el = e.target.closest("[data-faq-item]");
      if (el) {
        var q = el.getAttribute("data-faq-question") || "";
        emit("faq_click", { question: q.slice(0, 120) });
      }
    });

    // Ввод VIN (первые 6 символов)
    var vinInput = document.querySelector("input[name='vin'], input[data-vin-input]");
    if (vinInput) {
      var buffer = "";
      vinInput.addEventListener("input", function () {
        var v = (vinInput.value || "").replace(/[^A-Za-z0-9]/g, "");
        if (v.length >= 6 && buffer !== v.slice(0, 6)) {
          buffer = v.slice(0, 6);
          emit("vin_prefix_entered", { prefix: buffer });
        }
      });
    }

  } catch (e) {
    // fail-silent
  }
})();

