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
    Fingerprint,
    goals,
    PushImpact,
    StagingEnvironment,
} from "@atomist/sdm";
import {
    Tag,
    Version,
} from "@atomist/sdm-core";
import { Build } from "@atomist/sdm-pack-build";
import { DockerBuild } from "@atomist/sdm-pack-docker";
import { PulumiUp } from "@atomist/sdm-pack-pulumi/lib/PulumiUp";

export const autofix = new Autofix();
export const version = new Version();
export const codeInspection = new AutoCodeInspection();
export const fingerprint = new Fingerprint();
export const pushImpact = new PushImpact();

export const build = new Build();
export const tag = new Tag();

export const dockerBuild = new DockerBuild();

export const deployment = new PulumiUp({
    environment: StagingEnvironment,
});

// Just running review and autofix
export const checkGoals = goals("checks")
    .plan(autofix, fingerprint, pushImpact)
    .plan(version).after(autofix)
    .plan(codeInspection).after(autofix);

// Just running the build and publish
export const buildGoals = goals("build")
    .plan(build).after(version);

// Build including docker build
export const dockerGoals = goals("docker build")
    .plan(dockerBuild).after(build);

// Docker build and testing and production kubernetes deploy
export const deployGoals = goals("deploy")
    .plan(deployment).after(dockerBuild);
