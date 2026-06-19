import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, FileText, Settings, Copy, Check, AlertCircle, RefreshCw, Globe, Download, Printer, Trash2, Send, Mail, Clock, FolderOpen, Edit } from 'lucide-react';
import logo from './logo.png';
import logoCurveImg from './logo_curve.jpg';
import { LOGO_CURVE_BASE64 } from './logoCurve';
import { LOGO_BASE64 } from './logoBase64';
import { FACEBOOK_ICON_BASE64, LINKEDIN_ICON_BASE64, TWITTER_ICON_BASE64, INSTAGRAM_ICON_BASE64, WEBSITE_ICON_BASE64 } from './socialIcons';

interface NewsItem {
  heading: string;
  description: string;
  source_link: string;
  image_url?: string | null;
  source_resource?: string;
  hide_resource?: boolean;
  image_position?: string;
  hide_url_input?: boolean;
  button_text?: string;
}

interface WishSection {
  wish_title: string;
  wish_content: string;
  image_url?: string | null;
  image_position?: string;
}

interface BlogItem {
  heading: string;
  image_url?: string | null;
  image_position?: string;
  is_ai_generated?: boolean;
  link_url?: string;
  hide_url_input?: boolean;
}

interface NewsletterResponse {
  editorial_title?: string;
  editorial_summary: string;
  editorial_image_url?: string | null;
  editorial_image_position?: string;
  wish?: WishSection | null;
  news_items: NewsItem[];
  blog_title?: string;
  blog_items?: BlogItem[];
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
  const [briefingId, setBriefingId] = useState<string | null>(null);
  const [archives, setArchives] = useState<any[]>([]);
  const [archivesLoading, setArchivesLoading] = useState(false);
  
  interface UploadedFileItem {
    name: string;
    data: string; // base64 string
    type: 'docx' | 'pdf';
  }
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileItem[]>([]);

  const [briefingDate, setBriefingDate] = useState(() => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    
    // Read all selected files in parallel
    const readFilesPromises = fileList.map(file => {
      return new Promise<UploadedFileItem | null>((resolve) => {
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (extension !== 'docx' && extension !== 'pdf') {
          resolve(null);
          return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          const resultStr = reader.result as string;
          const base64Data = resultStr.split(',')[1];
          resolve({
            name: file.name,
            data: base64Data,
            type: extension as 'docx' | 'pdf'
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readFilesPromises).then(results => {
      const validFiles = results.filter((f): f is UploadedFileItem => f !== null);
      setUploadedFiles(prev => {
        // Prevent duplicate filenames by filtering them out of previous list
        const filteredPrev = prev.filter(p => !validFiles.some(v => v.name === p.name));
        return [...filteredPrev, ...validFiles];
      });
      // Clear input so selecting the same file again triggers onChange
      e.target.value = '';
    });
  };

  const removeUploadedFile = (name: string) => {
    setUploadedFiles(prev => prev.filter(f => f.name !== name));
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
  const [generatingBlogIdx, setGeneratingBlogIdx] = useState<number | null>(null);
  const [editingNewsHeading, setEditingNewsHeading] = useState<number | null>(null);
  const [editingBlogHeading, setEditingBlogHeading] = useState<number | null>(null);

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

  const DEFAULT_BLOG_ITEMS: BlogItem[] = [
    { heading: "Leveraging AI and Copilot in Microsoft's Power Platform", image_url: null, image_position: "50% 50%" },
    { heading: "Automating GRC for better Governance, Risk management and Compliance", image_url: null, image_position: "50% 50%" },
    { heading: "Adaptive AI: The Art of Learning, Adapting, and Excelling", image_url: null, image_position: "50% 50%" },
    { heading: "Rising Demand for AI-Driven Intelligent Applications", image_url: null, image_position: "50% 50%" }
  ];

  const ensureBlogsData = (res: NewsletterResponse | null): NewsletterResponse | null => {
    if (!res) return null;
    return {
      ...res,
      blog_title: res.blog_title || "From our Blogs",
      blog_items: res.blog_items && res.blog_items.length === 4 ? res.blog_items : DEFAULT_BLOG_ITEMS
    };
  };

  const [copiedType, setCopiedType] = useState<'markdown' | 'html' | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailMock, setEmailMock] = useState(false);
  const [emailError, setEmailError] = useState('');

  const fetchArchiveList = async () => {
    setArchivesLoading(true);
    try {
      const response = await fetch('/api/archive');
      if (response.ok) {
        const data = await response.json();
        setArchives(data);
      }
    } catch (err) {
      console.error("Failed to fetch archive list:", err);
    } finally {
      setArchivesLoading(false);
    }
  };

  const handleLoadArchive = async (id: string) => {
    try {
      const response = await fetch(`/api/archive/${id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.inputs && data.result) {
          setSector(data.inputs.sector || '10xDS CURVE');
          setSourceMode(data.inputs.sourceMode || (data.inputs.sector === '10xDS CURVE' || data.inputs.sector === 'Imported Document' ? 'file' : 'search'));
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
          setResult(ensureBlogsData(data.result));
          setBriefingId(data.briefingId || data.inputs.briefingId || id);
          setUploadedFiles([]);
        }
      } else {
        alert("Failed to load archive details.");
      }
    } catch (err) {
      console.error("Failed to load archived briefing:", err);
    }
  };

  const handleDeleteArchive = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this archived briefing? This action cannot be undone.")) {
      return;
    }
    try {
      const response = await fetch(`/api/archive/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        if (briefingId === id) {
          setBriefingId(null);
        }
        fetchArchiveList();
      } else {
        alert("Failed to delete archive.");
      }
    } catch (err) {
      console.error("Failed to delete archive:", err);
    }
  };

  // Load persistent newsletter state on mount
  useEffect(() => {
    const loadPersistentState = async () => {
      try {
        const response = await fetch('/api/latest-newsletter');
        if (response.ok) {
          const data = await response.json();
          if (data.inputs && data.result) {
            setSector(data.inputs.sector || '10xDS CURVE');
            setSourceMode(data.inputs.sourceMode || (data.inputs.sector === '10xDS CURVE' || data.inputs.sector === 'Imported Document' ? 'file' : 'search'));
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
            setResult(ensureBlogsData(data.result));
            if (data.briefingId || data.inputs.briefingId) {
              setBriefingId(data.briefingId || data.inputs.briefingId);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load persistent newsletter:", err);
      }
    };
    loadPersistentState();
    fetchArchiveList();
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
            briefingDate,
            sourceMode,
            briefingId
          },
          result: {
            ...result,
            briefingId
          }
        })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.briefingId) {
          setBriefingId(data.briefingId);
        }
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
        fetchArchiveList();
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
        setUploadedFiles([]);
        setSourceMode('search');
        setBriefingId(null);
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
          if (aspect < 0.9 || aspect > 1.1) {
            isBadAspect = true;
            aspectText = 'square (recommended ratio 1:1)';
          }
        }

        if (isTooLarge || isBadAspect) {
          const warnings = [];
          if (isTooLarge) {
            warnings.push(`File size is ${sizeMB}MB (recommended: under 2MB for optimal email rendering).`);
          }
          if (isBadAspect) {
            const isSquareReq = aspectText.includes('square');
            warnings.push(`Aspect ratio is ${isSquareReq ? 'not square' : 'close to vertical/square'} (${width}x${height}px). The container is designed for a ${aspectText} image, so parts of it will be cropped.`);
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

  const handleBlogImageUpload = (idx: number, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setResult(prev => {
        if (!prev || !prev.blog_items) return prev;
        const newItems = [...prev.blog_items];
        newItems[idx] = { ...newItems[idx], image_url: dataUrl, is_ai_generated: false };
        return { ...prev, blog_items: newItems };
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteBlogImage = (idx: number) => {
    setResult(prev => {
      if (!prev || !prev.blog_items) return prev;
      const newItems = [...prev.blog_items];
      newItems[idx] = { ...newItems[idx], image_url: null, is_ai_generated: false };
      return { ...prev, blog_items: newItems };
    });
  };

  const handleGenerateBlogImage = async (idx: number, heading: string) => {
    if (!heading.trim()) {
      alert("Please enter a heading/title for this blog item before generating an image.");
      return;
    }
    setGeneratingBlogIdx(idx);
    try {
      const response = await fetch('/api/generate-blog-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ heading }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.image_url) {
          setResult(prev => {
            if (!prev || !prev.blog_items) return prev;
            const newItems = [...prev.blog_items];
            newItems[idx] = { ...newItems[idx], image_url: data.image_url, is_ai_generated: true };
            return { ...prev, blog_items: newItems };
          });
        } else {
          alert("Failed to generate blog image: No image data returned.");
        }
      } else {
        const errData = await response.json();
        alert(`Error generating image: ${errData.error || response.statusText}`);
      }
    } catch (err: any) {
      console.error("Error generating blog image:", err);
      alert(`Error generating image: ${err.message || err}`);
    } finally {
      setGeneratingBlogIdx(null);
    }
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

  const handleDownloadImage = async (url: string | null | undefined, filename: string) => {
    if (!url) return;
    try {
      if (url.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
      
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Failed to download image:", err);
      window.open(url, '_blank');
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
      if (uploadedFiles.length === 0) {
        setError('Please upload at least one Word (.docx) or PDF (.pdf) file.');
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
            files: uploadedFiles,
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

      const enrichedData = { ...data };
      if (!enrichedData.wish) {
        enrichedData.wish = {
          wish_title: "Holiday Greeting / Festival Wish",
          wish_content: "Write your custom greeting/wish message here... (Click to edit text, or click delete in the top-right to remove this section)",
          image_url: null,
          image_position: "50% 50%"
        };
      }
      setResult(ensureBlogsData(enrichedData));
      if (enrichedData.briefingId) {
        setBriefingId(enrichedData.briefingId);
      }
      fetchArchiveList();
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
    md += `*${briefingDate}*\n\n---\n\n`;

    if (result.editorial_summary) {
      md += `## Editorial Overview\n\n`;
      if (result.editorial_title) md += `### ${result.editorial_title}\n\n`;
      if (result.editorial_image_url) md += `![Editorial Image](${result.editorial_image_url})\n\n`;
      md += `_${result.editorial_summary}_\n\n---\n\n`;
    }

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

  const getNewsletterHTML = () => {
    if (!result) return '';

    const renderBlogItemImage = (idx: number) => {
      if (!result.blog_items || !result.blog_items[idx]) return '';
      const item = result.blog_items[idx];
      if (!item.image_url) {
        return `<div style="background-color: #e2e8f0; width: 270px; height: 202px; border-radius: 8px; border: 2.5px solid #000000; line-height: 202px; text-align: center; color: #64748b; font-family: Arial; font-size: 10pt;">No Image</div>`;
      }
      
      const imgHtml = `
        <div style="position: relative; width: 270px; height: 202px; border-radius: 8px; border: 2.5px solid #000000; overflow: hidden; display: block;">
          <img src="${item.image_url}" alt="Blog ${idx + 1}" width="270" height="202" style="display: block; width: 270px; height: 202px; border-radius: 8px; object-fit: cover; border: 0;" />
          ${item.is_ai_generated ? `
            <div style="position: absolute; bottom: 18px; right: 18px; background-color: #ffffff; padding: 4px 8px; border-radius: 0px; border: 0; line-height: 0; font-size: 0;">
              <img src="${LOGO_BASE64}" alt="10xDS Logo" height="15" style="display: inline-block; height: 15px; width: auto; border: 0; vertical-align: middle;" />
            </div>
          ` : ''}
        </div>
      `;

      const absoluteUrl = ensureAbsoluteUrl(item.link_url);
      if (absoluteUrl) {
        return `<a href="${absoluteUrl}" target="_blank" style="text-decoration: none; display: block;">${imgHtml}</a>`;
      }
      return imgHtml;
    };

    const renderBlogItemHeading = (idx: number) => {
      if (!result.blog_items || !result.blog_items[idx]) return '';
      const item = result.blog_items[idx];
      const fontHtml = `
        <font color="#6e3c95" style="font-size: 11pt; font-weight: bold; font-family: Arial, sans-serif; line-height: 15pt; text-decoration: none;">
          ${item.heading}
        </font>
      `;

      const absoluteUrl = ensureAbsoluteUrl(item.link_url);
      if (absoluteUrl) {
        return `<a href="${absoluteUrl}" target="_blank" style="text-decoration: none; color: #6e3c95;">${fontHtml}</a>`;
      }
      return fontHtml;
    };

    const editorialHTML = result.editorial_summary ? `
      <!-- Editorial Overview -->
      <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
        <tbody>
          <tr>
            <td class="paddingcomp" style="padding: 20px 15px 10px 15px; border-collapse: collapse; text-align: left;">
              <font color="#6e3c95" style="font-family: Arial, Helvetica, sans-serif; font-size: 16pt;">
                <b>${result.editorial_title || 'Editorial Overview'}</b>
              </font>
            </td>
          </tr>
          <tr>
            <td class="paddingcomp" style="padding: 10px 15px 15px 15px; border-collapse: collapse;">
              <table cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
                <tbody>
                  <tr>
                    ${result.editorial_image_url ? `
                    <td style="padding-right: 15px; width: 180px; vertical-align: top; text-align: left;">
                      <img src="${result.editorial_image_url}" alt="Editorial" style="width: 180px; height: auto; border-radius: 8px; display: block;" />
                    </td>
                    ` : ''}
                    <td style="vertical-align: top; text-align: left; font-family: Arial, Helvetica, sans-serif; font-size: 11pt; line-height: 16pt; color: #334155; font-style: italic; border-left: 3px solid #6e3c95; padding-left: 15px;">
                      ${result.editorial_summary}
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 15px;">
              <table align="center" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
                <tbody>
                  <tr>
                    <td style="border-top: 2px solid #d9d9d9; font-size: 0px; height: 0px; width: 100%;">&nbsp;</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    ` : '';

    const wishHTML = (result.wish && result.wish.wish_title) ? `
      <!-- Wish Greeting Section -->
      <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
        <tbody>
          <tr>
            <td class="paddingcomp" style="padding: 15px; border-collapse: collapse;">
              <table cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 12px; border-collapse: collapse;">
                <tbody>
                  <tr>
                    <td style="padding: 20px; text-align: left;">
                      <h4 style="margin: 0 0 12px 0; font-family: Arial, Helvetica, sans-serif; font-size: 14pt; color: #4c1d95; font-weight: bold;">
                        ${result.wish.wish_title}
                      </h4>
                      ${result.wish.image_url ? `
                      <table cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 12px; border-collapse: collapse;">
                        <tbody>
                          <tr>
                            <td align="left">
                              <img src="${result.wish.image_url}" alt="Greeting" style="width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px; display: block;" />
                            </td>
                          </tr>
                        </tbody>
                      </table>
                      ` : ''}
                      <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #5b21b6; line-height: 16pt; white-space: pre-line;">
                        ${result.wish.wish_content}
                      </p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 15px;">
              <table align="center" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
                <tbody>
                  <tr>
                    <td style="border-top: 2px solid #d9d9d9; font-size: 0px; height: 0px; width: 100%;">&nbsp;</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    ` : '';    const headlinesHTML = result.news_items.map((item, idx) => {
      const absoluteUrl = ensureAbsoluteUrl(item.source_link);
      return `
      <!-- News Item ${idx + 1} Headline -->
      <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
        <tbody>
          <tr>
            <td class="paddingcomp" style="padding: 15px 15px 5px 15px; border-collapse: collapse; text-align: left;">
              <font color="#6e3c95" style="font-family: Arial, Helvetica, sans-serif; font-size: 18pt; line-height: 22pt;">
                <b>
                  ${absoluteUrl ? `
                  <a href="${absoluteUrl}" style="text-decoration: none; color: #6e3c95;" target="_blank">
                    ${item.heading}
                  </a>
                  ` : item.heading}
                </b>
              </font>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- News Item ${idx + 1} Columns -->
      <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
        <tbody>
          <tr>
            <td class="paddingcomp" style="padding: 5px 15px 15px 15px; border-collapse: collapse;">
              <table cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
                <tbody>
                  <tr>
                    ${item.image_url ? `
                    <td style="width: 190px; vertical-align: top; padding-right: 15px; text-align: left;">
                      <img src="${item.image_url}" alt="News Image" width="180" height="180" style="width: 180px; height: 180px; object-fit: cover; display: block;" />
                    </td>
                    ` : ''}
                    <td style="vertical-align: top; text-align: left; font-family: Arial, Helvetica, sans-serif; font-size: 11pt; line-height: 16.5pt; color: #334155;">
                      <p style="margin: 0 0 15px 0; line-height: 16.5pt;">
                        ${item.description}
                      </p>
                      <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
                        <tbody>
                          <tr>
                            <td style="vertical-align: middle; text-align: left;">
                              <table align="left" cellpadding="0" cellspacing="0" style="border:none;padding:0px;margin:0px;border-collapse:separate;">
                                <tbody>
                                  <tr>
                                    <td align="left" style="border-collapse:collapse;border:0px;padding:0px;color:#ffffff;font-family:Arial;text-align:left;border-radius:13px;cursor:pointer;">
                                      <a align="center" href="${absoluteUrl || 'https://10xds.com'}" style="padding:0px 0px;background-color:#6e3c95;width:156px;height:40px;font-size:12pt;direction:ltr;font-family:Arial;color:#ffffff;cursor:pointer;text-decoration:none;border-radius:13px;border:0px solid #ffffff;border-collapse:separate;display:table;text-align:center;" target="_blank">
                                        <font style="color:#ffffff;display:table-cell;vertical-align:middle;">
                                          \${item.button_text || 'Visit Webpage'}
                                        </font>
                                      </a>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                            <td style="vertical-align: middle; text-align: right; padding-right: 15px;">
                              <table align="right" cellpadding="0" cellspacing="0" style="border-collapse: collapse; display: inline-table;">
                                <tbody>
                                  <tr>
                                    <td align="center" style="padding: 0 10px; text-align: center; vertical-align: middle;">
                                      <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(absoluteUrl || 'https://10xds.com')}" target="_blank" style="text-decoration: none; display: block;">
                                        <img src="${FACEBOOK_ICON_BASE64}" alt="Facebook" width="32" height="32" style="width: 32px; height: 32px; display: block; border-radius: 50%; border: 0;" />
                                        <font color="#2d68c4" style="font-size: 8pt; font-weight: bold; text-decoration: none; font-family: Arial, sans-serif; line-height: 14px; margin-top: 4px; display: block;">Facebook</font>
                                      </a>
                                    </td>
                                    <td align="center" style="padding: 0 10px; text-align: center; vertical-align: middle;">
                                      <a href="https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(absoluteUrl || 'https://10xds.com')}" target="_blank" style="text-decoration: none; display: block;">
                                        <img src="${LINKEDIN_ICON_BASE64}" alt="LinkedIn" width="32" height="32" style="width: 32px; height: 32px; display: block; border-radius: 50%; border: 0;" />
                                        <font color="#2d68c4" style="font-size: 8pt; font-weight: bold; text-decoration: none; font-family: Arial, sans-serif; line-height: 14px; margin-top: 4px; display: block;">LinkedIn</font>
                                      </a>
                                    </td>
                                    <td align="center" style="padding: 0 10px; text-align: center; vertical-align: middle;">
                                      <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(absoluteUrl || 'https://10xds.com')}&text=${encodeURIComponent(item.heading)}" target="_blank" style="text-decoration: none; display: block;">
                                        <img src="${TWITTER_ICON_BASE64}" alt="Twitter" width="32" height="32" style="width: 32px; height: 32px; display: block; border-radius: 50%; border: 0;" />
                                        <font color="#2d68c4" style="font-size: 8pt; font-weight: bold; text-decoration: none; font-family: Arial, sans-serif; line-height: 14px; margin-top: 4px; display: block;">Twitter</font>
                                      </a>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Divider (Only if not the last item) -->
      ${idx < result.news_items.length - 1 ? `
      <table align="center" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
        <tbody>
          <tr>
            <td style="padding: 15px 15px;">
              <table align="center" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
                <tbody>
                  <tr>
                    <td style="border-top: 2px solid #d9d9d9; font-size: 0px; height: 0px; width: 100%;">&nbsp;</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
      ` : ''}
    `;
    }).join('');

    const blogPostsHTML = result.blog_items ? `
      <table align="center" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-top: 30px; border-top: 2px solid #6e3c95;">
        <tbody>
          <tr>
            <td align="center" style="padding: 25px 0 15px 0;">
              <font color="#6e3c95" style="font-size: 16pt; font-weight: bold; font-family: Arial, sans-serif; text-transform: uppercase;">
                ${result.blog_title || 'From our Blogs'}
              </font>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 15px;">
              <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
                <tbody>
                  <!-- Row 1: Blog Item 1 and 2 -->
                  <tr>
                    <!-- Blog Item 1 -->
                    <td valign="top" style="width: 270px; padding-bottom: 25px;">
                      <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
                        <tbody>
                          <tr>
                            <td style="padding: 0; text-align: center;">
                              ${renderBlogItemImage(0)}
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 10px 0 0 0; text-align: center;">
                              ${renderBlogItemHeading(0)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                    
                    <td style="width: 20px;">&nbsp;</td>
                    
                    <!-- Blog Item 2 -->
                    <td valign="top" style="width: 270px; padding-bottom: 25px;">
                      <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
                        <tbody>
                          <tr>
                            <td style="padding: 0; text-align: center;">
                              ${renderBlogItemImage(1)}
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 10px 0 0 0; text-align: center;">
                              ${renderBlogItemHeading(1)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Row 2: Blog Item 3 and 4 -->
                  <tr>
                    <!-- Blog Item 3 -->
                    <td valign="top" style="width: 270px;">
                      <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
                        <tbody>
                          <tr>
                            <td style="padding: 0; text-align: center;">
                              ${renderBlogItemImage(2)}
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 10px 0 0 0; text-align: center;">
                              ${renderBlogItemHeading(2)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                    
                    <td style="width: 20px;">&nbsp;</td>
                    
                    <!-- Blog Item 4 -->
                    <td valign="top" style="width: 270px;">
                      <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
                        <tbody>
                          <tr>
                            <td style="padding: 0; text-align: center;">
                              ${renderBlogItemImage(3)}
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 10px 0 0 0; text-align: center;">
                              ${renderBlogItemHeading(3)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    ` : '';

    const socialFooterHTML = `
      <table align="center" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-top: 30px; border-top: 3px solid #6e3c95; background-color: #ffffff;">
        <tbody>
          <tr>
            <td align="center" style="padding: 20px 0 10px 0;">
              <font color="#6e3c95" style="font-size: 11pt; font-weight: bold; font-family: Arial, sans-serif; text-transform: uppercase; letter-spacing: 1px;">
                Follow for More Updates
              </font>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 5px 0 20px 0;">
              <table align="center" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                <tbody>
                  <tr>
                    <td align="center" style="padding: 0 12px;">
                      <a href="https://10xds.com" target="_blank" style="text-decoration: none;">
                        <img src="${WEBSITE_ICON_BASE64}" alt="Website" width="36" height="36" style="width: 36px; height: 36px; display: block; border-radius: 50%; border: 0;" />
                        <font color="#6e3c95" style="font-size: 7.5pt; font-weight: bold; font-family: Arial, sans-serif; display: block; margin-top: 4px;">Website</font>
                      </a>
                    </td>
                    
                    <td align="center" style="padding: 0 12px;">
                      <a href="https://www.facebook.com/10xDS/" target="_blank" style="text-decoration: none;">
                        <img src="${FACEBOOK_ICON_BASE64}" alt="Facebook" width="36" height="36" style="width: 36px; height: 36px; display: block; border-radius: 50%; border: 0;" />
                        <font color="#6e3c95" style="font-size: 7.5pt; font-weight: bold; font-family: Arial, sans-serif; display: block; margin-top: 4px;">Facebook</font>
                      </a>
                    </td>

                    <td align="center" style="padding: 0 12px;">
                      <a href="https://www.linkedin.com/company/exponential-digital-solutions" target="_blank" style="text-decoration: none;">
                        <img src="${LINKEDIN_ICON_BASE64}" alt="LinkedIn" width="36" height="36" style="width: 36px; height: 36px; display: block; border-radius: 50%; border: 0;" />
                        <font color="#6e3c95" style="font-size: 7.5pt; font-weight: bold; font-family: Arial, sans-serif; display: block; margin-top: 4px;">LinkedIn</font>
                      </a>
                    </td>

                    <td align="center" style="padding: 0 12px;">
                      <a href="https://www.instagram.com/10xds/" target="_blank" style="text-decoration: none;">
                        <img src="${INSTAGRAM_ICON_BASE64}" alt="Instagram" width="36" height="36" style="width: 36px; height: 36px; display: block; border-radius: 50%; border: 0;" />
                        <font color="#6e3c95" style="font-size: 7.5pt; font-weight: bold; font-family: Arial, sans-serif; display: block; margin-top: 4px;">Instagram</font>
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 10px 0 25px 0; font-family: Arial, Helvetica, sans-serif; font-size: 9.5pt; color: #4b5563; line-height: 14pt; border-top: 1px solid #f3f4f6;">
              <strong style="color: #1f2937;">Exponential Digital Solutions (10xDS)</strong><br />
              India | Bahrain | UAE
            </td>
          </tr>
        </tbody>
      </table>
    `;

    return `
      <div class="zppage-container">
        <table bgcolor="#f0f0f0" border="0" cellpadding="0" cellspacing="0" class="contentOuter" id="contentOuter" style="background-color:#f0f0f0; mso-table-lspace:0pt; mso-table-rspace:0pt;font-size:12px;text-align:center;border:0px;padding:0px;border-collapse:collapse; width: 100%;" width="100%">
          <tbody>
            <tr>
              <td style="font-size:12px;font-family:Arial, Helvetica, sans-serif;border:0px;padding:0px;border-collapse:collapse;">&nbsp;</td>
              <td align="center" style="font-size:12px;font-family:Arial, Helvetica, sans-serif;border:0px;padding:0px;border-collapse:collapse; width: 600px;">
                <table bgcolor="#ffffff" border="0" cellpadding="0" cellspacing="0" class="contentInner" id="contentInner" style="border-collapse:collapse; border:0px;font-size:12px;width:600px;margin:0px auto;background-color:#ffffff; text-align: left;" width="600">
                  <tbody>
                    <tr>
                      <td style="border-collapse:collapse; font-size:12px;font-family:Arial, Helvetica, sans-serif;border:0px;padding:0px;" valign="top">
                        
                        <table border="0" cellpadding="0" cellspacing="0" class="zpAlignPos" style="font-size:12px;padding:0px;border:0px;border-collapse:collapse; width: 100%;" width="100%">
                          <tbody>
                            <tr>
                              <td class="paddingcomp" style="border-collapse:collapse;border:0px;padding:15px;font-size:12pt;font-family:Arial,Helvetica;line-height:19pt;border-bottom:6px solid #6e3c95;">
                                <table align="center" style="border:0px;border-collapse:collapse;font-size:12px;text-align: left; width: 100%; margin: 0px auto;">
                                  <tbody>
                                    <tr>
                                      <td style="border-collapse:collapse;font-size:12px;font-family:Arial, Helvetica, sans-serif;border:0px;padding:0px;text-align: left; width: 100%;" width="100%">
                                        <img alt="Logo" height="110" src="${clientLogo || LOGO_CURVE_BASE64}" style="vertical-align: middle; height: 110px; width: auto; max-width: 300px;" valign="middle">
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        ${editorialHTML}

                        ${wishHTML}

                        ${headlinesHTML}

                        ${blogPostsHTML}

                        ${socialFooterHTML}

                        <table bgcolor="#f8fafc" border="0" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-collapse: collapse;">
                          <tbody>
                            <tr>
                              <td style="padding: 20px; text-align: center; font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #94a3b8; line-height: 14pt;">
                                <p style="margin: 0 0 4px 0;">Generated automatically by <strong>10xNewsPulse.AI</strong></p>
                                <p style="margin: 0;">Powered by Google Vertex AI Gemini 2.5</p>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
              <td style="font-size:12px;font-family:Arial, Helvetica, sans-serif;border:0px;padding:0px;border-collapse:collapse;">&nbsp;</td>
            </tr>
          </tbody>
        </table>
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

  const ensureAbsoluteUrl = (url: string | undefined): string => {
    if (!url) return '';
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (/^(f|ht)tps?:\/\//i.test(trimmed) || trimmed.startsWith('mailto:') || trimmed.startsWith('tel:') || trimmed.startsWith('/') || trimmed.startsWith('#')) {
      return trimmed;
    }
    return `https://${trimmed}`;
  };

  const extractDomain = (url: string) => {
    try {
      const absUrl = ensureAbsoluteUrl(url);
      return new URL(absUrl).hostname.replace('www.', '');
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

              {/* File Upload (File mode) */}
              {sourceMode === 'file' && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Upload Documents (.docx / .pdf)
                  </label>
                  <div className="relative group border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl p-4 bg-slate-950/40 text-center transition cursor-pointer">
                    <input
                      type="file"
                      multiple
                      accept=".docx,.pdf"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <FileText className={`h-8 w-8 transition ${uploadedFiles.length > 0 ? 'text-indigo-400' : 'text-slate-500 group-hover:text-indigo-400'}`} />
                      <div className="text-xs text-slate-400 font-medium">
                        Click to select <span className="text-indigo-400 font-semibold">Word or PDF</span> files
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Supports multiple uploads
                      </div>
                    </div>
                  </div>

                  {/* Uploaded Files List */}
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {uploadedFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-900/60 border border-slate-850 rounded-lg text-xs">
                          <div className="flex items-center space-x-2 truncate pr-2">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              file.type === 'pdf' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}>
                              {file.type}
                            </span>
                            <span className="text-slate-300 font-medium truncate" title={file.name}>
                              {file.name}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeUploadedFile(file.name)}
                            className="text-slate-500 hover:text-red-400 p-1 rounded transition"
                            title="Remove file"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Target Sector / Topic (Always visible) */}
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

              {/* Briefing Date (Always visible) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Briefing Date
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. June 2026"
                  className="block w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm shadow-inner"
                  value={briefingDate}
                  onChange={(e) => setBriefingDate(e.target.value)}
                />
              </div>

              {/* Category Options (Search mode only) */}
              {sourceMode === 'search' && (
                <div className="animate-in fade-in duration-205 space-y-5">
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
              {sourceMode === 'search' && (
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
              )}



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

          {/* Archive & History Panel */}
          <div className="glass-panel p-6 rounded-2xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-violet-500 to-transparent"></div>
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-indigo-400" />
                <h2 className="text-base font-bold text-slate-200 tracking-wide">Archive &amp; History</h2>
              </div>
              <button
                type="button"
                onClick={fetchArchiveList}
                disabled={archivesLoading}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition disabled:opacity-50"
                title="Refresh history"
              >
                <RefreshCw className={`h-4 w-4 ${archivesLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {archivesLoading && archives.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <RefreshCw className="h-6 w-6 animate-spin text-slate-550 mb-2" />
                <p className="text-xs text-slate-450">Loading history...</p>
              </div>
            ) : archives.length === 0 ? (
              <div className="text-center py-8 bg-slate-950/40 border border-dashed border-slate-800 rounded-xl">
                <p className="text-xs text-slate-400">No archived briefings found.</p>
                <p className="text-[10px] text-slate-500 mt-1 max-w-[200px] mx-auto">
                  Click &quot;Save Edits&quot; on a generated newsletter to archive it.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {archives.map((archive) => (
                  <div
                    key={archive.id}
                    className={`p-3 bg-slate-950/40 border rounded-xl flex flex-col justify-between hover:border-indigo-500/30 transition group/item ${
                      briefingId === archive.id ? 'border-indigo-500/40 bg-indigo-500/5' : 'border-slate-850'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-xs font-bold text-slate-200 truncate" title={archive.sector}>
                            {archive.sector}
                          </h3>
                          {briefingId === archive.id && (
                            <span className="text-[8px] bg-indigo-500/20 text-indigo-300 px-1 py-0.5 rounded font-bold border border-indigo-500/30 uppercase tracking-wide">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                          Client: <span className="text-slate-350 font-semibold">{archive.clientName || 'General Audience'}</span>
                        </p>
                      </div>
                      <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap ml-2">
                        {archive.briefingDate || 'No Date'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-900/60 text-[10px]">
                      <span className="text-slate-500">
                        {new Date(archive.savedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleLoadArchive(archive.id)}
                          className="px-2 py-1 bg-slate-900 hover:bg-indigo-650 hover:text-white rounded-lg text-slate-350 transition flex items-center space-x-1 border border-slate-800 cursor-pointer"
                          title="Load briefing to editor workspace"
                        >
                          <FolderOpen className="h-3 w-3 text-indigo-400" />
                          <span>Load</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteArchive(archive.id)}
                          className="p-1 hover:bg-red-950/20 hover:text-red-400 rounded-lg text-slate-555 hover:border hover:border-red-500/30 transition border border-transparent cursor-pointer"
                          title="Delete archived briefing"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                
                {/* Visual Header Banner mimicking corporate template */}
                <div className="bg-white -mx-6 sm:-mx-8 -mt-6 sm:-mt-8 p-6 sm:p-8 flex flex-col mb-8 border-b-[6px] border-[#6e3c95] text-slate-800">
                  <div className="flex justify-start items-center w-full">
                    <div className="h-16 sm:h-20 flex items-center justify-start">
                      <img 
                        src={clientLogo || logoCurveImg} 
                        alt="Logo" 
                        className="h-16 sm:h-20 w-auto object-contain" 
                      />
                    </div>
                  </div>
                </div>

                {/* Editorial Columns */}
                {result.editorial_summary && (
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

                          {/* Download image */}
                          {result.editorial_image_url && (
                            <button
                              type="button"
                              onClick={() => handleDownloadImage(result.editorial_image_url, 'editorial-image.png')}
                              className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition flex items-center justify-center"
                              title="Download Image"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          )}

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
                )}

                {/* Wish Section */}
                {result.wish && result.wish.wish_title && (
                  <div className="mb-8 p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100/40 relative group/wish-section">
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("Are you sure you want to delete the holiday greeting / festival wish section?")) {
                          setResult({ ...result, wish: null });
                        }
                      }}
                      className="absolute top-4 right-4 text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-200/50 transition z-10"
                      title="Delete greeting section"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <textarea
                      className="auto-resize w-full font-extrabold text-indigo-950 text-lg leading-snug mb-3 bg-transparent resize-none overflow-hidden focus:outline-none focus:ring-1 focus:ring-indigo-100 pl-1 pr-10 py-0.5 rounded"
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

                            {/* Download image */}
                            {result.wish.image_url && (
                              <button
                                type="button"
                                onClick={() => handleDownloadImage(result.wish.image_url, 'wish-image.png')}
                                className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition flex items-center justify-center"
                                title="Download Image"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            )}

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
                <div className="space-y-8">
                    {result.news_items.map((item, idx) => (
                      <div
                        key={idx}
                        className="pb-6 border-b border-slate-100 last:border-b-0 last:pb-0 space-y-4 group/item relative"
                      >
                        {/* Headline Row (full-width above columns) */}
                        <div className="w-full">
                          {editingNewsHeading !== idx && item.source_link && item.hide_url_input ? (
                            <div className="relative group/news-title flex items-center justify-between w-full p-1 rounded hover:bg-slate-100/50">
                              <a
                                href={ensureAbsoluteUrl(item.source_link)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-bold text-[#6e3c95] text-xl sm:text-2xl leading-snug hover:underline cursor-pointer block text-left"
                              >
                                {item.heading}
                              </a>
                              <button
                                type="button"
                                onClick={() => setEditingNewsHeading(idx)}
                                className="opacity-0 group-hover/news-title:opacity-100 p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-indigo-900 transition cursor-pointer flex-shrink-0"
                                title="Edit Headline Text"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <textarea
                              className="auto-resize w-full font-bold text-[#6e3c95] text-xl sm:text-2xl leading-snug hover:text-indigo-850 transition bg-transparent resize-none overflow-hidden focus:outline-none focus:ring-1 focus:ring-indigo-100 px-1 py-0.5 rounded cursor-pointer hover:bg-slate-100"
                              rows={1}
                              value={item.heading}
                              ref={(el) => autoResize(el)}
                              onInput={(e) => autoResize(e.currentTarget)}
                              onBlur={() => setEditingNewsHeading(null)}
                              onChange={(e) => {
                                const newItems = [...result.news_items];
                                newItems[idx] = { ...newItems[idx], heading: e.target.value };
                                setResult({ ...result, news_items: newItems });
                                autoResize(e.target);
                              }}
                            />
                          )}
                        </div>

                        {/* Image + Description columns */}
                        <div className="flex flex-col sm:flex-row gap-5 items-start">
                          {/* Image Panel */}
                          <div
                            className={`flex-shrink-0 w-44 h-44 overflow-hidden bg-slate-100 border border-slate-200 relative group transition-all duration-200 ${
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

                                  {/* Download image */}
                                  {item.image_url && (
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadImage(item.image_url, `news-${idx}-image.png`)}
                                      className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition flex items-center justify-center"
                                      title="Download Image"
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                    </button>
                                  )}

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
                                  <span className="text-[7.5px] text-indigo-300 font-medium tracking-wide block mt-0.5">Rec: 1:1, under 2MB</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Text Content */}
                          <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
                            <textarea
                              className="auto-resize w-full text-slate-750 text-sm leading-relaxed bg-transparent resize-none overflow-hidden focus:outline-none focus:ring-1 focus:ring-indigo-100 px-1 rounded cursor-text hover:bg-slate-100"
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

                            <div className="mt-4 flex flex-col w-full">
                              {/* Web Editor URL Input (Only visible in editor, hidden in print/final email) */}
                              {!item.hide_url_input ? (
                                <div className="mb-4 w-full print:hidden">
                                  <div className="flex justify-between items-center mb-1">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Webpage URL (Visit Webpage & Share Icons)</label>
                                    {item.source_link && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newItems = [...result.news_items];
                                          newItems[idx] = { ...newItems[idx], hide_url_input: true };
                                          setResult({ ...result, news_items: newItems });
                                        }}
                                        className="text-[10px] text-emerald-500 font-bold hover:text-emerald-600 transition flex items-center gap-1 focus:outline-none"
                                      >
                                        Save & Hide Input
                                      </button>
                                    )}
                                  </div>
                                  <input
                                    type="text"
                                    className="w-full bg-slate-50 border border-slate-200 hover:bg-slate-100/50 text-xs px-3 py-2 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                                    placeholder="Enter article URL to show Visit Webpage and social share buttons..."
                                    value={item.source_link || ''}
                                    onChange={(e) => {
                                      const newItems = [...result.news_items];
                                      newItems[idx] = { ...newItems[idx], source_link: e.target.value };
                                      setResult({ ...result, news_items: newItems });
                                    }}
                                  />
                                  <div className="mt-2">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Button Label (Optional)</label>
                                    <input
                                      type="text"
                                      className="w-full bg-slate-50 border border-slate-205 hover:bg-slate-100/50 text-[10px] px-2.5 py-1.5 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                                      placeholder="Default: Visit Webpage"
                                      value={item.button_text || ''}
                                      onChange={(e) => {
                                        const newItems = [...result.news_items];
                                        newItems[idx] = { ...newItems[idx], button_text: e.target.value };
                                        setResult({ ...result, news_items: newItems });
                                      }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="mb-2 w-full flex justify-end print:hidden">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newItems = [...result.news_items];
                                      newItems[idx] = { ...newItems[idx], hide_url_input: false };
                                      setResult({ ...result, news_items: newItems });
                                    }}
                                    className="opacity-0 group-hover/item:opacity-100 transition-all duration-200 text-[10px] text-slate-450 hover:text-indigo-600 font-semibold flex items-center gap-1 focus:outline-none bg-slate-50 border border-slate-200 px-2 py-1 rounded-md shadow-sm cursor-pointer"
                                  >
                                    <Settings className="w-3.5 h-3.5" /> Edit Link
                                  </button>
                                </div>
                              )}

                              <div className="flex flex-row justify-between items-end w-full">
                                <div className="flex flex-col items-start gap-3">
                                  {!item.hide_resource && (
                                    <span className="inline-flex items-center text-[10px] text-slate-450 font-bold uppercase tracking-wider bg-slate-50 border border-slate-100 px-2.5 py-0.5 rounded-full space-x-1.5 hover:bg-slate-100/60 transition">
                                      <span>{extractDomain(item.source_link || 'https://10xds.com')}</span>
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
                                  <a
                                    href={item.source_link || 'https://10xds.com'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center text-xs text-white bg-[#6e3c95] font-semibold border border-transparent px-6 py-2.5 rounded-xl hover:bg-indigo-900 transition shadow cursor-pointer print:hidden"
                                    style={{ width: '156px', height: '40px' }}
                                  >
                                    <span>{item.button_text || 'Visit Webpage'}</span>
                                  </a>
                                </div>

                                {/* Dynamic Social Sharing Icons */}
                                <div className="flex items-center gap-4 pr-4 print:hidden">
                                  <a
                                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(item.source_link || 'https://10xds.com')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex flex-col items-center justify-center cursor-pointer select-none no-underline hover:opacity-80 transition"
                                  >
                                    <img src={FACEBOOK_ICON_BASE64} alt="Facebook" className="w-8 h-8 rounded-full shadow" />
                                    <span className="text-[10px] text-[#2d68c4] font-bold mt-1">Facebook</span>
                                  </a>
                                  <a
                                    href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(item.source_link || 'https://10xds.com')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex flex-col items-center justify-center cursor-pointer select-none no-underline hover:opacity-80 transition"
                                  >
                                    <img src={LINKEDIN_ICON_BASE64} alt="LinkedIn" className="w-8 h-8 rounded-full shadow" />
                                    <span className="text-[10px] text-[#2d68c4] font-bold mt-1">LinkedIn</span>
                                  </a>
                                  <a
                                    href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(item.source_link || 'https://10xds.com')}&text=${encodeURIComponent(item.heading)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex flex-col items-center justify-center cursor-pointer select-none no-underline hover:opacity-80 transition"
                                  >
                                    <img src={TWITTER_ICON_BASE64} alt="Twitter" className="w-8 h-8 rounded-full shadow" />
                                    <span className="text-[10px] text-[#2d68c4] font-bold mt-1">Twitter</span>
                                  </a>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* From our Blogs Section */}
                  {result.blog_items && (
                    <div className="mt-12 border-t border-slate-100 pt-10">
                      <div className="text-center mb-8">
                        <textarea
                          className="auto-resize w-full text-center font-bold text-[#6e3c95] text-2xl tracking-tight bg-transparent resize-none overflow-hidden focus:outline-none focus:ring-1 focus:ring-indigo-100 px-1 py-0.5 rounded cursor-pointer hover:bg-slate-50"
                          rows={1}
                          value={result.blog_title || "From our Blogs"}
                          ref={(el) => autoResize(el)}
                          onInput={(e) => autoResize(e.currentTarget)}
                          onChange={(e) => {
                            setResult({ ...result, blog_title: e.target.value });
                            autoResize(e.target);
                          }}
                        />
                        <div className="relative w-24 h-[2px] bg-[#6e3c95]/20 mx-auto mt-2">
                          <div className="absolute left-1/2 -translate-x-1/2 -top-[2px] w-2.5 h-2.5 rounded-full bg-[#6e3c95]"></div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {result.blog_items.map((item, idx) => (
                          <div key={idx} className="flex flex-col space-y-4 group/blog-card transition-all duration-200 h-full">
                            {/* Image Container */}
                            <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 border-[2.5px] border-black shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)]">
                              {item.image_url ? (
                                <>
                                  <a href={item.link_url ? ensureAbsoluteUrl(item.link_url) : undefined} target="_blank" rel="noopener noreferrer" className={item.link_url ? "block w-full h-full cursor-pointer" : "block w-full h-full cursor-default"}>
                                    <img
                                      src={item.image_url}
                                      alt={item.heading}
                                      className="w-full h-full object-cover select-none"
                                    />
                                  </a>
                                  {item.is_ai_generated && (
                                    <div className="absolute bottom-[18px] right-[18px] bg-white px-2 py-1 pointer-events-none select-none z-10 flex items-center justify-center rounded-none shadow-sm">
                                      <img src={logo} alt="10xDS Logo" className="h-[15px] w-auto object-contain rounded-none" />
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-350 bg-slate-50/50">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span className="text-xs font-semibold text-slate-400">Upload or Generate Image</span>
                                </div>
                              )}

                              {/* Loading spinner during generation */}
                              {generatingBlogIdx === idx && (
                                <div className="absolute inset-0 bg-slate-900/70 flex flex-col items-center justify-center text-white z-30">
                                  <RefreshCw className="h-7 w-7 animate-spin text-indigo-400 mb-2" />
                                  <span className="text-xs font-semibold">Generating Image...</span>
                                </div>
                              )}

                              {/* Actions Overlay (visible on hover) */}
                              {generatingBlogIdx !== idx && (
                                <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center opacity-0 group-hover/blog-card:opacity-100 transition duration-200 z-20 space-y-2">
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
                                            handleBlogImageUpload(idx, file);
                                          }
                                        }}
                                      />
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                      </svg>
                                    </label>

                                    {/* Regenerate image via AI */}
                                    <button
                                      type="button"
                                      onClick={() => handleGenerateBlogImage(idx, item.heading)}
                                      className="p-2 bg-[#6e3c95] hover:bg-indigo-900 text-white rounded-lg transition flex items-center justify-center font-medium animate-pulse"
                                      title="Generate brand-aligned image with Gemini"
                                    >
                                      <RefreshCw className="h-4 w-4" />
                                    </button>

                                    {/* Download image */}
                                    {item.image_url && (
                                      <button
                                        type="button"
                                        onClick={() => handleDownloadImage(item.image_url, `blog-${idx}-image.png`)}
                                        className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition flex items-center justify-center"
                                        title="Download Image"
                                      >
                                        <Download className="h-4 w-4" />
                                      </button>
                                    )}

                                    {/* Delete image */}
                                    {item.image_url && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteBlogImage(idx)}
                                        className="p-2 bg-red-650 hover:bg-red-500 text-white rounded-lg transition flex items-center justify-center"
                                        title="Remove image"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                  <div className="text-center select-none px-1">
                                    <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider block">Blog Image</span>
                                    <span className="text-[8px] text-indigo-300 font-medium tracking-wide block mt-0.5">Gemini uses card title</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Headline Input below image */}
                            <div className="w-full flex justify-center items-center min-h-[72px]">
                              {editingBlogHeading !== idx && item.link_url && item.hide_url_input ? (
                                <div className="relative group/blog-title flex items-center justify-center w-full p-1 rounded hover:bg-slate-100/50">
                                  <a
                                    href={ensureAbsoluteUrl(item.link_url)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-bold text-[#6e3c95] text-base text-center leading-snug hover:underline cursor-pointer block"
                                  >
                                    {item.heading}
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => setEditingBlogHeading(idx)}
                                    className="absolute right-0 opacity-0 group-hover/blog-title:opacity-100 p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-indigo-900 transition cursor-pointer"
                                    title="Edit Headline Text"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <textarea
                                  className="auto-resize w-full font-bold text-[#6e3c95] text-base text-center leading-snug hover:bg-slate-100 transition bg-transparent resize-none overflow-hidden focus:outline-none focus:ring-1 focus:ring-indigo-100 px-1 py-0.5 rounded cursor-pointer"
                                  rows={1}
                                  value={item.heading}
                                  ref={(el) => autoResize(el)}
                                  onInput={(e) => autoResize(e.currentTarget)}
                                  onBlur={() => setEditingBlogHeading(null)}
                                  onChange={(e) => {
                                    if (result.blog_items) {
                                      const newItems = [...result.blog_items];
                                      newItems[idx] = { ...newItems[idx], heading: e.target.value };
                                      setResult({ ...result, blog_items: newItems });
                                      autoResize(e.target);
                                    }
                                  }}
                                />
                              )}
                            </div>

                            {/* Blog Item Link Input (Only visible in editor, hidden in print/final email) */}
                            {!item.hide_url_input ? (
                              <div className="mt-auto pt-2 w-full print:hidden">
                                <div className="flex justify-between items-center mb-1">
                                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Blog Link URL</label>
                                  {item.link_url && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (result.blog_items) {
                                          const newItems = [...result.blog_items];
                                          newItems[idx] = { ...newItems[idx], hide_url_input: true };
                                          setResult({ ...result, blog_items: newItems });
                                        }
                                      }}
                                      className="text-[9px] text-emerald-500 font-bold hover:text-emerald-600 transition flex items-center gap-1 focus:outline-none"
                                    >
                                      Save & Hide
                                    </button>
                                  )}
                                </div>
                                <input
                                  type="text"
                                  className="w-full bg-slate-50 border border-slate-200 hover:bg-slate-100/50 text-[10px] px-2.5 py-1.5 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                                  placeholder="Enter article URL (e.g. https://10xds.com/blog/article)..."
                                  value={item.link_url || ''}
                                  onChange={(e) => {
                                    if (result.blog_items) {
                                      const newItems = [...result.blog_items];
                                      newItems[idx] = { ...newItems[idx], link_url: e.target.value };
                                      setResult({ ...result, blog_items: newItems });
                                    }
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="mt-auto pt-1 w-full flex justify-center print:hidden">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (result.blog_items) {
                                      const newItems = [...result.blog_items];
                                      newItems[idx] = { ...newItems[idx], hide_url_input: false };
                                      setResult({ ...result, blog_items: newItems });
                                    }
                                  }}
                                  className="opacity-0 group-hover/blog-card:opacity-100 transition-all duration-200 text-[9px] text-slate-500 hover:text-indigo-650 font-semibold flex items-center gap-1 focus:outline-none bg-slate-50 border border-slate-200 px-2 py-0.5 rounded shadow-sm cursor-pointer"
                                >
                                  <Settings className="w-3 h-3" /> Edit Link
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Follow for More Updates Social Footer */}
                  <div className="mt-12 border-t-[3px] border-[#6e3c95] pt-8 pb-4 text-center">
                    <h4 className="text-[14px] font-bold text-[#6e3c95] uppercase tracking-wider mb-4">Follow for More Updates</h4>
                    
                    {/* Social Icons Row */}
                    <div className="flex justify-center items-center gap-6 mb-6">
                      {/* Website */}
                      <a href="https://10xds.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-85 transition flex flex-col items-center">
                        <img src={WEBSITE_ICON_BASE64} alt="Website" className="w-10 h-10 rounded-full shadow-md" />
                        <span className="text-[9px] text-[#6e3c95] font-bold mt-1">Website</span>
                      </a>
                      
                      {/* Facebook */}
                      <a href="https://www.facebook.com/10xDS/" target="_blank" rel="noopener noreferrer" className="hover:opacity-85 transition flex flex-col items-center">
                        <img src={FACEBOOK_ICON_BASE64} alt="Facebook" className="w-10 h-10 rounded-full shadow-md" />
                        <span className="text-[9px] text-[#6e3c95] font-bold mt-1">Facebook</span>
                      </a>

                      {/* LinkedIn */}
                      <a href="https://www.linkedin.com/company/exponential-digital-solutions" target="_blank" rel="noopener noreferrer" className="hover:opacity-85 transition flex flex-col items-center">
                        <img src={LINKEDIN_ICON_BASE64} alt="LinkedIn" className="w-10 h-10 rounded-full shadow-md" />
                        <span className="text-[9px] text-[#6e3c95] font-bold mt-1">LinkedIn</span>
                      </a>

                      {/* Instagram */}
                      <a href="https://www.instagram.com/10xds/" target="_blank" rel="noopener noreferrer" className="hover:opacity-85 transition flex flex-col items-center">
                        <img src={INSTAGRAM_ICON_BASE64} alt="Instagram" className="w-10 h-10 rounded-full shadow-md" />
                        <span className="text-[9px] text-[#6e3c95] font-bold mt-1">Instagram</span>
                      </a>
                    </div>

                    {/* Address & Copyright */}
                    <div className="text-[11px] text-slate-500 leading-relaxed font-medium">
                      <p className="font-bold text-slate-700">Exponential Digital Solutions (10xDS)</p>
                      <p>India | Bahrain | UAE</p>
                    </div>
                  </div>

                {/* Print Footer */}
                <div className="hidden print:block border-t border-slate-150 mt-12 pt-4 text-center text-[9px] text-slate-400">
                  <p>10xNewsPulse.AI Briefing &bull; Confidential and Proprietary briefing page.</p>
                </div>
              </div>

              {!result.wish && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setResult({
                        ...result,
                        wish: {
                          wish_title: "Holiday Greeting / Festival Wish",
                          wish_content: "Write your custom greeting/wish message here... (Click to edit text, or click delete in the top-right to remove this section)",
                          image_url: null,
                          image_position: "50% 50%"
                        }
                      });
                    }}
                    className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 border border-slate-800 rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow-md cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Add Holiday Greeting / Festival Wish Section</span>
                  </button>
                </div>
              )}
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
