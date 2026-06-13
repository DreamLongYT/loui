# AI Self-Healing

## Overview

AI Self-Healing is the crown jewel of pkg-scaffold v4.0. It goes beyond simple static refactoring by using Large Language Models (LLMs) to intelligently repair code, resolve complex conflicts, and even rewrite logic to maintain system integrity after structural changes.

## Features

- **Intelligent Code Repair**: Automatically fixes compilation errors caused by refactoring.
- **Conflict Resolution**: Resolves merge conflicts and logical inconsistencies after code pruning.
- **Context-Aware Refactoring**: Understands the *intent* of your code to make smarter decisions about what to keep or remove.
- **Automated Rollbacks**: If a repair fails to pass tests, the engine automatically rolls back to a safe state.
- **Explanatory Feedback**: Provides clear explanations for why certain changes were made and how they improve the codebase.

## How it Works

1. **Detection**: The static engine identifies a structural issue (e.g., a dead export).
2. **Prototyping**: The engine creates a "Repair Prototype" – a proposed set of changes.
3. **AI Review**: The prototype is sent to an LLM along with relevant context (surrounding code, dependency graph, error messages).
4. **Refinement**: The AI refines the repair, ensuring it doesn't break logical flows or type safety.
5. **Validation**: The changes are applied in a sandbox and the test suite is executed.
6. **Commit/Rollback**: If tests pass, the changes are committed. If not, the engine rolls back and tries an alternative or alerts the user.

## Configuration

Enable AI Self-Healing in `pkg-scaffold/config.json`:

```json
{
  "healing": {
    "ai": {
      "enabled": true,
      "provider": "openai", // or "anthropic", "local"
      "model": "gpt-4-turbo",
      "temperature": 0.2,
      "maxRetries": 3
    }
  }
}
```

## Security & Privacy

- **Local Processing**: You can use local LLMs (via tools like Ollama) to ensure no code ever leaves your infrastructure.
- **Data Masking**: The engine can be configured to mask sensitive information (secrets, PII) before sending context to an external AI provider.
- **Audit Logs**: Every AI-generated change is logged and can be reviewed by a human operator.

## Example Scenario

**Issue**: A utility function `formatData` is flagged as unused. However, it's part of a complex chain of higher-order functions.

**Static Approach**: Simply delete the function. This might break the chain if not handled perfectly.

**AI Self-Healing Approach**:
1. Analyzes the function chain.
2. Realizes that removing `formatData` allows for simplifying the entire chain.
3. Rewrites the higher-order function to bypass the unneeded step.
4. Updates all call sites to use the new, simplified logic.
5. Verifies that the data output remains identical via unit tests.

## Best Practices

1. **Strong Test Suite**: AI healing is only as reliable as your tests. Ensure you have good coverage before enabling full automation.
2. **Incremental Adoption**: Start by enabling AI healing in "Review Mode" where it proposes changes but requires human approval.
3. **Context Optimization**: Only provide the AI with the context it needs to solve the specific problem to keep costs down and improve accuracy.

## Troubleshooting

### AI proposing incorrect changes
Lower the `temperature` in your configuration to make the model more deterministic. You can also provide custom "Healing Rules" in a `.pkg-scaffold/rules.md` file.

### High latency
AI healing can be slow for large changes. Use it for complex repairs and rely on the static engine for simple deletions.
