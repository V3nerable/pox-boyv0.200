// v0.309 single-board NUKA PLANNER regression. Run: node tests/planner-regression.js
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const rules=JSON.parse(fs.readFileSync(path.join(__dirname,'..','firebase-rules.json'),'utf8')).rules;
const start=app.indexOf('// ================= v0.309 NUKA PLANNER'),end=app.indexOf('function cycleTheme()',start);
assert(start>=0 && end>start);
function element(){return {children:[],style:{},textContent:'',value:'',disabled:false,
  classList:{contains:()=>true},appendChild(child){this.children.push(child)},
  append(...children){this.children.push(...children)},replaceChildren(...children){this.children=children},
  setAttribute(k,v){this[k]=v},click(){this.onclick?.()},scrollTop:0};}
async function run(){
  assert(html.includes("switchSubTab('data', 'planner')"));
  assert(html.includes('id="planner-edit-slot"'));
  assert(html.includes('id="planner-edit-host"'));
  assert(!html.includes('id="planner-edit-end"'));
  const rule=rules.plannerEvents.$day.$eventId;
  assert.equal(rule['.write'],true);
  for(let d=22;d<=24;d++) assert(rule['.validate'].includes(`2026-10-${d}`));
  assert(!rule['.validate'].includes('2026-10-25'));
  assert(rule['.validate'].includes('2026-10-14'));
  assert(rule.startMinute['.validate'].includes('% 60 == 0'));
  assert(rule.startMinute['.validate'].includes('>= 360'));
  assert(rule.startMinute['.validate'].includes('<= 1380'));
  assert(rule['.validate'].includes("+ 60"));
  const ids=['planner-grid','planner-status','planner-add-btn','planner-grid-wrap','planner-archive-btn',
    'planner-editor-modal','planner-editor-heading','planner-edit-day','planner-edit-title',
    'planner-edit-location','planner-edit-description','planner-edit-slot','planner-edit-host',
    'planner-editor-error','planner-save-btn','planner-edit-broadcast','tab-data'];
  const els=Object.fromEntries(ids.map(id=>[id,element()]));
  let dev=true,listener,listenFail;const pushes=[],updates=[],removes=[],prompts=[],notes=[];
  const c=vm.createContext({console,Date,Intl,Promise,Number,Object,Array,String,
    officialFactions:[{id:'fac1',name:'NCR'},{id:'fac2',name:'BROTHERHOOD'}],
    currentDataTab:'planner',localStorage:{getItem:()=>dev?'true':null},
    document:{getElementById:id=>els[id]||null,createElement:()=>element()},
    window:{db:{},firebaseRef:(_,p)=>p,firebaseOnValue:(p,cb,err)=>{listener=cb;listenFail=err},
      firebasePush:(p,data)=>{pushes.push({p,data});return Promise.resolve({key:'event-new'})},
      firebaseUpdate:(p,data)=>{updates.push({p,data});return Promise.resolve()},
      firebaseRemove:p=>{removes.push(p);return Promise.resolve()}},
    showCustomPrompt:(text,buttons)=>prompts.push({text,buttons}),showNotification:msg=>notes.push(msg),
    myMailUid:'overseer',userProfile:{name:'OVERSEER'}});
  vm.runInContext(app.slice(start,end),c);
  assert.equal(c.plannerClock(1440),'24:00');
  c.startNukaPlannerListener();assert.equal(typeof listener,'function');
  listener({val:()=>({'2026-10-22':{
    a:{title:'Rally',startMinute:600,endMinute:660,location:'Garage',hostType:'faction',hostFactionId:'fac1'},
    b:{title:'Repair',startMinute:600,endMinute:660,hostType:'wastelander'},
    c:{title:'Break',startMinute:660,endMinute:720},
    legacy:{title:'Old',startMinute:630,endMinute:690}},
    '2026-10-24':{last:{title:'Night',startMinute:1380,endMinute:1440}},
    '2026-10-25':{sun:{title:'Sunday',startMinute:600,endMinute:660}}})});
  c.renderNukaPlanner();
  const rows=els['planner-grid'].children.filter(x=>x.className==='planner-board-row');
  const headers=els['planner-grid'].children.filter(x=>x.className==='planner-board-day');
  assert.equal(headers.length,4);assert(headers[0].textContent.includes('TEST DAY'));
  assert.equal(rows.length,54);
  assert.equal(rows[0].children[0].textContent,'06:00–07:00');
  assert.equal(rows[11].children[0].textContent,'17:00–18:00');
  assert.equal(rows[12].children[0].textContent,'10:00–11:00');
  const firstCards=rows[12].children[1].children.filter(x=>x.className==='planner-board-event');
  assert.equal(firstCards.length,2); // shared hour expands its row, no overlapping columns
  assert(firstCards.some(card=>card.children[1].textContent.includes('NCR · AREA: Garage')));
  assert(firstCards.some(card=>card.children[1].textContent.includes('WASTELANDER-RUN')));
  assert.equal(rows.at(-1).children[0].textContent,'23:00–24:00');
  assert(els['planner-status'].textContent.includes('4 EVENTS'));
  assert(els['planner-archive-btn'].textContent.includes('2 PREVIOUS-FORMAT EVENTS'));
  firstCards[0].click();assert(prompts.at(-1).text.includes('10:00–11:00 AWST'));
  c.viewPlannerArchive();assert.equal(prompts.at(-1).buttons.length,2);
  prompts.at(-1).buttons.find(b=>b.label.includes('Sunday')).action();
  assert(!prompts.at(-1).buttons.some(b=>b.label==='EDIT EVENT'));
  // Overseer chooses a slot, one of two special hosts or an official faction, then saves.
  c.openPlannerEditor('2026-10-22');
  assert.equal(els['planner-editor-modal'].style.display,'flex');
  assert(els['planner-edit-broadcast'].textContent.includes('NO'));
  c.togglePlannerBroadcast();assert(els['planner-edit-broadcast'].textContent.includes('YES'));
  c.choosePlannerSlot();assert.equal(prompts.at(-1).buttons.length,14);
  prompts.at(-1).buttons.at(-1).action();
  assert.equal(els['planner-edit-slot'].textContent,'SLOT: 23:00–24:00');
  c.choosePlannerHost();assert.equal(prompts.at(-1).buttons.length,4);
  prompts.at(-1).buttons.find(b=>b.label==='NCR').action();
  els['planner-edit-title'].value='Nuka Night';
  els['planner-edit-location'].value='Pit';
  els['planner-edit-description'].value='Bring caps';
  c.savePlannerEvent();await new Promise(r=>setImmediate(r));
  assert.equal(pushes.length,1);assert.equal(pushes[0].p,'plannerEvents/2026-10-22');
  assert.equal(pushes[0].data.startMinute,1380);
  assert.equal(pushes[0].data.endMinute,1440); // derived, never chosen
  assert.equal(pushes[0].data.hostFactionId,'fac1');
  assert.equal(pushes[0].data.location,'Pit');
  assert.equal(pushes[0].data.broadcast,true);
  // Today is a distinct test day, with 06:00–18:00 slots only.
  c.openPlannerEditor('2026-10-14');
  c.choosePlannerSlot(); assert.equal(prompts.at(-1).buttons.length,12);
  assert.equal(prompts.at(-1).buttons[0].label,'06:00–07:00');
  assert.equal(prompts.at(-1).buttons.at(-1).label,'17:00–18:00');
  c.choosePlannerDay();
  prompts.at(-1).buttons.find(b=>b.label.startsWith('THU')).action();
  assert.equal(els['planner-edit-slot'].textContent,'SLOT: 10:00–11:00');
  c.closePlannerEditor();
  assert.equal(els['planner-editor-modal'].style.display,'none');
  // Existing one-hour records without new host fields may be edited; no silent migration.
  c.openPlannerEditor('2026-10-22','c');
  assert.equal(els['planner-edit-day'].disabled,true);
  assert(els['planner-edit-host'].textContent.includes('NONE'));
  els['planner-edit-title'].value='Updated Break';
  c.savePlannerEvent();await new Promise(r=>setImmediate(r));
  assert.equal(updates[0].data.hostType,'none');
  assert.equal(updates[0].data.endMinute,720);
  // Sunday and off-grid records are read-only in new editor, but can be reviewed/deleted explicitly.
  c.openPlannerEditor('2026-10-22','legacy');
  assert(notes.includes('EVENT IS IN PREVIOUS-FORMAT ARCHIVE.'));
  c.confirmDeletePlannerEvent('2026-10-25','sun');
  assert.equal(removes.length,0);
  prompts.at(-1).buttons.find(b=>b.label==='DELETE EVENT').action();
  await new Promise(r=>setImmediate(r));
  assert.deepEqual(removes,['plannerEvents/2026-10-25/sun']);
  dev=false;c.renderNukaPlanner();
  assert.equal(els['planner-add-btn'].style.display,'none');
  const ordinaryFirstRow=els['planner-grid'].children.find(x=>x.className==='planner-board-row');
  assert(!ordinaryFirstRow.children[1].children.some(x=>x.className==='planner-board-add'));
  c.openPlannerEventDetails('2026-10-22','b');
  assert(!prompts.at(-1).buttons.some(b=>b.label==='EDIT EVENT'));
  c.openPlannerEditor();c.savePlannerEvent();assert.equal(pushes.length,1);
  listenFail(new Error('permission denied'));
  assert(els['planner-status'].textContent.includes('CHECK FIREBASE RULES'));
  console.log('PASS: 12 test + 3x14 festival board, multi-event rows, official faction/special hosts, archived legacy, CRUD gate, derived hour, rules');
}
run().catch(e=>{console.error(e);process.exitCode=1});
