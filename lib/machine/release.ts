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

// tslint:disable:max-file-line-count

import {
    ChildProcessResult,
    configurationValue,
    GitCommandGitProject,
    GitHubRepoRef,
    GitProject,
    logger,
    RemoteRepoRef,
    SpawnCommand,
    Success,
    TokenCredentials,
} from "@atomist/automation-client";
import {
    DelimitedWriteProgressLogDecorator,
    ExecuteGoal,
    ExecuteGoalResult,
    GoalInvocation,
    GoalProjectListenerEvent,
    GoalProjectListenerRegistration,
    ProgressLog,
    PushTest,
    spawnAndWatch,
} from "@atomist/sdm";
import {
    createTagForStatus,
    ProjectIdentifier,
    readSdmVersion,
} from "@atomist/sdm-core";
import { createRelease } from "@atomist/sdm-core/lib/util/github/ghub";
import {
    DockerOptions,
    HasDockerfile,
} from "@atomist/sdm-pack-docker";
import { SpawnOptions } from "child_process";

async function loglog(log: ProgressLog, msg: string): Promise<void> {
    logger.debug(msg);
    log.write(`${msg}\n`);
    await log.flush();
}

interface ProjectRegistryInfo {
    registry: string;
    name: string;
    version: string;
}

async function rwlcVersion(gi: GoalInvocation): Promise<string> {
    const version = await readSdmVersion(
        gi.sdmGoal.repo.owner,
        gi.sdmGoal.repo.name,
        gi.sdmGoal.repo.providerId,
        gi.sdmGoal.sha,
        gi.sdmGoal.branch,
        gi.context);
    return version;
}

function releaseVersion(version: string): string {
    return version.replace(/-.*/, "");
}

function dockerImage(p: ProjectRegistryInfo): string {
    return `${p.registry}/${p.name}:${p.version}`;
}

type ExecuteLogger = (l: ProgressLog) => Promise<ExecuteGoalResult>;

interface SpawnWatchCommand {
    cmd: SpawnCommand;
    cwd?: string;
}

/**
 * Transform a SpawnWatchCommand into an ExecuteLogger suitable for
 * execution by executeLoggers.  The operation is awaited and any
 * thrown exceptions are caught and transformed into an error result.
 * If an error occurs, it is logged.  The result of the operation is
 * transformed into a ExecuteGoalResult.  If an exception is caught,
 * the returned code is guaranteed to be non-zero.
 */
function spawnExecuteLogger(swc: SpawnWatchCommand): ExecuteLogger {

    return async (log: ProgressLog) => {
        const opts: SpawnOptions = {
            ...swc.cmd.options,
        };
        if (swc.cwd) {
            opts.cwd = swc.cwd;
        }
        let res: ChildProcessResult;
        try {
            res = await spawnAndWatch(swc.cmd, opts, log);
        } catch (e) {
            res = {
                error: true,
                code: -1,
                message: `Spawned command errored: ${swc.cmd.command} ${swc.cmd.args.join(" ")}: ${e.message}`,
                childProcess: undefined,
            };
        }
        if (res.error) {
            if (!res.message) {
                res.message = `Spawned command failed (status:${res.code}): ${swc.cmd.command} ${swc.cmd.args.join(" ")}`;
            }
            logger.error(res.message);
            log.write(res.message);
        }
        return res;
    };
}

/**
 * Transform a GitCommandGitProject operation into an ExecuteLogger
 * suitable for execution by executeLoggers.  The operation is awaited
 * and any thrown exceptions are caught and transformed into an error
 * result.  The returned standard out and standard error are written
 * to the log.  If an error occurs, it is logged.  The result of the
 * operation is transformed into a ExecuteGoalResult.  If an error is
 * returned or exception caught, the returned code is guaranteed to be
 * non-zero.
 */
function gitExecuteLogger(
    gp: GitCommandGitProject,
    op: () => Promise<GitCommandGitProject>,
    name: string,
): ExecuteLogger {

    return async (log: ProgressLog) => {
        log.write(`Running: git ${name}`);
        try {
            await op();
            log.write(`Success: git ${name}`);
            return { code: 0 };
        } catch (e) {
            log.write(e.stdout);
            log.write(e.stderr);
            const message = `Failure: git ${name}: ${e.message}`;
            log.write(message);
            return {
                code: e.code,
                message,
            };
        }
    };
}

/**
 * Execute an array of logged commands, creating a line-delimited
 * progress log beforehand, flushing after each command, and closing
 * it at the end.  If any command fails, bail out and return the
 * failure result.  Otherwise return Success.
 */
async function executeLoggers(els: ExecuteLogger[], progressLog: ProgressLog): Promise<ExecuteGoalResult> {
    const log = new DelimitedWriteProgressLogDecorator(progressLog, "\n");
    for (const cmd of els) {
        const res = await cmd(log);
        await log.flush();
        if (res.code !== 0) {
            await log.close();
            return res;
        }
    }
    await log.close();
    return Success;
}

export async function dockerPullProjectListner(p: GitProject,
                                               gi: GoalInvocation,
                                               event: GoalProjectListenerEvent): Promise<void | ExecuteGoalResult> {
    if (event === GoalProjectListenerEvent.before) {
        const version = await rwlcVersion(gi);
        const dockerOptions = configurationValue<DockerOptions>("sdm.docker.hub");
        const image = dockerImage({
            registry: dockerOptions.registry,
            name: p.name,
            version,
        });

        const cmds: SpawnWatchCommand[] = [
            {
                cmd: {
                    command: "docker",
                    args: ["login", "--username", dockerOptions.user, "--password", dockerOptions.password],
                },
            },
            {
                cmd: { command: "docker", args: ["pull", image] },
            },
        ];
        const els = cmds.map(spawnExecuteLogger);
        return executeLoggers(els, gi.progressLog);
    }
}

export const DockerPull: GoalProjectListenerRegistration = {
    name: "release-pull",
    listener: dockerPullProjectListner,
    pushTest: HasDockerfile,
};

export function executeReleaseDocker(
    options?: DockerOptions,
): ExecuteGoal {

    return async (gi: GoalInvocation) => {
        const { credentials, id, context, configuration } = gi;
        if (!options.registry) {
            throw new Error(`No registry defined in Docker options`);
        }
        return configuration.sdm.projectLoader.doWithProject({
            credentials,
            id,
            context,
            readOnly: false,
        }, async () => {

            const version = await rwlcVersion(gi);
            const versionRelease = releaseVersion(version);
            const image = dockerImage({
                registry: options.registry,
                name: gi.sdmGoal.repo.name,
                version,
            });
            const tag = dockerImage({
                registry: options.registry,
                name: gi.sdmGoal.repo.name,
                version: versionRelease,
            });

            const cmds: SpawnWatchCommand[] = [
                {
                    cmd: { command: "docker", args: ["tag", image, tag] },
                },
                {
                    cmd: { command: "docker", args: ["push", tag] },
                },
                {
                    cmd: { command: "docker", args: ["rmi", tag] },
                },
            ];
            const els = cmds.map(spawnExecuteLogger);
            return executeLoggers(els, gi.progressLog);
        });
    };
}

/**
 * Create release semantic version tag and GitHub release for that tag.
 */
export function executeReleaseTag(): ExecuteGoal {
    return async (gi: GoalInvocation): Promise<ExecuteGoalResult> => {
        const { credentials, id, context, configuration } = gi;

        return configuration.sdm.projectLoader.doWithProject({ credentials, id, context, readOnly: true }, async p => {
            const version = await rwlcVersion(gi);
            const versionRelease = releaseVersion(version);
            await createTagForStatus(id, gi.sdmGoal.sha, gi.sdmGoal.push.after.message, versionRelease, credentials);
            const commitTitle = gi.sdmGoal.push.after.message.replace(/\n[\S\s]*/, "");
            const release = {
                tag_name: versionRelease,
                name: `${versionRelease}: ${commitTitle}`,
            };
            const rrr = p.id as RemoteRepoRef;
            const targetUrl = `${rrr.url}/releases/tag/${versionRelease}`;
            const egr: ExecuteGoalResult = {
                ...Success,
                targetUrl,
            };
            return createRelease((credentials as TokenCredentials).token, id as GitHubRepoRef, release)
                .then(() => egr);
        });
    };
}

/**
 * Increment patch level in project version.
 */
export function executeReleaseVersion(
    projectIdentifier: ProjectIdentifier,
    incrementPatchCmd: SpawnCommand = { command: "npm", args: ["version", "--no-git-tag-version", "patch"] },
): ExecuteGoal {

    return async (gi: GoalInvocation): Promise<ExecuteGoalResult> => {
        const { configuration, credentials, id, context } = gi;

        return configuration.sdm.projectLoader.doWithProject({ credentials, id, context, readOnly: false }, async p => {
            const version = await rwlcVersion(gi);
            const versionRelease = releaseVersion(version);
            const gp = p as GitCommandGitProject;

            const log = new DelimitedWriteProgressLogDecorator(gi.progressLog, "\n");
            const slug = `${gp.id.owner}/${gp.id.repo}`;
            const branch = gi.sdmGoal.branch;
            const remote = gp.remote || "origin";
            const preEls: ExecuteLogger[] = [
                gitExecuteLogger(gp, () => gp.checkout(branch), "checkout"),
                spawnExecuteLogger({ cmd: { command: "git", args: ["pull", remote, branch] }, cwd: gp.baseDir }),
            ];
            await loglog(log, `Pulling ${branch} of ${slug}`);
            const preRes = await executeLoggers(preEls, gi.progressLog);
            if (preRes.code !== 0) {
                return preRes;
            }
            gp.branch = branch;

            const pi = await projectIdentifier(p);
            if (!pi.version.startsWith(`${versionRelease}-`)) {
                const message = `current master version (${pi.version}) seems to have already been ` +
                    `incremented after ${releaseVersion} release`;
                await loglog(log, message);
                return { ...Success, message };
            }

            const postEls: ExecuteLogger[] = [
                spawnExecuteLogger({ cmd: incrementPatchCmd, cwd: gp.baseDir }),
                gitExecuteLogger(gp, () => gp.commit(`Version: increment after ${versionRelease} release

[atomist:generated]`), "commit"),
                gitExecuteLogger(gp, () => gp.push(), "push"),
            ];
            await loglog(log, `Incrementing version and committing for ${slug}`);
            return executeLoggers(postEls, gi.progressLog);
        });
    };
}

export const IsReleaseCommit: PushTest = {
    name: "IsReleaseCommit",
    mapping: async pi => {
        const regexp = /Version: increment after .* release/i;
        return regexp.test(pi.push.after.message);
    },
};
