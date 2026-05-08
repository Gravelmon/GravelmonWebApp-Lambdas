import {createTestEnv} from "./testEnv";

process.env.DYNAMODB_ENDPOINT = 'http://localhost:8000';
process.env.AWS_REGION = 'us-east-1';
process.env.DYNAMODB_TABLE = 'TestGraphTable';
process.env.AWS_ACCESS_KEY_ID = 'dummy';
process.env.AWS_SECRET_ACCESS_KEY = 'dummy';
process.env.AWS_SDK_LOAD_CONFIG = '0';
process.env.IS_LOCAL = 'true';

let env: ReturnType<typeof createTestEnv>;
beforeAll(async () => {
    env = createTestEnv()
    await env.createTable();
});

afterAll(async () => {
    env.destroy();
});