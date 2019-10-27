/*
 * Copyright © 2019 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { logger, } from "@atomist/automation-client";
import { CodeInspectionRegistration, CommandHandlerRegistration, SdmContext, } from "@atomist/sdm";
import * as AWS from "aws-sdk";
import {
    AwsCredentials,
    AwsCredentialsResolver,
    createFunction,
    deleteFunction,
    invokeFunction,
    listFunctions,
} from "./lambdaPrimitives";

import { ProjectAnalyzer } from "@atomist/sdm-pack-analysis";

// TODO get this from AWS config block in configuration
export async function defaultAwsCredentialsResolver(ctx: SdmContext): Promise<AwsCredentials> {
    return {
        accessKeyId: "AKIAJCH2I47XAYLXBLYQ",
        secretAccessKey: process.env.AWS_SECRET_KEY,
        apiVersion: "2015-03-31",
        region: "us-east-1",
    };
}

/**
 * If this is a lambda, deploy it
 */
export function deployLambda(credsResolver: AwsCredentialsResolver,
                             analyzer: ProjectAnalyzer): CodeInspectionRegistration<AWS.Lambda.Types.FunctionConfiguration> {
    return {
        name: "deployLambda",
        intent: "deploy lambda",
        inspection: async (p, i) => {
            try {
                const creds: AwsCredentials = await credsResolver(i);
                const result = await createFunction(creds, p, analyzer, i);
                await i.addressChannels(`:check-circle: Successfully deployed lambda for project at ${p.id.url}`);
                await i.addressChannels(`Name: \`${result.FunctionName}\``);
                await i.addressChannels(`ARN: \`${result.FunctionArn}\``);
                await i.addressChannels(`Version: \`${result.Version}\``);
                return result;
            } catch (err) {
                await i.addressChannels(`:error-circle: Could not create lambda for project at ${p.id.url}: ${err.message}`);
                logger.warn(err);
                return undefined;
            }
        },
    };
}

export function deleteLambda(credsResolver: AwsCredentialsResolver,
                             analyzer: ProjectAnalyzer): CodeInspectionRegistration<AWS.Lambda.Types.FunctionConfiguration> {
    return {
        name: "deleteLambda",
        intent: "delete lambda",
        inspection: async (p, i) => {
            try {
                const creds: AwsCredentials = await credsResolver(i);
                const result = await deleteFunction(creds, p, analyzer, i);
                await i.addressChannels(`:check-circle: Successfully deleted lambda for project at ${p.id.url}`);
                return result;
            } catch (err) {
                await i.addressChannels(`:error-circle: Could not delete lambda for project at ${p.id.url}: ${err.message}`);
                logger.warn(err);
                return undefined;
            }
        },
    };
}

export interface ChooseFunctionParameters {
    functionName: string;
    qualifier?: string;
}

export function invokeFunctionCommand(credsResolver: AwsCredentialsResolver): CommandHandlerRegistration<ChooseFunctionParameters> {
    return {
        name: "invokeFunction",
        intent: ["invoke lambda", "invoke function"],
        parameters: {
            // TODO put in pattern from AWS regexps
            functionName: {},
            qualifier: { required: false },
        },
        listener: async ci => {
            const FunctionName = ci.parameters.functionName + (ci.parameters.qualifier ? `:${ci.parameters.qualifier}` : "");
            try {
                const res = await invokeFunction(await credsResolver(ci), {
                    FunctionName,
                    InvokeArgs: "{}",
                });
                if (res.Status >= 200 && res.Status < 300) {
                    await ci.addressChannels(`:white_check_mark: Response was ${res.Status} from \`${FunctionName}\`. This is OK`);
                } else {
                    await ci.addressChannels(`:skull: Response was ${res.Status} from \`${FunctionName}\`. This is Not Good.`);
                }
            } catch (err) {
                if (err.message.includes("Function not found")) {
                    await ci.addressChannels(`:question: Function \`${FunctionName}\` not found`);
                } else {
                    await ci.addressChannels(`:skull: Unknown failure: ${err.message}`);
                }
            }
        },
    };
}

export function listFunctionsCommand(credsResolver: AwsCredentialsResolver): CommandHandlerRegistration {
    return {
        name: "listFunctions",
        intent: "list functions",
        listener: async cli => {
            try {
                const creds: AwsCredentials = await credsResolver(cli);
                const response = await listFunctions(creds, {});
                await cli.addressChannels(`Found ${response.Functions.length} functions`);
                for (const result of response.Functions) {
                    await cli.addressChannels(`Name: \`${result.FunctionName}\`\n` +
                        `ARN: \`${result.FunctionArn}\`\n` +
                        `Version: \`${result.Version}\``);
                }
            } catch (err) {
                await cli.addressChannels(`:error-circle: Could not list functions: ${err.message}`);
                logger.warn(err);
                return undefined;
            }
        },
    };
}

/*
export const suggestLambdaDeployment: ChannelLinkListener = async inv => {
    const eligible = await IsAtomistConfigLambda.predicate(inv.project);
    if (!eligible) {
        logger.info("Not suggesting Lambda deployment for %j as not a lambda", inv.id);
        return;
    }

    const attachment: Attachment = {
        text: "Add a Cloud Foundry manifest to your new repo?",
        fallback: "add PCF manifest",
        actions: [buttonForCommand({ text: "Deploy as AWS Lambda?" },
            deployLambda.name,
            {},
        ),
        ],
    };
    const message: SlackMessage = {
        attachments: [attachment],
    };
    return inv.addressNewlyLinkedChannel(message, { dashboard: false });
};
*/