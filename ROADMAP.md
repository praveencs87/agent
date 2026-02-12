# 🛣️ Roadmap: The Future of @praveencs/agent

We have built a robust autonomous agent runtime (`v0.7.x`). But this is just the beginning.
Here is our vision for the next major milestones.

## Phase 1: Robustness & Safety (Current Focus)
- [ ] **Sandboxed Execution**: Run all shell skills inside ephemeral Docker containers to prevent accidental system damage.
- [ ] **Permission Scopes**: Fine-grained access control (e.g., "Allow read access to `/project` but write access only to `/project/src`").
- [ ] **Secrets Management**: Secure, encrypted storage for API keys integrated with system keychains.

## Phase 2: Multi-Agent Collaboration (The Swarm)
- [ ] **Agent-to-Agent Protocol**: Define a standard schema for agents to send messages and delegate tasks to each other.
- [ ] **Specialized Personas**:
    - `Coder Agent`: Writes and tests code.
    - `Reviewer Agent`: Critiques pull requests.
    - `Architect Agent`: High-level system design.
- [ ] **Orchestrator**: A master process that spins up specialized agents for a complex goal.

## Phase 3: Multimodal Interfaces
- [ ] **Voice Interface**: Speak to your agent ("Deploy this to prod") and hear responses.
- [ ] **Vision Capabilities**: Allow the agent to "see" your screen or read images (e.g., "Fix the CSS on this screenshot").
- [ ] **IDE Integration**: VS Code extension to have the agent live in your editor sidebar.

## Phase 4: The Agent Cloud
- [ ] **Skill Hub**: A public registry (npm-style) to share and install community skills.
- [ ] **Remote Execution**: Run the heavy agent logic on a cloud server while controlling it from your laptop.
- [ ] **Web Dashboard**: Real-time visualization of agent thought processes, memory graph, and task plans.

## 🤝 Join the Mission
This is an open-source journey. We need help with:
- Writing new Skills (see `docs/articles/03-skill-execution.md`)
- Improving the Planner prompt engineering
- Building the Web Dashboard

Submit a PR and let's build the future of work, together.
