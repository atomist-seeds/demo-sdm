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

import {
    GitProject,
    logger,
} from "@atomist/automation-client";
import {
    ProductionEnvironment,
    SdmGoalEvent,
    StagingEnvironment,
} from "@atomist/sdm";
import {
    KubernetesApplication,
    KubernetesDeploy,
} from "@atomist/sdm-pack-k8s";
import * as _ from "lodash";

/**
 * Augment default Kubernetes application with Spring demo specific
 * values.
 */
export async function kubernetesApplicationData(
    app: KubernetesApplication,
    p: GitProject,
    goal: KubernetesDeploy,
    goalEvent: SdmGoalEvent,
): Promise<KubernetesApplication> {

    const name = goalEvent.repo.name;
    const ns = namespaceFromGoal(goalEvent);
    const port = 8080;
    const replicas = (ns === "production") ? 3 : 1;
    const ingress = ingressFromGoal(goalEvent.repo.name, ns);
    const deploymentSpecPatch = {
        spec: {
            template: {
                spec: {
                    containers: [
                        {
                            env: [
                                {
                                    name: "ATOMIST_WORKSPACE",
                                    value: goal.sdm.configuration.workspaceIds[0],
                                },
                                {
                                    name: "ATOMIST_ENVIRONMENT",
                                    value: `${goal.sdm.configuration.environment}:${ns}`,
                                },
                            ],
                        },
                    ],
                },
            },
        },
    };
    app.deploymentSpec = _.merge({}, deploymentSpecPatch, app.deploymentSpec);
    return {
        ...app,
        name,
        ns,
        port,
        replicas,
        ...ingress,
    };
}

/**
 * Provide Kubernetes application ingress-related properties.
 */
export function ingressFromGoal(repo: string, ns: string): Partial<KubernetesApplication> {
    const path = `/${repo}/`;
    const host = `play-${(ns === "testing") ? "t" : "p"}.sdm.io`;
    const protocol = "https";
    const tlsSecret = `play-${ns.substring(0, 4)}-sdm-io-tls`;
    const ingressSpec = {
        metadata: {
            annotations: {
                "kubernetes.io/ingress.class": "nginx",
                "nginx.ingress.kubernetes.io/client-body-buffer-size": "1m",
                "nginx.ingress.kubernetes.io/rewrite-target": "/$1",
            },
        },
        spec: {
            rules: [
                {
                    http: {
                        paths: [
                            {
                                path: `/${repo}/?(.*)`,
                            },
                        ],
                    },
                },
            ],
        },
    };

    return {
        host,
        path,
        tlsSecret,
        protocol,
        ingressSpec,
    };
}

/**
 * Determine Kubernetes application namespace from SDM goal event
 * environment.
 */
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
