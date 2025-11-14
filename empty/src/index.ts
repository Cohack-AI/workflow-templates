import z from 'zod'
import Workflow from './workflow';
import { client } from './client';
import { BaseWorkflowCategoryConfig, createCohackClient, WorkflowOptions } from '@cohack/client';
import { WorkflowTriggerType } from '@cohack/types';

const input = z.object({});
const output = z.object({});
export type WfInput = z.input<typeof input>;
export type WfOutput = z.input<typeof output>;


const wfConfig: BaseWorkflowCategoryConfig = {
    category: WorkflowTriggerType.OnDemand,
    inputSchema: input,
    outputSchema: output,
};

export const options: WorkflowOptions = {
    retryPolicy: {
        maxAttempts: 5,
        initialInterval: { milliseconds: 500 },
        maxInterval: { seconds: 5 },
    },
};

export const wf = new Workflow(wfConfig, client);
export const handler = wf.getLambdaHandler(options);
