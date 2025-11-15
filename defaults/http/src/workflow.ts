import { WfInput, WfOutput } from '.';
import { BaseWorkflowCategoryConfig } from '@cohack/client';
import { BaseWorkflow } from '@cohack/client';


class Workflow extends BaseWorkflow {
    constructor(wfConfig: BaseWorkflowCategoryConfig) {
        super(wfConfig);
    }

    async run(input: WfInput): Promise<WfOutput> {
        await this.client.ctx.sleep({seconds: 4})
        return {
            name: 'hello world'
        };
    }
}

export default Workflow;
