'use strict';
const $=s=>document.querySelector(s), QUESTION_COUNT=200;
const MAIN_DOCK={x:232,y:285},FISHING_DOCK={x:106,y:222},BOAT_MOORING={x:FISHING_DOCK.x-42,y:FISHING_DOCK.y+15};
const SPEEDBOAT_DOCK={x:318,y:256},SPEEDBOAT_MOORING={x:361,y:271},SPEEDBOAT_UNLOCK_CRYSTALS=100;
// Island shores span x=48…3008. Equal ocean margins center them in the expanded map.
const WORLD={left:-1672,right:4728,width:6400,height:1800,viewWidth:480,viewHeight:300};
const POWER_ENABLED=true,POWER_MAX=100,POWER_PER_ANSWER=25,POWER_DRAIN_PER_SECOND=.65,RIDING_ENERGY_DRAIN_PER_SECOND=.325;
const defaults={surfRental:false,surfBest:0,anchor:false,speedboat:false,wakeboard:false,waterskis:false,power:POWER_MAX,boatIsland:null,boatIslandsVisited:[],parkedBoat:null,crystals:0,earnedCrystals:0,solved:[],upgrades:[],x:230,y:176,sound:false,ferryTicket:false,ferryRemaining:0,ferryAboard:false,travelRules:2,bait:0,fishingLure:false,sponsorshipAnnounced:false,catches:{},tradingTickets:0,squishyInventory:null,squishyClaims:0};
const FERRY_PRICE=25,FERRY_RIDE_DURATION=5*60*1000,FUEL_TANK_DURATION=5*60*1000;
const FISH_IDS=['bass','salmon','catfish','snook','redfish','trout','tarpon','wahoo','kingfish','tuna','octopus','shark'];
const normalizeCounts=counts=>Object.fromEntries(Object.entries(counts||{}).filter(([id,n])=>[...FISH_IDS,'barracuda','stingray','marlin'].includes(id)&&Number.isFinite(n)&&n>0).map(([id,n])=>[id,Math.floor(n)]));
const clampFuel=n=>Number.isFinite(n)?Math.max(0,Math.min(100,n)):100;
const PROFILE_KEY='skyseed-profiles-v1';
const AGE_LEVELS=['5-6','7-8','9-10','11-12'];
const normalizeAge=age=>AGE_LEVELS.includes(age)?age:'11-12';
let ageLevel='11-12',storageOK=true,profiles=[],profileId='legacy';
try{
ageLevel=normalizeAge(localStorage.getItem('skyseed-age'));
const stored=JSON.parse(localStorage.getItem(PROFILE_KEY));
if(stored&&Array.isArray(stored.profiles)){
const ids=new Set();profiles=stored.profiles.filter(p=>p&&typeof p.id==='string'&&/^(legacy|p[0-9]+)$/.test(p.id)&&!ids.has(p.id)&&ids.add(p.id)&&typeof p.name==='string'&&p.name.trim()).map(p=>({id:p.id,name:p.name.trim().slice(0,24),character:p.character==='girl'?'girl':'boy',fuel:p.fuel?{fishing:clampFuel(p.fuel.fishing),speedboat:clampFuel(p.fuel.speedboat)}:undefined,reserveGas:Math.max(0,Number(p.reserveGas)||0),lifetimeCatches:p.lifetimeCatches?normalizeCounts(p.lifetimeCatches):undefined,anchor:p.anchor===true,speedboat:p.speedboat===true,power:Number.isFinite(p.power)?Math.max(0,Math.min(POWER_MAX,p.power)):undefined,age:normalizeAge(p.age)}));
if(profiles.length){profileId=profiles.some(p=>p.id===stored.active)?stored.active:profiles[0].id;ageLevel=profiles.find(p=>p.id===profileId).age;}
}
}catch{storageOK=false;}
if(!profiles.length)profiles=[{id:'legacy',name:'Explorer',character:'boy',age:ageLevel}];
function currentProfile(){return profiles.find(p=>p.id===profileId);}
function progressKey(id=profileId,age=ageLevel){return id==='legacy'?(age==='11-12'?'skyseed-v1':`skyseed-v1-${age}`):`skyseed-profile-${id}-${age}`;}
let KEY=progressKey();
let adminMode=false;
function escapeHTML(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function characterColors(character=currentProfile().character){return character==='girl'?{shirt:'#698ca4',accent:'#91b7bd',hair:'#5c3d38'}:{shirt:'#ba704a',accent:'#d08b55',hair:'#654a37'};}
function updateProfileUI(){
updateAdminModeUI();
$('#adminPassword').value='';$('#adminFeedback').textContent='';$('#adminFeedback').className='feedback';
const profile=currentProfile();
$('#profileSelect').innerHTML=profiles.map(p=>`<option value="${p.id}">${escapeHTML(p.name)}</option>`).join('');$('#profileSelect').value=profileId;
$('#profileName').value=profile.name;$('#characterChoice').value=profile.character;$('#profileBadge').textContent=profile.name;
renderCharacterPreview(profile.character);
$('#profileAvatar').innerHTML=characterAvatar(profile.character);
}
function applyAdminOverride(){
const password=$('#adminPassword').value;$('#adminPassword').value='';
const feedback=$('#adminFeedback');
if(password!=='11111'){feedback.className='feedback error';feedback.textContent='Incorrect password. No crystals were added.';return;}
adminMode=true;state.power=POWER_MAX;state.crystals+=1000;update();chime();
feedback.className='feedback success';feedback.textContent=`Added 1,000 crystals to ${currentProfile().name} (ages ${ageLevel.replace('-','–')}). Admin mode now has unlimited energy.`;
}
$('#adminOverrideForm').onsubmit=e=>{e.preventDefault();applyAdminOverride();};
function updateAdminModeUI(){
$('#adminModeStatus').textContent=adminMode?'Admin mode active · unlimited energy':'Admin mode inactive';
$('#exitAdminMode').hidden=!adminMode;
}
function exitAdminMode(){
adminMode=false;updateAdminModeUI();updatePowerMeter();
if(!hasSwimPower()&&(swimming||boating||dragonFlight?.stage==='swimming'))returnToShoreWithoutPower();
}
$('#exitAdminMode').onclick=exitAdminMode;
function renderCharacterPreview(character){
$('#characterPreview').innerHTML=characterAvatar(character);
}
function characterAvatar(character){
const colors=characterColors(character);
return `<svg viewBox="0 0 64 80" width="64" height="80" aria-label="${character==='girl'?'Girl':'Boy'} explorer preview" role="img" shape-rendering="geometricPrecision"><path d="M18 27C15 11 22 4 33 4s19 8 16 23l${character==='girl'?'4 22-13 3-23-2Z':'-4 9H20Z'}" fill="${colors.hair}" stroke="#45352e" stroke-width="1.5"/><path d="m23 62-1 12h9l2-12m4 0 1 12h9l-2-12" fill="#3e5555" stroke="#304543" stroke-width="1.5"/><path d="M21 73h11v5H19v-3Zm17 0h9l3 5H38Z" fill="#4c3931"/><path d="M21 43c-6 1-9 9-10 20 0 4 6 5 7 1l5-14m20-7c6 1 9 9 10 20 0 4-6 5-7 1l-5-14" fill="#f2c992" stroke="#a47751" stroke-width="1.5"/><path d="m26 39-7 5 1 21h26l-1-21-8-5Z" fill="${colors.shirt}" stroke="#3e5555" stroke-width="1.5"/><path d="m22 45 4-3 5 21h-9Z" fill="${colors.accent}"/><path d="M28 34v7q5 6 10 0v-7" fill="#dfae7e"/><ellipse cx="19" cy="25" rx="3" ry="5" fill="#dfae7e"/><ellipse cx="46" cy="25" rx="3" ry="5" fill="#dfae7e"/><path d="M20 18q0-10 13-10t13 10v10c0 8-7 12-13 12s-13-5-13-12Z" fill="#f2c992" stroke="#a47751" stroke-width="1.2"/><path d="M20 22V15Q22 5 34 7q14 0 13 16l-6-8q-11 6-21 3Z" fill="${colors.hair}"/><path d="M24 12q8-5 16 0" fill="none" stroke="#ffffff" stroke-opacity=".18" stroke-width="2" stroke-linecap="round"/><ellipse cx="27" cy="25" rx="1.6" ry="2" fill="#354744"/><ellipse cx="39" cy="25" rx="1.6" ry="2" fill="#354744"/><path d="m33 26-1 4h3m-7 3q5 4 10 0" fill="none" stroke="#a47751" stroke-width="1.3" stroke-linecap="round"/><path d="M22 59h22v4H22Z" fill="#354744"/><path d="M31 59h5v4h-5Z" fill="#edc66e"/></svg>`;
}
function validProfileName(name,exclude){
const clean=String(name||'').trim().replace(/\s+/g,' ');
if(!clean||clean.length>24){$('#profileFeedback').textContent='Choose a profile name with 1–24 characters.';return null;}
if(profiles.some(p=>p.id!==exclude&&p.name.toLowerCase()===clean.toLowerCase())){$('#profileFeedback').textContent='That name already has a profile. Choose it above or use a different name.';return null;}
return clean;
}
function editProfile(){
const name=validProfileName($('#profileName').value,profileId);if(!name)return;
currentProfile().name=name;currentProfile().character=$('#characterChoice').value==='girl'?'girl':'boy';save();updateProfileUI();draw();
$('#profileFeedback').textContent=storageOK?'Profile saved.':'Profile updated for this session; browser storage is unavailable.';
}
function createProfile(){
if(voyage){$('#profileFeedback').textContent='Create a profile after the ferry arrives.';return;}
const name=validProfileName($('#profileName').value);if(!name)return;
const next=Math.max(0,...profiles.map(p=>Number(p.id.slice(1))||0))+1;
const profile={id:'p'+next,name,character:$('#characterChoice').value==='girl'?'girl':'boy',age:ageLevel};
profiles.push(profile);switchProfile(profile.id);
$('#profileFeedback').textContent=storageOK?'New profile created. Your own island is ready!':'Profile created for this session; browser storage is unavailable.';
}
function switchProfile(id,{saveCurrent=true,force=false}={}){
if((id===profileId&&!force)||!profiles.some(p=>p.id===id))return;
if(voyage){$('#profileFeedback').textContent='Switch profiles after the ferry arrives.';$('#profileSelect').value=profileId;return;}
if(saveCurrent)save();adminMode=false;cancelFlash();for(const dialog of ['challenge','flash','sponsorship'])if($('#'+dialog).open)$('#'+dialog).close();
closeMapPanel();stopFishing();clearLochDragon();clearBlueMarlin();resetPetDragon();resetWatersports();resetSurfing();resetVolleyball();resetFrisbee();resetSunbathers();goggleToss=null;boating=false;swimming=false;diveAnimation=null;shoreClimb=null;shoreRecovery=null;timberStep=null;beachTransfer=null;sharkFins=[];boatPosition={...BOAT_MOORING};resetBoatMotion();pendingCast=null;fishSet='classic';keys.clear();
profileId=id;ageLevel=currentProfile().age;KEY=progressKey();state=loadProgress();restoreParkedBoat();questions=questionsByAge[ageLevel];
player.x=Number.isFinite(state.x)?state.x:230;player.y=Number.isFinite(state.y)?state.y:176;
if(!canWalk(player.x,player.y)){player.x=230;player.y=176;}
active=0;answerComplete=false;near=-1;update();checkSponsorship();openMapPanel('settingsPanel');$('#profileFeedback').textContent='';draw();toast(`${currentProfile().name}’s island is ready!`);
}
// Confirm against the saved profile identity, rather than the editable name field.
let pendingProfileAction=null;
function requestProfileAction(action){
if(!['reset','delete'].includes(action))return;
if(voyage){$('#profileFeedback').textContent='Manage this profile after the ferry arrives.';return;}
const profile=currentProfile();
pendingProfileAction={action,id:profile.id};keys.clear();
$('#profileActionTitle').textContent=action==='reset'?`Reset ${profile.name} to zero?`:`Delete ${profile.name}?`;
$('#profileActionDescription').textContent=action==='reset'
?`This permanently clears ${profile.name}’s progress at all four math levels, including crystals, discoveries, upgrades, gear, records, fish collections, and reserve gas. Their name, character, and selected math level stay. Energy and boat fuel return to the starting amounts. This cannot be undone.`
:`This permanently deletes ${profile.name} and all their progress at every math level. This cannot be undone. ${profiles.length===1?'A fresh Explorer profile will be created.':'Your other profiles will stay saved.'}`;
$('#confirmProfileAction').textContent=action==='reset'?'Reset profile to zero':'Delete profile';
$('#profileActionConfirm').showModal();$('#cancelProfileAction').focus();
}
function confirmProfileAction(){
if(!$('#profileActionConfirm').open||!pendingProfileAction)return;
const {action,id}=pendingProfileAction;
if(id!==profileId||voyage){$('#profileActionConfirm').close();pendingProfileAction=null;return;}
const profile=currentProfile(),name=profile.name;
let nextProfiles=action==='reset'
?profiles.map(p=>p.id===id?{id,name,character:p.character,age:p.age}:p)
:profiles.filter(p=>p.id!==id);
if(!nextProfiles.length)nextProfiles=[{id:id==='legacy'?'p1':'p'+(Number(id.slice(1))+1),name:'Explorer',character:'boy',age:ageLevel}];
const nextId=action==='reset'?id:nextProfiles[0].id;
// Remove every age save before loading a fresh profile, so permanent gear cannot migrate back.
const previous=new Map();
try{
previous.set(PROFILE_KEY,localStorage.getItem(PROFILE_KEY));
for(const age of AGE_LEVELS){const key=progressKey(id,age);previous.set(key,localStorage.getItem(key));}
for(const age of AGE_LEVELS)localStorage.removeItem(progressKey(id,age));
localStorage.setItem(PROFILE_KEY,JSON.stringify({active:nextId,profiles:nextProfiles}));
}catch{
for(const [key,value] of previous){try{if(value!=null)localStorage.setItem(key,value);}catch{}}
$('#profileActionConfirm').close();pendingProfileAction=null;
$('#profileFeedback').textContent='Browser storage is unavailable. The profile could not be changed. Please try again.';return;
}
$('#profileActionConfirm').close();pendingProfileAction=null;
profiles=nextProfiles;
switchProfile(nextId,{saveCurrent:false,force:true});
$('#profileFeedback').textContent=storageOK
?(action==='reset'?`${name} has been reset to zero at every math level.`:`${name} was deleted.`)
:'Profile changed for this session; browser storage is unavailable.';
}
$('#resetProfile').onclick=()=>requestProfileAction('reset');
$('#deleteProfile').onclick=()=>requestProfileAction('delete');
$('#cancelProfileAction').onclick=()=>{$('#profileActionConfirm').close();pendingProfileAction=null;};
$('#confirmProfileAction').onclick=confirmProfileAction;
function loadProgress(){
let loaded={...defaults,solved:[],upgrades:[]};
try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&Array.isArray(s.solved)&&Array.isArray(s.upgrades))loaded={...defaults,...s,travelRules:s.travelRules===2?2:1,solved:[...new Set(s.solved.filter(n=>Number.isInteger(n)&&n>=0&&n<QUESTION_COUNT))],upgrades:[...new Set(s.upgrades.filter(n=>['cottage','garden','bridge'].includes(n)))],crystals:Math.max(0,Number(s.crystals)||0)};}catch{storageOK=false;}
loaded.surfRental=loaded.surfRental===true;loaded.surfBest=Number.isFinite(loaded.surfBest)?Math.max(0,Math.floor(loaded.surfBest)):0;
loaded.wakeboard=loaded.wakeboard===true;
loaded.waterskis=loaded.waterskis===true;
loaded.power=Number.isFinite(currentProfile().power)?currentProfile().power:(Number.isFinite(loaded.power)?Math.max(0,Math.min(POWER_MAX,loaded.power)):POWER_MAX);
currentProfile().power=loaded.power;
loaded.earnedCrystals=Math.max(loaded.solved.length*5,Math.floor(Number(loaded.earnedCrystals)||0));
loaded.bait=Math.max(0,Math.min(5,Math.floor(Number(loaded.bait)||0)));
loaded.fishingLure=loaded.fishingLure===true;loaded.catches={...Object.fromEntries([...FISH_IDS,'barracuda','stingray','marlin'].map(id=>[id,0])),...normalizeCounts(loaded.catches)};
const profile=currentProfile();
profile.fuel??={fishing:100,speedboat:100};profile.reserveGas=Math.max(0,Number(profile.reserveGas)||0);
if(!profile.lifetimeCatches){
profile.lifetimeCatches={};
for(const age of AGE_LEVELS){try{const prior=JSON.parse(localStorage.getItem(progressKey(profileId,age)));for(const [id,n] of Object.entries(normalizeCounts(prior?.catches)))profile.lifetimeCatches[id]=(profile.lifetimeCatches[id]||0)+n;}catch{storageOK=false;}}
}
// Old passes have no ownership meaning under the single-ride rules.
loaded.ferryTicket=loaded.travelRules===2&&loaded.ferryTicket===true;
loaded.ferryRemaining=loaded.travelRules===2?Math.max(0,Math.min(FERRY_RIDE_DURATION,Number(loaded.ferryRemaining)||0)):0;
loaded.travelRules=2;delete profile.ferryTicket;
// Permanent gear earned in any age level belongs to the explorer profile.
let ownsAnchor=currentProfile().anchor===true||loaded.anchor===true;
let ownsSpeedboat=currentProfile().speedboat===true||loaded.speedboat===true||qualifiesForSpeedboat(loaded);
for(const age of AGE_LEVELS){try{
const saved=JSON.parse(localStorage.getItem(progressKey(profileId,age)));
if(saved?.anchor===true)ownsAnchor=true;
if(saved?.speedboat===true||qualifiesForSpeedboat(saved)||new Set(saved?.solved?.filter(n=>Number.isInteger(n)&&n>=0&&n<QUESTION_COUNT)||[]).size*5>=SPEEDBOAT_UNLOCK_CRYSTALS)ownsSpeedboat=true;
}catch{storageOK=false;}}
currentProfile().anchor=ownsAnchor;loaded.anchor=ownsAnchor;
currentProfile().speedboat=ownsSpeedboat;loaded.speedboat=ownsSpeedboat;
loaded.boatIslandsVisited=Array.isArray(loaded.boatIslandsVisited)?[...new Set(loaded.boatIslandsVisited.filter(id=>typeof id==='string'))]:[];
const anchorage=loaded.beachAnchor;loaded.beachAnchor=anchorage&&loaded.anchor&&Number.isFinite(anchorage.x)&&Number.isFinite(anchorage.y)&&Number.isFinite(anchorage.landing?.x)&&Number.isFinite(anchorage.landing?.y)?anchorage:null;
loaded.boatIsland=typeof loaded.boatIsland==='string'?loaded.boatIsland:null;
const parked=loaded.parkedBoat;loaded.parkedBoat=parked&&Number.isFinite(parked.x)&&Number.isFinite(parked.y)&&parked.x>WORLD.left&&parked.y>0&&parked.x<WORLD.right&&parked.y<WORLD.height?{x:parked.x,y:parked.y,heading:Number.isFinite(parked.heading)?parked.heading:0,vessel:['ferry','speedboat'].includes(parked.vessel)?parked.vessel:'fishing'}:null;
loaded.tradingTickets=Number.isSafeInteger(loaded.tradingTickets)&&loaded.tradingTickets>=0?loaded.tradingTickets:0;
return loaded;
}
let state=loadProgress();
function hasSwimPower(){return adminMode||!POWER_ENABLED||state.power>0;}
$('#powerSolve').onclick=()=>{
if(!POWER_ENABLED)return;
stopFishing();keys.clear();
const location=locations.find((l,i)=>l.ids.some(id=>!state.solved.includes(id)));
openQuestion(location?location.ids.find(id=>!state.solved.includes(id)):0);
};
function updatePowerMeter(){
$('#powerMeter').hidden=!POWER_ENABLED;if(!POWER_ENABLED)return;
if(adminMode){
$('#powerValue').textContent='∞ Unlimited';$('#powerBar').style.width='100%';
$('#powerGauge').setAttribute('aria-valuenow','100');$('#powerGauge').setAttribute('aria-valuetext','Unlimited energy while admin mode is active.');
$('#powerMeter').setAttribute('data-level','ready');$('#powerHelp').textContent='Admin mode · unlimited energy';return;
}
const value=Math.max(0,Math.min(POWER_MAX,state.power)),shown=Math.ceil(value);
$('#powerValue').textContent=`${shown} / ${POWER_MAX}`;
$('#powerBar').style.width=`${value}%`;
$('#powerGauge').setAttribute('aria-valuenow',String(shown));
$('#powerGauge').setAttribute('aria-valuetext',value>0?`${shown} energy. Correct answers restore 25 energy.`:'No energy. Solve a problem before swimming.');
$('#powerMeter').setAttribute('data-level',value===0?'empty':value<=25?'low':'ready');
$('#powerHelp').textContent=value===0?'Solve a problem to swim again':'Correct answer: +25 energy';
}
function restorePower(){if(!POWER_ENABLED)return;state.power=Math.min(POWER_MAX,state.power+POWER_PER_ANSWER);currentProfile().power=state.power;updatePowerMeter();}
function nearestPoweredShore(){
let best={x:230,y:176},distance=Infinity;
const wasSwimming=swimming;swimming=false;
islandPolys.forEach((poly,index)=>{
if(allIslands[index]?.boatOnly)return;
const xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]);
for(let x=Math.min(...xs)+2;x<=Math.max(...xs);x+=6)for(let y=Math.min(...ys)+2;y<=Math.max(...ys);y+=6){
const d=(x-player.x)**2+(y-player.y)**2;
if(d<distance&&inside(x,y,poly)&&canWalk(x,y)){best={x,y};distance=d;}
}
});
swimming=wasSwimming;return best;
}
function returnToShoreWithoutPower(){
const shore=nearestPoweredShore();if(dragonFlight?.stage==='swimming'){dragonFlight=null;petDragonPosition={...shore};}stopFishing();clearSharkRide();resetSwimMotion();
swimming=false;boating=false;diveAnimation=null;shoreClimb=null;shoreRecovery=null;timberStep=null;beachTransfer=null;goggleToss=null;
player.x=shore.x;player.y=shore.y;keys.clear();save();updateFishing();
toast('Out of energy! You are safely back on land. Solve a problem to swim again.');
}
function advancePower(dt){
if(!POWER_ENABLED||adminMode)return;
if((!swimming&&dragonFlight?.stage!=='swimming')||dt<=0||document.querySelector('dialog[open]'))return;
const drainRate=sharkRide||dragonFlight?.stage==='swimming'?RIDING_ENERGY_DRAIN_PER_SECOND:POWER_DRAIN_PER_SECOND;
const before=state.power;state.power=Math.max(0,state.power-dt/1000*drainRate);
currentProfile().power=state.power;
if(Math.ceil(before)!==Math.ceil(state.power)){updatePowerMeter();save();}
if(!hasSwimPower())returnToShoreWithoutPower();
}
const squishyTiers=[
{id:'common',name:'Common',detail:'Everyday Retail'},
{id:'uncommon',name:'Uncommon',detail:'Seasonal & High Demand'},
{id:'hard-to-find',name:'Hard-to-Find',detail:'Specialty Boutique Exclusives'},
{id:'rare',name:'Rare',detail:'Store Exclusives & High Resale Demand'},
{id:'ultra-rare',name:'Ultra Rare',detail:'Vaulted & Discontinued'},
{id:'mythic',name:'Mythic',detail:'Limited Promotional Releases'}
];
// Keep the original seven reward slots and IDs so existing treasures survive.
const squishies=[
{id:'gummy-bear',name:'NeeDoh Gummy Bear',tier:'uncommon',icon:'ʕ•ᴥ•ʔ',style:'bear'},
{id:'pink-cube',name:'Nice Cube',tier:'uncommon',detail:'Pink glow-in-the-dark edition',icon:'▣',style:'pink-cube'},
{id:'teenie-fuzz',name:'Teenie Fuzz Ball',tier:'common',icon:'✺',style:'fuzz'},
{id:'ice-cream',name:'NeeDoh Ice Cream',tier:'common',icon:'🍦',style:'ice-cream'},
{id:'pizza',name:'NeeDoh Pizza',tier:'common',icon:'🍕',style:'pizza'},
{id:'snowball',name:'NeeDoh Snowball Crunch',tier:'uncommon',icon:'❄',style:'snowball'},
{id:'skull-cat',name:'NeeDoh Skull Cat',tier:'rare',icon:'🐱',style:'skull-cat'},
...[
['common','classic','Classic NeeDoh','●'],
['common','super','Super NeeDoh','⬤'],
['common','color-changing','Color Changing NeeDoh','◐'],
['common','teenie','Teenie NeeDoh (Multi-packs)','●●'],
['common','mello-mallo','Mello Mallo','▰'],
['uncommon','nice-cube','Nice Cube (Standard variants)','▣'],
['uncommon','dohnuts','Dohnuts & Dohnut Holes','◎'],
['uncommon','happy-snappy','Happy Snappy','✿'],
['uncommon','advent','Holiday Advent Calendars','🎁'],
['hard-to-find','cloud','Cloud Pleaser','☁'],
['hard-to-find','dream-drop','Dream Drop (Galactic Glow)','💧'],
['hard-to-find','jelly','Jelly Squish','◒'],
['hard-to-find','berg','Nice Berg / Swirl Nice Berg','▲'],
['rare','krystal-kitty','Claire’s Exclusive Krystal Kitty','🐱'],
['rare','cake',"Peace O’ Cake",'🍰'],
['rare','wow-cube','Wow Flake / Candy Swirl Nice Cubes','❄'],
['rare','power-tower',"Sam’s Club Exclusive Power Tower",'▥'],
['ultra-rare','magma','NeeDoh Magma','🌋'],
['ultra-rare','dohjees','Dohjees','✦'],
['ultra-rare','shaggy','Original 2019 Shaggy NeeDoh','✺'],
['ultra-rare','dumpling','Rainbow Mystery Dumpling (Chase variants)','🌈'],
['mythic','gold-cube','50th Anniversary Gold Nice Cube','▣']
].map(([tier,id,name,icon])=>({tier,id,name,icon,style:tier}))
];
function squishyArt(s){return `<span class="squishy-art ${s.style}" aria-hidden="true">${s.icon}</span>`;}
function earnedSquishies(){return Math.min(squishies.length,Math.floor(state.earnedCrystals/50));}
function syncSquishies(){
const earned=earnedSquishies();
if(!Array.isArray(state.squishyInventory)){state.squishyInventory=squishies.slice(0,earned).map(s=>s.id);state.squishyClaims=earned;}
else{
state.squishyInventory=state.squishyInventory.filter(id=>squishies.some(s=>s.id===id));
state.squishyClaims=Math.max(0,Math.min(squishies.length,Number.isSafeInteger(state.squishyClaims)?state.squishyClaims:earned));
while(state.squishyClaims<earned)state.squishyInventory.push(squishies[state.squishyClaims++].id);
}
}
function updateSquishies(){
syncSquishies();const count=state.squishyInventory.length,next=squishies[earnedSquishies()];
$('#squishyProgress').textContent=next?`${50-state.earnedCrystals%50} more crystals to ${next.name}`:'All collection rewards earned! Keep trading to try new treasures.';
$('#squishyBar').style.width=(next?state.earnedCrystals%50*2:100)+'%';
$('#stashCount').textContent=`${count} ${count===1?'squishee':'squishees'} tucked away`;
$('#stashSummary').textContent=`${count} squishees in your chest · ${squishies.length} available across six tiers. Earn one every 50 lifetime crystals. Trading swaps one treasure for another of the same tier.`;
$('#stashNext').textContent=next?`${next.name} — ${50-state.earnedCrystals%50} more crystals to earn.`:'All collection rewards earned! Your trading tickets let you swap within each tier.';
$('#squishyCollection').innerHTML=state.squishyInventory.map(id=>{const s=squishies.find(s=>s.id===id);return `<li class="squishy-item earned">${squishyArt(s)}<div><strong>${s.name}</strong><small>${squishyTiers.find(t=>t.id===s.tier).name}${s.detail?' · '+s.detail:''}</small><small>✓ Collected</small></div></li>`;}).join('');
$('#ticketCount').textContent=`🎟 ${state.tradingTickets} trading ${state.tradingTickets===1?'ticket':'tickets'}`;
const previous=$('#tradeGive').value;
$('#tradeGive').innerHTML=state.squishyInventory.map((id,i)=>`<option value="${i}">${squishies.find(s=>s.id===id).name}</option>`).join('');
if(state.squishyInventory[Number(previous)])$('#tradeGive').value=previous;
updateTradeOptions();
$('#squishyCatalog').innerHTML=squishyTiers.map(t=>`<section class="catalog-tier" data-tier="${t.id}"><h3>${t.name}</h3><p>${t.detail}</p><ul>${squishies.filter(s=>s.tier===t.id).map(s=>`<li>${s.name}${state.squishyInventory.includes(s.id)?' <strong>✓ Owned</strong>':''}</li>`).join('')}</ul></section>`).join('');
}
function updateTradeOptions(){
const offered=squishies.find(s=>s.id===state.squishyInventory[Number($('#tradeGive').value)]);
$('#tradeReceive').innerHTML=offered?squishies.filter(s=>s.tier===offered.tier&&s.id!==offered.id).map(s=>`<option value="${s.id}">${s.name}</option>`).join(''):'';
$('#tradeTier').textContent=offered?`${squishyTiers.find(t=>t.id===offered.tier).name} tier only${$('#tradeReceive').innerHTML?'':' · No other squishees in this tier yet.'}`:'Earn your first squishee to start trading.';
$('#tradeSubmit').disabled=!offered||!state.tradingTickets||!$('#tradeReceive').innerHTML;
}
function tradeSquishy(){
syncSquishies();const slot=Number($('#tradeGive').value),offered=squishies.find(s=>s.id===state.squishyInventory[slot]),received=squishies.find(s=>s.id===$('#tradeReceive').value);
if(!Number.isInteger(slot)||!offered||!received||offered.id===received.id||offered.tier!==received.tier||state.tradingTickets<1)return;
state.squishyInventory[slot]=received.id;state.tradingTickets--;update();
$('#tradeFeedback').textContent=`Traded ${offered.name} for ${received.name}. One trading ticket used!`;chime();
}
let flashRun=null,flashTimer;
function flashQuestion(){
if(ageLevel==='5-6'){
const total=2+Math.floor(Math.random()*9),part=1+Math.floor(Math.random()*total);
return Math.random()<.5?{q:`${part} + ${total-part}`,answer:total}:{q:`${total} − ${part}`,answer:total-part};
}
if(ageLevel==='7-8'){
const a=1+Math.floor(Math.random()*10),b=[2,5,10][Math.floor(Math.random()*3)],op=Math.floor(Math.random()*4);
return op===0?{q:`${a} + ${b}`,answer:a+b}:op===1?{q:`${a+b} − ${b}`,answer:a}:op===2?{q:`${a} × ${b}`,answer:a*b}:{q:`${a*b} ÷ ${b}`,answer:a};
}
const a=2+Math.floor(Math.random()*(ageLevel==='9-10'?10:18)),b=2+Math.floor(Math.random()*10),op=Math.floor(Math.random()*4);
return op===0?{q:`${a} + ${b}`,answer:a+b}:op===1?{q:`${a+b} − ${b}`,answer:a}:op===2?{q:`${a} × ${b}`,answer:a*b}:{q:`${a*b} ÷ ${b}`,answer:a};
}
function cancelFlash(){clearTimeout(flashTimer);flashRun=null;}
function startFlash(){
closeMapPanel();cancelFlash();keys.clear();flashRun={correct:0};$('#flash').showModal();nextFlashQuestion();
}
function nextFlashQuestion(){
flashRun.question=flashQuestion();flashRun.deadline=Date.now()+15000;
$('#flashProgress').textContent=`${flashRun.correct} / 10 correct in a row`;
$('#flashBody').innerHTML=`<p class="question flash-question">${flashRun.question.q} = ?</p><form id="flashForm" class="answer-form"><label class="sr-only" for="flashAnswer">Your answer</label><input id="flashAnswer" inputmode="decimal" autocomplete="off" required aria-label="Your answer"><button class="primary">Answer ↗</button></form>`;
$('#flashForm').onsubmit=e=>{e.preventDefault();submitFlash();};$('#flashAnswer').focus();updateFlashClock();
}
function updateFlashClock(){
clearTimeout(flashTimer);if(!flashRun)return;
const remaining=flashRun.deadline-Date.now();$('#flashClock').textContent=`${Math.max(0,Math.ceil(remaining/1000))} seconds left`;
$('#flashTimeBar').style.width=Math.max(0,remaining/150)+'%';
if(remaining<=0){finishFlash(false,'Time’s up!');return;}flashTimer=setTimeout(updateFlashClock,100);
}
function submitFlash(){
if(!flashRun)return;if(Date.now()>=flashRun.deadline){finishFlash(false,'Time’s up!');return;}
if(Math.abs(parseNumber($('#flashAnswer').value)-flashRun.question.answer)>.00001||!Number.isFinite(parseNumber($('#flashAnswer').value))){finishFlash(false,'That answer missed.');return;}
restorePower();save();flashRun.correct++;if(flashRun.correct===10)finishFlash(true);else nextFlashQuestion();
}
function finishFlash(won,message=''){
const correct=flashRun.correct;cancelFlash();
if(won){state.tradingTickets++;update();chime();}
$('#flashClock').textContent=won?'Ticket earned!':'Try a fresh streak';$('#flashProgress').textContent=`${correct} / 10 correct in a row`;
$('#flashBody').innerHTML=`<div class="celebration"><h2>${won?'🎟 You earned a trading ticket!':message}</h2><p>${won?'Swap one of your squishees for another in the same tier at the trading counter.':'A wrong answer or 15-second timeout ends the streak. You can try again as often as you like.'}</p><button class="primary" id="flashRetry">${won?'Earn another ticket':'Try again'}</button><button class="text-button" data-flash-back>Back to the trading counter ↗</button></div>`;
$('#flashRetry').onclick=startFlash;$('[data-flash-back]').onclick=()=>$('#flash').close();
}
const player={x:230,y:176,facing:'down'};if(Number.isFinite(state.x)&&Number.isFinite(state.y)){player.x=state.x;player.y=state.y;}
const locations=[{name:'Explorer’s cottage',x:218,y:139,icon:'⌂',ids:[0,1,2,3],color:'#f1cc86'},{name:'Moonwater pond',x:144,y:181,icon:'≈',ids:[4,5,6,7],color:'#abd4de'},{name:'Sunseed garden',x:286,y:205,icon:'✿',ids:[8,9,10,11],color:'#eab4a3'},{name:'Whispering woods',x:109,y:108,icon:'♠',ids:[12,13,14,15],color:'#c3d79b'},{name:'Crystal cavern',x:393,y:95,icon:'◆',ids:[16,17,18,19],color:'#cebde8'}];
locations.forEach((l,i)=>{const positions=[[218,139],[500,150],[760,155],[300,435],[740,435]];[l.x,l.y]=positions[i];});
const upgrades=[{id:'cottage',name:'A cozy cottage',sub:'Give your explorer a home',cost:15,icon:'⌂'},{id:'garden',name:'A blooming garden',sub:'Bring a little color to the island',cost:20,icon:'✿'},{id:'bridge',name:'The woodland bridge',sub:'Connect Sunseed Island to Crystal Cavern',cost:25,icon:'≋'}];
// Answers are checked as numbers, equivalent fractions, or ordered pairs.
const olderQuestions=[
{title:'A field of possibility',skill:'Multiplication',q:'Plant 18 rows of glowing flowers, with 14 flowers in each row. How many flowers will you plant?',answer:252,kind:'groups',a:18,b:14,unit:'flowers',hint:['Split 14 into 10 + 4.','18 × 10 = 180, and 18 × 4 = 72.','Add the two parts: 180 + 72.'],explain:'18 × 14 = (18 × 10) + (18 × 4) = 180 + 72 = 252.'},
{title:'Breakfast for everyone',skill:'Division',q:'Share 156 berries equally among 12 creatures. How many berries does each creature get?',answer:13,kind:'groups',a:12,b:13,unit:'berries',division:true,hint:['Think: 12 times what makes 156?','12 × 10 = 120. There are 36 berries left.','36 ÷ 12 = 3. Add 10 and 3.'],explain:'156 ÷ 12 = 13. Every creature gets 13 berries.'},
{title:'Power up the camp',skill:'Order of operations',q:'The crystal machine produces 8 + 3 × (12 − 7) crystals. How many crystals is that?',answer:23,kind:'order',hint:['Start inside the parentheses.','12 − 7 = 5. Now do the multiplication: 3 × 5.','8 + 15 is the final step.'],explain:'8 + 3 × (12 − 7) = 8 + 3 × 5 = 8 + 15 = 23.'},
{title:'A warmer morning',skill:'Negative numbers',q:'The mountain is −4°C. The temperature rises by 9°C. What is the new temperature?',answer:5,kind:'line',min:-10,max:15,start:-4,unit:'°C',hint:['A rise means move right on the number line.','Move 4 steps from −4 to reach zero.','You have 5 of your 9 steps left.'],explain:'−4 + 9 = 5°C.'},
{title:'Fuel for the journey',skill:'Adding fractions',q:'Your fuel tank is 3/4 full. Add another 1/8 of a tank. What fraction of the tank is full now?',answer:7/8,kind:'fraction',den:8,initial:6,hint:['Make the fraction pieces the same size.','3/4 is the same as 6/8.','Add 6 eighths and 1 eighth.'],explain:'3/4 + 1/8 = 6/8 + 1/8 = 7/8.'},
{title:'A rope for the raft',skill:'Subtracting fractions',q:'You have 5/6 metre of rope and use 1/4 metre. What fraction of a metre remains?',answer:7/12,kind:'fraction',den:12,initial:10,hint:['Use twelfths so both fractions have equal pieces.','5/6 = 10/12 and 1/4 = 3/12.','Remove 3 of the 10 selected pieces.'],explain:'5/6 − 1/4 = 10/12 − 3/12 = 7/12 metre.'},
{title:'A nursery surprise',skill:'Fractions of quantities',q:'There are 32 eggs in the nursery. Today, 3/8 of them hatch. How many eggs hatch?',answer:12,kind:'partition',total:32,parts:8,take:3,hint:['Split 32 eggs into 8 equal groups.','32 ÷ 8 = 4 eggs in each group.','Select 3 groups of 4 eggs.'],explain:'3/8 of 32 = (32 ÷ 8) × 3 = 12 eggs.'},
{title:'Room for fruit',skill:'Multiplying fractions',q:'A garden covers 2/3 of a field. Fruit grows in 3/4 of that garden. What fraction of the whole field grows fruit?',answer:.5,kind:'area',hint:['The green region is 2 of the 3 columns.','Select 3 of the 4 rows. The overlap is the fruit area.','There are 6 overlapping cells out of 12 total cells. Simplify 6/12.'],explain:'2/3 × 3/4 = 6/12 = 1/2 of the field.'},
{title:'Bridge the gap',skill:'Adding decimals',q:'Two bridge sections measure 3.75 m and 2.6 m. What is their combined length?',answer:6.35,kind:'decimal',expression:'3.75 + 2.60',hint:['Line up the decimal points.','Write 2.6 as 2.60. Add hundredths, then tenths, then ones.','0.75 + 0.60 = 1.35. Add that to 3 + 2.'],explain:'3.75 + 2.60 = 6.35 metres.'},
{title:'Seeds for spring',skill:'Multiplying decimals',q:'One bag of seeds weighs 1.25 kg. How much do 6 bags weigh?',answer:7.5,kind:'groups',a:6,b:1.25,unit:'kg',hint:['Split 1.25 into 1 + 0.25.','6 × 1 = 6 kg. Six quarters make 1.5 kg.','Add 6 + 1.5.'],explain:'1.25 × 6 = 7.5 kg.'},
{title:'The habitat shop',skill:'Percentages',q:'A habitat costs 80 crystals. The shop gives a 25% discount. What is the new price?',answer:60,kind:'percent',hint:['25% is one quarter.','One quarter of 80 is 20 crystals.','Subtract the 20-crystal discount from 80.'],explain:'25% of 80 = 20. The new price is 80 − 20 = 60 crystals.'},
{title:'Pick the fullest tank',skill:'Comparing values',q:'Which is greatest: 3/5, 0.58, or 62%? Select your answer below.',answer:.62,kind:'compare',hint:['Convert all three amounts to percentages.','3/5 = 60%, and 0.58 = 58%.','Compare 60%, 58%, and 62%.'],explain:'3/5 = 60%, 0.58 = 58%, and 62% is the greatest.'},
{title:'Berry good balance',skill:'Ratios',q:'Creature food uses red and blue berries in a 2:3 ratio. There are 20 berries altogether. How many are blue?',answer:12,kind:'ratio',hint:['2 red parts + 3 blue parts = 5 equal parts.','20 ÷ 5 = 4 berries per part.','There are 3 blue parts. Multiply 3 × 4.'],explain:'20 ÷ (2 + 3) = 4 berries per part. Blue berries: 3 × 4 = 12.'},
{title:'Catch the sky current',skill:'Unit rates',q:'An airship travels 84 km in 3 hours at a steady speed. How far does it travel in 5 hours?',answer:140,kind:'rate',hint:['Find how far the ship travels in one hour.','84 ÷ 3 = 28 km per hour.','Multiply 28 by 5 hours.'],explain:'84 ÷ 3 = 28 km/h. In 5 hours: 28 × 5 = 140 km.'},
{title:'The missing crystals',skill:'One-step equations',q:'You earn 17 crystals and now have 42. How many did you start with? Solve x + 17 = 42.',answer:25,kind:'balance',offset:17,total:42,mult:1,hint:['Keep both sides of the balance equal.','Subtract 17 from each side.','x = 42 − 17.'],explain:'x + 17 − 17 = 42 − 17, so x = 25.'},
{title:'Battery mystery',skill:'Two-step equations',q:'Three identical batteries plus 5 reserve units provide 26 energy units. Solve 3x + 5 = 26.',answer:7,kind:'balance',offset:5,total:26,mult:3,hint:['First remove the 5 reserve units from both sides.','3x = 21. Divide both sides into 3 equal groups.','x = 21 ÷ 3.'],explain:'3x + 5 = 26 → 3x = 21 → x = 7.'},
{title:'Crystal rhythm',skill:'Sequences',q:'A generator makes 5, 9, 13, 17, … crystals on days 1, 2, 3, 4. How many does it make on day 10?',answer:41,kind:'sequence',hint:['The amount increases by 4 each day.','Day 1 starts at 5. Day 10 is 9 increases later.','5 + (9 × 4), or use the rule 4 × day + 1.'],explain:'Day 10: 5 + 9 × 4 = 41 crystals.'},
{title:'A home with room to roam',skill:'Area and perimeter',q:'A rectangular habitat is 9 m long and 6 m wide. Find its floor area AND the fencing around it. Enter area, perimeter (for example: 12, 14).',answer:[54,30],kind:'rectangle',hint:['Area counts the squares inside. Perimeter measures the outside edge.','Area = 9 × 6. Perimeter = 9 + 6 + 9 + 6.','Enter the area first, then the perimeter, separated by a comma.'],explain:'Area = 9 × 6 = 54 m². Perimeter = 2 × (9 + 6) = 30 m.'},
{title:'Water for the island',skill:'Volume',q:'A rectangular tank is 5 m long, 3 m wide, and 2 m high. What is its volume in cubic metres?',answer:30,kind:'volume',hint:['Count the unit cubes in one layer first.','One layer has 5 × 3 = 15 cubes.','There are 2 layers. Multiply 15 × 2.'],explain:'Volume = length × width × height = 5 × 3 × 2 = 30 m³.'},
{title:'Set sail',skill:'Angles',q:'A triangular sail has angles of 48° and 67°. What is the third angle?',answer:65,kind:'angle',hint:['The three angles of a triangle add up to 180°.','48° + 67° = 115°.','Find 180° − 115°.'],explain:'180° − 48° − 67° = 65°.'}
];
// Keep the original question IDs stable so existing progress is preserved.
olderQuestions.push(
{"title": "Lantern delivery 1", "skill": "Multiplication", "q": "The cottage receives 12 crates with 7 lanterns in each. How many lanterns arrive?", "answer": 84, "kind": "guided", "hint": ["Split 12 into 10 + 2.", "Find 10 × 7 and 2 × 7.", "12 × 7 = 84 lanterns."], "steps": ["Split 12 into 10 + 2.", "Find 10 × 7 and 2 × 7.", "12 × 7 = 84 lanterns."], "explain": "12 × 7 = 84 lanterns."},
{"title": "Picnic parcels 1", "skill": "Division", "q": "Share 84 biscuits equally among 6 picnic baskets. How many go in each basket?", "answer": 14, "kind": "guided", "hint": ["Find the number that multiplies by 6 to make 84.", "6 × 10 = 60; 24 biscuits remain.", "84 ÷ 6 = 14 biscuits per basket."], "steps": ["Find the number that multiplies by 6 to make 84.", "6 × 10 = 60; 24 biscuits remain.", "84 ÷ 6 = 14 biscuits per basket."], "explain": "84 ÷ 6 = 14 biscuits per basket."},
{"title": "Workshop power 1", "skill": "Order of operations", "q": "Calculate 9 + 4 × (8 − 5) energy units.", "answer": 21, "kind": "guided", "hint": ["Parentheses first: 8 − 5 = 3.", "Multiply next: 4 × 3 = 12.", "9 + 12 = 21 energy units."], "steps": ["Parentheses first: 8 − 5 = 3.", "Multiply next: 4 × 3 = 12.", "9 + 12 = 21 energy units."], "explain": "9 + 12 = 21 energy units."},
{"title": "Frosty sunrise 1", "skill": "Negative numbers", "q": "The temperature starts at -12°C and rises by 7°C. What is the new temperature?", "answer": -5, "kind": "guided", "hint": ["A rise means add; move right on a number line.", "Start at -12 and move 7 steps right.", "-12 + 7 = -5°C."], "steps": ["A rise means add; move right on a number line.", "Start at -12 and move 7 steps right.", "-12 + 7 = -5°C."], "explain": "-12 + 7 = -5°C."},
{"title": "Lantern delivery 2", "skill": "Multiplication", "q": "The cottage receives 15 crates with 9 lanterns in each. How many lanterns arrive?", "answer": 135, "kind": "guided", "hint": ["Split 15 into 10 + 5.", "Find 10 × 9 and 5 × 9.", "15 × 9 = 135 lanterns."], "steps": ["Split 15 into 10 + 5.", "Find 10 × 9 and 5 × 9.", "15 × 9 = 135 lanterns."], "explain": "15 × 9 = 135 lanterns."},
{"title": "Picnic parcels 2", "skill": "Division", "q": "Share 112 biscuits equally among 7 picnic baskets. How many go in each basket?", "answer": 16, "kind": "guided", "hint": ["Find the number that multiplies by 7 to make 112.", "7 × 10 = 70; 42 biscuits remain.", "112 ÷ 7 = 16 biscuits per basket."], "steps": ["Find the number that multiplies by 7 to make 112.", "7 × 10 = 70; 42 biscuits remain.", "112 ÷ 7 = 16 biscuits per basket."], "explain": "112 ÷ 7 = 16 biscuits per basket."},
{"title": "Workshop power 2", "skill": "Order of operations", "q": "Calculate 11 + 5 × (9 − 5) energy units.", "answer": 31, "kind": "guided", "hint": ["Parentheses first: 9 − 5 = 4.", "Multiply next: 5 × 4 = 20.", "11 + 20 = 31 energy units."], "steps": ["Parentheses first: 9 − 5 = 4.", "Multiply next: 5 × 4 = 20.", "11 + 20 = 31 energy units."], "explain": "11 + 20 = 31 energy units."},
{"title": "Frosty sunrise 2", "skill": "Negative numbers", "q": "The temperature starts at -11°C and rises by 9°C. What is the new temperature?", "answer": -2, "kind": "guided", "hint": ["A rise means add; move right on a number line.", "Start at -11 and move 9 steps right.", "-11 + 9 = -2°C."], "steps": ["A rise means add; move right on a number line.", "Start at -11 and move 9 steps right.", "-11 + 9 = -2°C."], "explain": "-11 + 9 = -2°C."},
{"title": "Lantern delivery 3", "skill": "Multiplication", "q": "The cottage receives 18 crates with 11 lanterns in each. How many lanterns arrive?", "answer": 198, "kind": "guided", "hint": ["Split 18 into 10 + 8.", "Find 10 × 11 and 8 × 11.", "18 × 11 = 198 lanterns."], "steps": ["Split 18 into 10 + 8.", "Find 10 × 11 and 8 × 11.", "18 × 11 = 198 lanterns."], "explain": "18 × 11 = 198 lanterns."},
{"title": "Picnic parcels 3", "skill": "Division", "q": "Share 144 biscuits equally among 8 picnic baskets. How many go in each basket?", "answer": 18, "kind": "guided", "hint": ["Find the number that multiplies by 8 to make 144.", "8 × 10 = 80; 64 biscuits remain.", "144 ÷ 8 = 18 biscuits per basket."], "steps": ["Find the number that multiplies by 8 to make 144.", "8 × 10 = 80; 64 biscuits remain.", "144 ÷ 8 = 18 biscuits per basket."], "explain": "144 ÷ 8 = 18 biscuits per basket."},
{"title": "Workshop power 3", "skill": "Order of operations", "q": "Calculate 13 + 6 × (10 − 5) energy units.", "answer": 43, "kind": "guided", "hint": ["Parentheses first: 10 − 5 = 5.", "Multiply next: 6 × 5 = 30.", "13 + 30 = 43 energy units."], "steps": ["Parentheses first: 10 − 5 = 5.", "Multiply next: 6 × 5 = 30.", "13 + 30 = 43 energy units."], "explain": "13 + 30 = 43 energy units."},
{"title": "Frosty sunrise 3", "skill": "Negative numbers", "q": "The temperature starts at -10°C and rises by 11°C. What is the new temperature?", "answer": 1, "kind": "guided", "hint": ["A rise means add; move right on a number line.", "Start at -10 and move 11 steps right.", "-10 + 11 = 1°C."], "steps": ["A rise means add; move right on a number line.", "Start at -10 and move 11 steps right.", "-10 + 11 = 1°C."], "explain": "-10 + 11 = 1°C."},
{"title": "Lantern delivery 4", "skill": "Multiplication", "q": "The cottage receives 21 crates with 13 lanterns in each. How many lanterns arrive?", "answer": 273, "kind": "guided", "hint": ["Split 21 into 10 + 11.", "Find 10 × 13 and 11 × 13.", "21 × 13 = 273 lanterns."], "steps": ["Split 21 into 10 + 11.", "Find 10 × 13 and 11 × 13.", "21 × 13 = 273 lanterns."], "explain": "21 × 13 = 273 lanterns."},
{"title": "Picnic parcels 4", "skill": "Division", "q": "Share 180 biscuits equally among 9 picnic baskets. How many go in each basket?", "answer": 20, "kind": "guided", "hint": ["Find the number that multiplies by 9 to make 180.", "9 × 10 = 90; 90 biscuits remain.", "180 ÷ 9 = 20 biscuits per basket."], "steps": ["Find the number that multiplies by 9 to make 180.", "9 × 10 = 90; 90 biscuits remain.", "180 ÷ 9 = 20 biscuits per basket."], "explain": "180 ÷ 9 = 20 biscuits per basket."},
{"title": "Workshop power 4", "skill": "Order of operations", "q": "Calculate 15 + 7 × (11 − 5) energy units.", "answer": 57, "kind": "guided", "hint": ["Parentheses first: 11 − 5 = 6.", "Multiply next: 7 × 6 = 42.", "15 + 42 = 57 energy units."], "steps": ["Parentheses first: 11 − 5 = 6.", "Multiply next: 7 × 6 = 42.", "15 + 42 = 57 energy units."], "explain": "15 + 42 = 57 energy units."},
{"title": "Frosty sunrise 4", "skill": "Negative numbers", "q": "The temperature starts at -9°C and rises by 13°C. What is the new temperature?", "answer": 4, "kind": "guided", "hint": ["A rise means add; move right on a number line.", "Start at -9 and move 13 steps right.", "-9 + 13 = 4°C."], "steps": ["A rise means add; move right on a number line.", "Start at -9 and move 13 steps right.", "-9 + 13 = 4°C."], "explain": "-9 + 13 = 4°C."},
{"title": "Pond water jars 1", "skill": "Adding fractions", "q": "A jar holds 2/8 litre. Add 1/8 litre. How many litres are in the jar? Give a fraction.", "answer": 0.375, "kind": "guided", "hint": ["The denominators match, so the pieces are the same size.", "Add the numerators: 2 + 1 = 3.", "2/8 + 1/8 = 3/8 litre."], "steps": ["The denominators match, so the pieces are the same size.", "Add the numerators: 2 + 1 = 3.", "2/8 + 1/8 = 3/8 litre."], "explain": "2/8 + 1/8 = 3/8 litre."},
{"title": "Raft rope repairs 1", "skill": "Subtracting fractions", "q": "You have 7/8 metre of rope and use 2/8 metre. How much remains? Give a fraction.", "answer": 0.625, "kind": "guided", "hint": ["Keep the common denominator.", "Subtract the numerators: 7 − 2 = 5.", "7/8 − 2/8 = 5/8 metre."], "steps": ["Keep the common denominator.", "Subtract the numerators: 7 − 2 = 5.", "7/8 − 2/8 = 5/8 metre."], "explain": "7/8 − 2/8 = 5/8 metre."},
{"title": "Tadpole hatchery 1", "skill": "Fractions of quantities", "q": "There are 24 eggs. 2/4 of them hatch. How many hatch?", "answer": 12, "kind": "guided", "hint": ["Divide 24 into 4 equal groups.", "24 ÷ 4 = 6 eggs per group.", "2 × 6 = 12 eggs hatch."], "steps": ["Divide 24 into 4 equal groups.", "24 ÷ 4 = 6 eggs per group.", "2 × 6 = 12 eggs hatch."], "explain": "2 × 6 = 12 eggs hatch."},
{"title": "Lily patch overlap 1", "skill": "Multiplying fractions", "q": "Lilies cover 2/3 of a pond. 3/4 of the lilies are pink. What fraction of the whole pond has pink lilies?", "answer": 0.5, "kind": "guided", "hint": ["Multiply the two fractions to find part of a part.", "Multiply numerators: 2 × 3 = 6.", "2/3 × 3/4 = 6/12 of the pond."], "steps": ["Multiply the two fractions to find part of a part.", "Multiply numerators: 2 × 3 = 6.", "2/3 × 3/4 = 6/12 of the pond."], "explain": "2/3 × 3/4 = 6/12 of the pond."},
{"title": "Pond water jars 2", "skill": "Adding fractions", "q": "A jar holds 3/10 litre. Add 2/10 litre. How many litres are in the jar? Give a fraction.", "answer": 0.5, "kind": "guided", "hint": ["The denominators match, so the pieces are the same size.", "Add the numerators: 3 + 2 = 5.", "3/10 + 2/10 = 5/10 litre."], "steps": ["The denominators match, so the pieces are the same size.", "Add the numerators: 3 + 2 = 5.", "3/10 + 2/10 = 5/10 litre."], "explain": "3/10 + 2/10 = 5/10 litre."},
{"title": "Raft rope repairs 2", "skill": "Subtracting fractions", "q": "You have 9/10 metre of rope and use 3/10 metre. How much remains? Give a fraction.", "answer": 0.6, "kind": "guided", "hint": ["Keep the common denominator.", "Subtract the numerators: 9 − 3 = 6.", "9/10 − 3/10 = 6/10 metre."], "steps": ["Keep the common denominator.", "Subtract the numerators: 9 − 3 = 6.", "9/10 − 3/10 = 6/10 metre."], "explain": "9/10 − 3/10 = 6/10 metre."},
{"title": "Tadpole hatchery 2", "skill": "Fractions of quantities", "q": "There are 35 eggs. 2/5 of them hatch. How many hatch?", "answer": 14, "kind": "guided", "hint": ["Divide 35 into 5 equal groups.", "35 ÷ 5 = 7 eggs per group.", "2 × 7 = 14 eggs hatch."], "steps": ["Divide 35 into 5 equal groups.", "35 ÷ 5 = 7 eggs per group.", "2 × 7 = 14 eggs hatch."], "explain": "2 × 7 = 14 eggs hatch."},
{"title": "Lily patch overlap 2", "skill": "Multiplying fractions", "q": "Lilies cover 3/4 of a pond. 4/5 of the lilies are pink. What fraction of the whole pond has pink lilies?", "answer": 0.6, "kind": "guided", "hint": ["Multiply the two fractions to find part of a part.", "Multiply numerators: 3 × 4 = 12.", "3/4 × 4/5 = 12/20 of the pond."], "steps": ["Multiply the two fractions to find part of a part.", "Multiply numerators: 3 × 4 = 12.", "3/4 × 4/5 = 12/20 of the pond."], "explain": "3/4 × 4/5 = 12/20 of the pond."},
{"title": "Pond water jars 3", "skill": "Adding fractions", "q": "A jar holds 4/12 litre. Add 3/12 litre. How many litres are in the jar? Give a fraction.", "answer": 0.5833333333333334, "kind": "guided", "hint": ["The denominators match, so the pieces are the same size.", "Add the numerators: 4 + 3 = 7.", "4/12 + 3/12 = 7/12 litre."], "steps": ["The denominators match, so the pieces are the same size.", "Add the numerators: 4 + 3 = 7.", "4/12 + 3/12 = 7/12 litre."], "explain": "4/12 + 3/12 = 7/12 litre."},
{"title": "Raft rope repairs 3", "skill": "Subtracting fractions", "q": "You have 11/12 metre of rope and use 4/12 metre. How much remains? Give a fraction.", "answer": 0.5833333333333334, "kind": "guided", "hint": ["Keep the common denominator.", "Subtract the numerators: 11 − 4 = 7.", "11/12 − 4/12 = 7/12 metre."], "steps": ["Keep the common denominator.", "Subtract the numerators: 11 − 4 = 7.", "11/12 − 4/12 = 7/12 metre."], "explain": "11/12 − 4/12 = 7/12 metre."},
{"title": "Tadpole hatchery 3", "skill": "Fractions of quantities", "q": "There are 48 eggs. 2/6 of them hatch. How many hatch?", "answer": 16, "kind": "guided", "hint": ["Divide 48 into 6 equal groups.", "48 ÷ 6 = 8 eggs per group.", "2 × 8 = 16 eggs hatch."], "steps": ["Divide 48 into 6 equal groups.", "48 ÷ 6 = 8 eggs per group.", "2 × 8 = 16 eggs hatch."], "explain": "2 × 8 = 16 eggs hatch."},
{"title": "Lily patch overlap 3", "skill": "Multiplying fractions", "q": "Lilies cover 4/5 of a pond. 5/6 of the lilies are pink. What fraction of the whole pond has pink lilies?", "answer": 0.6666666666666666, "kind": "guided", "hint": ["Multiply the two fractions to find part of a part.", "Multiply numerators: 4 × 5 = 20.", "4/5 × 5/6 = 20/30 of the pond."], "steps": ["Multiply the two fractions to find part of a part.", "Multiply numerators: 4 × 5 = 20.", "4/5 × 5/6 = 20/30 of the pond."], "explain": "4/5 × 5/6 = 20/30 of the pond."},
{"title": "Pond water jars 4", "skill": "Adding fractions", "q": "A jar holds 5/14 litre. Add 4/14 litre. How many litres are in the jar? Give a fraction.", "answer": 0.6428571428571429, "kind": "guided", "hint": ["The denominators match, so the pieces are the same size.", "Add the numerators: 5 + 4 = 9.", "5/14 + 4/14 = 9/14 litre."], "steps": ["The denominators match, so the pieces are the same size.", "Add the numerators: 5 + 4 = 9.", "5/14 + 4/14 = 9/14 litre."], "explain": "5/14 + 4/14 = 9/14 litre."},
{"title": "Raft rope repairs 4", "skill": "Subtracting fractions", "q": "You have 13/14 metre of rope and use 5/14 metre. How much remains? Give a fraction.", "answer": 0.5714285714285714, "kind": "guided", "hint": ["Keep the common denominator.", "Subtract the numerators: 13 − 5 = 8.", "13/14 − 5/14 = 8/14 metre."], "steps": ["Keep the common denominator.", "Subtract the numerators: 13 − 5 = 8.", "13/14 − 5/14 = 8/14 metre."], "explain": "13/14 − 5/14 = 8/14 metre."},
{"title": "Tadpole hatchery 4", "skill": "Fractions of quantities", "q": "There are 63 eggs. 2/7 of them hatch. How many hatch?", "answer": 18, "kind": "guided", "hint": ["Divide 63 into 7 equal groups.", "63 ÷ 7 = 9 eggs per group.", "2 × 9 = 18 eggs hatch."], "steps": ["Divide 63 into 7 equal groups.", "63 ÷ 7 = 9 eggs per group.", "2 × 9 = 18 eggs hatch."], "explain": "2 × 9 = 18 eggs hatch."},
{"title": "Lily patch overlap 4", "skill": "Multiplying fractions", "q": "Lilies cover 5/6 of a pond. 6/7 of the lilies are pink. What fraction of the whole pond has pink lilies?", "answer": 0.7142857142857143, "kind": "guided", "hint": ["Multiply the two fractions to find part of a part.", "Multiply numerators: 5 × 6 = 30.", "5/6 × 6/7 = 30/42 of the pond."], "steps": ["Multiply the two fractions to find part of a part.", "Multiply numerators: 5 × 6 = 30.", "5/6 × 6/7 = 30/42 of the pond."], "explain": "5/6 × 6/7 = 30/42 of the pond."},
{"title": "Garden path lengths 1", "skill": "Adding decimals", "q": "Two paths measure 2.35 m and 1.45 m. What is their combined length?", "answer": 3.8, "kind": "guided", "hint": ["Line up the decimal points.", "Add hundredths, then tenths, then whole metres.", "2.35 + 1.45 = 3.80 metres."], "steps": ["Line up the decimal points.", "Add hundredths, then tenths, then whole metres.", "2.35 + 1.45 = 3.80 metres."], "explain": "2.35 + 1.45 = 3.80 metres."},
{"title": "Seed sack scales 1", "skill": "Multiplying decimals", "q": "Each seed sack weighs 1.25 kg. What do 4 sacks weigh?", "answer": 5.0, "kind": "guided", "hint": ["Multiply the mass of one sack by the number of sacks.", "Calculate 125 × 4, then divide by 100.", "1.25 × 4 = 5 kg."], "steps": ["Multiply the mass of one sack by the number of sacks.", "Calculate 125 × 4, then divide by 100.", "1.25 × 4 = 5 kg."], "explain": "1.25 × 4 = 5 kg."},
{"title": "Greenhouse sale 1", "skill": "Percentages", "q": "A planter costs 60 crystals with a 25% discount. What is the sale price?", "answer": 45.0, "kind": "guided", "hint": ["Find 25% of 60.", "The discount is 15 crystals.", "60 − 15 = 45 crystals."], "steps": ["Find 25% of 60.", "The discount is 15 crystals.", "60 − 15 = 45 crystals."], "explain": "60 − 15 = 45 crystals."},
{"title": "Watering can refill 1", "skill": "Subtracting decimals", "q": "A barrel contains 8.50 litres. Use 2.75 litres to water flowers. How many litres remain?", "answer": 5.75, "kind": "guided", "hint": ["Line up the decimal points and write both values to hundredths.", "Subtract hundredths, tenths, and ones, regrouping when needed.", "8.50 − 2.75 = 5.75 litres."], "steps": ["Line up the decimal points and write both values to hundredths.", "Subtract hundredths, tenths, and ones, regrouping when needed.", "8.50 − 2.75 = 5.75 litres."], "explain": "8.50 − 2.75 = 5.75 litres."},
{"title": "Garden path lengths 2", "skill": "Adding decimals", "q": "Two paths measure 3.35 m and 1.95 m. What is their combined length?", "answer": 5.3, "kind": "guided", "hint": ["Line up the decimal points.", "Add hundredths, then tenths, then whole metres.", "3.35 + 1.95 = 5.30 metres."], "steps": ["Line up the decimal points.", "Add hundredths, then tenths, then whole metres.", "3.35 + 1.95 = 5.30 metres."], "explain": "3.35 + 1.95 = 5.30 metres."},
{"title": "Seed sack scales 2", "skill": "Multiplying decimals", "q": "Each seed sack weighs 1.50 kg. What do 5 sacks weigh?", "answer": 7.5, "kind": "guided", "hint": ["Multiply the mass of one sack by the number of sacks.", "Calculate 150 × 5, then divide by 100.", "1.50 × 5 = 7.5 kg."], "steps": ["Multiply the mass of one sack by the number of sacks.", "Calculate 150 × 5, then divide by 100.", "1.50 × 5 = 7.5 kg."], "explain": "1.50 × 5 = 7.5 kg."},
{"title": "Greenhouse sale 2", "skill": "Percentages", "q": "A planter costs 80 crystals with a 10% discount. What is the sale price?", "answer": 72.0, "kind": "guided", "hint": ["Find 10% of 80.", "The discount is 8 crystals.", "80 − 8 = 72 crystals."], "steps": ["Find 10% of 80.", "The discount is 8 crystals.", "80 − 8 = 72 crystals."], "explain": "80 − 8 = 72 crystals."},
{"title": "Watering can refill 2", "skill": "Subtracting decimals", "q": "A barrel contains 9.50 litres. Use 3.00 litres to water flowers. How many litres remain?", "answer": 6.5, "kind": "guided", "hint": ["Line up the decimal points and write both values to hundredths.", "Subtract hundredths, tenths, and ones, regrouping when needed.", "9.50 − 3.00 = 6.50 litres."], "steps": ["Line up the decimal points and write both values to hundredths.", "Subtract hundredths, tenths, and ones, regrouping when needed.", "9.50 − 3.00 = 6.50 litres."], "explain": "9.50 − 3.00 = 6.50 litres."},
{"title": "Garden path lengths 3", "skill": "Adding decimals", "q": "Two paths measure 4.35 m and 2.45 m. What is their combined length?", "answer": 6.8, "kind": "guided", "hint": ["Line up the decimal points.", "Add hundredths, then tenths, then whole metres.", "4.35 + 2.45 = 6.80 metres."], "steps": ["Line up the decimal points.", "Add hundredths, then tenths, then whole metres.", "4.35 + 2.45 = 6.80 metres."], "explain": "4.35 + 2.45 = 6.80 metres."},
{"title": "Seed sack scales 3", "skill": "Multiplying decimals", "q": "Each seed sack weighs 1.75 kg. What do 6 sacks weigh?", "answer": 10.5, "kind": "guided", "hint": ["Multiply the mass of one sack by the number of sacks.", "Calculate 175 × 6, then divide by 100.", "1.75 × 6 = 10.5 kg."], "steps": ["Multiply the mass of one sack by the number of sacks.", "Calculate 175 × 6, then divide by 100.", "1.75 × 6 = 10.5 kg."], "explain": "1.75 × 6 = 10.5 kg."},
{"title": "Greenhouse sale 3", "skill": "Percentages", "q": "A planter costs 100 crystals with a 25% discount. What is the sale price?", "answer": 75.0, "kind": "guided", "hint": ["Find 25% of 100.", "The discount is 25 crystals.", "100 − 25 = 75 crystals."], "steps": ["Find 25% of 100.", "The discount is 25 crystals.", "100 − 25 = 75 crystals."], "explain": "100 − 25 = 75 crystals."},
{"title": "Watering can refill 3", "skill": "Subtracting decimals", "q": "A barrel contains 10.50 litres. Use 3.25 litres to water flowers. How many litres remain?", "answer": 7.25, "kind": "guided", "hint": ["Line up the decimal points and write both values to hundredths.", "Subtract hundredths, tenths, and ones, regrouping when needed.", "10.50 − 3.25 = 7.25 litres."], "steps": ["Line up the decimal points and write both values to hundredths.", "Subtract hundredths, tenths, and ones, regrouping when needed.", "10.50 − 3.25 = 7.25 litres."], "explain": "10.50 − 3.25 = 7.25 litres."},
{"title": "Garden path lengths 4", "skill": "Adding decimals", "q": "Two paths measure 5.35 m and 2.95 m. What is their combined length?", "answer": 8.3, "kind": "guided", "hint": ["Line up the decimal points.", "Add hundredths, then tenths, then whole metres.", "5.35 + 2.95 = 8.30 metres."], "steps": ["Line up the decimal points.", "Add hundredths, then tenths, then whole metres.", "5.35 + 2.95 = 8.30 metres."], "explain": "5.35 + 2.95 = 8.30 metres."},
{"title": "Seed sack scales 4", "skill": "Multiplying decimals", "q": "Each seed sack weighs 2.00 kg. What do 7 sacks weigh?", "answer": 14.0, "kind": "guided", "hint": ["Multiply the mass of one sack by the number of sacks.", "Calculate 200 × 7, then divide by 100.", "2.00 × 7 = 14 kg."], "steps": ["Multiply the mass of one sack by the number of sacks.", "Calculate 200 × 7, then divide by 100.", "2.00 × 7 = 14 kg."], "explain": "2.00 × 7 = 14 kg."},
{"title": "Greenhouse sale 4", "skill": "Percentages", "q": "A planter costs 120 crystals with a 10% discount. What is the sale price?", "answer": 108.0, "kind": "guided", "hint": ["Find 10% of 120.", "The discount is 12 crystals.", "120 − 12 = 108 crystals."], "steps": ["Find 10% of 120.", "The discount is 12 crystals.", "120 − 12 = 108 crystals."], "explain": "120 − 12 = 108 crystals."},
{"title": "Watering can refill 4", "skill": "Subtracting decimals", "q": "A barrel contains 11.50 litres. Use 3.50 litres to water flowers. How many litres remain?", "answer": 8.0, "kind": "guided", "hint": ["Line up the decimal points and write both values to hundredths.", "Subtract hundredths, tenths, and ones, regrouping when needed.", "11.50 − 3.50 = 8.00 litres."], "steps": ["Line up the decimal points and write both values to hundredths.", "Subtract hundredths, tenths, and ones, regrouping when needed.", "11.50 − 3.50 = 8.00 litres."], "explain": "11.50 − 3.50 = 8.00 litres."},
{"title": "Woodland trail mix 1", "skill": "Ratios", "q": "Red and blue berries are mixed in a 2:3 ratio. There are 20 berries. How many are blue?", "answer": 12, "kind": "guided", "hint": ["There are 5 equal parts altogether.", "20 ÷ 5 = 4 berries per part.", "3 × 4 = 12 blue berries."], "steps": ["There are 5 equal parts altogether.", "20 ÷ 5 = 4 berries per part.", "3 × 4 = 12 blue berries."], "explain": "3 × 4 = 12 blue berries."},
{"title": "Forest courier 1", "skill": "Unit rates", "q": "A courier travels 36 km in 3 hours. At the same speed, how far will they travel in 4 hours?", "answer": 48, "kind": "guided", "hint": ["Divide 36 by 3 to find the hourly rate.", "The courier travels 12 km each hour.", "12 × 4 = 48 km."], "steps": ["Divide 36 by 3 to find the hourly rate.", "The courier travels 12 km each hour.", "12 × 4 = 48 km."], "explain": "12 × 4 = 48 km."},
{"title": "Hidden acorns 1", "skill": "One-step equations", "q": "You find 9 acorns and now have 27. How many did you start with? Solve x + 9 = 27.", "answer": 18, "kind": "guided", "hint": ["Subtract 9 from both sides.", "x = 27 − 9.", "x = 18 acorns."], "steps": ["Subtract 9 from both sides.", "x = 27 − 9.", "x = 18 acorns."], "explain": "x = 18 acorns."},
{"title": "Firefly batteries 1", "skill": "Two-step equations", "q": "Solve 2x + 4 = 16 to find the power in each battery.", "answer": 6, "kind": "guided", "hint": ["Subtract 4 from both sides.", "2x = 12. Divide both sides by 2.", "x = 6 power units."], "steps": ["Subtract 4 from both sides.", "2x = 12. Divide both sides by 2.", "x = 6 power units."], "explain": "x = 6 power units."},
{"title": "Woodland trail mix 2", "skill": "Ratios", "q": "Red and blue berries are mixed in a 3:4 ratio. There are 35 berries. How many are blue?", "answer": 20, "kind": "guided", "hint": ["There are 7 equal parts altogether.", "35 ÷ 7 = 5 berries per part.", "4 × 5 = 20 blue berries."], "steps": ["There are 7 equal parts altogether.", "35 ÷ 7 = 5 berries per part.", "4 × 5 = 20 blue berries."], "explain": "4 × 5 = 20 blue berries."},
{"title": "Forest courier 2", "skill": "Unit rates", "q": "A courier travels 48 km in 3 hours. At the same speed, how far will they travel in 5 hours?", "answer": 80, "kind": "guided", "hint": ["Divide 48 by 3 to find the hourly rate.", "The courier travels 16 km each hour.", "16 × 5 = 80 km."], "steps": ["Divide 48 by 3 to find the hourly rate.", "The courier travels 16 km each hour.", "16 × 5 = 80 km."], "explain": "16 × 5 = 80 km."},
{"title": "Hidden acorns 2", "skill": "One-step equations", "q": "You find 10 acorns and now have 33. How many did you start with? Solve x + 10 = 33.", "answer": 23, "kind": "guided", "hint": ["Subtract 10 from both sides.", "x = 33 − 10.", "x = 23 acorns."], "steps": ["Subtract 10 from both sides.", "x = 33 − 10.", "x = 23 acorns."], "explain": "x = 23 acorns."},
{"title": "Firefly batteries 2", "skill": "Two-step equations", "q": "Solve 3x + 5 = 26 to find the power in each battery.", "answer": 7, "kind": "guided", "hint": ["Subtract 5 from both sides.", "3x = 21. Divide both sides by 3.", "x = 7 power units."], "steps": ["Subtract 5 from both sides.", "3x = 21. Divide both sides by 3.", "x = 7 power units."], "explain": "x = 7 power units."},
{"title": "Woodland trail mix 3", "skill": "Ratios", "q": "Red and blue berries are mixed in a 4:5 ratio. There are 54 berries. How many are blue?", "answer": 30, "kind": "guided", "hint": ["There are 9 equal parts altogether.", "54 ÷ 9 = 6 berries per part.", "5 × 6 = 30 blue berries."], "steps": ["There are 9 equal parts altogether.", "54 ÷ 9 = 6 berries per part.", "5 × 6 = 30 blue berries."], "explain": "5 × 6 = 30 blue berries."},
{"title": "Forest courier 3", "skill": "Unit rates", "q": "A courier travels 60 km in 3 hours. At the same speed, how far will they travel in 6 hours?", "answer": 120, "kind": "guided", "hint": ["Divide 60 by 3 to find the hourly rate.", "The courier travels 20 km each hour.", "20 × 6 = 120 km."], "steps": ["Divide 60 by 3 to find the hourly rate.", "The courier travels 20 km each hour.", "20 × 6 = 120 km."], "explain": "20 × 6 = 120 km."},
{"title": "Hidden acorns 3", "skill": "One-step equations", "q": "You find 11 acorns and now have 39. How many did you start with? Solve x + 11 = 39.", "answer": 28, "kind": "guided", "hint": ["Subtract 11 from both sides.", "x = 39 − 11.", "x = 28 acorns."], "steps": ["Subtract 11 from both sides.", "x = 39 − 11.", "x = 28 acorns."], "explain": "x = 28 acorns."},
{"title": "Firefly batteries 3", "skill": "Two-step equations", "q": "Solve 4x + 6 = 38 to find the power in each battery.", "answer": 8, "kind": "guided", "hint": ["Subtract 6 from both sides.", "4x = 32. Divide both sides by 4.", "x = 8 power units."], "steps": ["Subtract 6 from both sides.", "4x = 32. Divide both sides by 4.", "x = 8 power units."], "explain": "x = 8 power units."},
{"title": "Woodland trail mix 4", "skill": "Ratios", "q": "Red and blue berries are mixed in a 5:6 ratio. There are 77 berries. How many are blue?", "answer": 42, "kind": "guided", "hint": ["There are 11 equal parts altogether.", "77 ÷ 11 = 7 berries per part.", "6 × 7 = 42 blue berries."], "steps": ["There are 11 equal parts altogether.", "77 ÷ 11 = 7 berries per part.", "6 × 7 = 42 blue berries."], "explain": "6 × 7 = 42 blue berries."},
{"title": "Forest courier 4", "skill": "Unit rates", "q": "A courier travels 72 km in 3 hours. At the same speed, how far will they travel in 7 hours?", "answer": 168, "kind": "guided", "hint": ["Divide 72 by 3 to find the hourly rate.", "The courier travels 24 km each hour.", "24 × 7 = 168 km."], "steps": ["Divide 72 by 3 to find the hourly rate.", "The courier travels 24 km each hour.", "24 × 7 = 168 km."], "explain": "24 × 7 = 168 km."},
{"title": "Hidden acorns 4", "skill": "One-step equations", "q": "You find 12 acorns and now have 45. How many did you start with? Solve x + 12 = 45.", "answer": 33, "kind": "guided", "hint": ["Subtract 12 from both sides.", "x = 45 − 12.", "x = 33 acorns."], "steps": ["Subtract 12 from both sides.", "x = 45 − 12.", "x = 33 acorns."], "explain": "x = 33 acorns."},
{"title": "Firefly batteries 4", "skill": "Two-step equations", "q": "Solve 5x + 7 = 52 to find the power in each battery.", "answer": 9, "kind": "guided", "hint": ["Subtract 7 from both sides.", "5x = 45. Divide both sides by 5.", "x = 9 power units."], "steps": ["Subtract 7 from both sides.", "5x = 45. Divide both sides by 5.", "x = 9 power units."], "explain": "x = 9 power units."},
{"title": "Cavern crystal pattern 1", "skill": "Sequences", "q": "A machine makes 3, 6, 9, 12, … crystals on days 1, 2, 3, 4. How many on day 8?", "answer": 24, "kind": "guided", "hint": ["The amount increases by 3 each day.", "Day 8 is 7 increases after day 1.", "3 + 7 × 3 = 24 crystals."], "steps": ["The amount increases by 3 each day.", "Day 8 is 7 increases after day 1.", "3 + 7 × 3 = 24 crystals."], "explain": "3 + 7 × 3 = 24 crystals."},
{"title": "Cavern habitat blueprint 1", "skill": "Area and perimeter", "q": "A rectangular habitat is 7 m long and 4 m wide. Enter its area, perimeter in that order.", "answer": [28, 22], "kind": "guided", "hint": ["Area is length times width. Perimeter is the distance around all four sides.", "Area = 7 × 4. Perimeter = 2 × (7 + 4).", "Area = 28 m²; perimeter = 22 m. Enter 28, 22."], "steps": ["Area is length times width. Perimeter is the distance around all four sides.", "Area = 7 × 4. Perimeter = 2 × (7 + 4).", "Area = 28 m²; perimeter = 22 m. Enter 28, 22."], "explain": "Area = 28 m²; perimeter = 22 m. Enter 28, 22."},
{"title": "Underground reservoir 1", "skill": "Volume", "q": "A tank measures 4 m long, 3 m wide, and 2 m high. What is its volume in cubic metres?", "answer": 24, "kind": "guided", "hint": ["Volume equals length times width times height.", "One layer contains 4 × 3 = 12 unit cubes.", "12 × 2 = 24 m³."], "steps": ["Volume equals length times width times height.", "One layer contains 4 × 3 = 12 unit cubes.", "12 × 2 = 24 m³."], "explain": "12 × 2 = 24 m³."},
{"title": "Crystal prism angles 1", "skill": "Angles", "q": "A triangular prism face has angles of 35° and 60°. What is the third angle?", "answer": 85, "kind": "guided", "hint": ["The interior angles of a triangle total 180°.", "The known angles add to 95°.", "180 − 95 = 85°."], "steps": ["The interior angles of a triangle total 180°.", "The known angles add to 95°.", "180 − 95 = 85°."], "explain": "180 − 95 = 85°."},
{"title": "Cavern crystal pattern 2", "skill": "Sequences", "q": "A machine makes 4, 8, 12, 16, … crystals on days 1, 2, 3, 4. How many on day 9?", "answer": 36, "kind": "guided", "hint": ["The amount increases by 4 each day.", "Day 9 is 8 increases after day 1.", "4 + 8 × 4 = 36 crystals."], "steps": ["The amount increases by 4 each day.", "Day 9 is 8 increases after day 1.", "4 + 8 × 4 = 36 crystals."], "explain": "4 + 8 × 4 = 36 crystals."},
{"title": "Cavern habitat blueprint 2", "skill": "Area and perimeter", "q": "A rectangular habitat is 8 m long and 5 m wide. Enter its area, perimeter in that order.", "answer": [40, 26], "kind": "guided", "hint": ["Area is length times width. Perimeter is the distance around all four sides.", "Area = 8 × 5. Perimeter = 2 × (8 + 5).", "Area = 40 m²; perimeter = 26 m. Enter 40, 26."], "steps": ["Area is length times width. Perimeter is the distance around all four sides.", "Area = 8 × 5. Perimeter = 2 × (8 + 5).", "Area = 40 m²; perimeter = 26 m. Enter 40, 26."], "explain": "Area = 40 m²; perimeter = 26 m. Enter 40, 26."},
{"title": "Underground reservoir 2", "skill": "Volume", "q": "A tank measures 5 m long, 4 m wide, and 3 m high. What is its volume in cubic metres?", "answer": 60, "kind": "guided", "hint": ["Volume equals length times width times height.", "One layer contains 5 × 4 = 20 unit cubes.", "20 × 3 = 60 m³."], "steps": ["Volume equals length times width times height.", "One layer contains 5 × 4 = 20 unit cubes.", "20 × 3 = 60 m³."], "explain": "20 × 3 = 60 m³."},
{"title": "Crystal prism angles 2", "skill": "Angles", "q": "A triangular prism face has angles of 40° and 63°. What is the third angle?", "answer": 77, "kind": "guided", "hint": ["The interior angles of a triangle total 180°.", "The known angles add to 103°.", "180 − 103 = 77°."], "steps": ["The interior angles of a triangle total 180°.", "The known angles add to 103°.", "180 − 103 = 77°."], "explain": "180 − 103 = 77°."},
{"title": "Cavern crystal pattern 3", "skill": "Sequences", "q": "A machine makes 5, 10, 15, 20, … crystals on days 1, 2, 3, 4. How many on day 10?", "answer": 50, "kind": "guided", "hint": ["The amount increases by 5 each day.", "Day 10 is 9 increases after day 1.", "5 + 9 × 5 = 50 crystals."], "steps": ["The amount increases by 5 each day.", "Day 10 is 9 increases after day 1.", "5 + 9 × 5 = 50 crystals."], "explain": "5 + 9 × 5 = 50 crystals."},
{"title": "Cavern habitat blueprint 3", "skill": "Area and perimeter", "q": "A rectangular habitat is 9 m long and 6 m wide. Enter its area, perimeter in that order.", "answer": [54, 30], "kind": "guided", "hint": ["Area is length times width. Perimeter is the distance around all four sides.", "Area = 9 × 6. Perimeter = 2 × (9 + 6).", "Area = 54 m²; perimeter = 30 m. Enter 54, 30."], "steps": ["Area is length times width. Perimeter is the distance around all four sides.", "Area = 9 × 6. Perimeter = 2 × (9 + 6).", "Area = 54 m²; perimeter = 30 m. Enter 54, 30."], "explain": "Area = 54 m²; perimeter = 30 m. Enter 54, 30."},
{"title": "Underground reservoir 3", "skill": "Volume", "q": "A tank measures 6 m long, 5 m wide, and 4 m high. What is its volume in cubic metres?", "answer": 120, "kind": "guided", "hint": ["Volume equals length times width times height.", "One layer contains 6 × 5 = 30 unit cubes.", "30 × 4 = 120 m³."], "steps": ["Volume equals length times width times height.", "One layer contains 6 × 5 = 30 unit cubes.", "30 × 4 = 120 m³."], "explain": "30 × 4 = 120 m³."},
{"title": "Crystal prism angles 3", "skill": "Angles", "q": "A triangular prism face has angles of 45° and 66°. What is the third angle?", "answer": 69, "kind": "guided", "hint": ["The interior angles of a triangle total 180°.", "The known angles add to 111°.", "180 − 111 = 69°."], "steps": ["The interior angles of a triangle total 180°.", "The known angles add to 111°.", "180 − 111 = 69°."], "explain": "180 − 111 = 69°."},
{"title": "Cavern crystal pattern 4", "skill": "Sequences", "q": "A machine makes 6, 12, 18, 24, … crystals on days 1, 2, 3, 4. How many on day 11?", "answer": 66, "kind": "guided", "hint": ["The amount increases by 6 each day.", "Day 11 is 10 increases after day 1.", "6 + 10 × 6 = 66 crystals."], "steps": ["The amount increases by 6 each day.", "Day 11 is 10 increases after day 1.", "6 + 10 × 6 = 66 crystals."], "explain": "6 + 10 × 6 = 66 crystals."},
{"title": "Cavern habitat blueprint 4", "skill": "Area and perimeter", "q": "A rectangular habitat is 10 m long and 7 m wide. Enter its area, perimeter in that order.", "answer": [70, 34], "kind": "guided", "hint": ["Area is length times width. Perimeter is the distance around all four sides.", "Area = 10 × 7. Perimeter = 2 × (10 + 7).", "Area = 70 m²; perimeter = 34 m. Enter 70, 34."], "steps": ["Area is length times width. Perimeter is the distance around all four sides.", "Area = 10 × 7. Perimeter = 2 × (10 + 7).", "Area = 70 m²; perimeter = 34 m. Enter 70, 34."], "explain": "Area = 70 m²; perimeter = 34 m. Enter 70, 34."},
{"title": "Underground reservoir 4", "skill": "Volume", "q": "A tank measures 7 m long, 6 m wide, and 5 m high. What is its volume in cubic metres?", "answer": 210, "kind": "guided", "hint": ["Volume equals length times width times height.", "One layer contains 7 × 6 = 42 unit cubes.", "42 × 5 = 210 m³."], "steps": ["Volume equals length times width times height.", "One layer contains 7 × 6 = 42 unit cubes.", "42 × 5 = 210 m³."], "explain": "42 × 5 = 210 m³."},
{"title": "Crystal prism angles 4", "skill": "Angles", "q": "A triangular prism face has angles of 50° and 69°. What is the third angle?", "answer": 61, "kind": "guided", "hint": ["The interior angles of a triangle total 180°.", "The known angles add to 119°.", "180 − 119 = 61°."], "steps": ["The interior angles of a triangle total 180°.", "The known angles add to 119°.", "180 − 119 = 61°."], "explain": "180 − 119 = 61°."}
);
locations.forEach((location,i)=>{location.ids.push(...Array.from({length:16},(_,j)=>20+i*16+j));});

const youngerByLocation=[{"title": "Cottage supply count 1", "skill": "Addition", "q": "There are 136 nails in one box and 85 in another. How many nails altogether?", "answer": 221, "kind": "guided", "hint": ["Line up hundreds, tens, and ones.", "Add the ones first, then tens, then hundreds. Regroup if needed.", "136 + 85 = 221 nails."], "steps": ["Line up hundreds, tens, and ones.", "Add the ones first, then tens, then hundreds. Regroup if needed.", "136 + 85 = 221 nails."], "explain": "136 + 85 = 221 nails."}, {"title": "Biscuits for visitors 1", "skill": "Subtraction", "q": "You bake 405 biscuits and share 127. How many are left?", "answer": 278, "kind": "guided", "hint": ["Start with the total baked.", "Subtract ones, tens, and hundreds, exchanging a ten or hundred when needed.", "405 − 127 = 278 biscuits."], "steps": ["Start with the total baked.", "Subtract ones, tens, and hundreds, exchanging a ten or hundred when needed.", "405 − 127 = 278 biscuits."], "explain": "405 − 127 = 278 biscuits."}, {"title": "Lantern shelves 1", "skill": "Times tables", "q": "There are 4 shelves with 6 lanterns on each. How many lanterns?", "answer": 24, "kind": "guided", "hint": ["Each shelf is one equal group.", "Add 6 a total of 4 times, or multiply.", "4 × 6 = 24 lanterns."], "steps": ["Each shelf is one equal group.", "Add 6 a total of 4 times, or multiply.", "4 × 6 = 24 lanterns."], "explain": "4 × 6 = 24 lanterns."}, {"title": "Breakfast baskets 1", "skill": "Division", "q": "Share 15 apples equally into 3 baskets. How many apples in each?", "answer": 5, "kind": "guided", "hint": ["Think of equal groups.", "Which number times 3 equals 15?", "15 ÷ 3 = 5 apples."], "steps": ["Think of equal groups.", "Which number times 3 equals 15?", "15 ÷ 3 = 5 apples."], "explain": "15 ÷ 3 = 5 apples."}, {"title": "Cottage supply count 2", "skill": "Addition", "q": "There are 173 nails in one box and 104 in another. How many nails altogether?", "answer": 277, "kind": "guided", "hint": ["Line up hundreds, tens, and ones.", "Add the ones first, then tens, then hundreds. Regroup if needed.", "173 + 104 = 277 nails."], "steps": ["Line up hundreds, tens, and ones.", "Add the ones first, then tens, then hundreds. Regroup if needed.", "173 + 104 = 277 nails."], "explain": "173 + 104 = 277 nails."}, {"title": "Biscuits for visitors 2", "skill": "Subtraction", "q": "You bake 448 biscuits and share 143. How many are left?", "answer": 305, "kind": "guided", "hint": ["Start with the total baked.", "Subtract ones, tens, and hundreds, exchanging a ten or hundred when needed.", "448 − 143 = 305 biscuits."], "steps": ["Start with the total baked.", "Subtract ones, tens, and hundreds, exchanging a ten or hundred when needed.", "448 − 143 = 305 biscuits."], "explain": "448 − 143 = 305 biscuits."}, {"title": "Lantern shelves 2", "skill": "Times tables", "q": "There are 5 shelves with 7 lanterns on each. How many lanterns?", "answer": 35, "kind": "guided", "hint": ["Each shelf is one equal group.", "Add 7 a total of 5 times, or multiply.", "5 × 7 = 35 lanterns."], "steps": ["Each shelf is one equal group.", "Add 7 a total of 5 times, or multiply.", "5 × 7 = 35 lanterns."], "explain": "5 × 7 = 35 lanterns."}, {"title": "Breakfast baskets 2", "skill": "Division", "q": "Share 24 apples equally into 4 baskets. How many apples in each?", "answer": 6, "kind": "guided", "hint": ["Think of equal groups.", "Which number times 4 equals 24?", "24 ÷ 4 = 6 apples."], "steps": ["Think of equal groups.", "Which number times 4 equals 24?", "24 ÷ 4 = 6 apples."], "explain": "24 ÷ 4 = 6 apples."}, {"title": "Cottage supply count 3", "skill": "Addition", "q": "There are 210 nails in one box and 123 in another. How many nails altogether?", "answer": 333, "kind": "guided", "hint": ["Line up hundreds, tens, and ones.", "Add the ones first, then tens, then hundreds. Regroup if needed.", "210 + 123 = 333 nails."], "steps": ["Line up hundreds, tens, and ones.", "Add the ones first, then tens, then hundreds. Regroup if needed.", "210 + 123 = 333 nails."], "explain": "210 + 123 = 333 nails."}, {"title": "Biscuits for visitors 3", "skill": "Subtraction", "q": "You bake 491 biscuits and share 159. How many are left?", "answer": 332, "kind": "guided", "hint": ["Start with the total baked.", "Subtract ones, tens, and hundreds, exchanging a ten or hundred when needed.", "491 − 159 = 332 biscuits."], "steps": ["Start with the total baked.", "Subtract ones, tens, and hundreds, exchanging a ten or hundred when needed.", "491 − 159 = 332 biscuits."], "explain": "491 − 159 = 332 biscuits."}, {"title": "Lantern shelves 3", "skill": "Times tables", "q": "There are 6 shelves with 8 lanterns on each. How many lanterns?", "answer": 48, "kind": "guided", "hint": ["Each shelf is one equal group.", "Add 8 a total of 6 times, or multiply.", "6 × 8 = 48 lanterns."], "steps": ["Each shelf is one equal group.", "Add 8 a total of 6 times, or multiply.", "6 × 8 = 48 lanterns."], "explain": "6 × 8 = 48 lanterns."}, {"title": "Breakfast baskets 3", "skill": "Division", "q": "Share 35 apples equally into 5 baskets. How many apples in each?", "answer": 7, "kind": "guided", "hint": ["Think of equal groups.", "Which number times 5 equals 35?", "35 ÷ 5 = 7 apples."], "steps": ["Think of equal groups.", "Which number times 5 equals 35?", "35 ÷ 5 = 7 apples."], "explain": "35 ÷ 5 = 7 apples."}, {"title": "Cottage supply count 4", "skill": "Addition", "q": "There are 247 nails in one box and 142 in another. How many nails altogether?", "answer": 389, "kind": "guided", "hint": ["Line up hundreds, tens, and ones.", "Add the ones first, then tens, then hundreds. Regroup if needed.", "247 + 142 = 389 nails."], "steps": ["Line up hundreds, tens, and ones.", "Add the ones first, then tens, then hundreds. Regroup if needed.", "247 + 142 = 389 nails."], "explain": "247 + 142 = 389 nails."}, {"title": "Biscuits for visitors 4", "skill": "Subtraction", "q": "You bake 534 biscuits and share 175. How many are left?", "answer": 359, "kind": "guided", "hint": ["Start with the total baked.", "Subtract ones, tens, and hundreds, exchanging a ten or hundred when needed.", "534 − 175 = 359 biscuits."], "steps": ["Start with the total baked.", "Subtract ones, tens, and hundreds, exchanging a ten or hundred when needed.", "534 − 175 = 359 biscuits."], "explain": "534 − 175 = 359 biscuits."}, {"title": "Lantern shelves 4", "skill": "Times tables", "q": "There are 7 shelves with 6 lanterns on each. How many lanterns?", "answer": 42, "kind": "guided", "hint": ["Each shelf is one equal group.", "Add 6 a total of 7 times, or multiply.", "7 × 6 = 42 lanterns."], "steps": ["Each shelf is one equal group.", "Add 6 a total of 7 times, or multiply.", "7 × 6 = 42 lanterns."], "explain": "7 × 6 = 42 lanterns."}, {"title": "Breakfast baskets 4", "skill": "Division", "q": "Share 24 apples equally into 3 baskets. How many apples in each?", "answer": 8, "kind": "guided", "hint": ["Think of equal groups.", "Which number times 3 equals 24?", "24 ÷ 3 = 8 apples."], "steps": ["Think of equal groups.", "Which number times 3 equals 24?", "24 ÷ 3 = 8 apples."], "explain": "24 ÷ 3 = 8 apples."}, {"title": "Cottage supply count 5", "skill": "Addition", "q": "There are 284 nails in one box and 161 in another. How many nails altogether?", "answer": 445, "kind": "guided", "hint": ["Line up hundreds, tens, and ones.", "Add the ones first, then tens, then hundreds. Regroup if needed.", "284 + 161 = 445 nails."], "steps": ["Line up hundreds, tens, and ones.", "Add the ones first, then tens, then hundreds. Regroup if needed.", "284 + 161 = 445 nails."], "explain": "284 + 161 = 445 nails."}, {"title": "Biscuits for visitors 5", "skill": "Subtraction", "q": "You bake 577 biscuits and share 191. How many are left?", "answer": 386, "kind": "guided", "hint": ["Start with the total baked.", "Subtract ones, tens, and hundreds, exchanging a ten or hundred when needed.", "577 − 191 = 386 biscuits."], "steps": ["Start with the total baked.", "Subtract ones, tens, and hundreds, exchanging a ten or hundred when needed.", "577 − 191 = 386 biscuits."], "explain": "577 − 191 = 386 biscuits."}, {"title": "Lantern shelves 5", "skill": "Times tables", "q": "There are 8 shelves with 7 lanterns on each. How many lanterns?", "answer": 56, "kind": "guided", "hint": ["Each shelf is one equal group.", "Add 7 a total of 8 times, or multiply.", "8 × 7 = 56 lanterns."], "steps": ["Each shelf is one equal group.", "Add 7 a total of 8 times, or multiply.", "8 × 7 = 56 lanterns."], "explain": "8 × 7 = 56 lanterns."}, {"title": "Breakfast baskets 5", "skill": "Division", "q": "Share 36 apples equally into 4 baskets. How many apples in each?", "answer": 9, "kind": "guided", "hint": ["Think of equal groups.", "Which number times 4 equals 36?", "36 ÷ 4 = 9 apples."], "steps": ["Think of equal groups.", "Which number times 4 equals 36?", "36 ÷ 4 = 9 apples."], "explain": "36 ÷ 4 = 9 apples."}, {"title": "Pond jug fractions 1", "skill": "Adding fractions", "q": "A jug has 2/6 litre of water. Add 1/6 litre. What fraction of a litre is in the jug?", "answer": 0.5, "kind": "guided", "hint": ["The pieces have the same denominator.", "Add the top numbers: 2 + 1 = 3.", "2/6 + 1/6 = 3/6 litre."], "steps": ["The pieces have the same denominator.", "Add the top numbers: 2 + 1 = 3.", "2/6 + 1/6 = 3/6 litre."], "explain": "2/6 + 1/6 = 3/6 litre."}, {"title": "Rope pieces 1", "skill": "Subtracting fractions", "q": "You have 5/6 metre of rope and use 2/6 metre. What fraction of a metre remains?", "answer": 0.5, "kind": "guided", "hint": ["Keep the denominator the same.", "Subtract the top numbers: 5 − 2 = 3.", "5/6 − 2/6 = 3/6 metre."], "steps": ["Keep the denominator the same.", "Subtract the top numbers: 5 − 2 = 3.", "5/6 − 2/6 = 3/6 metre."], "explain": "5/6 − 2/6 = 3/6 metre."}, {"title": "Duckling groups 1", "skill": "Unit fractions", "q": "There are 8 ducklings. One out of 2 equal groups swims away. How many ducklings swim away?", "answer": 4, "kind": "guided", "hint": ["Find 1/2 of 8.", "Divide the total into 2 equal groups.", "8 ÷ 2 = 4 ducklings."], "steps": ["Find 1/2 of 8.", "Divide the total into 2 equal groups.", "8 ÷ 2 = 4 ducklings."], "explain": "8 ÷ 2 = 4 ducklings."}, {"title": "Pond trail markers 1", "skill": "Tenths", "q": "Write 3/10 as a decimal.", "answer": 0.3, "kind": "guided", "hint": ["The first place after the decimal point is tenths.", "3/10 means 3 tenths.", "3/10 = 0.3."], "steps": ["The first place after the decimal point is tenths.", "3/10 means 3 tenths.", "3/10 = 0.3."], "explain": "3/10 = 0.3."}, {"title": "Pond jug fractions 2", "skill": "Adding fractions", "q": "A jug has 3/7 litre of water. Add 1/7 litre. What fraction of a litre is in the jug?", "answer": 0.5714285714285714, "kind": "guided", "hint": ["The pieces have the same denominator.", "Add the top numbers: 3 + 1 = 4.", "3/7 + 1/7 = 4/7 litre."], "steps": ["The pieces have the same denominator.", "Add the top numbers: 3 + 1 = 4.", "3/7 + 1/7 = 4/7 litre."], "explain": "3/7 + 1/7 = 4/7 litre."}, {"title": "Rope pieces 2", "skill": "Subtracting fractions", "q": "You have 6/7 metre of rope and use 2/7 metre. What fraction of a metre remains?", "answer": 0.5714285714285714, "kind": "guided", "hint": ["Keep the denominator the same.", "Subtract the top numbers: 6 − 2 = 4.", "6/7 − 2/7 = 4/7 metre."], "steps": ["Keep the denominator the same.", "Subtract the top numbers: 6 − 2 = 4.", "6/7 − 2/7 = 4/7 metre."], "explain": "6/7 − 2/7 = 4/7 metre."}, {"title": "Duckling groups 2", "skill": "Unit fractions", "q": "There are 15 ducklings. One out of 3 equal groups swims away. How many ducklings swim away?", "answer": 5, "kind": "guided", "hint": ["Find 1/3 of 15.", "Divide the total into 3 equal groups.", "15 ÷ 3 = 5 ducklings."], "steps": ["Find 1/3 of 15.", "Divide the total into 3 equal groups.", "15 ÷ 3 = 5 ducklings."], "explain": "15 ÷ 3 = 5 ducklings."}, {"title": "Pond trail markers 2", "skill": "Tenths", "q": "Write 4/10 as a decimal.", "answer": 0.4, "kind": "guided", "hint": ["The first place after the decimal point is tenths.", "4/10 means 4 tenths.", "4/10 = 0.4."], "steps": ["The first place after the decimal point is tenths.", "4/10 means 4 tenths.", "4/10 = 0.4."], "explain": "4/10 = 0.4."}, {"title": "Pond jug fractions 3", "skill": "Adding fractions", "q": "A jug has 4/8 litre of water. Add 1/8 litre. What fraction of a litre is in the jug?", "answer": 0.625, "kind": "guided", "hint": ["The pieces have the same denominator.", "Add the top numbers: 4 + 1 = 5.", "4/8 + 1/8 = 5/8 litre."], "steps": ["The pieces have the same denominator.", "Add the top numbers: 4 + 1 = 5.", "4/8 + 1/8 = 5/8 litre."], "explain": "4/8 + 1/8 = 5/8 litre."}, {"title": "Rope pieces 3", "skill": "Subtracting fractions", "q": "You have 7/8 metre of rope and use 2/8 metre. What fraction of a metre remains?", "answer": 0.625, "kind": "guided", "hint": ["Keep the denominator the same.", "Subtract the top numbers: 7 − 2 = 5.", "7/8 − 2/8 = 5/8 metre."], "steps": ["Keep the denominator the same.", "Subtract the top numbers: 7 − 2 = 5.", "7/8 − 2/8 = 5/8 metre."], "explain": "7/8 − 2/8 = 5/8 metre."}, {"title": "Duckling groups 3", "skill": "Unit fractions", "q": "There are 24 ducklings. One out of 4 equal groups swims away. How many ducklings swim away?", "answer": 6, "kind": "guided", "hint": ["Find 1/4 of 24.", "Divide the total into 4 equal groups.", "24 ÷ 4 = 6 ducklings."], "steps": ["Find 1/4 of 24.", "Divide the total into 4 equal groups.", "24 ÷ 4 = 6 ducklings."], "explain": "24 ÷ 4 = 6 ducklings."}, {"title": "Pond trail markers 3", "skill": "Tenths", "q": "Write 5/10 as a decimal.", "answer": 0.5, "kind": "guided", "hint": ["The first place after the decimal point is tenths.", "5/10 means 5 tenths.", "5/10 = 0.5."], "steps": ["The first place after the decimal point is tenths.", "5/10 means 5 tenths.", "5/10 = 0.5."], "explain": "5/10 = 0.5."}, {"title": "Pond jug fractions 4", "skill": "Adding fractions", "q": "A jug has 5/9 litre of water. Add 1/9 litre. What fraction of a litre is in the jug?", "answer": 0.6666666666666666, "kind": "guided", "hint": ["The pieces have the same denominator.", "Add the top numbers: 5 + 1 = 6.", "5/9 + 1/9 = 6/9 litre."], "steps": ["The pieces have the same denominator.", "Add the top numbers: 5 + 1 = 6.", "5/9 + 1/9 = 6/9 litre."], "explain": "5/9 + 1/9 = 6/9 litre."}, {"title": "Rope pieces 4", "skill": "Subtracting fractions", "q": "You have 8/9 metre of rope and use 2/9 metre. What fraction of a metre remains?", "answer": 0.6666666666666666, "kind": "guided", "hint": ["Keep the denominator the same.", "Subtract the top numbers: 8 − 2 = 6.", "8/9 − 2/9 = 6/9 metre."], "steps": ["Keep the denominator the same.", "Subtract the top numbers: 8 − 2 = 6.", "8/9 − 2/9 = 6/9 metre."], "explain": "8/9 − 2/9 = 6/9 metre."}, {"title": "Duckling groups 4", "skill": "Unit fractions", "q": "There are 35 ducklings. One out of 5 equal groups swims away. How many ducklings swim away?", "answer": 7, "kind": "guided", "hint": ["Find 1/5 of 35.", "Divide the total into 5 equal groups.", "35 ÷ 5 = 7 ducklings."], "steps": ["Find 1/5 of 35.", "Divide the total into 5 equal groups.", "35 ÷ 5 = 7 ducklings."], "explain": "35 ÷ 5 = 7 ducklings."}, {"title": "Pond trail markers 4", "skill": "Tenths", "q": "Write 6/10 as a decimal.", "answer": 0.6, "kind": "guided", "hint": ["The first place after the decimal point is tenths.", "6/10 means 6 tenths.", "6/10 = 0.6."], "steps": ["The first place after the decimal point is tenths.", "6/10 means 6 tenths.", "6/10 = 0.6."], "explain": "6/10 = 0.6."}, {"title": "Pond jug fractions 5", "skill": "Adding fractions", "q": "A jug has 6/10 litre of water. Add 1/10 litre. What fraction of a litre is in the jug?", "answer": 0.7, "kind": "guided", "hint": ["The pieces have the same denominator.", "Add the top numbers: 6 + 1 = 7.", "6/10 + 1/10 = 7/10 litre."], "steps": ["The pieces have the same denominator.", "Add the top numbers: 6 + 1 = 7.", "6/10 + 1/10 = 7/10 litre."], "explain": "6/10 + 1/10 = 7/10 litre."}, {"title": "Rope pieces 5", "skill": "Subtracting fractions", "q": "You have 9/10 metre of rope and use 2/10 metre. What fraction of a metre remains?", "answer": 0.7, "kind": "guided", "hint": ["Keep the denominator the same.", "Subtract the top numbers: 9 − 2 = 7.", "9/10 − 2/10 = 7/10 metre."], "steps": ["Keep the denominator the same.", "Subtract the top numbers: 9 − 2 = 7.", "9/10 − 2/10 = 7/10 metre."], "explain": "9/10 − 2/10 = 7/10 metre."}, {"title": "Duckling groups 5", "skill": "Unit fractions", "q": "There are 48 ducklings. One out of 6 equal groups swims away. How many ducklings swim away?", "answer": 8, "kind": "guided", "hint": ["Find 1/6 of 48.", "Divide the total into 6 equal groups.", "48 ÷ 6 = 8 ducklings."], "steps": ["Find 1/6 of 48.", "Divide the total into 6 equal groups.", "48 ÷ 6 = 8 ducklings."], "explain": "48 ÷ 6 = 8 ducklings."}, {"title": "Pond trail markers 5", "skill": "Tenths", "q": "Write 7/10 as a decimal.", "answer": 0.7, "kind": "guided", "hint": ["The first place after the decimal point is tenths.", "7/10 means 7 tenths.", "7/10 = 0.7."], "steps": ["The first place after the decimal point is tenths.", "7/10 means 7 tenths.", "7/10 = 0.7."], "explain": "7/10 = 0.7."}, {"title": "Flower bed squares 1", "skill": "Area", "q": "A rectangular flower bed is 3 m long and 4 m wide. What is its area in square metres?", "answer": 12, "kind": "guided", "hint": ["Area counts the unit squares inside.", "Use length × width: 3 × 4.", "The area is 12 square metres."], "steps": ["Area counts the unit squares inside.", "Use length × width: 3 × 4.", "The area is 12 square metres."], "explain": "The area is 12 square metres."}, {"title": "Garden fence 1", "skill": "Perimeter", "q": "A rectangular garden is 5 m long and 3 m wide. How many metres of fence go all the way around?", "answer": 16, "kind": "guided", "hint": ["Perimeter means the distance around the outside.", "Add all four sides: 5 + 3 + 5 + 3.", "The perimeter is 16 metres."], "steps": ["Perimeter means the distance around the outside.", "Add all four sides: 5 + 3 + 5 + 3.", "The perimeter is 16 metres."], "explain": "The perimeter is 16 metres."}, {"title": "Growing sunflower 1", "skill": "Length conversion", "q": "A sunflower is 2 m 15 cm tall. How tall is it in centimetres?", "answer": 215, "kind": "guided", "hint": ["1 metre equals 100 centimetres.", "2 metres = 200 centimetres.", "200 + 15 = 215 cm."], "steps": ["1 metre equals 100 centimetres.", "2 metres = 200 centimetres.", "200 + 15 = 215 cm."], "explain": "200 + 15 = 215 cm."}, {"title": "Seed jar mass 1", "skill": "Mass conversion", "q": "A seed jar weighs 2 kg 25 g. How many grams is that?", "answer": 2025, "kind": "guided", "hint": ["1 kilogram equals 1,000 grams.", "2 kilograms = 2000 grams.", "2000 + 25 = 2025 grams."], "steps": ["1 kilogram equals 1,000 grams.", "2 kilograms = 2000 grams.", "2000 + 25 = 2025 grams."], "explain": "2000 + 25 = 2025 grams."}, {"title": "Flower bed squares 2", "skill": "Area", "q": "A rectangular flower bed is 4 m long and 5 m wide. What is its area in square metres?", "answer": 20, "kind": "guided", "hint": ["Area counts the unit squares inside.", "Use length × width: 4 × 5.", "The area is 20 square metres."], "steps": ["Area counts the unit squares inside.", "Use length × width: 4 × 5.", "The area is 20 square metres."], "explain": "The area is 20 square metres."}, {"title": "Garden fence 2", "skill": "Perimeter", "q": "A rectangular garden is 6 m long and 4 m wide. How many metres of fence go all the way around?", "answer": 20, "kind": "guided", "hint": ["Perimeter means the distance around the outside.", "Add all four sides: 6 + 4 + 6 + 4.", "The perimeter is 20 metres."], "steps": ["Perimeter means the distance around the outside.", "Add all four sides: 6 + 4 + 6 + 4.", "The perimeter is 20 metres."], "explain": "The perimeter is 20 metres."}, {"title": "Growing sunflower 2", "skill": "Length conversion", "q": "A sunflower is 3 m 25 cm tall. How tall is it in centimetres?", "answer": 325, "kind": "guided", "hint": ["1 metre equals 100 centimetres.", "3 metres = 300 centimetres.", "300 + 25 = 325 cm."], "steps": ["1 metre equals 100 centimetres.", "3 metres = 300 centimetres.", "300 + 25 = 325 cm."], "explain": "300 + 25 = 325 cm."}, {"title": "Seed jar mass 2", "skill": "Mass conversion", "q": "A seed jar weighs 3 kg 28 g. How many grams is that?", "answer": 3028, "kind": "guided", "hint": ["1 kilogram equals 1,000 grams.", "3 kilograms = 3000 grams.", "3000 + 28 = 3028 grams."], "steps": ["1 kilogram equals 1,000 grams.", "3 kilograms = 3000 grams.", "3000 + 28 = 3028 grams."], "explain": "3000 + 28 = 3028 grams."}, {"title": "Flower bed squares 3", "skill": "Area", "q": "A rectangular flower bed is 5 m long and 6 m wide. What is its area in square metres?", "answer": 30, "kind": "guided", "hint": ["Area counts the unit squares inside.", "Use length × width: 5 × 6.", "The area is 30 square metres."], "steps": ["Area counts the unit squares inside.", "Use length × width: 5 × 6.", "The area is 30 square metres."], "explain": "The area is 30 square metres."}, {"title": "Garden fence 3", "skill": "Perimeter", "q": "A rectangular garden is 7 m long and 5 m wide. How many metres of fence go all the way around?", "answer": 24, "kind": "guided", "hint": ["Perimeter means the distance around the outside.", "Add all four sides: 7 + 5 + 7 + 5.", "The perimeter is 24 metres."], "steps": ["Perimeter means the distance around the outside.", "Add all four sides: 7 + 5 + 7 + 5.", "The perimeter is 24 metres."], "explain": "The perimeter is 24 metres."}, {"title": "Growing sunflower 3", "skill": "Length conversion", "q": "A sunflower is 4 m 35 cm tall. How tall is it in centimetres?", "answer": 435, "kind": "guided", "hint": ["1 metre equals 100 centimetres.", "4 metres = 400 centimetres.", "400 + 35 = 435 cm."], "steps": ["1 metre equals 100 centimetres.", "4 metres = 400 centimetres.", "400 + 35 = 435 cm."], "explain": "400 + 35 = 435 cm."}, {"title": "Seed jar mass 3", "skill": "Mass conversion", "q": "A seed jar weighs 4 kg 31 g. How many grams is that?", "answer": 4031, "kind": "guided", "hint": ["1 kilogram equals 1,000 grams.", "4 kilograms = 4000 grams.", "4000 + 31 = 4031 grams."], "steps": ["1 kilogram equals 1,000 grams.", "4 kilograms = 4000 grams.", "4000 + 31 = 4031 grams."], "explain": "4000 + 31 = 4031 grams."}, {"title": "Flower bed squares 4", "skill": "Area", "q": "A rectangular flower bed is 6 m long and 4 m wide. What is its area in square metres?", "answer": 24, "kind": "guided", "hint": ["Area counts the unit squares inside.", "Use length × width: 6 × 4.", "The area is 24 square metres."], "steps": ["Area counts the unit squares inside.", "Use length × width: 6 × 4.", "The area is 24 square metres."], "explain": "The area is 24 square metres."}, {"title": "Garden fence 4", "skill": "Perimeter", "q": "A rectangular garden is 8 m long and 3 m wide. How many metres of fence go all the way around?", "answer": 22, "kind": "guided", "hint": ["Perimeter means the distance around the outside.", "Add all four sides: 8 + 3 + 8 + 3.", "The perimeter is 22 metres."], "steps": ["Perimeter means the distance around the outside.", "Add all four sides: 8 + 3 + 8 + 3.", "The perimeter is 22 metres."], "explain": "The perimeter is 22 metres."}, {"title": "Growing sunflower 4", "skill": "Length conversion", "q": "A sunflower is 5 m 45 cm tall. How tall is it in centimetres?", "answer": 545, "kind": "guided", "hint": ["1 metre equals 100 centimetres.", "5 metres = 500 centimetres.", "500 + 45 = 545 cm."], "steps": ["1 metre equals 100 centimetres.", "5 metres = 500 centimetres.", "500 + 45 = 545 cm."], "explain": "500 + 45 = 545 cm."}, {"title": "Seed jar mass 4", "skill": "Mass conversion", "q": "A seed jar weighs 5 kg 34 g. How many grams is that?", "answer": 5034, "kind": "guided", "hint": ["1 kilogram equals 1,000 grams.", "5 kilograms = 5000 grams.", "5000 + 34 = 5034 grams."], "steps": ["1 kilogram equals 1,000 grams.", "5 kilograms = 5000 grams.", "5000 + 34 = 5034 grams."], "explain": "5000 + 34 = 5034 grams."}, {"title": "Flower bed squares 5", "skill": "Area", "q": "A rectangular flower bed is 7 m long and 5 m wide. What is its area in square metres?", "answer": 35, "kind": "guided", "hint": ["Area counts the unit squares inside.", "Use length × width: 7 × 5.", "The area is 35 square metres."], "steps": ["Area counts the unit squares inside.", "Use length × width: 7 × 5.", "The area is 35 square metres."], "explain": "The area is 35 square metres."}, {"title": "Garden fence 5", "skill": "Perimeter", "q": "A rectangular garden is 9 m long and 4 m wide. How many metres of fence go all the way around?", "answer": 26, "kind": "guided", "hint": ["Perimeter means the distance around the outside.", "Add all four sides: 9 + 4 + 9 + 4.", "The perimeter is 26 metres."], "steps": ["Perimeter means the distance around the outside.", "Add all four sides: 9 + 4 + 9 + 4.", "The perimeter is 26 metres."], "explain": "The perimeter is 26 metres."}, {"title": "Growing sunflower 5", "skill": "Length conversion", "q": "A sunflower is 6 m 55 cm tall. How tall is it in centimetres?", "answer": 655, "kind": "guided", "hint": ["1 metre equals 100 centimetres.", "6 metres = 600 centimetres.", "600 + 55 = 655 cm."], "steps": ["1 metre equals 100 centimetres.", "6 metres = 600 centimetres.", "600 + 55 = 655 cm."], "explain": "600 + 55 = 655 cm."}, {"title": "Seed jar mass 5", "skill": "Mass conversion", "q": "A seed jar weighs 6 kg 37 g. How many grams is that?", "answer": 6037, "kind": "guided", "hint": ["1 kilogram equals 1,000 grams.", "6 kilograms = 6000 grams.", "6000 + 37 = 6037 grams."], "steps": ["1 kilogram equals 1,000 grams.", "6 kilograms = 6000 grams.", "6000 + 37 = 6037 grams."], "explain": "6000 + 37 = 6037 grams."}, {"title": "Forest stepping stones 1", "skill": "Number patterns", "q": "What comes next: 4, 6, 8, 10, …?", "answer": 12, "kind": "guided", "hint": ["Find the difference between neighbouring numbers.", "Add 2 each time.", "10 + 2 = 12."], "steps": ["Find the difference between neighbouring numbers.", "Add 2 each time.", "10 + 2 = 12."], "explain": "10 + 2 = 12."}, {"title": "Woodland seed packs 1", "skill": "Multiplication", "q": "A pack holds 23 seeds. How many seeds are in 3 packs?", "answer": 69, "kind": "guided", "hint": ["Split 23 into 20 + 3.", "Multiply each part by 3.", "23 × 3 = 69 seeds."], "steps": ["Split 23 into 20 + 3.", "Multiply each part by 3.", "23 × 3 = 69 seeds."], "explain": "23 × 3 = 69 seeds."}, {"title": "Acorn collecting 1", "skill": "Two-step problems", "q": "You collect 4 bags of 7 acorns, then give away 6 acorns. How many remain?", "answer": 22, "kind": "guided", "hint": ["First work out how many acorns are in all the bags.", "4 × 7 = 28 acorns.", "28 − 6 = 22 acorns left."], "steps": ["First work out how many acorns are in all the bags.", "4 × 7 = 28 acorns.", "28 − 6 = 22 acorns left."], "explain": "28 − 6 = 22 acorns left."}, {"title": "Forest walk time 1", "skill": "Time conversion", "q": "A walk takes 1 hours and 15 minutes. How many minutes is that?", "answer": 75, "kind": "guided", "hint": ["One hour has 60 minutes.", "1 hours = 60 minutes.", "60 + 15 = 75 minutes."], "steps": ["One hour has 60 minutes.", "1 hours = 60 minutes.", "60 + 15 = 75 minutes."], "explain": "60 + 15 = 75 minutes."}, {"title": "Forest stepping stones 2", "skill": "Number patterns", "q": "What comes next: 5, 8, 11, 14, …?", "answer": 17, "kind": "guided", "hint": ["Find the difference between neighbouring numbers.", "Add 3 each time.", "14 + 3 = 17."], "steps": ["Find the difference between neighbouring numbers.", "Add 3 each time.", "14 + 3 = 17."], "explain": "14 + 3 = 17."}, {"title": "Woodland seed packs 2", "skill": "Multiplication", "q": "A pack holds 27 seeds. How many seeds are in 4 packs?", "answer": 108, "kind": "guided", "hint": ["Split 27 into 20 + 7.", "Multiply each part by 4.", "27 × 4 = 108 seeds."], "steps": ["Split 27 into 20 + 7.", "Multiply each part by 4.", "27 × 4 = 108 seeds."], "explain": "27 × 4 = 108 seeds."}, {"title": "Acorn collecting 2", "skill": "Two-step problems", "q": "You collect 5 bags of 8 acorns, then give away 7 acorns. How many remain?", "answer": 33, "kind": "guided", "hint": ["First work out how many acorns are in all the bags.", "5 × 8 = 40 acorns.", "40 − 7 = 33 acorns left."], "steps": ["First work out how many acorns are in all the bags.", "5 × 8 = 40 acorns.", "40 − 7 = 33 acorns left."], "explain": "40 − 7 = 33 acorns left."}, {"title": "Forest walk time 2", "skill": "Time conversion", "q": "A walk takes 2 hours and 20 minutes. How many minutes is that?", "answer": 140, "kind": "guided", "hint": ["One hour has 60 minutes.", "2 hours = 120 minutes.", "120 + 20 = 140 minutes."], "steps": ["One hour has 60 minutes.", "2 hours = 120 minutes.", "120 + 20 = 140 minutes."], "explain": "120 + 20 = 140 minutes."}, {"title": "Forest stepping stones 3", "skill": "Number patterns", "q": "What comes next: 6, 10, 14, 18, …?", "answer": 22, "kind": "guided", "hint": ["Find the difference between neighbouring numbers.", "Add 4 each time.", "18 + 4 = 22."], "steps": ["Find the difference between neighbouring numbers.", "Add 4 each time.", "18 + 4 = 22."], "explain": "18 + 4 = 22."}, {"title": "Woodland seed packs 3", "skill": "Multiplication", "q": "A pack holds 31 seeds. How many seeds are in 5 packs?", "answer": 155, "kind": "guided", "hint": ["Split 31 into 30 + 1.", "Multiply each part by 5.", "31 × 5 = 155 seeds."], "steps": ["Split 31 into 30 + 1.", "Multiply each part by 5.", "31 × 5 = 155 seeds."], "explain": "31 × 5 = 155 seeds."}, {"title": "Acorn collecting 3", "skill": "Two-step problems", "q": "You collect 6 bags of 9 acorns, then give away 8 acorns. How many remain?", "answer": 46, "kind": "guided", "hint": ["First work out how many acorns are in all the bags.", "6 × 9 = 54 acorns.", "54 − 8 = 46 acorns left."], "steps": ["First work out how many acorns are in all the bags.", "6 × 9 = 54 acorns.", "54 − 8 = 46 acorns left."], "explain": "54 − 8 = 46 acorns left."}, {"title": "Forest walk time 3", "skill": "Time conversion", "q": "A walk takes 3 hours and 25 minutes. How many minutes is that?", "answer": 205, "kind": "guided", "hint": ["One hour has 60 minutes.", "3 hours = 180 minutes.", "180 + 25 = 205 minutes."], "steps": ["One hour has 60 minutes.", "3 hours = 180 minutes.", "180 + 25 = 205 minutes."], "explain": "180 + 25 = 205 minutes."}, {"title": "Forest stepping stones 4", "skill": "Number patterns", "q": "What comes next: 7, 12, 17, 22, …?", "answer": 27, "kind": "guided", "hint": ["Find the difference between neighbouring numbers.", "Add 5 each time.", "22 + 5 = 27."], "steps": ["Find the difference between neighbouring numbers.", "Add 5 each time.", "22 + 5 = 27."], "explain": "22 + 5 = 27."}, {"title": "Woodland seed packs 4", "skill": "Multiplication", "q": "A pack holds 35 seeds. How many seeds are in 3 packs?", "answer": 105, "kind": "guided", "hint": ["Split 35 into 30 + 5.", "Multiply each part by 3.", "35 × 3 = 105 seeds."], "steps": ["Split 35 into 30 + 5.", "Multiply each part by 3.", "35 × 3 = 105 seeds."], "explain": "35 × 3 = 105 seeds."}, {"title": "Acorn collecting 4", "skill": "Two-step problems", "q": "You collect 4 bags of 10 acorns, then give away 9 acorns. How many remain?", "answer": 31, "kind": "guided", "hint": ["First work out how many acorns are in all the bags.", "4 × 10 = 40 acorns.", "40 − 9 = 31 acorns left."], "steps": ["First work out how many acorns are in all the bags.", "4 × 10 = 40 acorns.", "40 − 9 = 31 acorns left."], "explain": "40 − 9 = 31 acorns left."}, {"title": "Forest walk time 4", "skill": "Time conversion", "q": "A walk takes 1 hours and 30 minutes. How many minutes is that?", "answer": 90, "kind": "guided", "hint": ["One hour has 60 minutes.", "1 hours = 60 minutes.", "60 + 30 = 90 minutes."], "steps": ["One hour has 60 minutes.", "1 hours = 60 minutes.", "60 + 30 = 90 minutes."], "explain": "60 + 30 = 90 minutes."}, {"title": "Forest stepping stones 5", "skill": "Number patterns", "q": "What comes next: 8, 14, 20, 26, …?", "answer": 32, "kind": "guided", "hint": ["Find the difference between neighbouring numbers.", "Add 6 each time.", "26 + 6 = 32."], "steps": ["Find the difference between neighbouring numbers.", "Add 6 each time.", "26 + 6 = 32."], "explain": "26 + 6 = 32."}, {"title": "Woodland seed packs 5", "skill": "Multiplication", "q": "A pack holds 39 seeds. How many seeds are in 4 packs?", "answer": 156, "kind": "guided", "hint": ["Split 39 into 30 + 9.", "Multiply each part by 4.", "39 × 4 = 156 seeds."], "steps": ["Split 39 into 30 + 9.", "Multiply each part by 4.", "39 × 4 = 156 seeds."], "explain": "39 × 4 = 156 seeds."}, {"title": "Acorn collecting 5", "skill": "Two-step problems", "q": "You collect 5 bags of 11 acorns, then give away 10 acorns. How many remain?", "answer": 45, "kind": "guided", "hint": ["First work out how many acorns are in all the bags.", "5 × 11 = 55 acorns.", "55 − 10 = 45 acorns left."], "steps": ["First work out how many acorns are in all the bags.", "5 × 11 = 55 acorns.", "55 − 10 = 45 acorns left."], "explain": "55 − 10 = 45 acorns left."}, {"title": "Forest walk time 5", "skill": "Time conversion", "q": "A walk takes 2 hours and 35 minutes. How many minutes is that?", "answer": 155, "kind": "guided", "hint": ["One hour has 60 minutes.", "2 hours = 120 minutes.", "120 + 35 = 155 minutes."], "steps": ["One hour has 60 minutes.", "2 hours = 120 minutes.", "120 + 35 = 155 minutes."], "explain": "120 + 35 = 155 minutes."}, {"title": "Cavern shop change 1", "skill": "Money", "q": "A torch costs 125 cents and a map costs 75 cents. You pay 500 cents. How many cents change do you get?", "answer": 300, "kind": "guided", "hint": ["First add the two prices.", "125 + 75 = 200 cents.", "500 − 200 = 300 cents change."], "steps": ["First add the two prices.", "125 + 75 = 200 cents.", "500 − 200 = 300 cents change."], "explain": "500 − 200 = 300 cents change."}, {"title": "Crystal path lengths 1", "skill": "Adding decimals", "q": "One path is 1.25 m and another is 0.50 m. What is the combined length?", "answer": 1.75, "kind": "guided", "hint": ["Line up the decimal points.", "Add hundredths, then tenths, then whole metres.", "1.25 + 0.50 = 1.75 metres."], "steps": ["Line up the decimal points.", "Add hundredths, then tenths, then whole metres.", "1.25 + 0.50 = 1.75 metres."], "explain": "1.25 + 0.50 = 1.75 metres."}, {"title": "Crystal sharing puzzle 1", "skill": "Missing numbers", "q": "Fill in the missing number: □ × 3 = 18.", "answer": 6, "kind": "guided", "hint": ["Multiplication and division undo each other.", "Calculate 18 ÷ 3.", "The missing number is 6: 6 × 3 = 18."], "steps": ["Multiplication and division undo each other.", "Calculate 18 ÷ 3.", "The missing number is 6: 6 × 3 = 18."], "explain": "The missing number is 6: 6 × 3 = 18."}, {"title": "Crystal estimate 1", "skill": "Rounding", "q": "Round 142 to the nearest 10.", "answer": 140, "kind": "guided", "hint": ["Look at the ones digit.", "The ones digit is 2. If it is 5 or more round up; otherwise round down.", "142 rounded to the nearest 10 is 140."], "steps": ["Look at the ones digit.", "The ones digit is 2. If it is 5 or more round up; otherwise round down.", "142 rounded to the nearest 10 is 140."], "explain": "142 rounded to the nearest 10 is 140."}, {"title": "Cavern shop change 2", "skill": "Money", "q": "A torch costs 150 cents and a map costs 85 cents. You pay 500 cents. How many cents change do you get?", "answer": 265, "kind": "guided", "hint": ["First add the two prices.", "150 + 85 = 235 cents.", "500 − 235 = 265 cents change."], "steps": ["First add the two prices.", "150 + 85 = 235 cents.", "500 − 235 = 265 cents change."], "explain": "500 − 235 = 265 cents change."}, {"title": "Crystal path lengths 2", "skill": "Adding decimals", "q": "One path is 1.75 m and another is 0.60 m. What is the combined length?", "answer": 2.35, "kind": "guided", "hint": ["Line up the decimal points.", "Add hundredths, then tenths, then whole metres.", "1.75 + 0.60 = 2.35 metres."], "steps": ["Line up the decimal points.", "Add hundredths, then tenths, then whole metres.", "1.75 + 0.60 = 2.35 metres."], "explain": "1.75 + 0.60 = 2.35 metres."}, {"title": "Crystal sharing puzzle 2", "skill": "Missing numbers", "q": "Fill in the missing number: □ × 4 = 28.", "answer": 7, "kind": "guided", "hint": ["Multiplication and division undo each other.", "Calculate 28 ÷ 4.", "The missing number is 7: 7 × 4 = 28."], "steps": ["Multiplication and division undo each other.", "Calculate 28 ÷ 4.", "The missing number is 7: 7 × 4 = 28."], "explain": "The missing number is 7: 7 × 4 = 28."}, {"title": "Crystal estimate 2", "skill": "Rounding", "q": "Round 255 to the nearest 10.", "answer": 260, "kind": "guided", "hint": ["Look at the ones digit.", "The ones digit is 5. If it is 5 or more round up; otherwise round down.", "255 rounded to the nearest 10 is 260."], "steps": ["Look at the ones digit.", "The ones digit is 5. If it is 5 or more round up; otherwise round down.", "255 rounded to the nearest 10 is 260."], "explain": "255 rounded to the nearest 10 is 260."}, {"title": "Cavern shop change 3", "skill": "Money", "q": "A torch costs 175 cents and a map costs 95 cents. You pay 500 cents. How many cents change do you get?", "answer": 230, "kind": "guided", "hint": ["First add the two prices.", "175 + 95 = 270 cents.", "500 − 270 = 230 cents change."], "steps": ["First add the two prices.", "175 + 95 = 270 cents.", "500 − 270 = 230 cents change."], "explain": "500 − 270 = 230 cents change."}, {"title": "Crystal path lengths 3", "skill": "Adding decimals", "q": "One path is 2.25 m and another is 0.70 m. What is the combined length?", "answer": 2.95, "kind": "guided", "hint": ["Line up the decimal points.", "Add hundredths, then tenths, then whole metres.", "2.25 + 0.70 = 2.95 metres."], "steps": ["Line up the decimal points.", "Add hundredths, then tenths, then whole metres.", "2.25 + 0.70 = 2.95 metres."], "explain": "2.25 + 0.70 = 2.95 metres."}, {"title": "Crystal sharing puzzle 3", "skill": "Missing numbers", "q": "Fill in the missing number: □ × 5 = 40.", "answer": 8, "kind": "guided", "hint": ["Multiplication and division undo each other.", "Calculate 40 ÷ 5.", "The missing number is 8: 8 × 5 = 40."], "steps": ["Multiplication and division undo each other.", "Calculate 40 ÷ 5.", "The missing number is 8: 8 × 5 = 40."], "explain": "The missing number is 8: 8 × 5 = 40."}, {"title": "Crystal estimate 3", "skill": "Rounding", "q": "Round 368 to the nearest 10.", "answer": 370, "kind": "guided", "hint": ["Look at the ones digit.", "The ones digit is 8. If it is 5 or more round up; otherwise round down.", "368 rounded to the nearest 10 is 370."], "steps": ["Look at the ones digit.", "The ones digit is 8. If it is 5 or more round up; otherwise round down.", "368 rounded to the nearest 10 is 370."], "explain": "368 rounded to the nearest 10 is 370."}, {"title": "Cavern shop change 4", "skill": "Money", "q": "A torch costs 200 cents and a map costs 105 cents. You pay 500 cents. How many cents change do you get?", "answer": 195, "kind": "guided", "hint": ["First add the two prices.", "200 + 105 = 305 cents.", "500 − 305 = 195 cents change."], "steps": ["First add the two prices.", "200 + 105 = 305 cents.", "500 − 305 = 195 cents change."], "explain": "500 − 305 = 195 cents change."}, {"title": "Crystal path lengths 4", "skill": "Adding decimals", "q": "One path is 2.75 m and another is 0.80 m. What is the combined length?", "answer": 3.55, "kind": "guided", "hint": ["Line up the decimal points.", "Add hundredths, then tenths, then whole metres.", "2.75 + 0.80 = 3.55 metres."], "steps": ["Line up the decimal points.", "Add hundredths, then tenths, then whole metres.", "2.75 + 0.80 = 3.55 metres."], "explain": "2.75 + 0.80 = 3.55 metres."}, {"title": "Crystal sharing puzzle 4", "skill": "Missing numbers", "q": "Fill in the missing number: □ × 3 = 27.", "answer": 9, "kind": "guided", "hint": ["Multiplication and division undo each other.", "Calculate 27 ÷ 3.", "The missing number is 9: 9 × 3 = 27."], "steps": ["Multiplication and division undo each other.", "Calculate 27 ÷ 3.", "The missing number is 9: 9 × 3 = 27."], "explain": "The missing number is 9: 9 × 3 = 27."}, {"title": "Crystal estimate 4", "skill": "Rounding", "q": "Round 481 to the nearest 10.", "answer": 480, "kind": "guided", "hint": ["Look at the ones digit.", "The ones digit is 1. If it is 5 or more round up; otherwise round down.", "481 rounded to the nearest 10 is 480."], "steps": ["Look at the ones digit.", "The ones digit is 1. If it is 5 or more round up; otherwise round down.", "481 rounded to the nearest 10 is 480."], "explain": "481 rounded to the nearest 10 is 480."}, {"title": "Cavern shop change 5", "skill": "Money", "q": "A torch costs 225 cents and a map costs 115 cents. You pay 500 cents. How many cents change do you get?", "answer": 160, "kind": "guided", "hint": ["First add the two prices.", "225 + 115 = 340 cents.", "500 − 340 = 160 cents change."], "steps": ["First add the two prices.", "225 + 115 = 340 cents.", "500 − 340 = 160 cents change."], "explain": "500 − 340 = 160 cents change."}, {"title": "Crystal path lengths 5", "skill": "Adding decimals", "q": "One path is 3.25 m and another is 0.90 m. What is the combined length?", "answer": 4.15, "kind": "guided", "hint": ["Line up the decimal points.", "Add hundredths, then tenths, then whole metres.", "3.25 + 0.90 = 4.15 metres."], "steps": ["Line up the decimal points.", "Add hundredths, then tenths, then whole metres.", "3.25 + 0.90 = 4.15 metres."], "explain": "3.25 + 0.90 = 4.15 metres."}, {"title": "Crystal sharing puzzle 5", "skill": "Missing numbers", "q": "Fill in the missing number: □ × 4 = 40.", "answer": 10, "kind": "guided", "hint": ["Multiplication and division undo each other.", "Calculate 40 ÷ 4.", "The missing number is 10: 10 × 4 = 40."], "steps": ["Multiplication and division undo each other.", "Calculate 40 ÷ 4.", "The missing number is 10: 10 × 4 = 40."], "explain": "The missing number is 10: 10 × 4 = 40."}, {"title": "Crystal estimate 5", "skill": "Rounding", "q": "Round 594 to the nearest 10.", "answer": 590, "kind": "guided", "hint": ["Look at the ones digit.", "The ones digit is 4. If it is 5 or more round up; otherwise round down.", "594 rounded to the nearest 10 is 590."], "steps": ["Look at the ones digit.", "The ones digit is 4. If it is 5 or more round up; otherwise round down.", "594 rounded to the nearest 10 is 590."], "explain": "594 rounded to the nearest 10 is 590."}];
const youngerQuestions=[];
locations.forEach((l,i)=>l.ids.forEach((id,j)=>{youngerQuestions[id]=youngerByLocation[i*20+j];}));
// Each new bracket has five sets of 20, mapped onto the existing island IDs.
function buildEarlyQuestions(level){
const groups=Array.from({length:5},()=>[]);
const add=(island,title,skill,q,answer,steps,visual='')=>groups[island].push({title,skill,q,answer,kind:'guided',hint:steps,steps,explain:steps[2],visual});
const dots=n=>Array.from({length:n},(_,i)=>(i>0&&i%5===0?'  ':'')+'●').join(' ');
if(level==='5-6'){
for(let n=1;n<=10;n++){
add(0,`Count the shells ${n}`,'Counting',`Count the shells in ${['Mia','Leo','Ava','Noah','Isla','Finn','Zoe','Owen','Ruby','Max'][n-1]}’s collection. How many are there?`,n,['Touch each dot once. Each dot stands for one shell.','Say the counting numbers as you touch the dots.',`There ${n===1?'is 1 shell':`are ${n} shells`}.`],dots(n));
add(0,`One more ${n}`,'Number order',`What number comes just after ${n}?`,n+1,[`Start at ${n}.`,'Count forward one number.',`The number after ${n} is ${n+1}.`]);
}
for(let a=1;a<=5;a++)for(let b=1;b<=4;b++){
add(1,`Joining berries ${a} and ${b}`,'Addition within 10',`You have ${a} berries and find ${b} more. How many berries now?`,a+b,[`Start with ${a} berries.`,`Count on ${b} more, one at a time.`,`${a} + ${b} = ${a+b} berries.`],`${dots(a)}  +  ${dots(b)}`);
}
let subtractionCount=0;
for(let a=3;a<=10&&subtractionCount<20;a++)for(let b=1;b<=3&&subtractionCount<20;b++){
add(2,`Shells left ${a} take ${b}`,'Subtraction within 10',`There are ${a} shells. You give away ${b}. How many shells are left?`,a-b,[`Start with ${a} shells.`,`Cover ${b} dots and count what is left.`,`${a} − ${b} = ${a-b} shells left.`],dots(a));subtractionCount++;
}
for(let n=1;n<=10;n++)add(3,`Bigger basket ${n}`,'Comparing numbers',`One basket has ${n} apples. Another has ${n+2}. Which number is bigger?`,n+2,[`Compare ${n} and ${n+2}.`,'The number farther along when you count is bigger.',`${n+2} is bigger than ${n}.`]);
const shapes=[['triangle','△',3],['square','□',4],['rectangle','▭',4],['circle','○',0],['hexagon','⬡',6]];
for(const [name,symbol,sides] of shapes){
add(3,`${name} sides`,'Shapes',`How many straight sides does a ${name} have?`,sides,[`Look at the ${name}.`,'Count only the straight edges around it.',`A ${name} has ${sides} straight sides.`],symbol);
add(3,`${name} corners`,'Shapes',`How many corners does a ${name} have?`,sides,[`Trace around the ${name}.`,'Count the points where two straight sides meet.',`A ${name} has ${sides} corners.`],symbol);
}
for(let n=0;n<10;n++){
add(4,`Make ten ${n}`,'Number bonds to 10',`You have ${n} gems. How many more do you need to make 10?`,10-n,[`Start at ${n}.`,'Count up to 10. Count how many steps you take.',`${n} + ${10-n} = 10. You need ${10-n} more gems.`]);
add(4,`Hop by two ${n}`,'Number patterns',`What number comes next: ${n}, ${n+2}, ${n+4}, □?`,n+6,[`Start at ${n}.`,'Each hop adds 2.',`${n+4} + 2 = ${n+6}. The next number is ${n+6}.`]);
}
}else{
for(let i=0;i<10;i++){
const n=23+i*7,tens=Math.floor(n/10),ones=n%10;
add(0,`Tens in ${n}`,'Place value',`How many tens are in ${n}?`,tens,[`Split ${n} into tens and ones.`,`The first digit shows tens; the last shows ones.`,`${n} has ${tens} tens and ${ones} ones.`]);
add(0,`Build a number ${i+1}`,'Place value',`What number has ${i+1} tens and ${9-i} ones?`,(i+1)*10+9-i,[`Each ten is a group of 10.`,`Calculate ${(i+1)} × 10, then add ${9-i}.`,`${i+1} tens and ${9-i} ones make ${(i+1)*10+9-i}.`]);
const a=14+i*3,b=12+i*2,total=a+b;
add(1,`Berry delivery ${i+1}`,'Addition within 100',`A boat brings ${a} berries and then ${b} more. How many berries arrive altogether?`,total,['Add the tens first, then the ones.',`${Math.floor(a/10)*10} + ${Math.floor(b/10)*10} = ${Math.floor(a/10)*10+Math.floor(b/10)*10}. Now add ${a%10} + ${b%10}.`,`${a} + ${b} = ${total} berries.`]);
add(1,`Shell shop ${i+1}`,'Subtraction within 100',`The shop has ${total} shells and sells ${b}. How many shells remain?`,a,[`Start with ${total}.`,`Subtract ${Math.floor(b/10)*10}, then subtract ${b%10}.`,`${total} − ${b} = ${a} shells.`]);
const factor=[2,5,10][i%3],count=i+1;
add(2,`Equal baskets ${i+1}`,'Multiplication',`There are ${count} baskets with ${factor} apples in each. How many apples altogether?`,count*factor,[`There are ${count} equal groups of ${factor}.`,`Count in ${factor}s, once for each basket.`,`${count} × ${factor} = ${count*factor} apples.`]);
add(2,`Share the gems ${i+1}`,'Equal sharing',`Share ${count*factor} gems equally among ${factor} explorers. How many gems does each explorer get?`,count,[`Make ${factor} equal groups.`,`Think: ${factor} times what number makes ${count*factor}?`,`${count*factor} ÷ ${factor} = ${count} gems each.`]);
const hour=i+1,duration=i%2+1;
add(3,`Ferry clock ${i+1}`,'Time',`The ferry leaves at ${hour} o’clock and sails for ${duration} ${duration===1?'hour':'hours'}. What hour does it arrive?`,hour+duration,[`Start at ${hour} o’clock.`,`Move forward ${duration} ${duration===1?'hour':'hours'} on the clock.`,`${hour} + ${duration} = ${hour+duration}. It arrives at ${hour+duration} o’clock.`]);
const paid=50+i*5,cost=15+i*3;
add(3,`Market change ${i+1}`,'Money',`A map costs ${cost} cents. You pay ${paid} cents. How many cents change do you get?`,paid-cost,[`Start with ${paid} cents.`,`Take away the price: ${cost} cents.`,`${paid} − ${cost} = ${paid-cost} cents change.`]);
}
for(let i=1;i<=5;i++){
const pair=2+i*2,whole=i*4,a=i+1,b=i+2;
add(4,`Half a collection ${i}`,'Halves',`Half of ${pair} shells go in a basket. How many shells go in the basket?`,pair/2,[`Half means one of two equal groups.`,`Share ${pair} shells equally into 2 groups.`,`${pair} ÷ 2 = ${pair/2}. Half is ${pair/2} shells.`]);
add(4,`Quarter of the gems ${i}`,'Quarters',`What is one quarter of ${whole} gems?`,i,['A quarter is one of four equal groups.',`Share ${whole} gems equally into 4 groups.`,`${whole} ÷ 4 = ${i}. One quarter is ${i} gems.`]);
add(4,`Garden fence ${i}`,'Perimeter',`A rectangular garden is ${a} metres long and ${b} metres wide. How many metres of fence go all the way around it?`,2*(a+b),['Perimeter is the distance all the way around.','A rectangle has two lengths and two widths.',`${a} + ${b} + ${a} + ${b} = ${2*(a+b)} metres.`]);
add(4,`Bird survey ${i}`,'Reading data',`A bird chart shows ${i+2} gulls, ${i+3} ducks, and ${i+1} herons. How many birds were counted altogether?`,3*i+6,['Read all three bird counts.',`Add ${i+2} gulls and ${i+3} ducks, then ${i+1} herons.`,`${i+2} + ${i+3} + ${i+1} = ${3*i+6} birds.`],`Gulls: ${i+2}  |  Ducks: ${i+3}  |  Herons: ${i+1}`);
}
}
const bank=[];
locations.forEach((location,island)=>location.ids.forEach((id,index)=>{bank[id]=groups[island][index];}));
return bank;
}
// Append-only curriculum expansion: five rounds of 20 questions per age bracket.
// Interleave concepts so each destination receives a balanced practice selection.
function buildAdditionalQuestions(level){
const bank=[];let round=0;
const balanceSkills=['Multiplication','Division','Order of operations','Negative numbers','Adding fractions','Subtracting fractions','Fractions of quantities','Multiplying fractions','Adding decimals','Multiplying decimals'];
const add=(skill,q,answer,first,second,explain,visual='')=>{
// Older saves have only one comparison and four decimal-subtraction questions.
// Use two slots per round to bring those concepts level with the others.
if(level==='11-12'&&balanceSkills.slice(round*2,round*2+2).includes(skill))return;
const steps=[first,second,explain];
bank.push({title:`${skill} expedition ${Math.floor(bank.length/20)+1}.${bank.length%20+1}`,skill,q,answer,kind:'guided',hint:steps,steps:[...steps],explain,...(visual?{visual}:{})});
};
const dots=n=>'● '.repeat(n).trim();
for(let i=0;i<5;i++){
round=i;
if(level==='5-6'){
// Existing addition/subtraction sets are already full. Bring the other
// eight concepts to 20 questions each, including measurement and picture data.
for(let j=0;j<2;j++){
const n=i*2+j,a=2+i,b=j+1,total=a+b;
add('Counting',`Count the stars on explorer card ${n+1}. How many stars are shown?`,n+1,'Point to each star once.','Say one counting number for each star.',`There are ${n+1} stars.`,'★ '.repeat(n+1));
add('Number order',`What number comes just before ${n+2}?`,n+1,`Start at ${n+2}.`,'Count back one number.',`${n+1} comes just before ${n+2}.`);
add('Measuring length',`A red ribbon is ${a} blocks long. A blue ribbon is ${b} blocks long. How many blocks long are they when joined end to end?`,total,'Put the ribbons end to end without gaps.','Count the blocks along both ribbons.',`${a} + ${b} = ${total} blocks.`);
add('Reading data',`A picture chart shows ${total} green boats and ${a} yellow boats. How many more green boats than yellow boats are shown?`,b,'Pair each yellow boat with a green boat.','Count the green boats that have no partner.',`${total} − ${a} = ${b} more green boats.`,`Green: ${dots(total)} | Yellow: ${dots(a)}`);
add('Comparing numbers',`Which number is smaller: ${n} or ${n+1}?`,n,'Think about the counting order.','The smaller number comes first when counting.',`${n} is smaller than ${n+1}.`);
const shape=[['triangle','△',3],['square','□',4],['rectangle','▭',4],['circle','○',0],['hexagon','⬡',6]][i];
add('Shapes',j?`A ${shape[0]} has ${shape[2]} straight sides. How many straight sides do two of these shapes have altogether?`:`Look at the ${shape[0]} sign. How many corners can you count?`,shape[2]*(j+1),'Trace each shape with your finger.',j?'Count the sides of both shapes.':'Count where two straight edges meet.',`The ${j?'two shapes have':'shape has'} ${shape[2]*(j+1)} ${j?'straight sides':'corners'}.`,j?`${shape[1]} ${shape[1]}`:shape[1]);
add('Number bonds to 10',`Ten spaces are on a treasure tray. ${n} spaces are empty. How many spaces are filled?`,10-n,'There are 10 spaces altogether.',`Take away the ${n} empty spaces.`,`10 − ${n} = ${10-n} filled spaces.`);
const step=j+1,start=i+3;
add('Number patterns',`Count back in steps of ${step}: ${start+step*3}, ${start+step*2}, ${start+step}, □. What comes next?`,start,'The numbers are getting smaller.',`Subtract ${step} each time.`,`${start+step} − ${step} = ${start}.`);
add('Measuring length',`A leaf is ${a} blocks long. A twig is ${total} blocks long. How many blocks longer is the twig?`,b,'Compare the two lengths.',`Count from ${a} up to ${total}.`,`${total} − ${a} = ${b} blocks longer.`);
add('Reading data',`A picture chart shows ${a} red kites and ${b} blue kites. How many kites does the chart show in all?`,total,'Each mark stands for one kite.','Count the red and blue groups together.',`${a} + ${b} = ${total} kites.`,`Red: ${dots(a)} | Blue: ${dots(b)}`);
}
}else if(level==='7-8'){
for(let j=0;j<2;j++){
const n=2*i+j,a=23+3*n,b=12+n,total=a+b,factor=[2,5,10][n%3],count=n+1;
const fractionParts=j?4:2;
add(j?'Quarters':'Halves',`Share ${fractionParts*(i+6)} apples equally among ${fractionParts} baskets. How many apples are in one basket?`,i+6,`One basket holds one ${j?'quarter':'half'} of the apples.`,`Divide into ${fractionParts} equal groups.`,`${fractionParts*(i+6)} ÷ ${fractionParts} = ${i+6} apples.`);
add('Addition within 100',`You collected ${a} shells before lunch and ${b} after lunch. How many shells did you collect?`,total,'Add the tens, then the ones.','Regroup 10 ones as a ten if needed.',`${a} + ${b} = ${total} shells.`);
add('Subtraction within 100',`You need ${total} tiles for a path and already have ${a}. How many more tiles do you need?`,b,'Find the difference between the target and what you have.',`Subtract ${a} from ${total}.`,`${total} − ${a} = ${b} tiles.`);
add('Multiplication',`Each team needs ${factor} flags. How many flags do ${count} teams need?`,count*factor,'All teams need the same number of flags.',`Count ${count} groups of ${factor}.`,`${count} × ${factor} = ${count*factor} flags.`);
add('Equal sharing',`Put ${count*factor} stickers in packs of ${factor}. How many full packs can you make?`,count,'Make equal groups, each the size of one pack.',`How many groups of ${factor} make ${count*factor}?`,`${count*factor} ÷ ${factor} = ${count} packs.`);
const minute=5*(n+1),remaining=60-minute;
add('Time',`It is ${minute} minutes past 2. How many more minutes until 3 o’clock?`,remaining,'There are 60 minutes in an hour.','Subtract the minutes already passed from 60.',`60 − ${minute} = ${remaining} minutes.`);
add('Money',`A pencil costs ${15+n} cents and an eraser costs ${10+2*n} cents. How many cents do they cost together?`,25+3*n,'Both prices use cents.','Add the two prices.',`${15+n} + ${10+2*n} = ${25+3*n} cents.`);
const parts=j?4:2,whole=parts*(i+3);
add(j?'Quarters':'Halves',`A ribbon is ${whole} centimetres long. Cut it into ${parts} equal pieces. How many centimetres long is each piece?`,i+3,`Make ${parts} equal parts.`,`Divide ${whole} by ${parts}.`,`${whole} ÷ ${parts} = ${i+3} centimetres.`);
add('Perimeter',`A square flower bed has sides of ${n+2} metres. What is its perimeter in metres?`,4*(n+2),'A square has four equal sides.','Add all four side lengths.',`4 × ${n+2} = ${4*(n+2)} metres.`);
add('Reading data',`A chart records ${a} sunny days and ${b} rainy days. How many more sunny days than rainy days were recorded?`,a-b,'Compare the two counts.','Subtract the smaller count from the larger.',`${a} − ${b} = ${a-b} more sunny days.`,`Sunny: ${a} | Rainy: ${b}`);
}
}else if(level==='9-10'){
const a=247+37*i,b=168+19*i,m=6+i,k=4+i,d=6+2*i,x=i+2;
add('Addition',`The library has ${a} storybooks, ${b} fact books and ${45+i} maps. How many items altogether?`,a+b+45+i,'Line up the place values.','Add all three counts.',`${a} + ${b} + ${45+i} = ${a+b+45+i} items.`);
add('Subtraction',`A trail is ${a+b} metres long. You have walked ${b} metres. How many metres remain?`,a,'Start with the full trail length.','Subtract the distance walked.',`${a+b} − ${b} = ${a} metres.`);
add('Times tables',`A display has ${m} rows of ${k} shells. How many shells are on display?`,m*k,'Each row is an equal group.','Multiply rows by shells per row.',`${m} × ${k} = ${m*k} shells.`);
add('Division',`A bakery packs ${m*(k+3)} rolls into ${m} equal boxes. How many rolls are in each box?`,k+3,'Share the rolls equally.','Use multiplication to check the division.',`${m*(k+3)} ÷ ${m} = ${k+3} rolls.`);
add('Adding fractions',`A walker completes 1/${d} of a route, then ${x}/${d} more. What fraction of the route is completed?`,(x+1)/d,'The denominator tells the size of each equal part.','Add the numerators and keep the denominator.',`1/${d} + ${x}/${d} = ${x+1}/${d}.`);
add('Subtracting fractions',`A jug contains ${d-1}/${d} litre. You pour out ${x}/${d} litre. What fraction of a litre remains?`,(d-1-x)/d,'The fraction pieces have the same size.','Subtract the numerators.',`${d-1}/${d} − ${x}/${d} = ${d-1-x}/${d} litre.`);
add('Unit fractions',`One ${d}th of ${d*(i+4)} beads is blue. How many beads are blue?`,i+4,`Split the beads into ${d} equal groups.`,'Choose one of those groups.',`${d*(i+4)} ÷ ${d} = ${i+4} blue beads.`);
add('Tenths',`A strip has 10 equal parts and ${i+3} are shaded. What decimal fraction of the strip is shaded?`,(i+3)/10,'A tenth is one of ten equal parts.','Put the numerator in the tenths place.',`${i+3}/10 = ${(i+3)/10}.`);
add('Area',`A rectangular mosaic is ${m} tiles long and ${k} tiles wide. How many tiles cover it?`,m*k,'Area counts the squares inside.','Multiply length by width.',`${m} × ${k} = ${m*k} tiles.`);
add('Perimeter',`A rectangular pond is ${m+3} metres long and ${k+2} metres wide. How many metres around its edge?`,2*(m+k+5),'A rectangle has two lengths and two widths.','Add all four sides.',`2 × (${m+3} + ${k+2}) = ${2*(m+k+5)} metres.`);
add('Length conversion',`A ribbon measures ${x} metres and ${15+5*i} centimetres. How many centimetres is that altogether?`,x*100+15+5*i,'One metre is 100 centimetres.','Convert the metres, then add the extra centimetres.',`${x} × 100 + ${15+5*i} = ${x*100+15+5*i} centimetres.`);
add('Mass conversion',`A parcel weighs ${x} kilograms and ${125+100*i} grams. How many grams is that?`,x*1000+125+100*i,'One kilogram is 1,000 grams.','Convert the kilograms, then add the extra grams.',`${x} × 1000 + ${125+100*i} = ${x*1000+125+100*i} grams.`);
add('Number patterns',`What number is missing: ${a}, ${a+7}, □, ${a+21}?`,a+14,'Compare consecutive known terms.','The rule adds 7 each time.',`${a+7} + 7 = ${a+14}.`);
add('Multiplication',`${23+7*i} boats each carry ${k} passengers. How many passengers altogether?`,(23+7*i)*k,'Split the two-digit number into tens and ones.','Multiply both parts, then add.',`${23+7*i} × ${k} = ${(23+7*i)*k} passengers.`);
add('Two-step problems',`You have ${x} packs of ${m} seeds and plant ${i+5} seeds. How many seeds are left?`,x*m-i-5,'First find the seeds in all the packs.','Then subtract the seeds planted.',`${x} × ${m} − ${i+5} = ${x*m-i-5} seeds.`);
add('Time conversion',`A journey takes ${x} hours and ${10+5*i} minutes. How many minutes is that?`,x*60+10+5*i,'One hour is 60 minutes.','Convert the hours and add the remaining minutes.',`${x} × 60 + ${10+5*i} = ${x*60+10+5*i} minutes.`);
const cost=225+35*i;
add('Money',`You pay 500 cents for a notebook costing ${cost} cents. How many cents change should you get?`,500-cost,'Change is the amount paid minus the cost.','Subtract using place value.',`500 − ${cost} = ${500-cost} cents.`);
const c=125+13*i,e=240+17*i;
add('Adding decimals',`Two ropes are ${(c/100).toFixed(2)} m and ${(e/100).toFixed(2)} m long. What is their total length in metres?`,(c+e)/100,'Align the decimal points.','Add hundredths, tenths and whole metres.',`${(c/100).toFixed(2)} + ${(e/100).toFixed(2)} = ${((c+e)/100).toFixed(2)} metres.`);
add('Missing numbers',`Find the missing number: □ × ${m} = ${m*(x+5)}.`,x+5,'Multiplication and division undo each other.',`Divide ${m*(x+5)} by ${m}.`,`${m*(x+5)} ÷ ${m} = ${x+5}.`);
const value=1243+137*i,rounded=Math.round(value/100)*100;
add('Rounding',`Round ${value} to the nearest hundred.`,rounded,'Find the hundreds on either side.','Look at the tens digit: 5 or more rounds up.',`${value} rounds to ${rounded}.`);
}else{
const a=24+7*i,b=13+i,x=i+3,den=4*(i+2),p=10+5*i;
add('Multiplication',`A printer makes ${a} cards per minute for ${b} minutes. How many cards does it make?`,a*b,'Split one factor into tens and ones.','Multiply the parts and add the products.',`${a} × ${b} = ${a*b} cards.`);
add('Division',`A warehouse packs ${b*(a+5)} bottles into boxes of ${b}. How many boxes are filled?`,a+5,'Find how many equal groups fit.','Check by multiplying boxes by bottles per box.',`${b*(a+5)} ÷ ${b} = ${a+5} boxes.`);
add('Order of operations',`Evaluate (${a} − ${x}) × 3 + ${b}.`,(a-x)*3+b,'Calculate inside parentheses first.','Then multiply before adding.',`(${a} − ${x}) × 3 + ${b} = ${(a-x)*3+b}.`);
add('Negative numbers',`A submarine is at −${a} metres relative to sea level and descends ${b} metres. What is its new position in metres?`,-a-b,'Descending moves farther below zero.','Subtract the descent from the starting position.',`−${a} − ${b} = −${a+b} metres.`);
add('Adding fractions',`Add 1/4 and ${x}/${den}. Give your answer as a fraction.`,.25+x/den,'Use a common denominator.',`1/4 = ${den/4}/${den}.`,`${den/4}/${den} + ${x}/${den} = ${den/4+x}/${den}.`);
add('Subtracting fractions',`A tank is 3/4 full. You use ${x}/${den} of a full tank. What fraction remains?`,.75-x/den,'Use a common denominator.',`3/4 = ${3*den/4}/${den}.`,`${3*den/4}/${den} − ${x}/${den} = ${3*den/4-x}/${den}.`);
add('Fractions of quantities',`Of ${den*7} seedlings, ${x}/${den} are herbs. How many are herbs?`,x*7,'Find one equal fraction part.',`Divide ${den*7} by ${den}, then multiply by ${x}.`,`${den*7} ÷ ${den} × ${x} = ${x*7} herbs.`);
add('Multiplying fractions',`A garden covers ${x}/${x+2} of a plot. Half of the garden grows beans. What fraction of the plot grows beans?`,x/(2*(x+2)),'Find half of the garden fraction.','Multiply numerators and denominators.',`${x}/${x+2} × 1/2 = ${x}/${2*(x+2)}.`);
const cents=475+23*i,other=268+31*i;
add('Subtracting decimals',`A rope is ${(cents/100).toFixed(2)} metres long. Cut off ${(other/100).toFixed(2)} metres. How many metres remain?`,(cents-other)/100,'Line up the decimal points.','Subtract hundredths, tenths and ones, exchanging when necessary.',`${(cents/100).toFixed(2)} − ${(other/100).toFixed(2)} = ${((cents-other)/100).toFixed(2)} metres.`);
if(i<4){
const dec=35+5*i;
add('Comparing values',`Which is smaller: ${dec}% or 0.${dec+5}? Enter the smaller value as a percentage or decimal.`,dec/100,'Write both values as hundredths.',`0.${dec+5} is ${dec+5}%.`,`${dec}% is smaller than ${dec+5}%.`);
}else{
add('Subtracting decimals','A parcel has mass 8.25 kg before 2.68 kg is removed. What is its remaining mass in kilograms?',5.57,'Align the decimal points.','Exchange one tenth for ten hundredths.','8.25 − 2.68 = 5.57 kg.');
}
add('Adding decimals',`A hiker walks ${(cents/100).toFixed(2)} km, then ${(other/100).toFixed(2)} km. How many kilometres altogether?`,(cents+other)/100,'Align decimal points.','Add by place value, regrouping where needed.',`${(cents/100).toFixed(2)} + ${(other/100).toFixed(2)} = ${((cents+other)/100).toFixed(2)} km.`);
add('Multiplying decimals',`One bottle holds ${(1.35+.1*i).toFixed(2)} litres. How many litres do ${x} bottles hold?`,(135+10*i)*x/100,'Multiply as whole hundredths first.','Divide the result by 100 to get litres.',`${((135+10*i)/100).toFixed(2)} × ${x} = ${(135+10*i)*x/100} litres.`);
add('Percentages',`A class plants ${a*10} seeds. ${p}% sprout. How many seeds sprout?`,a*p/10,'Percent means out of 100.','Divide the total by 100 and multiply by the percentage.',`${a*10} × ${p}/100 = ${a*p/10} seeds.`);
add('Comparing values',`Which is greater: ${x}/${x+2} or 0.5? Enter the greater value as a fraction or decimal.`,x/(x+2),'Write 0.5 as one half.',`Half of ${x+2} is ${(x+2)/2}; compare that with ${x}.`,`${x}/${x+2} is greater than 1/2.`);
add('Ratios',`Red and yellow beads are in a ${x}:2 ratio. There are ${(x+2)*6} beads altogether. How many are red?`,x*6,'Add the ratio parts.',`Divide ${(x+2)*6} into ${x+2} parts, then take ${x} parts.`,`${(x+2)*6} ÷ ${x+2} × ${x} = ${x*6} red beads.`);
add('Unit rates',`A cyclist travels ${x*18} km in ${x} hours. At the same speed, how far in ${x+2} hours?`,18*(x+2),'Find the distance travelled in one hour.',`Divide ${x*18} by ${x}, then multiply by ${x+2}.`,`18 × ${x+2} = ${18*(x+2)} km.`);
add('One-step equations',`Solve x − ${b} = ${a}.`,a+b,'Undo subtraction with addition.',`Add ${b} to both sides.`,`x = ${a} + ${b} = ${a+b}.`);
add('Two-step equations',`Solve ${x}x + ${b} = ${x*8+b}.`,8,'Subtract the constant from both sides.',`Then divide both sides by ${x}.`,`x = (${x*8+b} − ${b}) ÷ ${x} = 8.`);
add('Sequences',`A sequence begins ${x}, ${x+6}, ${x+12}, ${x+18}. What is its 12th term?`,x+66,'The difference is 6.','From the first to the twelfth term there are 11 increases.',`${x} + 11 × 6 = ${x+66}.`);
add('Area and perimeter',`A rectangle has length ${a} m and width ${b} m. Enter its area, then its perimeter, separated by a comma.`,[a*b,2*(a+b)],'Area is length times width.','Perimeter is twice the sum of length and width.',`Area = ${a} × ${b} = ${a*b} m²; perimeter = 2 × (${a} + ${b}) = ${2*(a+b)} m.`);
add('Volume',`A box measures ${x} cm by ${x+2} cm by ${x+4} cm. What is its volume in cubic centimetres?`,x*(x+2)*(x+4),'Find the area of one rectangular layer.','Multiply by the number of layers.',`${x} × ${x+2} × ${x+4} = ${x*(x+2)*(x+4)} cm³.`);
const angle=35+7*i,angle2=55+3*i;
add('Angles',`Two angles in a triangle are ${angle}° and ${angle2}°. What is the remaining angle?`,180-angle-angle2,'The angles of a triangle total 180°.','Subtract both known angles from 180°.',`180 − ${angle} − ${angle2} = ${180-angle-angle2}°.`);
}
}
return bank;
}

const questionsByAge={'5-6':buildEarlyQuestions('5-6'),'7-8':buildEarlyQuestions('7-8'),'9-10':youngerQuestions,'11-12':olderQuestions};
AGE_LEVELS.forEach(level=>questionsByAge[level].push(...buildAdditionalQuestions(level)));
// IDs 0–99 retain their original destinations and saved progress.
locations.forEach((location,island)=>location.ids.push(...Array.from({length:20},(_,j)=>100+island*20+j)));

let questions=questionsByAge[ageLevel];

function switchAge(level){
if(!AGE_LEVELS.includes(level)||level===ageLevel)return;
if(voyage){toast('Choose your math level after the ferry arrives.');$('#ageLevel').value=ageLevel;return;}if(boating||swimming)returnBoat();save();adminMode=false;ageLevel=level;KEY=progressKey();currentProfile().age=level;
try{localStorage.setItem('skyseed-age',level);}catch{storageOK=false;}
cancelFlash();closeMapPanel();stopFishing();clearLochDragon();clearBlueMarlin();resetPetDragon();resetWatersports();resetSurfing();resetVolleyball();resetFrisbee();resetSunbathers();goggleToss=null;swimming=false;diveAnimation=null;shoreClimb=null;shoreRecovery=null;timberStep=null;beachTransfer=null;boatPosition={...BOAT_MOORING};resetBoatMotion();state=loadProgress();restoreParkedBoat();fishSet='classic';pendingCast=null;questions=questionsByAge[level];
player.x=Number.isFinite(state.x)?state.x:230;player.y=Number.isFinite(state.y)?state.y:176;
keys.clear();active=0;answerComplete=false;document.querySelectorAll('dialog[open]').forEach(d=>d.close());
update();toast(`Ages ${level.replace('-','–')} selected. Your adventure is ready!`);
}
function save(){if(qualifiesForSpeedboat(state))state.speedboat=true;state.speedboat=state.speedboat===true||currentProfile().speedboat===true;currentProfile().speedboat=state.speedboat;if(surfSession)state.surfBest=Math.max(state.surfBest||0,Math.floor(surfSession.score));state.anchor=state.anchor===true||currentProfile().anchor===true;currentProfile().anchor=state.anchor;if(typeof boatPosition!=="undefined"&&(state.boatIsland||state.beachAnchor||activeVessel==='ferry'&&state.ferryRemaining>0))state.parkedBoat={...boatPosition,heading:boatMotion.heading,vessel:activeVessel};currentProfile().power=state.power;state.ferryAboard=boating&&activeVessel==='ferry';if(state.ferryAboard)state.ferryPose={...boatPosition,heading:boatMotion.heading};state.x=typeof wakeboardCrash!=='undefined'&&wakeboardCrash?wakeboardCrash.safe.x:frisbeeGame?frisbeeGame.exit.x:surfSession?surfSession.safe.x:typeof frisbeeGame!=='undefined'&&frisbeeGame?frisbeeGame.exit.x:typeof volleyball!=='undefined'&&volleyball?volleyball.exit.x:beachTransfer?(beachTransfer.boarding?beachTransfer.from.x:beachTransfer.to.x):typeof wakeboardRide!=='undefined'&&wakeboardRide?wakeboardRide.safe.x:typeof dragonFlight!=='undefined'&&dragonFlight?dragonFlight.safe.x:typeof boating!=='undefined'&&(boating||swimming)?boatHomeDock().x:typeof voyage!=='undefined'&&voyage?voyage.from.x:player.x;state.y=typeof wakeboardCrash!=='undefined'&&wakeboardCrash?wakeboardCrash.safe.y:frisbeeGame?frisbeeGame.exit.y:surfSession?surfSession.safe.y:typeof frisbeeGame!=='undefined'&&frisbeeGame?frisbeeGame.exit.y:typeof volleyball!=='undefined'&&volleyball?volleyball.exit.y:beachTransfer?(beachTransfer.boarding?beachTransfer.from.y:beachTransfer.to.y):typeof wakeboardRide!=='undefined'&&wakeboardRide?wakeboardRide.safe.y:typeof dragonFlight!=='undefined'&&dragonFlight?dragonFlight.safe.y:typeof boating!=='undefined'&&(boating||swimming)?boatHomeDock().y-(boatHomeDock()===fishingDock?8:18):typeof voyage!=='undefined'&&voyage?voyage.from.y-18:player.y;try{localStorage.setItem(KEY,JSON.stringify(state));currentProfile().age=ageLevel;localStorage.setItem(PROFILE_KEY,JSON.stringify({active:profileId,profiles}));storageOK=true;}catch{storageOK=false;}$('#saveState').textContent=storageOK?'✓ Saved':'Session only';}
let toastTimer;function toast(msg){$('#toast').textContent=msg;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3500);}
let audio;function chime(){if(!state.sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();[523,659,784].forEach((f,i)=>{let o=audio.createOscillator(),g=audio.createGain();o.type='triangle';o.frequency.value=f;g.gain.setValueAtTime(.035,audio.currentTime+i*.1);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+i*.1+.4);o.connect(g).connect(audio.destination);o.start(audio.currentTime+i*.1);o.stop(audio.currentTime+i*.1+.4);});}catch{}}
function update(){updateSpeedboatUI();updateSurfUI();updateAnchorGear();updateWakeboardUI();updatePowerMeter();updateProfileUI();syncSquishies();updateFishing();$('#ferryStatus').textContent=state.ferryTicket?'One ride ready':state.ferryRemaining>0?'Ride in progress':'Ferry waiting · ticket 25 ◆';$('#ageLevel').value=ageLevel;save();updateSquishies();$('#crystals').textContent=state.crystals;$('#solvedCount').textContent=`${state.solved.length} / ${questions.length}`;$('#discoveryBar').style.width=state.solved.length/questions.length*100+'%';$('#discoveryGauge').setAttribute('aria-valuemax',questions.length);$('#discoveryGauge').setAttribute('aria-valuenow',state.solved.length);$('#restoreCount').textContent=state.upgrades.length+' / 3';$('#restoreBar').style.width=state.upgrades.length/3*100+'%';$('#upgrades').innerHTML=upgrades.map(u=>`<div class="upgrade"><span class="upgrade-icon">${u.icon}</span><div><h3>${u.name}</h3><small>${state.upgrades.includes(u.id)?'Restored. Looking lovely!':u.sub}</small></div><button data-upgrade="${u.id}" ${state.upgrades.includes(u.id)?'disabled':''}>${state.upgrades.includes(u.id)?'✓':u.cost+' ◆'}</button></div>`).join('');document.querySelectorAll('[data-upgrade]').forEach(b=>b.onclick=()=>buy(b.dataset.upgrade));$('#petBar').style.width=Math.min(100,state.solved.length/8*100)+'%';if(state.solved.length>=8){$('#eggArt').textContent='✿';$('#eggArt').classList.add('hatched');$('#petTitle').textContent='Meet Sprout!';$('#petText').textContent='Your little leaf friend follows you everywhere.';}else{$('#eggArt').textContent='◈';$('#eggArt').classList.remove('hatched');$('#petTitle').textContent='Someone’s in there…';$('#petText').textContent=`${state.solved.length} / 8 discoveries until your friend hatches.`;}$('#soundBtn').innerHTML=RAIL_SOUND_ICON+'<span>Sound '+(state.sound?'on':'off')+'</span><span class="submenu-arrow" aria-hidden="true">›</span>';$('#soundBtn').setAttribute('aria-label',state.sound?'Disable sound':'Enable sound');}
function buy(id){const u=upgrades.find(u=>u.id===id);if(state.upgrades.includes(id))return;if(state.crystals<u.cost){toast(`You need ${u.cost-state.crystals} more crystals. Visit a glowing marker to earn them!`);return;}state.crystals-=u.cost;state.upgrades.push(id);update();chime();toast(`${u.name} restored! ${id==='bridge'?'Crystal cavern is now open.':'Your island feels more like home.'}`);}
function visit(index){
if(beachTransfer||volleyball||frisbeeGame)return;
if(index===allIslands.indexOf(mainlandBeach)){toast('Mainland Beach is on the southern coast. Buy an anchor for 50 crystals, then anchor a boat near the beach.');return;}
if(wakeboardCrash||dragonFlight||wakeboardRide||volleyball||frisbeeGame){toast('Finish your current ride first.');return;}
if(index>=locations.length){visitBoatIsland(index-locations.length);return;}
if(voyage||shoreRecovery)return;stopFishing();if(boating||swimming)returnBoat();
const loc=locations[index];state.boatIsland=null;
if(index===4&&!onFinalIsland()){openFerry();return;}
player.x=loc.x;player.y=loc.y+48;save();const next=loc.ids.find(i=>!state.solved.includes(i));openQuestion(next??loc.ids[0]);
}

const RAIL_SOUND_ICON="<svg class=\"pixel-icon\" viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" aria-hidden=\"true\" focusable=\"false\" shape-rendering=\"crispEdges\"><path fill=\"#608376\" d=\"M3 9h5V6h3V3h3v18h-3v-3H8v-3H3z\"/><path fill=\"#b08c54\" d=\"M17 7h2v10h-2zM21 4h2v16h-2z\"/></svg>";
const RAIL_GROUPS=['explore','treasures','island','water','education','settings'];
let activeSubmenu=null;
function closeSubmenu(){for(const group of RAIL_GROUPS){$('#'+group+'Submenu').hidden=true;$('#'+group+'MenuBtn').setAttribute('aria-expanded','false');}activeSubmenu=null;}
function toggleSubmenu(group){if(!RAIL_GROUPS.includes(group))return;const wasOpen=activeSubmenu===group;closeMapPanel();keys.clear();if(wasOpen)return;activeSubmenu=group;$('#'+group+'Submenu').hidden=false;$('#'+group+'MenuBtn').setAttribute('aria-expanded','true');}
const MAP_PANELS=['settingsPanel','upgradesPanel','companionPanel','gearPanel','journal','stash','ferry','welcome','watersportsPanel','surfShackPanel'];
let activeMapPanel=null;
function closeMapPanel(id=activeMapPanel){closeSubmenu();if(!id)return;$('#'+id).hidden=true;if(activeMapPanel===id)activeMapPanel=null;for(const buttonId of ['settingsBtn','upgradesBtn','companionBtn','gearBtn','journalBtn','quickStashBtn','mapHelp','railFerryBtn','watersportsBtn'])$('#'+buttonId).setAttribute('aria-expanded','false');}
function openMapPanel(id){if(!MAP_PANELS.includes(id))return;closeMapPanel();keys.clear();activeMapPanel=id;$('#'+id).hidden=false;const trigger={settingsPanel:'settingsBtn',upgradesPanel:'upgradesBtn',companionPanel:'companionBtn',gearPanel:'gearBtn',journal:'journalBtn',stash:'quickStashBtn',welcome:'mapHelp',ferry:'railFerryBtn',watersportsPanel:'watersportsBtn'}[id];if(trigger)$('#'+trigger).setAttribute('aria-expanded','true');}
function toggleMapPanel(id){if(activeMapPanel===id)closeMapPanel();else openMapPanel(id);}
function closeSurface(id){if(MAP_PANELS.includes(id))closeMapPanel(id);else $('#'+id).close();}
function openTimesTables(){
closeMapPanel();keys.clear();
const numbers=Array.from({length:12},(_,i)=>i+1);
$('#timesTableGrid').innerHTML='<caption>Multiplication reference · 1 × 1 through 12 × 12</caption><thead><tr><th scope="col" aria-label="Multiply">×</th>'+numbers.map(n=>`<th scope="col">${n}</th>`).join('')+'</tr></thead><tbody>'+numbers.map(row=>`<tr><th scope="row">${row}</th>${numbers.map(col=>`<td>${row*col}</td>`).join('')}</tr>`).join('')+'</tbody>';
$('#timesTables').showModal();
}
$('#timesTablesBtn').onclick=openTimesTables;
let active=0,hintStep=0,work={},answerComplete=false;function openQuestion(i){closeMapPanel();answerComplete=false;active=i;hintStep=0;work={};const q=questions[i];$('#challengeCategory').textContent=`${locations.find(l=>l.ids.includes(i)).name} / ${q.skill}`;$('#challengeBody').innerHTML=`<h2>${q.title}</h2><p class="question">${q.q}</p><div class="tool"><div class="tool-title">Your explorer’s workbench · try it out</div><div id="workbench"></div></div><form class="answer-form" id="answerForm"><label class="sr-only" for="answer" style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)">Your answer</label><input id="answer" autocomplete="off" placeholder="${Array.isArray(q.answer)?'Area, perimeter':q.kind==='compare'?'Select a value above':['5-6','7-8'].includes(ageLevel)?'Your answer':'Your answer (fractions welcome)'}" required><button class="primary" type="submit">Check answer ↗</button></form><div id="feedback" class="feedback" aria-live="polite"></div><button id="hintBtn" class="text-button">A little hint?</button><div id="hint"></div>`;renderTool(q);$('#answerForm').onsubmit=e=>{e.preventDefault();checkAnswer();};$('#hintBtn').onclick=()=>{$('#hint').innerHTML=`<div class="hint-box">${q.hint[0]}</div>`;$('#hintBtn').disabled=true;$('#hintBtn').textContent='Hint shown';};if(!$('#challenge').open)$('#challenge').showModal();$('#answer').focus();}
function setAnswer(v){$('#answer').value=v;}
function renderTool(q){const w=$('#workbench');const button=(label,fn)=>{const b=document.createElement('button');b.className='tile';b.textContent=label;b.onclick=fn;return b;};
if(q.kind==='guided'){w.innerHTML=(q.visual?`<div class="math-picture">${escapeHTML(q.visual)}</div>`:'')+'<div class="visual-result">Work through the problem, then enter your answer below. Use a hint if you need a starting point.</div>';}
else if(q.kind==='fraction'){let selected=new Set(Array.from({length:q.initial},(_,i)=>i));w.innerHTML='<div class="fraction-grid"></div><p class="visual-result"></p>';const draw=()=>{w.querySelector('.visual-result').textContent=`${selected.size} of ${q.den} equal parts selected`;};for(let i=0;i<q.den;i++){const b=button(' ',()=>{selected.has(i)?selected.delete(i):selected.add(i);b.classList.toggle('selected',selected.has(i));draw();setAnswer(selected.size+'/'+q.den);});b.classList.toggle('selected',selected.has(i));b.setAttribute('aria-label','Toggle fraction piece '+(i+1));w.querySelector('.fraction-grid').append(b);}draw();}
else if(q.kind==='groups'){let n=0;w.innerHTML=`<p style="text-align:center;margin-top:0">${q.division?'Build equal shares until the total reaches 156.':`Build ${q.a} groups of ${q.b}.`}</p><div class="step-row" id="groupControls"></div><div class="visual-result" id="groupOutput"></div>`;const draw=()=>{$('#groupOutput').innerHTML=`${q.division?q.a+' creatures × '+n+' berries':n+' groups × '+q.b} = <strong>${+(n*(q.division?q.a:q.b)).toFixed(2)}</strong> ${q.unit}`;};$('#groupControls').append(button('−',()=>{n=Math.max(0,n-1);draw();}),button('+ '+(q.division?'berry per creature':'group'),()=>{n=Math.min(30,n+1);draw();}));draw();}
else if(q.kind==='line'||q.kind==='angle'||q.kind==='rate'||q.kind==='sequence'){const min=q.min??(q.kind==='sequence'?1:0),max=q.max??(q.kind==='angle'?180:q.kind==='rate'?6:10);w.innerHTML=`<input aria-label="${q.kind==='sequence'?'Day':q.kind==='rate'?'Hours':'Number line'}" type="range" min="${min}" max="${max}" value="${q.start??min}"><div class="visual-result"></div>`;const draw=()=>{let v=+w.querySelector('input').value;w.querySelector('.visual-result').textContent=q.kind==='sequence'?`Day ${v}: ${4*v+1} crystals (+4 each day)`:q.kind==='rate'?`${v} hours × 28 km/hour = ${v*28} km`:q.kind==='angle'?`48° + 67° + ${v}° = ${115+v}° (target: 180°)`:`${v}°C · moved ${v-q.start} steps from ${q.start}°C`;};w.querySelector('input').oninput=draw;draw();}
else if(q.kind==='balance'){w.innerHTML=`<div class="step-row">⚖ ${q.mult===1?'x':q.mult+'x'} + ${q.offset} = ${q.total}</div><div class="visual-result">Keep both sides equal as you work out the missing number.</div>`;}
else if(q.kind==='order'){w.innerHTML='<div class="step-row">8 + 3 × (12 − 7)</div><div class="visual-result">Start with parentheses, then multiplication, then addition.</div>';}

else if(q.kind==='partition'||q.kind==='ratio'){let chosen=new Set(),parts=q.parts??5;w.innerHTML='<div class="tiles"></div><div class="visual-result"></div>';const draw=()=>{w.querySelector('.visual-result').textContent=`${chosen.size} selected groups × 4 = ${chosen.size*4} ${q.kind==='ratio'?'berries':'eggs'}`;};for(let i=0;i<parts;i++){const b=button(q.kind==='ratio'?(i<2?'Red':'Blue'):'◈ ◈ ◈ ◈',()=>{chosen.has(i)?chosen.delete(i):chosen.add(i);b.classList.toggle('selected',chosen.has(i));draw();});w.querySelector('.tiles').append(b);}draw();}
else if(q.kind==='area'){let rows=new Set();w.innerHTML='<div id="areaGrid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px"></div><div class="visual-result">Select rows to shade the fruit-growing overlap.</div>';for(let r=0;r<4;r++)for(let c=0;c<3;c++){let b=button(c<2?'Garden':'Field',()=>{rows.has(r)?rows.delete(r):rows.add(r);w.querySelectorAll('[data-row]').forEach(el=>el.classList.toggle('selected',rows.has(+el.dataset.row)&&+el.dataset.col<2));w.querySelector('.visual-result').textContent=`${rows.size*2} of 12 cells overlap`;});b.dataset.row=r;b.dataset.col=c;if(c===2)b.style.opacity='.45';w.querySelector('#areaGrid').append(b);}}
else if(q.kind==='compare'){w.innerHTML='<div class="tiles"></div><div class="visual-result">Choose a value to compare on a 0–100 scale.</div>';[['3/5',60],['0.58',58],['62%',62]].forEach(([label,v])=>{let b=button(label,()=>{w.querySelectorAll('button').forEach(b=>b.classList.remove('selected'));b.classList.add('selected');w.querySelector('.visual-result').textContent=`${label} = ${v}/100`;setAnswer(label);});w.querySelector('.tiles').append(b);});}
else if(q.kind==='percent'){let removed=false;const draw=()=>{w.innerHTML='<div class="tiles"></div><div class="visual-result"></div>';for(let i=0;i<4;i++){const b=button(removed&&i===3?'Discount':'20 ◆',()=>{removed=!removed;draw();});if(removed&&i===3)b.style.opacity='.35';w.querySelector('.tiles').append(b);}w.querySelector('.visual-result').textContent=removed?'Pay for 3 quarters: 20 + 20 + 20':'Each quarter is 25% of the original 80 crystals. Tap to remove one.';};draw();}
else if(q.kind==='rectangle'||q.kind==='volume'){let layers=1;const draw=()=>{w.innerHTML=`<div style="display:grid;grid-template-columns:repeat(${q.kind==='rectangle'?9:5},1fr);gap:3px;max-width:330px;margin:auto">${Array.from({length:q.kind==='rectangle'?54:15},()=>'<span style="height:15px;background:#8da976;border:1px solid #6b8d56"></span>').join('')}</div><div class="visual-result">${q.kind==='rectangle'?'9 columns × 6 rows · trace four sides: 9 + 6 + 9 + 6':`Layer ${layers} of 2 · ${layers} × 15 unit cubes`}</div><div class="tiles" style="margin-top:10px"></div>`;w.querySelector('.tiles').append(button(q.kind==='rectangle'?'Trace the boundary':'Add / remove a layer',()=>{if(q.kind==='rectangle'){w.firstElementChild.style.outline='3px solid #b18049';}else{layers=layers===1?2:1;draw();}}));};draw();}
else if(q.kind==='decimal'){w.innerHTML='<div class="step-row" style="font-family:monospace;white-space:pre">  3.75\n+ 2.60\n──────</div><div class="tiles" style="margin-top:12px"></div><div class="visual-result">Select a place value to work through the addition.</div>';[['Hundredths','5 + 0 = 5 hundredths'],['Tenths','7 + 6 = 13 tenths. Regroup 10 tenths as 1 whole.'],['Ones','3 + 2 + 1 carried = 6 ones']].forEach(([label,text])=>w.querySelector('.tiles').append(button(label,()=>w.querySelector('.visual-result').textContent=text)));}}
function parseNumber(s){s=s.trim().replaceAll('−','-');if(s.endsWith('%'))return Number(s.slice(0,-1))/100;if(/^[-+]?\d+(\.\d+)?\s*\/\s*\d+(\.\d+)?$/.test(s)){const [a,b]=s.split('/').map(Number);return b?a/b:NaN;}return s===''?NaN:Number(s);}
function animateCrystalReward(total){
const counter=$('#rewardTotal');
const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
counter.textContent=reduced?total:total-5;
if(reduced)return;
for(let i=1;i<=5;i++)setTimeout(()=>{
// A new question or closed dialog must never receive a stale animation update.
if($('#rewardTotal')!==counter||!$('#challenge').open)return;
counter.textContent=total-5+i;
},400+(i-1)*180);
}
function checkAnswer(){if(answerComplete)return;const q=questions[active],raw=$('#answer').value;let correct;if(Array.isArray(q.answer)){const a=raw.split(/[,;]/).map(parseNumber);correct=a.length===2&&a.every((n,i)=>Math.abs(n-q.answer[i])<.00001);}else correct=Math.abs(parseNumber(raw)-q.answer)<.00001;if(!correct){$('#feedback').className='feedback error';$('#feedback').textContent='Keep exploring! Adjust your workbench or ask for a hint, then try again.';return;}answerComplete=true;restorePower();const first=!state.solved.includes(active),rewarded=first||state.solved.length===questions.length,previousSquishies=earnedSquishies();if(first)state.solved.push(active);if(rewarded){state.crystals+=5;state.earnedCrystals+=5;}const unlocked=earnedSquishies()>previousSquishies?squishies[previousSquishies]:null;update();chime();const loc=locations.find(l=>l.ids.includes(active));
const next=loc.ids.find(i=>!state.solved.includes(i))??loc.ids[(loc.ids.indexOf(active)+1)%loc.ids.length];
$('#challengeBody').innerHTML=`<div class="celebration discovery-result">
<h2>${first?'Discovery made!':'Practice complete!'}</h2>
<p class="discovery-answer">${q.explain}</p>
${rewarded?`<div class="crystal-reward" role="status" aria-label="5 crystals collected. Your total is ${state.crystals} crystals."><div class="crystal-shower" aria-hidden="true">${Array.from({length:5},(_,i)=>`<span class="reward-crystal" style="--i:${i}">◆</span>`).join('')}</div><div class="reward-balance" aria-hidden="true"><b class="reward-gain">+5 crystals</b><span class="reward-total">Total <strong id="rewardTotal">${state.crystals-5}</strong></span></div></div>`:'<p class="practice-note">Already discovered · keep practicing!</p>'}
${unlocked?`<div class="squishy-unlock" role="status">${squishyArt(unlocked)}<div class="eyebrow">NEW SQUISHY · ${earnedSquishies()*50} CRYSTALS EARNED</div><h3>${unlocked.name}</h3>${unlocked.detail?`<p>${unlocked.detail}</p>`:""}<p>Tucked safely into your secret stash!</p></div>`:""}
${state.solved.length===8&&first?'<div class="completion">Your egg hatched! Sprout will now follow you around the island.</div>':''}
${state.solved.length===questions.length?`<div class="completion">All ${questions.length} discoveries made! Your journal is full of new ideas. Revisit any challenge to earn 5 more crystals!</div>`:''}
<div class="discovery-actions"><button class="primary" id="nextQuestion" aria-keyshortcuts="Enter"><span>Next discovery</span><kbd>Enter</kbd></button><button id="backIsland" aria-keyshortcuts="Escape"><span>Keep exploring</span><kbd>Esc</kbd></button></div>
</div>`;
if(rewarded)animateCrystalReward(state.crystals);
$('#nextQuestion').onclick=()=>openQuestion(next);
$('#backIsland').onclick=()=>$('#challenge').close();
$('#challenge').onkeydown=e=>{
if(!answerComplete||!$('#challenge').open||e.altKey||e.ctrlKey||e.metaKey)return;
if(e.key==='Escape'){e.preventDefault();if(!e.repeat)$('#backIsland').onclick();}
else if(e.key==='Enter'&&(!e.target?.tagName||e.target.tagName!=='BUTTON'||e.target.id==='nextQuestion')){e.preventDefault();if(!e.repeat)$('#nextQuestion').onclick();}
};
$('#nextQuestion').focus();
}
function journal(){ $('#journalList').innerHTML=locations.map((l,i)=>`<button class="journal-row" data-location="${i}"><span style="font-size:24px">${l.icon}</span><span><strong>${l.name}</strong><small>${l.ids.map(n=>questions[n].skill).slice(0,2).join(' · ')}</small></span><span class="badge">${l.ids.filter(n=>state.solved.includes(n)).length} / ${l.ids.length} ↗</span></button>`).join('');document.querySelectorAll('[data-location]').forEach(b=>b.onclick=()=>{closeMapPanel('journal');visit(+b.dataset.location);});$('#journalList').innerHTML+=boatIslands.map((l,i)=>`<button class="journal-row" data-boat-island="${i}"><span style="font-size:24px">⚓</span><span><strong>${l.name}</strong><small>${state.boatIslandsVisited.includes(l.id)?'Visited by boat · practice ashore':'Boat only · find the dock in the outer sea'}</small></span></button>`).join('');document.querySelectorAll('[data-boat-island]').forEach(b=>b.onclick=()=>visitBoatIsland(+b.dataset.boatIsland));$('#journalList').innerHTML+='<button class="journal-row" id="beachJournal"><span style="font-size:24px">☀</span><span><strong>Mainland Beach</strong><small>Southern coast · umbrellas, sunbathing & volleyball · anchor 50 crystals</small></span></button>';$('#beachJournal').onclick=()=>{closeMapPanel();openMapPanel('gearPanel');toast('Sail to the southern coast, then press Q near the beach to anchor and go ashore.');};openMapPanel('journal');}
$('#profileSelect').onchange=e=>switchProfile(e.target.value);$('#saveProfile').onclick=editProfile;$('#createProfile').onclick=createProfile;$('#characterChoice').onchange=()=>renderCharacterPreview($('#characterChoice').value);
$('#startFlash').onclick=startFlash;$('#tradeGive').onchange=updateTradeOptions;$('#tradeSubmit').onclick=tradeSquishy;$('#flash').addEventListener('close',cancelFlash);$('#flash').addEventListener('cancel',cancelFlash);
$('#fishingLaunchBoat').onclick=launchBoat;$('#gearLaunchSpeedboat').onclick=launchSpeedboat;$('#boatBtn').onclick=()=>boating?returnBoat():sponsored()?launchBoat():launchSpeedboat();$('#boatFishBtn').onclick=openFishing;$('#settingsBtn').onclick=()=>toggleMapPanel('settingsPanel');$('#upgradesBtn').onclick=()=>toggleMapPanel('upgradesPanel');$('#companionBtn').onclick=()=>toggleMapPanel('companionPanel');$('#gearBtn').onclick=()=>toggleMapPanel('gearPanel');$('#railFishingBtn').onclick=()=>{closeMapPanel();openFishing();};$('#railFerryBtn').onclick=openFerry;$('#quickStashBtn').onclick=()=>$('#stashBtn').onclick();$('#mapBoatFish').onclick=openFishing;$('#mapBoatReturn').onclick=returnBoat;$('#mapBoatTrim').onclick=()=>{cycleBoatTrim();canvas.focus({preventScroll:true});};$('#mapBoatExit').onclick=exitBoat;$('#mapDive').onclick=diveFromIsland;$('#mapSharkExit').onclick=dismountShark;$('#mapBoatBoard').onclick=boardOwnBoat;$('#stopFishing').onclick=stopFishing;$('#fishingBtn').onclick=openFishing;$('#buyRod').onclick=buyRod;$('#buyLure').onclick=buyLure;$('#fishSet').onchange=e=>{if(e.target.value==='lure'&&!state.fishingLure)return;fishSet=e.target.value;pendingCast=null;updateFishing();};$('#ferryBtn').onclick=()=>openFerry();$('#buyTicket').onclick=confirmFerryBoarding;$('#boardFerry').onclick=confirmFerryBoarding;$('#ageLevel').onchange=e=>{switchAge(e.target.value);openMapPanel('settingsPanel');};$('#stashBtn').onclick=()=>{updateSquishies();openMapPanel('stash');};$('#journalBtn').onclick=journal;$('#exploreBtn').onclick=()=>{const next=locations.findIndex((l,i)=>l.ids.some(n=>!state.solved.includes(n)));if(next<0){journal();return;}visit(next);};$('#soundBtn').onclick=()=>{state.sound=!state.sound;update();chime();};$('#mapHelp').onclick=()=>openMapPanel('welcome');document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closeSurface(b.dataset.close));$('#resetBtn').onclick=()=>{keys.clear();$('#resetConfirm').showModal();$('#cancelReset').focus();};$('#cancelReset').onclick=()=>$('#resetConfirm').close();$('#confirmReset').onclick=()=>{if(!$('#resetConfirm').open)return;$('#resetConfirm').close();adminMode=false;cancelFlash();stopFishing();clearLochDragon();clearBlueMarlin();resetPetDragon();resetWatersports();resetSurfing();resetVolleyball();resetFrisbee();resetSunbathers();goggleToss=null;state={...defaults,power:currentProfile().power,speedboat:currentProfile().speedboat===true,anchor:currentProfile().anchor===true,boatIslandsVisited:[],ferryTicket:false,solved:[],upgrades:[],catches:{}};fishSet='classic';pendingCast=null;boating=false;swimming=false;diveAnimation=null;shoreClimb=null;shoreRecovery=null;timberStep=null;beachTransfer=null;restoreParkedBoat();player.x=230;player.y=176;update();closeMapPanel('journal');toast('A fresh island adventure awaits.');};document.querySelectorAll('dialog').forEach(d=>d.addEventListener('close',()=>{keys.clear();canvas.focus({preventScroll:true});}));
// Tiny original pixel-art world. All art is drawn locally; no image assets required.
const canvas=$('#world'),ctx=canvas.getContext('2d');ctx.scale(2,2);ctx.imageSmoothingEnabled=false;let frame=0,near=-1;const keys=new Set();
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h);}function ellipse(x,y,rx,ry,c){ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(Math.round(x),Math.round(y),rx,ry,0,0,Math.PI*2);ctx.fill();}
const mainPoly=[[50,139],[61,117],[74,116],[74,92],[99,80],[128,72],[151,77],[167,67],[197,70],[215,83],[246,79],[265,90],[282,92],[294,109],[318,111],[330,132],[346,141],[343,168],[357,182],[346,205],[329,211],[323,232],[297,239],[283,250],[250,251],[235,260],[206,256],[193,249],[166,251],[149,242],[125,243],[113,227],[86,223],[83,204],[64,198],[62,175],[48,163]];
const cavePoly=[[359,72],[374,58],[406,57],[425,71],[439,83],[436,112],[447,125],[431,145],[401,149],[380,135],[356,126],[350,101]];
function polygon(points,c,dy=0){ctx.fillStyle=c;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y+dy):ctx.moveTo(x,y+dy));ctx.closePath();ctx.fill();}
function inside(x,y,poly){let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){let a=poly[i],b=poly[j];if((a[1]>y)!=(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;}
function tree(x,y,s=1){if(!drawBurningTree(x,y))drawTreeSprite(x,y,s);}
function drawTreeSprite(x,y,s=1){ellipse(x,y+12*s,13*s,5*s,'#4b84524a');rect(x-2*s,y-5*s,5*s,18*s,'#806346');rect(x-3*s,y+6*s,3*s,6*s,'#a38551');rect(x-13*s,y-13*s,26*s,14*s,'#346a45');rect(x-10*s,y-23*s,20*s,26*s,'#427c49');rect(x-6*s,y-28*s,12*s,31*s,'#4a8951');rect(x-10*s,y-19*s,10*s,4*s,'#6b9c59');rect(x+3*s,y-10*s,7*s,5*s,'#376d43');rect(x-8*s,y+1*s,18*s,4*s,'#356c44');}
function pine(x,y){if(!drawBurningTree(x,y))drawPineSprite(x,y);}
function drawPineSprite(x,y){rect(x-2,y,4,13,'#87684b');for(let i=0;i<3;i++){let w=18-i*4;rect(x-w/2,y-i*8,w,7,'#396c50');rect(x-w/2+3,y-i*8-4,w-6,5,'#52845a');}}
function drawPalmSprite(x,y){
rect(x-1,y-1,3,19,'#94704c');
for(const direction of [-1,1]){polygon([[x,y],[x+direction*18,y-4],[x+direction*10,y+5]],'#4c865e');polygon([[x,y],[x+direction*10,y-13],[x+direction*3,y-4]],'#66965d');}
}
function crystal(x,y,c='#b8a2d8'){polygon([[x,y-10],[x+5,y-4],[x+4,y+4],[x,y+8],[x-4,y+3],[x-5,y-4]],c);rect(x-2,y-5,2,7,'#ece0f1');}
function house(){let built=state.upgrades.includes('cottage');rect(188,126,56,32,'#7f925d44');rect(190,113,49,34,built?'#ecd7a5':'#b5a784');rect(194,119,41,26,built?'#f2e0b5':'#c1b392');polygon([[183,115],[214,88],[246,115]],built?'#b96e50':'#8d7861');for(let i=0;i<4;i++)rect(190+i*5,110-i*5,47-i*10,3,built?'#d18b5e':'#a08b6c');rect(209,127,11,20,'#685f43');rect(211,130,7,17,'#806846');rect(218,137,2,2,'#ebc581');rect(195,123,9,10,built?'#9fc7ba':'#786f56');rect(224,123,9,10,built?'#9fc7ba':'#786f56');if(built){rect(231,93,6,15,'#a45d48');rect(230,91,8,3,'#784d41');ellipse(236,83-Math.sin(frame/50)*3,4,3,'#fcf4db99');rect(195,134,9,3,'#729055');rect(224,134,9,3,'#729055');}else{rect(194,126,12,3,'#a18761');rect(225,123,3,14,'#9b8566');}}
function faceMovement(dx,dy){
if(!dx&&!dy)return;
// Keep the current axis for equal diagonal input so the view stays steady.
if(Math.abs(dx)===Math.abs(dy)){
if(player.facing==='left'||player.facing==='right')player.facing=dx<0?'left':'right';
else player.facing=dy<0?'up':'down';
}else player.facing=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');
}
const WALK_STRIDE=40;
let walkMotion={phase:0,moving:false,x:player.x,y:player.y};
function recordWalkingMovement(from){
const distance=Math.hypot(player.x-from.x,player.y-from.y);
walkMotion.moving=distance>.001&&!swimming&&!boating&&!dragonFlight&&!wakeboardRide&&!surfSession;
if(walkMotion.moving)walkMotion.phase=(walkMotion.phase+distance/WALK_STRIDE*Math.PI*2)%(Math.PI*2);
walkMotion.x=player.x;walkMotion.y=player.y;
}
function walkingStep(){
if(!walkMotion.moving||swimming||boating||dragonFlight||wakeboardRide||surfSession||shoreClimb||shoreRecovery||beachTransfer||volleyball?.phase==='finished'||document.querySelector('dialog[open]'))return 0;
// Teleports and render calls do not count as footsteps.
if(Math.hypot(player.x-walkMotion.x,player.y-walkMotion.y)>.001)return 0;
return Math.sin(walkMotion.phase)*1.5;
}
function character(x,y,pet=false,stepLift=0){
const step=walkingStep();ellipse(x,y+3,6,2,'#325c4144');
if(pet){rect(x-5,y-5,10,7,'#a8c76b');rect(x-3,y-8,7,5,'#bbd880');rect(x-2,y-3,1,1,'#2f5141');rect(x+3,y-3,1,1,'#2f5141');rect(x,y-11,2,4,'#4b7951');rect(x+1,y-12,5,2,'#739e58');return;}
const colors=characterColors(),facing=player.facing||'down',girl=currentProfile().character==='girl';
ctx.save();ctx.translate(x,y);
if(facing==='left'||facing==='right'){
ctx.scale(facing==='left'?-1:1,1);
rect(-3-step,-2-stepLift,3,5,'#3e5555');rect(1+step,-3,3,5,'#3e5555');
rect(-4,-11,8,11,colors.shirt);rect(1,-10,3,5,colors.accent);
if(girl)rect(-6,-19,4,13,colors.hair);
rect(-3,-20,7,9,'#f2c992');rect(3,-16,3,3,'#f2c992');
rect(-4,-21,8,4,colors.hair);rect(-4,-19,2,7,colors.hair);

rect(2,-17,1,2,'#354744');rect(-1+step,-9,3,8,'#e4bd88');
}else{
rect(-4,-2+step-stepLift,3,4,'#3e5555');rect(2,-2-step,3,4,'#3e5555');
rect(-5,-11,11,11,colors.shirt);
if(facing==='down')rect(-4,-10,8,5,colors.accent);
else{rect(-4,-10,8,2,colors.accent);rect(0,-7,1,6,colors.accent);}
rect(-7,-10+step,2,7,'#e4bd88');rect(6,-10-step,2,7,'#e4bd88');
rect(-4,-20,9,9,facing==='up'?colors.hair:'#f2c992');rect(-5,-21,11,4,colors.hair);
if(girl){if(facing==='up')rect(-5,-19,11,10,colors.hair);else rect(-8,-18,4,12,colors.hair);}

if(facing==='down'){rect(-2,-16,1,2,'#354744');rect(2,-16,1,2,'#354744');}
}
ctx.restore();
}
// Fishing shares the main animation loop; only an open dock advances its clock.
const fishingDock=FISHING_DOCK;
const fishSpecies=[
{id:'bass',name:'Bass',icon:'🐟',color:'#799765',gas:[2,5]},
{id:'salmon',name:'Salmon',icon:'🐟',color:'#d58c87',gas:[2,5]},
{id:'catfish',name:'Catfish',icon:'🐟',color:'#8e9183',gas:[2,5]},
{id:'snook',name:'Snook',icon:'🐟',color:'#c9db91',gas:[5,10]},
{id:'redfish',name:'Redfish',icon:'🐟',color:'#c38c67',gas:[5,10]},
{id:'trout',name:'Trout',icon:'🐟',color:'#b5b69a',gas:[5,10]},
{id:'tarpon',name:'Tarpon',icon:'🐟',color:'#c4d9d4',gas:[10,15]},
{id:'wahoo',name:'Wahoo',icon:'🐟',color:'#6da9b9',gas:[10,15]},
{id:'kingfish',name:'Kingfish',icon:'🐟',color:'#98b3b5',gas:[10,15]},
{id:'tuna',name:'Tuna',icon:'🐟',color:'#668eaf',gas:[10,15]},
{id:'octopus',name:'Blue-ringed Octopus',icon:'🐙',color:'#e7bc79',gas:[10,15]},
{id:'shark',name:'Shark',icon:'🦈',color:'#97b7ce',gas:[10,15]}
];
// The shallow boundary matches the start of the dark ocean gradient.
function deepWater(x,y){return x<WORLD.left+WORLD.width*.14||x>WORLD.left+WORLD.width*.86;}
function fishingTier(){return boating?(activeVessel==='speedboat'&&deepWater(player.x,player.y)?3:2):fishSet==='lure'?1:0;}
const FISH_CAST_DURATION=900;
let fishingSplash=null;
let fishingActive=false,fishingZone={x:30,y:270},fishSet='classic',fishingTime=0,pendingCast=null,fishingAim={x:320,y:260},lastCatch=null;
let hookedFish=null;
function fishingTargets(time=fishingTime){
return [0,1,2].map(lane=>{
const phase=time*(.0003+lane*.000025)+lane*2,period=6800+lane*1100,cycle=(time+lane*2100)%period;
const surface=cycle<1700?Math.sin(cycle/1700*Math.PI):0,nearSurface=cycle<2500;
return {...fishSpecies[fishingTier()*3+lane],x:fishingZone.x+80+62*Math.sin(phase),y:fishingZone.y+[12,48,84][lane]+Math.sin(phase*1.7)*3,radius:[14,12,11][lane],direction:Math.cos(phase)>=0?1:-1,tail:Math.sin(time*.009+lane*2),surface,nearSurface};
});
}

const FISHING_SPONSOR='Skyseed Angling Co.';
let boating=false,swimming=false,diveAnimation=null,shoreClimb=null,shoreRecovery=null,timberStep=null,beachTransfer=null,boatPosition=state.parkedBoat?{x:state.parkedBoat.x,y:state.parkedBoat.y}:{...BOAT_MOORING};
let sharkFins=[],nextSharkFin=800+Math.random()*1400;
const SHARK_RIDE_SPEED=.095,SHARK_TURN_RATE=1.8,SHARK_LATCH_DISTANCE=22;
let sharkRide=null,sharkWake=[],sharkLatchCooldown=0;
const FRISBEE_HOSTS=[0,3,5],FRISBEE_COLORS=['#e7b557','#de8d69','#86b9b5'];
let frisbeeGame=null;
function resetFrisbee(){frisbeeGame=null;}
function frisbeeHost(index){return {index,x:240+index*520+Math.sin(frame*.007+index)*15,y:1721,color:FRISBEE_COLORS[FRISBEE_HOSTS.indexOf(index)]};}
function nearbyFrisbeeHost(){
if(frisbeeGame||surfSession||volleyball||boating||swimming||voyage||dragonFlight||wakeboardRide||beachTransfer||shoreRecovery||fishingActive||!onMainlandBeach()||document.querySelector('dialog[open]'))return -1;
return FRISBEE_HOSTS.find(index=>{const p=frisbeeHost(index);return Math.hypot(player.x-p.x,player.y-p.y)<=46;})??-1;
}
function startFrisbee(index=nearbyFrisbeeHost()){
if(index<0||nearbyFrisbeeHost()!==index)return;
const host=frisbeeHost(index),exit={x:player.x,y:player.y};
stopFishing();closeMapPanel();keys.clear();goggleToss=null;timberStep=null;
player.x=host.x-84;player.y=host.y+40;player.facing='right';
frisbeeGame={hostIndex:index,partner:host,exit,phase:'partnerWait',elapsed:0,disc:null,catchWindow:0,catches:0,streak:0,best:0,throwPose:0,message:'Your friend throws first! Move to the landing ring and press X to catch.'};
walkMotion.moving=false;save();updateWaterControls();canvas.focus({preventScroll:true});
}
function leaveFrisbee(){
if(!frisbeeGame)return;
const exit=frisbeeGame.exit;frisbeeGame=null;player.x=exit.x;player.y=exit.y;keys.clear();walkMotion.moving=false;save();updateWaterControls();canvas.focus({preventScroll:true});
}
function frisbeePlayerPoint(x,y){
const host=frisbeeGame.partner;
x=Math.max(host.x-140,Math.min(host.x+32,x));y=Math.max(beachShoreY(x)+8,Math.min(WORLD.height-8,Math.max(1710,y)));
return {x,y};
}
function moveFrisbeePlayer(dx,dy){
const from={x:player.x,y:player.y},to=frisbeePlayerPoint(player.x+dx,player.y+dy);
player.x=to.x;player.y=to.y;faceMovement(dx,dy);recordWalkingMovement(from);
}
function throwFrisbee(fromPartner){
const game=frisbeeGame,from=fromPartner?game.partner:player;
const to=fromPartner?frisbeePlayerPoint(player.x+(Math.random()-.5)*24,player.y+(Math.random()-.5)*16):{x:game.partner.x,y:game.partner.y};
game.disc={from:{x:from.x,y:from.y},to,elapsed:0,duration:Math.max(750,Math.min(1500,Math.hypot(to.x-from.x,to.y-from.y)/.095)),fromPartner};
game.phase=fromPartner?'incoming':'outgoing';game.elapsed=0;game.catchWindow=0;game.throwPose=220;
game.message=fromPartner?'Here it comes! Move to the ring and press X as it reaches you.':'Nice throw! Your beach friend is catching it.';
}
function frisbeeDiscPose(disc){
const t=Math.min(1,disc.elapsed/disc.duration),dx=disc.to.x-disc.from.x,dy=disc.to.y-disc.from.y,length=Math.hypot(dx,dy)||1,curve=Math.sin(t*Math.PI)*6;
return {x:disc.from.x+dx*t-dy/length*curve,y:disc.from.y+dy*t+dx/length*curve,height:Math.max(0,10+Math.sin(t*Math.PI)*9-Math.max(0,disc.elapsed-disc.duration)*.045),t};
}
function canCatchFrisbee(){
const game=frisbeeGame;if(game?.phase!=='incoming'||!game.disc)return false;
const disc=frisbeeDiscPose(game.disc);
return disc.t>=.65&&disc.height>2&&Math.hypot(disc.x-player.x,disc.y-player.y)<=22;
}
function catchFrisbee(){
const game=frisbeeGame;game.catches++;game.streak++;game.best=Math.max(game.best,game.streak);game.phase='holding';game.disc=null;game.catchWindow=0;game.throwPose=180;
game.message='Caught it! Press X to throw it back.';
}
function frisbeeAction(){
if(!frisbeeGame){startFrisbee();return;}
if(document.querySelector('dialog[open]'))return;
const game=frisbeeGame;canvas.focus({preventScroll:true});
if(game.phase==='holding')throwFrisbee(false);
else if(game.phase==='incoming'){
game.catchWindow=320;if(canCatchFrisbee())catchFrisbee();
else game.message='Move to the ring and press X as the frisbee reaches you.';
}else if(game.phase==='missed'){
const p=frisbeeDiscPose(game.disc);
if(Math.hypot(p.x-player.x,p.y-player.y)<=28){game.phase='holding';game.disc=null;game.message='Got it! Press X to throw it back.';}
else game.message='Walk up to the frisbee and press X to pick it up.';
}
updateFrisbeeUI();
}
function advanceFrisbee(dt){
if(!frisbeeGame||dt<=0||document.querySelector('dialog[open]'))return;
for(let remaining=dt;remaining>0;){
const step=Math.min(16,remaining);remaining-=step;const game=frisbeeGame;
game.elapsed+=step;game.catchWindow=Math.max(0,game.catchWindow-step);game.throwPose=Math.max(0,game.throwPose-step);
if(game.phase==='partnerWait'){if(game.elapsed>=650)throwFrisbee(true);continue;}
if(!game.disc||game.phase==='missed')continue;
game.disc.elapsed+=step;
if(game.phase==='outgoing'&&game.disc.elapsed>=game.disc.duration){game.phase='partnerWait';game.elapsed=0;game.disc=null;game.message='Your friend caught it. Get ready for the return!';continue;}
if(game.phase==='incoming'){
if(game.catchWindow>0&&canCatchFrisbee()){catchFrisbee();continue;}
if(game.disc.elapsed>=game.disc.duration+250){game.phase='missed';game.streak=0;game.message='Missed! Walk to the frisbee and press X to pick it up.';game.catchWindow=0;}
}
}
updateFrisbeeUI();
}
function updateFrisbeeUI(){
const nearby=nearbyFrisbeeHost();$('#mapFrisbeeAction').hidden=!frisbeeGame&&nearby<0;$('#mapFrisbeeLeave').hidden=!frisbeeGame;$('#frisbeeHud').hidden=!frisbeeGame;
$('#waterControls').hidden=!!(volleyball||frisbeeGame);
setSuggestionContent($('#mapFrisbeeAction'),!frisbeeGame?'Play frisbee · X ↗':frisbeeGame.phase==='holding'?'Throw frisbee · X ↗':frisbeeGame.phase==='missed'?'Pick up frisbee · X ↗':'Catch frisbee · X ↗');
$('#mapFrisbeeAction').disabled=!!frisbeeGame&&['partnerWait','outgoing'].includes(frisbeeGame.phase);
if(!frisbeeGame)return;
const score=`Catch streak: ${frisbeeGame.streak} · Best: ${frisbeeGame.best}`;
if($('#frisbeeScore').textContent!==score)$('#frisbeeScore').textContent=score;
if($('#frisbeeStatus').textContent!==frisbeeGame.message)$('#frisbeeStatus').textContent=frisbeeGame.message;
}
function drawFrisbeeDisc(x,y,color,spin=0){
ellipse(x,y,5,1.9,color);ctx.strokeStyle='#fff0c6';ctx.lineWidth=.65;ctx.beginPath();ctx.ellipse(x,y,3.7,1.3,0,spin,spin+Math.PI);ctx.stroke();ellipse(x,y,.8,.5,'#f7dfaa');
}
function drawFrisbeeGame(){
if(!frisbeeGame)return;
const game=frisbeeGame,p=game.partner;
beachPerson(p.x,p.y,'#9dad79',p.index%2?'#c9916c':'#efc897',game.throwPose/220);character(player.x,player.y);
if(game.phase==='holding'){
drawFrisbeeDisc(player.x+(player.facing==='left'?-8:8),player.y-10,p.color,game.elapsed*.012);
}else if(game.phase==='partnerWait')drawFrisbeeDisc(p.x-7,p.y-10,p.color,game.elapsed*.012);
if(game.throwPose>0){ctx.strokeStyle='#e4bd88';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(player.x+4,player.y-11);ctx.lineTo(player.x+10,player.y-13);ctx.stroke();}
if(game.disc){
const disc=frisbeeDiscPose(game.disc);
if(game.disc.fromPartner){ctx.save();ctx.globalAlpha=.55;ctx.strokeStyle='#fff2c8';ctx.lineWidth=.8;ctx.beginPath();ctx.ellipse(game.disc.to.x,game.disc.to.y,8,3,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
ellipse(disc.x+1,disc.y+2,4,1.2,'#9f895b44');drawFrisbeeDisc(disc.x,disc.y-disc.height,p.color,game.disc.elapsed*.025);
}
}
$('#mapFrisbeeAction').onclick=frisbeeAction;$('#mapFrisbeeLeave').onclick=leaveFrisbee;
const VOLLEYBALL_COURTS=[480,1530,2580].map(x=>({x,y:1722,w:144,h:64}));
let volleyball=null;
function resetVolleyball(){volleyball=null;volleySprayReactions.clear();}
function nearbyVolleyballCourt(){
if(frisbeeGame||volleyball||boating||swimming||voyage||dragonFlight||wakeboardRide||beachTransfer||shoreRecovery||diveAnimation||!onMainlandBeach())return -1;
return VOLLEYBALL_COURTS.findIndex((c,i)=>!volleySprayReactions.has(i)&&player.x>=c.x-24&&player.x<=c.x+c.w+24&&player.y>=c.y-20&&player.y<=c.y+c.h+14);
}
function startVolleyball(index){
if(volleyball||nearbyVolleyballCourt()!==index||document.querySelector('dialog[open]'))return;
const court=VOLLEYBALL_COURTS[index],exit={x:player.x,y:player.y};
stopFishing();closeMapPanel();keys.clear();timberStep=null;goggleToss=null;
player.x=court.x+36;player.y=court.y+court.h-12;player.facing='up';
volleyball={index,court,exit,score:[0,0],phase:'serve',elapsed:0,server:0,ball:null,hitWindow:0,hitAnim:0,
teammate:{x:court.x+108,y:court.y+court.h-12,hit:0},
opponents:[{x:court.x+36,y:court.y+14,hit:0},{x:court.x+108,y:court.y+14,hit:0}],message:'You and Pip vs. the beach team. Press Space or Serve to start!'};
save();updateWaterControls();canvas.focus({preventScroll:true});
}
function leaveVolleyball(){
if(!volleyball)return;
const exit=volleyball.exit;volleyball=null;player.x=exit.x;player.y=exit.y;keys.clear();save();updateWaterControls();canvas.focus({preventScroll:true});
}
function updateVolleyballUI(){
const near=nearbyVolleyballCourt();$('#mapVolleyJoin').hidden=near<0;$('#mapVolleyHit').hidden=!volleyball;$('#mapVolleyLeave').hidden=!volleyball;$('#volleyballHud').hidden=!volleyball;
$('#waterControls').hidden=!!volleyball;
if(!volleyball)return;
const score=`You + Pip ${volleyball.score[0]} : ${volleyball.score[1]} Beach team`;
if($('#volleyScore').textContent!==score)$('#volleyScore').textContent=score;
if($('#volleyStatus').textContent!==volleyball.message)$('#volleyStatus').textContent=volleyball.message;
setSuggestionContent($('#mapVolleyHit'),volleyball.phase==='finished'?'Play again · Space ↗':volleyball.phase==='serve'?'Serve · Space ↗':'Hit ball · Space ↗');
$('#mapVolleyHit').disabled=volleyball.phase==='point'||volleyball.phase==='serve'&&volleyball.server===1;
}
function moveVolleyballPlayer(dx,dy){
const c=volleyball.court;
if(volleyball.phase==='finished')return;
const from={x:player.x,y:player.y};
player.x=Math.max(c.x+9,Math.min(c.x+c.w-9,player.x+dx));player.y=Math.max(c.y+c.h/2+8,Math.min(c.y+c.h-6,player.y+dy));faceMovement(dx,dy);
recordWalkingMovement(from);
}
function volleyShot(team,actor){
const v=volleyball,c=v.court,T=1.15,gravity=100;
const target={x:Math.max(c.x+12,Math.min(c.x+c.w-12,c.x+c.w-(actor.x-c.x)+(Math.random()-.5)*14)),y:team===0?c.y+13+Math.random()*8:c.y+c.h-16+Math.random()*6};
v.ball={x:actor.x,y:actor.y,z:13,vx:(target.x-actor.x)/T,vy:(target.y-actor.y)/T,vz:gravity*T/2-13/T,lastTeam:team,age:0,target,trail:[]};
v.phase='rally';v.elapsed=0;v.opponentMiss=team===0&&Math.random()<.18;
if(actor===player)v.hitAnim=240;else actor.hit=240;
v.hitWindow=0;v.message=team===0?'Over the net! Get ready for the return.':'Move to the landing ring. Press Space / Hit when the ball is close.';
}
function volleyCanHit(actor,team){
const v=volleyball,b=v?.ball;
return !!b&&v.phase==='rally'&&b.lastTeam!==team&&b.z>=2&&b.z<=33&&(team===0?b.y>=v.court.y+v.court.h/2:b.y<v.court.y+v.court.h/2)&&Math.hypot(b.x-actor.x,b.y-actor.y)<=25;
}
function hitVolleyball(){
if(!volleyball||document.querySelector('dialog[open]'))return;
const v=volleyball;canvas.focus({preventScroll:true});
if(v.phase==='finished'){const index=v.index,exit=v.exit;resetVolleyball();startVolleyball(index);if(volleyball){volleyball.exit=exit;save();}return;}
if(v.phase==='serve'&&v.server===0){volleyShot(0,player);updateVolleyballUI();return;}
if(v.phase!=='rally')return;
v.hitWindow=250;
if(volleyCanHit(player,0))volleyShot(0,player);
else v.message='Get closer to the ball—move to the ring and time your hit.';
updateVolleyballUI();canvas.focus({preventScroll:true});
}
function volleyPoint(team){
const v=volleyball;v.score[team]++;v.elapsed=0;v.server=team;v.hitWindow=0;
if(v.score[team]>=5){v.phase='finished';v.message=team===0?'You and Pip win! Space / Play again for a rematch, or X to leave.':'Beach team wins! Space / Play again for a rematch, or X to leave.';}
else{v.phase='point';v.message=team===0?'Point for you and Pip!':'Point for the beach team!';}
chime();updateVolleyballUI();
}
function moveVolleyNPC(actor,x,y,dt,speed=38){
const dx=x-actor.x,dy=y-actor.y,distance=Math.hypot(dx,dy),step=Math.min(distance,speed*dt/1000);
if(distance>0){actor.x+=dx/distance*step;actor.y+=dy/distance*step;}
actor.hit=Math.max(0,actor.hit-dt);
}
function advanceVolleyball(dt){
if(!volleyball||dt<=0||document.querySelector('dialog[open]'))return;
for(let remaining=dt;remaining>0&&volleyball;){
const step=Math.min(16,remaining);remaining-=step;const v=volleyball,c=v.court;v.elapsed+=step;v.hitAnim=Math.max(0,v.hitAnim-step);v.hitWindow=Math.max(0,v.hitWindow-step);
if(v.phase==='finished')break;
if(v.phase==='point'){
if(v.elapsed>=950){v.phase='serve';v.elapsed=0;v.ball=null;v.message=v.server===0?'Your serve! Press Space or Serve.':'Beach team is serving. Get ready!';}
continue;
}
if(v.phase==='serve'){if(v.server===1&&v.elapsed>=650)volleyShot(1,v.opponents[0]);continue;}
const b=v.ball,seconds=step/1000,oldY=b.y;
b.x+=b.vx*seconds;b.y+=b.vy*seconds;b.z+=b.vz*seconds-.5*100*seconds*seconds;b.vz-=100*seconds;b.age+=step;
if(b.age%64<step){b.trail.push({x:b.x,y:b.y,z:b.z});b.trail=b.trail.slice(-4);}
const net=c.y+c.h/2;
if(((oldY<net&&b.y>=net)||(oldY>net&&b.y<=net))&&b.z<12){volleyPoint(1-b.lastTeam);continue;}
if(b.z<=0){const insideCourt=b.x>=c.x&&b.x<=c.x+c.w&&b.y>=c.y&&b.y<=c.y+c.h;volleyPoint(insideCourt?(b.y>=net?1:0):1-b.lastTeam);continue;}
const target=b.target;
v.opponents.forEach((npc,index)=>{
const homeX=c.x+(index?108:36),assigned=target.x<c.x+c.w/2?index===0:index===1;
const chase=b.lastTeam===0&&assigned&&b.age>220;
moveVolleyNPC(npc,chase?target.x:homeX,chase?Math.min(net-7,target.y+3):c.y+14,step);
});
const help=b.lastTeam===1&&target.x>c.x+c.w/2+8;
moveVolleyNPC(v.teammate,help?target.x:c.x+108,help?Math.max(net+9,target.y):c.y+c.h-12,step,42);
if(v.hitWindow>0&&volleyCanHit(player,0)){volleyShot(0,player);continue;}
if(b.vz<0&&b.age>350){
if(b.lastTeam===0&&!v.opponentMiss){const npc=v.opponents.find(n=>volleyCanHit(n,1));if(npc){volleyShot(1,npc);continue;}}
if(b.lastTeam===1&&help&&Math.hypot(player.x-b.x,player.y-b.y)>26&&volleyCanHit(v.teammate,0))volleyShot(0,v.teammate);
}
}
updateVolleyballUI();
}
function drawVolleyNet(c){
const net=c.y+c.h/2;rect(c.x+3,net-20,2,24,'#826b4c');rect(c.x+c.w-5,net-20,2,24,'#826b4c');
ctx.strokeStyle='#faf1d0bb';ctx.lineWidth=.6;
for(let x=c.x+5;x<c.x+c.w-4;x+=6){ctx.beginPath();ctx.moveTo(x,net-16);ctx.lineTo(x,net);ctx.stroke();}
for(let y=net-16;y<=net;y+=4){ctx.beginPath();ctx.moveTo(c.x+4,y);ctx.lineTo(c.x+c.w-4,y);ctx.stroke();}
rect(c.x+3,net-17,c.w-6,1.3,'#fff4d3');
}
function drawPlayableVolleyball(){
const v=volleyball,c=v.court,b=v.ball;
rect(c.x-2,c.y-2,c.w+4,c.h+4,'#dfc38b');ctx.strokeStyle='#fff1c5';ctx.lineWidth=1;ctx.strokeRect(c.x,c.y,c.w,c.h);
ctx.beginPath();ctx.moveTo(c.x,c.y+c.h/2);ctx.lineTo(c.x+c.w,c.y+c.h/2);ctx.stroke();
for(const [index,npc] of v.opponents.entries())beachPerson(npc.x,npc.y,index?'#6b9ea9':'#d98b70',index?'#d4a879':'#f2c992',npc.hit/240);
drawVolleyNet(c);
beachPerson(v.teammate.x,v.teammate.y,'#8b9e68','#d4a879',v.teammate.hit/240);character(player.x,player.y);
if(v.hitAnim>0){ctx.strokeStyle='#e4bd88';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(player.x-5,player.y-11);ctx.lineTo(player.x-3,player.y-22);ctx.moveTo(player.x+5,player.y-11);ctx.lineTo(player.x+3,player.y-22);ctx.stroke();}
if(b&&v.phase==='rally'){
if(b.lastTeam===1){ctx.save();ctx.globalAlpha=.55;ctx.strokeStyle='#fff6d5';ctx.lineWidth=.9;ctx.beginPath();ctx.ellipse(b.target.x,b.target.y,8,3,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
for(let i=0;i<b.trail.length;i++){const p=b.trail[i];ctx.save();ctx.globalAlpha=(i+1)/b.trail.length*.15;ellipse(p.x,p.y-p.z,2.5,2.5,'#fff5d7');ctx.restore();}
ellipse(b.x+1,b.y+2,3+Math.max(0,b.z)*.025,1.3,'#9f885a55');ellipse(b.x,b.y-b.z,3.5,3.5,'#fff3d3');
ctx.strokeStyle='#c98a4e';ctx.lineWidth=.7;ctx.beginPath();ctx.arc(b.x,b.y-b.z,2.7,-1,1.8);ctx.stroke();
}else if(v.phase==='serve'){
const server=v.server===0?player:v.opponents[0];ellipse(server.x+5,server.y-14,3.5,3.5,'#fff3d3');
}
ctx.fillStyle='#fff7d7';ctx.font='bold 7px monospace';ctx.textAlign='center';ctx.fillText(`${v.score[0]} — ${v.score[1]}`,c.x+c.w/2,c.y-24);
}
$('#mapVolleyJoin').onclick=()=>startVolleyball(nearbyVolleyballCourt());$('#mapVolleyHit').onclick=hitVolleyball;$('#mapVolleyLeave').onclick=leaveVolleyball;
const WATERSPORTS_DOCK={x:550,y:247},WAKEBOARD_COST=25,WATERSKIS_COST=100,WAKEBOARD_ROPE=110,WAKEBOARD_SPEED=.15;
let wakeboardRide=null,wakeboardBoatTrip=null,wakeboardCrash=null,wakeboardDockHeading=0,waterskiWake=[];
function resetWatersports(){waterskiWake=[];wakeboardRide=null;wakeboardBoatTrip=null;wakeboardCrash=null;wakeboardDockHeading=0;}
function nearWatersportsDock(){return !wakeboardCrash&&!frisbeeGame&&!volleyball&&!wakeboardRide&&!dragonFlight&&!swimming&&!boating&&!voyage&&!shoreClimb&&!shoreRecovery&&!diveAnimation&&Math.hypot(player.x-WATERSPORTS_DOCK.x,player.y-WATERSPORTS_DOCK.y)<42;}
function updateWakeboardUI(){
for(const id of ['buyWakeboard','buyWakeboardDock']){
$('#'+id).textContent=state.wakeboard?'Wakeboard owned ✓':'Buy wakeboard · 25 ◆';$('#'+id).disabled=!!state.wakeboard||state.crystals<WAKEBOARD_COST;
}
for(const id of ['buyWaterskis','buyWaterskisDock']){
$('#'+id).textContent=state.waterskis?'Waterskis owned ✓':'Buy waterskis · 100 ◆';$('#'+id).disabled=!!state.waterskis||state.crystals<WATERSKIS_COST;
}
$('#watersportsChoice').hidden=!(state.wakeboard&&state.waterskis);
$('#startWaterskis').hidden=!state.waterskis;
$('#startWaterskis').disabled=!state.waterskis||!nearWatersportsDock()||!!wakeboardBoatTrip||!!wakeboardCrash;
$('#wakeboardInfo').textContent=wakeboardBoatTrip?'The tow boat is completing its programmed route back to this dock. Your equipment is still yours; ride again when it returns.':state.waterskis?'Your waterskis are ready. Visit the watersports dock on Moonwater Island to ride behind the boat.':state.wakeboard?'Your wakeboard is ready. Visit the watersports dock on Moonwater Island to ride behind the boat.':'Buy a wakeboard for 25 crystals or waterskis for 100 crystals, then visit the watersports dock on Moonwater Island.';
$('#startWakeboard').disabled=!state.wakeboard||!nearWatersportsDock()||!!wakeboardBoatTrip||!!wakeboardCrash;
$('#mapWakeboardStart .suggestion-label').textContent=state.wakeboard&&state.waterskis?'Choose watersports equipment':state.waterskis?'Start waterskiing':'Start wakeboarding';
$('#mapWakeboardStop .suggestion-label').textContent=wakeboardRide?.equipment==='waterskis'?'Finish waterskiing':'Finish wakeboarding';
$('#mapWakeboardStart').hidden=!(state.wakeboard||state.waterskis)||!nearWatersportsDock();$('#mapWakeboardStart').disabled=!!wakeboardBoatTrip||!!wakeboardCrash;$('#mapWakeboardStop').hidden=!wakeboardRide;
}
function buyWakeboard(){
if(state.wakeboard)return;
if(state.crystals<WAKEBOARD_COST){toast('A wakeboard costs 25 crystals. Keep exploring to earn more!');return;}
state.crystals-=WAKEBOARD_COST;state.wakeboard=true;update();chime();toast('Wakeboard ready! Head to the watersports dock on Moonwater Island.');
}
function buyWaterskis(){
if(state.waterskis)return;
if(state.crystals<WATERSKIS_COST){toast('Waterskis cost 100 crystals. Keep exploring to earn more!');return;}
state.crystals-=WATERSKIS_COST;state.waterskis=true;update();chime();toast('Waterskis ready! Head to the watersports dock on Moonwater Island.');
}
function chooseWatersports(){
if(state.wakeboard&&state.waterskis||!(state.wakeboard||state.waterskis)){openWatersports();return;}
startWakeboarding(state.waterskis?'waterskis':'wakeboard');
}
function openWatersports(){updateWakeboardUI();openMapPanel('watersportsPanel');}
function visitWatersportsDock(){
if(wakeboardCrash||frisbeeGame||volleyball||wakeboardRide||dragonFlight||boating||swimming||voyage||shoreRecovery){toast('Finish your current ride before visiting the watersports dock.');return;}
player.x=WATERSPORTS_DOCK.x;player.y=WATERSPORTS_DOCK.y-18;keys.clear();save();updateWaterControls();openWatersports();
}
const WAKEBOARD_STERN=25,WAKEBOARD_HANDLE=9;
function wakeboardTowPoint(boat,heading){return {x:boat.x-Math.cos(heading)*WAKEBOARD_STERN,y:boat.y-Math.sin(heading)*WAKEBOARD_STERN};}
function initialWakeboardRider(boat,heading){
const anchor=wakeboardTowPoint(boat,heading),reach=WAKEBOARD_ROPE+WAKEBOARD_HANDLE;
return {x:anchor.x-Math.cos(heading)*reach,y:anchor.y-Math.sin(heading)*reach,vx:Math.cos(heading)*WAKEBOARD_SPEED*1000,vy:Math.sin(heading)*WAKEBOARD_SPEED*1000};
}
function predictWakeboardRider(rider,fromBoat,toBoat,fromHeading,toHeading,dt,control={x:0,y:0}){
const seconds=dt/1000,anchor=wakeboardTowPoint(toBoat,toHeading);
const turn=Math.atan2(Math.sin(toHeading-fromHeading),Math.cos(toHeading-fromHeading))/seconds;
const speed=Math.hypot(toBoat.x-fromBoat.x,toBoat.y-fromBoat.y)/seconds;
// Planing against the water banks the board toward the outside of the boat's turn.
// Tangential momentum persists; rope tension can pull, but never push, the rider.
const carve=turn*speed*(control.carve??1.4),drag=Math.exp(-.55*seconds);
let vx=rider.vx*drag+Math.sin(toHeading)*carve*seconds,vy=rider.vy*drag-Math.cos(toHeading)*carve*seconds;
vx+=control.x*280*seconds;vy+=control.y*280*seconds;
let x=rider.x+vx*seconds,y=rider.y+vy*seconds;
const dx=x-anchor.x,dy=y-anchor.y,distance=Math.hypot(dx,dy),reach=WAKEBOARD_ROPE+WAKEBOARD_HANDLE;
if(distance>reach){x=anchor.x+dx/distance*reach;y=anchor.y+dy/distance*reach;}
vx=(x-rider.x)/seconds;vy=(y-rider.y)/seconds;
return {x,y,vx,vy};
}
function wakeboardHandle(ride){
const anchor=wakeboardTowPoint(ride.boat,ride.heading),dx=anchor.x-player.x,dy=anchor.y-player.y,distance=Math.hypot(dx,dy)||1;
return {x:player.x+dx/distance*WAKEBOARD_HANDLE,y:player.y+dy/distance*WAKEBOARD_HANDLE-6,dx:dx/distance,dy:dy/distance};
}
function wakeboardRigWater(x,y,heading,rider=null){
const spans=[...crossings,...activePiers(),...(state.upgrades.includes('bridge')?[woodlandBridge]:[])];
const water=(px,py)=>sharkWater(px,py)&&!spans.some(b=>px>=b.x&&px<=b.x+b.w&&py>=b.y&&py<=b.y+b.h);
// Check the hull separately from the independently moving rider and tow line.
if(![-28,-12,8,30].every(along=>[-10,0,10].every(side=>water(x+Math.cos(heading)*along-Math.sin(heading)*side,y+Math.sin(heading)*along+Math.cos(heading)*side))))return false;
rider??=initialWakeboardRider({x,y},heading);
const boardHeading=Math.hypot(rider.vx,rider.vy)>10?Math.atan2(rider.vy,rider.vx):heading;
if(![-17,0,17].every(along=>[-5,5].every(side=>water(rider.x+Math.cos(boardHeading)*along-Math.sin(boardHeading)*side,rider.y+Math.sin(boardHeading)*along+Math.cos(boardHeading)*side))))return false;
const anchor=wakeboardTowPoint({x,y},heading),distance=Math.hypot(rider.x-anchor.x,rider.y-anchor.y),steps=Math.max(1,Math.ceil(distance/8));
if(Math.hypot(rider.x-x,rider.y-y)<38||(rider.x-anchor.x)*Math.cos(heading)+(rider.y-anchor.y)*Math.sin(heading)>-8)return false;
for(let i=0;i<=steps;i++){const t=i/steps;if(!water(anchor.x+(rider.x-anchor.x)*t,anchor.y+(rider.y-anchor.y)*t))return false;}
return true;
}
function startWakeboarding(equipment='wakeboard'){
if(boatExplosions.has('tow')){toast('Wait for the tow boat’s smoke to clear.');return;}
if(!nearWatersportsDock()||wakeboardBoatTrip||wakeboardCrash||document.querySelector('dialog[open]'))return;
if(!['wakeboard','waterskis'].includes(equipment)||!state[equipment]){openWatersports();return;}
const boat={x:WATERSPORTS_DOCK.x+40,y:WATERSPORTS_DOCK.y+52};
const launchHeading=Math.PI;
if(!wakeboardRigWater(boat.x,boat.y,launchHeading))return;
stopFishing();closeMapPanel();clearSharkRide();timberStep=null;goggleToss=null;
wakeboardRide={equipment,boat,heading:launchHeading,courseDistance:0,phase:0,distance:0,wake:[],safe:{x:WATERSPORTS_DOCK.x,y:WATERSPORTS_DOCK.y-18}};
wakeboardRide.rider=initialWakeboardRider(boat,launchHeading);wakeboardRide.rider.vx=-wakeboardCoursePose(0).speed*1000;syncWakeboardRider(wakeboardRide);keys.clear();save();updateWaterControls();canvas.focus({preventScroll:true});
toast(`Hold on! Arrows / WASD steer your ${equipment==='waterskis'?'waterskier':'wakeboarder'}. The boat follows its course. X drops the rope so you can swim.`);
}
function finishWakeboarding(){
if(!wakeboardRide)return;
const ride=wakeboardRide,handle=wakeboardHandle(ride);
releaseWakeboardBoat(ride);wakeboardRide=null;swimming=false;
wakeboardCrash={equipment:ride.equipment,kind:'release',from:{x:player.x,y:player.y},to:{x:player.x,y:player.y},heading:ride.heading,handle:{x:handle.x,y:handle.y},elapsed:0,duration:700,safe:{...ride.safe}};
resetSwimMotion();keys.clear();save();updateWaterControls();canvas.focus({preventScroll:true});toast('You dropped the rope! Swim to shore while the boat returns to the dock.');
}
function syncWakeboardRider(ride){ride.rider??=initialWakeboardRider(ride.boat,ride.heading);player.x=ride.rider.x;player.y=ride.rider.y;}
function wakeboardIslandDistance(x,y,poly){
if(inside(x,y,poly))return 0;
let best=Infinity;
for(let i=0;i<poly.length;i++){
const a=poly[i],b=poly[(i+1)%poly.length],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));
best=Math.min(best,Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy));
}
return best;
}
function wakeboardChannelX(y){
// Follow the equal-clearance line between Whispering Woods and Crystal Cavern.
let left=locations[3].x,right=locations[4].x;
for(let i=0;i<28;i++){
const x=(left+right)/2;
if(wakeboardIslandDistance(x,y,islandPolys[3])<wakeboardIslandDistance(x,y,islandPolys[4]))left=x;else right=x;
}
return (left+right)/2;
}
function buildWakeboardCourse(){
const points=[],cache=new Map(),cx=y=>{if(!cache.has(y))cache.set(y,wakeboardChannelX(y));return cache.get(y);};
const add=(x,y)=>{const last=points[points.length-1];if(!last||Math.hypot(x-last.x,y-last.y)>.001)points.push({x,y});};
const curve=c=>{for(let i=0;i<=48;i++){const t=i/48,u=1-t;add(u*u*u*c[0][0]+3*u*u*t*c[1][0]+3*u*t*t*c[2][0]+t*t*t*c[3][0],u*u*u*c[0][1]+3*u*u*t*c[1][1]+3*u*t*t*c[2][1]+t*t*t*c[3][1]);}};
// Only the dock approach is near shore. The transit channel stays centered.
curve([[590,299],[550,299],[cx(340),299],[cx(340),340]]);
for(let y=340;y<=610;y+=6)add(cx(y),y);
// A broad circuit in the open ocean, with over 200 pixels of island clearance.
curve([[cx(610),610],[cx(610),690],[615,740],[615,860]]);
const loopStart=points.length-1;
curve([[615,860],[615,915],[550,960],[470,960]]);
curve([[470,960],[390,960],[325,915],[325,860]]);
curve([[325,860],[325,805],[390,760],[470,760]]);
curve([[470,760],[550,760],[615,805],[615,860]]);
const loopEnd=points.length-1;
// An unattended boat completes the circuit, then takes the centered route home.
curve([[615,860],[615,915],[550,960],[470,960]]);
curve([[470,960],[390,960],[325,915],[325,860]]);
curve([[325,860],[325,805],[390,760],[470,760]]);
curve([[470,760],[550,760],[530,680],[cx(610),610]]);
for(let y=610;y>=340;y-=6)add(cx(y),y);
curve([[cx(340),340],[cx(340),280],[630,280],[630,299]]);
curve([[630,299],[630,319],[610,299],[590,299]]);
let length=0;
for(let i=0;i<points.length;i++){
const p=points[i],a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)];
if(i)length+=Math.hypot(p.x-a.x,p.y-a.y);
p.distance=length;p.heading=Math.atan2(b.y-a.y,b.x-a.x);
}
for(let i=0;i<points.length;i++){
const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)];
const turn=Math.abs(Math.atan2(Math.sin(b.heading-a.heading),Math.cos(b.heading-a.heading))),curvature=turn/Math.max(1,b.distance-a.distance);
points[i].speed=Math.max(.035,Math.min(WAKEBOARD_SPEED,.0011/Math.max(.001,curvature)));
}
return {points,length,loopStart:points[loopStart].distance,loopEnd:points[loopEnd].distance};
}
function wakeboardCoursePose(distance){
const course=WAKEBOARD_COURSE,d=((distance%course.length)+course.length)%course.length;
let low=0,high=course.points.length-1;
while(low+1<high){const middle=(low+high)>>1;if(course.points[middle].distance<=d)low=middle;else high=middle;}
const a=course.points[low],b=course.points[high],t=(d-a.distance)/(b.distance-a.distance||1),turn=Math.atan2(Math.sin(b.heading-a.heading),Math.cos(b.heading-a.heading));
return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,heading:a.heading+turn*t,speed:a.speed+(b.speed-a.speed)*t};
}
function wakeboardSolidAt(x,y){
const island=islandPolys.findIndex(p=>inside(x,y,p));if(island>=0)return {kind:'land',island,x,y};
if(x<WORLD.left+18||y<18||x>WORLD.right-18||y>WORLD.height-18)return {kind:'boundary',x,y};
const spans=[...crossings,...activePiers(),...(state.upgrades.includes('bridge')?[woodlandBridge]:[])];
if(spans.some(b=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h))return {kind:'timber',x,y};
return null;
}
function wakeboardHullClear(boat,heading){
return [-28,-12,8,30].every(along=>[-11,0,11].every(side=>!wakeboardSolidAt(boat.x+Math.cos(heading)*along-Math.sin(heading)*side,boat.y+Math.sin(heading)*along+Math.cos(heading)*side)));
}
function appendTowWake(boat,heading,distance,age=0){
boat.wakeDistance=(boat.wakeDistance||0)+distance;
if(boat.wakeDistance>=6){boat.wakeDistance%=6;(boat.wake??=[]).push({x:boat.boat.x-Math.cos(heading)*29,y:boat.boat.y-Math.sin(heading)*29,heading,age,serial:boat.wakeSerial=(boat.wakeSerial||0)+1});}
boat.wake=boat.wake.filter(w=>w.age<3200).slice(-100);
}
function releaseWakeboardBoat(ride){
wakeboardBoatTrip={boat:{...ride.boat},heading:ride.heading,courseDistance:ride.courseDistance||0,phase:ride.phase||0,wake:ride.wake.map(w=>({...w})),wakeSerial:ride.wakeSerial||0,stage:'returning',elapsed:0};
}
function advanceReturningWakeboardBoat(dt){
if(!wakeboardBoatTrip||dt<=0||document.querySelector('dialog[open]'))return;
for(let remaining=dt;remaining>0&&wakeboardBoatTrip;){
const elapsed=Math.min(16,remaining);remaining-=elapsed;const boat=wakeboardBoatTrip;boat.phase+=elapsed*.01;boat.wake=boat.wake.filter(w=>{w.age+=elapsed;return w.age<3200;});
if(boat.stage==='docking'){
boat.elapsed+=elapsed;const t=Math.min(1,boat.elapsed/1000),ease=t*t*(3-2*t);
boat.boat={x:590,y:299+(WATERSPORTS_DOCK.y+18-299)*ease};boat.heading=Math.PI+Math.PI/2*ease;
if(t===1){wakeboardDockHeading=boat.heading;wakeboardBoatTrip=null;updateWaterControls();}
continue;
}
const pose=wakeboardCoursePose(boat.courseDistance),distance=pose.speed*elapsed;boat.courseDistance+=distance;
if(boat.courseDistance>=WAKEBOARD_COURSE.length){boat.stage='docking';boat.elapsed=0;boat.boat={x:590,y:299};continue;}
const next=wakeboardCoursePose(boat.courseDistance);boat.boat={x:next.x,y:next.y};boat.heading=next.heading;appendTowWake(boat,boat.heading,distance);
}
}
function wakeboardRiderContact(ride,from,to){
const distance=Math.hypot(to.x-from.x,to.y-from.y),steps=Math.max(1,Math.ceil(distance/2)),heading=Math.atan2(to.vy,to.vx);
for(let i=1;i<=steps;i++){
const x=from.x+(to.x-from.x)*i/steps,y=from.y+(to.y-from.y)*i/steps;
for(const [along,side] of [[0,0],[16,0],[-16,0],[0,5],[0,-5]]){
const hit=wakeboardSolidAt(x+Math.cos(heading)*along-Math.sin(heading)*side,y+Math.sin(heading)*along+Math.cos(heading)*side);if(hit)return hit;
}
if(Math.hypot(x-ride.boat.x,y-ride.boat.y)<36)return {kind:'boat',x,y};
for(const boat of [ferryPosition,fishingBoatPosition])if(boat&&Math.hypot(x-boat.x,y-boat.y)<34)return {kind:'boat',x,y};
}
// A rope snag releases the rider too; the tow boat never drags them through land.
const anchor=wakeboardTowPoint(ride.boat,ride.heading),length=Math.hypot(to.x-anchor.x,to.y-anchor.y);
for(let d=8;d<length-14;d+=8){const hit=wakeboardSolidAt(anchor.x+(to.x-anchor.x)*d/length,anchor.y+(to.y-anchor.y)*d/length);if(hit)return {kind:'snag',x:to.x,y:to.y};}
return null;
}
function crashWakeboarder(ride,contact,from,to){
const heading=Math.hypot(to.vx,to.vy)>1?Math.atan2(to.vy,to.vx):ride.heading;
releaseWakeboardBoat(ride);wakeboardRide=null;keys.clear();
let landing=null;
if(contact.kind==='land'){
for(const inset of [6,10,14]){
const point={x:contact.x+Math.cos(heading)*inset,y:contact.y+Math.sin(heading)*inset};
if(inside(point.x,point.y,islandPolys[contact.island])&&canWalk(point.x,point.y)){landing=point;break;}
}
}
player.x=from.x;player.y=from.y;swimming=false;
wakeboardCrash={kind:landing?'land':'water',from:{x:from.x,y:from.y},to:landing||{x:from.x,y:from.y},heading,elapsed:0,duration:landing?280:450,safe:landing||{...ride.safe}};
clearSharkRide();resetSwimMotion();save();updateWaterControls();
toast(landing?'Oof! A fast tumble onto the beach. The boat is returning to its dock.':'Splash! You fell off. The boat continues its route back to the dock.');
}
function advanceWakeboardCrash(dt){
if(!wakeboardCrash||dt<=0||document.querySelector('dialog[open]'))return;
const crash=wakeboardCrash;crash.elapsed+=dt;const t=Math.min(1,crash.elapsed/crash.duration),ease=1.5*t-.5*t*t*t;
player.x=crash.from.x+(crash.to.x-crash.from.x)*ease;player.y=crash.from.y+(crash.to.y-crash.from.y)*ease;
if(t<1)return;
wakeboardCrash=null;keys.clear();
if(crash.kind==='land'){swimming=false;shoreRecovery={elapsed:Math.max(0,crash.elapsed-crash.duration),heading:crash.heading};startGoggleToss(crash.from);}
else{swimming=true;resetSwimMotion();}
save();updateWaterControls();
}
function drawFastShoreTumble(landing,heading){
const roll=Math.max(0,Math.min(1,landing.elapsed/landing.duration)),tuck=Math.min(1,roll/.18,(1-roll)/.22);
rollingCharacter(player.x,player.y-14+4*roll-Math.sin(roll*Math.PI)*4,roll*(Math.PI*2+Math.PI/2)*(Math.cos(heading)>=0?1:-1),tuck);
}
function drawWakeboardRelease(release){
const t=Math.min(1,release.elapsed/release.duration),settle=t*t*(3-2*t),fade=1-settle;
// The handle falls out of the rider's hands while the departing boat draws it away.
if(wakeboardBoatTrip&&t<.85){
const anchor=wakeboardTowPoint(wakeboardBoatTrip.boat,wakeboardBoatTrip.heading),pull=Math.max(0,(t-.25)/.75);
const hx=release.handle.x+(anchor.x-release.handle.x)*pull*.3,hy=release.handle.y+(anchor.y-release.handle.y)*pull*.3+Math.min(1,t/.3)*10;
ctx.save();ctx.globalAlpha=Math.min(1,(.85-t)/.2);ctx.strokeStyle='#eee6b4';ctx.lineWidth=.9;ctx.beginPath();ctx.moveTo(anchor.x,anchor.y-3);ctx.quadraticCurveTo((anchor.x+hx)/2,(anchor.y+hy)/2+Math.sin(t*Math.PI)*22,hx,hy);ctx.stroke();
const dx=Math.cos(release.heading),dy=Math.sin(release.heading);
ctx.strokeStyle='#385c59';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(hx-dy*4,hy+dx*4);ctx.lineTo(hx+dy*4,hy-dx*4);ctx.stroke();ctx.restore();
}
ctx.save();ctx.translate(player.x,player.y);ctx.rotate(release.heading);ctx.globalAlpha=fade;
drawTowEquipment(release.equipment);ctx.restore();
// Lower the rider into the water without the head-over-heels wipeout motion.
ctx.save();ctx.beginPath();ctx.rect(player.x-30,player.y-40,60,43);ctx.clip();character(player.x,player.y+settle*15);
directionalSwimGear(player.x,player.y-15+settle*8);
const reach=1-Math.min(1,t/.35),colors=characterColors();
for(const side of [-1,1]){ctx.strokeStyle=colors.shirt;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(player.x+side*4,player.y-11+settle*10);ctx.lineTo(player.x+side*(5+settle*5)+Math.cos(release.heading)*reach*6,player.y-6+settle*8);ctx.stroke();}ctx.restore();
ctx.save();ctx.globalAlpha=Math.sin(t*Math.PI)*.8;ctx.strokeStyle='#e4f8ef';ctx.lineWidth=1;
for(const delay of [0,.18]){const age=Math.max(0,t-delay);ctx.beginPath();ctx.ellipse(player.x,player.y+2,5+age*23,2+age*8,0,0,Math.PI*2);ctx.stroke();}
for(let i=0;i<6;i++){const angle=i*Math.PI/3,flight=Math.max(0,Math.sin(Math.min(1,t/.8)*Math.PI));ellipse(player.x+Math.cos(angle)*flight*15,player.y+2+Math.sin(angle)*flight*5-flight*8,1,1.5,'#e4f8ef');}ctx.restore();
}
function drawWakeboardCrash(){
if(!wakeboardCrash)return;
if(wakeboardCrash.kind==='release'){drawWakeboardRelease(wakeboardCrash);return;}
if(wakeboardCrash.kind==='land'){drawFastShoreTumble(wakeboardCrash,wakeboardCrash.heading);return;}
const t=Math.min(1,wakeboardCrash.elapsed/wakeboardCrash.duration);
ctx.save();ctx.translate(player.x,player.y-5-Math.sin(t*Math.PI)*8);ctx.rotate(t*Math.PI/2*(Math.cos(wakeboardCrash.heading)>=0?1:-1));ctx.globalAlpha=1-t*.6;character(0,0);directionalSwimGear(0,-15);ctx.restore();
ctx.save();ctx.globalAlpha=Math.sin(t*Math.PI)*.8;ctx.strokeStyle='#e4f8ef';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(player.x,player.y+2,5+t*17,2+t*6,0,0,Math.PI*2);ctx.stroke();ctx.restore();
}
function advanceWakeboarding(dt){
if(!wakeboardRide||dt<=0||document.querySelector('dialog[open]'))return;
const ride=wakeboardRide;ride.phase+=dt*.01;ride.wake=ride.wake.filter(w=>{w.age+=dt;return w.age<3200;});
let dx=(keys.has('right')||keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('left')||keys.has('a')||keys.has('arrowleft')?1:0),dy=(keys.has('down')||keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('up')||keys.has('w')||keys.has('arrowup')?1:0);
if(dx&&dy){dx/=Math.SQRT2;dy/=Math.SQRT2;}
for(let remaining=dt;remaining>0&&wakeboardRide;){
const elapsed=Math.min(16,remaining);remaining-=elapsed;
const oldBoat=ride.boat,oldHeading=ride.heading,from={...ride.rider},pose=wakeboardCoursePose(ride.courseDistance||0),distance=pose.speed*elapsed;
ride.courseDistance=((ride.courseDistance||0)+distance)%WAKEBOARD_COURSE.length;
if(ride.courseDistance>=WAKEBOARD_COURSE.loopEnd)ride.courseDistance=WAKEBOARD_COURSE.loopStart+(ride.courseDistance-WAKEBOARD_COURSE.loopEnd);
const next=wakeboardCoursePose(ride.courseDistance);ride.boat={x:next.x,y:next.y};ride.heading=next.heading;
const rider=predictWakeboardRider(from,oldBoat,ride.boat,oldHeading,ride.heading,elapsed,{x:dx,y:dy,carve:0});
const contact=wakeboardRiderContact(ride,from,rider);
appendTowWake(ride,ride.heading,distance,remaining);
if(contact){crashWakeboarder(ride,contact,from,rider);if(remaining>0)advanceReturningWakeboardBoat(remaining);return;}
if(ride.equipment==='waterskis'){
ride.skiWakeDistance=(ride.skiWakeDistance||0)+Math.hypot(rider.x-from.x,rider.y-from.y);
if(ride.skiWakeDistance>=3){ride.skiWakeDistance%=3;const heading=Math.atan2(rider.vy,rider.vx);waterskiWake.push({x:rider.x-Math.cos(heading)*19,y:rider.y-Math.sin(heading)*19,heading,age:remaining});waterskiWake=waterskiWake.slice(-140);}
}
ride.rider=rider;syncWakeboardRider(ride);
}
if(wakeboardRide)faceMovement(ride.rider.vx,ride.rider.vy);
}
function drawWaterskiWake(){
for(let i=1;i<waterskiWake.length;i++){
const a=waterskiWake[i-1],b=waterskiWake[i];if(Math.hypot(b.x-a.x,b.y-a.y)>12)continue;
const fade=Math.pow(Math.max(0,1-(a.age+b.age)/3600),1.4);
const point=(w,side,edge)=>{const width=5+w.age*.012+edge;return [w.x-Math.sin(w.heading)*side*width,w.y+Math.cos(w.heading)*side*width];};
ctx.save();
for(const side of [-1,1]){
ctx.globalAlpha=fade*.22;polygon([point(a,side,-2),point(b,side,-2),point(b,side,3),point(a,side,3)],'#c9eee1');
ctx.globalAlpha=fade*.8;polygon([point(a,side,0),point(b,side,0),point(b,side,1.2),point(a,side,1.2)],'#effff5');
}
ctx.restore();
}
}
function drawWakeboardWake(){
drawWaterskiWake();
const wake=wakeboardRide?.wake||wakeboardBoatTrip?.wake;if(!wake?.length)return;
// Successive world-space sections form connected prop wash and two spreading crests.
for(let i=1;i<wake.length;i++){
const a=wake[i-1],b=wake[i];if(Math.hypot(b.x-a.x,b.y-a.y)>18)continue;
const fade=Math.pow(Math.max(0,1-(a.age+b.age)/6400),1.5);
const point=(w,side,width)=>[w.x-Math.sin(w.heading)*side*width,w.y+Math.cos(w.heading)*side*width];
const inner=w=>3+w.age*.004;
ctx.save();ctx.globalAlpha=fade*.3;
polygon([point(a,-1,inner(a)),point(b,-1,inner(b)),point(b,1,inner(b)),point(a,1,inner(a))],'#d2f0e5');
for(const side of [-1,1]){
const width=w=>8+w.age*.045+Math.sin((w.serial||0)*1.7+w.age*.008)*1.1;
ctx.globalAlpha=fade*.15;
polygon([point(a,side,width(a)-3),point(b,side,width(b)-3),point(b,side,width(b)+5),point(a,side,width(a)+5)],'#4c929d');
ctx.globalAlpha=fade*.65;
polygon([point(a,side,width(a)),point(b,side,width(b)),point(b,side,width(b)+1.7),point(a,side,width(a)+1.7)],'#e6fbef');
ctx.globalAlpha=fade*.2;
polygon([point(a,side,width(a)*.68),point(b,side,width(b)*.68),point(b,side,width(b)*.68+1),point(a,side,width(a)*.68+1)],'#c6e9df');
}
ctx.globalAlpha=fade*.45;
const jitter=Math.sin((a.serial||i)*2.4)*inner(a)*.7,p=point(a,1,jitter);
ellipse(p[0],p[1],1.4+fade,1,'#edfff4');ctx.restore();
}
}
function drawWakeboardBoat(x,y,heading,running=false){
if(boatIsExploding('tow'))return;
const burning=boatExplosions.get('tow');if(burning){x=burning.x;y=burning.y;heading=burning.heading;}
drawBoatShadow(x,y,heading,'tow');
ctx.save();ctx.translate(x,y);ctx.rotate(heading);
polygon([[-23,-10],[5,-11],[24,0],[5,11],[-23,10]],'#356e79');
polygon([[-20,-7],[5,-8],[19,0],[5,8],[-20,7]],'#f4db9b');rect(-12,-7,4,14,'#c68353');rect(3,-5,4,10,'#78b5b7');
rect(-28,-4,6,8,'#3a5156');rect(-27,-3,4,3,'#889994');
ctx.strokeStyle='#e6e0bd';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-5,-9);ctx.lineTo(-7,-16);ctx.lineTo(3,-16);ctx.lineTo(5,9);ctx.stroke();
rect(-1,-7,5,7,'#537e62');ellipse(1,-9,3,3,'#e4bd88');rect(-2,-13,6,2,'#496b72');
if(running){
for(let i=0;i<4;i++){const flow=((wakeboardRide?.phase||wakeboardBoatTrip?.phase||0)*1.5+i*4)%15;ctx.globalAlpha=(1-flow/18)*.65;ellipse(-29-flow,Math.sin((wakeboardRide?.phase||wakeboardBoatTrip?.phase||0)+i)*2,3+flow*.12,1.3,'#e5f9ed');}
ctx.globalAlpha=.6;ctx.strokeStyle='#daf2e8';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(12,-10);ctx.quadraticCurveTo(25,-6,28,0);ctx.quadraticCurveTo(25,6,12,10);ctx.stroke();ctx.globalAlpha=1;
}
ctx.restore();const tow=wakeboardTowPoint({x,y},heading);ellipse(tow.x,tow.y-3,2,1.2,'#e9e4bc');
}
function drawTowEquipment(equipment){
if(equipment==='waterskis'){
for(const side of [-1,1]){const y=side*4.5;polygon([[-19,y-2.3],[17,y-2.3],[20,y-1.3],[20,y+1.3],[17,y+2.3],[-19,y+2.3]],'#4b9db6');rect(-16,y-.7,33,1.4,'#f7db79');rect(-2,y-1.8,5,3.6,'#44555a');}
}else{
polygon([[-14,-3],[10,-4],[15,0],[10,4],[-14,3],[-17,0]],'#bb694e');rect(-9,-1,18,2,'#edbe75');rect(-5,-2,3,4,'#44555a');rect(3,-2,3,4,'#44555a');
}
}
function drawWatersports(){
const ride=wakeboardRide;
if(!ride){if(wakeboardBoatTrip)drawWakeboardBoat(wakeboardBoatTrip.boat.x,wakeboardBoatTrip.boat.y,wakeboardBoatTrip.heading,true);else drawWakeboardBoat(WATERSPORTS_DOCK.x+40,WATERSPORTS_DOCK.y+18,wakeboardDockHeading);}
else{

drawWakeboardBoat(ride.boat.x,ride.boat.y,ride.heading,true);
const handle=wakeboardHandle(ride),anchor=wakeboardTowPoint(ride.boat,ride.heading),dx=handle.dx,dy=handle.dy;
const ropeDistance=Math.hypot(handle.x-anchor.x,handle.y+6-anchor.y),slack=Math.max(0,WAKEBOARD_ROPE-ropeDistance);
ctx.strokeStyle='#eee6b4';ctx.lineWidth=.9;ctx.beginPath();ctx.moveTo(anchor.x,anchor.y-3);ctx.quadraticCurveTo((anchor.x+handle.x)/2,(anchor.y-3+handle.y)/2+Math.min(14,slack*.5),handle.x,handle.y);ctx.stroke();
const boardHeading=Math.hypot(ride.rider.vx,ride.rider.vy)>10?Math.atan2(ride.rider.vy,ride.rider.vx):ride.heading;
ctx.save();ctx.translate(player.x,player.y);ctx.rotate(boardHeading);
if(ride.equipment!=='waterskis')ellipse(-4,3,15,5,'#c9eee17a');drawTowEquipment(ride.equipment);
ctx.strokeStyle='#dff8e9';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(-18,-5);ctx.lineTo(-8,-3);ctx.moveTo(-19,5);ctx.lineTo(-8,3);ctx.stroke();ctx.restore();
const colors=characterColors();
// Bent knees and both hands on the tow handle keep the rider in a board stance.
polygon([[player.x-5,player.y],[player.x-5,player.y-5],[player.x,player.y-8],[player.x+4,player.y-3],[player.x+5,player.y]],'#3e5555');
ellipse(player.x+dx,player.y-10,5,6,colors.shirt);rect(player.x-3,player.y-12,7,3,colors.accent);
rect(player.x-4,player.y-21,9,8,'#f2c992');rect(player.x-5,player.y-22,11,3,colors.hair);
if(currentProfile().character==='girl')rect(player.x-7,player.y-19,3,8,colors.hair);
for(const side of [-1,1]){ctx.strokeStyle='#e4bd88';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(player.x+side*4,player.y-12);ctx.lineTo(handle.x,handle.y);ctx.stroke();}
ctx.strokeStyle='#385c59';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(handle.x-dy*4,handle.y+dx*4);ctx.lineTo(handle.x+dy*4,handle.y-dx*4);ctx.stroke();
}
ctx.fillStyle='#fff0c1';ctx.font='bold 7px monospace';ctx.textAlign='center';ctx.fillText('WATERSPORTS',WATERSPORTS_DOCK.x,WATERSPORTS_DOCK.y+43);
}
$('#buyWakeboard').onclick=buyWakeboard;$('#buyWakeboardDock').onclick=buyWakeboard;$('#watersportsBtn').onclick=openWatersports;$('#visitWatersports').onclick=visitWatersportsDock;$('#buyWaterskis').onclick=buyWaterskis;$('#buyWaterskisDock').onclick=buyWaterskis;$('#startWaterskis').onclick=()=>startWakeboarding('waterskis');$('#startWakeboard').onclick=()=>startWakeboarding('wakeboard');$('#mapWakeboardStart').onclick=chooseWatersports;$('#mapWakeboardStop').onclick=finishWakeboarding;
const PET_DRAGON_HOME={x:268,y:174},FLYING_DRAGON_SPEED=.30,SWIMMING_DRAGON_SPEED=.11;
let petDragonPosition={...PET_DRAGON_HOME},dragonFlight=null,petDragonPhase=0,petDragonFire=null,petDragonWet=null,playerHairEffect=null,nextPetDragonFire=2000+Math.random()*3000;
function resetPetDragon(){boatExplosions.clear();for(const t of burnableTrees.values()){t.burnAge=null;t.regrowAge=0;}dragonFlight=null;petDragonPosition={...PET_DRAGON_HOME};petDragonPhase=0;petDragonFire=null;petDragonWet=null;playerHairEffect=null;nextPetDragonFire=2000+Math.random()*3000;}
function advancePetDragonWet(dt){
if(!petDragonWet||dt<=0||document.querySelector('dialog[open]'))return;
petDragonWet.elapsed+=dt;if(petDragonWet.elapsed>=2800)petDragonWet=null;
}
function sprayPetDragon(spray){
const position=dragonFlight?player:petDragonPosition,heading=dragonFlight?.heading||0,altitude=dragonFlight?.altitude||0,c=Math.cos(heading),s=Math.sin(heading);
for(const drop of spray){
const start=drop.dragonCheckedAge??0,end=Math.min(drop.age,drop.life);
if(end<=start)continue;
const steps=Math.max(1,Math.ceil((end-start)/.01));
for(let step=0;step<=steps&&!petDragonWet;step++){
const t=start+(end-start)*step/steps,z=Math.max(0,drop.vz*t-drop.gravity*t*t/2);
if(z<altitude||z>altitude+12)continue;
const dx=drop.x+drop.vx*t-position.x,dy=drop.y+drop.vy*t-position.y;
const x=dx*c+dy*s,y=-dx*s+dy*c;
if(((x+3)/31)**2+(y/12)**2<=1)petDragonWet={elapsed:0};
}
drop.dragonCheckedAge=end;
}
}
function drawPetDragonWater(){
if(!petDragonWet)return;
const age=petDragonWet.elapsed,wetness=age<800?1:Math.max(0,1-(age-800)/1800);
const heading=dragonFlight?.heading||0,mirror=Math.cos(heading)<0?-1:1;
// Small clear beads pick up the scales beneath them and a pinpoint of sky light.
const beads=[[-22,3,.45],[-12,1,.65],[-7,4,.5],[5,-2,.55],[9,4,.7],[14,-4,.4],[19,-1,.6],[-8,-12,.5],[1,12,.65],[11,-1,.35],[-15,4,.35]];
ctx.save();
for(let i=0;i<beads.length;i++){
const [x,y,r]=beads[i],slide=Math.min(1,age/1800)*(.2+r*.6);
const bx=x+Math.sin(heading)*slide,by=y+Math.cos(heading)*mirror*slide;
const remaining=wetness*(age<800?1:Math.max(.15,1-(age-800)/(650+i*85)));
ctx.globalAlpha=remaining*.22;ellipse(bx+.15,by+.25,r*1.15,r*.8,'#354561');
ctx.globalAlpha=remaining*.28;ellipse(bx,by,r,r*.85,'#a8e9f5');
ctx.globalAlpha=remaining*.7;ellipse(bx-r*.25,by-r*.3,r*.28,r*.22,'#f0ffff');
}
// Uneven releases follow the shake, then fall under screen-space gravity.
if(age>=800&&age<2400)for(let i=0;i<24;i++){
const delay=i*37+(Math.sin(i*7.13)+1)*18,t=(age-800-delay)/1000;
if(t<0||t>.65)continue;
const [ox,oy]=beads[i%beads.length],side=i%2?1:-1;
const vx=Math.sin(i*4.7)*17,vy=side*(16+(Math.sin(i*2.3)+1)*13);
const gravity=48*t*t,dx=ox+vx*t+Math.sin(heading)*gravity,dy=oy+vy*t+Math.cos(heading)*mirror*gravity;
const r=.3+(Math.sin(i*8.1)+1)*.2;
ctx.globalAlpha=(1-t/.65)*.48;ellipse(dx,dy,r,r*(1+Math.min(.6,t)),'#c5f4ff');
ctx.globalAlpha=(1-t/.65)*.7;ellipse(dx-r*.2,dy-r*.3,r*.3,r*.25,'#f0ffff');
}
ctx.restore();
}
function canMountPetDragon(){
return !wakeboardCrash&&!frisbeeGame&&!volleyball&&!wakeboardRide&&!dragonFlight&&!swimming&&!boating&&!voyage&&!fishingActive&&!diveAnimation&&!shoreClimb&&!shoreRecovery&&!document.querySelector('dialog[open]')&&Math.hypot(player.x-petDragonPosition.x,player.y-petDragonPosition.y)<=42;
}
function mountPetDragon(){
if(!canMountPetDragon())return;
const safe={x:player.x,y:player.y};
stopFishing();closeMapPanel();clearSharkRide();goggleToss=null;timberStep=null;
dragonFlight={stage:'takeoff',elapsed:0,altitude:0,heading:0,safe};
player.x=petDragonPosition.x;player.y=petDragonPosition.y;keys.clear();save();updateWaterControls();canvas.focus({preventScroll:true});
toast('Your pet dragon is ready to fly! Arrows / WASD steer. X lands on ground or water. Press X while swimming to take off again.');
}
function petDragonLandingPoint(){
for(const distance of [0,8,16,24])for(let i=0;i<(distance?16:1);i++){
const angle=i*Math.PI/8,x=player.x+Math.cos(angle)*distance,y=player.y+Math.sin(angle)*distance;
const island=islandPolys.findIndex(poly=>inside(x,y,poly));
if(island<0||allIslands[island]?.boatOnly)continue;
if(canWalk(x,y))return {x,y};
}
return null;
}
function petDragonSwimWater(x,y,heading=dragonFlight?.heading||0){
return [[0,0],[32,0],[-28,0],[0,12],[0,-12]].every(([forward,side])=>sharkWater(x+Math.cos(heading)*forward-Math.sin(heading)*side,y+Math.sin(heading)*forward+Math.cos(heading)*side));
}
function beginPetDragonLanding(to,water=false){
const flight=dragonFlight;
flight.fromSwimming=flight.stage==='swimming';flight.startAltitude=flight.altitude;
flight.stage=water?'splashdown':'landing';flight.elapsed=0;flight.from={x:player.x,y:player.y};flight.to=to;keys.clear();updateWaterControls();
}
function landPetDragon(){
if(!dragonFlight)return;
if(dragonFlight.stage==='swimming'){
dragonFlight.stage='takeoff';dragonFlight.elapsed=0;keys.clear();updateWaterControls();return;
}
if(dragonFlight.stage!=='flying')return;
const to=petDragonLandingPoint();
if(to){beginPetDragonLanding(to);return;}
if(petDragonSwimWater(player.x,player.y)){if(!hasSwimPower()){toast('Solve a problem to restore energy before swimming with your dragon.');return;}beginPetDragonLanding({x:player.x,y:player.y},true);return;}
toast('Find clear ground or open water to land, or choose Return to cottage.');
}
function returnPetDragonHome(){
if(!dragonFlight)return;
player.x=PET_DRAGON_HOME.x;player.y=PET_DRAGON_HOME.y;
dragonFlight.stage='landing';dragonFlight.fromSwimming=false;dragonFlight.startAltitude=30;dragonFlight.elapsed=0;dragonFlight.altitude=30;dragonFlight.from={...PET_DRAGON_HOME};dragonFlight.to={...PET_DRAGON_HOME};keys.clear();updateWaterControls();
}
function advancePetDragon(dt){
if(dt<=0)return;
petDragonPhase+=dt*.007;advancePetDragonFire(dt);
if(!dragonFlight)return;
const flight=dragonFlight;flight.elapsed+=dt;
flight.swimWake=(flight.swimWake||[]).filter(w=>{w.age+=dt;return w.age<1400;});
if(flight.stage==='takeoff'){
const t=Math.min(1,flight.elapsed/650);flight.altitude=30*t*t*(3-2*t);
if(t===1){flight.stage='flying';flight.elapsed=0;}
}else if(flight.stage==='landing'||flight.stage==='splashdown'){
const t=Math.min(1,flight.elapsed/500),ease=t*t*(3-2*t);
player.x=flight.from.x+(flight.to.x-flight.from.x)*ease;player.y=flight.from.y+(flight.to.y-flight.from.y)*ease;flight.altitude=(flight.startAltitude??30)*(1-ease);
if(t===1){
if(flight.stage==='splashdown'){flight.stage='swimming';flight.elapsed=0;flight.waterEntryAge=0;flight.altitude=0;keys.clear();updateWaterControls();toast('Splashdown! Arrows / WASD swim. X or Take off returns to flight.');return;}
petDragonPosition={...flight.to};dragonFlight=null;if(flight.fromSwimming)startGoggleToss(flight.from);keys.clear();save();updateWaterControls();toast('Touchdown! Your pet dragon is waiting beside you for another flight.');
}
}else if(flight.stage==='swimming'){flight.altitude=0;flight.waterEntryAge=(flight.waterEntryAge||0)+dt;}
else flight.altitude=30+Math.sin(petDragonPhase*.55)*2;
}
function moveFlyingDragon(dx,dy){
if(!dragonFlight||!dx&&!dy)return;
if(dragonFlight.stage==='swimming'){moveSwimmingPetDragon(dx,dy);return;}
if(dragonFlight.stage!=='flying')return;
player.x=Math.max(WORLD.left+32,Math.min(WORLD.right-32,player.x+dx));player.y=Math.max(50,Math.min(WORLD.height-32,player.y+dy));
dragonFlight.heading=Math.atan2(dy,dx);faceMovement(dx,dy);
}
function moveSwimmingPetDragon(dx,dy){
const length=Math.hypot(dx,dy),heading=Math.atan2(dy,dx),flight=dragonFlight;
let remaining=length;
while(remaining>0){
const step=Math.min(2,remaining),x=player.x+dx/length*step,y=player.y+dy/length*step;
if(!petDragonSwimWater(x,y,heading)){
// Climb only onto permitted beach, keeping locked and boat-only islands gated.
for(let ahead=2;ahead<=36;ahead+=2){
const px=player.x+dx/length*ahead,py=player.y+dy/length*ahead,island=islandPolys.findIndex(p=>inside(px,py,p));
if(island<0)continue;
if(allIslands[island]?.boatOnly)return;
const to={x:px+dx/length*8,y:py+dy/length*8};
if(!swimmingTimberAt(player.x,player.y)&&!swimmingTimberAt(px,py)&&!swimmingTimberAt(to.x,to.y)&&inside(to.x,to.y,islandPolys[island])&&canWalk(to.x,to.y))beginPetDragonLanding(to);
return;
}
return;
}
player.x=x;player.y=y;flight.heading=heading;flight.swimDistance=(flight.swimDistance||0)+step;
if(flight.swimDistance>=6){flight.swimDistance%=6;(flight.swimWake??=[]).push({x:x-Math.cos(heading)*26,y:y-Math.sin(heading)*26,heading,age:0});flight.swimWake=flight.swimWake.slice(-36);}
remaining-=step;
}
faceMovement(dx,dy);
}
function drawPetDragonSwimWake(){
for(const w of dragonFlight?.swimWake||[]){
const t=w.age/1400,spread=5+t*11;ctx.save();ctx.translate(w.x,w.y);ctx.rotate(w.heading);ctx.globalAlpha=(1-t)*(1-t)*.4;ctx.strokeStyle='#e1f5e9';ctx.lineWidth=.9;
ctx.beginPath();ctx.moveTo(-5-t*9,-spread);ctx.quadraticCurveTo(-2,-spread*.7,3,-3);ctx.moveTo(-5-t*9,spread);ctx.quadraticCurveTo(-2,spread*.7,3,3);ctx.stroke();ctx.restore();
}
}
function advancePetDragonFire(dt){
if(dt<=0||document.querySelector('dialog[open]'))return;
for(const [vessel,blast] of boatExplosions){blast.elapsed+=dt;if(blast.elapsed>=BOAT_EXPLOSION_DURATION)boatExplosions.delete(vessel);}
for(const t of burnableTrees.values())if(t.burnAge!==null){
const elapsed=t.burnAge+dt;
t.burnAge=Math.min(TREE_BURN_DURATION,elapsed);
t.regrowAge=Math.min(TREE_REGROW_DURATION,t.regrowAge+Math.max(0,elapsed-TREE_BURN_DURATION));
if(t.regrowAge>=TREE_REGROW_DURATION){t.burnAge=null;t.regrowAge=0;}
}
if(petDragonFire){
petDragonFire.elapsed+=dt;
if(petDragonFire.elapsed>=petDragonFire.duration)petDragonFire=null;
else{checkPlayerDragonFireHit();checkTreeDragonFireHits();checkBoatDragonFireHits();}
return;
}
nextPetDragonFire-=dt;
if(nextPetDragonFire<=0){petDragonFire={elapsed:0,duration:850};nextPetDragonFire=2000+Math.random()*3000;}
}
function petDragonFireEnvelope(){
if(!petDragonFire)return 0;
const smooth=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);},t=petDragonFire.elapsed/petDragonFire.duration;
return smooth(t/.16)*smooth((1-t)/.32);
}
function checkPlayerDragonFireHit(){
if(!petDragonFire||petDragonFire.hitPlayer||playerHairEffect||dragonFlight||boating||swimming||wakeboardRide||surfSession||beachTransfer||shoreClimb||shoreRecovery)return;
const envelope=petDragonFireEnvelope(),length=58*envelope,mouth={x:petDragonPosition.x+26,y:petDragonPosition.y-1};
if(length<3||player.x+5<mouth.x||player.x-5>mouth.x+length)return;
const s=Math.max(0,Math.min(1,(player.x-mouth.x)/length)),time=petDragonFire.elapsed/1000;
const curl=Math.sin(s*13-time*16)*s*2.5+Math.sin(s*29-time*24)*s*s*1.7;
const spread=(.8+8*Math.sin(Math.PI*Math.pow(s,.75)))*(1-.7*s)+2;
const feetY=player.y-(walkableTimberAt(player.x,player.y)?3:0),fireY=mouth.y+curl;
if(feetY+2<fireY-spread||feetY-21>fireY+spread)return;
petDragonFire.hitPlayer=true;playerHairEffect={elapsed:0};
}
function advancePlayerHairEffect(dt){
if(!playerHairEffect||dt<=0||document.querySelector('dialog[open]'))return;
playerHairEffect.elapsed+=dt;
if(playerHairEffect.elapsed>=1700)playerHairEffect=null;
}
function drawPlayerHairEffect(){
if(!playerHairEffect||boating||swimming||dragonFlight||surfSession||wakeboardRide||shoreClimb||shoreRecovery||beachTransfer)return;
const elapsed=playerHairEffect.elapsed,x=player.x,y=player.y-21-(walkableTimberAt(player.x,player.y)?3:0);
ctx.save();
if(elapsed<650){
const flicker=Math.sin(elapsed*.025)*1.2;
ctx.globalAlpha=Math.min(1,(650-elapsed)/120);
polygon([[x-3,y+1],[x-2,y-3],[x-1,y-7-flicker],[x+1,y-3],[x+3,y-6+flicker],[x+3,y],[x+1,y+2]],'#e88437');
polygon([[x-1,y+1],[x,y-4-flicker*.5],[x+2,y],[x+1,y+2]],'#ffe293');
}else{
for(let i=0;i<5;i++){
const age=elapsed-650-i*130,life=1050-i*130;if(age<0||age>=life)continue;
const t=age/life,spread=1+t*4;
ctx.globalAlpha=Math.sin(t*Math.PI)*Math.pow(1-t,1.2)*.6;
// Expanding puffs lift into a taller column and become transparent as they rise.
ellipse(x+Math.sin(i*1.9+t*3)*spread+age*.002,y-3-age*.03,2.2+t*4.8,2.4+t*3.7,i%2?'#a4a59d':'#92938b');
}
}
ctx.restore();
}
function drawPetDragonFire(){
if(!petDragonFire)return;
const elapsed=petDragonFire.elapsed;
const envelope=petDragonFireEnvelope(),length=58*envelope;
if(envelope<=0)return;
ctx.save();ctx.translate(26,-1);
rect(-3,0,3,2,'#523d59');
drawDragonFlame(elapsed,envelope,length,dragonFlight?.heading||0);
ctx.restore();
}
// Share rippling flame layers, tongues and embers between dragon breath and trees.
function drawDragonFlame(elapsed,envelope,length=58,heading=0){
if(envelope<=0)return;
const time=elapsed/1000;
ctx.save();
// Convect the ripples away from the mouth, with a narrow hot jet and cooler edges.
const curl=s=>Math.sin(s*13-time*16)*s*2.5+Math.sin(s*29-time*24)*s*s*1.7;
ctx.globalAlpha=envelope*.08;ellipse(length*.45,0,length*.62,13,'#ffb34c');
for(const [reach,width,color,opacity] of [[1,8,'#dd5d2e',.68],[.92,6.4,'#f48732',.9],[.78,4.3,'#ffc75b',1],[.43,1.8,'#fff2b1',1]]){
ctx.globalAlpha=envelope*opacity;ctx.fillStyle=color;ctx.beginPath();
for(let i=0;i<=18;i++){
const s=i/18,x=s*length*reach;
const spread=(.8+width*Math.sin(Math.PI*Math.pow(s,.75)))*(1-.7*s);
const y=curl(s*reach)-spread*(.88+.12*Math.sin(s*23-time*30));
if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
}
for(let i=18;i>=0;i--){const s=i/18,spread=(.8+width*Math.sin(Math.PI*Math.pow(s,.75)))*(1-.7*s);ctx.lineTo(s*length*reach,curl(s*reach)+spread*(.85+.15*Math.sin(s*19-time*26+2)));}
ctx.closePath();ctx.fill();
}
// Detached flame tongues stretch and cool as they move beyond the main plume.
for(let i=0;i<7;i++){
const age=elapsed-i*62;if(age<0||age>500)continue;
const progress=age/500,x=8+progress*59,y=curl(progress)+(i%2?1:-1)*progress*5;
ctx.globalAlpha=Math.sin(progress*Math.PI)*envelope*.65;
ctx.fillStyle=i%2?'#ee8939':'#f9b74e';ctx.beginPath();ctx.moveTo(x-5,y);
ctx.quadraticCurveTo(x,y-3,x+8+progress*5,y-1);ctx.quadraticCurveTo(x+2,y+3,x-5,y);ctx.fill();
}
// Ember lift is screen-up, even when the dragon turns its head in flight.
const upright=Math.cos(heading)<0?-1:1;
for(let i=0;i<9;i++){
const age=elapsed-i*49;if(age<0||age>650)continue;
const progress=age/650,lift=progress*progress*14;
ctx.globalAlpha=Math.sin(progress*Math.PI)*(1-progress)*.85;
const x=5+progress*76-Math.sin(heading)*lift,y=Math.sin(i*2.1)*progress*8-Math.cos(heading)*lift*upright;
rect(x,y,progress<.55?2:1,1,i%3?'#ffce73':'#fff0ab');
}
for(let i=0;i<3;i++){
const age=elapsed-400-i*90;if(age<0)continue;
const drift=age/600;ctx.globalAlpha=Math.max(0,1-drift)*.055;
ellipse(48+drift*12-Math.sin(heading)*drift*15,-Math.cos(heading)*drift*15*upright,4+drift*5,2+drift*3,'#777477');
}
ctx.restore();
}
function drawPetDragon(){
const flight=dragonFlight,x=flight?player.x:petDragonPosition.x,y=flight?player.y:petDragonPosition.y;
const inWater=flight?.stage==='swimming',height=flight?flight.altitude:0,heading=flight?flight.heading:0,flap=Math.sin(petDragonPhase),wing=inWater?5+flap*.8:flight?15+flap*8:7;
drawPetDragonSwimWake();
if(inWater&&flight.waterEntryAge<650){const t=flight.waterEntryAge/650;ctx.save();ctx.globalAlpha=(1-t)*.65;ctx.strokeStyle='#e0f6ea';ctx.lineWidth=.9;ctx.beginPath();ctx.ellipse(x,y,12+t*16,5+t*6,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
ellipse(x+height*.2,y+5,flight?22-height*.15:20,flight?7:6,inWater?'#377c8a44':'#315b4844');
const shake=petDragonWet&&petDragonWet.elapsed>=800&&petDragonWet.elapsed<2000?Math.sin((petDragonWet.elapsed-800)*.045)*.12:0;
ctx.save();ctx.translate(x+shake*12,y-height);ctx.rotate(heading+shake);
// Mirror the left-facing view so horns, face, and saddle remain upright.
if(Math.cos(heading)<0)ctx.scale(1,-1);
// Violet scales and golden wing membranes distinguish this pet from Nessie.
for(const side of [-1,1]){
polygon([[-7,side*3],[-13,side*(wing+9)],[2,side*(wing+5)],[12,side*8],[4,side*3]],'#69528c');
polygon([[-5,side*4],[-10,side*(wing+5)],[1,side*(wing+2)],[8,side*7]],'#d9b675');
ctx.strokeStyle='#8a6b9d';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-5,side*4);ctx.lineTo(1,side*(wing+2));ctx.stroke();
}
polygon([[-13,1],[-28,Math.sin(petDragonPhase*.7)*3],[-34,4+Math.sin(petDragonPhase*.7)*3],[-20,6],[-10,5]],'#7b609c');
ellipse(-1,1,16,7,'#8e73ad');ellipse(3,3,9,3,'#cfb889');
for(let i=0;i<4;i++)polygon([[-14+i*6,-3],[-12+i*6,-8],[-10+i*6,-3]],'#d9bd7d');
for(const side of [-1,1]){const paddle=inWater?Math.sin(petDragonPhase+side)*3:0;rect(-8+paddle,side*7,5,3,'#69528c');rect(6-paddle,side*6,5,3,'#69528c');}
ellipse(14,-2,8,6,'#977eb7');rect(17,-4,9,6,'#977eb7');rect(13,-10,2,4,'#ebd69a');rect(19,-10,2,4,'#ebd69a');
ellipse(20,-4,1,1,'#243d40');rect(24,-2,1,1,'#5c4778');rect(19,2,6,1,'#66517e');drawPetDragonFire();
rect(-5,-3,8,7,'#69513e');rect(-4,-3,6,2,'#e6c686');
drawPetDragonWater();
if(inWater){ctx.globalAlpha=.5;ctx.strokeStyle='#d3efe3';ctx.lineWidth=.8;ctx.beginPath();ctx.ellipse(0,2,21,7,0,0,Math.PI);ctx.stroke();ctx.globalAlpha=1;}ctx.restore();
if(flight){character(x,y-height-4);if(inWater)directionalSwimGear(x,y-19);}
else{ctx.fillStyle='#f7e3ad';ctx.font='bold 8px monospace';ctx.textAlign='center';ctx.fillText('PET DRAGON',x,y-34);}
}
$('#mapDragonMount').onclick=mountPetDragon;$('#mapDragonLand').onclick=landPetDragon;$('#mapDragonHome').onclick=returnPetDragonHome;
// Rare sightings are timed in active play, never rerolled every frame.
let lochDragon=null,nextLochDragon=30000+Math.random()*30000,dragonLatchCooldown=0;
function clearLochDragon(){lochDragon=null;nextLochDragon=30000+Math.random()*30000;dragonLatchCooldown=0;}
function advanceLochDragon(dt){
if(dt<=0||document.querySelector('dialog[open]'))return;
dragonLatchCooldown=Math.max(0,dragonLatchCooldown-dt);
if(lochDragon){
lochDragon.age+=dt;
if(lochDragon.age>=lochDragon.duration){lochDragon=null;return;}
const step=.018*dt,x=lochDragon.x+Math.cos(lochDragon.heading)*step,y=lochDragon.y+Math.sin(lochDragon.heading)*step;
if(sharkWater(x,y)&&sharkWater(x+Math.cos(lochDragon.heading)*25,y+Math.sin(lochDragon.heading)*25)){
lochDragon.x=x;lochDragon.y=y;
}else lochDragon.heading+=Math.min(dt*.001,Math.PI/2);
return;
}
if(sharkRide||voyage||diveAnimation||shoreClimb)return;
nextLochDragon-=dt;if(nextLochDragon>0)return;
nextLochDragon=30000+Math.random()*30000;
if(Math.random()>.7)return;
for(let attempt=0;attempt<24;attempt++){
const angle=Math.random()*Math.PI*2,distance=70+Math.random()*65;
const x=player.x+Math.cos(angle)*distance,y=player.y+Math.sin(angle)*distance,heading=angle+Math.PI/2;
// The whole silhouette and its short route must fit in open water.
if(![-30,0,30,55].every(d=>sharkWater(x+Math.cos(heading)*d,y+Math.sin(heading)*d)))continue;
lochDragon={x,y,heading,age:0,duration:18000};break;
}
}
function latchLochDragon(){
if(!hasSwimPower()||!lochDragon||!swimming||boating||voyage||diveAnimation||shoreClimb||sharkRide||dragonLatchCooldown>0||document.querySelector('dialog[open]'))return;
if(lochDragon.age<500||lochDragon.duration-lochDragon.age<700||Math.hypot(lochDragon.x-player.x,lochDragon.y-player.y)>22)return;
sharkRide={kind:'dragon',x:player.x,y:player.y,heading:lochDragon.heading,distance:0,phase:0,diveElapsed:0,surfaceWake:[],surfaceDistance:0};
lochDragon=null;sharkWake=[];closeMapPanel();keys.clear();updateWaterControls();
toast('You caught the rare Loch Ness monster! Arrows / WASD steer. X or Hop off returns you to swimming.');
}
function drawLochDragonBody(x,y,heading,phase=0,surface=1,ridden=false){
ctx.save();ctx.translate(x,y);ctx.rotate(heading);
// A traveling wave passes from neck to tail rather than bobbing the whole body.
const wave=along=>Math.sin(phase+along*.085)*2.8;
ctx.globalAlpha=surface*.28;ctx.strokeStyle='#c7e5d6';ctx.lineWidth=.6;
ctx.beginPath();ctx.moveTo(-32,-3);ctx.quadraticCurveTo(-24,-5,-19,-2);ctx.moveTo(-32,3);ctx.quadraticCurveTo(-24,5,-19,2);ctx.stroke();
// The connecting body stays underwater, leaving two separate humps above it.
ctx.globalAlpha=surface*.18;
ctx.strokeStyle='#3c7867';ctx.lineWidth=7;ctx.beginPath();
ctx.moveTo(-32,wave(-32));ctx.bezierCurveTo(-22,wave(-22),-9,wave(-9),3,wave(3));ctx.quadraticCurveTo(12,wave(12),17,wave(17));ctx.stroke();
ctx.globalAlpha=surface*(ridden?1:.85);
polygon([[-24,wave(-24)],[-36,wave(-36)-1],[-31,wave(-31)+2],[-23,wave(-23)+2]],'#477e68');
for(const [center,width,height] of [[-16,7,10],[2,8,12]]){
const sway=wave(center);
ctx.fillStyle='#52866b';ctx.beginPath();ctx.moveTo(center-width,sway+1);
ctx.bezierCurveTo(center-width,sway-height,center+width-2,sway-height,center+width,sway+1);
ctx.quadraticCurveTo(center,sway+3,center-width,sway+1);ctx.fill();
ctx.strokeStyle='#8bb08a';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(center-width+2,sway-2);ctx.quadraticCurveTo(center-1,sway-height+1,center+width-3,sway-3);ctx.stroke();
ctx.globalAlpha=surface*.35;ctx.strokeStyle='#cae8d8';ctx.lineWidth=.6;ctx.beginPath();ctx.ellipse(center,sway+2,width+2,1.7,0,0,Math.PI);ctx.stroke();ctx.globalAlpha=surface*(ridden?1:.85);
}
// A smooth S-neck and rounded, hornless head look along the travel axis.
const neck=wave(22)*.65;
ctx.strokeStyle='#5d9274';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(13,wave(13)+1);
ctx.bezierCurveTo(25,neck+3,20,neck-11,29,neck-12);ctx.stroke();
ellipse(31,neck-12,5,3.3,'#6d9f7d');rect(33,neck-13,7,3,'#6d9f7d');
ellipse(33,neck-13,1,1,'#183d35');rect(38,neck-13,1,1,'#315b48');rect(35,neck-10,5,1,'#416d55');
ctx.restore();
}
function drawLochDragon(){
if(!lochDragon)return;
const surface=Math.max(0,Math.min(1,lochDragon.age/900,(lochDragon.duration-lochDragon.age)/1600));
drawLochDragonBody(lochDragon.x,lochDragon.y,lochDragon.heading,lochDragon.age*.002,surface);
}
let blueMarlins=[],nextBlueMarlin=7000+Math.random()*7000,marlinLatchCooldown=0;
function clearBlueMarlin(){blueMarlins=[];nextBlueMarlin=7000+Math.random()*7000;marlinLatchCooldown=0;}
function advanceBlueMarlin(dt){
if(dt<=0)return;
marlinLatchCooldown=Math.max(0,marlinLatchCooldown-dt);
if(!swimming){blueMarlins=[];return;}
if(diveAnimation||shoreClimb||shoreRecovery||sharkRide?.landing)return;
blueMarlins=blueMarlins.filter(f=>{
f.age+=dt;
advanceSeaFishCruise(f,dt,.028,'marlin');
return f.age<f.duration&&(!f.escapeDive||f.escapeDive.elapsed<f.escapeDive.duration)&&Math.hypot(f.x-player.x,f.y-player.y)<220;
});
nextBlueMarlin-=dt;if(nextBlueMarlin>0||blueMarlins.length>=2)return;
nextBlueMarlin=10000+Math.random()*10000;
for(let attempt=0;attempt<20;attempt++){
const angle=Math.random()*Math.PI*2,distance=55+Math.random()*45,heading=angle+Math.PI/2;
const x=player.x+Math.cos(angle)*distance,y=player.y+Math.sin(angle)*distance;
if(![0,16].every(d=>seaFishPoseClear(x+Math.cos(heading)*d,y+Math.sin(heading)*d,heading,'marlin')))continue;
blueMarlins.push({x,y,heading,age:0,duration:20000});break;
}
}
function latchBlueMarlin(){
if(!hasSwimPower())return;
if(!swimming||boating||voyage||diveAnimation||shoreClimb||shoreRecovery||sharkRide||marlinLatchCooldown>0||document.querySelector('dialog[open]'))return;
const fish=blueMarlins.find(f=>!f.escapeDive&&f.age>=300&&f.duration-f.age>500&&Math.hypot(f.x-player.x,f.y-player.y)<=22);
if(!fish)return;
sharkRide={kind:'marlin',x:player.x,y:player.y,heading:fish.heading,wake:fish.wake||[],distance:0,phase:fish.phase||0,diveElapsed:0,surfaceWake:[],surfaceDistance:0};
blueMarlins=blueMarlins.filter(f=>f!==fish);sharkWake=[];faceMovement(Math.cos(fish.heading),Math.sin(fish.heading));
closeMapPanel();keys.clear();updateWaterControls();toast('Blue marlin ride! Arrows / WASD steer. X or Hop off returns you to swimming.');
}
// One water-plane model for sharks and marlins. Height always projects screen-up.
function seaFishPoint(x,y,heading,along,across,height=0){
return {x:x+Math.cos(heading)*along-Math.sin(heading)*across,y:y+Math.sin(heading)*along+Math.cos(heading)*across-height};
}
function seaFishBend(along,phase){
const t=Math.max(0,Math.min(1,(14-along)/46));
return Math.sin(phase-t*2.8)*t*t*4.4;
}
function seaFishHull(x,y,heading,kind='shark'){
// Two pixels beyond the silhouette allow close passes without fin or bill contact.
const front=kind==='marlin'?44:27;
return [[front,0],[21,-7],[7,-9],[-10,-17],[-15,-7],[-39,-19],[-39,19],[-15,7],[-10,17],[7,9],[21,7]].map(([u,v])=>{
const p=seaFishPoint(x,y,heading,u,v);return [p.x,p.y];
});
}
function seaFishBoatObstacles(){return boatObstacles('seaFish');}
function seaFishPoseClear(x,y,heading,kind='shark'){
const hull=seaFishHull(x,y,heading,kind);
if(hull.some(([px,py])=>px<WORLD.left+2||py<2||px>WORLD.right-2||py>WORLD.height-2))return false;
if(islandPolys.some(poly=>boatPolygonsOverlap(hull,poly)))return false;
const timber=[...activePiers(),...activeSharkBridges()];
if(timber.some(b=>boatPolygonsOverlap(hull,[[b.x-2,b.y-2],[b.x+b.w+2,b.y-2],[b.x+b.w+2,b.y+b.h+2],[b.x-2,b.y+b.h+2]])))return false;
return !seaFishBoatObstacles().some(poly=>boatPolygonsOverlap(hull,poly));
}
function seaFishRouteRoom(fish,speed,turn,kind){
let x=fish.x,y=fish.y,heading=fish.heading;
// Predict the whole moving silhouette through a turn, rather than only its nose.
for(let elapsed=100;elapsed<=1600;elapsed+=100){
heading+=turn*SHARK_TURN_RATE*.1;
x+=Math.cos(heading)*speed*100;y+=Math.sin(heading)*speed*100;
if(!seaFishPoseClear(x,y,heading,kind))return elapsed-100;
}
return 1600;
}
function startSeaFishEscapeDive(fish,kind){
if(fish.escapeDive)return;
const rise=kind==='marlin'?2400:2000,fall=kind==='marlin'?3200:2600;
const t=Math.max(0,Math.min(1,fish.age/rise,(fish.duration-fish.age)/fall));
fish.escapeDive={elapsed:0,duration:fall,depth:1-t*t*(3-2*t),resurfacing:fish.age<rise};
}
function advanceSeaFishCruise(fish,dt,speed,kind='shark'){
fish.heading??=Math.atan2(fish.vy,fish.vx);
if(fish.escapeDive)fish.escapeDive.elapsed+=dt;
advanceSeaFishSwim(fish,dt,0);
fish.avoidFor=Math.max(0,(fish.avoidFor||0)-dt);
const forwardRoom=seaFishRouteRoom(fish,speed,0,kind);
if(fish.avoidTurn&&fish.avoidFor===0&&forwardRoom===1600)fish.avoidTurn=0;
if(forwardRoom<1600||fish.avoidTurn){
const left=seaFishRouteRoom(fish,speed,-1,kind),right=seaFishRouteRoom(fish,speed,1,kind);
// No usable arc ahead: submerge before the animal is pinned against an object.
if(forwardRoom<1000&&Math.max(left,right)<500)startSeaFishEscapeDive(fish,kind);
const preferred=fish.avoidTurn||1,preferredRoom=preferred>0?right:left,otherRoom=preferred>0?left:right;
if(!fish.avoidTurn||otherRoom>preferredRoom){
fish.avoidTurn=right===left?preferred:right>left?1:-1;fish.avoidFor=650;
}
}
for(let remaining=dt;remaining>0;){
const elapsed=Math.min(16,remaining),step=speed*elapsed;remaining-=elapsed;
const heading=fish.heading+(fish.avoidTurn||0)*SHARK_TURN_RATE*elapsed/1000;
const x=fish.x+Math.cos(heading)*step,y=fish.y+Math.sin(heading)*step;
// Collision checks remain a final guard; prediction starts the swimming arc early.
if(seaFishPoseClear(x,y,heading,kind)){fish.heading=heading;fish.x=x;fish.y=y;advanceSeaFishSwim(fish,0,step);}
else{
startSeaFishEscapeDive(fish,kind);
if(seaFishPoseClear(fish.x,fish.y,heading,kind))fish.heading=heading;
fish.phase=(fish.phase||0)+elapsed*.003;
}
}
}
function advanceSeaFishSwim(fish,dt,distance){
fish.phase=(fish.phase||0)+distance*.115;
fish.wake=(fish.wake||[]).filter(w=>{w.age+=dt;return w.age<1500;});
fish.wakeDistance=(fish.wakeDistance||0)+distance;
if(distance>0&&fish.wakeDistance>=3){
fish.wakeDistance%=3;
const heading=fish.heading??Math.atan2(fish.vy,fish.vx);
const tail=seaFishPoint(fish.x,fish.y,heading,-28,seaFishBend(-28,fish.phase));
fish.wake.push({...tail,heading,age:0});
}
fish.wake=fish.wake.slice(-56);
}
function drawSeaFishWake(fish,opacity=1){
for(const w of fish.wake||[]){
if(underSharkBridge(w.x,w.y))continue;
const t=w.age/1500,spread=1.5+t*12;
ctx.save();ctx.globalAlpha=opacity*(1-t)*(1-t)*.24;ctx.strokeStyle='#d8f3eb';ctx.lineWidth=.7;
// These points stay in world space: a turn leaves a curved trail behind it.
for(const side of [-1,1]){
const a=seaFishPoint(w.x,w.y,w.heading,-2-t*5,side*spread),b=seaFishPoint(w.x,w.y,w.heading,2,side*(spread*.65));
ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
}ctx.restore();
}
}
function drawSeaFishBody(x,y,heading,phase=0,opacity=1,kind='shark'){
const marlin=kind==='marlin',back=marlin?'#387eaa':'#658794',fin=marlin?'#2c5e84':'#416674';
const point=(u,v,z=0)=>{const p=seaFishPoint(x,y,heading,u,v+seaFishBend(u,phase),z);return [p.x,p.y];};
const shape=(points,color)=>polygon(points.map(([u,v,z])=>point(u,v,z||0)),color);
ctx.save();
// A soft submerged silhouette follows the fish; the light offset never rotates.
ctx.globalAlpha=opacity*.10;
for(const [spread,alpha] of [[1.2,.07],[1,.12]]){
ctx.globalAlpha=opacity*alpha;
const shadow=[];
for(let i=0;i<=20;i++){const u=24-i*2.8,t=i/20,w=Math.sin(Math.PI*t)*7*spread;shadow.push(point(u,-w));}
for(let i=20;i>=0;i--){const u=24-i*2.8,t=i/20,w=Math.sin(Math.PI*t)*7*spread;shadow.push(point(u,w));}
polygon(shadow.map(([px,py])=>[px+3,py+5]),'#244f65');
}
ctx.globalAlpha=opacity*.48;
shape([[7,-3],[-9,-15],[-5,-5],[-13,-3]],fin);
shape([[7,3],[-9,15],[-5,5],[-13,3]],fin);
// A delayed traveling wave grows toward the tail; the head remains steady.
shape([[-22,0],[-37,-(marlin?12:10)],[-33,-2],[-29,0],[-33,2],[-37,marlin?12:8]],fin);
const outline=[];
for(let i=0;i<=24;i++){const u=25-i*2,t=i/24;outline.push(point(u,-(.65+Math.sin(Math.PI*t)*6.3)));}
for(let i=24;i>=0;i--){const u=25-i*2,t=i/24;outline.push(point(u,.65+Math.sin(Math.PI*t)*6.3));}
ctx.globalAlpha=opacity*.72;polygon(outline,back);
// Screen-space illumination keeps the same side bright through every heading.
ctx.save();ctx.beginPath();outline.forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));ctx.closePath();ctx.clip();
ctx.globalAlpha=opacity*.24;ctx.strokeStyle='#d4e8e7';ctx.lineWidth=3;ctx.beginPath();
for(let i=0;i<=20;i++){const [px,py]=point(23-i*2.3,0);if(i===0)ctx.moveTo(px-1.5,py-2);else ctx.lineTo(px-1.5,py-2);}ctx.stroke();ctx.restore();
if(marlin){ctx.globalAlpha=opacity*.8;shape([[19,-1],[42,0],[19,1]],'#578da8');}
ctx.globalAlpha=opacity*.45;ctx.strokeStyle=marlin?'#91c6d9':'#355963';ctx.lineWidth=.65;
for(let i=0;i<(marlin?6:5);i++){
const u=(marlin?9:12)-i*2.5,a=point(u,-4),b=point(u,4);ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();
}
// The dorsal fin is a vertical sail, never a flat triangle spinning underwater.
ctx.globalAlpha=opacity;
const dorsal=[[7,0],[-7,0],[-2,0,marlin?15:12],[2,0,marlin?9:5]].map(([u,v,z])=>point(u,v,z||0));
// Retain a narrow edge in a head-on view.
if(Math.abs(Math.cos(heading))<.12){dorsal[0][0]+=.6;dorsal[1][0]-=.6;}
polygon(dorsal,fin);
ctx.save();ctx.beginPath();dorsal.forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));ctx.closePath();ctx.clip();
ctx.globalAlpha=opacity*.38;ctx.strokeStyle='#a1bbc5';ctx.lineWidth=1;
const tip=dorsal[2],left=dorsal.reduce((a,b)=>a[0]<b[0]?a:b);
ctx.beginPath();ctx.moveTo(tip[0]-.4,tip[1]);ctx.lineTo(left[0]-.4,left[1]);ctx.stroke();ctx.restore();
for(const side of [-1,1]){const eye=point(19,side*2.8);ctx.globalAlpha=opacity*.8;ellipse(eye[0],eye[1],.8,.8,'#183e48');}
// Small bow waves attach to the waterline, independently of the raised fin.
ctx.globalAlpha=opacity*.3;ctx.strokeStyle='#d4eee6';ctx.lineWidth=.65;
for(const side of [-1,1]){const a=point(15,side*4),b=point(6,side*8),c=point(-3,side*8);ctx.beginPath();ctx.moveTo(...a);ctx.quadraticCurveTo(...b,...c);ctx.stroke();}
ctx.restore();
}
function drawBlueMarlinBody(x,y,heading,phase,opacity=1){drawSeaFishBody(x,y,heading,phase,opacity,'marlin');}
function drawWildSeaFish(fish,kind){
const marlin=kind==='marlin',rise=marlin?2400:2000,fall=marlin?3200:2600;
const t=Math.max(0,Math.min(1,fish.age/rise,(fish.duration-fish.age)/fall));
const dive=fish.escapeDive,progress=dive?Math.min(1,dive.elapsed/dive.duration):0;
const surface=dive?1-progress*progress*(3-2*progress):t*t*(3-2*t);
const heading=fish.heading??Math.atan2(fish.vy,fish.vx);
drawSeaFishWake(fish,surface*(dive?1-dive.depth:1));
drawSeaMountTransition(fish.x,fish.y,heading,1-surface,dive?false:fish.age<rise,marlin?44:29,
opacity=>drawSeaFishBody(fish.x,fish.y,heading,fish.phase,opacity*(marlin?.75:.8),kind),dive);

}
function drawBlueMarlins(){for(const fish of blueMarlins)drawWildSeaFish(fish,'marlin');}
function clearSharkRide(){sharkRide=null;sharkWake=[];sharkLatchCooldown=0;}
function sharkWater(x,y){return x>WORLD.left+15&&x<WORLD.right-15&&y>15&&y<WORLD.height-15&&!islandPolys.some(p=>inside(x,y,p));}
function latchShark(){
if(!hasSwimPower()||!swimming||boating||voyage||diveAnimation||shoreClimb||sharkRide||sharkLatchCooldown>0||document.querySelector('dialog[open]'))return;
const fin=sharkFins.filter(f=>!f.escapeDive&&f.age>=150&&f.duration-f.age>300&&Math.hypot(f.x-player.x,f.y-player.y)<=SHARK_LATCH_DISTANCE).sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0];
if(!fin)return;
// Stay at the swimmer's position rather than jumping across nearby land.
sharkRide={x:player.x,y:player.y,heading:Math.atan2(fin.vy,fin.vx),wake:fin.wake||[],distance:0,phase:fin.phase||0,diveElapsed:0,surfaceWake:[],surfaceDistance:0};sharkFins=sharkFins.filter(f=>f!==fin);sharkWake=[];
faceMovement(Math.cos(sharkRide.heading),Math.sin(sharkRide.heading));
closeMapPanel();keys.clear();updateWaterControls();toast('You latched onto a shark! Arrows / WASD guide your shark. X or Hop off returns you to swimming.');
}
function dismountShark(){
if(!sharkRide||sharkRide.landing)return;
const heading=sharkRide.heading,isDragon=sharkRide.kind==='dragon',isMarlin=sharkRide.kind==='marlin';
if(isDragon)dragonLatchCooldown=2500;
if(isMarlin)marlinLatchCooldown=2000;
if(!isDragon&&!isMarlin)sharkFins.push({x:player.x,y:player.y,vx:Math.cos(heading)*.024,vy:Math.sin(heading)*.024,age:2000,duration:7950});
sharkRide=null;sharkWake=[];sharkLatchCooldown=1500;keys.clear();save();updateWaterControls();canvas.focus({preventScroll:true});toast(isMarlin?'Back in the water! Your blue marlin swims away.':isDragon?'The Loch Ness monster slips beneath the water. What a lucky ride!':'Back in the water! Swim to shore or catch another shark.');
}
function activeSharkBridges(){return state.upgrades.includes('bridge')?[...crossings,woodlandBridge]:crossings;}
function underSharkBridge(x,y,padding=0){
return activeSharkBridges().some(b=>x>=b.x-padding&&x<=b.x+b.w+padding&&y>=b.y-padding&&y<=b.y+b.h+padding);
}
function sharkBridgeDepth(ride){
if(!Number.isFinite(ride?.x)||!Number.isFinite(ride?.y))return 0;
let depth=0;
for(const b of activeSharkBridges()){
const distance=Math.hypot(Math.max(b.x-ride.x,0,ride.x-b.x-b.w),Math.max(b.y-ride.y,0,ride.y-b.y-b.h));
const t=Math.max(0,Math.min(1,(distance-24)/48));depth=Math.max(depth,1-t*t*(3-2*t));
}
return depth;
}
function sharkBridgeAhead(heading){
for(let distance=0;distance<=60;distance+=2){
const x=player.x+Math.cos(heading)*distance,y=player.y+Math.sin(heading)*distance;
if(underSharkBridge(x,y,2))return true;
if(islandPolys.some(p=>inside(x,y,p)))return false;
}
return false;
}
function sharkShoreLanding(heading){
// Timber above the water is an underpass, rather than a beach landing.
if(swimmingTimberAt(player.x,player.y)||sharkBridgeAhead(heading))return null;
// Begin near the beach so the rider only travels a short distance to shore.
const dx=Math.cos(heading),dy=Math.sin(heading);
for(let distance=2;distance<=30;distance+=2){
const x=player.x+dx*distance,y=player.y+dy*distance;
const island=islandPolys.findIndex(poly=>inside(x,y,poly));
if(island<0)continue;

// Roll a little way onto the beach, away from the water's edge.
for(let inset=4;inset<=8;inset+=2){
const to={x:x+dx*inset,y:y+dy*inset};
if(!swimmingTimberAt(x,y)&&!swimmingTimberAt(to.x,to.y)&&inside(to.x,to.y,islandPolys[island])&&canWalk(to.x,to.y))return to;
}
return null;
}
return null;
}
function advanceSharkLanding(dt){
const landing=sharkRide.landing;landing.elapsed+=dt;
const t=Math.max(0,Math.min(1,landing.elapsed/landing.duration)),ease=1.5*t-.5*t*t*t;
player.x=landing.from.x+(landing.to.x-landing.from.x)*ease;
player.y=landing.from.y+(landing.to.y-landing.from.y)*ease;
// Carry the shark forward beneath the water as the rider rolls off its back.
const glide=8*ease;
sharkRide.x=landing.from.x+Math.cos(sharkRide.heading)*glide;
sharkRide.y=landing.from.y+Math.sin(sharkRide.heading)*glide;
if(t===1){
const name=sharkRide.kind==='dragon'?'Loch Ness monster':sharkRide.kind==='marlin'?'blue marlin':'shark',heading=sharkRide.heading;
shoreRecovery={elapsed:Math.max(0,landing.elapsed-landing.duration),heading};
swimming=false;startGoggleToss(landing.from);clearSharkRide();keys.clear();save();advanceShoreRecovery(0);updateWaterControls();
toast(`Your ${name} dives back into the sea. Catch your breath, shake it off, and get back up.`);
}
}
function advanceSharkRide(dt){
if(!sharkRide||dt<=0)return;
if(sharkRide.landing){advanceSharkLanding(dt);return;}
const previousDepth=sharkDiveDepth();
sharkRide.diveElapsed=(sharkRide.diveElapsed||0)+dt;
advanceSeaFishSwim(sharkRide,dt,0);
sharkRide.surfaceWake=(sharkRide.surfaceWake||[]).filter(w=>{w.age+=dt;return w.age<1100;});
sharkWake=sharkWake.filter(w=>{w.age+=dt;return w.age<900;});
const dx=(keys.has('right')||keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('left')||keys.has('a')||keys.has('arrowleft')?1:0),dy=(keys.has('down')||keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('up')||keys.has('w')||keys.has('arrowup')?1:0);
// Integrate turns in small time steps so steering follows a gentle arc.
let remaining=dt;
while(remaining>0){
const elapsed=Math.min(16,remaining),step=SHARK_RIDE_SPEED*elapsed,heading=sharkRide.heading;
const shore=sharkShoreLanding(heading);
if(shore){sharkRide.x=player.x;sharkRide.y=player.y;sharkRide.landing={elapsed:0,from:{x:player.x,y:player.y},to:shore,duration:280};keys.clear();advanceSharkLanding(remaining);return;}
let target=dx||dy?Math.atan2(dy,dx):heading;
const clear=angle=>[step,12,24].every(distance=>sharkWater(player.x+Math.cos(angle)*distance,player.y+Math.sin(angle)*distance));
if(!clear(target)){
const turn=[0,Math.PI/4,-Math.PI/4,Math.PI/2,-Math.PI/2,Math.PI].find(angle=>clear(heading+angle));
if(turn!==undefined)target=heading+turn;
}
const difference=Math.atan2(Math.sin(target-heading),Math.cos(target-heading)),limit=SHARK_TURN_RATE*elapsed/1000;
sharkRide.heading+=Math.max(-limit,Math.min(limit,difference));
const x=player.x+Math.cos(sharkRide.heading)*step,y=player.y+Math.sin(sharkRide.heading)*step;
remaining-=elapsed;
// Wait for the turn to clear the shoreline instead of snapping sideways.
if(!sharkWater(x,y))continue;
player.x=x;player.y=y;sharkRide.distance+=step;advanceSeaFishSwim(sharkRide,0,step);
sharkRide.surfaceDistance=(sharkRide.surfaceDistance||0)+step;
if(sharkRide.surfaceDistance>=4){
sharkRide.surfaceDistance%=4;const depth=sharkDiveDepth();
if(depth>0&&depth<1)sharkRide.surfaceWake.push({kind:'body',x:player.x,y:player.y+1,heading:sharkRide.heading,age:0,strength:.35+.65*Math.sin(depth*Math.PI)});
if(depth>.2)sharkRide.surfaceWake.push({kind:'snorkel',x:player.x+(player.facing==='left'?-7:7),y:player.y-17+depth*16,heading:sharkRide.heading,age:0,strength:depth});
}
if(sharkRide.distance>=7){sharkRide.distance-=7;sharkWake.push({x:player.x-Math.cos(sharkRide.heading)*29,y:player.y-Math.sin(sharkRide.heading)*29,heading:sharkRide.heading,age:0});}
}
faceMovement(Math.cos(sharkRide.heading),Math.sin(sharkRide.heading));
sharkRide.x=player.x;sharkRide.y=player.y;sharkWake=sharkWake.slice(-32);
sharkRide.resurfacing=sharkDiveDepth()<previousDepth;
sharkRide.surfaceWake=sharkRide.surfaceWake.slice(-64);
}
function sharkDiveDepth(ride=sharkRide){
if(!ride)return 0;
const phase=(ride.diveElapsed||0)%10000;
const smooth=t=>t*t*(3-2*t);
let periodic=0;
if(phase>=5000&&phase<5800)periodic=smooth((phase-5000)/800);
else if(phase>=5800&&phase<7600)periodic=1;
else if(phase>=7600&&phase<8400)periodic=1-smooth((phase-7600)/800);
return Math.max(periodic,sharkBridgeDepth(ride));
}
function drawSharkSurfaceWake(){
for(const w of sharkRide.surfaceWake||[]){
if(underSharkBridge(w.x,w.y))continue;
const t=w.age/1100,body=w.kind==='body',spread=(body?6:1.3)+t*(body?14:5),length=(body?7:2)+t*(body?19:9);
ctx.save();ctx.translate(w.x,w.y);ctx.rotate(w.heading);ctx.globalAlpha=(1-t)*(1-t)*w.strength*(body?.5:.7);
ctx.strokeStyle='#e2f8ee';ctx.lineWidth=body?1:.65;
// Paired spreading trails stay at their world positions as the rider moves on.
ctx.beginPath();ctx.moveTo(-length,-spread);ctx.quadraticCurveTo(-length*.45,-spread*.8,1,-(body?3:.6));
ctx.moveTo(-length,spread);ctx.quadraticCurveTo(-length*.45,spread*.8,1,body?3:.6);ctx.stroke();
if(body){ctx.globalAlpha*=.5;ctx.beginPath();ctx.ellipse(-length*.25,0,spread,spread*.42,0,0,Math.PI*2);ctx.stroke();}
ctx.restore();
}
}
function sharkSegmentOpacity(localX,depth,resurfacing=false){
const position=Math.max(0,Math.min(1,(localX+40)/68)),along=resurfacing?1-position:position;
const visible=Math.max(0,Math.min(1,(1.25-1.5*depth-along)/.25));
return visible*visible*(3-2*visible);
}
function drawSharkBody(phase,opacity,x=0,y=0,heading=0){drawSeaFishBody(x,y,heading,phase,opacity);}
function drawSeaFishTransitionWake(x,y,heading,depth,resurfacing,bodyEnd){
if(depth<=0||depth>=1)return;
const strength=Math.sin(Math.PI*depth);
const crossing=1.125-1.5*depth;
const position=Math.max(0,Math.min(1,resurfacing?1-crossing:crossing));
const along=-36+(bodyEnd+36)*position;
const center=seaFishPoint(x,y,heading,along,0);
if(underSharkBridge(center.x,center.y))return;
ctx.save();ctx.translate(center.x,center.y);ctx.rotate(heading);
ctx.strokeStyle='#def6ed';ctx.lineWidth=.7;
// Two small spreading ripples follow the head-to-tail waterline crossing.
for(let ring=0;ring<2;ring++){
const spread=2+Math.sin(Math.PI*position)*4+ring*2;
ctx.globalAlpha=strength*(ring?.13:.32);
ctx.beginPath();ctx.ellipse(-ring*2,0,2+ring*1.7,spread,0,.2,Math.PI-.2);
ctx.moveTo(-ring*2-(2+ring*1.7)*Math.cos(.2),-spread*Math.sin(.2));
ctx.ellipse(-ring*2,0,2+ring*1.7,spread,0,Math.PI+.2,Math.PI*2-.2);ctx.stroke();
}
ctx.restore();
}
function drawSeaMountTransition(x,y,heading,depth,resurfacing,bodyEnd,drawBody,visibilityCap=null){
ctx.save();
if(depth<=0&&!visibilityCap)drawBody(1);
else if(depth<1){
// Sweep along the animal's heading so both ends follow every turn.
for(let left=-40;left<bodyEnd;left+=3){
const localX=bodyEnd===29?left+1.5:(left+41.5)/(bodyEnd+39)*68-40;
let opacity=sharkSegmentOpacity(localX,depth,resurfacing);
if(visibilityCap)opacity=Math.min(opacity,sharkSegmentOpacity(localX,visibilityCap.depth,visibilityCap.resurfacing));
if(opacity<=0)continue;
ctx.save();ctx.translate(x,y);ctx.rotate(heading);ctx.beginPath();ctx.rect(left,-48,3,96);ctx.clip();ctx.rotate(-heading);ctx.translate(-x,-y);drawBody(opacity);ctx.restore();
}
}
ctx.restore();
drawSeaFishTransitionWake(x,y,heading,depth,resurfacing,bodyEnd);
}
function drawSharkRide(){
// Every sea mount uses the same dive, wake, rider, and landing animation.
const drawBody=(phase,opacity)=>{
if(sharkRide.kind==='dragon')drawLochDragonBody(sharkRide.x,sharkRide.y,sharkRide.heading,phase*.5,opacity,true);
else if(sharkRide.kind==='marlin')drawBlueMarlinBody(sharkRide.x,sharkRide.y,sharkRide.heading,phase,opacity);
else drawSharkBody(phase,opacity,sharkRide.x,sharkRide.y,sharkRide.heading);
};
const bodyEnd=sharkRide.kind==='dragon'||sharkRide.kind==='marlin'?44:29;
const submerge=sharkDiveDepth(),landing=sharkRide.landing,depth=Math.max(submerge,landing?Math.min(1,landing.elapsed/Math.min(400,landing.duration)):0);
// Reverse the visibility sweep on ascent so the head leads in both directions.
const cycle=(sharkRide.diveElapsed||0)%10000;
const resurfacing=!landing&&(sharkRide.resurfacing||(cycle>=7600&&cycle<8400&&sharkBridgeDepth(sharkRide)<submerge+1e-9));
drawSeaFishWake(sharkRide,1-submerge);
drawSeaMountTransition(sharkRide.x,sharkRide.y,sharkRide.heading,depth,resurfacing,bodyEnd,opacity=>drawBody(sharkRide.phase,opacity));
drawSharkSurfaceWake();
if(landing){
drawFastShoreTumble(landing,sharkRide.heading);
}else{
const sink=submerge*16;
if(submerge<1){ctx.save();ctx.globalAlpha=1-submerge;character(player.x,player.y-4+sink);directionalSwimGear(player.x,player.y-19+sink,false);ctx.restore();}
// The breathing tube stays at the surface, hidden by the timber when underneath.
if(!underSharkBridge(player.x,player.y,2)){
swimSnorkel(player.x,player.y-19+sink,player.facing==='left'?-1:1);
if(submerge>0){const ripple=2.4+Math.sin((sharkRide.diveElapsed||0)*.012)*.4;ctx.save();ctx.globalAlpha=submerge*.65;ctx.strokeStyle='#e2f8ee';ctx.lineWidth=.7;ctx.beginPath();ctx.ellipse(player.x+(player.facing==='left'?-7:7),player.y-17+sink,ripple,ripple*.4,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
}
}
}
function advanceSharkFins(dt){
if(!swimming){sharkFins=[];nextSharkFin=800+Math.random()*1400;return;}
if(diveAnimation||sharkRide?.landing||dt<=0)return;
sharkLatchCooldown=Math.max(0,sharkLatchCooldown-dt);
sharkFins=sharkFins.filter(fin=>{
fin.age+=dt;
const speed=Math.hypot(fin.vx,fin.vy);
advanceSeaFishCruise(fin,dt,speed);
fin.vx=Math.cos(fin.heading)*speed;fin.vy=Math.sin(fin.heading)*speed;
return fin.age<fin.duration&&(!fin.escapeDive||fin.escapeDive.elapsed<fin.escapeDive.duration)&&Math.hypot(fin.x-player.x,fin.y-player.y)<190&&sharkWater(fin.x,fin.y);
});
nextSharkFin-=dt;if(nextSharkFin>0)return;
nextSharkFin=1800+Math.random()*3000;
if(sharkFins.length+(sharkRide?1:0)>=3)return;
for(let attempt=0;attempt<16;attempt++){
const angle=Math.random()*Math.PI*2,distance=45+Math.random()*70,x=player.x+Math.cos(angle)*distance,y=player.y+Math.sin(angle)*distance;
if(x<WORLD.left+15||x>WORLD.right-15||y<15||y>WORLD.height-15||islandPolys.some(p=>inside(x,y,p)))continue;
const heading=angle+Math.PI/2+(Math.random()-.5)*.7,speed=.012+Math.random()*.012;
if(![0,16].every(d=>seaFishPoseClear(x+Math.cos(heading)*d,y+Math.sin(heading)*d,heading)))continue;
sharkFins.push({x,y,vx:Math.cos(heading)*speed,vy:Math.sin(heading)*speed,age:0,duration:6650+Math.random()*2000});break;
}
}
function drawSharkFins(){
if(!swimming)return;
for(const fin of sharkFins)drawWildSeaFish(fin,'shark');
}

function formatRideTime(ms){const seconds=Math.ceil(Math.max(0,ms)/1000);return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;}
function vesselHasPower(){return activeVessel==='ferry'?state.ferryRemaining>0:currentProfile().fuel[activeVessel]>0;}
function stopBoatPropulsion(){boatMotion.velocity=0;boatMotion.turnRate=0;boatMotion.throttle=0;boatMotion.power=0;boatMotion.movingFor=0;boatMotion.engineStage='off';}
function showBoatBoardingHint(message){toast(activeVessel!=='ferry'&&!vesselHasPower()?'Out of gas! Press F to catch fish and refill your tank.':message);}
function applyReserveGas(){
if(activeVessel==='ferry')return;
const profile=currentProfile(),amount=Math.min(100-profile.fuel[activeVessel],profile.reserveGas);
profile.fuel[activeVessel]+=amount;profile.reserveGas-=amount;
}
function returnExpiredFerry(){
if(state.ferryRemaining>0||boating&&activeVessel==='ferry')return;
ferryPosition=ferryBerth(dock);ferryHeading=0;
if(activeVessel==='ferry'){
boatPosition={...ferryPosition};boatAnchor=null;
if(state.parkedBoat?.vessel==='ferry')state.parkedBoat=null;
if(state.beachAnchor?.vessel==='ferry')state.beachAnchor=null;
}
state.ferryAboard=false;delete state.ferryPose;
}
let ferrySaveClock=0,boatFuelSaveClock=0;
function advanceFerryRide(dt){
if(dt<=0||fishingActive||document.querySelector('dialog[open]')||state.ferryRemaining<=0)return;
state.ferryRemaining=Math.max(0,state.ferryRemaining-dt);
ferrySaveClock+=dt;
if(state.ferryRemaining===0){
if(boating&&activeVessel==='ferry'){stopBoatPropulsion();toast('Your ferry ride has ended. Exit the ferry so it can return to its dock.');}
else if(!beachTransfer)returnExpiredFerry();
save();ferrySaveClock=0;
}else if(ferrySaveClock>=1000){save();ferrySaveClock=0;}
}
function totalCatches(){return Object.values(state.catches).reduce((a,b)=>a+b,0);}
function sponsored(){return totalCatches()>=5;}
function checkSponsorship(){
if(!sponsored()||state.sponsorshipAnnounced)return;
state.sponsorshipAnnounced=true;save();$('#sponsorName').textContent=FISHING_SPONSOR;$('#sponsorship').showModal();chime();
}
function qualifiesForSpeedboat(progress){return Math.max(Number(progress?.crystals)||0,Number(progress?.earnedCrystals)||0)>=SPEEDBOAT_UNLOCK_CRYSTALS;}
function speedboatUnlocked(){return state.speedboat===true||currentProfile().speedboat===true||qualifiesForSpeedboat(state);}
function updateSpeedboatUI(){
const unlocked=speedboatUnlocked(),newUnlock=unlocked&&!state.speedboat&&!currentProfile().speedboat;
if(unlocked){state.speedboat=true;currentProfile().speedboat=true;}
const status=unlocked?'Dock unlocked! Find the SPEEDBOAT sign southeast of the main harbour, or launch here. Triple outboards · 25% faster · no crystals to spend.':`${Math.min(SPEEDBOAT_UNLOCK_CRYSTALS,Math.max(state.crystals,state.earnedCrystals))} / ${SPEEDBOAT_UNLOCK_CRYSTALS} crystals · earn or hold ${SPEEDBOAT_UNLOCK_CRYSTALS} to unlock the speedboat dock.`;
$('#gearSpeedboatStatus').textContent=status;$('#gearLaunchSpeedboat').hidden=!unlocked;

if(newUnlock)toast('100-crystal milestone! Your speedboat dock is open — triple outboards and 25% more speed!');
}
function outboardOffsets(vessel,spacing){return vessel==='speedboat'?[-spacing,0,spacing]:[-spacing,spacing];}
function vesselPose(vessel){
if(vessel===activeVessel)return [boatPosition.x,boatPosition.y,boatMotion.heading];
const position=vessel==='ferry'?ferryPosition:vessel==='speedboat'?speedboatPosition:fishingBoatPosition;
return [position.x,position.y,vessel==='ferry'?ferryHeading:vessel==='speedboat'?speedboatHeading:fishingBoatHeading];
}
function parkCurrentVessel(){
if(activeVessel==='ferry'){ferryPosition={...boatPosition};ferryHeading=boatMotion.heading;}
else if(activeVessel==='speedboat'){speedboatPosition={...boatPosition};speedboatHeading=boatMotion.heading;}
else{fishingBoatPosition={...boatPosition};fishingBoatHeading=boatMotion.heading;}
}
function launchSpeedboat(){
if(!speedboatUnlocked()){toast('Earn or hold 100 crystals to unlock the speedboat dock.');return;}
if(boatExplosions.has('speedboat')){toast('Wait for the speedboat’s smoke to clear.');return;}
if(wakeboardCrash||dragonFlight||wakeboardRide||volleyball||frisbeeGame||surfSession||beachTransfer||shoreRecovery||voyage||boating)return;
if(!hasSwimPower()){toast('Solve a problem to restore energy before heading out on the water.');return;}
stopFishing();parkCurrentVessel();state.beachAnchor=null;state.boatIsland=null;state.parkedBoat=null;
activeVessel='speedboat';swimming=false;diveAnimation=null;shoreClimb=null;timberStep=null;beachTransfer=null;
resetBoatMotion();const berth=clearBoatBerth(SPEEDBOAT_MOORING,0,'speedboat');boatPosition={...berth};speedboatPosition={...berth};speedboatHeading=0;player.x=berth.x;player.y=berth.y;boating=true;
startBoatEngines();closeMapPanel();keys.clear();save();updateFishing();updateWaterControls();canvas.focus({preventScroll:true});
showBoatBoardingHint('Triple outboards ready! Your speedboat is 25% faster. WASD steers; Space trims; F fishes; X steps off.');
}
function drawSpeedboatDock(){
const x=SPEEDBOAT_DOCK.x,y=SPEEDBOAT_DOCK.y;
rect(x-14,y-21,28,10,'#245d72');rect(x-13,y-20,26,1,'#88dcdd');
ctx.save();ctx.font='5px monospace';ctx.fillStyle='#e8faff';ctx.textAlign='center';ctx.fillText('SPEEDBOAT',x,y-14);ctx.restore();
for(const side of [-1,1]){rect(x+side*10-1,y+9,2,13,'#425d63');rect(x+side*10-2,y+9,4,2,'#eef0c7');}
}
function speedboatArt(x,y){
if(boatIsExploding('speedboat'))return;
const burning=boatExplosions.get('speedboat');if(burning){x=burning.x;y=burning.y;}
const active=boating&&activeVessel==='speedboat',heading=burning?.heading??(activeVessel==='speedboat'?boatMotion.heading:speedboatHeading);
if(activeVessel==='speedboat')drawBoatWake();
drawBoatShadow(x,y,heading,'speedboat');drawBoatBowWake(x,y,heading,'speedboat');drawBoatExhaust(x,y,heading,'speedboat');drawBoatTrimSpray(x,y,heading,'speedboat');
ctx.save();ctx.translate(x,y);ctx.rotate(heading);
polygon([[-28,-12],[4,-13],[24,-7],[33,0],[24,7],[4,13],[-28,12]],'#244655');
polygon([[-26,-10],[4,-11],[23,-6],[30,0],[23,6],[4,11],[-26,10]],'#edf5e9');
polygon([[-24,-8],[6,-9],[24,-3],[28,0],[24,3],[6,9],[-24,8]],'#3595ac');
polygon([[1,-8],[24,-3],[28,0],[24,3],[1,8],[9,0]],'#d8f0e7');
polygon([[7,-6],[24,-2],[27,0],[24,2],[7,6],[13,0]],'#df7049');
rect(-21,-7,16,14,'#284d60');for(const side of [-4,4]){rect(-18,side-2,8,4,'#faf1d3');rect(-18,side-2,2,4,'#c6d9ca');}
polygon([[-5,-9],[3,-7],[5,0],[3,7],[-5,9],[-2,0]],'#92dadd');
ctx.strokeStyle='#e3ffff';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(-4,-8);ctx.lineTo(2,-6);ctx.lineTo(4,0);ctx.stroke();
drawOutboardMotors('speedboat',active);
if(active&&boatMotion.power>.1){ctx.globalAlpha=boatMotion.power*.6;for(const side of [-9,0,9])ellipse(-34,side,5,1.8,'#e6fff3');}
ctx.restore();if(active&&!hookedFish)character(x-Math.cos(heading)*11,y-Math.sin(heading)*11-4);
}
function launchBoat(){
if(boatExplosions.has('fishing')){toast('Wait for the boat’s smoke to clear.');return;}
if(beachTransfer||volleyball||frisbeeGame)return;
if(wakeboardCrash||dragonFlight||wakeboardRide||volleyball||frisbeeGame){toast('Finish your current ride first.');return;}
if(!sponsored()||voyage||boating||shoreRecovery)return;if(!hasSwimPower()){toast('Solve a problem to restore energy before heading out on the water.');return;}stopFishing();
state.beachAnchor=null;state.boatIsland=null;state.parkedBoat=null;parkCurrentVessel();activeVessel='fishing';closeMapPanel();swimming=false;diveAnimation=null;shoreClimb=null;shoreRecovery=null;timberStep=null;beachTransfer=null;boating=true;resetBoatMotion();const berth=clearBoatBerth(BOAT_MOORING);player.x=berth.x;player.y=berth.y;boatPosition={...berth};startBoatEngines();keys.clear();save();updateFishing();canvas.focus({preventScroll:true});showBoatBoardingHint('Your boat is launched! Up/W accelerates; Down/S brakes then reverses; Left/A and Right/D steer. Fish from your boat or return to the dock.');
}
function boatHomeDock(){return activeVessel==='speedboat'?SPEEDBOAT_DOCK:activeVessel==='fishing'&&sponsored()?fishingDock:dock;}
function returnBoat(){if(!boating&&!swimming)return;state.beachAnchor=null;state.boatIsland=null;state.parkedBoat=null;const wasSwimming=swimming;stopFishing();boating=false;swimming=false;diveAnimation=null;shoreClimb=null;shoreRecovery=null;timberStep=null;beachTransfer=null;const home=boatHomeDock();boatPosition=activeVessel==='ferry'?ferryBerth(dock):{...(activeVessel==='speedboat'?SPEEDBOAT_MOORING:BOAT_MOORING)};resetBoatMotion();parkCurrentVessel();player.x=home.x;player.y=home.y-(home===fishingDock?8:18);if(wasSwimming)startGoggleToss();keys.clear();save();updateFishing();canvas.focus({preventScroll:true});toast(activeVessel==='speedboat'?'Speedboat safely moored at its dock.':activeVessel==='fishing'&&sponsored()?'Fishing boat safely moored at the fishing dock.':'Back on shore at the main ferry dock.');}
function openSea(x,y){return x>WORLD.left+10&&x<WORLD.right-10&&y>10&&y<WORLD.height-10&&!islandPolys.some(p=>inside(x,y,p))&&!canWalk(x,y);}
function shoreDiveTarget(){
if(wakeboardCrash||frisbeeGame||volleyball||wakeboardRide||dragonFlight||!hasSwimPower()||boating||swimming||voyage||fishingActive||diveAnimation||shoreClimb||shoreRecovery||!canWalk(player.x,player.y))return null;
for(let distance=8;distance<=32;distance+=8)for(let i=0;i<32;i++){
const angle=i*Math.PI/16,x=player.x+Math.cos(angle)*distance,y=player.y+Math.sin(angle)*distance;
if(openSea(x,y))return {x,y};
}
return null;
}
function startDive(to){
if(wakeboardRide||volleyball||frisbeeGame)return;
if(!hasSwimPower()){toast('Out of energy! Solve a problem to swim again.');return;}
state.boatIsland=null;
faceMovement(to.x-player.x,to.y-player.y);
const style=['roll','backflip','dive'][Math.floor(Math.random()*3)];
waterEntrySplash=null;swimming=true;diveAnimation={elapsed:0,from:{x:player.x,y:player.y},to,style};keys.clear();sharkFins=[];nextSharkFin=800+Math.random()*1400;
toast(sponsored()?'Splash! Swim with arrows or WASD. Swim to shore, or press E beside your boat to climb back in.':'Splash! Swim with arrows or WASD. Swim onto shore to walk again.');
save();updateFishing();canvas.focus({preventScroll:true});
}
function diveFromIsland(){
if(document.querySelector('dialog[open]'))return;
const to=shoreDiveTarget();if(!to)return;closeMapPanel();startDive(to);
}
function swimmingTimberAt(x,y){
// Physical decks remain overhead regardless of tickets or island access.
return [...crossings,...activePiers(),...(state.upgrades.includes('bridge')?[woodlandBridge]:[])].some(b=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h);
}
function swimShoreContact(dx,dy){
if(swimmingTimberAt(player.x,player.y))return null;
const length=Math.hypot(dx,dy);if(!length)return null;
const normal={x:dx/length,y:dy/length};
// Reach for the beach before the swimmer's body crosses the shoreline.
for(let distance=1;distance<=12;distance++){
const edge={x:player.x+normal.x*distance,y:player.y+normal.y*distance};
const island=islandPolys.findIndex(poly=>inside(edge.x,edge.y,poly));
if(island<0)continue;
if(swimmingTimberAt(edge.x,edge.y)||!canWalk(edge.x,edge.y))return null;
for(let inset=8;inset>=4;inset-=2){
const to={x:edge.x+normal.x*inset,y:edge.y+normal.y*inset};
if(!swimmingTimberAt(to.x,to.y)&&inside(to.x,to.y,islandPolys[island])&&canWalk(to.x,to.y))return {edge,to,normal};
}
return null;
}
return null;
}
function boatHull(x,y,heading,vessel=activeVessel){
const [back,front,halfWidth]=vessel==='speedboat'?[36,34,14]:vessel==='ferry'?[40,40,17]:vessel==='tow'?[31,32,13]:[32,27,12];
const c=Math.cos(heading),s=Math.sin(heading);
return [[-back,-halfWidth],[front,-halfWidth],[front,halfWidth],[-back,halfWidth]].map(([along,side])=>[x+c*along-s*side,y+s*along+c*side]);
}
function boatPolygonsOverlap(a,b){
const bounds=p=>[Math.min(...p.map(v=>v[0])),Math.min(...p.map(v=>v[1])),Math.max(...p.map(v=>v[0])),Math.max(...p.map(v=>v[1]))];
const aa=bounds(a),bb=bounds(b);
if(aa[2]<bb[0]||bb[2]<aa[0]||aa[3]<bb[1]||bb[3]<aa[1])return false;
if(a.some(([x,y])=>inside(x,y,b))||b.some(([x,y])=>inside(x,y,a)))return true;
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){
const p=a[i],q=a[(i+1)%a.length],r=b[j],t=b[(j+1)%b.length];
if(Math.max(p[0],q[0])<Math.min(r[0],t[0])||Math.max(r[0],t[0])<Math.min(p[0],q[0])||Math.max(p[1],q[1])<Math.min(r[1],t[1])||Math.max(r[1],t[1])<Math.min(p[1],q[1]))continue;
if(cross(p,q,r)*cross(p,q,t)<=0&&cross(r,t,p)*cross(r,t,q)<=0)return true;
}
return false;
}
function boatObstacles(vessel=activeVessel){
const boats=[];
if(vessel!=='ferry')boats.push(boatHull(...vesselPose('ferry'),'ferry'));
if(vessel!=='fishing'&&sponsored())boats.push(boatHull(...vesselPose('fishing'),'fishing'));
if(vessel!=='speedboat'&&speedboatUnlocked())boats.push(boatHull(...vesselPose('speedboat'),'speedboat'));
const tow=wakeboardRide||wakeboardBoatTrip;
if(vessel!=='tow')boats.push(boatHull(tow?.boat.x??WATERSPORTS_DOCK.x+40,tow?.boat.y??WATERSPORTS_DOCK.y+18,tow?.heading??wakeboardDockHeading,'tow'));
return boats;
}
function boatPoseClear(x,y,heading,vessel=activeVessel){
const hull=boatHull(x,y,heading,vessel);
if(vessel!=='speedboat'&&hull.some(([x,y])=>deepWater(x,y)))return false;
if(hull.some(([x,y])=>x<WORLD.left+10||y<10||x>WORLD.right-10||y>WORLD.height-10))return false;
if(islandPolys.some(poly=>boatPolygonsOverlap(hull,poly)))return false;
const timber=[...activePiers(),...crossings,...(state.upgrades.includes('bridge')?[woodlandBridge]:[])];
if(timber.some(b=>boatPolygonsOverlap(hull,[[b.x-2,b.y-2],[b.x+b.w+2,b.y-2],[b.x+b.w+2,b.y+b.h+2],[b.x-2,b.y+b.h+2]])))return false;
return !boatObstacles(vessel).some(other=>boatPolygonsOverlap(hull,other));
}
function clearBoatBerth(position,heading=0,vessel=activeVessel){
if(boatPoseClear(position.x,position.y,heading,vessel))return {...position};
for(let distance=2;distance<=100;distance+=2)for(let i=0;i<32;i++){
const angle=i*Math.PI/16,x=position.x+Math.cos(angle)*distance,y=position.y+Math.sin(angle)*distance;
if(boatPoseClear(x,y,heading,vessel))return {x,y};
}
return {...position};
}
let deepWaterHintShown=false;
function hintDeepWater(dx,dy,heading){
if(!boating||activeVessel==='speedboat')return;
const west=WORLD.left+WORLD.width*.14,east=WORLD.left+WORLD.width*.86;
const hull=boatHull(player.x,player.y,heading),left=Math.min(...hull.map(p=>p[0])),right=Math.max(...hull.map(p=>p[0]));
if(left>west+120&&right<east-120)deepWaterHintShown=false;
if(!deepWaterHintShown&&(dx<0&&left+dx<=west+80||dx>0&&right+dx>=east-80)){
deepWaterHintShown=true;toast('Deep water ahead! Only the speedboat can enter the darker water.');
}
}
function moveBoat(dx,dy,hullHeading=null){
if(!(dx||dy)||!vesselHasPower())return;
let target=hullHeading??Math.atan2(dy,dx);hintDeepWater(dx,dy,target);const from={x:player.x,y:player.y};
// Check the entire turn, then sweep the hull so even long moves cannot tunnel.
const difference=Math.atan2(Math.sin(target-boatMotion.heading),Math.cos(target-boatMotion.heading));
const turns=Math.max(1,Math.ceil(Math.abs(difference)/.04)),initial=boatMotion.heading;
for(let i=1;i<=turns;i++){
const heading=initial+difference*i/turns;
if(!boatPoseClear(player.x,player.y,heading)){
// Back away from an obstacle without swinging the stern through it.
if(Math.abs(difference)>Math.PI*.95){target=initial;boatMotion.heading=initial;break;}
boatMotion.movingFor=0;return;
}
boatMotion.heading=heading;
}
const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/2));
for(let i=0;i<steps;i++){
const x=from.x+dx*(i+1)/steps,y=from.y+dy*(i+1)/steps;
if(!boatPoseClear(x,y,target))break;
player.x=x;player.y=y;
}
recordBoatMovement(from,target);boatPosition={x:player.x,y:player.y};advanceSwimming(0);
}
function boatTrimLevel(){const step=boatMotion.trimStep||0;return step<=5?step:10-step;}
function boatTopSpeed(trim=boatTrimLevel()){
// Trim 4 is the sweet spot; at 5 the raised props lose their grip.
return 140*(activeVessel==='speedboat'?1.25:1)*(trim===5?.75:1+.18*trim/4);
}
function cycleBoatTrim(){
if(!boating||fishingActive||boatAnchorBusy()||beachTransfer||voyage)return;
boatMotion.trimStep=((boatMotion.trimStep||0)+1)%10;
updateWaterControls();
}
function driveBoat(dt,throttle,steer){
const previousThrottle=boatMotion.throttle;
boatMotion.throttle=0;
if(boatMotion.engineStage==='starting'||boatMotion.engineStage==='off'){boatMotion.velocity=0;boatMotion.turnRate=0;return;}
if(!boating||fishingActive||!vesselHasPower()||boatAnchorBusy()||beachTransfer||voyage){stopBoatPropulsion();return;}
// Replay the startup exhaust when the motors pick up again from a stopped idle.
if(throttle&&!previousThrottle&&Math.abs(boatMotion.velocity)<.15&&boatMotion.engineAge>=1000)boatMotion.engineAge=0;
boatMotion.throttle=throttle;
// Small time steps keep acceleration, braking, and swept hull checks consistent.
for(let remaining=dt/1000;remaining>0;){
const step=Math.min(.01,remaining);remaining-=step;
let velocity=boatMotion.velocity||0;
if(throttle){
const braking=velocity*throttle<0,grip=boatTrimLevel()===5?.15:1;
// Nearly exposed props churn water instead of building speed from a stop.
const acceleration=braking?110:(throttle>0?65*(activeVessel==='speedboat'?1.25:1):45)*grip;
const maxForward=boatTopSpeed();
const next=velocity>maxForward&&throttle>0?Math.max(maxForward,velocity-65*step):velocity+throttle*acceleration*step;
// Opposite thrust must cancel momentum before engaging the other direction.
velocity=braking&&next*velocity<0?0:Math.max(-65,velocity>maxForward&&throttle>0?next:Math.min(maxForward,next));
}else{velocity*=Math.exp(-.85*step);if(Math.abs(velocity)<.15)velocity=0;}
// Outboards push the stern opposite the bow's turn; reverse thrust flips this.
const thrustDirection=velocity<-.5?-1:velocity>.5?1:throttle<0?-1:1;
const speedboat=activeVessel==='speedboat';
const motorTarget=-steer*(speedboat?.58:.48)*thrustDirection;
boatMotion.steering+=(motorTarget-boatMotion.steering)*(1-Math.exp(-step/(speedboat?.08:.12)));
// Faster steering gives the speedboat a smaller turning circle at its higher speed.
const targetTurn=steer*(speedboat?1.9:1.15)*Math.min(1,Math.abs(velocity)/(speedboat?40:55));
boatMotion.turnRate=(boatMotion.turnRate||0)+(targetTurn-(boatMotion.turnRate||0))*(1-Math.exp(-step/(speedboat?.09:.18)));
const heading=boatMotion.heading+boatMotion.turnRate*step;
// Check each increment of the turn, even while the boat is almost stationary.
if(boatPoseClear(player.x,player.y,heading))boatMotion.heading=heading;
else boatMotion.turnRate=0;
const from={x:player.x,y:player.y},distance=velocity*step;
moveBoat(Math.cos(boatMotion.heading)*distance,Math.sin(boatMotion.heading)*distance,boatMotion.heading);
if(Math.hypot(player.x-from.x,player.y-from.y)+.00001<Math.abs(distance))velocity=0;
boatMotion.velocity=velocity;
if(activeVessel!=='ferry'&&boatMotion.engineStage==='running'){
const fuel=currentProfile().fuel;
fuel[activeVessel]=Math.max(0,fuel[activeVessel]-step*1000/FUEL_TANK_DURATION*100*Math.min(1,Math.abs(velocity)/boatTopSpeed(4)));
if(fuel[activeVessel]<=0){stopBoatPropulsion();save();toast('Out of gas! Fish here to refill your tank.');break;}
}
}
}
function moveExplorer(dx,dy){
if(boatAnchorBusy())return;
if(wakeboardCrash)return;
walkMotion.moving=false;
if(surfSession)return;
if(frisbeeGame){moveFrisbeePlayer(dx,dy);return;}
if(volleyball){moveVolleyballPlayer(dx,dy);return;}
if(wakeboardRide)return;
if(dragonFlight){moveFlyingDragon(dx,dy);return;}
if(beachTransfer||diveAnimation||shoreClimb||shoreRecovery||sharkRide)return;
if(boating){moveBoat(dx,dy);return;}
faceMovement(dx,dy);
const x=player.x+dx,y=player.y+dy;
const contact=swimming?swimShoreContact(dx,dy):null;
if(contact){
shoreClimb={elapsed:0,from:{x:player.x,y:player.y},...contact};keys.clear();return;
}
if(!boating&&!swimming&&(dx||dy)&&canWalk(player.x,player.y)&&!walkableTimberAt(player.x,player.y)&&openSea(x,y)){
if(!hasSwimPower()){toast('Out of energy! Solve a problem to swim again.');return;}
const length=Math.hypot(dx,dy),landing={x:x+dx/length*24,y:y+dy/length*24};
closeMapPanel();startDive(openSea(landing.x,landing.y)?landing:{x,y});return;
}
const from={x:player.x,y:player.y};
if(canWalk(x,player.y))player.x=x;
if(canWalk(player.x,y))player.y=y;
if(!swimming&&!boating&&!voyage){
const wasRaised=!!walkableTimberAt(from.x,from.y),nowRaised=!!walkableTimberAt(player.x,player.y);
if(wasRaised!==nowRaised)timberStep={elapsed:0,from:wasRaised?3:0,to:nowRaised?3:0};
}
recordWalkingMovement(from);
recordBoatMovement(from);
recordSwimMovement(from);
advanceSwimming(0);
}
let boatAnchor=null;
function boatAnchorCasting(){return !!boatAnchor?.casting;}
function boatAnchorBusy(){return !!(boatAnchor?.casting||boatAnchor?.retrieving);}
function boatAnchorTarget(x,y,heading){
const water=(x,y)=>sharkWater(x,y)&&!underSharkBridge(x,y,4);
const pathClear=(angle,distance)=>{
for(let d=12;d<=distance;d+=4)if(!water(x+Math.cos(angle)*d,y+Math.sin(angle)*d))return false;
return true;
};
// Clock positions are relative to the bow: 11/1 forward, 7/5 astern.
const landAhead=!pathClear(heading,84);
const groups=landAhead?[[5*Math.PI/6,-5*Math.PI/6]]:[[-Math.PI/6,Math.PI/6],[5*Math.PI/6,-5*Math.PI/6]];
for(const angles of groups)for(const distance of [72,88,104,128])for(const offset of angles){
const angle=heading+offset,target={x:x+Math.cos(angle)*distance,y:y+Math.sin(angle)*distance};
if(!pathClear(angle,distance))continue;
if(Array.from({length:8},(_,j)=>j*Math.PI/4).every(a=>water(target.x+Math.cos(a)*10,target.y+Math.sin(a)*10)))return target;
}
return null;
}
function retrieveBoatAnchor(){
if(!boatAnchor||boatAnchorBusy())return;
boatAnchor.casting=false;boatAnchor.retrieving=true;boatAnchor.retrieveElapsed=0;
keys.clear();
}
function restoreBeachAnchor(){
const a=state.beachAnchor;if(!a)return;
const target=a.anchorPoint||boatAnchorTarget(a.x,a.y,a.heading);if(!target)return;
boatAnchor={origin:{x:a.x,y:a.y-8},...target,elapsed:FISH_CAST_DURATION+600,casting:false,action:'beach',vessel:a.vessel,owner:profileId,level:ageLevel};
}
function throwBoatAnchor(action='dive'){
if(boatAnchorBusy())return;
const origin={x:player.x,y:player.y-8},target=boatAnchorTarget(player.x,player.y,boatMotion.heading);
if(!target){toast('Move into clearer water before dropping the anchor.');return;}
stopFishing();keys.clear();boatPosition={x:player.x,y:player.y};
boatAnchor={origin,...target,elapsed:0,casting:true,action,vessel:activeVessel,owner:profileId,level:ageLevel};
closeMapPanel();updateWaterControls();canvas.focus({preventScroll:true});
}
const ANCHOR_RETRIEVE_DURATION=2200;
function anchorRetrievalMotion(elapsed){
const durations=[220,240,265,295,330,375,475],reaches=[0,.24,.44,.61,.75,.86,.94,1];
let remaining=Math.max(0,elapsed);
for(let i=0;i<durations.length;i++){
if(remaining>=durations[i]){remaining-=durations[i];continue;}
// A quick tug followed by a hand-changing pause. Near the boat, strokes
// cover less rope, take longer, and spend more time on the pull itself.
const phase=remaining/durations[i],pullTime=.42+i*.055,u=Math.min(1,phase/pullTime);
const ease=1-Math.pow(1-u,3);
return {progress:reaches[i]+(reaches[i+1]-reaches[i])*ease,tension:u<1?Math.sin(u*Math.PI):0};
}
return {progress:1,tension:0};
}
function advanceBoatAnchor(dt){
if(!boatAnchorBusy()||dt<=0)return;
if(boatAnchor.retrieving){
boatAnchor.retrieveElapsed+=dt;
if(boatAnchor.retrieveElapsed>=ANCHOR_RETRIEVE_DURATION){boatAnchor=null;if(boating)startBoatEngines(false);keys.clear();}
return;
}
boatAnchor.elapsed+=dt;
if(boatAnchor.elapsed>=FISH_CAST_DURATION){boatAnchor.casting=false;if(boatAnchor.action==='beach')anchorBoatAtBeach(true);else exitBoat(true);}
}
function drawBoatAnchor(){
const a=boatAnchor;if(!a||a.owner!==profileId||a.level!==ageLevel||a.vessel!==activeVessel)return;
const haul=a.retrieving?anchorRetrievalMotion(a.retrieveElapsed):null;
const t=haul?1-haul.progress:Math.min(1,a.elapsed/FISH_CAST_DURATION),ease=haul?t:t*t*(3-2*t);
const tip={x:a.origin.x,y:a.origin.y},end={x:tip.x+(a.x-tip.x)*ease,y:tip.y+(a.y-tip.y)*ease-(haul?0:Math.sin(t*Math.PI)*30)};
// Rope snaps taut on each pull, relaxing slightly while hands change over.
const loop=haul?(1-haul.tension)*Math.sin(t*Math.PI)*2.5:Math.sin(t*Math.PI)*12;
const points=fishingLinePoints(tip,end,haul?1:t,loop);
ctx.save();ctx.globalAlpha=a.casting||a.retrieving?1:.55;ctx.strokeStyle='#e5d3a1';ctx.lineWidth=1;
ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
// Point the shank along the rope, with its eye attached to the rope's end.
const previous=points[points.length-2],ropeAngle=Math.atan2(end.y-previous.y,end.x-previous.x)-Math.PI/2;
ctx.translate(end.x,end.y);ctx.rotate(ropeAngle+(a.casting?Math.sin(t*Math.PI)*1.2:0));ctx.translate(0,5);
// Settle the flukes into the seabed, then expose them as the anchor is hauled up.
const smooth=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
const buried=a.retrieving?1-smooth(haul.progress/.2):a.casting?smooth((t-.85)/.15):1;
if(buried>0){ctx.beginPath();ctx.rect(-10,-9,20,22-buried*12);ctx.clip();}
ctx.strokeStyle='#435d64';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-5,1.7,0,Math.PI*2);ctx.moveTo(0,-3);ctx.lineTo(0,7);ctx.moveTo(-6,2);ctx.quadraticCurveTo(0,13,6,2);ctx.moveTo(-6,2);ctx.lineTo(-6,5);ctx.moveTo(6,2);ctx.lineTo(6,5);ctx.moveTo(-3,-1);ctx.lineTo(3,-1);ctx.stroke();ctx.restore();
if(!a.casting&&!a.retrieving&&a.elapsed<FISH_CAST_DURATION+600){const p=(a.elapsed-FISH_CAST_DURATION)/600;ctx.save();ctx.globalAlpha=(1-p)*.6;ctx.strokeStyle='#e2f8ee';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(a.x,a.y,4+p*12,2+p*5,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
}
function exitBoat(anchorReady=false){
if(boating&&beachApproach()&&!boatIslands.some(l=>Math.hypot(player.x-l.dock.x,player.y-l.dock.y)<70)){anchorBoatAtBeach();return;}
if(!boating||voyage||boatAnchorBusy())return;
const landing=[dock,...(speedboatUnlocked()?[SPEEDBOAT_DOCK]:[]),farDock,fishingDock,WATERSPORTS_DOCK,...boatIslands.map(l=>l.dock)].find(d=>Math.hypot(player.x-d.x,player.y-d.y)<(d===fishingDock?45:70));
if(!landing&&anchorReady!==true){throwBoatAnchor();return;}
sharkFins=[];nextSharkFin=800+Math.random()*1400;
stopFishing();boatPosition={x:player.x,y:player.y};parkCurrentVessel();boating=false;keys.clear();

if(landing){state.boatIsland=landing.islandId||null;if(landing.islandId&&!state.boatIslandsVisited.includes(landing.islandId))state.boatIslandsVisited.push(landing.islandId);swimming=false;diveAnimation=null;shoreClimb=null;shoreRecovery=null;timberStep=null;beachTransfer=null;player.x=landing.x;player.y=landing.y-(landing===fishingDock?8:18);toast('You stepped off the boat onto the dock. Walk with arrows or WASD.');}
else{const offset=[[24,10],[-24,10],[0,25],[0,-25]].find(([x,y])=>openSea(player.x+x,player.y+y))||[0,0];startDive({x:player.x+offset[0],y:player.y+offset[1]});return;}
save();updateFishing();canvas.focus({preventScroll:true});
}
function boardOwnBoat(){
if(state.beachAnchor&&!swimming){returnToAnchoredBoat();return;}
if(wakeboardCrash||dragonFlight||wakeboardRide||volleyball||frisbeeGame){toast('Finish your current ride first.');return;}
if(!hasSwimPower()||!canUseCurrentVessel()||(!swimming&&!canBoardIslandBoat())||diveAnimation||shoreClimb||sharkRide?.landing||Math.hypot(player.x-boatPosition.x,player.y-boatPosition.y)>(swimming?44:75))return;
retrieveBoatAnchor();state.beachAnchor=null;stopFishing();swimming=false;boating=true;boatPosition=clearBoatBerth(boatPosition,boatMotion.heading);player.x=boatPosition.x;player.y=boatPosition.y;startBoatEngines();keys.clear();save();updateFishing();canvas.focus({preventScroll:true});showBoatBoardingHint('Back aboard! X exits your boat; F starts fishing.');
}
function buyAnchor(){
if(state.anchor||currentProfile().anchor===true){state.anchor=true;currentProfile().anchor=true;updateAnchorGear();return;}
if(state.crystals<50){$('#anchorInfo').textContent='An anchor costs 50 crystals. Solve more problems to earn the rest.';return;}
state.crystals-=50;state.anchor=true;currentProfile().anchor=true;update();chime();
toast('Anchor purchased! Use it from any boat near the southern mainland beach.');
}
function updateAnchorGear(){
$('#buyAnchor').disabled=state.anchor||state.crystals<50;
$('#buyAnchor').textContent=state.anchor?'✓ Anchor owned':'Buy anchor · 50 ◆';
$('#anchorInfo').textContent=state.anchor?'Permanently yours across age levels, resets, and reloads. Works on the ferry, fishing boat, and speedboat. Near Mainland Beach, press Q to anchor and go ashore.':'Buy a permanent anchor for 50 crystals. Anchor any boat near the southern mainland beach to go ashore.';
}
function beachShoreY(x){
for(let i=0;i<beachPoly.length-3;i++){
const a=beachPoly[i],b=beachPoly[i+1];
if(x>=a[0]&&x<=b[0])return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);
}
return WORLD.height-100;
}
function onMainlandBeach(){return inside(player.x,player.y,beachPoly);}
function beachApproach(){
if(!boating||beachTransfer||player.x<WORLD.left+20||player.x>WORLD.right-20)return null;
const shore=beachShoreY(player.x),distance=shore-player.y;
return distance>=0&&distance<=105?{x:player.x,y:shore+16}:null;
}
function anchorBoatAtBeach(anchorReady=false){
if(boatAnchorBusy())return;
const landing=beachApproach();if(!landing)return;
if(!state.anchor){openMapPanel('gearPanel');updateAnchorGear();toast('Buy an anchor for 50 crystals to park your boat and go ashore.');return;}
if(anchorReady!==true){throwBoatAnchor('beach');return;}
stopFishing();boatPosition={x:player.x,y:player.y};state.boatIsland=null;
state.beachAnchor={...boatPosition,heading:boatMotion.heading,vessel:activeVessel,landing,anchorPoint:boatAnchor?{x:boatAnchor.x,y:boatAnchor.y}:null};
beachTransfer={elapsed:0,from:{...boatPosition},to:landing,boarding:false};
boating=false;swimming=false;keys.clear();closeMapPanel();save();updateWaterControls();
toast('Anchor down! Your boat is safely moored while you visit the beach.');
}
function canReturnToAnchoredBoat(){
const anchor=state.beachAnchor;
return !!anchor&&canUseCurrentVessel()&&!surfSession&&!volleyball&&!boating&&!swimming&&!dragonFlight&&!wakeboardRide&&!beachTransfer&&onMainlandBeach()&&Math.hypot(player.x-anchor.landing.x,player.y-anchor.landing.y)<70;
}
function returnToAnchoredBoat(){
if(boatExplosions.has(activeVessel))return;
if(!canReturnToAnchoredBoat()||!canUseCurrentVessel())return;
if(!hasSwimPower()){toast('Solve a problem to restore energy before heading back onto the water.');return;}
stopFishing();keys.clear();const anchor=state.beachAnchor;
beachTransfer={elapsed:0,from:{x:player.x,y:player.y},to:{x:anchor.x,y:anchor.y},boarding:true};save();
}
function advanceBeachTransfer(dt){
if(!beachTransfer)return;
const transfer=beachTransfer;transfer.elapsed+=dt;
const t=Math.min(1,transfer.elapsed/900),ease=t*t*(3-2*t);
player.x=transfer.from.x+(transfer.to.x-transfer.from.x)*ease;player.y=transfer.from.y+(transfer.to.y-transfer.from.y)*ease;
if(t<1)return;
if(transfer.boarding){const anchor=state.beachAnchor;activeVessel=anchor.vessel;boatPosition={x:anchor.x,y:anchor.y};const mooring=boatAnchor;resetBoatMotion();boatAnchor=mooring;boatMotion.heading=anchor.heading;boating=true;startBoatEngines();if(!boatAnchor)restoreBeachAnchor();retrieveBoatAnchor();state.beachAnchor=null;}
beachTransfer=null;keys.clear();save();updateWaterControls();
}
function updateBeachControls(){
$('#mapAnchor').hidden=!beachApproach();
$('#mapAnchor').textContent=state.anchor?'Anchor & go ashore · Q ↗':'Get an anchor · 50 ◆ ↗';
$('#mapBeachBoat').hidden=!canReturnToAnchoredBoat();
}
function drawBeachTransfer(){
const t=beachTransfer.elapsed/900;
character(player.x,player.y-Math.sin(t*Math.PI)*2,false,Math.abs(Math.sin(t*Math.PI*5))*2);
}
function drawBeachAnchorage(){
const anchor=state.beachAnchor;if(!anchor)return;
ctx.save();
const {x,y}=anchor.landing;rect(x-1,y-14,2,17,'#846a46');polygon([[x+1,y-14],[x+13,y-11],[x+1,y-7]],'#df9b62');ctx.restore();
}
$('#buyAnchor').onclick=buyAnchor;$('#mapAnchor').onclick=anchorBoatAtBeach;$('#mapBeachBoat').onclick=returnToAnchoredBoat;
function canUseCurrentVessel(){if(boatExplosions.has(activeVessel))return false;return activeVessel==='speedboat'?speedboatUnlocked():activeVessel==='ferry'?state.ferryRemaining>0:sponsored();}
function canBoardIslandBoat(){
if(state.beachAnchor)return false;
return !swimming&&!boating&&(!!state.boatIsland||activeVessel==='ferry'&&state.ferryRemaining>0)&&canUseCurrentVessel()&&Math.hypot(player.x-boatPosition.x,player.y-boatPosition.y)<75;
}
function restoreParkedBoat(){
activeVessel=['ferry','speedboat'].includes(state.parkedBoat?.vessel)?state.parkedBoat.vessel:'fishing';fishingBoatPosition={...BOAT_MOORING};fishingBoatHeading=0;ferryPosition=ferryBerth(dock);ferryHeading=0;
boatPosition=state.parkedBoat?{x:state.parkedBoat.x,y:state.parkedBoat.y}:{...BOAT_MOORING};
speedboatPosition={...SPEEDBOAT_MOORING};speedboatHeading=0;
resetBoatMotion();if(state.parkedBoat)boatMotion.heading=state.parkedBoat.heading;restoreBeachAnchor();
}
function visitBoatIsland(index){
if(wakeboardCrash||dragonFlight||wakeboardRide||volleyball||frisbeeGame){toast('Finish your current ride first.');return;}
const island=boatIslands[index];if(!island)return;
if(boating||swimming||state.boatIsland!==island.id||!inside(player.x,player.y,islandPolys[locations.length+index])){
toast(`${island.name} is reached by boat. Sail to its dock and press X to step ashore.`);return;
}
stopFishing();keys.clear();openQuestion(island.practice);
$('#challengeCategory').textContent=`${island.name} / ${questions[island.practice].skill}`;
}
function advanceSwimming(dt){
advanceFerryRide(dt);
if(dt>0&&!document.querySelector('dialog[open]'))waterskiWake=waterskiWake.filter(w=>{w.age+=dt;return w.age<1800;});
advanceSunbathers(dt);
advanceVolleySprayReactions(dt);
advancePetDragonWet(dt);
if(boatAnchorBusy()){advanceBoatAnchor(dt);updateWaterControls();return;}
if(boatAnchor)boatAnchor.elapsed+=dt;
if(waterEntrySplash){
waterEntrySplash.elapsed+=dt;
if(waterEntrySplash.elapsed>=1050||!swimming||waterEntrySplash.owner!==profileId||waterEntrySplash.level!==ageLevel)waterEntrySplash=null;
}
advancePlayerHairEffect(dt);
advanceReturningWakeboardBoat(dt);
if(wakeboardCrash){advanceWakeboardCrash(dt);updateWaterControls();return;}
advanceSurfing(dt);if(surfSession)return;
if(frisbeeGame){advanceFrisbee(dt);updateWaterControls();return;}
if(volleyball){advanceVolleyball(dt);updateWaterControls();return;}
advanceBeachTransfer(dt);
if(wakeboardRide){advanceWakeboarding(dt);updateWaterControls();return;}
const dragonWasSwimming=dragonFlight?.stage==='swimming';advancePetDragon(dt);if(dragonFlight){if(dragonWasSwimming&&dragonFlight.stage==='swimming')advancePower(dt);updateWaterControls();return;}
advancePower(dt);
advanceGoggleToss(dt);
advanceTimberStep(dt);
advanceBoatMotion(dt);
advanceShoreRecovery(dt);
advanceSwimMotion(dt);
if(shoreClimb){
shoreClimb.elapsed+=dt;const t=Math.min(1,shoreClimb.elapsed/650),pull=Math.max(0,(t-.25)/.75),ease=pull*pull*(3-2*pull);
player.x=shoreClimb.from.x+(shoreClimb.to.x-shoreClimb.from.x)*ease;player.y=shoreClimb.from.y+(shoreClimb.to.y-shoreClimb.from.y)*ease;
if(t===1){const water=shoreClimb.from;shoreClimb=null;shoreRecovery=null;timberStep=null;beachTransfer=null;swimming=false;startGoggleToss(water);keys.clear();save();toast('Back on dry land. Keep exploring!');}
}
else if(sharkRide&&swimming)advanceSharkRide(dt);
else if(diveAnimation){
const dive=diveAnimation;dive.elapsed+=dt;
// Reach the landing point when the airborne pose first meets the surface.
const travel=Math.min(1,dive.elapsed/434);
player.x=dive.from.x+(dive.to.x-dive.from.x)*travel;player.y=dive.from.y+(dive.to.y-dive.from.y)*travel;
if(dive.elapsed>=434&&!dive.impacted){
dive.impacted=true;waterEntrySplash={x:dive.to.x,y:dive.to.y,elapsed:dive.elapsed-434,owner:profileId,level:ageLevel,scale:dive.style==='dive'?1.7:2.2};
}
if(dive.elapsed>=700)diveAnimation=null;
}
else if(swimming&&!swimmingTimberAt(player.x,player.y)&&islandPolys.some(poly=>inside(player.x,player.y,poly))){swimming=false;if(canWalk(player.x,player.y)){startGoggleToss();save();toast('Back on dry land. Keep exploring!');}else swimming=true;}
if(boating)boatPosition={x:player.x,y:player.y};
advanceLochDragon(dt);advanceBlueMarlin(dt);advanceSharkFins(dt);if(swimming&&!sharkRide){latchLochDragon();latchBlueMarlin();latchShark();}updateWaterControls();
}
function suggestionMarkup(text){
const parts=text.replace(/\s*↗\s*$/,'').split(' · ');
const key=parts.length>1?(parts[0]==='E'?parts.shift():parts.pop()):'Go';
return `<span class="suggestion-label">${escapeHTML(parts.join(' · '))}</span><span class="suggestion-separator" aria-hidden="true"> - </span><kbd>${escapeHTML(key)}</kbd>`;
}
function setSuggestionContent(button,text){
button.textContent=text;
button.innerHTML=suggestionMarkup(text);
}
function updateBoatInstruments(){
const showTimer=state.ferryRemaining>0||boating&&activeVessel==='ferry';
$('#boatInstruments').hidden=!boating&&!showTimer;
$('#ferryTimerInstrument').hidden=!showTimer;
$('#ferryTimeValue').textContent=formatRideTime(state.ferryRemaining);
$('#ferryTimeGauge').setAttribute('aria-valuenow',String(Math.ceil(state.ferryRemaining/1000)));
$('#ferryTimeGauge').setAttribute('aria-valuemax',String(FERRY_RIDE_DURATION/1000));
$('#ferryTimeBar').style.width=`${state.ferryRemaining/FERRY_RIDE_DURATION*100}%`;
$('#ferryTimerInstrument').setAttribute('data-level',state.ferryRemaining<=60000?'low':'ready');
$('#boatFuelInstrument').hidden=!boating||activeVessel==='ferry';
$('#boatSpeedInstrument').hidden=!boating;$('#boatTrimInstrument').hidden=!boating;
if(!boating)return;
const fuel=activeVessel==='ferry'?100:currentProfile().fuel[activeVessel];
$('#boatFuelValue').textContent=`${Math.ceil(fuel)}%`;
$('#boatFuelBar').style.width=`${fuel}%`;
$('#boatFuelGauge').setAttribute('aria-valuenow',String(Math.ceil(fuel)));
$('#boatFuelInstrument').setAttribute('data-level',fuel<=20?'low':'ready');
const velocity=boatMotion.velocity||0,speed=Math.min(100,Math.round(Math.abs(velocity)/boatTopSpeed(4)*100)),trim=boatTrimLevel();
$('#boatSpeedValue').textContent=`${velocity<-.5?'REV ':''}${speed}%`;
$('#boatSpeedBar').style.width=`${speed}%`;
$('#boatSpeedGauge').setAttribute('aria-valuenow',String(speed));
$('#boatSpeedGauge').setAttribute('aria-valuetext',`${speed}% of top speed${velocity<-.5?', reversing':''}`);
$('#boatTrimValue').textContent=`${trim} / 5`;
$('#boatTrimBar').style.width=`${trim*20}%`;
$('#boatTrimGauge').setAttribute('aria-valuenow',String(trim));
$('#boatTrimGauge').setAttribute('aria-valuetext',`${trim} of 5. Space changes motor trim.`);
$('#boatTrimMotor').setAttribute('transform',`rotate(${-trim*6} 32 25)`);
}
function updateWaterControls(){
if(activeVessel==='ferry'&&!boating&&state.ferryRemaining<=0&&!beachTransfer){const hadPose=!!state.ferryPose;returnExpiredFerry();if(hadPose)save();}
$('#mapBoatTrim').hidden=!boating||fishingActive;$('#mapBoatTrim').disabled=!vesselHasPower()||boatAnchorBusy()||!!beachTransfer||!!voyage;
$('#mapFishingReel').hidden=!fishingActive;
updateBoatInstruments();
updateVolleyballUI();updateFrisbeeUI();
updateBeachControls();
updateWakeboardUI();
$('#mapDragonMount').hidden=!canMountPetDragon();$('#mapDragonLand').hidden=!dragonFlight;$('#mapDragonLand').disabled=!['flying','swimming'].includes(dragonFlight?.stage);setSuggestionContent($('#mapDragonLand'),dragonFlight?.stage==='swimming'?'Take off · X ↗':dragonFlight?.stage==='flying'&&petDragonSwimWater(player.x,player.y)?'Swim dragon · X ↗':'Land dragon · X ↗');$('#mapDragonHome').hidden=!dragonFlight;
if(!swimming){sharkFins=[];clearSharkRide();resetSwimMotion();}
$('#mapSharkExit').hidden=!sharkRide||!!sharkRide.landing;
setSuggestionContent($('#mapSharkExit'),sharkRide?.kind==='marlin'?'Hop off marlin · X ↗':sharkRide?.kind==='dragon'?'Hop off monster · X ↗':'Hop off shark · X ↗');
$('#mapDive').hidden=!walkableTimberAt(player.x,player.y)||!shoreDiveTarget();$('#mapBoatExit').hidden=!boating||!!boatAnchor?.retrieving;$('#mapBoatExit').disabled=boatAnchorBusy();setSuggestionContent($('#mapBoatExit'),boatAnchorCasting()?'Throwing anchor · X ↗':activeVessel==='ferry'?'Exit ferry · X ↗':'Exit boat · X ↗');$('#mapBoatBoard').hidden=!hasSwimPower()||(!swimming&&!canBoardIslandBoat())||!canUseCurrentVessel()||!!diveAnimation||Math.hypot(player.x-boatPosition.x,player.y-boatPosition.y)>(swimming?44:75);
setSuggestionContent($('#mapBoatReturn'),swimming&&!sponsored()?'Return to shore ↗':'Return to dock ↗');$('#mapBoatReturn').hidden=!swimming;
const hint=wakeboardCrash?.kind==='release'?'WATERSPORTS · Dropping the rope…':wakeboardCrash?'WIPEOUT · The boat is completing its route back to the watersports dock.':wakeboardRide?(wakeboardRide.equipment==='waterskis'?'WATERSKIS':'WAKEBOARD')+' · Arrows / WASD steer the rider · The boat follows its programmed course · X drops the rope to swim.':dragonFlight?.stage==='swimming'?'DRAGON SWIM · Arrows / WASD swim · X or Take off flies again · Swim toward a beach to climb ashore.':dragonFlight?'DRAGON FLIGHT · Arrows / WASD fly · X lands on ground or water · Return to cottage brings you home.':shoreRecovery?'SHORE · '+(shoreRecovery.elapsed<1000?'Catching your breath…':shoreRecovery.elapsed<1450?'Shaking it off…':'Getting back up…'):shoreClimb?'SHORE · Pulling yourself onto the beach…':sharkRide?.landing?'SHORE LANDING · Your mount dives as you roll onto the beach.':sharkRide?.kind==='marlin'?'BLUE MARLIN RIDE · Arrows / WASD steer · X or Hop off to swim · Head to shore to land.':sharkRide?.kind==='dragon'?'LOCH NESS MONSTER · Arrows / WASD steer · X or Hop off to swim · Ride toward shore to roll onto land.':sharkRide?'SHARK RIDE · Arrows / WASD steer · X or Hop off to swim · Ride toward shore to roll onto land.':swimming?(sponsored()?'SWIMMING · Get close to a shark or blue marlin to ride · Arrows / WASD swim · E beside your boat to climb in · Swim onto shore to walk.':'SWIMMING · Get close to a shark or blue marlin to ride · Arrows / WASD swim · Swim onto shore to walk · Return to shore if you need a lift.'):boating?(activeVessel==='ferry'&&state.ferryRemaining<=0?'FERRY RIDE ENDED · The ferry is stopped. X exits; it returns to the main dock after you leave.':activeVessel!=='ferry'&&!vesselHasPower()?'OUT OF GAS · Press F to fish and refill your tank. X exits your boat.':fishingActive?'FISHING · Watch ripples · Cast ahead of a fish · Arrows aim; Enter/Space casts · Tap R to reel · Esc stops fishing · X exits: dock = walk, sea = dive.':`BOAT · Up/W forward · Down/S brake then reverse · Left/Right or A/D steer · Space trim ${boatTrimLevel()}/5${boatTrimLevel()===5?' · ROOSTER TAIL':''} · F to fish · X or Exit boat to get out.`):'ISLAND · Walk off the shoreline to dive & swim · X or Dive near shore · Visit the fishing dock to fish.';
if($('#waterControls').textContent!==hint)$('#waterControls').textContent=hint;
}
function stopFishing(){const restart=fishingActive&&boating;fishingActive=false;if(restart)startBoatEngines(false);$('#mapFishingReel').hidden=true;pendingCast=null;hookedFish=null;$('#reelFish').hidden=true;fishingSplash=null;keys.clear();$('#fishing').hidden=true;$('#mapBoatFish').hidden=!boating;canvas.setAttribute('aria-label','Seventeen-island map. Move with arrows or WASD. Sail to the outer islands by boat. Press E to interact.');}
function updateFishing(){updateWaterControls();$('#fishingLaunchBoat').hidden=!sponsored()||boating;
$('#gasStatus').textContent=`Fishing boat ${Math.ceil(currentProfile().fuel.fishing)}% · Speedboat ${Math.ceil(currentProfile().fuel.speedboat)}% · Reserve ${Math.floor(currentProfile().reserveGas)}%`;
$('#fishingRules').textContent=['Shore + bait · Bass, Salmon, Catfish · +2–5% gas','Shore + lure · Snook, Redfish, Trout · +5–10% gas','Shallow water boat · Tarpon, Wahoo, Kingfish · +10–15% gas','Deep water speedboat · Tuna, Blue-ringed Octopus, Shark · +10–15% gas'][fishingTier()];
$('#fishingStatus').textContent=sponsored()?`${FISHING_SPONSOR} · Unlimited bait · ${totalCatches()} fish caught`:`${state.bait} / 5 casts ready · ${totalCatches()} fish caught · ${5-totalCatches()} to sponsorship`;
setSuggestionContent($('#mapBoatFish'),activeVessel==='ferry'?'Fish from ferry · F ↗':'Fish from boat · F ↗');$('#boatFishBtn').textContent=activeVessel==='ferry'?'Fish from the ferry ↗':'Fish from your boat ↗';$('#mapBoatFish').hidden=!boating||fishingActive;$('#mapBoatReturn').hidden=!swimming;$('#boatBtn').hidden=!sponsored()&&!speedboatUnlocked();$('#boatFishBtn').hidden=!boating;$('#boatBtn').textContent=boating?(activeVessel==='speedboat'?'Return speedboat to its dock ↗':activeVessel==='fishing'?'Return boat to fishing dock ↗':'Return boat to ferry dock ↗'):sponsored()?'Launch my fishing boat ↗':'Launch my speedboat ↗';
$('#baitCount').textContent=sponsored()?'Bait: ∞ Unlimited':`Bait: ${state.bait} / 5 casts`;
$('#buyRod').textContent=sponsored()?'✓ Sponsored · Unlimited bait':state.bait?'Rod ready · '+state.bait+' casts':'Buy rod + 5 bait · 5 ◆';
$('#buyRod').disabled=sponsored()||state.bait>0||state.crystals<5;
$('#buyLure').textContent=state.fishingLure?'✓ Permanent lure owned':'Buy permanent lure · 20 ◆';
$('#buyLure').disabled=state.fishingLure||state.crystals<20;
$('#fishSet').disabled=boating||!state.fishingLure||!!pendingCast||!!hookedFish;
$('#reelFish').hidden=!hookedFish;
if(!state.fishingLure)fishSet='classic';$('#fishSet').value=fishSet;
const retired=[['barracuda','Barracuda'],['stingray','Stingray'],['marlin','Blue Marlin']].filter(([id])=>currentProfile().lifetimeCatches[id]>0).map(([id,name])=>({id,name,icon:'🐟'}));
$('#fishBadges').innerHTML=[...fishSpecies,...retired].map(f=>{const count=currentProfile().lifetimeCatches[f.id]||0;return `<li class="fish-badge ${count?'caught':'uncaught'}"><span aria-hidden="true">${count?f.icon:'?'}</span><strong>${f.name}</strong><small>${count?'Lifetime × '+count:'Not caught yet'}</small></li>`;}).join('');
}
function openFishing(){
if(boatAnchorBusy())return;
if(beachTransfer||volleyball||frisbeeGame)return;
if(wakeboardCrash||dragonFlight||wakeboardRide||volleyball||frisbeeGame){toast('Finish your current ride first.');return;}
if(voyage||swimming||shoreRecovery)return;closeMapPanel();if(!boating){player.x=fishingDock.x;player.y=fishingDock.y-8;}keys.clear();save();pendingCast=null;hookedFish=null;fishingSplash=null;lastCatch=null;updateFishing();$('#fishingFeedback').textContent=sponsored()?'Your sponsor supplies unlimited bait. Cast as often as you like!':state.bait?'Watch for underwater shadows and brief surface ripples. Lead a fish and cast into its path!':'Buy a rod for 5 crystals to get five casts. Each cast uses one bait, hit or miss.';fishingActive=true;if(boating)stopBoatPropulsion();$('#fishingPlace').textContent=boating?(activeVessel==='speedboat'?'SPEEDBOAT · OPEN WATER':activeVessel==='ferry'?'FERRY · FISHING FROM THE REAR DECK':'FISHING BOAT · OPEN WATER'):'MAIN ISLAND · FISHING DOCK';$('#fishing').hidden=false;chooseFishingZone();fishingAim={x:fishingZone.x+80,y:fishingZone.y+48};canvas.setAttribute('aria-label','Fishing on the island map. Click water to cast. Arrows aim; Enter or Space casts; tap R repeatedly to reel a hooked fish; Escape stops fishing.');$('#mapBoatFish').hidden=true;canvas.focus({preventScroll:true});draw();
}
function buyRod(){if(sponsored()||state.bait>0||state.crystals<5)return;state.crystals-=5;state.bait=5;update();$('#fishingFeedback').textContent='Five fresh baits! Aim ahead of a swimming fish and cast.';}
function buyLure(){if(state.fishingLure||state.crystals<20)return;state.crystals-=20;state.fishingLure=true;update();$('#fishingFeedback').textContent='Lure unlocked! Fish from shore for Snook, Redfish, and Trout; boats reach larger fish.';}
function chooseFishingZone(){
if(!boating){fishingZone={x:30,y:270};return;}
const options=[[20,20],[-175,20],[20,-125],[-175,-125],[-80,30],[-80,-130]].map(([x,y])=>({x:Math.max(WORLD.left+10,Math.min(WORLD.right-170,player.x+x)),y:Math.max(10,Math.min(WORLD.height-110,player.y+y))}));
fishingZone=options.find(z=>[0,40,80,120,150].every(x=>[0,35,70,100].every(y=>!islandPolys.some(p=>inside(z.x+x,z.y+y,p)))))||{x:30,y:270};
}
function castFishing(x,y){
if(!fishingActive||pendingCast||hookedFish)return;
if(fishSet!=='lure'&&!sponsored()&&!state.bait){$('#fishingFeedback').textContent='Out of bait! Buy another rod with five bait for 5 crystals.';return;}
if(islandPolys.some(p=>inside(x,y,p))){$('#fishingFeedback').textContent='Aim for the open water.';return;}
if(!Number.isFinite(x)||!Number.isFinite(y)||x<WORLD.left||x>WORLD.right||y<0||y>WORLD.height)return;
if(fishSet!=='lure'&&!sponsored())state.bait--;pendingCast={x,y,elapsed:0,origin:{x:fishingAngler().x+4,y:fishingAngler().y-9},lure:fishSet==='lure'};lastCatch=null;update();$('#fishingFeedback').textContent='Backswing… watch the line unfurl. Lead the fish’s path!';
}
function reelFishing(){
if(!fishingActive||!hookedFish||document.querySelector('dialog[open]'))return;
if(hookedFish.idle>=2000||hookedFish.elapsed-hookedFish.lastPull<140)return;
hookedFish.idle=0;hookedFish.lastPull=hookedFish.elapsed;
hookedFish.target=Math.min(1,hookedFish.target+1/6);
$('#fishingFeedback').textContent=`Reeling in ${hookedFish.fish.name} · ${Math.round(hookedFish.target*100)}% · Keep tapping R!`;
}
$('#reelFish').onclick=$('#mapFishingReel').onclick=()=>{reelFishing();canvas.focus({preventScroll:true});};
function landHookedFish(){
const hit=hookedFish.fish;hookedFish=null;
state.catches={...state.catches,[hit.id]:(state.catches[hit.id]||0)+1};
const lifetime=currentProfile().lifetimeCatches;lifetime[hit.id]=(lifetime[hit.id]||0)+1;
const [minimum,maximum]=hit.gas||[2,5],gas=minimum+Math.floor(Math.random()*(maximum-minimum+1));
const tank=boating&&activeVessel!=='ferry'?activeVessel:null;
const added=tank?Math.min(gas,100-currentProfile().fuel[tank]):gas;
if(tank)currentProfile().fuel[tank]+=added;else currentProfile().reserveGas+=gas;
lastCatch=hit;chime();
$('#fishingFeedback').textContent=`Caught a ${hit.name}! Lifetime: ${lifetime[hit.id]}. +${Math.round(added)}% gas ${tank?'to your tank':'to reserve'}. ${sponsored()?'Unlimited bait—keep casting!':state.bait?state.bait+' casts left.':'Bait is gone—refill for 5 crystals.'}`;
update();checkSponsorship();
}
function advanceFishing(dt){
if(!fishingActive){pendingCast=null;hookedFish=null;return;}
if(document.querySelector('dialog[open]'))return;
fishingTime+=dt;if(fishingSplash){fishingSplash.elapsed+=dt;if(fishingSplash.elapsed>900)fishingSplash=null;}
if(hookedFish){
hookedFish.elapsed+=dt;hookedFish.idle+=dt;
if(hookedFish.idle>=2000){hookedFish=null;$('#fishingFeedback').textContent='The fish shook free! Tap R repeatedly to reel; two seconds without reeling lets it escape.';updateFishing();}
else{hookedFish.progress=Math.min(hookedFish.target,hookedFish.progress+dt/900);if(hookedFish.progress>=1-1e-9)landHookedFish();}
}
if(pendingCast){pendingCast.elapsed+=dt;if(pendingCast.elapsed>=FISH_CAST_DURATION){const cast=pendingCast;pendingCast=null;fishingSplash={x:cast.x,y:cast.y,elapsed:0};const hit=fishingTargets().find(f=>((cast.x-f.x)/f.radius)**2+((cast.y-f.y)/(f.radius*.65))**2<=1);
if(hit){hookedFish={fish:hit,from:{x:cast.x,y:cast.y},elapsed:0,idle:0,lastPull:-Infinity,target:0,progress:0};$('#fishingFeedback').textContent=`${hit.name} hooked! Tap R repeatedly to reel it in. Don't pause for two seconds!`;}
else $('#fishingFeedback').textContent=`Splash! The fish slipped past. Aim a little ahead. ${sponsored()?'Unlimited bait—try again!':state.bait?state.bait+' casts left.':'Out of bait—refill for 5 crystals.'}`;
update();checkSponsorship();}}
}
function fishingLinePoints(tip,bait,flight,loop){
const dx=bait.x-tip.x,dy=bait.y-tip.y,length=Math.hypot(dx,dy)||1;
return Array.from({length:33},(_,i)=>{const u=i/32,envelope=Math.sin(Math.PI*u),wave=Math.sin(u*Math.PI*3-flight*12)*loop*envelope;return {x:tip.x+dx*u-dy/length*wave,y:tip.y+dy*u+dx/length*wave+envelope*length*.08*(1-flight)};});
}
function fishingCastPose(cast){
const t=Math.max(0,Math.min(1,cast.elapsed/FISH_CAST_DURATION)),hand=cast.origin||{x:player.x+4,y:player.y-9};
const heading=Math.atan2(cast.y-hand.y,cast.x-hand.x),windup=Math.min(1,t/.22),flight=Math.max(0,Math.min(1,(t-.22)/.78));
const angle=t<.22?heading-1.4-Math.sin(windup*Math.PI/2)*1.3:heading-2.7*Math.exp(-flight*9)+Math.sin(flight*11)*.18*Math.exp(-flight*4);
const tip={x:hand.x+Math.cos(angle)*25,y:hand.y+Math.sin(angle)*25};
const start={x:hand.x+Math.cos(heading-2.7)*28,y:hand.y+Math.sin(heading-2.7)*28};
const bait=t<.22?{x:tip.x+Math.cos(angle-.8)*5,y:tip.y+Math.sin(angle-.8)*5}:{x:start.x+(cast.x-start.x)*flight,y:start.y+(cast.y-start.y)*flight-Math.sin(flight*Math.PI)*Math.min(45,Math.hypot(cast.x-start.x,cast.y-start.y)*.3)};
const loop=t<.22?6:Math.sin(flight*Math.PI)*18+Math.sin(flight*16)*7*(1-flight);
const line=fishingLinePoints(tip,bait,flight,loop);
return {t,hand,tip,bait,line,bend:Math.sin(t*Math.PI*2)*8};
}
// Species anatomy is drawn in local coordinates so fins, tails, and arms move independently.
function drawFishAnatomy(f){
const c=ctx,beat=f.tail||0,time=fishingTime*.008;
const shape=(points,color)=>{c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
const eye=(x,y)=>{c.fillStyle='#e7dfb0';c.beginPath();c.arc(x,y,1.15,0,Math.PI*2);c.fill();c.fillStyle='#182f37';c.beginPath();c.arc(x+.25,y,.6,0,Math.PI*2);c.fill();};
const stroke=(color,width,draw)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();draw();c.stroke();};
if(f.id==='octopus'){
// Eight tapered, curling arms, individual suckers, and luminous blue rings.
for(let arm=0;arm<8;arm++){
 const angle=arm*Math.PI/4,sway=Math.sin(time+arm*.8)*.3,reach=12+(arm%3)*2;
 const x=Math.cos(angle)*reach,y=Math.sin(angle)*reach*.68;
 stroke('#92663f',2.7,()=>{c.moveTo(Math.cos(angle)*3,Math.sin(angle)*3);c.bezierCurveTo(x*.5-y*.3,y*.5+x*.15,x-y*sway,y+x*sway,x+Math.sin(time+arm)*2,y-2);});
 for(let i=1;i<4;i++){const t=i/4;c.fillStyle='#dfbe87';c.beginPath();c.arc(x*t,y*t,.65,0,Math.PI*2);c.fill();}
}
c.fillStyle='#c39a5e';c.beginPath();c.ellipse(0,-1,6,7,.2,0,Math.PI*2);c.fill();
c.fillStyle='#e1b973';c.beginPath();c.ellipse(1,-3,3,4,.2,0,Math.PI*2);c.fill();
for(let i=0;i<11;i++){const angle=i*2.4,r=2+(i%3)*1.4;stroke('#3460b6',.9,()=>c.ellipse(Math.cos(angle)*r,Math.sin(angle)*r-1,1.15,.9,angle,0,Math.PI*2));}
eye(3,2);eye(-2,3);return;
}
if(f.id==='stingray'){
const flap=beat*3;
c.fillStyle='#7c8199';c.beginPath();c.moveTo(11,0);c.bezierCurveTo(4,-5,-1,-11+flap,-13,-13+flap);c.quadraticCurveTo(-8,-3,-9,0);c.quadraticCurveTo(-8,3,-13,13-flap);c.bezierCurveTo(-1,11-flap,4,5,11,0);c.fill();
c.fillStyle='#aaa8b5';c.beginPath();c.ellipse(1,0,6,4,0,0,Math.PI*2);c.fill();
stroke('#646a83',1.3,()=>{c.moveTo(-6,0);c.bezierCurveTo(-16,2,-22,beat*5,-29,beat*6);});
stroke('#b8b7c2',.6,()=>{c.moveTo(4,0);c.quadraticCurveTo(-3,-4,-10,-10+flap);c.moveTo(4,0);c.quadraticCurveTo(-3,4,-10,10-flap);});
for(let i=0;i<9;i++){c.fillStyle='#d2c8ba';c.beginPath();c.arc(-6+i%3*4,-5+Math.floor(i/3)*5,.55,0,Math.PI*2);c.fill();}eye(5,-2);eye(5,2);return;
}
const shark=f.id==='shark',marlin=f.id==='marlin',snook=f.id==='snook';
const tier=Math.floor(FISH_IDS.indexOf(f.id)/3),length=marlin?18:shark?22:tier===0?12:tier===1?15:tier===2?20:23,depth=f.id==='tuna'?8:shark?6:snook?5:tier===0?4:4.5;
const back=shark?'#607a89':marlin?'#306895':f.color||'#7d9e9b';
const belly=shark?'#cbd6ce':marlin?'#a0d2d3':snook?'#d4d7b0':'#d2ddd1';
// Flexing forked/crescent tail, separate from the body.
c.save();c.translate(-length+3,0);c.rotate(beat*.22);
shape([[3,0],[-9,-(shark||marlin?10:7)],[-6,-2],[-4,0],[-6,2],[-9,shark||marlin?10:7]],back);c.restore();
shape([[-5,-2],[-4,-(shark?15:marlin?12:7)],[2,-(marlin?11:4)],[7,-2]],back);
shape([[2,2],[-4,shark?12:8],[4,5],[8,1]],back);
if(marlin)for(let i=0;i<5;i++)stroke('#4a9abd',.5,()=>{c.moveTo(-4+i*2,-3);c.lineTo(-4+i*2,-10+i);});
c.fillStyle=back;c.beginPath();c.moveTo(-length,0);c.bezierCurveTo(-length+6,-depth-1,length-7,-depth-2,length,0);c.bezierCurveTo(length-6,depth+1,-length+6,depth,-length,0);c.fill();
c.fillStyle=belly;c.beginPath();c.moveTo(-length+2,1);c.quadraticCurveTo(0,depth+3,length-1,0);c.quadraticCurveTo(2,depth-1,-length+2,1);c.fill();
stroke(snook?'#384f46':'#afc4bc',snook?1.1:.55,()=>{c.moveTo(-length+4,0);c.quadraticCurveTo(0,-.5,length-3,.3);});
if(['bass','trout','wahoo','kingfish'].includes(f.id))for(let i=0;i<7;i++){const x=-length+5+i*(length*2-10)/7;stroke('#456b6c',.8,()=>{c.moveTo(x,-depth*.55);c.lineTo(x+1,depth*.35);});}
if(f.id==='redfish'){c.fillStyle='#344f4b';c.beginPath();c.arc(-length+5,0,1.6,0,Math.PI*2);c.fill();}
if(f.id==='catfish')for(const side of [-1,1])stroke('#536c67',.65,()=>{c.moveTo(length-1,1);c.quadraticCurveTo(length+5,side*5,length+9,side*6);});
if(f.id==='tuna')for(let i=0;i<4;i++)shape([[-12+i*4,-4],[-14+i*4,-7],[-10+i*4,-4]],'#e0c868');
if(f.id==='barracuda'){
for(let i=0;i<8;i++){const x=-12+i*3;stroke('#4f7475',.75,()=>{c.moveTo(x,-2.1);c.lineTo(x+1,-.5);});}
shape([[length-2,0],[length+4,1],[length,2],[length-5,1]],'#b7cbc0');
for(let i=0;i<3;i++)shape([[length-3+i,1],[length-2.5+i,2],[length-2+i,1]],'#e7eee0');
}
if(marlin){shape([[length-3,-1],[length+15,-1],[length+4,.1],[length-3,1]],'#6b9aaf');for(let i=0;i<7;i++)stroke('#82c2d1',.65,()=>{const x=-10+i*3;c.moveTo(x,-2.3);c.lineTo(x+1,1.5);});}
const gills=shark?5:2;for(let i=0;i<gills;i++)stroke('#435e64',.45,()=>{const x=length-8-i*1.2;c.moveTo(x,-depth*.6);c.quadraticCurveTo(x-1,0,x,depth*.6);});
eye(length-3,-1);
stroke('#38535a',.45,()=>{c.moveTo(length-3,1.6);c.lineTo(length,1);});
// Broken highlights suggest scales without turning the swimmer into a flat symbol.
for(let i=0;i<8;i++){c.fillStyle='#e4e9cc66';c.fillRect(-length+6+i*2.5,-1.7+(i%2)*.5,.8,.45);}
}
function drawSwimmingFish(f){
if(!f.nearSurface)return;
const c=ctx;c.save();c.translate(f.x,f.y);c.scale(f.direction,1);c.rotate(Math.sin(fishingTime*.004)*.035);
// The complete anatomy remains water-tinted and submerged.
c.save();c.globalAlpha=.22+f.surface*.25;drawFishAnatomy(f);c.restore();
if(f.surface>.12){
// Only a narrow strip of anatomy breaks the water during a surface pass.
c.save();c.globalAlpha=f.surface*.8;c.beginPath();c.rect(-40,-3-f.surface*3,85,4+f.surface*2);c.clip();drawFishAnatomy(f);c.restore();
c.globalAlpha=f.surface*.5;c.strokeStyle='#d7efe6';c.lineWidth=.6;
for(let i=0;i<3;i++){c.beginPath();c.ellipse(-6-i*5,2+i,9+i*5,1.3+i*.7,0,.15,Math.PI*.95);c.stroke();}
}
c.restore();
}

function fishingAngler(){
if(boating&&activeVessel==='ferry')return {x:player.x-Math.cos(boatMotion.heading)*19,y:player.y-Math.sin(boatMotion.heading)*19};
return {x:player.x,y:player.y};
}
function hookedFishingPose(){
const angler=fishingAngler(),h=hookedFish,pull=Math.max(0,1-(h.elapsed-h.lastPull)/420),time=h.elapsed/1000;
const dx=h.from.x-angler.x,dy=h.from.y-angler.y,length=Math.hypot(dx,dy)||1,side=dx>=0?1:-1;
const struggle=(Math.sin(time*19)*4+Math.sin(time*31)*2)*(1-h.progress*.65);
const fish={...h.fish,x:h.from.x+(angler.x+side*20-h.from.x)*h.progress-dy/length*struggle,y:h.from.y+(angler.y+12-h.from.y)*h.progress+dx/length*struggle,tail:Math.sin(time*28),surface:1,nearSurface:true};
const lean=.12+pull*.32,hand={x:angler.x+side*(5-lean*9),y:angler.y-12-pull*6};
const tip={x:hand.x+side*(17-pull*12),y:hand.y-19-pull*15};
return {fish,pull,lean,side,hand,tip,time};
}
function drawHookedFishing(){
const angler=fishingAngler(),c=ctx,p=hookedFishingPose(),baseY=angler.y-(boating?6:0);
// Feet stay planted while the back and shoulders lean away from the fish.
rect(angler.x-5,baseY-3,4,6,'#3e5555');rect(angler.x+2,baseY-3,4,6,'#3e5555');
c.save();c.translate(angler.x,baseY-3);c.rotate(-p.side*p.lean);
const colors=characterColors();
rect(-5,-11,11,11,colors.shirt);rect(-4,-10,8,5,colors.accent);
if(currentProfile().character==='girl')rect(-8,-19,4,12,colors.hair);
rect(-4,-20,9,9,'#f2c992');rect(-5,-21,11,4,colors.hair);
rect(2,-16,1,2,'#354744');c.restore();
c.strokeStyle='#f2c992';c.lineWidth=3;
c.beginPath();c.moveTo(angler.x-p.side*p.lean*14,baseY-15);c.lineTo(p.hand.x-p.side*5,p.hand.y+4);c.lineTo(p.hand.x,p.hand.y);c.stroke();
// The other hand turns the reel handle during each deliberate pull.
const crank=(1-p.pull)*Math.PI*3;
c.beginPath();c.moveTo(angler.x-p.side*4,baseY-11);c.lineTo(p.hand.x-p.side*3+Math.cos(crank)*3,p.hand.y+4+Math.sin(crank)*3);c.stroke();
// A high, loaded rod curves toward the struggling fish.
c.strokeStyle='#705439';c.lineWidth=1.8;c.beginPath();c.moveTo(p.hand.x,p.hand.y);
c.bezierCurveTo(p.hand.x-p.side*9,p.hand.y-28-p.pull*13,p.tip.x-p.side*14,p.tip.y-15,p.tip.x,p.tip.y);c.stroke();
ellipse(p.hand.x-p.side*2,p.hand.y+2,2.5,2.5,'#c5b17b');
const mouth={x:p.fish.x-p.side*18,y:p.fish.y};
c.strokeStyle='#f5edcf';c.lineWidth=.8;c.beginPath();c.moveTo(p.tip.x,p.tip.y);c.quadraticCurveTo((p.tip.x+mouth.x)/2,(p.tip.y+mouth.y)/2+(1-p.pull)*4,mouth.x,mouth.y);c.stroke();
c.save();c.translate(p.fish.x,p.fish.y);c.rotate(Math.sin(p.time*17)*.25);c.scale(-p.side,1);drawFishAnatomy(p.fish);c.restore();
c.strokeStyle='#e2f8ee99';c.lineWidth=.8;c.beginPath();c.ellipse(p.fish.x,p.fish.y+2,12+Math.sin(p.time*22)*3,4,0,0,Math.PI*2);c.stroke();
c.fillStyle='#fff2cd';c.font='bold 7px monospace';c.textAlign='center';
c.fillText(`TAP R · REEL ${Math.round(hookedFish.progress*100)}%`,angler.x,angler.y-46);
}
function drawFishing(){
if(!fishingActive)return;const c=ctx;
c.save();c.font='6px monospace';c.fillStyle='#edf8e799';['CLOSE','MEDIUM','FAR'].forEach((label,i)=>c.fillText(label,fishingZone.x+165,fishingZone.y+[14,50,86][i]));c.restore();
fishingTargets().filter(f=>!hookedFish||f.id!==hookedFish.fish.id).forEach(drawSwimmingFish);
if(hookedFish){c.save();drawHookedFishing();c.restore();return;}
c.save();c.strokeStyle='#e4f1dc88';c.lineWidth=.65;c.beginPath();c.arc(fishingAim.x,fishingAim.y,5,0,Math.PI*2);c.stroke();
const cast=pendingCast||{x:fishingAim.x,y:fishingAim.y,elapsed:FISH_CAST_DURATION,origin:{x:fishingAngler().x+4,y:fishingAngler().y-9}},pose=fishingCastPose(cast);
c.strokeStyle='#705439';c.lineWidth=1.7;c.beginPath();c.moveTo(pose.hand.x,pose.hand.y);c.quadraticCurveTo((pose.hand.x+pose.tip.x)/2+pose.bend,(pose.hand.y+pose.tip.y)/2-pose.bend,pose.tip.x,pose.tip.y);c.stroke();
if(pendingCast){
c.strokeStyle='#f5edcfcc';c.lineWidth=.65;c.beginPath();pose.line.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();
c.save();c.translate(pose.bait.x,pose.bait.y);c.rotate(Math.atan2(pendingCast.y-pose.hand.y,pendingCast.x-pose.hand.x)+Math.sin(pose.t*14)*.4);
if(pendingCast.lure){c.fillStyle='#d9c98b';c.fillRect(-2,-.7,4,1.4);c.fillStyle='#b86c55';c.fillRect(1,-.7,1,1.4);}
else{c.strokeStyle='#c78473';c.lineWidth=1.2;c.beginPath();c.moveTo(-2,-1);c.bezierCurveTo(0,-2,0,2,2,1);c.stroke();}
c.strokeStyle='#506063';c.lineWidth=.5;c.beginPath();c.arc(1,1,1.2,0,Math.PI);c.stroke();c.restore();
}
if(fishingSplash){const p=fishingSplash.elapsed/900;c.strokeStyle=`rgba(225,246,235,${(1-p)*.75})`;c.lineWidth=.8;for(let i=0;i<3;i++){const radius=2+p*13+i*3;c.beginPath();c.ellipse(fishingSplash.x,fishingSplash.y,radius,radius*.36,0,0,Math.PI*2);c.stroke();}}
if(lastCatch){c.fillStyle='#fff2cd';c.font='bold 9px sans-serif';c.textAlign='center';c.fillText('✦ '+lastCatch.name+' caught! ✦',fishingZone.x+80,fishingZone.y-12);}
c.restore();
}

canvas.onpointermove=e=>{if(!fishingActive)return;const r=canvas.getBoundingClientRect();fishingAim={x:(e.clientX-r.left)/r.width*WORLD.viewWidth+camera.x,y:(e.clientY-r.top)/r.height*WORLD.viewHeight+camera.y};};
canvas.onkeydown=e=>{if(!fishingActive||document.querySelector('dialog[open]'))return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Enter','Escape'].includes(e.key)){e.preventDefault();if(e.key==='Escape')stopFishing();else if(e.key===' '||e.key==='Enter')castFishing(fishingAim.x,fishingAim.y);else{fishingAim.x=Math.max(WORLD.left,Math.min(WORLD.right,fishingAim.x+(e.key==='ArrowLeft'?-6:e.key==='ArrowRight'?6:0)));fishingAim.y=Math.max(0,Math.min(WORLD.height,fishingAim.y+(e.key==='ArrowUp'?-6:e.key==='ArrowDown'?6:0)));}}};
const boatIslands=[
{id:'palm-cove',name:'Palm Cove',x:1120,y:220,biome:'palm',color:'#9abb75'},
{id:'coral-key',name:'Coral Key',x:1510,y:510,biome:'coral',color:'#a6cba3'},
{id:'turtle-lagoon',name:'Turtle Lagoon',x:1120,y:880,biome:'lagoon',color:'#8ebbb0'},
{id:'sunset-atoll',name:'Sunset Atoll',x:1660,y:1050,biome:'palm',color:'#bbbd7c'},
{id:'mango-isle',name:'Mango Isle',x:2060,y:240,biome:'orchard',color:'#9eb964'},
{id:'starfish-bay',name:'Starfish Bay',x:2500,y:540,biome:'coral',color:'#a8bd87'},
{id:'moonstone',name:'Moonstone Island',x:2900,y:220,biome:'crystal',color:'#aaa5b9'},
{id:'bamboo-retreat',name:'Bamboo Retreat',x:2160,y:1000,biome:'pine',color:'#83a680'},
{id:'ember-island',name:'Ember Island',x:2860,y:1080,biome:'crystal',color:'#b0a078'},
{id:'aurora-cay',name:'Aurora Cay',x:2600,y:1530,biome:'crystal',color:'#96b3b0'},
{id:'pearl-haven',name:'Pearl Haven',x:1690,y:1550,biome:'lagoon',color:'#b0c69d'},
{id:'driftwood-isle',name:'Driftwood Isle',x:650,y:1280,biome:'pine',color:'#92aa78'}
].map((island,index)=>({...island,boatOnly:true,dock:{x:island.x,y:island.y+103,islandId:island.id},practice:index*7%100}));
const mainlandBeach={id:'mainland-beach',name:'Mainland Beach',x:1600,y:WORLD.height-55,mainland:true,color:'#ead6a1'};
const beachPoly=[[WORLD.left,1698],[0,1698],[240,1686],[520,1702],[820,1688],[1120,1700],[1450,1684],[1780,1700],[2110,1688],[2460,1702],[2800,1687],[3200,1700],[WORLD.right,1700],[WORLD.right,WORLD.height],[WORLD.left,WORLD.height]];
const allIslands=[...locations,...boatIslands,mainlandBeach];

const camera={x:0,y:0};
const dock=MAIN_DOCK,farDock={x:740,y:535};
const islandPolys=[mainPoly,...allIslands.slice(1).map(l=>l.mainland?beachPoly:[[-100,-55],[-72,-92],[-20,-103],[45,-92],[88,-58],[108,-5],[96,55],[54,88],[-18,96],[-80,66],[-109,10]].map(([x,y])=>[l.x+x,l.y+y]))];
function trimTimberToShore(timber,pier=false){
const horizontal=timber.w>timber.h,length=horizontal?timber.w:timber.h,water=[];
for(let along=0;along<=length;along++){
const x=timber.x+(horizontal?along:timber.w/2),y=timber.y+(horizontal?timber.h/2:along);
if(!islandPolys.some(poly=>inside(x,y,poly)))water.push(along);
}
if(!water.length)return null;
// Three pixels of beach contact anchor each end without extending inland.
const start=Math.max(0,water[0]-3),end=pier?length:Math.min(length,water[water.length-1]+3);
return {...timber,x:timber.x+(horizontal?start:0),y:timber.y+(horizontal?0:start),w:horizontal?end-start:timber.w,h:horizontal?timber.h:end-start};
}
// Pier bases meet the shoreline; their seaward tips stay in place.
const piers=[
{dock,x:dock.x-9,y:dock.y-28,w:18,h:53},
{dock:farDock,x:farDock.x-9,y:farDock.y-28,w:18,h:46},
{dock:fishingDock,x:fishingDock.x-9,y:fishingDock.y-11,w:18,h:42},
{dock:WATERSPORTS_DOCK,x:WATERSPORTS_DOCK.x-9,y:WATERSPORTS_DOCK.y-28,w:18,h:53},
...boatIslands.map(l=>({dock:l.dock,x:l.dock.x-9,y:l.dock.y-28,w:18,h:46}))
].map(p=>trimTimberToShore(p,true));
const speedboatPier=trimTimberToShore({dock:SPEEDBOAT_DOCK,x:SPEEDBOAT_DOCK.x-9,y:SPEEDBOAT_DOCK.y-28,w:18,h:53},true);
function activePiers(){return speedboatUnlocked()?[...piers,speedboatPier]:piers;}
let voyage=null;
let activeVessel=['ferry','speedboat'].includes(state.parkedBoat?.vessel)?state.parkedBoat.vessel:'fishing';
let ferryPosition=activeVessel==='ferry'?{...boatPosition}:ferryBerth(dock),ferryHeading=activeVessel==='ferry'?(state.parkedBoat?.heading||0):0;
let fishingBoatPosition=activeVessel==='fishing'?{...boatPosition}:{...BOAT_MOORING},fishingBoatHeading=0;
let speedboatPosition=activeVessel==='speedboat'?{...boatPosition}:{...SPEEDBOAT_MOORING},speedboatHeading=activeVessel==='speedboat'?(state.parkedBoat?.heading||0):0;
const crossings=[{x:320,y:155,w:88,h:14},{x:595,y:155,w:72,h:14}].map(b=>trimTimberToShore(b)).filter(Boolean);
const woodlandBridge=trimTimberToShore({x:locations[4].x-7,y:locations[2].y+74,w:14,h:120});
const WAKEBOARD_COURSE=buildWakeboardCourse();
// Fixed, island-specific planting plans keep each destination recognizable.
// Coordinates are relative to its discovery marker, followed by tree scale.
const islandTreeLayouts=[
// Cottage: loose shade trees around the outer clearing.
[[-110,-15,.85],[-125,46,.75],[-66,74,.7],[78,8,.8],[82,58,.7]],
// Moonwater: a crescent around the pond's open eastern bank.
[[-60,-24,.75],[-40,-48,.8],[-5,-51,.7],[32,-39,.8],[59,-11,.65],[63,27,.7],[40,65,.6]],
// Sunseed: two orchard columns framing the garden beds.
[[-56,-40,.7],[58,-40,.7],[-56,48,.7],[58,48,.7],[-44,66,.65],[44,66,.65]],
// Whispering woods: uneven groves surrounding a central clearing.
[[-62,-30,.85],[-36,-37,.75],[0,-43,.9],[45,-27,.8],[65,5,.7],[-70,10,.8],[-43,4,.7],[-64,45,.75],[-26,48,.85],[30,63,.8],[56,50,.7]],
// Cavern: sparse, small trees along the lower rocky rim.
[[-68,26,.55],[-48,65,.6],[67,43,.5]]
];
// Track every planted tree independently of camera visibility or rendering.
const BOAT_IGNITION_DURATION=1800,BOAT_EXPLOSION_DURATION=11800;
const boatExplosions=new Map();
function boatBlastRandom(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function createBoatBlast(boat){
const random=boatBlastRandom((boat.x*7919+boat.y*104729)>>>0),c=Math.cos(boat.heading),s=Math.sin(boat.heading);
const debris=Array.from({length:64},(_,i)=>{
const angle=random()*Math.PI*2,speed=40+random()*115,along=(random()-.5)*(boat.vessel==='ferry'?65:43),side=(random()-.5)*18;
const p={kind:i%8,x:boat.x+c*along-s*side,y:boat.y+s*along+c*side,z:5+random()*9,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed*.8,vz:65+random()*105,angle:random()*Math.PI*2,spin:(random()-.5)*17,size:.65+random()*.9};
p.flight=(p.vz+Math.sqrt(p.vz*p.vz+320*p.z))/160;
const travel=(1-Math.exp(-.25*p.flight))/.25;
p.landX=p.x+p.vx*travel;p.landY=p.y+p.vy*travel;
p.land=islandPolys.some(poly=>inside(p.landX,p.landY,poly));
return p;
});
return {...boat,elapsed:0,debris,cloud:Array.from({length:72},()=>({angle:random()*Math.PI*2,r:random(),size:5+random()*14,drift:random()-.35,delay:random()*.22})),sparks:Array.from({length:100},()=>({angle:random()*Math.PI*2,speed:45+random()*190,life:.35+random()*1.3}))};
}
function boatDebrisPose(p,time){
const airborne=time<p.flight,t=Math.min(time,p.flight),travel=(1-Math.exp(-.25*t))/.25;
const settled=Math.max(0,time-p.flight),slide=p.land?(1-Math.exp(-settled*5))*3:0;
return {x:p.x+p.vx*travel+p.vx*.035*slide,y:p.y+p.vy*travel+p.vy*.035*slide,
z:airborne?Math.max(0,p.z+p.vz*t-80*t*t):p.land?Math.abs(Math.sin(settled*12))*Math.exp(-settled*6)*5:0,
angle:p.angle+p.spin*(airborne?t:p.flight+(1-Math.exp(-settled*7))*.1),airborne,settled};
}
function boatBlastGlow(x,y,rx,ry,stops){
ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);
const gradient=ctx.createRadialGradient(0,0,0,0,0,1);
if(gradient?.addColorStop)for(const [offset,color] of stops)gradient.addColorStop(offset,color);
ctx.fillStyle=gradient||stops[0][1];ctx.beginPath();ctx.arc(0,0,1,0,Math.PI*2);ctx.fill();ctx.restore();
}
function boatIsExploding(vessel){const blast=boatExplosions.get(vessel);return !!blast&&blast.elapsed>=BOAT_IGNITION_DURATION;}
function dragonFireTouchesBoat(boat){
const length=58*petDragonFireEnvelope();if(length<3)return false;
const flight=dragonFlight,heading=flight?.heading||0,upright=Math.cos(heading)<0?-1:1;
const origin=flight?player:petDragonPosition,c=Math.cos(heading),sn=Math.sin(heading),time=petDragonFire.elapsed/1000;
const hull=boatHull(boat.x,boat.y,boat.heading,boat.vessel);
for(let d=0;d<=Math.ceil(length);d++){
const distance=Math.min(d,length),s=distance/length;
const curl=Math.sin(s*13-time*16)*s*2.5+Math.sin(s*29-time*24)*s*s*1.7;
const spread=(.8+8*Math.sin(Math.PI*Math.pow(s,.75)))*(1-.7*s);
for(const edge of [-1,0,1]){
const localX=26+distance,localY=(-1+curl+edge*spread)*upright;
const x=origin.x+c*localX-sn*localY,y=origin.y-(flight?.altitude||0)+sn*localX+c*localY;
// Include the raised cabin and outboards above the water-plane hull.
for(const height of [0,8,16])if(inside(x,y+height,hull))return true;
}
}
return false;
}
function checkBoatDragonFireHits(){
if(!petDragonFire)return;
const ferry=activeVessel==='ferry'?boatPosition:ferryPosition;
const fishing=activeVessel==='fishing'?boatPosition:fishingBoatPosition;
const speed=activeVessel==='speedboat'?boatPosition:speedboatPosition;
const tow=wakeboardRide||wakeboardBoatTrip;
const boats=[{...ferry,heading:activeVessel==='ferry'?boatMotion.heading:ferryHeading,vessel:'ferry'},
...(sponsored()?[{...fishing,heading:activeVessel==='fishing'?boatMotion.heading:fishingBoatHeading,vessel:'fishing'}]:[]),
...(speedboatUnlocked()?[{...speed,heading:activeVessel==='speedboat'?boatMotion.heading:speedboatHeading,vessel:'speedboat'}]:[]),
{x:tow?.boat.x??WATERSPORTS_DOCK.x+40,y:tow?.boat.y??WATERSPORTS_DOCK.y+18,heading:tow?.heading??wakeboardDockHeading,vessel:'tow'}];
for(const boat of boats){
if(boatExplosions.has(boat.vessel)||!dragonFireTouchesBoat(boat))continue;
boatExplosions.set(boat.vessel,createBoatBlast(boat));
if(boat.vessel===activeVessel&&boating){
stopFishing();boating=false;swimming=true;diveAnimation=null;resetBoatMotion();keys.clear();save();updateWaterControls();
}
if(boat.vessel==='tow'){
if(wakeboardRide){stopFishing();wakeboardRide=null;swimming=true;keys.clear();save();updateWaterControls();}
wakeboardBoatTrip=null;waterskiWake=[];
}
toast('The boat is catching fire! Stand clear…');
}
}
function drawBoatDebris(p,time){
const pose=boatDebrisPose(p,time),{x,y,z,airborne,settled}=pose;
const wood=p.kind<=2;
if(!airborne&&!p.land&&settled>(wood?5.5:1.1))return;
ctx.save();
if(airborne){ctx.globalAlpha=.18/(1+z*.025);ctx.fillStyle='#243c3b';ctx.beginPath();ctx.ellipse(x,y,4*p.size,1.8*p.size,0,0,Math.PI*2);ctx.fill();}
if(!airborne&&!p.land){
// Each fragment makes its own impact crown and expanding water rings.
if(settled<1.3){
ctx.globalAlpha=(1-settled/1.3)*.8;ctx.strokeStyle='#dbfff4';ctx.lineWidth=.65;
for(let ring=0;ring<2;ring++){ctx.beginPath();ctx.ellipse(x,y,2+settled*15+ring*3,1+settled*6+ring,0,0,Math.PI*2);ctx.stroke();}
for(let i=0;i<7;i++){
const a=i*Math.PI*2/7,age=Math.min(settled,.65),height=Math.max(0,32*age-48*age*age);
ctx.fillStyle=i%2?'#effff8':'#9bd4d7';ctx.beginPath();ctx.ellipse(x+Math.cos(a)*age*17,y+Math.sin(a)*age*6-height,.65,1.2,0,0,Math.PI*2);ctx.fill();
}
}
ctx.globalAlpha=wood?Math.min(1,(5.5-settled)/1.5):Math.max(0,1-settled/1.1);
}else ctx.globalAlpha=airborne?1:Math.max(0,Math.min(1,(8.7-settled)/1.5));
if(ctx.globalAlpha<=0){ctx.restore();return;}
const bob=!airborne&&!p.land?Math.sin(time*3+p.angle)*.6:0;
ctx.translate(x,y-z+bob);ctx.rotate(pose.angle);ctx.scale(p.size,p.size);
// Recognizable broken planks, painted hull panels, glass, engines and rails.
if(p.kind<=2){
polygon([[-6,-1.8],[3,-2],[6,-.7],[3,0],[5,1.7],[-5,1.5]],p.kind===0?'#d3ac70':p.kind===1?'#795438':'#f0d09b');
ctx.strokeStyle='#493a2a';ctx.lineWidth=.45;ctx.beginPath();ctx.moveTo(-5,-.6);ctx.lineTo(3,-.3);ctx.moveTo(-3,.8);ctx.lineTo(2,.6);ctx.stroke();
}else if(p.kind===3){polygon([[-6,-4],[5,-3],[7,1],[1,4],[-4,2]],'#497c7e');polygon([[-5,-3],[4,-2],[5,0],[-3,1]],'#b7c9b6');}
else if(p.kind===4){polygon([[-3,-4],[4,-2],[2,3],[-2,2]],'#b5e8e6');ctx.strokeStyle='#f4ffff';ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(-2,-3);ctx.lineTo(2,0);ctx.stroke();}
else if(p.kind===5){polygon([[-4,-5],[3,-4],[4,2],[1,5],[-3,3]],'#303d40');ctx.fillStyle='#899a9d';ctx.fillRect(-2,-3,3,2);ctx.fillStyle='#172a2e';for(let i=0;i<3;i++)ctx.fillRect(-2,i,4,.5);}
else if(p.kind===6){ctx.strokeStyle='#d6d9ce';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(-7,2);ctx.lineTo(-4,-3);ctx.lineTo(5,-3);ctx.lineTo(7,1);ctx.stroke();}
else{polygon([[-3,-3],[4,-2],[3,3],[-4,2]],'#a7603e');ctx.fillStyle='#e7b36a';ctx.fillRect(-2,-2,4,1);}
ctx.restore();
}
function drawBoatExplosions(){
for(const blast of boatExplosions.values()){
const age=blast.elapsed/1000,t=(blast.elapsed-BOAT_IGNITION_DURATION)/1000,x=blast.x,y=blast.y;
ctx.save();
if(t<0){
const heat=age/(BOAT_IGNITION_DURATION/1000),c=Math.cos(blast.heading),sn=Math.sin(blast.heading);
// Hot reflections, spreading flame tongues, and soot build before detonation.
ctx.globalAlpha=.25+heat*.25;boatBlastGlow(x,y+4,25+heat*17,8,[[0,'#ff9e48'],[1,'#ff6a1000']]);ctx.globalAlpha=1;
for(let i=0;i<2+Math.floor(heat*10);i++){
const along=(i%6-2.5)*7,side=i<6?-5:5,fx=x+c*along-sn*side,fy=y+sn*along+c*side-4;
const height=(8+heat*25)*( .65+.35*Math.sin(age*19+i*2));
boatBlastGlow(fx,fy-height*.45,5+heat*3,height*.7,[[0,'#ffbd52bb'],[.45,'#eb5a1b66'],[1,'#cf3d0800']]);
ctx.beginPath();ctx.moveTo(fx-3,fy);ctx.bezierCurveTo(fx-7,fy-height*.35,fx+Math.sin(age*15+i)*7,fy-height*.75,fx+Math.sin(age*12+i)*4,fy-height);ctx.bezierCurveTo(fx+3,fy-height*.45,fx+7,fy-height*.3,fx+3,fy);ctx.closePath();ctx.fillStyle=i%2?'#f98127':'#ffb541';ctx.fill();
ctx.beginPath();ctx.moveTo(fx-1.6,fy);ctx.quadraticCurveTo(fx-3,fy-height*.4,fx+1,fy-height*.6);ctx.quadraticCurveTo(fx+4,fy-height*.2,fx+1.5,fy);ctx.fillStyle='#ffe5a0';ctx.fill();
}
for(let i=0;i<18;i++){
const q=(age*.65+i/18)%1;ctx.globalAlpha=q*(1-q)*heat*1.4;
boatBlastGlow(x+Math.sin(i*2+q*3)*13+q*10,y-15-q*62,5+q*13,7+q*15,[[0,'#353738'],[.6,'#4e4d49cc'],[1,'#5b585300']]);
}
ctx.restore();continue;
}
// Water-level pressure ring and a brief reflected flash.
if(t<1.8){
ctx.globalAlpha=Math.max(0,1-t/1.8);ctx.strokeStyle='#e5fff1';ctx.lineWidth=1.7*(1-t/1.8)+.2;
ctx.beginPath();ctx.ellipse(x,y,15+t*95,6+t*34,0,0,Math.PI*2);ctx.stroke();
ctx.globalAlpha=Math.max(0,1-t/.8)*.8;boatBlastGlow(x,y+7,65+t*60,18+t*12,[[0,'#fff7c3'],[.4,'#fda65b88'],[1,'#f07b3200']]);
}
ctx.globalAlpha=1;
// Many overlapping turbulent lobes use native, subpixel canvas gradients.
if(t<1.5){
const expansion=1-Math.exp(-t*9),fade=Math.max(0,1-t/1.5);
ctx.globalCompositeOperation='screen';ctx.globalAlpha=fade*.8;
boatBlastGlow(x,y-15-t*15,18+expansion*57,18+expansion*48,[[0,'#fff5c6'],[.25,'#ffcc6dbb'],[.65,'#f36a2444'],[1,'#d9420000']]);ctx.globalCompositeOperation='source-over';
for(const [i,p] of blast.cloud.entries()){
const a=t-p.delay*.5;if(a<0)continue;
const r=(8+expansion*44)*Math.sqrt(p.r),px=x+Math.cos(p.angle)*r,py=y-12+Math.sin(p.angle)*r*.7-a*26;
const radius=p.size*(.5+expansion)*Math.max(.15,1-a*.45);
ctx.globalAlpha=fade*(.65+p.r*.3);
boatBlastGlow(px,py,radius,radius*1.15,[[0,i%3?'#ffe3a5':'#fff5d4'],[.24,'#ffbc55'],[.52,'#f46d26'],[.78,'#b8361588'],[1,'#702d1400']]);
}
if(t<.13){ctx.globalAlpha=(1-t/.13)*.9;boatBlastGlow(x,y-8,38,30,[[0,'#ffffff'],[.4,'#fff6cb'],[1,'#ffe09b00']]);}
}
// Incandescent fragments streak outward, cooling along their trajectories.
for(const p of blast.sparks){if(t>p.life)continue;
const distance=p.speed*t,px=x+Math.cos(p.angle)*distance,py=y-8+Math.sin(p.angle)*distance*.7-25*t+35*t*t;
ctx.globalAlpha=Math.pow(1-t/p.life,1.5);ctx.strokeStyle=t<.25?'#fff2b6':'#e88c44';ctx.lineWidth=t<.3?1:.55;
ctx.beginPath();ctx.moveTo(px-Math.cos(p.angle)*5,py-Math.sin(p.angle)*3);ctx.lineTo(px,py);ctx.stroke();
}
// Discrete boat pieces follow gravity, with independent land/water impacts.
for(const p of [...blast.debris].sort((a,b)=>boatDebrisPose(a,t).y-boatDebrisPose(b,t).y))drawBoatDebris(p,t);
// Soot rolls upward and drifts, with lit lower edges giving way to dark smoke.
for(const [i,p] of blast.cloud.entries()){
const a=t-p.delay-.1;if(a<0||a>5.5)continue;
const expand=1-Math.exp(-a*2),px=x+Math.cos(p.angle)*Math.sqrt(p.r)*(15+expand*40)+a*(5+p.drift*12),py=y-14-a*23+Math.sin(p.angle)*18*expand;
const r=p.size*(.65+expand*1.1+a*.35);
ctx.globalAlpha=Math.min(1,a*3)*Math.max(0,1-a/5.5)*.47;
const lit=a<.8;
boatBlastGlow(px,py,r,r*1.15,[[0,lit?'#896447':'#414647'],[.45,lit?'#5c5045ee':'#525656dd'],[.8,'#66665f66'],[1,'#77766e00']]);
}
ctx.restore();
}
}
const TREE_BURN_DURATION=4200;
const TREE_REGROW_DURATION=5*60*1000;
const burnableTrees=new Map();
function registerBurnableTree(x,y,scale=1,kind='tree'){
const t={x,y,scale,kind,burnAge:null,regrowAge:0};burnableTrees.set(`${x},${y}`,t);
}
islandTreeLayouts.forEach((layout,i)=>layout.forEach(([dx,dy,scale])=>registerBurnableTree(locations[i].x+dx,locations[i].y+dy,scale)));
for(const island of boatIslands)if(island.biome!=='crystal')for(const [dx,dy] of [[-57,-29],[38,-38],[62,16],[-51,37]])registerBurnableTree(island.x+dx,island.y+dy,island.biome==='pine'||island.biome==='palm'?1:.65,island.biome);
function checkTreeDragonFireHits(){
const length=58*petDragonFireEnvelope();if(length<3)return;
// Match the translated, rotated, upright dragon sprite, including its altitude.
const flight=dragonFlight,heading=flight?.heading||0,upright=Math.cos(heading)<0?-1:1;
const origin=flight?player:petDragonPosition,c=Math.cos(heading),sn=Math.sin(heading),time=petDragonFire.elapsed/1000;
for(const t of burnableTrees.values()){
if(t.burnAge!==null)continue;
const halfWidth=(t.kind==='palm'?18:t.kind==='pine'?9:13)*t.scale;
const top=t.y-(t.kind==='palm'?13:t.kind==='pine'?20:28)*t.scale,bottom=t.y+(t.kind==='palm'?18:13)*t.scale;
for(let d=0;d<=Math.ceil(length);d++){
const distance=Math.min(d,length),s=distance/length;
const curl=Math.sin(s*13-time*16)*s*2.5+Math.sin(s*29-time*24)*s*s*1.7;
const spread=(.8+8*Math.sin(Math.PI*Math.pow(s,.75)))*(1-.7*s);
let hit=false;
for(const edge of [-1,0,1]){
const localX=26+distance,localY=(-1+curl+edge*spread)*upright;
const x=origin.x+c*localX-sn*localY,y=origin.y-(flight?.altitude||0)+sn*localX+c*localY;
if(x>=t.x-halfWidth&&x<=t.x+halfWidth&&y>=top&&y<=bottom){hit=true;break;}
}
if(hit){t.burnAge=0;break;}
}
}
}
function drawBurningTree(x,y){
const t=burnableTrees.get(`${x},${y}`);if(!t||t.burnAge===null)return false;
const progress=t.burnAge/TREE_BURN_DURATION,s=t.scale;
const base=y+(t.kind==='palm'?18:13)*s,top=y-(t.kind==='palm'?13:t.kind==='pine'?20:28)*s;
// Keep the original geometry; progressively consume it from the crown downward.
const consumed=Math.max(0,(progress-.3)/.7),burnLine=top+(base-top)*consumed;
ctx.save();
if(progress>0){
ctx.globalAlpha=Math.min(1,progress*3)*(1-t.regrowAge/TREE_REGROW_DURATION);
ellipse(x,base,14*s,4*s,'#45443c88');
for(let i=0;i<5;i++)rect(x+(i-2)*4*s,base+(i%2)*s,3*s,2*s,i%2?'#77736a':'#3e3a35');
ctx.globalAlpha=1;
}
if(progress>=1&&t.regrowAge>0){
const growth=.04+.96*t.regrowAge/TREE_REGROW_DURATION;
// Anchor the new tree at its roots as its original sprite grows back.
ctx.save();ctx.translate(x,base);ctx.scale(growth,growth);ctx.translate(-x,-base);
if(t.kind==='palm')drawPalmSprite(x,y);
else if(t.kind==='pine')drawPineSprite(x,y);
else drawTreeSprite(x,y,s);
ctx.restore();
}
if(progress<1){
ctx.save();ctx.beginPath();ctx.rect(x-22*s,burnLine,44*s,base-burnLine+5*s);ctx.clip();
ctx.filter=`brightness(${1-progress*.75}) saturate(${1-progress*.9})`;
if(t.kind==='palm')drawPalmSprite(x,y);
else if(t.kind==='pine')drawPineSprite(x,y);
else drawTreeSprite(x,y,s);
ctx.restore();
if(t.burnAge===0){ctx.restore();return true;}
const intensity=Math.min(1,t.burnAge/180)*Math.min(1,(1-progress)*5);
for(let i=0;i<4;i++){
const fx=x+(i-1.5)*(t.kind==='palm'?7:5)*s;
const fy=Math.min(base,burnLine+(base-burnLine)*(.35+(i%2)*.35));
ctx.save();ctx.translate(fx,fy);ctx.rotate(-Math.PI/2);ctx.scale(.42*s,.48*s);
drawDragonFlame(180+(t.burnAge+i*137)%650,intensity,38+8*Math.sin(t.burnAge*.007+i),-Math.PI/2);
ctx.restore();
}
for(let i=0;i<5;i++){
const phase=(t.burnAge/1500+i/5)%1;ctx.globalAlpha=(1-phase)*.32*intensity;
ellipse(x+Math.sin(i*2+phase*3)*5*s+phase*8,burnLine-10*s-phase*35*s,(3+phase*6)*s,(4+phase*7)*s,'#96948b');
}
}
ctx.restore();return true;
}
function drawIslandTrees(){
islandTreeLayouts.forEach((layout,i)=>{const l=locations[i];
[...layout].sort((a,b)=>a[1]-b[1]).forEach(([x,y,scale])=>tree(l.x+x,l.y+y,scale));
});
}
function onFinalIsland(){return inside(player.x,player.y,islandPolys[4]);}
function openFerry(){
if(beachTransfer||volleyball||frisbeeGame)return;
if(wakeboardCrash||dragonFlight||wakeboardRide||surfSession){toast('Finish your current ride first.');return;}
if(voyage||shoreRecovery||boating)return;
stopFishing();
if(state.ferryRemaining>0){boardFerry();return;}
if(!onFinalIsland()&&!swimming){state.boatIsland=null;player.x=dock.x;player.y=dock.y-12;save();}
const ready=state.ferryTicket,affordable=state.crystals>=FERRY_PRICE;
$('#ticketInfo').textContent=ready?'Use your ticket for a 5-minute ferry ride?':affordable?'Buy and use a ferry ticket · 25 crystals · 5 minutes?':'Ferry ticket · 25 crystals needed. Keep exploring to earn more.';
$('#buyTicket').hidden=ready||!affordable;
$('#boardFerry').hidden=!ready;
openMapPanel('ferry');canvas.focus({preventScroll:true});
}
function confirmFerryBoarding(){
if(activeMapPanel!=='ferry')return;
if(!hasSwimPower()){closeMapPanel();toast('Solve a problem to restore energy before boarding.');return;}
if(boatExplosions.has('ferry')){closeMapPanel();toast('Wait for the ferry’s smoke to clear.');return;}
if(!state.ferryTicket){if(state.crystals<FERRY_PRICE)return;buyFerryTicket();}
boardFerry();
}
function buyFerryTicket(){
if(state.ferryTicket||state.ferryRemaining>0||state.crystals<FERRY_PRICE)return;
state.crystals-=FERRY_PRICE;state.ferryTicket=true;update();chime();openFerry();
}
function ferryBerth(departure){return {x:departure.x+(departure===dock?-55:55),y:departure.y+15};}
function boardFerry(){
if(boatExplosions.has('ferry')){toast('Wait for the boat’s smoke to clear.');return;}
if(beachTransfer||volleyball||frisbeeGame)return;
if(wakeboardCrash||dragonFlight||wakeboardRide||volleyball||frisbeeGame){toast('Finish your current ride first.');return;}
if(shoreRecovery||boating)return;
if(state.ferryRemaining>0){
if(activeVessel!=='ferry'||Math.hypot(player.x-boatPosition.x,player.y-boatPosition.y)>90){toast('Return to your parked ferry to reboard before time runs out.');return;}
if(state.beachAnchor){returnToAnchoredBoat();return;}
if(diveAnimation||shoreClimb)return;
retrieveBoatAnchor();stopFishing();swimming=false;boating=true;player.x=boatPosition.x;player.y=boatPosition.y;startBoatEngines();keys.clear();closeMapPanel();save();updateFishing();return;
}
if(!state.ferryTicket)return;
if(!hasSwimPower()){toast('Solve a problem to restore energy before heading out on the water.');return;}
state.ferryTicket=false;state.ferryRemaining=FERRY_RIDE_DURATION;
state.beachAnchor=null;stopFishing();const departure=onFinalIsland()?farDock:dock;
const parkedClose=activeVessel==='ferry'&&Math.hypot(boatPosition.x-departure.x,boatPosition.y-departure.y)<90;
parkCurrentVessel();
activeVessel='ferry';boating=true;swimming=false;diveAnimation=null;shoreClimb=null;timberStep=null;
const berth=clearBoatBerth(parkedClose?boatPosition:ferryBerth(departure),ferryHeading);player.x=berth.x;player.y=berth.y;boatPosition={x:player.x,y:player.y};ferryPosition={...boatPosition};
resetBoatMotion();boatMotion.heading=ferryHeading;startBoatEngines();keys.clear();closeMapPanel('ferry');save();updateFishing();canvas.focus({preventScroll:true});
toast('Drive the ferry: Up/W forward, Down/S brake then reverse, Left/Right or A/D steer. F fishes; X steps off or dives.');
}
function cavernFlag(x,y,height=36,travelHeading=null){
// Keep the pole upright; a moving ferry's pennant streams aft in world space.
const top=y-height,wave=Math.sin(frame/12)*2;
const direction=travelHeading===null?0:travelHeading+Math.PI;
const point=(along,down)=>[x+Math.cos(direction)*along,top+down+Math.sin(direction)*along*.55];
rect(x-1,top,2,height,'#705d43');rect(x-2,top-2,4,3,'#e9cc80');
polygon([point(1,2),point(20,3+wave),point(19,15+wave),point(1,14)],'#8266aa');
polygon([point(2,3),point(4,3),point(4,13),point(2,13)],'#bda6db');
polygon([point(10,5),point(14,9),point(10,13),point(7,9)],'#f6e5ab');
}
function advanceBoatSpray(dt){
const spray=boatMotion.spray??=[];
for(const p of spray)p.age+=dt/1000;
spraySunbathers(spray);
sprayPetDragon(spray);
sprayVolleyballers(spray);
boatMotion.spray=spray.filter(p=>p.age<p.life+.22);
const trim=boatTrimLevel()/5,maximumTrim=trim===1;
// Exposed props throw a full rooster tail under forward thrust, even at rest.
const maximumThrust=maximumTrim&&boatMotion.throttle>0&&boatMotion.engineStage==='running'&&boatMotion.velocity>=0;
const speed=maximumThrust?1:Math.min(1,(boatMotion.velocity||0)/140);
if(!boating||fishingActive||boatAnchorBusy()||trim<=0||speed<.06||(!maximumThrust&&boatMotion.power<.05)){boatMotion.sprayClock=0;return;}
boatMotion.sprayClock=(boatMotion.sprayClock||0)+dt;
const interval=18-8*trim,heading=boatMotion.heading,c=Math.cos(heading),sn=Math.sin(heading);
const stern=activeVessel==='ferry'?41:activeVessel==='speedboat'?32:25,spacing=activeVessel==='ferry'?8:activeVessel==='speedboat'?9:6;
while(boatMotion.sprayClock>=interval){
boatMotion.sprayClock-=interval;
for(const side of outboardOffsets(activeVessel,spacing))for(let i=0;i<(maximumTrim?5:3);i++){
const seed=++boatMotion.spraySerial,random=n=>{const v=Math.sin(seed*127.1+n*311.7)*43758.5453;return v-Math.floor(v);};
// Higher trim lengthens the jet much more than its rise, flattening the rooster tail.
const reach=(20+trim*80+random(1)*(12+trim*34))*speed*(maximumTrim?1.8:1);
const height=(8+trim*6)*speed*(.65+random(2)*.35)*(maximumTrim?1.6:1);
const gravity=180,life=Math.sqrt(8*height/gravity),jet=reach/life;
const sideways=(random(3)-.5)*(5+trim*17)*(maximumTrim?1.5:1),inherited=boatMotion.velocity,jetHeading=heading+(boatMotion.steering||0);
boatMotion.spray.push({x:player.x-c*stern-sn*side,y:player.y-sn*stern+c*side,
vx:c*inherited-Math.cos(jetHeading)*jet-sn*sideways,vy:sn*inherited-Math.sin(jetHeading)*jet+c*sideways,
vz:gravity*life/2,gravity,life,age:boatMotion.sprayClock/1000,size:(.45+random(4)*(.55+trim*.55))*(maximumTrim?1.25:1),trim,reach,height});
}
}
boatMotion.spray=boatMotion.spray.slice(-1000);
spraySunbathers(boatMotion.spray);
sprayPetDragon(boatMotion.spray);
sprayVolleyballers(boatMotion.spray);
}
function drawBoatTrimSpray(x,y,heading,vessel,foreground=false){
if(activeVessel!==vessel)return;
ctx.save();ctx.lineCap='round';
for(const p of boatMotion.spray||[]){
const t=Math.min(p.age,p.life),progress=t/p.life;
const px=p.x+p.vx*t,py=p.y+p.vy*t,z=Math.max(0,p.vz*t-p.gravity*t*t/2);
const dragon=dragonFlight?player:petDragonPosition,altitude=dragonFlight?.altitude||0;
const overDragon=p.age<p.life&&z>=altitude&&Math.abs(px-dragon.x)<42&&Math.abs(py-z-(dragon.y-altitude))<35;
if(overDragon!==foreground)continue;
if(p.age<p.life){
// A narrow jet breaks into fine droplets; gravity brings each one back down.
const tail=Math.min(t,.014+progress*.022),prev=t-tail;
const prevZ=Math.max(0,p.vz*prev-p.gravity*prev*prev/2);
ctx.globalAlpha=(.35+p.trim*.4)*(1-progress*.5);ctx.strokeStyle=progress<.3?'#cceee8':'#f2fff9';
ctx.lineWidth=p.size*(progress<.25?1.7:1);
ctx.beginPath();ctx.moveTo(p.x+p.vx*prev,p.y+p.vy*prev-prevZ);ctx.lineTo(px,py-z);ctx.stroke();
if(progress>.2)ellipse(px,py-z,p.size,p.size*.7,'#f5fffc');
}else{
const splash=(p.age-p.life)/.22;
ctx.globalAlpha=(1-splash)*.32;ctx.strokeStyle='#e6faf3';ctx.lineWidth=.7;
ctx.beginPath();ctx.ellipse(px,py,1+splash*3,.5+splash,0,0,Math.PI*2);ctx.stroke();
}
}
ctx.restore();
}
function drawBoatExhaust(x,y,heading,vessel){
if(!boating||activeVessel!==vessel||boatMotion.engineAge>=1000)return;
const age=boatMotion.engineAge/1000,stern=vessel==='ferry'?41:vessel==='speedboat'?32:25,spacing=vessel==='ferry'?8:vessel==='speedboat'?9:6;
ctx.save();
for(const side of outboardOffsets(activeVessel,spacing))for(let i=0;i<5;i++){
const delay=i*.055,t=age-delay;if(t<0)continue;
const aft=stern+3+t*14+i*1.2,across=side+Math.sin(i*2.1)*t*5;
const px=x-Math.cos(heading)*aft-Math.sin(heading)*across;
const py=y-Math.sin(heading)*aft+Math.cos(heading)*across-3-t*15;
ctx.globalAlpha=Math.max(0,1-t/.8)*.22;
ellipse(px,py,1.8+t*6,1.4+t*5,i%2?'#d5ded6':'#a4b3ac');
}
ctx.restore();
}
function drawOutboardMotors(vessel,active){
const stern=vessel==='ferry'?35:vessel==='speedboat'?26:20,spacing=vessel==='ferry'?8:vessel==='speedboat'?9:6;
const trim=active?boatTrimLevel()/5:0;
for(const side of outboardOffsets(vessel,spacing)){
ctx.save();
const vibration=active?(boatMotion.engineStage==='starting'?Math.sin(boatMotion.engineAge*.075)*.55:boatMotion.engineStage==='running'?Math.sin(frame*.9+side)*(.12+boatMotion.power*.2):0):0;
ctx.translate(-stern+vibration,side);
// Stern brackets, separate engine cowlings, and trimmed lower units.
rect(-1,-4,4,8,'#526261');
ctx.save();ctx.rotate(active?(boatMotion.steering||0):0);ctx.translate(-trim*2,0);
const size=vessel==='ferry'?1.4:1;ctx.scale(size*(1-trim*.12),size);
polygon([[-5,-4],[1,-4],[3,-2],[3,3],[-5,4],[-7,2],[-7,-2]],'#34494f');
rect(-5,-3,5,2,'#879795');rect(-5,0,5,1,'#c9d2c5');
rect(-6,1,3,5-trim*2,'#4b6369');rect(-8,4-trim*2,5,1,'#9bb4b0');
ctx.restore();ctx.restore();
}
}
function drawBoatShadow(x,y,heading,vessel){
// Project the turning hull with a fixed sun offset and a gentle water drift.
const drift=Math.sin(frame*.035+x*.012+y*.009);
const hull=vessel==='speedboat'?[[-28,-12],[4,-13],[24,-7],[33,0],[24,7],[4,13],[-28,12]]:vessel==='ferry'?[[-37,-13],[10,-16],[29,-8],[39,0],[29,8],[10,16],[-37,13]]:
[[-23,-9],[6,-11],[17,-6],[25,0],[17,6],[6,11],[-23,9]];
ctx.save();ctx.translate(x+5+drift*.7,y+8+drift*.9);ctx.rotate(heading);
ctx.globalAlpha=.2;ctx.save();ctx.scale(1.08,1.14);polygon(hull,'#275b67');ctx.restore();
ctx.globalAlpha=.22;polygon(hull,'#285d68');ctx.restore();
}
function drawBoatBowWake(x,y,heading,vessel){
if(!boating||activeVessel!==vessel||boatMotion.velocity<=.5)return;
const speed=Math.min(1,boatMotion.velocity/boatTopSpeed(4)),ferry=vessel==='ferry';
const bow=ferry?39:vessel==='speedboat'?33:25,shoulder=ferry?29:vessel==='speedboat'?24:17,beam=ferry?16:vessel==='speedboat'?13:11;
ctx.save();ctx.translate(x,y);ctx.rotate(heading);ctx.lineCap='round';
// Water piles up at the stem, breaks at the shoulders, then washes down the hull.
for(const side of [-1,1]){
ctx.globalAlpha=speed*.34;ctx.strokeStyle='#438e9d';ctx.lineWidth=3+speed*4;
ctx.beginPath();ctx.moveTo(bow,.3*side);ctx.quadraticCurveTo(shoulder+2,side*beam*.5,shoulder-9,side*(beam+1));ctx.stroke();
for(let j=0;j<7;j++){
const t=j/7,next=(j+1)/7;
const point=u=>[bow-(bow+(ferry?38:27))*u,side*(beam*Math.sin(u*Math.PI/2)+u*(5+speed*9))];
const a=point(t),b=point(next);
ctx.globalAlpha=speed*(1-t)*(.5+.12*Math.sin(boatMotion.phase*.7+j*2+side));
ctx.strokeStyle=j<3?'#edfff5':'#c2e8df';ctx.lineWidth=(1.3+speed*2.5)*(1-t*.55);
ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();
if(j>0&&j<5){ctx.globalAlpha=speed*(1-t)*.6;ellipse(a[0]-1.5,a[1]+side*(1+speed*2),1.4+speed*1.4,.8+speed*.4,'#f2fff8');}
}
}
ctx.restore();
}
function ferryArt(x,y){
if(boatIsExploding('ferry'))return;
const burning=boatExplosions.get('ferry');if(burning){x=burning.x;y=burning.y;}
const active=boating&&activeVessel==='ferry',heading=burning?.heading??(activeVessel==='ferry'?boatMotion.heading:ferryHeading);
if(activeVessel==='ferry')drawBoatWake();
drawBoatShadow(x,y,heading,'ferry');
drawBoatBowWake(x,y,heading,'ferry');
drawBoatExhaust(x,y,heading,'ferry');
drawBoatTrimSpray(x,y,heading,'ferry');
ctx.save();ctx.translate(x,y);ctx.rotate(heading);
polygon([[-37,-13],[10,-16],[29,-8],[39,0],[29,8],[10,16],[-37,13]],'#315d66');
polygon([[-34,-10],[10,-13],[28,-6],[35,0],[28,6],[10,13],[-34,10]],'#e7b965');
polygon([[-30,-7],[8,-10],[25,-4],[29,0],[25,4],[8,10],[-30,7]],'#f4d790');
rect(-31,-9,5,18,'#fff0c6');
drawOutboardMotors('ferry',active);
if(active&&boatMotion.power>.1){ctx.globalAlpha=boatMotion.power*.6;for(const side of [-8,8]){
const churn=Math.sin(boatMotion.phase+side)*1.4;
ellipse(-43,side+churn,9,3.8,'#d2f4ec');
ellipse(-47,side-churn*.6,6,2.5,'#f3fff7');
for(let i=0;i<3;i++)ellipse(-42-i*4,side+Math.sin(boatMotion.phase*1.7+i+side)*3,1.7,1,'#ffffff');
}ctx.strokeStyle='#d6f1e4';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(23,-10);ctx.quadraticCurveTo(36,-5,39,0);ctx.quadraticCurveTo(36,5,23,10);ctx.stroke();}
ctx.restore();
// Keep the raised cabin upright while its hull follows the travel heading.
const cx=x+Math.cos(heading)*10,cy=y+Math.sin(heading)*10;
rect(cx-13,cy-20,27,19,'#fff0c6');rect(cx-16,cy-23,33,5,'#bc7056');
for(let i=0;i<3;i++)rect(cx-9+i*8,cy-15,5,8,'#7bb8bc');
rect(cx+5,cy-31,5,9,'#535f59');cavernFlag(cx-9,cy-22,26,active?(boatMotion.travelHeading??heading):heading);
if(active&&!hookedFish){const angler=fishingAngler();character(angler.x,angler.y-4);}
}
let boatMotion={heading:state.parkedBoat?.heading||0,phase:0,movingFor:0,power:0,velocity:0,turnRate:0,steering:0,engineStage:'running',engineAge:1000,throttle:0,trimStep:0,distance:0,wake:[],bowWake:[],spray:[],sprayClock:0,spraySerial:0};
function resetBoatMotion(){deepWaterHintShown=false;boatAnchor=null;boatMotion={heading:0,phase:0,movingFor:0,power:0,velocity:0,turnRate:0,steering:0,engineStage:'running',engineAge:1000,throttle:0,trimStep:0,distance:0,wake:[],bowWake:[],spray:[],sprayClock:0,spraySerial:0};}
function startBoatEngines(boarding=true){
if(boarding)applyReserveGas();
if(!vesselHasPower()){stopBoatPropulsion();return;}
boatMotion.engineStage='starting';boatMotion.engineAge=0;
boatMotion.velocity=0;boatMotion.turnRate=0;boatMotion.power=0;boatMotion.movingFor=0;
}
function advanceBoatMotion(dt){
if(dt<=0)return;
if(boating&&activeVessel!=='ferry'){boatFuelSaveClock+=dt;if(boatFuelSaveClock>=1000){save();boatFuelSaveClock=0;}}
if(!boating||fishingActive||!vesselHasPower()||boatAnchorBusy()){boatMotion.engineStage='off';boatMotion.engineAge=1000;}
else{
boatMotion.engineAge=Math.min(1000,(boatMotion.engineAge??1000)+dt);
if(boatMotion.engineStage==='starting'&&boatMotion.engineAge>=550)boatMotion.engineStage='running';
}
if(!boating||fishingActive||boatAnchorBusy()){boatMotion.velocity=0;boatMotion.turnRate=0;boatMotion.throttle=0;}
boatMotion.movingFor=boating?Math.max(0,boatMotion.movingFor-dt):0;
const powered=boatMotion.movingFor>0?1:0;
boatMotion.power+=(powered-boatMotion.power)*(1-Math.exp(-dt/120));
boatMotion.phase+=dt*.06*boatMotion.power;
boatMotion.wake=boatMotion.wake.filter(w=>{w.age+=dt;return w.age<1800;});
boatMotion.bowWake=boatMotion.bowWake.filter(w=>{w.age+=dt;return w.age<3600;});
advanceBoatSpray(dt);
}
function recordBoatMovement(from,hullHeading=null){
if(!boating)return;
const dx=player.x-from.x,dy=player.y-from.y,distance=Math.hypot(dx,dy);
if(distance<.001)return;
const heading=hullHeading??Math.atan2(dy,dx);boatMotion.heading=heading;boatMotion.movingFor=100;
boatMotion.travelHeading=Math.atan2(dy,dx);
faceMovement(dx,dy);
for(let d=6-boatMotion.distance;d<=distance;d+=6){
const stern=activeVessel==='ferry'?41:activeVessel==='speedboat'?32:25,spacing=activeVessel==='ferry'?8:activeVessel==='speedboat'?9:6;
if(boatMotion.velocity>.5){
const ferry=activeVessel==='ferry',bow=ferry?28:activeVessel==='speedboat'?24:16,beam=ferry?10:activeVessel==='speedboat'?9:7;
for(const side of [-1,1]){
const x=from.x+dx*d/distance+Math.cos(heading)*bow-Math.sin(heading)*side*beam;
const y=from.y+dy*d/distance+Math.sin(heading)*bow+Math.cos(heading)*side*beam;
if(sharkWater(x,y))boatMotion.bowWake.push({x,y,heading,side,age:0,speed:Math.min(1,boatMotion.velocity/boatTopSpeed(4))});
}
}
for(const side of outboardOffsets(activeVessel,spacing)){
const x=from.x+dx*d/distance-Math.cos(heading)*stern-Math.sin(heading)*side;
const y=from.y+dy*d/distance-Math.sin(heading)*stern+Math.cos(heading)*side;
if(sharkWater(x,y))boatMotion.wake.push({x,y,heading:heading+(boatMotion.steering||0),age:0,trim:boatTrimLevel()});
}
}
boatMotion.distance=(boatMotion.distance+distance)%6;
boatMotion.wake=boatMotion.wake.slice(-112);
boatMotion.bowWake=boatMotion.bowWake.slice(-256);
}
function drawBoatWake(){
// Wave fragments remain in world space, preserving the trail through turns.
for(const w of boatMotion.bowWake){
const t=w.age/3600,spread=w.age*.001*(16+w.speed*40),fade=(1-t)*(1-t);
ctx.save();ctx.translate(w.x-Math.sin(w.heading)*w.side*spread,w.y+Math.cos(w.heading)*w.side*spread);ctx.rotate(w.heading);
ctx.globalAlpha=fade*w.speed*.5;ctx.strokeStyle=t<.2?'#d7f4e9':'#b3ddd6';ctx.lineWidth=1.2+fade*w.speed*2;
ctx.beginPath();ctx.moveTo(-6-t*12,w.side*(4+t*6));ctx.quadraticCurveTo(0,0,6+t*6,-w.side*2);ctx.stroke();
ctx.restore();
}
for(const w of boatMotion.wake){
const ferry=activeVessel==='ferry',trim=(w.trim||0)/5,t=w.age/1800,spread=(ferry?3+t*8:1.5+t*3)*(1+trim*.65),length=(ferry?6+t*25:3+t*17)*(1+trim*.35);
ctx.save();ctx.translate(w.x,w.y);ctx.rotate(w.heading);
ctx.strokeStyle='#e3f8ed';ctx.lineWidth=(ferry?2:1.2)+trim;ctx.globalAlpha=(1-t)*(1-t)*Math.min(1,(ferry?.85:.6)+trim*.2);
ctx.beginPath();ctx.moveTo(-length,-spread);ctx.quadraticCurveTo(-length*.3,-spread*.7,2,-1);
ctx.moveTo(-length,spread);ctx.quadraticCurveTo(-length*.3,spread*.7,2,1);ctx.stroke();
if(ferry){
// Expanding eddies and broken foam churn along both propeller trails.
const fade=(1-t)*(1-t),seed=w.x*.31+w.y*.47;
for(let i=0;i<4;i++){
const swirl=seed+i*2.4+w.age*.006,along=-length*(.15+i*.23);
const across=Math.sin(swirl)*spread*.75,radius=1.3+t*2+i*.25;
ctx.globalAlpha=fade*(.6-i*.07);
ellipse(along,across,radius*1.7,radius*.7,i%2?'#f4fff9':'#c4eae4');
ctx.strokeStyle='#f1fff7';ctx.lineWidth=1;ctx.beginPath();
ctx.ellipse(along-1,across,radius*2.3,radius,Math.sin(swirl)*.4,.2,Math.PI*1.45);ctx.stroke();
}
}
ctx.globalAlpha*=.65;ellipse(-length*.3,Math.sin(w.x+w.y)*2,2.2+t,1,'#eefff3');
ctx.restore();
}
}
function fishingBoatArt(x,y){
if(boatIsExploding('fishing'))return;
const burning=boatExplosions.get('fishing');if(burning){x=burning.x;y=burning.y;}
const active=boating&&activeVessel==='fishing',heading=burning?.heading??(activeVessel==='fishing'?boatMotion.heading:fishingBoatHeading);
if(activeVessel==='fishing')drawBoatWake();
drawBoatShadow(x,y,heading,'fishing');
drawBoatBowWake(x,y,heading,'fishing');
drawBoatExhaust(x,y,heading,'fishing');
drawBoatTrimSpray(x,y,heading,'fishing');
ctx.save();ctx.translate(x,y);ctx.rotate(heading);
// Pointed bow leads; twin outboards sit on the stern brackets.
polygon([[-23,-9],[6,-11],[17,-6],[25,0],[17,6],[6,11],[-23,9]],'#436b67');
polygon([[-20,-7],[6,-8],[16,-4],[21,0],[16,4],[6,8],[-20,7]],'#f1c67a');
polygon([[-17,-4],[5,-6],[15,0],[5,6],[-17,4]],'#d7a769');
rect(-10,-7,4,14,'#fff1cf');rect(5,-5,3,10,'#fff1cf');
drawOutboardMotors('fishing',active);
if(active&&boatMotion.power>.1){
ctx.globalAlpha=boatMotion.power*.55;for(const side of [-6,6])ellipse(-26,side+Math.sin(boatMotion.phase)*.4,3,1.5,'#eafff2');
ctx.strokeStyle='#d6f1e4';ctx.lineWidth=.9;ctx.beginPath();ctx.moveTo(12,-8);ctx.quadraticCurveTo(23,-5,26,0);ctx.quadraticCurveTo(23,5,12,8);ctx.stroke();
}
ctx.restore();
if(active&&!hookedFish)character(x-Math.cos(heading)*3,y-Math.sin(heading)*3-4);
}
function swimSnorkel(x,y,side=1){
// Slim J-shaped tube follows the cheek, with a small angled air opening.
ctx.save();ctx.translate(x,y);ctx.scale(side,1);x=0;y=0;ctx.lineCap='round';ctx.lineJoin='round';
ctx.beginPath();ctx.moveTo(x+6,y-8);ctx.quadraticCurveTo(x+7,y-7,x+7,y-5);
ctx.lineTo(x+7,y+1);ctx.quadraticCurveTo(x+7,y+3,x+5,y+3);ctx.lineTo(x+4,y+2);
ctx.strokeStyle='#345362';ctx.lineWidth=2;ctx.stroke();
ctx.strokeStyle='#d8b773';ctx.lineWidth=1;ctx.stroke();
rect(x+6,y-1,1,2,'#63818a');
ellipse(x+6,y-8,.8,.5,'#254450');ellipse(x+4,y+2,.8,.7,'#345362');
ctx.restore();
}
function swimGoggles(x,y,withSnorkel=true){
// Dark strap and twin aqua lenses stay legible at the map's pixel scale.
rect(x-5,y-1,11,2,'#345362');
rect(x-4,y-2,4,4,'#e9e5bd');rect(x+1,y-2,4,4,'#e9e5bd');
rect(x-3,y-1,2,2,'#77d5df');rect(x+2,y-1,2,2,'#77d5df');
rect(x,y-1,1,1,'#e9e5bd');rect(x-3,y-1,1,1,'#e6ffff');rect(x+2,y-1,1,1,'#e6ffff');
if(withSnorkel)swimSnorkel(x,y);
}
function directionalSwimGear(x,y,withSnorkel=true){
const facing=player.facing||'down';
if(facing==='down'){swimGoggles(x,y,withSnorkel);return;}
ctx.save();ctx.translate(x,y);
if(facing==='up'){
rect(-5,-1,11,2,'#345362');rect(-2,-1,3,2,'#63818a');
}else{
ctx.scale(facing==='left'?-1:1,1);
rect(-4,-1,9,2,'#345362');rect(2,-2,4,4,'#e9e5bd');rect(3,-1,2,2,'#77d5df');
}
if(withSnorkel)swimSnorkel(0,0);
ctx.restore();
}
let swimMotion={phase:0,time:0,heading:Math.PI/2,targetHeading:Math.PI/2,movingFor:0,effort:0,distance:0,wake:[]};
function resetSwimMotion(){
const heading={up:-Math.PI/2,down:Math.PI/2,left:Math.PI,right:0}[player.facing]??Math.PI/2;
swimMotion={phase:0,time:0,heading,targetHeading:heading,movingFor:0,effort:0,distance:0,wake:[]};
}
function advanceSwimMotion(dt){
if(!swimming||boating||sharkRide||diveAnimation||shoreClimb){resetSwimMotion();return;}
if(dt<=0)return;
swimMotion.time+=dt;swimMotion.movingFor=Math.max(0,swimMotion.movingFor-dt);
const active=swimMotion.movingFor>0?1:0;
swimMotion.effort+=(active-swimMotion.effort)*(1-Math.exp(-dt/160));
swimMotion.phase+=dt/1000*Math.PI*2*(.28+.82*swimMotion.effort);
const turn=Math.atan2(Math.sin(swimMotion.targetHeading-swimMotion.heading),Math.cos(swimMotion.targetHeading-swimMotion.heading));
swimMotion.heading+=turn*(1-Math.exp(-dt/95));
swimMotion.wake=swimMotion.wake.filter(w=>{w.age+=dt;return w.age<1400;});
}
function recordSwimMovement(from){
if(!swimming||boating||sharkRide||diveAnimation||shoreClimb)return;
const dx=player.x-from.x,dy=player.y-from.y,distance=Math.hypot(dx,dy);
if(distance<.001)return;
const heading=Math.atan2(dy,dx);
swimMotion.targetHeading=heading;swimMotion.movingFor=100;
// Place ripples along the traveled segment, never in front of the swimmer.
for(let d=5-swimMotion.distance;d<=distance;d+=5){
const x=from.x+dx*d/distance-Math.cos(heading)*12,y=from.y+dy*d/distance-Math.sin(heading)*12;
if(sharkWater(x,y))swimMotion.wake.push({x,y,heading,age:0});
}
swimMotion.distance=(swimMotion.distance+distance)%5;
swimMotion.wake=swimMotion.wake.slice(-40);
}
function drawSwimmerWake(){
for(const w of swimMotion.wake){
const t=w.age/1400,spread=3+t*10,length=3+t*9;
ctx.save();ctx.translate(w.x,w.y);ctx.rotate(w.heading);
ctx.globalAlpha=(1-t)*(1-t)*.42;ctx.strokeStyle='#e4f7e8';ctx.lineWidth=.8;
ctx.beginPath();ctx.moveTo(-length,-spread);ctx.quadraticCurveTo(-length*.35,-spread*.8,2,-2);
ctx.moveTo(-length,spread);ctx.quadraticCurveTo(-length*.35,spread*.8,2,2);ctx.stroke();
ctx.globalAlpha*=.45;ellipse(-length*.5,0,1+t,Math.max(.4,.7-t*.3),'#e8fff3');ctx.restore();
}
}
function drawSwimKickSplash(foot,spread,side,phase,effort,onBoard){
if(effort<=.08)return;
// Each foot throws a small fan of water on its downbeat, half a kick apart.
const cycle=((phase*2.8+(side<0?Math.PI:0))%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
const age=cycle/(Math.PI*1.35);if(age>=1)return;
const power=Math.min(1,(effort-.08)/.7),fade=(1-age)*(1-age)*power;
const x=onBoard?Math.min(-20,foot-2):foot-2,y=spread;
ctx.save();ctx.globalAlpha=fade*.7;ctx.strokeStyle='#e4f7e8';ctx.lineWidth=.85;ctx.lineCap='round';
ctx.beginPath();ctx.ellipse(x-age*5,y+side*age*2,2+age*6,1+age*2.5,0,0,Math.PI*2);ctx.stroke();
for(let i=0;i<4;i++){
const travel=age*(4+i*2)*(.5+power*.5),lift=Math.sin(age*Math.PI)*(2+i*.7);
const dx=x-travel-i*.7,dy=y+side*(1+travel*(.3+i*.12))-lift;
ctx.globalAlpha=fade*(.9-i*.1);
ellipse(dx,dy,.65+(1-age)*.5,.5+(1-age)*.3,'#f1fff5');
}
ctx.restore();
}
function drawSwimHandRipples(cycle,side,effort,visibility){
if(effort<=.08||cycle>=Math.PI)return;
ctx.save();ctx.strokeStyle='#e4f7e8';ctx.lineWidth=.7;
// Expanding rings follow the hand from the forward catch through the backward pull.
for(let i=0;i<3;i++){
const previous=cycle-i*.22;if(previous<0)continue;
const sweep=Math.sin(previous),x=2+Math.cos(previous)*(4+effort*9);
const y=side*(5+sweep*(2+effort*5));
ctx.globalAlpha=(.2+.5*sweep)*effort*visibility*(1-i*.27);
ctx.beginPath();ctx.ellipse(x,y,2+i*1.5,1.2+i*.8,0,0,Math.PI*2);ctx.stroke();
}
ctx.restore();
}
function drawSwimmingCharacter(x,y,motion=swimMotion,onBoard=false){
const colors=characterColors(),phase=motion.phase,effort=motion.effort;
const bodyVisibility=onBoard?1:Math.max(0,Math.min(1,(effort-.025)/.6));
const kick=Math.sin(phase*2.8),roll=Math.sin(phase)*effort,bob=Math.sin(motion.time*.002)*.5;
if(!onBoard)drawSwimmerWake();
ctx.save();ctx.translate(x,y+bob);ctx.rotate(motion.heading);
if(!onBoard)clipBeachWaveOccupant(x,y);
if(bodyVisibility>0){
// A long, low silhouette: legs and torso sit just beneath the water.
if(!onBoard){ctx.globalAlpha=.35*bodyVisibility;ellipse(-2,1,17,6,'#467f82');}
ctx.globalAlpha=(onBoard?1:.65)*bodyVisibility;
for(const side of [-1,1]){
const foot=-15+kick*side*(onBoard ? .35+effort : 1+effort*2),spread=side*(2.5+Math.cos(phase*2.8)*side*effort*(onBoard ? .2 : 1));
polygon([[-5,side*2],[-10,spread-1],[foot,spread-1],[foot-1,spread+1],[-10,spread+1],[-4,side*3]],'#3e5555');
ellipse(foot-1,spread,2,1,'#d9b78d');
drawSwimKickSplash(foot,spread,side,phase,effort,onBoard);
}
ctx.globalAlpha=(onBoard?1:.9)*bodyVisibility;ellipse(-1,roll*.6,9,4,colors.shirt);
ellipse(0,-.5+roll*.6,6,2,colors.accent);
// Opposite arms cycle through forward recovery, catch, and underwater pull.
for(const side of [-1,1]){
const cycle=(phase+(side<0?Math.PI:0))%(Math.PI*2),reach=Math.cos(cycle),sweep=Math.sin(cycle);
const handX=2+reach*(4+effort*9),handY=side*(5+Math.max(0,sweep)*(2+effort*5));
const elbowX=(handX+2)*.5-1,elbowY=side*(6+Math.max(0,sweep)*3);
ctx.globalAlpha=(sweep>0?.55:.95)*bodyVisibility;ctx.strokeStyle='#e4bd88';ctx.lineWidth=2.5;ctx.lineCap='round';
ctx.beginPath();ctx.moveTo(2,side*3);ctx.lineTo(elbowX,elbowY);ctx.lineTo(handX,handY);ctx.stroke();
ellipse(handX,handY,1.6,1.2,'#f2c992');
drawSwimHandRipples(cycle,side,effort,bodyVisibility);
}
}
ctx.globalAlpha=1;
// Settle upright over the swimmer's position as the body slips below the surface.
ctx.save();ctx.translate(8*bodyVisibility-8,0);
if(currentProfile().character==='girl'){polygon([[5,-3],[1,-4],[-2,-2],[3,0],[5,3]],colors.hair);}
ellipse(8,0,4.5,3.5,'#f2c992');ellipse(6.5,0,2.5,3.7,colors.hair);
// Goggles face the swimming direction; the breathing tube stays above water.
if(!onBoard){ctx.save();ctx.translate(10,0);ctx.rotate(Math.PI/2);swimGoggles(0,0);ctx.restore();}
ctx.restore();
if(!onBoard){
const ripple=(motion.time%1600)/1600;
ctx.globalAlpha=.25;ctx.strokeStyle='#d4efdf';ctx.lineWidth=.7;ctx.beginPath();ctx.ellipse(8*bodyVisibility,0,4+7*bodyVisibility,2+3*bodyVisibility,0,-1,1);ctx.stroke();
if(bodyVisibility<1){ctx.globalAlpha=(1-bodyVisibility)*(1-ripple)*.3;ctx.beginPath();ctx.ellipse(8*bodyVisibility,1,5+ripple*5,2+ripple*2,0,0,Math.PI*2);ctx.stroke();}
}
ctx.restore();
}
function rollingCharacter(x,y,angle,tuck){
// Curl around the torso: knees against the chest, hands around the shins.
const colors=characterColors(),bend=Math.max(0,Math.min(1,tuck)),headX=3*bend,headY=-7+4*bend;
ctx.save();ctx.translate(x,y);ctx.rotate(angle);
if(currentProfile().character==='girl')rect(headX-7,headY-4,4,10-4*bend,colors.hair);
ellipse(-bend,0,6,7-2*bend,colors.shirt);
rect(-4,-4,7,4,colors.accent);
for(const offset of [-2,2]){
const kneeX=offset+5*bend,kneeY=7-6*bend,footX=offset-3*bend,footY=11-5*bend;
polygon([[offset-2,3],[kneeX+2,kneeY-2],[kneeX+2,kneeY+2],[offset-2,7]],'#3e5555');
polygon([[kneeX-2,kneeY],[kneeX+2,kneeY],[footX+2,footY],[footX-2,footY]],'#3e5555');
rect(footX-2,footY-1,4,3,'#354744');
}
polygon([[-6,-3],[-3,-3],[4*bend,5-2*bend],[7*bend,4-2*bend],[7*bend,7-2*bend],[-3,8-2*bend],[-6,2]],'#e4bd88');
rect(4*bend,3-2*bend,4,3,'#f2c992');
rect(headX-4,headY-5,9,8,'#f2c992');
rect(headX-5,headY-7,10,3,colors.hair);

swimGoggles(headX,headY-2);
ctx.restore();
}
function divingCharacter(x,y,angle){
const colors=characterColors();
ctx.save();ctx.translate(x,y);ctx.rotate(angle);
// Straight legs and arms reaching past the head make a headfirst dive.
rect(-4,3,3,10,'#3e5555');rect(1,3,3,10,'#3e5555');
rect(-5,-6,10,11,colors.shirt);rect(-4,-5,8,4,colors.accent);
if(currentProfile().character==='girl')rect(-7,-14,3,10,colors.hair);
rect(-4,-15,9,8,'#f2c992');rect(-5,-17,10,3,colors.hair);
polygon([[-7,-4],[-4,-5],[-5,-24],[-7,-26],[-9,-24]],'#e4bd88');
polygon([[4,-5],[7,-4],[9,-24],[7,-26],[5,-24]],'#f2c992');
swimGoggles(0,-12);ctx.restore();
}
function drawWaterEntry(){
const x=player.x,y=player.y,t=Math.min(1,diveAnimation.elapsed/700);
if(t<.62){
const progress=t/.62,direction=diveAnimation.to.x>=diveAnimation.from.x?1:-1;
const style=diveAnimation.style||'roll';
if(style==='dive'){
const tilt=progress*progress*(3-2*progress);
divingCharacter(x,y-10-Math.sin(progress*Math.PI)*12+progress*14,tilt*Math.PI*direction);
}else if(style==='backflip'){
const tuck=Math.min(1,progress/.18,(1-progress)/.25);
rollingCharacter(x,y-10-Math.sin(progress*Math.PI)*25,-progress*Math.PI*2*direction,tuck);
}else{
rollingCharacter(x,y-10-Math.sin(progress*Math.PI)*16,progress*Math.PI*2*direction,Math.min(1,progress/.2));
}
}else{
// The head rises through the settling foam as the swimmer resurfaces.
if(t>.8){ctx.save();ctx.globalAlpha=(t-.8)/.2;drawSwimmingCharacter(x,y);ctx.restore();}
}
}
function drawShoreClimb(){
const t=Math.min(1,shoreClimb.elapsed/650),lift=Math.max(0,Math.min(1,(t-.3)/.6)),colors=characterColors();
const x=player.x,y=player.y,bodyY=y+1-lift*9;
const reach=Math.min(1,t/.25),normal=shoreClimb.normal,tangent={x:-normal.y,y:normal.x};
if(t<.7){ctx.strokeStyle='#e2f8ee99';ctx.lineWidth=.8;ctx.beginPath();ctx.ellipse(x,y+3,10*(1-t)+3,3,0,0,Math.PI*2);ctx.stroke();}
if(lift>.35){
const knee=1-lift;
rect(x-5,y-3-knee*5,4,6,'#3e5555');rect(x+2,y-3-knee*3,4,6,'#3e5555');
}
ellipse(x,bodyY+2,6,4+lift*2,colors.shirt);rect(x-4,bodyY-2,8,4,colors.accent);
if(currentProfile().character==='girl')rect(x-7,bodyY-10,3,9,colors.hair);
rect(x-4,bodyY-12,9,8,'#f2c992');rect(x-5,bodyY-14,10,3,colors.hair);
swimGoggles(x,bodyY-9);
// Hands grip the actual shoreline first; the landing point lies farther inland.
for(const side of [-1,1]){
const release=Math.max(0,Math.min(1,(t-.7)/.3));
const grip={x:shoreClimb.edge.x+tangent.x*side*3,y:shoreClimb.edge.y+tangent.y*side*3};
const start={x:shoreClimb.from.x+normal.x*4+tangent.x*side*3,y:shoreClimb.from.y+normal.y*4+tangent.y*side*3};
const hx=start.x+(grip.x-start.x)*reach,hy=start.y+(grip.y-start.y)*reach;
const targetX=hx+(x+side*6-hx)*release,targetY=hy+(bodyY+5-hy)*release;
const shoulderX=x+(normal.x*4+tangent.x*side*3)*(1-release)+side*5*release;
const shoulderY=(y+normal.y*4+tangent.y*side*3)*(1-release)+bodyY*release;
const desiredElbowX=(shoulderX+targetX)/2+tangent.x*side*lift,desiredElbowY=(shoulderY+targetY)/2+tangent.y*side*lift;
const upperArmLength=Math.hypot(desiredElbowX-shoulderX,desiredElbowY-shoulderY),upperReach=Math.min(1,4/Math.max(1,upperArmLength));
const elbowX=shoulderX+(desiredElbowX-shoulderX)*upperReach,elbowY=shoulderY+(desiredElbowY-shoulderY)*upperReach;
const forearmLength=Math.hypot(targetX-elbowX,targetY-elbowY),reachScale=Math.min(1,5/Math.max(1,forearmLength));
const endX=elbowX+(targetX-elbowX)*reachScale,endY=elbowY+(targetY-elbowY)*reachScale;
ctx.strokeStyle='#f2c992';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(shoulderX,shoulderY);
ctx.lineTo(elbowX,elbowY);ctx.lineTo(endX,endY);ctx.stroke();rect(endX-2,endY-1,4,3,'#f2c992');
}
}
function swimmerArt(){
const x=player.x,y=player.y;
if(shoreClimb){drawShoreClimb();return;}
if(sharkRide){drawSharkRide();return;}
if(diveAnimation){drawWaterEntry();return;}
drawSwimmingCharacter(x,y);
drawBeachWaveOccupantFoam(x,y);
}
let waterEntrySplash=null;
let goggleToss=null;
function startGoggleToss(waterHint){
let to=waterHint&&openSea(waterHint.x,waterHint.y)&&Math.hypot(waterHint.x-player.x,waterHint.y-player.y)<=80?{...waterHint}:null;
if(!to){
for(let distance=12;distance<=72&&!to;distance+=4)for(let i=0;i<32;i++){
const angle=i*Math.PI/16,x=player.x+Math.cos(angle)*distance,y=player.y+Math.sin(angle)*distance;
if(openSea(x,y)){to={x,y};break;}
}
}
if(!to)return;
const from=shoreRecovery?{x:player.x+9*(Math.cos(shoreRecovery.heading)>=0?1:-1),y:player.y-6}:{x:player.x,y:player.y-16};
goggleToss={elapsed:0,from,to,owner:profileId};
}
function advanceGoggleToss(dt){
if(!goggleToss)return;
goggleToss.elapsed+=dt;
if(goggleToss.elapsed>=1300||goggleToss.owner!==profileId)goggleToss=null;
}
function drawGoggleToss(){
if(!goggleToss)return;
const toss=goggleToss,t=Math.min(1,toss.elapsed/600);
if(t<1){
const x=toss.from.x+(toss.to.x-toss.from.x)*t,y=toss.from.y+(toss.to.y-toss.from.y)*t-Math.sin(t*Math.PI)*18;
// A short outward arm flick accompanies the release, without stopping walking.
if(toss.elapsed<180&&!swimming&&!boating&&!shoreRecovery){
const reach=toss.elapsed/180,dx=toss.to.x-toss.from.x,dy=toss.to.y-(toss.from.y+16),length=Math.hypot(dx,dy)||1;
ctx.strokeStyle='#e4bd88';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(player.x,player.y-10);ctx.lineTo(player.x+dx/length*(5+reach*5),player.y-13+dy/length*reach*5);ctx.stroke();
}
ctx.save();ctx.translate(x,y);ctx.rotate(t*Math.PI*3);ctx.scale(1-t*.25,1-t*.25);swimGoggles(0,0,true);ctx.restore();
}else{
drawWaterSplash(toss.to.x,toss.to.y,(toss.elapsed-600)/1000);
}
}
function drawWaterSplash(x,y,age,scale=1){
if(age<0||age>=.7)return;
ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);x=0;y=0;ctx.lineCap='round';
// Pressure rings spread across the surface, with each following the impact.
for(let i=0;i<3;i++){
const time=age-i*.085;if(time<0)continue;
const life=time/(.7-i*.085),r=2+18*Math.sqrt(time);
ctx.globalAlpha=Math.pow(1-life,1.5)*(.6-i*.12);
ctx.strokeStyle=i===0?'#d5f4ed':'#a6dcd9';ctx.lineWidth=1-life*.65;
ctx.beginPath();ctx.ellipse(x,y,r,r*.36,0,0,Math.PI*2);ctx.stroke();
}
// A shallow dark dent and a translucent crown briefly displace the water.
if(age<.24){
const life=age/.24,r=2+life*6,height=Math.sin(life*Math.PI)*7;
ctx.globalAlpha=(1-life)*.55;ellipse(x,y,2+life*3,1.2,'#215d70');
ctx.beginPath();ctx.moveTo(x-r,y);
for(let i=0;i<=12;i++){
const angle=Math.PI+i*Math.PI/12;
ctx.lineTo(x+Math.cos(angle)*r,y+Math.sin(angle)*r*.32-height*(i%2?.48:1));
}
ctx.lineTo(x+r,y);ctx.ellipse(x,y,r,r*.35,0,0,Math.PI);ctx.closePath();
ctx.fillStyle='#b3e3df';ctx.fill();ctx.strokeStyle='#edfff5';ctx.lineWidth=.7;ctx.stroke();
}
// Uneven ballistic droplets fall back individually and leave tiny contact rings.
for(let i=0;i<11;i++){
const angle=i*2.39996,flight=.23+(i%4)*.042,time=age/flight;
const dx=Math.cos(angle)*(5+(i%3)*2.5),dy=Math.sin(angle)*(2+(i%3)*1.2);
if(time<1){
const height=4*(6+(i%4)*1.6)*time*(1-time);
ctx.globalAlpha=Math.min(1,(1-time)*3)*.85;
ctx.strokeStyle=i%3?'#dff9ef':'#a4dcd9';ctx.lineWidth=i%3?1:.7;
const px=x+dx*time,py=y+dy*time-height;
ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px-dx*.025,py+(time<.5?1:-1)*(.7+Math.abs(1-2*time)));ctx.stroke();
}else if(age<flight+.15){
const fade=(age-flight)/.15;
ctx.globalAlpha=(1-fade)*.28;ctx.strokeStyle='#c6eee5';ctx.lineWidth=.5;
ctx.beginPath();ctx.ellipse(x+dx,y+dy,1+fade*2,.4+fade*.7,0,0,Math.PI*2);ctx.stroke();
}
}
ctx.restore();
}
function advanceShoreRecovery(dt){
if(!shoreRecovery)return;
shoreRecovery.elapsed+=dt;
if(shoreRecovery.elapsed>=1900){shoreRecovery=null;keys.clear();}
}
function drawShoreRecovery(){
const recovery=shoreRecovery,colors=characterColors(),direction=Math.cos(recovery.heading)>=0?1:-1;
const rise=Math.max(0,Math.min(1,(recovery.elapsed-1450)/450)),ease=rise*rise*(3-2*rise);
const shake=recovery.elapsed>=1000&&recovery.elapsed<1450?Math.sin((recovery.elapsed-1000)/450*Math.PI*6):0;
const x=player.x,y=player.y,headX=9*direction*(1-ease),headY=-6-10*ease;
ellipse(x,y+2,12-5*ease,3,'#325c4144');
ctx.save();ctx.translate(x,y);
// Prone legs straighten, then tuck beneath the torso as the hands push up.
for(const side of [-1,1]){
const footX=-12*direction*(1-ease)+side*3*ease,footY=side*2*(1-ease)+2*ease;
ctx.strokeStyle='#3e5555';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-3*direction*(1-ease),-3-2*ease);ctx.lineTo(footX,footY);ctx.stroke();
rect(footX-2,footY-1,4,2,'#354744');
}
ellipse(0,-4-3*ease,7-2*ease,3+3*ease,colors.shirt);
rect(-3,-5-4*ease,6,2,colors.accent);
for(const side of [-1,1]){
ctx.strokeStyle='#e4bd88';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(2*direction*(1-ease)+side*4*ease,-4-4*ease);ctx.lineTo(side*6,-1-2*ease);ctx.lineTo(side*7,1-2*ease);ctx.stroke();
}
ctx.save();ctx.translate(headX+shake*1.2,headY);ctx.rotate(shake*.18);
if(currentProfile().character==='girl')rect(-6,-4,4,9,colors.hair);
rect(-4,-4,9,8,'#f2c992');rect(-5,-5,11,3,colors.hair);

rect(-2,-1,1,2,'#354744');rect(2,-1,1,2,'#354744');ctx.restore();ctx.restore();
}
function walkableTimberAt(x,y){
const spans=[...crossings,...activePiers(),...(state.upgrades.includes('bridge')?[woodlandBridge]:[])];
return spans.find(b=>(!b.dock?.islandId||state.boatIsland===b.dock.islandId)&&x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h);
}
function advanceTimberStep(dt){
if(swimming||boating||voyage){timberStep=null;return;}
if(timberStep){timberStep.elapsed+=dt;if(timberStep.elapsed>=280)timberStep=null;}
}
function drawWalkingExplorer(){
const t=timberStep?Math.min(1,timberStep.elapsed/280):1,ease=t*t*(3-2*t);
const elevation=timberStep?timberStep.from+(timberStep.to-timberStep.from)*ease:(walkableTimberAt(player.x,player.y)?3:0);
const knee=timberStep?Math.sin(t*Math.PI)*4:0;
ctx.save();ctx.translate(0,-elevation);character(player.x,player.y,false,knee);ctx.restore();
}
function drawTimberEntranceSteps({x,y,w,h}){
const horizontal=w>h;
for(const end of [0,1]){
const px=horizontal?x+end*w:x+w/2,py=horizontal?y+h/2:y+end*h;
if(!islandPolys.some(poly=>inside(px,py,poly)))continue;
// A single broad tread sits just below the raised deck at each beach entrance.
if(horizontal){const sx=end?x+w-4:x;rect(sx,y+2,4,h-2,'#765d3d');rect(sx,y+1,4,h-3,'#d2b780');rect(sx,y+1,4,1,'#e6cd98');}
else{const sy=end?y+h-4:y;rect(x+2,sy+2,w-4,4,'#765d3d');rect(x+2,sy+1,w-4,3,'#d2b780');rect(x+2,sy+1,w-4,1,'#e6cd98');}
}
}
function drawTimberShadow({x,y,w,h}){
// Match the islands' down-screen cast shadow, with a darker contact edge.
polygon([[x-2,y+5],[x+w+2,y+5],[x+w+5,y+h+11],[x+2,y+h+11]],'#4d9d9e');
rect(x+2,y+h+5,w+2,3,'#438c9170');
}
function drawRaisedTimber({x,y,w,h},restored=false){
const horizontal=w>h,length=horizontal?w:h,sections=Math.max(1,Math.ceil((length-8)/24)),posts=[];
for(let i=0;i<=sections;i++){
const along=4+(length-8)*i/sections;
if(horizontal)posts.push({x:x+along,y:y},{x:x+along,y:y+h-1});
else posts.push({x:x,y:y+along},{x:x+w-1,y:y+along});
}
// The dark fascia and exposed pile legs sit below the walking deck.
rect(x,y+4,w,h,'#65533c');rect(x+1,y+h,w-2,4,'#554b38');
for(const post of posts){
const px=Math.round(post.x),py=Math.round(post.y);
if(!islandPolys.some(poly=>inside(px,py+9,poly))){
ellipse(px+1,py+10,5,1.8,'#397e8555');
rect(px-4,py+10,3,1,'#b1d8cc88');rect(px+3,py+11,3,1,'#b1d8cc66');
}
rect(px-2,py,4,11,'#604c37');rect(px-1,py+1,1,8,'#a48657');rect(px-2,py+8,4,3,'#405d4e');
}
rect(x,y,w,h,restored?'#ac8c5b':'#89704e');
if(horizontal){for(let px=x+1;px<x+w-1;px+=5){rect(px,y+1,3,h-2,restored?'#d9bc83':'#c9aa75');rect(px,y+2,1,Math.max(1,h-4),'#e2c48a');}}
else{for(let py=y+1;py<y+h-1;py+=5){rect(x+1,py,w-2,3,restored?'#d9bc83':'#c0a471');rect(x+2,py,Math.max(1,w-4),1,'#dfbe83');}}
// Squared pile caps rise above both edges, with a light end-grain centre.
for(const post of posts){rect(post.x-2,post.y-2,5,4,'#5e4b35');rect(post.x-1,post.y-2,3,2,'#d6b477');rect(post.x,post.y-1,1,1,'#a17c4b');}
drawTimberEntranceSteps({x,y,w,h});
}
function islandInView(l){if(l.mainland)return camera.y+WORLD.viewHeight>=1680;return l.x+150>=camera.x&&l.x-150<=camera.x+WORLD.viewWidth&&l.y+150>=camera.y&&l.y-150<=camera.y+WORLD.viewHeight;}
function drawBoatIslandDetails(){
for(const island of boatIslands){
if(!islandInView(island))continue;
const {x,y,biome}=island;
for(const [dx,dy] of [[-57,-29],[38,-38],[62,16],[-51,37]]){
if(biome==='crystal')crystal(x+dx,y+dy,'#c3b5de');
else if(biome==='pine')pine(x+dx,y+dy);
else if(biome==='palm'){if(!drawBurningTree(x+dx,y+dy))drawPalmSprite(x+dx,y+dy);
}else tree(x+dx,y+dy,.65);
}
if(biome==='lagoon'){ellipse(x-25,y+10,27,18,'#e7d7a2');ellipse(x-25,y+8,23,13,'#69b3b9');}
if(biome==='coral')for(let i=0;i<5;i++)crystal(x-65+i*24,y+55,['#e2a292','#dac196','#abb8d3'][i%3]);
rect(x-4,y+25,8,44,'#c9bb84');
const visited=state.boatIslandsVisited.includes(island.id);
rect(x-8,y-27,16,15,visited?'#577c54':'#fff3cc');
ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.fillStyle=visited?'#eef5c6':'#927141';ctx.fillText(visited?'✓':'!',x,y-16);
ctx.font='7px monospace';ctx.fillStyle='#254f42';ctx.fillText(island.name.toUpperCase(),x,y-65);
ctx.font='6px monospace';ctx.fillStyle='#365746';ctx.fillText('BOAT ONLY · PRACTICE ASHORE',x,y-53);
}
}
function beachPerson(x,y,shirt,skin,pose=0){
ellipse(x,y+2,5,1.8,'#a48e6344');
const step=Math.sin(frame*.1+x)*1.1;
rect(x-3,y-4+step,2.5,5,'#4e6b74');rect(x+1,y-4-step,2.5,5,'#4e6b74');
rect(x-4,y-11,8,8,shirt);rect(x-3,y-17,6,6,skin);rect(x-3,y-18,6,2,'#66513e');
ctx.strokeStyle=skin;ctx.lineWidth=2;ctx.beginPath();
for(const side of [-1,1]){ctx.moveTo(x+side*4,y-10);ctx.lineTo(x+side*6,y-7-pose*5);ctx.lineTo(x+side*5,y-4-pose*11);}ctx.stroke();
}
function beachUmbrella(x,y,color){
ellipse(x+6,y+4,17,5,'#aa96604d');rect(x-1,y-13,2,20,'#947448');
ellipse(x,y-14,18,6,'#e9d9a6');
for(let i=0;i<6;i++){
const a=Math.PI+i*Math.PI/6,b=a+Math.PI/6;
polygon([[x,y-11],[x+Math.cos(a)*18,y-14+Math.sin(a)*7],[x+Math.cos(b)*18,y-14+Math.sin(b)*7]],i%2?color:'#f5ebc9');
}
rect(x-1,y-22,2,3,'#846744');
}
function drawBeachVolleyball(x,y,index){
if(volleyball?.index===index){drawPlayableVolleyball();return;}
const w=144,h=64,phase=frame/50+index*1.9,reaction=volleySprayReactions.get(index);
rect(x-2,y-2,w+4,h+4,'#dfc38b');ctx.strokeStyle='#fff1c5';ctx.lineWidth=1;ctx.strokeRect(x,y,w,h);
ctx.beginPath();ctx.moveTo(x,y+h/2);ctx.lineTo(x+w,y+h/2);ctx.stroke();
for(const side of [-1,1])for(const lane of [0,1]){
const px=x+36+lane*72+Math.sin(phase+lane+side)*3,py=y+(side<0?12:48)+Math.cos(phase*.8+lane)*1.5;
if(reaction&&reaction.actor===lane+(side<0?0:2))continue;
const ready=Math.max(0,(side<0?-Math.sin(phase):Math.sin(phase))-.55)*2;
beachPerson(px,py,side<0?'#d98b70':'#6b9ea9',lane?'#d4a879':'#f2c992',ready);
}
// Raised mesh net and its posts retain the scene's fixed light direction.
rect(x+4,y+10,2,21,'#826b4c');rect(x+w-6,y+10,2,21,'#826b4c');
ctx.strokeStyle='#faf1d0bb';ctx.lineWidth=.6;
for(let gx=x+6;gx<x+w-5;gx+=6){ctx.beginPath();ctx.moveTo(gx,y+14);ctx.lineTo(gx,y+27);ctx.stroke();}
for(let gy=y+14;gy<=y+27;gy+=4){ctx.beginPath();ctx.moveTo(x+5,gy);ctx.lineTo(x+w-5,gy);ctx.stroke();}
rect(x+4,y+13,w-8,1.3,'#fff4d3');
const bx=x+w/2+Math.sin(phase*.7)*29,groundY=y+h/2+Math.sin(phase)*20,arc=9+Math.abs(Math.cos(phase))*17;
if(!reaction){
ellipse(bx+2,groundY+2,3,1.2,'#ac976755');ellipse(bx,groundY-arc,3,3,'#f9efcf');
ctx.strokeStyle='#bd9459';ctx.lineWidth=.6;ctx.beginPath();ctx.arc(bx,groundY-arc,2,-1,1.8);ctx.stroke();
}
ctx.fillStyle='#765735';ctx.font='bold 6px monospace';ctx.textAlign='center';ctx.fillText(reaction?'GETTING THE BALL…':'PLAY VOLLEYBALL · E',x+w/2,y+h+9);
}
// Each court keeps its own ball until its player has carried it home.
const volleySprayReactions=new Map();
function ambientVolleyPlayers(index){
const c=VOLLEYBALL_COURTS[index],phase=frame/50+index*1.9;
return Array.from({length:4},(_,actor)=>{const lane=actor%2,side=actor<2?-1:1;
return {actor,x:c.x+36+lane*72+Math.sin(phase+lane+side)*3,y:c.y+(side<0?12:48)+Math.cos(phase*.8+lane)*1.5};});
}
function sprayVolleyballers(spray){
if(!boating)return;
const courts=VOLLEYBALL_COURTS.map((c,index)=>({index,people:ambientVolleyPlayers(index)}));
for(const drop of spray){
const start=drop.volleyCheckedAge??0,end=Math.min(drop.age,drop.life);
if(end<=start)continue;
const steps=Math.max(1,Math.ceil((end-start)/.01));
for(let step=0;step<=steps;step++){
const t=start+(end-start)*step/steps,x=drop.x+drop.vx*t,y=drop.y+drop.vy*t,z=Math.max(0,drop.vz*t-drop.gravity*t*t/2);
if(z>20)continue;
for(const {index,people} of courts){
if(volleyball?.index===index||volleySprayReactions.has(index))continue;
const hit=people.find(p=>Math.abs(x-p.x)<=7&&Math.abs(y-p.y)<=9);
if(hit)volleySprayReactions.set(index,{actor:hit.actor,npc:{...hit},home:{...hit},phase:'windup',elapsed:0,ball:null,swimming:false});
}
}
drop.volleyCheckedAge=end;
}
}
function advanceVolleySprayReactions(dt){
if(dt<=0||document.querySelector('dialog[open]'))return;
for(let remaining=dt;remaining>0;){
const step=Math.min(20,remaining);remaining-=step;
for(const [index,r] of volleySprayReactions){
r.elapsed+=step;
if(r.phase==='windup'){
if(r.elapsed<600)continue;
const target={x:player.x,y:player.y},duration=Math.max(650,Math.min(2200,Math.hypot(target.x-r.npc.x,target.y-r.npc.y)/.22));
r.ball={x:r.npc.x,y:r.npc.y,z:20,from:{...r.npc},target,duration};r.phase='throw';r.elapsed=0;
}else if(r.phase==='throw'){
const b=r.ball,t=Math.min(1,r.elapsed/b.duration);
b.x=b.from.x+(b.target.x-b.from.x)*t;b.y=b.from.y+(b.target.y-b.from.y)*t;b.z=20*(1-t)+Math.sin(t*Math.PI)*35;
if(t===1){r.phase='fetch';r.elapsed=0;}
}else if(r.phase==='fetch'||r.phase==='return'){
const target=r.phase==='fetch'?r.ball:r.home,dx=target.x-r.npc.x,dy=target.y-r.npc.y,distance=Math.hypot(dx,dy);
r.swimming=r.npc.y<beachShoreY(r.npc.x)+2;
const move=Math.min(distance,step*(r.swimming?.045:.075));
if(distance>0){r.npc.x+=dx/distance*move;r.npc.y+=dy/distance*move;}
if(r.phase==='return'){r.ball.x=r.npc.x+5;r.ball.y=r.npc.y;r.ball.z=r.swimming?9:14;}
if(distance<=move){
if(r.phase==='fetch'){r.phase='return';r.elapsed=0;}else volleySprayReactions.delete(index);
}
}
}
}
}
function drawVolleySprayReactions(){
for(const r of volleySprayReactions.values()){
const n=r.npc,skin=r.actor%2?'#d4a879':'#f2c992',shirt=r.actor<2?'#d98b70':'#6b9ea9';
if(r.swimming){
const stroke=Math.sin(r.elapsed*.012);
ellipse(n.x,n.y+1,8,3,'#bce8df66');ellipse(n.x,n.y-2,5,2.5,shirt);
ellipse(n.x,n.y-7,3,3,skin);rect(n.x-3,n.y-10,6,2,'#66513e');
ctx.strokeStyle=skin;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(n.x-3,n.y-3);ctx.lineTo(n.x-8,n.y-3+stroke*4);ctx.moveTo(n.x+3,n.y-3);ctx.lineTo(n.x+8,n.y-3-stroke*4);ctx.stroke();
ctx.strokeStyle='#dcf8ed';ctx.lineWidth=.7;ctx.beginPath();ctx.ellipse(n.x,n.y+1,9,3,0,0,Math.PI);ctx.stroke();
}else beachPerson(n.x,n.y,shirt,skin,r.phase==='windup'?1:0);
if(r.phase==='windup'){ctx.fillStyle='#fff3cf';ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.fillText('!',n.x,n.y-28);}
const b=r.ball||{x:n.x+5,y:n.y,z:23},water=b.y<beachShoreY(b.x)+2;
const bob=r.phase==='fetch'&&water?Math.sin(r.elapsed*.005)*.7:0;
if(water&&r.phase==='fetch'){
ctx.strokeStyle='#e3f7ed';ctx.lineWidth=.7;ctx.beginPath();ctx.ellipse(b.x,b.y+2,6+Math.sin(r.elapsed*.004),2,0,0,Math.PI*2);ctx.stroke();
}else ellipse(b.x+1,b.y+2,3,1.2,'#65705a44');
ellipse(b.x,b.y-b.z+bob,3.5,3.5,'#fff3d3');
ctx.strokeStyle='#c98a4e';ctx.lineWidth=.7;ctx.beginPath();ctx.arc(b.x,b.y-b.z+bob,2.7,-1+r.elapsed*.006,1.8+r.elapsed*.006);ctx.stroke();
}
}
const sunbatherReactions=new Map();
function resetSunbathers(){sunbatherReactions.clear();}
function beachSunbathers(){
return Array.from({length:22},(_,i)=>({i,x:90+i*145,y:1750+i%2*20}))
.filter(p=>Math.abs(p.x-SURF_SHACK.x)>=75&&!VOLLEYBALL_COURTS.some(c=>p.x>c.x-35&&p.x<c.x+145));
}
function advanceSunbathers(dt){
if(dt<=0||document.querySelector('dialog[open]'))return;
for(const [i,reaction] of sunbatherReactions){reaction.elapsed+=dt;if(reaction.elapsed>=7200)sunbatherReactions.delete(i);}
}
function spraySunbathers(spray){
const people=beachSunbathers();
for(const drop of spray){
const start=drop.checkedAge??0,end=Math.min(drop.age,drop.life);
if(end<=start)continue;
// Sweep the droplet path so a long frame cannot skip a towel.
const steps=Math.max(1,Math.ceil((end-start)/.02));
for(let step=0;step<=steps;step++){
const t=start+(end-start)*step/steps,x=drop.x+drop.vx*t,y=drop.y+drop.vy*t,z=Math.max(0,drop.vz*t-drop.gravity*t*t/2);
if(z>8)continue;
for(const p of people)if(!sunbatherReactions.has(p.i)&&Math.abs(x-p.x)<=7&&y>=p.y-18&&y<=p.y+10)sunbatherReactions.set(p.i,{elapsed:0});
}
drop.checkedAge=end;
}
}
function drawSunbather(p,skin,shirt){
const {x,y,i}=p,reaction=sunbatherReactions.get(i);
if(!reaction){
ellipse(x,y-13,3.5,3.5,skin);rect(x-3,y-17,6,2,'#72533d');
rect(x-4,y-9,8,10,shirt);rect(x-6,y-7,2,9,skin);rect(x+4,y-7,2,9,skin);rect(x-3,y+1,2,8,skin);rect(x+1,y+1,2,8,skin);
return;
}
const age=reaction.elapsed,rise=age<650?age/650:age>6500?(7200-age)/700:1;
const drying=age>=650&&age<5700,wipe=drying?Math.sin((age-650)/140):0;
ellipse(x,y+7,6,2,'#a48e6344');
ctx.save();ctx.translate(x,y+8-6*rise);ctx.scale(1,.65+.35*rise);
rect(-3,-8,2,8,skin);rect(1,-8,2,8,skin);rect(-4,-17,8,10,shirt);
ellipse(0,-21,3.5,3.5,skin);rect(-3,-25,6,2,'#72533d');
const towelY=drying?-19+wipe*6:-10;
ctx.strokeStyle=skin;ctx.lineWidth=2;ctx.beginPath();
for(const side of [-1,1]){ctx.moveTo(side*4,-15);ctx.lineTo(side*6,towelY+3);ctx.lineTo(side*4,towelY);}ctx.stroke();
rect(-5,towelY-2,10,6,'#f5ebcf');rect(-5,towelY+2,10,1,'#85adb8');
ctx.restore();
if(age<1400)for(const side of [-1,1])ellipse(x+side*(5+age/180),y-10+age/180,1,1.8,'#dff8f3');
}
function drawMainlandBeach(){
if(!islandInView(mainlandBeach))return;
polygon(beachPoly,'#d8bd83',5);polygon(beachPoly,'#ead6a1');
rect(WORLD.left,WORLD.height-18,WORLD.width,18,'#dfc58d');
const courts=VOLLEYBALL_COURTS.map(c=>c.x);
for(const p of beachSunbathers()){
const {i,x,y}=p;if(x<camera.x-50||x>camera.x+WORLD.viewWidth+50)continue;
const color=['#d58f80','#85adb8','#a7b87c','#d8b96e'][i%4],skin=['#f0c896','#d6a174','#b98261'][i%3];
rect(x-9,y-20,18,32,color);rect(x-7,y-17,14,2,'#f6e7b9');rect(x-7,y+8,14,2,'#f6e7b9');
drawSunbather(p,skin,i%2?'#698f9c':'#cb8d71');
beachUmbrella(x+29,y-7,color);
}
courts.forEach((x,index)=>{if(x+120>=camera.x&&x-25<=camera.x+WORLD.viewWidth)drawBeachVolleyball(x,VOLLEYBALL_COURTS[index].y,index);});
for(let i=0;i<6;i++){
if(frisbeeGame?.hostIndex===i)continue;
const p=frisbeeHost(i);if(p.x<camera.x-20||p.x>camera.x+WORLD.viewWidth+20)continue;
beachPerson(p.x,p.y,'#9dad79',i%2?'#c9916c':'#efc897');
if(FRISBEE_HOSTS.includes(i)){
ctx.strokeStyle=i%2?'#c9916c':'#efc897';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x+4,p.y-10);ctx.lineTo(p.x+8,p.y-8);ctx.stroke();drawFrisbeeDisc(p.x+10,p.y-8,p.color,frame*.02);
if(nearbyFrisbeeHost()===i){ctx.fillStyle='#765735';ctx.font='bold 7px monospace';ctx.textAlign='center';ctx.fillText('X · PLAY FRISBEE',p.x,p.y-27);}
}
}
ctx.textAlign='center';ctx.font='bold 8px monospace';ctx.fillStyle='#856742';
for(const x of [320,1120,2020,2920])if(x>=camera.x-100&&x<=camera.x+WORLD.viewWidth+100)ctx.fillText('MAINLAND BEACH',x,beachShoreY(x)+14);
}
function drawOceanDepth(){
// Deep water occupies the outer 14% on each side, fading in over 160 world pixels.
const gradient=ctx.createLinearGradient(WORLD.left,0,WORLD.right,0);
if(!gradient?.addColorStop)return;
for(const [offset,alpha] of [[0,.34],[.115,.34],[.14,0],[.86,0],[.885,.34],[1,.34]])gradient.addColorStop(offset,`rgba(25,83,119,${alpha})`);
ctx.fillStyle=gradient;ctx.fillRect(camera.x,camera.y,WORLD.viewWidth,WORLD.viewHeight);
}
function draw(){
if(surfSession&&surfSession.phase!=='paddling'){frame++;drawSurfGame();return;}
frame++;const focus=frisbeeGame?{x:(player.x+frisbeeGame.partner.x)/2,y:(player.y+frisbeeGame.partner.y)/2}:volleyball?{x:volleyball.court.x+volleyball.court.w/2,y:volleyball.court.y+volleyball.court.h/2}:wakeboardRide?{x:(player.x+wakeboardRide.boat.x)/2,y:(player.y+wakeboardRide.boat.y)/2}:fishingActive?{x:(player.x+fishingZone.x+85)/2,y:(player.y+fishingZone.y+50)/2}:player;camera.x=Math.max(WORLD.left,Math.min(WORLD.right-WORLD.viewWidth,focus.x-WORLD.viewWidth/2));camera.y=Math.max(0,Math.min(WORLD.height-WORLD.viewHeight,focus.y-WORLD.viewHeight/2));
rect(0,0,WORLD.viewWidth,WORLD.viewHeight,'#79bfc1');ctx.save();ctx.translate(-camera.x,-camera.y);
for(let y=Math.floor(camera.y/22)*22;y<camera.y+WORLD.viewHeight+22;y+=22)for(let x=Math.floor(camera.x/34)*34;x<camera.x+WORLD.viewWidth+34;x+=34){const seed=x*3+y*7;rect(x+Math.sin(frame/100+seed)*2,y,7+Math.abs(seed%5),1,seed%3?'#a0d2cb':'#68b2b8');}
drawOceanDepth();
drawBeachWaves();
drawWakeboardWake();
crossings.forEach(drawTimberShadow);activePiers().forEach(drawTimberShadow);
if(state.upgrades.includes('bridge'))drawTimberShadow(woodlandBridge);
islandPolys.forEach((poly,i)=>{if(allIslands[i].mainland||!islandInView(allIslands[i]))return;polygon(poly,'#4d9d9e',11);polygon(poly,'#e0ce95',5);polygon(poly,'#e7d7a2');const l=allIslands[i];polygon(poly.map(([x,y])=>[x+(x<l.x?7:-7),y+(y<l.y?7:-7)]),(l.boatOnly?l.color:null)||['#9bb96b','#93bda0','#adc77e','#7ca276','#9ba995'][i%5]);});
// Water occupants and their splashes pass beneath timber decks and boat hulls.
drawLochDragon();drawBlueMarlins();drawSharkFins();if(swimming)swimmerArt();
if(waterEntrySplash&&swimming&&waterEntrySplash.owner===profileId&&waterEntrySplash.level===ageLevel)drawWaterSplash(waterEntrySplash.x,waterEntrySplash.y,waterEntrySplash.elapsed/1500,waterEntrySplash.scale);
if(dragonFlight?.stage==='swimming')drawPetDragon();
crossings.forEach(b=>drawRaisedTimber(b));
// Restored woodland bridge links Sunseed Island and Crystal Cavern.
if(state.upgrades.includes('bridge'))drawRaisedTimber(woodlandBridge,true);
islandPolys.forEach((poly,i)=>{const l=allIslands[i];if(l.mainland||!islandInView(l))return;for(let j=0;j<65;j++){let x=l.x-90+(j*47)%180,y=l.y-65+(j*31)%150;if(inside(x,y,poly))rect(x,y,2,2,j%3?'#bdd18a':'#76975c');}if(i===4)for(const [x,y] of [[-60,-28],[-39,-45],[38,-34],[62,-12],[-27,34],[32,49],[65,17]])crystal(l.x+x,l.y+y,'#c9afe7');});
rect(207,146,14,99,'#d2bc83');house();
ellipse(480,188,29,17,'#ddd6a2');ellipse(480,186,25,14,'#76b8bb');rect(462,183,18,1,'#b4ded0');
for(let r=0;r<3;r++)for(let c=0;c<5;c++){let x=733+c*10,y=198+r*9;rect(x,y,8,6,'#8c7550');if(state.upgrades.includes('garden')){rect(x+3,y-4,2,7,'#608750');rect(x+1,y-6,5,3,['#f0c883','#d88d84','#e5e2ae'][(r+c)%3]);}}
drawIslandTrees();drawBoatIslandDetails();drawMainlandBeach();drawSurfOcean();drawSurfShack();
polygon([[710,423],[716,392],[737,369],[755,383],[770,423]],'#778675');rect(731,405,19,27,'#374b46');
activePiers().forEach(p=>drawRaisedTimber(p));
rect(95,211,2,12,'#6f6349');ctx.font='7px monospace';ctx.fillStyle='#fff5cd';ctx.textAlign='center';ctx.fillText('FISHING DOCK',106,265);
rect(farDock.x+10,farDock.y-8,9,3,'#78694e');cavernFlag(farDock.x+14,farDock.y-9,44);
const ferryAt=activeVessel==='ferry'?boatPosition:ferryPosition;ferryArt(ferryAt.x,ferryAt.y);
if(sponsored()){const fishingAt=activeVessel==='fishing'?boatPosition:fishingBoatPosition;fishingBoatArt(fishingAt.x,fishingAt.y);}
if(speedboatUnlocked()){const speedAt=activeVessel==='speedboat'?boatPosition:speedboatPosition;speedboatArt(speedAt.x,speedAt.y);drawSpeedboatDock();}

locations.forEach((l,i)=>{const done=l.ids.every(n=>state.solved.includes(n)),locked=false,bob=Math.floor(Math.sin(frame/22+i)*2);rect(l.x-8,l.y-27+bob,16,15,locked?'#72817a':done?'#577c54':'#fff3cc');ctx.fillStyle=locked?'#fff':done?'#eef5c6':'#927141';ctx.font='bold 10px monospace';ctx.textAlign='center';ctx.fillText(locked?'×':done?'✓':'!',l.x,l.y-16+bob);ctx.font='7px monospace';ctx.fillStyle='#254f42';ctx.fillText(['MAIN ISLAND','MOONWATER ISLAND','SUNSEED ISLAND','WHISPERING ISLAND','CRYSTAL CAVERN'][i],l.x,l.y-65);});
ctx.font='7px monospace';ctx.fillStyle='#fff5cd';ctx.textAlign='center';ctx.fillText('FERRY · TICKET 50 ◆',dock.x+30,dock.y+32);
drawFishing();
if(!wakeboardCrash&&!surfSession&&!voyage&&!boating&&!swimming&&!dragonFlight&&!wakeboardRide&&!volleyball&&!frisbeeGame){if(state.solved.length>=8)character(player.x-13,player.y+6,true);if(beachTransfer)drawBeachTransfer();else if(shoreRecovery)drawShoreRecovery();else if(!hookedFish)drawWalkingExplorer();}drawSurfingWorld();drawWakeboardCrash();drawFrisbeeGame();drawGoggleToss();drawBoatAnchor();drawBeachAnchorage();if(dragonFlight?.stage!=='swimming')drawPetDragon();drawWatersports();drawVolleySprayReactions();drawBoatTrimSpray(player.x,player.y,boatMotion.heading,activeVessel,true);drawPlayerHairEffect();drawBoatExplosions();ctx.restore();
drawMiniMap();
}
function drawMiniMap(){
const width=Math.min(108,WORLD.viewWidth-24),scale=(width-10)/WORLD.width,height=WORLD.height*scale+10;
const x=WORLD.viewWidth-width-7,y=WORLD.viewHeight-height-7,mx=x+5,my=y+5;
rect(x,y,width,height,'#368fc4');
ctx.strokeStyle='#d8e5ba88';ctx.lineWidth=.7;ctx.strokeRect(x,y,width,height);
const point=(wx,wy)=>[mx+(wx-WORLD.left)*scale,my+wy*scale];
islandPolys.forEach((poly,i)=>{const points=poly.map(([wx,wy])=>point(wx,wy));polygon(points,'#ddca92',1.5);polygon(points,allIslands[i].mainland?'#ead6a1':'#95b47b');});
crossings.forEach(b=>rect(mx+(b.x-WORLD.left)*scale,my+b.y*scale,Math.max(1,b.w*scale),Math.max(1,b.h*scale),'#e6c38e'));
if(state.upgrades.includes('bridge'))rect(mx+(woodlandBridge.x-WORLD.left)*scale,my+woodlandBridge.y*scale,Math.max(1,woodlandBridge.w*scale),woodlandBridge.h*scale,'#e6c38e');
ctx.strokeStyle='#e3f4ecaa';ctx.lineWidth=.6;ctx.strokeRect(mx+(camera.x-WORLD.left)*scale,my+camera.y*scale,WORLD.viewWidth*scale,WORLD.viewHeight*scale);
activePiers().forEach(p=>{const [dx,dy]=point(p.x,p.y);rect(dx,dy,Math.max(2,p.w*scale),p.h*scale,'#e6c38e');});
if(boating){const [bx,by]=point(boatPosition.x,boatPosition.y);rect(bx-2,by-1,4,2,'#efb77c');}
const [px,py]=point(player.x,player.y);ellipse(px,py,2.5,2.5,'#153f3b');ellipse(px,py,1.6,1.6,'#fff8da');
}

function canWalk(x,y){
if(swimming&&!hasSwimPower()&&!islandPolys.some(p=>inside(x,y,p)))return false;
if(boating)return boatPoseClear(x,y,boatMotion.heading);
if(x<WORLD.left||y<0||x>=WORLD.right||y>=WORLD.height)return false;
const island=islandPolys.findIndex(poly=>inside(x,y,poly));
if(swimming&&island<0)return true;
const crossing=crossings.some(b=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h)||(state.upgrades.includes('bridge')&&x>=woodlandBridge.x&&x<=woodlandBridge.x+woodlandBridge.w&&y>=woodlandBridge.y&&y<=woodlandBridge.y+woodlandBridge.h);
const pier=activePiers().some(p=>(!p.dock.islandId||state.boatIsland===p.dock.islandId)&&x>=p.x&&x<=p.x+p.w&&y>=p.y&&y<=p.y+p.h);
if(allIslands[island]?.boatOnly&&(swimming||state.boatIsland!==allIslands[island].id))return false;

if(island<0&&!crossing&&!pier)return false;
if(x>187&&x<241&&y>93&&y<148)return false;
if(((x-480)/25)**2+((y-186)/14)**2<1)return false;
if(x>731&&x<750&&y>405&&y<432)return false;
return true;
}
function nearby(){if(wakeboardCrash||surfSession||frisbeeGame)return -1;if(nearSurfShack())return 103;if(volleyball||beachTransfer||wakeboardRide||dragonFlight)return -1;const court=nearbyVolleyballCourt();if(court>=0)return 200+court;if(canReturnToAnchoredBoat())return 102;if(nearWatersportsDock())return 101;if(canMountPetDragon())return 100;if(shoreRecovery)return -1;if(canBoardIslandBoat())return 7;if(swimming)return canUseCurrentVessel()&&!diveAnimation&&Math.hypot(player.x-boatPosition.x,player.y-boatPosition.y)<44?7:-1;if(boating)return -1;if(speedboatUnlocked()&&Math.hypot(player.x-SPEEDBOAT_DOCK.x,player.y-SPEEDBOAT_DOCK.y)<42)return 104;if(Math.hypot(player.x-fishingDock.x,player.y-fishingDock.y)<32)return 6;if(Math.hypot(player.x-dock.x,player.y-dock.y)<35||Math.hypot(player.x-farDock.x,player.y-farDock.y)<35)return 5;const outer=boatIslands.findIndex(l=>state.boatIsland===l.id&&inside(player.x,player.y,islandPolys[locations.length+boatIslands.indexOf(l)])&&Math.hypot(l.x-player.x,l.y-player.y)<65);if(outer>=0)return 8+outer;return locations.findIndex(l=>Math.hypot(l.x-player.x,l.y+20-player.y)<48);}
function interact(){if(near===104){launchSpeedboat();return;}if(near===103){openSurfShack();return;}if(near>=200){startVolleyball(near-200);return;}if(near===102){returnToAnchoredBoat();return;}if(near===101){chooseWatersports();return;}if(near===100){mountPetDragon();return;}if(near>=8){visitBoatIsland(near-8);return;}if(near===7)boardOwnBoat();else if(near===6)openFishing();else if(near===5)openFerry();else if(near>=0)visit(near);}
let last=0;function tick(t){const dt=Math.min(40,t-last||16);last=t;if(!document.querySelector('dialog[open]'))advanceSwimming(dt);advanceFishing(dt);if(!fishingActive&&!diveAnimation&&!document.querySelector('dialog[open]')){let dx=(keys.has('right')||keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('left')||keys.has('a')||keys.has('arrowleft')?1:0),dy=(keys.has('down')||keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('up')||keys.has('w')||keys.has('arrowup')?1:0),speed=dt*(dragonFlight?(dragonFlight.stage==='swimming'?SWIMMING_DRAGON_SPEED:FLYING_DRAGON_SPEED):boating?.14:swimming?.065:.09)/(dx&&dy?Math.sqrt(2):1);if(boating)driveBoat(dt,-dy,dx);else moveExplorer(dx*speed,dy*speed);}draw();near=voyage||fishingActive?-1:nearby();$('#interaction').innerHTML=near>=0?`<button id="interactBtn">${suggestionMarkup(near===104?'E · Launch speedboat ↗':near===103?'E · Surf rental shack ↗':near>=200?'E · Play beach volleyball ↗':near===102?'E · Return to anchored boat ↗':near===101?'E · Watersports dock ↗':near===100?'E · Fly on your pet dragon ↗':near===7?'E · Climb into your boat ↗':near===6?'E · Go fishing ↗':near===5?'E · Board the ferry ↗':'E · '+(near>=8?boatIslands[near-8].name:locations[near].name)+' ↗')}</button>`:'';if(near>=0)$('#interactBtn').onclick=interact;$('#region').textContent=frisbeeGame?'Playing frisbee on the beach!':volleyball?'Playing beach volleyball!':wakeboardRide?(wakeboardRide.equipment==='waterskis'?'Waterskiing behind the tow boat!':'Wakeboarding behind the tow boat!'):dragonFlight?(dragonFlight.stage==='swimming'?'Swimming on your pet dragon!':'Flying on your pet dragon!'):sharkRide?(sharkRide.kind==='dragon'?'Riding the Loch Ness monster!':sharkRide.kind==='marlin'?'Riding a blue marlin!':'Riding a shark!'):swimming?(diveAnimation?'Diving into the sea…':'Swimming · head to shore or your boat'):boating?(activeVessel==='speedboat'?'Driving your triple-outboard speedboat':activeVessel==='ferry'?'Driving the ferry':'Your sponsored fishing boat'):voyage?'Sailing the Skyseed sea…':near===6?'Fishing dock':near===5?'Ferry landing':allIslands[islandPolys.findIndex(p=>inside(player.x,player.y,p))]?.name||'Island crossing';requestAnimationFrame(tick);}
window.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]'))return;const k=e.key.toLowerCase();if(activeMapPanel==='ferry'&&(k==='enter'||k==='e')){e.preventDefault();if(!e.repeat)confirmFerryBoarding();return;}if(activeMapPanel==='ferry'&&['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k))closeMapPanel();if(k==='escape'&&(activeMapPanel||activeSubmenu)){e.preventDefault();closeMapPanel();keys.clear();canvas.focus({preventScroll:true});return;}if(['INPUT','SELECT','BUTTON','TEXTAREA'].includes(e.target?.tagName))return;if(frisbeeGame&&['x','escape'].includes(k)){e.preventDefault();if(!e.repeat){if(k==='escape')leaveFrisbee();else frisbeeAction();}return;}if(k==='x'&&nearbyFrisbeeHost()>=0){e.preventDefault();if(!e.repeat)startFrisbee();return;}if(volleyball&&[' ','enter','x','escape'].includes(k)){e.preventDefault();if(!e.repeat){if(k==='x'||k==='escape')leaveVolleyball();else hitVolleyball();}return;}if(k===' '&&boating&&!fishingActive){e.preventDefault();if(!e.repeat)cycleBoatTrim();return;}if(k==='q'&&boating){e.preventDefault();if(!e.repeat)anchorBoatAtBeach();return;}if(k==='x'&&wakeboardRide){e.preventDefault();if(!e.repeat)finishWakeboarding();return;}if(k==='x'&&dragonFlight){e.preventDefault();if(!e.repeat)landPetDragon();return;}if(k==='x'&&sharkRide){e.preventDefault();if(!e.repeat)dismountShark();return;}if(k==='x'&&!swimming&&!voyage&&!fishingActive){e.preventDefault();if(!e.repeat){if(boating)exitBoat();else diveFromIsland();}return;}if(k==='f'&&!swimming&&(boating||fishingActive)){e.preventDefault();if(!e.repeat){if(fishingActive)stopFishing();else openFishing();}return;}if(fishingActive){if(k==='r'){e.preventDefault();if(!e.repeat)reelFishing();}return;}if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','e'].includes(k)){e.preventDefault();keys.add(k);if(k==='e'&&near>=0&&!e.repeat)interact();}});window.addEventListener('keyup',e=>{keys.delete(e.key.toLowerCase());save();});window.addEventListener('blur',()=>{keys.clear();save();});document.addEventListener('visibilitychange',()=>{keys.clear();save();});document.querySelectorAll('[data-dir]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.dir);};b.onpointerup=b.onpointercancel=()=>{keys.delete(b.dataset.dir);save();};});canvas.onclick=e=>{if(frisbeeGame){frisbeeAction();return;}if(volleyball){hitVolleyball();canvas.focus({preventScroll:true});return;}if(voyage||shoreRecovery||dragonFlight||wakeboardRide)return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*WORLD.viewWidth+camera.x,y=(e.clientY-r.top)/r.height*WORLD.viewHeight+camera.y;if(fishingActive){fishingAim={x,y};castFishing(x,y);return;}if(Math.hypot(x-SURF_SHACK.x,y-SURF_SHACK.y)<45){openSurfShack();return;}const court=nearbyVolleyballCourt();if(court>=0){const c=VOLLEYBALL_COURTS[court];if(x>=c.x&&x<=c.x+c.w&&y>=c.y&&y<=c.y+c.h){startVolleyball(court);return;}}if(Math.hypot(x-WATERSPORTS_DOCK.x,y-WATERSPORTS_DOCK.y)<30){openWatersports();return;}if(canMountPetDragon()&&Math.hypot(x-petDragonPosition.x,y-petDragonPosition.y)<30){mountPetDragon();return;}if(swimming){if(Math.hypot(x-boatPosition.x,y-boatPosition.y)<30)boardOwnBoat();return;}if(speedboatUnlocked()&&Math.hypot(x-SPEEDBOAT_DOCK.x,y-SPEEDBOAT_DOCK.y)<32){launchSpeedboat();return;}if(Math.hypot(x-fishingDock.x,y-fishingDock.y)<28){openFishing();return;}if([dock,farDock].some(d=>Math.hypot(d.x+30-x,d.y-y)<48)){openFerry();return;}const outer=boatIslands.findIndex(l=>Math.hypot(l.x-x,l.y-16-y)<24);if(outer>=0){visitBoatIsland(outer);return;}const i=locations.findIndex(l=>Math.hypot(l.x-x,l.y-16-y)<24);if(i>=0)visit(i);else{canvas.focus({preventScroll:true});toast('Walk across the islands, use your field journal to visit, or board the ferry at the main dock.');}};

function resizeMap(){
const width=window.innerWidth||960,height=window.innerHeight||600,dpr=Math.min(window.devicePixelRatio||1,2);
const zoom=Math.max(width/WORLD.width,height/WORLD.height,Math.min(width/480,height/300));
WORLD.viewWidth=width/zoom;WORLD.viewHeight=height/zoom;
canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(zoom*dpr,0,0,zoom*dpr,0,0);ctx.imageSmoothingEnabled=false;draw();
}
window.addEventListener('resize',resizeMap);
for(const group of RAIL_GROUPS)$('#'+group+'MenuBtn').onclick=()=>toggleSubmenu(group);
document.querySelectorAll('[data-submenu-close]').forEach(button=>button.onclick=closeSubmenu);
for(const id of ['fishingBtn','ferryBtn','stashBtn','journalBtn','exploreBtn','boatBtn','boatFishBtn']){const button=$('#'+id),action=button.onclick;button.onclick=()=>{closeMapPanel();keys.clear();action();};}
restoreBeachAnchor();initSurfing();if(!canWalk(player.x,player.y)){player.x=230;player.y=176;}if(state.ferryAboard&&state.ferryPose&&Number.isFinite(state.ferryPose.x)&&Number.isFinite(state.ferryPose.y)){activeVessel='ferry';boating=true;swimming=false;boatPosition={x:state.ferryPose.x,y:state.ferryPose.y};player.x=boatPosition.x;player.y=boatPosition.y;boatMotion.heading=state.ferryPose.heading||0;startBoatEngines();}resizeMap();update();checkSponsorship();requestAnimationFrame(tick);
