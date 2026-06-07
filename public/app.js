'use strict';

/* ============================================================
 * Baby-Gear Trade Study — single-page app
 * Vanilla JS. State persists to /api/state (server) + localStorage.
 * ============================================================ */

let state = null;

const $ = (sel, root = document) => root.querySelector(sel);
const el = (id) => document.getElementById(id);

const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const money = (n) => '$' + (Math.round((Number(n) || 0) * 100) / 100).toLocaleString();
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const uid = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;

/* ---------------- Persistence ---------------- */

async function loadState() {
  try {
    const r = await fetch('/api/state');
    if (r.ok) { state = await r.json(); return; }
  } catch (e) { /* offline / file:// */ }

  const ls = localStorage.getItem('babygear-state');
  if (ls) { try { state = JSON.parse(ls); return; } catch (e) {} }

  const r = await fetch('/api/seed').catch(() => null);
  if (r && r.ok) { state = await r.json(); return; }
  state = { config: { overallBudget: 0, adapterCost: 100 }, modules: [], inventory: [] };
}

let saveTimer = null;
function setStatus(msg) { const s = el('save-status'); if (s) s.textContent = msg; }

function save() {
  try { localStorage.setItem('babygear-state', JSON.stringify(state)); } catch (e) {}
  setStatus('Saving…');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      });
      setStatus('Saved ✓');
    } catch (e) {
      setStatus('Saved locally (server offline)');
    }
  }, 350);
}

/* ---------------- Computation ---------------- */

function computeModule(m) {
  const max = 5 * m.criteria.reduce((s, c) => s + (Number(c.weight) || 0), 0);
  const per = {};
  let topId = null, topVal = -Infinity;
  m.options.forEach((o) => {
    let wt = 0;
    m.criteria.forEach((c) => { wt += (Number(c.weight) || 0) * (Number(o.scores[c.id]) || 0); });
    per[o.id] = { wt, pct: max ? wt / max : 0 };
    if (wt > topVal) { topVal = wt; topId = o.id; }
  });
  return { max, per, topId };
}

function selectedOption(m) {
  const comp = computeModule(m);
  const id = m.selectedOptionId || comp.topId;
  return m.options.find((o) => o.id === id) || null;
}

function allPicks() {
  return state.modules.map((m) => ({ m, opt: selectedOption(m) }));
}

// Adapter cost incurred by `opt` against the other selected picks.
function adapterCostFor(m, opt, picks) {
  if (!opt || !opt.attributes || !opt.attributes.fits) return 0;
  let cost = 0;
  picks.forEach((p) => {
    if (p.m.id === m.id || !p.opt) return;
    if (opt.attributes.fits[p.opt.id] === 'adapter') cost += Number(state.config.adapterCost) || 0;
  });
  return cost;
}

function effectiveCost(m, opt, picks) {
  return (opt ? Number(opt.price) || 0 : 0) + adapterCostFor(m, opt, picks);
}

// Fit between two options: 'native' | 'adapter' | null (incompatible / undefined relation)
function pairFit(a, b) {
  if (a.attributes && a.attributes.fits && a.attributes.fits[b.id]) return a.attributes.fits[b.id];
  if (b.attributes && b.attributes.fits && b.attributes.fits[a.id]) return b.attributes.fits[a.id];
  return null;
}
// Does option `a` declare any fit relation toward options of moduleB?
function relatesTo(a, moduleB) {
  if (!a.attributes || !a.attributes.fits) return false;
  return moduleB.options.some((o) => a.attributes.fits[o.id]);
}
function fitsInModule(a, moduleB) {
  if (!a.attributes || !a.attributes.fits) return [];
  return moduleB.options.filter((o) => a.attributes.fits[o.id]);
}

function compatibilityFlags() {
  const flags = [];
  const picks = allPicks();
  const mods = state.modules;

  // Pairwise compatibility between selected picks.
  for (let i = 0; i < mods.length; i++) {
    for (let j = i + 1; j < mods.length; j++) {
      const A = picks[i], B = picks[j];
      if (!A.opt || !B.opt) continue;
      if (!relatesTo(A.opt, B.m) && !relatesTo(B.opt, A.m)) continue; // not a compat dimension
      const fit = pairFit(A.opt, B.opt);
      if (fit === 'native') {
        flags.push({ k: 'good', t: `${A.opt.name} clicks into ${B.opt.name} natively (no adapter).` });
      } else if (fit === 'adapter') {
        flags.push({ k: 'warn', t: `${A.opt.name} + ${B.opt.name}: requires an adapter (+${money(state.config.adapterCost)}).` });
      } else {
        flags.push({ k: 'bad', t: `Conflict: ${A.opt.name} is not compatible with ${B.opt.name}.` });
      }
    }
  }

  // "Fits only one / none" for each selected pick that declares fits over another module.
  picks.forEach((P) => {
    if (!P.opt) return;
    state.modules.forEach((other) => {
      if (other.id === P.m.id) return;
      if (!relatesTo(P.opt, other) || other.options.length < 2) return;
      const list = fitsInModule(P.opt, other);
      if (list.length === 0) {
        flags.push({ k: 'bad', t: `${P.opt.name} fits none of your ${other.label.toLowerCase()} options.` });
      } else if (list.length === 1) {
        flags.push({ k: 'warn', t: `${P.opt.name} fits only one ${other.label.toLowerCase()} you're considering: ${list[0].name}.` });
      }
    });
  });

  // carrierLbVerify reminders on selected picks.
  picks.forEach((P) => {
    if (P.opt && P.opt.attributes && P.opt.attributes.carrierLbVerify) {
      flags.push({ k: 'warn', t: `Verify ${P.opt.name} carrier weight (${P.opt.attributes.carrierLb ?? '?'} lb) before relying on it.` });
    }
  });

  if (flags.length === 0) flags.push({ k: 'good', t: 'No compatibility issues detected.' });
  return flags;
}

/* ---------------- Rendering: full ---------------- */

function renderAll() {
  el('overall-budget').value = state.config.overallBudget ?? 0;
  renderModules();
  renderInventory();
  renderDashboard();
}

function renderModules() {
  const host = el('modules');
  host.innerHTML = '<h2 style="margin:0 0 .25rem">Category Modules</h2>' +
    state.modules.map(renderModule).join('') +
    `<div style="margin-top:.75rem"><button class="btn" data-action="add-module">+ Add category module</button></div>`;
}

function renderModule(m) {
  const comp = computeModule(m);
  const colspan = 2 + m.criteria.length + 3;

  const head = m.criteria.map((c) => `
    <th class="crit-head">
      <span data-clabelhead="${c.id}">${esc(c.label)}</span>
      <span class="wt">×<span data-wthead="${c.id}">${c.weight}</span></span>
    </th>`).join('');

  const critEditor = m.criteria.map((c) => `
    <span class="crit-chip">
      <input class="crit-label" data-action="crit-label" data-mod="${m.id}" data-crit="${c.id}" value="${esc(c.label)}" />
      <span>×</span>
      <input type="number" class="crit-weight" min="1" max="5" data-action="crit-weight" data-mod="${m.id}" data-crit="${c.id}" value="${c.weight}" />
      <button class="del" title="Remove criterion" data-action="del-crit" data-mod="${m.id}" data-crit="${c.id}">×</button>
    </span>`).join('');

  const rows = m.options.map((o) => {
    const p = comp.per[o.id] || { wt: 0, pct: 0 };
    const scoreCells = m.criteria.map((c) => `
      <td><input type="number" class="score-input" min="1" max="5" step="1"
                 data-action="score" data-opt="${o.id}" data-crit="${c.id}"
                 value="${o.scores[c.id] ?? ''}" /></td>`).join('');

    return `
      <tr data-optrow="${o.id}" class="${o.id === comp.topId ? 'top-pick' : ''}">
        <td class="opt-name"><input class="name-input" data-action="opt-name" data-opt="${o.id}" value="${esc(o.name)}" /></td>
        <td class="num-cell"><input type="number" min="0" step="10" data-action="opt-price" data-opt="${o.id}" value="${o.price ?? 0}" /></td>
        ${scoreCells}
        <td class="wt-cell"><span data-wt="${o.id}">${p.wt}</span></td>
        <td><span class="pct" data-pct="${o.id}">${Math.round(p.pct * 100)}%</span></td>
        <td><button class="del-row" title="Delete option" data-action="del-option" data-opt="${o.id}">🗑</button></td>
      </tr>
      <tr class="notes-row">
        <td colspan="${colspan}">
          ${renderAttrLine(o)}
          ${renderCompatEditor(m, o)}
          <textarea data-action="opt-notes" data-opt="${o.id}" placeholder="Notes…">${esc(o.notes || '')}</textarea>
        </td>
      </tr>`;
  }).join('');

  return `
  <div class="panel module">
    <div class="module-head">
      <div>
        <h2>${esc(m.label)}</h2>
        <div class="meta">
          <label>Budget $ <input type="number" min="0" step="10" data-action="mod-budget" data-mod="${m.id}" value="${m.budget ?? 0}" style="width:90px" /></label>
          <span>Max score: <strong><span data-maxhead="${m.id}">${comp.max}</span></strong></span>
        </div>
      </div>
      <button class="btn btn-mini btn-danger" data-action="del-module" data-mod="${m.id}">Delete module</button>
    </div>

    <div class="crit-editor">${critEditor}
      <button class="btn btn-mini" data-action="add-crit" data-mod="${m.id}">+ criterion</button>
    </div>

    <div class="table-wrap">
      <table class="score-table">
        <thead>
          <tr>
            <th class="opt-name">Option</th>
            <th>Price</th>
            ${head}
            <th>Weighted</th>
            <th>%</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="${colspan}" style="color:var(--muted)">No options yet.</td></tr>`}</tbody>
      </table>
    </div>

    <div class="module-actions">
      <button class="btn btn-mini" data-action="add-option" data-mod="${m.id}">+ Add option</button>
    </div>
  </div>`;
}

function renderAttrLine(o) {
  const a = o.attributes || {};
  const bits = [];
  if (a.brand) bits.push(esc(a.brand));
  if (a.type) bits.push(esc(a.type));
  if (a.carrierLb != null) {
    bits.push(`carrier ${esc(a.carrierLb)} lb${a.carrierLbVerify ? ' <span class="verify">⚠ verify</span>' : ''}`);
  }
  return bits.length ? `<div class="attr-line">${bits.join(' · ')}</div>` : '';
}

function renderCompatEditor(m, o) {
  const others = state.modules.filter((x) => x.id !== m.id);
  const fits = (o.attributes && o.attributes.fits) || {};
  const hasCarrier = o.attributes && o.attributes.carrierLb != null;

  let compatHtml = others.map((other) => {
    if (other.options.length === 0) return '';
    const items = other.options.map((t) => `
      <span class="compat-item">
        <label>${esc(t.name)}</label>
        <select data-action="compat" data-opt="${o.id}" data-target="${t.id}">
          <option value="" ${!fits[t.id] ? 'selected' : ''}>—</option>
          <option value="native" ${fits[t.id] === 'native' ? 'selected' : ''}>native</option>
          <option value="adapter" ${fits[t.id] === 'adapter' ? 'selected' : ''}>adapter</option>
        </select>
      </span>`).join('');
    return `<div><div class="attr-line">Fits with ${esc(other.label)}:</div><div class="compat-grid">${items}</div></div>`;
  }).join('');

  const attrEditor = hasCarrier ? `
    <div class="compat-grid" style="margin-top:.5rem">
      <span class="compat-item">
        <label>Carrier lb</label>
        <input type="number" step="0.1" style="width:64px" data-action="attr-carrierlb" data-opt="${o.id}" value="${o.attributes.carrierLb}" />
      </span>
      <span class="compat-item">
        <label><input type="checkbox" data-action="attr-verify" data-opt="${o.id}" ${o.attributes.carrierLbVerify ? 'checked' : ''} /> needs verify</label>
      </span>
    </div>` : '';

  if (!compatHtml && !attrEditor) return '';
  return `<details class="compat"><summary>Attributes & compatibility</summary>${compatHtml}${attrEditor}</details>`;
}

function renderInventory() {
  const host = el('inventory-section');
  const rows = state.inventory.map((it) => {
    const modOpts = state.modules.map((m) =>
      `<option value="${m.id}" ${m.id === it.moduleId ? 'selected' : ''}>${esc(m.label)}</option>`).join('');
    return `
      <tr>
        <td><input type="text" style="width:100%" data-action="inv-name" data-inv="${it.id}" value="${esc(it.name)}" /></td>
        <td><select data-action="inv-module" data-inv="${it.id}"><option value="">—</option>${modOpts}</select></td>
        <td>
          <select class="status status-${esc(it.status)}" data-action="inv-status" data-inv="${it.id}">
            <option value="keep" ${it.status === 'keep' ? 'selected' : ''}>keep</option>
            <option value="return" ${it.status === 'return' ? 'selected' : ''}>return</option>
            <option value="undecided" ${it.status === 'undecided' ? 'selected' : ''}>undecided</option>
          </select>
        </td>
        <td class="num-cell"><input type="number" min="0" step="10" style="width:90px" data-action="inv-refund" data-inv="${it.id}" value="${it.refund ?? 0}" /></td>
        <td><input type="text" style="width:100%" data-action="inv-notes" data-inv="${it.id}" value="${esc(it.notes || '')}" /></td>
        <td><button class="del-row" data-action="del-inv" data-inv="${it.id}">🗑</button></td>
      </tr>`;
  }).join('');

  host.innerHTML = `
  <div class="panel">
    <div class="module-head"><h2>Inventory — Keep / Return</h2></div>
    <div class="table-wrap">
      <table class="inv-table">
        <thead><tr><th>Item</th><th>Category</th><th>Status</th><th class="num-cell">Refund</th><th>Notes</th><th></th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6" style="color:var(--muted)">No inventory items.</td></tr>'}</tbody>
      </table>
    </div>
    <div class="module-actions"><button class="btn btn-mini" data-action="add-inv">+ Add inventory item</button></div>
  </div>`;
}

/* ---------------- Rendering: dashboard ---------------- */

function renderDashboard() {
  const picks = allPicks();

  // 1. Top pick per category
  const topPicks = state.modules.map((m) => {
    const comp = computeModule(m);
    const top = m.options.find((o) => o.id === comp.topId);
    const sel = selectedOption(m);
    if (!top) return `<div class="pick-row"><span class="pick-name">${esc(m.label)}</span><span class="pick-meta">no options</span></div>`;
    const p = comp.per[top.id];
    const overrideNote = sel && sel.id !== top.id ? ` <span class="pick-meta">(you selected ${esc(sel.name)})</span>` : '';
    return `
      <div class="pick-row">
        <span><span class="pick-name">${esc(top.name)}</span> <span class="pick-meta">${esc(m.label)}</span>${overrideNote}</span>
        <span class="pick-score">${p.wt}/${comp.max} · <strong>${Math.round(p.pct * 100)}%</strong></span>
      </div>`;
  }).join('');

  // 2. Total cost vs budget
  let total = 0;
  const costLines = picks.map(({ m, opt }) => {
    const comp = computeModule(m);
    const base = opt ? Number(opt.price) || 0 : 0;
    const adapter = adapterCostFor(m, opt, picks);
    const eff = base + adapter;
    total += eff;
    const over = (Number(m.budget) || 0) > 0 && eff > (Number(m.budget) || 0);
    const selOpts = m.options.map((o) =>
      `<option value="${o.id}" ${ (m.selectedOptionId || comp.topId) === o.id ? 'selected' : ''}>${esc(o.name)}</option>`).join('');
    return `
      <div class="cost-line">
        <span class="pick-select">
          <strong>${esc(m.label)}</strong>:
          <select data-action="select-pick" data-mod="${m.id}">
            <option value="">Auto (top pick)</option>${selOpts}
          </select>
        </span>
        <span class="num">
          ${money(base)}${adapter ? ` <span class="pick-meta">+${money(adapter)} adapter</span>` : ''}
          = <strong>${money(eff)}</strong>
          ${Number(m.budget) ? ` <span class="pill ${over ? 'pill-over' : 'pill-under'}">budget ${money(m.budget)}</span>` : ''}
        </span>
      </div>`;
  }).join('');
  const ob = Number(state.config.overallBudget) || 0;
  const overAll = ob > 0 && total > ob;

  // 3. Compatibility flags
  const flags = compatibilityFlags().map((f) =>
    `<div class="flag flag-${f.k}"><span class="flag-icon">${f.k === 'good' ? '✓' : f.k === 'warn' ? '⚠' : '⛔'}</span><span>${esc(f.t)}</span></div>`).join('');

  // 4. Keep/return + net spend
  const inv = state.inventory;
  const refundReturn = inv.filter((i) => i.status === 'return').reduce((s, i) => s + (Number(i.refund) || 0), 0);
  const refundUndecided = inv.filter((i) => i.status === 'undecided').reduce((s, i) => s + (Number(i.refund) || 0), 0);
  const counts = { keep: 0, return: 0, undecided: 0 };
  inv.forEach((i) => { counts[i.status] = (counts[i.status] || 0) + 1; });
  const net = total - refundReturn;

  el('dashboard').innerHTML = `
    <div class="panel"><h2 style="margin-bottom:.75rem">📊 Main Summary Dashboard</h2>
      <div class="dash-grid">

        <div class="dash-card">
          <h2>🏆 Top pick per category</h2>
          ${topPicks || '<span class="pick-meta">No modules yet.</span>'}
        </div>

        <div class="dash-card">
          <h2>💰 Total cost vs. budget</h2>
          ${costLines || '<span class="pick-meta">No modules yet.</span>'}
          <div class="cost-line cost-total">
            <span>Total (selected picks)</span>
            <span class="num">${money(total)}${ob ? ` <span class="pill ${overAll ? 'pill-over' : 'pill-under'}">of ${money(ob)}${overAll ? ` · over by ${money(total - ob)}` : ` · ${money(ob - total)} left`}</span>` : ''}</span>
          </div>
        </div>

        <div class="dash-card">
          <h2>🔌 Compatibility flags</h2>
          ${flags}
        </div>

        <div class="dash-card">
          <h2>📦 Keep / return</h2>
          <div class="netspend">
            <div class="cost-line"><span>Items</span><span class="num"><span class="status-keep">${counts.keep} keep</span> · <span class="status-return">${counts.return} return</span> · <span class="status-undecided">${counts.undecided} undecided</span></span></div>
            <div class="cost-line"><span>New purchases (selected picks)</span><span class="num">${money(total)}</span></div>
            <div class="cost-line"><span>Refunds (returning)</span><span class="num">−${money(refundReturn)}</span></div>
            <div class="cost-line cost-total"><span>Net spend</span><span class="num">${money(net)}</span></div>
            ${refundUndecided ? `<div class="pick-meta">+${money(refundUndecided)} more recoverable if undecided items are returned.</div>` : ''}
          </div>
        </div>

      </div>
    </div>`;
}

/* ---------------- Targeted recompute (no focus loss) ---------------- */

function updateComputed() {
  state.modules.forEach((m) => {
    const comp = computeModule(m);
    const maxHead = $(`[data-maxhead="${m.id}"]`);
    if (maxHead) maxHead.textContent = comp.max;
    m.criteria.forEach((c) => {
      const wh = $(`[data-wthead="${c.id}"]`); if (wh) wh.textContent = c.weight;
      const lh = $(`[data-clabelhead="${c.id}"]`); if (lh) lh.textContent = c.label;
    });
    m.options.forEach((o) => {
      const p = comp.per[o.id] || { wt: 0, pct: 0 };
      const wt = $(`[data-wt="${o.id}"]`); if (wt) wt.textContent = p.wt;
      const pct = $(`[data-pct="${o.id}"]`); if (pct) pct.textContent = Math.round(p.pct * 100) + '%';
      const row = $(`[data-optrow="${o.id}"]`); if (row) row.classList.toggle('top-pick', o.id === comp.topId);
    });
  });
  renderDashboard();
}

/* ---------------- Mutations / event handling ---------------- */

const findModule = (id) => state.modules.find((m) => m.id === id);
const findOption = (id) => { for (const m of state.modules) { const o = m.options.find((x) => x.id === id); if (o) return o; } return null; };
const findInv = (id) => state.inventory.find((i) => i.id === id);
const moduleOf = (optId) => state.modules.find((m) => m.options.some((o) => o.id === optId));

function onInput(e) {
  const t = e.target, a = t.dataset.action;
  if (!a) return;
  switch (a) {
    case 'score': {
      const o = findOption(t.dataset.opt);
      o.scores[t.dataset.crit] = t.value === '' ? '' : clamp(Math.round(Number(t.value)), 1, 5);
      break;
    }
    case 'opt-name':   findOption(t.dataset.opt).name = t.value; break;
    case 'opt-price':  findOption(t.dataset.opt).price = Number(t.value) || 0; break;
    case 'opt-notes':  findOption(t.dataset.opt).notes = t.value; break;
    case 'crit-label': findCrit(t.dataset.mod, t.dataset.crit).label = t.value; break;
    case 'crit-weight': findCrit(t.dataset.mod, t.dataset.crit).weight = clamp(Math.round(Number(t.value) || 0), 1, 5); break;
    case 'mod-budget': findModule(t.dataset.mod).budget = Number(t.value) || 0; break;
    case 'attr-carrierlb': ensureAttrs(findOption(t.dataset.opt)).carrierLb = Number(t.value) || 0; break;
    case 'inv-name':   findInv(t.dataset.inv).name = t.value; break;
    case 'inv-refund': findInv(t.dataset.inv).refund = Number(t.value) || 0; break;
    case 'inv-notes':  findInv(t.dataset.inv).notes = t.value; break;
    case 'overall-budget': break; // handled separately below
    default: return;
  }
  updateComputed();
  save();
}

function onOverallBudget(e) {
  state.config.overallBudget = Number(e.target.value) || 0;
  updateComputed();
  save();
}

function onChange(e) {
  const t = e.target, a = t.dataset.action;
  if (!a) return;
  switch (a) {
    case 'compat': {
      const o = findOption(t.dataset.opt);
      const fits = ensureAttrs(o).fits || (o.attributes.fits = {});
      if (t.value) fits[t.dataset.target] = t.value; else delete fits[t.dataset.target];
      updateComputed(); save(); break;
    }
    case 'select-pick': {
      findModule(t.dataset.mod).selectedOptionId = t.value || null;
      updateComputed(); save(); break;
    }
    case 'inv-module': findInv(t.dataset.inv).moduleId = t.value; updateComputed(); save(); break;
    case 'inv-status': findInv(t.dataset.inv).status = t.value; renderInventory(); renderDashboard(); save(); break;
    case 'attr-verify': ensureAttrs(findOption(t.dataset.opt)).carrierLbVerify = t.checked; renderModules(); renderDashboard(); save(); break;
    default: return;
  }
}

function onClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const a = btn.dataset.action;
  switch (a) {
    case 'add-option': addOption(btn.dataset.mod); break;
    case 'del-option': delOption(btn.dataset.opt); break;
    case 'add-crit':   addCriterion(btn.dataset.mod); break;
    case 'del-crit':   delCriterion(btn.dataset.mod, btn.dataset.crit); break;
    case 'add-module': addModule(); break;
    case 'del-module': delModule(btn.dataset.mod); break;
    case 'add-inv':    addInventory(); break;
    case 'del-inv':    delInventory(btn.dataset.inv); break;
    default: return;
  }
}

function findCrit(modId, critId) { return findModule(modId).criteria.find((c) => c.id === critId); }
function ensureAttrs(o) { if (!o.attributes) o.attributes = {}; return o.attributes; }

function addOption(modId) {
  const m = findModule(modId);
  const scores = {};
  m.criteria.forEach((c) => { scores[c.id] = 3; });
  m.options.push({ id: uid('o'), moduleId: m.id, name: 'New option', price: 0, attributes: {}, scores, notes: '' });
  renderAll(); save();
}
function delOption(optId) {
  const m = moduleOf(optId);
  m.options = m.options.filter((o) => o.id !== optId);
  if (m.selectedOptionId === optId) m.selectedOptionId = null;
  // Clean up any fits references to this option.
  state.modules.forEach((mm) => mm.options.forEach((o) => { if (o.attributes && o.attributes.fits) delete o.attributes.fits[optId]; }));
  renderAll(); save();
}
function addCriterion(modId) {
  const m = findModule(modId);
  const c = { id: uid('c'), label: 'New criterion', weight: 3 };
  m.criteria.push(c);
  m.options.forEach((o) => { o.scores[c.id] = 3; });
  renderAll(); save();
}
function delCriterion(modId, critId) {
  const m = findModule(modId);
  m.criteria = m.criteria.filter((c) => c.id !== critId);
  m.options.forEach((o) => delete o.scores[critId]);
  renderAll(); save();
}
function addModule() {
  state.modules.push({
    id: uid('m'), label: 'New Category', budget: 0, selectedOptionId: null,
    criteria: [{ id: uid('c'), label: 'Criterion 1', weight: 3 }], options: []
  });
  renderAll(); save();
}
function delModule(modId) {
  if (!confirm('Delete this entire category module?')) return;
  state.modules = state.modules.filter((m) => m.id !== modId);
  renderAll(); save();
}
function addInventory() {
  state.inventory.push({ id: uid('i'), name: 'New item', moduleId: state.modules[0] ? state.modules[0].id : '', status: 'undecided', refund: 0, notes: '' });
  renderInventory(); renderDashboard(); save();
}
function delInventory(invId) {
  state.inventory = state.inventory.filter((i) => i.id !== invId);
  renderInventory(); renderDashboard(); save();
}

/* ---------------- Import / export / reset ---------------- */

function exportJSON() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `baby-gear-trade-study-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data.modules || !data.config) throw new Error('Missing modules/config');
      state = data;
      renderAll(); save();
      setStatus('Imported ✓');
    } catch (err) {
      alert('Import failed: ' + err.message);
    }
  };
  reader.readAsText(file);
}

async function resetToSeed() {
  if (!confirm('Reset all data back to the seed file? This discards your edits.')) return;
  try {
    const r = await fetch('/api/reset', { method: 'POST' });
    state = await r.json();
  } catch (e) {
    const r = await fetch('/api/seed'); state = await r.json();
  }
  localStorage.removeItem('babygear-state');
  renderAll(); save();
  setStatus('Reset to seed ✓');
}

/* ---------------- Boot ---------------- */

async function init() {
  await loadState();
  renderAll();
  setStatus('Loaded');

  const app = el('app');
  app.addEventListener('input', onInput);
  app.addEventListener('change', onChange);
  app.addEventListener('click', onClick);

  el('overall-budget').addEventListener('input', onOverallBudget);
  el('btn-export').addEventListener('click', exportJSON);
  el('btn-import').addEventListener('click', () => el('import-file').click());
  el('import-file').addEventListener('change', (e) => { if (e.target.files[0]) importJSON(e.target.files[0]); });
  el('btn-reset').addEventListener('click', resetToSeed);
}

document.addEventListener('DOMContentLoaded', init);
