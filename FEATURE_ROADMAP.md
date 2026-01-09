# Typid Feature Roadmap
## Typora Feature Parity Plan

This roadmap outlines the features needed to reach feature parity with Typora, organized into prioritized phases.

---

## Current State Analysis

### What Typid Already Has
- ✅ Live preview (Milkdown WYSIWYG)
- ✅ LaTeX/Math support (KaTeX)
- ✅ Code syntax highlighting (Shiki via CodeMirror)
- ✅ Tables (basic)
- ✅ Light/Dark themes
- ✅ Auto-save (2-second debounce)
- ✅ Recent files list
- ✅ Word count & reading time
- ✅ Keyboard shortcuts (Cmd+O, S, N)
- ✅ Custom macOS updater
- ✅ Focus mode state (not implemented in UI)
- ✅ Typewriter mode state (not implemented in UI)

### Gap Analysis (Typora Features Missing)
| Feature | Priority | Complexity |
|---------|----------|------------|
| Focus Mode (blur non-active) | High | Low |
| Typewriter Mode (center line) | High | Low |
| File Tree Browser | High | Medium |
| Outline/TOC Panel | High | Medium |
| Find & Replace | High | Medium |
| Image Drag & Drop | High | Low |
| Export to PDF/DOCX | Medium | High |
| Spellcheck | Medium | Medium |
| Custom Themes | Medium | Medium |
| YAML Front Matter | Medium | Low |
| Internal Links (headers) | Medium | Medium |
| Smart Punctuation | Low | Low |
| Text Snippets | Low | Medium |
| RTL Support | Low | Medium |
| Zoom Controls | Low | Low |

---

## Phase 1: Core Writing Experience
**Goal:** Match Typora's distraction-free writing modes
**Estimated Scope:** Small

### 1.1 Focus Mode Implementation
- Blur/fade paragraphs that aren't being actively edited
- CSS transitions for smooth visual effect
- Toggle via menu and keyboard shortcut (Cmd+Shift+F)

### 1.2 Typewriter Mode Implementation
- Keep current editing line vertically centered
- Smooth scrolling animation
- Toggle via menu and keyboard shortcut (Cmd+Shift+T)

### 1.3 Enhanced Image Support
- Drag & drop images into editor
- Image resize handles
- Copy/paste images from clipboard
- Relative path support for local images

### Deliverables
- [ ] Focus mode CSS with fade effect
- [ ] Typewriter mode scroll behavior
- [ ] Image drag/drop handler
- [ ] Image resize functionality
- [ ] Settings panel updates

---

## Phase 2: File Navigation & Organization
**Goal:** Professional file management like Typora
**Estimated Scope:** Medium

### 2.1 File Tree Browser
- Folder tree in sidebar
- Watch for file system changes
- Create/rename/delete files
- Drag to reorder/move
- Filter by file type (.md, .txt)

### 2.2 Outline Panel
- Parse headings from document
- Click to navigate
- Show heading hierarchy
- Auto-update on content change
- Collapsible sections

### 2.3 Table of Contents
- Generate `[TOC]` block
- Auto-update with document changes
- Click-to-navigate links

### 2.4 Find & Replace
- Cmd+F for find
- Cmd+Shift+F for find & replace
- Regex support
- Match case toggle
- Replace all option

### Deliverables
- [ ] FileTree component with IPC for directory reading
- [ ] Outline panel component
- [ ] TOC generation in Milkdown
- [ ] Find/Replace overlay component
- [ ] Keyboard shortcuts registration

---

## Phase 3: Export & Integration
**Goal:** Professional document export capabilities
**Estimated Scope:** High

### 3.1 PDF Export
- Native PDF generation
- Print-friendly CSS
- Page break support
- Header/footer options
- Table of contents in PDF

### 3.2 Multi-Format Export (via Pandoc)
- DOCX (Microsoft Word)
- ODT (OpenDocument)
- LaTeX (.tex)
- HTML (standalone)
- ePub (ebooks)
- RTF

### 3.3 Export Settings
- Custom CSS for exports
- Page size selection
- Margin configuration
- Font embedding options

### Deliverables
- [ ] PDF export using electron-pdf or puppeteer
- [ ] Pandoc integration (bundled or system)
- [ ] Export dialog UI
- [ ] Export presets storage
- [ ] Progress indicator for exports

---

## Phase 4: Writing Assistance
**Goal:** Help users write better
**Estimated Scope:** Medium

### 4.1 Spellcheck
- System spellcheck integration
- Custom dictionary support
- Ignore code blocks
- Multiple language support
- Right-click corrections

### 4.2 Smart Punctuation (SmartyPants)
- Convert straight quotes to curly
- Em-dashes from double hyphens
- Ellipsis from triple dots
- Toggle on/off

### 4.3 YAML Front Matter
- Syntax highlighting for YAML block
- Template insertion
- Parse and display metadata
- Hide in preview mode option

### 4.4 Internal Links
- Link to other .md files
- Link to headers within document
- Auto-complete for available targets
- Broken link detection

### Deliverables
- [ ] Spellcheck service integration
- [ ] SmartyPants text transformation
- [ ] YAML front matter parser
- [ ] Internal link resolver
- [ ] Link auto-complete dropdown

---

## Phase 5: Customization & Theming
**Goal:** User personalization
**Estimated Scope:** Medium

### 5.1 Custom Themes
- Theme file format (CSS-based)
- Theme import/export
- Live preview while editing
- Built-in theme gallery (5-10 themes)

### 5.2 Typography Settings
- Font family selection
- Font size adjustment
- Line height control
- Paragraph spacing
- Writing area width

### 5.3 Keyboard Shortcuts
- Customizable shortcuts
- Conflict detection
- Import/export shortcut profiles
- Reset to defaults

### 5.4 Text Snippets
- Define custom snippets
- Trigger with keywords
- Variable substitution (date, time, clipboard)
- Snippet management UI

### Deliverables
- [ ] Theme engine and loader
- [ ] Typography settings panel
- [ ] Shortcut customization UI
- [ ] Snippet manager component
- [ ] Settings persistence

---

## Phase 6: Accessibility & Polish
**Goal:** Professional-grade polish
**Estimated Scope:** Medium

### 6.1 RTL Language Support
- Detect RTL text automatically
- Manual override option
- Mixed LTR/RTL handling

### 6.2 Zoom Controls
- Cmd+/- for zoom
- Zoom indicator in status bar
- Reset to 100%
- Remember zoom per document

### 6.3 Reading Mode
- Full-screen reading view
- Hide all UI except content
- Page-flip navigation

### 6.4 Performance Optimization
- Virtual scrolling for large documents
- Lazy rendering of complex elements
- Memory usage optimization

### Deliverables
- [ ] RTL detection and rendering
- [ ] Zoom implementation
- [ ] Reading mode UI
- [ ] Performance profiling and fixes
- [ ] Accessibility audit (WCAG)

---

## Phase Summary

| Phase | Focus Area | Dependencies |
|-------|------------|--------------|
| 1 | Core Writing | None |
| 2 | File Navigation | Phase 1 |
| 3 | Export | Phase 2 (for TOC in exports) |
| 4 | Writing Assistance | Phase 1 |
| 5 | Customization | Phase 1-2 |
| 6 | Accessibility | Phase 1-5 |

---

## Quick Wins (Can Be Done Anytime)
These are low-effort features that provide immediate value:

1. **Focus Mode CSS** - Just needs CSS, state already exists
2. **Typewriter Mode** - Simple scroll behavior
3. **Smart Punctuation** - Text substitution on input
4. **Zoom Controls** - CSS transform scaling
5. **YAML Front Matter** - Already supported by Milkdown, needs UI

---

## Technical Considerations

### Dependencies to Add
```json
{
  "electron-pdf": "for PDF export",
  "chokidar": "for file watching",
  "nodehun": "for spellcheck (optional)",
  "gray-matter": "for YAML front matter parsing"
}
```

### IPC Channels Needed
- `read-directory` - File tree browsing
- `watch-directory` - File system changes
- `export-pdf` - PDF generation
- `export-pandoc` - Pandoc conversion
- `spellcheck` - System spellcheck access

### State Management Additions
```typescript
interface AdditionalState {
  // File browser
  workspaceRoot: string | null
  expandedFolders: string[]

  // Outline
  showOutline: boolean
  outlinePosition: 'left' | 'right'

  // Find & Replace
  findQuery: string
  replaceQuery: string
  findOptions: FindOptions

  // Export
  lastExportPath: string | null
  exportPresets: ExportPreset[]

  // Customization
  customTheme: string | null
  snippets: Snippet[]
  customShortcuts: ShortcutMap

  // Display
  zoomLevel: number
  readingMode: boolean
}
```

---

## Recommended Implementation Order

For fastest path to Typora parity:

1. **Week 1-2:** Phase 1 (writing modes + images)
2. **Week 3-4:** Phase 2.4 (find & replace - high impact)
3. **Week 5-6:** Phase 2.1-2.3 (file tree + outline)
4. **Week 7-8:** Phase 3.1 (PDF export)
5. **Ongoing:** Phase 4-6 features as time permits

---

## Success Metrics

- [ ] User can write in distraction-free focus mode
- [ ] User can navigate large documents via outline
- [ ] User can search within documents
- [ ] User can export to PDF for sharing
- [ ] User can customize appearance
- [ ] Performance remains smooth with 10k+ line documents
