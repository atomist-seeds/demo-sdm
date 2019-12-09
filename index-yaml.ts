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

import { configureYaml } from "@atomist/sdm-core";
import { IsReleaseCommit } from "@atomist/sdm-pack-version";
import { SpringGoals } from "./lib/goal";
import { SpringGoalConfigurer } from "./lib/goalConfigurer";
import { SpringGoalCreator } from "./lib/goalCreator";
import {
    MachineConfigurer,
    options,
} from "./lib/options";
import { ImmaterialChange } from "./lib/push";

export const configuration = configureYaml<SpringGoals>(
    [
        "goals/no-goals.yaml",
        "goals/maven-goals.yaml",
        "goals/docker-goals.yaml",
    ],
    {
        tests: {
            ImmaterialChange,
            IsReleaseCommit,
        },
        goals: SpringGoalCreator,
        configurers: [SpringGoalConfigurer, MachineConfigurer],
        options,
    },
);
