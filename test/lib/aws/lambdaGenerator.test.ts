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

import { InMemoryProject } from "@atomist/automation-client";
import * as assert from "assert";
import { updateTemplate } from "../../../lib/aws/lambdaGenerator";
import { LambdaCreationParameters } from "../../../lib/aws/lambdaGenerator2";

describe("Lambda generator", () => {

    it("should transform", async () => {
        const parameters: LambdaCreationParameters = {
            functionName: "thing",
            description: "Thing",
            role: "x",
        };
        const p = InMemoryProject.of({ path: "template.yml", content: oldTemplate() });
        await updateTemplate(p, { parameters } as any);
        const newContent = (await p.getFile("template.yml")).getContentSync();
        assert(newContent.includes("thing"), newContent);
    });

});

function oldTemplate(): string {
    return `AWSTemplateFormatVersion : '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Resources:
  HelloWorldFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: index.handler
      Runtime: nodejs8.10
      FunctionName: HelloWorldFunction

      Events:
        HelloWorldApi:
          Type: Api
          Properties:
            Path: /
            Method: GET`;
}
