// v0.304 offline regression checks. Run: node tests/mail-photo-regression.js
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');
const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
function section(start,end) {
  const a=app.indexOf(start), b=app.indexOf(end,a+start.length);
  assert(a>=0 && b>a,`Missing ${start}`);return app.slice(a,b);
}
function context(v){return vm.createContext({console,Promise,Date,Set,...v});}
async function run(){
  // IndexedDB store has keyPath:'id': raw strings used to throw DataError.
  let written=[],clears=0;
  const fakeDB={transaction:()=>{
    const tx={objectStore:()=>({
      add:entry=>{assert.equal(typeof entry,'object');written.push(entry);
        const req={result:written.length};queueMicrotask(()=>req.onsuccess?.());return req;},
      clear:()=>{clears++;written=[];setImmediate(()=>tx.oncomplete?.());return {}}
    })};return tx;
  }};
  const cDB=context({window:{indexedDB:{}},indexedDB:{}});
  vm.runInContext(section('function photoDbEntry(entry)', '// Photo archive wrapper'),cDB);
  const db=vm.runInContext('PhotoDB',cDB);db.db=fakeDB;
  await db.add('data:image/jpeg;base64,legacy');
  assert.equal(written[0].pip,'data:image/jpeg;base64,legacy');
  await db.replaceAll([{id:13,pip:'new'},'data:image/jpeg;base64,old']);
  assert.equal(clears,1);assert.deepEqual(written.map(p=>p.pip),['new','data:image/jpeg;base64,old']);
  assert(!written.some(p=>Object.hasOwn(p,'id')));
  const savedOrder=[];const cPersist=context({photoArchive:['newest',{pip:'older'}],
    PhotoDB:{db:{},replaceAll:async entries=>{savedOrder.push(...entries)}},localStorage:{setItem:()=>{}}});
  vm.runInContext(section('async function savePhotoArchive()', '// ================= v0.43 DUAL-CAPTURE'),cPersist);
  assert.equal(await cPersist.savePhotoArchive(),true);
  assert.deepEqual(savedOrder.map(p=>typeof p==='string'?p:p.pip),['older','newest']);
  // Recover the old localStorage fallback without duplicating partial IDB copies.
  let dbRecords=[{id:1,pip:'B'},{id:2,pip:'C'}];
  const local={'pipboy-photos':JSON.stringify(['A',{pip:'B'}])};
  const cMig=context({PhotoDB:{init:async()=>true,getAll:async()=>dbRecords,
    replaceAll:async entries=>{dbRecords=entries.map(e=>typeof e==='string'?{pip:e}:e)}},
    localStorage:{getItem:k=>local[k]||null,removeItem:k=>delete local[k]},
    entryPip:e=>typeof e==='string'?e:e.pip});
  vm.runInContext(section('let photoArchive = [];', '// Save photo archive'),cMig);
  await cMig.initPhotoStorage();
  assert.deepEqual(Array.from(vm.runInContext('photoArchive',cMig),p=>p.pip),['A','B','C']);
  assert(!('pipboy-photos' in local));
  const letter={type:'msg',from:'sender',fromName:'SENDER',ts:100,payload:{photo:'data:image/jpeg;base64,ok',text:'PHOTO TRANSMISSION'}};
  // Incoming ACTION REQUIRED button must call save+log, not plain save.
  const prompts=[];const img={style:{},src:''};let invoked=[];
  const cOpen=context({inboxLetters:{k:letter},unverifiedLetters:{},document:{getElementById:()=>img},
    showCustomPrompt:(text,buttons)=>prompts.push({text,buttons}),
    saveAndLogMailPhoto:(...args)=>invoked.push(args)});
  vm.runInContext(section('function openMailItem(key, src)', '// v0.91: Accept a direct quest from mail'),cOpen);
  cOpen.openMailItem('k');
  const saveButton=prompts[0].buttons.find(b=>b.label==='SAVE PHOTO + LOG');
  assert(saveButton);saveButton.action();
  assert.equal(invoked.length,1);assert.equal(invoked[0][0],'k');
  // Use real save and log routines with a mocked successful local persistence.
  const photos=[],logs=[],processed=[],notifications=[],flags=[];
  let saveSucceeds=true;
  const c=context({photoArchive:photos,savePhotoArchive:()=>Promise.resolve(saveSucceeds),
    document:{getElementById:()=>null},showNotification:m=>notifications.push(m),
    mailProcessed:processed,mailLog:logs,safeUid:x=>x,makeMailThumb:(url,cb)=>cb('thumb'),
    pruneMailPhotos:()=>{},flagLetter:(...x)=>flags.push(x),
    markProcessed:key=>processed.push(key),saveComms:()=>{},mailTabActive:()=>false,
    renderMail:()=>{},setTimeout:()=>{}});
  vm.runInContext(section('function acceptMsg(key, l, successMessage', '// v0.48: photo auto-save'),c);
  vm.runInContext(section('async function saveMailPhoto(dataUrl', 'function renderMail()'),c);
  await c.saveAndLogMailPhoto('k',letter);
  assert.equal(photos.length,1);assert.equal(photos[0].pip,letter.payload.photo);
  assert.equal(logs.length,1);assert.equal(logs[0].uid,'sender');
  assert.equal(logs[0].photo,'thumb');assert.deepEqual(processed,['k']);
  assert.deepEqual(flags,[['k','claimed']]);
  assert(notifications.includes('PHOTO FILED TO DATABANK. TRANSMISSION LOGGED.'));
  await c.saveAndLogMailPhoto('k',letter);
  assert.equal(photos.length,1);assert.equal(logs.length,1); // no double-log
  // Storage failure must leave the letter actionable, not log it.
  saveSucceeds=false;
  await c.saveAndLogMailPhoto('failed',letter);
  assert.equal(photos.length,1);assert.equal(logs.length,1);
  assert(!processed.includes('failed'));
  // A photo from an ALREADY logged message is saved without logging twice.
  saveSucceeds=true;
  await c.saveMailPhoto('data:image/jpeg;base64,history');
  assert.equal(photos.length,2);assert.equal(logs.length,1);
  // Cold signals get a clear, actionable link-first prompt.
  const linkPrompts=[];const sent=[];
  const cLink=context({contactByUid:()=>null,lastKnownBeaconData:{u:{name:'SAM',timestamp:Date.now()}},outbox:[],
    showCustomPrompt:(text,buttons)=>linkPrompts.push({text,buttons}),
    sendDatacardToUid:uid=>sent.push(uid),showNotification:()=>{},
    isMutualLink:()=>false,photoArchive:[{pip:'pic'}],photoPickTarget:null,
    document:{getElementById:()=>{throw new Error('Unlinked must not open picker')}}});
  vm.runInContext(section('function promptPhotoLinkRequired(uid)', '// ================= VAULT-BOY GRAPHIC'),cLink);
  cLink.openPhotoPicker('u');
  assert.equal(cLink.photoPickTarget,null);
  assert(linkPrompts[0].text.includes('NEED TO LINK'));
  linkPrompts[0].buttons.find(b=>b.label==='SEND MY DATACARD').action();
  assert.deepEqual(sent,['u']);
  // A pending datacard gets a wait-for-acceptance prompt, not a duplicate send.
  vm.runInContext("outbox.push({type:'handshake',to:'u',status:'sent'})",cLink);
  cLink.promptPhotoLinkRequired('u');
  assert(linkPrompts[1].text.includes('ACCEPT YOUR PENDING DATACARD'));
  assert(!linkPrompts[1].buttons.some(b=>b.label==='SEND MY DATACARD'));
  // Even if a picker was opened earlier, the final send cannot queue an unlinked photo.
  let compressed=0,queued=0;
  const cSend=context({isMutualLink:()=>false,promptPhotoLinkRequired:uid=>sent.push(uid),
    compressMailPhoto:()=>{compressed++},queueMail:()=>{queued++}});
  vm.runInContext(section('function sendPhotoMail(c, entry)', '// --- LINK REQUESTS panel'),cSend);
  cSend.sendPhotoMail({uid:'u',name:'SAM'},{pip:'pic'});
  assert.equal(compressed,0);assert.equal(queued,0);assert.equal(sent.length,2);
  // Viewer recipient picker must visibly prompt when an unlinked beacon is selected.
  const picker=[];let viewerClosed=0;
  const cViewer=context({viewerPhotoIdx:0,photoArchive:[{pip:'pic'}],rolodex:[],
    myMailUid:'self',lastKnownBeaconData:{u:{name:'SAM',timestamp:Date.now()}},
    showCustomPrompt:(text,buttons)=>picker.push({text,buttons}),
    promptPhotoLinkRequired:uid=>sent.push(uid),closePhotoViewer:()=>viewerClosed++});
  vm.runInContext(section('function sendViewerPhoto()', 'function deleteViewerPhoto()'),cViewer);
  cViewer.sendViewerPhoto();
  picker[0].buttons.find(b=>b.label.includes('(UNLINKED)')).action();
  assert.equal(sent.at(-1),'u');assert.equal(viewerClosed,0);
  // Composer photo attachment also shows a top-layer prompt rather than a hidden toast.
  const cAttach=context({cmAttach:{photo:null},composeTargetInfo:()=>({uid:'u'}),contactUidTarget:'u',
    isMutualLink:()=>false,promptPhotoLinkRequired:uid=>sent.push(uid)});
  vm.runInContext(section('function attachComposerPhoto()', 'function attachComposerItem()'),cAttach);
  cAttach.attachComposerPhoto();assert.equal(sent.at(-1),'u');
  let composerClosed=0, composerQueued=0;
  const cTransmit=context({document:{getElementById:()=>({value:''})},
    cmAttach:{photo:'pic',itemId:null},contactUidTarget:'u',
    composeTargetInfo:()=>({uid:'u'}),isMutualLink:()=>false,
    promptPhotoLinkRequired:uid=>sent.push(uid),closeModals:()=>composerClosed++,queueMail:()=>composerQueued++});
  vm.runInContext(section('function transmitMsg()', 'function openItemComposer(c)'),cTransmit);
  cTransmit.transmitMsg();
  assert.equal(sent.at(-1),'u');assert.equal(composerClosed,0);assert.equal(composerQueued,0);
  console.log('PASS: incoming SAVE PHOTO logs message; failure preserves letter; unlinked photo sends prompt and never queue');
}
run().catch(e=>{console.error(e);process.exitCode=1});
