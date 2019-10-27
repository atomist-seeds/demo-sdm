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

import { GitHubRepoRef } from "@atomist/automation-client";
import {
    CodeTransform,
    GeneratorRegistration,
} from "@atomist/sdm";

// TODO this is probably wrong as it's doing our own file not SAM template
const updateDeploymentDescriptor: CodeTransform<LambdaCreationParameters> =
    async (p, papi) => {
        const deployment = await p.findFile("deployment.yml");
        await deployment.replaceAll("$FunctionName", papi.parameters.functionName);
        await deployment.replaceAll("$Description", papi.parameters.description);
        await deployment.replaceAll("$Role", papi.parameters.role);
    };

export interface LambdaCreationParameters {
    functionName: string;
    description: string;
    role: string;
}

export const lambdaGenerator: GeneratorRegistration<LambdaCreationParameters & { owner: string, repo: string }> = {
    name: "lambdaGenerator",
    startingPoint: params => new GitHubRepoRef(params.owner, params.repo),
    parameters: {
        owner: {},
        repo: {},
        functionName: {}, // TODO take AWS regex
        description: {},
        role: {}, // TODO take their regexp
    },
    transform: [
        updateDeploymentDescriptor,
    ],
};
