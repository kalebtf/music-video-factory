import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';
import { Video, ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, DollarSign } from 'lucide-react';

// Step components
import Step1SongInput from '../components/wizard/Step1SongInput';
import Step2SelectClimax from '../components/wizard/Step2SelectClimax';
import Step3VisualConcept from '../components/wizard/Step3VisualConcept';
import Step4GenerateImages from '../components/wizard/Step4GenerateImages';
import Step5AnimateClips from '../components/wizard/Step5AnimateClips';
import Step6AssembleVideo from '../components/wizard/Step6AssembleVideo';
import Step7ExportPublish from '../components/wizard/Step7ExportPublish';

const STEPS = [
  { id: 1, name: 'Song Input', shortName: 'Song' },
  { id: 2, name: 'Select Climax', shortName: 'Climax' },
  { id: 3, name: 'Visual Concept', shortName: 'Concept' },
  { id: 4, name: 'Generate Images', shortName: 'Images' },
  { id: 5, name: 'Animate Clips', shortName: 'Animate' },
  { id: 6, name: 'Assemble Video', shortName: 'Assemble' },
  { id: 7, name: 'Export & Publish', shortName: 'Export' },
];

const initialProjectState = {
  title: '',
  genre: '',
  lyrics: '',
  templateId: null,
  template: null,
  audioFile: null,
  audioUrl: null,
  uploadedImages: [],
  climaxStart: 0,
  climaxEnd: 30,
  concept: {
    theme: '',
    mood: '',
    palette: ['#1a1a2e', '#e94560', '#0f3460', '#f0a500'],
    prompts: ['', '', ''],
    hooks: [],
    selectedHooks: [],
    customInstructions: '',
    numImages: 3,
  },
  images: [],
  clips: [],
  assembledVideo: null,
  assemblySettings: {
    crossfade: 0.5,
    addTextOverlay: true,
    addSubtitles: false,
  },
  costs: {
    images: 0,
    clips: 0,
    assembly: 0,
  },
};

export default function NewVideo() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [project, setProject] = useState(initialProjectState);
  const [projectDbId, setProjectDbId] = useState(projectId || null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates();
    if (projectId) {
      loadProject(projectId);
    }
  }, [projectId]);

  const fetchTemplates = async () => {
    try {
      const { data } = await api.get('/templates');
      setTemplates(data);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  };

  const loadProject = async (id) => {
    try {
      setLoading(true);
      const { data } = await api.get(`/projects/${id}`);
      // Map database project to local state
      setProject({
        ...initialProjectState,
        title: data.title || '',
        genre: data.genre || '',
        lyrics: data.lyrics || '',
        templateId: data.templateId,
        climaxStart: data.climaxStart || 0,
        climaxEnd: data.climaxEnd || 30,
        concept: data.concept || initialProjectState.concept,
        images: data.images || [],
        clips: data.clips || [],
      });
      setProjectDbId(id);
      // Determine which step to go to based on status
      const stepMap = {
        'draft': 1,
        'processing': 2,
        'images': 4,
        'animation': 5,
        'assembly': 6,
        'done': 7,
      };
      setCurrentStep(stepMap[data.status] || 1);
    } catch (err) {
      console.error('Failed to load project:', err);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (projectDbId) return projectDbId;
    try {
      setSaving(true);
      const { data } = await api.post('/projects', {
        title: project.title || 'Untitled Project',
        genre: project.genre,
        lyrics: project.lyrics,
        templateId: project.templateId,
      });
      setProjectDbId(data._id);
      
      // Upload audio file if exists
      if (project.audioFile) {
        await uploadAudioFile(data._id, project.audioFile);
      }
      
      return data._id;
    } catch (err) {
      console.error('Failed to create project:', err);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const uploadAudioFile = async (projId, audioFile) => {
    try {
      const formData = new FormData();
      formData.append('file', audioFile);
      
      const { data } = await api.post(
        `/audio/upload/${projId}`,
        formData,
        { 
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );
      
      updateProject({ audioDuration: data.duration });
    } catch (err) {
      console.error('Failed to upload audio:', err);
    }
  };

  const saveProject = async (updates = {}) => {
    if (!projectDbId) return;
    try {
      setSaving(true);
      await api.put(`/projects/${projectDbId}`, updates);
    } catch (err) {
      console.error('Failed to save project:', err);
    } finally {
      setSaving(false);
    }
  };

  const updateProject = useCallback((updates) => {
    setProject(prev => ({ ...prev, ...updates }));
  }, []);

  const totalCost = project.costs.images + project.costs.clips + project.costs.assembly;

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return project.title.trim() !== '';
      case 2:
        return project.climaxEnd > project.climaxStart;
      case 3:
        return project.concept.prompts.some(p => p.trim() !== '');
      case 4:
        return project.images.filter(img => img.status === 'approved').length >= 2;
      case 5:
        return project.clips.filter(clip => clip.status === 'approved').length >= 2;
      case 6:
        return project.assembledVideo !== null;
      case 7:
        return true;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (currentStep === 1 && !projectDbId) {
      await createProject();
    }
    
    // Extract climax audio when leaving Step 2
    if (currentStep === 2 && projectDbId && project.audioFile) {
      try {
        await api.post(
          `/audio/extract-climax/${projectDbId}`,
          {
            projectId: projectDbId,
            start: project.climaxStart,
            end: project.climaxEnd
          }
        );
      } catch (err) {
        console.error('Failed to extract climax:', err);
      }
    }
    
    if (currentStep < 7) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateAnother = () => {
    setProject(initialProjectState);
    setProjectDbId(null);
    setCurrentStep(1);
    navigate('/new');
  };

  const renderStep = () => {
    const props = {
      project,
      updateProject,
      templates,
      projectId: projectDbId,
      saveProject,
      createProject,
    };

    switch (currentStep) {
      case 1: return <Step1SongInput {...props} />;
      case 2: return <Step2SelectClimax {...props} />;
      case 3: return <Step3VisualConcept {...props} />;
      case 4: return <Step4GenerateImages {...props} />;
      case 5: return <Step5AnimateClips {...props} />;
      case 6: return <Step6AssembleVideo {...props} />;
      case 7: return <Step7ExportPublish {...props} onCreateAnother={handleCreateAnother} />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0c0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#e94560] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0c0f] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0c0c0f]/80 backdrop-blur-xl border-b border-[#2a2a35] px-4 md:px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link
            to="/"
            className="p-2 text-[#8b8b99] hover:text-[#f8f8f8] hover:bg-[#141418] rounded-lg transition-all"
            data-testid="back-to-dashboard"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
          </Link>
          <div className="flex items-center gap-3">
            <Video className="w-6 h-6 text-[#e94560]" strokeWidth={1.5} />
            <h1 className="font-heading text-lg font-bold text-[#f8f8f8]">
              {project.title || 'New Video'}
            </h1>
          </div>
          {saving && (
            <span className="text-xs text-[#8b8b99] ml-auto">Saving...</span>
          )}
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-[#141418] border-b border-[#2a2a35] px-4 py-3 overflow-x-auto">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between min-w-[600px]">
            {STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => step.id <= currentStep && setCurrentStep(step.id)}
                  disabled={step.id > currentStep}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                    step.id === currentStep
                      ? 'bg-[#e94560] text-white'
                      : step.id < currentStep
                      ? 'bg-[#10b981]/20 text-[#10b981] cursor-pointer hover:bg-[#10b981]/30'
                      : 'text-[#8b8b99] cursor-not-allowed'
                  }`}
                  data-testid={`step-${step.id}`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    step.id < currentStep ? 'bg-[#10b981]' : step.id === currentStep ? 'bg-white/20' : 'bg-[#2a2a35]'
                  }`}>
                    {step.id < currentStep ? <Check className="w-3 h-3" /> : step.id}
                  </span>
                  <span className="text-sm font-medium hidden md:inline">{step.shortName}</span>
                </button>
                {index < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    step.id < currentStep ? 'bg-[#10b981]' : 'bg-[#2a2a35]'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-4 md:p-6">
          {renderStep()}
        </div>
      </main>

      {/* Footer with Navigation and Cost */}
      <footer className="sticky bottom-0 bg-[#141418] border-t border-[#2a2a35] px-4 md:px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          {/* Cost Counter */}
          <div className="flex items-center gap-2 bg-[#0c0c0f] px-4 py-2 rounded-lg border border-[#2a2a35]">
            <DollarSign className="w-4 h-4 text-[#e94560]" strokeWidth={1.5} />
            <span className="text-sm text-[#8b8b99]">Est. cost:</span>
            <span className="font-heading font-semibold text-[#e94560]" data-testid="total-cost">
              ${totalCost.toFixed(2)} USD
            </span>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-3">
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-4 py-2 bg-[#0c0c0f] border border-[#2a2a35] text-[#f8f8f8] rounded-lg hover:bg-[#1e1e24] transition-all"
                data-testid="back-button"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
            {currentStep < 7 && (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex items-center gap-2 px-4 py-2 bg-[#e94560] text-white rounded-lg hover:bg-[#f25a74] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="next-button"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
