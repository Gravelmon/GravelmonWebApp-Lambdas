import {
    createErrorResponse, createSuccessResponse, EvolutionNode, EvolutionOptions,
    GravelmonDynamoDBService,
    LambdaEvent,
    parseBody, PokemonIdentifier,
} from "gravelmon-dynamodb";

export const handler = async (event: LambdaEvent) => {
    if (!process.env.DYNAMODB_TABLE) {
        return createErrorResponse(500, "DYNAMODB_TABLE environment variable is required.");
    }
    const gravelmonDynamoDBService = new GravelmonDynamoDBService(process.env.DYNAMODB_TABLE);

    try {
        const parsed = parseBody<{
            currentPokemon: PokemonIdentifier,
            evolutions: PokemonIdentifier[],
            preEvolutions: PokemonIdentifier[],
            evolutionOptions: EvolutionOptions
        }[]>(event);
        const pokemonNodes = parsed.map(entry =>
            new EvolutionNode(entry.currentPokemon, entry.evolutionOptions, entry.evolutions, entry.preEvolutions));
        let pokemonResults = await gravelmonDynamoDBService.batchPutItems(pokemonNodes) as EvolutionNode[];

        return createSuccessResponse(200, {
            evolutions: pokemonResults
        })
    } catch (error: any) {
        console.log(error);
        return createErrorResponse(500, error.message || "Internal error");
    }
};
