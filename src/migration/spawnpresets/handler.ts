import {
  createErrorResponse,
  createSuccessResponse,
  GravelmonDynamoDBService,
  LambdaEvent,
  parseBody,
  SpawnPresetNode,
  SpawnPresetOptions,
} from "gravelmon-dynamodb";

export const handler = async (event: LambdaEvent) => {
  if (!process.env.DYNAMODB_TABLE) {
    return createErrorResponse(500, "DYNAMODB_TABLE environment variable is required.");
  }
  const gravelmonDynamoDBService = new GravelmonDynamoDBService(process.env.DYNAMODB_TABLE);

  try {
    const parsed = parseBody<{spawnPresetOptions: SpawnPresetOptions}[]>(event);
    const spawnPresetNodes = parsed.map(entry=> new SpawnPresetNode(entry.spawnPresetOptions))
    let results = await gravelmonDynamoDBService.batchPutItems(spawnPresetNodes) as SpawnPresetNode[];
    return createSuccessResponse(200, results)
  } catch (error: any) {
    console.log(error);
    return createErrorResponse(500, error.message || "Internal error");
  }
};
