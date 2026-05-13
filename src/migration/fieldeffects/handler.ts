import {
    createErrorResponse, createSuccessResponse, DynamoNode, GravelmonDynamoDBService,
    LambdaEvent, FieldEffectData, FieldEffectIdentifier, FieldEffectNode,
    parseBody, MoveIdentifier, AbilityIdentifier, FieldEffectFlagNode,
} from "gravelmon-dynamodb";

export const handler = async (event: LambdaEvent) => {
    if (!process.env.DYNAMODB_TABLE) {
        return createErrorResponse(500, "DYNAMODB_TABLE environment variable is required.");
    }
    const gravelmonDynamoDBService = new GravelmonDynamoDBService(process.env.DYNAMODB_TABLE);

    try {
        const parsed = parseBody<{
            fieldEffects: {
                displayName: string;
                identifier: FieldEffectIdentifier;
                fieldEffectData: FieldEffectData;
                rebalancedFieldEffectData?: FieldEffectData;
                associatedMoves: MoveIdentifier[];
                associatedAbilities: AbilityIdentifier[];
                fieldEffectFlags: string[];
                introducedByGames: string[];
                implemented: boolean;
            }[]
            flags: {
                name: string
                fieldEffects: FieldEffectIdentifier[]
            }[]
        }>(event);
        const fieldEffectNodes = parsed.fieldEffects
            .map(entry => new FieldEffectNode(
                entry.displayName,
                entry.identifier,
                entry.fieldEffectData,
                entry.associatedMoves,
                entry.associatedAbilities,
                entry.rebalancedFieldEffectData,
                entry.introducedByGames,
                entry.fieldEffectFlags,
                entry.implemented
                )
            )
        let fieldEffectResults = await gravelmonDynamoDBService.batchPutItems(fieldEffectNodes) as FieldEffectNode[];
        const flagNodes = parsed.flags.map(entry=> new FieldEffectFlagNode(entry.name, entry.fieldEffects));
        let flagResults = await gravelmonDynamoDBService.batchPutItems(flagNodes) as DynamoNode[];
        return createSuccessResponse(200, {
            fieldEffects: fieldEffectResults,
            flags: flagResults
        })
    } catch (error: any) {
        console.log(error);
        return createErrorResponse(500, error.message || "Internal error");
    }
};
