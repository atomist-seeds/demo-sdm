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

import { GitHubRepoRef } from "@atomist/automation-client";
import { SoftwareDeliveryMachine } from "@atomist/sdm";
import { isInLocalMode } from "@atomist/sdm-core";
import { DockerOptions } from "@atomist/sdm-pack-docker";
import { singleIssuePerCategoryManaging } from "@atomist/sdm-pack-issue";
import {
    mavenBuilder,
    MavenProjectIdentifier,
    ReplaceReadmeTitle,
    SetAtomistTeamInApplicationYml,
    springFormat,
    SpringProjectCreationParameterDefinitions,
    SpringProjectCreationParameters,
    springSupport,
    TransformMavenSpringBootSeedToCustomProject,
} from "@atomist/sdm-pack-spring";
import { SuggestAddingDockerfile } from "../commands/addDockerfile";
import { MachineGoals } from "./goals";
import { kubernetesApplicationData } from "./k8sSupport";
import {
    MavenDefaultOptions,
    MavenProjectVersioner,
    MvnPackage,
    MvnVersion,
} from "./maven";
import {
    DockerPull,
    executeReleaseDocker,
    executeReleaseTag,
    executeReleaseVersion,
} from "./release";

export function addSpringSupport(sdm: SoftwareDeliveryMachine, goals: MachineGoals): void {

    sdm.addGeneratorCommand<SpringProjectCreationParameters>({
        name: "create-spring",
        intent: "create spring",
        description: "Create a new Java Spring Boot REST service",
        parameters: SpringProjectCreationParameterDefinitions,
        startingPoint: GitHubRepoRef.from({ owner: "atomist-playground", repo: "spring-rest-seed", branch: "master" }),
        transform: [
            ReplaceReadmeTitle,
            SetAtomistTeamInApplicationYml,
            ...TransformMavenSpringBootSeedToCustomProject,
        ],
    });

    goals.autofix.with(springFormat(sdm.configuration));
    goals.version.withVersioner(MavenProjectVersioner);
    goals.build.with({
        ...MavenDefaultOptions,
        builder: mavenBuilder(),
    });
    goals.dockerBuild.with({
        options: {
            ...sdm.configuration.sdm.docker.hub as DockerOptions,
            dockerfileFinder: async () => "Dockerfile",
            push: true,
            // builder: "kaniko",
        },
    })
        .withProjectListener(MvnVersion)
        .withProjectListener(MvnPackage);
    goals.stagingDeployment.with({ applicationData: kubernetesApplicationData });
    goals.productionDeployment.with({ applicationData: kubernetesApplicationData });
    goals.releaseDocker.with({
        ...MavenDefaultOptions,
        name: "docker-release",
        goalExecutor: executeReleaseDocker(
            {
                ...sdm.configuration.sdm.docker.hub as DockerOptions,
            }),
    })
        .withProjectListener(DockerPull);
    goals.releaseTag.with({
        ...MavenDefaultOptions,
        name: "release-tag",
        goalExecutor: executeReleaseTag(),
    });
    goals.releaseVersion.with({
        ...MavenDefaultOptions,
        name: "mvn-release-version",
        goalExecutor: executeReleaseVersion(MavenProjectIdentifier, {
            command: "mvn",
            args: [
                "build-helper:parse-version",
                "versions:set",
                // tslint:disable-next-line:max-line-length
                "-DnewVersion=\${parsedVersion.majorVersion}.\${parsedVersion.minorVersion}.\${parsedVersion.nextIncrementalVersion}-\${parsedVersion.qualifier}",
                "versions:commit",
            ],
        }),
    });

    sdm.addChannelLinkListener(SuggestAddingDockerfile);
    sdm.addExtensionPacks(springSupport({
        inspectGoal: goals.codeInspection,
        autofixGoal: goals.autofix,
        review: {
            cloudNative: true,
            springStyle: true,
        },
        autofix: {
            springStyle: true,
            cloudNative: true,
        },
        reviewListeners: isInLocalMode() ? [] : [singleIssuePerCategoryManaging("sdm-pack-spring")],
    }));
}
