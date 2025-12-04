import { createCohackClient } from '@/client/client';

/**
 * Example demonstrating the unified Apps API with Generic UnifiedAppPlugin
 *
 * The ApplicationsModule provides two ways to access apps:
 * 1. Provider-based: apps.[provider].[appName].[action]
 * 2. App-based: apps.[appName].[action] (powered by generic UnifiedAppPlugin)
 *
 * The app-based access uses a single generic class that automatically combines
 * all methods from all providers - no need to create individual unified classes!
 */

async function exampleUsage() {
    const client = createCohackClient('your-api-key');

    // ============================================
    // PROVIDER-BASED ACCESS
    // ============================================

    // Access Twitter via Composio provider
    await client.apps.composio.twitter.createANewDmConversation({
        participant_ids: ['123', '456'],
        message: {
            text: 'Hello from Composio!',
        },
    });

    // Access Twitter via Unipile provider
    await client.apps.unipile.twitter.sendDm();

    // Access Twitter via RapidAPI provider
    await client.apps.rapidapi.twitter.readProfile();

    // Access other Composio apps
    await client.apps.composio.gmail.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        body: 'Hello!',
    });

    await client.apps.composio.slack.sendMessage({
        channel: '#general',
        text: 'Hello from Slack!',
    });

    // ============================================
    // APP-BASED UNIFIED ACCESS
    // ============================================

    // All Twitter actions from all providers are available
    // under a single unified interface
    const twitter = client.apps.twitter;

    // From Composio
    await twitter.createANewDmConversation({
        participant_ids: ['123', '456'],
        message: {
            text: 'Hello!',
        },
    });

    await twitter.addAListMember({
        listId: '123',
        userId: '456',
    });

    await twitter.followUser({
        userId: '789',
    });

    // From Unipile (unique method name, no overlap)
    await twitter.sendDm();

    // From RapidAPI (unique method name, no overlap)
    await twitter.readProfile();

    // ============================================
    // TYPE SAFETY
    // ============================================

    // All methods are fully typed with their input/output types
    const result = await client.apps.composio.twitter.createANewDmConversation({
        participant_ids: ['123'],
        message: { text: 'Hi' },
    });
    // result is typed as TwitterCreateANewDmConversationOutput

    // Using unified access
    const result2 = await client.apps.twitter.createANewDmConversation({
        participant_ids: ['123'],
        message: { text: 'Hi' },
    });
    // result2 is also typed as TwitterCreateANewDmConversationOutput
}

/**
 * Example: Choosing the right access pattern
 */
async function choosingAccessPattern() {
    const client = createCohackClient('your-api-key');

    // Use provider-based when:
    // 1. You want to be explicit about which provider you're using
    // 2. You're using provider-specific features
    // 3. You want to switch between providers easily

    // Use app-based when:
    // 1. You don't care which provider implements the action
    // 2. You want a simpler API surface
    // 3. You want to avoid repeating the provider name
    // 4. You're using actions unique to a single provider anyway

    // Provider-based (explicit)
    await client.apps.composio.twitter.createANewDmConversation({
        participant_ids: ['123'],
        message: { text: 'Hi' },
    });

    // App-based (simpler, same result)
    await client.apps.twitter.createANewDmConversation({
        participant_ids: ['123'],
        message: { text: 'Hi' },
    });
}

/**
 * Example: How to ensure unique method names across providers
 */
async function uniqueMethodNames() {
    const client = createCohackClient('your-api-key');

    /**
     * When implementing actions in different providers,
     * ensure method names are unique to avoid overlaps:
     *
     * ✅ GOOD (unique names):
     * - composio.twitter.createANewDmConversation()
     * - unipile.twitter.sendDm()
     * - rapidapi.twitter.readProfile()
     *
     * ❌ BAD (overlapping names):
     * - composio.twitter.sendMessage()
     * - unipile.twitter.sendMessage()  // CONFLICT!
     *
     * If there's a conflict, use provider prefixes:
     * - composioSendMessage()
     * - unipileSendMessage()
     *
     * Or use more descriptive names:
     * - sendMessageViaComposio()
     * - sendMessageViaUnipile()
     */
}

/**
 * Example: Using the generic unified plugin's debug utilities
 */
async function debugUnifiedPlugin() {
    const client = createCohackClient('your-api-key');
    const twitter = client.apps.twitter;

    // Find which provider implements a specific method
    const provider = twitter.getMethodProvider('sendDm');
    console.log(`sendDm is implemented by: ${provider}`); // "unipile"

    // Get all available methods
    const allMethods = twitter.getAvailableMethods();
    console.log('All Twitter methods:', allMethods);

    // Get methods grouped by provider
    const providerMethods = twitter.getProviderMethods();
    console.log('Methods by provider:', providerMethods);
    // {
    //   composio: ["createANewDmConversation", "followUser", ...],
    //   unipile: ["sendDm"],
    //   rapidapi: ["readProfile"]
    // }
}

/**
 * Example: How the generic plugin eliminates boilerplate
 */
async function genericPluginAdvantages() {
    const client = createCohackClient('your-api-key');

    /**
     * BEFORE (manual unified classes):
     * - Need to create UnifiedTwitterPlugin class
     * - Manually write 20+ proxy methods
     * - Repeat for each app (UnifiedGmailPlugin, UnifiedSlackPlugin, etc.)
     *
     * AFTER (generic unified plugin):
     * - Single createUnifiedApp() call
     * - Automatic method discovery
     * - Works for ANY app
     * - Full type safety maintained
     */

    // Adding a new unified app is now trivial:
    // Just one line in ApplicationsModule:
    // this.gmail = createUnifiedApp({
    //     composio: this.composio.gmail,
    //     rapidapi: this.rapidapi.gmail,
    // });

    // No need to create a separate GmailUnifiedPlugin class!
}
