import fs from 'fs/promises';
import path from 'path';

/**
 * Advanced TSConfig / JSConfig Compilation Path Alias Mapper
 * Resolves deeply nested route mappings, wildcards, and base URL overrides.
 */
export class PathMapper {
  constructor(context) {
    this.context = context;
    this.baseUrl = '.';
    this.absoluteBaseUrl = context.cwd;
    this.mappings = []; // Collection of { prefix, suffix, targets[] }
  }

  /**
   * Reads, cleans, and indexes custom alias entries from tsconfig.json files.
   * @param {string} tsconfigFilename - Target designator (typically tsconfig.json)
   */
  async loadMappings(tsconfigFilename = 'tsconfig.json') {
    const configPath = path.resolve(this.context.cwd, tsconfigFilename);
    
    try {
      await fs.access(configPath);
      const rawText = await fs.readFile(configPath, 'utf8');
      
      // Strip inline single-line and block comments before parsing
      // Improved regex to handle more edge cases in tsconfig comments
      const jsonCleanText = rawText
        .replace(/\/\*[\s\S]*?\*\/|(?<=[^\\:])\/\/.*$/gm, '')
        .replace(/,(\s*[\]}])/g, '$1'); // Remove trailing commas
        
      const tsconfig = JSON.parse(jsonCleanText);

      if (!tsconfig.compilerOptions) return;

      const opts = tsconfig.compilerOptions;
      
      // v6 Path Resolution Fix (Knip Issue #1794)
      // Ensure baseUrl is correctly resolved relative to the tsconfig file location
      const configDir = path.dirname(configPath);
      if (opts.baseUrl) {
        this.baseUrl = opts.baseUrl;
        this.absoluteBaseUrl = path.resolve(configDir, this.baseUrl);
      } else {
        this.absoluteBaseUrl = configDir;
      }

      if (opts.paths) {
        for (const [aliasPattern, targetArrays] of Object.entries(opts.paths)) {
          this.registerPatternRule(aliasPattern, targetArrays);
        }
      }
    } catch (error) {
      if (this.context.verbose) {
        console.warn(`⚠️ [PathMapper Override] Proceeding without custom path configurations. Source: ${error.message}`);
      }
    }
  }

  /**
   * Registers structural lookup parameters for alias strings.
   */
  registerPatternRule(pattern, targets) {
    const wildcardIndex = pattern.indexOf('*');

    if (wildcardIndex === -1) {
      this.mappings.push({
        isExact: true,
        pattern,
        targets: targets.map(t => path.normalize(t))
      });
      return;
    }

    const prefix = pattern.slice(0, wildcardIndex);
    const suffix = pattern.slice(wildcardIndex + 1);

    this.mappings.push({
      isExact: false,
      prefix,
      suffix,
      targets: targets.map(t => path.normalize(t))
    });
  }

  /**
   * Resolves a raw import specifier against mapped path patterns.
   * @param {string} specifier - Raw text from import declaration (e.g., '@ui/button')
   * @returns {Array<string>} Candidates of absolute filesystem paths to try resolving
   */
  resolveCandidatePaths(specifier) {
    const matchingCandidates = [];

    for (const rule of this.mappings) {
      if (rule.isExact) {
        if (specifier === rule.pattern) {
          rule.targets.forEach(target => {
            matchingCandidates.push(path.resolve(this.absoluteBaseUrl, target));
          });
        }
      } else {
        // Evaluate wildcard pattern matches
        if (specifier.startsWith(rule.prefix) && specifier.endsWith(rule.suffix)) {
          const extractedWildcardContent = specifier.slice(
            rule.prefix.length,
            specifier.length - rule.suffix.length
          );

          rule.targets.forEach(targetTemplate => {
            const interpolatedTarget = targetTemplate.replace('*', extractedWildcardContent);
            matchingCandidates.push(path.resolve(this.absoluteBaseUrl, interpolatedTarget));
          });
        }
      }
    }

    // Fall back to direct lookup relative to the base URL
    if (!specifier.startsWith('.') && !path.isAbsolute(specifier)) {
      matchingCandidates.push(path.resolve(this.absoluteBaseUrl, specifier));
    }

    return matchingCandidates;
  }
}
