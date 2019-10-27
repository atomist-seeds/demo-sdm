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
    asSpawnCommand,
    LocalProject,
} from "@atomist/automation-client";
import {
    goal,
    Goal,
    spawnLog,
    SpawnLogOptions,
} from "@atomist/sdm";

export interface LambdaSamDeployOptions {
    uniqueName: string;
    bucketName: string;
}

/**
 * Deploy using Lambda SAM. Requires AWS and SAM CLI installed locally
 * and correct credentials available for them
 * @return {Goal}
 */
export function lambdaSamDeployGoal(options: LambdaSamDeployOptions): Goal {
    return goal({
        uniqueName: options.uniqueName,
        displayName: "deployLambda",
    }, async gi => {
        return gi.configuration.sdm.projectLoader.doWithProject({
            id: gi.id,
            credentials: gi.credentials,
            readOnly: true,
        }, async p => {
            // TODO what is this?
            const stackName = p.id.repo;
            const packageArgs = `package --template-file template.yml --s3-bucket ${
                options.bucketName} --output-template-file packaged-template.yml`.split(" ");
            const deployArgs = `deploy --template-file packaged-template.yml --stack-name ${
                stackName} --capabilities CAPABILITY_IAM`.split(" ");

            const opts: SpawnLogOptions = { log: gi.progressLog, cwd: (p as LocalProject).baseDir };

            const packageResult = await spawnLog("sam", packageArgs, opts);
            if (packageResult.code !== 0) {
                await gi.addressChannels(`:skull: Failed to package Lambda for ${p.id.url}`);
                return packageResult;
            }
            const deployResult = await spawnLog("sam", deployArgs, opts);
            if (deployResult.code !== 0) {
                await gi.addressChannels(`:skull: Failed to deploy Lambda for ${p.id.url}`);
            }
            // await gi.addressChannels("Update: " + JSON.stringify(update));
            return deployResult;
        });
    });
}
