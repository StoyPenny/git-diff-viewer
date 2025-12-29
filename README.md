# Git Diff Viewer

A clean, GitHub-style diff viewer built with React and Tailwind CSS. Upload `.diff`, `.patch`, or `.txt` files to visualize git changes with syntax highlighting and side-by-side comparison.

<img width="1331" height="861" alt="image" src="https://github.com/user-attachments/assets/15091bb8-9e56-4c18-8188-8bcc95db1596" />

## Features

- 🔒 100% client-side processing (no data sent to servers)
- 📁 Drag & drop or file upload support
- 🔄 Unified and split view modes
- 🌓 Dark mode support
- 📊 File statistics (additions/deletions)

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Usage

1. Generate a diff file: `git diff > changes.diff`
2. Open the application
3. Drag and drop your diff file or click to select
4. Toggle between unified and split views
5. Collapse/expand individual files

## Tech Stack

- React 19
- Vite
- Tailwind CSS
- Lucide React (icons)

## License

MIT
