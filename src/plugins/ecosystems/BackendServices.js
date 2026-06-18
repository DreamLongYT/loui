/**
 * ============================================================================
 * Backend Services Plugins for entkapp v4.1.0
 * ============================================================================
 * Built-in support for GraphQL, REST APIs, and Databases.
 */

import { BasePlugin } from '../BasePlugin.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * GraphQL Ecosystem Plugin
 */
export class GraphQLPlugin extends BasePlugin {
  get name() {
    return 'graphql';
  }

  getConfigFiles() {
    return ['package.json', 'graphql.config.js', '.graphqlconfig'];
  }

  async isActive(baseDir) {
    try {
      const pkgJson = JSON.parse(await fs.readFile(path.join(baseDir, 'package.json'), 'utf8'));
      return !!(pkgJson.dependencies?.graphql || pkgJson.devDependencies?.graphql || pkgJson.dependencies?.['@apollo/client']);
    } catch {
      return false;
    }
  }

  async analyze(node, filePath) {
    // Detect GraphQL tagged templates
    const gqlPattern = /gql\s*`([\s\S]*?)`/g;
    const matches = node.rawCode?.match(gqlPattern) || [];
    if (matches.length > 0) {
      node.graphqlQueries = matches;
    }
  }
}

/**
 * Database Ecosystem Plugin (Prisma, Drizzle, TypeORM)
 */
export class DatabasePlugin extends BasePlugin {
  get name() {
    return 'database';
  }

  getConfigFiles() {
    return ['package.json', 'prisma/schema.prisma', 'drizzle.config.ts', 'ormconfig.json'];
  }

  async analyze(node, filePath) {
    // Detect DB usage
    if (node.explicitImports.has('@prisma/client') || node.explicitImports.has('drizzle-orm')) {
      node.usesDatabase = true;
    }
  }
}
