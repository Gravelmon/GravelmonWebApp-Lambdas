import { LambdaEvent } from "gravelmon-dynamodb";
import { handler } from "../../../migration/animations/handler";
import { BatchWriteItemCommand } from "@aws-sdk/client-dynamodb";
import { DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { mockClient } from "aws-sdk-client-mock";

import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const dynamoMock = mockClient(DynamoDBDocumentClient);

describe("Animation Handler Integration Test", () => {
    const DYNAMODB_TABLE = "TestTable";
    beforeAll(() => {
        // Set up environment variables required by the Lambda
        process.env.DYNAMODB_TABLE = DYNAMODB_TABLE;

        // Mock DynamoDB behavior
        dynamoMock.on(BatchWriteItemCommand).resolves({});

        dynamoMock.on(DescribeTableCommand).resolves({
            Table: { TableStatus: "ACTIVE" }
        });
    });

    afterEach(() => {
        dynamoMock.reset(); // Reset mocks after every test
    });

    it("should return an error when the DynamoDB_TABLE environment variable is missing", async () => {
        // Remove the environment variable
        let value = process.env.DYNAMODB_TABLE;
        delete process.env.DYNAMODB_TABLE;

        const result = await handler({} as LambdaEvent);

        expect(result?.statusCode).toBe(500);
        expect(result?.body).toContain("DYNAMODB_TABLE environment variable is required.");

        process.env.DYNAMODB_TABLE = value;
    });
});