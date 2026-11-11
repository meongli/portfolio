// 사용법: node build.js  → portfolio-data.js 내용을 읽어 portfolio.html을 새로 만듭니다.
// 완성된 HTML에는 내용이 모두 미리 들어가므로, 자바스크립트 없이도 화면이 보입니다.
const fs = require("fs");
const path = require("path");
const { PROFILE, COMPETENCIES, KIND, PROJECTS, FAQ, REVIEWS } = require("./portfolio-data.js");
const css = fs.readFileSync(path.join(__dirname, "portfolio-style.css"), "utf8");

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const blank = (v, label) => (v ? esc(v) : `<span class="blank">[${label}]</span>`);
const periodText = p => p.period || (p.months ? `${p.months}개월` : "기간 미기재");
const compKeys = Object.keys(COMPETENCIES);

/* 계산 */
const byKind = k => PROJECTS.filter(p => p.kind === k);
const work = byKind("work"), awards = byKind("award"), personal = byKind("personal");
const knownMonths = work.reduce((s, p) => s + (p.months || 0), 0);
const unknownWork = work.filter(p => !p.months).length;
const compCount = Object.fromEntries(compKeys.map(k => [k, PROJECTS.filter(p => p.comps.includes(k)).length]));
const maxC = Math.max(...Object.values(compCount));
const order = [...compKeys].sort((a, b) => compCount[b] - compCount[a]);
const avgComps = (PROJECTS.reduce((s, p) => s + p.comps.length, 0) / PROJECTS.length).toFixed(1);
const missing = [["이름", PROFILE.name], ["학교", PROFILE.school], ["졸업 시기", PROFILE.grad], ["연락처", PROFILE.contact]].filter(x => !x[1]).map(x => x[0]);
const noPeriod = PROJECTS.filter(p => !p.period && !p.months).length;
const todo = missing.length || noPeriod ? `아직 비어 있는 정보: ${missing.join(", ")}${noPeriod ? `, 기간 미기재 경험 ${noPeriod}건` : ""}` : "";

const callHtml = p => `<span class="callno">${p.callNo.map(esc).join("<br>")}</span>`;
const tag = k => `<span class="tag">${esc(COMPETENCIES[k].name)}</span>`;

const marc = [
  ["100", `<i>▾a</i>${blank(PROFILE.name, "이름")}`],
  ["245", `<i>▾a</i>문서를 정확하게 다루고 사람에게 맞춰 안내하는 예비 사서`],
  ["260", `<i>▾a</i>${blank(PROFILE.school, "학교")} ${esc(PROFILE.major)} <i>▾c</i>${blank(PROFILE.grad, "졸업 시기")} 졸업예정`],
  ["300", `<i>▾a</i>실무 ${work.length}건 ; 수상 ${awards.length}건 ; 개인 프로젝트 ${personal.length}건`],
  ["500", PROFILE.courses.map(esc).join("<br>")],
  ["586", PROFILE.awards.map(esc).join("<br>")],
  ["650", compKeys.slice(0, 4).map(k => `<i>▾a</i>${esc(COMPETENCIES[k].name)}`).join(" ")]
];

const stats = [
  ["경험·프로젝트", PROJECTS.length, "건", `실무 ${work.length} · 수상 ${awards.length} · 개인 ${personal.length}`],
  ["확인된 실무 기간", knownMonths, "개월+", `기간 미기재 실무 ${unknownWork}건은 합계에서 뺐습니다`],
  ["수상", awards.length, "회", awards.map(p => p.headline[0]).join(" · ")],
  ["강점 분야", compKeys.length, "개", `경험 1건당 평균 ${avgComps}개 강점`]
];

const kindOrder = { work: 0, award: 1, personal: 2 };
const rows = [...PROJECTS].sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind]);

const detail = p => `
<section class="detail" id="p-${p.id}" aria-labelledby="t-${p.id}">
  <a class="backdrop" href="#projects" tabindex="-1" aria-hidden="true"></a>
  <div class="panel"><div class="dlg">
    <div class="dlg-head">
      ${callHtml(p)}
      <h2 id="t-${p.id}">${esc(p.title)}</h2>
      <p style="color:var(--ink-2)">${esc(p.summary)}</p>
      <a class="close" href="#projects" aria-label="닫기">×</a>
    </div>
    <div class="facts">
      <div><b>구분</b>${KIND[p.kind]}${p.status ? ` · ${esc(p.status)}` : ""}</div>
      <div><b>기간</b>${esc(periodText(p))}</div>
      <div><b>구성</b>${esc(p.team || (p.kind === "personal" ? "개인" : "미기재"))}</div>
      <div><b>맥락</b>${esc(p.context)}</div>
    </div>
    <section><h4>역할</h4><p class="role">${esc(p.role)}</p>
      <div class="tools">${p.comps.map(tag).join("")}${p.tools.map(t => `<span class="tag plain">${esc(t)}</span>`).join("")}</div></section>
    <section><h4>과정</h4><ol class="steps">${p.process.map(([t, d]) => `<li><span><strong>${esc(t)}</strong> · ${esc(d)}</span></li>`).join("")}</ol></section>
    <section><h4>결과</h4><div class="results">${p.results.map(([v, l]) => `<div class="result"><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join("")}</div>
      <p class="outcome">${esc(p.outcome)}</p></section>
    <section><h4>증빙 ${p.evidence.length}점</h4><ul class="evidence">${p.evidence.map(([t, d]) => `<li><span class="ev-type">${esc(t)}</span><span>${esc(d)}</span><span class="ev-state">첨부 예정</span></li>`).join("")}</ul></section>
  </div></div>
</section>`;

/* 필터와 상세 창을 CSS만으로 동작시키는 규칙 */
const filterCss = ["all", ...compKeys].map(k => `
#f-${k}:checked ~ .filters label[for="f-${k}"]{background:var(--shelf);border-color:var(--shelf);color:var(--card)}
#f-${k}:checked ~ .descs .d-${k}{display:block}
#f-${k}:focus-visible ~ .filters label[for="f-${k}"]{outline:2px solid var(--stamp);outline-offset:2px}`).join("")
  + compKeys.map(k => `\n#f-${k}:checked ~ .list .row:not(.c-${k}){display:none}`).join("");

const extraCss = `
.fl-in{position:absolute;opacity:0;pointer-events:none}
.filters label{cursor:pointer;font-size:.85rem;padding:6px 14px;border:1px solid var(--rule);border-radius:999px;color:var(--ink-2);background:var(--card)}
.filters label:hover{border-color:var(--shelf);color:var(--ink)}
.filters label .c{font-family:var(--font-mono);font-size:.75rem;opacity:.75;margin-left:4px}
.descs p{display:none;font-size:.88rem;color:var(--ink-2)}
a.row,a.spine{color:inherit;text-decoration:none}
.detail{display:none;position:fixed;inset:0;z-index:20;overflow-y:auto;padding-block:max(16px,env(safe-area-inset-top,0px)) max(16px,env(safe-area-inset-bottom,0px));padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
.detail:target{display:block}
.backdrop{position:fixed;inset:0;background:rgba(10,20,16,.55)}
.panel{position:relative;max-width:760px;margin:0 auto;background:var(--card);border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,.35)}
a.close{text-decoration:none}
${filterCss}
`;

/* Hero 그림: 강점별 색인 카드가 꽂힌 도서관 목록함 (외부 이미지 없이 SVG로 그림) */
const tabLabels = ["문서", "행정", "응대", "기획", "영상"];
const backCards = tabLabels.map((t, i) => {
  const y = 44 + i * 15, tx = 72 + i * 58;
  return `<g class="drop" style="--d:${i}">
    <rect class="c-card" x="${tx}" y="${y - 22}" width="52" height="26" rx="4"/>
    <text class="c-tab" x="${tx + 26}" y="${y - 5}" text-anchor="middle">${t}</text>
    <rect class="c-card" x="56" y="${y}" width="328" height="220" rx="4"/>
  </g>`;
}).join("");
const aac = PROJECTS.find(p => p.id === "aac-startup");
const heroSvg = `<svg viewBox="0 0 440 380" role="img" aria-hidden="true">
  ${backCards}
  <g class="drop" style="--d:5"><g transform="rotate(-3 220 190)">
    <rect class="c-front" x="70" y="118" width="300" height="190" rx="4"/>
    <line class="c-red" x1="70" y1="150" x2="370" y2="150"/>
    <text class="c-mono" x="88" y="140">${esc(aac.callNo[0])}  ${esc(aac.callNo[1])}</text>
    <text class="c-title" x="88" y="180">AI 기반 AAC 웨어러블</text>
    <text class="c-body" x="88" y="204">청각장애인의 의사소통을 돕는 기획</text>
    <line class="c-line" x1="88" y1="222" x2="300" y2="222"/>
    <g transform="rotate(-12 318 188)">
      <circle class="c-stamp" cx="318" cy="188" r="30"/>
      <circle class="c-stamp thin" cx="318" cy="188" r="24"/>
      <text class="c-stamp-t" x="318" y="193" text-anchor="middle">최우수</text>
    </g>
  </g></g>
  <g class="drop" style="--d:6">
    <rect class="c-drawer" x="36" y="236" width="368" height="130" rx="6"/>
    <rect class="c-plate" x="168" y="258" width="104" height="36" rx="3"/>
    <text class="c-plate-t" x="220" y="281" text-anchor="middle">300 – 600</text>
    <path class="c-handle" d="M188 318 q32 22 64 0"/>
  </g>
</svg>`;

/* 할 수 있는 일: 강점 카드 (아이콘은 SVG 선 그림) */
const ICONS = {
  doc:   '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M10 12h6M10 15h6M10 18h4"/>',
  admin: '<path d="M3 10l9-6 9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8"/><path d="M3 21h18"/>',
  cust:  '<path d="M4 5h11v8H9l-3 3v-3H4z"/><path d="M15 9h5v8h-2v3l-3-3h-4v-2"/>',
  plan:  '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.4.3.5.7.5 1.1v.9h6V15c0-.4.2-.8.5-1.1A6 6 0 0 0 12 3z"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>',
  eng:   '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z"/>',
  ai:    '<path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z"/><path d="M18 15l.9 2.1 2.1.9-2.1.9L18 21l-.9-2.1-2.1-.9 2.1-.9z"/>'
};
const svcCards = order.map((k, i) => {
  const ex = PROJECTS.filter(p => p.comps.includes(k)).map(p => p.title);
  return `<label class="svc${i === 0 ? " svc-wide" : ""}" for="f-${k}" data-go="projects">
      <span class="svc-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${ICONS[k]}</svg></span>
      <h3>${esc(COMPETENCIES[k].name)}</h3>
      <p>${esc(COMPETENCIES[k].desc)}</p>
      <span class="svc-foot">관련 경험 ${ex.length}건${i === 0 ? " · " + ex.slice(0, 3).map(esc).join(", ") : ""} <span aria-hidden="true">→</span></span>
    </label>`;
}).join("\n    ");
const svcCss = `
.services{display:grid;gap:18px}
.svc-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
.svc{cursor:pointer;display:grid;grid-template-rows:auto auto 1fr auto;gap:10px;padding:22px;background:var(--card);border:1px solid var(--rule);border-radius:8px;transition:transform .25s cubic-bezier(.2,.7,.2,1),box-shadow .25s,border-color .25s;min-width:0}
.svc:hover{transform:translateY(-6px);box-shadow:var(--shadow);border-color:var(--shelf)}
.svc:active{transform:translateY(-2px)}
.svc-wide{grid-column:span 2;background:var(--shelf-soft);border-color:transparent}
.svc-wide h3{font-size:1.35rem}
.svc-icon{width:44px;height:44px;border-radius:10px;display:grid;place-items:center;background:var(--shelf-soft);color:var(--shelf)}
.svc-wide .svc-icon{background:var(--card)}
.svc-icon svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.svc h3{font-size:1.1rem}
.svc p{font-size:.88rem;color:var(--ink-2)}
.svc-foot{font-size:.78rem;color:var(--ink-3);padding-top:10px;border-top:1px solid var(--rule)}
.svc:hover .svc-foot{color:var(--shelf)}
@media (max-width:860px){.svc-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:560px){.svc-grid{grid-template-columns:1fr}.svc-wide{grid-column:auto}}
@media (prefers-reduced-motion:reduce){.svc:hover{transform:translateY(-4px)}}
`;

const heroCss = `
.top-hero{display:grid;grid-template-columns:1.15fr 1fr;gap:40px;align-items:center;padding-block:16px 0}
.top-hero-text{display:grid;gap:20px;min-width:0}
.top-hero h1{font-size:clamp(2.1rem,5vw,3.3rem);line-height:1.22}
.hero-desc{font-size:1.08rem;color:var(--ink-2);max-width:32em}
.cta{display:flex;flex-wrap:wrap;gap:10px}
.btn{display:inline-flex;align-items:center;gap:6px;padding:12px 20px;border-radius:6px;font-weight:600;font-size:.95rem;text-decoration:none;transition:filter .2s,border-color .2s,transform .2s}
.btn:hover{transform:translateY(-1px)}
.btn-primary{background:var(--shelf);color:var(--card);border:1px solid var(--shelf)}
.btn-primary:hover{filter:brightness(1.12)}
.btn-ghost{border:1px solid var(--ink-3);color:var(--ink)}
.btn-ghost:hover{border-color:var(--ink)}
.hero-facts{display:flex;flex-wrap:wrap;gap:8px 32px;margin:4px 0 0;padding-top:16px;border-top:1px solid var(--rule)}
.hero-facts div{display:grid}
.hero-facts dt{font-size:.74rem;color:var(--ink-3)}
.hero-facts dd{margin:0;font-weight:500;font-size:.92rem}
.hero-art{margin:0;min-width:0;justify-self:center;width:100%;max-width:460px}
.hero-art svg{display:block;width:100%;height:auto;overflow:visible}
.c-card{fill:var(--card);stroke:var(--rule);stroke-width:1.2}
.c-tab{font:500 12px var(--font-body);fill:var(--ink-2)}
.c-front{fill:var(--card);stroke:var(--ink-3);stroke-width:1.2}
.c-red{stroke:var(--stamp);stroke-width:1;opacity:.5}
.c-line{stroke:var(--rule);stroke-width:1}
.c-mono{font:500 12px var(--font-mono);fill:var(--ink-3)}
.c-title{font:700 20px var(--font-display);fill:var(--ink)}
.c-body{font:400 13px var(--font-body);fill:var(--ink-2)}
.c-stamp{fill:none;stroke:var(--stamp);stroke-width:2.4;opacity:.85}
.c-stamp.thin{stroke-width:1}
.c-stamp-t{font:700 13px var(--font-body);fill:var(--stamp);opacity:.9}
.c-drawer{fill:var(--shelf)}
.c-plate{fill:var(--paper);stroke:var(--card);stroke-width:1}
.c-plate-t{font:500 12px var(--font-mono);fill:var(--ink-2)}
.c-handle{fill:none;stroke:var(--paper);stroke-width:5;stroke-linecap:round}
@keyframes rise{from{opacity:0;transform:translateY(-18px)}}
.rise{animation:rise .7s cubic-bezier(.2,.7,.2,1) both;animation-delay:calc(var(--i,0) * 130ms)}
.drop{animation:rise .55s cubic-bezier(.2,.7,.2,1) both;animation-delay:calc(450ms + var(--d,0) * 90ms);transform-box:fill-box}
@media (max-width:860px){.top-hero{grid-template-columns:1fr}.hero-art{max-width:400px}}
@keyframes fadein{from{opacity:0}}
@media (prefers-reduced-motion:reduce){.rise,.drop{animation-name:fadein}}
.js .detail:target:not(.open){display:none}
.detail.open{display:block}
body.locked{overflow:hidden}
html{scroll-behavior:smooth}
`;

/* ===== UI 컴포넌트 마크업 ===== */
const uiCss = fs.readFileSync(path.join(__dirname, "portfolio-ui.css"), "utf8");
const uiJs = fs.readFileSync(path.join(__dirname, "portfolio-ui.js"), "utf8");
const chevron = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
const tip = (id, text) => `<span class="tip"><button type="button" class="tip-btn" aria-label="설명 보기" aria-describedby="${id}">?</button><span class="tip-box" role="tooltip" id="${id}">${esc(text)}</span></span>`;

const tocItems = [
  ["services", "할 수 있는 일", "강점을 카드로 정리", `강점 ${compKeys.length}`],
  ["summary", "한눈에 보는 활동", "경험 데이터로 계산한 요약", `카드 ${stats.length}`],
  ["highlights", "대표 경험", "먼저 보여드리고 싶은 경험", "3건"],
  ["projects", "강점별 경험·프로젝트 목록", "거르기와 정렬, 상세 보기", `${PROJECTS.length}건`],
  ["faq", "자주 묻는 질문", "면접 전에 궁금하실 것들", `${FAQ.length}문항`]
];
const panelIntro = `<div class="hero">
      <div class="hero-text">
        ${todo ? `<span class="todo">${esc(todo)}</span>` : ""}
        <p class="lead">${esc(PROFILE.intro)}</p>
        <div class="keywords">${compKeys.map(tag).join("")}</div>
      </div>
      <aside class="catalog" aria-label="자기소개 목록카드">
        <div class="catalog-head"><span>KORMARC 형식 자기소개</span><span>경험 ${PROJECTS.length}건</span></div>
        <dl class="marc">${marc.map(([t, v]) => `<dt>${t}</dt><dd>${v}</dd>`).join("")}</dl>
      </aside>
    </div>`;
const panelToc = `<ol class="toc">${tocItems.map(([id, t, d, n], i) => `
      <li><a href="#${id}"><span class="toc-no">${i + 1}</span><span class="toc-t"><b>${esc(t)}</b><small>${esc(d)}</small></span><span class="toc-dots" aria-hidden="true"></span><span class="toc-n">${esc(n)}</span></a></li>`).join("")}
    </ol>`;
const panelReview = `<div class="reviews">${REVIEWS.map(r => `
      <a class="review" href="#p-${r.link}">
        <span class="rv-stamp">${esc(r.label)}</span>
        <span class="rv-body"><span class="rv-src">${esc(r.source)}</span><p>${esc(r.text)}</p><span class="rv-more">관련 경험 보기 →</span></span>
      </a>`).join("")}
    </div>`;
const TABS = [["intro", "소개", panelIntro], ["toc", "목차", panelToc], ["review", "서평", panelReview]];
const tabsSection = `<section id="about" class="tabs-sec rise" style="--i:7" aria-labelledby="about-h">
    <div class="sec-head"><span class="eyebrow">이 포트폴리오에 대하여</span><h2 id="about-h">소개 · 목차 · 서평</h2></div>
    <div class="tabs">
      <div class="tablist" role="tablist" aria-label="소개, 목차, 서평">
        ${TABS.map(([k, l], i) => `<button type="button" class="tab" role="tab" id="tab-${k}" aria-controls="panel-${k}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${l}</button>`).join("\n        ")}
        <span class="tab-ind" aria-hidden="true"></span>
      </div>
      ${TABS.map(([k, l, body]) => `<div class="tabpanel" role="tabpanel" id="panel-${k}" aria-labelledby="tab-${k}" tabindex="0">
        <h3 class="panel-title">${l}</h3>
        ${body}
      </div>`).join("\n      ")}
    </div>
  </section>`;

const faqSection = `<section id="faq" class="faq-sec" aria-labelledby="faq-h">
    <div class="sec-head"><span class="eyebrow">자주 묻는 질문</span><h2 id="faq-h">면접 전에 궁금하실 것들</h2></div>
    <div class="acc">${FAQ.map(([q, a], i) => `
      <div class="acc-item">
        <h3><button type="button" class="acc-btn" id="q-${i}" aria-expanded="false" aria-controls="a-${i}"><span class="acc-q"><i>Q${i + 1}</i>${esc(q)}</span><svg class="acc-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button></h3>
        <div class="acc-panel" id="a-${i}" role="region" aria-labelledby="q-${i}"><div class="acc-inner"><p>${esc(a)}</p></div></div>
      </div>`).join("")}
    </div>
  </section>`;

const SORTS = [["kind", "구분순", "실무 → 수상 → 개인 프로젝트"], ["featured", "대표 먼저", "대표 경험 3건을 위로"], ["comps", "강점 많은 순", "여러 강점이 걸친 경험부터"], ["title", "가나다순", "제목 기준"]];
const sortDropdown = `<div class="dd" id="sort-dd">
        <button type="button" class="dd-btn" id="sort-btn" aria-haspopup="listbox" aria-expanded="false" aria-controls="sort-menu"><span class="dd-k">정렬</span><span id="sort-cur">${SORTS[0][1]}</span>${chevron}</button>
        <ul class="dd-menu" id="sort-menu" role="listbox" aria-label="정렬 방식">
          ${SORTS.map(([k, l, d], i) => `<li role="option" tabindex="-1" data-sort="${k}" data-label="${l}" aria-selected="${i === 0}">${l}<small>${d}</small></li>`).join("\n          ")}
        </ul>
      </div>`;

const settingsBtn = `<button type="button" class="icon-btn" id="settings-btn" aria-haspopup="dialog" aria-expanded="false" aria-controls="drawer"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>설정</button>`;
const seg = (name, legend, opts) => `<fieldset class="seg"><legend>${legend}</legend><div class="seg-opts">${opts.map(([v, l], i) => `<input type="radio" name="${name}" id="${name}-${v}" value="${v}"${i === 0 ? " checked" : ""}><label for="${name}-${v}">${l}</label>`).join("")}</div></fieldset>`;
const drawerHtml = `<div class="scrim" id="scrim"></div>
<aside class="drawer" id="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-h" aria-hidden="true" inert>
  <div class="drawer-in">
    <div class="drawer-head"><h2 id="drawer-h">보기 설정</h2><button type="button" class="x-btn" id="drawer-close" aria-label="설정 닫기">×</button></div>
    ${seg("opt-theme", "화면 테마", [["system", "시스템"], ["light", "밝게"], ["dark", "어둡게"]])}
    ${seg("opt-size", "글자 크기", [["normal", "보통"], ["large", "크게"], ["xl", "아주 크게"]])}
    <label class="switch-row" for="opt-calm"><span>움직임 줄이기<small>등장·떠오르기·펼침 효과를 끕니다</small></span><input type="checkbox" class="switch" id="opt-calm" role="switch"></label>
    <p class="drawer-note">설정은 이 브라우저에만 저장됩니다.</p>
  </div>
</aside>`;

const html = `<title>문헌정보 포트폴리오</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=IBM+Plex+Sans+KR:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
${css}
${extraCss}
${heroCss}
${svcCss}
${uiCss}
</style>
<script>document.documentElement.classList.add("js")</script>

<div class="wrap">
  <div class="topbar">
    <span class="brand">LIS PORTFOLIO</span>
    ${settingsBtn}
  </div>
  <header class="top-hero">
    <div class="top-hero-text">
      <span class="eyebrow rise" style="--i:0">${esc(PROFILE.major)} · ${PROFILE.grad ? esc(PROFILE.grad) + " " : ""}졸업예정${PROFILE.name ? " · " + esc(PROFILE.name) : ""}</span>
      <h1 class="rise" style="--i:1">문서를 정확하게 다루고, 사람에게 맞춰 안내하는 예비 사서</h1>
      <p class="hero-desc rise" style="--i:2">${esc(PROFILE.heroDesc)}</p>
      <div class="cta rise" style="--i:3">
        <a class="btn btn-primary" href="#highlights">대표 경험 보기</a>
        <a class="btn btn-ghost" href="#projects">전체 목록 보기 <span aria-hidden="true">↓</span></a>
      </div>
      <dl class="hero-facts rise" style="--i:4">
        <div><dt>실무</dt><dd>${work.length}건 · ${knownMonths}개월+</dd></div>
        <div><dt>수상</dt><dd>${awards.map(p => esc(p.headline[0])).join(" · ")}</dd></div>
        <div><dt>강점</dt><dd>${compKeys.length}개 분야</dd></div>
      </dl>
    </div>
    <figure class="hero-art rise" style="--i:3" aria-label="강점별 경험 카드가 꽂힌 목록함 그림">
      ${heroSvg}
    </figure>
  </header>

  <section id="services" class="services rise" style="--i:6" aria-labelledby="svc-h">
    <div><span class="eyebrow">할 수 있는 일</span><h2 id="svc-h">이런 일을 맡길 수 있습니다</h2></div>
    <div class="svc-grid">
    ${svcCards}
    </div>
  </section>

  ${tabsSection}

  <section id="summary" class="summary" aria-labelledby="sum-h">
    <div class="summary-head">
      <h2 id="sum-h">한눈에 보는 활동${tip("tip-sum", "모든 숫자는 경험 데이터에서 자동으로 계산합니다. 기간을 모르는 경험은 기간 합계에서 뺍니다.")}</h2>
      <span class="eyebrow">경험 ${PROJECTS.length}건 데이터로 계산</span>
    </div>
    <div class="stats">${stats.map(([l, n, u, s]) => `<div class="stat"><span class="lbl">${l}</span><span class="num">${n}<small>${u}</small></span><span class="sub">${esc(s)}</span></div>`).join("")}</div>
    <div class="dist">
      <div>
        <h3>강점별 경험 수${tip("tip-dist", "한 경험이 여러 강점에 걸치면 강점마다 1건씩 셉니다.")}</h3>
        <p>한 경험이 여러 강점에 걸치면 각각 셌습니다. 가장 많은 경험에서 쓴 강점은 ${esc(COMPETENCIES[order[0]].name)}(${compCount[order[0]]}건)입니다.</p>
      </div>
      <div class="bars" role="list">${order.map(k => `<div class="bar-row" role="listitem" title="${esc(COMPETENCIES[k].name)}: 경험 ${compCount[k]}건">
        <span>${esc(COMPETENCIES[k].name)}</span>
        <span class="track"><span class="fill" style="width:${(compCount[k] / maxC * 100).toFixed(1)}%"></span></span>
        <span class="val">${compCount[k]}건</span></div>`).join("")}</div>
    </div>
  </section>

  <section id="highlights" aria-labelledby="feat-h" style="display:grid;gap:18px">
    <div><span class="eyebrow">대표 경험</span><h2 id="feat-h">먼저 보여드리고 싶은 세 가지</h2></div>
    <div class="featured">${PROJECTS.filter(p => p.featured).slice(0, 3).map(p => `
      <a class="spine" href="#p-${p.id}">
        ${callHtml(p)}
        <div><h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p></div>
        <div class="spine-metric"><b>${esc(p.headline[0])}</b><span>${esc(p.headline[1])}</span></div>
      </a>`).join("")}</div>
  </section>

  <section id="projects" aria-labelledby="list-h" style="display:grid;gap:16px">
    <div class="list-head">
      <div><span class="eyebrow">전체 경험</span><h2 id="list-h">강점별 경험·프로젝트 목록${tip("tip-kdc", "왼쪽 번호는 KDC(한국십진분류법) 주류·강 번호입니다. 각 경험의 주제에 맞춰 직접 분류했습니다.")}</h2></div>
      ${sortDropdown}
    </div>
    ${["all", ...compKeys].map(k => `<input class="fl-in" type="radio" name="flt" id="f-${k}"${k === "all" ? " checked" : ""}>`).join("\n    ")}
    <div class="filters" role="group" aria-label="강점으로 거르기">
      <label for="f-all">전체<span class="c">${PROJECTS.length}</span></label>
      ${compKeys.map(k => `<label for="f-${k}">${esc(COMPETENCIES[k].name)}<span class="c">${compCount[k]}</span></label>`).join("\n      ")}
    </div>
    <div class="descs">
      <p class="d-all">실무, 수상, 개인 프로젝트를 모두 모았습니다. 항목을 누르면 역할·과정·결과·증빙이 열립니다.</p>
      ${compKeys.map(k => `<p class="d-${k}">${esc(COMPETENCIES[k].desc)}</p>`).join("\n      ")}
    </div>
    <div class="list">${rows.map((p, i) => `
      <a class="row ${p.comps.map(c => "c-" + c).join(" ")}" href="#p-${p.id}" data-i="${i}" data-kind="${kindOrder[p.kind]}" data-feat="${p.featured ? 1 : 0}" data-nc="${p.comps.length}" data-title="${esc(p.title)}">
        ${callHtml(p)}
        <div style="min-width:0"><h3>${esc(p.title)}${p.featured ? '<span class="badge">대표</span>' : ""}${p.status ? `<span class="badge">${esc(p.status)}</span>` : ""}</h3>
          <div class="meta"><span>${KIND[p.kind]}</span><span>${esc(periodText(p))}</span><span>${esc(p.context)}</span></div></div>
        <div class="tags">${p.comps.map(tag).join("")}</div>
      </a>`).join("")}</div>
  </section>

  ${faqSection}

  <footer>
    <span>각 경험에는 주제에 맞는 KDC 주류·강 번호를 붙였습니다.</span>
    <span>최종 갱신 2026. 11. · 경험 ${PROJECTS.length}건</span>
  </footer>
</div>
${PROJECTS.map(detail).join("\n")}
${drawerHtml}
<script>
${uiJs}
</script>
<script>
/* 링크 이동과 상세 창을 스크립트로 직접 처리합니다.
   (# 링크가 막히는 환경에서도 동작. 스크립트가 꺼져 있으면 CSS :target 방식으로 동작) */
(function () {
  document.documentElement.classList.add("js");
  let opened = null, lastFocus = null;
  const go = id => { const t = document.getElementById(id); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const setHash = h => { try { history.replaceState(null, "", h ? "#" + h : location.pathname + location.search); } catch (_) {} };
  function openDetail(id) {
    const el = document.getElementById(id); if (!el) return;
    closeDetail(true);
    lastFocus = document.activeElement;
    el.classList.add("open"); opened = el;
    document.body.classList.add("locked");
    el.scrollTop = 0;
    const c = el.querySelector(".close"); if (c) c.focus({ preventScroll: true });
    setHash(id);
  }
  function closeDetail(silent) {
    if (!opened) return;
    opened.classList.remove("open"); opened = null;
    document.body.classList.remove("locked");
    if (!silent) { setHash(""); if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); }
  }
  document.addEventListener("click", e => {
    const a = e.target.closest('a[href^="#"]');
    if (a) {
      e.preventDefault();
      const id = a.getAttribute("href").slice(1);
      if (id.indexOf("p-") === 0) return openDetail(id);
      if (opened) { closeDetail(); return; }
      return go(id);
    }
    const card = e.target.closest("[data-go]");
    if (card) setTimeout(() => go(card.dataset.go), 0);
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeDetail(); });
  if (location.hash.indexOf("#p-") === 0) openDetail(location.hash.slice(1));
})();
</script>
`;

fs.writeFileSync(path.join(__dirname, "portfolio.html"), html);
console.log("portfolio.html 생성 완료: 경험", PROJECTS.length, "건");

// GitHub Pages용 독립 페이지(index.html): 문서 머리말을 붙여서 저장
const standalone = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="문헌정보학 전공 졸업예정자의 실무·수상·개인 프로젝트 포트폴리오">
<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
${html}
</body>
</html>
`;
fs.writeFileSync(path.join(__dirname, "index.html"), standalone);
console.log("index.html 생성 완료 (GitHub Pages용)");
