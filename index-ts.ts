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
    or,
    ToDefaultBranch,
} from "@atomist/sdm";
import {
    configure,
    hasRepositoryGoals,
} from "@atomist/sdm-core";
import { HasDockerfile } from "@atomist/sdm-pack-docker";
import { IsMaven } from "@atomist/sdm-pack-spring";
import {
    SpringGoalCreator,
    SpringGoals,
} from "./lib/machine/goals";
import {
    MachineConfigurer,
    options,
} from "./lib/machine/options";
import { ImmaterialChange } from "./lib/machine/push";
import { IsReleaseCommit } from "./lib/machine/release";
import { SpringGoalConfigurer } from "./lib/machine/springSupport";

export const configuration = configure<SpringGoals>(async sdm => {

    const goals = await sdm.createGoals(
        SpringGoalCreator,
        [SpringGoalConfigurer, MachineConfigurer]);

    return {
        immaterial: {
            test: or(ImmaterialChange, IsReleaseCommit, hasRepositoryGoals),
            goals: ImmaterialGoals.andLock(),
        },
        check: {
            test: IsMaven,
            goals: [
                [goals.cancel, goals.autofix],
                [goals.codeInspection, goals.version, goals.pushImpact],
            ],
        },
        build: {
            test: IsMaven,
            dependsOn: "check",
            goals: goals.build,
        },
        docker_build: {
            test: HasDockerfile,
            dependsOn: "build",
            goals: goals.dockerBuild,
        },
        deploy: {
            test: and(HasDockerfile, ToDefaultBranch),
            depends_on: "docker_build",
            goals: [
                goals.stagingDeployment,
                goals.productionDeployment,
                [goals.releaseDocker, goals.releaseTag, goals.releaseVersion],
            ],
        },
    };
}, options);
