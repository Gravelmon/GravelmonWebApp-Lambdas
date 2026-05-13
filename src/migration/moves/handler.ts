import {
    createErrorResponse,
    createSuccessResponse,
    DynamoNode,
    GravelmonDynamoDBService,
    LambdaEvent,
    MoveData,
    MoveIdentifier,
    MoveNode,
    parseBody,
    MoveFlagNode, LearnedByData,
} from "gravelmon-dynamodb";

export const handler = async (event: LambdaEvent) => {
    if (!process.env.DYNAMODB_TABLE) {
        return createErrorResponse(500, "DYNAMODB_TABLE environment variable is required.");
    }
    const gravelmonDynamoDBService = new GravelmonDynamoDBService(process.env.DYNAMODB_TABLE);

    try {
        const parsed = parseBody<{
            moves: {
                moveIdentifier: MoveIdentifier;
                displayName: string;
                moveData: MoveData;
                learnedBy: LearnedByData;
                rebalancedLearnedBy?: LearnedByData;
                rebalancedMoveData?: MoveData;
                moveFlags: string[]
                implemented: boolean;
            }[]
            flags: {name:string, moves: MoveIdentifier[]} []
        }>(event);
        const moveNodes = parsed.moves.map(entry =>
            new MoveNode(
                entry.displayName,
                entry.moveIdentifier,
                entry.moveData,
                entry.learnedBy,
                entry.rebalancedMoveData,
                entry.rebalancedLearnedBy,
                entry.moveFlags,
                entry.implemented)
        )
        let moveResults = await gravelmonDynamoDBService.batchPutItems(moveNodes) as MoveNode[];
        const flagNodes = parsed.flags.map(entry=> new MoveFlagNode(entry.name, entry.moves));
        let flagResults = await gravelmonDynamoDBService.batchPutItems(flagNodes) as DynamoNode[];
        return createSuccessResponse(200, {
            moves: moveResults,
            flags: flagResults
        })
    } catch (error: any) {
        console.log(error);
        return createErrorResponse(500, error.message || "Internal error");
    }
};
