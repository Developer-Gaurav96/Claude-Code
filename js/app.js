/* ============================================================
   app.js — bootstrap, tab navigation, automation engine
   ============================================================ */

(function () {
  var MDT = window.MDT;

  var currentTab = 'calendar';
  var toastTimer = null;

  /* ---------- toast ---------- */

  MDT.toast = function (message) {
    var el = document.getElementById('toast');
    var text = document.getElementById('toastText');
    if (!el || !text) return;

    text.textContent = message;
    el.classList.remove('hidden');
    el.classList.remove('toast-in');
    void el.offsetWidth;           // restart the animation
    el.classList.add('toast-in');

    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { el.classList.add('hidden'); }, 2400);
  };

  /* ---------- tabs ---------- */

  function movePill(btn) {
    var pill = document.getElementById('segPill');
    pill.style.width = btn.offsetWidth + 'px';
    pill.style.transform = 'translateX(' + (btn.offsetLeft - 4) + 'px)';
  }

  function setTab(tab) {
    currentTab = tab;

    Array.prototype.forEach.call(document.querySelectorAll('.seg-btn'), function (b) {
      b.dataset.active = String(b.dataset.tab === tab);
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-panel]'), function (p) {
      var show = p.dataset.panel === tab;
      p.hidden = !show;
      if (show) {
        p.classList.remove('fade-swap');
        void p.offsetWidth;
        p.classList.add('fade-swap');
      }
    });

    var active = document.querySelector('.seg-btn[data-tab="' + tab + '"]');
    if (active) movePill(active);
  }

  function initTabs() {
    var seg = document.getElementById('segControl');
    seg.addEventListener('click', function (ev) {
      var btn = ev.target.closest('.seg-btn');
      if (btn) setTab(btn.dataset.tab);
    });

    setTab('calendar');
    window.addEventListener('resize', function () {
      var active = document.querySelector('.seg-btn[data-tab="' + currentTab + '"]');
      if (active) movePill(active);
    });
    window.addEventListener('load', function () {
      var active = document.querySelector('.seg-btn[data-tab="' + currentTab + '"]');
      if (active) movePill(active);
    });
  }

  /* ---------- automation ---------- */

  function minutesNow() {
    var d = new Date();
    return (d.getHours() * 60) + d.getMinutes();
  }

  function parseTime(value) {
    var parts = String(value).split(':');
    return (Number(parts[0]) * 60) + Number(parts[1]);
  }

  function todayKey() { return MDT.ymd(new Date()); }

  /* Logs today's defaults if no manual record exists and the trigger
     time has passed. Safe to call on a timer: it no-ops once written. */
  function runAutomationCheck() {
    var s = MDT.settings();
    if (!s.automation) return false;

    var now = new Date();
    var key = todayKey();

    // Don't back-fill future days, and don't log before the trigger time.
    if (minutesNow() < parseTime(s.autoTime)) return false;
    // Any existing record blocks auto-logging — including an absent marker,
    // which is a deliberate human decision that must not be overwritten.
    if (MDT.getEntry(key)) return false;
    if (s.milkPackets === 0 && s.dahiPackets === 0) return false;

    MDT.setEntry(key, {
      milk: s.milkPackets,
      dahi: s.dahiPackets,
      milkPrice: s.milkPrice,
      dahiPrice: s.dahiPrice,
      manual: false
    });

    MDT.refreshCalendar();
    MDT.toast('Auto-logged ' + s.milkPackets + ' milk, ' + s.dahiPackets + ' dahi for today');
    return true;
  }

  /* Catch-up sweep: fills days that elapsed while the app was closed. */
  function backfill() {
    var s = MDT.settings();
    if (!s.automation) return 0;

    var trigger = parseTime(s.autoTime);
    var now = new Date();
    var filled = 0;
    var cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Walk back at most 90 days so a long gap can't lock up the UI.
    for (var i = 1; i <= 90; i++) {
      var day = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - i);
      var key = MDT.ymd(day);

      if (MDT.getEntry(key)) continue;

      // The trigger must have passed on that day too.
      var dayCutoff = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, trigger);
      if (dayCutoff.getTime() > now.getTime()) continue;

      if (s.milkPackets === 0 && s.dahiPackets === 0) continue;

      MDT.setEntry(key, {
        milk: s.milkPackets,
        dahi: s.dahiPackets,
        milkPrice: s.milkPrice,
        dahiPrice: s.dahiPrice,
        manual: false
      });
      filled++;
    }

    return filled;
  }

  function initAutomation() {
    var filled = backfill();
    runAutomationCheck();

    // Every 30s while the app stays open.
    window.setInterval(runAutomationCheck, 30000);

    // Also check when the tab regains focus (covers sleep/wake).
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') runAutomationCheck();
    });

    return filled;
  }

  /* ---------- export wiring ---------- */

  function initExport() {
    // Wrapped so the click event isn't passed in as the month argument.
    document.getElementById('dockExport').addEventListener('click', function () {
      MDT.exportPDF();
    });
  }

  /* ---------- boot ---------- */

  function boot() {
    MDT.applyTheme(MDT.getTheme());

    initTabs();
    // Invoices first: the calendar's initial render calls into it.
    MDT.initInvoices();
    MDT.initCalendar();
    MDT.initModal();
    MDT.initSettings();
    initExport();

    // Last-resort safety net: mirror the in-memory view of state into
    // storage on tab hide/pagehide, which covers inputs mid-edit.
    var flush = function () {
      try {
        MDT.saveEntries(MDT.entries());
        MDT.saveSettings(MDT.settings());
        MDT.write(MDT.KEYS.theme, MDT.getTheme());
      } catch (err) { /* storage unavailable; nothing to recover */ }
    };
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') flush();
    });
    window.addEventListener('pagehide', flush);

    var filled = initAutomation();
    if (filled > 0) {
      MDT.refreshCalendar();
      MDT.toast('Back-filled ' + filled + ' missed day' + (filled === 1 ? '' : 's'));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
