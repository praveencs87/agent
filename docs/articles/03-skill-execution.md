# Building The Body: Skill Execution & Tools (Part 3/5)

In **Part 2**, we built the Brain that breaks goals into tasks. Now, in **Part 3**, we give our agent hands.

The **Executor** is the engine that actually *performs* actions. It takes a task like "Run tests" and translates it into real-world commands (`npm test`).

## 🛠️ Skills as Code

A "Skill" is simply a prompt that teaches the LLM how to use a specific tool. We store skills as markdown files (`prompt.md`).

Example Skill: `git-commit`
```markdown
# Git Commit Skill

## Usage
When asked to commit changes, determine the message based on diffs.

## Output Format
```bash
git add .
git commit -m "feat: updated user model"
```
```

This simple format allows anyone to add new capabilities without writing complex TypeScript logic.

## ⚡ The `TaskExecutor`

The `TaskExecutor` class (`src/goals/executor.ts`) is responsible for:
1.  **Reading Task**: "Commit changes"
2.  **Matching Skill**: Find `git-commit` skill.
3.  **Prompting LLM**: Combine task + skill + context into a prompt.
4.  **Executing Commands**: Safely run the extracted shell commands.

### Key Logic:

```typescript
// 1. Prepare Prompt
const prompt = `You are executing task: "${task.title}".
Use the skill: "${task.skill}".

Current Directory: ${process.cwd()}

Write the exact shell commands needed inside a bash block.`;

// 2. Get Commands from LLM
const response = await llm.chat({ messages: [{ content: prompt }] });
const commands = extractBashBlocks(response.content);

// 3. Execute Safely
for (const cmd of commands) {
    if (isDangerous(cmd)) {
        await requestApproval(cmd); // Human-in-the-loop safety
    }
    const result = await execAsync(cmd);
    task.output += result.stdout;
}
```

### Safety First: The Human-in-the-loop

Giving an AI shell access is inherently risky. We mitigate this with:
- **Permission Scoping**: Skills can be marked `requiresApproval: true`.
- **Command Whitelisting**: Certain commands (`rm -rf /`) are blocked by default.
- **Sandboxing**: (Future) Run commands in Docker containers.

## 🔄 The Execution Loop

The agent runs in a loop via the `Daemon` (`src/daemon/service.ts`).
1.  **Check Queue**: Any pending tasks?
2.  **Pop Task**: Get highest priority task.
3.  **Execute**: Run `TaskExecutor.execute(task)`.
4.  **Analyze**: Did it succeed?
    - **Success**: Mark task complete, update goal progress.
    - **Failure**: Auto-retry or mark as failed.
5.  **Log**: Record activity in persistent memory.

## 🚀 Next Up: Memory

An agent needs to remember what it did yesterday. In **Part 4**, we'll build the **Memory Store** using SQLite and Vector Search.
