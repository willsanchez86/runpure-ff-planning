"use strict";
/* ==========================================================================
   Fantasy Workbench — Phase 1 prototype app
   Client-side nav between: Sign in · Players · Player card · NFL
   plus a dev-only state switcher for the 7 required UI states.
   Depends on window.FFW (data.js), loaded first.
   ========================================================================== */
const F = window.FFW;
const {TEAMS,TEAM,ABBRS,PLAYERS,WEEKS,PLAYED,CUR,SEASON,SEASON_WEEKS,OPP,BYE,SCHEDULE}=F;

/* ------------------------------------------------------------- tiny helpers */
const $ = (sel,root=document)=>root.querySelector(sel);
const $$ = (sel,root=document)=>[...root.querySelectorAll(sel)];
const esc = s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const f1 = x=>x==null||x===""||Number.isNaN(x)?"—":(+x).toFixed(1);
const ord = n=>n+(["th","st","nd","rd"][(n%100-20)%10]||["th","st","nd","rd"][n%100]||"th");
const mean = a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
const sdev = a=>{if(a.length<2)return 0;const m=mean(a);return Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/(a.length-1))};
const sum = a=>a.reduce((x,y)=>x+y,0);
const DEF_POS=["DB","DL","LB"];
const isIDP = p=>DEF_POS.includes(p.pos||p);

/* avatar (placeholder headshot): initials on a hue-derived disc, no remote image */
function avatarBg(p){return `hsl(${p.headshotHue},44%,60%)`}
function initials(p){
  if(p.pos==="DEF")return p.team;
  const parts=p.name.split(" ");return (parts[0][0]+(parts[1]?parts[1][0]:"")).toUpperCase();
}

/* ------------------------------------------------------------- persisted state */
const DEFAULTS={
  fmt:"ppr", tePrem:false, ptd6:false, compact:false, range:"season",
  posFilter:"ALL", teamFilter:"ALL", injFilter:"ALL", byeFilter:"ALL", minGp:0, query:"",
  cols:["total","avg","last3","sd","snap","tgt","opp","trend"],
  colsK:["total","avg","last3","k_fgm","k_fgpct","k_lng50","k_xpm","opp"],
  colsDEF:["total","avg","last3","d_sk","d_int","d_fr","d_td","d_pa","opp"],
  colsIDP:["total","avg","last3","i_tkl","i_sk","i_int","i_pd","snap","opp"],
  sort:["avg",-1],
};
const S = Object.assign({},DEFAULTS,(()=>{try{return JSON.parse(localStorage.getItem("ffwb-p1")||"{}")}catch(e){return{}}})());
function save(){try{localStorage.setItem("ffwb-p1",JSON.stringify(S))}catch(e){}}

/* ephemeral UI state (not persisted) */
const U = {
  screen: location.hash.replace("#","")||"players",  // players | nfl
  appState: "normal",   // normal|signedout|noaccount|loading|nomatches|sparse|stale|error
  signedIn: true,
  limit: 40,
  ticked: [],           // player ids ticked for compare (designed-for)
  cardId: null,         // open player card
  cardSeason: SEASON,
  nflWeek: CUR,
  nflPhase: "reg",      // reg | pre | post (sample data only fills regular season)
};

/* ------------------------------------------------------------- scoring model */
function score(pos,s,cfg=S){
  if(!s||s==="BYE")return null;
  if(pos==="K")return s.fg*3+s.fg50*2+s.xp-s.miss;
  if(pos==="DEF"){const pa=s.pa;const paPts=pa===0?10:pa<7?7:pa<14?4:pa<21?1:pa<28?0:pa<35?-1:-4;
    return paPts+s.sk+s.int*2+s.fr*2+s.td*6+(s.saf||0)*2;}
  if(isIDP(pos))return (s.solo||0)*1+(s.ast||0)*.5+(s.sk||0)*2+(s.int||0)*3+(s.pd||0)*1+(s.ff||0)*2+(s.fr||0)*2+(s.td||0)*6+(s.tfl||0)*.5;
  const rp=cfg.fmt==="ppr"?1:cfg.fmt==="half"?.5:0;
  let p=(s.pyd||0)*.04+(s.ptd||0)*(cfg.ptd6?6:4)-(s.int||0)*2+(s.ryd||0)*.1+(s.rtd||0)*6
    +(s.rec||0)*(rp+(pos==="TE"&&cfg.tePrem?.5:0))+(s.cyd||0)*.1+(s.ctd||0)*6-(s.fum||0)*2;
  return Math.round(p*100)/100;
}

/* derived values that depend on scoring — recomputed on any scoring change */
const D={fpaRank:{},fpa:{},lg:{}};
function compute(){
  PLAYERS.forEach(p=>{
    p.pts={};for(const w of WEEKS){const s=p.weeks[w];p.pts[w]=s==="BYE"?"BYE":s==null?null:score(p.pos,s);}
    p.priorMean=mean(p.prior.map(s=>score(p.pos,s)));
    p.priorSd=sdev(p.prior.map(s=>score(p.pos,s)));
  });
  // fantasy points allowed, per defensive team & position → rank 1 (fewest) .. 32 (most)
  const POSS=["QB","RB","WR","TE","K","DEF","DB","DL","LB"];
  const fpa={};ABBRS.forEach(t=>{fpa[t]={};POSS.forEach(x=>fpa[t][x]={s:0,g:0})});
  PLAYERS.forEach(p=>{for(const w of WEEKS){const v=p.pts[w];if(typeof v!=="number")continue;
    const o=OPP[w][p.team];if(!o)continue;fpa[o][p.pos].s+=v;fpa[o][p.pos].g++;}});
  D.fpa={};D.fpaRank={};D.lg={};
  POSS.forEach(x=>{
    const arr=ABBRS.map(t=>[t,fpa[t][x].g?fpa[t][x].s/fpa[t][x].g:0]);
    D.lg[x]=mean(arr.map(a=>a[1]));
    arr.sort((a,b)=>a[1]-b[1]).forEach(([t,v],i)=>{(D.fpa[t]??={})[x]=v;(D.fpaRank[t]??={})[x]=i+1;});
  });
  // next-week projection (designed-for estimate) + volatility
  PLAYERS.forEach(p=>{
    const o=OPP[CUR][p.team];
    const prev=WEEKS.filter(w=>typeof p.pts[w]==="number").map(w=>p.pts[w]);
    if(o==null||p.status==="O"||p.status==="IR"||p.rookieNoGames){p.proj=null;}
    else{const base=(2*p.priorMean+sum(prev))/(2+prev.length);
      const f=D.fpa[o]?Math.max(.85,Math.min(1.15,1+.5*(D.fpa[o][p.pos]/(D.lg[p.pos]||1)-1))):1;
      p.proj=Math.round(base*f*(p.status==="Q"?.92:1)*10)/10;}
    p.vol=prev.length>=3?sdev(prev):null;
  });
}

/* range window: which played weeks count for averages/totals/highs/lows/vol */
function rangeWeeks(p){
  const played=WEEKS.filter(w=>typeof p.pts[w]==="number");
  const n=S.range==="l3"?3:S.range==="l5"?5:played.length;
  return played.slice(-n);
}
function pstats(p){
  const rw=rangeWeeks(p);
  const vals=rw.map(w=>p.pts[w]);
  const allPlayed=WEEKS.filter(w=>typeof p.pts[w]==="number");
  // snap share / target share from the in-range weeks
  const snaps=rw.map(w=>p.weeks[w]).filter(s=>s&&s.snap!=null).map(s=>s.snap);
  const tg=[];rw.forEach(w=>{const s=p.weeks[w];if(s&&s.tg!=null){
    const qb=PLAYERS.find(q=>q.team===p.team&&q.pos==="QB"&&q.depth===1);
    const qs=qb&&qb.weeks[w];if(qs&&qs!=="BYE")tg.push(s.tg/Math.max(1,qs.att));}});
  // position-specific aggregates over the range
  const lines=rw.map(w=>p.weeks[w]);
  const ag=k=>sum(lines.map(s=>s&&s[k]||0));
  const agg={
    fgm:ag("fg"),fga:ag("fg")+ag("miss"),xpm:ag("xp"),lng50:ag("fg50"),
    sk:ag("sk"),int:ag("int"),fr:ag("fr"),td:ag("td"),
    pa: rw.length?mean(lines.map(s=>s?s.pa:0)):null, ya: rw.length?mean(lines.map(s=>s?s.ya:0)):null,
    solo:ag("solo"),ast:ag("ast"),tkl:ag("solo")+ag("ast"),pd:ag("pd"),
  };
  return{
    gp:vals.length, total:sum(vals), avg:vals.length?mean(vals):null,
    high:vals.length?Math.max(...vals):null, low:vals.length?Math.min(...vals):null,
    sd:vals.length>=3?sdev(vals):null,
    last3:allPlayed.length?mean(allPlayed.slice(-3).map(w=>p.pts[w])):null,
    snap:snaps.length?mean(snaps):null, tgt:tg.length?mean(tg)*100:null,
    trend:allPlayed.length>=4?mean(allPlayed.slice(-3).map(w=>p.pts[w]))-mean(allPlayed.slice(0,-3).map(w=>p.pts[w])):0,
    agg
  };
}

/* matchup difficulty for next week (CUR) */
function matchup(p,w=CUR){
  const o=OPP[w][p.team];if(o==null)return null;
  const r=D.fpaRank[o]?D.fpaRank[o][p.pos]:16;
  const label=r>=25?"Easy":r<=8?"Tough":"Even";
  const color=r>=25?"var(--good)":r<=8?"var(--crit)":"var(--muted)";
  return{o,r,label,color};
}

/* weekly stat line text per position */
function statLine(p,w){
  const s=p.weeks[w];
  if(s==="BYE")return "Bye week";
  if(s==null)return p.rookieNoGames?"No game":"Did not play";
  switch(p.pos){
    case"QB":return `${s.cmp}/${s.att}, ${s.pyd} yd, ${s.ptd} TD${s.int?`, ${s.int} INT`:""}${s.ryd>9?` · ${s.ryd} rush`:""}`;
    case"RB":return `${s.car} car, ${s.ryd} yd${s.rtd?`, ${s.rtd} TD`:""} · ${s.rec}/${s.tg} rec, ${s.cyd} yd${s.ctd?`, ${s.ctd} TD`:""}`;
    case"WR":case"TE":return `${s.rec}/${s.tg} rec, ${s.cyd} yd${s.ctd?`, ${s.ctd} TD`:""}${s.ryd?` · ${s.ryd} rush`:""}`;
    case"K":return `${s.fg}/${s.fg+s.miss} FG${s.fg50?` (${s.fg50} from 50+)`:""}, ${s.xp} XP`;
    case"DEF":return `${s.pa} allowed, ${s.sk} sk, ${s.int} INT${s.fr?`, ${s.fr} FR`:""}${s.td?`, ${s.td} TD`:""}`;
    default:return `${s.solo+s.ast} tkl (${s.solo} solo)${s.sk?`, ${s.sk} sk`:""}${s.int?`, ${s.int} INT`:""}${s.pd?`, ${s.pd} PD`:""}${s.ff?`, ${s.ff} FF`:""}`;
  }
}

/* sparkline across weeks 1..PLAYED, breaking at missed weeks/byes */
function spark(p){
  const W=104,H=24,vals=WEEKS.map(w=>p.pts[w]);
  const nums=vals.filter(v=>typeof v==="number");
  if(!nums.length)return `<span class="dim" style="font-size:11px">no games</span>`;
  const mx=Math.max(10,...nums);
  const x=i=>3+i*(W-6)/(PLAYED-1),y=v=>H-3-(Math.max(0,v)/mx)*(H-7);
  let d="",pen=false,li=-1;
  vals.forEach((v,i)=>{if(typeof v==="number"){d+=(pen?"L":"M")+x(i).toFixed(1)+" "+y(v).toFixed(1);pen=true;li=i;}else pen=false;});
  const tip=`<b>${esc(p.name)}</b> — weekly points<br>`+WEEKS.map(w=>`<span class="k">Wk ${w}</span> ${typeof p.pts[w]==="number"?f1(p.pts[w]):p.pts[w]==="BYE"?"bye (gap)":"missed (gap)"}`).join("<br>");
  return `<svg class="spark" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weekly points sparkline for ${esc(p.name)}" data-tip='${tip.replace(/'/g,"&#39;")}'>
    <line x1="0" x2="${W}" y1="${H-3}" y2="${H-3}" stroke="var(--line-2)"/>
    <path d="${d}" fill="none" stroke="var(--accent)" stroke-width="1.75" stroke-linejoin="round" stroke-linecap="round"/>
    ${li>=0?`<circle cx="${x(li)}" cy="${y(vals[li])}" r="2.6" fill="var(--accent-2)"/>`:""}</svg>`;
}

/* ============================================================ table columns */
/* get(p,s) returns a sortable value; cell(p,s) renders HTML (optional) */
const COLS={
  total:{lab:"Total",tip:"Total fantasy points in the selected range",get:(p,s)=>s.gp?s.total:null,cell:(p,s)=>s.gp?`<span class="num">${f1(s.total)}</span>`:gapCell()},
  avg:{lab:"PPG",tip:"Points per game in range. Divides by games actually played; the games-played count sits beside it.",
       get:(p,s)=>s.avg,cell:(p,s)=>s.gp?`<span class="num">${f1(s.avg)}</span> <span class="avg-gp">· ${s.gp} GP</span>`:gapCell("no games yet")},
  last3:{lab:"Last 3",tip:"Average of the last three games played",get:(p,s)=>s.last3,cell:(p,s)=>s.last3==null?gapCell():`<span class="num">${f1(s.last3)}</span>`},
  high:{lab:"High",tip:"Best single game in range",get:(p,s)=>s.high,cell:(p,s)=>s.high==null?gapCell():`<span class="num">${f1(s.high)}</span>`},
  low:{lab:"Low",tip:"Worst single game in range",get:(p,s)=>s.low,cell:(p,s)=>s.low==null?gapCell():`<span class="num">${f1(s.low)}</span>`},
  sd:{lab:"Volatility",tip:"Standard deviation of weekly points over games played (needs 3+ games). Lower = steadier.",
      get:(p,s)=>s.sd,cell:(p,s)=>s.sd==null?`<span class="dim" data-tip="Needs at least 3 games played">—</span>`:`<span class="num">${f1(s.sd)}</span>`},
  gp:{lab:"GP",tip:"Games actually played in range",get:(p,s)=>s.gp,cell:(p,s)=>`<span class="num">${s.gp}</span>`},
  snap:{lab:"SNP%",tip:"Average share of team offensive (or defensive) snaps",get:(p,s)=>s.snap,
        cell:(p,s)=>s.snap==null?gapCell():snapCell(s.snap)},
  tgt:{lab:"TGT%",tip:"Targets ÷ team pass attempts, averaged over range",get:(p,s)=>s.tgt,
       cell:(p,s)=>s.tgt==null?`<span class="dim">—</span>`:`<span class="num">${s.tgt.toFixed(1)}%</span>`},
  opp:{lab:"Next matchup",tip:"Week "+CUR+" opponent and its rank in fantasy points allowed to this position (1st = fewest allowed/Tough, 32nd = most/Easy). 25th+ Easy, 8th- Tough.",
       get:p=>{const m=matchup(p);return m?m.r:-1;},l:true,
       cell:p=>{const m=matchup(p);if(!m)return `<span class="dim">Bye</span>`;
         return `<span class="matchcell"><span class="dim">vs</span> ${m.o} <span class="ease"><i style="background:${m.color}"></i>${ord(m.r)} · ${m.label}</span></span>`;}},
  bye:{lab:"Bye",tip:"NFL bye week",get:p=>BYE[p.team],cell:p=>`<span class="num">${BYE[p.team]}</span>`},
  trend:{lab:"Weekly",tip:"Weekly points, weeks 1–"+PLAYED+". Gaps are byes/missed weeks. Sorts by recent trend.",
         get:(p,s)=>s.trend,l:true,cell:p=>spark(p)},
  proj:{lab:"Proj (est)",tip:"PLACEHOLDER estimate only — real next-week projections arrive in a later phase. Designed-for column.",
        get:p=>p.proj,cell:p=>p.proj==null?`<span class="dim">—</span>`:`<span class="num dim" style="opacity:.75">${f1(p.proj)}</span> <span class="avg-gp">est</span>`},
  // kicker
  k_fgm:{lab:"FGM",tip:"Field goals made (range)",get:(p,s)=>s.agg.fgm,cell:(p,s)=>`<span class="num">${s.agg.fgm}</span>`},
  k_fga:{lab:"FGA",tip:"Field goals attempted (range)",get:(p,s)=>s.agg.fga,cell:(p,s)=>`<span class="num">${s.agg.fga}</span>`},
  k_fgpct:{lab:"FG%",tip:"Field-goal percentage (range)",get:(p,s)=>s.agg.fga?s.agg.fgm/s.agg.fga:null,
           cell:(p,s)=>s.agg.fga?`<span class="num">${Math.round(100*s.agg.fgm/s.agg.fga)}%</span>`:gapCell()},
  k_lng50:{lab:"50+",tip:"Field goals made from 50+ yards (range)",get:(p,s)=>s.agg.lng50,cell:(p,s)=>`<span class="num">${s.agg.lng50}</span>`},
  k_xpm:{lab:"XPM",tip:"Extra points made (range)",get:(p,s)=>s.agg.xpm,cell:(p,s)=>`<span class="num">${s.agg.xpm}</span>`},
  // team defense
  d_sk:{lab:"Sacks",tip:"Sacks (range)",get:(p,s)=>s.agg.sk,cell:(p,s)=>`<span class="num">${s.agg.sk}</span>`},
  d_int:{lab:"INT",tip:"Interceptions (range)",get:(p,s)=>s.agg.int,cell:(p,s)=>`<span class="num">${s.agg.int}</span>`},
  d_fr:{lab:"FR",tip:"Fumble recoveries (range)",get:(p,s)=>s.agg.fr,cell:(p,s)=>`<span class="num">${s.agg.fr}</span>`},
  d_td:{lab:"TD",tip:"Defensive/return touchdowns (range)",get:(p,s)=>s.agg.td,cell:(p,s)=>`<span class="num">${s.agg.td}</span>`},
  d_pa:{lab:"PA/g",tip:"Points allowed per game (lower is better)",get:(p,s)=>s.agg.pa,cell:(p,s)=>s.agg.pa==null?gapCell():`<span class="num">${s.agg.pa.toFixed(1)}</span>`},
  d_ya:{lab:"Yds/g",tip:"Yards allowed per game",get:(p,s)=>s.agg.ya,cell:(p,s)=>s.agg.ya==null?gapCell():`<span class="num">${Math.round(s.agg.ya)}</span>`},
  // individual defense
  i_tkl:{lab:"Tkl",tip:"Total tackles — solo + assist (range)",get:(p,s)=>s.agg.tkl,cell:(p,s)=>`<span class="num">${s.agg.tkl}</span>`},
  i_sk:{lab:"Sacks",tip:"Sacks (range)",get:(p,s)=>s.agg.sk,cell:(p,s)=>`<span class="num">${s.agg.sk.toFixed(s.agg.sk%1?1:0)}</span>`},
  i_int:{lab:"INT",tip:"Interceptions (range)",get:(p,s)=>s.agg.int,cell:(p,s)=>`<span class="num">${s.agg.int}</span>`},
  i_pd:{lab:"PD",tip:"Passes defended (range)",get:(p,s)=>s.agg.pd,cell:(p,s)=>`<span class="num">${s.agg.pd}</span>`},
};
function gapCell(txt){return `<span class="gap" data-tip="A gap, not a zero — no game in range">${txt||"—"}</span>`;}
function snapCell(v){return `<span class="snapbar"><span class="num">${Math.round(v)}%</span><span class="track"><span class="fill" style="width:${Math.round(v)}%"></span></span></span>`;}

/* which column-selection key is active, and which columns are offered */
function colsKey(){return S.posFilter==="K"?"colsK":S.posFilter==="DEF"?"colsDEF":DEF_POS.includes(S.posFilter)?"colsIDP":"cols";}
function colsOffered(key){
  if(key==="colsK")return ["total","avg","last3","high","low","sd","gp","k_fgm","k_fga","k_fgpct","k_lng50","k_xpm","opp","bye","trend","proj"];
  if(key==="colsDEF")return ["total","avg","last3","high","low","sd","gp","d_sk","d_int","d_fr","d_td","d_pa","d_ya","opp","bye","trend","proj"];
  if(key==="colsIDP")return ["total","avg","last3","high","low","sd","gp","i_tkl","i_sk","i_int","i_pd","snap","opp","bye","trend","proj"];
  return ["total","avg","last3","high","low","sd","gp","snap","tgt","opp","bye","trend","proj"];
}

/* ============================================================ shell renders */
const ICON={
  players:'<path d="M2.5 4h11M2.5 8h11M2.5 12h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  nfl:'<rect x="2.5" y="3" width="11" height="10" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8 3v10M2.5 8h11" stroke="currentColor" stroke-width="1.1"/>',
  gameday:'<circle cx="8" cy="8" r="5.3" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8 5v3l2 1.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  waivers:'<path d="M3 6l5-3 5 3-5 3-5-3zM3 10l5 3 5-3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
  review:'<path d="M3 13V8M8 13V3.5M13 13V6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  leagues:'<circle cx="6" cy="6" r="2.2" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="11" cy="10" r="2.2" fill="none" stroke="currentColor" stroke-width="1.3"/>',
  search:'<circle cx="7" cy="7" r="4.3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10.2 10.2L13.5 13.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
};
function renderNav(){
  const live=[["players","Players"],["nfl","NFL"]];
  const soon=[["gameday","Game day"],["waivers","Waivers & trades"],["review","Weekly review"],["leagues","Leagues"]];
  $("#nav").innerHTML=`
    <div class="brand"><span class="mark">FW</span><div><b>Fantasy Workbench</b><span>Runpure FF · Phase 1</span></div></div>
    <div class="nav-sec">Browse</div>
    ${live.map(([id,l])=>`<a href="#${id}" class="${U.screen===id?"on":""}" data-nav="${id}">
      <svg viewBox="0 0 16 16">${ICON[id]}</svg>${l}</a>`).join("")}
    <div class="nav-sec">Coming later</div>
    ${soon.map(([id,l])=>`<div class="navitem soon" aria-disabled="true" title="Planned for a later phase">
      <svg viewBox="0 0 16 16">${ICON[id]}</svg>${l}<span class="tag">soon</span></div>`).join("")}
    <div class="leaguepick"><b style="color:var(--text-2)">No leagues connected</b><br>League switching lands when Leagues ships.</div>
    <div class="nav-foot">Sample data — fictional players, real NFL team names. Not affiliated with the NFL.</div>`;
}
function freshNode(){
  const stale=U.appState==="stale";
  const d=stale?F.staleUpdated:F.lastUpdated;
  const opts={weekday:"short",hour:"numeric",minute:"2-digit"};
  const when=stale?"Nov 8, 5:58 AM ET":"today, 6:00 AM ET";
  return `<div class="fresh ${stale?"stale":""}" data-tip="${stale?"This data is more than 24 hours old. The daily refresh did not land this morning.":"The daily refresh lands by 6:00 AM Eastern."}">
    <span class="dot"></span><span class="txt">NFL data updated ${when}${stale?" — stale":""}</span></div>`;
}
function renderTop(){
  $("#topbar").innerHTML=`
    ${freshNode()}
    <div class="spacer"></div>
    <div class="statepick"><b>Preview state</b>
      <label class="sr-only" for="statesel">Preview UI state</label>
      <select id="statesel">
        ${[["normal","Normal"],["signedout","Signed out"],["noaccount","No account"],["loading","Loading"],
           ["nomatches","No matches"],["sparse","Little / no data"],["stale","Stale data"],["error","Error"]]
          .map(([v,l])=>`<option value="${v}" ${U.appState===v?"selected":""}>${l}</option>`).join("")}
      </select></div>
    <div class="acct" id="acct" tabindex="0" role="button" aria-haspopup="menu" aria-expanded="false">
      <span class="avatar" style="background:hsl(210,45%,60%)">WS</span>
      <span class="who">William Sanchez<small>Signed in</small></span>
    </div>`;
}

/* ============================================================ screen: sign in */
function viewSignIn(){
  document.body.classList.add("signedout-mode");
  $("#app").style.display="none";
  $("#signin-root").style.display="block";
  $("#signin-root").innerHTML=`
    <div class="signin"><div class="box">
      <div class="brand"><span class="mark">FW</span><div><b>Fantasy Workbench</b><span>Runpure FF</span></div></div>
      <div class="panel">
        <h1>Sign in</h1>
        <p class="lede">Every NFL player and game in one place. Refreshed daily.</p>
        <form id="signinform" novalidate>
          <label for="email">Email</label>
          <input id="email" type="email" autocomplete="email" placeholder="you@example.com" value="williamlancelotsanchez@gmail.com">
          <label for="pw">Password</label>
          <input id="pw" type="password" autocomplete="current-password" placeholder="Your password" value="prototype">
          <div class="err-msg" id="signinerr" role="alert">That email and password don’t match. Try again.</div>
          <button class="btn primary" type="submit">Sign in</button>
        </form>
        <div class="or">or continue with</div>
        <button class="provider" data-provider="google"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 8h4a4 4 0 1 1-1.2-2.9" fill="none" stroke="currentColor" stroke-width="1.5"/></svg> Continue with Google</button>
        <button class="provider" data-provider="apple"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M10.6 8.4c0-1.6 1.3-2.3 1.3-2.4-.7-1-1.8-1.2-2.2-1.2-.9-.1-1.8.5-2.3.5s-1.2-.5-2-.5c-1 0-2 .6-2.5 1.5-1.1 1.9-.3 4.6.8 6.1.5.7 1.1 1.5 1.9 1.5s1-.5 2-.5 1.2.5 2 .5 1.3-.7 1.8-1.4c.4-.6.6-1.2.6-1.2s-1.7-.6-1.7-2.9zM9.2 3.9c.4-.5.7-1.2.6-1.9-.6 0-1.3.4-1.7.9-.4.4-.7 1.1-.6 1.8.7 0 1.3-.4 1.7-.8z" fill="currentColor"/></svg> Continue with Apple</button>
      </div>
      <p class="foot">No public sign-up yet — accounts are invite-only during Phase 1.<br>
        <span class="dim">Prototype: any sign-in lands you in the app.</span></p>
    </div></div>`;
  const done=()=>{U.appState="normal";U.signedIn=true;boot();};
  $("#signinform").addEventListener("submit",e=>{e.preventDefault();done();});
  $$(".provider").forEach(b=>b.addEventListener("click",done));
}

/* ============================================================ screen: players */
function filteredPlayers(){
  const q=S.query.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
  let list=PLAYERS.filter(p=>{
    if(S.posFilter==="FLEX"){if(!["RB","WR","TE"].includes(p.pos))return false;}
    else if(S.posFilter==="IDP"){if(!isIDP(p))return false;}
    else if(S.posFilter!=="ALL"&&p.pos!==S.posFilter)return false;
    if(S.teamFilter!=="ALL"&&p.team!==S.teamFilter)return false;
    if(S.injFilter!=="ALL"){
      if(S.injFilter==="HEALTHY"&&p.status)return false;
      if(["Q","O","IR"].includes(S.injFilter)&&p.status!==S.injFilter)return false;
    }
    if(S.byeFilter!=="ALL"&&BYE[p.team]!==+S.byeFilter)return false;
    if(S.minGp>0){const gp=WEEKS.filter(w=>typeof p.pts[w]==="number").length;if(gp<S.minGp)return false;}
    if(q){const nm=p.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
      if(!nm.includes(q)&&p.team.toLowerCase()!==q)return false;}
    return true;
  });
  return list;
}
function sortPlayers(list){
  const [sk,sd]=S.sort;const c=COLS[sk];
  const st=new Map(list.map(p=>[p.id,pstats(p)]));
  list.sort((a,b)=>{
    let x=c.get(a,st.get(a.id)),y=c.get(b,st.get(b.id));
    if(x==null)x=-Infinity;if(y==null)y=-Infinity;
    const cmp=(typeof x==="string"?x.localeCompare(y):x-y)*sd;
    return cmp||a.name.localeCompare(b.name);   // ties broken by name
  });
  return st;
}
function segBtns(name,opts,cur){
  return `<div class="seg" role="group" data-seg="${name}">${opts.map(([v,l,tip])=>
    `<button type="button" data-v="${v}" aria-pressed="${String(cur)===String(v)}" ${tip?`data-tip="${esc(tip)}"`:""}>${l}</button>`).join("")}</div>`;
}
function columnChooser(){
  const key=colsKey(),cur=S[key],offered=colsOffered(key);
  return `<div class="colpick" id="colpick">
    <button class="btn" type="button" aria-haspopup="true" aria-expanded="false">Columns · ${cur.length}</button>
    <div class="menu" role="menu">
      <div class="ch">Choose columns (sort &amp; filters stay)</div>
      ${offered.map(k=>`<label><input type="checkbox" value="${k}" ${cur.includes(k)?"checked":""}> ${esc(COLS[k].lab)}
        <small>${k==="trend"?"chart":k==="proj"?"designed-for":""}</small></label>`).join("")}
    </div></div>`;
}
function filtersBar(count){
  const byes=[...new Set(ABBRS.map(t=>BYE[t]))].sort((a,b)=>a-b);
  return `<div class="filterbar" role="region" aria-label="Filters">
    <div class="f"><label for="fteam">Team</label>
      <select id="fteam" data-filter="teamFilter"><option value="ALL">All teams</option>
        ${ABBRS.slice().sort().map(t=>`<option value="${t}" ${S.teamFilter===t?"selected":""}>${t} — ${esc(TEAM[t].nick)}</option>`).join("")}</select></div>
    <div class="f"><label for="finj">Injury</label>
      <select id="finj" data-filter="injFilter">
        ${[["ALL","Any status"],["HEALTHY","Healthy only"],["Q","Questionable"],["O","Out"],["IR","Injured reserve"]]
          .map(([v,l])=>`<option value="${v}" ${S.injFilter===v?"selected":""}>${l}</option>`).join("")}</select></div>
    <div class="f"><label for="fbye">Bye week</label>
      <select id="fbye" data-filter="byeFilter"><option value="ALL">Any</option>
        ${byes.map(b=>`<option value="${b}" ${String(S.byeFilter)===String(b)?"selected":""}>Week ${b}</option>`).join("")}</select></div>
    <div class="f"><label for="fgp">Min games</label>
      <input id="fgp" type="number" min="0" max="${PLAYED}" value="${S.minGp}" data-filter="minGp" aria-describedby="fgphint"></div>
    <div class="spacer"></div>
    <span class="count num" aria-live="polite">${count} ${count===1?"player":"players"} match</span>
    <button class="linkbtn" id="clearall" ${filtersActive()?"":"disabled style=\"opacity:.4;cursor:default\""}>Clear all</button>
  </div>`;
}
function filtersActive(){
  return S.posFilter!=="ALL"||S.teamFilter!=="ALL"||S.injFilter!=="ALL"||S.byeFilter!=="ALL"||S.minGp>0||S.query.trim()!=="";
}
function clearFilters(){S.posFilter="ALL";S.teamFilter="ALL";S.injFilter="ALL";S.byeFilter="ALL";S.minGp=0;S.query="";U.limit=40;save();}

function playerRow(p,s,cols){
  const ticked=U.ticked.includes(p.id);
  return `<tr class="clickable ${ticked?"ticked":""}" data-pid="${p.id}">
    <td class="tick"><input type="checkbox" ${ticked?"checked":""} data-tick="${p.id}" aria-label="Select ${esc(p.name)} to compare" ${!ticked&&U.ticked.length>=4?"disabled":""}></td>
    <td class="l"><div class="pcell">
      <span class="av" style="background:${avatarBg(p)}" aria-hidden="true">${esc(initials(p))}</span>
      <span class="who"><span class="pname">${esc(p.name)}${injBadge(p)}</span>
        <span class="psub">${p.pos==="DEF"?"Team defense":`${p.pos} · ${p.team} · age ${p.age} · bye ${BYE[p.team]}`}</span></span>
    </div></td>
    <td><span class="pos ${p.pos}">${p.pos}</span></td>
    ${cols.map(k=>{const c=COLS[k];return `<td class="${c.l?"l":""}">${c.cell?c.cell(p,s):f1(c.get(p,s))}</td>`}).join("")}
  </tr>`;
}
function injBadge(p){
  if(!p.status)return "";
  const full={Q:"Questionable",O:"Out",IR:"Injured reserve"}[p.status];
  return ` <span class="inj ${p.status}" data-tip="${full}${p.practice?` · ${p.practice} in practice`:""}">${p.status}</span>`;
}

function viewPlayers(){
  const key=colsKey(),cols=S[key];
  let list=filteredPlayers();
  // "no matches" preview forces an empty result set
  if(U.appState==="nomatches")list=[];
  const count=list.length;
  const st=count?sortPlayers(list):new Map();
  const [sk,sd]=S.sort;

  const head=`<thead><tr>
    <th class="ns tick" scope="col"><span class="sr-only">Select</span></th>
    <th class="l ns" scope="col">Player</th>
    <th class="ns" scope="col">Pos</th>
    ${cols.map(k=>{const c=COLS[k];return `<th scope="col" class="${c.l?"l":""} ${sk===k?"sorted":""}" data-sort="${k}" data-tip="${esc(c.tip)}" aria-sort="${sk===k?(sd>0?"ascending":"descending"):"none"}">
      ${esc(c.lab)}${sk===k?`<span class="caret">${sd>0?"▲":"▼"}</span>`:""}</th>`}).join("")}
  </tr></thead>`;

  let body;
  if(U.appState==="loading")body=skeletonRows(cols.length+3);
  else if(!count)body=`<tbody><tr><td colspan="${cols.length+3}">
    <div class="inline-empty"><b>No players match these filters</b>
      Loosen a filter or clear them all to see players again.
      <div style="margin-top:14px"><button class="btn" id="clearall2">Clear all filters</button></div></div></td></tr></tbody>`;
  else body=`<tbody>${list.slice(0,U.limit).map(p=>playerRow(p,st.get(p.id),cols)).join("")}</tbody>`;

  const foot=count>U.limit?`<div class="tfoot"><button class="btn" id="showmore">Show ${Math.min(40,count-U.limit)} more</button>
    <span>Showing ${Math.min(U.limit,count)} of ${count}</span></div>`:"";

  const posOpts=[["ALL","All"],["QB","QB"],["RB","RB"],["WR","WR"],["TE","TE"],["FLEX","RB/WR/TE","Combined flex pool"],["K","K"],["DEF","DEF"],["IDP","IDP","DB · DL · LB"]];

  return `
  <div class="vhead">
    <div><h1>Players</h1><div class="sub">Every NFL player, refreshed daily. ${SEASON} season · through Week ${PLAYED}.</div></div>
    <div class="spacer"></div>
    <div class="tgroup">
      <button class="btn soon" data-tip="Save this set of filters, columns, sort and scoring to reuse later. Coming in a later phase." disabled>Saved views <span class="soontag">soon</span></button>
      <button class="btn soon" data-tip="Download the current table as a spreadsheet. Coming in a later phase." disabled>Export <span class="soontag">soon</span></button>
    </div>
  </div>

  ${U.appState==="stale"?staleBanner():""}

  <div class="toolbar">
    <div class="tgroup"><span class="lab">Position</span>${segBtns("posFilter",posOpts,S.posFilter)}</div>
    <div class="search"><svg viewBox="0 0 16 16" aria-hidden="true">${ICON.search}</svg>
      <input type="search" id="psearch" placeholder="Search player or team code" value="${esc(S.query)}" aria-label="Search players by name or team">
    </div>
  </div>

  <div class="toolbar">
    <div class="tgroup"><span class="lab">Scoring</span>${segBtns("fmt",[["ppr","Full PPR"],["half","Half PPR"],["std","Standard"]],S.fmt)}</div>
    <label class="chk" data-tip="+0.5 points per reception for tight ends"><input type="checkbox" data-opt="tePrem" ${S.tePrem?"checked":""}> TE premium</label>
    <label class="chk" data-tip="Passing touchdowns worth 6 instead of 4"><input type="checkbox" data-opt="ptd6" ${S.ptd6?"checked":""}> 6-pt pass TD</label>
    <span style="width:1px;height:20px;background:var(--line)"></span>
    <div class="tgroup"><span class="lab">Range</span>${segBtns("range",[["season","Season"],["l5","Last 5"],["l3","Last 3"]],S.range)}</div>
    <div class="spacer"></div>
    <label class="chk" data-tip="Tighter row height for more rows on screen"><input type="checkbox" data-opt="compact" ${S.compact?"checked":""}> Compact</label>
    ${columnChooser()}
  </div>

  ${filtersBar(count)}

  <div class="card"><div class="tw"><table class="t" aria-label="Player statistics">${head}${body}</table></div>${foot}</div>

  <p class="note">PPG divides by games actually played, shown as “14.2 · 11 GP”. Byes and missed weeks are gaps, never zeros.
     Matchup difficulty reads “28th · Easy”: the opponent’s rank in fantasy points allowed to this position (25th-or-worse = Easy, 8th-or-better = Tough). Every stat here is <b>sample data</b>.</p>

  ${compareTray()}`;
}
function staleBanner(){return `<div class="banner warn" role="status">
  <span>⚠</span><span>NFL data is more than 24 hours old — this morning’s refresh did not land. Values may be behind.</span>
  <button class="btn" id="retryfresh">Check for updates</button></div>`;}
function skeletonRows(ncols){
  let r="";for(let i=0;i<9;i++)r+=`<tr><td colspan="${ncols}"><div class="skrow"><span class="sk" style="width:28px;height:28px;border-radius:50%"></span><span class="sk" style="width:${120+((i*37)%90)}px;height:12px"></span><span class="sk" style="width:40px;height:12px;margin-left:auto"></span><span class="sk" style="width:40px;height:12px"></span><span class="sk" style="width:40px;height:12px"></span></div></td></tr>`;
  return `<tbody aria-busy="true">${r}</tbody>`;
}
function compareTray(){
  if(!U.ticked.length)return "";
  const ps=U.ticked.map(id=>PLAYERS[id]);
  return `<div class="cmptray" role="region" aria-label="Compare selection">
    <span class="lab">Compare ${ps.length}/4</span>
    ${ps.map(p=>`<span class="chip"><span class="pos ${p.pos}" style="min-width:26px">${p.pos}</span>${esc(p.name)}
      <button data-untick="${p.id}" aria-label="Remove ${esc(p.name)}">×</button></span>`).join("")}
    <div class="spacer" style="margin-left:auto"></div>
    <button class="btn soon" data-tip="Side-by-side player comparison. Designed-for; arrives in a later phase." disabled>Compare <span class="soontag">soon</span></button>
    <button class="linkbtn" id="untickall">Clear</button>
  </div>`;
}

/* ============================================================ player card */
function openCard(id){U.cardId=id;U.cardSeason=SEASON;renderCard();}
function closeCard(){U.cardId=null;const sc=$("#scrim");if(sc)sc.remove();}
function renderCard(){
  closeCard();
  if(U.cardId==null)return;
  const p=PLAYERS[U.cardId];const s=pstats(p);
  const t=TEAM[p.team];
  const statusCls=p.status==="IR"?"ir":p.status==="O"?"o":p.status==="Q"?"q":"";
  const statusName={Q:"Questionable",O:"Out",IR:"Injured reserve"}[p.status]||"Active";
  const m=matchup(p);

  // weekly record rows (gaps shown, not zeros)
  const wkRows=WEEKS.map(w=>{
    const o=OPP[w][p.team];const v=p.pts[w];const isGap=o==null||v==null;
    const oppTxt=o==null?"Bye":`vs ${o}`;
    const snap=p.weeks[w]&&p.weeks[w]!=="BYE"&&p.weeks[w].snap!=null?Math.round(p.weeks[w].snap)+"%":"—";
    return `<tr class="${isGap?"gaprow":""}">
      <td class="l wk">Wk ${w}</td>
      <td class="l">${oppTxt}</td>
      <td class="l statline">${esc(statLine(p,w))}</td>
      <td>${typeof v==="number"?`<span class="num">${f1(v)}</span>`:`<span class="gap">—</span>`}</td>
      <td>${isGap?`<span class="gap">—</span>`:`<span class="num">${snap}</span>`}</td>
    </tr>`;
  }).join("");

  const summaryCells=[
    ["Total",f1(s.total),""],
    ["PPG",s.avg==null?"—":f1(s.avg),s.gp?`${s.gp} GP`:"no games"],
    ["High",s.high==null?"—":f1(s.high),""],
    ["Low",s.low==null?"—":f1(s.low),""],
    ["Volatility",s.sd==null?"—":f1(s.sd),s.sd==null?"<3 GP":""],
    p.pos==="K"||p.pos==="DEF"||isIDP(p)?["Snap %","—",""]:["Snap %",s.snap==null?"—":Math.round(s.snap)+"%",""],
    ["Target %",s.tgt==null?"—":s.tgt.toFixed(1)+"%",""],
  ];

  const bioLine = p.pos==="DEF"
    ? `<b>${esc(t.name)}</b> team defense · ${esc(t.div)}`
    : `${p.ht?Math.floor(p.ht/12)+"'"+(p.ht%12)+'"':""} · ${p.wt?p.wt+" lb":""} · ${esc(p.college||"")} · Drafted ${p.draftYear||"—"}${p.draftRound?` (R${p.draftRound})`:p.draftRound===0?" (undrafted)":""} · ${p.exp!=null?(p.exp===0?"Rookie":p.exp+" yr"+(p.exp>1?"s":"")+" exp"):""}`;

  const scrim=document.createElement("div");
  scrim.id="scrim";scrim.className="scrim";
  scrim.innerHTML=`<div class="pcard" role="dialog" aria-modal="true" aria-label="${esc(p.name)} player card">
    <div class="pc-top">
      <span class="pos ${p.pos}">${p.pos}</span>
      <b>${esc(p.name)}</b>
      <span class="dim" style="font-size:12.5px">follows the list’s ${S.fmt==="ppr"?"Full PPR":S.fmt==="half"?"Half PPR":"Standard"} scoring</span>
      <button class="close" id="cardclose" aria-label="Close player card">×</button>
    </div>
    <div class="pc-body">
      <div class="pc-hero">
        <span class="av" style="background:${avatarBg(p)}" aria-hidden="true">${esc(initials(p))}</span>
        <div style="min-width:0">
          <h2>${esc(p.name)} ${p.jersey?`<span class="dim num" style="font-size:16px">#${p.jersey}</span>`:""} ${injBadge(p)}</h2>
          <div class="meta">${p.pos==="DEF"?"Team defense":`${p.pos} · ${p.depth?p.slot:""}`} · <a href="#nfl" class="linkbtn" style="padding:0" data-teamlink="${p.team}">${esc(t.name)}</a>${p.age?` · age ${p.age}`:""}</div>
          <div class="bio">${bioLine}</div>
        </div>
      </div>

      <div class="pc-status">
        <span class="statusbar ${statusCls}"><span class="k">Status</span> ${statusName}${p.status?` (Wk ${CUR})`:""}</span>
        ${p.practice?`<span class="statusbar"><span class="k">Practice</span> ${p.practice}</span>`:""}
        <span class="statusbar"><span class="k">Depth</span> ${p.depth?p.slot:"—"}</span>
        ${m?`<span class="statusbar"><span class="k">Wk ${CUR}</span> <span class="ease" style="display:inline-flex;gap:5px;align-items:center"><i style="width:7px;height:7px;border-radius:50%;background:${m.color};display:inline-block"></i>vs ${m.o} · ${ord(m.r)} · ${m.label}</span></span>`:`<span class="statusbar"><span class="k">Wk ${CUR}</span> Bye</span>`}
      </div>

      <div class="pc-sec">
        <div class="h"><h3>Season summary</h3><span class="hint">${S.range==="season"?"Full season":S.range==="l5"?"Last 5 games":"Last 3 games"} · ${S.fmt.toUpperCase()}</span>
          <div class="spacer" style="margin-left:auto"></div>
          ${segBtns("range",[["season","Season"],["l5","Last 5"],["l3","Last 3"]],S.range)}</div>
        ${p.rookieNoGames?`<div class="inline-empty" style="border:1px solid var(--line);border-radius:10px"><b>No games yet</b>${esc(p.note||"")}</div>`:
        `<div class="summary">${summaryCells.map(([k,v,sub])=>`<div class="cell"><div class="v num">${v}${sub?` <small>${sub}</small>`:""}</div><div class="k">${k}</div></div>`).join("")}</div>`}
        ${p.note&&!p.rookieNoGames?`<p class="note">Note: ${esc(p.note)}</p>`:""}
      </div>

      <div class="pc-sec">
        <div class="h"><h3>Trend</h3><span class="hint">weekly points — gaps are byes/missed weeks</span></div>
        <div class="card trend">${trendChart(p)}</div>
      </div>

      <div class="pc-sec">
        <div class="h"><h3>Weekly record</h3><span class="hint">one row per week · byes and missed weeks show as gaps</span>
          <div class="spacer" style="margin-left:auto"></div>
          <label class="chk" style="font-size:12px"><span class="dim">Season</span>
            <select id="cardseason" aria-label="Season">
              ${[SEASON,SEASON-1,SEASON-2,SEASON-3,SEASON-4].map(y=>`<option ${y===U.cardSeason?"selected":""}>${y}</option>`).join("")}
            </select></label>
        </div>
        ${U.cardSeason!==SEASON?`<div class="inline-empty" style="border:1px solid var(--line);border-radius:10px"><b>${U.cardSeason} not loaded in this prototype</b>The real app keeps ${SEASON-4}–${SEASON}. Sample data only fills ${SEASON}.</div>`:
        `<div class="card"><div class="tw"><table class="t wk-table"><thead><tr>
          <th class="l ns">Week</th><th class="l ns">Opp</th><th class="l ns">Stat line</th><th class="ns">Pts</th><th class="ns">Snap</th>
        </tr></thead><tbody>${wkRows}</tbody></table></div></div>`}
      </div>
    </div>
  </div>`;
  document.body.appendChild(scrim);
  bindCard(scrim);
}
function trendChart(p){
  const W=760,H=190,ml=34,mr=14,mt=12,mb=26;
  const nums=WEEKS.map(w=>p.pts[w]).filter(v=>typeof v==="number");
  if(!nums.length)return `<div class="inline-empty"><b>No games yet</b>Nothing to chart.</div>`;
  const ymax=Math.max(10,Math.ceil(Math.max(...nums)/5)*5);
  const X=w=>ml+(w-1)*(W-ml-mr)/(PLAYED-1),Y=v=>mt+(1-Math.max(0,v)/ymax)*(H-mt-mb);
  let grid="";for(let v=0;v<=ymax;v+=Math.ceil(ymax/4/5)*5||5)grid+=`<line x1="${ml}" x2="${W-mr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${ml-7}" y="${Y(v)+4}" fill="var(--muted)" font-size="10" text-anchor="end">${v}</text>`;
  let xlab="";WEEKS.forEach(w=>xlab+=`<text x="${X(w)}" y="${H-9}" fill="var(--muted)" font-size="10" text-anchor="middle">${w}</text>`);
  // path with breaks at gaps
  let d="",pen=false;const dots=[];
  WEEKS.forEach(w=>{const v=p.pts[w];if(typeof v==="number"){d+=(pen?"L":"M")+X(w)+" "+Y(v);pen=true;dots.push([w,v]);}else pen=false;});
  const gapMarks=WEEKS.filter(w=>typeof p.pts[w]!=="number").map(w=>`<text x="${X(w)}" y="${Y(0)-4}" fill="var(--muted)" font-size="9" text-anchor="middle">${p.pts[w]==="BYE"?"bye":"—"}</text>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" role="img" aria-label="Weekly points trend for ${esc(p.name)}, with gaps for byes and missed weeks">
    ${grid}${xlab}${gapMarks}
    <path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots.map(([w,v])=>`<circle cx="${X(w)}" cy="${Y(v)}" r="3.4" fill="var(--accent-2)" stroke="var(--panel)" stroke-width="2" data-tip="<b>Week ${w}</b> · ${f1(v)} pts<br>${esc(statLine(p,w))}"/>`).join("")}
  </svg>`;
}
function bindCard(root){
  $("#cardclose",root).addEventListener("click",closeCard);
  root.addEventListener("mousedown",e=>{if(e.target===root)closeCard();});
  $$("[data-seg=range]",root).forEach(el=>el.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;S.range=b.dataset.v;save();render();renderCard();}));
  const ss=$("#cardseason",root);if(ss)ss.addEventListener("change",()=>{U.cardSeason=+ss.value;renderCard();});
  const tl=$("[data-teamlink]",root);if(tl)tl.addEventListener("click",e=>{e.preventDefault();closeCard();S.posFilter="ALL";S.teamFilter=tl.dataset.teamlink;save();go("players");});
}

/* ============================================================ screen: NFL */
function viewNFL(){
  const reg=U.nflPhase==="reg";
  const w=U.nflWeek;const data=SCHEDULE[w];
  const phaseSeg=segBtns("nflphase",[["pre","Preseason"],["reg","Regular"],["post","Postseason"]],U.nflPhase);
  const weeks=[];for(let i=1;i<=SEASON_WEEKS;i++)weeks.push(i);
  const weekOpts=weeks.map(i=>`<option value="${i}" ${i===w?"selected":""}>Week ${i}${i===CUR?" (current)":i<=PLAYED?"":" (upcoming)"}</option>`).join("");

  let body;
  if(!reg){
    const name=U.nflPhase==="pre"?"Preseason":"Postseason";
    body=`<div class="inline-empty" style="border:1px solid var(--line);border-radius:10px">
      <b>${name} isn’t in this sample</b>This prototype fills the ${SEASON} regular season only. The real app shows ${name.toLowerCase()} games the same way, from the daily public feed.</div>`;
  } else if(U.appState==="loading"){
    body=`<div class="gamegrid">${[1,2,3,4,5,6].map(()=>`<div class="game" style="padding:14px"><div class="skrow" style="border:0;padding:0"><span class="sk" style="width:30px;height:30px;border-radius:7px"></span><span class="sk" style="width:120px;height:12px"></span></div><div class="skrow" style="border:0;padding:10px 0 0"><span class="sk" style="width:30px;height:30px;border-radius:7px"></span><span class="sk" style="width:100px;height:12px"></span></div></div>`).join("")}</div>`;
  } else {
    body=`<div class="gamegrid">${data.games.map((g,i)=>gameCard(g,i)).join("")}</div>
    ${data.byes.length?`<div class="byes"><h3>On bye — Week ${w} (${data.byes.length} teams)</h3>
      <div class="list">${data.byes.slice().sort().map(t=>`<span class="byechip" data-tip="${esc(TEAM[t].name)}">${t}</span>`).join("")}</div></div>`:""}`;
  }

  return `
  <div class="vhead">
    <div><h1>NFL scores &amp; schedule</h1>
      <div class="sub">${SEASON} season · ${!reg?"regular season shown below":w<=PLAYED?"final scores":w===CUR?"this week — kickoffs ahead, scores update daily":"upcoming"}. Not live: scores land with the daily refresh.</div></div>
  </div>

  ${U.appState==="stale"?staleBanner():""}

  <div class="toolbar">
    <div class="tgroup"><span class="lab">Phase</span>${phaseSeg}</div>
    <div class="tgroup"><span class="lab">Week</span>
      <label class="sr-only" for="weeksel">Week</label>
      <select id="weeksel" ${reg?"":"disabled"}>${weekOpts}</select></div>
    <div class="spacer"></div>
    <button class="btn" id="weekprev" ${!reg||w<=1?"disabled":""} aria-label="Previous week">‹ Prev</button>
    <button class="btn" id="weeknext" ${!reg||w>=SEASON_WEEKS?"disabled":""} aria-label="Next week">Next ›</button>
  </div>

  ${body}

  <p class="note">Click a game to see stadium, roof, surface, weather, the betting line, starting quarterbacks and head coaches.
     A team code opens the Players list filtered to that team. Scores are <b>sample data</b> and refresh once a day — no live in-game states.</p>`;
}
function teamChip(t){return `<span class="tchip" style="background:${`hsl(${(ABBRS.indexOf(t)*67)%360},40%,58%)`}">${t}</span>`;}
function gameCard(g,i){
  const home=TEAM[g.home],away=TEAM[g.away];
  const played=g.played;
  const homeWin=played&&g.homeScore>g.awayScore,awayWin=played&&g.awayScore>g.homeScore;
  const teamRow=(abbr,scoreSide,win,lose)=>`
    <div class="gteam ${win?"win":""} ${lose?"lose":""}">
      ${teamChip(abbr)}
      <div><div class="tn"><a href="#players" data-teamfilter="${abbr}">${esc(TEAM[abbr].name)}</a></div>
        <div class="rec">${esc(TEAM[abbr].div)}</div></div>
      ${played?`<span class="sc num">${scoreSide}${win&&g.ot?`<span class="ot">OT</span>`:""}</span>`:`<span class="rec" style="margin-left:auto">${g.day} ${g.time}</span>`}
    </div>`;
  const favTxt=g.favorite===g.home?`${g.home} −${g.spread}`:`${g.away} −${g.spread}`;
  return `<div class="game" id="g${i}">
    <div class="ghead"><span>${g.day} · ${g.time} ET</span><span class="st ${played?"final":"up"}">${played?(g.ot?"Final / OT":"Final"):"Upcoming"}</span></div>
    ${teamRow(g.away,g.awayScore,awayWin,homeWin)}
    ${teamRow(g.home,g.homeScore,homeWin,awayWin)}
    <div class="gameline"><span>${esc(home.stadium)}</span><span style="margin-left:auto">${favTxt} · O/U ${g.total}</span></div>
    <button class="gtoggle" data-gtoggle="${i}" aria-expanded="false">Game detail</button>
    <div class="gdetail"><dl>
      <dt>Stadium</dt><dd>${esc(home.stadium)}, ${esc(home.city)}</dd>
      <dt>Roof</dt><dd>${g.roof}</dd>
      <dt>Surface</dt><dd>${g.surface}</dd>
      <dt>Temp</dt><dd>${g.temp}</dd>
      <dt>Wind</dt><dd>${g.wind}</dd>
      <dt>Line</dt><dd>${favTxt}</dd>
      <dt>Total</dt><dd>${g.total}</dd>
      <dt>Starting QBs</dt><dd>${esc(g.awayQB)} (${g.away}) · ${esc(g.homeQB)} (${g.home})</dd>
      <dt>Head coaches</dt><dd>${esc(g.awayCoach)} · ${esc(g.homeCoach)}</dd>
    </dl></div>
  </div>`;
}

/* ============================================================ state screens */
function stateScreen(){
  if(U.appState==="noaccount")return `<div class="state-wrap"><div class="state-box">
    <div class="ic"><svg width="22" height="22" viewBox="0 0 16 16"><circle cx="8" cy="5.5" r="2.6" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M3 13c0-2.6 2.2-4 5-4s5 1.4 5 4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg></div>
    <h2>Your account isn’t set up yet</h2>
    <p>You’re signed in, but this email doesn’t have a Fantasy Workbench account during the Phase 1 invite period. Once your account is enabled you’ll see every player and game here.</p>
    <div class="row"><button class="btn primary" id="toerror-none" onclick="return false" disabled>Waiting for access</button>
      <button class="btn" data-signout>Sign out</button></div></div></div>`;
  if(U.appState==="error")return `<div class="state-wrap"><div class="state-box err">
    <div class="ic"><svg width="22" height="22" viewBox="0 0 16 16"><path d="M8 2l6 11H2L8 2z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M8 6.5v3.2M8 11.2v.1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></div>
    <h2>Couldn’t load player data</h2>
    <p>The request to the data service failed (timeout reaching the Phase 1 API). Your filters are kept — nothing was lost. This is shown instead of an empty table so it never looks like real, complete data.</p>
    <div class="row"><button class="btn primary" id="retry">Retry</button></div></div></div>`;
  return "";
}

/* ============================================================ orchestration */
function render(){
  document.body.classList.toggle("compact",!!S.compact);
  // sign-in replaces everything
  if(U.appState==="signedout"){viewSignIn();return;}
  $("#signin-root").style.display="none";
  $("#app").style.display="grid";
  document.body.classList.remove("signedout-mode");
  renderNav();renderTop();
  const host=$("#view");
  if(U.appState==="noaccount"||U.appState==="error"){host.innerHTML=stateScreen();bind(host);bind($("#topbar"));return;}
  host.innerHTML=U.screen==="nfl"?viewNFL():viewPlayers();
  bind(host);bind($("#topbar"));
  // sparse preview: open the rookie-with-no-games card over the players list
  if(U.appState==="sparse"&&U.screen==="players"&&U.cardId==null){
    const rookie=PLAYERS.find(p=>p.rookieNoGames)||PLAYERS.find(p=>p.status==="IR");
    if(rookie)openCard(rookie.id);
  }
}
function go(screen){U.screen=screen;U.limit=40;if(location.hash!=="#"+screen)history.replaceState(null,"",screen==="players"?location.pathname:"#"+screen);render();}

/* set a scoring/range/etc option and (optionally) recompute */
function setOpt(k,v,recompute){S[k]=v;save();if(recompute)compute();render();}

function bind(root){
  // nav links
  $$("[data-nav]",root).forEach(a=>a.addEventListener("click",e=>{e.preventDefault();go(a.dataset.nav);}));
  // segmented controls
  $$("[data-seg]",root).forEach(el=>el.addEventListener("click",e=>{
    const b=e.target.closest("button");if(!b)return;const k=el.dataset.seg,v=b.dataset.v;
    if(k==="posFilter"){S.posFilter=v;U.limit=40;save();render();return;}
    if(k==="fmt"){setOpt("fmt",v,true);return;}
    if(k==="range"){setOpt("range",v);return;}
    if(k==="nflphase"){U.nflPhase=v;if(v==="reg"&&U.nflWeek>SEASON_WEEKS)U.nflWeek=CUR;render();return;}
    setOpt(k,v);
  }));
  // checkboxes / scoring toggles / compact
  $$("[data-opt]",root).forEach(el=>el.addEventListener("change",()=>{
    const k=el.dataset.opt;setOpt(k,el.checked,k==="tePrem"||k==="ptd6");
  }));
  // filters
  $$("[data-filter]",root).forEach(el=>el.addEventListener("change",()=>{
    const k=el.dataset.filter;S[k]=el.type==="number"?Math.max(0,+el.value||0):el.value;U.limit=40;save();render();
  }));
  // search (preserve focus+caret)
  const sb=$("#psearch",root);
  if(sb)sb.addEventListener("input",()=>{const pos=sb.selectionStart;S.query=sb.value;U.limit=40;save();render();
    const n=$("#psearch");if(n){n.focus();n.setSelectionRange(pos,pos);}});
  // clear all
  ["clearall","clearall2"].forEach(id=>{const b=$("#"+id,root);if(b)b.addEventListener("click",()=>{if(U.appState==="nomatches")U.appState="normal";clearFilters();render();});});
  // column chooser
  const cp=$("#colpick",root);
  if(cp){const btn=cp.querySelector("button");
    btn.addEventListener("click",e=>{e.stopPropagation();cp.classList.toggle("open");btn.setAttribute("aria-expanded",cp.classList.contains("open"));});
    cp.querySelectorAll("input").forEach(i=>i.addEventListener("change",()=>{
      const key=colsKey();const keep=[...cp.querySelectorAll("input")].filter(x=>x.checked).map(x=>x.value);
      S[key]=colsOffered(key).filter(k=>keep.includes(k));  // preserve canonical order
      if(!S[key].length)S[key]=["avg"];
      save();render();const n=$("#colpick");if(n){n.classList.add("open");n.querySelector("button").setAttribute("aria-expanded","true");}
    }));
  }
  // sortable headers
  $$("th[data-sort]",root).forEach(th=>th.addEventListener("click",()=>{
    const k=th.dataset.sort;S.sort=S.sort[0]===k?[k,-S.sort[1]]:[k,["opp","bye"].includes(k)?1:-1];save();render();
  }));
  // show more
  const sm=$("#showmore",root);if(sm)sm.addEventListener("click",()=>{U.limit+=40;render();});
  // row click → player card ; tick → compare
  $$("tr[data-pid]",root).forEach(tr=>tr.addEventListener("click",e=>{
    if(e.target.closest("[data-tick]"))return;openCard(+tr.dataset.pid);
  }));
  $$("[data-tick]",root).forEach(cb=>cb.addEventListener("change",e=>{
    e.stopPropagation();const id=+cb.dataset.tick;
    if(cb.checked){if(U.ticked.length<4&&!U.ticked.includes(id))U.ticked.push(id);}
    else U.ticked=U.ticked.filter(x=>x!==id);render();
  }));
  $$("[data-untick]",root).forEach(b=>b.addEventListener("click",()=>{U.ticked=U.ticked.filter(x=>x!==+b.dataset.untick);render();}));
  const ua=$("#untickall",root);if(ua)ua.addEventListener("click",()=>{U.ticked=[];render();});
  // team links from player table → NFL? no: from NFL game to players
  $$("[data-teamfilter]",root).forEach(a=>a.addEventListener("click",e=>{e.preventDefault();S.posFilter="ALL";S.teamFilter=a.dataset.teamfilter;save();go("players");}));
  // NFL week controls
  const ws=$("#weeksel",root);if(ws)ws.addEventListener("change",()=>{U.nflWeek=+ws.value;render();});
  const wp=$("#weekprev",root);if(wp)wp.addEventListener("click",()=>{U.nflWeek=Math.max(1,U.nflWeek-1);render();});
  const wn=$("#weeknext",root);if(wn)wn.addEventListener("click",()=>{U.nflWeek=Math.min(SEASON_WEEKS,U.nflWeek+1);render();});
  $$("[data-gtoggle]",root).forEach(b=>b.addEventListener("click",()=>{
    const g=$("#g"+b.dataset.gtoggle);const open=g.classList.toggle("open");b.setAttribute("aria-expanded",open);b.textContent=open?"Hide detail":"Game detail";
  }));
  // state banners
  const rf=$("#retryfresh",root);if(rf)rf.addEventListener("click",()=>{U.appState="normal";setState("normal");});
  const rt=$("#retry",root);if(rt)rt.addEventListener("click",()=>{U.appState="normal";setState("normal");});
  // state switcher + account menu (topbar)
  const ss=$("#statesel",root);if(ss)ss.addEventListener("change",()=>setState(ss.value));
  const acct=$("#acct",root);if(acct){
    const toggle=()=>{let pop=$(".menu-pop");if(pop){pop.remove();acct.setAttribute("aria-expanded","false");return;}
      pop=document.createElement("div");pop.className="menu-pop";pop.setAttribute("role","menu");
      pop.innerHTML=`<div class="mhead"><b>William Sanchez</b><small>williamlancelotsanchez@gmail.com</small></div>
        <button data-signout role="menuitem">Sign out</button>`;
      acct.appendChild(pop);acct.setAttribute("aria-expanded","true");
      pop.querySelector("[data-signout]").addEventListener("click",ev=>{ev.stopPropagation();setState("signedout");});};
    acct.addEventListener("click",e=>{if(e.target.closest(".menu-pop"))return;toggle();});
    acct.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();toggle();}});
  }
  $$("[data-signout]",root).forEach(b=>b.addEventListener("click",()=>setState("signedout")));
}

function setState(v){
  U.appState=v;
  if(v==="signedout")U.signedIn=false;
  if(v==="normal"){U.signedIn=true;closeCard();}
  if(v!=="sparse")closeCard();
  render();
}

/* global: close popovers / tooltip / card on escape or outside click */
document.addEventListener("click",e=>{
  if(!e.target.closest(".colpick"))$$(".colpick.open").forEach(c=>{c.classList.remove("open");const b=c.querySelector("button");if(b)b.setAttribute("aria-expanded","false");});
  if(!e.target.closest(".acct")){const p=$(".menu-pop");if(p){p.remove();const a=$("#acct");if(a)a.setAttribute("aria-expanded","false");}}
});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeCard();const p=$(".menu-pop");if(p)p.remove();$("#tip").style.display="none";}});

/* tooltip engine (hover + focus; dismissible with Escape) */
const tip=$("#tip");
function showTip(el){const html=el.getAttribute("data-tip");if(!html)return;tip.innerHTML=html;tip.style.display="block";}
document.addEventListener("mouseover",e=>{const el=e.target.closest("[data-tip]");if(!el){tip.style.display="none";return;}showTip(el);});
document.addEventListener("mousemove",e=>{if(tip.style.display!=="block")return;const r=tip.getBoundingClientRect();
  let x=e.clientX+14,y=e.clientY+16;if(x+r.width>innerWidth-8)x=e.clientX-r.width-14;if(y+r.height>innerHeight-8)y=e.clientY-r.height-16;
  tip.style.left=x+"px";tip.style.top=y+"px";});
document.addEventListener("focusin",e=>{const el=e.target.closest("[data-tip]");if(el){const r=el.getBoundingClientRect();showTip(el);tip.style.left=Math.min(r.left,innerWidth-tip.offsetWidth-8)+"px";tip.style.top=(r.bottom+8)+"px";}});
document.addEventListener("focusout",()=>{tip.style.display="none";});

window.addEventListener("hashchange",()=>{const h=location.hash.replace("#","");if(h==="players"||h==="nfl"){U.screen=h;render();}});

/* ------------------------------------------------------------- boot */
function boot(){
  if(location.hash==="#nfl")U.screen="nfl";
  compute();
  render();
}
boot();
