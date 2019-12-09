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
    Configuration,
    GitHubRepoRef,
} from "@atomist/automation-client";
import {
    githubGoalStatusSupport,
    GoalConfigurer,
    goalStateSupport,
    k8sGoalSchedulingSupport,
} from "@atomist/sdm-core";
import { gcpSupport } from "@atomist/sdm-pack-gcp";
import { issueSupport } from "@atomist/sdm-pack-issue";
import { k8sSupport } from "@atomist/sdm-pack-k8s";
import {
    ReplaceReadmeTitle,
    SetAtomistTeamInApplicationYml,
    SpringProjectCreationParameterDefinitions,
    SpringProjectCreationParameters,
    TransformMavenSpringBootSeedToCustomProject,
} from "@atomist/sdm-pack-spring";
import * as _ from "lodash";
import {
    AddDockerfile,
    SuggestAddingDockerfile,
} from "./commands/addDockerfile";
import { SpringGoals } from "./goal";
import { replaceSeedSlug } from "./transform/seedSlugTransform";

const sdmName = "demo-sdm";

/**
 * SDM options for configure function.
 */
export const options: any = {
    name: sdmName,
    preProcessors: [
        async (config: Configuration) => {
            _.merge(config, {
                sdm: {
                    cache: {
                        bucket: "atm-demo-sdm-goal-cache-demo",
                        enabled: true,
                        path: "demo-sdm-cache",
                    },
                },
            });
            return config;
        },
    ],
};

export const MachineConfigurer: GoalConfigurer<SpringGoals> = async (sdm, goals) => {
    sdm.addExtensionPacks(
        gcpSupport(),
        githubGoalStatusSupport(),
        goalStateSupport({
            cancellation: {
                enabled: true,
            },
        }),
        issueSupport({
            labelIssuesOnDeployment: true,
            closeCodeInspectionIssuesOnBranchDeletion: {
                enabled: true,
                source: sdmName,
            },
        }),
        k8sGoalSchedulingSupport(),
        k8sSupport({ addCommands: true }),
    );

    sdm.addGeneratorCommand<SpringProjectCreationParameters>({
        name: "create-spring",
        intent: "create spring",
        description: "Create a new Java Spring Boot REST service",
        parameters: SpringProjectCreationParameterDefinitions,
        startingPoint: GitHubRepoRef.from({ owner: "atomist-seeds", repo: "spring-rest", branch: "master" }),
        transform: [
            replaceSeedSlug("atomist-seeds", "spring-rest"),
            ReplaceReadmeTitle,
            SetAtomistTeamInApplicationYml,
            ...TransformMavenSpringBootSeedToCustomProject,
        ],
    });

    sdm.addChannelLinkListener(SuggestAddingDockerfile);
    sdm.addCodeTransformCommand(AddDockerfile);

};
