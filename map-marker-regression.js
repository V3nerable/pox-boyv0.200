// v0.310: Overseer marker creation/removal and local UNKNOWN LOCATION cleanup.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
assert(html.includes('onclick="removeOverseerSelectedMarker()"'));
assert(!html.includes('onclick="openRemoveSharedPinModal()"'));
assert(app.includes("localStorage.getItem('pipboy-dev-mode') !== 'true') return;")); // self-echo visible to dev
const clean=app.slice(app.indexOf('let waypoints = JSON.parse('), app.indexOf('// Merge new default waypoints'));
const store={'pipboy-waypoints':JSON.stringify([
  {id:1,name:'UNKNOWN LOCATION',lat:1,lng:2},
  {id:2,name:'RADIO',lat:3,lng:4}])};
const migration=vm.createContext({JSON,String,DEFAULT_WAYPOINTS:[],localStorage:{
  getItem:key=>store[key]||null,setItem:(key,val)=>store[key]=val}});
vm.runInContext(clean,migration);
assert.deepEqual(JSON.parse(store['pipboy-waypoints']).map(x=>x.name),['RADIO']);
// v0.312: marker SAVE must show errors inside the editor, persist only marker data,
// redraw a moved Overseer map, and still separately ask to share.
const saves=[],prompts=[],notes=[];let redraws=0,closes=0;
const els={'wp-name':{value:''},'wp-save-feedback':{textContent:'',style:{display:'none'},scrollIntoView(){}}};
const storage={getItem:()=> 'true',setItem:(key,value)=>saves.push([key,value])};
const c=vm.createContext({Date,Number,console,document:{getElementById:id=>els[id]||null},
  tempWpLat:-31.95,tempWpLng:115.86,tempWpPhoto:null,pipMap:{},waypoints:[],
  userProfile:{name:'Overseer'},localStorage:storage,
  myMailUid:'u1',renderMarkers:()=>redraws++,
  closeModals:()=>closes++,showNotification:msg=>notes.push(msg),
  showCustomPrompt:(text,buttons)=>prompts.push({text,buttons})});
const save=app.slice(app.indexOf('function showWaypointSaveError('),app.indexOf('// v0.38: push one marker',app.indexOf('function saveNewWaypoint()')));
vm.runInContext(save,c);
c.saveNewWaypoint();assert.equal(saves.length,0);assert(els['wp-save-feedback'].textContent.includes('ENTER A MARKER NAME'));
assert.equal(els['wp-save-feedback'].style.display,'block');assert.equal(notes.length,0,'error must not hide under modal');
els['wp-name'].value='Radio';c.saveNewWaypoint();
assert.equal(saves.length,1);assert.equal(saves[0][0],'pipboy-waypoints');
assert.equal(redraws,1,'render even if MAP tab inactive');
assert.equal(closes,1);assert.equal(c.waypoints[0].name,'RADIO');
assert(prompts.at(-1).text.includes('SHARE WITH EVERYONE?'));
assert(prompts.at(-1).buttons.some(b=>b.label==='KEEP PRIVATE'));
assert.equal(prompts.at(-1).buttons.some(b=>b.label.startsWith('SHARE WITH EVERYONE')),true);
const before=c.waypoints.length;
storage.setItem=()=>{throw new Error('QuotaExceededError')};
els['wp-name'].value='No space';c.saveNewWaypoint();
assert.equal(c.waypoints.length,before,'failed storage must not create a ghost marker');
assert.equal(prompts.length,1,'must not offer global share if local save fails');
assert(els['wp-save-feedback'].textContent.includes('STORAGE IS FULL'));
const picker=app.slice(app.indexOf('function openRemoveSharedPinModal()'),app.indexOf('function updateZoneCard()',app.indexOf('function openRemoveSharedPinModal()')));
const removes=[];const q=vm.createContext({console,Object,String,localStorage:{getItem:()=> 'true'},
  lastKnownSharedPins:{own:{label:'RADIO',fromName:'OVERSEER',lat:1,lng:2},
    other:{label:'HOSPITAL',fromName:'BUILDER',lat:3,lng:4}},
  showCustomPrompt:(text,buttons)=>prompts.push({text,buttons}),showNotification:msg=>notes.push(msg),
  removeSharedPin:key=>removes.push(key)});
vm.runInContext(picker,q);q.openRemoveSharedPinModal();
assert.equal(prompts.at(-1).buttons.length,2);
prompts.at(-1).buttons.find(b=>b.label.includes('RADIO')).action();assert.deepEqual(removes,['own']);
// The Overseer + MARKER path must capture the map center, keep Overseer
// visible under the editor, and clear the error when editing the next marker.
let modalKeep;
const overlayEls={'wp-name':{value:'OLD NAME'},
  'wp-save-feedback':{textContent:'OLD ERROR',style:{display:'block'}},
  'wp-overseer-zones':{style:{}},'add-waypoint-modal':{style:{display:'none'}}};
const openCtx=vm.createContext({document:{getElementById:id=>overlayEls[id]},
 pipMap:{getCenter:()=>({lat:-31.95,lng:115.86})},localStorage:{getItem:()=> 'true'},
 tempWpPhoto:'old',tempWpLat:null,tempWpLng:null,
 setModalState:()=>{},suspendVisibleModals:(_except,_owner,keep)=>{modalKeep=keep},
 updateWaypointPhotoPreview:()=>{},showNotification:()=>{throw Error('map unexpectedly unavailable')}});
vm.runInContext(app.slice(app.indexOf('function openAddWaypointModal('),app.indexOf('function updateWaypointPhotoPreview()',app.indexOf('function openAddWaypointModal('))),openCtx);
vm.runInContext(app.slice(app.indexOf('function overseerAddMarker()'),app.indexOf('function overseerCenterMap()',app.indexOf('function overseerAddMarker()'))),openCtx);
openCtx.overseerAddMarker();
assert.equal(openCtx.tempWpLat,-31.95);assert.equal(openCtx.tempWpLng,115.86);
assert.equal(overlayEls['add-waypoint-modal'].style.display,'flex');
assert.equal(overlayEls['wp-save-feedback'].style.display,'none');
assert.equal(overlayEls['wp-name'].value,'');
assert.deepEqual(Array.from(modalKeep),['overseer-display-modal']);
// Broadcast map tooltip is name-only. Attribution belongs to the selected pin card.
const labels=[];
const pinElements={
 'map-user-card':{style:{}},'muc-name':{innerText:'',style:{}},
 'muc-info':{innerText:''},'muc-vitals':{style:{},innerHTML:''},'muc-actions':{innerHTML:''}
};
const pin=vm.createContext({Date,Math,Object,String,
 document:{getElementById:id=>pinElements[id]},
 localStorage:{getItem:()=> 'false'},myMailUid:'self',myLastLat:null,
 sharedPinsGroup:{clearLayers(){}},lastKnownSharedPins:{},selectedPinKey:null,
 L:{divIcon:o=>o,DomEvent:{stopPropagation(){}},marker:()=>({
   bindTooltip(text){labels.push(text);return this},addTo(){return this},on(){return this},openTooltip(){}})},
 safeMarkerPhoto:()=>null,selectSharedPin:()=>{},updatePinCard:()=>{}});
vm.runInContext(app.slice(app.indexOf('let pinMarkerRefs = {};'),app.indexOf('// v0.50: draw every Overseer ZONE',app.indexOf('let pinMarkerRefs = {};'))),pin);
pin.renderSharedPins({global:{label:'RADIO',from:'other',fromName:'SAM',lat:1,lng:2,permanent:true}});
assert.deepEqual(labels,['RADIO']);
vm.runInContext(app.slice(app.indexOf('function updatePinCard()'),app.indexOf('function removeSharedPin(',app.indexOf('function updatePinCard()'))),pin);
pin.selectedPinKey='global';pin.updatePinCard();
assert(pinElements['muc-info'].innerText.includes('SHARED BY SAM'));
console.log('PASS: inline marker errors, atomic local save, quota rollback, Overseer redraw, manual share prompt, selected-marker removal gate');
