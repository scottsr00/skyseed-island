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
surfSession={phase:'paddling',safe:{x:player.x,y:player.y},remaining:SURF_HEAT_TIME,score:0,wipeouts:0,paused:false,x:.43,y:.48,angle:Math.PI-.12,speed:.4,vx:0,vy:0,paddleTime:0,turn:0,turnCooldown:0,bands:[],waveSize:1,scroll:0,pumpDirection:0,pumpDistance:0,airRequest:0,wake:[],wakeClock:0,carveLean:0,carveStrength:0,landingSpray:0,airHeight:0,airV:0,airSpin:0,message:'Paddle out with arrows / WASD. Space catches a nearby crest.'};
player.x=SURF_SHACK.x;player.y=beachShoreY(player.x)-12;updateSurfUI();save();canvas.focus({preventScroll:true});
}
function surfWaveSize(distance){return .32+.68*Math.max(0,Math.min(1,distance/280));}
function surfRideScale(s=surfSession){return s?.waveSize??1;}
function surfWaveDistance(index,time=surfClock){return 335-((time*.026+index*108)%324);}
function surfWaveY(x,index,time=surfClock){return beachShoreY(x)-surfWaveDistance(index,time)+Math.sin(x*.018+time*.0014)*3;}
function catchSurfWave(){
const s=surfSession;if(!s||s.phase!=='paddling'||s.paused)return false;
const distance=beachShoreY(player.x)-player.y;
if(distance<65||distance>280||s.paddleTime<400){s.message='Paddle farther out: reach the rolling crests beyond the shore break.';updateSurfUI();return false;}
if(![0,1,2].some(i=>Math.abs(surfWaveY(player.x,i)-player.y)<30)){s.message='Wait for a crest to reach your board, then press Space.';updateSurfUI();return false;}
s.wake=[];s.wakeClock=0;s.carveLean=0;s.carveStrength=0;s.landingSpray=0;s.phase='riding';s.waveSize=surfWaveSize(distance);s.x=.43;s.y=.48;s.scroll=0;s.pumpDirection=0;s.pumpDistance=0;s.airRequest=0;s.angle=Math.PI-.12;s.speed=.4;s.turn=0;s.turnCooldown=0;s.airHeight=0;s.airSpin=0;s.message='Link up / down carves to build speed. Space at the crest while climbing launches an air!';keys.clear();updateSurfUI();return true;
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
const effort=dx||dy?1:0;
s.paddleEffort=(s.paddleEffort||0)+(effort-(s.paddleEffort||0))*(1-Math.exp(-ms/160));
s.paddlePhase=(s.paddlePhase||0)+seconds*Math.PI*2*(.18+.92*s.paddleEffort);
if(Math.hypot(s.vx,s.vy)>.005)s.paddleHeading=Math.atan2(s.vy,s.vx);
if(dx||dy)s.paddleTime+=ms;
continue;
}
advanceSurfWake(s,ms);
s.remaining=Math.max(0,s.remaining-ms);if(s.remaining===0){finishSurfHeat();break;}
if(s.phase==='wipeout'){
s.wipeoutTime+=ms;
if(s.wipeoutTime>=1400){if(s.wipeouts>=3){finishSurfHeat();break;}s.phase='paddling';player.x=SURF_SHACK.x;player.y=beachShoreY(player.x)-105;s.vx=0;s.vy=0;s.paddleTime=500;s.message='Back on your board. Catch the next crest with Space.';}
continue;
}
const previousAngle=s.angle;
const steer=(keys.has('right')||keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('left')||keys.has('a')||keys.has('arrowleft')?1:0);
const sharp=keys.has('carve'),rotation=steer*(s.phase==='airborne'?6.5:sharp?4:2.3)*seconds;
const vertical=(keys.has('down')||keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('up')||keys.has('w')||keys.has('arrowup')?1:0);
if(s.phase==='riding')s.angle+=rotation;
if(vertical&&s.phase==='riding'){
const target=Math.PI-vertical*.72,delta=Math.atan2(Math.sin(target-s.angle),Math.cos(target-s.angle));
s.angle+=delta*(1-Math.exp(-seconds*5.5));
}
s.scroll=(s.scroll||0)+Math.max(.08,-Math.cos(s.angle)*s.speed)*seconds*170;
if(s.phase==='airborne'){
s.airSpin+=rotation;
if(vertical&&!steer){
const target=Math.PI-vertical*.72,heading=Math.PI+s.airSpin;
const delta=Math.atan2(Math.sin(target-heading),Math.cos(target-heading));
s.airSpin+=delta*(1-Math.exp(-seconds*5.5));
}
s.airTurns=Math.max(s.airTurns||0,Math.abs(s.airSpin));s.airHeight+=s.airV*seconds;s.airV-=2.6*seconds;
s.x=Math.max(.12,s.x+(.23-s.speed*.55)*seconds);
if(surfBarrelState(s).overrun){surfWipeout('The lip overran your air! Pump for more speed before taking off.');continue;}
if(s.airHeight<=0&&s.airV<0){
// Judge the nose direction actually drawn on screen, not the hidden riding angle.
const landing=surfAirHeading(s);
if(landing<Math.PI/2-1e-7||landing>=Math.PI-1e-7){surfWipeout('Wipeout! Land with the board pointing between 6 and 9 o’clock, not horizontal.');continue;}
const spins=Math.floor(((s.airTurns||0)+.05)/(Math.PI*2)),bonus=100+spins*400;
s.score+=bonus;s.phase='riding';s.landingSpray=400;s.y=.08;s.airHeight=0;s.angle=landing;s.speed=Math.min(.85,s.speed+.12+Math.sin(landing)*.04);s.pumpDirection=0;s.pumpDistance=0;
s.message=spins?`${spins*360}° AERIAL · +${bonus} · SPEED BOOST`:`CLEAN AIR · +${bonus} · SPEED BOOST`;
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
advanceSurfRidingArt(s,ms,previousAngle);
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
s.message='AIR! Left / right spin. Land pointing down to lower-left (6–9 o’clock).';
}else s.airRequest=Math.max(0,s.airRequest-ms);
}
}
updateSurfUI();
}
function surfAirHeading(s=surfSession){
const heading=Math.PI+s.airSpin;
return ((heading%(Math.PI*2))+Math.PI*2)%(Math.PI*2);
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
$('#surfScore').textContent=`${Math.floor(s.score)} pts`;$('#surfSpeed').textContent=`SPEED ${Math.round(s.speed/.85*100)}%`;$('#surfLine').textContent=phase==='paddling'?`WAVE ${Math.round(surfWaveSize(beachShoreY(player.x)-player.y)*100)}% · PADDLE OUT FOR BIGGER`:surfBarrelState(s).half?'HALF IN · 4×':`WAVE ${Math.round(surfRideScale(s)*100)}% · LINK YOUR CARVES`;$('#surfTime').textContent=`${Math.ceil(s.remaining/1000)}s`;$('#surfLives').textContent=`${Math.max(0,3-s.wipeouts)} wipeouts left`;
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
return {y,front,breaking,height:((rental?9:6)+breaking*(rental?18:12))*surfWaveSize(surfWaveDistance(index,time)),foam:Math.max(0,1-Math.abs(delta-48)/100)};
}
function beachWaveSurfaceY(x,index,time){
const distance=surfWaveDistance(index,time),collapse=Math.max(0,1-distance/45);
const shoreDistance=distance<60?Math.max(0,(distance-11)*60/49):distance;
return beachShoreY(x)-shoreDistance+Math.sin(x*.018+time*.0014)*3*(1-collapse);
}
function beachWaveSubmersion(x,y,time=state.surfRental?surfClock:frame*16.667){
if(y<beachShoreY(x)-370||y>beachShoreY(x)-15)return null;
for(let i=0;i<3;i++){
const distance=surfWaveDistance(i,time);
if(distance<25||distance>325)continue;
const delta=beachWaveSurfaceY(x,i,time)-y,reach=18+12*surfWaveSize(distance);
if(delta<=-reach||delta>=reach+12)continue;
// Sweep from nose (+X) to tail (-X) on both entry and resurfacing.
if(delta<-5)return {stage:'entering',edge:24-48*(delta+reach)/(reach-5)};
if(delta<=8)return {stage:'under',edge:-24};
return {stage:'emerging',edge:24-48*(delta-8)/(reach+4)};
}
return null;
}
function clipBeachWaveOccupant(x,y){
const dive=beachWaveSubmersion(x,y);if(!dive)return;
ctx.beginPath();
if(dive.stage==='entering')ctx.rect(-48,-40,dive.edge+48,80);
else if(dive.stage==='emerging')ctx.rect(dive.edge,-40,48-dive.edge,80);
else ctx.rect(0,0,0,0);
ctx.clip();
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
// The rotated profile spans about 50 pixels; scale both axes to the local peak.
const h=20,scale=height/50,points=coords=>{
const curve=[];
for(let i=0;i<coords.length;i++){
const a=coords[(i+coords.length-1)%coords.length],b=coords[i],c=coords[(i+1)%coords.length],d=coords[(i+2)%coords.length];
for(let step=0;step<5;step++){
const t=step/5,t2=t*t,t3=t2*t;
const value=k=>.5*((2*b[k])+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t2+(-a[k]+3*b[k]-3*c[k]+d[k])*t3);
// Turn the original curl through 270 degrees, with its spray following the lip.
curve.push([x-value(1)*h*scale,y+value(0)*.62*scale]);
}
}
return curve;
};
// Keep the rounded hollow, trimming its bottom at 15 degrees near the wave's base.
const shadowSlope=Math.tan(Math.PI/12);
ctx.save();ctx.beginPath();
[[-30,-40],[35,-40],[35,5/scale+35*shadowSlope],[-30,5/scale-30*shadowSlope]].forEach(([dx,dy],i)=>{
if(i)ctx.lineTo(x+dx*scale,y+dy*scale);else ctx.moveTo(x+dx*scale,y+dy*scale);
});
ctx.closePath();ctx.clip();
surfContour(points([[-31,-.48],[-20,-.84],[0,-.93],[23,-.66],[31,-.19],[18,.08],[-8,.13],[-24,-.09]]),'#2c8293');
surfContour(points([[-23,-.46],[-12,-.65],[3,-.66],[17,-.43],[19,-.12],[6,.04],[-13,-.03]]),'#4da8ad');
ctx.restore();
surfContour(points([[42,-.59],[23,-.9],[3,-1.05],[-16,-.98],[-30,-.73],[-37,-.36],[-33,.02],[-21,.24],[-8,.21],[-17,.04],[-23,-.15],[-23,-.41],[-15,-.64],[0,-.77],[19,-.69],[40,-.44]]),'#b5e8dc');
surfContour(points([[32,-.84],[13,-1.02],[-7,-1.04],[-23,-.9],[-33,-.62],[-37,-.29],[-31,.04],[-22,.15],[-23,-.09],[-28,-.34],[-23,-.63],[-10,-.83],[9,-.88],[29,-.73]]),'#ecfcf0');
const trailStart=x+25*scale,trailEnd=Math.min(x+600,WORLD.right),trailLength=Math.max(1,trailEnd-trailStart);
// Foam ribbons span the trailing wave, narrowing and fading toward its far end.
ctx.save();
const streakAlpha=ctx.globalAlpha;
for(let i=0;i<Math.ceil(trailLength/8);i++){
const grain=surfFoamNoise(seed*97+i+2100),age=(time*.0004+grain)%1;
const anchor=trailStart+i*8,shoreOffset=beachShoreY(anchor)-beachShoreY(x);
if(anchor<camera.x-16||anchor>camera.x+WORLD.viewWidth+16)continue;
const taper=Math.pow(1-i*8/trailLength,.7);
const from=age*.7,to=Math.min(1,from+.22+grain*.12),left=[],right=[];
for(let j=0;j<=12;j++){
const progress=from+(to-from)*j/12;
const px=anchor-Math.sin(progress*Math.PI)*4*scale;
const py=y+shoreOffset+(-13+progress*19)*scale*taper;
const width=(.35+Math.sin(j/12*Math.PI)*.55)*scale*taper;
left.push([px-width,py]);right.unshift([px+width,py]);
}
ctx.globalAlpha=streakAlpha*Math.sin(age*Math.PI)*.65*taper;
surfContour([...left,...right],i%3?'#effff3':'#cdeee4');
}
ctx.restore();
// A rounded impact burst leaves progressively smaller, fainter foam behind the break.
ctx.save();
const impactX=x+25*scale,impactY=y+16*scale,foamAlpha=ctx.globalAlpha;
// Foam starts at the mouth's 12 o'clock edge and thickens toward the impact burst.
const mouth=[[8,-14],[13,-9],[16,0],[15,12],[18,16],[25,16]];
for(let i=0;i<=40;i++){
const progress=i/40,segment=Math.min(mouth.length-2,Math.floor(progress*(mouth.length-1)));
const blend=progress*(mouth.length-1)-segment,a=mouth[segment],b=mouth[segment+1];
const grain=surfFoamNoise(seed*137+i+1700),pulse=Math.sin(time*.006+i*1.7+seed);
const px=x+(a[0]+(b[0]-a[0])*blend)*scale,py=y+(a[1]+(b[1]-a[1])*blend)*scale;
const radius=(1.8+grain*1.8+progress*1.6+pulse*.35)*scale,puff=[];
for(let j=0;j<10;j++){
const angle=j*Math.PI/5,r=radius*(.85+surfFoamNoise(i*11+j+seed*29)*.3);
puff.push([px+Math.cos(angle)*r,py+Math.sin(angle)*r]);
}
ctx.globalAlpha=foamAlpha*(.65+grain*.3);
surfContour(puff,i%3?'#e8fff0':'#bfe9de');
const age=(time*.001+grain)%1;
ctx.globalAlpha=foamAlpha*(1-age)*.6;
rect(px+(2+age*6)*scale,py-Math.sin(age*Math.PI)*4*scale,Math.max(1,scale),Math.max(1,scale),'#f4fff3');
}
const puffCount=Math.ceil(trailLength/4);
for(let i=puffCount;i>=0;i--){
const progress=i/puffCount,strength=Math.pow(1-progress,1.1);
const radius=(1.3+strength*12)*scale,puffX=impactX+progress*trailLength;
if(puffX+radius<camera.x||puffX-radius>camera.x+WORLD.viewWidth)continue;
const shoreOffset=beachShoreY(puffX)-beachShoreY(impactX);
const puffY=y+shoreOffset+(16*(1-progress)+progress*5)*scale+Math.sin(time*.005+i*2+seed)*strength*scale;
ctx.globalAlpha=foamAlpha*(1-progress)*.8;
const puff=[];
for(let j=0;j<16;j++){
const angle=j*Math.PI/8,r=radius*(.88+surfFoamNoise(i*17+j+seed*101)*.24);
puff.push([puffX+Math.cos(angle)*r,puffY+Math.sin(angle)*r*.85]);
}
surfContour(puff,i%3?'#d8f3e7':'#effff3');
ctx.globalAlpha=foamAlpha*(1-progress)*.65;
rect(puffX-radius*.4,puffY-radius*.5,Math.max(1,radius*.7),Math.max(1,scale),'#f5fff4');
}
for(let i=0;i<Math.max(36,Math.ceil(trailLength/6));i++){
const grain=surfFoamNoise(seed*53+i+800),age=(time*.0008+grain)%1;
const spread=surfFoamNoise(i+seed*37+900)-.5;
const px=impactX+age*trailLength;
if(px<camera.x-4||px>camera.x+WORLD.viewWidth+4)continue;
const shoreOffset=beachShoreY(px)-beachShoreY(impactX);
const py=y+shoreOffset+(16*(1-age)+age*5)*scale+spread*(1-age)*26*scale-Math.sin(age*Math.PI)*8*scale;
ctx.globalAlpha=foamAlpha*Math.pow(1-age,1.5)*.8;
const size=Math.max(1,(1-age)*3.4*scale);
rect(px,py,size,size,'#effff3');
}
ctx.restore();
// Small drifting droplets and separated foam patches prevent a solid, blocky edge.
for(let i=0;i<12;i++){
const grain=surfFoamNoise(i+seed*53),age=(time*.00065+grain)%1;
const dx=-24-age*(10+grain*18),dy=-h*.7-Math.sin(age*Math.PI)*(4+grain*7)+age*age*9;
ctx.globalAlpha=(1-age)*.65;
rect(x-dy*scale,y+dx*scale,1,grain>.7?2:1,'#eafff1');
}
}
function drawBeachWaves(){
const rental=state.surfRental,time=rental?surfClock:frame*16.667;
ctx.save();clipBeachWaveWater();
if(camera.y+WORLD.viewHeight>=1320){
const start=Math.max(WORLD.left,Math.floor(camera.x/3)*3),end=Math.min(WORLD.right,camera.x+WORLD.viewWidth+3);
for(let i=0;i<3;i++){
const distance=surfWaveDistance(i,time),fade=Math.min(1,(335-distance)/30);
const waveSize=surfWaveSize(distance);
const shallows=Math.max(0,1-distance/110),collapse=Math.max(0,1-distance/45);
const waveY=x=>beachWaveSurfaceY(x,i,time);
for(let x=start;x<=end;x+=3){
const local=820+((x-820)%600+600)%600,w=beachWaveProfile(local,i,time,rental);
const y=waveY(x),grain=surfFoamNoise(x+i*313),peel=w.breaking;
const h=(3+peel*15)*.8*waveSize*(1-collapse*.92);
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
const x=front+section*600;if(x+600<start||x>end+65)continue;
ctx.globalAlpha=fade*(.7+shallows*.2)*(1-collapse*.65);
const peakHeight=18*.8*waveSize*(1-collapse*.92);
const height=peakHeight*3;
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
function surfBaseCrest(x){return 94+Math.sin((x-(surfSession?.scroll||0)*.35)*.019)*3;}
function surfFaceCrest(x,wave){
const base=surfBaseCrest(x);if(!wave)return base;
// A short, steep shoulder lifts the face into the peak of the rounded lip.
const crown=surfLipCrown(wave),t=Math.max(0,Math.min(1,(x-(crown-30))/30));
const lift=t*t*(3-2*t);
return base+(76-base)*lift;
}
function surfRideCrest(x){return 279-(279-surfFaceCrest(x,surfSession?surfRideView():null))*surfRideScale();}
function surfRideView(s=surfSession){
const riderX=224+Math.max(-10,Math.min(10,(.43-s.x)*28));
return {riderX,breakX:riderX+(.86-s.x)*440,scroll:s.scroll||0};
}
function surfLipCrown(wave){return wave.breakX-22+Math.sin(94*.13+surfClock*.005)*3;}
function surfBreakEdge(y,wave){
// The round roof meets a forward-falling wall; it never doubles back into an S-shaped fold.
const u=Math.max(0,Math.min(1,(y-94)/72));
const shoulder=y>=94&&y<166?18*Math.pow(1-u,1.3):0;
return wave.breakX-22+(y-94)*.36+shoulder+Math.sin(y*.13+surfClock*.005)*3;
}
function surfLipContour(wave){
const crown=surfLipCrown(wave),points=[];
// Clockwise upper arc: off the back, forward over an open hollow, then downward.
for(let i=0;i<=32;i++){const angle=Math.PI+i/32*Math.PI;points.push([crown+18*Math.cos(angle),94+18*Math.sin(angle)]);}
for(let y=96;y<=281;y+=2)points.push([surfBreakEdge(y,wave),y]);
return points;
}
function surfBarrelState(s=surfSession){
const wave=surfRideView(s),y=surfBaseCrest(wave.riderX)+Math.max(0,Math.min(1,s.y))*(279-surfBaseCrest(wave.riderX));
const edge=surfBreakEdge(y,wave),mouth=edge-32;
const coverage=s.y>.12&&s.y<.85?Math.max(0,Math.min(1,(wave.riderX+15-mouth)/30)):0;
return {coverage,half:coverage>=.25&&coverage<=.75,overrun:wave.riderX+3>=edge,edge,mouth};
}
function advanceSurfWake(s,ms){
s.wake=(s.wake||[]).filter(mark=>(mark.age+=ms)<1300);
s.landingSpray=Math.max(0,(s.landingSpray||0)-ms);
}
function advanceSurfRidingArt(s,ms,previousAngle){
const rate=Math.atan2(Math.sin(s.angle-previousAngle),Math.cos(s.angle-previousAngle))/(ms/1000);
const blend=1-Math.exp(-ms/150),target=Math.max(-1,Math.min(1,rate/3));
s.carveLean=(s.carveLean||0)+(target-(s.carveLean||0))*blend;
const strength=Math.min(1,Math.max(Math.abs(rate)/3,Math.abs(Math.sin(s.angle))*.3));
s.carveStrength=(s.carveStrength||0)+(strength-(s.carveStrength||0))*blend;
s.wakeClock=(s.wakeClock||0)+ms;
while(s.wakeClock>=32){
s.wakeClock-=32;
const {riderX}=surfRideView(s),crest=surfRideCrest(riderX),y=crest+s.y*(279-crest);
s.wake.push({x:riderX-(s.scroll||0),y,speed:s.speed,strength:s.carveStrength,side:-Math.sign(s.carveLean||Math.sin(s.angle)||1),angle:-Math.sin(s.angle)*.45,age:s.wakeClock,seed:Math.floor((s.scroll||0)*7),landing:(s.landingSpray||0)/400});
}
}
function surfWakePower(mark){return Math.min(1,mark.speed/.85)*(.2+mark.strength*.8)+(mark.landing||0)*.5;}
function drawSurfBoardWake(){
const s=surfSession;if(!s)return;
const marks=s.wake||[];
ctx.save();
for(const mark of marks){
const age=mark.age/1300,fade=1-age,power=surfWakePower(mark),x=mark.x+(s.scroll||0)+Math.cos(mark.angle)*12,y=mark.y+Math.sin(mark.angle)*12+3;
const spread=2+age*(6+power*16),drift=age*(10+power*20);
ctx.globalAlpha=fade*(.25+power*.5);
ctx.strokeStyle='#d7f4e7';ctx.lineWidth=.7+power*.9;
ctx.beginPath();ctx.moveTo(x+drift,y-spread);ctx.lineTo(x+drift+5+power*9,y-spread-mark.side*mark.strength*3);
ctx.moveTo(x+drift,y+spread);ctx.lineTo(x+drift+6+power*8,y+spread-mark.side*mark.strength*3);ctx.stroke();
if(mark.age>700)continue;
const count=Math.floor(1+mark.speed*3+mark.strength*9+mark.landing*8);
for(let i=0;i<count;i++){
const grain=surfFoamNoise(mark.seed+i*17),t=mark.age/700;
const px=x+t*(16+mark.speed*70)+grain*7;
const py=y+mark.side*t*(4+mark.strength*32)-Math.sin(t*Math.PI)*(3+power*(12+grain*14))+t*t*7;
ctx.globalAlpha=(1-t)*(.35+power*.55);
rect(px,py,grain>.7&&power>.5?2:1,1,grain>.4?'#f0fff1':'#b5e7db');
}
}
ctx.restore();
}
function surfRiderPose(s=surfSession){
const strength=s?.carveStrength||0,lean=s?.carveLean||0,speed=(s?.speed||0)/.85;
const air=s?.phase==='airborne',impact=(s?.landingSpray||0)/400;
return {lean:lean*5,crouch:air?5:1+strength*5+speed*1.3+impact*4,reach:air?8:4+strength*6,speed,strength};
}
function surfBarrelDepth(y){const u=Math.max(0,Math.min(1,(y-94)/188));return 14+66*Math.pow(Math.sin(u*Math.PI),.65)+24*Math.exp(-Math.pow((y-150)/45,2));}
// The surfing water uses subpixel paths; island sprites retain their pixel contours.
function surfWaterShape(points,color){
ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();
}
function surfWaterDrop(x,y,rx,ry,color){
ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();
}
function surfWaterGradient(top,bottom,stops,fallback){
const gradient=ctx.createLinearGradient(0,top,0,bottom);
if(!gradient?.addColorStop)return fallback;
for(const [position,color] of stops)gradient.addColorStop(position,color);
return gradient;
}
function surfFrothFlowPoint(anchor,progress,wave){
const crown=surfLipCrown(wave),near=Math.exp(-Math.abs(crown-anchor)/85);
const theta=progress*2.14,crest=surfBaseCrest(anchor);
// From this camera, water rises up the back then rolls forward/down in a clockwise curl.
return {x:anchor-(24+near*25)*Math.sin(theta)+(14+near*15)*(1-Math.cos(theta)),y:279-(279-crest)*Math.sin(theta)};
}
function drawSurfFrothRibbon(anchor,from,to,wave,alpha,width){
ctx.globalAlpha=alpha;ctx.lineWidth=width;ctx.beginPath();let open=false;
for(let step=0;step<=24;step++){
const progress=from+(to-from)*step/24,point=surfFrothFlowPoint(anchor,progress,wave);
if(point.x>surfBreakEdge(point.y,wave)+3){open=false;continue;}
if(!open){ctx.moveTo(point.x,point.y);open=true;}else ctx.lineTo(point.x,point.y);
}
ctx.stroke();
}
function drawSurfFaceFroth(wave){
const time=surfClock*.001,scroll=wave.scroll,crown=surfLipCrown(wave);
ctx.save();ctx.lineCap='round';ctx.setLineDash([]);ctx.strokeStyle='#effff5';
// All froth follows the same rolling cross-section; neighboring strands never converge on a point.
for(let i=0;i<33;i++){
const grain=surfFoamNoise(i+4100),phase=(time*(.32+grain*.07)+surfFoamNoise(i+4200))%1;
const anchor=((i*27.71+scroll*.86)%550+550)%550-35;
if(anchor>crown+25)continue;
const tip=phase*.68,length=.07+grain*.09,from=Math.max(0,tip-length);
const fade=Math.min(1,phase*9,(1-phase)*9);
drawSurfFrothRibbon(anchor,from,tip,wave,(.2+grain*.22)*fade,.4+grain*.45);
}
// Around the pitching shoulder, longer visible arcs carry the foam over and down the lip.
ctx.strokeStyle='#e7fff1';
for(let i=0;i<3;i++){
const grain=surfFoamNoise(i+4400),phase=(time*.38+grain)%1;
const anchor=crown+5-i*22+(wave.scroll*.14)%10;
const tip=.83+phase*.17,start=Math.max(.43,tip-.36-grain*.1);
drawSurfFrothRibbon(anchor,start,tip,wave,.18+grain*.16,.45+grain*.35);
}
ctx.restore();
}
function surfBrokenCrestY(x,sprayPeak){
const distance=Math.max(0,x-sprayPeak.x);
return sprayPeak.y+40*(1-Math.exp(-distance/170))+Math.sin(distance*.035)*Math.min(1,distance/24)*.8;
}
function drawSurfWaveFace(){
const s=surfSession,wave=surfRideView(s),scroll=wave.scroll,size=surfRideScale(s);
ctx.save();ctx.translate(0,279*(1-size));ctx.scale(1,size);
// Continuous depth and transmitted light make the face read as a curved sheet of water.
const crest=[];for(let x=0;x<=480;x+=1.5)crest.push([x,surfFaceCrest(x,wave)]);
const faceLight=surfWaterGradient(92,285,[[0,'#47acb9'],[.13,'#297e9e'],[.48,'#1f648c'],[.78,'#297c9e'],[1,'#58bfc1']],'#287f9c');
surfWaterShape([...crest,[480,285],[0,285]],faceLight);
// Faint stretched reflections curve down the face instead of sitting on a square grid.
ctx.lineWidth=.55;
for(let i=0;i<90;i++){
const grain=surfFoamNoise(i+40),x=((i*53.71+scroll)%540+540)%540-30,y=103+grain*170;
if(x>surfBreakEdge(y,wave)-38)continue;
ctx.globalAlpha=.055+Math.abs(grain-.5)*.16;ctx.strokeStyle=i%3?'#8de2d8':'#b5f0e3';
ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x-2,y+4,x+Math.sin(i)*4,y+9,x+2,y+12+grain*9);ctx.stroke();
}
// Fine specular glints slide right with the surface current.
for(let i=0;i<165;i++){
const grain=surfFoamNoise(i+17),x=((i*67+scroll)%540+540)%540-30,y=104+grain*168;
if(x>surfBreakEdge(y,wave)-35)continue;
ctx.globalAlpha=.07+Math.abs(grain-.5)*.25;
rect(x,y,1+grain*2,.5,i%4?'#77cbc5':'#a6e1d3');
}
ctx.globalAlpha=1;
const front=[],wetBack=[];
for(let y=94;y<=286;y+=3){const edge=surfBreakEdge(y,wave);front.push([edge,y]);wetBack.push([edge+27+Math.sin(y*.12+surfClock*.002)*4,y]);}
// A soft shadow extends into the face beneath the overhang instead of outlining a tube.
for(let layer=15;layer>=0;layer--){
const shade=front.map(([x,y])=>[x-12-surfBarrelDepth(y)*(layer+1)/15,y]);
ctx.globalAlpha=.035+(15-layer)*.0045;
surfWaterShape([...shade,...front.slice().reverse()],'#082139');
}
// A wider, dark inner wall gives the falling sheet a visibly hollow barrel behind it.
const hollow=front.map(([x,y])=>[x-surfBarrelDepth(y)*.73,y]);
ctx.globalAlpha=.84;
const barrelShade=surfWaterGradient(78,284,[[0,'#030f20'],[.45,'#071a2b'],[.8,'#0c2d40'],[1,'#1d5e6b']],'#071a2b');
surfWaterShape([...hollow,...front.slice().reverse()],barrelShade);
// Carry the same dark interior beneath the rounded roof, up to the underside of the lip.
const crown=surfLipCrown(wave),roofShadow=[];
for(let i=0;i<=24;i++){const angle=Math.PI+i/24*Math.PI;roofShadow.push([crown+15*Math.cos(angle),94+15*Math.sin(angle)]);}
const upperWall=surfBreakEdge(112,wave);
surfWaterShape([...roofShadow,[upperWall,112],[upperWall-surfBarrelDepth(112)*.73,112]],barrelShade);
// Refracted light returns along the curved lower wall, separating it from the dark roof.
ctx.strokeStyle='#3b8997';ctx.lineWidth=.6;
for(let band=0;band<3;band++){
ctx.globalAlpha=.055-band*.012;ctx.beginPath();
for(let y=181;y<=274;y+=3){const x=surfBreakEdge(y,wave)-surfBarrelDepth(y)*(.85-band*.09);if(y===181)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();
}
ctx.globalAlpha=1;
drawSurfFaceFroth(wave);
// The spent wave starts at the spray peak, then settles lower the farther it trails behind.
const sprayPeak=surfLipSprayPeak(wave),brokenCrest=[];
for(let x=sprayPeak.x;x<=514;x+=3){
const y=surfBrokenCrestY(x,sprayPeak);
brokenCrest.push([x,y]);
}
const topBack=brokenCrest.slice().reverse();
surfWaterShape([[sprayPeak.x,sprayPeak.y],...front,[514,286],...topBack],surfWaterGradient(sprayPeak.y,286,[[0,'#31afc0'],[.45,'#49c4cb'],[1,'#a7e9db']],'#49bfc7'));
surfWaterShape([[sprayPeak.x+17,surfBrokenCrestY(sprayPeak.x+17,sprayPeak)],...wetBack,[514,286],...topBack.filter(([x])=>x>=sprayPeak.x+17)],surfWaterGradient(sprayPeak.y,286,[[0,'#53c6cf'],[.48,'#71d6d3'],[1,'#d1f5e9']],'#71d6d3'));
// Foam follows the same descending crest across the older broken water.
for(const [x,y] of brokenCrest){
const grain=surfFoamNoise(Math.floor((x-scroll)/3)+7400),strength=.22+.5*Math.exp(-(x-sprayPeak.x)/110);
ctx.globalAlpha=strength;surfWaterDrop(x,y,.65+grain*.7,.3+grain*.45,'#eafff1');
if(grain>.5)surfWaterDrop(x+1,y+2+grain*3,.45+grain*.5,.3,'#cff5e7');
}
ctx.globalAlpha=1;
// Low-contrast currents remain visible beneath the aerated surface.
for(let i=0;i<44;i++){
const grain=surfFoamNoise(i+3300),x=((i*47.3+scroll*1.12)%550+550)%550-20,y=112+grain*168;
if(x<surfBreakEdge(y,wave)+24)continue;
ctx.globalAlpha=.045+grain*.065;ctx.strokeStyle=i%3?'#e8fff0':'#258ba5';ctx.lineWidth=.8+grain*2;
ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+7,y-4,x+15,y+5,x+20+grain*13,y+1);ctx.stroke();
}
// Fine connected flecks collect in irregular eddies rather than a field of large bubbles.
for(let i=0;i<720;i++){
const grain=surfFoamNoise(i+200),y=sprayPeak.y+4+surfFoamNoise(i+400)*(281-sprayPeak.y);
const x=((i*61.73+scroll*1.18)%550+550)%550-20,edge=surfBreakEdge(y,wave);
if(x<edge+12||y<surfBrokenCrestY(x,sprayPeak)+3)continue;
const u=(y-sprayPeak.y)/(285-sprayPeak.y),count=3+Math.floor(grain*6+u*3);
ctx.globalAlpha=.25+grain*.3+u*.22;
for(let fleck=0;fleck<count;fleck++){
const f=surfFoamNoise(i*19+fleck+2300),a=f*Math.PI*2;
const px=x+Math.cos(a)*(1+grain*3),py=y+Math.sin(a)*(1+grain*2);
surfWaterDrop(px,py,.28+f*.65,.22+grain*.4,grain>.2?'#f1fff3':'#2f9fb6');
}
if(grain>.65){ctx.strokeStyle='#e5fff0';ctx.lineWidth=.4;ctx.beginPath();ctx.moveTo(x-2,y);ctx.quadraticCurveTo(x,y-2,x+3+grain*3,y+1);ctx.stroke();}
}
ctx.globalAlpha=1;
ctx.restore();return wave;
}
function surfFoamTrailProfile(x,impact){
const strength=.16+.84*Math.exp(-Math.max(0,x-impact)/135);
return {strength,height:4+strength*23,alpha:.28+strength*.4};
}
function drawSurfFoamTrail(impact,wave,time){
const top=[],bottom=[];
for(let x=impact-4;x<=514;x+=4){
const profile=surfFoamTrailProfile(x,impact),grain=surfFoamNoise(Math.floor((x-wave.scroll*1.12)/7)+6200);
const rise=profile.height*(.48+grain*.35)+Math.sin(x*.17+time*4)*profile.strength*1.4;
top.push([x,280-rise]);bottom.unshift([x,290]);
}
ctx.globalAlpha=.64;
surfWaterShape([...top,...bottom],surfWaterGradient(262,290,[[0,'#e9fff0'],[.6,'#d6f5e6'],[1,'#a8e0d3']],'#dcf8e9'));
// Older foam rides right with the current: lower and thinner, but continuous to the screen edge.
for(let x=impact-4;x<513;x+=5){
const profile=surfFoamTrailProfile(x,impact),grain=surfFoamNoise(Math.floor((x-wave.scroll*1.12)/5)+6400);
const phase=(time*.85+grain)%1,y=279-profile.height*(.25+Math.sin(phase*Math.PI)*.35);
ctx.globalAlpha=profile.alpha;
surfWaterDrop(x,y,3+grain*4,1.5+profile.strength*(2+grain*2),'#effff3');
ctx.globalAlpha=profile.alpha*.55;
for(let i=0;i<3;i++){
const f=surfFoamNoise(Math.floor(x*7)+i+6600);
surfWaterDrop(x+f*5,279-profile.height*f,.3+f*.6,.25+grain*.4,i%2?'#76c9bf':'#f3fff4');
}
}
}
function surfLipSprayPoint(grain,age,crown){
// Positive screen X carries spray forward; positive screen Y acceleration makes the arc clockwise.
return {x:crown-36+grain*32+age*(28+grain*24),y:94-(70+grain*50)*age+(110+grain*45)*age*age};
}
function surfLipSprayPeak(wave){
// The strongest droplets have the highest apex; reuse their actual ballistic path.
return surfLipSprayPoint(1,120/(2*155),surfLipCrown(wave));
}
function drawSurfWaveLip(wave){
const size=surfRideScale(),time=surfClock*.001;
ctx.save();ctx.translate(0,279*(1-size));ctx.scale(1,size);
// Light on the offshore crest stays thin until it reaches the falling sheet.
const crown=surfLipCrown(wave);
ctx.strokeStyle='#d5f8ed';ctx.lineWidth=.85;ctx.beginPath();
for(let x=0;x<crown;x+=1.5){const y=surfFaceCrest(x,wave);if(!x)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();
for(let x=0;x<crown;x+=5){const grain=surfFoamNoise(Math.floor((x-wave.scroll)/5));if(grain>.65){ctx.globalAlpha=.4;surfWaterDrop(x,surfFaceCrest(x,wave)+2,1.3,.45,'#a6eee2');}}
ctx.globalAlpha=1;
// Froth runs along the whole crest and builds into a thicker aerated edge at the break.
const crestTop=[],crestBottom=[];
for(let x=0;x<crown;x+=2){
const near=Math.exp(-Math.max(0,crown-x)/80),grain=surfFoamNoise(Math.floor((x-wave.scroll)/4)+6800),y=surfFaceCrest(x,wave);
crestTop.push([x,y-.6-near*(1.5+grain*2)]);crestBottom.unshift([x,y+.8+near*(2+grain*3)]);
}
if(crestTop.length){ctx.globalAlpha=.28;surfWaterShape([...crestTop,...crestBottom],'#edfff2');}
for(let x=0;x<crown;x+=3){
const near=Math.exp(-Math.max(0,crown-x)/80),grain=surfFoamNoise(Math.floor((x-wave.scroll)/3)+6900),y=surfFaceCrest(x,wave);
ctx.globalAlpha=.3+near*.5;
for(let i=0;i<1+Math.floor(near*5);i++){
const f=surfFoamNoise(Math.floor(x)+i*37+7000),phase=(time*.7+f)%1;
surfWaterDrop(x+f*2,y+(phase-.4)*(1.3+near*7),.35+f*(.3+near*.65),.25+near*f*.8,'#f0fff3');
}
}
ctx.globalAlpha=1;
// One rounded contour connects the roof directly to the falling sheet, without a folded hook.
const contour=surfLipContour(wave),lit=[],back=[],underside=[];
for(let i=0;i<contour.length;i++){
const [x,y]=contour[i],before=contour[Math.max(0,i-1)],after=contour[Math.min(contour.length-1,i+1)];
const dx=after[0]-before[0],dy=after[1]-before[1],length=Math.hypot(dx,dy)||1;
const nx=-dy/length,ny=dx/length,fall=Math.max(0,Math.min(1,(y-94)/187));
const rough=Math.max(0,Math.min(1,(y-106)/35))*(Math.sin(y*.25-time*6)*1.4+Math.sin(y*.47-time*4)*.6);
lit.push([x+nx*3+rough,y+ny*3]);
back.unshift([x-nx*(9+fall*10)+rough*.5,y-ny*(9+fall*10)]);
underside.push([x+nx*17,y+ny*17]);
}
ctx.save();ctx.globalAlpha=.2;
surfWaterShape([...underside,...lit.slice().reverse()],'#76d8d4');ctx.restore();
ctx.save();ctx.globalAlpha=.73;surfWaterShape([...lit,...back],surfWaterGradient(72,281,[[0,'#8ee5df'],[.4,'#76dcd9'],[1,'#c6f8e7']],'#76dcd9'));ctx.restore();
// A soft highlight follows the same clockwise arc and the forward-falling wall.
ctx.save();ctx.lineCap='round';ctx.lineWidth=.75;ctx.strokeStyle='#d6fff0';ctx.globalAlpha=.27;ctx.beginPath();
contour.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();ctx.restore();
// Fine strands stretch under gravity, then separate into droplets.
for(let i=0;i<420;i++){
const grain=surfFoamNoise(i+500),phase=(time*(.65+grain*.5)+surfFoamNoise(i+700))%1;
const y=94+surfFoamNoise(i+900)*181+phase*17;if(y>280)continue;
const edge=surfBreakEdge(y,wave),x=edge-4+surfFoamNoise(i+1100)*24+phase*5;
ctx.globalAlpha=.32+(1-phase)*.4;ctx.strokeStyle=grain>.22?'#f1fff3':'#b9f3e3';ctx.lineWidth=.35+grain*.65;
ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+1.5,y+3,x+2+grain*2,y+2+grain*3);ctx.stroke();
surfWaterDrop(x,y,.25+grain*.4,.3+grain*.5,'#eafff0');
if(grain>.6){ctx.globalAlpha=.75;for(let f=0;f<3;f++)surfWaterDrop(x-2+f*1.4,y+f*1.8,.4,.55,'#f5fff5');}
}
// Wind tears a high plume from the crest where the wave first pitches forward.
for(let i=0;i<250;i++){
const grain=surfFoamNoise(i+1400),age=(time*(.5+grain*.5)+surfFoamNoise(i+1500))%1;
const {x,y}=surfLipSprayPoint(grain,age,crown);
ctx.globalAlpha=(1-age)*(.65+grain*.35);
surfWaterDrop(x,y,.35+grain*1.05,.45+grain*1.35,grain>.3?'#f4fff4':'#a5eee3');
if(grain>.7&&age>.06){
const prior=surfLipSprayPoint(grain,age-.045,crown);
ctx.strokeStyle='#eafff4';ctx.lineWidth=.3+grain*.3;ctx.globalAlpha=(1-age)*.4;
ctx.beginPath();ctx.moveTo(prior.x,prior.y);ctx.lineTo(x,y);ctx.stroke();
}
if(grain>.5){ctx.globalAlpha=(1-age)*.11;surfWaterDrop(x+1,y+2,3+grain*2,2+grain,'#d7fff1');}
}
// The plunge at the trough boils into a wider, dense, low cloud of whitewater.
const impact=surfBreakEdge(274,wave);
drawSurfFoamTrail(impact,wave,time);
// A broad, tall boiling core carries the force of the impact beneath the flying spray.
for(let i=0;i<46;i++){
const grain=surfFoamNoise(i+4700),phase=(time*(.65+grain*.4)+surfFoamNoise(i+4800))%1;
const x=impact-20+grain*76+Math.sin(phase*Math.PI*2)*6;
const y=275-Math.abs(Math.sin(phase*Math.PI*2))*(8+grain*18);
ctx.globalAlpha=.4+grain*.35;
surfWaterDrop(x,y,7+grain*11,4+grain*7,i%4?'#effff3':'#b7eddf');
}
// Tiny blue-green pores keep the dense foam core textured rather than a solid white oval.
for(let i=0;i<88;i++){
const grain=surfFoamNoise(i+4900),phase=(time*.7+grain)%1;
const x=impact-19+surfFoamNoise(i+5000)*77,y=247+surfFoamNoise(i+5100)*35;
if(Math.pow((x-impact-19)/46,2)+Math.pow((y-272)/23,2)>1)continue;
ctx.globalAlpha=.13+grain*.1;
surfWaterDrop(x+Math.sin(phase*Math.PI*2)*2,y,.35+grain*.6,.25+grain*.4,'#65bfb9');
}
for(let i=0;i<320;i++){
const grain=surfFoamNoise(i+800),age=(time*(.65+grain*.35)+surfFoamNoise(i+1700))%1;
const side=i%4===0?-1:1,x=impact+grain*19+side*age*(30+grain*82);
const y=278-Math.sin(age*Math.PI)*(10+grain*40)+age*age*8;
ctx.globalAlpha=(1-age)*(.6+grain*.35);
surfWaterDrop(x,y,.5+grain*1.5,.35+grain*.9,i%3?'#effcf0':'#bce8d9');
if(grain>.6){ctx.globalAlpha=(1-age)*.18;surfWaterDrop(x+2,y+1,3+grain*3,1.5+grain,'#e3fff0');}
}
for(let i=0;i<34;i++){
const grain=surfFoamNoise(i+1300),age=(time*.45+grain)%1;
ctx.globalAlpha=(1-age)*.7;
surfWaterDrop(impact-12+age*(31+grain*53),280+grain*8,1.5+grain*4.5,.4+grain*.6,i%3?'#d6f1e2':'#96d4c9');
}
ctx.restore();
}
function drawSurfShortboard(paddling){
ctx.save();ctx.scale(1,paddling?1:.48);
ellipse(-1,4,19,6,'#3c7e8055');
// Pulled-in rails run from a squared squash tail to a sharp, rockered nose.
ctx.beginPath();ctx.moveTo(21,0);ctx.bezierCurveTo(12,-7,-3,-8,-17,-4);
ctx.lineTo(-18,-2.5);ctx.lineTo(-18,2.5);ctx.lineTo(-17,4);
ctx.bezierCurveTo(-3,8,12,7,21,0);ctx.closePath();
ctx.fillStyle='#f5f8df';ctx.fill();ctx.strokeStyle='#216376';ctx.lineWidth=.9;ctx.stroke();
polygon([[-16,-3.5],[-5,-5.5],[15,-1],[-3,-1]],'#22c4c5');
polygon([[-13,4],[-3,.5],[13,1],[-3,5.5]],'#fa694e');
polygon([[0,-4],[7,-1],[2,0],[10,3],[-2,0],[3,-1]],'#f5d34f');
polygon([[-16,-2.6],[-9,-3.5],[-8,3],[-16,2.6]],'#304e5b');
ctx.strokeStyle='#b1c6bd';ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(-7,0);ctx.lineTo(18,0);ctx.stroke();
ctx.restore();
}
function drawSurfRider(x,y,rotation,paddling=false){
const colors=characterColors(),s=surfSession;
ctx.save();ctx.translate(x,y);ctx.rotate(rotation);if(!paddling)ctx.scale(-1,1);
if(paddling)clipBeachWaveOccupant(x,y);
drawSurfShortboard(paddling);
if(paddling){
drawSwimmingCharacter(0,-.5,{phase:s?.paddlePhase||0,effort:s?.paddleEffort||0,time:surfClock,heading:0},true);
}else{
const pose=surfRiderPose(s),crouch=pose.crouch,hipX=pose.lean*.6,hipY=-12+crouch*.55;
const shoulderX=hipX+pose.lean*.75+(s?.phase==='airborne'?0:1),shoulderY=hipY-8;
// Two planted feet, flexed knees, and a counterbalancing torso keep the weight on the rail.
ctx.strokeStyle='#385557';ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
ctx.moveTo(-7,-2);ctx.lineTo(-6+pose.lean*.3,-7+crouch*.45);ctx.lineTo(hipX-2,hipY);
ctx.moveTo(7,-2);ctx.lineTo(7+pose.lean*.45,-7+crouch*.5);ctx.lineTo(hipX+2,hipY);ctx.stroke();
polygon([[hipX-4,hipY],[hipX+4,hipY],[shoulderX+4,shoulderY],[shoulderX-4,shoulderY]],colors.shirt);
const headX=shoulderX+pose.lean*.15,headY=shoulderY-4;
rect(headX-3,headY-5,7,7,'#f2c992');rect(headX-4,headY-6,8,3,colors.hair);
if(currentProfile().character==='girl')rect(headX-5,headY-3,3,8,colors.hair);
ctx.strokeStyle='#f2c992';ctx.lineWidth=2;ctx.beginPath();
ctx.moveTo(shoulderX-3,shoulderY+2);ctx.lineTo(shoulderX-7,shoulderY+5-pose.strength*2);ctx.lineTo(shoulderX-9-pose.reach*.4,shoulderY+4-pose.reach*.4);
ctx.moveTo(shoulderX+3,shoulderY+2);ctx.lineTo(shoulderX+7,shoulderY+2-pose.strength*3);ctx.lineTo(shoulderX+9+pose.reach*.2,shoulderY-pose.reach*.45);ctx.stroke();rect(headX+2,headY-1,1,1,'#354744');
}
ctx.restore();
}
function drawSurfingWorld(){
if(surfSession?.phase!=='paddling')return;
const s=surfSession,heading=s.paddleHeading??-Math.PI/2;
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
const x=wave.riderX,crest=surfRideCrest(x),face=279-crest,y=crest+s.y*face-s.airHeight*85*surfRideScale(s);
if(s.phase==='wipeout'){
const t=Math.min(1,s.wipeoutTime/1400);ctx.save();ctx.translate(x,y+Math.sin(t*Math.PI)*8);ctx.rotate(t*Math.PI*3);drawSurfRider(0,0,0);ctx.restore();
ctx.strokeStyle='#eef9df';ctx.lineWidth=2;for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(x,y+10,5+t*29+i*5,2+t*8+i*2,0,0,Math.PI*2);ctx.stroke();}
}else if(s.phase!=='results'){
const tilt=s.phase==='airborne'?s.airSpin:-Math.sin(s.angle)*.45+(s.carveLean||0)*.1;
drawSurfBoardWake();
drawSurfRider(x,y,tilt);
}
drawSurfWaveLip(wave);
for(let i=0;i<35;i++){const x=((i*41+(s.scroll||0)*1.15)%510+510)%510-15;rect(x,282+i%5*4,8+i%4*3,2,i%3?'#b9e6db':'#e0f5e5');}
ctx.font='7px monospace';ctx.textAlign='left';ctx.fillStyle='#dff0ce';ctx.fillText('UP / DOWN · PUMP FOR SPEED',14,117);ctx.textAlign='right';ctx.fillText('BREAKING WAVE',466,81);
if(s.phase==='results'){rect(94,105,292,89,'#1d5350e8');ctx.fillStyle='#fff0c7';ctx.textAlign='center';ctx.font='bold 16px monospace';ctx.fillText('HEAT COMPLETE',240,130);ctx.font='12px monospace';ctx.fillText(`${Math.floor(s.score)} POINTS`,240,153);ctx.font='8px monospace';ctx.fillText(`BEST ${state.surfBest||0} · RENTAL STILL ACTIVE`,240,175);}
ctx.restore();
}
