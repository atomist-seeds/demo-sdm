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

import { logger } from "@atomist/automation-client";
import {
    ProductionEnvironment,
    RepoContext,
    SdmGoalEvent,
    SoftwareDeliveryMachine,
    StagingEnvironment,
} from "@atomist/sdm";
import {
    k8,
    KubernetesApplicationOptions,
} from "@atomist/sdm-pack-k8";
import * as _ from "lodash";

export function kubernetesDeploymentData(sdm: SoftwareDeliveryMachine) {
    return async (goal: SdmGoalEvent, context: RepoContext): Promise<KubernetesApplicationOptions> => {
        return sdm.configuration.sdm.projectLoader.doWithProject({
            credentials: context.credentials,
            id: context.id,
            readOnly: true,
        }, async p => {
            const ns = namespaceFromGoal(goal);
            const ingress = ingressFromGoal(goal.repo.name, ns);
            return {
                name: goal.repo.name,
                port: 8080,
                environment: sdm.configuration.environment.split("_")[0],
                ns,
                replicas: ns === "production" ? 3 : 1,
                ...ingress,
            } as any;
        });
    };
}

export function kubernetesDeploymentSpecCreator(sdm: SoftwareDeliveryMachine) {
    return async (deploymentSpec: k8.Deployment, goal: SdmGoalEvent, context: RepoContext): Promise<k8.Deployment> => {
        const deploymentSpecPatch = {
            spec: {
                template: {
                    spec: {
                        containers: [{
                            env: [{
                                name: "ATOMIST_WORKSPACE",
                                value: sdm.configuration.workspaceIds[0],
                            }, {
                                name: "ATOMIST_ENVIRONMENT",
                                value: `${sdm.configuration.environment}:${namespaceFromGoal(goal)}`,
                            }],
                        }],
                    },
                },
            },
        };
        return _.merge(deploymentSpec, deploymentSpecPatch);
    };
}

export function ingressFromGoal(repo: string, ns: string): Partial<KubernetesApplicationOptions> {
    const path = `/${repo}`;
    const host = `play.atomist.${(ns === "testing") ? "io" : "com"}`;
    const protocol = "https";
    const tlsSecret = host.replace(/\./g, "-").replace("play", "star");

    return {
        host,
        path,
        tlsSecret,
        protocol,
    };
}

function namespaceFromGoal(goal: SdmGoalEvent): string {
    if (goal.environment === StagingEnvironment.replace(/\/$/, "")) {
        return "testing";
    } else if (goal.environment === ProductionEnvironment.replace(/\/$/, "")) {
        return "production";
    } else {
        logger.debug(`Unmatched goal.environment using default namespace: ${goal.environment}`);
        return "default";
    }
}
