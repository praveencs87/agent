# Building The Brain: AI Goal Decomposition (Part 2/5)

In **Part 1**, we saw that the key difference between a chatbot and an agent is structure.

A chatbot might say: "Here is a list of steps to build a blog."
An agent says: "I have created 5 pending tasks for you to approve or let me execute."

This transformation happens in the **Planner**.

## 🧠 The `GoalDecomposer`

### The Problem
LLMs are notoriously bad at holding long chains of reasoning. If you say "Build me a facebook clone", they might hallucinately spit out 200 lines of code and then stop.

### The Solution: Recursion
Instead of one massive prompt, we can use **Recursive Decomposition**.
1.  **Receive Goal**: "Build a blog app"
2.  **Decompose**: Break it into 3-5 high-level tasks.
    - "Set up Next.js"
    - "Create Database schema"
    - "Implement styling"
3.  **Refine**: If a task is too complex ("Implement styling" is huge), decompose *that* task further.

### 💻 The Code

We built `src/goals/decomposer.ts` to handle this. Here's the core logic:

```typescript
// 1. Construct the planning prompt
const systemPrompt = `You are an expert project manager AI.
Your goal is to break down a high-level objective into actionable, atomic tasks.

Rules:
1. Each task must be executable by a single skill (e.g., shell command, file write).
2. Define dependencies (Task B depends on Task A).
3. If a task is dangerous (e.g., delete DB), mark it 'requiresApproval: true'.

Output ONLY valid JSON:
{
  "tasks": [
    { "title": "...", "skill": "git-clone", "dependsOn": [] },
    ...
  ]
}`;

// 2. Call the LLM
const completion = await llm.chat({
    messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Goal: ${userGoal}` }
    ]
});

// 3. Parse and Store
const plan = JSON.parse(completion.content);
for (const task of plan.tasks) {
    await goalStore.addTask(task);
}
```

### Why This Works better
- **Context Window**: By breaking things down, each step fits comfortably in the LLM's context window.
- **Error Recovery**: If "Set up Database" fails, the agent knows exactly *which* part failed and can retry just that task, instead of restarting the whole conversation.
- **Parallelism**: Tasks without dependencies can be executed simultaneously (e.g., designing the logo while the database spins up).

### Real-World Example

**Goal**: "Deploy to Vercel"

**Decomposition**:
1.  Task #1: `vercel login` (Skill: `shell-exec`)
2.  Task #2: `vercel link` (Skill: `shell-exec`, Depends on #1)
3.  Task #3: `vercel build` (Skill: `shell-exec`, Depends on #2)
4.  Task #4: `vercel deploy --prod` (Skill: `shell-exec`, Depends on #3)

This structured approach transforms vague intents into a reliable execution graph.

## 🚀 Next Up: Execution

In **Part 3**, we'll build the engines that actually *do* the work: The **Skill Executor**. We'll learn how to let an AI safely run shell commands.
