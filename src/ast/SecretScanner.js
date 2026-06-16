/**
 * ============================================================================
 * 🔐 SecretScanner – Hardcoded Credential & API Key Detector
 * ============================================================================
 * Scans source files for hardcoded secrets such as API keys, tokens,
 * passwords, and other sensitive credentials using heuristic pattern matching
 * on both variable names and string literal values.
 *
 * New in v3.3.8: integrated into the main analysis pipeline so that secrets
 * are surfaced alongside dead-code and unused-dependency findings.
 */

/**
 * Severity levels for detected secrets.
 */
export const SecretSeverity = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
};

/**
 * Patterns that flag a variable/property *name* as likely containing a secret.
 * Matched case-insensitively against the identifier text.
 */
const SENSITIVE_NAME_PATTERNS = [
  // Generic credential names
  /api[_-]?key/i,
  /apikey/i,
  /api[_-]?secret/i,
  /access[_-]?token/i,
  /auth[_-]?token/i,
  /bearer[_-]?token/i,
  /secret[_-]?key/i,
  /private[_-]?key/i,
  /client[_-]?secret/i,
  /app[_-]?secret/i,
  // Database credentials
  /db[_-]?pass(word)?/i,
  /database[_-]?pass(word)?/i,
  /db[_-]?url/i,
  /database[_-]?url/i,
  /connection[_-]?string/i,
  // Passwords
  /^password$/i,
  /^passwd$/i,
  /^pwd$/i,
  /[_-]password$/i,
  // Tokens
  /[_-]token$/i,
  /^token$/i,
  /jwt[_-]?secret/i,
  /session[_-]?secret/i,
  /cookie[_-]?secret/i,
  // Cloud provider keys
  /aws[_-]?(access[_-]?key|secret|session[_-]?token)/i,
  /gcp[_-]?key/i,
  /azure[_-]?(key|secret|connection)/i,
  // Service-specific
  /stripe[_-]?(key|secret)/i,
  /twilio[_-]?(auth|token|sid)/i,
  /sendgrid[_-]?key/i,
  /github[_-]?token/i,
  /slack[_-]?(token|webhook)/i,
  /discord[_-]?(token|secret)/i,
  /openai[_-]?(key|token)/i,
  /anthropic[_-]?key/i,
  /webhook[_-]?(url|secret)/i,
  /encryption[_-]?key/i,
  /signing[_-]?key/i,
  /hmac[_-]?key/i,
  /salt$/i,
];

/**
 * Patterns that flag a *string literal value* as likely being a secret.
 * These are matched against the raw string content.
 */
const SENSITIVE_VALUE_PATTERNS = [
  // AWS Access Key IDs
  { pattern: /AKIA[0-9A-Z]{16}/, label: 'AWS_ACCESS_KEY_ID', severity: SecretSeverity.CRITICAL },
  // AWS Secret Access Keys (40-char base64-ish)
  { pattern: /[A-Za-z0-9/+=]{40}/, label: 'AWS_SECRET_KEY_CANDIDATE', severity: SecretSeverity.MEDIUM },
  // Generic high-entropy hex strings (32+ chars)
  { pattern: /^[0-9a-f]{32,}$/i, label: 'HEX_SECRET', severity: SecretSeverity.HIGH },
  // Generic high-entropy base64 strings (32+ chars)
  { pattern: /^[A-Za-z0-9+/]{32,}={0,2}$/, label: 'BASE64_SECRET', severity: SecretSeverity.MEDIUM },
  // JWT tokens
  { pattern: /^ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/, label: 'JWT_TOKEN', severity: SecretSeverity.CRITICAL },
  // GitHub personal access tokens
  { pattern: /ghp_[A-Za-z0-9]{36}/, label: 'GITHUB_PAT', severity: SecretSeverity.CRITICAL },
  { pattern: /github_pat_[A-Za-z0-9_]{82}/, label: 'GITHUB_PAT_FINE', severity: SecretSeverity.CRITICAL },
  // Stripe keys
  { pattern: /sk_(live|test)_[A-Za-z0-9]{24,}/, label: 'STRIPE_SECRET_KEY', severity: SecretSeverity.CRITICAL },
  { pattern: /pk_(live|test)_[A-Za-z0-9]{24,}/, label: 'STRIPE_PUBLIC_KEY', severity: SecretSeverity.HIGH },
  // Slack tokens
  { pattern: /xox[baprs]-[A-Za-z0-9-]{10,}/, label: 'SLACK_TOKEN', severity: SecretSeverity.CRITICAL },
  // Discord tokens
  { pattern: /[MN][A-Za-z0-9]{23}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27}/, label: 'DISCORD_TOKEN', severity: SecretSeverity.CRITICAL },
  // Twilio SID
  { pattern: /AC[a-f0-9]{32}/, label: 'TWILIO_SID', severity: SecretSeverity.HIGH },
  // SendGrid API key
  { pattern: /SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}/, label: 'SENDGRID_KEY', severity: SecretSeverity.CRITICAL },
  // OpenAI API key
  { pattern: /sk-[A-Za-z0-9]{32,}/, label: 'OPENAI_KEY', severity: SecretSeverity.CRITICAL },
  // Generic UUID-like tokens that look like secrets (not just any UUID)
  { pattern: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/, label: 'UUID_SECRET_CANDIDATE', severity: SecretSeverity.MEDIUM },
];

/**
 * Minimum length a string value must have to be considered a potential secret.
 * Short strings like "test", "dev", "localhost" are excluded.
 */
const MIN_SECRET_VALUE_LENGTH = 8;

/**
 * Values that are obviously not secrets (common placeholders / env-var references).
 */
const SAFE_VALUE_ALLOWLIST = new Set([
  'your_api_key_here',
  'your-api-key',
  'YOUR_API_KEY',
  'YOUR_SECRET',
  'REPLACE_ME',
  'changeme',
  'placeholder',
  'example',
  'test',
  'demo',
  'localhost',
  '127.0.0.1',
  'process.env',
  '',
]);

/**
 * Checks whether a string value looks like an environment-variable reference
 * (e.g. `process.env.SECRET` or `import.meta.env.SECRET`).
 */
function isEnvReference(value) {
  return (
    value.startsWith('process.env') ||
    value.startsWith('import.meta.env') ||
    value.startsWith('${') ||
    /^[A-Z_][A-Z0-9_]*$/.test(value) // ALL_CAPS env-var placeholder
  );
}

/**
 * Determines whether a string value is high-entropy enough to be a real secret.
 * Uses Shannon entropy as a heuristic.
 */
function shannonEntropy(str) {
  const freq = {};
  for (const ch of str) freq[ch] = (freq[ch] || 0) + 1;
  let entropy = 0;
  for (const count of Object.values(freq)) {
    const p = count / str.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

/**
 * Main scanner class. Operates on pre-parsed AST nodes produced by either
 * ASTAnalyzer (TypeScript compiler API) or OxcAnalyzer (oxc-parser).
 */
export class SecretScanner {
  /**
   * Scans a source file's text for hardcoded secrets.
   *
   * @param {string} filePath   - Absolute path to the file being scanned.
   * @param {string} fileContent - Raw source text of the file.
   * @returns {Array<SecretFinding>} - Array of detected secret findings.
   */
  scanFileContent(filePath, fileContent) {
    const findings = [];
    const lines = fileContent.split('\n');

    lines.forEach((line, lineIndex) => {
      const lineNumber = lineIndex + 1;

      // Skip comment-only lines and import statements
      const trimmed = line.trim();
      if (
        trimmed.startsWith('//') ||
        trimmed.startsWith('*') ||
        trimmed.startsWith('/*') ||
        trimmed.startsWith('import ') ||
        trimmed.startsWith('export { ')
      ) {
        return;
      }

      // ── Strategy 1: Name-based heuristic ──────────────────────────────────
      // Look for variable/property assignments where the name matches a
      // sensitive pattern and the value is a non-trivial string literal.
      const assignmentMatch = line.match(
        /(?:const|let|var|readonly)?\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*[=:]\s*["'`]([^"'`]+)["'`]/
      );
      if (assignmentMatch) {
        const [, varName, value] = assignmentMatch;
        if (
          value.length >= MIN_SECRET_VALUE_LENGTH &&
          !SAFE_VALUE_ALLOWLIST.has(value) &&
          !isEnvReference(value) &&
          SENSITIVE_NAME_PATTERNS.some(p => p.test(varName))
        ) {
          findings.push({
            file: filePath,
            line: lineNumber,
            column: line.indexOf(value),
            variableName: varName,
            valueSnippet: this._redact(value),
            label: this._labelFromName(varName),
            severity: SecretSeverity.CRITICAL,
          });
          return; // Don't double-report the same line
        }
      }

      // ── Strategy 2: Value-pattern matching ────────────────────────────────
      // Extract all string literals on this line and test them against known
      // secret value patterns.
      const stringLiterals = [...line.matchAll(/["'`]([^"'`\n]{8,})["'`]/g)];
      for (const match of stringLiterals) {
        const value = match[1];
        if (SAFE_VALUE_ALLOWLIST.has(value) || isEnvReference(value)) continue;

        for (const { pattern, label, severity } of SENSITIVE_VALUE_PATTERNS) {
          if (pattern.test(value)) {
            // Avoid duplicate findings for the same position
            const alreadyReported = findings.some(
              f => f.line === lineNumber && f.valueSnippet === this._redact(value)
            );
            if (!alreadyReported) {
              findings.push({
                file: filePath,
                line: lineNumber,
                column: line.indexOf(match[0]),
                variableName: null,
                valueSnippet: this._redact(value),
                label,
                severity,
              });
            }
            break;
          }
        }
      }

      // ── Strategy 3: High-entropy string heuristic ─────────────────────────
      // Any string literal with Shannon entropy > 4.5 and length >= 20 that
      // is assigned to a sensitive-named variable is flagged.
      if (assignmentMatch) {
        const [, varName, value] = assignmentMatch;
        if (
          value.length >= 20 &&
          shannonEntropy(value) > 4.5 &&
          !SAFE_VALUE_ALLOWLIST.has(value) &&
          !isEnvReference(value) &&
          SENSITIVE_NAME_PATTERNS.some(p => p.test(varName))
        ) {
          const alreadyReported = findings.some(f => f.line === lineNumber);
          if (!alreadyReported) {
            findings.push({
              file: filePath,
              line: lineNumber,
              column: line.indexOf(value),
              variableName: varName,
              valueSnippet: this._redact(value),
              label: 'HIGH_ENTROPY_SECRET',
              severity: SecretSeverity.HIGH,
            });
          }
        }
      }
    });

    return findings;
  }

  /**
   * Redacts a secret value for safe display in reports.
   * Shows the first 4 characters followed by asterisks.
   */
  _redact(value) {
    if (value.length <= 4) return '****';
    return value.slice(0, 4) + '*'.repeat(Math.min(value.length - 4, 8));
  }

  /**
   * Derives a human-readable label from a variable name.
   */
  _labelFromName(name) {
    const upper = name.toUpperCase();
    if (/API[_-]?KEY/.test(upper)) return 'API_KEY';
    if (/TOKEN/.test(upper)) return 'AUTH_TOKEN';
    if (/PASSWORD|PASSWD|PWD/.test(upper)) return 'PASSWORD';
    if (/SECRET/.test(upper)) return 'SECRET';
    if (/DATABASE|DB/.test(upper)) return 'DATABASE_CREDENTIAL';
    return 'SENSITIVE_VALUE';
  }
}
