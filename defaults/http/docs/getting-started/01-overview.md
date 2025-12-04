# Cohack SDK Overview

## Overview

The Cohack SDK is a TypeScript framework for building **durable, reliable marketing workflows** that integrate with 25+ external services, AI agents, and human-in-the-loop approvals. Built on top of [Restate](https://restate.dev), it provides automatic retries, crash recovery, and deterministic execution for long-running business processes.

**What You Can Build:**
- Scheduled social media posting campaigns
- Multi-channel marketing automation
- AI-powered content generation workflows
- Lead nurturing sequences
- Data synchronization pipelines
- Human-approved content workflows

**Key Features:**
- 🔄 **Durable Execution** - Workflows survive crashes and resume automatically
- 🔌 **25+ Integrations** - Gmail, Slack, LinkedIn, Twitter, Instagram, etc.
- 🤖 **AI-Powered** - Built-in support for Claude, GPT-4, and custom agents
- 👥 **Human-in-the-Loop** - Approval workflows for content review
- ⚡ **Type-Safe** - Full TypeScript support with auto-completion
- 🧪 **Testable** - Local testing with Restate test containers
- 🚀 **Serverless** - Deploys to AWS Lambda with managed infrastructure

---

## Prerequisites

Before using this SDK, you should have:
- Node.js 20+ installed
- TypeScript knowledge
- Basic understanding of async/await
- Cohack API key (get one at [cohack.ai](https://cohack.ai))

---

## Installation

```bash
npm install -g @cohack/client
```

Verify installation:
```bash
cohack --version
```

---

## Core Concepts in 2 Minutes

### 1. Workflows
A workflow is a TypeScript class that defines a business process:

```typescript
import { BaseWorkflow, createCohackClient, WorkflowTriggerType } from '@cohack/client';
import { z } from 'zod';

class WelcomeEmailWorkflow extends BaseWorkflow<Input, Output> {
  constructor() {
    super({
      category: WorkflowTriggerType.OnDemand,
      inputSchema: z.object({ email: z.string().email() }),
      outputSchema: z.object({ success: z.boolean() })
    });
  }

  async run(input: { email: string }) {
    // Your workflow logic here
    await this.client.apps.gmail.sendEmail({
      to: input.email,
      subject: 'Welcome!',
      body: 'Thanks for joining us!'
    });

    return { success: true };
  }
}
```

### 2. Triggers (How Workflows Execute)

Workflows can be triggered in 3 ways:

| Trigger Type | Description | Example |
|-------------|-------------|---------|
| **OnDemand** | HTTP API invocation | User clicks "Send Campaign" button |
| **CronJob** | Scheduled execution | Daily reports at 9 AM |
| **AppTrigger** | Event-driven from apps | New Gmail message received |

### 3. Durability (Why This Matters)

Traditional code:
```typescript
// ❌ If this crashes during sleep, you lose all progress
async function sendReminder(email: string) {
  await sendEmail(email, 'First reminder');
  await sleep(24 * 60 * 60 * 1000); // 24 hours - risky!
  await sendEmail(email, 'Second reminder');
}
```

Cohack workflow:
```typescript
// ✅ If this crashes, it resumes exactly where it left off
async run(input: { email: string }) {
  await this.client.apps.gmail.sendEmail({
    to: input.email,
    subject: 'First reminder',
    body: 'Don\'t forget!'
  });

  await this.client.ctx.sleep({ hours: 24 }); // Durable sleep

  await this.client.apps.gmail.sendEmail({
    to: input.email,
    subject: 'Second reminder',
    body: 'Final reminder!'
  });

  return { success: true };
}
```

**The difference:** Cohack workflows are **durable** - they survive crashes, timeouts, and restarts without losing progress.

### 4. Integrations (Apps)

Access 25+ services with type-safe APIs:

```typescript
// Send email
await this.client.apps.gmail.sendEmail({ to, subject, body });

// Post to social media
await this.client.apps.twitter.createTweet({ text: 'Hello!' });
await this.client.apps.linkedin.createPost({ content: 'Update' });

// Scrape websites
const data = await this.client.apps.firecrawl.scrapeUrl({ url: 'https://example.com' });

// Generate images
const video = await this.client.apps.heygen.createVideo({ script: 'Hello' });
```

### 5. AI Agents

Generate content, analyze data, or build conversational workflows:

```typescript
const model = this.client.agents.getWrappedModel(
  'anthropic',
  'claude-3-5-haiku-20241022'
);

const result = await this.client.agents.generateText({
  model,
  system: 'You are a marketing copywriter.',
  messages: [{ role: 'user', content: 'Write a tweet about AI' }]
});

console.log(result.text); // Generated tweet
```

---

## Quick Start: Your First Workflow

### Step 1: Login

```bash
cohack login
# Enter your API key when prompted
```

### Step 2: Create a New Workflow

```bash
cohack init
```

Follow the prompts:
- **Workflow name:** "My First Workflow"
- **Category:** OnDemand
- **Template:** default

This creates a new directory with:
```
my-first-workflow/
├── src/
│   └── index.ts          # Your workflow code
├── .cohack/
│   └── project.json      # Project metadata
├── cohack.config.json    # Configuration
├── package.json
└── tsconfig.json
```

### Step 3: Write Your Workflow

Edit `src/index.ts`:

```typescript
import { BaseWorkflow, createCohackClient, WorkflowTriggerType } from '@cohack/client';
import { z } from 'zod';

const InputSchema = z.object({
  name: z.string(),
  email: z.string().email()
});

const OutputSchema = z.object({
  message: z.string(),
  success: z.boolean()
});

class GreetingWorkflow extends BaseWorkflow<
  z.infer<typeof InputSchema>,
  z.infer<typeof OutputSchema>
> {
  constructor() {
    super({
      category: WorkflowTriggerType.OnDemand,
      inputSchema: InputSchema,
      outputSchema: OutputSchema
    });
  }

  async run(input: z.infer<typeof InputSchema>) {
    this.client.ctx.console.log('Processing greeting for:', input.name);

    // Send welcome email
    await this.client.apps.gmail.sendEmail({
      to: input.email,
      subject: `Welcome ${input.name}!`,
      body: `Hello ${input.name}, thanks for joining us!`
    });

    return {
      message: `Sent welcome email to ${input.name}`,
      success: true
    };
  }
}

// Export workflow
const client = createCohackClient(process.env.COHACK_API_KEY!);
export const greetingWorkflow = new GreetingWorkflow();
export const handler = greetingWorkflow.createWorkflowHandler(client);
```

### Step 4: Test Locally

```bash
cohack test run --data '{"name": "Alice", "email": "alice@example.com"}'
```

You should see:
```
✓ Workflow completed successfully
Output: { message: "Sent welcome email to Alice", success: true }
```

### Step 5: Deploy to Production

```bash
cohack deploy
```

Your workflow is now live! You can invoke it via API or the Cohack dashboard.

---

## Architecture Overview

The Cohack SDK has two main components:

### 1. CLI (`cohack` command)

Manages workflow lifecycle:
- `cohack init` - Create new workflows
- `cohack build` - Bundle workflows for deployment
- `cohack deploy` - Deploy to Cohack Cloud
- `cohack test` - Test workflows locally
- `cohack triggers` - Configure execution triggers
- `cohack credentials` - Manage app integrations

### 2. Client SDK (`@cohack/client` package)

Used in your workflow code:
- `BaseWorkflow` - Base class for workflows
- `createCohackClient()` - Initialize client
- `this.client.ctx` - Workflow context (sleep, state, promises)
- `this.client.apps` - App integrations
- `this.client.agents` - AI/LLM capabilities
- `this.client.hitl` - Human-in-the-loop approvals

**Execution Flow:**

```
┌─────────────┐
│ Your Code   │ (TypeScript workflow class)
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ Cohack SDK  │ (Wraps Restate SDK)
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ Restate     │ (Durable execution engine)
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ AWS Lambda  │ (Serverless compute)
└─────────────┘
```

---

## Workflow Categories Explained

### OnDemand Workflows

**When to use:** User-triggered actions, API endpoints, webhooks

**Characteristics:**
- Invoked via HTTP API
- Accepts custom input
- Returns custom output
- Requires input/output schemas

**Example Use Cases:**
- "Send campaign" button in your app
- Process incoming webhook from external service
- Generate report on demand

```typescript
class OnDemandExample extends BaseWorkflow<Input, Output> {
  constructor() {
    super({
      category: WorkflowTriggerType.OnDemand,
      inputSchema: InputSchema,
      outputSchema: OutputSchema
    });
  }
}
```

### CronJob Workflows

**When to use:** Scheduled, recurring tasks

**Characteristics:**
- Runs on a schedule (cron or rate expression)
- No input (void input)
- Can return output for logging
- Configurable via `cohack triggers`

**Example Use Cases:**
- Daily social media posts
- Weekly reports
- Hourly data synchronization

```typescript
class CronJobExample extends BaseWorkflow<void, Output> {
  constructor() {
    super({
      category: WorkflowTriggerType.CronJob,
      outputSchema: OutputSchema
      // No inputSchema needed
    });
  }

  async run() {
    // No input parameter
    const report = await this.generateDailyReport();
    return report;
  }
}
```

**Schedule examples:**
```bash
# Every 5 minutes
cohack triggers create --type cron --schedule "rate(5 minutes)"

# Daily at 9 AM UTC
cohack triggers create --type cron --schedule "cron(0 9 * * ? *)"

# Every Monday at 10 AM
cohack triggers create --type cron --schedule "cron(0 10 ? * MON *)"
```

### AppTrigger Workflows

**When to use:** React to external events

**Characteristics:**
- Triggered by app events (new email, new tweet mention, etc.)
- Input schema derived from trigger type
- Requires trigger app configuration
- Webhook-based

**Example Use Cases:**
- Auto-reply to Gmail messages
- Monitor Twitter mentions and respond
- Process new leads from form submissions

```typescript
import { IntegrationSlug } from '@cohack/types';

class AppTriggerExample extends BaseWorkflow<GmailNewMessageInput, Output> {
  constructor() {
    super({
      category: WorkflowTriggerType.AppTrigger,
      triggerAppSlug: IntegrationSlug.Gmail,
      triggerType: 'gmail_new_message',
      outputSchema: OutputSchema
    });
  }

  async run(input: GmailNewMessageInput) {
    // input contains message data from Gmail trigger
    this.client.ctx.console.log('New email from:', input.from);

    // Process the email
    return { processed: true };
  }
}
```

---

## Key Workflow Utilities

### Durable Sleep

Wait for minutes, hours, or days without worrying about crashes:

```typescript
// Wait 5 minutes
await this.client.ctx.sleep({ minutes: 5 });

// Wait 24 hours
await this.client.ctx.sleep({ hours: 24 });

// Wait 7 days
await this.client.ctx.sleep({ days: 7 });
```

### State Management

Store and retrieve data across workflow execution:

```typescript
// Store state
await this.client.ctx.set?.('status', 'processing');
await this.client.ctx.set?.('counter', 42);

// Retrieve state
const status = await this.client.ctx.get('status');
const counter = await this.client.ctx.get<number>('counter');
```

### Deterministic UUID

Generate stable UUIDs that are the same on retry:

```typescript
const id = this.client.ctx.uuidv4();
// Same ID even if workflow restarts
```

### Durable Promises

Coordinate async operations:

```typescript
// Create a promise
const approvalPromise = this.client.ctx.promise<string>('approval-key');

// Wait for it (can be resolved from outside)
const result = await approvalPromise;

// Or resolve it
await approvalPromise.resolve('approved');
```

### Console Logging

Durable logs that persist across restarts:

```typescript
this.client.ctx.console.log('Processing started');
this.client.ctx.console.error('Error occurred', error);
this.client.ctx.console.warn('Warning message');
```

---

## When to Use Cohack SDK vs Regular Code

### Use Cohack SDK when:
- ✅ Workflows run for minutes, hours, or days
- ✅ You need reliability and crash recovery
- ✅ Coordinating multiple external API calls
- ✅ Human approvals are required
- ✅ Scheduled or event-driven execution
- ✅ State needs to persist across retries

### Use regular code when:
- ❌ Simple, sub-second operations
- ❌ No external API calls
- ❌ No need for retry logic
- ❌ Stateless request/response patterns
- ❌ Pure computation (no I/O)

---

## Documentation Navigation

### Getting Started
- **[Project Setup](./02-project-setup.md)** - Create and configure workflow projects
- **[Workflow Basics](./03-workflow-basics.md)** - Write your first workflow

### Core Concepts
- **[Triggers](../core-concepts/04-triggers.md)** - Configure when workflows run
- **[Durable Utilities](../core-concepts/05-durable-utilities.md)** - Sleep, state, promises
- **[App Integrations](../core-concepts/06-app-integrations.md)** - Use 25+ services
- **[AI Agents](../core-concepts/07-ai-agents.md)** - Add AI to workflows

### Advanced
- **[Decorators](../advanced/08-decorators.md)** - @Step, @Query, @Signal, @Subtask
- **[Human-in-the-Loop](../advanced/09-human-in-loop.md)** - Approval workflows
- **[Error Handling](../advanced/10-error-handling.md)** - Robust error patterns
- **[Testing](../advanced/11-testing.md)** - Test workflows locally

### Operations
- **[Deployment](../operations/12-deployment.md)** - Deploy to production
- **[Debugging](../operations/13-debugging.md)** - Troubleshoot workflows
- **[CLI Reference](../operations/14-cli-reference.md)** - All CLI commands

### Reference
- **[Restate Concepts](../reference/15-restate-concepts.md)** - Understand durability
- **[Type Reference](../reference/16-type-reference.md)** - TypeScript types

---

## Next Steps

1. **[Set up your first project](./02-project-setup.md)** - Learn project structure
2. **[Write a basic workflow](./03-workflow-basics.md)** - Master workflow patterns
3. **[Explore integrations](../core-concepts/06-app-integrations.md)** - Connect to external services

---

## Getting Help

- **Documentation:** You're reading it!
- **GitHub Issues:** [github.com/anthropics/claude-code/issues](https://github.com/anthropics/claude-code/issues)
- **API Reference:** [cohack.ai/docs](https://cohack.ai/docs)

---

## Common Questions

### Q: How is this different from regular serverless functions?
**A:** Regular functions lose all state on crash. Cohack workflows automatically checkpoint and resume, making long-running processes reliable.

### Q: Can I use this without Restate knowledge?
**A:** Yes! The SDK abstracts Restate complexity. Just use `this.client.ctx` utilities and don't worry about the internals.

### Q: What happens if my workflow crashes?
**A:** It automatically resumes from the last checkpoint. No progress is lost.

### Q: How do I handle errors?
**A:** See **[Error Handling](../advanced/10-error-handling.md)** for comprehensive patterns.

### Q: Can I test without deploying?
**A:** Yes! Use `cohack test` to run workflows locally with Restate test containers.

---

**Ready to build?** Continue to **[Project Setup](./02-project-setup.md)** →
