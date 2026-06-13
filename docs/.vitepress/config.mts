import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "pkg-scaffold v3.2.1 Documentation",
  base: '/pkg-scaffold/',
  head: [
    ['link', { rel: 'icon', href: '/pkg-scaffold/favicon.png' }],
    ['link', { rel: 'apple-touch-icon', href: '/pkg-scaffold/favicon.png' }],
    [
      'meta',
      { 
        name: 'google-site-verification', 
        content: '9Ao1YuH76KcgDtMO6KV8CLJQ6Tq4iCdqOrmU-MRr6ms'
      }
    ]
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
          { text: 'Migration Guide', link: '/migration' },
          { text: 'Best Practices', link: '/best-practices' },
          { text: 'Troubleshooting', link: '/troubleshooting' }
        ]
      },
      { text: 'Reference', link: '/reference' }
    ],
    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Guide', link: '/guide' },
          { text: 'Reference', link: '/reference' }
        ]
      },
      {
        text: 'API & Integration',
        items: [
          { text: 'Headless API', link: '/api-headless' },
          { text: 'Plugin SDK', link: '/plugin-sdk' },
          { text: 'CSS-in-JS Integration', link: '/css-in-js' },
          { text: 'Asset Tracking', link: '/asset-tracking' }
        ]
      },
      {
        text: 'Advanced Features',
        items: [
          { text: 'Monorepo Support', link: '/monorepo' },
          { text: 'AI Self-Healing', link: '/ai-healing' },
          { text: 'Impact Analysis', link: '/impact-analysis' }
        ]
      },
      {
        text: 'Resources',
        items: [
          { text: 'Migration Guide', link: '/migration' },
          { text: 'Best Practices', link: '/best-practices' },
          { text: 'Troubleshooting', link: '/troubleshooting' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/DreamLongYT/pkg-scaffold' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/pkg-scaffold'}
    ],
    footer: {
      message: 'Released under the Apache 2.0 License. "The original code was from the lovely DreamLong"',
      copyright: 'Copyright © 2026 DreamLongYT'
    }
  }
})
