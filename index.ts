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
import { machineGoals } from "./lib/machine/goals";
import { machineOptions } from "./lib/machine/options";
import { ImmaterialChange } from "./lib/machine/push";
import { IsReleaseCommit } from "./lib/machine/release";
import { machineSupport } from "./lib/machine/support";

export const configuration = configure(async sdm => {
    machineSupport(sdm, machineGoals);

    return {
        immaterial: {
            test: or(ImmaterialChange, IsReleaseCommit),
            goals: ImmaterialGoals.andLock(),
        },
        check: {
            test: IsMaven,
            goals: [
                [machineGoals.cancel, machineGoals.autofix],
                [machineGoals.codeInspection, machineGoals.version, machineGoals.fingerprint, machineGoals.pushImpact],
            ],
        },
        build: {
            dependsOn: ["check"],
            test: IsMaven,
            goals: machineGoals.build,
        },
        docker: {
            dependsOn: ["build"],
            test: and(IsMaven, HasDockerfile),
            goals: machineGoals.dockerBuild,
        },
        stagingDeploy: {
            dependsOn: ["docker"],
            test: and(HasDockerfile, HasSpringBootPom, HasSpringBootApplicationClass, ToDefaultBranch),
            goals: machineGoals.stagingDeployment,
        },
        productionDeploy: {
            dependsOn: ["stagingDeploy"],
            test: and(HasDockerfile, HasSpringBootPom, HasSpringBootApplicationClass, ToDefaultBranch, not(IsGitHubAction)),
            goals: [
                machineGoals.productionDeployment,
                [machineGoals.releaseDocker, machineGoals.releaseTag, machineGoals.releaseVersion],
            ],
        },
    };
}, machineOptions);
