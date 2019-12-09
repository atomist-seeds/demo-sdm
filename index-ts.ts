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
    hasFile,
    ImmaterialGoals,
    or,
    ToDefaultBranch,
} from "@atomist/sdm";
import { configure } from "@atomist/sdm-core";
import { IsReleaseCommit } from "@atomist/sdm-pack-version";
import { SpringGoals } from "./lib/goal";
import { SpringGoalConfigurer } from "./lib/goalConfigurer";
import { SpringGoalCreator } from "./lib/goalCreator";
import {
    MachineConfigurer,
    options,
} from "./lib/options";
import { ImmaterialChange } from "./lib/push";

export const configuration = configure<SpringGoals>(async sdm => {

    const goals = await sdm.createGoals(
        SpringGoalCreator,
        [SpringGoalConfigurer, MachineConfigurer],
    );

    return {
        immaterial: {
            test: or(ImmaterialChange, IsReleaseCommit),
            goals: ImmaterialGoals.andLock(),
        },
        check: {
            test: hasFile("pom.xml"),
            goals: [
                goals.autofix,
                goals.version,
            ],
        },
        build: {
            test: hasFile("pom.xml"),
            dependsOn: "check",
            goals: goals.build,
        },
        docker_build: {
            test: hasFile("Dockerfile"),
            dependsOn: "build",
            goals: goals.dockerBuild,
        },
        deploy: {
            test: [hasFile("Dockerfile"), ToDefaultBranch],
            dependsOn: "docker_build",
            goals: [
                goals.stagingDeployment,
                goals.productionDeployment,
            ],
        },
    };
}, options);
