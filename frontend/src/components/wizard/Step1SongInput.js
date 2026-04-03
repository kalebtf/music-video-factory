import React, { useRef, useState } from 'react';
import { Music, Upload, FileText, Image as ImageIcon, X, FolderOpen, Loader2, Sparkles, Settings2, Check } from 'lucide-react';
import api from '../../lib/api';

export default function Step1SongInput({ project, updateProject, templates }) {
  const audioInputRef = useRef(null);
  const imagesInputRef = useRef(null);
  const infoInputRef = useRef(null);
  const packageInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [showImportOptions, setShowImportOptions] = useState(false);
  const [importedFiles, setImportedFiles] = useState([]);

  // AI import options
  const [aiOptions, setAiOptions] = useState({
    parseTitle: true,
    parseGenre: true,
    parseLyrics: true,
    analyzeImages: true,
    useAI: true,
  });

  const toggleOption = (key) => {
    setAiOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAudioUpload = (e) => {
    const file = e.target.files?.[0];
    if (file && (file.type === 'audio/mpeg' || file.type === 'audio/wav' || file.name.endsWith('.mp3') || file.name.endsWith('.wav'))) {
      const url = URL.createObjectURL(file);
      updateProject({ audioFile: file, audioUrl: url });
    }
  };

  const handleImagesDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer?.files || e.target.files || []);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length > 0) {
      const newImages = imageFiles.map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        url: URL.createObjectURL(file),
        status: 'approved',
        isUploaded: true,
      }));
      updateProject({ uploadedImages: [...project.uploadedImages, ...newImages] });
    }
  };

  const removeUploadedImage = (id) => {
    updateProject({ uploadedImages: project.uploadedImages.filter(img => img.id !== id) });
  };

  const parseTextBasic = (text) => {
    const lines = text.split('\n');
    const updates = {};
    let lyricsLines = [];
    let inLyrics = false;
    let titleFound = false;
    let genreFound = false;

    lines.forEach((line) => {
      const lower = line.toLowerCase().trim();
      if (!titleFound && (lower.startsWith('title:') || lower.startsWith('titulo:'))) {
        updates.title = line.substring(line.indexOf(':') + 1).trim();
        titleFound = true;
      } else if (!genreFound && (lower.startsWith('genre:') || lower.startsWith('style:') || lower.startsWith('genero:') || lower.startsWith('estilo:'))) {
        updates.genre = line.substring(line.indexOf(':') + 1).trim();
        genreFound = true;
      } else if (lower.startsWith('lyrics:') || lower.startsWith('letra:')) {
        inLyrics = true;
        const afterColon = line.substring(line.indexOf(':') + 1).trim();
        if (afterColon) lyricsLines.push(afterColon);
      } else if (inLyrics) {
        lyricsLines.push(line);
      }
    });

    if (!titleFound && !inLyrics && lines.length > 0) {
      const firstNonEmpty = lines.find(l => l.trim().length > 0);
      if (firstNonEmpty) {
        updates.title = firstNonEmpty.trim();
        const startIdx = lines.indexOf(firstNonEmpty) + 1;
        lyricsLines = lines.slice(startIdx);
      }
    }
    if (lyricsLines.length > 0) updates.lyrics = lyricsLines.join('\n').trim();
    return updates;
  };

  const parseTextWithAI = async (text) => {
    try {
      const { data } = await api.post('/ai/parse-song-info', { text });
      return { title: data.title || '', genre: data.genre || '', lyrics: data.lyrics || '' };
    } catch (err) {
      console.error('AI parsing failed:', err);
      return null;
    }
  };

  const handleInfoFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setImporting(true);
    let updates;
    if (aiOptions.useAI) {
      setImportStatus('Analyzing text with AI...');
      updates = await parseTextWithAI(text);
    }
    if (!updates) {
      setImportStatus('Parsing text...');
      updates = parseTextBasic(text);
    }
    const filtered = {};
    if (aiOptions.parseTitle && updates.title) filtered.title = updates.title;
    if (aiOptions.parseGenre && updates.genre) filtered.genre = updates.genre;
    if (aiOptions.parseLyrics && updates.lyrics) filtered.lyrics = updates.lyrics;
    updateProject(filtered);
    setImportStatus('Done!');
    setTimeout(() => { setImporting(false); setImportStatus(''); }, 2000);
  };

  const handleFolderImport = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    await processImportedFiles(files);
  };

  // Process files from drag-drop or file picker
  const processImportedFiles = async (files) => {
    if (files.length === 0) return;
    setImporting(true);
    setImportStatus('Reading files...');

    // Categorize files and build the file list
    const fileList = [];
    let textContent = '';
    const imageFiles = [];
    let audioFile = null;

    for (const file of files) {
      const name = file.name.toLowerCase();
      if (name.startsWith('.') || name === 'thumbs.db' || name === 'desktop.ini') continue;

      if (name.endsWith('.txt')) {
        textContent = await file.text();
        fileList.push({ name: file.name, type: 'text', size: file.size, status: 'done' });
      } else if (name.endsWith('.mp3') || name.endsWith('.wav')) {
        audioFile = file;
        fileList.push({ name: file.name, type: 'audio', size: file.size, status: 'done' });
      } else if (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.webp')) {
        imageFiles.push(file);
        fileList.push({ name: file.name, type: 'image', size: file.size, status: 'done' });
      } else {
        fileList.push({ name: file.name, type: 'unknown', size: file.size, status: 'skipped' });
      }
    }

    setImportedFiles(fileList);
    const updates = {};

    if (textContent) {
      let parsed = null;
      if (aiOptions.useAI && (aiOptions.parseTitle || aiOptions.parseGenre || aiOptions.parseLyrics)) {
        setImportStatus('Analyzing song info with AI... (~$0.001)');
        parsed = await parseTextWithAI(textContent);
      }
      if (!parsed) {
        setImportStatus('Parsing text...');
        parsed = parseTextBasic(textContent);
      }
      if (aiOptions.parseTitle && parsed.title) updates.title = parsed.title;
      if (aiOptions.parseGenre && parsed.genre) updates.genre = parsed.genre;
      if (aiOptions.parseLyrics && parsed.lyrics) updates.lyrics = parsed.lyrics;
    }

    if (audioFile) {
      setImportStatus('Loading audio...');
      updates.audioFile = audioFile;
      updates.audioUrl = URL.createObjectURL(audioFile);
    }

    if (imageFiles.length > 0) {
      setImportStatus(`Loading ${imageFiles.length} image(s)...`);
      const newImages = imageFiles.map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        file, url: URL.createObjectURL(file),
        status: 'approved', isUploaded: true,
      }));
      updates.uploadedImages = [...project.uploadedImages, ...newImages];

      if (aiOptions.useAI && aiOptions.analyzeImages) {
        setImportStatus('Preparing images for AI analysis... (~$0.005)');
        try {
          const imageDataUris = [];
          for (const imgFile of imageFiles.slice(0, 3)) {
            const base64 = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = (ev) => resolve(ev.target.result);
              reader.readAsDataURL(imgFile);
            });
            imageDataUris.push(base64);
          }
          updates.imageDataUris = imageDataUris;
        } catch (err) {
          console.error('Failed to prepare images:', err);
        }
      }
    }

    updateProject(updates);
    const parts = [];
    if (updates.title) parts.push(`Title: "${updates.title}"`);
    if (updates.genre) parts.push(`Genre: ${updates.genre}`);
    if (updates.audioFile) parts.push('Audio');
    if (imageFiles.length > 0) parts.push(`${imageFiles.length} image(s)`);
    setImportStatus(parts.length > 0 ? `Imported: ${parts.join(' · ')}` : 'No compatible files found');
    setTimeout(() => { setImporting(false); setImportStatus(''); }, 4000);
  };

  const selectTemplate = (template) => {
    if (project.templateId === template._id) {
      updateProject({ templateId: null, template: null, concept: { ...project.concept, theme: '', mood: '', palette: ['#1a1a2e', '#e94560', '#0f3460', '#f0a500'], prompts: ['', '', ''], hooks: [] } });
    } else {
      updateProject({ templateId: template._id, template, concept: { ...project.concept, theme: template.visualStyle || '', mood: template.animationStyle || '', palette: template.colorPalette || ['#1a1a2e', '#e94560', '#0f3460', '#f0a500'], prompts: template.imagePrompts || ['', '', ''], hooks: template.textHooks || [] } });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="font-heading text-2xl font-bold text-[#f8f8f8] mb-2">Song Input</h2>
        <p className="text-[#8b8b99]">Enter your song details or import a song package</p>
      </div>

      {/* Smart Import Section */}
      <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#e94560]" />
            <span className="text-sm font-medium text-[#f8f8f8]">Smart Import</span>
          </div>
          <button onClick={() => setShowImportOptions(!showImportOptions)} className="flex items-center gap-1 text-xs text-[#8b8b99] hover:text-[#f8f8f8] transition-all">
            <Settings2 className="w-3 h-3" />
            {showImportOptions ? 'Hide options' : 'AI Options'}
          </button>
        </div>

        {showImportOptions && (
          <div className="bg-[#0c0c0f] rounded-lg p-4 mb-3 space-y-3">
            {/* Master Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#f8f8f8] font-medium">Use AI for import</span>
              <button
                onClick={() => {
                  const v = !aiOptions.useAI;
                  setAiOptions({ parseTitle: v, parseGenre: v, parseLyrics: v, analyzeImages: v, useAI: v });
                }}
                className={`w-10 h-5 rounded-full transition-all relative ${aiOptions.useAI ? 'bg-[#e94560]' : 'bg-[#2a2a35]'}`}
              >
                <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: aiOptions.useAI ? '22px' : '2px' }} />
              </button>
            </div>
            
            {aiOptions.useAI && (
              <div className="space-y-2 pl-2 border-l-2 border-[#2a2a35] ml-1">
                {[
                  { key: 'parseTitle', label: 'Detect title', cost: 'included' },
                  { key: 'parseGenre', label: 'Detect genre / style', cost: 'included' },
                  { key: 'parseLyrics', label: 'Extract lyrics', cost: 'included' },
                  { key: 'analyzeImages', label: 'Analyze reference images', cost: '~$0.005' },
                ].map(({ key, label, cost }) => (
                  <label key={key} className="flex items-center justify-between cursor-pointer group">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={aiOptions[key]} onChange={() => toggleOption(key)}
                        className="w-4 h-4 rounded border-[#2a2a35] bg-[#0c0c0f] text-[#e94560] focus:ring-[#e94560] focus:ring-offset-0 cursor-pointer" />
                      <span className="text-sm text-[#8b8b99] group-hover:text-[#f8f8f8] transition-all">{label}</span>
                    </div>
                    <span className="text-xs text-[#8b8b99]">{cost}</span>
                  </label>
                ))}
                <p className="text-xs text-[#8b8b99] mt-2">
                  Est. cost: ~$0.001{aiOptions.analyzeImages ? ' + $0.005 for images' : ''} per import
                </p>
              </div>
            )}
            {!aiOptions.useAI && (
              <p className="text-xs text-[#8b8b99]">AI off — uses basic text parsing (looks for "Title:", "Genre:", "Lyrics:" labels). Free.</p>
            )}
          </div>
        )}

        {/* Import Buttons + Drag-Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); }}
          onDrop={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOver(false);
            const files = Array.from(e.dataTransfer.files || []);
            await processImportedFiles(files);
          }}
          className={`border-2 border-dashed rounded-xl p-6 transition-all cursor-pointer ${
            dragOver ? 'border-[#e94560] bg-[#e94560]/5' : 'border-[#2a2a35] hover:border-[#8b8b99]'
          }`}
          data-testid="import-drop-zone"
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <Upload className={`w-8 h-8 ${dragOver ? 'text-[#e94560]' : 'text-[#8b8b99]'}`} />
            <div>
              <p className="text-[#f8f8f8] font-medium">Drag & drop your song package here</p>
              <p className="text-xs text-[#8b8b99] mt-1">
                Drop all files at once: .txt (lyrics/info), .mp3/.wav (audio), .png/.jpg (images)
              </p>
            </div>
            <div className="flex gap-2 mt-2">
              <input ref={packageInputRef} type="file" multiple accept=".txt,.mp3,.wav,.png,.jpg,.jpeg,.webp" onChange={(e) => processImportedFiles(Array.from(e.target.files || []))} className="hidden" />
              <button
                onClick={(e) => { e.stopPropagation(); packageInputRef.current?.click(); }}
                disabled={importing}
                className="flex items-center gap-2 px-5 py-2.5 text-sm bg-[#e94560] text-white rounded-lg hover:bg-[#f25a74] transition-all disabled:opacity-50"
                data-testid="import-browse-button"
              >
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderOpen className="w-4 h-4" />}
                Browse Files
              </button>
              <input ref={infoInputRef} type="file" accept=".txt" onChange={handleInfoFileUpload} className="hidden" />
              <button
                onClick={(e) => { e.stopPropagation(); infoInputRef.current?.click(); }}
                disabled={importing}
                className="flex items-center gap-2 px-3 py-2.5 text-sm text-[#8b8b99] hover:text-[#f8f8f8] rounded-lg transition-all border border-[#2a2a35] disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />.txt only
              </button>
            </div>
          </div>
        </div>

        {/* Import progress + file list */}
        {(importStatus || importedFiles.length > 0) && (
          <div className="mt-3 bg-[#0c0c0f] rounded-lg px-4 py-3 space-y-2">
            {importing && (
              <div className="flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-[#e94560] animate-spin flex-shrink-0" />
                <span className="text-sm text-[#f59e0b]">{importStatus}</span>
              </div>
            )}
            {!importing && importStatus && (
              <div className="flex items-center gap-3">
                <Check className="w-4 h-4 text-[#10b981] flex-shrink-0" />
                <span className="text-sm text-[#10b981]">{importStatus}</span>
              </div>
            )}
            {importedFiles.length > 0 && (
              <div className="space-y-1 mt-1">
                {importedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {f.type === 'audio' && <Music className="w-3 h-3 text-[#e94560]" />}
                    {f.type === 'text' && <FileText className="w-3 h-3 text-[#60a5fa]" />}
                    {f.type === 'image' && <ImageIcon className="w-3 h-3 text-[#f59e0b]" />}
                    {f.type === 'unknown' && <X className="w-3 h-3 text-[#8b8b99]" />}
                    <span className={f.status === 'skipped' ? 'text-[#8b8b99] line-through' : 'text-[#f8f8f8]'}>
                      {f.name}
                    </span>
                    <span className="text-[#8b8b99] ml-auto">{(f.size / 1024).toFixed(0)} KB</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-[#8b8b99] mb-2">Title *</label>
          <input type="text" value={project.title} onChange={(e) => updateProject({ title: e.target.value })} placeholder="Enter song title"
            className="w-full bg-[#0c0c0f] border border-[#2a2a35] rounded-lg px-4 py-3 text-[#f8f8f8] placeholder-[#8b8b99] focus:ring-1 focus:ring-[#e94560] focus:border-[#e94560] transition-all" data-testid="title-input" />
        </div>
        <div>
          <label className="block text-sm text-[#8b8b99] mb-2">Genre / Style</label>
          <input type="text" value={project.genre} onChange={(e) => updateProject({ genre: e.target.value })} placeholder="e.g., Pop, R&B, Latin, Corrido"
            className="w-full bg-[#0c0c0f] border border-[#2a2a35] rounded-lg px-4 py-3 text-[#f8f8f8] placeholder-[#8b8b99] focus:ring-1 focus:ring-[#e94560] focus:border-[#e94560] transition-all" data-testid="genre-input" />
        </div>
      </div>

      {/* Lyrics */}
      <div>
        <label className="block text-sm text-[#8b8b99] mb-2">Full Lyrics</label>
        <textarea value={project.lyrics} onChange={(e) => updateProject({ lyrics: e.target.value })} placeholder="Paste your full song lyrics here..." rows={6}
          className="w-full bg-[#0c0c0f] border border-[#2a2a35] rounded-lg px-4 py-3 text-[#f8f8f8] placeholder-[#8b8b99] focus:ring-1 focus:ring-[#e94560] focus:border-[#e94560] transition-all resize-none" data-testid="lyrics-input" />
      </div>

      {/* Audio Upload */}
      <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Music className="w-5 h-5 text-[#e94560]" />
          <h3 className="font-heading font-semibold text-[#f8f8f8]">Audio File</h3>
        </div>
        <input ref={audioInputRef} type="file" accept=".mp3,.wav,audio/mpeg,audio/wav" onChange={handleAudioUpload} className="hidden" />
        {project.audioFile ? (
          <div className="flex items-center gap-4 bg-[#0c0c0f] p-4 rounded-lg">
            <Music className="w-8 h-8 text-[#e94560]" />
            <div className="flex-1">
              <p className="text-[#f8f8f8] font-medium">{project.audioFile.name}</p>
              <p className="text-sm text-[#8b8b99]">{(project.audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button onClick={() => updateProject({ audioFile: null, audioUrl: null })} className="p-2 text-[#8b8b99] hover:text-[#ef4444] transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <button onClick={() => audioInputRef.current?.click()} className="w-full py-8 border-2 border-dashed border-[#2a2a35] rounded-lg hover:border-[#e94560] transition-all flex flex-col items-center gap-2" data-testid="upload-audio">
            <Upload className="w-8 h-8 text-[#8b8b99]" />
            <span className="text-[#8b8b99]">Click to upload MP3 or WAV</span>
          </button>
        )}
      </div>

      {/* Add Own Images */}
      <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <ImageIcon className="w-5 h-5 text-[#e94560]" />
          <h3 className="font-heading font-semibold text-[#f8f8f8]">Or add your own images</h3>
          <span className="text-xs text-[#8b8b99]">(Optional)</span>
        </div>
        <input ref={imagesInputRef} type="file" accept="image/png,image/jpeg,image/jpg" multiple onChange={handleImagesDrop} className="hidden" />
        <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleImagesDrop}
          onClick={() => imagesInputRef.current?.click()}
          className={`w-full py-8 border-2 border-dashed rounded-lg transition-all flex flex-col items-center gap-2 cursor-pointer ${dragOver ? 'border-[#e94560] bg-[#e94560]/5' : 'border-[#2a2a35] hover:border-[#e94560]'}`} data-testid="upload-images-zone">
          <ImageIcon className="w-8 h-8 text-[#8b8b99]" />
          <span className="text-[#8b8b99]">Drag & drop images or click to browse</span>
          <span className="text-xs text-[#8b8b99]">PNG, JPG accepted</span>
        </div>
        {project.uploadedImages.length > 0 && (
          <div className="mt-4 grid grid-cols-4 md:grid-cols-6 gap-2">
            {project.uploadedImages.map((img) => (
              <div key={img.id} className="relative group aspect-[9/16]">
                <img src={img.url} alt="Uploaded" className="w-full h-full object-cover rounded-lg" />
                <button onClick={(e) => { e.stopPropagation(); removeUploadedImage(img.id); }}
                  className="absolute top-1 right-1 p-1 bg-[#0c0c0f]/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-3 h-3 text-[#ef4444]" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Template Quick Select */}
      <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-6">
        <h3 className="font-heading font-semibold text-[#f8f8f8] mb-4">Quick-select a template</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {templates.map((template) => (
            <button key={template._id} onClick={() => selectTemplate(template)}
              className={`p-3 rounded-lg border transition-all text-left ${project.templateId === template._id ? 'border-[#e94560] bg-[#e94560]/10' : 'border-[#2a2a35] hover:border-[#8b8b99]'}`}
              data-testid={`template-${template._id}`}>
              <div className="text-2xl mb-2">{template.emoji}</div>
              <div className="text-sm font-medium text-[#f8f8f8] truncate">{template.name}</div>
              {template.colorPalette && (
                <div className="flex gap-1 mt-2">
                  {template.colorPalette.slice(0, 4).map((color, i) => (
                    <div key={i} className="w-4 h-4 rounded-sm" style={{ backgroundColor: color }} />
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
