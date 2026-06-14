import path from 'path';
import fs from 'fs/promises';
import { BasePlugin } from '../BasePlugin.js';

export class NextJsPlugin extends BasePlugin {
  get name() { return 'nextjs'; }

  getConfigFiles() {
    return ['next.config.js', 'next.config.mjs', 'next.config.ts'];
  }

  getRoutePatterns() {
    return [
      /\/pages\/api\//,
      /\/pages\/[a-zA-Z0-9_\-\[\]]+/i,
      /\/app\/([\w\-\[\]]+\/)+(page|route|layout|loading|error|not-found)\.(ts|tsx|js|jsx)$/
    ];
  }

  getRequiredSystemContracts() {
    return ['default', 'getServerSideProps', 'getStaticProps', 'getStaticPaths', 'generateMetadata', 'middleware'];
  }

  async isActive(baseDir) {
    for (const file of this.getConfigFiles()) {
      try {
        await fs.access(path.join(baseDir, file));
        return true;
      } catch {}
    }
    return false;
  }
}
