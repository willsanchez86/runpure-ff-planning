"use strict";
/* ==========================================================================
   Fantasy Workbench — Phase 1 prototype app
   Client-side nav between: Sign in · Players · Player card · NFL
   plus a dev-only state switcher for the 7 required UI states.
   Depends on window.FFW (data.js), loaded first.
   ========================================================================== */
const F = window.FFW;
const {TEAMS,TEAM,ABBRS,PLAYERS,WEEKS,PLAYED,CUR,SEASON,SEASON_WEEKS,SEASONS,OPP,BYE,SCHEDULE,ensureSeason,POS_COUNT}=F;

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
  fmt:"ppr", tePrem:false, ptd6:false, compact:false, range:"season", perGame:false,
  week:PLAYED, cwkFrom:1, cwkTo:PLAYED, rookieOnly:false,
  posFilter:"ALL", teamFilter:"ALL", injFilter:"ALL", byeFilter:"ALL", minGp:0, query:"",
  cols:["total","avg","sd","snap","tgt","opp","trend"],
  colsK:["total","avg","k_fgm","k_fgpct","k_lng50","k_xpm","opp"],
  colsDEF:["total","avg","d_sk","d_int","d_fr","d_td","d_pa","opp"],
  colsIDP:["total","avg","i_tkl","i_sk","i_int","i_pd","snap","opp"],
  sort:["avg",-1],
};
const S = Object.assign({},DEFAULTS,(()=>{try{return JSON.parse(localStorage.getItem("ffwb-p1")||"{}")}catch(e){return{}}})());
// Range is now only Season or Custom — migrate any legacy last-N / single-week state to Season.
if(["l5","l3","week"].includes(S.range))S.range="season";
// Sanitize persisted column/sort state: drop any unknown or removed column keys (e.g. "last3")
// so a user with an old saved set doesn't hit an undefined-column render. (colsOffered is hoisted.)
["cols","colsK","colsDEF","colsIDP"].forEach(k=>{
  if(Array.isArray(S[k])){const offered=colsOffered(k);S[k]=S[k].filter(c=>offered.includes(c));if(!S[k].length)S[k]=DEFAULTS[k].slice();}
});
(function(){const valid=new Set([].concat(colsOffered("cols"),colsOffered("colsK"),colsOffered("colsDEF"),colsOffered("colsIDP")));
  if(!Array.isArray(S.sort)||!valid.has(S.sort[0]))S.sort=DEFAULTS.sort.slice();})();
function save(){try{localStorage.setItem("ffwb-p1",JSON.stringify(S))}catch(e){}}

/* ephemeral UI state (not persisted) */
const U = {
  screen: location.hash.replace("#","")||"players",  // players | nfl
  appState: "normal",   // normal|signedout|noaccount|loading|nomatches|sparse|stale|error
  signedIn: true,
  limit: 40,
  ticked: [],           // player ids ticked for compare
  cardStack: [],        // open player-card tabs (ids, in tab order)
  cardActive: null,     // active player-card tab id
  cardSection: "overview", // active in-card section tab: overview|gamelog|splits|trends|history
  openDD: null,         // which strip dropdown is open: "scoredd" | "rangedd" | "kebabdd" | null
  modal: null,          // non-card overlay: null | "compare" | "columns"
  cfDraft: null,        // draft state for the column/filter modal
  cardLogSeason: SEASON,// heat game-log season pill
  cardUsageSeason: SEASON,
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
const D={fpaRank:{},fpa:{},lg:{},seasonRank:{},weekRank:{}};
function compute(){
  PLAYERS.forEach(p=>{
    p.pts={};for(const w of WEEKS){const s=p.weeks[w];p.pts[w]=s==="BYE"?"BYE":s==null?null:score(p.pos,s);}
    p.priorMean=mean(p.prior.map(s=>score(p.pos,s)));
    p.priorSd=sdev(p.prior.map(s=>score(p.pos,s)));
  });
  // current-season positional ranks: cumulative-by-total and week-by-week (real, from eager data)
  D.seasonRank={};D.weekRank={};D.overallRank={};
  // overall rank across the offensive + K/DEF fantasy pool (IDP ranked within IDP only)
  const poolAll=PLAYERS.filter(p=>!isIDP(p)).map(p=>[p.id,sum(WEEKS.filter(w=>typeof p.pts[w]==="number").map(w=>p.pts[w]))]);
  poolAll.sort((a,b)=>b[1]-a[1]);poolAll.forEach(([id],i)=>D.overallRank[id]=i+1);
  const poolIdp=PLAYERS.filter(p=>isIDP(p)).map(p=>[p.id,sum(WEEKS.filter(w=>typeof p.pts[w]==="number").map(w=>p.pts[w]))]);
  poolIdp.sort((a,b)=>b[1]-a[1]);poolIdp.forEach(([id],i)=>D.overallRank[id]=i+1);
  const POSES=["QB","RB","WR","TE","K","DEF","DB","DL","LB"];
  POSES.forEach(x=>{
    const ps=PLAYERS.filter(p=>p.pos===x);
    const tot=ps.map(p=>[p.id,sum(WEEKS.filter(w=>typeof p.pts[w]==="number").map(w=>p.pts[w]))]);
    tot.sort((a,b)=>b[1]-a[1]);D.seasonRank[x]={};tot.forEach(([id],i)=>D.seasonRank[x][id]=i+1);
    D.weekRank[x]={};
    WEEKS.forEach(w=>{const wk=ps.filter(p=>typeof p.pts[w]==="number").map(p=>[p.id,p.pts[w]]);
      wk.sort((a,b)=>b[1]-a[1]);D.weekRank[x][w]={};wk.forEach(([id],i)=>D.weekRank[x][w][id]=i+1);});
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

/* range window: which played weeks count for averages/totals/highs/lows/vol.
   Supports Season / Last-5 / Last-3 plus a single Week pick and a custom week span. */
function rangeWeeks(p){
  const played=WEEKS.filter(w=>typeof p.pts[w]==="number");
  if(S.range==="custom"){const a=Math.min(+S.cwkFrom,+S.cwkTo),b=Math.max(+S.cwkFrom,+S.cwkTo);
    return played.filter(x=>x>=a&&x<=b);}
  return played;   // Season (the only non-custom range)
}
function rangeLabel(){
  return S.range==="custom"?`Weeks ${Math.min(+S.cwkFrom,+S.cwkTo)}–${Math.max(+S.cwkFrom,+S.cwkTo)}`:"Full season";
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
  const avgOf=k=>{const xs=lines.filter(s=>s&&s[k]!=null).map(s=>s[k]);return xs.length?mean(xs):null;};
  const agg={
    fgm:ag("fg"),fga:ag("fg")+ag("miss"),xpm:ag("xp"),lng50:ag("fg50"),
    sk:ag("sk"),int:ag("int"),fr:ag("fr"),td:ag("td"),
    pa: rw.length?mean(lines.map(s=>s?s.pa:0)):null, ya: rw.length?mean(lines.map(s=>s?s.ya:0)):null,
    solo:ag("solo"),ast:ag("ast"),tkl:ag("solo")+ag("ast"),pd:ag("pd"),
    car:ag("car"),ryd:ag("ryd"),tgt:ag("tg"),rec:ag("rec"),cyd:ag("cyd"),fd:ag("fd"),
    patt:ag("att"),pcmp:ag("cmp"),pyd:ag("pyd"),ptd:ag("ptd"),
    aysh:avgOf("aysh"),wopr:avgOf("wopr"),tgtsh:avgOf("tgtsh"),
  };
  // range splits (home/away; vs Tough/Easy by the opponent's season fpa rank to this position)
  const splitAvg=f=>{const xs=rw.filter(f).map(w=>p.pts[w]);return xs.length?{v:mean(xs),g:xs.length}:null;};
  const oppRank=w=>{const o=p.weeks[w]&&p.weeks[w].opp;return o&&D.fpaRank[o]?D.fpaRank[o][p.pos]:16;};
  const split={
    home:splitAvg(w=>p.weeks[w]&&p.weeks[w].home),
    away:splitAvg(w=>p.weeks[w]&&!p.weeks[w].home),
    tough:splitAvg(w=>oppRank(w)<=8),
    easy:splitAvg(w=>oppRank(w)>=25),
  };
  return{
    gp:vals.length, total:sum(vals), avg:vals.length?mean(vals):null,
    high:vals.length?Math.max(...vals):null, low:vals.length?Math.min(...vals):null,
    sd:vals.length>=3?sdev(vals):null,
    snap:snaps.length?mean(snaps):null, tgt:tg.length?mean(tg)*100:null,
    trend:allPlayed.length>=4?mean(allPlayed.slice(-3).map(w=>p.pts[w]))-mean(allPlayed.slice(0,-3).map(w=>p.pts[w])):0,
    agg, split
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
/* matchup chip: coloured dot + rank number. The difficulty WORD is not shown visually —
   it lives on title + the dot's aria-label so it is never colour-only for assistive tech. */
function matchChip(m){
  return `<span class="ease" title="${m.label} matchup (${ord(m.r)})"><i style="background:${m.color}" role="img" aria-label="${m.label} matchup"></i>${ord(m.r)}</span>`;
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
         return `<span class="matchcell"><span class="dim">vs</span> ${m.o} ${matchChip(m)}</span>`;}},
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
  // --- positional rank & tier (current season, by total fantasy points) ---
  rank:{lab:"Pos rank",tip:"Rank at this position this season by total fantasy points (1 = best). Updates with scoring.",
        get:p=>D.seasonRank[p.pos]&&D.seasonRank[p.pos][p.id]||99999,
        cell:p=>{const r=D.seasonRank[p.pos]&&D.seasonRank[p.pos][p.id];return r?`<span class="num">${p.pos}${r}</span>`:gapCell();}},
  tier:{lab:"Tier",tip:"Positional tier from season rank: T1 elite · T2 strong · T3 startable · T4 bench · T5 deep.",
        get:p=>D.seasonRank[p.pos]&&D.seasonRank[p.pos][p.id]||99999,cell:p=>tierCell(p)},
  // --- efficiency & usage (skill positions) ---
  ypc:{lab:"Y/C",tip:"Rushing yards per carry (range)",get:(p,s)=>s.agg.car?s.agg.ryd/s.agg.car:null,
       cell:(p,s)=>s.agg.car?`<span class="num">${(s.agg.ryd/s.agg.car).toFixed(1)}</span>`:gapCell()},
  ypt:{lab:"Y/Tgt",tip:"Receiving yards per target (range)",get:(p,s)=>s.agg.tgt?s.agg.cyd/s.agg.tgt:null,
       cell:(p,s)=>s.agg.tgt?`<span class="num">${(s.agg.cyd/s.agg.tgt).toFixed(1)}</span>`:gapCell()},
  catch:{lab:"Catch%",tip:"Receptions ÷ targets (range)",get:(p,s)=>s.agg.tgt?s.agg.rec/s.agg.tgt:null,
         cell:(p,s)=>s.agg.tgt?`<span class="num">${Math.round(100*s.agg.rec/s.agg.tgt)}%</span>`:gapCell()},
  fd:{lab:"1D",tip:"First downs produced (range). Per-game when the per-game toggle is on.",get:(p,s)=>s.agg.fd,
      cell:(p,s)=>fmtCount(s.agg.fd,s.gp)},
  aysh:{lab:"AY%",tip:"Air-yards share — share of team air yards, averaged over range.",get:(p,s)=>s.agg.aysh,
        cell:(p,s)=>s.agg.aysh==null?gapCell():`<span class="num">${(s.agg.aysh*100).toFixed(1)}%</span>`},
  wopr:{lab:"WOPR",tip:"Weighted Opportunity Rating ≈ 1.5×target share + 0.7×air-yards share (avg over range).",get:(p,s)=>s.agg.wopr,
        cell:(p,s)=>s.agg.wopr==null?gapCell():`<span class="num">${s.agg.wopr.toFixed(2)}</span>`},
  tgtsh:{lab:"Tgt share",tip:"Share of team targets, averaged over range.",get:(p,s)=>s.agg.tgtsh,
         cell:(p,s)=>s.agg.tgtsh==null?gapCell():`<span class="num">${(s.agg.tgtsh*100).toFixed(1)}%</span>`},
  // --- counting stats (per-game aware via the Per-game toggle) ---
  rec_c:{lab:"Rec",tip:"Receptions (range; per-game when toggled)",get:(p,s)=>s.agg.rec,cell:(p,s)=>fmtCount(s.agg.rec,s.gp)},
  tgt_c:{lab:"Tgt",tip:"Targets (range; per-game when toggled)",get:(p,s)=>s.agg.tgt,cell:(p,s)=>fmtCount(s.agg.tgt,s.gp)},
  recyd:{lab:"Rec yd",tip:"Receiving yards (range; per-game when toggled)",get:(p,s)=>s.agg.cyd,cell:(p,s)=>fmtCount(s.agg.cyd,s.gp)},
  car_c:{lab:"Car",tip:"Carries (range; per-game when toggled)",get:(p,s)=>s.agg.car,cell:(p,s)=>fmtCount(s.agg.car,s.gp)},
  ryd_c:{lab:"Rush yd",tip:"Rushing yards (range; per-game when toggled)",get:(p,s)=>s.agg.ryd,cell:(p,s)=>fmtCount(s.agg.ryd,s.gp)},
  pyd_c:{lab:"Pass yd",tip:"Passing yards (range; per-game when toggled)",get:(p,s)=>s.agg.pyd,cell:(p,s)=>fmtCount(s.agg.pyd,s.gp)},
  ptd_c:{lab:"Pass TD",tip:"Passing touchdowns (range; per-game when toggled)",get:(p,s)=>s.agg.ptd,cell:(p,s)=>fmtCount(s.agg.ptd,s.gp)},
  // --- range splits ---
  split_ha:{lab:"Home/Away",tip:"PPG at home vs away in range, with games played in each split.",
            get:(p,s)=>s.split.home?s.split.home.v:null,l:true,cell:(p,s)=>splitPair(s.split.home,s.split.away,"Home","Away")},
  split_te:{lab:"vs Tough/Easy",tip:"PPG vs Tough (opponent top-8 vs this position) and vs Easy (25th+) defenses in range.",
            get:(p,s)=>s.split.tough?s.split.tough.v:null,l:true,cell:(p,s)=>splitPair(s.split.tough,s.split.easy,"Tough","Easy")},
};
function fmtCount(v,gp,dec){
  if(v==null)return gapCell();
  if(S.perGame)return `<span class="num">${gp?(v/gp).toFixed(dec==null?1:dec):"—"}</span>`;
  return `<span class="num">${Number.isInteger(v)?v:v.toFixed(dec==null?0:dec)}</span>`;
}
function tierCell(p){
  const r=D.seasonRank[p.pos]&&D.seasonRank[p.pos][p.id];if(!r)return gapCell();
  const t=r<=5?1:r<=12?2:r<=24?3:r<=36?4:5;
  return `<span class="tier t${t}" data-tip="Season rank ${p.pos}${r}"><i></i>T${t}</span>`;
}
function splitPair(a,b,la,lb){
  const one=(x,l)=>`<span class="sp"><span class="${x?"num":"gap"}">${x?f1(x.v):"—"}</span><span class="spl">${l} · ${x?x.g:0}g</span></span>`;
  return `<span class="splitpair">${one(a,la)}${one(b,lb)}</span>`;
}
function gapCell(txt){return `<span class="gap" data-tip="A gap, not a zero — no game in range">${txt||"—"}</span>`;}
function snapCell(v){return `<span class="snapbar"><span class="num">${Math.round(v)}%</span><span class="track"><span class="fill" style="width:${Math.round(v)}%"></span></span></span>`;}

/* which column-selection key is active, and which columns are offered */
function colsKey(pos){pos=pos||S.posFilter;return pos==="K"?"colsK":pos==="DEF"?"colsDEF":DEF_POS.includes(pos)?"colsIDP":"cols";}
function colsOffered(key){
  if(key==="colsK")return ["total","avg","high","low","sd","gp","rank","tier","k_fgm","k_fga","k_fgpct","k_lng50","k_xpm","split_ha","split_te","opp","bye","trend","proj"];
  if(key==="colsDEF")return ["total","avg","high","low","sd","gp","rank","tier","d_sk","d_int","d_fr","d_td","d_pa","d_ya","split_ha","split_te","opp","bye","trend","proj"];
  if(key==="colsIDP")return ["total","avg","high","low","sd","gp","rank","tier","i_tkl","i_sk","i_int","i_pd","snap","split_ha","split_te","opp","bye","trend","proj"];
  return ["total","avg","high","low","sd","gp","rank","tier","snap","tgt","tgtsh","aysh","wopr","rec_c","tgt_c","recyd","car_c","ryd_c","pyd_c","ptd_c","ypc","ypt","catch","fd","split_ha","split_te","opp","bye","trend","proj"];
}
/* stat-category presets (the modal's "View" selector; skill-position column set) */
const PRESETS={
  Fantasy:["total","avg","sd","rank","opp","trend"],
  Receiving:["avg","rec_c","tgt_c","recyd","catch","ypt","aysh","opp"],
  Rushing:["avg","car_c","ryd_c","ypc","fd","snap","opp"],
  Efficiency:["avg","ypc","ypt","catch","snap","opp"],
  Usage:["avg","snap","tgtsh","aysh","wopr","opp"],
};

/* ============================================================ shell renders */
const ICON={
  players:'<path d="M2.5 4h11M2.5 8h11M2.5 12h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  nfl:'<rect x="2.5" y="3" width="11" height="10" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8 3v10M2.5 8h11" stroke="currentColor" stroke-width="1.1"/>',
  gameday:'<circle cx="8" cy="8" r="5.3" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8 5v3l2 1.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  waivers:'<path d="M3 6l5-3 5 3-5 3-5-3zM3 10l5 3 5-3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
  review:'<path d="M3 13V8M8 13V3.5M13 13V6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  leagues:'<circle cx="6" cy="6" r="2.2" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="11" cy="10" r="2.2" fill="none" stroke="currentColor" stroke-width="1.3"/>',
  search:'<circle cx="7" cy="7" r="4.3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10.2 10.2L13.5 13.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  sliders:'<path d="M3 5h7M12 5h1.5M3 11h1.5M6 11h7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="10.5" cy="5" r="1.6" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="4.5" cy="11" r="1.6" fill="none" stroke="currentColor" stroke-width="1.4"/>',
  kebab:'<circle cx="8" cy="3.5" r="1.3" fill="currentColor"/><circle cx="8" cy="8" r="1.3" fill="currentColor"/><circle cx="8" cy="12.5" r="1.3" fill="currentColor"/>',
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
    if(S.rookieOnly&&p.exp!==0)return false;
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
/* news chip (Sleeper-style). DESIGNED-FOR stub: Phase 1 has no news feed, so the
   chip only reflects injury/status. Highlighted = unread status update, muted = none. */
function newsChip(p){
  const unread=!!p.status;
  const full={Q:"Questionable",O:"Out",IR:"Injured reserve"}[p.status];
  return `<span class="newschip ${unread?"unread":"none"}" tabindex="0" role="note"
    aria-label="${unread?"Unread status update: "+full:"No unread updates"}"
    data-tip="${unread?`<b>Status update</b> ${full}${p.practice?` · ${esc(p.practice)} in practice`:""}`:"No unread updates"} · News articles are a designed-for stub — Phase 1 drives this chip from injury status only."></span>`;
}
/* trending adds/drops ticker — DESIGNED-FOR stub (needs ownership data; arrives with Leagues) */
/* ---- generic strip dropdown (button + menu; open-state in U.openDD, re-opened across
   render() so multiple options can be toggled; outside-click / Esc close globally) ---- */
function dropdown(id,label,menuHTML,opts){
  opts=opts||{};const open=U.openDD===id;
  return `<div class="ddwrap ${open?"open":""}" id="${id}">
    <button class="btn ddbtn ${opts.cls||""}" type="button" data-dd="${id}" aria-haspopup="true" aria-expanded="${open}">${label}</button>
    <div class="menu ddpanel ${opts.align==="right"?"right":""}" role="menu">${menuHTML}</div></div>`;
}
/* SCORING ▾ — format + TE-premium + 6-pt pass TD (live-updates every number) */
function scoringMenu(){
  const fmtLabel=S.fmt==="ppr"?"Full PPR":S.fmt==="half"?"Half PPR":"Standard";
  const extras=[S.tePrem?"TE+":null,S.ptd6?"6pt":null].filter(Boolean).join(" ");
  const label=`<span class="ddlab">Scoring</span> ${fmtLabel}${extras?` · ${extras}`:""} <span class="ddcaret">▾</span>`;
  const menu=`<div class="ddsec">Format</div>
    ${[["ppr","Full PPR"],["half","Half PPR"],["std","Standard"]].map(([v,l])=>`<button role="menuitemradio" aria-checked="${S.fmt===v}" class="ddopt ${S.fmt===v?"on":""}" data-scorefmt="${v}"><span class="rdot"></span>${l}</button>`).join("")}
    <div class="ddsep"></div>
    <label class="ddchk"><input type="checkbox" data-opt="tePrem" ${S.tePrem?"checked":""}> TE premium <span class="dim">(+0.5/rec, TE)</span></label>
    <label class="ddchk"><input type="checkbox" data-opt="ptd6" ${S.ptd6?"checked":""}> 6-pt pass TD</label>`;
  return dropdown("scoredd",label,menu);
}
/* RANGE ▾ — Season / Last-5 / Last-3 / Custom weeks + Per-game vs Totals */
function rangeMenu(){
  const label=`<span class="ddlab">Range</span> ${rangeLabel()}${S.perGame?" · per-game":""} <span class="ddcaret">▾</span>`;
  const cur=S.range==="custom"?"custom":"season";
  const menu=`<div class="ddsec">Time range</div>
    ${[["season","Season"],["custom","Custom weeks"]].map(([v,l])=>`<button role="menuitemradio" aria-checked="${cur===v}" class="ddopt ${cur===v?"on":""}" data-rangeset="${v}"><span class="rdot"></span>${l}</button>`).join("")}
    ${cur==="custom"?`<div class="ddcustom"><label class="sr-only" for="ddcwf">From week</label><input id="ddcwf" type="number" min="1" max="${PLAYED}" value="${S.cwkFrom}" data-cwk="from" aria-label="From week"> <span class="dim">to</span> <input type="number" min="1" max="${PLAYED}" value="${S.cwkTo}" data-cwk="to" aria-label="To week"></div>`:""}
    <div class="ddsep"></div>
    <label class="ddchk"><input type="checkbox" data-opt="perGame" ${S.perGame?"checked":""}> Per game <span class="dim">(vs totals)</span></label>`;
  return dropdown("rangedd",label,menu);
}
/* overflow ⋯ — Saved views / Export (both "soon", disclosed in one menu, not on the strip) */
function overflowKebab(){
  const menu=`<div class="ddsec">More actions</div>
    <button class="ddopt soondim" disabled data-tip="Save this set of filters, columns, sort and scoring to reuse later. Coming in a later phase.">Saved views <span class="soontag">soon</span></button>
    <button class="ddopt soondim" disabled data-tip="Download the current table as a spreadsheet. Coming in a later phase.">Export <span class="soontag">soon</span></button>`;
  return dropdown("kebabdd",`<svg viewBox="0 0 16 16" aria-hidden="true" width="15" height="15">${ICON.kebab}</svg><span class="sr-only">More actions</span>`,menu,{cls:"icononly",align:"right"});
}
/* top-right Season selector (older years are card-only) */
function seasonPickTop(){
  return `<label class="swi"><span class="sr-only">Season</span>
    <select id="seasonpick" aria-label="Season">
      <option value="${SEASON}" selected>Season ${SEASON}</option>
      ${[SEASON-1,SEASON-2,SEASON-3,SEASON-4].map(y=>`<option value="${y}" disabled>${y} · card only</option>`).join("")}
    </select></label>`;
}
/* Sleeper-style position pill row (ALL · QB · RB · WR · TE · K · DEF · More▾) */
function positionPills(){
  const main=[["ALL","All"],["QB","QB"],["RB","RB"],["WR","WR"],["TE","TE"],["K","K"],["DEF","DEF"]];
  const more=[["FLEX","FLEX · RB/WR/TE"],["IDP","IDP · DB/DL/LB"],["DB","DB"],["DL","DL"],["LB","LB"]];
  const act=more.find(m=>m[0]===S.posFilter);
  return `<div class="pillrow" role="group" aria-label="Position" data-seg="posFilter">
    ${main.map(([v,l])=>`<button type="button" class="pill ${S.posFilter===v?"on":""}" data-v="${v}" aria-pressed="${S.posFilter===v}">${l}</button>`).join("")}
    <div class="morewrap" id="posmore">
      <button type="button" class="pill more ${act?"on":""}" aria-haspopup="true" aria-expanded="false">${act?esc(act[0]):"More"} ▾</button>
      <div class="menu" role="menu">${more.map(([v,l])=>`<button role="menuitem" data-posmore="${v}" class="${S.posFilter===v?"on":""}">${esc(l)}</button>`).join("")}</div>
    </div></div>`;
}
/* two-level grouped stat header (FANTASY · RUSHING · RECEIVING · …) above the column headers */
const COLGROUP={
  total:"FANTASY",avg:"FANTASY",high:"FANTASY",low:"FANTASY",sd:"FANTASY",gp:"FANTASY",rank:"FANTASY",tier:"FANTASY",proj:"FANTASY",
  snap:"USAGE",tgt:"USAGE",tgtsh:"USAGE",aysh:"USAGE",wopr:"USAGE",
  rec_c:"RECEIVING",tgt_c:"RECEIVING",recyd:"RECEIVING",catch:"RECEIVING",ypt:"RECEIVING",
  car_c:"RUSHING",ryd_c:"RUSHING",ypc:"RUSHING",fd:"RUSHING",
  pyd_c:"PASSING",ptd_c:"PASSING",
  k_fgm:"KICKING",k_fga:"KICKING",k_fgpct:"KICKING",k_lng50:"KICKING",k_xpm:"KICKING",
  d_sk:"DEFENSE",d_int:"DEFENSE",d_fr:"DEFENSE",d_td:"DEFENSE",d_pa:"SCORING",d_ya:"SCORING",
  i_tkl:"TACKLES",i_sk:"IMPACT",i_int:"IMPACT",i_pd:"IMPACT",
  split_ha:"SPLITS",split_te:"SPLITS",
  opp:"MATCHUP",bye:"MATCHUP",trend:"MATCHUP",
};
function groupHeaderRow(cols){
  const runs=[];cols.forEach(k=>{const g=COLGROUP[k]||"";const last=runs[runs.length-1];
    if(last&&last.g===g)last.n++;else runs.push({g,n:1});});
  return `<tr class="grouprow"><th class="ns blank" colspan="3"></th>${runs.map(r=>`<th class="grp ${r.g?"":"blank"}" colspan="${r.n}">${r.g}</th>`).join("")}</tr>`;
}
/* next kickoff + opponent for a row, e.g. "Thu 8:15 PM vs WAS" */
function nextKick(p){
  const g=(SCHEDULE[CUR].games||[]).find(x=>x.home===p.team||x.away===p.team);
  if(!g)return `Bye · Wk ${CUR}`;
  const opp=g.home===p.team?g.away:g.home, at=g.home===p.team?"vs":"@";
  return `${g.day} ${g.time} ${at} ${opp}`;
}
function injWord(p){
  if(!p.status)return "";
  const txt={Q:"QUES",O:"OUT",IR:"IR"}[p.status], full={Q:"Questionable",O:"Out",IR:"Injured reserve"}[p.status];
  return ` <span class="injword ${p.status}" data-tip="${full}${p.practice?` · ${esc(p.practice)} in practice`:""}">${txt}</span>`;
}
/* count of active data filters (position lives on the pills; range lives in Range ▾) */
function activeFilterCount(){
  let n=0;
  if(S.teamFilter!=="ALL")n++; if(S.injFilter!=="ALL")n++; if(S.byeFilter!=="ALL")n++;
  if(S.minGp>0)n++; if(S.rookieOnly)n++;
  return n;
}
function columnChooser(){
  const n=activeFilterCount();
  return `<button class="btn iconbtn2" id="opencolmodal" type="button" aria-haspopup="dialog" aria-label="Open columns, views and filters${n?`, ${n} active filters`:""}" data-tip="Columns, the View preset &amp; all filters — the power-user surface (sort is preserved)"><svg viewBox="0 0 16 16" aria-hidden="true">${ICON.sliders}</svg> Columns &amp; filters${n?` <span class="cfbadge num">${n}</span>`:""}</button>`;
}
/* slim results line above the table: live match count + contextual Clear all */
function resultLine(count){
  return `<div class="resultline">
    <span class="count num" aria-live="polite">${count} ${count===1?"player":"players"} match</span>
    ${filtersActive()?`<button class="linkbtn" id="clearall">Clear all</button>`:""}
  </div>`;
}
function filtersActive(){
  return S.posFilter!=="ALL"||S.teamFilter!=="ALL"||S.injFilter!=="ALL"||S.byeFilter!=="ALL"||S.minGp>0||S.query.trim()!==""||S.rookieOnly;
}
function clearFilters(){S.posFilter="ALL";S.teamFilter="ALL";S.injFilter="ALL";S.byeFilter="ALL";S.minGp=0;S.query="";S.rookieOnly=false;U.limit=40;save();}

function playerRow(p,s,cols){
  const ticked=U.ticked.includes(p.id);
  const sub=p.pos==="DEF"?esc(TEAM[p.team].name):`${p.pos} - ${p.team}(${BYE[p.team]})`;
  return `<tr class="clickable ${ticked?"ticked":""}" data-pid="${p.id}">
    <td class="tick"><input type="checkbox" ${ticked?"checked":""} data-tick="${p.id}" aria-label="Select ${esc(p.name)} to compare" ${!ticked&&U.ticked.length>=4?"disabled":""}></td>
    <td class="l"><div class="pcell">
      ${newsChip(p)}
      <button class="addsm soondim" disabled aria-label="Add ${esc(p.name)} — designed-for" data-tip="Add to your team needs a connected league — designed-for stub." onclick="return false">+</button>
      <button class="starsm soondim" disabled aria-label="Watchlist ${esc(p.name)} — designed-for" data-tip="Watchlist needs a league — designed-for stub." onclick="return false">★</button>
      <span class="av" style="background:${avatarBg(p)}" aria-hidden="true">${esc(initials(p))}</span>
      <span class="who"><span class="pname">${esc(p.name)}${injWord(p)}</span>
        <span class="psub">${sub} <span class="kick">· ${nextKick(p)}</span></span></span>
    </div></td>
    <td><span class="pos ${p.pos}">${p.pos}</span></td>
    ${cols.map(k=>{const c=COLS[k];return `<td class="${c.l?"l":""}">${c.cell?c.cell(p,s):f1(c.get(p,s))}</td>`}).join("")}
  </tr>`;
}

function viewPlayers(){
  const key=colsKey(),cols=S[key];
  let list=filteredPlayers();
  // "no matches" preview forces an empty result set
  if(U.appState==="nomatches")list=[];
  const count=list.length;
  const st=count?sortPlayers(list):new Map();
  const [sk,sd]=S.sort;

  const head=`<thead>
    ${groupHeaderRow(cols)}
    <tr>
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

  return `
  <div class="vhead">
    <div><h1>Players</h1><div class="sub">Every NFL player, refreshed daily. ${SEASON} season · through Week ${PLAYED}.</div></div>
  </div>

  ${U.appState==="stale"?staleBanner():""}

  <div class="toolbar striprow1">
    <div class="search wide"><svg viewBox="0 0 16 16" aria-hidden="true">${ICON.search}</svg>
      <input type="search" id="psearch" placeholder="Search player or team code" value="${esc(S.query)}" aria-label="Search players by name or team">
      <span class="kbd" aria-hidden="true">Ctrl +</span>
    </div>
    <div class="spacer"></div>
    ${seasonPickTop()}
    ${overflowKebab()}
  </div>

  <div class="toolbar striprow2">
    ${positionPills()}
    ${scoringMenu()}
    ${rangeMenu()}
    ${columnChooser()}
  </div>

  ${resultLine(count)}

  <div class="card"><div class="tw"><table class="t" aria-label="Player statistics">${head}${body}</table></div>${foot}</div>

  <p class="note">PPG divides by games actually played, shown as “14.2 · 11 GP”. Byes and missed weeks are gaps, never zeros.
     Matchup shows the opponent’s rank in fantasy points allowed to this position with a coloured difficulty dot (green = Easy / 25th-or-worse, red = Tough / 8th-or-better; hover or screen-reader for the word). Every stat here is <b>sample data</b>.</p>

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
  const ready=ps.length>=2;
  return `<div class="cmptray" role="region" aria-label="Compare selection">
    <span class="lab">Compare ${ps.length}/4</span>
    ${ps.map(p=>`<span class="chip"><span class="pos ${p.pos}" style="min-width:26px">${p.pos}</span>${esc(p.name)}
      <button data-untick="${p.id}" aria-label="Remove ${esc(p.name)}">×</button></span>`).join("")}
    <div class="spacer" style="margin-left:auto"></div>
    <button class="btn ${ready?"primary":"soondim"}" id="opencompare" ${ready?"":'disabled aria-disabled="true"'} data-tip="${ready?"Open a side-by-side comparison of the selected players.":"Tick at least two players to compare."}">Compare ${ps.length}</button>
    <button class="linkbtn" id="untickall">Clear</button>
  </div>`;
}

/* ============================================================ modal shell
   One overlay (#scrim) at a time, shared by the player card, Compare and the
   Column/filter modal. removeScrim() tears down the DOM only; closeCard() also
   clears the open-state so ESC / click-outside fully dismiss. */
function removeScrim(){const sc=$("#scrim");if(sc)sc.remove();}
function closeCard(){U.cardStack=[];U.cardActive=null;U.modal=null;U.cfDraft=null;removeScrim();}
const CARD_TAB_CAP=6;
/* open a player card as a TAB — adds to the stack (doesn't replace) and activates it */
function openCard(id){
  U.modal=null;
  if(!U.cardStack.includes(id)){U.cardStack.push(id);if(U.cardStack.length>CARD_TAB_CAP)U.cardStack.shift();}
  U.cardActive=id;U.cardSection="overview";U.cardLogSeason=SEASON;U.cardUsageSeason=SEASON;
  renderCard();
}
function closeCardTab(id){
  U.cardStack=U.cardStack.filter(x=>x!==id);
  if(U.cardActive===id)U.cardActive=U.cardStack[U.cardStack.length-1]||null;
  if(!U.cardStack.length){closeCard();return;}
  renderCard();
}

/* ---- multi-season helpers (lazy-build via FFW.ensureSeason, score per line) ---- */
const START_THRESH={QB:18,RB:12,WR:12,TE:9,K:7,DEF:6,DB:8,DL:8,LB:8};
function seasonSeries(p,year){
  const sea=ensureSeason(p,year);
  if(sea.notInLeague)return{notInLeague:true,entryYear:sea.entryYear,rows:[],meta:sea};
  const rows=[];
  for(let w=1;w<=SEASON_WEEKS;w++){
    const line=sea.weeks[w];let pts=null,kind,team=sea.seasonTeam;
    if(line==="BYE"){kind="bye";}
    else if(line==null){kind=(year===SEASON&&w>PLAYED)?"upcoming":"missed";}
    else{pts=score(p.pos,line);kind="played";team=line.team;}
    const opp=(line&&line!=="BYE")?line.opp:(year===SEASON?OPP[w][p.team]:null);
    rows.push({w,line:(line&&line!=="BYE")?line:null,pts,kind,opp,team,year});
  }
  return{rows,meta:sea};
}
function careerRows(p){
  return SEASONS.map(y=>{
    const ss=seasonSeries(p,y);
    if(ss.notInLeague)return{y,notInLeague:true,entryYear:ss.entryYear};
    const pv=ss.rows.filter(r=>r.kind==="played").map(r=>r.pts);
    const rank=y===SEASON?(D.seasonRank[p.pos]&&D.seasonRank[p.pos][p.id]):ss.meta.rank;
    return{y,gp:pv.length,total:sum(pv),avg:pv.length?mean(pv):null,
      high:pv.length?Math.max(...pv):null,low:pv.length?Math.min(...pv):null,
      sd:pv.length>=3?sdev(pv):null,rank,partial:y===SEASON,team:ss.meta.seasonTeam};
  });
}
function allPlayedLines(p){
  const out=[];SEASONS.forEach(y=>{const ss=seasonSeries(p,y);if(ss.notInLeague)return;
    ss.rows.forEach(r=>{if(r.kind==="played")out.push(r);});});
  return out;
}
/* ---- charts / blocks (hand-rolled inline SVG; accessible, theme-aware) ---- */
function consistencyStrip(p){
  const vals=WEEKS.filter(w=>typeof p.pts[w]==="number").map(w=>({w,v:p.pts[w]}));
  if(!vals.length)return `<div class="inline-empty"><b>No games yet</b></div>`;
  const nums=vals.map(x=>x.v).slice().sort((a,b)=>a-b);
  const floor=nums[0],ceil=nums[nums.length-1],med=nums[Math.floor(nums.length/2)];
  const thr=START_THRESH[p.pos]||10,above=nums.filter(v=>v>=thr).length,pct=Math.round(above/nums.length*100);
  const W=760,H=92,ml=8,mr=8,mt=14,mb=24,max=Math.max(ceil,thr)*1.12||10;
  const X=v=>ml+(Math.max(0,v)/max)*(W-ml-mr);
  const mk=(v,lab,cls)=>`<line x1="${X(v)}" x2="${X(v)}" y1="${mt-6}" y2="${H-mb}" class="cmk ${cls}"/><text x="${X(v)}" y="${H-8}" text-anchor="middle" font-size="10" fill="var(--muted)">${lab} ${f1(v)}</text>`;
  return `<div>
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" role="img" aria-label="Weekly points distribution: floor ${f1(floor)}, median ${f1(med)}, ceiling ${f1(ceil)}; ${pct} percent of games at or above the ${thr}-point start threshold">
      <line x1="${ml}" x2="${W-mr}" y1="${H-mb}" y2="${H-mb}" stroke="var(--line-2)"/>
      <line x1="${X(thr)}" x2="${X(thr)}" y1="${mt-10}" y2="${H-mb}" class="cmk thr"/>
      <text x="${X(thr)}" y="${mt-12}" text-anchor="middle" font-size="9" fill="var(--accent-2)">start ${thr}</text>
      ${vals.map((x,i)=>`<circle cx="${X(x.v)}" cy="${mt+((i*13)%(H-mb-mt-6))}" r="4" fill="var(--accent)" fill-opacity=".82" data-tip="<b>Week ${x.w}</b> · ${f1(x.v)} pts"/>`).join("")}
      ${mk(floor,"Floor","floor")}${mk(med,"Median","med")}${mk(ceil,"Ceiling","ceil")}
    </svg>
    <div class="cfacts"><span><b class="num">${pct}%</b> of games ≥ ${thr} pts (start-worthy)</span>
      <span class="dim">floor ${f1(floor)} · median ${f1(med)} · ceiling ${f1(ceil)} · ${nums.length} games</span></div>
  </div>`;
}
function usagePanels(p,year){
  const ss=seasonSeries(p,year);
  if(ss.notInLeague)return notInLeagueBlock(year,ss.entryYear);
  const metrics=[["snap","Snap %",v=>v,"%"],["tgtsh","Target share",v=>v*100,"%"],["aysh","Air-yards share",v=>v*100,"%"],["wopr","WOPR",v=>v,""]];
  const avail=metrics.filter(m=>ss.rows.some(r=>r.line&&r.line[m[0]]!=null));
  if(!avail.length)return `<div class="inline-empty"><b>No usage data for this position</b>Snap, target and air-yards usage are tracked for skill-position players.</div>`;
  return `<div class="usagegrid">${avail.map(m=>usageOne(p,ss,m)).join("")}</div>`;
}
function usageOne(p,ss,[key,label,conv,unit]){
  const pts=ss.rows.filter(r=>r.line&&r.line[key]!=null).map(r=>({w:r.w,v:conv(r.line[key])}));
  const W=360,H=118,ml=28,mr=10,mt=12,mb=18;
  const max=Math.max(...pts.map(x=>x.v),key==="snap"?100:key==="wopr"?1:8)*1.05;
  const X=w=>ml+(w-1)*(W-ml-mr)/(SEASON_WEEKS-1),Y=v=>mt+(1-v/max)*(H-mt-mb);
  let d="",pen=false;ss.rows.forEach(r=>{if(r.line&&r.line[key]!=null){const v=conv(r.line[key]);d+=(pen?"L":"M")+X(r.w).toFixed(1)+" "+Y(v).toFixed(1);pen=true;}else pen=false;});
  const fmt=v=>unit==="%"?Math.round(v)+"%":v.toFixed(2);
  return `<figure class="usagepanel"><figcaption>${label}</figcaption>
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" role="img" aria-label="${label} by week for ${esc(p.name)}">
      <line x1="${ml}" x2="${W-mr}" y1="${H-mb}" y2="${H-mb}" stroke="var(--line)"/>
      <text x="${ml-5}" y="${Y(max)+7}" text-anchor="end" font-size="9" fill="var(--muted)">${fmt(max)}</text>
      <text x="${ml-5}" y="${Y(0)}" text-anchor="end" font-size="9" fill="var(--muted)">0</text>
      <path d="${d}" fill="none" stroke="var(--accent)" stroke-width="1.75" stroke-linejoin="round" stroke-linecap="round"/>
      ${pts.map(x=>`<circle cx="${X(x.w)}" cy="${Y(x.v)}" r="2.4" fill="var(--accent-2)" data-tip="<b>Wk ${x.w}</b> · ${label} ${fmt(x.v)}"/>`).join("")}
    </svg></figure>`;
}
function rankOverTime(p){
  const has=WEEKS.some(w=>D.weekRank[p.pos]&&D.weekRank[p.pos][w]&&D.weekRank[p.pos][w][p.id]!=null);
  if(!has)return `<div class="inline-empty"><b>No ranked games yet</b></div>`;
  const n=POS_COUNT[p.pos]||48,W=760,H=168,ml=34,mr=14,mt=12,mb=24;
  const X=w=>ml+(w-1)*(W-ml-mr)/(PLAYED-1),Y=r=>mt+((r-1)/(Math.max(1,n-1)))*(H-mt-mb);
  let d="",pen=false;const dots=[];
  WEEKS.forEach(w=>{const r=D.weekRank[p.pos]&&D.weekRank[p.pos][w]&&D.weekRank[p.pos][w][p.id];
    if(r!=null){d+=(pen?"L":"M")+X(w)+" "+Y(r);pen=true;dots.push([w,r]);}else pen=false;});
  let grid="";[1,Math.round(n/3),Math.round(2*n/3),n].forEach(r=>grid+=`<line x1="${ml}" x2="${W-mr}" y1="${Y(r)}" y2="${Y(r)}" stroke="var(--line)"/><text x="${ml-6}" y="${Y(r)+3}" text-anchor="end" font-size="9" fill="var(--muted)">${r}</text>`);
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" role="img" aria-label="${esc(p.name)} ${p.pos} positional rank by week; 1 is best of ${n}. Lower line is better.">
    ${grid}${WEEKS.map(w=>`<text x="${X(w)}" y="${H-8}" text-anchor="middle" font-size="9" fill="var(--muted)">${w}</text>`).join("")}
    <path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2"/>
    ${dots.map(([w,r])=>`<circle cx="${X(w)}" cy="${Y(r)}" r="3.2" fill="var(--accent-2)" data-tip="<b>Week ${w}</b> · ${p.pos}${r} of ${n}"/>`).join("")}
  </svg>`;
}
function splitsBlock(p){
  const rows=allPlayedLines(p);
  if(!rows.length)return `<div class="inline-empty"><b>No games to split</b></div>`;
  const oppRank=r=>{const o=r.line.opp;return o&&D.fpaRank[o]?D.fpaRank[o][p.pos]:16;};
  const indoor=r=>r.line.roof==="dome"||String(r.line.temp).startsWith("Controlled");
  const cats=[
    ["Home / Away",[["Home",r=>r.line.home],["Away",r=>!r.line.home]]],
    ["Indoor / Outdoor",[["Dome / closed",indoor],["Outdoor",r=>!indoor(r)]]],
    ["Surface",[["Grass",r=>r.line.surface==="grass"],["Turf",r=>r.line.surface==="turf"]]],
    ["Matchup difficulty",[["vs Tough",r=>oppRank(r)<=8],["vs Even",r=>oppRank(r)>8&&oppRank(r)<25],["vs Easy",r=>oppRank(r)>=25]]],
    ["Division",[["Division",r=>r.line.div],["Non-division",r=>!r.line.div]]],
    ["By month",["Sep","Oct","Nov","Dec","Jan"].map(mo=>[mo,r=>r.line.month===mo])],
  ];
  const maxV=Math.max(...rows.map(r=>r.pts),10);
  const bar=buckets=>buckets.map(([lab,test])=>{const xs=rows.filter(test).map(r=>r.pts);const v=xs.length?mean(xs):null;
    const w=v==null?0:Math.round(Math.max(0,v)/maxV*100);
    return `<div class="splitrow"><span class="sl">${lab}</span><span class="strack"><span class="sfill" style="width:${w}%"></span></span>
      <span class="sv ${xs.length?"num":"gap"}">${v==null?"—":f1(v)}</span><span class="sg dim">${xs.length}g</span></div>`;}).join("");
  return `<div class="splitgrid" aria-label="Fantasy points per game by split, across loaded seasons">
    ${cats.map(([title,buckets])=>`<div class="splitcat"><div class="sct">${title}</div>${bar(buckets)}</div>`).join("")}</div>
    <p class="note">PPG within each split; the games-played count (e.g. “4g”) is shown so small samples stay visible. Tough/Easy use the opponent’s current-season rank in fantasy points allowed to ${p.pos}.</p>`;
}
function notInLeagueBlock(year,entryYear){return `<div class="inline-empty" style="border:1px solid var(--line);border-radius:10px"><b>Not in the league in ${year}</b>Entered the NFL in ${entryYear||"a later season"}. The real app only shows seasons a player actually played.</div>`;}

/* ===================== Sleeper-style single-scroll modal blocks ===================== */
function posVar(pos){return isIDP(pos)?"--idp":pos==="DEF"?"--def":"--"+pos.toLowerCase();}
function heroBlock(p){
  const pv=posVar(p.pos);
  return `<div class="pc-hero2" style="--pc:var(${pv})">
    <span class="av big" style="background:${avatarBg(p)}" aria-hidden="true">${esc(initials(p))}</span>
    <div class="pc-hid">
      <div class="pc-nm"><h2>${esc(p.name)}</h2>
        <div class="pc-sub"><span class="pos ${p.pos}">${p.pos}</span> <span class="dim">${p.team}${p.jersey?` · #${p.jersey}`:""}</span></div></div>
      <div class="pc-acts">
        <button class="iconbtn soon" disabled aria-label="Add to watchlist — designed-for" data-tip="Watchlist needs a connected league — designed-for stub.">★</button>
        <button class="btn addbtn soon" disabled data-tip="Adding to your team needs a connected league — designed-for stub.">ADD <span class="soontag">soon</span></button>
      </div></div></div>`;
}
function bioStrip(p){
  if(p.pos==="DEF")return `<div class="biostrip"><div class="bi"><span class="bl">TEAM</span><span class="bv">${esc(TEAM[p.team].name)}</span></div><div class="bi"><span class="bl">DIVISION</span><span class="bv">${esc(TEAM[p.team].div)}</span></div><div class="bi"><span class="bl">STADIUM</span><span class="bv">${esc(TEAM[p.team].stadium)}</span></div></div>`;
  const htxt=p.ht?Math.floor(p.ht/12)+"'"+(p.ht%12)+'"':"—";
  const items=[["AGE",p.age||"—"],["HT",htxt],["WT",p.wt?p.wt+" lb":"—"],
    ["EXP",p.exp===0?"Rookie":(p.exp!=null?p.exp+" yr":"—")],["COLLEGE",esc(p.college||"—")],
    ["DRAFT",p.draftRound?`${p.draftYear} R${p.draftRound} #${p.draftPick}`:(p.draftRound===0?"Undrafted":"—")]];
  return `<div class="biostrip">${items.map(([l,v])=>`<div class="bi"><span class="bl">${l}</span><span class="bv">${v}</span></div>`).join("")}</div>`;
}
function rankingsStrip(p){
  const pr=D.seasonRank[p.pos]&&D.seasonRank[p.pos][p.id], ov=D.overallRank[p.id];
  const cell=(big,lab,stub)=>`<div class="rk ${stub?"stub":""}" ${stub?`data-tip="No league connected in Phase 1 — ownership stat is a designed-for stub."`:""}><div class="rv ${stub?"dim":"num"}">${big}</div><div class="rl">${lab}</div></div>`;
  return `<div class="rankstrip" aria-label="Player rankings">
    ${cell(pr?`#${pr} ${p.pos}`:"—",`${p.pos} RANK · est`)}
    ${cell(ov?`#${ov}`:"—",(isIDP(p)?"IDP":"OVERALL")+" · est")}
    ${cell("—","% ROSTERED",true)}
    ${cell("—","% STARTED",true)}
  </div>`;
}
function newsRail(p){
  const has=!!p.status, full={Q:"Questionable",O:"Out",IR:"Injured reserve"}[p.status];
  const head=has?`${esc(p.name)} listed ${full} for Week ${CUR}`:`No recent status updates for ${esc(p.name)}`;
  const when=has?"Today · 6:00 AM ET":"—";
  const fn=esc(p.name.split(" ")[0]);
  const analysis=has
    ?`${fn} carries a ${full} designation into Week ${CUR}${p.practice?` after being ${esc(p.practice.toLowerCase())} in practice`:""}. Treat the tag as the only signal here — Phase 1 has no article feed, so this note is synthesized from injury status, not reporting.`
    :`There are no injury or status notes for ${fn} right now. A real news rail (headlines, beat-writer analysis) connects in a later phase.`;
  return `<aside class="newscard" aria-label="Latest news — designed-for stub">
    <div class="nh">Latest news <span class="soontag" data-tip="Phase 1 has no news feed — synthesized from injury status only.">status only</span></div>
    <div class="nbody"><div class="ntitle">${head}</div>
      <div class="nmeta">${when} · via <b>Status feed</b> <span class="dim">(designed-for)</span></div>
      <p class="nanalysis">${analysis}</p></div></aside>`;
}
function summaryTiles(p){
  const s=pstats(p);
  const cells=[["Total",f1(s.total),""],["PPG",s.avg==null?"—":f1(s.avg),s.gp?`${s.gp} GP`:"no games"],
    ["High",s.high==null?"—":f1(s.high),""],["Low",s.low==null?"—":f1(s.low),""],
    ["Volatility",s.sd==null?"—":f1(s.sd),s.sd==null?"<3 GP":""]];
  return `<div class="summary">${cells.map(([k,v,sub])=>`<div class="cell"><div class="v num">${v}${sub?` <small>${sub}</small>`:""}</div><div class="k">${k}</div></div>`).join("")}</div>`;
}

/* ----- the heat-mapped, grouped game log (Sleeper's signature) ----- */
function c(k,label,opts){return Object.assign({k,label,heat:true,get:l=>l?(l[k]==null?null:l[k]):null},opts||{});}
function cc(k,label,get,opts){return Object.assign({k,label,heat:true,get:l=>l?get(l):null},opts||{});}
function logSpec(pos){
  const FAN=["FANTASY",[{k:"proj",label:"PROJ",proj:true},{k:"fpts",label:"FPTS",fpts:true,heat:true}]];
  const SNP=["",[cc("snap","SNP%",l=>l.snap,{pct:true})]];
  if(pos==="QB")return [FAN,SNP,
    ["PASSING",[c("att","ATT"),c("cmp","CMP"),c("pyd","YD"),c("ptd","TD"),c("int","INT")]],
    ["RUSHING",[c("car","ATT"),c("ryd","YD"),cc("ypc","YPC",l=>l.car?l.ryd/l.car:null,{dec:1}),c("rtd","TD")]],
    ["SACKED",[c("sk","SK"),c("skyd","YDS")]],
    ["FUMBLE",[c("fum","FUM"),c("fuml","LOST")]]];
  if(pos==="RB")return [FAN,SNP,
    ["RUSHING",[c("car","ATT"),c("ryd","YD"),cc("ypc","YPC",l=>l.car?l.ryd/l.car:null,{dec:1}),c("rtd","TD")]],
    ["RECEIVING",[c("tg","TGT"),c("rec","REC"),c("cyd","YD"),c("ctd","TD")]],
    ["FUMBLE",[c("fum","FUM"),c("fuml","LOST")]]];
  if(pos==="WR"||pos==="TE")return [FAN,SNP,
    ["RECEIVING",[c("tg","TGT"),c("rec","REC"),c("cyd","YD"),cc("ypc","Y/T",l=>l.tg?l.cyd/l.tg:null,{dec:1}),c("ctd","TD")]],
    ["USAGE",[cc("tgtsh","TGT%",l=>l.tgtsh!=null?l.tgtsh*100:null,{pct:true,dec:1}),cc("aysh","AY%",l=>l.aysh!=null?l.aysh*100:null,{pct:true,dec:1}),cc("wopr","WOPR",l=>l.wopr,{dec:2})]],
    ["FUMBLE",[c("fum","FUM"),c("fuml","LOST")]]];
  if(pos==="K")return [FAN,
    ["KICKING",[c("fg","FGM"),cc("fga","FGA",l=>(l.fg||0)+(l.miss||0)),cc("fgpct","FG%",l=>{const a=(l.fg||0)+(l.miss||0);return a?100*l.fg/a:null},{pct:true}),c("fg50","50+"),c("xp","XPM")]]];
  if(pos==="DEF")return [FAN,
    ["DEFENSE",[c("sk","SK"),c("int","INT"),c("fr","FR"),c("td","TD"),cc("saf","SAF",l=>l.saf||0)]],
    ["SCORING",[c("pa","PA"),c("ya","YDA")]]];
  return [FAN,SNP,
    ["TACKLES",[c("solo","SOLO"),c("ast","AST"),cc("tot","TOT",l=>(l.solo||0)+(l.ast||0))]],
    ["IMPACT",[c("sk","SK"),cc("tfl","TFL",l=>l.tfl||0),c("int","INT"),c("pd","PD"),c("ff","FF"),c("fr","FR")]]];
}
function gameLogHeat(p,year){
  const ss=seasonSeries(p,year);
  if(ss.notInLeague)return notInLeagueBlock(year,ss.entryYear);
  const spec=logSpec(p.pos), cols=spec.flatMap(g=>g[1]);
  const played=ss.rows.filter(r=>r.kind==="played");
  const dom={};
  cols.forEach(col=>{if(col.proj)return;const key=col.label+col.k;
    const vals=played.map(r=>col.fpts?r.pts:col.get(r.line)).filter(v=>typeof v==="number");
    if(vals.length)dom[key]=[Math.min(...vals),Math.max(...vals)];});
  // polarity is position-aware: a QB's INT/sack/fumble is bad, but a DEF's INT/sack is good.
  const BADKEYS={QB:new Set(["int","sk","skyd","fum","fuml"]),RB:new Set(["fum","fuml"]),WR:new Set(["fum","fuml"]),TE:new Set(["fum","fuml"]),DEF:new Set(["pa","ya"])};
  const badSet=BADKEYS[p.pos]||new Set();
  const heatBg=(col,v)=>{if(v==null||typeof v!=="number")return"";const d=dom[col.label+col.k];if(!d)return"";
    const[mn,mx]=d, t=mx===mn?.4:(v-mn)/(mx-mn), a=(0.05+0.42*t).toFixed(3);
    const rgb=badSet.has(col.k)?"213,81,81":"47,174,95";return `background:rgba(${rgb},${a})`;};
  const fmt=(col,v)=>{if(v==null)return "–";
    if(col.pct)return (col.dec!=null?(+v).toFixed(col.dec):Math.round(v))+"%";
    if(col.dec!=null)return (+v).toFixed(col.dec);
    return Number.isInteger(v)?String(v):String(Math.round(v));};
  const groupHead=spec.map(([gl,gc])=>`<th class="grp ${gl?"":"blank"}" colspan="${gc.length}">${gl}</th>`).join("");
  const colHead=cols.map(col=>`<th class="ns ${col.fpts?"fpts":""} ${col.proj?"projcol":""}">${col.label}</th>`).join("");
  const diffChip=mm=>matchChip(mm);
  const resultCell=r=>{
    const res=weekResult(r.team,r.w);
    if(!res)return `<td class="l res"><span class="gap">—</span></td>`;
    return `<td class="l res"><span class="wl ${res.wl}">${res.wl}</span> <span class="num">${res.us}–${res.them}</span>${res.ot?` <span class="otm">OT</span>`:""}</td>`;
  };
  const rows=year===SEASON?ss.rows:ss.rows.filter(r=>r.kind!=="upcoming");
  const body=rows.map(r=>{
    if(r.kind==="bye"||r.kind==="missed")
      return `<tr class="gaprow"><td class="l wk">Wk ${r.w}</td><td class="l dim" colspan="${cols.length+2}">${r.kind==="bye"?"Bye week":"Did not play"}</td></tr>`;
    const team=r.team!==p.team?`<span class="tradetag" data-tip="Played for ${esc(TEAM[r.team]?TEAM[r.team].name:r.team)}">${r.team}</span> `:"";
    const at=r.line&&!r.line.home?"@ ":(r.opp?"vs ":"");
    if(r.kind==="upcoming"){
      const mm=r.opp==null?null:matchup(p,r.w);
      const opp=r.opp==null?`<span class="gap">BYE</span>`:`${at}${r.opp} ${diffChip(mm)}`;
      const blanks=cols.map(()=>`<td class="upcell"><span class="gap">–</span></td>`).join("");
      return `<tr class="uprow" data-tip="Upcoming — no stats yet; chip shows the opponent's matchup difficulty."><td class="l wk">Wk ${r.w}</td><td class="l res"><span class="gap">—</span></td><td class="l">${opp}</td>${blanks}</tr>`;
    }
    const oppTxt=r.opp?(at+r.opp):"BYE";
    const cells=cols.map(col=>{
      if(col.proj)return `<td class="projcell dim" data-tip="Projections have no Phase 1 source — designed-for stub.">–</td>`;
      const v=col.fpts?r.pts:col.get(r.line);
      return `<td class="${col.fpts?"fpts":""}" style="${heatBg(col,v)}"><span class="num">${v==null?`<span class="gap">–</span>`:fmt(col,v)}</span></td>`;}).join("");
    return `<tr><td class="l wk">Wk ${r.w}</td>${resultCell(r)}<td class="l">${team}${oppTxt}</td>${cells}</tr>`;}).join("");
  return `<div class="card heatwrap"><div class="tw"><table class="t heatlog" aria-label="${year} game log for ${esc(p.name)}: result, opponent and per-week stats; played cells shaded by value within each column; upcoming weeks show matchup difficulty with blank stats">
    <thead><tr class="grouprow"><th class="ns l blank" colspan="3"></th>${groupHead}</tr>
      <tr><th class="l ns">WK</th><th class="l ns">RESULT</th><th class="l ns">OPP</th>${colHead}</tr></thead>
    <tbody>${body}</tbody></table></div>
    <div class="heatnote">RESULT is the team's final score &amp; W/L that week. Cells shaded by magnitude within each column — <span style="color:rgb(47,174,95)">green</span> = production, <span style="color:rgb(213,81,81)">red</span> = negative plays (interceptions, fumbles, sacks taken, points allowed). The number is always shown, so colour is never the only cue. Upcoming weeks keep blank stats and show the opponent's rank with a matchup-difficulty dot (hover or screen-reader for Easy/Even/Tough). <span class="dim">PROJ is a designed-for stub.</span></div></div>`;
}
/* team's final score + W/L that week, joined from the sample SCHEDULE (current season only) */
function weekResult(team,w){
  const g=(SCHEDULE[w]&&SCHEDULE[w].games||[]).find(x=>x.home===team||x.away===team);
  if(!g||!g.played)return null;
  const us=g.home===team?g.homeScore:g.awayScore, them=g.home===team?g.awayScore:g.homeScore;
  return {wl:us>them?"W":us<them?"L":"T", us, them, ot:g.ot};
}
function seasonPills(){
  return `<div class="pills" role="group" aria-label="Game-log season">${SEASONS.slice().reverse().map(y=>`<button class="pill ${+U.cardLogSeason===y?"on":""}" aria-pressed="${+U.cardLogSeason===y}" data-logseason="${y}">${y}</button>`).join("")}</div>`;
}
function careerTable(p){
  const rows=careerRows(p);
  return `<div class="card"><div class="tw"><table class="t wk-table" aria-label="Year over year"><thead><tr>
    <th class="l ns">Season</th><th class="l ns">Team</th><th class="ns">GP</th><th class="ns">Total</th><th class="ns">PPG</th><th class="ns">High</th><th class="ns">Low</th><th class="ns">Vol</th><th class="ns">Pos rank</th>
  </tr></thead><tbody>${rows.map(r=>{
    if(r.notInLeague)return `<tr class="gaprow"><td class="l wk">${r.y}</td><td class="l" colspan="8"><span class="gap">Not in the league yet</span></td></tr>`;
    return `<tr class="${r.partial?"partialrow":""}"><td class="l wk">${r.y}${r.partial?` <span class="partialtag">partial</span>`:""}</td>
      <td class="l">${r.team||p.team}</td>
      <td><span class="num">${r.gp}</span></td>
      <td><span class="num">${f1(r.total)}</span></td>
      <td>${r.avg==null?gapCell():`<span class="num">${f1(r.avg)}</span> <span class="avg-gp">· ${r.gp} GP</span>`}</td>
      <td>${r.high==null?gapCell():`<span class="num">${f1(r.high)}</span>`}</td>
      <td>${r.low==null?gapCell():`<span class="num">${f1(r.low)}</span>`}</td>
      <td>${r.sd==null?`<span class="dim">—</span>`:`<span class="num">${f1(r.sd)}</span>`}</td>
      <td>${r.rank?`<span class="num">${p.pos}${r.rank}</span>`:`<span class="dim">—</span>`}</td></tr>`;}).join("")}</tbody></table></div></div>`;
}
function projStub(p){
  return `<div class="pc-sec"><div class="h"><h3>Projections vs actual</h3><span class="hint">designed-for (est)</span></div>
    <div class="card projstub" aria-disabled="true" data-tip="Projections have no Phase 1 data source. This panel is a disabled, designed-for stub.">
      <div class="projrow"><span class="dim">Next week (Wk ${CUR}) projection</span><span class="num dim">— <span class="avg-gp">est</span></span></div>
      <div class="projrow"><span class="dim">Rest-of-season projection</span><span class="num dim">— <span class="avg-gp">est</span></span></div>
      <p class="note">No projection source in Phase 1 — shown disabled so the surface is sized for it later.</p></div></div>`;
}

/* card Season-summary range control: Season / Last-5 / Last-3 / arbitrary Custom span */
function cardRangeControl(){
  const seg=segBtns("range",[["season","Season"],["custom","Custom"]],S.range);
  let extra="";
  if(S.range==="custom"){
    extra=`<span class="rangecustom" style="margin-left:6px">
      <input type="number" min="1" max="${PLAYED}" value="${S.cwkFrom}" data-ccwk="from" aria-label="From week">
      <span class="dim">to</span>
      <input type="number" min="1" max="${PLAYED}" value="${S.cwkTo}" data-ccwk="to" aria-label="To week"></span>`;
  }
  return seg+extra;
}
/* transaction history — DESIGNED-FOR stub (needs league/roster moves; none in Phase 1) */
function transactionsStub(p){
  return `<div class="pc-sec"><div class="h"><h4>Transaction history</h4><span class="hint">designed-for</span></div>
    <div class="card projstub" aria-disabled="true" data-tip="Roster adds/drops/trades need a connected league — designed-for stub.">
      <div class="projrow"><span class="dim">Recent adds / drops / trades</span><span class="num dim">—</span></div>
      <p class="note">No league connected in Phase 1 — shown disabled so the surface is sized for it later.</p></div></div>`;
}
const SECNAV=[["overview","Overview"],["gamelog","Game log"],["splits","Splits"],["trends","Trends"],["history","History"]];
function renderCard(){
  removeScrim();
  if(U.cardActive==null)return;
  const p=PLAYERS[U.cardActive];const t=TEAM[p.team];
  const statusCls=p.status==="IR"?"ir":p.status==="O"?"o":p.status==="Q"?"q":"";
  const statusName={Q:"Questionable",O:"Out",IR:"Injured reserve"}[p.status]||"Active";
  const m=matchup(p);
  const skill=["QB","RB","WR","TE"].includes(p.pos);
  const s=pstats(p);
  const usageTiles=skill&&!p.rookieNoGames?`<div class="summary small">${[
    ["Snap %",s.snap==null?"—":Math.round(s.snap)+"%"],["Target %",s.tgt==null?"—":s.tgt.toFixed(1)+"%"],
    ["Tgt share",s.agg.tgtsh==null?"—":(s.agg.tgtsh*100).toFixed(1)+"%"],["Air-yards %",s.agg.aysh==null?"—":(s.agg.aysh*100).toFixed(1)+"%"],
    ["WOPR",s.agg.wopr==null?"—":s.agg.wopr.toFixed(2)]].map(([k,v])=>`<div class="cell"><div class="v num">${v}</div><div class="k">${k}</div></div>`).join("")}</div>`:"";

  const overview=`<section class="pc-sec">
    <div class="h"><h3>Season summary</h3><span class="hint">${rangeLabel()} · ${S.fmt.toUpperCase()}</span>
      <div class="spacer" style="margin-left:auto"></div>
      ${cardRangeControl()}</div>
    ${p.rookieNoGames?`<div class="inline-empty" style="border:1px solid var(--line);border-radius:10px"><b>No games yet</b>${esc(p.note||"")}</div>`:summaryTiles(p)}
    ${usageTiles?`<div class="h" style="margin-top:14px"><h4>Usage snapshot</h4><span class="hint">${rangeLabel()} averages</span></div>${usageTiles}`:""}
    ${p.note&&!p.rookieNoGames?`<p class="note">Note: ${esc(p.note)}</p>`:""}
    <div class="h" style="margin-top:16px"><h4>Weekly trend</h4><span class="hint">gaps are byes/missed weeks</span></div>
    <div class="card trend">${trendChart(p)}</div>
    ${!p.rookieNoGames?`<div class="h" style="margin-top:16px"><h4>Consistency — floor to ceiling</h4><span class="hint">weekly points this season</span></div>
      <div class="card" style="padding:10px 12px">${consistencyStrip(p)}</div>`:""}
  </section>`;
  const gamelog=`<section class="pc-sec">
    <div class="h"><h3>Game log</h3><span class="hint">full stat lines + upcoming weeks · heat-mapped</span>
      <div class="spacer" style="margin-left:auto"></div>${seasonPills()}</div>
    ${gameLogHeat(p,+U.cardLogSeason)}</section>`;
  const splits=`<section class="pc-sec">
    <div class="h"><h3>Splits</h3><span class="hint">PPG by situation · across loaded seasons</span></div>
    ${splitsBlock(p)}</section>`;
  const trends=`<section class="pc-sec">
    <div class="h"><h3>Usage &amp; advanced trends</h3><span class="hint">by week</span>
      <div class="spacer" style="margin-left:auto"></div>
      <label class="chk" style="font-size:12px"><span class="dim">Season</span>
        <select id="usageseason" aria-label="Usage season">${SEASONS.slice().reverse().map(y=>`<option value="${y}" ${+U.cardUsageSeason===y?"selected":""}>${y}</option>`).join("")}</select></label></div>
    ${usagePanels(p,+U.cardUsageSeason)}
    <div class="h" style="margin-top:18px"><h4>Positional rank over time</h4><span class="hint">${p.pos} rank by week — lower is better (1 of ${POS_COUNT[p.pos]||"—"})</span></div>
    <div class="card trend">${rankOverTime(p)}</div></section>`;
  const history=`<section class="pc-sec">
    <div class="h"><h3>Year over year</h3><span class="hint">one row per season · ${SEASON} in progress</span></div>
    ${careerTable(p)}
    ${transactionsStub(p)}
    ${projStub(p)}</section>`;
  const SECTIONS={overview,gamelog,splits,trends,history};
  const mainHTML=SECTIONS[U.cardSection]||overview;

  const scrim=document.createElement("div");
  scrim.id="scrim";scrim.className="scrim centered";
  const tabStrip=`<div class="pc-tabstrip" role="tablist" aria-label="Open players">
    ${U.cardStack.map(id=>{const pp=PLAYERS[id];const on=id===U.cardActive;return `<span class="ptab ${on?"on":""}">
      <button class="ptab-sel" role="tab" aria-selected="${on}" data-ptab="${id}"><span class="pos ${pp.pos}">${pp.pos}</span>${esc(pp.name.split(" ").slice(-1)[0])} <span class="dim">${pp.team}</span></button>
      <button class="ptab-x" data-ptabx="${id}" aria-label="Close ${esc(pp.name)} tab">×</button></span>`}).join("")}</div>`;
  scrim.innerHTML=`<div class="pcard sleeper" role="dialog" aria-modal="true" aria-label="${esc(p.name)} player card">
    <div class="pc-top">
      ${tabStrip}
      <span class="spacer" style="margin-left:auto"></span>
      <span class="dim scoringnote">follows ${S.fmt==="ppr"?"Full PPR":S.fmt==="half"?"Half PPR":"Standard"}</span>
      <button class="close" id="cardclose" aria-label="Close player card">×</button>
    </div>
    <div class="pc-body sleeperbody">
      ${heroBlock(p)}
      ${bioStrip(p)}
      ${rankingsStrip(p)}
      <div class="pc-status">
        <span class="statusbar ${statusCls}"><span class="k">Status</span> ${statusName}${p.status?` (Wk ${CUR})`:""}</span>
        ${p.practice?`<span class="statusbar"><span class="k">Practice</span> ${p.practice}</span>`:""}
        ${m?`<span class="statusbar"><span class="k">Wk ${CUR}</span> vs ${m.o} ${matchChip(m)}</span>`:`<span class="statusbar"><span class="k">Wk ${CUR}</span> Bye</span>`}
        <a href="#nfl" class="linkbtn" data-teamlink="${p.team}">${esc(t.name)} →</a>
      </div>
      <nav class="secnav" role="tablist" aria-label="Player sections">
        ${SECNAV.map(([id,l])=>{const on=id===U.cardSection;return `<button class="secnav-b ${on?"on":""}" role="tab" aria-selected="${on}" data-secnav="${id}">${l}</button>`}).join("")}
      </nav>
      <div class="pc-grid">
        <div class="pc-main" role="tabpanel">${mainHTML}</div>
        <div class="pc-rail">${newsRail(p)}</div>
      </div>
    </div>
  </div>`;
  document.body.appendChild(scrim);
  bindCard(scrim);
}
/* render a stat line from a stored line object (works for current + historical lines) */
function statLineFromLine(pos,s){
  if(!s)return "—";
  switch(pos){
    case"QB":return `${s.cmp}/${s.att}, ${s.pyd} yd, ${s.ptd} TD${s.int?`, ${s.int} INT`:""}${s.ryd>9?` · ${s.ryd} rush`:""}`;
    case"RB":return `${s.car} car, ${s.ryd} yd${s.rtd?`, ${s.rtd} TD`:""} · ${s.rec}/${s.tg} rec, ${s.cyd} yd${s.ctd?`, ${s.ctd} TD`:""}`;
    case"WR":case"TE":return `${s.rec}/${s.tg} rec, ${s.cyd} yd${s.ctd?`, ${s.ctd} TD`:""}${s.ryd?` · ${s.ryd} rush`:""}`;
    case"K":return `${s.fg}/${s.fg+s.miss} FG${s.fg50?` (${s.fg50} from 50+)`:""}, ${s.xp} XP`;
    case"DEF":return `${s.pa} allowed, ${s.sk} sk, ${s.int} INT${s.fr?`, ${s.fr} FR`:""}${s.td?`, ${s.td} TD`:""}`;
    default:return `${s.solo+s.ast} tkl (${s.solo} solo)${s.sk?`, ${s.sk} sk`:""}${s.int?`, ${s.int} INT`:""}${s.pd?`, ${s.pd} PD`:""}${s.ff?`, ${s.ff} FF`:""}`;
  }
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
  // multi-player tabs: select / close a tab; arrow keys move between tabs
  $$("[data-ptab]",root).forEach(b=>b.addEventListener("click",()=>{U.cardActive=+b.dataset.ptab;renderCard();}));
  $$("[data-ptabx]",root).forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();closeCardTab(+b.dataset.ptabx);}));
  const ptabs=$$(".ptab-sel",root);
  ptabs.forEach((b,i)=>b.addEventListener("keydown",e=>{
    if(e.key==="ArrowRight"||e.key==="ArrowLeft"){e.preventDefault();
      const n=(i+(e.key==="ArrowRight"?1:ptabs.length-1))%ptabs.length;
      U.cardActive=+ptabs[n].dataset.ptab;renderCard();
      const nb=$(".ptab.on .ptab-sel",$("#scrim"));if(nb&&nb.focus)nb.focus();}}));
  // in-modal section nav — REAL tabs: swap the main-column content (arrow-key navigable)
  const navBtns=$$(".secnav-b",root);
  navBtns.forEach(b=>b.addEventListener("click",()=>{U.cardSection=b.dataset.secnav;renderCard();}));
  navBtns.forEach((b,i)=>b.addEventListener("keydown",e=>{
    if(e.key==="ArrowRight"||e.key==="ArrowLeft"){e.preventDefault();
      const n=(i+(e.key==="ArrowRight"?1:navBtns.length-1))%navBtns.length;
      U.cardSection=navBtns[n].dataset.secnav;renderCard();
      const nb=$(".secnav-b.on",$("#scrim"));if(nb&&nb.focus)nb.focus();}}));
  // season pills (game log)
  $$("[data-logseason]",root).forEach(b=>b.addEventListener("click",()=>{U.cardLogSeason=+b.dataset.logseason;renderCard();}));
  // Season-summary range: Season/Last-5/Last-3/Custom + arbitrary week-span inputs
  $$("[data-seg=range]",root).forEach(el=>el.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;S.range=b.dataset.v;save();render();renderCard();}));
  $$("[data-ccwk]",root).forEach(inp=>inp.addEventListener("change",()=>{
    const k=inp.dataset.ccwk==="from"?"cwkFrom":"cwkTo";S[k]=Math.max(1,Math.min(PLAYED,+inp.value||1));save();render();renderCard();}));
  // usage season selector
  const us=$("#usageseason",root);if(us)us.addEventListener("change",()=>{U.cardUsageSeason=+us.value;renderCard();});
  // open another player's card (adds a tab)
  $$("[data-openpid]",root).forEach(a=>a.addEventListener("click",e=>{e.preventDefault();openCard(+a.dataset.openpid);}));
  const tl=$("[data-teamlink]",root);if(tl)tl.addEventListener("click",e=>{e.preventDefault();closeCard();S.posFilter="ALL";S.teamFilter=tl.dataset.teamlink;save();go("players");});
}

/* ============================================================ shared modal shell */
function mountModal(cls,titleHTML,bodyHTML,binder,ariaLabel){
  removeScrim();
  const scrim=document.createElement("div");
  scrim.id="scrim";scrim.className="scrim centered";
  scrim.innerHTML=`<div class="pcard ${cls}" role="dialog" aria-modal="true" aria-label="${ariaLabel}">
    <div class="pc-top">${titleHTML}<span class="spacer" style="margin-left:auto"></span>
      <button class="close" id="modalclose" aria-label="Close">×</button></div>
    <div class="pc-body modalbody">${bodyHTML}</div></div>`;
  document.body.appendChild(scrim);
  $("#modalclose",scrim).addEventListener("click",closeCard);
  scrim.addEventListener("mousedown",e=>{if(e.target===scrim)closeCard();});
  if(binder)binder(scrim);
}

/* ============================================================ Compare modal (2–4) */
function openCompare(){if(U.ticked.length<2)return;U.modal="compare";U.cardStack=[];U.cardActive=null;renderCompare();}
function cmpPosRows(pos){
  const g=(fn)=>(p,s)=>fn(s);
  if(pos==="QB")return[
    ["Pass yd / g","hi",g(s=>s.gp?s.agg.pyd/s.gp:null),v=>v==null?"—":v.toFixed(1)],
    ["Pass TD","hi",g(s=>s.agg.ptd),v=>String(v)],
    ["INT","lo",g(s=>s.agg.int),v=>String(v)],
    ["Rush yd / g","hi",g(s=>s.gp?s.agg.ryd/s.gp:null),v=>v==null?"—":v.toFixed(1)]];
  if(pos==="RB")return[
    ["Rush yd / g","hi",g(s=>s.gp?s.agg.ryd/s.gp:null),v=>v==null?"—":v.toFixed(1)],
    ["Yards / carry","hi",g(s=>s.agg.car?s.agg.ryd/s.agg.car:null),v=>v==null?"—":v.toFixed(1)],
    ["Rush TD","hi",g(s=>s.agg.td||0),v=>String(v)],
    ["Rec / g","hi",g(s=>s.gp?s.agg.rec/s.gp:null),v=>v==null?"—":v.toFixed(1)],
    ["Rec yd / g","hi",g(s=>s.gp?s.agg.cyd/s.gp:null),v=>v==null?"—":v.toFixed(1)]];
  if(pos==="WR"||pos==="TE")return[
    ["Rec / g","hi",g(s=>s.gp?s.agg.rec/s.gp:null),v=>v==null?"—":v.toFixed(1)],
    ["Tgt / g","hi",g(s=>s.gp?s.agg.tgt/s.gp:null),v=>v==null?"—":v.toFixed(1)],
    ["Rec yd / g","hi",g(s=>s.gp?s.agg.cyd/s.gp:null),v=>v==null?"—":v.toFixed(1)],
    ["Yards / tgt","hi",g(s=>s.agg.tgt?s.agg.cyd/s.agg.tgt:null),v=>v==null?"—":v.toFixed(1)],
    ["Target share","hi",g(s=>s.agg.tgtsh),v=>v==null?"—":(v*100).toFixed(1)+"%"],
    ["Air-yards %","hi",g(s=>s.agg.aysh),v=>v==null?"—":(v*100).toFixed(1)+"%"]];
  if(pos==="K")return[
    ["FG made","hi",g(s=>s.agg.fgm),v=>String(v)],
    ["FG %","hi",g(s=>s.agg.fga?s.agg.fgm/s.agg.fga:null),v=>v==null?"—":Math.round(v*100)+"%"],
    ["50+ made","hi",g(s=>s.agg.lng50),v=>String(v)],
    ["XP made","hi",g(s=>s.agg.xpm),v=>String(v)]];
  if(pos==="DEF")return[
    ["Sacks","hi",g(s=>s.agg.sk),v=>String(v)],
    ["INT","hi",g(s=>s.agg.int),v=>String(v)],
    ["Fumble rec","hi",g(s=>s.agg.fr),v=>String(v)],
    ["TD","hi",g(s=>s.agg.td),v=>String(v)],
    ["Pts allowed / g","lo",g(s=>s.agg.pa),v=>v==null?"—":v.toFixed(1)]];
  return[ // IDP
    ["Tackles","hi",g(s=>s.agg.tkl),v=>String(v)],
    ["Sacks","hi",g(s=>s.agg.sk),v=>v.toFixed(v%1?1:0)],
    ["INT","hi",g(s=>s.agg.int),v=>String(v)],
    ["Passes def","hi",g(s=>s.agg.pd),v=>String(v)]];
}
function renderCompare(){
  const ps=U.ticked.slice(0,4).map(id=>PLAYERS[id]);
  if(ps.length<2){closeCard();render();return;}
  const stx=new Map(ps.map(p=>[p.id,pstats(p)]));
  const samePos=ps.every(p=>p.pos===ps[0].pos)?ps[0].pos:null;
  const shared=[
    ["Total pts","hi",(p,s)=>s.total,v=>f1(v)],
    ["Points / game","hi",(p,s)=>s.avg,v=>v==null?"—":f1(v)],
    ["High","hi",(p,s)=>s.high,v=>v==null?"—":f1(v)],
    ["Low","hi",(p,s)=>s.low,v=>v==null?"—":f1(v)],
    ["Volatility","lo",(p,s)=>s.sd,v=>v==null?"—":f1(v)],
    ["Games played","hi",(p,s)=>s.gp,v=>String(v)],
    ["Snap %","hi",(p,s)=>s.snap,v=>v==null?"—":Math.round(v)+"%"],
    ["Target %","hi",(p,s)=>s.tgt,v=>v==null?"—":v.toFixed(1)+"%"],
    ["Position rank","lo",(p)=>D.seasonRank[p.pos]&&D.seasonRank[p.pos][p.id],(v,p)=>v?p.pos+v:"—"],
  ];
  const row=(label,dir,getFn,fmtFn)=>{
    const vals=ps.map(p=>getFn(p,stx.get(p.id)));
    const nums=vals.filter(v=>typeof v==="number");
    const best=nums.length?(dir==="lo"?Math.min(...nums):Math.max(...nums)):null;
    const allEq=nums.length&&nums.every(v=>v===nums[0]);
    return `<tr><td class="l">${label}</td>${vals.map((v,i)=>{
      const lead=typeof v==="number"&&best!=null&&v===best&&!allEq&&nums.length>1;
      return `<td class="${lead?"lead":""}"><span class="num">${fmtFn(v,ps[i])}</span>${lead?` <span class="bestmark" aria-label="best in row">▲&nbsp;best</span>`:""}</td>`;}).join("")}</tr>`;
  };
  const head=`<thead><tr><th class="l ns">Metric</th>${ps.map(p=>`<th class="ns cmphead"><div class="cmpchip">
    <span class="av" style="background:${avatarBg(p)}" aria-hidden="true">${esc(initials(p))}</span>
    <div class="ci"><a href="#" class="cn" data-openpid="${p.id}">${esc(p.name)}</a><div class="cs dim">${p.pos} - ${p.team}</div></div>
    <button class="cmprm" data-cmprm="${p.id}" aria-label="Remove ${esc(p.name)} from comparison">×</button></div></th>`).join("")}</tr></thead>`;
  const sparkRow=`<tr class="cmpspark"><td class="l">Weekly trend</td>${ps.map(p=>`<td>${spark(p)}</td>`).join("")}</tr>`;
  const sharedRows=shared.map(r=>row(r[0],r[1],r[2],r[3])).join("");
  const posSection=samePos
    ? `<tr class="cmpsec"><td class="l" colspan="${ps.length+1}">${samePos} stats · per game where noted</td></tr>`+cmpPosRows(samePos).map(r=>row(r[0],r[1],r[2],r[3])).join("")
    : `<tr class="cmpsec"><td class="l" colspan="${ps.length+1}">Position-specific rows hidden — the selected players don't share a position.</td></tr>`;
  const body=`<div class="tw"><table class="t cmptable" aria-label="Player comparison">${head}<tbody>${sparkRow}${sharedRows}${posSection}</tbody></table></div>
    <div class="cmpfoot"><span class="dim">Follows the list's scoring (${S.fmt.toUpperCase()}) and range (${rangeLabel()}). “▲ best” marks the leader in each row — not colour-only.</span>
      <button class="linkbtn" id="cmpclear">Clear all</button></div>`;
  mountModal("comparemodal",`<b>Compare players</b> <span class="dim">· ${ps.length} selected</span>`,body,bindCompare,"Compare players");
}
function bindCompare(root){
  $$("[data-cmprm]",root).forEach(b=>b.addEventListener("click",()=>{
    U.ticked=U.ticked.filter(x=>x!==+b.dataset.cmprm);
    if(U.ticked.length<2){closeCard();render();}else renderCompare();}));
  const clr=$("#cmpclear",root);if(clr)clr.addEventListener("click",()=>{U.ticked=[];closeCard();render();});
  $$("[data-openpid]",root).forEach(a=>a.addEventListener("click",e=>{e.preventDefault();openCard(+a.dataset.openpid);}));
}

/* ============================================================ Column / filter modal */
const COLCAT={
  total:"Fantasy",avg:"Fantasy",high:"Fantasy",low:"Fantasy",sd:"Fantasy",gp:"Fantasy",rank:"Fantasy",tier:"Fantasy",opp:"Fantasy",bye:"Fantasy",trend:"Fantasy",proj:"Fantasy",
  pyd_c:"Passing",ptd_c:"Passing",
  car_c:"Rushing",ryd_c:"Rushing",
  rec_c:"Receiving",tgt_c:"Receiving",recyd:"Receiving",
  snap:"Usage",tgt:"Usage",tgtsh:"Usage",aysh:"Usage",wopr:"Usage",
  ypc:"Efficiency",ypt:"Efficiency",catch:"Efficiency",fd:"Efficiency",
  d_sk:"Defense / IDP",d_int:"Defense / IDP",d_fr:"Defense / IDP",d_td:"Defense / IDP",d_pa:"Defense / IDP",d_ya:"Defense / IDP",
  i_tkl:"Defense / IDP",i_sk:"Defense / IDP",i_int:"Defense / IDP",i_pd:"Defense / IDP",
  k_fgm:"Kicking",k_fga:"Kicking",k_fgpct:"Kicking",k_lng50:"Kicking",k_xpm:"Kicking",
  split_ha:"Splits",split_te:"Splits",
};
const CATORDER=["Fantasy","Passing","Rushing","Receiving","Usage","Efficiency","Defense / IDP","Kicking","Splits"];
function openColumns(){
  U.modal="columns";U.cardStack=[];U.cardActive=null;U.openDD=null;
  U.cfDraft={posFilter:S.posFilter,teamFilter:S.teamFilter,injFilter:S.injFilter,byeFilter:S.byeFilter,
    minGp:S.minGp,rookieOnly:S.rookieOnly,range:(S.range==="week"?"season":S.range),cwkFrom:S.cwkFrom,cwkTo:S.cwkTo,
    compact:S.compact,cols:[...S[colsKey(S.posFilter)]]};
  renderColumns();
}
function renderColumns(){
  const d=U.cfDraft;const key=colsKey(d.posFilter);const offered=colsOffered(key);
  const byCat={};offered.forEach(k=>{const c=COLCAT[k]||"Fantasy";(byCat[c]||(byCat[c]=[])).push(k);});
  const colBlock=CATORDER.filter(c=>byCat[c]).map(c=>`<div class="cfcat"><div class="cft">${c}</div>
    <div class="cfcols">${byCat[c].map(k=>`<label class="cfcol"><input type="checkbox" data-col="${k}" ${d.cols.includes(k)?"checked":""}> ${esc(COLS[k].lab)}</label>`).join("")}</div></div>`).join("");
  const byes=[...new Set(ABBRS.map(t=>BYE[t]))].sort((a,b)=>a-b);
  const posOpts=[["ALL","All positions"],["QB","QB"],["RB","RB"],["WR","WR"],["TE","TE"],["K","K"],["DEF","DEF"],["FLEX","FLEX (RB/WR/TE)"],["IDP","IDP (DB/DL/LB)"],["DB","DB"],["DL","DL"],["LB","LB"]];
  const filterBlock=`<div class="cffilters">
    <div class="cff"><label for="cfpos">Position</label><select id="cfpos" data-cf="posFilter">${posOpts.map(([v,l])=>`<option value="${v}" ${d.posFilter===v?"selected":""}>${esc(l)}</option>`).join("")}</select></div>
    <div class="cff"><label for="cfteam">Team</label><select id="cfteam" data-cf="teamFilter"><option value="ALL">All teams</option>${ABBRS.slice().sort().map(t=>`<option value="${t}" ${d.teamFilter===t?"selected":""}>${t} — ${esc(TEAM[t].nick)}</option>`).join("")}</select></div>
    <div class="cff"><label for="cfinj">Injury</label><select id="cfinj" data-cf="injFilter">${[["ALL","Any status"],["HEALTHY","Healthy only"],["Q","Questionable"],["O","Out"],["IR","Injured reserve"]].map(([v,l])=>`<option value="${v}" ${d.injFilter===v?"selected":""}>${l}</option>`).join("")}</select></div>
    <div class="cff"><label for="cfbye">Bye week</label><select id="cfbye" data-cf="byeFilter"><option value="ALL">Any</option>${byes.map(b=>`<option value="${b}" ${String(d.byeFilter)===String(b)?"selected":""}>Week ${b}</option>`).join("")}</select></div>
    <div class="cff"><label for="cfgp">Min games</label><input id="cfgp" type="number" min="0" max="${PLAYED}" value="${d.minGp}" data-cf="minGp"></div>
    <div class="cff"><label for="cfrange">Week range</label><select id="cfrange" data-cf="range">${[["season","Full season"],["custom","Custom weeks"]].map(([v,l])=>`<option value="${v}" ${d.range===v?"selected":""}>${l}</option>`).join("")}</select></div>
    ${d.range==="custom"?`<div class="cff"><label>Weeks</label><span class="cfwk"><input type="number" min="1" max="${PLAYED}" value="${d.cwkFrom}" data-cf="cwkFrom" aria-label="From week"> <span class="dim">to</span> <input type="number" min="1" max="${PLAYED}" value="${d.cwkTo}" data-cf="cwkTo" aria-label="To week"></span></div>`:""}
    <div class="cff check"><label class="chk" data-tip="Only rookies (0 years experience)"><input type="checkbox" data-cf="rookieOnly" ${d.rookieOnly?"checked":""}> Rookies only</label></div>
    <div class="cff check"><label class="chk soondim" data-tip="Only players not on any roster — needs a connected league."><input type="checkbox" disabled> Free agents <span class="dim">needs a connected league — later</span></label></div>
    <div class="cff check"><label class="chk soondim" data-tip="Only your watchlist — needs a connected league."><input type="checkbox" disabled> Watchlist <span class="dim">needs a connected league — later</span></label></div>
  </div>`;
  const viewRow=`<div class="cfview"><div class="cft">View preset</div>
    <div class="cfviewrow">${Object.keys(PRESETS).map(n=>`<button type="button" class="pill" data-viewpreset="${n}">${n}</button>`).join("")}</div>
    <div class="dim" style="font-size:11px;margin-top:4px">${key==="cols"?"swaps the visible skill-position columns below":"presets are tuned to skill positions"}</div></div>`;
  const displayRow=`<div class="cfdisplay"><div class="cft">Display</div>
    <label class="chk" data-tip="Tighter row height for more rows on screen"><input type="checkbox" data-cf="compact" ${d.compact?"checked":""}> Compact rows</label>
    <p class="note" style="margin-top:8px">Projections — coming later (no Phase 1 data source).</p></div>`;
  const body=`<div class="cfgrid">
    <section class="cfside"><h3>Filters</h3>${filterBlock}${displayRow}
      <p class="note">Applying preserves your current sort.</p></section>
    <section class="cfmain">${viewRow}<h3>Columns <span class="dim">· ${esc(key==="colsK"?"Kicker":key==="colsDEF"?"Team defense":key==="colsIDP"?"IDP":"skill")} set</span></h3>${colBlock}</section>
  </div>
  <div class="cfactions"><button class="linkbtn" id="cfreset">Reset to defaults</button><div class="spacer" style="margin-left:auto"></div>
    <button class="btn" id="cfcancel">Cancel</button><button class="btn primary" id="cfapply">Apply</button></div>`;
  mountModal("colmodal",`<b>Columns, views &amp; filters</b>`,body,bindColumns,"Columns, views and filters");
}
function bindColumns(root){
  $$("[data-col]",root).forEach(cb=>cb.addEventListener("change",()=>{
    const k=cb.value,d=U.cfDraft;if(cb.checked){if(!d.cols.includes(k))d.cols.push(k);}else d.cols=d.cols.filter(x=>x!==k);}));
  // "View" preset — stages the draft column set (skill-position columns)
  $$("[data-viewpreset]",root).forEach(b=>b.addEventListener("click",()=>{
    const d=U.cfDraft,key=colsKey(d.posFilter),off=colsOffered(key);
    d.cols=off.filter(k=>(PRESETS[b.dataset.viewpreset]||[]).includes(k));
    if(!d.cols.length)d.cols=["avg"];renderColumns();}));
  $$("[data-cf]",root).forEach(el=>el.addEventListener("change",()=>{
    const k=el.dataset.cf,d=U.cfDraft;
    if(el.type==="checkbox")d[k]=el.checked;
    else d[k]=el.type==="number"?Math.max(0,+el.value||0):el.value;
    if(k==="posFilter")d.cols=[...S[colsKey(d.posFilter)]];
    if(k==="posFilter"||k==="range")renderColumns();}));
  $("#cfapply",root).addEventListener("click",applyColumns);
  const rs=$("#cfreset",root);if(rs)rs.addEventListener("click",resetColumns);
  const cc=$("#cfcancel",root);if(cc)cc.addEventListener("click",closeCard);
}
function applyColumns(){
  const d=U.cfDraft;if(!d)return;
  S.posFilter=d.posFilter;S.teamFilter=d.teamFilter;S.injFilter=d.injFilter;S.byeFilter=d.byeFilter;
  S.minGp=Math.max(0,+d.minGp||0);S.rookieOnly=!!d.rookieOnly;S.range=d.range;S.compact=!!d.compact;
  S.cwkFrom=Math.max(1,Math.min(PLAYED,+d.cwkFrom||1));S.cwkTo=Math.max(1,Math.min(PLAYED,+d.cwkTo||PLAYED));
  const key=colsKey(d.posFilter),offered=colsOffered(key);
  S[key]=offered.filter(k=>d.cols.includes(k));if(!S[key].length)S[key]=["avg"];
  U.limit=40;save();closeCard();render();   // sort (S.sort) is untouched → preserved
}
function resetColumns(){
  U.cfDraft={posFilter:"ALL",teamFilter:"ALL",injFilter:"ALL",byeFilter:"ALL",minGp:0,rookieOnly:false,
    range:"season",cwkFrom:1,cwkTo:PLAYED,compact:false,cols:[...DEFAULTS[colsKey("ALL")]]};
  renderColumns();
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
  if(U.appState==="sparse"&&U.screen==="players"&&U.cardActive==null){
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
    if(v===undefined)return;   // e.g. the position "More ▾" pill has no data-v
    if(k==="posFilter"){S.posFilter=v;U.limit=40;save();render();return;}
    if(k==="fmt"){setOpt("fmt",v,true);return;}
    if(k==="range"){setOpt("range",v);return;}
    if(k==="nflphase"){U.nflPhase=v;if(v==="reg"&&U.nflWeek>SEASON_WEEKS)U.nflWeek=CUR;render();return;}
    setOpt(k,v);
  }));
  // checkboxes / scoring toggles / per-game (used inside Scoring ▾ and Range ▾ menus)
  $$("[data-opt]",root).forEach(el=>el.addEventListener("change",()=>{
    const k=el.dataset.opt;setOpt(k,el.checked,k==="tePrem"||k==="ptd6");
  }));
  // strip dropdowns (Scoring ▾ / Range ▾ / ⋯): toggle open-state, re-rendered open
  $$("[data-dd]",root).forEach(b=>b.addEventListener("click",e=>{
    e.stopPropagation();const id=b.dataset.dd;U.openDD=U.openDD===id?null:id;render();}));
  $$("[data-scorefmt]",root).forEach(b=>b.addEventListener("click",()=>{S.fmt=b.dataset.scorefmt;save();compute();render();}));
  $$("[data-rangeset]",root).forEach(b=>b.addEventListener("click",()=>{S.range=b.dataset.rangeset;U.limit=40;save();render();}));
  // search (preserve focus+caret)
  const sb=$("#psearch",root);
  if(sb)sb.addEventListener("input",()=>{const pos=sb.selectionStart;S.query=sb.value;U.limit=40;save();render();
    const n=$("#psearch");if(n){n.focus();n.setSelectionRange(pos,pos);}});
  // custom week span (inside Range ▾)
  $$("[data-cwk]",root).forEach(inp=>inp.addEventListener("change",()=>{
    const k=inp.dataset.cwk==="from"?"cwkFrom":"cwkTo";S[k]=Math.max(1,Math.min(PLAYED,+inp.value||1));save();render();}));
  // position "More ▾" menu
  const pm=$("#posmore",root);
  if(pm){const btn=pm.querySelector("button");
    btn.addEventListener("click",e=>{e.stopPropagation();pm.classList.toggle("open");btn.setAttribute("aria-expanded",pm.classList.contains("open"));});
    $$("[data-posmore]",pm).forEach(it=>it.addEventListener("click",()=>{S.posFilter=it.dataset.posmore;U.limit=40;save();render();}));}
  // clear all
  ["clearall","clearall2"].forEach(id=>{const b=$("#"+id,root);if(b)b.addEventListener("click",()=>{if(U.appState==="nomatches")U.appState="normal";clearFilters();render();});});
  // column/filter modal + compare modal openers
  const ocm=$("#opencolmodal",root);if(ocm)ocm.addEventListener("click",openColumns);
  const ocp=$("#opencompare",root);if(ocp)ocp.addEventListener("click",openCompare);
  // sortable headers
  $$("th[data-sort]",root).forEach(th=>th.addEventListener("click",()=>{
    const k=th.dataset.sort;S.sort=S.sort[0]===k?[k,-S.sort[1]]:[k,["opp","bye","rank","tier"].includes(k)?1:-1];save();render();
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
  if(!e.target.closest(".morewrap"))$$(".morewrap.open").forEach(c=>{c.classList.remove("open");const b=c.querySelector("button");if(b)b.setAttribute("aria-expanded","false");});
  // strip dropdowns (Scoring ▾ / Range ▾ / ⋯) — close on outside click
  if(!e.target.closest(".ddwrap")&&U.openDD){U.openDD=null;render();}
  if(!e.target.closest(".acct")){const p=$(".menu-pop");if(p){p.remove();const a=$("#acct");if(a)a.setAttribute("aria-expanded","false");}}
});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){if(U.openDD){U.openDD=null;render();}closeCard();const p=$(".menu-pop");if(p)p.remove();$("#tip").style.display="none";}});

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

/* Test hook — no effect on the browser UI; lets the offline DOM-stub harness
   reach ephemeral state (U) that is otherwise only mutated through DOM events. */
if(typeof window!=="undefined")window.__ffwtest={U,S,D};
