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
    asSpawnCommand,
    GitHubRepoRef,
} from "@atomist/automation-client";
import { SoftwareDeliveryMachine } from "@atomist/sdm";
import { isInLocalMode } from "@atomist/sdm-core";
import {
    DefaultDockerImageNameCreator,
    DockerOptions,
} from "@atomist/sdm-pack-docker";
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
    TransformSeedToCustomProject,
} from "@atomist/sdm-pack-spring";
import { SuggestAddingDockerfile } from "../commands/addDockerfile";
import {
    DemoSdmGoals,
    versionGoal,
} from "./goals";
import {
    kubernetesDeploymentData,
    kubernetesDeploymentSpecCreator,
} from "./k8Support";
import {
    MavenDefaultOptions,
    MavenProjectVersioner,
    MvnPackage,
    MvnVersion,
    noOpImplementation,
} from "./maven";
import {
    DockerPull,
    executeReleaseDocker,
    executeReleaseTag,
    executeReleaseVersion,
} from "./release";

export function addSpringSupport(sdm: SoftwareDeliveryMachine, commonGoals: DemoSdmGoals) {
    commonGoals.autofixGoal.with(springFormat(sdm.configuration));
    commonGoals.buildGoal.with({
        ...MavenDefaultOptions,
        builder: mavenBuilder(),
    });

    versionGoal.withVersioner(MavenProjectVersioner);

    commonGoals.containerBuildGoal.with({
        imageNameCreator: DefaultDockerImageNameCreator,
        options: {
            ...sdm.configuration.sdm.docker.hub as DockerOptions,
            dockerfileFinder: async () => "Dockerfile",
        },
    })
        .withProjectListener(MvnVersion)
        .withProjectListener(MvnPackage);

    commonGoals.publishGoal.with({
        ...MavenDefaultOptions,
        name: "mvn-publish",
        goalExecutor: noOpImplementation("Publish"),
    });

    commonGoals.stagingDeployGoal.with({
        name: "staging-deployment",
        deploymentData: kubernetesDeploymentData(sdm),
        deploymentSpecCreator: kubernetesDeploymentSpecCreator(sdm),
    });

    commonGoals.productionDeployGoal.with({
        name: "production-deployment",
        deploymentData: kubernetesDeploymentData(sdm),
        deploymentSpecCreator: kubernetesDeploymentSpecCreator(sdm),
    });

    commonGoals.releaseArtifactGoal.with({
        ...MavenDefaultOptions,
        name: "mvn-release-artifact",
        goalExecutor: noOpImplementation("ReleaseArtifact"),
    });

    commonGoals.releaseDockerGoal.with({
        ...MavenDefaultOptions,
        name: "docker-release",
        goalExecutor: executeReleaseDocker(
            {
                ...sdm.configuration.sdm.docker.hub as DockerOptions,
            }),
    })
        .withProjectListener(DockerPull);

    commonGoals.releaseTagGoal.with({
        ...MavenDefaultOptions,
        name: "release-tag",
        goalExecutor: executeReleaseTag(),
    });

    commonGoals.releaseDocsGoal.with({
        ...MavenDefaultOptions,
        name: "release-docs",
        goalExecutor: noOpImplementation("ReleaseDocs"),
    });

    commonGoals.releaseVersionGoal.with({
        ...MavenDefaultOptions,
        name: "mvn-release-version",
        goalExecutor: executeReleaseVersion(MavenProjectIdentifier, asSpawnCommand("mvn build-helper:parse-version versions:set -DnewVersion=" +
            "\${parsedVersion.majorVersion}.\${parsedVersion.minorVersion}.\${parsedVersion.nextIncrementalVersion}" +
            "-\${parsedVersion.qualifier} versions:commit")),
    });

    sdm.addGeneratorCommand<SpringProjectCreationParameters>({
        name: "create-spring",
        intent: "create spring",
        description: "Create a new Java Spring Boot REST service",
        parameters: SpringProjectCreationParameterDefinitions,
        startingPoint: GitHubRepoRef.from({ owner: "atomist-playground", repo: "spring-rest-seed", branch: "master" }),
        transform: [
            ReplaceReadmeTitle,
            SetAtomistTeamInApplicationYml,
            TransformSeedToCustomProject,
        ],
    });

    sdm.addChannelLinkListener(SuggestAddingDockerfile);
    sdm.addExtensionPacks(springSupport({
        inspectGoal: commonGoals.inspectGoal,
        autofixGoal: commonGoals.autofixGoal,
        review: {
            cloudNative: true,
            springStyle: true,
        },
        autofix: {
            springStyle: true,
            cloudNative: true,
        },
        reviewListeners: isInLocalMode() ? [] : [
            singleIssuePerCategoryManaging("sdm-pack-spring"),
        ],
    }));
}
