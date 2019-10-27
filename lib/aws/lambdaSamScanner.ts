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

import { logger, Project, ProjectFile } from "@atomist/automation-client";
import * as yaml from "yamljs";
import { LambdaSamStack } from "./LambdaSamStack";
import { FunctionInfo } from "./LambdaStack";

/**
 * Path to SAM template within repo
 */
const SamTemplatePath = "template.yml";

/**
 * Find Lambda data in SAM template file
 * @param {Project} p
 * @return {Promise<any>}
 */
export const lambdaSamScanner: (p: Project) => Promise<LambdaSamStack| undefined> = async p => {
    const samTemplateFile = await p.getFile(SamTemplatePath);
    if (!samTemplateFile) {
        return undefined;
    }

    try {
        const functions: FunctionInfo[] = await parseSamTemplate(samTemplateFile);

        const stack: LambdaSamStack = {
            functions,
            name: "lambda",
            kind: "sam",
            tags: ["lambda", "aws", "aws-sam"],
            // TODO gather these
            referencedEnvironmentVariables: [],
        };

        logger.info("Found stack %j", stack);
        return stack;
    } catch (err) {
        logger.warn("Ill formed SAM template: %s", err.message);
        return undefined;
    }
};

async function parseSamTemplate(samTemplateFile: ProjectFile): Promise<FunctionInfo[]> {
    const parsed = yaml.parse(await samTemplateFile.getContent());

    const functions: FunctionInfo[] = [];
    const resources = parsed.Resources;

    for (const declarationName of Object.getOwnPropertyNames(resources)) {
        const resource: any = resources[declarationName];
        if (resource.Type === "AWS::Serverless::Function") {
            functions.push({
                declarationName,
                functionName: resource.Properties.FunctionName,
                runtime: resource.Properties.Runtime,
                handler: resource.Properties.Handler,
            });
        }
    }
    return functions;
}
