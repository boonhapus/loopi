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
    { "action": "wait", "for": 1600 },
    { "action": "zoom", "on": "textarea[name=\"q\"]", "magnify": 1.5, "duration": 500 },
    { "action": "type", "selector": "textarea[name=\"q\"]", "text": "who is from the streets, per se?", "delay": 70 },
    { "action": "wait", "for": 1000 },
    { "action": "type", "selector": "textarea[name=\"q\"]", "text": "interesting... yes..", "delay": 70 },
    { "action": "wait", "for": 1500 },
    { "action": "type", "selector": "textarea[name=\"q\"]", "text": "interesting..", "delay": 70 },
    { "action": "wait", "for": 2000 },
    { "action": "unzoom", "duration": 500 },
    { "action": "wait", "for": 1500 }
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

### Spec format

A spec is a JSON file with session settings at the top level and a `steps` array of actions executed in order. Loopi launches a browser, runs each step while recording, then exports MP4 or GIF.

#### Complete example

```json
{
  "baseUrl": "https://example.com",
  "viewport": { "width": 1920, "height": 1080 },
  "speed": 1.5,
  "geolocation": { "latitude": 37.7749, "longitude": -122.4194, "accuracy": 100 },
  "permissions": ["geolocation"],
  "steps": [
    { "action": "geolocate", "latitude": 40.7128, "longitude": -74.0060 },
    { "action": "navigate", "url": "/" },
    { "action": "wait", "for": "NETWORK_IDLE" },
    { "action": "hover", "selector": ".nav-menu" },
    { "action": "click", "selector": "a[href='/stores']" },
    { "action": "wait", "for": 800 },
    { "action": "scroll", "to": "bottom", "smooth": true },
    { "action": "zoom", "on": ".store-card:first-child", "magnify": 1.5, "duration": 500 },
    { "action": "highlight", "selector": ".store-card:first-child", "style": "pulse", "duration": 1200 },
    { "action": "unzoom", "duration": 500 },
    { "action": "type", "selector": "input[name='search']", "text": "hello world", "delay": 70 },
    { "action": "press", "key": "Enter" },
    { "action": "wait", "for": ".results", "timeout": 10000 },
    { "action": "geolocate", "clear": true }
  ]
}
```

#### Top-level fields

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `baseUrl` | yes | — | Base URL for relative `navigate` URLs (e.g. `"/about"` → `https://example.com/about`) |
| `steps` | yes | — | Ordered array of action objects. Each object must include `"action"`. |
| `viewport` | no | `1280×720` | Browser window size: `{ "width": number, "height": number }` |
| `speed` | no | `1.5` | Playback speed multiplier in the exported video. Overridden by CLI `--speed` / `-s`. |
| `geolocation` | no | — | Mock GPS for the whole session: `{ "latitude": number, "longitude": number, "accuracy"?: number }`. Auto-grants the geolocation permission if not listed under `permissions`. |
| `permissions` | no | — | Browser permissions to pre-grant at context creation (e.g. `["geolocation"]`). See [Playwright permissions](https://playwright.dev/docs/api/class-browsercontext#browser-context-grant-permissions). |

#### Actions

Every step is an object with `"action"` set to one of the values below.

##### `navigate`

Load a page. Relative URLs are resolved against `baseUrl`.

| Field | Required | Description |
|-------|----------|-------------|
| `url` | yes | Absolute URL (`https://…`) or path relative to `baseUrl` (`/`, `/about`) |

```json
{ "action": "navigate", "url": "/" }
{ "action": "navigate", "url": "https://other.example.com" }
```

##### `wait`

Pause until a duration elapses, a selector appears, or a load state is reached.

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `for` | yes | — | **Number** — wait N milliseconds. **String selector** — wait until the element is visible. **Sentinel** — `"NETWORK_IDLE"`, `"LOAD"`, or `"DOMCONTENTLOADED"`. |
| `timeout` | no | `30000` | Max wait in ms (selector and sentinel forms only) |

```json
{ "action": "wait", "for": 1000 }
{ "action": "wait", "for": ".loaded", "timeout": 10000 }
{ "action": "wait", "for": "NETWORK_IDLE" }
```

##### `type`

Move the cursor to an element, click it, clear it, then type text character by character.

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `selector` | yes | — | CSS selector |
| `text` | yes | — | Text to type |
| `delay` | no | `60` | Delay between keystrokes in ms |

```json
{ "action": "type", "selector": "input[name='q']", "text": "hello", "delay": 70 }
```

##### `click`

Move the cursor to an element and click it.

| Field | Required | Description |
|-------|----------|-------------|
| `selector` | yes | CSS selector |

```json
{ "action": "click", "selector": "button[type='submit']" }
```

##### `hover`

Move the cursor to an element and hover (menus, tooltips, hover states).

| Field | Required | Description |
|-------|----------|-------------|
| `selector` | yes | CSS selector |

```json
{ "action": "hover", "selector": ".dropdown-toggle" }
```

##### `press`

Press a keyboard key (no cursor movement).

| Field | Required | Description |
|-------|----------|-------------|
| `key` | yes | Key name accepted by Playwright (e.g. `"Enter"`, `"Escape"`, `"Tab"`) |

```json
{ "action": "press", "key": "Enter" }
```

##### `scroll`

Scroll the page or bring an element into view.

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `to` | yes | — | `"top"` or `"bottom"` — scroll to page edge. **Number** — scroll by N pixels (`400` down, `-400` up). **String** — signed number (`"+400"`, `"-200"`) or CSS selector to scroll into view. |
| `smooth` | no | `true` | Use smooth scrolling for pixel/edge scrolls |

```json
{ "action": "scroll", "to": "top" }
{ "action": "scroll", "to": 400 }
{ "action": "scroll", "to": "#section-2", "smooth": false }
```

##### `zoom`

Scale the page around an element's center (camera-style focus).

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `on` | yes | — | CSS selector to zoom on |
| `magnify` | yes | — | Scale factor as a number (`1.5`) or percentage string (`"150%"`) |
| `duration` | no | `400` | Transition length in ms |

```json
{ "action": "zoom", "on": "textarea[name='q']", "magnify": 1.5, "duration": 500 }
```

##### `unzoom`

Return to normal scale after a `zoom` step.

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `duration` | no | `400` | Transition length in ms |

```json
{ "action": "unzoom", "duration": 500 }
```

##### `highlight`

Draw a temporary ring around an element to draw the viewer's eye.

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `selector` | yes | — | CSS selector |
| `duration` | no | `1000` | How long the highlight stays visible in ms |
| `color` | no | `"#FFD60A"` | CSS color |
| `style` | no | `"outline"` | `"outline"` (static ring) or `"pulse"` (animated) |

```json
{ "action": "highlight", "selector": ".cta", "style": "pulse", "duration": 1200 }
```

##### `geolocate`

Mock GPS coordinates and grant geolocation permission. Use **before** `navigate` when the page reads location on load. Can also change or clear location mid-scenario.

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `latitude` | yes* | — | Latitude between -90 and 90 |
| `longitude` | yes* | — | Longitude between -180 and 180 |
| `accuracy` | no | `0` | Accuracy radius in meters |
| `grant` | no | `true` | Call `grantPermissions(['geolocation'])` before setting coordinates |
| `origin` | no | `baseUrl` origin | Scope the permission grant to a specific origin |
| `clear` | no | `false` | Emulate position unavailable (`setGeolocation(null)`). When `true`, `latitude` / `longitude` are not required. |

\* Not required when `clear` is `true`.

```json
{ "action": "geolocate", "latitude": 37.7749, "longitude": -122.4194 }
{ "action": "geolocate", "latitude": 40.7128, "longitude": -74.0060, "accuracy": 100 }
{ "action": "geolocate", "clear": true }
```

**Geolocation tips:** Set session-wide coords via top-level `geolocation` when they never change. Use a `geolocate` step when you need to set or update location at a specific point in the demo. Top-level `geolocation` and a `geolocate` step can be combined — the step overrides the context for subsequent page loads.

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