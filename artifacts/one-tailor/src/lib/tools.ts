import {
  Scissors, Ruler, ImageIcon, MessageCircle, Calculator, Layers,
  ArrowLeftRight, Layout, Quote, CalendarClock, ScanLine, Shirt,
  Tag, Contact, Palette, Video, Star, Home, Grid3X3, TrendingUp, Briefcase, Settings,
  Maximize, Eraser, Users, LayoutGrid
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ToolCategory = "tailoring" | "marketing" | "business" | "media";

export interface Tool {
  id: string;
  path: string;
  name: string;
  description: string;
  category: ToolCategory;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  glow: string;
  premium?: boolean;
  isNew?: boolean;
  popular?: boolean;
}

export const ALL_TOOLS: Tool[] = [
  {
    id: "watermark",
    path: "/watermark",
    name: "Watermark Tool",
    description: "Protect your work and promote your brand.",
    category: "marketing",
    icon: Scissors,
    iconBg: "rgba(212,160,32,0.12)",
    iconColor: "hsl(43,82%,55%)",
    borderColor: "rgba(212,160,32,0.2)",
    glow: "rgba(212,160,32,0.05)",
    popular: true,
  },
  {
    id: "customer-measurement",
    path: "/customer-measurement",
    name: "Client Management",
    description: "Manage your digital customer database.",
    category: "tailoring",
    icon: Users,
    iconBg: "rgba(59,130,246,0.12)",
    iconColor: "hsl(217,91%,60%)",
    borderColor: "rgba(59,130,246,0.18)",
    glow: "rgba(59,130,246,0.04)",
    popular: true,
  },
  {
    id: "measurement-card",
    path: "/measurement-card",
    name: "Card Generator",
    description: "Generate professional measurement cards.",
    category: "tailoring",
    icon: LayoutGrid,
    iconBg: "rgba(212,160,32,0.12)",
    iconColor: "hsl(43,82%,55%)",
    borderColor: "rgba(212,160,32,0.2)",
    glow: "rgba(212,160,32,0.05)",
    popular: true,
  },
  {
    id: "converter",
    path: "/converter",
    name: "Measurement Converter",
    description: "Convert inches, cm, and yards instantly.",
    category: "tailoring",
    icon: Ruler,
    iconBg: "rgba(96,165,250,0.12)",
    iconColor: "hsl(210,85%,65%)",
    borderColor: "rgba(96,165,250,0.18)",
    glow: "rgba(96,165,250,0.04)",
    popular: true,
  },
  {
    id: "compressor",
    path: "/compressor",
    name: "Image Compressor",
    description: "Reduce image size without losing quality.",
    category: "media",
    icon: ImageIcon,
    iconBg: "rgba(52,211,153,0.12)",
    iconColor: "hsl(160,65%,52%)",
    borderColor: "rgba(52,211,153,0.18)",
    glow: "rgba(52,211,153,0.04)",
  },
  {
    id: "video-resizer",
    path: "/video-resizer",
    name: "Change Resolution",
    description: "Scale video dimensions (1080p, 720p, etc).",
    category: "media",
    icon: Maximize,
    iconBg: "rgba(59,130,246,0.12)",
    iconColor: "hsl(217,91%,60%)",
    borderColor: "rgba(59,130,246,0.18)",
    glow: "rgba(59,130,246,0.04)",
    isNew: true,
  },
  {
    id: "social-video-resizer",
    path: "/social-video-resizer",
    name: "Social Video Resizer",
    description: "Resize for WhatsApp, Instagram, TikTok & Reels.",
    category: "media",
    icon: Video,
    iconBg: "rgba(168,85,247,0.12)",
    iconColor: "hsl(270,91%,60%)",
    borderColor: "rgba(168,85,247,0.18)",
    glow: "rgba(168,85,247,0.04)",
    isNew: true,
  },
  {
    id: "video-compressor",
    path: "/video-compressor",
    name: "Video Compressor",
    description: "Reduce video size for easy sharing.",
    category: "media",
    icon: Video,
    iconBg: "rgba(139,92,246,0.12)",
    iconColor: "hsl(258,90%,66%)",
    borderColor: "rgba(139,92,246,0.18)",
    glow: "rgba(139,92,246,0.04)",
  },
  {
    id: "bg-remover",
    path: "/bg-remover",
    name: "Background Remover",
    description: "Remove image backgrounds instantly with AI.",
    category: "media",
    icon: ImageIcon,
    iconBg: "rgba(147,51,234,0.12)",
    iconColor: "hsl(270,70%,65%)",
    borderColor: "rgba(147,51,234,0.18)",
    glow: "rgba(147,51,234,0.04)",
    isNew: true,
  },
  {
    id: "video-bg-remover",
    path: "/video-bg-remover",
    name: "Video BG Remover",
    description: "Remove background from videos using AI.",
    category: "media",
    icon: Eraser,
    iconBg: "rgba(244,63,94,0.12)",
    iconColor: "hsl(350,89%,60%)",
    borderColor: "rgba(244,63,94,0.18)",
    glow: "rgba(244,63,94,0.04)",
    isNew: true,
  },
  {
    id: "whatsapp-link",
    path: "/whatsapp-link",
    name: "WhatsApp Link",
    description: "Let customers contact you with one tap.",
    category: "business",
    icon: MessageCircle,
    iconBg: "rgba(74,222,128,0.12)",
    iconColor: "hsl(142,65%,55%)",
    borderColor: "rgba(74,222,128,0.18)",
    glow: "rgba(74,222,128,0.04)",
    popular: true,
  },
  {
    id: "profit",
    path: "/profit",
    name: "Profit Calculator",
    description: "Avoid underpricing your work.",
    category: "business",
    icon: Calculator,
    iconBg: "rgba(251,146,60,0.12)",
    iconColor: "hsl(25,85%,58%)",
    borderColor: "rgba(251,146,60,0.18)",
    glow: "rgba(251,146,60,0.04)",
    popular: true,
  },
  {
    id: "fabric-cost",
    path: "/fabric-cost",
    name: "Fabric Cost Estimator",
    description: "Quote materials fast and accurately.",
    category: "business",
    icon: Calculator,
    iconBg: "rgba(234,179,8,0.12)",
    iconColor: "hsl(45,90%,60%)",
    borderColor: "rgba(234,179,8,0.18)",
    glow: "rgba(234,179,8,0.04)",
  },
  {
    id: "before-after",
    path: "/before-after",
    name: "Before & After",
    description: "Showcase your work professionally.",
    category: "marketing",
    icon: ArrowLeftRight,
    iconBg: "rgba(236,72,153,0.12)",
    iconColor: "hsl(330,82%,65%)",
    borderColor: "rgba(236,72,153,0.18)",
    glow: "rgba(236,72,153,0.04)",
  },
  {
    id: "flyer-resizer",
    path: "/flyer-resizer",
    name: "Flyer Resizer",
    description: "Resize flyers for every platform instantly.",
    category: "marketing",
    icon: Layout,
    iconBg: "rgba(34,211,238,0.12)",
    iconColor: "hsl(190,85%,58%)",
    borderColor: "rgba(34,211,238,0.18)",
    glow: "rgba(34,211,238,0.04)",
  },
  {
    id: "testimonial-card",
    path: "/testimonial-card",
    name: "Testimonial Card",
    description: "Turn customer feedback into marketing content.",
    category: "marketing",
    icon: Quote,
    iconBg: "rgba(251,191,36,0.12)",
    iconColor: "hsl(43,95%,58%)",
    borderColor: "rgba(251,191,36,0.18)",
    glow: "rgba(251,191,36,0.04)",
  },
  {
    id: "delivery-date",
    path: "/delivery-date",
    name: "Delivery Date Calculator",
    description: "Stop guessing delivery dates.",
    category: "tailoring",
    icon: CalendarClock,
    iconBg: "rgba(99,202,183,0.12)",
    iconColor: "hsl(170,55%,58%)",
    borderColor: "rgba(99,202,183,0.18)",
    glow: "rgba(99,202,183,0.04)",
    isNew: true,
    popular: true,
  },
  {
    id: "measurement-checker",
    path: "/measurement-checker",
    name: "Measurement Checker",
    description: "Catch measurement mistakes before production.",
    category: "tailoring",
    icon: ScanLine,
    iconBg: "rgba(251,113,133,0.12)",
    iconColor: "hsl(349,85%,68%)",
    borderColor: "rgba(251,113,133,0.18)",
    glow: "rgba(251,113,133,0.04)",
    isNew: true,
  },
  {
    id: "fabric-requirement",
    path: "/fabric-requirement",
    name: "Fabric Requirement",
    description: "Estimate fabric needs instantly.",
    category: "tailoring",
    icon: Shirt,
    iconBg: "rgba(139,92,246,0.12)",
    iconColor: "hsl(262,75%,68%)",
    borderColor: "rgba(139,92,246,0.18)",
    glow: "rgba(139,92,246,0.04)",
    isNew: true,
    popular: true,
  },
  {
    id: "pricing-advisor",
    path: "/price-smartly",
    name: "Price Smartly",
    description: "Price your work with confidence.",
    category: "business",
    icon: Tag,
    iconBg: "rgba(234,179,8,0.12)",
    iconColor: "hsl(45,90%,52%)",
    borderColor: "rgba(234,179,8,0.18)",
    glow: "rgba(234,179,8,0.04)",
    isNew: true,
  },
  {
    id: "color-matcher",
    path: "/color-matcher",
    name: "Fabric Color Matcher",
    description: "Find matching thread colors quickly.",
    category: "tailoring",
    icon: Palette,
    iconBg: "rgba(248,113,113,0.12)",
    iconColor: "hsl(0,80%,68%)",
    borderColor: "rgba(248,113,113,0.18)",
    glow: "rgba(248,113,113,0.04)",
    isNew: true,
  },
];

export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  tailoring: "Tailoring Tools",
  marketing: "Marketing Tools",
  business: "Business Tools",
  media: "Media Tools",
};

export function getToolById(id: string): Tool | undefined {
  return ALL_TOOLS.find((t) => t.id === id);
}

export function getToolsByCategory(category: ToolCategory): Tool[] {
  return ALL_TOOLS.filter((t) => t.category === category);
}

export function searchTools(query: string): Tool[] {
  const q = query.toLowerCase();
  return ALL_TOOLS.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q),
  );
}
