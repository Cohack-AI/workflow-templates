import { BaseWorkflowCategoryConfig,  BaseWorkflow, CohackClient, } from '@cohack/client';
import { WfInput, WfOutput } from '.';


class Workflow extends BaseWorkflow {
    constructor(wfConfig: BaseWorkflowCategoryConfig) {
        super(wfConfig);
    }

    async run(input: WfInput): Promise<WfOutput> {
        return {
            name: 'hello world'
        };
    }
}

export default Workflow;
