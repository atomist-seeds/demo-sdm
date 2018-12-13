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
import { Version } from "@atomist/sdm-core";
import { Build } from "@atomist/sdm-pack-build";
import { DockerBuild } from "@atomist/sdm-pack-docker";
import { KubernetesDeploy } from "@atomist/sdm-pack-k8";
import {
    DemoSdmGoals,
    DemoSdmPhases,
} from "./goalsAndPhases";

const autofixGoal = new Autofix();
const versionGoal = new Version();
const inspectGoal = new AutoCodeInspection();
const fingerprintGoal = new Fingerprint();
const pushImpactGoal = new PushImpact();

const buildGoal = new Build();

const containerBuildGoal = new DockerBuild();

const stagingDeployGoal = new KubernetesDeploy({
    environment: "testing",
});
const productionDeployGoal = new KubernetesDeploy({
    environment: "production",
    preApproval: true,
});

const publishGoal = new GoalWithFulfillment({
    uniqueName: "Publish",
    environment: IndependentOfEnvironment,
    orderedName: "2-publish",
    displayName: "publish",
    workingDescription: "Publishing",
    completedDescription: "Published",
    failedDescription: "Published failed",
    isolated: true,
});

const releaseArtifactGoal = new GoalWithFulfillment({
    uniqueName: "ReleaseArtifact",
    environment: ProductionEnvironment,
    orderedName: "3-release-artifact",
    displayName: "release artifact",
    workingDescription: "Releasing artifact",
    completedDescription: "Released artifact",
    failedDescription: "Release artifact failure",
    isolated: true,
});

const releaseDockerGoal = new GoalWithFulfillment({
    uniqueName: "ReleaseDocker",
    environment: ProductionEnvironment,
    orderedName: "3-release-docker",
    displayName: "release Docker image",
    workingDescription: "Releasing Docker image",
    completedDescription: "Released Docker image",
    failedDescription: "Release Docker image failure",
    isolated: true,
});

const releaseTagGoal = new GoalWithFulfillment({
    uniqueName: "ReleaseTag",
    environment: ProductionEnvironment,
    orderedName: "3-release-tag",
    displayName: "create release tag",
    completedDescription: "Created release tag",
    failedDescription: "Creating release tag failure",
});

const releaseDocsGoal = new GoalWithFulfillment({
    uniqueName: "ReleaseDocs",
    environment: ProductionEnvironment,
    orderedName: "3-release-docs",
    displayName: "publish docs",
    workingDescription: "Publishing docs...",
    completedDescription: "Published docs",
    failedDescription: "Publishing docs failure",
    isolated: true,
});

const releaseVersionGoal = new GoalWithFulfillment({
    uniqueName: "ReleaseVersion",
    environment: ProductionEnvironment,
    orderedName: "3-release-version",
    displayName: "increment version",
    completedDescription: "Incremented version",
    failedDescription: "Incrementing version failure",
});

const cancelGoal = new Cancel({ goals: [autofixGoal, buildGoal, containerBuildGoal, publishGoal] });

export const sdmGoals: DemoSdmGoals = {
    inspectGoal,
    fingerprintGoal,
    autofixGoal,
    pushImpactGoal,
    buildGoal,
    publishGoal,
    containerBuildGoal,
    stagingDeployGoal,
    productionDeployGoal,
    releaseArtifactGoal,
    releaseDocsGoal,
    releaseDockerGoal,
    releaseTagGoal,
    releaseVersionGoal,
    versionGoal,
};

// Just running review and autofix
const checkGoals = goals("checks")
    .plan(cancelGoal, autofixGoal, versionGoal, fingerprintGoal, pushImpactGoal)
    .plan(inspectGoal).after(autofixGoal);

// Just running the build and publish
const buildGoals = goals("build")
    .plan(buildGoal).after(autofixGoal)
    .plan(publishGoal).after(buildGoal);

// Build including docker build
const containerBuildGoals = goals("docker build")
    .plan(containerBuildGoal).after(buildGoal);

// Docker build and testing and production kubernetes deploy
const stagingDeployGoals = goals("deploy")
    .plan(stagingDeployGoal).after(containerBuildGoal);

const productionDeployGoals = goals("prod deploy")
    .plan(productionDeployGoal).after(stagingDeployGoal)
    .plan(releaseArtifactGoal, releaseDockerGoal, releaseDocsGoal, releaseTagGoal, releaseVersionGoal)
    .after(productionDeployGoal);

export const sdmPhases: DemoSdmPhases = {
    checkGoals,
    buildGoals,
    containerBuildGoals,
    stagingDeployGoals,
    productionDeployGoals,
};
