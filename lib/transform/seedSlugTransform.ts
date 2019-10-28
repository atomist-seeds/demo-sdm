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

/**
 * Replace the slug of the seed repo in the generated project
 */
import { projectUtils } from "@atomist/automation-client";
import { CodeTransform } from "@atomist/sdm";

export function replaceSeedSlug(owner: string, repo: string): CodeTransform {
    return async (p, papi) => {
        await projectUtils.doWithFiles(p, "**/*", async file => {
            const content = await file.getContent();
            const newContent = content.replace(
                new RegExp(
                    `${owner}\/${name}`, "g"),
                `${p.id.owner}/${p.id.repo}`);
            if (content !== newContent) {
                await file.setContent(newContent);
            }
        });
        return p;
    };
}
