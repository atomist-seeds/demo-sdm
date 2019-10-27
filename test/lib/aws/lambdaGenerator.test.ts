import { LambdaCreationParameters } from "../../../lib/aws/lambdaGenerator2";
import { InMemoryProject } from "@atomist/automation-client";
import { updateTemplate } from "../../../lib/aws/lambdaGenerator";
import * as assert from "assert";

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
