import { WfInput, WfOutput, WfResultData } from '.';
import { BaseWorkflowCategoryConfig, Step, TerminalError, WorkflowOutput } from '@cohack/client';
import { BaseWorkflow, Signal } from '@cohack/client';
import { ApprovalKind, DecisionKind, ResolutionPayload } from '@cohack/types';

interface Tweet {
    id: string;
    content: string;
    author: string;
    engagement: number;
}

interface ReplyCopy {
    text: string;
    tone: string;
    confidence: number;
    targetTweetId: string;
}

interface SelectedReply {
    text: string;
    tone: string;
    confidence: number;
    reason: string;
}

interface PostReplyResult {
    tweetId: string;
    replyText: string;
    status: 'success' | 'failed' | 'pending';
    timestamp: string;
}

interface ProcessedTweet {
    originalTweetId: string;
    originalTweetContent: string;
    originalAuthor: string;
    generatedCopies: ReplyCopy[];
    selectedReply: SelectedReply;
    replyResult: PostReplyResult;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class Workflow extends BaseWorkflow<WfInput, WfOutput> {
    constructor(wfConfig: BaseWorkflowCategoryConfig) {
        super(wfConfig);
    }

    async run(input: WfInput): Promise<WfOutput> {
        this.client.ctx.console.log('=== Workflow Started ===');
        this.client.ctx.console.log('Input received:', JSON.stringify(input));

        // Step 1: Fetch top tweets
        this.client.ctx.console.log('Step 1: Fetching top tweets for topic:', input.topic);
        const tweets = await this.fetchTopTweets(input.topic, input.maxTweets);
        this.client.ctx.console.log('Fetched tweets count:', tweets.length);

        // Step 2: Process each tweet in a loop
        const processedTweets: ProcessedTweet[] = [];
        let successCount = 0;
        let failedCount = 0;

        await this.client.ctx.sleep(10000);

        for (const tweet of tweets) {
            this.client.ctx.console.log('Processing tweet:', tweet.id, 'by', tweet.author);

            // Step 3: Generate top 3 reply copies using LLM
            this.client.ctx.console.log('Step 3: Generating reply copies...');
            const copies = await this.generateReplyCopies(tweet, input.brandVoice);
            this.client.ctx.console.log('Generated', copies.length, 'reply copies');

            // Step 4: Select the best reply using LLM
            this.client.ctx.console.log('Step 4: Selecting best reply...');
            const selectedReply = await this.selectBestReply(copies, tweet);
            this.client.ctx.console.log('Selected reply with confidence:', selectedReply.confidence);

            // Step 5: Human approval for the first tweet only (for testing)
            if (processedTweets.length === 0) {
                this.client.ctx.console.log('Step 5: Requesting human approval for first tweet reply...');

                await this.client.hitl.sendForHumanApproval(this.client.ctx.key, 'reply-approval', 'reply', {
                    title: 'Approve Reply Before Posting',
                    description: `Please review and approve this reply to @${tweet.author}'s tweet`,
                    kind: ApprovalKind.ContentReview,
                    payload: {
                        content: {
                            type: 'reply',
                            platform: 'twitter',
                            text: selectedReply.text,
                            replyToContext: tweet.content,
                        },
                    },
                    allowEdits: true,
                    notify: {
                        channels: ['web-push'],
                    },
                    resolveHandler: 'handleReplyApproval',
                });

                this.client.ctx.console.log('Waiting for human approval...');
                const approval = await this.client.ctx.promise<ResolutionPayload>('reply-approval');
                if (approval.kind !== ApprovalKind.ContentReview) {
                    throw new TerminalError('Invalid approval kind');
                }
                this.client.ctx.console.log('Human approval received:', approval.decision);

                if (approval.decision === DecisionKind.REJECT) {
                    this.client.ctx.console.log('Reply was rejected by human, skipping this tweet');
                    failedCount++;
                    continue;
                }
            }

            // Step 6: Post the reply
            this.client.ctx.console.log('Step 6: Posting reply...');
            const replyResult = await this.postReply(tweet.id, selectedReply.text);
            this.client.ctx.console.log('Reply posted with status:', replyResult.status);

            if (replyResult.status === 'success') {
                successCount++;
            } else {
                failedCount++;
            }

            processedTweets.push({
                originalTweetId: tweet.id,
                originalTweetContent: tweet.content,
                originalAuthor: tweet.author,
                generatedCopies: copies,
                selectedReply,
                replyResult,
            });

            this.client.ctx.console.log('Completed processing tweet:', tweet.id);
        }

        const resultData: WfResultData = {
            processedTweets: processedTweets.map(pt => ({
                originalTweetId: pt.originalTweetId,
                originalTweetContent: pt.originalTweetContent,
                originalAuthor: pt.originalAuthor,
                generatedCopies: pt.generatedCopies.map(c => c.text),
                selectedReply: pt.selectedReply.text,
                replyStatus: pt.replyResult.status,
            })),
            summary: {
                totalTweetsFetched: tweets.length,
                totalRepliesSent: successCount,
                totalFailed: failedCount,
            },
        };

        this.client.ctx.console.log('=== Workflow Completed ===');
        this.client.ctx.console.log(
            'Summary:',
            JSON.stringify({
                totalTweetsFetched: tweets.length,
                totalRepliesSent: successCount,
                totalFailed: failedCount,
            })
        );

        return this.createOutput('json', {
            type: 'json',
            data: resultData,
        } as any);
    }

    @Signal()
    async handleReplyApproval(data: ResolutionPayload): Promise<void> {
        if (data.kind !== ApprovalKind.ContentReview) {
            throw new TerminalError('Invalid approval kind');
        }
        this.client.ctx.console.log('Signal received: handleReplyApproval', data.decision);
        const promise = this.client.ctx.promise<ResolutionPayload>('reply-approval');
        await promise.resolve(data);
        this.client.ctx.console.log('Promise resolved for reply-approval');
    }

    @Step('fetch-top-tweets')
    async fetchTopTweets(topic: string, maxTweets: number): Promise<Tweet[]> {
        // Dummy data simulating fetched tweets
        await sleep(1000);

        const dummyTweets: Tweet[] = [
            {
                id: 'tweet_001',
                content: `Just discovered an amazing way to use ${topic} in my daily workflow! Game changer`,
                author: '@tech_enthusiast',
                engagement: 1520,
            },
            {
                id: 'tweet_002',
                content: `Hot take: ${topic} is overrated. Change my mind.`,
                author: '@contrarian_view',
                engagement: 3200,
            },
            {
                id: 'tweet_003',
                content: `Building something cool with ${topic}. Stay tuned for updates!`,
                author: '@indie_builder',
                engagement: 890,
            },
            {
                id: 'tweet_004',
                content: `The future of ${topic} is looking incredibly bright. Here's why...`,
                author: '@futurist_anna',
                engagement: 2100,
            },
            {
                id: 'tweet_005',
                content: `Anyone else struggling to learn ${topic}? Looking for resources!`,
                author: '@learning_dev',
                engagement: 450,
            },
            {
                id: 'tweet_006',
                content: `${topic} + AI = mind blown. Just tested this combo and WOW`,
                author: '@ai_explorer',
                engagement: 5600,
            },
            {
                id: 'tweet_007',
                content: `Unpopular opinion: ${topic} documentation needs serious improvement`,
                author: '@docs_advocate',
                engagement: 1800,
            },
            {
                id: 'tweet_008',
                content: `My ${topic} setup for 2024. Thread`,
                author: '@setup_guru',
                engagement: 4200,
            },
            {
                id: 'tweet_009',
                content: `Companies using ${topic} are seeing 3x productivity gains according to new study`,
                author: '@biz_analyst',
                engagement: 2800,
            },
            {
                id: 'tweet_010',
                content: `Free ${topic} course dropping next week! Who wants early access?`,
                author: '@edu_creator',
                engagement: 6100,
            },
        ];

        return dummyTweets.slice(0, maxTweets);
    }

    @Step('generate-reply-copies')
    async generateReplyCopies(tweet: Tweet, brandVoice: string): Promise<ReplyCopy[]> {
        // Simulating LLM call to generate top 3 reply copies
        await sleep(500);

        const dummyReplies: Record<string, Array<{ text: string; tone: string; confidence: number }>> = {
            professional: [
                {
                    text: `Great perspective on this! We've been exploring similar approaches and found some interesting results. Would love to discuss further.`,
                    tone: 'thoughtful',
                    confidence: 0.92,
                },
                {
                    text: `This resonates with our experience. The key insight here is often overlooked. Thanks for sharing!`,
                    tone: 'appreciative',
                    confidence: 0.88,
                },
                {
                    text: `Excellent point. This aligns with industry best practices we've documented. Happy to share resources if helpful.`,
                    tone: 'helpful',
                    confidence: 0.85,
                },
            ],
            witty: [
                {
                    text: `This is the kind of content that makes me actually enjoy scrolling. Take my engagement!`,
                    tone: 'playful',
                    confidence: 0.9,
                },
                {
                    text: `Plot twist: you just made my day with this take. Here's a virtual high-five!`,
                    tone: 'enthusiastic',
                    confidence: 0.87,
                },
                { text: `*Takes notes furiously* This is gold. Someone give this person a medal!`, tone: 'humorous', confidence: 0.83 },
            ],
            casual: [
                {
                    text: `Yo this is spot on! Been thinking the same thing lately. Great minds think alike`,
                    tone: 'friendly',
                    confidence: 0.91,
                },
                { text: `Love this! Super relatable content right here. Keep it coming!`, tone: 'supportive', confidence: 0.86 },
                {
                    text: `This hits different. Thanks for putting into words what we've all been thinking!`,
                    tone: 'relatable',
                    confidence: 0.84,
                },
            ],
        };

        const voiceKey = brandVoice.toLowerCase().includes('professional')
            ? 'professional'
            : brandVoice.toLowerCase().includes('witty')
            ? 'witty'
            : 'casual';

        // Customize based on tweet content
        const baseReplies = dummyReplies[voiceKey];
        return baseReplies.map(reply => {
            let text = reply.text;
            if (tweet.content.includes('struggling') || tweet.content.includes('Looking for')) {
                text = `We've got some great resources that might help! ${text}`;
            }
            if (tweet.content.includes('Hot take') || tweet.content.includes('Unpopular opinion')) {
                text = `Interesting perspective! ${text}`;
            }
            return {
                text,
                tone: reply.tone,
                confidence: reply.confidence,
                targetTweetId: tweet.id,
            };
        });
    }

    @Step('select-best-reply')
    async selectBestReply(copies: ReplyCopy[], originalTweet: Tweet): Promise<SelectedReply> {
        // Simulating LLM call to select the best reply from the 3 options
        await sleep(300);

        // Dummy logic: select based on engagement level
        let selected: ReplyCopy;
        let reason: string;

        if (originalTweet.engagement > 3000) {
            // Select the longest reply for high-engagement tweets
            selected = copies.reduce((a, b) => (a.text.length > b.text.length ? a : b));
            reason = 'High engagement tweet deserves a more thoughtful, detailed response';
        } else if (originalTweet.engagement > 1000) {
            // Select middle-length reply for medium engagement
            const sorted = [...copies].sort((a, b) => a.text.length - b.text.length);
            selected = sorted[1];
            reason = 'Medium engagement tweet benefits from a balanced response';
        } else {
            // Select shortest reply for lower engagement tweets
            selected = copies.reduce((a, b) => (a.text.length < b.text.length ? a : b));
            reason = 'Lower engagement tweet works best with a concise, punchy response';
        }

        return {
            text: selected.text,
            tone: selected.tone,
            confidence: selected.confidence,
            reason,
        };
    }

    @Step('post-reply')
    async postReply(tweetId: string, replyText: string): Promise<PostReplyResult> {
        // Simulating posting a reply to Twitter/X
        await sleep(200);

        // Dummy success rate: 90% success, 10% failure
        const random = Math.random();
        const status: 'success' | 'failed' | 'pending' = random < 0.9 ? 'success' : 'failed';

        return {
            tweetId,
            replyText,
            status,
            timestamp: new Date().toISOString(),
        };
    }
}

export default Workflow;
