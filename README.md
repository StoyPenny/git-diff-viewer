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

### Standard Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Docker Development

#### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+

#### Quick Start

Start the development server:
```bash
docker compose up
```

Access at: `http://localhost:5561`

#### Custom URLs (Tailscale/Network Access)

1. Copy environment template:
   ```bash
   cp .env.example .env.local
   ```

2. Set your custom hostname:
   ```bash
   VITE_CUSTOM_HOST=myserver.tail08f20.ts.net
   ```

3. Restart:
   ```bash
   docker compose down && docker compose up
   ```

4. Access via custom URL:
   ```
   http://myserver.tail08f20.ts.net:5561
   ```

#### Rebuilding
After dependency changes:
```bash
docker compose down
docker compose up --build
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
