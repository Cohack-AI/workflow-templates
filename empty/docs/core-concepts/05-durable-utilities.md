# Durable Utilities

## Overview

Cohack workflows provide durable utilities via `this.client.ctx` that ensure reliability across crashes and restarts. This guide covers sleep, state management, promises, deterministic operations, and logging.

## Prerequisites

- Understanding of **[Workflow Basics](../getting-started/03-workflow-basics.md)**
- Familiarity with Restate concepts (see **[Restate Concepts](../reference/15-restate-concepts.md)**)

---

## Why Durability Matters

Regular code:
```typescript
// ❌ Loses progress on crash
async function sendReminders() {
  await sendEmail('first@example.com');
  await sleep(24 * 60 * 60 * 1000); // 24 hours
  await sendEmail('second@example.com'); // Lost if crashed during sleep!
}
```

Durable workflow:
```typescript
// ✅ Resumes exactly where it left off
async run(input: Input) {
  await this.client.apps.gmail.sendEmail({ to: 'first@example.com', ... });
  await this.client.ctx.sleep({ hours: 24 }); // Durable sleep
  await this.client.apps.gmail.sendEmail({ to: 'second@example.com', ... });
}
```

**The difference:** Durable operations are checkpointed. If the workflow crashes, it resumes from the last checkpoint.

---

## Workflow Context API

Access via `this.client.ctx`:

```typescript
async run(input: Input) {
  // Workflow instance key
  const key = this.client.ctx.key;

  // Deterministic UUID
  const id = this.client.ctx.uuidv4();

  // Current timestamp (deterministic)
  const now = this.client.ctx.date();

  // Durable sleep
  await this.client.ctx.sleep({ minutes: 5 });

  // State management
  await this.client.ctx.set?.('counter', 42);
  const counter = await this.client.ctx.get<number>('counter');

  // Durable promises
  const promise = this.client.ctx.promise<string>('approval');

  // Logging
  this.client.ctx.console.log('Message');
}
```

---

## Durable Sleep

Wait for minutes, hours, or days without worrying about crashes.

### Basic Usage

```typescript
async run(input: Input) {
  // Wait 5 minutes
  await this.client.ctx.sleep({ minutes: 5 });

  // Wait 2 hours
  await this.client.ctx.sleep({ hours: 2 });

  // Wait 7 days
  await this.client.ctx.sleep({ days: 7 });

  // Wait 30 seconds
  await this.client.ctx.sleep({ seconds: 30 });

  // Wait 500 milliseconds
  await this.client.ctx.sleep({ milliseconds: 500 });
}
```

### Sleep Duration Object

```typescript
type SleepDuration = {
  milliseconds?: number;
  seconds?: number;
  minutes?: number;
  hours?: number;
  days?: number;
};

// Can combine units (they're additive)
await this.client.ctx.sleep({
  hours: 1,
  minutes: 30,
  seconds: 45
}); // Sleeps for 1h 30m 45s
```

### Pattern: Multi-Stage Workflow

```typescript
async run(input: Input) {
  // Stage 1: Send welcome email
  await this.client.apps.gmail.sendEmail({
    to: input.email,
    subject: 'Welcome!',
    body: 'Thanks for signing up'
  });

  // Wait 24 hours
  await this.client.ctx.sleep({ hours: 24 });

  // Stage 2: Send tips email
  await this.client.apps.gmail.sendEmail({
    to: input.email,
    subject: 'Quick tips',
    body: 'Here are some tips...'
  });

  // Wait 3 days
  await this.client.ctx.sleep({ days: 3 });

  // Stage 3: Send feedback request
  await this.client.apps.gmail.sendEmail({
    to: input.email,
    subject: 'How are we doing?',
    body: 'We\'d love your feedback'
  });

  return { emailsSent: 3 };
}
```

### Pattern: Rate Limiting

```typescript
async run(input: Input) {
  const items = input.items;

  for (let i = 0; i < items.length; i++) {
    // Process item
    await this.processItem(items[i]);

    // Wait between items (except last)
    if (i < items.length - 1) {
      await this.client.ctx.sleep({ seconds: 2 });
    }
  }
}
```

---

## State Management

Store and retrieve data that persists across workflow execution.

### Basic Operations

```typescript
async run(input: Input) {
  // Set state (key-value pairs)
  await this.client.ctx.set?.('status', 'processing');
  await this.client.ctx.set?.('counter', 42);
  await this.client.ctx.set?.('user', { id: '123', name: 'Alice' });

  // Get state
  const status = await this.client.ctx.get('status');
  const counter = await this.client.ctx.get<number>('counter');
  const user = await this.client.ctx.get<{ id: string; name: string }>('user');

  // Clear state
  await this.client.ctx.clear?.('status');
}
```

### Type Safety

```typescript
// Define state types
interface WorkflowState {
  status: 'pending' | 'processing' | 'completed';
  progress: number;
  errors: string[];
}

async run(input: Input) {
  // Set typed state
  await this.client.ctx.set?.<WorkflowState['status']>('status', 'processing');
  await this.client.ctx.set?.<number>('progress', 0);
  await this.client.ctx.set?.<string[]>('errors', []);

  // Get typed state
  const status = await this.client.ctx.get<WorkflowState['status']>('status');
  const progress = await this.client.ctx.get<number>('progress');
}
```

### Pattern: Progress Tracking

```typescript
async run(input: Input) {
  const total = input.emails.length;
  let sent = 0;

  await this.client.ctx.set?.('total', total);
  await this.client.ctx.set?.('sent', 0);

  for (const email of input.emails) {
    await this.client.apps.gmail.sendEmail({
      to: email,
      subject: 'Campaign',
      body: 'Content'
    });

    sent++;
    await this.client.ctx.set?.('sent', sent);

    const progress = (sent / total) * 100;
    this.client.ctx.console.log(`Progress: ${progress.toFixed(1)}%`);
  }

  return { sent, total };
}
```

### Pattern: Error Accumulation

```typescript
async run(input: Input) {
  const errors: string[] = [];

  for (const item of input.items) {
    try {
      await this.processItem(item);
    } catch (error) {
      const errorMsg = `Failed to process ${item.id}: ${error.message}`;
      errors.push(errorMsg);
      await this.client.ctx.set?.('errors', errors);
    }
  }

  return {
    processed: input.items.length - errors.length,
    failed: errors.length,
    errors
  };
}
```

---

## Durable Promises

Coordinate async operations with promises that persist across restarts.

### Basic Usage

```typescript
async run(input: Input) {
  // Create a promise
  const approvalPromise = this.client.ctx.promise<string>('approval-key');

  // Do some work
  await this.prepareForApproval();

  // Wait for promise to be resolved (from outside workflow)
  const result = await approvalPromise;

  this.client.ctx.console.log('Approval result:', result);
}
```

### Resolving Promises

**From Signal handler:**
```typescript
import { Signal } from '@cohack/client';

@Signal()
async handleApproval(data: { approved: boolean }) {
  const promise = this.client.ctx.promise<boolean>('approval-key');
  await promise.resolve(data.approved);
}

async run(input: Input) {
  const approvalPromise = this.client.ctx.promise<boolean>('approval-key');

  // Notify user to approve
  await this.notifyForApproval(input.userId);

  // Wait for approval (resolved via Signal)
  const approved = await approvalPromise;

  if (approved) {
    await this.proceedWithAction();
  }
}
```

### Pattern: Wait with Timeout

```typescript
async run(input: Input) {
  const confirmationPromise = this.client.ctx.promise<boolean>('confirmation');
  const timeoutPromise = this.client.ctx.sleep({ hours: 24 }).then(() => false);

  // Race: whichever completes first wins
  const confirmed = await Promise.race([confirmationPromise, timeoutPromise]);

  if (confirmed) {
    return { status: 'confirmed' };
  } else {
    return { status: 'timeout' };
  }
}
```

### Pattern: Multiple Promises

```typescript
async run(input: Input) {
  // Create multiple promises
  const payment = this.client.ctx.promise<boolean>('payment');
  const shipping = this.client.ctx.promise<boolean>('shipping');
  const inventory = this.client.ctx.promise<boolean>('inventory');

  // Trigger external checks
  await this.triggerPaymentCheck(input.orderId);
  await this.triggerShippingCheck(input.orderId);
  await this.triggerInventoryCheck(input.orderId);

  // Wait for all
  const [paymentOk, shippingOk, inventoryOk] = await Promise.all([
    payment,
    shipping,
    inventory
  ]);

  if (paymentOk && shippingOk && inventoryOk) {
    await this.completeOrder(input.orderId);
    return { status: 'completed' };
  } else {
    return { status: 'failed', paymentOk, shippingOk, inventoryOk };
  }
}
```

---

## Deterministic Operations

For reliability, some operations must be deterministic (same result on replay).

### Deterministic UUID

```typescript
async run(input: Input) {
  // ✅ Same UUID on retry/replay
  const id = this.client.ctx.uuidv4();

  await this.client.ctx.sleep({ minutes: 1 });

  // Still the same ID after sleep
  this.client.ctx.console.log('ID:', id);

  return { requestId: id };
}
```

**Why it matters:**
```typescript
// ❌ BAD - Different UUID on retry
const id = crypto.randomUUID();
await this.client.ctx.sleep({ minutes: 1 });
console.log(id); // Different value after restart!

// ✅ GOOD - Same UUID on retry
const id = this.client.ctx.uuidv4();
await this.client.ctx.sleep({ minutes: 1 });
this.client.ctx.console.log(id); // Same value
```

### Deterministic Timestamp

```typescript
async run(input: Input) {
  // ✅ Same timestamp on retry/replay
  const startTime = this.client.ctx.date();

  await this.client.ctx.sleep({ minutes: 1 });

  // Still the same timestamp
  const duration = this.client.ctx.date().getTime() - startTime.getTime();

  return { startTime: startTime.toISOString(), duration };
}
```

**Use `ctx.date()` for:**
- Timestamps in database records
- Workflow start/end times
- Deterministic date calculations

**Don't use `new Date()`** - it returns different values on replay.

---

## Console Logging

Durable logs that persist in Restate journal.

### Basic Logging

```typescript
async run(input: Input) {
  // Log levels
  this.client.ctx.console.log('Info message');
  this.client.ctx.console.error('Error message', error);
  this.client.ctx.console.warn('Warning message');
  this.client.ctx.console.debug('Debug message');
}
```

### Structured Logging

```typescript
async run(input: Input) {
  // Log with context
  this.client.ctx.console.log('Processing started', {
    userId: input.userId,
    timestamp: this.client.ctx.date().toISOString()
  });

  // Log errors with stack traces
  try {
    await this.riskyOperation();
  } catch (error) {
    this.client.ctx.console.error('Operation failed', {
      error: error.message,
      stack: error.stack,
      userId: input.userId
    });
    throw error;
  }
}
```

### Pattern: Step Logging

```typescript
async run(input: Input) {
  this.client.ctx.console.log('=== Workflow Started ===');
  this.client.ctx.console.log('Input:', JSON.stringify(input));

  this.client.ctx.console.log('Step 1: Fetching data...');
  const data = await this.fetchData(input.userId);
  this.client.ctx.console.log('Data fetched:', data.length, 'records');

  this.client.ctx.console.log('Step 2: Processing data...');
  const processed = await this.processData(data);
  this.client.ctx.console.log('Processing complete:', processed.length, 'items');

  this.client.ctx.console.log('Step 3: Sending results...');
  await this.sendResults(processed);
  this.client.ctx.console.log('Results sent successfully');

  this.client.ctx.console.log('=== Workflow Completed ===');

  return { success: true };
}
```

---

## Complete Example

```typescript
import { BaseWorkflow, createCohackClient, WorkflowTriggerType } from '@cohack/client';
import { z } from 'zod';

const InputSchema = z.object({
  userId: z.string(),
  campaignId: z.string(),
  emails: z.array(z.string().email())
});

const OutputSchema = z.object({
  campaignId: z.string(),
  emailsSent: z.number(),
  errors: z.array(z.string()),
  duration: z.number()
});

class EmailCampaignWorkflow extends BaseWorkflow<
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
    // Deterministic tracking ID
    const trackingId = this.client.ctx.uuidv4();
    const startTime = this.client.ctx.date();

    this.client.ctx.console.log('Campaign started', {
      campaignId: input.campaignId,
      trackingId,
      startTime: startTime.toISOString()
    });

    // Initialize state
    await this.client.ctx.set?.('status', 'running');
    await this.client.ctx.set?.('sent', 0);
    await this.client.ctx.set?.('errors', []);

    const errors: string[] = [];
    let sent = 0;

    // Process emails
    for (const email of input.emails) {
      try {
        await this.client.apps.gmail.sendEmail({
          to: email,
          subject: 'Campaign Email',
          body: `Campaign ID: ${input.campaignId}`
        });

        sent++;
        await this.client.ctx.set?.('sent', sent);

        this.client.ctx.console.log(`Sent ${sent}/${input.emails.length}`);

        // Rate limiting
        if (sent < input.emails.length) {
          await this.client.ctx.sleep({ seconds: 2 });
        }
      } catch (error) {
        const errorMsg = `Failed to send to ${email}: ${error.message}`;
        errors.push(errorMsg);
        await this.client.ctx.set?.('errors', errors);
        this.client.ctx.console.error(errorMsg);
      }
    }

    // Calculate duration
    const endTime = this.client.ctx.date();
    const duration = endTime.getTime() - startTime.getTime();

    // Final state
    await this.client.ctx.set?.('status', 'completed');

    this.client.ctx.console.log('Campaign completed', {
      sent,
      failed: errors.length,
      duration
    });

    return {
      campaignId: input.campaignId,
      emailsSent: sent,
      errors,
      duration
    };
  }
}

const client = createCohackClient(process.env.COHACK_API_KEY!);
export const emailCampaign = new EmailCampaignWorkflow();
export const handler = emailCampaign.createWorkflowHandler(client);
```

---

## Best Practices

1. **Always use `ctx.sleep()`** - Never use `setTimeout` or regular `sleep`
2. **Always use `ctx.set/get()`** - For state that needs to persist
3. **Always use `ctx.uuidv4()`** - Never use `Math.random()` or `crypto.randomUUID()`
4. **Always use `ctx.date()`** - Never use `new Date()` for deterministic timestamps
5. **Always use `ctx.console.log()`** - For durable logging

---

## Anti-Patterns

### ❌ Non-Deterministic Random
```typescript
// BAD
const id = Math.random().toString();
```

### ❌ Non-Deterministic Time
```typescript
// BAD
const now = new Date();
```

### ❌ External State
```typescript
// BAD
let counter = 0;
counter++;
```

### ❌ Regular console.log
```typescript
// BAD
console.log('Message');
```

### ✅ Correct Patterns
```typescript
// GOOD
const id = this.client.ctx.uuidv4();
const now = this.client.ctx.date();
let counter = await this.client.ctx.get<number>('counter') || 0;
counter++;
await this.client.ctx.set?.('counter', counter);
this.client.ctx.console.log('Message');
```

---

## Next Steps

- **[App Integrations](./06-app-integrations.md)** - Connect external services
- **[AI Agents](./07-ai-agents.md)** - Add AI capabilities
- **[Decorators](../advanced/08-decorators.md)** - Advanced patterns

---

## Related Documentation

- **[Workflow Basics](../getting-started/03-workflow-basics.md)** - Core patterns
- **[Restate Concepts](../reference/15-restate-concepts.md)** - Deep dive on durability
- **[Debugging](../operations/13-debugging.md)** - Troubleshoot workflows
