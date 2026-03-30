import React, { useRef, useState } from 'react';
import { Music, Upload, FileText, Image as ImageIcon, X } from 'lucide-react';

export default function Step1SongInput({ project, updateProject, templates }) {
  const audioInputRef = useRef(null);
  const imagesInputRef = useRef(null);
  const infoInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleAudioUpload = (e) => {
    const file = e.target.files?.[0];
    if (file && (file.type === 'audio/mpeg' || file.type === 'audio/wav')) {
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
    updateProject({
      uploadedImages: project.uploadedImages.filter(img => img.id !== id)
    });
  };

  const handleInfoFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const lines = text.split('\n');
        const updates = {};
        let lyricsLines = [];
        let inLyrics = false;

        lines.forEach(line => {
          const lower = line.toLowerCase();
          if (lower.startsWith('title:')) {
            updates.title = line.substring(6).trim();
          } else if (lower.startsWith('genre:') || lower.startsWith('style:')) {
            updates.genre = line.substring(line.indexOf(':') + 1).trim();
          } else if (lower.startsWith('lyrics:')) {
            inLyrics = true;
            const afterColon = line.substring(7).trim();
            if (afterColon) lyricsLines.push(afterColon);
          } else if (inLyrics) {
            lyricsLines.push(line);
          }
        });

        if (lyricsLines.length > 0) {
          updates.lyrics = lyricsLines.join('\n').trim();
        }

        updateProject(updates);
      };
      reader.readAsText(file);
    }
  };

  const selectTemplate = (template) => {
    if (project.templateId === template._id) {
      // Deselect
      updateProject({
        templateId: null,
        template: null,
        concept: {
          ...project.concept,
          theme: '',
          mood: '',
          palette: ['#1a1a2e', '#e94560', '#0f3460', '#f0a500'],
          prompts: ['', '', ''],
          hooks: [],
        }
      });
    } else {
      // Select template and pre-fill concept
      updateProject({
        templateId: template._id,
        template: template,
        concept: {
          ...project.concept,
          theme: template.visualStyle || '',
          mood: template.animationStyle || '',
          palette: template.colorPalette || ['#1a1a2e', '#e94560', '#0f3460', '#f0a500'],
          prompts: template.imagePrompts || ['', '', ''],
          hooks: template.textHooks || [],
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="font-heading text-2xl font-bold text-[#f8f8f8] mb-2">
          Song Input
        </h2>
        <p className="text-[#8b8b99]">
          Enter your song details or upload a song info file
        </p>
      </div>

      {/* Song Info File Upload */}
      <div className="flex justify-end mb-4">
        <input
          ref={infoInputRef}
          type="file"
          accept=".txt"
          onChange={handleInfoFileUpload}
          className="hidden"
        />
        <button
          onClick={() => infoInputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-2 text-sm text-[#8b8b99] hover:text-[#f8f8f8] hover:bg-[#141418] rounded-lg transition-all border border-[#2a2a35]"
          data-testid="upload-info-file"
        >
          <FileText className="w-4 h-4" />
          Import from .txt
        </button>
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-[#8b8b99] mb-2">Title *</label>
          <input
            type="text"
            value={project.title}
            onChange={(e) => updateProject({ title: e.target.value })}
            placeholder="Enter song title"
            className="w-full bg-[#0c0c0f] border border-[#2a2a35] rounded-lg px-4 py-3 text-[#f8f8f8] placeholder-[#8b8b99] focus:ring-1 focus:ring-[#e94560] focus:border-[#e94560] transition-all"
            data-testid="title-input"
          />
        </div>
        <div>
          <label className="block text-sm text-[#8b8b99] mb-2">Genre / Style</label>
          <input
            type="text"
            value={project.genre}
            onChange={(e) => updateProject({ genre: e.target.value })}
            placeholder="e.g., Pop, R&B, Latin, Corrido"
            className="w-full bg-[#0c0c0f] border border-[#2a2a35] rounded-lg px-4 py-3 text-[#f8f8f8] placeholder-[#8b8b99] focus:ring-1 focus:ring-[#e94560] focus:border-[#e94560] transition-all"
            data-testid="genre-input"
          />
        </div>
      </div>

      {/* Lyrics */}
      <div>
        <label className="block text-sm text-[#8b8b99] mb-2">Full Lyrics</label>
        <textarea
          value={project.lyrics}
          onChange={(e) => updateProject({ lyrics: e.target.value })}
          placeholder="Paste your full song lyrics here..."
          rows={6}
          className="w-full bg-[#0c0c0f] border border-[#2a2a35] rounded-lg px-4 py-3 text-[#f8f8f8] placeholder-[#8b8b99] focus:ring-1 focus:ring-[#e94560] focus:border-[#e94560] transition-all resize-none"
          data-testid="lyrics-input"
        />
      </div>

      {/* Audio Upload */}
      <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Music className="w-5 h-5 text-[#e94560]" />
          <h3 className="font-heading font-semibold text-[#f8f8f8]">Audio File</h3>
        </div>
        <input
          ref={audioInputRef}
          type="file"
          accept=".mp3,.wav,audio/mpeg,audio/wav"
          onChange={handleAudioUpload}
          className="hidden"
        />
        {project.audioFile ? (
          <div className="flex items-center gap-4 bg-[#0c0c0f] p-4 rounded-lg">
            <Music className="w-8 h-8 text-[#e94560]" />
            <div className="flex-1">
              <p className="text-[#f8f8f8] font-medium">{project.audioFile.name}</p>
              <p className="text-sm text-[#8b8b99]">
                {(project.audioFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              onClick={() => updateProject({ audioFile: null, audioUrl: null })}
              className="p-2 text-[#8b8b99] hover:text-[#ef4444] transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => audioInputRef.current?.click()}
            className="w-full py-8 border-2 border-dashed border-[#2a2a35] rounded-lg hover:border-[#e94560] transition-all flex flex-col items-center gap-2"
            data-testid="upload-audio"
          >
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
        <input
          ref={imagesInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          multiple
          onChange={handleImagesDrop}
          className="hidden"
        />
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleImagesDrop}
          onClick={() => imagesInputRef.current?.click()}
          className={`w-full py-8 border-2 border-dashed rounded-lg transition-all flex flex-col items-center gap-2 cursor-pointer ${
            dragOver ? 'border-[#e94560] bg-[#e94560]/5' : 'border-[#2a2a35] hover:border-[#e94560]'
          }`}
          data-testid="upload-images-zone"
        >
          <ImageIcon className="w-8 h-8 text-[#8b8b99]" />
          <span className="text-[#8b8b99]">Drag & drop images or click to browse</span>
          <span className="text-xs text-[#8b8b99]">PNG, JPG accepted</span>
        </div>

        {/* Uploaded Images Preview */}
        {project.uploadedImages.length > 0 && (
          <div className="mt-4 grid grid-cols-4 md:grid-cols-6 gap-2">
            {project.uploadedImages.map((img) => (
              <div key={img.id} className="relative group aspect-[9/16]">
                <img
                  src={img.url}
                  alt="Uploaded"
                  className="w-full h-full object-cover rounded-lg"
                />
                <button
                  onClick={(e) => { e.stopPropagation(); removeUploadedImage(img.id); }}
                  className="absolute top-1 right-1 p-1 bg-[#0c0c0f]/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
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
            <button
              key={template._id}
              onClick={() => selectTemplate(template)}
              className={`p-3 rounded-lg border transition-all text-left ${
                project.templateId === template._id
                  ? 'border-[#e94560] bg-[#e94560]/10'
                  : 'border-[#2a2a35] hover:border-[#8b8b99]'
              }`}
              data-testid={`template-${template._id}`}
            >
              <div className="text-2xl mb-2">{template.emoji}</div>
              <div className="text-sm font-medium text-[#f8f8f8] truncate">{template.name}</div>
              {template.colorPalette && (
                <div className="flex gap-1 mt-2">
                  {template.colorPalette.slice(0, 4).map((color, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded-sm"
                      style={{ backgroundColor: color }}
                    />
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
