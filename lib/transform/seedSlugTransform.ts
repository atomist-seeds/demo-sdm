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
