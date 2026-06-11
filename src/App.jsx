import { useState, useEffect, useMemo } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://innfzimqqrlprxkeduyk.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlubmZ6aW1xcXJscHJ4a2VkdXlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MzU3MDYsImV4cCI6MjA5NTIxMTcwNn0.AwGuyUHZmEj7Rbt_xrbxhD7FUKuVlxZ8gt93Mb9u7nI"
);

/* ════════════════════════════════════════════════════════════
   DESIGN TOKENS — single source of truth
════════════════════════════════════════════════════════════ */
const T = {
  // colors
  bg:    "#0a0a0a",
  surf:  "#101010",
  card:  "#141414",
  rule:  "#2a2620",
  text:  "#e3dccb",     // bone
  amb:   "#d4a747",     // amber accent
  gr:    "#6b9e6b",     // muted green
  rd:    "#a85a52",     // muted red
  mut:   "#8a8270",     // dim
  mut2:  "#4a4538",     // dim 2
  // spacing scale
  s: { 1:4, 2:8, 3:12, 4:16, 5:20, 6:24, 8:32, 10:40, 12:48, 16:64, 20:80 },
  // typography scale
  size: { tiny:9, label:10, small:11, body:13, h3:16, h2:22, h1:32, hero:64, mega:88 },
  weight: { thin:200, light:300, regular:400, medium:500, bold:600 },
  // borders
  rule1: "1px solid #2a2620",
  rule2: "1px solid #4a4538",
};

const BUILD = "v.2026.06.04.0140";  // updated to force-refresh deploys

/* ════════════════════════════════════════════════════════════
   STYLE PRIMITIVES — composable, consistent
════════════════════════════════════════════════════════════ */
const sty = {
  // Section header — §N. title ────
  sectionHeader: (n, title) => ({
    display:"flex", alignItems:"baseline", gap:T.s[4], marginBottom:T.s[4], marginTop:T.s[8],
  }),
  // Card — top + bottom hairline only
  card: { borderTop:T.rule1, borderBottom:T.rule1, padding:`${T.s[5]}px 0`, marginBottom:T.s[6] },
  // Label
  label: { color:T.mut, fontSize:T.size.label, textTransform:"uppercase", letterSpacing:".18em", display:"block", marginBottom:T.s[2] },
  // Body
  body: { color:T.text, fontSize:T.size.body, lineHeight:1.6 },
  // Inputs
  input: {
    background:"transparent", border:"none", borderBottom:T.rule1,
    color:T.text, padding:`${T.s[2]}px 0`, width:"100%", fontSize:T.size.body,
    fontFamily:"'JetBrains Mono', monospace", fontWeight:T.weight.light,
    outline:"none", boxSizing:"border-box",
  },
  select: {
    background:T.bg, border:T.rule1, color:T.text,
    padding:`${T.s[2]}px ${T.s[3]}px`, width:"100%", fontSize:T.size.body,
    fontFamily:"'JetBrains Mono', monospace",
    outline:"none", boxSizing:"border-box",
  },
  textarea: {
    background:T.surf, border:T.rule1, color:T.text,
    padding:T.s[3], width:"100%", fontSize:T.size.body, lineHeight:1.65,
    fontFamily:"'JetBrains Mono', monospace", fontWeight:T.weight.light,
    outline:"none", boxSizing:"border-box", resize:"vertical", minHeight:80,
  },
  // Buttons
  btn: (variant="primary") => ({
    background: variant==="primary" ? T.amb : "transparent",
    color:      variant==="primary" ? T.bg : T.text,
    border:     `1px solid ${variant==="primary" ? T.amb : T.mut2}`,
    padding:    `${T.s[3]}px ${T.s[5]}px`,
    fontSize:   T.size.small,
    textTransform:"uppercase", letterSpacing:".16em",
    cursor:"pointer", fontFamily:"'JetBrains Mono', monospace",
    fontWeight:T.weight.medium, minHeight:44,
    touchAction:"manipulation",
    WebkitTapHighlightColor:"rgba(212,167,71,0.2)",
  }),
  // Hero number
  heroNum: (color=T.text, size=T.size.hero) => ({
    color, fontSize:size, fontFamily:"'JetBrains Mono', monospace",
    fontWeight:T.weight.thin, letterSpacing:"-.03em", lineHeight:1,
  }),
};

/* ════════════════════════════════════════════════════════════
   DEFAULTS & CONSTANTS
════════════════════════════════════════════════════════════ */
const DEF_INSTRUMENTS = ["Nifty","BankNifty","Gold","Silver","Crude Oil","Natural Gas","Bitcoin","NASDAQ"];
const DEF_SETUPS      = ["Sell at Resistance","Buy at Support","Breakout","Breakdown","Double Top","Double Bottom","Head & Shoulders","Bear Trap","Bull Trap","Trendline Break","Consolidation Break","Straddle","Strangle"];
const DEF_EMOTIONS    = ["Calm","Confident","Anxious","Frustrated","Excited","Fearful","Neutral"];
const DEF_TYPES       = ["Intraday","Swing","Positional"];
const DEF_CHECKS = {
  "Market Conditions": ["Daily trend is clear","TF trend aligns with Daily","Pattern is obvious","Setup at key S/R level","Min 1:2 R:R","SL behind structure","Market structure is clear"],
  "Psychology":        ["Not angry or frustrated","Not zoned out","Slept well","At emotional baseline","Not a FOMO trade","Loss limit not hit","Ready to follow rules"],
  "Risk Management":   ["Position size correct","Daily limit not breached","Weekly limit not breached","Monthly limit not breached","Within max trades today"],
};
const SEGMENTS = ["F&O Futures","F&O Options","Commodity Futures","Commodity Options","Equity Intraday","Equity Delivery"];
const GRADES   = ["A+","A","B","C"];
const MENTAL   = ["Excellent","Good","Neutral","Poor","Terrible"];
const DEFAULT_SETTINGS = {
  traderName:"Trader", capital:1000000, baseRisk:0.3, majorRisk:1.0, drawdownRisk:0.15,
  dailyLimit:30000, weeklyLimit:75000, monthlyLimit:200000, maxIntraday:4, minRR:2, textScale:1,
};

/* ════════════════════════════════════════════════════════════
   FORMATTERS
════════════════════════════════════════════════════════════ */
const fmt   = (n) => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n||0);
const fmt2  = (n) => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",minimumFractionDigits:2,maximumFractionDigits:2}).format(n||0);
const ymd   = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const today = () => ymd(new Date());
const nowT  = () => new Date().toTimeString().slice(0,5);
// the day a trade's P&L is realized: close (exit) date for closed/partial trades, else entry date
const pnlDate = (t) => (t && t.exitDate && t.status !== "open") ? t.exitDate : ((t && t.date) || "");
// options P&L follows the premium side, not the market view: buying a put is a Short *view*
// but a BUY of premium — you profit when the premium rises. Futures/equity follow direction.
const isOptTrade   = (t) => !!(t && (t.isOption || (t.segment||"").includes("Options")));
const isBullishPnl = (t) => isOptTrade(t) ? (t.optSide||"Buy") === "Buy" : t.direction === "Long";

// compress an uploaded image file to a small JPEG data URL (keeps storage light)
const compressImage = (file, maxW=1280, quality=0.7) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = e.target.result;
  };
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

/* ════════════════════════════════════════════════════════════
   STORAGE — local + cloud
════════════════════════════════════════════════════════════ */
const lsGet = (k) => { try { const v=localStorage.getItem(k); return v?JSON.parse(v):null; } catch{ return null; } };
const lsSet = (k,v) => { try { localStorage.setItem(k,JSON.stringify(v)); } catch{} };
const lsDel = (k) => { try { localStorage.removeItem(k); } catch{} };

const sbLoadList = async (table, user) => {
  try { const { data, error } = await sb.from(table).select("data").eq("user_name", user);
    if (error||!data) return null;
    return data.map(r=>r.data).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  } catch { return null; }
};
const sbSaveList = async (table, list, user) => {
  try { await sb.from(table).delete().eq("user_name", user);
    if (list.length) await sb.from(table).insert(list.map(t=>({id:t.id, user_name:user, data:t})));
  } catch {}
};
const sbLoadSettings = async (user) => { try { const { data } = await sb.from("settings").select("data").eq("user_name", user); return data?.[0]?.data || null; } catch { return null; } };
const sbSaveSettings = async (s, user) => { try { await sb.from("settings").upsert({user_name:user, data:s}); } catch {} };
const sbLoadCustom   = async (user) => { try { const { data } = await sb.from("customizations").select("*").eq("user_name", user); return data?.[0] || null; } catch { return null; } };
const sbSaveCustom   = async (obj, user) => { try { await sb.from("customizations").upsert({user_name:user, ...obj}); } catch {} };
const sbLoadUsers    = async () => { try { const { data } = await sb.from("users").select("user_name"); return data?.map(r=>r.user_name) || null; } catch { return null; } };
const sbSaveUser     = async (n) => { try { await sb.from("users").upsert({user_name:n}); } catch {} };
const sbDeleteUser   = async (n) => { try { for (const t of ["trades","reviews","settings","customizations","users"]) await sb.from(t).delete().eq("user_name", n); } catch {} };

/* ════════════════════════════════════════════════════════════
   ZERODHA CHARGE CALCULATOR
════════════════════════════════════════════════════════════ */
const detectSegment = (instrument, setup) => {
  const i = (instrument||"").toLowerCase();
  const s = (setup||"").toLowerCase();
  const com = ["gold","silver","crude","natural gas","copper","zinc","aluminium","lead","nickel"];
  const isCom = com.some(c => i.includes(c));
  const isOpt = s.includes("straddle") || s.includes("strangle") || i.includes("option")
    || i.includes("call") || i.includes("put") || /\d\s*(ce|pe)\b/i.test(i);
  if (isCom) return isOpt ? "Commodity Options" : "Commodity Futures";
  return isOpt ? "F&O Options" : "F&O Futures";
};

const calcCharges = (buyVal, sellVal, segment, legVals, orders) => {
  if (!buyVal || !sellVal) return null;
  const totalVal = buyVal + sellVal;
  const isOpt = segment.includes("Options");
  const isCom = segment.includes("Commodity");
  const isDel = segment.includes("Delivery");

  let brk;
  if (isDel) brk = 0;
  else if (orders && orders > 0) brk = 20 * orders;   // explicit executed-order count: ₹20 per order
  else if (legVals && legVals.length) {
    // Zerodha bills brokerage PER executed order (₹20 or 0.03%, whichever lower), not per trade
    brk = isOpt ? 20 * legVals.length : legVals.reduce((s,v)=>s+Math.min(v*0.0003, 20), 0);
  }
  else if (isOpt) brk = 40;                     // fallback: single buy + single sell order
  else brk = Math.min(buyVal*0.0003, 20) + Math.min(sellVal*0.0003, 20);

  let stt;
  if (isDel) stt = totalVal * 0.001;
  else if (segment === "F&O Futures")       stt = sellVal * 0.0005;
  else if (segment === "F&O Options")       stt = sellVal * 0.0015;
  else if (segment === "Commodity Futures") stt = sellVal * 0.0001;
  else if (segment === "Commodity Options") stt = sellVal * 0.0005;
  else                                       stt = sellVal * 0.00025;

  let txn;
  if (segment === "F&O Futures")       txn = totalVal * 0.0000183;
  else if (segment === "F&O Options")  txn = totalVal * 0.0003553;
  else if (segment === "Commodity Futures") txn = totalVal * 0.0000210;
  else if (segment === "Commodity Options") txn = totalVal * 0.000418;
  else                                  txn = totalVal * 0.0000307;

  const sebi  = totalVal * (10/1e7);
  const gst   = (brk + sebi + txn) * 0.18;
  const stamp = isDel ? buyVal*0.00015 : isOpt ? buyVal*0.00003 : segment.includes("Intraday") ? buyVal*0.00003 : buyVal*0.00002;

  const total = brk + stt + txn + sebi + gst + stamp;
  return {
    brokerage:+brk.toFixed(2), stt:+stt.toFixed(2), txnCharges:+txn.toFixed(2),
    sebi:+sebi.toFixed(2), gst:+gst.toFixed(2), stamp:+stamp.toFixed(2),
    totalCharges:+total.toFixed(2),
  };
};

const applyCharges = (trade) => {
  // Single-leg shortcut (for fresh journal entries)
  const entry = parseFloat(trade.entry), exit = parseFloat(trade.exitPrice), size = parseFloat(trade.size);
  if (!entry||!exit||!size) return trade;
  const bull = isBullishPnl(trade);
  const buyVal  = bull ? entry*size : exit*size;
  const sellVal = bull ? exit*size  : entry*size;
  const seg = trade.segment || detectSegment(trade.instrument, trade.setup);
  const c   = calcCharges(buyVal, sellVal, seg);
  if (!c) return trade;
  const gross = bull ? (exit-entry)*size : (entry-exit)*size;
  const oc = parseFloat(trade.actualCharges) > 0 ? parseFloat(trade.actualCharges) : c.totalCharges;
  return {
    ...trade, segment:seg, grossPnl:String(+gross.toFixed(2)),
    pnl:String(+(gross - oc).toFixed(2)),
    brokerage:String(c.brokerage), stt:String(c.stt), txnCharges:String(c.txnCharges),
    sebi:String(c.sebi), gst:String(c.gst), stamp:String(c.stamp), totalCharges:String(+oc.toFixed(2)),
  };
};

// ── Multi-leg recalculation ─────────────────────────────────
// entries[]: [{id, price, size, time}], exits[]: same shape
// Computes weighted averages, P&L, charges, status
const recalcLegs = (trade) => {
  // Migrate single-leg legacy trades
  let entries = trade.entries || [];
  let exits   = trade.exits   || [];
  if (!entries.length && trade.entry && trade.size) {
    entries = [{ id:1, price:String(trade.entry), size:String(trade.size), time:trade.time||"" }];
  }
  if (!exits.length && trade.exitPrice && trade.size) {
    exits = [{ id:1, price:String(trade.exitPrice), size:String(trade.size), time:trade.time||"" }];
  }

  const sumSize = (arr) => arr.reduce((s,l)=>s+(parseFloat(l.size)||0), 0);
  const sumVal  = (arr) => arr.reduce((s,l)=>s+((parseFloat(l.price)||0)*(parseFloat(l.size)||0)), 0);

  const totEntrySize = sumSize(entries);
  const totExitSize  = sumSize(exits);
  const totEntryVal  = sumVal(entries);
  const totExitVal   = sumVal(exits);

  const avgEntry = totEntrySize ? totEntryVal/totEntrySize : 0;
  const avgExit  = totExitSize  ? totExitVal/totExitSize  : 0;

  const status = totExitSize === 0 ? "open"
              : totExitSize >= totEntrySize ? "closed" : "partial";

  // P&L: realized portion only (matched size)
  const matched = Math.min(totEntrySize, totExitSize);
  const bull = isBullishPnl(trade);
  let gross = 0;
  if (matched > 0) {
    if (bull) gross = (avgExit - avgEntry) * matched;
    else      gross = (avgEntry - avgExit) * matched;
  }

  // Charges based on total turnover of matched portion
  let chargesObj = null;
  if (matched > 0) {
    const matchedEntryVal = avgEntry * matched;
    const matchedExitVal  = avgExit * matched;
    const buyVal  = bull ? matchedEntryVal : matchedExitVal;
    const sellVal = bull ? matchedExitVal  : matchedEntryVal;
    const seg = trade.segment || detectSegment(trade.instrument, trade.setup);
    chargesObj = calcCharges(buyVal, sellVal, seg);
  }

  return {
    ...trade,
    entries, exits,
    entry:      avgEntry ? String(+avgEntry.toFixed(4)) : trade.entry || "",
    exitPrice:  avgExit  ? String(+avgExit.toFixed(4))  : "",
    size:       String(totEntrySize),
    exitedSize: String(totExitSize),
    status,
    exitDate:   status==="open" ? "" : (trade.exitDate || ""),
    actualCharges: trade.actualCharges || "",
    grossPnl:   gross ? String(+gross.toFixed(2)) : "",
    pnl:        (()=>{ const oc=parseFloat(trade.actualCharges)>0?parseFloat(trade.actualCharges):(chargesObj?chargesObj.totalCharges:null); return oc!=null ? String(+(gross - oc).toFixed(2)) : (gross ? String(+gross.toFixed(2)) : ""); })(),
    brokerage:  chargesObj ? String(chargesObj.brokerage)  : "",
    stt:        chargesObj ? String(chargesObj.stt)        : "",
    txnCharges: chargesObj ? String(chargesObj.txnCharges) : "",
    sebi:       chargesObj ? String(chargesObj.sebi)       : "",
    gst:        chargesObj ? String(chargesObj.gst)        : "",
    stamp:      chargesObj ? String(chargesObj.stamp)      : "",
    totalCharges: parseFloat(trade.actualCharges)>0 ? String(+parseFloat(trade.actualCharges).toFixed(2)) : (chargesObj ? String(chargesObj.totalCharges) : ""),
  };
};

/* ════════════════════════════════════════════════════════════
   EMPTY OBJECTS
════════════════════════════════════════════════════════════ */
const emptyTrade = (instr, setup, emo) => ({
  date:today(), time:nowT(), instrument:instr||"", segment:detectSegment(instr||"",setup||""),
  direction:"Long", tradeType:"Intraday", setup:setup||"", setups:setup?[setup]:[], entry:"", sl:"", exitPrice:"", size:"",
  exitTime:"",            // optional exit time (entry time = `time`); enables holding-duration
  exitDate:"",            // date the trade was closed (P&L is attributed to this day, not the entry day)
  actualCharges:"",       // optional: real total charges from the broker contract note (overrides computed)
  isOption:false, strike:"", optType:"CE", optSide:"Buy",   // options: strike, call/put, buy/sell
  strike2:"", optType2:"PE",  // second leg for straddle/strangle (logged as one trade)
  entries:[], exits:[],   // pyramiding + partial exits
  entryLegs:[], exitLegs:[],  // extra orders staged in the journal form (combined into entries/exits on log)
  status:"open",
  riskAmount:"", grossPnl:"", pnl:"", brokerage:"", stt:"", txnCharges:"", sebi:"", gst:"", stamp:"", totalCharges:"",
  rrAchieved:"", grade:"A", followedRules:"Yes", emotion:emo||"Calm", mistakes:"", improvements:"", notes:"",
});

// ── Legs helpers ─────────────────────────────────────────────
const tradeLegs = (t) => {
  // Returns {entries, exits} arrays. Backwards-compatible: if no entries[]
  // but legacy entry field exists, materialize a single leg.
  let entries = t.entries && t.entries.length ? t.entries : [];
  let exits   = t.exits   && t.exits.length   ? t.exits   : [];
  if (!entries.length && t.entry && t.size) {
    entries = [{ price: String(t.entry), size: String(t.size), time: t.time||"", note: "" }];
  }
  if (!exits.length && t.exitPrice) {
    exits = [{ price: String(t.exitPrice), size: String(t.size||0), time: "", note: "" }];
  }
  return { entries, exits };
};
const sumSize    = (legs) => legs.reduce((s,l)=>s+(parseFloat(l.size)||0), 0);
const sumValue   = (legs) => legs.reduce((s,l)=>s+(parseFloat(l.size)||0)*(parseFloat(l.price)||0), 0);
const avgPrice   = (legs) => { const sz = sumSize(legs); return sz ? sumValue(legs)/sz : 0; };

// Recompute P&L, charges, summary fields from legs[]
const recomputeFromLegs = (t) => {
  const { entries, exits } = tradeLegs(t);
  const totalEntrySize = sumSize(entries);
  const totalExitSize  = sumSize(exits);
  const avgEntry = avgPrice(entries);
  const avgExit  = avgPrice(exits);
  const dirSign  = isBullishPnl(t) ? 1 : -1;

  // P&L on the closed portion only
  const closedSize = Math.min(totalEntrySize, totalExitSize);
  const grossPnl   = closedSize > 0 ? dirSign * (avgExit - avgEntry) * closedSize : 0;

  // Status
  const status = totalExitSize === 0 ? "open"
               : totalExitSize >= totalEntrySize ? "closed"
               : "partial";

  // Charges (only on the closed portion)
  let charges = null;
  if (closedSize > 0) {
    const buyVal  = dirSign === 1 ? avgEntry*closedSize : avgExit*closedSize;
    const sellVal = dirSign === 1 ? avgExit*closedSize  : avgEntry*closedSize;
    const seg = t.segment || detectSegment(t.instrument, t.setup);
    const legVals = [...entries, ...exits]
      .map(l => (parseFloat(l.price)||0) * (parseFloat(l.size)||0))
      .filter(v => v > 0);
    if (t.strike2) legVals.push(...legVals);   // straddle/strangle: each logged fill is really two orders (one per leg)
    charges = calcCharges(buyVal, sellVal, seg, legVals);
  }
  const totalCharges = charges?.totalCharges || 0;
  const overrideC = parseFloat(t.actualCharges) > 0 ? parseFloat(t.actualCharges) : null;
  const effCharges = overrideC != null ? overrideC : totalCharges;

  return {
    ...t,
    entries, exits,
    entry:      avgEntry > 0 ? String(+avgEntry.toFixed(4)) : t.entry,
    exitPrice:  avgExit  > 0 ? String(+avgExit.toFixed(4))  : (status==="open" ? "" : t.exitPrice),
    size:       String(totalEntrySize),
    status,
    exitDate:   status==="open" ? "" : (t.exitDate || ""),
    actualCharges: t.actualCharges || "",
    grossPnl:   status==="open" ? "" : String(+grossPnl.toFixed(2)),
    pnl:        status==="open" ? "" : String(+(grossPnl - effCharges).toFixed(2)),
    brokerage:    charges ? String(charges.brokerage)    : "",
    stt:          charges ? String(charges.stt)          : "",
    txnCharges:   charges ? String(charges.txnCharges)   : "",
    sebi:         charges ? String(charges.sebi)         : "",
    gst:          charges ? String(charges.gst)          : "",
    stamp:        charges ? String(charges.stamp)        : "",
    totalCharges: status==="open" ? "" : String(+effCharges.toFixed(2)),
  };
};
const emptyReview = (period) => ({
  date:today(), period, mentalState:"Good", whatWentWell:"", mistakes:"", missedSetups:"",
  rulesFollowed:"", emotionalTrading:"", regrets:"", improvements:"", selfCoaching:"",
});
const emptyPlan = (instr) => ({
  date:today(), instrument:instr||"", bias:"Bullish", grade:"A",
  keyLevels:"", setup:"", entryZone:"", sl:"", target1:"", target2:"",
  invalidation:"", confluences:"", notes:"",
  outcome:"", status:"open",  // "open" | "executed" | "cancelled"
  linkedTradeIds:[],
});

/* ════════════════════════════════════════════════════════════
   REUSABLE COMPONENTS
════════════════════════════════════════════════════════════ */
const Sec = ({ n, title, right }) => (
  <div style={sty.sectionHeader(n,title)}>
    <span style={{color:T.amb, fontSize:T.size.small, letterSpacing:".18em"}}>§{n}</span>
    <span style={{color:T.text, fontSize:T.size.h3, fontWeight:T.weight.light, letterSpacing:"-.01em"}}>{title}</span>
    <div style={{flex:1, height:1, background:T.rule, alignSelf:"center"}}/>
    {right && <span style={{color:T.mut, fontSize:T.size.label, textTransform:"uppercase", letterSpacing:".14em"}}>{right}</span>}
  </div>
);

const Field = ({ label, children }) => (
  <div>
    <label style={sty.label}>{label}</label>
    {children}
  </div>
);

const Metric = ({ label, value, color=T.text, sub }) => (
  <div style={{padding:`${T.s[4]}px ${T.s[5]}px`}}>
    <div style={{...sty.label, marginBottom:T.s[2]}}>{label}</div>
    <div style={{color, fontSize:T.size.h2, fontFamily:"'JetBrains Mono', monospace", fontWeight:T.weight.light, letterSpacing:"-.01em"}}>{value}</div>
    {sub && <div style={{color:T.mut2, fontSize:T.size.tiny, marginTop:T.s[1]}}>{sub}</div>}
  </div>
);

/* ════════════════════════════════════════════════════════════
   APP COMPONENT
════════════════════════════════════════════════════════════ */
export default function App() {
  // ── core state ───────────────────────────────────────────
  const [activeUser, setActiveUser] = useState(null);
  const [userList,   setUserList]   = useState([]);
  const [newUser,    setNewUser]    = useState("");
  const [loaded,     setLoaded]     = useState(false);
  const [tab,        setTab]        = useState("dashboard");
  const [isMob,      setIsMob]      = useState(window.innerWidth < 768);
  const [drawer,     setDrawer]     = useState(null); // null | "settings" | "review" | "checklist" | "risk" | "customize" | "plans"
  const [mobileMenu, setMobileMenu] = useState(false);

  // ── data state ───────────────────────────────────────────
  const [trades,   setTrades]   = useState([]);
  const [reviews,  setReviews]  = useState([]);
  const [plans,    setPlans]    = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [instruments, setInstruments] = useState(DEF_INSTRUMENTS);
  const [setups,    setSetups]    = useState(DEF_SETUPS);
  const [emotions,  setEmotions]  = useState(DEF_EMOTIONS);
  const [tradeTypes,setTradeTypes]= useState(DEF_TYPES);
  const [checks,    setChecks]    = useState(DEF_CHECKS);
  const [sectionMins, setSectionMins] = useState({});
  const [ck, setCk] = useState({});

  // ── form state ───────────────────────────────────────────
  const [tf, setTf] = useState(emptyTrade(DEF_INSTRUMENTS[0], DEF_SETUPS[0], DEF_EMOTIONS[0]));
  const [rf, setRf] = useState(emptyReview("daily"));
  const [planF, setPlanF] = useState(emptyPlan(DEF_INSTRUMENTS[0]));
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [editingTradeId, setEditingTradeId] = useState(null);
  const [legInput, setLegInput] = useState({}); // { [tradeId]: { type:"entry"|"exit", price, size } }
  const [reflectionDraft, setReflectionDraft] = useState({});
  const [reviewTab, setReviewTab] = useState("daily");
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [expReview, setExpReview] = useState(null);   // expanded review id
  const [expWeek, setExpWeek]     = useState(null);   // expanded nested week id (inside monthly)
  const [expMini, setExpMini]     = useState(null);   // expanded daily review (inline, inside week/month)
  const [showChecklist, setShowChecklist] = useState(false); // inline checklist in journal
  const [analyticsView, setAnalyticsView] = useState("combined");
  const [settingsDraft, setSettingsDraft] = useState(DEFAULT_SETTINGS);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [editListInput, setEditListInput] = useState({});

  // ── trades view state ────────────────────────────────────
  const [search,      setSearch]      = useState("");
  const [fInstr,      setFInstr]      = useState("All");
  const [fDir,        setFDir]        = useState("All");
  const [expanded,    setExpanded]    = useState(null);
  const [expCharges,  setExpCharges]  = useState(null);  // collapsible charges breakdown per trade

  // ── risk calc state ──────────────────────────────────────
  const [rc, setRc] = useState({ entry:"", sl:"", rr:"2", riskType:"base", segment:"F&O Futures", instrument:"" });

  // ── import state ─────────────────────────────────────────
  const [importMsg, setImportMsg] = useState(null);

  const uk = (k) => `top1pct_${activeUser}_${k}`;

  // ── effects ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const sbU = await sbLoadUsers();
      setUserList(sbU || lsGet("top1pct_users") || []);
      if (sbU) lsSet("top1pct_users", sbU);
      setLoaded(true);
      const onR = () => setIsMob(window.innerWidth < 768);
      window.addEventListener("resize", onR);
      return () => window.removeEventListener("resize", onR);
    })();
  }, []);

  useEffect(() => {
    const el = document.createElement("style");
    el.id = "apex-injected-css";
    el.textContent = `
      .apex-review-grid { display:grid; grid-template-columns:1fr; gap:${T.s[8]}px; align-items:start; }
      @media (min-width:700px){
        .apex-review-grid { grid-template-columns:3fr 2fr; gap:${T.s[10]}px; }
        .apex-review-grid > div:last-child { border-left:1px solid #2a2620; padding-left:${T.s[8]}px; position:sticky; top:${T.s[5]}px; align-self:start; max-height:calc(100vh - ${T.s[10]}px); overflow-y:auto; }
      }
    `;
    document.head.appendChild(el);
    return () => { const e=document.getElementById("apex-injected-css"); if(e) e.remove(); };
  }, []);

  useEffect(() => {
    if (!activeUser) return;
    (async () => {
      const [tList, rList, pList, s, cust] = await Promise.all([
        sbLoadList("trades",  activeUser),
        sbLoadList("reviews", activeUser),
        sbLoadList("plans",   activeUser),
        sbLoadSettings(activeUser),
        sbLoadCustom(activeUser),
      ]);
      const tr = tList ?? lsGet(uk("trades")) ?? [];
      const rv = rList ?? lsGet(uk("reviews")) ?? [];
      const pl = pList ?? lsGet(uk("plans"))   ?? [];
      const st = s    ?? lsGet(uk("settings")) ?? {...DEFAULT_SETTINGS, traderName:activeUser};
      setTrades(tr);  lsSet(uk("trades"), tr);
      setReviews(rv); lsSet(uk("reviews"), rv);
      setPlans(pl);   lsSet(uk("plans"), pl);
      setSettings(st);lsSet(uk("settings"), st);
      setSettingsDraft(st);
      if (cust) {
        cust.instruments  && setInstruments(cust.instruments);
        cust.setups       && setSetups(cust.setups);
        cust.emotions     && setEmotions(cust.emotions);
        cust.trade_types  && setTradeTypes(cust.trade_types);
        cust.checks       && setChecks(cust.checks);
      } else {
        setInstruments(lsGet(uk("instruments")) || DEF_INSTRUMENTS);
        setSetups(lsGet(uk("setups")) || DEF_SETUPS);
        setEmotions(lsGet(uk("emotions")) || DEF_EMOTIONS);
        setTradeTypes(lsGet(uk("tradeTypes")) || DEF_TYPES);
        setChecks(lsGet(uk("checks")) || DEF_CHECKS);
      }
      const sm = lsGet(uk("sectionMins")); if (sm) setSectionMins(sm);
      setTf(emptyTrade(instruments[0] || DEF_INSTRUMENTS[0], setups[0] || DEF_SETUPS[0], emotions[0] || DEF_EMOTIONS[0]));
    })();
  }, [activeUser]);

  // ── persist helpers ──────────────────────────────────────
  const pTrades  = (l) => { setTrades(l);  lsSet(uk("trades"), l);  sbSaveList("trades",  l, activeUser); };
  const pReviews = (l) => { setReviews(l); lsSet(uk("reviews"), l); sbSaveList("reviews", l, activeUser); };
  const pPlans   = (l) => { setPlans(l);   lsSet(uk("plans"),   l); sbSaveList("plans",   l, activeUser); };
  const pSettings= (s) => { setSettings(s);lsSet(uk("settings"),s); sbSaveSettings(s, activeUser); };
  const pCustom  = (k, v, setter) => {
    setter(v); lsSet(uk(k), v);
    const map = { instruments:"instruments", setups:"setups", emotions:"emotions", tradeTypes:"trade_types", checks:"checks" };
    if (map[k]) sbSaveCustom({ [map[k]]:v }, activeUser);
  };

  // ── user mgmt ────────────────────────────────────────────
  const createUser = () => {
    const n = newUser.trim(); if (!n) return;
    if (userList.includes(n)) return alert("Profile exists");
    const u = [...userList, n]; setUserList(u); lsSet("top1pct_users", u);
    sbSaveUser(n); setNewUser(""); setActiveUser(n);
  };
  const switchUser = () => { setActiveUser(null); setTrades([]); setReviews([]); setSettings(DEFAULT_SETTINGS); };
  const deleteUser = (n) => {
    if (!confirm(`Delete profile "${n}" and all its data?`)) return;
    const u = userList.filter(x=>x!==n); setUserList(u); lsSet("top1pct_users",u);
    ["trades","reviews","settings","instruments","setups","emotions","tradeTypes","checks","sectionMins"].forEach(k=>lsDel(`top1pct_${n}_${k}`));
    sbDeleteUser(n); if (activeUser===n) switchUser();
  };

  // ── log trade ────────────────────────────────────────────
  const logTrade = () => {
    if (!tf.entry || !tf.sl) return alert("Entry and SL are required.");

    const isClosed = !!tf.exitPrice;

    if (editingTradeId) {
      // ── UPDATE EXISTING TRADE — preserve legs ──
      const existing = trades.find(t => t.id === editingTradeId);
      const exLegsE = existing.entries || [], exLegsX = existing.exits || [];
      const oldEntryTotal = sumSize(exLegsE), oldExitTotal = sumSize(exLegsX);
      // Multi-leg sides are NOT rewritten from the form (form shows weighted averages —
      // pushing an average into one fill corrupts the legs). Edit fills in position legs instead.
      const newEntries = exLegsE.length > 1
        ? exLegsE
        : [{ id:(exLegsE[0]?.id)||1, price:String(tf.entry), size:String(tf.size), time:tf.time, note:exLegsE[0]?.note||"" }];
      const wasFullClose = exLegsX.length === 1 && oldEntryTotal > 0 && oldExitTotal >= oldEntryTotal;
      const newExits = !isClosed
        ? exLegsX
        : exLegsX.length > 1
          ? exLegsX
          : [{ id:(exLegsX[0]?.id)||1, price:String(tf.exitPrice),
               size:String(exLegsX.length === 1 ? (wasFullClose ? tf.size : exLegsX[0].size) : tf.size),
               time: tf.exitTime || exLegsX[0]?.time || tf.time, note:exLegsX[0]?.note||"" }];
      const merged = recalcLegs({
        ...existing, ...tf, id: editingTradeId,
        exitDate: isClosed ? (tf.exitDate || existing.exitDate || today()) : "",
        entries: newEntries, exits: newExits,
      });
      pTrades(trades.map(t => t.id === editingTradeId ? merged : t));
      setEditingTradeId(null);
      setTf(emptyTrade(instruments[0], setups[0], emotions[0]));
      return;
    }

    // ── NEW TRADE ──
    // Capture checklist snapshot at moment of trade
    const checklistSnapshot = Object.entries(checks).flatMap(([section, items], si) =>
      items.map((item, i) => {
        const gi = Object.values(checks).slice(0,si).flat().length + i;
        return { section, item, state: ck[gi] || "—" };
      })
    );
    const checkedYes = checklistSnapshot.filter(c=>c.state==="yes").length;
    const checkedNo  = checklistSnapshot.filter(c=>c.state==="no").length;
    const matchPlan = plans.find(p => p.status === "open" && p.instrument === tf.instrument);
    const tradeId = Date.now();
    // Materialize initial legs from the simple form fields
    const extraE = (tf.entryLegs||[]).filter(l=>l.price&&l.size).map(l=>({ price:String(l.price), size:String(l.size), time: tf.time||nowT(), note:"" }));
    const extraX = (tf.exitLegs ||[]).filter(l=>l.price&&l.size).map(l=>({ price:String(l.price), size:String(l.size), time: tf.exitTime||tf.time||nowT(), note:"" }));
    const initialEntries = [ ...(tf.entry ? [{ price: tf.entry, size: tf.size||"0", time: tf.time||nowT(), note: "" }] : []), ...extraE ];
    const initialExits   = [ ...(isClosed ? [{ price: tf.exitPrice, size: tf.size||"0", time: tf.exitTime||nowT(), note: "" }] : []), ...extraX ];
    const base = {
      ...tf, id: tradeId, status,
      exitDate: isClosed ? (tf.exitDate || tf.date || today()) : "",
      entries: initialEntries,
      exits: initialExits,
      checklist: checklistSnapshot,
      checklistYes: checkedYes,
      checklistNo:  checkedNo,
      checklistTotal: checklistSnapshot.length,
      postReflection: tf.postReflection || "",
      planId: matchPlan?.id || null,
    };
    const final = recomputeFromLegs(base);
    pTrades([final, ...trades]);
    if (matchPlan) {
      pPlans(plans.map(p => p.id === matchPlan.id
        ? {...p, linkedTradeIds: [...(p.linkedTradeIds||[]), tradeId], status: "executed"}
        : p));
    }
    setTf(emptyTrade(instruments[0], setups[0], emotions[0]));
    setCk({});   // reset pre-trade checklist after logging
  };

  const updateTrade = (id, patch) => {
    pTrades(trades.map(t => t.id === id ? {...t, ...patch} : t));
  };

  // ── Multi-leg helpers (pyramiding + partial exits) ──
  const addEntryLeg = (tradeId, leg) => {
    const t = trades.find(x => x.id === tradeId);
    if (!t) return;
    const { entries } = tradeLegs(t);
    const updated = recomputeFromLegs({...t, entries: [...entries, leg]});
    pTrades(trades.map(x => x.id === tradeId ? updated : x));
  };
  const addExitLeg = (tradeId, leg) => {
    const t = trades.find(x => x.id === tradeId);
    if (!t) return;
    const { exits } = tradeLegs(t);
    const updated = recomputeFromLegs({...t, exits: [...exits, leg], exitDate: t.exitDate || today()});
    pTrades(trades.map(x => x.id === tradeId ? updated : x));
  };
  const removeLeg = (tradeId, side, idx) => {
    const t = trades.find(x => x.id === tradeId);
    if (!t) return;
    const { entries, exits } = tradeLegs(t);
    const newE = side === "entry" ? entries.filter((_,i)=>i!==idx) : entries;
    const newX = side === "exit"  ? exits.filter((_,i)=>i!==idx)   : exits;
    const updated = recomputeFromLegs({...t, entries: newE, exits: newX});
    pTrades(trades.map(x => x.id === tradeId ? updated : x));
  };

  const startEditingTrade = (t) => {
    setEditingTradeId(t.id);
    const eTime = (t.entries && t.entries[0] && t.entries[0].time) || t.time || "";
    const xTime = (t.exits && t.exits.length && t.exits[t.exits.length-1].time) || "";
    setTf({...t, time:eTime, exitTime:xTime, setups: t.setups || (t.setup ? t.setup.split(",").map(s=>s.trim()).filter(Boolean) : [])});  // pre-fill form with this trade
    setTab("journal");
    setDrawer(null);
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  };

  const cancelEdit = () => {
    setEditingTradeId(null);
    setTf(emptyTrade(instruments[0], setups[0], emotions[0]));
  };

  const closeOpenTrade = (id, exitPrice, exitSize, exitTime) => {
    const t = trades.find(x => x.id === id);
    if (!t) return;
    const { entries, exits } = tradeLegs(t);
    const remaining = sumSize(entries) - sumSize(exits);
    const closeSize = exitSize ? parseFloat(exitSize) : remaining;
    const newLeg = { price: String(exitPrice), size: String(closeSize), time: exitTime || nowT(), note: "" };
    const updated = recomputeFromLegs({...t, exits: [...exits, newLeg], exitDate: t.exitDate || today()});
    pTrades(trades.map(x => x.id === id ? updated : x));
  };

  // Plan CRUD
  const savePlan = () => {
    if (!planF.instrument) return alert("Pick an instrument");
    if (editingPlanId) {
      pPlans(plans.map(p => p.id === editingPlanId ? {...planF, id: editingPlanId} : p));
      setEditingPlanId(null);
    } else {
      pPlans([{...planF, id: Date.now()}, ...plans]);
    }
    setPlanF(emptyPlan(instruments[0]));
  };
  const editPlan = (p) => { setPlanF(p); setEditingPlanId(p.id); setTab("plans"); if (typeof window!=="undefined") window.scrollTo(0,0); };
  const delPlan  = (id) => { if(confirm("Delete this plan?")) pPlans(plans.filter(p=>p.id!==id)); };
  const linkTradeToPlan = (planId, tradeId) => {
    pPlans(plans.map(p => p.id===planId ? {...p, linkedTradeIds:[...(p.linkedTradeIds||[]).filter(x=>x!==tradeId), tradeId], status: "executed"} : p));
    pTrades(trades.map(t => t.id===tradeId ? {...t, planId} : t));
  };
  const updatePlanOutcome = (id, outcome) => {
    pPlans(plans.map(p => p.id === id ? {...p, outcome} : p));
  };
  const delTrade = (id) => pTrades(trades.filter(t=>t.id!==id));

  // ── reviews ──────────────────────────────────────────────
  const logReview = () => {
    if (editingReviewId) {
      pReviews(reviews.map(r => r.id===editingReviewId ? {...rf, id:editingReviewId} : r));
      setEditingReviewId(null);
    } else {
      pReviews([{...rf, id:Date.now()}, ...reviews]);
    }
    setRf(emptyReview(reviewTab));
  };
  const delReview = (id) => pReviews(reviews.filter(r=>r.id!==id));
  const startEditReview = (r) => { setReviewTab(r.period); setRf({...r}); setEditingReviewId(r.id); if (typeof window!=="undefined") window.scrollTo(0,0); };
  const cancelEditReview = () => { setEditingReviewId(null); setRf(emptyReview(reviewTab)); };
  // review grouping helpers
  const revWeekStart = (ds) => { const d=new Date(ds+"T00:00:00"); const off=(d.getDay()+6)%7; d.setDate(d.getDate()-off); return ymd(d); }; // Monday of that week
  const revMonthKey  = (ds) => (ds||"").slice(0,7);
  const revWeekday   = (ds) => ds ? new Date(ds+"T00:00:00").toLocaleDateString("en-US",{weekday:"long"}) : "";
  const revExcerpt   = (r) => [r.whatWentWell, r.mistakes, r.improvements].filter(Boolean).join(" · ") || "—";

  // ── import (smart dedup by id + fingerprint) ────────────
  const fp = (t) => `${t.date}_${(t.instrument||"").toLowerCase().replace(/\s+/g,"")}_${(t.direction||"").toLowerCase()}_${Math.round(parseFloat(t.entry||0))}`;
  const doMerge = (imported) => {
    if (!Array.isArray(imported)) throw new Error("bad format");
    const ids   = new Set(trades.map(t=>String(t.id)));
    const fps   = new Set(trades.map(fp));
    const withC = imported.map(t => t.totalCharges && parseFloat(t.totalCharges)>0 ? t : applyCharges({...t, segment: t.segment || detectSegment(t.instrument, t.setup)}));
    const nu    = withC.filter(t => !ids.has(String(t.id)) && !fps.has(fp(t)));
    const merged= [...nu, ...trades].sort((a,b)=>b.date.localeCompare(a.date));
    pTrades(merged);
    setImportMsg({ ok:true, msg:`Added ${nu.length} · skipped ${imported.length-nu.length} duplicates` });
    setTimeout(()=>setImportMsg(null), 5000);
  };
  const importJSON = (file) => {
    if (!file) return;
    setImportMsg({ loading:true, msg:"Reading JSON..." });
    const r = new FileReader();
    r.onload = e => { try { doMerge(JSON.parse(e.target.result)); } catch { setImportMsg({ err:"Invalid JSON" }); } };
    r.readAsText(file);
  };
  const importExcel = async (file) => {
    if (!file) return;
    setImportMsg({ loading:true, msg:"Parsing Excel..." });
    try {
      const XLSX = await import("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm");
      const buf  = await file.arrayBuffer();
      const wb   = XLSX.read(buf, { type:"array", cellDates:true });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header:1, raw:false });
      let h = -1;
      for (let i=0; i<rows.length; i++) if (rows[i].includes("Symbol") && rows[i].includes("Trade Type")) { h=i; break; }
      if (h<0) { setImportMsg({ err:"Not a Zerodha tradebook" }); return; }
      const cols = rows[h], idx = (n) => cols.findIndex(c => String(c).trim()===n);
      const iS=idx("Symbol"), iT=idx("Trade Type"), iP=idx("Price"), iQ=idx("Quantity"), iTime=idx("Order Execution Time"), iDate=idx("Trade Date");
      const data = rows.slice(h+1).map(r=>({sym:String(r[iS]||"").trim(), type:String(r[iT]||"").trim().toLowerCase(), price:parseFloat(r[iP]||0), qty:parseInt(r[iQ]||0), time:r[iTime], date:r[iDate]||r[iTime]})).filter(r=>r.sym.length>2&&r.price>0);
      const groups = {}; data.forEach(r=>{ (groups[r.sym]=groups[r.sym]||[]).push(r); });
      const fname = file.name, seg = fname.includes("COM") ? "Commodity" : "F&O";
      const imported = [];
      for (const [sym, legs] of Object.entries(groups)) {
        const sorted = [...legs].sort((a,b)=>new Date(a.time)-new Date(b.time));
        const buys   = sorted.filter(r=>r.type==="buy"), sells = sorted.filter(r=>r.type==="sell");
        if (!buys.length || !sells.length) continue;
        const dir = sorted[0].type==="buy" ? "Long" : "Short";
        const isFut = sym.toUpperCase().includes("FUT");
        const segment = isFut ? (seg==="Commodity"?"Commodity Futures":"F&O Futures") : (seg==="Commodity"?"Commodity Options":"F&O Options");
        const n = Math.min(buys.length, sells.length);
        for (let i=0; i<n; i++) {
          const b=buys[i], s=sells[i];
          const ep = dir==="Long" ? b.price : s.price;
          const xp = dir==="Long" ? s.price : b.price;
          const et = dir==="Long" ? b.time  : s.time;
          const dt = new Date(et);
          const uid = Math.abs([...`${sym}${et}${ep}${b.qty}${dir}`].reduce((h,c)=>(h*31+c.charCodeAt(0))|0,0)) % 1e12;
          imported.push({
            id:uid, date:dt.toISOString().slice(0,10), time:dt.toTimeString().slice(0,5),
            instrument: sym.replace(/[\d]+[A-Z]{3}.*$/,"").trim() || sym, segment, direction:dir,
            tradeType: String(b.date).slice(0,10)===String(s.date).slice(0,10)?"Intraday":"Swing",
            setup: dir==="Long"?"Buy at Support":"Sell at Resistance",
            entry:String(ep), exitPrice:String(xp), size:String(b.qty),
            sl:"", riskAmount:"", grossPnl:"", pnl:"", brokerage:"", stt:"", txnCharges:"", sebi:"", gst:"", stamp:"", totalCharges:"",
            rrAchieved:"", grade:"", followedRules:"", emotion:"", mistakes:"", improvements:"",
            notes:`Zerodha ${seg} | ${sym}`,
          });
        }
      }
      doMerge(imported);
    } catch (err) { setImportMsg({ err:"Parse failed: "+err.message }); }
  };

  /* ────────────────────────────────────────────────────────
     DERIVED DATA
  ──────────────────────────────────────────────────────── */
  const closed = trades.filter(t => t.status !== "open" && t.pnl !== "" && t.pnl !== undefined);
  const todayPnl = closed.filter(t=>pnlDate(t)===today()).reduce((s,t)=>s+parseFloat(t.pnl),0);
  const weekPnl = (()=>{ const ws=new Date(); ws.setDate(ws.getDate()-ws.getDay()); return closed.filter(t=>new Date(pnlDate(t))>=ws).reduce((s,t)=>s+parseFloat(t.pnl),0); })();
  const monthPnl = (()=>{ const m=new Date(); m.setDate(1); return closed.filter(t=>new Date(pnlDate(t))>=m).reduce((s,t)=>s+parseFloat(t.pnl),0); })();
  const totalPnl = closed.reduce((s,t)=>s+parseFloat(t.pnl),0);
  const totalGross = closed.reduce((s,t)=>s+parseFloat(t.grossPnl||t.pnl||0),0);
  const sumBy = (list, f) => list.reduce((s,t)=>s+(parseFloat(t[f])||0),0);
  const wsDate = (()=>{ const w=new Date(); w.setDate(w.getDate()-w.getDay()); w.setHours(0,0,0,0); return w; })();
  const moDate = (()=>{ const m=new Date(); m.setDate(1); m.setHours(0,0,0,0); return m; })();
  const inWeek  = (t)=> new Date(pnlDate(t)+"T00:00:00")>=wsDate;
  const inMonth = (t)=> new Date(pnlDate(t)+"T00:00:00")>=moDate;
  const brkPaid = { day:sumBy(closed.filter(t=>pnlDate(t)===today()),"brokerage"), week:sumBy(closed.filter(inWeek),"brokerage"), month:sumBy(closed.filter(inMonth),"brokerage"), all:sumBy(closed,"brokerage") };
  const chgPaid = { day:sumBy(closed.filter(t=>pnlDate(t)===today()),"totalCharges"), week:sumBy(closed.filter(inWeek),"totalCharges"), month:sumBy(closed.filter(inMonth),"totalCharges"), all:sumBy(closed,"totalCharges") };
  const totalCharges = closed.reduce((s,t)=>s+parseFloat(t.totalCharges||0),0);
  const wins = closed.filter(t=>parseFloat(t.pnl)>0);
  const losses = closed.filter(t=>parseFloat(t.pnl)<=0);
  const winRate = closed.length ? (wins.length/closed.length*100).toFixed(1) : "0";
  const gw = wins.reduce((s,t)=>s+parseFloat(t.pnl),0);
  const gl = Math.abs(losses.reduce((s,t)=>s+parseFloat(t.pnl),0));
  const pf = gl ? (gw/gl).toFixed(2) : "—";
  const avgRR = closed.length ? (closed.reduce((s,t)=>s+parseFloat(t.rrAchieved||0),0)/closed.length).toFixed(2) : "0";

  // capital curve — by date, cumulative
  const curve = useMemo(() => {
    let c = 0;
    return [...closed].sort((a,b)=>pnlDate(a).localeCompare(pnlDate(b))).map(t => {
      c += parseFloat(t.pnl);
      return { date: pnlDate(t).slice(5), v: Math.round(c) };
    });
  }, [trades]);

  // risk calc
  const riskAmt = settings.capital * (rc.riskType==="major" ? settings.majorRisk/100 : rc.riskType==="drawdown" ? settings.drawdownRisk/100 : settings.baseRisk/100);
  const rcResult = useMemo(() => {
    const e = parseFloat(rc.entry), s = parseFloat(rc.sl);
    if (!e||!s||e===s) return null;
    const slDist = Math.abs(e-s), dir = e>s ? 1 : -1;
    const qty = Math.floor(riskAmt/slDist);
    const tp = e + dir*slDist*parseFloat(rc.rr);
    const reward = qty*slDist*parseFloat(rc.rr);
    const c = calcCharges(qty*e, qty*tp, rc.segment);
    return { qty, slDist:slDist.toFixed(4), tp:tp.toFixed(4), reward:Math.round(reward), risk:Math.round(riskAmt), charges:Math.round(c?.totalCharges||0), netReward:Math.round(reward-(c?.totalCharges||0)) };
  }, [rc, riskAmt]);

  /* ────────────────────────────────────────────────────────
     SCREENS
  ──────────────────────────────────────────────────────── */
  if (!loaded) return <div style={{background:T.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:T.mut,fontFamily:"'JetBrains Mono', monospace",fontSize:T.size.small}}>loading...</div>;

  /* ── PROFILE PICKER ── */
  if (!activeUser) return (
    <div style={{background:T.bg,minHeight:"100vh",color:T.text,fontFamily:"'JetBrains Mono', monospace",fontWeight:T.weight.light,display:"flex",alignItems:"center",justifyContent:"center",padding:T.s[5]}}>
      <div style={{width:"100%",maxWidth:420}}>
        <div style={{marginBottom:T.s[10]}}>
          <div style={{color:T.amb,fontSize:T.size.label,textTransform:"uppercase",letterSpacing:".18em"}}>trading journal</div>
          <div style={{fontSize:T.size.h1,fontWeight:T.weight.thin,letterSpacing:"-.02em",marginTop:T.s[2]}}>Top 1%</div>
          <div style={{color:T.mut,fontSize:T.size.body,marginTop:T.s[3]}}>A trader's log, kept honestly.</div>
        </div>

        {userList.length>0 && (
          <div style={{...sty.card, marginBottom:T.s[5]}}>
            <div style={{...sty.label, marginBottom:T.s[4]}}>select profile</div>
            {userList.map(u => (
              <div key={u} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:`${T.s[3]}px 0`,borderBottom:T.rule1}}>
                <span style={{color:T.text,fontSize:T.size.body}}>{u}</span>
                <div style={{display:"flex",gap:T.s[2]}}>
                  <button onClick={()=>setActiveUser(u)} style={sty.btn("primary")}>enter</button>
                  <button onClick={()=>deleteUser(u)} style={{...sty.btn(), color:T.rd, border:`1px solid ${T.rd}`}}>×</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={sty.card}>
          <div style={{...sty.label,marginBottom:T.s[3]}}>or create new</div>
          <div style={{display:"flex",gap:T.s[3]}}>
            <input style={sty.input} placeholder="name" value={newUser} onChange={e=>setNewUser(e.target.value)} onKeyDown={e=>e.key==="Enter"&&createUser()}/>
            <button onClick={createUser} style={sty.btn("primary")}>create</button>
          </div>
        </div>
      </div>
    </div>
  );

  /* ────────────────────────────────────────────────────────
     MAIN TABS
  ──────────────────────────────────────────────────────── */
  const TABS = [
    { key:"dashboard", label:"dashboard", short:"dash"   },
    { key:"journal",   label:"journal",   short:"journal"},
    { key:"trades",    label:"trades",    short:"trades" },
    { key:"plans",     label:"trade plans",short:"plans" },
    { key:"review",    label:"review",    short:"review" },
    { key:"analytics", label:"analytics", short:"stats"  },
  ];

  /* ── DASHBOARD ── */
  const renderDashboard = () => (
    <div>
      {/* hero */}
      <div style={{marginBottom:T.s[10]}}>
        <div style={{color:T.amb,fontSize:T.size.label,textTransform:"uppercase",letterSpacing:".18em",marginBottom:T.s[4]}}>today</div>
        <div style={sty.heroNum(todayPnl>=0?T.gr:T.rd, isMob?T.size.h1:T.size.mega)}>{fmt(todayPnl)}</div>
        <div style={{color:T.mut,fontSize:T.size.body,marginTop:T.s[3]}}>
          {closed.filter(t=>pnlDate(t)===today()).length} trades today &nbsp;·&nbsp; week <span style={{color:T.text}}>{fmt(weekPnl)}</span> &nbsp;·&nbsp; month <span style={{color:T.text}}>{fmt(monthPnl)}</span>
        </div>
      </div>

      {/* metrics strip */}
      <div style={{borderTop:T.rule1,borderBottom:T.rule1,display:"grid",gridTemplateColumns:isMob?"1fr 1fr":"repeat(4,1fr)",marginBottom:T.s[8]}}>
        <Metric label="all-time p&l" value={fmt(totalPnl)} color={totalPnl>=0?T.gr:T.rd}/>
        <div style={{borderLeft:isMob?"none":T.rule1, borderTop:isMob?T.rule1:"none"}}><Metric label="win rate" value={winRate+"%"}/></div>
        <div style={{borderLeft:T.rule1, borderTop:isMob?T.rule1:"none"}}><Metric label="profit factor" value={pf} color={T.amb}/></div>
        <div style={{borderLeft:isMob?"none":T.rule1, borderTop:isMob?T.rule1:"none"}}><Metric label="trades" value={closed.length} sub={`avg r:r ${avgRR}`}/></div>
      </div>

      {/* equity curve */}
      <Sec n="01" title="capital curve" right={`${closed.length} trades`}/>
      {curve.length>1 ? (
        <div style={{marginBottom:T.s[8]}}>
          <ResponsiveContainer width="100%" height={isMob?180:240}>
            <LineChart data={curve} margin={{top:8,right:0,bottom:0,left:0}}>
              <XAxis dataKey="date" stroke={T.mut2} tick={{fill:T.mut,fontSize:10}} interval="preserveStartEnd"/>
              <YAxis stroke={T.mut2} tick={{fill:T.mut,fontSize:10}} tickFormatter={fmt} width={70}/>
              <Tooltip contentStyle={{background:T.card,border:T.rule1,fontFamily:"'JetBrains Mono', monospace"}} labelStyle={{color:T.text}} itemStyle={{color:T.text}} formatter={v=>[fmt(v),"cumulative"]}/>
              <Line type="monotone" dataKey="v" stroke={totalPnl>=0?T.gr:T.rd} strokeWidth={1.5} dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : <div style={{color:T.mut2,fontSize:T.size.small,padding:`${T.s[5]}px 0`,marginBottom:T.s[6]}}>no closed trades yet — start logging to see your curve.</div>}

      {/* Open positions */}
      {(() => {
        const open = trades.filter(t => t.status === "open");
        if (!open.length) return null;
        return (
          <>
            <Sec n="02" title={`open positions · ${open.length}`} right="awaiting exit"/>
            <div style={{borderTop:T.rule1,borderBottom:T.rule1,marginBottom:T.s[8]}}>
              {open.map(t => (
                <div key={t.id} onClick={()=>{setTab("trades"); setExpanded(t.id);}}
                  style={{padding:`${T.s[3]}px 0`,borderBottom:T.rule1,cursor:"pointer",
                          display:"grid",gridTemplateColumns:isMob?"1fr 1fr auto":"100px 160px 100px 100px 100px auto",gap:T.s[3],alignItems:"center"}}>
                  <span style={{color:T.mut,fontSize:T.size.small}}>{t.date}</span>
                  <span style={{color:T.text,fontSize:T.size.body}}>{t.instrument}</span>
                  {!isMob && <span style={{color:t.direction==="Long"?T.gr:T.rd,fontSize:T.size.small}}>{t.direction?.toLowerCase()}</span>}
                  {!isMob && <span style={{color:T.mut,fontFamily:"'JetBrains Mono', monospace",fontSize:T.size.small}}>entry {t.entry}</span>}
                  {!isMob && <span style={{color:T.rd,fontFamily:"'JetBrains Mono', monospace",fontSize:T.size.small}}>sl {t.sl}</span>}
                  <span style={{color:T.amb,fontSize:T.size.small,textAlign:"right",textTransform:"uppercase",letterSpacing:".14em"}}>open ▸</span>
                </div>
              ))}
            </div>
          </>
        );
      })()}

      {/* loss limits */}
      <Sec n="03" title="loss limits"/>
      {[
        { label:"daily",   used:Math.max(0,-todayPnl), limit:settings.dailyLimit  },
        { label:"weekly",  used:Math.max(0,-weekPnl),  limit:settings.weeklyLimit },
        { label:"monthly", used:Math.max(0,-monthPnl), limit:settings.monthlyLimit},
      ].map(x => {
        const pct = Math.min(100, (x.used/x.limit)*100);
        return (
          <div key={x.label} style={{display:"grid",gridTemplateColumns:isMob?"80px 1fr 110px":"100px 1fr 160px",alignItems:"center",gap:T.s[4],padding:`${T.s[3]}px 0`,borderBottom:T.rule1}}>
            <span style={{fontSize:T.size.small,color:T.mut,textTransform:"uppercase",letterSpacing:".14em"}}>{x.label}</span>
            <div style={{background:T.mut2,height:2,position:"relative"}}>
              <div style={{position:"absolute",top:0,left:0,height:2,background:pct>80?T.rd:T.amb,width:`${pct}%`,transition:"width .3s"}}/>
            </div>
            <span style={{fontSize:T.size.small,fontFamily:"'JetBrains Mono', monospace",color:pct>80?T.rd:T.text,textAlign:"right"}}>{fmt(x.used)} / {fmt(x.limit)}</span>
          </div>
        );
      })}

      {/* brokerage paid */}
      <Sec n="04" title="brokerage paid" right="day · week · month · all"/>
      <div style={{borderLeft:T.rule1,borderBottom:T.rule1,display:"grid",gridTemplateColumns:isMob?"1fr 1fr":"repeat(4,1fr)",marginBottom:T.s[8]}}>
        {[["today",brkPaid.day,chgPaid.day],["this week",brkPaid.week,chgPaid.week],["this month",brkPaid.month,chgPaid.month],["overall",brkPaid.all,chgPaid.all]].map(([l,b,c]) => (
          <div key={l} style={{borderTop:T.rule1,borderRight:T.rule1}}>
            <Metric label={l} value={fmt(b)} color={T.amb} sub={`total charges ${fmt(c)}`}/>
          </div>
        ))}
      </div>

      {/* recent trades */}
      <Sec n="05" title="recent" right={`${trades.length} total`}/>
      {!closed.length ? (
        <div style={{color:T.mut2,fontSize:T.size.small,padding:`${T.s[5]}px 0`}}>no trades yet. go to journal to log one.</div>
      ) : (
        <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch",margin:isMob?`0 -${T.s[3]}px`:undefined,padding:isMob?`0 ${T.s[3]}px`:undefined}}><table style={{minWidth:isMob?540:"auto",width:"100%",borderCollapse:"collapse",fontSize:T.size.small}}>
          <thead>
            <tr style={{color:T.mut,borderBottom:T.rule1}}>
              {["date","instrument","direction","entry","exit","net p&l","r:r"].map(h => (
                <th key={h} style={{padding:`${T.s[2]}px ${T.s[3]}px`,textAlign:"left",fontWeight:T.weight.regular,fontSize:T.size.label,textTransform:"uppercase",letterSpacing:".14em"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {closed.slice(0,8).map(t => (
              <tr key={t.id} style={{borderBottom:T.rule1}}>
                <td style={{padding:`${T.s[3]}px ${T.s[3]}px`,color:T.mut}}>{t.date}</td>
                <td style={{padding:`${T.s[3]}px ${T.s[3]}px`,color:T.text}}>{t.instrument}</td>
                <td style={{padding:`${T.s[3]}px ${T.s[3]}px`,color:t.direction==="Long"?T.gr:T.rd}}>{t.direction?.toLowerCase()}</td>
                <td style={{padding:`${T.s[3]}px ${T.s[3]}px`,color:T.mut,fontFamily:"'JetBrains Mono', monospace"}}>{t.entry}</td>
                <td style={{padding:`${T.s[3]}px ${T.s[3]}px`,color:T.mut,fontFamily:"'JetBrains Mono', monospace"}}>{t.exitPrice}</td>
                <td style={{padding:`${T.s[3]}px ${T.s[3]}px`,color:parseFloat(t.pnl)>=0?T.gr:T.rd,fontFamily:"'JetBrains Mono', monospace"}}>{fmt(parseFloat(t.pnl))}</td>
                <td style={{padding:`${T.s[3]}px ${T.s[3]}px`,color:T.amb}}>{t.rrAchieved||"—"}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </div>
  );

  /* ── JOURNAL — clean single-column form ── */
  const updateTf = (patch) => setTf(prev => applyCharges({ ...prev, ...patch }));
  const renderJournal = () => {
    // Find matching open plan for current instrument
    const matchingPlan = plans.find(p => p.status === "open" && p.instrument === tf.instrument);
    // Checklist completion
    const allItems = Object.values(checks).flat();
    const yesCnt = allItems.filter((_,i)=>ck[i]==="yes").length;
    const noCnt  = allItems.filter((_,i)=>ck[i]==="no").length;
    const pct = allItems.length ? Math.round(yesCnt/allItems.length*100) : 0;
    // Live risk: approx loss if SL is hit
    const rEntry = parseFloat(tf.entry), rSL = parseFloat(tf.sl), rSize = parseFloat(tf.size);
    const riskVal = (rEntry && rSL && rSize) ? Math.abs(rEntry - rSL) * rSize : null;

    return (
    <div style={{maxWidth:560, margin:"0 auto"}}>
      {editingTradeId ? (
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:`${T.s[4]}px ${T.s[4]}px`,marginBottom:T.s[5],border:`1px solid ${T.amb}`,background:T.amb+"11"}}>
          <div>
            <div style={{...sty.label,color:T.amb,marginBottom:T.s[1]}}>editing trade</div>
            <div style={{color:T.text,fontSize:T.size.body}}>{tf.instrument} · {tf.date}</div>
          </div>
          <button onClick={cancelEdit} style={{...sty.btn(),color:T.mut}}>cancel edit</button>
        </div>
      ) : (
        <Sec n="01" title="new entry"/>
      )}

      {/* Pre-trade status banner: checklist + plan */}
      <div style={{display:"grid",gridTemplateColumns:matchingPlan?"1fr 1fr":"1fr",gap:T.s[3],marginBottom:T.s[6]}}>
        {/* Checklist status */}
        <div onClick={()=>setDrawer("checklist")} style={{padding:T.s[4],border:T.rule1,cursor:"pointer"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
            <span style={sty.label}>checklist</span>
            <span style={{color:pct>=80?T.gr:pct>=50?T.amb:T.mut,fontSize:T.size.h3,fontFamily:"'JetBrains Mono', monospace",fontWeight:T.weight.light}}>{pct}%</span>
          </div>
          <div style={{display:"flex",gap:T.s[3],marginTop:T.s[2],fontSize:T.size.tiny,color:T.mut}}>
            <span><span style={{color:T.gr}}>{yesCnt}</span> yes</span>
            <span><span style={{color:T.rd}}>{noCnt}</span> no</span>
            <span style={{color:T.mut2,marginLeft:"auto"}}>tap to open →</span>
          </div>
        </div>
        {/* Matching plan */}
        {matchingPlan && (
          <div onClick={()=>{linkTradeToPlan(matchingPlan.id, null); setTab("plans");}} style={{padding:T.s[4],border:`1px solid ${T.amb}`,cursor:"pointer"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
              <span style={{...sty.label,color:T.amb}}>plan ready</span>
              <span style={{color:matchingPlan.bias==="Bullish"?T.gr:matchingPlan.bias==="Bearish"?T.rd:T.mut,fontSize:T.size.small}}>{matchingPlan.bias?.toLowerCase()}</span>
            </div>
            <div style={{color:T.text,fontSize:T.size.small,marginTop:T.s[2],overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{matchingPlan.setup||"—"}</div>
            {matchingPlan.target1 && <div style={{fontSize:T.size.tiny,color:T.mut,marginTop:T.s[1]}}>sl {matchingPlan.sl} · t1 {matchingPlan.target1}</div>}
          </div>
        )}
      </div>

      {/* instrument pills */}
      <div style={{marginBottom:T.s[5]}}>
        <label style={sty.label}>instrument</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:T.s[2]}}>
          {instruments.map(i => (
            <button key={i} onClick={()=>updateTf({instrument:i, segment: tf.isOption ? (detectSegment(i,tf.setup).includes("Commodity")?"Commodity Options":"F&O Options") : detectSegment(i,tf.setup)})}
              style={{background:tf.instrument===i?T.amb:"transparent", color:tf.instrument===i?T.bg:T.mut, border:`1px solid ${tf.instrument===i?T.amb:T.mut2}`, padding:`${T.s[2]}px ${T.s[3]}px`, fontSize:T.size.small, cursor:"pointer", fontFamily:"'JetBrains Mono', monospace", letterSpacing:".05em"}}>
              {i}
            </button>
          ))}
        </div>
      </div>

      {/* direction */}
      <div style={{marginBottom:T.s[5]}}>
        <label style={sty.label}>direction</label>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:T.s[2]}}>
          {["Long","Short"].map(d => (
            <button key={d} onClick={()=>updateTf({direction:d})}
              style={{background:tf.direction===d?(d==="Long"?T.gr:T.rd)+"22":"transparent", color:tf.direction===d?(d==="Long"?T.gr:T.rd):T.mut, border:`1px solid ${tf.direction===d?(d==="Long"?T.gr:T.rd):T.mut2}`, padding:`${T.s[3]}px`, fontSize:T.size.body, cursor:"pointer", fontFamily:"'JetBrains Mono', monospace", textTransform:"uppercase", letterSpacing:".14em"}}>
              {d==="Long"?"▲ long":"▼ short"}
            </button>
          ))}
        </div>
      </div>

      {/* segment */}
      <div style={{marginBottom:T.s[5]}}>
        <label style={sty.label}>segment</label>
        <select style={sty.select} value={tf.segment} onChange={e=>{const s=e.target.value; updateTf({segment:s, isOption:s.includes("Options")});}}>
          {SEGMENTS.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* setups — multi-select */}
      <div style={{marginBottom:T.s[5]}}>
        <label style={sty.label}>setups <span style={{color:T.mut2,textTransform:"none",letterSpacing:0,fontSize:T.size.tiny}}>· tap to pick one or more</span></label>
        <div style={{display:"flex",flexWrap:"wrap",gap:T.s[2],marginTop:T.s[2]}}>
          {setups.map(s => {
            const sel = (tf.setups||[]).includes(s);
            return (
              <button key={s} onClick={()=>{
                const cur = tf.setups||[];
                const next = sel ? cur.filter(x=>x!==s) : [...cur, s];
                setTf({...tf, setups: next, setup: next.join(", ")});
              }} style={{padding:`${T.s[2]}px ${T.s[3]}px`, border:`1px solid ${sel?T.amb:T.rule}`, background:sel?T.amb:"transparent", color:sel?T.bg:T.mut, cursor:"pointer", fontSize:T.size.small, fontFamily:"'JetBrains Mono', monospace"}}>{s}</button>
            );
          })}
        </div>
      </div>

      {/* type */}
      <div style={{marginBottom:T.s[5]}}>
        <Field label="type"><select style={sty.select} value={tf.tradeType} onChange={e=>setTf({...tf,tradeType:e.target.value})}>{tradeTypes.map(t=><option key={t}>{t}</option>)}</select></Field>
      </div>

      {/* options — shown when an options segment is selected */}
      {(tf.segment||"").includes("Options") && (() => {
        const isMulti = ((tf.setups||[]).some(s=>/straddle|strangle/i.test(s))) || /straddle|strangle/i.test(tf.setup||"");
        // the directional VIEW implied by the combo (P&L itself follows buy/sell of premium)
        const viewOf = (side, type) => (side==="Buy") === (type==="CE") ? "Long" : "Short";
        return (
        <div style={{marginBottom:T.s[5], border:T.rule1, padding:T.s[4]}}>
          <div style={{...sty.label,marginBottom:T.s[3],color:T.amb}}>options · {tf.segment}{isMulti ? " · two legs" : ""}</div>
          {isMulti ? (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:T.s[4],marginBottom:T.s[4]}}>
              <Field label="strike · leg 1">
                <input type="number" style={sty.input} value={tf.strike} onChange={e=>setTf({...tf,strike:e.target.value})}/>
                <div style={{display:"flex",gap:T.s[2],marginTop:T.s[2]}}>
                  {["CE","PE"].map(o=><button key={o} onClick={()=>setTf({...tf,optType:o})} style={{flex:1,...sty.btn(),background:tf.optType===o?T.amb:"transparent",color:tf.optType===o?T.bg:T.text}}>{o}</button>)}
                </div>
              </Field>
              <Field label="strike · leg 2">
                <input type="number" style={sty.input} value={tf.strike2||""} onChange={e=>setTf({...tf,strike2:e.target.value})}/>
                <div style={{display:"flex",gap:T.s[2],marginTop:T.s[2]}}>
                  {["CE","PE"].map(o=><button key={o} onClick={()=>setTf({...tf,optType2:o})} style={{flex:1,...sty.btn(),background:(tf.optType2||"PE")===o?T.amb:"transparent",color:(tf.optType2||"PE")===o?T.bg:T.text}}>{o}</button>)}
                </div>
              </Field>
            </div>
          ) : (
            <div style={{marginBottom:T.s[4]}}>
              <Field label="strike"><input type="number" style={sty.input} value={tf.strike} onChange={e=>setTf({...tf,strike:e.target.value})}/></Field>
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:isMulti?"1fr":"1fr 1fr",gap:T.s[4]}}>
            {!isMulti && (
              <Field label="type">
                <div style={{display:"flex",gap:T.s[2]}}>
                  {["CE","PE"].map(o=><button key={o} onClick={()=>updateTf({optType:o, direction:viewOf(tf.optSide||"Buy", o)})} style={{flex:1,...sty.btn(),background:tf.optType===o?T.amb:"transparent",color:tf.optType===o?T.bg:T.text}}>{o}</button>)}
                </div>
              </Field>
            )}
            <Field label={isMulti ? "buy / sell (both legs)" : "buy / sell"}>
              <div style={{display:"flex",gap:T.s[2]}}>
                {["Buy","Sell"].map(o=><button key={o} onClick={()=>updateTf({optSide:o, direction:isMulti ? tf.direction : viewOf(o, tf.optType||"CE")})} style={{flex:1,...sty.btn(),background:tf.optSide===o?(o==="Buy"?T.gr:T.rd)+"22":"transparent",color:tf.optSide===o?(o==="Buy"?T.gr:T.rd):T.text,border:`1px solid ${tf.optSide===o?(o==="Buy"?T.gr:T.rd):T.mut2}`}}>{o.toLowerCase()}</button>)}
              </div>
            </Field>
          </div>
          {isMulti && <div style={{color:T.mut2,fontSize:T.size.tiny,marginTop:T.s[3],lineHeight:1.5}}>logged as one trade — enter the combined premium of both legs in entry/exit. brokerage counts each fill as two orders automatically.</div>}
          {!isMulti && <div style={{color:T.mut2,fontSize:T.size.tiny,marginTop:T.s[3],lineHeight:1.5}}>p&l follows buy/sell of the premium — buying a put profits when premium rises, even though the view is short.</div>}
        </div>
        );
      })()}

      {/* prices */}
      {(() => {
        const multiE = !!editingTradeId && (tf.entries||[]).length > 1;
        const multiX = !!editingTradeId && (tf.exits||[]).length > 1;
        const lock = { readOnly:true, style:{...sty.input, opacity:.55, cursor:"not-allowed"} };
        return (
        <>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:T.s[4],marginBottom:(multiE||multiX)?T.s[2]:T.s[5]}}>
          <Field label={multiE?"entry (avg)":"entry"}><input type="number" {...(multiE?lock:{style:sty.input})} value={tf.entry} onChange={e=>{ if(!multiE) updateTf({entry:e.target.value}); }}/></Field>
          <Field label="stop loss"><input type="number" style={sty.input} value={tf.sl} onChange={e=>setTf({...tf,sl:e.target.value})}/></Field>
          <Field label={multiX?"exit (avg)":"exit (optional)"}><input type="number" {...(multiX?lock:{style:sty.input})} value={tf.exitPrice} onChange={e=>{ if(!multiX) updateTf({exitPrice:e.target.value}); }} placeholder="leave blank for open"/></Field>
        </div>
        {(multiE||multiX) && (
          <div style={{color:T.amb,fontSize:T.size.tiny,marginBottom:T.s[5],lineHeight:1.5}}>this trade has multiple {multiE&&multiX?"entry and exit":multiE?"entry":"exit"} orders — these prices are weighted averages and can't be typed over. edit the exact fills in the trade's position legs section.</div>
        )}

        {/* size */}
        <div style={{marginBottom:T.s[5]}}>
          <Field label={multiE?"position size (from legs)":"position size"}><input type="number" {...(multiE?lock:{style:sty.input})} value={tf.size} onChange={e=>{ if(!multiE) updateTf({size:e.target.value}); }}/></Field>
        </div>
        </>
        );
      })()}

      {/* extra orders — log each fill for exact brokerage (₹20 per order) */}
      {!editingTradeId && (
        <div style={{border:`1px solid ${T.mut2}`, padding:`${T.s[4]}px ${T.s[5]}px`, marginBottom:T.s[5]}}>
          <div style={{...sty.label, color:T.amb}}>extra orders</div>
          <div style={{color:T.mut2, fontSize:T.size.tiny, margin:`${T.s[2]}px 0 ${T.s[3]}px`, lineHeight:1.5}}>your entry + exit above already count as 2 orders. if you scaled in or out, add each additional fill here — brokerage is ₹20 per order.</div>
          <div style={{display:"grid", gridTemplateColumns:isMob?"1fr":"1fr 1fr", gap:T.s[5]}}>
            <div>
              <div style={{...sty.label, color:T.gr, fontSize:T.size.tiny, marginBottom:T.s[2]}}>extra entries</div>
              {(tf.entryLegs||[]).map((l,i)=>(
                <div key={i} style={{display:"flex",gap:T.s[2],marginBottom:T.s[2],alignItems:"center"}}>
                  <input type="number" placeholder="price" value={l.price} onChange={e=>{const a=[...tf.entryLegs]; a[i]={...a[i],price:e.target.value}; setTf({...tf,entryLegs:a});}} style={{...sty.input,padding:`${T.s[2]}px ${T.s[3]}px`}}/>
                  <input type="number" placeholder="size" value={l.size} onChange={e=>{const a=[...tf.entryLegs]; a[i]={...a[i],size:e.target.value}; setTf({...tf,entryLegs:a});}} style={{...sty.input,padding:`${T.s[2]}px ${T.s[3]}px`}}/>
                  <button onClick={()=>setTf({...tf,entryLegs:tf.entryLegs.filter((_,j)=>j!==i)})} style={{background:"transparent",border:"none",color:T.rd,cursor:"pointer",fontSize:16,padding:0}}>×</button>
                </div>
              ))}
              <button onClick={()=>setTf({...tf,entryLegs:[...(tf.entryLegs||[]),{price:"",size:""}]})} style={{...sty.btn(),width:"100%",borderColor:T.gr,color:T.gr,fontSize:T.size.tiny}}>+ entry order</button>
            </div>
            <div>
              <div style={{...sty.label, color:T.rd, fontSize:T.size.tiny, marginBottom:T.s[2]}}>extra exits</div>
              {(tf.exitLegs||[]).map((l,i)=>(
                <div key={i} style={{display:"flex",gap:T.s[2],marginBottom:T.s[2],alignItems:"center"}}>
                  <input type="number" placeholder="price" value={l.price} onChange={e=>{const a=[...tf.exitLegs]; a[i]={...a[i],price:e.target.value}; setTf({...tf,exitLegs:a});}} style={{...sty.input,padding:`${T.s[2]}px ${T.s[3]}px`}}/>
                  <input type="number" placeholder="size" value={l.size} onChange={e=>{const a=[...tf.exitLegs]; a[i]={...a[i],size:e.target.value}; setTf({...tf,exitLegs:a});}} style={{...sty.input,padding:`${T.s[2]}px ${T.s[3]}px`}}/>
                  <button onClick={()=>setTf({...tf,exitLegs:tf.exitLegs.filter((_,j)=>j!==i)})} style={{background:"transparent",border:"none",color:T.rd,cursor:"pointer",fontSize:16,padding:0}}>×</button>
                </div>
              ))}
              <button onClick={()=>setTf({...tf,exitLegs:[...(tf.exitLegs||[]),{price:"",size:""}]})} style={{...sty.btn(),width:"100%",borderColor:T.rd,color:T.rd,fontSize:T.size.tiny}}>+ exit order</button>
            </div>
          </div>
          <div style={{color:T.mut, fontSize:T.size.tiny, marginTop:T.s[3], borderTop:T.rule1, paddingTop:T.s[2]}}>
            {(tf.entry?1:0)+(tf.exitPrice?1:0)+(tf.entryLegs||[]).filter(l=>l.price&&l.size).length+(tf.exitLegs||[]).filter(l=>l.price&&l.size).length} orders · est. brokerage <span style={{color:T.text,fontFamily:"'JetBrains Mono', monospace"}}>₹{20*((tf.entry?1:0)+(tf.exitPrice?1:0)+(tf.entryLegs||[]).filter(l=>l.price&&l.size).length+(tf.exitLegs||[]).filter(l=>l.price&&l.size).length)}</span>
          </div>
        </div>
      )}

      {/* live risk — approx loss if SL hit */}
      {riskVal != null && (
        <div style={{border:`1px solid ${T.rd}`, padding:`${T.s[4]}px ${T.s[5]}px`, marginBottom:T.s[5], display:"flex", justifyContent:"space-between", alignItems:"center", gap:T.s[4]}}>
          <div>
            <div style={sty.label}>approx risk if SL hit</div>
            <div style={{color:T.rd, fontSize:T.size.h2, fontFamily:"'JetBrains Mono', monospace", fontWeight:T.weight.light}}>−{fmt(riskVal)}</div>
            <div style={{color:T.mut2, fontSize:T.size.tiny, marginTop:T.s[1]}}>{Math.abs(rEntry-rSL).toFixed(2)} pts × {rSize}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={sty.label}>of capital</div>
            <div style={{color: settings.capital && (riskVal/settings.capital*100)>1 ? T.amb : T.mut, fontSize:T.size.body, fontFamily:"'JetBrains Mono', monospace"}}>{settings.capital ? (riskVal/settings.capital*100).toFixed(2)+"%" : "—"}</div>
          </div>
        </div>
      )}

      {/* dates — entry day vs the day the trade was closed (P&L lands on exit date) */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:T.s[4],marginBottom:T.s[5]}}>
        <Field label="entry date"><input type="date" style={sty.input} value={tf.date||""} onChange={e=>setTf({...tf,date:e.target.value})}/></Field>
        <Field label="exit date"><input type="date" style={sty.input} value={tf.exitDate||""} onChange={e=>setTf({...tf,exitDate:e.target.value})}/></Field>
      </div>

      {/* times — for holding-duration tracking */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:T.s[4],marginBottom:T.s[5]}}>
        <Field label="entry time"><input type="time" style={sty.input} value={tf.time||""} onChange={e=>setTf({...tf,time:e.target.value})}/></Field>
        <Field label="exit time"><input type="time" style={sty.input} value={tf.exitTime||""} onChange={e=>setTf({...tf,exitTime:e.target.value})} placeholder="for holding time"/></Field>
      </div>

      {/* actual charges — match the broker contract note exactly (overrides the estimate) */}
      <div style={{marginBottom:T.s[5]}}>
        <Field label="actual charges (optional)"><input type="number" style={sty.input} value={tf.actualCharges||""} onChange={e=>updateTf({actualCharges:e.target.value})} placeholder="total from your contract note — overrides the estimate"/></Field>
        <div style={{color:T.mut2,fontSize:T.size.tiny,marginTop:T.s[2],lineHeight:1.5}}>the estimate can't know contract lot sizes (e.g. crude = 100 barrels/lot). enter the real total from Zerodha here and P&L + charges match exactly.</div>
      </div>

      {/* live preview */}
      {tf.entry && tf.exitPrice && tf.size && parseFloat(tf.totalCharges||0) > 0 && (
        <div style={{borderTop:T.rule1, borderBottom:T.rule1, padding:`${T.s[5]}px 0`, marginBottom:T.s[5], display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:T.s[4]}}>
          <div>
            <div style={sty.label}>gross</div>
            <div style={{...sty.heroNum(parseFloat(tf.grossPnl)>=0?T.gr:T.rd, T.size.h2)}}>{fmt(parseFloat(tf.grossPnl))}</div>
          </div>
          <div>
            <div style={sty.label}>charges</div>
            <div style={{...sty.heroNum(T.rd, T.size.h2)}}>-{fmt(parseFloat(tf.totalCharges))}</div>
            <div style={{color:T.mut2,fontSize:T.size.tiny,marginTop:T.s[1]}}>brk {parseFloat(tf.brokerage).toFixed(0)} · stt {parseFloat(tf.stt).toFixed(0)} · gst {parseFloat(tf.gst).toFixed(0)}</div>
          </div>
          <div>
            <div style={sty.label}>net p&l</div>
            <div style={{...sty.heroNum(parseFloat(tf.pnl)>=0?T.gr:T.rd, T.size.h2)}}>{fmt(parseFloat(tf.pnl))}</div>
          </div>
        </div>
      )}

      {/* grade */}
      <div style={{marginBottom:T.s[5]}}>
        <label style={sty.label}>grade</label>
        <div style={{display:"flex",gap:T.s[2]}}>
          {GRADES.map(g => (
            <button key={g} onClick={()=>setTf({...tf,grade:g})} style={{flex:1, background:tf.grade===g?T.amb:"transparent", color:tf.grade===g?T.bg:T.mut, border:`1px solid ${tf.grade===g?T.amb:T.mut2}`, padding:`${T.s[3]}px`, cursor:"pointer", fontFamily:"'JetBrains Mono', monospace", fontSize:T.size.body}}>
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* rules + emotion */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:T.s[4],marginBottom:T.s[5]}}>
        <Field label="followed rules?">
          <div style={{display:"flex",gap:T.s[2]}}>
            {["Yes","No","Partial"].map(v => (
              <button key={v} onClick={()=>setTf({...tf,followedRules:v})} style={{flex:1, background:tf.followedRules===v?(v==="Yes"?T.gr+"22":v==="No"?T.rd+"22":T.amb+"22"):"transparent", color:tf.followedRules===v?(v==="Yes"?T.gr:v==="No"?T.rd:T.amb):T.mut, border:`1px solid ${tf.followedRules===v?(v==="Yes"?T.gr:v==="No"?T.rd:T.amb):T.mut2}`, padding:`${T.s[3]}px ${T.s[2]}px`, cursor:"pointer", fontFamily:"'JetBrains Mono', monospace", fontSize:T.size.small, textTransform:"lowercase"}}>{v.toLowerCase()}</button>
            ))}
          </div>
        </Field>
        <Field label="emotion"><select style={sty.select} value={tf.emotion} onChange={e=>setTf({...tf,emotion:e.target.value})}>{emotions.map(e=><option key={e}>{e}</option>)}</select></Field>
      </div>

      {/* Screenshot — upload or URL */}
      <div style={{marginBottom:T.s[5]}}>
        <label style={sty.label}>screenshot (optional)</label>
        <div style={{display:"flex",gap:T.s[2],marginTop:T.s[2],marginBottom:T.s[2]}}>
          <label style={{...sty.btn(), flex:1, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer"}}>
            upload image
            <input type="file" accept="image/*" style={{display:"none"}} onChange={async e=>{const f=e.target.files[0]; if(f){try{const d=await compressImage(f); setTf({...tf,screenshot:d});}catch{alert("could not read that image");} e.target.value="";}}}/>
          </label>
          {tf.screenshot && <button onClick={()=>setTf({...tf,screenshot:""})} style={{...sty.btn(), color:T.rd}}>remove</button>}
        </div>
        <input type="url" style={sty.input} value={(tf.screenshot||"").startsWith("data:")?"":(tf.screenshot||"")} onChange={e=>setTf({...tf,screenshot:e.target.value})} placeholder="…or paste a tradingview / imgur link"/>
        {tf.screenshot && (
          <img src={tf.screenshot} alt="trade" style={{marginTop:T.s[3],maxWidth:"100%",border:T.rule1}} onError={e=>{e.target.style.display="none";}}/>
        )}
      </div>

      {/* notes */}
      <div style={{marginBottom:T.s[5]}}>
        <Field label="notes (optional)"><textarea style={sty.textarea} value={tf.notes} onChange={e=>setTf({...tf,notes:e.target.value})} placeholder="setup context, mistakes, what to remember..."/></Field>
      </div>

      {/* Spacer to ensure scroll doesn't hide content behind sticky button on mobile */}
      <div style={{height: isMob ? 80 : 0}}/>

      {/* Sticky CTA on mobile, normal on desktop */}
      <div style={isMob ? {
        position:"fixed", left:0, right:0,
        bottom:`calc(56px + env(safe-area-inset-bottom))`,  // above bottom nav
        padding:T.s[3], background:T.bg, borderTop:T.rule1, zIndex:48
      } : {marginTop:T.s[5]}}>
        <button onClick={logTrade} style={{
          ...sty.btn("primary"),
          width:"100%",
          padding:`${T.s[4]}px`,
          fontSize:T.size.body,
          minHeight:52,
        }}>
          {editingTradeId ? "update trade →" : (tf.exitPrice ? "log closed trade →" : "log open trade →")}
        </button>
      </div>
    </div>
    );
  };

  /* ── TRADES — clean list, expand on click ── */
  const filteredTrades = trades.filter(t => {
    if (fInstr !== "All" && t.instrument !== fInstr) return false;
    if (fDir   !== "All" && t.direction  !== fDir)   return false;
    if (search) {
      const q = search.toLowerCase();
      if (!t.instrument?.toLowerCase().includes(q) && !t.setup?.toLowerCase().includes(q) && !(t.notes||"").toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const filtPnl  = filteredTrades.filter(t=>t.pnl).reduce((s,t)=>s+parseFloat(t.pnl),0);

  const renderTrades = () => (
    <div>
      <Sec n="01" title={`all trades · ${trades.length}`} right={`net ${fmt(filtPnl)}`}/>

      {/* filters */}
      <div style={{display:"grid", gridTemplateColumns:isMob?"1fr 1fr":"2fr 1fr 1fr", gap:T.s[3], marginBottom:T.s[5]}}>
        <input style={sty.input} placeholder="search..." value={search} onChange={e=>setSearch(e.target.value)}/>
        <select style={sty.select} value={fInstr} onChange={e=>setFInstr(e.target.value)}>
          <option>All</option>
          {[...new Set(trades.map(t=>t.instrument).filter(Boolean))].map(i => <option key={i}>{i}</option>)}
        </select>
        <select style={sty.select} value={fDir} onChange={e=>setFDir(e.target.value)}>
          <option>All</option><option>Long</option><option>Short</option>
        </select>
      </div>

      {/* list */}
      {!filteredTrades.length ? (
        <div style={{color:T.mut2,fontSize:T.size.small,padding:`${T.s[6]}px 0`}}>no trades match.</div>
      ) : (
        <div>
          {/* column header */}
          <div style={{display:"grid", gridTemplateColumns:isMob?"1fr 1fr auto":"100px 140px 80px 100px 100px 120px 60px 40px", gap:T.s[3], padding:`${T.s[2]}px 0`, borderBottom:T.rule1, marginBottom:T.s[1]}}>
            <span style={sty.label}>date / day</span>
            <span style={sty.label}>instrument</span>
            {!isMob && <span style={sty.label}>dir</span>}
            {!isMob && <span style={sty.label}>entry</span>}
            {!isMob && <span style={sty.label}>exit</span>}
            <span style={{...sty.label, textAlign:isMob?"right":"left"}}>p&l</span>
            {!isMob && <span style={sty.label}>r:r</span>}
            <span/>
          </div>
          {filteredTrades.map(t => {
            const exp = expanded === t.id;
            const net = parseFloat(t.pnl||0);
            return (
              <div key={t.id} style={{borderBottom:T.rule1}}>
                <div onClick={()=>setExpanded(exp?null:t.id)}
                  style={{display:"grid", gridTemplateColumns:isMob?"1fr 1fr auto":"100px 140px 80px 100px 100px 120px 60px 40px", gap:T.s[3], padding:`${T.s[3]}px 0`, cursor:"pointer", alignItems:"center"}}>
                  <span style={{color:T.mut,fontSize:T.size.small,fontFamily:"'JetBrains Mono', monospace"}}>
                    {t.date}
                    <span style={{display:"block",color:T.mut2,fontSize:T.size.tiny}}>{t.date?new Date(t.date+"T00:00:00").toLocaleDateString("en-US",{weekday:"short"}):""}</span>
                  </span>
                  <span style={{color:T.text,fontSize:T.size.body}}>{t.instrument}{(t.isOption||(t.segment||"").includes("Options")) && <span style={{display:"block",color:T.amb,fontSize:T.size.tiny}}>{t.strike} {t.optType}{t.strike2 ? ` + ${t.strike2} ${t.optType2||"PE"}` : ""} · {(t.optSide||"").toLowerCase()}</span>}</span>
                  {!isMob && <span style={{color:t.direction==="Long"?T.gr:T.rd,fontSize:T.size.small}}>{t.direction?.toLowerCase()}</span>}
                  {!isMob && <span style={{color:T.mut,fontFamily:"'JetBrains Mono', monospace",fontSize:T.size.small}}>{t.entry}</span>}
                  {!isMob && <span style={{color:T.mut,fontFamily:"'JetBrains Mono', monospace",fontSize:T.size.small}}>{t.exitPrice}</span>}
                  <span style={{color:t.status==="open"?T.amb:(net>=0?T.gr:T.rd),fontFamily:"'JetBrains Mono', monospace",fontSize:T.size.body, textAlign:isMob?"right":"left"}}>{t.status==="open"?"open":(t.pnl?fmt(net):"—")}</span>
                  {!isMob && <span style={{color:T.amb,fontSize:T.size.small}}>{t.rrAchieved||"—"}</span>}
                  <span style={{color:T.mut2,fontSize:T.size.small,textAlign:"right"}}>{exp?"▾":"▸"}</span>
                </div>

                {exp && (
                  <div style={{padding:`${T.s[5]}px ${T.s[3]}px ${T.s[6]}px`, background:T.surf}}>
                    {/* sticky action header — edit / delete always visible */}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:T.s[4],paddingBottom:T.s[3],borderBottom:T.rule1}}>
                      <div style={{...sty.label,color:T.amb}}>trade detail · {t.instrument}</div>
                      <div style={{display:"flex",gap:T.s[2]}}>
                        <button onClick={(e)=>{e.stopPropagation(); startEditingTrade(t);}}
                          style={{background:"transparent",color:T.amb,border:`1px solid ${T.amb}`,padding:`${T.s[2]}px ${T.s[4]}px`,fontSize:T.size.small,textTransform:"uppercase",letterSpacing:".14em",cursor:"pointer",fontFamily:"'JetBrains Mono', monospace",fontWeight:T.weight.medium,minHeight:36,touchAction:"manipulation"}}>
                          edit
                        </button>
                        <button onClick={(e)=>{e.stopPropagation(); if(confirm("Delete this trade?")) delTrade(t.id);}}
                          style={{background:"transparent",color:T.rd,border:`1px solid ${T.rd}`,padding:`${T.s[2]}px ${T.s[4]}px`,fontSize:T.size.small,textTransform:"uppercase",letterSpacing:".14em",cursor:"pointer",fontFamily:"'JetBrains Mono', monospace",fontWeight:T.weight.medium,minHeight:36,touchAction:"manipulation"}}>
                          delete
                        </button>
                      </div>
                    </div>
                    <div style={{display:"grid", gridTemplateColumns:isMob?"1fr 1fr":"repeat(4,1fr)", gap:T.s[4], marginBottom:T.s[6]}}>
                      {[
                        ["entry date",    `${t.date} ${t.time||""}`],
                        ["exit date",     t.exitDate ? `${t.exitDate} ${(t.exits&&t.exits.length&&t.exits[t.exits.length-1].time)||t.exitTime||""}` : (t.status==="open"?"open":"—")],
                        ...(t.isOption||(t.segment||"").includes("Options") ? [["option", `${t.strike||"—"} ${t.optType||""}${t.strike2?` + ${t.strike2} ${t.optType2||"PE"}`:""} · ${(t.optSide||"").toLowerCase()}`]] : []),
                        ["segment",       t.segment||"—"],
                        ["trade type",    t.tradeType||"—"],
                        ["direction",     t.direction, t.direction==="Long"?T.gr:T.rd],
                        ["entry",         t.entry||"—"],
                        ["exit",          t.exitPrice||"—"],
                        ["stop loss",     t.sl||"—"],
                        ["size",          t.size||"—"],
                        ["gross p&l",     t.grossPnl?fmt(parseFloat(t.grossPnl)):"—", parseFloat(t.grossPnl||0)>=0?T.gr:T.rd],
                        ["charges",       t.totalCharges?fmt2(parseFloat(t.totalCharges)):"—", T.rd],
                        ["net p&l",       fmt(net), net>=0?T.gr:T.rd],
                        ["r:r achieved",  t.rrAchieved||"—", T.amb],
                        ["grade",         t.grade||"—", t.grade==="A+"?T.amb:T.text],
                        ["rules",         t.followedRules||"—", t.followedRules==="Yes"?T.gr:t.followedRules==="No"?T.rd:T.mut],
                        ["emotion",       t.emotion||"—"],
                        ["setup",         t.setup||"—"],
                      ].map(([l,v,c]) => (
                        <div key={l}>
                          <div style={sty.label}>{l}</div>
                          <div style={{color:c||T.text, fontSize:T.size.body, fontFamily:"'JetBrains Mono', monospace"}}>{v}</div>
                        </div>
                      ))}
                    </div>

                    {/* charges — total only; tap to expand the breakdown */}
                    {parseFloat(t.totalCharges||0) > 0 && (() => {
                      const showCharges = expCharges === t.id;
                      return (
                      <div style={{borderTop:T.rule1,paddingTop:T.s[4],marginBottom:T.s[6]}}>
                        <div onClick={()=>setExpCharges(showCharges?null:t.id)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
                          <span style={{...sty.label,color:T.amb}}>total charges <span style={{color:T.mut2}}>{showCharges?"▾":"▸"}</span></span>
                          <span style={{fontFamily:"'JetBrains Mono', monospace",color:T.rd,fontSize:T.size.small}}>{fmt2(parseFloat(t.totalCharges))}</span>
                        </div>
                        {showCharges && (
                          <div style={{marginTop:T.s[3]}}>
                            {[
                              [`brokerage · ${(t.entries?.length||0)+(t.exits?.length||0)} orders`, t.brokerage],
                              ["STT",          t.stt],
                              ["exchange txn", t.txnCharges],
                              ["SEBI",         t.sebi],
                              ["GST (18%)",    t.gst],
                              ["stamp duty",   t.stamp],
                            ].map(([l,v]) => (
                              <div key={l} style={{display:"flex",justifyContent:"space-between",padding:`${T.s[1]}px 0`,fontSize:T.size.small,color:T.mut}}>
                                <span>{l}</span>
                                <span style={{fontFamily:"'JetBrains Mono', monospace",color:T.text}}>{v?fmt2(parseFloat(v)):"—"}</span>
                              </div>
                            ))}
                            <div style={{color:T.mut2,fontSize:T.size.tiny,marginTop:T.s[2],lineHeight:1.5}}>options STT 0.15% on sell premium · futures STT 0.05% · brokerage ₹20 per order · values use premium × qty</div>
                          </div>
                        )}
                      </div>
                      );
                    })()}

                    {/* Linked plan */}
                    {t.planId && plans.find(p=>p.id===t.planId) && (() => {
                      const p = plans.find(pl=>pl.id===t.planId);
                      return (
                        <div style={{borderTop:T.rule1,borderBottom:T.rule1,padding:`${T.s[4]}px 0`,marginBottom:T.s[5]}}>
                          <div style={{...sty.label,color:T.amb,marginBottom:T.s[3]}}>linked plan · {p.bias?.toLowerCase()} · {p.date}</div>
                          {p.setup && <div style={{color:T.text,fontSize:T.size.small,marginBottom:T.s[2]}}>{p.setup}</div>}
                          {(p.sl||p.target1) && (
                            <div style={{display:"flex",gap:T.s[5],fontSize:T.size.small,color:T.mut}}>
                              {p.sl && <span>sl&nbsp;<span style={{color:T.rd}}>{p.sl}</span></span>}
                              {p.target1 && <span>t1&nbsp;<span style={{color:T.gr}}>{p.target1}</span></span>}
                              {p.target2 && <span>t2&nbsp;<span style={{color:T.gr}}>{p.target2}</span></span>}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Checklist snapshot */}
                    {t.checklist && t.checklist.length > 0 && (
                      <div style={{borderTop:T.rule1,borderBottom:T.rule1,padding:`${T.s[4]}px 0`,marginBottom:T.s[5]}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:T.s[3]}}>
                          <span style={{...sty.label,color:T.amb}}>checklist at time of trade</span>
                          <span style={{color:T.mut,fontSize:T.size.small}}>
                            <span style={{color:T.gr}}>{t.checklistYes||0}</span> yes · <span style={{color:T.rd}}>{t.checklistNo||0}</span> no
                          </span>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:isMob?"1fr":"1fr 1fr",gap:T.s[2]}}>
                          {t.checklist.map((c,i) => (
                            <div key={i} style={{display:"flex",alignItems:"center",gap:T.s[2],fontSize:T.size.small}}>
                              <span style={{width:14,color:c.state==="yes"?T.gr:c.state==="no"?T.rd:T.mut2,fontFamily:"'JetBrains Mono', monospace"}}>{c.state==="yes"?"✓":c.state==="no"?"✗":"·"}</span>
                              <span style={{color:c.state==="yes"?T.text:c.state==="no"?T.mut:T.mut2}}>{c.item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes, mistakes, improvements */}
                    {(t.notes || t.mistakes || t.improvements) && (
                      <div style={{display:"grid", gridTemplateColumns:isMob?"1fr":"1fr 1fr 1fr", gap:T.s[5], marginBottom:T.s[5]}}>
                        {[["notes",t.notes],["mistakes",t.mistakes],["improvements",t.improvements]].filter(([,v])=>v).map(([l,v]) => (
                          <div key={l}>
                            <div style={sty.label}>{l}</div>
                            <div style={{color:T.mut, fontSize:T.size.small, lineHeight:1.6}}>{v}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* screenshot */}
                    <div style={{borderTop:T.rule1,paddingTop:T.s[4],marginBottom:T.s[4]}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:T.s[3]}}>
                        <label style={{...sty.label,color:T.amb}}>screenshot</label>
                        <div style={{display:"flex",gap:T.s[2]}}>
                          <label style={{background:"transparent",color:T.mut,border:`1px solid ${T.rule}`,padding:`${T.s[1]}px ${T.s[3]}px`,fontSize:T.size.tiny,cursor:"pointer",fontFamily:"'JetBrains Mono', monospace"}}>
                            {t.screenshot?"replace":"upload"}
                            <input type="file" accept="image/*" style={{display:"none"}} onChange={async e=>{const f=e.target.files[0]; if(f){try{const d=await compressImage(f); pTrades(trades.map(x=>x.id===t.id?{...x,screenshot:d}:x));}catch{alert("could not read that image");} e.target.value="";}}}/>
                          </label>
                          {t.screenshot && <button onClick={()=>pTrades(trades.map(x=>x.id===t.id?{...x,screenshot:""}:x))} style={{background:"transparent",color:T.rd,border:`1px solid ${T.rd}`,padding:`${T.s[1]}px ${T.s[3]}px`,fontSize:T.size.tiny,cursor:"pointer",fontFamily:"'JetBrains Mono', monospace"}}>remove</button>}
                        </div>
                      </div>
                      {t.screenshot ? (
                        <a href={t.screenshot} target="_blank" rel="noopener noreferrer">
                          <img src={t.screenshot} alt="trade screenshot" style={{maxWidth:"100%",border:T.rule1,display:"block"}} onError={e=>{e.target.style.display="none";}}/>
                        </a>
                      ) : (
                        <div style={{color:T.mut2,fontSize:T.size.small,padding:`${T.s[3]}px 0`}}>no screenshot — tap upload to add one</div>
                      )}
                    </div>

                    {/* Post-trade reflection — editable */}
                    <div style={{borderTop:T.rule1,paddingTop:T.s[4],marginBottom:T.s[4]}}>
                      <label style={{...sty.label,color:T.amb,marginBottom:T.s[3]}}>post-trade reflection</label>
                      <textarea
                        style={{...sty.textarea, minHeight:80}}
                        value={reflectionDraft[t.id] !== undefined ? reflectionDraft[t.id] : (t.postReflection||"")}
                        onChange={e=>setReflectionDraft({...reflectionDraft,[t.id]:e.target.value})}
                        placeholder="how did it play out? what did you learn? would you take it again?"
                      />
                      {reflectionDraft[t.id] !== undefined && reflectionDraft[t.id] !== t.postReflection && (
                        <div style={{display:"flex",gap:T.s[2],marginTop:T.s[2]}}>
                          <button onClick={()=>{updateTrade(t.id,{postReflection:reflectionDraft[t.id]}); const d={...reflectionDraft}; delete d[t.id]; setReflectionDraft(d);}} style={{...sty.btn("primary"),padding:`${T.s[2]}px ${T.s[4]}px`,fontSize:T.size.tiny}}>save reflection</button>
                          <button onClick={()=>{const d={...reflectionDraft}; delete d[t.id]; setReflectionDraft(d);}} style={{...sty.btn(),padding:`${T.s[2]}px ${T.s[4]}px`,fontSize:T.size.tiny}}>cancel</button>
                        </div>
                      )}
                    </div>

                    {/* Legs (entries + exits) */}
                    {(()=>{
                      const { entries, exits } = tradeLegs(t);
                      const totalEntrySize = sumSize(entries);
                      const totalExitSize  = sumSize(exits);
                      const openSize = totalEntrySize - totalExitSize;
                      return (
                        <div style={{borderTop:T.rule1,paddingTop:T.s[5],marginBottom:T.s[5]}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:T.s[2]}}>
                            <span style={{...sty.label,color:T.amb}}>position legs</span>
                            <span style={{color:T.mut,fontSize:T.size.small,fontFamily:"'JetBrains Mono', monospace"}}>
                              filled <span style={{color:T.gr}}>{totalEntrySize}</span> · closed <span style={{color:T.rd}}>{totalExitSize}</span> · open <span style={{color:t.status==="open"||t.status==="partial"?T.amb:T.mut}}>{openSize}</span>
                            </span>
                          </div>
                          <div style={{color:T.mut2,fontSize:T.size.tiny,marginBottom:T.s[3],lineHeight:1.5}}>each fill is one order = ₹20 brokerage. add every buy/sell here and charges update automatically · {entries.length + exits.length} orders so far</div>

                          {/* Entries table */}
                          {entries.length > 0 && (
                            <div style={{marginBottom:T.s[4]}}>
                              <div style={{...sty.label,color:t.direction==="Long"?T.gr:T.rd,marginBottom:T.s[2],fontSize:T.size.tiny}}>{t.direction==="Long"?"entries (buys)":"entries (sells)"}</div>
                              {entries.map((leg,i) => (
                                <div key={i} style={{display:"grid",gridTemplateColumns:isMob?"60px 1fr 1fr 30px":"80px 1fr 1fr 1fr 40px",gap:T.s[2],padding:`${T.s[2]}px 0`,borderBottom:T.rule1,fontSize:T.size.small,alignItems:"center"}}>
                                  <span style={{color:T.mut}}>#{i+1}</span>
                                  <span style={{color:T.text,fontFamily:"'JetBrains Mono', monospace"}}>{leg.size}</span>
                                  <span style={{color:T.text,fontFamily:"'JetBrains Mono', monospace"}}>@ {leg.price}</span>
                                  {!isMob && <span style={{color:T.mut}}>{leg.time||"—"}</span>}
                                  <button onClick={()=>{if(confirm("Remove this entry?")) removeLeg(t.id,"entry",i);}} style={{background:"transparent",border:"none",color:T.rd,cursor:"pointer",fontSize:14,padding:0}}>×</button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Exits table */}
                          {exits.length > 0 && (
                            <div style={{marginBottom:T.s[4]}}>
                              <div style={{...sty.label,color:t.direction==="Long"?T.rd:T.gr,marginBottom:T.s[2],fontSize:T.size.tiny}}>{t.direction==="Long"?"exits (sells)":"exits (buys)"}</div>
                              {exits.map((leg,i) => (
                                <div key={i} style={{display:"grid",gridTemplateColumns:isMob?"60px 1fr 1fr 30px":"80px 1fr 1fr 1fr 40px",gap:T.s[2],padding:`${T.s[2]}px 0`,borderBottom:T.rule1,fontSize:T.size.small,alignItems:"center"}}>
                                  <span style={{color:T.mut}}>#{i+1}</span>
                                  <span style={{color:T.text,fontFamily:"'JetBrains Mono', monospace"}}>{leg.size}</span>
                                  <span style={{color:T.text,fontFamily:"'JetBrains Mono', monospace"}}>@ {leg.price}</span>
                                  {!isMob && <span style={{color:T.mut}}>{leg.time||"—"}</span>}
                                  <button onClick={()=>{if(confirm("Remove this exit?")) removeLeg(t.id,"exit",i);}} style={{background:"transparent",border:"none",color:T.rd,cursor:"pointer",fontSize:14,padding:0}}>×</button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add leg controls — always available (you can add legs retroactively) */}
                          {true && (
                            <div style={{display:"grid",gridTemplateColumns:isMob?"1fr":"1fr 1fr",gap:T.s[4],marginTop:T.s[4]}}>
                              {/* Add Entry (pyramid in) */}
                              <div style={{padding:T.s[4],border:`1px solid ${T.mut2}`}}>
                                <div style={{...sty.label,color:T.gr,marginBottom:T.s[3]}}>add entry {openSize===0?"(retroactive)":"(pyramid in)"}</div>
                                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:T.s[2],marginBottom:T.s[2]}}>
                                  <input id={`ae-p-${t.id}`} type="number" placeholder="price" style={sty.input}/>
                                  <input id={`ae-s-${t.id}`} type="number" placeholder="size"  style={sty.input}/>
                                </div>
                                <div style={{marginBottom:T.s[3]}}>
                                  <label style={{...sty.label,fontSize:T.size.tiny}}>time (blank = now)</label>
                                  <input id={`ae-t-${t.id}`} type="time" style={sty.input}/>
                                </div>
                                <button onClick={()=>{
                                  const p = document.getElementById(`ae-p-${t.id}`).value;
                                  const s = document.getElementById(`ae-s-${t.id}`).value;
                                  const tm = document.getElementById(`ae-t-${t.id}`).value;
                                  if(!p||!s) return alert("Price and size required");
                                  addEntryLeg(t.id,{price:p,size:s,time:tm||nowT(),note:""});
                                  document.getElementById(`ae-p-${t.id}`).value="";
                                  document.getElementById(`ae-s-${t.id}`).value="";
                                  document.getElementById(`ae-t-${t.id}`).value="";
                                }} style={{...sty.btn(),width:"100%",borderColor:T.gr,color:T.gr}}>+ add entry</button>
                              </div>
                              {/* Add Exit (partial close) */}
                              <div style={{padding:T.s[4],border:`1px solid ${T.mut2}`}}>
                                <div style={{...sty.label,color:T.rd,marginBottom:T.s[3]}}>add exit{openSize>0?` · ${openSize} open`:" (retroactive)"}</div>
                                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:T.s[2],marginBottom:T.s[2]}}>
                                  <input id={`ax-p-${t.id}`} type="number" placeholder="price" style={sty.input}/>
                                  <input id={`ax-s-${t.id}`} type="number" placeholder={`size${openSize>0?` (${openSize})`:""}`} style={sty.input}/>
                                </div>
                                <div style={{marginBottom:T.s[3]}}>
                                  <label style={{...sty.label,fontSize:T.size.tiny}}>time (blank = now)</label>
                                  <input id={`ax-t-${t.id}`} type="time" style={sty.input}/>
                                </div>
                                <div style={{display:"flex",gap:T.s[2]}}>
                                  <button onClick={()=>{
                                    const p = document.getElementById(`ax-p-${t.id}`).value;
                                    const s = document.getElementById(`ax-s-${t.id}`).value || String(openSize);
                                    const tm = document.getElementById(`ax-t-${t.id}`).value;
                                    if(!p) return alert("Price required");
                                    if(parseFloat(s) <= 0) return alert("Size must be > 0");
                                    closeOpenTrade(t.id, p, s, tm);
                                    document.getElementById(`ax-p-${t.id}`).value="";
                                    document.getElementById(`ax-s-${t.id}`).value="";
                                    document.getElementById(`ax-t-${t.id}`).value="";
                                  }} style={{...sty.btn(),flex:1,borderColor:T.rd,color:T.rd}}>partial close</button>
                                  {openSize > 0 && (
                                    <button onClick={()=>{
                                      const p = document.getElementById(`ax-p-${t.id}`).value;
                                      const tm = document.getElementById(`ax-t-${t.id}`).value;
                                      if(!p) return alert("Price required");
                                      closeOpenTrade(t.id, p, openSize, tm);
                                    }} style={{...sty.btn("primary"),flex:1}}>close all</button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}


                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  /* ── ANALYTICS ── */

  const setupReport = (list) => {
    const map = {};
    list.forEach(t => {
      const s = t.setup || "—";
      if (!map[s]) map[s] = { setup:s, n:0, w:0, pnl:0 };
      map[s].n++;
      map[s].pnl += parseFloat(t.pnl||0);
      if (parseFloat(t.pnl||0)>0) map[s].w++;
    });
    return Object.values(map)
      .filter(d => d.n >= 2)
      .map(d => ({...d, winRate: d.n?d.w/d.n*100:0, ev: d.n?d.pnl/d.n:0}))
      .sort((a,b) => b.ev - a.ev);
  };

  const winLossCompare = (list) => {
    const wins   = list.filter(t=>parseFloat(t.pnl)>0);
    const losses = list.filter(t=>parseFloat(t.pnl)<=0);
    const avg = (arr, key) => {
      if (!arr.length) return 0;
      return Math.round(arr.reduce((a,t)=>a+parseFloat(t[key]||0),0)/arr.length*100)/100;
    };
    return {
      wins:   { n:wins.length,   avgPnl:avg(wins,'pnl'),   avgRR:avg(wins,'rrAchieved'),   avgSize:avg(wins,'size'),   avgCharges:avg(wins,'totalCharges') },
      losses: { n:losses.length, avgPnl:avg(losses,'pnl'), avgRR:avg(losses,'rrAchieved'), avgSize:avg(losses,'size'), avgCharges:avg(losses,'totalCharges') },
    };
  };

  const calendarMonth = (list) => {
    const map = {}, cnt = {};
    list.forEach(t => { const d=pnlDate(t); map[d] = (map[d]||0) + parseFloat(t.pnl||0); cnt[d] = (cnt[d]||0) + 1; });
    const now = new Date();
    const year = now.getFullYear(), month = now.getMonth();
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month+1, 0).getDate();
    const cells = [];
    for (let i=0; i<first.getDay(); i++) cells.push(null);          // leading pad (Sun start)
    for (let d=1; d<=daysInMonth; d++) {
      const k = ymd(new Date(year, month, d));
      cells.push({ date:k, day:d, pnl:Math.round(map[k]||0), trades:cnt[k]||0 });
    }
    while (cells.length % 7 !== 0) cells.push(null);                 // trailing pad
    const weeks = [];
    for (let i=0; i<cells.length; i+=7) {
      const wk = cells.slice(i, i+7);
      weeks.push({
        cells: wk,
        total: wk.reduce((s,c)=> s + (c?c.pnl:0), 0),
        trades: wk.reduce((s,c)=> s + (c?c.trades:0), 0),
      });
    }
    const monthTotal = Math.round(weeks.reduce((s,w)=>s+w.total, 0));
    const monthTrades = weeks.reduce((s,w)=>s+w.trades, 0);
    const monthName = first.toLocaleDateString("en-US",{ month:"long", year:"numeric" });
    return { weeks, monthTotal, monthTrades, monthName };
  };

  const aData = (() => {
    let list = closed;
    if (analyticsView === "intraday") list = list.filter(t=>t.tradeType==="Intraday");
    else if (analyticsView === "swing") list = list.filter(t=>t.tradeType!=="Intraday");
    return list;
  })();

  const renderAnalytics = () => {
    const setups2 = setupReport(aData);
    const wl      = winLossCompare(aData);
    const cal     = calendarMonth(aData);
    const aPnl    = aData.reduce((s,t)=>s+parseFloat(t.pnl||0),0);

    // ── extended analytics computations ──
    const durMin = (t) => {
      const eT = (t.entries && t.entries[0] && t.entries[0].time) || t.time || "";
      const xT = (t.exits && t.exits.length && t.exits[t.exits.length-1].time) || "";
      if (!eT || !xT) return null;
      const e = new Date(`${t.date}T${eT}`);
      const x = new Date(`${(t.exitDate||t.date)}T${xT}`);
      if (isNaN(e.getTime()) || isNaN(x.getTime())) return null;
      if (x < e) return null;                 // exit before entry = bad/reversed time data, skip
      const m = (x - e) / 60000;
      return m < 60*24 ? m : null;
    };
    const withDur = aData.map(t => ({ t, d:durMin(t) })).filter(o => o.d !== null);
    const avgOf   = (arr) => arr.length ? arr.reduce((s,v)=>s+v,0)/arr.length : 0;
    const fmtDur  = (m) => {
      if (m == null) return "—";
      const tot = Math.round(m*60), h = Math.floor(tot/3600), mm = Math.floor((tot%3600)/60), ss = tot%60;
      return h ? `${h}h ${mm}m` : mm ? `${mm}m ${ss}s` : `${ss}s`;
    };
    const winsA = aData.filter(t=>parseFloat(t.pnl)>0);
    const lossA = aData.filter(t=>parseFloat(t.pnl)<=0);
    const gwA   = winsA.reduce((s,t)=>s+parseFloat(t.pnl||0),0);
    const glA   = Math.abs(lossA.reduce((s,t)=>s+parseFloat(t.pnl||0),0));
    const pfA   = glA ? (gwA/glA).toFixed(2) : "—";
    const winRateA = aData.length ? (winsA.length/aData.length*100) : 0;
    const avgWinA  = winsA.length ? gwA/winsA.length : 0;
    const avgLossA = lossA.length ? -glA/lossA.length : 0;
    const wlRatio  = avgLossA ? Math.abs(avgWinA/avgLossA).toFixed(2) : "—";
    const totalContracts = Math.round(aData.reduce((s,t)=>s+(parseFloat(t.size)||0),0));
    const dayMap = {};
    aData.forEach(t => { const d=pnlDate(t); (dayMap[d] = dayMap[d] || []).push(t); });
    const dayEntries = Object.entries(dayMap).map(([date, ts]) => ({ date, pnl:ts.reduce((s,t)=>s+parseFloat(t.pnl||0),0), n:ts.length }));
    const winDays    = dayEntries.filter(d=>d.pnl>0).length;
    const dayWinRate = dayEntries.length ? (winDays/dayEntries.length*100) : 0;
    const bestDay    = dayEntries.reduce((b,d)=> d.pnl>(b?b.pnl:-Infinity)?d:b, null);
    const bestDayPct = (aPnl>0 && bestDay) ? (bestDay.pnl/aPnl*100) : 0;
    const bestTrade  = aData.reduce((b,t)=> parseFloat(t.pnl)>(b?parseFloat(b.pnl):-Infinity)?t:b, null);
    const worstTrade = aData.reduce((b,t)=> parseFloat(t.pnl)<(b?parseFloat(b.pnl):Infinity)?t:b, null);
    const bestWin    = bestTrade  && parseFloat(bestTrade.pnl)  > 0 ? bestTrade  : null;
    const worstLoss  = worstTrade && parseFloat(worstTrade.pnl) < 0 ? worstTrade : null;
    const dailySeries = [...dayEntries].sort((a,b)=>a.date.localeCompare(b.date)).map(d=>({ date:d.date.slice(5), pnl:Math.round(d.pnl) }));
    const dirStat = (arr) => ({ n:arr.length, w:arr.filter(t=>parseFloat(t.pnl)>0).length, pnl:arr.reduce((s,t)=>s+parseFloat(t.pnl||0),0) });
    const longS  = dirStat(aData.filter(t=>t.direction==="Long"));
    const shortS = dirStat(aData.filter(t=>t.direction==="Short"));
    const durDefs = [
      {l:"< 1 min",  lo:0,   hi:1},
      {l:"1–5 min",  lo:1,   hi:5},
      {l:"5–10 min", lo:5,   hi:10},
      {l:"10–30 min",lo:10,  hi:30},
      {l:"30–60 min",lo:30,  hi:60},
      {l:"1–2 hr",   lo:60,  hi:120},
      {l:"2 hr+",    lo:120, hi:Infinity},
    ];
    const durBuckets = durDefs.map(b => {
      const items = withDur.filter(o => o.d >= b.lo && o.d < b.hi);
      const w = items.filter(o=>parseFloat(o.t.pnl)>0).length;
      return { label:b.l, n:items.length, w, winRate: items.length ? w/items.length*100 : 0, pnl: items.reduce((s,o)=>s+parseFloat(o.t.pnl||0),0) };
    });
    const dowNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const dowMap = {};
    aData.forEach(t => { const dw = new Date(pnlDate(t)+"T00:00:00").getDay(); (dowMap[dw]=dowMap[dw]||[]).push(t); });
    const dowStat = dowNames.map((name,i) => { const ts=dowMap[i]||[]; return { name, n:ts.length, pnl:ts.reduce((s,t)=>s+parseFloat(t.pnl||0),0) }; }).filter(d=>d.n>0);
    const mostActive  = dowStat.reduce((b,d)=> d.n>(b?b.n:-1)?d:b, null);
    const mostProfit  = dowStat.reduce((b,d)=> d.pnl>(b?b.pnl:-Infinity)?d:b, null);
    const leastProfit = dowStat.reduce((b,d)=> d.pnl<(b?b.pnl:Infinity)?d:b, null);
    const mostProfitDay = mostProfit && mostProfit.pnl > 0 ? mostProfit : null;

    return (
      <div>
        {/* view tabs */}
        <div style={{display:"flex",gap:T.s[3],marginBottom:T.s[6],borderBottom:T.rule1}}>
          {[["combined","combined"],["intraday","intraday"],["swing","swing"]].map(([k,l]) => (
            <button key={k} onClick={()=>setAnalyticsView(k)}
              style={{background:"transparent",border:"none",color:analyticsView===k?T.amb:T.mut,padding:`${T.s[3]}px ${T.s[4]}px`,cursor:"pointer",fontFamily:"\'JetBrains Mono\', monospace",fontSize:T.size.small,textTransform:"uppercase",letterSpacing:".14em",borderBottom:`1px solid ${analyticsView===k?T.amb:"transparent"}`,marginBottom:-1}}>{l}</button>
          ))}
        </div>

        {/* hero */}
        <div style={{marginBottom:T.s[8]}}>
          <div style={{color:T.amb,fontSize:T.size.label,textTransform:"uppercase",letterSpacing:".18em",marginBottom:T.s[3]}}>net p&l · {analyticsView}</div>
          <div style={sty.heroNum(aPnl>=0?T.gr:T.rd, isMob?T.size.h1:T.size.hero)}>{fmt(aPnl)}</div>
          <div style={{color:T.mut,fontSize:T.size.body,marginTop:T.s[3]}}>
            {aData.length} trades · win {aData.filter(t=>parseFloat(t.pnl)>0).length} · loss {aData.filter(t=>parseFloat(t.pnl)<=0).length}
          </div>
        </div>

        {/* §01 KEY METRICS */}
        <Sec n="01" title="key metrics" right={analyticsView}/>
        <div style={{borderLeft:T.rule1,borderBottom:T.rule1,display:"grid",gridTemplateColumns:isMob?"1fr 1fr":"repeat(4,1fr)",marginBottom:T.s[4]}}>
          {[
            {l:"win rate",             v:winRateA.toFixed(1)+"%",                      c:winRateA>=50?T.gr:T.rd},
            {l:"profit factor",        v:pfA,                                          c:T.amb},
            {l:"avg win : loss",       v:wlRatio,                                      c:T.text},
            {l:"day win %",            v:dayWinRate.toFixed(1)+"%",                    c:dayWinRate>=50?T.gr:T.rd},
            {l:"avg winning trade",    v:fmt(avgWinA),                                 c:T.gr},
            {l:"avg losing trade",     v:fmt(avgLossA),                                c:T.rd},
            {l:"best day % of profit", v:(bestDayPct>0?bestDayPct.toFixed(0):"0")+"%", c:T.text},
            {l:"avg duration",         v:fmtDur(avgOf(withDur.map(o=>o.d))||null),     c:T.text, sub:`${withDur.length} timed`},
            {l:"avg win duration",     v:fmtDur(avgOf(withDur.filter(o=>parseFloat(o.t.pnl)>0).map(o=>o.d))||null),  c:T.gr},
            {l:"avg loss duration",    v:fmtDur(avgOf(withDur.filter(o=>parseFloat(o.t.pnl)<=0).map(o=>o.d))||null), c:T.rd},
            {l:"total trades",         v:aData.length,                                c:T.text},
          ].map(m => (
            <div key={m.l} style={{borderTop:T.rule1,borderRight:T.rule1}}>
              <Metric label={m.l} value={m.v} color={m.c} sub={m.sub}/>
            </div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMob?"1fr":"1fr 1fr",gap:T.s[4],marginBottom:T.s[8]}}>
          <div style={{border:T.rule1,padding:`${T.s[4]}px ${T.s[5]}px`}}>
            <div style={sty.label}>best trade</div>
            <div style={{color:bestWin?T.gr:T.mut,fontSize:T.size.h2,fontFamily:"'JetBrains Mono', monospace",fontWeight:T.weight.light}}>{bestWin?fmt(bestWin.pnl):"—"}</div>
            {bestWin && <div style={{color:T.mut2,fontSize:T.size.tiny,marginTop:T.s[1]}}>{bestWin.direction} {bestWin.instrument} · {bestWin.date}</div>}
          </div>
          <div style={{border:T.rule1,padding:`${T.s[4]}px ${T.s[5]}px`}}>
            <div style={sty.label}>worst trade</div>
            <div style={{color:worstLoss?T.rd:T.mut,fontSize:T.size.h2,fontFamily:"'JetBrains Mono', monospace",fontWeight:T.weight.light}}>{worstLoss?fmt(worstLoss.pnl):"—"}</div>
            {worstLoss && <div style={{color:T.mut2,fontSize:T.size.tiny,marginTop:T.s[1]}}>{worstLoss.direction} {worstLoss.instrument} · {worstLoss.date}</div>}
          </div>
        </div>

        {/* §02 PERFORMANCE CALENDAR */}
        <Sec n="02" title="performance calendar" right={cal.monthName}/>
        <div style={{marginBottom:T.s[8]}}>
          <div style={{display:"grid",gridTemplateColumns:isMob?"repeat(7, 1fr)":"repeat(7, 1fr) 1.3fr",gap:isMob?2:3,maxWidth:isMob?"100%":540}}>
            {["S","M","T","W","T","F","S"].map((d,i) => <div key={"h"+i} style={{textAlign:"center",fontSize:T.size.tiny,color:T.mut,padding:T.s[1]}}>{d}</div>)}
            {!isMob && <div style={{textAlign:"right",fontSize:T.size.tiny,color:T.mut,padding:T.s[1],alignSelf:"center"}}>week</div>}
            {cal.weeks.flatMap((wk,wi) => [
              ...wk.cells.map((c,ci) => {
                if (!c) return <div key={`e${wi}-${ci}`}/>;
                const intensity = c.pnl===0 ? 0 : Math.min(1, Math.abs(c.pnl)/5000);
                const color = c.pnl > 0 ? `rgba(107,158,107,${0.3+intensity*0.7})`
                            : c.pnl < 0 ? `rgba(168,90,82,${0.3+intensity*0.7})` : "transparent";
                return (
                  <div key={`${wi}-${ci}`} title={`${c.date} · ${c.pnl?fmt(c.pnl):"no trades"}${c.trades?` · ${c.trades} trades`:""}`}
                    style={{aspectRatio:"1",background:color,border:T.rule1,fontSize:T.size.tiny,display:"flex",alignItems:"center",justifyContent:"center",color:c.pnl?T.text:T.mut2,fontFamily:"'JetBrains Mono', monospace"}}>
                    {c.day}
                  </div>
                );
              }),
              ...(isMob ? [] : [(
                <div key={`tot${wi}`} style={{display:"flex",flexDirection:"column",alignItems:"flex-end",justifyContent:"center",padding:`0 ${T.s[2]}px`,fontSize:T.size.tiny,fontFamily:"'JetBrains Mono', monospace",color: wk.trades ? (wk.total>=0?T.gr:T.rd) : T.mut2,borderLeft:T.rule1}}>
                  <span>{wk.trades ? fmt(wk.total) : "—"}</span>
                  {wk.trades>0 && <span style={{color:T.mut2,marginTop:2}}>{wk.trades}t</span>}
                </div>
              )]),
            ])}
          </div>
          {isMob && cal.weeks.some(wk=>wk.trades>0) && (
            <div style={{marginTop:T.s[4]}}>
              <div style={{...sty.label,marginBottom:T.s[2]}}>weekly totals</div>
              {cal.weeks.map((wk,wi) => wk.trades>0 ? (
                <div key={wi} style={{display:"flex",justifyContent:"space-between",padding:`${T.s[2]}px 0`,borderBottom:T.rule1,fontSize:T.size.small}}>
                  <span style={{color:T.mut}}>week {wi+1} · {wk.trades} trades</span>
                  <span style={{fontFamily:"'JetBrains Mono', monospace",color:wk.total>=0?T.gr:T.rd}}>{fmt(wk.total)}</span>
                </div>
              ) : null)}
            </div>
          )}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",maxWidth:isMob?"100%":540,marginTop:T.s[4],paddingTop:T.s[3],borderTop:T.rule1}}>
            <span style={sty.label}>{cal.monthName} total · {cal.monthTrades} trades</span>
            <span style={{fontFamily:"'JetBrains Mono', monospace",fontSize:T.size.body,color:cal.monthTotal>=0?T.gr:T.rd}}>{fmt(cal.monthTotal)}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:T.s[3],marginTop:T.s[3],fontSize:T.size.tiny,color:T.mut}}>
            <span>loss</span>
            <div style={{display:"flex",gap:2}}>{[0.3,0.5,0.7,0.9].map(o => <div key={o} style={{width:12,height:12,background:`rgba(168,90,82,${o})`}}/>)}</div>
            <span>·</span>
            <div style={{display:"flex",gap:2}}>{[0.3,0.5,0.7,0.9].map(o => <div key={o} style={{width:12,height:12,background:`rgba(107,158,107,${o})`}}/>)}</div>
            <span>win</span>
          </div>
        </div>

        {/* §03 NET DAILY P&L */}
        <Sec n="03" title="net daily p&l" right={`${dayEntries.length} days`}/>
        {dailySeries.length ? (
          <div style={{marginBottom:T.s[8]}}>
            <ResponsiveContainer width="100%" height={isMob?180:240}>
              <BarChart data={dailySeries} margin={{top:8,right:0,bottom:0,left:0}}>
                <XAxis dataKey="date" stroke={T.mut2} tick={{fill:T.mut,fontSize:10}} interval="preserveStartEnd"/>
                <YAxis stroke={T.mut2} tick={{fill:T.mut,fontSize:10}} tickFormatter={fmt} width={70}/>
                <Tooltip contentStyle={{background:T.card,border:T.rule1,fontFamily:"'JetBrains Mono', monospace"}} labelStyle={{color:T.text}} itemStyle={{color:T.text}} formatter={v=>[fmt(v),"net"]} cursor={{fill:"rgba(255,255,255,0.03)"}}/>
                <Bar dataKey="pnl">
                  {dailySeries.map((d,i)=><Cell key={i} fill={d.pnl>=0?T.gr:T.rd}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <div style={{color:T.mut2,fontSize:T.size.small,padding:`${T.s[5]}px 0`,marginBottom:T.s[6]}}>no data</div>}

        {/* §04 EQUITY CURVE */}
        <Sec n="04" title="equity curve"/>
        {(() => {
          let c=0; const data = [...aData].sort((a,b)=>pnlDate(a).localeCompare(pnlDate(b))).map(t=>{c+=parseFloat(t.pnl||0); return {date:pnlDate(t).slice(5), v:Math.round(c)};});
          return data.length>1 ? (
            <div style={{marginBottom:T.s[8]}}>
              <ResponsiveContainer width="100%" height={isMob?180:240}>
                <LineChart data={data} margin={{top:8,right:0,bottom:0,left:0}}>
                  <XAxis dataKey="date" stroke={T.mut2} tick={{fill:T.mut,fontSize:10}} interval="preserveStartEnd"/>
                  <YAxis stroke={T.mut2} tick={{fill:T.mut,fontSize:10}} tickFormatter={fmt} width={70}/>
                  <Tooltip contentStyle={{background:T.card,border:T.rule1,fontFamily:"\'JetBrains Mono\', monospace"}} labelStyle={{color:T.text}} itemStyle={{color:T.text}} formatter={v=>[fmt(v),"cumulative"]}/>
                  <Line type="monotone" dataKey="v" stroke={aPnl>=0?T.gr:T.rd} strokeWidth={1.5} dot={false}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : <div style={{color:T.mut2,fontSize:T.size.small,padding:`${T.s[5]}px 0`,marginBottom:T.s[6]}}>not enough data</div>;
        })()}

        {/* §05 TRADE DIRECTION */}
        <Sec n="05" title="trade direction" right="long vs short"/>
        <div style={{borderTop:T.rule1,borderBottom:T.rule1,marginBottom:T.s[8]}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",padding:`${T.s[3]}px`,borderBottom:T.rule1}}>
            <span style={sty.label}></span>
            <span style={sty.label}>trades</span>
            <span style={sty.label}>win rate</span>
            <span style={{...sty.label,textAlign:"right"}}>net p&l</span>
          </div>
          {[["long",longS],["short",shortS]].map(([l,s],i) => (
            <div key={l} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",padding:`${T.s[3]}px`,borderBottom:i<1?T.rule1:"none",fontSize:T.size.small,alignItems:"center"}}>
              <span style={{color:T.text}}>{l}</span>
              <span style={{color:T.mut}}>{s.n}</span>
              <span style={{color:s.n&&s.w/s.n>=0.5?T.gr:T.rd}}>{s.n?(s.w/s.n*100).toFixed(0):"0"}%</span>
              <span style={{color:s.pnl>=0?T.gr:T.rd,fontFamily:"'JetBrains Mono', monospace",textAlign:"right"}}>{fmt(s.pnl)}</span>
            </div>
          ))}
        </div>

        {/* §06 DURATION ANALYSIS */}
        <Sec n="06" title="duration analysis" right={`${withDur.length} timed trades`}/>
        {withDur.length ? (
          <div style={{borderTop:T.rule1,borderBottom:T.rule1,marginBottom:T.s[8]}}>
            <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr 1fr 1fr",padding:`${T.s[3]}px`,borderBottom:T.rule1}}>
              <span style={sty.label}>duration</span>
              <span style={sty.label}>trades</span>
              <span style={sty.label}>win rate</span>
              <span style={{...sty.label,textAlign:"right"}}>net p&l</span>
            </div>
            {durBuckets.filter(b=>b.n>0).map((b,i,arr) => (
              <div key={b.label} style={{display:"grid",gridTemplateColumns:"1.6fr 1fr 1fr 1fr",padding:`${T.s[3]}px`,borderBottom:i<arr.length-1?T.rule1:"none",fontSize:T.size.small,alignItems:"center"}}>
                <span style={{color:T.text}}>{b.label}</span>
                <span style={{color:T.mut}}>{b.n}</span>
                <span style={{color:b.winRate>=50?T.gr:T.rd}}>{b.winRate.toFixed(0)}%</span>
                <span style={{color:b.pnl>=0?T.gr:T.rd,fontFamily:"'JetBrains Mono', monospace",textAlign:"right"}}>{fmt(b.pnl)}</span>
              </div>
            ))}
          </div>
        ) : <div style={{color:T.mut2,fontSize:T.size.small,padding:`${T.s[5]}px 0`,marginBottom:T.s[8]}}>no trades with both entry &amp; exit timestamps — duration needs a time on the entry and exit legs.</div>}

        {/* §07 DAY OF WEEK */}
        <Sec n="07" title="day of week" right="weekday performance"/>
        <div style={{borderLeft:T.rule1,borderBottom:T.rule1,display:"grid",gridTemplateColumns:isMob?"1fr":"repeat(3,1fr)",marginBottom:T.s[6]}}>
          <div style={{borderTop:T.rule1,borderRight:T.rule1}}><Metric label="most active" value={mostActive?mostActive.name:"—"} sub={mostActive?`${mostActive.n} trades`:undefined}/></div>
          <div style={{borderTop:T.rule1,borderRight:T.rule1}}><Metric label="most profitable" value={mostProfitDay?mostProfitDay.name:"—"} color={mostProfitDay?T.gr:T.mut} sub={mostProfitDay?fmt(mostProfitDay.pnl):undefined}/></div>
          <div style={{borderTop:T.rule1,borderRight:T.rule1}}><Metric label="least profitable" value={leastProfit?leastProfit.name:"—"} color={leastProfit&&leastProfit.pnl>=0?T.gr:T.rd} sub={leastProfit?fmt(leastProfit.pnl):undefined}/></div>
        </div>
        {dowStat.length ? (
          <div style={{borderTop:T.rule1,borderBottom:T.rule1,marginBottom:T.s[8]}}>
            {dowStat.map((d,i) => (
              <div key={d.name} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",padding:`${T.s[3]}px`,borderBottom:i<dowStat.length-1?T.rule1:"none",fontSize:T.size.small,alignItems:"center"}}>
                <span style={{color:T.text}}>{d.name}</span>
                <span style={{color:T.mut}}>{d.n} trades</span>
                <span style={{color:d.pnl>=0?T.gr:T.rd,fontFamily:"'JetBrains Mono', monospace",textAlign:"right"}}>{fmt(d.pnl)}</span>
              </div>
            ))}
          </div>
        ) : null}

        {/* §08 SETUP PERFORMANCE */}
        <Sec n="08" title="setup performance" right="ranked by expectancy"/>
        {setups2.length ? (
          <div style={{borderTop:T.rule1,borderBottom:T.rule1,marginBottom:T.s[8]}}>
            <div style={{display:"grid",gridTemplateColumns:isMob?"2fr 1fr 1fr 1fr":"2.5fr 1fr 1fr 1fr 1fr",padding:`${T.s[3]}px ${T.s[3]}px`,borderBottom:T.rule1,...sty.label}}>
              <span>setup</span><span>trades</span><span>win rate</span>{!isMob && <span>total p&l</span>}<span style={{textAlign:"right"}}>expectancy</span>
            </div>
            {setups2.map(d => (
              <div key={d.setup} style={{display:"grid",gridTemplateColumns:isMob?"2fr 1fr 1fr 1fr":"2.5fr 1fr 1fr 1fr 1fr",padding:`${T.s[3]}px ${T.s[3]}px`,borderBottom:T.rule1,fontSize:T.size.small,alignItems:"center"}}>
                <span style={{color:T.text}}>{d.setup}</span>
                <span style={{color:T.mut}}>{d.n}</span>
                <span style={{color:d.winRate>=50?T.gr:T.rd}}>{d.winRate.toFixed(0)}%</span>
                {!isMob && <span style={{color:d.pnl>=0?T.gr:T.rd,fontFamily:"\'JetBrains Mono\', monospace"}}>{fmt(d.pnl)}</span>}
                <span style={{color:d.ev>=0?T.gr:T.rd,fontFamily:"\'JetBrains Mono\', monospace",textAlign:"right"}}>{fmt(d.ev)}</span>
              </div>
            ))}
          </div>
        ) : <div style={{color:T.mut2,fontSize:T.size.small,padding:`${T.s[5]}px 0`,marginBottom:T.s[6]}}>need at least 2 trades per setup</div>}

        {/* §09 WIN vs LOSS */}
        <Sec n="09" title="win vs loss comparison"/>
        <div style={{borderTop:T.rule1,borderBottom:T.rule1,marginBottom:T.s[8]}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",padding:`${T.s[3]}px ${T.s[3]}px`,borderBottom:T.rule1}}>
            <span style={sty.label}></span>
            <span style={{...sty.label,color:T.gr,textAlign:"center"}}>winners</span>
            <span style={{...sty.label,color:T.rd,textAlign:"right"}}>losers</span>
          </div>
          {[
            {l:"trades",      w:wl.wins.n,                x:wl.losses.n},
            {l:"avg p&l",     w:fmt(wl.wins.avgPnl),      x:fmt(wl.losses.avgPnl)},
            {l:"avg r:r",     w:wl.wins.avgRR.toFixed(2), x:wl.losses.avgRR.toFixed(2)},
            {l:"avg size",    w:wl.wins.avgSize,          x:wl.losses.avgSize},
            {l:"avg charges", w:fmt(wl.wins.avgCharges),  x:fmt(wl.losses.avgCharges)},
          ].map(({l,w,x},i) => (
            <div key={l} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",padding:`${T.s[3]}px ${T.s[3]}px`,borderBottom:i<4?T.rule1:"none",fontSize:T.size.small,alignItems:"center"}}>
              <span style={sty.label}>{l}</span>
              <span style={{color:T.gr,fontFamily:"\'JetBrains Mono\', monospace",textAlign:"center"}}>{w}</span>
              <span style={{color:T.rd,fontFamily:"\'JetBrains Mono\', monospace",textAlign:"right"}}>{x}</span>
            </div>
          ))}
        </div>

        {/* §10 CONSISTENCY HEATMAP */}
        <Sec n="10" title="consistency heatmap" right="rule adherence per day"/>
        {(() => {
          const byDate = {};
          aData.forEach(t => {
            if (!byDate[t.date]) byDate[t.date] = { yes:0, total:0 };
            byDate[t.date].total++;
            if (t.followedRules==="Yes") byDate[t.date].yes++;
          });
          const days = Object.entries(byDate).sort((a,b)=>a[0].localeCompare(b[0]));
          if (!days.length) return <div style={{color:T.mut2,fontSize:T.size.small,padding:`${T.s[5]}px 0`,marginBottom:T.s[6]}}>no data</div>;
          return (
            <div style={{marginBottom:T.s[8]}}>
              <div style={{display:"flex",flexWrap:"wrap",gap:4,maxWidth:isMob?"100%":680,marginBottom:T.s[3]}}>
                {days.map(([date,d]) => {
                  const rate = d.yes/d.total;
                  const color = rate >= 0.8 ? T.gr : rate >= 0.5 ? T.amb : T.rd;
                  return (
                    <div key={date} title={`${date} · ${d.yes}/${d.total} rules followed`}
                      style={{width:22,height:22,background:color,opacity:0.3+rate*0.7,border:`1px solid ${T.bg}`}}/>
                  );
                })}
              </div>
              <div style={{display:"flex",gap:T.s[4],fontSize:T.size.tiny,color:T.mut}}>
                <span><span style={{background:T.rd,padding:"0 6px",marginRight:4}}>&nbsp;</span>broke rules</span>
                <span><span style={{background:T.amb,padding:"0 6px",marginRight:4}}>&nbsp;</span>some</span>
                <span><span style={{background:T.gr,padding:"0 6px",marginRight:4}}>&nbsp;</span>all followed</span>
              </div>
            </div>
          );
        })()}

      </div>
    );
  };

  const renderDrawer = () => (
    <div style={{position:"fixed", top:0, right:0, bottom:0, width:isMob?"100%":480, background:T.bg, borderLeft:T.rule1, zIndex:1000, overflow:"auto", padding:`${T.s[6]}px ${T.s[6]}px ${T.s[10]}px`, boxShadow:"-20px 0 40px rgba(0,0,0,0.4)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:T.s[8]}}>
        <div>
          <div style={{color:T.amb,fontSize:T.size.label,textTransform:"uppercase",letterSpacing:".18em"}}>./{drawer}</div>
          <div style={{color:T.text,fontSize:T.size.h2,fontWeight:T.weight.light,marginTop:T.s[1]}}>{drawer}</div>
        </div>
        <button onClick={()=>setDrawer(null)} style={{background:"transparent",border:"none",color:T.mut,cursor:"pointer",fontSize:24,padding:T.s[2]}}>×</button>
      </div>

      {drawer === "settings" && renderSettings()}
      {drawer === "risk" && renderRisk()}
      {drawer === "plans" && renderPlans()}
      {drawer === "checklist" && renderChecklist()}
      {drawer === "review" && renderReview()}
      {drawer === "customize" && renderCustomize()}
    </div>
  );

  const renderPlans = () => {
    const openPlans     = plans.filter(p => p.status === "open");
    const executedPlans = plans.filter(p => p.status === "executed");
    return (
      <div>
        <Sec n="01" title={editingPlanId ? "edit plan" : "new plan"}/>
        <div style={{marginBottom:T.s[5]}}>
          <label style={sty.label}>instrument</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:T.s[2]}}>
            {instruments.map(i => (
              <button key={i} onClick={()=>setPlanF({...planF,instrument:i})} style={{background:planF.instrument===i?T.amb:"transparent",color:planF.instrument===i?T.bg:T.mut,border:`1px solid ${planF.instrument===i?T.amb:T.mut2}`,padding:`${T.s[2]}px ${T.s[3]}px`,fontSize:T.size.small,cursor:"pointer",fontFamily:"'JetBrains Mono', monospace"}}>{i}</button>
            ))}
          </div>
        </div>
        <div style={{marginBottom:T.s[5]}}>
          <label style={sty.label}>bias</label>
          <div style={{display:"flex",gap:T.s[2]}}>
            {[["Bullish","▲",T.gr],["Bearish","▼",T.rd],["Neutral","—",T.mut]].map(([b,ic,c])=>(
              <button key={b} onClick={()=>setPlanF({...planF,bias:b})} style={{flex:1,background:planF.bias===b?c+"22":"transparent",color:planF.bias===b?c:T.mut,border:`1px solid ${planF.bias===b?c:T.mut2}`,padding:`${T.s[3]}px`,cursor:"pointer",fontFamily:"'JetBrains Mono', monospace",fontSize:T.size.body,textTransform:"lowercase"}}>{ic} {b.toLowerCase()}</button>
            ))}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:T.s[4],marginBottom:T.s[5]}}>
          <Field label="date"><input type="date" style={sty.input} value={planF.date} onChange={e=>setPlanF({...planF,date:e.target.value})}/></Field>
          <Field label="setup grade"><select style={sty.select} value={planF.grade} onChange={e=>setPlanF({...planF,grade:e.target.value})}>{GRADES.map(g=><option key={g}>{g}</option>)}</select></Field>
        </div>
        {[
          ["key s/r levels","keyLevels","support / resistance levels..."],
          ["setup","setup","what's the setup?"],
          ["entry zone","entryZone","where will you enter?"],
          ["invalidation","invalidation","what invalidates this?"],
          ["confluences","confluences","what confirms this?"],
        ].map(([l,k,ph]) => (
          <div key={k} style={{marginBottom:T.s[4]}}>
            <Field label={l}><textarea style={sty.textarea} value={planF[k]||""} onChange={e=>setPlanF({...planF,[k]:e.target.value})} placeholder={ph}/></Field>
          </div>
        ))}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:T.s[4],marginBottom:T.s[5]}}>
          <Field label="stop loss"><input type="number" style={sty.input} value={planF.sl} onChange={e=>setPlanF({...planF,sl:e.target.value})}/></Field>
          <Field label="target 1"><input type="number" style={sty.input} value={planF.target1} onChange={e=>setPlanF({...planF,target1:e.target.value})}/></Field>
          <Field label="target 2"><input type="number" style={sty.input} value={planF.target2} onChange={e=>setPlanF({...planF,target2:e.target.value})}/></Field>
        </div>
        <Field label="notes"><textarea style={sty.textarea} value={planF.notes} onChange={e=>setPlanF({...planF,notes:e.target.value})} placeholder="anything else..."/></Field>
        <div style={{display:"flex",gap:T.s[3],marginTop:T.s[5]}}>
          <button onClick={savePlan} style={{...sty.btn("primary"),flex:1}}>{editingPlanId ? "update plan" : "save plan"}</button>
          <button onClick={()=>{setPlanF(emptyPlan(instruments[0])); setEditingPlanId(null);}} style={{...sty.btn(),flex:1}}>clear</button>
        </div>

        {openPlans.length > 0 && (
          <>
            <Sec n="02" title={`open plans · ${openPlans.length}`}/>
            {openPlans.map(p => (
              <div key={p.id} style={{padding:`${T.s[4]}px 0`,borderBottom:T.rule1}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:T.s[2]}}>
                  <div>
                    <span style={{color:T.text,fontSize:T.size.body}}>{p.instrument}</span>
                    <span style={{color:p.bias==="Bullish"?T.gr:p.bias==="Bearish"?T.rd:T.mut,fontSize:T.size.small,marginLeft:T.s[3]}}>{p.bias?.toLowerCase()}</span>
                    <span style={{color:T.mut2,fontSize:T.size.small,marginLeft:T.s[3]}}>{p.date}</span>
                    {p.grade==="A+" && <span style={{color:T.amb,fontSize:T.size.small,marginLeft:T.s[3]}}>A+</span>}
                  </div>
                  <div style={{display:"flex",gap:T.s[2]}}>
                    <button onClick={()=>editPlan(p)} style={{...sty.btn(),padding:`${T.s[1]}px ${T.s[3]}px`,fontSize:T.size.tiny}}>edit</button>
                    <button onClick={()=>delPlan(p.id)} style={{background:"transparent",border:"none",color:T.rd,cursor:"pointer",fontSize:T.size.h3}}>×</button>
                  </div>
                </div>
                {p.setup && <div style={{color:T.mut,fontSize:T.size.small,marginTop:T.s[2]}}><span style={{...sty.label,display:"inline"}}>setup&nbsp;</span>{p.setup}</div>}
                {(p.sl || p.target1) && (
                  <div style={{display:"flex",gap:T.s[5],marginTop:T.s[2],fontSize:T.size.small,color:T.mut}}>
                    {p.sl && <span>sl&nbsp;<span style={{color:T.rd}}>{p.sl}</span></span>}
                    {p.target1 && <span>t1&nbsp;<span style={{color:T.gr}}>{p.target1}</span></span>}
                    {p.target2 && <span>t2&nbsp;<span style={{color:T.gr}}>{p.target2}</span></span>}
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {executedPlans.length > 0 && (
          <>
            <Sec n="03" title={`executed plans · ${executedPlans.length}`}/>
            {executedPlans.map(p => {
              const linkedTrades = trades.filter(t => (p.linkedTradeIds||[]).includes(t.id));
              const totalPnl = linkedTrades.reduce((s,t)=>s+parseFloat(t.pnl||0),0);
              return (
                <div key={p.id} style={{padding:`${T.s[4]}px 0`,borderBottom:T.rule1}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                    <div>
                      <span style={{color:T.text,fontSize:T.size.body}}>{p.instrument}</span>
                      <span style={{color:p.bias==="Bullish"?T.gr:p.bias==="Bearish"?T.rd:T.mut,fontSize:T.size.small,marginLeft:T.s[3]}}>{p.bias?.toLowerCase()}</span>
                      <span style={{color:T.mut2,fontSize:T.size.small,marginLeft:T.s[3]}}>{p.date}</span>
                    </div>
                    <span style={{color:totalPnl>=0?T.gr:T.rd,fontSize:T.size.body,fontFamily:"'JetBrains Mono', monospace"}}>{fmt(totalPnl)}</span>
                  </div>
                  <div style={{marginTop:T.s[3]}}>
                    <label style={sty.label}>post-trade reflection</label>
                    <textarea style={{...sty.textarea,minHeight:60}} value={p.outcome||""} onChange={e=>updatePlanOutcome(p.id,e.target.value)} placeholder="how did it actually play out? what did you learn?"/>
                  </div>
                  {linkedTrades.length > 0 && (
                    <div style={{marginTop:T.s[3],fontSize:T.size.small,color:T.mut}}>
                      linked trades: {linkedTrades.map(t => <span key={t.id} style={{color:parseFloat(t.pnl)>=0?T.gr:T.rd,marginRight:T.s[2]}}>{fmt(parseFloat(t.pnl))}</span>)}
                    </div>
                  )}
                  <div style={{marginTop:T.s[3],display:"flex",gap:T.s[2]}}>
                    <button onClick={()=>editPlan(p)} style={{...sty.btn(),padding:`${T.s[1]}px ${T.s[3]}px`,fontSize:T.size.tiny}}>edit</button>
                    <button onClick={()=>delPlan(p.id)} style={{background:"transparent",border:"none",color:T.rd,cursor:"pointer",fontSize:T.size.body}}>×</button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    );
  };

  const renderSettings = () => {
    const draft = settingsDraft;
    const setDraft = setSettingsDraft;
    const saved = settingsSaved;
    const save = () => { pSettings(draft); setSettingsSaved(true); setTimeout(()=>setSettingsSaved(false),2000); };
    return (
      <div>
        {saved && <div style={{padding:T.s[3], border:`1px solid ${T.gr}`, color:T.gr, marginBottom:T.s[5], fontSize:T.size.small}}>✓ saved</div>}

        <Sec n="01" title="profile"/>
        <Field label="trader name"><input style={sty.input} value={draft.traderName} onChange={e=>setDraft({...draft,traderName:e.target.value})}/></Field>

        <Sec n="02" title="capital & risk"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:T.s[4]}}>
          <Field label="capital ₹"><input type="number" style={sty.input} value={draft.capital} onChange={e=>setDraft({...draft,capital:parseFloat(e.target.value)||0})}/></Field>
          <Field label="base risk %"><input type="number" step="0.01" style={sty.input} value={draft.baseRisk} onChange={e=>setDraft({...draft,baseRisk:parseFloat(e.target.value)||0})}/></Field>
          <Field label="major risk %"><input type="number" step="0.01" style={sty.input} value={draft.majorRisk} onChange={e=>setDraft({...draft,majorRisk:parseFloat(e.target.value)||0})}/></Field>
          <Field label="drawdown risk %"><input type="number" step="0.01" style={sty.input} value={draft.drawdownRisk} onChange={e=>setDraft({...draft,drawdownRisk:parseFloat(e.target.value)||0})}/></Field>
        </div>

        <Sec n="03" title="loss limits"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:T.s[4]}}>
          <Field label="daily"><input type="number" style={sty.input} value={draft.dailyLimit} onChange={e=>setDraft({...draft,dailyLimit:parseFloat(e.target.value)||0})}/></Field>
          <Field label="weekly"><input type="number" style={sty.input} value={draft.weeklyLimit} onChange={e=>setDraft({...draft,weeklyLimit:parseFloat(e.target.value)||0})}/></Field>
          <Field label="monthly"><input type="number" style={sty.input} value={draft.monthlyLimit} onChange={e=>setDraft({...draft,monthlyLimit:parseFloat(e.target.value)||0})}/></Field>
        </div>

        <Sec n="04" title="text size"/>
        <div style={{display:"flex",gap:T.s[2],flexWrap:"wrap"}}>
          {[["small",0.9],["normal",1],["large",1.15],["x-large",1.3]].map(([l,v]) => (
            <button key={v} onClick={()=>{pSettings({...settings,textScale:v}); setDraft({...draft,textScale:v});}} style={{...sty.btn(), background:settings.textScale===v?T.amb:"transparent", color:settings.textScale===v?T.bg:T.text, flex:1}}>{l}</button>
          ))}
        </div>

        <Sec n="05" title="import"/>
        {importMsg && (
          <div style={{padding:T.s[3], border:`1px solid ${importMsg.err?T.rd:importMsg.loading?T.amb:T.gr}`, color:importMsg.err?T.rd:importMsg.loading?T.amb:T.gr, marginBottom:T.s[4], fontSize:T.size.small}}>
            {importMsg.loading ? "⟳ " + importMsg.msg : importMsg.err ? "✗ " + importMsg.err : "✓ " + importMsg.msg}
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:T.s[3]}}>
          <label style={{...sty.btn(), display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer"}}>
            excel<input type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={e=>{importExcel(e.target.files[0]); e.target.value="";}}/>
          </label>
          <label style={{...sty.btn(), display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer"}}>
            json<input type="file" accept=".json" style={{display:"none"}} onChange={e=>{importJSON(e.target.files[0]); e.target.value="";}}/>
          </label>
        </div>

        <Sec n="06" title="maintenance"/>
        <button onClick={()=>{ if(confirm("Recompute charges for every trade from its entry/exit legs? Brokerage becomes ₹20 × number of logged orders (entries + exits).")){ pTrades(trades.map(t=>recomputeFromLegs(t))); alert("Recomputed charges for "+trades.length+" trades."); } }} style={{...sty.btn(), width:"100%"}}>recompute all charges</button>
        <div style={{color:T.mut2,fontSize:T.size.tiny,marginTop:T.s[2]}}>uses each trade's logged entry + exit legs — so trades with multiple entries are counted as multiple orders</div>

        <Sec n="07" title="profile"/>
        <button onClick={switchUser} style={{...sty.btn(), width:"100%"}}>switch profile</button>

        <div style={{marginTop:T.s[8]}}>
          <button onClick={save} style={{...sty.btn("primary"), width:"100%"}}>save changes</button>
        </div>
      </div>
    );
  };

  const renderRisk = () => (
    <div>
      <Sec n="01" title="parameters"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:T.s[4],marginBottom:T.s[5]}}>
        <Field label="instrument"><select style={sty.select} value={rc.instrument||""} onChange={e=>setRc({...rc,instrument:e.target.value, segment:detectSegment(e.target.value,"")})}><option value="">—</option>{instruments.map(i=><option key={i}>{i}</option>)}</select></Field>
        <Field label="segment"><select style={sty.select} value={rc.segment} onChange={e=>setRc({...rc,segment:e.target.value})}>{SEGMENTS.map(s=><option key={s}>{s}</option>)}</select></Field>
      </div>
      <div style={{marginBottom:T.s[5]}}>
        <label style={sty.label}>risk type</label>
        <div style={{display:"flex",flexDirection:"column",gap:T.s[2]}}>
          {[["base",`base · ${settings.baseRisk}%`],["major",`major · ${settings.majorRisk}%`],["drawdown",`drawdown · ${settings.drawdownRisk}%`]].map(([v,l]) => (
            <button key={v} onClick={()=>setRc({...rc,riskType:v})} style={{...sty.btn(), background:rc.riskType===v?T.amb:"transparent", color:rc.riskType===v?T.bg:T.text, textAlign:"left"}}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:T.s[4],marginBottom:T.s[5]}}>
        <Field label="entry"><input type="number" style={sty.input} value={rc.entry} onChange={e=>setRc({...rc,entry:e.target.value})}/></Field>
        <Field label="stop loss"><input type="number" style={sty.input} value={rc.sl} onChange={e=>setRc({...rc,sl:e.target.value})}/></Field>
      </div>
      <Field label="target r:r">
        <select style={sty.select} value={rc.rr} onChange={e=>setRc({...rc,rr:e.target.value})}>{["1.5","2","2.5","3","4","5"].map(v=><option key={v}>{v}</option>)}</select>
      </Field>

      {rcResult && (
        <div style={{marginTop:T.s[8]}}>
          <div style={{borderTop:T.rule1, borderBottom:T.rule1, padding:`${T.s[5]}px 0`, textAlign:"center", marginBottom:T.s[5]}}>
            <div style={{...sty.label, marginBottom:T.s[3]}}>recommended qty</div>
            <div style={sty.heroNum(T.text, T.size.hero)}>{rcResult.qty}</div>
            <div style={{color:T.mut,fontSize:T.size.small,marginTop:T.s[3]}}>position value {fmt(rcResult.qty*parseFloat(rc.entry))}</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0,borderTop:T.rule1,borderBottom:T.rule1}}>
            {[
              ["risk",       fmt(rcResult.risk), T.rd],
              ["sl distance", rcResult.slDist, T.mut],
              ["target",     rcResult.tp, T.gr],
              ["gross reward",fmt(rcResult.reward), T.gr],
              ["est charges", "-"+fmt(rcResult.charges), T.rd],
              ["net reward",  fmt(rcResult.netReward), rcResult.netReward>=0?T.gr:T.rd],
            ].map(([l,v,c],i) => (
              <div key={l} style={{padding:T.s[4], borderLeft:i%2!==0?T.rule1:"none", borderTop:i>=2?T.rule1:"none"}}>
                <div style={sty.label}>{l}</div>
                <div style={{color:c, fontSize:T.size.body, fontFamily:"'JetBrains Mono', monospace", marginTop:T.s[1]}}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderChecklist = () => {
    let gi = 0;
    const total = Object.values(checks).flat().length;
    const totalYes = Object.values(checks).flat().filter((_,i)=>ck[i]==="yes").length;
    return (
      <div>
        <div style={{textAlign:"center", borderTop:T.rule1, borderBottom:T.rule1, padding:`${T.s[6]}px 0`, marginBottom:T.s[6]}}>
          <div style={sty.heroNum(T.text, T.size.mega)}>{total ? Math.round(totalYes/total*100) : 0}%</div>
          <div style={{color:T.mut, fontSize:T.size.small, marginTop:T.s[3]}}>{totalYes} of {total} confirmed</div>
        </div>

        {Object.entries(checks).map(([section, items]) => (
          <div key={section} style={{marginBottom:T.s[6]}}>
            <Sec n={String(Object.keys(checks).indexOf(section)+1).padStart(2,"0")} title={section.toLowerCase()}/>
            {items.map(item => {
              const i = gi++;
              const state = ck[i];
              return (
                <div key={item} style={{display:"flex", alignItems:"center", gap:T.s[3], padding:`${T.s[3]}px 0`, borderBottom:T.rule1}}>
                  <span style={{flex:1, color:state==="yes"?T.text:T.mut, fontSize:T.size.body}}>{item}</span>
                  <button onClick={()=>setCk(c=>({...c,[i]:c[i]==="yes"?undefined:"yes"}))} style={{...sty.btn(), background:state==="yes"?T.gr:"transparent", color:state==="yes"?T.bg:T.mut, minWidth:60}}>yes</button>
                  <button onClick={()=>setCk(c=>({...c,[i]:c[i]==="no"?undefined:"no"}))} style={{...sty.btn(), background:state==="no"?T.rd:"transparent", color:state==="no"?T.text:T.mut, border:`1px solid ${state==="no"?T.rd:T.mut2}`, minWidth:60}}>no</button>
                </div>
              );
            })}
          </div>
        ))}

        <button onClick={()=>setCk({})} style={{...sty.btn(), width:"100%"}}>reset all</button>
      </div>
    );
  };

  const renderReview = () => {
    const periods = ["daily","weekly","monthly"];
    const RFIELDS = [
      ["what went well","whatWentWell"],["mistakes","mistakes"],["missed setups","missedSetups"],
      ["rules followed","rulesFollowed"],["emotional trading","emotionalTrading"],["regrets","regrets"],
      ["improvements","improvements"],["self coaching","selfCoaching"],
    ];
    const reviewMini = (r) => {
      const open = expMini === r.id;
      return (
        <div key={r.id} style={{padding:`${T.s[2]}px 0`, borderBottom:T.rule1}}>
          <div onClick={()=>setExpMini(open?null:r.id)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
            <span style={{color:T.text,fontSize:T.size.small}}>{r.date} · {revWeekday(r.date)} <span style={{color:T.mut2}}>{open?"▾":"▸"}</span></span>
            <div style={{display:"flex",gap:T.s[2],alignItems:"center"}}>
              <span style={{color:T.amb,fontSize:T.size.tiny}}>{r.mentalState?.toLowerCase()}</span>
              <button onClick={(e)=>{e.stopPropagation();startEditReview(r);}} style={{background:"transparent",color:T.mut,border:"none",cursor:"pointer",fontSize:T.size.tiny,fontFamily:"'JetBrains Mono', monospace"}}>edit</button>
            </div>
          </div>
          {open
            ? <div style={{marginTop:T.s[3]}}>{fieldsView(r)}</div>
            : <div style={{color:T.mut,fontSize:T.size.tiny,marginTop:2,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden",overflowWrap:"anywhere"}}>{revExcerpt(r)}</div>}
        </div>
      );
    };
    const fieldsView = (r) => RFIELDS.filter(([,k])=>r[k]).map(([l,k]) => (
      <div key={k} style={{marginBottom:T.s[3]}}>
        <div style={sty.label}>{l}</div>
        <div style={{color:T.mut,fontSize:T.size.small,lineHeight:1.6,overflowWrap:"anywhere",whiteSpace:"pre-wrap"}}>{r[k]}</div>
      </div>
    ));
    const editDelBtns = (r) => (
      <div style={{display:"flex",gap:T.s[2],marginBottom:T.s[3]}}>
        <button onClick={(e)=>{e.stopPropagation();startEditReview(r);}} style={{background:"transparent",color:T.amb,border:`1px solid ${T.amb}`,padding:`${T.s[2]}px ${T.s[4]}px`,fontSize:T.size.small,cursor:"pointer",fontFamily:"'JetBrains Mono', monospace"}}>edit</button>
        <button onClick={(e)=>{e.stopPropagation();if(confirm("Delete this review?"))delReview(r.id);}} style={{background:"transparent",color:T.rd,border:`1px solid ${T.rd}`,padding:`${T.s[2]}px ${T.s[4]}px`,fontSize:T.size.small,cursor:"pointer",fontFamily:"'JetBrains Mono', monospace"}}>delete</button>
      </div>
    );
    const reviewCard = (r) => {
      const open = expReview === r.id;
      return (
        <div key={r.id} style={{padding:`${T.s[3]}px 0`, borderBottom:T.rule1}}>
          <div onClick={()=>setExpReview(open?null:r.id)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
            <div><span style={{color:T.text,fontSize:T.size.body}}>{r.date}</span><span style={{color:T.mut2,fontSize:T.size.tiny,marginLeft:T.s[2]}}>{revWeekday(r.date)}</span></div>
            <div style={{display:"flex",gap:T.s[3],alignItems:"center"}}><span style={{color:T.amb,fontSize:T.size.small}}>{r.mentalState?.toLowerCase()}</span><span style={{color:T.mut2,fontSize:T.size.small}}>{open?"▾":"▸"}</span></div>
          </div>
          {!open && <div style={{color:T.mut,fontSize:T.size.small,marginTop:T.s[1],display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden",overflowWrap:"anywhere"}}>{revExcerpt(r)}</div>}
          {open && <div style={{marginTop:T.s[3]}}>{fieldsView(r)}{editDelBtns(r)}</div>}
        </div>
      );
    };
    // weekly tab: group all daily + weekly reviews by week (Mon-start)
    const weekBlock = (g) => {
      const open = expReview === ("wk-"+g.week);
      return (
        <div key={g.week} style={{padding:`${T.s[3]}px 0`, borderBottom:T.rule1}}>
          <div onClick={()=>setExpReview(open?null:("wk-"+g.week))} style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
            <span style={{color:T.text,fontSize:T.size.body}}>week of {g.week}</span>
            <span style={{color:T.mut2,fontSize:T.size.small}}>{g.dailies.length} daily{g.review?" · ✓":""} {open?"▾":"▸"}</span>
          </div>
          {open && (
            <div style={{marginTop:T.s[3]}}>
              {g.review
                ? <div style={{marginBottom:T.s[3]}}><div style={{...sty.label,color:T.amb,marginBottom:T.s[2]}}>weekly review</div>{fieldsView(g.review)}{editDelBtns(g.review)}</div>
                : <div style={{color:T.mut2,fontSize:T.size.tiny,marginBottom:T.s[3]}}>no weekly review written — add one in the form above</div>}
              <div style={{...sty.label,marginBottom:T.s[2]}}>daily reviews this week · {g.dailies.length}</div>
              {g.dailies.length ? g.dailies.map(reviewMini) : <div style={{color:T.mut2,fontSize:T.size.tiny}}>no daily reviews this week</div>}
            </div>
          )}
        </div>
      );
    };
    // monthly tab: group by month → weeks → dailies
    const monthBlock = (g) => {
      const open = expReview === ("mo-"+g.month);
      return (
        <div key={g.month} style={{padding:`${T.s[3]}px 0`, borderBottom:T.rule1}}>
          <div onClick={()=>setExpReview(open?null:("mo-"+g.month))} style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
            <span style={{color:T.text,fontSize:T.size.body}}>{g.month}</span>
            <span style={{color:T.mut2,fontSize:T.size.small}}>{g.weeks.length} wk{g.review?" · ✓":""} {open?"▾":"▸"}</span>
          </div>
          {open && (
            <div style={{marginTop:T.s[3]}}>
              {g.review
                ? <div style={{marginBottom:T.s[3]}}><div style={{...sty.label,color:T.amb,marginBottom:T.s[2]}}>monthly review</div>{fieldsView(g.review)}{editDelBtns(g.review)}</div>
                : <div style={{color:T.mut2,fontSize:T.size.tiny,marginBottom:T.s[3]}}>no monthly review written yet</div>}
              {g.weeks.map(w => {
                const wo = expWeek === ("mw-"+w.week);
                return (
                  <div key={w.week} style={{marginBottom:T.s[2],paddingLeft:T.s[3],borderLeft:T.rule1}}>
                    <div onClick={(e)=>{e.stopPropagation();setExpWeek(wo?null:("mw-"+w.week));}} style={{display:"flex",justifyContent:"space-between",cursor:"pointer"}}>
                      <span style={{color:T.text,fontSize:T.size.small}}>week of {w.week}{w.review?" · ✓":""}</span>
                      <span style={{color:T.mut2,fontSize:T.size.tiny}}>{wo?"▾":"▸"} {w.dailies.length} daily</span>
                    </div>
                    {wo && <div style={{marginTop:T.s[1]}}>{w.review && <div style={{marginBottom:T.s[2]}}>{fieldsView(w.review)}{editDelBtns(w.review)}</div>}{w.dailies.length ? w.dailies.map(reviewMini) : <div style={{color:T.mut2,fontSize:T.size.tiny}}>no daily reviews</div>}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    };
    const weekGroups = [...new Set(reviews.filter(r=>r.period==="daily"||r.period==="weekly").map(r=>revWeekStart(r.date)))].filter(Boolean).sort((a,b)=>b.localeCompare(a))
      .map(wk => ({ week:wk, review:reviews.find(r=>r.period==="weekly"&&revWeekStart(r.date)===wk), dailies:reviews.filter(r=>r.period==="daily"&&revWeekStart(r.date)===wk).sort((a,b)=>(a.date||"").localeCompare(b.date||"")) }));
    const monthGroups = [...new Set(reviews.map(r=>revMonthKey(r.date)))].filter(Boolean).sort((a,b)=>b.localeCompare(a))
      .map(mk => ({ month:mk, review:reviews.find(r=>r.period==="monthly"&&revMonthKey(r.date)===mk),
        weeks:[...new Set(reviews.filter(r=>(r.period==="daily"||r.period==="weekly")&&revMonthKey(r.date)===mk).map(r=>revWeekStart(r.date)))].filter(Boolean).sort((a,b)=>b.localeCompare(a))
          .map(wk=>({ week:wk, review:reviews.find(r=>r.period==="weekly"&&revWeekStart(r.date)===wk), dailies:reviews.filter(r=>r.period==="daily"&&revWeekStart(r.date)===wk).sort((a,b)=>(a.date||"").localeCompare(b.date||"")) })) }));
    return (
      <div>
        <div style={{display:"flex",gap:T.s[2],marginBottom:T.s[6]}}>
          {periods.map(p => (
            <button key={p} onClick={()=>{setReviewTab(p); setRf(emptyReview(p)); setEditingReviewId(null); setExpReview(null); setExpWeek(null); setExpMini(null);}} style={{...sty.btn(), background:reviewTab===p?T.amb:"transparent", color:reviewTab===p?T.bg:T.text, flex:1}}>{p}</button>
          ))}
        </div>

        <div className="apex-review-grid">
          <div style={{minWidth:0}}>
            <Sec n="01" title={editingReviewId ? `editing ${reviewTab} review` : `new ${reviewTab} review`} right={editingReviewId?"editing":undefined}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:T.s[4],marginBottom:T.s[4]}}>
              <Field label="date"><input type="date" style={sty.input} value={rf.date||""} onChange={e=>setRf({...rf,date:e.target.value})}/></Field>
              <Field label="day"><input readOnly tabIndex={-1} style={{...sty.input,color:T.mut}} value={revWeekday(rf.date)}/></Field>
            </div>
            <Field label="mental state">
              <div style={{display:"flex",gap:T.s[2],flexWrap:"wrap"}}>
                {MENTAL.map(m => (
                  <button key={m} onClick={()=>setRf({...rf,mentalState:m})} style={{...sty.btn(), background:rf.mentalState===m?T.amb:"transparent", color:rf.mentalState===m?T.bg:T.text}}>{m.toLowerCase()}</button>
                ))}
              </div>
            </Field>

            {RFIELDS.map(([label,key]) => (
              <div key={key} style={{marginTop:T.s[4]}}>
                <Field label={label}><textarea style={sty.textarea} value={rf[key]} onChange={e=>setRf({...rf,[key]:e.target.value})}/></Field>
              </div>
            ))}

            <div style={{display:"flex",gap:T.s[3],marginTop:T.s[6]}}>
              <button onClick={logReview} style={{...sty.btn("primary"), flex:1}}>{editingReviewId ? "update review" : "save review"}</button>
              <button onClick={editingReviewId ? cancelEditReview : ()=>setRf(emptyReview(reviewTab))} style={{...sty.btn(), flex:1}}>{editingReviewId ? "cancel" : "clear"}</button>
            </div>
          </div>

          <div style={{minWidth:0}}>
            {(() => {
              if (reviewTab==="daily") {
                const list = reviews.filter(r=>r.period==="daily").sort((a,b)=>(b.date||"").localeCompare(a.date||""));
                return list.length ? <><Sec n="02" title="past daily reviews" right={`${list.length}`}/>{list.map(reviewCard)}</> : <div style={{color:T.mut2,fontSize:T.size.small,padding:`${T.s[6]}px 0`}}>no daily reviews yet</div>;
              }
              if (reviewTab==="weekly") {
                return weekGroups.length ? <><Sec n="02" title="by week" right={`${weekGroups.length} weeks`}/>{weekGroups.map(weekBlock)}</> : <div style={{color:T.mut2,fontSize:T.size.small,padding:`${T.s[6]}px 0`}}>no reviews yet — log a daily or weekly review to see weeks here</div>;
              }
              return monthGroups.length ? <><Sec n="02" title="by month" right={`${monthGroups.length} months`}/>{monthGroups.map(monthBlock)}</> : <div style={{color:T.mut2,fontSize:T.size.small,padding:`${T.s[6]}px 0`}}>no reviews yet</div>;
            })()}
          </div>
        </div>
      </div>
    );
  };

  const renderEditList = ({ title, items, storeKey, setter, defaults, n }) => {
    const val = editListInput[storeKey] || "";
    const setVal = (v) => setEditListInput(prev => ({...prev, [storeKey]: v}));
    const add = () => { const v=val.trim(); if(!v||items.includes(v)) return; pCustom(storeKey, [...items,v], setter); setVal(""); };
    return (
      <div key={storeKey} style={{marginBottom:T.s[6]}}>
        <Sec n={n} title={title}/>
        <div style={{display:"flex",gap:T.s[3],marginBottom:T.s[4]}}>
          <input style={sty.input} value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="add new..."/>
          <button onClick={add} style={sty.btn("primary")}>add</button>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:T.s[2]}}>
          {items.map(i => (
            <div key={i} style={{display:"flex",alignItems:"center",gap:T.s[2],border:T.rule1,padding:`${T.s[1]}px ${T.s[3]}px`,fontSize:T.size.small,color:T.text}}>
              {i}<button onClick={()=>pCustom(storeKey, items.filter(x=>x!==i), setter)} style={{background:"transparent",border:"none",color:T.rd,cursor:"pointer",padding:0,fontSize:14}}>×</button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCustomize = () => {
    const EditList = renderEditList;
    return (
      <div>
        {renderEditList({n:"01", title:"instruments", items:instruments, storeKey:"instruments", setter:setInstruments, defaults:DEF_INSTRUMENTS})}
        {renderEditList({n:"02", title:"setups", items:setups, storeKey:"setups", setter:setSetups, defaults:DEF_SETUPS})}
        {renderEditList({n:"03", title:"emotions", items:emotions, storeKey:"emotions", setter:setEmotions, defaults:DEF_EMOTIONS})}
        {renderEditList({n:"04", title:"trade types", items:tradeTypes, storeKey:"tradeTypes", setter:setTradeTypes, defaults:DEF_TYPES})}
      </div>
    );
  };

  /* ────────────────────────────────────────────────────────
     LAYOUT
  ──────────────────────────────────────────────────────── */
  const renderSidebar = () => (
    <aside style={{borderRight:T.rule1, padding:`${T.s[8]}px ${T.s[6]}px ${T.s[6]}px`, display:"flex", flexDirection:"column", background:T.bg, position:"fixed", top:0, left:0, width:220, boxSizing:"border-box", height:`calc(100vh / ${settings.textScale||1})`, overflow:"hidden", zIndex:40}}>
      <div style={{flexShrink:0}}>
        <div style={{color:T.amb,fontSize:T.size.label,textTransform:"uppercase",letterSpacing:".18em"}}>trading journal</div>
        <div style={{fontSize:T.size.h1,fontWeight:T.weight.thin,letterSpacing:"-.02em",marginTop:T.s[2],color:T.text}}>Top 1%</div>
      </div>

      <nav style={{marginTop:T.s[10], flex:1, minHeight:0, overflowY:"auto"}}>
        {TABS.map((t, i) => (
          <div key={t.key} onClick={()=>setTab(t.key)} style={{display:"flex",gap:T.s[4],alignItems:"baseline",padding:`${T.s[3]}px 0`,cursor:"pointer",color:tab===t.key?T.amb:T.mut,borderBottom:T.rule1}}>
            <span style={{color:tab===t.key?T.amb:T.mut2,fontSize:T.size.label}}>{String(i+1).padStart(2,"0")}</span>
            <span style={{fontSize:T.size.body}}>{t.label}</span>
            {tab===t.key && <span style={{marginLeft:"auto",color:T.amb,fontSize:T.size.small}}>◀</span>}
          </div>
        ))}
        <div style={{marginTop:T.s[6], paddingTop:T.s[4], borderTop:T.rule1}}>
          <div style={{...sty.label,marginBottom:T.s[3]}}>tools</div>
          {[
            ["customize", "customize"],
            ["settings",  "settings"],
          ].map(([k,l]) => (
            <div key={k} onClick={()=>setDrawer(k)} style={{display:"flex",gap:T.s[3],padding:`${T.s[2]}px 0`,cursor:"pointer",color:T.mut,fontSize:T.size.small}}>
              <span style={{color:T.mut2}}>·</span>{l}
            </div>
          ))}
        </div>
      </nav>

      <div style={{paddingTop:T.s[5], borderTop:T.rule1, flexShrink:0}}>
        <div style={{...sty.label,marginBottom:T.s[3]}}>session</div>
        <div style={{fontSize:T.size.small, color:T.mut, lineHeight:2}}>
          <div>acct &nbsp;<span style={{color:T.text}}>{activeUser}</span></div>
          <div>cap &nbsp;&nbsp;<span style={{color:T.text}}>{fmt(settings.capital)}</span></div>
          <div>today<span style={{color:todayPnl>=0?T.gr:T.rd}}>&nbsp;{fmt(todayPnl)}</span></div>
        </div>
        <div style={{fontSize:T.size.tiny,color:T.mut2,marginTop:T.s[3],letterSpacing:".1em"}}>build {BUILD}</div>
      </div>
    </aside>
  );

  const renderTab = () => {
    switch(tab) {
      case "dashboard": return renderDashboard();
      case "journal":   return renderJournal();
      case "trades":    return renderTrades();
      case "plans":     return renderPlans();
      case "review":    return renderReview();
      case "analytics": return renderAnalytics();
      default:          return renderDashboard();
    }
  };

  return (
    <div style={{background:T.bg,minHeight:"100vh",color:T.text,fontFamily:"'JetBrains Mono', ui-monospace, monospace",fontWeight:T.weight.light,zoom:settings.textScale||1,width:"100%",maxWidth:"100vw",overflowX:isMob?"hidden":"visible"}}>
      {!isMob ? (
        <div style={{minHeight:"100vh"}}>
          {renderSidebar()}
          <main style={{marginLeft:220, padding:`${T.s[8]}px ${T.s[12]}px ${T.s[16]}px`, maxWidth:1100}}>
            <div style={{color:T.mut2, fontSize:T.size.label, letterSpacing:".2em", marginBottom:T.s[8]}}>
              ./ {tab} &nbsp;·&nbsp; screen {String(TABS.findIndex(t=>t.key===tab)+1).padStart(2,"0")} of {String(TABS.length).padStart(2,"0")}
            </div>
            {renderTab()}
          </main>
        </div>
      ) : (
        <>
          <div style={{padding:`${T.s[3]}px ${T.s[4]}px`,borderBottom:T.rule1,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:T.bg,zIndex:50,minHeight:60,paddingTop:`calc(${T.s[3]}px + env(safe-area-inset-top))`}}>
            <div style={{display:"flex",alignItems:"center",gap:T.s[3]}}>
              <span style={{color:T.amb,fontSize:T.size.h2,fontWeight:T.weight.bold,fontFamily:"'JetBrains Mono', monospace",letterSpacing:"-.02em"}}>1%</span>
              <span style={{color:T.text,fontSize:T.size.body,fontWeight:T.weight.thin}}>Top 1%</span>
            </div>
            <button onClick={()=>setMobileMenu(v=>!v)} aria-label="Tools menu"
              style={{background:mobileMenu?T.amb:"transparent",color:mobileMenu?T.bg:T.amb,
                      border:`1px solid ${T.amb}`,cursor:"pointer",
                      minWidth:88,height:44,display:"flex",alignItems:"center",justifyContent:"center",gap:T.s[2],
                      fontSize:T.size.small,fontFamily:"'JetBrains Mono', monospace",
                      textTransform:"uppercase",letterSpacing:".14em",padding:`0 ${T.s[3]}px`,
                      touchAction:"manipulation",WebkitTapHighlightColor:"rgba(212,167,71,0.3)"}}>
              <span style={{fontSize:T.size.h3,lineHeight:1}}>{mobileMenu ? "×" : "≡"}</span>
              <span>{mobileMenu ? "close" : "menu"}</span>
            </button>
          </div>

          {/* Mobile tools menu — slides down */}
          {mobileMenu && (
            <div style={{position:"fixed",top:`calc(60px + env(safe-area-inset-top))`,left:0,right:0,background:T.bg,borderBottom:T.rule1,zIndex:49,padding:`${T.s[3]}px ${T.s[4]}px ${T.s[5]}px`,boxShadow:"0 10px 30px rgba(0,0,0,0.5)",maxHeight:"calc(100vh - 60px - env(safe-area-inset-top))",overflowY:"auto"}}>
              <div style={{...sty.label,marginBottom:T.s[3]}}>tools</div>
              {[
                ["customize", "customize"],
                ["settings",  "settings"],
              ].map(([k,l]) => (
                <button key={k} onClick={()=>{setDrawer(k); setMobileMenu(false);}}
                  style={{display:"block",width:"100%",textAlign:"left",
                          background:"transparent",border:"none",borderBottom:T.rule1,
                          padding:`${T.s[4]}px ${T.s[1]}px`,color:T.text,
                          fontFamily:"'JetBrains Mono', monospace",fontSize:T.size.body,
                          cursor:"pointer",minHeight:48,touchAction:"manipulation",WebkitTapHighlightColor:"rgba(212,167,71,0.2)"}}>
                  · {l}
                </button>
              ))}
              <div style={{padding:`${T.s[4]}px 0 ${T.s[2]}px`,fontSize:T.size.small,color:T.mut}}>
                acct <span style={{color:T.text}}>{activeUser}</span> · today <span style={{color:todayPnl>=0?T.gr:T.rd}}>{fmt(todayPnl)}</span>
                <div style={{fontSize:T.size.tiny,color:T.mut2,marginTop:T.s[2],letterSpacing:".1em"}}>build {BUILD}</div>
              </div>
              <button onClick={()=>{switchUser(); setMobileMenu(false);}}
                style={{...sty.btn(),width:"100%",marginTop:T.s[3]}}>
                switch profile
              </button>
            </div>
          )}
          <div style={{padding:`${T.s[5]}px ${T.s[4]}px`,paddingBottom:`calc(${T.s[20]}px + env(safe-area-inset-bottom))`,maxWidth:"100vw",overflowX:"hidden"}}>{renderTab()}</div>
          <div style={{position:"fixed", bottom:0, left:0, right:0, background:T.bg, borderTop:T.rule1, display:"flex", paddingBottom:"env(safe-area-inset-bottom)", zIndex:99}}>
            {TABS.map((t,i) => (
              <button key={t.key} onClick={()=>{setTab(t.key); setMobileMenu(false);}}
                style={{flex:1,minWidth:0,background:"transparent",border:"none",padding:`${T.s[3]}px 1px`,cursor:"pointer",
                        color:tab===t.key?T.amb:T.mut,fontFamily:"inherit",
                        fontSize:T.size.tiny,textTransform:"uppercase",letterSpacing:".04em",
                        minHeight:56,touchAction:"manipulation",WebkitTapHighlightColor:"rgba(212,167,71,0.2)",
                        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                <div style={{fontSize:T.size.small,color:tab===t.key?T.amb:T.mut2,marginBottom:2}}>{String(i+1).padStart(2,"0")}</div>
                {t.short||t.label}
              </button>
            ))}
          </div>
        </>
      )}

      {drawer && renderDrawer()}
    </div>
  );
}
