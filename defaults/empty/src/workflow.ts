import { BaseWorkflowCategoryConfig,  BaseWorkflow, CohackClient, } from '@cohack/client';
import { WfInput, WfOutput } from '.';


class Workflow extends BaseWorkflow {
    constructor(wfConfig: BaseWorkflowCategoryConfig , client: CohackClient, ) {
        super(wfConfig, client);
    }

    async run(input: WfInput): Promise<WfOutput> {
        /**
         * Write Workflow here using input and 
         */
        return {};
    }
}

export default Workflow;
