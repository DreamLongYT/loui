# CSS-in-JS Integration

## Overview

entkapp v4.3.0 provides advanced analysis for CSS-in-JS libraries, allowing you to track styled components, emotion styles, and other CSS-in-JS patterns. This helps identify unused styles and ensures consistent styling across your codebase.

## Supported Libraries

- **styled-components**
- **emotion** (@emotion/react, @emotion/styled)
- **linaria**
- **vanilla-extract**
- **stitches**
- **jss**

## Features

### 1. Style Reference Tracking
The engine tracks how CSS-in-JS definitions are used within your components. If a styled component is defined but never rendered or referenced, it will be flagged as unused.

### 2. Theme Usage Analysis
Detects usage of theme variables and ensures that all referenced theme properties exist in your theme definition.

### 3. Global Style Detection
Identifies global style definitions and tracks their impact on the codebase.

### 4. Critical CSS Extraction
Helps identify which styles are critical for initial rendering by analyzing the dependency graph of your components.

## Configuration

Enable CSS-in-JS analysis in your `entkapp/config.json`:

```json
{
  "analysis": {
    "cssInJs": {
      "enabled": true,
      "libraries": ["styled-components", "emotion"],
      "trackUnusedStyles": true
    }
  }
}
```

## Programmatic Usage

Using the Plugin SDK to create a custom CSS-in-JS analyzer:

```javascript
import { PluginSDK } from 'entkapp/src/api/PluginSDK.js';

const MyCSSPlugin = PluginSDK.createCSSInJSPlugin({
  name: 'custom-styled-analyzer',
  libraries: ['my-custom-styled-lib']
});
```

## How it Works

The analyzer performs the following steps:

1. **Import Detection**: Identifies imports from CSS-in-JS libraries.
2. **Definition Extraction**: Finds styled component and CSS block definitions using AST analysis.
3. **Reference Mapping**: Maps where these definitions are used in JSX or other JavaScript code.
4. **Dead Style Pruning**: Flags definitions that have no references within the project.

## Example

```javascript
// src/components/Button.js
import styled from 'styled-components';

// This style is used
const StyledButton = styled.button`
  color: blue;
`;

// This style is UNUSED and will be flagged
const UnusedStyle = styled.div`
  margin: 10px;
`;

export const Button = () => (
  <StyledButton>Click me</StyledButton>
);
```

In this example, `UnusedStyle` will be detected as dead code and can be automatically removed by the self-healing engine.

## Best Practices

1. **Keep Styles Local**: Define styled components in the same file as the component that uses them to improve analysis accuracy.
2. **Use Named Exports**: If you share styles across files, use named exports to allow the engine to track usage across the module graph.
3. **Avoid Dynamic Template Strings**: While supported, static styled components are analyzed more reliably than those with complex dynamic logic.

## Troubleshooting

### Styles not being detected
Ensure the library you are using is included in the `libraries` configuration array.

### False positives for unused styles
If a style is used via dynamic property access (e.g., `styled[dynamicName]`), the static analyzer might miss it. In such cases, use an ignore comment:

```javascript
// entkapp-ignore
const DynamicStyle = styled.div` ... `;
```
