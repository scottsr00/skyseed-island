'use strict';
// Loaded before app.js, like surfing.js. All live game bindings are resolved on use.
const ROCKET_BASE={x:2935,y:244},SPACE_MUSEUM={x:2850,y:230},ROCKET_SAFE={x:2920,y:267};
const ROCKET_PRICE=250,ROCKET_LAUNCH_MS=10000;
let rocketSession=null,rocketRepair=null,rocketSplash=null,museumQuestion=null,museumAnswered=false,rocketRecovery=false;
// Correct choice is first in the authored data; the museum rotates its displayed position.
// Background references: https://science.nasa.gov/solar-system/planets/
// https://science.nasa.gov/sun/facts/ and https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/rocket-thrust/
const SPACE_QUESTIONS={
'9-10':[
['Which star is closest to Earth?','The Sun','Sirius','The North Star','The Sun is our solar system’s star.'],
['Which planet do we live on?','Earth','Mars','Venus','Earth is our home planet.'],
['How many planets orbit our Sun?','8','6','10','Our solar system has eight planets. Pluto is a dwarf planet.'],
['Which planet is called the Red Planet?','Mars','Neptune','Saturn','Iron-rich dust gives Mars its reddish color.'],
['Which planet is the largest?','Jupiter','Earth','Mercury','Jupiter is the largest planet in our solar system.'],
['Which planet is famous for its bright rings?','Saturn','Mars','Venus','Saturn has a large, bright ring system made mostly of ice.'],
['What goes around Earth naturally?','The Moon','The Sun','Jupiter','The Moon is Earth’s natural satellite.'],
['What makes the Moon look bright?','Reflected sunlight','Its own fire','City lights','The Moon reflects light from the Sun.'],
['What pulls things toward Earth?','Gravity','Moonlight','Wind','Gravity pulls objects toward one another.'],
['What causes day and night on Earth?','Earth spinning','The Sun switching off','The Moon hiding the Sun','Earth spins, bringing different places into sunlight.'],
['About how long is one Earth day?','24 hours','7 hours','365 hours','Earth takes about 24 hours to spin once.'],
['About how long does Earth take to orbit the Sun?','1 year','1 day','1 week','One trip around the Sun takes about one year.'],
['Which planet is closest to the Sun?','Mercury','Earth','Neptune','Mercury has the closest orbit to the Sun.'],
['Which planet is farthest from the Sun?','Neptune','Mars','Venus','Neptune is the outermost of the eight planets.'],
['What helps astronauts breathe outside a spacecraft?','A spacesuit’s oxygen supply','A sun hat','An umbrella','A spacesuit supplies oxygen and protects the astronaut.'],
['Which tool helps us see distant planets?','A telescope','A thermometer','A compass','A telescope gathers light from distant objects.'],
['What is the Sun?','A star','A rocky planet','A moon','The Sun is a star: a huge ball of hot gas.'],
['What do we call a path around a planet or star?','An orbit','A crater','A cloud','An orbit is the curved path one object follows around another.'],
['What covers much of Earth’s surface?','Liquid water','Lava','Ice rings','Oceans cover most of Earth’s surface.'],
['A rocket blows gas downward. Which way does the thrust push it?','Upward','Downward','Nowhere','Pushing exhaust down pushes the rocket up in the opposite direction.']
],
'11-12':[
['Why can a rocket produce thrust in the vacuum of space?','It pushes exhaust backward','It pushes against air','It pulls on nearby stars','Expelling mass backward pushes the rocket forward, even without air.'],
['Which force keeps planets in orbit around the Sun?','Gravity','Air resistance','Magnetism alone','Gravity pulls planets toward the Sun while they move along their orbits.'],
['Why do astronauts in orbit appear weightless?','They and their spacecraft are falling together','There is no gravity there','They have no mass','Orbit is continuous free fall around Earth. Gravity is still present.'],
['What is the main cause of Earth’s seasons?','Its tilted axis as it orbits the Sun','Earth’s changing distance alone','The Moon’s shadow','Earth’s tilt changes sunlight angle and day length during its orbit.'],
['Why do we see different Moon phases?','We see different amounts of its sunlit half','Earth’s shadow covers it every week','The Moon changes shape','As the Moon orbits Earth, we see different portions of its illuminated half.'],
['What is a light-year a measure of?','Distance','Time','Brightness','A light-year is how far light travels in one year.'],
['What powers the Sun?','Nuclear fusion in its core','Burning wood','Reflected starlight','Fusion combines hydrogen nuclei into helium, releasing energy.'],
['Which planet is hottest on average at its surface?','Venus','Mercury','Mars','Venus’s thick atmosphere traps heat in a powerful greenhouse effect.'],
['Where is the main asteroid belt?','Between Mars and Jupiter','Between Earth and Venus','Beyond every planet','Most main-belt asteroids orbit between Mars and Jupiter.'],
['Why does Mars look reddish?','Iron minerals in its dust have oxidized','It is covered in fire','It reflects only red stars','Oxidized iron in Martian dust gives it a rusty reddish appearance.'],
['Which planets are ice giants?','Uranus and Neptune','Earth and Mars','Jupiter and Mercury','Uranus and Neptune are called ice giants because of their composition.'],
['What causes a solar eclipse?','The Moon passes between Earth and the Sun','Earth passes between the Sun and Moon','Mars blocks sunlight','During a solar eclipse, the Moon blocks our view of part or all of the Sun.'],
['What causes a lunar eclipse?','The Moon passes through Earth’s shadow','The Sun passes behind Jupiter','The Moon stops reflecting forever','Earth lies between the Sun and Moon, casting its shadow on the Moon.'],
['Why can’t sound travel through empty space?','There is no material to carry its vibrations','It moves too slowly','Gravity stops it','Sound needs a medium such as gas, liquid, or a solid.'],
['A probe travels 12 km each second. How far in 5 seconds?','60 km','17 km','120 km','Distance = speed × time, so 12 × 5 = 60 km.'],
['A fuel tank is 3/4 full. A launch uses 1/4 of the whole tank. What remains?','1/2 of the tank','1/4 of the tank','A full tank','Subtract equal fractions: 3/4 − 1/4 = 2/4 = 1/2.'],
['A signal takes 8 minutes each way. How long for a reply with no delay?','16 minutes','8 minutes','64 minutes','The signal goes out and back: 8 + 8 = 16 minutes.'],
['Which change would increase a rocket’s acceleration at the same net force?','Reducing its mass','Increasing its mass','Making its window larger','Newton’s second law gives acceleration = net force ÷ mass.'],
['What protects a returning capsule from intense re-entry heating?','A heat shield','A solar panel','A radio antenna','A heat shield handles the intense heating during atmospheric re-entry.'],
['What mainly makes a comet’s tail point away from the Sun?','Solar radiation and the solar wind','The comet’s north pole','Earth’s gravity alone','Sunlight and solar wind drive comet material generally away from the Sun.']
]};
function rocketAccess(){return currentProfile().rocketPass===true;}
function nearSpaceSite(){
if(rocketSession||boating||swimming||surfSession||windsurfSession||dragonFlight||wakeboardRide||volleyball||frisbeeGame||voyage||fishingActive||shoreRecovery||shoreClimb||beachTransfer||wakeboardCrash)return -1;
if(state.boatIsland!=='moonstone'||!inside(player.x,player.y,islandPolys[locations.length+6]))return -1;
if(Math.hypot(player.x-SPACE_MUSEUM.x,player.y-SPACE_MUSEUM.y)<37)return 108;
if(Math.hypot(player.x-ROCKET_BASE.x,player.y-ROCKET_BASE.y)<42)return 107;
return -1;
}
function openSpaceMuseum(){
if(nearSpaceSite()!==108)return;
keys.clear();closeMapPanel();museumQuestion=(state.spaceQuestionIndex||0)%20;museumAnswered=false;
renderSpaceQuestion();$('#spaceMuseum').showModal();
}
function renderSpaceQuestion(){
const q=SPACE_QUESTIONS[ageLevel][museumQuestion],rotation=museumQuestion%3;
$('#spaceQuestionTitle').textContent=q[0];
$('#spaceMuseumProgress').textContent=`Ages ${ageLevel.replace('-','–')} · Exhibit ${museumQuestion+1} / 20 · Launch fuel: ${currentProfile().rocketFuel||0}`;
$('#spaceAnswers').innerHTML=[0,1,2].map(i=>{const choice=(i+rotation)%3;return `<button id="spaceAnswer${i}" type="button">${escapeHTML(q[choice+1])}</button>`;}).join('');
for(let i=0;i<3;i++)$('#spaceAnswer'+i).onclick=()=>answerSpaceQuestion((i+rotation)%3);
$('#spaceFeedback').textContent='Each correct answer earns fuel for one launch and restores 50 energy. You can revisit all 20 exhibits.';
$('#spaceNext').hidden=true;
}
function answerSpaceQuestion(choice){
if(!$('#spaceMuseum').open||museumAnswered)return;
const q=SPACE_QUESTIONS[ageLevel][museumQuestion];
if(choice!==0){$('#spaceFeedback').textContent='Try again! Think about what you have seen in the sky or learned about space.';return;}
museumAnswered=true;currentProfile().rocketFuel=Math.min(999,(currentProfile().rocketFuel||0)+1);state.spaceQuestionIndex=(museumQuestion+1)%20;
restorePower();update();$('#spaceFeedback').textContent=`Correct! ${q[4]} +1 launch fuel. Fuel ready: ${currentProfile().rocketFuel}.`;
$('#spaceNext').hidden=false;$('#spaceNext').focus();
}
function nextSpaceQuestion(){if(!museumAnswered)return;museumQuestion=state.spaceQuestionIndex;museumAnswered=false;renderSpaceQuestion();$('#spaceAnswer0').focus();}
function useRocket(){
if(nearSpaceSite()!==107)return;
if(rocketRepair){toast('The crew is rebuilding your rocket. Watch them work!');return;}
if(!rocketAccess()){
if(state.crystals<ROCKET_PRICE){toast('Permanent rocket ticket: 250 crystals. Earn fuel at the nearby Space Museum.');return;}
state.crystals-=ROCKET_PRICE;currentProfile().rocketPass=true;update();toast('Permanent rocket ticket purchased! Answer museum questions to earn launch fuel.');return;
}
if(!(currentProfile().rocketFuel>0)){toast('Visit the nearby Space Museum to earn rocket fuel.');return;}
if(!requireActivityPower())return;
closeMapPanel();keys.clear();rocketSplash=null;
rocketSession={phase:'boarding',elapsed:0,clock:0,launch:0,yaw:0,pitch:0,distance:0,safe:{...ROCKET_SAFE}};
player.x=ROCKET_SAFE.x;player.y=ROCKET_SAFE.y;save();updateRocketControls();canvas.focus({preventScroll:true});
}
function rocketPhase(phase){rocketSession.phase=phase;rocketSession.elapsed=0;updateRocketControls();}
function returnRocket(){
if(!rocketSession||!['ready','space'].includes(rocketSession.phase))return;
keys.clear();
if(rocketSession.phase==='ready'){resetRocket(false);save();return;}
rocketPhase('return');toast('Return to island commanded. Autopilot is pointing us toward Earth.');
}
function resetRocket(clearEffects=true){
rocketSession=null;rocketRecovery=false;setRocketUI(false);if(clearEffects){rocketRepair=null;rocketSplash=null;}
museumQuestion=null;museumAnswered=false;
if($('#spaceMuseum').open)$('#spaceMuseum').close();
$('#rocketControls').hidden=true;keys.delete(' ');
}
function crashRocket(){
rocketSession=null;setRocketUI(false);player.x=ROCKET_SAFE.x-65;player.y=ROCKET_SAFE.y+8;
rocketRepair={elapsed:0,blast:createBoatBlast({...ROCKET_BASE,heading:-Math.PI/2,vessel:'rocket'})};
rocketRepair.blast.elapsed=BOAT_IGNITION_DURATION;keys.clear();$('#rocketControls').hidden=true;
save();toast('Safe evacuation! The rocket exploded. A crew is arriving to rebuild it for free.');
}
function beginRocketEgress(){
rocketSplash={x:ROCKET_BASE.x+100,y:ROCKET_BASE.y+50,elapsed:0};player.x=rocketSplash.x;player.y=rocketSplash.y;rocketPhase('egress');
}
function finishRocketSplash(){
rocketSession=null;rocketRecovery=true;setRocketUI(false);
player.x=rocketSplash.x+13;player.y=rocketSplash.y+8;swimming=true;boating=false;diveAnimation=null;shoreClimb=null;
state.boatIsland='moonstone';resetSwimMotion();keys.clear();
waterEntrySplash={x:rocketSplash.x,y:rocketSplash.y,elapsed:0,owner:profileId,level:ageLevel,scale:2};
$('#rocketControls').hidden=true;save();updateWaterControls();toast('Splashdown! Hatch open. Swim back to Moonstone Island or your boat.');
}
function advanceRocket(dt){
if(dt<=0||document.querySelector('dialog[open]'))return;
if(rocketSplash){rocketSplash.elapsed+=dt;if(rocketSplash.elapsed>12000)rocketSplash=null;}
if(rocketRepair){rocketRepair.elapsed+=dt;rocketRepair.blast.elapsed+=dt;if(rocketRepair.elapsed>=22000){rocketRepair=null;toast('Rocket rebuilt! Your permanent ticket is still valid.');}}
if(rocketRecovery&&!swimming&&!shoreClimb)rocketRecovery=false;
const s=rocketSession;if(!s)return;s.elapsed+=dt;s.clock+=dt;
if(s.phase==='boarding'){if(s.elapsed>=2200)rocketPhase('ready');}
else if(s.phase==='ready'){
if(keys.has(' ')){
if(!hasSwimPower()){toast('Visit the museum to recharge before launching.');return;}
if(!(currentProfile().rocketFuel>0))return;
currentProfile().rocketFuel--;rocketPhase('launch');save();
}
}
else if(s.phase==='launch'){
if(!keys.has(' ')){rocketPhase('fall');toast('Thrust lost! Falling back. Emergency escape ready.');}
else{s.launch=Math.min(1,s.elapsed/ROCKET_LAUNCH_MS);if(s.elapsed>=ROCKET_LAUNCH_MS){rocketPhase('space');keys.delete(' ');toast('Orbit reached! Use arrows to explore. R returns to the island.');}}
}
else if(s.phase==='fall'){s.launch=Math.max(0,s.launch-dt/2400);if(s.elapsed>=2400||s.launch===0)crashRocket();}
else if(s.phase==='space'){
const x=(keys.has('arrowright')||keys.has('d')||keys.has('right')?1:0)-(keys.has('arrowleft')||keys.has('a')||keys.has('left')?1:0);
const y=(keys.has('arrowdown')||keys.has('s')||keys.has('down')?1:0)-(keys.has('arrowup')||keys.has('w')||keys.has('up')?1:0);
s.yaw+=x*dt*.00038;s.pitch=Math.max(-.9,Math.min(.9,s.pitch+y*dt*.0003));s.distance+=dt*.025;
}
else if(s.phase==='return'&&s.elapsed>=7000)rocketPhase('reentry');
else if(s.phase==='reentry'&&s.elapsed>=4500)rocketPhase('splash');
else if(s.phase==='splash'&&s.elapsed>=3200)beginRocketEgress();
else if(s.phase==='egress'&&s.elapsed>=1800)finishRocketSplash();
if(rocketSession)updateRocketControls();
}
function setRocketUI(active){
const stage=$('.map-stage');stage.setAttribute('data-rocket-view',active?'flight':'');
for(const selector of ['.map-icon-rail','.map-corner-icons','.map-suggestions'])$(selector).inert=active;
}
function updateRocketControls(){
const s=rocketSession;setRocketUI(!!s);$('#rocketControls').hidden=!s;if(!s)return;
$('#rocketLaunch').hidden=!['ready','launch'].includes(s.phase);
$('#rocketReturn').hidden=!['ready','space'].includes(s.phase);
$('#rocketReturn').textContent=s.phase==='ready'?'Climb down · R':'Return to island · R';
const text={boarding:'Climbing the boarding ladder…',ready:'Captain’s chair · Hold Space for 10 seconds to launch',launch:`Hold Space! Launch ${Math.floor(s.launch*100)}% · releasing causes a crash`,space:'Arrow keys steer · R commands return to island',fall:'Thrust lost · emergency escape armed',return:'Return commanded · autopilot turning toward Earth',reentry:'Heat shield active · descending to the sea',splash:'Splashdown · opening the hatch…',egress:'Hatch open · climbing out into the sea…'}[s.phase];
if($('#rocketStatus').textContent!==text)$('#rocketStatus').textContent=text;
}
function rocketKey(e){
if(!rocketSession||document.querySelector('dialog[open]')||['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName))return false;
const k=e.key.toLowerCase();e.preventDefault();
if([' ','arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(k))keys.add(k);
if(['r','escape'].includes(k)&&!e.repeat)returnRocket();return true;
}
function initRocket(){
$('#spaceNext').onclick=nextSpaceQuestion;
$('#spaceMuseumClose').onclick=()=>{$('#spaceMuseum').close();keys.clear();canvas.focus({preventScroll:true});};
const b=$('#rocketLaunch');b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(' ');};b.onpointerup=b.onpointercancel=()=>keys.delete(' ');
$('#rocketReturn').onclick=()=>{returnRocket();canvas.focus({preventScroll:true});};
}
function rocketArt(x,y,scale=1,build=1){
ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
rect(-23,0,46,8,'#3f5365');rect(-28,7,56,4,'#aab4bd');
ctx.save();ctx.beginPath();ctx.rect(-35,-92*build,70,92*build+1);ctx.clip();
polygon([[-12,0],[-12,-49],[0,-76],[12,-49],[12,0]],'#e6e8df');
polygon([[0,-76],[12,-49],[-12,-49]],'#dc7355');rect(5,-48,7,44,'#a9bec7');
polygon([[-12,-21],[-23,0],[-9,-4]],'#db7155');polygon([[12,-21],[23,0],[9,-4]],'#db7155');
ellipse(0,-39,7,8,'#344b60');ellipse(0,-40,4.5,5.5,'#8cd7dd');rect(-9,-14,18,6,'#dc7355');rect(-7,-2,14,5,'#243747');
ctx.restore();ctx.restore();
}
function drawRocketWorld(){
if(!islandInView(boatIslands[6]))return;
const {x,y}=ROCKET_BASE;
// Museum on the west, gantry and launchpad on the east.
rect(SPACE_MUSEUM.x-30,SPACE_MUSEUM.y-30,60,38,'#e2ddc6');polygon([[SPACE_MUSEUM.x-34,SPACE_MUSEUM.y-30],[SPACE_MUSEUM.x,SPACE_MUSEUM.y-49],[SPACE_MUSEUM.x+34,SPACE_MUSEUM.y-30]],'#49647c');
rect(SPACE_MUSEUM.x-7,SPACE_MUSEUM.y-13,14,21,'#364e64');
for(const dx of [-22,15]){rect(SPACE_MUSEUM.x+dx,SPACE_MUSEUM.y-21,9,12,'#83c7d6');}
ctx.textAlign='center';ctx.font='bold 6px monospace';ctx.fillStyle='#fff1c5';ctx.fillText('SPACE MUSEUM',SPACE_MUSEUM.x,SPACE_MUSEUM.y-34);
rect(x+21,y-79,6,86,'#637a88');for(let h=0;h<8;h++){rect(x+21,y-h*10,20,2,'#aac0c5');}
rect(x-25,y+9,71,9,'#66757d');rect(x+26,y-45,14,2,'#d9cf9c');
for(const dx of [28,37])rect(x+dx,y-45,2,62,'#dbcb9b');for(let h=0;h<10;h++)rect(x+28,y-42+h*6,11,1,'#dbcb9b');
const repair=rocketRepair,build=repair?Math.max(0,Math.min(1,(repair.elapsed-10000)/12000)):1;
if(!repair||repair.elapsed>10000)rocketArt(x,y,1,build);
if(repair){
if(repair.elapsed<10000){
// Use the shared explosion artwork, with an independent rocket repair clock.
drawBoatExplosions([repair.blast]);
}
for(let i=0;i<2;i++){const progress=Math.min(1,Math.max(0,(repair.elapsed-1500)/3000)),wx=x-75+progress*(i?88:42);drawBoatRepairWorker(wx,y+13+i*5,{workerPose:progress<1?'walk':'work'},repair.elapsed,i);}
ctx.fillStyle='#354c60';ctx.font='6px monospace';ctx.fillText('CREW REBUILDING',x,y+33);
}
if(rocketSession?.phase==='boarding'){
const p=Math.min(1,rocketSession.elapsed/2200);character(x+33,y+15-p*58);
}
ctx.font='6px monospace';ctx.fillStyle='#284b53';ctx.fillText('LAUNCH · 250 ◆ TICKET',x,y+27);
}
function drawRocketSplash(){
if(!rocketSplash)return;const {x,y,elapsed}=rocketSplash;ctx.save();ctx.translate(x,y);ctx.rotate(.22);
polygon([[-17,0],[-12,-16],[0,-26],[12,-16],[17,0]],'#e4e6dc');rect(-18,0,36,4,'#d67653');
const p=rocketSession?.phase==='egress'?Math.min(1,rocketSession.elapsed/1800):1;
ctx.save();ctx.translate(-6,-14);ctx.rotate(-p*1.8);rect(-7,-3,14,5,'#627c89');ctx.restore();ellipse(0,5,26,4,'#c3e9df77');ctx.restore();
if(rocketSession?.phase==='egress'){const hop=Math.sin(p*Math.PI)*12;character(x+13*p,y-6-hop+14*p);}
}
function cockpitText(text,x,y,size=8,color='#dce9dd'){ctx.font=`${size}px monospace`;ctx.fillStyle=color;ctx.textAlign='center';ctx.fillText(text,x,y);}
function drawRocketGame(){
const s=rocketSession,w=WORLD.viewWidth,h=WORLD.viewHeight;
if(['boarding','egress'].includes(s.phase))return false;
ctx.save();ctx.scale(w/480,h/300);
const launch=s.phase==='ready'?0:s.phase==='launch'||s.phase==='fall'?s.launch:1;
const entry=s.phase==='reentry'?Math.min(1,s.elapsed/4500):s.phase==='splash'?1:0;
const darkness=Math.max(0,Math.min(1,launch*1.45-.28))*(1-entry);
rect(0,0,480,300,'#101e30');
ctx.save();
const jitter=['launch','fall','reentry'].includes(s.phase)?Math.sin(s.clock*.09)*1.9:Math.sin(s.clock*.001)*.25;
ctx.translate(jitter,Math.cos(s.clock*.067)*Math.abs(jitter)*.6);
polygon([[30,36],[450,36],[420,208],[60,208]],'#577b91');
ctx.save();ctx.beginPath();ctx.moveTo(39,43);ctx.lineTo(441,43);ctx.lineTo(411,199);ctx.lineTo(69,199);ctx.closePath();ctx.clip();
const sky=ctx.createLinearGradient(0,40,0,205);sky.addColorStop(0,`rgb(${Math.round(76*(1-darkness)+5*darkness)},${Math.round(165*(1-darkness)+9*darkness)},${Math.round(220*(1-darkness)+27*darkness)})`);sky.addColorStop(1,`rgb(${Math.round(161*(1-darkness)+12*darkness)},${Math.round(215*(1-darkness)+18*darkness)},${Math.round(238*(1-darkness)+43*darkness)})`);ctx.fillStyle=sky;ctx.fillRect(0,0,480,215);
if(darkness<.8&&s.phase!=='splash'){
ctx.globalAlpha=1-darkness;
for(let i=0;i<3;i++){const bx=((s.clock*.022+i*143)%580)-50,by=95+i*25+s.launch*90;ctx.strokeStyle='#355b73';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(bx-6,by);ctx.quadraticCurveTo(bx-3,by-4-Math.sin(s.clock*.01+i)*2,bx,by);ctx.quadraticCurveTo(bx+3,by-4,bx+6,by);ctx.stroke();}ctx.globalAlpha=1;
}
ctx.globalAlpha=darkness;
for(let i=0;i<150;i++){const sx=((i*97.31-s.yaw*220)%440+440)%440+20,sy=((i*i*7.71-s.pitch*100+s.distance*(i%3+1)*.07)%180+180)%180+30;rect(sx,sy,i%9===0?1.7:1,i%9===0?1.7:1,i%5?'#e0e7f1':'#91b9e5');}
const bodies=[['SUN',-.95,-.23,23,'#ffc668'],['MERCURY',-.56,.12,5,'#a49a8c'],['VENUS',-.25,-.35,10,'#dfb481'],['MOON',.08,.06,18,'#bcc8cf'],['MARS',.48,-.12,13,'#c27555'],['JUPITER',.98,.2,30,'#d6b38f'],['SATURN',1.65,-.3,22,'#d2c692'],['URANUS',2.3,.1,16,'#89cdd0'],['NEPTUNE',-2.2,.3,16,'#4e78ce']];
if(['space','return','reentry'].includes(s.phase))for(const [name,angle,height,r,color] of bodies){
const a=Math.atan2(Math.sin(angle-s.yaw),Math.cos(angle-s.yaw));if(Math.abs(a)>1.5)continue;
const bx=240+a*175,by=115+(height-s.pitch)*100,near=1+.07*Math.sin(s.distance*.001+angle);ellipse(bx,by,r*near,r*near,color);
if(name==='SATURN'){ctx.strokeStyle='#e4d6ac';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(bx,by,r*1.7,r*.36,-.28,0,Math.PI*2);ctx.stroke();}
if(name==='MOON')for(let c=0;c<6;c++)ellipse(bx-9+(c*9)%20,by-9+(c*7)%20,2+c%2,2,'#8795a1');
if(name==='JUPITER')for(let b=-2;b<=2;b++)rect(bx-r*.75,by+b*8,r*1.5,2,'#b58569');
cockpitText(name,bx,by+r+10,5,'#aabfcd');}
ctx.globalAlpha=1;
if(s.phase==='return'||s.phase==='reentry'){
const t=s.phase==='return'?Math.min(1,s.elapsed/7000):1,p=t*t*(3-2*t),radius=s.phase==='reentry'?80+s.elapsed*.045:14+p*65;
const ex=425-p*185,ey=70+p*45;ellipse(ex,ey,radius,radius,'#64c6e5');ellipse(ex,ey,radius*.94,radius*.94,'#337fc0');
polygon([[ex-radius*.55,ey-radius*.45],[ex-radius*.1,ey-radius*.6],[ex+radius*.25,ey-radius*.15],[ex,ey+radius*.15],[ex-radius*.3,ey]],'#7daf78');ellipse(ex+radius*.3,ey+radius*.35,radius*.22,radius*.3,'#80b480');cockpitText('EARTH · HOME',ex,ey-radius-8,7);
}
if(entry>0){ctx.globalAlpha=entry;rect(0,160,480,45,'#62aebd');for(let i=0;i<14;i++)rect((i*47+s.clock*.02)%480,177+(i%4)*7,22,1,'#c6e8db');ctx.globalAlpha=1;}
if(s.phase==='splash'){rect(0,65,480,105,'#91cde1');rect(0,170,480,40,'#4d9aaa');for(let i=0;i<30;i++)ellipse((i*47)%480,192+Math.sin(s.clock*.005+i)*7,4,8,'#dbf4e4');}
ctx.restore();
// Window ribs, fasteners, instrument deck, screens, switches and flight stick.
for(const x of [24,446]){polygon([[x,29],[x+10,29],[x+(x<200?43:-25),210],[x+(x<200?32:-35),210]],'#26384c');}
rect(28,26,424,12,'#24364b');for(let x=40;x<450;x+=23)rect(x,30,2,2,'#91a7af');
polygon([[58,202],[422,202],[475,300],[5,300]],'#344658');polygon([[72,210],[408,210],[430,264],[50,264]],'#516275');
for(const [x,label,value] of [[81,'ALTITUDE',`${Math.round(launch*120*(1-entry))} KM`],[190,'FLIGHT',s.phase.toUpperCase()],[310,'ENERGY',`${Math.ceil(state.power)}%`]]){
rect(x-8,219,93,33,'#172c3c');rect(x-5,222,87,27,'#203b46');cockpitText(label,x+38,230,5,'#86a7ad');cockpitText(value,x+38,243,8,'#a9e2c6');}
for(let i=0;i<16;i++){rect(54+i*23,271,10,5,i%4===0?'#df8b5d':i%3===0?'#7bc5bd':'#869b9d');rect(57+i*23,267,3,6,'#c6d0c9');}
ellipse(240,281,21,8,'#203144');rect(236,259,8,22,'#1c2c3a');ellipse(240,258,12,4,'#c5c7b6');
rect(358,253,45,13,s.phase==='return'?'#bd7155':'#456576');cockpitText('HOME',380,262,6,'#e4ecd9');
if(s.phase==='return'&&s.elapsed<1500){const press=Math.sin(Math.min(1,s.elapsed/1500)*Math.PI);polygon([[415,300],[431,290],[385,256+press*6],[376,258+press*6]],'#efc698');ellipse(381,257+press*6,5,3,'#f3d3aa');}
cockpitText('SKYSEED  /  EXPLORER ONE',240,18,8,'#b9c8cc');
if(s.phase==='splash'){const open=Math.max(0,(s.elapsed-1100)/2100);rect(0,0,480,300*open,'#b7dbe0');cockpitText('HATCH OPENING · PREPARE TO SWIM',240,145,10,'#24495b');}
ctx.restore();ctx.restore();return true;
}
