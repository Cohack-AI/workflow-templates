# Cohack Secure Workflow Deployment System — Full Technical Design

## Overview

This document describes a complete secure-deployment architecture for Cohack workflows built on **Restate**. It consolidates all decisions, validations, and flows discussed—including how users initialize workflows via SDK, how the backend validates builds, how service names are protected, and how dynamic verification and Restate read-backs work.

---

## Goals

-   Prevent tampering of Restate service name or handler identifiers in user code.
-   Ensure the backend remains the **source of truth** for workflow identity, service name, and associated Lambda/Restate resources.
-   Provide multi-layer validation (static, dynamic, and Restate read-back).
-   Enable secure issuance, verification, and rotation of **binding tokens** that link workflows to their expected Restate configuration.

---

## Architecture Summary

### Lifecycle Flow

1. **Init** — SDK authenticates → backend issues workflow + signed binding token → SDK saves `.cohack/project.json` and generates `.cohack/generated/binding.ts`.
2. **Build** — SDK compiles code, embeds constants from `binding.ts`, creates `.cohack/manifest.json`, and zips artifact.
3. **Deploy** — SDK uploads zip + binding token. Backend verifies token and performs pre-deploy validation.
4. **Validation Flow:**

    - **Step 1:** Verify binding token (ownership, rotation, expiry).
    - **Step 2:** Validate manifest integrity vs. claims.
    - **Step 3:** Validate Restate service name (AST or dynamic import sandbox).
    - **Step 4:** Deploy to Lambda with a **quarantine alias (qa)**.
    - **Step 5:** Register with Restate Admin API.
    - **Step 6:** Read back declared service names from Restate; ensure match.
    - **Step 7:** Promote alias to production if valid, rollback otherwise.

---

## Core Data Schemas

### Binding Token (JWT)

```ts
interface BindingTokenClaims {
    typ: 'cohack-binding';
    jti: string; // unique ID for audit
    iat: number; // issued-at epoch seconds
    wid: string; // workflow ID
    workplaceId: string;
    env: 'dev' | 'staging' | 'prod';
    restate: {
        serviceName: string;
        entry: string; // e.g., 'index.js'
        handlerExport: string; // e.g., 'handler'
        maxServices?: number;
        minSdkVersion?: string;
    };
}
```

### Workflow (Mongoose)

```ts
const WorkflowSchema = new Schema(
    {
        _id: String,
        workplaceId: String,
        name: String,
        envs: [String],
        rotatedAt: Date,
    },
    { timestamps: true }
);
```

### Deployment (Mongoose)

```ts
const DeploymentSchema = new Schema(
    {
        workflowId: String,
        workplaceId: String,
        env: String,
        versionArn: String,
        alias: { type: String, enum: ['qa', 'prod'] },
        status: { type: String, enum: ['validating', 'verified', 'promoted', 'failed', 'rolled_back'] },
        resultMessage: String,
        createdBy: String,
    },
    { timestamps: true }
);
```

---

## Backend Binding Token Issuance

### Generation (RS256)

```ts
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

function issueBindingToken(input) {
    const now = Math.floor(Date.now() / 1000);
    const jti = crypto.randomUUID();

    const claims = {
        typ: 'cohack-binding',
        jti,
        iat: now,
        wid: input.wid,
        workplaceId: input.workplaceId,
        env: input.env,
        restate: {
            serviceName: input.serviceName,
            entry: 'index.js',
            handlerExport: 'handler',
            maxServices: 1,
        },
    };

    const token = jwt.sign(claims, process.env.BINDING_PRIVATE_KEY_PEM, {
        algorithm: 'RS256',
        keyid: 'binding-v1',
    });

    return { token, claims };
}
```

### Verification

```ts
async function verifyBindingToken(token) {
    const claims = jwt.verify(token, process.env.BINDING_PUBLIC_KEY_PEM, { algorithms: ['RS256'] });
    if (claims.typ !== 'cohack-binding') throw new Error('Invalid token');

    const wf = await WorkflowModel.findOne({ _id: claims.wid, workplaceId: claims.workplaceId }).lean();
    if (!wf) throw new Error('Workflow not found');
    if (wf.rotatedAt && claims.iat * 1000 < wf.rotatedAt.getTime()) {
        throw new Error('Token revoked');
    }
    return claims;
}
```

### Rotation

```ts
await WorkflowModel.findOneAndUpdate({ _id: workflowId, workplaceId }, { $set: { rotatedAt: new Date() } });
```

---

## File Structure (SDK)

```
.cohack/
  project.json        → workflowId, bindingToken
  generated/
    binding.ts        → constants for SERVICE_NAME, ENTRY, HANDLER_EXPORT
  manifest.json       → build metadata
```

### Example `binding.ts`

```ts
export const SERVICE_NAME = 'wf-abc123';
export const ENTRY = 'index.js';
export const HANDLER_EXPORT = 'handler';
```

---

## Validation Flow (Backend)

### 1. Token Verification

-   Validate JWT signature & claims.
-   Check workflow ownership.
-   Ensure not revoked via `rotatedAt`.

### 2. Manifest Verification

-   Extract `.cohack/manifest.json` from zip.
-   Compare entry/export/format to claims.

### 3. Service Name Verification

Two methods available:

#### Option A: **Static AST Scan**

Uses Babel to parse the compiled bundle, extract `restate.service({ name })`, verify literal name matches expected.

#### Option B: **Dynamic Import Sandbox**

1. Unzip artifact into temp dir.
2. Import in a sandbox process with stubbed Restate SDK.
3. Capture calls to `restate.service()` and `createEndpointHandler()`.
4. Ensure exactly one service name matches expected.
5. Enforce resource/time limits.

```ts
import { pathToFileURL } from 'url';
import vm from 'vm';

export async function verifyBundle(entry, expectedServiceName) {
    const ctx = vm.createContext({ console, Buffer, process: { env: {} } });
    const mod = new vm.SourceTextModule(await fs.readFile(entry, 'utf8'), { context: ctx });
    await mod.link(async specifier => {
        if (specifier === '@restatedev/restate-sdk/lambda')
            return new vm.SourceTextModule('export const restate = { service: (d) => globalThis.__services.push(d.name) };', {
                context: ctx,
            });
        throw new Error('Unauthorized import: ' + specifier);
    });
    await mod.evaluate();
    if (!globalThis.__services.includes(expectedServiceName)) throw new Error('Service name mismatch');
}
```

### 4. Quarantine Deployment

-   Publish Lambda version.
-   Attach alias `qa`.
-   No production routing yet.

### 5. Restate Registration + Read-back

-   Register QA alias endpoint in Restate.
-   Query Admin API to list available services.
-   Ensure returned service names exactly match token’s serviceName.
-   Optionally invoke `ping`/`health` method.

### 6. Promotion / Rollback

-   If match → promote alias to prod.
-   If mismatch → unregister endpoint + delete alias/version.

---

## Validation Checkpoints

| Stage             | Validation                     | Failure Handling          |
| ----------------- | ------------------------------ | ------------------------- |
| Token             | Signature, ownership, rotation | Reject request            |
| Manifest          | entry/export vs token          | Reject deployment         |
| AST/Dynamic       | Service name literal match     | Reject deployment         |
| Restate read-back | Names match token              | Rollback + delete version |

---

## Security Considerations

-   Tokens signed with RS256, not shared secrets.
-   Public key distributed to deploy verifier only.
-   Workflow-level rotation revokes older tokens.
-   Deployments quarantined until fully verified.
-   Dynamic import sandbox runs with network-disabled, CPU/time-limited environment.
-   REST API enforces workplace access.

---

## Operational Details

-   **Pre-deploy:** Fast AST scan to catch 90% of issues.
-   **Post-deploy:** Restate service read-back as source of truth.
-   **Fallback:** Dynamic import sandbox if AST inconclusive.
-   **Audit:** Every deploy logged with token `jti`, hash of artifact, and outcome.

### Example Log Schema

```ts
interface DeployLog {
    workflowId: string;
    workplaceId: string;
    env: 'dev' | 'staging' | 'prod';
    artifactSha256: string;
    jti: string;
    status: 'promoted' | 'failed';
    message?: string;
    createdAt: Date;
}
```

---

## Summary of Validations

1. **JWT Validation:** server-issued, RS256-signed.
2. **Manifest Check:** ensures entry/export integrity.
3. **Static or Dynamic Check:** validates Restate service literal name.
4. **Restate Read-back:** ensures runtime registration integrity.
5. **Rollback Logic:** auto-cleanup invalid deployments.

---

## Example Success Path

1. `init` → token issued with `serviceName: wf-abc123`.
2. User builds → bundle embeds `SERVICE_NAME = 'wf-abc123'`.
3. `deploy` → token verified → AST confirms name → Lambda QA alias created.
4. Restate registration → service name returned `wf-abc123`.
5. System promotes alias → logs success.

---

## Example Failure (Tampered Name)

1. User changes service name to `MaliciousService`.
2. Token says `wf-abc123`.
3. AST or dynamic check detects mismatch → rejects before deploy.
4. If bypassed → Restate read-back shows `MaliciousService` → rollback deletes alias.

---

## Future Extensions

-   Move key management to AWS KMS.
-   Add signed SDK manifest per release (to enforce min version).
-   Integrate dynamic sandbox with AWS Lambda test-invoke.
-   Implement artifact attestation (supply chain).

---

**Outcome:**
This end-to-end pipeline ensures **zero-trust verification** for workflow deployments in Cohack. Even if a user modifies local config or BaseWorkflow code, the backend, Restate verification, and sandbox gates guarantee that only legitimate, server-approved service definitions are promoted.
