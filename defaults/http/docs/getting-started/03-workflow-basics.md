# Workflow Basics

## Overview

This guide covers the fundamentals of writing Cohack workflows. You'll learn how to extend `BaseWorkflow`, define schemas, implement the `run()` method, and access client utilities.

## Prerequisites

- Completed **[Project Setup](./02-project-setup.md)**
- Basic TypeScript knowledge
- Understanding of async/await
- Familiarity with Zod schemas

---

## Workflow Structure

Every Cohack workflow follows this pattern:

```typescript
import { BaseWorkflow, createCohackClient, WorkflowTriggerType } from '@cohack/client';
import { z } from 'zod';

// 1. Define input/output schemas
const InputSchema = z.object({
  // Input fields
});

const OutputSchema = z.object({
  // Output fields
});

// 2. Create workflow class
class MyWorkflow extends BaseWorkflow<
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

  // 3. Implement run method
  async run(input: z.infer<typeof InputSchema>) {
    // Your workflow logic here
    return { /* output matching OutputSchema */ };
  }
}

// 4. Export workflow and handler
const client = createCohackClient(process.env.COHACK_API_KEY!);
export const myWorkflow = new MyWorkflow();
export const handler = myWorkflow.createWorkflowHandler(client);
```

---

## Step-by-Step: Complete Example

Let's build a real-world workflow that sends a welcome email and schedules a follow-up.

### Step 1: Define Schemas

```typescript
import { z } from 'zod';

// Input schema with validation
const WelcomeWorkflowInput = z.object({
  email: z.string().email('Must be a valid email'),
  name: z.string().min(1, 'Name is required').max(100),
  companyName: z.string().optional(),
  followupDelayHours: z.number().int().min(1).max(168).default(24)
});

// Output schema
const WelcomeWorkflowOutput = z.object({
  success: z.boolean(),
  emailsSent: z.number(),
  followupScheduled: z.boolean(),
  userId: z.string()
});

// Type inference for use in code
type WelcomeInput = z.infer<typeof WelcomeWorkflowInput>;
type WelcomeOutput = z.infer<typeof WelcomeWorkflowOutput>;
```

### Step 2: Create Workflow Class

```typescript
import { BaseWorkflow, createCohackClient, WorkflowTriggerType } from '@cohack/client';

class WelcomeEmailWorkflow extends BaseWorkflow<WelcomeInput, WelcomeOutput> {
  constructor() {
    super({
      category: WorkflowTriggerType.OnDemand,
      inputSchema: WelcomeWorkflowInput,
      outputSchema: WelcomeWorkflowOutput,
      options: {
        // Optional: customize workflow behavior
        workflowTimeout: { minutes: 30 },
        workflowRetryPolicy: {
          initialRetryInterval: { seconds: 5 },
          maxRetryAttempts: 3
        }
      }
    });
  }

  async run(input: WelcomeInput) {
    // Implementation in next step
  }
}
```

### Step 3: Implement Workflow Logic

```typescript
async run(input: WelcomeInput) {
  // Generate unique user ID (deterministic)
  const userId = this.client.ctx.uuidv4();

  // Log start
  this.client.ctx.console.log('Starting welcome workflow for:', input.email);

  // Store initial state
  await this.client.ctx.set?.('status', 'sending_welcome');
  await this.client.ctx.set?.('userId', userId);

  // Send welcome email
  const welcomeResult = await this.client.apps.gmail.sendEmail({
    to: input.email,
    subject: `Welcome ${input.name}!`,
    body: this.buildWelcomeEmail(input.name, input.companyName)
  });

  this.client.ctx.console.log('Welcome email sent:', welcomeResult.messageId);

  // Update state
  await this.client.ctx.set?.('status', 'waiting_for_followup');

  // Wait for follow-up delay (durable sleep)
  this.client.ctx.console.log(`Waiting ${input.followupDelayHours} hours for follow-up`);
  await this.client.ctx.sleep({ hours: input.followupDelayHours });

  // Send follow-up email
  const followupResult = await this.client.apps.gmail.sendEmail({
    to: input.email,
    subject: `Quick check-in, ${input.name}`,
    body: this.buildFollowupEmail(input.name)
  });

  this.client.ctx.console.log('Follow-up email sent:', followupResult.messageId);

  // Update final state
  await this.client.ctx.set?.('status', 'completed');

  return {
    success: true,
    emailsSent: 2,
    followupScheduled: true,
    userId
  };
}

// Helper method to build email content
private buildWelcomeEmail(name: string, companyName?: string): string {
  let body = `Hi ${name},\n\nWelcome to our platform!`;

  if (companyName) {
    body += ` We're excited to have ${companyName} on board.`;
  }

  body += `\n\nWe'll check in with you in 24 hours to see how things are going.`;
  body += `\n\nBest regards,\nThe Team`;

  return body;
}

private buildFollowupEmail(name: string): string {
  return `Hi ${name},\n\nJust checking in to see how your first day went!\n\nLet us know if you have any questions.\n\nBest,\nThe Team`;
}
```

### Step 4: Export Handler

```typescript
// Create client (reads from environment)
const client = createCohackClient(process.env.COHACK_API_KEY!);

// Instantiate workflow
export const welcomeEmailWorkflow = new WelcomeEmailWorkflow();

// Create and export handler
export const handler = welcomeEmailWorkflow.createWorkflowHandler(client);
```

### Complete File

```typescript
// src/index.ts
import { BaseWorkflow, createCohackClient, WorkflowTriggerType } from '@cohack/client';
import { z } from 'zod';

// Schemas
const WelcomeWorkflowInput = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  companyName: z.string().optional(),
  followupDelayHours: z.number().int().min(1).max(168).default(24)
});

const WelcomeWorkflowOutput = z.object({
  success: z.boolean(),
  emailsSent: z.number(),
  followupScheduled: z.boolean(),
  userId: z.string()
});

type WelcomeInput = z.infer<typeof WelcomeWorkflowInput>;
type WelcomeOutput = z.infer<typeof WelcomeWorkflowOutput>;

// Workflow class
class WelcomeEmailWorkflow extends BaseWorkflow<WelcomeInput, WelcomeOutput> {
  constructor() {
    super({
      category: WorkflowTriggerType.OnDemand,
      inputSchema: WelcomeWorkflowInput,
      outputSchema: WelcomeWorkflowOutput
    });
  }

  async run(input: WelcomeInput) {
    const userId = this.client.ctx.uuidv4();

    this.client.ctx.console.log('Starting welcome workflow for:', input.email);
    await this.client.ctx.set?.('status', 'sending_welcome');

    await this.client.apps.gmail.sendEmail({
      to: input.email,
      subject: `Welcome ${input.name}!`,
      body: this.buildWelcomeEmail(input.name, input.companyName)
    });

    await this.client.ctx.sleep({ hours: input.followupDelayHours });

    await this.client.apps.gmail.sendEmail({
      to: input.email,
      subject: `Quick check-in, ${input.name}`,
      body: this.buildFollowupEmail(input.name)
    });

    await this.client.ctx.set?.('status', 'completed');

    return {
      success: true,
      emailsSent: 2,
      followupScheduled: true,
      userId
    };
  }

  private buildWelcomeEmail(name: string, companyName?: string): string {
    let body = `Hi ${name},\n\nWelcome to our platform!`;
    if (companyName) body += ` We're excited to have ${companyName} on board.`;
    body += `\n\nBest regards,\nThe Team`;
    return body;
  }

  private buildFollowupEmail(name: string): string {
    return `Hi ${name},\n\nJust checking in!\n\nBest,\nThe Team`;
  }
}

// Exports
const client = createCohackClient(process.env.COHACK_API_KEY!);
export const welcomeEmailWorkflow = new WelcomeEmailWorkflow();
export const handler = welcomeEmailWorkflow.createWorkflowHandler(client);
```

---

## BaseWorkflow Deep Dive

### Constructor Options

```typescript
constructor() {
  super({
    // Required: Workflow trigger type
    category: WorkflowTriggerType.OnDemand,

    // Required for OnDemand workflows
    inputSchema: InputSchema,
    outputSchema: OutputSchema,

    // Optional: Workflow behavior
    options: {
      // Workflow timeout (abort after this time)
      workflowTimeout: { minutes: 30 },

      // Inactivity timeout (abort if no activity)
      inactivityTimeout: { minutes: 15 },

      // Workflow-level retry policy
      workflowRetryPolicy: {
        initialRetryInterval: { seconds: 5 },
        maxRetryInterval: { minutes: 5 },
        maxRetryAttempts: 10,
        maxRetryDuration: { hours: 1 }
      },

      // Default retry for @Step decorators
      defaultStepRetryPolicy: {
        initialRetryInterval: { seconds: 1 },
        maxRetryInterval: { seconds: 30 },
        maxRetryAttempts: 5
      }
    }
  });
}
```

### Available Categories

```typescript
enum WorkflowTriggerType {
  OnDemand = 'onDemand',    // HTTP invocation
  CronJob = 'cronJob',       // Scheduled
  AppTrigger = 'appTrigger'  // Event-driven
}
```

**Category-specific requirements:**

| Category | Input Schema | Output Schema | Additional Config |
|----------|-------------|---------------|-------------------|
| OnDemand | Required | Required | None |
| CronJob | Not used (void) | Optional | None |
| AppTrigger | Auto-derived | Required | `triggerAppSlug`, `triggerType` |

---

## Accessing Client Utilities

The workflow context is available via `this.client`:

### Workflow Context (`this.client.ctx`)

```typescript
async run(input: Input) {
  // Workflow key (unique instance ID)
  const workflowKey = this.client.ctx.key;

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
  await promise.resolve('approved');

  // Logging
  this.client.ctx.console.log('Message');
  this.client.ctx.console.error('Error');
  this.client.ctx.console.warn('Warning');
}
```

### App Integrations (`this.client.apps`)

```typescript
async run(input: Input) {
  // Email
  await this.client.apps.gmail.sendEmail({ to, subject, body });

  // Social media
  await this.client.apps.twitter.createTweet({ text });
  await this.client.apps.linkedin.createPost({ content });

  // Web scraping
  const data = await this.client.apps.firecrawl.scrapeUrl({ url });

  // And 25+ more integrations...
}
```

### AI Agents (`this.client.agents`)

```typescript
async run(input: Input) {
  const model = this.client.agents.getWrappedModel(
    'anthropic',
    'claude-3-5-haiku-20241022'
  );

  const result = await this.client.agents.generateText({
    model,
    messages: [{ role: 'user', content: 'Hello' }]
  });

  return { response: result.text };
}
```

### Human-in-the-Loop (`this.client.hitl`)

```typescript
async run(input: Input) {
  await this.client.hitl.sendForHumanApproval(
    this.client.ctx.key,
    'approval-key',
    { /* approval config */ }
  );

  const resolution = await this.client.ctx.promise('approval-key');
  return { approved: resolution.status === 'approved' };
}
```

---

## Working with Schemas

### Zod Schema Patterns

**Basic types:**
```typescript
const Schema = z.object({
  // String
  email: z.string().email(),
  url: z.string().url(),
  uuid: z.string().uuid(),

  // Number
  age: z.number().int().min(0).max(120),
  price: z.number().positive(),

  // Boolean
  active: z.boolean(),

  // Date
  createdAt: z.string().datetime(),

  // Enum
  status: z.enum(['pending', 'active', 'completed']),

  // Array
  tags: z.array(z.string()).min(1).max(10),

  // Optional fields
  description: z.string().optional(),

  // With defaults
  retries: z.number().int().default(3)
});
```

**Nested objects:**
```typescript
const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    zipCode: z.string().regex(/^\d{5}$/)
  }),
  preferences: z.object({
    newsletter: z.boolean().default(true),
    notifications: z.boolean().default(false)
  }).optional()
});
```

**Unions and discriminated unions:**
```typescript
// Simple union
const ResultSchema = z.union([
  z.object({ success: z.literal(true), data: z.any() }),
  z.object({ success: z.literal(false), error: z.string() })
]);

// Discriminated union (better)
const ResultSchema = z.discriminatedUnion('success', [
  z.object({ success: z.literal(true), data: z.any() }),
  z.object({ success: z.literal(false), error: z.string() })
]);
```

**Complex example:**
```typescript
const EmailCampaignInput = z.object({
  campaignName: z.string().min(1).max(100),
  recipients: z.array(
    z.object({
      email: z.string().email(),
      name: z.string(),
      customData: z.record(z.string()).optional()
    })
  ).min(1).max(1000),
  template: z.object({
    subject: z.string().max(200),
    body: z.string(),
    variables: z.record(z.string())
  }),
  schedule: z.object({
    sendAt: z.string().datetime().optional(),
    timezone: z.string().default('UTC')
  }).optional(),
  options: z.object({
    trackOpens: z.boolean().default(true),
    trackClicks: z.boolean().default(true),
    unsubscribeLink: z.boolean().default(true)
  })
});
```

### Schema Validation

Schemas are automatically validated:

```typescript
// Input is validated before run() is called
async run(input: ValidatedInput) {
  // Input is guaranteed to match schema
  console.log(input.email); // Type-safe access
}
```

**Manual validation:**
```typescript
async run(input: Input) {
  // Validate runtime data
  const result = InputSchema.safeParse(someData);

  if (!result.success) {
    this.client.ctx.console.error('Validation failed:', result.error);
    throw new Error('Invalid data');
  }

  const validData = result.data;
}
```

---

## Workflow Options

### Timeouts

```typescript
constructor() {
  super({
    category: WorkflowTriggerType.OnDemand,
    inputSchema: InputSchema,
    outputSchema: OutputSchema,
    options: {
      // Abort workflow after 30 minutes
      workflowTimeout: { minutes: 30 },

      // Abort if no activity for 15 minutes
      inactivityTimeout: { minutes: 15 }
    }
  });
}
```

**When to use:**
- `workflowTimeout`: Maximum total execution time
- `inactivityTimeout`: Detect stuck workflows

### Retry Policies

```typescript
constructor() {
  super({
    // ...
    options: {
      // Workflow-level retry
      workflowRetryPolicy: {
        initialRetryInterval: { seconds: 5 },
        maxRetryInterval: { minutes: 5 },
        maxRetryAttempts: 10,
        maxRetryDuration: { hours: 1 }
      }
    }
  });
}
```

**Retry fields:**
- `initialRetryInterval`: First retry delay
- `maxRetryInterval`: Maximum retry delay (exponential backoff)
- `maxRetryAttempts`: Stop after N retries
- `maxRetryDuration`: Stop retrying after total duration

**See [Error Handling](../advanced/10-error-handling.md) for comprehensive patterns.**

---

## Common Patterns

### Pattern: Multi-Step Workflow

```typescript
async run(input: Input) {
  // Step 1: Fetch data
  this.client.ctx.console.log('Step 1: Fetching data');
  const data = await this.fetchData(input.userId);

  // Step 2: Process data
  this.client.ctx.console.log('Step 2: Processing data');
  const processed = await this.processData(data);

  // Step 3: Send results
  this.client.ctx.console.log('Step 3: Sending results');
  await this.sendResults(processed, input.email);

  return { success: true, recordsProcessed: processed.length };
}

private async fetchData(userId: string) {
  // Implementation
}

private async processData(data: any[]) {
  // Implementation
}

private async sendResults(data: any[], email: string) {
  // Implementation
}
```

### Pattern: Conditional Logic

```typescript
async run(input: Input) {
  const userExists = await this.checkUserExists(input.email);

  if (userExists) {
    this.client.ctx.console.log('User exists, sending update email');
    await this.sendUpdateEmail(input.email);
  } else {
    this.client.ctx.console.log('New user, sending welcome email');
    await this.sendWelcomeEmail(input.email);
    await this.createUserRecord(input.email);
  }

  return { userExists, emailSent: true };
}
```

### Pattern: Looping with State

```typescript
async run(input: Input) {
  const items = input.items;
  let processedCount = 0;

  for (const item of items) {
    this.client.ctx.console.log(`Processing item ${item.id}`);

    await this.processItem(item);
    processedCount++;

    // Update state for progress tracking
    await this.client.ctx.set?.('processedCount', processedCount);

    // Rate limiting: wait between items
    if (processedCount < items.length) {
      await this.client.ctx.sleep({ seconds: 2 });
    }
  }

  return { success: true, processedCount };
}
```

### Pattern: Parallel Execution

```typescript
async run(input: Input) {
  // Execute multiple operations in parallel
  const [emailResult, tweetResult, postResult] = await Promise.all([
    this.client.apps.gmail.sendEmail({
      to: input.email,
      subject: 'Update',
      body: 'Content'
    }),
    this.client.apps.twitter.createTweet({
      text: input.tweetText
    }),
    this.client.apps.linkedin.createPost({
      content: input.postContent
    })
  ]);

  return {
    emailSent: true,
    tweetPosted: true,
    linkedInPosted: true
  };
}
```

### Pattern: Wait for External Event

```typescript
async run(input: Input) {
  // Send email with confirmation link
  await this.client.apps.gmail.sendEmail({
    to: input.email,
    subject: 'Please confirm your email',
    body: `Click here to confirm: ${input.confirmUrl}`
  });

  // Wait for confirmation (resolved via Signal handler)
  const confirmationPromise = this.client.ctx.promise<boolean>('confirmation');
  const timeoutPromise = this.client.ctx.sleep({ hours: 24 }).then(() => false);

  const confirmed = await Promise.race([confirmationPromise, timeoutPromise]);

  if (confirmed) {
    await this.activateAccount(input.userId);
    return { confirmed: true, accountActive: true };
  } else {
    return { confirmed: false, accountActive: false };
  }
}
```

---

## Anti-Patterns to Avoid

### ❌ Non-Deterministic Operations

```typescript
// BAD - Different value on retry
async run(input: Input) {
  const id = Math.random().toString();
  await this.client.ctx.sleep({ minutes: 1 });
  console.log(id); // Will be different after sleep!
}

// GOOD - Deterministic
async run(input: Input) {
  const id = this.client.ctx.uuidv4();
  await this.client.ctx.sleep({ minutes: 1 });
  this.client.ctx.console.log(id); // Same value
}
```

### ❌ External State Without Context

```typescript
// BAD - State not persisted
let counter = 0;
async run(input: Input) {
  counter++;
  await this.client.ctx.sleep({ minutes: 1 });
  console.log(counter); // Lost on restart!
}

// GOOD - Persisted state
async run(input: Input) {
  let counter = await this.client.ctx.get<number>('counter') || 0;
  counter++;
  await this.client.ctx.set?.('counter', counter);
  this.client.ctx.console.log(counter);
}
```

### ❌ Regular console.log

```typescript
// BAD - Not durable
async run(input: Input) {
  console.log('Processing...'); // Lost on restart
}

// GOOD - Durable logging
async run(input: Input) {
  this.client.ctx.console.log('Processing...'); // Persisted
}
```

### ❌ Unhandled Promises

```typescript
// BAD - Fire and forget
async run(input: Input) {
  this.client.apps.gmail.sendEmail({ /* ... */ }); // No await!
  return { success: true }; // Email might not be sent!
}

// GOOD - Await all promises
async run(input: Input) {
  await this.client.apps.gmail.sendEmail({ /* ... */ });
  return { success: true };
}
```

---

## Testing Your Workflow

Test locally before deploying:

```bash
# Test with inline data
cohack test run --data '{"email": "test@example.com", "name": "Test User"}'

# Test with scenario file
cohack test run --scenario ./test-welcome.json
```

**See [Testing Guide](../advanced/11-testing.md) for comprehensive testing patterns.**

---

## Next Steps

- **[Configure Triggers](../core-concepts/04-triggers.md)** - Set up when workflows execute
- **[Use Durable Utilities](../core-concepts/05-durable-utilities.md)** - Master sleep, state, promises
- **[Add App Integrations](../core-concepts/06-app-integrations.md)** - Connect to external services
- **[Error Handling](../advanced/10-error-handling.md)** - Make workflows robust

---

## Related Documentation

- **[Overview](./01-overview.md)** - SDK introduction
- **[Project Setup](./02-project-setup.md)** - Project structure
- **[Decorators](../advanced/08-decorators.md)** - Advanced composition
- **[Type Reference](../reference/16-type-reference.md)** - TypeScript types
