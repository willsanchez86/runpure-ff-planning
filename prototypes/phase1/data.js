"use strict";
/* =======================================================================
   Fantasy Workbench — Phase 1 prototype sample data
   Self-contained, deterministic. No network, no real NFL data.
   Produces: TEAMS, TEAM, PLAYERS, WEEKS, PLAYED, CUR, SEASON, OPP, BYE,
             SCHEDULE (NFL games per week). All hung on window.FFW.
   Dynamic, scoring-dependent values (fantasy points, matchup ranks,
   projections, volatility) are computed in app.js so the scoring switch
   can recompute them live.
   ======================================================================= */
(function () {

/* ---- deterministic RNG so the prototype looks identical every load ---- */
function mulberry(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const R=mulberry(20261110);
const randn=()=>{let u=0,v=0;while(!u)u=R();while(!v)v=R();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
const N=(m,s)=>m+s*randn();
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const pois=l=>{l=Math.max(0,l);const L=Math.exp(-l);let k=0,p=1;do{k++;p*=R()}while(p>L);return k-1};
const binom=(n,p)=>{let k=0;for(let i=0;i<n;i++)if(R()<p)k++;return k};
const pick=a=>a[Math.floor(R()*a.length)];
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};

/* ---- season clock ---- */
const SEASON=2026, CUR=10, PLAYED=9, SEASON_WEEKS=18;
const WEEKS=[...Array(PLAYED)].map((_,i)=>i+1);   // completed weeks 1..9

/* ---- 32 real NFL teams (facts: names/divisions/stadiums). Players are fictional. ---- */
const RAW_TEAMS=[
 ["ARI","Arizona","Cardinals","NFC","West","State Farm Stadium","retractable","grass"],
 ["ATL","Atlanta","Falcons","NFC","South","Mercedes-Benz Stadium","dome","turf"],
 ["BAL","Baltimore","Ravens","AFC","North","M&T Bank Stadium","open","grass"],
 ["BUF","Buffalo","Bills","AFC","East","Highmark Stadium","open","turf"],
 ["CAR","Carolina","Panthers","NFC","South","Bank of America Stadium","open","turf"],
 ["CHI","Chicago","Bears","NFC","North","Soldier Field","open","grass"],
 ["CIN","Cincinnati","Bengals","AFC","North","Paycor Stadium","open","turf"],
 ["CLE","Cleveland","Browns","AFC","North","Huntington Bank Field","open","grass"],
 ["DAL","Dallas","Cowboys","NFC","East","AT&T Stadium","retractable","turf"],
 ["DEN","Denver","Broncos","AFC","West","Empower Field","open","grass"],
 ["DET","Detroit","Lions","NFC","North","Ford Field","dome","turf"],
 ["GB","Green Bay","Packers","NFC","North","Lambeau Field","open","grass"],
 ["HOU","Houston","Texans","AFC","South","NRG Stadium","retractable","turf"],
 ["IND","Indianapolis","Colts","AFC","South","Lucas Oil Stadium","retractable","turf"],
 ["JAX","Jacksonville","Jaguars","AFC","South","EverBank Stadium","open","grass"],
 ["KC","Kansas City","Chiefs","AFC","West","Arrowhead Stadium","open","grass"],
 ["LV","Las Vegas","Raiders","AFC","West","Allegiant Stadium","dome","grass"],
 ["LAC","Los Angeles","Chargers","AFC","West","SoFi Stadium","dome","turf"],
 ["LAR","Los Angeles","Rams","NFC","West","SoFi Stadium","dome","turf"],
 ["MIA","Miami","Dolphins","AFC","East","Hard Rock Stadium","open","grass"],
 ["MIN","Minnesota","Vikings","NFC","North","U.S. Bank Stadium","dome","turf"],
 ["NE","New England","Patriots","AFC","East","Gillette Stadium","open","turf"],
 ["NO","New Orleans","Saints","NFC","South","Caesars Superdome","dome","turf"],
 ["NYG","New York","Giants","NFC","East","MetLife Stadium","open","turf"],
 ["NYJ","New York","Jets","AFC","East","MetLife Stadium","open","turf"],
 ["PHI","Philadelphia","Eagles","NFC","East","Lincoln Financial Field","open","grass"],
 ["PIT","Pittsburgh","Steelers","AFC","North","Acrisure Stadium","open","grass"],
 ["SF","San Francisco","49ers","NFC","West","Levi's Stadium","open","grass"],
 ["SEA","Seattle","Seahawks","NFC","West","Lumen Field","open","turf"],
 ["TB","Tampa Bay","Buccaneers","NFC","South","Raymond James Stadium","open","grass"],
 ["TEN","Tennessee","Titans","AFC","South","Nissan Stadium","open","grass"],
 ["WAS","Washington","Commanders","NFC","East","Northwest Stadium","open","grass"],
];
const COACHES=["R. Delgado","T. Okafor","M. Vanderbilt","S. Pruett","J. Castellano","B. Whitfield","A. Lindqvist","D. Mercer","C. Rourke","E. Fairbanks","N. Abernathy","G. Sutter","L. Esposito","P. Hartwell","K. Ibarra","W. Jessup","F. Northcutt","H. Quarles","V. Radcliffe","O. Treadwell","Z. Valentin","Y. Wexler","Q. Yarbrough","U. Zeller","M. Barrow","R. Coldwell","T. Draper","J. Ellery","B. Forsythe","A. Garrity","S. Haskins","D. Ingram"];

/* byes: 4 teams per week over weeks 5..14 */
const byePool=shuffle([5,6,7,8,9,10,11,12,13,14].flatMap(w=>[w,w,w]).concat([6,7,8,9]));
const TEAMS=RAW_TEAMS.map((r,i)=>({
  abbr:r[0],city:r[1],nick:r[2],name:r[1]+" "+r[2],conf:r[3],div:r[3]+" "+r[4],
  stadium:r[5],roof:r[6],surface:r[7],coach:COACHES[i],bye:byePool[i]
}));
const TEAM={};TEAMS.forEach(t=>TEAM[t.abbr]=t);
const ABBRS=TEAMS.map(t=>t.abbr);
const BYE={};TEAMS.forEach(t=>BYE[t.abbr]=t.bye);

/* opponent per week (null = bye). Weeks 1..SEASON_WEEKS. */
const OPP={};
for(let w=1;w<=SEASON_WEEKS;w++){
  OPP[w]={};ABBRS.forEach(t=>OPP[w][t]=null);
  const act=shuffle(ABBRS.filter(t=>BYE[t]!==w));
  for(let i=0;i+1<act.length;i+=2){OPP[w][act[i]]=act[i+1];OPP[w][act[i+1]]=act[i]}
}

/* team strength so stat lines & scores feel non-uniform */
const OFF={},DEFQ={},DST_STR={};
ABBRS.forEach(t=>{
  OFF[t]=clamp(N(1,.09),.80,1.20);
  DST_STR[t]=clamp(N(1,.12),.76,1.26);
  DEFQ[t]={};["QB","RB","WR","TE","K","DEF","DB","DL","LB"].forEach(p=>DEFQ[t][p]=clamp(N(1,.10),.78,1.22));
});

/* ---- name pools (fictional players) ---- */
const FIRST=["Marcus","Devon","Tyrell","Jalen","Cole","Brady","Isaiah","Malik","Trey","Darius","Logan","Jaxon","Caleb","Andre","Rashad","Quinn","Elijah","Xavier","Damon","Kendall","Bryce","Tavon","Myles","Corey","Dante","Terrence","Luca","Nate","Reggie","Omar","Shane","Keenan","Austin","Grant","Jordan","Micah","Desmond","Hunter","Roman","Zane","Tobias","Emmett","Silas","Felix","Cyrus","Owen","Reid","Carter","Mason","Wes","Jace","Kai","Rocco","Beau","Hayes","Ellis","Nico","Tate","Royce","Abram","Deshawn","Amari","Jaylen","Keon","Trevon","Donovan","Khalil","Rashawn","Jabari","Demetrius"];
const LAST=["Holloway","Brennan","Okafor","Whitfield","Castellano","Ashby","Delacroix","Pruitt","Vance","Mercer","Oduya","Talbot","Kincaid","Rourke","Fairbanks","Lindqvist","Abernathy","Sutter","Morrow","Esposito","Dukes","Galloway","Hartwell","Ibarra","Jessup","Kowalczyk","Lattimore","Mbeki","Northcutt","Okoye","Pemberton","Quarles","Radcliffe","Strand","Treadwell","Ulloa","Valentin","Wexler","Yarbrough","Zeller","Barrow","Coldwell","Draper","Ellery","Forsythe","Garrity","Haskins","Ingram","Jolley","Keane","Lusk","Mayfield","Nolte","Ochoa","Pickett","Rand","Sorensen","Thibault","Upshaw","Vickers","Wainwright","Yancey","Ashworth","Blaylock","Crane","Dorsey","Easley","Fennimore","Goodwin","Hatcher","Irwin","Judd","Kessler","Locke","Maddox","Nunez","Osei","Prater","Ridley","Stroud"];
const COLLEGES=["Alabama","Ohio State","Georgia","LSU","Michigan","Clemson","Oklahoma","Texas","Notre Dame","Penn State","Florida","Oregon","USC","Wisconsin","Iowa","Tennessee","Ole Miss","Washington","Miami","TCU","Utah","North Carolina","Pittsburgh","Baylor","Kansas State","Boise State","Appalachian State","North Dakota State","Montana","Jackson State"];
const used=new Set();
function pname(){let n;do{n=pick(FIRST)+" "+pick(LAST)}while(used.has(n));used.add(n);return n}

/* physical/bio by position */
const HT={QB:[74,78],RB:[68,72],WR:[70,76],TE:[76,79],K:[70,74],DB:[69,74],LB:[72,75],DL:[74,78]};
const WT={QB:[215,245],RB:[200,230],WR:[185,215],TE:[245,265],K:[185,210],DB:[185,210],LB:[230,250],DL:[280,320]};
const JER={QB:[1,19],RB:[20,39],WR:[10,19],TE:[80,89],K:[1,9],DB:[20,39],LB:[40,59],DL:[90,99]};
function bio(pos){
  const [hl,hh]=HT[pos]||[72,76],[wl,wh]=WT[pos]||[210,240],[jl,jh]=JER[pos]||[1,99];
  const yrs=Math.max(0,Math.round(clamp(N(4,3),0,15)));
  const inches=Math.round(N((hl+hh)/2,1.4));
  return{
    age:clamp(21+yrs+Math.round(N(0,1)),21,39),
    ht:clamp(inches,hl-1,hh+1),
    wt:Math.round(N((wl+wh)/2,8)/5)*5,
    jersey:jl+Math.floor(R()*(jh-jl+1)),
    college:pick(COLLEGES),
    exp:yrs,
    draftYear:SEASON-yrs,
    draftRound:yrs===0?0:(R()<.12?0:1+Math.floor(R()*7)),  // 0 => undrafted
  };
}

/* ---- one game stat line for a player vs opponent ---- */
function genLine(p,opp){
  const d=DEFQ[opp]?DEFQ[opp][p.pos]:1, o=OFF[p.team], t=p.talent, s={};
  switch(p.pos){
    case"QB":{s.att=Math.max(16,Math.round(N(33*o,5)));s.cmp=Math.round(s.att*clamp(N(.65*Math.sqrt(t),.06),.45,.8));s.pyd=Math.max(40,Math.round(s.att*clamp(N(7.1*t*d,1.3),4,11)));s.ptd=pois(1.55*t*d*o);s.int=pois(.8/t);s.car=pois(2+p.mob*6);s.ryd=Math.max(-4,Math.round(s.car*N(4.5,2)));s.rtd=pois(.04+p.mob*.3);s.fum=pois(.12);break;}
    case"RB":{s.car=pois(18*p.role*o);s.ryd=Math.round(s.car*clamp(N(4.3*t*d,1),1,9));s.rtd=pois(.55*p.role*t*d*o);s.tg=pois(4.2*p.role*p.recv);s.rec=binom(s.tg,.78);s.cyd=Math.round(s.rec*clamp(N(7.5,2.5),2,20));s.ctd=pois(.08*p.role*p.recv);s.fum=pois(.08);s.snap=clamp(Math.round(N(26+58*p.role,8)),5,100);break;}
    case"WR":{s.tg=pois(9*p.role*o);s.rec=binom(s.tg,clamp(.62*Math.sqrt(t),.4,.8));s.cyd=Math.round(s.rec*clamp(N(12.5*t*d,3),4,25));s.ctd=pois(.5*p.role*t*d*o);s.car=R()<.08?1:0;s.ryd=s.car*Math.round(N(8,4));s.fum=pois(.04);s.snap=clamp(Math.round(N(42+54*p.role,7)),10,100);break;}
    case"TE":{s.tg=pois(6.5*p.role*o);s.rec=binom(s.tg,.7);s.cyd=Math.round(s.rec*clamp(N(10.5*t*d,2.5),4,20));s.ctd=pois(.38*p.role*t*d*o);s.fum=pois(.04);s.snap=clamp(Math.round(N(50+42*p.role,8)),15,100);break;}
    case"K":{s.fg=pois(1.7*o*t);s.fg50=binom(s.fg,.2);s.xp=pois(2.4*o);s.miss=pois(.3);break;}
    case"DEF":{s.pa=Math.max(0,Math.round(N(22/t*d,8)));s.ya=Math.max(140,Math.round(N(330/t,55)));s.sk=pois(2.4*t);s.int=pois(.8*t);s.fr=pois(.55);s.td=pois(.12*t);s.saf=R()<.03?1:0;break;}
    case"DB":{s.solo=pois(4.2*t);s.ast=pois(1.8);s.sk=pois(.12*t);s.int=pois(.18*t);s.pd=pois(1.0*t);s.ff=pois(.08);s.fr=pois(.05);s.td=R()<.01?1:0;s.snap=clamp(Math.round(N(82,10)),40,100);break;}
    case"LB":{s.solo=pois(5.6*t);s.ast=pois(3.0);s.sk=pois(.42*t);s.int=pois(.09*t);s.pd=pois(.5*t);s.ff=pois(.11);s.fr=pois(.07);s.td=R()<.01?1:0;s.snap=clamp(Math.round(N(78,12)),35,100);break;}
    case"DL":{s.solo=pois(2.8*t);s.ast=pois(1.9);s.sk=pois(.62*t);s.tfl=pois(.8*t);s.qbh=pois(1.1*t);s.int=0;s.pd=pois(.2);s.ff=pois(.10);s.fr=pois(.06);s.td=R()<.005?1:0;s.snap=clamp(Math.round(N(66,13)),25,100);break;}
  }
  return s;
}

/* ---- build players ---- */
const PLAYERS=[];let pid=0;
function mk(pos,team,role,recv,mob){
  const b=bio(pos);
  const p={id:pid++,pos,team,role,recv:recv??1,mob:mob??0,
    talent:clamp(N(1,.14),.66,1.38),
    name:pos==="DEF"?TEAM[team].name:pname(),
    headshotHue:Math.floor(R()*360),
    weeks:{},prior:[],status:null,practice:null,depth:0,
    ...b};
  if(pos==="DEF"){p.age=null;p.ht=null;p.wt=null;p.jersey=null;p.college=null;p.exp=null;p.draftYear=null;p.draftRound=null;}
  PLAYERS.push(p);return p;
}
TEAMS.forEach(t=>{
  const a=t.abbr;
  // offense
  mk("QB",a,1,0,R()**2); mk("QB",a,.25,0,R()**2);
  const r1=clamp(N(.80,.10),.55,1); mk("RB",a,r1,clamp(N(.9,.3),.3,1.6));
  mk("RB",a,clamp(1-r1+N(0,.08),.25,.6),clamp(N(.7,.3),.2,1.4));
  mk("RB",a,clamp(N(.28,.08),.12,.45),clamp(N(.6,.3),.2,1.2));
  [.90,.70,.52,.34,.22].forEach(r=>mk("WR",a,clamp(r+N(0,.07),.15,1)));
  mk("TE",a,clamp(N(.74,.14),.4,1)); mk("TE",a,clamp(N(.34,.1),.15,.55));
  mk("K",a,1); mk("DEF",a,1);
  // individual defense
  mk("DB",a,clamp(N(1,.12),.7,1.3)); mk("DB",a,clamp(N(.85,.12),.6,1.15));
  mk("LB",a,clamp(N(1,.12),.7,1.35)); mk("LB",a,clamp(N(.82,.12),.6,1.1));
  mk("DL",a,clamp(N(1,.14),.65,1.4)); mk("DL",a,clamp(N(.8,.12),.55,1.1));
});

/* depth-chart slot per team+position (1 = starter), ranked by role then talent */
const DEPTH_LABEL={QB:"QB",RB:"RB",WR:"WR",TE:"TE",K:"K",DEF:"DST",DB:"DB",LB:"LB",DL:"DL"};
TEAMS.forEach(t=>{
  const byPos={};
  PLAYERS.filter(p=>p.team===t.abbr).forEach(p=>(byPos[p.pos]??=[]).push(p));
  for(const pos in byPos){
    byPos[pos].sort((a,b)=>(b.role*2+b.talent)-(a.role*2+a.talent)).forEach((p,i)=>{p.depth=i+1;p.slot=DEPTH_LABEL[pos]+(i+1)});
  }
});

/* ---- prior-season baseline (for volatility fallback) + current weeks with GAPS ---- */
const PRACTICE=["Full","Limited","Did not practice"];
PLAYERS.forEach(p=>{
  for(let i=0;i<24;i++)p.prior.push(genLine(p,pick(ABBRS)));

  // injuries → missed weeks create real GAPS, plus a current-week status
  const miss=new Set();
  if(p.pos!=="DEF"&&R()<.16){
    const st=1+Math.floor(R()*9), len=1+Math.floor(R()*3);
    for(let w=st;w<st+len;w++)miss.add(w);
    if(miss.has(CUR)){p.status=len>=3?"IR":"O";p.practice="Did not practice";}
    else if(miss.has(CUR-1)){p.status="Q";p.practice=pick(["Limited","Full"]);}
  }
  if(!p.status&&p.pos!=="DEF"&&R()<.07){p.status="Q";p.practice=pick(PRACTICE);}

  for(const w of WEEKS){
    const o=OPP[w][p.team];
    p.weeks[w]=o===null?"BYE":miss.has(w)?null:genLine(p,o);
  }
});

/* A couple of hand-placed edge cases so "sparse data" state is realistic:
   - a rookie with zero games (just signed), - an injured star out all season. */
(function edgeCases(){
  const rookie=PLAYERS.find(p=>p.pos==="WR"&&p.exp===0&&p.depth>=3);
  if(rookie){rookie.rookieNoGames=true;for(const w of WEEKS)rookie.weeks[w]=OPP[w][rookie.team]===null?"BYE":null;rookie.status=null;rookie.practice="Full";rookie.note="Signed in Week "+CUR+"; no games yet.";}
  const star=PLAYERS.find(p=>p.pos==="RB"&&p.depth===1&&p.talent>1.1);
  if(star){star.status="IR";star.practice="Did not practice";for(let w=4;w<=CUR;w++)if(star.weeks[w]!=="BYE")star.weeks[w]=null;star.note="Knee (IR) since Week 4.";}
})();

/* =======================================================================
   NFL schedule screen — games per week with scores, byes, and detail.
   Weeks 1..9 FINAL, week 10 UPCOMING (no score yet), plus byes.
   ======================================================================= */
const DAYS=[["Thu","8:15 PM"],["Sun","1:00 PM"],["Sun","1:00 PM"],["Sun","1:00 PM"],["Sun","4:05 PM"],["Sun","4:25 PM"],["Sun","8:20 PM"],["Mon","8:15 PM"]];
function footballScore(str){ // plausible final score from a strength signal
  let pts=clamp(Math.round(N(22+ (str-1)*16, 9)),3,45);
  // snap to realistic football totals
  const near=[0,3,6,7,10,13,14,16,17,20,21,23,24,27,28,30,31,34,35,37,38,41,42,44,45];
  return near.reduce((a,b)=>Math.abs(b-pts)<Math.abs(a-pts)?b:a);
}
const SCHEDULE={};
for(let w=1;w<=SEASON_WEEKS;w++){
  const played=w<=PLAYED;
  const games=[];const seen=new Set();
  const order=ABBRS.filter(t=>BYE[t]!==w);
  order.forEach(t=>{
    const o=OPP[w][t];if(o===null||seen.has(t)||seen.has(o))return;seen.add(t);seen.add(o);
    // home/away: lower abbr index home for determinism-ish
    const home=ABBRS.indexOf(t)<ABBRS.indexOf(o)?t:o, away=home===t?o:t;
    const g={home,away,played};
    const slot=DAYS[games.length%DAYS.length];g.day=slot[0];g.time=slot[1];
    const ht=TEAM[home];
    g.stadium=ht.stadium;g.roof=ht.roof;g.surface=ht.surface;
    g.homeCoach=ht.coach;g.awayCoach=TEAM[away].coach;
    if(ht.roof==="dome"){g.temp="Controlled (dome)";g.wind="—";}
    else if(ht.roof==="retractable"){g.temp=(R()<.5?"Controlled (roof closed)":Math.round(N(68,8))+"°F");g.wind=g.temp.startsWith("Controlled")?"—":Math.round(N(6,4))+" mph";}
    else {g.temp=Math.round(N(54,16))+"°F";g.wind=Math.max(0,Math.round(N(9,5)))+" mph";}
    const spread=Math.round(N((OFF[home]*1.03-OFF[away])*20,1)*2)/2; // home-favored tends negative
    g.favorite=spread<=0?home:away;g.spread=Math.abs(spread)||1;
    g.total=Math.round(clamp(N(44,5),33,56)*2)/2;
    g.homeQB=(PLAYERS.find(p=>p.team===home&&p.pos==="QB"&&p.depth===1)||{}).name||"—";
    g.awayQB=(PLAYERS.find(p=>p.team===away&&p.pos==="QB"&&p.depth===1)||{}).name||"—";
    if(played){
      g.homeScore=footballScore(OFF[home]/OFF[away]);
      g.awayScore=footballScore(OFF[away]/OFF[home]);
      if(g.homeScore===g.awayScore)g.homeScore+=3;
      g.ot=Math.abs(g.homeScore-g.awayScore)<=3 && R()<.22;
      g.final=true;
    }
    games.push(g);
  });
  SCHEDULE[w]={games,byes:ABBRS.filter(t=>BYE[t]===w)};
}

/* phase label for the week picker */
function weekPhase(w){return w<=SEASON_WEEKS?"reg":"post";}

/* ---- expose ---- */
window.FFW={TEAMS,TEAM,ABBRS,PLAYERS,WEEKS,PLAYED,CUR,SEASON,SEASON_WEEKS,OPP,BYE,SCHEDULE,weekPhase,
  OFF,DEFQ,DST_STR,
  // last-updated timestamps for the freshness note (prototype "today" = 2026-11-10)
  lastUpdated:new Date("2026-11-10T06:00:00-05:00"),
  staleUpdated:new Date("2026-11-08T05:58:00-05:00")};
})();
