# Generic Unified Plugin Guide

## Overview

The `UnifiedAppPlugin` is a **generic class** that automatically combines methods from multiple provider plugins into a single unified interface. This eliminates the need to create individual unified classes for each app!

## Key Features

✅ **Zero Boilerplate**: No need to write individual unified classes for each app
✅ **Automatic Method Discovery**: Dynamically finds all methods from all providers
✅ **Full Type Safety**: TypeScript knows about all available methods
✅ **Conflict Detection**: Warns when method names overlap across providers
✅ **Debug Helpers**: Built-in utilities to inspect which provider implements which method

## How It Works

### 1. The Generic Class

The `UnifiedAppPlugin` class uses TypeScript generics and runtime introspection to:
- Accept multiple provider plugins as input
- Discover all methods from each provider
- Create proxy methods that delegate to the appropriate provider
- Maintain full type safety through TypeScript's type system

### 2. Type-Safe Factory

The `createUnifiedApp` factory function ensures TypeScript correctly infers all available methods:

```typescript
const twitter = createUnifiedApp({
    composio: composioTwitterPlugin,
    rapidapi: rapidapiTwitterPlugin,
    unipile: unipileTwitterPlugin
});

// TypeScript now knows about ALL methods from ALL providers!
twitter.createANewDmConversation({...}); // From composio
twitter.sendDm(); // From unipile
twitter.readProfile(); // From rapidapi
```

## Usage

### Basic Usage

```typescript
import { createUnifiedApp } from './unified/unified-app.plugin';

// In ApplicationsModule constructor
this.twitter = createUnifiedApp({
    composio: this.composio.twitter,
    rapidapi: this.rapidapi.twitter,
    unipile: this.unipile.twitter,
});
```

### Single Provider

You can also use it with just one provider:

```typescript
this.gmail = createUnifiedApp({
    composio: this.composio.gmail,
});
```

### Multiple Providers (Partial)

Or any combination:

```typescript
this.slack = createUnifiedApp({
    composio: this.composio.slack,
    unipile: this.unipile.slack,
});
```

## Method Conflict Handling

If two providers have methods with the same name, the generic plugin will:

1. **Warn in console** about the conflict
2. **Use the last provider's implementation** (based on object key order)

### Example Conflict

```typescript
// composio.twitter.sendMessage() exists
// unipile.twitter.sendMessage() also exists

const twitter = createUnifiedApp({
    composio: composioTwitterPlugin,
    unipile: unipileTwitterPlugin, // This one wins
});

// Console warning:
// "Method name conflict detected: 'sendMessage' exists in both
//  'composio' and 'unipile' providers. Using 'unipile' implementation."

twitter.sendMessage(); // Uses unipile's implementation
```

### Best Practice: Unique Names

To avoid conflicts, ensure method names are unique across providers:

```typescript
// ✅ GOOD - Unique names
composio.twitter.createANewDmConversation()
unipile.twitter.sendDm()
rapidapi.twitter.readProfile()

// ❌ BAD - Overlapping names
composio.twitter.sendMessage()
unipile.twitter.sendMessage() // CONFLICT!
```

## Debug Utilities

The unified plugin includes helper methods for debugging:

### Get Method Provider

Find out which provider implements a specific method:

```typescript
const provider = twitter.getMethodProvider('sendDm');
console.log(provider); // "unipile"
```

### Get All Available Methods

List all methods across all providers:

```typescript
const methods = twitter.getAvailableMethods();
console.log(methods);
// ["createANewDmConversation", "followUser", "sendDm", "readProfile", ...]
```

### Get Provider Methods

See which methods belong to which provider:

```typescript
const providerMethods = twitter.getProviderMethods();
console.log(providerMethods);
// {
//   composio: ["createANewDmConversation", "followUser", ...],
//   unipile: ["sendDm"],
//   rapidapi: ["readProfile"]
// }
```

## How Methods Are Discovered

The generic plugin automatically discovers methods by:

1. **Traversing the prototype chain** of each provider plugin
2. **Filtering out**:
   - Constructor
   - Private methods (starting with `_`)
   - Base class execution methods (`executeComposioAction`, etc.)
   - Inherited Object methods
3. **Creating proxy methods** that delegate to the original provider

## Type Safety Deep Dive

### How TypeScript Knows About Methods

The `createUnifiedApp` factory uses advanced TypeScript types to merge all method signatures:

```typescript
type MergedMethods<T> = UnionToIntersection<
    { [K in keyof T]: PickMethods<T[K]> }[keyof T]
>;
```

This creates an **intersection type** of all provider methods, so TypeScript knows about every available method!

### Return Type

The factory returns:

```typescript
UnifiedAppPlugin<T> & MergedMethods<T>
```

This combines:
- The `UnifiedAppPlugin` instance (for debug methods)
- All methods from all providers (for app actions)

## Performance Considerations

### Initialization

Methods are discovered and created **once** during construction:
- O(n) where n = total methods across all providers
- Cached in a `Map` for fast lookups

### Runtime

Each method call:
1. Looks up the provider in the cache (O(1))
2. Calls the provider's method (O(1))

**Total overhead**: Negligible!

## Adding a New App

With the generic plugin, adding a new unified app is trivial:

```typescript
// In ApplicationsModule

// 1. Add the type (optional, for better IntelliSense)
public gmail: ReturnType<typeof createUnifiedApp<{
    composio: ComposioProvider['gmail'];
    rapidapi: RapidAPIProvider['gmail'];
}>>;

// 2. Create the unified app (in constructor)
this.gmail = createUnifiedApp({
    composio: this.composio.gmail,
    rapidapi: this.rapidapi.gmail,
});
```

**That's it!** No need to create a separate `GmailUnifiedPlugin` class.

## Complete Example

```typescript
import { createUnifiedApp } from './unified/unified-app.plugin';
import { createCohackClient } from '@cohack/client';

const client = createCohackClient('api-key');

// All Twitter methods from all providers are available
const twitter = client.apps.twitter;

// From Composio
await twitter.createANewDmConversation({
    participant_ids: ['123', '456'],
    message: { text: 'Hello!' }
});

await twitter.followUser({ userId: '789' });

// From Unipile
await twitter.sendDm();

// From RapidAPI
await twitter.readProfile();

// Debug: Which provider has sendDm?
console.log(twitter.getMethodProvider('sendDm')); // "unipile"

// Debug: All available methods
console.log(twitter.getAvailableMethods());
```

## Advantages Over Manual Unified Classes

### Before (Manual)

```typescript
// Need to create a new class for each app
class UnifiedTwitterPlugin {
    constructor(composio, rapidapi, unipile) { ... }

    // Manually proxy each method (20+ methods!)
    async createANewDmConversation(...args) {
        return this.composio.createANewDmConversation(...args);
    }

    async followUser(...args) {
        return this.composio.followUser(...args);
    }

    // ... 18 more methods

    async sendDm(...args) {
        return this.unipile.sendDm(...args);
    }

    async readProfile(...args) {
        return this.rapidapi.readProfile(...args);
    }
}

// Repeat for Gmail, Slack, etc.
class UnifiedGmailPlugin { ... }
class UnifiedSlackPlugin { ... }
```

### After (Generic)

```typescript
// One generic class for ALL apps
const twitter = createUnifiedApp({
    composio: composioTwitterPlugin,
    rapidapi: rapidapiTwitterPlugin,
    unipile: unipileTwitterPlugin,
});

const gmail = createUnifiedApp({
    composio: composioGmailPlugin,
    rapidapi: rapidapiGmailPlugin,
});

const slack = createUnifiedApp({
    composio: composioSlackPlugin,
});
```

**Result**:
- 95% less boilerplate code
- Automatic method discovery
- Same type safety
- Easier to maintain

## Limitations

1. **Method name conflicts**: If two providers have the same method name, only one will be accessible. Use unique names or rename conflicting methods.

2. **Dynamic method discovery**: Methods are discovered at runtime, so if a provider plugin is modified after instantiation, changes won't be reflected.

3. **TypeScript inference**: For best IntelliSense, you may need to explicitly type the unified app property:
   ```typescript
   public twitter: ReturnType<typeof createUnifiedApp<{
       composio: ComposioProvider['twitter'];
       // ...
   }>>;
   ```

## Conclusion

The generic `UnifiedAppPlugin` provides a powerful, type-safe way to combine multiple provider plugins with minimal boilerplate. It's the perfect solution for a multi-provider architecture!
