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

import { logger } from "@atomist/automation-client";
import {
    goal,
    Goal,
    slackInfoMessage,
} from "@atomist/sdm";
import {
    AwsCredentialsResolver,
    createOrUpdateAlias,
    deployedFunctionInfo,
    publishVersion,
} from "./lambdaPrimitives";
import { lambdaSamScanner } from "./lambdaSamScanner";

export interface StagedDeployment {
    alias: string;

    /**
     * Whether to promote automatically
     */
    preApproval: boolean;
}

/**
 * Create an alias from $LATEST for all functions in this stack
 */
export function lambdaAliasGoal(credResolver: AwsCredentialsResolver,
                                stage: StagedDeployment): Goal {
    return goal({
        displayName: `Promote to ${stage.alias}`,
        preApproval: stage.preApproval,
    }, async gi => {
        return gi.configuration.sdm.projectLoader.doWithProject({
            id: gi.id,
            credentials: gi.credentials,
            readOnly: true,
        }, async p => {
            const creds = await credResolver(gi);
            const lambda = await lambdaSamScanner(p);
            if (!lambda) {
                throw new Error(`Not a lambda project: ${p.id.url}`);
            }

            for (const func of lambda.functions) {
                if (!func.functionName) {
                    logger.info("Cannot promote function resource '%s' as it doesn't have a FunctionName", func.declarationName);
                    continue;
                }
                const info = await deployedFunctionInfo(creds, func.functionName);
                if (!info) {
                    throw new Error(`Can't find deployment info for lambda project: ${p.id.url}`);
                }
                const version = await publishVersion(await credResolver(gi), { FunctionName: func.functionName });
                const aliased = await createOrUpdateAlias(creds, {
                    FunctionName: func.functionName,
                    FunctionVersion: version.Version,
                    Name: stage.alias,
                });
                await gi.addressChannels(slackInfoMessage(`Promoted to \`${stage.alias}\``, aliased.AliasArn));
            }
        });
    });
}
