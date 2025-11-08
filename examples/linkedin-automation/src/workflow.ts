import z from 'zod';
import * as cohack from '@cohack/client';

const input = z.object({
    name: z.string(),
});
const output = z.object({
    result: z.string(),
});

type Input = z.input<typeof input>;
type Output = z.input<typeof output>;

class SampleWorkflow extends cohack.BaseWorkflow<Input, Output> {
    constructor() {
        const client = cohack.createCohackClient();
        super('greeting', input, output, client);
    }

    async run(input: Input): Promise<Output> {
        //
        return {
            result: '',
        };
    }
}

export default SampleWorkflow;
