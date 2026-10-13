// Peer-to-peer 1v1 using PeerJS (WebRTC). The host runs the game rules;
// the guest sends actions and receives redacted snapshots. Uses the free
// public PeerJS broker only to exchange connection details.
const PREFIX = 'gielinor-gambit-v1-';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function makeCode() {
  let s = '';
  for (let i = 0; i < 5; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

// Optional self-hosted PeerJS server: ?peerhost=example.com&peerport=9000&peerpath=/myapp
function peerOptions() {
  const q = new URLSearchParams(location.search);
  const opts = { debug: 1 };
  if (q.get('peerhost')) {
    opts.host = q.get('peerhost');
    opts.port = Number(q.get('peerport')) || 443;
    opts.path = q.get('peerpath') || '/';
    opts.secure = q.has('peersecure') ? q.get('peersecure') !== '0' : opts.port === 443;
  }
  return opts;
}

export class Net {
  constructor(handlers) {
    this.h = handlers;
    this.peer = null;
    this.conn = null;
  }

  get Peer() {
    if (!window.Peer) throw new Error('Networking library failed to load.');
    return window.Peer;
  }

  host(onCode, tries = 0) {
    const code = makeCode();
    const peer = this.peer = new this.Peer(PREFIX + code, peerOptions());
    peer.on('open', () => onCode(code));
    peer.on('connection', (conn) => {
      if (this.conn && this.conn.open) { conn.on('open', () => { conn.send({ t: 'full' }); setTimeout(() => conn.close(), 500); }); return; }
      this.attach(conn);
    });
    peer.on('error', (err) => {
      if (err.type === 'unavailable-id' && tries < 4) { peer.destroy(); this.host(onCode, tries + 1); return; }
      this.h.onError(describe(err));
    });
    peer.on('disconnected', () => { if (!peer.destroyed) peer.reconnect(); });
  }

  join(code) {
    const peer = this.peer = new this.Peer(peerOptions());
    peer.on('open', () => {
      const conn = peer.connect(PREFIX + code.toUpperCase().trim(), { reliable: true, serialization: 'json' });
      this.attach(conn);
      setTimeout(() => { if (!conn.open) this.h.onError('Could not reach that room. Check the code and try again.'); }, 12000);
    });
    peer.on('error', (err) => this.h.onError(describe(err)));
  }

  attach(conn) {
    this.conn = conn;
    conn.on('open', () => this.h.onOpen());
    conn.on('data', (d) => this.h.onData(d));
    conn.on('close', () => { if (this.conn === conn) this.h.onClose(); });
    conn.on('error', (e) => this.h.onError(describe(e)));
  }

  send(msg) {
    if (this.conn && this.conn.open) this.conn.send(msg);
  }

  close() {
    try { if (this.conn) this.conn.close(); } catch (e) { /* ignore */ }
    try { if (this.peer) this.peer.destroy(); } catch (e) { /* ignore */ }
    this.conn = null; this.peer = null;
  }
}

function describe(err) {
  const t = err && err.type;
  if (t === 'peer-unavailable') return 'No duel found with that room code.';
  if (t === 'network' || t === 'server-error' || t === 'socket-error') return 'Could not reach the matchmaking server. Check your connection.';
  if (t === 'browser-incompatible') return 'Your browser does not support online play (WebRTC).';
  return (err && err.message) || 'Connection error.';
}
