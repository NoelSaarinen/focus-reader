import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Clock, Pause, Play, RotateCcw, ScrollText, Timer, Type } from "lucide-react";
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lumen — Read without losing your place" },
      {
        name: "description",
        content: "A calm, guided reader for staying focused through long texts.",
      },
      { property: "og:title", content: "Lumen — Focused reading" },
      {
        property: "og:description",
        content: "Paste any long text and read it with gentle sentence-by-sentence guidance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const SAMPLE_TEXT = `Attention is a muscle. The longer we hold a single thread, the deeper the thought it can reach. Most reading tools fail at the seams — where one line ends and the next begins. Lumen keeps the current sentence bright and lets the rest recede into a soft frost, so the eye never has to hunt for its place again. Reading slowly is not about covering less ground. It is about arriving fully at each idea before moving on. The page should feel quiet, the controls should disappear, and your place should always be waiting.`;

const ABBREVIATIONS = /(?:^|\s)(?:mr|mrs|ms|dr|prof|sr|jr|st|vs|etc|e\.g|i\.e|no|fig|approx|inc|ltd|co)\.$/i;

/** Cleans PDF-style line breaks: rejoins hyphenated words and soft-wrapped lines. */
export function cleanText(raw: string) {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[\u00AD]/g, "")
    .replace(/(\p{L})-\n\s*(\p{Ll})/gu, "$1$2")
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, " ").replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}

function splitSentences(text: string) {
  const sentences: string[] = [];
  for (const paragraph of cleanText(text).split(/\n\n/)) {
    let buffer = "";
    const parts = paragraph.match(/[^.!?]+(?:[.!?]+[”’"')\]]*|$)/g) ?? [paragraph];
    parts.forEach((part, i) => {
      buffer += part;
      const next = parts[i + 1] ?? "";
      const trimmed = buffer.trim();
      const isAbbrev = ABBREVIATIONS.test(trimmed) || /\b\p{L}\.$/u.test(trimmed);
      const isDecimal = /\d\.$/.test(trimmed) && /^\d/.test(next);
      const nextLower = /^\s*\p{Ll}/u.test(next);
      if (next && (isAbbrev || isDecimal || nextLower)) return;
      if (trimmed) sentences.push(trimmed);
      buffer = "";
    });
  }
  return sentences;
}

const countWords = (value: string) => value.split(/\s+/).filter(Boolean).length;
type Theme = "light" | "dark" | "sepia" | "contrast";
type FontChoice = "serif" | "modern" | "access";
const SIZE_SCALE = { S: 0.85, M: 1, L: 1.2 } as const;

function Index() {
  const [text, setText] = useState("");
  const [reading, setReading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState<"highlight" | "focus">("highlight");
  const [pace, setPace] = useState<"auto" | "manual">("auto");
  const [wpm, setWpm] = useState(240);
  const [index, setIndex] = useState(0);
  const [theme, setTheme] = useState<Theme>("light");
  const [size, setSize] = useState<keyof typeof SIZE_SCALE>("M");
  const [font, setFont] = useState<FontChoice>("serif");
  const sentenceRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const readerRef = useRef<HTMLDivElement | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const sentences = useMemo(() => splitSentences(text), [text]);
  const current = sentences[index] ?? "";
  const progress = sentences.length ? ((index + 1) / sentences.length) * 100 : 0;
  const wordCount = useMemo(() => countWords(text), [text]);
  const remainingWords = useMemo(() => sentences.slice(index).reduce((sum, s) => sum + countWords(s), 0), [sentences, index]);
  const remainingMin = remainingWords / wpm;
  const remainingLabel = remainingWords === 0 ? "Done" : remainingMin < 1 ? "<1 min" : `~${Math.round(remainingMin)} min`;

  const advance = useCallback(() => {
    setIndex((position) => {
      if (position >= sentences.length - 1) {
        setPlaying(false);
        return position;
      }
      return position + 1;
    });
  }, [sentences.length]);

  const retreat = useCallback(() => setIndex((position) => Math.max(0, position - 1)), []);

  useEffect(() => {
    if (!playing || !current || pace !== "auto") return;
    const words = current.split(/\s+/).filter(Boolean).length;
    const delay = Math.max(900, (words / wpm) * 60_000);
    const timer = window.setTimeout(advance, delay);
    return () => window.clearTimeout(timer);
  }, [advance, current, pace, playing, wpm]);

  useEffect(() => {
    if (mode === "highlight" && pace === "auto") {
      sentenceRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [index, mode, pace]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark" || theme === "contrast");
    root.classList.toggle("sepia", theme === "sepia");
    root.classList.toggle("contrast", theme === "contrast");
  }, [theme]);

  useEffect(() => () => {
    if (scrollFrameRef.current !== null) window.cancelAnimationFrame(scrollFrameRef.current);
  }, []);

  useEffect(() => {
    if (!reading) return;
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [role=slider], [role=dialog]")) return;
      const forward = ["Space", "ArrowDown", "ArrowRight"].includes(event.code);
      const back = ["ArrowUp", "ArrowLeft"].includes(event.code);
      if (!forward && !back) return;
      event.preventDefault();
      if (pace === "manual") {
        const nextIndex = Math.min(sentences.length - 1, Math.max(0, index + (forward ? 1 : -1)));
        setIndex(nextIndex);
        sentenceRefs.current[nextIndex]?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (forward) advance();
      else retreat();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [advance, index, pace, reading, retreat, sentences.length]);

  const startReading = () => {
    if (!text.trim()) return;
    setIndex(0);
    setReading(true);
    setPlaying(pace === "auto");
  };

  const setReadingPace = (nextPace: "auto" | "manual") => {
    setPace(nextPace);
    setPlaying(false);
    if (nextPace === "manual") setMode("highlight");
  };

  const followScroll = () => {
    if (pace !== "manual" || scrollFrameRef.current !== null) return;
    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      const reader = readerRef.current;
      if (!reader) return;
      const hasInnerScroll = reader.scrollHeight > reader.clientHeight + 2;
      if (hasInnerScroll) {
        if (reader.scrollTop <= 2) {
          setIndex(0);
          return;
        }
        if (reader.scrollTop + reader.clientHeight >= reader.scrollHeight - 2) {
          setIndex(Math.max(0, sentences.length - 1));
          return;
        }
      }
      const readerRect = reader.getBoundingClientRect();
      const center = hasInnerScroll ? readerRect.top + readerRect.height / 2 : window.innerHeight / 2;
      let nearestIndex = index;
      let nearestDistance = Number.POSITIVE_INFINITY;

      sentenceRefs.current.forEach((sentence, sentenceIndex) => {
        if (!sentence) return;
        const rect = sentence.getBoundingClientRect();
        const sentenceCenter = rect.top + rect.height / 2;
        const distance = Math.abs(sentenceCenter - center);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = sentenceIndex;
        }
      });

      setIndex(nearestIndex);
    });
  };

  useEffect(() => {
    if (!reading || pace !== "manual") return;
    window.addEventListener("scroll", followScroll, { passive: true });
    followScroll();
    return () => window.removeEventListener("scroll", followScroll);
  }, [pace, reading]);

  return (
    <main
      className={cn("reader-shell min-h-screen", (theme === "dark" || theme === "contrast") && "dark", theme === "sepia" && "sepia", theme === "contrast" && "contrast", font === "modern" && "font-modern", font === "access" && "font-access")}
      style={{ "--reader-scale": SIZE_SCALE[size] } as CSSProperties}
    >
      <div className="reader-atmosphere" aria-hidden="true" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1048px] flex-col px-4 py-5 sm:px-6 sm:py-8">
        <header className="animate-fade-in flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-primary font-display text-xl font-semibold text-primary-foreground shadow-lg shadow-primary/15">l</div>
            <div>
              <div className="font-display text-base font-semibold leading-none">Lumen</div>
              <div className="mt-1 hidden text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground sm:block">Read without losing your place</div>
            </div>
          </div>
          <ReadingSettings theme={theme} setTheme={setTheme} size={size} setSize={setSize} font={font} setFont={setFont} />
        </header>

        {!reading ? (
          <section className="animate-fade-in mx-auto flex w-full max-w-[760px] flex-1 flex-col justify-center py-10 sm:py-14">
            <div className="mb-7 text-center">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Your quiet reading space</p>
              <h1 className="mt-3 font-display text-4xl font-medium leading-tight sm:text-5xl">Bring your attention<br className="hidden sm:block" /> back to the page.</h1>
              <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-muted-foreground">Paste a passage below. Lumen will guide you through it, one sentence at a time.</p>
            </div>
            <div className="glass-panel p-3 sm:p-4">
              <Textarea value={text} onChange={(event) => setText(event.target.value)} onPaste={(event) => { const pasted = event.clipboardData.getData("text"); if (!pasted) return; event.preventDefault(); const el = event.currentTarget; const cleaned = cleanText(pasted); setText(el.value.slice(0, el.selectionStart) + cleaned + el.value.slice(el.selectionEnd)); }} placeholder="Paste an article, essay, chapter, or any long text…" className="min-h-[290px] resize-none border-0 bg-surface/65 p-5 font-display text-lg leading-8 shadow-none focus-visible:ring-1 sm:min-h-[340px]" autoFocus />
              <div className="flex flex-col gap-3 px-1 pb-1 pt-4 sm:flex-row sm:items-center">
                <p className="text-xs text-muted-foreground">{wordCount ? `${wordCount.toLocaleString()} words · about ${Math.max(1, Math.ceil(wordCount / wpm))} min` : "Your text stays in this browser tab"}</p>
                <div className="flex flex-1 justify-end gap-2">
                  <Button variant="outline" onClick={() => setText(SAMPLE_TEXT)}>Try sample</Button>
                  <Button onClick={startReading} disabled={!text.trim()} className="px-5"><Play /> Start reading</Button>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <div className="flex flex-1 flex-col gap-5 pb-28 pt-6 sm:pt-10 lg:grid lg:grid-cols-[minmax(0,1fr)_290px] lg:items-start lg:pb-8">
            <section className="glass-panel animate-fade-in flex min-h-[480px] flex-col p-6 sm:min-h-[570px] sm:p-9" onClick={pace === "auto" ? advance : undefined}>
              <div className="mb-7 flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                 <span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-sage" /> Reading now · {pace === "manual" ? "Scroll at your pace" : mode === "highlight" ? "Guided highlight" : "Focus"}</span>
                <span className="flex items-center gap-1.5 normal-case tracking-normal text-xs"><Clock className="size-3.5" /> Est. time: {remainingLabel}</span>
              </div>
              {mode === "highlight" ? (
                 pace === "manual" ? (
                   <div ref={readerRef} onScroll={followScroll} className="magnetic-scroll reader-copy my-auto flex h-[clamp(280px,55vh,430px)] flex-col overflow-y-auto px-2 reader-text font-display leading-[1.65] [--reader-base:clamp(1.25rem,2vw,1.55rem)] sm:px-5">
                     <div aria-hidden="true" className="magnetic-spacer" />
                     {sentences.map((sentence, sentenceIndex) => (
                       <div
                         key={`${sentenceIndex}-${sentence.slice(0, 12)}`}
                         ref={(node) => { sentenceRefs.current[sentenceIndex] = node; }}
                         className={cn(
                           "magnetic-sentence sentence-transition flex min-h-20 shrink-0 items-center justify-center px-2 py-5 text-center sm:px-6",
                           sentenceIndex === index ? "bg-highlight text-foreground" : "text-reading-dim opacity-20 blur-[1px]",
                         )}
                       >
                         {sentence}
                       </div>
                     ))}
                     <div aria-hidden="true" className="magnetic-spacer" />
                   </div>
                 ) : (
                   <div ref={readerRef} className="reader-copy my-auto max-h-[430px] overflow-y-auto pr-2 reader-text font-display leading-[1.75] [--reader-base:clamp(1.25rem,2vw,1.55rem)]">
                     {sentences.map((sentence, sentenceIndex) => (
                       <span key={`${sentenceIndex}-${sentence.slice(0, 12)}`} ref={(node) => { sentenceRefs.current[sentenceIndex] = node; }} className={cn("sentence-transition mr-[0.32em] rounded-lg", sentenceIndex === index ? "bg-highlight px-1.5 py-1 text-foreground" : "text-reading-dim")}>
                         {sentence}
                       </span>
                     ))}
                   </div>
                 )
              ) : (
                <div key={index} className="animate-fade-in m-auto flex max-w-[620px] flex-col items-center py-12 text-center">
                  <span className="mb-6 font-sans text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{index + 1} of {sentences.length}</span>
                  <p className="reader-text font-display leading-[1.3] [--reader-base:clamp(1.8rem,4vw,3.25rem)] text-foreground">{current}</p>
                </div>
              )}
              <div className="mt-7 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-track"><div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${progress}%` }} /></div>
                <span className="text-[11px] font-medium tabular-nums text-muted-foreground">Sentence {index + 1} of {sentences.length} • {Math.round(progress)}%</span>
              </div>
            </section>

            <aside className="glass-panel animate-fade-in hidden flex-col gap-7 p-5 lg:flex">
               <PaceControl pace={pace} setPace={setReadingPace} />
               {pace === "auto" && <ModeControl mode={mode} setMode={setMode} />}
               {pace === "auto" && <SpeedControl wpm={wpm} setWpm={setWpm} />}
              <div className="rounded-xl border border-glass-border bg-surface/55 p-4">
                <div className="flex items-center justify-between text-xs font-medium"><span className="flex items-center gap-2"><span className="size-2 rounded-full bg-sage" /> Current sentence</span><span className="text-[10px] text-muted-foreground">{index + 1} / {sentences.length}</span></div>
                <p className="mt-4 line-clamp-4 text-center font-display text-base leading-snug">{current}</p>
              </div>
            </aside>
          </div>
        )}
      </div>

      {reading && (
        <div className="fixed inset-x-0 bottom-0 z-20 p-3 sm:p-5">
          <div className="glass-panel mx-auto flex max-w-[1000px] items-center gap-2 p-2.5 sm:gap-4 sm:px-4 sm:py-3">
             {pace === "auto" && <Button size="icon" onClick={() => setPlaying((value) => !value)} aria-label={playing ? "Pause reading" : "Play reading"} className="size-11 shrink-0 rounded-full">
               {playing ? <Pause /> : <Play />}
             </Button>}
             {pace === "auto" && <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex"><kbd>Space</kbd>/<kbd>↓</kbd> next <kbd>↑</kbd> back</div>}
             <Button variant="outline" size="sm" onClick={() => setReadingPace(pace === "auto" ? "manual" : "auto")} className="shrink-0 lg:hidden" aria-label={pace === "auto" ? "Switch to self-paced scrolling" : "Switch to automatic reading"}>
               {pace === "auto" ? <ScrollText /> : <Timer />}<span className="hidden sm:inline">{pace === "auto" ? "Scroll" : "Auto"}</span>
             </Button>
             {pace === "auto" && <div className="mx-1 flex min-w-0 flex-1 items-center gap-3 lg:hidden">
              <span className="hidden text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:block">{wpm} WPM</span>
              <Slider value={[wpm]} min={100} max={600} step={10} onValueChange={(value) => setWpm(value[0] ?? 240)} aria-label="Reading speed" />
             </div>}
             <div className={cn("hidden lg:block lg:flex-1", pace === "manual" && "block flex-1")} />
             {pace === "auto" && <div className="flex items-center gap-2 lg:hidden">
              <span className="hidden text-xs text-muted-foreground sm:inline">Focus</span>
              <Switch checked={mode === "focus"} onCheckedChange={(checked) => setMode(checked ? "focus" : "highlight")} aria-label="Toggle focus mode" />
             </div>}
            <Button variant="ghost" size="icon" onClick={() => setIndex(0)} aria-label="Restart" title="Restart"><RotateCcw /></Button>
            <Button variant="outline" onClick={() => { setPlaying(false); setReading(false); }} className="shrink-0"><ArrowLeft /><span className="hidden sm:inline">Back to edit</span></Button>
          </div>
        </div>
      )}
    </main>
  );
}

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<[T, string]>; onChange: (v: T) => void }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-2 grid gap-1 rounded-xl border border-glass-border bg-surface/55 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map(([v, text]) => <Button key={v} variant={value === v ? "default" : "ghost"} size="sm" onClick={() => onChange(v)} className="h-8 rounded-lg px-1 text-xs shadow-none">{text}</Button>)}
      </div>
    </div>
  );
}

function ReadingSettings(props: { theme: Theme; setTheme: (t: Theme) => void; size: keyof typeof SIZE_SCALE; setSize: (s: keyof typeof SIZE_SCALE) => void; font: FontChoice; setFont: (f: FontChoice) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Reading settings" title="Reading settings" className="rounded-full border border-glass-border bg-glass/60"><Type /></Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="glass-panel w-72 space-y-5 p-4 text-foreground">
        <Segmented label="Text size" value={props.size} onChange={props.setSize} options={[["S", "Small"], ["M", "Medium"], ["L", "Large"]]} />
        <Segmented label="Theme" value={props.theme} onChange={props.setTheme} options={[["light", "Light"], ["dark", "Dark"], ["sepia", "Sepia"], ["contrast", "Black"]]} />
        <Segmented label="Font" value={props.font} onChange={props.setFont} options={[["serif", "Serif"], ["modern", "Modern"], ["access", "Readable"]]} />
        <p className="text-[11px] leading-4 text-muted-foreground">"Readable" uses Atkinson Hyperlegible, designed for low-vision and dyslexic readers.</p>
      </PopoverContent>
    </Popover>
  );
}

function PaceControl({ pace, setPace }: { pace: "auto" | "manual"; setPace: (pace: "auto" | "manual") => void }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Reading pace</div>
      <div className="mt-2 grid grid-cols-2 gap-1 rounded-xl border border-glass-border bg-surface/55 p-1">
        <Button variant={pace === "auto" ? "default" : "ghost"} size="sm" onClick={() => setPace("auto")} className="rounded-lg shadow-none"><Timer /> Auto</Button>
        <Button variant={pace === "manual" ? "default" : "ghost"} size="sm" onClick={() => setPace("manual")} className="rounded-lg shadow-none"><ScrollText /> Scroll</Button>
      </div>
    </div>
  );
}

function ModeControl({ mode, setMode }: { mode: "highlight" | "focus"; setMode: (mode: "highlight" | "focus") => void }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Reading mode</div>
      <div className="mt-2 grid grid-cols-2 gap-1 rounded-xl border border-glass-border bg-surface/55 p-1">
        {(["highlight", "focus"] as const).map((value) => <Button key={value} variant={mode === value ? "default" : "ghost"} size="sm" onClick={() => setMode(value)} className="rounded-lg capitalize shadow-none">{value}</Button>)}
      </div>
    </div>
  );
}

function SpeedControl({ wpm, setWpm }: { wpm: number; setWpm: (wpm: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground"><span>Speed</span><span className="text-foreground">{wpm} WPM</span></div>
      <Slider className="mt-4" value={[wpm]} min={100} max={600} step={10} onValueChange={(value) => setWpm(value[0] ?? 240)} aria-label="Reading speed" />
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground"><span>Slow</span><span>Fast</span></div>
    </div>
  );
}