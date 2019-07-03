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
    githubTeamVoter,
    Goal,
    GoalWithFulfillment,
    ImmaterialGoals,
    not,
    or,
    SoftwareDeliveryMachine,
    ToDefaultBranch,
} from "@atomist/sdm";
import {
    configure,
    githubGoalStatusSupport,
    goalStateSupport,
    IsGitHubAction,
    k8sGoalSchedulingSupport,
} from "@atomist/sdm-core";
import { toArray } from "@atomist/sdm-core/lib/util/misc/array";
import { buildAwareCodeTransforms } from "@atomist/sdm-pack-build";
import { HasDockerfile } from "@atomist/sdm-pack-docker";
import { issueSupport } from "@atomist/sdm-pack-issue";
import { k8sSupport } from "@atomist/sdm-pack-k8s";
import {
    HasSpringBootApplicationClass,
    HasSpringBootPom,
    IsMaven,
} from "@atomist/sdm-pack-spring";
import {
    SpringGoalCreator,
    SpringGoals,
} from "./lib/machine/goals";
import { machineOptions } from "./lib/machine/options";
import { ImmaterialChange } from "./lib/machine/push";
import { IsReleaseCommit } from "./lib/machine/release";
import { SpringGoalConfigurer } from "./lib/machine/springSupport";

export const configuration = configure(async sdm => {

    const goals = await createGoals<SpringGoals>(sdm, SpringGoalCreator, SpringGoalConfigurer);

    sdm.addGoalApprovalRequestVoter(githubTeamVoter());

    sdm.addExtensionPacks(
        buildAwareCodeTransforms({
            buildGoal: goals.build,
            issueCreation: {
                issueRouter: {
                    raiseIssue: async () => { /* raise no issues */
                    },
                },
            },
        }),
        issueSupport(),
        goalStateSupport(),
        githubGoalStatusSupport(),
        k8sGoalSchedulingSupport(),
        k8sSupport({ addCommands: true }),
    );

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
}, machineOptions);

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Everything below could go to sdm-core
export type MachineGoals = Record<string, Goal | GoalWithFulfillment>;
export type GoalCreator<G extends MachineGoals> = (sdm: SoftwareDeliveryMachine) => Promise<G>;
export type GoalConfigurer<G extends MachineGoals> = (sdm: SoftwareDeliveryMachine, goals: G) => Promise<void>;

export async function createGoals<G extends MachineGoals>(sdm: SoftwareDeliveryMachine,
                                                          creator: GoalCreator<G>,
                                                          configurers: GoalConfigurer<G> | Array<GoalConfigurer<G>> = [],
): Promise<G> {
    const goals = await creator(sdm);
    if (!!configurers) {
        for (const configurer of toArray(configurers)) {
            await configurer(sdm, goals);
        }
    }
    return goals;
}
