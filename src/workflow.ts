import z from 'zod';
import { BaseWorkflow, Step, createCohackClient, TerminalError } from '@cohack/client';

const input = z.object({
    name: z.string(),
});
const output = z.object({
    result: z.string(),
});

type Input = z.input<typeof input>;
type Output = z.input<typeof output>;

class SampleWorkflow extends BaseWorkflow<Input, Output> {
    constructor() {
        const client = createCohackClient();
        super('greeting', input, output, client);
    }

    async run(input: Input): Promise<Output> {
        const compensations: Array<() => Promise<void>> = [];
        try {
            this.client.wf.set('status', 'created');
            console.log('input', input);
            await this.client.wf.sleep({ minutes: 1 });
            compensations.push(async () => await this.client.wf.sleep({ minutes: 1 }));

            const clickedSecret = await this.client.wf.promise<string>('email-verified');
            console.log('clickedSecret', clickedSecret);

            await this.parseInput(input.name);
            await this.client.wf.sleep({ minutes: 1 });
            return {
                result: 'hey',
            };
        } catch (err) {
            if (err instanceof TerminalError) {
                for (const compensation of compensations.reverse()) {
                    await compensation();
                }
            }
            throw err;
        }
    }

    @Step('parseInput')
    async parseInput(name: string) {
        console.log(name);
        return name;
    }
}

export default SampleWorkflow;
