# Building The Memory: Long-Term Context (Part 4/5)

In **Part 3**, we gave our agent hands to execute tasks. But an agent with amnesia is frustrating.

Imagine hiring a developer who forgets your project structure every morning. That's why we need **Long-Term Memory**.

## 🧠 The Problem of Context

LLMs have limited context windows (e.g., 128k tokens). You can't fit your entire codebase, documentation, and history into every prompt. We need to selectively retrieve only relevant information.

## 💾 The Solution: SQLite + Semantic Search

We built a custom `MemoryStore` using `better-sqlite3`.

### 1. Structured Data (Relational)
Tasks, Goals, and Metrics fit perfectly into traditional SQL tables.
- `goals`: Track high-level objectives.
- `tasks`: Track individual steps and success/failure.
- `audit_events`: immutable log of every action taken.

### 2. Unstructured Data (Semantic)
But what about "The login button is broken on mobile"? This is unstructured text.
We store this in a `memories` table with **Vector Embeddings** or **Full-Text Search (FTS5)**.

We chose FTS5 for simplicity and speed:
```sql
CREATE VIRTUAL TABLE memories_fts USING fts5(content, metadata);
```

When you search for "login bug", SQLite's FTS5 engine finds relevant rows instantly based on keywords, even in large datasets.

### 💻 The Implementation

In `src/memory/store.ts`:

```typescript
// 1. Save a Memory
memoryStore.save(
    "The login button is broken on mobile Safari.",
    "fact", // Type: fact, rule, learned
    "web-app", // Domain/Project
    ["bug", "login", "mobile"] // Tags
_ );

// 2. Retrieve Context
const relevant = memoryStore.search("login issues", 5);
// Returns: [{ content: "The login button is broken...", score: ... }]

// 3. Use in Prompt
const prompt = `Task: Fix login bug.
Context:
${relevant.map(m => `- ${m.content}`).join('\n')}

Based on this context, write a fix.`;
```

## 🔄 The Learning Loop

Every time a task completes successfully (or fails spectacularly), we record a **Learned Memory**.

- **Success**: "Using `image: node:18-alpine` fixed the build error."
- **Failure**: "Don't use `rm -rf` without checking path first."

The next time a similar task comes up ("Fix build error"), the agent searches its memory, finds the previous solution, and applies it automatically. This creates a compounding intelligence effect.

## 🚀 Next Up: Self-Improvement

In the final **Part 5**, we'll cover the most exciting feature: **The Auto-Fixer**.
How can an agent detect its own bugs and rewrite its own code?
