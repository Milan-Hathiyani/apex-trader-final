import { useState, useEffect } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://innfzimqqrlprxkeduyk.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlubmZ6aW1xcXJscHJ4a2VkdXlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MzU3MDYsImV4cCI6MjA5NTIxMTcwNn0.AwGuyUHZmEj7Rbt_xrbxhD7FUKuVlxZ8gt93Mb9u7nI"
);

// ── THEME — LEDGER ──────────────────────────────────────────
// Monochrome terminal. JetBrains Mono. Bone-on-black, single amber accent.
const BG   = "#0a0a0a";
const SURF = "#101010";
const CARD = "#141414";
const BOR  = "#2a2620";
const WHT  = "#e3dccb";   // bone — primary text
const AMB  = "#d4a747";   // amber — sole accent
const GR   = "#6b9e6b";   // muted green — positive P&L only
const RD   = "#a85a52";   // muted warm red — negative P&L only
const MUT  = "#8a8270";   // dim
const MUT2 = "#4a4538";   // dim2

// ── DEFAULT DATA ─────────────────────────────────────────────
const DEF_INSTRUMENTS = ["XAU/USD","NASDAQ","Silver","USOIL","Nifty","Bitcoin"];
const DEF_SETUPS = ["Sell at Resistance","Buy at Resistance Breakout","Buy at Support","Sell at Support Break","Double Top","Double Bottom","Head & Shoulders","Bear Trap","Bull Trap","Inside Candle","Trendline Breakdown","Consolidation Breakout","Consolidation Breakdown","Nifty Straddle","Nifty Strangle"];
const DEF_EMOTIONS = ["Calm","Confident","Anxious","Frustrated","Excited","Fearful","Neutral"];
const DEF_TYPES = ["Intraday","Swing","Positional"];
const DEF_CHECKS = {
  "Market Conditions": ["Daily trend is clear and identifiable","Trading TF trend aligns with Daily trend","Pattern is obvious — no need to look twice","Setup is at a key S/R level","Risk:Reward is minimum 1:2","Stop loss is behind clear structure","Market structure is clear — no chop"],
  "Psychology Check":  ["I am NOT angry or frustrated","I am NOT zoned out or distracted","I have had enough sleep","I am at my emotional baseline","This is NOT a FOMO trade","I have NOT hit my daily loss limit","I am ready to follow my rules"],
  "Risk Management":   ["Position size is correctly calculated","Daily loss limit not breached","Weekly loss limit not breached","Monthly loss limit not breached","Within max intraday trades for today"],
};
const GRADES = ["A+","A","B","C"];
const MENTAL = ["Excellent","Good","Neutral","Poor","Terrible"];
const DEFAULT_SETTINGS = { traderName:"Trader", capital:1000000, baseRisk:0.3, majorRisk:1.0, drawdownRisk:0.15, dailyLimit:30000, weeklyLimit:75000, monthlyLimit:200000, maxIntraday:4, minRR:2, textScale:1 };

// ── HELPERS ──────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n||0);
const todayStr = () => new Date().toISOString().split("T")[0];
const nowTime  = () => new Date().toTimeString().slice(0,5);
const lsGet = (k) => { try { const v=localStorage.getItem(k); return v?JSON.parse(v):null; } catch(e){return null;} };
const lsSet = (k,v) => { try { localStorage.setItem(k,JSON.stringify(v)); } catch(e){} };
const lsDel = (k) => { try { localStorage.removeItem(k); } catch(e){} };


// ── ZERODHA CHARGE CALCULATOR ────────────────────────────────
// Source: zerodha.com/charges (live fetch May 2026)
const SEGMENTS = [
  "F&O — Futures",
  "F&O — Options",
  "Commodity — Futures",
  "Commodity — Options",
  "Equity — Intraday",
  "Equity — Delivery",
];

const detectSegment = (instrument, setup) => {
  const i = (instrument||"").toLowerCase();
  const s = (setup||"").toLowerCase();
  const comInstr = ["gold","silver","crude","natural gas","copper","zinc","aluminium","lead","nickel"];
  const isCom = comInstr.some(c => i.includes(c));
  const isOpt = s.includes("straddle") || s.includes("strangle") || i.includes("option");
  if (isCom) return isOpt ? "Commodity — Options" : "Commodity — Futures";
  return isOpt ? "F&O — Options" : "F&O — Futures";
};

const calcCharges = (buyVal, sellVal, nBuyOrders, nSellOrders, segment) => {
  if (!buyVal || !sellVal) return null;
  const totalVal = buyVal + sellVal;
  const isFutures  = segment.includes("Futures") || segment.includes("Intraday") || segment.includes("Delivery");
  const isCom      = segment.includes("Commodity");
  const isDelivery = segment.includes("Delivery");
  const isOptions  = segment.includes("Options");

  // 1. Brokerage
  let brk = 0;
  if (isDelivery) {
    brk = 0; // free
  } else if (isOptions) {
    brk = (nBuyOrders + nSellOrders) * 20;
  } else {
    const avgBuy  = nBuyOrders  > 0 ? buyVal  / nBuyOrders  : 0;
    const avgSell = nSellOrders > 0 ? sellVal / nSellOrders : 0;
    brk = Math.min(avgBuy  * 0.0003, 20) * nBuyOrders
        + Math.min(avgSell * 0.0003, 20) * nSellOrders;
  }

  // 2. STT / CTT
  let stt = 0;
  if (isDelivery)                  stt = totalVal * 0.001;          // 0.1% both sides
  else if (segment === "F&O — Futures")         stt = sellVal * 0.0005;
  else if (segment === "F&O — Options")         stt = sellVal * 0.0015;
  else if (segment === "Commodity — Futures")   stt = sellVal * 0.0001;
  else if (segment === "Commodity — Options")   stt = sellVal * 0.0005;
  else stt = sellVal * 0.00025; // equity intraday

  // 3. Transaction charges
  let txn = 0;
  if (segment === "F&O — Futures")              txn = totalVal * 0.0000183;
  else if (segment === "F&O — Options")         txn = totalVal * 0.0003553;
  else if (segment === "Commodity — Futures")   txn = totalVal * 0.0000210;
  else if (segment === "Commodity — Options")   txn = totalVal * 0.000418;
  else if (isDelivery)                          txn = totalVal * 0.0000307;
  else                                          txn = totalVal * 0.0000307; // intraday NSE

  // 4. SEBI charges (₹10/crore)
  const sebi = totalVal * (10 / 1e7);

  // 5. GST — 18% on (brokerage + SEBI + txn)
  const gst = (brk + sebi + txn) * 0.18;

  // 6. Stamp duty (buy side only)
  let stamp = 0;
  if (isDelivery)                    stamp = buyVal * 0.00015;
  else if (isOptions)                stamp = buyVal * 0.00003;
  else if (segment.includes("Intraday")) stamp = buyVal * 0.00003;
  else                               stamp = buyVal * 0.00002;

  const total = brk + stt + txn + sebi + gst + stamp;
  return {
    brokerage:   +brk.toFixed(2),
    stt:         +stt.toFixed(2),
    txnCharges:  +txn.toFixed(2),
    sebi:        +sebi.toFixed(2),
    gst:         +gst.toFixed(2),
    stamp:       +stamp.toFixed(2),
    totalCharges:+total.toFixed(2),
  };
};

const applyChargesToTrade = (trade) => {
  const entry = parseFloat(trade.entry);
  const exit  = parseFloat(trade.exitPrice);
  const size  = parseFloat(trade.size);
  if (!entry || !exit || !size) return trade;

  const buyVal  = trade.direction === "Long" ? entry * size : exit  * size;
  const sellVal = trade.direction === "Long" ? exit  * size : entry * size;
  const seg     = trade.segment || detectSegment(trade.instrument, trade.setup);
  const charges = calcCharges(buyVal, sellVal, 1, 1, seg);
  if (!charges) return trade;

  const grossPnl = trade.direction === "Long"
    ? (exit - entry) * size
    : (entry - exit) * size;
  const netPnl = +(grossPnl - charges.totalCharges).toFixed(2);

  return {
    ...trade,
    grossPnl:     String(+grossPnl.toFixed(2)),
    pnl:          String(netPnl),
    brokerage:    String(charges.brokerage),
    stt:          String(charges.stt),
    txnCharges:   String(charges.txnCharges),
    sebi:         String(charges.sebi),
    gst:          String(charges.gst),
    stamp:        String(charges.stamp),
    totalCharges: String(charges.totalCharges),
    segment:      seg,
  };
};


// ── SUPABASE SYNC ────────────────────────────────────────────
const sbLoadList = async (table, userName) => {
  try {
    const { data, error } = await sb.from(table).select("data").eq("user_name", userName);
    if (error || !data) return null;
    return data.map(r => r.data).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  } catch(e) { return null; }
};
const sbSaveList = async (table, list, userName) => {
  try {
    await sb.from(table).delete().eq("user_name", userName);
    if (list.length > 0)
      await sb.from(table).insert(list.map(t=>({id:t.id, user_name:userName, data:t})));
  } catch(e) { console.warn(`Supabase ${table} sync failed`); }
};
const sbLoadSettings = async (userName) => {
  try {
    const { data } = await sb.from("settings").select("data").eq("user_name", userName);
    return data?.[0]?.data || null;
  } catch(e) { return null; }
};
const sbSaveSettings = async (s, userName) => {
  try { await sb.from("settings").upsert({user_name:userName, data:s}); } catch(e) {}
};
const sbLoadCustom = async (userName) => {
  try {
    const { data } = await sb.from("customizations").select("*").eq("user_name", userName);
    return data?.[0] || null;
  } catch(e) { return null; }
};
const sbSaveCustom = async (obj, userName) => {
  try { await sb.from("customizations").upsert({user_name:userName, ...obj}); } catch(e) {}
};
const sbLoadUsers = async () => {
  try {
    const { data } = await sb.from("users").select("user_name");
    return data?.map(r=>r.user_name) || null;
  } catch(e) { return null; }
};
const sbSaveUser = async (name) => {
  try { await sb.from("users").upsert({user_name:name}); } catch(e) {}
};
const sbDeleteUser = async (name) => {
  try {
    await sb.from("trades").delete().eq("user_name", name);
    await sb.from("reviews").delete().eq("user_name", name);
    await sb.from("settings").delete().eq("user_name", name);
    await sb.from("customizations").delete().eq("user_name", name);
    await sb.from("users").delete().eq("user_name", name);
  } catch(e) {}
};

const emptyTrade = (instr,type,setup,emo) => ({ date:todayStr(), time:nowTime(), instrument:instr||"", tradeType:type||"Intraday", direction:"Long", setup:setup||"", segment:detectSegment(instr||'',setup||''), entry:"", sl:"", exitPrice:"", size:"", riskAmount:"", grossPnl:"", pnl:"", brokerage:"", stt:"", txnCharges:"", sebi:"", gst:"", stamp:"", totalCharges:"", rrAchieved:"", grade:"A", followedRules:"Yes", emotion:emo||"Calm", mistakes:"", improvements:"", notes:"" });
const emptyPlan   = (instr) => ({ date:todayStr(), instrument:instr||"", bias:"Bullish", grade:"A", keyLevels:"", setup:"", entryZone:"", sl:"", target1:"", target2:"", invalidation:"", confluences:"", notes:"" });
const emptyReview = (p) => ({ date:todayStr(), period:p, mentalState:"Good", whatWentWell:"", mistakes:"", missedSetups:"", rulesFollowed:"", emotionalTrading:"", regrets:"", improvements:"", selfCoaching:"" });

// ── EXPORT HELPERS ───────────────────────────────────────────
const exportCSV = (trades) => {
  if(!trades.length){alert("No trades to export.");return;}
  const h=["Date","Time","Instrument","Trade Type","Direction","Setup","Segment","Entry","SL","Exit","Size","Risk(₹)","Gross P&L(₹)","Brokerage","STT","Txn","GST","Stamp","SEBI","Total Charges","Net P&L(₹)","R:R","Grade","Rules","Emotion","Mistakes","Improvements","Notes"];
  const rows=trades.map(t=>[t.date,t.time,t.instrument,t.tradeType,t.direction,t.setup,t.segment||"",t.entry,t.sl,t.exitPrice,t.size,t.riskAmount,t.grossPnl||"",t.brokerage||"",t.stt||"",t.txnCharges||"",t.gst||"",t.stamp||"",t.sebi||"",t.totalCharges||"",t.pnl,t.rrAchieved,t.grade,t.followedRules,t.emotion,`"${(t.mistakes||"").replace(/"/g,'""')}"`,`"${(t.improvements||"").replace(/"/g,'""')}"`,`"${(t.notes||"").replace(/"/g,'""')}"`]);
  const csv=[h.join(","),...rows.map(r=>r.join(","))].join("\n");
  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download=`top1pct_trades_${todayStr()}.csv`; a.click();
};
const exportReviewsCSV = (reviews) => {
  if(!reviews.length){alert("No reviews to export.");return;}
  const h=["Date","Period","Mental State","Went Well","Mistakes","Missed","Rules","Emotional","Regrets","Improvements","Coaching"];
  const rows=reviews.map(r=>[r.date,r.period,r.mentalState,...["whatWentWell","mistakes","missedSetups","rulesFollowed","emotionalTrading","regrets","improvements","selfCoaching"].map(k=>`"${(r[k]||"").replace(/"/g,'""')}"`)])
  const csv=[h.join(","),...rows.map(r=>r.join(","))].join("\n");
  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download=`top1pct_reviews_${todayStr()}.csv`; a.click();
};

// ── SHARED STYLE BUILDERS ────────────────────────────────────
// Ledger style builders — hairline borders, no radius, monospace
const card  = (extra={}) => ({ background:SURF, borderTop:`1px solid ${BOR}`, borderBottom:`1px solid ${BOR}`, borderLeft:"none", borderRight:"none", borderRadius:"0", padding:"18px 0", marginBottom:"20px", ...extra });
const inp   = (extra={}) => ({ background:"transparent", border:"none", borderBottom:`1px solid ${MUT2}`, color:WHT, padding:"8px 0", borderRadius:"0", width:"100%", fontSize:"14px", boxSizing:"border-box", minHeight:"44px", outline:"none", ...extra });
const sel   = (extra={}) => ({ background:BG, border:`1px solid ${MUT2}`, color:WHT, padding:"8px 10px", borderRadius:"0", width:"100%", fontSize:"13px", boxSizing:"border-box", minHeight:"44px", ...extra });
const ta    = (extra={}) => ({ background:CARD, border:`1px solid ${BOR}`, color:WHT, padding:"12px 14px", borderRadius:"0", width:"100%", fontSize:"13px", boxSizing:"border-box", resize:"vertical", minHeight:"80px", lineHeight:"1.65", ...extra });
const lbl   = { color:MUT, fontSize:"10px", display:"block", marginBottom:"6px", textTransform:"uppercase", letterSpacing:"0.18em" };
const h2sty = { color:AMB, fontSize:"10px", fontWeight:"400", letterSpacing:"0.18em", marginBottom:"16px", textTransform:"uppercase" };
const btn   = (extra={}) => ({ background:AMB, color:BG, border:`1px solid ${AMB}`, padding:"10px 22px", borderRadius:"0", cursor:"pointer", fontWeight:"500", fontSize:"11px", textTransform:"uppercase", letterSpacing:"0.16em", minHeight:"44px", ...extra });
const btnGh = (extra={}) => ({ background:"transparent", color:WHT, border:`1px solid ${MUT2}`, padding:"10px 22px", borderRadius:"0", cursor:"pointer", fontSize:"11px", textTransform:"uppercase", letterSpacing:"0.16em", minHeight:"44px", ...extra });
const ttSty  = { background:CARD, border:`1px solid ${BOR}`, color:WHT, fontSize:"11px", fontFamily:"'JetBrains Mono', monospace" };
const ttLabel= { color:WHT, fontSize:"11px" };
const ttItem = { color:WHT, fontSize:"11px" };
const mentalColor = (m) => ["Excellent","Good"].includes(m) ? GR : m==="Neutral" ? AMB : RD;

export default function App() {
  // ── STATE ─────────────────────────────────────────────────
  const [tab,      setTab]      = useState("dashboard");
  const [isMob,    setIsMob]    = useState(window.innerWidth < 640);
  const [showMore, setShowMore] = useState(false);
  const [trades,   setTrades]   = useState([]);
  const [reviews,  setReviews]  = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [draft,    setDraft]    = useState(DEFAULT_SETTINGS);
  const [savedMsg, setSavedMsg] = useState("");
  const [loaded,   setLoaded]   = useState(false);
  const [ck,       setCk]       = useState({});
  const [atab,     setAtab]     = useState("intraday");
  const [rtab,     setRtab]     = useState("daily");
  const [activeUser,  setActiveUser]  = useState(null);
  const [userList,    setUserList]    = useState([]);
  const [newUserName, setNewUserName] = useState("");
  const [userScreen,  setUserScreen]  = useState(true);
  const [importMsg,   setImportMsg]   = useState("");
  const [tSearch,  setTSearch]  = useState("");
  const [expandedTradeId, setExpandedTradeId] = useState(null);
  const DEF_TAB_ORDER = ["dashboard","journal","trades","checklist","risk","plan","analytics","review","customize","settings"];
  const [tabOrder,    setTabOrder]    = useState(() => lsGet("top1pct_tabOrder") || DEF_TAB_ORDER);
  const [sectionMins, setSectionMins] = useState({});
  const [tFInstr,  setTFInstr]  = useState("All");
  const [tFType,   setTFType]   = useState("All");
  const [tFDir,    setTFDir]    = useState("All");
  const [tFGrade,  setTFGrade]  = useState("All");
  const [tFFrom,   setTFFrom]   = useState("");
  const [tFTo,     setTFTo]     = useState("");

  // customisable lists
  const [instruments, setInstruments] = useState(DEF_INSTRUMENTS);
  const [setups,      setSetups]      = useState(DEF_SETUPS);
  const [emotions,    setEmotions]    = useState(DEF_EMOTIONS);
  const [tradeTypes,  setTradeTypes]  = useState(DEF_TYPES);
  const [checks,      setChecks]      = useState(DEF_CHECKS);

  // forms
  const [tf, setTf] = useState(null);
  const [pf, setPf] = useState(null);
  const [rf, setRf] = useState(emptyReview("daily"));
  const [rc, setRc] = useState({ capital:1000000, riskType:"base", entry:"", sl:"", rr:"2" });

  const uk = (type) => `top1pct_${activeUser}_${type}`;

  // ── EFFECTS ───────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const sbUsers = await sbLoadUsers();
      if (sbUsers !== null) { setUserList(sbUsers); lsSet("top1pct_users", sbUsers); }
      else { setUserList(lsGet("top1pct_users") || []); }
      setLoaded(true);
      const onResize = () => setIsMob(window.innerWidth < 640);
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    })();
  }, []);

  useEffect(() => {
    if (!activeUser) return;
    (async () => {
      // Trades
      const sbT = await sbLoadList("trades", activeUser);
      if (sbT !== null) { setTrades(sbT); lsSet(uk("trades"), sbT); }
      else setTrades(lsGet(uk("trades")) || []);

      // Reviews
      const sbR = await sbLoadList("reviews", activeUser);
      if (sbR !== null) { setReviews(sbR); lsSet(uk("reviews"), sbR); }
      else setReviews(lsGet(uk("reviews")) || []);

      // Settings
      const sbS = await sbLoadSettings(activeUser);
      if (sbS) { setSettings(sbS); setDraft(sbS); setRc(r=>({...r,capital:sbS.capital})); lsSet(uk("settings"), sbS); }
      else {
        const s = lsGet(uk("settings"));
        if (s) { setSettings(s); setDraft(s); setRc(r=>({...r,capital:s.capital})); }
        else { const ds={...DEFAULT_SETTINGS,traderName:activeUser}; setSettings(ds); setDraft(ds); }
      }

      // Customizations
      const sbC = await sbLoadCustom(activeUser);
      if (sbC) {
        if(sbC.instruments){setInstruments(sbC.instruments);lsSet(uk("instruments"),sbC.instruments);}else setInstruments(lsGet(uk("instruments"))||DEF_INSTRUMENTS);
        if(sbC.setups){setSetups(sbC.setups);lsSet(uk("setups"),sbC.setups);}else setSetups(lsGet(uk("setups"))||DEF_SETUPS);
        if(sbC.emotions){setEmotions(sbC.emotions);lsSet(uk("emotions"),sbC.emotions);}else setEmotions(lsGet(uk("emotions"))||DEF_EMOTIONS);
        if(sbC.trade_types){setTradeTypes(sbC.trade_types);lsSet(uk("tradeTypes"),sbC.trade_types);}else setTradeTypes(lsGet(uk("tradeTypes"))||DEF_TYPES);
        if(sbC.checks){setChecks(sbC.checks);lsSet(uk("checks"),sbC.checks);}else setChecks(lsGet(uk("checks"))||DEF_CHECKS);
        const sm=lsGet(uk("sectionMins")); if(sm) setSectionMins(sm);
      } else {
        setInstruments(lsGet(uk("instruments"))||DEF_INSTRUMENTS);
        setSetups(lsGet(uk("setups"))||DEF_SETUPS);
        setEmotions(lsGet(uk("emotions"))||DEF_EMOTIONS);
        setTradeTypes(lsGet(uk("tradeTypes"))||DEF_TYPES);
        setChecks(lsGet(uk("checks"))||DEF_CHECKS);
        const sm=lsGet(uk("sectionMins")); if(sm) setSectionMins(sm);
      }
    })();
  }, [activeUser]);

  useEffect(() => {
    if (instruments.length) { setTf(emptyTrade(instruments[0],tradeTypes[0],setups[0],emotions[0])); setPf(emptyPlan(instruments[0])); }
  }, [instruments, setups, emotions, tradeTypes]);

  // ── PERSIST ───────────────────────────────────────────────
  const pTrades   = (l) => { setTrades(l);   lsSet(uk("trades"),l);   sbSaveList("trades",l,activeUser); };
  const pReviews  = (l) => { setReviews(l);  lsSet(uk("reviews"),l);  sbSaveList("reviews",l,activeUser); };
  const pSettings = (s) => { setSettings(s); lsSet(uk("settings"),s); sbSaveSettings(s,activeUser); };
  const pList     = (k,v,setter) => {
    setter(v); lsSet(uk(k),v);
    const colMap={instruments:"instruments",setups:"setups",emotions:"emotions",tradeTypes:"trade_types",checks:"checks"};
    if(colMap[k]) sbSaveCustom({[colMap[k]]:v},activeUser);
  };

  // ── USER MANAGEMENT ───────────────────────────────────────
  const createUser = () => {
    const name=newUserName.trim(); if(!name)return;
    if(userList.includes(name)){alert("Profile already exists.");return;}
    const updated=[...userList,name]; setUserList(updated); lsSet("top1pct_users",updated);
    sbSaveUser(name);
    setNewUserName(""); setActiveUser(name); setUserScreen(false);
  };
  const loginUser  = (name) => { setActiveUser(name); setUserScreen(false); setTrades([]); setReviews([]); };
  const switchUser = () => { setActiveUser(null); setUserScreen(true); setTrades([]); setReviews([]); setSettings(DEFAULT_SETTINGS); };
  const deleteUser = (name) => {
    if(!window.confirm(`Delete "${name}" and all their data?`))return;
    const updated=userList.filter(u=>u!==name); setUserList(updated); lsSet("top1pct_users",updated);
    ["trades","reviews","settings","instruments","setups","emotions","tradeTypes","checks"].forEach(k=>lsDel(`top1pct_${name}_${k}`));
    sbDeleteUser(name);
    if(activeUser===name) switchUser();
  };

  // ── TRADE ACTIONS ─────────────────────────────────────────
  const logTrade    = () => { if(!tf||!tf.entry||!tf.sl){alert("Entry and SL required");return;} const finalTrade=applyChargesToTrade({...tf,id:Date.now()}); pTrades([finalTrade,...trades]); setTf(emptyTrade(instruments[0],tradeTypes[0],setups[0],emotions[0])); };
  const deleteTrade = (id) => pTrades(trades.filter(t=>t.id!==id));
  const logReview   = () => { pReviews([{...rf,id:Date.now()},...reviews]); setRf(emptyReview(rtab)); };
  const deleteReview= (id) => pReviews(reviews.filter(r=>r.id!==id));
  const saveSettings= () => { pSettings(draft); setRc(r=>({...r,capital:draft.capital})); setSavedMsg("✓ Settings saved"); setTimeout(()=>setSavedMsg(""),2500); };

  // ── IMPORT ────────────────────────────────────────────────
  const [importStatus, setImportStatus] = useState(null); // {done, added, skipped, error}

  const tradeFingerprint = (t) => {
    const entry = Math.round(parseFloat(t.entry || 0));
    const instr = (t.instrument || "").toLowerCase().replace(/\s+/g,"");
    return `${t.date}_${instr}_${(t.direction||"").toLowerCase()}_${entry}`;
  };

  const doMerge = (imported) => {
    if (!Array.isArray(imported)) throw new Error("Invalid format");
    const existingIds          = new Set(trades.map(t => String(t.id)));
    const existingFingerprints = new Set(trades.map(tradeFingerprint));

    const withCharges = imported.map(t => {
      if (t.totalCharges && parseFloat(t.totalCharges) > 0) return t;
      return applyChargesToTrade({...t, segment: t.segment || detectSegment(t.instrument, t.setup)});
    });

    const newTrades = withCharges.filter(t =>
      !existingIds.has(String(t.id)) &&
      !existingFingerprints.has(tradeFingerprint(t))
    );
    const merged = [...newTrades, ...trades].sort((a,b) => b.date.localeCompare(a.date));
    pTrades(merged);
    setImportStatus({ done:true, added:newTrades.length, skipped:imported.length-newTrades.length });
    setTimeout(() => setImportStatus(null), 5000);
  };

  // Import JSON
  const importJSON = (file) => {
    if (!file) return;
    setImportStatus({ loading: true, msg: "Reading JSON..." });
    const reader = new FileReader();
    reader.onload = (e) => {
      try { doMerge(JSON.parse(e.target.result)); }
      catch(err) { setImportStatus({ error: "Invalid JSON file." }); }
    };
    reader.readAsText(file);
  };

  // Import Zerodha Excel tradebook
  const importExcel = async (file) => {
    if (!file) return;
    setImportStatus({ loading: true, msg: "Parsing Excel..." });
    try {
      const XLSX = await import("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm");
      const buf  = await file.arrayBuffer();
      const wb   = XLSX.read(buf, { type:"array", cellDates:true });
      const sheet= wb.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header:1, raw:false });

      // Find header row
      let hRow = -1;
      for (let i=0; i<rows.length; i++) {
        if (rows[i].includes("Symbol") && rows[i].includes("Trade Type")) { hRow=i; break; }
      }
      if (hRow < 0) { setImportStatus({ error:"Could not find header row. Is this a Zerodha tradebook?" }); return; }

      const headers = rows[hRow];
      const col = (name) => headers.findIndex(h => String(h).trim() === name);
      const iSym=col("Symbol"), iType=col("Trade Type"), iPrice=col("Price"),
            iQty=col("Quantity"), iTime=col("Order Execution Time"), iDate=col("Trade Date");
      if ([iSym,iType,iPrice,iQty,iTime].some(i=>i<0)) {
        setImportStatus({ error:"Missing columns. Check file format." }); return;
      }

      // Build rows
      const data = rows.slice(hRow+1).map(r => ({
        symbol:    String(r[iSym]||"").trim(),
        type:      String(r[iType]||"").trim().toLowerCase(),
        price:     parseFloat(r[iPrice]||0),
        qty:       parseInt(r[iQty]||0),
        time:      r[iTime],
        date:      r[iDate] || r[iTime],
      })).filter(r => r.symbol.length > 2 && r.price > 0);

      // Map instrument
      const mapInstr = (s) => {
        const u = s.toUpperCase();
        if (u.includes("GOLDPETAL"))  return "Gold Petal";
        if (u.includes("GOLD"))       return "Gold";
        if (u.match(/SILVERM|SILVERMIC/)) return "Silver Mini";
        if (u.includes("SILVER"))    return "Silver";
        if (u.includes("CRUDEOILM")) return "Crude Oil Mini";
        if (u.includes("CRUDEOIL"))  return "Crude Oil";
        if (u.includes("NATGASMINI") || (u.includes("NATURALGAS") && u.includes("MINI"))) return "Natural Gas Mini";
        if (u.includes("NATURALGAS")) return "Natural Gas";
        if (u.includes("LEADMINI"))  return "Lead Mini";
        if (u.includes("LEAD"))      return "Lead";
        if (u.includes("ZINCMINI"))  return "Zinc Mini";
        if (u.includes("ZINC"))      return "Zinc";
        if (u.match(/COPPERMINI|COPPERMIC/)) return "Copper Mini";
        if (u.includes("COPPER"))    return "Copper";
        if (u.match(/ALUMINI|ALUMINIM/)) return "Aluminium Mini";
        if (u.includes("ALUMINIUM")) return "Aluminium";
        if (u.includes("NICKEL"))    return "Nickel";
        if (u.includes("BANKNIFTY")) return "BankNifty";
        if (u.includes("BANKEX"))    return "Bankex";
        if (u.includes("FINNIFTY"))  return "FinNifty";
        if (u.includes("MIDCPNIFTY")) return "MidcapNifty";
        if (u.includes("NIFTY"))     return "Nifty";
        if (u.includes("SENSEX"))    return "Sensex";
        const mFut = u.match(/^([A-Z&]+)\d{2}[A-Z]{3}FUT$/);
        if (mFut) return mFut[1] + " Futures";
        const mOpt = u.match(/^([A-Z&]+)\d+[A-Z]{3}\d+[CP]E$/);
        if (mOpt) return mOpt[1] + " Options";
        return s;
      };

      // Group by symbol, FIFO match
      const groups = {};
      for (const r of data) {
        if (!groups[r.symbol]) groups[r.symbol] = [];
        groups[r.symbol].push(r);
      }

      const imported = [];
      const fname = file.name;
      const year  = fname.match(/\d{4}-\d{4}/)?.[0] || "unknown";
      const seg   = fname.includes("COM") ? "COM" : "FnO";

      for (const [symbol, legs] of Object.entries(groups)) {
        const sorted = [...legs].sort((a,b) => new Date(a.time)-new Date(b.time));
        const buys   = sorted.filter(r => r.type==="buy");
        const sells  = sorted.filter(r => r.type==="sell");
        if (!buys.length || !sells.length) continue;
        const direction = sorted[0].type==="buy" ? "Long" : "Short";
        const instrument = mapInstr(symbol);
        const setup = symbol.toUpperCase().endsWith("CE") && direction==="Short" ? "Nifty Straddle"
                    : symbol.toUpperCase().endsWith("PE") && direction==="Short" ? "Nifty Strangle"
                    : direction==="Long" ? "Buy at Support" : "Sell at Resistance";
        const n = Math.min(buys.length, sells.length);
        for (let i=0; i<n; i++) {
          const b=buys[i], s=sells[i];
          const ep = direction==="Long" ? b.price : s.price;
          const xp = direction==="Long" ? s.price : b.price;
          const et = direction==="Long" ? b.time  : s.time;
          const qty = b.qty;
          const pnl = Math.round(((direction==="Long" ? xp-ep : ep-xp) * qty) * 100) / 100;
          const intra = String(b.date).slice(0,10) === String(s.date).slice(0,10);
          const etDate = new Date(et);
          const uid = Math.abs(
            [...`${symbol}_${et}_${ep}_${qty}_${direction}`].reduce((h,c)=>(h*31+c.charCodeAt(0))|0,0)
          ) % 1e12;
          imported.push({
            id: uid,
            date: etDate.toISOString().slice(0,10),
            time: etDate.toTimeString().slice(0,5),
            instrument, tradeType: intra?"Intraday":"Swing",
            direction, setup,
            entry: String(ep), sl:"", exitPrice: String(xp),
            size: String(qty), riskAmount:"", pnl: String(pnl),
            rrAchieved:"", grade:"", followedRules:"", emotion:"",
            mistakes:"", improvements:"",
            notes: `Zerodha ${seg} ${year} | ${symbol}`,
          });
        }
      }
      doMerge(imported);
    } catch(err) {
      setImportStatus({ error: "Failed to parse Excel: " + err.message });
    }
  };

  // ── DERIVED DATA ──────────────────────────────────────────
  const ALL_CHECKS = Object.values(checks).flat();
  const getMin = (sec) => { const v=sectionMins[sec]; return (v!==undefined&&v!==null) ? Number(v) : (checks[sec]?.length||0); };
  const getSectionChecked = (sec, si) => { const start=Object.values(checks).slice(0,si).flat().length; return checks[sec].filter((_,i)=>ck[start+i]==="yes").length; };
  const getSectionPct = (sec, si) => { const total=checks[sec]?.length||1; return Math.round((getSectionChecked(sec,si)/total)*100); };
  const allGreen = Object.entries(checks).every(([sec],si) => getSectionChecked(sec,si) >= getMin(sec));
  const checkedCt = ALL_CHECKS.filter((_,i)=>ck[i]==="yes").length;
  const intraday = trades.filter(t=>t.tradeType==="Intraday");
  const swing    = trades.filter(t=>t.tradeType!=="Intraday");

  const calcStats = (list) => {
    const cl=list.filter(t=>t.pnl!==""); if(!cl.length)return{total:0,winRate:"0.0",pnl:0,avgRR:"0.00",pf:"—"};
    const wins=cl.filter(t=>parseFloat(t.pnl)>0),losses=cl.filter(t=>parseFloat(t.pnl)<=0);
    const pnl=cl.reduce((s,t)=>s+parseFloat(t.pnl),0);
    const gw=wins.reduce((s,t)=>s+parseFloat(t.pnl),0),gl=Math.abs(losses.reduce((s,t)=>s+parseFloat(t.pnl),0));
    return{total:cl.length,winRate:(wins.length/cl.length*100).toFixed(1),pnl,avgRR:(cl.reduce((s,t)=>s+parseFloat(t.rrAchieved||0),0)/cl.length).toFixed(2),pf:gl?(gw/gl).toFixed(2):"∞"};
  };
  const allSt=calcStats(trades),idSt=calcStats(intraday),swSt=calcStats(swing);
  const todayPnl=trades.filter(t=>t.date===todayStr()&&t.pnl!=="").reduce((s,t)=>s+parseFloat(t.pnl),0);
  const weekPnl=(()=>{const ws=new Date();ws.setDate(ws.getDate()-ws.getDay());return trades.filter(t=>t.pnl!==""&&new Date(t.date)>=ws).reduce((s,t)=>s+parseFloat(t.pnl),0);})();
  const rcRiskAmt=rc.riskType==="major"?rc.capital*(settings.majorRisk/100):rc.riskType==="drawdown"?rc.capital*(settings.drawdownRisk/100):rc.capital*(settings.baseRisk/100);
  const rcResult=(()=>{
    const e=parseFloat(rc.entry), s=parseFloat(rc.sl);
    if(!rc.entry||!rc.sl||isNaN(e)||isNaN(s)) return null;
    const slDist=Math.abs(e-s); if(!slDist) return null;
    const dir=e>s?1:-1;
    const qty=Math.floor(rcRiskAmt/slDist);
    const posValue=qty*e;
    const tp=e+dir*slDist*parseFloat(rc.rr);
    const reward=qty*slDist*parseFloat(rc.rr);
    const seg = rc.segment || detectSegment(rc.instrument||"","");
    const estCharges = calcCharges(qty*e, qty*(rc.direction==="Short"?e:tp), 1, 1, seg);
    return {
      risk:     Math.round(rcRiskAmt),
      slDist:   slDist.toFixed(4),
      qty:      qty,
      posValue: Math.round(posValue),
      tp:       tp.toFixed(4),
      reward:   Math.round(reward),
      netReward:Math.round(reward - (estCharges?.totalCharges||0)),
      charges:  Math.round(estCharges?.totalCharges||0),
    };
  })();
  const pnlCurve  =(list)=>{let c=0;return[...list].filter(t=>t.pnl!=="").sort((a,b)=>a.date.localeCompare(b.date)).map(t=>{c+=parseFloat(t.pnl);return{date:t.date.slice(5),v:Math.round(c)};});};
  const byInstr   =(list)=>{const all=[...new Set([...instruments,...list.map(t=>t.instrument)])];return all.map(name=>{const ts=list.filter(t=>t.instrument===name&&t.pnl!=="");return{name,v:Math.round(ts.reduce((s,t)=>s+parseFloat(t.pnl),0)),n:ts.length};}).filter(d=>d.n>0);};
  const byGrade   =(list)=>GRADES.map(g=>{const ts=list.filter(t=>t.grade===g&&t.pnl!=="");return{g,v:Math.round(ts.reduce((s,t)=>s+parseFloat(t.pnl),0)),n:ts.length};});
  const byEmotion =(list)=>{const m={};list.filter(t=>t.pnl!=="").forEach(t=>{if(!m[t.emotion])m[t.emotion]=0;m[t.emotion]+=parseFloat(t.pnl);});return Object.entries(m).map(([e,v])=>({e,v:Math.round(v)}));};
  const bySetup   =(list)=>{const allS=[...new Set([...setups,...list.map(t=>t.setup)])];return allS.map(s=>{const ts=list.filter(t=>t.setup===s&&t.pnl!=="");return{s,v:Math.round(ts.reduce((a,t)=>a+parseFloat(t.pnl),0)),n:ts.length};}).filter(d=>d.n>0).sort((a,b)=>b.v-a.v);};

  // ── RESPONSIVE GRID ───────────────────────────────────────
  const M  = isMob;
  const g2 = { display:"grid", gridTemplateColumns:M?"1fr":"1fr 1fr", gap:"12px" };
  const g3 = { display:"grid", gridTemplateColumns:M?"1fr":"1fr 1fr 1fr", gap:"12px" };
  const g4 = { display:"grid", gridTemplateColumns:M?"1fr 1fr":"repeat(4,1fr)", gap:"10px" };

  // ── LOADING / PROFILE ─────────────────────────────────────
  if(!loaded)return(<div style={{background:BG,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:WHT,fontFamily:"monospace",fontSize:"16px"}}>Loading...</span></div>);

  if(userScreen)return(
    <div style={{background:BG,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"-apple-system,sans-serif",padding:"20px",boxSizing:"border-box"}}>
      <div style={{width:"100%",maxWidth:"420px"}}>
        <div style={{textAlign:"center",marginBottom:"32px"}}>
          <div style={{color:WHT,fontFamily:"monospace",fontSize:"24px",fontWeight:"700",letterSpacing:"3px",marginBottom:"6px"}}>TOP 1%</div>
          <div style={{color:MUT,fontSize:"13px"}}>Select your profile to continue</div>
        </div>
        {userList.length>0&&(
          <div style={card({marginBottom:"16px"})}>
            <div style={{fontSize:"11px",textTransform:"uppercase",letterSpacing:".14em",color:AMB,marginBottom:"14px"}}>your profiles</div>
            {userList.map(u=>(
              <div key={u} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px",borderRadius:"0",background:CARD,border:`1px solid ${BOR}`,marginBottom:"8px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                  <div style={{width:"38px",height:"38px",borderRadius:"50%",background:MUT2,border:`1px solid ${BOR}`,display:"flex",alignItems:"center",justifyContent:"center",color:WHT,fontWeight:"700",fontSize:"15px"}}>{u.charAt(0).toUpperCase()}</div>
                  <span style={{color:WHT,fontSize:"15px"}}>{u}</span>
                </div>
                <div style={{display:"flex",gap:"8px"}}>
                  <button onClick={()=>loginUser(u)} style={btn({padding:"8px 18px",fontSize:"13px"})}>Login</button>
                  <button onClick={()=>deleteUser(u)} style={{background:"transparent",color:RD,border:`1px solid ${RD}`,padding:"8px 12px",borderRadius:"0",cursor:"pointer",fontSize:"13px",minHeight:"44px"}}>Del</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={card()}>
          <div style={{fontSize:"11px",textTransform:"uppercase",letterSpacing:".14em",color:AMB,marginBottom:"14px"}}>create profile</div>
          <div style={{display:"flex",gap:"8px"}}>
            <input type="text" style={inp({flex:1})} placeholder="Enter your name..." value={newUserName} onChange={e=>setNewUserName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&createUser()}/>
            <button style={btn({whiteSpace:"nowrap"})} onClick={createUser}>Create</button>
          </div>
        </div>
      </div>
    </div>
  );

  if(!tf||!pf)return(<div style={{background:BG,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:WHT,fontFamily:"monospace",fontSize:"14px"}}>Initialising...</span></div>);

  // ── NAV TABS ──────────────────────────────────────────────
  const TAB_DEFS = [
    {key:"dashboard",label:"Dashboard", icon:"⊞"},
    {key:"journal",  label:"Journal",   icon:"✎"},
    {key:"trades",   label:"Trades",    icon:"≡"},
    {key:"checklist",label:"Checklist", icon:"✓"},
    {key:"risk",     label:"Risk Calc", icon:"◎"},
    {key:"plan",     label:"Trade Plan",icon:"◉"},
    {key:"analytics",label:"Analytics", icon:"↗"},
    {key:"review",   label:"Review",    icon:"✦"},
    {key:"customize",label:"Customize", icon:"✐"},
    {key:"settings", label:"Settings",  icon:"⚙"},
  ];
  const ALL_TABS  = tabOrder.map(k=>TAB_DEFS.find(t=>t.key===k)).filter(Boolean);
  const BOT_TABS  = ALL_TABS.slice(0,4);
  const MORE_TABS = ALL_TABS.slice(4);

  const moveTab = (key, dir) => {
    const idx = tabOrder.indexOf(key);
    if (idx < 0) return;
    const next = [...tabOrder];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setTabOrder(next);
    lsSet("top1pct_tabOrder", next);
  };
  const resetTabOrder = () => { setTabOrder(DEF_TAB_ORDER); lsSet("top1pct_tabOrder", DEF_TAB_ORDER); };

  const navTo = (key) => { setTab(key); setShowMore(false); };

  // ── DASHBOARD ─────────────────────────────────────────────
  const renderDashboard = () => {
    const LS = '1px solid ' + BOR; // hairline
    const Sec = ({n, children, right}) => (
      <div style={{display:"flex",alignItems:"baseline",gap:"14px",marginBottom:"16px",marginTop:"32px"}}>
        <span style={{color:AMB,fontSize:"11px",letterSpacing:".18em"}}>§{n}</span>
        <span style={{fontSize:"18px",fontWeight:"300",color:WHT,letterSpacing:"-.01em"}}>{children}</span>
        <div style={{flex:1,height:"1px",background:BOR,alignSelf:"center",marginLeft:"8px"}}/>
        {right&&<span style={{color:MUT,fontSize:"10px",textTransform:"uppercase",letterSpacing:".14em"}}>{right}</span>}
      </div>
    );
    return (
      <div>
        {/* Hero section */}
        <div style={{marginBottom:"8px"}}>
          <div style={{fontSize:"10px",color:AMB,textTransform:"uppercase",letterSpacing:".18em",marginBottom:"16px"}}>daily_overview</div>
          <div style={{display:"flex",alignItems:"flex-end",gap:M?"20px":"48px",flexWrap:"wrap"}}>
            <div>
              <div style={{fontSize:M?"52px":"88px",fontWeight:"200",letterSpacing:"-.04em",lineHeight:1,color:todayPnl>=0?GR:RD,fontFamily:"'JetBrains Mono',monospace"}}>
                {fmt(todayPnl)}
              </div>
              <div style={{color:MUT,fontSize:"13px",marginTop:"12px",lineHeight:1.8}}>
                <span style={{color:WHT}}>{allSt.total}</span> total trades &nbsp;·&nbsp; win rate <span style={{color:WHT}}>{allSt.winRate}%</span> &nbsp;·&nbsp; profit factor <span style={{color:AMB}}>{allSt.pf}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics strip */}
        <div style={{borderTop:LS,borderBottom:LS,display:"grid",gridTemplateColumns:M?"1fr 1fr":"repeat(6,1fr)",marginTop:"28px"}}>
          {[
            {l:"Net P&L",    v:fmt(allSt.pnl),     c:allSt.pnl>=0?GR:RD},
            {l:"Win Rate",   v:allSt.winRate+"%",   c:WHT},
            {l:"Avg R:R",    v:allSt.avgRR,         c:WHT},
            {l:"Trades",     v:allSt.total,         c:WHT},
            {l:"Daily Used", v:fmt(Math.abs(todayPnl)),c:Math.abs(todayPnl)>settings.dailyLimit*0.8?RD:MUT},
            {l:"Weekly P&L", v:fmt(weekPnl),        c:weekPnl>=0?GR:RD},
          ].map(({l,v,c},i)=>(
            <div key={l} style={{padding:"20px 22px",borderLeft:i>0?LS:"none"}}>
              <div style={{fontSize:"9px",textTransform:"uppercase",letterSpacing:".14em",color:MUT,marginBottom:"8px"}}>{l}</div>
              <div style={{fontSize:"22px",fontWeight:"300",color:c,letterSpacing:"-.01em",fontFamily:"'JetBrains Mono',monospace"}}>{v}</div>
            </div>
          ))}
        </div>

        {/* Capital Curve */}
        <Sec n="01" right={`${trades.filter(t=>t.pnl).length} trades`}>capital curve</Sec>
        {(()=>{const curve=pnlCurve(trades);return curve.length>1?(
          <div style={{marginBottom:"28px"}}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={curve}>
                <XAxis dataKey="date" stroke={MUT2} tick={{fill:MUT,fontSize:9}} interval="preserveStartEnd"/>
                <YAxis stroke={MUT2} tick={{fill:MUT,fontSize:9}} tickFormatter={v=>fmt(v)} width={80}/>
                <Tooltip contentStyle={ttSty} labelStyle={ttLabel} itemStyle={ttItem} formatter={v=>[fmt(v),"Cumulative P&L"]}/>
                <Line type="monotone" dataKey="v" stroke={allSt.pnl>=0?GR:RD} strokeWidth={1.5} dot={false}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        ):<div style={{color:MUT2,fontSize:"12px",padding:"16px 0",marginBottom:"16px"}}>no closed trades yet — start logging to see your curve.</div>;})()}

        {/* Loss limits */}
        <Sec n="02" right="limits">loss limits</Sec>
        {[
          {label:"Daily",  used:Math.max(0,-todayPnl), limit:settings.dailyLimit},
          {label:"Weekly", used:Math.max(0,-weekPnl),  limit:settings.weeklyLimit},
        ].map(x=>{
          const pct=Math.min(100,(x.used/x.limit)*100);
          return(
            <div key={x.label} style={{display:"grid",gridTemplateColumns:"70px 1fr 140px",alignItems:"center",gap:"16px",padding:"10px 0",borderBottom:`1px solid ${BOR}`}}>
              <span style={{fontSize:"12px",color:MUT,textTransform:"uppercase",letterSpacing:".1em"}}>{x.label}</span>
              <div style={{background:MUT2,height:"2px",position:"relative"}}>
                <div style={{position:"absolute",top:0,left:0,height:"2px",background:pct>80?RD:AMB,width:`${pct}%`,transition:"width 0.3s"}}/>
              </div>
              <span style={{fontSize:"12px",fontFamily:"'JetBrains Mono',monospace",color:pct>80?RD:WHT,textAlign:"right"}}>{fmt(x.used)} / {fmt(x.limit)}</span>
            </div>
          );
        })}

        {/* Recent trades */}
        <Sec n="03" right={`${trades.length} total`}>recent executions</Sec>
        {!trades.length
          ? <div style={{color:MUT2,fontSize:"13px",padding:"20px 0"}}>no trades logged yet.</div>
          : <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
              <thead>
                <tr style={{color:MUT,borderBottom:`1px solid ${BOR}`}}>
                  {["date","instrument","direction","setup","entry","exit","gross","charges","net p&l","r:r","grade"].map(h=>(
                    <th key={h} style={{padding:"6px 0",textAlign:"left",fontWeight:"400",fontSize:"10px",textTransform:"uppercase",letterSpacing:".14em",paddingRight:"16px"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trades.slice(0,8).map(t=>(
                  <tr key={t.id} style={{borderBottom:`1px solid ${BOR}`}}>
                    <td style={{padding:"9px 16px 9px 0",color:MUT}}>{t.date}</td>
                    <td style={{padding:"9px 16px 9px 0",color:WHT,fontWeight:"400"}}>{t.instrument}</td>
                    <td style={{padding:"9px 16px 9px 0",color:t.direction==="Long"?GR:RD}}>{t.direction?.toLowerCase()}</td>
                    <td style={{padding:"9px 16px 9px 0",color:MUT,maxWidth:"120px",overflow:"hidden"}}>{t.setup}</td>
                    <td style={{padding:"9px 16px 9px 0",color:MUT}}>{t.entry||"—"}</td>
                    <td style={{padding:"9px 16px 9px 0",color:MUT}}>{t.exitPrice||"—"}</td>
                    <td style={{padding:"9px 16px 9px 0",color:parseFloat(t.pnl||0)>=0?GR:RD,fontWeight:"400"}}>{t.pnl?fmt(parseFloat(t.pnl)):"—"}</td>
                    <td style={{padding:"9px 16px 9px 0",color:parseFloat(t.rrAchieved||0)>0?AMB:MUT}}>{t.rrAchieved||"—"}</td>
                    <td style={{padding:"9px 0",color:t.grade==="A+"?AMB:MUT}}>{t.grade||"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>}
        <div style={{marginTop:"14px",textAlign:"right"}}>
          <span onClick={()=>setTab("trades")} style={{color:MUT,fontSize:"12px",cursor:"pointer",borderBottom:`1px solid transparent`}}
            onMouseOver={e=>e.target.style.color=AMB} onMouseOut={e=>e.target.style.color=MUT}>
            view full journal →
          </span>
        </div>

        {/* Quick stats */}
        <Sec n="04">session breakdown</Sec>
        <div style={{display:"grid",gridTemplateColumns:M?"1fr 1fr":"1fr 1fr 1fr 1fr",gap:"0",borderTop:`1px solid ${BOR}`,borderBottom:`1px solid ${BOR}`}}>
          {[
            {l:"Intraday Win %", v:idSt.winRate+"%"},
            {l:"Swing Win %",    v:swSt.winRate+"%"},
            {l:"Intraday Trades",v:idSt.total},
            {l:"Swing Trades",   v:swSt.total},
          ].map(({l,v},i)=>(
            <div key={l} style={{padding:"16px 20px",borderLeft:i>0?`1px solid ${BOR}`:"none"}}>
              <div style={{fontSize:"9px",textTransform:"uppercase",letterSpacing:".14em",color:MUT,marginBottom:"8px"}}>{l}</div>
              <div style={{fontSize:"20px",fontWeight:"300",color:WHT,fontFamily:"'JetBrains Mono',monospace"}}>{v}</div>
            </div>
          ))}
        </div>

      </div>
    );
  };


  // ── JOURNAL ───────────────────────────────────────────────
  const renderJournal = () => (
    <div>
      <div style={card()}>
        <div style={{fontSize:"11px",textTransform:"uppercase",letterSpacing:".14em",color:AMB,marginBottom:"14px"}}>log new trade</div>
        {/* Instrument picker — pill buttons on mobile */}
        <div style={{marginBottom:"14px"}}>
          <div style={lbl}>Instrument</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
            {instruments.map(i=>(
              <button key={i} onClick={()=>setTf(f=>({...f,instrument:i}))}
                style={{background:tf.instrument===i?WHT:CARD,color:tf.instrument===i?BG:MUT,border:`1px solid ${tf.instrument===i?WHT:BOR}`,padding:"10px 14px",borderRadius:"0",cursor:"pointer",fontSize:"13px",fontWeight:tf.instrument===i?"700":"400",minHeight:"44px"}}>
                {i}
              </button>
            ))}
          </div>
        </div>
        {/* Segment selector */}
        <div style={{marginBottom:"14px"}}>
          <div style={lbl}>Segment / Product Type</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
            {SEGMENTS.map(s=>(
              <button key={s} onClick={()=>setTf(f=>({...f,segment:s}))}
                style={{background:tf.segment===s?AMB:CARD,color:tf.segment===s?BG:MUT,
                        border:`1px solid ${tf.segment===s?AMB:BOR}`,padding:"8px 14px",
                        borderRadius:"0",cursor:"pointer",fontSize:"11px",
                        textTransform:"uppercase",letterSpacing:".1em",minHeight:"40px",
                        fontWeight:tf.segment===s?"700":"400"}}>
                {s}
              </button>
            ))}
          </div>
        </div>
        {/* Direction — big tap cards */}
        <div style={{marginBottom:"14px"}}>
          <div style={lbl}>Direction</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
            <button onClick={()=>setTf(f=>({...f,direction:"Long"}))}
              style={{background:tf.direction==="Long"?GR+"22":CARD,color:tf.direction==="Long"?GR:MUT,border:`2px solid ${tf.direction==="Long"?GR:BOR}`,padding:"14px",borderRadius:"0",cursor:"pointer",fontSize:"15px",fontWeight:"700",minHeight:"52px"}}>
              ▲ Long
            </button>
            <button onClick={()=>setTf(f=>({...f,direction:"Short"}))}
              style={{background:tf.direction==="Short"?RD+"22":CARD,color:tf.direction==="Short"?RD:MUT,border:`2px solid ${tf.direction==="Short"?RD:BOR}`,padding:"14px",borderRadius:"0",cursor:"pointer",fontSize:"15px",fontWeight:"700",minHeight:"52px"}}>
              ▼ Short
            </button>
          </div>
        </div>
        <div style={g2}>
          <div><label style={lbl}>Date</label><input type="date" style={inp()} value={tf.date} onChange={e=>setTf(f=>({...f,date:e.target.value}))}/></div>
          <div><label style={lbl}>Time</label><input type="time" style={inp()} value={tf.time} onChange={e=>setTf(f=>({...f,time:e.target.value}))}/></div>
        </div>
        <div style={{...g2,marginTop:"10px"}}>
          <div><label style={lbl}>Trade Type</label><select style={sel()} value={tf.tradeType} onChange={e=>setTf(f=>({...f,tradeType:e.target.value}))}>{tradeTypes.map(i=><option key={i}>{i}</option>)}</select></div>
          <div><label style={lbl}>Setup</label><select style={sel()} value={tf.setup} onChange={e=>setTf(f=>({...f,setup:e.target.value}))}>{[...new Set([...setups,...(tf.setup&&!setups.includes(tf.setup)?[tf.setup]:[])])].map(i=><option key={i}>{i}</option>)}</select></div>
        </div>
        <div style={{...g3,marginTop:"10px"}}>
          <div><label style={lbl}>Entry Price</label><input type="number" style={inp()} value={tf.entry} onChange={e=>{const u={...tf,entry:e.target.value};setTf(applyChargesToTrade(u));}}/></div>
          <div><label style={lbl}>Stop Loss</label><input type="number" style={inp()} value={tf.sl} onChange={e=>setTf(f=>({...f,sl:e.target.value}))}/></div>
          <div><label style={lbl}>Exit Price</label><input type="number" style={inp()} value={tf.exitPrice} onChange={e=>{const u={...tf,exitPrice:e.target.value};setTf(applyChargesToTrade(u));}}/></div>
        </div>
        <div style={{...g3,marginTop:"10px"}}>
          <div><label style={lbl}>Position Size</label><input type="number" style={inp()} value={tf.size} onChange={e=>{const u={...tf,size:e.target.value};setTf(applyChargesToTrade(u));}}/></div>
          <div><label style={lbl}>Risk (₹)</label><input type="number" style={inp()} value={tf.riskAmount} onChange={e=>setTf(f=>({...f,riskAmount:e.target.value}))}/></div>
          <div><label style={lbl}>Gross P&L (₹)</label><input type="number" style={inp({color:AMB})} value={tf.grossPnl} readOnly placeholder="auto-calculated"/></div>
        </div>

        {/* Auto-calculated charges panel */}
        {tf.entry&&tf.exitPrice&&tf.size&&parseFloat(tf.totalCharges||0)>0&&(
          <div style={{marginTop:"14px",border:`1px solid ${BOR}`,background:CARD}}>
            <div style={{padding:"10px 14px",borderBottom:`1px solid ${BOR}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:AMB,fontSize:"10px",textTransform:"uppercase",letterSpacing:".16em"}}>charge breakdown · {tf.segment}</span>
              <span style={{color:MUT,fontSize:"10px"}}>Zerodha exact rates</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:M?"1fr 1fr":"repeat(6,1fr)"}}>
              {[
                {l:"Brokerage", v:tf.brokerage},
                {l:"STT/CTT",   v:tf.stt},
                {l:"Txn",       v:tf.txnCharges},
                {l:"GST",       v:tf.gst},
                {l:"Stamp",     v:tf.stamp},
                {l:"SEBI",      v:tf.sebi},
              ].map(({l,v},i)=>(
                <div key={l} style={{padding:"10px 14px",borderLeft:i>0&&!M?`1px solid ${BOR}`:"none",borderTop:M&&i>=2?`1px solid ${BOR}`:"none"}}>
                  <div style={{color:MUT,fontSize:"9px",textTransform:"uppercase",letterSpacing:".14em",marginBottom:"4px"}}>{l}</div>
                  <div style={{color:WHT,fontSize:"13px",fontFamily:"'JetBrains Mono',monospace"}}>₹{parseFloat(v||0).toFixed(2)}</div>
                </div>
              ))}
            </div>
            <div style={{padding:"12px 14px",borderTop:`1px solid ${BOR}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <span style={{color:MUT,fontSize:"10px",textTransform:"uppercase",letterSpacing:".14em"}}>Total Charges &nbsp;</span>
                <span style={{color:RD,fontSize:"16px",fontFamily:"'JetBrains Mono',monospace"}}>₹{parseFloat(tf.totalCharges||0).toFixed(2)}</span>
              </div>
              <div>
                <span style={{color:MUT,fontSize:"10px",textTransform:"uppercase",letterSpacing:".14em"}}>Net P&L &nbsp;</span>
                <span style={{color:parseFloat(tf.pnl||0)>=0?GR:RD,fontSize:"20px",fontWeight:"400",fontFamily:"'JetBrains Mono',monospace"}}>
                  ₹{parseFloat(tf.pnl||0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
        <div style={{...g2,marginTop:"10px"}}>
          <div><label style={lbl}>R:R Achieved</label><input type="number" step="0.1" style={inp()} value={tf.rrAchieved} onChange={e=>setTf(f=>({...f,rrAchieved:e.target.value}))}/></div>
          <div><label style={lbl}>Emotional State</label><select style={sel()} value={tf.emotion} onChange={e=>setTf(f=>({...f,emotion:e.target.value}))}>{emotions.map(e=><option key={e}>{e}</option>)}</select></div>
        </div>
        {/* Grade — big tap buttons */}
        <div style={{marginTop:"12px"}}>
          <div style={lbl}>Grade</div>
          <div style={{display:"flex",gap:"8px"}}>
            {GRADES.map(g=>(
              <button key={g} onClick={()=>setTf(f=>({...f,grade:g}))}
                style={{flex:1,background:tf.grade===g?WHT:CARD,color:tf.grade===g?BG:MUT,border:`1px solid ${tf.grade===g?WHT:BOR}`,padding:"12px 0",borderRadius:"0",cursor:"pointer",fontSize:"15px",fontWeight:"700",minHeight:"48px"}}>
                {g}
              </button>
            ))}
          </div>
        </div>
        <div style={{marginTop:"10px"}}>
          <div style={lbl}>Followed Rules?</div>
          <div style={{display:"flex",gap:"8px"}}>
            {["Yes","No","Partially"].map(v=>(
              <button key={v} onClick={()=>setTf(f=>({...f,followedRules:v}))}
                style={{flex:1,background:tf.followedRules===v?(v==="Yes"?GR+"22":v==="No"?RD+"22":WHT+"11"):CARD,color:tf.followedRules===v?(v==="Yes"?GR:v==="No"?RD:WHT):MUT,border:`1px solid ${tf.followedRules===v?(v==="Yes"?GR:v==="No"?RD:WHT):BOR}`,padding:"12px 0",borderRadius:"0",cursor:"pointer",fontSize:"13px",fontWeight:tf.followedRules===v?"700":"400",minHeight:"44px"}}>
                {v}
              </button>
            ))}
          </div>
        </div>
        {[{key:"mistakes",label:"Mistakes Made",ph:"What mistakes did you make?"},{key:"improvements",label:"Improvements",ph:"What would you do better?"},{key:"notes",label:"Notes / Observations",ph:"Market context, observations..."}].map(x=>(
          <div key={x.key} style={{marginTop:"12px"}}><label style={lbl}>{x.label}</label><textarea style={ta()} value={tf[x.key]} onChange={e=>setTf(f=>({...f,[x.key]:e.target.value}))} placeholder={x.ph}/></div>
        ))}
        <button style={{...btn(),marginTop:"16px",width:"100%",fontSize:"16px",padding:"16px"}} onClick={logTrade}>LOG TRADE</button>
      </div>
      <div style={card()}>
        <div style={{display:"flex",alignItems:"baseline",gap:"14px",marginBottom:"20px",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"baseline",gap:"14px"}}>
            <span style={{color:AMB,fontSize:"11px",letterSpacing:".18em"}}>§02</span>
            <span style={{fontSize:"18px",fontWeight:"300",color:WHT,letterSpacing:"-.01em"}}>history · {trades.length}</span>
          </div>
          <button onClick={()=>exportCSV(trades)} style={{background:"transparent",color:MUT,border:`1px solid ${BOR}`,padding:"6px 14px",fontSize:"10px",textTransform:"uppercase",letterSpacing:".14em",cursor:"pointer"}}>export.csv</button>
        </div>
        {!trades.length?<div style={{color:MUT2,textAlign:"center",padding:"28px",fontSize:"13px"}}>No trades logged yet.</div>:
          <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
            <thead><tr style={{color:MUT,borderBottom:`1px solid ${BOR}`}}>{["Date","Instr","Dir","Setup","Entry","Exit","P&L","RR","Grade",""].map(h=><th key={h} style={{padding:"8px 6px",textAlign:"left",fontWeight:"400",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
            <tbody>{trades.map(t=>(
              <tr key={t.id} style={{borderBottom:`1px solid ${CARD}`}}>
                <td style={{padding:"8px 6px",color:MUT,whiteSpace:"nowrap"}}>{t.date}</td>
                <td style={{padding:"8px 6px",color:WHT}}>{t.instrument}</td>
                <td style={{padding:"8px 6px",color:t.direction==="Long"?GR:RD}}>{t.direction}</td>
                <td style={{padding:"8px 6px",color:MUT,fontSize:"11px",maxWidth:"100px",overflow:"hidden"}}>{t.setup}</td>
                <td style={{padding:"8px 6px",fontFamily:"monospace"}}>{t.entry}</td>
                <td style={{padding:"8px 6px",fontFamily:"monospace"}}>{t.exitPrice||"—"}</td>
                <td style={{padding:"8px 6px",fontFamily:"monospace",color:MUT,fontSize:"11px"}}>{t.grossPnl?fmt(parseFloat(t.grossPnl)):"—"}</td>
                <td style={{padding:"8px 6px",color:RD,fontSize:"11px"}}>{t.totalCharges?`-₹${parseFloat(t.totalCharges||0).toFixed(0)}`:"—"}</td>
                <td style={{padding:"8px 6px",fontFamily:"monospace",fontWeight:"700",color:parseFloat(t.pnl||0)>=0?GR:RD}}>{t.pnl?fmt(parseFloat(t.pnl)):"—"}</td>
                <td style={{padding:"8px 6px",fontFamily:"monospace"}}>{t.rrAchieved||"—"}</td>
                <td style={{padding:"8px 6px"}}><span style={{background:t.grade==="A+"?WHT+"22":CARD,color:t.grade==="A+"?WHT:MUT,padding:"2px 7px",borderRadius:"0",fontSize:"11px"}}>{t.grade||"—"}</span></td>
                <td style={{padding:"8px 6px"}}><button onClick={()=>deleteTrade(t.id)} style={{background:RD,color:WHT,border:"none",padding:"4px 10px",borderRadius:"0",cursor:"pointer",fontSize:"11px",minHeight:"32px"}}>Del</button></td>
              </tr>
            ))}</tbody>
          </table></div>}
      </div>
    </div>
  );

  // ── CHECKLIST ─────────────────────────────────────────────
  const renderChecklist = () => {
    let idx=0;
    const totalItems    = ALL_CHECKS.length;
    const totalYes      = ALL_CHECKS.filter((_,i)=>ck[i]==="yes").length;
    const totalNo       = ALL_CHECKS.filter((_,i)=>ck[i]==="no").length;
    const totalRequired = Object.entries(checks).reduce((s,[sec])=>s+getMin(sec),0);
    const totalChecked  = Object.entries(checks).reduce((s,[sec],si)=>s+getSectionChecked(sec,si),0);
    const overallPct    = totalRequired > 0 ? Math.round((totalChecked/totalRequired)*100) : 0;

    return(<div>
      {/* Overall banner */}
      <div style={{...card(),borderColor:allGreen?GR:BOR,padding:"24px",textAlign:"center"}}>
        {/* Big percentage */}
        <div style={{color:allGreen?GR:WHT,fontSize:"72px",fontWeight:"700",fontFamily:"monospace",lineHeight:1}}>{overallPct}%</div>
        <div style={{color:MUT,fontSize:"13px",marginTop:"6px",marginBottom:"16px"}}>of required checks completed</div>

        {/* Progress bar */}
        <div style={{background:MUT2,borderRadius:"0",height:"10px",overflow:"hidden",marginBottom:"12px"}}>
          <div style={{display:"flex",height:"10px"}}>
            <div style={{background:allGreen?GR:WHT,width:`${Math.min(100,overallPct)}%`,transition:"width 0.4s",borderRadius:"0"}}/>
          </div>
        </div>

        {/* Stats row */}
        <div style={{display:"flex",justifyContent:"center",gap:"24px",marginBottom:"12px"}}>
          <div style={{textAlign:"center"}}>
            <div style={{color:GR,fontSize:"22px",fontWeight:"700",fontFamily:"monospace"}}>{totalYes}</div>
            <div style={{color:MUT,fontSize:"11px"}}>YES</div>
          </div>
          <div style={{width:"1px",background:BOR}}/>
          <div style={{textAlign:"center"}}>
            <div style={{color:RD,fontSize:"22px",fontWeight:"700",fontFamily:"monospace"}}>{totalNo}</div>
            <div style={{color:MUT,fontSize:"11px"}}>NO</div>
          </div>
          <div style={{width:"1px",background:BOR}}/>
          <div style={{textAlign:"center"}}>
            <div style={{color:MUT,fontSize:"22px",fontWeight:"700",fontFamily:"monospace"}}>{totalItems-totalYes-totalNo}</div>
            <div style={{color:MUT,fontSize:"11px"}}>Pending</div>
          </div>
          <div style={{width:"1px",background:BOR}}/>
          <div style={{textAlign:"center"}}>
            <div style={{color:WHT,fontSize:"22px",fontWeight:"700",fontFamily:"monospace"}}>{totalChecked}/{totalRequired}</div>
            <div style={{color:MUT,fontSize:"11px"}}>Required</div>
          </div>
        </div>

        {allGreen
          ? <div style={{color:GR,fontWeight:"700",fontSize:"15px",padding:"10px",background:"rgba(107,158,107,0.08)",borderRadius:"0"}}>✓ ALL CLEAR — READY TO TRADE</div>
          : <div style={{color:MUT,fontSize:"13px"}}>{totalRequired - totalChecked} more required check{totalRequired-totalChecked!==1?"s":""} needed</div>}
      </div>

      {/* Sections */}
      {Object.entries(checks).map(([section,items],si)=>{
        const start      = idx; idx += items.length;
        const secYes     = getSectionChecked(section,si);
        const secNo      = items.filter((_,i)=>ck[start+i]==="no").length;
        const secPct     = getSectionPct(section,si);
        const minReq     = getMin(section);
        const secDone    = secYes >= minReq;
        return(
          <div key={section} style={{...card(),borderLeft:`3px solid ${secDone?GR:BOR}`}}>
            {/* Section header */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"10px",gap:"10px",flexWrap:"wrap"}}>
              <div>
                <div style={{fontSize:"11px",textTransform:"uppercase",letterSpacing:".14em",color:AMB,marginBottom:"14px"}}>{section}</div>
                <div style={{color:MUT,fontSize:"11px",marginTop:"-8px"}}>Min required: {minReq} / {items.length}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{color:secDone?GR:WHT,fontSize:"24px",fontWeight:"700",fontFamily:"monospace"}}>{secPct}%</div>
                <div style={{color:MUT,fontSize:"11px"}}>{secYes} yes · {secNo} no</div>
              </div>
            </div>

            {/* Section progress bar */}
            <div style={{background:MUT2,borderRadius:"3px",height:"5px",marginBottom:"14px",overflow:"hidden"}}>
              <div style={{display:"flex",height:"5px"}}>
                <div style={{background:secDone?GR:WHT,width:`${(secYes/items.length)*100}%`,transition:"width 0.2s"}}/>
                <div style={{background:RD,width:`${(secNo/items.length)*100}%`,transition:"width 0.2s"}}/>
              </div>
            </div>

            {/* Items with YES / NO buttons */}
            {items.map((item,i)=>{
              const gi    = start+i;
              const state = ck[gi]; // "yes" | "no" | undefined
              return(
                <div key={item} style={{display:"flex",alignItems:"center",gap:"10px",padding:"12px",borderRadius:"0",marginBottom:"6px",background:state==="yes"?"#001a0d":state==="no"?"#1a0000":CARD,border:`1px solid ${state==="yes"?GR:state==="no"?RD:BOR}`,minHeight:"52px"}}>
                  <span style={{color:state==="yes"?WHT:state==="no"?MUT2:MUT,fontSize:"14px",lineHeight:"1.4",flex:1}}>{item}</span>
                  <div style={{display:"flex",gap:"6px",flexShrink:0}}>
                    <button onClick={()=>setCk(c=>({...c,[gi]:c[gi]==="yes"?undefined:"yes"}))}
                      style={{background:state==="yes"?GR:CARD,color:state==="yes"?BG:MUT,border:`1px solid ${state==="yes"?GR:BOR}`,padding:"7px 14px",borderRadius:"0",cursor:"pointer",fontSize:"12px",fontWeight:state==="yes"?"700":"400",minHeight:"36px",minWidth:"48px"}}>
                      YES
                    </button>
                    <button onClick={()=>setCk(c=>({...c,[gi]:c[gi]==="no"?undefined:"no"}))}
                      style={{background:state==="no"?RD:CARD,color:state==="no"?WHT:MUT,border:`1px solid ${state==="no"?RD:BOR}`,padding:"7px 14px",borderRadius:"0",cursor:"pointer",fontSize:"12px",fontWeight:state==="no"?"700":"400",minHeight:"36px",minWidth:"48px"}}>
                      NO
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      <div style={{display:"flex",gap:"10px",marginBottom:"20px"}}>
        <button style={btnGh({flex:1})} onClick={()=>setCk({})}>Reset All</button>
        <button style={{...btnGh({flex:1}),color:GR,borderColor:GR}} onClick={()=>{
          const all={};
          ALL_CHECKS.forEach((_,i)=>{all[i]="yes";});
          setCk(all);
        }}>Mark All YES</button>
      </div>
    </div>);
  };

  // ── RISK CALC ─────────────────────────────────────────────
  const renderRisk = () => (
    <div>
      <div style={card()}>
        <div style={{display:"flex",alignItems:"baseline",gap:"12px",marginBottom:"20px"}}><span style={{color:AMB,fontSize:"11px",letterSpacing:".18em"}}>§01</span><span style={{fontSize:"18px",fontWeight:"300",color:WHT}}>position size</span></div>
        <div style={g2}>
          <div><label style={lbl}>Capital (₹)</label><input type="number" style={inp()} value={rc.capital} onChange={e=>setRc(r=>({...r,capital:parseFloat(e.target.value)||0}))}/></div>
          <div><label style={lbl}>Target R:R</label><select style={sel()} value={rc.rr} onChange={e=>setRc(r=>({...r,rr:e.target.value}))}>{["1.5","2","2.5","3","4","5"].map(v=><option key={v} value={v}>1:{v}</option>)}</select></div>
        </div>
        <div style={{marginTop:"12px"}}>
          <div style={lbl}>Risk Type</div>
          <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
            {[["base",`Base Risk — ${settings.baseRisk}%`],["major",`Major Level — ${settings.majorRisk}%`],["drawdown",`In Drawdown — ${settings.drawdownRisk}%`]].map(([v,l])=>(
              <button key={v} onClick={()=>setRc(r=>({...r,riskType:v}))}
                style={{background:rc.riskType===v?WHT:CARD,color:rc.riskType===v?BG:MUT,border:`1px solid ${rc.riskType===v?WHT:BOR}`,padding:"12px 16px",borderRadius:"0",cursor:"pointer",fontSize:"13px",textAlign:"left",fontWeight:rc.riskType===v?"700":"400",minHeight:"44px"}}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div style={{...g2,marginTop:"12px"}}>
          <div><label style={lbl}>Entry Price</label><input type="number" style={inp()} value={rc.entry} onChange={e=>setRc(r=>({...r,entry:e.target.value}))}/></div>
          <div><label style={lbl}>Stop Loss</label><input type="number" style={inp()} value={rc.sl} onChange={e=>setRc(r=>({...r,sl:e.target.value}))}/></div>
        </div>
        <div style={{marginTop:"12px",padding:"14px",background:CARD,borderRadius:"0",display:"flex",alignItems:"center",gap:"12px"}}>
          <span style={{color:MUT,fontSize:"13px"}}>Risk amount:</span>
          <span style={{color:RD,fontSize:"20px",fontWeight:"700",fontFamily:"monospace"}}>{fmt(Math.round(rcRiskAmt))}</span>
        </div>
        {/* Instrument + Segment for charge estimate */}
        <div style={{...g2,marginTop:"12px"}}>
          <div>
            <label style={lbl}>Instrument (for charge estimate)</label>
            <select style={sel()} value={rc.instrument||""} onChange={e=>setRc(r=>({...r,instrument:e.target.value}))}>
              <option value="">Select...</option>
              {instruments.map(i=><option key={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Segment</label>
            <select style={sel()} value={rc.segment||"F&O — Futures"} onChange={e=>setRc(r=>({...r,segment:e.target.value}))}>
              {SEGMENTS.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {rcResult&&(
          <div style={{marginTop:"16px"}}>
            {/* Hero — Quantity */}
            <div style={{borderTop:`1px solid ${BOR}`,borderBottom:`1px solid ${BOR}`,padding:"20px 0",textAlign:"center",marginBottom:"14px"}}>
              <div style={{color:AMB,fontSize:"9px",textTransform:"uppercase",letterSpacing:".18em",marginBottom:"8px"}}>recommended quantity</div>
              <div style={{color:WHT,fontSize:"64px",fontWeight:"200",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"-.03em",lineHeight:1}}>{rcResult.qty}</div>
              <div style={{color:MUT,fontSize:"12px",marginTop:"6px"}}>units · position value {fmt(rcResult.posValue)}</div>
            </div>
            {/* Detail grid */}
            <div style={{display:"grid",gridTemplateColumns:M?"1fr 1fr":"repeat(4,1fr)",borderTop:`1px solid ${BOR}`,borderBottom:`1px solid ${BOR}`}}>
              {[
                {l:"Max Risk",   v:fmt(rcResult.risk),         c:RD},
                {l:"SL Distance",v:rcResult.slDist+" pts",     c:MUT},
                {l:"Target",     v:rcResult.tp,                c:GR},
                {l:"Gross Reward",v:fmt(rcResult.reward),      c:GR},
                {l:"Est. Charges",v:"-"+fmt(rcResult.charges), c:RD},
                {l:"Net Reward",  v:fmt(rcResult.netReward),   c:rcResult.netReward>=0?GR:RD},
                {l:"Net R:R",     v:(rcResult.netReward/rcResult.risk).toFixed(2)+"x", c:AMB},
                {l:"Qty × SL",    v:rcResult.qty+" × "+rcResult.slDist, c:MUT},
              ].map(({l,v,c},i)=>(
                <div key={l} style={{padding:"14px 18px",borderLeft:i%4!==0?`1px solid ${BOR}`:"none",borderTop:i>=4?`1px solid ${BOR}`:"none"}}>
                  <div style={{color:MUT,fontSize:"9px",textTransform:"uppercase",letterSpacing:".14em",marginBottom:"6px"}}>{l}</div>
                  <div style={{color:c,fontSize:"15px",fontFamily:"'JetBrains Mono',monospace"}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div style={card()}>
        <div style={{display:"flex",alignItems:"baseline",gap:"12px",marginBottom:"16px"}}><span style={{color:AMB,fontSize:"11px",letterSpacing:".18em"}}>§02</span><span style={{fontSize:"16px",fontWeight:"300",color:WHT}}>sl management</span></div>
        <div style={g2}>
          {[{type:"Intraday",rules:["Enter on breakout or retest","Move SL to B/E at 1:1.5 R","Exit at 1:2 R:R",`Max ${settings.maxIntraday} trades/day`]},{type:"Swing / Positional",rules:["Move SL 50% closer at 1:1","Move SL to B/E at 1:2","Scale out at each S/R","Trail final position"]}].map(x=>(
            <div key={x.type} style={{background:CARD,borderRadius:"0",padding:"14px"}}>
              <div style={{color:WHT,fontSize:"11px",fontWeight:"700",marginBottom:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>{x.type}</div>
              {x.rules.map((r,i)=><div key={i} style={{display:"flex",gap:"8px",marginBottom:"8px"}}><span style={{color:WHT}}>→</span><span style={{color:MUT,fontSize:"13px"}}>{r}</span></div>)}
            </div>
          ))}
        </div>
      </div>
      <div style={card()}>
        <div style={{display:"flex",alignItems:"baseline",gap:"12px",marginBottom:"16px"}}><span style={{color:AMB,fontSize:"11px",letterSpacing:".18em"}}>§03</span><span style={{fontSize:"16px",fontWeight:"300",color:WHT}}>loss limits</span></div>
        <div style={g3}>
          {[{label:"Daily",val:fmt(settings.dailyLimit)},{label:"Weekly",val:fmt(settings.weeklyLimit)},{label:"Monthly",val:fmt(settings.monthlyLimit)}].map(x=>(
            <div key={x.label} style={{background:CARD,borderRadius:"0",padding:"14px",textAlign:"center"}}>
              <div style={{color:RD,fontSize:"18px",fontWeight:"700",fontFamily:"monospace"}}>{x.val}</div>
              <div style={{color:MUT,fontSize:"10px",marginTop:"4px"}}>{x.label} Limit</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── TRADE PLAN ────────────────────────────────────────────
  const renderPlan = () => (
    <div>
      <div style={card()}>
        <div style={{display:"flex",alignItems:"baseline",gap:"12px",marginBottom:"20px"}}><span style={{color:AMB,fontSize:"11px",letterSpacing:".18em"}}>§01</span><span style={{fontSize:"18px",fontWeight:"300",color:WHT}}>trade plan</span></div>
        <div style={g2}>
          <div><label style={lbl}>Date</label><input type="date" style={inp()} value={pf.date} onChange={e=>setPf(f=>({...f,date:e.target.value}))}/></div>
          <div><label style={lbl}>Grade</label><select style={sel()} value={pf.grade} onChange={e=>setPf(f=>({...f,grade:e.target.value}))}>{GRADES.map(g=><option key={g}>{g}</option>)}</select></div>
        </div>
        <div style={{marginTop:"12px"}}>
          <div style={lbl}>Instrument</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
            {instruments.map(i=>(
              <button key={i} onClick={()=>setPf(f=>({...f,instrument:i}))}
                style={{background:pf.instrument===i?WHT:CARD,color:pf.instrument===i?BG:MUT,border:`1px solid ${pf.instrument===i?WHT:BOR}`,padding:"10px 14px",borderRadius:"0",cursor:"pointer",fontSize:"13px",fontWeight:pf.instrument===i?"700":"400",minHeight:"44px"}}>
                {i}
              </button>
            ))}
          </div>
        </div>
        <div style={{marginTop:"12px"}}>
          <div style={lbl}>Market Bias</div>
          <div style={{display:"flex",gap:"8px"}}>
            {[["Bullish","▲",GR],["Bearish","▼",RD],["Neutral","—",MUT]].map(([b,icon,col])=>(
              <button key={b} onClick={()=>setPf(f=>({...f,bias:b}))}
                style={{flex:1,background:pf.bias===b?col+"22":CARD,color:pf.bias===b?col:MUT,border:`2px solid ${pf.bias===b?col:BOR}`,padding:"12px",borderRadius:"0",cursor:"pointer",fontSize:"14px",fontWeight:pf.bias===b?"700":"400",minHeight:"52px"}}>
                {icon} {b}
              </button>
            ))}
          </div>
        </div>
        {[{key:"keyLevels",label:"Key S/R Levels",ph:"List key levels..."},{key:"setup",label:"Setup Description",ph:"Describe the setup..."},{key:"entryZone",label:"Entry Zone",ph:"Where will you enter?"},{key:"invalidation",label:"Invalidation",ph:"What invalidates this?"},{key:"confluences",label:"Confluences",ph:"What confirms this?"},{key:"notes",label:"Notes",ph:"Anything else..."}].map(x=>(
          <div key={x.key} style={{marginTop:"12px"}}><label style={lbl}>{x.label}</label><textarea style={ta()} value={pf[x.key]} onChange={e=>setPf(f=>({...f,[x.key]:e.target.value}))} placeholder={x.ph}/></div>
        ))}
        <div style={{...g3,marginTop:"12px"}}>
          <div><label style={lbl}>Stop Loss</label><input type="number" style={inp()} value={pf.sl} onChange={e=>setPf(f=>({...f,sl:e.target.value}))}/></div>
          <div><label style={lbl}>Target 1 (1:{settings.minRR})</label><input type="number" style={inp()} value={pf.target1} onChange={e=>setPf(f=>({...f,target1:e.target.value}))}/></div>
          <div><label style={lbl}>Target 2 / Trail</label><input type="number" style={inp()} value={pf.target2} onChange={e=>setPf(f=>({...f,target2:e.target.value}))}/></div>
        </div>
        <div style={{display:"flex",gap:"10px",marginTop:"16px"}}>
          <button style={{...btn(),flex:1}}>SAVE PLAN</button>
          <button style={btnGh({flex:1})} onClick={()=>setPf(emptyPlan(instruments[0]))}>CLEAR</button>
        </div>
      </div>
      <div style={card()}>
        <div style={{display:"flex",alignItems:"baseline",gap:"12px",marginBottom:"16px"}}><span style={{color:AMB,fontSize:"11px",letterSpacing:".18em"}}>§02</span><span style={{fontSize:"16px",fontWeight:"300",color:WHT}}>rules reference</span></div>
        <div style={g2}>
          {[{title:"Green Light ✅",color:GR,items:["Daily + TF aligned","Pattern obvious",`Min 1:${settings.minRR} R:R`,"Clear S/R level","SL behind structure"]},{title:"Red Flags 🚫",color:RD,items:["No clear structure","FOMO trade","SL too wide","Loss limit hit","Emotionally off"]}].map(x=>(
            <div key={x.title} style={{background:CARD,borderRadius:"0",padding:"14px"}}>
              <div style={{color:x.color,fontSize:"11px",fontWeight:"700",marginBottom:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>{x.title}</div>
              {x.items.map((r,i)=><div key={i} style={{display:"flex",gap:"8px",marginBottom:"6px"}}><span style={{color:x.color}}>{x.color===GR?"✓":"✗"}</span><span style={{color:MUT,fontSize:"13px"}}>{r}</span></div>)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── ANALYTICS ─────────────────────────────────────────────
  // ── TRADES TAB ────────────────────────────────────────────
  const renderTrades = () => {
    const filtered = trades.filter(t => {
      if (tFInstr !== "All" && t.instrument !== tFInstr) return false;
      if (tFType  !== "All" && t.tradeType  !== tFType)  return false;
      if (tFDir   !== "All" && t.direction  !== tFDir)   return false;
      if (tFGrade !== "All" && t.grade      !== tFGrade) return false;
      if (tFFrom  && t.date < tFFrom) return false;
      if (tFTo    && t.date > tFTo)   return false;
      if (tSearch) {
        const q = tSearch.toLowerCase();
        if (!t.instrument.toLowerCase().includes(q) &&
            !t.setup.toLowerCase().includes(q) &&
            !(t.notes||"").toLowerCase().includes(q) &&
            !(t.mistakes||"").toLowerCase().includes(q)) return false;
      }
      return true;
    });

    const filtPnl  = filtered.filter(t=>t.pnl!=="").reduce((s,t)=>s+parseFloat(t.pnl),0);
    const filtWins = filtered.filter(t=>t.pnl!==""&&parseFloat(t.pnl)>0).length;
    const filtCl   = filtered.filter(t=>t.pnl!=="").length;

    return (
      <div>
        <div style={card()}>
          <div style={{display:"flex",alignItems:"baseline",gap:"12px",marginBottom:"20px"}}><span style={{color:AMB,fontSize:"11px",letterSpacing:".18em"}}>§01</span><span style={{fontSize:"18px",fontWeight:"300",color:WHT}}>all trades</span></div>
          <input type="text" style={{...inp(),marginBottom:"10px"}} placeholder="Search instrument, setup, notes..." value={tSearch} onChange={e=>setTSearch(e.target.value)}/>
          <div style={g2}>
            <div>
              <label style={lbl}>Instrument</label>
              <select style={sel()} value={tFInstr} onChange={e=>setTFInstr(e.target.value)}>
                <option>All</option>
                {[...new Set(trades.map(t=>t.instrument))].filter(Boolean).map(i=><option key={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Trade Type</label>
              <select style={sel()} value={tFType} onChange={e=>setTFType(e.target.value)}>
                <option>All</option>
                {tradeTypes.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Direction</label>
              <select style={sel()} value={tFDir} onChange={e=>setTFDir(e.target.value)}>
                <option>All</option>
                <option>Long</option>
                <option>Short</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Grade</label>
              <select style={sel()} value={tFGrade} onChange={e=>setTFGrade(e.target.value)}>
                <option>All</option>
                {GRADES.map(g=><option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>From Date</label>
              <input type="date" style={inp()} value={tFFrom} onChange={e=>setTFFrom(e.target.value)}/>
            </div>
            <div>
              <label style={lbl}>To Date</label>
              <input type="date" style={inp()} value={tFTo} onChange={e=>setTFTo(e.target.value)}/>
            </div>
          </div>
          <button style={{...btnGh({marginTop:"10px"}),fontSize:"12px",padding:"8px 14px"}}
            onClick={()=>{setTSearch("");setTFInstr("All");setTFType("All");setTFDir("All");setTFGrade("All");setTFFrom("");setTFTo("");}}>
            Clear Filters
          </button>
        </div>

        <div style={{...g4,marginBottom:"14px"}}>
          {[
            {label:"Showing",    val:filtered.length+" trades",                                          color:WHT},
            {label:"Closed P&L", val:fmt(filtPnl),                                                      color:filtPnl>=0?GR:RD},
            {label:"Win Rate",   val:filtCl?((filtWins/filtCl)*100).toFixed(1)+"%":"—",                  color:WHT},
            {label:"Closed",     val:filtCl+" trades",                                                   color:MUT},
          ].map(x=>(
            <div key={x.label} style={{background:SURF,border:`1px solid ${BOR}`,borderRadius:"0",padding:"12px",textAlign:"center"}}>
              <div style={{color:x.color,fontSize:"16px",fontWeight:"700",fontFamily:"monospace"}}>{x.val}</div>
              <div style={{color:MUT,fontSize:"10px",marginTop:"3px"}}>{x.label}</div>
            </div>
          ))}
        </div>

        <div style={card()}>
          {!filtered.length
            ? <div style={{color:MUT2,textAlign:"center",padding:"32px",fontSize:"13px"}}>No trades match your filters.</div>
            : <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
                  <thead>
                    <tr style={{color:MUT,borderBottom:`1px solid ${BOR}`}}>
                      {["Date","Instrument","Type","Direction","Setup","Entry","Exit","Gross","Charges","Net P&L","R:R","Grade","Rules","Emotion",""].map(h=>(
                        <th key={h} style={{padding:"8px 6px",textAlign:"left",fontWeight:"400",whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(t=>{
                      const isExp=expandedTradeId===t.id;
                      const net=parseFloat(t.pnl||0);
                      return(<>
                        <tr key={t.id} onClick={()=>setExpandedTradeId(isExp?null:t.id)}
                          style={{borderBottom:isExp?"none":`1px solid ${BOR}`,cursor:"pointer",background:isExp?SURF:"transparent"}}>
                          <td style={{padding:"10px 6px",color:MUT,whiteSpace:"nowrap",fontSize:"12px"}}>{t.date}</td>
                          <td style={{padding:"10px 6px",color:WHT,whiteSpace:"nowrap"}}>{t.instrument}</td>
                          <td style={{padding:"10px 6px",color:MUT,fontSize:"11px"}}>{t.tradeType}</td>
                          <td style={{padding:"10px 6px",color:t.direction==="Long"?GR:RD}}>{t.direction}</td>
                          <td style={{padding:"10px 6px",color:MUT,fontSize:"11px",maxWidth:"110px",overflow:"hidden"}}>{t.setup}</td>
                          <td style={{padding:"10px 6px",fontFamily:"monospace",fontSize:"12px"}}>{t.entry||"—"}</td>
                          <td style={{padding:"10px 6px",fontFamily:"monospace",fontSize:"12px"}}>{t.exitPrice||"—"}</td>
                          <td style={{padding:"10px 6px",color:MUT,fontSize:"11px"}}>{t.grossPnl?fmt(parseFloat(t.grossPnl)):"—"}</td>
                          <td style={{padding:"10px 6px",color:RD,fontSize:"11px"}}>{t.totalCharges?`-₹${parseFloat(t.totalCharges||0).toFixed(0)}`:"—"}</td>
                          <td style={{padding:"10px 6px",fontFamily:"monospace",fontWeight:"500",color:net>=0?GR:RD}}>{t.pnl?fmt(net):"—"}</td>
                          <td style={{padding:"10px 6px",color:AMB,fontSize:"12px"}}>{t.rrAchieved||"—"}</td>
                          <td style={{padding:"10px 6px",color:t.grade==="A+"?AMB:MUT,fontSize:"11px"}}>{t.grade||"—"}</td>
                          <td style={{padding:"10px 6px",color:t.followedRules==="Yes"?GR:t.followedRules==="No"?RD:MUT,fontSize:"11px"}}>{t.followedRules||"—"}</td>
                          <td style={{padding:"10px 6px",color:MUT,fontSize:"11px"}}>{t.emotion||"—"}</td>
                          <td style={{padding:"10px 6px"}} onClick={e=>e.stopPropagation()}>
                            <button onClick={()=>deleteTrade(t.id)} style={{background:"transparent",color:RD,border:`1px solid ${RD}`,padding:"3px 8px",cursor:"pointer",fontSize:"10px"}}>Del</button>
                          </td>
                        </tr>
                        {isExp&&(
                          <tr key={t.id+"-exp"}><td colSpan={15} style={{padding:0,background:SURF}}>
                            <div style={{padding:"20px 24px",borderBottom:`1px solid ${BOR}`}}>
                              <div style={{color:AMB,fontSize:"9px",textTransform:"uppercase",letterSpacing:".18em",marginBottom:"14px"}}>trade detail · {t.instrument} · {t.date}</div>
                              <div style={{display:"grid",gridTemplateColumns:M?"1fr 1fr":"repeat(5,1fr)",borderTop:`1px solid ${BOR}`,marginBottom:"16px"}}>
                                {[
                                  {l:"Date & Time",  v:`${t.date} ${t.time||""}`},
                                  {l:"Segment",      v:t.segment||"—"},
                                  {l:"Direction",    v:t.direction, c:t.direction==="Long"?GR:RD},
                                  {l:"Entry",        v:t.entry||"—"},
                                  {l:"Exit",         v:t.exitPrice||"—"},
                                  {l:"Size",         v:t.size||"—"},
                                  {l:"SL",           v:t.sl||"—"},
                                  {l:"R:R",          v:t.rrAchieved||"—"},
                                  {l:"Gross P&L",    v:t.grossPnl?fmt(parseFloat(t.grossPnl)):"—", c:parseFloat(t.grossPnl||0)>=0?GR:RD},
                                  {l:"Net P&L",      v:t.pnl?fmt(net):"—", c:net>=0?GR:RD},
                                  {l:"Brokerage",    v:t.brokerage?`₹${parseFloat(t.brokerage).toFixed(2)}`:"—", c:RD},
                                  {l:"STT/CTT",      v:t.stt?`₹${parseFloat(t.stt).toFixed(2)}`:"—", c:RD},
                                  {l:"GST",          v:t.gst?`₹${parseFloat(t.gst).toFixed(2)}`:"—", c:RD},
                                  {l:"Stamp",        v:t.stamp?`₹${parseFloat(t.stamp).toFixed(2)}`:"—", c:RD},
                                  {l:"Total Charges",v:t.totalCharges?`₹${parseFloat(t.totalCharges).toFixed(2)}`:"—", c:RD},
                                  {l:"Grade",        v:t.grade||"—", c:t.grade==="A+"?AMB:WHT},
                                  {l:"Rules",        v:t.followedRules||"—", c:t.followedRules==="Yes"?GR:t.followedRules==="No"?RD:MUT},
                                  {l:"Emotion",      v:t.emotion||"—"},
                                  {l:"Setup",        v:t.setup||"—"},
                                  {l:"Trade Type",   v:t.tradeType||"—"},
                                ].map(({l,v,c},i)=>(
                                  <div key={l} style={{padding:"12px 16px",borderLeft:i%5!==0?`1px solid ${BOR}`:"none",borderBottom:`1px solid ${BOR}`}}>
                                    <div style={{color:MUT,fontSize:"9px",textTransform:"uppercase",letterSpacing:".14em",marginBottom:"4px"}}>{l}</div>
                                    <div style={{color:c||WHT,fontSize:"12px",fontFamily:"'JetBrains Mono',monospace"}}>{v}</div>
                                  </div>
                                ))}
                              </div>
                              {(t.mistakes||t.improvements||t.notes)&&(
                                <div style={{display:"grid",gridTemplateColumns:M?"1fr":"1fr 1fr 1fr",gap:"20px"}}>
                                  {[{l:"Mistakes",v:t.mistakes},{l:"Improvements",v:t.improvements},{l:"Notes",v:t.notes}].filter(x=>x.v).map(x=>(
                                    <div key={x.l}>
                                      <div style={{color:AMB,fontSize:"9px",textTransform:"uppercase",letterSpacing:".14em",marginBottom:"6px"}}>{x.l}</div>
                                      <div style={{color:MUT,fontSize:"12px",lineHeight:1.7}}>{x.v}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td></tr>
                        )}
                      </>);
                    })}
                  </tbody>
                </table>
              </div>}
        </div>
      </div>
    );
  };


  const renderAnalytics = () => {
    const data = atab==="intraday" ? intraday : atab==="swing" ? swing : trades;
    const st   = atab==="intraday" ? idSt     : atab==="swing" ? swSt  : allSt;
    const curve=pnlCurve(data),iData=byInstr(data),gData=byGrade(data),eData=byEmotion(data),sData=bySetup(data);
    const noData=<div style={{color:MUT2,textAlign:"center",padding:"32px",fontSize:"13px"}}>No closed trades yet</div>;
    const TT = <Tooltip contentStyle={ttSty} labelStyle={ttLabel} itemStyle={ttItem} formatter={v=>[fmt(v),"P&L"]}/>;
    return(<div>
      <div style={{display:"flex",gap:"8px",marginBottom:"14px"}}>
        {[["intraday","Intraday"],["swing","Swing / Positional"],["combined","Combined"]].map(([k,l])=>(
          <button key={k} onClick={()=>setAtab(k)} style={{flex:1,background:atab===k?WHT:CARD,color:atab===k?BG:MUT,border:`1px solid ${atab===k?WHT:BOR}`,padding:"12px",borderRadius:"0",cursor:"pointer",fontSize:"13px",fontWeight:atab===k?"700":"400",minHeight:"44px"}}>{l}</button>
        ))}
      </div>
      <div style={g4}>
        {[{label:"Win Rate",val:st.winRate+"%",color:WHT},{label:"Total P&L",val:fmt(st.pnl),color:st.pnl>=0?GR:RD},{label:"Avg R:R",val:st.avgRR,color:WHT},{label:"Profit Factor",val:st.pf,color:WHT}].map(x=>(
          <div key={x.label} style={{background:SURF,border:`1px solid ${BOR}`,borderRadius:"0",padding:"14px",textAlign:"center"}}>
            <div style={{color:x.color,fontSize:M?"18px":"22px",fontWeight:"700",fontFamily:"monospace"}}>{x.val}</div>
            <div style={{color:MUT,fontSize:"10px",marginTop:"3px"}}>{x.label}</div>
          </div>
        ))}
      </div>
      <div style={{...card(),marginTop:"14px"}}>
        <div style={{fontSize:"11px",textTransform:"uppercase",letterSpacing:".14em",color:AMB,marginBottom:"14px"}}>p&l curve</div>
        {curve.length>0?<ResponsiveContainer width="100%" height={200}><LineChart data={curve}><XAxis dataKey="date" stroke={MUT2} tick={{fill:MUT,fontSize:9}} interval="preserveStartEnd"/><YAxis stroke={MUT2} tick={{fill:MUT,fontSize:10}} tickFormatter={v=>fmt(v)}/><Tooltip contentStyle={ttSty} labelStyle={ttLabel} itemStyle={ttItem} formatter={v=>[fmt(v),"Cumulative P&L"]}/><Line type="monotone" dataKey="v" stroke={WHT} strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer>:noData}
      </div>
      <div style={g2}>
        <div style={card()}>
          <div style={{fontSize:"11px",textTransform:"uppercase",letterSpacing:".14em",color:AMB,marginBottom:"14px"}}>by instrument</div>
          {iData.length>0?<ResponsiveContainer width="100%" height={190}><BarChart data={iData} margin={{left:10}}><XAxis dataKey="name" stroke={MUT2} tick={{fill:MUT,fontSize:9}}/><YAxis stroke={MUT2} tick={{fill:MUT,fontSize:9}}/><Tooltip contentStyle={ttSty} labelStyle={ttLabel} itemStyle={ttItem} formatter={v=>[fmt(v),"P&L"]}/><Bar dataKey="v" radius={[3,3,0,0]}>{iData.map((d,i)=><Cell key={i} fill={d.v>=0?GR:RD}/>)}</Bar></BarChart></ResponsiveContainer>:noData}
        </div>
        <div style={card()}>
          <div style={{fontSize:"11px",textTransform:"uppercase",letterSpacing:".14em",color:AMB,marginBottom:"14px"}}>by grade</div>
          {gData.some(d=>d.n>0)?<ResponsiveContainer width="100%" height={190}><BarChart data={gData} margin={{left:10}}><XAxis dataKey="g" stroke={MUT2} tick={{fill:MUT,fontSize:12}}/><YAxis stroke={MUT2} tick={{fill:MUT,fontSize:9}}/><Tooltip contentStyle={ttSty} labelStyle={ttLabel} itemStyle={ttItem} formatter={v=>[fmt(v),"P&L"]}/><Bar dataKey="v" radius={[3,3,0,0]}>{gData.map((d,i)=><Cell key={i} fill={d.v>=0?GR:RD}/>)}</Bar></BarChart></ResponsiveContainer>:noData}
        </div>
      </div>
      <div style={g2}>
        <div style={card()}>
          <div style={{fontSize:"11px",textTransform:"uppercase",letterSpacing:".14em",color:AMB,marginBottom:"14px"}}>emotion vs p&l</div>
          {eData.length>0?<ResponsiveContainer width="100%" height={190}><BarChart data={eData} margin={{left:10}}><XAxis dataKey="e" stroke={MUT2} tick={{fill:MUT,fontSize:10}}/><YAxis stroke={MUT2} tick={{fill:MUT,fontSize:9}}/><Tooltip contentStyle={ttSty} labelStyle={ttLabel} itemStyle={ttItem} formatter={v=>[fmt(v),"P&L"]}/><Bar dataKey="v" radius={[3,3,0,0]}>{eData.map((d,i)=><Cell key={i} fill={d.v>=0?GR:RD}/>)}</Bar></BarChart></ResponsiveContainer>:noData}
        </div>
        <div style={card()}>
          <div style={{fontSize:"11px",textTransform:"uppercase",letterSpacing:".14em",color:AMB,marginBottom:"14px"}}>setups</div>
          {sData.length>0?<div style={{overflowY:"auto",maxHeight:"210px"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}><thead><tr style={{color:MUT,borderBottom:`1px solid ${BOR}`}}>{["Setup","N","P&L"].map(h=><th key={h} style={{padding:"6px 8px",textAlign:"left",fontWeight:"400"}}>{h}</th>)}</tr></thead><tbody>{sData.map(d=><tr key={d.s} style={{borderBottom:`1px solid ${CARD}`}}><td style={{padding:"6px 8px",color:MUT,fontSize:"11px"}}>{d.s}</td><td style={{padding:"6px 8px",color:MUT}}>{d.n}</td><td style={{padding:"6px 8px",fontFamily:"monospace",fontWeight:"700",color:d.v>=0?GR:RD}}>{fmt(d.v)}</td></tr>)}</tbody></table></div>:noData}
        </div>
      </div>
    </div>);
  };

  // ── REVIEW ────────────────────────────────────────────────

  const renderReview = () => {
    const filtered=reviews.filter(r=>r.period===rtab);
    const RF=[{key:"whatWentWell",emoji:"✅",label:"What Went Well",ph:"What did you do right?"},{key:"mistakes",emoji:"❌",label:"Mistakes Made",ph:"Be specific."},{key:"missedSetups",emoji:"👀",label:"Missed Setups",ph:"What did you miss?"},{key:"rulesFollowed",emoji:"📋",label:"Rule Compliance",ph:"Which rules did you follow/break?"},{key:"emotionalTrading",emoji:"😤",label:"Emotional Trading",ph:"Any emotional decisions?"},{key:"regrets",emoji:"😔",label:"Regrets",ph:"What would you do differently?"},{key:"improvements",emoji:"🔧",label:"Improvements",ph:"What will you change?"},{key:"selfCoaching",emoji:"🧠",label:"Self-Coaching (Steenbarger)",ph:"Strengths? Patterns? Build on your best."}];
    return(<div>
      <div style={{display:"flex",gap:"6px",marginBottom:"14px"}}>
        {[["daily","Daily"],["weekly","Weekly"],["monthly","Monthly"]].map(([k,l])=>(
          <button key={k} onClick={()=>{setRtab(k);setRf(emptyReview(k));}} style={{flex:1,background:rtab===k?WHT:CARD,color:rtab===k?BG:MUT,border:`1px solid ${rtab===k?WHT:BOR}`,padding:"12px",borderRadius:"0",cursor:"pointer",fontSize:"13px",fontWeight:rtab===k?"700":"400",minHeight:"44px"}}>{l}</button>
        ))}
      </div>
      <div style={card()}>
        <div style={{fontSize:"16px",fontWeight:"300",color:WHT,marginBottom:"18px",letterSpacing:"-.01em"}}>write {rtab} review</div>
        <div style={g2}>
          <div><label style={lbl}>Date</label><input type="date" style={inp()} value={rf.date} onChange={e=>setRf(f=>({...f,date:e.target.value}))}/></div>
          <div>
            <div style={lbl}>Mental State</div>
            <div style={{display:"flex",gap:"5px",flexWrap:"wrap"}}>
              {MENTAL.map(m=>(
                <button key={m} onClick={()=>setRf(f=>({...f,mentalState:m}))}
                  style={{background:rf.mentalState===m?mentalColor(m):CARD,color:rf.mentalState===m?BG:MUT,border:`1px solid ${rf.mentalState===m?mentalColor(m):BOR}`,padding:"8px 10px",borderRadius:"0",cursor:"pointer",fontSize:"12px",fontWeight:rf.mentalState===m?"700":"400",minHeight:"44px"}}>
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
        {RF.map(x=><div key={x.key} style={{marginTop:"14px"}}><label style={{...lbl,color:MUT}}>{x.emoji} {x.label}</label><textarea style={ta()} value={rf[x.key]} onChange={e=>setRf(f=>({...f,[x.key]:e.target.value}))} placeholder={x.ph}/></div>)}
        <div style={{display:"flex",gap:"10px",marginTop:"16px"}}>
          <button style={{...btn(),flex:1}} onClick={logReview}>SAVE REVIEW</button>
          <button style={btnGh({flex:1})} onClick={()=>setRf(emptyReview(rtab))}>CLEAR</button>
        </div>
      </div>
      {filtered.length>0&&(
        <div style={card()}>
          <div style={{...h2sty,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span>Past Reviews ({filtered.length})</span><button onClick={()=>exportReviewsCSV(filtered)} style={btn({padding:"6px 14px",fontSize:"11px"})}>⬇ CSV</button></div>
          {filtered.map(r=>(
            <div key={r.id} style={{background:CARD,borderRadius:"0",padding:"14px",marginBottom:"10px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
                <span style={{color:WHT,fontSize:"13px",fontWeight:"700"}}>{r.date}</span>
                <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
                  <span style={{background:`${mentalColor(r.mentalState)}22`,color:mentalColor(r.mentalState),padding:"3px 10px",borderRadius:"20px",fontSize:"11px",fontWeight:"700"}}>{r.mentalState}</span>
                  <button onClick={()=>deleteReview(r.id)} style={{background:"transparent",color:MUT,border:`1px solid ${BOR}`,padding:"4px 8px",borderRadius:"0",cursor:"pointer",fontSize:"11px",minHeight:"32px"}}>Del</button>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:M?"1fr":"1fr 1fr",gap:"10px"}}>
                {RF.filter(f=>r[f.key]).map(f=>(
                  <div key={f.key} style={{borderLeft:`2px solid ${f.key==="selfCoaching"?WHT:BOR}`,paddingLeft:"10px"}}>
                    <div style={{color:MUT,fontSize:"10px",marginBottom:"3px"}}>{f.emoji} {f.label}</div>
                    <div style={{color:f.key==="selfCoaching"?WHT:MUT,fontSize:"12px",fontStyle:f.key==="selfCoaching"?"italic":"normal",lineHeight:"1.5"}}>{r[f.key].length>120?r[f.key].slice(0,120)+"...":r[f.key]}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {reviews.length>=3&&(
        <div style={card()}>
          <div style={{fontSize:"11px",textTransform:"uppercase",letterSpacing:".14em",color:AMB,marginBottom:"14px"}}>mental state trend</div>
          <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
            {reviews.slice(0,20).reverse().map(r=>(
              <div key={r.id} style={{textAlign:"center"}}>
                <div style={{width:"36px",height:"36px",borderRadius:"50%",background:`${mentalColor(r.mentalState)}22`,border:`2px solid ${mentalColor(r.mentalState)}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{color:mentalColor(r.mentalState),fontSize:"9px",fontWeight:"700"}}>{r.mentalState.slice(0,3).toUpperCase()}</span>
                </div>
                <div style={{color:MUT2,fontSize:"9px",marginTop:"3px"}}>{r.date.slice(5)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>);
  };

  // ── CUSTOMIZE ─────────────────────────────────────────────
  const renderCustomize = () => {
    const EditableList=({title,items,storeKey,setter,resetVal,placeholder,hint})=>{
      const [input,setInput]=useState("");
      const add=()=>{ const v=input.trim();if(!v||items.includes(v))return; pList(storeKey,[...items,v],setter); setInput(""); };
      return(
        <div style={{...card(),borderLeft:`2px solid ${BOR}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
            <div style={{fontSize:"11px",textTransform:"uppercase",letterSpacing:".14em",color:AMB,marginBottom:"14px"}}>{title}</div>
            <button onClick={()=>pList(storeKey,resetVal,setter)} style={btnGh({padding:"6px 12px",fontSize:"11px"})}>Reset</button>
          </div>
          {hint&&<div style={{color:MUT2,fontSize:"11px",marginBottom:"12px"}}>{hint}</div>}
          <div style={{display:"flex",gap:"8px",marginBottom:"12px"}}>
            <input type="text" style={inp({flex:1})} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder={placeholder||"Add new..."}/>
            <button style={btn({padding:"12px 18px"})} onClick={add}>+ Add</button>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"8px"}}>
            {items.map(item=>(
              <div key={item} style={{display:"flex",alignItems:"center",gap:"6px",background:CARD,border:`1px solid ${BOR}`,borderRadius:"20px",padding:"7px 14px"}}>
                <span style={{color:WHT,fontSize:"13px"}}>{item}</span>
                <button onClick={()=>pList(storeKey,items.filter(i=>i!==item),setter)} style={{background:"transparent",color:RD,border:"none",cursor:"pointer",fontSize:"16px",padding:"0 2px",lineHeight:1}}>×</button>
              </div>
            ))}
          </div>
        </div>
      );
    };
    const ChecklistEditor=()=>{
      const [newSection,setNewSection]=useState("");
      const [newItems,setNewItems]=useState({});
      const addSection=()=>{ const s=newSection.trim();if(!s||checks[s])return; const u={...checks,[s]:[]}; pList("checks",u,setChecks); setCk({}); setNewSection(""); };
      const delSection=(s)=>{ if(!window.confirm(`Delete "${s}"?`))return; const u={...checks};delete u[s]; pList("checks",u,setChecks); setCk({}); };
      const addItem=(sec,item)=>{ const v=item.trim();if(!v)return; const u={...checks,[sec]:[...checks[sec],v]}; pList("checks",u,setChecks); setCk({}); setNewItems(n=>({...n,[sec]:""})); };
      const delItem=(sec,item)=>{ const u={...checks,[sec]:checks[sec].filter(i=>i!==item)}; pList("checks",u,setChecks); setCk({}); };
      return(
        <div style={{...card(),borderLeft:`2px solid ${BOR}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
            <div style={{fontSize:"11px",textTransform:"uppercase",letterSpacing:".14em",color:AMB,marginBottom:"14px"}}>✅ pre-trade checklist</div>
            <button onClick={()=>{pList("checks",DEF_CHECKS,setChecks);setCk({});}} style={btnGh({padding:"6px 12px",fontSize:"11px"})}>Reset</button>
          </div>
          {Object.entries(checks).map(([section,items])=>(
            <div key={section} style={{background:CARD,borderRadius:"0",padding:"14px",marginBottom:"10px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
                <span style={{color:WHT,fontSize:"12px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"1px"}}>{section}</span>
                <button onClick={()=>delSection(section)} style={{background:"transparent",color:RD,border:`1px solid ${RD}`,padding:"4px 10px",borderRadius:"0",cursor:"pointer",fontSize:"11px",minHeight:"32px"}}>Delete</button>
              </div>
              {items.map(item=>(
                <div key={item} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",borderRadius:"0",background:SURF,marginBottom:"5px",gap:"10px",minHeight:"44px"}}>
                  <span style={{color:MUT,fontSize:"13px",flex:1}}>{item}</span>
                  <button onClick={()=>delItem(section,item)} style={{background:"transparent",color:RD,border:"none",cursor:"pointer",fontSize:"18px",padding:"0 4px",lineHeight:1}}>×</button>
                </div>
              ))}
              <div style={{display:"flex",gap:"8px",marginTop:"10px"}}>
                <input type="text" style={inp({flex:1,fontSize:"13px"})} value={newItems[section]||""} onChange={e=>setNewItems(n=>({...n,[section]:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&addItem(section,newItems[section]||"")} placeholder="Add item..."/>
                <button onClick={()=>addItem(section,newItems[section]||"")} style={btn({padding:"12px 16px"})}>+</button>
              </div>
            </div>
          ))}
          <div style={{marginTop:"12px",padding:"14px",background:CARD,borderRadius:"0"}}>
            <div style={{color:MUT,fontSize:"12px",marginBottom:"8px"}}>Add New Section</div>
            <div style={{display:"flex",gap:"8px"}}>
              <input type="text" style={inp({flex:1})} value={newSection} onChange={e=>setNewSection(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addSection()} placeholder="Section name..."/>
              <button onClick={addSection} style={btn({padding:"12px 16px"})}>+</button>
            </div>
          </div>
        </div>
      );
    };
    return(
      <div>
        <div style={{...card(),textAlign:"center",padding:"14px"}}>
          <div style={{fontSize:"18px",fontWeight:"300",color:WHT,letterSpacing:"-.01em"}}>customize system</div>
          <div style={{color:MUT,fontSize:"12px",marginTop:"4px"}}>Changes apply instantly across the entire app</div>
        </div>

        {/* Tab Order */}
        <div style={{...card(),borderLeft:`2px solid ${BOR}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
            <div style={{fontSize:"11px",textTransform:"uppercase",letterSpacing:".14em",color:AMB,marginBottom:"12px"}}>tab order</div>
            <button onClick={resetTabOrder} style={btnGh({padding:"6px 12px",fontSize:"11px"})}>Reset</button>
          </div>
          <div style={{color:MUT2,fontSize:"11px",marginBottom:"12px"}}>First 4 tabs appear in the bottom bar on mobile. Drag order determines what you see first.</div>
          {tabOrder.map((key, idx) => {
            const t = TAB_DEFS.find(x=>x.key===key);
            if (!t) return null;
            return (
              <div key={key} style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 12px",borderRadius:"0",background:CARD,border:`1px solid ${BOR}`,marginBottom:"6px"}}>
                <span style={{color:MUT,fontSize:"12px",fontFamily:"monospace",minWidth:"20px"}}>{idx+1}</span>
                <span style={{color:WHT,fontSize:"14px"}}>{t.icon}</span>
                <span style={{color:WHT,fontSize:"14px",flex:1}}>{t.label}</span>
                {idx < 4 && <span style={{background:WHT+"22",color:WHT,fontSize:"10px",padding:"2px 8px",borderRadius:"0"}}>Bottom nav</span>}
                <div style={{display:"flex",gap:"4px"}}>
                  <button onClick={()=>moveTab(key,-1)} disabled={idx===0}
                    style={{background:idx===0?MUT2:CARD,color:idx===0?BOR:WHT,border:`1px solid ${BOR}`,width:"32px",height:"32px",borderRadius:"0",cursor:idx===0?"default":"pointer",fontSize:"14px",display:"flex",alignItems:"center",justifyContent:"center"}}>↑</button>
                  <button onClick={()=>moveTab(key,1)} disabled={idx===tabOrder.length-1}
                    style={{background:idx===tabOrder.length-1?MUT2:CARD,color:idx===tabOrder.length-1?BOR:WHT,border:`1px solid ${BOR}`,width:"32px",height:"32px",borderRadius:"0",cursor:idx===tabOrder.length-1?"default":"pointer",fontSize:"14px",display:"flex",alignItems:"center",justifyContent:"center"}}>↓</button>
                </div>
              </div>
            );
          })}
        </div>

        <EditableList title="Trading Instruments" items={instruments} storeKey="instruments" setter={setInstruments} resetVal={DEF_INSTRUMENTS} placeholder="e.g. EUR/USD, BankNifty..." hint="Appears in Journal, Trade Plan and Analytics dropdowns"/>
        <EditableList title="Setups / Strategies" items={setups} storeKey="setups" setter={setSetups} resetVal={DEF_SETUPS} placeholder="e.g. 7 EMA Strategy, Opening Range..." hint="Appears in Journal setup dropdown and Analytics breakdown"/>
        <EditableList title="Emotional States" items={emotions} storeKey="emotions" setter={setEmotions} resetVal={DEF_EMOTIONS} placeholder="e.g. Overconfident, Sharp..."/>
        <EditableList title="Trade Types" items={tradeTypes} storeKey="tradeTypes" setter={setTradeTypes} resetVal={DEF_TYPES} placeholder="e.g. Scalp, Options Sell..."/>
        <ChecklistEditor/>
      </div>
    );
  };

  // ── SETTINGS ──────────────────────────────────────────────
  const renderSettings = () => {
    const nf=(label,key,step=1)=>(<div><label style={lbl}>{label}</label><input type="number" step={step} style={inp()} value={draft[key]} onChange={e=>setDraft(d=>({...d,[key]:parseFloat(e.target.value)||0}))}/></div>);
    const scales=[{label:"Small",val:0.85},{label:"Normal",val:1},{label:"Large",val:1.2},{label:"X-Large",val:1.4},{label:"XX-Large",val:1.6}];
    return(<div>
      {savedMsg&&<div style={{background:"#001a0d",border:`1px solid ${GR}`,borderRadius:"0",padding:"12px 16px",marginBottom:"14px",color:GR,fontSize:"13px",fontWeight:"700"}}>{savedMsg}</div>}

      {/* Text Size */}
      <div style={{...card(),borderLeft:`2px solid ${BOR}`}}>
        <div style={{fontSize:"11px",textTransform:"uppercase",letterSpacing:".14em",color:AMB,marginBottom:"14px"}}>text size</div>
        <div style={{color:MUT,fontSize:"12px",marginBottom:"14px"}}>Scales all text and UI elements across the entire app. Takes effect immediately — no need to save.</div>
        <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
          {scales.map(s=>(
            <button key={s.val} onClick={()=>{ const u={...settings,textScale:s.val}; setSettings(u); lsSet(uk("settings"),u); sbSaveSettings(u,activeUser); }}
              style={{flex:1,minWidth:"80px",background:settings.textScale===s.val?WHT:CARD,color:settings.textScale===s.val?BG:MUT,border:`1px solid ${settings.textScale===s.val?WHT:BOR}`,padding:"12px 8px",borderRadius:"0",cursor:"pointer",fontSize:"13px",fontWeight:settings.textScale===s.val?"700":"400",minHeight:"48px",textAlign:"center"}}>
              <div style={{fontFamily:"monospace",fontSize:"15px",marginBottom:"2px"}}>{s.label==="Small"?"Aa":s.label==="Normal"?"Aa":s.label==="Large"?"Aa":s.label==="X-Large"?"Aa":"Aa"}</div>
              {s.label}
            </button>
          ))}
        </div>
        <div style={{marginTop:"12px",padding:"12px",background:CARD,borderRadius:"0",color:MUT,fontSize:"12px"}}>
          Current scale: <span style={{color:WHT,fontWeight:"700"}}>{settings.textScale||1}x</span> — changes apply instantly without saving
        </div>
      </div>

      {/* Profile */}
      <div style={{...card(),borderLeft:`2px solid ${BOR}`}}>
        <div style={{fontSize:"11px",textTransform:"uppercase",letterSpacing:".14em",color:AMB,marginBottom:"14px"}}>profile</div>
        <div style={g2}>
          <div><label style={lbl}>Trader Name</label><input type="text" style={inp()} value={draft.traderName} onChange={e=>setDraft(d=>({...d,traderName:e.target.value}))}/></div>
          <div style={{display:"flex",alignItems:"center"}}>
            <div style={{background:CARD,borderRadius:"0",padding:"12px",display:"flex",alignItems:"center",gap:"12px",width:"100%"}}>
              <div style={{width:"40px",height:"40px",borderRadius:"50%",background:MUT2,border:`1px solid ${BOR}`,display:"flex",alignItems:"center",justifyContent:"center",color:WHT,fontWeight:"700",fontSize:"16px",flexShrink:0}}>{activeUser.charAt(0).toUpperCase()}</div>
              <div><div style={{color:WHT,fontSize:"14px",fontWeight:"700"}}>{activeUser}</div><div style={{color:MUT,fontSize:"11px"}}>Active profile</div></div>
            </div>
          </div>
        </div>
      </div>
      {/* Capital */}
      <div style={{...card(),borderLeft:`2px solid ${BOR}`}}>
        <div style={{fontSize:"11px",textTransform:"uppercase",letterSpacing:".14em",color:AMB,marginBottom:"14px"}}>capital & risk</div>
        <div style={g2}>{nf("Total Capital (₹)","capital",1000)}</div>
        <div style={{...g3,marginTop:"10px"}}>
          {nf("Base Risk %","baseRisk",0.01)}
          {nf("Major Level %","majorRisk",0.01)}
          {nf("Drawdown %","drawdownRisk",0.01)}
        </div>
        <div style={{marginTop:"12px",padding:"12px",background:CARD,borderRadius:"0"}}>
          <div style={{color:MUT,fontSize:"11px",marginBottom:"8px"}}>At {fmt(draft.capital)}:</div>
          <div style={{display:"flex",gap:"20px",flexWrap:"wrap"}}>
            {[{label:"Base",val:draft.capital*(draft.baseRisk/100)},{label:"Major",val:draft.capital*(draft.majorRisk/100)},{label:"Drawdown",val:draft.capital*(draft.drawdownRisk/100)}].map(x=>(
              <div key={x.label}><div style={{color:MUT,fontSize:"10px"}}>{x.label}</div><div style={{color:WHT,fontSize:"15px",fontWeight:"700",fontFamily:"monospace"}}>{fmt(Math.round(x.val))}</div></div>
            ))}
          </div>
        </div>
      </div>
      {/* Loss Limits */}
      <div style={{...card(),borderLeft:`2px solid ${BOR}`}}>
        <div style={{fontSize:"11px",textTransform:"uppercase",letterSpacing:".14em",color:AMB,marginBottom:"14px"}}>loss limits</div>
        <div style={g3}>{nf("Daily Max (₹)","dailyLimit",500)}{nf("Weekly Max (₹)","weeklyLimit",1000)}{nf("Monthly Max (₹)","monthlyLimit",5000)}</div>
      </div>
      {/* Trade Rules */}
      <div style={{...card(),borderLeft:`2px solid ${BOR}`}}>
        <div style={{fontSize:"11px",textTransform:"uppercase",letterSpacing:".14em",color:AMB,marginBottom:"14px"}}>trade rules</div>
        <div style={g2}>{nf("Max Intraday Trades/Day","maxIntraday",1)}{nf("Minimum R:R","minRR",0.5)}</div>
      </div>
      {/* Checklist Requirements */}
      <div style={{...card(),borderLeft:`2px solid ${BOR}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
          <div style={{fontSize:"11px",textTransform:"uppercase",letterSpacing:".14em",color:AMB,marginBottom:"14px"}}>checklist requirements</div>
          <button onClick={()=>{setSectionMins({});lsSet(uk("sectionMins"),{});}} style={btnGh({padding:"6px 12px",fontSize:"11px"})}>Reset All</button>
        </div>
        <div style={{color:MUT,fontSize:"12px",marginBottom:"14px"}}>Set the minimum number of items you must tick in each section before you can trade. Leave at max to require all.</div>
        {Object.entries(checks).map(([section,items],si)=>{
          const minReq = getMin(section);
          const pct    = (minReq/items.length)*100;
          return(
            <div key={section} style={{background:CARD,borderRadius:"0",padding:"14px",marginBottom:"10px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"10px",gap:"10px",flexWrap:"wrap"}}>
                <span style={{color:WHT,fontSize:"13px",fontWeight:"600"}}>{section}</span>
                <span style={{color:MUT,fontSize:"11px"}}>{items.length} items total</span>
              </div>

              {/* Visual slider row */}
              <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"10px"}}>
                <span style={{color:MUT,fontSize:"12px",minWidth:"12px"}}>0</span>
                <div style={{flex:1,position:"relative",height:"24px",display:"flex",alignItems:"center"}}>
                  <div style={{width:"100%",background:MUT2,borderRadius:"0",height:"6px"}}>
                    <div style={{background:GR,width:`${pct}%`,height:"6px",borderRadius:"0",transition:"width 0.2s"}}/>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={items.length}
                    value={minReq}
                    onChange={e=>{
                      const val=parseInt(e.target.value);
                      const u={...sectionMins,[section]:val};
                      setSectionMins(u); lsSet(uk("sectionMins"),u);
                    }}
                    style={{position:"absolute",width:"100%",opacity:0,cursor:"pointer",height:"24px",margin:0}}
                  />
                </div>
                <span style={{color:MUT,fontSize:"12px",minWidth:"12px"}}>{items.length}</span>
              </div>

              {/* Current value display */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{display:"flex",gap:"4px"}}>
                  {items.map((_,i)=>(
                    <div key={i} style={{width:"10px",height:"10px",borderRadius:"0",background:i<minReq?AMB:MUT2,transition:"background 0.15s"}}/>
                  ))}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                  <span style={{color:GR,fontSize:"14px",fontWeight:"700",fontFamily:"monospace"}}>{minReq}</span>
                  <span style={{color:MUT,fontSize:"12px"}}>/ {items.length} required</span>
                  {minReq===items.length && <span style={{color:MUT,fontSize:"11px"}}>(all)</span>}
                  {minReq===0 && <span style={{color:RD,fontSize:"11px"}}>(none)</span>}
                </div>
              </div>

              {/* Quick preset buttons */}
              <div style={{display:"flex",gap:"6px",marginTop:"10px"}}>
                {[
                  {label:"None", val:0},
                  {label:"Half", val:Math.ceil(items.length/2)},
                  {label:"Most", val:Math.ceil(items.length*0.75)},
                  {label:"All",  val:items.length},
                ].map(p=>(
                  <button key={p.label} onClick={()=>{const u={...sectionMins,[section]:p.val};setSectionMins(u);lsSet(uk("sectionMins"),u);}}
                    style={{flex:1,background:minReq===p.val?WHT:CARD,color:minReq===p.val?BG:MUT,border:`1px solid ${minReq===p.val?WHT:BOR}`,padding:"6px 0",borderRadius:"0",cursor:"pointer",fontSize:"11px",fontWeight:minReq===p.val?"700":"400",minHeight:"32px"}}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Import */}
      <div style={{...card(),borderLeft:`2px solid ${BOR}`}}>
        <div style={{fontSize:"11px",textTransform:"uppercase",letterSpacing:".14em",color:AMB,marginBottom:"14px"}}>import trades</div>
        <div style={{color:MUT,fontSize:"12px",marginBottom:"16px",lineHeight:1.7}}>Upload directly from Zerodha. Duplicates skipped automatically.</div>
        {importStatus&&(
          <div style={{padding:"12px 16px",marginBottom:"14px",
            background:importStatus.error?"rgba(168,90,82,0.1)":importStatus.loading?"rgba(212,167,71,0.08)":"rgba(107,158,107,0.1)",
            border:`1px solid ${importStatus.error?RD:importStatus.loading?AMB:GR}`,
            color:importStatus.error?RD:importStatus.loading?AMB:GR,fontSize:"13px"}}>
            {importStatus.loading&&`⟳ ${importStatus.msg||"Processing..."}`}
            {importStatus.done&&`✓ Added ${importStatus.added} trades · ${importStatus.skipped} duplicates skipped`}
            {importStatus.error&&`✗ ${importStatus.error}`}
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:M?"1fr":"1fr 1fr",gap:"12px"}}>
          <label style={{display:"block",background:CARD,border:`1px solid ${BOR}`,padding:"20px",textAlign:"center",cursor:"pointer"}}>
            <div style={{fontSize:"22px",marginBottom:"8px",color:AMB}}>↑</div>
            <div style={{color:WHT,fontSize:"12px",marginBottom:"4px",textTransform:"uppercase",letterSpacing:".12em"}}>Upload Excel</div>
            <div style={{color:MUT,fontSize:"11px",marginBottom:"2px"}}>Zerodha tradebook .xlsx</div>
            <div style={{color:MUT2,fontSize:"10px"}}>auto-parsed · duplicates skipped</div>
            <input type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={e=>{if(e.target.files[0])importExcel(e.target.files[0]);e.target.value="";}}/>
          </label>
          <label style={{display:"block",background:CARD,border:`1px solid ${BOR}`,padding:"20px",textAlign:"center",cursor:"pointer"}}>
            <div style={{fontSize:"22px",marginBottom:"8px",color:AMB}}>↑</div>
            <div style={{color:WHT,fontSize:"12px",marginBottom:"4px",textTransform:"uppercase",letterSpacing:".12em"}}>Upload JSON</div>
            <div style={{color:MUT,fontSize:"11px",marginBottom:"2px"}}>Pre-parsed import file</div>
            <div style={{color:MUT2,fontSize:"10px"}}>zerodha_trades_import.json</div>
            <input type="file" accept=".json" style={{display:"none"}} onChange={e=>{if(e.target.files[0])importJSON(e.target.files[0]);e.target.value="";}}/>
          </label>
        </div>
        <div style={{marginTop:"14px",padding:"12px",background:CARD,border:`1px solid ${BOR}`,fontSize:"11px",color:MUT,lineHeight:1.8}}>
          <span style={{color:AMB}}>How to get Zerodha tradebook:</span><br/>
          Console → Reports → Tradebook → Select year → Download Excel
        </div>
      </div>
      {/* Export */}
      <div style={{...card(),borderLeft:`2px solid ${BOR}`}}>
        <div style={{fontSize:"11px",textTransform:"uppercase",letterSpacing:".14em",color:AMB,marginBottom:"14px"}}>export data</div>
        <div style={{display:"flex",gap:"10px",flexWrap:"wrap"}}>
          <button onClick={()=>exportCSV(trades)} style={{...btn(),flex:1}}>⬇ Trades CSV ({trades.length})</button>
          <button onClick={()=>exportReviewsCSV(reviews)} style={{...btn(),flex:1}}>⬇ Reviews CSV ({reviews.length})</button>
        </div>
      </div>
      {/* Profiles */}
      <div style={{...card(),borderLeft:`2px solid ${BOR}`}}>
        <div style={{fontSize:"11px",textTransform:"uppercase",letterSpacing:".14em",color:AMB,marginBottom:"14px"}}>all profiles</div>
        <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginBottom:"14px"}}>
          {userList.map(u=>(
            <div key={u} style={{display:"flex",alignItems:"center",gap:"8px",background:CARD,borderRadius:"0",padding:"10px 14px",border:`1px solid ${u===activeUser?WHT:BOR}`}}>
              <div style={{width:"26px",height:"26px",borderRadius:"50%",background:MUT2,display:"flex",alignItems:"center",justifyContent:"center",color:WHT,fontSize:"12px",fontWeight:"700"}}>{u.charAt(0).toUpperCase()}</div>
              <span style={{color:u===activeUser?WHT:MUT,fontSize:"13px"}}>{u}</span>
              {u===activeUser&&<span style={{color:MUT,fontSize:"10px"}}>(you)</span>}
            </div>
          ))}
        </div>
        <button onClick={switchUser} style={btnGh({width:"100%"})}>Switch Profile</button>
      </div>
      {/* Save */}
      <div style={{display:"flex",gap:"10px",marginBottom:"14px"}}>
        <button style={{...btn(),flex:1,fontSize:"15px",padding:"14px"}} onClick={saveSettings}>SAVE SETTINGS</button>
        <button style={btnGh({flex:1})} onClick={()=>setDraft(settings)}>Cancel</button>
      </div>
      {/* Danger */}
      <div style={{...card(),borderColor:RD+"44"}}>
        <div style={{...h2sty,color:RD}}>⚠ Danger Zone</div>
        <div style={{display:"flex",gap:"10px",flexWrap:"wrap"}}>
          {[{label:"Reset settings",fn:()=>{const ds={...DEFAULT_SETTINGS,traderName:activeUser};setDraft(ds);pSettings(ds);setSavedMsg("✓ Settings reset");setTimeout(()=>setSavedMsg(""),2500);}},{label:"Clear all trades",fn:()=>{if(window.confirm("Delete ALL trades?"))pTrades([]);}},{label:"Clear all reviews",fn:()=>{if(window.confirm("Delete ALL reviews?"))pReviews([]);}}].map(x=>(
            <button key={x.label} onClick={x.fn} style={{background:"transparent",color:RD,border:`1px solid ${RD}`,padding:"10px 16px",borderRadius:"0",cursor:"pointer",fontSize:"13px",minHeight:"44px"}}>{x.label}</button>
          ))}
        </div>
      </div>
    </div>);
  };

  // ── RENDER MAP ────────────────────────────────────────────
  const renderTab = () => {
    switch(tab) {
      case "dashboard":  return renderDashboard();
      case "journal":    return renderJournal();
      case "trades":     return renderTrades();
      case "checklist":  return renderChecklist();
      case "risk":       return renderRisk();
      case "plan":       return renderPlan();
      case "analytics":  return renderAnalytics();
      case "review":     return renderReview();
      case "customize":  return renderCustomize();
      case "settings":   return renderSettings();
      default:           return renderJournal();
    }
  };

  // ── MORE OVERLAY ──────────────────────────────────────────
  const MoreOverlay = () => (
    <div style={{position:"fixed",bottom:"70px",left:0,right:0,background:SURF,borderTop:`1px solid ${BOR}`,zIndex:100,padding:"12px 16px",display:"flex",flexWrap:"wrap",gap:"8px"}}>
      {MORE_TABS.map(t=>(
        <button key={t.key} onClick={()=>navTo(t.key)}
          style={{flex:"1 1 40%",background:tab===t.key?WHT:CARD,color:tab===t.key?BG:MUT,border:`1px solid ${tab===t.key?WHT:BOR}`,padding:"12px",borderRadius:"0",cursor:"pointer",fontSize:"13px",fontWeight:tab===t.key?"700":"400",minHeight:"44px",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px"}}>
          {t.icon} {t.label}
        </button>
      ))}
    </div>
  );

  // ── ROOT ──────────────────────────────────────────────────
  const tabIdx = ALL_TABS.findIndex(t=>t.key===tab);

  return (
    <div style={{background:BG,minHeight:"100vh",color:WHT,fontFamily:"'JetBrains Mono',ui-monospace,monospace",fontWeight:300,zoom:settings.textScale||1}}>

      {/* ── DESKTOP: SIDEBAR + CONTENT ── */}
      {!M && (
        <div style={{display:"grid",gridTemplateColumns:"220px 1fr",minHeight:"100vh"}}>

          {/* SIDEBAR */}
          <aside style={{borderRight:`1px solid ${BOR}`,padding:"36px 28px 24px",display:"flex",flexDirection:"column",background:BG,position:"sticky",top:0,height:"100vh",overflow:"auto"}}>
            {/* Brand */}
            <div>
              <div style={{fontSize:"10px",color:AMB,textTransform:"uppercase",letterSpacing:".18em"}}>top_one_percent</div>
              <div style={{fontSize:"30px",fontWeight:"200",letterSpacing:"-.02em",marginTop:"10px",lineHeight:1,color:WHT}}>./ledger</div>
              <div style={{color:MUT,fontSize:"12px",marginTop:"12px",lineHeight:1.7}}>A trader's log,<br/>kept honestly.</div>
            </div>

            {/* Nav */}
            <nav style={{marginTop:"40px",flex:1}}>
              {ALL_TABS.map((t,i)=>(
                <div key={t.key} onClick={()=>setTab(t.key)}
                  style={{display:"flex",gap:"14px",alignItems:"baseline",padding:"9px 0",cursor:"pointer",
                          color:tab===t.key?AMB:MUT,borderBottom:`1px solid ${tab===t.key?MUT2:BOR}`}}>
                  <span style={{color:tab===t.key?AMB:MUT2,fontSize:"10px"}}>{String(i+1).padStart(2,"0")}</span>
                  <span style={{fontSize:"13px"}}>{t.label.toLowerCase()}</span>
                  {tab===t.key&&<span style={{marginLeft:"auto",color:AMB,fontSize:"10px"}}>◀</span>}
                </div>
              ))}
            </nav>

            {/* Session info */}
            <div style={{marginTop:"24px",paddingTop:"20px",borderTop:`1px solid ${BOR}`}}>
              <div style={{fontSize:"9px",textTransform:"uppercase",letterSpacing:".18em",color:MUT,marginBottom:"10px"}}>session</div>
              <div style={{fontSize:"12px",color:MUT,lineHeight:2}}>
                <div>acct &nbsp;&nbsp;<span style={{color:WHT}}>{settings.traderName}</span></div>
                <div>cap &nbsp;&nbsp;&nbsp;<span style={{color:WHT}}>{fmt(settings.capital)}</span></div>
                <div>today &nbsp;<span style={{color:todayPnl>=0?GR:RD}}>{fmt(todayPnl)}</span></div>
                <div style={{fontSize:"10px",color:MUT2,marginTop:"6px"}}>{new Date().toISOString().slice(0,10)}</div>
              </div>
              <button onClick={switchUser} style={{marginTop:"14px",background:"transparent",color:MUT2,border:`1px solid ${BOR}`,padding:"6px 12px",fontSize:"10px",textTransform:"uppercase",letterSpacing:".14em",cursor:"pointer",width:"100%"}}>switch profile</button>
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <main style={{padding:"40px 52px 60px",overflowY:"auto"}}>
            {/* Breadcrumb */}
            <div style={{fontSize:"10px",color:MUT2,letterSpacing:".2em",marginBottom:"32px"}}>
              ./ {tab} &nbsp;·&nbsp; screen {String(tabIdx+1).padStart(2,"0")} of {String(ALL_TABS.length).padStart(2,"0")}
            </div>
            {renderTab()}
          </main>
        </div>
      )}

      {/* ── MOBILE: TOP BAR + CONTENT + BOTTOM NAV ── */}
      {M && (
        <>
          <div style={{background:SURF,borderBottom:`1px solid ${BOR}`,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50}}>
            <div style={{color:WHT,fontSize:"13px",fontWeight:"200",letterSpacing:".02em"}}>top_1%</div>
            <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
              <span style={{color:MUT,fontSize:"11px"}}>{settings.traderName}</span>
              <button onClick={switchUser} style={{background:"transparent",color:MUT2,border:`1px solid ${BOR}`,padding:"4px 10px",fontSize:"10px",textTransform:"uppercase",letterSpacing:".12em",cursor:"pointer"}}>⇄</button>
            </div>
          </div>

          <div style={{padding:"16px",paddingBottom:"90px"}}>
            {renderTab()}
          </div>

          {M && showMore && <MoreOverlay/>}

          <div style={{position:"fixed",bottom:0,left:0,right:0,background:BG,borderTop:`1px solid ${BOR}`,display:"flex",zIndex:99,paddingBottom:"env(safe-area-inset-bottom)"}}>
            {BOT_TABS.map(t=>(
              <button key={t.key} onClick={()=>{navTo(t.key);setShowMore(false);}}
                style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",padding:"10px 0",background:"transparent",border:"none",cursor:"pointer",
                        color:tab===t.key?AMB:MUT,minHeight:"60px",fontFamily:"inherit"}}>
                <span style={{fontSize:"18px",lineHeight:1}}>{t.icon}</span>
                <span style={{fontSize:"9px",textTransform:"uppercase",letterSpacing:".1em"}}>{t.label}</span>
              </button>
            ))}
            <button onClick={()=>setShowMore(s=>!s)}
              style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",padding:"10px 0",background:"transparent",border:"none",cursor:"pointer",
                      color:showMore||MORE_TABS.some(t=>t.key===tab)?AMB:MUT,minHeight:"60px",fontFamily:"inherit"}}>
              <span style={{fontSize:"18px",lineHeight:1}}>⋯</span>
              <span style={{fontSize:"9px",textTransform:"uppercase",letterSpacing:".1em"}}>More</span>
            </button>
          </div>
        </>
      )}

    </div>
  );
}
