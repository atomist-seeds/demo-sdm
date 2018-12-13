import {CommonGoals, ContainerBuildGoals, ContainerPhases, DeployGoals, DeployPhases, Phases} from "../convention/phases";
import {GoalWithFulfillment} from "@atomist/sdm";
import {DockerBuildRegistration} from "@atomist/sdm-pack-docker";
import {KubernetesDeployRegistration} from "@atomist/sdm-pack-k8/lib/support/KubernetesDeploy";
import {Version} from "@atomist/sdm-core";

export type DemoSdmGoals = CommonGoals & ContainerBuildGoals<DockerBuildRegistration> & DeployGoals<KubernetesDeployRegistration> & {
    publishGoal: GoalWithFulfillment;
    releaseArtifactGoal: GoalWithFulfillment;
    releaseDocsGoal: GoalWithFulfillment;
    releaseDockerGoal: GoalWithFulfillment;
    releaseTagGoal: GoalWithFulfillment;
    releaseVersionGoal: GoalWithFulfillment;
    versionGoal: Version;
};

export type DemoSdmPhases = Phases & ContainerPhases & DeployPhases;
