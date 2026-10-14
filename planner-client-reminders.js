// v0.309: client-only reminder tests with two devices and a fake RTDB transaction journal.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const block=app.slice(app.indexOf('// ================= v0.309 NUKA PLANNER'),app.indexOf('function cycleTheme()',app.indexOf('// ================= v0.309 NUKA PLANNER')));
assert(block.includes('function startPlannerClientReminders'));
const rules=JSON.parse(fs.readFileSync(path.join(__dirname,'..','firebase-rules.json'),'utf8')).rules;
assert(rules.announcements.feed.$wireId['.validate'].includes("newData.child('kind').val() == 'event'"));
assert(rules.announcements.feed.$wireId['.validate'].includes('root.child(\'plannerEvents\')'));
assert(rules.announcements.feed.$wireId['.write'].includes('!data.exists()'));
const base=Date.parse('2026-10-22T09:45:00+08:00');
let now=base-1000;
class TestDate extends Date { constructor(...args){super(...(args.length?args:[now]))} static now(){return now} }
const journal={};let feedCommits=0, latestCommits=0, failLatest=false;
const fakeTransaction=async (ref,fn)=>{
  if (ref==='announcements/latest' && failLatest) {failLatest=false;throw Error('transient disconnect')}
  const before=journal[ref] ?? null;
  if (ref.startsWith('announcements/feed/') && before !== null) throw Error('permission_denied: create-only claim');
  const after=fn(before);
  if (after!==undefined) {
    journal[ref]=after;
    if (ref.startsWith('announcements/feed/')) feedCommits++;
    if (ref==='announcements/latest') latestCommits++;
  }
  return {committed:after!==undefined,snapshot:{val:()=>journal[ref]??null}};
};
function client(){
  const listeners={};let tick;
  const c=vm.createContext({console,Date:TestDate,Intl,Promise,Number,Object,Array,String,Set,
    currentDataTab:'quests',officialFactions:[],localStorage:{getItem:()=>null},
    document:{getElementById:()=>null,addEventListener:()=>{},hidden:false},
    window:{db:{},firebaseRef:(_,ref)=>ref,firebaseOnValue:(ref,cb)=>{listeners[ref]=cb},
      firebaseRunTransaction:fakeTransaction,
      firebaseGet:async ref=>({val:()=>journal[ref]??null}),addEventListener:()=>{}},
    setInterval:fn=>{tick=fn},showNotification:()=>{},showCustomPrompt:()=>{}});
  vm.runInContext(block,c);
  c.startNukaPlannerListener();c.startPlannerClientReminders();
  assert.equal(Object.keys(listeners).length,3);
  return {c,listeners,tick:()=>tick()};
}
const makeEvent=(title='Town Hall')=>({title,startMinute:600,endMinute:660,
  broadcast:true,createdAt:base-60000,updatedAt:base-60000});
function snapshot(value){return {val:()=>value}}
async function flush(){await new Promise(resolve=>setImmediate(resolve));}
(async()=>{
  const one=client(),two=client();
  const data={'2026-10-22':{
    first:makeEvent(), second:makeEvent('Contest'),
    no:{...makeEvent('Not broadcast'),broadcast:false},
    offGrid:{...makeEvent('Old event'),startMinute:630,endMinute:690},
    tooLate:{...makeEvent('Last minute'),createdAt:base+1,updatedAt:base+1}},
    '2026-10-25':{sunday:makeEvent('Sunday')}};
  for(const device of [one,two]) {
    device.listeners['plannerEvents'](snapshot(data));
    device.listeners['.info/serverTimeOffset'](snapshot(0));
  }
  assert.equal(feedCommits,0,'no internet connection means no broadcast');
  for(const device of [one,two]) device.listeners['.info/connected'](snapshot(true));
  await flush();assert.equal(feedCommits,0,'not due yet');
  now=base;failLatest=true;
  one.tick();two.tick();await flush();await flush();
  assert.equal(feedCommits,2,'two simultaneous events, one feed item each across devices');
  assert.equal(Object.keys(journal).filter(k=>k.startsWith('announcements/feed/')).length,2);
  assert(journal['announcements/feed/planner_2026-10-22_first'].text.includes('10:00 AWST'));
  // A second tick repairs latest if one client closed after feed write.
  one.tick();two.tick();await flush();await flush();
  assert(latestCommits>=1,'legacy latest eventually populated');
  assert.equal(feedCommits,2,'idempotent on later ticks');
  now=base+15*60000;
  const third=client();third.listeners['plannerEvents'](snapshot({'2026-10-22':{missed:makeEvent('Missed')}}));
  third.listeners['.info/serverTimeOffset'](snapshot(0));
  third.listeners['.info/connected'](snapshot(true));await flush();
  assert.equal(feedCommits,2,'after start, do not send a late reminder');
  const testDue=Date.parse('2026-10-14T09:45:00+08:00');
  now=testDue;
  const test=client();test.listeners['plannerEvents'](snapshot({'2026-10-14':{
    today:{title:'TEST ONLY',startMinute:600,endMinute:660,broadcast:true,
      createdAt:testDue-60000,updatedAt:testDue-60000}}}));
  test.listeners['.info/serverTimeOffset'](snapshot(0));
  test.listeners['.info/connected'](snapshot(true));await flush();
  assert.equal(feedCommits,3,'test day uses real Oct 14 Perth timestamp');
  assert(journal['announcements/feed/planner_2026-10-14_today'].text.includes('14/10/2226 10:00'));
  console.log('PASS: today test day and festival, client-only WIRE, network guard, 15-minute window, concurrent claims, recovery');
})().catch(error=>{console.error(error);process.exitCode=1});
