/*
 * Copyright © 2018 Atomist, Inc.
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
    githubTeamVoter,
    ImmaterialGoals,
    isMaterialChange,
    not,
    SoftwareDeliveryMachine,
    SoftwareDeliveryMachineConfiguration,
    ToDefaultBranch,
    whenPushSatisfies,
} from "@atomist/sdm";
import {
    createSoftwareDeliveryMachine,
    gitHubGoalStatus,
    goalState,
    IsGitHubAction,
} from "@atomist/sdm-core";
import { buildAwareCodeTransforms } from "@atomist/sdm-pack-build";
import { HasDockerfile } from "@atomist/sdm-pack-docker";
import { IssueSupport } from "@atomist/sdm-pack-issue";
import {
    HasSpringBootApplicationClass,
    HasSpringBootPom,
    IsMaven,
} from "@atomist/sdm-pack-spring";
import { AddDockerfile } from "../commands/addDockerfile";
import {
    build,
    buildGoals,
    checkGoals,
    dockerGoals,
    productionDeployGoals,
    stagingDeployGoals,
} from "./goals";
import { IsReleaseCommit } from "./release";
import { addSpringSupport } from "./springSupport";

export function machine(
    configuration: SoftwareDeliveryMachineConfiguration,
): SoftwareDeliveryMachine {

    const sdm = createSoftwareDeliveryMachine({
            name: "Kubernetes Demo Software Delivery Machine",
            configuration,
        },
    );

    sdm.withPushRules(
        whenPushSatisfies(not(isMaterialChange({
            extensions: ["java", "html", "json", "yml", "xml", "sh", "kt", "properties"],
            files: ["Dockerfile"],
            directories: [".atomist", ".github"],
        }))).setGoals(ImmaterialGoals.andLock()),
        whenPushSatisfies(IsReleaseCommit).setGoals(ImmaterialGoals.andLock()),
        whenPushSatisfies(IsMaven).setGoals(checkGoals),
        whenPushSatisfies(IsMaven).setGoals(buildGoals),
        whenPushSatisfies(IsMaven, HasDockerfile).setGoals(dockerGoals),
        whenPushSatisfies(HasSpringBootPom, HasSpringBootApplicationClass,
            ToDefaultBranch, HasDockerfile).setGoals(stagingDeployGoals),
        whenPushSatisfies(HasSpringBootPom, HasSpringBootApplicationClass,
            ToDefaultBranch, HasDockerfile, not(IsGitHubAction)).setGoals(productionDeployGoals),
    );

    sdm.addCodeTransformCommand(AddDockerfile);

    addSpringSupport(sdm);

    sdm.addGoalApprovalRequestVoter(githubTeamVoter());
    sdm.addExtensionPacks(
        buildAwareCodeTransforms({
            buildGoal: build,
            issueCreation: {
                issueRouter: {
                    raiseIssue: async () => {
                        // raise no issues
                    },
                },
            },
        }),
        IssueSupport,
        goalState(),
        gitHubGoalStatus());

    return sdm;
}
