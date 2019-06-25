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
    ExecuteGoalResult,
    formatDate,
    GoalProjectListener,
    GoalProjectListenerEvent,
    GoalProjectListenerRegistration,
    LogSuppressor,
    spawnLog,
} from "@atomist/sdm";
import {
    ProjectVersioner,
    readSdmVersion,
} from "@atomist/sdm-core";
import {
    IsMaven,
    MavenProgressReporter,
    MavenProjectIdentifier,
} from "@atomist/sdm-pack-spring";

export const MavenProjectVersioner: ProjectVersioner = async (status, p, log) => {
    const projectId = await MavenProjectIdentifier(p);
    const baseVersion = projectId.version.replace(/-.*/, "");
    const branch = status.branch.split("/").join(".");
    const branchSuffix = (branch !== status.push.repo.defaultBranch) ? `${branch}.` : "";
    return `${baseVersion}-${branchSuffix}${formatDate()}`;
};

const mvnVersionProjectListener: GoalProjectListener = async (p, gi, event): Promise<void | ExecuteGoalResult> => {
    if (event === GoalProjectListenerEvent.before) {
        const v = await readSdmVersion(
            gi.goalEvent.repo.owner,
            gi.goalEvent.repo.name,
            gi.goalEvent.repo.providerId,
            gi.goalEvent.sha,
            gi.goalEvent.branch,
            gi.context);
        return spawnLog("mvn", ["versions:set", `-DnewVersion=${v}`, "versions:commit"], { cwd: p.baseDir, log: gi.progressLog });
    }
};

export const MvnVersion: GoalProjectListenerRegistration = {
    name: "mvn-version",
    listener: mvnVersionProjectListener,
    pushTest: IsMaven,
};

const mvnPackageProjectListener: GoalProjectListener = async (p, gi, event): Promise<void | ExecuteGoalResult> => {
    if (event === GoalProjectListenerEvent.before) {
        return spawnLog("mvn", ["package", "-DskipTests=true"], { cwd: p.baseDir, log: gi.progressLog });
    }
};

export const MvnPackage: GoalProjectListenerRegistration = {
    name: "mvn-package",
    listener: mvnPackageProjectListener,
    pushTest: IsMaven,
};

export const MavenDefaultOptions = {
    pushTest: IsMaven,
    logInterpreter: LogSuppressor,
    progressReporter: MavenProgressReporter,
};
