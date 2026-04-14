# pi-tools

A [pi](https://github.com/badlogic/pi-mono) extension to view and manage active tools.

## Features

- `/tools` - Opens an interactive selector to view and toggle tool states
- `/show-tools` - Displays the list of currently active tools
- Persists tool selection across session reloads and branch navigation

## Installation

```bash
pi install rwese/pi-tools
```

Or add to your settings:

```json
{
  "extensions": {
    "sources": [
      "rwese/pi-tools"
    ]
  }
}
```

## Usage

```
/tools           # Interactive tool selector
/show-tools     # Print active tools to chat
```
