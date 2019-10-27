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

import { TechnologyElement } from "@atomist/sdm-pack-analysis";

import { Environment, FunctionName, Handler, Runtime } from "aws-sdk/clients/lambda";

export interface FunctionInfo {
    /**
     * Name of YAML resource block
     */
    declarationName: FunctionName;

    /**
     * FunctionName property.
     */
    functionName?: FunctionName;

    runtime: Runtime;
    handler: Handler;
    environment?: Environment;
}

/**
 * Superinterface for Lambda stack variants.
 */
export interface LambdaStack extends TechnologyElement {

    name: "lambda";

    kind: string;

    functions: FunctionInfo[];

}
