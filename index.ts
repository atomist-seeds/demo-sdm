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

import { githubTeamVoter } from "@atomist/sdm";
import {
    configure,
    githubGoalStatusSupport,
    goalStateSupport,
    k8sGoalSchedulingSupport,
} from "@atomist/sdm-core";
import { buildAwareCodeTransforms } from "@atomist/sdm-pack-build";
import { issueSupport } from "@atomist/sdm-pack-issue";
import { k8sSupport } from "@atomist/sdm-pack-k8s";
import { AddDockerfile } from "./lib/commands/addDockerfile";
import { goalsData } from "./lib/machine/goals";
import { sdmOptions } from "./lib/machine/options";
import { addSpringSupport } from "./lib/machine/springSupport";

export const configuration = configure(async sdm => {
    const { goals, goalData } = goalsData();

    sdm.addCodeTransformCommand(AddDockerfile);
    addSpringSupport(sdm, goals);
    sdm.addGoalApprovalRequestVoter(githubTeamVoter());
    sdm.addExtensionPacks(
        buildAwareCodeTransforms({
            buildGoal: goals.build,
            issueCreation: {
                issueRouter: {
                    raiseIssue: async () => { /* raise no issues */ },
                },
            },
        }),
        issueSupport(),
        goalStateSupport(),
        githubGoalStatusSupport(),
        k8sGoalSchedulingSupport(),
        k8sSupport({ addCommands: true }),
    );

    return goalData;
}, sdmOptions);
