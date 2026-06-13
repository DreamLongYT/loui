import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "pkg-scaffold Docs",
  description: "An advanced, AST-driven dependency resolution, refactoring, and self-healing engine.",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide' },
      { text: 'Reference', link: '/reference' }
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide' }
        ]
      },
      {
        text: 'CLI',
        items: [
          { text: 'Reference', link: '/reference' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/DreamLongYT/pkg-scaffold' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 DreamLongYT'
    }
  }
})
