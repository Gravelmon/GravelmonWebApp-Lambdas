import {
    createErrorResponse, createMoveFlagNode, createSuccessResponse, DynamoNode, createMoveWithFlagEdge, createMoveAssociatedWithFieldEffectEdge,
    GravelmonDynamoDBService,
    LambdaEvent, MoveData, MoveIdentifier, MoveNode,
    parseBody, createMoveIsTypeEdge,
} from "gravelmon-dynamodb";

async function processMoveDataRelations(move : MoveNode, moveData: MoveData, gravelmonDynamoDBService: GravelmonDynamoDBService) {
    for (const type of moveData.moveTypes) {
        await gravelmonDynamoDBService.putItem(createMoveIsTypeEdge(move.moveIdentifier, type));
    }
    for (const weather of moveData.associatedWeathers ?? []) {
        await gravelmonDynamoDBService.putItem(createMoveAssociatedWithFieldEffectEdge(move.moveIdentifier, weather));
    }
    for (const terrain of moveData.associatedTerrain ?? []) {
        await gravelmonDynamoDBService.putItem(createMoveAssociatedWithFieldEffectEdge(move.moveIdentifier, terrain));
    }
    for (const fieldEffect of moveData.associatedFieldEffects ?? []) {
        await gravelmonDynamoDBService.putItem(createMoveAssociatedWithFieldEffectEdge(move.moveIdentifier, fieldEffect));
    }
}

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
                rebalancedMoveData?: MoveData;
                moveFlags: string[]
            }[]
            flags: string[]
        }>(event);
        const moveNodes = parsed.moves.map(entry => new MoveNode(
            entry.displayName, entry.moveIdentifier, entry.moveData, entry.rebalancedMoveData, entry.moveFlags))
        let moveResults = await gravelmonDynamoDBService.batchPutItems(moveNodes) as MoveNode[];
        const flagNodes = parsed.flags.map(entry=> createMoveFlagNode(entry));
        let flagResults = await gravelmonDynamoDBService.batchPutItems(flagNodes) as DynamoNode[];
        for (const moveResult of moveResults) {
            for (const flag of moveResult.moveFlags) {
                await gravelmonDynamoDBService.putItem(createMoveWithFlagEdge(moveResult.moveIdentifier, flag));
            }
            await processMoveDataRelations(moveResult, moveResult.moveData, gravelmonDynamoDBService);
            if (moveResult.rebalancedMoveData) {
                await processMoveDataRelations(moveResult, moveResult.rebalancedMoveData, gravelmonDynamoDBService);
            }
        }
        return createSuccessResponse(200, {
            moves: moveResults,
            flags: flagResults
        })
    } catch (error: any) {
        console.log(error);
        return createErrorResponse(500, error.message || "Internal error");
    }
};
