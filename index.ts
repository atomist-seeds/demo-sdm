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
    and,
    ImmaterialGoals,
    not,
    or,
    ToDefaultBranch,
} from "@atomist/sdm";
import {
    configure,
    IsGitHubAction,
} from "@atomist/sdm-core";
import { HasDockerfile } from "@atomist/sdm-pack-docker";
import {
    HasSpringBootApplicationClass,
    HasSpringBootPom,
    IsMaven,
} from "@atomist/sdm-pack-spring";
import {
    demoSdmSupport,
    ImmaterialChange,
} from "./lib/machine/demo";
import { sdmGoals } from "./lib/machine/goals";
import { sdmOptions } from "./lib/machine/options";
import { IsReleaseCommit } from "./lib/machine/release";

export const configuration = configure(async sdm => {
    const goals = sdmGoals();

    demoSdmSupport(sdm, goals);

    return {
        immaterial: {
            test: or(ImmaterialChange, IsReleaseCommit),
            goals: ImmaterialGoals.andLock(),
        },
        check: {
            test: IsMaven,
            goals: [
                [goals.cancel, goals.autofix],
                [goals.codeInspection, goals.version, goals.fingerprint, goals.pushImpact],
            ],
        },
        build: {
            dependsOn: ["check"],
            test: IsMaven,
            goals: goals.build,
        },
        docker: {
            dependsOn: ["build"],
            test: and(IsMaven, HasDockerfile),
            goals: goals.dockerBuild,
        },
        stagingDeploy: {
            dependsOn: ["docker"],
            test: and(HasDockerfile, HasSpringBootPom, HasSpringBootApplicationClass, ToDefaultBranch),
            goals: goals.stagingDeployment,
        },
        productionDeploy: {
            dependsOn: ["stagingDeploy"],
            test: and(HasDockerfile, HasSpringBootPom, HasSpringBootApplicationClass, ToDefaultBranch, not(IsGitHubAction)),
            goals: [
                goals.productionDeployment,
                [goals.releaseDocker, goals.releaseTag, goals.releaseVersion],
            ],
        },
    };
}, sdmOptions);
