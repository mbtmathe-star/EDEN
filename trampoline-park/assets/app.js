(function(){'use strict';
/* ---------- helpers ---------- */
var pad=function(n){return String(n).padStart(2,'0')};
var iso=function(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
var parse=function(s){var p=s.split('-').map(Number);return new Date(p[0],p[1]-1,p[2])};
var DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
var MON=['January','February','March','April','May','June','July','August','September','October','November','December'];
var fmtDate=function(s){var d=parse(s);return DOW[d.getDay()]+', '+d.getDate()+' '+MON[d.getMonth()].slice(0,3)+' '+d.getFullYear()};
var shortDate=function(s){var d=parse(s);return DOW[d.getDay()]+' '+d.getDate()+' '+MON[d.getMonth()].slice(0,3)};
var hh=function(h){return (h%12||12)+':00 '+(h>=12?'PM':'AM')};
var h24=function(h){return pad(h)+':00'};
var fmtT=function(ts){var d=new Date(ts);return pad(d.getHours())+':'+pad(d.getMinutes())};
var money=function(n){var neg=n<0;n=Math.abs(n);return (neg?'-':'')+'R'+n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,',')};
var money0=function(n){return money(n).replace('.00','')};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var hash=function(str){var h=2166136261;for(var i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0)/4294967295};
var addDays=function(d,n){var x=new Date(d);x.setDate(x.getDate()+n);return x};
var todayD=function(){var n=new Date();return new Date(n.getFullYear(),n.getMonth(),n.getDate())};
var todayS=function(){return iso(todayD())};
var nowMin=function(){var n=new Date();return n.getHours()*60+n.getMinutes()};
var $=function(id){return document.getElementById(id)};
var tsOf=function(ds,h){var d=parse(ds);d.setHours(h,0,0,0);return d.getTime()};
var dayOfTs=function(ts){return iso(new Date(ts))};

/* ---------- editable config (the POS "Pricing & rules" tab changes these; the website reads them live) ---------- */
var CFG={cap:180,peak:{0:1,5:1,6:1},sock:40,pod:{base:1800,per:180,full:2700},partyMin:6,groupMin:10,closed:{}};
var PRODUCTS=[
 {id:'jumper',name:'Jumper',desc:'Ages 4 and up. Every trampoline zone.',play:true,price:{1:{off:120,peak:150},2:{off:170,peak:220}}},
 {id:'mini',name:'Mini Jumper (<125cm)',desc:'For the little ones. Under 125cm.',play:true,price:{1:{off:90,peak:115},2:{off:130,peak:165}}},
 {id:'tiny',name:'Tiny Jumper (<125cm)',desc:'Under 2 and walking unassisted.',play:true,price:{1:{off:90,peak:90},2:{off:130,peak:130}}},
 {id:'student',name:'Student Jumper (18-25)',desc:'Student ID required at the desk.',play:true,price:{1:{off:100,peak:130},2:{off:145,peak:185}}},
 {id:'active',name:'Active Parent',desc:'Jump alongside your kids. Limit: 2 per booking.',play:true,limit:2,price:{1:{off:90,peak:90},2:{off:130,peak:130}}},
 {id:'sideline',name:'Sideline Parent',desc:'Watch from the cafe seating. Free, but tell us how many are coming. Limit: 5 per booking.',limit:5,price:{1:{off:0,peak:0},2:{off:0,peak:0}}}
];
var GROUP={price:{1:{off:90,peak:110},2:{off:140,peak:170}}};
var PODS=['A','B','C','D','E','F'],POD_ORDER=['F','E','D','C','B','A'],PERPOD=15;
var partyPod=function(n){return n<=10?CFG.pod.base:(n>=15?CFG.pod.full:CFG.pod.base+CFG.pod.per*(n-10))};
var COUNTRIES=[['+27','South Africa','ZA'],['+264','Namibia','NA'],['+267','Botswana','BW'],['+263','Zimbabwe','ZW'],['+258','Mozambique','MZ'],['+266','Lesotho','LS'],['+268','Eswatini','SZ'],['+44','United Kingdom','GB'],['+1','United States','US']];
var FLOW={individual:['details','type','duration','datetime','passes'],party:['details','type','datetime','passes'],group:['details','type','duration','datetime','passes']};
var TYPE_NAME={individual:'Individual tickets',party:'Party',group:'Group booking'};
var CASHIER='Thandi M.';
var DEMO_EMAIL='demo.guest@example.com';

/* ---------- the one shared store (website and POS both read and write this) ---------- */
var BK=[],EV=[],PID=0;
var addEv=function(kind,text,ref){EV.push({t:Date.now(),kind:kind,text:text,ref:ref||''});if(window.__protoRender)window.__protoRender()};
var addLog=function(b,msg,by){b.log.push({t:Date.now(),msg:msg,by:by||''})};
var mkPay=function(method,amount,by,at){return {id:'p'+(++PID),method:method,amount:amount,by:by,at:at||Date.now()}};
var paidOf=function(b){return b.payments.reduce(function(a,p){return a+p.amount},0)};
var balOf=function(b){return Math.round((b.total-paidOf(b))*100)/100};
var endTs=function(b){return tsOf(b.date,b.slot+b.duration)};
var startTs=function(b){return tsOf(b.date,b.slot)};

/* ---------- capacity, derived from bookings so both tabs always agree ---------- */
var isOpenDay=function(ds){return true};
var dayClose=function(ds){return parse(ds).getDay()===6?19:18};
var tierOf=function(ds){return CFG.peak[parse(ds).getDay()]?'peak':'off'};
var loadAt=function(ds,h){var s=0;BK.forEach(function(b){if(b.status==='cancelled'||b.date!==ds)return;if(h>=b.slot&&h<b.slot+b.duration)s+=b.jumpers});return s};
var spotsAt=function(ds,h,dur){var m=0,i;for(i=0;i<dur;i++)m=Math.max(m,loadAt(ds,h+i));return Math.max(0,CFG.cap-m)};
var podsUsed=function(ds,h){var s=0;BK.forEach(function(b){if(b.type==='party'&&b.status!=='cancelled'&&b.date===ds&&b.slot===h)s+=b.pods.length});return s};
var podsFree=function(ds,h){return Math.max(0,6-podsUsed(ds,h))};
var isClosed=function(ds,h,dur){var i;for(i=0;i<dur;i++)if(CFG.closed[ds+':'+(h+i)])return true;return false};
var assignPods=function(ds,h,n){
 var used=[];BK.forEach(function(b){if(b.type==='party'&&b.status!=='cancelled'&&b.date===ds&&b.slot===h)used=used.concat(b.pods)});
 return POD_ORDER.filter(function(p){return used.indexOf(p)<0}).slice(0,n);
};

/* every function below takes a context c = {type,duration,date,slot,qty,pos?}; the website wizard (S) and the POS till (P.sale) both pass one */
var slotHours=function(c){
 var close=dayClose(c.date),out=[],h;
 if(c.type==='party'){[10,12,14,16].forEach(function(x){if(x+2<=close)out.push(x)})}
 else{for(h=9;h+c.duration<=close;h++)out.push(h)}
 return out;
};
var isPast=function(c,h){
 var t=todayS();if(c.date<t)return true;if(c.date>t)return false;
 return (c.pos?(h+1)*60:h*60)<=nowMin();
};
var durOf=function(c){return c.type==='party'?2:c.duration};
var curSpotsAt=function(c,h){
 if(h==null)return 0;
 var d=durOf(c);
 return c.type==='party'?Math.min(podsFree(c.date,h)*PERPOD,spotsAt(c.date,h,2)):spotsAt(c.date,h,d);
};
var slotState=function(c,h){
 var d=durOf(c);
 if(isClosed(c.date,h,d))return {k:'full',label:'Closed'};
 if(isPast(c,h))return {k:'past',label:'Past'};
 if(c.type==='party'){
  var p=podsFree(c.date,h),sp=spotsAt(c.date,h,2);
  if(p<=0)return {k:'full',label:'Fully booked'};
  if(sp<CFG.partyMin)return {k:'full',label:'Venue full'};
  return {k:'ok',label:p+' of 6 party pods · '+Math.min(p*PERPOD,sp)+' spots'};
 }
 var s=spotsAt(c.date,h,d);
 if(s<=0)return {k:'full',label:'Full'};
 if(c.type==='group'&&s<CFG.groupMin)return {k:'full',label:'Under '+CFG.groupMin+' spots'};
 return {k:s<=20?'low':'ok',label:(s<=20?'Only '+s+' left':s+' spots left')};
};
var anyOpen=function(c){return slotHours(c).some(function(h){var k=slotState(c,h).k;return k==='ok'||k==='low'})};
var firstOpenDate=function(c){
 var d=todayD(),i,save=c.date,res=null;
 for(i=0;i<60&&!res;i++){c.date=iso(addDays(d,i));if(anyOpen(c))res=c.date}
 c.date=save;return res||iso(d);
};
var ensureDate=function(c){
 var t=todayS();if(c.date<t)c.date=t;
 if(!anyOpen(c)){var f=firstOpenDate(c);if(f!==c.date){c.date=f;return 'No sessions left on that day, so we moved you to the next day with space.'}}
 return '';
};

/* basket maths */
var unit=function(c,p){return p.price[c.duration][tierOf(c.date)]};
var playing=function(c){return PRODUCTS.reduce(function(a,p){return a+(p.play?(c.qty[p.id]||0):0)},0)};
var jumpers=function(c){return c.type==='individual'?playing(c):(c.qty[c.type]||0)};
var partyAlloc=function(n){
 var rooms=Math.max(1,Math.ceil(n/PERPOD)),base=Math.floor(n/rooms),rem=n%rooms,out=[],i;
 for(i=0;i<rooms;i++)out.push({pod:POD_ORDER[i],n:base+(i<rem?1:0)});
 return out;
};
var total=function(c){
 if(c.type==='individual')return PRODUCTS.reduce(function(a,p){return a+(c.qty[p.id]||0)*unit(c,p)},0);
 if(c.type==='group')return (c.qty.group||0)*GROUP.price[c.duration][tierOf(c.date)];
 if(c.type==='party')return partyAlloc(c.qty.party||0).reduce(function(a,r){return a+partyPod(r.n)},0);
 return 0;
};
var guestCount=function(c){
 if(c.type==='individual')return PRODUCTS.reduce(function(a,p){return a+(c.qty[p.id]||0)},0);
 return c.qty[c.type]||0;
};
var bounds=function(c,id){
 var sp=curSpotsAt(c,c.slot);
 if(c.type==='group')return {min:CFG.groupMin,max:Math.max(CFG.groupMin,Math.min(90,sp))};
 if(c.type==='party')return {min:CFG.partyMin,max:Math.max(CFG.partyMin,Math.min(90,sp))};
 var p=PRODUCTS.filter(function(x){return x.id===id})[0],q=c.qty[id]||0;
 if(p.limit)return {min:0,max:p.limit};
 return {min:0,max:q+Math.max(0,sp-playing(c))};
};
var problem=function(c){
 if(c.type==='individual'){
  var kids=(c.qty.mini||0)+(c.qty.tiny||0),adults=(c.qty.jumper||0)+(c.qty.student||0)+(c.qty.active||0)+(c.qty.sideline||0);
  if(playing(c)<1)return 'Add at least one jumper to continue.';
  if(kids>0&&adults<1)return 'Every child needs an adult. Add a Sideline Parent (free) or an Active Parent.';
  if(playing(c)>curSpotsAt(c,c.slot))return 'Only '+curSpotsAt(c,c.slot)+' spots left in this session.';
 }
 if(c.type==='group'&&(c.qty.group||0)<CFG.groupMin)return 'Groups need at least '+CFG.groupMin+' jumpers.';
 if(c.type==='party'&&(c.qty.party||0)<CFG.partyMin)return 'Parties need at least '+CFG.partyMin+' jumpers.';
 if(c.type!=='individual'&&jumpers(c)>curSpotsAt(c,c.slot))return 'Only '+curSpotsAt(c,c.slot)+' spots left in this session.';
 return '';
};

/* ---------- creating and changing bookings ---------- */
var newRef=function(){
 var chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',ref,i;
 do{ref='LP-';for(i=0;i<6;i++)ref+=chars[Math.floor(Math.random()*chars.length)]}while(BK.some(function(b){return b.ref===ref}));
 return ref;
};
var newBooking=function(c,o){
 var b={ref:o.ref||newRef(),source:o.source,type:c.type,date:c.date,slot:c.slot,duration:durOf(c),jumpers:jumpers(c),guests:guestCount(c),
  lines:JSON.parse(JSON.stringify(c.qty)),customer:o.customer,total:total(c)+(o.socks||0)*CFG.sock,socks:o.socks||0,payments:o.payments||[],
  status:o.status,notes:o.notes||'',waiver:!!o.waiver,arrived:o.arrived||0,pods:[],created:o.created||Date.now(),example:!!o.example,log:o.log||[]};
 if(c.type==='party')b.pods=assignPods(c.date,c.slot,partyAlloc(b.jumpers).length);
 BK.push(b);return b;
};
var statusLabel=function(s,site){return {reserved:site?'Pay at desk':'Awaiting payment',confirmed:'Confirmed',checkedin:'Checked in',completed:'Completed',cancelled:'Cancelled',noshow:'No-show'}[s]};
var statusCls=function(s){return {reserved:'wait',confirmed:'ok',checkedin:'in',completed:'past',cancelled:'bad',noshow:'bad'}[s]};
var pill=function(s,site){return '<span class="status '+statusCls(s)+'">'+statusLabel(s,site)+'</span>'};
var tickStatuses=function(){
 var n=Date.now();
 BK.forEach(function(b){if(b.status==='checkedin'&&endTs(b)<=n){b.status='completed';addLog(b,'Session ended, marked completed','System')}});
};

/* a random "someone else" booking, used by the website's live ticker and the POS simulate button */
var FIRST=['Thandi','Pieter','Aisha','Sipho','Lerato','Johan','Naledi','Thabo','Zanele','Ruan','Fatima','Kagiso','Annelie','Mpho','Karabo','Elmarie','Tshepo','Nomsa'];
var LAST=['Mokoena','Venter','Patel','Khumalo','Molefe','Botha','Dube','Nkosi','Ndlovu','Pretorius','Ismail','Sithole','Joubert','Radebe','Mahlangu','Naidoo','Steyn','Zulu'];
var randCust=function(r){
 var f=FIRST[Math.floor((r==null?Math.random():r)*FIRST.length)],l=LAST[Math.floor((r==null?Math.random():hash('l'+r))*LAST.length)];
 var ph='0'+(60+Math.floor((r==null?Math.random():hash('p'+r))*25))+' '+(100+Math.floor((r==null?Math.random():hash('q'+r))*899))+' '+(1000+Math.floor((r==null?Math.random():hash('z'+r))*8999));
 return {name:f+' '+l,phone:'+27 '+ph.slice(1),email:(f+'.'+l).toLowerCase()+'@example.com'};
};
var simBooking=function(c){
 var type=c.type||'individual',dur=type==='party'?2:(c.duration||1),tmp={type:type,duration:dur,date:c.date,slot:null,qty:{}};
 var hrs=slotHours(tmp).filter(function(h){var k=slotState(tmp,h).k;return k==='ok'||k==='low'});
 if(!hrs.length)return null;
 var h=hrs[Math.floor(Math.random()*hrs.length)];tmp.slot=h;
 var sp=curSpotsAt(tmp,h),n;
 if(type==='party')n=Math.min(sp,CFG.partyMin+Math.floor(Math.random()*8));
 else if(type==='group')n=Math.min(sp,CFG.groupMin+Math.floor(Math.random()*15));
 else n=Math.min(sp,2+Math.floor(Math.random()*5));
 if(n<(type==='party'?CFG.partyMin:(type==='group'?CFG.groupMin:1)))return null;
 tmp.qty=type==='individual'?{jumper:n,sideline:1}:(type==='party'?{party:n}:{group:n});
 var pay=Math.random()<0.7,tt=total(tmp);
 var b=newBooking(tmp,{source:'web',customer:randCust(),status:pay?'confirmed':'reserved',payments:pay?[mkPay('Card (online)',tt,'Website')]:[]});
 addLog(b,'Booked on the website'+(pay?' and paid by card':', pay at the desk'),'Website');
 addEv('web','Online booking '+b.ref+': '+b.customer.name+', '+b.jumpers+' jumpers, '+shortDate(b.date)+' '+h24(b.slot)+(pay?' (paid)':' (pay at desk)'),b.ref);
 return b;
};
/* ---------- store starts empty: every booking, payment and customer comes from someone using the website or the POS ---------- */
var seed=function(){
 BK.length=0;EV.length=0;PID=0;
};
/* ---------- website tab ---------- */
var S={view:'landing',step:'gate',pre:null,type:null,duration:null,date:todayS(),slot:null,qty:{},notes:'',pay:'online',consent:false,modal:null,calOpen:false,calMonth:null,
 signedIn:false,auth:{mode:'in',email:'',pw:'',name:''},user:{name:'',cc:'+27',phone:'',email:''},errs:false,last:null,toast:'',liveAt:Date.now(),notice:''};

var I={
 back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
 check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
 cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/></svg>',
 warn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l9.5 17h-19z"/><path d="M12 10v4.5M12 17.5v.01"/></svg>',
 ticket:'<svg class="ico" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h30v6a3 3 0 000 6v6H5v-6a3 3 0 000-6z"/><path d="M26 12v16" stroke-dasharray="2 4"/></svg>',
 party:'<svg class="ico" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 34l5-17 12 12z"/><path d="M20 8v3M30 12l-2 2M33 22h-3M26 4v.01M34 16v.01"/></svg>',
 people:'<svg class="ico" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="15" cy="14" r="5"/><path d="M5 33c0-6 4-10 10-10s10 4 10 10"/><circle cx="29" cy="15" r="4"/><path d="M29 24c4 0 7 3 7 8"/></svg>',
 card:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5.5" width="18" height="13" rx="3"/><path d="M3 10h18"/></svg>',
 shield:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>',
 logo:'<img src="/trampoline-park/assets/logo.png" alt="Kimberley Trampoline Park">'
};

var stepsNow=function(){return S.type?FLOW[S.type]:['details','type']};
var passLabel=function(){return S.type==='party'?'Party passes':(S.type==='group'?'Group passes':'Passes')};
var LABEL={details:'Your details',type:'Booking type',duration:'Duration',datetime:'Date & time'};
var head=function(title,sub,back){
 return '<div class="card-head">'+(back?'<button class="back" data-act="back" aria-label="Go back">'+I.back+'</button>':'')+'<div><h2>'+title+'</h2>'+(sub?'<p class="sub">'+sub+'</p>':'')+'</div></div>';
};
var chipsHTML=function(){
 var st=stepsNow(),idx=st.indexOf(S.step);
 if(S.step==='gate'||S.step==='details'||S.step==='type')return '';
 return '<div class="chips" role="list">'+st.map(function(s,i){
  var cls=i<idx?'done':(i===idx?'now':''),lab=s==='passes'?passLabel():LABEL[s];
  return '<div class="chip '+cls+'" role="listitem"><i>'+(i<idx?I.check:(i+1))+'</i>'+lab+'</div>';
 }).join('')+'</div>';
};

/* landing page */
var heroArt='<img class="hero-logo" src="/trampoline-park/assets/logo.png" alt="Kimberley Trampoline Park">';var _oldArt='<svg class="art" viewBox="0 0 460 270" role="img" aria-label="A jumper arcing over a trampoline"><ellipse cx="230" cy="238" rx="205" ry="30" fill="var(--primary)" opacity=".16"/><ellipse cx="230" cy="224" rx="190" ry="32" fill="var(--primary)"/><ellipse cx="230" cy="218" rx="168" ry="24" fill="var(--primary-soft)"/><path d="M60 222c10-130 330-130 340 0" stroke="var(--ink)" stroke-width="2.5" stroke-dasharray="3 9" stroke-linecap="round" fill="none" opacity=".55"/><ellipse cx="230" cy="222" rx="32" ry="7" fill="var(--primary)" opacity=".35"/><circle cx="230" cy="64" r="26" fill="var(--cta)" stroke="var(--ink)" stroke-width="3"/><path d="M214 62c8 8 24 8 32 0" stroke="var(--ink)" stroke-width="3" stroke-linecap="round" fill="none"/></svg>';
var landingHTML=function(){
 var c={type:'individual',duration:1,date:todayS(),slot:null,qty:{}},lab='Today',hrs=slotHours(c).filter(function(h){var k=slotState(c,h).k;return k==='ok'||k==='low'});
 if(!hrs.length){c.date=iso(addDays(todayD(),1));lab='Tomorrow';hrs=slotHours(c).filter(function(h){var k=slotState(c,h).k;return k==='ok'||k==='low'})}
 var rows=hrs.slice(0,4).map(function(h){
  var sp=spotsAt(c.date,h,1),pct=Math.max(4,Math.round(sp/CFG.cap*100));
  return '<div class="srow"><b class="tnum">'+hh(h)+'</b><span class="meter"><i class="'+(sp<=20?'low':'')+'" style="width:'+pct+'%"></i></span><span class="tnum" style="font-weight:600">'+sp+' left</span></div>';
 }).join('')||'<p class="hint">No open sessions. Check back soon.</p>';
 var peakNames=[0,1,2,3,4,5,6].filter(function(d){return CFG.peak[d]}).map(function(d){return DOW[d]}).join(', ');
 var prow=function(name,desc,p){return '<tr><td><b>'+name+'</b><br><span class="hint">'+desc+'</span></td><td class="n">'+(p[1].off?money0(p[1].off):'Free')+'</td><td class="n">'+(p[1].peak?money0(p[1].peak):'Free')+'</td><td class="n">'+(p[2].off?money0(p[2].off):'Free')+'</td><td class="n">'+(p[2].peak?money0(p[2].peak):'Free')+'</td></tr>'};
 var trs=PRODUCTS.map(function(p){return prow(p.name,p.desc,p.price)}).join('')+prow('Group session (min '+CFG.groupMin+')','Per jumper, schools and teams',GROUP.price);
 return '<section class="hero"><div><p class="eyebrow">Indoor trampoline park · Example Centre</p><h1>Book the bounce. <em>Skip the queue.</em></h1><p class="lede">Pick a session, pay online or at the desk, and walk straight in with your reference. What you see here is the same live count the front desk sees.</p><div class="cta-row"><button class="btn big" data-act="start">Book tickets</button><button class="btn ghost big" data-act="start" data-v="party">Plan a party</button></div><ul class="ticks"><li>Live spots, updated as the desk sells</li><li>Pay online, or reserve and pay at the desk</li><li>Parties from '+money0(CFG.pod.base)+' per pod, groups from '+money0(GROUP.price[1].off)+' a jumper</li></ul></div>'+
 '<div class="hero-r">'+heroArt+'<div class="today-card"><h3><span>'+lab+' at Kimberley Trampoline Park</span><span class="live">Live</span></h3>'+rows+'<button class="btn" style="width:100%;margin-top:12px" data-act="start">See all sessions</button></div></div></section>'+
 '<section class="sec" id="sec-how"><h2>How it works</h2><p class="lead">Three steps, no account queue at the door.</p><div class="steps3"><div class="st"><h3>Pick your session</h3><p>Choose tickets, a party or a group, then a date and start time with spots you can see.</p></div><div class="st"><h3>Pay now or at the desk</h3><p>Card online confirms instantly. Pay in store holds your spot until you reach the desk.</p></div><div class="st"><h3>Show your reference</h3><p>Give the desk your booking reference. They check you in, wristband everyone and you jump.</p></div></div></section>'+
 '<section class="sec" id="sec-pricing"><h2>Pricing</h2><p class="lead">Per person, VAT included. Peak days are '+peakNames+'; every other day is off-peak. Grip socks are R'+CFG.sock+' a pair at the desk.</p><div class="tblwrap"><table class="t"><thead><tr><th>Pass</th><th>1 hour off-peak</th><th>1 hour peak</th><th>2 hours off-peak</th><th>2 hours peak</th></tr></thead><tbody>'+trs+'</tbody></table></div><p class="small">Prices are placeholders for this prototype and change live when edited on the POS tab.</p></section>'+
 '<section class="sec" id="sec-parties"><h2>Parties and groups</h2><p class="lead">Six party pods, four start times a day, and a simple per-jumper rate for schools and teams.</p><div class="two"><div class="feat">'+I.party+'<h3>Birthday parties</h3><p>2 hours in your own pod, starts at 10am, 12pm, 2pm or 4pm. Up to '+PERPOD+' jumpers per pod, minimum '+CFG.partyMin+'.</p><span class="price tnum">From '+money0(CFG.pod.base)+' per pod</span><button class="btn" data-act="start" data-v="party">Plan a party</button></div><div class="feat">'+I.people+'<h3>School and team groups</h3><p>Minimum '+CFG.groupMin+' jumpers, sessions start on the hour, arrive 20 minutes early.</p><span class="price tnum">'+money0(GROUP.price[1].off)+' a jumper off-peak</span><button class="btn" data-act="start" data-v="group">Book a group</button></div></div></section>'+
 '<section class="sec" id="sec-know"><h2>Before you come</h2><div class="know"><div><b>Grip socks</b>Compulsory in every jump zone.</div><div><b>Adults</b>Every child under 18 stays with an adult.</div><div><b>Waiver</b>Signed once per jumper, on file for next time.</div><div><b>Arrive early</b>10 minutes for tickets, 20 for groups.</div></div></section>';
};

/* auth, details */
var authOK=function(){var a=S.auth;return /\S+@\S+\.\S+/.test(a.email)&&a.pw.length>=6&&(a.mode==='in'||a.name.trim().length>1)};
var gateHTML=function(){
 var a=S.auth,create=a.mode==='up';
 return '<div class="card">'+head('Sign in to book','Your details are saved so the next booking takes seconds.',false)+
 '<div class="seg" role="tablist"><button data-act="auth-mode" data-v="in" class="'+(create?'':'on')+'">Sign in</button><button data-act="auth-mode" data-v="up" class="'+(create?'on':'')+'">Create profile</button></div>'+
 '<div class="fields">'+
 (create?'<label class="f" for="a-name">Full name<input id="a-name" class="in" data-bind-auth="name" value="'+esc(a.name)+'" placeholder="e.g. Sam Dlamini" autocomplete="name"></label>':'')+
 '<label class="f" for="a-email">Email<input id="a-email" type="email" class="in" data-bind-auth="email" value="'+esc(a.email)+'" placeholder="you@example.com" autocomplete="email"></label>'+
 '<label class="f" for="a-pw">Password<input id="a-pw" type="password" class="in" data-bind-auth="pw" value="'+esc(a.pw)+'" placeholder="At least 6 characters" autocomplete="current-password"></label>'+
 '</div><div class="actions"><button class="btn ghost" data-act="demo-user">Use demo account</button><button class="btn" id="gate-go" data-act="auth-go" '+(authOK()?'':'disabled')+'>'+(create?'Create profile':'Sign in')+'</button></div></div>';
};
var validUser=function(){
 var u=S.user,e={},ph=u.phone.replace(/\D/g,'');
 if(u.name.trim().length<2)e.name='Enter your full name.';
 if(ph.length<9||ph.length>11)e.phone='Enter a mobile number, for example 82 123 4567.';
 if(!/\S+@\S+\.\S+/.test(u.email))e.email='Enter a valid email address.';
 return e;
};
var detailsHTML=function(){
 var e=S.errs?validUser():{},u=S.user;
 return '<div class="card">'+head('Step 1: Your details','We use these for check-in. Missing details are saved to your profile after you book.',false)+
 '<div class="fields">'+
 '<label class="f" for="u-name">Full name <span class="req">*</span><input id="u-name" class="in '+(e.name?'bad':'')+'" data-bind-user="name" value="'+esc(u.name)+'" placeholder="e.g. Sam Dlamini" autocomplete="name"><span class="err">'+(e.name||'')+'</span></label>'+
 '<div class="f"><label for="u-phone">Mobile <span class="req">*</span></label><div class="phone"><select id="u-cc" class="in" data-bind-user="cc" aria-label="Country code">'+COUNTRIES.map(function(c){return '<option value="'+c[0]+'" '+(u.cc===c[0]?'selected':'')+'>'+c[2]+' '+c[0]+' '+c[1]+'</option>'}).join('')+'</select><input id="u-phone" type="tel" class="in '+(e.phone?'bad':'')+'" data-bind-user="phone" value="'+esc(u.phone)+'" placeholder="Phone number" autocomplete="tel-national"></div><span class="err">'+(e.phone||'')+'</span></div>'+
 '<label class="f" for="u-email">Email <span class="req">*</span><input id="u-email" type="email" class="in '+(e.email?'bad':'')+'" data-bind-user="email" value="'+esc(u.email)+'" placeholder="you@example.com" autocomplete="email"><span class="err">'+(e.email||'')+'</span></label>'+
 '</div><div class="actions"><button class="btn" data-act="details-go">Continue</button></div></div>';
};
var typeHTML=function(){
 var c=function(k,ico,t,d){return '<button class="choice '+(S.type===k?'sel':'')+'" data-act="pick-type" data-v="'+k+'">'+ico+'<h3>'+t+'</h3><p>'+d+'</p></button>'};
 return '<div class="card">'+head('Step 2: What are you booking?','Choose the option that fits your visit.',true)+
 '<div class="choices c3">'+
 c('individual',I.ticket,'Individual tickets','Jump sessions for one to nine people. Pick the length, date and time.')+
 c('party',I.party,'Book a party','2-hour parties at 10am, 12pm, 2pm and 4pm · 6 party pods, up to '+PERPOD+' jumpers each · flat pod pricing.')+
 c('group',I.people,'Group booking','Schools, clubs and teams of '+CFG.groupMin+' or more. One simple per-jumper rate.')+
 '</div><p class="helpline">Need help? hello@leappark.example · 000 000 0000</p></div>';
};
var durationHTML=function(){
 var d=function(n,ico,t,s){return '<button class="choice '+(S.duration===n?'sel':'')+'" data-act="pick-dur" data-v="'+n+'"><span class="big" aria-hidden="true">'+ico+'</span><h3>'+t+'</h3><p>'+s+'</p></button>'};
 return '<div class="card">'+head('How long do you want to play?','Choose a 1-hour or 2-hour session.',true)+
 '<div class="choices c2">'+d(1,'⏰','1 hour','Quick bounce session')+d(2,'⏰⏰','2 hours','More time on the floor')+'</div>'+
 '<div class="actions"><button class="btn" data-act="next" '+(S.duration?'':'disabled')+'>Continue</button></div></div>';
};
var calHTML=function(){
 var m=S.calMonth||parse(S.date),y=m.getFullYear(),mo=m.getMonth(),first=new Date(y,mo,1),start=addDays(first,-first.getDay()),t=todayD(),cells=[],i;
 var curMonth=(y===t.getFullYear()&&mo===t.getMonth());
 for(i=0;i<42;i++){
  var d=addDays(start,i),ds=iso(d),other=d.getMonth()!==mo,past=d<t;
  cells.push('<button '+(past?'disabled ':'')+'data-act="pick-date" data-v="'+ds+'" class="'+(other?'other ':'')+(ds===S.date?'sel ':'')+(ds===iso(t)?'today':'')+'" aria-label="'+fmtDate(ds)+'">'+d.getDate()+'</button>');
 }
 return '<div class="cal" role="dialog" aria-label="Choose a date"><div class="cal-head"><button data-act="cal-prev" aria-label="Previous month" '+(curMonth?'disabled':'')+'>‹</button><span>'+MON[mo]+' '+y+'</span><button data-act="cal-next" aria-label="Next month">›</button></div><div class="cal-grid">'+DOW.map(function(x){return '<div class="dw">'+x.slice(0,2)+'</div>'}).join('')+cells.join('')+'</div></div>';
};
var slotsHTML=function(){
 return slotHours(S).map(function(h){
  var st=slotState(S,h),dis=(st.k==='past'||st.k==='full');
  return '<button class="slot '+(st.k==='low'?'low ':'')+(S.slot===h?'sel':'')+'" data-act="pick-slot" data-v="'+h+'" '+(dis?'disabled':'')+'><span>'+hh(h)+'</span><small>'+st.label+'</small></button>';
 }).join('');
};
var datetimeHTML=function(){
 var party=S.type==='party',tier=tierOf(S.date),notice=S.notice;S.notice='';
 var tierTxt=party?'Party bookings use <b>standard pod pricing</b> only. Peak and off-peak rates do not apply.':
  'Pricing for this day: <b class="'+(tier==='peak'?'tag-peak':'tag-off')+'">'+(tier==='peak'?'Peak':'Off-peak')+'</b>. We show the matching passes in the next step.';
 var close=dayClose(S.date);
 var help=party?'Choose a start time for your 2-hour party (10am, 12pm, 2pm and 4pm starts only).':'Choose a start time for your '+S.duration+'-hour session.';
 return '<div class="card">'+head('Pick your date & time','Today and future dates only. Past slots today are hidden.',true)+
 (notice?'<div class="notice" role="status">'+notice+'</div>':'')+
 '<div class="daterow"><button class="datebtn '+(S.calOpen?'open':'')+'" data-act="cal-toggle" aria-haspopup="dialog" aria-expanded="'+S.calOpen+'">'+I.cal+fmtDate(S.date)+'</button><p class="tierlabel">'+tierTxt+'</p>'+(S.calOpen?calHTML():'')+'</div>'+
 '<hr><h3 style="font-size:17px;margin-bottom:6px">Start time<span class="live" id="live">Live · updated just now</span></h3>'+
 '<p class="slots-help">'+help+' Open 9 AM to '+hh(close).replace(':00','')+' on this day. Availability refreshes every 15 seconds and is shared with the front desk. Up to '+CFG.cap+' jumpers per hour venue-wide; parties use 6 pods holding up to '+PERPOD+' jumpers each.</p>'+
 '<div class="slots" id="slots">'+slotsHTML()+'</div>'+
 '<div class="actions"><button class="btn" id="dt-next" data-act="next" '+(S.slot!=null?'':'disabled')+'>Continue</button></div></div>';
};
var stepper=function(id,val,b){
 return '<div class="stepper"><button data-act="dec" data-id="'+id+'" '+(val<=b.min?'disabled':'')+' aria-label="Remove one">−</button><output aria-live="polite">'+val+'</output><button data-act="inc" data-id="'+id+'" '+(val>=b.max?'disabled':'')+' aria-label="Add one">+</button></div>';
};
var ctxHTML=function(){
 var d=durOf(S),tier=tierOf(S.date);
 return '<div class="ctx"><span>'+TYPE_NAME[S.type]+'</span><span>'+fmtDate(S.date)+'</span><span>'+hh(S.slot)+' to '+hh(S.slot+d)+'</span>'+(S.type==='party'?'':'<span>'+(tier==='peak'?'Peak':'Off-peak')+' rates</span>')+'<span>'+curSpotsAt(S,S.slot)+' spots left</span></div>';
};
var passesBody=function(){
 var tier=tierOf(S.date),durTxt=S.duration+(S.duration===1?' hour':' hours'),tierTxt=tier==='peak'?'Peak':'Off-peak';
 if(S.type==='individual'){
  return '<p class="rule">Showing <b>'+tierTxt+'</b> products for your date and '+durTxt+' slot. Kids under 18 must be with an adult at all times.</p>'+
  PRODUCTS.map(function(p){
   var q=S.qty[p.id]||0,b=bounds(S,p.id),pr=unit(S,p);
   return '<div class="prod"><div><h3>'+p.name+' · '+S.duration+' hour · '+tierTxt+'</h3><p>'+p.desc+'</p><p class="price tnum">'+(pr?money(pr)+' each':'Free')+' · Jump session</p></div>'+stepper(p.id,q,b)+'</div>';
  }).join('');
 }
 if(S.type==='group'){
  var q=S.qty.group||CFG.groupMin,b=bounds(S,'group'),pr=GROUP.price[S.duration][tier];
  return '<p class="rule">Showing <b>'+tierTxt+'</b> products for your date and '+durTxt+' slot. <b>Minimum '+CFG.groupMin+' jumpers</b> per booking.</p>'+
  '<div class="prod"><div><h3>Customise your '+durTxt+' group session · '+tierTxt+'</h3><p>Number of jumpers is the quantity (minimum '+CFG.groupMin+'). '+money(pr)+' per jumper, from '+money(pr*CFG.groupMin)+' for '+CFG.groupMin+'. Sessions start on the hour. Please arrive 20 minutes early. Grip socks are compulsory.</p><p class="price tnum">'+money(pr)+' per jumper · Group booking · min '+CFG.groupMin+'</p></div>'+stepper('group',q,b)+'</div>';
 }
 var n=S.qty.party||CFG.partyMin,bb=bounds(S,'party'),al=partyAlloc(n);
 return '<p class="rule">Showing <b>standard</b> products for your date and 2-hour slot. <b>Minimum '+CFG.partyMin+' jumpers.</b> Per party pod: '+money0(CFG.pod.base)+' flat up to 10, '+money0(CFG.pod.base)+' + '+money0(CFG.pod.per)+' for each jumper from 11 to 14, '+money0(CFG.pod.full)+' flat for '+PERPOD+'. Pods fill in order F, E, D, C, B, A and hold '+PERPOD+' jumpers at most.</p>'+
 '<div class="prod" style="align-items:flex-start"><div><h3>Book your party</h3><p>A 2-hour party experience. Quantity is the number of jumpers (minimum '+CFG.partyMin+'). Each pod holds up to '+PERPOD+'; extra pods are added above that.</p><div class="alloc">'+al.map(function(r){return '<span>Pod '+r.pod+' · '+r.n+' jumpers · '+money(partyPod(r.n))+'</span>'}).join('')+'</div></div>'+stepper('party',n,bb)+'</div>';
};
var payHTML=function(){
 var po=function(k,t,d){return '<button class="pay '+(S.pay===k?'sel':'')+'" data-act="pay-mode" data-v="'+k+'" role="radio" aria-checked="'+(S.pay===k)+'"><span class="dot"></span><div><b>'+t+'</b><span>'+d+'</span></div></button>'};
 return '<div class="card"><div class="sec-title">'+I.card+'<h2>Payment</h2></div><p class="sub" style="margin-bottom:16px">Choose how you would like to pay. Bookings are confirmed once payment is received.</p>'+
 '<div class="pay-opts" role="radiogroup">'+
 po('online','Pay online','Pay securely now by card. Your booking is confirmed as soon as the payment goes through.')+
 po('store','Pay in store','Reserve now and pay at the front desk when you arrive. Quote your booking reference to the cashier.')+
 '</div></div>'+
 '<div class="card"><div class="sec-title">'+I.shield+'<h2>Additional information</h2></div>'+
 '<label class="consent" for="consent"><input type="checkbox" id="consent" data-act="consent" '+(S.consent?'checked':'')+'><span>I agree to the Terms and Conditions and Indemnity. I understand bookings are non-refundable, non-transferable and valid only for the date and time selected. I consent to my personal information being processed to provide this service. <span style="color:var(--danger)">*</span></span></label>'+
 '<button class="linkbtn" data-act="waiver">View the full waiver</button></div>';
};
var passesHTML=function(){
 return '<div class="card">'+head(passLabel(),'',true)+ctxHTML()+'<div id="passbody">'+passesBody()+'</div>'+
 '<div class="notes"><label class="f" for="notes">Special notes (optional)<textarea id="notes" class="in" data-bind-notes="1" placeholder="Allergies, accessibility needs…">'+esc(S.notes)+'</textarea></label></div></div>'+
 payHTML()+'<div class="pad-bar"></div>';
};
var whyDisabled=function(){return problem(S)||(!S.consent?'Tick the agreement to continue.':'')};
var canPay=function(){return !problem(S)&&S.consent};
var barHTML=function(){
 var ok=canPay(),why=whyDisabled(),g=guestCount(S);
 return '<div class="bar"><div class="wrap"><div class="tot"><span class="amt" id="amt">'+money(total(S))+'</span><span><b id="gct">'+g+' guest'+(g===1?'':'s')+'</b> · estimated total<small>VAT (15%) included in prices</small></span></div><div style="display:flex;align-items:center"><span class="why" id="why">'+esc(why)+'</span><button class="btn" id="paybtn" data-act="pay" '+(ok?'':'disabled')+'>'+(S.pay==='online'?'Pay & Confirm Booking':'Reserve Booking')+'</button></div></div></div>';
};
var doneHTML=function(){
 var b=S.last,paid=b.status==='confirmed';
 var rows=[['Booking',TYPE_NAME[b.type]],['Date',fmtDate(b.date)],['Time',hh(b.slot)+' to '+hh(b.slot+b.duration)],['Guests',b.guests],['Total',money(b.total)+' (VAT included)'],['Payment',paid?'Paid online':'Pay at the front desk on arrival'],['Name',esc(b.customer.name)]];
 return '<div class="card"><div class="done-top"><div class="tick">'+I.check+'</div><div><h2 style="font-size:26px">'+(paid?'You are booked in':'Your spot is reserved')+'</h2><p class="sub">We sent the details to '+esc(b.customer.email)+'. Show your reference at check-in.</p></div></div>'+
 '<p class="hint" style="margin-bottom:4px">Booking reference</p><div class="ref" style="margin-bottom:20px">'+b.ref+'</div>'+
 '<dl class="kv">'+rows.map(function(r){return '<dt>'+r[0]+'</dt><dd class="tnum">'+r[1]+'</dd>'}).join('')+'</dl>'+
 '<div class="banner" style="margin-top:24px;margin-bottom:0">'+I.warn+'<span>Grip socks are compulsory for every jumper. '+(b.type==='group'?'Groups: please arrive 20 minutes early.':'Please arrive 10 minutes early to check in.')+'</span></div>'+
 '<p class="hint" style="margin-top:14px">Open the POS tab: this booking is already on the front desk screen.</p>'+
 '<div class="actions" style="justify-content:flex-start"><button class="btn" data-act="show-bookings">View my bookings</button><button class="btn ghost" data-act="again">Book another session</button></div></div>';
};
var bookingsHTML=function(){
 var list=BK.filter(function(b){return b.customer.email===S.user.email}).sort(function(a,b){return a.date<b.date?1:(a.date>b.date?-1:b.slot-a.slot)});
 var rows=list.length?list.map(function(b){
  var extra=b.status==='cancelled'&&paidOf(b)<b.total&&b.payments.length?'<small>Refunded</small>':'';
  return '<div class="brow"><span class="r">'+b.ref+(b.example?'<span class="exm">Example</span>':'')+'</span><span>'+TYPE_NAME[b.type]+'<small>'+fmtDate(b.date)+' · '+hh(b.slot)+'</small></span><span>'+b.guests+' guest'+(b.guests===1?'':'s')+'<small class="tnum">'+money(b.total)+(balOf(b)>0&&b.status!=='cancelled'?' · '+money(balOf(b))+' to pay':'')+'</small></span><span>'+pill(b.status,true)+extra+'</span></div>';
 }).join(''):'<p class="hint">No bookings yet for '+esc(S.user.email||'this account')+'.</p>';
 return '<div class="card">'+head('My bookings','Status updates here as the front desk checks you in or takes payment.',false)+'<div class="blist">'+rows+'</div><div class="actions" style="justify-content:flex-start"><button class="btn" data-act="again">Book a session</button></div></div>';
};
var modalHTML=function(){
 if(!S.modal)return '';
 if(S.modal==='waiver')return '<div class="overlay" data-act="close-modal"><div class="modal" role="dialog" aria-label="Waiver" data-stop="1"><h2>Full waiver (placeholder text)</h2><p class="sub" style="margin-bottom:14px">Replace with your own legal wording.</p><ol><li>Every jumper uses the park at their own risk and follows the floor hosts’ safety rules.</li><li>Children under 18 stay with an adult at all times.</li><li>Grip socks are compulsory in all jump zones.</li><li>Bookings are valid for the date and time selected and cannot be refunded or transferred.</li><li>Personal information is used only to run your booking and check-in.</li></ol><div class="actions"><button class="btn" data-act="close-modal">Close</button></div></div></div>';
 if(S.modal==='card')return '<div class="overlay"><div class="modal" role="dialog" aria-label="Card payment"><h2>Pay '+money(total(S))+'</h2><p class="sub" style="margin-bottom:16px">Demo only. No real payment is taken.</p><div class="fields" style="gap:14px"><label class="f" for="cn">Card number<input id="cn" class="in" value="4242 4242 4242 4242" readonly></label><div class="row2"><label class="f" for="ce">Expiry<input id="ce" class="in" value="12 / 29" readonly></label><label class="f" for="cc">CVC<input id="cc" class="in" value="123" readonly></label></div></div><div class="actions"><button class="btn ghost" data-act="close-modal">Cancel</button><button class="btn" data-act="card-pay">Pay '+money(total(S))+'</button></div></div></div>';
 return '<div class="overlay"><div class="modal" style="text-align:center"><div class="spin"></div><h2>Contacting your bank…</h2><p class="sub">Please do not close this page.</p></div></div>';
};
var navHTML=function(){
 return '<div class="wrap"><nav class="nav"><button class="logo" data-act="home" aria-label="Kimberley Trampoline Park home">'+I.logo+'</button><div class="navlinks"><button data-act="home">Home</button><button data-act="goto" data-v="pricing">Pricing</button><button data-act="goto" data-v="parties">Parties</button><button data-act="goto" data-v="know">Contact</button></div><span class="spacer"></span><button class="pill-btn '+(S.view==='bookings'?'on':'')+'" data-act="show-bookings">My bookings</button><button class="pill-btn '+((S.view==='book'||S.view==='done')?'on':'')+'" data-act="start">Book tickets</button></nav>'+
 '<div class="banner" role="note">'+I.warn+'<span><b>Important:</b> Grip socks are compulsory in every jump zone. · <b>Every child under 18 must be with an adult at all times.</b></span></div></div>';
};
var mainHTML=function(){
 if(S.view==='landing')return landingHTML();
 if(S.view==='bookings')return bookingsHTML();
 if(S.view==='done')return doneHTML();
 var t={gate:gateHTML,details:detailsHTML,type:typeHTML,duration:durationHTML,datetime:datetimeHTML,passes:passesHTML}[S.step];
 return chipsHTML()+t();
};
var pageTitle=function(){
 if(S.view==='landing')return null;
 if(S.view==='bookings')return ['My bookings','Everything you have booked, in one place.'];
 if(S.view==='done')return ['All set','Your booking is saved.'];
 return ['Book your jump session','Live availability, the same steps for single tickets, parties and groups.'];
};
/* if the front desk closes or fills a session while the visitor is choosing it, send them back to pick again */
var revalidate=function(){
 if(S.view==='book'&&(S.step==='passes'||S.step==='datetime')&&S.slot!=null){
  var k=slotState(S,S.slot).k;
  if(k==='full'||k==='past'){S.slot=null;S.step='datetime';S.notice='That session just closed or filled up. Pick another time.'}
 }
};
var render=function(keepScroll){
 revalidate();
 var y=window.scrollY,pt=pageTitle();
 $('site').innerHTML=navHTML()+'<main class="wrap">'+(pt?'<div class="pagehead"><div><h1>'+pt[0]+'</h1><p>'+pt[1]+'</p></div></div>':'')+mainHTML()+'</main><footer class="wrap foot"><span>Kimberley Trampoline Park · Unit 0, Example Centre · Mon–Fri 09:00–18:00, Sat 09:00–19:00, Sun 09:00–18:00</span><span>Prototype: every name, price and rule here is a placeholder.</span></footer>'+
 (S.view==='book'&&S.step==='passes'?barHTML():'')+modalHTML()+(S.toast?'<div class="toast" role="status">'+esc(S.toast)+'</div>':'');
 window.scrollTo(0,keepScroll?y:0);
};
var refreshPassBits=function(){
 var pb=$('passbody');if(!pb)return;
 var y=window.scrollY,g=guestCount(S);
 pb.innerHTML=passesBody();
 $('amt').textContent=money(total(S));
 $('gct').textContent=g+' guest'+(g===1?'':'s');
 $('why').textContent=whyDisabled();
 $('paybtn').disabled=!canPay();
 $('paybtn').textContent=S.pay==='online'?'Pay & Confirm Booking':'Reserve Booking';
 window.scrollTo(0,y);
};
var toast=function(msg){S.toast=msg;render(true);setTimeout(function(){S.toast='';if(MODE==='site')render(true)},2600)};

/* flow */
var go=function(step){S.step=step;S.calOpen=false;if(step==='datetime'){var n=ensureDate(S);if(n)S.notice=n;if(S.slot!=null&&slotHours(S).indexOf(S.slot)<0)S.slot=null}render()};
var next=function(){var st=stepsNow(),i=st.indexOf(S.step);go(st[i+1])};
var prev=function(){var st=stepsNow(),i=st.indexOf(S.step);if(i>0)go(st[i-1])};
var initQty=function(){
 if(S.type==='individual')S.qty={jumper:2,sideline:1};
 if(S.type==='group')S.qty={group:CFG.groupMin};
 if(S.type==='party')S.qty={party:8};
};
var clamp=function(){
 var sp=curSpotsAt(S,S.slot);
 if(S.type==='individual'){if(playing(S)>sp)S.qty.jumper=Math.max(sp,0);return}
 var b=bounds(S,S.type);S.qty[S.type]=Math.max(b.min,Math.min(b.max,S.qty[S.type]||b.min));
};
var claimExamples=function(){BK.forEach(function(b){if(b.example){b.customer.email=S.user.email;if(S.user.name)b.customer.name=S.user.name}})};
var finalize=function(status){
 var tt=total(S),pays=status==='confirmed'?[mkPay('Card (online)',tt,'Website')]:[];
 var cust={name:S.user.name,phone:S.user.cc+' '+S.user.phone,email:S.user.email};
 var b=newBooking(S,{source:'web',customer:cust,status:status,payments:pays,notes:S.notes});
 addLog(b,'Booked on the website'+(status==='confirmed'?' and paid by card':', pay at the desk'),'Website');
 addEv('web','Online booking '+b.ref+': '+b.customer.name+', '+b.jumpers+' jumpers, '+shortDate(b.date)+' '+h24(b.slot)+(status==='confirmed'?' (paid)':' (pay at desk)'),b.ref);
 S.last=b;S.modal=null;S.view='done';render();
};
var resetWizard=function(){
 S.view='book';S.step=S.signedIn?'type':'gate';S.type=null;S.duration=null;S.slot=null;S.qty={};S.notes='';S.consent=false;S.pay='online';S.modal=null;S.calOpen=false;S.date=todayS();
};
var applyType=function(v){
 if(S.type!==v){S.type=v;S.duration=v==='party'?2:null;S.slot=null;S.qty={}}
};
var siteActions={
 'start':function(t){resetWizard();S.pre=t.dataset.v||null;render()},
 'goto':function(t){S.view='landing';render();var id='sec-'+t.dataset.v;setTimeout(function(){var el=$(id);if(el&&el.scrollIntoView)el.scrollIntoView({behavior:'smooth',block:'start'})},40)},
 'auth-mode':function(t){S.auth.mode=t.dataset.v;render(true)},
 'demo-user':function(){S.signedIn=true;S.user.email=DEMO_EMAIL;claimExamples();S.step='details';render()},
 'auth-go':function(){if(!authOK())return;S.signedIn=true;S.user.email=S.auth.email;if(S.auth.mode==='up')S.user.name=S.auth.name;claimExamples();S.step='details';render()},
 'details-go':function(){
  S.errs=true;var e=validUser();if(Object.keys(e).length){render(true);var f=document.querySelector('.in.bad');if(f)f.focus();return}
  if(S.pre){var v=S.pre;S.pre=null;applyType(v);S.step=FLOW[v][2];if(S.step==='datetime'){var n=ensureDate(S);if(n)S.notice=n}render();return}
  S.step='type';render();
 },
 'back':function(){prev()},
 'pick-type':function(t){applyType(t.dataset.v);next()},
 'pick-dur':function(t){var d=Number(t.dataset.v);if(S.duration!==d){S.duration=d;S.slot=null}render(true)},
 'next':function(){
  var st=stepsNow(),i=st.indexOf(S.step);
  if(st[i+1]==='passes'){if(!Object.keys(S.qty).length)initQty();clamp()}
  next();
 },
 'cal-toggle':function(){S.calOpen=!S.calOpen;S.calMonth=parse(S.date);render(true)},
 'cal-prev':function(){var m=S.calMonth;S.calMonth=new Date(m.getFullYear(),m.getMonth()-1,1);render(true)},
 'cal-next':function(){var m=S.calMonth;S.calMonth=new Date(m.getFullYear(),m.getMonth()+1,1);render(true)},
 'pick-date':function(t){S.date=t.dataset.v;S.calOpen=false;if(S.slot!=null){var k=slotHours(S).indexOf(S.slot)<0?'x':slotState(S,S.slot).k;if(k!=='ok'&&k!=='low')S.slot=null}render(true)},
 'pick-slot':function(t){S.slot=Number(t.dataset.v);S.calOpen=false;render(true)},
 'inc':function(t){var id=t.dataset.id,key=(S.type==='individual')?id:S.type,b=bounds(S,id),q=S.qty[key]||0;if(q<b.max){S.qty[key]=q+1;refreshPassBits()}},
 'dec':function(t){var id=t.dataset.id,key=(S.type==='individual')?id:S.type,b=bounds(S,id),q=S.qty[key]||0;if(q>b.min){S.qty[key]=q-1;refreshPassBits()}},
 'pay-mode':function(t){S.pay=t.dataset.v;render(true)},
 'consent':function(t){S.consent=t.checked;var pb=$('paybtn');if(pb){pb.disabled=!canPay();$('why').textContent=whyDisabled()}},
 'waiver':function(){S.modal='waiver';render(true)},
 'close-modal':function(t,e){if(t.classList.contains('overlay')&&e.target!==t)return;S.modal=null;render(true)},
 'pay':function(){if(!canPay())return;if(S.pay==='online'){S.modal='card';render(true)}else finalize('reserved')},
 'card-pay':function(){S.modal='processing';render(true);setTimeout(function(){finalize('confirmed')},1300)},
 'show-bookings':function(){S.view='bookings';render()},
 'again':function(){resetWizard();render()},
 'home':function(){S.view='landing';render()}
};
/* ---------- POS tab: state and read-only views ---------- */
var MODE='site';
var P={view:'today',date:todayS(),q:'',fStatus:'all',fRange:'today',fSlot:null,open:null,modal:null,seenTs:Date.now(),auto:false,
 sale:{type:'individual',duration:1,date:todayS(),slot:null,qty:{jumper:1},socks:0,pos:true,name:'',phone:'',method:'cash',tender:'',waiver:true,done:null},
 cash:{float:500,counted:'',closed:false},toast:''};
var NAV=[['today','Today'],['bookings','Bookings'],['sale','New sale'],['pods','Party pods'],['cash','Payments & cash-up'],['customers','Customers'],['rules','Pricing & rules']];

var paymentsOn=function(ds){
 var out=[];BK.forEach(function(b){b.payments.forEach(function(p){if(dayOfTs(p.at)===ds)out.push({p:p,b:b})})});
 return out.sort(function(a,b){return a.p.at-b.p.at});
};
var dayActive=function(ds){return BK.filter(function(b){return b.date===ds&&b.status!=='cancelled'})};
var byRef=function(ref){return BK.filter(function(b){return b.ref===ref})[0]};
var relDate=function(ds){var t=todayS();return ds===t?'Today':(ds===iso(addDays(todayD(),1))?'Tomorrow':shortDate(ds))};
var dnav=function(){
 return '<div class="datenav"><button data-pa="date-step" data-v="-1" aria-label="Previous day">‹</button><span>'+relDate(P.date)+' · '+shortDate(P.date)+'</span><button data-pa="date-step" data-v="1" aria-label="Next day">›</button><button data-pa="date-today">Today</button></div>';
};
var feedHTML=function(n){
 var list=EV.slice(-n).reverse();
 if(!list.length)return '<p class="hint">Nothing yet.</p>';
 return '<ul class="feed">'+list.map(function(e){return '<li><span class="tt">'+fmtT(e.t)+'</span><span class="d '+e.kind+'"></span><span>'+esc(e.text)+'</span></li>'}).join('')+'</ul>';
};

var viewToday=function(){
 var td=todayS(),isT=P.date===td,day=dayActive(P.date),jump=day.reduce(function(a,b){return a+b.jumpers},0);
 var close=dayClose(P.date),hrs=[],h;
 for(h=9;h<close;h++)hrs.push(h);
 var floor=BK.filter(function(b){return b.status==='checkedin'}).reduce(function(a,b){return a+b.jumpers},0);
 var coll=paymentsOn(td).reduce(function(a,x){return a+x.p.amount},0);
 var due=day.reduce(function(a,b){var v=balOf(b);return a+(v>0?v:0)},0);
 var kp=function(k,v,s){return '<div class="kpi"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="s">'+s+'</div></div>'};
 var rows=hrs.map(function(h){
  var ld=loadAt(P.date,h),pct=Math.min(100,Math.round(ld/CFG.cap*100)),cl=CFG.closed[P.date+':'+h],n=day.filter(function(b){return b.slot===h}).length;
  var cls=cl?'off':(pct>=90?'hot':(pct>=70?'warn':''));
  return '<div class="prow"><button class="tm" data-pa="slot-filter" data-v="'+h+'" title="Show bookings for this session">'+h24(h)+'</button><span class="meter" title="'+ld+' of '+CFG.cap+'"><i class="'+cls+'" style="width:'+(cl?100:pct)+'%"></i></span><span class="num">'+(cl?'Closed':ld+' / '+CFG.cap)+'<small>'+n+' booking'+(n===1?'':'s')+'</small></span><button class="btn ghost sm" data-pa="toggle-slot" data-v="'+h+'">'+(cl?'Reopen':'Stop sales')+'</button></div>';
 }).join('');
 var arr=day.filter(function(b){return b.status==='confirmed'||b.status==='reserved'}).sort(function(a,b){return a.slot-b.slot}).slice(0,8);
 var arrH=arr.length?arr.map(function(b){
  var late=isT&&(b.slot*60+15<=nowMin()),bal=balOf(b);
  return '<div class="arr"><b class="tnum">'+h24(b.slot)+'</b><span><b>'+esc(b.customer.name)+'</b><small>'+b.jumpers+' jumpers'+(bal>0?' \u00b7 <span class="owe">'+money(bal)+' to collect</span>':' \u00b7 paid')+(late?' \u00b7 <span class="late">LATE</span>':'')+'</small></span><button class="btn sm" data-pa="checkin" data-id="'+b.ref+'">Check in</button></div>';
 }).join(''):'<p class="hint">No arrivals waiting. Bookings from the website and new desk sales show up here.</p>';
 return '<div class="ptop"><div><h1>Today</h1></div><div class="tools">'+dnav()+'</div></div>'+
 '<div class="kpis k3">'+kp('Bookings',day.length,jump+' jumpers expected')+kp('On the floor now',isT?floor:'\u2013',isT?'of '+CFG.cap+' capacity':'Switch to today')+kp('Collected today',money0(coll),money0(due)+' still to collect')+'</div>'+
 '<div class="pgrid"><div class="panel"><h3>Sessions<small>Jumpers booked of '+CFG.cap+'</small></h3>'+rows+'</div><div class="panel"><h3>Arrivals<small>'+arr.length+' waiting</small></h3>'+arrH+'</div></div>';
};

var filtered=function(){
 var q=P.q.trim().toLowerCase(),td=todayS();
 return BK.filter(function(b){
  if(P.fRange==='today'&&b.date!==td)return false;
  if(P.fRange==='upcoming'&&b.date<td)return false;
  if(P.fRange==='date'&&b.date!==P.date)return false;
  if(P.fStatus!=='all'&&b.status!==P.fStatus)return false;
  if(P.fSlot!=null&&b.slot!==P.fSlot)return false;
  if(q){var hay=(b.ref+' '+b.customer.name+' '+b.customer.phone+' '+b.customer.email).toLowerCase();if(hay.indexOf(q)<0&&hay.replace(/\s/g,'').indexOf(q.replace(/\s/g,''))<0)return false}
  return true;
 }).sort(function(a,b){return a.date<b.date?-1:(a.date>b.date?1:a.slot-b.slot)});
};
var tableHTML=function(){
 var list=filtered(),show=list.slice(0,80);
 if(!list.length)return '<div class="empty">No bookings here yet. Bookings from the website and the desk appear as soon as they are made.</div>';
 return '<table class="ptbl"><thead><tr><th>Reference</th><th>Guest</th><th>Type</th><th>Session</th><th class="n">Jumpers</th><th class="n">Total</th><th class="n">Balance</th><th>Status</th><th>Source</th></tr></thead><tbody>'+show.map(function(b){
  var bal=balOf(b),owes=bal>0&&b.status!=='cancelled'&&b.status!=='noshow';
  return '<tr data-pa="open" data-id="'+b.ref+'" tabindex="0"><td class="mono"><b>'+b.ref+'</b></td><td><b>'+esc(b.customer.name)+'</b><small>'+esc(b.customer.phone)+'</small></td><td>'+TYPE_NAME[b.type]+'</td><td class="tnum">'+shortDate(b.date)+'<small>'+h24(b.slot)+' to '+h24(b.slot+b.duration)+'</small></td><td class="n">'+b.jumpers+'</td><td class="n">'+money(b.total)+'</td><td class="n '+(owes?'owe':'')+'">'+(owes?money(bal):(bal<0?money(bal):'Paid'))+'</td><td>'+pill(b.status)+'</td><td><span class="src '+b.source+'">'+(b.source==='web'?'Web':'Desk')+'</span></td></tr>';
 }).join('')+'</tbody></table>'+(list.length>80?'<p class="hint" style="padding:12px">Showing 80 of '+list.length+'. Narrow the filter to see the rest.</p>':'');
};
var viewBookings=function(){
 var seg=function(k,l){return '<button data-pa="range" data-v="'+k+'" class="'+(P.fRange===k?'on':'')+'">'+l+'</button>'};
 return '<div class="ptop"><div><h1>Bookings</h1><p class="hint">Search by reference, name, phone or email. Type a full reference and press Enter to open it.</p></div></div>'+
 '<div class="toolbar"><input id="pq" class="in" data-pin="q" value="'+esc(P.q)+'" placeholder="Scan or type a reference, name or phone" aria-label="Search bookings"><div class="seg" style="margin:0">'+seg('today','Today')+seg('upcoming','Upcoming')+seg('all','All')+(P.fRange==='date'?'<button class="on">'+shortDate(P.date)+'</button>':'')+'</div>'+
 '<select class="in" data-pch="fstatus" aria-label="Status"><option value="all">All statuses</option>'+['reserved','confirmed','checkedin','completed','cancelled','noshow'].map(function(s){return '<option value="'+s+'" '+(P.fStatus===s?'selected':'')+'>'+statusLabel(s)+'</option>'}).join('')+'</select>'+
 (P.fSlot!=null?'<span class="chipf">Session '+h24(P.fSlot)+'<button data-pa="slot-clear" aria-label="Clear session filter">×</button></span>':'')+'</div>'+
 '<div class="panel" style="padding:0;overflow-x:auto" id="ptable">'+tableHTML()+'</div>';
};
var viewPods=function(){
 var close=dayClose(P.date),slots=[10,12,14,16].filter(function(x){return x+2<=close});
 var head='<tr><th></th>'+slots.map(function(s){return '<th>'+h24(s)+' to '+h24(s+2)+'</th>'}).join('')+'</tr>';
 var rows=PODS.map(function(pod){
  return '<tr><th><span class="podname">Pod '+pod+'</span></th>'+slots.map(function(s){
   var b=BK.filter(function(x){return x.type==='party'&&x.date===P.date&&x.slot===s&&x.status!=='cancelled'&&x.pods.indexOf(pod)>=0})[0];
   if(b){var n=partyAlloc(b.jumpers).filter(function(r){return r.pod===pod})[0];return '<td><div class="pod taken" data-pa="open" data-id="'+b.ref+'" tabindex="0"><b>'+esc(b.customer.name)+'</b>'+(n?n.n:b.jumpers)+' jumpers · '+b.ref+'<span style="margin-top:4px">'+pill(b.status)+'</span></div></td>'}
   if(CFG.closed[P.date+':'+s]||CFG.closed[P.date+':'+(s+1)])return '<td><div class="pod closed">Sales stopped</div></td>';
   return '<td><div class="pod">Free</div></td>';
  }).join('')+'</tr>';
 }).join('');
 return '<div class="ptop"><div><h1>Party pods</h1><p class="hint">Six pods, fill order F to A. Click a booked pod to open the party.</p></div><div class="tools">'+dnav()+'</div></div><div class="panel" style="overflow-x:auto"><table class="board"><thead>'+head+'</thead><tbody>'+rows+'</tbody></table></div>';
};
/* ---------- POS tab: till, cash-up, customers, rules ---------- */
var saleExtra=function(){return P.sale.socks*CFG.sock};
var saleTotal=function(){return total(P.sale)+saleExtra()};
var saleProblem=function(){
 var s=P.sale;
 if(P.cash.closed)return 'The day is closed. Reopen it in Payments & cash-up to keep selling.';
 if(s.slot==null)return 'Pick a session.';
 var pr=problem(s);if(pr)return pr;
 if(s.method==='cash'&&s.tender!==''&&Number(s.tender)<saleTotal())return 'Cash received is less than the total.';
 return '';
};
var saleLines=function(){
 var s=P.sale,out=[];
 if(s.type==='individual')PRODUCTS.forEach(function(p){var q=s.qty[p.id]||0;if(q)out.push([p.name+' × '+q,q*unit(s,p)])});
 else if(s.type==='group'){var q=s.qty.group||0;out.push(['Group jumpers × '+q,q*GROUP.price[s.duration][tierOf(s.date)]])}
 else partyAlloc(s.qty.party||0).forEach(function(r){out.push(['Pod '+r.pod+' · '+r.n+' jumpers',partyPod(r.n)])});
 if(s.socks)out.push(['Grip socks × '+s.socks,s.socks*CFG.sock]);
 return out;
};
var orderHTML=function(){
 var s=P.sale,tt=saleTotal(),pr=saleProblem(),lines=saleLines(),tender=Number(s.tender);
 var change=s.method==='cash'&&s.tender!==''&&tender>=tt?tender-tt:0;
 var m=function(k,l){return '<button data-pa="s-method" data-v="'+k+'" class="'+(s.method===k?'on':'')+'">'+l+'</button>'};
 return '<div class="panel order"><h3>Order<small>'+(s.slot!=null?shortDate(s.date)+' · '+h24(s.slot):'No session yet')+'</small></h3>'+
 (lines.length?lines.map(function(l){return '<div class="line"><span>'+l[0]+'</span><span class="tnum">'+money(l[1])+'</span></div>'}).join(''):'<p class="hint">Add passes to start the order.</p>')+
 '<div class="big-total"><span>Total (VAT incl.)</span><b>'+money(tt)+'</b></div>'+
 '<div class="row2" style="margin-top:14px"><label class="f" for="s-name">Guest name (optional)<input id="s-name" class="in" data-pin="s:name" value="'+esc(s.name)+'" placeholder="Walk-up guest"></label><label class="f" for="s-phone">Mobile (optional)<input id="s-phone" class="in" data-pin="s:phone" value="'+esc(s.phone)+'" placeholder="082 000 0000"></label></div>'+
 '<label class="consent" style="margin-top:12px"><input type="checkbox" data-pch="s-waiver" '+(s.waiver?'checked':'')+'><span>Waiver signed for every jumper (checks them in now)</span></label>'+
 '<div class="meth">'+m('cash','Cash')+m('card','Card')+m('eft','EFT')+'</div>'+
 (s.method==='cash'?'<label class="f" for="s-tender">Cash received<input id="s-tender" class="in" type="number" min="0" step="10" data-pin="s:tender" value="'+esc(s.tender)+'" placeholder="'+tt.toFixed(2)+'"></label><div class="quick"><button data-pa="s-tender" data-v="'+tt+'">Exact</button>'+[100,200,500].map(function(v){return '<button data-pa="s-tender" data-v="'+v+'">R'+v+'</button>'}).join('')+'</div><div class="line" style="margin-top:8px"><span>Change due</span><b class="tnum" id="chg">'+money(change)+'</b></div>':'')+
 '<p class="err" id="serr" style="margin-top:10px;min-height:20px">'+esc(pr)+'</p><button class="btn" style="width:100%;margin-top:6px" id="s-charge" data-pa="s-charge" '+(pr?'disabled':'')+'>Charge '+money(tt)+'</button></div>';
};
var viewSale=function(){
 var s=P.sale,seg=function(k,l){return '<button data-pa="s-type" data-v="'+k+'" class="'+(s.type===k?'on':'')+'">'+l+'</button>'};
 var dseg=s.type==='party'?'<p class="hint">Parties are always 2 hours.</p>':'<div class="seg"><button data-pa="s-dur" data-v="1" class="'+(s.duration===1?'on':'')+'">1 hour</button><button data-pa="s-dur" data-v="2" class="'+(s.duration===2?'on':'')+'">2 hours</button></div>';
 var tier=tierOf(s.date),slots=slotHours(s).map(function(h){
  var st=slotState(s,h),dis=(st.k==='past'||st.k==='full');
  return '<button class="slot '+(st.k==='low'?'low ':'')+(s.slot===h?'sel':'')+'" data-pa="s-slot" data-v="'+h+'" '+(dis?'disabled':'')+'><span>'+h24(h)+'</span><small>'+st.label+'</small></button>';
 }).join('');
 var passes;
 if(s.type==='individual'){
  passes=PRODUCTS.map(function(p){
   var q=s.qty[p.id]||0,b=bounds(s,p.id),pr=unit(s,p);
   return '<div class="prod"><div><h3>'+p.name+'</h3><p class="price tnum">'+(pr?money(pr):'Free')+(p.limit?' · max '+p.limit:'')+'</p></div><div class="stepper"><button data-pa="s-dec" data-id="'+p.id+'" '+(q<=b.min?'disabled':'')+' aria-label="Remove one">−</button><output>'+q+'</output><button data-pa="s-inc" data-id="'+p.id+'" '+(q>=b.max?'disabled':'')+' aria-label="Add one">+</button></div></div>';
  }).join('');
 }else{
  var key=s.type,q=s.qty[key]||0,b=bounds(s,key),pr=s.type==='group'?money(GROUP.price[s.duration][tier])+' per jumper · min '+CFG.groupMin:'Pod pricing from '+money0(CFG.pod.base)+' · min '+CFG.partyMin;
  passes='<div class="prod"><div><h3>'+(s.type==='group'?'Group jumpers':'Party jumpers')+'</h3><p class="price tnum">'+pr+'</p></div><div class="stepper"><button data-pa="s-dec" data-id="'+key+'" '+(q<=b.min?'disabled':'')+'>−</button><output>'+q+'</output><button data-pa="s-inc" data-id="'+key+'" '+(q>=b.max?'disabled':'')+'>+</button></div></div>';
 }
 var socks='<div class="prod"><div><h3>Grip socks</h3><p class="price tnum">'+money(CFG.sock)+' a pair</p></div><div class="stepper"><button data-pa="s-sock" data-v="-1" '+(s.socks<=0?'disabled':'')+'>−</button><output>'+s.socks+'</output><button data-pa="s-sock" data-v="1">+</button></div></div>';
 return '<div class="ptop"><div><h1>New sale</h1><p class="hint">Walk-up tickets, parties and groups. Capacity is shared with the website, so a sale here takes spots off the site instantly.</p></div></div>'+
 '<div class="sale"><div><div class="panel"><h3>1. What are they buying?</h3><div class="seg">'+seg('individual','Tickets')+seg('party','Party')+seg('group','Group')+'</div>'+dseg+'</div>'+
 '<div class="panel"><h3>2. Session<small>'+(tier==='peak'&&s.type!=='party'?'Peak rates':'Standard rates')+'</small></h3><div class="toolbar" style="margin-bottom:12px"><div class="seg" style="margin:0"><button data-pa="s-day" data-v="0" class="'+(s.date===todayS()?'on':'')+'">Today</button><button data-pa="s-day" data-v="1" class="'+(s.date===iso(addDays(todayD(),1))?'on':'')+'">Tomorrow</button></div><input type="date" class="in" style="width:auto;min-width:0;flex:none" min="'+todayS()+'" value="'+s.date+'" data-pch="s-date" aria-label="Pick a date"></div><div class="slotsm">'+slots+'</div></div>'+
 '<div class="panel"><h3>3. Passes</h3>'+passes+socks+'</div></div>'+orderHTML()+'</div>';
};

var METHODS=['Card (online)','Card','Cash','EFT'];
var viewCash=function(){
 var td=todayS(),pays=paymentsOn(td),tot={};METHODS.forEach(function(m){tot[m]=0});
 pays.forEach(function(x){tot[x.p.method]=(tot[x.p.method]||0)+x.p.amount});
 var sales=pays.filter(function(x){return x.p.amount>0}).reduce(function(a,x){return a+x.p.amount},0),refunds=pays.filter(function(x){return x.p.amount<0}).reduce(function(a,x){return a+x.p.amount},0);
 var expected=P.cash.float+(tot.Cash||0),counted=P.cash.counted===''?null:Number(P.cash.counted);
 var variance=counted==null?null:counted-expected;
 var srows=METHODS.map(function(m){return '<tr><td>'+m+'</td><td class="n">'+money(tot[m]||0)+'</td></tr>'}).join('');
 var ledger=pays.length?pays.slice().reverse().map(function(x){return '<tr data-pa="open" data-id="'+x.b.ref+'"><td class="tnum">'+fmtT(x.p.at)+'</td><td class="mono">'+x.b.ref+'</td><td>'+esc(x.b.customer.name)+'</td><td>'+x.p.method+'</td><td class="n '+(x.p.amount<0?'owe':'')+'">'+money(x.p.amount)+'</td><td>'+esc(x.p.by||'')+'</td></tr>'}).join(''):'<tr><td colspan="6" class="empty">No payments yet today.</td></tr>';
 return '<div class="ptop"><div><h1>Payments & cash-up</h1><p class="hint">Every payment from the website and the desk, by method. Count the drawer, then close the day.</p></div><div class="tools">'+(P.cash.closed?'<span class="status bad">Day closed</span><button class="btn ghost" data-pa="reopen-day">Reopen day</button>':'<button class="btn" data-pa="z-open">Close day</button>')+'</div></div>'+
 '<div class="cashgrid"><div><div class="panel"><h3>Takings today<small>'+shortDate(td)+'</small></h3><table class="mini"><tbody>'+srows+'<tr><td><b>Net takings</b></td><td class="n"><b>'+money(sales+refunds)+'</b></td></tr></tbody></table><p class="hint" style="margin-top:8px">Sales '+money(sales)+' · Refunds '+money(refunds)+'</p></div>'+
 '<div class="panel"><h3>Cash drawer</h3><div class="row2"><label class="f" for="float">Opening float<input id="float" class="in" type="number" min="0" step="50" data-pch="float" value="'+P.cash.float+'"></label><label class="f" for="counted">Counted now<input id="counted" class="in" type="number" min="0" step="10" data-pin="counted" value="'+esc(P.cash.counted)+'" placeholder="Count the drawer"></label></div><table class="mini" style="margin-top:12px"><tbody><tr><td>Opening float</td><td class="n">'+money(P.cash.float)+'</td></tr><tr><td>Cash taken today</td><td class="n">'+money(tot.Cash||0)+'</td></tr><tr><td><b>Expected in drawer</b></td><td class="n"><b>'+money(expected)+'</b></td></tr><tr><td>Variance</td><td class="n" id="var">'+(variance==null?'Enter a count':(variance===0?'Balanced':money(variance)+(variance>0?' over':' short')))+'</td></tr></tbody></table></div></div>'+
 '<div class="panel" style="padding:0;overflow-x:auto"><h3 style="padding:18px 20px 0">Ledger<small>Click a row to open the booking</small></h3><table class="ptbl"><thead><tr><th>Time</th><th>Reference</th><th>Guest</th><th>Method</th><th class="n">Amount</th><th>Taken by</th></tr></thead><tbody>'+ledger+'</tbody></table></div></div>';
};
var custs=function(){
 var m={};
 BK.forEach(function(b){
  var e=b.customer.email,c=m[e]||(m[e]={name:b.customer.name,phone:b.customer.phone,email:e,n:0,visits:0,spend:0,last:'',waiver:false,web:0});
  c.n++;if(b.status==='checkedin'||b.status==='completed')c.visits++;
  if(b.status!=='cancelled')c.spend+=paidOf(b);if(b.date>c.last&&b.status!=='cancelled')c.last=b.date;if(b.waiver)c.waiver=true;if(b.source==='web')c.web++;
 });
 return Object.keys(m).map(function(k){return m[k]}).sort(function(a,b){return b.spend-a.spend});
};
var viewCustomers=function(){
 var list=custs();
 return '<div class="ptop"><div><h1>Customers</h1><p class="hint">One profile per email, created when someone books on the website or at the desk. '+list.length+' accounts.</p></div></div><div class="panel" style="padding:0;overflow-x:auto"><table class="ptbl"><thead><tr><th>Guest</th><th>Contact</th><th class="n">Bookings</th><th class="n">Visits</th><th class="n">Spend</th><th>Last session</th><th>Waiver</th></tr></thead><tbody>'+list.map(function(c){
  return '<tr data-pa="cust" data-id="'+esc(c.email)+'"><td><b>'+esc(c.name)+'</b></td><td>'+esc(c.phone)+'<small>'+esc(c.email)+'</small></td><td class="n">'+c.n+'</td><td class="n">'+c.visits+'</td><td class="n">'+money0(c.spend)+'</td><td>'+(c.last?shortDate(c.last):'–')+'</td><td><span class="status '+(c.waiver?'ok':'wait')+'">'+(c.waiver?'On file':'Missing')+'</span></td></tr>';
 }).join('')+(list.length?'':'<tr><td colspan="7" class="empty">No customers yet. Accounts appear when someone books on the website or at the desk.</td></tr>')+'</tbody></table></div>';
};
var numIn=function(key,val,step){return '<input class="in num" type="number" min="0" step="'+(step||5)+'" value="'+val+'" data-pch="'+key+'" aria-label="'+esc(key)+'">'};
var viewRules=function(){
 var prow=function(name,id,p){return '<tr><td><b>'+name+'</b></td>'+[[1,'off'],[1,'peak'],[2,'off'],[2,'peak']].map(function(x){return '<td>'+numIn('p:'+id+':'+x[0]+':'+x[1],p[x[0]][x[1]])+'</td>'}).join('')+'</tr>'};
 var closedList=Object.keys(CFG.closed).sort().map(function(k){var p=k.split(':');return '<span class="chipf">'+shortDate(p[0])+' '+h24(Number(p[1]))+'<button data-pa="reopen" data-v="'+k+'" aria-label="Reopen">×</button></span>'}).join(' ')||'<span class="hint">None. Use Stop sales on the Today tab to close a session.</span>';
 return '<div class="ptop"><div><h1>Pricing & rules</h1><p class="hint">Changes apply to the website straight away: prices, peak days, capacity and minimums.</p></div></div>'+
 '<div class="pgrid"><div><div class="panel" style="padding:0;overflow-x:auto"><h3 style="padding:18px 20px 0">Ticket prices (rand, VAT incl.)</h3><table class="ptbl rules"><thead><tr><th>Pass</th><th>1h off-peak</th><th>1h peak</th><th>2h off-peak</th><th>2h peak</th></tr></thead><tbody>'+PRODUCTS.map(function(p){return prow(p.name,p.id,p.price)}).join('')+prow('Group (per jumper)','group',GROUP.price)+'</tbody></table></div>'+
 '<div class="panel"><h3>Party pod pricing</h3><div class="row2" style="grid-template-columns:repeat(3,1fr)"><label class="f">Up to 10 jumpers'+numIn('pod:base',CFG.pod.base,50)+'</label><label class="f">Per jumper, 11 to 14'+numIn('pod:per',CFG.pod.per,10)+'</label><label class="f">Full pod of 15'+numIn('pod:full',CFG.pod.full,50)+'</label></div></div></div>'+
 '<div><div class="panel"><h3>Capacity and minimums</h3><div class="row2"><label class="f">Jumpers per hour'+numIn('cap',CFG.cap,10)+'</label><label class="f">Grip socks (R)'+numIn('sock',CFG.sock,5)+'</label><label class="f">Party minimum'+numIn('partyMin',CFG.partyMin,1)+'</label><label class="f">Group minimum'+numIn('groupMin',CFG.groupMin,1)+'</label></div></div>'+
 '<div class="panel"><h3>Peak days</h3><div class="pk">'+[1,2,3,4,5,6,0].map(function(d){return '<button data-pa="peak" data-v="'+d+'" class="'+(CFG.peak[d]?'on':'')+'">'+DOW[d]+'</button>'}).join('')+'</div><p class="hint" style="margin-top:8px">Highlighted days use peak prices. The date label on the website updates with it.</p></div>'+
 '<div class="panel"><h3>Closed sessions</h3><div style="display:flex;gap:8px;flex-wrap:wrap">'+closedList+'</div></div></div></div>';
};
/* ---------- POS tab: booking drawer, modals, shell ---------- */
var linesText=function(b){
 if(b.type==='individual')return PRODUCTS.filter(function(p){return b.lines[p.id]}).map(function(p){return p.name+' × '+b.lines[p.id]});
 if(b.type==='group')return ['Group jumpers × '+(b.lines.group||b.jumpers)];
 return partyAlloc(b.jumpers).map(function(r,i){return 'Pod '+(b.pods[i]||r.pod)+' · '+r.n+' jumpers'});
};
var drawerHTML=function(){
 var b=byRef(P.open);if(!b)return '';
 var bal=balOf(b),paid=paidOf(b),st=b.status,late=startTs(b)+15*60000<=Date.now();
 var btns=[];
 if(st==='reserved'||st==='confirmed')btns.push('<button class="btn" data-pa="checkin" data-id="'+b.ref+'">Check in</button>');
 if(bal>0&&st!=='cancelled'&&st!=='noshow')btns.push('<button class="btn ghost" data-pa="pay" data-id="'+b.ref+'">Collect '+money(bal)+'</button>');
 if(paid>0&&(st==='checkedin'||st==='completed'||st==='cancelled'||st==='noshow'||st==='confirmed'))btns.push('<button class="btn ghost" data-pa="refund" data-id="'+b.ref+'">Refund</button>');
 if(st==='reserved'||st==='confirmed'){btns.push('<button class="btn ghost" data-pa="cancel" data-id="'+b.ref+'">Cancel booking</button>');if(late)btns.push('<button class="btn ghost" data-pa="noshow" data-id="'+b.ref+'">No-show</button>')}
 btns.push('<button class="btn ghost" data-pa="note" data-id="'+b.ref+'">Add note</button>');
 btns.push('<button class="btn ghost" data-pa="resend" data-id="'+b.ref+'">Resend confirmation</button>');
 if(st==='checkedin'||st==='completed')btns.push('<button class="btn ghost" data-pa="bands" data-id="'+b.ref+'">Reprint wristbands</button>');
 return '<aside class="drawer" role="dialog" aria-label="Booking '+b.ref+'"><div class="dh"><div><div class="ref" style="font-size:22px">'+b.ref+'</div><div style="margin-top:6px;display:flex;gap:8px;align-items:center">'+pill(st)+'<span class="src '+b.source+'">'+(b.source==='web'?'Website':'Desk')+'</span></div></div><button class="xbtn" data-pa="close-drawer" aria-label="Close">×</button></div>'+
 '<div class="db"><div><h4>Guest</h4><dl class="dl"><dt>Name</dt><dd>'+esc(b.customer.name)+'</dd><dt>Mobile</dt><dd>'+esc(b.customer.phone)+'</dd><dt>Email</dt><dd style="word-break:break-all">'+esc(b.customer.email)+'</dd><dt>Waiver</dt><dd>'+(b.waiver?'Signed':'Not yet signed')+'</dd></dl></div>'+
 '<div><h4>Session</h4><dl class="dl"><dt>Type</dt><dd>'+TYPE_NAME[b.type]+'</dd><dt>When</dt><dd class="tnum">'+fmtDate(b.date)+', '+h24(b.slot)+' to '+h24(b.slot+b.duration)+'</dd><dt>Jumpers</dt><dd>'+b.jumpers+(b.guests>b.jumpers?' + '+(b.guests-b.jumpers)+' sideline':'')+'</dd>'+(b.pods.length?'<dt>Pods</dt><dd>'+b.pods.join(', ')+'</dd>':'')+(b.arrived?'<dt>Checked in</dt><dd>'+b.arrived+' wristbands</dd>':'')+'</dl></div>'+
 '<div><h4>Order</h4><table class="mini"><tbody>'+linesText(b).map(function(l){return '<tr><td>'+l+'</td><td></td></tr>'}).join('')+(b.socks?'<tr><td>Grip socks × '+b.socks+'</td><td class="n">'+money(b.socks*CFG.sock)+'</td></tr>':'')+'<tr><td><b>Total</b></td><td class="n"><b>'+money(b.total)+'</b></td></tr></tbody></table></div>'+
 '<div><h4>Payments</h4>'+(b.payments.length?'<table class="mini"><tbody>'+b.payments.map(function(p){return '<tr><td>'+fmtT(p.at)+' · '+p.method+'<br><span class="hint">'+shortDate(dayOfTs(p.at))+' · '+esc(p.by||'')+'</span></td><td class="n '+(p.amount<0?'owe':'')+'">'+money(p.amount)+'</td></tr>'}).join('')+'<tr><td><b>Balance</b></td><td class="n '+(bal>0?'owe':'')+'"><b>'+(bal>0?money(bal)+' due':(bal<0?money(bal):'Paid in full'))+'</b></td></tr></tbody></table>':'<p class="hint">No payment yet. Balance '+money(bal)+'.</p>')+'</div>'+
 (b.notes?'<div><h4>Notes</h4><p>'+esc(b.notes)+'</p></div>':'')+
 '<div><h4>History</h4><ul class="tl">'+b.log.slice().reverse().map(function(l){return '<li><b>'+fmtT(l.t)+'</b> '+esc(l.msg)+(l.by?' ('+esc(l.by)+')':'')+'</li>'}).join('')+'</ul></div></div><div class="df">'+btns.join('')+'</div></aside>';
};

var PM={cash:'Cash',card:'Card',eft:'EFT'};
var mb=function(f,cur,opts){return '<div class="meth">'+opts.map(function(o){return '<button data-pa="m-set" data-f="'+f+'" data-v="'+o[0]+'" class="'+(cur===o[0]?'on':'')+'">'+o[1]+'</button>'}).join('')+'</div>'};
var pmodalHTML=function(){
 var m=P.modal;if(!m)return '';
 var b=m.id?byRef(m.id):null,wrap=function(inner){return '<div class="overlay" data-pa="m-close"><div class="modal" role="dialog" data-stop="1">'+inner+'</div></div>'};
 if(m.k==='checkin'){
  var sk=m.socks*CFG.sock,due=Math.max(0,balOf(b)+sk);
  return wrap('<h2>Check in '+esc(b.customer.name)+'</h2><p class="sub">'+b.ref+' · '+h24(b.slot)+' · '+b.jumpers+' jumpers booked</p>'+
  '<div class="line" style="margin-top:16px"><span>Jumpers arriving (wristbands)</span><div class="stepper"><button data-pa="m-arr" data-v="-1" '+(m.arrived<=1?'disabled':'')+'>−</button><output>'+m.arrived+'</output><button data-pa="m-arr" data-v="1" '+(m.arrived>=b.jumpers?'disabled':'')+'>+</button></div></div>'+
  '<div class="line"><span>Grip socks sold ('+money(CFG.sock)+' each)</span><div class="stepper"><button data-pa="m-sock" data-v="-1" '+(m.socks<=0?'disabled':'')+'>−</button><output>'+m.socks+'</output><button data-pa="m-sock" data-v="1">+</button></div></div>'+
  '<label class="consent" style="margin:12px 0"><input type="checkbox" data-pch="m-waiver" '+(m.waiver?'checked':'')+'><span>Waiver signed for every arriving jumper'+(b.waiver?' (already on file)':'')+'</span></label>'+
  (due>0?'<div class="big-total"><span>Collect now</span><b>'+money(due)+'</b></div>'+mb('method',m.method,[['cash','Cash'],['card','Card'],['eft','EFT']]):'<p class="notice">Paid in full. Nothing to collect.</p>')+
  '<div class="actions"><button class="btn ghost" data-pa="m-close">Cancel</button><button class="btn" data-pa="m-confirm" '+(m.waiver?'':'disabled')+'>'+(due>0?'Collect '+money(due)+' & check in':'Check in')+'</button></div>');
 }
 if(m.k==='pay')return wrap('<h2>Collect payment</h2><p class="sub">'+b.ref+' · '+esc(b.customer.name)+' · balance '+money(balOf(b))+'</p><label class="f" style="margin-top:14px" for="m-amt">Amount<input id="m-amt" class="in" type="number" min="0" step="10" data-pin="m:amount" value="'+m.amount+'"></label>'+mb('method',m.method,[['cash','Cash'],['card','Card'],['eft','EFT']])+'<div class="actions"><button class="btn ghost" data-pa="m-close">Cancel</button><button class="btn" data-pa="m-confirm">Take payment</button></div>');
 if(m.k==='refund')return wrap('<h2>Refund</h2><p class="sub">'+b.ref+' · paid '+money(paidOf(b))+'. Website terms say non-refundable, so this is logged as a manager override.</p><label class="f" style="margin-top:14px" for="m-amt">Refund amount<input id="m-amt" class="in" type="number" min="0" step="10" data-pin="m:amount" value="'+m.amount+'"></label><label class="f" style="margin-top:10px" for="m-rs">Reason<select id="m-rs" class="in" data-pch="m-reason">'+['Customer request','Session closed by the venue','Booked twice','Injury or illness','Other'].map(function(r){return '<option '+(m.reason===r?'selected':'')+'>'+r+'</option>'}).join('')+'</select></label>'+mb('method',m.method,[['Card (online)','Back to card'],['Cash','Cash'],['EFT','EFT']])+'<div class="actions"><button class="btn ghost" data-pa="m-close">Keep payment</button><button class="btn danger" data-pa="m-confirm">Refund</button></div>');
 if(m.k==='cancel')return wrap('<h2>Cancel booking?</h2><p class="sub">'+b.ref+' · '+esc(b.customer.name)+' · '+b.jumpers+' jumpers. The spots go back on sale on the website straight away.</p>'+(paidOf(b)>0?'<label class="consent" style="margin-top:14px"><input type="checkbox" data-pch="m-refund" '+(m.refund?'checked':'')+'><span>Refund '+money(paidOf(b))+' as a manager override (policy: non-refundable)</span></label>':'')+'<div class="actions"><button class="btn ghost" data-pa="m-close">Keep booking</button><button class="btn danger" data-pa="m-confirm">Cancel booking</button></div>');
 if(m.k==='note')return wrap('<h2>Booking note</h2><p class="sub">'+b.ref+'</p><label class="f" style="margin-top:12px" for="m-note">Note<textarea id="m-note" class="in" data-pin="m:text">'+esc(m.text)+'</textarea></label><div class="actions"><button class="btn ghost" data-pa="m-close">Cancel</button><button class="btn" data-pa="m-confirm">Save note</button></div>');
 if(m.k==='receipt'){var rl=saleReceipt(b);return wrap('<div class="done-top"><div class="tick">'+I.check+'</div><div><h2>Sale complete</h2><p class="sub">'+(b.status==='checkedin'?'Checked in. Hand out '+b.arrived+' wristbands.':'Booked for '+shortDate(b.date)+'.')+'</p></div></div><p class="hint">Reference</p><div class="ref" style="margin-bottom:12px">'+b.ref+'</div>'+rl+'<div class="actions"><button class="btn ghost" data-pa="open" data-id="'+b.ref+'">Open booking</button><button class="btn" data-pa="m-close">New sale</button></div>');}
 if(m.k==='z'){
  var td=todayS(),pays=paymentsOn(td),tot={};METHODS.forEach(function(x){tot[x]=0});pays.forEach(function(x){tot[x.p.method]=(tot[x.p.method]||0)+x.p.amount});
  var net=pays.reduce(function(a,x){return a+x.p.amount},0),exp=P.cash.float+(tot.Cash||0),cnt=P.cash.counted===''?null:Number(P.cash.counted);
  var day=dayActive(td),jumped=day.filter(function(x){return x.status==='checkedin'||x.status==='completed'}).reduce(function(a,x){return a+x.jumpers},0);
  return wrap('<h2>Close the day</h2><p class="sub">Z report for '+fmtDate(td)+'. Cashier '+CASHIER+'.</p><div class="zr" style="margin-top:14px">'+METHODS.map(function(x){return '<div><span>'+x+'</span><span>'+money(tot[x]||0)+'</span></div>'}).join('')+'<hr><div><b>Net takings</b><b>'+money(net)+'</b></div><div><span>Bookings today</span><span>'+day.length+'</span></div><div><span>Jumpers through the door</span><span>'+jumped+'</span></div><hr><div><span>Expected cash</span><span>'+money(exp)+'</span></div><div><span>Counted</span><span>'+(cnt==null?'not counted':money(cnt))+'</span></div><div><span>Variance</span><span>'+(cnt==null?'-':money(cnt-exp))+'</span></div></div>'+(cnt==null?'<p class="err" style="margin-top:12px">Count the drawer first so the variance is on the report.</p>':'')+'<div class="actions"><button class="btn ghost" data-pa="m-close">Back</button><button class="btn" data-pa="m-confirm" '+(cnt==null?'disabled':'')+'>Close day</button></div>');
 }
 return '';
};
var saleReceipt=function(b){
 return '<table class="mini"><tbody>'+linesText(b).map(function(l){return '<tr><td>'+l+'</td><td></td></tr>'}).join('')+(b.socks?'<tr><td>Grip socks × '+b.socks+'</td><td class="n">'+money(b.socks*CFG.sock)+'</td></tr>':'')+'<tr><td><b>Total paid</b></td><td class="n"><b>'+money(paidOf(b))+'</b></td></tr></tbody></table>';
};

var posHTML=function(){
 var awaiting=BK.filter(function(b){return b.status==='reserved'&&b.date>=todayS()}).length;
 var counts={bookings:awaiting||''};
 var nav=NAV.map(function(n){return '<button class="nbtn '+(P.view===n[0]?'on':'')+'" data-pa="nav" data-v="'+n[0]+'">'+n[1]+(counts[n[0]]?'<span class="c">'+counts[n[0]]+'</span>':'')+'</button>'}).join('');
 var v={today:viewToday,bookings:viewBookings,sale:viewSale,pods:viewPods,cash:viewCash,customers:viewCustomers,rules:viewRules}[P.view]();
 var tools='<div class="ptop" style="justify-content:flex-end;margin-bottom:10px"><div class="tools"><label class="hint" style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-pch="auto" '+(P.auto?'checked':'')+'> Auto web traffic</label><button class="btn ghost sm" data-pa="sim">Simulate web booking</button></div></div>';
 return '<div class="pos"><aside class="side"><div class="brand">'+I.logo+'<div><small>Front desk</small></div></div>'+nav+'<div class="who"><b>'+CASHIER+'</b>Till 1 · '+(P.cash.closed?'Day closed':'Open')+'<div class="clock" id="clock">'+fmtT(Date.now())+'</div></div></aside><section class="pmain">'+tools+v+'</section></div>'+
 (P.open?drawerHTML():'')+pmodalHTML()+(P.toast?'<div class="toast" style="bottom:28px" role="status">'+esc(P.toast)+'</div>':'');
};
var renderPos=function(keep){
 tickStatuses();P.seenTs=Date.now();
 var y=window.scrollY;
 $('pos').innerHTML=posHTML();
 window.scrollTo(0,keep?y:0);
 renderProto();
};
var ptoast=function(msg){P.toast=msg;renderPos(true);setTimeout(function(){P.toast='';if(MODE==='pos')renderPos(true)},2400)};
var renderProto=function(){
 var unseen=MODE==='pos'?0:EV.filter(function(e){return e.kind==='web'&&e.t>P.seenTs}).length;
 $('proto').innerHTML='<span class="lbl">Prototype</span><div class="ptabs" role="tablist"><button class="ptab '+(MODE==='site'?'on':'')+'" data-tab="site" role="tab">Website</button><button class="ptab '+(MODE==='pos'?'on':'')+'" data-tab="pos" role="tab">POS · Front desk'+(unseen?'<span class="bdg">'+unseen+' new</span>':'')+'</button></div><span class="sp"></span><span class="sync">One live data store behind both tabs</span><button class="rst" data-tab="reset">Reset demo data</button>';
};
window.__protoRender=function(){renderProto()};
/* ---------- POS actions ---------- */
var DEFAULTS=JSON.stringify({cfg:CFG,prods:PRODUCTS.map(function(p){return p.price}),group:GROUP.price});
var restoreDefaults=function(){
 var d=JSON.parse(DEFAULTS);
 CFG.cap=d.cfg.cap;CFG.peak=d.cfg.peak;CFG.sock=d.cfg.sock;CFG.pod=d.cfg.pod;CFG.partyMin=d.cfg.partyMin;CFG.groupMin=d.cfg.groupMin;CFG.closed={};
 PRODUCTS.forEach(function(p,i){p.price=d.prods[i]});GROUP.price=d.group;
};
var payLabel=function(m){return PM[m]||m};
var saleReset=function(){var s=P.sale;s.qty=s.type==='individual'?{jumper:1}:(s.type==='party'?{party:CFG.partyMin}:{group:CFG.groupMin});s.slot=null;s.socks=0;s.name='';s.phone='';s.tender='';s.waiver=true};
var saleClamp=function(){
 var s=P.sale;if(s.slot==null)return;
 var sp=curSpotsAt(s,s.slot);
 if(s.type==='individual'){if(playing(s)>sp)s.qty.jumper=Math.max(0,sp);return}
 var b=bounds(s,s.type);s.qty[s.type]=Math.max(b.min,Math.min(b.max,s.qty[s.type]||b.min));
};
var refreshOrder=function(){
 var el=document.querySelector('.order');if(!el)return;
 var tmp=document.createElement('div');tmp.innerHTML=orderHTML();
 el.replaceWith(tmp.firstChild);
};
var applyRule=function(key,val){
 var v=Math.max(0,Number(val)||0),k=key.split(':'),label='';
 if(key==='cap'){CFG.cap=Math.max(1,Math.round(v));label='Capacity set to '+CFG.cap+' jumpers per hour'}
 else if(key==='sock'){CFG.sock=v;label='Grip socks now '+money(v)}
 else if(key==='partyMin'){CFG.partyMin=Math.max(1,Math.round(v));label='Party minimum is now '+CFG.partyMin}
 else if(key==='groupMin'){CFG.groupMin=Math.max(1,Math.round(v));label='Group minimum is now '+CFG.groupMin}
 else if(k[0]==='pod'){CFG.pod[k[1]]=v;label='Party pod price updated'}
 else if(k[0]==='p'){
  var tgt=k[1]==='group'?GROUP:PRODUCTS.filter(function(p){return p.id===k[1]})[0];
  if(tgt){tgt.price[k[2]][k[3]]=v;label=(k[1]==='group'?'Group rate':tgt.name)+' '+k[2]+'h '+(k[3]==='peak'?'peak':'off-peak')+' price is now '+money(v)}
 }
 if(label)addEv('sys','Rule change: '+label,'');
 renderPos(true);
};
var confirmModal=function(){
 var m=P.modal,b=m.id?byRef(m.id):null,by=CASHIER;
 if(m.k==='checkin'){
  var sk=m.socks*CFG.sock;
  if(m.socks){b.total+=sk;b.socks+=m.socks}
  var bal=balOf(b);
  if(bal>0){b.payments.push(mkPay(payLabel(m.method),bal,by));addLog(b,'Collected '+money(bal)+' by '+payLabel(m.method).toLowerCase(),by);addEv('pay','Payment '+b.ref+': '+b.customer.name+', '+money(bal)+' ('+payLabel(m.method)+')',b.ref)}
  b.status='checkedin';b.waiver=true;b.arrived=m.arrived;
  addLog(b,'Checked in, '+m.arrived+' wristbands'+(m.socks?', '+m.socks+' socks sold':''),by);
  addEv('checkin','Checked in '+b.ref+': '+b.customer.name+', '+m.arrived+' jumpers',b.ref);
 }else if(m.k==='pay'){
  var amt=Math.min(Number(m.amount)||0,balOf(b));
  if(amt<=0){return}
  b.payments.push(mkPay(payLabel(m.method),amt,by));addLog(b,'Collected '+money(amt)+' by '+payLabel(m.method).toLowerCase(),by);
  if(b.status==='reserved'&&balOf(b)<=0)b.status='confirmed';
  addEv('pay','Payment '+b.ref+': '+b.customer.name+', '+money(amt)+' ('+payLabel(m.method)+')',b.ref);
 }else if(m.k==='refund'){
  var r=Math.min(Number(m.amount)||0,paidOf(b));
  if(r<=0)return;
  b.payments.push(mkPay(payLabel(m.method),-r,by));addLog(b,'Refunded '+money(r)+' ('+m.reason+', manager override)',by);
  addEv('refund','Refund '+b.ref+': '+b.customer.name+', '+money(r),b.ref);
 }else if(m.k==='cancel'){
  b.status='cancelled';addLog(b,'Booking cancelled at the desk',by);
  addEv('cancel','Cancelled '+b.ref+': '+b.customer.name+', '+b.jumpers+' spots released',b.ref);
  if(m.refund&&paidOf(b)>0){var rr=paidOf(b);b.payments.push(mkPay('Card (online)',-rr,by));addLog(b,'Refunded '+money(rr)+' (cancellation, manager override)',by);addEv('refund','Refund '+b.ref+': '+money(rr),b.ref)}
 }else if(m.k==='note'){
  b.notes=m.text;addLog(b,'Note updated',by);
 }else if(m.k==='z'){
  P.cash.closed=true;addEv('sys','Day closed by '+CASHIER,'');
 }
 P.modal=null;renderPos(true);
};
var pa={
 'nav':function(t){P.view=t.dataset.v;P.open=null;P.modal=null;if(P.view==='bookings'&&P.fRange==='date')P.fRange='today';renderPos()},
 'date-step':function(t){P.date=iso(addDays(parse(P.date),Number(t.dataset.v)));renderPos(true)},
 'date-today':function(){P.date=todayS();renderPos(true)},
 'toggle-slot':function(t){var k=P.date+':'+t.dataset.v;if(CFG.closed[k])delete CFG.closed[k];else CFG.closed[k]=true;addEv('sys','Sales '+(CFG.closed[k]?'stopped':'reopened')+' for '+shortDate(P.date)+' '+h24(Number(t.dataset.v)),'');renderPos(true)},
 'reopen':function(t){delete CFG.closed[t.dataset.v];renderPos(true)},
 'slot-filter':function(t){P.view='bookings';P.fRange='date';P.fSlot=Number(t.dataset.v);P.fStatus='all';P.q='';renderPos()},
 'slot-clear':function(){P.fSlot=null;renderPos(true)},
 'range':function(t){P.fRange=t.dataset.v;P.fSlot=null;renderPos(true)},
 'open':function(t){P.modal=null;P.open=t.dataset.id;if(P.view==='cash'||P.view==='pods'||P.view==='today')P.view=P.view;renderPos(true)},
 'close-drawer':function(){P.open=null;renderPos(true)},
 'cust':function(t){P.view='bookings';P.fRange='all';P.fSlot=null;P.fStatus='all';P.q=t.dataset.id;renderPos()},
 'checkin':function(t){var b=byRef(t.dataset.id);P.modal={k:'checkin',id:b.ref,arrived:b.jumpers,waiver:b.waiver,socks:0,method:'cash'};renderPos(true)},
 'pay':function(t){var b=byRef(t.dataset.id);P.modal={k:'pay',id:b.ref,amount:balOf(b),method:'card'};renderPos(true)},
 'refund':function(t){var b=byRef(t.dataset.id);P.modal={k:'refund',id:b.ref,amount:paidOf(b),method:'Card (online)',reason:'Customer request'};renderPos(true)},
 'cancel':function(t){var b=byRef(t.dataset.id);P.modal={k:'cancel',id:b.ref,refund:false};renderPos(true)},
 'note':function(t){var b=byRef(t.dataset.id);P.modal={k:'note',id:b.ref,text:b.notes};renderPos(true)},
 'noshow':function(t){var b=byRef(t.dataset.id);b.status='noshow';addLog(b,'Marked no-show',CASHIER);addEv('cancel','No-show '+b.ref+': '+b.customer.name,b.ref);renderPos(true)},
 'resend':function(t){var b=byRef(t.dataset.id);ptoast('Confirmation sent to '+b.customer.email)},
 'bands':function(t){var b=byRef(t.dataset.id);ptoast('Printing '+(b.arrived||b.jumpers)+' wristbands')},
 'm-close':function(t,e){if(t.classList.contains('overlay')&&e.target!==t)return;P.modal=null;renderPos(true)},
 'm-set':function(t){P.modal[t.dataset.f]=t.dataset.v;renderPos(true)},
 'm-arr':function(t){P.modal.arrived=Math.max(1,P.modal.arrived+Number(t.dataset.v));renderPos(true)},
 'm-sock':function(t){P.modal.socks=Math.max(0,P.modal.socks+Number(t.dataset.v));renderPos(true)},
 'm-confirm':function(){confirmModal()},
 'z-open':function(){P.modal={k:'z'};renderPos(true)},
 'reopen-day':function(){P.cash.closed=false;addEv('sys','Day reopened by '+CASHIER,'');renderPos(true)},
 'peak':function(t){var d=Number(t.dataset.v);if(CFG.peak[d])delete CFG.peak[d];else CFG.peak[d]=1;addEv('sys','Rule change: '+DOW[d]+' is now '+(CFG.peak[d]?'peak':'off-peak'),'');renderPos(true)},
 'sim':function(){
  var r=Math.random(),type=r<0.7?'individual':(r<0.85?'party':'group'),b=null,i;
  for(i=0;i<3&&!b;i++)b=simBooking({type:type,duration:1,date:iso(addDays(todayD(),i))});
  ptoast(b?'New web booking '+b.ref+' for '+b.customer.name:'No space left to simulate a booking');
 },
 's-type':function(t){var s=P.sale;s.type=t.dataset.v;s.duration=s.type==='party'?2:(s.duration||1);saleReset();renderPos(true)},
 's-dur':function(t){P.sale.duration=Number(t.dataset.v);P.sale.slot=null;renderPos(true)},
 's-day':function(t){P.sale.date=iso(addDays(todayD(),Number(t.dataset.v)));P.sale.slot=null;renderPos(true)},
 's-slot':function(t){P.sale.slot=Number(t.dataset.v);saleClamp();renderPos(true)},
 's-inc':function(t){var s=P.sale,id=t.dataset.id,key=s.type==='individual'?id:s.type,b=bounds(s,id),q=s.qty[key]||0;if(q<b.max){s.qty[key]=q+1;renderPos(true)}},
 's-dec':function(t){var s=P.sale,id=t.dataset.id,key=s.type==='individual'?id:s.type,b=bounds(s,id),q=s.qty[key]||0;if(q>b.min){s.qty[key]=q-1;renderPos(true)}},
 's-sock':function(t){P.sale.socks=Math.max(0,P.sale.socks+Number(t.dataset.v));refreshOrder();renderPos(true)},
 's-method':function(t){P.sale.method=t.dataset.v;renderPos(true)},
 's-tender':function(t){P.sale.tender=String(Number(t.dataset.v));renderPos(true)},
 's-charge':function(){
  var s=P.sale;if(saleProblem())return;
  var tt=saleTotal(),ph=s.phone.replace(/\D/g,''),cust={name:s.name.trim()||'Walk-up guest',phone:s.phone.trim()||'-',email:(ph||'walkup')+'@desk.local'};
  var ml=PM[s.method],inNow=s.date===todayS()&&s.waiver,st=inNow?'checkedin':'confirmed';
  var b=newBooking(s,{source:'pos',customer:cust,status:st,payments:[mkPay(ml,tt,CASHIER)],socks:s.socks,waiver:s.waiver,arrived:inNow?jumpers(s):0});
  addLog(b,'Walk-up sale at the desk, paid by '+ml.toLowerCase(),CASHIER);
  if(inNow)addLog(b,'Checked in, '+b.arrived+' wristbands',CASHIER);
  addEv('sale','Desk sale '+b.ref+': '+cust.name+', '+b.jumpers+' jumpers, '+money(tt)+' ('+ml+')',b.ref);
  saleReset();P.modal={k:'receipt',id:b.ref};renderPos(true);
 }
};

/* ---------- wiring ---------- */
var SCROLL={site:0,pos:0};
var switchTab=function(t){
 if(t==='reset'){
  seed();restoreDefaults();P.open=null;P.modal=null;P.cash={float:500,counted:'',closed:false};P.q='';P.fRange='today';P.fStatus='all';P.fSlot=null;P.date=todayS();P.seenTs=Date.now();
  P.sale={type:'individual',duration:1,date:todayS(),slot:null,qty:{jumper:1},socks:0,pos:true,name:'',phone:'',method:'cash',tender:'',waiver:true};
  S.slot=null;S.qty={};if(S.view==='done')S.view='landing';
  if(MODE==='pos')renderPos();else render();
  renderProto();return;
 }
 if(t===MODE)return;
 SCROLL[MODE]=window.scrollY;MODE=t;
 $('site').hidden=MODE!=='site';$('pos').hidden=MODE!=='pos';
 if(MODE==='pos'){var unseen=EV.filter(function(e){return e.kind==='web'&&e.t>P.seenTs}).length;renderPos(true);if(unseen)ptoast(unseen+' new online booking'+(unseen===1?'':'s')+' since you last looked')}
 else render(true);
 renderProto();window.scrollTo(0,SCROLL[MODE]||0);
};
document.addEventListener('click',function(e){
 var tab=e.target.closest('[data-tab]');if(tab){switchTab(tab.dataset.tab);return}
 var p=e.target.closest('[data-pa]');
 if(p){var fn=pa[p.dataset.pa];if(fn)fn(p,e);return}
 var t=e.target.closest('[data-act]');
 if(!t){if(MODE==='site'&&S.calOpen&&!e.target.closest('.cal')){S.calOpen=false;render(true)}return}
 var a=t.dataset.act;
 if(a==='consent')return;
 if(t.classList.contains('overlay')&&e.target!==t)return;
 var fn2=siteActions[a];if(fn2)fn2(t,e);
});
document.addEventListener('change',function(e){
 var t=e.target,d=t.dataset||{};
 if(d.act==='consent')siteActions.consent(t);
 if(d.bindUser==='cc')S.user.cc=t.value;
 var k=d.pch;if(!k)return;
 if(k==='fstatus'){P.fStatus=t.value;renderPos(true)}
 else if(k==='s-date'){var v=t.value||todayS();P.sale.date=v<todayS()?todayS():v;P.sale.slot=null;renderPos(true)}
 else if(k==='s-waiver'){P.sale.waiver=t.checked}
 else if(k==='m-waiver'){P.modal.waiver=t.checked;renderPos(true)}
 else if(k==='m-reason'){P.modal.reason=t.value}
 else if(k==='m-refund'){P.modal.refund=t.checked}
 else if(k==='auto'){P.auto=t.checked}
 else if(k==='float'){P.cash.float=Math.max(0,Number(t.value)||0);renderPos(true)}
 else applyRule(k,t.value);
});
document.addEventListener('input',function(e){
 var t=e.target,d=t.dataset||{};
 if(d.bindUser&&d.bindUser!=='cc')S.user[d.bindUser]=t.value;
 if(d.bindAuth){S.auth[d.bindAuth]=t.value;var g=$('gate-go');if(g)g.disabled=!authOK()}
 if(d.bindNotes)S.notes=t.value;
 var k=d.pin;if(!k)return;
 if(k==='q'){P.q=t.value;var tb=$('ptable');if(tb)tb.innerHTML=tableHTML()}
 else if(k.indexOf('s:')===0){
  P.sale[k.slice(2)]=t.value;
  if(k==='s:tender'){
   var tt=saleTotal(),tn=Number(t.value),c=$('chg');if(c)c.textContent=money(t.value!==''&&tn>=tt?tn-tt:0);
   var er=$('serr'),pr=saleProblem();if(er)er.textContent=pr;var cb=$('s-charge');if(cb)cb.disabled=!!pr;
  }
 }
 else if(k==='counted'){P.cash.counted=t.value;var v=$('var'),exp=P.cash.float+paymentsOn(todayS()).filter(function(x){return x.p.method==='Cash'}).reduce(function(a,x){return a+x.p.amount},0);if(v){if(t.value==='')v.textContent='Enter a count';else{var df=Number(t.value)-exp;v.textContent=df===0?'Balanced':money(df)+(df>0?' over':' short')}}}
 else if(k.indexOf('m:')===0){P.modal[k.slice(2)]=t.value}
});
document.addEventListener('keydown',function(e){
 if(e.key==='Escape'){
  if(MODE==='pos'){if(P.modal){P.modal=null;renderPos(true)}else if(P.open){P.open=null;renderPos(true)}}
  else{if(S.modal==='waiver'||S.modal==='card'){S.modal=null;render(true)}else if(S.calOpen){S.calOpen=false;render(true)}}
 }
 if(e.key==='Enter'){
  var t=e.target;
  if(t.dataset&&t.dataset.pin==='q'){var m=byRef(P.q.trim().toUpperCase());if(m){P.open=m.ref;P.q='';P.fRange='all';renderPos(true)}}
  else if(t.dataset&&t.dataset.pa==='open'){pa.open(t,e)}
 }
});

/* live behaviour: the website sees other people booking; the POS refreshes itself */
var tickN=0;
setInterval(function(){
 tickN++;
 var c=$('clock');if(c)c.textContent=fmtT(Date.now());
 var l=$('live');if(l){var s=Math.round((Date.now()-S.liveAt)/1000);l.textContent='Live · updated '+(s<3?'just now':s+'s ago')}
 if(MODE==='pos'){
  if(P.auto&&tickN%20===0){var r=Math.random(),ty=r<0.75?'individual':(r<0.9?'party':'group'),nb2=null,i;for(i=0;i<3&&!nb2;i++)nb2=simBooking({type:ty,duration:1,date:iso(addDays(todayD(),i))})}
  var ae=document.activeElement,typing=ae&&(ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.tagName==='SELECT');
  if(tickN%8===0&&!P.modal&&!typing)renderPos(true);
 }else if(tickN%5===0)renderProto();
},1000);

/* ---------- start ---------- */
seed();
$('site').hidden=false;$('pos').hidden=true;
render();renderProto();

})();
