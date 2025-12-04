# Project Setup

## Overview

This guide covers creating, configuring, and organizing Cohack workflow projects. You'll learn the project structure, configuration files, and best practices for setting up your development environment.

## Prerequisites

- Node.js 20+ installed
- `@cohack/client` installed globally (`npm install -g @cohack/client`)
- Cohack API key (get from [cohack.ai](https://cohack.ai))
- Git (optional, for version control)

---

## Creating a New Project

### Interactive Mode

The easiest way to create a project:

```bash
cohack init
```

You'll be prompted for:
- **Workflow name:** Display name for your workflow
- **Category:** OnDemand, CronJob, or AppTrigger
- **Template:** Choose a starter template
- **Git setup:** Configure remote repository (optional)

Example interaction:
```
? What is the workflow name? My Email Campaign
? Select workflow category: OnDemand
? Choose a template: default
? Set up Git repository? Yes
? Git remote URL: git@github.com:myorg/my-workflow.git
```

### Non-Interactive Mode

For automation or scripts:

```bash
cohack init \
  --name "My Email Campaign" \
  --category onDemand \
  --template default \
  --non-interactive
```

Available options:
- `--name <name>` - Workflow name
- `--category <category>` - `onDemand`, `cronJob`, or `appTrigger`
- `--template <template>` - Template name (default: `default`)
- `--non-interactive` - Skip all prompts
- `--skip-install` - Don't run npm install
- `--skip-git` - Don't initialize Git

---

## Project Structure

After running `cohack init`, you'll have this structure:

```
my-email-campaign/
├── .cohack/                  # Cohack metadata (don't edit manually)
│   ├── project.json          # Workflow ID, binding tokens, git info
│   ├── builds/               # Built bundles (created on build)
│   ├── deployments/          # Deployment history
│   └── test-runs/            # Test execution logs
├── src/
│   └── index.ts              # Your workflow code (entry point)
├── .env                      # Environment variables (git-ignored)
├── .gitignore
├── cohack.config.json        # Project configuration
├── package.json              # Node.js dependencies
├── tsconfig.json             # TypeScript configuration
└── README.md
```

### Important Files

#### `src/index.ts` - Entry Point

Your workflow code goes here. Must export:
- A workflow instance
- A handler function

```typescript
import { BaseWorkflow, createCohackClient, WorkflowTriggerType } from '@cohack/client';
import { z } from 'zod';

class MyWorkflow extends BaseWorkflow<Input, Output> {
  constructor() {
    super({
      category: WorkflowTriggerType.OnDemand,
      inputSchema: InputSchema,
      outputSchema: OutputSchema
    });
  }

  async run(input: Input) {
    // Your workflow logic
    return { success: true };
  }
}

// Required exports
const client = createCohackClient(process.env.COHACK_API_KEY!);
export const myWorkflow = new MyWorkflow();
export const handler = myWorkflow.createWorkflowHandler(client);
```

#### `.cohack/project.json` - Project Metadata

Auto-generated, contains workflow ID and configuration:

```json
{
  "workflowId": "wf_abc123def456",
  "nanoId": "abc123",
  "slug": "my-email-campaign",
  "name": "My Email Campaign",
  "category": "onDemand",
  "gitRemoteUrl": "git@cohack.ai:abc123/my-email-campaign.git",
  "branchName": "main",
  "bindingToken": "wrk_secrettoken123"
}
```

**Don't edit this file manually!** It's managed by the CLI.

#### `cohack.config.json` - Project Configuration

User-editable configuration:

```json
{
  "$schema": "https://cli.cohack.ai/schema/cohack.json",
  "name": "My Email Campaign",
  "description": "Automated email campaign workflow",
  "version": "1.0.0"
}
```

Available fields:
- `name` - Workflow display name
- `description` - Description for documentation
- `version` - Semantic version (e.g., "1.0.0")

#### `.env` - Environment Variables

Store secrets and configuration:

```bash
# Cohack API Key
COHACK_API_KEY=wrk_your_api_key_here

# Custom environment variables
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
CUSTOM_API_URL=https://api.example.com
```

**Important:** This file is git-ignored by default. Never commit secrets to Git!

#### `tsconfig.json` - TypeScript Configuration

Recommended configuration for Cohack workflows:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", ".cohack"]
}
```

---

## Configuration Best Practices

### Environment Variables

**Always use environment variables for:**
- API keys and secrets
- Service URLs
- Feature flags
- Environment-specific configuration

**Example:**
```typescript
class MyWorkflow extends BaseWorkflow<Input, Output> {
  async run(input: Input) {
    // ✅ Good - from environment
    const apiKey = process.env.EXTERNAL_API_KEY;

    // ❌ Bad - hardcoded secret
    const apiKey = 'sk-1234567890';
  }
}
```

### Project Organization

For complex workflows, organize code into modules:

```
src/
├── index.ts                 # Entry point and exports
├── workflows/
│   ├── email-campaign.ts    # Main workflow
│   └── followup.ts          # Secondary workflow
├── steps/
│   ├── send-email.ts        # Reusable step functions
│   └── generate-content.ts
├── schemas/
│   ├── input.ts             # Zod schemas
│   └── output.ts
└── utils/
    ├── email-templates.ts   # Helper functions
    └── validators.ts
```

**Entry point pattern:**
```typescript
// src/index.ts
import { createCohackClient } from '@cohack/client';
import { EmailCampaignWorkflow } from './workflows/email-campaign';
import { FollowupWorkflow } from './workflows/followup';

const client = createCohackClient(process.env.COHACK_API_KEY!);

export const emailCampaign = new EmailCampaignWorkflow();
export const followup = new FollowupWorkflow();

export const handler = emailCampaign.createWorkflowHandler(client);
export const followupHandler = followup.createWorkflowHandler(client);
```

---

## Managing Dependencies

### Required Dependencies

These are automatically installed by `cohack init`:

```json
{
  "dependencies": {
    "@cohack/client": "^1.0.0",
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "typescript": "^5.8.0",
    "@types/node": "^20.0.0"
  }
}
```

### Adding External Packages

Install additional packages as needed:

```bash
# Add a package
npm install axios

# Add dev dependencies
npm install -D @types/axios

# Add specific version
npm install lodash@^4.17.0
```

**Example usage:**
```typescript
import axios from 'axios';

class MyWorkflow extends BaseWorkflow<Input, Output> {
  async run(input: Input) {
    const response = await axios.get('https://api.example.com/data');
    return { data: response.data };
  }
}
```

### Package Considerations

When adding packages, consider:
- **Bundle size** - Larger packages increase deployment time
- **Native dependencies** - May not work in AWS Lambda
- **Version compatibility** - Ensure compatibility with Node.js 20+

**Recommended packages:**
- `axios` - HTTP client
- `lodash` - Utility functions
- `date-fns` - Date manipulation
- `zod` - Schema validation (already included)

---

## Git Integration

### Setting Up Git

During `cohack init`, you can configure Git:

```bash
cohack init
# Answer "Yes" to "Set up Git repository?"
# Provide your Git remote URL
```

Or manually:
```bash
git init
git remote add origin git@github.com:myorg/my-workflow.git
```

### `.gitignore` Best Practices

Default `.gitignore`:
```gitignore
# Dependencies
node_modules/

# Build outputs
dist/
.cohack/builds/
.cohack/test-runs/

# Environment variables
.env
.env.local

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Logs
*.log
```

**Never commit:**
- `node_modules/` - Large and regeneratable
- `.env` - Contains secrets
- `.cohack/builds/` - Generated artifacts
- `dist/` - Compiled output

**Always commit:**
- `src/` - Your source code
- `.cohack/project.json` - Workflow metadata
- `cohack.config.json` - Configuration
- `package.json` - Dependencies
- `tsconfig.json` - TypeScript config

### Version Control Workflow

Recommended Git workflow:

```bash
# Make changes
vim src/index.ts

# Test locally
cohack test run --data '{}'

# Commit changes
git add .
git commit -m "Add email sending step"

# Deploy
cohack deploy

# Push to Git (deploy creates a tag automatically)
git push origin main --tags
```

**Note:** `cohack deploy` automatically creates a Git tag like `v_abc123_my-workflow_1234567890` and can push it to your remote.

---

## Multiple Workflows in One Project

You can define multiple workflows in a single project:

### Option 1: Separate Files

```
src/
├── index.ts
├── workflows/
│   ├── welcome-email.ts
│   ├── followup-email.ts
│   └── reminder-email.ts
```

**index.ts:**
```typescript
import { createCohackClient } from '@cohack/client';
import { WelcomeEmailWorkflow } from './workflows/welcome-email';
import { FollowupEmailWorkflow } from './workflows/followup-email';
import { ReminderEmailWorkflow } from './workflows/reminder-email';

const client = createCohackClient(process.env.COHACK_API_KEY!);

export const welcomeEmail = new WelcomeEmailWorkflow();
export const followupEmail = new FollowupEmailWorkflow();
export const reminderEmail = new ReminderEmailWorkflow();

// Export primary handler
export const handler = welcomeEmail.createWorkflowHandler(client);

// Export additional handlers
export const followupHandler = followupEmail.createWorkflowHandler(client);
export const reminderHandler = reminderEmail.createWorkflowHandler(client);
```

### Option 2: Single File

```typescript
// src/index.ts
class WelcomeEmail extends BaseWorkflow<Input1, Output1> {
  // ...
}

class FollowupEmail extends BaseWorkflow<Input2, Output2> {
  // ...
}

const client = createCohackClient(process.env.COHACK_API_KEY!);

export const welcomeEmail = new WelcomeEmail();
export const followupEmail = new FollowupEmail();

export const handler = welcomeEmail.createWorkflowHandler(client);
export const followupHandler = followupEmail.createWorkflowHandler(client);
```

**When to use multiple workflows:**
- Related but distinct processes
- Shared utilities and schemas
- Same deployment lifecycle

**When to use separate projects:**
- Completely different domains
- Different teams or ownership
- Independent deployment schedules

---

## Cloning Existing Workflows

To clone a workflow from Cohack Cloud:

```bash
cohack clone
```

You'll be prompted for:
- Workflow ID to clone
- Local directory name

Or non-interactive:
```bash
cohack clone --workflow-id wf_abc123 --directory my-workflow
```

This downloads:
- Source code
- Configuration files
- Project metadata

---

## Configuration Schema Reference

### cohack.config.json Schema

Full JSON schema available at: `https://cli.cohack.ai/schema/cohack.json`

```typescript
{
  "$schema": "https://cli.cohack.ai/schema/cohack.json",
  "name": string,           // Workflow display name
  "description"?: string,   // Optional description
  "version"?: string        // Semantic version
}
```

### .cohack/project.json Fields

```typescript
{
  "workflowId": string,     // Unique workflow ID (wf_...)
  "nanoId": string,         // Short ID for URLs
  "slug": string,           // URL-safe name
  "name": string,           // Display name
  "category": "onDemand" | "cronJob" | "appTrigger",
  "gitRemoteUrl"?: string,  // Git remote (optional)
  "branchName"?: string,    // Git branch (optional)
  "bindingToken": string    // Deployment authentication
}
```

---

## Troubleshooting

### Issue: `cohack init` fails with "Template not found"

**Solution:** Use the default template:
```bash
cohack init --template default
```

### Issue: TypeScript errors after init

**Solution:** Ensure TypeScript is installed:
```bash
npm install -D typescript
```

### Issue: `.cohack/project.json` is missing

**Solution:** Run `cohack init` again or create manually:
```json
{
  "workflowId": "wf_temp",
  "nanoId": "temp",
  "slug": "my-workflow",
  "name": "My Workflow",
  "category": "onDemand",
  "bindingToken": "wrk_temp"
}
```

Then re-deploy to get proper IDs.

### Issue: Git remote not set up

**Solution:** Add remote manually:
```bash
git remote add origin git@github.com:myorg/repo.git
```

Update `.cohack/project.json`:
```json
{
  "gitRemoteUrl": "git@github.com:myorg/repo.git",
  "branchName": "main"
}
```

---

## Best Practices Summary

1. **Use environment variables** for all secrets and configuration
2. **Organize code** into logical modules for complex workflows
3. **Version control** everything except secrets and build artifacts
4. **Test locally** before deploying (`cohack test`)
5. **Keep project.json untouched** - let CLI manage it
6. **Use TypeScript strict mode** for better type safety
7. **Document your workflow** in README.md or comments

---

## Next Steps

- **[Learn workflow basics](./03-workflow-basics.md)** - Write your first workflow
- **[Configure triggers](../core-concepts/04-triggers.md)** - Set up execution patterns
- **[Test locally](../advanced/11-testing.md)** - Validate before deployment

---

## Related Documentation

- **[Overview](./01-overview.md)** - SDK introduction
- **[CLI Reference](../operations/14-cli-reference.md)** - All CLI commands
- **[Deployment](../operations/12-deployment.md)** - Deploy to production
