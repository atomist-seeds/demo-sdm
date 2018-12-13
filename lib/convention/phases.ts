import {FulfillableGoalWithRegistrations, Goals, WellKnownGoals} from "@atomist/sdm";
import {Build} from "@atomist/sdm-pack-build";

// TODO this file will be generic and should eventually be pulled out

/**
 * Extend WellKnownGoals to structure common goals
 */
export interface CommonGoals extends WellKnownGoals {

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
export interface Phases {

    checkGoals: Goals;

    buildGoals: Goals;

}

export interface DeployPhases {

    stagingDeployGoals: Goals;

    productionDeployGoals: Goals;
}

export interface ContainerPhases {

    containerBuildGoals: Goals;
}
