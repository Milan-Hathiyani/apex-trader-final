import { useState, useEffect } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://innfzimqqrlprxkeduyk.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlubmZ6aW1xcXJscHJ4a2VkdXlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MzU3MDYsImV4cCI6MjA5NTIxMTcwNn0.AwGuyUHZmEj7Rbt_xrbxhD7FUKuVlxZ8gt93Mb9u7nI"
);

// ── THEME ───────────────────────────────────────────────────
const BG   = "#000000";
const SURF = "#0a0a0a";
const CARD = "#111111";
const BOR  = "#1c1c1c";
const WHT  = "#ffffff";
const GR   = "#10b981";
const RD   = "#ef4444";
const MUT  = "#555555";
const MUT2 = "#333333";

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
const DEFAULT_SETTINGS = { traderName:"Trader", capital:1000000, baseRisk:0.3, majorRisk:1.0, drawdownRisk:0.15, dailyLimit:30000, weeklyLimit:75000, monthlyLimit:200000, maxIntraday:4, minRR:2 };

// ── HELPERS ──────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n||0);
const todayStr = () => new Date().toISOString().split("T")[0];
const nowTime  = () => new Date().toTimeString().slice(0,5);
const lsGet = (k) => { try { const v=localStorage.getItem(k); return v?JSON.parse(v):null; } catch(e){return null;} };
const lsSet = (k,v) => { try { localStorage.setItem(k,JSON.stringify(v)); } catch(e){} };
const lsDel = (k) => { try { localStorage.removeItem(k); } catch(e){} };

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

const emptyTrade = (instr,type,setup,emo) => ({ date:todayStr(), time:nowTime(), instrument:instr||"", tradeType:type||"Intraday", direction:"Long", setup:setup||"", entry:"", sl:"", exitPrice:"", size:"", riskAmount:"", pnl:"", rrAchieved:"", grade:"A", followedRules:"Yes", emotion:emo||"Calm", mistakes:"", improvements:"", notes:"" });
const emptyPlan   = (instr) => ({ date:todayStr(), instrument:instr||"", bias:"Bullish", grade:"A", keyLevels:"", setup:"", entryZone:"", sl:"", target1:"", target2:"", invalidation:"", confluences:"", notes:"" });
const emptyReview = (p) => ({ date:todayStr(), period:p, mentalState:"Good", whatWentWell:"", mistakes:"", missedSetups:"", rulesFollowed:"", emotionalTrading:"", regrets:"", improvements:"", selfCoaching:"" });

// ── EXPORT HELPERS ───────────────────────────────────────────
const exportCSV = (trades) => {
  if(!trades.length){alert("No trades to export.");return;}
  const h=["Date","Time","Instrument","Trade Type","Direction","Setup","Entry","SL","Exit","Size","Risk(₹)","P&L(₹)","R:R","Grade","Rules","Emotion","Mistakes","Improvements","Notes"];
  const rows=trades.map(t=>[t.date,t.time,t.instrument,t.tradeType,t.direction,t.setup,t.entry,t.sl,t.exitPrice,t.size,t.riskAmount,t.pnl,t.rrAchieved,t.grade,t.followedRules,t.emotion,`"${(t.mistakes||"").replace(/"/g,'""')}"`,`"${(t.improvements||"").replace(/"/g,'""')}"`,`"${(t.notes||"").replace(/"/g,'""')}"`]);
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
const card  = (extra={}) => ({ background:SURF, border:`1px solid ${BOR}`, borderRadius:"12px", padding:"16px", marginBottom:"14px", ...extra });
const inp   = (extra={}) => ({ background:CARD, border:`1px solid ${BOR}`, color:WHT, padding:"12px 14px", borderRadius:"10px", width:"100%", fontSize:"15px", boxSizing:"border-box", minHeight:"44px", ...extra });
const sel   = (extra={}) => ({ background:CARD, border:`1px solid ${BOR}`, color:WHT, padding:"12px 14px", borderRadius:"10px", width:"100%", fontSize:"15px", boxSizing:"border-box", minHeight:"44px", ...extra });
const ta    = (extra={}) => ({ background:CARD, border:`1px solid ${BOR}`, color:WHT, padding:"12px 14px", borderRadius:"10px", width:"100%", fontSize:"14px", boxSizing:"border-box", resize:"vertical", minHeight:"80px", ...extra });
const lbl   = { color:MUT, fontSize:"11px", display:"block", marginBottom:"5px", textTransform:"uppercase", letterSpacing:"0.5px" };
const h2sty = { color:WHT, fontSize:"12px", fontWeight:"700", letterSpacing:"1px", marginBottom:"14px", textTransform:"uppercase" };
const btn   = (extra={}) => ({ background:WHT, color:BG, border:"none", padding:"12px 22px", borderRadius:"10px", cursor:"pointer", fontWeight:"700", fontSize:"14px", minHeight:"44px", ...extra });
const btnGh = (extra={}) => ({ background:"transparent", color:MUT, border:`1px solid ${BOR}`, padding:"12px 22px", borderRadius:"10px", cursor:"pointer", fontSize:"14px", minHeight:"44px", ...extra });
const ttSty  = { background:CARD, border:`1px solid ${BOR}`, color:WHT, fontSize:"12px" };
const ttLabel= { color:WHT, fontSize:"12px" };
const ttItem = { color:WHT, fontSize:"12px" };
const mentalColor = (m) => ["Excellent","Good"].includes(m) ? GR : m==="Neutral" ? WHT : RD;

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
  const logTrade    = () => { if(!tf||!tf.entry||!tf.sl){alert("Entry and SL required");return;} pTrades([{...tf,id:Date.now()},...trades]); setTf(emptyTrade(instruments[0],tradeTypes[0],setups[0],emotions[0])); };
  const deleteTrade = (id) => pTrades(trades.filter(t=>t.id!==id));
  const logReview   = () => { pReviews([{...rf,id:Date.now()},...reviews]); setRf(emptyReview(rtab)); };
  const deleteReview= (id) => pReviews(reviews.filter(r=>r.id!==id));
  const saveSettings= () => { pSettings(draft); setRc(r=>({...r,capital:draft.capital})); setSavedMsg("✓ Settings saved"); setTimeout(()=>setSavedMsg(""),2500); };

  // ── IMPORT ────────────────────────────────────────────────
  const importTrades = (file) => {
    if(!file)return;
    const reader=new FileReader();
    reader.onload=(e)=>{
      try {
        const imported=JSON.parse(e.target.result);
        if(!Array.isArray(imported))throw new Error("Invalid format");
        const existingIds=new Set(trades.map(t=>String(t.id)));
        const newTrades=imported.filter(t=>!existingIds.has(String(t.id)));
        const merged=[...newTrades,...trades].sort((a,b)=>b.date.localeCompare(a.date));
        pTrades(merged);
        setSavedMsg(`✓ Imported ${newTrades.length} trades (${imported.length-newTrades.length} duplicates skipped)`);
        setTimeout(()=>setSavedMsg(""),4000);
      } catch(err){ alert("Invalid file. Please upload a valid JSON import file."); }
    };
    reader.readAsText(file);
  };

  // ── DERIVED DATA ──────────────────────────────────────────
  const ALL_CHECKS = Object.values(checks).flat();
  const getMin = (sec) => { const v=sectionMins[sec]; return (v!==undefined&&v!==null) ? Number(v) : (checks[sec]?.length||0); };
  const getSectionChecked = (sec, si) => { const start=Object.values(checks).slice(0,si).flat().length; return checks[sec].filter((_,i)=>ck[start+i]).length; };
  const allGreen = Object.entries(checks).every(([sec],si) => getSectionChecked(sec,si) >= getMin(sec));
  const checkedCt = ALL_CHECKS.filter((_,i)=>ck[i]).length;
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
  const rcResult=(()=>{const e=parseFloat(rc.entry),s=parseFloat(rc.sl);if(!rc.entry||!rc.sl||isNaN(e)||isNaN(s))return null;const sl=Math.abs(e-s);if(!sl)return null;const dir=e>s?1:-1;return{risk:Math.round(rcRiskAmt),slDist:sl.toFixed(4),size:(rcRiskAmt/sl).toFixed(2),tp:(e+dir*sl*parseFloat(rc.rr)).toFixed(4)};})();
  const pnlCurve  =(list)=>{let c=0;return[...list].reverse().filter(t=>t.pnl!=="").map((t,i)=>{c+=parseFloat(t.pnl);return{n:i+1,v:Math.round(c)};});};
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
            <div style={h2sty}>Your Profiles</div>
            {userList.map(u=>(
              <div key={u} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px",borderRadius:"10px",background:CARD,border:`1px solid ${BOR}`,marginBottom:"8px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                  <div style={{width:"38px",height:"38px",borderRadius:"50%",background:MUT2,border:`1px solid ${BOR}`,display:"flex",alignItems:"center",justifyContent:"center",color:WHT,fontWeight:"700",fontSize:"15px"}}>{u.charAt(0).toUpperCase()}</div>
                  <span style={{color:WHT,fontSize:"15px"}}>{u}</span>
                </div>
                <div style={{display:"flex",gap:"8px"}}>
                  <button onClick={()=>loginUser(u)} style={btn({padding:"8px 18px",fontSize:"13px"})}>Login</button>
                  <button onClick={()=>deleteUser(u)} style={{background:"transparent",color:RD,border:`1px solid ${RD}`,padding:"8px 12px",borderRadius:"8px",cursor:"pointer",fontSize:"13px",minHeight:"44px"}}>Del</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={card()}>
          <div style={h2sty}>Create Profile</div>
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
  const renderDashboard = () => (
    <div>
      <div style={{marginBottom:"16px",color:MUT,fontSize:"15px"}}>Welcome back, <span style={{color:WHT,fontWeight:"700",fontSize:"17px"}}>{settings.traderName}</span></div>
      <div style={g4}>
        {[
          {label:"Today P&L",  val:fmt(todayPnl),        color:todayPnl>=0?GR:RD, sub:`Limit: ${fmt(settings.dailyLimit)}`},
          {label:"Weekly P&L", val:fmt(weekPnl),          color:weekPnl>=0?GR:RD,  sub:`Limit: ${fmt(settings.weeklyLimit)}`},
          {label:"Win Rate",   val:allSt.winRate+"%",     color:WHT,               sub:`${allSt.total} trades`},
          {label:"Profit Factor",val:allSt.pf,            color:WHT,               sub:`Avg RR: ${allSt.avgRR}`},
        ].map(x=>(
          <div key={x.label} style={{background:SURF,border:`1px solid ${BOR}`,borderRadius:"12px",padding:"16px",textAlign:"center"}}>
            <div style={{color:x.color,fontSize:M?"26px":"40px",fontWeight:"700",fontFamily:"monospace"}}>{x.val}</div>
            <div style={{color:MUT,fontSize:M?"12px":"14px",marginTop:"5px"}}>{x.label}</div>
            <div style={{color:MUT2,fontSize:M?"11px":"13px",marginTop:"3px"}}>{x.sub}</div>
          </div>
        ))}
      </div>
      <div style={{...g2,marginTop:"14px"}}>
        <div style={card()}>
          <div style={h2sty}>Loss Limits</div>
          {[{label:"Daily",used:Math.max(0,-todayPnl),limit:settings.dailyLimit},{label:"Weekly",used:Math.max(0,-weekPnl),limit:settings.weeklyLimit}].map(x=>{
            const pct=Math.min(100,(x.used/x.limit)*100);
            return(<div key={x.label} style={{marginBottom:"14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
                <span style={{color:MUT,fontSize:"13px"}}>{x.label}</span>
                <span style={{color:pct>80?RD:WHT,fontSize:"13px",fontFamily:"monospace"}}>{fmt(x.used)} / {fmt(x.limit)}</span>
              </div>
              <div style={{background:MUT2,borderRadius:"4px",height:"6px"}}>
                <div style={{background:pct>80?RD:WHT,width:`${pct}%`,height:"6px",borderRadius:"4px"}}/>
              </div>
            </div>);
          })}
        </div>
        <div style={card()}>
          <div style={h2sty}>Quick Stats</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
            {[{label:"Intraday Win %",val:idSt.winRate+"%"},{label:"Swing Win %",val:swSt.winRate+"%"},{label:"Intraday Trades",val:idSt.total},{label:"Swing Trades",val:swSt.total}].map(x=>(
              <div key={x.label} style={{background:CARD,borderRadius:"10px",padding:"12px"}}>
                <div style={{color:WHT,fontSize:M?"20px":"28px",fontWeight:"700",fontFamily:"monospace"}}>{x.val}</div>
                <div style={{color:MUT,fontSize:M?"12px":"13px",marginTop:"2px"}}>{x.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={card()}>
        <div style={{...h2sty,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span>Recent Trades</span><button onClick={()=>exportCSV(trades)} style={btn({padding:"6px 14px",fontSize:"11px"})}>⬇ CSV</button></div>
        {!trades.length?<div style={{color:MUT2,textAlign:"center",padding:"28px",fontSize:"13px"}}>No trades yet.</div>:
          <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
            <thead><tr style={{color:MUT,borderBottom:`1px solid ${BOR}`}}>{["Date","Instrument","Dir","Setup","P&L","Grade"].map(h=><th key={h} style={{padding:"8px 6px",textAlign:"left",fontWeight:"400",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
            <tbody>{trades.slice(0,6).map(t=>(
              <tr key={t.id} style={{borderBottom:`1px solid ${CARD}`}}>
                <td style={{padding:"8px 6px",color:MUT,whiteSpace:"nowrap"}}>{t.date}</td>
                <td style={{padding:"8px 6px",color:WHT}}>{t.instrument}</td>
                <td style={{padding:"8px 6px",color:t.direction==="Long"?GR:RD}}>{t.direction}</td>
                <td style={{padding:"8px 6px",color:MUT,fontSize:"11px"}}>{t.setup}</td>
                <td style={{padding:"8px 6px",fontFamily:"monospace",fontWeight:"700",color:parseFloat(t.pnl||0)>=0?GR:RD}}>{t.pnl?fmt(parseFloat(t.pnl)):"—"}</td>
                <td style={{padding:"8px 6px"}}><span style={{background:t.grade==="A+"?WHT+"22":CARD,color:t.grade==="A+"?WHT:MUT,padding:"2px 7px",borderRadius:"4px",fontSize:"11px"}}>{t.grade||"—"}</span></td>
              </tr>
            ))}</tbody>
          </table></div>}
      </div>
    </div>
  );

  // ── JOURNAL ───────────────────────────────────────────────
  const renderJournal = () => (
    <div>
      <div style={card()}>
        <div style={h2sty}>Log New Trade</div>
        {/* Instrument picker — pill buttons on mobile */}
        <div style={{marginBottom:"14px"}}>
          <div style={lbl}>Instrument</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
            {instruments.map(i=>(
              <button key={i} onClick={()=>setTf(f=>({...f,instrument:i}))}
                style={{background:tf.instrument===i?WHT:CARD,color:tf.instrument===i?BG:MUT,border:`1px solid ${tf.instrument===i?WHT:BOR}`,padding:"10px 14px",borderRadius:"8px",cursor:"pointer",fontSize:"13px",fontWeight:tf.instrument===i?"700":"400",minHeight:"44px"}}>
                {i}
              </button>
            ))}
          </div>
        </div>
        {/* Direction — big tap cards */}
        <div style={{marginBottom:"14px"}}>
          <div style={lbl}>Direction</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
            <button onClick={()=>setTf(f=>({...f,direction:"Long"}))}
              style={{background:tf.direction==="Long"?GR+"22":CARD,color:tf.direction==="Long"?GR:MUT,border:`2px solid ${tf.direction==="Long"?GR:BOR}`,padding:"14px",borderRadius:"10px",cursor:"pointer",fontSize:"15px",fontWeight:"700",minHeight:"52px"}}>
              ▲ Long
            </button>
            <button onClick={()=>setTf(f=>({...f,direction:"Short"}))}
              style={{background:tf.direction==="Short"?RD+"22":CARD,color:tf.direction==="Short"?RD:MUT,border:`2px solid ${tf.direction==="Short"?RD:BOR}`,padding:"14px",borderRadius:"10px",cursor:"pointer",fontSize:"15px",fontWeight:"700",minHeight:"52px"}}>
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
          <div><label style={lbl}>Entry Price</label><input type="number" style={inp()} value={tf.entry} onChange={e=>setTf(f=>({...f,entry:e.target.value}))}/></div>
          <div><label style={lbl}>Stop Loss</label><input type="number" style={inp()} value={tf.sl} onChange={e=>setTf(f=>({...f,sl:e.target.value}))}/></div>
          <div><label style={lbl}>Exit Price</label><input type="number" style={inp()} value={tf.exitPrice} onChange={e=>setTf(f=>({...f,exitPrice:e.target.value}))}/></div>
        </div>
        <div style={{...g3,marginTop:"10px"}}>
          <div><label style={lbl}>Position Size</label><input type="number" style={inp()} value={tf.size} onChange={e=>setTf(f=>({...f,size:e.target.value}))}/></div>
          <div><label style={lbl}>Risk (₹)</label><input type="number" style={inp()} value={tf.riskAmount} onChange={e=>setTf(f=>({...f,riskAmount:e.target.value}))}/></div>
          <div><label style={lbl}>P&L (₹)</label><input type="number" style={inp()} value={tf.pnl} onChange={e=>setTf(f=>({...f,pnl:e.target.value}))}/></div>
        </div>
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
                style={{flex:1,background:tf.grade===g?WHT:CARD,color:tf.grade===g?BG:MUT,border:`1px solid ${tf.grade===g?WHT:BOR}`,padding:"12px 0",borderRadius:"10px",cursor:"pointer",fontSize:"15px",fontWeight:"700",minHeight:"48px"}}>
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
                style={{flex:1,background:tf.followedRules===v?(v==="Yes"?GR+"22":v==="No"?RD+"22":WHT+"11"):CARD,color:tf.followedRules===v?(v==="Yes"?GR:v==="No"?RD:WHT):MUT,border:`1px solid ${tf.followedRules===v?(v==="Yes"?GR:v==="No"?RD:WHT):BOR}`,padding:"12px 0",borderRadius:"10px",cursor:"pointer",fontSize:"13px",fontWeight:tf.followedRules===v?"700":"400",minHeight:"44px"}}>
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
        <div style={{...h2sty,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span>History ({trades.length})</span><button onClick={()=>exportCSV(trades)} style={btn({padding:"6px 14px",fontSize:"11px"})}>⬇ CSV</button></div>
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
                <td style={{padding:"8px 6px",fontFamily:"monospace",fontWeight:"700",color:parseFloat(t.pnl||0)>=0?GR:RD}}>{t.pnl?fmt(parseFloat(t.pnl)):"—"}</td>
                <td style={{padding:"8px 6px",fontFamily:"monospace"}}>{t.rrAchieved||"—"}</td>
                <td style={{padding:"8px 6px"}}><span style={{background:t.grade==="A+"?WHT+"22":CARD,color:t.grade==="A+"?WHT:MUT,padding:"2px 7px",borderRadius:"4px",fontSize:"11px"}}>{t.grade||"—"}</span></td>
                <td style={{padding:"8px 6px"}}><button onClick={()=>deleteTrade(t.id)} style={{background:RD,color:WHT,border:"none",padding:"4px 10px",borderRadius:"6px",cursor:"pointer",fontSize:"11px",minHeight:"32px"}}>Del</button></td>
              </tr>
            ))}</tbody>
          </table></div>}
      </div>
    </div>
  );

  // ── CHECKLIST ─────────────────────────────────────────────
  const renderChecklist = () => {
    let idx=0;
    const totalRequired=Object.entries(checks).reduce((s,[sec])=>s+getMin(sec),0);
    const totalChecked=Object.entries(checks).reduce((s,[sec],si)=>s+getSectionChecked(sec,si),0);
    return(<div>
      <div style={{...card(),borderColor:allGreen?GR:BOR,textAlign:"center"}}>
        <div style={{color:allGreen?GR:WHT,fontSize:"36px",fontWeight:"700",fontFamily:"monospace"}}>{totalChecked} / {totalRequired}</div>
        <div style={{color:MUT,fontSize:"12px",marginBottom:"12px"}}>required checks completed</div>
        <div style={{background:MUT2,borderRadius:"4px",height:"6px"}}><div style={{background:allGreen?GR:WHT,width:`${Math.min(100,totalRequired?(totalChecked/totalRequired)*100:0)}%`,height:"6px",borderRadius:"4px",transition:"width 0.3s"}}/></div>
        {allGreen?<div style={{color:GR,marginTop:"12px",fontWeight:"700",fontSize:"14px"}}>✓ ALL CLEAR — READY TO TRADE</div>:<div style={{color:MUT,marginTop:"12px",fontSize:"13px"}}>Complete minimum checks in each section</div>}
      </div>
      {Object.entries(checks).map(([section,items],si)=>{
        const start=idx;idx+=items.length;
        const secChecked=getSectionChecked(section,si);
        const minReq=getMin(section);
        const secDone=secChecked>=minReq;
        return(<div key={section} style={{...card(),borderLeft:`3px solid ${secDone?GR:BOR}`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"10px",gap:"10px",flexWrap:"wrap"}}>
            <div style={h2sty}>{section}</div>
            <div style={{display:"flex",alignItems:"center",gap:"8px",flexShrink:0}}>
              <span style={{color:secDone?GR:MUT,fontSize:"12px",fontFamily:"monospace",fontWeight:"700"}}>{secChecked}/{items.length}</span>
              <div style={{display:"flex",alignItems:"center",gap:"5px",background:CARD,border:`1px solid ${BOR}`,borderRadius:"8px",padding:"5px 10px"}}>
                <span style={{color:MUT,fontSize:"11px"}}>Min:</span>
                <input type="number" min="0" max={items.length} value={minReq}
                  onChange={e=>{const val=Math.min(items.length,Math.max(0,parseInt(e.target.value)||0));const u={...sectionMins,[section]:val};setSectionMins(u);lsSet(uk("sectionMins"),u);}}
                  style={{width:"36px",background:"transparent",border:"none",color:WHT,fontSize:"13px",fontWeight:"700",textAlign:"center",outline:"none"}}/>
                <span style={{color:MUT,fontSize:"11px"}}>/ {items.length}</span>
              </div>
              {secDone&&<span style={{color:GR,fontSize:"16px"}}>✓</span>}
            </div>
          </div>
          <div style={{background:MUT2,borderRadius:"3px",height:"3px",marginBottom:"10px"}}>
            <div style={{background:secDone?GR:WHT,width:`${(secChecked/items.length)*100}%`,height:"3px",borderRadius:"3px",transition:"width 0.2s"}}/>
          </div>
          {items.map((item,i)=>{const gi=start+i,checked=!!ck[gi];return(
            <div key={item} onClick={()=>setCk(c=>({...c,[gi]:!c[gi]}))}
              style={{display:"flex",alignItems:"center",gap:"12px",padding:"13px",borderRadius:"10px",cursor:"pointer",marginBottom:"6px",background:checked?"#001a0d":CARD,border:`1px solid ${checked?GR:BOR}`,minHeight:"50px"}}>
              <div style={{width:"22px",height:"22px",borderRadius:"5px",flexShrink:0,border:`2px solid ${checked?GR:MUT2}`,background:checked?GR:"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                {checked&&<span style={{color:BG,fontSize:"13px",fontWeight:"900"}}>✓</span>}
              </div>
              <span style={{color:checked?WHT:MUT,fontSize:"14px",lineHeight:"1.4"}}>{item}</span>
            </div>
          );})}
        </div>);
      })}
      <button style={btnGh({marginBottom:"20px",width:"100%"})} onClick={()=>setCk({})}>Reset Checklist</button>
    </div>);
  };

  // ── RISK CALC ─────────────────────────────────────────────
  const renderRisk = () => (
    <div>
      <div style={card()}>
        <div style={h2sty}>Position Size Calculator</div>
        <div style={g2}>
          <div><label style={lbl}>Capital (₹)</label><input type="number" style={inp()} value={rc.capital} onChange={e=>setRc(r=>({...r,capital:parseFloat(e.target.value)||0}))}/></div>
          <div><label style={lbl}>Target R:R</label><select style={sel()} value={rc.rr} onChange={e=>setRc(r=>({...r,rr:e.target.value}))}>{["1.5","2","2.5","3","4","5"].map(v=><option key={v} value={v}>1:{v}</option>)}</select></div>
        </div>
        <div style={{marginTop:"12px"}}>
          <div style={lbl}>Risk Type</div>
          <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
            {[["base",`Base Risk — ${settings.baseRisk}%`],["major",`Major Level — ${settings.majorRisk}%`],["drawdown",`In Drawdown — ${settings.drawdownRisk}%`]].map(([v,l])=>(
              <button key={v} onClick={()=>setRc(r=>({...r,riskType:v}))}
                style={{background:rc.riskType===v?WHT:CARD,color:rc.riskType===v?BG:MUT,border:`1px solid ${rc.riskType===v?WHT:BOR}`,padding:"12px 16px",borderRadius:"10px",cursor:"pointer",fontSize:"13px",textAlign:"left",fontWeight:rc.riskType===v?"700":"400",minHeight:"44px"}}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div style={{...g2,marginTop:"12px"}}>
          <div><label style={lbl}>Entry Price</label><input type="number" style={inp()} value={rc.entry} onChange={e=>setRc(r=>({...r,entry:e.target.value}))}/></div>
          <div><label style={lbl}>Stop Loss</label><input type="number" style={inp()} value={rc.sl} onChange={e=>setRc(r=>({...r,sl:e.target.value}))}/></div>
        </div>
        <div style={{marginTop:"12px",padding:"14px",background:CARD,borderRadius:"10px",display:"flex",alignItems:"center",gap:"12px"}}>
          <span style={{color:MUT,fontSize:"13px"}}>Risk amount:</span>
          <span style={{color:RD,fontSize:"20px",fontWeight:"700",fontFamily:"monospace"}}>{fmt(Math.round(rcRiskAmt))}</span>
        </div>
        {rcResult&&(
          <div style={{...g2,marginTop:"12px"}}>
            {[{label:"Risk Amount",val:fmt(rcResult.risk),color:RD},{label:"SL Distance",val:rcResult.slDist+" pts",color:MUT},{label:"Position Size",val:rcResult.size+" units",color:WHT},{label:"Target Price",val:rcResult.tp,color:GR}].map(x=>(
              <div key={x.label} style={{background:CARD,borderRadius:"10px",padding:"14px",textAlign:"center"}}>
                <div style={{color:x.color,fontSize:"18px",fontWeight:"700",fontFamily:"monospace"}}>{x.val}</div>
                <div style={{color:MUT,fontSize:"10px",marginTop:"5px"}}>{x.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={card()}>
        <div style={h2sty}>SL Management Rules</div>
        <div style={g2}>
          {[{type:"Intraday",rules:["Enter on breakout or retest","Move SL to B/E at 1:1.5 R","Exit at 1:2 R:R",`Max ${settings.maxIntraday} trades/day`]},{type:"Swing / Positional",rules:["Move SL 50% closer at 1:1","Move SL to B/E at 1:2","Scale out at each S/R","Trail final position"]}].map(x=>(
            <div key={x.type} style={{background:CARD,borderRadius:"10px",padding:"14px"}}>
              <div style={{color:WHT,fontSize:"11px",fontWeight:"700",marginBottom:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>{x.type}</div>
              {x.rules.map((r,i)=><div key={i} style={{display:"flex",gap:"8px",marginBottom:"8px"}}><span style={{color:WHT}}>→</span><span style={{color:MUT,fontSize:"13px"}}>{r}</span></div>)}
            </div>
          ))}
        </div>
      </div>
      <div style={card()}>
        <div style={h2sty}>Loss Limits</div>
        <div style={g3}>
          {[{label:"Daily",val:fmt(settings.dailyLimit)},{label:"Weekly",val:fmt(settings.weeklyLimit)},{label:"Monthly",val:fmt(settings.monthlyLimit)}].map(x=>(
            <div key={x.label} style={{background:CARD,borderRadius:"10px",padding:"14px",textAlign:"center"}}>
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
        <div style={h2sty}>Trade Plan Builder</div>
        <div style={g2}>
          <div><label style={lbl}>Date</label><input type="date" style={inp()} value={pf.date} onChange={e=>setPf(f=>({...f,date:e.target.value}))}/></div>
          <div><label style={lbl}>Grade</label><select style={sel()} value={pf.grade} onChange={e=>setPf(f=>({...f,grade:e.target.value}))}>{GRADES.map(g=><option key={g}>{g}</option>)}</select></div>
        </div>
        <div style={{marginTop:"12px"}}>
          <div style={lbl}>Instrument</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
            {instruments.map(i=>(
              <button key={i} onClick={()=>setPf(f=>({...f,instrument:i}))}
                style={{background:pf.instrument===i?WHT:CARD,color:pf.instrument===i?BG:MUT,border:`1px solid ${pf.instrument===i?WHT:BOR}`,padding:"10px 14px",borderRadius:"8px",cursor:"pointer",fontSize:"13px",fontWeight:pf.instrument===i?"700":"400",minHeight:"44px"}}>
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
                style={{flex:1,background:pf.bias===b?col+"22":CARD,color:pf.bias===b?col:MUT,border:`2px solid ${pf.bias===b?col:BOR}`,padding:"12px",borderRadius:"10px",cursor:"pointer",fontSize:"14px",fontWeight:pf.bias===b?"700":"400",minHeight:"52px"}}>
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
        <div style={h2sty}>Rules Quick Reference</div>
        <div style={g2}>
          {[{title:"Green Light ✅",color:GR,items:["Daily + TF aligned","Pattern obvious",`Min 1:${settings.minRR} R:R`,"Clear S/R level","SL behind structure"]},{title:"Red Flags 🚫",color:RD,items:["No clear structure","FOMO trade","SL too wide","Loss limit hit","Emotionally off"]}].map(x=>(
            <div key={x.title} style={{background:CARD,borderRadius:"10px",padding:"14px"}}>
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
          <div style={h2sty}>All Trades</div>
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
            <div key={x.label} style={{background:SURF,border:`1px solid ${BOR}`,borderRadius:"10px",padding:"12px",textAlign:"center"}}>
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
                      {["Date","Instrument","Type","Direction","Setup","Entry","Exit","P&L","R:R","Grade","Rules","Emotion",""].map(h=>(
                        <th key={h} style={{padding:"8px 6px",textAlign:"left",fontWeight:"400",whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(t=>(
                      <tr key={t.id} style={{borderBottom:`1px solid ${CARD}`}}>
                        <td style={{padding:"8px 6px",color:MUT,whiteSpace:"nowrap"}}>{t.date}</td>
                        <td style={{padding:"8px 6px",color:WHT,whiteSpace:"nowrap"}}>{t.instrument}</td>
                        <td style={{padding:"8px 6px",color:MUT,whiteSpace:"nowrap"}}>{t.tradeType}</td>
                        <td style={{padding:"8px 6px",color:t.direction==="Long"?GR:RD}}>{t.direction}</td>
                        <td style={{padding:"8px 6px",color:MUT,fontSize:"11px",maxWidth:"120px",overflow:"hidden"}}>{t.setup}</td>
                        <td style={{padding:"8px 6px",fontFamily:"monospace"}}>{t.entry||"—"}</td>
                        <td style={{padding:"8px 6px",fontFamily:"monospace"}}>{t.exitPrice||"—"}</td>
                        <td style={{padding:"8px 6px",fontFamily:"monospace",fontWeight:"700",color:parseFloat(t.pnl||0)>=0?GR:RD}}>{t.pnl?fmt(parseFloat(t.pnl)):"—"}</td>
                        <td style={{padding:"8px 6px",fontFamily:"monospace"}}>{t.rrAchieved||"—"}</td>
                        <td style={{padding:"8px 6px"}}>
                          <span style={{background:t.grade==="A+"?WHT+"22":CARD,color:t.grade==="A+"?WHT:MUT,padding:"2px 7px",borderRadius:"4px",fontSize:"11px"}}>{t.grade||"—"}</span>
                        </td>
                        <td style={{padding:"8px 6px",color:t.followedRules==="Yes"?GR:t.followedRules==="No"?RD:MUT,fontSize:"11px"}}>{t.followedRules||"—"}</td>
                        <td style={{padding:"8px 6px",color:MUT,fontSize:"11px"}}>{t.emotion||"—"}</td>
                        <td style={{padding:"8px 6px"}}>
                          <button onClick={()=>deleteTrade(t.id)} style={{background:RD,color:WHT,border:"none",padding:"4px 10px",borderRadius:"6px",cursor:"pointer",fontSize:"11px",minHeight:"32px"}}>Del</button>
                        </td>
                      </tr>
                    ))}
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
          <button key={k} onClick={()=>setAtab(k)} style={{flex:1,background:atab===k?WHT:CARD,color:atab===k?BG:MUT,border:`1px solid ${atab===k?WHT:BOR}`,padding:"12px",borderRadius:"10px",cursor:"pointer",fontSize:"13px",fontWeight:atab===k?"700":"400",minHeight:"44px"}}>{l}</button>
        ))}
      </div>
      <div style={g4}>
        {[{label:"Win Rate",val:st.winRate+"%",color:WHT},{label:"Total P&L",val:fmt(st.pnl),color:st.pnl>=0?GR:RD},{label:"Avg R:R",val:st.avgRR,color:WHT},{label:"Profit Factor",val:st.pf,color:WHT}].map(x=>(
          <div key={x.label} style={{background:SURF,border:`1px solid ${BOR}`,borderRadius:"12px",padding:"14px",textAlign:"center"}}>
            <div style={{color:x.color,fontSize:M?"18px":"22px",fontWeight:"700",fontFamily:"monospace"}}>{x.val}</div>
            <div style={{color:MUT,fontSize:"10px",marginTop:"3px"}}>{x.label}</div>
          </div>
        ))}
      </div>
      <div style={{...card(),marginTop:"14px"}}>
        <div style={h2sty}>P&L Curve</div>
        {curve.length>0?<ResponsiveContainer width="100%" height={200}><LineChart data={curve}><XAxis dataKey="n" stroke={MUT2} tick={{fill:MUT,fontSize:10}}/><YAxis stroke={MUT2} tick={{fill:MUT,fontSize:10}} tickFormatter={v=>fmt(v)}/><Tooltip contentStyle={ttSty} labelStyle={ttLabel} itemStyle={ttItem} formatter={v=>[fmt(v),"Cumulative P&L"]}/><Line type="monotone" dataKey="v" stroke={WHT} strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer>:noData}
      </div>
      <div style={g2}>
        <div style={card()}>
          <div style={h2sty}>By Instrument</div>
          {iData.length>0?<ResponsiveContainer width="100%" height={190}><BarChart data={iData} margin={{left:10}}><XAxis dataKey="name" stroke={MUT2} tick={{fill:MUT,fontSize:9}}/><YAxis stroke={MUT2} tick={{fill:MUT,fontSize:9}}/><Tooltip contentStyle={ttSty} labelStyle={ttLabel} itemStyle={ttItem} formatter={v=>[fmt(v),"P&L"]}/><Bar dataKey="v" radius={[3,3,0,0]}>{iData.map((d,i)=><Cell key={i} fill={d.v>=0?GR:RD}/>)}</Bar></BarChart></ResponsiveContainer>:noData}
        </div>
        <div style={card()}>
          <div style={h2sty}>By Grade</div>
          {gData.some(d=>d.n>0)?<ResponsiveContainer width="100%" height={190}><BarChart data={gData} margin={{left:10}}><XAxis dataKey="g" stroke={MUT2} tick={{fill:MUT,fontSize:12}}/><YAxis stroke={MUT2} tick={{fill:MUT,fontSize:9}}/><Tooltip contentStyle={ttSty} labelStyle={ttLabel} itemStyle={ttItem} formatter={v=>[fmt(v),"P&L"]}/><Bar dataKey="v" radius={[3,3,0,0]}>{gData.map((d,i)=><Cell key={i} fill={d.v>=0?GR:RD}/>)}</Bar></BarChart></ResponsiveContainer>:noData}
        </div>
      </div>
      <div style={g2}>
        <div style={card()}>
          <div style={h2sty}>Emotion vs P&L</div>
          {eData.length>0?<ResponsiveContainer width="100%" height={190}><BarChart data={eData} margin={{left:10}}><XAxis dataKey="e" stroke={MUT2} tick={{fill:MUT,fontSize:10}}/><YAxis stroke={MUT2} tick={{fill:MUT,fontSize:9}}/><Tooltip contentStyle={ttSty} labelStyle={ttLabel} itemStyle={ttItem} formatter={v=>[fmt(v),"P&L"]}/><Bar dataKey="v" radius={[3,3,0,0]}>{eData.map((d,i)=><Cell key={i} fill={d.v>=0?GR:RD}/>)}</Bar></BarChart></ResponsiveContainer>:noData}
        </div>
        <div style={card()}>
          <div style={h2sty}>Best & Worst Setups</div>
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
          <button key={k} onClick={()=>{setRtab(k);setRf(emptyReview(k));}} style={{flex:1,background:rtab===k?WHT:CARD,color:rtab===k?BG:MUT,border:`1px solid ${rtab===k?WHT:BOR}`,padding:"12px",borderRadius:"10px",cursor:"pointer",fontSize:"13px",fontWeight:rtab===k?"700":"400",minHeight:"44px"}}>{l}</button>
        ))}
      </div>
      <div style={card()}>
        <div style={h2sty}>Write {rtab.charAt(0).toUpperCase()+rtab.slice(1)} Review</div>
        <div style={g2}>
          <div><label style={lbl}>Date</label><input type="date" style={inp()} value={rf.date} onChange={e=>setRf(f=>({...f,date:e.target.value}))}/></div>
          <div>
            <div style={lbl}>Mental State</div>
            <div style={{display:"flex",gap:"5px",flexWrap:"wrap"}}>
              {MENTAL.map(m=>(
                <button key={m} onClick={()=>setRf(f=>({...f,mentalState:m}))}
                  style={{background:rf.mentalState===m?mentalColor(m):CARD,color:rf.mentalState===m?BG:MUT,border:`1px solid ${rf.mentalState===m?mentalColor(m):BOR}`,padding:"8px 10px",borderRadius:"8px",cursor:"pointer",fontSize:"12px",fontWeight:rf.mentalState===m?"700":"400",minHeight:"44px"}}>
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
            <div key={r.id} style={{background:CARD,borderRadius:"10px",padding:"14px",marginBottom:"10px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
                <span style={{color:WHT,fontSize:"13px",fontWeight:"700"}}>{r.date}</span>
                <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
                  <span style={{background:`${mentalColor(r.mentalState)}22`,color:mentalColor(r.mentalState),padding:"3px 10px",borderRadius:"20px",fontSize:"11px",fontWeight:"700"}}>{r.mentalState}</span>
                  <button onClick={()=>deleteReview(r.id)} style={{background:"transparent",color:MUT,border:`1px solid ${BOR}`,padding:"4px 8px",borderRadius:"5px",cursor:"pointer",fontSize:"11px",minHeight:"32px"}}>Del</button>
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
          <div style={h2sty}>Mental State Trend</div>
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
            <div style={h2sty}>{title}</div>
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
            <div style={h2sty}>✅ Pre-Trade Checklist</div>
            <button onClick={()=>{pList("checks",DEF_CHECKS,setChecks);setCk({});}} style={btnGh({padding:"6px 12px",fontSize:"11px"})}>Reset</button>
          </div>
          {Object.entries(checks).map(([section,items])=>(
            <div key={section} style={{background:CARD,borderRadius:"10px",padding:"14px",marginBottom:"10px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
                <span style={{color:WHT,fontSize:"12px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"1px"}}>{section}</span>
                <button onClick={()=>delSection(section)} style={{background:"transparent",color:RD,border:`1px solid ${RD}`,padding:"4px 10px",borderRadius:"6px",cursor:"pointer",fontSize:"11px",minHeight:"32px"}}>Delete</button>
              </div>
              {items.map(item=>(
                <div key={item} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",borderRadius:"8px",background:SURF,marginBottom:"5px",gap:"10px",minHeight:"44px"}}>
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
          <div style={{marginTop:"12px",padding:"14px",background:CARD,borderRadius:"10px"}}>
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
          <div style={{color:WHT,fontSize:"13px",fontWeight:"700"}}>Customize Your System</div>
          <div style={{color:MUT,fontSize:"12px",marginTop:"4px"}}>Changes apply instantly across the entire app</div>
        </div>

        {/* Tab Order */}
        <div style={{...card(),borderLeft:`2px solid ${BOR}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
            <div style={h2sty}>Tab Order</div>
            <button onClick={resetTabOrder} style={btnGh({padding:"6px 12px",fontSize:"11px"})}>Reset</button>
          </div>
          <div style={{color:MUT2,fontSize:"11px",marginBottom:"12px"}}>First 4 tabs appear in the bottom bar on mobile. Drag order determines what you see first.</div>
          {tabOrder.map((key, idx) => {
            const t = TAB_DEFS.find(x=>x.key===key);
            if (!t) return null;
            return (
              <div key={key} style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 12px",borderRadius:"10px",background:CARD,border:`1px solid ${BOR}`,marginBottom:"6px"}}>
                <span style={{color:MUT,fontSize:"12px",fontFamily:"monospace",minWidth:"20px"}}>{idx+1}</span>
                <span style={{color:WHT,fontSize:"14px"}}>{t.icon}</span>
                <span style={{color:WHT,fontSize:"14px",flex:1}}>{t.label}</span>
                {idx < 4 && <span style={{background:WHT+"22",color:WHT,fontSize:"10px",padding:"2px 8px",borderRadius:"4px"}}>Bottom nav</span>}
                <div style={{display:"flex",gap:"4px"}}>
                  <button onClick={()=>moveTab(key,-1)} disabled={idx===0}
                    style={{background:idx===0?MUT2:CARD,color:idx===0?BOR:WHT,border:`1px solid ${BOR}`,width:"32px",height:"32px",borderRadius:"6px",cursor:idx===0?"default":"pointer",fontSize:"14px",display:"flex",alignItems:"center",justifyContent:"center"}}>↑</button>
                  <button onClick={()=>moveTab(key,1)} disabled={idx===tabOrder.length-1}
                    style={{background:idx===tabOrder.length-1?MUT2:CARD,color:idx===tabOrder.length-1?BOR:WHT,border:`1px solid ${BOR}`,width:"32px",height:"32px",borderRadius:"6px",cursor:idx===tabOrder.length-1?"default":"pointer",fontSize:"14px",display:"flex",alignItems:"center",justifyContent:"center"}}>↓</button>
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
    return(<div>
      {savedMsg&&<div style={{background:"#001a0d",border:`1px solid ${GR}`,borderRadius:"10px",padding:"12px 16px",marginBottom:"14px",color:GR,fontSize:"13px",fontWeight:"700"}}>{savedMsg}</div>}
      {/* Profile */}
      <div style={{...card(),borderLeft:`2px solid ${BOR}`}}>
        <div style={h2sty}>👤 Profile</div>
        <div style={g2}>
          <div><label style={lbl}>Trader Name</label><input type="text" style={inp()} value={draft.traderName} onChange={e=>setDraft(d=>({...d,traderName:e.target.value}))}/></div>
          <div style={{display:"flex",alignItems:"center"}}>
            <div style={{background:CARD,borderRadius:"10px",padding:"12px",display:"flex",alignItems:"center",gap:"12px",width:"100%"}}>
              <div style={{width:"40px",height:"40px",borderRadius:"50%",background:MUT2,border:`1px solid ${BOR}`,display:"flex",alignItems:"center",justifyContent:"center",color:WHT,fontWeight:"700",fontSize:"16px",flexShrink:0}}>{activeUser.charAt(0).toUpperCase()}</div>
              <div><div style={{color:WHT,fontSize:"14px",fontWeight:"700"}}>{activeUser}</div><div style={{color:MUT,fontSize:"11px"}}>Active profile</div></div>
            </div>
          </div>
        </div>
      </div>
      {/* Capital */}
      <div style={{...card(),borderLeft:`2px solid ${BOR}`}}>
        <div style={h2sty}>💰 Capital & Risk</div>
        <div style={g2}>{nf("Total Capital (₹)","capital",1000)}</div>
        <div style={{...g3,marginTop:"10px"}}>
          {nf("Base Risk %","baseRisk",0.01)}
          {nf("Major Level %","majorRisk",0.01)}
          {nf("Drawdown %","drawdownRisk",0.01)}
        </div>
        <div style={{marginTop:"12px",padding:"12px",background:CARD,borderRadius:"10px"}}>
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
        <div style={h2sty}>🚨 Loss Limits</div>
        <div style={g3}>{nf("Daily Max (₹)","dailyLimit",500)}{nf("Weekly Max (₹)","weeklyLimit",1000)}{nf("Monthly Max (₹)","monthlyLimit",5000)}</div>
      </div>
      {/* Trade Rules */}
      <div style={{...card(),borderLeft:`2px solid ${BOR}`}}>
        <div style={h2sty}>📋 Trade Rules</div>
        <div style={g2}>{nf("Max Intraday Trades/Day","maxIntraday",1)}{nf("Minimum R:R","minRR",0.5)}</div>
      </div>
      {/* Checklist Requirements */}
      <div style={{...card(),borderLeft:`2px solid ${BOR}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
          <div style={h2sty}>✅ Checklist Requirements</div>
          <button onClick={()=>{setSectionMins({});lsSet(uk("sectionMins"),{});}} style={btnGh({padding:"6px 12px",fontSize:"11px"})}>Reset All</button>
        </div>
        <div style={{color:MUT,fontSize:"12px",marginBottom:"14px"}}>Set the minimum number of items you must tick in each section before you can trade. Leave at max to require all.</div>
        {Object.entries(checks).map(([section,items],si)=>{
          const minReq = getMin(section);
          const pct    = (minReq/items.length)*100;
          return(
            <div key={section} style={{background:CARD,borderRadius:"10px",padding:"14px",marginBottom:"10px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"10px",gap:"10px",flexWrap:"wrap"}}>
                <span style={{color:WHT,fontSize:"13px",fontWeight:"600"}}>{section}</span>
                <span style={{color:MUT,fontSize:"11px"}}>{items.length} items total</span>
              </div>

              {/* Visual slider row */}
              <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"10px"}}>
                <span style={{color:MUT,fontSize:"12px",minWidth:"12px"}}>0</span>
                <div style={{flex:1,position:"relative",height:"24px",display:"flex",alignItems:"center"}}>
                  <div style={{width:"100%",background:MUT2,borderRadius:"4px",height:"6px"}}>
                    <div style={{background:GR,width:`${pct}%`,height:"6px",borderRadius:"4px",transition:"width 0.2s"}}/>
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
                    <div key={i} style={{width:"10px",height:"10px",borderRadius:"50%",background:i<minReq?GR:MUT2,transition:"background 0.15s"}}/>
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
                    style={{flex:1,background:minReq===p.val?WHT:CARD,color:minReq===p.val?BG:MUT,border:`1px solid ${minReq===p.val?WHT:BOR}`,padding:"6px 0",borderRadius:"7px",cursor:"pointer",fontSize:"11px",fontWeight:minReq===p.val?"700":"400",minHeight:"32px"}}>
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
        <div style={h2sty}>📥 Import Trades</div>
        <div style={{color:MUT,fontSize:"12px",marginBottom:"12px"}}>Import your Zerodha tradebook JSON. Duplicate trades are automatically skipped.</div>
        <label style={{display:"block",background:CARD,border:`2px dashed ${BOR}`,borderRadius:"10px",padding:"20px",textAlign:"center",cursor:"pointer"}}>
          <div style={{color:WHT,fontSize:"14px",fontWeight:"700",marginBottom:"4px"}}>📁 Choose JSON file</div>
          <div style={{color:MUT,fontSize:"12px"}}>zerodha_trades_import.json</div>
          <input type="file" accept=".json" style={{display:"none"}} onChange={e=>importTrades(e.target.files[0])}/>
        </label>
      </div>
      {/* Export */}
      <div style={{...card(),borderLeft:`2px solid ${BOR}`}}>
        <div style={h2sty}>📤 Export Data</div>
        <div style={{display:"flex",gap:"10px",flexWrap:"wrap"}}>
          <button onClick={()=>exportCSV(trades)} style={{...btn(),flex:1}}>⬇ Trades CSV ({trades.length})</button>
          <button onClick={()=>exportReviewsCSV(reviews)} style={{...btn(),flex:1}}>⬇ Reviews CSV ({reviews.length})</button>
        </div>
      </div>
      {/* Profiles */}
      <div style={{...card(),borderLeft:`2px solid ${BOR}`}}>
        <div style={h2sty}>👥 All Profiles</div>
        <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginBottom:"14px"}}>
          {userList.map(u=>(
            <div key={u} style={{display:"flex",alignItems:"center",gap:"8px",background:CARD,borderRadius:"10px",padding:"10px 14px",border:`1px solid ${u===activeUser?WHT:BOR}`}}>
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
            <button key={x.label} onClick={x.fn} style={{background:"transparent",color:RD,border:`1px solid ${RD}`,padding:"10px 16px",borderRadius:"10px",cursor:"pointer",fontSize:"13px",minHeight:"44px"}}>{x.label}</button>
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
          style={{flex:"1 1 40%",background:tab===t.key?WHT:CARD,color:tab===t.key?BG:MUT,border:`1px solid ${tab===t.key?WHT:BOR}`,padding:"12px",borderRadius:"10px",cursor:"pointer",fontSize:"13px",fontWeight:tab===t.key?"700":"400",minHeight:"44px",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px"}}>
          {t.icon} {t.label}
        </button>
      ))}
    </div>
  );

  // ── ROOT ──────────────────────────────────────────────────
  return (
    <div style={{background:BG,minHeight:"100vh",color:WHT,fontFamily:"-apple-system,sans-serif"}}>

      {/* DESKTOP TOP NAV */}
      {!M && (
        <div style={{background:SURF,borderBottom:`1px solid ${BOR}`,padding:"12px 20px",display:"flex",alignItems:"center",gap:"16px",flexWrap:"wrap",position:"sticky",top:0,zIndex:50}}>
          <div style={{color:WHT,fontFamily:"monospace",fontSize:"16px",fontWeight:"700",letterSpacing:"3px",whiteSpace:"nowrap"}}>TOP 1%</div>
          <div style={{display:"flex",gap:"4px",flexWrap:"wrap",flex:1}}>
            {ALL_TABS.map(t=>(
              <button key={t.key} onClick={()=>setTab(t.key)}
                style={{background:tab===t.key?WHT:"transparent",color:tab===t.key?BG:MUT,border:`1px solid ${tab===t.key?WHT:BOR}`,padding:"6px 14px",borderRadius:"7px",cursor:"pointer",fontSize:"12px",fontWeight:tab===t.key?"700":"400"}}>
                {t.label}
              </button>
            ))}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
            <div style={{width:"28px",height:"28px",borderRadius:"50%",background:MUT2,border:`1px solid ${BOR}`,display:"flex",alignItems:"center",justifyContent:"center",color:WHT,fontWeight:"700",fontSize:"12px"}}>{activeUser.charAt(0).toUpperCase()}</div>
            <span style={{color:MUT,fontSize:"12px"}}>{activeUser}</span>
            <button onClick={switchUser} style={{background:"transparent",color:MUT,border:`1px solid ${BOR}`,padding:"4px 10px",borderRadius:"6px",cursor:"pointer",fontSize:"11px"}}>Switch</button>
          </div>
        </div>
      )}

      {/* MOBILE TOP BAR */}
      {M && (
        <div style={{background:SURF,borderBottom:`1px solid ${BOR}`,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50}}>
          <div style={{color:WHT,fontFamily:"monospace",fontSize:"16px",fontWeight:"700",letterSpacing:"3px"}}>TOP 1%</div>
          <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
            <span style={{color:MUT,fontSize:"12px"}}>{settings.traderName}</span>
            <div style={{width:"30px",height:"30px",borderRadius:"50%",background:MUT2,border:`1px solid ${BOR}`,display:"flex",alignItems:"center",justifyContent:"center",color:WHT,fontWeight:"700",fontSize:"13px"}}>{activeUser.charAt(0).toUpperCase()}</div>
          </div>
        </div>
      )}

      {/* PAGE CONTENT */}
      <div style={{padding:M?"12px":"20px",maxWidth:M?"100%":"1100px",margin:"0 auto",paddingBottom:M?"90px":"20px"}}>
        {renderTab()}
      </div>

      {/* MORE OVERLAY */}
      {M && showMore && <MoreOverlay/>}

      {/* MOBILE BOTTOM NAV */}
      {M && (
        <div style={{position:"fixed",bottom:0,left:0,right:0,background:SURF,borderTop:`1px solid ${BOR}`,display:"flex",zIndex:99,paddingBottom:"env(safe-area-inset-bottom)"}}>
          {BOT_TABS.map(t=>(
            <button key={t.key} onClick={()=>{navTo(t.key);setShowMore(false);}}
              style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",padding:"10px 0",background:"transparent",border:"none",cursor:"pointer",color:tab===t.key?WHT:MUT,minHeight:"60px"}}>
              <span style={{fontSize:"20px",lineHeight:1}}>{t.icon}</span>
              <span style={{fontSize:"9px",fontWeight:tab===t.key?"700":"400"}}>{t.label}</span>
            </button>
          ))}
          <button onClick={()=>setShowMore(s=>!s)}
            style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",padding:"10px 0",background:"transparent",border:"none",cursor:"pointer",color:showMore||MORE_TABS.some(t=>t.key===tab)?WHT:MUT,minHeight:"60px"}}>
            <span style={{fontSize:"20px",lineHeight:1}}>⋯</span>
            <span style={{fontSize:"9px",fontWeight:showMore?"700":"400"}}>More</span>
          </button>
        </div>
      )}

    </div>
  );
}
