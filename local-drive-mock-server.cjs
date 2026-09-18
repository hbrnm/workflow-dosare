const http = require('http');
const url = require('url');
const { StringDecoder } = require('string_decoder');

const PORT = 3000;
let cars = [
  {
    name: 'B 123 ABC',
    clientName: 'TEST CLIENT',
    clientPhone: '0123456789',
    vin: 'VIN1234567890',
    numarDosar: '123',
    status: 'Constatare',
    piese: '',
    pieseSosite: false,
    categories: {
      '03_Foto_Dauna': [],
      '01_Acte_Client': [],
      '02_Asigurator_si_Dauna': [],
      '04_Reconstatare': [],
      '05_Dosar_Final': [],
    }
  }
];

let eventId = 1;
const events = [];

function sendJson(res, code, obj) {
  const s = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(s);
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    const decoder = new StringDecoder('utf8');
    let buffer = '';
    req.on('data', (chunk) => (buffer += decoder.write(chunk)));
    req.on('end', () => {
      buffer += decoder.end();
      try {
        if (!buffer) return resolve(null);
        const ct = req.headers['content-type'] || '';
        if (ct.includes('application/json')) return resolve(JSON.parse(buffer));
        // multipart/form-data or others: return raw
        return resolve(buffer);
      } catch (e) {
        return reject(e);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const path = parsed.pathname.replace(/\/+$/, '') || '/';
  try {
    if (req.method === 'GET' && path === '/api/network-info') {
      return sendJson(res, 200, { localIp: '127.0.0.1', port: PORT, baseDir: 'C:\\DOSARE', totalKnownCars: cars.length });
    }

    if (req.method === 'GET' && path === '/api/cars') {
      return sendJson(res, 200, cars.map(c => ({ name: c.name, numarDosar: c.numarDosar, clientName: c.clientName })));
    }

    if (req.method === 'GET' && path.startsWith('/api/cars/')) {
      const name = decodeURIComponent(path.replace('/api/cars/', ''));
      const car = cars.find(c => c.name === name);
      if (!car) return sendJson(res, 404, { error: 'Dosarul nu a fost gasit' });
      return sendJson(res, 200, car);
    }

    if (req.method === 'POST' && path === '/api/cars/new') {
      const body = await collectBody(req);
      const plate = (body && (body.plate || body.name)) || `NEW${Date.now()}`;
      const newCar = {
        name: plate,
        clientName: body.clientName || '',
        clientPhone: body.clientPhone || '',
        vin: body.vin || '',
        numarDosar: body.numarDosar || '',
        status: body.status || 'Constatare',
        piese: '',
        pieseSosite: false,
        categories: {
          '03_Foto_Dauna': [],
          '01_Acte_Client': [],
          '02_Asigurator_si_Dauna': [],
          '04_Reconstatare': [],
          '05_Dosar_Final': [],
        }
      };
      cars.unshift(newCar);
      const evt = { id: eventId++, type: 'new_folder', name: newCar.name, statusData: { clientName: newCar.clientName, clientPhone: newCar.clientPhone, vin: newCar.vin, numarDosar: newCar.numarDosar } };
      events.push(evt);
      return sendJson(res, 200, newCar);
    }

    if (req.method === 'POST' && path === '/api/sync/push') {
      const body = await collectBody(req);
      // find car by plate
      const plate = body && (body.numarInmatriculare || body.plate || body.plate);
      let car = cars.find(c => c.name === plate);
      if (!car) {
        car = { name: plate || `NEW${Date.now()}`, clientName: body.clientName || '', clientPhone: body.telefonClient || '', vin: body.vin || '', numarDosar: body.numarDosar || '', status: body.workflowStatus || 'Constatare', categories: { '03_Foto_Dauna': [], '01_Acte_Client': [], '02_Asigurator_si_Dauna': [], '04_Reconstatare': [], '05_Dosar_Final': [] } };
        cars.unshift(car);
      } else {
        car.status = body.workflowStatus || car.status;
        car.clientName = body.clientName || car.clientName;
        car.clientPhone = body.clientPhone || car.clientPhone;
        car.vin = body.vin || car.vin;
      }
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'POST' && path.startsWith('/api/cars/') && path.endsWith('/status')) {
      const name = decodeURIComponent(path.replace(/^\/api\/cars\//, '').replace(/\/status$/, ''));
      const car = cars.find(c => c.name === name);
      const body = await collectBody(req);
      if (car) {
        car.status = body.status || car.status;
        car.numarDosar = body.numarDosar || car.numarDosar;
        car.asigurator = body.asigurator || car.asigurator;
        car.piese = body.piese || car.piese;
        car.pieseSosite = body.pieseSosite || car.pieseSosite;
        car.notes = body.notes || car.notes;
      }
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'POST' && path === '/api/upload') {
      // naive accept
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'GET' && path === '/api/sync/events') {
      const since = Number(parsed.query.since || 0);
      const evs = events.filter(e => e.id > since);
      return sendJson(res, 200, { events: evs, latestId: eventId - 1 });
    }

    if (req.method === 'GET' && path === '/api/sync/events/stream') {
      // SSE
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      const idStart = eventId;
      const send = (evt) => {
        res.write(`id: ${evt.id}\n`);
        res.write(`data: ${JSON.stringify(evt)}\n\n`);
      };
      // send heartbeat
      const hb = setInterval(() => {
        res.write(`:\n\n`);
      }, 20000);

      // send queued events every 2s
      const t = setInterval(() => {
        while (events.length) {
          const e = events.shift();
          send(e);
        }
      }, 2000);

      req.on('close', () => {
        clearInterval(t);
        clearInterval(hb);
      });
      return;
    }

    // default
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  } catch (err) {
    console.error('Server error', err);
    sendJson(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => console.log(`Local drive mock server listening on http://localhost:${PORT}`));

// expose for graceful shutdown when run interactively
process.on('SIGINT', () => {
  console.log('Shutting down mock server');
  server.close(() => process.exit(0));
});