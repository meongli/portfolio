/* ===== 공통 UI 동작: 탭, 아코디언, 드롭다운, 드로어, 보기 설정 ===== */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (_) {} }
  };

  /* ---------- Tabs: 표시 막대가 미끄러지고 내용은 서서히 바뀜 ---------- */
  var tablist = $(".tablist");
  var syncTabs = function () {};
  if (tablist) {
    var tabs = $$('[role="tab"]', tablist);
    var ind = $(".tab-ind", tablist);
    var cur = tabs.filter(function (t) { return t.getAttribute("aria-selected") === "true"; })[0] || tabs[0];
    var timer = null;
    var panelOf = function (t) { return document.getElementById(t.getAttribute("aria-controls")); };
    tabs.forEach(function (t) { if (t !== cur) panelOf(t).hidden = true; });

    var moveInd = function (t, instant) {
      if (instant) ind.style.transition = "none";
      ind.style.width = t.offsetWidth + "px";
      ind.style.transform = "translateX(" + t.offsetLeft + "px)";
      if (instant) { void ind.offsetWidth; ind.style.transition = ""; }
    };
    var select = function (t, focus) {
      if (focus) t.focus();
      if (t === cur) return;
      var oldP = panelOf(cur), newP = panelOf(t);
      cur.setAttribute("aria-selected", "false"); cur.tabIndex = -1;
      t.setAttribute("aria-selected", "true"); t.tabIndex = 0;
      cur = t; moveInd(t);
      clearTimeout(timer);
      $$(".tabpanel").forEach(function (p) { if (p !== oldP) { p.hidden = true; p.classList.remove("out", "fade"); } });
      oldP.classList.add("out");
      timer = setTimeout(function () {
        oldP.hidden = true; oldP.classList.remove("out", "fade");
        newP.hidden = false; newP.classList.remove("fade"); void newP.offsetWidth; newP.classList.add("fade");
      }, 160);
    };
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(t); });
      t.addEventListener("keydown", function (e) {
        var j = null;
        if (e.key === "ArrowRight") j = (i + 1) % tabs.length;
        else if (e.key === "ArrowLeft") j = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === "Home") j = 0;
        else if (e.key === "End") j = tabs.length - 1;
        if (j !== null) { e.preventDefault(); select(tabs[j], true); }
      });
    });
    syncTabs = function () { moveInd(cur, true); };
    syncTabs();
    window.addEventListener("resize", syncTabs);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncTabs);
  }

  /* ---------- Accordion: 0.3초 동안 펼침, 화살표 180도 회전 ---------- */
  $$(".acc-btn").forEach(function (b) {
    b.addEventListener("click", function () {
      var item = b.closest(".acc-item");
      var open = !item.classList.contains("open");
      item.classList.toggle("open", open);
      b.setAttribute("aria-expanded", String(open));
    });
  });

  /* ---------- Dropdown: 정렬 메뉴 ---------- */
  var dd = $("#sort-dd");
  var closeDropdown = function () {};
  if (dd) {
    var btn = $("#sort-btn"), menu = $("#sort-menu"), curLabel = $("#sort-cur"), list = $(".list");
    var opts = $$('[role="option"]', menu);
    var n = function (el, k) { return Number(el.dataset[k]); };
    var sorters = {
      kind: function (a, b) { return n(a, "kind") - n(b, "kind") || n(a, "i") - n(b, "i"); },
      featured: function (a, b) { return n(b, "feat") - n(a, "feat") || n(a, "i") - n(b, "i"); },
      comps: function (a, b) { return n(b, "nc") - n(a, "nc") || n(a, "i") - n(b, "i"); },
      title: function (a, b) { return a.dataset.title.localeCompare(b.dataset.title, "ko"); }
    };
    var setOpen = function (o, focusSel) {
      dd.classList.toggle("open", o);
      btn.setAttribute("aria-expanded", String(o));
      if (o && focusSel) {
        var sel = opts.filter(function (x) { return x.getAttribute("aria-selected") === "true"; })[0] || opts[0];
        setTimeout(function () { sel.focus({ preventScroll: true }); }, 30);
      }
    };
    closeDropdown = function () { if (dd.classList.contains("open")) setOpen(false); };
    var apply = function (o) {
      opts.forEach(function (x) { x.setAttribute("aria-selected", String(x === o)); });
      curLabel.textContent = o.dataset.label;
      $$(".row", list).sort(sorters[o.dataset.sort]).forEach(function (r) { list.appendChild(r); });
    };
    var choose = function (o) { apply(o); store.set("pf-sort", o.dataset.sort); setOpen(false); btn.focus({ preventScroll: true }); };

    btn.addEventListener("click", function (e) { e.stopPropagation(); setOpen(!dd.classList.contains("open"), true); });
    btn.addEventListener("keydown", function (e) { if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true, true); } });
    opts.forEach(function (o, i) {
      o.addEventListener("click", function (e) { e.stopPropagation(); choose(o); });
      o.addEventListener("keydown", function (e) {
        if (e.key === "ArrowDown") { e.preventDefault(); opts[(i + 1) % opts.length].focus(); }
        else if (e.key === "ArrowUp") { e.preventDefault(); opts[(i - 1 + opts.length) % opts.length].focus(); }
        else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(o); }
        else if (e.key === "Escape") { e.preventDefault(); setOpen(false); btn.focus(); }
        else if (e.key === "Tab") { setOpen(false); }
      });
    });
    document.addEventListener("click", function (e) { if (!dd.contains(e.target)) closeDropdown(); });
    var saved = store.get("pf-sort");
    var so = opts.filter(function (x) { return x.dataset.sort === saved; })[0];
    if (so) apply(so);
  }

  /* ---------- Drawer: 오른쪽에서 Spring 모션으로 열림 ---------- */
  var drawer = $("#drawer"), scrim = $("#scrim"), sbtn = $("#settings-btn");
  var lastFocus = null;
  var isOpen = function () { return drawer && drawer.classList.contains("open"); };
  function openDrawer() {
    lastFocus = document.activeElement;
    drawer.removeAttribute("inert");
    drawer.setAttribute("aria-hidden", "false");
    drawer.classList.add("open"); scrim.classList.add("on");
    sbtn.setAttribute("aria-expanded", "true");
    document.body.classList.add("locked");
    setTimeout(function () { $("#drawer-close").focus({ preventScroll: true }); }, 60);
  }
  function closeDrawer() {
    if (!isOpen()) return;
    drawer.classList.remove("open"); scrim.classList.remove("on");
    drawer.setAttribute("aria-hidden", "true");
    drawer.setAttribute("inert", "");
    sbtn.setAttribute("aria-expanded", "false");
    if (!$(".detail.open")) document.body.classList.remove("locked");
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  if (drawer) {
    sbtn.addEventListener("click", openDrawer);
    scrim.addEventListener("click", closeDrawer);
    $("#drawer-close").addEventListener("click", closeDrawer);
    drawer.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;
      var f = $$('button, input, [tabindex]:not([tabindex="-1"])', drawer).filter(function (x) { return !x.disabled; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeDrawer(); closeDropdown(); }
  });

  /* ---------- 보기 설정 (이 브라우저에만 저장) ---------- */
  var initialTheme = root.getAttribute("data-theme");
  var applyTheme = function (v) {
    if (v === "light" || v === "dark") root.setAttribute("data-theme", v);
    else if (initialTheme) root.setAttribute("data-theme", initialTheme);
    else root.removeAttribute("data-theme");
  };
  var applySize = function (v) {
    root.classList.remove("fs-large", "fs-xl");
    if (v === "large" || v === "xl") root.classList.add("fs-" + v);
    requestAnimationFrame(syncTabs);
  };
  var applyCalm = function (on) { root.classList.toggle("calm", on); };
  var bindRadios = function (name, key, fn, def) {
    var v = store.get(key) || def;
    $$('input[name="' + name + '"]').forEach(function (r) {
      r.checked = r.value === v;
      r.addEventListener("change", function () { if (r.checked) { fn(r.value); store.set(key, r.value); } });
    });
    if (v !== def) fn(v);
  };
  bindRadios("opt-theme", "pf-theme", applyTheme, "system");
  bindRadios("opt-size", "pf-size", applySize, "normal");
  var calm = $("#opt-calm");
  if (calm) {
    calm.checked = store.get("pf-calm") === "1";
    applyCalm(calm.checked);
    calm.addEventListener("change", function () { applyCalm(calm.checked); store.set("pf-calm", calm.checked ? "1" : "0"); });
  }
})();
