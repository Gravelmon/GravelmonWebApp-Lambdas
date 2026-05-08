import {
  createErrorResponse, createGameNode, createSuccessResponse, GameData, GameNode,
  GravelmonDynamoDBService,
  LambdaEvent,
  parseBody,
} from "gravelmon-dynamodb";

export const handler = async (event: LambdaEvent) => {
  if (!process.env.DYNAMODB_TABLE) {
    return createErrorResponse(500, "DYNAMODB_TABLE environment variable is required.");
  }
  const gravelmonDynamoDBService = new GravelmonDynamoDBService(process.env.DYNAMODB_TABLE);

  try {
    const parsed = parseBody<{gameData: GameData}[]>(event);
    const gameNodes = parsed.map(entry=> createGameNode(entry.gameData))
    let results = await gravelmonDynamoDBService.batchPutItems(gameNodes) as GameNode[];
    return createSuccessResponse(200, results)
  } catch (error: any) {
    console.log(error);
    return createErrorResponse(500, error.message || "Internal error");
  }
};
