const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
test('discovery results lead with the headline and answer, then reward and keyboard actions',()=>{
const g=game();g.run('openQuestion(0)');
g.node('#answer').value=g.run('String(questions[0].answer)');g.run('checkAnswer()');
const html=g.node('#challengeBody').innerHTML;
assert.ok(html.indexOf('Discovery made!')<html.indexOf('discovery-answer'));
assert.ok(html.indexOf('discovery-answer')<html.indexOf('crystal-reward'));
assert.ok(html.indexOf('crystal-reward')<html.indexOf('discovery-actions'));
assert.match(html,/Next discovery<\/span><kbd>Enter<\/kbd>/);
assert.match(html,/Keep exploring<\/span><kbd>Esc<\/kbd>/);
let prevented=0;const press=(key,repeat=false,target={tagName:'BUTTON',id:'nextQuestion'})=>g.node('#challenge').onkeydown({key,repeat,target,preventDefault(){prevented++;}});
press('Enter',true);assert.equal(g.run('active'),0);
press('Enter',false,{tagName:'BUTTON',id:'backIsland'});assert.equal(g.run('active'),0);
press('Enter');assert.equal(g.run('active'),1);assert.equal(g.run('answerComplete'),false);
press('Enter');assert.equal(g.run('active'),1);
g.node('#answer').value=g.run('String(questions[1].answer)');g.run('checkAnswer()');
press('Escape');assert.equal(g.node('#challenge').open,false);assert.ok(prevented>=2);
});
test('next discovery stays on the current island after its last unsolved question',()=>{
const g=game();g.run('state.solved=locations[0].ids.slice(0,-1);openQuestion(locations[0].ids.at(-1))');
g.node('#answer').value=g.run('String(questions[active].answer)');g.run('checkAnswer()');
g.node('#nextQuestion').onclick();assert.equal(g.run('active'),g.run('locations[0].ids[0]'));assert.equal(g.node('#challenge').open,true);
g.node('#answer').value=g.run('String(questions[active].answer)');g.run('checkAnswer()');
assert.match(g.node('#challengeBody').innerHTML,/Practice complete!/);
assert.doesNotMatch(g.node('#challengeBody').innerHTML,/reward-gain/);
g.node('#backIsland').onclick();assert.equal(g.node('#challenge').open,false);
});
function game(saved,stored,renderTools=false){const nodes=new Map(),storage=new Map(stored?Object.entries(stored):saved?[["skyseed-v1",JSON.stringify(saved)]]:[]);const element=()=>({value:'',innerHTML:'',textContent:'',style:{},classList:{add(){},remove(){}},setAttribute(){},addEventListener(){},focus(){},showModal(){this.open=true;},close(){this.open=false;},getContext(){return new Proxy({},{get:(target,key)=>target[key]??(()=>{})});}});const node=s=>{if(!nodes.has(s))nodes.set(s,element());return nodes.get(s);};const c=vm.createContext({document:{querySelector:s=>s==='dialog[open]'?([...nodes.entries()].find(([key,n])=>['#challenge','#journal','#welcome','#ferry','#stash','#sponsorship','#flash','#resetConfirm','#profileActionConfirm','#timesTables'].includes(key)&&n.open)?.[1]||null):node(s),querySelectorAll:()=>[],addEventListener(){}},window:{listeners:{},addEventListener(type,handler,options){(this.listeners[type]??=[]).push({handler,capture:!!options?.capture});}},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},console,confirm:()=>true});vm.runInContext(fs.readFileSync('dist/surfing.js','utf8'),c);vm.runInContext(fs.readFileSync('dist/app.js','utf8'),c);if(!renderTools)vm.runInContext('renderTool=()=>{}',c);return {run:s=>vm.runInContext(s,c),node,snapshot:()=>Object.fromEntries(storage)};}
test('all 200 challenges award once; upgrades cost 60; companion hatches',()=>{const g=game();for(let i=0;i<200;i++){g.run(`openQuestion(${i})`);g.node('#answer').value=g.run(`Array.isArray(questions[${i}].answer)?questions[${i}].answer.join(','):String(questions[${i}].answer)`);g.run('checkAnswer()');}assert.equal(g.run('state.solved.length'),200);assert.equal(g.run('state.crystals'),1000);assert.equal(g.node('#petTitle').textContent,'Meet Sprout!');g.run('openQuestion(0)');g.node('#answer').value='252';g.run('checkAnswer()');assert.equal(g.run('state.crystals'),1005);g.run("buy('cottage');buy('garden');buy('bridge')");assert.equal(g.run('state.crystals'),945);assert.equal(g.run('state.upgrades.length'),3);g.run("buy('bridge')");assert.equal(g.run('state.crystals'),945);});
test('wrong answers, equivalent fractions, percentages, ordered pairs',()=>{const g=game();g.run('openQuestion(4)');g.node('#answer').value='3/4';g.run('checkAnswer()');assert.equal(g.run('state.crystals'),0);g.node('#answer').value='14/16';g.run('checkAnswer()');assert.equal(g.run('state.crystals'),5);assert.equal(g.run("parseNumber('62%')"),.62);assert.equal(g.run("parseNumber('−4')"),-4);assert.ok(Number.isNaN(g.run("parseNumber('1/0')")));g.run('openQuestion(17)');g.node('#answer').value='30,54';g.run('checkAnswer()');assert.equal(g.run('state.solved.length'),1);g.node('#answer').value='54,30';g.run('checkAnswer()');assert.equal(g.run('state.solved.length'),2);});
test('a 25-crystal ferry ticket starts one timed ride and allows reboarding while time remains',()=>{
const g=game();g.run('buyFerryTicket()');assert.equal(g.run('state.ferryTicket'),false);
g.run('state.crystals=75;state.earnedCrystals=75;buyFerryTicket()');assert.equal(g.run('state.crystals'),50);assert.equal(g.run('state.earnedCrystals'),75);
g.run('buyFerryTicket()');assert.equal(g.run('state.crystals'),50);
g.run('boardFerry()');assert.equal(g.run('boating'),true);assert.equal(g.run('state.ferryTicket'),false);assert.equal(g.run('state.ferryRemaining'),g.run('FERRY_RIDE_DURATION'));
g.run('advanceSwimming(1000);player.x=farDock.x+43;player.y=farDock.y+15;exitBoat();if(boatAnchorCasting())advanceSwimming(FISH_CAST_DURATION)');assert.equal(g.run('boating'),false);assert.equal(g.run('canWalk(player.x,player.y)'),true);
const remaining=g.run('state.ferryRemaining');g.run('openFerry();boardFerry()');assert.equal(g.run('boating'),true);assert.equal(g.run('state.ferryRemaining'),remaining);assert.equal(g.run('state.crystals'),50);
g.run('returnBoat();boardFerry()');assert.equal(g.run('boating'),true);assert.equal(g.run('state.ferryTicket'),false);
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

test('200 unique questions are assigned exactly once across five destinations',()=>{
const g=game();assert.equal(g.run('questions.length'),200);
assert.equal(g.run('new Set(questions.map(q=>q.q)).size'),200);
assert.equal(g.run('locations.every(l=>l.ids.length===40)'),true);
assert.equal(g.run('new Set(locations.flatMap(l=>l.ids)).size'),200);
assert.equal(g.run('questions.every(q=>q.hint.length===3&&q.explain&&q.title)'),true);
g.run('journal()');assert.match(g.node('#journalList').innerHTML,/0 \/ 40/);
});
test('saved progress preserves both original and expanded question IDs',()=>{
const g=game({solved:[0,19,20,69,99,199,200,-1],upgrades:[],crystals:35});
assert.equal(g.run('JSON.stringify(state.solved)'), '[0,19,20,69,99,199]');
assert.equal(g.run('state.earnedCrystals'),30);
assert.match(g.node('#solvedCount').textContent,/6 \/ 200/);
});

test('ages 9–10 has 200 unique guided questions and every answer awards correctly',()=>{
const g=game();g.run("switchAge('9-10')");
assert.equal(g.run('questions.length'),200);
assert.equal(g.run('new Set(questions.map(q=>q.q)).size'),200);
assert.equal(g.run('questions.every(q=>q.kind==="guided"&&q.hint.length===3&&q.steps.length===3&&Number.isFinite(q.answer))'),true);
for(let i=0;i<200;i++){
g.run(`openQuestion(${i})`);g.node('#answer').value='999999';g.run('checkAnswer()');assert.equal(g.run('state.solved.length'),i);
g.node('#answer').value=g.run(`String(questions[${i}].answer)`);g.run('checkAnswer();checkAnswer()');assert.equal(g.run('state.solved.length'),i+1);
}
assert.equal(g.run('state.crystals'),1000);assert.equal(g.run('earnedSquishies()'),20);
assert.match(g.node('#challengeBody').innerHTML,/All 200 discoveries/);
});
test('age switching preserves independent rewards, progress, upgrades, and stash',()=>{
const g=game({solved:[0,1,2,3,4,5,6,7,8,9],upgrades:['cottage'],crystals:35,earnedCrystals:50});
g.run("switchAge('9-10')");assert.equal(g.run('state.crystals'),0);assert.equal(g.run('earnedSquishies()'),0);
g.run('openQuestion(0)');g.node('#answer').value=g.run('String(questions[0].answer)');g.run('checkAnswer()');
g.run("switchAge('11-12')");assert.equal(g.run('state.solved.length'),10);assert.equal(g.run('state.crystals'),35);assert.equal(g.run('earnedSquishies()'),1);assert.equal(g.run('state.upgrades[0]'),'cottage');
g.run("switchAge('9-10')");assert.equal(g.run('state.solved.length'),1);assert.equal(g.run('state.crystals'),5);assert.equal(g.run('localStorage.getItem("skyseed-age")'),'9-10');
g.run("switchAge('invalid')");assert.equal(g.run('ageLevel'),'9-10');
});

test('world has seventeen islands plus mainland beach and allows cavern access without a permanent pass',()=>{
const g=game();assert.equal(g.run('WORLD.width*WORLD.height'),960*600*20);assert.equal(g.run('islandPolys.length'),18);
assert.equal(g.run('canWalk(740,483)'),true);g.run('state.ferryTicket=true');assert.equal(g.run('canWalk(740,483)'),true);
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
test('shore lures catch the same small fish without consuming bait and survive reload',()=>{
const g=game();g.run('state.crystals=100;openFishing();buyRod()');
for(let i=0;i<3;i++)g.run(`{const fish=fishingTargets(fishingTime+FISH_CAST_DURATION)[${i}];castFishing(fish.x,fish.y);advanceFishing(FISH_CAST_DURATION);for(let r=0;r<6;r++){reelFishing();advanceFishing(180);}}`);
for(const id of ['bass','salmon','catfish'])assert.equal(g.run(`state.catches.${id}`),1);
g.run('buyLure();updateFishing()');
assert.equal(g.node('#buyRod').hidden,true);
for(let i=0;i<3;i++){g.run(`{const fish=fishingTargets(fishingTime+FISH_CAST_DURATION)[${i}];castFishing(fish.x,fish.y);advanceFishing(FISH_CAST_DURATION);for(let r=0;r<6;r++){reelFishing();advanceFishing(180);}}`);g.node('#sponsorship').close();}
for(const id of ['bass','salmon','catfish'])assert.equal(g.run(`state.catches.${id}`),2);
for(const id of ['snook','redfish','trout'])assert.equal(g.run(`state.catches.${id}`)||0,0);
g.run('{const fish=fishingTargets(fishingTime+FISH_CAST_DURATION)[0];castFishing(fish.x,fish.y);advanceFishing(FISH_CAST_DURATION);for(let r=0;r<6;r++){reelFishing();advanceFishing(180);}}');assert.equal(g.run('state.catches.bass'),3);assert.match(g.node('#fishBadges').innerHTML,/Lifetime × 3/);
const saved=g.run('JSON.parse(localStorage.getItem(KEY))');const restored=game(saved);assert.equal(restored.run('state.catches.bass'),3);assert.equal(restored.run('state.fishingLure'),true);assert.equal(restored.run('state.bait'),2);
g.run("switchAge('9-10')");assert.equal(g.run('state.bait'),0);assert.equal(g.run('state.fishingLure'),false);assert.equal(g.run('state.catches.bass'),0);
g.run("switchAge('11-12')");assert.equal(g.run('state.catches.bass'),3);
});
test('automatic lures allow repeated casts with no bait before sponsorship',()=>{
const g=game();g.run('state.crystals=20;openFishing();buyLure()');
for(let i=0;i<7;i++){
g.run('castFishing(10,40)');assert.equal(g.run('pendingCast.lure'),true);
g.run('advanceFishing(FISH_CAST_DURATION)');
}
assert.equal(g.run('state.bait'),0);assert.equal(g.run('totalCatches()'),0);
assert.equal(g.run('state.crystals'),0);assert.match(g.node('#fishingFeedback').textContent,/Lures ready/);
const restored=game(undefined,g.snapshot());restored.run('openFishing();castFishing(10,40)');
assert.equal(restored.run('pendingCast.lure'),true);
});
test('hooked fish struggle and escape after exactly two seconds without reeling',()=>{
const g=game();g.run('state.crystals=5;openFishing();buyRod();{const f=fishingTargets(fishingTime+FISH_CAST_DURATION)[0];castFishing(f.x,f.y);advanceFishing(FISH_CAST_DURATION);}');
assert.equal(g.run('totalCatches()'),0);assert.equal(g.node('#mapFishingReel').hidden,false);
const first=g.run('hookedFishingPose().fish.x');g.run('advanceFishing(150);draw()');assert.notEqual(g.run('hookedFishingPose().fish.x'),first);
g.run('advanceFishing(1849)');assert.equal(g.run('!!hookedFish'),true);
g.run('advanceFishing(1);reelFishing()');assert.equal(g.run('hookedFish'),null);assert.equal(g.run('totalCatches()'),0);assert.equal(g.node('#mapFishingReel').hidden,true);assert.match(g.node('#fishingFeedback').textContent,/shook free/);
});
test('reeling resets the escape timer, bends the rod, and rewards only a landed fish',()=>{
const g=game();g.run('state.crystals=5;openFishing();buyRod();{const f=fishingTargets(fishingTime+FISH_CAST_DURATION)[0];castFishing(f.x,f.y);advanceFishing(FISH_CAST_DURATION);}advanceFishing(1900)');
const tip=g.run('hookedFishingPose().tip.y'),lean=g.run('hookedFishingPose().lean');
g.node('#mapFishingReel').onclick();assert.ok(g.run('hookedFishingPose().tip.y')<tip);assert.ok(g.run('hookedFishingPose().lean')>lean);
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
assert.equal(g.run('state.bait'),0);assert.equal(g.run('state.crystals'),0);assert.equal(g.node('#sponsorship').open,false);assert.equal(g.node('#buyRod').hidden,true);
g.run('buyRod()');assert.equal(g.run('state.crystals'),0);
const restored=game(g.run('JSON.parse(localStorage.getItem(KEY))'));assert.equal(restored.run('sponsored()'),true);assert.equal(restored.node('#sponsorship').open,undefined);
});
test('sponsored boat launches, supports fishing, and returns safely to the fishing dock',()=>{
const g=game();g.run('launchBoat()');assert.equal(g.run('boating'),false);
g.run('state.catches={barracuda:5};checkSponsorship();$("#sponsorship").close();openFerry();launchBoat()');assert.equal(g.run('boating'),true);assert.equal(g.run('canWalk(player.x,player.y)'),true);assert.equal(g.run('canWalk(218,170)'),false);
g.run('player.x=430;player.y=310;openFishing()');assert.equal(g.run('player.x'),430);assert.equal(g.run('player.y'),310);g.run('save();draw()');assert.equal(g.run('state.x'),g.run('fishingDock.x'));assert.equal(g.run('state.y'),g.run('fishingDock.y-8'));
g.run('returnBoat()');assert.equal(g.run('boating'),false);assert.equal(g.run('canWalk(player.x,player.y)'),true);
assert.equal(g.run('state.ferryTicket'),false);g.run('visit(4)');assert.equal(g.run('voyage'),null);
g.run("switchAge('9-10')");assert.equal(g.run('sponsored()'),false);
});
test('existing five-fish saves receive the sponsorship announcement',()=>{
const g=game({solved:[],upgrades:[],crystals:0,catches:{barracuda:3,stingray:2}});assert.equal(g.node('#sponsorship').open,true);assert.equal(g.run('state.sponsorshipAnnounced'),true);assert.equal(g.run('sponsored()'),true);
});

test('fishing dock commands use F to fish, E to launch, and X to dive',()=>{
const g=game({solved:[],upgrades:[],catches:{bass:5},sponsorshipAnnounced:true});
g.run('const dockQuery=document.querySelector;document.querySelector=selector=>selector==="#interactBtn"?null:dockQuery(selector);player.x=fishingDock.x;player.y=fishingDock.y-8;tick(16)');
assert.equal(g.node('#mapDockFishing').hidden,false);assert.equal(g.node('#mapFishingBoat').hidden,false);
assert.equal(g.node('#mapDive').hidden,false);assert.equal(g.node('#interaction').innerHTML,'');
g.run('const dockKey=(key,repeat=false)=>window.listeners.keydown.find(l=>!l.capture).handler({key,repeat,target:{tagName:"CANVAS"},preventDefault(){}})');
g.run('dockKey("f",true)');assert.equal(g.run('fishingActive'),false);
g.run('dockKey("f")');assert.equal(g.run('fishingActive'),true);assert.equal(g.run('boating'),false);
g.run('dockKey("e")');assert.equal(g.run('boating'),true);assert.equal(g.run('fishingActive'),false);
g.run('returnBoat();dockKey("x")');assert.equal(g.run('swimming'),true);assert.ok(g.run('diveAnimation'));
const h=game();h.run('player.x=fishingDock.x;player.y=fishingDock.y-8;tick(16)');
assert.equal(h.node('#mapDockFishing').hidden,false);assert.equal(h.node('#mapFishingBoat').hidden,true);
h.node('#mapDockFishing').onclick();assert.equal(h.run('fishingActive'),true);
});
test('fishing uses the main map and stops cleanly without a popup',()=>{
const g=game();g.run('state.crystals=5;openFishing();buyRod()');
assert.equal(g.run('fishingActive'),true);assert.equal(g.node('#stopFishing').hidden,false);assert.equal(g.node('#fishingFeedback').hidden,false);
assert.equal(g.run('fishingTargets().every(f=>!islandPolys.some(p=>inside(f.x,f.y,p)))'),true);
g.run('{const f=fishingTargets(fishingTime+FISH_CAST_DURATION)[1];castFishing(f.x,f.y);advanceFishing(FISH_CAST_DURATION);for(let r=0;r<6;r++){reelFishing();advanceFishing(180);}draw();}');assert.equal(g.run('state.catches.salmon'),1);
g.run('castFishing(10,40);stopFishing();advanceFishing(FISH_CAST_DURATION)');assert.equal(g.run('pendingCast'),null);assert.equal(g.node('#fishingFeedback').hidden,true);assert.equal(g.node('#stopFishing').hidden,true);
const html=fs.readFileSync('dist/index.html','utf8');assert.doesNotMatch(html,/<dialog id="fishing"/);assert.doesNotMatch(html,/id="fishingWater"/);assert.doesNotMatch(html,/id="fishing"/);assert.doesNotMatch(html,/id="reelFish"/);
});

test('fishing supplies work from the travel submenu without starting fishing',()=>{
const g=game();g.run('state.crystals=30;update();toggleSubmenu("water")');
assert.equal(g.node('#waterSubmenu').hidden,false);
g.node('#buyRod').onclick();assert.equal(g.run('state.bait'),5);assert.equal(g.run('state.crystals'),25);
g.node('#buyLure').onclick();assert.equal(g.run('state.fishingLure'),true);assert.equal(g.run('state.crystals'),5);
assert.equal(g.run('fishingActive'),false);assert.equal(g.node('#buyRod').hidden,true);
g.node('#mapDockFishing').onclick();assert.equal(g.node('#waterSubmenu').hidden,true);assert.equal(g.run('fishingActive'),true);
g.node('#stopFishing').onclick();assert.equal(g.run('fishingActive'),false);
});
test('inline ferry pass purchases stay in travel and reflect ownership and expiry',()=>{
const g=game();g.run('toggleSubmenu("water");updateWaterControls()');
assert.equal(g.node('#buyFerryPass').disabled,true);assert.equal(g.node('#useFerryPass').hidden,true);
const start=g.run('JSON.stringify([player.x,player.y])');
g.run('state.crystals=50;update()');g.node('#buyFerryPass').onclick();
assert.equal(g.run('state.crystals'),25);assert.equal(g.run('state.ferryTicket'),true);assert.equal(g.run('state.ferryRemaining'),0);
assert.equal(g.run('JSON.stringify([player.x,player.y])'),start);assert.equal(g.run('activeSubmenu'),'water');assert.equal(g.run('activeMapPanel'),null);
assert.equal(g.node('#buyFerryPass').hidden,true);assert.equal(g.node('#useFerryPass').hidden,false);
g.node('#buyFerryPass').onclick();assert.equal(g.run('state.crystals'),25);
g.node('#useFerryPass').onclick();assert.equal(g.run('boating'),true);assert.equal(g.run('activeMapPanel'),null);
g.run('advanceSwimming(1000);updateWaterControls()');assert.equal(g.run('formatRideTime(state.ferryRemaining)'), '4:59');
const restored=game(null,g.snapshot());assert.equal(restored.node('#useFerryPass').hidden,false);
g.run('state.ferryRemaining=1;advanceSwimming(1);updateWaterControls()');assert.equal(g.node('#buyFerryPass').hidden,false);
});
test('permanent catch history opens lifetime totals and follows the selected explorer',()=>{
const g=game({catches:{bass:2,snook:1},sponsorshipAnnounced:true});
g.node('#catchHistoryBtn').onclick();assert.equal(g.run('activeMapPanel'),'catchHistory');
assert.equal(g.node('#catchHistory').hidden,false);
assert.match(g.node('#fishCatchTotal').textContent,/3 fish caught/);assert.match(g.node('#fishBadges').innerHTML,/Snook/);
g.run("switchAge('9-10')");g.node('#catchHistoryBtn').onclick();assert.match(g.node('#fishCatchTotal').textContent,/3 fish caught/);
g.run('closeMapPanel()');assert.equal(g.node('#catchHistory').hidden,true);
g.node('#profileName').value='New angler';g.run('createProfile()');g.node('#catchHistoryBtn').onclick();
assert.match(g.node('#fishCatchTotal').textContent,/0 fish caught/);assert.doesNotMatch(g.node('#fishBadges').innerHTML,/Lifetime ×/);
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
g.node('#mapDockFishing').onclick();assert.equal(g.node('#settingsPanel').hidden,true);assert.equal(g.run('fishingActive'),true);
g.run('window.innerWidth=390;window.innerHeight=844;resizeMap();state.crystals=5;buyRod()');
g.node('#world').getBoundingClientRect=()=>({left:0,top:0,width:390,height:844});
const point=g.run('({x:(10-camera.x)/WORLD.viewWidth*390,y:(40-camera.y)/WORLD.viewHeight*844})');
g.node('#world').onclick({clientX:point.x,clientY:point.y});assert.ok(Math.abs(g.run('pendingCast.x')-10)<.000001);assert.ok(Math.abs(g.run('pendingCast.y')-40)<.000001);
});

test('exit at the fishing dock steps onto walkable land without diving',()=>{
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
test('swimmers walk onto shore, allow cavern access without a pass, and save safely',()=>{
const g=game();g.run('state.catches={barracuda:5};launchBoat();player.x=430;player.y=310;exitBoat();if(boatAnchorCasting())advanceSwimming(FISH_CAST_DURATION);advanceSwimming(700);save()');
assert.equal(g.run('state.x'),g.run('fishingDock.x'));assert.equal(g.run('state.y'),g.run('fishingDock.y-8'));assert.equal(g.run('canWalk(740,483)'),true);
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
test('shared fish projection keeps raised fins upright and headings aligned in every direction',()=>{
const g=game();
for(const heading of [0,Math.PI/4,Math.PI/2,Math.PI,Math.PI*1.5,Math.PI*1.75]){
g.run(`{
const base=seaFishPoint(430,310,${heading},-2,0),tip=seaFishPoint(430,310,${heading},-2,0,12);
if(Math.abs(tip.x-base.x)>1e-9||Math.abs(tip.y-base.y+12)>1e-9)throw Error('Fin height rotated');
const nose=seaFishPoint(430,310,${heading},25,0);
if(Math.abs(Math.atan2(Math.sin(Math.atan2(nose.y-310,nose.x-430)-${heading}),Math.cos(Math.atan2(nose.y-310,nose.x-430)-${heading})))>1e-9)throw Error('Body misaligned');
drawSeaFishBody(430,310,${heading},1,1,'shark');drawSeaFishBody(430,310,${heading},1,1,'marlin');
}`);
}
});
test('fish wakes retain world positions through turns and expire; body flex grows toward the tail',()=>{
const g=game();
g.run('let fishMotion={x:600,y:350,heading:0};advanceSeaFishSwim(fishMotion,16,6);let oldWake={...fishMotion.wake[0]};fishMotion.x+=4;fishMotion.heading=Math.PI/2;advanceSeaFishSwim(fishMotion,16,4)');
assert.equal(g.run('fishMotion.wake[0].x===oldWake.x&&fishMotion.wake[0].y===oldWake.y&&fishMotion.wake[0].heading===oldWake.heading'),true);
assert.equal(g.run('fishMotion.wake.length'),2);
assert.equal(g.run('seaFishBend(24,1)'),0);
assert.ok(g.run('Math.abs(seaFishBend(-30,1))>Math.abs(seaFishBend(8,1))'));
g.run('const stillPhase=fishMotion.phase;advanceSeaFishSwim(fishMotion,1600,0)');
assert.equal(g.run('fishMotion.wake.length'),0);assert.equal(g.run('fishMotion.phase===stillPhase'),true);
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
g.run('toggleSubmenu("water");state.crystals=50;buyFerryTicket()');assert.equal(g.run('activeMapPanel'),null);assert.equal(g.run('activeSubmenu'),'water');assert.equal(g.run('state.ferryTicket'),true);
g.node('#mapDockFishing').onclick();assert.equal(g.node('#waterSubmenu').hidden,true);assert.equal(g.run('fishingActive'),true);
const html=fs.readFileSync('dist/index.html','utf8');assert.match(html,/map-icon-rail/);assert.doesNotMatch(html,/id="islandMenu"/);assert.doesNotMatch(html,/<dialog id="(?:journal|stash|ferry|welcome)"/);
});

test('pixel icon groups expand submenus and hand off to map controls',()=>{
const g=game();g.node('#exploreMenuBtn').onclick();assert.equal(g.run('activeSubmenu'),'explore');assert.equal(g.node('#exploreSubmenu').hidden,false);
g.node('#waterMenuBtn').onclick();assert.equal(g.node('#exploreSubmenu').hidden,true);assert.equal(g.node('#waterSubmenu').hidden,false);
g.node('#waterMenuBtn').onclick();assert.equal(g.node('#waterSubmenu').hidden,true);assert.equal(g.run('activeSubmenu'),null);
g.node('#settingsMenuBtn').onclick();g.node('#settingsBtn').onclick();assert.equal(g.node('#settingsSubmenu').hidden,true);assert.equal(g.node('#settingsPanel').hidden,false);
g.node('#waterMenuBtn').onclick();assert.equal(g.node('#settingsPanel').hidden,true);g.node('#mapDockFishing').onclick();assert.equal(g.run('activeSubmenu'),null);assert.equal(g.run('fishingActive'),true);
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
g.run('advanceSwimming(700)');assert.equal(g.run('canWalk(740,483)'),true);
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
test('fish swim smoothly and only surface intermittently with bait or automatic lures',()=>{
const g=game();g.run('openFishing()');
for(const lure of [false,true]){
g.run(`state.fishingLure=${lure}`);
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

test('shark and marlin submerge and resurface head first in every heading',()=>{
const g=game();
for(const x of [-35,-15,0,15,25]){
assert.equal(g.run(`sharkSegmentOpacity(${x},0)`),1);assert.equal(g.run(`sharkSegmentOpacity(${x},1)`),0);
}
assert.ok(g.run('sharkSegmentOpacity(-30,.5)>sharkSegmentOpacity(20,.5)'));
assert.ok(g.run('sharkSegmentOpacity(20,.5,true)>sharkSegmentOpacity(-30,.5,true)'));
for(const depth of [0,1])for(const x of [-35,0,25])assert.equal(g.run(`sharkSegmentOpacity(${x},${depth},true)`),1-depth);
for(const x of [-30,0,20])assert.ok(g.run(`sharkSegmentOpacity(${x},.3)>=sharkSegmentOpacity(${x},.6)`));
g.run('swimming=true;player.x=600;player.y=310;sharkRide={x:600,y:310,heading:0,phase:0,diveElapsed:5400};const originalBody=drawSeaFishBody;let slices=[];drawSeaFishBody=(x,y,heading,phase,opacity,kind)=>{slices.push(opacity);originalBody(x,y,heading,phase,opacity,kind)}');
for(const kind of ['shark','marlin'])for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2]){
g.run(`sharkRide.kind='${kind}';sharkRide.heading=${heading};sharkRide.diveElapsed=5400;slices=[];drawSharkRide()`);
const diving=g.run('JSON.stringify(slices)');assert.ok(g.run('slices.length>1&&slices.some(a=>a>0&&a<1)'));
g.run('sharkRide.diveElapsed=8000;slices=[];drawSharkRide()');assert.notEqual(g.run('JSON.stringify(slices)'),diving);
assert.ok(g.run('slices.length>1&&slices[0]<slices[slices.length-1]'));
g.run('sharkRide.diveElapsed=5400;sharkRide.resurfacing=true;slices=[];drawSharkRide()');
assert.ok(g.run('slices.length>1&&slices[0]<slices[slices.length-1]'));
g.run('sharkRide.resurfacing=false');
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
test('sharks can be steered, stay in water, and allow cavern access without a pass',()=>{
const g=game();g.run('swimming=true;player.x=600;player.y=310;sharkFins=[{x:605,y:310,vx:.02,vy:0,age:500,duration:4000}];latchShark();keys.add("down");advanceSwimming(100)');assert.ok(g.run('player.y')>310);assert.ok(g.run('player.x')>600);assert.ok(g.run('sharkRide.heading')>0&&g.run('sharkRide.heading')<Math.PI/2);
g.run('keys.clear();player.x=20;player.y=20;sharkRide.heading=Math.PI;advanceSwimming(100)');assert.equal(g.run('sharkWater(player.x,player.y)'),true);
g.run('player.x=740;player.y=325;keys.add("down")');
for(let i=0;i<150;i++){g.run('advanceSwimming(40)');assert.equal(g.run('sharkWater(player.x,player.y)'),true);}
assert.equal(g.run('canWalk(740,483)'),true);g.run('save()');const restored=game(null,g.snapshot());assert.equal(restored.run('sharkRide'),null);assert.equal(restored.run('swimming'),false);assert.equal(restored.run('canWalk(player.x,player.y)'),true);
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
g.run('swimming=true;player.x=740;player.y=325;moveExplorer(0,1)');assert.equal(g.run('!!shoreClimb'),true);
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

test('unused single-ride tickets persist on reload but confer no permanent ownership',()=>{
const g=game();g.run('state.crystals=75;buyFerryTicket()');assert.equal(g.run('state.crystals'),50);
const restored=game(null,g.snapshot());assert.equal(restored.run('state.ferryTicket'),true);assert.equal(restored.run('currentProfile().ferryTicket'),undefined);
g.run("switchAge('9-10')");assert.equal(g.run('state.ferryTicket'),false);
g.run("switchAge('11-12')");assert.equal(g.run('state.ferryTicket'),true);
g.node('#resetBtn').onclick();g.node('#confirmReset').onclick();assert.equal(g.run('state.ferryTicket'),false);
});

test('legacy permanent ferry passes are removed from every age level',()=>{
const g=game(null,{'skyseed-v1-9-10':JSON.stringify({solved:[],upgrades:[],ferryTicket:true})});
assert.equal(g.run('state.ferryTicket'),false);assert.equal(g.run('currentProfile().ferryTicket'),undefined);
g.run("switchAge('9-10')");assert.equal(g.run('state.ferryTicket'),false);
});

for(const level of ['5-6','7-8']){
test(`ages ${level} has 200 distinct, correct problems and rewards every answer`,()=>{
const g=game();g.run(`switchAge('${level}')`);
const bank=JSON.parse(g.run('JSON.stringify(questions.slice(0,100))'));
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
assert.equal(g.run('new Set(locations.flatMap(l=>l.ids)).size'),200);
for(let i=0;i<200;i++){
g.run(`openQuestion(${i})`);g.node('#answer').value=g.run(`String(questions[${i}].answer)`);g.run('checkAnswer();checkAnswer()');
assert.equal(g.run('state.solved.length'),i+1);
}
assert.equal(g.run('state.crystals'),1000);assert.match(g.node('#challengeBody').innerHTML,/All 200 discoveries/);
});
}

test('four age brackets preserve independent progress while retired selected brackets upgrade on reload',()=>{
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
assert.equal(restored.run('ageLevel'),'9-10');assert.equal(restored.run('state.crystals'),0);
restored.run("switchProfile('legacy')");assert.equal(restored.run('ageLevel'),'9-10');assert.equal(restored.run('state.crystals'),27);
restored.run("switchAge('7-8')");assert.equal(restored.run('state.crystals'),26);
const html=fs.readFileSync('dist/index.html','utf8');
for(const level of ['5-6','7-8'])assert.ok(html.includes(`<option value="${level}" disabled>`));
for(const level of ['9-10','11-12'])assert.ok(html.includes(`<option value="${level}">`));
});

test('legacy younger age preferences upgrade without copying or deleting age progress',()=>{
for(const level of ['5-6','7-8']){
const younger=JSON.stringify({solved:[0,1],upgrades:['cottage'],crystals:35});
const g=game(null,{'skyseed-age':level,[`skyseed-v1-${level}`]:younger});
assert.equal(g.run('ageLevel'),'9-10');assert.equal(g.run('KEY'),'skyseed-v1-9-10');
assert.equal(g.run('questions===questionsByAge["9-10"]'),true);
assert.equal(g.node('#ageLevel').value,'9-10');
assert.equal(g.run('state.solved.length'),0);assert.equal(g.run('state.crystals'),0);
const snapshot=g.snapshot();
assert.equal(snapshot[`skyseed-v1-${level}`],younger);
assert.equal(JSON.parse(snapshot['skyseed-profiles-v1']).profiles[0].age,'9-10');
assert.equal(game(null,snapshot).run('ageLevel'),'9-10');
}
});

test('all saved profiles upgrade younger ages and preserve existing older progress on reload',()=>{
const profiles=['5-6','7-8','9-10','11-12'].map((age,i)=>({id:`p${i+1}`,name:`Player ${i+1}`,character:'girl',age}));
const stored={'skyseed-profiles-v1':JSON.stringify({active:'p1',profiles})};
for(const [i,p] of profiles.entries()){
stored[`skyseed-profile-${p.id}-${p.age}`]=JSON.stringify({solved:[i],upgrades:[],crystals:20+i});
if(i<2)stored[`skyseed-profile-${p.id}-9-10`]=JSON.stringify({solved:[10+i],upgrades:[],crystals:50+i});
}
const g=game(null,stored);
assert.equal(g.run('JSON.stringify(profiles.map(p=>p.age))'),JSON.stringify(['9-10','9-10','9-10','11-12']));
for(const [i,p] of profiles.entries()){
g.run(`switchProfile('${p.id}')`);
assert.equal(g.run('ageLevel'),i===3?'11-12':'9-10');
assert.equal(g.run('state.crystals'),i<2?50+i:20+i);
assert.equal(g.run('state.solved[0]'),i<2?10+i:i);
assert.equal(g.run('currentProfile().character'),'girl');
}
const snapshot=g.snapshot();
for(const p of profiles.slice(0,2))assert.equal(snapshot[`skyseed-profile-${p.id}-${p.age}`],stored[`skyseed-profile-${p.id}-${p.age}`]);
assert.deepEqual(JSON.parse(snapshot['skyseed-profiles-v1']).profiles.map(p=>p.age),['9-10','9-10','9-10','11-12']);
const restored=game(null,snapshot);restored.run("switchProfile('p1')");
assert.equal(restored.run('ageLevel'),'9-10');assert.equal(restored.run('state.crystals'),50);
});

test('new age brackets use suitable flash arithmetic and keep single-ride tickets separate',()=>{
const g=game();g.run('state.crystals=50;buyFerryTicket()');
for(const level of ['5-6','7-8']){
g.run(`switchAge('${level}')`);assert.equal(g.run('state.ferryTicket'),false);
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
for(let i=0;i<200;i++){
g.run(`openQuestion(${i})`);assert.match(g.node('#workbench').innerHTML,/visual-result/);
if(g.run(`!!questions[${i}].visual`))assert.match(g.node('#workbench').innerHTML,/math-picture/);
}
}
});

test('Loch Ness encounters are disabled while swimming',()=>{
const g=game();g.run('player.x=430;player.y=310;swimming=true;Math.random=()=>0;nextLochDragon=0');
for(let i=0;i<10;i++)g.run('advanceLochDragon(60000)');
assert.equal(g.run('lochDragon'),null);
g.run('lochDragon={x:435,y:310,heading:0,age:1000,duration:18000};latchLochDragon()');
assert.equal(g.run('sharkRide'),null);
g.run('let monsterDraws=0;drawLochDragonBody=()=>monsterDraws++;drawLochDragon()');
assert.equal(g.run('monsterDraws'),0);
g.run('advanceSwimming(0);draw()');
assert.equal(g.run('lochDragon'),null);assert.equal(g.run('sharkRide'),null);
assert.doesNotMatch(g.node('#waterControls').textContent,/LOCH NESS MONSTER/);
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
assert.equal(g.run('boatMotion.wake.every(w=>w.x<player.x&&Math.abs(w.y-310)===6)'),true);
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
g.run('swimming=true;player.x=740;player.y=325');assert.ok(g.run('sharkShoreLanding(Math.PI/2)'));
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
g.node('#answer').value=g.run('String(questions[0].answer)');g.run('checkAnswer()');assert.equal(g.run('state.power'),50);assert.equal(g.run('state.crystals'),5);g.run('checkAnswer()');assert.equal(g.run('state.power'),50);
assert.match(g.node('#challengeBody').innerHTML,/\+50 energy/);
assert.match(g.node('#powerHelp').textContent,/\+50 energy/);
g.node('#challenge').close();g.run('state.power=75;startFlash()');g.node('#flashAnswer').value=g.run('String(flashRun.question.answer)');g.run('submitFlash()');assert.equal(g.run('state.power'),100);
});
test('power drains in water, returns exhausted swimmers to land, and allows free boat launches',()=>{
const g=game({power:0,solved:[],upgrades:[]});assert.equal(g.run('hasSwimPower()'),false);
g.run('startDive({x:430,y:310});state.catches={barracuda:5};launchBoat()');assert.equal(g.run('swimming'),false);assert.equal(g.run('boating'),true);
g.run('boating=false;state.power=1;swimming=true;player.x=600;player.y=350;nextSharkFin=1e9;nextLochDragon=1e9;nextBlueMarlin=1e9;advanceSwimming(1000)');assert.ok(Math.abs(g.run('state.power')-1/6)<1e-9);assert.equal(g.run('swimming'),true);
g.run('advanceSwimming(1000)');assert.equal(g.run('swimming'),false);assert.equal(g.run('state.power'),0);assert.equal(g.run('canWalk(player.x,player.y)'),true);assert.match(g.node('#powerHelp').textContent,/Solve a problem/);
});
test('energy scales around three minutes across all activities',()=>{
const activities=[['frisbeeGame={}',240],['fishingActive=true',180],['swimming=true;sharkRide={kind:"shark"}',180],['swimming=true;sharkRide={kind:"marlin"}',180],['swimming=true;sharkRide={kind:"dragon"}',180],['dragonFlight={stage:"swimming"}',180],['dragonFlight={stage:"flying"}',180],['swimming=true',120],['volleyball={}',120],['surfSession={phase:"paddling"}',120],['wakeboardRide={equipment:"wakeboard"}',120],['wakeboardRide={equipment:"waterskis"}',120]];
for(const [setup,seconds] of activities){
const g=game();g.run(`${setup};if(frisbeeGame)frisbeeGame.exit={x:230,y:176};if(volleyball)volleyball.exit={x:230,y:176};if(surfSession){surfSession.safe={x:230,y:176};surfSession.score=0;}if(dragonFlight)dragonFlight.safe={x:230,y:176};if(wakeboardRide)wakeboardRide.safe={x:230,y:176};advancePower(10000)`);
assert.ok(Math.abs(g.run('state.power')-(100-1000/seconds))<1e-9,setup);
assert.equal(g.run('currentProfile().power'),g.run('state.power'));
}
});

test('activity dispatcher drains once before game and ride early returns and exhausts on schedule',()=>{
const cases=[['player.x=frisbeeHost(0).x;player.y=1737;startFrisbee(0)',240],['player.x=500;player.y=1770;startVolleyball(0)',120],['player.x=SURF_SHACK.x;player.y=SURF_SHACK.y;state.surfRental=true;startSurfing()',120],['mountPetDragon();advanceSwimming(650)',180],['state.wakeboard=true;player.x=WATERSPORTS_DOCK.x;player.y=WATERSPORTS_DOCK.y-18;startWakeboarding()',120]];
for(const [setup,seconds] of cases){
const g=game();g.run(`state.beachPass=true;${setup};state.power=100;advanceSwimming(1000)`);
assert.ok(Math.abs(g.run('state.power')-(100-100/seconds))<1e-9,setup);
g.run(`advancePower(${(seconds-1)*1000})`);assert.equal(g.run('state.power'),0,setup);assert.equal(g.run('currentEnergyActivity()'),null,setup);
}
});

test('empty energy allows ferry, speedboat, island reboarding and anchored boat transfers',()=>{
const g=game();g.run('state.power=0;state.ferryTicket=true;boardFerry()');assert.equal(g.run('boating'),true);
g.run('returnBoat();state.speedboat=true;currentProfile().speedboat=true;launchSpeedboat()');assert.equal(g.run('boating'),true);assert.equal(g.run('activeVessel'),'speedboat');
g.run('boating=false;state.boatIsland=boatIslands[0].id;player.x=boatIslands[0].dock.x;player.y=boatIslands[0].dock.y-18;boatPosition={x:player.x+40,y:player.y+30};boardOwnBoat()');assert.equal(g.run('boating'),true);
g.run('boating=false;state.boatIsland=null;state.beachPass=true;player.x=1120;player.y=1762;state.beachAnchor={x:1120,y:1650,landing:{x:1120,y:1762}};returnToAnchoredBoat()');assert.equal(g.run('beachTransfer.boarding'),true);assert.equal(g.run('state.power'),0);
});

test('energy pauses for dialogs, paused surfing, results, idle land and boat travel',()=>{
const g=game();
for(const setup of ['keys.add("right");moveExplorer(2,0)','boating=true','boating=false;surfSession={phase:"riding",paused:true}','surfSession={phase:"results"}']){
g.run(`${setup};advancePower(10000)`);assert.equal(g.run('state.power'),100);
}
g.run('surfSession=null;fishingActive=true');g.node('#challenge').showModal();g.run('advancePower(10000)');assert.equal(g.run('state.power'),100);
g.node('#challenge').close();g.run('adminMode=true;advancePower(10000)');assert.equal(g.run('state.power'),100);
});

test('energy exhaustion stops fishing on a boat and leaves boat travel available',()=>{
const g=game();g.run('state.catches={barracuda:5};launchBoat();openFishing();advanceSwimming(180000)');
assert.equal(g.run('state.power'),0);assert.equal(g.run('fishingActive'),false);assert.equal(g.run('boating'),true);
g.run('openFishing();advanceSwimming(1000)');assert.equal(g.run('fishingActive'),false);assert.equal(g.run('state.power'),0);
g.run('restorePower();openFishing()');assert.equal(g.run('fishingActive'),true);
});

test('energy exhaustion safely exits beach games, surfing, flying and tow sports',()=>{
for(const activity of ['frisbee','volleyball','surfing','dragon','watersports']){
const g=game();
const setup={frisbee:'frisbeeGame={exit:{x:1120,y:1762}}',volleyball:'volleyball={exit:{x:1120,y:1762}}',surfing:'surfSession={phase:"paddling",safe:{x:1120,y:1762},score:0}',dragon:'dragonFlight={stage:"flying",safe:{x:230,y:176}}',watersports:'state.wakeboard=true;player.x=WATERSPORTS_DOCK.x;player.y=WATERSPORTS_DOCK.y-18;startWakeboarding()'}[activity];
g.run('state.beachPass=true');g.run(setup);assert.notEqual(g.run('currentEnergyActivity()'),null,activity);
g.run('state.power=.01;advancePower(1000)');assert.equal(g.run('state.power'),0);
assert.equal(g.run('currentEnergyActivity()'),null,activity);assert.equal(g.run('canWalk(player.x,player.y)'),true,activity);
}
});

test('zero energy blocks recreational activity entry',()=>{
const g=game();g.run('state.power=0;mountPetDragon();openFishing();startWakeboarding();startFrisbee();startVolleyball(0);startSurfing()');
assert.equal(g.run('currentEnergyActivity()'),null);assert.equal(g.run('state.power'),0);
});

test('legacy power values remain compatible across age changes, resets, and reloads',()=>{
const g=game({power:37,solved:[],upgrades:[]});assert.equal(g.run('state.power'),37);
g.run('save();switchAge("9-10")');assert.equal(g.run('state.power'),37);g.run('state.power=0;save();switchAge("11-12")');assert.equal(g.run('state.power'),0);
g.node('#resetBtn').onclick();g.node('#confirmReset').onclick();assert.equal(g.run('state.power'),0);
const restored=game(null,g.snapshot());assert.equal(restored.run('state.power'),0);
g.node('#profileName').value='Power Explorer';g.run('createProfile()');assert.equal(g.run('state.power'),100);g.run('state.power=12;save();switchProfile("legacy")');assert.equal(g.run('state.power'),0);g.run('switchProfile("p1")');assert.equal(g.run('state.power'),12);
});

test('outer islands cannot be visited by journal teleport, swimming, or creature landings',()=>{
const g=game();assert.equal(g.run('boatIslands.length'),12);assert.equal(g.run('WORLD.width*WORLD.height'),960*600*20);
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
g.run(`boating=true;state.ferryRemaining=FERRY_RIDE_DURATION;swimming=false;player.x=boatIslands[${i}].dock.x+43;player.y=boatIslands[${i}].dock.y+15;boatPosition={x:player.x,y:player.y};exitBoat();if(boatAnchorCasting())advanceSwimming(FISH_CAST_DURATION)`);
assert.equal(g.run('boating'),false);assert.equal(g.run('swimming'),false);assert.equal(g.run('state.boatIsland'),g.run(`boatIslands[${i}].id`));assert.equal(g.run('canWalk(player.x,player.y)'),true);assert.equal(g.run('canBoardIslandBoat()'),true);
g.run(`player.x=boatIslands[${i}].x;player.y=boatIslands[${i}].y+30;visitBoatIsland(${i})`);assert.equal(g.node('#challenge').open,true);assert.match(g.node('#challengeCategory').textContent,new RegExp(g.run(`boatIslands[${i}].name`)));g.node('#challenge').close();
g.run(`player.x=boatIslands[${i}].dock.x;player.y=boatIslands[${i}].dock.y-18;boardOwnBoat()`);assert.equal(g.run('boating'),true);assert.equal(g.run('canWalk(player.x,player.y)'),true);
}
assert.equal(g.run('state.boatIslandsVisited.length'),12);g.run('journal()');assert.match(g.node('#journalList').innerHTML,/Palm Cove/);assert.match(g.node('#journalList').innerHTML,/Driftwood Isle/);
});
test('outer island arrival and the parked boat survive reloads without stranding the explorer',()=>{
const g=game();g.run('state.catches={barracuda:5};boating=true;state.ferryRemaining=FERRY_RIDE_DURATION;player.x=boatIslands[0].dock.x+43;player.y=boatIslands[0].dock.y+15;boatMotion.heading=.75;exitBoat();if(boatAnchorCasting())advanceSwimming(FISH_CAST_DURATION)');
const parked=g.run('JSON.stringify(boatPosition)'),restored=game(null,g.snapshot());
assert.equal(restored.run('state.boatIsland'),'palm-cove');assert.equal(restored.run('canWalk(player.x,player.y)'),true);assert.equal(restored.run('JSON.stringify(boatPosition)'),parked);assert.equal(restored.run('boatMotion.heading'),Math.PI/2);
restored.run('boardOwnBoat()');assert.equal(restored.run('boating'),true);
});
test('expanded ocean supports camera movement, creatures, and fishing beyond the old boundaries',()=>{
const g=game();g.run('state.catches={barracuda:5};state.sponsorshipAnnounced=true;boating=true;state.ferryRemaining=FERRY_RIDE_DURATION;player.x=3000;player.y=1500;draw()');assert.equal(g.run('canWalk(3100,1620)'),true);assert.equal(g.run('canWalk(3200,1800)'),false);assert.ok(g.run('camera.x')>960);assert.ok(g.run('camera.y')>600);
g.run('player.x=WORLD.right-10;player.y=1790;draw()');assert.equal(g.run('camera.x+WORLD.viewWidth'),g.run('WORLD.right'));assert.equal(g.run('camera.y+WORLD.viewHeight'),1800);
g.run('activeVessel="speedboat";player.x=4500;player.y=1500;openFishing();{const f=fishingTargets(fishingTime+FISH_CAST_DURATION)[0];castFishing(f.x,f.y);advanceFishing(FISH_CAST_DURATION);}');assert.equal(g.run('!!hookedFish'),true);
g.run('for(let i=0;i<6;i++){reelFishing();advanceFishing(180)}');assert.equal(g.run('state.catches.tuna'),1);
g.run('stopFishing();boating=false;swimming=true;player.x=4500;player.y=1500;sharkFins=[{x:4540,y:1500,vx:.02,vy:0,age:500,duration:4000}];nextSharkFin=1e9;advanceSharkFins(100)');assert.equal(g.run('sharkFins.length'),1);assert.equal(g.run('sharkWater(4600,1600)'),true);
assert.equal(g.run("sharkWater(4500,900)&&boatPoseClear(4500,900,0,'speedboat')"),true);
assert.equal(g.run('sharkWater(WORLD.right,900)'),false);g.run('player.x=4500;player.y=900;draw()');
});

test('cottage pet dragon takes off, flies over water, and lands with its rider',()=>{
const g=game();assert.equal(g.run('canMountPetDragon()'),true);assert.equal(g.node('#mapDragonMount').hidden,false);
g.run('near=100;interact();draw()');assert.equal(g.run('dragonFlight.stage'),'takeoff');
const launchX=g.run('player.x');g.run('moveExplorer(10,0)');assert.equal(g.run('player.x'),launchX);
g.run('advanceSwimming(650);draw()');assert.equal(g.run('dragonFlight.stage'),'flying');assert.equal(g.run('dragonFlight.altitude'),30);
assert.equal(g.node('#mapDragonLand').hidden,false);assert.equal(g.node('#mapDragonLand').disabled,false);
g.run('moveExplorer(50,60)');assert.equal(g.run('player.x'),launchX+50);assert.ok(g.run('dragonFlight.heading')>0);
g.run('player.x=430;player.y=310;advanceSwimming(1000);draw()');assert.equal(g.run('swimming'),false);assert.equal(g.run('boating'),false);assert.ok(g.run('state.power')<100);
g.node('#mapDragonLand').onclick();assert.equal(g.run('dragonFlight.stage'),'splashdown');
g.run('advanceSwimming(500);landPetDragon();advanceSwimming(650);player.x=500;player.y=150;landPetDragon();draw()');assert.equal(g.run('dragonFlight.stage'),'landing');
g.run('advanceSwimming(500);draw()');assert.equal(g.run('dragonFlight'),null);assert.equal(g.run('canWalk(player.x,player.y)'),true);
assert.equal(g.run('petDragonPosition.x'),g.run('player.x'));assert.equal(g.run('canMountPetDragon()'),true);
});

test('flying dragon respects island gates and can always return to the cottage',()=>{
const g=game();g.run('mountPetDragon();advanceSwimming(650);player.x=740;player.y=483;landPetDragon()');
assert.equal(g.run('dragonFlight.stage'),'landing');
g.run('advanceSwimming(500)');assert.equal(g.run('dragonFlight'),null);
g.run('mountPetDragon();advanceSwimming(650);player.x=boatIslands[0].x;player.y=boatIslands[0].y;landPetDragon()');assert.equal(g.run('dragonFlight.stage'),'flying');
g.run('moveExplorer(-100000,-100000)');assert.ok(g.run('player.x')>=g.run('WORLD.left+32'));assert.ok(g.run('player.y')>=50);
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
g.run('advanceSwimming(600);player.x=3000;player.y=1500;keys.add("up")');for(let t=16;t<=640;t+=16)g.run(`tick(${t})`);
g.run('keys.clear();keys.add("down")');for(let t=656;t<=800;t+=16)g.run(`tick(${t})`);
}
const motion='JSON.stringify({x:player.x,y:player.y,heading:boatMotion.heading,power:boatMotion.power,wake:boatMotion.wake.map(w=>({heading:w.heading,age:w.age}))})';assert.equal(ferry.run(motion),fishing.run(motion));assert.ok(ferry.run('boatMotion.wake.length')>0);
for(const g of [ferry,fishing]){const before=g.run('JSON.stringify([player.x,player.y])');g.run('keys.clear();advanceSwimming(1200)');assert.equal(g.run('JSON.stringify([player.x,player.y])'),before);assert.ok(g.run('boatMotion.power')<.01);g.run('player.x=188;player.y=170;moveExplorer(5,-10)');assert.equal(g.run('player.x'),188);}
});
test('the ferry is manually driven and supports casting and reeling without fishing sponsorship',()=>{
const g=game();g.run('state.ferryTicket=true;state.crystals=5;boardFerry()');assert.equal(g.run('boating'),true);assert.equal(g.run('activeVessel'),'ferry');assert.equal(g.run('sponsored()'),false);
const start=g.run('JSON.stringify([player.x,player.y])');g.run('advanceSwimming(3500)');assert.equal(g.run('JSON.stringify([player.x,player.y])'),start);
g.run('player.x=600;player.y=350;openFishing();buyRod()');assert.equal(g.run('player.x'),600);assert.equal(g.run('player.y'),350);assert.equal(g.run('fishingActive'),true);assert.match(g.node('#mapBoatFish').textContent,/ferry/);
g.run('{const f=fishingTargets(fishingTime+FISH_CAST_DURATION)[0];castFishing(f.x,f.y)}');assert.equal(g.run('pendingCast.origin.x'),g.run('fishingAngler().x+4'));
g.run('advanceFishing(FISH_CAST_DURATION);for(let i=0;i<6;i++){reelFishing();advanceFishing(180);draw()}');assert.equal(g.run('state.catches.tarpon'),1);assert.equal(g.run('activeVessel'),'ferry');assert.equal(g.run('boating'),true);
g.run('stopFishing();moveExplorer(2,0)');assert.equal(g.run('player.x'),602);
});
test('ferry offshore exits and reboarding work with a ferry pass and no sponsorship',()=>{
const g=game();g.run('state.ferryTicket=true;boardFerry();player.x=600;player.y=350;exitBoat();if(boatAnchorCasting())advanceSwimming(FISH_CAST_DURATION)');assert.equal(g.run('swimming'),true);assert.equal(g.run('activeVessel'),'ferry');assert.equal(g.run('sponsored()'),false);
g.run('advanceSwimming(700)');assert.equal(g.node('#mapBoatBoard').hidden,false);g.run('boardOwnBoat()');assert.equal(g.run('boating'),true);assert.equal(g.run('swimming'),false);assert.equal(g.run('player.x'),600);
});
test('ferry outer-island docking and its vessel type survive reloads and permit reboarding',()=>{
const g=game();g.run('state.ferryTicket=true;boardFerry();player.x=boatIslands[1].dock.x+43;player.y=boatIslands[1].dock.y+15;boatMotion.heading=.9;exitBoat();if(boatAnchorCasting())advanceSwimming(FISH_CAST_DURATION)');assert.equal(g.run('state.boatIsland'),'coral-key');assert.equal(g.run('canBoardIslandBoat()'),true);assert.equal(g.run('state.parkedBoat.vessel'),'ferry');
const restored=game(null,g.snapshot());assert.equal(restored.run('activeVessel'),'ferry');assert.equal(restored.run('sponsored()'),false);assert.equal(restored.run('canBoardIslandBoat()'),true);assert.equal(restored.run('boatMotion.heading'),Math.PI/2);restored.run('boardOwnBoat();draw()');assert.equal(restored.run('boating'),true);
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

test('swimming pet dragon climbs onto permitted beach and preserves outer-island gates',()=>{
const g=game();g.run(`mountPetDragon();advanceSwimming(650);
player.x=217;player.y=300;dragonFlight.heading=-Math.PI/2;landPetDragon();advanceSwimming(500);moveExplorer(0,-16);draw()`);
assert.equal(g.run('dragonFlight.stage'),'landing');g.run('advanceSwimming(500);draw()');assert.equal(g.run('dragonFlight'),null);assert.equal(g.run('canWalk(player.x,player.y)'),true);assert.equal(g.run('!!goggleToss'),true);
g.run("mountPetDragon();advanceSwimming(650);player.x=740;player.y=483;landPetDragon()");assert.equal(g.run('dragonFlight.stage'),'landing');g.run('advanceSwimming(500);mountPetDragon();advanceSwimming(650)');
g.run('player.x=boatIslands[0].x;player.y=boatIslands[0].y;landPetDragon()');assert.equal(g.run('dragonFlight.stage'),'flying');
});

test('dragon swimming requires power and exhaustion returns its rider safely to land',()=>{
const g=game();const x=g.run('player.x'),y=g.run('player.y');
g.run('mountPetDragon();advanceSwimming(650);player.x=430;player.y=310;state.power=0;landPetDragon()');assert.equal(g.run('dragonFlight.stage'),'flying');
g.run('state.power=1;landPetDragon();advanceSwimming(500);save()');assert.equal(g.run('state.x'),x);assert.equal(g.run('state.y'),y);g.run('state.power=.1');
g.run('advanceSwimming(1000);draw()');assert.equal(g.run('dragonFlight'),null);assert.equal(g.run('state.power'),0);assert.equal(g.run('canWalk(player.x,player.y)'),true);
});
test('wakeboard costs exactly 25 crystals, cannot be bought twice, and saves per explorer and age',()=>{
const g=game();g.run('state.crystals=24;buyWakeboard()');assert.equal(g.run('state.wakeboard'),false);assert.equal(g.run('state.crystals'),24);
g.run('state.crystals=40;buyWakeboard();buyWakeboard()');assert.equal(g.run('state.wakeboard'),true);assert.equal(g.run('state.crystals'),15);
assert.equal(g.node('#buyWakeboardDock').disabled,true);
const restored=game(null,g.snapshot());assert.equal(restored.run('state.wakeboard'),true);assert.equal(restored.run('state.crystals'),15);
g.run("switchAge('7-8')");assert.equal(g.run('state.wakeboard'),false);g.run("switchAge('11-12')");assert.equal(g.run('state.wakeboard'),true);
g.node('#profileName').value='Board friend';g.run('createProfile()');assert.equal(g.run('state.wakeboard'),false);
});

test('watersports dock is on Moonwater Island and requires a wakeboard before towing',()=>{
const g=game();g.run('visitWatersportsDock()');
assert.equal(g.run('canWalk(player.x,player.y)'),true);assert.equal(g.run('inside(player.x,player.y,islandPolys[1])'),true);
assert.equal(g.run('nearby()'),101);g.node('#mapWakeboardStart').onclick();assert.equal(g.run('wakeboardRide'),null);
g.run('state.crystals=25;buyWakeboard()');g.node('#mapWakeboardStart').onclick();
assert.equal(g.run('!!wakeboardRide'),true);assert.equal(g.node('#mapWakeboardStop').hidden,false);assert.match(g.node('#waterControls').textContent,/WAKEBOARD/);
assert.equal(g.run('swimming'),false);assert.equal(g.run('boating'),false);assert.equal(g.run('sponsored()'),false);
g.run('draw()');
});

test('wakeboarding follows the course, constrains the tow rope, and saves safe ground',()=>{
const g=game();g.run('state.wakeboard=true;visitWatersportsDock();startWakeboarding()');assert.equal(g.run('!!wakeboardRide'),true);
const start=g.run('wakeboardRide.boat.x');g.run('advanceSwimming(600);draw()');assert.ok(g.run('wakeboardRide.boat.x')<start);assert.ok(g.run('wakeboardRide.wake.length')>0);
for(let i=0;i<20;i++){
g.run('advanceSwimming(40)');assert.equal(g.run('wakeboardHullClear(wakeboardRide.boat,wakeboardRide.heading)'),true);
assert.ok(g.run('Math.hypot(player.x-wakeboardTowPoint(wakeboardRide.boat,wakeboardRide.heading).x,player.y-wakeboardTowPoint(wakeboardRide.boat,wakeboardRide.heading).y)')<=g.run('WAKEBOARD_ROPE+WAKEBOARD_HANDLE')+1e-6);
}
g.run('save()');const restored=game(null,g.snapshot());assert.equal(restored.run('wakeboardRide'),null);assert.equal(restored.run('state.wakeboard'),true);assert.equal(restored.run('canWalk(player.x,player.y)'),true);
const position=g.run('JSON.stringify({x:player.x,y:player.y})');
g.node('#mapWakeboardStop').onclick();assert.equal(g.run('wakeboardRide'),null);assert.equal(g.run('!!wakeboardBoatTrip'),true);assert.equal(g.run('JSON.stringify({x:player.x,y:player.y})'),position);assert.equal(g.run('swimming'),false);assert.equal(g.run('wakeboardCrash.kind'),'release');
assert.equal(g.node('#mapWakeboardStop').hidden,true);assert.match(g.node('#waterControls').textContent,/Dropping the rope/);
g.run('advanceSwimming(350);draw();moveExplorer(0,2)');assert.equal(g.run('JSON.stringify({x:player.x,y:player.y})'),position);assert.equal(g.run('swimming'),false);
g.node('#challenge').showModal();g.run('advanceSwimming(200)');assert.equal(g.run('wakeboardCrash.elapsed'),350);g.node('#challenge').close();
g.run('advanceSwimming(350);draw()');assert.equal(g.run('wakeboardCrash'),null);assert.equal(g.run('swimming'),true);assert.equal(g.run('JSON.stringify({x:player.x,y:player.y})'),position);assert.match(g.node('#waterControls').textContent,/SWIMMING/);
g.run('moveExplorer(0,2);draw()');assert.notEqual(g.run('JSON.stringify({x:player.x,y:player.y})'),position);
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
assert.equal(g.run(`wakeboardBoatTrip.wake.some(w=>w.serial===${first.serial})`),false);assert.equal(g.run('wakeboardBoatTrip.wake.every(w=>w.age<1800)&&wakeboardBoatTrip.wake.length<=112'),true);
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
const g=game({beachPass:true});
for(const x of [20,320,1100,2100,3180]){assert.equal(g.run(`canWalk(${x},1760)`),true);assert.ok(g.run(`beachShoreY(${x})`)<1720);}
g.run('boating=true');assert.equal(g.run('canWalk(1200,1750)'),false);g.run('boating=false;player.x=500;player.y=1740;draw()');
g.run('const originalUmbrella=beachUmbrella,originalPerson=beachPerson,originalVolley=drawBeachVolleyball,originalEllipse=ellipse;let umbrellas=0,people=0,courts=0,balls=[];beachUmbrella=(...a)=>{umbrellas++;originalUmbrella(...a)};beachPerson=(...a)=>{people++;originalPerson(...a)};drawBeachVolleyball=(...a)=>{courts++;originalVolley(...a)};ellipse=(...a)=>{if(a[4]==="#f9efcf")balls.push(a.slice(0,2));originalEllipse(...a)};frame=0;drawMainlandBeach()');
assert.ok(g.run('umbrellas')>0);assert.ok(g.run('people')>=4);assert.ok(g.run('courts')>0);const ball=g.run('JSON.stringify(balls[0])');g.run('balls=[];frame=25;drawMainlandBeach()');assert.notEqual(g.run('JSON.stringify(balls[0])'),ball);
});
test('beach pass gates swimming ashore while ordinary boat anchors remain included',()=>{
const g=game();g.run('swimming=true');
assert.equal(g.run('canWalk(1200,1750)'),false);
g.run('state.crystals=50;buyBeachPass()');assert.equal(g.run('canWalk(1200,1750)'),true);
const fresh=game();fresh.run('state.ferryTicket=true;boardFerry();player.x=1200;player.y=1200;exitBoat()');
assert.equal(fresh.run('boatAnchorCasting()'),true);assert.equal(fresh.run('state.beachPass'),false);
});
test('legacy profile anchor purchases become beach passes without another charge',()=>{
const g=game(null,{'skyseed-profiles-v1':JSON.stringify({active:'legacy',profiles:[{id:'legacy',name:'Explorer',age:'11-12',anchor:true}]})});
assert.equal(g.run('state.beachPass'),true);g.run('state.crystals=60;buyBeachPass()');assert.equal(g.run('state.crystals'),60);
const restored=game(null,g.snapshot());assert.equal(restored.run('currentProfile().beachPass'),true);assert.equal(restored.run('"anchor" in state'),false);
});
test('five lifeguard stations cover the whole beach at even intervals',()=>{
const g=game();const stations=JSON.parse(g.run('JSON.stringify(BEACH_LIFEGUARDS)'));
assert.equal(stations.length,5);
const spacing=g.run('WORLD.width/5');
for(let i=0;i<stations.length;i++){
assert.equal(stations[i].y,g.run(`beachShoreY(${stations[i].x})+65`));
assert.equal(stations[i].x,g.run(`WORLD.left+WORLD.width*(${i}+.5)/5`));
if(i)assert.equal(stations[i].x-stations[i-1].x,spacing);
}
g.run('player.x=BEACH_LIFEGUARDS[2].x;player.y=1750;draw()');
});
test('unpassed swimmers summon the nearest lifeguard, get a hint, and remain offshore',()=>{
const g=game();g.run('swimming=true;player.x=BEACH_LIFEGUARDS[2].x+50;player.y=beachShoreY(player.x)-10;advanceBeachLifeguards(16);updateBeachControls()');
assert.match(g.node('#toast').textContent,/50 crystals.*Fishing & travel/);
assert.equal(g.node('#mapBeachPass').hidden,false);assert.equal(g.run('beachLifeguards[2].phase'),'descending');
assert.equal(g.run('beachLifeguards.filter(g=>g.phase!=="seated").length'),1);
g.run('advanceBeachLifeguards(LIFEGUARD_LADDER_DURATION)');assert.equal(g.run('beachLifeguards[2].phase'),'running');
g.run('advanceBeachLifeguards(1000);draw()');assert.equal(g.run('beachLifeguards[2].phase'),'waving');
assert.equal(g.run('beachLifeguards[2].y'),g.run('beachShoreY(beachLifeguards[2].x)+12'));
g.run('moveExplorer(0,20)');assert.equal(g.run('swimming'),true);assert.equal(g.run('shoreClimb'),null);assert.equal(g.run('onMainlandBeach()'),false);
g.node('#toast').textContent='unchanged';g.run('advanceBeachLifeguards(16)');assert.equal(g.node('#toast').textContent,'unchanged');
g.node('#mapBeachPass').onclick();assert.equal(g.run('activeSubmenu'),'water');
g.run('state.crystals=50;buyBeachPass();advanceBeachLifeguards(16);updateBeachControls()');
assert.equal(g.node('#mapBeachPass').hidden,true);assert.equal(g.run('beachLifeguards[2].phase'),'returning');
g.run('advanceBeachLifeguards(1000);advanceBeachLifeguards(LIFEGUARD_LADDER_DURATION)');assert.equal(g.run('beachLifeguards[2].phase'),'seated');
});
test('lifeguards face all four travel directions and animate their actual stride',()=>{
const g=game({beachPass:true});
for(const [dx,dy,facing] of [[60,0,'left'],[-60,0,'right'],[0,30,'up'],[0,-30,'down']]){
g.run(`resetBeachLifeguards();const foot${facing}=lifeguardLadderPose(BEACH_LIFEGUARDS[2],1);Object.assign(beachLifeguards[2],{x:foot${facing}.x+${dx},y:foot${facing}.y+${dy},phase:'returning'});advanceBeachLifeguards(16)`);
assert.equal(g.run('beachLifeguards[2].facing'),facing);assert.ok(g.run('beachLifeguards[2].gait')>0);
}
// Each direction has its own visible sprite geometry, including a back without sunglasses.
const poses=g.run(`(()=>{const originalRect=ctx.fillRect,poses=[];for(const face of ['up','down','left','right']){const calls=[];ctx.fillRect=(...a)=>calls.push(a);drawLifeguardSprite(0,0,'skin',face,8);poses.push(JSON.stringify(calls));}ctx.fillRect=originalRect;return poses;})()`);
assert.equal(new Set(poses).size,4);
});
test('lifeguards descend along their ladders and return to the foot before climbing up',()=>{
const g=game();g.run('swimming=true;player.x=BEACH_LIFEGUARDS[2].x+50;player.y=beachShoreY(player.x)-10;advanceBeachLifeguards(16)');
g.run('advanceBeachLifeguards(LIFEGUARD_LADDER_DURATION/2);draw()');assert.equal(g.run('beachLifeguards[2].phase'),'descending');
const poses=JSON.parse(g.run('JSON.stringify([0,.5,1].map(t=>lifeguardLadderPose(BEACH_LIFEGUARDS[2],t)))'));
assert.ok(poses[0].x<poses[1].x&&poses[1].x<poses[2].x);assert.ok(poses[0].y<poses[1].y&&poses[1].y<poses[2].y);
g.run('advanceBeachLifeguards(LIFEGUARD_LADDER_DURATION/2)');assert.equal(g.run('beachLifeguards[2].phase'),'running');assert.equal(g.run('beachLifeguards[2].x'),poses[2].x);assert.equal(g.run('beachLifeguards[2].y'),poses[2].y);
g.run('advanceBeachLifeguards(1000);state.beachPass=true;advanceBeachLifeguards(1000)');assert.equal(g.run('beachLifeguards[2].phase'),'ascending');assert.equal(g.run('beachLifeguards[2].x'),poses[2].x);
g.run('advanceBeachLifeguards(LIFEGUARD_LADDER_DURATION/2);draw()');assert.equal(g.run('beachLifeguards[2].phase'),'ascending');
g.run('advanceBeachLifeguards(LIFEGUARD_LADDER_DURATION/2)');assert.equal(g.run('beachLifeguards[2].phase'),'seated');assert.equal(g.run('beachLifeguards[2].x'),g.run('BEACH_LIFEGUARDS[2].x'));
});
test('real maximum-trim rooster tails can splash seated lifeguards from every boat',()=>{
for(const vessel of ['fishing','speedboat','ferry']){
const g=game({beachPass:true});g.run(`boating=true;activeVessel='${vessel}';player.x=BEACH_LIFEGUARDS[2].x;player.y=beachShoreY(player.x)-50;resetBoatMotion();Object.assign(boatMotion,{heading:-Math.PI/2,trimStep:5,engineStage:'running',throttle:1,velocity:0,power:1});for(let i=0;i<100;i++)advanceBoatSpray(20);`);
assert.equal(g.run('!!beachLifeguards[2].sprayReaction'),true,`${vessel} should splash the seated guard with emitted droplets`);
}
});
test('boat spray summons a seated lifeguard even with a beach pass and does not restart the reaction',()=>{
const g=game({beachPass:true});g.run(`boating=true;activeVessel='speedboat';player.x=BEACH_LIFEGUARDS[2].x+50;player.y=beachShoreY(player.x)-50;
boatMotion.spray=[{x:BEACH_LIFEGUARDS[2].x,y:BEACH_LIFEGUARDS[2].y,vx:0,vy:0,vz:80,gravity:0,age:0,life:1}];advanceBoatSpray(500);`);
assert.equal(g.run('!!beachLifeguards[2].sprayReaction'),true);assert.equal(g.run('beachLifeguards.filter(g=>g.sprayReaction).length'),1);
g.run('advanceBeachLifeguards(16)');assert.equal(g.run('beachLifeguards[2].phase'),'descending');
g.run('advanceBeachLifeguards(LIFEGUARD_LADDER_DURATION);advanceBeachLifeguards(1000);draw()');assert.equal(g.run('beachLifeguards[2].phase'),'waving');assert.equal(g.run('beachLifeguards[2].warning'),'spray');
const before=g.run('JSON.stringify(beachLifeguards[2])');g.run('sprayBeachLifeguards([{x:beachLifeguards[2].x,y:beachLifeguards[2].y,vx:0,vy:0,vz:20,gravity:0,age:.5,life:1}])');assert.equal(g.run('JSON.stringify(beachLifeguards[2])'),before);
g.run('advanceBeachLifeguards(12000)');assert.equal(g.run('beachLifeguards[2].sprayReaction'),undefined);assert.equal(g.run('beachLifeguards[2].phase'),'ascending');
g.run('advanceBeachLifeguards(LIFEGUARD_LADDER_DURATION)');assert.equal(g.run('beachLifeguards[2].phase'),'seated');
});
test('lifeguard spray checks reject missed heights and positions and clear on departure or profile changes',()=>{
const g=game({beachPass:true});g.run(`boating=true;activeVessel='speedboat';player.x=BEACH_LIFEGUARDS[2].x;player.y=beachShoreY(player.x)-50;
const lifeguardDrop=(dx=0,vz=80,start=0)=>({x:BEACH_LIFEGUARDS[2].x+dx,y:BEACH_LIFEGUARDS[2].y,vx:0,vy:0,vz,gravity:0,age:.5,life:1,lifeguardCheckedAge:start});
sprayBeachLifeguards([lifeguardDrop(40),lifeguardDrop(0,10),lifeguardDrop(0,200,.4)]);`);
assert.equal(g.run('beachLifeguards.some(g=>g.sprayReaction)'),false);
g.node('#challenge').showModal();g.run('sprayBeachLifeguards([lifeguardDrop()])');assert.equal(g.run('beachLifeguards.some(g=>g.sprayReaction)'),false);g.node('#challenge').close();
g.run('sprayBeachLifeguards([lifeguardDrop()]);advanceBeachLifeguards(16)');const before=g.run('JSON.stringify(beachLifeguards)');
g.node('#challenge').showModal();g.run('advanceBeachLifeguards(1000)');assert.equal(g.run('JSON.stringify(beachLifeguards)'),before);g.node('#challenge').close();
g.run('player.y-=400;advanceBeachLifeguards(16)');assert.equal(g.run('beachLifeguards.some(g=>g.sprayReaction)'),false);
g.run('player.y+=400;sprayBeachLifeguards([lifeguardDrop()]);switchAge("9-10")');assert.equal(g.run('beachLifeguards.some(g=>g.sprayReaction)'),false);
});
test('lifeguard reminders rearm after leaving, respect passes and boats, pause, and reset',()=>{
const g=game();g.run('boating=true;player.x=BEACH_LIFEGUARDS[0].x;player.y=beachShoreY(player.x)-60;advanceBeachLifeguards(16)');
assert.equal(g.run('beachPassHintShown'),true);assert.equal(g.run('beachLifeguards.every(g=>g.phase==="seated")'),true);
g.run('player.y-=300;advanceBeachLifeguards(16)');assert.equal(g.run('beachPassHintShown'),false);
g.run('boating=false;swimming=true;player.y=beachShoreY(player.x)-10;advanceBeachLifeguards(16)');
const before=g.run('JSON.stringify(beachLifeguards)');g.node('#challenge').showModal();g.run('advanceBeachLifeguards(1000)');assert.equal(g.run('JSON.stringify(beachLifeguards)'),before);g.node('#challenge').close();
g.run('switchAge("9-10")');assert.equal(g.run('beachPassHintShown'),false);assert.equal(g.run('beachLifeguards.every(g=>g.phase==="seated")'),true);
g.run('state.beachPass=true;swimming=true;player.x=BEACH_LIFEGUARDS[1].x;player.y=beachShoreY(player.x)-10;advanceBeachLifeguards(1000)');assert.equal(g.run('beachPassHintShown'),false);assert.equal(g.run('beachLifeguards.every(g=>g.phase==="seated")'),true);
});
test('beach pass costs 50 crystals once and remains owned across ages, resets, and reloads',()=>{
const g=game();g.run('state.crystals=49;buyBeachPass()');assert.equal(g.run('state.beachPass'),false);assert.equal(g.run('state.crystals'),49);
g.run('state.crystals=75;state.earnedCrystals=75;buyBeachPass();buyBeachPass()');assert.equal(g.run('state.beachPass'),true);assert.equal(g.run('state.crystals'),25);assert.equal(g.run('state.earnedCrystals'),75);
g.run('switchAge("9-10")');assert.equal(g.run('state.beachPass'),true);g.node('#resetBtn').onclick();g.node('#confirmReset').onclick();assert.equal(g.run('state.beachPass'),true);
const restored=game(null,g.snapshot());assert.equal(restored.run('state.beachPass'),true);
g.node('#profileName').value='Beach Guest';g.run('createProfile()');assert.equal(g.run('state.beachPass'),false);
});
test('ferry and fishing boat can anchor near the beach, enter it, and return to the same vessel',()=>{
for(const vessel of ['fishing','ferry']){
const g=game();g.run(`state.crystals=50;buyBeachPass();state.catches={barracuda:5};state.ferryTicket=true;${vessel==='ferry'?'boardFerry()':'launchBoat()'};player.x=1200;player.y=beachShoreY(1200)-70;boatMotion.heading=.8;updateWaterControls()`);
assert.equal(g.node('#mapAnchor').hidden,false);const parked=g.run('JSON.stringify([player.x,player.y])');g.run('anchorBoatAtBeach();if(boatAnchorCasting())advanceSwimming(FISH_CAST_DURATION)');assert.equal(g.run('boating'),false);assert.equal(g.run('!!beachTransfer'),true);assert.equal(g.run('state.beachAnchor.vessel'),vessel);
g.run('advanceSwimming(450);draw()');const midway=g.run('JSON.stringify([player.x,player.y])');g.run('moveExplorer(50,0)');assert.equal(g.run('JSON.stringify([player.x,player.y])'),midway);
g.run('advanceSwimming(450);draw()');assert.equal(g.run('beachTransfer'),null);assert.equal(g.run('onMainlandBeach()'),true);assert.equal(g.run('canWalk(player.x,player.y)'),true);assert.equal(g.run('canReturnToAnchoredBoat()'),true);assert.equal(g.node('#mapBeachBoat').hidden,false);assert.equal(g.run('JSON.stringify([boatPosition.x,boatPosition.y])'),parked);
g.run('returnToAnchoredBoat();advanceSwimming(900);draw()');assert.equal(g.run('boating'),true);assert.equal(g.run('activeVessel'),vessel);assert.equal(g.run('state.beachAnchor'),null);assert.equal(g.run('boatMotion.heading'),.8);assert.equal(g.run('JSON.stringify([player.x,player.y])'),parked);
}
});
test('beach anchoring needs a beach pass and a nearby coastline, and survives reload mid-transfer',()=>{
const g=game();g.run('state.ferryTicket=true;boardFerry();player.x=1200;player.y=beachShoreY(1200)-60;anchorBoatAtBeach();if(boatAnchorCasting())advanceSwimming(FISH_CAST_DURATION)');assert.equal(g.run('boating'),true);assert.equal(g.run('beachTransfer'),null);assert.equal(g.run('activeSubmenu'),'water');
g.run('state.crystals=50;buyBeachPass();player.y=1000;anchorBoatAtBeach();if(boatAnchorCasting())advanceSwimming(FISH_CAST_DURATION)');assert.equal(g.run('beachTransfer'),null);
g.run('player.y=beachShoreY(1200)-60;anchorBoatAtBeach();if(boatAnchorCasting())advanceSwimming(FISH_CAST_DURATION);advanceSwimming(200);save()');
const restored=game(null,g.snapshot());assert.equal(restored.run('onMainlandBeach()'),true);assert.equal(restored.run('activeVessel'),'ferry');assert.equal(restored.run('canReturnToAnchoredBoat()'),true);assert.equal(restored.run('state.beachPass'),true);
restored.run('returnToAnchoredBoat();advanceSwimming(900)');assert.equal(restored.run('boating'),true);
});

test('an anchor from any older age save becomes a permanent profile beach pass and cannot be charged twice',()=>{
const g=game(null,{'skyseed-v1-5-6':JSON.stringify({solved:[],upgrades:[],anchor:true})});
assert.equal(g.run('state.beachPass'),true);assert.equal(g.run('currentProfile().beachPass'),true);
for(const age of ['5-6','7-8','9-10','11-12']){
g.run(`switchAge('${age}');state.crystals=60;buyBeachPass()`);assert.equal(g.run('state.beachPass'),true);assert.equal(g.run('state.crystals'),60);
}
g.run('state.beachPass=false;save()');assert.equal(g.run('state.beachPass'),true);
g.node('#resetBtn').onclick();g.node('#confirmReset').onclick();assert.equal(g.run('state.beachPass'),true);
const restored=game(null,g.snapshot());assert.equal(restored.run('state.beachPass'),true);assert.match(restored.node('#buyBeachPass').textContent,/Beach pass owned/);
g.node('#profileName').value='New sailor';g.run('createProfile()');assert.equal(g.run('state.beachPass'),false);g.run("switchProfile('legacy')");assert.equal(g.run('state.beachPass'),true);
});

test('all three beach courts let the selected character join a bounded doubles match',()=>{
const g=game({beachPass:true});g.run('startVolleyball(0)');assert.equal(g.run('volleyball'),null);
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
const g=game();g.run('state.crystals=50;buyBeachPass();state.ferryTicket=true;boardFerry();player.x=500;player.y=beachShoreY(500)-60;anchorBoatAtBeach();if(boatAnchorCasting())advanceSwimming(FISH_CAST_DURATION);advanceSwimming(900);startVolleyball(0);draw()');
assert.equal(g.run('!!volleyball'),true);assert.equal(g.run('canReturnToAnchoredBoat()'),false);
const x=g.run('player.x');g.run('returnToAnchoredBoat();visit(0);openFishing();openFerry()');assert.equal(g.run('player.x'),x);
g.run('save()');const restored=game(null,g.snapshot());assert.equal(restored.run('volleyball'),null);assert.equal(restored.run('canReturnToAnchoredBoat()'),true);
g.run('leaveVolleyball()');assert.equal(g.run('canReturnToAnchoredBoat()'),true);
g.run('startVolleyball(0)');g.node('#profileName').value='Beach teammate';g.run('createProfile()');assert.equal(g.run('volleyball'),null);assert.equal(g.node('#volleyballHud').hidden,true);
});

function surfGame(){const g=game({beachPass:true});g.run('player.x=SURF_SHACK.x;player.y=SURF_SHACK.y+15;state.crystals=20;rentSurfboard();startSurfing();function setSurfTestRide(){Object.assign(surfSession,{phase:"riding",x:.43,y:.48,speed:.4,angle:Math.PI-.12})}');return g;}
function surfTakeoffGame(){const g=surfGame();g.run('surfClock=1000;surfSession.paddleTime=500;surfSession.paddleHeading=Math.PI/2;player.x=beachWaveProfile(player.x,1,surfClock,true).front;player.y=beachWaveSurfaceY(player.x,1,surfClock);catchSurfWave()');assert.equal(g.run('surfSession.phase'),'takeoff');return g;}
test('surf beach paddle-out retains momentum and requires a nearby curling lip before takeoff',()=>{
const g=surfGame();assert.equal(g.run('catchSurfWave()'),false);assert.match(g.node('#surfAction').textContent,/Catch wave/);
const start=g.run('player.y');g.run('keys.add("up");advanceSurfing(1000);draw()');assert.ok(g.run('player.y')<start-65);assert.ok(g.run('surfSession.vy')<0);
assert.equal(g.run('surfSession.phase'),'paddling');assert.equal(g.run('surfSession.remaining'),89000);
g.run('player.x=beachWaveProfile(player.x,1,surfClock,true).front;player.y=beachWaveSurfaceY(player.x,1,surfClock);handleSurfKey(" ",{repeat:false,preventDefault(){}})');
assert.equal(g.run('surfSession.phase'),'paddling');assert.match(g.run('surfSession.message'),/toward the beach/);
g.run('keys.clear();keys.add("down");advanceSurfing(220);player.x=beachWaveProfile(player.x,1,surfClock,true).front;player.y=beachWaveSurfaceY(player.x,1,surfClock);handleSurfKey(" ",{repeat:false,preventDefault(){}})');
assert.equal(g.run('surfSession.phase'),'takeoff');assert.equal(g.run('surfSession.paddleStrokes'),0);assert.equal(g.run('keys.size'),0);assert.match(g.node('#surfAction').textContent,/Paddle/);
g.run('handleSurfKey(" ",{repeat:true,preventDefault(){}})');assert.equal(g.run('surfSession.paddleStrokes'),0);
g.run('handleSurfKey(" ",{repeat:false,preventDefault(){}})');assert.equal(g.run('surfSession.paddleStrokes'),1);
});
test('surf beach catch follows moving curling lips, proximity, and shore-break limits',()=>{
for(const [time,index,section,dx,dy,expected] of [[1000,1,0,0,0,true],[1000,1,-1,20,10,true],[4000,0,0,0,0,true],[7000,2,0,0,0,true],[1000,1,0,30,0,false],[1000,1,0,25,25,false],[1000,1,0,90,0,false]]){
const g=surfGame();g.run(`surfClock=${time};surfSession.paddleTime=500;surfSession.paddleHeading=Math.PI/2;const lip=beachWaveProfile(player.x,${index},surfClock,true).front+${section}*600;player.x=lip+${dx};player.y=beachWaveSurfaceY(lip,${index},surfClock)+${dy}`);
assert.equal(g.run('catchSurfWave()'),expected);assert.equal(g.run('surfSession.phase'),expected?'takeoff':'paddling');
}
for(const [distance,paddleTime] of [[12,1000],[300,1000],[170,0]]){const g=surfGame();g.run(`player.y=beachShoreY(player.x)-${distance};surfSession.paddleTime=${paddleTime}`);assert.equal(g.run('catchSurfWave()'),false);}
});
test('surf beach catches require the board to face shoreward for keyboard and touch',()=>{
for(const [heading,expected] of [[Math.PI/2,true],[Math.PI/4,true],[Math.PI*3/4,true],[Math.PI*2.5,true],[0,false],[Math.PI,false],[-Math.PI/2,false],[Math.PI/4-.01,false],[Math.PI*3/4+.01,false]]){
const g=surfGame();g.run(`surfClock=1000;surfSession.paddleTime=500;surfSession.paddleHeading=${heading};player.x=beachWaveProfile(player.x,1,surfClock,true).front;player.y=beachWaveSurfaceY(player.x,1,surfClock)`);
assert.equal(g.run('catchSurfWave()'),expected,String(heading));if(!expected)assert.match(g.run('surfSession.message'),/toward the beach/);
}
const touch=surfGame();touch.run(`surfClock=1000;surfSession.paddleTime=500;surfSession.paddleHeading=0;player.x=beachWaveProfile(player.x,1,surfClock,true).front;player.y=beachWaveSurfaceY(player.x,1,surfClock)`);
touch.node('#surfAction').onpointerdown({preventDefault(){},pointerId:1});assert.equal(touch.run('surfSession.phase'),'paddling');
touch.run('surfSession.paddleHeading=Math.PI/2');touch.node('#surfAction').onpointerdown({preventDefault(){},pointerId:2});assert.equal(touch.run('surfSession.phase'),'takeoff');
});

test('surf beach catches preserve selected wave size through takeoff, pop-up, and riding',()=>{
for(const distance of [65,110,170,230,280]){
const g=surfGame();g.run(`surfClock=(335-${distance})/.026;player.x=beachWaveProfile(player.x,0,surfClock,true).front;player.y=beachShoreY(player.x)-${distance};surfSession.paddleTime=500;surfSession.paddleHeading=Math.PI/2`);
assert.equal(g.run('catchSurfWave()'),true);const size=g.run('surfSession.waveSize');assert.equal(size,g.run(`surfWaveSize(${distance})`));
g.run('for(let i=0;i<24&&surfSession.phase==="takeoff";i++){paddleSurfStroke();advanceSurfing(280)};advanceSurfing(1200);draw()');assert.equal(g.run('surfSession.phase'),'riding');assert.equal(g.run('surfSession.waveSize'),size);
}
});
test('surf shack rents one board for exactly 20 crystals and requires returning it before charging again',()=>{
const g=game();g.run('state.crystals=25;rentSurfboard()');assert.equal(g.run('state.surfRental'),false);
g.run('player.x=SURF_SHACK.x;player.y=SURF_SHACK.y;state.crystals=19;rentSurfboard()');assert.equal(g.run('state.surfRental'),false);
g.run('state.crystals=25;rentSurfboard();rentSurfboard()');assert.equal(g.run('state.surfRental'),true);assert.equal(g.run('state.crystals'),5);assert.equal(g.run('nearby()'),103);
g.run('tick(16)');assert.match(g.node('#interaction').innerHTML,/Go surfing/);
g.run('returnSurfboard()');assert.equal(g.run('state.surfRental'),false);assert.equal(g.run('state.crystals'),5);
});
test('surf shack command starts surfing directly and reuses the rental without a panel',()=>{
const g=game();g.run('player.x=SURF_SHACK.x;player.y=SURF_SHACK.y;state.crystals=25;updateSurfUI()');
assert.equal(g.node('#mapSurfShack .suggestion-label').textContent,'Go surfing · 20 ◆');
g.run('near=nearby();interact()');
assert.equal(g.run('surfSession.phase'),'paddling');assert.equal(g.run('activeMapPanel'),null);assert.equal(g.run('state.crystals'),5);
g.run('stopSurfing();updateSurfUI()');assert.equal(g.node('#mapSurfShack .suggestion-label').textContent,'Go surfing');assert.equal(g.node('#returnSurfboard').hidden,false);
g.node('#mapSurfShack').onclick();assert.equal(g.run('surfSession.phase'),'paddling');assert.equal(g.run('state.crystals'),5);
g.run('stopSurfing()');g.node('#returnSurfboard').onclick();assert.equal(g.run('state.surfRental'),false);
});
test('surf shack command stays ashore without enough crystals or energy',()=>{
const g=game();g.run('player.x=SURF_SHACK.x;player.y=SURF_SHACK.y;state.crystals=19;openSurfShack()');
assert.equal(g.run('surfSession'),null);assert.equal(g.run('state.crystals'),19);assert.equal(g.run('activeMapPanel'),null);
g.run('state.crystals=20;state.power=0;openSurfShack()');assert.equal(g.run('surfSession'),null);assert.equal(g.run('state.surfRental'),false);assert.equal(g.run('state.crystals'),20);
});
test('surf takeoff starts at the lip facing the camera and repeated strokes trigger a pop-up and drop',()=>{
const g=surfTakeoffGame();assert.equal(g.run('surfSession.phase'),'takeoff');
assert.ok(g.run('surfSession.y')<.05);assert.equal(g.run('surfSession.angle'),Math.PI/2);
assert.ok(g.run('surfLipCrown(surfRideView())-surfRideView().riderX')>100);
g.run('for(let i=0;i<24&&surfSession.phase==="takeoff";i++){paddleSurfStroke();advanceSurfing(280)}');
assert.equal(g.run('surfSession.phase'),'popup');assert.ok(g.run('surfSession.paddleStrokes')>=6);
const y=g.run('surfSession.y');g.run('advanceSurfing(1200);draw()');
assert.equal(g.run('surfSession.phase'),'riding');assert.ok(g.run('surfSession.y')>y+.3);assert.ok(g.run('surfSession.speed')>.6);
assert.equal(g.run('nearby()'),-1);
});
test('surf delayed catches drift deeper toward the curl and preserve that position through the drop',()=>{
const early=surfTakeoffGame(),late=surfTakeoffGame();
const startGap=late.run('surfRideView().breakX-surfRideView().riderX');
late.run('advanceSurfing(3000)');assert.equal(late.run('surfSession.phase'),'takeoff');assert.ok(late.run('surfRideView().breakX-surfRideView().riderX')<startGap);
late.run('surfSession.paused=true');const x=late.run('surfSession.x');late.run('advanceSurfing(500)');assert.equal(late.run('surfSession.x'),x);late.run('surfSession.paused=false');
for(const g of [early,late]){
g.run(`for(let i=0;i<24&&surfSession.phase==='takeoff';i++){paddleSurfStroke();advanceSurfing(280)}`);assert.equal(g.run('surfSession.phase'),'popup');
const caughtX=g.run('surfSession.popStartX');assert.ok(Math.abs(g.run('surfSession.x')-caughtX)<.01,'no position reset on catch');
g.run('advanceSurfing(1150-surfSession.popTime)');assert.equal(g.run('surfSession.phase'),'riding');
assert.ok(Math.abs(g.run('surfSession.x')-(caughtX-.08))<1e-6);
}
assert.ok(late.run('surfSession.x')>early.run('surfSession.x')+.08);
assert.ok(late.run('surfRideView().breakX-surfRideView().riderX')<early.run('surfRideView().breakX-surfRideView().riderX'));
});

test('surf paddles flat across the crest and pitches down only after catching the wave',()=>{
const g=surfTakeoffGame();
g.run(`let maxPaddleY=surfSession.y;for(let i=0;i<24&&surfSession.phase==='takeoff';i++){paddleSurfStroke();advanceSurfing(280);if(surfSession.phase==='takeoff'){maxPaddleY=Math.max(maxPaddleY,surfSession.y);if(surfTakeoffPose().pitch!==0)throw new Error('Pitched before catch');}}`);
assert.ok(g.run('maxPaddleY<.03'));
assert.equal(g.run('surfSession.phase'),'popup');
g.run(`const earlyPitch=surfTakeoffPose().pitch,earlyY=surfSession.y;advanceSurfing(240)`);
assert.ok(g.run('surfTakeoffPose().pitch>earlyPitch'));
assert.ok(g.run('surfSession.y>earlyY'));
g.run('advanceSurfing(900)');assert.equal(g.run('surfSession.phase'),'riding');
});
test('surf larger waves need more paddle strokes and time to drop in at the same cadence',()=>{
let previousStrokes=0,previousTime=0;
for(const size of [.32,.48,.7,1]){
const g=surfTakeoffGame();g.run(`prepareSurfTakeoff(${size});for(let i=0;i<30&&surfSession.phase==='takeoff';i++){paddleSurfStroke();advanceSurfing(280)}`);
assert.equal(g.run('surfSession.phase'),'popup',String(size));
const strokes=g.run('surfSession.paddleStrokes'),time=g.run('surfSession.paddleTime');
assert.ok(strokes>previousStrokes,`wave ${size} requires more strokes`);assert.ok(time>previousTime,`wave ${size} requires more time`);
assert.ok(time<9500);previousStrokes=strokes;previousTime=time;
}
const large=surfTakeoffGame();large.run(`prepareSurfTakeoff(1);advanceSurfing(3000);for(let i=0;i<30&&surfSession.phase==='takeoff';i++){paddleSurfStroke();advanceSurfing(280)}`);
assert.equal(large.run('surfSession.phase'),'popup','large wave is catchable after the learning grace');
});

test('surf takeoff allows two extra seconds before the first paddle stroke',()=>{
const g=surfTakeoffGame();g.run('advanceSurfing(3500);draw()');assert.equal(g.run('surfSession.phase'),'takeoff');
g.run('advanceSurfing(60)');assert.equal(g.run('surfSession.phase'),'wipeout');
const ready=surfTakeoffGame();ready.run('advanceSurfing(3000);paddleSurfStroke();advanceSurfing(1500)');assert.equal(ready.run('surfSession.phase'),'takeoff');
ready.run('advanceSurfing(60)');assert.equal(ready.run('surfSession.phase'),'wipeout');
});
test('surf paddling uses the shared boat and wakeboard wake, scaled to board and wave size',()=>{
for(const size of [.5,1]){
const g=surfTakeoffGame();g.run(`surfSession.waveSize=${size};let surfWakeCalls=[];const sharedSurfRecord=recordHullWake;recordHullWake=(...args)=>{surfWakeCalls.push(args);sharedSurfRecord(...args)};for(let i=0;i<7;i++){paddleSurfStroke();advanceSurfing(280)}`);
assert.ok(g.run('surfSession.hullWake.bowWake.length')>0);assert.ok(g.run('surfSession.hullWake.wake.length')>0);
assert.equal(g.run(`surfWakeCalls.every(args=>args[0]===surfSession.hullWake&&args[4]==='tow'&&args[7]===.55*${size})`),true);
assert.equal(g.run('surfSession.hullWake.bowWake.every(mark=>mark.heading===Math.PI/2&&Number.isFinite(mark.y))'),true);
assert.ok(g.run('surfSession.hullWake.bowWake.at(-1).x')<g.run('surfSession.hullWake.bowWake[0].x'));
assert.ok(g.run('surfSession.y<.03')); // Prone hull stays on the crest until the catch.
g.run('surfSession.paused=true');const wake=g.run('JSON.stringify(surfSession.hullWake)');g.run('advanceSurfing(900);draw();draw()');assert.equal(g.run('JSON.stringify(surfSession.hullWake)'),wake);
g.run('surfSession.paused=false');g.node('#challenge').showModal();g.run('advanceSurfing(900)');assert.equal(g.run('JSON.stringify(surfSession.hullWake)'),wake);g.node('#challenge').close();
g.run('for(let i=0;i<24&&surfSession.phase==="takeoff";i++){paddleSurfStroke();advanceSurfing(280)};advanceSurfing(600)');assert.equal(g.run('surfSession.phase'),'popup');assert.ok(g.run('surfSession.hullWake.bowWake.some(mark=>mark.heading>Math.PI/2)'));
g.run('advanceSurfing(900);let surfWakeDraws=0;const sharedSurfDraw=drawBoatWake;drawBoatWake=motion=>{if(motion===surfSession.hullWake)surfWakeDraws++;sharedSurfDraw(motion)};drawSurfBoardWake()');assert.ok(g.run('surfWakeDraws')>0);
const count=g.run('surfSession.hullWake.bowWake.length');assert.ok(count>0);
g.run('surfSession.phase="airborne";surfSession.airHeight=20;surfSession.airV=0;surfSession.airSpin=0;surfSession.x=.43;surfSession.y=.012;advanceSurfing(3700)');assert.equal(g.run('surfSession.hullWake.bowWake.length+surfSession.hullWake.wake.length'),0);
g.run('prepareSurfTakeoff()');assert.equal(g.run('surfSession.hullWake.bowWake.length+surfSession.hullWake.wake.length'),0);
}
});
test('surf takeoff loses the wave without strokes, with a held Space, or with sparse taps',()=>{
for(const mode of ['idle','held','sparse']){
const g=surfTakeoffGame();
g.run(`handleSurfKey(' ',{repeat:false,preventDefault(){}});keys.add(' ');for(let i=0;i<7;i++){if('${mode}'==='held')handleSurfKey(' ',{repeat:true,preventDefault(){}});if('${mode}'==='sparse')paddleSurfStroke();advanceSurfing('${mode}'==='sparse'?1400:240);if(surfSession.phase!=='takeoff')break;}`);
assert.equal(g.run('surfSession.phase'),'wipeout',mode);assert.equal(g.run('surfSession.wipeouts'),1);
g.run('advanceSurfing(SURF_WIPEOUT_TIME)');assert.equal(g.run('surfSession.phase'),'paddling');assert.ok(g.run('player.y')<g.run('beachShoreY(player.x)')-90);
}
});
test('surf paddle and pop-up animation freeze for pause and dialogs and accept touch strokes',()=>{
const g=surfTakeoffGame();g.node('#surfAction').onpointerdown({preventDefault(){},pointerId:1});
assert.equal(g.run('surfSession.paddleStrokes'),1);assert.equal(g.run('paddleSurfStroke()'),false);
g.run('advanceSurfing(300);surfSession.paused=true');
const pose=g.run('JSON.stringify([surfSession,surfClock])');g.run('advanceSurfing(1000);draw();draw()');assert.equal(g.run('JSON.stringify([surfSession,surfClock])'),pose);
g.run('surfSession.paused=false');g.node('#challenge').showModal();const count=g.run('surfSession.paddleStrokes');assert.equal(g.run('paddleSurfStroke()'),false);assert.equal(g.run('surfSession.paddleStrokes'),count);g.node('#challenge').close();
g.run('for(let i=0;i<24&&surfSession.phase==="takeoff";i++){paddleSurfStroke();advanceSurfing(280)}');assert.equal(g.run('surfSession.phase'),'popup');
g.run('surfSession.paused=true');const pop=g.run('surfSession.popTime');g.run('advanceSurfing(1000);draw()');assert.equal(g.run('surfSession.popTime'),pop);
});
test('surf wave bonuses scale with size, bank once after pop-up, and accumulate across waves',()=>{
for(const [size,bonus] of [[.48,500],[.7,800],[1,1200]]){
const g=surfGame();
g.run(`prepareSurfTakeoff(${size});for(let i=0;i<30&&surfSession.phase==='takeoff';i++){paddleSurfStroke();advanceSurfing(280)}`);
assert.equal(g.run('surfSession.phase'),'popup');assert.equal(g.run('surfSession.score'),0);
g.run('advanceSurfing(1150-surfSession.popTime)');
assert.equal(g.run('surfSession.phase'),'riding');assert.equal(g.run('surfSession.score'),bonus);
assert.equal(g.node('#surfScore').textContent,bonus.toLocaleString('en-US'));
g.run('surfSession.angle=Math.PI;surfSession.x=.3;advanceSurfing(100)');
assert.ok(g.run('surfSession.score')<bonus+1,'bonus is not repeated while riding');
g.run(`prepareSurfPaddleOut(true);prepareSurfTakeoff(${size});for(let i=0;i<30&&surfSession.phase==='takeoff';i++){paddleSurfStroke();advanceSurfing(280)};advanceSurfing(1150-surfSession.popTime)`);
assert.ok(g.run('surfSession.score')>=bonus*2);assert.ok(g.run('surfSession.score')<bonus*2+1);
}
const failed=surfTakeoffGame();failed.run('advanceSurfing(3600)');
assert.equal(failed.run('surfSession.phase'),'wipeout');assert.equal(failed.run('surfSession.score'),0);
});
test('surf ordinary riding earns only a few points per second without face-band bonuses',()=>{
const g=surfGame();g.run('setSurfTestRide();surfSession.x=.3;surfSession.y=.4;surfSession.angle=Math.PI;surfSession.speed=.65;advanceSurfing(1000)');
assert.equal(g.run('surfSession.phase'),'riding');
assert.ok(g.run('surfSession.score')>2);assert.ok(g.run('surfSession.score')<6);
assert.equal(g.run('surfSession.tricks.length'),0);
});
test('linked up and down carves build speed and deeper tube rides earn higher line points',()=>{
const pumped=surfGame(),coast=surfGame();
for(const g of [pumped,coast])g.run(`setSurfTestRide();surfSession.angle=Math.PI;surfSession.y=.45`);
for(const key of ['down','up','down','up'])pumped.run(`keys.clear();keys.add('${key}');advanceSurfing(750)`);
coast.run('advanceSurfing(3000)');
assert.equal(pumped.run('surfSession.phase'),'riding');
assert.ok(pumped.run('surfSession.speed')>coast.run('surfSession.speed')+.2);
assert.ok(pumped.run('surfSession.score')>coast.run('surfSession.score')+35);
const half=surfGame(),inside=surfGame(),open=surfGame();
for(const [g,x] of [[half,.80],[inside,.835],[open,.35]])g.run(`setSurfTestRide();surfSession.x=${x};surfSession.y=.4;surfSession.speed=.55;surfSession.angle=Math.PI`);
assert.equal(half.run('surfBarrelState().half'),true);assert.ok(inside.run('surfBarrelState().coverage')>.75);
for(const g of [half,inside,open])g.run('advanceSurfing(100)');
assert.ok(inside.run('surfSession.score')>half.run('surfSession.score'));
assert.ok(inside.run('surfSession.score')>open.run('surfSession.score'));
assert.match(half.node('#surfLine').textContent,new RegExp(half.run('surfBarrelState().lineMultiplier')+'×'));
});
test('surf tube points rise from 10x at entry to 50x deep inside, including fully hidden rides',()=>{
for(const size of [.48,.7,1]){
const g=surfGame();g.run(`setSurfTestRide();surfSession.waveSize=${size};surfSession.y=.4;surfSession.angle=Math.PI;surfSession.speed=.55;
function setTubeDistance(target){for(let i=0;i<20;i++)surfSession.x+=(target-surfBarrelState().distance)/440;}`);
for(const [distance,expected] of [[-46.9,10],[-24,20],[0,30],[23,40],[45,50],[54,50]]){
g.run(`setTubeDistance(${distance});updateSurfUI()`);
assert.ok(Math.abs(g.run('surfBarrelState().distance')-distance)<1e-6);
assert.equal(g.run('surfBarrelState().lineMultiplier'),expected);
assert.match(g.node('#surfLine').textContent,new RegExp(expected+'×'));
}
g.run('setTubeDistance(-60)');assert.equal(g.run('surfBarrelState().lineMultiplier'),1);
g.run('setTubeDistance(560)');assert.equal(g.run('surfBarrelState().lineMultiplier'),50);
for(const distance of [23,45]){
g.run(`setTubeDistance(${distance});surfSession.score=0;advanceSurfing(1)`);
assert.equal(g.run('surfSession.phase'),'riding');assert.equal(g.run('surfBarrelState().coverage'),1);
assert.equal(g.run('surfBarrelState().hidden'),true);
const expected=distance===23?40:50;
assert.ok(Math.abs(g.run('surfSession.score')-.0042*expected)<.0001);
assert.match(g.run('surfSession.message'),new RegExp(expected+'× LINE POINTS'));
}
g.run('surfSession.y=.95;setTubeDistance(45)');assert.equal(g.run('surfBarrelState().lineMultiplier'),1);
}
});
test('surf launch heights rise distinctly across the 90 to 100 percent speed band',()=>{
const peaks=[],times=[];
for(const percent of [90,92.5,95,97.5,100]){
const g=surfGame();g.run(`setSurfTestRide();surfSession.x=.3;surfSession.y=.025;surfSession.angle=Math.PI+.6;surfSession.speed=.85*${percent}/100;requestSurfAir();advanceSurfing(16);keys.add('down');var peakAir=0,airDuration=0;while(surfSession.phase==='airborne'&&airDuration<4000){advanceSurfing(16);peakAir=Math.max(peakAir,surfSession.airHeight);airDuration+=16;}`);
assert.equal(g.run('surfSession.phase'),'riding');assert.equal(g.run('surfSession.lastTrick.name'),'Air');
peaks.push(g.run('peakAir'));times.push(g.run('airDuration'));
}
for(let i=1;i<peaks.length;i++){assert.ok(peaks[i]>peaks[i-1]+.12);assert.ok(times[i]>times[i-1]+100);}
assert.ok(peaks[4]>peaks[0]*2);assert.ok(peaks[4]<peaks[0]*2.4);
const g=surfGame();assert.ok(Math.abs(g.run('surfAirLaunchVelocity(.765)')-g.run('surfAirLaunchVelocity(.765-1e-6)'))<.0001,'no jump at 90 percent');
assert.equal(g.run('surfAirLaunchVelocity(.7)'),1.4+.7*.65);assert.equal(g.run('surfAirLaunchVelocity(1)'),g.run('surfAirLaunchVelocity(.85)'));
});
test('surf big-air camera keeps the spinning rider in frame and follows an aerial wipeout',()=>{
const g=surfGame();g.run(`setSurfTestRide();surfSession.phase='airborne';surfSession.x=.8;surfSession.waveSize=1;surfSession.y=.012;surfSession.airHeight=1.6;surfSession.airSpin=Math.PI;var bigAirView=surfRideView();var bigAirCrest=surfRideCrest(bigAirView.riderX);var bigAirY=bigAirCrest+surfSession.y*(279-bigAirCrest)-surfSession.airHeight*85;var airOffset=surfAirCameraOffset();drawSurfGame()`);
assert.ok(g.run('airOffset')>0);assert.ok(Math.abs(g.run('bigAirY+airOffset')-42)<1e-8);
g.run("surfWipeout('Test aerial fall')");assert.ok(Math.abs(g.run('surfAirCameraOffset()')-g.run('airOffset'))<1e-8);
g.run('surfSession.phase="riding"');assert.equal(g.run('surfAirCameraOffset()'),0);
});
test('surf airs require Space, climbing at the crest, and enough speed; spins bank on a clean landing',()=>{
for(const [y,speed,angle,space] of [[.002,.65,Math.PI+.6,false],[.5,.65,Math.PI+.6,true],[.002,.3,Math.PI+.6,true],[.002,.65,Math.PI-.6,true]]){
const g=surfGame();g.run(`setSurfTestRide();surfSession.y=${y};surfSession.angle=${angle};surfSession.speed=${speed};${space?"requestSurfAir();":''}advanceSurfing(32)`);
assert.equal(g.run('surfSession.phase'),'riding');
}
const g=surfGame();g.run(`setSurfTestRide();surfSession.y=.025;surfSession.angle=Math.PI+.6;surfSession.speed=.7;requestSurfAir();advanceSurfing(16)`);
assert.equal(g.run('surfSession.phase'),'airborne');
g.run(`keys.add('right');keys.add('down');advanceSurfing(1000*Math.PI*2/6.5);keys.delete('right');advanceSurfing(600);draw()`);
assert.equal(g.run('surfSession.phase'),'riding');assert.ok(g.run('surfSession.score')>=500);assert.match(g.run('surfSession.message'),/Single Backflip/);
g.run('keys.clear();surfSession.phase="airborne";surfSession.airHeight=.001;surfSession.airV=-1;surfSession.airSpin=Math.PI;surfSession.angle=Math.PI-.5;advanceSurfing(16)');
assert.equal(g.run('surfSession.phase'),'wipeout');assert.equal(g.run('surfSession.wipeouts'),1);
});
test('three surf wipeouts or 90 seconds finish a heat, save a best score, and retain the rental',()=>{
const g=surfGame();g.run('surfSession.score=500');for(let i=0;i<3;i++){
g.run('setSurfTestRide();surfSession.y=1.02;surfSession.speed=.7;surfSession.angle=Math.PI/2;advanceSurfing(100);draw()');assert.equal(g.run('surfSession.phase'),'wipeout');assert.equal(g.run('surfSession.wipeouts'),i+1);g.run('advanceSurfing(SURF_WIPEOUT_TIME)');
}
assert.equal(g.run('surfSession.phase'),'results');assert.equal(g.run('state.surfRental'),true);assert.equal(g.run('state.crystals'),0);assert.equal(g.run('state.surfBest'),g.run('Math.floor(surfSession.score)'));assert.ok(g.run('state.surfBest')>=500);g.run('draw()');
g.run('stopSurfing();startSurfing();setSurfTestRide();surfSession.remaining=10;advanceSurfing(16)');assert.equal(g.run('surfSession.phase'),'results');assert.equal(g.run('surfSession.remaining'),0);
});
test('surf pausing and problem dialogs freeze the heat clock and wave motion',()=>{
const g=surfGame();g.run('setSurfTestRide();surfSession.paused=true');const clock=g.run('JSON.stringify([surfClock,surfSession.remaining,surfSession.x,surfSession.y])');g.run('advanceSurfing(3000)');assert.equal(g.run('JSON.stringify([surfClock,surfSession.remaining,surfSession.x,surfSession.y])'),clock);
g.run('surfSession.paused=false');g.node('#challenge').showModal();g.run('advanceSurfing(3000)');assert.equal(g.run('JSON.stringify([surfClock,surfSession.remaining,surfSession.x,surfSession.y])'),clock);g.node('#challenge').close();g.run('advanceSurfing(100)');assert.ok(g.run('surfSession.remaining')<90000);
});
test('surf rentals reload on safe beach ground and sessions clear on age and player changes',()=>{
const g=surfGame();g.run('keys.add("up");advanceSurfing(1000);save()');const restored=game(null,g.snapshot());assert.equal(restored.run('state.surfRental'),true);assert.equal(restored.run('onMainlandBeach()'),true);assert.equal(restored.run('surfSession'),null);
g.run('switchAge("9-10")');assert.equal(g.run('surfSession'),null);assert.equal(g.run('state.surfRental'),false);g.run('switchAge("11-12")');assert.equal(g.run('state.surfRental'),true);
g.run('player.x=SURF_SHACK.x;player.y=SURF_SHACK.y;startSurfing()');g.node('#profileName').value='New Surfer';g.run('createProfile()');assert.equal(g.run('surfSession'),null);assert.equal(g.run('state.surfRental'),false);
});
test('surfing leaves an anchored ferry and the return-to-boat route intact',()=>{
const g=game();g.run('state.ferryTicket=true;state.crystals=70;buyBeachPass();boardFerry();player.x=SURF_SHACK.x;player.y=beachShoreY(player.x)-50;anchorBoatAtBeach();if(boatAnchorCasting())advanceSwimming(FISH_CAST_DURATION);advanceSwimming(900);rentSurfboard();startSurfing();keys.add("up");advanceSurfing(1000);stopSurfing()');assert.equal(g.run('onMainlandBeach()'),true);assert.equal(g.run('canReturnToAnchoredBoat()'),true);assert.equal(g.run('state.surfRental'),true);g.run('returnToAnchoredBoat();advanceSwimming(900)');assert.equal(g.run('boating'),true);assert.equal(g.run('activeVessel'),'ferry');
});

test('admin unlock separates authentication from custom crystal grants',()=>{
const g=game();g.run('state.crystals=30;state.earnedCrystals=50;save()');
g.node('#adminCrystalAmount').value='25';g.run('addAdminCrystals()');assert.equal(g.run('state.crystals'),30);
for(const password of ['', '11111', '1234', '12345', '12346 ']){
g.node('#adminPassword').value=password;g.run('applyAdminOverride()');assert.equal(g.run('adminMode'),false);assert.equal(g.run('state.crystals'),30);assert.match(g.node('#adminFeedback').textContent,/Incorrect password/);
}
let prevented=false;g.node('#adminPassword').value='12346';g.node('#adminOverrideForm').onsubmit({preventDefault(){prevented=true;}});
assert.equal(prevented,true);assert.equal(g.run('state.crystals'),30);assert.equal(g.node('#adminPassword').value,'');assert.equal(g.node('#adminCrystalsForm').hidden,false);assert.equal(g.node('#adminOverrideForm').hidden,true);
for(const amount of ['', '0', '-1', '1.5', 'nope', 'Infinity', '9007199254740992']){
g.node('#adminCrystalAmount').value=amount;g.run('addAdminCrystals()');assert.equal(g.run('state.crystals'),30,amount);
}
g.node('#adminCrystalAmount').value='275';g.node('#adminCrystalsForm').onsubmit({preventDefault(){}});
assert.equal(g.run('state.crystals'),305);assert.equal(g.run('state.earnedCrystals'),50);assert.equal(g.run('state.solved.length'),0);assert.match(g.node('#adminFeedback').textContent,/Added 275 crystals/);
g.node('#adminCrystalAmount').value='9007199254740991';g.run('addAdminCrystals()');assert.equal(g.run('state.crystals'),305);
g.node('#adminCrystalAmount').value='5';g.run('addAdminCrystals()');assert.equal(g.run('state.crystals'),310);
assert.equal(game(null,g.snapshot()).run('state.crystals'),310);
g.run('exitAdminMode()');assert.equal(g.node('#adminCrystalsForm').hidden,true);assert.equal(g.node('#adminCrystalAmount').value,'');assert.equal(g.node('#adminCrystalAmount').disabled,true);
g.node('#adminCrystalAmount').value='10';g.run('addAdminCrystals()');assert.equal(g.run('state.crystals'),310);
});

test('admin crystals apply only to the selected profile and age, and password clears on switching',()=>{
const g=game();g.node('#adminPassword').value='12346';g.run('applyAdminOverride()');g.node('#adminCrystalAmount').value='1000';g.run('addAdminCrystals()');assert.equal(g.run('state.crystals'),1000);
g.node('#adminPassword').value='12346';g.run("switchAge('5-6')");assert.equal(g.node('#adminPassword').value,'');assert.equal(g.node('#adminCrystalsForm').hidden,true);assert.equal(g.node('#adminCrystalAmount').value,'');assert.equal(g.run('state.crystals'),0);
g.node('#adminPassword').value='12346';g.run('applyAdminOverride()');g.node('#adminCrystalAmount').value='1000';g.run('addAdminCrystals()');assert.equal(g.run('state.crystals'),1000);
g.node('#profileName').value='Another explorer';g.run('createProfile()');assert.equal(g.run('state.crystals'),0);assert.equal(g.node('#adminPassword').value,'');
g.run("switchProfile('legacy');switchAge('11-12')");assert.equal(g.run('state.crystals'),1000);
});

test('surf keyboard input catches waves, carves, pauses, and exits before normal map shortcuts run',()=>{
const g=surfTakeoffGame();g.run('let captured=false;const surfKey=key=>window.listeners.keydown.find(l=>l.capture).handler({key,target:{tagName:"CANVAS"},repeat:false,preventDefault(){},stopImmediatePropagation(){captured=true}});for(let i=0;i<24&&surfSession.phase==="takeoff";i++){surfKey(" ");advanceSurfing(280)};advanceSurfing(1200)');assert.equal(g.run('captured'),true);assert.equal(g.run('surfSession.phase'),'riding');
g.run('surfKey("ArrowLeft");surfKey(" ")');assert.equal(g.run('keys.has("arrowleft")&&keys.has(" ")'),true);g.run('surfKey("p")');assert.equal(g.run('surfSession.paused'),true);assert.equal(g.run('keys.size'),0);g.run('surfKey("p");surfKey("x")');assert.equal(g.run('surfSession'),null);assert.equal(g.run('onMainlandBeach()'),true);
});
test('surf view renders face, aerial, wipeout, and results across portrait and landscape proportions',()=>{
const g=surfTakeoffGame();for(const [width,height] of [[480,300],[480,900],[800,300]])for(const phase of ['paddling','takeoff','popup','riding','airborne','wipeout','results'])g.run(`WORLD.viewWidth=${width};WORLD.viewHeight=${height};surfSession.phase='${phase}';surfSession.popStartY=.13;surfSession.popTime=500;surfSession.airHeight=.4;surfSession.airSpin=Math.PI;surfSession.wipeoutTime=600;draw()`);
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
const g=game();g.run('state.crystals=50;buyBeachPass();state.ferryTicket=true;boardFerry();player.x=240;player.y=beachShoreY(240)-60;anchorBoatAtBeach();if(boatAnchorCasting())advanceSwimming(FISH_CAST_DURATION);advanceSwimming(900);startFrisbee(0);draw()');
assert.equal(g.run('!!frisbeeGame'),true);assert.equal(g.run('canReturnToAnchoredBoat()'),false);
const x=g.run('player.x');g.run('returnToAnchoredBoat();visit(0);openFerry();openFishing()');assert.equal(g.run('player.x'),x);
g.run('save()');const restored=game(null,g.snapshot());assert.equal(restored.run('frisbeeGame'),null);assert.equal(restored.run('canReturnToAnchoredBoat()'),true);
g.run('leaveFrisbee()');assert.equal(g.run('canReturnToAnchoredBoat()'),true);
g.run('startFrisbee(0)');g.node('#profileName').value='Frisbee friend';g.run('createProfile()');assert.equal(g.run('frisbeeGame'),null);assert.equal(g.node('#frisbeeHud').hidden,true);
});

test('power refilled by admin activation survives an immediate refresh',()=>{
const g=game({power:0,solved:[],upgrades:[]});
g.node('#adminPassword').value='12346';g.run('applyAdminOverride()');
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
const restored=game(null,g.snapshot());assert.ok(Math.abs(restored.run('state.power')-(25-5/3))<1e-9);
g.node('#profileName').value='Refresh explorer';g.run('createProfile();state.power=42;save()');
const named=game(null,g.snapshot());assert.equal(named.run('profileId'),'p1');assert.equal(named.run('state.power'),42);
});

test('authenticated admin mode refills saved power and does not consume it',()=>{
const g=game({power:0,solved:[],upgrades:[]});g.node('#adminPassword').value='wrong';g.run('applyAdminOverride()');assert.equal(g.run('adminMode'),false);assert.equal(g.run('hasSwimPower()'),false);
g.node('#adminPassword').value='12346';g.run('applyAdminOverride()');assert.equal(g.run('adminMode'),true);assert.equal(g.run('hasSwimPower()'),true);assert.match(g.node('#powerValue').textContent,/Unlimited/);assert.equal(g.node('#powerBar').style.width,'100%');assert.equal(g.node('#exitAdminMode').hidden,false);
g.run('startDive({x:600,y:350});advanceSwimming(700);advancePower(180000)');assert.equal(g.run('swimming'),true);assert.equal(g.run('state.power'),100);assert.equal(g.run('currentProfile().power'),100);
g.run('returnBoat();state.catches={barracuda:5};launchBoat()');assert.equal(g.run('boating'),true);
});
test('authenticated admin surfing preserves energy through paddling, wave phases, retries and swimming exits',()=>{
const g=game({beachPass:true,power:12,crystals:20,solved:[],upgrades:[]});
g.node('#adminPassword').value='12346';g.node('#adminOverrideForm').onsubmit({preventDefault(){}});
g.run('player.x=SURF_SHACK.x;player.y=SURF_SHACK.y;openSurfShack()');
assert.equal(g.run('surfSession.phase'),'paddling');
const unchanged=()=>{
assert.equal(g.run('adminMode'),true);
assert.equal(g.run('state.power'),100);
assert.equal(g.run('currentProfile().power'),100);
assert.equal(g.node('#powerValue').textContent,'∞ Unlimited');
};
g.run('keys.add("up");for(let i=0;i<1500;i++)advanceSwimming(40);keys.clear()');unchanged();
for(const phase of ['takeoff','popup','riding','airborne','wipeout']){
g.run(`prepareSurfTakeoff();Object.assign(surfSession,{phase:${JSON.stringify(phase)},popTime:0,wipeoutTime:0,airHeight:1,airV:1});for(let i=0;i<25;i++)advanceSwimming(40)`);
unchanged();
}
g.run('finishSurfHeat()');g.node('#surfRetry').onclick();
assert.equal(g.run('surfSession.phase'),'paddling');unchanged();
g.run('exitSurfing();advanceSwimming(1000)');assert.equal(g.run('swimming'),true);unchanged();
g.run('exitAdminMode();advanceSwimming(1000)');assert.ok(g.run('state.power')<100);
});

test('exiting admin mode restores normal limits and safely lands a zero-power swimmer',()=>{
const g=game({power:0,solved:[],upgrades:[]});g.node('#adminPassword').value='12346';g.run('applyAdminOverride();state.power=0;swimming=true;player.x=600;player.y=350');g.node('#exitAdminMode').onclick();assert.equal(g.run('adminMode'),false);assert.equal(g.run('swimming'),false);assert.equal(g.run('canWalk(player.x,player.y)'),true);assert.equal(g.run('hasSwimPower()'),false);assert.equal(g.node('#powerValue').textContent,'0 / 100');assert.equal(g.node('#exitAdminMode').hidden,true);
});
test('admin unlimited power ends on reload or changing players, levels, or adventure progress',()=>{
const g=game({power:12,solved:[],upgrades:[]});const enable=()=>{g.node('#adminPassword').value='12346';g.run('applyAdminOverride()');};
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
player.x=p.x;player.y=p.y;player.facing=p.dx<0?'left':p.dx>0?'right':p.dy<0?'up':'down';
// A closely moored hull can block an otherwise exposed sea edge.
if(openSea(p.x+p.dx,p.y+p.dy)&&dockDiveTarget())return p;
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
test('bridge approach buffer guides walkers across both ends and edges without diving',()=>{
const g=game();g.run('state.upgrades=["bridge"]');
const spans=JSON.parse(g.run('JSON.stringify([...crossings,woodlandBridge])'));
for(const b of spans)for(const direction of [-1,1])for(const side of [-1,1])for(const offset of [4,10]){
const horizontal=b.w>b.h,start=horizontal?b.x:b.y,length=horizontal?b.w:b.h;
const across=(horizontal?b.y:b.x)+(side<0?-offset:(horizontal?b.h:b.w)+offset);
const end=direction>0?start:start+length;
const origin=JSON.parse(g.run(`JSON.stringify((()=>{
for(let d=0;d<=12;d++){
const p=${horizontal?`{x:${end}-d*${direction},y:${across}}`:`{x:${across},y:${end}-d*${direction}}`};
if(canWalk(p.x,p.y)&&!walkableTimberAt(p.x,p.y))return p;
}return null;})())`));
assert.ok(origin,JSON.stringify({b,direction,side,offset}));
g.run(`swimming=false;diveAnimation=null;shoreRecovery=null;player.x=${origin.x};player.y=${origin.y}`);
for(let step=0;step<length+16;step++)g.run(`moveExplorer(${horizontal?direction:0},${horizontal?0:direction})`);
assert.equal(g.run('swimming'),false,JSON.stringify({b,direction,side,offset}));
assert.equal(g.run('diveAnimation'),null);
assert.ok(g.run(horizontal?`player.x*${direction}>${end*direction+length}`:`player.y*${direction}>${end*direction+length}`),JSON.stringify({b,direction,side,offset,origin,player:g.run("JSON.stringify(player)")}));
}
});
test('bridge approach buffer excludes unbuilt bridges, distant edges and sideways approaches',()=>{
const g=game();
g.run('const b=woodlandBridge');
assert.equal(g.run('bridgeApproachTarget(b.x-4,b.y-1,0,2)'),null);
g.run('state.upgrades=["bridge"]');
assert.equal(g.run('bridgeApproachTarget(b.x-13,b.y-1,0,2)'),null);
assert.equal(g.run('bridgeApproachTarget(b.x-4,b.y+b.h/2,2,0)'),null);
assert.equal(g.run('bridgeApproachTarget(b.x-4,b.y-1,0,-2)'),null);
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
g.run('advanceSwimming(ANCHOR_RETRIEVE_DURATION-400);draw()');assert.equal(g.run('boatAnchor'),null);
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
if(!target){assert.ok(x<30||x>3170||y>1770,'only constrained edges may lack a safe clock-angle throw');continue;}
assert.ok(Math.hypot(target.x-x,target.y-y)>=71.99);
for(let j=0;j<8;j++)assert.equal(g.run(`sharkWater(${target.x}+Math.cos(${j}*Math.PI/4)*10,${target.y}+Math.sin(${j}*Math.PI/4)*10)`),true);
}
}
});
test('beach moorings preserve the offshore anchor point and automatically haul it aboard after reload',()=>{
const g=game();g.run('state.crystals=50;buyBeachPass();state.ferryTicket=true;boardFerry();player.x=1200;player.y=beachShoreY(1200)-70;anchorBoatAtBeach();advanceSwimming(FISH_CAST_DURATION);advanceSwimming(900);save()');
const point=g.run('JSON.stringify(state.beachAnchor.anchorPoint)');assert.ok(g.run('Math.hypot(boatAnchor.x-boatPosition.x,boatAnchor.y-boatPosition.y)>=72'));
const restored=game(null,g.snapshot());assert.equal(restored.run('JSON.stringify({x:boatAnchor.x,y:boatAnchor.y})'),point);
restored.run('returnToAnchoredBoat();advanceSwimming(900);draw()');assert.equal(restored.run('boatAnchor.retrieving'),true);
const x=restored.run('player.x');restored.run('moveExplorer(10,0);advanceSwimming(400);draw()');assert.equal(restored.run('player.x'),x);
restored.run('advanceSwimming(ANCHOR_RETRIEVE_DURATION-400);draw()');assert.equal(restored.run('boatAnchor'),null);assert.equal(restored.run('boating'),true);
});

for(const vessel of ['fishing','ferry']){
for(const obstacle of ['dock','bridge','boat','tow boat'])test(`${vessel} hull stops before ${obstacle}, including long moves and reversing away`,()=>{
const g=game();g.run(`state.catches={barracuda:5};state.ferryTicket=true;activeVessel='${vessel}';boating=true;state.ferryRemaining=FERRY_RIDE_DURATION;player.x=2900;player.y=1500;boatPosition={x:2900,y:1500};boatMotion.heading=0;`);
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
const g=game();g.run(`state.catches={barracuda:5};activeVessel='${vessel}';boating=true;state.ferryRemaining=FERRY_RIDE_DURATION;player.x=3000;player.y=1500;boatPosition={x:3000,y:1500};boatMotion.heading=0;piers.push({x:2990,y:1525,w:20,h:40,dock:{x:3000,y:1540}})`);
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

test('the snug Whispering ferry pier retains clear water for turning to the west',()=>{
const g=game();g.run('state.ferryTicket=true;boardFerry()');
assert.equal(g.run('dock.x'),232);assert.equal(g.run('dock.y'),285);
assert.equal(g.run('canWalk(player.x,player.y)'),true);
const x=g.run('player.x'),y=g.run('player.y');assert.ok(x<g.run('dock.x'));
assert.equal(g.run(`boatPoseClear(${x},${y},Math.PI/2,'ferry')`),true);
g.run('moveBoat(-55,0,boatMotion.heading);moveExplorer(0,100);draw()');assert.equal(g.run('player.x'),x-55);assert.equal(g.run('player.y'),y+100);
for(let i=0;i<32;i++)assert.equal(g.run(`boatPoseClear(${x-55},${y+100},${i}*Math.PI/16,'ferry')`),true,`turn ${i}`);
g.run('returnBoat()');assert.equal(g.run('canWalk(player.x,player.y)'),true);assert.equal(g.run('nearby()'),7);
assert.equal(g.run('canWalk(232,320)'),false);assert.equal(g.run('crossings.length'),2);
assert.equal(g.run('canWalk(woodlandBridge.x+woodlandBridge.w/2,woodlandBridge.y+woodlandBridge.h/2)'),false);
g.run('state.upgrades=["bridge"]');assert.equal(g.run('canWalk(woodlandBridge.x+woodlandBridge.w/2,woodlandBridge.y+woodlandBridge.h/2)'),true);
});

test('anchor hauling has distinct pulls and pauses, with smaller slower strokes near the boat',()=>{
const g=game();
assert.equal(g.run('anchorRetrievalMotion(0).progress'),0);
assert.equal(g.run('anchorRetrievalMotion(ANCHOR_RETRIEVE_DURATION).progress'),1);
assert.ok(g.run('anchorRetrievalMotion(50).progress>0'));
assert.equal(g.run('anchorRetrievalMotion(140).progress'),g.run('anchorRetrievalMotion(200).progress'));
const early=g.run('anchorRetrievalMotion(50).progress-anchorRetrievalMotion(0).progress');
const late=g.run('anchorRetrievalMotion(1775).progress-anchorRetrievalMotion(1725).progress');
assert.ok(early>late*5,'the last pulls bring in much less rope per second');
let previous=0;for(let elapsed=0;elapsed<=2200;elapsed+=10){const p=g.run(`anchorRetrievalMotion(${elapsed}).progress`);assert.ok(p>=previous&&p<=1);previous=p;}
});

test('open-water anchor throws use eleven or one oclock relative to every bow heading',()=>{
const g=game();
for(let i=0;i<24;i++){
const heading=i*Math.PI/12,target=JSON.parse(g.run(`JSON.stringify(boatAnchorTarget(3000,1400,${heading}))`));assert.ok(target);
const angle=Math.atan2(target.y-1400,target.x-3000),relative=Math.atan2(Math.sin(angle-heading),Math.cos(angle-heading));
assert.ok(Math.abs(Math.abs(relative)-Math.PI/6)<1e-8);
}
});
test('land ahead sends the anchor over the stern at seven or five oclock',()=>{
const g=game();
// A small island lies directly ahead, while both forward shoulders remain clear.
g.run('islandPolys.push([[3050,1395],[3060,1395],[3060,1405],[3050,1405]])');
const target=JSON.parse(g.run('JSON.stringify(boatAnchorTarget(3000,1400,0))'));assert.ok(target);
const relative=Math.atan2(target.y-1400,target.x-3000);assert.ok(Math.abs(Math.abs(relative)-5*Math.PI/6)<1e-8);
assert.ok(target.x<3000);
});
test('anchor throws avoid casting across land and choose the other forward shoulder',()=>{
const g=game();
g.run('islandPolys.push([[3030,1370],[3040,1370],[3040,1380],[3030,1380]])');
const target=JSON.parse(g.run('JSON.stringify(boatAnchorTarget(3000,1400,0))'));assert.ok(target);
assert.ok(target.x>3000&&target.y>1400);
assert.ok(Math.abs(Math.atan2(target.y-1400,target.x-3000)-Math.PI/6)<1e-8);
});

test('swimmers stay underwater beneath every bridge and dock, including locked docks',()=>{
const g=game();g.run('state.upgrades=["bridge"];state.ferryTicket=false;state.boatIsland=null');
const spans=JSON.parse(g.run('JSON.stringify([...crossings,woodlandBridge,...piers])'));
for(const span of spans){
g.run(`swimming=true;shoreClimb=null;player.x=${span.x+span.w/2};player.y=${span.y+span.h/2};advanceSwimming(0)`);
assert.equal(g.run('swimming'),true,JSON.stringify(span));
assert.equal(g.run('shoreClimb'),null);
g.run('moveExplorer(1,0);advanceSwimming(0);draw()');
assert.equal(g.run('swimming'),true);
assert.equal(g.run('shoreClimb'),null);
// The timber's beach overlap must also remain an underpass.
for(const y of [span.y,span.y+span.h]){
g.run(`swimming=true;shoreClimb=null;player.x=${span.x+span.w/2};player.y=${y};moveExplorer(0,-1);advanceSwimming(0)`);
if(g.run('swimmingTimberAt(player.x,player.y)')){
assert.equal(g.run('swimming'),true);
assert.equal(g.run('shoreClimb'),null);
}
}
}
});


test('twin outboard wakes originate at separate stern propellers in every heading',()=>{
for(const vessel of ['ferry','fishing'])for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2]){
const g=game();g.run(`boating=true;state.ferryRemaining=FERRY_RIDE_DURATION;activeVessel=${JSON.stringify(vessel)};player.x=3000;player.y=1400;resetBoatMotion();const from={x:player.x,y:player.y};player.x+=Math.cos(${heading})*6;player.y+=Math.sin(${heading})*6;recordBoatMovement(from,${heading})`);
const wake=JSON.parse(g.run('JSON.stringify(boatMotion.wake)'));
assert.equal(wake.length,2);
const spacing=vessel==='ferry'?8:6,stern=vessel==='ferry'?41:25;
assert.ok(Math.abs(Math.hypot(wake[0].x-wake[1].x,wake[0].y-wake[1].y)-spacing*2)<1e-8);
assert.ok(Math.abs((wake[0].x+wake[1].x)/2-(3000+Math.cos(heading)*(6-stern)))<1e-8);
assert.ok(Math.abs((wake[0].y+wake[1].y)/2-(1400+Math.sin(heading)*(6-stern)))<1e-8);
}
});
test('ferry pennant streams opposite actual travel, including reverse movement',()=>{
const g=game();g.run("boating=true;state.ferryRemaining=FERRY_RIDE_DURATION;activeVessel='ferry';let flagHeading;const originalFlag=cavernFlag;cavernFlag=(x,y,h,d)=>{flagHeading=d};player.x=3000;player.y=1400;resetBoatMotion();recordBoatMovement({x:3006,y:1400},0);ferryArt(player.x,player.y)");
assert.equal(g.run('flagHeading'),Math.PI);
g.run('cavernFlag=originalFlag;let flagPoints;polygon=(points,color)=>{if(color==="#8266aa")flagPoints=points}');
for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2]){
g.run(`cavernFlag(100,100,26,${heading})`);
const points=JSON.parse(g.run('JSON.stringify(flagPoints)'));
assert.ok(Math.abs((points[1][0]-points[0][0])-Math.cos(heading+Math.PI)*19)<1e-8);
}
});


test('unridden sharks and marlins reveal and disappear head to tail in every heading',()=>{
const g=game();
g.run('swimming=true;let wildSlices=[];drawSeaFishBody=(x,y,heading,phase,opacity)=>wildSlices.push(opacity)');
for(const kind of ['shark','marlin'])for(const heading of [0,Math.PI/4,Math.PI/2,Math.PI,-Math.PI/2]){
const rise=kind==='marlin'?2400:2000,fall=kind==='marlin'?3200:2600;
const render=kind==='marlin'?'blueMarlins=[wildFish];drawBlueMarlins()':'sharkFins=[wildFish];drawSharkFins()';
g.run(`var wildFish={x:600,y:350,heading:${heading},age:0,duration:10000,phase:1};wildSlices=[];${render}`);
assert.equal(g.run('wildSlices.length'),0);
g.run(`wildFish.age=${rise/2};wildSlices=[];${render}`);
assert.ok(g.run('wildSlices.length>1&&wildSlices[0]<wildSlices[wildSlices.length-1]'),`${kind} head emerges first at ${heading}`);
g.run(`wildFish.age=4000;wildSlices=[];${render}`);
assert.equal(g.run('wildSlices.length'),1);
g.run(`wildFish.age=${10000-fall/2};wildSlices=[];${render}`);
assert.ok(g.run('wildSlices.length>1&&wildSlices[0]>wildSlices[wildSlices.length-1]'),`${kind} head disappears first at ${heading}`);
g.run(`wildFish.age=10000;wildSlices=[];${render}`);
assert.equal(g.run('wildSlices.length'),0);
}
});


test('free sharks and marlins steer their full silhouettes around land, timber, and boat hulls',()=>{
for(const kind of ['shark','marlin'])for(const obstacle of ['land','pier','boat']){
const g=game();
g.run(`state.upgrades=[];islandPolys.splice(0);piers.splice(0);crossings.splice(0);
const obstacleHull=[[1000,960],[1040,960],[1040,1040],[1000,1040]];
seaFishBoatObstacles=()=>${obstacle==='boat'?'[obstacleHull]':'[]'};
${obstacle==='land'?'islandPolys.push(obstacleHull);':obstacle==='pier'?'piers.push({x:1000,y:960,w:40,h:80});':''}
let avoidingFish={x:900,y:1000,heading:0,phase:0};let turned=false;let stoppedFrames=0;
for(let frame=0;frame<600;frame++){
const previous={x:avoidingFish.x,y:avoidingFish.y};
advanceSeaFishCruise(avoidingFish,16,.028,'${kind}');
if(Math.hypot(avoidingFish.x-previous.x,avoidingFish.y-previous.y)<.44)stoppedFrames++;
if(!seaFishPoseClear(avoidingFish.x,avoidingFish.y,avoidingFish.heading,'${kind}'))throw Error('Fish hit ${obstacle}');
if(Math.abs(avoidingFish.heading)>.1)turned=true;
}`);
assert.equal(g.run('turned'),true,`${kind} turns away from ${obstacle}`);
assert.equal(g.run('stoppedFrames'),0,`${kind} keeps swimming around ${obstacle}`);
assert.ok(g.run('Math.hypot(avoidingFish.x-900,avoidingFish.y-1000)>20'));
// Fin clearance stays small, and the longer marlin bill participates in collisions.
assert.equal(g.run(`seaFishPoseClear(960,1000,0,'marlin')`),false);
assert.equal(g.run(`seaFishPoseClear(960,1000,0,'shark')`),true);
}
});
test('fish obstacles use the active boat location and include ferry, fishing, and tow boats',()=>{
const g=game();g.run("state.catches={shark:5};activeVessel='fishing';boatPosition={x:1500,y:1400};boatMotion.heading=Math.PI/2;fishingBoatPosition={x:900,y:1400}");
assert.equal(g.run("seaFishBoatObstacles().length"),3);
assert.equal(g.run("seaFishPoseClear(1500,1400,0,'shark')"),false);
g.run("activeVessel='ferry';boatPosition={x:1800,y:1400};boatMotion.heading=0");
assert.equal(g.run("seaFishPoseClear(1800,1400,0,'marlin')"),false);
});

test('trapped free sharks and marlins dive head first and leave after submerging',()=>{
for(const kind of ['shark','marlin']){
const g=game();
g.run(`state.upgrades=[];islandPolys.splice(0);piers.splice(0);crossings.splice(0);seaFishBoatObstacles=()=>[];
islandPolys.push([[1048,950],[1060,950],[1060,1050],[1048,1050]],[[940,950],[952,950],[952,1050],[940,1050]],[[940,1022],[1060,1022],[1060,1035],[940,1035]],[[940,965],[1060,965],[1060,978],[940,978]]);
swimming=true;player.x=1000;player.y=1000;nextSharkFin=1e9;nextBlueMarlin=1e9;
let trappedFish={x:1000,y:1000,heading:0,vx:.028,vy:0,age:3000,duration:20000,phase:0};
${kind==='marlin'?'blueMarlins=[trappedFish];advanceBlueMarlin(16)':'sharkFins=[trappedFish];advanceSharkFins(16)'};
`);
assert.equal(g.run('!!trappedFish.escapeDive'),true,kind);
assert.equal(g.run(`seaFishPoseClear(trappedFish.x,trappedFish.y,trappedFish.heading,'${kind}')`),true);
g.run(`${kind==='marlin'?'latchBlueMarlin()':'latchShark()'}`);
assert.equal(g.run('sharkRide'),null);
g.run(`trappedFish.escapeDive.elapsed=trappedFish.escapeDive.duration/2;let diveSlices=[];drawSeaFishBody=(x,y,heading,phase,opacity)=>diveSlices.push(opacity);drawWildSeaFish(trappedFish,'${kind}')`);
assert.ok(g.run('diveSlices.length>1&&diveSlices[0]>diveSlices[diveSlices.length-1]'));
g.run(`trappedFish.escapeDive.elapsed=trappedFish.escapeDive.duration-8;${kind==='marlin'?'advanceBlueMarlin(16)':'advanceSharkFins(16)'}`);
assert.equal(g.run(kind==='marlin'?'blueMarlins.length':'sharkFins.length'),0);
}
});

for(const vessel of ['ferry','fishing'])test(`${vessel} accelerates, coasts, brakes before reverse, and steers relative to its bow`,()=>{
const g=game();g.run(`boating=true;state.ferryRemaining=FERRY_RIDE_DURATION;activeVessel=${JSON.stringify(vessel)};player.x=2800;player.y=1400;boatPosition={x:player.x,y:player.y};resetBoatMotion();boatMotion.heading=-Math.PI/2;driveBoat(500,1,0)`);
assert.ok(g.run('player.y')<1400);assert.ok(g.run('Math.abs(player.x-2800)')<1e-6);
const speed=g.run('boatMotion.velocity');assert.ok(speed>0&&speed<140);
g.run('driveBoat(200,0,0)');assert.ok(g.run('boatMotion.velocity')>0);assert.ok(g.run('boatMotion.velocity')<speed);
const y=g.run('player.y');g.run('driveBoat(100,-1,0)');assert.ok(g.run('boatMotion.velocity')>0);assert.ok(g.run('player.y')<y);
g.run('driveBoat(600,-1,0)');assert.ok(g.run('boatMotion.velocity')<0);assert.equal(g.run('boatMotion.heading'),-Math.PI/2);
g.run('resetBoatMotion();driveBoat(500,0,1)');assert.equal(g.run('boatMotion.heading'),0);assert.equal(g.run('boatMotion.velocity'),0);
g.run('driveBoat(500,1,-1)');assert.ok(g.run('boatMotion.heading')<0);assert.ok(g.run('boatMotion.heading')>-.6);
g.run('driveBoat(500,1,1)');assert.ok(g.run('boatMotion.turnRate')>0);
});
test('boat momentum is stable across frame rates and stops at swept hull collisions',()=>{
const outcomes=[];
for(const dt of [10,20,40]){
const g=game();g.run("boating=true;state.ferryRemaining=FERRY_RIDE_DURATION;activeVessel='fishing';player.x=2800;player.y=1400;resetBoatMotion()");
for(let t=0;t<1000;t+=dt)g.run(`driveBoat(${dt},1,1)`);
outcomes.push(JSON.parse(g.run('JSON.stringify([player.x,player.y,boatMotion.heading,boatMotion.velocity])')));
}
for(const result of outcomes)result.forEach((value,i)=>assert.ok(Math.abs(value-outcomes[0][i])<.01));
const g=game();g.run("boating=true;state.ferryRemaining=FERRY_RIDE_DURATION;activeVessel='fishing';player.x=2800;player.y=1400;resetBoatMotion();boatMotion.velocity=140;piers.push({x:2850,y:1350,w:20,h:100,dock:{}});driveBoat(1000,1,0)");
assert.ok(g.run('player.x')<2824);assert.equal(g.run('boatMotion.velocity'),0);assert.equal(g.run('boatPoseClear(player.x,player.y,boatMotion.heading)'),true);
});

for(const vessel of ['ferry','fishing'])test(`${vessel} Space trim rises five steps then falls five steps without key repeat`,()=>{
const g=game();g.run(`boating=true;state.ferryRemaining=FERRY_RIDE_DURATION;activeVessel=${JSON.stringify(vessel)};player.x=1100;player.y=1400;resetBoatMotion();const pressTrim=(repeat=false,target='CANVAS')=>window.listeners.keydown.find(l=>!l.capture).handler({key:' ',repeat,target:{tagName:target},preventDefault(){}})`);
assert.equal(g.run('boatTrimLevel()'),0);
for(const expected of [1,2,3,4,5,4,3,2,1,0,1]){
g.run('pressTrim()');assert.equal(g.run('boatTrimLevel()'),expected);
g.run('pressTrim(true)');assert.equal(g.run('boatTrimLevel()'),expected);
assert.match(g.node('#waterControls').textContent,new RegExp(`Space trim ${expected}/5`));
}
g.run("pressTrim(false,'INPUT')");assert.equal(g.run('boatTrimLevel()'),1);
g.run('fishingActive=true;pressTrim()');assert.equal(g.run('boatTrimLevel()'),1);
g.run('fishingActive=false;boatAnchor={casting:true};pressTrim()');assert.equal(g.run('boatTrimLevel()'),1);
g.run('resetBoatMotion()');assert.equal(g.run('boatTrimLevel()'),0);
});
test('trim 4 is fastest, trim 5 loses propulsion, and lowering trim restores speed on both boats',()=>{
for(const vessel of ['ferry','fishing']){
const speeds=[];
for(const trim of [0,3,4,5]){
const g=game();g.run(`boating=true;state.ferryRemaining=FERRY_RIDE_DURATION;activeVessel='${vessel}';player.x=1100;player.y=1400;resetBoatMotion();boatMotion.trimStep=${trim};driveBoat(3000,1,0);if(${trim}===5){player.x=-400;player.y=900;driveBoat(8000,1,0)}`);
speeds.push(g.run('boatMotion.velocity'));
assert.equal(g.run(`boatMotion.wake.every(w=>w.trim===${trim})`),true);
}
assert.equal(speeds[0],140);assert.ok(speeds[1]>speeds[0]);assert.ok(Math.abs(speeds[2]-165.2)<1e-6);assert.equal(speeds[3],105);
const g=game();g.run(`boating=true;state.ferryRemaining=FERRY_RIDE_DURATION;activeVessel='${vessel}';player.x=1100;player.y=1400;resetBoatMotion();boatMotion.trimStep=4;boatMotion.velocity=boatTopSpeed();cycleBoatTrim();driveBoat(40,1,0);updateWaterControls()`);
assert.ok(g.run('boatMotion.velocity')<165.2);assert.ok(g.run('boatMotion.velocity')>105);
g.run('driveBoat(1000,1,0);updateWaterControls()');assert.equal(g.run('boatMotion.velocity'),105);assert.equal(g.node('#boatSpeedValue').textContent,'64%');assert.equal(g.node('#boatTrimValue').textContent,'5 / 5');
g.run('cycleBoatTrim();driveBoat(40,1,0)');assert.ok(g.run('boatMotion.velocity')>105);
g.run('driveBoat(1000,1,0)');assert.ok(Math.abs(g.run('boatMotion.velocity')-165.2)<1e-6);
}
});
test('outboard spray is ballistic, varies within the trim range, and grows with trim',()=>{
for(const vessel of ['ferry','fishing'])for(const level of [1,3,5]){
const g=game();g.run(`boating=true;state.ferryRemaining=FERRY_RIDE_DURATION;activeVessel=${JSON.stringify(vessel)};player.x=1100;player.y=1400;resetBoatMotion();boatMotion.velocity=140;boatMotion.power=1;boatMotion.trimStep=${level};advanceBoatSpray(100)`);
const drops=JSON.parse(g.run('JSON.stringify(boatMotion.spray)'));
assert.ok(drops.length>0);
const distances=drops.map(p=>p.reach);assert.ok(Math.max(...distances)-Math.min(...distances)>5);
for(const p of drops){
const reachBoost=level===5?1.8:1;
assert.ok(p.reach>=(20+level/5*80)*reachBoost);assert.ok(p.reach<=(32+level/5*114)*reachBoost);
assert.ok(p.height>=(8+level/5*6)*.65*(level===5?1.6:1));
assert.ok(p.height/p.reach<.3);
assert.ok(Math.abs(p.vz*p.life-p.gravity*p.life*p.life/2)<1e-6);
assert.ok(Math.abs(p.vz*p.life/2-p.gravity*(p.life/2)**2/2-p.height)<1e-6);
}
const first=JSON.stringify(drops[0]);
g.run('player.x+=100;advanceBoatSpray(10);drawBoatTrimSpray(player.x,player.y,0,activeVessel)');
assert.equal(g.run('boatMotion.spray[0].x'),JSON.parse(first).x);
g.run('boatMotion.velocity=0;advanceBoatSpray(5000)');assert.equal(g.run('boatMotion.spray.length'),0);
g.run('boatMotion.velocity=-65;advanceBoatSpray(100)');assert.equal(g.run('boatMotion.spray.length'),0);
}
});
test('both boats render twin outboard motors and trim lifts their lower units',()=>{
const g=game();g.run("let cowlings=0;let angles=[];let legHeights=[];const originalRect=rect;rect=(x,y,w,h,color)=>{if(color==='#4b6369')legHeights.push(h);originalRect(x,y,w,h,color)};polygon=(points,color)=>{if(color==='#34494f')cowlings++};ctx.rotate=angle=>angles.push(angle)");
for(const vessel of ['ferry','fishing']){
g.run(`resetBoatMotion();cowlings=0;angles=[];drawOutboardMotors(${JSON.stringify(vessel)},true)`);assert.equal(g.run('cowlings'),2);assert.equal(g.run('angles.every(a=>a===0)'),true);
g.run(`boatMotion.trimStep=5;angles=[];legHeights=[];drawOutboardMotors(${JSON.stringify(vessel)},true)`);assert.equal(g.run('angles.every(a=>a===0)'),true);assert.equal(g.run('legHeights.every(h=>h===3)'),true);
}
});

test('islands have equal ocean margins and western ocean supports travel and the minimap',()=>{
const g=game();
const margins=JSON.parse(g.run(`JSON.stringify((()=>{const xs=islandPolys.slice(0,-1).flatMap(p=>p.map(v=>v[0]));return {west:Math.min(...xs)-WORLD.left,east:WORLD.right-Math.max(...xs)};})())`));
assert.equal(margins.west,margins.east);
g.run('swimming=true;player.x=-1000;player.y=900;draw()');assert.equal(g.run('sharkWater(player.x,player.y)'),true);
assert.equal(g.run("boatPoseClear(-1000,900,0,'fishing')"),false);g.run('moveExplorer(-2,0)');assert.equal(g.run('player.x'),-1002);
g.run('player.x=WORLD.left+20;draw()');assert.equal(g.run('camera.x'),g.run('WORLD.left'));
assert.equal(g.run('sharkWater(WORLD.left,900)'),false);assert.equal(g.run('boatPoseClear(WORLD.left,900,0)'),false);
g.run('swimming=false;player.x=-1000;player.y=1750;draw()');assert.equal(g.run('onMainlandBeach()'),true);
});

for(const vessel of ['ferry','fishing','speedboat'])test(`${vessel} outboards swivel smoothly, center, and keep their steering direction in reverse`,()=>{
const g=game();g.run(`boating=true;state.ferryRemaining=FERRY_RIDE_DURATION;activeVessel=${JSON.stringify(vessel)};player.x=1100;player.y=1400;resetBoatMotion();boatMotion.velocity=80;driveBoat(40,1,1)`);
const early=g.run('boatMotion.steering');assert.ok(early<0&&early>-.48);
g.run('driveBoat(400,1,1)');assert.ok(g.run('boatMotion.steering')<early);
g.run('let angles=[];ctx.rotate=a=>angles.push(a);drawOutboardMotors(activeVessel,true)');
assert.equal(g.run('angles.length'),vessel==='speedboat'?3:2);assert.equal(g.run('angles[0]'),g.run('angles[1]'));assert.ok(g.run('angles[0]')<0);
g.run('driveBoat(500,0,0)');assert.ok(Math.abs(g.run('boatMotion.steering'))<.01);
g.run('boatMotion.velocity=-40;driveBoat(400,-1,1)');assert.ok(g.run('boatMotion.steering')<0);
g.run('driveBoat(500,-1,-1)');assert.ok(g.run('boatMotion.steering')>0);
g.run('resetBoatMotion()');assert.equal(g.run('boatMotion.steering'),0);
});

test('boat steering keeps motor direction while the stern follows input in reverse',()=>{
for(const vessel of ['ferry','fishing','speedboat'])for(const steer of [-1,1]){
const outcomes=[];
for(const velocity of [-40,40])for(const throttle of [0,Math.sign(velocity),-Math.sign(velocity)]){
const g=game();g.run(`boating=true;state.ferryRemaining=FERRY_RIDE_DURATION;activeVessel='${vessel}';player.x=1100;player.y=1400;boatPosition={x:player.x,y:player.y};resetBoatMotion();boatMotion.velocity=${velocity};driveBoat(200,${throttle},${steer});`);
assert.equal(Math.sign(g.run('boatMotion.heading')),steer*Math.sign(velocity));
assert.equal(Math.sign(g.run('player.y-1400')),steer,'the moving end follows the steering input');
assert.equal(Math.sign(g.run('boatMotion.steering')),-steer);
outcomes.push(g.run('boatMotion.steering'));
}
for(const angle of outcomes)assert.ok(Math.abs(angle-outcomes[0])<1e-9);
}
});

test('ferry plows a broader bow wash and leaves wider spreading whitewater than smaller boats',()=>{
const g=game();
g.run("let washWidths=[],washFaces=[];ctx.stroke=()=>washWidths.push(ctx.lineWidth);polygon=(points,color)=>washFaces.push({points,color});boating=true;");
const widths={};
for(const vessel of ['ferry','fishing','speedboat']){
g.run(`activeVessel='${vessel}';boatMotion.velocity=boatTopSpeed(4,'${vessel}')*.7;washWidths=[];drawBoatBowWake(0,0,0,'${vessel}');`);
widths[vessel]=g.run('Math.max(...washWidths)');
}
assert.ok(widths.ferry>widths.fishing*1.6&&widths.ferry>widths.speedboat*1.6);
g.run("activeVessel='ferry';boatMotion.distance=0;boatMotion.bowWake=[];recordHullWake(boatMotion,{x:-400,y:900},{x:-380,y:900},0,'ferry');const ferrySamples=boatMotion.bowWake.map(w=>({...w,age:1000}));");
assert.ok(g.run('ferrySamples.length')>2);
const span=size=>g.run(`washFaces=[];drawBoatWakeArm(1,{bowWake:ferrySamples.map(w=>({...w,wakeSize:${size}}))});Math.max(...washFaces.flatMap(f=>f.points.map(p=>p[1])))-Math.max(...ferrySamples.filter(w=>w.side===1).map(w=>w.y))`);
assert.ok(span(1.7)>span(1)*1.5,'ferry trail expands farther from its recorded hull contacts');
});

for(const vessel of ['ferry','fishing','speedboat'])test(`${vessel} hull wake moves aft onto plane and returns to the bow when slowing`,()=>{
const g=game();g.run(`boating=true;activeVessel='${vessel}';resetBoatMotion();let hullWakeProfile,wakeStarts=[];const wakeHeading=.6;`);
const contacts=[];
for(const fraction of [.1,.3,.5,.8,1,.5,.1]){
g.run(`boatMotion.velocity=boatTopSpeed(4)*${fraction};hullWakeProfile=boatHullWake(activeVessel);`);
contacts.push(g.run('hullWakeProfile.point(0)[0]'));
g.run('wakeStarts=[];ctx.moveTo=(x,y)=>wakeStarts.push([x,y]);drawBoatBowWake(0,0,0,activeVessel)');
assert.equal(g.run('wakeStarts.every(([x])=>x<=hullWakeProfile.point(0)[0])'),true);
assert.ok(Math.abs(g.run('wakeStarts[0][1]'))>.5);
// Emission uses the same hull-contact geometry, rotated into world space.
g.run(`player.x=-400;player.y=900;boatMotion.distance=0;boatMotion.bowWake=[];
player.x+=Math.cos(wakeHeading)*7;player.y+=Math.sin(wakeHeading)*7;
recordBoatMovement({x:-400,y:900},wakeHeading);`);
assert.equal(g.run('boatMotion.bowWake.length'),2);
assert.ok(g.run(`boatMotion.bowWake.every(w=>{
const dx=w.x-(-400+Math.cos(wakeHeading)*6),dy=w.y-(900+Math.sin(wakeHeading)*6),[along,across]=hullWakeProfile.point(.12);
return Math.abs(dx*Math.cos(wakeHeading)+dy*Math.sin(wakeHeading)-along)<1e-8&&
Math.abs(-dx*Math.sin(wakeHeading)+dy*Math.cos(wakeHeading)-w.side*across)<1e-8;
})`));
}
assert.ok(contacts[0]>contacts[1]&&contacts[1]>contacts[2]&&contacts[2]>contacts[3]);
assert.ok(contacts[3]<0);
assert.equal(contacts[3],contacts[4]);
assert.equal(contacts[2],contacts[5]);
assert.equal(contacts[0],contacts[6]);
g.run('boatMotion.velocity=0;wakeStarts=[];drawBoatBowWake(0,0,0,activeVessel)');
assert.equal(g.run('wakeStarts.length'),0);
});

for(const vessel of ['ferry','fishing','speedboat'])test(`${vessel} bow wake stays in the water through turns and fades after stopping`,()=>{
const g=game();g.run(`boating=true;state.ferryRemaining=FERRY_RIDE_DURATION;activeVessel='${vessel}';player.x=-400;player.y=900;resetBoatMotion();driveBoat(700,1,0)`);
assert.ok(g.run('boatMotion.bowWake.length')>0);
assert.equal(g.run('new Set(boatMotion.bowWake.map(w=>w.side)).size'),2);
const first=g.run('JSON.stringify(boatMotion.bowWake[0])');
g.run('driveBoat(500,1,1)');
assert.equal(g.run('JSON.stringify(boatMotion.bowWake[0])'),first,'turning does not move previous wave origins');
const trail=g.run('JSON.stringify(boatMotion.bowWake)');
g.run('draw();draw()');assert.equal(g.run('JSON.stringify(boatMotion.bowWake)'),trail,'rendering does not advance wake state');
g.run('boatMotion.velocity=0;advanceBoatMotion(2200)');assert.ok(g.run('boatMotion.bowWake.length')>0);
g.run('advanceBoatMotion(1400)');assert.equal(g.run('boatMotion.bowWake.length'),0);
g.run('driveBoat(500,-1,0)');assert.equal(g.run('boatMotion.bowWake.length'),0,'reverse does not emit bow foam');
g.run('resetBoatMotion()');assert.equal(g.run('boatMotion.bowWake.length'),0);
});
for(const vessel of ['ferry','fishing'])test(`${vessel} replays exhaust when throttle resumes from rest`,()=>{
for(const direction of [1,-1]){
const g=game();g.run(`boating=true;state.ferryRemaining=FERRY_RIDE_DURATION;activeVessel='${vessel}';player.x=-400;player.y=900;resetBoatMotion();driveBoat(40,${direction},0)`);
assert.equal(g.run('boatMotion.engineAge'),0);
assert.equal(g.run('boatMotion.engineStage'),'running');
assert.ok(g.run('Math.abs(boatMotion.velocity)')>0,'restart keeps movement responsive');
g.run('let puffs=0;ellipse=()=>puffs++;drawBoatExhaust(player.x,player.y,boatMotion.heading,activeVessel)');
assert.equal(g.run('puffs'),2,'both motors emit exhaust');
g.run(`advanceBoatMotion(400);driveBoat(40,${direction},0)`);
assert.equal(g.run('boatMotion.engineAge'),400,'held throttle does not restart the puff');
g.run(`advanceBoatMotion(600);driveBoat(40,0,0);driveBoat(40,${direction},0)`);
assert.equal(g.run('boatMotion.engineAge'),1000,'throttle changes while moving do not puff');
g.run(`driveBoat(20000,0,0);driveBoat(40,${direction},0)`);
assert.equal(g.run('boatMotion.engineAge'),0,'stopping and restarting emits another puff');
g.run('advanceBoatMotion(1000);puffs=0;drawBoatExhaust(player.x,player.y,boatMotion.heading,activeVessel)');
assert.equal(g.run('puffs'),0,'restart smoke clears');
}
});
for(const vessel of ['ferry','fishing'])test(`${vessel} starts with a brief exhaust puff before engaging its engines`,()=>{
const g=game();g.run(`state.ferryTicket=true;state.catches={shark:5};${vessel==='ferry'?'boardFerry()':'launchBoat()'};player.x=1100;player.y=1400`);
assert.equal(g.run('boatMotion.engineStage'),'starting');
g.run('driveBoat(100,1,0)');assert.equal(g.run('player.x'),1100);
g.run('advanceSwimming(549)');assert.equal(g.run('boatMotion.engineStage'),'starting');
g.run('let puffs=0;ellipse=()=>puffs++;drawBoatExhaust(player.x,player.y,boatMotion.heading,activeVessel)');assert.ok(g.run('puffs')>0);
g.run('advanceSwimming(1)');assert.equal(g.run('boatMotion.engineStage'),'running');
g.run('driveBoat(100,1,0)');assert.ok(g.run('Math.hypot(player.x-1100,player.y-1400)>0'));
g.run('advanceSwimming(500);puffs=0;drawBoatExhaust(player.x,player.y,boatMotion.heading,activeVessel)');assert.equal(g.run('puffs'),0);
});
test('ferry outboards are visibly larger than fishing outboards',()=>{
const g=game();g.run('let scales=[];ctx.scale=(x,y)=>scales.push([x,y]);drawOutboardMotors("ferry",false)');
assert.equal(g.run('scales.every(([x,y])=>x===1.4&&y===1.4)'),true);
g.run('scales=[];drawOutboardMotors("fishing",false)');assert.equal(g.run('scales.every(([x,y])=>x===1&&y===1)'),true);
});

test('dragon fire ignites a touched tree, burns it down to ash, and does not restart it',()=>{
const g=game();g.run('const target=burnableTrees.values().next().value;petDragonPosition={x:target.x-60,y:target.y-8};petDragonFire={elapsed:200,duration:850};advancePetDragonFire(16)');
assert.equal(g.run('target.burnAge'),0);
assert.equal(g.run('[...burnableTrees.values()].filter(t=>t.burnAge!==null).length'),1);
g.run('advancePetDragonFire(1200);draw()');assert.equal(g.run('target.burnAge'),1200);
g.run('advancePetDragonFire(TREE_BURN_DURATION);draw()');assert.equal(g.run('target.burnAge'),g.run('TREE_BURN_DURATION'));
assert.equal(g.run('drawBurningTree(target.x,target.y)'),true);
g.run('petDragonFire={elapsed:200,duration:850};checkTreeDragonFireHits()');assert.equal(g.run('target.burnAge'),g.run('TREE_BURN_DURATION'));
});

test('burned trees gradually regrow over five minutes, pause for dialogs, and can burn again',()=>{
const g=game();g.run('const target=burnableTrees.values().next().value;target.burnAge=TREE_BURN_DURATION-100;advancePetDragonFire(1100)');
assert.equal(g.run('target.regrowAge'),1000);
g.node('#challenge').open=true;g.run('advancePetDragonFire(10000)');assert.equal(g.run('target.regrowAge'),1000);g.node('#challenge').open=false;
g.run('advancePetDragonFire(149000)');assert.equal(g.run('target.regrowAge'),150000);
g.run(`let growthScales=[];ctx.scale=(x,y)=>growthScales.push([x,y]);let flames=0;drawDragonFlame=()=>flames++;
for(const kind of ['tree','pine','palm']){const t=[...burnableTrees.values()].find(t=>t.kind===kind);t.burnAge=TREE_BURN_DURATION;t.regrowAge=150000;drawBurningTree(t.x,t.y);}`);
assert.equal(g.run('growthScales.length'),3);assert.equal(g.run('growthScales.every(([x,y])=>x===.52&&y===.52)'),true);assert.equal(g.run('flames'),0);
g.run('advancePetDragonFire(149999)');assert.notEqual(g.run('target.burnAge'),null);
g.run('advancePetDragonFire(1)');assert.equal(g.run('target.burnAge'),null);assert.equal(g.run('target.regrowAge'),0);
assert.equal(g.run('drawBurningTree(target.x,target.y)'),false);
g.run('petDragonPosition={x:target.x-60,y:target.y-8};petDragonFire={elapsed:200,duration:850};checkTreeDragonFireHits()');assert.equal(g.run('target.burnAge'),0);
g.run('target.regrowAge=100000;resetPetDragon()');assert.equal(g.run('target.regrowAge'),0);assert.equal(g.run('target.burnAge'),null);
});

test('dragon fire explodes all four boats once, dispatches repairs after smoke and pauses for dialogs',()=>{
for(const vessel of ['ferry','fishing','speedboat','tow']){
const g=game();g.run(`state.catches={shark:5};state.speedboat=true;const vessel='${vessel}';
const target=vessel==='tow'?{x:WATERSPORTS_DOCK.x+40,y:WATERSPORTS_DOCK.y+18}:vessel===activeVessel?boatPosition:vessel==='ferry'?ferryPosition:vessel==='speedboat'?speedboatPosition:fishingBoatPosition;
petDragonPosition={x:target.x-60,y:target.y-8};petDragonFire={elapsed:200,duration:850};advancePetDragonFire(1)`);
assert.equal(g.run('boatExplosions.has(vessel)'),true);
g.run('boatExplosions.get(vessel).elapsed=100;checkBoatDragonFireHits()');assert.equal(g.run('boatExplosions.get(vessel).elapsed'),100);
for(const elapsed of [0,100,400,900,1800,3000])g.run(`boatExplosions.get(vessel).elapsed=${elapsed};draw()`);
g.run('boatExplosions.get(vessel).elapsed=100');g.node('#challenge').open=true;
g.run('advancePetDragonFire(500)');assert.equal(g.run('boatExplosions.get(vessel).elapsed'),100);g.node('#challenge').open=false;
g.run('petDragonFire=null;nextPetDragonFire=100000;advancePetDragonFire(BOAT_EXPLOSION_DURATION-101)');assert.equal(g.run('boatExplosions.has(vessel)'),true);
g.run('advancePetDragonFire(1)');assert.equal(g.run('boatExplosions.has(vessel)'),false);
g.run('petDragonFire={elapsed:200,duration:850};checkBoatDragonFireHits()');assert.equal(g.run('boatExplosions.has(vessel)'),false);assert.equal(g.run('boatRepairs.has(vessel)'),true);assert.equal(g.run('boatUnavailable(vessel)'),true);
g.run('resetPetDragon()');assert.equal(g.run('boatExplosions.size'),0);assert.equal(g.run('boatRepairs.size'),0);
}
});

test('boat ignition preserves the hull before detonation and debris lands on both shore and sea',()=>{
const g=game();g.run(`const blast=createBoatBlast({x:dock.x+20,y:dock.y+10,heading:0,vessel:'ferry'});boatExplosions.set('ferry',blast);
let hullShapes=0;const savedPolygon=polygon;polygon=(...a)=>{hullShapes++;savedPolygon(...a)};ferryArt(blast.x,blast.y)`);
assert.ok(g.run('hullShapes')>0);assert.equal(g.run("boatIsExploding('ferry')"),false);
g.run('blast.elapsed=BOAT_IGNITION_DURATION;hullShapes=0;ferryArt(blast.x,blast.y)');assert.equal(g.run('hullShapes'),0);
assert.ok(g.run('blast.debris.some(p=>p.land)'));assert.ok(g.run('blast.debris.some(p=>!p.land)'));
assert.equal(g.run('new Set(blast.debris.map(p=>p.kind)).size'),8);
g.run(`for(const p of blast.debris){
const mid=boatDebrisPose(p,p.flight/2),impact=boatDebrisPose(p,p.flight),after=boatDebrisPose(p,p.flight+1);
if(!mid.airborne||mid.z<=0||impact.airborne||impact.z!==0||after.airborne)throw new Error('Invalid ballistic impact');
if(!p.land&&(impact.x!==after.x||impact.y!==after.y||after.z!==0))throw new Error('Water impact drifted');
}
let gradients=0;ctx.createRadialGradient=()=>{gradients++;return {addColorStop(){}}};
for(const elapsed of [0,900,1799,1800,1850,2100,2400,3000,4000,5000,7000,11000]){blast.elapsed=elapsed;drawBoatExplosions();}
const before=JSON.stringify(blast);drawBoatExplosions();if(JSON.stringify(blast)!==before)throw new Error('Rendering changed simulation');`);
assert.ok(g.run('gradients')>200);
});

test('boat fire hits follow the dragon heading and altitude and the current vessel position',()=>{
for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2]){
const g=game();g.run(`const target={x:1100,y:1400,heading:.7,vessel:'ferry'};dragonFlight={stage:'flying',heading:${heading},altitude:30};
player.x=target.x-Math.cos(${heading})*55;player.y=target.y+30-Math.sin(${heading})*55;petDragonFire={elapsed:200,duration:850}`);
assert.equal(g.run('dragonFireTouchesBoat(target)'),true);
g.run('dragonFlight.altitude=180');assert.equal(g.run('dragonFireTouchesBoat(target)'),false);
g.run('dragonFlight.altitude=30;target.x+=250');assert.equal(g.run('dragonFireTouchesBoat(target)'),false);
}
const g=game();g.run(`state.catches={shark:5};activeVessel='fishing';boatPosition={x:1100,y:1400};fishingBoatPosition={x:1300,y:1400};
petDragonPosition={x:1040,y:1392};petDragonFire={elapsed:200,duration:850};checkBoatDragonFireHits()`);
assert.equal(g.run("boatExplosions.get('fishing').x"),1100);
assert.equal(g.run('canUseCurrentVessel()'),false);
g.run('boating=false;swimming=true;player.x=boatPosition.x;player.y=boatPosition.y;boardOwnBoat()');assert.equal(g.run('boating'),false);
});

test('an exploding occupied boat leaves the explorer swimming and hides its sprite',()=>{
const g=game();g.run(`state.catches={shark:5};activeVessel='fishing';boating=true;state.ferryRemaining=FERRY_RIDE_DURATION;player.x=1100;player.y=1400;boatPosition={x:1100,y:1400};
petDragonPosition={x:1040,y:1392};petDragonFire={elapsed:200,duration:850};checkBoatDragonFireHits()`);
assert.equal(g.run('boating'),false);assert.equal(g.run('swimming'),true);assert.equal(g.run('boatMotion.velocity'),0);
g.run('let boatShapes=0;polygon=()=>boatShapes++;rect=()=>boatShapes++;ellipse=()=>boatShapes++;boatExplosions.get("fishing").elapsed=BOAT_IGNITION_DURATION;fishingBoatArt(1100,1400)');assert.equal(g.run('boatShapes'),0);
g.run('launchBoat()');assert.equal(g.run('boating'),false);
});

test('tree fire hits follow flight heading, mirrored sprite and altitude, and miss distant trees',()=>{
for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2]){
const g=game();g.run(`const target=burnableTrees.values().next().value;const heading=${heading};dragonFlight={stage:'flying',heading,altitude:30};player.x=target.x-Math.cos(heading)*55;player.y=target.y-8+30-Math.sin(heading)*55;petDragonFire={elapsed:200,duration:850};checkTreeDragonFireHits()`);
assert.equal(g.run('target.burnAge'),0,`heading ${heading}`);
}
const g=game();g.run('const target=burnableTrees.values().next().value;petDragonPosition={x:target.x-150,y:target.y};petDragonFire={elapsed:200,duration:850};checkTreeDragonFireHits()');assert.equal(g.run('target.burnAge'),null);
g.run('petDragonPosition={x:target.x-55,y:target.y+100};checkTreeDragonFireHits()');assert.equal(g.run('target.burnAge'),null);
});

test('burning trees pause for dialogs and clear on explorer or age reset; all tree types render ash',()=>{
const g=game();g.run('const target=burnableTrees.values().next().value;target.burnAge=100');g.node('#challenge').open=true;
g.run('advancePetDragonFire(500)');assert.equal(g.run('target.burnAge'),100);g.node('#challenge').open=false;
g.run('advancePetDragonFire(500)');assert.equal(g.run('target.burnAge'),600);
g.run('for(const t of burnableTrees.values())t.burnAge=1500;drawIslandTrees();drawBoatIslandDetails();for(const t of burnableTrees.values())t.burnAge=TREE_BURN_DURATION;drawIslandTrees();drawBoatIslandDetails()');
g.run("switchAge('7-8')");assert.equal(g.run('[...burnableTrees.values()].every(t=>t.burnAge===null)'),true);
});

test('boat spray hits towel occupants along its path and they stand, dry off, and rest again',()=>{
const g=game();
g.run(`const sunbather=beachSunbathers()[0];
boatMotion.spray=[{x:sunbather.x,y:sunbather.y-60,vx:0,vy:120,vz:45,gravity:180,life:.5,age:0}];
advanceBoatSpray(500)`);
assert.equal(g.run('sunbatherReactions.has(sunbather.i)'),true);
assert.equal(g.run('sunbatherReactions.size'),1);
for(const elapsed of [0,325,650,1400,3500,5700,6800])g.run(`sunbatherReactions.get(sunbather.i).elapsed=${elapsed};player.x=sunbather.x;player.y=sunbather.y;draw()`);
g.run('sunbatherReactions.get(sunbather.i).elapsed=1200;advanceBoatSpray(10)');assert.equal(g.run('sunbatherReactions.get(sunbather.i).elapsed'),1200);
g.node('#challenge').showModal();g.run('advanceSunbathers(500)');assert.equal(g.run('sunbatherReactions.get(sunbather.i).elapsed'),1200);g.node('#challenge').close();
g.run('advanceSwimming(6000)');assert.equal(g.run('sunbatherReactions.size'),0);
g.run('draw()');
});

test('spray misses towels when too far away or too high and beach reactions clear on player changes',()=>{
const g=game();
g.run(`const sunbather=beachSunbathers()[0];
const drop={x:sunbather.x,y:sunbather.y-40,vx:0,vy:100,vz:150,gravity:180,life:1.6,age:0};
boatMotion.spray=[{...drop},{...drop,x:sunbather.x+30,vz:45,life:.5}];advanceBoatSpray(500)`);
assert.equal(g.run('sunbatherReactions.size'),0);
g.run('sunbatherReactions.set(sunbather.i,{elapsed:900});switchAge("9-10")');assert.equal(g.run('sunbatherReactions.size'),0);
g.run('sunbatherReactions.set(sunbather.i,{elapsed:900})');g.node('#profileName').value='Dry beachgoer';g.run('createProfile()');assert.equal(g.run('sunbatherReactions.size'),0);
});

test('boat instruments follow actual speed, reverse, trim cycling, and leaving either boat',()=>{
for(const vessel of ['ferry','fishing']){
const g=game();g.run('updateWaterControls()');assert.equal(g.node('#boatInstruments').hidden,true);
g.run(`boating=true;state.ferryRemaining=FERRY_RIDE_DURATION;activeVessel='${vessel}';player.x=1100;player.y=1400;resetBoatMotion();updateWaterControls()`);
assert.equal(g.node('#boatInstruments').hidden,false);assert.equal(g.node('#boatSpeedValue').textContent,'0%');assert.equal(g.node('#boatTrimValue').textContent,'0 / 5');
g.run('driveBoat(1000,1,0);updateWaterControls()');assert.ok(parseInt(g.node('#boatSpeedValue').textContent)>0);
g.run('boatMotion.velocity=-65;updateWaterControls()');assert.equal(g.node('#boatSpeedValue').textContent,'REV 39%');assert.equal(g.node('#boatSpeedBar').style.width,'39%');
for(const level of [1,2,3,4,5,4,3,2,1,0]){g.run('cycleBoatTrim()');assert.equal(g.node('#boatTrimValue').textContent,`${level} / 5`);assert.equal(g.node('#boatTrimBar').style.width,`${level*20}%`);}
g.run('fishingActive=true;advanceBoatMotion(16);updateWaterControls()');assert.equal(g.node('#boatSpeedValue').textContent,'0%');
g.run('boating=false;swimming=true;updateWaterControls()');assert.equal(g.node('#boatInstruments').hidden,false);assert.equal(g.node('#boatSpeedInstrument').hidden,true);
}
});


test('maximum trim struggles to accelerate from rest, while trimming down restores grip',()=>{
for(const vessel of ['ferry','fishing'])for(const direction of [1,-1]){
const g=game();g.run(`boating=true;state.ferryRemaining=FERRY_RIDE_DURATION;activeVessel='${vessel}';player.x=-400;player.y=900;resetBoatMotion();boatMotion.trimStep=5;driveBoat(3000,${direction},0)`);
const slow=Math.abs(g.run('boatMotion.velocity'));
assert.ok(slow>15&&slow<30);
g.run(`cycleBoatTrim();driveBoat(500,${direction},0)`);
assert.ok(Math.abs(g.run('boatMotion.velocity'))>slow+20);
}
for(const step of [10,40,100]){
const g=game();g.run(`boating=true;state.ferryRemaining=FERRY_RIDE_DURATION;player.x=-400;player.y=900;resetBoatMotion();boatMotion.trimStep=5;for(let elapsed=0;elapsed<11000;elapsed+=${step})driveBoat(${step},1,0)`);
assert.equal(g.run('boatMotion.velocity'),105);
}
});


test('maximum trim throws full-sized spray under throttle from rest and during slow acceleration',()=>{
for(const vessel of ['ferry','fishing']){
const bursts=[];
for(const velocity of [0,2,105]){
const g=game();g.run(`boating=true;state.ferryRemaining=FERRY_RIDE_DURATION;activeVessel='${vessel}';player.x=-400;player.y=900;resetBoatMotion();boatMotion.trimStep=5;boatMotion.velocity=${velocity};driveBoat(0,1,0);advanceBoatMotion(40)`);
const drops=JSON.parse(g.run('JSON.stringify(boatMotion.spray)'));assert.ok(drops.length>0);
assert.ok(drops.every(p=>p.reach>=180&&p.height>=14*.65*1.6));
bursts.push(drops.map(p=>({reach:p.reach,height:p.height,size:p.size})));
if(velocity===0){g.run('driveBoat(0,0,0);advanceBoatMotion(2000)');assert.equal(g.run('boatMotion.spray.length'),0);}
}
assert.deepEqual(bursts[0],bursts[1]);assert.deepEqual(bursts[0],bursts[2]);
const g=game();g.run(`boating=true;state.ferryRemaining=FERRY_RIDE_DURATION;activeVessel='${vessel}';player.x=-400;player.y=900;resetBoatMotion();boatMotion.trimStep=5;driveBoat(40,1,0);advanceBoatMotion(40)`);
assert.ok(g.run('boatMotion.velocity')<1);assert.ok(g.run('boatMotion.spray.length')>0);assert.ok(g.run('boatMotion.spray.every(p=>p.reach>=180)'));
g.run('fishingActive=true;advanceBoatMotion(2000)');assert.equal(g.run('boatMotion.spray.length'),0);
}
});

test('boat spray wets the pet dragon, then he shakes off visible water and dries',()=>{
const g=game();g.run(`petDragonPosition={x:1100,y:1400};boatMotion.spray=[{x:1060,y:1400,vx:160,vy:0,vz:45,gravity:180,life:.5,age:0}];advanceBoatSpray(500)`);
assert.equal(g.run('petDragonWet.elapsed'),0);
g.run(`let waterBeads=0,shakeAngles=[];const originalWaterEllipse=ellipse;ellipse=(...a)=>{if(a[4]==='#a8e9f5'||a[4]==='#c5f4ff')waterBeads++;originalWaterEllipse(...a)};ctx.rotate=a=>shakeAngles.push(a);drawPetDragon()`);
assert.ok(g.run('waterBeads')>=9);
g.run('advancePetDragonWet(950);waterBeads=0;shakeAngles=[];drawPetDragon()');assert.ok(g.run('waterBeads')>9);assert.ok(g.run('shakeAngles.some(a=>Math.abs(a)>.01)'));
g.run('advanceBoatSpray(10)');assert.equal(g.run('petDragonWet.elapsed'),950);
g.node('#challenge').showModal();g.run('advancePetDragonWet(500)');assert.equal(g.run('petDragonWet.elapsed'),950);g.node('#challenge').close();
g.run('advanceSwimming(1850);waterBeads=0;drawPetDragon()');assert.equal(g.run('petDragonWet'),null);assert.equal(g.run('waterBeads'),0);
});

test('dragon spray hits respect world position, heading, altitude, and explorer resets',()=>{
const g=game();
g.run(`petDragonPosition={x:1100,y:1400};const dragonDrop={x:1100,y:1400,vx:0,vy:0,vz:0,gravity:180,life:.5,age:.1};sprayPetDragon([{...dragonDrop,x:1200},{...dragonDrop,y:1420},{...dragonDrop,vz:300,dragonCheckedAge:.08}])`);assert.equal(g.run('petDragonWet'),null);
g.run(`player.x=1100;player.y=1400;dragonFlight={stage:'flying',heading:Math.PI/2,altitude:30};sprayPetDragon([{...dragonDrop}])`);assert.equal(g.run('petDragonWet'),null);
g.run(`sprayPetDragon([{...dragonDrop,y:1420,vz:400}])`);assert.equal(g.run('petDragonWet.elapsed'),0);
g.run('resetPetDragon()');assert.equal(g.run('petDragonWet'),null);
g.run('petDragonWet={elapsed:900};switchAge("9-10")');assert.equal(g.run('petDragonWet'),null);
g.run('petDragonWet={elapsed:900}');g.node('#profileName').value='Dragon friend';g.run('createProfile()');assert.equal(g.run('petDragonWet'),null);
});

test('igniting each tree type preserves its original sprite geometry',()=>{
const g=game();
for(const kind of ['tree','pine','palm']){
g.run(`{
const t=[...burnableTrees.values()].find(t=>t.kind==='${kind}');
const originalRect=rect,originalEllipse=ellipse,originalPolygon=polygon,originalFlame=drawDragonFlame;
let geometry=[];rect=(...a)=>geometry.push(['rect',...a]);ellipse=(...a)=>geometry.push(['ellipse',...a]);polygon=(...a)=>geometry.push(['polygon',...a]);drawDragonFlame=()=>{};
const sprite=t.kind==='pine'?drawPineSprite:t.kind==='palm'?drawPalmSprite:drawTreeSprite;
sprite(t.x,t.y,t.scale);const before=JSON.stringify(geometry);geometry=[];
t.burnAge=0;drawBurningTree(t.x,t.y);const after=JSON.stringify(geometry);
rect=originalRect;ellipse=originalEllipse;polygon=originalPolygon;drawDragonFlame=originalFlame;
if(before!==after)throw new Error('Ignition changed ${kind} geometry');
}`);
}
});

test('burning trees use the same flame renderer as dragon breath and stop flames at ash',()=>{
const g=game();g.run('const originalFlame=drawDragonFlame;let flames=[];drawDragonFlame=(...args)=>{flames.push(args);originalFlame(...args)};petDragonFire={elapsed:200,duration:850};drawPetDragonFire()');assert.equal(g.run('flames.length'),1);
g.run('flames=[];const target=burnableTrees.values().next().value;target.burnAge=900;drawBurningTree(target.x,target.y)');assert.equal(g.run('flames.length'),4);assert.equal(g.run('flames.every(f=>f[3]===-Math.PI/2)'),true);
g.run('flames=[];target.burnAge=TREE_BURN_DURATION;drawBurningTree(target.x,target.y)');assert.equal(g.run('flames.length'),0);
});

test('sprayed volleyballers throw toward the boat and fetch their floating ball before returning to court',()=>{
const g=game();
g.run(`boating=true;state.ferryRemaining=FERRY_RIDE_DURATION;player.x=520;player.y=1600;const sprayed=ambientVolleyPlayers(0)[0];sprayVolleyballers([{x:sprayed.x,y:sprayed.y,vx:0,vy:0,vz:0,gravity:180,life:.5,age:.1}]);`);
assert.equal(g.run('volleySprayReactions.size'),1);
assert.equal(g.run('volleySprayReactions.get(0).phase'),'windup');
g.run('advanceVolleySprayReactions(600)');
assert.equal(g.run('volleySprayReactions.get(0).phase'),'throw');
assert.equal(g.run('volleySprayReactions.get(0).ball.target.x'),520);
assert.equal(g.run('volleySprayReactions.get(0).ball.target.y'),1600);
g.run('player.x=700;advanceVolleySprayReactions(2200);draw()');
assert.equal(g.run('volleySprayReactions.get(0).phase'),'fetch');
assert.equal(g.run('volleySprayReactions.get(0).ball.x'),520);
g.run(`let fetchedSwimming=false,carriedHome=false;for(let i=0;i<1000&&volleySprayReactions.size;i++){advanceVolleySprayReactions(20);const r=volleySprayReactions.get(0);if(r?.swimming)fetchedSwimming=true;if(r?.phase==='return')carriedHome=true;drawVolleySprayReactions();}`);
assert.equal(g.run('fetchedSwimming'),true);
assert.equal(g.run('carriedHome'),true);
assert.equal(g.run('volleySprayReactions.size'),0);
});

test('volleyball spray sweeps fast drops, ignores high misses, pauses and resets, and keeps busy courts unavailable',()=>{
const g=game();
g.run(`boating=true;state.ferryRemaining=FERRY_RIDE_DURATION;player.x=520;player.y=1700;const npc=ambientVolleyPlayers(0)[0];sprayVolleyballers([{x:npc.x,y:npc.y,vx:0,vy:0,vz:300,gravity:180,life:1,age:.2,volleyCheckedAge:.19}])`);
assert.equal(g.run('volleySprayReactions.size'),0);
g.run(`const volleyDrop={x:npc.x-30,y:npc.y,vx:600,vy:0,vz:0,gravity:180,life:.1,age:.1};sprayVolleyballers([volleyDrop]);advanceVolleySprayReactions(200);sprayVolleyballers([{...volleyDrop,volleyCheckedAge:0}])`);
assert.equal(g.run('volleySprayReactions.get(0).elapsed'),200);
g.node('#challenge').showModal();g.run('advanceVolleySprayReactions(1000)');assert.equal(g.run('volleySprayReactions.get(0).elapsed'),200);g.node('#challenge').close();
g.run('boating=false;player.x=npc.x;player.y=npc.y');assert.equal(g.run('nearbyVolleyballCourt()'),-1);
g.run('resetVolleyball()');assert.equal(g.run('volleySprayReactions.size'),0);assert.equal(g.run('nearbyVolleyballCourt()'),0);
g.run(`boating=true;state.ferryRemaining=FERRY_RIDE_DURATION;boatMotion.spray=[{...volleyDrop,age:0,volleyCheckedAge:0}];advanceBoatSpray(100)`);assert.equal(g.run('volleySprayReactions.size'),1);
g.run("switchAge('9-10')");assert.equal(g.run('volleySprayReactions.size'),0);
});

test('low spray draws over a low dragon and beneath a dragon flying above it, without duplicate particles',()=>{
const g=game();g.run(`petDragonPosition={x:1100,y:1400};activeVessel='fishing';boatMotion.spray=[{x:1100,y:1400,vx:0,vy:0,vz:45,gravity:180,life:.5,age:.25,trim:1,size:1}];let sprayMarks=0;const oldSprayEllipse=ellipse;ellipse=(...a)=>{if(a[4]==='#f5fffc')sprayMarks++;oldSprayEllipse(...a)};drawBoatTrimSpray(0,0,0,'fishing');`);
assert.equal(g.run('sprayMarks'),0);
g.run("drawBoatTrimSpray(0,0,0,'fishing',true)");assert.equal(g.run('sprayMarks'),1);
g.run(`dragonFlight={stage:'flying',altitude:50,heading:0};player.x=1100;player.y=1400;sprayMarks=0;drawBoatTrimSpray(0,0,0,'fishing');drawBoatTrimSpray(0,0,0,'fishing',true)`);assert.equal(g.run('sprayMarks'),1);
g.run(`dragonFlight=null;const renderOrder=[];drawPetDragon=()=>renderOrder.push('dragon');drawBoatTrimSpray=(x,y,h,v,front)=>{if(front)renderOrder.push('spray')};draw()`);
assert.ok(g.run("renderOrder.indexOf('spray')>renderOrder.indexOf('dragon')"));
});

test('beach breaks peel right to left and their visible crests match catchable waves',()=>{
const g=game();
for(const i of [0,1,2]){
const first=g.run(`beachWaveProfile(1100,${i},1000,true).front`);
const later=g.run(`beachWaveProfile(1100,${i},1400,true).front`);
assert.ok(later<first,`wave ${i} must peel left`);
assert.ok(Math.abs((first-later)-22)<.001);
g.run(`surfClock=1400`);
assert.equal(g.run(`beachWaveProfile(1100,${i},surfClock,true).y`),g.run(`surfWaveY(1100,${i})`));
const front=g.run(`beachWaveProfile(1100,${i},surfClock,true).front`);
assert.ok(g.run(`beachWaveProfile(${front},${i},surfClock,true).height`)>g.run(`beachWaveProfile(${front-160},${i},surfClock,true).height`)+12*g.run(`surfWaveSize(surfWaveDistance(${i},surfClock))`));
}
g.run('camera.y=1500;state.surfRental=false;drawBeachWaves();state.surfRental=true;surfClock=12000;drawBeachWaves()');
});

test('coastal waves mask every land polygon and render beneath islands and water occupants',()=>{
const g=game();
g.run(`const waterMask={holes:0,rule:null};ctx.moveTo=()=>waterMask.holes++;ctx.clip=rule=>waterMask.rule=rule;clipBeachWaveWater()`);
assert.equal(g.run('waterMask.holes'),g.run('islandPolys.length'));
assert.equal(g.run('waterMask.rule'),'evenodd');
g.run(`const coastOrder=[];drawBeachWaves=()=>coastOrder.push('waves');const coastPolygon=polygon;polygon=(...args)=>{coastOrder.push('land');coastPolygon(...args)};drawLochDragon=()=>coastOrder.push('swimmer');drawMainlandBeach=()=>coastOrder.push('beach');draw()`);
assert.equal(g.run("coastOrder.filter(x=>x==='waves').length"),1);
for(const layer of ['land','swimmer','beach'])assert.ok(g.run(`coastOrder.indexOf('waves')<coastOrder.indexOf('${layer}')`));
});

test('beach shore wash advances onto sand and recedes continuously after the wave wraps',()=>{
const g=game();
assert.equal(g.run('beachWaveWashProfile(150)'),null);
assert.equal(g.run('beachWaveWashProfile(60).alpha'),0);
assert.ok(g.run('beachWaveWashProfile(30).edge')>0,'the spent wave crosses onto sand');
assert.equal(g.run('beachWaveWashProfile(11).edge'),18);
assert.equal(g.run('JSON.stringify(beachWaveWashProfile(11))'),g.run('JSON.stringify(beachWaveWashProfile(335))'),'the wave wrap preserves the wash');
assert.ok(g.run('beachWaveWashProfile(315).edge')<18,'backwash retreats');
assert.equal(g.run('beachWaveWashProfile(300).alpha'),0);
g.run(`camera.x=820;camera.y=1500;const washOrder=[];
polygon=()=>washOrder.push('sand');drawBeachShoreWash=()=>washOrder.push('wash');
drawSunbatherTowel=()=>washOrder.push('towel');drawMainlandBeach()`);
assert.ok(g.run("washOrder.indexOf('wash')>washOrder.indexOf('sand')"));
assert.ok(g.run("washOrder.indexOf('towel')>washOrder.indexOf('wash')"));
});

test('whitewater alone covers swimmers and duck-diving boards, with nose-first entry and resurfacing',()=>{
const g=surfGame();
g.run(`surfClock=1000;const lipX=beachWaveProfile(1100,1,surfClock,true).front;
const waveX=lipX+50,foam=beachWaveWhitewaterProfile(waveX,1,surfClock);
const foamY=t=>foam.y+foam.bottom-t*(foam.bottom-foam.top)`);
const sample=t=>g.run(`beachWaveSubmersion(waveX,foamY(${t}))`);
assert.equal(sample(-.1),null,'visible before reaching the foam');
assert.equal(sample(.1).stage,'entering');
assert.ok(sample(.1).edge>sample(.3).edge,'entry hides the positive-X nose before the tail');
assert.equal(sample(.5).stage,'under');
assert.equal(sample(.7).stage,'emerging');
assert.ok(sample(.7).edge>sample(.9).edge,'resurfacing reveals the positive-X nose before the tail');
assert.equal(sample(1.1),null,'visible after leaving the foam');
assert.equal(g.run('beachWaveSubmersion(lipX-40,beachWaveSurfaceY(lipX-40,1,surfClock))'),null,'unbroken face ahead of the lip never hides the character');
g.run(`player.x=waveX;player.y=foamY(.5);let waveClips=[],foregroundFoam=0;
ctx.rect=(...args)=>waveClips.push(args);drawBeachWaveWhitewater=()=>foregroundFoam++;
drawSurfingWorld()`);
assert.equal(g.run('waveClips.some(r=>r.every(v=>v===0))'),true);
assert.ok(g.run('foregroundFoam')>0,'whitewater renders over the board at the transition');
g.run(`surfSession=null;swimming=true;swimMotion.effort=1;waveClips=[];foregroundFoam=0;swimmerArt()`);
assert.equal(g.run('waveClips.some(r=>r.every(v=>v===0))'),true);
assert.ok(g.run('foregroundFoam')>0,'whitewater renders over the swimmer at the transition');
g.run('waveClips=[];drawSwimmingCharacter(player.x,player.y-400)');
assert.equal(g.run('waveClips.length'),0,'open-water swimmers stay visible away from the beach break');
g.run('swimming=false;surfSession={phase:"paddling",paused:true,paddleHeading:0};const beforeDive=JSON.stringify(surfSession);drawSurfingWorld();drawSurfingWorld()');
assert.equal(g.run('JSON.stringify(surfSession)'),g.run('beforeDive'),'rendering never advances a paused dive');
});

test('surf up and down carve across the face while a centered camera scrolls water right',()=>{
const up=surfGame(),down=surfGame();
for(const [g,key] of [[up,'up'],[down,'down']])g.run(`setSurfTestRide();surfSession.y=.5;surfSession.angle=Math.PI;keys.add('${key}');advanceSurfing(600)`);
assert.ok(up.run('surfSession.y')<.45);assert.ok(down.run('surfSession.y')>.55);
assert.ok(up.run('surfSession.speed')>down.run('surfSession.speed'));
for(const g of [up,down]){
assert.equal(g.run('surfSession.phase'),'riding');assert.ok(g.run('surfSession.scroll')>20);
assert.ok(Math.abs(g.run('surfRideView().riderX')-224)<11);
assert.equal(g.node('#surfUp').hidden,false);assert.equal(g.node('#surfDown').hidden,false);
}
const g=surfGame();g.run(`setSurfTestRide();surfSession.angle=Math.PI;const glints=[];const scrollRect=rect;rect=(x,y,w,h,color)=>{if(color==='#77cbc5')glints.push(x);scrollRect(x,y,w,h,color)};drawSurfWaveFace();const glintStart=glints[0];glints.length=0;advanceSurfing(200);drawSurfWaveFace()`);
assert.ok(g.run('glints[0]')>g.run('glintStart'));
const scroll=g.run('surfSession.scroll');g.run('draw();draw()');assert.equal(g.run('surfSession.scroll'),scroll);
g.run('surfSession.paused=true;advanceSurfing(1000)');assert.equal(g.run('surfSession.scroll'),scroll);
});

test('surf tube riding stays alive at unlimited depth and fails at the roof or trough',()=>{
for(const size of [.48,.7,1]){
const g=surfGame();g.run(`setSurfTestRide();surfSession.waveSize=${size};surfSession.x=.98;surfSession.y=.4;surfSession.angle=Math.PI;surfSession.speed=.7;updateSurfUI()`);
assert.equal(g.run('surfBarrelState().hidden'),true);assert.equal(g.run('surfBarrelState().overrun'),false);assert.match(g.node('#surfLine').textContent,/Tube Ride!/);
g.run('advanceSurfing(100);drawSurfGame()');assert.equal(g.run('surfSession.phase'),'riding');assert.ok(g.run('surfSession.score')>0);
g.run('advanceSurfing(1000)');assert.equal(g.run('surfSession.phase'),'riding');assert.equal(g.run('surfBarrelState().hidden'),false,'high pace brings rider out of curtain');
g.run('surfSession.x=1.1;advanceSurfing(16)');assert.equal(g.run('surfSession.phase'),'riding');
for(const x of [1.5,3]){g.run(`surfSession.x=${x};surfSession.y=.4;advanceSurfing(1000)`);assert.equal(g.run('surfSession.phase'),'riding');assert.equal(g.run('surfBarrelState().lineMultiplier'),50);}
g.run('surfSession.y=.1;advanceSurfing(16)');assert.equal(g.run('surfSession.phase'),'wipeout');assert.match(g.run('surfSession.message'),/tube roof/);
g.run("setSurfTestRide();surfSession.x=3;surfSession.y=.95;advanceSurfing(16)");assert.equal(g.run('surfSession.phase'),'wipeout');assert.match(g.run('surfSession.message'),/Too low/);
}
});
test('surf faster curl gains on medium-speed coasting while a fast line opens a gap',()=>{
const slow=surfGame(),fast=surfGame();
for(const [g,speed] of [[slow,.5],[fast,.75]])g.run(`setSurfTestRide();surfSession.x=.6;surfSession.y=.5;surfSession.angle=Math.PI;surfSession.speed=${speed};var startingGap=surfRideView().breakX-surfRideView().riderX;advanceSurfing(1000)`);
assert.equal(slow.run('surfSession.phase'),'riding');assert.equal(fast.run('surfSession.phase'),'riding');
assert.ok(slow.run('surfRideView().breakX-surfRideView().riderX')<slow.run('startingGap'),'moderate coasting no longer outruns the curl');
assert.ok(fast.run('surfRideView().breakX-surfRideView().riderX')>fast.run('startingGap'),'speed still lets the rider escape');
slow.run("for(let t=0;t<12000&&surfSession.phase==='riding';t+=16)advanceSurfing(16)");
assert.equal(slow.run('surfSession.phase'),'riding');assert.equal(slow.run('surfBarrelState().hidden'),true);
});
test('surf high lines gain speed and pull ahead of the curl while low lines lose ground',()=>{
const high=surfGame(),low=surfGame();
for(const [g,y] of [[high,.2],[low,.75]])g.run(`setSurfTestRide();surfSession.x=.8;surfSession.y=${y};surfSession.speed=.55;surfSession.angle=Math.PI;var lineGap=surfRideView().breakX-surfRideView().riderX;advanceSurfing(1800)`);
assert.equal(high.run('surfSession.phase'),'riding');assert.equal(low.run('surfSession.phase'),'riding');
assert.ok(high.run('surfSession.speed')>low.run('surfSession.speed')+.15);
assert.ok(high.run('surfRideView().breakX-surfRideView().riderX')>high.run('lineGap'));
assert.ok(low.run('surfRideView().breakX-surfRideView().riderX')<low.run('lineGap'));
});
test('surf covered rider renders a very faint silhouette while the opening remains clear',()=>{
const g=surfGame();g.run(`setSurfTestRide();surfSession.x=2;surfSession.y=.4;var silhouettePasses=[],silhouetteAlpha=[];ctx.globalAlpha=1;ctx.save=()=>silhouetteAlpha.push(ctx.globalAlpha);ctx.restore=()=>{ctx.globalAlpha=silhouetteAlpha.pop()};drawSurfTubeOccupant(()=>silhouettePasses.push(ctx.globalAlpha),false,true)`);
assert.deepEqual(Array.from(g.run('silhouettePasses')),[.08,1]);assert.equal(g.run('ctx.globalAlpha'),1);
g.run('surfSession.x=.3;silhouettePasses=[];drawSurfTubeOccupant(()=>silhouettePasses.push(ctx.globalAlpha),false,true)');assert.deepEqual(Array.from(g.run('silhouettePasses')),[1]);
});
test('surf tube curtain clips submerged occupants, with matching opening positions at every wave size',()=>{
const g=surfGame();
for(const size of [.48,.7,1]){
g.run(`setSurfTestRide();surfSession.waveSize=${size};surfSession.x=.98;surfSession.y=.4;var tubeWave=surfRideView(),tubeCrest=surfFaceCrest(tubeWave.riderX,tubeWave),tubeScreenY=279-(279-(tubeCrest+.4*(279-tubeCrest)))*${size};var tubeClips=0;ctx.clip=()=>{tubeClips++};drawSurfTubeOccupant(()=>{})`);
assert.equal(g.run('tubeClips'),1);assert.ok(g.run('Math.abs(surfTubeOpening(tubeScreenY,tubeWave)-(surfBarrelState().edge-9))<1e-8'));
g.run(`surfSession.phase='airborne';tubeClips=0;drawSurfTubeOccupant(()=>{})`);assert.equal(g.run('tubeClips'),0);
}
});

test('breaking whitewater chases from the right when slow and recedes when the surfer gains speed',()=>{
const slow=surfGame(),fast=surfGame();
for(const [g,speed] of [[slow,.14],[fast,.68]]){
g.run(`setSurfTestRide();surfSession.angle=Math.PI;surfSession.speed=${speed};const beforeChase=surfRideView();advanceSurfing(500)`);
assert.ok(Math.abs(g.run('surfRideView().riderX-beforeChase.riderX'))<5);
}
assert.ok(slow.run('surfRideView().breakX')<slow.run('beforeChase.breakX'));
assert.ok(fast.run('surfRideView().breakX')>fast.run('beforeChase.breakX'));
slow.run("surfSession.x=1.08;advanceSurfing(16)");assert.equal(slow.run('surfSession.phase'),'riding');assert.equal(slow.run('surfBarrelState().hidden'),true);
});

test('pumping keeps the lip behind the surfer while coasting enters the tube and crest-holding wipes out',()=>{
const pumped=surfGame(),coast=surfGame();
for(const g of [pumped,coast])g.run(`setSurfTestRide();surfSession.angle=Math.PI;surfSession.y=.45`);
pumped.run(`let pumpKey='down';for(let t=0;t<12000&&surfSession.phase==='riding';t+=40){if(surfSession.y>.66)pumpKey='up';if(surfSession.y<.22)pumpKey='down';keys.clear();if(t%240!==0)keys.add(pumpKey);advanceSurfing(40)}`);
assert.equal(pumped.run('surfSession.phase'),'riding');assert.ok(pumped.run('surfSession.speed')>.65);
coast.run(`for(let t=0;t<12000&&surfSession.phase==='riding';t+=40)advanceSurfing(40)`);
assert.equal(coast.run('surfSession.phase'),'riding');assert.equal(coast.run('surfBarrelState().hidden'),true);
const crest=surfGame();crest.run(`setSurfTestRide();surfSession.angle=Math.PI+.72;surfSession.y=.012;surfSession.speed=.5;keys.add('up');advanceSurfing(400)`);
assert.equal(crest.run('surfSession.phase'),'wipeout');assert.match(crest.run('surfSession.message'),/tail clears the lip/);
});

test('surf crest escape follows the tail, while a timely downward turn or jump saves the rider',()=>{
for(const size of [.48,.7,1]){
const g=surfGame();g.run(`setSurfTestRide();surfSession.waveSize=${size};surfSession.y=.012;surfSession.angle=Math.PI*1.5;surfSession.speed=.6;advanceSurfing(16)`);
assert.equal(g.run('surfSession.phase'),'riding','nose may cross crest before tail');
assert.ok(g.run('surfSession.y<.012'));
g.run(`surfSession.paused=true`);const before=g.run('surfSession.y');g.run('advanceSurfing(500)');assert.equal(g.run('surfSession.y'),before);
g.run(`surfSession.paused=false;for(let t=0;t<800&&surfSession.phase==='riding';t+=16)advanceSurfing(16)`);
assert.equal(g.run('surfSession.phase'),'wipeout');assert.equal(g.run('surfTailClearOfLip()'),true);assert.match(g.run('surfSession.message'),/tail clears the lip/);
const turn=surfGame();turn.run(`setSurfTestRide();surfSession.waveSize=${size};surfSession.y=.14;surfSession.angle=Math.PI+.4;surfSession.speed=.6;keys.add('down');advanceSurfing(300)`);
assert.equal(turn.run('surfSession.phase'),'riding');assert.ok(turn.run('Math.sin(surfSession.angle)>0'));assert.equal(turn.run('surfTailClearOfLip()'),false);
const jump=surfGame();jump.run(`setSurfTestRide();surfSession.waveSize=${size};surfSession.y=.012;surfSession.angle=Math.PI*1.5;surfSession.speed=.6;requestSurfAir();advanceSurfing(200)`);
assert.equal(jump.run('surfSession.phase'),'airborne');assert.equal(jump.run('surfSession.wipeouts'),0);
}
});

test('Space launches only on a fresh press at the crest and touch controls request the same air',()=>{
const g=surfGame();g.run(`setSurfTestRide();surfSession.speed=.7;surfSession.angle=Math.PI+.6;surfSession.y=.5;const airEvent={repeat:false,preventDefault(){}};handleSurfKey(' ',airEvent);advanceSurfing(300);surfSession.y=.025;handleSurfKey(' ',{...airEvent,repeat:true});advanceSurfing(16)`);
assert.equal(g.run('surfSession.phase'),'riding');
g.run(`handleSurfKey(' ',airEvent);advanceSurfing(16)`);assert.equal(g.run('surfSession.phase'),'airborne');
const touch=surfGame();touch.run(`setSurfTestRide();surfSession.speed=.7;surfSession.angle=Math.PI+.6;surfSession.y=.025;updateSurfUI()`);
assert.equal(touch.node('#surfAction').textContent,'Air - Tap Space, Snap - Hold Space');
touch.node('#surfAction').onpointerdown({preventDefault(){},pointerId:1});touch.run('advanceSurfing(16)');assert.equal(touch.run('surfSession.phase'),'airborne');
const snapshot=touch.run('JSON.stringify([surfSession.airHeight,surfSession.airSpin,surfSession.scroll,surfSession.remaining])');
touch.run(`surfSession.paused=true;keys.add('right');advanceSurfing(1000)`);assert.equal(touch.run('JSON.stringify([surfSession.airHeight,surfSession.airSpin,surfSession.scroll,surfSession.remaining])'),snapshot);
});

test('surf curling-lip proximity boosts every snap tier using its starting position',()=>{
for(const [quality,base] of [[.2,150],[.6,300],[1,500]]){
const rewards=[];
for(const x of [.3,.6,.78]){
const g=surfGame();g.run(`setSurfTestRide();surfSession.x=${x};surfSession.y=.02;surfSession.angle=2.6;startSurfSnap(surfSession,1);surfSession.snap.quality=${quality};surfSession.snap.age=604;surfSession.snap.delta=0`);
const multiplier=g.run('surfSession.snap.lipMultiplier');
g.run('surfSession.x=.3;surfClock+=300;advanceSurfing(16)');
assert.equal(g.run('surfSession.phase'),'riding');
const reward=g.run('surfSession.lastTrick.bonus');rewards.push(reward);
assert.equal(reward,Math.round(base*multiplier));
assert.equal(g.node('#surfTrickBonus').textContent,`+${reward} POINTS`);
}
assert.equal(rewards[0],base);assert.ok(rewards[1]>rewards[0]);assert.ok(rewards[2]>rewards[1]);assert.ok(rewards[2]<=base*2);
}
});
test('surf curling-lip proximity boosts basic and spinning airs using launch position',()=>{
for(const [spins,base] of [[0,300],[1,900],[2,1800],[3,3000],[4,4500]]){
const rewards=[];
for(const x of [.3,.6,.78]){
const g=surfGame();g.run(`setSurfTestRide();surfSession.x=${x};surfSession.y=.025;surfSession.angle=Math.PI+.6;surfSession.speed=.7;requestSurfAir();advanceSurfing(16)`);
assert.equal(g.run('surfSession.phase'),'airborne');const multiplier=g.run('surfSession.airLipMultiplier');
g.run(`surfSession.x=.3;surfClock+=300;surfSession.airHeight=.001;surfSession.airV=-1;surfSession.airTurns=${spins}*Math.PI*2;surfSession.airSpin=-Math.PI/2;advanceSurfing(16)`);
assert.equal(g.run('surfSession.phase'),'riding');const reward=g.run('surfSession.lastTrick.bonus');rewards.push(reward);
assert.equal(reward,Math.round(base*multiplier));assert.equal(g.node('#surfTrickBonus').textContent,`+${reward} POINTS`);
g.run('prepareSurfTakeoff(.7)');assert.equal(g.run('surfSession.airLipMultiplier'),1);
}
assert.equal(rewards[0],base);assert.ok(rewards[1]>rewards[0]);assert.ok(rewards[2]>rewards[1]);assert.ok(rewards[2]<=base*2);
}
const failed=surfGame();failed.run(`setSurfTestRide();surfSession.x=.78;surfSession.y=.025;surfSession.angle=Math.PI+.6;surfSession.speed=.7;requestSurfAir();advanceSurfing(16);const beforeFailedAir=surfSession.score;surfSession.airHeight=.001;surfSession.airV=-1;surfSession.airSpin=Math.PI;advanceSurfing(16)`);
assert.equal(failed.run('surfSession.phase'),'wipeout');assert.equal(failed.run('surfSession.score'),failed.run('beforeFailedAir'));
});
test('surf lip multiplier peaks at the curling crown and falls on either side at every wave size',()=>{
const g=surfGame();
for(const size of [.48,.7,1]){
g.run(`setSurfTestRide();surfSession.waveSize=${size};surfSession.x=.86+(surfLipCrown(surfRideView())-surfRideView().breakX)/440`);
assert.ok(Math.abs(g.run('surfTrickLipMultiplier()')-2)<1e-9);
g.run('surfSession.x-=90/440');assert.ok(Math.abs(g.run('surfTrickLipMultiplier()')-1.5)<1e-9);
g.run('surfSession.x+=180/440');assert.ok(Math.abs(g.run('surfTrickLipMultiplier()')-1.5)<1e-9);
}
});
test('surf completed aerials name single through quad forward alleyoops and backward backflips',()=>{
for(const [count,label,bonus] of [[1,'Single',900],[2,'Double',1800],[3,'Triple',3000],[4,'Quad',4500]])for(const [direction,name] of [[-1,'Alleyoop'],[1,'Backflip']]){
const g=surfGame();g.run(`setSurfTestRide();surfSession.phase='airborne';surfSession.airHeight=.001;surfSession.airV=-1;surfSession.airTurns=${count}*Math.PI*2;surfSession.airSpinPeak=${direction}*${count}*Math.PI*2;surfSession.airSpin=-Math.PI/2;advanceSurfing(16)`);
assert.equal(g.run('surfSession.phase'),'riding');assert.equal(g.run('surfSession.lastTrick.name'),`${label} ${name}`);assert.equal(g.node('#surfTrick').textContent,`${label} ${name}`);assert.equal(g.node('#surfTrickBonus').textContent,`+${bonus} POINTS`);
}
});
test('surf HUD records named snap tiers, tube entries, points, and heat without duplicating tube tricks each frame',()=>{
for(const [quality,name,bonus] of [[.2,'Hack',150],[.6,'Slash',300],[1,'Layback Snap',500]]){
const g=surfGame();g.run(`setSurfTestRide();surfSession.snap={age:604,quality:${quality},startAngle:2.6,delta:0};advanceSurfing(16)`);assert.equal(g.run('surfSession.lastTrick.name'),name);assert.equal(g.node('#surfTrick').textContent,name);assert.equal(g.run('surfSession.lastTrick.bonus'),bonus);assert.equal(g.node('#surfTrickBonus').textContent,`+${bonus} POINTS`);
}
const g=surfGame();g.run(`setSurfTestRide();surfSession.x=.80;surfSession.y=.4;surfSession.speed=.55;surfSession.angle=Math.PI;advanceSurfing(64)`);
assert.equal(g.run(`surfSession.tricks.filter(trick=>trick.name==='Tube Ride!').length`),1);assert.equal(g.node('#surfTrick').textContent,'Tube Ride!');
g.run(`surfSession.score=12345;surfSession.remaining=65000;recordSurfTrick(surfSession,'Single Alleyoop',500);recordSurfTrick(surfSession,'Slash',90);updateSurfUI()`);
assert.equal(g.node('#surfScore').textContent,'12,345');assert.equal(g.node('#surfTime').textContent,'1:05');assert.equal(g.node('#surfTrick').textContent,'Slash');assert.match(g.node('#surfTrickHistory').textContent,/Single Alleyoop.*Tube Ride!/);
g.run('prepareSurfPaddleOut();updateSurfUI()');assert.equal(g.node('#surfTrick').textContent,'Slash','tricks remain through the heat');
});

test('surf aerials keep the curling lip moving forward and never reverse ocean scroll',()=>{
for(const speed of [.3,.65,.85])for(const spin of ['left','right']){
const g=surfGame();g.run(`setSurfTestRide();surfSession.phase='airborne';surfSession.y=.012;surfSession.airHeight=3;surfSession.airV=0;surfSession.speed=${speed};surfSession.angle=Math.PI+.5;keys.add('${spin}')`);
let edge=g.run('surfRideView().breakX'),crown=g.run('surfLipCrown(surfRideView())'),scroll=g.run('surfSession.scroll');
for(let i=0;i<12;i++){
g.run('advanceSurfing(40)');assert.equal(g.run('surfSession.phase'),'airborne');
const nextEdge=g.run('surfRideView().breakX'),nextCrown=g.run('surfLipCrown(surfRideView())'),nextScroll=g.run('surfSession.scroll');
assert.ok(nextEdge<edge,'curl keeps peeling left');assert.ok(nextCrown<crown,'visible crown cannot retreat');assert.ok(nextScroll>scroll,'ocean keeps flowing right');edge=nextEdge;crown=nextCrown;scroll=nextScroll;
}
const snapshot=g.run('JSON.stringify([surfSession.x,surfSession.scroll,surfSession.airSpin])');g.run('surfSession.paused=true;advanceSurfing(300)');assert.equal(g.run('JSON.stringify([surfSession.x,surfSession.scroll,surfSession.airSpin])'),snapshot);
}
});

test('air landings accept every downward nose angle, exclude horizontal and upward, and boost speed',()=>{
for(const degrees of [.01,30,45,89.9,90,90.01,110,135,170,179.9])for(const turns of [-2,0,2]){
const g=surfGame();g.run(`surfSession.phase='airborne';surfSession.y=.012;surfSession.x=.43;surfSession.speed=.5;surfSession.angle=0;surfSession.airSpin=${degrees}*Math.PI/180-Math.PI+${turns}*Math.PI*2;surfSession.airHeight=.001;surfSession.airV=-1;advanceSurfing(16)`);
assert.equal(g.run('surfSession.phase'),'riding',`landing ${degrees}° with ${turns} extra turns`);
assert.equal(g.run('surfSession.wipeouts'),0);assert.ok(g.run('surfSession.score')>=100);assert.ok(g.run('surfSession.speed')>.61);
assert.ok(Math.abs(g.run('surfSession.angle')-degrees*Math.PI/180)<1e-6);assert.match(g.run('surfSession.message'),/SPEED BOOST/);
}
for(const degrees of [0,180,180.1,225,270,359.9]){
const g=surfGame();g.run(`surfSession.phase='airborne';surfSession.y=.012;surfSession.speed=.5;surfSession.angle=Math.PI-.5;surfSession.airSpin=${degrees}*Math.PI/180-Math.PI;surfSession.airHeight=.001;surfSession.airV=-1;advanceSurfing(16)`);
assert.equal(g.run('surfSession.phase'),'wipeout',`invalid landing ${degrees}°`);
assert.equal(g.run('surfSession.score'),0);
}
});

test('map swells shrink toward shore and each riding size keeps its barrel collision aligned',()=>{
const g=surfGame();
const heights=[70,150,280].map(distance=>g.run(`beachWaveProfile(beachWaveProfile(1100,0,(335-${distance})/.026,true).front,0,(335-${distance})/.026,true).height`));
assert.ok(heights[0]<heights[1]);assert.ok(heights[1]<heights[2]);
for(const size of [.48,.7,1]){
g.run(`setSurfTestRide();surfSession.waveSize=${size};surfSession.x=.80;surfSession.y=.4;draw()`);
assert.equal(g.run('surfBarrelState().half'),true);
g.run('surfSession.x=1.08');assert.equal(g.run('surfBarrelState().overrun'),true);
}
});

test('surf bottom turns bank toward the face and foreshorten the visible torso in either travel direction',()=>{
for(const [heading,turn] of [[Math.PI,1],[0,-1]]){
const g=surfGame();g.run(`setSurfTestRide();surfSession.angle=${heading};surfSession.carveLean=0;var neutralTorso=surfRiderPose().torsoHeight;surfSession.carveLean=${turn}`);
assert.equal(g.run('surfRiderPose().intoFace'),1);
assert.ok(g.run('surfRiderPose().torsoHeight')<g.run('neutralTorso')*.4);
assert.ok(Math.abs(g.run('surfRiderPose().lean'))<1e-8,'faceward bank is not an arbitrary sideways shift');
g.run('var leaningShirt=[];const bankPolygon=polygon;polygon=(points,color,...rest)=>{if(color===characterColors().shirt)leaningShirt=points;bankPolygon(points,color,...rest)};drawSurfRider(224,140,surfBoardRotation())');
assert.ok(g.run('surfRiderPose().faceLeanOffset')>5,'away lean projects up the wave');
assert.ok(g.run('leaningShirt[0][1]-(leaningShirt[2][1]+leaningShirt[3][1])/2')>8,'shoulders move away/up the face rather than down toward the camera');
assert.ok(Math.abs(g.run('leaningShirt[2][0]-leaningShirt[3][0]'))<6,'far shoulders narrow with perspective');
g.run(`surfSession.carveLean=${-turn}`);assert.equal(g.run('surfRiderPose().intoFace'),0);assert.equal(g.run('surfRiderPose().torsoHeight'),8);
}
});
test('surf side turns lean into the inside rail and banking leaves air, wipeout, and snap poses intact',()=>{
const g=surfGame();g.run('setSurfTestRide();surfSession.angle=Math.PI/2;surfSession.carveLean=1');assert.equal(g.run('surfRiderPose().lean'),7);
g.run('surfSession.carveLean=-1');assert.equal(g.run('surfRiderPose().lean'),-7);
for(const phase of ['airborne','wipeout','popup']){g.run(`surfSession.phase='${phase}';surfSession.angle=Math.PI;surfSession.carveLean=1`);assert.equal(g.run('surfRiderPose().intoFace'),0);}
g.run("surfSession.phase='riding';surfSession.snap={age:310,quality:1}");assert.equal(g.run('surfRiderPose().intoFace'),0);
});
test('surf arms lead the nose into both turns before the rail lean catches up',()=>{
for(const [key,sign] of [['right',1],['left',-1]])for(const heading of [Math.PI-.5,Math.PI,Math.PI+.5]){
const g=surfGame();g.run(`setSurfTestRide();surfSession.x=.3;surfSession.y=.4;surfSession.angle=${heading};surfSession.speed=.65;keys.add('${key}');advanceSurfing(64)`);
assert.equal(g.run('surfSession.phase'),'riding');assert.ok(g.run('surfRiderPose().armLead')*sign>0);
assert.ok(g.run('Math.abs(surfSession.armTurn)>Math.abs(surfSession.carveLean)'));
assert.ok(g.run('Math.abs(surfRiderPose().armLead)')<=.8);
assert.ok(Math.abs(g.run('surfRiderPose().armHeading-(Math.PI-surfSession.angle)+surfRiderPose().armLead'))<1e-9);
g.run('drawSurfRider(224,140,surfBoardRotation())');
}
});
test('surf arm balance settles on release, reverses smoothly, and freezes with pause and dialogs',()=>{
const g=surfGame();g.run(`setSurfTestRide();surfSession.x=.3;surfSession.y=.4;surfSession.angle=Math.PI;keys.add('right');advanceSurfing(160)`);
const before=g.run('surfSession.armTurn');assert.ok(before>0);
g.run('keys.clear();advanceSurfing(160)');assert.ok(g.run('surfSession.armTurn')<before*.15);
g.run("keys.add('left');advanceSurfing(160)");assert.ok(g.run('surfSession.armTurn')<0);
const pose=g.run('JSON.stringify(surfRiderPose())');g.run('surfSession.paused=true;advanceSurfing(300);drawSurfGame();drawSurfGame()');assert.equal(g.run('JSON.stringify(surfRiderPose())'),pose);
g.run('surfSession.paused=false');g.node('#challenge').showModal();g.run('advanceSurfing(300)');assert.equal(g.run('JSON.stringify(surfRiderPose())'),pose);g.node('#challenge').close();
g.run('prepareSurfTakeoff(.7)');assert.equal(g.run('surfSession.armTurn'),0);
g.run('surfSession.armTurn=1;prepareSurfPaddleOut(true)');assert.equal(g.run('surfSession.armTurn'),0);
});
test('surf held aerial grabs tuck the pose and boost spins in either direction without changing flight',()=>{
for(const key of ['left','right']){
const normal=surfGame(),grab=surfGame();
for(const g of [normal,grab])g.run(`setSurfTestRide();Object.assign(surfSession,{phase:'airborne',x:.2,y:.012,airHeight:3,airV:0,airSpin:0,speed:.75});keys.add('${key}')`);
grab.run("handleSurfKey(' ',{repeat:false,preventDefault(){}})");
for(const g of [normal,grab])g.run('advanceSurfing(500)');
assert.ok(grab.run('Math.abs(surfSession.airSpin)')>normal.run('Math.abs(surfSession.airSpin)')*1.45);
assert.equal(grab.run('surfSession.airHeight'),normal.run('surfSession.airHeight'));assert.equal(grab.run('surfSession.x'),normal.run('surfSession.x'));
assert.ok(grab.run('surfRiderPose().crouch')>normal.run('surfRiderPose().crouch')+6);
assert.ok(grab.run('surfRiderPose().torsoHeight')<normal.run('surfRiderPose().torsoHeight'));
grab.run('surfSession.airGrab=1;var gripPose=surfRiderPose(),gripArms=surfRiderArms(gripPose,0,-10)');
for(const [i,side] of [[0,-1],[1,1]]){
assert.equal(grab.run(`gripArms[${i}].hand[0]`),side*1.5);assert.ok(Math.abs(grab.run(`gripArms[${i}].hand[1]-(${side})*gripPose.grabRail`))<1e-9);
}
grab.run("keys.delete(' ');advanceSurfing(250)");assert.ok(grab.run('surfSession.airGrab')<.07);
grab.run('prepareSurfTakeoff(.7)');assert.equal(grab.run('surfSession.airGrab'),0);
}
});
test('surf grab must be released before landing for both keyboard and touch',()=>{
for(const touch of [false,true])for(const release of [false,true]){
const g=surfGame();g.run("setSurfTestRide();Object.assign(surfSession,{phase:'airborne',x:.3,y:.012,airHeight:.001,airV:-1,airSpin:-Math.PI/2,airGrab:1})");
if(touch)g.node('#surfAction').onpointerdown({preventDefault(){},pointerId:1});else g.run("handleSurfKey(' ',{repeat:false,preventDefault(){}})");
if(release){if(touch)g.node('#surfAction').onpointerup();else g.run("keys.delete(' ')");}
g.run('advanceSurfing(16)');assert.equal(g.run('surfSession.phase'),release?'riding':'wipeout');assert.equal(g.run('surfSession.airGrab'),0);
if(release)assert.equal(g.run('surfSession.lastTrick.name'),'Air');else{assert.equal(g.run('surfSession.score'),0);assert.match(g.run('surfSession.message'),/Release Space/);}
}
});
test('surf aerial grab animation freezes for pause and dialogs',()=>{
const g=surfGame();g.run("setSurfTestRide();Object.assign(surfSession,{phase:'airborne',x:.2,y:.012,airHeight:3,airV:0,airSpin:0,speed:.75});keys.add(' ');keys.add('right');advanceSurfing(120);surfSession.paused=true");
const before=g.run('JSON.stringify([surfSession.airGrab,surfSession.airSpin,surfRiderPose()])');g.run('advanceSurfing(400);drawSurfGame();drawSurfGame()');assert.equal(g.run('JSON.stringify([surfSession.airGrab,surfSession.airSpin,surfRiderPose()])'),before);
g.run('surfSession.paused=false');g.node('#challenge').showModal();g.run('advanceSurfing(400)');assert.equal(g.run('JSON.stringify([surfSession.airGrab,surfSession.airSpin,surfRiderPose()])'),before);g.node('#challenge').close();
});
test('surf aerial spins rotate the torso and planted feet together around the board',()=>{
const g=surfGame();g.run(`setSurfTestRide();surfSession.phase='airborne';surfSession.airSpin=0;
var spinMatrix=[1,0,0,1,0,0],spinStack=[],spinShirt=[],spinFeet=[];
const spinMultiply=(a,b,c,d,e,f)=>{const [A,B,C,D,E,F]=spinMatrix;spinMatrix=[A*a+C*b,B*a+D*b,A*c+C*d,B*c+D*d,A*e+C*f+E,B*e+D*f+F];};
const spinPoint=(x,y)=>[spinMatrix[0]*x+spinMatrix[2]*y+spinMatrix[4],spinMatrix[1]*x+spinMatrix[3]*y+spinMatrix[5]];
ctx.save=()=>spinStack.push(spinMatrix.slice());ctx.restore=()=>{spinMatrix=spinStack.pop()};
ctx.translate=(x,y)=>spinMultiply(1,0,0,1,x,y);ctx.scale=(x,y)=>spinMultiply(x,0,0,y,0,0);ctx.rotate=a=>spinMultiply(Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0);ctx.transform=spinMultiply;
const spinPolygon=polygon,spinEllipse=ellipse;
polygon=(points,color,...rest)=>{if(color===characterColors().shirt)spinShirt=points.map(p=>spinPoint(...p));spinPolygon(points,color,...rest)};
ellipse=(x,y,rx,ry,color)=>{if(color==='#f2c992'&&spinFeet.length<2)spinFeet.push(spinPoint(x,y));spinEllipse(x,y,rx,ry,color)};
drawSurfRider(0,0,surfBoardRotation());var neutralSpinPoints=[...spinShirt,...spinFeet];`);
const neutral=g.run('neutralSpinPoints');
for(const angle of [Math.PI/4,Math.PI/2,Math.PI,Math.PI*1.5,Math.PI*2,-Math.PI/2,-Math.PI]){
g.run(`surfSession.airSpin=${angle};spinFeet=[];drawSurfRider(0,0,surfBoardRotation())`);
const points=g.run('[...spinShirt,...spinFeet]');
for(let i=0;i<neutral.length;i++){
const [x,y]=neutral[i];assert.ok(Math.abs(points[i][0]-(x*Math.cos(angle)-y*Math.sin(angle)))<1e-8);assert.ok(Math.abs(points[i][1]-(x*Math.sin(angle)+y*Math.cos(angle)))<1e-8);
}
assert.equal(g.run('spinStack.length'),0);assert.equal(g.run('surfSession.airSpin'),angle,'drawing does not advance rotation');
}
});
test('surf articulated arms stay attached and render through cutbacks, airs, and wipeouts',()=>{
const g=surfGame();
for(const phase of ['riding','airborne','wipeout'])for(const heading of [0,Math.PI/2,Math.PI,Math.PI*1.5,Math.PI*2]){
g.run(`setSurfTestRide();surfSession.phase='${phase}';surfSession.angle=${heading};surfSession.armTurn=.85;surfSession.carveStrength=.7;var armPose=surfRiderPose();var armPoints=surfRiderArms(armPose,0,0);drawSurfRider(224,140,surfBoardRotation())`);
assert.ok(g.run('armPoints.every(a=>[...a.shoulder,...a.elbow,...a.hand].every(Number.isFinite))'));
assert.ok(g.run('armPoints.every(a=>Math.hypot(a.hand[0]-a.elbow[0],a.hand[1]-a.elbow[1])<14)'));
if(phase!=='riding')assert.equal(g.run('armPose.armLead'),0);
}
});
test('fast carving flexes the surfer and throws more spray than slow straight riding',()=>{
const slow=surfGame(),fast=surfGame();
for(const [g,speed] of [[slow,.22],[fast,.7]])g.run(`setSurfTestRide();surfSession.waveSize=1;surfSession.angle=Math.PI;surfSession.speed=${speed};surfSession.y=.5`);
slow.run('advanceSurfing(600)');fast.run(`keys.add('down');advanceSurfing(300);keys.clear();keys.add('up');advanceSurfing(300)`);
assert.ok(fast.run('surfRiderPose().crouch')>slow.run('surfRiderPose().crouch'));
assert.ok(Math.abs(fast.run('surfRiderPose().lean'))>Math.abs(slow.run('surfRiderPose().lean')));
for(const g of [slow,fast])g.run(`let sprayCount=0;const wakeRect=rect;rect=(...args)=>{if(args[4]==='#f0fff1'||args[4]==='#b5e7db')sprayCount++;wakeRect(...args)};drawSurfBoardWake()`);
assert.ok(fast.run('sprayCount')>slow.run('sprayCount'));
assert.ok(fast.run('surfSession.wake.some(mark=>mark.strength>.4)'));
assert.ok(fast.run('surfSession.wake.at(-1).y!==surfSession.wake[0].y'));
});

test('surf holding Space during a crest reversal snaps the tail loose while the nose drives down',()=>{
for(const [angle,key] of [[Math.PI+.4,'down'],[Math.PI*2-.4,'right']]){
const g=surfGame();g.run(`setSurfTestRide();surfSession.waveSize=.7;surfSession.x=.2;surfSession.y=.025;surfSession.speed=.65;surfSession.angle=${angle};keys.add('${key}');handleSurfKey(' ',{repeat:false,preventDefault(){}});advanceSurfing(160)`);
assert.equal(g.run('surfSession.phase'),'riding');assert.ok(g.run('surfSession.snap'));assert.equal(g.run('surfSession.airRequest'),0);assert.ok(g.run(`surfSession.lipSpray.some(mark=>mark.kind==='snap')`));
g.run('advanceSurfing(300)');assert.ok(g.run('surfSnapPose().tailLift')>18);assert.ok(g.run('surfSnapPose().leanBack')>8);
const snapshot=g.run('JSON.stringify([surfSession.snap,surfSession.y,surfSession.lipSpray])');g.run('surfSession.paused=true;advanceSurfing(500);drawSurfGame()');assert.equal(g.run('JSON.stringify([surfSession.snap,surfSession.y,surfSession.lipSpray])'),snapshot);
g.run('surfSession.paused=false');g.node('#challenge').showModal();g.run('advanceSurfing(500)');assert.equal(g.run('JSON.stringify([surfSession.snap,surfSession.y,surfSession.lipSpray])'),snapshot);g.node('#challenge').close();
g.run('keys.clear();advanceSurfing(320)');assert.equal(g.run('surfSession.snap'),null);assert.ok(g.run('Math.sin(surfSession.angle)>.6'));assert.equal(g.run('surfSession.phase'),'riding');assert.ok(g.run('surfSession.score')>=90);
}
const tap=surfGame();tap.run(`setSurfTestRide();surfSession.y=.025;surfSession.angle=Math.PI+.4;keys.add('down');handleSurfKey(' ',{repeat:false,preventDefault(){}});advanceSurfing(64);keys.delete(' ');advanceSurfing(160)`);assert.equal(tap.run('surfSession.snap'),null);
const lower=surfGame();lower.run(`setSurfTestRide();keys.add(' ');keys.add('down');advanceSurfing(400)`);assert.equal(lower.run('surfSession.snap'),null);
const touch=surfGame();touch.run(`setSurfTestRide();surfSession.y=.025;surfSession.angle=Math.PI+.4;keys.add('down')`);touch.node('#surfAction').onpointerdown({preventDefault(){},pointerId:1});touch.run('advanceSurfing(160)');assert.ok(touch.run('surfSession.snap'));touch.node('#surfAction').onpointerup();assert.equal(touch.run(`keys.has(' ')`),false);
touch.run('prepareSurfTakeoff()');assert.equal(touch.run('surfSession.snap'),null);assert.equal(touch.run('surfSession.spaceHold'),0);
});
test('surf snap rendering keeps the deck rigid and flat while pivoting about its nose and leaning back',()=>{
const g=surfGame();g.run(`setSurfTestRide();surfSession.angle=2.6;surfSession.snap={age:0,startAngle:2.6,delta:-.3};var shirtPoints=[],boardMatrix;const snapPolygon=polygon;polygon=(points,color,...rest)=>{if(color===characterColors().shirt)shirtPoints=points;return snapPolygon(points,color,...rest)};ctx.transform=(...matrix)=>{boardMatrix=matrix};drawSurfRider(224,140,surfBoardRotation());var flatShoulder=(shirtPoints[2][0]+shirtPoints[3][0])/2;surfSession.snap.age=310;drawSurfRider(224,140,surfBoardRotation());var backShoulder=(shirtPoints[2][0]+shirtPoints[3][0])/2;var snapRotation=surfBoardRotation()`);
assert.ok(g.run('backShoulder-surfBoardFrame(snapRotation).x*.85<flatShoulder-6'));
assert.ok(g.run('Math.abs(boardMatrix[1]*21+boardMatrix[5]+Math.sin(snapRotation)*21)<1e-8'),'nose remains engaged');
assert.ok(g.run('boardMatrix[1]*(-18)+boardMatrix[5]<Math.sin(snapRotation)*18-8'),'tail released upward');
assert.ok(g.run('Math.abs(boardMatrix[0]*boardMatrix[2]+boardMatrix[1]*boardMatrix[3])<1e-9'),'deck axes remain perpendicular');
assert.ok(g.run('Math.abs(Math.hypot(boardMatrix[0],boardMatrix[1])-1)<1e-9&&Math.abs(Math.hypot(boardMatrix[2],boardMatrix[3])-1)<1e-9'),'board keeps its shape');
assert.ok(g.run('surfBoardPerspective().deck>.99'),'flat deck remains visible');
});

test('surf a well-timed crest snap slides the tail left of the fixed nose without skewing the board',()=>{
const g=surfGame();g.run(`setSurfTestRide();surfSession.y=.02;surfSession.angle=Math.PI+.6;surfSession.speed=.7;keys.add('left');handleSurfKey(' ',{repeat:false,preventDefault(){}});advanceSurfing(160)`);
assert.ok(g.run('surfSession.snap.quality')>.95);
g.run(`advanceSurfing(310);var slideRotation=surfBoardRotation(),slideBoard=surfBoardFrame(slideRotation);var plantedNoseX=-(slideBoard.cos*21+slideBoard.x),releasedTailX=-(slideBoard.cos*(-18)+slideBoard.x)`);
assert.ok(g.run('releasedTailX<plantedNoseX-5'),'tail crosses partly left of nose');
assert.ok(g.run('Math.abs(slideBoard.cos*21+slideBoard.x-Math.cos(slideRotation)*21)<1e-8'),'nose stays planted');
assert.ok(g.run('Math.abs(slideBoard.cos*slideBoard.cos+slideBoard.sin*slideBoard.sin-1)<1e-8'),'rigid deck');
g.run(`var fullSlide=surfSnapPose().tailSlide;surfSession.snap.quality=.45;var earlySlide=surfSnapPose().tailSlide;surfSession.snap.quality=1;surfSession.snap.age=620;var reconnected=surfBoardFrame(slideRotation)`);
assert.ok(g.run('earlySlide<fullSlide*.2'));assert.equal(g.run('surfSnapPose().tailSlide'),0);
assert.ok(g.run('Math.abs(reconnected.cos-Math.cos(slideRotation))<1e-8'),'tail returns to riding line');
});

test('surf top turns and airs throw lip spray, with later and sharper turns making bigger fans',()=>{
const early=surfGame(),late=surfGame(),low=surfGame();
for(const [g,y] of [[early,.14],[late,.025],[low,.5]])g.run(`setSurfTestRide();surfSession.y=${y};surfSession.speed=.65;surfSession.angle=Math.PI+.3;keys.add('down');advanceSurfing(220)`);
assert.ok(early.run('surfSession.lipSpray.length')>0);assert.ok(late.run('surfSession.lipSpray.length')>0);assert.equal(low.run('surfSession.lipSpray.length'),0);
assert.ok(late.run('Math.max(...surfSession.lipSpray.map(mark=>mark.power))')>early.run('Math.max(...surfSession.lipSpray.map(mark=>mark.power))')*1.5);
const air=surfGame();air.run(`setSurfTestRide();surfSession.y=.025;surfSession.angle=Math.PI+.6;surfSession.speed=.7;requestSurfAir();advanceSurfing(16)`);
assert.equal(air.run('surfSession.phase'),'airborne');assert.ok(air.run(`surfSession.lipSpray.some(mark=>mark.kind==='air')`));
const snapshot=air.run('JSON.stringify(surfSession.lipSpray)');air.run('surfSession.paused=true;advanceSurfing(300);drawSurfGame()');assert.equal(air.run('JSON.stringify(surfSession.lipSpray)'),snapshot);
air.run('surfSession.paused=false');air.node('#challenge').showModal();air.run('advanceSurfing(300)');assert.equal(air.run('JSON.stringify(surfSession.lipSpray)'),snapshot);air.node('#challenge').close();
air.run(`surfSession.airHeight=4;advanceSurfing(920)`);assert.equal(air.run('surfSession.lipSpray.length'),0);
air.run(`emitSurfLipSpray(surfSession,1,'air');prepareSurfTakeoff()`);assert.equal(air.run('surfSession.lipSpray.length'),0);
const gentle=surfGame(),sharp=surfGame();
for(const [g,rate] of [[gentle,1],[sharp,4]])g.run(`setSurfTestRide();surfSession.y=.05;surfSession.speed=.65;surfSession.angle=Math.PI;advanceSurfRidingArt(surfSession,16,Math.PI-${rate}*.016)`);
assert.ok(sharp.run('surfSession.lipSpray[0].power')>gentle.run('surfSession.lipSpray[0].power')*2);
});

test('surf board pressure displaces the visible lip locally and rebounds without changing riding geometry',()=>{
const g=surfGame();g.run(`setSurfTestRide();surfSession.y=.025;surfSession.speed=.7;surfSession.angle=Math.PI+.4;emitSurfLipSpray(surfSession,1.5,'carve');var lipContact=surfSession.lipSpray[0].x+surfSession.scroll,pressureWave=surfRideView(),physicalCrest=surfFaceCrest(lipContact,pressureWave);var weakDent;surfSession.lipSpray[0].power=.4;weakDent=surfBoardLipDisplacement(lipContact,pressureWave);surfSession.lipSpray[0].power=1.5`);
assert.ok(g.run('surfBoardLipDisplacement(lipContact,pressureWave)>weakDent*2'));
assert.ok(g.run('surfRenderedCrest(lipContact,pressureWave)>physicalCrest+5'));
assert.ok(g.run('surfBoardLipDisplacement(lipContact+(8+1.5*7)*1.2,pressureWave)<0'));
assert.equal(g.run('surfBoardLipDisplacement(lipContact+100,pressureWave)'),0);
assert.equal(g.run('surfFaceCrest(lipContact,pressureWave)'),g.run('physicalCrest'));
g.run(`var sprayDrops=0,spraySheets=0;const pressureDrop=surfWaterDrop,pressureFill=ctx.fill;surfWaterDrop=(...args)=>{sprayDrops++;pressureDrop(...args)};ctx.fill=(...args)=>{spraySheets++;pressureFill(...args)};surfSession.lipSpray[0].age=200;drawSurfLipSpray()`);
assert.ok(g.run('sprayDrops')>60);assert.ok(g.run('spraySheets')>=3);
g.run(`surfSession.lipSpray[0].age=650`);assert.equal(g.run('surfRenderedCrest(lipContact,pressureWave)'),g.run('physicalCrest'));
});

test('surf wipeouts tumble to the trough, separating the rider from an intact or snapped board',()=>{
for(const fromAir of [false,true]){
const g=surfGame();g.run(`setSurfTestRide();surfSession.y=.12;surfSession.phase='${fromAir?'airborne':'riding'}';surfSession.airHeight=${fromAir?.5:0};surfSession.airSpin=.4;surfWipeout('Test fall');var wipeoutY=surfWipeoutPose().y;var fragmentSides=[];const realWipeoutBoard=drawSurfWipeoutBoard;drawSurfWipeoutBoard=(side,pose)=>{fragmentSides.push(side);realWipeoutBoard(side,pose)};drawSurfGame()`);
assert.equal(g.run('surfSession.wipeoutStart.fromAir'),fromAir);
assert.equal(g.run('JSON.stringify(fragmentSides)'),JSON.stringify(fromAir?[-1,1]:[0]));
let previous=g.run('surfWipeoutPose().y');
for(const step of [200,300,450]){
g.run(`advanceSurfing(${step});drawSurfGame()`);const y=g.run('surfWipeoutPose().y');assert.ok(y>previous);previous=y;
}
assert.equal(g.run('surfWipeoutPose().y'),268);assert.ok(g.run('surfWipeoutPose().rotation')>Math.PI*2);
const snapshot=g.run('JSON.stringify([surfSession.wipeoutTime,surfWipeoutPose()])');
g.run('surfSession.paused=true;advanceSurfing(300);drawSurfGame()');assert.equal(g.run('JSON.stringify([surfSession.wipeoutTime,surfWipeoutPose()])'),snapshot);
g.run('surfSession.paused=false');g.node('#challenge').showModal();g.run('advanceSurfing(300)');assert.equal(g.run('JSON.stringify([surfSession.wipeoutTime,surfWipeoutPose()])'),snapshot);g.node('#challenge').close();
g.run('advanceSurfing(300);drawSurfGame()');assert.ok(g.run('surfWipeoutPose().impact')>0);
g.run('advanceSurfing(SURF_WIPEOUT_TIME-1250)');assert.equal(g.run('surfSession.phase'),'paddling');assert.equal(g.run('surfSession.wipeoutStart'),null);assert.equal(g.run('state.surfRental'),true);
}
const air=surfGame();air.run(`setSurfTestRide();surfSession.phase='airborne';surfSession.airHeight=.001;surfSession.airV=-1;surfSession.airSpin=0;advanceSurfing(16)`);assert.equal(air.run('surfSession.phase'),'wipeout');assert.equal(air.run('surfSession.wipeoutStart.fromAir'),true);
});

test('surf wipeout submerges the rider and splash foam climbs along the wave flow',()=>{
const g=surfGame();g.run(`setSurfTestRide();surfWipeout('Submerge');advanceSurfing(950);var impactX=surfWipeoutPose().x;var splashWave=surfRideView(),splashAnchor=surfWipeoutFoamAnchor(impactX,splashWave);var splashBottom=surfWipeoutSplashPoint(splashAnchor,0,splashWave),splashMiddle=surfWipeoutSplashPoint(splashAnchor,.5,splashWave),splashTop=surfWipeoutSplashPoint(splashAnchor,1,splashWave)`);
assert.ok(g.run('Math.abs(splashBottom.x-impactX)<.01'));assert.ok(g.run('splashTop.y<splashMiddle.y&&splashMiddle.y<splashBottom.y'));assert.ok(g.run('splashTop.x<splashMiddle.x&&splashMiddle.x<splashBottom.x'));
g.run(`advanceSurfing(300);var submergedRiders=0;const underwaterRider=drawSurfRider;drawSurfRider=(...args)=>{submergedRiders++;underwaterRider(...args)};drawSurfGame()`);
assert.equal(g.run('surfWipeoutPose().sink'),1);assert.equal(g.run('submergedRiders'),0);
g.run(`advanceSurfing(1000);var sharedFoamCalls=0;const wipeoutFlow=surfFaceFlowPoint;surfFaceFlowPoint=(...args)=>{sharedFoamCalls++;return wipeoutFlow(...args)};drawSurfGame()`);
assert.equal(g.run('surfSession.phase'),'wipeout');assert.ok(g.run('sharedFoamCalls')>0);
});

test('surf wipeout foam aligns with nearby water streaks and renders as bubbles rather than trails',()=>{
const g=surfGame();g.run(`setSurfTestRide();surfWipeout('Foam patch');surfSession.wipeoutTime=2200;var foamWave=surfRideView()`);
for(const rise of [.2,.5,.85]){
g.run(`var expectedPoint=surfFaceFlowPoint(100,${rise},foamWave),nextPoint=surfFaceFlowPoint(100,${rise}+.001,foamWave),localFoam=surfFaceFlowTangent(expectedPoint.x,expectedPoint.y,foamWave)`);
assert.ok(g.run('Math.abs(Math.atan2(Math.sin(localFoam.angle-Math.atan2(nextPoint.y-expectedPoint.y,nextPoint.x-expectedPoint.x)),Math.cos(localFoam.angle-Math.atan2(nextPoint.y-expectedPoint.y,nextPoint.x-expectedPoint.x))))<.01'));
}
g.run(`var foamBubbles=0,foamLines=0;const foamDrop=surfWaterDrop;surfWaterDrop=(...args)=>{foamBubbles++;foamDrop(...args)};ctx.stroke=()=>{foamLines++};drawSurfWipeoutSplash(surfWipeoutPose())`);
assert.ok(g.run('foamBubbles')>100);assert.equal(g.run('foamLines'),0);
});

test('surf wipeout head resurfaces in the foam and follows the current up and over the wave',()=>{
for(const size of [.48,.7,1])for(const fromAir of [false,true]){
const g=surfGame();g.run(`setSurfTestRide();surfSession.waveSize=${size};surfSession.phase='${fromAir?'airborne':'riding'}';surfSession.airHeight=${fromAir?.5:0};surfWipeout('Resurface')`);
for(const time of [0,950,1230,1400]){g.run(`surfSession.wipeoutTime=${time}`);assert.equal(g.run('surfWipeoutHeadPose().visible'),false);}
const positions=[];
for(const time of [1500,2200,2900,3300]){
g.run(`surfSession.wipeoutTime=${time};drawSurfGame()`);assert.equal(g.run('surfWipeoutHeadPose().visible'),true);positions.push(g.run('surfWipeoutHeadPose().y'));
}
for(let i=1;i<positions.length;i++)assert.ok(positions[i]<positions[i-1],'head travels up the face');
assert.equal(g.run('surfWipeoutHeadPose().behind'),true,'head wraps onto the back');
g.run('surfSession.wipeoutTime=3500');assert.ok(g.run('surfWipeoutHeadPose().y')>positions[3],'head rolls down the far side');
g.run('surfSession.wipeoutTime=3599');assert.equal(g.run('surfWipeoutHeadPose().visible'),false);
}
});
test('surf tube wipeouts show through the curtain and pitch the head forward into the curl',()=>{
for(const size of [.48,.7,1]){
const g=surfGame();g.run(`setSurfTestRide();surfSession.waveSize=${size};surfSession.x=.98;surfSession.y=.4;surfWipeout('Tube fall')`);
assert.equal(g.run('surfSession.wipeoutStart.inTube'),true);
g.run(`var tubePasses=[],tubeClips=0,tubeAlphaStack=[];ctx.save=()=>tubeAlphaStack.push(ctx.globalAlpha);ctx.restore=()=>{ctx.globalAlpha=tubeAlphaStack.pop()};const tubeClip=ctx.clip;ctx.clip=()=>{tubeClips++;tubeClip()};ctx.globalAlpha=1;drawSurfWipeoutOccupant(()=>tubePasses.push(ctx.globalAlpha));`);
assert.deepEqual(Array.from(g.run('tubePasses')),[.3,1]);assert.ok(g.run('tubeClips')>0);
g.run('surfSession.wipeoutTime=2200');assert.equal(g.run('surfWipeoutHeadPose().front'),false);
const forward=[];
for(const time of [3100,4200,5750]){
g.run(`surfSession.wipeoutTime=${time};drawSurfGame()`);
assert.equal(g.run('surfWipeoutHeadPose().front'),true);assert.equal(g.run('surfWipeoutHeadPose().behind'),false);assert.equal(g.run('surfWipeoutHeadPose().visible'),true);
forward.push(g.run('surfWipeoutHeadPose()'));
}
assert.ok(forward[2].y>forward[0].y+50,'head falls down into the curl toward the camera');assert.ok(forward[2].scale>forward[0].scale);
g.run(`var fullHeadMasks=0;drawSurfWipeoutOccupant=()=>{fullHeadMasks++};drawSurfWipeoutHead()`);assert.equal(g.run('fullHeadMasks'),0,'full head clears foreground water on the forward fall');
}
const open=surfGame();open.run("setSurfTestRide();surfSession.x=.3;surfWipeout('Open face');surfSession.wipeoutTime=3500");assert.equal(open.run('surfSession.wipeoutStart.inTube'),false);assert.equal(open.run('surfWipeoutHeadPose().behind'),true);
});
test('surf tube descent waves partly submerged arms and the ascending board shares the curtain mask',()=>{
const g=surfGame();g.run("setSurfTestRide();surfSession.x=.98;surfSession.y=.4;surfWipeout('Waving in curl');surfSession.wipeoutTime=2200");
assert.equal(g.run('surfWipeoutArmPose()'),null);
g.run(`var boardMaskCalls=0,boardMask=drawSurfWipeoutOccupant;drawSurfWipeoutOccupant=draw=>{boardMaskCalls++;boardMask(draw)};drawSurfWipeoutBoard(0,surfWipeoutPose())`);assert.equal(g.run('boardMaskCalls'),1);
g.run('surfSession.wipeoutTime=4700');const first=g.run('JSON.stringify(surfWipeoutArmPose())');
assert.ok(g.run('surfWipeoutArmPose().arms.every(a=>a.shoulder[1]>surfWipeoutArmPose().waterline)'),'shoulders stay submerged');
assert.ok(g.run('surfWipeoutArmPose().arms.some(a=>a.hand[1]<surfWipeoutArmPose().waterline)'),'raised hand clears water');
assert.ok(g.run('surfWipeoutArmPose().arms.some(a=>a.hand[1]>surfWipeoutArmPose().waterline)'),'other hand dips underwater');
g.run('drawSurfGame();drawSurfGame()');assert.equal(g.run('JSON.stringify(surfWipeoutArmPose())'),first,'rendering never advances arm motion');
g.run('surfSession.wipeoutTime=4900');assert.notEqual(g.run('JSON.stringify(surfWipeoutArmPose())'),first,'arms wave over time');
g.run('surfSession.paused=true');const paused=g.run('JSON.stringify(surfWipeoutArmPose())');g.run('advanceSurfing(500)');assert.equal(g.run('JSON.stringify(surfWipeoutArmPose())'),paused);
g.run('surfSession.wipeoutStart.inTube=false;surfSession.wipeoutTime=2200;boardMaskCalls=0;drawSurfWipeoutBoard(0,surfWipeoutPose())');assert.equal(g.run('boardMaskCalls'),0,'open-face board stays clear');
});
test('surf tube head follows the foam roof, keeps moving at the apex, then falls with the curtain to the right',()=>{
for(const size of [.48,.7,1]){
const g=surfGame();g.run(`setSurfTestRide();surfSession.waveSize=${size};surfSession.x=.98;surfSession.y=.4;surfWipeout('Curl flow');var curlWave=surfRideView(),curlAnchor=surfWipeoutFoamAnchor(surfWipeoutPose().x,curlWave);var curlEntry=surfWipeoutCurlPoint(curlAnchor,0,curlWave);`);
const pts=[0,.14,.17,.18,.19,.22,.36,.7,1].map(t=>g.run(`surfWipeoutCurlPoint(curlAnchor,${t},curlWave)`));
assert.ok(pts[3].y<pts[0].y&&pts[3].y<pts[6].y,'head rounds the top of the curl');
assert.ok(pts.at(-1).x>pts[6].x&&pts[6].x>pts[0].x,'descent stays right of ascent');
assert.ok(pts.at(-1).y>pts[6].y+80,'falls with the curtain');
assert.ok(pts[4].x-pts[2].x>.9,'keeps moving around the apex without a pause');
// The drop tangent shares the rendered water curtain rather than cutting diagonally across it.
const dy=(pts.at(-1).y-pts[6].y)/size;
const expectedDx=g.run(`surfBreakEdge(94+${dy},curlWave)-surfBreakEdge(94,curlWave)`);
assert.ok(Math.abs(pts.at(-1).x-pts[6].x-expectedDx)<1e-8);
for(const t of [.1,.18,.3]){
const point=g.run(`surfWipeoutCurlPoint(curlAnchor,${t},curlWave)`);
const expected=g.run(`surfBarrelFrothFlowPoint(surfLipCrown(curlWave)-12,.76+.24*(${t}/.36),curlWave)`);
const base=g.run('surfBarrelFrothFlowPoint(surfLipCrown(curlWave)-12,.76,curlWave)');
assert.ok(Math.abs(point.x-pts[0].x-(expected.x-base.x))<1e-8);assert.ok(Math.abs(point.y-pts[0].y-(expected.y-base.y)*size)<1e-8);
}
}
});
test('surf tube rollover stays gradual and descent is slightly quicker than ascent before recovery',()=>{
const g=surfGame();g.run("setSurfTestRide();surfSession.x=.98;surfSession.y=.4;surfWipeout('Slow curl')");
const duration=g.run('surfWipeoutDuration()'),ascent=.9/.43*1000,roll=(duration-(950+ascent))*.36,fall=(duration-(950+ascent))*.64;
assert.ok(fall/ascent>.75&&fall/ascent<.95,'fall is a little quicker than the upward flow');assert.ok(roll>900&&roll<1100,'slower continuous rollover');
g.run('advanceSurfing(3600)');assert.equal(g.run('surfSession.phase'),'wipeout');assert.equal(g.run('surfWipeoutHeadPose().front'),true);
g.run('surfSession.paused=true');const before=g.run('JSON.stringify(surfWipeoutHeadPose())');g.run('advanceSurfing(1000)');assert.equal(g.run('JSON.stringify(surfWipeoutHeadPose())'),before);
g.run('surfSession.paused=false;advanceSurfing(surfWipeoutDuration()-surfSession.wipeoutTime-16)');assert.equal(g.run('surfSession.phase'),'wipeout');
g.run('advanceSurfing(16)');assert.equal(g.run('surfSession.phase'),'paddling');assert.equal(g.run('surfSession.wipeoutStart'),null);
const open=surfGame();open.run("setSurfTestRide();surfSession.x=.3;surfWipeout('Open face')");assert.equal(open.run('surfWipeoutDuration()'),3600);
});
test('surf resurfaced head freezes for pause and dialogs and drawing does not advance its pose',()=>{
const g=surfGame();g.run("setSurfTestRide();surfWipeout('Resurface');surfSession.wipeoutTime=2200;surfSession.paused=true");
const pose=g.run('JSON.stringify(surfWipeoutHeadPose())');g.run('advanceSurfing(500);drawSurfGame();drawSurfGame()');assert.equal(g.run('JSON.stringify(surfWipeoutHeadPose())'),pose);
g.run('surfSession.paused=false');g.node('#challenge').showModal();g.run('advanceSurfing(500)');assert.equal(g.run('JSON.stringify(surfWipeoutHeadPose())'),pose);g.node('#challenge').close();
g.run('advanceSurfing(200)');assert.notEqual(g.run('JSON.stringify(surfWipeoutHeadPose())'),pose);
g.run('advanceSurfing(SURF_WIPEOUT_TIME)');assert.equal(g.run('surfSession.phase'),'paddling');
});
test('surf broken board halves follow splash flow up the face and over the crest',()=>{
const g=surfGame();g.run(`setSurfTestRide();surfSession.phase='airborne';surfWipeout('Broken board');surfSession.wipeoutTime=960;var boardNearBottom=[-1,1].map(side=>surfWipeoutBoardPose(side));surfSession.wipeoutTime=2200;var boardMidFace=[-1,1].map(side=>surfWipeoutBoardPose(side));surfSession.wipeoutTime=3200;var boardNearCrest=[-1,1].map(side=>surfWipeoutBoardPose(side));drawSurfGame()`);
for(let i=0;i<2;i++){
assert.ok(g.run(`boardNearCrest[${i}].y<boardMidFace[${i}].y&&boardMidFace[${i}].y<boardNearBottom[${i}].y`));
assert.ok(g.run(`boardNearCrest[${i}].x<boardMidFace[${i}].x&&boardMidFace[${i}].x<boardNearBottom[${i}].x`));
}
g.run(`surfSession.wipeoutTime=SURF_WIPEOUT_TIME-1;var sweptBoards=[-1,1].map(side=>surfWipeoutBoardPose(side));drawSurfGame()`);
assert.ok(g.run('sweptBoards.every(board=>board.alpha<.5)'));
});

test('surf board pieces wrap around the lip and hide behind it without fading in the air',()=>{
const g=surfGame();g.run(`setSurfTestRide();surfSession.phase='airborne';surfWipeout('Wrap board');var lipWave=surfRideView(),lipAnchor=surfWipeoutFoamAnchor(280,lipWave);var entry=surfWipeoutBoardFlow(lipAnchor,.9,lipWave),crestWrap=surfWipeoutBoardFlow(lipAnchor,1.01,lipWave),back=surfWipeoutBoardFlow(lipAnchor,1.11,lipWave)`);
assert.ok(g.run('crestWrap.y<entry.y&&back.y>crestWrap.y'));assert.equal(g.run('crestWrap.behind'),true);assert.equal(g.run('back.behind'),true);
for(const time of [2900,3150,3300,3500]){
g.run(`surfSession.wipeoutTime=${time};var boardWrapPose=surfWipeoutBoardPose(-1);drawSurfGame()`);
assert.ok(g.run('boardWrapPose.alpha===0||boardWrapPose.alpha===1'),'fully opaque or gone');
assert.ok(g.run('boardWrapPose.y>=surfRideCrest(boardWrapPose.x)-3'),'stays on lip');
}
});

test('surf lip draws behind every surfer pose and the pop-up rider stays opaque',()=>{
const g=surfGame();g.run(`setSurfTestRide();var surfLayers=[];const realSurfLip=drawSurfWaveLip,realSurfRider=drawSurfRider,realSurfTakeoff=drawSurfTakeoffRider;drawSurfWaveLip=(...args)=>{surfLayers.push('lip');realSurfLip(...args)};drawSurfRider=(...args)=>{surfLayers.push('rider');realSurfRider(...args)};drawSurfTakeoffRider=(...args)=>{surfLayers.push('prone');realSurfTakeoff(...args)}`);
for(const phase of ['takeoff','popup','riding','airborne','wipeout']){
g.run(`surfSession.phase='${phase}';surfSession.popTime=700;surfSession.wipeoutTime=100;surfLayers=[];drawSurfGame()`);
assert.ok(g.run(`surfLayers.indexOf('lip')<surfLayers.findIndex(layer=>layer==='rider'||layer==='prone')`),phase);
}
// Observe actual Canvas alpha writes through the end of the pop-up.
g.run(`var riderAlphas=[];Object.defineProperty(ctx,'globalAlpha',{configurable:true,get(){return 1},set(value){riderAlphas.push(value)}});surfSession.phase='popup'`);
for(const time of [0,700,950,1050,1140]){
g.run(`surfSession.popTime=${time};riderAlphas=[];drawSurfTakeoffRider(224,150)`);
assert.ok(g.run('riderAlphas.every(alpha=>alpha===1)'),String(time));
}
});

test('surf board exposes the deck up the face and at the top, narrowing onto the bottom-turn rail',()=>{
const g=surfGame();g.run(`setSurfTestRide();surfSession.angle=Math.PI;surfSession.carveLean=0;const traverseDeck=surfBoardPerspective().deck;surfSession.angle=Math.PI*1.5;const climbingDeck=surfBoardPerspective().deck;surfSession.angle=Math.PI+.4;surfSession.carveLean=.95;surfSession.y=.15;const topDeck=surfBoardPerspective().deck;surfSession.y=.85;const bottomDeck=surfBoardPerspective().deck`);
assert.ok(g.run('climbingDeck>traverseDeck*1.3'));
assert.ok(g.run('bottomDeck<topDeck*.5'));
g.run(`surfSession.carveLean=-.95`);assert.equal(g.run('surfBoardPerspective().deck'),g.run('bottomDeck'));
// Exercise the real rider/board drawing at each heading and both profiles, without advancing physics.
for(const character of ['boy','girl'])for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5])for(const y of [.15,.85]){
g.run(`currentProfile().character='${character}';surfSession.angle=${angle};surfSession.y=${y};var beforeBoardRender=JSON.stringify(surfSession)`);
g.run('drawSurfGame()');assert.equal(g.run('JSON.stringify(surfSession)'),g.run('beforeBoardRender'));
}
});

test('surf sustained directions tighten into full cutbacks from both edges of a medium wave',()=>{
for(const [y,key] of [[.08,'down'],[.92,'up'],[.08,'left'],[.92,'right']]){
const g=surfGame();g.run(`setSurfTestRide();surfSession.waveSize=.7;surfSession.y=${y};surfSession.speed=.65;surfSession.angle=Math.PI;keys.add('${key}');let maxY=surfSession.y,minY=surfSession.y;for(let t=0;t<1600&&surfSession.phase==='riding'&&Math.abs(surfSession.angle-Math.PI)<Math.PI;t+=16){advanceSurfing(16);maxY=Math.max(maxY,surfSession.y);minY=Math.min(minY,surfSession.y)}`);
assert.equal(g.run('surfSession.phase'),'riding',key);
assert.ok(g.run('Math.abs(surfSession.angle-Math.PI)>=Math.PI'),key);
assert.ok(g.run('Math.cos(surfSession.angle)>.98'),key+' points back at lip');
assert.ok(g.run('maxY<1.03&&minY>=.012'),key+' fits on face');
assert.match(g.run('surfSession.message'),/CUTBACK/);
const before=g.run('surfSession.x');g.run('keys.clear();advanceSurfing(32)');
assert.ok(g.run('surfSession.x')>before,key+' returns toward break');
assert.equal(g.run('surfSession.turnHold'),0);
assert.ok(g.run('Math.abs(surfBoardRotation()-(surfSession.angle-Math.PI))<1e-9'));
}
});
test('surf turns preserve speed through a full cutback in every direction',()=>{
for(const [y,key] of [[.08,'down'],[.92,'up'],[.08,'left'],[.92,'right']]){
const g=surfGame();g.run(`setSurfTestRide();surfSession.waveSize=.7;surfSession.y=${y};surfSession.speed=.65;surfSession.angle=Math.PI;keys.add('${key}');let minimumTurnSpeed=surfSession.speed;for(let t=0;t<1600&&surfSession.phase==='riding'&&Math.abs(surfSession.angle-Math.PI)<Math.PI;t+=16){advanceSurfing(16);minimumTurnSpeed=Math.min(minimumTurnSpeed,surfSession.speed)}`);
assert.equal(g.run('surfSession.phase'),'riding',key);
assert.ok(g.run('Math.abs(surfSession.angle-Math.PI)>=Math.PI'),key+' completes turn');
assert.ok(g.run('minimumTurnSpeed>=.65*.95'),key+' keeps at least 95% of entry speed');
}
});
test('surf rail pressure builds with a hold, resets on direction changes, and freezes with pause',()=>{
const g=surfGame();g.run(`setSurfTestRide();surfSession.angle=Math.PI;surfSession.y=.4;keys.add('right');advanceSurfing(160);const earlyRate=(surfSession.angle-Math.PI)/.16;advanceSurfing(550);const beforeAngle=surfSession.angle;advanceSurfing(160);const lateRate=(surfSession.angle-beforeAngle)/.16`);
assert.ok(g.run('lateRate>earlyRate*1.7'));
g.run('surfSession.paused=true');const snapshot=g.run('JSON.stringify([surfSession.angle,surfSession.turnHold,surfSession.hullWake])');
g.run('advanceSurfing(1000);drawSurfGame()');assert.equal(g.run('JSON.stringify([surfSession.angle,surfSession.turnHold,surfSession.hullWake])'),snapshot);
g.run(`surfSession.paused=false;keys.clear();keys.add('left');advanceSurfing(16)`);
assert.equal(g.run('surfSession.turnInput'),-2);assert.equal(g.run('surfSession.turnHold'),.016);
g.run(`prepareSurfTakeoff(.7)`);assert.equal(g.run('surfSession.turnHold'),0);assert.equal(g.run('surfSession.turnInput'),0);
});

test('surf trails freeze when paused, survive render calls, fade during an air, and reset on a new wave',()=>{
const g=surfGame();g.run(`setSurfTestRide();surfSession.speed=.65;surfSession.angle=Math.PI;advanceSurfing(400)`);
assert.ok(g.run('surfSession.wake.length')>0);
const trails=g.run('JSON.stringify([surfSession.wake,surfSession.carveLean,surfSession.carveStrength])');
g.run('draw();draw();surfSession.paused=true;advanceSurfing(500)');assert.equal(g.run('JSON.stringify([surfSession.wake,surfSession.carveLean,surfSession.carveStrength])'),trails);
g.run('surfSession.paused=false;surfSession.phase="airborne";surfSession.y=.012;surfSession.airHeight=2;surfSession.airV=2;surfSession.airSpin=0;advanceSurfing(1400)');
assert.equal(g.run('surfSession.wake.length'),0);
g.run('prepareSurfTakeoff();for(let i=0;i<24&&surfSession.phase==="takeoff";i++){paddleSurfStroke();advanceSurfing(280)};advanceSurfing(1150-surfSession.popTime)');
assert.equal(g.run('surfSession.phase'),'riding');assert.equal(g.run('surfSession.wake.length'),0);assert.ok(g.run('surfSession.hullWake.bowWake.length')>0);assert.equal(g.run('surfSession.carveLean'),0);
});

test('surf lip leads left at the crest and crashes farther right with crumbling impact spray',()=>{
const g=surfGame();g.run(`setSurfTestRide();surfSession.waveSize=1;surfSession.x=1.03;surfSession.y=.15;const taperView=surfRideView()`);
assert.ok(g.run('surfBreakEdge(274,taperView)-surfBreakEdge(100,taperView)')>40);
assert.equal(g.run('surfBarrelState().overrun'),true);
g.run('surfSession.y=.8');assert.equal(g.run('surfBarrelState().overrun'),false);
assert.ok(g.run('surfBarrelDepth(274)')<g.run('surfBarrelDepth(185)')/2);
g.run(`const baseSpray=[];const taperDrop=surfWaterDrop;surfWaterDrop=(...args)=>{if(args[4]==='#effcf0')baseSpray.push(args);taperDrop(...args)};drawSurfWaveLip(taperView);const impactX=surfBreakEdge(274,taperView)`);
assert.ok(g.run('baseSpray.length')>30);
assert.ok(g.run('baseSpray.some(([x,y])=>x<impactX&&y<274)'));
assert.ok(g.run('baseSpray.some(([x,y])=>x>impactX&&y<274)'));
});

test('surf face loses height progressively ahead of the curling lip at every riding size',()=>{
const g=surfGame();g.run(`setSurfTestRide();const taperView=surfRideView();const taperCrown=surfLipCrown(taperView)`);
const heights=[0,30,90,180,300].map(distance=>g.run(`279-surfFaceCrest(taperCrown-${distance},taperView)`));
assert.ok(heights.every((height,i)=>!i||height<heights[i-1]));
assert.ok(heights.at(-1)>heights[0]*.65&&heights.at(-1)<heights[0]*.8,'far shoulder stays full with a gentle taper');
for(const size of [.48,.7,1]){
g.run(`surfSession.waveSize=${size}`);
assert.ok(Math.abs(g.run('279-surfRideCrest(taperCrown-180)')-heights[3]*size)<1e-8);
g.run('drawSurfGame()');
}
});

test('face froth fans across the shoulder, steepens up the face, and reaches its crest',()=>{
const g=surfGame();g.run(`setSurfTestRide();const flowView=surfRideView();const crown=surfLipCrown(flowView)`);
let previousSlope=0;
for(const distance of [220,120,50,18]){
const anchor=g.run(`crown-${distance}`);
const points=g.run(`[0,.05,.25,.5,.75,.95,1].map(p=>surfFrothFlowPoint(${anchor},p,flowView))`);
const slopes=points.slice(1).map((p,i)=>(points[i].y-p.y)/(points[i].x-p.x));
assert.ok(points.every((p,i)=>!i||p.y<points[i-1].y));
assert.ok(slopes.every((s,i)=>!i||s>slopes[i-1]),'ribbons steepen from trough to crest');
assert.ok(slopes[2]>previousSlope,'face is steeper nearer the curl');previousSlope=slopes[2];
assert.ok(Math.abs(points.at(-1).y-g.run(`surfFaceCrest(${anchor},flowView)+2`))<1e-8);
assert.equal(points.at(-1).x,anchor);
const arc=g.run(`[.25,.5,.75].map(p=>surfFrothFlowPoint(${anchor},p,flowView))`);
const [start,mid,end]=arc,dx=end.x-start.x,dy=end.y-start.y;
const bend=Math.abs(dx*(start.y-mid.y)-(start.x-mid.x)*dy)/Math.hypot(dx,dy);
assert.ok(bend>5,'the rising ribbon has a visible arc rather than a nearly straight diagonal');
assert.ok(slopes.at(-1)<4,'even the upper face stays slanted in camera space');
}
});

test('barrel froth follows the rising wall continuously through the roof before folding down',()=>{
const g=surfGame();g.run(`setSurfTestRide();const flowView=surfRideView();const crown=surfLipCrown(flowView)`);
for(const radius of [10,12,14]){
const point=p=>g.run(`surfBarrelFrothFlowPoint(crown-${radius},${p},flowView)`);
const base=point(0),join=point(.76),top=point(.88),end=point(1);
assert.equal(base.y,279);assert.ok(Math.abs(join.y-94)<1e-8);
assert.ok(top.y<join.y&&end.y>top.y,'passes through the highest part of the curl');
assert.ok(top.x>join.x&&end.x>top.x,'folds clockwise toward the falling lip');
const before=point(.76-1e-6),after=point(.76+1e-6);
assert.ok(Math.hypot(after.x-before.x,after.y-before.y)<.001,'continuous wall to roof');
assert.ok(join.x<before.x&&join.y<before.y,'wall retains its slant at the roof');
assert.ok(Math.abs((join.x-before.x)/(join.y-before.y)-(after.x-join.x)/(after.y-join.y))<.001,'slanted wall and roof have matching tangents');
g.run(`const roofPoints${radius}=[];ctx.moveTo=ctx.lineTo=(x,y)=>roofPoints${radius}.push({x,y});drawSurfFrothRibbon(crown-${radius},.76,1,flowView,1,1,true)`);
assert.ok(g.run(`Math.min(...roofPoints${radius}.map(p=>p.y))`)<=top.y+1e-8,'rendering keeps the top of the curl visible');
}
g.run('drawSurfWaveFace();surfSession.waveSize=.48;drawSurfWaveFace()');
g.run(`const roofRibbons=[];drawSurfFrothRibbon=(...args)=>{if(args[6])roofRibbons.push(args)};for(const clock of [0,600,1800]){surfClock=clock;drawSurfFaceFroth(flowView)}`);
assert.equal(g.run('roofRibbons.length'),9);
assert.ok(g.run('roofRibbons.every(args=>args[1]>=.76&&args[2]<=1)'), 'the barrel pass emits only curved roof fragments, never upward columns');
});

test('froth ribbons only leave the face after their entire length rolls over the lip',()=>{
const g=surfGame();
for(const [start,end,length] of [[0,1,.24],[.76,1,.07]]){
const span=phase=>g.run(`surfFrothRibbonSpan(${phase},${length},${start},${end})`);
const reachesLip=(end-start)/(end-start+length),atLip=span(reachesLip),exiting=span((reachesLip+1)/2),last=span(1-1e-6),next=span(0);
assert.ok(Math.abs(atLip.to-end)<1e-8);
assert.ok(Math.abs((atLip.to-atLip.from)-length)<1e-8,'whole streak survives until its head reaches the lip');
assert.equal(exiting.to,end);assert.ok(exiting.from>atLip.from&&exiting.from<end,'tail continues up after the head leaves');
assert.ok(end-last.from<.00001,'only an invisible final sliver remains before recycling');
assert.equal(next.to,start);assert.equal(next.from,start,'new streak enters at the trough with no visible reset');
}
g.run(`const driftingRibbons=[];drawSurfFrothRibbon=(...args)=>{if(!args[6])driftingRibbons.push(args)};surfClock=1500;drawSurfFaceFroth({...surfRideView(),breakX:180,scroll:250})`);
assert.equal(g.run('driftingRibbons.length'),33,'scrolling ribbons are clipped by the water rather than deleted near the curl');
});

test('crest froth thickens gradually along the shoulder into the curling lip',()=>{
const g=surfGame();g.run(`setSurfTestRide();const frothView=surfRideView();const frothCrown=surfLipCrown(frothView)`);
const profiles=[320,220,140,80,40,0].map(distance=>g.run(`surfCrestFrothProfile(frothCrown-${distance},frothView)`));
for(const property of ['width','density','alpha'])assert.ok(profiles.every((p,i)=>!i||p[property]>profiles[i-1][property]),property+' builds continuously toward the curl');
assert.ok(profiles[2].width>4,'foam starts thickening well before the curl');
assert.ok(profiles.at(-1).width>profiles[0].width*4,'the crest blends into a broad curling lip');
g.run('drawSurfWaveLip(frothView);surfSession.waveSize=.48;drawSurfWaveLip(frothView)');
});

test('lip spray arcs clockwise from the back, forward and downward under gravity',()=>{
const g=surfGame();
for(const grain of [.1,.5,.9]){
const points=g.run(`[0,.25,.5,.75,1].map(age=>surfLipSprayPoint(${grain},age,350))`);
for(let i=1;i<points.length;i++)assert.ok(points[i].x>points[i-1].x);
assert.ok(points[1].y<points[0].y);assert.ok(points[4].y>points[3].y);assert.ok(points[4].y>points[0].y);
for(let i=1;i<points.length-1;i++)assert.ok(points[i+1].y-2*points[i].y+points[i-1].y>0);
const early={x:points[1].x-points[0].x,y:points[1].y-points[0].y},late={x:points[4].x-points[3].x,y:points[4].y-points[3].y};
assert.ok(early.x*late.y-early.y*late.x>0,'positive screen-space rotation is clockwise');
}
});

test('waterskis cost 100 crystals once and persist independently per explorer and age',()=>{
const g=game();g.run('state.crystals=99;buyWaterskis()');assert.equal(g.run('state.waterskis'),false);assert.equal(g.run('state.crystals'),99);
g.run('state.crystals=125;buyWaterskis();buyWaterskis()');assert.equal(g.run('state.crystals'),25);assert.equal(g.run('state.waterskis'),true);
const restored=game(null,g.snapshot());assert.equal(restored.run('state.waterskis'),true);assert.equal(restored.run('state.crystals'),25);
g.run("switchAge('7-8')");assert.equal(g.run('state.waterskis'),false);g.run("switchAge('11-12')");assert.equal(g.run('state.waterskis'),true);
g.node('#profileName').value='Skier';g.run('createProfile()');assert.equal(g.run('state.waterskis'),false);
});

test('watersports dock offers separate owned-equipment actions that launch directly',()=>{
for(const equipment of ['wakeboard','waterskis']){
const g=game();g.run('state.wakeboard=true;state.waterskis=true;visitWatersportsDock();tick(16)');
assert.equal(g.run('wakeboardRide'),null);assert.equal(g.run('activeMapPanel'),null);
assert.equal(g.node('#mapWakeboardStart').hidden,false);assert.equal(g.node('#mapWaterskisStart').hidden,false);assert.equal(g.node('#interaction').innerHTML,'');
g.node(equipment==='waterskis'?'#mapWaterskisStart':'#mapWakeboardStart').onclick();assert.equal(g.run('wakeboardRide.equipment'),equipment);
g.run('advanceSwimming(400);draw();save()');assert.equal(g.run('!!wakeboardRide'),true);assert.equal(g.run('canWalk(state.x,state.y)'),true);
g.run('finishWakeboarding();advanceSwimming(350);draw();advanceSwimming(350)');assert.equal(g.run('swimming'),true);
}
});

test('watersports rides launch and clear the dock with the Woodland Bridge built',()=>{
for(const equipment of ['wakeboard','waterskis']){
const g=game();g.run(`state.upgrades=['bridge'];state.${equipment}=true;visitWatersportsDock();startWakeboarding('${equipment}')`);
assert.equal(g.run('wakeboardRide?.equipment'),equipment);
g.run('for(let i=0;i<150;i++)advanceSwimming(40);draw()');
assert.equal(g.run('wakeboardRide?.equipment'),equipment);
assert.equal(g.run('wakeboardCrash'),null);
}
});

test('watersports menu only purchases equipment and dock shortcuts launch the matching ride',()=>{
for(const [equipment,key] of [['wakeboard','e'],['waterskis','r']]){
const g=game();g.run('state.crystals=125');g.run('openWatersports()');assert.equal(g.run('activeSubmenu'),'water');assert.equal(g.run('activeMapPanel'),null);
g.node('#buyWakeboardDock').onclick();g.node('#buyWaterskisDock').onclick();
assert.equal(g.run('state.crystals'),0);assert.equal(g.run('wakeboardRide'),null);
g.run('visitWatersportsDock();const sportKey=(key,repeat=false,tagName="BUTTON")=>window.listeners.keydown.find(l=>!l.capture).handler({key,repeat,target:{tagName},preventDefault(){}})');
g.run(`sportKey('${key}',true);sportKey('${key}',false,'INPUT')`);assert.equal(g.run('wakeboardRide'),null);
g.run(`sportKey('${key}')`);assert.equal(g.run('wakeboardRide.equipment'),equipment);
assert.equal(g.node('#mapWakeboardStart').hidden,true);assert.equal(g.node('#mapWaterskisStart').hidden,true);
g.run('finishWakeboarding();advanceSwimming(700);swimming=false;player.x=WATERSPORTS_DOCK.x;player.y=WATERSPORTS_DOCK.y-18;updateWakeboardUI()');
assert.equal(g.node('#mapWakeboardStart').disabled,true);assert.equal(g.node('#mapWaterskisStart').disabled,true);
g.run(`sportKey('${key}')`);assert.equal(g.run('wakeboardRide'),null);
}
const html=fs.readFileSync('dist/index.html','utf8');const panel=html.match(/<section id="waterSubmenu"[\s\S]*?<\/section>/)[0];assert.doesNotMatch(html,/id="watersportsPanel"/);
assert.doesNotMatch(panel,/id="(?:startWakeboard|startWaterskis|visitWatersports|watersportsChoice)"/);
});
test('waterskis alone can launch from the dock and map action, and unowned gear cannot launch',()=>{
const g=game();g.run("visitWatersportsDock();startWakeboarding('waterskis')");assert.equal(g.run('wakeboardRide'),null);
g.run('state.waterskis=true;closeMapPanel();updateWakeboardUI()');assert.equal(g.node('#mapWakeboardStart').hidden,true);assert.equal(g.node('#mapWaterskisStart').hidden,false);
g.node('#mapWaterskisStart').onclick();assert.equal(g.run('wakeboardRide.equipment'),'waterskis');assert.match(g.node('#waterControls').textContent,/WATERSKIS/);
const h=game();h.run('state.waterskis=true;visitWatersportsDock();window.listeners.keydown.find(l=>!l.capture).handler({key:"r",repeat:false,target:{tagName:"CANVAS"},preventDefault(){}})');assert.equal(h.run('wakeboardRide.equipment'),'waterskis');
});

test('speedboat dock unlocks at 100 earned crystals for free and stays with its explorer',()=>{
const g=game();g.run('state.crystals=99;state.earnedCrystals=99;update();launchSpeedboat()');
assert.equal(g.run('speedboatUnlocked()'),false);assert.equal(g.run('boating'),false);
assert.equal(g.run('activePiers().includes(speedboatPier)'),false);
g.run('state.earnedCrystals=100;update()');assert.equal(g.run('speedboatUnlocked()'),true);assert.equal(g.run('state.crystals'),99);
assert.equal(g.run('activePiers().includes(speedboatPier)'),true);
g.run('state.crystals=0;save();switchAge("7-8")');assert.equal(g.run('speedboatUnlocked()'),true);
g.node('#resetConfirm').open=true;g.node('#confirmReset').onclick();assert.equal(g.run('speedboatUnlocked()'),true);
const restored=game(undefined,g.snapshot());assert.equal(restored.run('speedboatUnlocked()'),true);
g.node('#profileName').value='New speedboat explorer';g.run('createProfile()');assert.equal(g.run('speedboatUnlocked()'),false);
});

test('speedboat unlocks on the 100th earned crystal and migrates existing completed saves',()=>{
const g=game();g.run('state.earnedCrystals=95;state.crystals=10;openQuestion(0)');g.node('#answer').value=g.run('String(questions[0].answer)');g.run('checkAnswer()');
assert.equal(g.run('state.speedboat'),true);assert.equal(g.run('state.crystals'),15);
const legacy=game({solved:Array.from({length:100},(_,i)=>i),upgrades:[],crystals:0});assert.equal(legacy.run('speedboatUnlocked()'),true);
});

test('speedboat has three outboards and exactly 25 percent more speed at every trim',()=>{
const g=game();
for(let trim=0;trim<=5;trim++){
g.run(`activeVessel='fishing';const fishingSpeed${trim}=boatTopSpeed(${trim});activeVessel='speedboat'`);
assert.ok(Math.abs(g.run(`boatTopSpeed(${trim})/fishingSpeed${trim}`)-1.25)<1e-12);
}
g.run("let scales=0;ctx.scale=()=>scales++;drawOutboardMotors('speedboat',false)");assert.equal(g.run('scales'),3);
const distances=[];
for(const vessel of ['fishing','speedboat']){
g.run(`activeVessel='${vessel}';boating=true;state.ferryRemaining=FERRY_RIDE_DURATION;player.x=-400;player.y=1200;boatPosition={x:player.x,y:player.y};resetBoatMotion();boatMotion.velocity=boatTopSpeed();driveBoat(1000,1,0)`);
distances.push(g.run('player.x+400'));
}
assert.ok(Math.abs(distances[1]/distances[0]-1.25)<1e-8);
});

test('speedboat dock is accessible, launches clear of obstacles, and permits returning and reboarding',()=>{
const g=game({solved:[],upgrades:[],earnedCrystals:500});
g.run('player.x=SPEEDBOAT_DOCK.x;player.y=SPEEDBOAT_DOCK.y-18');assert.equal(g.run('canWalk(player.x,player.y)'),true);
assert.equal(g.run('nearby()'),104);g.run('near=nearby();interact()');assert.equal(g.run('boating'),true);assert.equal(g.run('activeVessel'),'speedboat');
assert.equal(g.run('boatPoseClear(boatPosition.x,boatPosition.y,boatMotion.heading)'),true);
g.run('advanceSwimming(550);driveBoat(1000,1,0);draw();returnBoat()');assert.equal(g.run('boating'),false);assert.equal(g.run('canWalk(player.x,player.y)'),true);
g.run('launchSpeedboat();exitBoat()');assert.equal(g.run('boating'),false);assert.equal(g.run('swimming'),false);
});

test('speedboat parking, island reloads, vessel switching, and dragon fire keep the correct vessel',()=>{
const g=game({solved:[],upgrades:[],earnedCrystals:500,ferryTicket:true,catches:{shark:5}});
g.run(`launchSpeedboat();boating=false;state.boatIsland=boatIslands[0].id;boatPosition={x:boatIslands[0].dock.x+50,y:boatIslands[0].dock.y+20};boatMotion.heading=.7;save()`);
const restored=game(undefined,g.snapshot());assert.equal(restored.run('activeVessel'),'speedboat');assert.equal(restored.run('boatPosition.x'),g.run('boatPosition.x'));
g.run('const parkedSpeed={...boatPosition};launchBoat()');assert.equal(g.run('activeVessel'),'fishing');assert.equal(g.run('speedboatPosition.x'),g.run('parkedSpeed.x'));
g.run(`boating=false;launchSpeedboat();boating=false;state.crystals=25;buyFerryTicket();boardFerry()`);assert.equal(g.run('activeVessel'),'ferry');
g.run(`petDragonPosition={x:speedboatPosition.x-60,y:speedboatPosition.y-8};petDragonFire={elapsed:200,duration:850};checkBoatDragonFireHits()`);assert.equal(g.run("boatExplosions.has('speedboat')"),true);
g.run("boatExplosions.get('speedboat').elapsed=BOAT_IGNITION_DURATION;draw()");
});

test('speedboat anchors at the beach and reloads into the same triple-outboard vessel',()=>{
const g=game({solved:[],upgrades:[],earnedCrystals:500,anchor:true});
g.run('launchSpeedboat();player.x=1200;player.y=beachShoreY(1200)-70;boatMotion.heading=.8;anchorBoatAtBeach();if(boatAnchorCasting())advanceSwimming(FISH_CAST_DURATION);advanceSwimming(900);save()');
assert.equal(g.run('onMainlandBeach()'),true);assert.equal(g.run('state.beachAnchor.vessel'),'speedboat');
const restored=game(undefined,g.snapshot());assert.equal(restored.run('activeVessel'),'speedboat');assert.equal(restored.run('canReturnToAnchoredBoat()'),true);
restored.run('returnToAnchoredBoat();advanceSwimming(900)');assert.equal(restored.run('boating'),true);assert.equal(restored.run('activeVessel'),'speedboat');
restored.run('advanceSwimming(ANCHOR_RETRIEVE_DURATION);openFishing()');assert.equal(restored.run('activeVessel'),'speedboat');assert.equal(restored.node('#stopFishing').hidden,false);
});


test('existing crystal balances unlock the speedboat without changing lifetime rewards or spending crystals',()=>{
for(const balance of [100,150,500,900,1000]){
const g=game({solved:[],upgrades:[],crystals:balance,earnedCrystals:0});
assert.equal(g.run('speedboatUnlocked()'),true);assert.equal(g.run('state.crystals'),balance);assert.equal(g.run('state.earnedCrystals'),0);
assert.equal(g.run('activePiers().includes(speedboatPier)'),true);

g.run('launchSpeedboat()');assert.equal(g.run('activeVessel'),'speedboat');assert.equal(g.run('boating'),true);
g.run('state.crystals=0;save()');assert.equal(game(undefined,g.snapshot()).run('speedboatUnlocked()'),true);
}
});

test('admin crystal grants unlock the speedboat without awarding lifetime squishies',()=>{
const g=game();g.node('#adminPassword').value='12346';g.run('applyAdminOverride()');g.node('#adminCrystalAmount').value='1000';g.run('addAdminCrystals()');
assert.equal(g.run('speedboatUnlocked()'),true);assert.equal(g.run('state.earnedCrystals'),0);assert.equal(g.run('earnedSquishies()'),0);

});


test('speedboat accelerates 25 percent faster and turns tighter at its own top speed',()=>{
const results={};
for(const vessel of ['fishing','speedboat']){
const g=game();g.run(`activeVessel='${vessel}';boating=true;state.ferryRemaining=FERRY_RIDE_DURATION;player.x=-400;player.y=1200;boatPosition={x:player.x,y:player.y};resetBoatMotion();driveBoat(1000,1,0)`);
results[vessel]={velocity:g.run('boatMotion.velocity'),distance:g.run('player.x+400')};
for(const direction of [-1,1]){
g.run(`player.x=-400;player.y=1200;boatPosition={x:player.x,y:player.y};resetBoatMotion();boatMotion.velocity=boatTopSpeed();driveBoat(100,1,${direction})`);
results[vessel]['response'+direction]=g.run('Math.abs(boatMotion.turnRate)');
g.run(`driveBoat(900,1,${direction})`);
results[vessel]['radius'+direction]=g.run('Math.abs(boatMotion.velocity/boatMotion.turnRate)');
assert.equal(g.run('Math.sign(boatMotion.turnRate)'),direction);
g.run('driveBoat(500,1,0)');assert.ok(g.run('Math.abs(boatMotion.turnRate)')<.08);
}
g.run('resetBoatMotion();driveBoat(500,0,1)');assert.equal(g.run('boatMotion.heading'),0);
}
assert.ok(Math.abs(results.speedboat.velocity/results.fishing.velocity-1.25)<1e-8);
assert.ok(Math.abs(results.speedboat.distance/results.fishing.distance-1.25)<1e-8);
for(const direction of [-1,1]){
assert.ok(results.speedboat['response'+direction]>results.fishing['response'+direction]*1.8);
assert.ok(results.speedboat['radius'+direction]<results.fishing['radius'+direction]*.8);
}
});


test('restoring the woodland bridge joins Sunseed and Crystal Cavern with a continuous walking route',()=>{
const g=game();g.run('const b=woodlandBridge;const bridgeX=b.x+b.w/2');
assert.equal(g.run('inside(bridgeX,b.y,islandPolys[2])'),true);
assert.equal(g.run('inside(bridgeX,b.y+b.h,islandPolys[4])'),true);
assert.equal(g.run('canWalk(bridgeX,b.y+b.h/2)'),false);
g.run('state.upgrades=["bridge"];state.ferryTicket=true;player.x=bridgeX;player.y=b.y-5');
for(const direction of [1,-1]){
for(let step=0;step<g.run('Math.ceil(woodlandBridge.h)+10');step++){
g.run(`moveExplorer(0,${direction})`);assert.equal(g.run('swimming'),false);assert.equal(g.run('!!diveAnimation'),false);
assert.equal(g.run('canWalk(player.x,player.y)'),true);
}
assert.equal(g.run(`inside(player.x,player.y,islandPolys[${direction===1?4:2}])`),true);
}
assert.equal(g.run('canWalk(297,290)'),false);
g.run('state.ferryTicket=false');assert.equal(g.run('canWalk(bridgeX,b.y+b.h)'),true);
g.run('state.ferryTicket=true;save()');const restored=game(undefined,g.snapshot());assert.equal(restored.run('state.upgrades.includes("bridge")'),true);
assert.equal(restored.run('canWalk(woodlandBridge.x+woodlandBridge.w/2,woodlandBridge.y+woodlandBridge.h/2)'),true);
g.run('draw()');
});

for(const level of ['5-6','7-8','9-10','11-12']){
test(`expanded curriculum ${level}: unique content, concept balance, correct answers and workbenches`,()=>{
const g=game(null,null,true);g.run(`switchAge('${level}')`);
const bank=JSON.parse(g.run('JSON.stringify(questions)'));
assert.equal(bank.length,200);assert.equal(new Set(bank.map(q=>q.q)).size,200);
const counts={};for(const q of bank)counts[q.skill]=(counts[q.skill]||0)+1;
assert.equal(Object.keys(counts).length,level==='5-6'?10:level==='7-8'?11:level==='11-12'?21:20,JSON.stringify(counts));
for(const count of Object.values(counts))assert.ok(level==='5-6'?count===20:level==='7-8'?count>=15&&count<=20:level==='11-12'?count>=9&&count<=10:count===10,JSON.stringify(counts));
assert.equal(g.run('locations.flatMap(l=>l.ids).length'),200);
assert.equal(g.run('locations.every(l=>l.ids.length===40)'),true);
assert.equal(g.run('JSON.stringify(locations[0].ids.slice(0,20))'),'[0,1,2,3,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35]');
for(let id=100;id<200;id++){
const q=bank[id],ns=(q.q.match(/−?\d+(?:\.\d+)?/g)||[]).map(s=>Number(s.replace('−','-')));
let expected;
if(level==='5-6'){
switch(q.skill){
case 'Counting':expected=(q.visual.match(/★/g)||[]).length;break;
case 'Number order':expected=ns[0]-1;break;
case 'Comparing numbers':expected=Math.min(...ns);break;
case 'Shapes':{const sides={triangle:3,square:4,rectangle:4,circle:0,hexagon:6};expected=sides[Object.keys(sides).find(s=>q.q.includes(s))]*(q.q.includes('two of')?2:1);break;}
case 'Number bonds to 10':expected=10-ns[0];break;
case 'Number patterns':expected=ns[3]-ns[0];break;
case 'Measuring length':expected=q.q.includes('joined')?ns[0]+ns[1]:ns[1]-ns[0];break;
case 'Reading data':expected=q.q.includes('more green')?ns[0]-ns[1]:ns[0]+ns[1];break;
default:assert.fail(q.skill);
}
}else if(level==='7-8'){
switch(q.skill){
case 'Addition within 100':case 'Money':expected=ns[0]+ns[1];break;
case 'Subtraction within 100':case 'Reading data':expected=ns[0]-ns[1];break;
case 'Multiplication':expected=ns[0]*ns[1];break;
case 'Equal sharing':case 'Halves':case 'Quarters':expected=ns[0]/ns[1];break;
case 'Time':expected=60-ns[0];break;
case 'Perimeter':expected=4*ns[0];break;
default:assert.fail(q.skill);
}
}else if(level==='9-10'){
switch(q.skill){
case 'Addition':expected=ns[0]+ns[1]+ns[2];break;
case 'Subtraction':case 'Money':expected=ns[0]-ns[1];break;
case 'Times tables':case 'Multiplication':case 'Area':expected=ns[0]*ns[1];break;
case 'Division':expected=ns[0]/ns[1];break;
case 'Adding fractions':expected=ns[0]/ns[1]+ns[2]/ns[3];break;
case 'Subtracting fractions':expected=ns[0]/ns[1]-ns[2]/ns[3];break;
case 'Unit fractions':expected=ns[1]/ns[0];break;
case 'Tenths':expected=ns[1]/ns[0];break;
case 'Perimeter':expected=2*(ns[0]+ns[1]);break;
case 'Length conversion':expected=100*ns[0]+ns[1];break;
case 'Mass conversion':expected=1000*ns[0]+ns[1];break;
case 'Number patterns':expected=(ns[1]+ns[2])/2;break;
case 'Two-step problems':expected=ns[0]*ns[1]-ns[2];break;
case 'Time conversion':expected=60*ns[0]+ns[1];break;
case 'Adding decimals':expected=ns[0]+ns[1];break;
case 'Missing numbers':expected=ns[1]/ns[0];break;
case 'Rounding':expected=Math.round(ns[0]/100)*100;break;
default:assert.fail(q.skill);
}
}else{
switch(q.skill){
case 'Multiplication':case 'Multiplying decimals':expected=ns[0]*ns[1];break;
case 'Division':expected=ns[0]/ns[1];break;
case 'Order of operations':expected=(ns[0]-ns[1])*ns[2]+ns[3];break;
case 'Negative numbers':expected=ns[0]-ns[1];break;
case 'Adding fractions':expected=ns[0]/ns[1]+ns[2]/ns[3];break;
case 'Subtracting fractions':expected=ns[0]/ns[1]-ns[2]/ns[3];break;
case 'Fractions of quantities':expected=ns[0]*ns[1]/ns[2];break;
case 'Multiplying fractions':expected=ns[0]/ns[1]/2;break;
case 'Adding decimals':expected=ns[0]+ns[1];break;
case 'Percentages':expected=ns[0]*ns[1]/100;break;
case 'Comparing values':expected=q.q.includes('smaller')?Math.min(ns[0]/100,ns[1]):Math.max(ns[0]/ns[1],ns[2]);break;
case 'Subtracting decimals':expected=ns[0]-ns[1];break;
case 'Ratios':expected=ns[2]*ns[0]/(ns[0]+ns[1]);break;
case 'Unit rates':expected=ns[0]/ns[1]*ns[2];break;
case 'One-step equations':expected=ns[0]+ns[1];break;
case 'Two-step equations':expected=(ns[2]-ns[1])/ns[0];break;
case 'Sequences':expected=ns[0]+(ns[4]-1)*(ns[1]-ns[0]);break;
case 'Area and perimeter':expected=[ns[0]*ns[1],2*(ns[0]+ns[1])];break;
case 'Volume':expected=ns[0]*ns[1]*ns[2];break;
case 'Angles':expected=180-ns[0]-ns[1];break;
default:assert.fail(q.skill);
}
}
const actual=Array.isArray(q.answer)?q.answer:[q.answer],want=Array.isArray(expected)?expected:[expected];
assert.equal(actual.length,want.length,q.q);actual.forEach((v,i)=>assert.ok(Number.isFinite(v)&&Math.abs(v-want[i])<1e-9,`${q.q}: ${v} != ${want[i]}`));
assert.equal(q.hint.length,3);assert.equal(q.steps.length,3);assert.ok(q.hint.every(h=>typeof h==='string'&&h.length>0));
g.run(`openQuestion(${id})`);assert.match(g.node('#workbench').innerHTML,/visual-result/);
g.node('#answer').value='999999';g.run('checkAnswer()');assert.equal(g.run('answerComplete'),false);
g.node('#answer').value=actual.join(',');g.run('checkAnswer();checkAnswer()');assert.equal(g.run('state.solved.length'),id-99);
}
assert.equal(g.run('state.crystals'),500);
const restored=game(null,g.snapshot());
assert.equal(restored.run('ageLevel'),['5-6','7-8'].includes(level)?'9-10':level);
restored.run(`switchAge('${level}')`);assert.equal(restored.run('state.solved.length'),100);assert.equal(restored.run('state.solved.at(-1)'),199);
});
}

test('previously completed adventures retain discoveries and unlock 100 new ones before repeat rewards',()=>{
const g=game({solved:Array.from({length:100},(_,i)=>i),upgrades:[],crystals:500,earnedCrystals:500});
assert.equal(g.run('state.solved.length'),100);assert.match(g.node('#solvedCount').textContent,/100 \/ 200/);
g.run('openQuestion(0)');g.node('#answer').value='252';g.run('checkAnswer()');assert.equal(g.run('state.crystals'),500);
g.run('visit(0)');assert.equal(g.run('active'),100);
g.node('#answer').value=g.run('String(questions[active].answer)');g.run('checkAnswer()');assert.equal(g.run('state.crystals'),505);
g.node('#nextQuestion').onclick();assert.equal(g.run('active'),101);
});


test('the fishing boat launches from normal dock actions and returns to a walkable landing',()=>{
const g=game({solved:[],upgrades:[],catches:{shark:5},sponsorshipAnnounced:true});
assert.ok(g.run('Math.hypot(fishingBoatPosition.x-fishingDock.x,fishingBoatPosition.y-fishingDock.y)')<45);
assert.equal(g.run("boatPoseClear(boatPosition.x,boatPosition.y,boatMotion.heading,'fishing')"),true);
assert.equal(g.node('#mapFishingBoat').hidden,true);
g.run('player.x=fishingDock.x;player.y=fishingDock.y-8;updateWaterControls()');
assert.equal(g.run('fishingActive'),false);assert.equal(g.node('#mapFishingBoat').hidden,false);g.node('#mapFishingBoat').onclick();
assert.equal(g.node('#mapFishingBoat').hidden,true);
assert.equal(g.run('boating'),true);assert.equal(g.run('fishingActive'),false);
assert.ok(g.run('Math.hypot(player.x-fishingDock.x,player.y-fishingDock.y)')<60);
g.run('exitBoat()');assert.equal(g.run('swimming'),false);assert.equal(g.run('player.x'),g.run('fishingDock.x'));assert.equal(g.run('canWalk(player.x,player.y)'),true);
g.run('launchBoat();player.x=1100;player.y=1400;returnBoat()');
assert.equal(g.run('player.x'),g.run('fishingDock.x'));assert.equal(g.run('player.y'),g.run('fishingDock.y-8'));
assert.ok(g.run('Math.hypot(boatPosition.x-BOAT_MOORING.x,boatPosition.y-BOAT_MOORING.y)<5'));assert.equal(g.run('boatMotion.heading'),Math.PI/2);assert.equal(g.run('boatPoseClear(boatPosition.x,boatPosition.y,boatMotion.heading)'),true);assert.equal(g.run('canWalk(player.x,player.y)'),true);
g.run('save()');const restored=game(undefined,g.snapshot());assert.equal(restored.run('boatPosition.x'),g.run('BOAT_MOORING.x'));
g.run('state.ferryTicket=true;boardFerry();returnBoat()');assert.equal(g.run('player.x'),g.run('dock.x'));
});

test('ferry expiry stops control, survives reload aboard, and returns after disembarking',()=>{
const g=game();g.run('state.crystals=25;buyFerryTicket();boardFerry();advanceSwimming(600);player.x=600;player.y=350;boatPosition={x:600,y:350};state.ferryRemaining=1;advanceSwimming(1)');
assert.equal(g.run('state.ferryRemaining'),0);assert.equal(g.run('boating'),true);assert.equal(g.node('#ferryTimeValue').textContent,'0:00');
g.run('driveBoat(1000,1,1);moveExplorer(20,0)');assert.equal(g.run('player.x'),600);assert.equal(g.run('boatMotion.velocity'),0);
const restored=game(null,g.snapshot());assert.equal(restored.run('boating'),true);assert.equal(restored.run('player.x'),600);assert.equal(restored.run('vesselHasPower()'),false);
g.run('exitBoat();advanceSwimming(FISH_CAST_DURATION)');assert.equal(g.run('boating'),false);assert.equal(g.run('boatPosition.x'),g.run('ferryBerth(dock).x'));assert.equal(g.run('canUseCurrentVessel()'),false);
});

test('ferry time pauses for fishing and dialogs, counts ashore, and recovers an abandoned ferry',()=>{
const g=game();g.run('state.crystals=25;buyFerryTicket();boardFerry();advanceSwimming(1000)');
assert.equal(g.run('state.ferryRemaining'),g.run('FERRY_RIDE_DURATION-1000'));
g.run('openFishing();advanceSwimming(2000)');assert.equal(g.run('state.ferryRemaining'),g.run('FERRY_RIDE_DURATION-1000'));
g.run('stopFishing();$("#challenge").showModal();advanceSwimming(2000);$("#challenge").close()');assert.equal(g.run('state.ferryRemaining'),g.run('FERRY_RIDE_DURATION-1000'));
g.run('player.x=boatIslands[0].dock.x+43;player.y=boatIslands[0].dock.y+15;exitBoat();if(boatAnchorCasting())advanceSwimming(FISH_CAST_DURATION)');assert.equal(g.run('boating'),false);
g.run('state.ferryRemaining=10;advanceSwimming(10)');assert.equal(g.run('state.parkedBoat'),null);assert.equal(g.run('canBoardIslandBoat()'),false);assert.equal(g.run('ferryPosition.x'),g.run('ferryBerth(dock).x'));
});

test('gas use scales with speed, stops during fishing, and cannot be reset by relaunching',()=>{
const g=game();g.run('state.catches={bass:5};state.sponsorshipAnnounced=true;launchBoat();advanceSwimming(600);player.x=-400;player.y=900;boatPosition={x:player.x,y:player.y};boatMotion.trimStep=4;boatMotion.velocity=boatTopSpeed();driveBoat(1000,1,0)');
assert.ok(Math.abs(g.run('currentProfile().fuel.fishing')-(100-100/300))<1e-7);
const gas=g.run('currentProfile().fuel.fishing');g.run('openFishing();advanceSwimming(5000);driveBoat(1000,1,0)');assert.equal(g.run('currentProfile().fuel.fishing'),gas);assert.equal(g.run('boatMotion.engineStage'),'off');
g.run('stopFishing();returnBoat();launchBoat()');assert.equal(g.run('currentProfile().fuel.fishing'),gas);
const restored=game(null,g.snapshot());assert.equal(restored.run('currentProfile().fuel.fishing'),gas);
g.run('switchAge("9-10")');assert.equal(g.run('currentProfile().fuel.fishing'),gas);
g.node('#resetBtn').onclick();g.node('#confirmReset').onclick();assert.equal(g.run('currentProfile().fuel.fishing'),gas);
});

test('empty boat stops but fishing restores its tank; ferry catches build reserve',()=>{
const g=game();g.run('state.catches={bass:5};state.sponsorshipAnnounced=true;launchBoat();advanceSwimming(600);player.x=-400;player.y=900;boatPosition={x:player.x,y:player.y};currentProfile().fuel.fishing=.001;boatMotion.velocity=140;driveBoat(1000,1,0)');
assert.equal(g.run('currentProfile().fuel.fishing'),0);assert.equal(g.run('boatMotion.engineStage'),'off');const x=g.run('player.x'),y=g.run('player.y');g.run('driveBoat(1000,1,1)');assert.equal(g.run('player.x'),x);
g.run('openFishing();hookedFish={fish:fishSpecies[6]};landHookedFish()');assert.ok(g.run('currentProfile().fuel.fishing')>=10&&g.run('currentProfile().fuel.fishing')<=15);
g.run('stopFishing();advanceSwimming(600);driveBoat(1000,1,0)');assert.ok(Math.hypot(g.run('player.x')-x,g.run('player.y')-y)>0);
g.run('returnBoat();state.crystals=25;buyFerryTicket();boardFerry();openFishing();hookedFish={fish:fishSpecies[6]};landHookedFish()');assert.ok(g.run('currentProfile().reserveGas')>=10);assert.equal(g.run('state.ferryRemaining'),g.run('FERRY_RIDE_DURATION'));
});

test('shore rewards accumulate in reserve and boarding transfers only available tank space',()=>{
const g=game();g.run('openFishing();hookedFish={fish:fishSpecies[0]};landHookedFish()');const reserve=g.run('currentProfile().reserveGas');assert.ok(reserve>=2&&reserve<=5);
g.run('state.catches={bass:5};state.sponsorshipAnnounced=true;currentProfile().fuel.fishing=99;launchBoat()');assert.equal(g.run('currentProfile().fuel.fishing'),100);assert.equal(g.run('currentProfile().reserveGas'),reserve-1);
g.run('returnBoat();state.speedboat=true;currentProfile().fuel.speedboat=10;launchSpeedboat()');assert.equal(g.run('currentProfile().fuel.speedboat'),10+reserve-1);assert.equal(g.run('currentProfile().reserveGas'),0);
});

test('fish depend on location rather than tackle, with speedboat-only deep access',()=>{
const g=game();
for(const [setup,expected] of [
['boating=false;state.fishingLure=false',['bass','salmon','catfish']],
['boating=false;state.fishingLure=true',['bass','salmon','catfish']],
['boating=true;activeVessel="ferry";player.x=600;player.y=350',['tarpon','wahoo','kingfish']],
['boating=true;activeVessel="fishing";player.x=600;player.y=350',['tarpon','wahoo','kingfish']],
['boating=true;activeVessel="speedboat";player.x=600;player.y=350',['tarpon','wahoo','kingfish']],
['boating=true;activeVessel="speedboat";player.x=-1200;player.y=900',['tuna','octopus','shark']]]){
g.run(setup);assert.deepEqual(JSON.parse(g.run('JSON.stringify(fishingTargets().map(f=>f.id))')),expected);
}
for(const x of [-1200,4500])for(const vessel of ['ferry','fishing','speedboat'])assert.equal(g.run(`boatPoseClear(${x},900,0,'${vessel}')`),vessel==='speedboat');
g.run('activeVessel="fishing";player.x=WORLD.left+WORLD.width*.14+40;player.y=900;state.ferryRemaining=0;boating=true;resetBoatMotion();moveExplorer(-200,0)');assert.ok(g.run('player.x')>g.run('WORLD.left+WORLD.width*.14'));
});

test('lifetime fish counts migrate once, survive ages and resets, and remain per explorer',()=>{
const g=game({solved:[],upgrades:[],catches:{shark:2,snook:1}});assert.equal(g.run('currentProfile().lifetimeCatches.shark'),2);
g.run('$("#sponsorship").close();openFishing();hookedFish={fish:fishSpecies[0]};landHookedFish();switchAge("9-10");hookedFish={fish:fishSpecies[0]};landHookedFish()');assert.equal(g.run('currentProfile().lifetimeCatches.bass'),2);
g.node('#resetBtn').onclick();g.node('#confirmReset').onclick();assert.equal(g.run('totalCatches()'),0);assert.equal(g.run('currentProfile().lifetimeCatches.bass'),2);
const restored=game(null,g.snapshot());assert.equal(restored.run('currentProfile().lifetimeCatches.bass'),2);assert.equal(restored.run('currentProfile().lifetimeCatches.shark'),2);assert.match(restored.node('#fishBadges').innerHTML,/Lifetime × 2/);
g.node('#profileName').value='Fresh angler';g.run('createProfile()');assert.equal(g.run('currentProfile().lifetimeCatches.bass'),undefined);assert.equal(g.run('currentProfile().fuel.fishing'),100);
});

test('coasting gas consumption is proportional to speed and stationary running engines use none',()=>{
const used=[];
for(const speed of [0,50,100]){
const g=game();g.run(`state.catches={bass:5};state.sponsorshipAnnounced=true;launchBoat();advanceSwimming(600);player.x=-400;player.y=900;boatPosition={x:player.x,y:player.y};boatMotion.velocity=${speed};driveBoat(1000,0,0)`);used.push(100-g.run('currentProfile().fuel.fishing'));
}
assert.equal(used[0],0);assert.ok(used[1]>0);assert.ok(Math.abs(used[2]/used[1]-2)<1e-8);
});

test('a live ferry parked at an ordinary dock remains reboardable after reload',()=>{
const g=game();g.run('state.crystals=25;buyFerryTicket();boardFerry();player.x=farDock.x+43;player.y=farDock.y+15;exitBoat();if(boatAnchorCasting())advanceSwimming(FISH_CAST_DURATION)');
assert.equal(g.run('boating'),false);assert.equal(g.run('state.boatIsland'),null);assert.equal(g.run('state.parkedBoat.vessel'),'ferry');
const restored=game(null,g.snapshot());assert.equal(restored.run('activeVessel'),'ferry');assert.equal(restored.run('canBoardIslandBoat()'),true);restored.run('boardOwnBoat()');assert.equal(restored.run('boating'),true);assert.equal(restored.run('state.ferryTicket'),false);
});

test('E at the ferry dock confirms ticket use with Enter or E and Escape cancels',()=>{
const g=game();g.run(`state.ferryTicket=true;player.x=dock.x;player.y=dock.y-12;near=nearby();const ferryKey=(key,repeat=false)=>window.listeners.keydown.find(l=>!l.capture).handler({key,repeat,target:{tagName:'CANVAS'},preventDefault(){}});ferryKey('e')`);
assert.equal(g.run('boating'),false);assert.equal(g.run('state.ferryTicket'),true);assert.equal(g.run('activeMapPanel'),'ferry');assert.match(g.node('#ticketInfo').textContent,/Use your ticket/);
g.run("ferryKey('e',true)");assert.equal(g.run('boating'),false);
g.run("ferryKey('Escape')");assert.equal(g.node('#ferry').hidden,true);assert.equal(g.run('state.ferryTicket'),true);
g.run("ferryKey('e');ferryKey('Enter')");assert.equal(g.run('boating'),true);assert.equal(g.run('state.ferryTicket'),false);assert.equal(g.node('#ferry').hidden,true);
const html=fs.readFileSync('dist/index.html','utf8');assert.doesNotMatch(html,/A ticket to adventure/);assert.match(html,/Enter \/ E/);assert.match(html,/class="ferry-confirmation"/);
});

test('ferry confirmation buys and boards once, with no charge on cancel or insufficient crystals',()=>{
const g=game();g.run('state.crystals=25;openFerry();closeMapPanel()');assert.equal(g.run('state.crystals'),25);assert.equal(g.run('boating'),false);
g.run('openFerry();confirmFerryBoarding();confirmFerryBoarding()');assert.equal(g.run('state.crystals'),0);assert.equal(g.run('boating'),true);assert.equal(g.run('state.ferryRemaining'),g.run('FERRY_RIDE_DURATION'));
const poor=game();poor.run('state.crystals=24;openFerry();confirmFerryBoarding()');assert.equal(poor.run('state.crystals'),24);assert.equal(poor.run('boating'),false);assert.equal(poor.node('#buyTicket').hidden,true);
});

test('restricted boats hint before deep water, avoid repeated hints, and hint again after retreating',()=>{
for(const vessel of ['fishing','ferry'])for(const side of [-1,1]){
const g=game();g.run(`boating=true;activeVessel='${vessel}';state.ferryRemaining=FERRY_RIDE_DURATION;player.x=${side<0?'WORLD.left+WORLD.width*.14+90':'WORLD.left+WORLD.width*.86-90'};player.y=900;boatPosition={x:player.x,y:player.y};resetBoatMotion();moveBoat(${side*10},0,${side<0?'Math.PI':'0'})`);
assert.match(g.node('#toast').textContent,/Only the speedboat/);
g.node('#toast').textContent='Another hint';g.run(`moveBoat(${side*2},0,${side<0?'Math.PI':'0'})`);assert.equal(g.node('#toast').textContent,'Another hint');
g.run(`player.x=0;moveBoat(2,0,0);player.x=${side<0?'WORLD.left+WORLD.width*.14+90':'WORLD.left+WORLD.width*.86-90'};moveBoat(${side*10},0,${side<0?'Math.PI':'0'})`);assert.match(g.node('#toast').textContent,/Only the speedboat/);
}
const g=game();g.run('boating=true;activeVessel="speedboat";player.x=WORLD.left+WORLD.width*.14+80;player.y=900;resetBoatMotion();moveBoat(-20,0,Math.PI)');assert.doesNotMatch(g.node('#toast').textContent,/Deep water ahead/);
});

test('boarding either owned boat at its dock hints when tank and reserve are empty',()=>{
for(const vessel of ['fishing','speedboat']){
const g=game();g.run(`state.catches={bass:5};state.sponsorshipAnnounced=true;state.speedboat=true;currentProfile().fuel.${vessel}=0;currentProfile().reserveGas=0;player.x=${vessel==='fishing'?'fishingDock':'SPEEDBOAT_DOCK'}.x;player.y=${vessel==='fishing'?'fishingDock':'SPEEDBOAT_DOCK'}.y;near=nearby();interact();${vessel==='fishing'?'$("#mapFishingBoat").onclick()':''}`);
assert.equal(g.run('boating'),true);assert.equal(g.run('activeVessel'),vessel);assert.equal(g.run('boatMotion.engineStage'),'off');assert.match(g.node('#toast').textContent,/Out of gas! Press F to catch fish and refill your tank/);
g.run('openFishing()');assert.equal(g.run('fishingActive'),true);
}
});

test('boarding empty boats uses reserve gas before deciding whether to show the hint',()=>{
for(const vessel of ['fishing','speedboat']){
const g=game();g.run(`state.catches={bass:5};state.sponsorshipAnnounced=true;state.speedboat=true;currentProfile().fuel.${vessel}=0;currentProfile().reserveGas=5;${vessel==='fishing'?'launchBoat':'launchSpeedboat'}()`);
assert.equal(g.run(`currentProfile().fuel.${vessel}`),5);assert.equal(g.run('boatMotion.engineStage'),'starting');assert.doesNotMatch(g.node('#toast').textContent,/Out of gas/);
}
});

test('full profile reset clears every age and permanent rewards while preserving identity and other players',()=>{
const g=game();
g.node('#profileName').value='Other player';g.run('createProfile();state.crystals=37;save();switchProfile("legacy")');
g.node('#profileName').value='Maya';g.node('#characterChoice').value='girl';g.run('editProfile()');
g.run(`for(const level of AGE_LEVELS){switchAge(level);state.solved=[0,1];state.crystals=150;state.earnedCrystals=200;state.upgrades=['cottage'];state.beachPass=true;state.speedboat=true;state.wakeboard=true;state.waterskis=true;state.surfBest=99;state.catches={shark:2};state.tradingTickets=5;save();}currentProfile().lifetimeCatches={shark:8};currentProfile().reserveGas=75;currentProfile().fuel={fishing:0,speedboat:3};state.power=0;save();adminMode=true;boating=true;swimming=true;pendingCast={};`);
g.node('#resetProfile').onclick();assert.match(g.node('#profileActionTitle').textContent,/Reset Maya to zero/);
g.node('#confirmProfileAction').onclick();
assert.equal(g.run('profileId'),'legacy');assert.equal(g.run('currentProfile().name'),'Maya');assert.equal(g.run('currentProfile().character'),'girl');assert.equal(g.run('ageLevel'),'11-12');
assert.equal(g.run('adminMode||boating||swimming'),false);assert.equal(g.run('pendingCast'),null);assert.equal(g.run('state.power'),100);
assert.equal(g.run('currentProfile().reserveGas'),0);assert.equal(g.run('currentProfile().fuel.fishing'),100);assert.equal(g.run('Object.keys(currentProfile().lifetimeCatches).length'),0);
const reloaded=game(null,g.snapshot());
for(const level of ['5-6','7-8','9-10','11-12']){
reloaded.run(`switchAge('${level}')`);
assert.equal(reloaded.run('state.crystals+state.earnedCrystals+state.solved.length+state.upgrades.length+state.tradingTickets+state.surfBest'),0);
assert.equal(reloaded.run('state.beachPass||state.speedboat||state.wakeboard||state.waterskis'),false);assert.equal(reloaded.run('state.catches.shark'),0);assert.equal(reloaded.run('state.squishyInventory.length'),0);
}
reloaded.run('switchProfile("p1")');assert.equal(reloaded.run('state.crystals'),37);
});

test('profile deletion removes all saves and survives reload without changing other profiles',()=>{
for(const deleting of ['legacy','p1']){
const g=game();g.run('state.crystals=35;save()');g.node('#profileName').value='Friend';g.run('createProfile();state.crystals=60;save()');
g.run(`switchProfile('${deleting}');for(const age of AGE_LEVELS)localStorage.setItem(progressKey(profileId,age),JSON.stringify({solved:[1],upgrades:[],crystals:10}));`);
g.node('#deleteProfile').onclick();g.node('#confirmProfileAction').onclick();
assert.equal(g.run('profiles.length'),1);assert.equal(g.run('profileId'),deleting==='legacy'?'p1':'legacy');
for(const age of ['5-6','7-8','9-10','11-12'])assert.equal(g.run(`localStorage.getItem(progressKey('${deleting}','${age}'))`),undefined);
const reloaded=game(null,g.snapshot());assert.equal(reloaded.run('profiles.length'),1);assert.equal(reloaded.run('state.crystals'),deleting==='legacy'?60:35);
}
});

test('deleting the final profile creates a fresh explorer without restoring legacy saves',()=>{
const g=game({solved:[0],upgrades:['cottage'],crystals:50,anchor:true});
g.node('#deleteProfile').onclick();assert.match(g.node('#profileActionDescription').textContent,/fresh Explorer/);g.node('#confirmProfileAction').onclick();
assert.equal(g.run('profiles.length'),1);assert.equal(g.run('currentProfile().name'),'Explorer');assert.equal(g.run('state.crystals'),0);assert.equal(g.run('state.beachPass'),false);
g.run('update();save()');const reloaded=game(null,g.snapshot());assert.equal(reloaded.run('profileId'),g.run('profileId'));assert.equal(reloaded.run('state.solved.length'),0);
});

test('profile management cancels safely, binds confirmation to the selected player, and waits for ferry arrival',()=>{
const g=game({solved:[0],upgrades:[],crystals:50});
for(const action of ['resetProfile','deleteProfile']){
const before=g.snapshot();g.node('#'+action).onclick();g.node('#cancelProfileAction').onclick();g.node('#confirmProfileAction').onclick();assert.deepEqual(g.snapshot(),before);assert.equal(g.run('state.crystals'),50);
}
g.node('#deleteProfile').onclick();g.node('#profileName').value='Friend';g.run('createProfile()');g.node('#confirmProfileAction').onclick();assert.equal(g.run('profiles.length'),2);
g.run('voyage={from:{x:230,y:176}}');g.node('#resetProfile').onclick();assert.equal(g.node('#profileActionConfirm').open,false);assert.match(g.node('#profileFeedback').textContent,/after the ferry arrives/);
});

test('profile management reports storage failure without removing the active player',()=>{
const g=game({solved:[0],upgrades:[],crystals:50});g.run('localStorage.removeItem=()=>{throw new Error("Storage blocked")};');
g.node('#deleteProfile').onclick();g.node('#confirmProfileAction').onclick();assert.equal(g.run('profiles.length'),1);assert.equal(g.run('state.crystals'),50);assert.match(g.node('#profileFeedback').textContent,/could not be changed/);
});

test('profile management restores removed age saves if writing the profile list fails',()=>{
const g=game({solved:[0],upgrades:[],crystals:50});g.run('save();localStorage.setItem("skyseed-v1-9-10",JSON.stringify({solved:[1],upgrades:[],crystals:20}));const originalSet=localStorage.setItem;let failOnce=true;localStorage.setItem=(key,value)=>{if(key===PROFILE_KEY&&failOnce){failOnce=false;throw new Error("Storage full");}return originalSet(key,value);};');
const before=g.snapshot();g.node('#resetProfile').onclick();g.node('#confirmProfileAction').onclick();assert.deepEqual(g.snapshot(),before);assert.equal(g.run('state.crystals'),50);assert.match(g.node('#profileFeedback').textContent,/could not be changed/);
});

test('boat banking follows turning force, reverses sides, and settles after steering',()=>{
for(const vessel of ['fishing','speedboat','ferry']){
const g=game();g.run(`boating=true;activeVessel='${vessel}';state.ferryRemaining=FERRY_RIDE_DURATION;resetBoatMotion();boatMotion.velocity=140;boatMotion.turnRate=1;for(let i=0;i<50;i++)advanceBoatMotion(20)`);
const right=g.run('boatMotion.roll');assert.ok(right>.1&&right<.5);
g.run('boatMotion.turnRate=-1;for(let i=0;i<100;i++)advanceBoatMotion(20)');
assert.ok(Math.abs(g.run('boatMotion.roll')+right)<.002);
g.run('boatMotion.turnRate=0;for(let i=0;i<150;i++)advanceBoatMotion(20)');
assert.ok(Math.abs(g.run('boatMotion.roll'))<.0001);
g.run('boatMotion.velocity=0;boatMotion.turnRate=1;for(let i=0;i<100;i++)advanceBoatMotion(20)');
assert.ok(Math.abs(g.run('boatMotion.roll'))<.0001);
assert.ok(g.run(`boatRollTarget('${vessel}',140,1)>boatRollTarget('${vessel}',20,1)`));
assert.equal(g.run(`boatRollTarget('${vessel}',-140,1)`),g.run(`-boatRollTarget('${vessel}',140,1)`));
g.run('resetBoatMotion()');assert.equal(g.run('boatMotion.roll'),0);assert.equal(g.run('boatMotion.rollVelocity'),0);
}
});

test('seated boat riders follow the full hull bank through steering reversals',()=>{
const g=game();
g.run(`let riderLimbs=[];
characterLimb=(points,color)=>riderLimbs.push({points,color});boating=true;`);
for(const heading of [0,Math.PI/4,Math.PI/2,Math.PI,Math.PI*1.5])for(const roll of [-.48,0,.48])for(const turn of [-1,1]){
g.run(`riderLimbs=[];boatMotion.turnRate=${turn};boatMotion.steering=${turn}*.5;drawSeatedBoatRider(100,200,${heading},${roll});`);
const limbs=JSON.parse(g.run('JSON.stringify(riderLimbs)'));
const project=(along,across,height)=>{
const c=Math.cos(heading),s=Math.sin(heading),cr=Math.cos(roll),sr=Math.sin(roll);
const side=across*cr+height/.85*sr,z=height/.85*cr-across*sr+Math.sin(roll)**2*26;
return [100+c*along-s*side,200+s*along+c*side-z*.85];
};
const near=(actual,expected)=>actual.forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<1e-9));
for(const [index,leg] of [[1,-1],[3,1]]){
const expected=[project(0,leg*2,0),project(4,leg*2,-1),project(5,leg*2,-4)];
limbs[index].points.forEach((point,i)=>near(point,expected[i]));
}
const arms=limbs.filter(l=>l.color==='#e4bd88'&&l.points.length===3);
assert.equal(arms.length,2);
const farSide=Math.cos(heading)>=0?-1:1;
for(const [i,side] of [[0,farSide],[1,-farSide]]){
near(arms[i].points[0],project(.6,side*3.4,5.7));
near(arms[i].points[1],project(3.2,side*3.2,2.7));
const angle=(side<0?Math.PI*.75:Math.PI*.25)+turn*.15;
near(arms[i].points[2],project(5.5+Math.sin(angle)*1.2,Math.cos(angle)*3.5,5+Math.sin(angle)*2.8));
}
const mount=limbs.find(l=>l.color==='#52676c');
near(mount.points[0],project(7,0,-1));near(mount.points[1],project(5.5,0,5));
}
});

test('boat rider heads retain their size and shape while following the banked neckline',()=>{
const g=game();
g.run(`let headMatrix=[1,0,0,1,0,0],headStack=[],heads=[];
const headMultiply=(a,b,c,d,e,f)=>{const [A,B,C,D,E,F]=headMatrix;headMatrix=[A*a+C*b,B*a+D*b,A*c+C*d,B*c+D*d,A*e+C*f+E,B*e+D*f+F];};
ctx.save=()=>headStack.push(headMatrix.slice());ctx.restore=()=>{headMatrix=headStack.pop();};
ctx.transform=headMultiply;ctx.translate=(x,y)=>headMultiply(1,0,0,1,x,y);
ctx.scale=(x,y)=>headMultiply(x,0,0,y,0,0);
ctx.rotate=a=>headMultiply(Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0);
drawBoatDriverFace=(x,y)=>heads.push({matrix:headMatrix.slice(),x,y});`);
for(const characterType of ['boy','girl'])for(let i=0;i<8;i++)for(const roll of [-.48,0,.48]){
const heading=i*Math.PI/4;
g.run(`heads=[];currentProfile().character='${characterType}';drawSeatedBoatRider(100,200,${heading},${roll});`);
const heads=JSON.parse(g.run('JSON.stringify(heads)'));
assert.equal(heads.length,1,'each rider draws one head');
const {matrix:[a,b,c,d,e,f],x,y}=heads[0];
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9);
near(a*a+b*b,1);near(c*c+d*d,1);near(a*c+b*d,0);
const vx=Math.sin(heading)*Math.sin(roll)/.85,vy=Math.cos(roll)-Math.cos(heading)*Math.sin(roll)/.85,length=Math.hypot(vx,vy);
near(a*x+c*y+e,100-8*vx-3.8*vx/length);
near(b*x+d*y+f,200-Math.sin(roll)**2*26*.85-8*vy-3.8*vy/length);
assert.equal(g.run('headStack.length'),0);
}
});

test('ferry cabin occludes the aft driver and parked wheel when the bow faces down',()=>{
const g=game();
g.run("let ferryLayers=[];drawFerryCabin=()=>ferryLayers.push('cabin');drawSeatedBoatRider=()=>ferryLayers.push('driver');drawBoatSteeringWheel=()=>ferryLayers.push('wheel');activeVessel='ferry';player.x=1100;player.y=1400;boatPosition={x:1100,y:1400};");
for(const active of [true,false])for(const roll of [-.22,0,.22])for(let i=0;i<8;i++){
const heading=i*Math.PI/4;
g.run(`ferryLayers=[];boating=${active};boatMotion.heading=${heading};boatMotion.roll=${roll};boatMotion.waveHeight=20;ferryArt(1100,1400);`);
const occupant=active?'driver':'wheel';
assert.equal(g.run('ferryLayers.join(",")'),Math.sin(heading)>0?`${occupant},cabin`:`cabin,${occupant}`,`heading ${heading}, roll ${roll}, active ${active}`);
}
});

test('covered cabin corners follow hull heading, bank, and elevation at every viewing angle',()=>{
const g=game();g.run("let cabinFaces=[];polygon=(points,color)=>cabinFaces.push({points,color});");
for(let i=0;i<8;i++)for(const roll of [-.22,0,.22]){
const heading=i*Math.PI/4;
g.run(`cabinFaces=[];drawFerryCabin(100,200,${heading},${roll});`);
const faces=JSON.parse(g.run('JSON.stringify(cabinFaces)'));
const roof=faces.filter(f=>f.color==='#bc7056').at(-1);
assert.ok(roof,'roof top remains visible');
const expected=[[-6,-12],[26,-12],[26,12],[-6,12]].map(([along,across])=>{
const side=across*Math.cos(roll)+28*Math.sin(roll);
const z=28*Math.cos(roll)-across*Math.sin(roll)+Math.sin(roll)**2*26;
return [100+Math.cos(heading)*along-Math.sin(heading)*side,200+Math.sin(heading)*along+Math.cos(heading)*side-z*.85];
});
roof.points.forEach((p,j)=>p.forEach((v,k)=>assert.ok(Math.abs(v-expected[j][k])<1e-9)));
assert.ok(faces.some(f=>f.color==='#7bb8bc'),'visible walls have windows');
assert.ok(faces.every(f=>f.points.every(p=>p.every(Number.isFinite))));
}
});

test('boat V hull facets reveal different bottom surfaces with bank and viewing angle',()=>{
const g=game();g.run("let hullFaces=[];polygon=(points,color)=>hullFaces.push({points,color});");
const bottomArea=(heading,roll)=>g.run(`hullFaces=[];beginBoatHull(0,0,${heading},'speedboat',${roll});ctx.restore();hullFaces.filter(f=>['#c2cead','#8eafa4'].includes(f.color)).reduce((total,f)=>total+Math.abs(f.points.reduce((sum,p,i)=>{const q=f.points[(i+1)%f.points.length];return sum+p[0]*q[1]-q[0]*p[1];},0))/2,0)`);
assert.equal(bottomArea(0,0),0);
assert.ok(bottomArea(0,-.48)>5);
assert.equal(bottomArea(0,.48),0);
assert.ok(bottomArea(Math.PI,.48)>5);
for(const heading of [0,Math.PI/2,Math.PI,Math.PI*1.5])for(const roll of [-.48,0,.48]){
bottomArea(heading,roll);assert.equal(g.run('hullFaces.every(f=>f.points.every(p=>p.every(Number.isFinite)))'),true);
}
g.run("boating=true;activeVessel='speedboat';boatMotion.roll=.4;draw();activeVessel='fishing';draw();activeVessel='ferry';draw()");
});

test('tow boat banks through its course and preserves roll when its rider releases',()=>{
const g=game();g.run("state.wakeboard=true;visitWatersportsDock();startWakeboarding('wakeboard');const courseTurn=WAKEBOARD_COURSE.points.find(p=>p.speed<.06&&p.distance>400);wakeboardRide.courseDistance=courseTurn.distance;wakeboardRide.heading=courseTurn.heading;advanceWakeboarding(16)");
assert.ok(Math.abs(g.run('wakeboardRide?.roll||wakeboardBoatTrip?.roll||0'))>0);
if(g.run('!!wakeboardRide'))g.run('releaseWakeboardBoat(wakeboardRide);wakeboardRide=null');
assert.ok(Number.isFinite(g.run('wakeboardBoatTrip.roll')));
g.run('advanceReturningWakeboardBoat(500);drawWatersports()');
assert.ok(Number.isFinite(g.run('wakeboardBoatTrip.roll')));
});

// Rendering resolution must not change the world coordinates used for movement and taps.
test('high-density character rendering scales backing pixels without changing the viewport',()=>{
const g=game();
for(const [width,height] of [[1280,800],[390,844]]){
g.run(`window.innerWidth=${width};window.innerHeight=${height};window.devicePixelRatio=1;resizeMap()`);
const viewport=g.run('JSON.stringify([WORLD.viewWidth,WORLD.viewHeight])');
for(const density of [2,3,4]){
g.run(`window.devicePixelRatio=${density};resizeMap()`);
assert.equal(g.run('canvas.width'),width*Math.min(density,3));
assert.equal(g.run('canvas.height'),height*Math.min(density,3));
assert.equal(g.run('JSON.stringify([WORLD.viewWidth,WORLD.viewHeight])'),viewport);
}
}
});

test('fishing hands follow mirrored casts and detailed poses replace the ordinary occupant',()=>{
const g=game();
for(const characterType of ['boy','girl'])for(const vessel of ['shore','ferry','fishing','speedboat']){
g.run(`currentProfile().character='${characterType}';boating=${vessel!='shore'};activeVessel='${vessel==='shore'?'fishing':vessel}';fishingActive=true;pendingCast=null;hookedFish=null;player.x=600;player.y=350;`);
for(const side of [-1,1]){
g.run(`fishingAim={x:fishingAngler().x+${side*120},y:fishingAngler().y-9};pendingCast={...fishingAim,elapsed:0,origin:{x:fishingAngler().x+4,y:fishingAngler().y-9}}`);
const poses=[0,100,198,400,900].map(elapsed=>g.run(`fishingCastPose({...pendingCast,elapsed:${elapsed}})`));
assert.equal(new Set(poses.map(p=>JSON.stringify(p.hand))).size,5);
assert.ok(poses[0].tip.y<poses[0].hand.y,'backswing lifts the rod on either side');
for(const pose of poses)assert.ok(Math.abs(Math.hypot(pose.tip.x-pose.hand.x,pose.tip.y-pose.hand.y)-25)<1e-9);
const before=g.run('JSON.stringify([pendingCast,fishingTime,player.facing])');
g.run(`var ordinaryCharacter=character,detailedAngler=drawFishingAngler,ordinaryDraws=0,anglerDraws=0;character=(...args)=>{if(!args[2])ordinaryDraws++;ordinaryCharacter(...args)};drawFishingAngler=(...args)=>{anglerDraws++;detailedAngler(...args)};draw();character=ordinaryCharacter;drawFishingAngler=detailedAngler;`);
assert.equal(g.run('ordinaryDraws'),0);assert.equal(g.run('anglerDraws'),1);
assert.equal(g.run('JSON.stringify([pendingCast,fishingTime,player.facing])'),before);
g.run(`pendingCast=null;hookedFish={fish:fishingTargets()[0],from:{x:fishingAngler().x+${side*120},y:380},elapsed:120,idle:120,lastPull:0,target:1/6,progress:.1};draw();`);
assert.equal(g.run('Number.isFinite(hookedFishingPose().hand.y)'),true);
}
}
});

test('swimming flutter bends knees without stretching limbs and carries splash points with the toes',()=>{
const g=game();
let kneeMotion=0,ankleMotion=0;
for(const onBoard of [false,true])for(const side of [-1,1])for(const effort of [0,.2,1]){
let previous;
for(let step=0;step<24;step++){
const phase=step*Math.PI/12;
const pose=g.run(`swimmingLegPose(${phase},${effort},${side},${onBoard})`);
assert.ok(Math.abs(Math.hypot(pose.knee.x-pose.hip.x,pose.knee.y-pose.hip.y,pose.knee.z-pose.hip.z)-6.3)<1e-9);
assert.ok(Math.abs(Math.hypot(pose.ankle.x-pose.knee.x,pose.ankle.y-pose.knee.y,pose.ankle.z-pose.knee.z)-5.8)<1e-9);
assert.ok(pose.toe.x<pose.ankle.x,'toes point back along the swimming direction');
for(const joint of ['knee','ankle','toe'])assert.equal(pose[joint].y,pose.hip.y,'flutter never splays the leg sideways');
for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2]){
const projected=g.run(`projectSwimmingLeg(swimmingLegPose(${phase},${effort},${side},${onBoard}),${heading})`);
// After the swimmer rotates, elevation changes screen y only.
const rawX=pose.toe.x*Math.cos(heading)-pose.toe.y*Math.sin(heading);
const rawY=pose.toe.x*Math.sin(heading)+pose.toe.y*Math.cos(heading);
assert.ok(Math.abs(projected.toe.x*Math.cos(heading)-projected.toe.y*Math.sin(heading)-rawX)<1e-9);
assert.ok(Math.abs(projected.toe.x*Math.sin(heading)+projected.toe.y*Math.cos(heading)-(rawY-pose.toe.z))<1e-9);
}
if(previous){kneeMotion+=Math.hypot(pose.knee.x-previous.knee.x,pose.knee.y-previous.knee.y);ankleMotion+=Math.hypot(pose.ankle.x-previous.ankle.x,pose.ankle.y-previous.ankle.y);}
previous=pose;
}
}
assert.ok(kneeMotion>0);assert.ok(ankleMotion>kneeMotion,'ankles follow the knee and add their own recovery motion');
g.run(`var originalKickSplash=drawSwimKickSplash,splashPoints=[];drawSwimKickSplash=(...args)=>splashPoints.push(args);swimMotion.phase=.7;swimMotion.effort=1;drawSwimmingCharacter(0,0);drawSwimKickSplash=originalKickSplash;`);
assert.equal(g.run('splashPoints.length'),2);
for(const [index,side] of [[0,-1],[1,1]]){
const toe=g.run(`swimmingLegPose(swimMotion.phase,swimMotion.effort,${side}).toe`);
assert.equal(g.run(`splashPoints[${index}][0]`),toe.x);
assert.equal(g.run(`splashPoints[${index}][1]`),toe.y);
}
});

test('shore poses hold the edge during the pull and join tumble to recovery without a pose jump',()=>{
const g=game();
g.run('var renderShoreExplorer=drawShoreExplorer,capturedShorePose,capturedGrips;drawShoreExplorer=(pose,normal,shake,grips,gear)=>{capturedShorePose=pose;capturedGrips=grips;renderShoreExplorer(pose,normal,shake,grips,gear)}');
for(const characterType of ['boy','girl'])for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2]){
g.run(`currentProfile().character='${characterType}';player.x=300;player.y=300;var shoreNormal={x:Math.cos(${heading}),y:Math.sin(${heading})};shoreClimb={elapsed:0,normal:shoreNormal,from:{x:300-shoreNormal.x*14,y:300-shoreNormal.y*14},edge:{x:300,y:300},to:{x:300+shoreNormal.x*8,y:300+shoreNormal.y*8}};`);
for(const t of [.3,.45,.6]){
g.run(`shoreClimb.elapsed=${t*650};drawShoreClimb()`);
for(let i=0;i<2;i++){
const side=i?1:-1,hand=g.run(`capturedGrips[${i}]`);
assert.ok(Math.abs(hand[0]-(300-Math.sin(heading)*side*3))<1e-9);
assert.ok(Math.abs(hand[1]-(300+Math.cos(heading)*side*3))<1e-9);
}
}
g.run(`shoreClimb=null;drawFastShoreTumble({elapsed:280,duration:280},${heading})`);
const landing=JSON.parse(g.run('JSON.stringify(capturedShorePose)'));
g.run(`shoreRecovery={elapsed:0,heading:${heading}};drawShoreRecovery()`);
const recovery=JSON.parse(g.run('JSON.stringify(capturedShorePose)'));
for(const key of Object.keys(landing))for(let i=0;i<3;i++)assert.ok(Math.abs(landing[key][i]-recovery[key][i])<1e-9);
const before=g.run('JSON.stringify([player,shoreRecovery])');
g.run('for(let i=0;i<5;i++)drawShoreRecovery()');assert.equal(g.run('JSON.stringify([player,shoreRecovery])'),before);
for(const elapsed of [1000,1200,1450,1570,1740,1899]){
g.run(`shoreRecovery.elapsed=${elapsed};drawShoreRecovery()`);
assert.equal(g.run('Object.values(capturedShorePose).flat().every(Number.isFinite)'),true);
}
}
});

test('side walking bends elbows forward and counter-swings the arm against the near leg',()=>{
const g=game();
for(const characterType of ['boy','girl'])for(const facing of ['left','right']){
g.run(`currentProfile().character='${characterType}';player.facing='${facing}';player.x=0;player.y=0;walkMotion.x=0;walkMotion.y=0;walkMotion.moving=true;var originalWalkingLimb=characterLimb,limbCalls=[];characterLimb=(points,color,width)=>{limbCalls.push({points,color});originalWalkingLimb(points,color,width)};walkMotion.phase=0;character(0,0);characterLimb=originalWalkingLimb;`);
const rest=g.run('limbCalls.find(c=>c.color==="#e4bd88").points');
assert.ok(rest[1][0]>rest[0][0],'elbow bends toward the face');
assert.ok(rest[2][0]>rest[0][0],'resting hand sits ahead of the shoulder');
g.run('limbCalls=[];characterLimb=(points,color,width)=>{limbCalls.push({points,color});originalWalkingLimb(points,color,width)};walkMotion.phase=Math.PI/2;character(0,0);characterLimb=originalWalkingLimb;');
const arm=g.run('limbCalls.find(c=>c.color==="#e4bd88").points'),leg=g.run('limbCalls.find(c=>c.color==="#49656a").points');
assert.ok(arm[2][0]<rest[2][0]);assert.ok(leg[2][0]>leg[0][0]);
}
});

test('shore climbing plants one knee before the trailing leg comes onto land',()=>{
const g=game();
g.run('var originalClimbRenderer=drawShoreExplorer,climbPose;drawShoreExplorer=(pose,...args)=>{climbPose=pose;originalClimbRenderer(pose,...args)}');
for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2]){
g.run(`player.x=300;player.y=300;var climbNormal={x:Math.cos(${heading}),y:Math.sin(${heading})};shoreClimb={normal:climbNormal,from:{x:300-climbNormal.x*14,y:300-climbNormal.y*14},edge:{x:300,y:300},to:{x:300,y:300},elapsed:.46*650};drawShoreClimb()`);
assert.ok(g.run('climbPose.knee1[0]>climbPose.hip[0]'),'leading knee comes forward onto the bank');
assert.ok(g.run('climbPose.knee1[2]>climbPose.hip[2]'),'leading knee lifts before planting');
assert.ok(g.run('climbPose.foot0[0]<climbPose.hip[0]-4'),'trailing leg stays extended');
assert.ok(g.run('climbPose.foot0[2]<0'),'trailing foot remains in the water');
g.run('shoreClimb.elapsed=.64*650;drawShoreClimb()');
assert.equal(g.run('climbPose.foot1[2]'),0,'leading foot plants on the bank');
const trailing=g.run('climbPose.foot0[0]');
g.run('shoreClimb.elapsed=.82*650;drawShoreClimb()');
assert.ok(g.run('climbPose.foot0[0]')>trailing,'trailing leg comes through after the leading foot plants');
assert.ok(g.run('climbPose.foot0[2]')>0);
for(let frame=0;frame<=30;frame++){
g.run(`shoreClimb.elapsed=${frame/30*650};drawShoreClimb()`);
const pose=g.run('climbPose');
for(let leg=0;leg<2;leg++){
const hip=pose['hip'+leg],knee=pose['knee'+leg],foot=pose['foot'+leg];
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
assert.ok(distance(hip,knee)+distance(knee,foot)<6.5,'climbing legs retain compact explorer proportions throughout the pull');
}
}
}
});

test('detailed water entries tuck and extend, meet the splash surface, and submerge without changing state while drawing',()=>{
const g=game();
const dive=g.run("airborneExplorerPose('dive',1)");
assert.ok(dive.hand0[2]>dive.head[2]+10,'hands lead the straight dive');
assert.ok(Math.abs(dive.hand0[1]-dive.hand1[1])<2,'hands join for a narrow entry');
const tuck=g.run("airborneExplorerPose('roll',1)");
assert.ok(tuck.knee0[2]>tuck.hip[2],'tucked knee draws toward the chest');
for(const style of ['dive','roll','backflip'])for(let frame=0;frame<=30;frame++){
const pose=g.run(`airborneExplorerPose('${style}',${frame/30})`);
for(let leg=0;leg<2;leg++){
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
assert.ok(distance(pose['hip'+leg],pose['knee'+leg])+distance(pose['knee'+leg],pose['foot'+leg])<6.5,'airborne legs retain compact explorer proportions while extending and tucking');
}
}

for(const characterType of ['boy','girl'])for(const style of ['dive','roll','backflip'])for(const [facing,dx,dy] of [['right',-30,0],['left',30,0],['up',0,30],['down',0,-30]]){
g.run(`currentProfile().character='${characterType}';player.x=600;player.y=350;player.facing='${facing}';diveAnimation={elapsed:0,style:'${style}',from:{x:600+${dx},y:350+${dy}},to:{x:600,y:350}}`);
let previousSink=-Infinity;
for(const elapsed of [0,80,220,433,434,500,560,614]){
const frame=g.run(`waterEntryFrame({...diveAnimation,elapsed:${elapsed}})`);
assert.equal(Object.values(frame.pose).flat().every(Number.isFinite),true);
if(elapsed<434)assert.ok(frame.y+frame.bottom<=350+1e-9,'airborne silhouette stays on or above the contact surface');
if(elapsed===434)assert.ok(Math.abs(frame.y+frame.bottom-350)<1e-9,'first contact matches the impact splash');
if(elapsed>=434){assert.ok(frame.y>=previousSink,'entry continues down through the waterline');previousSink=frame.y;}
if(elapsed===614)assert.ok(frame.y+frame.top>350,'the airborne body has fully submerged before resurfacing');
}
g.run('diveAnimation.elapsed=300');const before=g.run('JSON.stringify([player,diveAnimation,swimMotion])');
g.run('drawWaterEntry();drawWaterEntry()');assert.equal(g.run('JSON.stringify([player,diveAnimation,swimMotion])'),before);
}
});

test('dock jumps follow facing, clear the deck, and choose an unobstructed side when land blocks ahead',()=>{
const g=game();
g.run(`crossings.splice(0);piers.splice(0,piers.length,{x:100,y:90,w:18,h:90,dock:{x:109,y:90}});islandPolys.splice(0,islandPolys.length,[[50,0],[170,0],[170,100],[50,100]]);boatObstacles=()=>[];player.x=109;player.y=145;`);
for(const [facing,dx,dy] of [['down',0,1],['right',1,0],['left',-1,0]]){
g.run(`player.facing='${facing}'`);const to=g.run('shoreDiveTarget()');assert.ok(to);
assert.ok((to.x-109)*dx+(to.y-145)*dy>=32);
assert.equal((to.x-109)*dy-(to.y-145)*dx,0,'jump follows facing exactly');
for(let i=0;i<8;i++)assert.equal(g.run(`openSea(${to.x+Math.cos(i*Math.PI/4)*8},${to.y+Math.sin(i*Math.PI/4)*8})`),true,'landing clears the deck and land');
}
g.run("player.facing='up';boatObstacles=()=>[[[65,125],[99,125],[99,165],[65,165]]]");
const right=g.run('shoreDiveTarget()');assert.ok(right.x>109);assert.equal(right.y,145,'blocked left side sends the jumper right');
g.run('boatObstacles=()=>[[[119,125],[155,125],[155,165],[119,165]]]');
const left=g.run('shoreDiveTarget()');assert.ok(left.x<109);assert.equal(left.y,145,'blocked right side sends the jumper left');
g.run('diveFromIsland()');assert.equal(g.run('player.facing'),'left');assert.equal(g.run('diveAnimation.to.x'),left.x);
g.run('advanceSwimming(434)');assert.equal(g.run('player.x'),left.x);assert.equal(g.run('player.y'),left.y);assert.equal(g.run('!!waterEntrySplash'),true);
g.run(`swimming=false;diveAnimation=null;player.x=109;player.y=145;player.facing='up';boatObstacles=()=>[[[65,125],[99,125],[99,165],[65,165]],[[119,125],[155,125],[155,165],[119,165]]]`);
assert.equal(g.run('shoreDiveTarget()'),null);g.run('diveFromIsland()');assert.equal(g.run('swimming'),false);
});

test('dock jump draws above timber while airborne and below timber after water contact',()=>{
const g=game();
g.run(`swimming=true;player.x=600;player.y=350;diveAnimation={elapsed:100,from:{x:580,y:350},to:{x:610,y:350},style:'dive'};var entryLayers=[],realRaisedTimber=drawRaisedTimber,realEntryDrawing=drawWaterEntry;drawRaisedTimber=(...args)=>{entryLayers.push('deck');realRaisedTimber(...args)};drawWaterEntry=()=>{entryLayers.push('entry');realEntryDrawing()};draw()`);
assert.ok(g.run("entryLayers.indexOf('entry')>entryLayers.lastIndexOf('deck')"));
g.run('diveAnimation.elapsed=450;entryLayers=[];draw()');
assert.ok(g.run("entryLayers.indexOf('entry')<entryLayers.indexOf('deck')"));
assert.equal(g.run("entryLayers.filter(layer=>layer==='entry').length"),1);
});

test('gear removal reaches the head, pushes up, then releases from the hand independently of walking',()=>{
const g=game();
for(const characterType of ['boy','girl'])for(const facing of ['down','up','left','right'])for(const prone of [false,true]){
g.run(`currentProfile().character='${characterType}';player.x=600;player.y=350;player.facing='${facing}';shoreRecovery=${prone?'{elapsed:0,heading:0}':'null'};goggleToss={elapsed:0,from:{x:600,y:334},to:{x:570,y:380},owner:profileId,armSide:-1}`);
const contact=g.run('goggleRemovalPose(goggleToss,100)'),lift=g.run('goggleRemovalPose(goggleToss,180)');
assert.equal(contact.hand[1],contact.head[1],'hand reaches the strap at head height');
assert.equal(contact.gear.x,contact.head[0]);assert.equal(contact.gear.y,contact.head[1]);
assert.ok(lift.gear.y<lift.head[1]-4,'gear is pushed up off the head');
assert.equal(lift.hand[1],lift.gear.y,'gear stays in the hand during removal');
g.run('advanceGoggleToss(280)');const release=g.run('JSON.stringify(goggleToss.releaseFrom)');
assert.ok(g.run('Number.isFinite(goggleToss.releaseFrom.x)&&Number.isFinite(goggleToss.releaseFrom.y)'));
g.run('player.x+=3;player.y+=2;advanceGoggleToss(80)');assert.equal(g.run('JSON.stringify(goggleToss.releaseFrom)'),release);
const before=g.run('JSON.stringify([player,goggleToss])');g.run('drawGoggleToss();drawGoggleToss()');assert.equal(g.run('JSON.stringify([player,goggleToss])'),before);
g.run('advanceGoggleToss(100)');assert.equal(g.run('goggleArmActive()'),false,'ordinary arm returns after follow-through');
}
});

function watersportsCallGame(){
const g=game();g.run("state.wakeboard=true;state.waterskis=true;visitWatersportsDock();startWakeboarding();advanceWakeboarding(4000);releaseWakeboardBoat(wakeboardRide);wakeboardRide=null;player.x=WATERSPORTS_DOCK.x;player.y=WATERSPORTS_DOCK.y-18;updateWaterControls();");return g;
}
test('watersports dock offers a call command while the empty boat is away and restores both ride choices',()=>{
for(const input of ['button','keyboard','interact']){
const g=watersportsCallGame();
assert.equal(g.node('#mapWatersportsCall').hidden,false);
assert.equal(g.node('#mapWakeboardStart').hidden,true);
g.run('const callResources=JSON.stringify([state.crystals,currentProfile().power,boatMotion]);');
if(input==='button')g.node('#mapWatersportsCall').onclick();
else if(input==='keyboard')g.run('window.listeners.keydown.find(l=>!l.capture).handler({key:"e",repeat:false,target:{tagName:"BUTTON"},preventDefault(){}})');
else g.run('near=101;interact()');
assert.equal(g.run('wakeboardBoatTrip'),null,input);
assert.equal(g.run('wakeboardDockHeading'),Math.PI*1.5);
assert.equal(g.run('wakeboardRide'),null,'calling does not start a ride');
assert.equal(g.run('JSON.stringify([state.crystals,currentProfile().power,boatMotion])'),g.run('callResources'));
assert.equal(g.node('#mapWatersportsCall').hidden,true);
assert.equal(g.node('#mapWakeboardStart').hidden,false);
assert.equal(g.node('#mapWaterskisStart').hidden,false);
g.run("startWakeboarding('waterskis')");assert.equal(g.run('wakeboardRide.equipment'),'waterskis');
}
});
test('watersports boat call respects location, dialogs, recovery, repairs, and berth collisions',()=>{
for(const setup of ['player.x=1000','swimming=true','wakeboardCrash={elapsed:0}',"boatRepairs.set('tow',{vessel:'tow',elapsed:0})",'ferryPosition={x:590,y:265};ferryHeading=Math.PI/2',"$('#challenge').showModal()"]){
const g=watersportsCallGame();g.run(`const tripBeforeCall=JSON.stringify(wakeboardBoatTrip);${setup};callWatersportsBoat();`);
assert.equal(g.run('JSON.stringify(wakeboardBoatTrip)'),g.run('tripBeforeCall'),setup);
}
const g=game();g.run('visitWatersportsDock();updateWaterControls();callWatersportsBoat()');
assert.equal(g.node('#mapWatersportsCall').hidden,true);assert.equal(g.run('wakeboardBoatTrip'),null);
});

test('tow boat accelerates gradually with shared propulsion and keeps its motion independent',()=>{
const g=game();g.run('state.wakeboard=true;visitWatersportsDock();startWakeboarding();const ownedMotionBefore=JSON.stringify(boatMotion);advanceWakeboarding(200)');
assert.ok(Math.abs(g.run('wakeboardRide.velocity')-13)<1e-8);
assert.ok(g.run('wakeboardRide.boat.x')<590);
assert.ok(g.run('590-wakeboardRide.boat.x')<3);
g.run('for(let i=0;i<150;i++)advanceWakeboarding(40);drawWakeboardWake();drawWatersports()');
assert.equal(g.run('!!wakeboardRide'),true);
assert.ok(g.run('wakeboardRide.velocity')<=g.run("boatTopSpeed(0,'tow')"));
assert.ok(g.run('wakeboardRide.bowWake.length')>0);
assert.ok(g.run('wakeboardRide.wake.length')>0);
assert.equal(g.run('JSON.stringify(boatMotion)'),g.run('ownedMotionBefore'));
// Identical physics speed changes apply without consulting the player's selected boat.
assert.equal(g.run("boatVelocityStep(0,1,.2,'tow')"),g.run("boatVelocityStep(0,1,.2,'fishing')"));
assert.equal(g.run("boatVelocityStep(100,0,.2,'tow')"),g.run("boatVelocityStep(100,0,.2,'fishing')"));
g.run('const slowing={courseDistance:0,velocity:140};advanceTowBoatSpeed(slowing,100)');
assert.ok(g.run('slowing.velocity')>=133&&g.run('slowing.velocity')<140);
});

test('tow hull shares planing contact, wake spray, and fading samples through release and docking',()=>{
const g=game();g.run("const towSlow=boatHullWake('tow',{velocity:20}),towFast=boatHullWake('tow',{velocity:140});");
assert.ok(g.run('towFast.point(0)[0]')<g.run('towSlow.point(0)[0]'));
g.run("let towSamples={velocity:140,distance:0,steering:.2,wake:[],bowWake:[]};recordHullWake(towSamples,{x:440,y:800},{x:500,y:800},0,'tow');");
assert.equal(g.run('towSamples.wake.length'),10);
assert.equal(g.run('towSamples.bowWake.length'),20);
assert.equal(g.run('towSamples.wake.every(w=>w.y===800&&w.heading===.2)'),true);
assert.ok(g.run('towSamples.bowWake.every(w=>w.velocity===140&&w.speed>0)'));
g.run('let towSpray=0;ctx.stroke=()=>towSpray++;towSamples.bowWake.forEach(w=>w.age=100);drawBoatWake(towSamples)');
assert.ok(g.run('towSpray')>10);
g.run('state.wakeboard=true;visitWatersportsDock();startWakeboarding();for(let i=0;i<50;i++)advanceWakeboarding(40);const beforeRelease=wakeboardRide;releaseWakeboardBoat(beforeRelease);wakeboardRide=null');
assert.equal(g.run('wakeboardBoatTrip.velocity'),g.run('beforeRelease.velocity'));
assert.equal(g.run('JSON.stringify(wakeboardBoatTrip.bowWake)'),g.run('JSON.stringify(beforeRelease.bowWake)'));
g.run('const fixedSample={...wakeboardBoatTrip.bowWake[0]};advanceReturningWakeboardBoat(40)');
assert.equal(g.run('beforeRelease.bowWake[0].age'),g.run('fixedSample.age'));
assert.equal(g.run('wakeboardBoatTrip.bowWake[0].x'),g.run('fixedSample.x'));
assert.ok(g.run('wakeboardBoatTrip.bowWake[0].age')>g.run('fixedSample.age'));
g.run('for(let i=0;i<1500&&wakeboardBoatTrip;i++)advanceReturningWakeboardBoat(40)');
assert.equal(g.run('wakeboardBoatTrip'),null);
assert.equal(g.run('!!wakeboardDockWake'),true);
g.run('const dockWakeBefore=JSON.stringify(wakeboardDockWake)');g.node('#challenge').showModal();
g.run('advanceReturningWakeboardBoat(400)');assert.equal(g.run('JSON.stringify(wakeboardDockWake)'),g.run('dockWakeBefore'));g.node('#challenge').close();
g.run('advanceReturningWakeboardBoat(3600)');assert.equal(g.run('wakeboardDockWake'),null);
});

test('tow route sweeps the shared hull against boats and clears the return dock with the bridge built',()=>{
const g=game();g.run("state.upgrades=['bridge'];const routeStart=wakeboardCoursePose(600);let blockedTow={boat:{x:routeStart.x,y:routeStart.y},heading:routeStart.heading,courseDistance:600,velocity:100,steering:0,roll:0,rollVelocity:0,wake:[],bowWake:[]};const blockingFerry=wakeboardCoursePose(675);ferryPosition={x:blockingFerry.x,y:blockingFerry.y};ferryHeading=blockingFerry.heading;advanceTowBoatRoute(blockedTow,500)");
assert.equal(g.run('blockedTow.velocity'),0);
assert.equal(g.run('blockedTow.courseDistance'),600);
g.run('ferryPosition={x:3000,y:1500};for(let i=0;i<20;i++)advanceTowBoatRoute(blockedTow,16)');
assert.ok(g.run('blockedTow.courseDistance')>600);
assert.equal(g.run("(()=>{for(let d=WAKEBOARD_COURSE.length-220;d<WAKEBOARD_COURSE.length;d+=.1){const p=wakeboardCoursePose(d);if(!boatPoseClear(p.x,p.y,p.heading,'tow'))return false;}return true;})()"),true);
assert.equal(g.run("(()=>{for(let i=0;i<=1000;i++){const t=i/1000,e=t*t*(3-2*t);if(!boatPoseClear(590+Math.sin(t*Math.PI)**2*12,299+(WATERSPORTS_DOCK.y+18-299)*e,Math.PI+Math.PI/2*e,'tow'))return false;}return true;})()"),true);
});

test('free boat repairs time arrival, staged construction, exact completion and crew departure for every hull',()=>{
for(const vessel of ['fishing','tow','speedboat','ferry']){
const g=game();g.run(`const vessel='${vessel}';state.catches={bass:5};state.speedboat=true;state.crystals=123;state.wakeboard=true;state.waterskis=true;state.ferryTicket=true;state.ferryRemaining=90000;currentProfile().fuel={fishing:17,speedboat:23};currentProfile().reserveGas=11;
const target=boatRepairHome(vessel).berth;petDragonPosition={x:target.x-60,y:target.y-8};petDragonFire={elapsed:200,duration:850};checkBoatDragonFireHits();petDragonFire=null;nextPetDragonFire=1e9;
advancePetDragonFire(BOAT_EXPLOSION_DURATION);const repair=boatRepairs.get(vessel);`);
assert.ok(g.run('repair'));assert.equal(g.run('boatRepairFrame(repair).phase'),'arriving');assert.equal(g.run('repair.elapsed'),0);
g.run('advancePetDragonFire(BOAT_REPAIR_TIMING.arrival-1)');assert.equal(g.run('boatRepairFrame(repair).phase'),'arriving');
g.run('advancePetDragonFire(1)');assert.equal(g.run('boatRepairFrame(repair).progress'),0);
for(const progress of [.1,.4,.8,.97]){
g.run(`repair.elapsed=BOAT_REPAIR_TIMING.arrival+BOAT_REPAIR_TIMING[vessel]*${progress};constBefore=JSON.stringify(repair);drawBoatRepairs();draw();`);
assert.equal(g.run('JSON.stringify(repair)'),g.run('constBefore'));assert.equal(g.run('boatRepairFrame(repair).phase'),'building');
}
g.run('repair.elapsed=BOAT_REPAIR_TIMING.arrival+BOAT_REPAIR_TIMING[vessel]-1;advancePetDragonFire(0)');assert.equal(g.run('boatUnavailable(vessel)'),true);
g.run('advancePetDragonFire(1)');assert.equal(g.run('boatUnavailable(vessel)'),false);assert.equal(g.run('boatRepairFrame(repair).phase'),'departing');
assert.equal(g.run('state.crystals'),123);assert.equal(g.run('JSON.stringify(currentProfile().fuel)'),'{"fishing":17,"speedboat":23}');assert.equal(g.run('currentProfile().reserveGas'),11);
assert.equal(g.run('state.ferryTicket'),true);assert.equal(g.run('state.ferryRemaining'),90000);assert.equal(g.run('state.wakeboard&&state.waterskis&&sponsored()&&speedboatUnlocked()'),true);
if(vessel!=='tow')assert.equal(g.run('JSON.stringify(vesselPose(vessel).slice(0,2))'),g.run('JSON.stringify([target.x,target.y])'));
g.run('advancePetDragonFire(BOAT_REPAIR_TIMING.departure-1)');assert.equal(g.run('boatRepairs.has(vessel)'),true);
g.run('advancePetDragonFire(1)');assert.equal(g.run('boatRepairs.has(vessel)'),false);
}
const g=game();assert.equal(g.run('BOAT_REPAIR_TIMING.fishing'),20000);assert.equal(g.run('BOAT_REPAIR_TIMING.fishing<BOAT_REPAIR_TIMING.tow&&BOAT_REPAIR_TIMING.tow<BOAT_REPAIR_TIMING.speedboat&&BOAT_REPAIR_TIMING.speedboat<BOAT_REPAIR_TIMING.ferry'),true);
});

test('simultaneous repairs advance offscreen through other activity dispatch and pause all animation for modals',()=>{
const g=game();g.run(`nextPetDragonFire=1e9;const vessels=['fishing','tow','speedboat','ferry'];
for(const vessel of vessels)boatExplosions.set(vessel,createBoatBlast({...boatRepairHome(vessel).berth,heading:0,vessel}));
advancePetDragonFire(BOAT_EXPLOSION_DURATION+BOAT_REPAIR_TIMING.arrival+1000);`);
assert.equal(g.run('boatRepairs.size'),4);assert.equal(g.run('boatRepairFrame(boatRepairs.get("fishing")).progress'),.05);
g.node('#challenge').open=true;g.run('const before=JSON.stringify([...boatRepairs]);advanceSwimming(5000);draw();');assert.equal(g.run('JSON.stringify([...boatRepairs])'),g.run('before'));
g.node('#challenge').open=false;
// An anchor animation used to return before the dragon effects update.
g.run(`boating=true;boatPosition={x:1200,y:1400};player.x=1200;player.y=1400;throwBoatAnchor();advanceSwimming(1000);`);
assert.equal(g.run('boatRepairs.get("ferry").elapsed'),5000);
g.run('advancePetDragonFire(18000)');assert.equal(g.run('boatRepairs.get("fishing").complete'),true);assert.equal(g.run('boatRepairs.get("tow").complete'),false);
g.run('advancePetDragonFire(10000)');assert.equal(g.run('boatRepairs.has("fishing")'),false);assert.equal(g.run('boatRepairs.get("tow").complete'),true);
g.run('advancePetDragonFire(30000)');assert.equal(g.run('boatUnavailable("ferry")'),false);
});

test('repair availability guards dock menus, touch buttons, reboarding and watersports without spending tickets or crystals',()=>{
const g=game();g.run(`state.catches={bass:5};state.speedboat=true;state.wakeboard=true;state.waterskis=true;state.ferryTicket=true;state.crystals=200;
for(const vessel of ['fishing','tow','speedboat','ferry'])boatRepairs.set(vessel,{vessel,elapsed:4000,complete:false});
player.x=fishingDock.x;player.y=fishingDock.y;launchBoat();$('#mapFishingBoat').onclick();`);assert.equal(g.run('boating'),false);
g.run('player.x=SPEEDBOAT_DOCK.x;player.y=SPEEDBOAT_DOCK.y;launchSpeedboat()');assert.equal(g.run('boating'),false);
g.run(`player.x=dock.x;player.y=dock.y;openFerry();activeMapPanel='ferry';confirmFerryBoarding();boardFerry()`);assert.equal(g.run('boating'),false);assert.equal(g.run('state.ferryTicket'),true);assert.equal(g.run('state.crystals'),200);
g.run(`activeVessel='fishing';swimming=true;player.x=boatPosition.x;player.y=boatPosition.y;boardOwnBoat()`);assert.equal(g.run('boating'),false);
g.run(`swimming=false;player.x=WATERSPORTS_DOCK.x;player.y=WATERSPORTS_DOCK.y;startWakeboarding();startWakeboarding('waterskis');updateWakeboardUI()`);assert.equal(g.run('wakeboardRide'),null);assert.equal(g.node('#mapWakeboardStart').disabled,true);assert.equal(g.node('#mapWaterskisStart').disabled,true);
g.run(`advancePetDragonFire(BOAT_REPAIR_TIMING.arrival+BOAT_REPAIR_TIMING.ferry);player.x=fishingDock.x;player.y=fishingDock.y;launchBoat()`);assert.equal(g.run('boating'),true);
});

test('offshore occupied and beach-moored destruction clears anchors and reloads safely at one home boat',()=>{
for(const vessel of ['fishing','speedboat','ferry'])for(const anchored of [false,true]){
const g=game();g.run(`const vessel='${vessel}';state.catches={bass:5};state.speedboat=true;state.beachPass=true;state.ferryRemaining=90000;
activeVessel=vessel;boatPosition={x:1100,y:1400};player.x=1100;player.y=1400;boating=${!anchored};swimming=false;
state.boatIsland='test';state.parkedBoat={...boatPosition,vessel,heading:1};state.beachAnchor=${anchored?'{...boatPosition,vessel,heading:1,landing:{x:1100,y:1390}}':'null'};
boatAnchor={x:1080,y:1400,elapsed:900};petDragonPosition={x:1040,y:1392};petDragonFire={elapsed:200,duration:850};checkBoatDragonFireHits();petDragonFire=null;nextPetDragonFire=1e9;`);
assert.equal(g.run('boatExplosions.get(vessel).x'),1100);assert.equal(g.run('state.beachAnchor'),null);assert.equal(g.run('boatAnchor'),null);assert.equal(g.run('state.boatIsland'),null);assert.equal(g.run('boating'),false);
if(!anchored)assert.equal(g.run('swimming'),true);
assert.equal(g.run('boatPosition.x'),g.run('boatRepairHome(vessel).berth.x'));
g.run('advancePetDragonFire(BOAT_EXPLOSION_DURATION+4500);save()');
const restored=game(undefined,g.snapshot());assert.equal(restored.run('boatRepairs.size+boatExplosions.size'),0);assert.equal(restored.run('boating'),false);assert.equal(restored.run('canWalk(player.x,player.y)'),true);assert.equal(restored.run('state.beachAnchor'),null);
assert.equal(restored.run(`vesselPose('${vessel}')[0]`),g.run('boatRepairHome(vessel).berth.x'));
g.run('advancePetDragonFire(BOAT_REPAIR_TIMING.arrival+BOAT_REPAIR_TIMING[vessel]);draw()');assert.equal(g.run('boating'),false);assert.equal(g.run('boatUnavailable(vessel)'),false);
}
});

test('repairs clear on age, profile, adventure and full profile resets without carrying crews to another save',()=>{
for(const reset of ["switchAge('9-10')","$('#profileName').value='Repair tester';createProfile()","$('#resetConfirm').open=true;$('#confirmReset').onclick()","pendingProfileAction={action:'reset',id:profileId};$('#profileActionConfirm').open=true;confirmProfileAction()"]){
const g=game();g.run(`for(const vessel of ['fishing','tow','speedboat','ferry'])boatRepairs.set(vessel,{vessel,elapsed:7000,complete:false});${reset}`);
assert.equal(g.run('boatRepairs.size'),0,reset);assert.equal(g.run('boatExplosions.size'),0,reset);assert.equal(g.run('canWalk(player.x,player.y)'),true,reset);
}
});

test('destroyed occupied tow boat cancels the ride permanently and repair does not restart fishing or towing',()=>{
const g=game();g.run(`state.wakeboard=true;state.waterskis=true;player.x=1100;player.y=1400;
wakeboardRide={boat:{x:1150,y:1400},heading:0,safe:{x:550,y:229},wake:[],bowWake:[]};
petDragonPosition={x:1090,y:1392};petDragonFire={elapsed:200,duration:850};checkBoatDragonFireHits();petDragonFire=null;nextPetDragonFire=1e9;`);
assert.equal(g.run('boatExplosions.has("tow")'),true);assert.equal(g.run('swimming'),true);assert.equal(g.run('wakeboardRide'),null);assert.equal(g.run('wakeboardBoatTrip'),null);
g.run('advancePetDragonFire(BOAT_EXPLOSION_DURATION+BOAT_REPAIR_TIMING.arrival+BOAT_REPAIR_TIMING.tow);draw()');assert.equal(g.run('wakeboardRide'),null);assert.equal(g.run('wakeboardBoatTrip'),null);assert.equal(g.run('fishingActive'),false);assert.equal(g.run('state.wakeboard&&state.waterskis'),true);
});

test('boat construction renders each feature in two steps and installs outboards individually after the wheel',()=>{
for(const vessel of ['fishing','tow','speedboat','ferry']){
const g=game();g.run(`const vessel='${vessel}',repair={vessel,elapsed:0,complete:false};boatRepairs.set(vessel,repair);const plan=boatBuildPlan(vessel);let shapes=[],strokes=[];const realPolygon=polygon,realLimb=characterLimb;polygon=(points,color,...rest)=>{shapes.push({points,color});realPolygon(points,color,...rest);};characterLimb=(points,color,...rest)=>{strokes.push({points,color});realLimb(points,color,...rest);};`);
const plan=JSON.parse(g.run('JSON.stringify(plan)'));
for(let index=0;index<plan.length;index++)for(let half=0;half<2;half++){
g.run(`repair.elapsed=BOAT_REPAIR_TIMING.arrival+(${index*2+half}+.25)/(plan.length*2)*BOAT_REPAIR_TIMING[vessel];shapes=[];strokes=[];drawBoatRepairs();`);
assert.equal(g.run('boatRepairFrame(repair).feature'),plan[index]);assert.equal(g.run('boatRepairFrame(repair).featureStep'),half+1);
const enginesFinished=plan.slice(0,index).filter(p=>p.startsWith('engine')).length+(plan[index].startsWith('engine')&&half===1?1:0);
assert.equal(g.run('shapes.filter(p=>p.color==="#34494f").length'),enginesFinished,`${vessel}: ${plan[index]} ${half+1}`);
const wheelFinished=index>plan.indexOf('wheel')||index===plan.indexOf('wheel')&&half===1;
assert.equal(g.run('strokes.some(p=>p.color==="#263e48")'),wheelFinished,`${vessel} wheel stage`);
if(plan[index]==='hull')assert.equal(g.run('shapes.some(p=>p.color==="#c7a16b")'),half===1);
if(plan[index]==='paint')assert.equal(g.run('shapes.some(p=>p.color==="#e3ddd0")'),half===0);
if(vessel==='ferry'){
const flagIndex=plan.indexOf('flag');
assert.equal(g.run('shapes.some(p=>p.color==="#8266aa")'),index>=flagIndex);
if(index===flagIndex)assert.equal(g.run('shapes.find(p=>p.color==="#8266aa").points.length'),half===0?3:4);
}
}
}
});

test('repair crews parachute onto each pier, jump onto windsurfers and sail along clear water',()=>{
for(const vessel of ['fishing','speedboat','ferry','tow']){
const g=game();g.run(`const vessel='${vessel}',repair=createBoatRepair(vessel);boatRepairs.set(vessel,repair);nextPetDragonFire=1e9;`);
assert.ok(g.run('repair.crewRoutes.every(route=>route.distance>=120)'),vessel+' needs a visible sea lane');
for(const index of [0,1]){
g.run(`const crewIndex${index}=${index};`);
for(const elapsed of [0,1200,2399,2999,3000]){
g.run(`repair.elapsed=${elapsed};draw();`);
assert.equal(g.run(`boatRepairCrewPose(repair,${index}).mode`),elapsed<3000?'parachute':'work');
}
g.run('repair.elapsed=0');const initial=g.run(`boatRepairCrewPose(repair,${index}).height`);
g.run('repair.elapsed=1200');assert.ok(g.run(`boatRepairCrewPose(repair,${index}).height`)<initial);
g.run('repair.elapsed=2999');assert.equal(g.run(`boatRepairCrewPose(repair,${index}).height`),0);assert.ok(g.run(`boatRepairCrewPose(repair,${index}).canopy`)<.01);
g.run('repair.elapsed=BOAT_REPAIR_TIMING.arrival+BOAT_REPAIR_TIMING[vessel]');assert.equal(g.run(`boatRepairCrewPose(repair,${index}).mode`),'jump');
g.run('repair.elapsed+=BOAT_REPAIR_TIMING.jump/2');assert.ok(g.run(`boatRepairCrewPose(repair,${index}).height`)>20);g.run('draw()');
g.run('repair.elapsed+=BOAT_REPAIR_TIMING.jump/2');assert.equal(g.run(`boatRepairCrewPose(repair,${index}).mode`),'windsurf');assert.equal(g.run(`boatRepairCrewPose(repair,${index}).height`),0);
assert.equal(g.run(`(()=>{const route=repair.crewRoutes[${index}];for(let d=0;d<=route.distance;d+=3)if(!openSea(route.from.x+Math.cos(route.heading)*d,route.from.y+Math.sin(route.heading)*d))return false;return true;})()`),true);
g.run('repair.elapsed=BOAT_REPAIR_TIMING.arrival+BOAT_REPAIR_TIMING[vessel]+BOAT_REPAIR_TIMING.departure-1;draw()');assert.ok(g.run(`boatRepairCrewPose(repair,${index}).alpha`)<.01);
}
// Simulation, not drawing, owns departure cleanup and all pause behavior.
g.run('repair.elapsed=1000;const before=JSON.stringify(repair);draw();draw()');assert.equal(g.run('JSON.stringify(repair)'),g.run('before'));
g.node('#challenge').open=true;g.run('advancePetDragonFire(1000)');assert.equal(g.run('JSON.stringify(repair)'),g.run('before'));g.node('#challenge').open=false;
g.run('repair.elapsed=BOAT_REPAIR_TIMING.arrival+BOAT_REPAIR_TIMING[vessel]+BOAT_REPAIR_TIMING.departure-1;advancePetDragonFire(1)');assert.equal(g.run('boatRepairs.has(vessel)'),false);
}
});

test('repair workers retain the shared character renderer with suspended, working and windsurfing poses',()=>{
const g=game();g.run(`let calls=[];const sharedSprite=drawLifeguardSprite;drawLifeguardSprite=(...args)=>{calls.push(args);sharedSprite(...args);};const repair=createBoatRepair('ferry');`);
for(const elapsed of [1000,3000,63400,65000])g.run(`repair.elapsed=${elapsed};drawBoatRepairCrew(repair,boatRepairFrame(repair),-1);`);
const calls=JSON.parse(g.run('JSON.stringify(calls)'));
assert.deepEqual(calls.map(c=>c[7].pose),['parachute','parachute','work','work','jump','jump','windsurf','windsurf']);
assert.ok(calls.every(c=>c[4]===0));assert.equal(calls[2][7].work,3200);assert.equal(calls[6][7].work,null);
});


test('dragon breath burns beach umbrellas down to ash without restarting or regrowing them',()=>{
const g=game();g.run(`const umbrella=burnableUmbrellas.values().next().value;
petDragonPosition={x:umbrella.x-55,y:umbrella.y-10};petDragonFire={elapsed:200,duration:850};advancePetDragonFire(16)`);
assert.equal(g.run('umbrella.burnAge'),0);
assert.equal(g.run('[...burnableUmbrellas.values()].filter(t=>t.burnAge!==null).length'),1);
g.run(`let umbrellaSprites=0,umbrellaFlames=0;const originalUmbrellaSprite=drawBeachUmbrellaSprite;
drawBeachUmbrellaSprite=(...args)=>{umbrellaSprites++;originalUmbrellaSprite(...args)};
drawDragonFlame=()=>umbrellaFlames++;advancePetDragonFire(900);beachUmbrella(umbrella.x,umbrella.y,umbrella.color)`);
assert.equal(g.run('umbrellaSprites'),1);assert.equal(g.run('umbrellaFlames'),4);
g.run('advancePetDragonFire(TREE_BURN_DURATION);umbrellaSprites=0;umbrellaFlames=0;beachUmbrella(umbrella.x,umbrella.y,umbrella.color)');
assert.equal(g.run('umbrella.burnAge'),4200);assert.equal(g.run('umbrellaSprites'),0);assert.equal(g.run('umbrellaFlames'),0);
g.run('advancePetDragonFire(TREE_REGROW_DURATION);petDragonFire={elapsed:200,duration:850};checkDragonFireSceneryHits(burnableUmbrellas)');
assert.equal(g.run('umbrella.burnAge'),4200);assert.equal(g.run('umbrella.regrowAge'),0);
});

test('umbrella fire follows the visible plume heading and altitude, including offscreen umbrellas',()=>{
for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2]){
const g=game();g.run(`const umbrella=[...burnableUmbrellas.values()].at(-1),heading=${heading};
dragonFlight={stage:'flying',heading,altitude:30};player.x=umbrella.x-Math.cos(heading)*55;player.y=umbrella.y-10+30-Math.sin(heading)*55;
petDragonFire={elapsed:200,duration:850};advancePetDragonFire(16)`);
assert.equal(g.run('umbrella.burnAge'),0,`heading ${heading}`);
}
const g=game();g.run(`const umbrella=burnableUmbrellas.values().next().value;
petDragonPosition={x:umbrella.x-150,y:umbrella.y-10};petDragonFire={elapsed:200,duration:850};checkDragonFireSceneryHits(burnableUmbrellas)`);
assert.equal(g.run('umbrella.burnAge'),null);
g.run(`dragonFlight={stage:'flying',heading:0,altitude:100};player.x=umbrella.x-55;player.y=umbrella.y;checkDragonFireSceneryHits(burnableUmbrellas)`);
assert.equal(g.run('umbrella.burnAge'),null);
});

test('umbrella burning pauses in dialogs and clears on reload, age changes and dragon reset',()=>{
const g=game();g.run('const umbrella=burnableUmbrellas.values().next().value;umbrella.burnAge=500');
g.node('#challenge').open=true;g.run('advancePetDragonFire(500)');assert.equal(g.run('umbrella.burnAge'),500);
g.node('#challenge').open=false;g.run('advancePetDragonFire(500)');assert.equal(g.run('umbrella.burnAge'),1000);
const reloaded=game(null,g.snapshot());assert.equal(reloaded.run('[...burnableUmbrellas.values()].every(t=>t.burnAge===null)'),true);
g.run("switchAge('7-8')");assert.equal(g.run('umbrella.burnAge'),null);
g.run('umbrella.burnAge=4200;resetPetDragon()');assert.equal(g.run('umbrella.burnAge'),null);
});


test('beach discovery buildings restore energy in place, keep question context and preserve rewards on repeats',()=>{
for(const age of ['5-6','7-8','9-10','11-12']){
const g=game();g.run(`switchAge('${age}');state.beachPass=true;state.power=0`);
for(let index=0;index<3;index++){
g.run(`player.x=BEACH_DISCOVERIES[${index}].x;player.y=BEACH_DISCOVERIES[${index}].y+20;near=nearby();interact()`);
assert.equal(g.run('near'),300+index);assert.equal(g.node('#challenge').open,true);
assert.ok(g.node('#challengeCategory').textContent.startsWith(g.run(`BEACH_DISCOVERIES[${index}].name`)));
assert.equal(g.run('canWalk(player.x,player.y)'),true);
assert.equal(g.run(`canWalk(BEACH_DISCOVERIES[${index}].x,BEACH_DISCOVERIES[${index}].y-10)`),false);
const x=g.run('player.x'),y=g.run('player.y'),power=g.run('state.power');
g.node('#answer').value='incorrect';g.run('checkAnswer()');assert.equal(g.run('state.power'),power);
g.node('#answer').value=g.run("Array.isArray(questions[active].answer)?questions[active].answer.join(','):String(questions[active].answer)");g.run('checkAnswer();checkAnswer()');
assert.equal(g.run('state.power'),Math.min(100,power+50));
const crystals=g.run('state.crystals');g.run('openQuestion(active,activeBeachDiscovery)');
g.node('#answer').value=g.run("Array.isArray(questions[active].answer)?questions[active].answer.join(','):String(questions[active].answer)");g.run('checkAnswer()');
assert.equal(g.run('state.crystals'),crystals);assert.equal(g.run('state.power'),Math.min(100,power+100));
g.node('#nextQuestion').onclick();assert.equal(g.run('activeBeachDiscovery'),index);
assert.equal(g.run(`BEACH_DISCOVERIES[${index}].ids.includes(active)`),true);
g.node('#challenge').close();assert.equal(g.run('player.x'),x);assert.equal(g.run('player.y'),y);
g.run('draw()');
}
const reloaded=game(null,g.snapshot());reloaded.run(`switchAge('${age}')`);assert.equal(reloaded.run('state.power'),g.run('state.power'));
assert.equal(reloaded.run('state.solved.length'),3);
}
});

test('beach discoveries require nearby land access and are separate from beach games',()=>{
const g=game();g.run('visitBeachDiscovery(0)');assert.notEqual(g.node('#challenge').open,true);
g.run('state.beachPass=true');
for(let i=0;i<3;i++){
g.run(`player.x=BEACH_DISCOVERIES[${i}].x;player.y=BEACH_DISCOVERIES[${i}].y+20`);
assert.equal(g.run('nearbyVolleyballCourt()'),-1);assert.equal(g.run('nearbyFrisbeeHost()'),-1);
for(const flag of ['swimming','boating','beachTransfer','shoreRecovery','dragonFlight','volleyball','frisbeeGame','surfSession']){
g.run(`${flag}=true;visitBeachDiscovery(${i})`);assert.notEqual(g.node('#challenge').open,true,flag);g.run(`${flag}=false`);
}
}
g.run('state.beachPass=false;visitBeachDiscovery(2)');assert.notEqual(g.node('#challenge').open,true);
assert.equal(g.run('new Set(BEACH_DISCOVERIES.flatMap(b=>b.ids)).size'),200);
assert.equal(g.run('beachSunbathers().some(p=>BEACH_DISCOVERIES.some(b=>Math.abs(p.x-b.x)<88))'),false);
});

test('beach umbrella canopy peaks above its rim',()=>{
const g=game();g.run(`const panels=[];polygon=(points)=>panels.push(points);drawBeachUmbrellaSprite(100,100,'#85adb8')`);
const panels=JSON.parse(g.run('JSON.stringify(panels)'));
assert.equal(panels.length,6);
for(const [peak,...rim] of panels){assert.equal(peak[1],78);assert.ok(rim.every(p=>p[1]>=86));}
});

test('burning umbrellas make their own sunbathers stand, wave and flee into the ocean',()=>{
const g=game();g.run(`const umbrella=[...burnableUmbrellas.values()].at(-1),owner=beachSunbathers().find(p=>p.i===umbrella.sunbather);
sunbatherReactions.set(owner.i,{elapsed:900});
petDragonPosition={x:umbrella.x-55,y:umbrella.y-10};petDragonFire={elapsed:200,duration:850};checkDragonFireSceneryHits(burnableUmbrellas)`);
assert.equal(g.run('umbrella.burnAge'),0);
assert.equal(g.run('sunbatherReactions.get(owner.i).kind'),'fire');
assert.equal(g.run('sunbatherReactions.size'),1);
assert.equal(g.run('sunbatherReactions.get(owner.i).elapsed'),0);
for(const age of [0,250,500,900,1400]){
assert.equal(g.run(`fleeingSunbatherPose(owner,${age}).y===owner.y`),true);
g.run(`drawFleeingSunbather(owner,'#f0c896','#cb8d71',${age})`);
}
assert.equal(g.run('fleeingSunbatherPose(owner,1700).y<owner.y'),true);
assert.equal(g.run('fleeingSunbatherPose(owner,10000).swimming'),true);
assert.equal(g.run('fleeingSunbatherPose(owner,10000).y<beachShoreY(owner.x)'),true);
g.run('advanceSunbathers(10000);drawSunbather(owner,"#f0c896","#cb8d71")');
assert.equal(g.run('sunbatherReactions.get(owner.i).elapsed'),10000);
g.node('#challenge').showModal();g.run('advanceSunbathers(500)');
assert.equal(g.run('sunbatherReactions.get(owner.i).elapsed'),10000);g.node('#challenge').close();
g.run('petDragonFire.elapsed=200;checkDragonFireSceneryHits(burnableUmbrellas)');
assert.equal(g.run('sunbatherReactions.get(owner.i).elapsed'),10000);
g.run('resetPetDragon()');assert.equal(g.run('sunbatherReactions.size'),0);
});

test('dragon burns a lifeguard chair and the guard builds a reusable sandcastle lookout',()=>{
const g=game();g.run(`const chair=burnableLifeguardChairs.get(2),guard=beachLifeguards[2];
camera.x=chair.x-200;petDragonPosition={x:chair.x-55,y:chair.y-35};petDragonFire={elapsed:200,duration:850};advancePetDragonFire(16)`);
assert.equal(g.run('chair.burnAge'),0);assert.equal(g.run('guard.phase'),'jumping');
assert.equal(g.run('guard.y'),g.run('chair.y-27'));
g.run('advanceBeachLifeguards(400);drawBeachLifeguards()');assert.equal(g.run('guard.phase'),'jumping');
assert.equal(g.run('guard.y<chair.y'),true);
g.run('advanceBeachLifeguards(400);drawBeachLifeguards()');assert.equal(g.run('guard.phase'),'building');
for(const dt of [500,4500,5000,9999])g.run(`advanceBeachLifeguards(${dt});drawBeachLifeguards()`);
assert.equal(g.run('guard.phase'),'building');assert.equal(g.run('guard.sandcastle===true'),false);
g.run('advanceBeachLifeguards(1);drawBeachLifeguards()');assert.equal(g.run('guard.phase'),'castleClimbing');
g.run('advanceBeachLifeguards(750);drawBeachLifeguards();advanceBeachLifeguards(750);drawBeachLifeguards()');
assert.equal(g.run('guard.phase'),'seated');assert.equal(g.run('guard.facing'),'up');
assert.equal(g.run('guard.x'),g.run('chair.x+48'));assert.equal(g.run('guard.y'),g.run('chair.y+4'));
// The sandcastle remains the home for normal warning and return behavior.
g.run(`state.beachPass=true;boating=true;activeVessel='speedboat';guard.sprayReaction={remaining:12000,vessel:activeVessel};player.x=guard.x;player.y=beachShoreY(guard.x)-30;advanceBeachLifeguards(16)`);
assert.equal(g.run('guard.phase'),'descending');
g.run('advanceBeachLifeguards(1500);boating=false;advanceBeachLifeguards(16);advanceBeachLifeguards(5000);advanceBeachLifeguards(1500);drawBeachLifeguards()');
assert.equal(g.run('guard.phase'),'seated');assert.equal(g.run('guard.x'),g.run('chair.x+48'));
g.run('advancePetDragonFire(400000);drawBeachLifeguards()');assert.equal(g.run('chair.burnAge'),4200);assert.equal(g.run('chair.regrowAge'),0);
});

test('lifeguard construction pauses, does not restart in fire, and resets with chairs',()=>{
const g=game();g.run(`const chair=burnableLifeguardChairs.get(4);petDragonPosition={x:chair.x-55,y:chair.y-35};petDragonFire={elapsed:200,duration:850};checkDragonFireSceneryHits(burnableLifeguardChairs);advanceBeachLifeguards(1800)`);
assert.equal(g.run('beachLifeguards[4].phase'),'building');
g.node('#challenge').showModal();g.run('advanceBeachLifeguards(20000);advancePetDragonFire(20000)');
assert.equal(g.run('beachLifeguards[4].rebuild.elapsed'),1800);assert.equal(g.run('chair.burnAge'),0);g.node('#challenge').close();
g.run('checkDragonFireSceneryHits(burnableLifeguardChairs)');assert.equal(g.run('beachLifeguards[4].rebuild.elapsed'),1800);
g.run('advanceBeachLifeguards(30000)');assert.equal(g.run('beachLifeguards[4].phase'),'seated');assert.equal(g.run('beachLifeguards[4].sandcastle'),true);
g.run('resetPetDragon()');assert.equal(g.run('chair.burnAge'),null);assert.equal(g.run('beachLifeguards[4].sandcastle'),undefined);
assert.equal(g.run('beachLifeguards[4].x'),g.run('chair.x'));
g.run('chair.burnAge=500;igniteLifeguardChair(chair);switchAge("9-10")');assert.equal(g.run('chair.burnAge'),null);assert.equal(g.run('beachLifeguards[4].rebuild'),undefined);
});

test('lifeguard chair ignition jumps from the current climbing or walking position',()=>{
for(const phase of ['descending','ascending','running']){
const g=game();g.run(`const chair=burnableLifeguardChairs.get(1),guard=beachLifeguards[1];guard.phase='${phase}';guard.elapsed=750;guard.x+=40;guard.y+=10;
const expected=guard.phase==='running'?{x:guard.x,y:guard.y}:lifeguardLadderPose(chair,.5);igniteLifeguardChair(chair)`);
assert.equal(g.run('guard.rebuild.from.x'),g.run('expected.x'));assert.equal(g.run('guard.rebuild.from.y'),g.run('expected.y'));
g.run('advanceBeachLifeguards(22300)');assert.equal(g.run('guard.phase'),'seated');
}
});

test('lifeguard digging renders a continuous full-body cycle without snapping at phase changes',()=>{
const g=game();
for(const fraction of [0,.2,.34,.49,.67,.8,.9,1]){
const ms=fraction*2600;
for(const offset of [-.01,0,.01])g.run(`drawDiggingLifeguard(150,100,'#efc897',${ms+offset},.5)`);
const before=JSON.parse(g.run(`JSON.stringify(lifeguardDigPose(${ms===0?2600:ms}-.01))`));
const after=JSON.parse(g.run(`JSON.stringify(lifeguardDigPose(${ms}+.01))`));
for(const joint of ['hip','shoulder','blade'])assert.ok(Math.hypot(before[joint][0]-after[joint][0],before[joint][1]-after[joint][1])<.01,`${joint} continuity at ${fraction}`);
assert.ok(Math.abs(before.angle-after.angle)<.01);
}
// Check every animation frame, including the held scoop and released sand.
for(let ms=0;ms<=2600;ms+=16)g.run(`drawDiggingLifeguard(150,100,'#efc897',${ms},.9)`);
const press=JSON.parse(g.run('JSON.stringify(lifeguardDigPose(884))'));
const lift=JSON.parse(g.run('JSON.stringify(lifeguardDigPose(1742))'));
assert.ok(press.hip[1]>lift.hip[1]);assert.ok(press.shoulder[1]>lift.shoulder[1]);assert.ok(press.blade[1]>lift.blade[1]);
});

test('walking scenery blocks tree roots, umbrellas, chairs and the surf shack even on long moves',()=>{
const g=game({beachPass:true});
for(const target of ['[...burnableTrees.values()][0]','[...burnableUmbrellas.values()][0]','[...burnableLifeguardChairs.values()][0]']){
g.run(`var obstacle=${target};var rootY=obstacle.y+(obstacle.kind==='umbrella'?4:obstacle.kind==='lifeguardChair'?0:13*obstacle.scale)`);
assert.equal(g.run('fixedWalkingObstacleAt(obstacle.x,rootY)'),true,target);
}
g.run('player.x=SURF_SHACK.x-90;player.y=SURF_SHACK.y-10;moveExplorer(180,0)');
assert.ok(g.run('player.x<SURF_SHACK.x-35'));assert.equal(g.run('walkingHop'),null);
g.run('player.x=160;player.y=160;moveExplorer(100,-40)');assert.equal(g.run('canWalk(player.x,player.y)'),true);
});

test('walking automatically hops over sunbathers in every direction and lands on clear ground at zero energy',()=>{
for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1]]){
const g=game({beachPass:true,power:0});
g.run(`state.power=0;burnableUmbrellas.clear();var b=beachSunbathers()[0];player.x=b.x-(${dx})*26;player.y=b.y-(${dy})*26;moveExplorer(${dx}*20,${dy}*20)`);
assert.equal(g.run('!!walkingHop'),true,`${dx},${dy}`);
assert.equal(g.run('canWalk(walkingHop.to.x,walkingHop.to.y)'),true);
g.run('var landing={...walkingHop.to};advanceSwimming(walkingHop.duration/2);draw()');
assert.equal(g.run('!!walkingHop'),true);assert.equal(g.run('state.power'),0);
g.run('advanceSwimming(walkingHop.duration)');assert.equal(g.run('walkingHop'),null);
assert.equal(g.run('player.x'),g.run('landing.x'));assert.equal(g.run('player.y'),g.run('landing.y'));
assert.equal(g.run('canWalk(player.x,player.y)'),true);
}
});

test('walking hops pause, save a safe takeoff and clear when changing age or starting swimming',()=>{
const g=game({beachPass:true});g.run('var b=beachSunbathers()[0];player.x=b.x-26;player.y=b.y;moveExplorer(20,0);var takeoff={...walkingHop.from};advanceSwimming(150);save()');
assert.equal(g.run('state.x'),g.run('takeoff.x'));assert.equal(g.run('state.y'),g.run('takeoff.y'));
g.node('#challenge').showModal();g.run('advanceSwimming(500)');assert.equal(g.run('walkingHop.elapsed'),150);g.node('#challenge').close();
g.run('switchAge("9-10")');assert.equal(g.run('walkingHop'),null);
g.run('state.beachPass=true;player.x=b.x-26;player.y=b.y;moveExplorer(20,0);swimming=true;advanceSwimming(0)');assert.equal(g.run('walkingHop'),null);
});

test('walking refuses a hop with a fixed obstacle, water, locked land or a standing sunbather ahead',()=>{
const g=game({beachPass:true});g.run('var b=beachSunbathers()[0];player.x=b.x-26;player.y=b.y;burnableUmbrellas.set("test",{x:b.x+12,y:b.y-4,burnAge:null});moveExplorer(20,0)');
assert.equal(g.run('walkingHop'),null);assert.ok(g.run('player.x<b.x-10'));
g.run('burnableUmbrellas.delete("test");sunbatherReactions.set(b.i,{elapsed:1000});player.x=b.x-26;player.y=b.y+2;moveExplorer(50,0)');assert.equal(g.run('walkingHop'),null);assert.ok(g.run('player.x<b.x-9'));
g.run('sunbatherReactions.clear();player.x=b.x-26;player.y=b.y;state.beachPass=false');assert.equal(g.run('startWalkingHop(1,0)'),false);
g.run('state.beachPass=true;var actualCanWalk=canWalk;canWalk=(x,y,low)=>x>b.x+12?false:actualCanWalk(x,y,low)');assert.equal(g.run('startWalkingHop(1,0)'),false);
});


for(const vessel of ['fishing','speedboat','ferry'])test(`${vessel} exits dock approaches stern-first without throwing an anchor`,()=>{
const g=game();g.run(`state.catches={bass:5};state.speedboat=true;state.ferryRemaining=FERRY_RIDE_DURATION;activeVessel='${vessel}'`);
for(const name of ['fishingDock','dock','SPEEDBOAT_DOCK','farDock','WATERSPORTS_DOCK',...Array.from({length:12},(_,i)=>`boatIslands[${i}].dock`)]){
g.run(`(()=>{const landing=${name},berth={...boatDockBerth(landing),heading:dockedBoatPose(landing).heading};boating=true;swimming=false;player.x=berth.x+Math.cos(berth.heading)*25;player.y=berth.y+Math.sin(berth.heading)*25;boatPosition={x:player.x,y:player.y};boatMotion.heading=1.2;boatMotion.velocity=80;exitBoat();})()`);
assert.equal(g.run('boating'),false,name);assert.equal(g.run('swimming'),false,name);assert.equal(g.run('boatAnchor'),null,name);
assert.equal(g.run('boatMotion.velocity'),0);assert.equal(g.run('boatMotion.engineStage'),'off');
assert.equal(g.run('boatMotion.heading'),Math.PI/2,'parallel to the north–south pier, bow seaward');
assert.equal(g.run('boatPoseClear(boatPosition.x,boatPosition.y,boatMotion.heading)'),true,name);
assert.ok(g.run(`(boatPosition.x-${name}.x)*Math.cos(boatMotion.heading)+(boatPosition.y-${name}.y)*Math.sin(boatMotion.heading)>0`),name);
assert.equal(g.run('canWalk(player.x,player.y)'),true,name);assert.equal(g.run('player.x'),g.run(`${name}.x`));g.run('draw()');
if(name.startsWith('boatIslands')||vessel==='ferry'){assert.equal(g.run('canBoardIslandBoat()'),true,name);g.run('boardOwnBoat()');assert.equal(g.run('boating'),true,name);}
}
});
test('docks take priority over beach anchoring and offshore exits still throw anchors',()=>{
const g=game();g.run('state.catches={bass:5};state.beachPass=true;launchBoat();player.x=boatIslands[10].dock.x+80;player.y=boatIslands[10].dock.y+15;boatPosition={x:player.x,y:player.y};exitBoat()');
assert.equal(g.run('state.boatIsland'),'pearl-haven');assert.equal(g.run('state.beachAnchor'),null);assert.equal(g.run('boatAnchor'),null);
g.run('boardOwnBoat();player.x=1200;player.y=1200;boatPosition={x:player.x,y:player.y};exitBoat()');assert.equal(g.run('boatAnchorCasting()'),true);assert.equal(g.run('boating'),true);
});

test('close dock exits work from either side of the pier and choose the nearest berth',()=>{
const g=game();g.run('state.catches={bass:5};state.speedboat=true;launchBoat();player.x=fishingDock.x+40;player.y=fishingDock.y;exitBoat()');
assert.equal(g.run('player.x'),g.run('fishingDock.x'));assert.equal(g.run('boatAnchor'),null);assert.equal(g.run('boatMotion.heading'),Math.PI/2);
g.run('launchBoat();player.x=dock.x-70;player.y=dock.y+15;exitBoat()');assert.equal(g.run('player.x'),g.run('dock.x'));assert.equal(g.run('boatAnchor'),null);
});

test('parallel ferry berth at the narrow southern island survives reload and remains boardable',()=>{
const g=game();g.run('state.ferryTicket=true;boardFerry();player.x=boatIslands[10].dock.x+43;player.y=boatIslands[10].dock.y+15;exitBoat()');
const restored=game(null,g.snapshot());assert.equal(restored.run('boatMotion.heading'),Math.PI/2);assert.equal(restored.run('canBoardIslandBoat()'),true);restored.run('boardOwnBoat()');assert.equal(restored.run('boating'),true);assert.equal(restored.run('boatPoseClear(player.x,player.y,boatMotion.heading)'),true);
});

for(const vessel of ['fishing','speedboat','ferry'])test(`${vessel} moors tightly alongside the dock without hull contact`,()=>{
const g=game();g.run(`state.catches={bass:5};state.speedboat=true;activeVessel='${vessel}';fishingBoatPosition={x:1100,y:1300};speedboatPosition={x:1300,y:1300};ferryPosition={x:1500,y:1300}`);
for(const name of ['fishingDock','SPEEDBOAT_DOCK','dock','farDock','boatIslands[0].dock']){
const gap=g.run(`(()=>{const d=${name},p=dockedBoatPose(d),pier=activePiers().find(b=>b.dock===d),hull=boatHull(p.x,p.y,p.heading);return p.x<d.x?pier.x-Math.max(...hull.map(p=>p[0])):Math.min(...hull.map(p=>p[0]))-(pier.x+pier.w);})()`);
assert.ok(Math.abs(gap-(vessel==='ferry'?2.5:4))<1e-6,`${name}: gap ${gap}`);
assert.equal(g.run(`(()=>{const p=dockedBoatPose(${name});return boatPoseClear(p.x,p.y,p.heading);})()`),true);
}
});

test('saved docked ferries adopt the snug berth while offshore ferries keep their position',()=>{
for(const name of ['dock','farDock','boatIslands[0].dock']){
const g=game();g.run(`state.ferryTicket=true;boardFerry();boating=false;player.x=${name}.x;player.y=${name}.y-18;boatPosition={x:${name}.x+55,y:${name}.y+15};boatMotion.heading=0;state.boatIsland=${name}.islandId||null;save()`);
const restored=game(null,g.snapshot());assert.equal(restored.run('boatMotion.heading'),Math.PI/2);
assert.equal(restored.run(`JSON.stringify(boatPosition)`),restored.run(`JSON.stringify((()=>{const p=dockedBoatPose(${name},'ferry');return {x:p.x,y:p.y};})())`));assert.equal(restored.run('canBoardIslandBoat()'),true);
}
const offshore=game();offshore.run('state.ferryTicket=true;boardFerry();player.x=1200;player.y=1200;boatPosition={x:1200,y:1200};exitBoat();advanceSwimming(FISH_CAST_DURATION);advanceSwimming(700);save()');const restored=game(null,offshore.snapshot());assert.equal(restored.run('boatPosition.x'),1200);assert.equal(restored.run('boatPosition.y'),1200);
});

function boatWaveGame(vessel='fishing'){
const g=game();
g.run(`state.catches={bass:5};state.speedboat=true;state.ferryRemaining=FERRY_RIDE_DURATION;boating=true;activeVessel='${vessel}';resetBoatMotion();boatMotion.heading=-Math.PI/2;boatMotion.velocity=140;frame=60;
const waveTime=frame*16.667,lip=beachWaveProfile(1100,0,waveTime).front;
player.x=lip;player.y=beachWaveSurfaceY(lip,0,waveTime)+BOAT_WAKE_HULLS[activeVessel].edge[0][0]+2;boatPosition={x:player.x,y:player.y};`);
return g;
}
test('coastal boat jumps scale with lip proximity, offshore approach, speed and vessel size',()=>{
const g=boatWaveGame();
const lip=g.run('boatWaveContact(player.x,player.y,boatMotion.heading,activeVessel,0,waveTime).strength');
const face=g.run('boatWaveContact(player.x+180,player.y,boatMotion.heading,activeVessel,0,waveTime).strength');
assert.ok(lip>face*3);
const impulse=(strength,heading,velocity,vessel)=>g.run(`boatWaveImpulse(${strength},${heading},${velocity},'${vessel}')`);
const fishing=impulse(lip,-Math.PI/2,140,'fishing');
assert.ok(fishing>impulse(lip,-Math.PI/2,140,'speedboat'));
assert.ok(impulse(lip,-Math.PI/2,140,'speedboat')>impulse(lip,-Math.PI/2,140,'ferry'));
assert.ok(fishing>impulse(lip,Math.PI/2,140,'fishing')*2);
assert.ok(fishing>impulse(lip,0,140,'fishing'));
assert.ok(fishing>impulse(face,-Math.PI/2,140,'fishing'));
assert.ok(fishing>impulse(lip,-Math.PI/2,35,'fishing'));
});
test('every boat jumps higher over coastal crests at each higher trim level in both trim directions',()=>{
for(const vessel of ['fishing','speedboat','ferry']){
const heights=[];
for(let trimStep=0;trimStep<10;trimStep++){
const g=boatWaveGame(vessel);
g.run(`boatMotion.trimStep=${trimStep};advanceBoatWaves(16);player.y-=4;advanceBoatWaves(16)`);
assert.ok(g.run('boatMotion.waveVelocity')>0,`${vessel}, trim step ${trimStep}: crest launches boat`);
let peak=0;
// Keep the hull at the crossing so this measures a single ballistic jump.
for(let i=0;i<200;i++){
g.run('advanceBoatWaves(16)');
peak=Math.max(peak,g.run('boatMotion.waveHeight'));
if(g.run('boatMotion.waveHeight')===0)break;
}
assert.equal(g.run('boatMotion.waveHeight'),0,'higher trim still lands');
heights.push(peak);
}
for(let level=1;level<=5;level++)assert.ok(heights[level]>heights[level-1],`${vessel}: trim ${level} jumps higher`);
for(let step=6;step<10;step++)assert.equal(heights[step],heights[10-step],`${vessel}: lowering trim restores the same jump height`);
}
});
test('trimmed coastal landings pitch bow-up and slap spray from stern to bow on every vessel',()=>{
for(const vessel of ['fishing','speedboat','ferry'])for(const trim of [1,3,5]){
const g=boatWaveGame(vessel);
g.run(`boatMotion.trimStep=${trim};advanceBoatWaves(16);player.y-=4;advanceBoatWaves(16);advanceBoatWaves(100)`);
assert.ok(Math.abs(g.run(`boatWavePitch('${vessel}')`)-trim*.065)<1e-9);
g.run('for(let i=0;i<250&&!boatMotion.waveLanding;i++)advanceBoatWaves(16)');
assert.equal(g.run('boatMotion.waveHeight'),0);
assert.ok(g.run('boatMotion.waveLanding'));
assert.equal(g.run('boatMotion.waveLanding.duration'),100+trim*40);
assert.equal(g.run('boatMotion.waveLanding.next'),1,'stern touches first');
assert.equal(g.run('boatMotion.spray.filter(p=>p.wave&&!p.bow).length'),5);
const pitch=g.run(`boatWavePitch('${vessel}')`);
g.run('advanceBoatWaves(boatMotion.waveLanding.duration/2)');
assert.ok(g.run(`boatWavePitch('${vessel}')`)<pitch,'bow rotates toward water');
assert.equal(g.run('boatMotion.waveLanding.next'),4);
g.run('advanceBoatWaves(400)');
assert.equal(g.run('boatMotion.waveLanding'),null);
assert.equal(g.run(`boatWavePitch('${vessel}')`),0);
assert.equal(g.run('boatMotion.spray.filter(p=>p.wave&&!p.bow).length'),40);
const positions=g.run(`boatMotion.waveSplashes.map(p=>(p.x-player.x)*Math.cos(boatMotion.heading)+(p.y-player.y)*Math.sin(boatMotion.heading))`);
assert.equal(positions.length,8);
assert.equal(positions[0],g.run('BOAT_WAKE_HULLS[activeVessel].edge.at(-1)[0]'));
assert.equal(positions[7],g.run('BOAT_WAKE_HULLS[activeVessel].edge[0][0]'));
for(let i=1;i<positions.length;i++)assert.ok(positions[i]>positions[i-1]);
}
});
test('coastal landing pose restores the canvas and clears when leaving or resetting a boat',()=>{
for(const vessel of ['fishing','speedboat','ferry']){
const g=boatWaveGame(vessel);
g.run(`boatMotion.waveHeight=10;boatMotion.wavePitch=.325;boatMotion.waveFlightAge=100;
let depth=0,minDepth=0;ctx.save=()=>{depth++};ctx.restore=()=>{depth--;minDepth=Math.min(minDepth,depth)};
${vessel==='fishing'?'fishingBoatArt':vessel==='ferry'?'ferryArt':'speedboatArt'}(player.x,player.y)`);
assert.equal(g.run('depth'),0,'renderer balances its canvas saves');
assert.equal(g.run('minDepth'),0,'renderer never restores beyond its own canvas saves');
g.run('boatMotion.waveHeight=.1;boatMotion.waveVelocity=-100;advanceBoatWaves(16)');
assert.ok(g.run('boatMotion.waveLanding'));
g.run('boating=false;advanceBoatWaves(16)');
assert.equal(g.run('boatMotion.waveLanding'),null);
assert.equal(g.run(`boatWavePitch('${vessel}')`),0);
g.run('resetBoatMotion()');assert.equal(g.run(`boatWavePitch('${vessel}')`),0);
}
});
test('crossing a coastal crest throws bow spray, jumps once, and splashes at the landing position',()=>{
const g=boatWaveGame();
g.run('advanceBoatWaves(16);player.y-=4;advanceBoatWaves(16)');
assert.ok(g.run('boatMotion.waveVelocity')>50);
assert.ok(g.run('boatMotion.spray.filter(p=>p.wave).length')>0&&g.run('boatMotion.spray.length')<96);
assert.ok(Math.abs(g.run('boatMotion.spray[0].y-player.y+25'))<.001,'impact is at the bow');
g.run('const initialSpray=boatMotion.spray.length;player.y-=20;boatPosition={x:player.x,y:player.y};advanceBoatWaves(250)');
assert.ok(g.run('boatMotion.waveHeight')>10);
assert.ok(g.run('boatMotion.spray.length')>g.run('initialSpray'));
g.run('for(let i=0;i<40;i++){player.y-=2;advanceBoatWaves(16);}for(let i=0;i<120;i++)advanceBoatWaves(16)');
assert.equal(g.run('boatMotion.waveHeight'),0);
assert.equal(g.run('boatMotion.waveSerial'),2,'one impact and one landing');
assert.equal(g.run('boatMotion.spray.filter(p=>p.wave).length'),328);
assert.equal(g.run('boatMotion.spray.at(-1).y'),g.run('player.y'));
});
test('coastal jumps ignore stationary fishing and anchoring, clear on exit, and do not cross wave wraps',()=>{
for(const setup of ['boatMotion.velocity=0','fishingActive=true','boatAnchor={x:0,y:0,elapsed:0,casting:true}']){
const g=boatWaveGame();g.run(`advanceBoatWaves(16);${setup};player.y-=4;advanceBoatWaves(16)`);
assert.equal(g.run('boatMotion.waveHeight||0'),0,setup);
}
const g=boatWaveGame();g.run('advanceBoatWaves(16);player.y-=200;advanceBoatWaves(16)');
assert.equal(g.run('boatMotion.waveHeight||0'),0);
g.run('boatMotion.waveHeight=20;boatMotion.waveVelocity=30;boating=false;advanceBoatWaves(16)');
assert.equal(g.run('boatMotion.waveHeight'),0);assert.equal(g.run('boatMotion.waveContacts'),null);
g.run('resetBoatMotion()');assert.equal(g.run('boatMotion.spray.length'),0);
});
test('airborne boat render lifts the hull and rider above a water-fixed shadow without emitting wakes',()=>{
for(const vessel of ['fishing','speedboat','ferry']){
const g=boatWaveGame(vessel);
g.run(`boatMotion.waveHeight=20;boatMotion.waveVelocity=40;boatMotion.waveSplashes=[{x:player.x,y:player.y,age:100,impact:80}];
let hullY,shadowY,riderY;const originalHull=beginBoatHull,originalShadow=drawBoatShadow,originalRider=drawSeatedBoatRider;
beginBoatHull=(x,y,...args)=>{hullY=y;originalHull(x,y,...args);};drawBoatShadow=(x,y,...args)=>{shadowY=y;originalShadow(x,y,...args);};drawSeatedBoatRider=(x,y,...args)=>{riderY=y;originalRider(x,y,...args);};
${vessel==='fishing'?'fishingBoatArt':vessel==='ferry'?'ferryArt':'speedboatArt'}(player.x,player.y);
recordHullWake(boatMotion,{x:player.x-12,y:player.y},player,0,activeVessel);`);
assert.equal(g.run('shadowY'),g.run('player.y'));
assert.equal(g.run('hullY'),g.run('player.y-20'));
assert.equal(g.run('riderY'),g.run(`player.y-20-Math.sin(boatMotion.heading)*${vessel==='ferry'?19:vessel==='speedboat'?11:3}-2`));
assert.equal(g.run('boatMotion.wake.length'),0);
assert.equal(g.run('boatMotion.waveHeight'),20,'rendering does not advance flight');
}
});

test('coastal flight keeps settling while an anchor is thrown or fishing starts',()=>{
for(const mode of ['anchor','fishing']){
const g=boatWaveGame();g.run('advanceBoatWaves(16);player.y-=4;advanceBoatWaves(16)');
if(mode==='anchor')g.run("boatAnchor={x:player.x+100,y:player.y,elapsed:0,casting:true};advanceBoatAnchor(100)");
else g.run('fishingActive=true;stopBoatPropulsion();advanceBoatMotion(100)');
assert.ok(g.run('boatMotion.waveHeight')>0);
assert.equal(g.run('fishingAngler().y'),g.run('player.y-boatMotion.waveHeight'));
g.run('boatAnchor=null;for(let i=0;i<120;i++)advanceBoatMotion(16)');
assert.equal(g.run('boatMotion.waveHeight'),0);
assert.equal(g.run('boatMotion.waveSerial'),2);
}
});

test('bow wave spray renders immediately above the hull and pushes water mostly outward',()=>{
for(const vessel of ['fishing','speedboat','ferry']){
const g=boatWaveGame(vessel);
g.run('advanceBoatWaves(16);player.y-=4;advanceBoatWaves(16)');
assert.ok(g.run('boatMotion.spray.filter(p=>p.bow).length')>0&&g.run('boatMotion.spray.length')<96);
assert.ok(g.run('boatMotion.spray.every(p=>p.vz>0&&p.size>=.2)'));
assert.ok(g.run('boatMotion.spray.some(p=>p.vx<0)&&boatMotion.spray.some(p=>p.vx>0)'));
assert.ok(g.run('boatMotion.spray.every(p=>Math.abs(p.vx)>Math.abs(p.vy)*2)'), 'outward spray dominates forward carry at the offshore bow');
g.run(`let drops=0;const originalEllipse=ellipse;ellipse=(...args)=>{drops++;originalEllipse(...args);};
drawBoatTrimSpray(player.x,player.y,boatMotion.heading,activeVessel,false);`);
assert.equal(g.run('drops'),0,'bow spray is not buried under the boat');
g.run('drawBoatTrimSpray(player.x,player.y,boatMotion.heading,activeVessel,true)');
assert.equal(g.run('drops'),g.run('boatMotion.spray.length'),'droplets are visible in the impact frame');
assert.equal(g.run('boatMotion.spray[0].age'),0,'rendering does not age spray');
}
});

for(const phase of ['casting','retrieving'])test(`anchor ${phase} keeps ambient animations running while the boat waits`,()=>{
const g=game();
g.run(`state.catches={bass:5};launchBoat();player.x=600;player.y=350;boatPosition={x:600,y:350};state.surfRental=true;throwBoatAnchor();`);
if(phase==='retrieving')g.run('boatAnchor.casting=false;retrieveBoatAnchor()');
const before=g.run('({surf:surfClock,dragon:petDragonPhase,frame,wave:surfWaveY(1200,0)})');
g.run('keys.add("right");advanceSwimming(200);driveBoat(200,1,1);moveExplorer(20,0);draw()');
assert.equal(g.run('surfClock'),before.surf+200);
assert.ok(g.run('petDragonPhase')>before.dragon);
assert.equal(g.run('frame'),before.frame+1);
assert.notEqual(g.run('surfWaveY(1200,0)'),before.wave);
assert.equal(g.run('boatAnchor.'+(phase==='casting'?'elapsed':'retrieveElapsed')),200);
assert.equal(g.run('player.x'),600);assert.equal(g.run('player.y'),350);
assert.equal(g.run('boatPosition.x'),600);assert.equal(g.run('boatPosition.y'),350);
});

test('bow wave spray stays mostly lateral at every heading and in reverse',()=>{
const g=boatWaveGame();
for(const heading of [0,Math.PI/4,Math.PI/2,Math.PI,Math.PI*1.5])for(const velocity of [-70,35,140,206.5]){
g.run(`boatMotion.spray=[];boatMotion.velocity=${velocity};emitBoatWaveSpray(player.x,player.y,${heading},80)`);
assert.ok(g.run(`boatMotion.spray.every(p=>Math.abs(-Math.sin(${heading})*p.vx+Math.cos(${heading})*p.vy)>Math.abs(Math.cos(${heading})*p.vx+Math.sin(${heading})*p.vy)*2)`), `heading ${heading}, speed ${velocity}`);
}
});

test('wave impact spray forms a dense sheet along both sides of the full hull',()=>{
for(const vessel of ['fishing','speedboat','ferry'])for(const heading of [0,Math.PI/4,Math.PI/2,Math.PI]){
const g=boatWaveGame(vessel);
g.run(`boatMotion.heading=${heading};emitBoatWaveSpray(player.x,player.y,boatMotion.heading,80);
const c=Math.cos(boatMotion.heading),s=Math.sin(boatMotion.heading),hull=BOAT_WAKE_HULLS[activeVessel].edge;
const along=boatMotion.spray.map(p=>(p.x-player.x)*c+(p.y-player.y)*s);
const across=boatMotion.spray.map(p=>-(p.x-player.x)*s+(p.y-player.y)*c);`);
const length=g.run('hull[0][0]-hull.at(-1)[0]');
assert.ok(g.run('boatMotion.spray.length')>=length*2);
assert.ok(Math.abs(g.run('Math.max(...along)'))<1e-8);
assert.ok(Math.abs(g.run('Math.min(...along)')+length)<1e-8);
for(let section=0;section<4;section++)for(const side of [-1,1]){
assert.ok(g.run(`along.some((a,i)=>a<=-${length*section/4}+1e-8&&a>=-${length*(section+1)/4}-1e-8&&across[i]*${side}>0)`), `${vessel}: section ${section}, side ${side}`);
}
}
});

test('outward wave spray clears the passing hull and is masked behind the raised deck',()=>{
for(const vessel of ['fishing','speedboat','ferry'])for(const heading of [0,Math.PI/4,Math.PI/2,Math.PI]){
const g=boatWaveGame(vessel);
g.run(`boatMotion.heading=${heading};emitBoatWaveSpray(player.x,player.y,boatMotion.heading,80);
const c=Math.cos(boatMotion.heading),s=Math.sin(boatMotion.heading),edge=BOAT_WAKE_HULLS[activeVessel].edge;
const passingHullClear=t=>boatMotion.spray.every(p=>{
const along=edge[0][0]+(p.x+p.vx*t-player.x-c*140*t)*c+(p.y+p.vy*t-player.y-s*140*t)*s;
if(along<edge.at(-1)[0]||along>edge[0][0])return true;
const pair=edge.findIndex(point=>point[0]<=along),j=Math.max(1,pair),[ax,ay]=edge[j-1],[bx,by]=edge[j];
const width=ay+(by-ay)*(ax-along)/(ax-bx);
return Math.abs(-(p.x+p.vx*t-player.x-c*140*t)*s+(p.y+p.vy*t-player.y-s*140*t)*c)>=width+.39;
});`);
for(const t of [0,.01,.05,.15,.3,.5]){
assert.ok(g.run(`passingHullClear(${t})`), `${vessel}: spray stays outside as hull passes at ${t}s`);
}
g.run(`boatMotion.waveHeight=18;boatMotion.roll=.2;boatPosition={x:player.x,y:player.y};
let clipRule,outline=[],points=[];ctx.rect=()=>{};ctx.moveTo=(x,y)=>{points=[[x,y]];};ctx.lineTo=(x,y)=>points.push([x,y]);ctx.clip=rule=>{clipRule=rule;outline=points.slice();};
drawBoatTrimSpray(player.x,player.y,boatMotion.heading,activeVessel,true);`);
assert.equal(g.run('clipRule'),'evenodd');
assert.ok(g.run('inside(boatPosition.x,boatPosition.y-boatMotion.waveHeight-2,outline)'),'deck is excluded from foreground spray');
}
});

test('wave spray progresses from bow to stern with hull crossing rather than elapsed time',()=>{
for(const vessel of ['fishing','speedboat','ferry']){
const g=boatWaveGame(vessel);
g.run('advanceBoatWaves(16);player.y-=4;advanceBoatWaves(16)');
const first=g.run('boatMotion.spray.length');
assert.ok(first>0&&first<30);
g.run('advanceBoatWaves(40)');assert.equal(g.run('boatMotion.spray.length'),first,'no new hull section has crossed');
g.run('player.y-=12;advanceBoatWaves(16)');
const middle=g.run('boatMotion.spray.length');
assert.ok(middle>first);
assert.ok(g.run('boatMotion.waveSpraySweep.next')<g.run('Math.ceil(BOAT_WAKE_HULLS[activeVessel].edge[0][0]-BOAT_WAKE_HULLS[activeVessel].edge.at(-1)[0])'));
g.run('for(let i=0;i<45;i++){player.y-=2;advanceBoatWaves(16);}');
assert.equal(g.run('boatMotion.waveSpraySweep'),null);
assert.equal(g.run('boatMotion.spray.filter(p=>p.bow).length'),g.run('(BOAT_WAKE_HULLS[activeVessel].edge[0][0]-BOAT_WAKE_HULLS[activeVessel].edge.at(-1)[0])*6'));
assert.ok(g.run('boatMotion.spray.some(p=>!p.bow)')||g.run('boatMotion.waveHeight')>0);
}
});

test('progressive wave spray originates at the tapered hull rather than the maximum beam',()=>{
for(const vessel of ['fishing','speedboat','ferry'])for(const heading of [0,Math.PI/4,Math.PI/2,Math.PI]){
const g=boatWaveGame(vessel);
g.run(`boatMotion.heading=${heading};emitBoatWaveSpray(player.x,player.y,boatMotion.heading,80);
const edge=BOAT_WAKE_HULLS[activeVessel].edge,c=Math.cos(boatMotion.heading),s=Math.sin(boatMotion.heading);`);
assert.ok(g.run(`boatMotion.spray.every(p=>{
const along=edge[0][0]+(p.x-player.x)*c+(p.y-player.y)*s;
const j=Math.max(1,edge.findIndex(point=>point[0]<=along+1e-8));
const [ax,ay]=edge[j-1],[bx,by]=edge[j],width=ay+(by-ay)*(ax-along)/(ax-bx);
const across=Math.abs(-(p.x-player.x)*s+(p.y-player.y)*c);
return Math.abs(across-width-.4)<1e-8;
})`), `${vessel}: every spray origin follows the hull outline`);
assert.ok(g.run('Math.hypot(boatMotion.spray[0].x-player.x,boatMotion.spray[0].y-player.y)')<.5,'first spray starts at the pointed nose');
}
});

test('wave spray mixes abundant varied droplets and fading mist with shorter outward reach',()=>{
for(const vessel of ['fishing','speedboat','ferry']){
const g=boatWaveGame(vessel);
g.run('emitBoatWaveSpray(player.x,player.y,boatMotion.heading,80);const mist=boatMotion.spray.filter(p=>p.mist),drops=boatMotion.spray.filter(p=>!p.mist);');
assert.equal(g.run('boatMotion.spray.length'),g.run('(BOAT_WAKE_HULLS[activeVessel].edge[0][0]-BOAT_WAKE_HULLS[activeVessel].edge.at(-1)[0])*6'));
assert.equal(g.run('mist.length'),g.run('boatMotion.spray.length/3'));
assert.ok(g.run('drops.some(p=>p.size<.6)&&drops.some(p=>p.size>4)'),'fine drops and larger splashes');
assert.ok(g.run('mist.every(p=>p.size<.8&&p.life<.3)'),'short-lived fine mist');
assert.ok(g.run('drops.reduce((sum,p)=>sum+Math.hypot(p.vx,p.vy)*p.life,0)/drops.length')<25,'compact outward splash');
g.run(`boatMotion.spray=mist;for(const p of mist)p.age=p.life*.5;
let alphas=[];const oldEllipse=ellipse;ellipse=(...args)=>{alphas.push(ctx.globalAlpha);oldEllipse(...args);};drawBoatTrimSpray(player.x,player.y,boatMotion.heading,activeVessel,true);`);
assert.equal(g.run('alphas.length'),g.run('mist.length'));
assert.ok(g.run('alphas.every(alpha=>alpha>0&&alpha<.1)'),'mist fades as a translucent haze');
g.run('for(const p of mist)p.age=p.life;alphas=[];drawBoatTrimSpray(player.x,player.y,boatMotion.heading,activeVessel,true)');
assert.equal(g.run('alphas.length'),0,'mist disappears without a heavy landing splash');
}
});

for(const equipment of ['waterskis','wakeboard'])test(`${equipment} leaves scaled boat whitewater and spray that fades after release`,()=>{
const g=game();g.run(`state.${equipment}=true;visitWatersportsDock();startWakeboarding('${equipment}');for(let i=0;i<100;i++)advanceSwimming(40)`);
assert.equal(g.run('!!wakeboardRide'),true);
assert.ok(g.run('watersportsRiderWake.wake.length')>0);
assert.ok(g.run('watersportsRiderWake.bowWake.length')>0);
assert.equal(g.run('new Set(watersportsRiderWake.bowWake.map(w=>w.side)).size'),2);
assert.ok(g.run('watersportsRiderWake.bowWake.every(w=>w.scale>0&&w.scale<1&&Number.isFinite(w.velocity))'));
g.run('const riderWakeBefore=JSON.stringify(watersportsRiderWake);let riderSprayStrokes=0;ctx.stroke=()=>riderSprayStrokes++;drawBoatWake(watersportsRiderWake)');
assert.ok(g.run('riderSprayStrokes')>0);
assert.equal(g.run('JSON.stringify(watersportsRiderWake)'),g.run('riderWakeBefore'));
g.run('finishWakeboarding();const lingeringWake=JSON.stringify(watersportsRiderWake)');
assert.ok(g.run('watersportsRiderWake.bowWake.length')>0);
g.node('#challenge').showModal();g.run('advanceSwimming(400)');
assert.equal(g.run('JSON.stringify(watersportsRiderWake)'),g.run('lingeringWake'));
g.node('#challenge').close();g.run('advanceSwimming(3700)');
assert.equal(g.run('watersportsRiderWake.bowWake.length+watersportsRiderWake.wake.length'),0);
g.run('resetWatersports()');assert.equal(g.run('watersportsRiderWake.distance||0'),0);
});

for(const equipment of ['waterskis','wakeboard'])test(`${equipment} detailed rider animates above fixed bindings and renders every direction without advancing state`,()=>{
const g=game();g.run(`state.${equipment}=true;visitWatersportsDock();startWakeboarding('${equipment}');for(let i=0;i<80;i++)advanceSwimming(40)`);
assert.ok(g.run('wakeboardRide.riderPhase')>0);
g.run('const originalRiderPhase=wakeboardRide.riderPhase');g.node('#challenge').showModal();g.run('advanceSwimming(400)');
assert.equal(g.run('wakeboardRide.riderPhase'),g.run('originalRiderPhase'));g.node('#challenge').close();
g.run(`wakeboardRide.riderPhase=0;const firstPose=watersportsRiderPose(wakeboardRide);wakeboardRide.riderPhase=1;const secondPose=watersportsRiderPose(wakeboardRide)`);
assert.equal(g.run('JSON.stringify(firstPose.legs.map(l=>l.foot))'),g.run('JSON.stringify(secondPose.legs.map(l=>l.foot))'));
assert.notEqual(g.run('JSON.stringify(firstPose.chest)'),g.run('JSON.stringify(secondPose.chest)'));
g.run(`let riderDrawDepth=0;
ctx.save=()=>{riderDrawDepth++};ctx.restore=()=>{riderDrawDepth--;if(riderDrawDepth<0)throw Error('unbalanced rider transform')};
for(const method of ['translate','rotate','scale','moveTo','lineTo','quadraticCurveTo','bezierCurveTo','ellipse','fillRect'])ctx[method]=(...values)=>{if(values.some(v=>typeof v==='number'&&!Number.isFinite(v)))throw Error('invalid rider geometry: '+method)};
for(const character of ['boy','girl'])for(const heading of [0,Math.PI/4,Math.PI/2,Math.PI,Math.PI*1.5]){
currentProfile().character=character;wakeboardRide.heading=heading;wakeboardRide.rider.vx=Math.cos(heading)*110;wakeboardRide.rider.vy=Math.sin(heading)*110;
for(const lean of [-1,0,1]){wakeboardRide.riderLean=lean;const beforeDraw=JSON.stringify(wakeboardRide);drawWatersports();if(JSON.stringify(wakeboardRide)!==beforeDraw)throw Error('drawing changed rider state');}
}`);
assert.equal(g.run('riderDrawDepth'),0);
g.run('finishWakeboarding();advanceSwimming(200);drawWakeboardCrash()');
assert.equal(g.run('riderDrawDepth'),0);
});

test('jet ski costs 150 once, persists across ages and resets, and isolates profiles',()=>{
const g=game();g.run('state.crystals=149;buyJetski()');assert.equal(g.run('state.jetski'),false);
g.run('state.crystals=250;buyJetski();buyJetski()');assert.equal(g.run('state.crystals'),100);assert.equal(g.run('state.jetski'),true);
let reloaded=game(null,g.snapshot());assert.equal(reloaded.run('state.jetski'),true);
g.run("switchAge('9-10')");assert.equal(g.run('state.jetski'),true);
g.run("$('#resetConfirm').showModal();$('#confirmReset').onclick()");assert.equal(g.run('state.jetski'),true);
g.node('#profileName').value='Jet Rider';g.run('createProfile()');assert.equal(g.run('state.jetski'),false);
});
test('jet ski launches at its separate island dock, renders, exits and reboards',()=>{
const g=game();g.run('state.crystals=150;buyJetski();player.x=JETSKI_DOCK.x;player.y=JETSKI_DOCK.y-18');
assert.equal(g.run('inside(player.x,player.y,mainPoly)'),false);assert.equal(g.run('canWalk(player.x,player.y)'),true);assert.equal(g.run('nearby()'),105);
g.run('launchJetski()');assert.equal(g.run('activeVessel'),'jetski');assert.equal(g.run('boating'),true);assert.equal(g.run('boatPoseClear(player.x,player.y,boatMotion.heading)'),true);
g.run('draw();advanceSwimming(600);exitBoat()');assert.equal(g.run('boating'),false);assert.equal(g.run('canWalk(player.x,player.y)'),true);
g.run('boardOwnBoat()');assert.equal(g.run('boating'),true);assert.equal(g.run('activeVessel'),'jetski');
g.run('returnBoat()');assert.equal(g.run('player.x'),g.run('JETSKI_DOCK.x'));
});
test('jet ski is fastest with tighter turning, biggest beach wave impulse and no trim',()=>{
const g=game();
for(const vessel of ['ferry','fishing','speedboat','tow'])for(let trim=0;trim<=5;trim++)assert.ok(g.run('boatTopSpeed(0,"jetski")')>g.run(`boatTopSpeed(${trim},'${vessel}')`));
g.run("state.jetski=true;activeVessel='jetski';boating=true;player.x=1300;player.y=1400;boatPosition={x:1300,y:1400};resetBoatMotion();boatMotion.engineStage='running';boatMotion.velocity=200;driveBoat(500,1,1);cycleBoatTrim();updateWaterControls();updateFerryPassUI();draw()");
assert.ok(g.run('boatMotion.turnRate')>3.4);assert.equal(g.run('boatMotion.trimStep'),0);assert.equal(g.node('#mapBoatTrim').hidden,true);assert.equal(g.node('#boatTrimInstrument').hidden,true);
for(const vessel of ['ferry','fishing','speedboat'])assert.ok(g.run('boatWaveImpulse(1,-Math.PI/2,150,"jetski")')>g.run(`boatWaveImpulse(1,-Math.PI/2,150,'${vessel}')*1.6`));
assert.ok(g.run('boatMotion.wake.length')>0);assert.ok(g.run('boatMotion.wake.every(w=>w.scale===.6)'));
});
test('jet ski keeps its vessel and fuel through outer island parking and reload',()=>{
const g=game();g.run("state.crystals=150;buyJetski();player.x=JETSKI_DOCK.x;player.y=JETSKI_DOCK.y;launchJetski();advanceSwimming(600);player.x=1300;player.y=800;boatPosition={x:1300,y:800};driveBoat(1000,1,0);state.boatIsland='palm-cove';save()");
const fuel=g.run('currentProfile().fuel.jetski');assert.ok(fuel<100);const r=game(null,g.snapshot());assert.equal(r.run('activeVessel'),'jetski');assert.equal(r.run('currentProfile().fuel.jetski'),fuel);r.run('draw()');
});
test('jet ski repairs at its own dock without changing ownership or fuel, and full reset removes it',()=>{
const g=game();g.run("state.crystals=150;buyJetski();currentProfile().fuel.jetski=37;const target=boatRepairHome('jetski').berth;petDragonPosition={x:target.x-60,y:target.y-8};petDragonFire={elapsed:200,duration:850};checkBoatDragonFireHits();petDragonFire=null;nextPetDragonFire=1e9;advancePetDragonFire(BOAT_EXPLOSION_DURATION)");
assert.equal(g.run("boatRepairs.has('jetski')"),true);
g.run("advancePetDragonFire(BOAT_REPAIR_TIMING.arrival);draw();advancePetDragonFire(BOAT_REPAIR_TIMING.jetski);draw()");assert.equal(g.run("boatUnavailable('jetski')"),false);assert.equal(g.run('state.jetski'),true);assert.equal(g.run('currentProfile().fuel.jetski'),37);
g.run("requestProfileAction('reset');confirmProfileAction()");assert.equal(g.run('state.jetski'),false);assert.equal(g.run('currentProfile().fuel.jetski'),100);const r=game(null,g.snapshot());assert.equal(r.run('state.jetski'),false);
});

test('jet ski emits a constant center rooster tail without trim and a larger propulsion wake',()=>{
const g=game();g.run("state.jetski=true;activeVessel='jetski';boating=true;player.x=1300;player.y=1300;resetBoatMotion();boatMotion.engineStage='running';advanceBoatSpray(24)");
assert.ok(g.run('boatMotion.spray.filter(p=>p.jet).length')>=10,'idle engine has a continuous tail');
assert.equal(g.run('boatMotion.trimStep'),0);
g.run('boatMotion.throttle=1;boatMotion.velocity=200;advanceBoatSpray(24)');
assert.ok(g.run('boatMotion.spray.filter(p=>p.jet).every(p=>p.x===player.x-18&&p.y===player.y)'), 'one central stern nozzle');
g.run("recordHullWake(boatMotion,{x:1250,y:1300},player,0,'jetski');const before=JSON.stringify(boatMotion);jetskiArt(player.x,player.y);drawBoatTrimSpray(player.x,player.y,0,'jetski',true)");
assert.equal(g.run('JSON.stringify(boatMotion)'),g.run('before'),'rendering never emits or ages jet water');
assert.ok(g.run('boatMotion.wake.length>0&&boatMotion.wake.every(w=>w.jet&&w.scale===.6)'));
});
test('jet ski briefly expels elevated water after takeoff, drains in air, and resumes on landing',()=>{
const g=game();g.run("state.jetski=true;activeVessel='jetski';boating=true;player.x=1300;player.y=1300;resetBoatMotion();boatMotion.engineStage='running';boatMotion.velocity=200;boatMotion.throttle=1;advanceBoatSpray(24);boatMotion.spray=[];boatMotion.waveHeight=30;advanceBoatSpray(24)");
assert.ok(g.run('boatMotion.spray.some(p=>p.jet&&p.z===32)'), 'airborne droplets start at the raised nozzle');
assert.ok(g.run('boatMotion.spray.every(p=>Math.abs(p.z+p.vz*p.life-p.gravity*p.life*p.life/2)<.00001)'), 'life ends at the water surface');
g.run('for(let i=0;i<30;i++)advanceBoatSpray(16)');assert.equal(g.run('boatMotion.jetWaterRemaining'),0);
const count=g.run('boatMotion.spraySerial');g.run('advanceBoatSpray(32)');assert.equal(g.run('boatMotion.spraySerial'),count);
g.run('boatMotion.waveHeight=0;advanceBoatSpray(24)');assert.ok(g.run('boatMotion.spraySerial')>count);
g.run("boatMotion.engineStage='off';advanceBoatSpray(24)");const stopped=g.run('boatMotion.spraySerial');g.run('advanceBoatSpray(24)');assert.equal(g.run('boatMotion.spraySerial'),stopped);
g.run('resetBoatMotion()');assert.equal(g.run('boatMotion.spray.length'),0);assert.equal(g.run('boatMotion.jetWaterRemaining||0'),0);
});

test('jet ski riders grip handlebars, straddle the hood, and never draw a steering wheel',()=>{
for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2]){
const g=game();g.run(`state.jetski=true;activeVessel='jetski';boating=true;player.x=1300;player.y=1300;boatPosition={...player};resetBoatMotion();boatMotion.heading=${heading};boatMotion.steering=.4;
drawBoatSteeringWheel=()=>{throw Error('Jet skis use handlebars')};const shoes=[];const limb=characterLimb;characterLimb=(points,color,width)=>{if(color==='#293e43')shoes.push(points);limb(points,color,width)};
const before=JSON.stringify(boatMotion);jetskiArt(player.x,player.y);`);
assert.equal(g.run('JSON.stringify(boatMotion)'),g.run('before'));
assert.equal(g.run('shoes.length'),2);
if(heading===Math.PI/2)assert.equal(g.run('shoes.every(points=>points.every(p=>Math.abs(p[0]-player.x)>7))'),true,'both feet extend outside the solid front hood');
g.run('boating=false;jetskiArt(player.x,player.y)');
}
});

test('surf paddling jump off uses keyboard and button to swim in place without pausing',()=>{
for(const touch of [false,true]){
const g=surfGame();g.run("player.y=beachShoreY(player.x)-140;surfSession.score=123;surfSession.paddleHeading=-Math.PI/2;keys.add('up');updateSurfUI()");
const position=g.run('JSON.stringify([player.x,player.y])');
assert.equal(g.node('#surfQuit').hidden,true);assert.equal(g.node('#surfPause').hidden,true);
g.run('handleSurfKey("p",{repeat:false,preventDefault(){}})');assert.equal(g.run('surfSession.paused'),false);
if(touch)g.node('#surfQuit').onclick();else g.run('handleSurfKey("x",{repeat:false,preventDefault(){}})');
assert.equal(g.run('surfSession'),null);assert.equal(g.run('swimming'),true);assert.equal(g.run('JSON.stringify([player.x,player.y])'),position);
assert.equal(g.run('keys.size'),0);assert.equal(g.run('state.surfRental'),true);assert.equal(g.run('state.surfBest'),123);
g.run('advanceSwimming(16);draw()');assert.equal(g.run('swimming'),true);
}
});

test('surf paddle-out resurfacing reveals gradually after the whitewater passes',()=>{
const g=surfGame();
g.run(`surfClock=1000;const lip=beachWaveProfile(1100,1,surfClock,true).front;
const x=lip+50,foam=beachWaveWhitewaterProfile(x,1,surfClock);
const y=t=>foam.y+foam.bottom-t*(foam.bottom-foam.top)`);
const reveal=t=>g.run(`beachWaveSubmersion(x,y(${t}),surfClock,.7)`);
assert.equal(reveal(.5).stage,'under');
assert.equal(reveal(1.1).stage,'emerging','paddler is still resurfacing beyond the foam');
assert.ok(reveal(.9).edge>0,'less than half of the board is revealed near the foam edge');
assert.ok(reveal(1.1).edge>reveal(1.6).edge);
assert.equal(reveal(1.71),null,'paddler becomes fully visible after the extended reveal');
assert.equal(g.run('beachWaveSubmersion(x,y(1.1),surfClock)'),null,'ordinary swimmers retain their reveal timing');
g.run(`player.x=x;player.y=y(1.1);const clips=[];ctx.rect=(...args)=>clips.push(args);drawSurfingWorld()`);
assert.ok(g.run('clips.some(r=>r[1]===-40&&r[3]===80&&r[2]>0&&r[2]<72)'), 'paddle-out rendering uses the extended reveal');
});

test('surf paddle-out stays visible across small unbroken wave sections',()=>{
const g=surfGame();
for(const time of [1000,4000,7000])for(const index of [0,1,2])for(const section of [-1,0,1]){
g.run(`surfClock=${time};const front${time}_${index}_${section+1}=beachWaveProfile(1100,${index},surfClock,true).front+${section}*600`);
const front=`front${time}_${index}_${section+1}`;
for(const offset of [-100,-40,180,300,450])for(const progress of [.1,.5,.9,1.3]){
g.run(`player.x=${front}+${offset};var surface=beachWaveSurfaceY(${front},${index},surfClock)+beachShoreY(player.x)-beachShoreY(${front});player.y=surface+10-${progress}*25`);
assert.equal(g.run('beachWaveSubmersion(player.x,player.y,surfClock,.7)'),null,`unbroken offset ${offset} at ${time}`);
}
}
g.run(`surfClock=1000;const breakX=beachWaveProfile(1100,1,surfClock,true).front+300;const trail=beachWaveWhitewaterProfile(breakX,1,surfClock);player.x=breakX;player.y=trail.y+(trail.top+trail.bottom)/2;let occupantClips=0;ctx.clip=()=>occupantClips++;clipBeachWaveOccupant(player.x,player.y)`);
assert.equal(g.run('occupantClips'),0,'the paddler renderer does not clip the unbroken section');
});

test('surf paddle-out speed HUD follows acceleration, coasting, and blocked movement',()=>{
const g=surfGame();assert.equal(g.node('#surfSpeed').textContent,'0%');
g.run('keys.add("up");advanceSurfing(80)');const accelerating=parseInt(g.node('#surfSpeed').textContent);
assert.ok(accelerating>0&&accelerating<100);
g.run('advanceSurfing(700)');assert.equal(g.node('#surfSpeed').textContent,'100%');
g.run('keys.clear();advanceSurfing(80)');const coasting=parseInt(g.node('#surfSpeed').textContent);assert.ok(coasting>0&&coasting<100);
g.run('advanceSurfing(900)');assert.equal(g.node('#surfSpeed').textContent,'0%');
g.run('player.y=beachShoreY(player.x)-300;keys.add("up");advanceSurfing(700)');assert.equal(g.node('#surfSpeed').textContent,'0%');
g.run('keys.clear();player.y=beachShoreY(player.x)-100;keys.add("right");keys.add("up");advanceSurfing(800)');assert.equal(g.node('#surfSpeed').textContent,'100%');
g.run('prepareSurfTakeoff();surfSession.speed=.425;updateSurfUI()');assert.equal(g.node('#surfSpeed').textContent,'50%');
});

test('surf heat counts down throughout beach paddling and ends safely at zero',()=>{
const g=surfGame();g.run('advanceSurfing(1000)');assert.equal(g.run('surfSession.remaining'),89000);assert.equal(g.node('#surfTime').textContent,'1:29');
g.run('keys.add("up");advanceSurfing(500)');assert.equal(g.run('surfSession.remaining'),88500);
g.node('#challenge').showModal();g.run('advanceSurfing(1000)');assert.equal(g.run('surfSession.remaining'),88500);g.node('#challenge').close();
g.run('prepareSurfPaddleOut(true);advanceSurfing(500)');assert.equal(g.run('surfSession.remaining'),88000,'returning to paddle-out does not reset or freeze the timer');
g.run('surfSession.remaining=20;surfSession.score=125;keys.add("up");advanceSurfing(1000)');
assert.equal(g.run('surfSession.remaining'),0);assert.equal(g.run('surfSession.phase'),'results');assert.equal(g.node('#surfTime').textContent,'0:00');
assert.equal(g.run('state.surfBest'),125);assert.equal(g.run('keys.size'),0);assert.equal(g.run('onMainlandBeach()'),true);
g.run('advanceSurfing(1000)');assert.equal(g.run('surfSession.remaining'),0);
});

test('jumping boats and jet skis cross islands while grounded hulls stop at shore',()=>{
for(const vessel of ['fishing','speedboat','ferry','jetski']){
const g=game();g.run(`state.catches={shark:5};state.speedboat=true;state.jetski=true;state.ferryRemaining=FERRY_RIDE_DURATION;activeVessel='${vessel}';boating=true;resetBoatMotion();
const jumpIsland=boatIslands[1];player.x=jumpIsland.x-180;player.y=jumpIsland.y-30;boatPosition={x:player.x,y:player.y};moveBoat(360,0,0)`);
assert.ok(g.run('player.x')<g.run('jumpIsland.x-80'),`${vessel}: grounded hull stops`);
g.run('player.x=jumpIsland.x-180;boatMotion.waveHeight=70;boatMotion.waveVelocity=0;moveBoat(180,0,0)');
assert.equal(g.run('player.x'),g.run('jumpIsland.x'),`${vessel}: airborne hull enters island`);
assert.equal(g.run('boatPoseClear(player.x,player.y,0)'),false,'berth checks still reject land');
g.run('driveBoat(40,1,1)');assert.ok(g.run('boatMotion.heading')>0,'airborne steering works over land');
g.run('moveBoat(jumpIsland.x+180-player.x,jumpIsland.y-30-player.y,0);boatMotion.waveHeight=.1;boatMotion.waveVelocity=-40;advanceBoatWaves(16)');
assert.equal(g.run('boating'),true,`${vessel}: clears island and lands safely`);
assert.equal(g.run('boatExplosions.size'),0);
assert.ok(g.run('boatMotion.waveSplashes.length')>0);
}
});

test('island touchdowns explode boats and jet skis immediately and start free home repairs',()=>{
for(const vessel of ['fishing','speedboat','ferry','jetski'])for(const edge of [false,true]){
const g=game();g.run(`state.catches={shark:5};state.speedboat=true;state.jetski=true;state.ferryRemaining=FERRY_RIDE_DURATION;activeVessel='${vessel}';boating=true;resetBoatMotion();
player.x=boatIslands[1].x${edge?'-120':''};player.y=boatIslands[1].y;boatPosition={x:player.x,y:player.y};const impactPoint={...boatPosition};
boatMotion.waveHeight=.1;boatMotion.waveVelocity=-40;boatMotion.wavePitch=.2;advanceBoatWaves(16)`);
assert.equal(g.run('boating'),false,`${vessel}: hull ${edge?'edge':'center'} on land explodes`);
assert.equal(g.run(`boatIsExploding('${vessel}')`),true);
assert.equal(g.run(`boatExplosions.get('${vessel}').x`),g.run('impactPoint.x'));
assert.equal(g.run(`boatExplosions.get('${vessel}').elapsed`),g.run('BOAT_IGNITION_DURATION'));
assert.equal(g.run('swimming'),true);assert.equal(g.run('sharkWater(player.x,player.y)'),true);
assert.equal(g.run('swimmingTimberAt(player.x,player.y)'),false);
assert.equal(g.run('boatMotion.waveLanding'),undefined);
g.run('draw();petDragonFire=null;nextPetDragonFire=1e9;advancePetDragonFire(BOAT_EXPLOSION_DURATION-BOAT_IGNITION_DURATION)');
assert.equal(g.run(`boatRepairs.has('${vessel}')`),true);
g.run(`advancePetDragonFire(BOAT_REPAIR_TIMING.arrival+BOAT_REPAIR_TIMING['${vessel}'])`);
assert.equal(g.run(`boatUnavailable('${vessel}')`),false);
assert.equal(g.run(`vesselPose('${vessel}')[0]`),g.run(`boatRepairHome('${vessel}').berth.x`));
}
});

test('airborne boat movement still respects timber, other hulls, ocean access and world edges',()=>{
const g=game();g.run('state.catches={shark:5};state.speedboat=true;state.jetski=true;activeVessel="jetski";boating=true;boatMotion.waveHeight=50');
assert.equal(g.run('boatPoseClear(dock.x,dock.y,0,"jetski",true)'),false);
assert.equal(g.run('boatPoseClear(...vesselPose("ferry"),"jetski",true)'),false);
assert.equal(g.run('boatPoseClear(WORLD.left+20,900,0,"jetski",true)'),false);
assert.equal(g.run('boatPoseClear(WORLD.right,900,0,"speedboat",true)'),false);
});

test('windsurfer costs 50 once and isolates ownership by age and explorer',()=>{
const g=game();g.run('state.crystals=49;buyWindsurfer()');assert.equal(g.run('state.windsurfer'),false);
g.run('state.crystals=80;buyWindsurfer();buyWindsurfer()');assert.equal(g.run('state.crystals'),30);
const reload=game(null,g.snapshot());assert.equal(reload.run('state.windsurfer'),true);
g.run("switchAge('9-10')");assert.equal(g.run('state.windsurfer'),false);
g.run("switchAge('11-12')");assert.equal(g.run('state.windsurfer'),true);
g.node('#profileName').value='Sailor';g.run('createProfile()');assert.equal(g.run('state.windsurfer'),false);
});
test('Sailing dock launches on the watersports island and saves a safe return',()=>{
const g=game();g.run('state.crystals=50;player.x=SAILING_DOCK.x;player.y=SAILING_DOCK.y-18;near=nearby();interact()');
assert.equal(g.run('near'),106);assert.equal(g.run('state.windsurfer'),true);assert.equal(g.run('windsurfSession'),null);
g.run('interact()');assert.equal(g.run('currentEnergyActivity()'),'windsurfing');assert.equal(g.run('windsurferClear(player.x,player.y,windsurfSession.heading)'),true);
assert.equal(g.run('inside(SAILING_DOCK.x,SAILING_DOCK.y-18,islandPolys[1])'),true);
g.run('save()');const reload=game(null,g.snapshot());assert.equal(reload.run('canWalk(player.x,player.y)'),true);assert.equal(reload.run('player.x'),440);
g.run('finishWindsurfing()');assert.equal(g.run('swimming'),false);assert.equal(g.run('canWalk(player.x,player.y)'),true);
});
test('windsurfing accelerates forward, steers, brakes and leaves scaled boat foam without prop wash',()=>{
const g=game();g.run("state.windsurfer=true;player.x=440;player.y=212;startWindsurfing();keys.add('w');for(let i=0;i<60;i++)advanceSwimming(16)");
assert.ok(g.run('player.y')>290);assert.ok(g.run('windsurfSession.bowWake.length')>0);assert.equal(g.run('windsurfSession.wake.length'),0);
assert.equal(g.run('windsurfSession.bowWake.every(w=>w.scale===.42)'),true);
const heading=g.run('windsurfSession.heading');g.run("keys.add('d');advanceSwimming(40)");assert.ok(g.run('windsurfSession.heading')>heading);
g.run("keys.clear();keys.add('s');for(let i=0;i<60;i++)advanceSwimming(16)");assert.equal(g.run('windsurfSession.velocity'),0);
g.run('ageBoatWake(windsurfSession,4000)');assert.equal(g.run('windsurfSession.bowWake.length'),0);
});
test('windsurfing pauses, exits safely at exhaustion and clears on age changes',()=>{
const g=game();g.run('state.windsurfer=true;player.x=440;player.y=212;startWindsurfing()');
g.node('#challenge').open=true;g.run('advanceWindsurfing(1000);advancePower(1000)');assert.equal(g.run('windsurfSession.clock'),0);assert.equal(g.run('state.power'),100);
g.node('#challenge').open=false;g.run('state.power=.01;advanceSwimming(100)');assert.equal(g.run('windsurfSession'),null);assert.equal(g.run('canWalk(player.x,player.y)'),true);
g.run('startWindsurfing()');assert.equal(g.run('windsurfSession'),null);
g.run("state.power=100;startWindsurfing();switchAge('9-10')");assert.equal(g.run('windsurfSession'),null);assert.equal(g.run('swimming'),false);
});
test('windsurfer hull stops at shore, docks, bridges and boats',()=>{
const g=game();g.run('state.windsurfer=true;player.x=440;player.y=212;startWindsurfing();windsurfSession.heading=-Math.PI/2;windsurfSession.velocity=125');
g.run("keys.add('w');for(let i=0;i<100;i++)advanceWindsurfing(16)");assert.ok(g.run('player.y')>215);assert.equal(g.run('windsurfSession.velocity'),0);assert.equal(g.run('windsurferClear(player.x,player.y,windsurfSession.heading)'),true);
assert.equal(g.run('windsurferClear(SAILING_DOCK.x,SAILING_DOCK.y,0)'),false);
assert.equal(g.run('windsurferClear(WATERSPORTS_DOCK.x+40,WATERSPORTS_DOCK.y+18,0)'),false);
g.run("state.upgrades=['bridge']");assert.equal(g.run('windsurferClear(woodlandBridge.x+7,woodlandBridge.y+60,0)'),false);
});
test('windsurfer mast stays forward and clew aft at every heading; rendering does not advance animation',()=>{
const g=game();for(let i=0;i<16;i++){
const heading=i*Math.PI/8;g.run(`globalThis.testRig=windsurferRig(0,0,${heading},1000)`);
assert.ok(g.run(`testRig.mast[0]*Math.cos(${heading})+(testRig.mast[1]+1)*Math.sin(${heading})`)>0);
assert.ok(g.run(`testRig.clew[0]*Math.cos(${heading})+(testRig.clew[1]+13)*Math.sin(${heading})`)<0);
g.run(`drawWindsurfer(300,300,${heading},1000)`);
}
g.run("state.windsurfer=true;player.x=440;player.y=212;startWindsurfing();keys.add('w');advanceSwimming(1000)");
const before=g.run('JSON.stringify(windsurfSession)');g.run('drawPlayerWindsurfer();drawPlayerWindsurfer()');assert.equal(g.run('JSON.stringify(windsurfSession)'),before);
});
test('repair windsurfers emit independent scaled boat wakes during simulation',()=>{
const g=game();g.run("globalThis.repair=createBoatRepair('fishing');repair.elapsed=BOAT_REPAIR_TIMING.arrival+BOAT_REPAIR_TIMING.fishing+BOAT_REPAIR_TIMING.jump;for(let i=0;i<60;i++)advanceBoatRepair(repair,40)");
assert.equal(g.run('repair.crewWakes.every(m=>m.bowWake.length>0&&m.wake.length===0)'),true);
assert.notEqual(g.run('repair.crewWakes[0]'),g.run('repair.crewWakes[1]'));
const before=g.run('JSON.stringify(repair)');g.run("drawBoatRepairCrew(repair,{},1)");assert.equal(g.run('JSON.stringify(repair)'),before);
});
test('windsurfing blocks other travel entry points until returning to the dock',()=>{
const g=game();g.run('state.windsurfer=true;player.x=440;player.y=212;startWindsurfing();visit(0);boardOwnBoat();launchSpeedboat();openFerry()');
assert.equal(g.run('currentEnergyActivity()'),'windsurfing');assert.equal(g.run('boating'),false);
});
test('Sailing purchase and return controls exist, and keyboard and touch share the same safe exit',()=>{
const html=fs.readFileSync('dist/index.html','utf8');assert.match(html,/id="buyWindsurfer"/);assert.match(html,/id="mapSailingStop"/);
const g=game();g.run('state.windsurfer=true;player.x=440;player.y=212;startWindsurfing()');
g.node('#mapSailingStop').onclick();assert.equal(g.run('windsurfSession'),null);
g.run('startWindsurfing();window.listeners.keydown.forEach(({handler})=>handler({key:"x",target:{tagName:"CANVAS"},preventDefault(){}}))');
assert.equal(g.run('windsurfSession'),null);assert.equal(g.run('canWalk(player.x,player.y)'),true);
g.run("startWindsurfing();$('#resetConfirm').showModal()");g.node('#confirmReset').onclick();assert.equal(g.run('windsurfSession'),null);assert.equal(g.run('state.windsurfer'),false);
});

test('northwest wind keeps every windsurfer upwind of the rig and drives the leeward sail side',()=>{
const g=game();for(let i=0;i<32;i++){
g.run(`globalThis.rig=windsurferRig(0,0,${i*Math.PI/16},1000);globalThis.pose=windsurferRiderPose(rig,1000)`);
assert.ok(g.run('(pose.shoulder[0]-pose.hip[0])*SAILING_WIND.x+(pose.shoulder[1]-pose.hip[1]+11-pose.flex)*SAILING_WIND.y')<0);
assert.equal(g.run('pose.face'),Math.PI/4);
// Feet stay on the upwind rail, independently of travel direction.
assert.ok(g.run('rig.point(0,0,1).map((v,i)=>pose.feet[0][i]-v).reduce((n,v,i)=>n+v*[SAILING_WIND.x,SAILING_WIND.y][i],0)')<=1e-9);
const cross=g.run('-Math.sin(rig.heading)*SAILING_WIND.x+Math.cos(rig.heading)*SAILING_WIND.y');
if(Math.abs(cross)>.12)assert.ok(g.run('rig.across')*cross>0);
}
});
test('windsurfer flips release only the back hand, swing the clew, exchange grips and finish continuously',()=>{
const g=game();g.run('globalThis.m={heading:Math.PI/2,tack:-1,frontHand:0,clock:0};m.heading=0;advanceWindsurferRig(m,0)');
assert.equal(g.run('m.flip.backHand'),1);
const positions=[];
for(const t of [0,.1,.4,.5,.7,.9,.999]){
g.run(`m.flip.elapsed=SAIL_FLIP_DURATION*${t};globalThis.r=windsurferRig(0,0,m.heading,1000,m);globalThis.p=windsurferRiderPose(r,1000,m)`);
positions.push(g.run('r.across'));
if(t>=.1&&t<=.7){assert.equal(g.run('p.hands[0].gripping'),true);assert.equal(g.run('p.hands[1].gripping'),false);}
}
assert.ok(positions[0]<0);assert.ok(positions.at(-1)>0);assert.ok(positions.every(Number.isFinite));
g.run('globalThis.lastHands=p.hands.map(h=>h.point);advanceWindsurferRig(m,SAIL_FLIP_DURATION*.001);globalThis.after=windsurferRiderPose(windsurferRig(0,0,m.heading,1000,m),1000,m)');
assert.equal(g.run('m.flip'),null);assert.equal(g.run('m.frontHand'),1);assert.equal(g.run('m.tack'),1);
assert.ok(g.run('after.hands.every((h,i)=>Math.hypot(h.point[0]-lastHands[i][0],h.point[1]-lastHands[i][1])<.1)'));
});
test('windsurf turns trigger one sail flip across either wind axis without chatter',()=>{
const g=game();for(const axis of [Math.PI/4,Math.PI*5/4]){
g.run(`globalThis.m={heading:${axis+.3},tack:windsurferTack(${axis+.3}),frontHand:0};globalThis.before=m.tack;m.heading=${axis-.3};advanceWindsurferRig(m,20)`);
assert.notEqual(g.run('m.flip'),null);assert.equal(g.run('m.flip.to'),-g.run('before'));
g.run('advanceWindsurferRig(m,SAIL_FLIP_DURATION)');assert.equal(g.run('m.tack'),-g.run('before'));
}
g.run('globalThis.m={heading:Math.PI/4,tack:1,frontHand:0};for(let i=0;i<100;i++){m.heading=Math.PI/4+Math.sin(i)*.05;advanceWindsurferRig(m,16)}');assert.equal(g.run('m.flip'),undefined);
});
test('windsurf speed responds to northwest wind and can steer out of the no-go zone at rest',()=>{
const g=game();assert.equal(g.run('windsurfDrive(Math.PI*5/4)'),0);assert.equal(g.run('windsurfDrive(Math.PI*3/4)'),1);assert.ok(g.run('windsurfDrive(Math.PI/4)')<1);
g.run("state.windsurfer=true;player.x=440;player.y=212;startWindsurfing();player.x=420;player.y=800;windsurfSession.heading=Math.PI*5/4;keys.add('w');advanceWindsurfing(1000)");assert.equal(g.run('windsurfSession.velocity'),0);
const heading=g.run('windsurfSession.heading');g.run("keys.add('d');advanceWindsurfing(100)");assert.ok(g.run('windsurfSession.heading')>heading);
});
test('windsurf flip clocks and wind HUD pause in dialogs and clear safely on exit',()=>{
const g=game();g.run('state.windsurfer=true;player.x=440;player.y=212;startWindsurfing();windsurfSession.heading=0;advanceWindsurferRig(windsurfSession,100);updateWaterControls()');
assert.equal(g.node('#sailingWindHud').hidden,false);assert.equal(g.node('#sailingWindStatus').textContent,'Release back hand');
const before=g.run('JSON.stringify(windsurfSession)');g.node('#challenge').open=true;g.run('advanceWindsurfing(1000);drawPlayerWindsurfer()');assert.equal(g.run('JSON.stringify(windsurfSession)'),before);
g.node('#challenge').open=false;g.run('advanceWindsurfing(300);updateWaterControls()');assert.equal(g.node('#sailingWindStatus').textContent,'Let the clew swing');
g.run('finishWindsurfing()');assert.equal(g.node('#sailingWindHud').hidden,true);
});
test('windsurfer uses the shared surfboard renderer for player and repair crews',()=>{
const g=game();g.run('globalThis.boards=[];const originalShortboard=drawSurfShortboard;drawSurfShortboard=(...args)=>{boards.push(args);originalShortboard(...args)};drawWindsurfer(400,500,0);drawRepairWindsurfer({board:{x:500,y:500},heading:1,alpha:1},1000,1)');
assert.equal(g.run('boards.length'),2);assert.equal(g.run('boards.every(args=>args[0]===false&&args[1]===.7)'),true);
});

test('windsurf sail flips take the outside bow arc and keep the boom clear of the torso',()=>{
const g=game();
const lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const distanceToSegment=(p,a,b)=>{const d=b.map((v,i)=>v-a[i]),den=d.reduce((s,v)=>s+v*v,0);const t=Math.max(0,Math.min(1,p.reduce((s,v,i)=>s+(v-a[i])*d[i],0)/den));return Math.hypot(...p.map((v,i)=>v-a[i]-d[i]*t));};
for(const speed of [0,125])for(const axis of [Math.PI/4,Math.PI*5/4])for(const direction of [-1,1]){
g.run(`globalThis.m={heading:${axis-direction*.2},tack:windsurferTack(${axis+direction*.2}),frontHand:0,velocity:${speed}};advanceWindsurferRig(m,0)`);
for(let step=0;step<=100;step++){
g.run(`m.flip.elapsed=SAIL_FLIP_DURATION*${step/100};globalThis.r=windsurferRig(0,0,m.heading,0,m);globalThis.p=windsurferRiderPose(r,0,m)`);
if(step===48)assert.ok(g.run('r.along')>6,'clew passes forward of the mast, away from the aft rider');
const v=JSON.parse(g.run('JSON.stringify({mast:r.point(6,0,18),clew:r.clew,hip:p.hip,shoulder:p.shoulder,flex:p.flex,release:p.release})'));
// Undo height projection to check the actual boom against the entire torso in 3D.
const hipHeight=10-v.flex-v.release*2,shoulderHeight=hipHeight+11-v.flex;
const hip=[v.hip[0],v.hip[1]+hipHeight,hipHeight],shoulder=[v.shoulder[0],v.shoulder[1]+shoulderHeight,shoulderHeight];
const mast=[v.mast[0],v.mast[1]+18,18],clew=[v.clew[0],v.clew[1]+13,13];
for(let body=0;body<=25;body++)assert.ok(distanceToSegment(lerp(hip,shoulder,body/25),mast,clew)>3.5,`boom crosses torso: speed ${speed}, axis ${axis}, direction ${direction}, step ${step}`);
}
}
});
