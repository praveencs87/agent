# Agent Runtime

An autonomous, goal-oriented AI agent runtime with persistent memory, skill execution, and self-improvement capabilities. The agent acts as your digital employee, capable of breaking down high-level objectives into actionable tasks, executing them using a variety of skills, and learning from its experiences.

---

## 🚀 Features

- **🧠 Goal Decomposition**: Uses LLM reasoning to break complex, high-level objectives into specific, actionable tasks.
- **⚡ Autonomous Execution**: Runs tasks in the background via a robust daemon process, respecting dependencies and priorities.
- **💾 Persistent Memory**: SQLite-based semantic memory with FTS5 search. Stores facts, project context, and learned patterns across sessions.
- **🛠️ Extensible Skill System**: Capabilities are defined by simple markdown prompts (`prompt.md`). Install skills from a hub or create your own.
- **📊 Reporting**: Generates daily standup reports and executive summaries of activity and progress.
- **❤️ Self-Improvement**: Tracks skill performance metrics and automatically attempts to patch/repair failing skills using the LLM.

---

## 📦 Installation

```bash
npm install -g @praveencs/agent
```

### Initial Configuration
After installation, initialize the configuration:

```bash
agent config --init
```

This will create a default configuration file (`~/.agent/config.json`) where you can set your LLM provider API keys (OpenAI, Anthropic, Azure, Ollama) and other preferences.

---

## 📖 User Guide

### 1. The Workflow
The typical workflow follows a **Plan → Decompose → Execute → Report** cycle:

1.  **Plan**: Tell the agent what you want to achieve.
    ```bash
    agent goal add "Create a personal blog with Next.js and PostgreSQL" --priority 1
    # Output: Goal #1 created
    ```

2.  **Decompose**: Ask the agent to break it down.
    ```bash
    agent goal decompose 1
    # Output: Goal decomposed into 5 tasks (Scaffold, DB Setup, Styling...)
    ```
    *The agent uses its LLM planner to analyze the goal and your available skills to create a task list.*

3.  **Execute**: Start the daemon to work on tasks autonomously.
    ```bash
    agent daemon start
    ```
    *The daemon runs in the background, processing tasks, handling retries, and logging activity.*

    You can check progress at any time:
    ```bash
    agent goal list           # See goal status
    agent goal status 1       # See detailed task status for Goal #1
    agent daemon status       # Check if the worker is running
    ```

4.  **Report**: Get a summary of what happened.
    ```bash
    agent report generate --summary
    ```
    *Generates a notification-style summary of completed work, new learnings, and any blockers.*

### 2. Managing Skills
Skills are the tools your agent uses (e.g., `git-commit`, `docker-deploy`, `file-write`).

- **List installed skills**:
  ```bash
  agent skills list
  ```

- **Find new skills**:
  ```bash
  agent skills search "database"
  agent skills browse
  ```

- **Install a skill**:
  ```bash
  agent skills install <skill-name>
  ```

- **Create a custom skill**:
  ```bash
  agent skills create my-new-skill
  ```
  *This creates a template at `.agent/skills/my-new-skill/prompt.md`. Edit this file to define what the skill does using natural language instructions for the LLM.*

- **Self-Repair (Doctor)**:
  If a skill is failing, the agent can diagnose and fix it.
  ```bash
  agent skills stats               # View success rates
  agent skills doctor my-skill     # Analyze error logs
  agent skills fix my-skill        # Attempt AI auto-repair
  ```

### 3. Memory & Context
The agent automatically saves important information (like "Project uses Tailwind CSS") to its memory. You can search or manage this manually.

- **Search memory**:
  ```bash
  agent memory search "database credentials"
  ```
- **Add a fact**:
  ```bash
  agent memory add "The staging server IP is 10.0.0.5" --category fact
  ```

---

## 🤖 CLI Command Reference

### General
| Command | Description |
|Str |---|
| `agent run "<instruction>"` | Run a one-off instruction immediately |
| `agent config --init` | Initialize configuration |
| `agent doctor` | Check system health (dependencies, config) |

### Goal Management
| Command | Description |
|---|---|
| `agent goal add "<title>"` | Create a new high-level goal |
| `agent goal list` | List all active goals |
| `agent goal decompose <id>` | AI-power breakdown of a goal into tasks |
| `agent goal status <id>` | View tasks and progress for a goal |
| `agent goal task <id> "<title>"` | Manually add a task to a goal |
| `agent goal run` | Manually run pending tasks (if daemon is off) |

### Daemon (Background Service)
| Command | Description |
|---|---|
| `agent daemon start` | Start the background worker |
| `agent daemon stop` | Stop the background worker |
| `agent daemon status` | View daemon health and uptime |
| `agent daemon logs` | View recent execution logs |

### Skills
| Command | Description |
|---|---|
| `agent skills list` | List installed skills |
| `agent skills search <query>` | Search the skill hub |
| `agent skills install <name>` | Install a skill from hub or path |
| `agent skills stats` | View performance metrics |
| `agent skills doctor <name>` | Diagnose a failing skill |
| `agent skills fix <name>` | Auto-fix a broken skill |

### Reports
| Command | Description |
|---|---|
| `agent report generate` | Generate today's activity report |
| `agent report generate --summary` | Generate an AI executive summary |

---

## 🛠️ Architecture

The runtime consists of several modular components:

1.  **Orchestrator (CLI)**: Entry point for user interaction.
2.  **Goal Manager**: State machine for tracking objectives (`Active`, `Completed`, `Failed`).
3.  **Planner (Decomposer)**: LLM-based engine that breaks goals into dependency-aware tasks.
4.  **Executor**: The engine that runs tasks. It matches tasks to skills and executes them securely.
5.  **Memory Store**: Semantic storage using SQLite vector/FTS.
6.  **Auto-Fixer Loop**: A meta-level process that monitors execution metrics and patches skills that drift or break.

---


## 📚 Learning Series

Want to understand how this agent works under the hood? Check out our 5-part architecture series:

1.  [**Vision & Architecture**](docs/articles/01-vision-architecture.md) - The high-level design.
2.  [**The Brain (Planner)**](docs/articles/02-goal-decomposition.md) - How goal decomposition works.
3.  [**The Body (Executor)**](docs/articles/03-skill-execution.md) - Secure skill execution.
4.  [**Memory & Context**](docs/articles/04-memory-persistence.md) - SQLite & Vector storage.
5.  [**Self-Improvement**](docs/articles/05-self-improvement.md) - Metrics & The Auto-Fixer.

## 🔮 What's Next?

We are just getting started. The future includes **Multi-Agent Swarms**, **Sandboxed Execution**, and **Voice Interfaces**.
Check out our detailed [**ROADMAP.md**](ROADMAP.md) to see where we are heading and how you can help build the future of autonomous software development.

### Comparisons
- [**vs OpenClaw**](docs/comparisons/openclaw.md) - How we differ from other AI OS projects.

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to set up your development environment.

## License

MIT
