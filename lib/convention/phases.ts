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
    FulfillableGoalWithRegistrations,
    Goals,
} from "@atomist/sdm";
import { Build } from "@atomist/sdm-pack-build";

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
