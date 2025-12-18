import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

// Helper to send a POST request with JSON and return a promise that resolves with the response body
function postRequest(host, port, route, data = {}) {
  const body = JSON.stringify(data);
  return new Promise((resolve, reject) => {
    const req = http.request({ host, port, path: route, method: 'POST', headers: { 'Content-Type': 'application/json' } }, res => {
      let chunks = '';
      res.on('data', c => chunks += c);
      res.on('end', () => resolve(chunks.toString()));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function run() {
  // spawn the API server as a child process
  const server = spawn('node', ['apps/api/src/index.js'], { cwd: process.cwd(), stdio: ['ignore', 'inherit', 'inherit'] });
  // wait briefly to ensure the server has started
  await new Promise(r => setTimeout(r, 500));

  try {
    const timestamp = Date.now();
    // post a sample event
    await postRequest('localhost', 8787, '/v1/events', {
      userId: 'u1',
      projectId: 'demo',
      source: 'test',
      eventType: 'commit',
      timestamp,
      payload: { file: 'file.txt' }
    });

    // post an IDE event
    await postRequest('localhost', 8787, '/v1/events', {
      userId: 'vscode-user',
      projectId: 'demo',
      source: 'ide',
      eventType: 'save',
      timestamp: timestamp + 100,
      payload: { file: 'file.js', selection: 'const x = 1;', line: 10 }
    });

    // post a Browser event
    await postRequest('localhost', 8787, '/v1/events', {
      userId: 'browser-user',
      projectId: 'demo',
      source: 'browser',
      eventType: 'clip',
      timestamp: timestamp + 200,
      payload: { title: 'Docs', url: 'http://example.com', text: 'Important info' }
    });
    // flush the events
    const resp1 = await postRequest('localhost', 8787, '/v1/flush');
    const parsed1 = JSON.parse(resp1);
    if (!parsed1.flushedProjects || !parsed1.flushedProjects.includes('demo')) {
      throw new Error('First flush did not return demo project');
    }
    // verify markdown output contains the event
    const dateStr = new Date().toISOString().slice(0, 10);
    const mdPath = path.join('notebooklm_output', 'demo', `${dateStr}.md`);
    const md = fs.readFileSync(mdPath, 'utf-8');
    if (!md.includes('commit') || !md.includes('file.txt')) {
      throw new Error('Markdown output missing git commit content');
    }
    if (!md.includes('save') || !md.includes('file.js')) {
      throw new Error('Markdown output missing IDE save content');
    }
    if (!md.includes('clip') || !md.includes('Docs')) {
      throw new Error('Markdown output missing Browser clip content');
    }
    // second flush should return no projects
    const resp2 = await postRequest('localhost', 8787, '/v1/flush');
    const parsed2 = JSON.parse(resp2);
    if (parsed2.flushedProjects && parsed2.flushedProjects.length > 0) {
      throw new Error('Second flush should not return any projects');
    }
    console.log('integration test passed');
  } finally {
    server.kill();
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});