/* Mes Animes — liste perso + amis.
   Comptes et listes : Firebase (connexion Google, base Firestore). Infos, saisons et dispos en France : TMDB (données de dispo JustWatch). */
const CONFIG = window.CONFIG || {};

/* ---------- small helpers ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LS = {
  get(k,d){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch(e){ return d; } },
  set(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); return true; }catch(e){ return false; } }
};
const DAY = 864e5;
const today = () => new Date().toISOString().slice(0,10);
const ICON = {
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>',
  close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
  back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
  star:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg>',
  chat:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/></svg>',
  lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>',
  heart:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-4.6-10-9.3C.4 8.4 2.3 4.5 6 4.1c2.2-.2 3.9 1 6 3.2 2.1-2.2 3.8-3.4 6-3.2 3.7.4 5.6 4.3 4 7.6C19.5 16.4 12 21 12 21z"/></svg>'
};
const plural = (n, one, many) => `${n} ${n>1?many:one}`;

/* ---------- vocabulary ---------- */
const STATUS = {watching:'En cours', plan:'À regarder', done:'Vu', dropped:'Abandonné'};
const TV_STATUS = {'Returning Series':'En diffusion', 'Ended':'Terminé', 'Canceled':'Annulé', 'In Production':'En production', 'Planned':'Annoncé', 'Pilot':'Pilote'};
// streaming services as JustWatch names them in France
const SERVICES = [
  {key:'crunchyroll', name:'Crunchyroll', re:/crunchyroll/i, color:'#F47521', search:q=>`https://www.crunchyroll.com/fr/search?q=${encodeURIComponent(q)}`},
  {key:'netflix', name:'Netflix', re:/netflix/i, color:'#E50914', search:q=>`https://www.netflix.com/search?q=${encodeURIComponent(q)}`},
  {key:'adn', name:'ADN', re:/^adn$|anime digital network|animation digital network/i, color:'#0A8FD6', search:null},
  {key:'prime', name:'Prime Video', re:/amazon prime video|^prime video/i, color:'#1A98FF', search:q=>`https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encodeURIComponent(q)}`},
  {key:'disney', name:'Disney+', re:/disney/i, color:'#113CCF', search:null},
];
const svcOf = name => SERVICES.find(s => s.re.test(name||''));
const AVC = ['#D3245F','#14806F','#3B6FD9','#B8501B','#7A4CC2','#2E8B57','#C2417A','#3E7C99'];
const avColor = s => AVC[[...String(s)].reduce((a,c)=>a+c.charCodeAt(0),0) % AVC.length];
const PCOLORS = ['#D3245F','#E8590C','#C99A06','#2E8B57','#14806F','#1C7ED6','#5F3DC4','#AE3EC9','#495057'];
const okImg = s => typeof s==='string' && /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(s);
const avatar = (p, big, color, photo) => `<span class="av${big?' big':''}${okImg(photo)?' ph':''}" style="--avc:${esc(color||avColor(p))}" aria-hidden="true">${okImg(photo) ? `<img src="${photo}" alt="">` : esc(String(p||'?').slice(0,1).toUpperCase())}</span>`;
// pictures chosen from the phone or computer: cropped and compressed here, then stored with the profile (no paid file storage needed)
async function shrinkImage(file, w, h, maxChars, round){
  if (!file || !/^image\//.test(file.type)) throw new Error('Choisis une image (JPG, PNG, WebP…).');
  const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error('Cette image ne s’ouvre pas, essaie une autre (JPG, PNG ou WebP).')); i.src = URL.createObjectURL(file); });
  const rect = await cropUI(img, w/h, round);           // the person picks the visible part
  if (!rect) return null;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
  g.drawImage(img, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, w, h);
  URL.revokeObjectURL(img.src);
  const webp = c.toDataURL('image/webp', .8).startsWith('data:image/webp');
  for (const q of [.82, .7, .58, .46, .34]){
    const url = c.toDataURL(webp ? 'image/webp' : 'image/jpeg', q);
    if (url.length <= maxChars) return url;
  }
  throw new Error('Image trop lourde, essaie une autre.');
}
// crop window: drag to move, slider / wheel / two fingers to zoom; returns the chosen part in image pixels
function cropUI(img, aspect, round){
  return new Promise(done => {
    const nw = img.naturalWidth, nh = img.naturalHeight;
    const wrap = document.createElement('div'); wrap.className = 'crop-scrim';
    wrap.innerHTML = `<div class="crop-box" role="dialog" aria-modal="true" aria-labelledby="cropT">
      <h2 id="cropT">Choisis la partie à afficher</h2>
      <p class="note">Fais glisser l’image pour la placer, et zoome avec le curseur${matchMedia('(pointer:coarse)').matches?' ou avec deux doigts':' ou la molette'}.</p>
      <div class="crop-frame${round?' round':''}" style="aspect-ratio:${aspect}" tabindex="0" aria-label="Zone visible : flèches pour déplacer, plus et moins pour zoomer"><img alt="" draggable="false"></div>
      <label class="crop-zoom"><span>Zoom</span><input type="range" min="1" max="5" step="0.01" value="1" aria-label="Zoom"></label>
      <div class="links"><button class="btn" type="button" data-crop="cancel">Annuler</button><button class="btn primary" type="button" data-crop="ok">${ICON.check} Valider</button></div></div>`;
    document.body.appendChild(wrap);
    const frame = wrap.querySelector('.crop-frame'), pic = frame.querySelector('img'), range = wrap.querySelector('input');
    pic.src = img.src; pic.style.width = nw+'px'; pic.style.height = nh+'px';
    let fw = frame.clientWidth, fh = frame.clientHeight, base = Math.max(fw/nw, fh/nh), z = 1, x = 0, y = 0;
    const sc = () => base*z;
    function clamp(){ const s = sc(); x = Math.min(0, Math.max(fw - nw*s, x)); y = Math.min(0, Math.max(fh - nh*s, y)); }
    function draw(){ clamp(); pic.style.transform = `translate(${x}px,${y}px) scale(${sc()})`; }
    function zoomTo(nz, cx = fw/2, cy = fh/2){ nz = Math.max(1, Math.min(5, nz)); const s0 = sc(); z = nz; const s1 = sc(); x = cx - (cx - x)*s1/s0; y = cy - (cy - y)*s1/s0; range.value = z; draw(); }
    x = (fw - nw*base)/2; y = (fh - nh*base)/2; draw();
    const pts = new Map(); let last = null;
    frame.addEventListener('pointerdown', e => { frame.setPointerCapture(e.pointerId); pts.set(e.pointerId, {x:e.clientX, y:e.clientY}); last = null; });
    frame.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return;
      const prev = pts.get(e.pointerId); pts.set(e.pointerId, {x:e.clientX, y:e.clientY});
      if (pts.size===1){ x += e.clientX - prev.x; y += e.clientY - prev.y; draw(); }
      else if (pts.size===2){
        const [a, b] = [...pts.values()], d = Math.hypot(a.x-b.x, a.y-b.y), r = frame.getBoundingClientRect();
        if (last) zoomTo(z * d/last, (a.x+b.x)/2 - r.left, (a.y+b.y)/2 - r.top);
        last = d;
      }
    });
    const up = e => { pts.delete(e.pointerId); last = null; };
    frame.addEventListener('pointerup', up); frame.addEventListener('pointercancel', up);
    frame.addEventListener('wheel', e => { e.preventDefault(); const r = frame.getBoundingClientRect(); zoomTo(z * Math.exp(-e.deltaY*0.0015), e.clientX - r.left, e.clientY - r.top); }, {passive:false});
    range.addEventListener('input', () => zoomTo(+range.value));
    frame.addEventListener('keydown', e => {
      const k = {ArrowLeft:[20,0], ArrowRight:[-20,0], ArrowUp:[0,20], ArrowDown:[0,-20]}[e.key];
      if (k){ e.preventDefault(); x += k[0]; y += k[1]; draw(); }
      if (e.key==='+' || e.key==='='){ e.preventDefault(); zoomTo(z*1.1); }
      if (e.key==='-'){ e.preventDefault(); zoomTo(z/1.1); }
    });
    const onResize = () => { const ofw = fw; fw = frame.clientWidth; fh = frame.clientHeight; const k = fw/ofw; base = Math.max(fw/nw, fh/nh); x *= k; y *= k; draw(); };
    window.addEventListener('resize', onResize);
    function finish(ok){
      window.removeEventListener('resize', onResize); document.removeEventListener('keydown', esc, true); wrap.remove();
      if (!ok) return done(null);
      const s = sc(); done({sx:-x/s, sy:-y/s, sw:fw/s, sh:fh/s});
    }
    const esc = e => { if (e.key==='Escape'){ e.stopPropagation(); finish(false); } };
    document.addEventListener('keydown', esc, true);
    wrap.addEventListener('click', e => { const b = e.target.closest('[data-crop]'); if (b) finish(b.dataset.crop==='ok'); else if (e.target===wrap) finish(false); });
    frame.focus();
  });
}
/* ---------- TMDB ---------- */
const T = 'https://api.themoviedb.org/3';
const IMG = (p, size='w342') => p ? `https://image.tmdb.org/t/p/${size}${p}` : '';
class ApiError extends Error {}
async function tmdb(path, params={}){
  const u = new URL(T+path);
  u.searchParams.set('api_key', CONFIG.tmdbKey); u.searchParams.set('language', 'fr-FR');
  for (const [k,v] of Object.entries(params)) if (v!=null && v!=='') u.searchParams.set(k, v);
  let r;
  try{ r = await fetch(u); }
  catch(e){ throw new ApiError(navigator.onLine===false ? 'Pas de connexion : ça reviendra avec le réseau.' : 'TMDB ne répond pas, réessaie dans un instant.'); }
  if (r.status===401) throw new ApiError('Clé TMDB refusée : vérifie la clé dans config.js.');
  if (r.status===429) throw new ApiError('Trop de recherches d’un coup : attends quelques secondes.');
  if (r.status===404) throw new ApiError('Cet anime n’existe plus sur TMDB.');
  if (!r.ok) throw new ApiError('TMDB a renvoyé une erreur, réessaie dans un instant.');
  return r.json();
}
function providersOf(w){
  const fr = w && w.results && w.results.FR; if (!fr) return {link:null, flat:[], buy:[]};
  const uniq = arr => { const seen = new Set(); return arr.filter(p => !seen.has(p.provider_id) && seen.add(p.provider_id)).map(p => ({id:p.provider_id, name:p.provider_name, logo:p.logo_path})); };
  const flat = uniq([...(fr.flatrate||[]), ...(fr.free||[]), ...(fr.ads||[])]);
  const ids = new Set(flat.map(p=>p.id));
  return {link:fr.link||null, flat, buy:uniq([...(fr.rent||[]), ...(fr.buy||[])]).filter(p => !ids.has(p.id))};
}
const pvKeys = pv => [...new Set((pv.flat||[]).map(p => svcOf(p.name)).filter(Boolean).map(s => s.key))];
function normTv(x){
  const seasons = (x.seasons||[]).map(s => ({n:s.season_number, eps:s.episode_count||0, name:s.name, air:s.air_date, poster:s.poster_path}));
  const reg = seasons.filter(s => s.n>0).sort((a,b)=>a.n-b.n);
  const nx = x.next_episode_to_air;
  return {key:'tv-'+x.id, kind:'tv', id:x.id, t:x.name, ot:x.original_name, poster:x.poster_path, back:x.backdrop_path,
    yr:(x.first_air_date||'').slice(0,4), ov:x.overview||'', genres:(x.genres||[]).map(g=>g.name), status:x.status,
    seasons:reg, specials:seasons.find(s=>s.n===0)||null, total:reg.reduce((a,s)=>a+s.eps,0),
    runtime:(x.episode_run_time||[])[0] || (x.last_episode_to_air&&x.last_episode_to_air.runtime) || 24,
    next: nx ? {s:nx.season_number, e:nx.episode_number, air:nx.air_date} : null,
    studio:((x.production_companies||[])[0]||{}).name, vote:x.vote_average, pv:providersOf(x['watch/providers']),
    lang:x.original_language, at:Date.now()};
}
function normMovie(x){
  return {key:'movie-'+x.id, kind:'movie', id:x.id, t:x.title, ot:x.original_title, poster:x.poster_path, back:x.backdrop_path,
    yr:(x.release_date||'').slice(0,4), rel:x.release_date, ov:x.overview||'', genres:(x.genres||[]).map(g=>g.name), runtime:x.runtime,
    coll:x.belongs_to_collection ? {id:x.belongs_to_collection.id, name:x.belongs_to_collection.name} : null,
    studio:((x.production_companies||[])[0]||{}).name, vote:x.vote_average, pv:providersOf(x['watch/providers']), lang:x.original_language, at:Date.now()};
}
// search / discover rows
function normHit(x, kind){
  kind = kind || x.media_type;
  return {key:`${kind}-${x.id}`, kind, id:x.id, t:kind==='tv'?x.name:x.title, ot:kind==='tv'?x.original_name:x.original_title, poster:x.poster_path,
    yr:((kind==='tv'?x.first_air_date:x.release_date)||'').slice(0,4),
    anime:(x.genre_ids||[]).includes(16) && (x.original_language==='ja' || (x.origin_country||[]).includes('JP')), pop:x.popularity||0};
}
// show details, kept on this device for a while (airing shows refresh twice a day)
let dcache = LS.get('animes-tmdb', {});
const hits = new Map();
function saveDcache(){
  const keys = Object.keys(dcache);
  if (keys.length > 250) keys.sort((a,b)=>dcache[a].at-dcache[b].at).slice(0, keys.length-250).forEach(k => delete dcache[k]);
  if (!LS.set('animes-tmdb', dcache)){ dcache = {}; LS.set('animes-tmdb', dcache); }
}
const fresh = d => d && Date.now()-d.at < ((d.kind==='tv' && d.status==='Returning Series') ? DAY/2 : 7*DAY);
const loadingD = new Map();
function details(key, force){
  const c = dcache[key];
  if (c && !force && fresh(c)) return Promise.resolve(c);
  if (loadingD.has(key)) return loadingD.get(key);
  const [kind, id] = key.split('-');
  const p = (async () => {
    const x = await tmdb(`/${kind}/${id}`, {append_to_response:'watch/providers'});
    const d = kind==='tv' ? normTv(x) : normMovie(x);
    if (!d.ov){ try{ const en = await tmdb(`/${kind}/${id}`, {language:'en-US'}); d.ov = en.overview||''; d.ovEn = !!d.ov; }catch(e){} }
    dcache[key] = d; saveDcache();
    const e = entries.get(key); if (e){ const m = snapOf(d); if (JSON.stringify(m)!==JSON.stringify(e.m)) save(key, {m}, {quiet:true}); }
    return d;
  })().finally(() => loadingD.delete(key));
  loadingD.set(key, p); return p;
}
// what a list entry keeps about the show, so friends see it without asking TMDB
const snapOf = d => ({t:d.t, poster:d.poster||null, yr:d.yr||'', kind:d.kind, ns:d.kind==='tv'?d.seasons.length:0, total:d.kind==='tv'?d.total:1, pv:pvKeys(d.pv), rt:d.runtime||24});
const snapOfHit = h => ({t:h.t, poster:h.poster||null, yr:h.yr||'', kind:h.kind, ns:0, total:h.kind==='tv'?0:1, pv:[], rt:24});

// episodes already out for a season
function airedIn(d, n){
  const s = d.seasons.find(x => x.n===n); if (!s) return 0;
  if (d.next){ if (n>d.next.s) return 0; if (n===d.next.s) return Math.max(0, Math.min(s.eps, d.next.e-1)); return s.eps; }
  if (s.air && s.air > today()) return 0;
  return s.eps;
}
const airedTotal = d => d.seasons.reduce((a,s)=>a+airedIn(d,s.n),0);
const watchedTotal = e => Object.entries(e.w||{}).filter(([n])=>+n>0).reduce((a,[,v])=>a+(v||0),0);
function currentSeason(d, e){
  const w = e.w||{};
  const s = d.seasons.find(s => (w[s.n]||0) < airedIn(d, s.n)) || d.seasons.find(s => (w[s.n]||0) < s.eps) || d.seasons[d.seasons.length-1];
  return s ? s.n : 1;
}

/* ---------- data store: Firebase, or a stand-in for tests ---------- */
async function firebaseStore(cfg){
  const fb = await import('./firebase.js?v=2');
  const app = fb.initializeApp(cfg);
  const auth = fb.getAuth(app);
  await fb.setPersistence(auth, fb.browserLocalPersistence).catch(()=>{});
  let db;
  try{ db = fb.initializeFirestore(app, {localCache: fb.persistentLocalCache({tabManager: fb.persistentMultipleTabManager()})}); }
  catch(e){ db = fb.initializeFirestore(app, {}); }
  fb.getRedirectResult(auth).catch(()=>{});
  const list = uid => fb.collection(db, 'users', uid, 'list');
  return {
    onUser: cb => fb.onAuthStateChanged(auth, u => cb(u ? {uid:u.uid, name:u.displayName||''} : null)),
    async signIn(){
      const prov = new fb.GoogleAuthProvider(); prov.setCustomParameters({prompt:'select_account'});
      try{ await fb.signInWithPopup(auth, prov); }
      catch(e){
        if (e && (e.code==='auth/popup-blocked' || e.code==='auth/operation-not-supported-in-this-environment')) return fb.signInWithRedirect(auth, prov);
        if (e && (e.code==='auth/popup-closed-by-user' || e.code==='auth/cancelled-popup-request')) return;
        throw e;
      }
    },
    signOut: () => fb.signOut(auth),
    async getProfile(uid){ const s = await fb.getDoc(fb.doc(db, 'users', uid)); return s.exists() ? s.data() : null; },
    watchProfile: (uid, cb) => fb.onSnapshot(fb.doc(db, 'users', uid), s => cb(s.exists() ? s.data() : null), () => {}),
    async setProfile(uid, data){ await fb.setDoc(fb.doc(db, 'users', uid), {...data, updated:Date.now()}, {merge:true}); },
    async claimPseudo(uid, pseudo, old, profile){
      const lower = pseudo.toLowerCase();
      await fb.runTransaction(db, async tx => {
        const ref = fb.doc(db, 'pseudos', lower), s = await tx.get(ref);
        if (s.exists() && s.data().uid!==uid) throw new Error('taken');
        if (!s.exists()) tx.set(ref, {uid, pseudo});
        tx.set(fb.doc(db, 'users', uid), {platforms:[], following:[], ...profile, pseudo, updated:Date.now()});
        if (old && old.toLowerCase()!==lower) tx.delete(fb.doc(db, 'pseudos', old.toLowerCase()));
      });
    },
    async searchPseudos(prefix){
      const p = prefix.toLowerCase();
      const s = await fb.getDocs(fb.query(fb.collection(db, 'pseudos'), fb.where(fb.documentId(), '>=', p), fb.where(fb.documentId(), '<', p+''), fb.limit(10)));
      return s.docs.map(d => d.data());
    },
    watchList: (uid, cb, err) => fb.onSnapshot(list(uid), s => { const m = new Map(); s.forEach(d => m.set(d.id, d.data())); cb(m); }, err),
    async getList(uid){ const s = await fb.getDocs(list(uid)); const m = new Map(); s.forEach(d => m.set(d.id, d.data())); return m; },
    putEntry: (uid, key, e) => fb.setDoc(fb.doc(db, 'users', uid, 'list', key), e),
    sendRequest: (target, from, pseudo) => fb.setDoc(fb.doc(db, 'users', target, 'requests', from), {pseudo, at:Date.now()}),
    cancelRequest: (target, from) => fb.deleteDoc(fb.doc(db, 'users', target, 'requests', from)),
    async hasRequest(target, from){ try{ return (await fb.getDoc(fb.doc(db, 'users', target, 'requests', from))).exists(); }catch(e){ return false; } },
    async getComments(owner, key){ const q = await fb.getDocs(fb.collection(db, 'users', owner, 'list', key, 'comments')); return q.docs.map(d => ({id:d.id, ...d.data()})).sort((a,b)=>a.at-b.at); },
    async addComment(owner, key, c){ const ref = fb.doc(fb.collection(db, 'users', owner, 'list', key, 'comments')); await fb.setDoc(ref, c); return ref.id; },
    delComment: (owner, key, id) => fb.deleteDoc(fb.doc(db, 'users', owner, 'list', key, 'comments', id)),
    async getImages(uid){ try{ const s = await fb.getDoc(fb.doc(db, 'images', uid)); return s.exists() ? s.data() : {}; }catch(e){ return {}; } },
    setImages: (uid, data) => fb.setDoc(fb.doc(db, 'images', uid), {...data, at:Date.now()}),
    watchRequests: (uid, cb) => fb.onSnapshot(fb.collection(db, 'users', uid, 'requests'), s => cb(s.docs.map(d => ({uid:d.id, ...d.data()}))), () => {}),
    async acceptRequest(uid, from){ const b = fb.writeBatch(db); b.update(fb.doc(db, 'users', uid), {followers:fb.arrayUnion(from), updated:Date.now()}); b.delete(fb.doc(db, 'users', uid, 'requests', from)); await b.commit(); },
    declineRequest: (uid, from) => fb.deleteDoc(fb.doc(db, 'users', uid, 'requests', from)),
    setFollowing: (uid, target, on) => fb.updateDoc(fb.doc(db, 'users', uid), {following: on ? fb.arrayUnion(target) : fb.arrayRemove(target), updated:Date.now()}),
    leave: (target, from) => fb.updateDoc(fb.doc(db, 'users', target), {followers:fb.arrayRemove(from)}),
    removeFollower: (uid, f) => fb.updateDoc(fb.doc(db, 'users', uid), {followers:fb.arrayRemove(f), updated:Date.now()}),
    delEntry: (uid, key) => fb.deleteDoc(fb.doc(db, 'users', uid, 'list', key)),
  };
}
let Store = null;

/* ---------- state ---------- */
let me = null;            // {uid, name}
let profile = null;       // {pseudo, platforms, following}
let entries = new Map();  // key -> my entry
let listReady = false;
const ui = Object.assign({tab:'watching', sort:'recent', mine:false, animeOnly:true}, LS.get('animes-ui', {}));
let q = '';
const saveUi = () => LS.set('animes-ui', {tab:ui.tab, sort:ui.sort, mine:ui.mine, animeOnly:ui.animeOnly});
const myPlatforms = () => (profile && profile.platforms && profile.platforms.length ? profile.platforms : ['crunchyroll','netflix']);

/* ---------- my list ---------- */
let unsubList = null, unsubProfile = null;
function save(key, patch, opts={}){
  const prev = entries.get(key), now = Date.now(), [kind, id] = key.split('-');
  const e = Object.assign({kind, tid:+id, st:'plan', w:{}, score:0, note:'', reco:false, added:now}, prev, patch, {updated:now});
  entries.set(key, e);
  if (!opts.quiet){ render(); if (sheetId!=null) renderSheet(); }
  Store.putEntry(me.uid, key, e).catch(() => toast('Pas enregistré : vérifie ta connexion, ça repartira tout seul.'));
  return e;
}
function remove(key){
  const e = entries.get(key); if (!e) return;
  entries.delete(key); render();
  Store.delEntry(me.uid, key).catch(()=>{});
  toast(`${e.m ? e.m.t : 'Anime'} retiré de ta liste`, 'Annuler', () => { entries.set(key, e); Store.putEntry(me.uid, key, e); render(); });
}
function addFrom(key, st){
  const d = dcache[key], h = hits.get(key);
  let m = d ? snapOf(d) : h ? snapOfHit(h) : null;
  if (!m) for (const f of friends.values()){ const fe = f.list && f.list.get(key); if (fe && fe.m){ m = {...fe.m}; break; } }   // a friend's suggestion
  if (!m) return;
  const patch = {st, m};
  if (st==='watching' && !entries.has(key)) patch.started = Date.now();
  if (st==='done') Object.assign(patch, doneFill(key));
  save(key, patch);
  if (!d) details(key).then(dd => { if (st==='done' && entries.get(key)) save(key, doneFill(key), {quiet:true}); render(); }).catch(()=>{});
}
// marking a show as seen ticks every episode already out
function doneFill(key){
  const d = dcache[key]; if (!d || d.kind!=='tv') return {finished:Date.now()};
  const w = {}; d.seasons.forEach(s => { w[s.n] = airedIn(d, s.n) || s.eps; });
  return {w, finished:Date.now()};
}
function setStatus(key, st){
  const e = entries.get(key);
  if (!e){ addFrom(key, st); return; }
  const patch = {st};
  if (st==='done' && e.st!=='done') Object.assign(patch, doneFill(key));
  save(key, patch);
}
function setEp(key, n, val){
  const e = entries.get(key), d = dcache[key]; if (!e || !d) return;
  const s = d.seasons.find(x => x.n===n) || (n===0 && d.specials); const cap = s ? s.eps : val;
  const w = {...(e.w||{})}; w[n] = Math.max(0, Math.min(cap, val));
  const patch = {w}; if (e.st==='plan' && w[n]>0){ patch.st = 'watching'; patch.started = Date.now(); }
  save(key, patch);
  if (patch.st!=='done' && d.status!=='Returning Series' && d.seasons.every(x => (w[x.n]||0) >= x.eps) && e.st!=='done')
    toast(`Tu as fini ${d.t} !`, 'Ranger dans Vus', () => setStatus(key, 'done'));
}
function plusOne(key){
  const e = entries.get(key), d = dcache[key]; if (!e || !d) return;
  const n = currentSeason(d, e); const cur = (e.w||{})[n]||0;
  if (cur < airedIn(d, n)) setEp(key, n, cur+1);
}

/* ---------- friends ----------
   Profiles are private unless their owner makes them public: to see a list you send a request, and its owner accepts it.
   The database rules enforce it, the page only reflects it. */
const friends = new Map();   // uid -> {uid, pseudo, status:'ok'|'pending'|'refused'|'gone', private, followsMe, list: Map, at}
let friendsLoading = false, requests = [];
const isPrivate = p => !p || p.private !== false;
const following = () => (profile && profile.following) || [];
async function loadPerson(uid){
  try{
    const p = await Store.getProfile(uid);
    if (!p){ friends.set(uid, {uid, pseudo:'?', status:'gone', list:new Map(), at:Date.now()}); return; }
    const base = {uid, pseudo:p.pseudo, private:isPrivate(p), followsMe:(p.following||[]).includes(me.uid), list:new Map(), at:Date.now(),
      bio:p.bio||'', color:p.color||'', banner:p.banner||'', photo:p.photo||'', nFollowers:(p.followers||[]).length, nFollowing:(p.following||[]).length, followerIds:p.followers||[], followingIds:p.following||[]};
    if (!isPrivate(p) || (p.followers||[]).includes(me.uid)){
      try{ friends.set(uid, {...base, status:'ok', list:await Store.getList(uid)}); }
      catch(e){ friends.set(uid, {...base, status:'refused'}); }
    } else friends.set(uid, {...base, status: following().includes(uid) && await Store.hasRequest(uid, me.uid) ? 'pending' : 'refused'});
  }catch(e){ if (!friends.has(uid)) friends.set(uid, {uid, pseudo:'?', status:'gone', list:new Map(), at:Date.now(), err:true}); }
}
async function loadFriends(force){
  if (!profile || friendsLoading) return;
  const ids = following().filter(Boolean);
  const todo = ids.filter(uid => force || !friends.has(uid) || Date.now()-friends.get(uid).at > 5*60e3);
  if (!todo.length) return;
  friendsLoading = true;
  await Promise.all(todo.map(loadPerson));
  friendsLoading = false; render(); if (sheetId!=null) renderSheet();
}
async function follow(uid, pseudo){
  if (uid===me.uid) return;
  try{
    const p = await Store.getProfile(uid);
    if (isPrivate(p)) await Store.sendRequest(uid, me.uid, profile.pseudo);
    await Store.setFollowing(me.uid, uid, true);
    profile.following = [...new Set([...following(), uid])];
    toast(isPrivate(p) ? `Demande envoyée à ${pseudo}` : `Tu suis ${pseudo}`);
    friends.delete(uid); await loadPerson(uid); render(); if (sheetId!=null) renderSheet();
  }catch(e){ toast('La demande n’est pas partie, réessaie.'); }
}
async function unfollow(uid){
  const f = friends.get(uid), wasPending = f && f.status==='pending';
  profile.following = following().filter(x => x!==uid);
  await Promise.all([Store.cancelRequest(uid, me.uid).catch(()=>{}), Store.leave(uid, me.uid).catch(()=>{}), Store.setFollowing(me.uid, uid, false).catch(()=>{})]);
  friends.delete(uid); await loadPerson(uid);
  render(); if (sheetId!=null) renderSheet();
  toast(wasPending ? 'Demande annulée' : `Tu ne suis plus ${f ? f.pseudo : 'cette personne'}`);
}
async function acceptRequest(r){
  try{
    await Store.acceptRequest(me.uid, r.uid);
    profile.followers = [...new Set([...(profile.followers||[]), r.uid])];
    requests = requests.filter(x => x.uid!==r.uid); render();
    if (following().includes(r.uid)) toast(`${r.pseudo} peut maintenant voir ta liste`);
    else toast(`${r.pseudo} peut maintenant voir ta liste`, 'Suivre en retour', () => follow(r.uid, r.pseudo));
  }catch(e){ toast('Pas enregistré, réessaie.'); }
}
async function declineRequest(r){
  requests = requests.filter(x => x.uid!==r.uid); render();
  Store.declineRequest(me.uid, r.uid).catch(() => toast('Pas enregistré, réessaie.'));
}
async function removeFollower(uid, pseudo){
  profile.followers = (profile.followers||[]).filter(x => x!==uid); if (sheetId==='settings') renderSettings(); if (sheetId==='friend:'+me.uid) renderFriend(me.uid);
  try{ await Store.removeFollower(me.uid, uid); toast(`${pseudo} ne voit plus ta liste`); }catch(e){ toast('Pas enregistré, réessaie.'); }
}
const pseudoCache = new Map();
async function pseudoOf(uid){
  if (pseudoCache.has(uid)) return pseudoCache.get(uid);
  const f = friends.get(uid); if (f && f.pseudo!=='?'){ pseudoCache.set(uid, f.pseudo); return f.pseudo; }
  try{ const p = await Store.getProfile(uid); const v = p ? p.pseudo : '?'; pseudoCache.set(uid, v); return v; }catch(e){ return '?'; }
}
const friendsOn = key => following().map(uid => friends.get(uid)).filter(f => f && f.status==='ok').map(f => ({f, e:f.list.get(key)})).filter(x => x.e);

/* ---------- rendering ---------- */
function platBadges(m){
  const mine = ((m && m.pv) || []).filter(k => myPlatforms().includes(k)).map(k => SERVICES.find(s => s.key===k)).filter(Boolean);
  return mine.length ? `<div class="plats">${mine.map(s=>`<span class="pl" style="--pc:${s.color}">${esc(s.name)}</span>`).join('')}</div>` : '';
}
function subOf(m, e){
  if (!m) return '';
  if (m.kind==='movie') return ['Film', m.yr].filter(Boolean).join(', ');
  const d = dcache[e ? keyOfEntry(e) : ''];
  if (e && e.st==='done' && d && airedTotal(d) > watchedTotal(e)) return '';
  return ['Série', m.yr, m.ns ? plural(m.ns, 'saison', 'saisons') : ''].filter(Boolean).join(', ');
}
const keyOfEntry = e => `${e.kind}-${e.tid}`;
function posterCard(key, m, opts={}){
  const e = entries.get(key);
  const flag = opts.discover && e ? `<span class="flag">${esc(STATUS[e.st])}</span>` : '';
  const score = opts.score ? `<span class="score num">${opts.score}/10</span>` : (!opts.discover && !opts.friend && e && e.score ? `<span class="score num">${e.score}/10</span>` : '');
  const heart = opts.heart ? `<span class="heart" aria-label="Recommandé">${ICON.heart}</span>` : '';
  const add = opts.discover && !e ? `<button class="add" type="button" data-add="${key}" aria-label="Ajouter ${esc(m.t)} à regarder">${ICON.plus}</button>` : '';
  const d = dcache[key];
  const newS = !opts.discover && !opts.friend && e && e.st==='done' && d && d.kind==='tv' && airedTotal(d) > watchedTotal(e) ? `<span class="s newseason">Nouveaux épisodes dispo</span>` : '';
  return `<div style="position:relative">
    <button class="poster" type="button" data-open="${key}">
      <div class="cover">${m.poster?`<img src="${esc(IMG(m.poster))}" alt="" loading="lazy" decoding="async">`:''}${flag}${score}${heart}${opts.cnt?`<span class="cnt">${esc(opts.cnt)}</span>`:''}</div>
      <span class="t">${esc(m.t)}</span>${opts.by?`<span class="by">${esc(opts.by)}</span>`:''}${newS || `<span class="s">${esc(opts.sub ?? subOf(m, e))}</span>`}${opts.discover||opts.friend?'':platBadges(m)}
    </button>${add}</div>`;
}
function fmtDay(iso){
  if (!iso) return '';
  const d = new Date(iso+'T12:00:00'), t = new Date(today()+'T12:00:00'), diff = Math.round((d-t)/DAY);
  if (diff===0) return 'aujourd’hui'; if (diff===1) return 'demain';
  return 'le '+d.toLocaleDateString('fr-FR', {weekday:'long', day:'numeric', month: diff>6||diff<0 ? 'long' : undefined});
}
function nextLine(d){
  if (!d || d.kind!=='tv' || !d.next) return '';
  return `<div class="next">Épisode ${d.next.e}${d.seasons.length>1?` de la saison ${d.next.s}`:''} ${fmtDay(d.next.air)}</div>`;
}
function pipsFor(key, d, e, n){
  const s = n===0 ? d.specials : d.seasons.find(x => x.n===n); if (!s) return '';
  const w = (e.w||{})[n]||0, aired = n===0 ? s.eps : airedIn(d, n);
  if (s.eps > 60) return `<div class="bar" aria-hidden="true"><i style="width:${Math.min(100, w/(s.eps||1)*100)}%"></i></div>`;
  let pips = '';
  for (let i=1; i<=s.eps; i++){
    const future = i>aired;
    pips += `<button class="pip${i<=w?' on':''}${future?' future':''}" type="button" data-ep="${key}|${n}|${i}" ${future?'disabled':''} aria-label="Épisode ${i}${future?' (pas encore sorti)':''}" aria-pressed="${i<=w}">${i}</button>`;
  }
  return `<div class="strip" role="group" aria-label="Épisodes vus, ${esc(s.name||'saison '+n)}">${pips}</div>`;
}
function watchRow(key, e){
  const m = e.m || {t:'…'}, d = dcache[key];
  const cover = `<div class="cover" data-open="${key}">${m.poster?`<img src="${esc(IMG(m.poster,'w185'))}" alt="" loading="lazy">`:''}</div>`;
  if (!d) return `<article class="row">${cover}<div><h3 data-open="${key}" tabindex="0" role="button">${esc(m.t)}</h3><div class="s">Chargement…</div></div></article>`;
  if (d.kind==='movie') return `<article class="row">${cover}<div style="min-width:0"><h3 data-open="${key}" tabindex="0" role="button">${esc(d.t)}</h3><div class="s">Film, ${esc(d.yr)}${d.runtime?`, ${d.runtime} min`:''}</div>
    <div class="finish"><button class="btn small primary" type="button" data-st="${key}|done">${ICON.check} Je l’ai vu</button></div></div></article>`;
  const n = currentSeason(d, e), s = d.seasons.find(x => x.n===n) || {eps:0, name:''};
  const w = (e.w||{})[n]||0, aired = airedIn(d, n);
  const behind = airedTotal(d) - watchedTotal(e);
  const allDone = d.seasons.every(x => ((e.w||{})[x.n]||0) >= airedIn(d, x.n));
  return `<article class="row">${cover}
    <div style="min-width:0">
      <h3 data-open="${key}" tabindex="0" role="button">${esc(d.t)}</h3>
      <div class="s">${d.seasons.length>1?`${esc(s.name||'Saison '+n)}, `:''}${plural(s.eps,'épisode','épisodes')}${behind>1?`, ${behind} épisodes de retard`:''}</div>${nextLine(d)}
      <div class="prog"><span class="count num"><b>${w}</b> / ${s.eps||'?'}</span>
        <button class="plus" type="button" data-plus="${key}" ${w>=aired?'disabled':''}>+1 épisode</button></div>
      ${pipsFor(key, d, e, n)}
      ${allDone && d.status!=='Returning Series' ? `<div class="finish">Série terminée. <button class="btn small primary" type="button" data-st="${key}|done">${ICON.check} Ranger dans Vus</button></div>` : ''}
    </div></article>`;
}
function myFiltered(st){
  const needle = q.trim().toLowerCase();
  return [...entries.entries()].filter(([k,e]) => (st==='done' ? (e.st==='done'||e.st==='dropped') : e.st===st)
    && (!ui.mine || ((e.m&&e.m.pv)||[]).some(p => myPlatforms().includes(p)))
    && (!needle || [e.m&&e.m.t, e.note].some(s => String(s||'').toLowerCase().includes(needle))));
}
function sortList(list){
  const nextAt = ([k]) => { const d = dcache[k]; return d && d.next ? d.next.air : '9999'; };
  const by = {
    recent:(a,b)=>(b[1].updated||0)-(a[1].updated||0),
    title:(a,b)=>((a[1].m&&a[1].m.t)||'').localeCompare((b[1].m&&b[1].m.t)||'', 'fr'),
    score:(a,b)=>(b[1].score||0)-(a[1].score||0),
    next:(a,b)=>nextAt(a).localeCompare(nextAt(b))
  }[ui.sort] || (()=>0);
  return list.sort(by);
}
function toolsBar(placeholder, sorts, extra=''){
  return `<div class="tools">
    <label class="search">${ICON.search}<input type="search" id="q" placeholder="${esc(placeholder)}" value="${esc(q)}" autocomplete="off" enterkeyhint="search" aria-label="${esc(placeholder)}"></label>
    ${sorts ? `<select id="sort" aria-label="Trier">${sorts.map(([v,l])=>`<option value="${v}"${ui.sort===v?' selected':''}>${l}</option>`).join('')}</select>` : ''}
    <button class="toggle" type="button" id="mine" aria-pressed="${ui.mine}">Mes plateformes</button>${extra}
  </div>`;
}
function summary(){
  const all = [...entries.values()];
  const n = st => all.filter(e => e.st===st).length;
  document.querySelectorAll('[data-c]').forEach(el => { const c = el.dataset.c==='done' ? n('done')+n('dropped') : el.dataset.c==='friends' ? requests.length : n(el.dataset.c); el.textContent = c||''; });
  if (!me){ $('#summary').textContent = ''; return; }
  const eps = all.reduce((s,e) => s + (e.kind==='tv' ? watchedTotal(e) : 0), 0);
  const mins = all.reduce((s,e) => s + (e.kind==='tv' ? watchedTotal(e)*((e.m&&e.m.rt)||24) : (e.st==='done' ? (e.m&&e.m.rt)||100 : 0)), 0);
  $('#summary').innerHTML = all.length
    ? `<b class="num">${n('done')}</b> ${n('done')>1?'vus':'vu'}, <b class="num">${n('watching')}</b> en cours, <b class="num">${n('plan')}</b> à regarder. <b class="num">${eps.toLocaleString('fr-FR')}</b> épisodes, soit environ <b class="num">${Math.round(mins/60).toLocaleString('fr-FR')} h</b> devant l’écran.`
    : `Salut ${esc(profile&&profile.pseudo||'')} ! Ta liste est vide pour l’instant.`;
}
const emptyState = (title, text, action) => `<div class="empty"><h2>${title}</h2><p>${text}</p>${action||''}</div>`;
const goDiscover = `<button class="btn primary" type="button" data-go="discover">${ICON.search} Chercher un anime</button>`;

function keepFocus(fn){
  const a = document.activeElement, id = a && a.id, pos = a && a.selectionStart;
  fn();
  if (id && (id==='q' || id==='fq')){ const i = document.getElementById(id); if (i){ i.focus(); try{ i.setSelectionRange(pos,pos); }catch(e){} } }
}
function render(){
  const main = $('#main');
  $('#nav').classList.toggle('off', !me || !profile);
  $('#openSettings').hidden = !me || !profile;
  const mp = $('#myProfile'); mp.hidden = !me || !profile; if (profile) mp.innerHTML = `${avatar(profile.pseudo, false, profile.color, profile.photo)}<span>${esc(profile.pseudo)}</span>`;
  if (!Store){ return; }
  if (!me){ main.innerHTML = loginScreen(); $('#summary').textContent=''; return; }
  if (!profile){ main.innerHTML = `<p class="msg">Chargement de ton profil…</p>`; return; }
  summary();
  document.querySelectorAll('#nav [data-tab]').forEach(b => b.setAttribute('aria-current', b.dataset.tab===ui.tab ? 'page' : 'false'));
  keepFocus(() => {
    if (ui.tab==='discover') main.innerHTML = discoverView();
    else if (ui.tab==='friends') main.innerHTML = friendsView();
    else main.innerHTML = listView();
  });
}
function listView(){
  if (!listReady) return `<p class="msg">Chargement de ta liste…</p>`;
  const SORTS = {
    watching:[['recent','Modifiés récemment'],['next','Prochain épisode'],['title','Titre']],
    plan:[['recent','Ajoutés récemment'],['title','Titre']],
    done:[['recent','Récents'],['score','Ma note'],['title','Titre']]
  }[ui.tab];
  if (!SORTS.some(s => s[0]===ui.sort)) ui.sort = 'recent';
  const total = [...entries.values()].filter(e => ui.tab==='done' ? (e.st==='done'||e.st==='dropped') : e.st===ui.tab).length;
  if (!total) return ui.tab==='watching' ? emptyState('Rien en cours', 'Commence un anime de ta liste « À regarder », ou trouve-en un nouveau.', goDiscover)
    : ui.tab==='plan' ? emptyState('Ta liste d’envies est vide', 'Ajoute les animes que tu veux voir : tu sauras où ils sont dispos en France.', goDiscover)
    : emptyState('Aucun anime vu pour l’instant', 'Ajoute ceux que tu as déjà regardés pour les noter et les recommander à tes amis.', goDiscover);
  const list = sortList(myFiltered(ui.tab));
  let body;
  if (!list.length) body = `<p class="msg">Aucun anime ne correspond${ui.mine?' sur tes plateformes':''}.</p>`;
  else if (ui.tab==='watching') body = `<div class="rows">${list.map(([k,e]) => watchRow(k,e)).join('')}</div>`;
  else if (ui.tab==='done'){
    const done = list.filter(([,e]) => e.st==='done'), drop = list.filter(([,e]) => e.st==='dropped');
    const shelf = l => `<div class="shelf">${l.map(([k,e]) => posterCard(k, e.m||{t:'…'}, {heart:e.reco})).join('')}</div>`;
    body = (done.length?shelf(done):'') + (drop.length?`<h2 class="sec">Abandonnés</h2>${shelf(drop)}`:'');
  }
  else body = `<div class="shelf">${list.map(([k,e]) => posterCard(k, e.m||{t:'…'})).join('')}</div>`;
  return toolsBar('Filtrer ma liste', SORTS) + body;
}

/* discover */
const disc = {key:null, list:[], more:false, page:1, err:'', loading:false, home:null, homeErr:'', homeFor:''};
let searchT = null, provIds = LS.get('animes-provids', null);
async function providerIds(){
  if (provIds && Date.now()-provIds.at < 7*DAY) return provIds.map;
  const j = await tmdb('/watch/providers/tv', {watch_region:'FR'});
  const map = {}; for (const p of j.results||[]){ const s = svcOf(p.provider_name); if (s) (map[s.key] = map[s.key]||[]).push(p.provider_id); }
  provIds = {at:Date.now(), map}; LS.set('animes-provids', provIds); return map;
}
async function loadHome(){
  const want = ui.mine ? 'mine:'+myPlatforms().join(',') : 'all';
  if (disc.loading || (disc.home && disc.homeFor===want)) return;
  disc.loading = true; disc.homeErr='';
  try{
    let prov = '';
    if (ui.mine){ const map = await providerIds(); prov = myPlatforms().flatMap(k => map[k]||[]).join('|'); }
    const base = {with_genres:16, with_original_language:'ja', watch_region:'FR', with_watch_providers:prov, include_adult:false};
    const t = new Date(), iso = x => x.toISOString().slice(0,10);
    const [airing, pop, films] = await Promise.all([
      tmdb('/discover/tv', {...base, sort_by:'popularity.desc', 'air_date.gte':iso(new Date(t-6*DAY)), 'air_date.lte':iso(new Date(+t+DAY))}),
      tmdb('/discover/tv', {...base, sort_by:'popularity.desc', 'vote_count.gte':200}),
      tmdb('/discover/movie', {...base, sort_by:'popularity.desc', 'vote_count.gte':100}),
    ]);
    const n = (j, k) => (j.results||[]).map(x => { const h = normHit(x, k); hits.set(h.key, h); return h; });
    disc.home = {airing:n(airing,'tv'), pop:n(pop,'tv'), films:n(films,'movie')}; disc.homeFor = want;
  }catch(e){ disc.homeErr = e.message; }
  disc.loading = false; if (ui.tab==='discover' && !q.trim()) render();
}
/* "for you": TMDB's suggestions for the shows I rated best, recommended or put in my favourites */
const forYou = {key:'', groups:null, loading:false};
function loadForYou(){
  const seeds = [...entries.entries()].filter(([,e]) => e.fav || e.reco || e.score>=8)
    .sort((a,b) => (b[1].fav-a[1].fav) || ((b[1].score||0)-(a[1].score||0)) || ((b[1].updated||0)-(a[1].updated||0))).slice(0, 3);
  const key = seeds.map(([k]) => k).join(',');
  if (forYou.loading || forYou.key===key) return;
  forYou.loading = true; forYou.key = key;
  Promise.all(seeds.map(async ([k, e]) => {
    const [kind, id] = k.split('-');
    try{
      const j = await tmdb(`/${kind}/${id}/recommendations`);
      const list = (j.results||[]).map(x => normHit(x, x.media_type==='movie'||x.media_type==='tv' ? x.media_type : kind)).filter(h => h.anime && h.t);
      list.forEach(h => hits.set(h.key, h));
      return {seed:(e.m&&e.m.t)||'ça', list};
    }catch(err){ return {seed:'', list:[]}; }
  })).then(groups => {
    // a show suggested for several seeds is only shown once
    const seen = new Set();
    forYou.groups = groups.map(g => ({...g, list:g.list.filter(h => !seen.has(h.key) && seen.add(h.key))})).filter(g => g.list.length);
    forYou.loading = false; if (ui.tab==='discover' && !q.trim()) render();
  });
}
const namesOf = w => w.length<=2 ? w.join(' et ') : `${w.slice(0,2).join(', ')} et ${w.length-2} autre${w.length>3?'s':''}`;
function friendRecos(){
  const m = new Map();
  for (const uid of following()){
    const f = friends.get(uid); if (!f || f.status!=='ok') continue;
    for (const [k,e] of f.list){ if (!e.reco) continue; const x = m.get(k) || {k, m:e.m, who:[], sc:[]}; x.who.push(f.pseudo); if (e.score) x.sc.push(e.score); m.set(k, x); }
  }
  return [...m.values()].filter(x => { const mine = entries.get(x.k); return !mine || mine.st==='plan'; }).sort((a,b) => b.who.length-a.who.length);
}
async function runSearch(page=1){
  const text = q.trim(); if (!text) return;
  disc.err=''; disc.loading = true; if (page===1){ disc.list=[]; disc.key=text; } render();
  try{
    const j = await tmdb('/search/multi', {query:text, page, include_adult:false});
    if (disc.key!==text) return;
    const l = (j.results||[]).filter(x => x.media_type==='tv' || x.media_type==='movie').map(x => { const h = normHit(x); hits.set(h.key, h); return h; });
    disc.list = page===1 ? l : disc.list.concat(l); disc.more = j.page < j.total_pages; disc.page = page;
  }catch(e){ if (disc.key===text) disc.err = e.message; }
  disc.loading = false; if (ui.tab==='discover' && disc.key===text) render();
}
const shelfOf = l => `<div class="shelf">${l.map(h => posterCard(h.key, h, {discover:true, sub:[h.kind==='movie'?'Film':'Série', h.yr].filter(Boolean).join(', ')})).join('')}</div>`;
/* TMDB lists every film of a show as its own result: fold them under the show (or under the first film of the same name) */
const fold = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const baseName = s => fold(s).split(/\s[:：\-–]\s|[:：(（]/)[0].replace(/^(the|le|la|les)\s+/,'').replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9fff]+/g,' ').trim();
const hasPhrase = (hay, needle) => needle.length>=4 && (' '+hay+' ').includes(' '+needle+' ');
function sameStory(movie, show){
  const mb = baseName(movie.t), mfull = fold(movie.t).replace(/[^a-z0-9]+/g,' ');
  if ([baseName(show.t), baseName(show.ot)].some(sb => sb && (mb===sb || hasPhrase(sb, mb) || hasPhrase(mfull, sb)))) return true;
  // a distinctive word of the show's name in the film's title ("The End of Evangelion")
  return keyWords(show.t).some(w => hasPhrase(mfull, w));
}
const COMMON = new Set(['season','saison','movie','special','specials','story','stories','world','school','return','returns','project','legend','legends','chronicles','adventure','adventures','nouvelle','origins','rising','final','edition','episode','anime','series','monsters','academy','attack','dragon','hunter','knight','knights','princess','prince','heroes','battle','island','summer','winter','spring','autumn','memories','journey','animation','tokyo']);
const keyWords = t => baseName(t).split(' ').filter(w => w.length>=6 && !COMMON.has(w) && !/^[0-9]+$/.test(w));
const groupMembers = new Map();   // card shown -> films folded under it
function groupHits(list){
  const out = [], byKey = new Map();
  for (const h of list){
    if (h.kind==='movie'){
      const host = out.find(g => (g.rep.kind==='tv' ? sameStory(h, g.rep) : baseName(g.rep.t).length>=4 && baseName(g.rep.t)===baseName(h.t)));
      if (host){ host.films.push(h); continue; }
    }
    const g = {rep:h, films:[]}; out.push(g); byKey.set(h.key, g);
  }
  // a show listed after its films still collects them
  for (const g of out.filter(g => g.rep.kind==='tv')){
    for (const o of out) if (o!==g && o.rep.kind==='movie' && !o.taken && sameStory(o.rep, g.rep)){ g.films.push(o.rep, ...o.films); o.taken = true; }
  }
  const res = out.filter(g => !g.taken);
  res.forEach(g => { if (g.films.length) groupMembers.set(g.rep.key, g.films); });
  return res;
}
const groupedShelfOf = l => `<div class="shelf">${groupHits(l).map(g => posterCard(g.rep.key, g.rep, {discover:true, cnt: g.films.length ? `+ ${plural(g.films.length,'film','films')}` : '', sub:[g.rep.kind==='movie'?'Film':'Série', g.rep.yr].filter(Boolean).join(', ')})).join('')}</div>`;
function discoverView(){
  const extra = q.trim() ? `<button class="toggle" type="button" id="animeOnly" aria-pressed="${ui.animeOnly}">Animes seulement</button>` : '';
  let body = '';
  if (q.trim()){
    if (disc.err) body = `<p class="msg bad">${esc(disc.err)}</p>`;
    else if (disc.loading && !disc.list.length) body = `<p class="msg">Recherche…</p>`;
    else {
      const l = ui.animeOnly ? disc.list.filter(h => h.anime) : disc.list, hidden = disc.list.length - l.length;
      body = l.length ? groupedShelfOf(l) : `<p class="msg">Aucun anime trouvé pour « ${esc(q.trim())} ».</p>`;
      if (hidden && ui.animeOnly) body += `<p class="msg">${plural(hidden, 'autre résultat', 'autres résultats')} (films, séries, animation non japonaise). <button class="btn small" type="button" id="showAll">Les afficher</button></p>`;
      if (disc.more) body += `<div class="more"><button class="btn" type="button" id="moreRes">${disc.loading?'Chargement…':'Plus de résultats'}</button></div>`;
    }
    if (ui.mine) body = `<p class="note" style="margin:-6px 0 12px">Le filtre « Mes plateformes » s’applique aux suggestions ; pour une recherche, regarde les dispos dans chaque fiche.</p>` + body;
  } else {
    loadHome(); loadForYou(); loadFriends();
    const sec = (title, l) => l.length ? `<h2 class="sec">${title}</h2>${shelfOf(l)}` : '';
    // what my friends recommend and I haven't seen, then shows close to the ones I loved
    const fr = friendRecos().filter(x => !ui.mine || ((x.m&&x.m.pv)||[]).some(p => myPlatforms().includes(p)));
    let mine = fr.length ? `<h2 class="sec">Recommandés par tes amis</h2><div class="shelf">${fr.slice(0,12).map(x => posterCard(x.k, x.m||{t:'…'}, {discover:true, by:`${namesOf(x.who)} recommande${x.who.length>1?'nt':''}`, sub:''})).join('')}</div>` : '';
    for (const g of (forYou.groups||[])) mine += sec(`Parce que tu as aimé ${esc(g.seed)}`, g.list.filter(h => !entries.has(h.key)).slice(0, 12));
    if (disc.homeErr) body = mine + `<p class="msg bad">${esc(disc.homeErr)}</p>`;
    else if (!disc.home) body = mine + `<p class="msg">Chargement…</p>`;
    else {
      body = mine + sec('Nouveaux épisodes cette semaine', disc.home.airing) + sec('Animes populaires', disc.home.pop) + sec('Films d’animation japonais', disc.home.films)
        || `<p class="msg">Rien à proposer sur tes plateformes pour l’instant.</p>`;
    }
  }
  return toolsBar('Chercher un anime ou un film', null, extra) + body;
}

/* friends tab */
let fq = '', fres = null, fresErr = '', fT = null;
function friendsView(){
  loadFriends();
  const fl = following().map(uid => friends.get(uid) || {uid, pseudo:'…', status:'loading', list:new Map()});
  const okFl = fl.filter(f => f.status==='ok');
  const searchBox = `<div class="tools"><label class="search">${ICON.search}<input type="search" id="fq" placeholder="Chercher un ami par son pseudo" value="${esc(fq)}" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Chercher un ami par son pseudo"></label></div>`;
  let results = '';
  if (fq.trim().length>=2){
    if (fresErr) results = `<p class="msg bad">${esc(fresErr)}</p>`;
    else if (!fres) results = `<p class="msg">Recherche…</p>`;
    else if (!fres.length) results = `<p class="msg">Personne avec ce pseudo. Vérifie l’orthographe, ou demande-lui de se connecter une première fois au site.</p>`;
    else results = `<div class="results">${fres.map(r => {
      const isMe = r.uid===me.uid, f = friends.get(r.uid), on = following().includes(r.uid);
      const act = isMe ? '<span class="note">C’est toi</span>'
        : on && f && f.status==='ok' ? `<button class="btn small" type="button" data-friend="${r.uid}">Voir son profil</button>`
        : on && f && f.status==='pending' ? `<button class="btn small" type="button" data-friend="${r.uid}">Demande envoyée</button>`
        : `<button class="btn small primary" type="button" data-follow="${r.uid}|${esc(r.pseudo)}">${ICON.plus} Demander à suivre</button>`;
      return `<div class="res"><button class="who-btn" type="button" data-friend="${r.uid}">${avatar(r.pseudo)}<b>${esc(r.pseudo)}</b></button>${act}</div>`;
    }).join('')}</div>`;
  }
  const mineLine = `<p class="note" style="margin-bottom:14px">Ton pseudo : <b>${esc(profile.pseudo)}</b>. Donne-le à tes potes pour qu’ils te trouvent.</p>`;
  const reqs = requests.length ? `<h2 class="sec">Demandes reçues</h2><div class="results">${requests.map(r => `<div class="res req"><button class="who-btn" type="button" data-friend="${r.uid}">${avatar(r.pseudo)}<span class="who-t"><b>${esc(r.pseudo)}</b><span class="note">veut voir ta liste</span></span></button>
      <span class="req-act"><button class="btn small primary" type="button" data-accept="${r.uid}">${ICON.check} Accepter</button><button class="btn small" type="button" data-decline="${r.uid}">Refuser</button></span></div>`).join('')}</div>` : '';
  if (!fl.length) return searchBox + results + reqs + mineLine + (results||reqs ? '' : emptyState('Ajoute tes amis', 'Cherche le pseudo d’un ami et envoie-lui une demande. Quand il accepte, tu vois ce qu’il a vu, ses notes et ce qu’il recommande.'));
  const tag = f => f.status==='pending' ? ' <span class="note">(en attente)</span>' : f.status==='refused' ? ' <span class="note">(refusée)</span>' : '';
  const bar = `<div class="friends-bar">${fl.map(f => `<button class="who${f.status!=='ok'&&f.status!=='loading'?' dim':''}" type="button" data-friend="${f.uid}">${avatar(f.pseudo, false, f.color, f.photo)}${esc(f.pseudo)}${tag(f)}</button>`).join('')}</div>`;
  // recommendations I haven't seen, most-recommended first
  const agg = (pred) => {
    const m = new Map();
    for (const f of okFl) for (const [k,e] of f.list){ if (!pred(e)) continue; const x = m.get(k) || {k, m:e.m, who:[], sc:[]}; x.who.push(f.pseudo); if (e.score) x.sc.push(e.score); m.set(k, x); }
    return [...m.values()];
  };
  const recos = agg(e => e.reco).filter(x => { const mine = entries.get(x.k); return !mine || mine.st==='plan'; }).sort((a,b)=>b.who.length-a.who.length);
  const watching = agg(e => e.st==='watching').sort((a,b)=>b.who.length-a.who.length);
  const top = agg(e => e.st==='done' && e.score>=8).filter(x => !entries.has(x.k)).sort((a,b)=>(b.sc.reduce((s,v)=>s+v,0)/b.sc.length)-(a.sc.reduce((s,v)=>s+v,0)/a.sc.length));
  const names = w => w.length<=2 ? w.join(' et ') : `${w.slice(0,2).join(', ')} et ${w.length-2} autre${w.length>3?'s':''}`;
  const card = (x, by, extra={}) => posterCard(x.k, x.m||{t:'…'}, {friend:true, by, sub:'', ...extra});
  const avg = x => x.sc.length ? Math.round(x.sc.reduce((s,v)=>s+v,0)/x.sc.length) : 0;
  let body = '';
  if (friendsLoading && !okFl.some(f => f.list.size)) body = `<p class="msg">Chargement des listes de tes amis…</p>`;
  else if (!okFl.length) body = `<p class="msg">Tes demandes sont en attente : dès qu’un ami accepte, tu verras sa liste ici.</p>`;
  else {
    body += recos.length ? `<h2 class="sec">Recommandés par tes amis</h2><div class="shelf">${recos.map(x => card(x, `${names(x.who)} recommande${x.who.length>1?'nt':''}`, {heart:true, score:avg(x)})).join('')}</div>` : '';
    body += watching.length ? `<h2 class="sec">Ce qu’ils regardent</h2><div class="shelf">${watching.map(x => card(x, names(x.who))).join('')}</div>` : '';
    body += top.length ? `<h2 class="sec">Leurs coups de cœur que tu n’as pas vus</h2><div class="shelf">${top.slice(0,18).map(x => card(x, names(x.who), {score:avg(x)})).join('')}</div>` : '';
    if (!body) body = `<p class="msg">Tes amis n’ont encore rien ajouté à leur liste.</p>`;
  }
  return searchBox + results + reqs + bar + body;
}
async function runFriendSearch(){
  const text = fq.trim().toLowerCase(); fres = null; fresErr = ''; render();
  if (text.length<2) return;
  try{ const r = await Store.searchPseudos(text); if (fq.trim().toLowerCase()===text){ fres = r; render(); } }
  catch(e){ fresErr = 'La recherche n’a pas marché, vérifie ta connexion.'; render(); }
}

/* ---------- login / pseudo ---------- */
function loginScreen(){
  if (!CONFIG.firebase || !CONFIG.tmdbKey) return `<section class="hello"><h2>Presque prêt</h2><p>Le site attend encore ses réglages Firebase et TMDB dans <code>config.js</code>.</p></section>`;
  return `<section class="hello">
    <h2>Tes animes, tes saisons, tes potes.</h2>
    <p>Note ce que tu as vu, coche tes épisodes, sache où regarder en France, et découvre ce que tes amis recommandent.</p>
    <button class="btn primary" type="button" id="signin"><span class="g-dot" aria-hidden="true"></span>Se connecter avec Google</button>
    <p class="fine">Ton profil est privé : seules les personnes que tu acceptes voient ta liste. Ton adresse e-mail n’est jamais partagée.</p>
  </section>`;
}
function pseudoForm(current, first){
  return `<form class="form" id="pseudoForm">
    <label for="pseudoIn">Pseudo</label>
    <input type="text" id="pseudoIn" value="${esc(current||'')}" maxlength="20" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="ex. melvin" required>
    <p class="note">De 3 à 20 caractères : lettres, chiffres, point, tiret ou tiret bas. Tes amis te trouveront avec.</p>
    <p class="note warn-t" id="pseudoErr"></p>
    <div><button class="btn primary" type="submit">${first?'C’est mon pseudo':'Changer de pseudo'}</button></div></form>`;
}
function openPseudo(){
  sheetId = 'pseudo'; $('#scrim').hidden=false; $('#sheet').hidden=false; document.body.style.overflow='hidden';
  const guess = (me.name||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9_.-]/g,'').slice(0,20);
  $('#sheet').innerHTML = `<div class="sh-body" style="padding-top:26px"><h2 id="shTitle" style="font-family:var(--display);font-weight:400;font-size:22px;margin:0">Choisis ton pseudo</h2>
    <p class="note" style="font-size:14px">C’est le nom que verront tes amis.</p>${pseudoForm(guess, true)}</div>`;
  $('#pseudoIn').focus();
}
async function submitPseudo(ev){
  ev.preventDefault();
  const v = $('#pseudoIn').value.trim(), err = $('#pseudoErr');
  if (!/^[A-Za-z0-9_.-]{3,20}$/.test(v)){ err.textContent = 'Utilise de 3 à 20 lettres sans accent, chiffres, point, tiret ou tiret bas.'; return; }
  if (profile && profile.pseudo===v){ err.textContent = 'C’est déjà ton pseudo.'; return; }
  err.textContent = 'Vérification…';
  const first = !profile;
  try{
    const keep = profile ? {platforms:profile.platforms||[], following:profile.following||[], followers:profile.followers||[], private:profile.private!==false, ...(profile.bio?{bio:profile.bio}:{}), ...(profile.color?{color:profile.color}:{}), ...(profile.banner?{banner:profile.banner}:{}), ...(profile.photo?{photo:profile.photo}:{})} : {platforms:['crunchyroll','netflix'], following:[], followers:[], private:true};
    await Store.claimPseudo(me.uid, v, profile && profile.pseudo, keep);
    profile = {...keep, ...(profile||{}), pseudo:v};
    if (first){ closeSheet(true); startList(); toast(`Bienvenue ${v} !`); setTimeout(followUrl, 0); }
    else { renderSettings(); toast('Pseudo changé'); }
    render();
  }catch(e){ err.textContent = e && e.message==='taken' ? 'Ce pseudo est déjà pris, essaie une variante.' : 'Impossible d’enregistrer le pseudo, vérifie ta connexion.'; }
}

/* ---------- sheets ---------- */
let sheetId = null, lastFocus = null, openSeason = null;
const relCache = new Map();
function showSheet(){ $('#scrim').hidden=false; $('#sheet').hidden=false; document.body.style.overflow='hidden'; }
/* each anime has its own full-screen page with its own address (#/tv-1234), so the back button and shared links work */
const isAnimeKey = k => /^(tv|movie)-\d+$/.test(String(k||''));
const isPageKey = k => isAnimeKey(k) || String(k||'').startsWith('friend:');
const urlOf = k => isAnimeKey(k) ? '#/'+k : '#/u/'+String(k).slice(7);
let pushedPage = false, pageReturn = null;
async function openSheet(key, fromUrl){
  if (sheetId!==key){ openSeason = null; pick = null; }
  if (!isPageKey(sheetId)) { lastFocus = document.activeElement; pageReturn = window.scrollY; }
  if (!fromUrl && location.hash!==urlOf(key)){ history.pushState({page:key}, '', urlOf(key)); pushedPage = true; }
  sheetId = key; showSheet(); $('#sheet').classList.add('page'); $('#sheet').scrollTop = 0;
  if (dcache[key]) renderSheet(); else $('#sheet').innerHTML = `${PAGE_BACK()}<p class="msg" style="padding:24px">Chargement…</p>`;
  const c = $('#sheet .page-back'); c && c.focus({preventScroll:true});
  if (!fresh(dcache[key])){
    try{ await details(key, true); if (sheetId===key) renderSheet(); }
    catch(e){ if (sheetId===key && !dcache[key]) $('#sheet').innerHTML = `${PAGE_BACK()}<p class="msg bad" style="padding:24px">${esc(e.message)}</p>`; }
  }
  loadRelated(key);
}
const PAGE_BACK = () => `<div class="page-bar"><button class="page-back" type="button" data-close aria-label="Retour">${ICON.back} Retour</button></div>`;
function closeSheet(force, fromUrl){
  if (sheetId==='pseudo' && !force) return;
  const wasPage = isPageKey(sheetId);
  if (wasPage && !fromUrl && location.hash.startsWith('#/')){
    if (pushedPage){ pushedPage = false; history.back(); return; }   // the popstate below finishes closing
    history.replaceState(null, '', location.pathname + location.search);
  }
  sheetId = null; document.title = 'Mes Animes'; $('#scrim').hidden = true; $('#sheet').hidden = true; $('#sheet').innerHTML=''; $('#sheet').classList.remove('page'); document.body.style.overflow='';
  if (wasPage && pageReturn!=null) window.scrollTo({top:pageReturn});
  if (lastFocus && document.contains(lastFocus)) lastFocus.focus({preventScroll:true});
}
function followUrl(){
  const m = location.hash.match(/^#\/((?:tv|movie)-\d+)$/), u = location.hash.match(/^#\/u\/([\w-]{6,64})$/);
  if (!me || !profile) return;
  if (m){ if (sheetId!==m[1]) openSheet(m[1], true); }
  else if (u){ if (sheetId!=='friend:'+u[1]) openFriend(u[1], true); }
  else if (isPageKey(sheetId)){ pushedPage = false; closeSheet(false, true); }
}
window.addEventListener('popstate', () => { if (!location.hash.startsWith('#/')) pushedPage = false; followUrl(); });
// films that go with a show, and the other films of a movie series
async function loadRelated(key){
  if (relCache.has(key)) return;
  const d = dcache[key] || await details(key).catch(()=>null); if (!d) return;
  relCache.set(key, null);
  try{
    let list = [];
    if (d.kind==='movie' && d.coll){
      const c = await tmdb(`/collection/${d.coll.id}`);
      list = (c.parts||[]).map(x => normHit(x,'movie')).filter(h => h.key!==key);
    } else {
      const base = s => String(s||'').toLowerCase().split(/[:：\-–(]/)[0].replace(/\b(the|saison|season)\b.*$/,'').trim();
      const names = [...new Set([base(d.t), base(d.ot)].filter(s => s.length>=3))];
      const res = await Promise.all(names.map(nm => tmdb('/search/movie', {query:nm, include_adult:false}).catch(()=>({results:[]}))));
      const seen = new Set();
      list = res.flatMap(r => r.results||[]).filter(x => (x.genre_ids||[]).includes(16) && !seen.has(x.id) && seen.add(x.id))
        .filter(x => names.some(nm => String(x.title||'').toLowerCase().includes(nm) || String(x.original_title||'').toLowerCase().includes(nm)))
        .map(x => normHit(x,'movie'));
    }
    list.forEach(h => hits.set(h.key, h));
    relCache.set(key, list.sort((a,b)=>(a.yr||'9999').localeCompare(b.yr||'9999')));
  }catch(e){ relCache.set(key, []); }
  if (sheetId===key) renderSheet();
}
function renderSheet(){
  if (sheetId==null) return;
  if (sheetId==='settings') return renderSettings();
  if (sheetId==='pseudo') return;
  if (String(sheetId).startsWith('friend:')) return renderFriend(sheetId.slice(7));
  const key = sheetId, d = dcache[key]; if (!d) return;
  const e = entries.get(key);
  const facts = [d.kind==='tv'?'Série':'Film', d.kind==='tv'&&TV_STATUS[d.status], d.yr, d.kind==='tv'&&d.seasons.length&&plural(d.seasons.length,'saison','saisons'), d.kind==='tv'&&d.total&&`${d.total} épisodes`,
    d.runtime&&`${d.runtime} min${d.kind==='tv'?' par épisode':''}`, d.studio, d.vote&&`${(Math.round(d.vote*10)/10).toLocaleString('fr-FR')}/10 sur TMDB`].filter(Boolean);
  let you = '';
  if (e){
    let stars = ''; for (let i=1;i<=10;i++) stars += `<button type="button" class="${e.score>=i?'on':''}" data-score="${i}" aria-label="Noter ${i} sur 10" aria-pressed="${e.score===i}">${i}</button>`;
    you = `<div class="block"><h3>Ma liste</h3>
        <div class="seg" role="group" aria-label="Statut">${Object.entries(STATUS).map(([k,l])=>`<button type="button" data-st="${key}|${k}" aria-pressed="${e.st===k}">${l}</button>`).join('')}</div></div>
      <div class="block"><h3>Ma note</h3><div class="stars">${stars}</div></div>
      <div class="block"><div class="links"><button class="reco" type="button" data-reco aria-pressed="${!!e.reco}">${ICON.heart} ${e.reco?'Tu le recommandes':'Je le recommande'}</button>
        <button class="reco" type="button" data-fav aria-pressed="${!!e.fav}">${ICON.star} ${e.fav?'Dans tes préférés':'Préféré'}</button></div>
        <p class="note" style="margin-top:6px">Tes abonnés le verront dans leurs recommandations.</p></div>
      <div class="block"><h3><label for="noteIn">Mon avis</label></h3><textarea id="noteIn" placeholder="Ce que tu en as pensé, ton épisode préféré, à qui le conseiller…">${esc(e.note)}</textarea>
        <p class="note" style="margin-top:4px">Visible par tes abonnés, qui peuvent le commenter.</p>${e.note || e.score ? thread(me.uid, key) : ''}</div>`;
  } else {
    you = `<div class="block"><h3>Ajouter à ma liste</h3><div class="links">
      <button class="btn primary" type="button" data-st="${key}|plan">${ICON.plus} À regarder</button>
      <button class="btn" type="button" data-st="${key}|watching">Je le regarde</button>
      <button class="btn" type="button" data-st="${key}|done">${ICON.check} Déjà vu</button></div></div>`;
  }
  const keepScroll = $('#sheet').scrollTop;
  document.title = `${d.t} · Mes Animes`;
  $('#sheet').innerHTML = `
    ${PAGE_BACK()}
    <div class="sh-hero" style="${d.back?`background-image:url('${esc(IMG(d.back,'w1280'))}')`:''}"></div>
    <div class="page-in">
    <div class="sh-head"><div class="cover">${d.poster?`<img src="${esc(IMG(d.poster,'w500'))}" alt="">`:''}</div>
      <div style="min-width:0"><h2 id="shTitle">${esc(d.t)}</h2>${d.ot && d.ot!==d.t ? `<div class="alt">${esc(d.ot)}</div>`:''}</div>
      <div class="head-facts"><div class="facts">${facts.map(f=>`<span class="fact">${esc(f)}</span>`).join('')}${d.genres.map(g=>`<span class="fact">${esc(g)}</span>`).join('')}</div>${nextLine(d)}</div></div>
    <div class="page-cols">
      <div class="sh-body">
        ${d.kind==='tv' ? seasonsBlock(key, d, e) : ''}
        ${relatedBlock(key, d)}
      </div>
      <div class="sh-body side">
        ${you}
        ${friendsBlock(key)}
        ${whereBlock(d)}
        ${d.ov ? `<div class="block"><h3>Résumé${d.ovEn?' <span class="note" style="display:inline">(en anglais, pas encore traduit)</span>':''}</h3><p class="syn">${esc(d.ov)}</p></div>`:''}
        <div class="links"><a class="btn small" href="https://www.themoviedb.org/${d.kind}/${d.id}?language=fr" target="_blank" rel="noopener">Fiche TMDB</a>${e?`<button class="btn small danger" type="button" data-remove="${key}">Retirer de ma liste</button>`:''}</div>
      </div>
    </div></div>`;
  $('#sheet').scrollTop = keepScroll;
}
/* seasons: big rows with a clear "Marquer vue" button; "Déjà vu" first asks which seasons were seen */
let pick = null;   // {key, sel:Set of season numbers} while choosing seen seasons
const seasonLabel = s => s.n===0 ? 'Épisodes spéciaux' : (s.name && !/^saison\s*\d+$/i.test(s.name) ? `Saison ${s.n} : ${s.name}` : `Saison ${s.n}`);
function startPick(key){
  const d = dcache[key], e = entries.get(key); if (!d) return;
  const sel = new Set(d.seasons.filter(s => airedIn(d, s.n) > 0 && (!e || ((e.w||{})[s.n]||0) >= 0)).map(s => s.n));
  pick = {key, sel}; renderSheet();
  const el = document.getElementById('picker'); el && el.scrollIntoView({block:'start', behavior:'smooth'});
}
function applyPick(){
  const {key, sel} = pick, d = dcache[key]; let e = entries.get(key); if (!d){ pick = null; return; }
  const all = [...d.seasons, ...(d.specials && d.specials.eps ? [d.specials] : [])];
  const w = {...((e && e.w)||{})};
  for (const s of all){
    const full = s.n===0 ? s.eps : (airedIn(d, s.n) || s.eps);
    if (sel.has(s.n)) w[s.n] = full; else if ((w[s.n]||0) >= s.eps) w[s.n] = 0;
  }
  const allSeen = d.seasons.every(s => sel.has(s.n) || airedIn(d, s.n)===0);
  const st = allSeen && sel.size ? 'done' : sel.size ? 'watching' : (e ? e.st : 'plan');
  if (!e) addFrom(key, 'plan');
  const patch = {w, st};
  if (st==='done' && (!e || e.st!=='done')) patch.finished = Date.now();
  if (st==='watching' && (!e || e.st!=='watching')) patch.started = Date.now();
  pick = null; save(key, patch);
  toast(st==='done' ? 'Rangé dans Vus. Pense à le noter !' : sel.size ? `${plural(sel.size,'saison cochée','saisons cochées')}, rangé dans En cours` : 'Rien de coché');
}
function seasonsBlock(key, d, e){
  const all = [...d.seasons, ...(d.specials && d.specials.eps ? [d.specials] : [])];
  if (!all.length) return '';
  if (pick && pick.key===key){
    return `<div class="block picker" id="picker"><h3>Quelles saisons as-tu vues ?</h3>
      <p class="note" style="margin:-2px 0 10px">Décoche celles que tu n’as pas encore vues, puis valide.</p>
      <div class="pick-list">${all.map(s => {
        const aired = s.n===0 ? s.eps : airedIn(d, s.n), on = pick.sel.has(s.n);
        return `<button class="pick-row" type="button" data-picks="${s.n}" aria-pressed="${on}" ${aired===0?'disabled':''}>
          <span class="box" aria-hidden="true">${on?ICON.check:''}</span>
          <span class="thumb">${s.poster?`<img src="${esc(IMG(s.poster,'w92'))}" alt="" loading="lazy">`:''}</span>
          <span style="min-width:0"><span class="ft">${esc(seasonLabel(s))}</span><span class="fs">${aired===0 ? 'Pas encore sortie' : `${plural(s.eps,'épisode','épisodes')}${s.air?', '+s.air.slice(0,4):''}`}</span></span></button>`;
      }).join('')}</div>
      <div class="pick-foot"><span class="links"><button class="btn small" type="button" data-pick="all">Tout cocher</button><button class="btn small" type="button" data-pick="none">Tout décocher</button></span>
        <span class="links"><button class="btn" type="button" data-pick="cancel">Annuler</button><button class="btn primary" type="button" data-pick="ok">${ICON.check} Valider</button></span></div></div>`;
  }
  return `<div class="block"><h3>Saisons${d.seasons.length?` <span class="note" style="display:inline">(${plural(d.seasons.length,'saison','saisons')}, ${d.total} épisodes)</span>`:''}</h3>
    <div class="seasons">${all.map(s => {
      const w = e ? ((e.w||{})[s.n]||0) : 0, aired = s.n===0 ? s.eps : airedIn(d, s.n), full = w>=s.eps && s.eps>0, open = openSeason===s.n;
      const sub = [e && w && !full ? `${w} sur ${s.eps} vus` : plural(s.eps,'épisode','épisodes'), s.air ? (s.air > today() ? `sortie ${fmtDay(s.air)}` : s.air.slice(0,4)) : '', aired<s.eps && aired>0 ? `${aired} sortis` : ''].filter(Boolean).join(', ');
      const mark = aired===0 && !full ? `<span class="s-mark off">Pas encore sortie</span>`
        : `<button class="s-mark${full?' on':''}" type="button" data-sall="${key}|${s.n}|${full?0:Math.max(aired,0)}" aria-pressed="${full}" aria-label="${full?'Décocher':'Marquer comme vue'} : ${esc(seasonLabel(s))}">${full?`${ICON.check} Vue`:'Marquer vue'}</button>`;
      return `<div class="season${open?' open':''}${full?' seen':''}">
        <div class="season-hd">
          <button class="fam-open" type="button" data-season="${s.n}" aria-expanded="${open}" title="Voir les épisodes">
            <span class="thumb">${s.poster?`<img src="${esc(IMG(s.poster,'w92'))}" alt="" loading="lazy">`:''}</span>
            <span style="min-width:0"><span class="ft">${esc(seasonLabel(s))}</span><span class="fs">${esc(sub)}</span>
              ${e && w && !full ? `<span class="s-bar"><i style="width:${Math.round(w/(s.eps||1)*100)}%"></i></span>` : ''}</span>
          </button>
          ${mark}
        </div>
        ${open ? (e ? pipsFor(key, d, e, s.n) : `<p class="note" style="padding:0 12px 12px">Coche « Marquer vue », ou ajoute l’anime à ta liste pour cocher épisode par épisode.</p>`) : ''}
      </div>`;
    }).join('')}</div>
    <p class="note" style="margin-top:6px">Touche une saison pour cocher ses épisodes un par un.</p></div>`;
}
function relatedBlock(key, d){
  const seen = new Set([key]);
  const list = [...(relCache.get(key)||[]), ...(groupMembers.get(key)||[])].filter(h => !seen.has(h.key) && seen.add(h.key)).sort((a,b)=>(a.yr||'9999').localeCompare(b.yr||'9999'));
  if (!list.length) return '';
  return `<div class="block"><h3>${d.kind==='tv'?'Films':'Dans la même série'}</h3>
    <div class="fam">${list.map(h => {
      const e = entries.get(h.key);
      const act = e ? `<span class="tag st-${e.st}">${esc(STATUS[e.st])}</span>`
        : `<button class="mini" type="button" data-st="${h.key}|plan" aria-label="Ajouter ${esc(h.t)} à regarder">${ICON.plus}</button><button class="mini" type="button" data-st="${h.key}|done" aria-label="Marquer ${esc(h.t)} comme vu">${ICON.check}</button>`;
      return `<div class="fam-row"><button class="fam-open" type="button" data-open="${h.key}">
          <span class="thumb">${h.poster?`<img src="${esc(IMG(h.poster,'w92'))}" alt="" loading="lazy">`:''}</span>
          <span style="min-width:0"><span class="ft">${esc(h.t)}</span><span class="fs">Film${h.yr?', '+h.yr:''}</span></span></button><span class="fa">${act}</span></div>`;
    }).join('')}</div></div>`;
}
/* comments: anyone who can see a review can comment it, its author can answer; the database rules check it */
const comments = new Map();     // 'owner|key' -> [{id, uid, pseudo, text, at}] (null while loading)
const openThreads = new Set();
function loadComments(owner, key, force){
  const k = owner+'|'+key;
  if (comments.has(k) && !force) return;
  if (!comments.has(k)) comments.set(k, null);
  Store.getComments(owner, key).then(l => { comments.set(k, l); if (sheetId===key) renderSheet(); }).catch(() => { comments.set(k, []); });
}
const rtf = new Intl.RelativeTimeFormat('fr', {numeric:'auto'});
function ago(t){
  const s = (t - Date.now())/1000, a = Math.abs(s);
  if (a < 60) return 'à l’instant';
  if (a < 3600) return rtf.format(Math.round(s/60), 'minute');
  if (a < 86400) return rtf.format(Math.round(s/3600), 'hour');
  if (a < 30*86400) return rtf.format(Math.round(s/86400), 'day');
  return new Date(t).toLocaleDateString('fr-FR', {day:'numeric', month:'long'});
}
function thread(owner, key){
  const k = owner+'|'+key, l = comments.get(k), open = openThreads.has(k), n = l ? l.length : 0;
  loadComments(owner, key);
  const toggle = `<button class="cmt-toggle" type="button" data-thread="${k}" aria-expanded="${open}">${ICON.chat} ${n ? plural(n,'commentaire','commentaires') : 'Commenter'}</button>`;
  if (!open) return `<div class="cmts">${toggle}</div>`;
  const people = l || [];
  return `<div class="cmts">${toggle}
    <div class="cmt-list">${people.map(c => `<div class="cmt">${avatar(c.pseudo, false, (friends.get(c.uid)||{}).color, c.uid===me.uid ? profile.photo : (friends.get(c.uid)||{}).photo)}
      <div class="cmt-b"><div class="cmt-h"><b>${esc(c.pseudo)}</b><span class="note">${esc(ago(c.at))}</span>${c.uid===me.uid || owner===me.uid ? `<button class="cmt-del" type="button" data-cdel="${k}|${c.id}" aria-label="Supprimer ce commentaire">${ICON.close}</button>` : ''}</div>
      <p>${esc(c.text)}</p></div></div>`).join('')}${l===null ? '<p class="note">Chargement…</p>' : ''}</div>
    <form class="cmt-form" data-cform="${k}"><input type="text" maxlength="500" placeholder="${owner===me.uid ? 'Répondre…' : 'Écrire un commentaire…'}" aria-label="Écrire un commentaire" enterkeyhint="send" autocomplete="off"><button class="btn small primary" type="submit">Envoyer</button></form>
  </div>`;
}
async function sendComment(k, text){
  const [owner, key] = k.split('|'); text = text.trim().slice(0, 500); if (!text) return;
  const c = {uid:me.uid, pseudo:profile.pseudo, text, at:Date.now()};
  const l = comments.get(k) || []; const tmp = {...c, id:'tmp'+Date.now()}; comments.set(k, [...l, tmp]); renderSheet();
  try{ const id = await Store.addComment(owner, key, c); tmp.id = id; }
  catch(e){ comments.set(k, (comments.get(k)||[]).filter(x => x!==tmp)); renderSheet(); toast('Commentaire pas envoyé, réessaie.'); }
}
async function deleteComment(k, id){
  const [owner, key] = k.split('|');
  comments.set(k, (comments.get(k)||[]).filter(c => c.id!==id)); renderSheet();
  Store.delComment(owner, key, id).catch(() => { toast('Pas supprimé, réessaie.'); loadComments(owner, key, true); });
}
function friendsBlock(key){
  const on = friendsOn(key); if (!on.length) return '';
  const mineE = entries.get(key), myScore = mineE && mineE.score;
  return `<div class="block"><h3>Tes amis</h3><div class="fr-says">${on.map(({f,e}) => {
    const bits = [STATUS[e.st], e.kind==='tv' && e.st==='watching' && watchedTotal(e) ? plural(watchedTotal(e),'épisode vu','épisodes vus') : '', e.score ? `${e.score}/10` : '', e.reco ? 'recommande' : ''].filter(Boolean);
    const cmp = e.score && myScore ? `<span class="cmp">toi ${myScore}/10</span>` : '';
    return `<div class="say">${avatar(f.pseudo, false, f.color, f.photo)}<div style="min-width:0"><div class="l"><button class="link-btn" type="button" data-friend="${f.uid}" style="all:unset;cursor:pointer;font-weight:700">${esc(f.pseudo)}</button> : ${esc(bits.join(', '))} ${cmp}</div>${e.note?`<p>${esc(e.note)}</p>`:''}${e.note || e.score ? thread(f.uid, key) : ''}</div></div>`;
  }).join('')}</div></div>`;
}
function whereBlock(d){
  const mine = myPlatforms();
  const flat = [...d.pv.flat].sort((a,b) => (mine.includes((svcOf(b.name)||{}).key)) - (mine.includes((svcOf(a.name)||{}).key)));
  const link = d.pv.link || `https://www.themoviedb.org/${d.kind}/${d.id}/watch?locale=FR`;
  const prov = p => { const s = svcOf(p.name), isMine = s && mine.includes(s.key);
    return `<a class="prov${isMine?' mine':''}" href="${esc(link)}" target="_blank" rel="noopener">${p.logo?`<img src="${esc(IMG(p.logo,'w92'))}" alt="">`:''}<span>${esc(p.name)}${isMine?'<br><span class="mine-t">Ton abonnement</span>':''}</span></a>`; };
  const searchLinks = SERVICES.filter(s => s.search && mine.includes(s.key) && !flat.some(p => (svcOf(p.name)||{}).key===s.key));
  return `<div class="block"><h3>Où le regarder en France</h3>
    ${flat.length ? `<div class="provs">${flat.map(prov).join('')}</div>` : `<p class="note">Pas dispo en abonnement en France pour l’instant.</p>`}
    ${d.pv.buy.length ? `<p class="note" style="margin-top:8px">À l’achat ou en location : ${esc(d.pv.buy.map(p=>p.name).join(', '))}.</p>` : ''}
    ${searchLinks.length ? `<div class="links" style="margin-top:10px">${searchLinks.map(s=>`<a class="btn small" href="${esc(s.search(d.t))}" target="_blank" rel="noopener">Chercher sur ${esc(s.name)}</a>`).join('')}</div>`:''}
    <p class="note" style="margin-top:8px">Dispos fournies par JustWatch.</p></div>`;
}
/* profile pages (#/u/<id>): banner, avatar, bio, favourites and stats; the list part only for accepted followers */
let editingProfile = false;
function openFriend(uid, fromUrl){
  if (!isPageKey(sheetId)) { lastFocus = document.activeElement; pageReturn = window.scrollY; }
  const key = 'friend:'+uid;
  if (!fromUrl && location.hash!==urlOf(key)){ history.pushState({page:key}, '', urlOf(key)); pushedPage = true; }
  if (sheetId!==key){ editingProfile = false; peopleTab = null; }
  sheetId = key; showSheet(); $('#sheet').classList.add('page'); $('#sheet').scrollTop = 0; renderFriend(uid);
  const c = $('#sheet .page-back'); c && c.focus({preventScroll:true});
  if (uid!==me.uid && (!friends.has(uid) || friends.get(uid).status!=='ok' || Date.now()-friends.get(uid).at > 60e3)) loadPerson(uid).then(() => { if (sheetId===key) renderFriend(uid); });
  if (uid===me.uid) [...entries.keys()].filter(k => !dcache[k]).slice(0, 30).forEach(k => details(k).then(() => { if (sheetId===key && editingProfile) renderFriend(uid); }).catch(()=>{}));
}
function statsOf(list){
  const all = [...list.values()];
  const eps = all.reduce((s,e) => s + (e.kind==='tv' ? watchedTotal(e) : 0), 0);
  const mins = all.reduce((s,e) => s + (e.kind==='tv' ? watchedTotal(e)*((e.m&&e.m.rt)||24) : (e.st==='done' ? (e.m&&e.m.rt)||100 : 0)), 0);
  const scored = all.filter(e => e.score);
  return {done:all.filter(e=>e.st==='done').length, watching:all.filter(e=>e.st==='watching').length, eps, hours:Math.round(mins/60),
    avg: scored.length ? Math.round(scored.reduce((s,e)=>s+e.score,0)/scored.length*10)/10 : 0};
}
function renderFriend(uid){
  const mine = uid===me.uid;
  const f = mine ? {uid, pseudo:profile.pseudo, status:'ok', list:entries, bio:profile.bio||'', color:profile.color||'', banner:profile.banner||'', photo:profile.photo||'',
      nFollowers:(profile.followers||[]).length, nFollowing:following().length, followerIds:profile.followers||[], followingIds:following(), private:isPrivate(profile)} : friends.get(uid);
  if (!f){ $('#sheet').innerHTML = `${PAGE_BACK()}<p class="msg" style="padding:70px 24px">Chargement…</p>`; return; }
  if (f.status==='gone'){ $('#sheet').innerHTML = `${PAGE_BACK()}<p class="msg" style="padding:70px 24px">Ce compte n’existe plus.</p>`; return; }
  document.title = `${f.pseudo} · Mes Animes`;
  const on = following().includes(uid);
  const st = f.status==='ok' ? statsOf(f.list) : null;
  const action = mine ? `<button class="btn small" type="button" id="editProfile">${editingProfile?'Fermer l’édition':'Modifier mon profil'}</button><button class="btn small" type="button" id="openSettings2">Réglages</button>`
    : f.status==='ok' ? (on ? `<button class="btn small" type="button" data-unfollow="${uid}">Abonné</button>` : `<button class="btn small primary" type="button" data-follow="${uid}|${esc(f.pseudo)}">${ICON.plus} Suivre</button>`)
    : f.status==='pending' ? `<button class="btn small" type="button" data-unfollow="${uid}">Demande envoyée</button>`
    : `<button class="btn small primary" type="button" data-follow="${uid}|${esc(f.pseudo)}">${ICON.plus} Demander à suivre</button>`;
  const canList = mine || f.status==='ok';
  const countBtn = (kind, n, one, many) => canList
    ? `<button class="pf-count" type="button" data-people="${kind}" aria-expanded="${peopleTab===kind}"><b class="num">${n}</b> ${n>1?many:one}</button>`
    : `<span class="pf-count"><b class="num">${n}</b> ${n>1?many:one}</span>`;
  const counts = [countBtn('followers', f.nFollowers||0, 'abonné', 'abonnés'), countBtn('following', f.nFollowing||0, 'abonnement', 'abonnements')];
  const head = `
    <div class="pf-top"><div class="pf-bg" style="${bannerStyle(f)}" aria-hidden="true"></div><div class="pf-banner" style="${bannerStyle(f)}"></div></div>
    <div class="page-in">
      <div class="pf-head">
        ${avatar(f.pseudo, true, f.color, f.photo)}
        <div class="pf-id"><h2 id="shTitle">${esc(f.pseudo)}</h2>
          <p class="note">${f.private?`${ICON.lock} Profil privé`:'Profil public'}${!mine && f.followsMe?', te suit':''}</p></div>
        <div class="pf-act">${action}</div>
      </div>
      ${f.bio ? `<div class="pf-about"><h3>Bio</h3><p>${esc(f.bio)}</p></div>` : mine && !editingProfile ? `<div class="pf-about empty-bio"><h3>Bio</h3><p class="note">Présente-toi en quelques mots avec « Modifier mon profil ».</p></div>` : ''}
      <p class="pf-counts">${counts.join('')}</p>
      ${canList && peopleTab ? peopleBlock(f, mine) : ''}`;
  let body = '';
  if (mine && editingProfile) body += profileEditor();
  if (f.status!=='ok'){
    body += `<div class="sh-body"><div class="private-box"><span class="lock" aria-hidden="true">${ICON.lock}</span>${f.status==='pending'
      ? `<p class="note" style="font-size:14px">Ta demande est envoyée. Dès que ${esc(f.pseudo)} l’accepte, tu verras ses préférés, ce qu’il a vu, ses notes et ce qu’il recommande.</p><div class="links"><button class="btn small danger" type="button" data-unfollow="${uid}">Annuler la demande</button></div>`
      : `<p class="note" style="font-size:14px">Sa liste est privée. Envoie-lui une demande : s’il accepte, tu verras ses préférés, ce qu’il a vu, ses notes et ce qu’il recommande.</p>`}</div></div>`;
  } else {
    const l = [...f.list.entries()].sort((a,b)=>(b[1].updated||0)-(a[1].updated||0));
    const pick = s2 => l.filter(([,e]) => e.st===s2);
    const myNote = k => { const m = !mine && entries.get(k); return m && m.score ? `Toi : ${m.score}/10` : ''; };
    const shelf = (arr, opts) => `<div class="shelf">${arr.map(([k,e]) => posterCard(k, e.m||{t:'…'}, {friend:!mine, sub:myNote(k), score:e.score||0, heart:e.reco, ...opts(e)})).join('')}</div>`;
    const favs = l.filter(([,e]) => e.fav).slice(0,4), reco = l.filter(([,e]) => e.reco), watching = pick('watching'), done = pick('done').sort((a,b)=>(b[1].score||0)-(a[1].score||0)), plan = pick('plan');
    const common = mine ? 0 : l.filter(([k,e]) => e.st==='done' && entries.get(k) && entries.get(k).st==='done').length;
    body += `<div class="sh-body">
      ${favs.length ? `<div class="block"><h3>${mine?'Mes préférés':'Ses préférés'}</h3><div class="favs">${favs.map(([k,e]) => posterCard(k, e.m||{t:'…'}, {friend:true, sub:''})).join('')}</div></div>`
        : mine ? `<p class="note">Choisis tes 4 animes préférés avec le bouton « Préféré » sur leur page : ils s’afficheront en haut de ton profil.</p>` : ''}
      ${st && (st.eps||st.done) ? `<div class="pf-stats">
        <div><b class="num">${st.done}</b><span>animes vus</span></div><div><b class="num">${st.watching}</b><span>en cours</span></div>
        <div><b class="num">${st.eps.toLocaleString('fr-FR')}</b><span>épisodes</span></div><div><b class="num">${st.hours.toLocaleString('fr-FR')} h</b><span>devant l’écran</span></div>
        ${st.avg?`<div><b class="num">${st.avg.toLocaleString('fr-FR')}</b><span>note moyenne</span></div>`:''}${common?`<div><b class="num">${common}</b><span>en commun avec toi</span></div>`:''}</div>` : ''}
      ${reco.length ? `<div class="block"><h3>${mine?'Mes recommandations':'Ses recommandations'}</h3>${shelf(reco, () => ({}))}</div>` : ''}
      ${watching.length ? `<div class="block"><h3>En cours</h3>${shelf(watching, e => ({score:0, heart:false, sub: e.kind==='tv' && watchedTotal(e) ? plural(watchedTotal(e),'épisode vu','épisodes vus') : ''}))}</div>` : ''}
      ${done.length ? `<div class="block"><h3>Vus</h3>${shelf(done, () => ({}))}</div>` : ''}
      ${plan.length ? `<div class="block"><h3>À regarder</h3>${shelf(plan, () => ({score:0}))}</div>` : ''}
      ${!l.length ? `<p class="msg">${mine?'Ta liste est vide pour l’instant.':'Sa liste est vide pour l’instant.'}</p>` : ''}
    </div>`;
  }
  const keep = $('#sheet').scrollTop;
  $('#sheet').innerHTML = `${PAGE_BACK()}${head}${body}</div>`;
  $('#sheet').scrollTop = keep;
}
const bannerCache = new Map();   // uid -> imported banner picture
function bannerStyle(f){
  if (f.banner==='custom'){
    const img = bannerCache.get(f.uid);
    if (img===undefined){ bannerCache.set(f.uid, null); Store.getImages(f.uid).then(d => { bannerCache.set(f.uid, okImg(d.banner) ? d.banner : ''); if (sheetId==='friend:'+f.uid) renderFriend(f.uid); }); }
    if (okImg(img)) return `background-image:url('${img}')`;
    return `--bc:${esc(f.color||avColor(f.pseudo))}`;
  }
  return f.banner ? `background-image:url('${esc(IMG(f.banner,'w1280'))}')` : `--bc:${esc(f.color||avColor(f.pseudo))}`;
}
/* followers / following lists on a profile */
let peopleTab = null;
const cards = new Map();   // uid -> {pseudo, color, photo}
function cardOf(uid){
  if (uid===me.uid) return {pseudo:profile.pseudo, color:profile.color, photo:profile.photo};
  const f = friends.get(uid); if (f && f.pseudo && f.pseudo!=='?') return {pseudo:f.pseudo, color:f.color, photo:f.photo};
  if (!cards.has(uid)){ cards.set(uid, null); Store.getProfile(uid).then(p => { cards.set(uid, p ? {pseudo:p.pseudo, color:p.color, photo:p.photo} : {pseudo:'Compte supprimé'}); if (p) pseudoCache.set(uid, p.pseudo); if (String(sheetId).startsWith('friend:')) renderFriend(sheetId.slice(7)); }).catch(() => cards.set(uid, {pseudo:'?'})); }
  return cards.get(uid);
}
function peopleBlock(f, mine){
  const ids = peopleTab==='followers' ? (f.followerIds||[]) : (f.followingIds||[]);
  const tabs = `<div class="seg pf-tabs" role="tablist"><button type="button" role="tab" data-people="followers" aria-pressed="${peopleTab==='followers'}">Abonnés (${(f.followerIds||[]).length})</button><button type="button" role="tab" data-people="following" aria-pressed="${peopleTab==='following'}">Abonnements (${(f.followingIds||[]).length})</button></div>`;
  const rows = ids.map(uid => {
    const c = cardOf(uid);
    if (!c) return `<div class="res"><span class="av" aria-hidden="true"></span><span class="note">Chargement…</span></div>`;
    let act = '';
    if (uid===me.uid) act = `<span class="note">C’est toi</span>`;
    else if (mine && peopleTab==='followers') act = `${following().includes(uid) ? '' : `<button class="btn small primary" type="button" data-follow="${uid}|${esc(c.pseudo)}">${ICON.plus} Suivre en retour</button>`}<button class="btn small" type="button" data-rmfollower="${uid}">Retirer</button>`;
    else if (mine && peopleTab==='following') { const st = (friends.get(uid)||{}).status; act = `<button class="btn small" type="button" data-unfollow="${uid}">${st==='pending'?'Annuler la demande':'Ne plus suivre'}</button>`; }
    else if (!following().includes(uid)) act = `<button class="btn small" type="button" data-friend="${uid}">Voir le profil</button>`;
    return `<div class="res"><button class="who-btn" type="button" data-friend="${uid}">${avatar(c.pseudo, false, c.color, c.photo)}<b>${esc(c.pseudo)}</b></button><span class="req-act">${act}</span></div>`;
  }).join('');
  const empty = peopleTab==='followers' ? (mine ? 'Personne ne te suit encore. Partage ton pseudo à tes potes !' : 'Personne ne le suit encore.') : (mine ? 'Tu ne suis personne pour l’instant : cherche tes amis dans l’onglet Amis.' : 'Il ne suit personne pour l’instant.');
  return `<div class="pf-people">${tabs}${ids.length ? `<div class="results">${rows}</div>` : `<p class="note">${empty}</p>`}</div>`;
}
function profileEditor(){
  const banners = [...entries.keys()].map(k => dcache[k]).filter(d => d && d.back);
  return `<div class="sh-body"><div class="pf-edit">
    <div class="block"><h3>Photo de profil</h3>
      <div class="up-row">${avatar(profile.pseudo, true, profile.color, profile.photo)}
        <label class="btn small primary" style="cursor:pointer">Choisir une photo<input type="file" id="photoIn" accept="image/*" hidden></label>
        ${profile.photo ? `<button class="btn small" type="button" id="photoOff">Retirer</button>` : ''}</div>
      <p class="note" style="margin-top:6px">Elle est recadrée en carré, au centre.</p></div>
    <div class="block"><h3><label for="bioIn">Bio</label></h3>
      <textarea id="bioIn" maxlength="160" placeholder="Ce que tu aimes regarder, ton anime de cœur, tes plateformes…">${esc(profile.bio||'')}</textarea>
      <p class="note"><span id="bioCount">${(profile.bio||'').length}</span>/160</p></div>
    <div class="block"><h3>Couleur de l’avatar</h3><div class="swatches">${PCOLORS.map(c => `<button type="button" class="sw${(profile.color||avColor(profile.pseudo))===c?' on':''}" style="--sw:${c}" data-color="${c}" aria-label="Couleur ${c}" aria-pressed="${(profile.color||avColor(profile.pseudo))===c}"></button>`).join('')}</div></div>
    <div class="block"><h3>Bannière</h3>
      <div class="up-row" style="margin-bottom:10px"><label class="btn small primary" style="cursor:pointer">Importer une image<input type="file" id="bannerIn" accept="image/*" hidden></label>
        ${profile.banner==='custom' ? `<span class="note">Ton image est utilisée.</span>` : ''}</div>
      <p class="note" style="margin-bottom:8px">Elle est recadrée au format large (3 × 1). Tu peux aussi prendre l’image d’un anime de ta liste :</p>
      ${banners.length ? `<div class="banners"><button type="button" class="bn none${!profile.banner?' on':''}" data-banner="" aria-pressed="${!profile.banner}">Aucune</button>${banners.map(d => `<button type="button" class="bn${profile.banner===d.back?' on':''}" data-banner="${esc(d.back)}" aria-pressed="${profile.banner===d.back}" aria-label="${esc(d.t)}" style="background-image:url('${esc(IMG(d.back,'w300'))}')"></button>`).join('')}</div>`
        : `<p class="note">Ajoute des animes à ta liste : leurs images pourront aussi servir de bannière.</p>`}</div>
  </div></div>`;
}
function saveProfileField(patch, msg){
  Object.assign(profile, patch);
  Store.setProfile(me.uid, {pseudo:profile.pseudo, ...patch}).then(() => msg && toast(msg)).catch(e => toast(String(e&&e.code||'').includes('permission-denied') ? 'La base refuse la modification : colle les nouvelles règles Firestore puis réessaie.' : 'Pas enregistré, réessaie.'));
}
function openSettings(){ lastFocus = document.activeElement; sheetId = 'settings'; showSheet(); $('#sheet').classList.remove('page'); renderSettings(); $('#sheet .sh-close').focus();
  const missing = (profile.followers||[]).filter(uid => !pseudoCache.has(uid));
  if (missing.length) Promise.all(missing.map(pseudoOf)).then(() => { if (sheetId==='settings') renderSettings(); }); }
function renderSettings(){
  $('#sheet').innerHTML = `
    <button class="sh-close" type="button" data-close aria-label="Fermer">${ICON.close}</button>
    <div class="sh-body" style="padding-top:22px">
      <h2 id="shTitle" style="font-family:var(--display);font-weight:400;font-size:22px;margin:0">Réglages</h2>
      <div class="block"><h3>Mes plateformes</h3>
        <p class="note" style="margin-bottom:8px">Elles sont mises en avant sur chaque anime, et le filtre « Mes plateformes » s’en sert.</p>
        <div class="chk">${SERVICES.map(s=>`<label><input type="checkbox" data-plat="${s.key}" ${myPlatforms().includes(s.key)?'checked':''}>${esc(s.name)}</label>`).join('')}</div></div>
      <div class="block"><h3>Confidentialité</h3>
        <label class="check-line"><input type="checkbox" id="privateIn" ${isPrivate(profile)?'checked':''}> Profil privé</label>
        <p class="note" style="margin-top:4px">${isPrivate(profile) ? 'Seules les personnes que tu acceptes voient ta liste, tes notes et tes avis. Les autres voient juste ton pseudo.' : 'Toute personne connectée au site peut voir ta liste, sans demande.'}</p></div>
      <div class="block"><h3>Mes abonnés <span class="note" style="display:inline">(${(profile.followers||[]).length})</span></h3>
        ${(profile.followers||[]).length ? `<div class="results" id="followersList">${(profile.followers||[]).map(uid => `<div class="res">${avatar(pseudoCache.get(uid)||'?')}<b>${esc(pseudoCache.get(uid)||'…')}</b><button class="btn small" type="button" data-rmfollower="${uid}">Retirer</button></div>`).join('')}</div>`
          : `<p class="note">Personne ne voit encore ta liste. Les demandes que tu acceptes apparaissent ici.</p>`}</div>
      <div class="block"><h3>Mon pseudo</h3>${pseudoForm(profile.pseudo, false)}</div>
      <div class="block"><h3>Mon compte</h3>
        <p class="note" style="margin-bottom:8px">Connecté avec Google${me.name?` (${esc(me.name)})`:''}. Ta liste est enregistrée en ligne et la même sur tous tes appareils.</p>
        <div class="links"><button class="btn small" type="button" id="exp">Télécharger ma liste</button><button class="btn small danger" type="button" id="signout">Me déconnecter</button></div></div>
      <div class="block credit"><img src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg" alt="TMDB">
        <p class="note">This product uses the TMDB API but is not endorsed or certified by TMDB. Infos et images : <a href="https://www.themoviedb.org" target="_blank" rel="noopener">TMDB</a>. Dispos en France : <a href="https://www.justwatch.com/fr" target="_blank" rel="noopener">JustWatch</a>.</p></div>
    </div>`;
}
function exportList(){
  const data = {app:'mes-animes', v:2, pseudo:profile.pseudo, saved:new Date().toISOString(), entries:Object.fromEntries(entries)};
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], {type:'application/json'}));
  a.download = `mes-animes-${new Date().toISOString().slice(0,10)}.json`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ---------- toast ---------- */
let toastT = null;
function toast(text, action, fn){
  const t = $('#toast'); clearTimeout(toastT);
  t.innerHTML = `<span>${esc(text)}</span>${action?`<button type="button" id="toastAct">${esc(action)}</button>`:''}`; t.hidden = false;
  if (action) $('#toastAct').onclick = () => { t.hidden = true; fn(); };
  toastT = setTimeout(() => t.hidden = true, action ? 6000 : 3500);
}

/* ---------- events ---------- */
document.addEventListener('click', async ev => {
  const t = ev.target.closest('button,[data-open],a,label'); if (!t) return;
  const d = t.dataset;
  if (t.id==='signin'){ t.disabled = true; try{ await Store.signIn(); }catch(e){ toast('La connexion a échoué : réessaie.'); } t.disabled = false; return; }
  if (d.tab){ ui.tab = d.tab; q=''; saveUi(); render(); window.scrollTo({top:0}); return; }
  if (d.go){ ui.tab = d.go; q=''; saveUi(); render(); const i=$('#q'); i && i.focus(); return; }
  if (d.add){ const h = hits.get(d.add); addFrom(d.add, 'plan'); toast(`${h?h.t:'Anime'} ajouté à regarder`, 'Annuler', () => remove(d.add)); return; }
  if (d.open){ if (sheetId && !isPageKey(sheetId)) closeSheet(); openSheet(d.open); return; }
  if (d.close!==undefined){ closeSheet(); return; }
  if (d.friend){ if (sheetId && !isPageKey(sheetId)) closeSheet(); openFriend(d.friend); return; }
  if (d.follow){ const [uid, p] = d.follow.split('|'); t.disabled = true; follow(uid, p); return; }
  if (d.accept){ const r = requests.find(x => x.uid===d.accept); if (r){ t.disabled = true; acceptRequest(r); } return; }
  if (d.decline){ const r = requests.find(x => x.uid===d.decline); if (r) declineRequest(r); return; }
  if (d.rmfollower){ removeFollower(d.rmfollower, pseudoCache.get(d.rmfollower)||'Cette personne'); return; }
  if (d.unfollow){ unfollow(d.unfollow); return; }
  if (d.ep){ const [key, n, i] = d.ep.split('|'); const e = entries.get(key); const cur = e ? ((e.w||{})[+n]||0) : 0; setEp(key, +n, cur===+i ? +i-1 : +i); return; }
  if (d.plus){ plusOne(d.plus); return; }
  if (d.sall){ const [key, n, v] = d.sall.split('|'), dd = dcache[key];
    if (!entries.has(key)){ if (dd && dd.seasons.length<=1 && +n>0){ setStatus(key, 'done'); return; } addFrom(key, 'watching'); }
    setEp(key, +n, +v); return; }
  if (d.picks!==undefined){ const n = +d.picks; pick.sel.has(n) ? pick.sel.delete(n) : pick.sel.add(n); renderSheet(); return; }
  if (d.pick){ const dd = pick && dcache[pick.key];
    if (d.pick==='ok') applyPick();
    else if (d.pick==='cancel'){ pick = null; renderSheet(); }
    else if (dd){ pick.sel = d.pick==='all' ? new Set([...dd.seasons.filter(x => airedIn(dd, x.n)>0).map(x => x.n), ...(dd.specials&&dd.specials.eps?[0]:[])]) : new Set(); renderSheet(); }
    return; }
  if (d.season!==undefined){ openSeason = openSeason===+d.season ? null : +d.season; renderSheet(); return; }
  if (d.st){ const [key, st] = d.st.split('|');
    const dd = dcache[key], ee = entries.get(key);
    if (st==='done' && sheetId===key && dd && dd.kind==='tv' && dd.seasons.length>1 && (!ee || ee.st!=='done')){ startPick(key); return; }
    setStatus(key, st); if (st==='done' && ui.tab==='watching' && sheetId==null) toast('Rangé dans Vus. Pense à le noter !', 'Noter', () => openSheet(key)); return; }
  if (d.score){ const s = +d.score, e = entries.get(sheetId); if (e) save(sheetId, {score: e.score===s ? 0 : s}); return; }
  if (d.thread){ openThreads.has(d.thread) ? openThreads.delete(d.thread) : openThreads.add(d.thread); renderSheet(); const i = document.querySelector(`[data-cform="${d.thread}"] input`); i && i.focus({preventScroll:true}); return; }
  if (d.cdel){ const parts = d.cdel.split('|'); deleteComment(parts[0]+'|'+parts[1], parts[2]); return; }
  if (d.reco!==undefined){ const e = entries.get(sheetId); if (e) save(sheetId, {reco:!e.reco}); return; }
  if (d.fav!==undefined){ const e = entries.get(sheetId); if (!e) return;
    if (!e.fav && [...entries.values()].filter(x => x.fav).length>=4){ toast('4 préférés maximum : retire-en un pour ajouter celui-ci.'); return; }
    save(sheetId, {fav:!e.fav}); toast(e.fav ? 'Retiré de tes préférés' : 'Ajouté à tes préférés, en haut de ton profil'); return; }
  if (d.color){ saveProfileField({color:d.color}); renderFriend(me.uid); return; }
  if (d.banner!==undefined){ saveProfileField({banner:d.banner}, 'Bannière enregistrée'); renderFriend(me.uid); return; }
  if (t.id==='photoOff'){ saveProfileField({photo:''}, 'Photo retirée'); render(); renderFriend(me.uid); return; }
  if (d.people){ peopleTab = peopleTab===d.people && t.classList.contains('pf-count') ? null : d.people; renderFriend(sheetId.slice(7)); return; }
  if (t.id==='editProfile'){ editingProfile = !editingProfile; renderFriend(me.uid); return; }
  if (t.id==='openSettings2'){ closeSheet(); setTimeout(openSettings, 0); return; }
  if (t.id==='myProfile'){ if (me && profile){ if (sheetId && !isPageKey(sheetId)) closeSheet(); openFriend(me.uid); } return; }
  if (d.remove){ closeSheet(); remove(d.remove); return; }
  if (t.id==='mine'){ ui.mine = !ui.mine; saveUi(); render(); return; }
  if (t.id==='animeOnly' || t.id==='showAll'){ ui.animeOnly = t.id==='showAll' ? false : !ui.animeOnly; saveUi(); render(); return; }
  if (t.id==='moreRes'){ if (!disc.loading) runSearch(disc.page+1); return; }
  if (t.id==='openSettings'){ if (me && profile) openSettings(); return; }
  if (t.id==='signout'){ closeSheet(); await Store.signOut(); return; }
  if (t.id==='exp'){ exportList(); return; }
});
document.addEventListener('keydown', ev => {
  if (ev.key==='Escape' && sheetId!=null) closeSheet();
  if ((ev.key==='Enter' || ev.key===' ') && ev.target.matches('h3[data-open]')){ ev.preventDefault(); openSheet(ev.target.dataset.open); }
});
document.addEventListener('input', ev => {
  const t = ev.target;
  if (t.id==='q'){
    q = t.value;
    if (ui.tab==='discover'){ clearTimeout(searchT); if (!q.trim()){ disc.list=[]; disc.err=''; disc.key=null; render(); } else searchT = setTimeout(() => runSearch(1), 400); }
    else render();
  }
  if (t.id==='fq'){ fq = t.value; clearTimeout(fT); if (fq.trim().length<2){ fres=null; render(); } else fT = setTimeout(runFriendSearch, 350); }
  if (t.id==='bioIn'){ $('#bioCount').textContent = t.value.length; clearTimeout(t._t); const v = t.value.slice(0,160); t._t = setTimeout(() => saveProfileField({bio:v}), 800); }
  if (t.id==='noteIn'){ const e = entries.get(sheetId); if (e){ e.note = t.value; clearTimeout(t._t); const key = sheetId, v = t.value; t._t = setTimeout(() => save(key, {note:v}, {quiet:true}), 700); } }
});
document.addEventListener('change', ev => {
  const t = ev.target;
  if (t.id==='sort'){ ui.sort = t.value; saveUi(); render(); }
  if (t.dataset.plat){
    const k = t.dataset.plat, cur = myPlatforms();
    profile.platforms = t.checked ? [...new Set([...cur, k])] : cur.filter(x => x!==k);
    Store.setProfile(me.uid, {pseudo:profile.pseudo, platforms:profile.platforms}).catch(()=>toast('Pas enregistré, réessaie.'));
    disc.home = null; render();
  }
});
document.addEventListener('change', ev => {
  if (ev.target.id!=='privateIn') return;
  const val = ev.target.checked; profile.private = val; renderSettings();
  Store.setProfile(me.uid, {pseudo:profile.pseudo, private:val}).then(() => toast(val ? 'Profil privé : seules les personnes acceptées voient ta liste' : 'Profil public : tout le monde peut voir ta liste')).catch(() => toast('Pas enregistré, réessaie.'));
});
document.addEventListener('change', async ev => {
  const t = ev.target; if (t.id!=='photoIn' && t.id!=='bannerIn') return;
  const file = t.files && t.files[0]; t.value = ''; if (!file) return;

  try{
    if (t.id==='photoIn'){
      const url = await shrinkImage(file, 240, 240, 60000, true); if (!url) return;
      saveProfileField({photo:url}, 'Photo de profil enregistrée');
    } else {
      const url = await shrinkImage(file, 1500, 500, 380000); if (!url) return;
      await Store.setImages(me.uid, {banner:url}); bannerCache.set(me.uid, url);
      saveProfileField({banner:'custom'}, 'Bannière enregistrée');
    }
    render(); renderFriend(me.uid);
  }catch(e){
    const code = e && e.code ? String(e.code) : '';
    toast(code.includes('permission-denied') ? 'La base refuse l’image : colle les nouvelles règles Firestore (fichier firestore.rules) puis réessaie.'
      : code ? 'Pas enregistré : vérifie ta connexion et réessaie.' : (e && e.message) || 'Pas enregistré, réessaie.');
  }
});
document.addEventListener('submit', ev => {
  const cf = ev.target.closest && ev.target.closest('[data-cform]');
  if (cf){ ev.preventDefault(); const i = cf.querySelector('input'); const v = i.value; i.value = ''; sendComment(cf.dataset.cform, v); return; } if (ev.target.id==='pseudoForm') submitPseudo(ev); });
$('#scrim').addEventListener('click', () => closeSheet());
document.addEventListener('visibilitychange', () => { if (document.visibilityState==='visible' && me && profile){ refreshDetails(); if (ui.tab==='friends') loadFriends(); render(); } });

/* ---------- start ---------- */
// details of what I'm watching (episode counts, next episode) are refreshed quietly in the background
let refreshing = false;
async function refreshDetails(){
  if (refreshing) return; refreshing = true;
  const keys = [...entries.entries()].filter(([k,e]) => !fresh(dcache[k]) && (e.st==='watching' || !dcache[k] || e.st==='done')).map(([k]) => k);
  for (const k of keys){ try{ await details(k); }catch(e){ if (e.message.includes('Clé')) break; } await new Promise(r => setTimeout(r, 120)); }
  refreshing = false; if (keys.length) render();
}
function startList(){
  if (unsubList) unsubList();
  unsubList = Store.watchList(me.uid, m => { entries = m; listReady = true; render(); if (sheetId!=null && sheetId!=='pseudo' && !(document.activeElement && (['noteIn','bioIn'].includes(document.activeElement.id) || document.activeElement.closest('.cmt-form')))) renderSheet(); refreshDetails(); },
    () => { listReady = true; toast('Impossible de lire ta liste : vérifie les règles Firestore.'); render(); });
  if (unsubProfile) unsubProfile();
  if (Store.watchProfile) unsubProfile = Store.watchProfile(me.uid, p => { if (!p || !profile) return; const changed = JSON.stringify(p.following)!==JSON.stringify(profile.following); profile = {...profile, ...p}; if (changed) loadFriends(); render(); if (sheetId==='settings') renderSettings(); });
  if (unsubReq) unsubReq();
  if (Store.watchRequests) unsubReq = Store.watchRequests(me.uid, r => { requests = r.sort((a,b)=>(b.at||0)-(a.at||0)); render(); });
  loadFriends();
}
let unsubReq = null;
async function start(){
  render();
  if (!CONFIG.firebase || !CONFIG.tmdbKey){ if (!window.MOCK_STORE){ Store = {}; render(); return; } }
  try{ Store = window.MOCK_STORE || await firebaseStore(CONFIG.firebase); }
  catch(e){ $('#main').innerHTML = `<p class="msg bad">Le site n’arrive pas à démarrer la connexion. Recharge la page.</p>`; return; }
  Store.onUser(async u => {
    if (unsubList){ unsubList(); unsubList = null; } if (unsubProfile){ unsubProfile(); unsubProfile = null; } if (unsubReq){ unsubReq(); unsubReq = null; } requests = [];
    me = u; profile = null; entries = new Map(); listReady = false; friends.clear();
    render();
    if (!u){ closeSheet(true); return; }
    try{ profile = await Store.getProfile(u.uid); }catch(e){ profile = null; }
    if (!profile || !profile.pseudo){ profile = null; render(); openPseudo(); return; }
    render(); startList(); followUrl();
  });
}
start();
if ('serviceWorker' in navigator && location.protocol==='https:') navigator.serviceWorker.register('sw.js').catch(()=>{});
