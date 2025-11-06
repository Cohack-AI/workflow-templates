import * as restate from '@restatedev/restate-sdk';
import { WorkflowOptions } from '@cohack/client';
import Workflow from './workflow';

const wf = new Workflow();

const options: WorkflowOptions = {
    retryPolicy: {},
};

export const handler = restate.serve({
    services: [wf.getWorkflowDefinition(options)],
});
