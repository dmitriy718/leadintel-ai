import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Zap,
  Target,
  BarChart3,
  Shield,
  Globe,
  ChevronDown,
  Check,
  ExternalLink,
  MessageSquare,
  Github,
  Newspaper,
  Code,
  MapPin,
  Youtube,
  Twitter,
  Radio,
  Linkedin,
} from "lucide-react";
import AdSlot from "@/components/AdSlot";
import { usePageTitle } from "@/hooks/usePageTitle";
import LiveLeadFeed from "@/components/LiveLeadFeed";

/* ─── Typewriter hook ─── */
function useTypewriter(text: string, speed: number = 45, delay: number = 0) {
  const [display, setDisplay] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    let i = 0;
    const timer = setTimeout(() => {
      const iv = setInterval(() => {
        i++;
        setDisplay(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(iv);
          setDone(true);
        }
      }, speed);
      return () => clearInterval(iv);
    }, delay);
    return () => clearTimeout(timer);
  }, [text, speed, delay]);
  return { display, done };
}

/* ─── Stamp component ─── */
function ClassifiedStamp() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.5, rotate: -12 }}
      animate={{ opacity: 1, scale: 1, rotate: -12 }}
      transition={{ delay: 1.2, duration: 0.4, type: "spring" }}
      className="inline-block border-2 border-red-700 text-red-700 font-bold tracking-widest uppercase px-3 py-1 text-[10px] sm:text-xs"
      style={{ fontFamily: "monospace" }}
    >
      CLASSIFIED
    </motion.div>
  );
}

/* ─── Hero ─── */
function Hero() {
  const { display: line1, done: d1 } = useTypewriter("Find leads before", 50, 300);
  const { display: line2, done: d2 } = useTypewriter(" they go cold.", 50, d1 ? 200 : 99999);

  return (
    <section className="relative min-h-screen flex items-center pt-20 border-b border-stone-200">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 w-full py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="mb-6 flex items-center gap-3">
              <span className="text-[10px] font-bold tracking-widest uppercase text-stone-400 border border-stone-300 px-2 py-0.5">
                v2.0
              </span>
              <ClassifiedStamp />
            </div>

            <h1
              className="text-5xl sm:text-6xl lg:text-7xl font-serif font-medium text-stone-900 leading-[1.05] mb-8 min-h-[1.2em]"
              style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
            >
              {line1}
              {d1 && <br />}
              {line2}
              {!d2 && <span className="animate-pulse">|</span>}
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="text-lg text-stone-500 max-w-md mb-10 leading-relaxed"
            >
              AI-powered lead intelligence across Reddit, Hacker News, Stack Overflow, GitHub, and more.
              <span className="text-stone-900 font-medium"> 150 free leads per month.</span> No credit card.
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.7 }}
              className="flex flex-col sm:flex-row items-start gap-4"
            >
              <Link
                to="/register"
                className="group inline-flex items-center gap-2 px-7 py-3.5 bg-stone-900 text-stone-50 font-medium hover:bg-stone-800 transition-colors"
              >
                Start Free
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-7 py-3.5 border border-stone-300 text-stone-700 font-medium hover:border-stone-900 hover:text-stone-900 transition-colors"
              >
                Sign In
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
              className="mt-10 flex items-center gap-6 text-xs text-stone-400"
            >
              <span className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-stone-700" /> 150 free leads/mo
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-stone-700" /> No credit card
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-stone-700" /> Cancel anytime
              </span>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="hidden lg:block"
          >
            <LiveLeadFeed />
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <ChevronDown className="h-5 w-5 text-stone-400 animate-bounce" />
      </motion.div>
    </section>
  );
}

/* ─── Animated counter ─── */
function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          let start = 0;
          const duration = 2000;
          const startTime = performance.now();
          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            start = Math.floor(easeOut * value);
            setCount(start);
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, hasAnimated]);

  return (
    <span ref={ref} className="tabular-nums">
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

/* ─── Stats ─── */
function Stats() {
  const stats = [
    { value: 9, suffix: "", label: "Channels" },
    { value: 2500000, suffix: "+", label: "Leads Found" },
    { value: 94, suffix: "%", label: "Contact Rate" },
    { value: 12, suffix: "s", label: "Avg. Scrape" },
  ];

  return (
    <section className="py-20 border-b border-stone-200">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div
                className="text-3xl sm:text-4xl lg:text-5xl font-serif font-medium text-stone-900 mb-1"
                style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
              >
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-xs text-stone-400 uppercase tracking-widest">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Channel row ─── */
const CHANNELS = [
  { name: "Reddit", icon: MessageSquare },
  { name: "Hacker News", icon: Newspaper },
  { name: "GitHub", icon: Github },
  { name: "Stack Overflow", icon: Code },
  { name: "Twitter / X", icon: Twitter },
  { name: "YouTube", icon: Youtube },
  { name: "Google Maps", icon: MapPin },
  { name: "Quora", icon: Radio },
  { name: "LinkedIn", icon: Linkedin },
];

function Channels() {
  return (
    <section className="py-16 border-b border-stone-200">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
        <p className="text-[10px] text-stone-400 uppercase tracking-widest mb-8 text-center">Monitored Channels</p>
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-4">
          {CHANNELS.map((ch) => {
            const Icon = ch.icon;
            return (
              <div key={ch.name} className="flex items-center gap-2 text-stone-500">
                <Icon className="h-4 w-4" />
                <span className="text-sm">{ch.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── Features (bento, no gradients) ─── */
function Features() {
  const features = [
    {
      icon: Globe,
      title: "9 Channels",
      desc: "Reddit, HN, StackOverflow, GitHub, Twitter, Quora, YouTube, LinkedIn, Google Maps",
      span: "lg:col-span-2",
    },
    {
      icon: Zap,
      title: "AI Scoring",
      desc: "Semantic similarity, keyword density, and engagement metrics scored 0-100",
      span: "",
    },
    {
      icon: Target,
      title: "Contact Extraction",
      desc: "Auto-extract emails, websites, phone numbers, and locations",
      span: "",
    },
    {
      icon: BarChart3,
      title: "Real-Time Tracking",
      desc: "Watch scraping jobs run live. See leads appear as they're discovered",
      span: "",
    },
    {
      icon: Shield,
      title: "Deduplication",
      desc: "Intelligent fingerprinting prevents duplicates across campaigns",
      span: "",
    },
    {
      icon: ExternalLink,
      title: "REST API",
      desc: "Full programmatic access via API key. Integrate with your existing stack",
      span: "lg:col-span-2",
    },
  ];

  return (
    <section className="py-32">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <span className="text-[10px] text-stone-400 uppercase tracking-widest mb-4 block">Capabilities</span>
          <h2
            className="text-4xl sm:text-5xl font-serif font-medium text-stone-900"
            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
          >
            Everything you need
            <br />
            <span className="text-stone-400">to find customers.</span>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-stone-200">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className={`bg-stone-50 p-8 group hover:bg-white transition-colors ${feature.span}`}
              >
                <Icon className="h-5 w-5 text-stone-400 mb-5 group-hover:text-stone-900 transition-colors" />
                <h3 className="text-base font-semibold text-stone-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{feature.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── How It Works ─── */
function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Configure",
      desc: "Set keywords, choose channels, define your ideal customer profile.",
    },
    {
      num: "02",
      title: "Scrape",
      desc: "AI monitors 9 channels in real-time, scoring every lead 0-100.",
    },
    {
      num: "03",
      title: "Export",
      desc: "Filter by quality, review contact info, export to CSV or your CRM.",
    },
  ];

  return (
    <section className="py-32 border-y border-stone-200 bg-stone-100">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="mb-16">
          <span className="text-[10px] text-stone-400 uppercase tracking-widest mb-4 block">Process</span>
          <h2
            className="text-4xl sm:text-5xl font-serif font-medium text-stone-900"
            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
          >
            From intent to inbox
          </h2>
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="relative"
            >
              <span
                className="text-6xl font-serif text-stone-200 absolute -top-2 -left-2 select-none"
                style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
              >
                {step.num}
              </span>
              <div className="relative pt-10">
                <h3 className="text-lg font-semibold text-stone-900 mb-2">{step.title}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Pricing ─── */
function Pricing() {
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "/mo",
      desc: "For individuals testing the waters",
      features: ["150 leads per month", "All 9 channels", "Basic AI scoring", "CSV export", "Email support"],
      cta: "Get Started",
      href: "/register",
      popular: false,
    },
    {
      name: "Starter",
      price: "$29",
      period: "/mo",
      desc: "For freelancers and small teams",
      features: ["50 scrapes/day", "All 9 channels", "Advanced scoring", "CSV export", "Priority support", "$1 per extra scrape"],
      cta: "Start Trial",
      href: "/register",
      popular: true,
    },
    {
      name: "Pro",
      price: "$79",
      period: "/mo",
      desc: "For agencies and growth teams",
      features: ["200 scrapes/day", "All 9 channels", "Advanced scoring", "CSV export", "Priority support", "$0.50 per extra", "API access"],
      cta: "Start Trial",
      href: "/register",
      popular: false,
    },
    {
      name: "Enterprise",
      price: "$199",
      period: "/mo",
      desc: "For teams that need unlimited power",
      features: ["Unlimited scrapes", "All 9 channels", "Advanced scoring", "CSV export", "Dedicated support", "Custom integrations", "SLA guarantee"],
      cta: "Contact Sales",
      href: "/register",
      popular: false,
    },
  ];

  return (
    <section className="py-32">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <span className="text-[10px] text-stone-400 uppercase tracking-widest mb-4 block">Pricing</span>
          <h2
            className="text-4xl sm:text-5xl font-serif font-medium text-stone-900 mb-4"
            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
          >
            Simple, transparent pricing.
          </h2>
          <p className="text-stone-500">Start free. Upgrade when you need more. No hidden fees.</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-stone-200">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`bg-stone-50 p-8 ${plan.popular ? "bg-white" : ""} relative`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-stone-900" />
              )}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wider mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span
                    className="text-4xl font-serif text-stone-900"
                    style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                  >
                    {plan.price}
                  </span>
                  <span className="text-stone-400 text-sm">{plan.period}</span>
                </div>
                <p className="text-sm text-stone-500 mt-2">{plan.desc}</p>
              </div>
              <ul className="space-y-2.5 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-stone-600">
                    <span className="mt-1.5 w-1 h-1 bg-stone-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to={plan.href}
                className={`block w-full text-center py-2.5 text-sm font-medium transition-colors border ${
                  plan.popular
                    ? "bg-stone-900 text-stone-50 border-stone-900 hover:bg-stone-800"
                    : "bg-white text-stone-900 border-stone-300 hover:border-stone-900"
                }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-stone-400">
          Annual billing saves 17%. Credits top-up available — they never expire.
        </p>
      </div>
    </section>
  );
}

/* ─── Testimonials ─── */
function Testimonials() {
  const items = [
    {
      name: "Sarah Chen",
      role: "Growth Lead, Vercel",
      content:
        "We found 200+ qualified leads in our first week. The AI scoring is scarily accurate — we closed 3 deals from leads that scored 90+.",
    },
    {
      name: "Marcus Johnson",
      role: "Founder, ApolloStack",
      content:
        "I was skeptical about another lead gen tool, but LeadIntel actually delivers. The Reddit and HN scrapers alone paid for our Pro plan in 48 hours.",
    },
    {
      name: "Elena Rodriguez",
      role: "VP Sales, DataFlow",
      content:
        "Our SDRs used to spend 6 hours a week on manual prospecting. Now it's 30 minutes. The quality is actually better because the AI catches intent signals we'd miss.",
    },
  ];

  return (
    <section className="py-32 border-y border-stone-200">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="mb-16">
          <span className="text-[10px] text-stone-400 uppercase tracking-widest mb-4 block">Testimonials</span>
          <h2
            className="text-4xl sm:text-5xl font-serif font-medium text-stone-900"
            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
          >
            Loved by growth teams.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {items.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="border border-stone-200 p-8 hover:border-stone-400 transition-colors"
            >
              <p className="text-stone-700 leading-relaxed mb-6 text-sm">"{t.content}"</p>
              <div>
                <p className="text-sm font-semibold text-stone-900">{t.name}</p>
                <p className="text-xs text-stone-400">{t.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA ─── */
function CTA() {
  return (
    <section className="py-32">
      <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2
            className="text-4xl sm:text-5xl font-serif font-medium text-stone-900 mb-6"
            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
          >
            Stop guessing.
            <br />
            Start scraping.
          </h2>
          <p className="text-stone-500 mb-10 max-w-md mx-auto">
            Join thousands of sales teams, agencies, and founders who use LeadIntel AI to fill their pipelines.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-stone-900 text-stone-50 font-medium hover:bg-stone-800 transition-colors"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-4 text-xs text-stone-400">No credit card required. 150 free leads per month.</p>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
function Footer() {
  return (
    <footer className="border-t border-stone-200 py-16">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex justify-center mb-10">
          <AdSlot slot="landing-footer" format="horizontal" className="hidden md:block" />
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-stone-900 flex items-center justify-center">
              <Zap className="h-4 w-4 text-stone-50" />
            </div>
            <span className="font-semibold text-stone-900 tracking-tight text-sm">LeadIntel AI</span>
          </div>
          <div className="flex flex-wrap gap-8 text-sm text-stone-500">
            <Link to="/login" className="hover:text-stone-900 transition-colors">
              Sign In
            </Link>
            <Link to="/register" className="hover:text-stone-900 transition-colors">
              Get Started
            </Link>
            <span className="hover:text-stone-900 transition-colors cursor-pointer">Privacy</span>
            <span className="hover:text-stone-900 transition-colors cursor-pointer">Terms</span>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-stone-200 text-[10px] text-stone-400 uppercase tracking-widest">
          © {new Date().getFullYear()} LeadIntel AI
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ─── */
export default function Landing() {
  usePageTitle("AI-Powered Lead Intelligence");
  return (
    <div className="bg-stone-50 text-stone-900 min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-stone-200 bg-stone-50/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-6 w-6 bg-stone-900 flex items-center justify-center">
              <Zap className="h-3 w-3 text-stone-50" />
            </div>
            <span className="font-semibold text-stone-900 text-sm tracking-tight">LeadIntel AI</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm text-stone-500 hover:text-stone-900 transition-colors">
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-sm px-4 py-1.5 bg-stone-900 text-stone-50 font-medium hover:bg-stone-800 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <Hero />
        <Stats />
        <Channels />
        <Features />
        <HowItWorks />
        <Pricing />
        <Testimonials />
        <CTA />
      </main>

      <Footer />
    </div>
  );
}
