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
    AutoCodeInspection,
    Autofix,
    Cancel,
    execPromise,
    Fingerprint,
    githubTeamVoter,
    goals,
    GoalWithFulfillment,
    ImmaterialGoals,
    IndependentOfEnvironment,
    isMaterialChange,
    not,
    ProductionEnvironment,
    PushImpact,
    ToDefaultBranch,
} from "@atomist/sdm";
import {
    configure,
    ConfigureOptions,
    githubGoalStatusSupport,
    goalStateSupport,
    isGitHubAction,
    k8sGoalSchedulingSupport,
    Tag,
    Version,
} from "@atomist/sdm-core";
import {
    Build,
    buildAwareCodeTransforms,
} from "@atomist/sdm-pack-build";
import { DockerBuild } from "@atomist/sdm-pack-docker";
import { issueSupport } from "@atomist/sdm-pack-issue";
import {
    k8sSupport,
    KubernetesDeploy,
} from "@atomist/sdm-pack-k8s";
import {
    HasSpringBootApplicationClass,
    HasSpringBootPom,
    IsMaven,
} from "@atomist/sdm-pack-spring";
import * as appRoot from "app-root-path";
import * as _ from "lodash";
import * as path from "path";
import { AddDockerfile } from "./lib/commands/addDockerfile";
import { addSpringSupport } from "./lib/machine/springSupport";

export const configuration = configure(async sdm => {
    // Goals
    const autofix = new Autofix();
    const version = new Version();
    const codeInspection = new AutoCodeInspection();
    const fingerprint = new Fingerprint();
    const pushImpact = new PushImpact();
    const build = new Build();
    const tag = new Tag();
    const dockerBuild = new DockerBuild();
    const stagingDeployment = new KubernetesDeploy({ environment: "testing" });
    const productionDeployment = new KubernetesDeploy({
        environment: "production",
        preApproval: true,
    });
    const publish = new GoalWithFulfillment({
        uniqueName: "Publish",
        environment: IndependentOfEnvironment,
        orderedName: "2-publish",
        displayName: "publish",
        workingDescription: "Publishing",
        completedDescription: "Published",
        failedDescription: "Published failed",
        isolated: true,
    });
    const releaseArtifact = new GoalWithFulfillment({
        uniqueName: "ReleaseArtifact",
        environment: ProductionEnvironment,
        orderedName: "3-release-artifact",
        displayName: "release artifact",
        workingDescription: "Releasing artifact",
        completedDescription: "Released artifact",
        failedDescription: "Release artifact failure",
        isolated: true,
    });
    const releaseDocker = new GoalWithFulfillment({
        uniqueName: "ReleaseDocker",
        environment: ProductionEnvironment,
        orderedName: "3-release-docker",
        displayName: "release Docker image",
        workingDescription: "Releasing Docker image",
        completedDescription: "Released Docker image",
        failedDescription: "Release Docker image failure",
        isolated: true,
    });
    const releaseTag = new GoalWithFulfillment({
        uniqueName: "ReleaseTag",
        environment: ProductionEnvironment,
        orderedName: "3-release-tag",
        displayName: "create release tag",
        completedDescription: "Created release tag",
        failedDescription: "Creating release tag failure",
    });
    const releaseDocs = new GoalWithFulfillment({
        uniqueName: "ReleaseDocs",
        environment: ProductionEnvironment,
        orderedName: "3-release-docs",
        displayName: "publish docs",
        workingDescription: "Publishing docs",
        completedDescription: "Published docs",
        failedDescription: "Publishing docs failure",
        isolated: true,
    });
    const releaseVersion = new GoalWithFulfillment({
        uniqueName: "ReleaseVersion",
        environment: ProductionEnvironment,
        orderedName: "3-release-version",
        displayName: "increment version",
        completedDescription: "Incremented version",
        failedDescription: "Incrementing version failure",
    });
    const cancel = new Cancel({ goals: [autofix, build, dockerBuild, publish] });

    // Goal sets
    // Just running review and autofix
    const checkGoals = goals("checks")
        .plan(cancel, autofix, version, fingerprint, pushImpact)
        .plan(codeInspection).after(autofix);
    // Just running the build and publish
    const buildGoals = goals("build")
        .plan(build).after(autofix)
        .plan(publish).after(build);
    // Build including docker build
    const dockerGoals = goals("docker build")
        .plan(dockerBuild).after(build);
    // Docker build and testing and production kubernetes deploy
    const stagingDeployGoals = goals("deploy")
        .plan(stagingDeployment).after(dockerBuild);
    const productionDeployGoals = goals("prod deploy")
        .plan(productionDeployment).after(stagingDeployment)
        .plan(releaseArtifact, releaseDocker, releaseDocs, releaseTag, releaseVersion).after(productionDeployment);

    sdm.addCodeTransformCommand(AddDockerfile);
    addSpringSupport(sdm);
    sdm.addGoalApprovalRequestVoter(githubTeamVoter());
    sdm.addExtensionPacks(
        buildAwareCodeTransforms({
            buildGoal: build,
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
}, {
        name: "demo-sdm",
        postProcessors: [
            async config => {
                _.merge(config, {
                    sdm: {
                        spring: {
                            formatJar: path.join(appRoot.path, "bin", "spring-format-0.1.0-SNAPSHOT-jar-with-dependencies.jar"),
                        },
                        build: {
                            tag: false,
                        },
                        cache: {
                            enabled: true,
                            path: "/opt/data",
                        },
                    },
                });
                return config;
            },
            async config => {
                if (isGitHubAction()) {
                    config.environment = "gke-int-demo";
                    config.apiKey = "${ATOMIST_API_KEY}";
                    config.token = "${ATOMIST_GITHUB_TOKEN}";
                    config.sdm = {
                        ...config.sdm,
                        docker: {
                            hub: {
                                registry: "atomist",
                                user: "${DOCKER_USER}",
                                password: "${DOCKER_PASSWORD}",
                            },
                        },
                    };
                    await execPromise("git", ["config", "--global", "user.email", "\"bot@atomist.com\""]);
                    await execPromise("git", ["config", "--global", "user.name", "\"Atomist Bot\""]);
                }
                return config;
            },
        ],
        requiredConfigurationValues: [
            "sdm.docker.hub.registry",
            "sdm.docker.hub.user",
            "sdm.docker.hub.password",
        ],
    });
