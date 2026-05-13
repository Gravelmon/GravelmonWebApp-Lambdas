import {
    createErrorResponse, createSuccessResponse,
    GravelmonDynamoDBService,
    LambdaEvent,
    parseBody, PokemonData, PokemonNode,
} from "gravelmon-dynamodb";

export const handler = async (event: LambdaEvent) => {
    if (!process.env.DYNAMODB_TABLE) {
        return createErrorResponse(500, "DYNAMODB_TABLE environment variable is required.");
    }
    const gravelmonDynamoDBService = new GravelmonDynamoDBService(process.env.DYNAMODB_TABLE);

    try {
        const parsed = parseBody<PokemonData[]>(event);
        const pokemonNodes = parsed.map(entry => new PokemonNode(entry));
        let pokemonResults = await gravelmonDynamoDBService.batchPutItems(pokemonNodes) as PokemonNode[];

        return createSuccessResponse(200, {
            pokemon: pokemonResults
        })
    } catch (error: any) {
        console.log(error);
        return createErrorResponse(500, error.message || "Internal error");
    }
};
