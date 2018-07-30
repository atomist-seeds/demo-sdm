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

import { GitHubRepoRef } from "@atomist/automation-client/operations/common/GitHubRepoRef";
import { GitProject } from "@atomist/automation-client/project/git/GitProject";
import {
    allSatisfied,
    ExecuteGoal,
    ExecuteGoalResult,
    GoalInvocation,
    hasFile,
    SoftwareDeliveryMachine,
} from "@atomist/sdm";
import {
    DefaultDockerImageNameCreator,
    DockerBuildGoal,
    DockerOptions,
    executeDockerBuild,
    executeVersioner,
    tagRepo,
    VersionGoal,
} from "@atomist/sdm-core";
import {
    ProjectVersioner,
    readSdmVersion,
} from "@atomist/sdm-core/internal/delivery/build/local/projectVersioner";
import {
    IsMaven,
    MavenBuilder,
    MavenProjectIdentifier,
    springBootGenerator,
    springBootTagger,
} from "@atomist/sdm-pack-spring";
import { CommonJavaGeneratorConfig } from "@atomist/sdm-pack-spring/dist";
import * as build from "@atomist/sdm/api-helper/dsl/buildDsl";
import { DelimitedWriteProgressLogDecorator } from "@atomist/sdm/api-helper/log/DelimitedWriteProgressLogDecorator";
import { createEphemeralProgressLog } from "@atomist/sdm/api-helper/log/EphemeralProgressLog";
import { spawnAndWatch } from "@atomist/sdm/api-helper/misc/spawned";
import * as df from "dateformat";
import { SuggestAddingDockerfile } from "../commands/addDockerfile";
import {
    PublishGoal,
    ReleaseArtifactGoal,
    ReleaseDockerGoal,
    ReleaseDocsGoal,
    ReleaseTagGoal,
    ReleaseVersionGoal,
} from "./goals";
import {
    DockerReleasePreparations,
    executeReleaseDocker,
    executeReleaseTag,
    executeReleaseVersion,
} from "./release";

const MavenProjectVersioner: ProjectVersioner = async (status, p, log) => {
    const projectId = await MavenProjectIdentifier(p);
    const baseVersion = projectId.version.replace(/-.*/, "");
    const branch = status.branch.split("/").join(".");
    const branchSuffix = (branch !== status.push.repo.defaultBranch) ? `${branch}.` : "";
    const version = `${baseVersion}-${branchSuffix}${df(new Date(), "yyyymmddHHMMss")}`;
    return version;
};

async function mvnVersionPreparation(p: GitProject, gi: GoalInvocation): Promise<ExecuteGoalResult> {
    const version = await readSdmVersion(
        gi.sdmGoal.repo.owner,
        gi.sdmGoal.repo.name,
        gi.sdmGoal.repo.providerId,
        gi.sdmGoal.sha,
        gi.sdmGoal.branch,
        gi.context);
    return spawnAndWatch({
        command: "mvn", args: ["versions:set", `-DnewVersion=${version}`, "versions:commit"],
    }, { cwd: p.baseDir }, gi.progressLog);
}

async function mvnPackagePreparation(p: GitProject, gi: GoalInvocation): Promise<ExecuteGoalResult> {
    return spawnAndWatch({
        command: "mvn", args: ["package", "-DskipTests=true"],
    }, { cwd: p.baseDir }, gi.progressLog);
}

const MavenPreparations = [mvnVersionPreparation, mvnPackagePreparation];

function noOpImplementation(action: string): ExecuteGoal {
    return async (gi: GoalInvocation): Promise<ExecuteGoalResult> => {
        const log = new DelimitedWriteProgressLogDecorator(gi.progressLog, "\n");
        const message = `${action} requires no implementation`;
        log.write(message);
        await log.flush();
        await log.close();
        return Promise.resolve({ code: 0, message });
    };
}

export function addSpringSupport(sdm: SoftwareDeliveryMachine) {

    sdm.addBuildRules(
        build.when(IsMaven)
            .itMeans("mvn package")
            .set(new MavenBuilder(sdm, false)));

    sdm.addGoalImplementation("mvnVersioner", VersionGoal,
        executeVersioner(sdm.configuration.sdm.projectLoader, MavenProjectVersioner), { pushTest: IsMaven })
        .addGoalImplementation("mvnDockerBuild", DockerBuildGoal,
            executeDockerBuild(
                sdm.configuration.sdm.projectLoader,
                DefaultDockerImageNameCreator,
                MavenPreparations,
                {
                    ...sdm.configuration.sdm.docker.hub as DockerOptions,
                    dockerfileFinder: async () => "Dockerfile",
                }), { pushTest: IsMaven })
        .addGoalImplementation("mvnPublish", PublishGoal,
            noOpImplementation("Publish"), { pushTest: IsMaven })
        .addGoalImplementation("mvnArtifactRelease", ReleaseArtifactGoal,
            noOpImplementation("ReleaseArtifact"),
            { pushTest: IsMaven })
        .addGoalImplementation("mvnDockerRelease", ReleaseDockerGoal,
            executeReleaseDocker(
                sdm.configuration.sdm.projectLoader,
                DockerReleasePreparations,
                {
                    ...sdm.configuration.sdm.docker.hub as DockerOptions,
                }), { pushTest: allSatisfied(IsMaven, hasFile("Dockerfile")) })
        .addGoalImplementation("tagRelease", ReleaseTagGoal,
             executeReleaseTag(sdm.configuration.sdm.projectLoader))
        .addGoalImplementation("mvnDocsRelease", ReleaseDocsGoal,
            noOpImplementation("ReleaseDocs"), { pushTest: IsMaven })
        .addGoalImplementation("mvnVersionRelease", ReleaseVersionGoal,
            executeReleaseVersion(sdm.configuration.sdm.projectLoader, MavenProjectIdentifier), { pushTest: IsMaven });

    sdm.addGeneratorCommand(springBootGenerator({
                ...CommonJavaGeneratorConfig,
                seed: () => new GitHubRepoRef("atomist-playground", "spring-rest-seed"),
                groupId: "atomist",
            }, {
                intent: "create spring",
            }))
        .addNewRepoWithCodeListener(tagRepo(springBootTagger))
        .addChannelLinkListener(SuggestAddingDockerfile);

}
