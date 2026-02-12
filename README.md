<p align="center">
  <h1 align="center">🤖 Agent Runtime</h1>
  <p align="center">
    A CLI agent runtime that executes goals safely with <b>Skills</b>, <b>Plan Files</b>, and <b>permissioned tools</b>.<br/>
    Multi-LLM • Policy-gated • Audit-logged • MCP-compatible
  </p>
  <p align="center">
    <a href="https://www.npmjs.com/package/@praveencs/agent"><img src="https://img.shields.io/npm/v/@praveencs/agent.svg" alt="npm version"></a>
    <a href="https://github.com/praveencs87/agent"><img src="https://img.shields.io/github/stars/praveencs87/agent.svg?style=social" alt="GitHub stars"></a>
    <a href="https://github.com/praveencs87/agent/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
    <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg" alt="Node.js"></a>
  </p>
</p>

---

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [CLI Reference](#cli-reference)
  - [agent init](#agent-init)
  - [agent run](#agent-run)
  - [agent skills](#agent-skills)
  - [agent plan](#agent-plan)
  - [agent daemon](#agent-daemon)
  - [agent mcp](#agent-mcp)
  - [agent doctor](#agent-doctor)
  - [agent config](#agent-config)
- [Configuration](#configuration)
  - [agent.config.json](#agentconfigjson)
  - [Models & Routing](#models--routing)
  - [Policy & Permissions](#policy--permissions)
  - [Environment Variables](#environment-variables)
- [Skills](#skills)
  - [Skill Manifest (skill.json)](#skill-manifest-skilljson)
  - [Prompt-Based Skills](#prompt-based-skills)
  - [Workflow-Based Skills](#workflow-based-skills)
  - [Skill Lifecycle](#skill-lifecycle)
- [Plan Files](#plan-files)
  - [Writing a Plan](#writing-a-plan)
  - [Triggers](#triggers)
  - [Propose Mode](#propose-mode)
- [Built-in Tools](#built-in-tools)
- [MCP Integration](#mcp-integration)
- [Daemon & Scheduling](#daemon--scheduling)
- [Audit Logs](#audit-logs)
- [Development](#development)
- [License](#license)

---

## Overview

**Agent Runtime** is a command-line framework for building, running, and managing AI-powered automation safely. It provides:

- **Skills** — reusable, versioned units of automation (prompt-based or workflow-based)
- **Plan Files** — declarative YAML pipelines with step-by-step execution, dependencies, and verification
- **Permissioned Tools** — a gated tool system (`fs.*`, `cmd.run`, `git.*`) with policy-based approval
- **Multi-LLM Routing** — supports Azure OpenAI, OpenAI, Anthropic, and Ollama with fallback chains
- **MCP Server** — expose tools and skills to any MCP-compatible editor (VS Code, Cursor, etc.)
- **Background Daemon** — cron scheduling, filesystem watchers, and event-based triggers
- **Audit Logging** — every run produces a detailed log with diffs, timing, and verification results

---

## Installation

### Prerequisites

- **Node.js** ≥ 18.0.0
- **npm** or **yarn**
- An LLM API key (Azure OpenAI, OpenAI, Anthropic) or a running Ollama instance

### Install from npm

```bash
npm install -g @praveencs/agent
```

### Install from source

```bash
git clone https://github.com/praveencs87/agent.git
cd agent
npm install
npm run build

# Link globally
npm link
```

After installation, the `agent` command is available system-wide.

### Verify installation

```bash
agent --version    # 0.1.0
agent --help       # Show all commands
agent doctor       # Check system health
```

---

## Quick Start

### 1. Initialize a project

```bash
cd your-project
agent init
```

This creates:

```
.agent/
├── agent.config.json    # Project configuration
├── skills/              # Installed skills
├── plans/               # Plan files (.plan.yaml)
├── runs/                # Execution audit logs
├── plugins/             # Tool plugins
└── logs/                # Application logs
```

### 2. Run a goal

```bash
# Ask the LLM to accomplish a task
agent run "refactor the utils module to use async/await"

# Run with a specific skill
agent run "add input validation" --skill validate-inputs

# Autonomous mode (auto-approve low-risk actions)
agent run "fix all lint errors" --autonomous
```

### 3. Create and use a skill

```bash
agent skills create my-formatter
# Edit .agent/skills/my-formatter/prompt.md
agent run "format the codebase" --skill my-formatter
```

### 4. Execute a plan

```bash
# Create .agent/plans/deploy.plan.yaml (see Plan Files section)
agent plan validate deploy
agent plan run deploy
```

---

## Project Structure

```
.agent/                      # Agent workspace (per-project)
├── agent.config.json        # Configuration
├── skills/                  # Skill directories
│   └── my-skill/
│       ├── skill.json       # Skill manifest
│       └── prompt.md        # or workflow.ts
├── plans/                   # Plan files
│   └── deploy.plan.yaml
├── runs/                    # Audit logs per run
│   └── run_20260212_143000/
│       ├── run.json
│       └── diffs.json
├── plugins/                 # Tool plugins
└── logs/                    # Application logs
```

---

## CLI Reference

### Global Options

```
-V, --version       Output the version number
--verbose           Enable verbose output
--no-color          Disable colored output
--config <path>     Path to config file
-h, --help          Display help for command
```

---

### `agent init`

Initialize agent configuration in the current project.

```bash
agent init
```

Creates the `.agent/` directory structure with a default `agent.config.json`, empty `skills/` and `plans/` directories, and registers all core tools.

---

### `agent run`

Execute a goal or task using LLM reasoning or a specific skill.

```bash
agent run <goal> [options]
```

**Arguments:**

| Argument | Description |
|----------|-------------|
| `<goal>` | Goal description or task to run |

**Options:**

| Option | Description |
|--------|-------------|
| `-s, --skill <name>` | Use a specific installed skill |
| `-a, --autonomous` | Auto-approve low-risk actions |
| `--dry-run` | Show what would be done without executing |

**Examples:**

```bash
# Free-form goal via LLM
agent run "add error handling to the API routes"

# Specific skill with inputs
agent run "src/" --skill code-review

# Preview without executing
agent run "delete all temp files" --dry-run
```

---

### `agent skills`

Manage installed skills.

#### `agent skills list`

List all installed skills with their name, version, state, and description.

```bash
agent skills list
```

#### `agent skills create <name>`

Scaffold a new skill from the built-in template.

```bash
agent skills create my-linter
```

Creates:
```
.agent/skills/my-linter/
├── skill.json     # Manifest (edit this)
└── prompt.md      # Entrypoint prompt (edit this)
```

#### `agent skills install <source>`

Install a skill from a local path.

```bash
agent skills install /path/to/skill-directory
```

#### `agent skills remove <name>`

Remove an installed skill.

```bash
agent skills remove my-linter
```

#### `agent skills info <name>`

Display detailed information about a skill — manifest, tools, permissions, and validation status.

```bash
agent skills info my-linter
```

#### `agent skills update`

Check for and apply skill updates (currently supports local skills).

```bash
agent skills update
```

---

### `agent plan`

Manage and execute plan files.

#### `agent plan list`

List all discovered `.plan.yaml` files.

```bash
agent plan list
```

#### `agent plan validate <name>`

Parse and validate a plan file, showing goals, steps, mode, and trigger type.

```bash
agent plan validate deploy
```

#### `agent plan run <name>`

Execute a plan with all its steps.

```bash
agent plan run deploy
agent plan run deploy --autonomous
```

**Options:**

| Option | Description |
|--------|-------------|
| `-a, --autonomous` | Auto-approve low-risk actions during execution |

#### `agent plan propose <name>`

Create a draft run for review before execution.

```bash
agent plan propose deploy
# Review, then:
agent plan approve <runId>
agent plan execute <runId>
```

#### `agent plan runs`

List the last 20 plan runs with status and plan name.

```bash
agent plan runs
```

#### `agent plan show <runId>`

Display detailed information about a specific run — status, steps, timing, verification results.

```bash
agent plan show run_20260212_143000
```

#### `agent plan approve <runId>`

Approve a proposed plan run (changes status from `proposed` → `pending`).

```bash
agent plan approve run_20260212_143000
```

#### `agent plan execute <runId>`

Execute a previously approved plan run.

```bash
agent plan execute run_20260212_143000
```

---

### `agent daemon`

Manage the background daemon process for scheduled and event-triggered plans.

#### `agent daemon start`

Start the daemon as a detached background process.

```bash
agent daemon start
```

The daemon:
- Loads all plans with `cron` or `fs_change` triggers
- Schedules cron jobs using the configured timezone
- Watches filesystem paths for change-triggered plans

#### `agent daemon stop`

Stop the running daemon.

```bash
agent daemon stop
```

#### `agent daemon status`

Check whether the daemon is running and show its PID.

```bash
agent daemon status
```

---

### `agent mcp`

Start the MCP (Model Context Protocol) server for editor integration.

```bash
agent mcp [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `-t, --transport <type>` | Transport mode: `stdio` (default) or `http` |

**Example editor configuration** (VS Code / Cursor):

```jsonc
// .vscode/mcp.json
{
  "servers": {
    "agent-runtime": {
      "command": "agent",
      "args": ["mcp"],
      "transport": "stdio"
    }
  }
}
```

Exposed tools via MCP:
- `skills.list`, `skills.run` — list and run skills
- `plans.list`, `plans.propose`, `plans.run` — manage plans
- `fs.read`, `fs.search`, `git.diff`, `cmd.run` — gated tools (require approval)

---

### `agent doctor`

Run system health checks and report configuration status.

```bash
agent doctor
```

**Checks performed:**
- ✅ Agent directory exists
- ✅ Configuration file is valid
- ✅ LLM provider connectivity
- ✅ Core tools registered
- ✅ Skills loaded and valid
- ✅ Node.js & Git versions

---

### `agent config`

Manage configuration values.

#### `agent config list`

Show all current configuration values.

```bash
agent config list
```

#### `agent config get <key>`

Get a specific value using dot-notation.

```bash
agent config get models.routing.defaultProvider
agent config get policy.defaultApproval
```

#### `agent config set <key> <value>`

Set a configuration value and save to `agent.config.json`.

```bash
agent config set models.routing.defaultProvider anthropic
agent config set policy.defaultApproval allow
agent config set tools.timeoutMs 60000
```

#### `agent config reset`

Reset configuration to defaults.

```bash
agent config reset
```

---

## Configuration

### agent.config.json

The main configuration file lives at `.agent/agent.config.json`. A global config can also be placed at `~/.agent-runtime/agent.config.json`. Configs are merged in order: **defaults → global → project → environment variables**.

### Models & Routing

```jsonc
{
  "models": {
    "providers": {
      "azure": {
        "type": "azure",
        "model": "gpt-5-mini",
        "deploymentName": "gpt-5-mini",         // Azure deployment name
        "baseUrl": "https://your-resource.openai.azure.com",
        "apiVersion": "2024-02-15-preview"       // Azure API version
        // "apiKey": "..." (prefer AZURE_API_KEY env var)
      },
      "openai": {
        "type": "openai",
        "model": "gpt-4o",
        "maxTokens": 4096,
        "temperature": 0.7
        // "apiKey": "sk-..." (prefer AGENT_OPENAI_API_KEY env var)
      },
      "anthropic": {
        "type": "anthropic",
        "model": "claude-sonnet-4-20250514",
        "maxTokens": 4096
      },
      "ollama": {
        "type": "ollama",
        "model": "llama3",
        "baseUrl": "http://localhost:11434"
      }
    },
    "routing": {
      "defaultProvider": "azure",               // Azure is default
      "offlineFirst": false,                     // Prefer local models
      "fallbackChain": ["azure", "openai", "anthropic", "ollama"],
      "skillOverrides": {                        // Per-skill routing
        "code-review": "anthropic"
      }
    }
  }
}
```

### Policy & Permissions

The policy engine controls what tools can do without user approval.

```jsonc
{
  "policy": {
    "defaultApproval": "confirm",   // "allow" | "confirm" | "deny"
    "rules": [
      { "permission": "filesystem.read",  "action": "allow" },
      { "permission": "filesystem.write", "action": "confirm" },
      { "permission": "exec",             "action": "confirm" },
      { "permission": "network",          "action": "confirm" },
      { "permission": "secrets",          "action": "deny" }
    ],
    "filesystemAllowlist": ["**/*"],        // Glob patterns
    "commandAllowlist": [],                  // Allowed shell commands
    "domainAllowlist": []                    // Allowed network domains
  }
}
```

**Permission levels:**

| Level | Behavior |
|-------|----------|
| `allow` | Tool executes without prompting |
| `confirm` | User is prompted before execution |
| `deny` | Tool call is rejected |

### Environment Variables

Override config values via environment:

| Variable | Config Path |
|----------|-------------|
| `AZURE_API_KEY` | `models.providers.azure.apiKey` |
| `AZURE_API_BASE` | `models.providers.azure.baseUrl` |
| `AZURE_DEPLOYMENT_NAME` | `models.providers.azure.deploymentName` |
| `AZURE_API_VERSION` | `models.providers.azure.apiVersion` |
| `AGENT_OPENAI_API_KEY` | `models.providers.openai.apiKey` |
| `AGENT_ANTHROPIC_API_KEY` | `models.providers.anthropic.apiKey` |
| `AGENT_DEFAULT_PROVIDER` | `models.routing.defaultProvider` |
| `AGENT_OFFLINE_FIRST` | `models.routing.offlineFirst` |

---

## Skills

Skills are reusable, versioned automation units. Each skill is a directory containing a `skill.json` manifest and an entrypoint file.

### Skill Manifest (skill.json)

```json
{
  "name": "code-review",
  "version": "1.0.0",
  "description": "Review code for bugs, style issues, and improvements",
  "author": "your-name",
  "entrypoint": "prompt.md",
  "tools": ["fs.read", "fs.search", "git.diff"],
  "permissions": {
    "required": ["filesystem.read"],
    "optional": ["exec"]
  },
  "inputs": {
    "path": { "type": "string", "description": "Path to review" }
  },
  "validators": [
    {
      "name": "lint-check",
      "command": "npm run lint",
      "timeout": 30000
    }
  ],
  "constraints": {
    "binaries": ["git"]
  },
  "tags": ["review", "quality"],
  "state": "approved"
}
```

**Key fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✅ | Lowercase alphanumeric with dots/hyphens |
| `version` | ✅ | Semver (e.g. `1.0.0`) |
| `description` | ✅ | Human-readable description |
| `entrypoint` | ✅ | `prompt.md` (LLM-driven) or `workflow.ts` (programmatic) |
| `tools` | ✅ | List of tools the skill is allowed to use |
| `permissions` | ✅ | Required and optional permission categories |
| `inputs` | | JSON Schema for skill inputs |
| `validators` | | Post-execution validation commands |
| `constraints` | | OS or binary requirements |
| `state` | | `draft` → `approved` → `deprecated` |

### Prompt-Based Skills

Create a `prompt.md` file that tells the LLM what to do:

```markdown
# Code Review

You are a senior code reviewer. Analyze the provided code for:

1. **Bugs** — logic errors, null pointer issues, race conditions
2. **Style** — naming conventions, code organization, readability
3. **Performance** — unnecessary allocations, O(n²) loops, missing caching
4. **Security** — injection vulnerabilities, hardcoded secrets

Use `fs.read` to read files and `git.diff` to see recent changes.
Provide your review as a structured report.

Input path: {{path}}
```

The `{{variable}}` placeholders are replaced with skill inputs at runtime. The LLM drives execution using allowed tools in an agentic loop.

### Workflow-Based Skills

For deterministic automation, create a `workflow.ts`:

```typescript
export default async function run({ inputs, tools, context }) {
  // Read source files
  const result = await tools('fs.search', {
    path: inputs.path,
    pattern: '**/*.ts'
  });

  // Process each file
  for (const file of result.data.matches) {
    const content = await tools('fs.read', { path: file });
    // ... transform content ...
    await tools('fs.write', { path: file, content: newContent });
  }

  return { filesProcessed: result.data.matches.length };
}
```

### Skill Lifecycle

Skills progress through three states:

```
draft → approved → deprecated
              ↑         │
              └─────────┘  (can re-approve)
```

- **draft** — newly created, can run interactively but not in daemon
- **approved** — production-ready, can run in daemon/scheduled contexts
- **deprecated** — archived, cannot be upgraded

---

## Plan Files

Plans are declarative YAML pipelines stored as `.plan.yaml` files in `.agent/plans/`.

### Writing a Plan

```yaml
# .agent/plans/deploy.plan.yaml
name: deploy
description: Build, test, and deploy the application
mode: execute

goals:
  - id: deploy-safely
    description: Deploy the application with zero downtime
    successCriteria:
      - All tests pass
      - Build succeeds
      - Deployment completes
    riskLevel: medium

steps:
  - id: lint
    name: Run linter
    tool: cmd.run
    args:
      command: npm
      args: ["run", "lint"]
    verify:
      exitCode: 0
    onFailure: abort

  - id: test
    name: Run tests
    tool: cmd.run
    args:
      command: npm
      args: ["test"]
    verify:
      exitCode: 0
    onFailure: abort
    dependsOn: [lint]

  - id: build
    name: Build production bundle
    tool: cmd.run
    args:
      command: npm
      args: ["run", "build"]
    verify:
      fileExists: dist/index.js
    retries: 2
    onFailure: retry
    dependsOn: [test]

  - id: deploy
    name: Deploy to production
    skill: deploy-to-cloud
    args:
      environment: production
    dependsOn: [build]

policy:
  approvals: per_step
  scope:
    commandAllowlist: ["npm", "node"]

trigger:
  type: manual

outputs:
  - name: build-output
    type: artifact
    path: dist/
```

### Step Fields

| Field | Description |
|-------|-------------|
| `id` | Unique step identifier |
| `name` | Human-readable step name |
| `tool` | Built-in tool to execute (e.g. `cmd.run`) |
| `skill` | Skill to run instead of a tool |
| `args` | Arguments passed to the tool or skill |
| `verify` | Post-step verification (`command`, `fileExists`, `exitCode`, `contains`) |
| `dependsOn` | List of step IDs that must complete first |
| `onFailure` | `abort` (default), `retry`, or `skip` |
| `retries` | Number of retry attempts (used with `onFailure: retry`) |

### Triggers

| Type | Description | Config |
|------|-------------|--------|
| `manual` | Run explicitly via CLI | — |
| `cron` | Scheduled execution | `cron: "0 2 * * *"` |
| `fs_change` | File system watcher | `paths: ["src/**/*.ts"]` |
| `git_event` | Git hook events | `gitEvents: ["commit", "push"]` |
| `webhook` | HTTP webhook trigger | `webhookPath: "/deploy"` |

### Propose Mode

For high-risk plans, use propose mode to review before executing:

```bash
# Create a draft run
agent plan propose deploy

# Review the proposal
agent plan show <runId>

# Approve and execute
agent plan approve <runId>
agent plan execute <runId>
```

---

## Built-in Tools

| Tool | Category | Description |
|------|----------|-------------|
| `fs.read` | filesystem | Read file contents |
| `fs.write` | filesystem | Write content to a file (auto-creates directories) |
| `fs.list` | filesystem | List directory contents (recursive option) |
| `fs.search` | filesystem | Search files matching a glob pattern |
| `fs.patch` | filesystem | Find and replace content in a file |
| `cmd.run` | exec | Execute a shell command |
| `git.status` | git | Show working tree status |
| `git.diff` | git | Show file differences |
| `git.log` | git | Show commit log |
| `git.commit` | git | Create a commit |
| `project.detect` | project | Detect language, framework, and package manager |

---

## MCP Integration

The MCP server allows editors like VS Code and Cursor to interact with the agent runtime.

### Start the server

```bash
agent mcp                    # stdio transport (default)
agent mcp --transport http   # HTTP transport (future)
```

### Editor setup

Add to your editor's MCP configuration:

```jsonc
{
  "servers": {
    "agent-runtime": {
      "command": "agent",
      "args": ["mcp"],
      "transport": "stdio"
    }
  }
}
```

### Exposed capabilities

- **Skills**: List and execute installed skills from your editor
- **Plans**: List, propose, and run plans
- **Gated Tools**: Use `fs.read`, `fs.search`, `git.diff`, `cmd.run` with policy enforcement

---

## Daemon & Scheduling

The daemon runs as a background process, executing plans on schedules or in response to events.

```bash
agent daemon start    # Start background daemon
agent daemon status   # Check if running
agent daemon stop     # Stop the daemon
```

### Cron scheduling

Add a `cron` trigger to your plan:

```yaml
trigger:
  type: cron
  cron: "0 2 * * *"    # Daily at 2 AM
```

The daemon respects the `daemon.timezone` config setting (default: `UTC`).

### File system triggers

```yaml
trigger:
  type: fs_change
  paths:
    - "src/**/*.ts"
    - "package.json"
```

The daemon watches these paths and runs the plan when changes are detected (debounced by `daemon.watcherDebounceMs`).

---

## Audit Logs

Every plan run produces an audit trail in `.agent/runs/<runId>/`:

```
.agent/runs/run_20260212_143000/
├── run.json       # Full run log with steps, events, timing
└── diffs.json     # File diffs captured during execution
```

### Run log contents

- **Run metadata** — ID, plan name, status, timestamps
- **Step logs** — per-step status, input/output, duration, errors
- **Events** — audit events (tool calls, approvals, failures)
- **Verification** — pass/fail results for each step verification
- **Summary** — steps completed/failed/skipped, files changed, duration

### Browsing runs

```bash
agent plan runs              # List recent runs
agent plan show <runId>      # Detailed run view
```

---

## Development

### Building

```bash
npm run build          # Compile TypeScript
npm run dev            # Watch mode with tsx
```

### Testing

```bash
npm test               # Run unit tests
npm run test:integration  # Run integration tests
```

### Code quality

```bash
npm run lint           # ESLint
npm run format         # Prettier
```

### Project layout

```
src/
├── cli/               # CLI commands and UI helpers
│   ├── commands/      # init, run, skills, plan, daemon, mcp, doctor, config
│   ├── ui/            # progress, prompt, report
│   └── index.ts       # CLI program factory
├── config/            # Configuration schema, defaults, loader, secrets
├── engine/            # Execution engine, verification, rollback
├── llm/               # LLM router, providers (OpenAI, Anthropic, Ollama), cache
├── logging/           # Structured logger, audit log, redactor
├── mcp/               # MCP server and handlers
├── daemon/            # Process manager, scheduler, file watcher
├── plans/             # Plan parser, runner, triggers, propose
├── policy/            # Permission engine, scope checker, audit emitter
├── skills/            # Skill loader, runner, validator, lifecycle
├── tools/             # Tool registry, core tools, plugin loader
├── self-extend/       # Skill generator, sandbox, publisher
├── utils/             # Paths, hashing, schema helpers
└── index.ts           # Public API surface
```

---

## License

MIT
