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
    formatDate,
} from "@atomist/sdm";
import {
    GoalConfigurer,
    ProjectVersioner,
} from "@atomist/sdm-core";
import { springFormat } from "@atomist/sdm-pack-spring";
import { SpringGoals } from "./goal";
import { kubernetesApplicationData } from "./k8sSupport";

export const SpringGoalConfigurer: GoalConfigurer<SpringGoals> = async (sdm, goals) => {

    goals.autofix.with(springFormat(sdm.configuration));
    goals.version.withVersioner(MavenProjectVersioner);

    goals.stagingDeployment.with({ applicationData: kubernetesApplicationData });
    goals.productionDeployment.with({ applicationData: kubernetesApplicationData });

};

const MavenProjectVersioner: ProjectVersioner = async (status, p, log) => {
    // mvn --batch-mode -Dmaven.repo.local=.m2 help:evaluate -Dexpression=project.version -q -DforceStdout
    // mvn not available in SDM container
    let version = "0.0.0";
    try {
        const pomFile = await p.findFile("pom.xml");
        const pomContent = await pomFile.getContent();
        const matches = pomContent.match(/<version>(\d+\.\d+\.\d+)-SNAPSHOT<\/version>/);
        if (!matches || matches.length < 2) {
            throw new Error(`Failed to find version in pom.xml`);
        }
        version = matches[1];
    } catch (e) {
        log.write(`Failed to version project: ${e.message}`);
    }
    const baseVersion = version.replace(/-.*/, "");
    const branch = status.branch.split("/").join("-");
    const branchSuffix = (branch !== status.push.repo.defaultBranch) ? `${branch}.` : "";
    const safeBranchSuffix = branchSuffix.replace(/[^-A-Za-z0-9]/g, "");
    return `${baseVersion}-${safeBranchSuffix}${formatDate()}`;
};
