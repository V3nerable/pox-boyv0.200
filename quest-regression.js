// v0.302 focused offline regression checks. Run: node tests/quest-regression.js
// No Firebase connection or real user data is used.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');
const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const rules = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'firebase-rules.json'), 'utf8')).rules;
function section(start, end) {
  const a = app.indexOf(start), b = app.indexOf(end, a + start.length);
  assert(a >= 0 && b > a, `Missing section: ${start}`);
  return app.slice(a, b);
}
function context(values) { const c = vm.createContext({console, Date, Promise, ...values}); return c; }
async function run() {
  assert(!html.includes('quest-tab-verified'));
  for (const id of ['compose-quest-modal','add-quest-modal','quest-action-modal']) assert(!html.includes(`id="${id}"`));
  assert(rules.mail.$uid.$mailKey.type['.validate'].includes("quest-rejected"));
  assert(!rules.mail.$uid.$mailKey.type['.validate'].includes("newData.val() == 'quest'"));
  assert(!rules.quests.$questId.type['.validate'].includes("newData.val() == 'direct'"));
  assert.equal(rules.globalContracts.$contractId['.write'], '!newData.exists()');
  assert.equal(rules.bounties.$bountyId['.write'], '!newData.exists()');
  assert(!app.includes("localStorage.setItem('pipboy-quests'"));
  assert(app.includes("localStorage.removeItem('pipboy-quests')"));
  assert(app.includes("if (l.type === 'quest') { retireLetter(key); continue; }"));
  assert(app.includes("if (hideLockedEl) window.pendingMultiStageQuest.hideLockedStages = hideLockedEl.checked;"));
  assert(!app.includes('edit-stage-${idx}-status'));
  // AVAILABLE shows only public multi-stage quests.
  const available = {innerHTML:''};
  const c1 = context({document:{getElementById:()=>available},localStorage:{getItem:()=> 'me'},
    firebaseQuests:{public:{type:'multi-stage',title:'Public',status:'open',issuerName:'Issuer'},
      direct:{type:'multi-stage',title:'Secret',status:'open',assignedTo:'me'},
      old:{type:'global',title:'Old',status:'open'}},escapeHtml:x=>x});
  vm.runInContext(section('function renderAvailableQuests()', 'function renderIssuedQuests()'), c1);
  c1.renderAvailableQuests();
  assert(available.innerHTML.includes('Public') && !available.innerHTML.includes('Secret') && !available.innerHTML.includes('Old'));
  // Mail completion must resolve sender UID, never another identical display name.
  const q={issuerUid:'issuer',progress:{u1:{status:'completed',completedByName:'SAM'},u2:{status:'completed',completedByName:'SAM'}}};
  const c2=context({firebaseQuests:{q},myMailUid:'issuer',localStorage:{getItem:()=>null}});
  vm.runInContext(section('function resolveQuestMailCompletion(l)', 'function verifyQuestFromMail(key, l)'),c2);
  assert.equal(c2.resolveQuestMailCompletion({from:'u2',payload:{questId:'q',completedByName:'SAM'}}).uid,'u2');
  assert.equal(c2.resolveQuestMailCompletion({from:'u1',payload:{questId:'q',completedByUid:'u2'}}).uid,'u2');
  assert.equal(c2.resolveQuestMailCompletion({from:'unknown',payload:{questId:'q',completedByName:'SAM'}}),null);
  // Issuer rejection reopens final stage only, preserves earlier progress and queues a notice.
  const writes=[],mails=[],messages=[];
  const c3=context({firebaseQuests:{q:{issuerUid:'issuer',type:'multi-stage',title:'Test',progress:{player:{status:'completed'}},stages:[{id:'stage1'},{id:'stage2'}]}},myMailUid:'issuer',
    localStorage:{getItem:()=>null},window:{db:{},firebaseRef:(_,p)=>p,firebaseUpdate:(ref,update)=>{writes.push({ref,update});return Promise.resolve()}},
    queueMail:(...args)=>mails.push(args),showNotification:m=>messages.push(m),renderIssuedQuests:()=>{},userProfile:{name:'ISSUER'}});
  vm.runInContext(section('function rejectQuestCompletion(id, uid, onSuccess)', 'function rejectQuest(id, uid)'),c3);
  let done=false;c3.rejectQuestCompletion('q','player',()=>done=true);
  await new Promise(r=>setImmediate(r));
  assert(done && writes.length===1 && mails.length===1);
  assert.equal(writes[0].ref,'quests/q/progress/player');
  assert.equal(writes[0].update.status,'accepted');
  assert.equal(writes[0].update['stages/stage2/status'],'available');
  assert(!('stages/stage1/status' in writes[0].update));
  assert.equal(mails[0][1],'quest-rejected');
  // Historical 'rejected' progress can be repaired by its player without redoing earlier stages.
  const retryWrites=[];
  const cOld=context({firebaseQuests:{q:{type:'multi-stage',status:'open',stages:[{id:'stage1'},{id:'stage2'}],
    progress:{player:{status:'rejected'}}}},myMailUid:'player',window:{db:{},firebaseRef:(_,p)=>p,
    firebaseUpdate:(ref,updates)=>{retryWrites.push({ref,updates});return Promise.resolve()}},
    showNotification:()=>{},switchQuestTab:()=>{}});
  vm.runInContext(section('function resumeRejectedMultiStageQuest(id)', '// v0.169: Abandon multi-stage quest'),cOld);
  cOld.resumeRejectedMultiStageQuest('q');await new Promise(r=>setImmediate(r));
  assert.equal(retryWrites[0].updates.status,'accepted');
  assert.equal(retryWrites[0].updates['stages/stage2/status'],'available');
  assert(!('stages/stage1/status' in retryWrites[0].updates));
  // Overseer MAIL/ISSUED evidence opens the submitted photo in a read-only viewer.
  const evModal={style:{display:'none'}}, evImg={style:{},src:'',removeAttribute:()=>{evImg.src=''}};
  const evError={style:{}};const evPrompts=[];const evNotes=[];
  const cEv=context({document:{getElementById:id=>({'evidence-viewer-modal':evModal,
    'evidence-viewer-img':evImg,'evidence-viewer-error':evError})[id]},
    showCustomPrompt:(text,buttons)=>evPrompts.push({text,buttons}),
    showNotification:msg=>evNotes.push(msg),escapeHtml:s=>s});
  vm.runInContext(section('// v0.302: Evidence belongs', '// v0.300: Reopen the final stage'),cEv);
  assert(html.includes('id="evidence-viewer-modal"'));
  cEv.viewMultiStageEvidence({stages:[{id:'s1',title:'First'},{id:'s2',title:'Second'}]},
    {stages:{s1:{evidencePhoto:'data:image/jpeg;base64,first'},s2:{evidencePhoto:'data:image/jpeg;base64,second'}}});
  evPrompts[0].buttons.find(b=>b.label==='VIEW PHOTO').action();
  assert.equal(evModal.style.display,'flex');assert.equal(evImg.src,'data:image/jpeg;base64,first');
  cEv.closeEvidencePhoto();
  assert.equal(evModal.style.display,'none');assert.equal(evImg.src,'');
  assert.equal(evPrompts.length,2);assert(evPrompts[1].text.includes('First'));
  evPrompts[1].buttons.find(b=>b.label.includes('NEXT PHOTO')).action();
  evPrompts[2].buttons.find(b=>b.label==='VIEW PHOTO').action();
  assert.equal(evImg.src,'data:image/jpeg;base64,second');
  cEv.closeEvidencePhoto();assert(evPrompts[3].text.includes('Second'));
  assert.equal(evNotes.length,0);
  // Dismiss in verification request must only mark read; only explicit DELETE retires.
  const mailBlock=section("} else if (l.type === 'verify-request')", "} else if (l.type === 'item')");
  const dismissActions=[...mailBlock.matchAll(/label: 'DISMISS', action: \(\) => \{([\s\S]*?)\}\}/g)];
  assert(dismissActions.length===2);
  dismissActions.forEach(m=>{assert(m[1].includes('markRead(key)'));assert(!m[1].includes('retireLetter(key)'));assert(!m[1].includes('markProcessed(key)'))});
  assert(app.includes("Math.max(0, ...window.pendingMultiStageQuest.stages.map"));
  assert(app.includes("updates.stages = stages.map((stage, idx) =>"));
  assert(app.includes("STAGE TIME LIMIT PASSED — ISSUER DECIDES"));
  assert(app.includes("QUEST TIME LIMIT PASSED"));
  assert(app.includes("function confirmLegacyQuestPurge()"));
  // Direct accept rejects the wrong recipient and initializes only the intended player.
  const acceptWrites=[],acceptNotes=[];
  const c4=context({myMailUid:'other',firebaseQuests:{q:{type:'multi-stage',status:'open',assignedTo:'recipient',stages:[{id:'stage1'}]}},
    window:{db:{},firebaseRef:(_,p)=>p,firebaseSet:(ref,data)=>{acceptWrites.push({ref,data});return Promise.resolve()}},
    showNotification:m=>acceptNotes.push(m),playSound:()=>{},closeCustomPrompt:()=>{},userProfile:{name:'OTHER'}});
  vm.runInContext(section('function acceptMultiStageQuest(id)', '// v0.160: Submit photo evidence'),c4);
  c4.acceptMultiStageQuest('q');assert.equal(acceptWrites.length,0);
  c4.myMailUid='recipient';c4.acceptMultiStageQuest('q');
  await new Promise(r=>setImmediate(r));
  assert.equal(acceptWrites[0].ref,'quests/q/progress/recipient');
  assert.equal(acceptWrites[0].data.stages.stage1.status,'available');
  // Editing uses an ordered stage ARRAY and never writes unsupported 'completed' template status.
  const editWrites=[];
  const editFields={
    'edit-quest-title':'New Title','edit-quest-desc':'Desc','edit-quest-reward':'',
    'edit-stage-0-title':'First','edit-stage-0-desc':'D1','edit-stage-0-reward':'',
    'edit-stage-1-title':'Second','edit-stage-1-desc':'D2','edit-stage-1-reward':''};
  const c5=context({document:{getElementById:id=>editFields[id]===undefined?null:{value:editFields[id]}},
    window:{db:{},firebaseRef:(_,p)=>p,firebaseUpdate:(ref,updates)=>{editWrites.push({ref,updates});return Promise.resolve()}},
    closeModals:()=>{},showNotification:()=>{},renderIssuedQuests:()=>{},setTimeout:()=>{}});
  vm.runInContext("let editingQuestId='q', editingQuestData={type:'multi-stage',title:'Old',stages:[{id:'stage1',type:'photo',status:'available'},{id:'stage3',type:'bounty',status:'locked'}]};\n"+
    section('function saveQuestEditsFromModal()', 'function verifyQuest(id, uid)'),c5);
  c5.saveQuestEditsFromModal();await new Promise(r=>setImmediate(r));
  assert.equal(editWrites[0].ref,'quests/q');assert(Array.isArray(editWrites[0].updates.stages));
  assert.deepEqual(Array.from(editWrites[0].updates.stages,s=>s.id),['stage1','stage3']);
  assert.deepEqual(Array.from(editWrites[0].updates.stages,s=>s.status),['available','locked']);
  // Removing stage2 then adding a stage must not reuse stage3's ID.
  const c6=context({window:{pendingMultiStageQuest:{stages:[{id:'stage1'},{id:'stage3'}]}},
    saveQuestLevelFields:()=>{},editStageDetails:()=>{}});
  vm.runInContext(section('function addStageOfType(type)', 'function editStageDetails(idx)'),c6);
  c6.addStageOfType('photo');
  assert.equal(c6.window.pendingMultiStageQuest.stages[2].id,'stage4');
  // Stage SAVE must return to the management form; failures must explain why
  // inside the current modal, not open the lower-z-index notification overlay.
  const stageFields={
    'stage-management-section':{innerHTML:'',style:{}},
    'stages-list':{innerHTML:''},
    'cq-modal-title':{innerText:''},
    'stage-edit-error':{innerText:'',style:{},scrollIntoView:()=>{}},
    'edit-stage-title':{value:''},
    'edit-stage-desc':{value:'Take a photo'},
    'edit-stage-reward':{value:''},
    'edit-stage-timelimit':{value:''}
  };
  let hiddenNotes=0;
  const cStage=context({window:{pendingMultiStageQuest:{title:'Quest',description:'',stages:[{id:'stage1',type:'photo',title:''}]}},
    document:{getElementById:id=>id==='create-quest-modal'?{querySelector:()=>({})}:stageFields[id]||null},
    escapeHtml:s=>s,showNotification:()=>hiddenNotes++});
  vm.runInContext(section('function showStageManagementUI()', '// v0.160: Pick bounty target'),cStage);
  cStage.editStageDetails(0);
  assert(stageFields['stage-management-section'].innerHTML.includes('stage-edit-error'));
  cStage.saveStageEdit(0);
  assert(stageFields['stage-edit-error'].innerText.includes('TITLE REQUIRED'));
  assert.equal(hiddenNotes,0);
  assert.equal(cStage.window.pendingMultiStageQuest.stages[0].title,'');
  stageFields['edit-stage-title'].value='Find cache';
  stageFields['edit-stage-timelimit'].value='abc';
  cStage.saveStageEdit(0);
  assert(stageFields['stage-edit-error'].innerText.includes('POSITIVE'));
  assert.equal(cStage.window.pendingMultiStageQuest.stages[0].title,'');
  stageFields['edit-stage-timelimit'].value='30';
  cStage.saveStageEdit(0);
  assert.equal(cStage.window.pendingMultiStageQuest.stages[0].title,'Find cache');
  assert.equal(cStage.window.pendingMultiStageQuest.stages[0].timeLimit,30);
  assert(stageFields['stage-management-section'].innerHTML.includes('CREATE QUEST'));
  assert(stageFields['stages-list'].innerHTML.includes('Find cache'));
  assert(stageFields['stages-list'].innerHTML.includes('EDIT STAGE'));
  assert.equal(hiddenNotes,0);
  // Creating a direct quest preserves stage IDs and current hide-locked choice.
  const created=[],sent=[];
  const fields={'ms-quest-title':{value:'Direct test'},'ms-quest-desc':{value:'Do it'},
    'ms-quest-timelimit':{value:'30'},'ms-hide-locked':{checked:true},
    'ms-error':{style:{},innerText:''}};
  const c7=context({myMailUid:'issuer',userProfile:{name:'ISSUER'},window:{db:{},
    pendingDirectQuestRecipient:'recipient',pendingDirectQuestRecipientName:'SAM',
    pendingMultiStageQuest:{stages:[{id:'stage1',type:'photo',title:'A'},{id:'stage3',type:'bounty',title:'B'}],hideLockedStages:false},
    firebaseRef:(_,p)=>p,firebasePush:(ref,data)=>{created.push({ref,data});return Promise.resolve({key:'quest-key'})}},
    document:{getElementById:id=>fields[id]||null},queueMail:(...args)=>sent.push(args),showNotification:()=>{},closeModals:()=>{},switchQuestTab:()=>{}});
  vm.runInContext(section('function submitMultiStageQuest()', 'function openQuestModal(id)'),c7);
  c7.submitMultiStageQuest();await new Promise(r=>setImmediate(r));
  assert.equal(created.length,1);assert.equal(created[0].data.assignedTo,'recipient');
  assert.equal(created[0].data.hideLockedStages,true);assert.equal(created[0].data.timeLimit,30);
  assert.deepEqual(Array.from(created[0].data.stages,s=>s.id),['stage1','stage3']);
  assert.equal(sent[0][1],'quest-offer');
  // Purge is not automatic and only removes old quest types / retired nodes after two decisions.
  const purgeCalls=[],prompts=[];
  const records={quests:{new:{type:'multi-stage'},old:{type:'direct'}},globalContracts:{gc:{}},bounties:{b:{}}};
  const c8=context({localStorage:{getItem:()=> 'true'},window:{db:{},firebaseRef:(_,p)=>p,
    firebaseGet:p=>Promise.resolve({val:()=>records[p]}),firebaseRemove:p=>{purgeCalls.push(p);return Promise.resolve()}},
    showNotification:()=>{},showCustomPrompt:(text,buttons)=>prompts.push({text,buttons})});
  vm.runInContext(section('function confirmLegacyQuestPurge()', '// v0.63: overseer user management'),c8);
  assert.equal(purgeCalls.length,0);c8.confirmLegacyQuestPurge();await new Promise(r=>setImmediate(r));
  assert.equal(prompts.length,1);assert.equal(purgeCalls.length,0);
  prompts[0].buttons[0].action();assert.equal(prompts.length,2);assert.equal(purgeCalls.length,0);
  prompts[1].buttons[0].action();await new Promise(r=>setImmediate(r));
  assert.deepEqual(purgeCalls.sort(),['bounties/b','globalContracts/gc','quests/old']);
  console.log('PASS: evidence photo viewer, stage SAVE validation/return, quest creation, direct acceptance/visibility, stage IDs/editing, UID matching, reject retry, DISMISS, advisory timers, deliberate legacy purge');
}
run().catch(err=>{console.error(err);process.exitCode=1});
