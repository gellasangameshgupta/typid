# Typid

A minimal, beautiful Markdown editor.

![Typid Screenshot](docs/screenshot.png)

## Features

- **WYSIWYG Markdown** - See your formatting as you type
- **LaTeX Math** - Write `$E=mc^2$` for inline or `$$\sum_{i=1}^n$$` for blocks
- **Code Highlighting** - Syntax highlighting for 100+ languages
- **Tables** - Full GFM table support
- **Dark/Light Themes** - Easy toggle, respects system preference
- **Focus Mode** - Distraction-free writing
- **Auto-save** - Never lose your work
- **File Management** - Open, save, recent files

## Download

**Web Download Page**: Visit the [Download Page](https://gellasangameshgupta.github.io/typid/) to get the latest version for your platform - it will auto-detect your OS and recommend the appropriate download.

Alternatively, download directly from [Releases](../../releases):

| Platform | Download |
|----------|----------|
| macOS (Apple Silicon) | `Typid-x.x.x-arm64-mac.zip` |
| macOS (Intel) | `Typid-x.x.x-mac.zip` |
| Windows | `Typid-x.x.x-win.exe` |
| Linux | `Typid-x.x.x.AppImage` |

## Installation

### macOS

1. Download the `.zip` file for your Mac (ARM64 for M1/M2/M3, or Intel)
2. Extract the ZIP file
3. Drag `Typid.app` to your Applications folder
4. **First launch**: Right-click the app and select "Open" (required for unsigned apps)

> **Note**: Since the app isn't signed with an Apple Developer certificate, macOS will show a warning. This is normal for open-source apps. Right-click → Open bypasses this.

### Windows

1. Download the `.exe` installer
2. Run the installer
3. Windows SmartScreen may warn you - click "More info" → "Run anyway"

### Linux

1. Download the `.AppImage` file
2. Make it executable: `chmod +x Typid-*.AppImage`
3. Run it: `./Typid-*.AppImage`

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| New File | `Cmd/Ctrl + N` |
| Open File | `Cmd/Ctrl + O` |
| Save File | `Cmd/Ctrl + S` |
| Toggle Sidebar | Click menu icon |

## Building from Source

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/typid.git
cd typid

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for your platform
npm run build:mac    # macOS
npm run build:win    # Windows
npm run build:linux  # Linux
```

## Tech Stack

- [Electron](https://electronjs.org/) - Cross-platform desktop apps
- [React](https://reactjs.org/) - UI framework
- [Milkdown](https://milkdown.dev/) - WYSIWYG Markdown editor
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Vite](https://vitejs.dev/) - Fast builds

## License

MIT License - feel free to use, modify, and distribute.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
