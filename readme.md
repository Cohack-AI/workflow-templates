<div align="center">

# Cohack Workflow Templates

</div>

Templates that power the `cohack` CLI scaffolder. The CLI can bootstrap Cohack workflow projects in three ways:

1. **Empty:** bare-minimum starter meant for fully custom implementations.
2. **Defaults:** an opinionated starting point per workflow category (HTTP trigger, scheduled, event-driven, etc.).
3. **Examples:** curated, task-specific templates that demonstrate real automations.

Every folder under this repository is copied verbatim when the CLI provisions a new project, so keep each template self-contained and dependency-light.

---

## Repository layout

```
cohack-templates/
├── empty/           # Published "empty" starter (see below for usage)
├── defaults/        # Category presets (one subfolder per WorkflowTriggerType)
├── examples/        # Real-world automation templates
└── README.md
```

- `defaults/` and `examples/` are intentionally empty placeholders right now. Add one folder per template when they are ready (see “Adding templates”).
- Keep additional tooling (scripts, docs, assets) inside each template folder so the CLI can vendor it without extra logic.

## Working inside a template

Every template follows the same structure as the `empty/` starter:

```
template-name/
├── .cohack/project.json   # Populated by the CLI once the project is registered
├── .env.example           # Copy to .env.local and fill in Cohack credentials
├── src/
│   ├── client.ts          # Creates an authenticated Cohack client
│   ├── index.ts           # Workflow definition + handler export
│   └── workflow.ts        # Implementation of BaseWorkflow.run
├── test/index.ts          # Local/test harness using testingUtils
├── package.json           # Provides test/build/deploy scripts
└── tsconfig.json
```

### Local development flow

1. `npm install` – install dependencies for the selected template.
2. `cp .env.example .env.local` – provide `COHACK_API_KEY` and `COHACK_BASE_URL`. The runtime loads `.env.<NODE_ENV>` files (`client.ts` expects `.env.local` by default).
3. Implement the workflow contract:
   - Update `src/index.ts` input/output `zod` schemas.
   - Flesh out `run` in `src/workflow.ts`.
4. `npm run test` – executes `npx tsx test/index.ts`. Remember to feed the workflow input in `test/index.ts` before calling `client.run`.
5. `npm run build` / `npm run deploy` – pass-throughs to the `cohack` CLI once you are ready.

### Notes for template authors

- `@cohack/client` and `@cohack/types` are the only runtime dependencies today. Prefer dev-only helpers to avoid bloating scaffolded projects.
- `.cohack/project.json` ships empty so the CLI can inject project metadata after scaffold. If you need defaults, document them in the template README instead of pre-populating sensitive IDs.
- Keep `node_modules` and generated artifacts out of source; they will be installed after the template is copied (`*/node_modules` is already git-ignored).

## Adding templates

Use these conventions whenever you add new presets or examples:

1. **Folder placement**
   - `empty/` – only one template; update in place when the “blank” experience should change.
   - `defaults/<category-slug>/` – match the `WorkflowTriggerType` or CLI category key (`turn-based`, `scheduled`, etc.).
   - `examples/<template-name>/` – use a descriptive, kebab-cased slug (e.g., `examples/twitter-automation`).
2. **Metadata**
   - Update `package.json` (`name`, `description`, `version`) so scaffolds remain unique.
   - Ensure `cohack.config.json` declares the schema URL plus any template-specific config your CLI expects.
3. **Docs**
   - Include a short `README.md` inside each template when specialized setup is required.
   - Describe required environment variables beyond the standard Cohack credentials.
4. **Testing**
   - Keep `test/index.ts` executable out of the box (mock upstream systems, seed fake data, etc.).
   - When an example depends on 3rd-party APIs, mention sandbox requirements and guard secrets with `.env.example`.
5. **Versioning**
   - Bump template versions together with CLI releases so consumers can pin exact revisions (e.g., tag this repo or publish an npm package if needed).

## Future work checklist

- Populate `defaults/` with one folder per workflow category (HTTP triggers, scheduled jobs, event-driven triggers, etc.).
- Add real `examples/` templates (LinkedIn, Reddit, Twitter automation were previously tracked; bring them back with sanitized credentials and docs).
- Document how the Cohack CLI fetches these templates (git tag, npm package, zip download) so others can contribute safely.
- Automate template tests in CI to ensure every scaffold compiles before publishing updates.

Feel free to expand this README as new template families or publishing workflows are introduced.
