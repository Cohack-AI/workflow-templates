# Workflow Triggers

## Overview

Triggers determine **when and how** workflows execute. Cohack supports three trigger types: **OnDemand** (HTTP), **CronJob** (scheduled), and **AppTrigger** (event-driven). This guide covers all three in depth.

## Prerequisites

- Understanding of **[Workflow Basics](../getting-started/03-workflow-basics.md)**
- Workflow project set up

---

## Trigger Types Overview

| Trigger Type | Execution | Input | Use Cases |
|-------------|-----------|-------|-----------|
| **OnDemand** | HTTP API call | Custom | User-triggered actions, webhooks, API endpoints |
| **CronJob** | Scheduled | None (void) | Daily reports, periodic cleanup, scheduled posts |
| **AppTrigger** | App events | Auto-derived | New email, tweet mention, form submission |

---

## OnDemand Workflows

### Overview

OnDemand workflows are invoked via HTTP API calls. They accept custom input and return custom output.

**When to use:**
- User clicks a button in your app
- External service sends webhook
- API endpoint for on-demand processing
- Manual workflow execution

### Configuration

```typescript
import { BaseWorkflow, createCohackClient, WorkflowTriggerType } from '@cohack/client';
import { z } from 'zod';

const InputSchema = z.object({
  email: z.string().email(),
  campaignId: z.string()
});

const OutputSchema = z.object({
  success: z.boolean(),
  messageId: z.string()
});

class SendCampaignWorkflow extends BaseWorkflow<
  z.infer<typeof InputSchema>,
  z.infer<typeof OutputSchema>
> {
  constructor() {
    super({
      category: WorkflowTriggerType.OnDemand,
      inputSchema: InputSchema,  // Required
      outputSchema: OutputSchema  // Required
    });
  }

  async run(input: z.infer<typeof InputSchema>) {
    // Input is validated against schema
    const result = await this.client.apps.gmail.sendEmail({
      to: input.email,
      subject: 'Campaign Email',
      body: 'Content here'
    });

    return {
      success: true,
      messageId: result.messageId
    };
  }
}

const client = createCohackClient(process.env.COHACK_API_KEY!);
export const sendCampaign = new SendCampaignWorkflow();
export const handler = sendCampaign.createWorkflowHandler(client);
```

### Invoking OnDemand Workflows

**Via CLI (testing):**
```bash
cohack test run --data '{"email": "user@example.com", "campaignId": "camp_123"}'
```

**Via HTTP API (production):**
```bash
curl -X POST https://api.cohack.ai/v1/workflows/wf_abc123/invoke \
  -H "Authorization: Bearer wrk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "campaignId": "camp_123"}'
```

**Via Restate Client:**
```typescript
import { RestateClient } from '@restatedev/restate-sdk-clients';

const client = new RestateClient('https://your-restate-url');

const result = await client
  .workflowClient({ name: 'SendCampaignWorkflow' }, 'workflow-key-123')
  .workflowSubmit({ email: 'user@example.com', campaignId: 'camp_123' });
```

### Best Practices

1. **Validate input thoroughly** - Use Zod schema constraints
2. **Return meaningful output** - Include IDs, counts, status
3. **Use unique workflow keys** - For idempotency
4. **Handle invalid input gracefully** - Schema validation catches most issues

---

## CronJob Workflows

### Overview

CronJob workflows run on a schedule. They don't accept input and execute automatically.

**When to use:**
- Daily/weekly/monthly reports
- Periodic data synchronization
- Scheduled social media posts
- Cleanup tasks
- Recurring notifications

### Configuration

```typescript
import { BaseWorkflow, createCohackClient, WorkflowTriggerType } from '@cohack/client';
import { z } from 'zod';

const OutputSchema = z.object({
  postsCreated: z.number(),
  timestamp: z.string()
});

class DailySocialPostWorkflow extends BaseWorkflow<void, z.infer<typeof OutputSchema>> {
  constructor() {
    super({
      category: WorkflowTriggerType.CronJob,
      // No inputSchema for CronJob workflows
      outputSchema: OutputSchema
    });
  }

  async run() {
    // No input parameter
    this.client.ctx.console.log('Starting daily social post workflow');

    const timestamp = this.client.ctx.date().toISOString();

    // Generate content
    const model = this.client.agents.getWrappedModel('anthropic', 'claude-3-5-haiku-20241022');
    const result = await this.client.agents.generateText({
      model,
      system: 'You are a marketing expert',
      messages: [{ role: 'user', content: 'Write a motivational tweet for today' }]
    });

    // Post to Twitter
    await this.client.apps.twitter.createTweet({
      text: result.text
    });

    // Post to LinkedIn
    await this.client.apps.linkedin.createPost({
      content: result.text
    });

    return {
      postsCreated: 2,
      timestamp
    };
  }
}

const client = createCohackClient(process.env.COHACK_API_KEY!);
export const dailySocialPost = new DailySocialPostWorkflow();
export const handler = dailySocialPost.createWorkflowHandler(client);
```

### Setting Up Schedules

After deploying, configure the schedule:

```bash
cohack triggers create --type cron --schedule "rate(5 minutes)"
```

### Schedule Syntax

**Rate Expressions** - Simple intervals:
```bash
# Every N minutes (1-59)
rate(5 minutes)
rate(30 minutes)

# Every N hours (1-23)
rate(1 hour)
rate(6 hours)

# Every N days (1-365)
rate(1 day)
rate(7 days)
```

**Cron Expressions** - Specific times (AWS EventBridge syntax):
```
cron(Minutes Hours Day-of-month Month Day-of-week Year)
```

**Common cron patterns:**
```bash
# Every day at 9:00 AM UTC
cron(0 9 * * ? *)

# Every Monday at 10:00 AM UTC
cron(0 10 ? * MON *)

# Every weekday at 8:30 AM UTC
cron(30 8 ? * MON-FRI *)

# First day of every month at midnight
cron(0 0 1 * ? *)

# Every 15 minutes
cron(0/15 * * * ? *)

# Every hour at :30 minutes
cron(30 * * * ? *)
```

**Cron field values:**
- **Minutes**: 0-59
- **Hours**: 0-23 (UTC)
- **Day-of-month**: 1-31
- **Month**: 1-12 or JAN-DEC
- **Day-of-week**: 1-7 or SUN-SAT
- **Year**: 1970-2199

**Special characters:**
- `*` - All values
- `?` - No specific value (use in day-of-month or day-of-week)
- `/` - Increments (e.g., `0/15` = every 15 units)
- `-` - Range (e.g., `MON-FRI`)
- `,` - List (e.g., `MON,WED,FRI`)

### Managing Schedules

```bash
# Create trigger
cohack triggers create --type cron --schedule "cron(0 9 * * ? *)"

# Update trigger
cohack triggers update --schedule "cron(0 10 * * ? *)"

# List triggers
cohack triggers list

# Delete trigger
cohack triggers delete
```

### Best Practices

1. **Use UTC times** - Cron expressions are in UTC
2. **Consider timezone** - Convert local time to UTC
3. **Avoid overlap** - Ensure workflow completes before next execution
4. **Monitor execution** - Check logs for failures
5. **Handle idempotency** - Use deterministic workflow keys

---

## AppTrigger Workflows

### Overview

AppTrigger workflows are triggered by external app events (new email, tweet mention, form submission, etc.).

**When to use:**
- Auto-reply to emails
- Monitor social media mentions
- Process form submissions
- React to calendar events
- Handle incoming webhooks

### Configuration

```typescript
import { BaseWorkflow, createCohackClient, WorkflowTriggerType } from '@cohack/client';
import { IntegrationSlug } from '@cohack/types';
import { z } from 'zod';

const OutputSchema = z.object({
  replied: z.boolean(),
  messageId: z.string()
});

// Input schema is auto-derived from trigger type
class GmailAutoReplyWorkflow extends BaseWorkflow<any, z.infer<typeof OutputSchema>> {
  constructor() {
    super({
      category: WorkflowTriggerType.AppTrigger,
      triggerAppSlug: IntegrationSlug.Gmail,
      triggerType: 'gmail_new_message',  // Specific trigger event
      outputSchema: OutputSchema
      // inputSchema is automatically derived from trigger
    });
  }

  async run(input: any) {
    // Input contains data from Gmail trigger
    this.client.ctx.console.log('New email from:', input.from);
    this.client.ctx.console.log('Subject:', input.subject);
    this.client.ctx.console.log('Body:', input.body);

    // Generate AI response
    const model = this.client.agents.getWrappedModel('anthropic', 'claude-3-5-haiku-20241022');
    const response = await this.client.agents.generateText({
      model,
      system: 'You are a helpful email assistant',
      messages: [
        { role: 'user', content: `Generate a polite reply to: ${input.body}` }
      ]
    });

    // Send reply
    const result = await this.client.apps.gmail.sendEmail({
      to: input.from,
      subject: `Re: ${input.subject}`,
      body: response.text
    });

    return {
      replied: true,
      messageId: result.messageId
    };
  }
}

const client = createCohackClient(process.env.COHACK_API_KEY!);
export const gmailAutoReply = new GmailAutoReplyWorkflow();
export const handler = gmailAutoReply.createWorkflowHandler(client);
```

### Available App Triggers

**Gmail:**
- `gmail_new_message` - New email received
- `gmail_new_labeled_message` - Email with specific label

**Twitter:**
- `twitter_new_mention` - You're mentioned
- `twitter_new_follower` - New follower

**LinkedIn:**
- `linkedin_new_message` - New LinkedIn message

**Slack:**
- `slack_new_message` - New message in channel

**Google Calendar:**
- `calendar_new_event` - New event created
- `calendar_event_starting_soon` - Event starting in N minutes

**Forms/CRM:**
- `typeform_new_response` - New form submission
- `hubspot_new_contact` - New contact created

**...and more** - Check `@cohack/types` for complete list

### Setting Up App Triggers

1. **Deploy workflow:**
```bash
cohack deploy
```

2. **Configure trigger:**
```bash
cohack triggers create \
  --type app \
  --app gmail \
  --event new_message \
  --config '{"filterLabel": "Important"}'
```

3. **Authenticate app:**
```bash
cohack credentials add gmail
# Follow OAuth flow
```

4. **Test trigger:**
- Send test email (for Gmail)
- Create test event (for Calendar)
- Post test mention (for Twitter)

### Trigger Configuration Options

Different triggers support different configuration:

**Gmail filter:**
```bash
cohack triggers create \
  --type app \
  --app gmail \
  --event new_message \
  --config '{"filterLabel": "Support", "filterFrom": "customer@example.com"}'
```

**Calendar reminder:**
```bash
cohack triggers create \
  --type app \
  --app googleCalendar \
  --event event_starting_soon \
  --config '{"minutesBefore": 15}'
```

### Best Practices

1. **Filter events** - Use trigger config to reduce noise
2. **Handle duplicates** - Same event may trigger multiple times
3. **Use workflow keys** - Derive from event ID for idempotency
4. **Validate input** - Trigger data format may vary
5. **Handle rate limits** - High-volume triggers may hit API limits

---

## Multiple Triggers

A workflow can have multiple triggers:

```bash
# HTTP trigger
cohack triggers create --type http

# Cron trigger
cohack triggers create --type cron --schedule "rate(1 day)"

# App trigger
cohack triggers create --type app --app gmail --event new_message
```

**Use case:** A workflow that can be:
- Triggered manually (HTTP)
- Run daily (cron)
- Triggered by events (app)

---

## Trigger Management

### List All Triggers

```bash
cohack triggers list
```

Output:
```
Triggers for workflow: my-workflow

1. HTTP Trigger
   Type: http
   URL: https://api.cohack.ai/v1/workflows/wf_abc123/invoke

2. Cron Trigger
   Type: cron
   Schedule: rate(1 day)
   Next execution: 2025-01-15 09:00:00 UTC

3. App Trigger
   Type: app
   App: Gmail
   Event: new_message
   Status: active
```

### Update Trigger

```bash
# Update cron schedule
cohack triggers update --trigger-id trg_123 --schedule "cron(0 10 * * ? *)"

# Update app trigger config
cohack triggers update --trigger-id trg_456 --config '{"filterLabel": "Urgent"}'
```

### Delete Trigger

```bash
cohack triggers delete --trigger-id trg_123
```

Or interactive:
```bash
cohack triggers delete
# Select trigger from list
```

---

## Advanced Patterns

### Pattern: Workflow Key Derivation

For idempotency, derive workflow key from input:

**OnDemand:**
```typescript
// In your API call
const workflowKey = `campaign-${campaignId}-${userId}`;

await restateClient
  .workflowClient({ name: 'CampaignWorkflow' }, workflowKey)
  .workflowSubmit({ campaignId, userId });
```

**AppTrigger:**
```typescript
async run(input: GmailTriggerInput) {
  // Derive key from email message ID
  const workflowKey = `email-${input.messageId}`;
  this.client.ctx.console.log('Workflow key:', workflowKey);

  // Prevents duplicate processing if event fires twice
}
```

### Pattern: Conditional Execution

**CronJob with conditions:**
```typescript
async run() {
  const today = this.client.ctx.date();
  const dayOfWeek = today.getDay();

  // Only run on weekdays
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    this.client.ctx.console.log('Skipping weekend execution');
    return { skipped: true };
  }

  // Execute workflow logic
  return { executed: true };
}
```

**AppTrigger with filtering:**
```typescript
async run(input: GmailTriggerInput) {
  // Filter out automated emails
  if (input.from.includes('noreply@') || input.from.includes('no-reply@')) {
    this.client.ctx.console.log('Skipping automated email');
    return { replied: false };
  }

  // Process real emails
  await this.sendReply(input);
  return { replied: true };
}
```

### Pattern: Combining Triggers

**Workflow that works with any trigger:**
```typescript
class FlexibleWorkflow extends BaseWorkflow<Input, Output> {
  constructor() {
    super({
      category: WorkflowTriggerType.OnDemand,
      inputSchema: InputSchema,
      outputSchema: OutputSchema
    });
  }

  async run(input: Input) {
    // Detect execution source
    const source = input.source || 'api';

    this.client.ctx.console.log(`Triggered via: ${source}`);

    // Common workflow logic works regardless of trigger
    return await this.processData(input.data);
  }

  private async processData(data: any) {
    // Implementation
  }
}
```

---

## Troubleshooting

### Issue: CronJob not executing

**Check:**
1. Trigger is created: `cohack triggers list`
2. Workflow is deployed: `cohack deploy`
3. Schedule syntax is valid
4. Workflow hasn't timed out

**Fix:**
```bash
# Recreate trigger
cohack triggers delete --trigger-id trg_123
cohack triggers create --type cron --schedule "rate(1 day)"
```

### Issue: AppTrigger not firing

**Check:**
1. App credentials are connected: `cohack credentials list`
2. Trigger configuration is correct
3. Test event matches trigger filters
4. Webhook is receiving events (check app settings)

**Fix:**
```bash
# Re-authenticate app
cohack credentials remove gmail
cohack credentials add gmail

# Recreate trigger
cohack triggers create --type app --app gmail --event new_message
```

### Issue: OnDemand workflow not accepting input

**Check:**
1. Input matches schema exactly
2. Schema validation errors in logs
3. Required fields are provided

**Fix:**
```typescript
// Test schema manually
const result = InputSchema.safeParse(yourInput);
if (!result.success) {
  console.error(result.error);
}
```

---

## Next Steps

- **[Durable Utilities](./05-durable-utilities.md)** - Master workflow context APIs
- **[App Integrations](./06-app-integrations.md)** - Connect external services
- **[Testing](../advanced/11-testing.md)** - Test all trigger types locally

---

## Related Documentation

- **[Workflow Basics](../getting-started/03-workflow-basics.md)** - Core workflow patterns
- **[CLI Reference](../operations/14-cli-reference.md)** - Trigger commands
- **[Deployment](../operations/12-deployment.md)** - Deploy workflows with triggers
