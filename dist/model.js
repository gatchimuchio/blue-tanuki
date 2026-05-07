import { runScoring } from "./policy.js";
/**
 * M (Model) phase.
 *
 * Builds a structural abstraction of the framed request and runs detector-based
 * axis scoring per the policy. The scoring output is the input to the Commit
 * phase's threshold evaluation.
 *
 * No LLM calls. Detectors are pure-logic functions.
 */
export function model(req, f, policy, registry) {
    const scoring = runScoring(policy, {
        request_content: req.content,
        goal: f.goal,
        protected_values: f.protected_values,
        channel: req.channel,
        user: req.user,
    }, registry);
    return {
        abstraction: `goal:${f.goal}|policy:${f.problem_definition_id}`,
        structure: {
            protected: f.protected_values,
            closure: f.world_closure,
            problem_definition_id: f.problem_definition_id,
            actor: f.actor,
            process: {
                process_id: f.process.process_id,
                process_kind: f.process.process_kind,
                trigger: f.process.trigger,
            },
            memory_trace: f.memory_trace,
        },
        scoring,
    };
}
//# sourceMappingURL=model.js.map