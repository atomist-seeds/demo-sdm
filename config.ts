/*
 * Copyright © 2020 Atomist, Inc.
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

import { Configuration } from "@atomist/automation-client/lib/configuration";
import { runningInK8s } from "@atomist/sdm/lib/core/goal/container/util";
import { gcpSupport } from "@atomist/sdm/lib/core/pack/gcp";
import { githubGoalStatusSupport } from "@atomist/sdm/lib/core/pack/github-goal-status/github";
import { goalStateSupport } from "@atomist/sdm/lib/core/pack/goal-state/goalState";
import { k8sSupport } from "@atomist/sdm/lib/core/pack/k8s/k8s";
import { k8sGoalSchedulingSupport } from "@atomist/sdm/lib/core/pack/k8s/scheduler/goalScheduling";
import * as _ from "lodash";

export const DemoSupport = async (cfg: Configuration) => {
    if (runningInK8s()) {
        const defaultCfg = {
            cluster: {
                workers: 2,
            },
            sdm: {
                cache: {
                    bucket: "atomist-demo-0-cache",
                    path: "demo-sdm-cache",
                },
                extensionPacks: [
                    gcpSupport(),
                    githubGoalStatusSupport(),
                    goalStateSupport({
                        cancellation: {
                            enabled: true,
                        },
                    }),
                    k8sGoalSchedulingSupport(),
                    k8sSupport({ addCommands: true }),
                ],
                k8s: {
                    job: {
                        cleanupInterval: 1000 * 60 * 10,
                    },
                },
            },
        };
        return _.defaultsDeep(cfg, defaultCfg);
    } else {
        const defaultCfg = {
            sdm: {
                cache: {
                    path: "/tmp/cache",
                },
            },
        };
        return _.defaultsDeep(cfg, defaultCfg);
    }
};
