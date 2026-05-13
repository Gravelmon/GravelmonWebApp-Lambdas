import {
    SpeciesFeatureType,
    ChoiceSpeciesFeatureNode,
    createErrorResponse,
    createSuccessResponse,
    DynamoNode,
    FlagSpeciesFeatureNode,
    GravelmonDynamoDBService,
    LambdaEvent,
    parseBody,
    NumberRange,
    IntegerSpeciesFeatureNode,
    IntegerSpeciesFeatureDisplay,
    ResourceLocation, deserializeVector, EggGroupNode, ExperienceGroupNode, LabelNode,
    PokemonIdentifier,
} from "gravelmon-dynamodb";

export const handler = async (event: LambdaEvent) => {
    if (!process.env.DYNAMODB_TABLE) {
        return createErrorResponse(500, "DYNAMODB_TABLE environment variable is required.");
    }
    const gravelmonDynamoDBService = new GravelmonDynamoDBService(process.env.DYNAMODB_TABLE);

    try {
        const parsed = parseBody<{
            eggGroups: {
                name: string,
                pokemonInEggGroup: PokemonIdentifier[];
            }[],
            experienceGroups: {
                name: string,
                pokemonInExperienceGroups: PokemonIdentifier[];
            }[],
            labels: {
                name: string,
                pokemonInLabel: PokemonIdentifier[];
            }[],
            speciesFeatures: {
                id: string,
                speciesFeatureName: string,
                speciesFeatureType: SpeciesFeatureType,
                isSpeciesFeature: boolean,
                isDefault: boolean,
                isPrimarySpeciesFeature: boolean,
                introducedByGame: string,
                choices?: string[],
                defaultValue?: string | number
                numberRange?: NumberRange
                isVisible?: boolean,
                itemPoints: {
                    resourceLocation: ResourceLocation,
                    amount: number
                }[],
                display?: IntegerSpeciesFeatureDisplay,
                recipients: {
                    game: string;
                    pokemon: string;
                    formName?: string;
                }[]
            }[]
        }>(event);

        const eggGroupNodes = parsed.eggGroups.map(entry => new EggGroupNode(entry.name, entry.pokemonInEggGroup))
        let eggGroupResults = await gravelmonDynamoDBService.batchPutItems(eggGroupNodes) as EggGroupNode[];

        const experienceGroupNodes = parsed.experienceGroups.map(entry => new ExperienceGroupNode(entry.name, entry.pokemonInExperienceGroups))
        let experienceGroupResults = await gravelmonDynamoDBService.batchPutItems(experienceGroupNodes) as ExperienceGroupNode[];

        const labelsNodes = parsed.labels.map(entry => new LabelNode(entry.name, entry.pokemonInLabel))
        let labelsResults = await gravelmonDynamoDBService.batchPutItems(labelsNodes) as LabelNode[];

        const speciesFeatureNodes = parsed.speciesFeatures.map(entry => {
            const speciesFeatureType = entry.speciesFeatureType;
            const isPrimarySpeciesFeature = entry.isPrimarySpeciesFeature;
            const introducedByGame = entry.introducedByGame;
            const name = entry.speciesFeatureName;
            const recipients = entry.recipients.map(identifier => PokemonIdentifier.deserialize(identifier));

            if (speciesFeatureType === SpeciesFeatureType.Flag) {
                return new FlagSpeciesFeatureNode(entry.id, name, entry.isDefault, isPrimarySpeciesFeature, introducedByGame, recipients);
            } else if (speciesFeatureType === SpeciesFeatureType.Choice) {
                const choices = entry.choices;
                if (!choices) {
                    throw new Error("Invalid data for deserializing ChoiceSpeciesFeatureNode: missing choices property");
                }
                const defaultOption = entry.defaultValue;
                return new ChoiceSpeciesFeatureNode(entry.id, name, choices, defaultOption as string, isPrimarySpeciesFeature, introducedByGame, recipients);
            } else if (speciesFeatureType === SpeciesFeatureType.Integer) {
                if (!entry.isVisible) {
                    throw new Error("Invalid data for deserializing ChoiceSpeciesFeatureNode: missing isVisible property");
                }
                if (!entry.itemPoints) {
                    throw new Error("Invalid data for deserializing ChoiceSpeciesFeatureNode: missing itemPoints property");
                }
                const range = NumberRange.deserialize(entry.numberRange);
                return new IntegerSpeciesFeatureNode(
                    entry.id, name,
                    range,
                    entry.defaultValue as number,
                    entry.isVisible,
                    entry.itemPoints.map((itemPoint : any) => {
                        return {
                            resourceLocation: ResourceLocation.deserialize(itemPoint.resourceLocation),
                            amount: itemPoint.amount
                        }
                    }),
                    introducedByGame, recipients,
                    entry.display ? {
                        uiName: entry.display.uiName,
                        color: deserializeVector(entry.display.color),
                        underlay: entry.display.underlay.serialize(),
                        overlay: entry.display.overlay.serialize(),
                    } : undefined);
            } else {
                throw new Error("Invalid speciesFeature type for deserializing SpeciesFeatureNode");
            }
        });
        let speciesFeatureResults = await gravelmonDynamoDBService.batchPutItems(speciesFeatureNodes) as DynamoNode[];

        return createSuccessResponse(200, {
            eggGroups: eggGroupResults,
            experienceGroups: experienceGroupResults,
            labels: labelsResults,
            speciesFeatures: speciesFeatureResults,
        })
    } catch (error: any) {
        console.log(error);
        return createErrorResponse(500, error.message || "Internal error");
    }
};
