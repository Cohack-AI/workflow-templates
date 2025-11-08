import { WorkflowOptions } from '@cohack/client';
import Workflow from './workflow';

export const wf = new Workflow();
export const options: WorkflowOptions = {
    retryPolicy: {
        maxAttempts: 5,
        initialInterval: { milliseconds: 500 },
        maxInterval: { seconds: 5 },
    },
};

export const handler = wf.getLambdaHandler(options);
