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
    DelimitedWriteProgressLogDecorator,
    ExecuteGoal,
    ExecuteGoalResult,
    GoalInvocation,
} from "@atomist/sdm";

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
