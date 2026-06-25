import React, { useEffect, useRef, useState } from "react";
import { createPageUrl } from "@/utils";
import {
  ChevronRight,
  LayoutDashboard,
  Shield,
  Store,
  Smartphone,
  Star,
  Zap,
  UtensilsCrossed,
  ArrowRight,
  Sparkles,
  PlayCircle,
  Menu as MenuIcon,
  X,
  Check,
  Tag,
  Heart,
  Rocket,
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
} from "lucide-react";
import { motion, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

// Particle Canvas Component
function ParticleCanvas() {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let W, H;
    let mouse = { x: -9999, y: -9999 };
    let particles = [];
    const PARTICLE_COUNT_BASE = 80;
    const CONNECTION_DIST = 140;
    const MOUSE_RADIUS = 180;
    
    const colors = [
      'rgba(249,115,22,',  // orange-500
      'rgba(251,146,60,',  // orange-400
      'rgba(234,88,12,',   // orange-600
      'rgba(255,255,255,',  // white
    ];
    
    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    
    function createParticles() {
      particles = [];
      const count = Math.min(PARTICLE_COUNT_BASE, Math.floor((W * H) / 12000));
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          radius: Math.random() * 1.8 + 0.5,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: Math.random() * 0.5 + 0.2,
          pulseSpeed: Math.random() * 0.02 + 0.005,
          pulseOffset: Math.random() * Math.PI * 2,
        });
      }
    }
    
    let time = 0;
    
    function draw() {
      time += 0.016;
      ctx.clearRect(0, 0, W, H);
      
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_RADIUS && dist > 0) {
          const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS;
          const angle = Math.atan2(dy, dx);
          p.vx += Math.cos(angle) * force * 0.8;
          p.vy += Math.sin(angle) * force * 0.8;
        }
        
        p.vx *= 0.98;
        p.vy *= 0.98;
        
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed < 0.15) {
          p.vx += (Math.random() - 0.5) * 0.1;
          p.vy += (Math.random() - 0.5) * 0.1;
        }
        
        p.x += p.vx;
        p.y += p.vy;
        
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10;
        if (p.y > H + 10) p.y = -10;
        
        const pulse = Math.sin(time * p.pulseSpeed * 60 + p.pulseOffset) * 0.15 + 0.85;
        const finalAlpha = p.alpha * pulse;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color + finalAlpha + ')';
        ctx.fill();
      }
      
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < CONNECTION_DIST) {
            const opacity = (1 - dist / CONNECTION_DIST) * 0.15;
            
            const midX = (a.x + b.x) / 2;
            const midY = (a.y + b.y) / 2;
            const mouseDist = Math.sqrt((midX - mouse.x) ** 2 + (midY - mouse.y) ** 2);
            const mouseBoost = mouseDist < MOUSE_RADIUS ? (1 - mouseDist / MOUSE_RADIUS) * 0.25 : 0;
            
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(249,115,22,${opacity + mouseBoost})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
      
      if (mouse.x > 0 && mouse.y > 0) {
        const grad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, MOUSE_RADIUS);
        grad.addColorStop(0, 'rgba(249,115,22,0.06)');
        grad.addColorStop(1, 'rgba(249,115,22,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(mouse.x - MOUSE_RADIUS, mouse.y - MOUSE_RADIUS, MOUSE_RADIUS * 2, MOUSE_RADIUS * 2);
      }
      
      requestAnimationFrame(draw);
    }
    
    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    
    const handleMouseLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };
    
    resize();
    createParticles();
    draw();
    
    window.addEventListener('resize', () => {
      resize();
      createParticles();
    });
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);
  
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ background: 'transparent' }}
    />
  );
}

// Counter Animation Component
function Counter({ target, suffix = "" }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, threshold: 0.5 });
  
  useEffect(() => {
    if (inView) {
      let current = 0;
      const increment = target / 60;
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        setCount(Math.floor(current));
      }, 25);
      return () => clearInterval(timer);
    }
  }, [inView, target]);
  
  return (
    <span ref={ref} className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-foreground to-orange-500 bg-clip-text text-transparent">
      {count.toLocaleString('it-IT')}{suffix}
    </span>
  );
}

// Phone Mockup Component
function PhoneMockup() {
  return (
    <div className="phone-mockup w-[280px] sm:w-[300px] mx-auto" style={{
      background: 'linear-gradient(145deg, #1a1a1a, #0f0f0f)',
      border: '2px solid rgba(255,255,255,0.08)',
      borderRadius: '2.5rem',
      padding: '12px',
      boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 25px 80px -12px rgba(0,0,0,0.8), 0 0 80px -10px rgba(249,115,22,0.08)',
      animation: 'phoneFloat 6s ease-in-out infinite'
    }}>
      <style>{`
        @keyframes phoneFloat {
          0%,100%{transform:translateY(0) rotateY(-5deg) rotateX(2deg);}
          50%{transform:translateY(-15px) rotateY(-5deg) rotateX(2deg);}
        }
      `}</style>
      <div className="phone-screen rounded-2xl overflow-hidden bg-background" style={{ borderRadius: '2rem' }}>
        <div className="phone-notch w-[120px] h-[28px] bg-muted mx-auto rounded-b-xl relative z-10"></div>
        <div className="bg-gradient-to-b from-orange-500 to-orange-700 p-4 pt-2 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white/70 text-xs">Ciao Marco 👋</p>
              <p className="text-white font-bold text-sm">Pizzeria Da Luigi</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Store className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="bg-white/10 rounded-xl px-3 py-2.5 flex items-center gap-2">
            <span className="text-white/40 text-xs">Cerca nel menu...</span>
          </div>
        </div>
        <div className="px-4 py-3 flex gap-2 overflow-hidden">
          <div className="px-3 py-1.5 bg-orange-500 rounded-full text-white text-[10px] font-semibold whitespace-nowrap">🍕 Pizze</div>
          <div className="px-3 py-1.5 bg-muted rounded-full text-muted-foreground text-[10px] font-medium whitespace-nowrap">🥗 Insalate</div>
          <div className="px-3 py-1.5 bg-muted rounded-full text-muted-foreground text-[10px] font-medium whitespace-nowrap">🍝 Pasta</div>
        </div>
        <div className="px-4 space-y-3 pb-4">
          {[
            { name: "Margherita", desc: "Pomodoro, mozzarella, basilico", price: "€6,50" },
            { name: "Diavola", desc: "Salame piccante, mozzarella", price: "€8,00" },
            { name: "Quattro Formaggi", desc: "Mozzarella, gorgonzola, parmigiano", price: "€9,50" },
          ].map((item, i) => (
            <div key={item.name} className="bg-muted/30 rounded-xl p-3 flex gap-3 items-center">
              <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 flex items-center justify-center flex-shrink-0">
                <UtensilsCrossed className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-foreground text-xs font-semibold">{item.name}</p>
                <p className="text-muted-foreground text-[10px] mt-0.5">{item.desc}</p>
                <p className="text-orange-600 dark:text-orange-400 text-xs font-bold mt-1">{item.price}</p>
              </div>
              <div className={`w-7 h-7 rounded-lg ${i < 2 ? 'bg-orange-500' : 'bg-orange-500/30'} flex items-center justify-center flex-shrink-0`}>
                <ChevronRight className={`w-4 h-4 ${i < 2 ? 'text-white' : 'text-orange-400'}`} />
              </div>
            </div>
          ))}
          <div className="bg-orange-500 rounded-xl p-3 flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold text-white">2</div>
              <span className="text-white text-xs font-semibold">Carrello</span>
            </div>
            <span className="text-white text-sm font-bold">€14,50</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const scrollToId = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <ParticleCanvas />
      
      {/* Grain overlay */}
      <div className="fixed inset-0 z-1 pointer-events-none opacity-[0.025]" style={{
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        backgroundSize: '128px'
      }} />

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-background/85 backdrop-blur border-b border-border/5' : ''}`}>
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-shadow">
              <Store className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">Ordina<span className="text-orange-400">Facile.food</span></span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <button type="button" className="text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => scrollToId("how")}>
              Come funziona
            </button>
            <button type="button" className="text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => scrollToId("features")}>
              Vantaggi
            </button>
            <button type="button" className="text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => scrollToId("plans")}>
              Prezzi
            </button>
            <button type="button" className="text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => scrollToId("testimonials")}>
              Recensioni
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <Button asChild className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/25 hover:-translate-y-0.5">
              <Link to={createPageUrl("Register")}>
                Inizia ora <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <button onClick={() => setMobileMenuOpen(true)} className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl border border-border hover:border-border/20 transition-colors">
              <MenuIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="mobile-menu fixed inset-y-0 right-0 w-72 z-[60] bg-background/95 backdrop-blur-xl border-l border-border/5 p-8 flex flex-col gap-6">
            <button onClick={() => setMobileMenuOpen(false)} className="self-end w-10 h-10 flex items-center justify-center rounded-xl border border-border hover:border-border/20 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col gap-4 mt-4">
              <button type="button" className="text-lg text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => scrollToId("how")}>
                Come funziona
              </button>
              <button type="button" className="text-lg text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => scrollToId("features")}>
                Vantaggi
              </button>
              <button type="button" className="text-lg text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => scrollToId("plans")}>
                Prezzi
              </button>
              <button type="button" className="text-lg text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => scrollToId("testimonials")}>
                Recensioni
              </button>
            </div>
            <Button asChild className="mt-auto flex items-center justify-center gap-2 px-5 py-3 bg-orange-500 text-white font-semibold rounded-xl">
              <Link to={createPageUrl("Register")}>
                Inizia ora <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </>
      )}

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="min-h-screen flex items-center pt-24 pb-16 px-6">
          <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            <div className="space-y-8">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-orange-500/10 border border-orange-500/20 text-orange-500">
                  <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                  Novità 2025
                </span>
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[0.95] tracking-tight"
              >
                Il tuo menu<br />
                <span className="bg-gradient-to-r from-foreground via-orange-500 to-orange-600 bg-clip-text text-transparent bg-[length:200%_200%] animate-[shimmer_4s_ease-in-out_infinite_alternate]">
                  online in
                </span><br />
                <span className="bg-gradient-to-r from-foreground via-orange-500 to-orange-600 bg-clip-text text-transparent bg-[length:200%_200%] animate-[shimmer_4s_ease-in-out_infinite_alternate]">
                  5 minuti.
                </span>
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-lg sm:text-xl text-muted-foreground max-w-lg leading-relaxed font-light"
              >
                Stop ai confusionari gruppi WhatsApp. Un link, un menu digitale, ordini organizzati. Il food delivery che <span className="text-foreground font-medium">non ti stressa</span>.
              </motion.p>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Button asChild className="inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-2xl transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/30 hover:-translate-y-1 text-base relative">
                  <Link to={createPageUrl("Register")}>
                    Prova gratis <Sparkles className="w-5 h-5" />
                  </Link>
                </Button>
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => scrollToId("how")}
                  className="inline-flex items-center justify-center gap-2.5 px-8 py-4 border border-border hover:border-border/20 text-foreground font-medium rounded-2xl transition-all duration-300 hover:bg-muted/5 text-base"
                >
                  <PlayCircle className="w-5 h-5 text-orange-500" /> Come funziona
                </Button>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex items-center gap-4 pt-2"
              >
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-9 h-9 rounded-full border-2 border-background bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 flex items-center justify-center">
                      <Store className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-orange-400 text-orange-400" />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">+2.400 ristoratori soddisfatti</p>
                </div>
              </motion.div>
            </div>

            <motion.div 
              initial={{ opacity: 0, x: 30 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex justify-center lg:justify-end"
              style={{ perspective: '1000px' }}
            >
              <PhoneMockup />
            </motion.div>
          </div>
          
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Scorri</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground rotate-90" />
          </div>
        </section>

        {/* Marquee Section */}
        <section className="py-12 border-y border-border/5 overflow-hidden">
          <div className="flex items-center gap-12 mb-6 px-6">
            <div className="w-12 h-px bg-border/10"></div>
            <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold whitespace-nowrap">Scelto da oltre 2.400 attività in Italia</span>
            <div className="flex-1 h-px bg-border/10"></div>
          </div>
          <div className="overflow-hidden">
            <div className="flex animate-[marquee_30s_linear_infinite] w-max">
              {['🍕 Pizzeria Da Luigi', '🍣 Sushi Zen', '🍔 Burger House', '🥙 Kebab Palace', '🍝 Trattoria Roma', '🥘 Ristorante Sole', '🌮 Tacos Madre', '🍦 Gelatoria Dolce'].map((item, i) => (
                <span key={`${item}-${i}`} className="text-muted-foreground text-2xl font-bold tracking-tight whitespace-nowrap px-8">
                  {item}
                </span>
              ))}
              {['🍕 Pizzeria Da Luigi', '🍣 Sushi Zen', '🍔 Burger House', '🥙 Kebab Palace', '🍝 Trattoria Roma', '🥘 Ristorante Sole', '🌮 Tacos Madre', '🍦 Gelatoria Dolce'].map((item, i) => (
                <span key={`${item}-dup-${i}`} className="text-muted-foreground text-2xl font-bold tracking-tight whitespace-nowrap px-8">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how" className="py-24 sm:py-32 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-20">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-orange-500/10 border border-orange-500/20 text-orange-500 mb-6">
                  <Zap className="w-3 h-3" /> Semplicissimo
                </span>
              </motion.div>
              <motion.h2 
                initial={{ opacity: 0, y: 20 }} 
                whileInView={{ opacity: 1, y: 0 }} 
                viewport={{ once: true }} 
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-6"
              >
                3 passi e sei <span className="text-orange-500">online</span>
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 20 }} 
                whileInView={{ opacity: 1, y: 0 }} 
                viewport={{ once: true }} 
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-muted-foreground text-lg font-light leading-relaxed"
              >
                Niente corsi, niente tecnici. Creare il tuo menu digitale è semplicissimo.
              </motion.p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 relative">
              <div className="hidden md:block absolute top-[3.5rem] left-[calc(16.67%+1.75rem)] right-[calc(16.67%+1.75rem)] h-px bg-gradient-to-r from-orange-500/30 via-orange-500/15 to-orange-500/30"></div>
              
              {[
                { n: "1", title: "Crea il menu", desc: "Inserisci i tuoi piatti con foto, descrizioni e prezzi. Il nostro editor è drag & drop." },
                { n: "2", title: "Condividi il link", desc: "Un unico link da condividere ovunque: QR code, Instagram, WhatsApp, sito web." },
                { n: "3", title: "Ricevi ordini", desc: "Gli ordini arrivano organizzati in tempo reale. Niente più confusione." },
              ].map((step, i) => (
                <motion.div
                  key={step.n}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="relative rounded-2xl p-8 text-center bg-background/50 backdrop-blur border border-border/60 hover:border-orange-500/25 transition-all duration-500 hover:-translate-y-1 hover:shadow-lg hover:shadow-orange-500/10"
                >
                  <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-6 relative z-10">
                    <span className="text-2xl font-extrabold text-orange-500">{step.n}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features / Benefits */}
        <section id="features" className="py-24 sm:py-32 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div 
                initial={{ opacity: 0, x: -30 }} 
                whileInView={{ opacity: 1, x: 0 }} 
                viewport={{ once: true }} 
                transition={{ duration: 0.6 }}
                className="relative"
                style={{ perspective: '1000px' }}
              >
                <PhoneMockup />
              </motion.div>
              
              <div className="space-y-8">
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
                  <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-orange-500/10 border border-orange-500/20 text-orange-500">
                    <Shield className="w-3 h-3" /> Perché OrdinaFacile.food
                  </span>
                </motion.div>
                <motion.h2 
                  initial={{ opacity: 0, y: 20 }} 
                  whileInView={{ opacity: 1, y: 0 }} 
                  viewport={{ once: true }} 
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="text-4xl sm:text-5xl font-extrabold tracking-tight"
                >
                  Tutto quello che ti serve,<br /><span className="text-orange-500">niente di superfluo</span>
                </motion.h2>
                
                <div className="space-y-6 pt-2">
                  {[
                    { icon: Smartphone, title: "100% mobile", desc: "I tuoi clienti ordinano dal telefono, senza scaricare nulla. Funziona su ogni browser." },
                    { icon: Zap, title: "Zero commissioni", desc: "A differenza delle app delivery, tu tieni il 100% di quello che guadagni. Sempre." },
                    { icon: Store, title: "Brand personalizzato", desc: "Colori, logo e stile del tuo locale. Il menu è sempre 'tuo', mai generico." },
                    { icon: LayoutDashboard, title: "Dashboard intelligente", desc: "Statistiche in tempo reale: piatti più ordinati, orari di picco, fatturato." },
                  ].map((item, i) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                      className="flex gap-4 group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/15 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-500/20 transition-colors">
                        <item.icon className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">{item.title}</h4>
                        <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-20 px-6 border-y border-border/5">
          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { target: 100, suffix: "+", label: "Ristoratori" },
              { target: 5, suffix: "", label: "Minuti per attivarsi" },
              { target: 0, suffix: "%", label: "Commissioni" },
              { target: 24, suffix: "/7", label: "Supporto" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="text-center"
              >
                <Counter target={stat.target} suffix={stat.suffix} />
                <p className="text-muted-foreground text-sm mt-2">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="plans" className="py-24 sm:py-32 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-orange-500/10 border border-orange-500/20 text-orange-500 mb-6">
                  <Tag className="w-3 h-3" /> Prezzi trasparenti
                </span>
              </motion.div>
              <motion.h2 
                initial={{ opacity: 0, y: 20 }} 
                whileInView={{ opacity: 1, y: 0 }} 
                viewport={{ once: true }} 
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-6"
              >
                Scegli il tuo <span className="text-orange-500">piano</span>
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 20 }} 
                whileInView={{ opacity: 1, y: 0 }} 
                viewport={{ once: true }} 
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-muted-foreground text-lg font-light"
              >
                Nessun costo nascosto, nessuna sorpresa. Cancelli quando vuoi.
              </motion.p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { 
                  title: "Basic", 
                  desc: "Per piccoli locali", 
                  price: "€29",
                  items: ["Menu digitale", "Ordini base", "QR Code", "Dashboard essenziale", "Supporto email"],
                  excluded: ["Promozioni", "Brand personalizzato", "Notifiche push"]
                },
                { 
                  title: "Plus", 
                  desc: "Per locali in crescita", 
                  price: "€49",
                  popular: true,
                  items: ["Tutto Basic", "Promozioni e codici sconto", "Brand personalizzato", "Notifiche ordini", "Supporto prioritario", "Statistiche avanzate"],
                  excluded: []
                },
                { 
                  title: "Premium", 
                  desc: "Per catene e multi-sede", 
                  price: "€79",
                  items: ["Tutto Plus", "Multi-sede", "Eventi e menu speciali", "API & integrazioni", "Account manager dedicato", "SLA garantito"],
                  excluded: []
                },
              ].map((plan, i) => (
                <motion.div
                  key={plan.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className={`rounded-2xl p-8 flex flex-col relative ${plan.popular ? 'bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/30' : 'bg-background/50 backdrop-blur border border-border/60'}`}
                >
                  {plan.popular && (
                    <div className="absolute top-4 right-4 px-3 py-1 bg-orange-500 rounded-full text-[10px] font-bold uppercase tracking-wider text-white">
                      Più scelto
                    </div>
                  )}
                  <h3 className="text-lg font-bold mb-1">{plan.title}</h3>
                  <p className="text-muted-foreground text-sm mb-6">{plan.desc}</p>
                  <div className="mb-8">
                    <span className="text-5xl font-extrabold">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">/mese</span>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.items.map((item) => (
                      <li key={item} className="flex items-center gap-3 text-sm text-foreground">
                        <Check className="w-4 h-4 text-orange-500 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                    {plan.excluded.map((item) => (
                      <li key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
                        <X className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    asChild 
                    className={plan.popular 
                      ? "block text-center py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition-all hover:shadow-lg hover:shadow-orange-500/25" 
                      : "block text-center py-3.5 rounded-xl border border-border hover:border-border/20 text-foreground font-semibold text-sm transition-all hover:bg-muted/5"
                    }
                  >
                    <Link to={createPageUrl("Register")}>
                      {plan.popular ? "Scegli Plus" : "Scegli " + plan.title}
                    </Link>
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section id="testimonials" className="py-24 sm:py-32 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-orange-500/10 border border-orange-500/20 text-orange-500 mb-6">
                  <Heart className="w-3 h-3" /> Recensioni vere
                </span>
              </motion.div>
              <motion.h2 
                initial={{ opacity: 0, y: 20 }} 
                whileInView={{ opacity: 1, y: 0 }} 
                viewport={{ once: true }} 
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-4xl sm:text-5xl font-extrabold tracking-tight"
              >
                Cosa dicono i <span className="text-orange-500">nostri clienti</span>
              </motion.h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { 
                  name: "Marco", 
                  place: "Pizzeria Da Marco, Roma",
                  text: "Finalmente ho tolto il caos dal WhatsApp. I clienti sono felici, io sono sereno. Il menu digitale è bellissimo e i clienti lo adorano."
                },
                { 
                  name: "Giulia", 
                  place: "Sushi Zen, Milano",
                  text: "Ho provato Deliveroo, JustEat... troppe commissioni. Con OrdinaFacile.food guadagno il doppio sullo stesso ordine. Non torno indietro."
                },
                { 
                  name: "Antonio", 
                  place: "Burger House, Napoli",
                  text: "In 5 minuti avevo già il mio menu online. La dashboard mi dice quali piatti vendono di più. Una vera manna dal cielo."
                },
              ].map((review, i) => (
                <motion.div
                  key={review.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="rounded-2xl p-8 bg-gradient-to-br from-background/80 to-background/40 backdrop-blur border border-border/5 hover:border-orange-500/20 transition-all duration-400 hover:scale-[1.02]"
                >
                  <div className="flex gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-4 h-4 fill-orange-500 text-orange-500" />
                    ))}
                  </div>
                  <p className="text-foreground text-sm leading-relaxed mb-6">"{review.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 flex items-center justify-center">
                      <Store className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{review.name}</p>
                      <p className="text-xs text-muted-foreground">{review.place}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 sm:py-32 px-6">
          <div className="max-w-4xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative rounded-3xl overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-600 via-orange-700 to-orange-900"></div>
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }}></div>
              <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-white/10 blur-3xl"></div>
              <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-black/20 blur-3xl"></div>
              
              <div className="relative px-8 sm:px-16 py-16 sm:py-20 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full text-xs font-semibold text-white/80 uppercase tracking-wide mb-8 backdrop-blur-sm">
                  <Rocket className="w-3 h-3" /> Inizia oggi
                </div>
                <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-6 text-white leading-tight">
                  Pronto a dire addio<br />al caos degli ordini?
                </h2>
                <p className="text-white/70 text-lg max-w-xl mx-auto mb-10 font-light">
                  Crea il tuo menu digitale in 5 minuti. Gratis, senza carta di credito, senza impegno.
                </p>
                <Button asChild className="px-8 py-4 bg-white text-orange-700 font-bold rounded-xl text-sm hover:bg-white/90 transition-all hover:shadow-2xl hover:shadow-black/20 whitespace-nowrap">
                  <Link to={createPageUrl("Register")}>
                    Prova gratis →
                  </Link>
                </Button>
                <p className="text-white/40 text-xs mt-6">Niente spam. Cancella quando vuoi.</p>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/5 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div className="sm:col-span-2 lg:col-span-1">
              <Link to="/" className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center">
                  <Store className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold tracking-tight">Ordina<span className="text-orange-400">Facile</span></span>
              </Link>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
                Il sistema di ordinazione digitale più semplice d'Italia. Per ristoranti, pizzerie, sushi bar e molto altro.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">Prodotto</h4>
              <ul className="space-y-3">
                <li><button type="button" onClick={() => scrollToId("how")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Come funziona</button></li>
                <li><button type="button" onClick={() => scrollToId("plans")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Prezzi</button></li>
                <li><Link to={createPageUrl("Login")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Accedi</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">Supporto</h4>
              <ul className="space-y-3">
                <li><Link to={createPageUrl("Login")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contattaci</Link></li>
                <li><button type="button" onClick={() => scrollToId("testimonials")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Recensioni</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">Legale</h4>
              <ul className="space-y-3">
                <li><Link to={createPageUrl("Privacy")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link to={createPageUrl("Terms")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Termini di servizio</Link></li>
                <li><Link to={createPageUrl("Cookies")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Cookie Policy</Link></li>
                <li><Link to={createPageUrl("PrivacyClienti")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Clienti</Link></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-border/5">
            <p className="text-muted-foreground text-xs">© {new Date().getFullYear()} OrdinaFacile.food. Tutti i diritti riservati.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="w-9 h-9 rounded-lg border border-border/5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border/20 transition-all">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg border border-border/5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border/20 transition-all">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg border border-border/5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border/20 transition-all">
                <Linkedin className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg border border-border/5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border/20 transition-all">
                <Youtube className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
        .food-img-wrapper {
          position: relative;
          overflow: hidden;
          border-radius: 1rem;
        }
      `}</style>
    </div>
  );
}