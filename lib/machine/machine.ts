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
    githubTeamVoter, goals,
    ImmaterialGoals,
    isMaterialChange,
    not,
    SoftwareDeliveryMachine,
    SoftwareDeliveryMachineConfiguration,
    ToDefaultBranch,
    whenPushSatisfies,
} from "@atomist/sdm";
import {
    createSoftwareDeliveryMachine,
    githubGoalStatusSupport,
    goalStateSupport,
    IsGitHubAction,
    k8sGoalSchedulingSupport,
} from "@atomist/sdm-core";
import { buildAwareCodeTransforms } from "@atomist/sdm-pack-build";
import { HasDockerfile } from "@atomist/sdm-pack-docker";
import { issueSupport } from "@atomist/sdm-pack-issue";
import { k8sSupport } from "@atomist/sdm-pack-k8s";
import {
    HasSpringBootApplicationClass,
    HasSpringBootPom,
    IsMaven,
} from "@atomist/sdm-pack-spring";
import { AddDockerfile } from "../commands/addDockerfile";
import {
    build,
    buildGoals,
    checkGoals,
    dockerGoals,
    productionDeployGoals,
    stagingDeployGoals,
} from "./goals";
import { IsReleaseCommit } from "./release";
import { addSpringSupport } from "./springSupport";
import { IsLambda } from "../aws/lambdaPushTests";
import { lambdaSamDeployGoal, LambdaSamDeployOptions } from "../aws/lambdaSamDeployGoal";
import { defaultAwsCredentialsResolver, invokeFunctionCommand, listFunctionsCommand } from "../aws/lambdaCommands";
import { lambdaAliasGoal } from "../aws/lambdaAliasGoal";
import { lambdaGenerator } from "../aws/lambdaGenerator";
import { GitHubRepoRef } from "@atomist/automation-client";

const deployOptions: LambdaSamDeployOptions = {
    uniqueName: "lambdaSamDeploy",
    bucketName: "com.atomist.hello",
};

export function machine(configuration: SoftwareDeliveryMachineConfiguration): SoftwareDeliveryMachine {

    const sdm = createSoftwareDeliveryMachine({
        name: "Kubernetes Demo Software Delivery Machine",
        configuration,
    });

    const deployGoal = lambdaSamDeployGoal(deployOptions);

    const promoteToStaging = lambdaAliasGoal(defaultAwsCredentialsResolver, { alias: "staging", preApproval: false });
    const promoteToProduction = lambdaAliasGoal(defaultAwsCredentialsResolver, {
        alias: "production",
        preApproval: true
    });

    sdm.withPushRules(
        whenPushSatisfies(not(isMaterialChange({
            extensions: ["java", "html", "js", "json", "yml", "xml", "sh", "kt", "properties"],
            files: ["Dockerfile"],
            directories: [".atomist", ".github"],
        }))).setGoals(ImmaterialGoals.andLock()),

        whenPushSatisfies(IsLambda).setGoals(deployGoal),
        whenPushSatisfies(IsLambda).setGoals(deployGoal).setGoals(goals("staging")
            .plan(promoteToStaging)
            .after(deployGoal)
        ),
        whenPushSatisfies(IsLambda).setGoals(deployGoal).setGoals(goals("production")
            .plan(promoteToProduction)
            .after(promoteToStaging)
        ),

        whenPushSatisfies(IsMaven).setGoals(checkGoals),
        whenPushSatisfies(IsMaven).setGoals(buildGoals),
        whenPushSatisfies(IsMaven, HasDockerfile).setGoals(dockerGoals),
        whenPushSatisfies(HasSpringBootPom, HasSpringBootApplicationClass,
            ToDefaultBranch, HasDockerfile).setGoals(stagingDeployGoals),
        whenPushSatisfies(HasSpringBootPom, HasSpringBootApplicationClass,
            ToDefaultBranch, HasDockerfile, not(IsGitHubAction))
            .setGoals(productionDeployGoals),
    );

    sdm.addCodeTransformCommand(AddDockerfile);

    sdm.addCommand(invokeFunctionCommand(defaultAwsCredentialsResolver));
    sdm.addCommand(listFunctionsCommand(defaultAwsCredentialsResolver));

   sdm.addGeneratorCommand(lambdaGenerator({
       name: "newLambda",
       intent: ["create lambda", "new lambda"],
       startingPoint: GitHubRepoRef.from({
           owner: "spring-team",
           repo: "lambda-sam-hello-world",
           branch: "master",
       })},
   ));

    addSpringSupport(sdm);

    sdm.addGoalApprovalRequestVoter(githubTeamVoter());
    sdm.addExtensionPacks(
        buildAwareCodeTransforms({
            buildGoal: build,
            issueCreation: {
                issueRouter: {
                    raiseIssue: async () => {
                        // raise no issues
                    },
                },
            },
        }),
        issueSupport(),
        goalStateSupport(),
        githubGoalStatusSupport(),
        k8sGoalSchedulingSupport(),
        k8sSupport({ addCommands: true }),
    );

    return sdm;
}
