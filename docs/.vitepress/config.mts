import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "loui Documentation",
  base: '/loui/',
  head: [
    ['link', { rel: 'icon', href: '/logo.png' }],
    [
      'meta',
      { 
        name: 'google-site-verification', 
        content: '9Ao1YuH76KcgDtMO6KV8CLJQ6Tq4iCdqOrmU-MRr6ms'
      }
    ],
    ['meta', { name: 'keywords', content: 'loui, monorepo framework, project skeleton generator, pnpm workspace tool, plugin sdk, security, secret scanner, hardcoded secrets, dead code detection, dependency audit, code, knip, pkg, scaffold, auto, automation, javascript, node, npm, pnpm, js, unused, oxc, typescript, dependencies, depencies, devdependencies, devdepencies, generator, monorepo, setup, yarn, package, scaffolding, ts'}],
    ['meta', { property: 'og:title', content: 'loui - Monorepo Scaffolding Engine' }],
    ['meta', { property: 'og:description', content: 'Automatically generate project structures, detect dead code, find hardcoded secrets, and manage plugin ecosystems seamlessly.' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:url', content: 'https://dreamlongyt.github.io/loui/' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'loui - Enterprise Codebase Janitor' }],
    ['meta', { name: 'twitter:description', content: 'OXC-powered analysis for dead code, unused exports, and hardcoded secrets.' }]
  ],
  description: "The Ultimate Enterprise Codebase Janitor - OXC-Powered, Type-Aware, and Self-Healing",
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide' },
      { 
        text: 'API & SDK', 
        items: [
          { text: 'Headless API', link: '/api-headless' },
          { text: 'Plugin SDK', link: '/plugin-sdk' }
        ]
      },
      {
        text: 'Features',
        items: [
          { text: 'Circular Detection', link: '/guide#circular-dependency-tracking' },
          { text: 'CSS-in-JS', link: '/css-in-js' },
          { text: 'Asset Tracking', link: '/asset-tracking' },
          { text: 'Monorepo Support', link: '/monorepo' },
          { text: 'AI Self-Healing', link: '/ai-healing' },
          { text: 'Impact Analysis', link: '/impact-analysis' }
        ]
      },
      {
        text: 'Resources',
        items: [
          { text: 'Best Practices', link: '/best-practices' },
          { text: 'Troubleshooting', link: '/troubleshooting' }
        ]
      },
      { text: 'Reference', link: '/reference' }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/DreamLongYT/loui' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/loui'}
    ],
    footer: {
      message: 'Released under the Apache 2.0 License. "The Original Code was made by DreamLongYT"',
      copyright: '2026 DreamLongYT'
    }
  }
})
