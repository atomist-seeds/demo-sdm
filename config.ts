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

import { Configuration } from "@atomist/automation-client";
import {
    ExtensionPack,
    metadata,
} from "@atomist/sdm";
import {
    githubGoalStatusSupport,
    goalStateSupport,
    // k8sGoalSchedulingSupport,
} from "@atomist/sdm-core";
import { runningInK8s } from "@atomist/sdm-core/lib/goal/container/util";
import { KubernetesFulfillmentGoalScheduler } from "@atomist/sdm-core/lib/pack/k8s/KubernetesFulfillmentGoalScheduler";
import { KubernetesJobDeletingGoalCompletionListenerFactory } from "@atomist/sdm-core/lib/pack/k8s/KubernetesJobDeletingGoalCompletionListener";
import { gcpSupport } from "@atomist/sdm-pack-gcp";
import { k8sSupport } from "@atomist/sdm-pack-k8s";
import * as _ from "lodash";

export const DemoSupport = async (cfg: Configuration) => {
    if (runningInK8s()) {
        const defaultCfg = {
            sdm: {
                k8s: {
                    job: {
                        cleanupInterval: 1000 * 60 * 10,
                    },
                },
                cache: {
                    bucket: "atm-demo-sdm-goal-cache-demo",
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
                    // k8sGoalSchedulingSupport(),
                    k8sGoalFulfillingSchedulingSupport(),
                    k8sSupport({ addCommands: true }),
                ],
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

function k8sGoalFulfillingSchedulingSupport(): ExtensionPack {
    return {
        ...metadata("k8s-goal-fulfilling-scheduling"),
        configure: sdm => {
            sdm.configuration.sdm.goalScheduler = [new KubernetesFulfillmentGoalScheduler()];
            sdm.addGoalCompletionListener(new KubernetesJobDeletingGoalCompletionListenerFactory(sdm).create());
        },
    };
}
