const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
function game(saved){const nodes=new Map(),storage=new Map(saved?[["skyseed-v1",JSON.stringify(saved)]]:[]);const element=()=>({value:'',innerHTML:'',textContent:'',style:{},classList:{add(){},remove(){}},setAttribute(){},addEventListener(){},focus(){},showModal(){this.open=true;},close(){this.open=false;},getContext(){return new Proxy({},{get:()=>()=>{}});}});const node=s=>{if(!nodes.has(s))nodes.set(s,element());return nodes.get(s);};const c=vm.createContext({document:{querySelector:s=>s==='dialog[open]'?([...nodes.entries()].find(([key,n])=>['#challenge','#journal','#welcome','#ferry','#stash','#sponsorship'].includes(key)&&n.open)?.[1]||null):node(s),querySelectorAll:()=>[],addEventListener(){}},window:{addEventListener(){}},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},console,confirm:()=>true});vm.runInContext(fs.readFileSync('dist/app.js','utf8'),c);vm.runInContext('renderTool=()=>{}',c);return {run:s=>vm.runInContext(s,c),node};}
test('all 100 challenges award once; upgrades cost 60; companion hatches',()=>{const g=game();for(let i=0;i<100;i++){g.run(`openQuestion(${i})`);g.node('#answer').value=g.run(`Array.isArray(questions[${i}].answer)?questions[${i}].answer.join(','):String(questions[${i}].answer)`);g.run('checkAnswer()');}assert.equal(g.run('state.solved.length'),100);assert.equal(g.run('state.crystals'),500);assert.equal(g.node('#petTitle').textContent,'Meet Sprout!');g.run('openQuestion(0)');g.node('#answer').value='252';g.run('checkAnswer()');assert.equal(g.run('state.crystals'),505);g.run("buy('cottage');buy('garden');buy('bridge')");assert.equal(g.run('state.crystals'),445);assert.equal(g.run('state.upgrades.length'),3);g.run("buy('bridge')");assert.equal(g.run('state.crystals'),445);});
test('wrong answers, equivalent fractions, percentages, ordered pairs',()=>{const g=game();g.run('openQuestion(4)');g.node('#answer').value='3/4';g.run('checkAnswer()');assert.equal(g.run('state.crystals'),0);g.node('#answer').value='14/16';g.run('checkAnswer()');assert.equal(g.run('state.crystals'),5);assert.equal(g.run("parseNumber('62%')"),.62);assert.equal(g.run("parseNumber('−4')"),-4);assert.ok(Number.isNaN(g.run("parseNumber('1/0')")));g.run('openQuestion(17)');g.node('#answer').value='30,54';g.run('checkAnswer()');assert.equal(g.run('state.solved.length'),1);g.node('#answer').value='54,30';g.run('checkAnswer()');assert.equal(g.run('state.solved.length'),2);});
test('ferry ticket gates the fifth island and includes return journeys',()=>{
const g=game();g.run('visit(4)');assert.equal(g.run('active'),0);assert.equal(g.node('#ferry').open,true);
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
assert.match(g.node('#squishyProgress').textContent,/All seven/);
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
assert.equal(g.run('state.crystals'),500);assert.equal(g.run('earnedSquishies()'),7);
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
for(let i=0;i<5;i++)g.run('castFishing(10,40);castFishing(10,40);advanceFishing(450)');
assert.equal(g.run('state.bait'),0);assert.equal(g.run('Object.values(state.catches).reduce((a,b)=>a+b,0)'),0);
g.run('castFishing(10,40)');assert.equal(g.run('pendingCast'),null);
g.run('buyRod();buyLure();buyLure()');assert.equal(g.run('state.bait'),5);assert.equal(g.run('state.crystals'),20);assert.equal(g.run('state.earnedCrystals'),50);assert.equal(g.run('state.fishingLure'),true);
});
test('aimed casts catch all six species and repeated catches increment saved badges',()=>{
const g=game();g.run('state.crystals=100;openFishing();buyRod()');
for(let i=0;i<3;i++)g.run(`{const fish=fishingTargets(fishingTime+450)[${i}];castFishing(fish.x,fish.y);advanceFishing(450);}`);
for(const id of ['barracuda','stingray','shark'])assert.equal(g.run(`state.catches.${id}`),1);
g.run('buyLure();fishSet="lure";updateFishing()');
for(let i=0;i<3;i++){if(i===2)g.run('buyRod()');g.run(`{const fish=fishingTargets(fishingTime+450)[${i}];castFishing(fish.x,fish.y);advanceFishing(450);}`);g.node('#sponsorship').close();}
for(const id of ['snook','octopus','marlin'])assert.equal(g.run(`state.catches.${id}`),1);
g.run('{const fish=fishingTargets(fishingTime+450)[0];castFishing(fish.x,fish.y);advanceFishing(450);}');assert.equal(g.run('state.catches.snook'),2);assert.match(g.node('#fishBadges').innerHTML,/Caught × 2/);
const saved=g.run('JSON.parse(localStorage.getItem(KEY))');const restored=game(saved);assert.equal(restored.run('state.catches.snook'),2);assert.equal(restored.run('state.fishingLure'),true);assert.equal(restored.run('state.bait'),0);
g.run("switchAge('9-10')");assert.equal(g.run('state.bait'),0);assert.equal(g.run('state.fishingLure'),false);assert.equal(g.run('state.catches.snook'),0);
g.run("switchAge('11-12')");assert.equal(g.run('state.catches.snook'),2);
});
test('closing the fishing dock cancels the hook without granting a catch',()=>{
const g=game();g.run('state.crystals=5;openFishing();buyRod();castFishing(10,40);stopFishing();advanceFishing(450)');assert.equal(g.run('state.bait'),4);assert.equal(g.run('pendingCast'),null);assert.equal(g.run('Object.values(state.catches).reduce((a,b)=>a+b,0)'),0);
});

test('fifth catch announces sponsorship once and unlocks unlimited bait',()=>{
const g=game();g.run('state.crystals=5;openFishing();buyRod()');
for(let i=0;i<5;i++){g.run('{const f=fishingTargets(fishingTime+450)[0];castFishing(f.x,f.y);advanceFishing(450);}');if(i<4)assert.equal(g.run('sponsored()'),false);}
assert.equal(g.run('sponsored()'),true);assert.equal(g.node('#sponsorship').open,true);assert.equal(g.node('#sponsorName').textContent,'Skyseed Angling Co.');assert.equal(g.run('state.bait'),0);
g.node('#sponsorship').close();
for(let i=0;i<8;i++)g.run('castFishing(10,40);advanceFishing(450)');
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
g.run('{const f=fishingTargets(fishingTime+450)[1];castFishing(f.x,f.y);advanceFishing(450);draw();}');assert.equal(g.run('state.catches.stingray'),1);
g.run('castFishing(10,40);stopFishing();advanceFishing(450)');assert.equal(g.run('pendingCast'),null);assert.equal(g.node('#fishing').hidden,true);
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
const g=game();g.node('#menuBtn').onclick();assert.equal(g.node('#islandMenu').open,true);
g.node('#fishingBtn').onclick();assert.equal(g.node('#islandMenu').open,false);assert.equal(g.run('fishingActive'),true);
g.run('window.innerWidth=390;window.innerHeight=844;resizeMap();state.crystals=5;buyRod()');
g.node('#world').getBoundingClientRect=()=>({left:0,top:0,width:390,height:844});
const point=g.run('({x:(10-camera.x)/WORLD.viewWidth*390,y:(40-camera.y)/WORLD.viewHeight*844})');
g.node('#world').onclick({clientX:point.x,clientY:point.y});assert.ok(Math.abs(g.run('pendingCast.x')-10)<.000001);assert.ok(Math.abs(g.run('pendingCast.y')-40)<.000001);
});
