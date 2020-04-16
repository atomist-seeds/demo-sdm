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

import { GitProject } from "@atomist/automation-client/lib/project/git/GitProject";
import { logger } from "@atomist/automation-client/lib/util/logger";
import { SdmGoalEvent } from "@atomist/sdm/lib/api/goal/SdmGoalEvent";
import {
    ProductionEnvironment,
    StagingEnvironment,
} from "@atomist/sdm/lib/api/goal/support/environment";
import { GoalMaker } from "@atomist/sdm/lib/core/machine/yaml/mapGoals";
import { KubernetesDeploy } from "@atomist/sdm/lib/core/pack/k8s/deploy/goal";
import { KubernetesApplication } from "@atomist/sdm/lib/core/pack/k8s/kubernetes/request";
import * as _ from "lodash";

const k8sDeployRegistration = {
    name: "@atomist/k8s",
    applicationData: kubernetesApplicationData,
};

export const stagingDeployment: GoalMaker = async () =>
    new KubernetesDeploy({ displayName: "staging deployment", environment: "testing" })
        .with(k8sDeployRegistration);
export const productionDeployment: GoalMaker = async () =>
    new KubernetesDeploy({ displayName: "production deployment", environment: "production", preApproval: true })
        .with(k8sDeployRegistration);

/**
 * Augment default Kubernetes application with Spring demo specific
 * values.
 */
async function kubernetesApplicationData(
    app: KubernetesApplication,
    p: GitProject,
    goal: KubernetesDeploy,
    goalEvent: SdmGoalEvent,
): Promise<KubernetesApplication> {

    if (!goal.sdm.configuration.workspaceIds || goal.sdm.configuration.workspaceIds.length < 1) {
        throw new Error("KuberneteDeploy goal SDM configuration contains no workspace IDs");
    }

    const name = goalEvent.repo.name;
    const ns = namespaceFromGoal(goalEvent);
    const port = 8080;
    const replicas = 1;
    const ingress = ingressFromGoal(goalEvent.repo.name, ns);
    const deploymentSpecPatch = {
        spec: {
            replicas,
            template: {
                spec: {
                    affinity: {
                        nodeAffinity: {
                            requiredDuringSchedulingIgnoredDuringExecution: {
                                nodeSelectorTerms: [
                                    {
                                        matchExpressions: [
                                            {
                                                key: "sandbox.gke.io/runtime",
                                                operator: "In",
                                                values: ["gvisor"],
                                            },
                                        ],
                                    },
                                ],
                            },
                        },
                    },
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
                    runtimeClassName: "gvisor",
                    tolerations: [
                        {
                            effect: "NoSchedule",
                            key: "sandbox.gke.io/runtime",
                            operator: "Equal",
                            value: "gvisor",
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
        ...ingress,
    };
}

/**
 * Provide Kubernetes application ingress-related properties.
 */
function ingressFromGoal(repo: string, ns: string): Partial<KubernetesApplication> {
    const path = `/${repo}/`;
    const host = `play-${(ns === "testing") ? "t" : "p"}.uhura.io`;
    const tlsSecret = `play-${ns.substring(0, 4)}-uhura-io-tls`;
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
                    host,
                    http: {
                        paths: [
                            {
                                path: `/${repo}/?(.*)`,
                            },
                        ],
                    },
                },
            ],
            tls: [
                {
                    hosts: [host],
                    secretName: tlsSecret,
                },
            ],
        },
    };

    return {
        path,
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
