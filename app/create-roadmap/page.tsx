"use client";
import React, { useState, useCallback, useEffect } from 'react';
import { Sparkles, Target, TrendingUp, Book, Award, ChevronRight, Check, ArrowRight, Star, Clock, Users, CheckCircle2, Circle, BarChart3, Trophy, Zap, Save, Share2, Briefcase, Package, ClipboardCheck, CheckCircle } from 'lucide-react';

export const PREDEFINED_ROLES = [
  { value: "Frontend Developer", label: "Frontend Developer", category: "Web Development", icon: "💻" },
  { value: "Backend Developer", label: "Backend Developer", category: "Web Development", icon: "⚙️" },
  { value: "Full-Stack Engineer", label: "Full-Stack Engineer", category: "Web Development", icon: "🌐" },
  { value: "Mobile App Developer", label: "Mobile App Developer (iOS & Android)", category: "Mobile", icon: "📱" },
  { value: "DevOps & Cloud Engineer", label: "DevOps & Cloud Engineer", category: "Infrastructure", icon: "☁️" },
  { value: "Data Scientist & ML Engineer", label: "Data Scientist & ML Engineer", category: "Data & AI", icon: "🤖" },
  { value: "Cybersecurity Specialist", label: "Cybersecurity Specialist", category: "Security", icon: "🛡️" },
  { value: "UI/UX & Product Designer", label: "UI/UX & Product Designer", category: "Design", icon: "🎨" },
  { value: "Blockchain Developer", label: "Blockchain Developer", category: "Emerging Tech", icon: "⛓️" },
  { value: "QA & Automation Engineer", label: "QA & Test Automation Engineer", category: "Testing", icon: "🧪" }
];

// Enhanced Types
interface UserProfile {
  currentLevel: string;
  targetRole: string;
  timeCommitment: string;
  interests: string[];
  experience: string;
  preferredLearningStyle: string;
  goals: string[];
  timeline: string;
}

interface RoadmapNode {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  resources: Resource[];
  prerequisites: string[];
  order: number;
  completed: boolean;
  progress: number;
  estimatedHours: number;
  skills: string[];
  assessments: Assessment[];
}

interface Resource {
  title: string;
  type: 'course' | 'article' | 'video' | 'book' | 'project' | 'practice' | 'certification';
  url: string;
  platform: string;
  rating: number;
  reviews: number;
  duration: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  isFree: boolean;
  description: string;
}

interface Assessment {
  id: string;
  title: string;
  type: 'quiz' | 'project' | 'coding' | 'interview';
  description: string;
  estimatedTime: string;
}

interface GeneratedRoadmap {
  id: string;
  title: string;
  description: string;
  estimatedDuration: string;
  totalHours: number;
  nodes: RoadmapNode[];
  milestones: string[];
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  completionRate: number;
  createdAt: string;
  updatedAt: string;
}

 

const PersonalizedRoadmapGenerator: React.FC = () => {
  const [step, setStep] = useState<'profile' | 'generating' | 'result'>('profile');
  const [profile, setProfile] = useState<UserProfile>({
    currentLevel: '',
    targetRole: '',
    timeCommitment: '',
    interests: [],
    experience: '',
    preferredLearningStyle: '',
    goals: [],
    timeline: ''
  });
  const [generatedRoadmap, setGeneratedRoadmap] = useState<GeneratedRoadmap | null>(null);
  const [selectedNode, setSelectedNode] = useState<RoadmapNode | null>(null);

  // ── Progress Tracking State ──────────────────────────────────────────────
  const [completedNodes, setCompletedNodes] = useState<Set<string>>(new Set());
  const [completedMilestones, setCompletedMilestones] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  // Load persisted progress from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('dev-pocket-roadmap-progress');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.completedNodes) setCompletedNodes(new Set(parsed.completedNodes));
        if (parsed.completedMilestones) setCompletedMilestones(new Set(parsed.completedMilestones));
      }
    } catch {}
  }, []);

  // Persist progress to localStorage per roadmap whenever it changes
  useEffect(() => {
    if (!generatedRoadmap?.id) return;
    try {
      const payload = {
        completedNodes: Array.from(completedNodes),
        completedMilestones: Array.from(completedMilestones),
      };
      localStorage.setItem(`dev-pocket-progress-${generatedRoadmap.id}`, JSON.stringify(payload));
      localStorage.setItem('dev-pocket-roadmap-progress', JSON.stringify(payload));
    } catch {}
  }, [completedNodes, completedMilestones, generatedRoadmap?.id]);

  const toggleNodeComplete = async (nodeId: string, nodeTitle: string) => {
    const isNowCompleted = !completedNodes.has(nodeId);
    const nextNodes = new Set(completedNodes);
    isNowCompleted ? nextNodes.add(nodeId) : nextNodes.delete(nodeId);
    setCompletedNodes(nextNodes);

    // Automatically synchronize the Stepper progress indicator based on node completion %
    if (generatedRoadmap?.milestones?.length && generatedRoadmap?.nodes?.length) {
      const ratio = nextNodes.size / generatedRoadmap.nodes.length;
      const milestoneStepsToComplete = Math.floor(ratio * generatedRoadmap.milestones.length);
      const nextMilestones = new Set<number>();
      for (let i = 0; i < milestoneStepsToComplete; i++) {
        nextMilestones.add(i);
      }
      setCompletedMilestones(nextMilestones);
    }

    // Persist to API
    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestoneId: nodeId,
          title: nodeTitle,
          completed: isNowCompleted,
          roadmapId: generatedRoadmap?.id || 'default-roadmap',
        }),
      });
    } catch { /* silent fallback */ }
  };

  const toggleMilestoneComplete = (idx: number) => {
    setCompletedMilestones(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        // Remove this and higher milestones
        Array.from(prev).forEach(m => {
          if (m >= idx) next.delete(m);
        });
      } else {
        // Complete up to this milestone
        for (let i = 0; i <= idx; i++) {
          next.add(i);
        }
      }
      return next;
    });
  };

  const handleSaveToDashboard = async () => {
    if (!generatedRoadmap) return;
    setIsSaving(true);
    try {
      localStorage.setItem(
        'dev-pocket-saved-roadmap',
        JSON.stringify({
          ...generatedRoadmap,
          savedAt: new Date().toISOString(),
          completedNodes: Array.from(completedNodes),
        })
      );
      await new Promise(r => setTimeout(r, 500)); // brief UI delay
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Resource factory (kept as-is)
  const createResource = (title: string, type: Resource['type'], url: string, platform: string, level: Resource['level'] = 'beginner', isFree: boolean = true): Resource => ({
    title,
    type,
    url,
    platform,
    rating: 4.5,
    reviews: Math.floor(Math.random() * 1000) + 100,
    duration: type === 'course' ? '10-20 hours' : type === 'video' ? '2-5 hours' : '1-3 hours',
    level,
    isFree,
    description: `High-quality ${type} covering ${title.toLowerCase()}`
  });

  // Helper for generating dynamic role-tailored milestones
  const generateMilestones = useCallback((role: string): string[] => {
    const r = role.toLowerCase();
    if (r.includes('frontend')) {
      return [
        'Web & UI Fundamentals',
        'Modern JavaScript & DOM',
        'React & Component Architecture',
        'Production Apps & Deployment',
        'Frontend System Design'
      ];
    }
    if (r.includes('backend')) {
      return [
        'Server & Network Protocols',
        'API Architecture & Node/Express',
        'Database Design & ORMs',
        'Security & Microservices',
        'Scalability & Cloud Deploy'
      ];
    }
    if (r.includes('full-stack')) {
      return [
        'Client & UI Engineering',
        'Server-side & REST/GraphQL',
        'Full-Stack Data Modeling',
        'End-to-End Testing & CI/CD',
        'Production Full-Stack Launch'
      ];
    }
    if (r.includes('mobile')) {
      return [
        'Mobile App Architecture',
        'State Management & Native APIs',
        'Device Hardware & Offline Mode',
        'App Store Optimization',
        'Production App Release'
      ];
    }
    if (r.includes('devops') || r.includes('cloud')) {
      return [
        'Linux, Networking & Scripting',
        'Containerization with Docker',
        'Kubernetes & Orchestration',
        'CI/CD & Infrastructure as Code',
        'Cloud Observability & Security'
      ];
    }
    if (r.includes('data') || r.includes('ml')) {
      return [
        'Data Analysis & Mathematics',
        'Python, Pandas & Data Wrangling',
        'Machine Learning Algorithms',
        'Deep Learning & Model Training',
        'MLOps & Production Inference'
      ];
    }
    if (r.includes('cyber') || r.includes('security')) {
      return [
        'Networking & Systems Security',
        'Vulnerability Assessment & PenTest',
        'Cryptography & Identity Auth',
        'Incident Response & SIEM',
        'Cloud & Enterprise Hardening'
      ];
    }
    if (r.includes('design') || r.includes('ui/ux')) {
      return [
        'Design Principles & Wireframing',
        'Figma Mastery & Design Systems',
        'User Research & Usability Testing',
        'Interactive Prototyping',
        'Design-to-Code Handoff'
      ];
    }
    // Default fallback milestones
    return [
      'Core Fundamentals',
      'Advanced Concepts & Frameworks',
      'Hands-on Real Projects',
      'Testing & Deployment',
      'Interview Preparation & Mastery'
    ];
  }, []);

  // Generate nodes (memoized and tailored to any selected role)
  const generateNodes = useCallback((prof: UserProfile): RoadmapNode[] => {
    const baseNodes: RoadmapNode[] = [];
    let order = 1;
    const r = prof.targetRole.toLowerCase();

    if (r.includes('frontend')) {
      baseNodes.push(
        {
          id: 'html-css',
          title: 'HTML5 & Modern CSS3',
          description: 'Master semantic layout, CSS Grid, Flexbox, and responsive design systems',
          category: 'Fundamentals',
          duration: '2-3 weeks',
          difficulty: 'beginner',
          order: order++,
          prerequisites: [],
          completed: false,
          progress: 0,
          estimatedHours: 40,
          skills: ['HTML5', 'CSS3', 'Responsive Design', 'Flexbox', 'CSS Grid', 'Tailwind CSS'],
          assessments: [
            { id: 'html-quiz', title: 'HTML Fundamentals Quiz', type: 'quiz', description: 'Test your HTML knowledge', estimatedTime: '30 minutes' },
            { id: 'css-project', title: 'Build a Responsive Landing Page', type: 'project', description: 'Create a responsive landing page', estimatedTime: '4 hours' }
          ],
          resources: [
            createResource('Modern HTML & CSS Course', 'course', '#', 'freeCodeCamp', 'beginner', true),
            createResource('A Complete Guide to CSS Grid', 'article', '#', 'CSS Tricks', 'beginner', true)
          ]
        },
        {
          id: 'javascript',
          title: 'JavaScript Essentials & ESNext',
          description: 'Learn modern JavaScript, DOM manipulation, asynchronous programming, and web APIs',
          category: 'Core Skills',
          duration: '4-6 weeks',
          difficulty: 'intermediate',
          order: order++,
          prerequisites: ['html-css'],
          completed: false,
          progress: 0,
          estimatedHours: 60,
          skills: ['ES6+', 'DOM Manipulation', 'Async/Await', 'Promises', 'Closures', 'Fetch API'],
          assessments: [
            { id: 'js-quiz', title: 'JavaScript Fundamentals Quiz', type: 'quiz', description: 'Test your JS knowledge', estimatedTime: '45 minutes' },
            { id: 'js-project', title: 'Interactive Web App', type: 'project', description: 'Build a dynamic web application', estimatedTime: '8 hours' }
          ],
          resources: [
            createResource('JavaScript.info Complete Guide', 'course', '#', 'javascript.info', 'intermediate', true),
            createResource('Eloquent JavaScript', 'book', '#', 'Eloquent JS', 'intermediate', true)
          ]
        },
        {
          id: 'react-ecosystem',
          title: 'React & Next.js Ecosystem',
          description: 'Build robust reactive user interfaces with React, Next.js App Router, and TypeScript',
          category: 'Framework',
          duration: '6-8 weeks',
          difficulty: 'intermediate',
          order: order++,
          prerequisites: ['javascript'],
          completed: false,
          progress: 0,
          estimatedHours: 80,
          skills: ['React', 'Next.js', 'Hooks', 'TypeScript', 'State Management', 'Server Components'],
          assessments: [
            { id: 'react-quiz', title: 'React Concepts Quiz', type: 'quiz', description: 'Test your React knowledge', estimatedTime: '30 minutes' },
            { id: 'react-app', title: 'Build a Production Dashboard', type: 'project', description: 'Create a full dashboard application', estimatedTime: '12 hours' }
          ],
          resources: [
            createResource('Official React Documentation', 'course', '#', 'React.dev', 'intermediate', true),
            createResource('Next.js Full Course', 'video', '#', 'YouTube', 'intermediate', true)
          ]
        },
        {
          id: 'frontend-production',
          title: 'Performance, Testing & Deployment',
          description: 'Optimize bundle size, accessibility (a11y), write automated tests, and deploy to Vercel/Cloudflare',
          category: 'Practice',
          duration: '4-6 weeks',
          difficulty: 'advanced',
          order: order++,
          prerequisites: ['react-ecosystem'],
          completed: false,
          progress: 0,
          estimatedHours: 90,
          skills: ['Web Vitals', 'Testing (Jest/Vitest)', 'CI/CD', 'SEO Optimization', 'Lighthouse'],
          assessments: [
            { id: 'portfolio-review', title: 'Portfolio Project Audit', type: 'project', description: 'Audit performance and accessibility', estimatedTime: '3 hours' }
          ],
          resources: [
            createResource('Web Performance Deep Dive', 'article', '#', 'web.dev', 'advanced', true),
            createResource('Testing JavaScript Applications', 'course', '#', 'TestingJS', 'advanced', true)
          ]
        }
      );
    } else if (r.includes('backend')) {
      baseNodes.push(
        {
          id: 'server-basics',
          title: 'Server-Side Fundamentals & Protocols',
          description: 'Understand HTTP/HTTPS, RESTful API architecture, TCP/IP, and Unix basics',
          category: 'Fundamentals',
          duration: '3-4 weeks',
          difficulty: 'beginner',
          order: order++,
          prerequisites: [],
          completed: false,
          progress: 0,
          estimatedHours: 40,
          skills: ['HTTP/2', 'REST APIs', 'Status Codes', 'JSON', 'Headers'],
          assessments: [],
          resources: [
            createResource('HTTP Basics & Architecture', 'article', '#', 'MDN', 'beginner', true),
            createResource('REST API Design Principles', 'course', '#', 'Udemy', 'beginner', true)
          ]
        },
        {
          id: 'nodejs-express',
          title: 'Node.js, Express & Runtime Architecture',
          description: 'Build scalable asynchronous backend microservices and RESTful endpoints',
          category: 'Core Skills',
          duration: '6-8 weeks',
          difficulty: 'intermediate',
          order: order++,
          prerequisites: ['server-basics'],
          completed: false,
          progress: 0,
          estimatedHours: 70,
          skills: ['Node.js', 'Express', 'Event Loop', 'Streams', 'Middleware', 'Error Handling'],
          assessments: [],
          resources: [
            createResource('Node.js The Complete Guide', 'course', '#', 'Udemy', 'intermediate', true),
            createResource('Express Framework Documentation', 'article', '#', 'ExpressJS', 'intermediate', true)
          ]
        },
        {
          id: 'databases-sql',
          title: 'Databases, SQL & ORM Engineering',
          description: 'Master schema design, PostgreSQL, indexing, transactions, and Prisma/TypeORM',
          category: 'Data',
          duration: '5-6 weeks',
          difficulty: 'intermediate',
          order: order++,
          prerequisites: ['nodejs-express'],
          completed: false,
          progress: 0,
          estimatedHours: 60,
          skills: ['PostgreSQL', 'SQL Optimization', 'Prisma ORM', 'Redis Caching', 'Migrations'],
          assessments: [],
          resources: [
            createResource('PostgreSQL Tutorial for Developers', 'course', '#', 'freeCodeCamp', 'intermediate', true),
            createResource('Redis in Action', 'book', '#', 'Redis', 'intermediate', true)
          ]
        },
        {
          id: 'backend-security-cloud',
          title: 'Authentication, Security & Cloud Deployment',
          description: 'Implement JWT/OAuth2, rate limiting, Docker containerization, and AWS/Render hosting',
          category: 'Practice',
          duration: '6-8 weeks',
          difficulty: 'advanced',
          order: order++,
          prerequisites: ['databases-sql'],
          completed: false,
          progress: 0,
          estimatedHours: 90,
          skills: ['OAuth2', 'JWT', 'Docker', 'Rate Limiting', 'API Gateways', 'AWS/GCP'],
          assessments: [],
          resources: [
            createResource('OWASP Secure Coding Practices', 'article', '#', 'OWASP', 'advanced', true),
            createResource('Docker for Backend Engineers', 'video', '#', 'YouTube', 'advanced', true)
          ]
        }
      );
    } else if (r.includes('devops') || r.includes('cloud')) {
      baseNodes.push(
        {
          id: 'devops-linux',
          title: 'Linux Fundamentals & Shell Scripting',
          description: 'Command line power tools, bash scripting, file systems, and permissions',
          category: 'Fundamentals',
          duration: '3-4 weeks',
          difficulty: 'beginner',
          order: order++,
          prerequisites: [],
          completed: false,
          progress: 0,
          estimatedHours: 45,
          skills: ['Linux CLI', 'Bash Scripting', 'SSH', 'Cron', 'Permissions'],
          assessments: [],
          resources: [
            createResource('Linux Command Line Basics', 'course', '#', 'freeCodeCamp', 'beginner', true)
          ]
        },
        {
          id: 'devops-docker-k8s',
          title: 'Containers & Kubernetes Orchestration',
          description: 'Containerize multi-service applications and manage pods/services with K8s',
          category: 'Core Skills',
          duration: '6-8 weeks',
          difficulty: 'intermediate',
          order: order++,
          prerequisites: ['devops-linux'],
          completed: false,
          progress: 0,
          estimatedHours: 80,
          skills: ['Docker', 'Multi-stage Builds', 'Kubernetes', 'Helm', 'Deployments'],
          assessments: [],
          resources: [
            createResource('Kubernetes for Absolute Beginners', 'course', '#', 'Udemy', 'intermediate', true)
          ]
        },
        {
          id: 'devops-cicd-iac',
          title: 'CI/CD Pipelines & Terraform (IaC)',
          description: 'Automate build/test/deploy flows using GitHub Actions and provision cloud infrastructure',
          category: 'Practice',
          duration: '6-8 weeks',
          difficulty: 'advanced',
          order: order++,
          prerequisites: ['devops-docker-k8s'],
          completed: false,
          progress: 0,
          estimatedHours: 90,
          skills: ['GitHub Actions', 'Terraform', 'AWS/GCP Cloud', 'Prometheus', 'Grafana'],
          assessments: [],
          resources: [
            createResource('Terraform Associate Certification Prep', 'course', '#', 'HashiCorp', 'advanced', true)
          ]
        }
      );
    } else if (r.includes('data') || r.includes('ml')) {
      baseNodes.push(
        {
          id: 'data-python-stats',
          title: 'Python for Data Science & Math',
          description: 'Linear algebra, probability, calculus, and Python data structures',
          category: 'Fundamentals',
          duration: '4-5 weeks',
          difficulty: 'beginner',
          order: order++,
          prerequisites: [],
          completed: false,
          progress: 0,
          estimatedHours: 50,
          skills: ['Python 3', 'NumPy', 'Pandas', 'Statistics', 'Data Visualization (Matplotlib)'],
          assessments: [],
          resources: [
            createResource('Python for Data Science', 'course', '#', 'Coursera', 'beginner', true)
          ]
        },
        {
          id: 'ml-algorithms',
          title: 'Machine Learning Algorithms & Scikit-Learn',
          description: 'Supervised and unsupervised learning, regression, classification, and model evaluation',
          category: 'Core Skills',
          duration: '6-8 weeks',
          difficulty: 'intermediate',
          order: order++,
          prerequisites: ['data-python-stats'],
          completed: false,
          progress: 0,
          estimatedHours: 80,
          skills: ['Scikit-Learn', 'Feature Engineering', 'Cross-Validation', 'XGBoost', 'Clustering'],
          assessments: [],
          resources: [
            createResource('Machine Learning Specialization by Andrew Ng', 'course', '#', 'Coursera', 'intermediate', true)
          ]
        },
        {
          id: 'deep-learning-nlp',
          title: 'Deep Learning, PyTorch & LLMs',
          description: 'Neural networks, PyTorch, Transformers, Computer Vision, and generative AI apps',
          category: 'Practice',
          duration: '8-10 weeks',
          difficulty: 'advanced',
          order: order++,
          prerequisites: ['ml-algorithms'],
          completed: false,
          progress: 0,
          estimatedHours: 110,
          skills: ['PyTorch', 'Transformers', 'Hugging Face', 'Fine-Tuning', 'MLOps'],
          assessments: [],
          resources: [
            createResource('Deep Learning with PyTorch', 'course', '#', 'freeCodeCamp', 'advanced', true)
          ]
        }
      );
    } else {
      // General role fallback
      baseNodes.push(
        {
          id: 'programming-fundamentals',
          title: 'Programming Core & Algorithms',
          description: 'Master core logic, data structures, algorithm efficiency, and problem solving',
          category: 'Fundamentals',
          duration: '4-6 weeks',
          difficulty: 'beginner',
          order: order++,
          prerequisites: [],
          completed: false,
          progress: 0,
          estimatedHours: 50,
          skills: ['Variables', 'Control Flow', 'Data Structures', 'Time Complexity (Big O)'],
          assessments: [],
          resources: [
            createResource('CS50 Introduction to Computer Science', 'course', '#', 'Harvard', 'beginner', true),
            createResource('Algorithms & Data Structures Masterclass', 'course', '#', 'Udemy', 'beginner', true)
          ]
        },
        {
          id: 'domain-specialization',
          title: `Core ${prof.targetRole || 'Software Engineering'} Mastery`,
          description: `Deep dive into essential tools, libraries, and best practices for ${prof.targetRole || 'developers'}`,
          category: 'Core Skills',
          duration: '6-8 weeks',
          difficulty: 'intermediate',
          order: order++,
          prerequisites: ['programming-fundamentals'],
          completed: false,
          progress: 0,
          estimatedHours: 75,
          skills: ['Industry Standards', 'Design Patterns', 'System Architecture', 'Version Control'],
          assessments: [],
          resources: [
            createResource('Design Patterns for Developers', 'book', '#', 'Refactoring.Guru', 'intermediate', true),
            createResource('Advanced Engineering Practices', 'article', '#', 'Dev.to', 'intermediate', true)
          ]
        },
        {
          id: 'capstone-portfolio',
          title: 'Production Capstone & Portfolio',
          description: 'Build and deploy a complete production-grade application demonstrating your mastery',
          category: 'Practice',
          duration: '6-8 weeks',
          difficulty: 'advanced',
          order: order++,
          prerequisites: ['domain-specialization'],
          completed: false,
          progress: 0,
          estimatedHours: 95,
          skills: ['Full Project Lifecycle', 'Testing', 'Deployment', 'Documentation'],
          assessments: [],
          resources: [
            createResource('Building Production Ready Systems', 'article', '#', 'GitHub', 'advanced', true)
          ]
        }
      );
    }

    return baseNodes;
  }, []);

  // Simulated AI roadmap generation
  const generateRoadmap = useCallback(() => {
    setStep('generating');
    
    setTimeout(() => {
      const roadmapId = `roadmap-${profile.targetRole.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
      const generatedMilestones = generateMilestones(profile.targetRole);
      const generatedNodeList = generateNodes(profile);

      const roadmap: GeneratedRoadmap = {
        id: roadmapId,
        title: `${profile.targetRole || 'Software Engineering'} Learning Path`,
        description: `Personalized roadmap tailored for ${profile.currentLevel || 'all'} developers aiming to become ${profile.targetRole || 'Professional Engineers'}`,
        estimatedDuration: profile.timeCommitment === 'full-time' ? '3-4 months' : profile.timeCommitment === 'part-time' ? '6-8 months' : '9-12 months',
        totalHours: profile.timeCommitment === 'full-time' ? 480 : profile.timeCommitment === 'part-time' ? 720 : 960,
        tags: [profile.targetRole.toLowerCase(), profile.currentLevel.toLowerCase(), ...profile.interests.map(i => i.toLowerCase())],
        difficulty: (profile.currentLevel.toLowerCase() || 'beginner') as 'beginner' | 'intermediate' | 'advanced',
        completionRate: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        milestones: generatedMilestones,
        nodes: generatedNodeList
      };
      
      // Load any existing progress for this specific roadmap role
      try {
        const savedProgress = localStorage.getItem(`dev-pocket-progress-${roadmap.id}`);
        if (savedProgress) {
          const parsed = JSON.parse(savedProgress);
          setCompletedNodes(new Set(parsed.completedNodes || []));
          setCompletedMilestones(new Set(parsed.completedMilestones || []));
        } else {
          setCompletedNodes(new Set());
          setCompletedMilestones(new Set());
        }
      } catch {}

      setGeneratedRoadmap(roadmap);
      setStep('result');
    }, 2000);
  }, [profile, generateNodes, generateMilestones]);

  

  const handleInterestToggle = (interest: string) => {
    setProfile(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-700';
      case 'intermediate': return 'bg-yellow-100 text-yellow-700';
      case 'advanced': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Profile Form
  if (step === 'profile') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
              <div className="relative inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full mb-6 shadow-lg">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 bg-clip-text text-transparent mb-4">
              AI-Powered Learning Path
            </h1>
            <p className="text-xl text-gray-700 max-w-2xl mx-auto leading-relaxed">
              Tell us about yourself and let our advanced AI craft a personalized roadmap tailored to your goals
            </p>
            <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>Takes 2-3 minutes</span>
              <span className="mx-2">•</span>
              <Users className="w-4 h-4" />
              <span>Trusted by 10,000+ developers</span>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-8 md:p-10 space-y-8">
            
            {/* Progress Indicator */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full text-white text-sm font-bold">1</div>
                <span className="text-gray-800 font-medium">Profile Setup</span>
              </div>
              <div className="text-gray-500 text-sm">Step 1 of 3</div>
            </div>

            {/* Current Level */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <Target className="w-5 h-5 text-cyan-600" />
                <label className="text-lg font-semibold text-gray-800">
                  What&apos;s your current skill level?
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { value: 'Beginner', desc: 'Just starting out', icon: '🌱' },
                  { value: 'Intermediate', desc: 'Some experience', icon: '🚀' },
                  { value: 'Advanced', desc: 'Experienced pro', icon: '⭐' }
                ].map(level => (
                  <button
                    key={level.value}
                    onClick={() => setProfile(prev => ({ ...prev, currentLevel: level.value }))}
                    className={`group p-6 rounded-2xl border-2 transition-all duration-300 hover:scale-105 ${
                      profile.currentLevel === level.value
                        ? 'border-cyan-500 bg-gradient-to-br from-cyan-50 to-blue-50 shadow-lg shadow-cyan-500/25'
                        : 'border-gray-200 bg-white hover:border-cyan-300 hover:bg-cyan-50/50'
                    }`}
                  >
                    <div className="text-3xl mb-2">{level.icon}</div>
                    <div className="font-bold text-gray-800 text-lg mb-1">{level.value}</div>
                    <div className="text-gray-600 text-sm">{level.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Role */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <Award className="w-5 h-5 text-blue-600" />
                <label className="text-lg font-semibold text-gray-800">
                  Select your target role
                </label>
              </div>
              <p className="text-sm text-gray-500">
                Choose a role from our curated industry career paths:
              </p>

              <div className="relative">
                <select
                  value={profile.targetRole}
                  onChange={(e) => setProfile(prev => ({ ...prev, targetRole: e.target.value }))}
                  className="w-full px-6 py-4 bg-white/90 border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:outline-none transition-all text-gray-800 text-lg backdrop-blur-sm shadow-inner appearance-none cursor-pointer"
                >
                  <option value="">-- Choose a Role --</option>
                  {Array.from(new Set(PREDEFINED_ROLES.map(r => r.category))).map(cat => (
                    <optgroup key={cat} label={cat}>
                      {PREDEFINED_ROLES.filter(r => r.category === cat).map(r => (
                        <option key={r.value} value={r.value}>
                          {r.icon} {r.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <div className="absolute right-5 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500">
                  ▼
                </div>
              </div>

              {/* Quick Select Chips */}
              <div className="flex flex-wrap gap-2 pt-2">
                {PREDEFINED_ROLES.slice(0, 6).map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setProfile(prev => ({ ...prev, targetRole: role.value }))}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      profile.targetRole === role.value
                        ? 'bg-blue-600 text-white shadow-md scale-105'
                        : 'bg-white/80 text-gray-700 hover:bg-blue-50 hover:text-blue-600 border border-gray-200'
                    }`}
                  >
                    <span>{role.icon}</span>
                    <span>{role.value}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Time Commitment */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-5 h-5 text-teal-600" />
                <label className="text-lg font-semibold text-gray-800">
                  How much time can you dedicate?
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { value: 'full-time', label: 'Full-time', desc: '30+ hrs/week', icon: '🔥' },
                  { value: 'part-time', label: 'Part-time', desc: '15-20 hrs/week', icon: '⚡' },
                  { value: 'casual', label: 'Casual', desc: '5-10 hrs/week', icon: '🌙' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setProfile(prev => ({ ...prev, timeCommitment: option.value }))}
                    className={`group p-5 rounded-2xl border-2 transition-all duration-300 hover:scale-105 ${
                      profile.timeCommitment === option.value
                        ? 'border-teal-500 bg-gradient-to-br from-teal-50 to-cyan-50 shadow-lg shadow-teal-500/25'
                        : 'border-gray-200 bg-white hover:border-teal-300 hover:bg-teal-50/50'
                    }`}
                  >
                    <div className="text-2xl mb-2">{option.icon}</div>
                    <div className="font-bold text-gray-800 text-lg mb-1">{option.label}</div>
                    <div className="text-gray-600 text-sm">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Interests */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <Star className="w-5 h-5 text-amber-600" />
                <label className="text-lg font-semibold text-gray-800">
                  What excites you? (Select all that apply)
                </label>
              </div>
              <div className="flex flex-wrap gap-3">
                {[
                  { name: 'Web Development', icon: '🌐' },
                  { name: 'Mobile Apps', icon: '📱' },
                  { name: 'Cloud', icon: '☁️' },
                  { name: 'AI/ML', icon: '🤖' },
                  { name: 'DevOps', icon: '⚙️' },
                  { name: 'Security', icon: '🔒' },
                  { name: 'Databases', icon: '💾' },
                  { name: 'UI/UX', icon: '🎨' }
                ].map(interest => (
                  <button
                    key={interest.name}
                    onClick={() => handleInterestToggle(interest.name)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-full border-2 transition-all duration-300 hover:scale-105 ${
                      profile.interests.includes(interest.name)
                        ? 'border-amber-500 bg-gradient-to-r from-amber-50 to-yellow-50 text-gray-800 shadow-lg shadow-amber-500/25'
                        : 'border-gray-200 text-gray-700 bg-white hover:border-amber-300 hover:bg-amber-50/50'
                    }`}
                  >
                    <span className="text-lg">{interest.icon}</span>
                    <span className="font-medium">{interest.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Experience */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <Book className="w-5 h-5 text-indigo-600" />
                <label className="text-lg font-semibold text-gray-800">
                  Tell us about your experience (optional)
                </label>
              </div>
              <textarea
                value={profile.experience}
                onChange={(e) => setProfile(prev => ({ ...prev, experience: e.target.value }))}
                placeholder="Share any relevant experience, projects, or technologies you've worked with..."
                rows={4}
                className="w-full px-6 py-4 bg-white/70 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:outline-none transition-all resize-none text-gray-800 placeholder-gray-500 text-lg backdrop-blur-sm shadow-inner"
              />
            </div>

            {/* Generate Button */}
            <div className="pt-6">
              <button
                onClick={generateRoadmap}
                disabled={!profile.currentLevel || !profile.targetRole || !profile.timeCommitment}
                className="w-full bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white font-bold py-5 rounded-2xl hover:from-cyan-700 hover:via-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl hover:scale-105 text-lg"
              >
                <Sparkles className="w-6 h-6" />
                Generate My AI Roadmap
                <ArrowRight className="w-6 h-6" />
              </button>
              
              {(!profile.currentLevel || !profile.targetRole || !profile.timeCommitment) && (
                <p className="text-center text-gray-500 text-sm mt-3">
                  Please complete the required fields above
                </p>
              )}
            </div>
          </div>

          {/* Bottom Info */}
          <div className="text-center mt-8">
            <div className="flex items-center justify-center gap-6 text-gray-600 text-sm">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>100% Free</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>No Credit Card Required</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Instant Results</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Generating State
  if (step === 'generating') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-gray-900 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full mb-6 animate-pulse shadow-lg">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">
            Crafting Your Perfect Learning Path...
          </h2>
          <p className="text-lg text-gray-300 mb-8">
            Our AI is analyzing your profile and generating a personalized roadmap
          </p>
          <div className="flex justify-center gap-2">
            <div className="w-3 h-3 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  // Results View
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-6 h-6 text-blue-600" />
                <span className="text-sm font-semibold text-blue-600 uppercase">Your Personalized Path</span>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {generatedRoadmap?.title}
              </h1>
              <p className="text-lg text-gray-700 mb-4">
                {generatedRoadmap?.description}
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-gray-800">Estimated: {generatedRoadmap?.estimatedDuration}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Book className="w-4 h-4 text-purple-600" />
                  <span className="font-medium text-gray-800">{generatedRoadmap?.nodes.length} Learning Modules</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-yellow-600" />
                  <span className="font-medium text-gray-800">{generatedRoadmap?.milestones.length} Milestones</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setStep('profile')}
              className="ml-4 px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors text-gray-800"
            >
              Create New
            </button>
          </div>

          {/* ── Visual Roadmap Progress Stepper (Styled after Notes 'n Frames Progress Indicator) ── */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-white dark:from-slate-900 dark:via-slate-800/80 dark:to-slate-900 p-8 border border-emerald-100/80 dark:border-emerald-900/40 shadow-xl">
            {/* Ambient emerald blur glow */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-400/20 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-teal-400/20 dark:bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Learning Journey Milestones</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    Progress Indicator
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Click each milestone circle to track your live learning path
                  </p>
                </div>

                {/* Progress Stats Badge */}
                <div className="flex items-center gap-3 bg-white/90 dark:bg-slate-800/90 px-4 py-2 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 backdrop-blur-sm">
                  <div className="text-right">
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Completion</div>
                    <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      {generatedRoadmap?.nodes.length
                        ? Math.round((completedNodes.size / generatedRoadmap.nodes.length) * 100)
                        : 0}%
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              </div>

              {/* Horizontal Stepper Timeline */}
              <div className="py-4 overflow-x-auto scrollbar-thin">
                <div className="min-w-[620px] flex items-start justify-between relative px-6">
                  {/* Background Track Line */}
                  <div className="absolute top-7 left-14 right-14 h-1 bg-slate-200/80 dark:bg-slate-700/80 -z-0" />
                  
                  {/* Active Solid Green Progress Line */}
                  {generatedRoadmap?.milestones && generatedRoadmap.milestones.length > 1 && (
                    <div
                      className="absolute top-7 left-14 h-1 bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-700 -z-0"
                      style={{
                        width: `${
                          completedMilestones.size > 0
                            ? ((Math.max(...Array.from(completedMilestones)) + 1) / generatedRoadmap.milestones.length) * 82
                            : 0
                        }%`
                      }}
                    />
                  )}

                  {/* Stepper Nodes */}
                  {generatedRoadmap?.milestones.map((milestone, idx) => {
                    const isPassed = completedMilestones.has(idx);
                    const isNext = !isPassed && (idx === 0 || completedMilestones.has(idx - 1));
                    
                    // Curated distinct icons matching the image style
                    const icons = [
                      <Package key="1" className="w-5 h-5" />,
                      <ClipboardCheck key="2" className="w-5 h-5" />,
                      <Book key="3" className="w-5 h-5" />,
                      <Briefcase key="4" className="w-5 h-5" />,
                      <Trophy key="5" className="w-5 h-5" />
                    ];

                    return (
                      <div
                        key={idx}
                        className="flex flex-col items-center text-center cursor-pointer group relative z-10 flex-1 px-2"
                        onClick={() => toggleMilestoneComplete(idx)}
                      >
                        {/* Circular Icon Step Indicator */}
                        <div
                          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 transform group-hover:scale-110 shadow-lg ${
                            isPassed
                              ? 'bg-white border-2 border-emerald-500 text-emerald-600 dark:bg-slate-900 dark:border-emerald-400 dark:text-emerald-400 shadow-emerald-500/20'
                              : isNext
                              ? 'bg-white border-2 border-emerald-400 text-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950/60 dark:bg-slate-900'
                              : 'bg-white/90 border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-400 dark:bg-slate-900'
                          }`}
                        >
                          {icons[idx % icons.length]}
                        </div>

                        {/* Step Title & Timestamp Info */}
                        <div className="mt-3.5 space-y-0.5">
                          <p
                            className={`text-sm font-bold tracking-tight transition-colors ${
                              isPassed
                                ? 'text-emerald-700 dark:text-emerald-300'
                                : 'text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {milestone}
                          </p>
                          <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                            {isPassed ? '✓ Completed' : `Stage 0${idx + 1}`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Progress Summary Bar */}
              <div className="mt-6 pt-4 border-t border-emerald-100/60 dark:border-slate-700/60 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Interactive Learning Tracker Active</span>
                </div>
                <div>
                  <span>{completedNodes.size} of {generatedRoadmap?.nodes.length} Modules Finished</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Roadmap Nodes */}
        <div className="space-y-4">
          {generatedRoadmap?.nodes.map((node) => {
            const isCompleted = completedNodes.has(node.id);
            return (
            <div
              key={node.id}
              className={`rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden border ${
                isCompleted
                  ? 'bg-emerald-50/60 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700/50'
                  : 'bg-white dark:bg-slate-800/90 border-slate-200/60 dark:border-slate-700/60'
              }`}
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  {/* Order Badge / Completion Toggle */}
                  <button
                    onClick={() => toggleNodeComplete(node.id, node.title)}
                    className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-lg transition-all duration-300 hover:scale-110 ${
                      isCompleted
                        ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white'
                        : 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white'
                    }`}
                    title={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                  >
                    {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : node.order}
                  </button>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(node.difficulty)}`}>
                            {node.difficulty}
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                            {node.category}
                          </span>
                          {isCompleted && (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                              ✓ Completed
                            </span>
                          )}
                        </div>
                        <h3 className={`text-2xl font-bold mb-1 ${
                          isCompleted
                            ? 'text-emerald-800 dark:text-emerald-300 line-through decoration-emerald-400/60'
                            : 'text-gray-900 dark:text-white'
                        }`}>{node.title}</h3>
                        <p className="text-gray-600 dark:text-gray-400">{node.description}</p>
                      </div>
                      <button
                        onClick={() => setSelectedNode(selectedNode?.id === node.id ? null : node)}
                        className="ml-4 p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        <ChevronRight className={`w-5 h-5 transition-transform text-gray-600 dark:text-gray-400 ${selectedNode?.id === node.id ? 'rotate-90' : ''}`} />
                      </button>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {node.duration}
                      </span>
                      {node.prerequisites.length > 0 && (
                        <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                          Requires: {node.prerequisites.length} prerequisite(s)
                        </span>
                      )}
                      <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
                        Click the circle to mark complete
                      </span>
                    </div>

                    {/* Expanded Resources */}
                    {selectedNode?.id === node.id && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Recommended Resources</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {node.resources.map((resource, resIdx) => (
                            <a
                              key={resIdx}
                              href={resource.url}
                              className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-700/60 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors group"
                            >
                              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                                <Book className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                  {resource.title}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {resource.type} • {resource.platform}
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Completion progress bar */}
              <div className="h-1.5 bg-gray-100 dark:bg-slate-700">
                <div
                  className={`h-full transition-all duration-700 ${
                    isCompleted
                      ? 'bg-gradient-to-r from-emerald-500 to-green-500 w-full'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 w-0'
                  }`}
                />
              </div>
            </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          {savedToast && (
            <div className="w-full text-center animate-in fade-in slide-in-from-top-4 duration-300">
              <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 text-white text-sm font-bold shadow-lg shadow-emerald-500/25">
                <CheckCircle2 className="w-4 h-4" /> Roadmap saved to your dashboard!
              </span>
            </div>
          )}
          <button
            onClick={handleSaveToDashboard}
            disabled={isSaving}
            className="inline-flex items-center gap-2.5 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
          >
            {isSaving ? (
              <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving...</>
            ) : (
              <><Save className="w-5 h-5" /> Save to Dashboard</>
            )}
          </button>
          <button
            onClick={() => {
              if (navigator.share && generatedRoadmap) {
                navigator.share({ title: generatedRoadmap.title, text: generatedRoadmap.description, url: window.location.href });
              }
            }}
            className="inline-flex items-center gap-2.5 px-8 py-4 bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-semibold rounded-xl border-2 border-gray-200 dark:border-slate-600 hover:border-blue-600 dark:hover:border-blue-400 transition-all hover:scale-105 active:scale-95"
          >
            <Share2 className="w-5 h-5" /> Share Roadmap
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersonalizedRoadmapGenerator;
