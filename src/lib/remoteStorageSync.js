const API_BASE = import.meta.env.VITE_KAMEN_API_URL || 'https://kamen-app-api-staging.patriasoul.workers.dev';
const META_KEY = 'kamen-app-sync-meta-v1';
const ENABLED_KEY = 'kamen-app-remote-sync-enabled';
const IDENTITY_KEY = 'kamen-app-sync-identity-v1';
const SENSITIVE_KEY = /(token|secret|password|auth|session|access-control)/i;
let versions = new Map();
let meta = {};
let initialized = false;
let syncing = false;
let originalSetItem = null;
let originalRemoveItem = null;
let storagePatched = false;
let currentRole = 'owner';
const WORKER_SYNC_KEYS = new Set(['kamen-app-production-stages-v1','kamen-app-schedule-v1','kamen-app-saw-assignments-v1']);
const pending = new Map();

const syncableKey = key => typeof key === 'string' && key.startsWith('kamen-app-') && key !== META_KEY && key !== ENABLED_KEY && key !== IDENTITY_KEY && !SENSITIVE_KEY.test(key) && (currentRole !== 'worker' || WORKER_SYNC_KEYS.has(key));
const snapshot = value => JSON.stringify(value);
function readValue(raw) {
  try { return JSON.parse(raw); } catch { return raw; }
}
function emit(status, detail = {}) {
  try { window.dispatchEvent(new CustomEvent('kamen-app-sync-status', { detail: { status, ...detail } })); } catch {}
}
async function api(path, options = {}) {
  const response = await fetch(API_BASE + path, {
    credentials: 'include',
    ...options,
    headers: { ...(options.body ? { 'content-type': 'application/json' } : {}), ...(options.headers || {}) }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || 'Greška zajedničke pohrane (HTTP ' + response.status + ').');
    error.status = response.status;
    error.payload = body;
    throw error;
  }
  return body;
}
export function getSharedApiBase() { return API_BASE; }
export function getLocalBusinessData() {
  const records = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!syncableKey(key)) continue;
    const raw = window.localStorage.getItem(key);
    if (raw === null) continue;
    records.push({ key, value: readValue(raw) });
  }
  return records;
}
export async function getSharedIdentity() { return api('/api/me'); }
export async function bootstrapSharedCompany(name) {
  return api('/api/bootstrap', { method: 'POST', body: JSON.stringify({ name }) });
}
export async function getSharedStorageStatus() {
  const [identity, status] = await Promise.all([getSharedIdentity(), api('/api/state/status')]);
  return { ...identity, ...status };
}
export async function getSharedMembers() { return api('/api/memberships'); }
export async function inviteSharedMember(member) { return api('/api/memberships', { method: 'POST', body: JSON.stringify(member) }); }
export async function deactivateSharedMember(email) { return api('/api/memberships/' + encodeURIComponent(email), { method: 'DELETE' }); }
export async function importLocalBusinessData() {
  const records = getLocalBusinessData();
  if (!records.length) throw new Error('U ovom pregledniku nema poslovnih podataka za prijenos.');
  const result = await api('/api/state/import', { method: 'POST', body: JSON.stringify({ records }) });
  meta = Object.fromEntries(records.map(item => [item.key, { version: 1, snapshot: snapshot(item.value) }]));
  versions = new Map(records.map(item => [item.key, 1]));
  window.localStorage.setItem(META_KEY, JSON.stringify(meta));
  window.localStorage.setItem(ENABLED_KEY, 'true');
  initialized = false;
  await initializeRemoteSync();
  return { ...result, localCount: records.length };
}
export async function downloadSharedBusinessData() {
  const result = await api('/api/state');
  initialized = false;
  const nativeSet = originalSetItem || Storage.prototype.setItem;
  if (!Array.isArray(result.records) || !result.records.length) throw new Error('Zajednička pohrana još nema poslovnih podataka.');
  meta = {};
  versions = new Map();
  result.records.forEach(record => {
    const raw = snapshot(record.value);
    nativeSet.call(window.localStorage, record.key, raw);
    versions.set(record.key, record.version);
    meta[record.key] = { version: record.version, snapshot: raw };
  });
  nativeSet.call(window.localStorage, META_KEY, JSON.stringify(meta));
  nativeSet.call(window.localStorage, ENABLED_KEY, 'true');
  initialized = false;
  await initializeRemoteSync();
  return { downloaded: result.records.length };
}
async function pushKey(key, duringReconcile = false) {
  if (!syncableKey(key) || !initialized || (syncing && !duringReconcile)) return;
  const raw = window.localStorage.getItem(key);
  if (raw === null) return;
  const value = readValue(raw);
  const expected = versions.get(key) || 0;
  try {
    const result = await api('/api/state/' + encodeURIComponent(key), {
      method: 'PUT',
      body: JSON.stringify({ value, version: expected })
    });
    versions.set(key, result.version);
    meta[key] = { version: result.version, snapshot: snapshot(value) };
    originalSetItem.call(window.localStorage, META_KEY, JSON.stringify(meta));
    emit('synced', { key, version: result.version });
  } catch (error) {
    if (error.status === 409) {
      emit('conflict', { key, message: 'Ovaj zapis je promijenjen i na drugom uređaju. Lokalna promjena nije prepisala udaljeni zapis.' });
    } else {
      emit('error', { key, message: error.message });
    }
  }
}
function schedulePush(key) {
  if (!syncableKey(key) || !initialized) return;
  if (pending.has(key)) clearTimeout(pending.get(key));
  pending.set(key, setTimeout(() => {
    pending.delete(key);
    pushKey(key);
  }, 300));
}
async function reconcileRemoteState() {
  if (syncing) return;
  syncing = true;
  emit('syncing');
  try {
    const result = await api('/api/state');
    const remote = new Map((result.records || []).map(item => [item.key, item]));
    const localKeys = new Set(getLocalBusinessData().map(item => item.key));
    const conflicts = [];
    let downloaded = 0;
    for (const [key, record] of remote) {
      const localRaw = window.localStorage.getItem(key);
      const localValue = localRaw === null ? null : readValue(localRaw);
      const localSnapshot = localRaw === null ? null : snapshot(localValue);
      const previous = meta[key];
      if (localRaw === null || (previous && localSnapshot === previous.snapshot && record.version > previous.version)) {
        originalSetItem.call(window.localStorage, key, snapshot(record.value));
        meta[key] = { version: record.version, snapshot: snapshot(record.value) };
        versions.set(key, record.version);
        downloaded += 1;
      } else if (!previous && localSnapshot === snapshot(record.value)) {
        meta[key] = { version: record.version, snapshot: localSnapshot };
        versions.set(key, record.version);
      } else if (previous && localSnapshot !== previous.snapshot && record.version === previous.version) {
        versions.set(key, record.version);
        await pushKey(key, true);
      } else if (localSnapshot !== snapshot(record.value)) {
        conflicts.push(key);
      } else {
        meta[key] = { version: record.version, snapshot: localSnapshot };
        versions.set(key, record.version);
      }
    }
    for (const key of localKeys) {
      if (remote.has(key)) continue;
      if (meta[key]) { conflicts.push(key); continue; }
      versions.set(key, 0);
      await pushKey(key, true);
    }
    originalSetItem.call(window.localStorage, META_KEY, JSON.stringify(meta));
    if (downloaded) {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('focus'));
      window.dispatchEvent(new Event('kamen-app-remote-data-updated'));
    }
    emit(conflicts.length ? 'conflict' : 'ready', { downloaded, conflicts });
    return { downloaded, conflicts };
  } catch (error) {
    emit('error', { message: error.message });
    throw error;
  } finally {
    syncing = false;
  }
}
export async function initializeRemoteSync() {
  if (initialized) return { initialized: true };
  const identity = await api('/api/me');
  currentRole = identity.user?.role || 'owner';
  const identitySnapshot = { companyId: identity.company?.id || '', email: String(identity.user?.email || '').toLowerCase(), role: currentRole };
  let previousIdentity = null;
  try { previousIdentity = JSON.parse(window.localStorage.getItem(IDENTITY_KEY) || 'null'); } catch {}
  const identityChanged = previousIdentity && (previousIdentity.companyId !== identitySnapshot.companyId || previousIdentity.email !== identitySnapshot.email || previousIdentity.role !== identitySnapshot.role);
  const firstWorkerSession = currentRole === 'worker' && !previousIdentity;
  if (identityChanged || firstWorkerSession) {
    const nativeRemove = originalRemoveItem || Storage.prototype.removeItem;
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith('kamen-app-') && key !== ENABLED_KEY && key !== IDENTITY_KEY) nativeRemove.call(window.localStorage, key);
    }
    meta = {};
    versions = new Map();
    (originalSetItem || Storage.prototype.setItem).call(window.localStorage, IDENTITY_KEY, JSON.stringify(identitySnapshot));
    emit('ready', { identityChanged: true, clearedLocalCompanyData: true });
  } else {
    meta = (() => { try { return JSON.parse(window.localStorage.getItem(META_KEY) || '{}'); } catch { return {}; } })();
    versions = new Map(Object.entries(meta).map(([key, item]) => [key, Number(item.version || 0)]));
    (originalSetItem || Storage.prototype.setItem).call(window.localStorage, IDENTITY_KEY, JSON.stringify(identitySnapshot));
  }
  const result = await api('/api/state');
  if (!storagePatched) {
    originalSetItem = Storage.prototype.setItem;
    originalRemoveItem = Storage.prototype.removeItem;
    Storage.prototype.setItem = function(key, value) {
      originalSetItem.call(this, key, value);
      schedulePush(String(key));
    };
    Storage.prototype.removeItem = function(key) {
      originalRemoveItem.call(this, key);
      if (syncableKey(String(key)) && initialized) emit('conflict', { key: String(key), message: 'Brisanje zapisa nije automatski sinkronizirano. Zatraži usklađivanje prije brisanja na drugom uređaju.' });
    };
    window.addEventListener('storage', event => { if (event.key) schedulePush(event.key); });
    window.addEventListener('focus', () => { reconcileRemoteState().catch(() => {}); });
    storagePatched = true;
  }
  initialized = true;
  const remoteKeys = new Set((result.records || []).map(item => item.key));
  if (!remoteKeys.size) {
    emit('ready', { remoteEmpty: true });
    return { initialized: true, remoteEmpty: true };
  }
  const reconciled = await reconcileRemoteState();
  return { initialized: true, ...reconciled };
}
export async function syncRemoteNow() { if (!initialized) await initializeRemoteSync(); return reconcileRemoteState(); }
export function enableRemoteSyncFlag() {
  window.localStorage.setItem(ENABLED_KEY, 'true');
}
export function isRemoteSyncEnabled() {
  return window.localStorage.getItem(ENABLED_KEY) === 'true';
}
