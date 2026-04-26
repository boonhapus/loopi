# Changelog

## [1.1.0] - 2026-04-25

### Added
- **`hover`** action — drive hover states for menus and tooltips.
- **`scroll`** action — single `to` field, dispatches on value:
  `"top"` / `"bottom"` sentinels, signed numbers (relative scroll, e.g. `400` = down, `-400` = up),
  or any other string treated as a selector.
- **`zoom` / `unzoom`** actions — focus the viewer on a specific element with a smooth scale transition.
- **`highlight`** action — non-destructive overlay ring (outline or pulse) to draw the eye.
- **`--dry-run` / `-n`** flag — execute a spec without recording, with per-step timing and a non-zero exit on failure.
- **`--name` / `-N`** flag — custom output filename without extension.

### Changed
- **`wait`** now takes a single `for` field that accepts a number (ms), a selector (waits for visible),
  or the `NETWORK_IDLE` sentinel. Optional `timeout` ceiling for the latter two forms.
- `examples/google-search.json` updated to showcase `zoom` and the new `wait` syntax.

### Removed
- **`wait.ms`** is no longer supported. Migrate to `wait.for` — the validator emits a pointer error
  if it sees `ms`. This is a breaking change; pin to `1.0.x` if you need the old behavior.

### Migration
```diff
- { "action": "wait", "ms": 1000 }
+ { "action": "wait", "for": 1000 }
```

<details>
<summary>Older Releases</summary>

<details>
<summary>

### [1.0.0] - 2026-04-23

</summary>

Initial release with core actions for recording browser-based demos.

- **`navigate`** — Navigate to a URL (absolute or relative via `baseUrl`)
- **`click`** — Click an element by CSS selector
- **`type`** — Type text into an input field with configurable keystroke delay
- **`wait`** — Wait for a duration in milliseconds
- **`press`** — Press a keyboard key (e.g., Enter, Escape)
- Ghost cursor animation with smooth movement and click feedback
- Support for MP4 and GIF output formats
- Configurable viewport, playback speed, and browser engine selection

</details>

</details>