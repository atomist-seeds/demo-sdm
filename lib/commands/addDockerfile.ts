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
    buttonForCommand,
    editModes,
    logger,
} from "@atomist/automation-client";
import {
    ChannelLinkListener,
    CodeTransform,
    CodeTransformRegistration,
    formatDate,
    slackQuestionMessage,
} from "@atomist/sdm";
import { BuildAwareMarker } from "@atomist/sdm-pack-build";

export const AddDockerfileCommandName = "AddDockerfile";

export const addDockerfileTransform: CodeTransform = async (p, ctx) => {
    if (p.fileExistsSync("pom.xml")) {
        return p.addFile("Dockerfile", springDockerfile)
            .then(pd => pd.addFile(".dockerignore", springDockerignore));
    }
    logger.info("Project has no pom.xml");
    return p;
};

export const AddDockerfile: CodeTransformRegistration = {
    transform: addDockerfileTransform,
    name: AddDockerfileCommandName,
    intent: "add dockerfile",
    transformPresentation: () => ({
        message: `Add Dockerfile

${BuildAwareMarker} ${editModes.AutoMergeMode.SuccessfulCheck} ${editModes.AutoMergeMethod.Merge}`,
        branch: `add-dockerfile-${formatDate()}`,
    } as editModes.BranchCommit),
};

export const SuggestAddingDockerfile: ChannelLinkListener = async inv => {
    if (!inv.project.fileExistsSync("pom.xml") && !inv.project.fileExistsSync("package.json")) {
        logger.debug(`Not suggesting Dockerfile for ${inv.id}, not a supported project type`);
        return;
    }
    if (inv.project.fileExistsSync("Dockerfile")) {
        logger.debug(`Not suggesting Dockerfile for ${inv.id}, it already has one`);
        return;
    }

    const message = slackQuestionMessage(
        "Dockerfile",
        "Add a Dockerfile to your new repository?",
        {
            actions: [buttonForCommand({ text: "Add Dockerfile" },
                AddDockerfileCommandName,
                { "targets.owner": inv.id.owner, "targets.repo": inv.id.repo },
            )],
        });
    return inv.addressNewlyLinkedChannel(message);
};

/* tslint:disable:max-line-length */

const springDockerfile = `FROM openjdk:8

ENV DUMB_INIT_VERSION=1.2.2

RUN curl -s -L -O https://github.com/Yelp/dumb-init/releases/download/v$DUMB_INIT_VERSION/dumb-init_\${DUMB_INIT_VERSION}_amd64.deb \\
    && dpkg -i dumb-init_\${DUMB_INIT_VERSION}_amd64.deb \\
    && rm -f dumb-init_\${DUMB_INIT_VERSION}_amd64.deb

MAINTAINER Atomist <docker@atomist.com>

RUN mkdir -p /app

WORKDIR /app

EXPOSE 8080

CMD ["-jar", "spring-boot.jar"]

ENTRYPOINT ["dumb-init", "java", "-XX:+UnlockExperimentalVMOptions", "-XX:+UseCGroupMemoryLimitForHeap", "-Xmx256m", "-Djava.security.egd=file:/dev/urandom"]

COPY target/spring-boot.jar spring-boot.jar
`;

const springDockerignore = `*
!target/spring-boot.jar
`;
