/*
 * Copyright © 2020 Atomist, Inc.
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

import { Configuration } from "@atomist/automation-client/lib/configuration";
import { PullRequest } from "@atomist/automation-client/lib/operations/edit/editModes";
import { SoftwareDeliveryMachine } from "@atomist/sdm";
import { k8sSupport } from "@atomist/sdm/lib/pack/k8s";
import * as fs from "fs-extra";
import * as _ from "lodash";

export const DemoSupport = async (cfg: Configuration) => {
    const defaultCfg = {
        sdm: {
            cache: {
                path: "/tmp/cache",
            },
            goalSigning: {
                enabled: true,
                scope: "all",
                signingKey: {
                    name: "atomist.com/demo-sdm",
                    passphrase: "c085cabb-396c-4999-abef-c4670bc79054",
                    privateKey: (await fs.readFile("private.pem")).toString(),
                    publicKey: (await fs.readFile("public.pem")).toString(),
                },
                verificationKeys: [{
                    name: "atomist.com/demo-sdm",
                    publicKey: (await fs.readFile("public.pem")).toString(),
                }],
            },
            extensionPacks: [
                {
                    name: "dockerfile",
                    description: "Add Dockerfiles to projects",
                    configure: (sdm: SoftwareDeliveryMachine) => {
                        sdm.addCodeTransformCommand({
                            name: "addDockerfile",
                            intent: "add dockerfile",
                            transformPresentation: (papi, p) => new PullRequest(`add-dockerfile`, "Add Dockerfile", "This pull requests add our standard Maven Dockerfile"),
                            transform: async (p, papi) => {
                                await p.addFile("Dockerfile", `FROM openjdk:8

LABEL maintainer="Atomist <docker@atomist.com>"

RUN mkdir -p /app

WORKDIR /app

EXPOSE 8080

CMD ["-jar", "spring-boot.jar"]

ENTRYPOINT ["java", "-XX:+UnlockExperimentalVMOptions", "-XX:+UseCGroupMemoryLimitForHeap", "-Xmx256m", "-Djava.security.egd=file:/dev/urandom"]

COPY target/spring-boot.jar spring-boot.jar
`);
                            },
                        });
                        return sdm;
                    },
                },
                k8sSupport({ addCommands: true }),
            ],
            k8s: {
                job: {
                    cleanupInterval: 1000 * 60 * 10,
                },
            },
        },
    };
    return _.defaultsDeep(cfg, defaultCfg);
};
