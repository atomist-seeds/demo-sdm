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

import {
    astUtils,
    GitHubRepoRef,
    MicrogrammarBasedFileParser,
    RemoteRepoRef,
} from "@atomist/automation-client";
import { microgrammar } from "@atomist/microgrammar";
import {
    CodeTransform,
    GeneratorRegistration,
    StartingPoint,
} from "@atomist/sdm";

// TODO take AWS regex
const LegalFunctionName = /[A-Za-z0-9_]+/;

const FunctionNameGrammar = microgrammar({
    _fn: "FunctionName",
    _colon: ":",
    functionName: LegalFunctionName,
});

export const updateTemplate: CodeTransform<LambdaCreationParameters> =
    async (p, papi) => {
        await astUtils.doWithAllMatches(p,
            new MicrogrammarBasedFileParser("template", "FunctionName", FunctionNameGrammar),
            "template.yml",
            "//FunctionName/functionName", async m => {
                console.log(`Changing ${m.$value} to ${papi.parameters.functionName}`);
                m.$value = papi.parameters.functionName;
            });
        // Update other things
    };

export interface LambdaCreationParameters {
    functionName: string;
    description: string;
    role: string;
}

export function lambdaGenerator(opts: Pick<GeneratorRegistration<LambdaCreationParameters>, "name" | "intent" | "startingPoint">): GeneratorRegistration<LambdaCreationParameters>  {
    return {
        parameters: {
            functionName: {
                pattern: LegalFunctionName,
            },
            description: {},
            role: {}, // TODO take AWS regexp
        },
        transform: [
            updateTemplate,
        ],
        ...opts,
    };
}
