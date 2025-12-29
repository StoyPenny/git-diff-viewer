import React, { useState, useCallback, useMemo } from 'react';
import { Upload, FileCode, Split, LayoutList, X, ChevronDown, ChevronRight, Copy, Check, Moon, Sun } from 'lucide-react';

/**
 * A robust, single-file React application to view Git Diffs.
 * Mimics GitHub's visual style for additions, deletions, and metadata.
 */

// --- Helper Functions for Parsing ---

const parseDiff = (diffText) => {
  if (!diffText) return [];

  const files = [];
  let currentFile = null;
  let currentHunk = null;
  
  const lines = diffText.split('\n');

  // Simple state machine for parsing
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect new file start (git diff header)
    if (line.startsWith('diff --git')) {
      if (currentFile) {
        if (currentHunk) currentFile.hunks.push(currentHunk);
        files.push(currentFile);
      }
      
      currentFile = {
        header: line,
        oldName: '',
        newName: '',
        meta: [],
        hunks: []
      };
      currentHunk = null;
      continue;
    }

    // Capture file names (--- a/file, +++ b/file)
    if (line.startsWith('--- a/')) {
      if (currentFile) currentFile.oldName = line.substring(6);
      continue;
    }
    if (line.startsWith('+++ b/')) {
      if (currentFile) currentFile.newName = line.substring(6);
      continue;
    }

    // Capture hunk header (@@ -1,4 +1,5 @@)
    if (line.startsWith('@@ ')) {
      if (currentFile) {
        if (currentHunk) currentFile.hunks.push(currentHunk);
        
        // Parse line numbers
        const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
        const oldStart = match ? parseInt(match[1]) : 0;
        const newStart = match ? parseInt(match[3]) : 0;

        currentHunk = {
          header: line,
          lines: [],
          oldStart,
          newStart
        };
      }
      continue;
    }

    // Content lines
    if (currentFile && currentHunk) {
      // Determine type
      let type = 'context';
      if (line.startsWith('+')) type = 'add';
      else if (line.startsWith('-')) type = 'delete';
      else if (line.startsWith('\\')) type = 'no-newline';

      currentHunk.lines.push({
        content: line,
        type: type
      });
    } else if (currentFile) {
      // Metadata lines before the first hunk (index, new file mode, etc.)
      currentFile.meta.push(line);
    }
  }

  // Push last file
  if (currentFile) {
    if (currentHunk) currentFile.hunks.push(currentHunk);
    files.push(currentFile);
  }

  return files;
};


// --- Components ---

const DiffLine = ({ type, content, oldNum, newNum, viewMode }) => {
  // Styles based on GitHub's variable system (approximated with Tailwind)
  let bgClass = '';
  let textClass = 'text-gray-800 dark:text-gray-300';
  let prefix = ' ';

  if (type === 'add') {
    bgClass = 'bg-green-100 dark:bg-green-900/30';
    textClass = 'text-gray-900 dark:text-gray-100';
    prefix = '+';
  } else if (type === 'delete') {
    bgClass = 'bg-red-100 dark:bg-red-900/30';
    textClass = 'text-gray-900 dark:text-gray-100';
    prefix = '-';
  } else if (type === 'hunk-header') {
    bgClass = 'bg-blue-50 dark:bg-[#111b29] text-gray-500';
    textClass = 'text-gray-500 dark:text-gray-400';
  }

  // Specific content styling to highlight the first character slightly differently if needed
  // But standard git diff view treats the whole line uniformly usually.
  
  if (viewMode === 'unified') {
    return (
      <div className={`flex font-mono text-xs md:text-sm leading-5 hover:opacity-100 group ${bgClass}`}>
        {/* Line Numbers */}
        <div className="w-12 flex-shrink-0 text-right pr-2 text-gray-400 select-none border-r border-gray-200 dark:border-gray-700/50 bg-white/30 dark:bg-black/10">
          {oldNum || ''}
        </div>
        <div className="w-12 flex-shrink-0 text-right pr-2 text-gray-400 select-none border-r border-gray-200 dark:border-gray-700/50 bg-white/30 dark:bg-black/10">
          {newNum || ''}
        </div>
        {/* Content */}
        <div className={`flex-1 pl-2 whitespace-pre-wrap break-all ${textClass} relative`}>
            {/* The +/- marker is often part of content in raw diffs, but sometimes we want to render it explicitly if parsed out. 
                Our parser keeps the raw line including marker. */}
            {content}
        </div>
      </div>
    );
  }

  // Split View (This component renders ONE side or a full row depending on usage, 
  // but usually split view requires syncing two columns. 
  // For simplicity in a single component, we'll handle split logic in the parent Hunk renderer).
  return null; 
};

// Split view is complex because we need to align deletions on left with additions on right if they modify the same block,
// or show them strictly sequentially. GitHub usually does strictly sequential for simple diffs or aligns them.
// We will implement a simpler "Side by Side" where left is Old, right is New.

const SplitHunk = ({ hunk }) => {
  const rows = [];
  let oldLineCounter = hunk.oldStart;
  let newLineCounter = hunk.newStart;

  // We need to iterate and possibly pair up lines, or just push them into left/right slots.
  // A simple robust approach for split view:
  // 1. Collect all deletions (left side).
  // 2. Collect all additions (right side).
  // 3. Context lines span both.
  
  // Actually, to keep it sync'd:
  // Iterate lines.
  // If Context: Show on both.
  // If Delete: Show on Left, Empty on Right.
  // If Add: Empty on Left, Show on Right.
  // If we have a block of Deletes followed by Adds, visually we often want them side-by-side. 
  // This parser handles that loosely.

  let i = 0;
  while (i < hunk.lines.length) {
    const line = hunk.lines[i];
    
    if (line.type === 'context') {
      rows.push({
        type: 'context',
        left: { num: oldLineCounter, content: line.content },
        right: { num: newLineCounter, content: line.content }
      });
      oldLineCounter++;
      newLineCounter++;
      i++;
    } else if (line.type === 'delete') {
      // check for immediate additions following this block of deletions to pair them
      // This is a naive "pairing" strategy
      rows.push({
        type: 'change',
        left: { num: oldLineCounter, content: line.content, type: 'delete' },
        right: null
      });
      oldLineCounter++;
      i++;
    } else if (line.type === 'add') {
        // Try to fill a previous empty right slot if it exists and was a change? 
        // For simplicity, we just push a row with empty left.
        // IMPROVEMENT: Check if the last row was a 'delete' with a null right, and merge into it?
        
        let merged = false;
        // Look backwards for a row that has a left-delete but NO right-add
        for (let j = rows.length - 1; j >= 0; j--) {
            if (rows[j].type === 'context') break; // Don't jump over context
            if (rows[j].left && rows[j].left.type === 'delete' && !rows[j].right) {
                rows[j].right = { num: newLineCounter, content: line.content, type: 'add' };
                merged = true;
                break; // Only fill the first available slot from the bottom of the block
            }
        }

        if (!merged) {
             rows.push({
                type: 'change',
                left: null,
                right: { num: newLineCounter, content: line.content, type: 'add' }
            });
        }
       
        newLineCounter++;
        i++;
    } else {
        // No newline or other metadata
        i++;
    }
  }

  return (
    <>
      {/* Hunk Header */}
      <tr className="bg-[#f6f8fa] dark:bg-[#111b29] text-gray-500 font-mono text-xs border-b dark:border-gray-800">
        <td colSpan={2} className="py-1 px-2 text-right w-12 border-r dark:border-gray-800">...</td>
        <td colSpan={2} className="py-1 px-4 text-left">{hunk.header}</td>
      </tr>

      {rows.map((row, idx) => (
        <tr key={idx} className="font-mono text-xs md:text-sm leading-5">
            {/* LEFT SIDE */}
            <td className={`w-12 text-right pr-2 select-none border-r dark:border-gray-800 text-gray-400 ${row.left?.type === 'delete' ? 'bg-[#ffebe9] dark:bg-[#3c1618]' : 'bg-white dark:bg-[#0d1117]'}`}>
                {row.left?.num || ''}
            </td>
            {/* Removed w-[50%] to allow colgroup to control width */}
            <td className={`whitespace-pre-wrap break-all pl-1 ${row.left?.type === 'delete' ? 'bg-[#ffebe9] dark:bg-[#3c1618] text-gray-900 dark:text-gray-100' : 'bg-white dark:bg-[#0d1117] text-gray-600 dark:text-gray-300'}`}>
               {row.left?.content || ''}
            </td>

            {/* RIGHT SIDE */}
            <td className={`w-12 text-right pr-2 select-none border-r dark:border-gray-800 text-gray-400 ${row.right?.type === 'add' ? 'bg-[#e6ffec] dark:bg-[#122b19]' : 'bg-white dark:bg-[#0d1117]'}`}>
                {row.right?.num || ''}
            </td>
            {/* Removed w-[50%] to allow colgroup to control width */}
            <td className={`whitespace-pre-wrap break-all pl-1 ${row.right?.type === 'add' ? 'bg-[#e6ffec] dark:bg-[#122b19] text-gray-900 dark:text-gray-100' : 'bg-white dark:bg-[#0d1117] text-gray-600 dark:text-gray-300'}`}>
                {row.right?.content || ''}
            </td>
        </tr>
      ))}
    </>
  );
};

const FileViewer = ({ file, viewMode, isCollapsed, toggleCollapse }) => {
  // Stats
  const adds = file.hunks.reduce((acc, h) => acc + h.lines.filter(l => l.type === 'add').length, 0);
  const dels = file.hunks.reduce((acc, h) => acc + h.lines.filter(l => l.type === 'delete').length, 0);

  return (
    <div className="mb-6 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden bg-white dark:bg-[#0d1117] shadow-sm">
      {/* File Header */}
      <div 
        className="flex items-center justify-between px-4 py-2 bg-[#f6f8fa] dark:bg-[#161b22] border-b border-gray-200 dark:border-gray-700 cursor-pointer"
        onClick={toggleCollapse}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500">
             {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </button>
          <span className="text-gray-500 font-normal">{file.oldName === file.newName ? file.newName : `${file.oldName} → ${file.newName}`}</span>
          <span className="text-xs text-gray-400 ml-2 hidden sm:inline-block">
             {file.meta.length > 0 ? file.meta[0] : ''}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1">
                <span className="text-green-600">+{adds}</span>
                <span className="text-red-600">-{dels}</span>
                <div className="flex gap-0.5 ml-2">
                    {Array.from({length: 5}).map((_, i) => {
                         // Simple visual block representation
                         const total = adds + dels;
                         const active = i < Math.ceil((total / (total + 10)) * 5); // Rough logic
                         return <div key={i} className={`w-2 h-2 rounded-sm ${active ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                    })}
                </div>
            </div>
        </div>
      </div>

      {/* File Body */}
      {!isCollapsed && (
        <div className="overflow-x-auto">
          {viewMode === 'unified' ? (
            <div className="min-w-full">
              {file.hunks.map((hunk, i) => {
                let oldLine = hunk.oldStart;
                let newLine = hunk.newStart;
                
                return (
                  <div key={i}>
                    <div className="bg-[#f1f8ff] dark:bg-[#111b29] text-gray-500 px-4 py-1 font-mono text-xs border-y dark:border-gray-700 border-[#dbedff]">
                      {hunk.header}
                    </div>
                    {hunk.lines.map((line, idx) => {
                      let o = null;
                      let n = null;
                      if (line.type !== 'add') o = oldLine++;
                      if (line.type !== 'delete') n = newLine++;
                      return (
                        <DiffLine 
                          key={idx} 
                          type={line.type} 
                          content={line.content} 
                          oldNum={o} 
                          newNum={n} 
                          viewMode="unified" 
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : (
            <table className="w-full border-collapse table-fixed">
                <colgroup>
                    <col className="w-12" />
                    <col className="w-1/2" />
                    <col className="w-12" />
                    <col className="w-1/2" />
                </colgroup>
                <tbody>
                    {file.hunks.map((hunk, i) => (
                        <SplitHunk key={i} hunk={hunk} />
                    ))}
                </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [diffText, setDiffText] = useState('');
  const [parsedFiles, setParsedFiles] = useState([]);
  const [viewMode, setViewMode] = useState('split'); // 'unified' or 'split'
  const [isDragging, setIsDragging] = useState(false);
  const [collapsedFiles, setCollapsedFiles] = useState({});
  const [isDarkMode, setIsDarkMode] = useState(false);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) readFile(file);
  };

  const readFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      setDiffText(text);
      const parsed = parseDiff(text);
      setParsedFiles(parsed);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) readFile(file);
  };

  const clearAll = () => {
    setDiffText('');
    setParsedFiles([]);
    setCollapsedFiles({});
  };

  const toggleCollapse = (fileName) => {
      setCollapsedFiles(prev => ({
          ...prev,
          [fileName]: !prev[fileName]
      }));
  };

  const toggleTheme = () => {
      setIsDarkMode(!isDarkMode);
  };

  const totalAdds = parsedFiles.reduce((acc, f) => acc + f.hunks.reduce((hAcc, h) => hAcc + h.lines.filter(l => l.type === 'add').length, 0), 0);
  const totalDels = parsedFiles.reduce((acc, f) => acc + f.hunks.reduce((hAcc, h) => hAcc + h.lines.filter(l => l.type === 'delete').length, 0), 0);

  return (
    <div className={isDarkMode ? 'dark' : ''}>
    <div className="min-h-screen bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 font-sans transition-colors duration-200">
      {/* Header */}
      <header className="bg-[#f6f8fa] dark:bg-[#161b22] border-b border-gray-200 dark:border-gray-700 py-4 px-6 sticky top-0 z-10 shadow-sm transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             <div className="bg-black dark:bg-white text-white dark:text-black p-2 rounded-lg">
                <FileCode size={24} />
             </div>
             <div>
                <h1 className="text-xl font-bold tracking-tight">Diff Viewer</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">GitHub-style diff rendering</p>
             </div>
          </div>

          <div className="flex items-center gap-3">
            {parsedFiles.length > 0 && (
                <div className="flex items-center gap-3 bg-white dark:bg-[#21262d] border border-gray-200 dark:border-gray-600 rounded-md p-1">
                <button 
                    onClick={() => setViewMode('unified')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${viewMode === 'unified' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                    <LayoutList size={16} /> Unified
                </button>
                <button 
                    onClick={() => setViewMode('split')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${viewMode === 'split' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                    <Split size={16} /> Split
                </button>
                </div>
            )}
            
            <button 
                onClick={toggleTheme}
                className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {parsedFiles.length === 0 ? (
          /* Empty State / Drop Zone */
          <div 
            className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center transition-all cursor-pointer
              ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02]' : 'border-gray-300 dark:border-gray-700 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-[#161b22]'}
            `}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('fileInput').click()}
          >
            <input 
                id="fileInput" 
                type="file" 
                accept=".diff,.txt,.patch" 
                className="hidden" 
                onChange={handleFileUpload} 
            />
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4 text-gray-500">
                <Upload size={32} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Drag & Drop a Diff File</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-sm">
              Upload a .txt, .diff, or .patch file generated by <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-xs">git diff</code> to visualize changes.
            </p>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium text-sm transition-colors shadow-sm">
              Select File
            </button>
          </div>
        ) : (
          /* Results View */
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
               <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                     Changes 
                     <span className="bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs px-2 py-1 rounded-full">{parsedFiles.length} files</span>
                  </h2>
                  <div className="text-sm text-gray-500 mt-1">
                     <span className="text-green-600 font-medium">+{totalAdds} additions</span>, <span className="text-red-600 font-medium">-{totalDels} deletions</span>
                  </div>
               </div>
               
               <div className="flex gap-2">
                   <button 
                      onClick={clearAll}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                   >
                      <X size={16} /> Clear
                   </button>
               </div>
            </div>

            {/* Files List */}
            <div className="space-y-6">
                {parsedFiles.map((file, idx) => (
                    <FileViewer 
                        key={idx} 
                        file={file} 
                        viewMode={viewMode}
                        isCollapsed={collapsedFiles[file.oldName || file.newName] || false}
                        toggleCollapse={() => toggleCollapse(file.oldName || file.newName)}
                    />
                ))}
            </div>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-8 mt-12 text-center text-sm text-gray-400">
        <p>Processed locally in your browser. No data is sent to any server.</p>
      </footer>
    </div>
    </div>
  );
}