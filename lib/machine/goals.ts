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
    AutoCodeInspection,
    Autofix,
    Cancel,
    Fingerprint,
    GoalWithFulfillment,
    ImmaterialGoals,
    isMaterialChange,
    not,
    or,
    ProductionEnvironment,
    PushImpact,
    SoftwareDeliveryMachine,
    ToDefaultBranch,
} from "@atomist/sdm";
import {
    GoalData,
    IsGitHubAction,
    Version,
} from "@atomist/sdm-core";
import {
    Build,
} from "@atomist/sdm-pack-build";
import {
    DockerBuild,
    HasDockerfile,
} from "@atomist/sdm-pack-docker";
import { KubernetesDeploy } from "@atomist/sdm-pack-k8s";
import {
    HasSpringBootApplicationClass,
    HasSpringBootPom,
    IsMaven,
} from "@atomist/sdm-pack-spring";
import { IsReleaseCommit } from "./release";

/**
 * Common goal definitions used in this SDM.
 */
export const goals = {
    autofix: new Autofix(),
    version: new Version(),
    codeInspection: new AutoCodeInspection(),
    fingerprint: new Fingerprint(),
    pushImpact: new PushImpact(),
    build: new Build(),
    dockerBuild: new DockerBuild(),
    stagingDeployment: new KubernetesDeploy({ environment: "testing" }),
    productionDeployment: new KubernetesDeploy({
        environment: "production",
        preApproval: true,
    }),
    releaseDocker: new GoalWithFulfillment({
        uniqueName: "ReleaseDocker",
        environment: ProductionEnvironment,
        orderedName: "3-release-docker",
        displayName: "release Docker image",
        workingDescription: "Releasing Docker image",
        completedDescription: "Released Docker image",
        failedDescription: "Release Docker image failure",
        isolated: true,
    }),
    releaseTag: new GoalWithFulfillment({
        uniqueName: "ReleaseTag",
        environment: ProductionEnvironment,
        orderedName: "3-release-tag",
        displayName: "create release tag",
        completedDescription: "Created release tag",
        failedDescription: "Creating release tag failure",
    }),
    releaseVersion: new GoalWithFulfillment({
        uniqueName: "ReleaseVersion",
        environment: ProductionEnvironment,
        orderedName: "3-release-version",
        displayName: "increment version",
        completedDescription: "Incremented version",
        failedDescription: "Incrementing version failure",
    }),
};

/**
 * Return goal sets and their relationships.
 */
export function goalData(sdm: SoftwareDeliveryMachine): GoalData {
    const ImmaterialChange = not(isMaterialChange({
        extensions: ["java", "html", "json", "yml", "xml", "sh", "kt", "properties"],
        files: ["Dockerfile"],
        directories: [".atomist", ".github"],
    }));

    const cancel = new Cancel({ goals: [goals.autofix, goals.build, goals.dockerBuild] });

    return {
        immaterial: {
            test: or(ImmaterialChange, IsReleaseCommit),
            goals: ImmaterialGoals.andLock(),
        },
        check: {
            test: IsMaven,
            goals: [
                [cancel, goals.autofix],
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
}
