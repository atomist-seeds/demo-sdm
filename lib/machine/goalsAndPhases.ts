import {GoalWithFulfillment, WellKnownGoals} from "@atomist/sdm";
import {Version} from "@atomist/sdm-core";
import {DockerBuildRegistration} from "@atomist/sdm-pack-docker";
import {KubernetesDeployRegistration} from "@atomist/sdm-pack-k8/lib/support/KubernetesDeploy";
import {BuildGoals, BuildPhase, CheckPhase, ContainerBuildGoals, ContainerPhase, DeployGoals, DeployPhase} from "../convention/phases";

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
