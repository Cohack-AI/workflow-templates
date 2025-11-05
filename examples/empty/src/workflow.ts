import type { Client } from '@cohack/client';

export async function registerWorkflow(client: Client): Promise<void> {
    console.log('Register your workflow with Cohack here.');
    console.log('You can use the client to deploy or interact with Cohack APIs.');
    console.log('Example:', typeof client === 'object');
}

export default registerWorkflow;
