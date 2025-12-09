import { WfInput, WfOutput } from '.';
import { BaseWorkflowCategoryConfig } from '@cohack/client';
import { BaseWorkflow } from '@cohack/client';
import { TriggerData, TriggerSlug } from '@cohack/types';

class Workflow extends BaseWorkflow<WfInput, WfOutput> {
    constructor(wfConfig: BaseWorkflowCategoryConfig) {
        super(wfConfig);
    }

    async run(input: WfInput): Promise<WfOutput> {
        const triggerData = input.data as TriggerData<TriggerSlug.GmailNewGmailMessage>;
        return {
            schemaRef: 'json',
            content: {
                success: true,
                pong: triggerData.message_id,
            },
        };
    }
}

export default Workflow;
