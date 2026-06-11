import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, FileText, Settings, Copy, Check, AlertCircle, RefreshCw, ExternalLink, Globe, Award, Download, Printer, Trash2, Send, Mail } from 'lucide-react';
import logo from './logo.png';

interface NewsItem {
  heading: string;
  description: string;
  source_link: string;
  image_url?: string | null;
  source_resource?: string;
  hide_resource?: boolean;
  image_position?: string;
}

interface WishSection {
  wish_title: string;
  wish_content: string;
  image_url?: string | null;
  image_position?: string;
}

interface NewsletterResponse {
  editorial_title?: string;
  editorial_summary: string;
  editorial_image_url?: string | null;
  editorial_image_position?: string;
  wish?: WishSection | null;
  news_items: NewsItem[];
}

const COMMON_CATEGORIES = [
  "10xDS CURVE",
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
  const backgroundCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Revert root theme to dark mode and clean up any light mode remnants
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.add('dark');
    root.classList.remove('light');
    localStorage.removeItem('theme');
  }, []);

  // Form fields
  const [sourceMode, setSourceMode] = useState<'search' | 'file'>('search');
  const [sector, setSector] = useState('10xDS CURVE');
  const [category, setCategory] = useState(COMMON_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientLogo, setClientLogo] = useState<string | null>(null);
  const [newsCount, setNewsCount] = useState<number>(5);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [briefingDate, setBriefingDate] = useState(() => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        const resultStr = reader.result as string;
        const base64Data = resultStr.split(',')[1];
        setUploadedFile(base64Data);
      };
      reader.readAsDataURL(file);
    }
  };

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
  const [regeneratingImg, setRegeneratingImg] = useState<'editorial' | 'wish' | number | null>(null);
  const [activeRepositioning, setActiveRepositioning] = useState<'editorial' | 'wish' | number | null>(null);

  interface UploadWarning {
    title: string;
    message: string;
    fileData: string;
    section: 'editorial' | 'wish' | number;
    type: 'size' | 'aspect' | 'both';
  }
  const [uploadWarning, setUploadWarning] = useState<UploadWarning | null>(null);

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
            setSector(data.inputs.sector || '10xDS CURVE');
            if (data.inputs.sector === '10xDS CURVE' || data.inputs.sector === 'Imported Document') {
              setSourceMode('file');
            } else {
              setSourceMode('search');
            }
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
            if (data.inputs.briefingDate) {
              setBriefingDate(data.inputs.briefingDate);
            }
            setResult(data.result);
          }
        }
      } catch (err) {
        console.error("Failed to load persistent newsletter:", err);
      }
    };
    loadPersistentState();
  }, []);

  // Subtle glittery background constellation particles
  useEffect(() => {
    const canvas = backgroundCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      alpha: number;
    }> = [];

    const colors = ['#8B5CF6', '#A855F7', '#C084FC'];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const particleCount = Math.min(180, Math.floor((canvas.width * canvas.height) / 9500));
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.48,
          vy: (Math.random() - 0.5) * 0.48,
          radius: Math.random() * 1.8 + 1.2,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: Math.random() * 0.3 + 0.25,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw faint constellation lines
      ctx.lineWidth = 0.65;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 135) {
            const opacity = (1 - dist / 135) * 0.16;
            ctx.strokeStyle = `rgba(168, 85, 247, ${opacity})`;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw glowing particles
      particles.forEach((p) => {
        // Soft bloom outer glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 3.8, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * 0.45;
        ctx.fill();

        // Inner solid core
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();

        // Slow movement update
        p.x += p.vx;
        p.y += p.vy;

        // Bounce or wrap
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      });

      ctx.globalAlpha = 1.0;
      animationId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
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
            newsCount,
            briefingDate
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
        setSector('10xDS CURVE');
        setCategory(COMMON_CATEGORIES[0]);
        setCustomCategory('');
        setClientName('');
        setClientLogo(null);
        setNewsCount(5);
        setUploadedFile(null);
        setUploadedFileName('');
        setSourceMode('search');
        setBriefingDate(() => {
          const now = new Date();
          return now.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        });
        setResult(null);
        setError('');
      } else {
        console.error("Failed to clear persistent newsletter.");
      }
    } catch (err) {
      console.error("Failed to clear persistent newsletter:", err);
    }
  };

  const handleRegenerateImage = async (type: 'editorial' | 'wish' | number, heading: string, description: string) => {
    if (!heading.trim()) {
      alert("Please enter a heading/title first to generate an image.");
      return;
    }
    setRegeneratingImg(type);
    try {
      const response = await fetch('/api/regenerate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ heading, description })
      });
      if (!response.ok) {
        throw new Error("Failed to regenerate image");
      }
      const data = await response.json();
      if (type === 'editorial') {
        setResult(prev => prev ? { ...prev, editorial_image_url: data.image_url } : null);
      } else if (type === 'wish') {
        setResult(prev => prev ? { ...prev, wish: prev.wish ? { ...prev.wish, image_url: data.image_url } : null } : null);
      } else {
        const idx = type as number;
        setResult(prev => {
          if (!prev) return null;
          const newItems = [...prev.news_items];
          newItems[idx] = { ...newItems[idx], image_url: data.image_url };
          return { ...prev, news_items: newItems };
        });
      }
    } catch (err) {
      alert("Error regenerating image. Please try again.");
    } finally {
      setRegeneratingImg(null);
    }
  };

  const handleDeleteImage = (type: 'editorial' | 'wish' | number) => {
    if (type === 'editorial') {
      setResult(prev => prev ? { ...prev, editorial_image_url: null } : null);
    } else if (type === 'wish') {
      setResult(prev => prev ? { ...prev, wish: prev.wish ? { ...prev.wish, image_url: null } : null } : null);
    } else {
      const idx = type as number;
      setResult(prev => {
        if (!prev) return null;
        const newItems = [...prev.news_items];
        newItems[idx] = { ...newItems[idx], image_url: null };
        return { ...prev, news_items: newItems };
      });
    }
  };

  const applyUploadedImage = (section: 'editorial' | 'wish' | number, dataUrl: string) => {
    if (section === 'editorial') {
      setResult(prev => prev ? { ...prev, editorial_image_url: dataUrl } : null);
    } else if (section === 'wish') {
      setResult(prev => prev ? { ...prev, wish: prev.wish ? { ...prev.wish, image_url: dataUrl } : null } : null);
    } else {
      const idx = section as number;
      setResult(prev => {
        if (!prev) return null;
        const newItems = [...prev.news_items];
        newItems[idx] = { ...newItems[idx], image_url: dataUrl };
        return { ...prev, news_items: newItems };
      });
    }
  };

  const handleImageUpload = (section: 'editorial' | 'wish' | number, file: File) => {
    const isTooLarge = file.size > 2 * 1024 * 1024;
    const sizeMB = (file.size / 1024 / 1024).toFixed(1);

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;

      const img = new Image();
      img.onload = () => {
        const width = img.width;
        const height = img.height;
        const aspect = width / height;

        let isBadAspect = false;
        let aspectText = '';

        if (section === 'editorial') {
          if (aspect < 1.3) {
            isBadAspect = true;
            aspectText = 'landscape (recommended ratio 16:9 or 21:9)';
          }
        } else if (section === 'wish') {
          if (aspect < 1.3) {
            isBadAspect = true;
            aspectText = 'landscape (recommended ratio 16:9 or 2:1)';
          }
        } else {
          if (aspect < 0.95) {
            isBadAspect = true;
            aspectText = 'landscape or square (recommended ratio 4:3 or 16:9)';
          }
        }

        if (isTooLarge || isBadAspect) {
          const warnings = [];
          if (isTooLarge) {
            warnings.push(`File size is ${sizeMB}MB (recommended: under 2MB for optimal email rendering).`);
          }
          if (isBadAspect) {
            warnings.push(`Aspect ratio is close to vertical/square (${width}x${height}px). The container is designed for a ${aspectText} image, so parts of it will be cropped.`);
          }

          setUploadWarning({
            title: isTooLarge && isBadAspect ? 'Image Size & Ratio Warning' : isTooLarge ? 'Large File Size Warning' : 'Aspect Ratio Recommendation',
            message: warnings.join(' ') + ' Do you want to proceed anyway? You can drag and reposition the crop after uploading.',
            fileData: dataUrl,
            section,
            type: isTooLarge && isBadAspect ? 'both' : isTooLarge ? 'size' : 'aspect'
          });
        } else {
          applyUploadedImage(section, dataUrl);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleRepositionStart = (
    e: React.MouseEvent<HTMLDivElement>,
    section: 'editorial' | 'wish' | number
  ) => {
    e.preventDefault();
    if (!result) return;

    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    
    let currentPosStr = '50% 50%';
    if (section === 'editorial') {
      currentPosStr = result.editorial_image_position || '50% 50%';
    } else if (section === 'wish') {
      currentPosStr = result.wish?.image_position || '50% 50%';
    } else {
      currentPosStr = result.news_items[section as number]?.image_position || '50% 50%';
    }

    const [startPosX, startPosY] = currentPosStr.split(' ').map(val => {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? 50 : parsed;
    });

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startMouseX;
      const deltaY = moveEvent.clientY - startMouseY;

      const nextX = Math.max(0, Math.min(100, startPosX - (deltaX / rect.width) * 100));
      const nextY = Math.max(0, Math.min(100, startPosY - (deltaY / rect.height) * 100));
      
      const newPosStr = `${nextX.toFixed(1)}% ${nextY.toFixed(1)}%`;

      if (section === 'editorial') {
        setResult(prev => prev ? { ...prev, editorial_image_position: newPosStr } : null);
      } else if (section === 'wish') {
        setResult(prev => prev ? { ...prev, wish: prev.wish ? { ...prev.wish, image_position: newPosStr } : null } : null);
      } else {
        const idx = section as number;
        setResult(prev => {
          if (!prev) return null;
          const newItems = [...prev.news_items];
          newItems[idx] = { ...newItems[idx], image_position: newPosStr };
          return { ...prev, news_items: newItems };
        });
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleRepositionStartTouch = (
    e: React.TouchEvent<HTMLDivElement>,
    section: 'editorial' | 'wish' | number
  ) => {
    if (!result) return;
    const touch = e.touches[0];
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    
    let currentPosStr = '50% 50%';
    if (section === 'editorial') {
      currentPosStr = result.editorial_image_position || '50% 50%';
    } else if (section === 'wish') {
      currentPosStr = result.wish?.image_position || '50% 50%';
    } else {
      currentPosStr = result.news_items[section as number]?.image_position || '50% 50%';
    }

    const [startPosX, startPosY] = currentPosStr.split(' ').map(val => {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? 50 : parsed;
    });

    const startMouseX = touch.clientX;
    const startMouseY = touch.clientY;

    const handleTouchMove = (moveEvent: TouchEvent) => {
      const moveTouch = moveEvent.touches[0];
      const deltaX = moveTouch.clientX - startMouseX;
      const deltaY = moveTouch.clientY - startMouseY;

      const nextX = Math.max(0, Math.min(100, startPosX - (deltaX / rect.width) * 100));
      const nextY = Math.max(0, Math.min(100, startPosY - (deltaY / rect.height) * 100));
      
      const newPosStr = `${nextX.toFixed(1)}% ${nextY.toFixed(1)}%`;

      if (section === 'editorial') {
        setResult(prev => prev ? { ...prev, editorial_image_position: newPosStr } : null);
      } else if (section === 'wish') {
        setResult(prev => prev ? { ...prev, wish: prev.wish ? { ...prev.wish, image_position: newPosStr } : null } : null);
      } else {
        const idx = section as number;
        setResult(prev => {
          if (!prev) return null;
          const newItems = [...prev.news_items];
          newItems[idx] = { ...newItems[idx], image_position: newPosStr };
          return { ...prev, news_items: newItems };
        });
      }
    };

    const handleTouchEnd = () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
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
      const emailSubject = `${categoryLabel} Briefing: ${sector} Insights — 10xNewsPulse.AI`;
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
    if (sourceMode === 'search') {
      if (!sector.trim()) {
        setError('Sector is required.');
        return;
      }
      if (category === 'Custom...' && !customCategory.trim()) {
        setError('Please specify a custom category.');
        return;
      }
    } else {
      if (!uploadedFile) {
        setError('Please upload a Word document (.docx) first.');
        return;
      }
    }

    setError('');
    setLoading(true);
    setResult(null);

    try {
      let response;
      if (sourceMode === 'search') {
        response = await fetch('/api/generate-newsletter', {
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
      } else {
        response = await fetch('/api/generate-from-file', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileBuffer: uploadedFile,
            clientName,
            clientLogo,
            newsCount,
          }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate newsletter. Please check your configurations.');
      }

      const data = await response.json();
      if (sourceMode === 'file') {
        setSector('10xDS CURVE');
        setCategory('10xDS CURVE');
        setCustomCategory('');
        const now = new Date();
        setBriefingDate(now.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }));
      }
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'An unexpected connection error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const getNewsletterMarkdown = () => {
    if (!result) return '';
    const categoryLabel = category === 'Custom...' ? customCategory : category;

    let md = `# ${categoryLabel.toUpperCase()} BRIEFING: ${sector.toUpperCase()} INSIGHTS\n\n`;
    if (clientName) {
      if (clientLogo) md += `![${clientName} Logo](${clientLogo})\n`;
      md += `**${clientName}**\n\n`;
    }
    md += `*${briefingDate}*\n\n---\n\n## Editorial Overview\n\n`;
    if (result.editorial_title) md += `### ${result.editorial_title}\n\n`;
    if (result.editorial_image_url) md += `![Editorial Image](${result.editorial_image_url})\n\n`;
    md += `_${result.editorial_summary}_\n\n---\n\n`;

    if (result.wish && result.wish.wish_title) {
      md += `## ${result.wish.wish_title}\n\n`;
      if (result.wish.image_url) md += `![Greeting Image](${result.wish.image_url})\n\n`;
      md += `_${result.wish.wish_content}_\n\n---\n\n`;
    }

    md += `## ${sector === '10xDS CURVE' ? 'Current Solutions' : 'Top Industry Briefs'}\n\n`;

    const headlinesMD = result.news_items.map(item => `
### ${item.heading}
${item.image_url ? `![Image](${item.image_url})\n` : ''}
${item.description}
${item.source_link ? `\n[Read Article](${item.source_link})` : ''}
    `).join('\n---\n');
    
    return md + headlinesMD;
  };

  // Generate clean, highly professional HTML template suited for direct pasting into Outlook/Email clients
  const getNewsletterHTML = () => {
    if (!result) return '';
    const categoryLabel = category === 'Custom...' ? customCategory : category;

    const headlinesHTML = result.news_items.map(item => `
      <div style="margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #f1f5f9; display: flex; gap: 16px;">
        <div style="flex-shrink: 0; width: 140px; height: 100px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center;">
          ${item.image_url ? `<img src="${item.image_url}" alt="${item.heading.replace(/"/g, '&quot;')}" style="width: 100%; height: 100%; object-fit: cover; object-position: ${item.image_position || '50% 50%'};" />` : `<span style="color: #cbd5e1; font-size: 11px;">Image Processing</span>`}
        </div>
        <div style="flex-grow: 1;">
          <h4 style="margin: 0 0 8px 0; font-family: 'Outfit', sans-serif; font-size: 15px; color: #0f172a; line-height: 1.4;">
            ${item.heading}
          </h4>
          <p style="margin: 0 0 12px 0; font-family: 'Inter', sans-serif; font-size: 13px; color: #475569; line-height: 1.5;">
            ${item.description}
          </p>
          ${item.source_link ? `
          <a href="${item.source_link}" style="display: inline-block; font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 600; color: #4f46e5; text-decoration: none; border: 1px solid #c7d2fe; padding: 4px 12px; border-radius: 4px;">
            Read Full Article &rarr;
          </a>` : ''}
        </div>
      </div>
    `).join('');

    const wishHTML = (result.wish && result.wish.wish_title) ? `
      <div style="margin-bottom: 32px; padding: 20px; background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 12px;">
        <h4 style="margin: 0 0 12px 0; font-family: 'Outfit', sans-serif; font-size: 16px; color: #4c1d95; font-weight: bold;">
          ${result.wish.wish_title}
        </h4>
        ${result.wish.image_url ? `<img src="${result.wish.image_url}" alt="Greeting" style="width: 100%; border-radius: 10px; margin-bottom: 12px; object-fit: cover; max-height: 200px; object-position: ${result.wish.image_position || '50% 50%'};" />` : ''}
        <p style="margin: 0; font-family: 'Inter', sans-serif; font-size: 13px; color: #5b21b6; line-height: 1.6; white-space: pre-line;">
          ${result.wish.wish_content}
        </p>
      </div>
    ` : '';

    return `
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px; text-align: center; color: #ffffff;">
          <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; color: #a5b4fc;">
            ${categoryLabel.toUpperCase()} BRIEFING
          </p>
          <h1 style="margin: 0 0 8px 0; font-family: 'Outfit', sans-serif; font-size: 26px; font-weight: 800; letter-spacing: -0.02em;">
            ${sector.toUpperCase()}
          </h1>
          ${clientName ? `
            <div style="margin-top: 16px;">
              ${clientLogo ? `<div style="background: white; display: inline-block; padding: 8px; border-radius: 8px;"><img src="${clientLogo}" alt="${clientName}" style="height: 40px; object-fit: contain;" /></div>` : ''}
              <p style="margin: 8px 0 0 0; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; color: #e0e7ff;">${clientName}</p>
            </div>
          ` : ''}
          <p style="margin: 16px 0 0 0; font-size: 11px; color: #c7d2fe;">${briefingDate}</p>
        </div>
        <div style="padding: 32px;">
          <h3 style="margin: 0 0 12px 0; font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #4f46e5;">
            Editorial Overview
          </h3>
          ${result.editorial_title ? `
            <h4 style="margin: 0 0 12px 0; font-family: 'Outfit', sans-serif; font-size: 17px; font-weight: bold; color: #1e293b;">
              ${result.editorial_title}
            </h4>
          ` : ''}
          ${result.editorial_image_url ? `<img src="${result.editorial_image_url}" alt="Editorial" style="width: 100%; border-radius: 10px; margin-bottom: 16px; object-fit: cover; max-height: 220px; object-position: ${result.editorial_image_position || '50% 50%'};" />` : ''}
          <p style="margin: 0 0 32px 0; font-family: 'Playfair Display', Georgia, serif; font-size: 15px; color: #334155; line-height: 1.7; white-space: pre-line; font-style: italic; border-left: 3px solid #6366f1; padding-left: 16px;">
            ${result.editorial_summary}
          </p>
          
          ${wishHTML}
          
          <h3 style="margin: 0 0 16px 0; font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #4f46e5;">
            ${sector === '10xDS CURVE' ? 'Current Solutions' : 'Top Industry Briefs'}
          </h3>
          ${headlinesHTML}
        </div>
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-family: 'Inter', sans-serif; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
          <p style="margin: 0 0 4px 0;">Generated automatically by <strong>10xNewsPulse.AI</strong></p>
          <p style="margin: 0;">Powered by Google Vertex AI Gemini 2.5</p>
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

  const loadingStagesText = sourceMode === 'file'
    ? [
        "Reading and parsing uploaded Word document text...",
        "Extracting structured sections, greetings, and bullet bulletins from file...",
        "Synthesizing high-impact editorial overview using Vertex AI (Gemini 2.5 Flash)...",
        "Polishing structured bulletins & preparing final previews..."
      ]
    : [
        "Contacting Google Search Ingestion service...",
        "Crawling recent industry updates & Google News index...",
        "Synthesizing high-impact editorial using Vertex AI (Gemini 2.5 Flash)...",
        "Polishing structured headlines & preparing premium layouts..."
      ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-indigo-500/30 selection:text-indigo-200 relative">
      
      {/* Subtle background constellation particles */}
      <canvas 
        ref={backgroundCanvasRef} 
        className="fixed inset-0 w-full h-full pointer-events-none z-0" 
      />

      {/* Visual background ambient glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-650/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-1/3 right-1/4 w-[450px] h-[450px] bg-violet-650/10 rounded-full blur-[150px] pointer-events-none"></div>

      {/* Top Header */}
      <header className="border-b border-slate-900 bg-slate-950/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="flex items-center justify-center h-12 overflow-hidden">
              <img 
                src={logo} 
                alt="10xDS Logo" 
                className="h-10 w-auto object-contain" 
                style={{ filter: 'invert(1) hue-rotate(180deg)', mixBlendMode: 'screen' }}
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-300">
                  10xNewsPulse.AI
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
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        
        {/* Left Panel: Inputs Form */}
        <div className="w-full lg:w-5/12 space-y-6 print:hidden">
          <div className="glass-panel p-6 rounded-2xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>
            
            <div className="flex items-center space-x-3 mb-6">
              <Settings className="h-5 w-5 text-indigo-400" />
              <h2 className="text-base font-bold text-slate-200 tracking-wide">Briefing Setup</h2>
            </div>            <form onSubmit={handleGenerate} className="space-y-5">
              
              {/* Source Mode Toggle */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Briefing Source
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => { setSourceMode('search'); setError(''); }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                      sourceMode === 'search'
                        ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Globe className="h-3.5 w-3.5" />
                    <span>Web Search</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSourceMode('file'); setError(''); }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                      sourceMode === 'file'
                        ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Import File</span>
                  </button>
                </div>
              </div>

              {/* Word File Upload (File mode) */}
              {sourceMode === 'file' && (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    Upload Word Document (.docx)
                  </label>
                  <div className="relative group border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl p-4 bg-slate-950/40 text-center transition cursor-pointer">
                    <input
                      type="file"
                      accept=".docx"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <FileText className={`h-8 w-8 transition ${uploadedFile ? 'text-indigo-400' : 'text-slate-500 group-hover:text-indigo-400'}`} />
                      {uploadedFileName ? (
                        <div className="text-xs text-slate-200 font-semibold truncate max-w-full px-2">
                          {uploadedFileName}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 font-medium">
                          Click to select a <span className="text-indigo-400 font-semibold">.docx</span> file
                        </div>
                      )}
                      <div className="text-[10px] text-slate-500">
                        Word document up to 10MB
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sector Input (Search mode) */}
              {sourceMode === 'search' && (
                <div className="animate-in fade-in duration-200 space-y-5">
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
                        required={sourceMode === 'search'}
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
                        required={sourceMode === 'search'}
                        placeholder="e.g. Quantum Cryptography, Fusion Energy"
                        className="block w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm shadow-inner"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                      />
                    </div>
                  )}
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
                    <input
                      type="text"
                      className="bg-transparent text-[10px] font-extrabold tracking-widest uppercase text-indigo-300 text-center focus:outline-none focus:ring-1 focus:ring-indigo-500 border-none w-64 px-1 py-0.5 rounded cursor-pointer hover:bg-white/10"
                      value={category === 'Custom...' ? customCategory : category}
                      onChange={(e) => {
                        setCategory('Custom...');
                        setCustomCategory(e.target.value);
                      }}
                    />
                  </div>
                  <div className="flex justify-center">
                    <textarea
                      rows={1}
                      className="auto-resize bg-transparent text-2xl sm:text-3xl font-extrabold tracking-tight text-white text-center focus:outline-none focus:ring-1 focus:ring-indigo-500 border-none w-full uppercase resize-none overflow-hidden px-1 py-0.5 rounded cursor-pointer hover:bg-white/10"
                      value={sector}
                      ref={(el) => autoResize(el)}
                      onInput={(e) => autoResize(e.currentTarget)}
                      onChange={(e) => {
                        setSector(e.target.value);
                        autoResize(e.target);
                      }}
                    />
                  </div>
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
                  <div className="flex justify-center">
                    <input
                      type="text"
                      className="bg-transparent text-[10px] text-slate-350 font-medium text-center focus:outline-none focus:ring-1 focus:ring-indigo-500 border-none w-48 px-1 py-0.5 rounded cursor-pointer hover:bg-white/10"
                      value={briefingDate}
                      onChange={(e) => setBriefingDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Editorial Columns */}
                <div className="mb-8">
                  <h4 className="text-[11px] font-bold text-indigo-650 uppercase tracking-widest mb-1.5">
                    Editorial Column
                  </h4>
                  <div className="relative w-full h-[1px] bg-slate-200/85 mb-4 flex items-center">
                    <div className="absolute left-0 w-1.5 h-1.5 rounded-full bg-[#8B5CF6]"></div>
                  </div>

                  {/* Editorial Title (if extracted) */}
                  {result.editorial_title !== undefined && (
                    <textarea
                      className="auto-resize w-full font-extrabold text-slate-900 text-lg sm:text-xl leading-snug mb-3 bg-transparent resize-none overflow-hidden focus:outline-none focus:ring-1 focus:ring-indigo-100 px-1 py-0.5 rounded"
                      rows={1}
                      value={result.editorial_title}
                      ref={(el) => autoResize(el)}
                      onInput={(e) => autoResize(e.currentTarget)}
                      onChange={(e) => {
                        setResult({ ...result, editorial_title: e.target.value });
                        autoResize(e.target);
                      }}
                    />
                  )}

                  {/* Editorial Hero Image */}
                  <div
                    className={`relative group w-full h-52 rounded-xl overflow-hidden mb-4 bg-slate-100 border border-slate-200 transition-all duration-200 ${
                      activeRepositioning === 'editorial' ? 'cursor-move ring-4 ring-indigo-500 ring-offset-2 ring-offset-white z-30 shadow-2xl' : ''
                    }`}
                    onMouseDown={activeRepositioning === 'editorial' ? (e) => handleRepositionStart(e, 'editorial') : undefined}
                    onTouchStart={activeRepositioning === 'editorial' ? (e) => handleRepositionStartTouch(e, 'editorial') : undefined}
                  >
                    {result.editorial_image_url ? (
                      <img
                        src={result.editorial_image_url}
                        alt="Editorial"
                        className="w-full h-full object-cover select-none pointer-events-none"
                        style={{ objectPosition: result.editorial_image_position || '50% 50%' }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-350 bg-slate-50">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs font-semibold text-slate-400">No Editorial Image</span>
                      </div>
                    )}

                    {/* Loader spinner during regeneration */}
                    {regeneratingImg === 'editorial' && (
                      <div className="absolute inset-0 bg-slate-900/70 flex flex-col items-center justify-center text-white z-30">
                        <RefreshCw className="h-7 w-7 animate-spin text-indigo-400 mb-2" />
                        <span className="text-xs font-semibold">Generating Image...</span>
                      </div>
                    )}

                    {/* Drag positioning banner inside container */}
                    {activeRepositioning === 'editorial' && (
                      <div className="absolute inset-0 bg-indigo-950/20 border-2 border-indigo-500 z-30 flex flex-col items-center justify-center pointer-events-none select-none">
                        <div className="bg-indigo-600/90 text-white text-[11px] font-bold px-3.5 py-1.5 rounded-full shadow-lg flex items-center space-x-2 backdrop-blur-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7l4-4m0 0l4 4m-4-4v18m0 0l-4-4m4 4l4-4" />
                          </svg>
                          <span>Drag image to move &amp; adjust fit</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setActiveRepositioning(null);
                          }}
                          className="absolute bottom-3 right-3 bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-md pointer-events-auto cursor-pointer z-40 transition border border-indigo-400/30"
                        >
                          Done
                        </button>
                      </div>
                    )}

                    {/* Actions Overlay (visible on hover) */}
                    {activeRepositioning !== 'editorial' && (
                      <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition duration-200 z-20 space-y-2">
                        <div className="flex space-x-2">
                          {/* Upload local image */}
                          <label className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg cursor-pointer transition flex items-center justify-center" title="Upload local image">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleImageUpload('editorial', file);
                                }
                              }}
                            />
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                          </label>

                          {/* Reposition image crop */}
                          {result.editorial_image_url && (
                            <button
                              type="button"
                              onClick={() => setActiveRepositioning('editorial')}
                              className="p-2 bg-indigo-600 hover:bg-indigo-550 text-white rounded-lg transition flex items-center justify-center"
                              title="Reposition/Crop Image"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h-4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                              </svg>
                            </button>
                          )}

                          {/* Regenerate image */}
                          <button
                            type="button"
                            onClick={() => handleRegenerateImage('editorial', result.editorial_title || sector || 'Industry Overview', result.editorial_summary)}
                            className="p-2 bg-indigo-650 hover:bg-indigo-500 text-white rounded-lg transition flex items-center justify-center font-medium"
                            title="Regenerate with AI"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>

                          {/* Delete image */}
                          {result.editorial_image_url && (
                            <button
                              type="button"
                              onClick={() => handleDeleteImage('editorial')}
                              className="p-2 bg-red-650 hover:bg-red-500 text-white rounded-lg transition flex items-center justify-center"
                              title="Remove image"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        <div className="text-center select-none">
                          <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider block">Adjust Image</span>
                          <span className="text-[9px] text-indigo-300 font-medium tracking-wide block mt-0.5 bg-indigo-900/40 px-2 py-0.5 rounded-full">Rec: Landscape (16:9), under 2MB</span>
                        </div>
                      </div>
                    )}
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

                {/* Wish Section */}
                {result.wish && result.wish.wish_title && (
                  <div className="mb-8 p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100/40 relative">
                    <textarea
                      className="auto-resize w-full font-extrabold text-indigo-950 text-lg leading-snug mb-3 bg-transparent resize-none overflow-hidden focus:outline-none focus:ring-1 focus:ring-indigo-100 px-1 py-0.5 rounded"
                      rows={1}
                      value={result.wish.wish_title}
                      ref={(el) => autoResize(el)}
                      onInput={(e) => autoResize(e.currentTarget)}
                      onChange={(e) => {
                        setResult({
                          ...result,
                          wish: { ...result.wish!, wish_title: e.target.value }
                        });
                        autoResize(e.target);
                      }}
                    />
                    
                    {/* Wish Image */}
                    <div
                      className={`relative group w-full h-48 rounded-xl overflow-hidden mb-4 bg-slate-100 border border-slate-200 transition-all duration-200 ${
                        activeRepositioning === 'wish' ? 'cursor-move ring-4 ring-indigo-500 ring-offset-2 ring-offset-white z-30 shadow-2xl' : ''
                      }`}
                      onMouseDown={activeRepositioning === 'wish' ? (e) => handleRepositionStart(e, 'wish') : undefined}
                      onTouchStart={activeRepositioning === 'wish' ? (e) => handleRepositionStartTouch(e, 'wish') : undefined}
                    >
                      {result.wish.image_url ? (
                        <img
                          src={result.wish.image_url}
                          alt="Wish greeting"
                          className="w-full h-full object-cover select-none pointer-events-none"
                          style={{ objectPosition: result.wish.image_position || '50% 50%' }}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-350 bg-slate-50">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-1 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-xs font-semibold text-slate-400">No Wish Image</span>
                        </div>
                      )}

                      {/* Loader spinner during regeneration */}
                      {regeneratingImg === 'wish' && (
                        <div className="absolute inset-0 bg-slate-900/70 flex flex-col items-center justify-center text-white z-30">
                          <RefreshCw className="h-7 w-7 animate-spin text-indigo-400 mb-2" />
                          <span className="text-xs font-semibold">Generating Image...</span>
                        </div>
                      )}

                      {/* Drag positioning banner inside container */}
                      {activeRepositioning === 'wish' && (
                        <div className="absolute inset-0 bg-indigo-950/20 border-2 border-indigo-500 z-30 flex flex-col items-center justify-center pointer-events-none select-none">
                          <div className="bg-indigo-600/90 text-white text-[11px] font-bold px-3.5 py-1.5 rounded-full shadow-lg flex items-center space-x-2 backdrop-blur-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7l4-4m0 0l4 4m-4-4v18m0 0l-4-4m4 4l4-4" />
                            </svg>
                            <span>Drag image to move &amp; adjust fit</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setActiveRepositioning(null);
                            }}
                            className="absolute bottom-3 right-3 bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-md pointer-events-auto cursor-pointer z-40 transition border border-indigo-400/30"
                          >
                            Done
                          </button>
                        </div>
                      )}

                      {/* Actions Overlay (visible on hover) */}
                      {activeRepositioning !== 'wish' && (
                        <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition duration-200 z-20 space-y-2">
                          <div className="flex space-x-2">
                            {/* Upload local image */}
                            <label className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg cursor-pointer transition flex items-center justify-center" title="Upload local image">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleImageUpload('wish', file);
                                  }
                                }}
                              />
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                            </label>

                            {/* Reposition button */}
                            {result.wish.image_url && (
                              <button
                                type="button"
                                onClick={() => setActiveRepositioning('wish')}
                                className="p-2 bg-indigo-600 hover:bg-indigo-555 text-white rounded-lg transition flex items-center justify-center"
                                title="Reposition/Crop Image"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h-4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                                </svg>
                              </button>
                            )}

                            {/* Regenerate image */}
                            <button
                              type="button"
                              onClick={() => handleRegenerateImage('wish', result.wish!.wish_title, result.wish!.wish_content)}
                              className="p-2 bg-indigo-650 hover:bg-indigo-500 text-white rounded-lg transition flex items-center justify-center font-medium"
                              title="Regenerate with AI"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>

                            {/* Delete image */}
                            {result.wish.image_url && (
                              <button
                                type="button"
                                onClick={() => handleDeleteImage('wish')}
                                className="p-2 bg-red-655 hover:bg-red-500 text-white rounded-lg transition flex items-center justify-center"
                                title="Remove image"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          <div className="text-center select-none">
                            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider block">Adjust Image</span>
                            <span className="text-[9px] text-indigo-300 font-medium tracking-wide block mt-0.5 bg-indigo-900/40 px-2 py-0.5 rounded-full">Rec: Landscape (16:9), under 2MB</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <textarea
                      className="auto-resize w-full text-slate-700 text-sm leading-relaxed whitespace-pre-line bg-transparent resize-none overflow-hidden focus:outline-none focus:ring-1 focus:ring-indigo-100 px-1 py-0.5 rounded"
                      rows={1}
                      value={result.wish.wish_content}
                      ref={(el) => autoResize(el)}
                      onInput={(e) => autoResize(e.currentTarget)}
                      onChange={(e) => {
                        setResult({
                          ...result,
                          wish: { ...result.wish!, wish_content: e.target.value }
                        });
                        autoResize(e.target);
                      }}
                    />
                  </div>
                )}

                {/* Curated Headlines List */}
                <div>
                  <h4 className="text-[11px] font-bold text-indigo-650 uppercase tracking-widest mb-2">
                    {sector === '10xDS CURVE' ? 'Current Solutions' : 'Curated Industry Bulletins'}
                  </h4>
                  <div className="relative w-full h-[1px] bg-slate-200/85 mb-4 flex items-center">
                    <div className="absolute left-0 w-1.5 h-1.5 rounded-full bg-[#8B5CF6]"></div>
                  </div>
                  
                  <div className="space-y-6">
                    {result.news_items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex gap-5 pb-6 border-b border-slate-100 last:border-b-0 last:pb-0"
                      >
                        {/* Image Panel */}
                        <div
                          className={`flex-shrink-0 w-44 h-32 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 relative group transition-all duration-200 ${
                            activeRepositioning === idx ? 'cursor-move ring-4 ring-indigo-500 ring-offset-2 ring-offset-white z-30 shadow-2xl' : ''
                          }`}
                          onMouseDown={activeRepositioning === idx ? (e) => handleRepositionStart(e, idx) : undefined}
                          onTouchStart={activeRepositioning === idx ? (e) => handleRepositionStartTouch(e, idx) : undefined}
                        >
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.heading}
                              className="w-full h-full object-cover select-none pointer-events-none"
                              style={{ objectPosition: item.image_position || '50% 50%' }}
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-350 bg-slate-50">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-1 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="text-xs font-semibold text-slate-400">No Image</span>
                            </div>
                          )}

                          {/* Loader spinner during regeneration */}
                          {regeneratingImg === idx && (
                            <div className="absolute inset-0 bg-slate-900/70 flex flex-col items-center justify-center text-white z-30">
                              <RefreshCw className="h-6 w-6 animate-spin text-indigo-400 mb-1" />
                              <span className="text-[10px] font-semibold">Generating...</span>
                            </div>
                          )}

                          {/* Drag positioning banner inside container */}
                          {activeRepositioning === idx && (
                            <div className="absolute inset-0 bg-indigo-950/20 border-2 border-indigo-500 z-30 flex flex-col items-center justify-center pointer-events-none select-none">
                              <div className="bg-indigo-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center space-x-1 backdrop-blur-sm text-center max-w-[90%]">
                                <span>Drag to reposition</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setActiveRepositioning(null);
                                }}
                                className="absolute bottom-1 right-1 bg-indigo-650 hover:bg-indigo-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow pointer-events-auto cursor-pointer z-40 transition border border-indigo-400/30"
                              >
                                Done
                              </button>
                            </div>
                          )}

                          {/* Actions Overlay (visible on hover) */}
                          {activeRepositioning !== idx && (
                            <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition duration-200 z-20 space-y-1">
                              <div className="flex space-x-1.5">
                                {/* Upload local image */}
                                <label className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg cursor-pointer transition flex items-center justify-center" title="Upload local image">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleImageUpload(idx, file);
                                      }
                                    }}
                                  />
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                  </svg>
                                </label>

                                {/* Reposition button */}
                                {item.image_url && (
                                  <button
                                    type="button"
                                    onClick={() => setActiveRepositioning(idx)}
                                    className="p-1.5 bg-indigo-600 hover:bg-indigo-555 text-white rounded-lg transition flex items-center justify-center"
                                    title="Reposition/Crop Image"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h-4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                                    </svg>
                                  </button>
                                )}

                                {/* Regenerate image */}
                                <button
                                  type="button"
                                  onClick={() => handleRegenerateImage(idx, item.heading, item.description)}
                                  className="p-1.5 bg-indigo-650 hover:bg-indigo-500 text-white rounded-lg transition flex items-center justify-center font-medium"
                                  title="Regenerate with AI"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" />
                                </button>

                                {/* Delete image */}
                                {item.image_url && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteImage(idx)}
                                    className="p-1.5 bg-red-650 hover:bg-red-500 text-white rounded-lg transition flex items-center justify-center"
                                    title="Remove image"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                              <div className="text-center select-none px-1">
                                <span className="text-[9px] text-slate-300 font-bold uppercase tracking-wider block">Adjust</span>
                                <span className="text-[7.5px] text-indigo-300 font-medium tracking-wide block mt-0.5">Rec: 4:3, under 2MB</span>
                              </div>
                            </div>
                          )}
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
                            {!item.hide_resource && (
                              <span className="inline-flex items-center text-[10px] text-slate-450 font-bold uppercase tracking-wider bg-slate-50 border border-slate-100 px-2.5 py-0.5 rounded-full space-x-1.5 hover:bg-slate-100/60 transition">
                                {item.source_link ? (
                                  <span>{extractDomain(item.source_link)}</span>
                                ) : (
                                  <input
                                    type="text"
                                    className="bg-transparent border-none text-[10px] text-slate-450 font-bold uppercase tracking-wider w-24 p-0 focus:outline-none focus:ring-0 cursor-text"
                                    value={item.source_resource !== undefined ? item.source_resource : 'Doc Resource'}
                                    onChange={(e) => {
                                      const newItems = [...result.news_items];
                                      newItems[idx] = { ...newItems[idx], source_resource: e.target.value };
                                      setResult({ ...result, news_items: newItems });
                                    }}
                                    placeholder="Doc Resource"
                                    title="Click to edit resource label"
                                  />
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newItems = [...result.news_items];
                                    newItems[idx] = { ...newItems[idx], hide_resource: true };
                                    setResult({ ...result, news_items: newItems });
                                  }}
                                  className="text-slate-400 hover:text-red-500 font-bold hover:bg-slate-200/50 rounded-full w-3.5 h-3.5 inline-flex items-center justify-center focus:outline-none leading-none pb-0.5"
                                  title="Delete label"
                                >
                                  &times;
                                </button>
                              </span>
                            )}
                            {item.source_link && (
                              <a
                                href={item.source_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-xs text-indigo-600 hover:text-indigo-800 font-semibold space-x-0.5 print:hidden border border-indigo-200 px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition"
                              >
                                <span>Know more</span>
                                <ExternalLink className="h-3 w-3 shrink-0 ml-0.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Print Footer */}
                <div className="hidden print:block border-t border-slate-150 mt-12 pt-4 text-center text-[9px] text-slate-400">
                  <p>10xNewsPulse.AI Briefing &bull; Confidential and Proprietary briefing page.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-900 mt-12 py-6 bg-slate-950/40 text-center text-xs text-slate-500 print:hidden">
        <p>© 2026 10xNewsPulse.AI. Corporate newsletter pipeline system.</p>
      </footer>

      {/* Upload Warning Modal */}
      {uploadWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl text-center flex flex-col items-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="h-12 w-12 text-amber-500 bg-amber-500/10 p-2.5 rounded-full flex items-center justify-center mb-1">
              <AlertCircle className="h-7 w-7" />
            </div>
            
            <h3 className="text-base font-extrabold text-white tracking-wide">
              {uploadWarning.title}
            </h3>
            
            <p className="text-xs text-slate-300 leading-relaxed text-left">
              {uploadWarning.message}
            </p>

            <div className="w-32 h-20 bg-slate-950 rounded-lg overflow-hidden border border-slate-800 my-2">
              <img src={uploadWarning.fileData} className="w-full h-full object-cover" alt="Upload preview" />
            </div>

            <div className="flex space-x-2.5 w-full pt-2">
              <button
                type="button"
                onClick={() => {
                  applyUploadedImage(uploadWarning.section, uploadWarning.fileData);
                  setUploadWarning(null);
                }}
                className="flex-1 py-2 px-3 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-xl text-xs transition border border-indigo-400/20 shadow-lg cursor-pointer"
              >
                Proceed anyway
              </button>
              <button
                type="button"
                onClick={() => setUploadWarning(null)}
                className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition border border-slate-750 cursor-pointer"
              >
                Cancel &amp; Resize
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
