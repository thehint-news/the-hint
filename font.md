# Font Usage Guide

---

## English Fonts

### Brand Name
| Property | Value |
|----------|-------|
| **Font** | Playfair Display |
| **Type** | Serif |
| **Variable** | `--font-serif` |
| **Weights** | 400, 500, 600, 700 |
| **Usage** | Logo, masthead title, brand identity |
| **Fallback** | Georgia, serif |

### Headlines
| Property | Value |
|----------|-------|
| **Font** | Playfair Display |
| **Type** | Serif |
| **Variable** | `--font-serif` |
| **Weights** | 400, 500, 600, 700 |
| **CSS Classes** | `.headline-xl`, `.headline-lg`, `.masthead-title` |
| **Fallback** | Georgia, serif |

### Sub-Headlines
| Property | Value |
|----------|-------|
| **Font** | Playfair Display |
| **Type** | Serif |
| **Variable** | `--font-serif` |
| **Weights** | 400, 500, 600, 700 |
| **CSS Classes** | `.headline-md`, `.headline-sm` |
| **Fallback** | Georgia, serif |

### Body Text
| Property | Value |
|----------|-------|
| **Primary Font** | Inter |
| **Type** | Sans-serif |
| **Variable** | `--font-sans` |
| **Weights** | 400, 500, 600, 700 |
| **CSS Classes** | `.body-text`, `.caption-text`, `.meta-text`, `.byline`, `.nav-link` |
| **Fallback Chain** | system-ui, sans-serif |

#### Complete Body Font Stack for English
```
Inter → system-ui → sans-serif
```

---

## Kannada Fonts

### Headlines (Kannada)
| Property | Value |
|----------|-------|
| **Font** | Tiro Kannada |
| **Type** | Serif |
| **Variable** | `--font-kannada-serif` |
| **Weights** | 400 |
| **Styles** | normal, italic |
| **Usage** | Kannada headlines, editorial content |
| **Fallback** | Noto Serif Kannada, serif |

### Bold Headlines (Kannada)
| Property | Value |
|----------|-------|
| **Font** | Noto Serif Kannada |
| **Type** | Serif |
| **Variable** | `--font-kannada-serif-bold` |
| **Weights** | 400, 500, 600, 700, 800, 900 |
| **Usage** | Lead story headlines, bold emphasis |
| **Fallback** | Tiro Kannada, serif |

### Body Text (Kannada)
| Property | Value |
|----------|-------|
| **Font** | Anek Kannada |
| **Type** | Sans-serif |
| **Variable** | `--font-kannada-sans` |
| **Usage** | Kannada body text, UI elements |
| **Fallback** | system-ui, sans-serif |

---

## CSS Variables Summary

### English Font Variables
| Variable | Font | Type |
|----------|------|------|
| `--font-serif` | Playfair Display | Serif |
| `--font-sans` | Inter | Sans-serif |

### Kannada Font Variables
| Variable | Font | Type |
|----------|------|------|
| `--font-kannada-serif` | Tiro Kannada | Serif |
| `--font-kannada-sans` | Anek Kannada | Sans-serif |
| `--font-kannada-serif-bold` | Noto Serif Kannada | Serif (Bold) |

### Composite Font Variables (Auto-Script Selection)
| Variable | Font Stack |
|----------|------------|
| `--font-serif-full` | Tiro Kannada → Playfair Display → Georgia → serif |
| `--font-sans-full` | Anek Kannada → Inter → system-ui → sans-serif |
| `--font-serif-bold-full` | Noto Serif Kannada → Playfair Display → Georgia → serif |

---

## Font Stack Behavior

The browser automatically selects fonts based on Unicode character scripts:

- **English characters** → Playfair Display (serif) / Inter (sans-serif)
- **Kannada characters** → Tiro Kannada / Anek Kannada / Noto Serif Kannada
- **System fallback** → Georgia / system-ui / generic
