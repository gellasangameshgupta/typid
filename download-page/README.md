# Typid Download Page

A standalone download page for distributing Typid across different platforms.

## Features

- **Auto-detect user's OS** and recommend appropriate download
- **Fetch latest version** from GitHub releases in real-time
- **Platform-specific downloads**:
  - Mac (Apple Silicon arm64 and Intel x64)
  - Windows (NSIS installer)
  - Linux (AppImage and .deb packages)
- **Beautiful, minimal design** matching Typid's aesthetic
- **Responsive design** works on all devices

## Local Testing

To test the download page locally:

```bash
cd download-page
python3 -m http.server 8000
# or
npx serve .
```

Then open http://localhost:8000 in your browser.

## Deployment

The download page is automatically deployed to GitHub Pages via GitHub Actions.

The workflow will:
1. Trigger on push to `main` or `master` branch
2. Deploy the `download-page/` directory to GitHub Pages
3. Access at: `https://gellasangameshgupta.github.io/typid/`

## Files

- `index.html` - Entry point with React and Babel via CDN
- `DownloadPage.jsx` - Main React component with OS detection and download logic (includes GitHub API utilities inline)
- `styles.css` - Styling matching Typid's minimal aesthetic
- `serve.sh` - Script to run local test server

## Customization

To customize for your own repository, edit `DownloadPage.jsx`:

```javascript
const owner = 'your-username';
const repo = 'your-repo-name';
```

## Browser Support

Works in all modern browsers (Chrome, Firefox, Safari, Edge) with JavaScript enabled.
