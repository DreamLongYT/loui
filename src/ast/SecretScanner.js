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
  /security[_-]?token/i,
  /master[_-]?key/i,
  /root[_-]?password/i,

  // Database credentials
  /db[_-]?pass(word)?/i,
  /database[_-]?pass(word)?/i,
  /db[_-]?url/i,
  /database[_-]?url/i,
  /connection[_-]?string/i,
  /postgres(ql)?[_-]?url/i,
  /mongo(db)?[_-]?url/i,
  /redis[_-]?url/i,

  // Passwords & Pins
  /^password$/i,
  /^passwd$/i,
  /^pwd$/i,
  /[_-]password$/i,
  /[_-]pass$/i,
  /pass(phrase|code)/i,
  /admin[_-]?pass/i,
  /pin[_-]?number/i,

  // Tokens & Sessions
  /[_-]token$/i,
  /^token$/i,
  /jwt[_-]?(secret|token)/i,
  /session[_-]?(secret|token|id)/i,
  /cookie[_-]?secret/i,
  /oauth[_-]?(token|secret|client)/i,
  /refresh[_-]?token/i,
  /csrf[_-]?token/i,

  // Cloud Provider Keys (AWS, GCP, Azure)
  /aws[_-]?(access[_-]?key|secret|session[_-]?token|key[_-]?id)/i,
  /gcp[_-]?(key|secret|token|sa[_-]?key)/i,
  /google[_-]?(api[_-]?key|credentials|client[_-]?secret)/i,
  /azure[_-]?(key|secret|connection|token|tenant[_-]?id)/i,

  // AI & Machine Learning Platforms
  /openai[_-]?(key|token|secret)/i,
  /anthropic[_-]?key/i,
  /cohere[_-]?key/i,
  /huggingface[_-]?token/i,
  /replicate[_-]?api/i,
  /langchain[_-]?api/i,
  /pinecone[_-]?api/i,
  /gemini[_-]?key/i,

  // Service-Specific (CI/CD, Dev Tools, Payment, Comms)
  /stripe[_-]?(key|secret|webhook)/i,
  /twilio[_-]?(auth|token|sid)/i,
  /sendgrid[_-]?(key|api)/i,
  /github[_-]?(token|pat|secret|app[_-]?id)/i,
  /gitlab[_-]?(token|pat|secret)/i,
  /slack[_-]?(token|webhook|secret)/i,
  /discord[_-]?(token|secret|webhook)/i,
  /pagerduty[_-]?(token|key)/i,
  /datadog[_-]?(api[_-]?key|app[_-]?key)/i,
  /sentry[_-]?(dsn|auth[_-]?token)/i,
  /heroku[_-]?(api[_-]?key|oauth)/i,
  /atlassian[_-]?(token|secret)/i,
  /jira[_-]?(token|password)/i,
  /npm[_-]?auth[_-]?token/i,
  /jfrog[_-]?(token|password|api)/i,
  /firebase[_-]?(key|secret|token)/i,
  /supabase[_-]?(key|secret|service[_-]?role)/i,

  // Webhooks, Crypto, and Infrastructure
  /webhook[_-]?(url|secret|token)/i,
  /encryption[_-]?(key|secret|iv)/i,
  /signing[_-]?key/i,
  /hmac[_-]?(key|secret)/i,
  /salt$/i,
  /ssh[_-]?(key|private|public)/i,
  /cert(ificate)?(s)?/i,
  /credential(s)?/i,
  /tls[_-]?(key|cert)/i,
  /ssl[_-]?(key|cert)/i,
  /kube(config)?[_-]?(token|secret)/i,
  /vault[_-]?(token|secret|key)/i,
  /bitcoind?[_-]?(rpc)?password/i,
];

/**
 * Patterns that flag a *string literal value* as likely being a secret.
 * These are matched against the raw string content.
 */
const SENSITIVE_VALUE_PATTERNS = [
  // AWS Access Key IDs
  { pattern: /AKIA[0-9A-Z]{16}/, label: 'AWS_ACCESS_KEY_ID', severity: SecretSeverity.CRITICAL },
  // AWS Secret Access Keys (40-char base64-ish)
  { pattern: /(?<![A-Za-z0-9/+=])[A-Za-z0-9/+=]{40}(?![A-Za-z0-9/+=])/, label: 'AWS_SECRET_KEY_CANDIDATE', severity: SecretSeverity.MEDIUM },
  
  // Generic high-entropy hex strings (32+ chars) - Added word boundaries to reduce false positives
  { pattern: /\b[0-9a-f]{32,}\b/i, label: 'HEX_SECRET', severity: SecretSeverity.HIGH },
  // Generic high-entropy base64 strings (32+ chars) - Replaced rigid anchors with lookarounds
  { pattern: /(?<![A-Za-z0-9+/])[A-Za-z0-9+/]{32,}={0,2}(?![A-Za-z0-9+/])/, label: 'BASE64_SECRET', severity: SecretSeverity.MEDIUM },
  
  // JWT tokens
  { pattern: /\bey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/, label: 'JWT_TOKEN', severity: SecretSeverity.CRITICAL },
  
  // GitHub access tokens (Updated for all token formats: ghp, gho, ghu, ghs, ghr, fine-grained)
  { pattern: /\bgh[pousr]_[A-Za-z0-9]{36}\b/, label: 'GITHUB_TOKEN_CLASSIC', severity: SecretSeverity.CRITICAL },
  { pattern: /\bgithub_pat_[A-Za-z0-9_]{82}\b/, label: 'GITHUB_PAT_FINE', severity: SecretSeverity.CRITICAL },
  { pattern: /\bghs_[A-Za-z0-9\.\-_]{36,}\b/, label: 'GITHUB_APP_STATELESS_TOKEN', severity: SecretSeverity.CRITICAL }, // Supports the modern 2026 ghs_ JWT format

  // Stripe keys
  { pattern: /\bsk_(live|test)_[A-Za-z0-9]{24,}\b/, label: 'STRIPE_SECRET_KEY', severity: SecretSeverity.CRITICAL },
  { pattern: /\bpk_(live|test)_[A-Za-z0-9]{24,}\b/, label: 'STRIPE_PUBLIC_KEY', severity: SecretSeverity.HIGH },
  
  // Slack tokens & Webhooks
  { pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, label: 'SLACK_TOKEN', severity: SecretSeverity.CRITICAL },
  { pattern: /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9_]{8}\/B[A-Z0-9_]{8}\/[A-Za-z0-9_]{24}/, label: 'SLACK_WEBHOOK', severity: SecretSeverity.CRITICAL },

  // Discord tokens & Webhooks
  { pattern: /\b[MN][A-Za-z0-9]{23}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27}\b/, label: 'DISCORD_TOKEN', severity: SecretSeverity.CRITICAL },
  { pattern: /https:\/\/discord\.com\/api\/webhooks\/[0-9]{18,20}\/[A-Za-z0-9_-]{68,}/, label: 'DISCORD_WEBHOOK', severity: SecretSeverity.CRITICAL },

  // Twilio SID & Auth Token
  { pattern: /\bAC[a-f0-9]{32}\b/, label: 'TWILIO_SID', severity: SecretSeverity.HIGH },
  { pattern: /\b[a-f0-9]{32}\b/, label: 'TWILIO_AUTH_TOKEN_CANDIDATE', severity: SecretSeverity.MEDIUM }, // Twilio tokens are raw 32-char hex strings often found near SIDs

  // SendGrid API key
  { pattern: /\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}\b/, label: 'SENDGRID_KEY', severity: SecretSeverity.CRITICAL },
  
  // OpenAI & Anthropic API keys (Updated for Legacy, Project, and Claude token formats)
  { pattern: /\bsk-[A-Za-z0-9]{32,}\b/, label: 'OPENAI_KEY_LEGACY', severity: SecretSeverity.CRITICAL },
  { pattern: /\bsk-proj-[A-Za-z0-9-_]{40,}\b/, label: 'OPENAI_PROJECT_KEY', severity: SecretSeverity.CRITICAL },
  { pattern: /\bsk-ant-sid01-[A-Za-z0-9-_]{93}\b/, label: 'ANTHROPIC_CLAUDE_KEY', severity: SecretSeverity.CRITICAL },

  // Generic UUID-like tokens
  { pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i, label: 'UUID_SECRET_CANDIDATE', severity: SecretSeverity.MEDIUM },
  
  // Google & Firebase Key
  { pattern: /\bAIza[0-9A-Za-z\\-_]{35}\b/, label: 'GOOGLE_API_KEY', severity: SecretSeverity.CRITICAL },
  { pattern: /\bAIzaSy[0-9A-Za-z\\-_]{33}\b/, label: 'FIREBASE_API_KEY', severity: SecretSeverity.CRITICAL },

  // Private Key Files (Detects multi-line PEM blocks often found inside JSON/Env variables)
  { pattern: /-----BEGIN [A-Z ]+ PRIVATE KEY-----/, label: 'PRIVATE_KEY_BLOCK', severity: SecretSeverity.CRITICAL },
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
