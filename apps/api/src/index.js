
import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = process.env.PORT || 8787;
// Directory where NotebookLM will watch for per-project markdown files
const OUT = process.env.OUT_DIR || 'notebooklm_output';

import { linear } from './adapters/linear.js';
const adapters = { linear };

// ensure output directory exists on startup
fs.mkdirSync(OUT, { recursive: true });

// In-memory buffer of incoming events. Each event is expected to contain:
// { userId, projectId, source, eventType, timestamp, payload }
// The timestamp will be assigned on ingestion if not provided.
let events = [];

// helper to load the last flushed timestamp (watermark) for a project
function loadWatermark(projectId) {
  const file = path.join(OUT, projectId, 'watermark.json');
  try {
    const data = fs.readFileSync(file, 'utf-8');
    const obj = JSON.parse(data);
    return obj.lastFlushed || 0;
  } catch (err) {
    return 0;
  }
}

// helper to write the last flushed timestamp (watermark) for a project
function saveWatermark(projectId, timestamp) {
  const dir = path.join(OUT, projectId);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'watermark.json');
  fs.writeFileSync(file, JSON.stringify({ lastFlushed: timestamp }), 'utf-8');
}

// helper to summarize a batch of events for a project
function summarizeEvents(projectId, batch) {
  // For simplicity we just list eventType and optional payload.file or title
  return batch.map(ev => {
    const details = [];
    if (ev.payload) {
      if (ev.payload.file) details.push(ev.payload.file);
      if (ev.payload.title) details.push(ev.payload.title);
    }
    return `- ${ev.eventType}${details.length ? ': ' + details.join(', ') : ''}`;
  }).join('\n');
}

http.createServer((req, res) => {
  // parse incoming body into a string
  if (req.method === 'POST' && req.url === '/v1/events') {
    let b = '';
    req.on('data', c => b += c);
    req.on('end', () => {
      try {
        const e = JSON.parse(b);
        if (!e.timestamp) e.timestamp = Date.now();
        events.push(e);
        res.writeHead(202).end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(400).end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // Webhook handler
  if (req.method === 'POST' && req.url.startsWith('/v1/webhooks/')) {
    const source = req.url.split('/').pop();
    const adapter = adapters[source];
    if (!adapter) {
      res.writeHead(400).end(JSON.stringify({ error: 'Unknown source' }));
      return;
    }

    let b = '';
    req.on('data', c => b += c);
    req.on('end', () => {
      try {
        const payload = JSON.parse(b);
        const event = adapter(payload);

        if (event) {
          // Enrich with standard fields if missing
          if (!event.timestamp) event.timestamp = Date.now();
          if (!event.projectId) event.projectId = process.env.DEFAULT_PROJECT_ID || 'linear-import'; // Webhooks often don't have project mapping logic yet
          if (!event.userId) event.userId = 'webhook';

          // Allow webhook to override project if present in payload (advanced)
          // For now, simple default

          events.push(event);
          console.log(`Captured webhook from ${source}`);
        }
        res.writeHead(200).end(JSON.stringify({ ok: true }));
      } catch (err) {
        console.error(err);
        res.writeHead(400).end(JSON.stringify({ error: 'Invalid Webhook Payload' }));
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/v1/flush') {
    // group events by projectId
    const grouped = {};
    for (const e of events) {
      if (!grouped[e.projectId]) grouped[e.projectId] = [];
      grouped[e.projectId].push(e);
    }
    // flush per project
    const flushedProjects = [];
    for (const projectId of Object.keys(grouped)) {
      const last = loadWatermark(projectId);
      const batch = grouped[projectId].filter(ev => ev.timestamp > last);
      if (batch.length === 0) continue;
      batch.sort((a, b) => a.timestamp - b.timestamp);
      const summary = summarizeEvents(projectId, batch);
      // write markdown file with current date
      const dir = path.join(OUT, projectId);
      fs.mkdirSync(dir, { recursive: true });
      const dateStr = new Date().toISOString().slice(0, 10);
      const filePath = path.join(dir, `${dateStr}.md`);
      fs.appendFileSync(filePath, summary + '\n');
      // update watermark to timestamp of last event
      const lastTimestamp = batch[batch.length - 1].timestamp;
      saveWatermark(projectId, lastTimestamp);
      flushedProjects.push(projectId);
    }
    // clear events buffer for flushed projects
    events = events.filter(e => !flushedProjects.includes(e.projectId));
    res.end(JSON.stringify({ flushedProjects }));
    return;
  }
  // Serve static files from public/
  if (req.method === 'GET') {
    let filePath = path.join(process.cwd(), 'apps', 'api', 'public', req.url === '/' ? 'index.html' : req.url);
    const extname = path.extname(filePath);
    let contentType = 'text/html';
    switch (extname) {
      case '.js': contentType = 'text/javascript'; break;
      case '.css': contentType = 'text/css'; break;
      case '.json': contentType = 'application/json'; break;
    }

    fs.readFile(filePath, (err, content) => {
      if (err) {
        if (err.code == 'ENOENT') {
          res.writeHead(404);
          res.end('Not found');
        } else {
          res.writeHead(500);
          res.end('Server Error: ' + err.code);
        }
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
    return;
  }

  res.writeHead(404).end();
}).listen(PORT, '0.0.0.0', () => console.log('API on', PORT));
