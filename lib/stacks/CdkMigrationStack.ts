import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';
import {RestApi} from "aws-cdk-lib/aws-apigateway";

export class CdkMigrationStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Parameters
        const tableNameParam = new cdk.CfnParameter(this, 'GravelmonDynamoTable', {
            type: 'String',
            default: 'Gravelmon',
        });


        // API Gateway
        const api = createApiGateway(this)

        const migrate = api.root.addResource('migrate');

        // DynamoDB Table
        const table = new dynamodb.Table(this, 'DynamoTable', {
            tableName: tableNameParam.valueAsString,
            partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        });

        table.addGlobalSecondaryIndex({
            indexName: 'GSI1-EntityType',
            partitionKey: { name: 'entityType', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL,
        });

        // Lambda Layer
        const dynamoLayer = new lambda.LayerVersion(this, 'DynamoDBGraphLayer', {
            layerVersionName: 'gravelmon-dynamodb',
            description: 'Shared DynamoDB graph utility layer for Lambda functions',
            code: lambda.Code.fromAsset(
                path.join(__dirname, '../../../GravelmonWebApp-DynamoLayer/dist/layer'), {
                    exclude: ['cdk.out', 'node_modules/.cache', '.git']
                }
            ),
            compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
        });

        const createMigrationFunction = (name: string, endPoint: string) => {
            let lowerCaseName = name.toLowerCase()
            // Lambda Function
            const animationMigrationFunction = new lambda.Function(this, `${name}MigrationFunction`, {
                runtime: lambda.Runtime.NODEJS_18_X,
                handler: `dist/migration/${lowerCaseName}/handler.handler`,
                code: lambda.Code.fromAsset(path.join(__dirname, `../../dist/migration/${lowerCaseName}`), {
                    exclude: ['cdk.out', 'node_modules/.cache', '.git']
                }) ,
                timeout: cdk.Duration.seconds(30),
                layers: [dynamoLayer],
                environment: {
                    DYNAMODB_TABLE: tableNameParam.valueAsString
                },
            });

            // Permissions (equivalent to DynamoDBCrudPolicy)
            table.grantReadWriteData(animationMigrationFunction);

            const animation = migrate.addResource(endPoint);

            animation.addMethod(
                'PUT',
                new apigateway.LambdaIntegration(animationMigrationFunction),
                {
                    apiKeyRequired: true,
                }
            );
        };

        createMigrationFunction("Animations", "animations")
        createMigrationFunction("Games", "games")
        createMigrationFunction("Moves", "moves")
        createMigrationFunction("Types", "types")
        createMigrationFunction("SpawnPresets", "spawn-presets")
        createMigrationFunction("Pokemon", "pokemon")
        createMigrationFunction("Forms", "forms")
        createMigrationFunction("Evolutions", "evolutions")
        createMigrationFunction("Properties", "properties")
        createMigrationFunction("FieldEffects", "field-effect")
    }
}

function createApiGateway(cdkMigrationStack: CdkMigrationStack):RestApi {
    let api = new apigateway.RestApi(cdkMigrationStack, 'Api', {
        deployOptions: {
            stageName: 'Prod',
        },
    });

    const apiKey = api.addApiKey('MigrationApiKey', {
        apiKeyName: 'migration-api-key',
        description: 'API key for migration endpoint',
    });

    const usagePlan = api.addUsagePlan('MigrationUsagePlan', {
        name: 'MigrationUsagePlan',
        throttle: {
            rateLimit: 10,
            burstLimit: 2,
        },
    });

    usagePlan.addApiKey(apiKey);

    usagePlan.addApiStage({
        stage: api.deploymentStage,
    });

    new cdk.CfnOutput(cdkMigrationStack, 'ApiKeyId', {
        value: apiKey.keyId,
    });

    return api
}