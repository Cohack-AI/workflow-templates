import { createCohackClient } from '@cohack/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({
    path: path.join(process.cwd(), `.env.${process.env.NODE_ENV ? process.env.NODE_ENV : 'local'}`),
});

export const client = createCohackClient(process.env.COHACK_API_KEY, {
    baseUrl: process.env.COHACK_BASE_URL,
});
