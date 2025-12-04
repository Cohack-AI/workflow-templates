import { wf } from '@/index';
import { testingUtils } from '@cohack/client';

export const runTest = async () => {
    try {
        const defination = wf.getWorkflowDefinition();
        await testingUtils.runTestingServer(defination);

        const key = new Date().toISOString();
        const ingress = testingUtils.getIngress();
        const client = ingress.workflowClient<typeof defination>(defination, key);

        /**
         * Must edit this to pass on workflow input params
         */
        const results = await client.run({});
        return results;
    } catch (err) {
        console.log('Error', err);
    } finally {
        await testingUtils.closeTestingServer();
    }
};

runTest();
