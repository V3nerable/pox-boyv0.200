// v0.313: 25%-smaller photo markers, five-minute Chronicle and Overseer defaults.
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm'), assert=require('node:assert/strict');
const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function part(from,to){const a=app.indexOf(from);assert(a>=0,from);const b=app.indexOf(to,a+from.length);assert(b>a,to);return app.slice(a,b);}
const ico=vm.createContext({L:{divIcon:options=>options}});
vm.runInContext(part('function markerPhotoIcon(', '// v0.56: the live signal census chip'),ico);
const opt=ico.markerPhotoIcon('data:image/jpeg;base64,QQ==');
assert.deepEqual(Array.from(opt.iconSize),[48,48]);
assert.deepEqual(Array.from(opt.iconAnchor),[24,24]);
assert(opt.html.includes('width:48px;height:48px'));
assert(opt.html.includes('border:5px'));
assert(html.includes('id="wp-photo-preview" alt="Selected marker thumbnail" style="display:none;width:48px;height:48px'));
assert(!html.includes('id="wp-photo-preview" alt="Selected marker thumbnail" style="display:none;width:64px'));
const frequency=html.match(/<select id="chronicle-frequency"[\s\S]*?<\/select>/)?.[0]||'';
assert(frequency.includes('<option value="300000" selected>5m</option>'));
assert(!frequency.includes('<option value="60000" selected>'));
const schedule=[];const cancels=[];const timer=vm.createContext({console:{log(){}},
  document:{getElementById:id=>id==='chronicle-frequency'?{value:'60000'}:{style:{display:'none'}}},
  setInterval:(fn,ms)=>{schedule.push({fn,ms});return schedule.length;},
  clearInterval:id=>cancels.push(id),setTimeout:(_fn,_ms)=>{},
  generateFluffEvents:()=>{timer.calls=(timer.calls||0)+1},showNotification:()=>{}});
vm.runInContext(part('let chronicleIntervalId = null;', '// v0.311: 15 METRES'),timer);
assert.equal(vm.runInContext('chronicleFrequency',timer),300000);
timer.startFluffEventGeneration();assert.equal(schedule.at(-1).ms,300000);
schedule.at(-1).fn();assert.equal(timer.calls,1,'initial repeating timer generates stories');
timer.updateChronicleFrequency();assert.equal(schedule.at(-1).ms,60000);
assert.equal(cancels.length,1);
schedule.at(-1).fn();assert.equal(timer.calls,2,'frequency change works with Overseer DISPLAY closed');
// The overview refresh (player list + Overseer Chronicle) is also 5m, while
// the Firebase Chronicle entries listener remains push-driven in real time.
const onscreen={'overseer-display-modal':{style:{display:'none'}},
  'overseer-marker-status':{textContent:'',style:{}},
  'overseer-refresh-timer':{innerText:''}};
let listRefreshes=0;let tick;
const board=vm.createContext({console,window:{},localStorage:{getItem:()=> 'true'},
 document:{getElementById:id=>onscreen[id]||null,querySelector:()=>null},
 updateOverseerSelectedMarkerAction:()=>{},updateOverseerDisplay:()=>listRefreshes++,
 pipMap:{getCenter:()=>({lat:1,lng:2})},setInterval:(fn,ms)=>{assert.equal(ms,1000);tick=fn;return 1},
 clearInterval:()=>{},setTimeout:()=>{}});
vm.runInContext(part('let overseerRefreshInterval = null;', 'function closeOverseerDisplay()'),board);
board.openOverseerDisplay();assert.equal(listRefreshes,1,'initial refresh on open');
assert.equal(onscreen['overseer-refresh-timer'].innerText,'Auto-refresh: 5:00');
tick();assert.equal(onscreen['overseer-refresh-timer'].innerText,'Auto-refresh: 4:59');
for(let i=1;i<300;i++)tick();
assert.equal(listRefreshes,2,'first periodic refresh after 300 seconds');
assert.equal(onscreen['overseer-refresh-timer'].innerText,'Auto-refresh: 5:00');
assert(app.includes("window.firebaseOnValue(entriesRef, (snapshot) =>"),'real-time Chronicle listener preserved');
console.log('PASS: shared/local marker photo icon 48px, 5px border, five-minute Chronicle default & Overseer countdown, manual rate works');
