# Cohack SDK Documentation

Complete guide to building durable, reliable marketing workflows with the Cohack SDK.

## 📚 Documentation Structure

### Getting Started
Foundational concepts and setup guides.

1. **[Overview](./getting-started/01-overview.md)** - SDK introduction, quick start, and core concepts
2. **[Project Setup](./getting-started/02-project-setup.md)** - Creating and configuring workflow projects
3. **[Workflow Basics](./getting-started/03-workflow-basics.md)** - Writing your first workflow

### Core Concepts
Essential features every workflow uses.

4. **[Triggers](./core-concepts/04-triggers.md)** - OnDemand, CronJob, and AppTrigger workflows
5. **[Durable Utilities](./core-concepts/05-durable-utilities.md)** - Sleep, state, promises, and logging
6. **[App Integrations](./core-concepts/06-app-integrations.md)** - Using 25+ service integrations
7. **[AI Agents](./core-concepts/07-ai-agents.md)** - LLM integration and AI-powered workflows

### Advanced Patterns
Sophisticated workflow composition techniques.

8. **[Decorators](./advanced/08-decorators.md)** - @Step, @Query, @Signal, @Subtask
9. **[Human-in-the-Loop](./advanced/09-human-in-loop.md)** - Approval workflows and content review
10. **[Error Handling](./advanced/10-error-handling.md)** - Robust error patterns and compensation
11. **[Testing](./advanced/11-testing.md)** - Local testing and test automation

### Operations
Deployment, monitoring, and troubleshooting.

12. **[Deployment](./operations/12-deployment.md)** - Building and deploying to production
13. **[Debugging](./operations/13-debugging.md)** - Troubleshooting and monitoring
14. **[CLI Reference](./operations/14-cli-reference.md)** - Complete CLI command reference

### Reference
Deep dives and API references.

15. **[Restate Concepts](./reference/15-restate-concepts.md)** - Understanding durable execution
16. **[Type Reference](./reference/16-type-reference.md)** - TypeScript types and schemas

---

## 🚀 Quick Navigation

### I want to...

**Get started quickly**
→ Start with [Overview](./getting-started/01-overview.md) → [Project Setup](./getting-started/02-project-setup.md) → [Workflow Basics](./getting-started/03-workflow-basics.md)

**Understand triggers**
→ Read [Triggers](./core-concepts/04-triggers.md)

**Use app integrations (Gmail, Slack, etc.)**
→ Read [App Integrations](./core-concepts/06-app-integrations.md)

**Add AI to workflows**
→ Read [AI Agents](./core-concepts/07-ai-agents.md)

**Handle long delays and state**
→ Read [Durable Utilities](./core-concepts/05-durable-utilities.md)

**Build complex multi-step workflows**
→ Read [Decorators](./advanced/08-decorators.md)

**Add human approvals**
→ Read [Human-in-the-Loop](./advanced/09-human-in-loop.md)

**Make workflows robust**
→ Read [Error Handling](./advanced/10-error-handling.md)

**Test before deploying**
→ Read [Testing](./advanced/11-testing.md)

**Deploy to production**
→ Read [Deployment](./operations/12-deployment.md)

**Debug issues**
→ Read [Debugging](./operations/13-debugging.md)

**Find a CLI command**
→ Read [CLI Reference](./operations/14-cli-reference.md)

**Understand how it works**
→ Read [Restate Concepts](./reference/15-restate-concepts.md)

**Look up types**
→ Read [Type Reference](./reference/16-type-reference.md)

---

## 💡 Key Concepts

### Workflows
TypeScript classes that define business processes with automatic retry and crash recovery.

```typescript
class MyWorkflow extends BaseWorkflow<Input, Output> {
  async run(input: Input) {
    // Your workflow logic
    return { success: true };
  }
}
```

### Triggers
How workflows execute: **OnDemand** (HTTP), **CronJob** (scheduled), **AppTrigger** (event-driven).

### Durability
Workflows survive crashes and resume automatically. Use `this.client.ctx` for durable operations.

### Integrations
Type-safe access to 25+ services: Gmail, Slack, LinkedIn, Twitter, and more.

### AI Agents
Built-in support for Claude, GPT-4, and custom AI agents with durable execution.

---

## 🎯 Common Use Cases

### Email Campaigns
```typescript
async run(input: { emails: string[] }) {
  for (const email of input.emails) {
    await this.client.apps.gmail.sendEmail({ to: email, ... });
    await this.client.ctx.sleep({ minutes: 5 }); // Rate limiting
  }
}
```

### Social Media Scheduling
```typescript
async run() {
  const content = await this.generateContent();
  await this.client.apps.twitter.createTweet({ text: content });
  await this.client.apps.linkedin.createPost({ content });
}
```

### Human Approval
```typescript
async run(input: Input) {
  const content = await this.generateContent();
  await this.client.hitl.sendForHumanApproval(...);
  const approval = await this.client.ctx.promise('approval');
  if (approval.status === 'approved') {
    await this.publishContent(content);
  }
}
```

### Multi-Day Workflows
```typescript
async run(input: Input) {
  await this.sendWelcome(input.email);
  await this.client.ctx.sleep({ days: 1 });
  await this.sendTips(input.email);
  await this.client.ctx.sleep({ days: 3 });
  await this.sendFollowup(input.email);
}
```

---

## 📖 Documentation Conventions

### Code Examples
All code examples are:
- ✅ Fully typed with TypeScript
- ✅ Runnable (not pseudocode)
- ✅ Self-contained with imports
- ✅ Production-ready patterns

### Callouts

**Pattern:** Reusable code pattern
**Anti-pattern:** What to avoid
**Common Use Case:** Typical scenario
**Best Practice:** Recommended approach

---

## 🔗 External Resources

- **Cohack Website:** [cohack.ai](https://cohack.ai)
- **Restate Documentation:** [restate.dev/docs](https://restate.dev/docs)
- **Zod Documentation:** [zod.dev](https://zod.dev)
- **GitHub Issues:** [github.com/anthropics/claude-code/issues](https://github.com/anthropics/claude-code/issues)

---

## 🆘 Getting Help

1. **Search documentation** - Use browser search (Cmd/Ctrl + F)
2. **Check examples** - Each guide has complete examples
3. **Review error handling** - See [Error Handling](./advanced/10-error-handling.md)
4. **Debug locally** - See [Testing](./advanced/11-testing.md) and [Debugging](./operations/13-debugging.md)
5. **Report issues** - File an issue on GitHub

---

## 📝 Documentation Status

| Section | Status |
|---------|--------|
| Getting Started | ✅ Complete |
| Core Concepts | 🚧 In Progress |
| Advanced | 📝 Planned |
| Operations | 📝 Planned |
| Reference | 📝 Planned |

---

## 🤝 Contributing

Found an error? Have a suggestion? Please file an issue with:
- Documentation page name
- Section with the issue
- Suggested improvement

---

## 📄 License

Documentation is part of the Cohack SDK. See main repository for license information.

---

**Ready to build?** Start with the **[Overview](./getting-started/01-overview.md)** →
