// Generates the STATIC design-study HTML: runs the mockup-rendering logic here
// in Node and bakes the result straight into the markup, so the file renders
// fully populated in any viewer (no client-side <script> required).
import { readFileSync, writeFileSync } from 'node:fs';

//====================== REAL DATA (from src/data/seed.json) ======================
const CRIT = [
  {id:"fit",          label:"Vehicle rear-facing fit",      w:5},
  {id:"weight",       label:"Carrier weight",               w:4},
  {id:"compat",       label:"Stroller compatibility",       w:3},
  {id:"safety",       label:"Safety extras",                w:2},
  {id:"growthheight", label:"Outgrow-by-height (headroom)", w:4},
  {id:"growthweight", label:"Weight capacity",              w:2},
  {id:"growthlongevity",label:"Infant→toddler longevity",   w:3},
  {id:"price",        label:"Price",                        w:1},
];
const OPTS = [
  {name:"Nuna Pipa Aire RX",        price:650,   carrierLb:6.2, foot:27.25, maxH:30, maxW:30, way:true,  todd:false, s:{fit:4,weight:5,compat:5,safety:5,price:1,growthheight:2,growthweight:3,growthlongevity:2}},
  {name:"Cybex Aton G Swivel",      price:499.95,carrierLb:9,   foot:26.1,  maxH:32, maxW:35, way:true,  todd:false, s:{fit:5,weight:4,compat:5,safety:5,price:2,growthheight:4,growthweight:5,growthlongevity:4}},
  {name:"Graco SnugRide 35 Lite LX",price:139.99,carrierLb:7.2, foot:26,    maxH:32, maxW:35, way:false, todd:false, s:{fit:4,weight:5,compat:3,safety:3,price:5,growthheight:4,growthweight:5,growthlongevity:4}},
  {name:"Chicco KeyFit 35",         price:229.99,carrierLb:10,  foot:27.5,  maxH:32, maxW:35, way:false, todd:false, s:{fit:5,weight:3,compat:3,safety:4,price:4,growthheight:4,growthweight:5,growthlongevity:4}},
  {name:"Britax B-Safe Gen2",       price:230,   carrierLb:10.9,foot:26.6,  maxH:32, maxW:35, way:false, todd:false, s:{fit:3,weight:2,compat:3,safety:4,price:4,growthheight:4,growthweight:5,growthlongevity:4}},
  {name:"Diono LiteClik 30",        price:250,   carrierLb:9,   foot:26.4,  maxH:30, maxW:30, way:false, todd:false, s:{fit:4,weight:4,compat:3,safety:4,price:4,growthheight:2,growthweight:3,growthlongevity:2}},
  {name:"Maxi-Cosi Mico Luxe",      price:239,   carrierLb:9,   foot:28.9,  maxH:32, maxW:30, way:true,  todd:false, s:{fit:4,weight:4,compat:5,safety:3,price:4,growthheight:4,growthweight:3,growthlongevity:3}},
  {name:"Britax Willow Brook S+",   price:380,   carrierLb:9.3, foot:28.1,  maxH:32, maxW:30, way:true,  todd:false, s:{fit:3,weight:3,compat:5,safety:4,price:2,growthheight:4,growthweight:3,growthlongevity:3}},
  {name:"Graco SnugFit 35 DLX",     price:239.99,carrierLb:10,  foot:29,    maxH:32, maxW:35, way:false, todd:false, s:{fit:3,weight:3,compat:3,safety:4,price:4,growthheight:4,growthweight:5,growthlongevity:4}},
  {name:"Chicco Fit2 (2-Year)",     price:329.99,carrierLb:12.3,foot:28,    maxH:35, maxW:35, way:false, todd:true,  s:{fit:2,weight:1,compat:3,safety:4,price:3,growthheight:5,growthweight:5,growthlongevity:5}},
  {name:"UPPAbaby Mesa V3",         price:349.99,carrierLb:9.9, foot:25.8,  maxH:32, maxW:30, way:false, todd:false, s:{fit:3,weight:3,compat:3,safety:4,price:3,growthheight:4,growthweight:3,growthlongevity:3}},
  {name:"Peg Perego 4-35 Nido",     price:359,   carrierLb:10,  foot:26,    maxH:32, maxW:30, way:false, todd:false, s:{fit:3,weight:3,compat:3,safety:5,price:3,growthheight:4,growthweight:3,growthlongevity:3}},
  {name:"Clek Liing",               price:499.99,carrierLb:9,   foot:null,  maxH:32, maxW:30, way:false, todd:false, s:{fit:5,weight:4,compat:1,safety:5,price:2,growthheight:4,growthweight:3,growthlongevity:3}},
  {name:"Cybex Cloud G Lux",        price:499.95,carrierLb:11,  foot:26.5,  maxH:32, maxW:35, way:false, todd:false, s:{fit:2,weight:2,compat:1,safety:5,price:2,growthheight:4,growthweight:5,growthlongevity:4}},
  {name:"Doona Car Seat & Stroller",price:650,   carrierLb:16.5,foot:26,    maxH:32, maxW:30, way:false, todd:false, s:{fit:2,weight:1,compat:1,safety:4,price:1,growthheight:4,growthweight:3,growthlongevity:3}},
];
const PERSONA = { backSeat:28, budget:500, ownsWayfinder:true };
const FOCAL = OPTS[0];

const METRICS = {
  carrierLb:{label:"Carrier weight", unit:"lb", dir:-1},
  foot:{label:"Rear-facing footprint", unit:"in", dir:-1, thr:PERSONA.backSeat, thrLabel:"your back seat 28″"},
  maxH:{label:"Outgrow height", unit:"in", dir:+1},
  maxW:{label:"Weight capacity", unit:"lb", dir:+1},
  price:{label:"Best price", unit:"$", dir:-1, money:true, thr:PERSONA.budget, thrLabel:"budget $500"},
};
const range = (key)=>{const v=OPTS.map(o=>o[key]).filter(x=>x!=null);return [Math.min(...v),Math.max(...v)];};
const pct = (v,[mn,mx])=> mx===mn?50:((v-mn)/(mx-mn))*100;
const money = n=>"$"+(Math.round(n*100)/100).toLocaleString();
const rank = (o,key,dir)=>{const v=OPTS.map(x=>x[key]).filter(x=>x!=null).sort((a,b)=>dir<0?a-b:b-a);return v.indexOf(o[key])+1;};

const EVIDENCE = {
  fit:        o=> o.foot==null ? {txt:"n/a", key:null} : {txt:o.foot+" in footprint", key:"foot"},
  weight:     o=> ({txt:o.carrierLb+" lb carrier", key:"carrierLb"}),
  compat:     o=> ({txt:(o.way?"fits BOB Wayfinder ✓":"no Wayfinder fit ✗"), key:null, good:o.way}),
  safety:     o=> ({txt:"load-leg / anti-rebound tier", key:null}),
  growthheight:o=> ({txt:"fits to "+o.maxH+" in tall", key:"maxH"}),
  growthweight:o=> ({txt:"up to "+o.maxW+" lb", key:"maxW"}),
  growthlongevity:o=> ({txt:(o.todd?"rear-faces into toddlerhood":"infant bucket only"), key:null, good:o.todd}),
  price:      o=> ({txt:money(o.price), key:"price"}),
};

//====================== render helpers ======================
function conceptShell(n,title,tag,why,stage,pros,cons){
  return `<section class="concept">
    <header><div><h3>${n}. ${title}</h3><p class="why">${why}</p></div><span class="tag">${tag}</span></header>
    <div class="stage">${stage}</div>
    <div class="note">${pros.map(p=>`<div class="pro">${p}</div>`).join("")}${cons.map(p=>`<div class="con">${p}</div>`).join("")}</div>
  </section>`;
}

//====================== PART 1 ======================
let concepts = "";

// ---- Concept 1: Anchored value rows ----
{
  const rows = ["fit","weight","compat","growthheight","growthlongevity","price"].map(cid=>{
    const crit = CRIT.find(c=>c.id===cid);
    const ev = EVIDENCE[cid](FOCAL);
    const score = FOCAL.s[cid];
    let strip = "";
    if(ev.key){
      const m = METRICS[ev.key]; const rg = range(ev.key);
      const p = pct(FOCAL[ev.key], rg);
      const goodLeft = m.dir<0;
      const gz = goodLeft ? `left:0;width:${p}%` : `left:${p}%;right:0`;
      const dots = OPTS.filter(o=>o[ev.key]!=null).map(o=>`<span class="dot" style="left:${pct(o[ev.key],rg)}%"></span>`).join("");
      const thr = m.thr!=null ? `<span class="thr" style="left:${pct(m.thr,rg)}%"></span>` : "";
      const thrLab = m.thr!=null ? `<span class="thrlab">▲ ${m.thrLabel}</span>` : "<span></span>";
      strip = `<div class="track"><span class="goodzone" style="${gz}"></span>${dots}${thr}<span class="mark" style="left:${p}%"></span></div>
        <div class="ends"><span>${m.money?money(rg[0]):rg[0]+m.unit} ·  best</span>${thrLab}<span>worst  · ${m.money?money(rg[1]):rg[1]+m.unit}</span></div>`;
    } else {
      strip = `<div class="ends" style="margin-top:6px"><span style="color:${ev.good===false?'var(--bad)':ev.good?'var(--good)':'var(--mut)'}">${ev.good===false?'does not meet your stroller':ev.good?'meets your stroller':'qualitative — see notes'}</span></div>`;
    }
    return `<div class="arow">
      <div class="lab"><span class="crit">${crit.label} <span class="w">· weight ×${crit.w}</span></span>
        <span class="val">${ev.txt}<small>rates ${score}/5</small></span></div>
      ${strip}
    </div>`;
  }).join("");
  const stage = `<div class="device"><div class="topbar"><i></i><i></i><i></i></div>
    <div class="screen">
      <div class="prodhead"><div class="thumb">🍼</div>
        <div><div class="nm">Nuna Pipa Aire RX</div><div class="sub">Infant Car Seat · best price $650 at Nuna</div></div></div>
      ${rows}
    </div></div>`;
  concepts += conceptShell(1,"Anchored Value Rows","recommended · EnergyGuide",
    "Each requirement leads with its literal measurement; a strip places that value on the cohort’s full range, tints the “good” end, plots the other 14 seats as ghost dots, and marks <b>your</b> threshold (back-seat 28″, budget $500). The 0–5 score survives only as a faint trailing tag.",
    stage,
    ["The value evaluates itself — position on the range <i>is</i> the judgment, no trust required",
     "Personal threshold line answers “compared to <b>my</b> car?” directly",
     "Score is present for continuity but visibly subordinate"],
    ["Taller per row — ~6 criteria is the comfortable ceiling on a phone",
     "Qualitative criteria (safety) fall back to text — no strip to anchor them"]);
}

// ---- Concept 2: Comparison matrix ----
{
  const cols = [
    {k:"price", h:"Price", f:o=>money(o.price), dir:-1, num:o=>o.price},
    {k:"carrierLb", h:"Carrier", f:o=>o.carrierLb+"♯", dir:-1, num:o=>o.carrierLb},
    {k:"foot", h:"Footprint", f:o=>o.foot==null?"—":o.foot+"″", dir:-1, num:o=>o.foot, fail:o=>o.foot!=null&&o.foot>PERSONA.backSeat},
    {k:"maxH", h:"Outgrow", f:o=>o.maxH+"″", dir:+1, num:o=>o.maxH},
    {k:"maxW", h:"Max lb", f:o=>o.maxW, dir:+1, num:o=>o.maxW},
    {k:"way", h:"Wayfinder", f:o=>o.way?"✓":"✗", dir:0, fail:o=>!o.way},
  ];
  const best = {};
  cols.forEach(c=>{ if(c.dir){ const vals=OPTS.map(c.num).filter(x=>x!=null); best[c.k]= c.dir<0?Math.min(...vals):Math.max(...vals);}});
  const head = `<tr><th class="optname">Option (15)</th>${cols.map(c=>`<th>${c.h}</th>`).join("")}<th>Match</th></tr>`;
  const rows = OPTS.map(o=>{
    const focus = o===FOCAL?"focus":"";
    const cells = cols.map(c=>{
      let cls="";
      if(c.dir && c.num(o)===best[c.k]) cls="heat0";
      if(c.fail && c.fail(o)) cls="fail";
      return `<td class="${cls.includes('fail')?'fail':''}"><span class="cell ${cls.replace('fail','')}">${c.f(o)}</span></td>`;
    }).join("");
    const tot = CRIT.reduce((s,c)=>s+c.w*o.s[c.id],0);
    return `<tr class="${focus}"><td class="optname">${o.name}</td>${cells}<td class="num" style="color:var(--acc);font-weight:600">${tot}</td></tr>`;
  }).join("");
  const stage = `<div class="mxwrap"><table class="mx"><thead>${head}</thead><tbody>${rows}</tbody></table></div>`;
  concepts += conceptShell(2,"Comparison Matrix","small multiples",
    "Tufte’s “tables beat graphics under ~20 numbers.” Every option is a row, every spec a real-unit column, best-in-column subtly heat-shaded, values that violate the persona’s limits flagged red. The focal product is just the highlighted row — detail and comparison in one eyespan.",
    stage,
    ["Highest data density; “compared to what” is the whole object",
     "Best-in-column shading guides the eye with no derived score column",
     "Reuses the data already in ModuleView — low build cost"],
    ["15 rows × 8 cols is wide — needs horizontal scroll / sticky first column on mobile",
     "Less “product page” feeling; it’s a spreadsheet, not a hero"]);
}

// ---- Concept 3: Value tiles + spark ----
{
  const keys=["price","carrierLb","foot","maxH","maxW"];
  const tiles = keys.map(k=>{
    const m=METRICS[k]; const rg=range(k); const r=rank(FOCAL,k,m.dir); const n=OPTS.filter(o=>o[k]!=null).length;
    const bins=new Array(8).fill(0); let myBin=0;
    OPTS.forEach(o=>{if(o[k]==null)return;const b=Math.min(7,Math.floor(pct(o[k],rg)/12.5));bins[b]++;if(o===FOCAL)myBin=b;});
    const mx=Math.max(...bins);
    const spark = bins.map((b,i)=>`<span class="${i===myBin?'me':''}" style="height:${(b/mx)*100}%"></span>`).join("");
    const top = r<=Math.ceil(n/3);
    const val = m.money?money(FOCAL[k]):FOCAL[k];
    return `<div class="tile">
      <div class="t-lab">${m.label}</div>
      <div class="t-val">${val}<small> ${m.money?'':m.unit}</small></div>
      <div class="t-rank"><span class="${top?'badge-good':''}">#${r} of ${n}</span> ${m.dir<0?'lowest':'highest'} ${top?'— top third':''}</div>
      <div class="spark">${spark}</div>
    </div>`;
  }).join("");
  const bt = `<div class="tile"><div class="t-lab">Your stroller</div>
    <div class="t-val ${FOCAL.way?'badge-good':'badge-bad'}" style="font-size:16px">${FOCAL.way?'Fits BOB Wayfinder':'No fit'}</div>
    <div class="t-rank">${OPTS.filter(o=>o.way).length} of 15 seats fit it</div></div>`;
  const stage = `<div class="device"><div class="topbar"><i></i><i></i><i></i></div>
    <div class="screen">
      <div class="prodhead"><div class="thumb">🍼</div><div><div class="nm">Nuna Pipa Aire RX</div><div class="sub">Infant Car Seat</div></div></div>
      <div class="tiles">${tiles}${bt}</div>
    </div></div>`;
  concepts += conceptShell(3,"Value Tiles + Distribution Spark","RTINGS / dashboard",
    "A scannable grid of tiles. Each is a big real value, a rank within the cohort (“#2 of 15 lightest”), and a word-sized histogram showing where this product sits in the field. Visual, mobile-friendly, and the score disappears entirely.",
    stage,
    ["Very glanceable; the histogram makes “where in the pack” instant",
     "Card grid maps cleanly onto the existing optionFacts() tiles",
     "No score shown at all — purest break from the opaque number"],
    ["Rank + 8-bin spark is approximate — hides exact gaps between rivals",
     "Per-tile context is cohort-only; doesn’t encode the user’s threshold as crisply as #1/#4"]);
}

// ---- Concept 4: Fit ledger ----
{
  const spare = (PERSONA.backSeat - FOCAL.foot).toFixed(2);
  const over = (FOCAL.price - PERSONA.budget);
  const rows = [
    {need:`Back seat fits ≤ <b>28 in</b>`, val:`${FOCAL.foot} in footprint`, ok:FOCAL.foot<=PERSONA.backSeat, detail:`${spare} in to spare`},
    {need:`Within budget <b>$500</b>`, val:`${money(FOCAL.price)}`, ok:FOCAL.price<=PERSONA.budget, detail: over>0?`over by ${money(over)}`:`under by ${money(-over)}`},
    {need:`Fits your <b>BOB Wayfinder</b>`, val:`${FOCAL.way?'compatible':'not compatible'}`, ok:FOCAL.way, detail: FOCAL.way?'click-in, no adapter drama':'needs adapter / no fit'},
    {need:`Light enough to carry`, val:`${FOCAL.carrierLb} lb`, ok:FOCAL.carrierLb<=8, detail:`lightest of all 15 seats`},
    {need:`Lasts past infancy`, val:`${FOCAL.todd?'to toddler':'infant only'}`, ok:FOCAL.todd, detail: FOCAL.todd?'rear-faces to ~2 yr':`outgrown by ${FOCAL.maxH}″ height`},
  ];
  const passes = rows.filter(r=>r.ok).length;
  const body = rows.map(r=>`<tr>
    <td class="need">${r.need}</td>
    <td class="arrow">→</td>
    <td class="res ${r.ok?'pass':'fail'}">${r.val} ${r.ok?'✓':'✗'}<div class="detail">${r.detail}</div></td>
  </tr>`).join("");
  const stage = `<div class="device"><div class="topbar"><i></i><i></i><i></i></div>
    <div class="screen">
      <div class="prodhead"><div class="thumb">🍼</div><div><div class="nm">Nuna Pipa Aire RX</div><div class="sub">Does it fit <b>your</b> life?</div></div></div>
      <table class="ledger"><tbody>${body}</tbody></table>
      <div class="verdict mix"><b>Meets ${passes} of 5 of your must-haves.</b> The lightest, most stroller-friendly seat that still fits the Tacoma — but it breaks your budget by $150 and is an infant-only bucket.</div>
    </div></div>`;
  concepts += conceptShell(4,"Fit Ledger — “vs. your life”","Nutrition %DV",
    "Drops the cohort entirely and anchors every value to the parent’s own constraints, like a Nutrition label’s %DV column. Each row is <i>your need → this product’s actual value → pass/fail</i>, with the real margin (“0.75 in to spare”, “over by $150”). Zero abstract scores.",
    stage,
    ["Most decision-relevant framing — speaks the user’s constraints, not ours",
     "Pass/fail falls straight out of real numbers; nothing to trust",
     "Reuses Preferences (backSeatLengthIn, budget, ownedStroller) already in the model"],
    ["Needs onboarding answers to shine; degrades to generic thresholds without them",
     "Loses the field view — you see fit, not how it ranks vs rivals"]);
}

// ---- Concept 5: Dot-plots ----
{
  const keys=["price","carrierLb","foot","maxH"];
  const strips = keys.map(k=>{
    const m=METRICS[k]; const rg=range(k);
    const pts = OPTS.filter(o=>o[k]!=null).map(o=>`<span class="pt ${o===FOCAL?'me':''}" style="left:${pct(o[k],rg)}%"></span>`).join("");
    const thr = m.thr!=null?`<span class="thr" style="left:${pct(m.thr,rg)}%"></span>`:"";
    const meVal = m.money?money(FOCAL[k]):FOCAL[k]+m.unit;
    return `<div class="dp">
      <div class="dphead"><span class="crit">${m.label} <span style="color:var(--mut)">· ${m.dir<0?'lower better':'higher better'}</span></span>
        <span class="meval">${meVal}</span></div>
      <div class="dpt"><span class="melabel" style="left:${pct(FOCAL[k],rg)}%">this seat</span>${pts}${thr}</div>
      <div class="dpends"><span>${m.money?money(rg[0]):rg[0]+m.unit}</span>${m.thr!=null?`<span style="color:var(--warn)">▲ ${m.thrLabel}</span>`:'<span></span>'}<span>${m.money?money(rg[1]):rg[1]+m.unit}</span></div>
    </div>`;
  }).join("");
  const stage = `<div class="device" style="max-width:600px"><div class="topbar"><i></i><i></i><i></i></div>
    <div class="screen">
      <div class="prodhead"><div class="thumb">🍼</div><div><div class="nm">Nuna Pipa Aire RX</div><div class="sub">Where it lands in the field of 15</div></div></div>
      ${strips}
    </div></div>`;
  concepts += conceptShell(5,"Per-Criterion Dot-Plots","Tufte dotplot",
    "The purest Tufte move: one horizontal strip per spec, all 15 seats plotted as dots by their true value, this product highlighted and labelled, the persona’s threshold marked. Reading the focal dot down the stack is the product detail — and you see the full distribution and clustering for free.",
    stage,
    ["Shows the entire field’s shape — gaps, clusters, outliers — not just a rank",
     "Exact positions; no binning, no lie factor",
     "Threshold line ties the distribution to the user’s reality"],
    ["Dots collide when seats share a value (needs jitter / stacking)",
     "More chart than most parents expect on a product page — power-user lean"]);
}

// ---- Concept 6: Decomposed bar ----
{
  const palette=["#4f46e5","#6366f1","#0ea5e9","#14b8a6","#10b981","#84cc16","#f59e0b","#ef4444"];
  function bar(o){
    const segs = CRIT.map((c,i)=>{
      const contrib=c.w*o.s[c.id]; const ev=EVIDENCE[c.id](o);
      return {w:contrib, c:palette[i], lab:c.label, val:ev.txt, sc:o.s[c.id], wt:c.w};
    });
    const tot=segs.reduce((s,x)=>s+x.w,0); const max=5*CRIT.reduce((s,c)=>s+c.w,0);
    const inner = segs.map(s=>`<span class="seg" title="${s.lab}: ${s.val} → ${s.sc}/5 × weight ${s.wt} = ${s.w} pts" style="width:${(s.w/max)*100}%;background:${s.c}">${s.w>=8?s.w:''}</span>`).join("");
    return `<div class="stackrow"><div class="nm"><span>${o.name}</span><span class="tot">${tot} / ${max} pts</span></div>
      <div class="stack">${inner}</div></div>`;
  }
  const legend = CRIT.map((c,i)=>`<span><i style="background:${palette[i]}"></i>${c.label} ×${c.w}</span>`).join("");
  const alt = OPTS[1];
  const stage = `<div class="device" style="max-width:600px"><div class="topbar"><i></i><i></i><i></i></div>
    <div class="screen">
      <p style="font-size:12px;color:var(--ink2);margin:0 0 6px">The one place a score is allowed — and it’s fully decomposed. Hover any segment for the value behind it.</p>
      ${bar(FOCAL)}
      ${bar(alt)}
      <div class="legend">${legend}</div>
    </div></div>`;
  concepts += conceptShell(6,"Decomposed Contribution Bar","honest rollup · micro+macro",
    "Keeps a single weighted total — because the score does encode the creator’s <i>preference weighting</i> that raw specs can’t — but never as a bare number. Each segment is one criterion’s weight×score contribution, hover reveals the underlying value, and stacking two products compares <i>where</i> the points come from, not just the totals.",
    stage,
    ["Macro total and micro breakdown in one object — an auditable score, not a trusted one",
     "Stacked side-by-side shows <i>why</i> Nuna≈Cybex while having opposite strengths",
     "Drop-in companion to any other concept; doesn’t replace the values"],
    ["Still leans on the 0–5 scores under the hood — inherits their subjectivity",
     "Segment widths mix weight and score; hard to read an exact spec off the bar alone"]);
}

//====================== PART 2: ANALOGIES ======================
let analogies = "";
function analogy(demo,title,from,desc,steal){
  return `<div class="analogy"><div class="demo">${demo}</div>
    <div class="text"><div class="from">${from}</div><h4>${title}</h4><p>${desc}</p><div class="steal"><b>Steal:</b> ${steal}</div></div></div>`;
}
// A EnergyGuide
{
  const rg=range("carrierLb"); const p=pct(FOCAL.carrierLb,rg);
  analogies += analogy(`<div class="eg"><div class="egtop">Carrier weight · this model</div><div class="egbig">${FOCAL.carrierLb} lb</div>
    <div class="egbar"><span class="you" style="left:${p}%"></span><span class="youlab" style="left:${p}%">this seat</span></div>
    <div class="egends"><span>${rg[0]} lb · lightest</span><span>${rg[1]} lb · heaviest</span></div>
    <div style="font-size:11px;color:var(--ink2);margin-top:6px">Compared with all 15 infant seats</div></div>`,
    "Federal EnergyGuide / EPA fuel label","Appliances · vehicles",
    "A regulated solution to the exact problem: a single product’s value is meaningless alone, so the label always plots it on the range of <i>all comparable products</i>. The number plus its position is the rating.",
    "the range strip in Concept&nbsp;1 — value-on-a-spectrum is the canonical de-opaquing device.");
}
// B Nutrition
{
  analogies += analogy(`<div class="nf"><div class="nft">Fits Your Car</div>
    <div class="nfrow"><span><b>Footprint</b> 27.25 in</span><span class="dv">97%</span></div>
    <div class="nfrow"><span><b>Budget</b> $650</span><span class="dv" style="color:var(--bad)">130%</span></div>
    <div class="nfrow"><span><b>Carry weight</b> 6.2 lb</span><span class="dv" style="color:var(--good)">62%</span></div>
    <div style="font-size:10px;color:var(--mut);margin-top:6px">% of <i>your</i> limit (28 in · $500 · 10 lb)</div></div>`,
    "Nutrition Facts — % Daily Value","Packaged food",
    "%DV solved “is 12 g a lot?” by anchoring every value to a personal reference. The raw gram is kept <i>and</i> contextualized — context without hiding the measurement.",
    "the per-user anchor in Concept&nbsp;4 — express each value as a % of the parent’s own threshold.");
}
// C RTINGS
{
  const rows=[["Carrier",FOCAL.carrierLb+" lb",100-pct(FOCAL.carrierLb,range("carrierLb")),5],
              ["Footprint",FOCAL.foot+" in",100-pct(FOCAL.foot,range("foot")),4],
              ["Outgrow",FOCAL.maxH+" in",pct(FOCAL.maxH,range("maxH")),2]];
  analogies += analogy(`<div class="rt">${rows.map(r=>`<div class="rtrow"><span class="rl">${r[0]}</span><span class="rmeas">${r[1]}</span>
    <span class="rbarw"><span class="rbar" style="width:${r[2]}%"></span></span><span class="rsub">${r[3]}/5</span></div>`).join("")}</div>`,
    "RTINGS / DPReview","Electronics reviews",
    "Measurement is the headline (“contrast 4500:1”); the derived sub-score is a faint companion on the right, and everything is built for side-by-side. The number leads, the grade follows.",
    "the measurement-first ordering — keep the 0–5 as a quiet trailing companion (Concepts 1&nbsp;&amp;&nbsp;3), never the headline.");
}
// D Bloomberg
{
  const sub=OPTS.slice(0,5);
  const cell=(o,k,dir)=>{const v=o[k];const hot=(dir<0?v===Math.min(...sub.map(x=>x[k])):v===Math.max(...sub.map(x=>x[k])));return `<td class="num" style="${hot?'background:#dcfce7;font-weight:700':''}">${k==='price'?money(v):v}</td>`;};
  analogies += analogy(`<table class="mx" style="font-size:11px"><thead><tr><th class="optname">Seat</th><th>$</th><th>lb</th><th>in</th></tr></thead>
    <tbody>${sub.map(o=>`<tr><td class="optname" style="font-size:11px">${o.name.split(" ").slice(0,2).join(" ")}</td>${cell(o,'price',-1)}${cell(o,'carrierLb',-1)}${cell(o,'maxH',1)}</tr>`).join("")}</tbody></table>`,
    "Bloomberg terminal · Wikipedia “Comparison of…”","Finance · reference",
    "Dense all-real-value matrices where best-in-column heat shading does the evaluative work. No grade column — your eye finds the green.",
    "the heat-shaded matrix of Concept&nbsp;2 — let conditional shading replace a derived score column entirely.");
}
// E Sparkline
{
  const hist=[699,689,679,672,665,659,650,650]; const mx=Math.max(...hist),mn=Math.min(...hist);
  const bars=hist.map((h,i)=>`<span class="${i===hist.length-1?'last':''}" style="height:${6+((h-mn)/(mx-mn))*24}px"></span>`).join("");
  analogies += analogy(`<div><div style="font-size:12px;color:var(--ink2);margin-bottom:6px">Price, last 8 weeks</div>
    <div style="display:flex;align-items:flex-end;gap:10px"><div class="skl">${bars}</div>
    <div><div style="font-size:20px;font-weight:700" class="num">$650</div><div style="font-size:11px;color:var(--good)">▼ $49 since Apr</div></div></div></div>`,
    "Tufte sparklines · dot-dash-plots","Beautiful Evidence",
    "“Data-intense, design-simple, word-sized graphics.” A trend or distribution embedded inline at the point of the number — your priceSources timestamps are a sparkline waiting to happen.",
    "word-sized context everywhere — the inline histograms (Concept&nbsp;3) and a real price-history spark on the detail header.");
}

//====================== PART 3 ======================
const ROWS = [
  ["1 · Anchored Value Rows","hi|High","hi|Strong","hi|Score demoted","md|Medium","hi|Drop-in"],
  ["2 · Comparison Matrix","hi|Highest","hi|Strongest","hi|No score col","hi|Low (reuse)","md|New surface"],
  ["3 · Value Tiles + Spark","md|Medium","md|Cohort only","hi|No score","hi|Low","hi|Drop-in"],
  ["4 · Fit Ledger","md|Focused","hi|To the user","hi|Zero scores","md|Medium","hi|Drop-in"],
  ["5 · Dot-Plots","hi|High","hi|Full field","hi|No score","md|Medium","lo|Power-user"],
  ["6 · Decomposed Bar","md|Medium","md|Self only","md|Keeps score","hi|Low","hi|Companion"],
];
const HEAD=["Concept","Data density","“Compared to what?”","De-opaqued?","Build effort here","IA fit"];
const evalTable = `<table class="eval"><thead><tr>${HEAD.map(h=>`<th>${h}</th>`).join("")}</tr></thead>
  <tbody>${ROWS.map(r=>`<tr><td>${r[0]}</td>${r.slice(1).map(c=>{const[k,t]=c.split("|");return `<td class="${k}">${t}</td>`;}).join("")}</tr>`).join("")}</tbody></table>`;

const rec = `<div>
  <h3>Recommendation</h3>
  <p style="margin:0 0 8px;color:var(--ink2)">
    Lead the product-detail page with <b>Concept&nbsp;1 (Anchored Value Rows)</b> — it honors your “detail is the most
    important surface” brief while smuggling the comparison into every row, so no value is ever opaque. Pair it with a
    compact <b>Concept&nbsp;4 (Fit Ledger)</b> block up top to cash in the persona data you already collect, and offer
    <b>Concept&nbsp;2 (Matrix)</b> as the “compare all” view one tap away. Keep <b>Concept&nbsp;6</b> as the only place
    a rolled-up score appears, fully decomposed. Concepts 3 &amp; 5 are strong but better as progressive-disclosure flourishes.
  </p>
  <p style="margin:0;color:var(--ink2)">
    The through-line, straight from Tufte: <b>show the measurement, anchor it (to the cohort and to the parent), and let
    the score be a thin, decomposable top layer</b> — never the headline.
  </p>
</div>`;

//====================== bake into the existing HTML shell ======================
const path = new URL('./product-detail.html', import.meta.url);
let html = readFileSync(path, 'utf8');
html = html
  .replace('<div id="concepts"></div>', `<div id="concepts">${concepts}</div>`)
  .replace('<div id="analogies"></div>', `<div id="analogies">${analogies}</div>`)
  .replace('<div id="evaltable" style="margin-top:16px"></div>', `<div id="evaltable" style="margin-top:16px">${evalTable}</div>`)
  .replace('<div class="rec" id="rec"></div>', `<div class="rec" id="rec">${rec}</div>`)
  .replace(/\n<script>[\s\S]*?<\/script>\n/, '\n');
writeFileSync(path, html);
console.log('Baked static HTML written. concepts=%d chars, analogies=%d chars', concepts.length, analogies.length);
