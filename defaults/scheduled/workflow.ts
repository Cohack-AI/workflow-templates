import { WfOutput } from '.';
import { BaseWorkflowCategoryConfig, Step } from '@cohack/client';
import { BaseWorkflow } from '@cohack/client';

class Workflow extends BaseWorkflow<unknown, WfOutput> {
    constructor(wfConfig: BaseWorkflowCategoryConfig) {
        super(wfConfig);
    }

    async run(): Promise<WfOutput> {
        const ctx = this.client.ctx;
        await ctx.sleep({
            seconds: 10,
        });
        return {
            schemaRef: 'json',
            content: {
                success: true,
            },
        };
    }
}

export default Workflow;
