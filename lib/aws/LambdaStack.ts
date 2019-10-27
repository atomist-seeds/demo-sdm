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
