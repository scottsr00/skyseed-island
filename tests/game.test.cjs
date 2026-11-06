const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
function game(saved,stored,renderTools=false){const nodes=new Map(),storage=new Map(stored?Object.entries(stored):saved?[["skyseed-v1",JSON.stringify(saved)]]:[]);const element=()=>({value:'',innerHTML:'',textContent:'',style:{},classList:{add(){},remove(){}},setAttribute(){},addEventListener(){},focus(){},showModal(){this.open=true;},close(){this.open=false;},getContext(){return new Proxy({},{get:()=>()=>{}});}});const node=s=>{if(!nodes.has(s))nodes.set(s,element());return nodes.get(s);};const c=vm.createContext({document:{querySelector:s=>s==='dialog[open]'?([...nodes.entries()].find(([key,n])=>['#challenge','#journal','#welcome','#ferry','#stash','#sponsorship','#flash','#resetConfirm','#timesTables'].includes(key)&&n.open)?.[1]||null):node(s),querySelectorAll:()=>[],addEventListener(){}},window:{addEventListener(){}},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},console,confirm:()=>true});vm.runInContext(fs.readFileSync('dist/app.js','utf8'),c);if(!renderTools)vm.runInContext('renderTool=()=>{}',c);return {run:s=>vm.runInContext(s,c),node,snapshot:()=>Object.fromEntries(storage)};}
test('all 100 challenges award once; upgrades cost 60; companion hatches',()=>{const g=game();for(let i=0;i<100;i++){g.run(`openQuestion(${i})`);g.node('#answer').value=g.run(`Array.isArray(questions[${i}].answer)?questions[${i}].answer.join(','):String(questions[${i}].answer)`);g.run('checkAnswer()');}assert.equal(g.run('state.solved.length'),100);assert.equal(g.run('state.crystals'),500);assert.equal(g.node('#petTitle').textContent,'Meet Sprout!');g.run('openQuestion(0)');g.node('#answer').value='252';g.run('checkAnswer()');assert.equal(g.run('state.crystals'),505);g.run("buy('cottage');buy('garden');buy('bridge')");assert.equal(g.run('state.crystals'),445);assert.equal(g.run('state.upgrades.length'),3);g.run("buy('bridge')");assert.equal(g.run('state.crystals'),445);});
test('wrong answers, equivalent fractions, percentages, ordered pairs',()=>{const g=game();g.run('openQuestion(4)');g.node('#answer').value='3/4';g.run('checkAnswer()');assert.equal(g.run('state.crystals'),0);g.node('#answer').value='14/16';g.run('checkAnswer()');assert.equal(g.run('state.crystals'),5);assert.equal(g.run("parseNumber('62%')"),.62);assert.equal(g.run("parseNumber('−4')"),-4);assert.ok(Number.isNaN(g.run("parseNumber('1/0')")));g.run('openQuestion(17)');g.node('#answer').value='30,54';g.run('checkAnswer()');assert.equal(g.run('state.solved.length'),1);g.node('#answer').value='54,30';g.run('checkAnswer()');assert.equal(g.run('state.solved.length'),2);});
test('ferry ticket gates the fifth island and includes return journeys',()=>{
const g=game();g.run('visit(4)');assert.equal(g.run('active'),0);assert.equal(g.node('#ferry').hidden,false);
g.run('buyFerryTicket()');assert.equal(g.run('state.ferryTicket'),false);
g.run('state.crystals=75;state.earnedCrystals=75;buyFerryTicket()');assert.equal(g.run('state.crystals'),25);assert.equal(g.run('state.earnedCrystals'),75);
g.run('buyFerryTicket()');assert.equal(g.run('state.crystals'),25);
g.run('boardFerry();advanceVoyage(1800)');assert.equal(g.run('voyage!==null'),true);
g.run('save()');assert.equal(g.run('state.x'),217);
g.run('advanceVoyage(1800)');assert.equal(g.run('voyage'),null);assert.equal(g.run('canWalk(player.x,player.y)'),true);
g.run('visit(4)');assert.equal(g.run('active'),16);
g.run('openFerry();boardFerry();advanceVoyage(3500)');assert.equal(g.run('player.x'),217);assert.equal(g.run('canWalk(player.x,player.y)'),true);assert.equal(g.run('state.crystals'),25);
assert.equal(g.run('JSON.parse(localStorage.getItem(KEY)).ferryTicket'),true);
});
test('canvas renders without exceptions',()=>{const g=game();g.run('draw();state.solved=[0,1,2,3,4,5,6,7];state.upgrades=["cottage","garden","bridge"];draw()');});
test('every destination places the explorer on walkable land',()=>{const g=game();for(let i=0;i<4;i++){g.run(`visit(${i})`);assert.equal(g.run('canWalk(player.x,player.y)'),true,`destination ${i}`);}g.run('state.crystals=50;openFerry();buyFerryTicket();boardFerry();advanceVoyage(3500);visit(4)');assert.equal(g.run('canWalk(player.x,player.y)'),true);});

test('squishies unlock in order through lifetime earnings and survive spending and reload',()=>{
const g=game();
for(let i=0;i<20;i++){g.run(`openQuestion(${i})`);g.node('#answer').value=g.run(`String(questions[${i}].answer)`);g.run('checkAnswer()');}
assert.equal(g.run('earnedSquishies()'),2);
g.run("buy('cottage');buy('garden');buy('bridge')");
assert.equal(g.run('state.earnedCrystals'),100);
assert.equal(g.run('earnedSquishies()'),2);
for(let i=20;i<70;i++){g.run(`openQuestion(${i})`);g.node('#answer').value=g.run(`String(questions[${i}].answer)`);g.run('checkAnswer();checkAnswer()');}
assert.equal(g.run('state.earnedCrystals'),350);
assert.equal(g.run('earnedSquishies()'),7);
assert.match(g.node('#challengeBody').innerHTML,/NeeDoh Skull Cat/);
assert.match(g.node('#squishyProgress').textContent,/Classic NeeDoh/);
assert.equal(g.run('JSON.parse(localStorage.getItem(KEY)).earnedCrystals'),350);
assert.equal(g.run('squishies[1].detail'),'Pink glow-in-the-dark edition');
});
test('early repeat practice does not duplicate discovery rewards',()=>{
const g=game();for(let i=0;i<2;i++){g.run('openQuestion(0)');g.node('#answer').value='252';g.run('checkAnswer()');}
assert.equal(g.run('state.earnedCrystals'),5);assert.equal(g.run('state.crystals'),5);
});

test('100 unique questions are assigned exactly once across five destinations',()=>{
const g=game();assert.equal(g.run('questions.length'),100);
assert.equal(g.run('new Set(questions.map(q=>q.q)).size'),100);
assert.equal(g.run('locations.every(l=>l.ids.length===20)'),true);
assert.equal(g.run('new Set(locations.flatMap(l=>l.ids)).size'),100);
assert.equal(g.run('questions.every(q=>q.hint.length===3&&q.explain&&q.title)'),true);
g.run('journal()');assert.match(g.node('#journalList').innerHTML,/0 \/ 20/);
});
test('saved progress preserves both original and expanded question IDs',()=>{
const g=game({solved:[0,19,20,69,99,100,-1],upgrades:[],crystals:35});
assert.equal(g.run('JSON.stringify(state.solved)'), '[0,19,20,69,99]');
assert.equal(g.run('state.earnedCrystals'),25);
assert.match(g.node('#solvedCount').textContent,/5 of 100/);
});

test('ages 9–10 has 100 unique guided questions and every answer awards correctly',()=>{
const g=game();g.run("switchAge('9-10')");
assert.equal(g.run('questions.length'),100);
assert.equal(g.run('new Set(questions.map(q=>q.q)).size'),100);
assert.equal(g.run('questions.every(q=>q.kind==="guided"&&q.hint.length===3&&q.steps.length===3&&Number.isFinite(q.answer))'),true);
for(let i=0;i<100;i++){
g.run(`openQuestion(${i})`);g.node('#answer').value='999999';g.run('checkAnswer()');assert.equal(g.run('state.solved.length'),i);
g.node('#answer').value=g.run(`String(questions[${i}].answer)`);g.run('checkAnswer();checkAnswer()');assert.equal(g.run('state.solved.length'),i+1);
}
assert.equal(g.run('state.crystals'),500);assert.equal(g.run('earnedSquishies()'),10);
assert.match(g.node('#challengeBody').innerHTML,/All 100 discoveries/);
});
test('age switching preserves independent rewards, progress, upgrades, and stash',()=>{
const g=game({solved:[0,1,2,3,4,5,6,7,8,9],upgrades:['cottage'],crystals:35,earnedCrystals:50});
g.run("switchAge('9-10')");assert.equal(g.run('state.crystals'),0);assert.equal(g.run('earnedSquishies()'),0);
g.run('openQuestion(0)');g.node('#answer').value=g.run('String(questions[0].answer)');g.run('checkAnswer()');
g.run("switchAge('11-12')");assert.equal(g.run('state.solved.length'),10);assert.equal(g.run('state.crystals'),35);assert.equal(g.run('earnedSquishies()'),1);assert.equal(g.run('state.upgrades[0]'),'cottage');
g.run("switchAge('9-10')");assert.equal(g.run('state.solved.length'),1);assert.equal(g.run('state.crystals'),5);assert.equal(g.run('localStorage.getItem("skyseed-age")'),'9-10');
g.run("switchAge('invalid')");assert.equal(g.run('ageLevel'),'9-10');
});

test('world is four times the area with five islands and a ticket-only final island',()=>{
const g=game();assert.equal(g.run('WORLD.width*WORLD.height'),480*300*4);assert.equal(g.run('islandPolys.length'),5);
assert.equal(g.run('canWalk(740,483)'),false);g.run('state.ferryTicket=true');assert.equal(g.run('canWalk(740,483)'),true);
assert.equal(g.run('canWalk(600,350)'),false);
// Trace continuous routes from the main island to each of the first three satellites.
for(let x=310;x<=760;x+=2)assert.equal(g.run(`canWalk(${x},162)`),true,`east route ${x}`);
for(let y=230;y<=350;y+=2)assert.equal(g.run(`canWalk(232,${y})`),true,`south route ${y}`);
g.run('player.x=740;player.y=483;draw()');assert.equal(g.run('camera.x'),480);assert.equal(g.run('camera.y'),300);
});

test('fishing purchases charge the right prices and give exactly five attempts',()=>{
const g=game();g.run('openFishing();buyRod();buyLure()');assert.equal(g.run('state.bait'),0);assert.equal(g.run('state.fishingLure'),false);
g.run('state.crystals=50;state.earnedCrystals=50;buyRod();buyRod()');assert.equal(g.run('state.crystals'),45);assert.equal(g.run('state.bait'),5);assert.equal(g.run('canWalk(player.x,player.y)'),true);
for(let i=0;i<5;i++)g.run('castFishing(10,40);castFishing(10,40);advanceFishing(FISH_CAST_DURATION)');
assert.equal(g.run('state.bait'),0);assert.equal(g.run('Object.values(state.catches).reduce((a,b)=>a+b,0)'),0);
g.run('castFishing(10,40)');assert.equal(g.run('pendingCast'),null);
g.run('buyRod();buyLure();buyLure()');assert.equal(g.run('state.bait'),5);assert.equal(g.run('state.crystals'),20);assert.equal(g.run('state.earnedCrystals'),50);assert.equal(g.run('state.fishingLure'),true);
});
test('aimed casts catch all six species and repeated catches increment saved badges',()=>{
const g=game();g.run('state.crystals=100;openFishing();buyRod()');
for(let i=0;i<3;i++)g.run(`{const fish=fishingTargets(fishingTime+FISH_CAST_DURATION)[${i}];castFishing(fish.x,fish.y);advanceFishing(FISH_CAST_DURATION);for(let r=0;r<6;r++){reelFishing();advanceFishing(180);}}`);
for(const id of ['barracuda','stingray','shark'])assert.equal(g.run(`state.catches.${id}`),1);
g.run('buyLure();fishSet="lure";updateFishing()');
for(let i=0;i<3;i++){if(i===2)g.run('buyRod()');g.run(`{const fish=fishingTargets(fishingTime+FISH_CAST_DURATION)[${i}];castFishing(fish.x,fish.y);advanceFishing(FISH_CAST_DURATION);for(let r=0;r<6;r++){reelFishing();advanceFishing(180);}}`);g.node('#sponsorship').close();}
for(const id of ['snook','octopus','marlin'])assert.equal(g.run(`state.catches.${id}`),1);
g.run('{const fish=fishingTargets(fishingTime+FISH_CAST_DURATION)[0];castFishing(fish.x,fish.y);advanceFishing(FISH_CAST_DURATION);for(let r=0;r<6;r++){reelFishing();advanceFishing(180);}}');assert.equal(g.run('state.catches.snook'),2);assert.match(g.node('#fishBadges').innerHTML,/Caught × 2/);
const saved=g.run('JSON.parse(localStorage.getItem(KEY))');const restored=game(saved);assert.equal(restored.run('state.catches.snook'),2);assert.equal(restored.run('state.fishingLure'),true);assert.equal(restored.run('state.bait'),0);
g.run("switchAge('9-10')");assert.equal(g.run('state.bait'),0);assert.equal(g.run('state.fishingLure'),false);assert.equal(g.run('state.catches.snook'),0);
g.run("switchAge('11-12')");assert.equal(g.run('state.catches.snook'),2);
});
test('hooked fish struggle and escape after exactly two seconds without reeling',()=>{
const g=game();g.run('state.crystals=5;openFishing();buyRod();{const f=fishingTargets(fishingTime+FISH_CAST_DURATION)[0];castFishing(f.x,f.y);advanceFishing(FISH_CAST_DURATION);}');
assert.equal(g.run('totalCatches()'),0);assert.equal(g.node('#reelFish').hidden,false);
const first=g.run('hookedFishingPose().fish.x');g.run('advanceFishing(150);draw()');assert.notEqual(g.run('hookedFishingPose().fish.x'),first);
g.run('advanceFishing(1849)');assert.equal(g.run('!!hookedFish'),true);
g.run('advanceFishing(1);reelFishing()');assert.equal(g.run('hookedFish'),null);assert.equal(g.run('totalCatches()'),0);assert.equal(g.node('#reelFish').hidden,true);assert.match(g.node('#fishingFeedback').textContent,/shook free/);
});
test('reeling resets the escape timer, bends the rod, and rewards only a landed fish',()=>{
const g=game();g.run('state.crystals=5;openFishing();buyRod();{const f=fishingTargets(fishingTime+FISH_CAST_DURATION)[0];castFishing(f.x,f.y);advanceFishing(FISH_CAST_DURATION);}advanceFishing(1900)');
const tip=g.run('hookedFishingPose().tip.y'),lean=g.run('hookedFishingPose().lean');
g.node('#reelFish').onclick();assert.ok(g.run('hookedFishingPose().tip.y')<tip);assert.ok(g.run('hookedFishingPose().lean')>lean);
const target=g.run('hookedFish.target');g.run('reelFishing()');assert.equal(g.run('hookedFish.target'),target);
g.run('advanceFishing(1800);draw()');assert.equal(g.run('!!hookedFish'),true);assert.equal(g.run('totalCatches()'),0);
g.run('for(let r=0;r<5;r++){reelFishing();advanceFishing(180);draw();}');assert.equal(g.run('hookedFish'),null);assert.equal(g.run('totalCatches()'),1);
g.run('reelFishing();advanceFishing(3000)');assert.equal(g.run('totalCatches()'),1);
});
test('stopping or switching profiles releases a hooked fish without a reward',()=>{
const g=game();
for(const end of ['stopFishing()','switchAge("9-10")']){
g.run('state.crystals=5;openFishing();buyRod();{const f=fishingTargets(fishingTime+FISH_CAST_DURATION)[0];castFishing(f.x,f.y);advanceFishing(FISH_CAST_DURATION);}');
assert.equal(g.run('!!hookedFish'),true);g.run(end);assert.equal(g.run('hookedFish'),null);assert.equal(g.run('totalCatches()'),0);
}
});
test('closing the fishing dock cancels the hook without granting a catch',()=>{
const g=game();g.run('state.crystals=5;openFishing();buyRod();castFishing(10,40);stopFishing();advanceFishing(FISH_CAST_DURATION)');assert.equal(g.run('state.bait'),4);assert.equal(g.run('pendingCast'),null);assert.equal(g.run('Object.values(state.catches).reduce((a,b)=>a+b,0)'),0);
});

test('fifth catch announces sponsorship once and unlocks unlimited bait',()=>{
const g=game();g.run('state.crystals=5;openFishing();buyRod()');
for(let i=0;i<5;i++){g.run('{const f=fishingTargets(fishingTime+FISH_CAST_DURATION)[0];castFishing(f.x,f.y);advanceFishing(FISH_CAST_DURATION);for(let r=0;r<6;r++){reelFishing();advanceFishing(180);}}');if(i<4)assert.equal(g.run('sponsored()'),false);}
assert.equal(g.run('sponsored()'),true);assert.equal(g.node('#sponsorship').open,true);assert.equal(g.node('#sponsorName').textContent,'Skyseed Angling Co.');assert.equal(g.run('state.bait'),0);
g.node('#sponsorship').close();
for(let i=0;i<8;i++)g.run('castFishing(10,40);advanceFishing(FISH_CAST_DURATION)');
assert.equal(g.run('state.bait'),0);assert.equal(g.run('state.crystals'),0);assert.equal(g.node('#sponsorship').open,false);assert.match(g.node('#baitCount').textContent,/Unlimited/);
g.run('buyRod()');assert.equal(g.run('state.crystals'),0);
const restored=game(g.run('JSON.parse(localStorage.getItem(KEY))'));assert.equal(restored.run('sponsored()'),true);assert.equal(restored.node('#sponsorship').open,undefined);
});
test('sponsored boat launches, supports fishing, and returns safely to the ferry dock',()=>{
const g=game();g.run('launchBoat()');assert.equal(g.run('boating'),false);
g.run('state.catches={barracuda:5};checkSponsorship();$("#sponsorship").close();openFerry();launchBoat()');assert.equal(g.run('boating'),true);assert.equal(g.run('canWalk(player.x,player.y)'),true);assert.equal(g.run('canWalk(218,170)'),false);
g.run('player.x=430;player.y=310;openFishing()');assert.equal(g.run('player.x'),430);assert.equal(g.run('player.y'),310);g.run('save();draw()');assert.equal(g.run('state.x'),217);assert.equal(g.run('state.y'),247);
g.run('returnBoat()');assert.equal(g.run('boating'),false);assert.equal(g.run('canWalk(player.x,player.y)'),true);
assert.equal(g.run('state.ferryTicket'),false);g.run('visit(4)');assert.equal(g.run('voyage'),null);
g.run("switchAge('9-10')");assert.equal(g.run('sponsored()'),false);
});
test('existing five-fish saves receive the sponsorship announcement',()=>{
const g=game({solved:[],upgrades:[],crystals:0,catches:{barracuda:3,stingray:2}});assert.equal(g.node('#sponsorship').open,true);assert.equal(g.run('state.sponsorshipAnnounced'),true);assert.equal(g.run('sponsored()'),true);
});

test('fishing uses the main map and stops cleanly without a popup',()=>{
const g=game();g.run('state.crystals=5;openFishing();buyRod()');
assert.equal(g.run('fishingActive'),true);assert.equal(g.node('#fishing').hidden,false);assert.equal(g.node('#fishing').open,undefined);
assert.equal(g.run('fishingTargets().every(f=>!islandPolys.some(p=>inside(f.x,f.y,p)))'),true);
g.run('{const f=fishingTargets(fishingTime+FISH_CAST_DURATION)[1];castFishing(f.x,f.y);advanceFishing(FISH_CAST_DURATION);for(let r=0;r<6;r++){reelFishing();advanceFishing(180);}draw();}');assert.equal(g.run('state.catches.stingray'),1);
g.run('castFishing(10,40);stopFishing();advanceFishing(FISH_CAST_DURATION)');assert.equal(g.run('pendingCast'),null);assert.equal(g.node('#fishing').hidden,true);
const html=fs.readFileSync('dist/index.html','utf8');assert.doesNotMatch(html,/<dialog id="fishing"/);assert.doesNotMatch(html,/id="fishingWater"/);assert.match(html,/<section id="fishing"/);
});

test('full-window map preserves proportions on desktop, portrait, and landscape screens',()=>{
const g=game();for(const [width,height] of [[1440,900],[390,844],[844,390],[2560,1080]]){
g.run(`window.innerWidth=${width};window.innerHeight=${height};window.devicePixelRatio=2;resizeMap()`);
assert.ok(Math.abs(g.run('WORLD.viewWidth/WORLD.viewHeight')-width/height)<.000001);
assert.equal(g.node('#world').width,width*2);assert.equal(g.node('#world').height,height*2);
assert.equal(g.run('WORLD.viewWidth<=WORLD.width&&WORLD.viewHeight<=WORLD.height'),true);
}
});
test('map menus hand off to activities and fishing clicks use the resized viewport',()=>{
const g=game();g.node('#settingsBtn').onclick();assert.equal(g.node('#settingsPanel').hidden,false);
g.node('#fishingBtn').onclick();assert.equal(g.node('#settingsPanel').hidden,true);assert.equal(g.run('fishingActive'),true);
g.run('window.innerWidth=390;window.innerHeight=844;resizeMap();state.crystals=5;buyRod()');
g.node('#world').getBoundingClientRect=()=>({left:0,top:0,width:390,height:844});
const point=g.run('({x:(10-camera.x)/WORLD.viewWidth*390,y:(40-camera.y)/WORLD.viewHeight*844})');
g.node('#world').onclick({clientX:point.x,clientY:point.y});assert.ok(Math.abs(g.run('pendingCast.x')-10)<.000001);assert.ok(Math.abs(g.run('pendingCast.y')-40)<.000001);
});

test('exit at the ferry dock steps onto walkable land without diving',()=>{
const g=game();g.run('state.catches={barracuda:5};launchBoat();exitBoat()');
assert.equal(g.run('boating'),false);assert.equal(g.run('swimming'),false);assert.equal(g.run('diveAnimation'),null);assert.equal(g.run('canWalk(player.x,player.y)'),true);assert.equal(g.node('#mapBoatExit').hidden,true);
});
test('offshore exit animates a dive, leaves the boat, and permits reboarding',()=>{
const g=game();g.run('state.catches={barracuda:5};launchBoat();player.x=430;player.y=310;openFishing();exitBoat()');
assert.equal(g.run('fishingActive'),false);assert.equal(g.run('boating'),false);assert.equal(g.run('swimming'),true);assert.equal(g.run('boatPosition.x'),430);assert.equal(g.run('diveAnimation!==null'),true);
g.run('advanceSwimming(350);draw()');assert.equal(g.run('diveAnimation.elapsed'),350);g.run('boardOwnBoat()');assert.equal(g.run('boating'),false);
g.run('advanceSwimming(350);draw()');assert.equal(g.run('diveAnimation'),null);assert.equal(g.run('canWalk(600,350)'),true);assert.match(g.node('#waterControls').textContent,/E beside your boat/);assert.equal(g.node('#mapBoatBoard').hidden,false);
g.run('boardOwnBoat()');assert.equal(g.run('boating'),true);assert.equal(g.run('swimming'),false);assert.equal(g.run('player.x'),430);assert.equal(g.run('player.y'),310);assert.match(g.node('#waterControls').textContent,/X or Exit boat/);
});
test('swimmers walk onto shore, preserve the final-island gate, and save safely',()=>{
const g=game();g.run('state.catches={barracuda:5};launchBoat();player.x=430;player.y=310;exitBoat();advanceSwimming(700);save()');
assert.equal(g.run('state.x'),217);assert.equal(g.run('state.y'),247);assert.equal(g.run('canWalk(740,483)'),false);
g.run('player.x=217;player.y=247;advanceSwimming(0)');assert.equal(g.run('swimming'),false);assert.equal(g.run('canWalk(player.x,player.y)'),true);
const html=fs.readFileSync('dist/index.html','utf8');assert.match(html,/id="waterControls"/);assert.match(html,/id="mapBoatExit"/);
});

test('shark fins randomly surface in open water while swimming and clear on reboarding',()=>{
const g=game();g.run("Math.random=()=>.25");g.run('state.catches={barracuda:5};launchBoat();player.x=430;player.y=310;exitBoat();nextSharkFin=0;advanceSwimming(350)');assert.equal(g.run('sharkFins.length'),0);
g.run('advanceSwimming(350)');assert.ok(g.run('sharkFins.length')>0);
assert.equal(g.run('sharkFins.every(f=>!islandPolys.some(p=>inside(f.x,f.y,p)))'),true);
g.run('advanceSwimming(500);draw()');assert.equal(g.run('sharkFins.some(f=>f.age>0)'),true);
g.run('boardOwnBoat()');assert.equal(g.run('sharkFins.length'),0);
});
test('shark fins expire, stay capped, and never appear on foot',()=>{
const g=game();g.run('advanceSharkFins(10000)');assert.equal(g.run('sharkFins.length'),0);
g.run('state.catches={barracuda:5};launchBoat();player.x=430;player.y=310;exitBoat();advanceSwimming(700)');
for(let i=0;i<8;i++){g.run('nextSharkFin=0;advanceSharkFins(100)');assert.ok(g.run('sharkFins.length')<=3);}
g.run('nextSharkFin=100000;advanceSharkFins(10000)');assert.equal(g.run('sharkFins.length'),0);
g.run('returnBoat();advanceSharkFins(10000)');assert.equal(g.run('sharkFins.length'),0);
});


test('all six tiers are earnable and legacy collections migrate without losing treasures',()=>{
const g=game({solved:[],upgrades:[],crystals:10,earnedCrystals:350});
assert.equal(g.run('state.squishyInventory.length'),7);
assert.equal(g.run('state.squishyInventory[6]'),'skull-cat');
assert.equal(g.run('squishyTiers.length'),6);
assert.equal(g.run('squishies.length'),29);
assert.equal(g.run('squishies.every(s=>squishyTiers.some(t=>t.id===s.tier))'),true);
g.run('state.earnedCrystals=1450;update()');
assert.equal(g.run('state.squishyInventory.length'),29);
assert.equal(g.run('state.squishyInventory.includes("gold-cube")'),true);
assert.match(g.node('#squishyCatalog').innerHTML,/50th Anniversary Gold Nice Cube/);
assert.match(g.node('#squishyProgress').textContent,/All collection rewards/);
});
test('trades require a ticket and matching tiers, swap one item, and persist without regranting',()=>{
const g=game({solved:[],upgrades:[],crystals:0,earnedCrystals:50});
g.node('#tradeGive').value='0';g.node('#tradeReceive').value='nice-cube';g.run('tradeSquishy()');
assert.equal(g.run('state.squishyInventory[0]'),'gummy-bear');
g.run('state.tradingTickets=2');g.node('#tradeReceive').value='gold-cube';g.run('tradeSquishy()');
assert.equal(g.run('state.tradingTickets'),2);
g.node('#tradeReceive').value='gummy-bear';g.run('tradeSquishy()');assert.equal(g.run('state.tradingTickets'),2);
g.node('#tradeReceive').value='nice-cube';g.run('tradeSquishy()');
assert.equal(g.run('state.squishyInventory[0]'),'nice-cube');assert.equal(g.run('state.tradingTickets'),1);
assert.equal(g.run('state.squishyInventory.length'),1);
const restored=game(g.run('JSON.parse(localStorage.getItem(KEY))'));
assert.equal(restored.run('state.squishyInventory[0]'),'nice-cube');assert.equal(restored.run('state.tradingTickets'),1);
restored.run('state.earnedCrystals=100;update();update()');assert.equal(restored.run('state.squishyInventory.length'),2);
assert.equal(restored.run('state.squishyInventory.includes("gummy-bear")'),false);
restored.run("switchAge('9-10')");assert.equal(restored.run('state.tradingTickets'),0);assert.equal(restored.run('state.squishyInventory.length'),0);
restored.run("switchAge('11-12')");assert.equal(restored.run('state.tradingTickets'),1);assert.equal(restored.run('state.squishyInventory[0]'),'nice-cube');
});
test('ten consecutive flash answers earn exactly one saved ticket and no crystals or discoveries',()=>{
for(const age of ['9-10','11-12']){
const g=game();g.run(`switchAge('${age}');startFlash()`);
for(let i=0;i<10;i++){
g.node('#flashAnswer').value=g.run('String(flashRun.question.answer)');g.run('submitFlash()');
assert.equal(g.run('state.tradingTickets'),i===9?1:0);
if(i<9){assert.equal(g.run('flashRun.correct'),i+1);assert.ok(g.run('flashRun.deadline-Date.now()')>14900);}
}
g.run('submitFlash()');assert.equal(g.run('state.tradingTickets'),1);
assert.equal(g.run('state.crystals'),0);assert.equal(g.run('state.solved.length'),0);
assert.equal(g.run('JSON.parse(localStorage.getItem(KEY)).tradingTickets'),1);
}
});
test('wrong, invalid, or timed-out answers end the streak and retries start at zero',()=>{
const g=game();
for(const answer of ['999999','not a number','']){
g.run('startFlash()');g.node('#flashAnswer').value=g.run('String(flashRun.question.answer)');g.run('submitFlash()');
g.node('#flashAnswer').value=answer;g.run('submitFlash()');assert.equal(g.run('flashRun'),null);assert.equal(g.run('state.tradingTickets'),0);
g.run('startFlash()');assert.equal(g.run('flashRun.correct'),0);
}
g.node('#flashAnswer').value=g.run('String(flashRun.question.answer)');g.run('flashRun.deadline=Date.now()-1;submitFlash()');assert.equal(g.run('flashRun'),null);assert.equal(g.run('state.tradingTickets'),0);
g.run('startFlash();flashRun.deadline=Date.now()-1;updateFlashClock()');assert.equal(g.run('flashRun'),null);assert.match(g.node('#flashBody').innerHTML,/Time’s up/);
g.run("startFlash();switchAge('9-10')");assert.equal(g.run('flashRun'),null);assert.equal(g.run('state.tradingTickets'),0);
g.run('startFlash();cancelFlash();submitFlash()');assert.equal(g.run('state.tradingTickets'),0);
});
test('trade selector only offers the same tier and mythic has no alternative swap',()=>{
const g=game({solved:[],upgrades:[],earnedCrystals:1450});g.run('state.tradingTickets=1');
g.node('#tradeGive').value='0';g.run('updateTradeOptions()');assert.match(g.node('#tradeReceive').innerHTML,/nice-cube/);assert.doesNotMatch(g.node('#tradeReceive').innerHTML,/gold-cube|gummy-bear/);
g.node('#tradeGive').value='28';g.run('updateTradeOptions()');assert.equal(g.node('#tradeReceive').innerHTML,'');assert.equal(g.node('#tradeSubmit').disabled,true);
});

test('left icon rail toggles nonmodal panels and preserves map actions',()=>{
const g=game();g.node('#settingsBtn').onclick();assert.equal(g.run('activeMapPanel'),'settingsPanel');assert.equal(g.node('#settingsPanel').hidden,false);
g.node('#upgradesBtn').onclick();assert.equal(g.node('#settingsPanel').hidden,true);assert.equal(g.node('#upgradesPanel').hidden,false);
g.node('#upgradesBtn').onclick();assert.equal(g.node('#upgradesPanel').hidden,true);assert.equal(g.run('activeMapPanel'),null);
g.node('#railFerryBtn').onclick();assert.equal(g.node('#ferry').hidden,false);g.run('state.crystals=50;buyFerryTicket()');assert.equal(g.node('#ferry').hidden,false);assert.equal(g.run('state.ferryTicket'),true);
g.node('#railFishingBtn').onclick();assert.equal(g.node('#ferry').hidden,true);assert.equal(g.run('fishingActive'),true);
const html=fs.readFileSync('dist/index.html','utf8');assert.match(html,/map-icon-rail/);assert.doesNotMatch(html,/id="islandMenu"/);assert.doesNotMatch(html,/<dialog id="(?:journal|stash|ferry|welcome)"/);
});

test('pixel icon groups expand submenus and hand off to map controls',()=>{
const g=game();g.node('#exploreMenuBtn').onclick();assert.equal(g.run('activeSubmenu'),'explore');assert.equal(g.node('#exploreSubmenu').hidden,false);
g.node('#waterMenuBtn').onclick();assert.equal(g.node('#exploreSubmenu').hidden,true);assert.equal(g.node('#waterSubmenu').hidden,false);
g.node('#waterMenuBtn').onclick();assert.equal(g.node('#waterSubmenu').hidden,true);assert.equal(g.run('activeSubmenu'),null);
g.node('#settingsMenuBtn').onclick();g.node('#settingsBtn').onclick();assert.equal(g.node('#settingsSubmenu').hidden,true);assert.equal(g.node('#settingsPanel').hidden,false);
g.node('#waterMenuBtn').onclick();assert.equal(g.node('#settingsPanel').hidden,true);g.node('#railFishingBtn').onclick();assert.equal(g.run('activeSubmenu'),null);assert.equal(g.run('fishingActive'),true);
g.node('#soundBtn').onclick();assert.match(g.node('#soundBtn').innerHTML,/<svg/);assert.match(g.node('#soundBtn').innerHTML,/Sound on/);
const html=fs.readFileSync('dist/index.html','utf8');assert.match(html,/shape-rendering="crispEdges"/);assert.match(html,/class="submenu-action"/);
});

test('every island shoreline supports the shared dive without a boat or sponsorship',()=>{
const g=game();g.run('state.ferryTicket=true');
for(let island=0;island<5;island++){
g.run(`swimming=false;diveAnimation=null;{
const poly=islandPolys[${island}],center=locations[${island}];let found=false;
for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],x=(a[0]+b[0])/2,y=(a[1]+b[1])/2,len=Math.hypot(center.x-x,center.y-y);player.x=x+(center.x-x)/len*3;player.y=y+(center.y-y)/len*3;if(shoreDiveTarget()){found=true;break;}}
if(!found)throw Error('No shoreline for island ${island}');
}updateWaterControls()`);
assert.equal(g.node('#mapDive').hidden,false);
g.node('#mapDive').onclick();assert.equal(g.run('swimming'),true);assert.equal(g.run('diveAnimation.elapsed'),0);
const start=g.run('({x:player.x,y:player.y})');g.run('advanceSwimming(350);draw()');assert.notEqual(g.run('player.x===diveAnimation.to.x&&player.y===diveAnimation.to.y'),true);
g.run('advanceSwimming(350);draw()');assert.equal(g.run('diveAnimation'),null);assert.equal(g.run('islandPolys.some(p=>inside(player.x,player.y,p))'),false);
assert.equal(g.run('sponsored()'),false);g.run('boardOwnBoat()');assert.equal(g.run('boating'),false);assert.equal(g.node('#mapBoatBoard').hidden,true);
g.run(`player.x=${start.x};player.y=${start.y};advanceSwimming(0)`);assert.equal(g.run('swimming'),false);
}
});
test('walking off shore dives automatically while inland obstacles do not',()=>{
const g=game();
g.run('player.x=230;player.y=176;moveExplorer(2,0)');assert.equal(g.run('swimming'),false);assert.equal(g.run('player.x'),232);
g.run('player.x=186;player.y=120;moveExplorer(3,0)');assert.equal(g.run('swimming'),false);assert.equal(g.run('player.x'),186);
g.run('diveFromIsland()');assert.equal(g.run('swimming'),false);
g.run(`{
let found=false;
for(let y=60;y<270&&!found;y+=2)for(let x=65;x<330&&!found;x+=2){if(canWalk(x,y)&&!islandPolys.some(p=>inside(x+3,y,p))&&!canWalk(x+3,y)){player.x=x;player.y=y;found=true;}}
if(!found)throw Error('No east-facing shoreline found');
}moveExplorer(3,0)`);
assert.equal(g.run('swimming'),true);assert.equal(g.run('diveAnimation.elapsed'),0);
g.run('advanceSwimming(700)');assert.equal(g.run('canWalk(740,483)'),false);
g.run('save()');const restored=game(g.run('JSON.parse(localStorage.getItem(KEY))'));assert.equal(restored.run('canWalk(player.x,player.y)'),true);
g.run('returnBoat()');assert.equal(g.run('swimming'),false);assert.equal(g.run('canWalk(player.x,player.y)'),true);
});

test('casting unfurls a curved line, lands exactly on aim, and waits for the full flight',()=>{
const g=game();g.run('state.crystals=5;openFishing();buyRod();{const f=fishingTargets(fishingTime+FISH_CAST_DURATION)[0];castFishing(f.x,f.y);}');
assert.equal(g.run('pendingCast.lure'),false);g.run('advanceFishing(200);draw()');assert.equal(g.run('totalCatches()'),0);assert.equal(g.run('pendingCast!==null'),true);
assert.equal(g.run('fishingCastPose(pendingCast).line.length'),33);
g.run('advanceFishing(250);draw()');assert.equal(g.run('fishingCastPose(pendingCast).line.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))'),true);
const pose=g.run('fishingCastPose({...pendingCast,elapsed:FISH_CAST_DURATION})');assert.ok(Math.abs(pose.bait.x-g.run('pendingCast.x'))<.00001);assert.ok(Math.abs(pose.bait.y-g.run('pendingCast.y'))<.00001);
g.run('advanceFishing(FISH_CAST_DURATION-450)');assert.equal(g.run('totalCatches()'),0);assert.equal(g.run('!!hookedFish'),true);g.run('for(let r=0;r<6;r++){reelFishing();advanceFishing(180);}');assert.equal(g.run('totalCatches()'),1);g.run('advanceFishing(1000)');assert.equal(g.run('fishingSplash'),null);
});
test('fish swim smoothly and only surface intermittently in both fishing panels',()=>{
const g=game();g.run('openFishing()');
for(const panel of ['classic','lure']){
g.run(`fishSet='${panel}'`);
assert.equal(g.run('fishingTargets(800).some(f=>f.surface>0)'),true);
assert.equal(g.run('fishingTargets(4000)[0].surface'),0);assert.equal(g.run('fishingTargets(4000)[0].nearSurface'),false);
for(const time of [0,500,1500,3000,6500,9000])g.run(`fishingTime=${time};draw()`);
assert.equal(g.run('fishingTargets().every(f=>Math.abs(f.tail)<=1&&f.surface>=0&&f.surface<=1)'),true);
}
g.run('state.fishingLure=true;state.crystals=5;buyRod();castFishing(10,40)');assert.equal(g.run('pendingCast.lure'),true);
});


test('named profiles preserve legacy progress and isolate progress across profiles and both ages',()=>{
const g=game({solved:[0,1],upgrades:['cottage'],crystals:35,earnedCrystals:50,tradingTickets:2,catches:{shark:3}});
g.node('#profileName').value='Alex';g.node('#characterChoice').value='boy';g.run('editProfile()');
assert.equal(g.run('currentProfile().name'),'Alex');assert.equal(g.run('state.crystals'),35);
g.run("switchAge('9-10');state.crystals=20;state.earnedCrystals=20;save();switchAge('11-12')");
g.node('#profileName').value='Maya';g.node('#characterChoice').value='girl';g.run('createProfile()');
assert.equal(g.run('currentProfile().name'),'Maya');assert.equal(g.run('currentProfile().character'),'girl');assert.equal(g.run('state.crystals'),0);
assert.equal(g.run('state.tradingTickets'),0);assert.equal(g.run('state.catches.shark'),0);assert.equal(g.run('state.squishyInventory.length'),0);
g.run('state.crystals=100;state.earnedCrystals=100;state.tradingTickets=4;update()');
g.run("switchAge('9-10');state.crystals=10;save();switchProfile('legacy')");
assert.equal(g.run('ageLevel'),'11-12');assert.equal(g.run('state.crystals'),35);assert.equal(g.run('state.tradingTickets'),2);assert.equal(g.run('state.upgrades[0]'),'cottage');assert.equal(g.run('state.squishyInventory[0]'),'gummy-bear');
assert.equal(g.run('currentProfile().character'),'boy');
g.run("switchAge('9-10')");assert.equal(g.run('state.crystals'),20);
g.run("switchProfile('p1')");assert.equal(g.run('ageLevel'),'9-10');assert.equal(g.run('state.crystals'),10);
g.run("switchAge('11-12')");assert.equal(g.run('state.crystals'),100);assert.equal(g.run('state.tradingTickets'),4);
const restored=game(null,g.snapshot());assert.equal(restored.run('currentProfile().name'),'Maya');assert.equal(restored.run('currentProfile().character'),'girl');assert.equal(restored.run('state.crystals'),100);assert.equal(restored.run('ageLevel'),'11-12');
restored.run("switchProfile('legacy')");assert.equal(restored.run('state.crystals'),20);assert.equal(restored.run('ageLevel'),'9-10');
});
test('profile names are unique, safely displayed, and renaming keeps the same save',()=>{
const g=game();g.node('#profileName').value='  Sam  ';g.node('#characterChoice').value='girl';g.run('editProfile()');
assert.equal(g.run('currentProfile().name'),'Sam');assert.equal(g.run('currentProfile().character'),'girl');
g.run('state.crystals=55;save()');
for(const name of ['sam','  SAM  ','','x'.repeat(25)]){g.node('#profileName').value=name;g.run('createProfile()');assert.equal(g.run('profiles.length'),1);}
g.node('#profileName').value='<A & B>';g.run('editProfile()');assert.equal(g.run('state.crystals'),55);assert.equal(g.run('profileId'),'legacy');
assert.match(g.node('#profileSelect').innerHTML,/&lt;A &amp; B&gt;/);assert.doesNotMatch(g.node('#profileSelect').innerHTML,/<A/);
assert.equal(g.node('#profileBadge').textContent,'<A & B>');
const restored=game(null,g.snapshot());assert.equal(restored.run('currentProfile().name'),'<A & B>');assert.equal(restored.run('state.crystals'),55);
});
test('character preview remains a draft until saved and both characters render on land and in water',()=>{
const g=game();g.node('#characterChoice').value='girl';g.node('#characterChoice').onchange();assert.equal(g.run('currentProfile().character'),'boy');assert.match(g.node('#characterPreview').innerHTML,/Girl explorer preview/);
g.node('#profileName').value='Zoe';g.run('editProfile()');assert.equal(g.run('currentProfile().character'),'girl');
g.run('draw();swimming=true;player.x=430;player.y=310;draw();diveAnimation={elapsed:200,from:{x:430,y:310},to:{x:454,y:320}};draw()');
g.run('swimming=false;diveAnimation=null');g.node('#characterChoice').value='boy';g.run('editProfile();draw()');assert.equal(g.run('currentProfile().character'),'boy');assert.match(g.node('#characterPreview').innerHTML,/Boy explorer preview/);
});
test('profile switches cancel flash streaks, fishing, and swimming; reset affects only the active profile',()=>{
const g=game();g.run('state.crystals=80;state.earnedCrystals=100;save()');g.node('#profileName').value='New player';g.run('createProfile()');
g.run('state.crystals=20;startFlash();switchProfile("legacy")');assert.equal(g.run('flashRun'),null);assert.equal(g.node('#flash').open,false);assert.equal(g.run('state.crystals'),80);
g.run('openFishing();switchProfile("p1")');assert.equal(g.run('fishingActive'),false);assert.equal(g.run('state.crystals'),20);
g.node('#resetBtn').onclick();assert.equal(g.node('#resetConfirm').open,true);g.node('#confirmReset').onclick();assert.equal(g.run('state.crystals'),0);assert.equal(g.run('currentProfile().name'),'New player');
g.run('switchProfile("legacy")');assert.equal(g.run('state.crystals'),80);assert.equal(g.run('state.squishyInventory.length'),2);
g.run('state.crystals=100;buyFerryTicket();boardFerry();switchProfile("p1")');assert.equal(g.run('profileId'),'legacy');assert.match(g.node('#profileFeedback').textContent,/ferry arrives/);
g.run('advanceVoyage(3500);switchProfile("p1")');assert.equal(g.run('profileId'),'p1');assert.equal(g.run('voyage'),null);assert.equal(g.run('canWalk(player.x,player.y)'),true);
});

test('swimming close to a surfaced shark latches automatically, speeds up, and leaves a trailing wake',()=>{
const g=game();g.run('swimming=true;player.x=430;player.y=310;sharkFins=[{x:442,y:310,vx:.02,vy:0,age:500,duration:4000}];advanceSwimming(0)');
assert.equal(g.run('sharkRide!==null'),true);assert.equal(g.run('sharkFins.length'),0);assert.equal(g.node('#mapSharkExit').hidden,false);assert.match(g.node('#waterControls').textContent,/SHARK RIDE/);
const start=g.run('player.x');g.run('advanceSwimming(200);draw()');assert.ok(g.run('player.x')-start>.065*200);assert.ok(g.run('player.x')-start<.11*200);
assert.ok(g.run('sharkWake.length')>0);assert.equal(g.run('sharkWake.every(w=>w.x<player.x&&Math.abs(w.y-player.y)<.001)'),true);
g.run('advanceSwimming(4500);draw()');assert.equal(g.run('sharkRide!==null'),true);assert.equal(g.run('sharkWater(player.x,player.y)'),true);
assert.equal(g.run('sharkWake.every(w=>w.age<900)&&sharkWake.length<=32'),true);
});
test('shark fades head first on descent and tail first on resurfacing in every heading',()=>{
const g=game();
for(const x of [-35,-15,0,15,25]){
assert.equal(g.run(`sharkSegmentOpacity(${x},0)`),1);assert.equal(g.run(`sharkSegmentOpacity(${x},1)`),0);
}
assert.ok(g.run('sharkSegmentOpacity(-30,.5)>sharkSegmentOpacity(20,.5)'));
for(const x of [-30,0,20])assert.ok(g.run(`sharkSegmentOpacity(${x},.3)>=sharkSegmentOpacity(${x},.6)`));
g.run('swimming=true;player.x=600;player.y=310;sharkRide={x:600,y:310,heading:0,phase:0,diveElapsed:5400};const originalBody=drawSharkBody;let slices=[];drawSharkBody=(phase,opacity)=>{slices.push(opacity);originalBody(phase,opacity)}');
for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2]){
g.run(`sharkRide.heading=${heading};sharkRide.diveElapsed=5400;slices=[];drawSharkRide()`);
const diving=g.run('JSON.stringify(slices)');assert.ok(g.run('slices.length>1&&slices.some(a=>a>0&&a<1)'));
g.run('sharkRide.diveElapsed=8000;slices=[];drawSharkRide()');assert.equal(g.run('JSON.stringify(slices)'),diving);
}
});
test('shark dives ease underwater periodically and resurface with only the snorkel visible at depth',()=>{
const g=game();
assert.equal(g.run('sharkDiveDepth()'),0);
for(const [elapsed,depth] of [[0,0],[5000,0],[5400,.5],[5800,1],[7000,1],[7600,1],[8000,.5],[8400,0],[10000,0],[15400,.5]]){
assert.equal(g.run(`sharkDiveDepth({diveElapsed:${elapsed}})`),depth);
}
g.run(`swimming=true;player.x=600;player.y=310;sharkFins=[{x:605,y:310,vx:.02,vy:0,age:500,duration:4000}];latchShark();
const originalCharacter=character,originalSnorkel=swimSnorkel;let riderDraws=0,snorkelDraws=0;
character=(...args)=>{riderDraws++;originalCharacter(...args)};swimSnorkel=(...args)=>{snorkelDraws++;originalSnorkel(...args)};
sharkRide.diveElapsed=6500;drawSharkRide()`);
assert.equal(g.run('riderDraws'),0);assert.equal(g.run('snorkelDraws'),1);
const start=g.run('player.x');g.run('keys.add("down");advanceSwimming(100)');assert.ok(g.run('player.x')>start);assert.ok(g.run('sharkRide.heading')>0);assert.equal(g.run('sharkDiveDepth()'),1);
g.run('sharkRide.diveElapsed=8300;advanceSwimming(100);drawSharkRide()');assert.equal(g.run('sharkDiveDepth()'),0);assert.equal(g.run('riderDraws'),1);assert.equal(g.run('snorkelDraws'),2);
g.run('dismountShark()');assert.equal(g.run('sharkDiveDepth()'),0);
});
test('descending riders leave body wakes and submerged riders trail a smaller snorkel wake',()=>{
const g=game();g.run(`swimming=true;player.x=600;player.y=310;sharkFins=[{x:605,y:310,vx:.02,vy:0,age:500,duration:4000}];latchShark();sharkRide.diveElapsed=5300;advanceSwimming(100);draw()`);
assert.ok(g.run('sharkRide.surfaceWake.some(w=>w.kind==="body")'));
assert.ok(g.run('sharkRide.surfaceWake.some(w=>w.kind==="snorkel")'));
const origin=g.run('({x:sharkRide.surfaceWake[0].x,y:sharkRide.surfaceWake[0].y})');
g.run('sharkRide.diveElapsed=6400;advanceSwimming(100);draw()');
assert.equal(g.run('sharkDiveDepth()'),1);
assert.equal(g.run('sharkRide.surfaceWake[0].x'),origin.x);assert.equal(g.run('sharkRide.surfaceWake[0].y'),origin.y);
assert.equal(g.run('sharkRide.surfaceWake.at(-1).kind'),'snorkel');assert.equal(g.run('sharkRide.surfaceWake.at(-1).y'),g.run('player.y-1'));
g.run('sharkRide.diveElapsed=6400;advanceSwimming(1100);draw()');assert.equal(g.run('sharkRide.surfaceWake.some(w=>w.kind==="body")'),false);
assert.ok(g.run('sharkRide.surfaceWake.length>0&&sharkRide.surfaceWake.length<=64&&sharkRide.surfaceWake.every(w=>w.age<1100)'));
g.run('dismountShark();draw()');assert.equal(g.run('sharkRide'),null);
});
test('walking and swimming face all four directions and keep their view when stopped',()=>{
const g=game();
for(const swimming of [false,true])for(const [dx,dy,facing] of [[0,-2,'up'],[0,2,'down'],[-2,0,'left'],[2,0,'right']]){
g.run(`swimming=${swimming};player.x=${swimming?430:230};player.y=${swimming?310:176};moveExplorer(${dx},${dy});draw()`);
assert.equal(g.run('player.facing'),facing);g.run('moveExplorer(0,0)');assert.equal(g.run('player.facing'),facing);
}
g.run('faceMovement(-1,0);faceMovement(-1,-1)');assert.equal(g.run('player.facing'),'left');
g.run('faceMovement(0,-1);faceMovement(1,-1)');assert.equal(g.run('player.facing'),'up');
});
test('front, back, and profile sprites have distinct faces for both characters',()=>{
const g=game();g.run('const originalRect=rect;let pixels=[];rect=(...args)=>{pixels.push(args);originalRect(...args)}');
for(const characterChoice of ['boy','girl'])for(const [facing,eyes] of [['up',0],['down',2],['left',1],['right',1]]){
g.run(`currentProfile().character='${characterChoice}';player.facing='${facing}';pixels=[];character(0,0)`);
assert.equal(g.run('pixels.filter(p=>p[4]==="#354744").length'),eyes,`${characterChoice} facing ${facing}`);
g.run('swimming=true;swimmerArt()');
}
});
test('boat riders follow movement and shark riders follow the shark heading',()=>{
const g=game();g.run('state.catches={barracuda:5};launchBoat();moveExplorer(-2,0);draw()');assert.equal(g.run('player.facing'),'left');
for(const [heading,facing] of [[0,'right'],[Math.PI/2,'down'],[Math.PI,'left'],[-Math.PI/2,'up']]){
g.run(`boating=false;swimming=true;player.x=600;player.y=310;sharkRide={x:600,y:310,heading:${heading},distance:0,phase:0,diveElapsed:0};advanceSwimming(16);draw()`);
assert.equal(g.run('player.facing'),facing);
}
});
test('ordinary swimmers wear a snorkel with either character choice',()=>{
const g=game();g.run('const originalSnorkel=swimSnorkel;let snorkelDraws=0;swimSnorkel=(...args)=>{snorkelDraws++;originalSnorkel(...args)};swimming=true;player.x=430;player.y=310;swimmerArt()');
assert.equal(g.run('snorkelDraws'),1);
g.node('#characterChoice').value='girl';g.run('editProfile();swimming=true;snorkelDraws=0;swimmerArt()');assert.equal(g.run('snorkelDraws'),1);
});
test('sharks can be steered, stay in water, and preserve the final-island gate',()=>{
const g=game();g.run('swimming=true;player.x=600;player.y=310;sharkFins=[{x:605,y:310,vx:.02,vy:0,age:500,duration:4000}];latchShark();keys.add("down");advanceSwimming(100)');assert.ok(g.run('player.y')>310);assert.ok(g.run('player.x')>600);assert.ok(g.run('sharkRide.heading')>0&&g.run('sharkRide.heading')<Math.PI/2);
g.run('keys.clear();player.x=20;player.y=20;sharkRide.heading=Math.PI;advanceSwimming(100)');assert.equal(g.run('sharkWater(player.x,player.y)'),true);
g.run('player.x=740;player.y=325;keys.add("down")');
for(let i=0;i<150;i++){g.run('advanceSwimming(40)');assert.equal(g.run('sharkWater(player.x,player.y)'),true);}
assert.equal(g.run('canWalk(740,483)'),false);g.run('save()');const restored=game(null,g.snapshot());assert.equal(restored.run('sharkRide'),null);assert.equal(restored.run('swimming'),false);assert.equal(restored.run('canWalk(player.x,player.y)'),true);
});
test('hop off returns to swimming without immediately latching again',()=>{
const g=game();g.run('swimming=true;player.x=430;player.y=310;sharkFins=[{x:435,y:310,vx:.02,vy:0,age:500,duration:4000}];latchShark();advanceSwimming(100)');
g.node('#mapSharkExit').onclick();assert.equal(g.run('sharkRide'),null);assert.equal(g.run('swimming'),true);assert.equal(g.run('sharkWake.length'),0);assert.equal(g.node('#mapSharkExit').hidden,true);
g.run('advanceSwimming(200)');assert.equal(g.run('sharkRide'),null);
g.run('sharkLatchCooldown=0;sharkFins=[{x:player.x+5,y:player.y,vx:.02,vy:0,age:500,duration:4000}];advanceSwimming(0)');assert.equal(g.run('sharkRide!==null'),true);
g.run('returnBoat()');assert.equal(g.run('sharkRide'),null);assert.equal(g.run('sharkWake.length'),0);assert.equal(g.run('swimming'),false);
});
test('shark rides require swimming and end cleanly on profile, age, or boat changes',()=>{
const g=game();const shark='sharkFins=[{x:player.x+5,y:player.y,vx:.02,vy:0,age:500,duration:4000}]';
g.run(`${shark};latchShark()`);assert.equal(g.run('sharkRide'),null);
g.run(`swimming=true;player.x=430;player.y=310;${shark};diveAnimation={elapsed:0,from:{x:430,y:310},to:{x:454,y:320}};latchShark()`);assert.equal(g.run('sharkRide'),null);
g.run('diveAnimation=null;latchShark();advanceSwimming(100)');assert.equal(g.run('sharkRide!==null'),true);
g.node('#profileName').value='Shark explorer';g.run('createProfile()');assert.equal(g.run('sharkRide'),null);assert.equal(g.run('sharkWake.length'),0);
g.run(`swimming=true;player.x=430;player.y=310;${shark};latchShark();switchAge('9-10')`);assert.equal(g.run('sharkRide'),null);
g.run(`state.catches={barracuda:5};swimming=true;player.x=boatPosition.x;player.y=boatPosition.y;${shark};latchShark();boardOwnBoat()`);assert.equal(g.run('sharkRide'),null);assert.equal(g.run('boating'),true);
});

test('reset confirmation preserves progress when cancelled',()=>{
const g=game();g.run('state.crystals=35;state.earnedCrystals=50;state.solved=[0]');
g.node('#resetBtn').onclick();assert.equal(g.node('#resetConfirm').open,true);
assert.equal(g.run('state.crystals'),35);g.node('#cancelReset').onclick();
assert.equal(g.node('#resetConfirm').open,false);g.node('#confirmReset').onclick();
assert.equal(g.run('state.crystals'),35);assert.equal(g.run('state.solved.length'),1);
});

test('education help opens a complete 12 by 12 multiplication reference',()=>{
const g=game();g.node('#educationMenuBtn').onclick();
assert.equal(g.run('activeSubmenu'),'education');assert.equal(g.node('#educationSubmenu').hidden,false);
g.node('#timesTablesBtn').onclick();assert.equal(g.run('activeSubmenu'),null);
assert.equal(g.node('#educationSubmenu').hidden,true);assert.equal(g.node('#timesTables').open,true);
const html=g.node('#timesTableGrid').innerHTML;
const products=[...html.matchAll(/<td>(\d+)<\/td>/g)].map(match=>Number(match[1]));
assert.equal(products.length,144);
for(let row=1;row<=12;row++)for(let col=1;col<=12;col++)assert.equal(products[(row-1)*12+col-1],row*col);
assert.equal((html.match(/scope="col"/g)||[]).length,13);assert.equal((html.match(/scope="row"/g)||[]).length,12);
g.run("closeSurface('timesTables')");assert.equal(g.node('#timesTables').open,false);
g.node('#educationMenuBtn').onclick();g.node('#settingsMenuBtn').onclick();assert.equal(g.node('#educationSubmenu').hidden,true);
});

test('shark dives offshore before the rider rolls onto walkable land',()=>{
const g=game();
g.run(`swimming=true;player.y=176;
const shoreX=Array.from({length:320},(_,i)=>i+20).find(x=>inside(x,176,islandPolys[0]));
player.x=shoreX-28;sharkFins=[{x:player.x+2,y:176,vx:.02,vy:0,age:500,duration:4000}];latchShark();advanceSwimming(16)`);
assert.equal(g.run('!!sharkRide.landing'),true);
assert.equal(g.run('sharkWater(sharkRide.x+Math.cos(sharkRide.heading)*25,sharkRide.y+Math.sin(sharkRide.heading)*25)'),true);
const sharkX=g.run('sharkRide.x'),start=g.run('player.x');
assert.ok(g.run('Math.hypot(sharkRide.landing.to.x-sharkRide.landing.from.x,sharkRide.landing.to.y-sharkRide.landing.from.y)')<=36);
assert.ok(g.run('sharkRide.landing.to.x-shoreX')<=6);
g.run('advanceSwimming(16);draw()');assert.ok(g.run('player.x')>start);assert.ok(g.run('sharkRide.x')>sharkX);
g.run('advanceSwimming(200);draw()');assert.ok(g.run('player.x')>start);
assert.equal(g.node('#mapSharkExit').hidden,true);
g.run('dismountShark()');assert.equal(g.run('!!sharkRide.landing'),true);
g.run('advanceSwimming(500);draw()');assert.equal(g.run('sharkRide'),null);assert.equal(g.run('swimming'),false);
assert.equal(g.run('canWalk(player.x,player.y)'),true);assert.equal(g.run('sharkWake.length'),0);
const restored=game(null,g.snapshot());assert.equal(restored.run('player.x'),g.run('player.x'));
});

test('swimming onto shore pulls the explorer up before walking resumes',()=>{
const g=game();g.run(`swimming=true;player.y=176;
const beachX=Array.from({length:320},(_,i)=>i+20).find(x=>inside(x,176,islandPolys[0]));player.x=beachX-1;moveExplorer(2,0)`);
assert.equal(g.run('!!shoreClimb'),true);assert.equal(g.run('swimming'),true);assert.equal(g.run('sharkRide'),null);
const start=g.run('player.x');g.run('moveExplorer(20,0)');assert.equal(g.run('player.x'),start);
for(const elapsed of [100,150,150])g.run(`advanceSwimming(${elapsed});draw()`);
assert.ok(g.run('player.x')>start);assert.equal(g.run('!!shoreClimb'),true);
g.run('advanceSwimming(250);draw()');assert.equal(g.run('shoreClimb'),null);assert.equal(g.run('swimming'),false);assert.equal(g.run('canWalk(player.x,player.y)'),true);
g.run('swimming=true;player.x=beachX-1;moveExplorer(2,0);switchAge("9-10")');assert.equal(g.run('shoreClimb'),null);
});

test('water entries randomly choose a stable roll, backflip, or dive and finish swimming',()=>{
const g=game();
for(const [random,style] of [[0,'roll'],[.5,'backflip'],[.999,'dive']]){
g.run(`Math.random=()=>${random};player.x=430;player.y=310;startDive({x:454,y:320})`);
assert.equal(g.run('diveAnimation.style'),style);
for(const elapsed of [0,80,200,350,430,500,699]){
g.run(`diveAnimation.elapsed=${elapsed};draw()`);
assert.equal(g.run('diveAnimation.style'),style);
}
g.run('advanceSwimming(1)');
assert.equal(g.run('diveAnimation'),null);assert.equal(g.run('swimming'),true);
assert.equal(g.run('player.x'),454);assert.equal(g.run('player.y'),320);
}
});

test('ferry passes stay with an explorer across age changes, reset, and reload',()=>{
const g=game();g.run('state.crystals=75;buyFerryTicket()');assert.equal(g.run('state.crystals'),25);
g.run("switchAge('9-10')");assert.equal(g.run('state.ferryTicket'),true);
g.run('state.crystals=70;buyFerryTicket()');assert.equal(g.run('state.crystals'),70);
g.node('#resetBtn').onclick();g.node('#confirmReset').onclick();assert.equal(g.run('state.ferryTicket'),true);
g.run("switchAge('11-12')");assert.equal(g.run('state.ferryTicket'),true);
const restored=game(null,g.snapshot());assert.equal(restored.run('state.ferryTicket'),true);
g.node('#profileName').value='Separate explorer';g.run('createProfile()');assert.equal(g.run('state.ferryTicket'),false);
g.run("switchProfile('legacy')");assert.equal(g.run('state.ferryTicket'),true);
});

test('existing ferry passes migrate from the other age level to permanent profile ownership',()=>{
const g=game(null,{'skyseed-v1-9-10':JSON.stringify({solved:[],upgrades:[],ferryTicket:true})});
assert.equal(g.run('state.ferryTicket'),true);assert.equal(g.run('currentProfile().ferryTicket'),true);
g.run("switchAge('9-10')");assert.equal(g.run('state.ferryTicket'),true);
});

for(const level of ['5-6','7-8']){
test(`ages ${level} has 100 distinct, correct problems and rewards every answer`,()=>{
const g=game();g.run(`switchAge('${level}')`);
const bank=JSON.parse(g.run('JSON.stringify(questions)'));
assert.equal(bank.length,100);assert.equal(new Set(bank.map(q=>q.q)).size,100);
const shapeSides={triangle:3,square:4,rectangle:4,circle:0,hexagon:6};
for(const q of bank){
assert.equal(q.kind,'guided');assert.equal(q.hint.length,3);assert.equal(q.steps.length,3);assert.ok(q.title&&q.explain);
const ns=(q.q.match(/\d+/g)||[]).map(Number);let expected;
switch(q.skill){
case 'Counting':expected=(q.visual.match(/●/g)||[]).length;break;
case 'Number order':expected=ns[0]+1;break;
case 'Addition within 10':case 'Addition within 100':case 'Time':case 'Reading data':expected=ns.reduce((a,b)=>a+b,0);break;
case 'Subtraction within 10':case 'Subtraction within 100':expected=ns[0]-ns[1];break;
case 'Comparing numbers':expected=Math.max(...ns);break;
case 'Shapes':expected=shapeSides[Object.keys(shapeSides).find(shape=>q.q.includes(shape))];break;
case 'Number bonds to 10':expected=10-ns[0];break;
case 'Number patterns':expected=ns[2]+(ns[1]-ns[0]);break;
case 'Place value':expected=ns.length===1?Math.floor(ns[0]/10):10*ns[0]+ns[1];break;
case 'Multiplication':expected=ns[0]*ns[1];break;
case 'Equal sharing':expected=ns[0]/ns[1];break;
case 'Money':expected=ns[1]-ns[0];break;
case 'Halves':expected=ns[0]/2;break;
case 'Quarters':expected=ns[0]/4;break;
case 'Perimeter':expected=2*(ns[0]+ns[1]);break;
default:assert.fail(`Unhandled skill ${q.skill}`);
}
assert.equal(q.answer,expected,q.q);assert.ok(Number.isInteger(q.answer)&&q.answer>=0);
}
assert.equal(g.run('new Set(locations.flatMap(l=>l.ids)).size'),100);
for(let i=0;i<100;i++){
g.run(`openQuestion(${i})`);g.node('#answer').value=String(bank[i].answer);g.run('checkAnswer();checkAnswer()');
assert.equal(g.run('state.solved.length'),i+1);
}
assert.equal(g.run('state.crystals'),500);assert.match(g.node('#challengeBody').innerHTML,/All 100 discoveries/);
});
}

test('four age brackets preserve independent progress and the selected bracket across profiles and reloads',()=>{
const g=game({solved:[0],upgrades:['cottage'],crystals:15});
for(const [index,level] of ['5-6','7-8','9-10'].entries()){
g.node('#ageLevel').onchange({target:{value:level}});assert.equal(g.run('ageLevel'),level);
assert.equal(g.run('state.solved.length'),0);g.run(`state.crystals=${25+index};state.solved=[${index+1}];save()`);
}
for(const [index,level] of ['5-6','7-8','9-10'].entries()){
g.run(`switchAge('${level}')`);assert.equal(g.run('state.crystals'),25+index);assert.equal(g.run('state.solved[0]'),index+1);
}
g.run("switchAge('11-12')");assert.equal(g.run('state.crystals'),15);assert.equal(g.run('state.upgrades[0]'),'cottage');
g.run("switchAge('5-6')");g.node('#profileName').value='Little explorer';g.run('createProfile()');
assert.equal(g.run('ageLevel'),'5-6');assert.equal(g.run('state.crystals'),0);
g.run("switchAge('7-8');state.crystals=45;save()");const restored=game(null,g.snapshot());
assert.equal(restored.run('ageLevel'),'7-8');assert.equal(restored.run('state.crystals'),45);
restored.run("switchProfile('legacy')");assert.equal(restored.run('ageLevel'),'5-6');assert.equal(restored.run('state.crystals'),25);
restored.run("switchAge('7-8')");assert.equal(restored.run('state.crystals'),26);
const html=fs.readFileSync('dist/index.html','utf8');
for(const level of ['5-6','7-8','9-10','11-12'])assert.ok(html.includes(`<option value="${level}">`));
});

test('new age brackets use suitable flash arithmetic and keep permanent ferry access',()=>{
const g=game();g.run('state.crystals=50;buyFerryTicket()');
for(const level of ['5-6','7-8']){
g.run(`switchAge('${level}')`);assert.equal(g.run('state.ferryTicket'),true);
for(let i=0;i<100;i++){
const q=JSON.parse(g.run('JSON.stringify(flashQuestion())'));const [left,op,right]=q.q.split(' '),a=Number(left),b=Number(right);
const expected=op==='+'?a+b:op==='−'?a-b:op==='×'?a*b:a/b;
assert.equal(q.answer,expected);assert.ok(q.answer>=0&&Number.isInteger(q.answer));
if(level==='5-6'){assert.ok(['+','−'].includes(op));assert.ok(a<=10&&b<=10&&q.answer<=10);}
else assert.ok(Math.max(a,b,q.answer)<=100);
}
}
});

test('early-age workbenches render counting pictures and shape references',()=>{
const g=game(null,null,true);
for(const level of ['5-6','7-8']){
g.run(`switchAge('${level}')`);
for(let i=0;i<100;i++){
g.run(`openQuestion(${i})`);assert.match(g.node('#workbench').innerHTML,/visual-result/);
if(g.run(`!!questions[${i}].visual`))assert.match(g.node('#workbench').innerHTML,/math-picture/);
}
}
});

test('Loch Ness sightings are rare timed checks, stay in water, and expire',()=>{
const g=game();g.run('player.x=430;player.y=310;Math.random=()=>0;nextLochDragon=90000');
g.run('advanceLochDragon(89999)');assert.equal(g.run('lochDragon'),null);
g.run('advanceLochDragon(1);draw()');assert.equal(g.run('!!lochDragon'),true);
assert.equal(g.run('sharkWater(lochDragon.x,lochDragon.y)'),true);
for(let i=0;i<100;i++)g.run('advanceLochDragon(40)');
assert.equal(g.run('sharkWater(lochDragon.x,lochDragon.y)'),true);
g.run('advanceLochDragon(18000)');assert.equal(g.run('lochDragon'),null);
g.run('Math.random=()=>.9;nextLochDragon=0;advanceLochDragon(1)');assert.equal(g.run('lochDragon'),null);
assert.ok(g.run('nextLochDragon')>=90000);
g.run('advanceLochDragon(0)');assert.equal(g.run('lochDragon'),null);
});

test('a lucky swimmer catches and rides the dragon, with dragon controls and no shark spawned on dismount',()=>{
const g=game();const sighting='lochDragon={x:435,y:310,heading:0,age:1000,duration:18000}';
g.run(`player.x=430;player.y=310;${sighting};latchLochDragon()`);assert.equal(g.run('sharkRide'),null);
g.run('swimming=true;advanceSwimming(0)');assert.equal(g.run('sharkRide.kind'),'dragon');assert.equal(g.run('lochDragon'),null);
assert.match(g.node('#waterControls').textContent,/LOCH NESS DRAGON/);assert.match(g.node('#mapSharkExit').textContent,/Hop off dragon/);
const start=g.run('player.x');g.run('advanceSwimming(200);draw()');assert.ok(g.run('player.x')>start);
assert.equal(g.run('sharkDiveDepth()'),0);
const fins=g.run('sharkFins.length');g.node('#mapSharkExit').onclick();assert.equal(g.run('sharkRide'),null);
assert.equal(g.run('swimming'),true);assert.equal(g.run('sharkFins.length'),fins);
g.run(`${sighting};latchLochDragon()`);assert.equal(g.run('sharkRide'),null);
g.run('dragonLatchCooldown=0;lochDragon.age=17900;latchLochDragon()');assert.equal(g.run('sharkRide'),null);
});

test('dragon rides land safely, respect the cavern gate, and clear on player or age changes',()=>{
const g=game();
g.run(`swimming=true;player.y=176;
const shoreX=Array.from({length:320},(_,i)=>i+20).find(x=>inside(x,176,islandPolys[0]));
player.x=shoreX-25;lochDragon={x:player.x+2,y:176,heading:0,age:1000,duration:18000};latchLochDragon();advanceSwimming(16);draw()`);
assert.equal(g.run('!!sharkRide.landing'),true);g.run('advanceSwimming(1500);draw()');
assert.equal(g.run('sharkRide'),null);assert.equal(g.run('swimming'),false);assert.equal(g.run('canWalk(player.x,player.y)'),true);
g.run('swimming=true;player.x=740;player.y=325');assert.equal(g.run('sharkShoreLanding(Math.PI/2)'),null);
g.run("lochDragon={x:430,y:310,heading:0,age:1000,duration:18000};switchAge('7-8')");assert.equal(g.run('lochDragon'),null);
g.run('swimming=true;player.x=430;player.y=310;lochDragon={x:435,y:310,heading:0,age:1000,duration:18000};latchLochDragon()');
assert.equal(g.run('sharkRide.kind'),'dragon');g.node('#profileName').value='Dragon watcher';g.run('createProfile()');
assert.equal(g.run('sharkRide'),null);assert.equal(g.run('lochDragon'),null);
});

test('swimmer wake follows actual movement, preserves turns, and fades while resting',()=>{
const g=game();g.run('swimming=true;player.x=430;player.y=310;nextSharkFin=1e9;nextLochDragon=1e9');
for(let i=0;i<12;i++)g.run('advanceSwimming(40);moveExplorer(2.6,0)');
assert.ok(g.run('swimMotion.wake.length')>0);assert.ok(g.run('swimMotion.effort')>.5);
assert.equal(g.run('swimMotion.wake.every(w=>w.x<player.x&&Math.abs(w.y-310)<.001)'),true);
const original=JSON.parse(g.run('JSON.stringify(swimMotion.wake[0])'));
for(let i=0;i<6;i++)g.run('advanceSwimming(40);moveExplorer(0,2.6)');
assert.equal(g.run('swimMotion.wake[0].x'),original.x);assert.equal(g.run('swimMotion.wake[0].y'),original.y);
assert.ok(g.run('swimMotion.wake.some(w=>Math.abs(w.heading-Math.PI/2)<.001)'));
const phase=g.run('swimMotion.phase');g.run('draw();draw();draw()');assert.equal(g.run('swimMotion.phase'),phase);
g.run('advanceSwimming(1600);draw()');assert.equal(g.run('swimMotion.wake.length'),0);assert.ok(g.run('swimMotion.effort')<.01);
g.run('moveExplorer(2.6,0);moveExplorer(2.6,0)');assert.ok(g.run('swimMotion.wake.length')>0);
g.run('returnBoat()');assert.equal(g.run('swimMotion.wake.length'),0);
});

test('swimmer stroke and wake reset when mounting a sea creature or changing players',()=>{
const g=game();g.run('swimming=true;player.x=430;player.y=310;moveExplorer(10,0);advanceSwimMotion(40)');
assert.ok(g.run('swimMotion.wake.length')>0);
g.run('sharkFins=[{x:player.x+2,y:player.y,vx:.02,vy:0,age:500,duration:4000}];latchShark();advanceSwimming(40)');
assert.equal(g.run('swimMotion.wake.length'),0);g.run('draw();dismountShark()');
g.node('#profileName').value='Swim friend';g.run('createProfile()');assert.equal(g.run('swimMotion.effort'),0);assert.equal(g.run('swimMotion.wake.length'),0);
});
