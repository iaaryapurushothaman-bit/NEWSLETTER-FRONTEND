import { useState, useEffect, useCallback } from 'react';
import { Search, FileText, Settings, Copy, Check, AlertCircle, RefreshCw, BookOpen, ExternalLink, Globe, Award, Download, Printer, Trash2, Send, Mail } from 'lucide-react';

interface NewsItem {
  heading: string;
  description: string;
  source_link: string;
  image_url?: string | null;
}

interface NewsletterResponse {
  editorial_summary: string;
  editorial_image_url?: string | null;
  news_items: NewsItem[];
}

const COMMON_CATEGORIES = [
  "Technology & AI",
  "Cybersecurity",
  "Finance & Markets",
  "Healthcare & Biotech",
  "Climate & Energy",
  "Geopolitics",
  "Business & Startups",
  "Custom..."
];

export default function App() {
  // Form fields
  const [sector, setSector] = useState('');
  const [category, setCategory] = useState(COMMON_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientLogo, setClientLogo] = useState<string | null>(null);
  const [newsCount, setNewsCount] = useState<number>(5);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setClientLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // App states
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<NewsletterResponse | null>(null);
  const [copiedType, setCopiedType] = useState<'markdown' | 'html' | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailMock, setEmailMock] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Load persistent newsletter state on mount
  useEffect(() => {
    const loadPersistentState = async () => {
      try {
        const response = await fetch('/api/latest-newsletter');
        if (response.ok) {
          const data = await response.json();
          if (data.inputs && data.result) {
            setSector(data.inputs.sector || '');
            if (COMMON_CATEGORIES.includes(data.inputs.category)) {
              setCategory(data.inputs.category);
            } else if (data.inputs.customCategory) {
              setCategory('Custom...');
              setCustomCategory(data.inputs.customCategory);
            } else {
              setCategory(COMMON_CATEGORIES[0]);
            }
            setClientName(data.inputs.clientName || '');
            setClientLogo(data.inputs.clientLogo || null);
            setNewsCount(data.inputs.newsCount || 5);
            setResult(data.result);
          }
        }
      } catch (err) {
        console.error("Failed to load persistent newsletter:", err);
      }
    };
    loadPersistentState();
  }, []);

  const handleSaveEdits = async () => {
    if (!result) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      const response = await fetch('/api/save-newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: {
            sector,
            category,
            customCategory,
            clientName,
            clientLogo,
            newsCount
          },
          result
        })
      });
      if (response.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      } else {
        console.error("Failed to save newsletter edits.");
      }
    } catch (err) {
      console.error("Failed to save newsletter edits:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm("Are you sure you want to clear the current briefing? This will delete the saved newsletter.")) {
      return;
    }
    try {
      const response = await fetch('/api/clear-newsletter', {
        method: 'DELETE'
      });
      if (response.ok) {
        setSector('');
        setCategory(COMMON_CATEGORIES[0]);
        setCustomCategory('');
        setClientName('');
        setClientLogo(null);
        setNewsCount(5);
        setResult(null);
        setError('');
      } else {
        console.error("Failed to clear persistent newsletter.");
      }
    } catch (err) {
      console.error("Failed to clear persistent newsletter:", err);
    }
  };

  const handleSendEmail = async () => {
    if (!result) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail.trim())) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setEmailError('');
    setSendingEmail(true);
    setEmailSent(false);
    setEmailMock(false);
    try {
      const htmlContent = getNewsletterHTML();
      const categoryLabel = category === 'Custom...' ? customCategory : category;
      const emailSubject = `${categoryLabel} Briefing: ${sector} Insights — NewsForge AI`;
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: recipientEmail.trim(),
          subject: emailSubject,
          htmlContent
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setEmailSent(true);
        setEmailMock(data.mock === true);
        setTimeout(() => { setEmailSent(false); setEmailMock(false); }, 4000);
      } else {
        setEmailError(data.error || 'Failed to send email. Please try again.');
      }
    } catch (err) {
      setEmailError('Network error. Could not reach the server.');
    } finally {
      setSendingEmail(false);
    }
  };

  // Auto-resize a textarea to fit its content with no scrollbar
  const autoResize = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, []);

  // Re-run auto-resize whenever result changes (initial load)
  useEffect(() => {
    if (!result) return;
    const textareas = document.querySelectorAll<HTMLTextAreaElement>('textarea.auto-resize');
    textareas.forEach((el) => autoResize(el));
  }, [result, autoResize]);



  // Multi-stage loader text sequence
  useEffect(() => {
    let interval: any;
    if (loading) {
      setLoadingStage(0);
      interval = setInterval(() => {
        setLoadingStage((prev) => (prev < 3 ? prev + 1 : prev));
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [loading]);



  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sector.trim()) {
      setError('Sector is required.');
      return;
    }
    if (category === 'Custom...' && !customCategory.trim()) {
      setError('Please specify a custom category.');
      return;
    }

    setError('');
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/generate-newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sector,
          category: category === 'Custom...' ? '' : category,
          customCategory: category === 'Custom...' ? customCategory : '',
          clientName,
          clientLogo,
          newsCount,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate newsletter. Please check your configurations.');
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'An unexpected connection error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const getNewsletterMarkdown = () => {
    if (!result) return '';
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const categoryLabel = category === 'Custom...' ? customCategory : category;

    let md = `# ${categoryLabel.toUpperCase()} BRIEFING: ${sector.toUpperCase()} INSIGHTS\n\n`;
    if (clientName) {
      if (clientLogo) md += `![${clientName} Logo](${clientLogo})\n`;
      md += `**${clientName}**\n\n`;
    }
    md += `*${dateStr}*\n\n---\n\n## Editorial Overview\n\n`;
    if (result.editorial_image_url) md += `![Editorial Image](${result.editorial_image_url})\n\n`;
    md += `_${result.editorial_summary}_\n\n---\n\n## Top Industry Briefs\n\n`;

    const headlinesMD = result.news_items.map(item => `
### ${item.heading}
${item.image_url ? `![Image](${item.image_url})\n` : ''}
${item.description}

[Read Article](${item.source_link})
    `).join('\n---\n');
    
    return md + headlinesMD;
  };

  // Generate clean, highly professional HTML template suited for direct pasting into Outlook/Email clients
  const getNewsletterHTML = () => {
    if (!result) return '';
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const categoryLabel = category === 'Custom...' ? customCategory : category;

    const headlinesHTML = result.news_items.map(item => `
      <div style="margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #f1f5f9; display: flex; gap: 16px;">
        <div style="flex-shrink: 0; width: 140px; height: 100px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center;">
          ${item.image_url ? `<img src="${item.image_url}" alt="${item.heading.replace(/"/g, '&quot;')}" style="width: 100%; height: 100%; object-fit: cover;" />` : `<span style="color: #cbd5e1; font-size: 11px;">Image Processing</span>`}
        </div>
        <div style="flex-grow: 1;">
          <h4 style="margin: 0 0 8px 0; font-family: 'Outfit', sans-serif; font-size: 15px; color: #0f172a; line-height: 1.4;">
            ${item.heading}
          </h4>
          <p style="margin: 0 0 12px 0; font-family: 'Inter', sans-serif; font-size: 13px; color: #475569; line-height: 1.5;">
            ${item.description}
          </p>
          <a href="${item.source_link}" style="display: inline-block; font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 600; color: #4f46e5; text-decoration: none; border: 1px solid #c7d2fe; padding: 4px 12px; border-radius: 4px;">
            Read Full Article &rarr;
          </a>
        </div>
      </div>
    `).join('');

    return `
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px; text-align: center; color: #ffffff;">
          <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; color: #a5b4fc;">
            ${categoryLabel.toUpperCase()} BRIEFING
          </p>
          <h1 style="margin: 0 0 8px 0; font-family: 'Outfit', sans-serif; font-size: 26px; font-weight: 800; letter-spacing: -0.02em;">
            ${sector.toUpperCase()} INSIGHTS
          </h1>
          ${clientName ? `
            <div style="margin-top: 16px;">
              ${clientLogo ? `<div style="background: white; display: inline-block; padding: 8px; border-radius: 8px;"><img src="${clientLogo}" alt="${clientName}" style="height: 40px; object-fit: contain;" /></div>` : ''}
              <p style="margin: 8px 0 0 0; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; color: #e0e7ff;">${clientName}</p>
            </div>
          ` : ''}
          <p style="margin: 16px 0 0 0; font-size: 11px; color: #c7d2fe;">${dateStr}</p>
        </div>
        <div style="padding: 32px;">
          <h3 style="margin: 0 0 12px 0; font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #4f46e5;">
            Editorial Overview
          </h3>
          ${result.editorial_image_url ? `<img src="${result.editorial_image_url}" alt="Editorial" style="width: 100%; border-radius: 10px; margin-bottom: 16px; object-fit: cover; max-height: 220px;" />` : ''}
          <p style="margin: 0 0 32px 0; font-family: 'Playfair Display', Georgia, serif; font-size: 15px; color: #334155; line-height: 1.7; white-space: pre-line; font-style: italic; border-left: 3px solid #6366f1; padding-left: 16px;">
            ${result.editorial_summary}
          </p>
          
          <h3 style="margin: 0 0 16px 0; font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #4f46e5;">
            Top Industry Briefs
          </h3>
          ${headlinesHTML}
        </div>
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-family: 'Inter', sans-serif; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
          <p style="margin: 0 0 4px 0;">Generated automatically by <strong>NewsForge AI</strong></p>
          <p style="margin: 0;">Powered by Google Vertex AI Gemini 2.5 & Google Search API</p>
        </div>
      </div>
    `;
  };

  const handleCopyMarkdown = () => {
    const markdown = getNewsletterMarkdown();
    navigator.clipboard.writeText(markdown);
    setCopiedType('markdown');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyHTML = () => {
    const html = getNewsletterHTML();
    // Copy as rich HTML format so when users paste into Outlook or Word, it preserves styling!
    const blob = new Blob([html], { type: 'text/html' });
    const clipboardItem = new ClipboardItem({ 'text/html': blob });
    navigator.clipboard.write([clipboardItem]).then(() => {
      setCopiedType('html');
      setTimeout(() => setCopiedType(null), 2000);
    }).catch(() => {
      // Fallback to text copy
      navigator.clipboard.writeText(html);
      setCopiedType('html');
      setTimeout(() => setCopiedType(null), 2000);
    });
  };

  const handleDownloadHTML = () => {
    const html = getNewsletterHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sector.toLowerCase().replace(/\s+/g, '-')}-newsletter.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const extractDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'Source';
    }
  };

  const loadingStagesText = [
    "Contacting Google Search Ingestion service...",
    "Crawling recent industry updates & Google News index...",
    "Synthesizing high-impact editorial using Vertex AI (Gemini 2.5 Flash)...",
    "Polishing structured headlines & preparing premium layouts..."
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* Visual background ambient glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-650/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-1/3 right-1/4 w-[450px] h-[450px] bg-violet-650/10 rounded-full blur-[150px] pointer-events-none"></div>

      {/* Top Header */}
      <header className="border-b border-slate-900 bg-slate-950/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/10 border border-indigo-400/20">
              <BookOpen className="h-5.5 w-5.5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-300">
                  NewsForge AI
                </h1>
                <span className="text-[9px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded-full font-bold">
                  v2.5
                </span>
              </div>
              <p className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold">
                Enterprise Briefing automation
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3 text-xs bg-slate-900/60 px-3.5 py-2 rounded-xl border border-slate-800/80 shadow-inner">
            <Globe className="h-4 w-4 text-indigo-400 animate-pulse" />
            <span className="text-slate-350 font-medium">Vertex AI &bull; Gemini 2.5 Flash</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        
        {/* Left Panel: Inputs Form */}
        <div className="w-full lg:w-5/12 space-y-6 print:hidden">
          <div className="glass-panel p-6 rounded-2xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>
            
            <div className="flex items-center space-x-3 mb-6">
              <Settings className="h-5 w-5 text-indigo-400" />
              <h2 className="text-base font-bold text-slate-200 tracking-wide">Briefing Setup</h2>
            </div>

            <form onSubmit={handleGenerate} className="space-y-5">
              
              {/* Sector Input */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Target Sector / Topic
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Search className="h-4.5 w-4.5" />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Generative AI, Cyberdefense, CleanTech"
                    className="block w-full pl-11 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm shadow-inner"
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                  />
                </div>
              </div>

              {/* Category Select */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Newsletter Category
                </label>
                <select
                  className="block w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm cursor-pointer shadow-inner"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {COMMON_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-slate-900 text-slate-200">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Category Input (Shows dynamically) */}
              {category === 'Custom...' && (
                <div className="animate-in slide-in-from-top-3 duration-200">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    Define Custom Category
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Quantum Cryptography, Fusion Energy"
                    className="block w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm shadow-inner"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                  />
                </div>
              )}

              {/* Client Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Client Name <span className="text-slate-600 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Vanguard Group, Microsoft Corporate"
                  className="block w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm shadow-inner"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>

              {/* Client Logo */}
              {clientName && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    Client Logo
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="block w-full text-sm text-slate-400
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-xl file:border-0
                      file:text-xs file:font-semibold
                      file:bg-indigo-600 file:text-white
                      hover:file:bg-indigo-700
                      cursor-pointer
                    "
                  />
                  {clientLogo && (
                    <div className="mt-3 bg-white p-2 rounded flex items-center justify-center border border-slate-800">
                      <img src={clientLogo} alt="Logo preview" className="max-h-12 object-contain" />
                    </div>
                  )}
                </div>
              )}

              {/* News Count */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Number of News Articles
                </label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  className="block w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm shadow-inner"
                  value={newsCount}
                  onChange={(e) => setNewsCount(parseInt(e.target.value, 10))}
                />
              </div>



              {/* Error Message */}
              {error && (
                <div className="p-3.5 bg-red-950/40 border border-red-500/25 rounded-xl flex items-start space-x-2.5 text-red-200 text-xs">
                  <AlertCircle className="h-4.5 w-4.5 text-red-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 via-indigo-650 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold rounded-xl shadow-xl shadow-indigo-500/10 hover:shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 flex items-center justify-center space-x-2.5 text-sm glow-btn border border-indigo-400/20"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                    <span>Processing Ingestion...</span>
                  </>
                ) : (
                  <>
                    <FileText className="h-4.5 w-4.5" />
                    <span>Generate Newsletter</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Panel: Generated Output / Skeleton */}
        <div className="w-full lg:w-7/12 flex flex-col">
          
          {/* Skeleton Loaders */}
          {loading && (
            <div className="flex-1 glass-panel border border-slate-800/80 p-8 rounded-2xl space-y-6 shadow-2xl relative overflow-hidden print:hidden">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-pulse"></div>
              
              {/* Dynamic Loading Step Text */}
              <div className="flex items-center space-x-3.5 bg-indigo-500/10 border border-indigo-500/20 px-4 py-3 rounded-xl">
                <RefreshCw className="h-4.5 w-4.5 text-indigo-400 animate-spin" />
                <span className="text-xs text-indigo-300 font-semibold tracking-wide">
                  {loadingStagesText[loadingStage]}
                </span>
              </div>

              {/* Grid Skeletons */}
              <div className="space-y-4 pt-4">
                <div className="h-8 skeleton-loading rounded-lg w-1/3"></div>
                <div className="space-y-2.5">
                  <div className="h-4 skeleton-loading rounded w-full"></div>
                  <div className="h-4 skeleton-loading rounded w-11/12"></div>
                  <div className="h-4 skeleton-loading rounded w-4/5"></div>
                </div>
              </div>
              <div className="border-t border-slate-850 pt-6 space-y-5">
                <div className="h-6 skeleton-loading rounded-lg w-1/4"></div>
                {[1, 2].map((n) => (
                  <div key={n} className="space-y-2.5 p-4 bg-slate-900/15 border border-slate-850/50 rounded-xl">
                    <div className="h-5 skeleton-loading rounded w-3/5"></div>
                    <div className="h-4 skeleton-loading rounded w-full"></div>
                    <div className="h-3 skeleton-loading rounded w-20"></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && !result && (
            <div className="flex-1 bg-slate-950 border-2 border-dashed border-slate-800/60 p-16 rounded-2xl flex flex-col items-center justify-center text-center shadow-inner relative overflow-hidden print:hidden">
              <div className="bg-slate-900/40 p-4.5 rounded-2xl border border-slate-850 mb-5 shadow-2xl">
                <FileText className="h-8 w-8 text-slate-550" />
              </div>
              <h3 className="text-base font-bold text-slate-350 tracking-wide">Ready for Briefing</h3>
              <p className="text-xs text-slate-500 mt-2 max-w-sm leading-relaxed">
                Configure your briefing sector, client target, and categories on the left pane, and click &quot;Generate Newsletter&quot; to begin.
              </p>
            </div>
          )}

          {/* Fully Rendered Newsletter */}
          {!loading && result && (
            <div className="flex-1 flex flex-col space-y-6 animate-in fade-in duration-300">
              
              {/* Exporter Action Toolbar */}
              <div className="bg-slate-900/35 border border-slate-850/80 p-3.5 rounded-2xl flex flex-wrap gap-2 items-center justify-between shadow-lg backdrop-blur-sm print:hidden">
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest pl-2">
                  Exporter Actions
                </span>
                
                <div className="flex flex-wrap gap-1.5">
                  {/* Save Edits */}
                  <button
                    onClick={handleSaveEdits}
                    disabled={saving}
                    className="px-3.5 py-1.5 hover:bg-slate-850 rounded-xl text-slate-300 hover:text-white transition flex items-center space-x-1.5 text-xs bg-slate-900 border border-slate-800/80 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Save current newsletter edits to the server"
                  >
                    {saveSuccess ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-405 font-semibold">Saved!</span>
                      </>
                    ) : saving ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 text-indigo-400 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <FileText className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Save Edits</span>
                      </>
                    )}
                  </button>

                  {/* Clear Briefing */}
                  <button
                    onClick={handleClear}
                    className="px-3.5 py-1.5 hover:bg-red-950/20 hover:text-red-400 hover:border-red-500/30 rounded-xl text-slate-350 transition flex items-center space-x-1.5 text-xs bg-slate-900 border border-slate-800/80 font-medium"
                    title="Clear current newsletter and reset fields"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-550" />
                    <span>Clear Briefing</span>
                  </button>

                  {/* Copy HTML */}
                  <button
                    onClick={handleCopyHTML}
                    className="px-3.5 py-1.5 hover:bg-slate-850 rounded-xl text-slate-300 hover:text-white transition flex items-center space-x-1.5 text-xs bg-slate-900 border border-slate-800/80 font-medium"
                    title="Copy styled email template to clipboard"
                  >
                    {copiedType === 'html' ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-semibold">Email Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Copy Email Format</span>
                      </>
                    )}
                  </button>

                  {/* Copy Markdown */}
                  <button
                    onClick={handleCopyMarkdown}
                    className="px-3.5 py-1.5 hover:bg-slate-850 rounded-xl text-slate-300 hover:text-white transition flex items-center space-x-1.5 text-xs bg-slate-900 border border-slate-800/80 font-medium"
                    title="Copy as Markdown"
                  >
                    {copiedType === 'markdown' ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-semibold">Markdown Copied!</span>
                      </>
                    ) : (
                      <>
                        <FileText className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Markdown</span>
                      </>
                    )}
                  </button>

                  {/* Download HTML */}
                  <button
                    onClick={handleDownloadHTML}
                    className="p-1.5 hover:bg-slate-850 rounded-xl text-slate-300 hover:text-white transition bg-slate-900 border border-slate-800/80"
                    title="Download HTML Briefing File"
                  >
                    <Download className="h-4 w-4" />
                  </button>

                  {/* Print / PDF */}
                  <button
                    onClick={handlePrint}
                    className="p-1.5 hover:bg-slate-850 rounded-xl text-slate-300 hover:text-white transition bg-slate-900 border border-slate-800/80"
                    title="Print / Save as PDF"
                  >
                    <Printer className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Email Dispatch Row */}
              <div className="bg-slate-900/35 border border-indigo-500/20 p-3.5 rounded-2xl flex flex-wrap gap-2 items-center shadow-lg backdrop-blur-sm print:hidden">
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <Mail className="h-4 w-4 text-indigo-400" />
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Send Briefing</span>
                </div>
                <div className="flex flex-1 gap-2 min-w-0">
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => { setRecipientEmail(e.target.value); setEmailError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendEmail()}
                    placeholder="recipient@company.com"
                    className="flex-1 min-w-0 px-3 py-1.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-xs shadow-inner"
                  />
                  <button
                    onClick={handleSendEmail}
                    disabled={sendingEmail || !recipientEmail.trim()}
                    className="px-4 py-1.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 rounded-xl text-white font-semibold text-xs flex items-center space-x-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/10 flex-shrink-0"
                    title="Send newsletter to recipient email via Gmail"
                  >
                    {sendingEmail ? (
                      <><RefreshCw className="h-3.5 w-3.5 animate-spin" /><span>Sending...</span></>
                    ) : emailSent ? (
                      <><Check className="h-3.5 w-3.5 text-emerald-300" /><span className="text-emerald-300">{emailMock ? 'Saved Locally!' : 'Sent!'}</span></>
                    ) : (
                      <><Send className="h-3.5 w-3.5" /><span>Send Email</span></>
                    )}
                  </button>
                </div>
                {emailError && (
                  <div className="w-full flex items-center space-x-1.5 text-red-400 text-[11px] pl-1">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{emailError}</span>
                  </div>
                )}
                {emailSent && emailMock && (
                  <div className="w-full flex items-center space-x-1.5 text-amber-400 text-[11px] pl-1">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Demo mode active — email saved to <code className="bg-slate-800 px-1 rounded">backend/sent_emails/</code>. Add <code className="bg-slate-800 px-1 rounded">SMTP_USER</code> &amp; <code className="bg-slate-800 px-1 rounded">SMTP_PASS</code> in <code className="bg-slate-800 px-1 rounded">.env</code> for real Gmail delivery.</span>
                  </div>
                )}
                {emailSent && !emailMock && (
                  <div className="w-full flex items-center space-x-1.5 text-emerald-400 text-[11px] pl-1">
                    <Check className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Newsletter dispatched to <strong>{recipientEmail}</strong> via Gmail successfully!</span>
                  </div>
                )}
              </div>

              {/* Newsletter Preview (Styled like premium newsletter paper sheet) */}
              <div className="bg-white text-slate-900 rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col border border-slate-100 relative overflow-hidden print:shadow-none print:p-0 print:border-none">
                
                {/* Visual Header Banner */}
                <div className="bg-gradient-to-r from-indigo-900 to-violet-950 -mx-6 sm:-mx-8 -mt-6 sm:-mt-8 p-6 sm:p-8 text-center text-white mb-8 border-b-4 border-indigo-500">
                  <div className="flex justify-center items-center space-x-2.5 mb-2.5">
                    <Award className="h-5 w-5 text-indigo-300" />
                    <span className="text-[10px] font-extrabold tracking-widest uppercase text-indigo-300">
                      {category === 'Custom...' ? customCategory.toUpperCase() : category.toUpperCase()} BRIEFING
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2 leading-none">
                    {sector.toUpperCase()} INTEL
                  </h3>
                  {clientName && (
                    <div className="mt-4 flex flex-col items-center justify-center space-y-3">
                      {clientLogo && (
                        <div className="bg-white p-2.5 rounded-lg shadow-sm border border-indigo-200">
                          <img src={clientLogo} alt={clientName} className="h-10 object-contain" />
                        </div>
                      )}
                      <p className="text-xs text-indigo-200 font-bold uppercase tracking-wider">
                        {clientName}
                      </p>
                    </div>
                  )}
                  <div className="w-16 h-0.5 bg-indigo-500 mx-auto my-3"></div>
                  <p className="text-[10px] text-slate-300 font-medium">
                    {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>

                {/* Editorial Columns */}
                <div className="mb-8">
                  <h4 className="text-[11px] font-bold text-indigo-650 uppercase tracking-widest mb-3 border-b-2 border-indigo-100 pb-1.5">
                    Editorial Column
                  </h4>

                  {/* Editorial Hero Image */}
                  <div className="relative group w-full h-52 rounded-xl overflow-hidden mb-4 bg-slate-100 border border-slate-200">
                    <label className="cursor-pointer block w-full h-full">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setResult({ ...result, editorial_image_url: reader.result as string });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      {result.editorial_image_url ? (
                        <img
                          src={result.editorial_image_url}
                          alt="Editorial"
                          className="w-full h-full object-cover group-hover:opacity-75 transition"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 group-hover:text-indigo-400 group-hover:bg-slate-50 transition">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-xs font-semibold opacity-0 group-hover:opacity-100 transition">Click to upload editorial image</span>
                        </div>
                      )}
                      {result.editorial_image_url && (
                        <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <span className="text-white text-xs font-semibold bg-slate-900/60 px-4 py-1.5 rounded-full backdrop-blur-sm">
                            Edit Image
                          </span>
                        </div>
                      )}
                    </label>
                  </div>

                  <textarea 
                    className="auto-resize w-full newsletter-editorial text-slate-800 text-sm leading-relaxed whitespace-pre-line italic border-l-3 border-indigo-500 pl-4 py-1 bg-transparent resize-none overflow-hidden focus:outline-none focus:ring-1 focus:ring-indigo-200"
                    rows={1}
                    value={result.editorial_summary}
                    ref={(el) => autoResize(el)}
                    onInput={(e) => autoResize(e.currentTarget)}
                    onChange={(e) => { setResult({ ...result, editorial_summary: e.target.value }); autoResize(e.target); }}
                  />
                </div>

                {/* Curated Headlines List */}
                <div>
                  <h4 className="text-[11px] font-bold text-indigo-650 uppercase tracking-widest mb-4 border-b-2 border-indigo-100 pb-1.5">
                    Curated Industry Bulletins
                  </h4>
                  
                  <div className="space-y-6">
                    {result.news_items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex gap-5 pb-6 border-b border-slate-100 last:border-b-0 last:pb-0"
                      >
                        {/* Image Panel */}
                        <div className="flex-shrink-0 w-44 h-32 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 relative group">
                          <label className="cursor-pointer block w-full h-full">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    const newItems = [...result.news_items];
                                    newItems[idx] = { ...newItems[idx], image_url: reader.result as string };
                                    setResult({ ...result, news_items: newItems });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.heading}
                                className="w-full h-full object-cover group-hover:opacity-75 transition"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 group-hover:text-indigo-400 group-hover:bg-slate-50 transition">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition">Upload Image</span>
                              </div>
                            )}
                            
                            {/* Hover Overlay */}
                            {item.image_url && (
                              <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                <span className="text-white text-xs font-semibold bg-slate-900/60 px-3 py-1 rounded-full backdrop-blur-sm">
                                  Edit Image
                                </span>
                              </div>
                            )}
                          </label>
                        </div>

                        {/* Text Content */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <textarea
                              className="auto-resize w-full font-bold text-slate-900 text-sm leading-snug hover:text-indigo-600 transition bg-transparent resize-none overflow-hidden focus:outline-none focus:ring-1 focus:ring-indigo-100 px-1 py-0.5 rounded"
                              rows={1}
                              value={item.heading}
                              ref={(el) => autoResize(el)}
                              onInput={(e) => autoResize(e.currentTarget)}
                              onChange={(e) => {
                                const newItems = [...result.news_items];
                                newItems[idx] = { ...newItems[idx], heading: e.target.value };
                                setResult({ ...result, news_items: newItems });
                                autoResize(e.target);
                              }}
                            />
                            <textarea
                              className="auto-resize w-full text-slate-600 text-xs mt-2 leading-relaxed bg-transparent resize-none overflow-hidden focus:outline-none focus:ring-1 focus:ring-indigo-100 px-1 rounded"
                              rows={1}
                              value={item.description}
                              ref={(el) => autoResize(el)}
                              onInput={(e) => autoResize(e.currentTarget)}
                              onChange={(e) => {
                                const newItems = [...result.news_items];
                                newItems[idx] = { ...newItems[idx], description: e.target.value };
                                setResult({ ...result, news_items: newItems });
                                autoResize(e.target);
                              }}
                            />
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-50 border border-slate-100 px-2.5 py-0.5 rounded-full">
                              {extractDomain(item.source_link)}
                            </span>
                            <a
                              href={item.source_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-xs text-indigo-600 hover:text-indigo-800 font-semibold space-x-0.5 print:hidden border border-indigo-200 px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition"
                            >
                              <span>Know more</span>
                              <ExternalLink className="h-3 w-3 shrink-0 ml-0.5" />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Print Footer */}
                <div className="hidden print:block border-t border-slate-150 mt-12 pt-4 text-center text-[9px] text-slate-400">
                  <p>NewsForge AI Briefing &bull; Confidential and Proprietary briefing page.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 mt-12 py-6 bg-slate-950/40 text-center text-xs text-slate-500 print:hidden">
        <p>© 2026 NewsForge AI. Corporate newsletter pipeline system.</p>
      </footer>
    </div>
  );
}
