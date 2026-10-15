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
const saves=[];const prompts=[];const notes=[];let redraws=0,closes=0;
const els={'wp-name':{value:''}};
const c=vm.createContext({Date,Number,document:{getElementById:id=>els[id]||null},
  tempWpLat:-31.95,tempWpLng:115.86,tempWpPhoto:null,pipMap:{},waypoints:[],
  userProfile:{name:'Overseer'},localStorage:{getItem:()=> 'true'},
  myMailUid:'u1',saveToStorage:()=>saves.push('saved'),renderMarkers:()=>redraws++,
  closeModals:()=>closes++,showNotification:msg=>notes.push(msg),
  showCustomPrompt:(text,buttons)=>prompts.push({text,buttons})});
const save=app.slice(app.indexOf('function saveNewWaypoint()'),app.indexOf('// v0.38: push one marker',app.indexOf('function saveNewWaypoint()')));
vm.runInContext(save,c);
c.saveNewWaypoint();assert.equal(saves.length,0);assert(notes.at(-1).includes('NAME REQUIRED'));
els['wp-name'].value='Radio';c.saveNewWaypoint();
assert.equal(saves.length,1);assert.equal(redraws,1,'render even if MAP tab inactive');
assert.equal(closes,1);assert.equal(c.waypoints[0].name,'RADIO');
assert(prompts.at(-1).text.includes('TO ALL WASTELANDERS'));
assert(prompts.at(-1).buttons.some(b=>b.label==='KEEP PRIVATE'));
const picker=app.slice(app.indexOf('function openRemoveSharedPinModal()'),app.indexOf('function updateZoneCard()',app.indexOf('function openRemoveSharedPinModal()')));
const removes=[];const q=vm.createContext({console,Object,String,localStorage:{getItem:()=> 'true'},
  lastKnownSharedPins:{own:{label:'RADIO',fromName:'OVERSEER',lat:1,lng:2},
    other:{label:'HOSPITAL',fromName:'BUILDER',lat:3,lng:4}},
  showCustomPrompt:(text,buttons)=>prompts.push({text,buttons}),showNotification:msg=>notes.push(msg),
  removeSharedPin:key=>removes.push(key)});
vm.runInContext(picker,q);q.openRemoveSharedPinModal();
assert.equal(prompts.at(-1).buttons.length,2);
prompts.at(-1).buttons.find(b=>b.label.includes('RADIO')).action();assert.deepEqual(removes,['own']);
console.log('PASS: blank names blocked, legacy unknown local pin pruned, Overseer map redraw, manual share prompt, selected-marker removal gate');
