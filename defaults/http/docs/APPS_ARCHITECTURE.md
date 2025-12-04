# Apps Architecture Guide

## Overview

The Cohack SDK provides a unified API to access multiple app integration providers (Composio, RapidAPI, Unipile). This architecture allows developers to access apps through two patterns:

1. **Provider-based**: `apps.[provider].[appName].[action]`
2. **App-based**: `apps.[appName].[action]`

## Architecture Components

### 1. Provider Modules

Each provider has its own module that instantiates all available apps for that provider:

- **ComposioProvider** (`composio-provider.module.ts`)
- **RapidAPIProvider** (`rapidapi-provider.module.ts`)
- **UnipileProvider** (`unipile-provider.module.ts`)

### 2. App Plugins

Each app has provider-specific plugin implementations:

```
src/apps/plugins/
├── composio/
│   ├── twitter.plugin.ts
│   ├── gmail.plugin.ts
│   └── ...
├── rapidapi/
│   └── twitter.plugin.ts
└── unipile/
    └── twitter.plugin.ts
```

### 3. Generic Unified App Plugin

A single generic `UnifiedAppPlugin` class automatically combines all provider-specific methods for any app:

```
src/apps/unified/
└── unified-app.plugin.ts
```

This generic approach eliminates the need to create individual unified classes for each app!

### 4. ApplicationsModule

The main entry point that exposes both provider-based and app-based access patterns.

## Usage Examples

### Provider-based Access

```typescript
const client = createCohackClient('api-key');

// Explicit provider selection
await client.apps.composio.twitter.createANewDmConversation({...});
await client.apps.unipile.twitter.sendDm();
await client.apps.rapidapi.twitter.readProfile();
```

### App-based Access

```typescript
const client = createCohackClient('api-key');

// All Twitter actions from all providers in one place
await client.apps.twitter.createANewDmConversation({...}); // Composio
await client.apps.twitter.sendDm(); // Unipile
await client.apps.twitter.readProfile(); // RapidAPI
```

## Adding a New App to a Provider

### Step 1: Create the Plugin

Create a new plugin file for the app in the provider's directory:

```typescript
// src/apps/plugins/rapidapi/gmail.plugin.ts
import { BasePlugin } from '@/apps/base/base-plugin';
import { HttpClient } from '@/client/http-client';
import { IntegrationSlug } from '@cohack/types';

export class GmailRapidAPIPlugin extends BasePlugin {
    constructor(httpClient?: HttpClient) {
        super(httpClient, IntegrationSlug.Gmail);
    }

    async sendEmail(input: SendEmailInput): Promise<SendEmailOutput> {
        return this.executeRapidAPIAction<SendEmailOutput>(
            'GMAIL_SEND_EMAIL',
            input
        );
    }

    // Add more actions...
}
```

### Step 2: Update the Provider Module

Add the new app to the provider module:

```typescript
// src/apps/rapidapi-provider.module.ts
import { GmailRapidAPIPlugin } from './plugins/rapidapi/gmail.plugin';

export class RapidAPIProvider {
    public twitter: TwitterRapidAPIPlugin;
    public gmail: GmailRapidAPIPlugin; // Add this

    constructor(private httpClient: HttpClient) {
        this.twitter = new TwitterRapidAPIPlugin(httpClient);
        this.gmail = new GmailRapidAPIPlugin(httpClient); // Add this
    }
}
```

### Step 3: Update ApplicationsModule with Generic Unified Plugin

Add the unified app to the ApplicationsModule using the generic `createUnifiedApp` factory:

```typescript
// src/apps/applications.module.ts
import { createUnifiedApp } from './unified/unified-app.plugin';

export class ApplicationsModule {
    public composio: ComposioProvider;
    public rapidapi: RapidAPIProvider;
    public unipile: UnipileProvider;

    public twitter: ReturnType<typeof createUnifiedApp<{...}>>;
    public gmail: ReturnType<typeof createUnifiedApp<{...}>>; // Add this

    constructor(private httpClient: HttpClient) {
        this.composio = new ComposioProvider(httpClient);
        this.rapidapi = new RapidAPIProvider(httpClient);
        this.unipile = new UnipileProvider(httpClient);

        this.twitter = createUnifiedApp({
            composio: this.composio.twitter,
            rapidapi: this.rapidapi.twitter,
            unipile: this.unipile.twitter,
        });

        // Add this - No need to create a separate class!
        this.gmail = createUnifiedApp({
            composio: this.composio.gmail,
            rapidapi: this.rapidapi.gmail,
        });
    }
}
```

**That's it!** The generic `UnifiedAppPlugin` automatically:
- Discovers all methods from all providers
- Creates proxy methods with full type safety
- Handles method name conflicts with warnings
- Maintains the `this` context correctly

## Ensuring Unique Method Names

**CRITICAL**: When creating unified plugins, ensure method names don't overlap across providers.

### Good Examples (No Overlap)

```typescript
// Composio Twitter
async createANewDmConversation() {...}
async followUser() {...}

// Unipile Twitter
async sendDm() {...}  // Unique name

// RapidAPI Twitter
async readProfile() {...}  // Unique name
```

### Bad Examples (Overlap)

```typescript
// ❌ Both have 'sendMessage'
composio.twitter.sendMessage()
unipile.twitter.sendMessage()  // CONFLICT!
```

### Resolution Strategies

1. **Use descriptive names**: `createANewDmConversation` vs `sendDm`
2. **Add provider prefix**: `composioSendMessage` vs `unipileSendMessage`
3. **Use action context**: `sendDirectMessage` vs `sendGroupMessage`

## Type Safety

All methods maintain full type safety:

```typescript
import type {
    TwitterCreateANewDmConversationInput,
    TwitterCreateANewDmConversationOutput
} from '@cohack/types';

async createANewDmConversation(
    input: TwitterCreateANewDmConversationInput
): Promise<TwitterCreateANewDmConversationOutput> {
    return this.executeComposioAction<TwitterCreateANewDmConversationOutput>(
        TwitterActions.TwitterCreateANewDmConversation,
        input
    );
}
```

## Best Practices

1. **Provider-specific plugins**: Keep provider logic isolated in their respective plugin files
2. **Unified plugins**: Only create unified plugins when an app exists in multiple providers
3. **Naming conventions**: Use clear, descriptive method names that won't conflict
4. **Type imports**: Always import types from `@cohack/types` for consistency
5. **Documentation**: Add JSDoc comments explaining what each action does
6. **Error handling**: Leverage the BasePlugin's built-in error handling

## File Structure Reference

```
src/apps/
├── applications.module.ts          # Main unified API
├── composio-provider.module.ts     # Composio provider
├── rapidapi-provider.module.ts     # RapidAPI provider
├── unipile-provider.module.ts      # Unipile provider
├── base/
│   └── base-plugin.ts              # Base class for all plugins
├── plugins/
│   ├── composio/
│   │   ├── twitter.plugin.ts
│   │   ├── gmail.plugin.ts
│   │   └── ...
│   ├── rapidapi/
│   │   └── twitter.plugin.ts
│   └── unipile/
│       └── twitter.plugin.ts
└── unified/
    └── unified-app.plugin.ts       # Generic unified plugin (works for all apps!)
```

## Testing

When adding new apps or actions:

1. Test provider-based access: `apps.rapidapi.twitter.readProfile()`
2. Test app-based access: `apps.twitter.readProfile()`
3. Verify type safety with TypeScript compiler
4. Ensure no method name conflicts in unified plugins
5. Test with real API credentials if available

## Future Considerations

- **Auto-generation**: Consider generating unified plugins automatically
- **Dynamic loading**: Load plugins dynamically based on available providers
- **Provider fallback**: If one provider fails, automatically try another
- **Provider selection**: Allow users to specify preferred providers
