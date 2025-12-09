import z from 'zod';
import Workflow from './workflow';
import { BaseWorkflowCategoryConfig, WorkflowOptions, createOutputSchema, WorkflowOutput } from '@cohack/client';
import { WorkflowTriggerType } from '@cohack/types';

const input = z.object({
    message: z.string().describe(''),
});

const output = z.object({
    success: z.boolean().describe(''),
    pong: z.string().describe(''),
});

export type WfInput = z.input<typeof input>;
export type WfOutput = {
    schemaRef: 'json';
    content: z.infer<typeof output>;
};

const wfConfig: BaseWorkflowCategoryConfig = {
    category: WorkflowTriggerType.OnDemand,
    inputSchema: input,
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
