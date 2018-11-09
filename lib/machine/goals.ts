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

// GOAL Definition

import {
    AutoCodeInspection,
    Autofix,
    Cancel,
    Fingerprint,
    goals,
    GoalWithFulfillment,
    IndependentOfEnvironment,
    ProductionEnvironment,
    PushImpact,
} from "@atomist/sdm";
import {
    Tag,
    Version,
} from "@atomist/sdm-core";
import { Build } from "@atomist/sdm-pack-build";
import { DockerBuild } from "@atomist/sdm-pack-docker";
import { KubernetesDeploy } from "@atomist/sdm-pack-k8";

export const autofix = new Autofix();
export const version = new Version();
export const codeInspection = new AutoCodeInspection();
export const fingerprint = new Fingerprint();
export const pushImpact = new PushImpact();

export const build = new Build();
export const tag = new Tag();

export const dockerBuild = new DockerBuild();

export const stagingDeployment = new KubernetesDeploy({
    environment: "testing",
});
export const productionDeployment = new KubernetesDeploy({
    environment: "production",
    preApproval: true,
});

export const publish = new GoalWithFulfillment({
    uniqueName: "Publish",
    environment: IndependentOfEnvironment,
    orderedName: "2-publish",
    displayName: "publish",
    workingDescription: "Publishing",
    completedDescription: "Published",
    failedDescription: "Published failed",
    isolated: true,
});

export const releaseArtifact = new GoalWithFulfillment({
    uniqueName: "ReleaseArtifact",
    environment: ProductionEnvironment,
    orderedName: "3-release-artifact",
    displayName: "release artifact",
    workingDescription: "Releasing artifact",
    completedDescription: "Released artifact",
    failedDescription: "Release artifact failure",
    isolated: true,
});

export const releaseDocker = new GoalWithFulfillment({
    uniqueName: "ReleaseDocker",
    environment: ProductionEnvironment,
    orderedName: "3-release-docker",
    displayName: "release Docker image",
    workingDescription: "Releasing Docker image",
    completedDescription: "Released Docker image",
    failedDescription: "Release Docker image failure",
    isolated: true,
});

export const releaseTag = new GoalWithFulfillment({
    uniqueName: "ReleaseTag",
    environment: ProductionEnvironment,
    orderedName: "3-release-tag",
    displayName: "create release tag",
    completedDescription: "Created release tag",
    failedDescription: "Creating release tag failure",
});

export const releaseDocs = new GoalWithFulfillment({
    uniqueName: "ReleaseDocs",
    environment: ProductionEnvironment,
    orderedName: "3-release-docs",
    displayName: "publish docs",
    workingDescription: "Publishing docs...",
    completedDescription: "Published docs",
    failedDescription: "Publishing docs failure",
    isolated: true,
});

export const releaseVersion = new GoalWithFulfillment({
    uniqueName: "ReleaseVersion",
    environment: ProductionEnvironment,
    orderedName: "3-release-version",
    displayName: "increment version",
    completedDescription: "Incremented version",
    failedDescription: "Incrementing version failure",
});

export const cancel = new Cancel({ goals: [autofix, build, dockerBuild, publish] });

// GOALSET Definition

// Just running review and autofix
export const checkGoals = goals("checks")
    .plan(cancel, autofix, version, fingerprint, pushImpact)
    .plan(codeInspection).after(autofix);

// Just running the build and publish
export const buildGoals = goals("build")
    .plan(build).after(autofix)
    .plan(publish).after(build);

// Build including docker build
export const dockerGoals = goals("docker build")
    .plan(dockerBuild).after(build);

// Docker build and testing and production kubernetes deploy
export const stagingDeployGoals = goals("deploy")
    .plan(stagingDeployment).after(dockerBuild);

export const productionDeployGoals = goals("prod deploy")
    .plan(productionDeployment).after(stagingDeployment)
    .plan(releaseArtifact, releaseDocker, releaseDocs, releaseTag, releaseVersion).after(productionDeployment);
