# Comparison: @praveencs/agent vs OpenClaw

This document compares `@praveencs/agent` (this project) with [OpenClaw](https://github.com/openclaw/openclaw), a popular open-source AI operating system.

## 1. Core Philosophy

| Feature | @praveencs/agent | OpenClaw |
|---|---|---|
| **Primary Goal** | **Autonomous Task Execution.** Designed to be a headless "digital employee" that plans and builds software in the background. | **AI Operating System.** Designed to be a "24/7 Jarvis" that integrates with chat apps (Discord, Telegram) and manages your digital life. |
| **Interaction** | **CLI-First.** You give it a goal, and it works silently. | **Chat-First.** You talk to it via various messaging platforms. |
| **Persona** | A Junior Developer / Project Manager. | A Personal Assistant / OS Interface. |

## 2. Architecture

### @praveencs/agent
- **Monolithic CLI/Daemon**: A single TypeScript application that runs locally.
- **Daemon Loop**: A background process that polls a queue of tasks.
- **Planner-Executor Split**: Explicit "Brain" (Goal Decomposition) and "Body" (Task Execution) separation.
- **Database**: Uses `better-sqlite3` for high-performance, structured local storage.

### OpenClaw
- **Gateway Architecture**: A Hub-and-Spoke model with a central Gateway managing WebSocket connections to various "Channels" (Telegram, Discord).
- **Service Mesh**: Decouples the "Brain" from the inputs/outputs via adapters.
- **Markdown-First Memory**: Stores state and memory as flat Markdown files on disk.

## 3. Capabilities & Skills

| | @praveencs/agent | OpenClaw |
|---|---|---|
| **Skill Definition** | **Prompt-as-Code.** Skills are simple `.md` files with natural language instructions. | **Plugin System.** Code-based plugins to extend functionality. |
| **Execution** | **Shell-Native.** Executes command-line tools natively (git, docker, npm). | **Sandbox-Native.** Heavily focuses on browser automation and secure sandboxing. |
| **Self-Improvement** | **Built-in Auto-Fixer.** Monitors success rates and rewrites broken skills automatically. | **Manual/Plugin.** Relies on users or plugin updates. |

## 4. Memory Implementation

### @praveencs/agent
- **Hybrid Storage**: Uses **SQLite** for structured data (tasks, metrics) and **Vector/FTS5** layers for semantic search.
- **Why?**: Faster retrieval for large codebases and project histories. Allows complex queries ("Select tasks from 2 days ago related to 'database'").

### OpenClaw
- **File-System Storage**: Stores conversations and memories as Markdown files.
- **Why?**: "Unix philosophy" - easy to read/edit by humans, no database dependencies.

## 5. Use Case Recommendation

**Choose @praveencs/agent if:**
- You want an AI to **write code, manage servers, or automate dev workflows**.
- You prefer a command-line interface.
- You need structured planning and long-term project management.
- You want a system that improves itself over time.

**Choose OpenClaw if:**
- You want to **chat with your AI** via WhatsApp/Discord.
- You need a personal assistant to manage emails, calendars, and smart home devices.
- You prefer storing data in plain text files.
- You want deep browser automation capabilities.

## Summary

While OpenClaw builds a bridge between AI and *Communication Channels*, `@praveencs/agent` builds a bridge between AI and *Work Execution*. We are focused on the "Agent as a Worker" paradigm, whereas OpenClaw focuses on "Agent as an Interface".
