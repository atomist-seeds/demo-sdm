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
    container,
    GoalCreator,
} from "@atomist/sdm-core";
import { SpringGoals } from "./goal";
import { autofix } from "./goals/autofix";
import { productionDeployment } from "./goals/productionDeployment";
import { stagingDeployment } from "./goals/stagingDeployment";
import { tag } from "./goals/tag";
import { version } from "./goals/version";

export const SpringGoalCreator: GoalCreator<SpringGoals> = async () => {
    const mvn = `mvn --batch-mode -Dmaven.repo.local=.m2`;
    /* tslint:disable:no-invalid-template-strings */
    const m2Classifier = "${push.repo.owner}/m2";
    const pomClassifier = "${push.repo.owner}/${push.repo.name}/${push.sha}/pom";
    const targetClassifier = "${push.repo.owner}/${push.repo.name}/${push.sha}/target";
    /* tslint:enable:no-invalid-template-strings */
    const build = container("maven", {
        containers: [
            {
                args: ["-c", `${mvn} versions:set -DnewVersion="$ATOMIST_VERSION" versions:commit && ${mvn} --show-version package`],
                command: ["bash"],
                image: "maven:3.6.3-jdk-8",
                name: "maven",
                resources: {
                    limits: {
                        cpu: "1000m",
                        memory: "2048Mi",
                    },
                    requests: {
                        cpu: "100m",
                        memory: "1024Mi",
                    },
                },
                securityContext: {
                    runAsGroup: 0,
                    runAsNonRoot: false,
                    runAsUser: 0,
                },
            },
        ],
        input: [m2Classifier],
        output: [
            {
                classifier: m2Classifier,
                pattern: { directory: ".m2" },
            },
            {
                classifier: pomClassifier,
                pattern: { globPattern: "pom.xml" },
            },
            {
                classifier: targetClassifier,
                pattern: { directory: "target" },
            },
        ],
    });
    const dockerBuild = container("kaniko", {
        containers: [
            {
                args: [
                    "--context=dir:///atm/home",
                    // tslint:disable-next-line:no-invalid-template-strings
                    "--destination=gcr.io/kubernetes-sdm-demo/${push.repo.name}:${push.after.version}",
                    "--dockerfile=Dockerfile",
                    "--cache=true",
                    "--cache-repo=gcr.io/kubernetes-sdm-demo/layer-cache",
                    "--force",
                ],
                image: "gcr.io/kaniko-project/executor:latest",
                name: "kaniko",
                resources: {
                    limits: {
                        cpu: "1000m",
                        memory: "2048Mi",
                    },
                    requests: {
                        cpu: "100m",
                        memory: "1024Mi",
                    },
                },
                securityContext: {
                    runAsGroup: 0,
                    runAsNonRoot: false,
                    runAsUser: 0,
                },
            },
        ],
        input: [pomClassifier, targetClassifier],
    });

    return {
        autofix,
        version,
        tag,
        build,
        dockerBuild,
        stagingDeployment,
        productionDeployment,
    };
};
