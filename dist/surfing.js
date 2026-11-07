'use strict';
// Original canvas art and physics; control inspiration: Atari's California Games Lynx manual.
// https://atariage.com/manual_html_page.php?SoftwareID=2413
const SURF_RENTAL_COST=20,SURF_SHACK={x:1120,y:1762},SURF_HEAT_TIME=90000;
let surfSession=null,surfClock=0;
function nearSurfShack(){return !frisbeeGame&&!volleyball&&!boating&&!swimming&&!dragonFlight&&!wakeboardRide&&!beachTransfer&&!surfSession&&onMainlandBeach()&&Math.hypot(player.x-SURF_SHACK.x,player.y-SURF_SHACK.y)<72;}
function openSurfShack(){
if(!nearSurfShack()){toast('Visit the surf rental shack on Mainland Beach.');return;}
updateSurfUI();openMapPanel('surfShackPanel');
}
function rentSurfboard(){
if(!nearSurfShack()||state.surfRental)return;
if(state.crystals<SURF_RENTAL_COST){$('#surfRentalInfo').textContent='A surfboard rental costs 20 crystals. Solve more problems to earn the rest.';return;}
state.crystals-=SURF_RENTAL_COST;state.surfRental=true;surfClock=0;update();updateSurfUI();
toast('Surfboard rented! The swell is building. Paddle out from the shack, then press Space as a crest reaches you.');
}
function startSurfing(){
if(!nearSurfShack()||!state.surfRental)return;
stopFishing();closeMapPanel();keys.clear();
surfSession={phase:'paddling',safe:{x:player.x,y:player.y},remaining:SURF_HEAT_TIME,score:0,wipeouts:0,paused:false,x:.43,y:.48,angle:Math.PI-.12,speed:.4,vx:0,vy:0,paddleTime:0,turn:0,turnCooldown:0,bands:[],scroll:0,pumpDirection:0,pumpDistance:0,airRequest:0,airHeight:0,airV:0,airSpin:0,message:'Paddle out with arrows / WASD. Space catches a nearby crest.'};
player.x=SURF_SHACK.x;player.y=beachShoreY(player.x)-12;updateSurfUI();save();canvas.focus({preventScroll:true});
}
function surfWaveDistance(index,time=surfClock){return 335-((time*.026+index*108)%324);}
function surfWaveY(x,index,time=surfClock){return beachShoreY(x)-surfWaveDistance(index,time)+Math.sin(x*.018+time*.0014)*3;}
function catchSurfWave(){
const s=surfSession;if(!s||s.phase!=='paddling'||s.paused)return false;
const distance=beachShoreY(player.x)-player.y;
if(distance<65||distance>280||s.paddleTime<400){s.message='Paddle farther out: reach the rolling crests beyond the shore break.';updateSurfUI();return false;}
if(![0,1,2].some(i=>Math.abs(surfWaveY(player.x,i)-player.y)<30)){s.message='Wait for a crest to reach your board, then press Space.';updateSurfUI();return false;}
s.phase='riding';s.x=.43;s.y=.48;s.scroll=0;s.pumpDirection=0;s.pumpDistance=0;s.airRequest=0;s.angle=Math.PI-.12;s.speed=.4;s.turn=0;s.turnCooldown=0;s.airHeight=0;s.airSpin=0;s.message='Link up / down carves to build speed. Space at the crest while climbing launches an air!';keys.clear();updateSurfUI();return true;
}
function surfWipeout(reason){
const s=surfSession;if(!s||!['riding','airborne'].includes(s.phase))return;
s.phase='wipeout';s.wipeoutTime=0;s.wipeouts++;s.message=reason;keys.clear();updateSurfUI();
}
function finishSurfHeat(){
const s=surfSession;if(!s)return;
s.phase='results';s.score=Math.floor(s.score);state.surfBest=Math.max(state.surfBest||0,s.score);player.x=s.safe.x;player.y=s.safe.y;keys.clear();save();updateSurfUI();
}
function stopSurfing(returnBoard=false,persist=true){
if(surfSession){const safe=surfSession.safe;player.x=safe.x;player.y=safe.y;state.surfBest=Math.max(state.surfBest||0,Math.floor(surfSession.score));}
surfSession=null;keys.clear();if(returnBoard)state.surfRental=false;
updateSurfUI();if(persist){save();canvas.focus({preventScroll:true});}
}
function resetSurfing(){stopSurfing(false,false);}
function returnSurfboard(){if(!nearSurfShack())return;state.surfRental=false;updateSurfUI();save();toast('Surfboard returned. The surf settles back down.');}
function advanceSurfing(dt){
if(dt<=0||document.querySelector('dialog[open]')||surfSession?.paused)return;
if(state.surfRental)surfClock+=dt;
const s=surfSession;if(!s){$('#mapSurfShack').hidden=!nearSurfShack();return;}if(s.phase==='results')return;
let remaining=dt;
while(remaining>0&&surfSession&&s.phase!=='results'){
const ms=Math.min(16,remaining),seconds=ms/1000;remaining-=ms;
if(s.phase==='paddling'){
const dx=(keys.has('right')||keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('left')||keys.has('a')||keys.has('arrowleft')?1:0);
const dy=(keys.has('down')||keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('up')||keys.has('w')||keys.has('arrowup')?1:0);
const length=Math.hypot(dx,dy)||1,blend=1-Math.exp(-ms/130);
s.vx+=(dx/length*.105-s.vx)*blend;s.vy+=(dy/length*.105-s.vy)*blend;
const x=Math.max(SURF_SHACK.x-250,Math.min(SURF_SHACK.x+250,player.x+s.vx*ms));
const y=Math.max(beachShoreY(x)-300,Math.min(beachShoreY(x)-10,player.y+s.vy*ms));
if(sharkWater(x,y)){player.x=x;player.y=y;}
if(dx||dy)s.paddleTime+=ms;
continue;
}
s.remaining=Math.max(0,s.remaining-ms);if(s.remaining===0){finishSurfHeat();break;}
if(s.phase==='wipeout'){
s.wipeoutTime+=ms;
if(s.wipeoutTime>=1400){if(s.wipeouts>=3){finishSurfHeat();break;}s.phase='paddling';player.x=SURF_SHACK.x;player.y=beachShoreY(player.x)-105;s.vx=0;s.vy=0;s.paddleTime=500;s.message='Back on your board. Catch the next crest with Space.';}
continue;
}
const steer=(keys.has('right')||keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('left')||keys.has('a')||keys.has('arrowleft')?1:0);
const sharp=keys.has('carve'),rotation=steer*(s.phase==='airborne'?6.5:sharp?4:2.3)*seconds;
const vertical=(keys.has('down')||keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('up')||keys.has('w')||keys.has('arrowup')?1:0);
if(s.phase==='riding')s.angle+=rotation;
if(vertical){
const target=Math.PI-vertical*.72,delta=Math.atan2(Math.sin(target-s.angle),Math.cos(target-s.angle));
s.angle+=delta*(1-Math.exp(-seconds*5.5));
}
s.scroll=(s.scroll||0)+Math.max(.08,-Math.cos(s.angle)*s.speed)*seconds*170;
if(s.phase==='airborne'){
s.airSpin+=rotation;s.airTurns=Math.abs(s.airSpin);s.airHeight+=s.airV*seconds;s.airV-=2.6*seconds;
s.x=Math.max(.12,s.x+(.23-s.speed*.55)*seconds);
if(surfBarrelState(s).overrun){surfWipeout('The lip overran your air! Pump for more speed before taking off.');continue;}
if(s.airHeight<=0&&s.airV<0){
const down=Math.sin(s.angle),aligned=Math.cos(s.airSpin)>.6;
if(down<.12||down>.96||Math.cos(s.angle)>=0||!aligned){surfWipeout('Wipeout! Finish your spin and hold Down to land travelling left down the face.');continue;}
const spins=Math.floor((Math.abs(s.airSpin)+.15)/(Math.PI*2)),bonus=100+spins*400;
s.score+=bonus;s.phase='riding';s.y=.08;s.airHeight=0;s.speed=Math.min(.85,s.speed+.06);s.pumpDirection=0;s.pumpDistance=0;
s.message=spins?`${spins*360}° AERIAL · +${bonus}`:`CLEAN AIR · +${bonus}`;
}
continue;
}
const oldY=s.y,heading=Math.sin(s.angle);
s.y=Math.max(.012,s.y+heading*s.speed*1.25*seconds);
const moved=s.y-oldY,direction=Math.abs(moved)>.00001?Math.sign(moved):0;
// Rail engagement rewards actual travel across the face, not tapping alternating keys.
const pumping=vertical!==0&&direction===vertical&&Math.abs(moved)>0;
s.speed=Math.max(.12,Math.min(.85,s.speed+(heading*.10-.065+(pumping?.17:0)-Math.abs(steer)*.02)*seconds));
if(direction){
if(direction!==s.pumpDirection){
if(s.pumpDirection&&s.pumpDistance>=.12&&pumping){s.speed=Math.min(.85,s.speed+.075);s.score+=35;s.message='LINKED CARVE · SPEED BOOST +35';}
s.pumpDirection=direction;s.pumpDistance=0;
}
s.pumpDistance=(s.pumpDistance||0)+Math.abs(moved);
}
s.x=Math.max(.12,s.x+(.30-Math.max(0,-Math.cos(s.angle))*s.speed*.65)*seconds);
s.turn+=rotation;s.turnCooldown=Math.max(0,s.turnCooldown-ms);
if(Math.abs(s.turn)>=Math.PI&&s.speed>.25&&s.turnCooldown===0){const bonus=Math.round(75+s.speed*200);s.score+=bonus;s.turn=0;s.turnCooldown=800;s.message=`CUTBACK · +${bonus}`;}
const barrel=surfBarrelState(s),base=10+s.speed*22;
s.score+=seconds*base*(barrel.half?4:barrel.coverage>0?2:1);
if(barrel.half)s.message='HALF IN / HALF OUT · 4× LINE POINTS · keep carving!';
const band=Math.floor(Math.max(0,s.y)*4);if(!s.bands.includes(band)){s.bands.push(band);s.score+=25;}
if(barrel.overrun){surfWipeout('The breaking wave caught you! Link up / down carves to build speed.');continue;}
if(s.y>1.03){surfWipeout('Too low on the wave! Carve back up before reaching the trough.');continue;}
if((s.airRequest||0)>0){
if(s.y<=.075&&heading<-.2&&s.speed>=.48){
s.phase='airborne';s.y=.012;s.airHeight=.01;s.airV=1.4+s.speed*.65;s.airSpin=0;s.airTurns=0;s.airRequest=0;
s.message='AIR! Left / right spin. Finish the rotation and hold Down to land.';
}else s.airRequest=Math.max(0,s.airRequest-ms);
}
}
updateSurfUI();
}
function requestSurfAir(){
const s=surfSession;if(!s||s.paused||s.phase!=='riding')return;
s.airRequest=250;
s.message=s.speed<.48?'Pump linked turns for more speed before an air.':'Press Space at the crest while carving up to launch an air.';
}
function handleSurfKey(k,e){
if(k==='x'){e.preventDefault();if(!e.repeat)stopSurfing();return;}
if(k==='p'||k==='escape'){e.preventDefault();if(!e.repeat){surfSession.paused=!surfSession.paused;keys.clear();updateSurfUI();}return;}
if(surfSession.paused)return;
if(k==='enter'&&surfSession.phase==='results'){e.preventDefault();if(!e.repeat){stopSurfing();startSurfing();}return;}
if(k===' '||k==='enter'){e.preventDefault();if(surfSession.phase==='paddling'){if(!e.repeat)catchSurfWave();}else if(!e.repeat){keys.add(' ');requestSurfAir();}return;}
if(['arrowleft','arrowright','arrowup','arrowdown','a','d','w','s'].includes(k)){e.preventDefault();keys.add(k);}
}
function updateSurfUI(){
const s=surfSession,phase=s?.phase||'map';$('.map-stage').setAttribute('data-surf-view',s?(phase==='paddling'?'paddling':'riding'):'map');
$('#surfOverlay').hidden=!s;$('#surfRentalInfo').textContent=state.surfRental?'Your board is rented until you return it. Paddle out, catch a crest, and take on a 90-second heat. Three wipeouts end the heat.':`Rent a board for ${SURF_RENTAL_COST} crystals. The local swell builds as soon as you rent. Your rental lasts until you return the board.`;
$('#rentSurfboard').disabled=state.surfRental||state.crystals<SURF_RENTAL_COST||!nearSurfShack();$('#rentSurfboard').textContent=state.surfRental?'✓ Surfboard rented':'Rent surfboard · 20 ◆';
$('#paddleSurfboard').disabled=!state.surfRental||!nearSurfShack();$('#returnSurfboard').hidden=!state.surfRental;$('#surfBest').textContent=`Best heat: ${state.surfBest||0} points`;
$('#mapSurfShack').hidden=!nearSurfShack();
if(!s)return;
$('#surfScore').textContent=`${Math.floor(s.score)} pts`;$('#surfSpeed').textContent=`SPEED ${Math.round(s.speed/.85*100)}%`;$('#surfLine').textContent=phase==='riding'&&surfBarrelState(s).half?'HALF IN · 4×':'LINK UP / DOWN CARVES';$('#surfTime').textContent=`${Math.ceil(s.remaining/1000)}s`;$('#surfLives').textContent=`${Math.max(0,3-s.wipeouts)} wipeouts left`;
$('#surfMessage').textContent=s.paused?'Paused — press P or Resume to continue.':s.message;
$('#surfPhase').textContent=s.paused?'PAUSED':phase==='paddling'?'PADDLE OUT':phase==='airborne'?'CATCHING AIR':phase==='results'?'HEAT COMPLETE':phase==='wipeout'?'WIPEOUT':'RIDE THE WAVE';
$('#surfAction').textContent=phase==='paddling'?'Catch wave · Space':'Air at crest · Space';$('#surfAction').disabled=['results','wipeout'].includes(phase)||s.paused;
$('#surfRetry').hidden=phase!=='results';$('#surfPause').textContent=s.paused?'Resume · P':'Pause · P';$('#surfUp').hidden=['wipeout','results'].includes(phase);$('#surfDown').hidden=['wipeout','results'].includes(phase);$('#surfUp').setAttribute('aria-label',phase==='paddling'?'Paddle up':'Climb the wave · Up / W');$('#surfDown').setAttribute('aria-label',phase==='paddling'?'Paddle down':'Descend the wave · Down / S');
}
function initSurfing(){
window.addEventListener('keydown',e=>{if(!surfSession||document.querySelector('dialog[open]')||['INPUT','SELECT','TEXTAREA'].includes(e.target?.tagName))return;e.stopImmediatePropagation();handleSurfKey(e.key.toLowerCase(),e);},{capture:true});
$('#rentSurfboard').onclick=rentSurfboard;$('#paddleSurfboard').onclick=startSurfing;$('#returnSurfboard').onclick=returnSurfboard;$('#mapSurfShack').onclick=openSurfShack;
$('#surfQuit').onclick=()=>stopSurfing();$('#surfRetry').onclick=()=>{stopSurfing();startSurfing();};$('#surfPause').onclick=()=>{if(surfSession){surfSession.paused=!surfSession.paused;keys.clear();updateSurfUI();canvas.focus({preventScroll:true});}};
for(const [id,key] of [['surfLeft','left'],['surfRight','right'],['surfUp','up'],['surfDown','down'],['surfAction',' ']]){
const b=$('#'+id);b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture?.(e.pointerId);if(!surfSession||surfSession.paused)return;if(key===' '&&surfSession.phase==='paddling')catchSurfWave();else{keys.add(key);if(key===' ')requestSurfAir();}};b.onpointerup=b.onpointercancel=()=>keys.delete(key);
}
updateSurfUI();
}
function drawSurfShack(){
if(!islandInView(mainlandBeach)||SURF_SHACK.x<camera.x-90||SURF_SHACK.x>camera.x+WORLD.viewWidth+90)return;
const {x,y}=SURF_SHACK;
rect(x-31,y-28,62,31,'#c7a575');rect(x-28,y-26,56,26,'#e2c797');
for(let i=0;i<7;i++)rect(x-27+i*8,y-25,1,24,'#bb9667');
polygon([[x-37,y-29],[x-28,y-44],[x+29,y-44],[x+37,y-29]],'#668f91');
for(let i=0;i<8;i++)rect(x-32+i*8,y-29,7,5,i%2?'#f5e5bc':'#d49279');
rect(x-16,y-22,32,16,'#486b68');rect(x-20,y-7,40,4,'#a77b52');
ellipse(x,y-15,3,3,'#dbac7e');rect(x-4,y-11,8,4,'#b9bb7d');
ctx.font='bold 6px monospace';ctx.textAlign='center';ctx.fillStyle='#fff0c5';ctx.fillText('SURF RENTALS',x,y-35);
ctx.font='6px monospace';ctx.fillStyle='#48615a';ctx.fillText(state.surfRental?'YOUR BOARD IS READY':'20 ◆ · RENT A BOARD',x,y+10);
for(let i=0;i<3;i++){ctx.save();ctx.translate(x+39+i*7,y-11);ctx.rotate(.12+i*.05);ellipse(0,0,3,15,['#df9b78','#8cb3b9','#e9ce8c'][i]);rect(-.5,-11,1,22,'#f7ebc7');ctx.restore();}
if(nearSurfShack()){ctx.fillStyle='#fff3d1';ctx.font='bold 7px monospace';ctx.fillText('E · SURF SHACK',x,y-53);}
}
// Quantized contours keep the water in the same pixel scale as the island art.
function surfContour(points,color){
ctx.fillStyle=color;ctx.beginPath();
points.forEach(([x,y],i)=>{
const previous=points[(i+points.length-1)%points.length];
if(!i)ctx.moveTo(Math.round(previous[0]/2)*2,Math.round(previous[1]/2)*2);
const steps=Math.max(1,Math.ceil(Math.hypot(x-previous[0],y-previous[1])/2));
for(let j=1;j<=steps;j++){const f=j/steps;ctx.lineTo(Math.round((previous[0]+(x-previous[0])*f)/2)*2,Math.round((previous[1]+(y-previous[1])*f)/2)*2);}
});
ctx.closePath();ctx.fill();
}
function surfFoamNoise(i){const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n);}
function beachWaveProfile(x,index,time,rental=false){
const y=surfWaveY(x,index,time);
// The breaking section peels right to left along each coastal swell.
const front=820+((-time*.055+index*197)%600+600)%600;
const delta=x-front,breaking=Math.exp(-Math.pow(delta/43,2));
return {y,front,breaking,height:(rental?9:6)+breaking*(rental?18:12),foam:Math.max(0,1-Math.abs(delta-48)/100)};
}
function clipBeachWaveWater(){
// The even-odd holes exclude every island, including inaccessible islands and mainland.
ctx.beginPath();ctx.rect(WORLD.left,0,WORLD.width,WORLD.height);
for(const poly of islandPolys){
ctx.moveTo(poly[0][0],poly[0][1]);
for(let i=1;i<poly.length;i++)ctx.lineTo(poly[i][0],poly[i][1]);
ctx.closePath();
}
ctx.clip('evenodd');
}
function drawCoastalCrumble(time){
for(let island=0;island<islandPolys.length;island++){
const poly=islandPolys[island];
if(!islandInView(allIslands[island]))continue;
for(let edge=0;edge<poly.length;edge++){
const a=poly[edge],b=poly[(edge+1)%poly.length],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
if(!length)continue;
let nx=dy/length,ny=-dx/length;
const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;
if(inside(mx+nx*2,my+ny*2,poly)){nx=-nx;ny=-ny;}
for(let along=0;along<length;along+=4){
const x=a[0]+dx*along/length,y=a[1]+dy*along/length;
if(x<camera.x-14||x>camera.x+WORLD.viewWidth+14||y<camera.y-14||y>camera.y+WORLD.viewHeight+14)continue;
const grain=surfFoamNoise(edge*71+along+island*397);
// Match the right-to-left travel of the approaching lip.
const pulse=(Math.sin(x*.035+y*.018+time*.0018)+1)/2;
const wash=pulse*pulse,spread=3+wash*6;
ctx.globalAlpha=.22+wash*.58;
rect(x+nx*spread-2,y+ny*spread-1,4,2,'#dff7e9');
if(grain<wash*.8){
ctx.globalAlpha=(1-wash*.5)*.55;
rect(x+nx*(spread+3+grain*4),y+ny*(spread+3+grain*4),2,1,'#bce7dc');
}
}
}
}
}
function drawBeachWaveLip(x,y,height,collapse,time,seed){
if(height<5||collapse>.8)return;
const h=height,points=coords=>{
const curve=[];
for(let i=0;i<coords.length;i++){
const a=coords[(i+coords.length-1)%coords.length],b=coords[i],c=coords[(i+1)%coords.length],d=coords[(i+2)%coords.length];
for(let step=0;step<5;step++){
const t=step/5,t2=t*t,t3=t2*t;
const value=k=>.5*((2*b[k])+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t2+(-a[k]+3*b[k]-3*c[k]+d[k])*t3);
curve.push([x+value(0)*.62,y+value(1)*h]);
}
}
return curve;
};
// A tapered hollow sits beneath a thin sheet pitching left, rather than a vertical wall.
surfContour(points([[-31,-.48],[-20,-.84],[0,-.93],[23,-.66],[31,-.19],[18,.08],[-8,.13],[-24,-.09]]),'#2c8293');
surfContour(points([[-23,-.46],[-12,-.65],[3,-.66],[17,-.43],[19,-.12],[6,.04],[-13,-.03]]),'#4da8ad');
surfContour(points([[42,-.59],[23,-.9],[3,-1.05],[-16,-.98],[-30,-.73],[-37,-.36],[-33,.02],[-21,.24],[-8,.21],[-17,.04],[-23,-.15],[-23,-.41],[-15,-.64],[0,-.77],[19,-.69],[40,-.44]]),'#b5e8dc');
surfContour(points([[32,-.84],[13,-1.02],[-7,-1.04],[-23,-.9],[-33,-.62],[-37,-.29],[-31,.04],[-22,.15],[-23,-.09],[-28,-.34],[-23,-.63],[-10,-.83],[9,-.88],[29,-.73]]),'#ecfcf0');
// Small drifting droplets and separated foam patches prevent a solid, blocky edge.
for(let i=0;i<12;i++){
const grain=surfFoamNoise(i+seed*53),age=(time*.00065+grain)%1;
const dx=-24-age*(10+grain*18),dy=-h*.7-Math.sin(age*Math.PI)*(4+grain*7)+age*age*9;
ctx.globalAlpha=(1-age)*.65;
rect(x+dx,y+dy,grain>.7?2:1,1,'#eafff1');
}
}
function drawBeachWaves(){
const rental=state.surfRental,time=rental?surfClock:frame*16.667;
ctx.save();clipBeachWaveWater();
if(camera.y+WORLD.viewHeight>=1320){
const start=Math.max(WORLD.left,Math.floor(camera.x/3)*3),end=Math.min(WORLD.right,camera.x+WORLD.viewWidth+3);
for(let i=0;i<3;i++){
const distance=surfWaveDistance(i,time),fade=Math.min(1,(335-distance)/30);
const shallows=Math.max(0,1-distance/110),collapse=Math.max(0,1-distance/45);
const shoreDistance=distance<60?Math.max(0,(distance-11)*60/49):distance;
const waveY=x=>beachShoreY(x)-shoreDistance+Math.sin(x*.018+time*.0014)*3*(1-collapse);
for(let x=start;x<=end;x+=3){
const local=820+((x-820)%600+600)%600,w=beachWaveProfile(local,i,time,rental);
const y=waveY(x),grain=surfFoamNoise(x+i*313),peel=w.breaking;
const h=(3+peel*15)*(.8+shallows*.2)*(1-collapse*.92);
// The face has a soft water-colored back and a narrow, irregular crest.
ctx.globalAlpha=fade*(.22+peel*.24+shallows*.12)*(1-collapse*.4);
rect(x,y-h,3,h+5,'#4caaaf');
rect(x,y-h+2,3,Math.max(1,h*.3),'#75c9c5');
ctx.globalAlpha=fade*(.3+peel*.4)*(1-collapse*.4);
rect(x,y-h,3,1+peel,'#c3ece0');
// Broken water widens behind (right of) the lip and spreads across the shallows.
const whitewater=w.foam*(.25+shallows*.4);
if(whitewater>.1){
const drift=(time*.00035+grain)%1;
ctx.globalAlpha=fade*whitewater*(1-drift*.6);
rect(x-drift*11,y+3+grain*9,2+grain*4,1+grain*2,'#d8f3e7');
if(grain>.6)rect(x-drift*9,y+7+grain*13,3,1,'#b2e0d5');
}
const crumble=shallows*(.35+peel*.65);
if(crumble>.12){
ctx.globalAlpha=fade*crumble*(1-collapse*.4);
if(grain>.2)rect(x,y-h+grain*3,3,1,'#e9faed');
if(grain>.45)rect(x-2,y+grain*(3+collapse*10),3,2,'#d5f2e6');
}
}
// Repeat a small rounded curl along the coast; each stays inside the water mask.
const front=beachWaveProfile(1100,i,time,rental).front;
for(let section=Math.floor((start-front)/600);section<=Math.ceil((end-front)/600);section++){
const x=front+section*600;if(x<start-65||x>end+65)continue;
ctx.globalAlpha=fade*(.7+shallows*.2)*(1-collapse*.65);
const height=25*(.8+shallows*.2)*(1-collapse*.92);
drawBeachWaveLip(x,waveY(x),height,collapse,time,i+section*3);
}
}
}
drawCoastalCrumble(time);
ctx.restore();
}
function drawSurfOcean(){
if(!state.surfRental||camera.y+WORLD.viewHeight<1330||camera.x>1420||camera.x+WORLD.viewWidth<820)return;
for(const x of [850,1390]){const y=beachShoreY(x)-200;ellipse(x,y+2,5,2,'#dff4e688');rect(x-2,y-5,4,7,'#dc9b69');rect(x-1,y-8,2,4,'#f5e3b4');}
}
function surfRideCrest(x){return 94+Math.sin((x-(surfSession?.scroll||0)*.35)*.019)*3;}
function surfRideView(s=surfSession){
const riderX=224+Math.max(-10,Math.min(10,(.43-s.x)*28));
return {riderX,breakX:riderX+(.86-s.x)*440,scroll:s.scroll||0};
}
function surfBreakEdge(y,wave){return wave.breakX+21-(y-94)*.22+Math.sin(y*.13+surfClock*.005)*3;}
function surfBarrelState(s=surfSession){
const wave=surfRideView(s),y=surfRideCrest(wave.riderX)+Math.max(0,Math.min(1,s.y))*(279-surfRideCrest(wave.riderX));
const edge=surfBreakEdge(y,wave),mouth=edge-32;
const coverage=s.y>.12&&s.y<.85?Math.max(0,Math.min(1,(wave.riderX+15-mouth)/30)):0;
return {coverage,half:coverage>=.25&&coverage<=.75,overrun:wave.riderX+3>=edge,edge,mouth};
}
function drawSurfWaveFace(){
const s=surfSession,wave=surfRideView(s),scroll=wave.scroll;
// Look straight at the broad face. The chasing whitewater occupies the right edge.
const crest=[];for(let x=0;x<=480;x+=4)crest.push([x,surfRideCrest(x)]);
surfContour([...crest,[480,284],[0,284]],'#319ca8');
for(let band=0;band<14;band++){
const top=[],bottom=[];
for(let x=0;x<=480;x+=4){const y=surfRideCrest(x)+8+band*13+Math.sin((x-scroll)*.025+band)*2;top.push([x,y]);bottom.unshift([x,y+7]);}
surfContour([...top,...bottom],['#39a7ae','#43b2b5','#48b7b8','#3cabb2'][Math.floor(band/4)]);
}
// Every glint moves left to right as the surfer travels left through the scene.
for(let i=0;i<110;i++){
const grain=surfFoamNoise(i+17),x=((i*67+scroll)%540+540)%540-30,y=107+grain*164;
rect(x,y,4+grain*14,1,i%4?'#77cbc5':'#a6e1d3');
}
const foam=[],inner=[];
for(let y=88;y<=286;y+=4){const x=surfBreakEdge(y,wave);foam.push([x,y]);inner.push([x+15+Math.sin(y*.21+surfClock*.003)*4,y]);}
// The barrel is a narrow shaded pocket beneath the curtain, still seen face on.
const mouth=foam.map(([x,y])=>[x-32,y]);
surfContour([...mouth,...foam.slice().reverse()],'#287e90');
surfContour([...foam,[500,286],[500,88]],'#89d0c9');
surfContour([...inner,[500,286],[500,88]],'#c2eadd');
for(let i=0;i<140;i++){
const grain=surfFoamNoise(i+200),y=99+surfFoamNoise(i+400)*182;
const edge=surfBreakEdge(y,wave),x=((i*71+scroll*1.25)%550+550)%550-20;
if(x<edge+10)continue;
rect(x,y,3+grain*13,1+grain*3,i%3?'#e4f8e9':'#81c9c3');
}
return wave;
}
function drawSurfWaveLip(wave){
// A translucent hanging sheet can cover half the surfer at the barrel entrance.
const sheet=[],back=[];
for(let y=118;y<254;y+=4){const edge=surfBreakEdge(y,wave);sheet.push([edge-32,y]);back.unshift([edge-19,y]);}
ctx.save();ctx.globalAlpha=.38;surfContour([...sheet,...back],'#a6e4d6');ctx.restore();
// A spilling crest and an irregular curtain of whitewater, seen face on.
for(let x=0;x<Math.min(480,wave.breakX+26);x+=3){
const y=surfRideCrest(x),grain=surfFoamNoise(Math.floor((x-wave.scroll)/3));
rect(x,y-1,3,2,'#c9eee0');
if(grain>.5)rect(x,y+2,3,1,'#91d7cf');
}
for(let y=92;y<282;y+=3){
const edge=surfBreakEdge(y,wave),grain=surfFoamNoise(Math.floor(y/3)+900),phase=(surfClock*.0012+grain)%1;
rect(edge-2,y,5+grain*7,3,'#effcf0');
if(grain>.45)rect(edge-7-phase*9,y+phase*6,2,2,'#dcf5e7');
rect(edge+7,y+1,4+grain*9,2,'#a9e0d4');
}
for(let i=0;i<30;i++){
const grain=surfFoamNoise(i+800),age=(surfClock*.0006+grain)%1,x=wave.breakX-35+grain*100+wave.scroll*.15%24,y=273+grain*17;
rect(x-age*14,y,4+grain*10,2,i%3?'#e1f6e6':'#a4dcd0');
}
}
function drawSurfRider(x,y,rotation,paddling=false){
const colors=characterColors(),s=surfSession;
ctx.save();ctx.translate(x,y);ctx.rotate(rotation);if(!paddling)ctx.scale(-1,1);
ellipse(1,3,paddling?20:15,paddling?5:3,'#3c7e8055');ellipse(0,0,paddling?20:15,paddling?4:2.5,'#e6b987');rect(-12,-.6,24,1.2,'#f6e6b7');
if(paddling){
ellipse(-1,-1,7,3,colors.shirt);ellipse(8,-1,3.5,3,'#f2c992');rect(6,-4,4,2,colors.hair);
for(const side of [-1,1]){const stroke=Math.sin(surfClock*.012+side*1.7);ctx.strokeStyle='#f2c992';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(2,side*2);ctx.lineTo(5+stroke*4,side*8);ctx.stroke();}
}else{
const crouch=s?.phase==='airborne'?3:1+Math.sin(surfClock*.01)*.5;
ctx.strokeStyle='#3e5555';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-5,-2);ctx.lineTo(-2,-6);ctx.lineTo(-3,-11+crouch);ctx.moveTo(5,-2);ctx.lineTo(7,-6);ctx.lineTo(2,-11+crouch);ctx.stroke();
rect(-4,-19+crouch,8,9,colors.shirt);rect(-3,-25+crouch,7,7,'#f2c992');rect(-4,-26+crouch,8,3,colors.hair);
if(currentProfile().character==='girl')rect(-5,-23+crouch,3,8,colors.hair);
ctx.strokeStyle='#f2c992';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-3,-16+crouch);ctx.lineTo(-11,-13+crouch);ctx.moveTo(3,-16+crouch);ctx.lineTo(11,-18+crouch);ctx.stroke();rect(2,-22+crouch,1,1,'#354744');
}
ctx.restore();
}
function drawSurfingWorld(){
if(surfSession?.phase!=='paddling')return;
const s=surfSession,heading=Math.hypot(s.vx,s.vy)>.005?Math.atan2(s.vy,s.vx):-Math.PI/2;
drawSurfRider(player.x,player.y,heading,true);
}
function drawSurfGame(){
const s=surfSession;if(!s)return;
rect(0,0,WORLD.viewWidth,WORLD.viewHeight,'#77b8bf');
const scale=Math.min(WORLD.viewWidth/480,WORLD.viewHeight/300);
ctx.save();ctx.translate((WORLD.viewWidth-480*scale)/2,(WORLD.viewHeight-300*scale)/2);ctx.scale(scale,scale);
ctx.beginPath();ctx.rect(0,0,480,300);ctx.clip();
rect(0,0,480,66,'#c5ddd0');ellipse(68,28,13,13,'#f0d995');
polygon([[0,61],[80,55],[147,60],[192,52],[270,62],[340,54],[480,61],[480,75],[0,75]],'#86ada3');
rect(0,70,480,230,'#70b6be');
for(let i=0;i<15;i++){const x=((i*47+(s.scroll||0)*.25)%520+520)%520;rect(x,77+i%3*5,12,1,'#add6cf');}
// The camera follows the surfer; the ocean flows right and the break chases from the right.
const wave=drawSurfWaveFace();
const x=wave.riderX,crest=surfRideCrest(x),face=279-crest,y=crest+s.y*face-s.airHeight*85;
if(s.phase==='wipeout'){
const t=Math.min(1,s.wipeoutTime/1400);ctx.save();ctx.translate(x,y+Math.sin(t*Math.PI)*8);ctx.rotate(t*Math.PI*3);drawSurfRider(0,0,0);ctx.restore();
ctx.strokeStyle='#eef9df';ctx.lineWidth=2;for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(x,y+10,5+t*29+i*5,2+t*8+i*2,0,0,Math.PI*2);ctx.stroke();}
}else if(s.phase!=='results'){
const tilt=s.phase==='airborne'?s.airSpin:-Math.sin(s.angle)*.45;
drawSurfRider(x,y,tilt);
ctx.strokeStyle='#e7f6d9bb';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x+10,y+4);ctx.lineTo(x+26,y+9);ctx.moveTo(x+11,y+3);ctx.lineTo(x+30,y+5);ctx.stroke();
}
drawSurfWaveLip(wave);
for(let i=0;i<35;i++){const x=((i*41+(s.scroll||0)*1.15)%510+510)%510-15;rect(x,282+i%5*4,8+i%4*3,2,i%3?'#b9e6db':'#e0f5e5');}
ctx.font='7px monospace';ctx.textAlign='left';ctx.fillStyle='#dff0ce';ctx.fillText('UP / DOWN · PUMP FOR SPEED',14,117);ctx.textAlign='right';ctx.fillText('BREAKING WAVE',466,81);
if(s.phase==='results'){rect(94,105,292,89,'#1d5350e8');ctx.fillStyle='#fff0c7';ctx.textAlign='center';ctx.font='bold 16px monospace';ctx.fillText('HEAT COMPLETE',240,130);ctx.font='12px monospace';ctx.fillText(`${Math.floor(s.score)} POINTS`,240,153);ctx.font='8px monospace';ctx.fillText(`BEST ${state.surfBest||0} · RENTAL STILL ACTIVE`,240,175);}
ctx.restore();
}
