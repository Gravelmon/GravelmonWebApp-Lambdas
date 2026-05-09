import {
    createErrorResponse, createFieldEffectFlagNode, createSuccessResponse, DynamoNode, createFieldEffectWithFlagEdge,
    GravelmonDynamoDBService,
    LambdaEvent, FieldEffectData, FieldEffectIdentifier, FieldEffectNode,
    parseBody, createFieldEffectIsTypeEdge,
} from "gravelmon-dynamodb";

async function processFieldEffectDataRelations(fieldEffect : FieldEffectNode, fieldEffectData: FieldEffectData, gravelmonDynamoDBService: GravelmonDynamoDBService) {
    for (const type of fieldEffectData.associatedTypes ?? []) {
        await gravelmonDynamoDBService.putItem(createFieldEffectIsTypeEdge(fieldEffect.identifier, type));
    }
}

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
                fieldEffectFlags: string[];
                introducedByGames: string[];
                implemented: boolean;
            }[]
            flags: string[]
        }>(event);
        const fieldEffectNodes = parsed.fieldEffects.map(entry => new FieldEffectNode(
            entry.displayName, entry.identifier, entry.fieldEffectData, entry.rebalancedFieldEffectData, entry.introducedByGames, entry.fieldEffectFlags, entry.implemented))
        let fieldEffectResults = await gravelmonDynamoDBService.batchPutItems(fieldEffectNodes) as FieldEffectNode[];
        const flagNodes = parsed.flags.map(entry=> createFieldEffectFlagNode(entry));
        let flagResults = await gravelmonDynamoDBService.batchPutItems(flagNodes) as DynamoNode[];
        for (const fieldEffectResult of fieldEffectResults) {
            for (const flag of fieldEffectResult.fieldEffectFlags) {
                await gravelmonDynamoDBService.putItem(createFieldEffectWithFlagEdge(fieldEffectResult.identifier, flag));
            }
            await processFieldEffectDataRelations(fieldEffectResult, fieldEffectResult.fieldEffectData, gravelmonDynamoDBService);
            if (fieldEffectResult.rebalancedFieldEffectData) {
                await processFieldEffectDataRelations(fieldEffectResult, fieldEffectResult.rebalancedFieldEffectData, gravelmonDynamoDBService);
            }
        }
        return createSuccessResponse(200, {
            fieldEffects: fieldEffectResults,
            flags: flagResults
        })
    } catch (error: any) {
        console.log(error);
        return createErrorResponse(500, error.message || "Internal error");
    }
};
