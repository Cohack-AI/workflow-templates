import z from 'zod';
import Workflow from './workflow';
import { BaseWorkflowCategoryConfig, createOutputSchema, WorkflowOptions } from '@cohack/client';
import { TriggerSlug, WorkflowTriggerType } from '@cohack/types';

const input = z.object({
    log_id: z.string(),
    data: z.object(),
});

const output = z.object({
    success: z.boolean().describe(''),
    results: z.string().describe(''),
});

export type WfInput = z.input<typeof input>;
export type WfOutput = {
    schemaRef: 'json';
    content: z.infer<typeof output>;
};
const wfConfig: BaseWorkflowCategoryConfig = {
    category: WorkflowTriggerType.AppTrigger,
    triggerSlug: TriggerSlug.GmailNewGmailMessage,
    outputSchema: createOutputSchema('json', output),
};

export const options: WorkflowOptions = {
    retryPolicy: {
        maxAttempts: 5,
        initialInterval: { milliseconds: 500 },
        maxInterval: { seconds: 5 },
    },
};

export const wf = new Workflow(wfConfig);
export const handler = wf.getLambdaHandler(options);
