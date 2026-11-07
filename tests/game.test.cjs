const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
function game(saved,stored,renderTools=false){const nodes=new Map(),storage=new Map(stored?Object.entries(stored):saved?[["skyseed-v1",JSON.stringify(saved)]]:[]);const element=()=>({value:'',innerHTML:'',textContent:'',style:{},classList:{add(){},remove(){}},setAttribute(){},addEventListener(){},focus(){},showModal(){this.open=true;},close(){this.open=false;},getContext(){return new Proxy({},{get:()=>()=>{}});}});const node=s=>{if(!nodes.has(s))nodes.set(s,element());return nodes.get(s);};const c=vm.createContext({document:{querySelector:s=>s==='dialog[open]'?([...nodes.entries()].find(([key,n])=>['#challenge','#journal','#welcome','#ferry','#stash','#sponsorship','#flash','#resetConfirm','#timesTables'].includes(key)&&n.open)?.[1]||null):node(s),querySelectorAll:()=>[],addEventListener(){}},window:{listeners:{},addEventListener(type,handler,options){(this.listeners[type]??=[]).push({handler,capture:!!options?.capture});}},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},console,confirm:()=>true});vm.runInContext(fs.readFileSync('dist/surfing.js','utf8'),c);vm.runInContext(fs.readFileSync('dist/app.js','utf8'),c);if(!renderTools)vm.runInContext('renderTool=()=>{}',c);return {run:s=>vm.runInContext(s,c),node,snapshot:()=>Object.fromEntries(storage)};}
test('all 100 challenges award once; upgrades cost 60; companion hatches',()=>{const g=game();for(let i=0;i<100;i++){g.run(`openQuestion(${i})`);g.node('#answer').value=g.run(`Array.isArray(questions[${i}].answer)?questions[${i}].answer.join(','):String(questions[${i}].answer)`);g.run('checkAnswer()');}assert.equal(g.run('state.solved.length'),100);assert.equal(g.run('state.crystals'),500);assert.equal(g.node('#petTitle').textContent,'Meet Sprout!');g.run('openQuestion(0)');g.node('#answer').value='252';g.run('checkAnswer()');assert.equal(g.run('state.crystals'),505);g.run("buy('cottage');buy('garden');buy('bridge')");assert.equal(g.run('state.crystals'),445);assert.equal(g.run('state.upgrades.length'),3);g.run("buy('bridge')");assert.equal(g.run('state.crystals'),445);});
test('wrong answers, equivalent fractions, percentages, ordered pairs',()=>{const g=game();g.run('openQuestion(4)');g.node('#answer').value='3/4';g.run('checkAnswer()');assert.equal(g.run('state.crystals'),0);g.node('#answer').value='14/16';g.run('checkAnswer()');assert.equal(g.run('state.crystals'),5);assert.equal(g.run("parseNumber('62%')"),.62);assert.equal(g.run("parseNumber('−4')"),-4);assert.ok(Number.isNaN(g.run("parseNumber('1/0')")));g.run('openQuestion(17)');g.node('#answer').value='30,54';g.run('checkAnswer()');assert.equal(g.run('state.solved.length'),1);g.node('#answer').value='54,30';g.run('checkAnswer()');assert.equal(g.run('state.solved.length'),2);});
test('ferry ticket gates the fifth island and includes return journeys',()=>{
const g=game();g.run('visit(4)');assert.equal(g.run('active'),0);assert.equal(g.node('#ferry').hidden,false);
g.run('buyFerryTicket()');assert.equal(g.run('state.ferryTicket'),false);
g.run('state.crystals=75;state.earnedCrystals=75;buyFerryTicket()');assert.equal(g.run('state.crystals'),25);assert.equal(g.run('state.earnedCrystals'),75);
g.run('buyFerryTicket()');assert.equal(g.run('state.crystals'),25);
g.run('boardFerry();moveExplorer(2,0)');assert.equal(g.run('boating'),true);assert.equal(g.run('activeVessel'),'ferry');
g.run('save()');assert.equal(g.run('state.x'),g.run('dock.x'));
g.run('player.x=farDock.x+43;player.y=farDock.y+15;exitBoat();if(boatAnchorCasting())advanceSwimming(FISH_CAST_DURATION)');assert.equal(g.run('boating'),false);assert.equal(g.run('canWalk(player.x,player.y)'),true);
g.run('visit(4)');assert.equal(g.run('active'),16);
g.run('openFerry();boardFerry();player.x=dock.x+43;player.y=dock.y+15;exitBoat();if(boatAnchorCasting())advanceSwimming(FISH_CAST_DURATION)');assert.equal(g.run('player.x'),g.run('dock.x'));assert.equal(g.run('canWalk(player.x,player.y)'),true);assert.equal(g.run('state.crystals'),25);
assert.equal(g.run('JSON.parse(localStorage.getItem(KEY)).ferryTicket'),true);
});
test('canvas renders without exceptions',()=>{const g=game();g.run('draw();state.solved=[0,1,2,3,4,5,6,7];state.upgrades=["cottage","garden","bridge"];draw()');});
test('every destination places the explorer on walkable land',()=>{const g=game();for(let i=0;i<4;i++){g.run(`visit(${i})`);assert.equal(g.run('canWalk(player.x,player.y)'),true,`destination ${i}`);}g.run('state.crystals=50;openFerry();buyFerryTicket();boardFerry();player.x=farDock.x+43;player.y=farDock.y+15;exitBoat();if(boatAnchorCasting())advanceSwimming(FISH_CAST_DURATION);visit(4)');assert.equal(g.run('canWalk(player.x,player.y)'),true);});

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
assert.match(g.node('#solvedCount').textContent,/5 \/ 100/);
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

test('world has seventeen islands plus mainland beach and keeps the original ferry gate',()=>{
const g=game();assert.equal(g.run('WORLD.width*WORLD.height'),960*600*10);assert.equal(g.run('islandPolys.length'),18);
assert.equal(g.run('canWalk(740,483)'),false);g.run('state.ferryTicket=true');assert.equal(g.run('canWalk(740,483)'),true);
assert.equal(g.run('canWalk(600,350)'),false);
// Trace the eastern island walkways and the shorter southern ferry pier.
for(let x=310;x<=760;x+=2)assert.equal(g.run(`canWalk(${x},162)`),true,`east route ${x}`);
for(let y=230;y<=310;y+=2)assert.equal(g.run(`canWalk(232,${y})`),true,`south route ${y}`);
g.run('player.x=740;player.y=483;draw()');assert.equal(g.run('camera.x'),500);assert.equal(g.run('camera.y'),333);
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
g.run('player.x=430;player.y=310;openFishing()');assert.equal(g.run('player.x'),430);assert.equal(g.run('player.y'),310);g.run('save();draw()');assert.equal(g.run('state.x'),g.run('dock.x'));assert.equal(g.run('state.y'),g.run('dock.y-18'));
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
const g=game();g.run('state.catches={barracuda:5};launchBoat();exitBoat();if(boatAnchorCasting())advanceSwimming(FISH_CAST_DURATION)');
assert.equal(g.run('boating'),false);assert.equal(g.run('swimming'),false);assert.equal(g.run('diveAnimation'),null);assert.equal(g.run('canWalk(player.x,player.y)'),true);assert.equal(g.node('#mapBoatExit').hidden,true);
});
test('offshore exit animates a dive, leaves the boat, and permits reboarding',()=>{
const g=game();g.run('state.catches={barracuda:5};launchBoat();player.x=430;player.y=310;openFishing();exitBoat();if(boatAnchorCasting())advanceSwimming(FISH_CAST_DURATION)');
assert.equal(g.run('fishingActive'),false);assert.equal(g.run('boating'),false);assert.equal(g.run('swimming'),true);assert.equal(g.run('boatPosition.x'),430);assert.equal(g.run('diveAnimation!==null'),true);
g.run('advanceSwimming(350);draw()');assert.equal(g.run('diveAnimation.elapsed'),350);g.run('boardOwnBoat()');assert.equal(g.run('boating'),false);
g.run('advanceSwimming(350);draw()');assert.equal(g.run('diveAnimation'),null);assert.equal(g.run('canWalk(600,350)'),true);assert.match(g.node('#waterControls').textContent,/E beside your boat/);assert.equal(g.node('#mapBoatBoard').hidden,false);
g.run('boardOwnBoat()');assert.equal(g.run('boating'),true);assert.equal(g.run('swimming'),false);assert.equal(g.run('player.x'),430);assert.equal(g.run('player.y'),310);assert.match(g.node('#waterControls').textContent,/X or Exit boat/);
});
test('swimmers walk onto shore, preserve the final-island gate, and save safely',()=>{
const g=game();g.run('state.catches={barracuda:5};launchBoat();player.x=430;player.y=310;exitBoat();if(boatAnchorCasting())advanceSwimming(FISH_CAST_DURATION);advanceSwimming(700);save()');
assert.equal(g.run('state.x'),g.run('dock.x'));assert.equal(g.run('state.y'),g.run('dock.y-18'));assert.equal(g.run('canWalk(740,483)'),false);
g.run('player.x=217;player.y=247;advanceSwimming(0)');assert.equal(g.run('swimming'),false);assert.equal(g.run('canWalk(player.x,player.y)'),true);
const html=fs.readFileSync('dist/index.html','utf8');assert.match(html,/id="waterControls"/);assert.match(html,/id="mapBoatExit"/);
});

test('shark fins randomly surface in open water while swimming and clear on reboarding',()=>{
const g=game();g.run("Math.random=()=>.25");g.run('state.catches={barracuda:5};launchBoat();player.x=430;player.y=310;exitBoat();if(boatAnchorCasting())advanceSwimming(FISH_CAST_DURATION);nextSharkFin=0;advanceSwimming(350)');assert.equal(g.run('sharkFins.length'),0);
g.run('advanceSwimming(350)');assert.ok(g.run('sharkFins.length')>0);
assert.equal(g.run('sharkFins.every(f=>!islandPolys.some(p=>inside(f.x,f.y,p)))'),true);
g.run('advanceSwimming(500);draw()');assert.equal(g.run('sharkFins.some(f=>f.age>0)'),true);
g.run('boardOwnBoat()');assert.equal(g.run('sharkFins.length'),0);
});
test('surfaced fins stay upright with consistent lighting in every travel direction',()=>{
const g=game();g.run('const originalPolygon=polygon;let finShapes=[];polygon=(points,color,dy)=>{finShapes.push({points,color});originalPolygon(points,color,dy)};swimming=true');
for(const [vx,vy] of [[.02,0],[-.02,0],[0,.02],[0,-.02],[.02,.02],[-.02,-.02]]){
g.run(`sharkFins=[{x:430,y:310,vx:${vx},vy:${vy},age:500,duration:4000}];finShapes=[];drawSharkFins()`);
assert.equal(g.run('Math.min(...finShapes.find(s=>s.color==="#365768").points.map(p=>p[1]))'),-14);
assert.equal(g.run('finShapes.find(s=>s.color==="#638391").points.every(p=>p[0]<=0)'),true);
}
});
test('shark fins expire, stay capped, and never appear on foot',()=>{
const g=game();g.run('advanceSharkFins(10000)');assert.equal(g.run('sharkFins.length'),0);
g.run('state.catches={barracuda:5};launchBoat();player.x=430;player.y=310;exitBoat();if(boatAnchorCasting())advanceSwimming(FISH_CAST_DURATION);advanceSwimming(700)');
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
assert.equal(g.node('#mapDive').hidden,!g.run('!!walkableTimberAt(player.x,player.y)'));
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
g.run('state.crystals=100;buyFerryTicket();boardFerry()');assert.equal(g.run('activeVessel'),'ferry');assert.equal(g.run('boating'),true);
g.run('switchProfile("p1")');assert.equal(g.run('profileId'),'p1');assert.equal(g.run('boating'),false);assert.equal(g.run('canWalk(player.x,player.y)'),true);
});

test('swimming close to a surfaced shark latches automatically, speeds up, and leaves a trailing wake',()=>{
const g=game();g.run('swimming=true;player.x=430;player.y=310;sharkFins=[{x:442,y:310,vx:.02,vy:0,age:500,duration:4000}];advanceSwimming(0)');
assert.equal(g.run('sharkRide!==null'),true);assert.equal(g.run('sharkFins.length'),0);assert.equal(g.node('#mapSharkExit').hidden,false);assert.match(g.node('#waterControls').textContent,/SHARK RIDE/);
const start=g.run('player.x');g.run('advanceSwimming(200);draw()');assert.ok(g.run('player.x')-start>.065*200);assert.ok(g.run('player.x')-start<.11*200);
assert.ok(g.run('sharkWake.length')>0);assert.equal(g.run('sharkWake.every(w=>w.x<player.x&&Math.abs(w.y-player.y)<.001)'),true);
g.run('advanceSwimming(4500);draw()');assert.equal(g.run('sharkRide!==null'),true);assert.equal(g.run('sharkWater(player.x,player.y)'),true);
assert.equal(g.run('sharkWake.every(w=>w.age<900)&&sharkWake.length<=32'),true);
});
test('sharks dive under every bridge in either direction without dismounting',()=>{
const g=game();g.run('state.upgrades=["bridge"];nextSharkFin=1e9;nextLochDragon=1e9');
const bridges=JSON.parse(g.run('JSON.stringify([...crossings,woodlandBridge])'));
for(const kind of [undefined,'marlin','dragon'])for(const [index,b] of bridges.entries())for(const direction of [-1,1]){
const horizontal=b.w>b.h,heading=horizontal?direction*Math.PI/2:(direction>0?0:Math.PI);
const distance=(horizontal?b.h:b.w)+144;
const x=horizontal?b.x+b.w/2:(direction>0?b.x-72:b.x+b.w+72);
const y=horizontal?(direction>0?b.y-72:b.y+b.h+72):b.y+b.h/2;
g.run(`state.upgrades=${index===bridges.length-1?'["bridge"]':'[]'};swimming=true;shoreRecovery=null;keys.clear();player.x=${x};player.y=${y};sharkRide={kind:${JSON.stringify(kind)},x:player.x,y:player.y,heading:${heading},distance:0,phase:0,diveElapsed:0}`);
let passedUnder=false;
for(let step=0;step<Math.ceil(distance/(.095*16));step++){
g.run('advanceSwimming(16)');assert.equal(g.run('!!sharkRide&&!sharkRide.landing'),true,`bridge ${index}, direction ${direction}`);assert.equal(g.run('swimming'),true);
if(g.run('underSharkBridge(player.x,player.y)')){passedUnder=true;assert.equal(g.run('sharkDiveDepth()'),1);g.run('draw()');}
}
assert.equal(passedUnder,true);assert.equal(g.run('shoreRecovery'),null);
assert.ok(g.run('sharkDiveDepth()')<.01);
}
});
test('bridge timber hides the snorkel overhead and restored bridge detection needs its upgrade',()=>{
const g=game();g.run('const bridge=crossings[0];swimming=true;player.x=bridge.x+bridge.w/2;player.y=bridge.y+bridge.h/2;sharkRide={x:player.x,y:player.y,heading:Math.PI/2,phase:0,diveElapsed:0};const originalSnorkel=swimSnorkel;let snorkels=0;swimSnorkel=(...args)=>{snorkels++;originalSnorkel(...args)};drawSharkRide()');
assert.equal(g.run('snorkels'),0);assert.equal(g.run('sharkDiveDepth()'),1);
assert.equal(g.run('underSharkBridge(woodlandBridge.x+woodlandBridge.w/2,woodlandBridge.y+woodlandBridge.h/2)'),false);
g.run('state.upgrades=["bridge"]');assert.equal(g.run('underSharkBridge(woodlandBridge.x+woodlandBridge.w/2,woodlandBridge.y+woodlandBridge.h/2)'),true);
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
const g=game();g.run('state.catches={barracuda:5};launchBoat();player.x=3000;player.y=1500;moveExplorer(-2,0);draw()');assert.equal(g.run('player.facing'),'left');
for(const [heading,facing] of [[0,'right'],[Math.PI/2,'down'],[Math.PI,'left'],[-Math.PI/2,'up']]){
g.run(`boating=false;swimming=true;player.x=600;player.y=310;sharkRide={x:600,y:310,heading:${heading},distance:0,phase:0,diveElapsed:0};advanceSwimming(16);draw()`);
assert.equal(g.run('player.facing'),facing);
}
});
test('characters have no hats in water, on land, or in profile previews',()=>{
const g=game();g.run('const originalRect=rect;let pixels=[];rect=(...args)=>{pixels.push(args);originalRect(...args)}');
for(const choice of ['boy','girl']){
g.run(`currentProfile().character='${choice}';swimming=true`);
for(const facing of ['up','down','left','right'])for(const drawing of ['character(0,0)','swimmerArt()','rollingCharacter(0,0,1,.8)','divingCharacter(0,0,1)']){
g.run(`player.facing='${facing}';pixels=[];${drawing}`);assert.equal(g.run('pixels.some(p=>["#b9a0ce","#dfb568","#a87a49"].includes(p[4]))'),false);
}
g.run('swimming=false;pixels=[];character(0,0);renderCharacterPreview(currentProfile().character)');assert.equal(g.run('pixels.some(p=>["#b9a0ce","#dfb568","#a87a49"].includes(p[4]))'),false);assert.doesNotMatch(g.node('#characterPreview').innerHTML,/#b9a0ce|#dfb568/);
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

test('swimmers reach for the shoreline from offshore before their body moves onto land',()=>{
const g=game();
g.run(`const xs=Array.from({length:400},(_,i)=>i).filter(x=>inside(x,176,mainPoly));
const ys=Array.from({length:300},(_,i)=>i).filter(y=>inside(280,y,mainPoly));
const approaches=[{x:xs[0]-11,y:176,dx:1,dy:0},{x:xs.at(-1)+11,y:176,dx:-1,dy:0},{x:280,y:ys[0]-11,dx:0,dy:1},{x:280,y:ys.at(-1)+11,dx:0,dy:-1}];`);
for(let i=0;i<4;i++){
g.run(`shoreClimb=null;swimming=true;player.x=approaches[${i}].x;player.y=approaches[${i}].y;moveExplorer(approaches[${i}].dx,approaches[${i}].dy)`);
assert.equal(g.run('!!shoreClimb'),true);assert.equal(g.run('inside(player.x,player.y,mainPoly)'),false);
assert.ok(g.run('Math.hypot(shoreClimb.edge.x-player.x,shoreClimb.edge.y-player.y)>=10'));
const start=g.run('JSON.stringify([player.x,player.y])');
g.run('advanceSwimming(150);draw()');assert.equal(g.run('JSON.stringify([player.x,player.y])'),start);
assert.equal(g.run('inside(shoreClimb.edge.x,shoreClimb.edge.y,mainPoly)'),true);
g.run('advanceSwimming(250);draw()');assert.notEqual(g.run('JSON.stringify([player.x,player.y])'),start);
g.run('advanceSwimming(250);draw()');assert.equal(g.run('shoreClimb'),null);assert.equal(g.run('swimming'),false);assert.equal(g.run('canWalk(player.x,player.y)'),true);
}
g.run('swimming=true;player.x=740;player.y=325;moveExplorer(0,1)');assert.equal(g.run('shoreClimb'),null);
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

test('Loch Ness sightings use timed checks, stay in water, and expire',()=>{
const g=game();g.run('player.x=430;player.y=310;Math.random=()=>0;nextLochDragon=30000');
g.run('advanceLochDragon(29999)');assert.equal(g.run('lochDragon'),null);
g.run('advanceLochDragon(1);draw()');assert.equal(g.run('!!lochDragon'),true);
assert.equal(g.run('sharkWater(lochDragon.x,lochDragon.y)'),true);
for(let i=0;i<100;i++)g.run('advanceLochDragon(40)');
assert.equal(g.run('sharkWater(lochDragon.x,lochDragon.y)'),true);
g.run('advanceLochDragon(18000)');assert.equal(g.run('lochDragon'),null);
g.run('Math.random=()=>.9;nextLochDragon=0;advanceLochDragon(1)');assert.equal(g.run('lochDragon'),null);
assert.ok(g.run('nextLochDragon')>=30000&&g.run('nextLochDragon')<=60000);
g.run('advanceLochDragon(0)');assert.equal(g.run('lochDragon'),null);
});

test('a lucky swimmer catches and rides the dragon, with dragon controls and no shark spawned on dismount',()=>{
const g=game();const sighting='lochDragon={x:435,y:310,heading:0,age:1000,duration:18000}';
g.run(`player.x=430;player.y=310;${sighting};latchLochDragon()`);assert.equal(g.run('sharkRide'),null);
g.run('swimming=true;advanceSwimming(0)');assert.equal(g.run('sharkRide.kind'),'dragon');assert.equal(g.run('lochDragon'),null);
assert.match(g.node('#waterControls').textContent,/LOCH NESS MONSTER/);assert.match(g.node('#mapSharkExit').textContent,/Hop off monster/);
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

test('idle swimmers tread with only their head and gear visible, then resume full strokes',()=>{
const g=game();g.run(`swimming=true;player.x=430;player.y=310;nextSharkFin=1e9;nextLochDragon=1e9;
const originalEllipse=ellipse,originalPolygon=polygon,originalSnorkel=swimSnorkel;let drawnColors=[],snorkels=0;
ellipse=(x,y,rx,ry,color)=>{drawnColors.push(color);originalEllipse(x,y,rx,ry,color)};
polygon=(points,color,dy)=>{drawnColors.push(color);originalPolygon(points,color,dy)};
swimSnorkel=(...args)=>{snorkels++;originalSnorkel(...args)};
drawSwimmingCharacter(player.x,player.y)`);
assert.equal(g.run('drawnColors.includes(characterColors().shirt)'),false);assert.equal(g.run('drawnColors.includes("#3e5555")'),false);assert.equal(g.run('drawnColors.includes("#f2c992")'),true);assert.equal(g.run('snorkels'),1);
for(let i=0;i<12;i++)g.run('moveExplorer(2.6,0);advanceSwimming(40)');
g.run('drawnColors=[];drawSwimmingCharacter(player.x,player.y)');assert.equal(g.run('drawnColors.includes(characterColors().shirt)'),true);assert.equal(g.run('drawnColors.includes("#3e5555")'),true);
const position=g.run('JSON.stringify([player.x,player.y])');g.run('advanceSwimming(1200);drawnColors=[];drawSwimmingCharacter(player.x,player.y)');
assert.equal(g.run('JSON.stringify([player.x,player.y])'),position);assert.equal(g.run('drawnColors.includes(characterColors().shirt)'),false);assert.equal(g.run('drawnColors.includes("#3e5555")'),false);assert.equal(g.run('drawnColors.includes("#f2c992")'),true);
g.run('moveExplorer(2.6,0);advanceSwimming(40);drawnColors=[];drawSwimmingCharacter(player.x,player.y)');assert.equal(g.run('drawnColors.includes(characterColors().shirt)'),true);
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

test('bridge and dock entrances animate one step up and step down without blocking walking',()=>{
const g=game();g.run('const bridge=crossings[0];player.x=bridge.x-.5;player.y=bridge.y+bridge.h/2;moveExplorer(1,0)');
assert.equal(g.run('timberStep.from'),0);assert.equal(g.run('timberStep.to'),3);assert.equal(g.run('canWalk(player.x,player.y)'),true);
g.run('const originalCharacter=character;let kneeLift=0;character=(x,y,pet,lift)=>{kneeLift=lift||0;originalCharacter(x,y,pet,lift)};advanceSwimming(140);drawWalkingExplorer()');
assert.ok(g.run('kneeLift')>3.9);
const before=g.run('player.x');g.run('moveExplorer(1,0)');assert.ok(g.run('player.x')>before);
g.run('advanceSwimming(140);drawWalkingExplorer()');assert.equal(g.run('timberStep'),null);assert.equal(g.run('kneeLift'),0);
g.run('moveExplorer(-3,0)');assert.equal(g.run('timberStep.from'),3);assert.equal(g.run('timberStep.to'),0);
g.run('advanceSwimming(280);const pier=piers[0];player.x=pier.x+pier.w/2;player.y=pier.y-.5;moveExplorer(0,1)');
assert.equal(g.run('timberStep.to'),3);g.run('advanceSwimming(140);draw()');assert.ok(g.run('kneeLift')>3.9);
g.run('switchAge("9-10")');assert.equal(g.run('timberStep'),null);
assert.equal(g.run('!!walkableTimberAt(woodlandBridge.x+woodlandBridge.w/2,woodlandBridge.y+woodlandBridge.h/2)'),false);
g.run('state.upgrades=["bridge"]');assert.equal(g.run('!!walkableTimberAt(woodlandBridge.x+woodlandBridge.w/2,woodlandBridge.y+woodlandBridge.h/2)'),true);
});
test('single timber treads are drawn only at ends that connect to a beach',()=>{
const g=game();g.run('const originalRect=rect;let treads=[];rect=(...args)=>{if(args[4]==="#d2b780")treads.push(args);originalRect(...args)};drawTimberEntranceSteps(crossings[0])');
assert.equal(g.run('treads.length'),2);g.run('treads=[];drawTimberEntranceSteps(piers[0])');assert.equal(g.run('treads.length'),1);
g.run('treads=[];drawTimberEntranceSteps({x:600,y:300,w:40,h:14})');assert.equal(g.run('treads.length'),0);
});
test('timber spans touch the beach without long inland overlaps and remain walkable',()=>{
const g=game();g.run('state.ferryTicket=true;state.upgrades=["bridge"]');
const spans=JSON.parse(g.run('JSON.stringify([...crossings,woodlandBridge,...piers])'));
for(const span of spans){
if(span.dock?.islandId)g.run(`state.boatIsland=${JSON.stringify(span.dock.islandId)}`);else g.run('state.boatIsland=null');
const horizontal=span.w>span.h,length=horizontal?span.w:span.h;let leadingLand=0,trailingLand=0;
const at=along=>({x:span.x+(horizontal?along:span.w/2),y:span.y+(horizontal?span.h/2:along)});
const onLand=along=>{const p=at(along);return g.run(`islandPolys.some(poly=>inside(${p.x},${p.y},poly))`);};
for(let along=0;along<=length;along++){
const p=at(along);assert.equal(g.run(`canWalk(${p.x},${p.y})`),true,JSON.stringify(p));
}
while(leadingLand<length&&onLand(leadingLand))leadingLand++;
while(trailingLand<length&&onLand(length-trailingLand))trailingLand++;
assert.ok(leadingLand<=4,`inland start: ${leadingLand}`);assert.ok(trailingLand<=4,`inland end: ${trailingLand}`);
}
g.run('draw()');
});

test('shark crashes tumble quickly, pause prone for a second, shake, and stand before walking',()=>{
const g=game();g.run(`swimming=true;player.y=176;
const shoreX=Array.from({length:320},(_,i)=>i+20).find(x=>inside(x,176,islandPolys[0]));
player.x=shoreX-28;sharkFins=[{x:player.x+2,y:176,vx:.02,vy:0,age:500,duration:4000}];latchShark();advanceSwimming(16)`);
assert.equal(g.run('sharkRide.landing.duration'),280);
g.run('advanceSwimming(300);draw()');assert.equal(g.run('sharkRide'),null);assert.equal(g.run('swimming'),false);
assert.equal(g.run('!!shoreRecovery'),true);assert.equal(g.run('canWalk(player.x,player.y)'),true);
const x=g.run('player.x'),y=g.run('player.y');
g.run('moveExplorer(5,0);diveFromIsland();openFishing();openFerry();visit(0)');assert.equal(g.run('player.x'),x);assert.equal(g.run('player.y'),y);
assert.equal(g.run('swimming'),false);assert.equal(g.run('nearby()'),-1);
g.run('advanceSwimming(999-shoreRecovery.elapsed);draw()');assert.match(g.node('#waterControls').textContent,/Catching your breath/);
g.run('advanceSwimming(1);draw()');assert.match(g.node('#waterControls').textContent,/Shaking it off/);
g.run('advanceSwimming(450);draw()');assert.match(g.node('#waterControls').textContent,/Getting back up/);
g.run('advanceSwimming(450);draw()');assert.equal(g.run('shoreRecovery'),null);
g.run('moveExplorer(1,0)');assert.ok(g.run('player.x')>x);
g.run('shoreRecovery={elapsed:0,heading:0}');g.node('#profileName').value='Recovered explorer';g.run('createProfile()');assert.equal(g.run('shoreRecovery'),null);
});

test('motorboat follows actual travel, trails a wake through turns, and stops churning when blocked',()=>{
const g=game();g.run('state.catches={barracuda:5};launchBoat();player.x=430;player.y=310;nextLochDragon=1e9');
for(let i=0;i<8;i++)g.run('advanceSwimming(40);moveExplorer(5,0)');
assert.equal(g.run('boatMotion.heading'),0);assert.ok(g.run('boatMotion.power')>.5);assert.ok(g.run('boatMotion.wake.length')>0);
assert.equal(g.run('boatMotion.wake.every(w=>w.x<player.x&&w.y===310)'),true);
const first=JSON.parse(g.run('JSON.stringify(boatMotion.wake[0])'));
g.run('moveExplorer(0,8);advanceSwimming(40);draw()');assert.equal(g.run('boatMotion.heading'),Math.PI/2);
assert.equal(g.run('boatMotion.wake[0].x'),first.x);assert.equal(g.run('boatMotion.wake[0].y'),first.y);
g.run('moveExplorer(-8,0)');assert.equal(g.run('boatMotion.heading'),Math.PI);
g.run('moveExplorer(0,-8)');assert.equal(g.run('boatMotion.heading'),-Math.PI/2);
g.run('moveExplorer(5,5)');assert.equal(g.run('boatMotion.heading'),Math.PI/4);
const count=g.run('boatMotion.wake.length');g.run('player.x=25;player.y=25;moveExplorer(-5,0)');
assert.equal(g.run('player.x'),25);assert.equal(g.run('boatMotion.wake.length'),count);assert.equal(g.run('boatMotion.heading'),Math.PI/4);
g.run('advanceSwimming(2000);draw()');assert.equal(g.run('boatMotion.wake.length'),0);assert.ok(g.run('boatMotion.power')<.01);
});

test('parked motorboat keeps its heading on reboarding and clears its trail on returning to dock',()=>{
const g=game();g.run('state.catches={barracuda:5};launchBoat();player.x=430;player.y=310;moveExplorer(0,10);advanceSwimming(40);exitBoat();if(boatAnchorCasting())advanceSwimming(FISH_CAST_DURATION)');
assert.equal(g.run('boatMotion.heading'),Math.PI/2);
g.run('advanceSwimming(700);player.x=boatPosition.x;player.y=boatPosition.y;boardOwnBoat();draw()');assert.equal(g.run('boating'),true);assert.equal(g.run('boatMotion.heading'),Math.PI/2);
g.run('moveExplorer(8,0)');assert.ok(g.run('boatMotion.wake.length')>0);
g.run('returnBoat()');assert.equal(g.run('boatMotion.wake.length'),0);assert.equal(g.run('boatMotion.power'),0);
});

test('blue marlin surface in open water while swimming and clear after leaving the water',()=>{
const g=game();g.run('swimming=true;player.x=430;player.y=310;Math.random=()=>0;nextBlueMarlin=1;advanceBlueMarlin(1);draw()');
assert.equal(g.run('blueMarlins.length'),1);assert.equal(g.run('blueMarlins.every(f=>sharkWater(f.x,f.y))'),true);
g.run('advanceBlueMarlin(600);draw()');assert.ok(g.run('blueMarlins[0].age')>=600);
g.run('advanceBlueMarlin(21000)');assert.equal(g.run('blueMarlins.length'),1); // A new timed visitor may replace the expired one.
g.run('swimming=false;advanceBlueMarlin(40)');assert.equal(g.run('blueMarlins.length'),0);
});

test('swimming close to a blue marlin catches a steerable ride without awarding a fishing catch',()=>{
const g=game();g.run('player.x=430;player.y=310;blueMarlins=[{x:435,y:310,heading:0,age:600,duration:20000}];latchBlueMarlin()');
assert.equal(g.run('sharkRide'),null);g.run('swimming=true;advanceSwimming(0);draw()');
assert.equal(g.run('sharkRide.kind'),'marlin');assert.equal(g.run('blueMarlins.length'),0);
assert.match(g.node('#waterControls').textContent,/BLUE MARLIN/);assert.match(g.node('#mapSharkExit').textContent,/Hop off marlin/);
g.run('keys.add("down");advanceSwimming(100);draw()');assert.ok(g.run('player.y')>310);assert.ok(g.run('sharkRide.heading')>0);
assert.equal(g.run('totalCatches()'),0);assert.equal(g.run('state.crystals'),0);
const fins=g.run('sharkFins.length');g.node('#mapSharkExit').onclick();assert.equal(g.run('sharkRide'),null);assert.equal(g.run('swimming'),true);assert.equal(g.run('sharkFins.length'),fins);
g.run('blueMarlins=[{x:player.x+2,y:player.y,heading:0,age:600,duration:20000}];latchBlueMarlin()');assert.equal(g.run('sharkRide'),null);
});

test('marlin rides use shark shore recovery and clear on player changes',()=>{
const g=game();g.run(`swimming=true;player.y=176;
const shoreX=Array.from({length:320},(_,i)=>i+20).find(x=>inside(x,176,islandPolys[0]));
player.x=shoreX-28;blueMarlins=[{x:player.x+2,y:176,heading:0,age:600,duration:20000}];latchBlueMarlin();advanceSwimming(16);draw()`);
assert.equal(g.run('!!sharkRide.landing'),true);g.run('advanceSwimming(1500);draw()');
assert.equal(g.run('sharkRide'),null);assert.equal(g.run('!!shoreRecovery'),true);assert.equal(g.run('swimming'),false);assert.equal(g.run('canWalk(player.x,player.y)'),true);g.run('advanceSwimming(1000)');
g.run('swimming=true;player.x=740;player.y=325');assert.equal(g.run('sharkShoreLanding(Math.PI/2)'),null);
g.run("blueMarlins=[{x:430,y:310,heading:0,age:600,duration:20000}];switchAge('5-6')");assert.equal(g.run('blueMarlins.length'),0);
g.run('swimming=true;player.x=430;player.y=310;blueMarlins=[{x:435,y:310,heading:0,age:600,duration:20000}];latchBlueMarlin()');
g.node('#profileName').value='Marlin rider';g.run('createProfile()');assert.equal(g.run('sharkRide'),null);assert.equal(g.run('blueMarlins.length'),0);
});

test('jump splash begins at water contact and stays at the impact as the swimmer moves away',()=>{
const g=game();
g.run('startDive({x:430,y:310});diveAnimation.style="backflip";nextSharkFin=1e9;nextBlueMarlin=1e9;nextLochDragon=1e9;advanceSwimming(433);draw()');
assert.equal(g.run('waterEntrySplash'),null);
g.run('advanceSwimming(1);draw()');
assert.equal(g.run('player.x'),430);assert.equal(g.run('player.y'),310);
assert.equal(g.run('waterEntrySplash.elapsed'),0);assert.equal(g.run('waterEntrySplash.scale'),2.2);
g.run('advanceSwimming(266);moveExplorer(8,0);draw()');
assert.equal(g.run('diveAnimation'),null);assert.ok(g.run('player.x')>430);
assert.equal(g.run('waterEntrySplash.x'),430);assert.equal(g.run('waterEntrySplash.y'),310);
g.run('advanceSwimming(500);draw()');assert.equal(g.run('waterEntrySplash.elapsed'),766);
g.run('advanceSwimming(284);draw()');assert.equal(g.run('waterEntrySplash'),null);
g.run('startDive({x:440,y:310});diveAnimation.style="dive";advanceSwimming(500);draw()');
assert.equal(g.run('waterEntrySplash.scale'),1.7);
g.run('returnBoat();advanceSwimming(1);draw()');assert.equal(g.run('waterEntrySplash'),null);
});

test('returning from a swim tosses goggles back into open water once, then splashes and fades',()=>{
const g=game();g.run(`swimming=true;player.y=176;nextSharkFin=1e9;nextBlueMarlin=1e9;nextLochDragon=1e9;
const shoreX=Array.from({length:320},(_,i)=>i+20).find(x=>inside(x,176,islandPolys[0]));
player.x=shoreX-8;moveExplorer(2,0)`);
assert.equal(g.run('goggleToss'),null);assert.equal(g.run('!!shoreClimb'),true);
g.run('advanceSwimming(650);draw()');assert.equal(g.run('swimming'),false);assert.equal(g.run('!!goggleToss'),true);
assert.equal(g.run('openSea(goggleToss.to.x,goggleToss.to.y)'),true);assert.ok(g.run('goggleToss.to.x')<g.run('player.x'));
const target=JSON.parse(g.run('JSON.stringify(goggleToss.to)'));
g.run('advanceSwimming(300);moveExplorer(1,0);draw()');assert.equal(g.run('goggleToss.elapsed'),300);
assert.equal(g.run('goggleToss.to.x'),target.x);assert.equal(g.run('goggleToss.to.y'),target.y);
g.run('advanceSwimming(300);draw()');assert.equal(g.run('goggleToss.elapsed'),600);
g.run('advanceSwimming(700);draw()');assert.equal(g.run('goggleToss'),null);
});

test('goggles toss also accompanies mount landings and swimming returns, and clears on profile changes',()=>{
const g=game();g.run(`swimming=true;player.y=176;
const shoreX=Array.from({length:320},(_,i)=>i+20).find(x=>inside(x,176,islandPolys[0]));
player.x=shoreX-28;sharkFins=[{x:player.x+2,y:176,vx:.02,vy:0,age:500,duration:4000}];latchShark();advanceSwimming(320);draw()`);
assert.equal(g.run('!!shoreRecovery'),true);assert.equal(g.run('!!goggleToss'),true);assert.equal(g.run('openSea(goggleToss.to.x,goggleToss.to.y)'),true);
g.run('shoreRecovery=null;swimming=true;player.x=430;player.y=310;returnBoat();draw()');assert.equal(g.run('!!goggleToss'),true);assert.equal(g.run('openSea(goggleToss.to.x,goggleToss.to.y)'),true);
g.node('#profileName').value='Dry explorer';g.run('createProfile()');assert.equal(g.run('goggleToss'),null);
});

test('enabled power shows the meter and correct discovery or flash answers restore it',()=>{
const g=game();assert.equal(g.run('POWER_ENABLED'),true);assert.equal(g.node('#powerMeter').hidden,false);
g.run('state.power=0;openQuestion(0)');g.node('#answer').value='-999';g.run('checkAnswer()');assert.equal(g.run('state.power'),0);
g.node('#answer').value=g.run('String(questions[0].answer)');g.run('checkAnswer()');assert.equal(g.run('state.power'),25);assert.equal(g.run('state.crystals'),5);g.run('checkAnswer()');assert.equal(g.run('state.power'),25);
g.node('#challenge').close();g.run('startFlash()');g.node('#flashAnswer').value=g.run('String(flashRun.question.answer)');g.run('submitFlash()');assert.equal(g.run('state.power'),50);
});
test('power drains in water, returns exhausted swimmers to land, and blocks zero-power launches',()=>{
const g=game({power:0,solved:[],upgrades:[]});assert.equal(g.run('hasSwimPower()'),false);
g.run('startDive({x:430,y:310});state.catches={barracuda:5};launchBoat()');assert.equal(g.run('swimming'),false);assert.equal(g.run('boating'),false);
g.run('state.power=1;swimming=true;player.x=600;player.y=350;nextSharkFin=1e9;nextLochDragon=1e9;nextBlueMarlin=1e9;advanceSwimming(1000)');assert.ok(Math.abs(g.run('state.power')-.35)<1e-9);assert.equal(g.run('swimming'),true);
g.run('advanceSwimming(1000)');assert.equal(g.run('swimming'),false);assert.equal(g.run('state.power'),0);assert.equal(g.run('canWalk(player.x,player.y)'),true);assert.match(g.node('#powerHelp').textContent,/Solve a problem/);
});
test('legacy power values remain compatible across age changes, resets, and reloads',()=>{
const g=game({power:37,solved:[],upgrades:[]});assert.equal(g.run('state.power'),37);
g.run('save();switchAge("9-10")');assert.equal(g.run('state.power'),37);g.run('state.power=0;save();switchAge("11-12")');assert.equal(g.run('state.power'),0);
g.node('#resetBtn').onclick();g.node('#confirmReset').onclick();assert.equal(g.run('state.power'),0);
const restored=game(null,g.snapshot());assert.equal(restored.run('state.power'),0);
g.node('#profileName').value='Power Explorer';g.run('createProfile()');assert.equal(g.run('state.power'),100);g.run('state.power=12;save();switchProfile("legacy")');assert.equal(g.run('state.power'),0);g.run('switchProfile("p1")');assert.equal(g.run('state.power'),12);
});

test('outer islands cannot be visited by journal teleport, swimming, or creature landings',()=>{
const g=game();assert.equal(g.run('boatIslands.length'),12);assert.equal(g.run('WORLD.width*WORLD.height'),960*600*10);
const start=g.run('JSON.stringify([player.x,player.y])');g.run('visit(5);visitBoatIsland(0)');assert.equal(g.run('JSON.stringify([player.x,player.y])'),start);
for(let i=0;i<12;i++){
g.run(`state.boatIsland=null;swimming=false;player.x=boatIslands[${i}].x;player.y=boatIslands[${i}].y`);assert.equal(g.run('canWalk(player.x,player.y)'),false);
g.run(`swimming=true;player.x=boatIslands[${i}].dock.x;player.y=boatIslands[${i}].dock.y+12`);
assert.equal(g.run('swimShoreContact(0,-1)'),null);
g.run(`player.x=boatIslands[${i}].x;player.y=boatIslands[${i}].y`);assert.equal(g.run('canWalk(player.x,player.y)'),false);
}
});
test('all twelve boat-only islands support docking, practice, and reboarding',()=>{
const g=game();g.run('state.catches={barracuda:5};state.sponsorshipAnnounced=true');
for(let i=0;i<12;i++){
g.run(`boating=true;swimming=false;player.x=boatIslands[${i}].dock.x+43;player.y=boatIslands[${i}].dock.y+15;boatPosition={x:player.x,y:player.y};exitBoat();if(boatAnchorCasting())advanceSwimming(FISH_CAST_DURATION)`);
assert.equal(g.run('boating'),false);assert.equal(g.run('swimming'),false);assert.equal(g.run('state.boatIsland'),g.run(`boatIslands[${i}].id`));assert.equal(g.run('canWalk(player.x,player.y)'),true);assert.equal(g.run('canBoardIslandBoat()'),true);
g.run(`player.x=boatIslands[${i}].x;player.y=boatIslands[${i}].y+30;visitBoatIsland(${i})`);assert.equal(g.node('#challenge').open,true);assert.match(g.node('#challengeCategory').textContent,new RegExp(g.run(`boatIslands[${i}].name`)));g.node('#challenge').close();
g.run(`player.x=boatIslands[${i}].dock.x;player.y=boatIslands[${i}].dock.y-18;boardOwnBoat()`);assert.equal(g.run('boating'),true);assert.equal(g.run('canWalk(player.x,player.y)'),true);
}
assert.equal(g.run('state.boatIslandsVisited.length'),12);g.run('journal()');assert.match(g.node('#journalList').innerHTML,/Palm Cove/);assert.match(g.node('#journalList').innerHTML,/Driftwood Isle/);
});
test('outer island arrival and the parked boat survive reloads without stranding the explorer',()=>{
const g=game();g.run('state.catches={barracuda:5};boating=true;player.x=boatIslands[0].dock.x+43;player.y=boatIslands[0].dock.y+15;boatMotion.heading=.75;exitBoat();if(boatAnchorCasting())advanceSwimming(FISH_CAST_DURATION)');
const parked=g.run('JSON.stringify(boatPosition)'),restored=game(null,g.snapshot());
assert.equal(restored.run('state.boatIsland'),'palm-cove');assert.equal(restored.run('canWalk(player.x,player.y)'),true);assert.equal(restored.run('JSON.stringify(boatPosition)'),parked);assert.equal(restored.run('boatMotion.heading'),.75);
restored.run('boardOwnBoat()');assert.equal(restored.run('boating'),true);
});
test('expanded ocean supports camera movement, creatures, and fishing beyond the old boundaries',()=>{
const g=game();g.run('state.catches={barracuda:5};state.sponsorshipAnnounced=true;boating=true;player.x=3000;player.y=1500;draw()');assert.equal(g.run('canWalk(3100,1620)'),true);assert.equal(g.run('canWalk(3200,1800)'),false);assert.ok(g.run('camera.x')>960);assert.ok(g.run('camera.y')>600);
g.run('player.x=3190;player.y=1790;draw()');assert.equal(g.run('camera.x+WORLD.viewWidth'),3200);assert.equal(g.run('camera.y+WORLD.viewHeight'),1800);
g.run('player.x=3000;player.y=1500;openFishing();{const f=fishingTargets(fishingTime+FISH_CAST_DURATION)[0];castFishing(f.x,f.y);advanceFishing(FISH_CAST_DURATION);}');assert.equal(g.run('!!hookedFish'),true);
g.run('for(let i=0;i<6;i++){reelFishing();advanceFishing(180)}');assert.equal(g.run('state.catches.barracuda'),6);
g.run('stopFishing();boating=false;swimming=true;player.x=3000;player.y=1500;sharkFins=[{x:3040,y:1500,vx:.02,vy:0,age:500,duration:4000}];nextSharkFin=1e9;advanceSharkFins(100)');assert.equal(g.run('sharkFins.length'),1);assert.equal(g.run('sharkWater(3100,1600)'),true);
});

test('cottage pet dragon takes off, flies over water, and lands with its rider',()=>{
const g=game();assert.equal(g.run('canMountPetDragon()'),true);assert.equal(g.node('#mapDragonMount').hidden,false);
g.run('near=100;interact();draw()');assert.equal(g.run('dragonFlight.stage'),'takeoff');
const launchX=g.run('player.x');g.run('moveExplorer(10,0)');assert.equal(g.run('player.x'),launchX);
g.run('advanceSwimming(650);draw()');assert.equal(g.run('dragonFlight.stage'),'flying');assert.equal(g.run('dragonFlight.altitude'),30);
assert.equal(g.node('#mapDragonLand').hidden,false);assert.equal(g.node('#mapDragonLand').disabled,false);
g.run('moveExplorer(50,60)');assert.equal(g.run('player.x'),launchX+50);assert.ok(g.run('dragonFlight.heading')>0);
g.run('player.x=430;player.y=310;advanceSwimming(1000);draw()');assert.equal(g.run('swimming'),false);assert.equal(g.run('boating'),false);assert.equal(g.run('state.power'),100);
g.node('#mapDragonLand').onclick();assert.equal(g.run('dragonFlight.stage'),'splashdown');
g.run('advanceSwimming(500);landPetDragon();advanceSwimming(650);player.x=500;player.y=150;landPetDragon();draw()');assert.equal(g.run('dragonFlight.stage'),'landing');
g.run('advanceSwimming(500);draw()');assert.equal(g.run('dragonFlight'),null);assert.equal(g.run('canWalk(player.x,player.y)'),true);
assert.equal(g.run('petDragonPosition.x'),g.run('player.x'));assert.equal(g.run('canMountPetDragon()'),true);
});

test('flying dragon respects island gates and can always return to the cottage',()=>{
const g=game();g.run('mountPetDragon();advanceSwimming(650);player.x=740;player.y=483;landPetDragon()');
assert.equal(g.run('dragonFlight.stage'),'flying');
g.run('state.ferryTicket=true;landPetDragon();advanceSwimming(500)');assert.equal(g.run('dragonFlight'),null);
g.run('mountPetDragon();advanceSwimming(650);player.x=boatIslands[0].x;player.y=boatIslands[0].y;landPetDragon()');assert.equal(g.run('dragonFlight.stage'),'flying');
g.run('moveExplorer(-100000,-100000)');assert.ok(g.run('player.x')>=32);assert.ok(g.run('player.y')>=50);
g.node('#mapDragonHome').onclick();g.run('advanceSwimming(500);draw()');assert.equal(g.run('dragonFlight'),null);
assert.equal(g.run('player.x'),g.run('PET_DRAGON_HOME.x'));assert.equal(g.run('player.y'),g.run('PET_DRAGON_HOME.y'));
});

test('dragon flight saves safe ground and clears cleanly on age or profile changes',()=>{
const g=game();const x=g.run('player.x'),y=g.run('player.y');
g.run('mountPetDragon();advanceSwimming(650);player.x=1200;player.y=600;save()');
assert.equal(g.run('state.x'),x);assert.equal(g.run('state.y'),y);
const restored=game(null,g.snapshot());assert.equal(restored.run('dragonFlight'),null);assert.equal(restored.run('player.x'),x);assert.equal(restored.run('player.y'),y);
const airX=g.run('player.x');g.run('openFerry();openFishing();visit(1);launchBoat()');assert.equal(g.run('player.x'),airX);assert.equal(g.run('dragonFlight.stage'),'flying');
g.run("switchAge('7-8')");assert.equal(g.run('dragonFlight'),null);assert.equal(g.run('petDragonPosition.x'),g.run('PET_DRAGON_HOME.x'));
g.run('mountPetDragon();advanceSwimming(650)');g.node('#profileName').value='Dragon pilot';g.run('createProfile()');assert.equal(g.run('dragonFlight'),null);assert.equal(g.run('canWalk(player.x,player.y)'),true);
});

test('pet dragon breathes short sporadic fire bursts on the ground and in flight',()=>{
const g=game();g.run('Math.random=()=>.5;nextPetDragonFire=2000;advancePetDragon(1999)');assert.equal(g.run('petDragonFire'),null);
g.run('advancePetDragon(1)');assert.equal(g.run('petDragonFire.elapsed'),0);
g.run('advancePetDragon(200);draw()');assert.equal(g.run('petDragonFire.elapsed'),200);
g.run('draw();draw()');assert.equal(g.run('petDragonFire.elapsed'),200);
g.node('#challenge').open=true;g.run('advancePetDragonFire(100)');assert.equal(g.run('petDragonFire.elapsed'),200);g.node('#challenge').open=false;
g.run('advancePetDragon(650)');assert.equal(g.run('petDragonFire'),null);assert.ok(g.run('nextPetDragonFire')>=2000&&g.run('nextPetDragonFire')<=5000);
g.run('mountPetDragon();advanceSwimming(650);nextPetDragonFire=1;advanceSwimming(1);advanceSwimming(200);dragonFlight.heading=Math.PI/2;draw()');assert.equal(g.run('petDragonFire.elapsed'),200);
g.run("switchAge('5-6')");assert.equal(g.run('petDragonFire'),null);assert.ok(g.run('nextPetDragonFire')>=2000&&g.run('nextPetDragonFire')<=5000);
});

test('ferry and fishing boat share steering speed, turns, collision handling, and wake dynamics',()=>{
const ferry=game(),fishing=game();ferry.run('state.ferryTicket=true;boardFerry()');fishing.run('state.catches={barracuda:5};launchBoat()');
for(const g of [ferry,fishing]){
g.run('player.x=3000;player.y=1500;keys.add("right")');for(let t=16;t<=160;t+=16)g.run(`tick(${t})`);
g.run('keys.clear();keys.add("down")');for(let t=176;t<=320;t+=16)g.run(`tick(${t})`);
}
const motion='JSON.stringify({x:player.x,y:player.y,heading:boatMotion.heading,power:boatMotion.power,wake:boatMotion.wake})';assert.equal(ferry.run(motion),fishing.run(motion));assert.ok(ferry.run('boatMotion.wake.length')>0);
for(const g of [ferry,fishing]){const before=g.run('JSON.stringify([player.x,player.y])');g.run('keys.clear();advanceSwimming(1200)');assert.equal(g.run('JSON.stringify([player.x,player.y])'),before);assert.ok(g.run('boatMotion.power')<.01);g.run('player.x=188;player.y=170;moveExplorer(5,-10)');assert.equal(g.run('player.x'),188);}
});
test('the ferry is manually driven and supports casting and reeling without fishing sponsorship',()=>{
const g=game();g.run('state.ferryTicket=true;state.crystals=5;boardFerry()');assert.equal(g.run('boating'),true);assert.equal(g.run('activeVessel'),'ferry');assert.equal(g.run('sponsored()'),false);
const start=g.run('JSON.stringify([player.x,player.y])');g.run('advanceSwimming(3500)');assert.equal(g.run('JSON.stringify([player.x,player.y])'),start);
g.run('player.x=600;player.y=350;openFishing();buyRod()');assert.equal(g.run('player.x'),600);assert.equal(g.run('player.y'),350);assert.equal(g.run('fishingActive'),true);assert.match(g.node('#mapBoatFish').textContent,/ferry/);
g.run('{const f=fishingTargets(fishingTime+FISH_CAST_DURATION)[0];castFishing(f.x,f.y)}');assert.equal(g.run('pendingCast.origin.x'),g.run('fishingAngler().x+4'));
g.run('advanceFishing(FISH_CAST_DURATION);for(let i=0;i<6;i++){reelFishing();advanceFishing(180);draw()}');assert.equal(g.run('state.catches.barracuda'),1);assert.equal(g.run('activeVessel'),'ferry');assert.equal(g.run('boating'),true);
g.run('stopFishing();moveExplorer(2,0)');assert.equal(g.run('player.x'),602);
});
test('ferry offshore exits and reboarding work with a ferry pass and no sponsorship',()=>{
const g=game();g.run('state.ferryTicket=true;boardFerry();player.x=600;player.y=350;exitBoat();if(boatAnchorCasting())advanceSwimming(FISH_CAST_DURATION)');assert.equal(g.run('swimming'),true);assert.equal(g.run('activeVessel'),'ferry');assert.equal(g.run('sponsored()'),false);
g.run('advanceSwimming(700)');assert.equal(g.node('#mapBoatBoard').hidden,false);g.run('boardOwnBoat()');assert.equal(g.run('boating'),true);assert.equal(g.run('swimming'),false);assert.equal(g.run('player.x'),600);
});
test('ferry outer-island docking and its vessel type survive reloads and permit reboarding',()=>{
const g=game();g.run('state.ferryTicket=true;boardFerry();player.x=boatIslands[1].dock.x+43;player.y=boatIslands[1].dock.y+15;boatMotion.heading=.9;exitBoat();if(boatAnchorCasting())advanceSwimming(FISH_CAST_DURATION)');assert.equal(g.run('state.boatIsland'),'coral-key');assert.equal(g.run('canBoardIslandBoat()'),true);assert.equal(g.run('state.parkedBoat.vessel'),'ferry');
const restored=game(null,g.snapshot());assert.equal(restored.run('activeVessel'),'ferry');assert.equal(restored.run('sponsored()'),false);assert.equal(restored.run('canBoardIslandBoat()'),true);assert.equal(restored.run('boatMotion.heading'),.9);restored.run('boardOwnBoat();draw()');assert.equal(restored.run('boating'),true);
});

test('pet dragon splashes down, swims with a wake, then takes off again',()=>{
const g=game();g.run('mountPetDragon();advanceSwimming(650);player.x=430;player.y=310');
g.node('#mapDragonLand').onclick();assert.equal(g.run('dragonFlight.stage'),'splashdown');
g.run('advanceSwimming(500);draw()');assert.equal(g.run('dragonFlight.stage'),'swimming');assert.equal(g.run('dragonFlight.altitude'),0);
assert.match(g.node('#mapDragonLand').textContent,/Take off/);assert.match(g.node('#waterControls').textContent,/DRAGON SWIM/);
const x=g.run('player.x');g.run('moveExplorer(18,0);advanceSwimming(100);draw()');assert.ok(g.run('player.x')>x);assert.ok(g.run('dragonFlight.swimWake.length')>0);assert.ok(g.run('state.power')<100);
g.run('moveExplorer(0,8)');assert.equal(g.run('dragonFlight.heading'),Math.PI/2);
g.node('#mapDragonLand').onclick();assert.equal(g.run('dragonFlight.stage'),'takeoff');g.run('advanceSwimming(650);draw()');assert.equal(g.run('dragonFlight.stage'),'flying');
});

test('swimming pet dragon climbs onto permitted beach and preserves island gates',()=>{
const g=game();g.run(`mountPetDragon();advanceSwimming(650);
player.x=217;player.y=300;dragonFlight.heading=-Math.PI/2;landPetDragon();advanceSwimming(500);moveExplorer(0,-16);draw()`);
assert.equal(g.run('dragonFlight.stage'),'landing');g.run('advanceSwimming(500);draw()');assert.equal(g.run('dragonFlight'),null);assert.equal(g.run('canWalk(player.x,player.y)'),true);assert.equal(g.run('!!goggleToss'),true);
g.run("mountPetDragon();advanceSwimming(650);player.x=740;player.y=483;landPetDragon()");assert.equal(g.run('dragonFlight.stage'),'flying');
g.run('player.x=boatIslands[0].x;player.y=boatIslands[0].y;landPetDragon()');assert.equal(g.run('dragonFlight.stage'),'flying');
});

test('dragon swimming requires power and exhaustion returns its rider safely to land',()=>{
const g=game();const x=g.run('player.x'),y=g.run('player.y');
g.run('mountPetDragon();advanceSwimming(650);player.x=430;player.y=310;state.power=0;landPetDragon()');assert.equal(g.run('dragonFlight.stage'),'flying');
g.run('state.power=.1;landPetDragon();advanceSwimming(500);save()');assert.equal(g.run('state.x'),x);assert.equal(g.run('state.y'),y);
g.run('advanceSwimming(1000);draw()');assert.equal(g.run('dragonFlight'),null);assert.equal(g.run('state.power'),0);assert.equal(g.run('canWalk(player.x,player.y)'),true);
});
test('wakeboard costs exactly 25 crystals, cannot be bought twice, and saves per explorer and age',()=>{
const g=game();g.run('state.crystals=24;buyWakeboard()');assert.equal(g.run('state.wakeboard'),false);assert.equal(g.run('state.crystals'),24);
g.run('state.crystals=40;buyWakeboard();buyWakeboard()');assert.equal(g.run('state.wakeboard'),true);assert.equal(g.run('state.crystals'),15);
assert.equal(g.node('#buyWakeboard').disabled,true);assert.equal(g.node('#buyWakeboardDock').disabled,true);
const restored=game(null,g.snapshot());assert.equal(restored.run('state.wakeboard'),true);assert.equal(restored.run('state.crystals'),15);
g.run("switchAge('7-8')");assert.equal(g.run('state.wakeboard'),false);g.run("switchAge('11-12')");assert.equal(g.run('state.wakeboard'),true);
g.node('#profileName').value='Board friend';g.run('createProfile()');assert.equal(g.run('state.wakeboard'),false);
});

test('watersports dock is on Moonwater Island and requires a wakeboard before towing',()=>{
const g=game();g.node('#visitWatersports').onclick();
assert.equal(g.run('canWalk(player.x,player.y)'),true);assert.equal(g.run('inside(player.x,player.y,islandPolys[1])'),true);
assert.equal(g.run('nearby()'),101);g.node('#startWakeboard').onclick();assert.equal(g.run('wakeboardRide'),null);
g.run('state.crystals=25;buyWakeboard()');g.node('#startWakeboard').onclick();
assert.equal(g.run('!!wakeboardRide'),true);assert.equal(g.node('#mapWakeboardStop').hidden,false);assert.match(g.node('#waterControls').textContent,/WAKEBOARD/);
assert.equal(g.run('swimming'),false);assert.equal(g.run('boating'),false);assert.equal(g.run('sponsored()'),false);
g.run('draw()');
});

test('wakeboarding follows the course, constrains the tow rope, and saves safe ground',()=>{
const g=game();g.run('state.wakeboard=true;visitWatersportsDock();startWakeboarding()');assert.equal(g.run('!!wakeboardRide'),true);
const start=g.run('wakeboardRide.boat.x');g.run('advanceSwimming(400);draw()');assert.ok(g.run('wakeboardRide.boat.x')<start);assert.ok(g.run('wakeboardRide.wake.length')>0);
for(let i=0;i<20;i++){
g.run('advanceSwimming(40)');assert.equal(g.run('wakeboardHullClear(wakeboardRide.boat,wakeboardRide.heading)'),true);
assert.ok(g.run('Math.hypot(player.x-wakeboardTowPoint(wakeboardRide.boat,wakeboardRide.heading).x,player.y-wakeboardTowPoint(wakeboardRide.boat,wakeboardRide.heading).y)')<=g.run('WAKEBOARD_ROPE+WAKEBOARD_HANDLE')+1e-6);
}
g.run('save()');const restored=game(null,g.snapshot());assert.equal(restored.run('wakeboardRide'),null);assert.equal(restored.run('state.wakeboard'),true);assert.equal(restored.run('canWalk(player.x,player.y)'),true);
g.node('#mapWakeboardStop').onclick();assert.equal(g.run('wakeboardRide'),null);assert.equal(g.run('!!wakeboardBoatTrip'),true);assert.equal(g.run('player.x'),g.run('WATERSPORTS_DOCK.x'));assert.equal(g.run('canWalk(player.x,player.y)'),true);
});

test('wakeboarding pauses for dialogs and clears on profile, age, or adventure reset',()=>{
const g=game();g.run('state.wakeboard=true;visitWatersportsDock();startWakeboarding()');const x=g.run('wakeboardRide.boat.x');
g.node('#challenge').showModal();g.run('advanceSwimming(100)');assert.equal(g.run('wakeboardRide.boat.x'),x);g.node('#challenge').close();
g.run('moveExplorer(50,0);visit(0);openFerry();openFishing();mountPetDragon()');assert.equal(g.run('wakeboardRide.boat.x'),x);assert.equal(g.run('dragonFlight'),null);
g.run("switchAge('5-6')");assert.equal(g.run('wakeboardRide'),null);
g.run('state.wakeboard=true;visitWatersportsDock();startWakeboarding()');g.node('#profileName').value='Tow friend';g.run('createProfile()');assert.equal(g.run('wakeboardRide'),null);
g.run('state.wakeboard=true;visitWatersportsDock();startWakeboarding()');g.node('#resetBtn').onclick();g.node('#confirmReset').onclick();assert.equal(g.run('wakeboardRide'),null);assert.equal(g.run('state.wakeboard'),false);
});

test('programmed tow course and docking approach keep the whole boat clear of islands and timber',()=>{
const g=game();
for(let distance=0;distance<g.run('WAKEBOARD_COURSE.length');distance+=3){
assert.equal(g.run(`(()=>{const p=wakeboardCoursePose(${distance});return wakeboardHullClear(p,p.heading);})()`),true,`course distance ${distance}`);
}
for(let i=0;i<=20;i++)assert.equal(g.run(`wakeboardHullClear({x:590,y:299+(WATERSPORTS_DOCK.y+18-299)*${i}/20},Math.PI+Math.PI/2*${i}/20)`),true);
});

test('tow wake stays in world space and follows the unoccupied boat back after release',()=>{
const g=game();g.run('state.wakeboard=true;visitWatersportsDock();startWakeboarding()');
for(let i=0;i<30;i++)g.run('advanceSwimming(40)');assert.ok(g.run('wakeboardRide.wake.length')>5);
const first=JSON.parse(g.run('JSON.stringify(wakeboardRide.wake[0])'));g.run('finishWakeboarding();advanceSwimming(240);draw()');
assert.equal(g.run('wakeboardBoatTrip.wake[0].x'),first.x);assert.equal(g.run('wakeboardBoatTrip.wake[0].y'),first.y);assert.ok(g.run('wakeboardBoatTrip.wake[0].age')>first.age);
for(let i=0;i<90;i++)g.run('advanceSwimming(40)');
assert.equal(g.run(`wakeboardBoatTrip.wake.some(w=>w.serial===${first.serial})`),false);assert.equal(g.run('wakeboardBoatTrip.wake.every(w=>w.age<3200)&&wakeboardBoatTrip.wake.length<=100'),true);
});

test('long tow rope attaches at the stern and constrains the handle without pushing a slack rider',()=>{
const g=game();g.run('state.wakeboard=true;visitWatersportsDock();startWakeboarding()');
assert.ok(g.run('WAKEBOARD_ROPE')>70);
assert.equal(g.run('wakeboardTowPoint(wakeboardRide.boat,0).x'),g.run('wakeboardRide.boat.x-25'));
assert.ok(Math.abs(g.run('(()=>{const a=wakeboardTowPoint(wakeboardRide.boat,wakeboardRide.heading),h=wakeboardHandle(wakeboardRide);return Math.hypot(h.x-a.x,h.y+6-a.y);})()')-g.run('WAKEBOARD_ROPE'))<1e-6);
const slack=JSON.parse(g.run(`(()=>{const boat={x:500,y:800},rider=initialWakeboardRider(boat,0),next=predictWakeboardRider(rider,boat,boat,0,0,16),anchor=wakeboardTowPoint(boat,0);return JSON.stringify({forward:next.x-rider.x,reach:Math.hypot(next.x-anchor.x,next.y-anchor.y)});})()`));
assert.ok(slack.forward>0);assert.ok(slack.reach<g.run('WAKEBOARD_ROPE+WAKEBOARD_HANDLE'));
});

test('wakeboarder carries momentum to the outside of right and left turns, with a bounded rope',()=>{
const g=game(),results=[];
for(const direction of [1,-1]){
results.push(JSON.parse(g.run(`(()=>{let boat={x:500,y:800},heading=0,rider=initialWakeboardRider(boat,0),maxReach=0;
for(let i=0;i<50;i++){const nextHeading=heading+${direction}*.015,next={x:boat.x+Math.cos(nextHeading)*1.5,y:boat.y+Math.sin(nextHeading)*1.5};rider=predictWakeboardRider(rider,boat,next,heading,nextHeading,10);boat=next;heading=nextHeading;const anchor=wakeboardTowPoint(boat,heading);maxReach=Math.max(maxReach,Math.hypot(rider.x-anchor.x,rider.y-anchor.y));}
return JSON.stringify({boat,rider,maxReach});})()`)));
}
assert.ok(results[0].boat.y>800);assert.ok(results[0].rider.y<790,'right turn carries the rider left, rather than locking to the boat heading');
assert.ok(results[1].boat.y<800);assert.ok(results[1].rider.y>810,'left turn carries the rider right');
assert.ok(Math.abs(results[0].rider.y+results[1].rider.y-1600)<1e-6);
for(const result of results)assert.ok(result.maxReach<=g.run('WAKEBOARD_ROPE+WAKEBOARD_HANDLE')+1e-6);
});

test('rope physics stays stable across different time steps',()=>{
const g=game(),simulate=step=>JSON.parse(g.run(`(()=>{let boat={x:500,y:800},heading=0,rider=initialWakeboardRider(boat,0);
for(let t=0;t<800;){const dt=Math.min(${step},800-t),nextHeading=heading+dt*.001,next={x:boat.x+Math.cos(nextHeading)*dt*.15,y:boat.y+Math.sin(nextHeading)*dt*.15};rider=predictWakeboardRider(rider,boat,next,heading,nextHeading,dt);boat=next;heading=nextHeading;t+=dt;}
return JSON.stringify(rider);})()`));
const a=simulate(8),b=simulate(16);assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<3);
});

test('mainland beach spans the southern world edge, blocks boats, and renders beach life',()=>{
const g=game();
for(const x of [20,320,1100,2100,3180]){assert.equal(g.run(`canWalk(${x},1760)`),true);assert.ok(g.run(`beachShoreY(${x})`)<1720);}
g.run('boating=true');assert.equal(g.run('canWalk(1200,1750)'),false);g.run('boating=false;player.x=500;player.y=1740;draw()');
g.run('const originalUmbrella=beachUmbrella,originalPerson=beachPerson,originalVolley=drawBeachVolleyball,originalEllipse=ellipse;let umbrellas=0,people=0,courts=0,balls=[];beachUmbrella=(...a)=>{umbrellas++;originalUmbrella(...a)};beachPerson=(...a)=>{people++;originalPerson(...a)};drawBeachVolleyball=(...a)=>{courts++;originalVolley(...a)};ellipse=(...a)=>{if(a[4]==="#f9efcf")balls.push(a.slice(0,2));originalEllipse(...a)};frame=0;drawMainlandBeach()');
assert.ok(g.run('umbrellas')>0);assert.ok(g.run('people')>=4);assert.ok(g.run('courts')>0);const ball=g.run('JSON.stringify(balls[0])');g.run('balls=[];frame=25;drawMainlandBeach()');assert.notEqual(g.run('JSON.stringify(balls[0])'),ball);
});
test('anchor costs 50 crystals once and remains owned across ages, resets, and reloads',()=>{
const g=game();g.run('state.crystals=49;buyAnchor()');assert.equal(g.run('state.anchor'),false);assert.equal(g.run('state.crystals'),49);
g.run('state.crystals=75;state.earnedCrystals=75;buyAnchor();buyAnchor()');assert.equal(g.run('state.anchor'),true);assert.equal(g.run('state.crystals'),25);assert.equal(g.run('state.earnedCrystals'),75);
g.run('switchAge("9-10")');assert.equal(g.run('state.anchor'),true);g.node('#resetBtn').onclick();g.node('#confirmReset').onclick();assert.equal(g.run('state.anchor'),true);
const restored=game(null,g.snapshot());assert.equal(restored.run('state.anchor'),true);
g.node('#profileName').value='Beach Guest';g.run('createProfile()');assert.equal(g.run('state.anchor'),false);
});
test('ferry and fishing boat can anchor near the beach, enter it, and return to the same vessel',()=>{
for(const vessel of ['fishing','ferry']){
const g=game();g.run(`state.crystals=50;buyAnchor();state.catches={barracuda:5};state.ferryTicket=true;${vessel==='ferry'?'boardFerry()':'launchBoat()'};player.x=1200;player.y=beachShoreY(1200)-70;boatMotion.heading=.8;updateWaterControls()`);
assert.equal(g.node('#mapAnchor').hidden,false);const parked=g.run('JSON.stringify([player.x,player.y])');g.run('anchorBoatAtBeach();if(boatAnchorCasting())advanceSwimming(FISH_CAST_DURATION)');assert.equal(g.run('boating'),false);assert.equal(g.run('!!beachTransfer'),true);assert.equal(g.run('state.beachAnchor.vessel'),vessel);
g.run('advanceSwimming(450);draw()');const midway=g.run('JSON.stringify([player.x,player.y])');g.run('moveExplorer(50,0)');assert.equal(g.run('JSON.stringify([player.x,player.y])'),midway);
g.run('advanceSwimming(450);draw()');assert.equal(g.run('beachTransfer'),null);assert.equal(g.run('onMainlandBeach()'),true);assert.equal(g.run('canWalk(player.x,player.y)'),true);assert.equal(g.run('canReturnToAnchoredBoat()'),true);assert.equal(g.node('#mapBeachBoat').hidden,false);assert.equal(g.run('JSON.stringify([boatPosition.x,boatPosition.y])'),parked);
g.run('returnToAnchoredBoat();advanceSwimming(900);draw()');assert.equal(g.run('boating'),true);assert.equal(g.run('activeVessel'),vessel);assert.equal(g.run('state.beachAnchor'),null);assert.equal(g.run('boatMotion.heading'),.8);assert.equal(g.run('JSON.stringify([player.x,player.y])'),parked);
}
});
test('beach anchoring needs an owned anchor and a nearby coastline, and survives reload mid-transfer',()=>{
const g=game();g.run('state.ferryTicket=true;boardFerry();player.x=1200;player.y=beachShoreY(1200)-60;anchorBoatAtBeach();if(boatAnchorCasting())advanceSwimming(FISH_CAST_DURATION)');assert.equal(g.run('boating'),true);assert.equal(g.run('beachTransfer'),null);assert.equal(g.run('activeMapPanel'),'gearPanel');
g.run('state.crystals=50;buyAnchor();player.y=1000;anchorBoatAtBeach();if(boatAnchorCasting())advanceSwimming(FISH_CAST_DURATION)');assert.equal(g.run('beachTransfer'),null);
g.run('player.y=beachShoreY(1200)-60;anchorBoatAtBeach();if(boatAnchorCasting())advanceSwimming(FISH_CAST_DURATION);advanceSwimming(200);save()');
const restored=game(null,g.snapshot());assert.equal(restored.run('onMainlandBeach()'),true);assert.equal(restored.run('activeVessel'),'ferry');assert.equal(restored.run('canReturnToAnchoredBoat()'),true);assert.equal(restored.run('state.anchor'),true);
restored.run('returnToAnchoredBoat();advanceSwimming(900)');assert.equal(restored.run('boating'),true);
});

test('an anchor from any older age save becomes permanent profile gear and cannot be charged twice',()=>{
const g=game(null,{'skyseed-v1-5-6':JSON.stringify({solved:[],upgrades:[],anchor:true})});
assert.equal(g.run('state.anchor'),true);assert.equal(g.run('currentProfile().anchor'),true);
for(const age of ['5-6','7-8','9-10','11-12']){
g.run(`switchAge('${age}');state.crystals=60;buyAnchor()`);assert.equal(g.run('state.anchor'),true);assert.equal(g.run('state.crystals'),60);
}
g.run('state.anchor=false;save()');assert.equal(g.run('state.anchor'),true);
g.node('#resetBtn').onclick();g.node('#confirmReset').onclick();assert.equal(g.run('state.anchor'),true);
const restored=game(null,g.snapshot());assert.equal(restored.run('state.anchor'),true);assert.match(restored.node('#anchorInfo').textContent,/Permanently yours/);
g.node('#profileName').value='New sailor';g.run('createProfile()');assert.equal(g.run('state.anchor'),false);g.run("switchProfile('legacy')");assert.equal(g.run('state.anchor'),true);
});

test('all three beach courts let the selected character join a bounded doubles match',()=>{
const g=game();g.run('startVolleyball(0)');assert.equal(g.run('volleyball'),null);
for(let index=0;index<3;index++){
g.run(`player.x=VOLLEYBALL_COURTS[${index}].x+20;player.y=VOLLEYBALL_COURTS[${index}].y+50;tick(16)`);
assert.equal(g.run('near'),200+index);assert.match(g.node('#interaction').innerHTML,/Play beach volleyball/);
g.run('interact();draw()');assert.equal(g.run('volleyball.index'),index);assert.equal(g.run('volleyball.opponents.length'),2);assert.ok(g.run('!!volleyball.teammate'));
assert.equal(g.node('#volleyballHud').hidden,false);assert.equal(g.node('#waterControls').hidden,true);
g.run('moveExplorer(-1000,-1000)');assert.equal(g.run('player.x'),g.run('volleyball.court.x+9'));assert.equal(g.run('player.y'),g.run('volleyball.court.y+volleyball.court.h/2+8'));
g.run('moveExplorer(1000,1000)');assert.equal(g.run('player.x'),g.run('volleyball.court.x+volleyball.court.w-9'));
g.node('#mapVolleyLeave').onclick();assert.equal(g.run('volleyball'),null);assert.equal(g.node('#volleyballHud').hidden,true);assert.equal(g.run('canWalk(player.x,player.y)'),true);
}
});

test('volleyball serves arc across the net, opponents return, and the player can hit back',()=>{
const g=game();g.run('Math.random=()=>.5;player.x=500;player.y=1770;startVolleyball(0);hitVolleyball()');assert.equal(g.run('volleyball.phase'),'rally');assert.equal(g.run('volleyball.ball.lastTeam'),0);
g.run('advanceSwimming(1000);draw()');assert.equal(g.run('volleyball.ball.lastTeam'),1);
g.run('player.x=volleyball.ball.target.x;player.y=volleyball.ball.target.y');
for(let i=0;i<30&&!g.run('volleyCanHit(player,0)');i++)g.run('advanceSwimming(32)');
assert.equal(g.run('volleyCanHit(player,0)'),true);g.node('#mapVolleyHit').onclick();assert.equal(g.run('volleyball.ball.lastTeam'),0);assert.ok(g.run('volleyball.hitAnim')>0);
const elapsed=g.run('volleyball.ball.age');g.node('#challenge').showModal();g.run('advanceSwimming(500)');assert.equal(g.run('volleyball.ball.age'),elapsed);g.node('#challenge').close();
});

test('volleyball teammate returns nearby balls and ground faults award points to the proper team',()=>{
const g=game();g.run(`Math.random=()=>.5;player.x=500;player.y=1770;startVolleyball(0);volleyball.phase='rally';
volleyball.ball={x:volleyball.teammate.x,y:volleyball.teammate.y,z:10,vx:0,vy:0,vz:-1,lastTeam:1,age:600,target:{x:volleyball.teammate.x,y:volleyball.teammate.y},trail:[]};advanceSwimming(16)`);
assert.equal(g.run('volleyball.ball.lastTeam'),0);assert.ok(g.run('volleyball.teammate.hit')>0);
g.run(`volleyball.ball={x:player.x,y:player.y,z:.01,vx:0,vy:0,vz:-1,lastTeam:1,age:600,target:{x:player.x,y:player.y},trail:[]};advanceSwimming(16)`);
assert.equal(g.run('volleyball.score[1]'),1);assert.equal(g.run('volleyball.phase'),'point');
g.run(`advanceSwimming(950);advanceSwimming(650);volleyball.score=[4,1];volleyball.phase='rally';volleyball.ball={x:520,y:1735,z:.01,vx:0,vy:0,vz:-1,lastTeam:0,age:600,target:{x:520,y:1735},trail:[]};advanceSwimming(16);draw()`);
assert.equal(g.run('volleyball.score[0]'),5);assert.equal(g.run('volleyball.phase'),'finished');assert.match(g.node('#volleyStatus').textContent,/You and Pip win/);
g.run('hitVolleyball()');assert.equal(g.run('volleyball.phase'),'serve');assert.equal(g.run('volleyball.score[0]'),0);
});

test('volleyball keeps anchored-boat access, saves safely, and clears on profile changes',()=>{
const g=game();g.run('state.crystals=50;buyAnchor();state.ferryTicket=true;boardFerry();player.x=500;player.y=beachShoreY(500)-60;anchorBoatAtBeach();if(boatAnchorCasting())advanceSwimming(FISH_CAST_DURATION);advanceSwimming(900);startVolleyball(0);draw()');
assert.equal(g.run('!!volleyball'),true);assert.equal(g.run('canReturnToAnchoredBoat()'),false);
const x=g.run('player.x');g.run('returnToAnchoredBoat();visit(0);openFishing();openFerry()');assert.equal(g.run('player.x'),x);
g.run('save()');const restored=game(null,g.snapshot());assert.equal(restored.run('volleyball'),null);assert.equal(restored.run('canReturnToAnchoredBoat()'),true);
g.run('leaveVolleyball()');assert.equal(g.run('canReturnToAnchoredBoat()'),true);
g.run('startVolleyball(0)');g.node('#profileName').value='Beach teammate';g.run('createProfile()');assert.equal(g.run('volleyball'),null);assert.equal(g.node('#volleyballHud').hidden,true);
});

function surfGame(){const g=game();g.run('player.x=SURF_SHACK.x;player.y=SURF_SHACK.y;state.crystals=20;rentSurfboard();startSurfing()');return g;}
test('surf shack rents one board for exactly 20 crystals and requires returning it before charging again',()=>{
const g=game();g.run('state.crystals=25;rentSurfboard()');assert.equal(g.run('state.surfRental'),false);
g.run('player.x=SURF_SHACK.x;player.y=SURF_SHACK.y;state.crystals=19;rentSurfboard()');assert.equal(g.run('state.surfRental'),false);
g.run('state.crystals=25;rentSurfboard();rentSurfboard()');assert.equal(g.run('state.surfRental'),true);assert.equal(g.run('state.crystals'),5);assert.equal(g.run('nearby()'),103);
g.run('tick(16)');assert.match(g.node('#interaction').innerHTML,/Surf rental shack/);
g.run('returnSurfboard()');assert.equal(g.run('state.surfRental'),false);assert.equal(g.run('state.crystals'),5);
});
test('paddle-out has momentum and catches a timed crest only after leaving the shore break',()=>{
const g=surfGame();assert.equal(g.run('surfSession.phase'),'paddling');assert.equal(g.run('catchSurfWave()'),false);
const start=g.run('player.y');g.run('keys.add("up");advanceSurfing(1000);draw()');assert.ok(g.run('player.y')<start-65);assert.ok(g.run('surfSession.vy')<0);
assert.equal(g.run('catchSurfWave()'),true);assert.equal(g.run('surfSession.phase'),'riding');g.run('draw()');assert.equal(g.run('nearby()'),-1);
});
test('surf carves turn faster but cost speed, and tube rides score more than open-face cruising',()=>{
const normal=surfGame(),sharp=surfGame();
for(const [g,carve] of [[normal,false],[sharp,true]])g.run(`surfSession.phase='riding';surfSession.angle=Math.PI/2;surfSession.y=.3;keys.add('right');${carve?"keys.add(' ');":''}advanceSurfing(100)`);
assert.ok(sharp.run('surfSession.angle')>normal.run('surfSession.angle'));assert.ok(sharp.run('surfSession.speed')<normal.run('surfSession.speed'));
const tube=surfGame(),open=surfGame();for(const [g,x] of [[tube,.73],[open,.35]])g.run(`surfSession.phase='riding';surfSession.x=${x};surfSession.y=.4;surfSession.angle=Math.PI;advanceSurfing(400)`);
assert.ok(tube.run('surfSession.score')>open.run('surfSession.score')+20);
const cut=surfGame();cut.run('surfSession.phase="riding";surfSession.y=.08;surfSession.speed=.5;surfSession.angle=Math.PI;keys.add("left");keys.add(" ");advanceSurfing(1000)');assert.ok(cut.run('surfSession.score')>150);
});
test('surf aerials launch from the crest and require a down-face landing to bank spin points',()=>{
const g=surfGame();g.run('surfSession.phase="riding";surfSession.y=.002;surfSession.angle=Math.PI+.6;surfSession.speed=.65;advanceSurfing(32)');assert.equal(g.run('surfSession.phase'),'airborne');
g.run('surfSession.airHeight=.01;surfSession.airV=-1;surfSession.airTurns=Math.PI*2;surfSession.airSpin=Math.PI*2;surfSession.angle=.5;advanceSurfing(16);draw()');assert.equal(g.run('surfSession.phase'),'riding');assert.ok(g.run('surfSession.score')>=500);assert.match(g.node('#surfMessage').textContent,/360/);
g.run('surfSession.phase="airborne";surfSession.airHeight=.001;surfSession.airV=-1;surfSession.angle=Math.PI;advanceSurfing(16)');assert.equal(g.run('surfSession.phase'),'wipeout');assert.equal(g.run('surfSession.wipeouts'),1);
});
test('three surf wipeouts or 90 seconds finish a heat, save a best score, and retain the rental',()=>{
const g=surfGame();for(let i=0;i<3;i++){
g.run('surfSession.phase="riding";surfSession.y=1.02;surfSession.speed=.7;surfSession.angle=Math.PI/2;advanceSurfing(100);draw()');assert.equal(g.run('surfSession.phase'),'wipeout');assert.equal(g.run('surfSession.wipeouts'),i+1);g.run('advanceSurfing(1400)');
}
assert.equal(g.run('surfSession.phase'),'results');assert.equal(g.run('state.surfRental'),true);assert.equal(g.run('state.crystals'),0);assert.ok(g.run('state.surfBest')>0);g.run('draw()');
g.run('stopSurfing();startSurfing();surfSession.phase="riding";surfSession.remaining=10;advanceSurfing(16)');assert.equal(g.run('surfSession.phase'),'results');assert.equal(g.run('surfSession.remaining'),0);
});
test('surf pausing and problem dialogs freeze the heat clock and wave motion',()=>{
const g=surfGame();g.run('surfSession.phase="riding";surfSession.paused=true');const clock=g.run('JSON.stringify([surfClock,surfSession.remaining,surfSession.x,surfSession.y])');g.run('advanceSurfing(3000)');assert.equal(g.run('JSON.stringify([surfClock,surfSession.remaining,surfSession.x,surfSession.y])'),clock);
g.run('surfSession.paused=false');g.node('#challenge').showModal();g.run('advanceSurfing(3000)');assert.equal(g.run('JSON.stringify([surfClock,surfSession.remaining,surfSession.x,surfSession.y])'),clock);g.node('#challenge').close();g.run('advanceSurfing(100)');assert.ok(g.run('surfSession.remaining')<90000);
});
test('surf rentals reload on safe beach ground and sessions clear on age and player changes',()=>{
const g=surfGame();g.run('keys.add("up");advanceSurfing(1000);save()');const restored=game(null,g.snapshot());assert.equal(restored.run('state.surfRental'),true);assert.equal(restored.run('onMainlandBeach()'),true);assert.equal(restored.run('surfSession'),null);
g.run('switchAge("9-10")');assert.equal(g.run('surfSession'),null);assert.equal(g.run('state.surfRental'),false);g.run('switchAge("11-12")');assert.equal(g.run('state.surfRental'),true);
g.run('player.x=SURF_SHACK.x;player.y=SURF_SHACK.y;startSurfing()');g.node('#profileName').value='New Surfer';g.run('createProfile()');assert.equal(g.run('surfSession'),null);assert.equal(g.run('state.surfRental'),false);
});
test('surfing leaves an anchored ferry and the return-to-boat route intact',()=>{
const g=game();g.run('state.ferryTicket=true;state.crystals=70;buyAnchor();boardFerry();player.x=SURF_SHACK.x;player.y=beachShoreY(player.x)-50;anchorBoatAtBeach();if(boatAnchorCasting())advanceSwimming(FISH_CAST_DURATION);advanceSwimming(900);rentSurfboard();startSurfing();keys.add("up");advanceSurfing(1000);stopSurfing()');assert.equal(g.run('onMainlandBeach()'),true);assert.equal(g.run('canReturnToAnchoredBoat()'),true);assert.equal(g.run('state.surfRental'),true);g.run('returnToAnchoredBoat();advanceSwimming(900)');assert.equal(g.run('boating'),true);assert.equal(g.run('activeVessel'),'ferry');
});

test('settings admin override requires the password for each 1000-crystal grant',()=>{
const g=game();g.run('state.crystals=30;state.earnedCrystals=50;save()');
for(const password of ['', '1111', '11112', '11111 ']){
g.node('#adminPassword').value=password;g.run('applyAdminOverride()');assert.equal(g.run('state.crystals'),30);assert.equal(g.node('#adminPassword').value,'');assert.match(g.node('#adminFeedback').textContent,/Incorrect password/);
}
let prevented=false;g.node('#adminPassword').value='11111';g.node('#adminOverrideForm').onsubmit({preventDefault(){prevented=true;}});
assert.equal(prevented,true);assert.equal(g.run('state.crystals'),1030);assert.equal(g.run('state.earnedCrystals'),50);assert.equal(g.run('state.solved.length'),0);assert.equal(g.node('#adminPassword').value,'');assert.match(g.node('#adminFeedback').textContent,/Added 1,000 crystals/);
g.run('applyAdminOverride()');assert.equal(g.run('state.crystals'),1030);
const restored=game(null,g.snapshot());assert.equal(restored.run('state.crystals'),1030);
});

test('admin crystals apply only to the selected profile and age, and password clears on switching',()=>{
const g=game();g.node('#adminPassword').value='11111';g.run('applyAdminOverride()');assert.equal(g.run('state.crystals'),1000);
g.node('#adminPassword').value='11111';g.run("switchAge('5-6')");assert.equal(g.node('#adminPassword').value,'');assert.equal(g.run('state.crystals'),0);
g.node('#adminPassword').value='11111';g.run('applyAdminOverride()');assert.equal(g.run('state.crystals'),1000);
g.node('#profileName').value='Another explorer';g.run('createProfile()');assert.equal(g.run('state.crystals'),0);assert.equal(g.node('#adminPassword').value,'');
g.run("switchProfile('legacy');switchAge('11-12')");assert.equal(g.run('state.crystals'),1000);
});

test('surf keyboard input catches waves, carves, pauses, and exits before normal map shortcuts run',()=>{
const g=surfGame();g.run('let captured=false;const surfKey=key=>window.listeners.keydown.find(l=>l.capture).handler({key,target:{tagName:"CANVAS"},repeat:false,preventDefault(){},stopImmediatePropagation(){captured=true}});surfKey("ArrowUp");advanceSurfing(1000);surfKey(" ")');assert.equal(g.run('captured'),true);assert.equal(g.run('surfSession.phase'),'riding');
g.run('surfKey("ArrowLeft");surfKey(" ")');assert.equal(g.run('keys.has("arrowleft")&&keys.has(" ")'),true);g.run('surfKey("p")');assert.equal(g.run('surfSession.paused'),true);assert.equal(g.run('keys.size'),0);g.run('surfKey("p");surfKey("x")');assert.equal(g.run('surfSession'),null);assert.equal(g.run('onMainlandBeach()'),true);
});
test('surf view renders face, aerial, wipeout, and results across portrait and landscape proportions',()=>{
const g=surfGame();for(const [width,height] of [[480,300],[480,900],[800,300]])for(const phase of ['riding','airborne','wipeout','results'])g.run(`WORLD.viewWidth=${width};WORLD.viewHeight=${height};surfSession.phase='${phase}';surfSession.airHeight=.4;surfSession.airSpin=Math.PI;surfSession.wipeoutTime=600;draw()`);
});

test('walking gait follows distance at any movement pace and does not advance while rendering',()=>{
const small=game(),large=game(),slower=game();for(const g of [small,large,slower])g.run('player.x=250;player.y=180');
for(let i=0;i<10;i++)small.run('moveExplorer(1,0)');for(let i=0;i<5;i++){large.run('moveExplorer(2,0)');slower.run('moveExplorer(1,0)');}
assert.ok(Math.abs(small.run('walkMotion.phase')-large.run('walkMotion.phase'))<1e-9);assert.ok(slower.run('walkMotion.phase')<small.run('walkMotion.phase'));assert.ok(small.run('walkingStep()')>0);
const phase=small.run('walkMotion.phase');small.run('for(let i=0;i<25;i++)draw()');assert.equal(small.run('walkMotion.phase'),phase);small.run('moveExplorer(0,0)');assert.equal(small.run('walkingStep()'),0);assert.equal(small.run('walkMotion.phase'),phase);
});
test('blocked walking stops the gait while diagonal slides animate only the distance actually moved',()=>{
const blocked=game(),free=game();for(const g of [blocked,free])g.run('player.x=250;player.y=180;moveExplorer(2,0)');const phase=blocked.run('walkMotion.phase');
blocked.run('player.x=186;player.y=140;keys.add("arrowright");moveExplorer(4,0)');assert.equal(blocked.run('player.x'),186);assert.equal(blocked.run('walkMotion.phase'),phase);assert.equal(blocked.run('walkingStep()'),0);
blocked.run('moveExplorer(4,3)');free.run('moveExplorer(0,3)');assert.equal(blocked.run('player.x'),186);assert.equal(blocked.run('player.y'),143);assert.ok(Math.abs(blocked.run('walkMotion.phase')-free.run('walkMotion.phase'))<1e-9);
});
test('walking phase stays still on boats and in water, and tracks court movement within bounds',()=>{
const g=game();g.run('player.x=250;player.y=180;moveExplorer(2,0)');const phase=g.run('walkMotion.phase');
g.run('state.catches={barracuda:5};launchBoat();moveExplorer(2,0)');assert.equal(g.run('walkMotion.phase'),phase);assert.equal(g.run('walkingStep()'),0);
g.run('boating=false;swimming=true;player.x=600;player.y=310;moveExplorer(2,0)');assert.equal(g.run('walkMotion.phase'),phase);assert.equal(g.run('walkingStep()'),0);
g.run('swimming=false;player.x=VOLLEYBALL_COURTS[0].x+50;player.y=VOLLEYBALL_COURTS[0].y+50;startVolleyball(0);moveExplorer(2,0)');assert.ok(g.run('walkMotion.phase')>phase);
g.run('player.x=volleyball.court.x+volleyball.court.w-9;moveExplorer(5,0)');assert.equal(g.run('walkingStep()'),0);
});

test('three frisbee-holding beachgoers invite play with X without triggering a dive',()=>{
const g=game();g.run('let frisbeePrevented=false;const frisbeeKey=(key,repeat=false)=>window.listeners.keydown.find(l=>!l.capture).handler({key,repeat,target:{tagName:"CANVAS"},preventDefault(){frisbeePrevented=true;}})');
for(const host of [0,3,5]){
g.run(`player.x=frisbeeHost(${host}).x;player.y=frisbeeHost(${host}).y+16;updateWaterControls();draw()`);
assert.equal(g.run('nearbyFrisbeeHost()'),host);assert.equal(g.node('#mapFrisbeeAction').hidden,false);
g.run('frisbeeKey("x",true)');assert.equal(g.run('frisbeeGame'),null);
g.run('frisbeeKey("x")');assert.equal(g.run('frisbeeGame.hostIndex'),host);assert.equal(g.run('frisbeePrevented'),true);assert.equal(g.run('swimming'),false);assert.equal(g.run('diveAnimation'),null);
assert.equal(g.node('#frisbeeHud').hidden,false);g.run('draw();frisbeeKey("Escape")');assert.equal(g.run('frisbeeGame'),null);assert.equal(g.node('#frisbeeHud').hidden,true);
}
});

test('frisbee partner throws, player catches and throws back, and catch streak increases',()=>{
const g=game();g.run('Math.random=()=>.5;player.x=frisbeeHost(0).x;player.y=1737;startFrisbee(0);advanceSwimming(650);draw()');
assert.equal(g.run('frisbeeGame.phase'),'incoming');g.run('advanceSwimming(frisbeeGame.disc.duration*.85)');assert.equal(g.run('canCatchFrisbee()'),true);
g.node('#mapFrisbeeAction').onclick();assert.equal(g.run('frisbeeGame.phase'),'holding');assert.equal(g.run('frisbeeGame.streak'),1);
g.node('#mapFrisbeeAction').onclick();assert.equal(g.run('frisbeeGame.phase'),'outgoing');
g.run('advanceSwimming(frisbeeGame.disc.duration+700);draw()');assert.equal(g.run('frisbeeGame.phase'),'incoming');
g.run('advanceSwimming(frisbeeGame.disc.duration*.85);frisbeeAction();draw()');assert.equal(g.run('frisbeeGame.streak'),2);assert.equal(g.run('frisbeeGame.best'),2);assert.equal(g.run('state.crystals'),0);
});

test('missed frisbee lands on reachable sand, can be picked up, and dialogs pause flight',()=>{
const g=game();g.run('Math.random=()=>.5;player.x=frisbeeHost(0).x;player.y=1737;startFrisbee(0);advanceSwimming(650);frisbeeGame.streak=2;frisbeeGame.best=2');
const elapsed=g.run('frisbeeGame.disc.elapsed');g.node('#challenge').showModal();g.run('advanceSwimming(500)');assert.equal(g.run('frisbeeGame.disc.elapsed'),elapsed);g.node('#challenge').close();
g.run('advanceSwimming(frisbeeGame.disc.duration+300);draw()');assert.equal(g.run('frisbeeGame.phase'),'missed');assert.equal(g.run('frisbeeGame.streak'),0);assert.equal(g.run('frisbeeGame.best'),2);
g.run('moveExplorer(1000,-1000);frisbeeAction()');assert.equal(g.run('frisbeeGame.phase'),'missed');assert.match(g.node('#frisbeeStatus').textContent,/Walk up/);
g.run('moveFrisbeePlayer(frisbeeGame.disc.to.x-player.x,frisbeeGame.disc.to.y-player.y);frisbeeAction();draw()');assert.equal(g.run('frisbeeGame.phase'),'holding');assert.equal(g.run('frisbeeGame.catches'),0);
});

test('frisbee sessions preserve anchored-boat access and clear on reload or player changes',()=>{
const g=game();g.run('state.crystals=50;buyAnchor();state.ferryTicket=true;boardFerry();player.x=240;player.y=beachShoreY(240)-60;anchorBoatAtBeach();if(boatAnchorCasting())advanceSwimming(FISH_CAST_DURATION);advanceSwimming(900);startFrisbee(0);draw()');
assert.equal(g.run('!!frisbeeGame'),true);assert.equal(g.run('canReturnToAnchoredBoat()'),false);
const x=g.run('player.x');g.run('returnToAnchoredBoat();visit(0);openFerry();openFishing()');assert.equal(g.run('player.x'),x);
g.run('save()');const restored=game(null,g.snapshot());assert.equal(restored.run('frisbeeGame'),null);assert.equal(restored.run('canReturnToAnchoredBoat()'),true);
g.run('leaveFrisbee()');assert.equal(g.run('canReturnToAnchoredBoat()'),true);
g.run('startFrisbee(0)');g.node('#profileName').value='Frisbee friend';g.run('createProfile()');assert.equal(g.run('frisbeeGame'),null);assert.equal(g.node('#frisbeeHud').hidden,true);
});

test('power refilled by admin activation survives an immediate refresh',()=>{
const g=game({power:0,solved:[],upgrades:[]});
g.node('#adminPassword').value='11111';g.run('applyAdminOverride()');
const restored=game(null,g.snapshot());
assert.equal(restored.run('adminMode'),false);
assert.equal(restored.run('state.power'),100);
assert.equal(restored.run('currentProfile().power'),100);
assert.equal(restored.node('#powerValue').textContent,'100 / 100');
});

test('earned and partially drained power survive refresh for the active explorer',()=>{
const g=game({power:0,solved:[],upgrades:[]});
g.run('openQuestion(0)');g.node('#answer').value=g.run('String(questions[0].answer)');g.run('checkAnswer()');
assert.equal(game(null,g.snapshot()).run('state.power'),25);
g.node('#challenge').close();g.run('swimming=true;player.x=600;player.y=350;advancePower(2000)');
const restored=game(null,g.snapshot());assert.equal(restored.run('state.power'),23.7);
g.node('#profileName').value='Refresh explorer';g.run('createProfile();state.power=42;save()');
const named=game(null,g.snapshot());assert.equal(named.run('profileId'),'p1');assert.equal(named.run('state.power'),42);
});

test('authenticated admin mode refills saved power and does not consume it',()=>{
const g=game({power:0,solved:[],upgrades:[]});g.node('#adminPassword').value='wrong';g.run('applyAdminOverride()');assert.equal(g.run('adminMode'),false);assert.equal(g.run('hasSwimPower()'),false);
g.node('#adminPassword').value='11111';g.run('applyAdminOverride()');assert.equal(g.run('adminMode'),true);assert.equal(g.run('hasSwimPower()'),true);assert.match(g.node('#powerValue').textContent,/Unlimited/);assert.equal(g.node('#powerBar').style.width,'100%');assert.equal(g.node('#exitAdminMode').hidden,false);
g.run('startDive({x:600,y:350});advanceSwimming(700);advancePower(180000)');assert.equal(g.run('swimming'),true);assert.equal(g.run('state.power'),100);assert.equal(g.run('currentProfile().power'),100);
g.run('returnBoat();state.catches={barracuda:5};launchBoat()');assert.equal(g.run('boating'),true);
});
test('exiting admin mode restores normal limits and safely lands a zero-power swimmer',()=>{
const g=game({power:0,solved:[],upgrades:[]});g.node('#adminPassword').value='11111';g.run('applyAdminOverride();state.power=0;swimming=true;player.x=600;player.y=350');g.node('#exitAdminMode').onclick();assert.equal(g.run('adminMode'),false);assert.equal(g.run('swimming'),false);assert.equal(g.run('canWalk(player.x,player.y)'),true);assert.equal(g.run('hasSwimPower()'),false);assert.equal(g.node('#powerValue').textContent,'0 / 100');assert.equal(g.node('#exitAdminMode').hidden,true);
});
test('admin unlimited power ends on reload or changing players, levels, or adventure progress',()=>{
const g=game({power:12,solved:[],upgrades:[]});const enable=()=>{g.node('#adminPassword').value='11111';g.run('applyAdminOverride()');};
enable();const restored=game(null,g.snapshot());assert.equal(restored.run('adminMode'),false);assert.equal(restored.run('state.power'),100);
g.run('switchAge("9-10")');assert.equal(g.run('adminMode'),false);enable();g.node('#profileName').value='Normal Power Player';g.run('createProfile()');assert.equal(g.run('adminMode'),false);
enable();g.node('#resetBtn').onclick();g.node('#confirmReset').onclick();assert.equal(g.run('adminMode'),false);
});

test('dragon fire touching a standing player creates a small hair flame that follows the head',()=>{
const g=game();g.run('player.x=PET_DRAGON_HOME.x+50;player.y=PET_DRAGON_HOME.y;state.power=37;petDragonFire={elapsed:200,duration:850};advancePetDragonFire(16)');assert.equal(g.run('!!playerHairEffect'),true);assert.equal(g.run('petDragonFire.hitPlayer'),true);assert.equal(g.run('state.power'),37);
g.run('const originalPolygon=polygon;let flameShapes=[];polygon=(points,color,dy)=>{if(color==="#e88437")flameShapes.push(points);originalPolygon(points,color,dy)};drawPlayerHairEffect()');const before=g.run('JSON.stringify(flameShapes[0][0])');assert.notEqual(before,undefined);
g.run('player.x+=8;player.y+=3;drawPlayerHairEffect()');assert.equal(g.run('flameShapes[1][0][0]-flameShapes[0][0][0]'),8);assert.equal(g.run('flameShapes[1][0][1]-flameShapes[0][0][1]'),3);
g.run('advancePlayerHairEffect(100);advancePetDragonFire(16)');assert.equal(g.run('playerHairEffect.elapsed'),100);
});
test('hair flame becomes smoke and clears without retriggering during the same breath',()=>{
const g=game();g.run('player.x=PET_DRAGON_HOME.x+50;player.y=PET_DRAGON_HOME.y;petDragonFire={elapsed:200,duration:850};checkPlayerDragonFireHit();const originalEllipse=ellipse,originalPolygon=polygon;let effects=[];ellipse=(...args)=>{effects.push(args[4]);originalEllipse(...args)};polygon=(points,color,dy)=>{effects.push(color);originalPolygon(points,color,dy)};drawPlayerHairEffect()');assert.equal(g.run('effects.includes("#e88437")'),true);assert.equal(g.run('effects.includes("#92938b")'),false);
g.run('advancePlayerHairEffect(750);effects=[];drawPlayerHairEffect()');assert.equal(g.run('effects.includes("#e88437")'),false);assert.equal(g.run('effects.includes("#92938b")'),true);
g.run('advancePlayerHairEffect(950);checkPlayerDragonFireHit()');assert.equal(g.run('playerHairEffect'),null);
});
test('dragon fire misses players outside the plume and never ignites its mounted rider',()=>{
const g=game();for(const [dx,dy] of [[-40,0],[120,0],[50,-50],[50,50]]){g.run(`playerHairEffect=null;petDragonFire={elapsed:200,duration:850};player.x=PET_DRAGON_HOME.x+${dx};player.y=PET_DRAGON_HOME.y+${dy};checkPlayerDragonFireHit()`);assert.equal(g.run('playerHairEffect'),null);}
g.run('player.x=PET_DRAGON_HOME.x+50;player.y=PET_DRAGON_HOME.y;dragonFlight={stage:"flying"};checkPlayerDragonFireHit()');assert.equal(g.run('playerHairEffect'),null);
});
test('hair fire pauses with dialogs and clears when changing math levels or explorers',()=>{
const g=game();g.run('playerHairEffect={elapsed:250}');g.node('#challenge').showModal();g.run('advancePlayerHairEffect(1000)');assert.equal(g.run('playerHairEffect.elapsed'),250);g.node('#challenge').close();g.run('switchAge("9-10")');assert.equal(g.run('playerHairEffect'),null);
g.run('playerHairEffect={elapsed:100}');g.node('#profileName').value='Smoke-free explorer';g.run('createProfile()');assert.equal(g.run('playerHairEffect'),null);
});

test('wakeboard controls carve the rider while the tow boat follows identical programmed positions',()=>{
const a=game(),b=game();
for(const g of [a,b])g.run('state.wakeboard=true;visitWatersportsDock();startWakeboarding()');
a.run('keys.add("up")');b.run('keys.add("down")');
for(let i=0;i<10;i++){a.run('advanceSwimming(20)');b.run('advanceSwimming(20)');}
assert.equal(a.run('JSON.stringify(wakeboardRide.boat)'),b.run('JSON.stringify(wakeboardRide.boat)'));
assert.ok(b.run('player.y')-a.run('player.y')>6);assert.equal(a.run('wakeboardRide.heading'),b.run('wakeboardRide.heading'));
});

test('rider collisions release the tow rope, splash into swimming, and send the boat around its course to dock',()=>{
const g=game();g.run(`state.wakeboard=true;visitWatersportsDock();startWakeboarding();
const from={x:550,y:290,vx:0,vy:-180},to={x:550,y:284,vx:0,vy:-180};
const hit=wakeboardRiderContact(wakeboardRide,from,to);if(hit?.kind!=='timber')throw Error('Expected a piling collision');crashWakeboarder(wakeboardRide,hit,from,to);draw()`);
assert.equal(g.run('wakeboardRide'),null);assert.equal(g.run('wakeboardCrash.kind'),'water');assert.equal(g.run('!!wakeboardBoatTrip'),true);
const x=g.run('wakeboardBoatTrip.boat.x');g.run('advanceSwimming(450);draw()');assert.equal(g.run('wakeboardCrash'),null);assert.equal(g.run('swimming'),true);assert.notEqual(g.run('wakeboardBoatTrip.boat.x'),x);
assert.equal(g.run('state.wakeboard'),true);g.run('nextSharkFin=1e9;nextBlueMarlin=1e9;nextLochDragon=1e9');
for(let i=0;i<800&&g.run('!!wakeboardBoatTrip');i++){g.run('advanceSwimming(40)');if(g.run('wakeboardBoatTrip'))assert.equal(g.run('wakeboardHullClear(wakeboardBoatTrip.boat,wakeboardBoatTrip.heading)'),true);}
assert.equal(g.run('wakeboardBoatTrip'),null);g.run('swimming=false;player.x=WATERSPORTS_DOCK.x;player.y=WATERSPORTS_DOCK.y-18;startWakeboarding()');assert.equal(g.run('!!wakeboardRide'),true);
});

test('wakeboard land collisions use the shark tumble, prone pause, head shake, and get-up sequence',()=>{
const g=game();g.run(`state.wakeboard=true;visitWatersportsDock();startWakeboarding();
const shoreX=Array.from({length:500},(_,i)=>i).filter(x=>inside(x,470,islandPolys[3])).at(-1);
const from={x:shoreX+19,y:470,vx:-180,vy:0},to={x:shoreX+12,y:470,vx:-180,vy:0};
const hit=wakeboardRiderContact(wakeboardRide,from,to);if(hit?.kind!=='land')throw Error('Expected a land collision');crashWakeboarder(wakeboardRide,hit,from,to);draw()`);
assert.equal(g.run('wakeboardCrash.kind'),'land');assert.equal(g.run('wakeboardCrash.duration'),280);assert.equal(g.run('wakeboardRide'),null);
g.run('advanceSwimming(280);draw()');assert.equal(g.run('wakeboardCrash'),null);assert.equal(g.run('swimming'),false);assert.equal(g.run('!!shoreRecovery'),true);assert.equal(g.run('canWalk(player.x,player.y)'),true);assert.equal(g.run('!!goggleToss'),true);
const x=g.run('player.x');g.run('moveExplorer(10,0);advanceSwimming(999);draw()');assert.equal(g.run('player.x'),x);assert.match(g.node('#waterControls').textContent,/Catching your breath/);
g.run('advanceSwimming(1);draw()');assert.match(g.node('#waterControls').textContent,/Shaking it off/);g.run('advanceSwimming(450);draw()');assert.match(g.node('#waterControls').textContent,/Getting back up/);
g.run('advanceSwimming(450)');assert.equal(g.run('shoreRecovery'),null);assert.equal(g.run('state.wakeboard'),true);
});


test('wakeboard transit bisects the island channel and the repeating circuit stays offshore',()=>{
const g=game();
for(let y=340;y<=610;y+=10){
assert.ok(g.run(`(()=>{const x=wakeboardChannelX(${y});return Math.abs(wakeboardIslandDistance(x,${y},islandPolys[3])-wakeboardIslandDistance(x,${y},islandPolys[4]));})()`)<.001);
}
assert.ok(g.run(`(()=>{let room=Infinity;for(let d=WAKEBOARD_COURSE.loopStart;d<=WAKEBOARD_COURSE.loopEnd;d+=4){const p=wakeboardCoursePose(d);for(const poly of islandPolys)room=Math.min(room,wakeboardIslandDistance(p.x,p.y,poly));}return room;})()`)>200);
g.run('state.wakeboard=true;visitWatersportsDock();startWakeboarding();for(let i=0;i<2000;i++)advanceSwimming(40)');
assert.equal(g.run('!!wakeboardRide'),true);assert.equal(g.run('wakeboardCrash'),null);
assert.ok(g.run('wakeboardRide.courseDistance>=WAKEBOARD_COURSE.loopStart&&wakeboardRide.courseDistance<WAKEBOARD_COURSE.loopEnd'));
});

for(const kind of ['marlin','dragon'])test(`${kind} shares shark periodic dives, underwater steering, and snorkel rendering`,()=>{
const g=game();
g.run(`swimming=true;player.x=600;player.y=310;sharkRide={kind:'${kind}',x:600,y:310,heading:0,distance:0,phase:0,diveElapsed:0};
const originalCharacter=character,originalSnorkel=swimSnorkel;let riderDraws=0,snorkelDraws=0;
character=(...args)=>{riderDraws++;originalCharacter(...args)};swimSnorkel=(...args)=>{snorkelDraws++;originalSnorkel(...args)};`);
for(const [elapsed,depth] of [[5000,0],[5400,.5],[5800,1],[7600,1],[8000,.5],[8400,0],[15400,.5]]){
assert.equal(g.run(`sharkRide.diveElapsed=${elapsed};sharkDiveDepth()`),depth);
g.run('drawSharkRide()');
}
g.run('riderDraws=0;snorkelDraws=0;sharkRide.diveElapsed=6400;keys.add("down");advanceSwimming(100);drawSharkRide()');
assert.equal(g.run('riderDraws'),0);assert.equal(g.run('snorkelDraws'),1);
assert.ok(g.run('player.x>600&&player.y>310&&sharkRide.heading>0'));
assert.ok(g.run('sharkRide.surfaceWake.some(w=>w.kind==="snorkel")'));
g.run('sharkRide.diveElapsed=8300;advanceSwimming(100);drawSharkRide()');assert.equal(g.run('sharkDiveDepth()'),0);assert.equal(g.run('riderDraws'),1);
});


test('Escape closes every rail submenu and panel while menu controls have focus',()=>{
const g=game();
g.run('const menuKey=(key,tagName)=>window.listeners.keydown.find(l=>!l.capture).handler({key,target:{tagName},preventDefault(){},repeat:false})');
for(const tag of ['BUTTON','INPUT','SELECT','TEXTAREA','CANVAS']){
for(const group of g.run('RAIL_GROUPS')){
g.run(`toggleSubmenu('${group}');menuKey('Escape','${tag}')`);
assert.equal(g.run('activeSubmenu'),null);assert.equal(g.node('#'+group+'Submenu').hidden,true);
}
for(const panel of g.run('MAP_PANELS')){
g.run(`openMapPanel('${panel}');keys.add('w');menuKey('Escape','${tag}')`);
assert.equal(g.run('activeMapPanel'),null);assert.equal(g.node('#'+panel).hidden,true);assert.equal(g.run('keys.size'),0);
}
}
g.run("openMapPanel('settingsPanel');menuKey('w','INPUT')");assert.equal(g.run('activeMapPanel'),'settingsPanel');assert.equal(g.run('keys.size'),0);
g.node('#challenge').showModal();g.run("menuKey('Escape','INPUT')");assert.equal(g.run('activeMapPanel'),'settingsPanel');
});

test('bridges and docks block navigation into water and offer an explicit X dive',()=>{
const g=game();g.run('state.ferryTicket=true;state.upgrades=["bridge"]');
const spans=JSON.parse(g.run('JSON.stringify([...crossings,woodlandBridge,...piers])'));
for(const span of spans){
g.run(`swimming=false;diveAnimation=null;shoreClimb=null;state.boatIsland=${JSON.stringify(span.dock?.islandId||null)};
player.x=${span.x+span.w/2};player.y=${span.y+span.h/2};`);
// Find a timber edge whose outside is open sea, avoiding beach entrances.
const edge=JSON.parse(g.run(`JSON.stringify((()=>{
const b=${JSON.stringify(span)};
for(let t=.2;t<.9;t+=.2)for(const p of [
{x:b.x,y:b.y+b.h*t,dx:-3,dy:0},{x:b.x+b.w,y:b.y+b.h*t,dx:3,dy:0},
{x:b.x+b.w*t,y:b.y,dx:0,dy:-3},{x:b.x+b.w*t,y:b.y+b.h,dx:0,dy:3}]){
if(openSea(p.x+p.dx,p.y+p.dy))return p;
}
return null;})())`));
assert.ok(edge,'timber must have an exposed sea edge');
g.run(`player.x=${edge.x};player.y=${edge.y};moveExplorer(${edge.dx},${edge.dy});updateWaterControls()`);
assert.equal(g.run('swimming'),false);assert.equal(g.run('diveAnimation'),null);
assert.equal(g.run('player.x'),edge.x);assert.equal(g.run('player.y'),edge.y);
assert.equal(g.node('#mapDive').hidden,false);
g.run('window.listeners.keydown.find(l=>!l.capture).handler({key:"x",repeat:false,target:{tagName:"CANVAS"},preventDefault(){}})');
assert.equal(g.run('swimming'),true);assert.ok(g.run('!!diveAnimation'));
}
});
test('ordinary shoreline offers no X suggestion and walking into water still dives',()=>{
const g=game();g.run(`{
let found=false;
for(let y=60;y<270&&!found;y+=2)for(let x=65;x<330&&!found;x+=2){
if(canWalk(x,y)&&!walkableTimberAt(x,y)&&openSea(x+3,y)){player.x=x;player.y=y;found=true;}
}
if(!found)throw Error('No ordinary shoreline found');
}updateWaterControls()`);
assert.equal(g.node('#mapDive').hidden,true);
g.run('moveExplorer(3,0)');assert.equal(g.run('swimming'),true);assert.ok(g.run('!!diveAnimation'));
});

for(const vessel of ['fishing','ferry'])test(`${vessel} throws an anchor and unfurls rope before an offshore jump`,()=>{
const g=game();g.run(`state.catches={barracuda:5};state.ferryTicket=true;${vessel==='ferry'?'boardFerry()':'launchBoat()'};player.x=600;player.y=350;`);
// Click handlers receive an event, which must not bypass the anchor animation.
g.node('#mapBoatExit').onclick({type:'click'});
assert.equal(g.run('boatAnchorCasting()'),true);assert.equal(g.run('boating'),true);
assert.equal(g.run('swimming'),false);assert.equal(g.run('diveAnimation'),null);
assert.equal(g.node('#mapBoatExit').disabled,true);
g.run('keys.add("right");moveExplorer(20,0);advanceSwimming(FISH_CAST_DURATION/2);draw()');
assert.equal(g.run('player.x'),600);assert.equal(g.run('boatPosition.x'),600);
const elapsed=g.run('boatAnchor.elapsed');g.run('exitBoat();advanceSwimming(0)');assert.equal(g.run('boatAnchor.elapsed'),elapsed);
assert.equal(g.run('swimming'),false);
g.run('advanceSwimming(FISH_CAST_DURATION/2);draw()');assert.equal(g.run('boatAnchorCasting()'),false);
assert.equal(g.run('boating'),false);assert.equal(g.run('swimming'),true);assert.equal(g.run('diveAnimation.elapsed'),0);
assert.equal(g.run('boatAnchor.vessel'),vessel);
g.run('advanceSwimming(700);player.x=boatPosition.x;player.y=boatPosition.y;boardOwnBoat();draw()');
assert.equal(g.run('boating'),true);assert.equal(g.run('boatAnchor.retrieving'),true);
assert.equal(g.node('#mapBoatExit').hidden,true);
g.run('keys.add("right");advanceSwimming(400);moveExplorer(20,0);draw()');assert.equal(g.run('player.x'),600);assert.equal(g.run('boatAnchor.retrieving'),true);
g.run('advanceSwimming(400);draw()');assert.equal(g.run('boatAnchor'),null);
g.run('moveExplorer(5,0)');assert.equal(g.run('player.x'),605);
});
test('pending anchor throws cancel safely on return, age changes, and profile changes',()=>{
const g=game();
const launch='state.catches={barracuda:5};launchBoat();player.x=600;player.y=350;exitBoat();advanceSwimming(200)';
for(const reset of ['returnBoat()',"switchAge('9-10')","createProfile()"]){
g.run(launch);assert.equal(g.run('boatAnchorCasting()'),true);
if(reset==='createProfile()')g.node('#profileName').value='Anchor explorer';
g.run(reset+';advanceSwimming(1200);draw()');
assert.equal(g.run('boatAnchor'),null);assert.equal(g.run('swimming'),false);assert.equal(g.run('diveAnimation'),null);
}
});

test('anchor targets clear the entire boat and nearby land in every heading',()=>{
const g=game();
for(const [x,y] of [[600,350],[20,20],[1200,1780],[3180,1000]]){
for(let i=0;i<16;i++){
const target=JSON.parse(g.run(`JSON.stringify(boatAnchorTarget(${x},${y},${i}*Math.PI/8))`));
assert.ok(target,`clear anchorage near ${x},${y}`);
assert.ok(Math.hypot(target.x-x,target.y-y)>=71.99);
for(let j=0;j<8;j++)assert.equal(g.run(`sharkWater(${target.x}+Math.cos(${j}*Math.PI/4)*10,${target.y}+Math.sin(${j}*Math.PI/4)*10)`),true);
}
}
});
test('beach moorings preserve the offshore anchor point and automatically haul it aboard after reload',()=>{
const g=game();g.run('state.crystals=50;buyAnchor();state.ferryTicket=true;boardFerry();player.x=1200;player.y=beachShoreY(1200)-70;anchorBoatAtBeach();advanceSwimming(FISH_CAST_DURATION);advanceSwimming(900);save()');
const point=g.run('JSON.stringify(state.beachAnchor.anchorPoint)');assert.ok(g.run('Math.hypot(boatAnchor.x-boatPosition.x,boatAnchor.y-boatPosition.y)>=72'));
const restored=game(null,g.snapshot());assert.equal(restored.run('JSON.stringify({x:boatAnchor.x,y:boatAnchor.y})'),point);
restored.run('returnToAnchoredBoat();advanceSwimming(900);draw()');assert.equal(restored.run('boatAnchor.retrieving'),true);
const x=restored.run('player.x');restored.run('moveExplorer(10,0);advanceSwimming(400);draw()');assert.equal(restored.run('player.x'),x);
restored.run('advanceSwimming(400);draw()');assert.equal(restored.run('boatAnchor'),null);assert.equal(restored.run('boating'),true);
});

for(const vessel of ['fishing','ferry']){
for(const obstacle of ['dock','bridge','boat','tow boat'])test(`${vessel} hull stops before ${obstacle}, including long moves and reversing away`,()=>{
const g=game();g.run(`state.catches={barracuda:5};state.ferryTicket=true;activeVessel='${vessel}';boating=true;player.x=2900;player.y=1500;boatPosition={x:2900,y:1500};boatMotion.heading=0;`);
if(obstacle==='dock')g.run('piers.push({x:3000,y:1450,w:14,h:100,dock:{x:3000,y:1500}})');
else if(obstacle==='bridge')g.run('crossings.push({x:3000,y:1450,w:14,h:100})');
else if(obstacle==='tow boat')g.run('wakeboardBoatTrip={boat:{x:3000,y:1500},heading:Math.PI/2}');
else g.run(`${vessel==='ferry'?'fishingBoatPosition':'ferryPosition'}={x:3000,y:1500};${vessel==='ferry'?'fishingBoatHeading':'ferryHeading'}=Math.PI/2`);
assert.equal(g.run('boatPoseClear(player.x,player.y,0)'),true);
g.run('moveExplorer(220,0)');assert.ok(g.run('player.x>2900&&player.x<2980'));
assert.equal(g.run('boatPoseClear(player.x,player.y,boatMotion.heading)'),true);
const x=g.run('player.x');g.run('moveExplorer(10,0)');assert.ok(g.run('player.x')<=x+2);
g.run('moveExplorer(-20,0)');assert.ok(g.run('player.x')<x-15);assert.equal(g.run('boatPoseClear(player.x,player.y,boatMotion.heading)'),true);
});
test(`${vessel} cannot rotate its hull through a nearby dock`,()=>{
const g=game();g.run(`state.catches={barracuda:5};activeVessel='${vessel}';boating=true;player.x=3000;player.y=1500;boatPosition={x:3000,y:1500};boatMotion.heading=0;piers.push({x:2990,y:1525,w:20,h:40,dock:{x:3000,y:1540}})`);
assert.equal(g.run('boatPoseClear(player.x,player.y,0)'),true);
g.run('moveExplorer(0,10)');assert.equal(g.run('player.y'),1500);assert.ok(g.run('boatMotion.heading<Math.PI/2'));
assert.equal(g.run('boatPoseClear(player.x,player.y,boatMotion.heading)'),true);
});
}
test('all docks and built bridges block either boat, including their hull edges',()=>{
const g=game();g.run('state.upgrades=["bridge"]');
const spans=JSON.parse(g.run('JSON.stringify([...piers,...crossings,woodlandBridge])'));
for(const vessel of ['fishing','ferry'])for(const b of spans){
assert.equal(g.run(`boatPoseClear(${b.x+b.w/2},${b.y+b.h/2},0,'${vessel}')`),false);
}
});

test('the Whispering crossing becomes a short ferry pier with open turning room to the west',()=>{
const g=game();g.run('state.ferryTicket=true;boardFerry()');
assert.equal(g.run('dock.x'),232);assert.equal(g.run('dock.y'),285);
assert.equal(g.run('canWalk(player.x,player.y)'),true);
const x=g.run('player.x'),y=g.run('player.y');assert.ok(x<g.run('dock.x'));
for(let i=0;i<32;i++)assert.equal(g.run(`boatPoseClear(${x},${y},${i}*Math.PI/16,'ferry')`),true,`turn ${i}`);
g.run('moveExplorer(-55,0);moveExplorer(0,100);draw()');assert.equal(g.run('player.x'),x-55);assert.equal(g.run('player.y'),y+100);
g.run('returnBoat()');assert.equal(g.run('canWalk(player.x,player.y)'),true);assert.equal(g.run('nearby()'),5);
assert.equal(g.run('canWalk(232,320)'),false);assert.equal(g.run('crossings.length'),2);
assert.equal(g.run('canWalk(woodlandBridge.x+woodlandBridge.w/2,woodlandBridge.y+woodlandBridge.h/2)'),false);
g.run('state.upgrades=["bridge"]');assert.equal(g.run('canWalk(woodlandBridge.x+woodlandBridge.w/2,woodlandBridge.y+woodlandBridge.h/2)'),true);
});
