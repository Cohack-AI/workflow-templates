import { WfInput, WfOutput } from '.';
import { BaseWorkflowCategoryConfig, Step } from '@cohack/client';
import { BaseWorkflow } from '@cohack/client';
import { TriggerData, TriggerSlug } from '@cohack/types';

const EMAIL_REPLY_SYSTEM_PROMPT = `You are a professional email assistant. Your task is to write thoughtful, well-structured email replies.

Guidelines:
- Write clear, concise, and professional responses
- Match the tone and formality of the original email
- Address all points raised in the original message
- Be helpful and courteous
- Keep responses focused and to the point
- Do not include email headers (To, From, Subject) - just write the body content
- Do not include a greeting line with the recipient's name if you don't know it
- Sign off appropriately based on the context

Output only the email body text, nothing else.`;

class Workflow extends BaseWorkflow {
    constructor(wfConfig: BaseWorkflowCategoryConfig) {
        super(wfConfig);
    }

    async run(input: WfInput): Promise<WfOutput> {
        const triggerData = input.data as TriggerData<TriggerSlug.GmailNewGmailMessage>;
        this.client.ctx.console.log('=== Workflow Started ===');

        // Skip non-primary inbox emails (social, promotions, updates, forums)
        const nonPrimaryCategories = ['CATEGORY_SOCIAL', 'CATEGORY_PROMOTIONS', 'CATEGORY_UPDATES', 'CATEGORY_FORUMS'];

        const emailLabels = (triggerData.label_ids as string[]) || [];
        const isNonPrimary = emailLabels.some(label => nonPrimaryCategories.includes(label));

        if (isNonPrimary) {
            this.client.ctx.console.log('=== Skipping non-primary inbox email ===');
            return {
                schemaRef: 'json',
                content: {
                    success: true,
                    results: JSON.stringify({
                        draft_created: false,
                        skipped: true,
                        reason: 'Email not in primary inbox',
                    }),
                },
            };
        }

        const emailData = await this.parseData(triggerData);

        const wrappedModel = this.client.agents.getWrappedModel('openai', 'gpt-4o');
        const response = await this.client.agents.generateText({
            model: wrappedModel,
            system: EMAIL_REPLY_SYSTEM_PROMPT,
            messages: [
                {
                    role: 'user',
                    content: `Please write a reply to the following email:

From: ${emailData.sender || 'Unknown sender'}
Subject: ${emailData.subject || 'No subject'}

Email content:
${emailData.message_text || 'No content'}

Write a professional reply to this email.`,
                },
            ],
        });

        await this.createDraft(emailData, response.text);
        this.client.ctx.console.log('=== Draft created successfully ===');

        return {
            schemaRef: 'json',
            content: {
                success: true,
                results: JSON.stringify({
                    draft_created: true,
                    reply_to: emailData.sender,
                }),
            },
        };
    }

    @Step('parse-data')
    async parseData(triggerData: TriggerData<TriggerSlug.GmailNewGmailMessage>): Promise<{
        sender: string | null | undefined;
        subject: string | null | undefined;
        message_text: string | null | undefined;
        thread_id: string | null | undefined;
        message_id: string | null | undefined;
    }> {
        return {
            sender: triggerData.sender,
            subject: triggerData.subject,
            message_text: triggerData.message_text,
            thread_id: triggerData.thread_id,
            message_id: triggerData.message_id,
        };
    }

    @Step('create-draft')
    async createDraft(
        emailData: {
            sender: string | null | undefined;
            subject: string | null | undefined;
            message_text: string | null | undefined;
            thread_id: string | null | undefined;
            message_id: string | null | undefined;
        },
        text: string
    ) {
        const replyBody = text;
        const replySubject = emailData.subject?.startsWith('Re:') ? emailData.subject : `Re: ${emailData.subject || 'No subject'}`;
        const res = await this.client.apps.gmail.createEmailDraft({
            recipient_email: emailData.sender || undefined,
            subject: replySubject,
            body: replyBody,
            thread_id: emailData.thread_id || undefined,
        });
        return res;
    }
}

export default Workflow;
