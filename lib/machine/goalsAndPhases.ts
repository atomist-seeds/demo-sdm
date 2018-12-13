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
    GoalWithFulfillment,
    WellKnownGoals,
} from "@atomist/sdm";
import { Version } from "@atomist/sdm-core";
import { DockerBuildRegistration } from "@atomist/sdm-pack-docker";
import { KubernetesDeployRegistration } from "@atomist/sdm-pack-k8/lib/support/KubernetesDeploy";
import {
    BuildGoals,
    BuildPhase,
    CheckPhase,
    ContainerBuildGoals,
    ContainerPhase,
    DeployGoals,
    DeployPhase,
} from "../convention/phases";

/**
 * Goals for this SDM
 */
export type DemoSdmGoals = WellKnownGoals & BuildGoals & ContainerBuildGoals<DockerBuildRegistration> & DeployGoals<KubernetesDeployRegistration> & {
    publishGoal: GoalWithFulfillment;
    releaseArtifactGoal: GoalWithFulfillment;
    releaseDocsGoal: GoalWithFulfillment;
    releaseDockerGoal: GoalWithFulfillment;
    releaseTagGoal: GoalWithFulfillment;
    releaseVersionGoal: GoalWithFulfillment;
    versionGoal: Version;
};

export type DemoSdmPhases = CheckPhase & BuildPhase & ContainerPhase & DeployPhase;
