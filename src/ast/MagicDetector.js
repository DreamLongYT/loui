import path from 'path';
import fs from 'fs/promises';

/**
 * Framework Semantic Archetype Classifier & Route Rule Mapping Engine
 * Automatically maps dynamic configurations where files are processed via framework conventions.
 */
export class MagicDetector {
  constructor(context) {
    this.context = context;
    // Map known system signatures directly to avoid hitting system disk access operations unnecessarily
    this.frameworkSignatures = {
      nextjs: ['next.config.js', 'next.config.mjs', '.next'],
      nuxt: ['nuxt.config.js', 'nuxt.config.ts', '.nuxt'],
      remix: ['remix.config.js', 'remix.init']
    };
  }

  /**
   * Profiles the project root to map active micro-framework runtime boundaries.
   * @param {string} rootDir - Workspace target entry directory loop point
   */
  async contextHeuristicAudit(rootDir) {
    const detected = new Set();
    for (const [framework, signatures] of Object.entries(this.frameworkSignatures)) {
      for (const sig of signatures) {
        try {
          await fs.access(path.join(rootDir, sig));
          detected.add(framework);
          break;
        } catch {
          // Rule boundary signature absent; proceed to fallback matrix sweeps
        }
      }
    }
    return Array.from(detected);
  }

  /**
   * Challenge #4 Framework Magic. Evaluates if a file path acts as an implicit route entry point.
   * @param {string} absolutePath - Absolute on-disk element reference location
   * @param {Array<string>} activeFrameworks - Context frameworks active within memory space
   */
  isImplicitlyAlive(absolutePath, activeFrameworks) {
    const normalized = absolutePath.replace(/\\/g, '/');

    for (const fx of activeFrameworks) {
      if (fx === 'nextjs') {
        // Next.js Pages API Router layout: pages/api/v1/status.ts
        if (/\/pages\/api\//.test(normalized)) return true;
        // Next.js Pages Page layout: pages/dashboard/index.tsx
        if (/\/pages\/[a-zA-Z0-9_\-\[\]]+/i.test(normalized)) return true;
        // Next.js Modern App Router architecture vectors: app/ui/analytics/page.tsx or route.ts
        if (/\/app\/([\w\-\[\]]+\/)*(page|route|layout|loading|error|not-found)\.(ts|tsx|js|jsx)$/.test(normalized)) {
          return true;
        }
        // Metadata validation indicators configurations points
        if (/(next\.config|middleware)\.(js|ts|mjs)$/.test(normalized)) return true;
      }

      if (fx === 'nuxt') {
        // Nuxt explicit dynamic pages routing matrices patterns
        if (/\/pages\//.test(normalized) && normalized.endsWith('.vue')) return true;
        // Nuxt API Server route engines implementations definitions
        if (/\/server\/(api|routes|middleware)\//.test(normalized)) return true;
        if (/nuxt\.config\.(js|ts)$/.test(normalized)) return true;
      }

      if (fx === 'remix') {
        // Remix nested route allocation configurations formats
        if (/\/app\/routes\//.test(normalized)) return true;
      }
    }

    // Common fallback overrides (Universal testing suites specs and entry configs)
    if (/\.(spec|test)\.(js|ts|tsx|jsx)$/.test(normalized)) return true;
    if (/(jest\.config|vitest\.config|webpack\.config|vite\.config)\.(js|ts|mjs|cjs)$/.test(normalized)) return true;

    return false;
  }

  /**
   * Applies custom validation rule marks directly to extracted file nodes.
   * Ensures internal method boundaries called by external managers are preserved.
   */
  applyFrameworkOverrides(filePath, fileNode, activeFrameworks) {
    if (!this.isImplicitlyAlive(filePath, activeFrameworks)) return;

    // Force activation flag to protect the file from deletion cascades
    fileNode.isLibraryEntry = true;

    // Next.js standard entry points depend on specific named method exports
    const normalized = filePath.replace(/\\/g, '/');
    if (/\/pages\//.test(normalized)) {
      // Mark server hooks as used to prevent them from being reported as dead code
      const serverHooks = ['getServerSideProps', 'getStaticProps', 'getStaticPaths'];
      serverHooks.forEach(hook => {
        if (fileNode.internalExports.has(hook)) {
          fileNode.instantiatedIdentifiers.add(hook); 
        }
      });
    }
  }
}
