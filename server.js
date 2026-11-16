const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const TYPES = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.js': 'text/javascript' };

function createServer({ getPin, controller, publicDir }) {
  const fails = new Map();
  const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
  const pinOk = (given) => {
    const a = Buffer.from(String(given || '')), b = Buffer.from(getPin());
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  };
  const readBody = (req) => new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 1e4) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); } });
  });

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'x-pin, content-type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    if (!url.pathname.startsWith('/api/')) {
      const rel = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      const file = path.join(publicDir, path.normalize(rel));
      if (!file.startsWith(publicDir) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      return fs.createReadStream(file).pipe(res);
    }
    const ip = req.socket.remoteAddress;
    const f = fails.get(ip) || { n: 0, until: 0 };
    if (Date.now() < f.until) return send(res, 429, { error: 'Muitas tentativas. Aguarde 1 minuto.' });
    if (!pinOk(req.headers['x-pin'])) {
      if (++f.n >= 5) { f.until = Date.now() + 60000; f.n = 0; }
      fails.set(ip, f);
      return send(res, 401, { error: 'Código inválido' });
    }
    fails.delete(ip);

    if (req.method === 'GET' && url.pathname === '/api/status') return send(res, 200, controller.status());
    if (req.method === 'POST' && url.pathname === '/api/shutdown') {
      const { seconds } = await readBody(req);
      if (!Number.isInteger(seconds) || seconds < 10 || seconds > 86400) return send(res, 400, { error: 'Tempo inválido (10 s a 24 h)' });
      controller.start(seconds);
      return send(res, 200, controller.status());
    }
    if (req.method === 'POST' && url.pathname === '/api/cancel') { controller.cancel(); return send(res, 200, controller.status()); }
    send(res, 404, { error: 'Não encontrado' });
  });
}
module.exports = { createServer };
