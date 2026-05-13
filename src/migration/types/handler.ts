import {
    createErrorResponse, createSuccessResponse, FieldEffectIdentifier,
    GravelmonDynamoDBService,
    LambdaEvent, MoveIdentifier,
    parseBody, PokemonIdentifier, TypeInteractions, TypeNode
} from "gravelmon-dynamodb";

export const handler = async (event: LambdaEvent) => {
    if (!process.env.DYNAMODB_TABLE) {
        return createErrorResponse(500, "DYNAMODB_TABLE environment variable is required.");
    }
    const gravelmonDynamoDBService = new GravelmonDynamoDBService(process.env.DYNAMODB_TABLE);

    try {
        const parsed = parseBody<{
            name: string,
            typeInteractions: TypeInteractions,
            rebalancedTypeInteractions: TypeInteractions,
            moves: MoveIdentifier[],
            associatedFieldEffects: FieldEffectIdentifier[],
            pokemon: PokemonIdentifier[],
            introducedByGames: string[]
        }[]>(event);
        const animationNodes = parsed.map(entry =>
            new TypeNode(
                entry.name,
                entry.typeInteractions,
                entry.introducedByGames,
                entry.moves,
                entry.associatedFieldEffects,
                entry.pokemon,
                entry.rebalancedTypeInteractions,)
        )
        let results = await gravelmonDynamoDBService.batchPutItems(animationNodes) as TypeNode[];
        return createSuccessResponse(200, results)
    } catch (error: any) {
        console.log(error);
        return createErrorResponse(500, error.message || "Internal error");
    }
};
