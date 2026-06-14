import { TailwindPlugin, PostcssPlugin, JestPlugin, VitestPlugin, PlaywrightPlugin, CypressPlugin, StorybookPlugin, EslintPlugin, PrettierPlugin, HuskyPlugin, LintStagedPlugin, CommitlintPlugin, BabelPlugin, RollupPlugin, WebpackPlugin, GithubActionsPlugin } from './MorePlugins.js';

export function loadAdditionalPlugins(registry) {
  registry.register(new TailwindPlugin(registry.context));
  registry.register(new PostcssPlugin(registry.context));
  registry.register(new JestPlugin(registry.context));
  registry.register(new VitestPlugin(registry.context));
  registry.register(new PlaywrightPlugin(registry.context));
  registry.register(new CypressPlugin(registry.context));
  registry.register(new StorybookPlugin(registry.context));
  registry.register(new EslintPlugin(registry.context));
  registry.register(new PrettierPlugin(registry.context));
  registry.register(new HuskyPlugin(registry.context));
  registry.register(new LintStagedPlugin(registry.context));
  registry.register(new CommitlintPlugin(registry.context));
  registry.register(new BabelPlugin(registry.context));
  registry.register(new RollupPlugin(registry.context));
  registry.register(new WebpackPlugin(registry.context));
  registry.register(new GithubActionsPlugin(registry.context));
}
