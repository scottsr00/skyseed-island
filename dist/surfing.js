'use strict';
const SURF_RENTAL_COST=20,SURF_SHACK={x:1120,y:1762},SURF_HEAT_TIME=90000;
let surfSession=null,surfClock=0;
function nearSurfShack(){return !volleyball&&!boating&&!swimming&&!dragonFlight&&!wakeboardRide&&!beachTransfer&&!surfSession&&onMainlandBeach()&&Math.hypot(player.x-SURF_SHACK.x,player.y-SURF_SHACK.y)<72;}
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
surfSession={phase:'paddling',safe:{x:player.x,y:player.y},remaining:SURF_HEAT_TIME,score:0,wipeouts:0,paused:false,x:.43,y:.48,angle:Math.PI-.12,speed:.4,vx:0,vy:0,paddleTime:0,turn:0,turnCooldown:0,bands:[],airHeight:0,airV:0,airSpin:0,message:'Paddle out with arrows / WASD. Space catches a nearby crest.'};
player.x=SURF_SHACK.x;player.y=beachShoreY(player.x)-12;updateSurfUI();save();canvas.focus({preventScroll:true});
}
function surfWaveDistance(index){return 335-((surfClock*.026+index*108)%324);}
function surfWaveY(x,index){return beachShoreY(x)-surfWaveDistance(index)+Math.sin(x*.018+surfClock*.0014)*3;}
function catchSurfWave(){
const s=surfSession;if(!s||s.phase!=='paddling'||s.paused)return false;
const distance=beachShoreY(player.x)-player.y;
if(distance<65||distance>280||s.paddleTime<400){s.message='Paddle farther out: reach the rolling crests beyond the shore break.';updateSurfUI();return false;}
if(![0,1,2].some(i=>Math.abs(surfWaveY(player.x,i)-player.y)<30)){s.message='Wait for a crest to reach your board, then press Space.';updateSurfUI();return false;}
s.phase='riding';s.x=.43;s.y=.48;s.angle=Math.PI-.12;s.speed=.4;s.turn=0;s.turnCooldown=0;s.airHeight=0;s.airSpin=0;s.message='Wave caught! Left / right steer. Hold Space to carve harder.';keys.clear();updateSurfUI();return true;
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
updateSurfUI();if(persist)save();
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
const sharp=keys.has(' ')||keys.has('carve'),rotation=steer*(s.phase==='airborne'?5.8:sharp?4:2.3)*seconds;
s.angle+=rotation;
if(s.phase==='airborne'){
s.airSpin+=rotation;s.airTurns=Math.max(s.airTurns||0,Math.abs(s.airSpin));s.airHeight+=s.airV*seconds;s.airV-=2.6*seconds;s.x+=(Math.cos(s.angle)*s.speed*.25+.07)*seconds;
if(s.airHeight<=0&&s.airV<0){
const down=Math.sin(s.angle);
if(down<.12||down>.96){surfWipeout('Wipeout! Land pointing diagonally down the face.');continue;}
const spins=Math.floor(((s.airTurns||0)+.1)/(Math.PI*2)),bonus=100+spins*400;s.score+=bonus;s.phase='riding';s.y=.07;s.airHeight=0;s.speed=Math.min(.7,s.speed+.07);s.message=spins?`${spins*360}° AERIAL · +${bonus}`:`CLEAN AIR · +${bonus}`;
}
continue;
}
s.speed=Math.max(.12,Math.min(.7,s.speed+(Math.sin(s.angle)*.28-.025-Math.abs(steer)*(sharp?.09:.02))*seconds));
s.x+=(Math.cos(s.angle)*s.speed*.45+.10)*seconds;s.y+=Math.sin(s.angle)*s.speed*1.25*seconds;
s.turn+=rotation;s.turnCooldown=Math.max(0,s.turnCooldown-ms);
if(Math.abs(s.turn)>=Math.PI&&s.speed>.25&&s.turnCooldown===0){const bonus=Math.round(75+s.speed*200);s.score+=bonus;s.turn=0;s.turnCooldown=800;s.message=`CUTBACK · +${bonus}`;}
const tube=s.x>.64&&s.x<.82&&s.y<.65;
s.score+=seconds*(tube?85:7+s.speed*18);
if(tube)s.message='IN THE TUBE · hold your line near the curl';
const band=Math.floor(Math.max(0,s.y)*4);if(!s.bands.includes(band)){s.bands.push(band);s.score+=25;}
if(s.x>.86){surfWipeout('The curl caught you! Turn left to escape the breaking lip.');continue;}
if(s.x<.02){surfWipeout('You outran the wave. Cut back toward its face.');continue;}
if(s.y>1.03){surfWipeout('Too low on the wave! Carve back up before reaching the trough.');continue;}
if(s.y<0){if(s.speed<.24){surfWipeout('Not enough speed to clear the lip. Build speed down the face.');continue;}s.phase='airborne';s.y=0;s.airHeight=0;s.airV=1+s.speed;s.airSpin=0;s.airTurns=0;s.message='AIR! Turn your board, then line up a clean landing.';}
}
updateSurfUI();
}
function handleSurfKey(k,e){
if(k==='x'){e.preventDefault();if(!e.repeat)stopSurfing();return;}
if(k==='p'||k==='escape'){e.preventDefault();if(!e.repeat){surfSession.paused=!surfSession.paused;keys.clear();updateSurfUI();}return;}
if(surfSession.paused)return;
if(k==='enter'&&surfSession.phase==='results'){e.preventDefault();if(!e.repeat){stopSurfing();startSurfing();}return;}
if(k===' '||k==='enter'){e.preventDefault();if(surfSession.phase==='paddling'){if(!e.repeat)catchSurfWave();}else keys.add(' ');return;}
if(['arrowleft','arrowright','arrowup','arrowdown','a','d','w','s'].includes(k)){e.preventDefault();keys.add(k);}
}
function updateSurfUI(){
const s=surfSession,phase=s?.phase||'map';$('.map-stage').setAttribute('data-surf-view',s?(phase==='paddling'?'paddling':'riding'):'map');
$('#surfOverlay').hidden=!s;$('#surfRentalInfo').textContent=state.surfRental?'Your board is rented until you return it. Paddle out, catch a crest, and take on a 90-second heat. Three wipeouts end the heat.':`Rent a board for ${SURF_RENTAL_COST} crystals. The local swell builds as soon as you rent. Your rental lasts until you return the board.`;
$('#rentSurfboard').disabled=state.surfRental||state.crystals<SURF_RENTAL_COST||!nearSurfShack();$('#rentSurfboard').textContent=state.surfRental?'✓ Surfboard rented':'Rent surfboard · 20 ◆';
$('#paddleSurfboard').disabled=!state.surfRental||!nearSurfShack();$('#returnSurfboard').hidden=!state.surfRental;$('#surfBest').textContent=`Best heat: ${state.surfBest||0} points`;
$('#mapSurfShack').hidden=!nearSurfShack();
if(!s)return;
$('#surfScore').textContent=`${Math.floor(s.score)} pts`;$('#surfTime').textContent=`${Math.ceil(s.remaining/1000)}s`;$('#surfLives').textContent=`${Math.max(0,3-s.wipeouts)} wipeouts left`;
$('#surfMessage').textContent=s.paused?'Paused — press P or Resume to continue.':s.message;
$('#surfPhase').textContent=s.paused?'PAUSED':phase==='paddling'?'PADDLE OUT':phase==='airborne'?'CATCHING AIR':phase==='results'?'HEAT COMPLETE':phase==='wipeout'?'WIPEOUT':'RIDE THE WAVE';
$('#surfAction').textContent=phase==='paddling'?'Catch wave · Space':'Hold to carve · Space';$('#surfAction').disabled=['results','wipeout'].includes(phase)||s.paused;
$('#surfRetry').hidden=phase!=='results';$('#surfPause').textContent=s.paused?'Resume · P':'Pause · P';$('#surfUp').hidden=phase!=='paddling';$('#surfDown').hidden=phase!=='paddling';
}
function initSurfing(){
window.addEventListener('keydown',e=>{if(!surfSession||document.querySelector('dialog[open]')||['INPUT','SELECT','TEXTAREA'].includes(e.target?.tagName))return;e.stopImmediatePropagation();handleSurfKey(e.key.toLowerCase(),e);},{capture:true});
$('#rentSurfboard').onclick=rentSurfboard;$('#paddleSurfboard').onclick=startSurfing;$('#returnSurfboard').onclick=returnSurfboard;$('#mapSurfShack').onclick=openSurfShack;
$('#surfQuit').onclick=()=>stopSurfing();$('#surfRetry').onclick=()=>{stopSurfing();startSurfing();};$('#surfPause').onclick=()=>{if(surfSession){surfSession.paused=!surfSession.paused;keys.clear();updateSurfUI();canvas.focus({preventScroll:true});}};
for(const [id,key] of [['surfLeft','left'],['surfRight','right'],['surfUp','up'],['surfDown','down'],['surfAction',' ']]){
const b=$('#'+id);b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture?.(e.pointerId);if(!surfSession||surfSession.paused)return;if(key===' '&&surfSession.phase==='paddling')catchSurfWave();else keys.add(key);};b.onpointerup=b.onpointercancel=()=>keys.delete(key);
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
function drawSurfOcean(){
if(!state.surfRental||camera.y+WORLD.viewHeight<1330||camera.x>1420||camera.x+WORLD.viewWidth<820)return;
ctx.save();
for(let i=0;i<3;i++){
ctx.strokeStyle=i%2?'#e9fff0cc':'#c5ece4cc';ctx.lineWidth=2.3;ctx.beginPath();
for(let x=Math.max(820,Math.floor(camera.x/12)*12);x<=Math.min(1420,camera.x+WORLD.viewWidth+12);x+=12){const y=surfWaveY(x,i);if(x===Math.max(820,Math.floor(camera.x/12)*12))ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();
ctx.strokeStyle='#55a4ad88';ctx.lineWidth=4;ctx.stroke();
}
for(const x of [850,1390]){const y=beachShoreY(x)-200;ellipse(x,y+2,5,2,'#dff4e688');rect(x-2,y-5,4,7,'#dc9b69');rect(x-1,y-8,2,4,'#f5e3b4');}
ctx.restore();
}
function drawSurfRider(x,y,rotation,paddling=false){
const colors=characterColors(),s=surfSession;
ctx.save();ctx.translate(x,y);ctx.rotate(rotation);
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
rect(0,0,480,66,'#c5ddd0');ellipse(68,28,13,13,'#f0d995');
polygon([[0,61],[80,55],[147,60],[192,52],[270,62],[340,54],[480,61],[480,75],[0,75]],'#86ada3');
rect(0,70,480,230,'#70b6be');
for(let i=0;i<15;i++){const x=((i*47-surfClock*.045)%520+520)%520;rect(x,77+i%3*5,12,1,'#add6cf');}
// Broad face and a right-hand breaking curl: travel and texture scroll to the left.
ctx.fillStyle='#35999a';ctx.beginPath();ctx.moveTo(0,100);
for(let x=0;x<=365;x+=12)ctx.lineTo(x,98+Math.sin(x*.025-surfClock*.0018)*4);
ctx.bezierCurveTo(396,58,476,75,476,141);ctx.bezierCurveTo(476,204,425,260,380,279);ctx.lineTo(0,279);ctx.closePath();ctx.fill();
for(let band=0;band<6;band++){
ctx.strokeStyle=['#51aaa2','#4ba69e','#65b5a8'][band%3];ctx.lineWidth=2;ctx.beginPath();
for(let x=0;x<370;x+=14){const y=119+band*24+Math.sin(x*.02-surfClock*.002+band)*4;if(!x)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();
}
ellipse(413,164,59,73,'#246f7c');ellipse(395,168,39,51,'#378d94');
const crest=95,face=159,x=s.x*480,y=crest+s.y*face-s.airHeight*85;
if(s.phase==='wipeout'){
const t=Math.min(1,s.wipeoutTime/1400);ctx.save();ctx.translate(x,y+Math.sin(t*Math.PI)*8);ctx.rotate(t*Math.PI*3);drawSurfRider(0,0,0);ctx.restore();
ctx.strokeStyle='#eef9df';ctx.lineWidth=2;for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(x,y+10,5+t*29+i*5,2+t*8+i*2,0,0,Math.PI*2);ctx.stroke();}
}else if(s.phase!=='results'){
const tilt=s.phase==='airborne'?s.airSpin:Math.atan2(Math.sin(s.angle)*.65,Math.abs(Math.cos(s.angle)))*.45;
drawSurfRider(x,y,tilt);
ctx.strokeStyle='#e7f6d9bb';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x+10,y+4);ctx.lineTo(x+26,y+9);ctx.moveTo(x+11,y+3);ctx.lineTo(x+30,y+5);ctx.stroke();
}
ctx.strokeStyle='#e5f5dc';ctx.lineWidth=11;ctx.beginPath();ctx.moveTo(350,101);ctx.bezierCurveTo(388,58,466,74,468,139);ctx.bezierCurveTo(471,200,423,252,378,277);ctx.stroke();
ctx.strokeStyle='#a5d8c9';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(355,101);ctx.bezierCurveTo(396,73,454,93,452,145);ctx.stroke();
for(let i=0;i<25;i++){const phase=(surfClock*.001+i*.63)%1;ellipse(366+i%7*13-8*phase,104+i%11*15+phase*12,2+i%3,1.2,'#eff8df99');}
rect(0,280,480,20,'#d9ecd1');
ctx.font='7px monospace';ctx.textAlign='left';ctx.fillStyle='#dff0ce';ctx.fillText('CARVE THE FACE',14,117);ctx.textAlign='right';ctx.fillText('THE CURL',466,94);
if(s.phase==='results'){rect(94,105,292,89,'#1d5350e8');ctx.fillStyle='#fff0c7';ctx.textAlign='center';ctx.font='bold 16px monospace';ctx.fillText('HEAT COMPLETE',240,130);ctx.font='12px monospace';ctx.fillText(`${Math.floor(s.score)} POINTS`,240,153);ctx.font='8px monospace';ctx.fillText(`BEST ${state.surfBest||0} · RENTAL STILL ACTIVE`,240,175);}
ctx.restore();
}
