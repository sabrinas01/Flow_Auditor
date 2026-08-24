/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./inicio.html"],
  theme: {
    extend: {
      colors: {
        // Paleta "Obsidian Refined" (Material 3 tokens, vía Stitch)
        "on-surface-variant": "#e2beba",
        "inverse-surface": "#e5e2e1",
        "on-error": "#690005",
        "surface-container-lowest": "#0e0e0e",
        "on-primary-fixed-variant": "#910a0e",
        "secondary-container": "#e49102",
        "tertiary-container": "#53a759",
        "surface-container-low": "#1c1b1b",
        "on-surface": "#e5e2e1",
        "on-primary": "#690004",
        "surface-tint": "#ffb4aa",
        "outline-variant": "#5a413d",
        "on-secondary": "#472a00",
        "primary-container": "#ff5f52",
        "surface": "#131313",
        "error-container": "#93000a",
        "on-primary-fixed": "#410002",
        "secondary-fixed": "#ffddb9",
        "primary-fixed": "#ffdad5",
        "on-background": "#e5e2e1",
        "on-tertiary": "#00390e",
        "surface-container-highest": "#353534",
        "secondary-fixed-dim": "#ffb961",
        "background": "#131313",
        "on-tertiary-fixed": "#002105",
        "on-tertiary-container": "#00360d",
        "on-error-container": "#ffdad6",
        "tertiary": "#83da85",
        "inverse-primary": "#b32822",
        "primary-fixed-dim": "#ffb4aa",
        "tertiary-fixed": "#9ff79f",
        "outline": "#a98985",
        "surface-dim": "#131313",
        "on-tertiary-fixed-variant": "#005318",
        "inverse-on-surface": "#313030",
        "primary": "#ffb4aa",
        "error": "#ffb4ab",
        "on-secondary-fixed-variant": "#663e00",
        "secondary": "#ffb961",
        "on-secondary-container": "#533200",
        "surface-container-high": "#2a2a2a",
        "surface-variant": "#353534",
        "surface-container": "#201f1f",
        "surface-bright": "#393939",
        "on-primary-container": "#640004",
        "tertiary-fixed-dim": "#83da85",
        "on-secondary-fixed": "#2b1700"
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "1rem",
        full: "9999px"
      },
      spacing: {
        "section-margin": "2.5rem",
        "stack-gap": "1.25rem",
        "item-gap": "0.75rem",
        "container-padding": "1.5rem",
        "grid-gutter": "1.5rem"
      },
      fontFamily: {
        "label-caps": ["Inter", "sans-serif"],
        "body-sm": ["Inter", "sans-serif"],
        "display-lg": ["Manrope", "sans-serif"],
        "body-md": ["Inter", "sans-serif"],
        "headline-md": ["Manrope", "sans-serif"],
        "metric-xl": ["Inter", "sans-serif"]
      },
      fontSize: {
        "label-caps": ["11px", { lineHeight: "16px", letterSpacing: "0.05em", fontWeight: "700" }],
        "body-sm": ["13px", { lineHeight: "18px", fontWeight: "500" }],
        "display-lg": ["28px", { lineHeight: "36px", letterSpacing: "-0.02em", fontWeight: "800" }],
        "body-md": ["14px", { lineHeight: "20px", fontWeight: "500" }],
        "headline-md": ["24px", { lineHeight: "32px", fontWeight: "800" }],
        "metric-xl": ["26px", { lineHeight: "34px", fontWeight: "700" }]
      }
    }
  }
};
