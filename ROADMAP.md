# 🗺️ Project Roadmap & Feature Ideas

This document outlines potential future features for `notebooklm-sync`. The goal is to expand the "incremental memory" concept to more parts of the developer workflow.

## 🔌 New Connectors (Integrations)

The more sources we listen to, the better NotebookLM understands the "why" behind decisions.

### 1. **Communication Channels (Slack / Discord)** 💬
   - **Why**: Many architectural decisions happen in chat threads, not just PRs.
   - **How**: A bot that listens for a specific emoji reaction (e.g., 🧠). When a user reacts, the bot saves the thread context as an event.
   - **Event Type**: `conversation`

### 2. **Project Management (Linear / Jira)** 🎟️
   - **Why**: Context on *what* is being built often lives in tickets.
   - **How**: Webhook listener that captures ticket creation, description updates, and status changes.
   - **Event Type**: `plan`

### 3. **Terminal / CLI Tool** 💻
   - **Why**: Developers live in the terminal.
   - **How**: A simple CLI to pipe output or add quick notes.
     ```bash
     # Capture a command output
     ls -la | nls capture --title "File structure"

     # Add a quick thought
     nls note "We need to refactor the auth layer next."
     ```

---

## 🧠 Intelligence Layer (Core Enhancements)

Improving the quality of data *before* it reaches NotebookLM.

### 4. **Smart Summarization (LLM Pre-processing)**
   - **Problem**: Raw diffs or extensive chat logs can be noisy and consume NotebookLM context window.
   - **Solution**: Use a lightweight LLM (e.g., Gemini Flash) to summarize buffered events *during the flush*.
   - **Result**: Instead of 100 lines of raw logs, NotebookLM gets: *"User fixed a race condition in the auth service."*

### 5. **Voice Memos / Audio Context** 🎙️
   - **Why**: Sometimes it's easier to speak a complex thought.
   - **How**: An endpoint that accepts audio input, transcribes it (using OpenAI/Gemini API), and saves the text.

---

## 🛠️ User Experience

### 6. **Local Dashboard UI** 📊
   - **Why**: Currently the system is invisible.
   - **How**: A simple HTML page at `http://localhost:8787` showing:
     - Number of buffered events.
     - Last flush time.
     - Button to "Flush Now".
     - List of connected projects.

### 7. **Scheduled Flushes** ⏰
   - **How**: A configurable cron job (inside Docker) to automatically flush at the end of the work day (e.g., 6 PM), ensuring the memory is always up to date without manual intervention.
