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
    LocalProject,
    logger,
    Project,
} from "@atomist/automation-client";
import { SdmContext } from "@atomist/sdm";
import { ProjectAnalyzer } from "@atomist/sdm-pack-analysis";
import * as AWS from "aws-sdk";
import { _Blob } from "aws-sdk/clients/lambda";
import * as fs from "fs";
import { LambdaApiStack } from "../api/LambdaApiStack";

export type AwsCredentials = Pick<AWS.Lambda.Types.ClientConfiguration,
    "accessKeyId" | "secretAccessKey" | "apiVersion" | "region">;

/**
 * Resolve AWS credentials from context
 */
export type AwsCredentialsResolver = (ctx: SdmContext) => Promise<AwsCredentials>;

export type PersistedFunctionData = Pick<AWS.Lambda.Types.CreateFunctionRequest,
    "FunctionName" | "Description" | "Role" | "Handler" | "MemorySize" | "Publish" | "Runtime">;

export async function isDeployedFunctionByName(creds: AwsCredentials,
                                               functionName: string): Promise<boolean> {
    return !!await deployedFunctionInfo(creds, functionName);
}

export async function deployedFunctionInfo(creds: AwsCredentials,
                                           functionName: string): Promise<AWS.Lambda.Types.GetFunctionResponse | undefined> {
    const lambda = new AWS.Lambda(creds);
    const params: AWS.Lambda.Types.GetFunctionRequest = {
        FunctionName: functionName,
    };
    return new Promise((resolve, reject) => {
        return lambda.getFunction(params, (err, data) => {
            if (err) {
                // TODO what if it's because it exists
                reject(err);
            }
            // logger.info(data);
            resolve(data);
        });
    });
}

export async function createFunction(creds: AwsCredentials,
                                     p: Project,
                                     analyzer: ProjectAnalyzer,
                                     context: SdmContext): Promise<AWS.Lambda.Types.FunctionConfiguration> {
    const lambda = new AWS.Lambda(creds);
    return doWithLambdaProject(p, analyzer, context, args => {
        const params: AWS.Lambda.Types.CreateFunctionRequest = {
            Code: {
                ZipFile: args.zip,
            },
            ...args.persisted,
            Timeout: 15,
            VpcConfig: {},
        };
        return new Promise((resolve, reject) => {
            lambda.createFunction(params, (err, data) => {
                if (err) {
                    // TODO what if it's because it exists
                    reject(err);
                }
                //  logger.info(data);
                resolve(data);
            });
        });
    });
}

export async function updateFunctionCode(creds: AwsCredentials,
                                         p: Project,
                                         analyzer: ProjectAnalyzer, context: SdmContext): Promise<AWS.Lambda.Types.FunctionConfiguration> {
    const lambda = new AWS.Lambda(creds);
    return doWithLambdaProject(p, analyzer, context, args => {
        const params: AWS.Lambda.Types.UpdateFunctionCodeRequest = {
            FunctionName: args.persisted.FunctionName,
            ZipFile: args.zip,
        };
        return new Promise((resolve, reject) => {
            lambda.updateFunctionCode(params, (err, data) => {
                if (err) {
                    // TODO what if it's because it exists
                    reject(err);
                }
                // logger.info(data);
                resolve(data);
            });
        });
    });
}

/**
 * Publish $LATEST as a version
 * @param {AwsCredentials} creds
 * @param {AWS.Lambda.Types.PublishVersionRequest} params
 * @return {Promise<AWS.Lambda.Types.FunctionConfiguration>}
 */
export async function publishVersion(creds: AwsCredentials,
                                     params: AWS.Lambda.Types.PublishVersionRequest): Promise<AWS.Lambda.Types.FunctionConfiguration> {
    const lambda = new AWS.Lambda(creds);
    return new Promise((resolve, reject) => {
        lambda.publishVersion(params, (err, data) => {
            if (err) {
                // TODO what if it's because it exists
                reject(err);
            }
            // logger.info(data);
            resolve(data);
        });
    });
}

export async function createOrUpdateAlias(creds: AwsCredentials,
                                          params: AWS.Lambda.Types.CreateAliasRequest): Promise<AWS.Lambda.Types.AliasConfiguration> {
    try {
        return await updateAlias(creds, params);
    } catch (err) {
        logger.info("Trying to create alias as it does not exist: %j", params);
        return createAlias(creds, params);
    }
}

export async function createAlias(creds: AwsCredentials,
                                  params: AWS.Lambda.Types.CreateAliasRequest): Promise<AWS.Lambda.Types.AliasConfiguration> {
    const lambda = new AWS.Lambda(creds);
    return new Promise((resolve, reject) => {
        lambda.createAlias(params, (err, data) => {
            if (err) {
                // TODO what if it's because it exists
                reject(err);
            }
            // logger.info(data);
            resolve(data);
        });
    });
}

export async function updateAlias(creds: AwsCredentials,
                                  params: AWS.Lambda.Types.UpdateAliasRequest): Promise<AWS.Lambda.Types.AliasConfiguration> {
    const lambda = new AWS.Lambda(creds);
    return new Promise((resolve, reject) => {
        lambda.updateAlias(params, (err, data) => {
            if (err) {
                // TODO what if it's because it exists
                reject(err);
            }
            // logger.info(data);
            resolve(data);
        });
    });
}

export async function listFunctions(creds: AwsCredentials,
                                    params: AWS.Lambda.Types.ListFunctionsRequest): Promise<AWS.Lambda.Types.ListFunctionsResponse> {
    const lambda = new AWS.Lambda(creds);
    return new Promise((resolve, reject) => {
        lambda.listFunctions(params, (err, data) => {
            if (err) {
                reject(err);
            }
            // logger.info(data);
            resolve(data);
        });
    });
}

export async function invokeFunction(creds: AwsCredentials,
                                     params: AWS.Lambda.Types.InvokeAsyncRequest): Promise<AWS.Lambda.Types.InvokeAsyncResponse> {
    const lambda = new AWS.Lambda(creds);
    return new Promise((resolve, reject) => {
        lambda.invokeAsync(params, (err, data) => {
            if (err) {
                reject(err);
            }
            // logger.info(data);
            resolve(data);
        });
    });
}

export async function deleteAlias(creds: AwsCredentials,
                                  params: AWS.Lambda.Types.DeleteAliasRequest): Promise<AWS.Lambda.Types.AliasConfiguration> {
    const lambda = new AWS.Lambda(creds);
    return new Promise((resolve, reject) => {
        lambda.deleteAlias(params, (err, data) => {
            if (err) {
                // TODO what if it's because it exists
                reject(err);
            }
            // logger.info(data);
            resolve(data);
        });
    });
}

export async function deleteFunction(creds: AwsCredentials,
                                     p: Project,
                                     analyzer: ProjectAnalyzer, context: SdmContext): Promise<AWS.Lambda.Types.FunctionConfiguration> {
    const lambda = new AWS.Lambda(creds);
    return doWithLambdaProject(p, analyzer, context, args => {
        const params: AWS.Lambda.Types.DeleteFunctionRequest = {
            FunctionName: args.persisted.FunctionName,
        };
        return new Promise((resolve, reject) => {
            lambda.deleteFunction(params, (err, data) => {
                if (err) {
                    // TODO what if it's because it exists
                    reject(err);
                }
                // logger.info(data);
                resolve(data);
            });
        });
    });
}

export async function deleteFunctionByName(creds: AwsCredentials,
                                           functionName: string): Promise<AWS.Lambda.Types.FunctionConfiguration> {
    const lambda = new AWS.Lambda(creds);
    const params: AWS.Lambda.Types.DeleteFunctionRequest = {
        FunctionName: functionName,
    };
    return new Promise((resolve, reject) => {
        lambda.deleteFunction(params, (err, data) => {
            if (err) {
                // TODO what if it's because it doesn't exist
                reject(err);
            }
            // logger.info(data);
            resolve(data);
        });
    });

}

interface LambdaActionArgs {
    zip: _Blob;
    persisted: PersistedFunctionData;
}

async function doWithLambdaProject<T>(p: Project, analyzer: ProjectAnalyzer, context: SdmContext,
                                      action: (args: LambdaActionArgs) => Promise<T>): Promise<T> {
    const interpretation = await analyzer.interpret(p, context);
    if (!!interpretation.reason.analysis.elements.lambda) {
        const persisted: PersistedFunctionData = (interpretation.reason.analysis.elements.lambda as LambdaApiStack).persisted;
        const pathToZip = await zipProject(p);
        logger.info(JSON.stringify(persisted));
        // TODO shouldn't be sync
        const zip = fs.readFileSync(pathToZip);
        return action({ zip, persisted });
    } else {
        const msg = `Project at ${p.id.url} is not a deployable Lambda`;
        throw new Error(msg);
    }
}

/**
 * Return file path of zip file
 * @param {Project} p
 * @return {string} path of the zip file
 */
async function zipProject(p: Project): Promise<string> {
    const lp = p as LocalProject;
    const zip = require("zip-a-folder");
    const path = lp.baseDir + "/" + "upload.zip";
    await zip.zip(lp.baseDir, path);
    return path;
}
