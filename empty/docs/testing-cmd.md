Here’s a self-contained technical architecture doc you can drop into Cursor and build against.

---

# Cohack Local Workflow Testing – Technical Architecture

## 1. Goals & Constraints

### 1.1 Goals

-   Allow users to **run and debug workflows locally** before deploying.
-   Support **handler-based testing**:

    -   Default handler: `run`
    -   Other handlers: e.g. `approveStep`, `resolveApproval`, `previewEmail`, etc.

-   Let users define test inputs and expectations in a **`tests/` folder**, not in `.cohack`.
-   Use `.cohack/` **only for internal sate** (project metadata, logs, test run records, snapshots).
-   Reuse existing architectural primitives:

    -   `BaseCommand` (for CLI commands)
    -   `CohackProjectStore` (for project-local `.cohack` state)
    -   existing **global store** (for global `.cohack` with creds, etc.)

### 1.2 Constraints / Implementation Notes

-   Implementation must:

    -   Stay aligned with the **existing command style** (e.g. `InitCommand`).
    -   Reuse helpers from `core/process.helpers`, `base-command`, logger, etc.
    -   Prefer **discovering existing utilities** (e.g. functions to locate project root, resolve config, build workflow definition) rather than reinventing them.
    -   Keep the testing layer flexible: APIs (`testingUtils`, CLI) should be thin wrappers that can evolve as workflow engine changes.

---

## 2. High-level Architecture

### 2.1 Key Components

1. **CLI Commands**

    - `TestCommand` (new)

        - Sub-command: `cohack test [handler]`
        - Sub-command: `cohack test server`
        - Sub-command: `cohack test logs [...]`

2. **Testing Runtime Utils** (exported from `@cohack/client`)

    - `testingUtils.runTestingServer()`
    - `testingUtils.closeTestingServer()`
    - `testingUtils.getIngress()`
    - `testingUtils.runWorkflow()`
    - (optional) `testingUtils.runScenario()`

3. **Project Store Extensions** (within `CohackProjectStore`)

    - Directories under `.cohack/`:

        - `.cohack/test-runs/`
        - `.cohack/logs/`
        - `.cohack/snapshots/` (optional, for snapshot testing)

4. **User Test Files**

    - All user-facing test definitions live in **`tests/`**:

        - JSON scenarios: `tests/*.scenario.json`
        - Optional TS helpers: `tests/*.test.ts`

---

## 3. CLI UX Specification

### 3.1 Main Test Command

#### Command Shape

```bash
cohack test [handler] [options]
```

-   `handler` (optional):

    -   If omitted → default to `"run"`.
    -   If provided → call that handler on the workflow definition.

-   Examples:

    ```bash
    cohack test                 # calls handler "run"
    cohack test run             # explicit
    cohack test approveStep     # call handler "approveStep"
    cohack test resolveApproval # call handler "resolveApproval"
    ```

#### Options

-   `--data <json>`
    Inline JSON input for the handler.
-   `--scenario <path>`
    Path to a scenario file in `tests/` (JSON or TS).
-   `--key <string>`
    Invocation key / workflow key. Optional; if missing, generate a UUID.
-   `--format <pretty|json>`
    Output formatting for CLI.
-   `--log`
    Print verbose logs inline.

**Rules:**

-   At least **one** of `--data` or `--scenario` must be provided.
-   If both provided, `--scenario` should take precedence (but keep code flexible).

#### Typical Usage Examples

```bash
# 1. Default handler with inline data
cohack test --data '{"tweet":"hello world"}'

# 2. Explicit handler with inline data + custom key
cohack test run \
  --data '{"tweet":"hello world"}' \
  --key "test-123"

# 3. Using a scenario file (simple)
cohack test run \
  --scenario ./tests/myWorkflow.scenario.json

# 4. Using a scenario for a non-run handler
cohack test approveStep \
  --scenario ./tests/approveStep.happy.json
```

---

### 3.2 Test Server Command

#### Command Shape

```bash
cohack test server [options]
```

-   Purpose: Start a **persistent testing server** for workflows (local only).
-   Options:

    -   `--port <number>` (optional; default like `4000`)
    -   `--debug` (optional; verbose internal logging)
    -   `--watch` (optional; auto-restart on file changes – can be TODO / later)

Typical usage:

```bash
cohack test server
cohack test server --debug
```

### 3.3 Test Logs Command

#### Command Shape

```bash
# List recent test runs
cohack test logs [options]

# Show a given run
cohack test logs show <runId> [options]
```

-   Options for `logs`:

    -   `--limit <n>` (default: e.g. 20)
    -   `--json` (print JSON only)

-   Options for `logs show`:

    -   `--json` (raw JSON of the run record)

---

## 4. Data & File Layouts

### 4.1 Project-level Layout

**User-editable:**

```text
src/
  index.ts           # workflow entry point (wf)
tests/
  myWorkflow.scenario.json
  myWorkflow.edge.scenario.json
  approveStep.happy.json
  custom.test.ts     # optional – if you want to allow TS-level tests later
cohack.config.json
```

**Cohack-managed (via `CohackProjectStore`):**

```text
.cohack/
  project.json
  builds/
  deployments/
  test-runs/
    test_2025-11-14T10-23-11Z.json
    test_2025-11-14T10-25-02Z.json
  logs/
    testing-server.log
  snapshots/          # OPTIONAL (for snapshot testing)
    run/
      some-hash.json
```

### 4.2 Scenario File Schema

Stored under `tests/`, e.g. `tests/myWorkflow.scenario.json`.

Example:

```json
{
    "name": "happy path: tweet creation",
    "key": "test-123",
    "input": {
        "tweet": "hello world"
    },
    "expected": {
        "output": {
            "status": "scheduled"
        }
    }
}
```

For a non-run handler (like `approveStep`):

```json
{
    "name": "approve email",
    "key": "invocation-123",
    "input": {
        "approvalId": "appr_1",
        "approved": true
    },
    "expected": {
        "output": {
            "result": "ok"
        }
    }
}
```

TypeScript definition in `@cohack/client`:

```ts
export interface WorkflowScenario<TInput = unknown, TOutput = unknown> {
    name: string;
    key?: string;
    input: TInput;
    expected?: {
        output?: TOutput;
        errorMessage?: string;
    };
}
```

Support JSON first; consider TS scenario exports later.

### 4.3 Test Run Record Schema

Each run should produce a record in `.cohack/test-runs/`.

Proposed type:

```ts
export interface TestRunRecord {
    id: string; // e.g. "test_2025-11-14T10-23-11Z"
    handler: string; // "run" | "approveStep" | etc
    key: string; // invocation key used
    input: unknown; // parsed input
    output?: unknown; // workflow result (if success)
    error?: {
        message: string;
        stack?: string;
    };
    scenarioPath?: string; // if triggered via --scenario
    createdAt: string; // ISO timestamp
    durationMs?: number;
}
```

Record should be written via `CohackProjectStore` extensions (see next section).

---

## 5. Project Store Extensions (`CohackProjectStore`)

`CohackProjectStore` already handles:

-   locating project root (`locate()` / `getProjectPath()`)
-   managing `.cohack` directory
-   project metadata (`project.json`)
-   deployments.

Extend it to cover testing-related paths.

### 5.1 New Fields

Add derived paths (no breaking change):

```ts
// inside constructor
this.testsDir = path.join(this.rootDir, 'tests');
this.testRunsDir = path.join(this.cohackDir, 'test-runs');
this.logsDir = path.join(this.cohackDir, 'logs');
this.snapshotsDir = path.join(this.cohackDir, 'snapshots');
```

(Names can be adjusted to match your conventions.)

### 5.2 New Methods

#### Ensure testing structure

```ts
async ensureTestingStructure(): Promise<void> {
    await fs.mkdir(this.cohackDir, { recursive: true });
    await fs.mkdir(this.testRunsDir, { recursive: true });
    await fs.mkdir(this.logsDir, { recursive: true });
    // .snapshots optional
}
```

#### Write Test Run Record

```ts
async writeTestRun(record: TestRunRecord): Promise<string> {
    await this.ensureTestingStructure();
    const filename = `${record.id}.json`;
    const filePath = path.join(this.testRunsDir, filename);
    await fs.writeFile(filePath, JSON.stringify(record, null, 2), 'utf-8');
    return filePath;
}
```

#### List Test Runs

```ts
async listTestRuns(limit = 20): Promise<TestRunRecord[]> {
    await this.ensureTestingStructure();
    const entries = await fs.readdir(this.testRunsDir);
    const files = entries
        .filter(name => name.endsWith('.json'))
        .sort()         // lexicographical sorting; we can improve later
        .reverse()
        .slice(0, limit);

    const results: TestRunRecord[] = [];
    for (const file of files) {
        const content = await fs.readFile(path.join(this.testRunsDir, file), 'utf-8');
        results.push(JSON.parse(content) as TestRunRecord);
    }
    return results;
}
```

#### Read Single Test Run

```ts
async readTestRun(id: string): Promise<TestRunRecord> {
    const filename = id.endsWith('.json') ? id : `${id}.json`;
    const filePath = path.join(this.testRunsDir, filename);
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as TestRunRecord;
}
```

> Note: Implementation should follow existing patterns in `CohackProjectStore` (error handling, JSON formatting, etc.).

---

## 6. Testing Utilities API (`@cohack/client`)

Expose runtime utilities used by the CLI and user scripts.

### 6.1 Types

```ts
export interface RunWorkflowOptions<TInput = unknown> {
    handler: string; // "run" | "approveStep" | ...
    key: string;
    input: TInput;
}

export interface RunWorkflowResult<TOutput = unknown> {
    output?: TOutput;
    error?: Error;
}

export interface TestingServerOptions {
    port?: number;
    debug?: boolean;
    // keep flexible; align with underlying workflow engine (Restate, etc.)
}
```

### 6.2 Proposed API Surface

```ts
export const testingUtils = {
    runTestingServer: async (definition: unknown, options?: TestingServerOptions) => {
        /* ... */
    },

    closeTestingServer: async () => {
        /* ... */
    },

    getIngress: <TIngress = any>(): TIngress => {
        // returns workflow ingress bound to local testing server
    },

    runWorkflow: async <TInput = unknown, TOutput = unknown>(
        definition: unknown,
        options: RunWorkflowOptions<TInput>
    ): Promise<RunWorkflowResult<TOutput>> => {
        // Option A: uses ingress internally
        // Option B: direct in-process invocation
    },
};
```

Implementation should:

-   Mirror existing patterns for running workflows (check how deploy/invoke code currently calls workflows).
-   Wrap the underlying experiment (e.g. Restate workflow invocation) so CLI doesn’t depend directly on Restate.

---

## 7. CLI Command Implementation Details

All commands should follow patterns from `InitCommand`:

-   Extend `BaseCommand`
-   Register with `program.command(...)` in constructor
-   Use shared logger (`this.logger`)
-   Use `CohackProjectStore.locate()` to find project root

### 7.1 `TestCommand` – main handler

Skeleton:

```ts
import type { Command } from 'commander';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { BaseCommand } from '../base-command';
import { CohackProjectStore } from '../core/cohack-store';
import { testingUtils, WorkflowScenario } from '@cohack/client';
import { wf } from '../../src'; // or resolve path like other commands do

type TestOptions = {
    data?: string;
    scenario?: string;
    key?: string;
    format?: 'pretty' | 'json';
    log?: boolean;
};

export class TestCommand extends BaseCommand {
    constructor(program: Command) {
        super();

        program
            .command('test')
            .argument('[handler]', 'Handler name to invoke (default: run)', 'run')
            .option('--data <json>', 'JSON input payload')
            .option('--scenario <path>', 'Path to scenario file under tests/')
            .option('--key <key>', 'Invocation key')
            .option('--format <format>', 'Output format (pretty|json)', 'pretty')
            .option('--log', 'Print verbose logs', false)
            .action(async (handler: string, options: TestOptions) => {
                await this.runTest(handler, options);
            });
    }

    private async runTest(handler: string, options: TestOptions): Promise<void> {
        try {
            await this.init(); // same as other commands (setup cred, logger, etc.)

            const projectStore = await CohackProjectStore.locate();
            await projectStore.ensureBaseStructure();
            await projectStore.ensureTestingStructure?.(); // add this method

            const definition = wf.getWorkflowDefinition(); // keep consistent with template

            await testingUtils.runTestingServer(definition);

            const start = Date.now();
            const input = await this.resolveInput(projectStore, options);
            const key = options.key ?? crypto.randomUUID();

            const result = await testingUtils.runWorkflow(definition, {
                handler,
                key,
                input,
            });

            const durationMs = Date.now() - start;

            const record: TestRunRecord = {
                id: `test_${new Date().toISOString().replace(/[:.]/g, '-')}`,
                handler,
                key,
                input,
                output: result.output,
                error: result.error ? { message: result.error.message, stack: result.error.stack } : undefined,
                scenarioPath: options.scenario ? path.relative(projectStore.rootDir, options.scenario) : undefined,
                createdAt: new Date().toISOString(),
                durationMs,
            };

            await projectStore.writeTestRun(record);

            this.printResult(record, options);
        } catch (error) {
            this.logger.error((error as Error).message);
        } finally {
            await testingUtils.closeTestingServer().catch(() => {});
        }
    }

    private async resolveInput(projectStore: CohackProjectStore, options: TestOptions): Promise<unknown> {
        if (options.scenario) {
            const scenarioPath = path.isAbsolute(options.scenario) ? options.scenario : path.join(projectStore.rootDir, options.scenario);
            const raw = await fs.readFile(scenarioPath, 'utf-8');
            const scenario = JSON.parse(raw) as WorkflowScenario;
            return scenario.input;
        }

        if (options.data) {
            return JSON.parse(options.data);
        }

        throw new Error('Either --data or --scenario must be provided.');
    }

    private printResult(record: TestRunRecord, options: TestOptions) {
        if (options.format === 'json') {
            console.log(JSON.stringify(record, null, 2));
            return;
        }

        if (record.error) {
            this.logger.error(`Handler "${record.handler}" failed: ${record.error.message}`);
        } else {
            this.logger.success(`Handler "${record.handler}" succeeded in ${record.durationMs}ms`);
        }

        if (options.log) {
            this.logger.log('Input:');
            this.logger.log(JSON.stringify(record.input, null, 2));
            this.logger.log('Output:');
            this.logger.log(JSON.stringify(record.output, null, 2));
        }
    }
}
```

> Cursor should adapt the above to match the existing folder structure and import paths (e.g. where `wf` lives, how `BaseCommand`/`logger` are set up).

### 7.2 `TestServerCommand` & `TestLogsCommand`

-   `TestServerCommand`:

    -   Similar `constructor(program: Command)` pattern.
    -   Use `CohackProjectStore.locate()` and `wf.getWorkflowDefinition()`
    -   Call `testingUtils.runTestingServer(definition, { port, debug })`
    -   Keep process running until SIGINT; on SIGINT call `testingUtils.closeTestingServer()`.

-   `TestLogsCommand`:

    -   Use `CohackProjectStore.locate()`
    -   Call `projectStore.listTestRuns(limit)`
    -   Print in a table (using `this.logger`) or JSON based on `--json`.
