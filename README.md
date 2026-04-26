# <img src="docs/loopi.png" alt="Loopi" width="128" style="vertical-align: middle;" /> Loopi

Turn a spec into shareable demo videos in seconds.

## Example

```bash
loopi examples/google-search.json --output examples/output --format gif
```

<details>
<summary><code>examples/google-search.json</code></summary>

```json
{
  "baseUrl": "https://www.google.com",
  "viewport": { "width": 1920, "height": 1080 },
  "speed": 1.5,
  "steps": [
    { "action": "navigate", "url": "/" },
    { "action": "wait", "ms": 1600 },
    { "action": "type", "selector": "textarea[name=\"q\"]", "text": "who is from the streets, per se?", "delay": 70 },
    { "action": "wait", "ms": 1000 },
    { "action": "type", "selector": "textarea[name=\"q\"]", "text": "interesting... yes..", "delay": 70 },
    { "action": "wait", "ms": 1500 },
    { "action": "type", "selector": "textarea[name=\"q\"]", "text": "interesting..", "delay": 70 },
    { "action": "wait", "ms": 2000 }
  ]
}
```

</details>

<p align="center">
  <img src="examples/output/google-search.gif" alt="Google Search Demo" />
</p>

## Quick start

```bash
# Clone and install
npm install
npx playwright install chromium

# Run via npx (no install needed)
npx loopi examples/google-search.json

# Or install globally for CLI access
npm install -g .
loopi examples/google-search.json
```

## Usage

```bash
loopi <scenario.json> [options]
```

### Options

| Flag | Alias | Description | Default |
|------|-------|-------------|---------|
| `--browser` | `-b` | Browser engine (chromium, firefox, webkit) | chromium |
| `--format` | `-f` | Output format (mp4, gif) | mp4 |
| `--output` | `-o` | Output directory | ./output |
| `--speed` | `-s` | Playback speed multiplier | 1.5 |
| `-n` | `--dry-run` | Execute the spec without recording or writing output | `false` |
| `-N` | `--name` | Output filename without extension | `<scenario-name>` |
| `-h` | `--help` | Show help | |

### Spec Format

Specs are JSON files that define a sequence of actions to record. Structure:

```json
{
  "baseUrl": "https://example.com",
  "viewport": { "width": 1920, "height": 1080 },
  "speed": 1.5,
  "steps": [
    { "action": "navigate", "url": "/" },
    { "action": "wait", "ms": 1000 },
    { "action": "type", "selector": "input[name='q']", "text": "hello", "delay": 70 },
    { "action": "click", "selector": "button[type='submit']" },
    { "action": "press", "key": "Enter" }
  ]
}
```

**Top-level fields:**
- `baseUrl` (required) — Base URL for relative navigation
- `viewport` (optional) — Browser dimensions `{ width, height }`. Default: `1920x1080`
- `speed` (optional) — Playback speed multiplier. Default: `1.5`
- `steps` (required) — Array of actions

**Available actions:**
- `navigate` — Navigate to a URL
  - `url` (required) — Absolute or relative URL
- `type` — Type text into an element
  - `selector` (required) — CSS selector
  - `text` (required) — Text to type
  - `delay` (optional) — Delay between keystrokes in ms. Default: `60`
- `click` — Click an element
  - `selector` (required) — CSS selector
- `hover` — Hover over an element (shows menus, tooltips, hover states)
  - `selector` (required) — CSS selector
- `press` — Press a keyboard key
  - `key` (required) — Key name (e.g., `"Enter"`, `"Escape"`)
- `wait` — Wait for a condition (ms, selector, or load state)
  - `for` (required) — Milliseconds (number), selector to wait for (string), or sentinel (`"NETWORK_IDLE"`, `"LOAD"`, `"DOMCONTENTLOADED"`)
  - `timeout` (optional) — Max wait in ms for selector/sentinel forms. Default: `30000`
- `scroll` — Scroll the page
  - `to` (required) — `"top"`, `"bottom"`, a signed number (e.g. `400` or `-400`), or a CSS selector
  - `smooth` (optional) — Smooth scroll. Default: `true`
- `zoom` — Zoom in on an element
  - `on` (required) — CSS selector to zoom on
  - `magnify` (required) — Scale factor (e.g. `1.5` or `"150%"`)
  - `duration` (optional) — Transition length in ms. Default: `400`
- `unzoom` — Return from zoom
  - `duration` (optional) — Transition length in ms. Default: `400`
- `highlight` — Draw a visible ring around an element
  - `selector` (required) — CSS selector to highlight
  - `duration` (optional) — How long to show the highlight in ms. Default: `1000`
  - `color` (optional) — CSS color. Default: `"#FFD60A"`
  - `style` (optional) — `"outline"` (static) or `"pulse"` (animated). Default: `"outline"`

### Examples

```bash
# Default: MP4 output at 1.5x speed
loopi examples/google-search.json

# GIF output at 2x speed
loopi examples/google-search.json --format gif --speed 2

# Custom output directory
loopi examples/google-search.json --output ./dist

# Custom filename
loopi examples/google-search.json --name my-demo --format gif

# Validate spec without recording
loopi examples/google-search.json --dry-run
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details on setting up your development environment, running tests, and our commit conventions.