#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Parse args
const args = process.argv.slice(2);
const command = args[0];

const API_URL = process.env.NLS_API_URL || 'http://localhost:8787';

async function post(path, body) {
    try {
        const res = await fetch(`${API_URL}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        return await res.json();
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

async function capture() {
    // Check if there is stdin data (piped)
    let input = '';
    if (!process.stdin.isTTY) {
        for await (const chunk of process.stdin) input += chunk;
    }

    // Or use arguments if no stdin
    if (!input && args[1]) {
        // If the second arg is a flag or command, ignore, but here we assume it's content or we might look for --file
        if (args[1] === '--file' && args[2]) {
            input = fs.readFileSync(args[2], 'utf-8');
        } else {
            // nls capture "some text"
            input = args[1];
        }
    }

    if (!input) {
        console.error('❌ No input provided. Pipe text or provide a string.');
        console.log('Usage: echo "hello" | nls capture');
        process.exit(1);
    }

    const payload = {
        userId: process.env.USER || 'cli-user',
        projectId: process.env.NLS_PROJECT_ID || 'cli-default',
        source: 'cli',
        eventType: 'capture',
        payload: { text: input.trim() }
    };

    await post('/v1/events', payload);
    console.log('✅ Captured!');
}

async function note() {
    const text = args.slice(1).join(' ');
    if (!text) {
        console.error('❌ Please provide a note.');
        process.exit(1);
    }

    const payload = {
        userId: process.env.USER || 'cli-user',
        projectId: process.env.NLS_PROJECT_ID || 'cli-default',
        source: 'cli',
        eventType: 'note',
        payload: { text }
    };

    await post('/v1/events', payload);
    console.log('✅ Note saved!');
}

async function flush() {
    const res = await post('/v1/flush', {});
    console.log('✅ Flushed projects:', res.flushedProjects.join(', ') || 'None');
}

async function status() {
    try {
        const res = await fetch(`${API_URL}/v1/events`, { method: 'OPTIONS' }); // Hacky check if we had a health endpoint
        // Since we don't have a dedicated health endpoint, checking if port handles requests is enough for now, 
        // or we can assume if the script runs the network part works.
        // Actually, let's just use the fact we are here.
        console.log(`✅ Server should be running at ${API_URL}`);
    } catch (e) {
        console.log(`❌ Could not reach ${API_URL}`);
    }
}

switch (command) {
    case 'capture': return capture();
    case 'note': return note();
    case 'flush': return flush();
    case 'status': return status();
    default:
        console.log(`
Usage:
  nls capture            # Capture piped input
  nls note "message"     # Capture a quick note
  nls flush              # Trigger a flush
  nls status             # Check connection
    `);
}
