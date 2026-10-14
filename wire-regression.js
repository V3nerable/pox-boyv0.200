// v0.306 WIRE stack regression: no closed-app push, multiple messages, dedup, dismiss.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const start=app.indexOf('// ==================== OVERSEER WIRE (v0.306)');
const end=app.indexOf('// ==================== RADIO SYNC ENGINE',start);
assert(start>=0 && end>start);
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const rules=JSON.parse(fs.readFileSync(path.join(__dirname,'..','firebase-rules.json'),'utf8')).rules;
assert(html.includes('id="wire-stack"'));
assert(rules.announcements.feed['.indexOn'].includes('ts'));
const store={};const listeners={};const writes=[];const notices=[];const sounds=[];
function el(){return {style:{},children:[],textContent:'',value:'',
  append(...items){this.children.push(...items)},appendChild(child){this.children.push(child)},
  replaceChildren(...items){this.children=items},setAttribute(){}};}
const elems={'wire-stack':el(),'options-wire-btn':el(),'wire-text':el()};
const now=Date.now();
const c=vm.createContext({Date,console,Object,Array,Set,String,
  localStorage:{getItem:key=>store[key]||null,setItem:(key,value)=>{store[key]=value}},
  document:{getElementById:id=>elems[id]||null,createElement:()=>el()},
  window:{db:{},firebaseRef:(_,key)=>key,firebaseOrderByChild:key=>key,
    firebaseLimitToLast:n=>n,firebaseQuery:(ref,...x)=>ref,
    firebaseOnValue:(p,fn)=>{listeners[p]=fn},
    firebasePush:()=>({key:'-push1'}),firebaseUpdate:(p,data)=>{writes.push(data);return Promise.resolve()}},
  showNotification:msg=>notices.push(msg),playSound:key=>sounds.push(key),
  pushNativeNotification:msg=>notices.push('native:'+msg),
  showCustomPrompt:(text,buttons)=>{c.prompt={text,buttons}},userProfile:{name:'OVERSEER'}});
vm.runInContext(app.slice(start,end),c);
c.startWireListener();
const wire=(id,text)=>({id,text,from:'OVERSEER',ts:now,kind:'manual'});
listeners['announcements/feed']({val:()=>({a:wire('a','ONE')})});
listeners['announcements/latest']({val:()=>wire('a','ONE')});
assert.equal(elems['wire-stack'].children.length,1);
assert.equal(notices.length,0);
listeners['announcements/feed']({val:()=>({a:wire('a','ONE'),b:wire('b','TWO')})});
assert.equal(elems['wire-stack'].children.length,2);
assert.equal(notices.filter(n=>n.startsWith('OVERSEER WIRE')).length,1);
listeners['announcements/latest']({val:()=>wire('b','TWO')});
assert.equal(notices.filter(n=>n.startsWith('OVERSEER WIRE')).length,1);
c.dismissWire('b');
assert.equal(elems['wire-stack'].children.length,1);
assert.equal(JSON.parse(store['pipboy-wire-dismissed-ids'])[0],'b');
elems['wire-text'].value='TEST';c.sendWire();
c.prompt.buttons[0].action();
assert.equal(writes[0]['announcements/feed/-push1'].text,'TEST');
assert.equal(writes[0]['announcements/latest'].id,'-push1');
assert.equal(writes[0]['announcements/feed/-push1'].id,writes[0]['announcements/latest'].id);
console.log('PASS: stacked announcements, initial snapshot quiet, dedup, independent dismissal, atomic manual dual write');
