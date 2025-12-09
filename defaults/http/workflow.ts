import { WfInput, WfOutput } from '.';
import { BaseWorkflowCategoryConfig, Step } from '@cohack/client';
import { BaseWorkflow } from '@cohack/client';

class Workflow extends BaseWorkflow<WfInput, WfOutput> {
    constructor(wfConfig: BaseWorkflowCategoryConfig) {
        super(wfConfig);
    }

    async run(input: WfInput): Promise<WfOutput> {
        const ctx = this.client.ctx;
        const parsed = await this.parseMessage(input);
        await ctx.sleep({
            seconds: 10,
        });
        return {
            schemaRef: 'json',
            content: {
                success: true,
                pong: parsed.message,
            },
        };
    }

    @Step('parseMessage')
    async parseMessage(input: WfInput) {
        return {
            message: input.message ?? '',
        };
    }
}

export default Workflow;
