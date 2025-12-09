import z from 'zod';
import Workflow from './workflow';
import { BaseWorkflowCategoryConfig, createOutputSchema, WorkflowOptions, WorkflowOutput } from '@cohack/client';
import { TriggerSlug, TriggerData, WorkflowTriggerType } from '@cohack/types';

const output = z.object({
    success: z.boolean().describe(''),
    pong: z.string().describe(''),
});

export type WfInput = {
    log_id: string;
    data: TriggerData<TriggerSlug.GmailNewGmailMessage>;
};
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
