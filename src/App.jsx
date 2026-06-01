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
const today = () => new Date().toISOString().slice(0,10);
const nowT  = () => new Date().toTimeString().slice(0,5);

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
  const isOpt = s.includes("straddle") || s.includes("strangle") || i.includes("option");
  if (isCom) return isOpt ? "Commodity Options" : "Commodity Futures";
  return isOpt ? "F&O Options" : "F&O Futures";
};

const calcCharges = (buyVal, sellVal, segment) => {
  if (!buyVal || !sellVal) return null;
  const totalVal = buyVal + sellVal;
  const isOpt = segment.includes("Options");
  const isCom = segment.includes("Commodity");
  const isDel = segment.includes("Delivery");

  let brk;
  if (isDel) brk = 0;
  else if (isOpt) brk = 40;                     // ₹20 buy + ₹20 sell
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
  const entry = parseFloat(trade.entry), exit = parseFloat(trade.exitPrice), size = parseFloat(trade.size);
  if (!entry||!exit||!size) return trade;
  const buyVal  = trade.direction==="Long" ? entry*size : exit*size;
  const sellVal = trade.direction==="Long" ? exit*size  : entry*size;
  const seg = trade.segment || detectSegment(trade.instrument, trade.setup);
  const c   = calcCharges(buyVal, sellVal, seg);
  if (!c) return trade;
  const gross = trade.direction==="Long" ? (exit-entry)*size : (entry-exit)*size;
  return {
    ...trade, segment:seg, grossPnl:String(+gross.toFixed(2)),
    pnl:String(+(gross - c.totalCharges).toFixed(2)),
    brokerage:String(c.brokerage), stt:String(c.stt), txnCharges:String(c.txnCharges),
    sebi:String(c.sebi), gst:String(c.gst), stamp:String(c.stamp), totalCharges:String(c.totalCharges),
  };
};

/* ════════════════════════════════════════════════════════════
   EMPTY OBJECTS
════════════════════════════════════════════════════════════ */
const emptyTrade = (instr, setup, emo) => ({
  date:today(), time:nowT(), instrument:instr||"", segment:detectSegment(instr||"",setup||""),
  direction:"Long", tradeType:"Intraday", setup:setup||"", entry:"", sl:"", exitPrice:"", size:"",
  riskAmount:"", grossPnl:"", pnl:"", brokerage:"", stt:"", txnCharges:"", sebi:"", gst:"", stamp:"", totalCharges:"",
  rrAchieved:"", grade:"A", followedRules:"Yes", emotion:emo||"Calm", mistakes:"", improvements:"", notes:"",
});
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
  const [reflectionDraft, setReflectionDraft] = useState({});
  const [reviewTab, setReviewTab] = useState("daily");
  const [analyticsView, setAnalyticsView] = useState("combined");
  const [settingsDraft, setSettingsDraft] = useState(DEFAULT_SETTINGS);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [editListInput, setEditListInput] = useState({});

  // ── trades view state ────────────────────────────────────
  const [search,      setSearch]      = useState("");
  const [fInstr,      setFInstr]      = useState("All");
  const [fDir,        setFDir]        = useState("All");
  const [expanded,    setExpanded]    = useState(null);

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
    if (!tf.entry || !tf.sl) return alert("Entry and SL required");
    // Capture checklist snapshot at moment of trade
    const checklistSnapshot = Object.entries(checks).flatMap(([section, items], si) =>
      items.map((item, i) => {
        const gi = Object.values(checks).slice(0,si).flat().length + i;
        return { section, item, state: ck[gi] || "—" };
      })
    );
    const checkedYes = checklistSnapshot.filter(c=>c.state==="yes").length;
    const checkedNo  = checklistSnapshot.filter(c=>c.state==="no").length;
    // Find matching open plan and auto-link
    const matchPlan = plans.find(p => p.status === "open" && p.instrument === tf.instrument);
    const tradeId = Date.now();
    const final = applyCharges({
      ...tf,
      id: tradeId,
      checklist: checklistSnapshot,
      checklistYes: checkedYes,
      checklistNo:  checkedNo,
      checklistTotal: checklistSnapshot.length,
      postReflection: tf.postReflection || "",
      planId: matchPlan?.id || null,
    });
    pTrades([final, ...trades]);
    if (matchPlan) {
      pPlans(plans.map(p => p.id === matchPlan.id
        ? {...p, linkedTradeIds: [...(p.linkedTradeIds||[]), tradeId], status: "executed"}
        : p));
    }
    setTf(emptyTrade(instruments[0], setups[0], emotions[0]));
  };
  const updateTrade = (id, patch) => {
    pTrades(trades.map(t => t.id === id ? {...t, ...patch} : t));
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
  const editPlan = (p) => { setPlanF(p); setEditingPlanId(p.id); setDrawer("plans"); };
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
  const logReview = () => { pReviews([{...rf, id:Date.now()}, ...reviews]); setRf(emptyReview(reviewTab)); };
  const delReview = (id) => pReviews(reviews.filter(r=>r.id!==id));

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
  const closed = trades.filter(t=>t.pnl!=="");
  const todayPnl = closed.filter(t=>t.date===today()).reduce((s,t)=>s+parseFloat(t.pnl),0);
  const weekPnl = (()=>{ const ws=new Date(); ws.setDate(ws.getDate()-ws.getDay()); return closed.filter(t=>new Date(t.date)>=ws).reduce((s,t)=>s+parseFloat(t.pnl),0); })();
  const monthPnl = (()=>{ const m=new Date(); m.setDate(1); return closed.filter(t=>new Date(t.date)>=m).reduce((s,t)=>s+parseFloat(t.pnl),0); })();
  const totalPnl = closed.reduce((s,t)=>s+parseFloat(t.pnl),0);
  const totalGross = closed.reduce((s,t)=>s+parseFloat(t.grossPnl||t.pnl||0),0);
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
    return [...closed].sort((a,b)=>a.date.localeCompare(b.date)).map(t => {
      c += parseFloat(t.pnl);
      return { date: t.date.slice(5), v: Math.round(c) };
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
    { key:"dashboard", label:"dashboard" },
    { key:"journal",   label:"journal"   },
    { key:"trades",    label:"trades"    },
    { key:"analytics", label:"analytics" },
  ];

  /* ── DASHBOARD ── */
  const renderDashboard = () => (
    <div>
      {/* hero */}
      <div style={{marginBottom:T.s[10]}}>
        <div style={{color:T.amb,fontSize:T.size.label,textTransform:"uppercase",letterSpacing:".18em",marginBottom:T.s[4]}}>today</div>
        <div style={sty.heroNum(todayPnl>=0?T.gr:T.rd, isMob?T.size.h1:T.size.mega)}>{fmt(todayPnl)}</div>
        <div style={{color:T.mut,fontSize:T.size.body,marginTop:T.s[3]}}>
          {closed.filter(t=>t.date===today()).length} trades today &nbsp;·&nbsp; week <span style={{color:T.text}}>{fmt(weekPnl)}</span> &nbsp;·&nbsp; month <span style={{color:T.text}}>{fmt(monthPnl)}</span>
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

      {/* loss limits */}
      <Sec n="02" title="loss limits"/>
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

      {/* recent trades */}
      <Sec n="03" title="recent" right={`${trades.length} total`}/>
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

    return (
    <div style={{maxWidth:560, margin:"0 auto"}}>
      <Sec n="01" title="new entry"/>

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
            <span style={{color:T.mut2,marginLeft:"auto"}}>tap to edit →</span>
          </div>
        </div>
        {/* Matching plan */}
        {matchingPlan && (
          <div onClick={()=>{linkTradeToPlan(matchingPlan.id, null); setDrawer("plans");}} style={{padding:T.s[4],border:`1px solid ${T.amb}`,cursor:"pointer"}}>
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
            <button key={i} onClick={()=>updateTf({instrument:i, segment:detectSegment(i,tf.setup)})}
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
        <select style={sty.select} value={tf.segment} onChange={e=>updateTf({segment:e.target.value})}>
          {SEGMENTS.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* setup + type */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:T.s[4],marginBottom:T.s[5]}}>
        <Field label="setup"><select style={sty.select} value={tf.setup} onChange={e=>setTf({...tf,setup:e.target.value})}>{setups.map(s=><option key={s}>{s}</option>)}</select></Field>
        <Field label="type"><select style={sty.select} value={tf.tradeType} onChange={e=>setTf({...tf,tradeType:e.target.value})}>{tradeTypes.map(t=><option key={t}>{t}</option>)}</select></Field>
      </div>

      {/* prices */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:T.s[4],marginBottom:T.s[5]}}>
        <Field label="entry"><input type="number" style={sty.input} value={tf.entry} onChange={e=>updateTf({entry:e.target.value})}/></Field>
        <Field label="stop loss"><input type="number" style={sty.input} value={tf.sl} onChange={e=>setTf({...tf,sl:e.target.value})}/></Field>
        <Field label="exit"><input type="number" style={sty.input} value={tf.exitPrice} onChange={e=>updateTf({exitPrice:e.target.value})}/></Field>
      </div>

      {/* size */}
      <div style={{marginBottom:T.s[5]}}>
        <Field label="position size"><input type="number" style={sty.input} value={tf.size} onChange={e=>updateTf({size:e.target.value})}/></Field>
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

      {/* notes */}
      <div style={{marginBottom:T.s[5]}}>
        <Field label="notes (optional)"><textarea style={sty.textarea} value={tf.notes} onChange={e=>setTf({...tf,notes:e.target.value})} placeholder="setup context, mistakes, what to remember..."/></Field>
      </div>

      <button onClick={logTrade} style={{...sty.btn("primary"), width:"100%", padding:`${T.s[4]}px`, fontSize:T.size.body}}>log trade →</button>
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
          {filteredTrades.map(t => {
            const exp = expanded === t.id;
            const net = parseFloat(t.pnl||0);
            return (
              <div key={t.id} style={{borderBottom:T.rule1}}>
                <div onClick={()=>setExpanded(exp?null:t.id)}
                  style={{display:"grid", gridTemplateColumns:isMob?"1fr 1fr auto":"100px 140px 80px 100px 100px 120px 60px 40px", gap:T.s[3], padding:`${T.s[3]}px 0`, cursor:"pointer", alignItems:"center"}}>
                  <span style={{color:T.mut,fontSize:T.size.small,fontFamily:"'JetBrains Mono', monospace"}}>{t.date}</span>
                  <span style={{color:T.text,fontSize:T.size.body}}>{t.instrument}</span>
                  {!isMob && <span style={{color:t.direction==="Long"?T.gr:T.rd,fontSize:T.size.small}}>{t.direction?.toLowerCase()}</span>}
                  {!isMob && <span style={{color:T.mut,fontFamily:"'JetBrains Mono', monospace",fontSize:T.size.small}}>{t.entry}</span>}
                  {!isMob && <span style={{color:T.mut,fontFamily:"'JetBrains Mono', monospace",fontSize:T.size.small}}>{t.exitPrice}</span>}
                  <span style={{color:net>=0?T.gr:T.rd,fontFamily:"'JetBrains Mono', monospace",fontSize:T.size.body, textAlign:isMob?"right":"left"}}>{t.pnl?fmt(net):"—"}</span>
                  {!isMob && <span style={{color:T.amb,fontSize:T.size.small}}>{t.rrAchieved||"—"}</span>}
                  <span style={{color:T.mut2,fontSize:T.size.small,textAlign:"right"}}>{exp?"▾":"▸"}</span>
                </div>

                {exp && (
                  <div style={{padding:`${T.s[5]}px ${T.s[3]}px ${T.s[6]}px`, background:T.surf}}>
                    {/* trade detail grid */}
                    <div style={{...sty.label,marginBottom:T.s[3]}}>trade detail</div>
                    <div style={{display:"grid", gridTemplateColumns:isMob?"1fr 1fr":"repeat(4,1fr)", gap:T.s[4], marginBottom:T.s[6]}}>
                      {[
                        ["date & time",   `${t.date} ${t.time||""}`],
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

                    <div style={{marginTop:T.s[4], textAlign:"right"}}>
                      <button onClick={()=>{if(confirm("Delete this trade?")) delTrade(t.id);}} style={{...sty.btn(),color:T.rd,border:`1px solid ${T.rd}`}}>delete trade</button>
                    </div>
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
  const byInst   = (list) => [...new Set(list.map(t=>t.instrument))].map(n => ({ name:n, v:Math.round(list.filter(t=>t.instrument===n).reduce((s,t)=>s+parseFloat(t.pnl||0),0)), n:list.filter(t=>t.instrument===n).length })).filter(d=>d.n>0).sort((a,b)=>b.v-a.v);
  const byGrade  = (list) => GRADES.map(g => ({ g, v:Math.round(list.filter(t=>t.grade===g).reduce((s,t)=>s+parseFloat(t.pnl||0),0)), n:list.filter(t=>t.grade===g).length })).filter(d=>d.n>0);
  const bySetup  = (list) => [...new Set(list.map(t=>t.setup))].map(s => ({ s, v:Math.round(list.filter(t=>t.setup===s).reduce((a,t)=>a+parseFloat(t.pnl||0),0)), n:list.filter(t=>t.setup===s).length })).filter(d=>d.n>0).sort((a,b)=>b.v-a.v).slice(0,8);

  const aData = analyticsView==="intraday" ? closed.filter(t=>t.tradeType==="Intraday") : analyticsView==="swing" ? closed.filter(t=>t.tradeType!=="Intraday") : closed;
  const aPnl  = aData.reduce((s,t)=>s+parseFloat(t.pnl||0),0);
  const aWins = aData.filter(t=>parseFloat(t.pnl)>0).length;
  const aWR   = aData.length ? (aWins/aData.length*100).toFixed(1) : "0";
  const renderAnalytics = () => (
    <div>
      {/* view tabs */}
      <div style={{display:"flex",gap:T.s[3],marginBottom:T.s[6],borderBottom:T.rule1}}>
        {[["combined","combined"],["intraday","intraday"],["swing","swing"]].map(([k,l]) => (
          <button key={k} onClick={()=>setAnalyticsView(k)} style={{background:"transparent",border:"none",color:analyticsView===k?T.amb:T.mut,padding:`${T.s[3]}px ${T.s[4]}px`,cursor:"pointer",fontFamily:"'JetBrains Mono', monospace",fontSize:T.size.small,textTransform:"uppercase",letterSpacing:".14em",borderBottom:`1px solid ${analyticsView===k?T.amb:"transparent"}`,marginBottom:-1}}>{l}</button>
        ))}
      </div>

      {/* hero */}
      <div style={{marginBottom:T.s[8]}}>
        <div style={{color:T.amb,fontSize:T.size.label,textTransform:"uppercase",letterSpacing:".18em",marginBottom:T.s[3]}}>net p&l · {analyticsView}</div>
        <div style={sty.heroNum(aPnl>=0?T.gr:T.rd, isMob?T.size.h1:T.size.hero)}>{fmt(aPnl)}</div>
        <div style={{color:T.mut,fontSize:T.size.body,marginTop:T.s[3]}}>{aData.length} trades · win rate <span style={{color:T.text}}>{aWR}%</span> · gross {fmt(aData.reduce((s,t)=>s+parseFloat(t.grossPnl||t.pnl||0),0))} · charges <span style={{color:T.rd}}>-{fmt(aData.reduce((s,t)=>s+parseFloat(t.totalCharges||0),0))}</span></div>
      </div>

      {/* equity curve */}
      <Sec n="01" title="equity curve"/>
      {(() => {
        let c=0; const data = [...aData].sort((a,b)=>a.date.localeCompare(b.date)).map(t=>{c+=parseFloat(t.pnl||0); return {date:t.date.slice(5), v:Math.round(c)};});
        return data.length>1 ? (
          <ResponsiveContainer width="100%" height={isMob?180:260}>
            <LineChart data={data} margin={{top:8,right:0,bottom:0,left:0}}>
              <XAxis dataKey="date" stroke={T.mut2} tick={{fill:T.mut,fontSize:10}} interval="preserveStartEnd"/>
              <YAxis stroke={T.mut2} tick={{fill:T.mut,fontSize:10}} tickFormatter={fmt} width={70}/>
              <Tooltip contentStyle={{background:T.card,border:T.rule1,fontFamily:"'JetBrains Mono', monospace"}} labelStyle={{color:T.text}} itemStyle={{color:T.text}} formatter={v=>[fmt(v),"cumulative"]}/>
              <Line type="monotone" dataKey="v" stroke={aPnl>=0?T.gr:T.rd} strokeWidth={1.5} dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        ) : <div style={{color:T.mut2,fontSize:T.size.small,padding:`${T.s[5]}px 0`}}>no data</div>;
      })()}

      {/* by instrument */}
      <Sec n="02" title="by instrument"/>
      {byInst(aData).length ? (
        <ResponsiveContainer width="100%" height={isMob?180:220}>
          <BarChart data={byInst(aData)} margin={{top:8,right:0,bottom:0,left:0}}>
            <XAxis dataKey="name" stroke={T.mut2} tick={{fill:T.mut,fontSize:9}}/>
            <YAxis stroke={T.mut2} tick={{fill:T.mut,fontSize:9}} tickFormatter={fmt} width={70}/>
            <Tooltip contentStyle={{background:T.card,border:T.rule1,fontFamily:"'JetBrains Mono', monospace"}} labelStyle={{color:T.text}} itemStyle={{color:T.text}} formatter={v=>[fmt(v),"p&l"]}/>
            <Bar dataKey="v">{byInst(aData).map((d,i)=><Cell key={i} fill={d.v>=0?T.gr:T.rd}/>)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : <div style={{color:T.mut2,fontSize:T.size.small,padding:`${T.s[5]}px 0`}}>no data</div>}

      {/* best/worst setups */}
      <Sec n="03" title="best & worst setups"/>
      {bySetup(aData).length ? (
        <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch",margin:isMob?`0 -${T.s[3]}px`:undefined,padding:isMob?`0 ${T.s[3]}px`:undefined}}><table style={{minWidth:isMob?540:"auto",width:"100%",borderCollapse:"collapse",fontSize:T.size.small}}>
          <thead><tr style={{color:T.mut,borderBottom:T.rule1}}>
            {["setup","trades","p&l"].map(h => <th key={h} style={{padding:`${T.s[2]}px ${T.s[3]}px`,textAlign:"left",fontWeight:T.weight.regular,fontSize:T.size.label,textTransform:"uppercase",letterSpacing:".14em"}}>{h}</th>)}
          </tr></thead>
          <tbody>{bySetup(aData).map(d => (
            <tr key={d.s} style={{borderBottom:T.rule1}}>
              <td style={{padding:`${T.s[3]}px ${T.s[3]}px`,color:T.text}}>{d.s}</td>
              <td style={{padding:`${T.s[3]}px ${T.s[3]}px`,color:T.mut}}>{d.n}</td>
              <td style={{padding:`${T.s[3]}px ${T.s[3]}px`,color:d.v>=0?T.gr:T.rd,fontFamily:"'JetBrains Mono', monospace"}}>{fmt(d.v)}</td>
            </tr>
          ))}</tbody>
        </table></div>
      ) : <div style={{color:T.mut2,fontSize:T.size.small,padding:`${T.s[5]}px 0`}}>no data</div>}
    </div>
  );

  /* ── SETTINGS DRAWER ── */
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

        <Sec n="06" title="profile"/>
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
    return (
      <div>
        <div style={{display:"flex",gap:T.s[2],marginBottom:T.s[6]}}>
          {periods.map(p => (
            <button key={p} onClick={()=>{setReviewTab(p); setRf(emptyReview(p));}} style={{...sty.btn(), background:reviewTab===p?T.amb:"transparent", color:reviewTab===p?T.bg:T.text, flex:1}}>{p}</button>
          ))}
        </div>

        <Sec n="01" title={`new ${reviewTab} review`}/>
        <Field label="mental state">
          <div style={{display:"flex",gap:T.s[2],flexWrap:"wrap"}}>
            {MENTAL.map(m => (
              <button key={m} onClick={()=>setRf({...rf,mentalState:m})} style={{...sty.btn(), background:rf.mentalState===m?T.amb:"transparent", color:rf.mentalState===m?T.bg:T.text}}>{m.toLowerCase()}</button>
            ))}
          </div>
        </Field>

        {[
          ["what went well","whatWentWell"],
          ["mistakes","mistakes"],
          ["missed setups","missedSetups"],
          ["rules followed","rulesFollowed"],
          ["emotional trading","emotionalTrading"],
          ["regrets","regrets"],
          ["improvements","improvements"],
          ["self coaching","selfCoaching"],
        ].map(([label,key]) => (
          <div key={key} style={{marginTop:T.s[4]}}>
            <Field label={label}><textarea style={sty.textarea} value={rf[key]} onChange={e=>setRf({...rf,[key]:e.target.value})}/></Field>
          </div>
        ))}

        <div style={{display:"flex",gap:T.s[3],marginTop:T.s[6]}}>
          <button onClick={logReview} style={{...sty.btn("primary"), flex:1}}>save review</button>
          <button onClick={()=>setRf(emptyReview(reviewTab))} style={{...sty.btn(), flex:1}}>clear</button>
        </div>

        {reviews.filter(r=>r.period===reviewTab).length > 0 && (
          <>
            <Sec n="02" title={`past ${reviewTab} reviews`}/>
            {reviews.filter(r=>r.period===reviewTab).map(r => (
              <div key={r.id} style={{padding:`${T.s[4]}px 0`, borderBottom:T.rule1}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:T.s[3]}}>
                  <span style={{color:T.text, fontSize:T.size.body}}>{r.date}</span>
                  <div style={{display:"flex",gap:T.s[2],alignItems:"center"}}>
                    <span style={{color:T.amb, fontSize:T.size.small}}>{r.mentalState?.toLowerCase()}</span>
                    <button onClick={()=>delReview(r.id)} style={{background:"transparent",color:T.rd,border:"none",cursor:"pointer",fontSize:T.size.body}}>×</button>
                  </div>
                </div>
                {[["what went well","whatWentWell"],["mistakes","mistakes"],["improvements","improvements"]].filter(([,k])=>r[k]).map(([l,k]) => (
                  <div key={k} style={{marginBottom:T.s[3]}}>
                    <div style={sty.label}>{l}</div>
                    <div style={{color:T.mut, fontSize:T.size.small, lineHeight:1.6}}>{r[k]}</div>
                  </div>
                ))}
              </div>
            ))}
          </>
        )}
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
    <aside style={{borderRight:T.rule1, padding:`${T.s[8]}px ${T.s[6]}px ${T.s[6]}px`, display:"flex", flexDirection:"column", background:T.bg, position:"sticky", top:0, height:"100vh", overflow:"auto"}}>
      <div>
        <div style={{color:T.amb,fontSize:T.size.label,textTransform:"uppercase",letterSpacing:".18em"}}>trading journal</div>
        <div style={{fontSize:T.size.h1,fontWeight:T.weight.thin,letterSpacing:"-.02em",marginTop:T.s[2],color:T.text}}>Top 1%</div>
      </div>

      <nav style={{marginTop:T.s[10], flex:1}}>
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
            ["risk",      "risk calc"],
            ["plans",     "trade plans"],
            ["checklist", "checklist"],
            ["review",    "review"],
            ["customize", "customize"],
            ["settings",  "settings"],
          ].map(([k,l]) => (
            <div key={k} onClick={()=>setDrawer(k)} style={{display:"flex",gap:T.s[3],padding:`${T.s[2]}px 0`,cursor:"pointer",color:T.mut,fontSize:T.size.small}}>
              <span style={{color:T.mut2}}>·</span>{l}
            </div>
          ))}
        </div>
      </nav>

      <div style={{paddingTop:T.s[5], borderTop:T.rule1}}>
        <div style={{...sty.label,marginBottom:T.s[3]}}>session</div>
        <div style={{fontSize:T.size.small, color:T.mut, lineHeight:2}}>
          <div>acct &nbsp;<span style={{color:T.text}}>{activeUser}</span></div>
          <div>cap &nbsp;&nbsp;<span style={{color:T.text}}>{fmt(settings.capital)}</span></div>
          <div>today<span style={{color:todayPnl>=0?T.gr:T.rd}}>&nbsp;{fmt(todayPnl)}</span></div>
        </div>
      </div>
    </aside>
  );

  const renderTab = () => {
    switch(tab) {
      case "dashboard": return renderDashboard();
      case "journal":   return renderJournal();
      case "trades":    return renderTrades();
      case "analytics": return renderAnalytics();
      default:          return renderDashboard();
    }
  };

  return (
    <div style={{background:T.bg,minHeight:"100vh",color:T.text,fontFamily:"'JetBrains Mono', ui-monospace, monospace",fontWeight:T.weight.light,zoom:settings.textScale||1,width:"100%",maxWidth:"100vw",overflowX:"hidden"}}>
      {!isMob ? (
        <div style={{display:"grid", gridTemplateColumns:"220px 1fr", minHeight:"100vh"}}>
          {renderSidebar()}
          <main style={{padding:`${T.s[8]}px ${T.s[12]}px ${T.s[16]}px`, maxWidth:1100}}>
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
                ["risk",      "risk calculator"],
                ["plans",     "trade plans"],
                ["checklist", "checklist"],
                ["review",    "review"],
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
              </div>
              <button onClick={()=>{switchUser(); setMobileMenu(false);}}
                style={{...sty.btn(),width:"100%",marginTop:T.s[3]}}>
                switch profile
              </button>
            </div>
          )}
          <div style={{padding:`${T.s[5]}px ${T.s[4]}px ${T.s[16]}px`,maxWidth:"100vw",overflowX:"hidden"}}>{renderTab()}</div>
          <div style={{position:"fixed", bottom:0, left:0, right:0, background:T.bg, borderTop:T.rule1, display:"flex", paddingBottom:"env(safe-area-inset-bottom)", zIndex:99}}>
            {TABS.map((t,i) => (
              <button key={t.key} onClick={()=>{setTab(t.key); setMobileMenu(false);}}
                style={{flex:1,background:"transparent",border:"none",padding:`${T.s[3]}px 0`,cursor:"pointer",
                        color:tab===t.key?T.amb:T.mut,fontFamily:"inherit",
                        fontSize:T.size.tiny,textTransform:"uppercase",letterSpacing:".14em",
                        minHeight:56,touchAction:"manipulation",WebkitTapHighlightColor:"rgba(212,167,71,0.2)"}}>
                <div style={{fontSize:T.size.small,color:tab===t.key?T.amb:T.mut2,marginBottom:2}}>{String(i+1).padStart(2,"0")}</div>
                {t.label}
              </button>
            ))}
          </div>
        </>
      )}

      {drawer && renderDrawer()}
    </div>
  );
}
