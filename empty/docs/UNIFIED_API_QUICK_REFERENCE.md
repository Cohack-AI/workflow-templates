# Unified Apps API - Quick Reference

## Overview

The Cohack SDK now provides a **unified API** to access apps across multiple providers (Composio, RapidAPI, Unipile).

## Two Access Patterns

### 1. Provider-based Access
Explicitly specify which provider to use:

```typescript
// Composio
await client.apps.composio.twitter.createANewDmConversation({...});
await client.apps.composio.gmail.sendEmail({...});
await client.apps.composio.slack.sendMessage({...});

// RapidAPI
await client.apps.rapidapi.twitter.readProfile();

// Unipile
await client.apps.unipile.twitter.sendDm();
```

### 2. App-based Access (Unified)
Access all providers' actions for an app in one place:

```typescript
// All Twitter actions from all providers
await client.apps.twitter.createANewDmConversation({...}); // Composio
await client.apps.twitter.sendDm(); // Unipile
await client.apps.twitter.readProfile(); // RapidAPI
```

## Key Benefits

✅ **Type Safety**: All methods are fully typed with input/output types
✅ **Flexibility**: Choose between provider-specific or unified access
✅ **No Conflicts**: Method names are unique across providers
✅ **Extensible**: Easy to add new apps and providers

## Current Structure

```
ApplicationsModule
├── Provider Access
│   ├── composio (ComposioProvider)
│   │   ├── twitter
│   │   ├── gmail
│   │   ├── slack
│   │   └── ... (24 apps total)
│   ├── rapidapi (RapidAPIProvider)
│   │   └── twitter
│   └── unipile (UnipileProvider)
│       └── twitter
│
└── App Access (Unified)
    └── twitter (UnifiedTwitterPlugin)
        ├── Composio actions (20+ methods)
        ├── Unipile actions (sendDm)
        └── RapidAPI actions (readProfile)
```

## Example Usage

```typescript
import { createCohackClient } from '@cohack/client';

const client = createCohackClient('your-api-key');

// Provider-based: Explicit provider selection
const result1 = await client.apps.composio.twitter.createANewDmConversation({
    participant_ids: ['123', '456'],
    message: { text: 'Hello!' }
});

// App-based: Simpler, same functionality
const result2 = await client.apps.twitter.createANewDmConversation({
    participant_ids: ['123', '456'],
    message: { text: 'Hello!' }
});

// Both results have the same type: TwitterCreateANewDmConversationOutput
```

## When to Use Each Pattern

### Use Provider-based when:
- You need to be explicit about which provider you're using
- You're using provider-specific features or configurations
- You want to easily switch between providers for A/B testing
- You're debugging provider-specific issues

### Use App-based when:
- You don't care which provider implements the action
- You want a simpler, more intuitive API
- You're using actions that are unique to a single provider anyway
- You want to reduce code verbosity

## Architecture Files

- `src/apps/applications.module.ts` - Main unified API
- `src/apps/composio-provider.module.ts` - Composio apps
- `src/apps/rapidapi-provider.module.ts` - RapidAPI apps
- `src/apps/unipile-provider.module.ts` - Unipile apps
- `src/apps/unified/twitter.unified.ts` - Unified Twitter plugin
- `src/apps/plugins/[provider]/[app].plugin.ts` - Individual app plugins

## Adding New Apps

See [APPS_ARCHITECTURE.md](./APPS_ARCHITECTURE.md) for detailed instructions on:
- Adding new apps to existing providers
- Creating unified plugins for cross-provider apps
- Ensuring unique method names
- Maintaining type safety

## Migration from Old API

**Before:**
```typescript
// Old: Only Composio provider available
await client.apps.twitter.createANewDmConversation({...});
```

**After:**
```typescript
// New: Multiple providers, two access patterns
await client.apps.composio.twitter.createANewDmConversation({...}); // Provider-based
await client.apps.twitter.createANewDmConversation({...}); // App-based (unified)
```

Both patterns work! Choose the one that fits your use case.
