// v0.311 offline mocked regression: grouping, dedup, cleanup, photo/picker, rules, selected-only removal.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const path = require('node:path');
const app = fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const html = fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const rules = JSON.parse(fs.readFileSync(path.join(__dirname,'..','firebase-rules.json'),'utf8')).rules;
function part(from,to) { const a=app.indexOf(from); assert(a>=0,from); const b=app.indexOf(to,a+from.length); assert(b>a,to); return app.slice(a,b); }
const geodist=(a,b,c,d)=>{const rad=Math.PI/180,R=6371000;const x=(c-a)*rad,y=(d-b)*rad;const h=Math.sin(x/2)**2+Math.cos(a*rad)*Math.cos(c*rad)*Math.sin(y/2)**2;return 2*R*Math.asin(Math.sqrt(h));};
const entries=new Map(), writes=[];
const ctx=vm.createContext({console,Math,Set,Date,window:{db:{},firebaseRef:(_db,id)=>id,
 firebaseRunTransaction:async(id,fn)=>{ const next=fn(entries.has(id)?entries.get(id):null); if(next!==undefined) {entries.set(id,next);writes.push([id,next]);return {committed:true};}return {committed:false};}},getDistance:geodist});
vm.runInContext(part('// v0.311: 15 METRES','async function cleanupDemoWastelanders()'),ctx);
assert.equal(vm.runInContext('gatheringTemplatesSmall.length',ctx),20);
assert.equal(vm.runInContext('gatheringTemplatesLarge.length',ctx),20);
const at=(i,metres=0,scrambled=false)=>({uid:'u'+String(i).padStart(2,'0'),name:'USER '+i,lat:-31.95+metres/111194,lng:115.86,timestamp:Date.now(),scrambled});
async function flush(){await new Promise(resolve=>setImmediate(resolve));}
(async()=>{
 const now=Date.now();
 let five=Array.from({length:5},(_,i)=>at(i));
 assert.equal(ctx.buildGatheringGroups(five).length,1);
 assert.equal(ctx.buildGatheringGroups(five.slice(0,4)).length,0);
 assert.equal(ctx.buildGatheringGroups([...five,at(9,16)]).at(0).length,5,'16m excluded');
 assert.equal(ctx.buildGatheringGroups([...five,at(9,0,true)]).at(0).length,5,'scrambled excluded');
 assert.equal(ctx.buildGatheringGroups([...five.slice(0,4),at(9,0,true)]).length,0,'decoy must not create five');
 // 0, 11 and 22m form a chain but cannot be a single clique; ensure pairwise <= 15m.
 assert.equal(ctx.buildGatheringGroups([at(0,0),at(1,0),at(2,0),at(3,11),at(4,22)]).length,0);
 ctx.publishGatheringStories(five,now);await flush();assert.equal(writes.length,1);
 assert.equal(writes[0][1].eventType,'gathering5to9');
 ctx.publishGatheringStories(five,now+5000);await flush();assert.equal(writes.length,1,'same bucket must not duplicate');
 const ten=Array.from({length:10},(_,i)=>at(i));
 ctx.publishGatheringStories(ten,now+15*60000);await flush();assert.equal(writes.at(-1)[1].eventType,'gathering10plus');
 assert.equal(ctx.buildGatheringGroups([at(1,0),at(2,100),at(3,200),at(4,300),at(5,400)]).length,0);
 vm.runInContext(part('function isDemoWastelander(', '// v0.63: render scrollable list'),ctx);
 assert(!ctx.isLiveWastelander('demo-player-1',{...at(1),isDemo:true}));
 assert(ctx.isLiveWastelander('u1',at(1)));
 assert(!ctx.isLiveWastelander('u1',{...at(1),timestamp:now-360000}));
 const photoRule=rules.sharedpins.$pinId.photoThumb?.['.validate'];
 assert(photoRule.includes('data:image/jpeg;base64,') && photoRule.includes('25000'));
 assert(rules.wastelanders.$uid.scrambled?.['.validate'].includes('isBoolean'));
 assert(html.includes('id="pp-snap-btn"') && html.includes('id="overseer-remove-selected"'));
 assert(html.includes('onclick="pickWaypointPhoto()"'));
 assert(!html.slice(html.indexOf('id="overseer-display-modal"'),html.indexOf('id="overseer-center-dot"')).includes('onclick="openRemoveSharedPinModal()"'));
 // Simulate deletion transaction's predicate: only exact IDs with a true demo flag.
 const demo=part('async function cleanupDemoWastelanders()', 'function generateFluffEvents()');
 assert(demo.includes('/^demo-player-(?:[1-9]|10)$/.test(uid) && w?.isDemo === true'));
 assert(demo.includes('window.firebaseRunTransaction(ref, current =>'));
 assert(demo.includes('link.click()'));
 assert(!app.includes('function generateDemoPlayers()') && !app.includes('function updateDemoPlayerTimestamps()'));

 // Verify backup is demanded and a SECOND explicit confirmation precedes atomic deletion.
 const prompts=[],removed=[];const dbRows={'demo-player-1':{isDemo:true,name:'Player 1'},
   'demo-player-2':{isDemo:false,name:'A REAL USER'},'ordinary':{isDemo:true,name:'OTHER TEST'}};
 const cleanupCtx=vm.createContext({console,Date,Blob,JSON,Object,setTimeout:()=>{},
   URL:{createObjectURL:()=> 'blob:backup',revokeObjectURL:()=>{}},
   document:{body:{appendChild:()=>{}},createElement:()=>({click:()=>{},remove:()=>{}})},
   localStorage:{getItem:()=> 'true'},showNotification:()=>{},updateOverseerDisplay:()=>{},
   showCustomPrompt:(text,buttons)=>prompts.push({text,buttons}),window:{db:{},
     firebaseRef:(_db,id)=>id,firebaseGet:async()=>({val:()=>dbRows}),
     firebaseRunTransaction:async(id,fn)=>{const uid=id.split('/').at(-1);const next=fn(dbRows[uid]);
       if(next===null){removed.push(uid);return {committed:true}}return {committed:false}}}});
 vm.runInContext(demo,cleanupCtx);
 await cleanupCtx.cleanupDemoWastelanders();
 assert.equal(prompts.length,1);assert.equal(removed.length,0);
 prompts[0].buttons[0].action();assert.equal(prompts.length,2);assert.equal(removed.length,0);
 await prompts[1].buttons[0].action();assert.deepEqual(removed,['demo-player-1']);

 assert(app.includes('SHARE WITH EVERYONE? BROADCAST TO ALL WASTELANDERS?'));
 const els={'overseer-remove-selected':{style:{display:'none'},textContent:''},'overseer-display-modal':{style:{display:'flex'}}};
 const sel=vm.createContext({document:{getElementById:id=>els[id]},localStorage:{getItem:()=> 'true'},
 lastKnownSharedPins:{shared:{label:'TEST'}},selectedPinKey:null,selectedLocalWaypointId:null,waypoints:[{id:17,name:'TEST'}],showCustomPrompt:()=>{},
 removeSharedPin:key=>{sel.removed=key},deleteWaypointById:id=>{sel.deleted=id}});
 vm.runInContext(part('function updateOverseerSelectedMarkerAction()', 'function updatePinCard()'),sel);
 sel.removeOverseerSelectedMarker(); assert(!sel.removed && !sel.deleted);
 vm.runInContext('selectedPinKey="shared"; selectedLocalWaypointId=null; updateOverseerSelectedMarkerAction()',sel);
 assert(els['overseer-remove-selected'].textContent.includes('SHARED'));
 sel.removeOverseerSelectedMarker();assert.equal(sel.removed,'shared');
 vm.runInContext('selectedPinKey=null; selectedLocalWaypointId=17; updateOverseerSelectedMarkerAction()',sel);
 assert(els['overseer-remove-selected'].textContent.includes('LOCAL'));
 els['overseer-display-modal'].style.display='none';sel.removeOverseerSelectedMarker();assert(!sel.deleted);
 // Photobank-only thumbnail flow: picker above waypoint modal, no camera option,
 // selected PIP photo is square-compressed and previewed before explicit sharing.
 const picEls={};
 for(const id of ['wp-photo-preview','pp-title','pp-grid','photo-pick-modal','pp-snap-btn','add-waypoint-modal'])
   picEls[id]={style:{},replaceChildren(){this.children=[]},appendChild(n){(this.children??=[]).push(n)},removeAttribute(){}};
 const picDoc={getElementById:id=>picEls[id],createElement:tag=>tag==='canvas'?
   {width:0,height:0,getContext:()=>({drawImage(){}}),toDataURL:()=> 'data:image/jpeg;base64,QUJD'}:
   {style:{},appendChild(n){(this.children??=[]).push(n)}}};
 class FakeImage {constructor(){this.width=100;this.height=150;} set src(_value){this.onload();}}
 const pic=vm.createContext({document:picDoc,photoArchiveReady:true,photoArchive:[{pip:'data:image/jpeg;base64,QUJD'}],
   entryPip:e=>e.pip,photoPickMode:'send',tempWpPhoto:null,showNotification:()=>{},Image:FakeImage,
   safeMarkerPhoto:x=>/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(x) && x.length<=25000?x:null});
 vm.runInContext(part('function updateWaypointPhotoPreview()', '// v0.55: native <select> purged'),pic);
 vm.runInContext(part('function pickPhotoForMail(idx)', 'function sendPhotoMail('),pic);
 pic.pickWaypointPhoto();assert.equal(picEls['photo-pick-modal'].style.zIndex,'2100');
 assert.equal(picEls['pp-snap-btn'].style.display,'none');
 assert.equal(picEls['pp-grid'].children[0].children.length,1);
 pic.pickPhotoForMail(0);
 assert.equal(picEls['photo-pick-modal'].style.zIndex,'');
 assert.equal(picEls['pp-snap-btn'].style.display,'');
 assert.equal(picEls['wp-photo-preview'].style.display,'block');
 assert.equal(pic.tempWpPhoto,'data:image/jpeg;base64,QUJD');
 // Overseer gets visible save/broadcast feedback (notification overlay is behind it).
 const statuses={'overseer-display-modal':{style:{display:'flex'}},
   'overseer-marker-status':{textContent:'',style:{display:'none'}}};
 const broadcasts=[];let shouldFail=false;
 const signal=vm.createContext({Date,Math,console:{error(){}},
   localStorage:{getItem:()=> 'true'},navigator:{onLine:true},
   userProfile:{name:'Overseer'},myMailUid:'overseer',
   document:{getElementById:id=>statuses[id]},
   showNotification:()=>{throw Error('banner should show inside Overseer')},
   safeMarkerPhoto:()=>null,window:{db:{},firebaseRef:(_db,id)=>id,
     firebaseSet:async(_ref,data)=>{if(shouldFail)throw Error('rules');broadcasts.push(data)}}});
 vm.runInContext(part('function announceWaypointResult(', 'function showWaypointSaveError('),signal);
 vm.runInContext(part('function broadcastWaypoint(', '// v0.55: takes the id directly now'),signal);
 signal.broadcastWaypoint({name:'RADIO',lat:1,lng:2},true);await flush();
 assert.equal(statuses['overseer-marker-status'].style.display,'block');
 assert(statuses['overseer-marker-status'].textContent.includes('SHARED WITH EVERYONE'));
 assert.equal(broadcasts.length,1);
 shouldFail=true;signal.broadcastWaypoint({name:'RADIO',lat:1,lng:2},true);await flush();
 assert(statuses['overseer-marker-status'].textContent.includes('STAYS ON THIS DEVICE'));
 assert.equal(statuses['overseer-marker-status'].style.borderColor,'#ff3333');
 console.log('PASS: 15m pairwise gatherings, tiers, 40 variants, decoy exclusion, transactional dedup, selected-only removal, confirmed scoped cleanup, thumbnail rules');
})().catch(e=>{console.error(e);process.exitCode=1});
