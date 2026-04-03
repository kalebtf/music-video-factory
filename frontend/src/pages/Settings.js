import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Video, ArrowLeft, Check, X, Loader2, Key, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';

export default function Settings() {
  const { refreshUser } = useAuth();
  const [apiKeys, setApiKeys] = useState({ openai: false, falai: false, kling: false, gemini: false, together: false });
  const [apiKeyInputs, setApiKeyInputs] = useState({ openai: '', falai: '', kling: '', gemini: '', together: '' });
  const [showKeys, setShowKeys] = useState({ openai: false, falai: false, kling: false, gemini: false, together: false });
  const [savingKey, setSavingKey] = useState('');
  const [settings, setSettings] = useState({ imageProvider: 'together-flux-dev', videoProvider: 'falai-wan' });
  const [costLogs, setCostLogs] = useState([]);
  const [totalCost, setTotalCost] = useState(0);
  const [loading, setLoading] = useState(true);
  const [testingKeys, setTestingKeys] = useState(false);
  const [keyTestResult, setKeyTestResult] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [keysRes, settingsRes, logsRes] = await Promise.all([
        api.get('/settings/api-keys'),
        api.get('/settings'),
        api.get('/cost-logs')
      ]);
      setApiKeys(keysRes.data);
      setSettings(settingsRes.data);
      setCostLogs(logsRes.data.logs || []);
      setTotalCost(logsRes.data.total || 0);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiKey = async (provider) => {
    const apiKey = apiKeyInputs[provider];
    if (!apiKey.trim()) return;

    setSavingKey(provider);
    try {
      const response = await api.post('/settings/api-key', { provider, apiKey });
      if (response.data.success) {
        setApiKeys({ ...apiKeys, [provider]: true });
        setApiKeyInputs({ ...apiKeyInputs, [provider]: '' });
        refreshUser();
      }
    } catch (err) {
      console.error('Failed to save API key:', err);
      // Show error to user
      alert('Failed to save API key. Please try again.');
    } finally {
      setSavingKey('');
    }
  };

  const handleProviderChange = async (type, value) => {
    const newSettings = { ...settings, [type]: value };
    setSettings(newSettings);
    try {
      await api.post('/settings/providers', newSettings);
    } catch (err) {
      console.error('Failed to update provider:', err);
    }
  };

  const handleTestKeys = async () => {
    setTestingKeys(true);
    setKeyTestResult(null);
    try {
      const { data } = await api.get('/auth/test-keys');
      setKeyTestResult(data);
    } catch (err) {
      console.error('Failed to test keys:', err);
      setKeyTestResult({ error: 'Failed to test keys. Please try again.' });
    } finally {
      setTestingKeys(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0c0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#e94560] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0c0f]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0c0c0f]/80 backdrop-blur-xl border-b border-[#2a2a35] px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link
            to="/"
            className="p-2 text-[#8b8b99] hover:text-[#f8f8f8] hover:bg-[#141418] rounded-lg transition-all"
            data-testid="back-link"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
          </Link>
          <div className="flex items-center gap-3">
            <Video className="w-6 h-6 text-[#e94560]" strokeWidth={1.5} />
            <h1 className="font-heading text-lg font-bold text-[#f8f8f8]">Settings</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 md:p-8 space-y-8">
        {/* API Keys Section */}
        <section className="bg-[#141418] border border-[#2a2a35] rounded-xl p-6" data-testid="api-keys-section">
          <h2 className="font-heading text-lg font-semibold text-[#f8f8f8] mb-6 flex items-center gap-2">
            <Key className="w-5 h-5 text-[#e94560]" strokeWidth={1.5} />
            API Keys
          </h2>
          <div className="space-y-4">
            {[
              { key: 'openai', label: 'OpenAI API Key', hint: 'For images & song analysis' },
              { key: 'together', label: 'Together AI API Key', hint: 'Cheapest images (FLUX)' },
              { key: 'gemini', label: 'Google Gemini API Key', hint: 'Free 500 imgs/day in AI Studio' },
              { key: 'falai', label: 'FAL.AI API Key', hint: 'For video animation' },
            ].map(({ key, label, hint }) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm text-[#8b8b99]">{label}</label>
                    {hint && <p className="text-xs text-[#8b8b99]/60">{hint}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {apiKeys[key] ? (
                      <Check className="w-4 h-4 text-[#10b981]" data-testid={`${key}-status-saved`} />
                    ) : (
                      <X className="w-4 h-4 text-[#ef4444]" data-testid={`${key}-status-empty`} />
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKeys[key] ? 'text' : 'password'}
                      value={apiKeyInputs[key]}
                      onChange={(e) => setApiKeyInputs({ ...apiKeyInputs, [key]: e.target.value })}
                      placeholder={apiKeys[key] ? '••••••••••••••••' : 'Enter API key'}
                      className="w-full bg-[#0c0c0f] border border-[#2a2a35] rounded-lg px-4 py-2.5 text-[#f8f8f8] placeholder-[#8b8b99] focus:ring-1 focus:ring-[#e94560] focus:border-[#e94560] transition-all pr-10"
                      data-testid={`${key}-input`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeys({ ...showKeys, [key]: !showKeys[key] })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b8b99] hover:text-[#f8f8f8]"
                    >
                      {showKeys[key] ? (
                        <EyeOff className="w-4 h-4" strokeWidth={1.5} />
                      ) : (
                        <Eye className="w-4 h-4" strokeWidth={1.5} />
                      )}
                    </button>
                  </div>
                  <button
                    onClick={() => handleSaveApiKey(key)}
                    disabled={savingKey === key || !apiKeyInputs[key].trim()}
                    className="bg-[#e94560] text-white px-4 py-2.5 rounded-lg hover:bg-[#f25a74] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[80px] justify-center"
                    data-testid={`${key}-save-button`}
                  >
                    {savingKey === key ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Save'
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Test Keys Button */}
          <div className="mt-6 pt-4 border-t border-[#2a2a35]">
            <button
              onClick={handleTestKeys}
              disabled={testingKeys}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#0c0c0f] border border-[#2a2a35] text-[#f8f8f8] rounded-lg hover:bg-[#1e1e24] transition-all disabled:opacity-50"
              data-testid="test-keys-button"
            >
              {testingKeys ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-[#e94560]" strokeWidth={1.5} />
                  Test Keys
                </>
              )}
            </button>
            {keyTestResult && !keyTestResult.error && (
              <div className="mt-3 space-y-2" data-testid="test-keys-result">
                {[
                  { key: 'openai', label: 'OpenAI' },
                  { key: 'together', label: 'Together AI' },
                  { key: 'gemini', label: 'Gemini' },
                  { key: 'falai', label: 'FAL.AI' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    {keyTestResult[key] ? (
                      <Check className="w-4 h-4 text-[#10b981]" />
                    ) : (
                      <X className="w-4 h-4 text-[#ef4444]" />
                    )}
                    <span className={keyTestResult[key] ? 'text-[#10b981]' : 'text-[#ef4444]'}>
                      {label}: {keyTestResult[key] ? 'Working' : 'Not configured'}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {keyTestResult?.error && (
              <p className="mt-3 text-sm text-[#ef4444]" data-testid="test-keys-error">{keyTestResult.error}</p>
            )}
          </div>
        </section>

        {/* Cost Tracker Section */}
        <section className="bg-[#141418] border border-[#2a2a35] rounded-xl p-6" data-testid="cost-tracker-section">
          <h2 className="font-heading text-lg font-semibold text-[#f8f8f8] mb-6">Cost Tracker</h2>
          <div className="border border-[#2a2a35] rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#2a2a35] hover:bg-transparent">
                  <TableHead className="text-[#8b8b99]">Date</TableHead>
                  <TableHead className="text-[#8b8b99]">Action</TableHead>
                  <TableHead className="text-[#8b8b99]">Provider</TableHead>
                  <TableHead className="text-[#8b8b99] text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-[#8b8b99] py-8">
                      No cost logs yet
                    </TableCell>
                  </TableRow>
                ) : (
                  costLogs.map((log, index) => (
                    <TableRow key={index} className="border-b border-[#2a2a35] hover:bg-[#1e1e24]">
                      <TableCell className="text-[#f8f8f8]">{formatDate(log.date)}</TableCell>
                      <TableCell className="text-[#f8f8f8]">{log.action}</TableCell>
                      <TableCell className="text-[#f8f8f8]">{log.provider}</TableCell>
                      <TableCell className="text-[#e94560] text-right">${log.cost.toFixed(4)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex justify-end items-center gap-2 text-sm">
            <span className="text-[#8b8b99]">Total:</span>
            <span className="font-heading font-semibold text-[#e94560]" data-testid="total-cost">
              ${totalCost.toFixed(2)}
            </span>
          </div>
        </section>

        {/* Image Provider Section */}
        <section className="bg-[#141418] border border-[#2a2a35] rounded-xl p-6" data-testid="image-provider-section">
          <h2 className="font-heading text-lg font-semibold text-[#f8f8f8] mb-2">Image Provider</h2>
          <p className="text-xs text-[#8b8b99] mb-4">Choose which AI generates your images. Requires the corresponding API key above.</p>
          <RadioGroup
            value={settings.imageProvider}
            onValueChange={(value) => handleProviderChange('imageProvider', value)}
            className="space-y-3"
          >
            {[
              { value: 'together-flux-dev', label: 'FLUX Dev', price: '$0.025/img', desc: 'Together AI', tag: 'Recommended — cinematic' },
              { value: 'together-flux-schnell', label: 'FLUX Schnell', price: '$0.003/img', desc: 'Together AI', tag: 'Cheapest' },
              { value: 'gpt-image-mini', label: 'GPT Image Mini', price: '$0.005/img', desc: 'OpenAI' },
              { value: 'imagen-4-fast', label: 'Imagen 4 Fast', price: '$0.02/img', desc: 'Google' },
              { value: 'gemini-flash', label: 'Nano Banana', price: '$0.039/img', desc: 'Google Gemini' },
              { value: 'gpt-image-1.5', label: 'GPT Image 1.5', price: '$0.04/img', desc: 'OpenAI', tag: 'Highest quality' },
            ].map(({ value, label, price, desc, tag }) => (
              <div
                key={value}
                className={`flex items-center space-x-3 border rounded-lg p-4 transition-all cursor-pointer ${
                  settings.imageProvider === value
                    ? 'border-[#e94560] bg-[#e94560]/5'
                    : 'border-[#2a2a35] hover:border-[#8b8b99]'
                }`}
                onClick={() => handleProviderChange('imageProvider', value)}
              >
                <RadioGroupItem value={value} id={value} data-testid={`image-provider-${value}`} />
                <Label htmlFor={value} className="flex-1 cursor-pointer flex justify-between items-center">
                  <div>
                    <span className="text-[#f8f8f8]">{label}</span>
                    <span className="text-[#8b8b99] text-xs ml-2">({desc})</span>
                    {tag && <span className="ml-2 text-xs px-1.5 py-0.5 bg-[#e94560]/20 text-[#e94560] rounded">{tag}</span>}
                  </div>
                  <span className={`text-sm font-medium ${price === 'FREE' ? 'text-[#10b981]' : 'text-[#8b8b99]'}`}>{price}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </section>

        {/* Video Provider Section */}
        <section className="bg-[#141418] border border-[#2a2a35] rounded-xl p-6" data-testid="video-provider-section">
          <h2 className="font-heading text-lg font-semibold text-[#f8f8f8] mb-6">Video Provider</h2>
          <RadioGroup
            value={settings.videoProvider}
            onValueChange={(value) => handleProviderChange('videoProvider', value)}
            className="space-y-3"
          >
            {[
              { value: 'falai-wan', label: 'FAL.AI Wan 2.6', price: '$0.05/s' },
              { value: 'falai-kling', label: 'FAL.AI Kling', price: '$0.07/s' },
              { value: 'kling-direct', label: 'Kling Direct', price: 'free credits' }
            ].map(({ value, label, price }) => (
              <div
                key={value}
                className={`flex items-center space-x-3 border rounded-lg p-4 transition-all cursor-pointer ${
                  settings.videoProvider === value
                    ? 'border-[#e94560] bg-[#e94560]/5'
                    : 'border-[#2a2a35] hover:border-[#8b8b99]'
                }`}
                onClick={() => handleProviderChange('videoProvider', value)}
              >
                <RadioGroupItem value={value} id={value} data-testid={`video-provider-${value}`} />
                <Label htmlFor={value} className="flex-1 cursor-pointer flex justify-between items-center">
                  <span className="text-[#f8f8f8]">{label}</span>
                  <span className="text-[#8b8b99] text-sm">{price}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </section>
      </main>
    </div>
  );
}
