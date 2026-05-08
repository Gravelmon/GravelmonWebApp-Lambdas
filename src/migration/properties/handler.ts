import {
    SpeciesFeatureType, ChoiceSpeciesFeatureNode,
    createEggGroupNode,
    createErrorResponse,
    createExperienceGroupNode,
    createLabelNode,
    createSuccessResponse,
    DynamoNode, FlagSpeciesFeatureNode,
    GravelmonDynamoDBService,
    LambdaEvent,
    parseBody,
    NumberRange,
    IntegerSpeciesFeatureNode,
    IntegerSpeciesFeatureDisplay,
    ResourceLocation, deserializeVector,
} from "gravelmon-dynamodb";

interface BasicNode {
    name: string;
}

export const handler = async (event: LambdaEvent) => {
    if (!process.env.DYNAMODB_TABLE) {
        return createErrorResponse(500, "DYNAMODB_TABLE environment variable is required.");
    }
    const gravelmonDynamoDBService = new GravelmonDynamoDBService(process.env.DYNAMODB_TABLE);

    try {
        const parsed = parseBody<{
            eggGroups: BasicNode[],
            experienceGroups: BasicNode[],
            labels: BasicNode[],
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
                display?: IntegerSpeciesFeatureDisplay
            }[]
        }>(event);

        const eggGroupNodes = parsed.eggGroups.map(entry => createEggGroupNode(entry.name))
        let eggGroupResults = await gravelmonDynamoDBService.batchPutItems(eggGroupNodes) as DynamoNode[];

        const experienceGroupNodes = parsed.experienceGroups.map(entry => createExperienceGroupNode(entry.name))
        let experienceGroupResults = await gravelmonDynamoDBService.batchPutItems(experienceGroupNodes) as DynamoNode[];

        const labelsNodes = parsed.labels.map(entry => createLabelNode(entry.name))
        let labelsResults = await gravelmonDynamoDBService.batchPutItems(labelsNodes) as DynamoNode[];

        const speciesFeatureNodes = parsed.speciesFeatures.map(entry => {
            const speciesFeatureType = entry.speciesFeatureType;
            const isPrimarySpeciesFeature = entry.isPrimarySpeciesFeature;
            const introducedByGame = entry.introducedByGame;
            const name = entry.speciesFeatureName;

            if (speciesFeatureType === SpeciesFeatureType.Flag) {
                return new FlagSpeciesFeatureNode(entry.id, name, entry.isDefault, isPrimarySpeciesFeature, introducedByGame);
            } else if (speciesFeatureType === SpeciesFeatureType.Choice) {
                const choices = entry.choices;
                if (!choices) {
                    throw new Error("Invalid data for deserializing ChoiceSpeciesFeatureNode: missing choices property");
                }
                const defaultOption = entry.defaultValue;
                return new ChoiceSpeciesFeatureNode(entry.id, name, choices, defaultOption as string, isPrimarySpeciesFeature, introducedByGame);
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
                    introducedByGame,
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
