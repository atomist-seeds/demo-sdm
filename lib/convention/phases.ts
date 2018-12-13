import {FulfillableGoalWithRegistrations, Goals} from "@atomist/sdm";
import {Build} from "@atomist/sdm-pack-build";

// TODO this file will be generic and should eventually be pulled out

export interface BuildGoals {

    buildGoal: Build;
}

export interface ContainerBuildGoals<T> {

    containerBuildGoal: FulfillableGoalWithRegistrations<T>;
}

export interface DeployGoals<T> {

    stagingDeployGoal: FulfillableGoalWithRegistrations<T>;

    productionDeployGoal: FulfillableGoalWithRegistrations<T>;
}

/**
 * Well known Phases.
 */
export interface CheckPhase {

    checkGoals: Goals;

}

export interface BuildPhase {

    buildGoals: Goals;

}

export interface DeployPhase {

    stagingDeployGoals: Goals;

    productionDeployGoals: Goals;
}

export interface ContainerPhase {

    containerBuildGoals: Goals;
}
