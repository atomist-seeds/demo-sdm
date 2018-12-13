import {Goals, WellKnownGoals} from "@atomist/sdm";
import {Build} from "@atomist/sdm-pack-build";

/**
 * Extend WellKnownGoals to structure common goals
 */
export interface CommonGoals extends WellKnownGoals {

    buildGoal: Build;
}

/**
 * Well known Phases.
 */
export interface Phases {

    checkGoals: Goals;

    buildGoals: Goals;

}
