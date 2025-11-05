// Basic Cohack config to help the CLI locate your workflow entry point.
export default {
    workflows: [
        {
            slug: 'example-workflow',
            entry: './src/workflow.ts'
        }
    ]
};
