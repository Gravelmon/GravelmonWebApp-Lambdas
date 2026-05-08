import {
  AnimationNode,
  createAnimationNode,
  createErrorResponse, createSuccessResponse,
  GravelmonDynamoDBService,
  LambdaEvent,
  parseBody,
  PrimaryPoseType
} from "gravelmon-dynamodb";

export const handler = async (event: LambdaEvent) => {
  if (!process.env.DYNAMODB_TABLE) {
    return createErrorResponse(500, "DYNAMODB_TABLE environment variable is required.");
  }
  const gravelmonDynamoDBService = new GravelmonDynamoDBService(process.env.DYNAMODB_TABLE);

  try {
    const parsed = parseBody<{ name: string, primaryPoseType: PrimaryPoseType }[]>(event);
    const animationNodes = parsed.map(entry=> createAnimationNode(entry.name, entry.primaryPoseType))
    let results = await gravelmonDynamoDBService.batchPutItems(animationNodes) as AnimationNode[];
    return createSuccessResponse(200, results)
  } catch (error: any) {
    console.log(error);
    return createErrorResponse(500, error.message || "Internal error");
  }
};
