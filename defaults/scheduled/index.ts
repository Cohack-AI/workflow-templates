import z from 'zod';
import Workflow from './workflow';
import { BaseWorkflowCategoryConfig, WorkflowOptions } from '@cohack/client';
import { WorkflowTriggerType } from '@cohack/types';

export type WfResultData = {
    success: boolean;
};

export type WfOutput = {
    schemaRef: 'json';
    content: WfResultData;
};

const wfConfig: BaseWorkflowCategoryConfig = {
    category: WorkflowTriggerType.CronJob,
    outputSchema: z.object({
        schemaRef: z.literal('json'),
        content: z.object({
            success: z.string(),
        }),
    }),
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
