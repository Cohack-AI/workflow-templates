import { WorkflowOptions } from '@cohack/client';
import Workflow from './workflow';

const wf = new Workflow();

const options: WorkflowOptions = {
    retryPolicy: {
        maxAttempts: 5,
        initialInterval: { milliseconds: 500 },
        maxInterval: { seconds: 5 },
    },
};

export const handler = wf.getLambdaHandler(options);
