import z from 'zod';
import Workflow from './workflow';
import { BaseWorkflowCategoryConfig, WorkflowOptions, createOutputSchema, WorkflowOutput } from '@cohack/client';
import { WorkflowTriggerType } from '@cohack/types';

const input = z.object({
    topic: z.string().describe('The topic or keyword to search for trending tweets'),
    brandVoice: z.string().describe('The brand voice/tone to use when generating replies (e.g., professional, witty, casual)'),
    maxTweets: z.number().default(10).describe('Maximum number of tweets to fetch and reply to'),
});

// Define the shape of your workflow result data
export type WfResultData = {
    processedTweets: Array<{
        originalTweetId: string;
        originalTweetContent: string;
        originalAuthor: string;
        generatedCopies: string[];
        selectedReply: string;
        replyStatus: 'success' | 'failed' | 'pending';
    }>;
    summary: {
        totalTweetsFetched: number;
        totalRepliesSent: number;
        totalFailed: number;
    };
}

export type WfInput = z.input<typeof input>;
export type WfOutput = WorkflowOutput<'json'>;

const wfConfig: BaseWorkflowCategoryConfig = {
    category: WorkflowTriggerType.OnDemand,
    inputSchema: input,
    outputSchema: createOutputSchema('json', z.object({
        
    })),
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
