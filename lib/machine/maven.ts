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

import {
    GitProject,
    spawnAndWatch,
} from "@atomist/automation-client";
import {
    DelimitedWriteProgressLogDecorator,
    ExecuteGoal,
    ExecuteGoalResult,
    GoalInvocation,
    GoalProjectListenerEvent,
    GoalProjectListenerRegistration,
    LogSuppressor,
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
import * as df from "dateformat";

export const MavenProjectVersioner: ProjectVersioner = async (status, p, log) => {
    const projectId = await MavenProjectIdentifier(p);
    const baseVersion = projectId.version.replace(/-.*/, "");
    const branch = status.branch.split("/").join(".");
    const branchSuffix = (branch !== status.push.repo.defaultBranch) ? `${branch}.` : "";
    return `${baseVersion}-${branchSuffix}${df(new Date(), "yyyymmddHHMMss")}`;
};

export async function mvnVersionProjectListener(p: GitProject,
                                                gi: GoalInvocation,
                                                event: GoalProjectListenerEvent): Promise<void | ExecuteGoalResult> {
    if (event === GoalProjectListenerEvent.before) {
        const v = await readSdmVersion(
            gi.sdmGoal.repo.owner,
            gi.sdmGoal.repo.name,
            gi.sdmGoal.repo.providerId,
            gi.sdmGoal.sha,
            gi.sdmGoal.branch,
            gi.context);
        return spawnAndWatch({
            command: "mvn", args: ["versions:set", `-DnewVersion=${v}`, "versions:commit"],
        }, { cwd: p.baseDir }, gi.progressLog);
    }
}

export const MvnVersion: GoalProjectListenerRegistration = {
    name: "mvn-version",
    listener: mvnVersionProjectListener,
    pushTest: IsMaven,
};

async function mvnPackageProjectListener(p: GitProject,
                                         gi: GoalInvocation,
                                         event: GoalProjectListenerEvent): Promise<void | ExecuteGoalResult> {
    if (event === GoalProjectListenerEvent.before) {
        return spawnAndWatch({
            command: "mvn", args: ["package", "-DskipTests=true"],
        }, { cwd: p.baseDir }, gi.progressLog);
    }
}

export const MvnPackage: GoalProjectListenerRegistration = {
    name: "mvn-package",
    listener: mvnPackageProjectListener,
    pushTest: IsMaven,
};

export function noOpImplementation(action: string): ExecuteGoal {
    return async (gi: GoalInvocation): Promise<ExecuteGoalResult> => {
        const log = new DelimitedWriteProgressLogDecorator(gi.progressLog, "\n");
        const message = `${action} requires no implementation`;
        log.write(message);
        await log.flush();
        await log.close();
        return Promise.resolve({ code: 0, message });
    };
}

export const MavenDefaultOptions = {
    pushTest: IsMaven,
    logInterpreter: LogSuppressor,
    progressReporter: MavenProgressReporter,
};
