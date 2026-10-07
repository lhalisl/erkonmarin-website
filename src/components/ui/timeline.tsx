// Built using Hyperiux Vault: https://vault.hyperiux.com
// Adapted for Erkon Marin: entries arrive as props instead of being hard-coded,
// the track is sized from its content, and every reveal is placed on the
// scroll timeline from the entry's real position on the track, so the layout
// holds for any number of entries and any viewport.
"use client";

import {
  type CSSProperties,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { cn, serifMissing } from "@/lib/utils";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

function useGSAP(
  callback: () => void | (() => void),
  options?: {
    dependencies?: unknown[];
    scope?: { current: Element | null } | Element | null;
  }
) {
  const deps = options?.dependencies ?? [];
  const scope = options?.scope;
  const ctxRef = useRef<gsap.Context | null>(null);
  const cleanupRef = useRef<(() => void) | undefined>(undefined);

  useLayoutEffect(() => {
    const el =
      scope && typeof scope === "object" && "current" in scope
        ? scope.current
        : (scope as Element | null);
    ctxRef.current = gsap.context(() => {}, el ?? undefined);
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = undefined;
      ctxRef.current?.revert();
      ctxRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    if (!ctxRef.current) return;
    cleanupRef.current?.();
    const ret = ctxRef.current.add(callback);
    cleanupRef.current = typeof ret === "function" ? ret : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export type TimelineItem = {
  id: string;
  title: string;
  subtitle?: string;
  /** Language of the subtitle when it differs from the page (e.g. "en"). */
  subtitleLang?: string;
  content: string;
  href?: string;
};

export type TimelineProps = {
  items: TimelineItem[];
  id?: string;
  title?: string;
  /** Second half of the title, set in the serif italic. */
  titleEmphasis?: string;
  periodLabel?: string;
  textColor?: string;
  mutedTextColor?: string;
  activeColor?: string;
  backgroundColor?: string;
  imageUrl?: string;
  imageSrcSet?: string;
  imageSizes?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageAlt?: string;
  linkLabel?: string;
  cta?: { label: string; href: string; note?: string };
  /** Reveal animation length. Scrubbed, so it scales scroll distance, not time. */
  duration?: number;
  /** Fallback reveal length when `duration` is omitted. */
  scrollDuration?: number;
  className?: string;
};

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const DESKTOP_QUERY = "(min-width: 900px)";
// Below this height (landscape phones) the section is a plain horizontal scroller, not pinned
const PIN_QUERY = "(min-height: 481px)";

function subscribeToReducedMotion(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const mediaQueryList = window.matchMedia(REDUCED_MOTION_QUERY);
  mediaQueryList.addEventListener("change", callback);
  return () => mediaQueryList.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.(REDUCED_MOTION_QUERY)?.matches ?? false;
}

function getServerReducedMotionSnapshot() {
  return false;
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getServerReducedMotionSnapshot
  );
}

// Layout tokens. Widths are in vw so the section height (which sets the scroll
// distance) can be worked out in CSS before any script runs.
const layoutVars = [
  "[--tl-pad:6vw] [--tl-gap:6vw] [--tl-img-w:78vw] [--tl-intro-w:74vw] [--tl-half:42vw] [--tl-outro-w:80vw]",
  "[--tl-item-px:5vw] [--tl-k:1] [--tl-dot:10px] [--tl-dock:84px]",
  "[--tl-track-h:min(calc(100svh_-_var(--header-h,84px)_-_var(--tl-dock)_-_20px),150vw,720px)]",
  "min-[761px]:[--tl-dock:0px]",
  // unpinned scroller on landscape phones: a smaller photo and title column
  "[@media(max-height:480px)]:[--tl-img-w:46vw] [@media(max-height:480px)]:[--tl-intro-w:46vw]",
  "min-[900px]:[--tl-pad:5vw] min-[900px]:[--tl-gap:4vw] min-[900px]:[--tl-img-w:27vw] min-[900px]:[--tl-intro-w:21vw]",
  "min-[900px]:[--tl-half:20vw] min-[1200px]:[--tl-half:15.5vw] min-[900px]:[--tl-outro-w:34vw] min-[900px]:[--tl-item-px:2.2vw] min-[900px]:[--tl-k:1.35]",
  "min-[900px]:[--tl-dot:clamp(10px,0.75vw,14px)]",
  "min-[900px]:[--tl-track-h:min(calc(100svh_-_var(--header-h,84px)_-_88px),46vw)]",
].join(" ");

export default function Timeline({
  items,
  id = "journey",
  title = "Product",
  titleEmphasis,
  periodLabel,
  textColor = "var(--color-foreground, #000000)",
  mutedTextColor = "var(--color-muted-foreground, #3f3f46)",
  activeColor = "#ff5f00",
  backgroundColor = "var(--color-background, #ffffff)",
  imageUrl = "https://cdn.21st.dev/assets/mirror/b0/b0c41784074f76ac5fb6b447da87780c901135841317a096241371f24bc13ddd.jpg",
  imageSrcSet,
  imageSizes,
  imageWidth,
  imageHeight,
  imageAlt = "",
  linkLabel = "Read more",
  cta,
  duration,
  scrollDuration = 1.2,
  className,
}: TimelineProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const axisRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const animationDuration = duration ?? scrollDuration;
  const normalizedDuration = Math.max(0.2, animationDuration);
  const count = items.length;

  const sectionStyle = {
    color: textColor,
    backgroundColor,
    "--tl-active": activeColor,
    "--tl-muted": mutedTextColor,
    "--tl-track-w": `calc(2 * var(--tl-pad) + var(--tl-img-w) + var(--tl-gap) + var(--tl-intro-w) + ${count + 1} * var(--tl-half) + var(--tl-outro-w))`,
  } as CSSProperties;
  const gridStyle: CSSProperties = {
    gridTemplateColumns: `var(--tl-intro-w) repeat(${count + 1}, var(--tl-half)) var(--tl-outro-w)`,
  };
  const axisStyle: CSSProperties = {
    width: `calc(var(--tl-intro-w) + ${count + 1} * var(--tl-half))`,
  };
  const activeStyle: CSSProperties = { backgroundColor: activeColor };
  const mutedTextStyle: CSSProperties = { color: mutedTextColor };

  useGSAP(
    () => {
      const section = sectionRef.current;
      const frame = frameRef.current;
      const track = trackRef.current;
      const grid = gridRef.current;
      const axis = axisRef.current;
      if (!section || !frame || !track || !grid || !axis) return;

      const line = axis.querySelector<HTMLElement>("[data-tl-line]");
      const head = axis.querySelector<HTMLElement>("[data-tl-head]");
      const entries = Array.from(section.querySelectorAll<HTMLElement>("[data-tl-item]"));
      const outro = Array.from(section.querySelectorAll<HTMLElement>("[data-tl-outro]"));

      let build: gsap.Context | null = null;
      let trigger: ScrollTrigger | null = null;
      // scroll offset (from the trigger start) at which each entry is fully in
      let settleAt = new Map<Element, number>();

      const measureClip = () =>
        entries.forEach((el) => {
          const body = el.querySelector<HTMLElement>("[data-tl-body]");
          body?.toggleAttribute("data-clipped", body.scrollHeight > body.clientHeight + 2);
        });

      const create = () => {
        build?.revert();
        build = null;
        trigger = null;
        settleAt = new Map();
        // measured on the plain text, before any split
        measureClip();
        if (!window.matchMedia(PIN_QUERY).matches) return;
        build = gsap.context(() => {
          const vw = frame.clientWidth;
          const vh = window.innerHeight;
          const desktop = window.matchMedia(DESKTOP_QUERY).matches;
          const travel = Math.max(0, track.scrollWidth - vw);
          // sticky distance: the part of the section that scrolls while the frame is pinned
          const pinLen = Math.max(1, section.offsetHeight - frame.offsetHeight);
          const approach = vh * 0.7; // trigger starts with the section top at 70% of the viewport
          const total = approach + pinLen;
          // the line's head holds still at this x while the track slides under it
          const tipX = vw * (desktop ? 0.62 : 0.6);
          const gx0 = grid.offsetLeft;
          const axisLen = axis.offsetWidth;
          const base = tipX - gx0; // line length when pinning starts (can be negative)
          const sweepFrom = approach * 0.25;
          const reveal = normalizedDuration * 0.16 * vh;

          // when (in scroll px from the trigger start) the line head reaches `len` along the axis
          const at = (len: number) => {
            if (base > 0 && len <= base) return sweepFrom + (Math.max(0, len) / base) * (approach - sweepFrom);
            if (travel <= 0) return total;
            return approach + ((len - base) / travel) * pinLen;
          };
          const clampT = (t: number, span = 0) => Math.min(Math.max(0, t), Math.max(0, total - span));

          const tl = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: section,
              start: "top 70%",
              end: "bottom bottom",
              scrub: reducedMotion ? true : 0.6,
            },
          });
          trigger = tl.scrollTrigger ?? null;
          // keep the timeline exactly as long as the scroll range, so time == scroll px
          tl.set({}, {}, total);
          tl.fromTo(track, { x: 0 }, { x: -travel, duration: pinLen }, approach);

          const startOf = (el: HTMLElement) => clampT(at(el.offsetLeft - vw * 0.03), reveal);
          entries.forEach((el) => settleAt.set(el, startOf(el) + reveal));
          outro.forEach((el) => settleAt.set(el, total));

          if (reducedMotion) {
            gsap.set(line, { scaleX: 1 });
            gsap.set(head, { x: axisLen });
            return;
          }

          // axis: the line grows to the head, and the head rides on its tip
          const lineTo = (len: number) => ({ scaleX: Math.min(1, Math.max(0, len) / axisLen) });
          const headTo = (len: number) => ({ x: Math.min(axisLen, Math.max(0, len)) });
          gsap.set(line, { scaleX: 0 });
          gsap.set(head, { x: 0 });
          const t0 = at(0);
          const tEnd = Math.min(at(axisLen), total);
          const lenEnd = Math.min(axisLen, Math.max(0, base + travel * ((tEnd - approach) / pinLen)));
          if (base > 0) {
            tl.to(line, { ...lineTo(base), duration: approach - sweepFrom }, sweepFrom);
            tl.to(head, { ...headTo(base), duration: approach - sweepFrom }, sweepFrom);
            tl.to(line, { ...lineTo(lenEnd), duration: Math.max(0.001, tEnd - approach) }, approach);
            tl.to(head, { ...headTo(lenEnd), duration: Math.max(0.001, tEnd - approach) }, approach);
          } else {
            tl.to(line, { ...lineTo(lenEnd), duration: Math.max(0.001, tEnd - t0) }, t0);
            tl.to(head, { ...headTo(lenEnd), duration: Math.max(0.001, tEnd - t0) }, t0);
          }

          const splitLines = (el: Element | null) =>
            el
              ? SplitText.create(el, { type: "lines", mask: "lines", linesClass: "tl-line", aria: "none" }).lines
              : [];

          entries.forEach((el) => {
            const rail = el.querySelector("[data-tl-rail]");
            const dot = el.querySelector("[data-tl-dot]");
            const titleLines = splitLines(el.querySelector("[data-tl-title]"));
            const subLines = splitLines(el.querySelector("[data-tl-sub]"));
            const bodyLines = splitLines(el.querySelector("[data-tl-body]"));
            const link = el.querySelector("[data-tl-link]");

            gsap.set(rail, { scaleY: 0 });
            gsap.set(dot, { scale: 0 });
            gsap.set([...titleLines, ...subLines, ...bodyLines], { yPercent: 105 });
            gsap.set(link, { yPercent: 150 });

            const start = startOf(el);
            tl.to(rail, { scaleY: 1, duration: reveal * 0.4 }, start)
              .to(dot, { scale: 1, duration: reveal * 0.3, ease: "back.out(2)" }, start + reveal * 0.3)
              .to(titleLines, { yPercent: 0, duration: reveal * 0.45, stagger: reveal * 0.06, ease: "power2.out" }, start + reveal * 0.2)
              .to(subLines, { yPercent: 0, duration: reveal * 0.4, ease: "power2.out" }, start + reveal * 0.32)
              .to(bodyLines, { yPercent: 0, duration: reveal * 0.45, stagger: reveal * 0.035, ease: "power2.out" }, start + reveal * 0.38)
              .to(link, { yPercent: 0, duration: reveal * 0.35, ease: "power2.out" }, start + reveal * 0.62);
          });

          if (outro.length) {
            // opacity only: a visibility toggle would drop the CTA out of the tab order
            gsap.set(outro, { opacity: 0, y: 24 });
            tl.to(outro, { opacity: 1, y: 0, duration: reveal * 0.5, stagger: reveal * 0.1, ease: "power2.out" }, clampT(tEnd - reveal * 0.5, reveal * 0.6));
          }
        }, section);
      };

      // Keyboard users tab into entries that are still off to the side; scroll
      // the page to the point where that entry has slid in and finished revealing.
      const onFocusIn = (event: FocusEvent) => {
        const target = event.target as Element | null;
        // Chrome focuses links on mousedown; scrolling then would swallow the click
        if (!target || !target.matches(":focus-visible")) return;
        const holder = target?.closest("[data-tl-item], [data-tl-outro]");
        const offset = holder ? settleAt.get(holder) : undefined;
        if (!trigger || offset === undefined) return;
        const top = trigger.start + offset;
        if (Math.abs(window.scrollY - top) > 4) window.scrollTo({ top, behavior: "instant" });
      };

      let lastW = window.innerWidth;
      let lastH = window.innerHeight;
      let lastPinned = window.matchMedia(PIN_QUERY).matches;
      let timer = 0;
      const onResize = () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          const w = window.innerWidth;
          const h = window.innerHeight;
          const pinned = window.matchMedia(PIN_QUERY).matches;
          // ignore the mobile URL bar showing and hiding
          if (w === lastW && Math.abs(h - lastH) < 120 && pinned === lastPinned) return;
          lastW = w;
          lastH = h;
          lastPinned = pinned;
          create();
          ScrollTrigger.refresh();
        }, 180);
      };

      let alive = true;
      create();
      // line breaks move once the web fonts land
      if (document.fonts && document.fonts.status !== "loaded") {
        document.fonts.ready.then(() => {
          if (!alive) return;
          create();
          ScrollTrigger.refresh();
        });
      }
      section.addEventListener("focusin", onFocusIn);
      window.addEventListener("resize", onResize);
      // focus that arrived before hydration (Tab from the hero) never reached the handler
      const active = document.activeElement;
      let raf = 0;
      if (active && section.contains(active)) {
        raf = requestAnimationFrame(() => onFocusIn({ target: active } as unknown as FocusEvent));
      }

      return () => {
        alive = false;
        window.clearTimeout(timer);
        cancelAnimationFrame(raf);
        section.removeEventListener("focusin", onFocusIn);
        window.removeEventListener("resize", onResize);
        build?.revert();
        build = null;
      };
    },
    { dependencies: [normalizedDuration, reducedMotion, count], scope: sectionRef }
  );

  const headingId = `${id}-title`;

  return (
    <section
      ref={sectionRef}
      id={id}
      aria-labelledby={headingId}
      className={cn(layoutVars, "relative w-full [@media(min-height:481px)]:[.js_&]:h-[calc(100svh+(var(--tl-track-w)-100vw)*var(--tl-k))]", className)}
      style={sectionStyle}
    >
      <div
        ref={frameRef}
        className="flex flex-col justify-center overflow-x-auto pt-[var(--header-h,84px)] pb-[var(--tl-dock)] [@media(min-height:481px)]:[.js_&]:sticky [@media(min-height:481px)]:[.js_&]:top-0 [@media(min-height:481px)]:[.js_&]:h-svh [@media(min-height:481px)]:[.js_&]:overflow-clip"
      >
        <div
          ref={trackRef}
          className="relative flex h-[var(--tl-track-h)] w-max shrink-0 [@media(max-height:480px)]:h-[400px] items-stretch gap-[var(--tl-gap)] px-[var(--tl-pad)]"
        >
          <figure className="relative h-full w-[var(--tl-img-w)] shrink-0 overflow-hidden rounded-card-sm min-[900px]:rounded-card">
            <img
              src={imageUrl}
              srcSet={imageSrcSet}
              sizes={imageSizes}
              width={imageWidth}
              height={imageHeight}
              alt={imageAlt}
              loading="lazy"
              decoding="async"
              draggable={false}
              className="h-full w-full max-w-none object-cover"
            />
          </figure>

          <div ref={gridRef} className="relative grid h-full shrink-0 grid-rows-[minmax(0,1fr)_minmax(0,1fr)]" style={gridStyle}>
            <div ref={axisRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-1/2 h-0" style={axisStyle}>
              <span className="absolute left-0 top-0 size-[var(--tl-dot)] -translate-1/2 rounded-full" style={activeStyle} />
              <span data-tl-line className="absolute inset-x-0 top-0 h-px origin-left -translate-y-1/2" style={activeStyle} />
              <span data-tl-head className="absolute left-0 top-0 size-[var(--tl-dot)] -translate-1/2 rounded-full" style={activeStyle} />
            </div>

            <div className="col-start-1 row-start-1 pr-[3vw] min-[900px]:pr-[2vw]">
              <h2
                id={headingId}
                className="-mt-[0.12em] font-display text-[clamp(44px,12vw,64px)] leading-[0.94] font-black tracking-[-0.03em] text-balance min-[900px]:text-[clamp(36px,3.5vw,66px)] [&_em]:pr-[0.04em] [&_em]:font-serif [&_em]:text-[1.06em] [&_em]:leading-[1.2] [&_em]:font-normal [&_em]:tracking-[-0.01em]"
              >
                {title}
                {titleEmphasis ? (
                  <>
                    {" "}
                    <em className={serifMissing.test(titleEmphasis) ? "!font-display" : undefined}>{titleEmphasis}</em>
                  </>
                ) : null}
              </h2>
            </div>
            {periodLabel ? (
              <div className="col-start-1 row-start-2 pt-[clamp(18px,2vw,32px)] pr-[3vw] min-[900px]:pr-[2.5vw]">
                <p className="max-w-[30ch] text-[15px] leading-[1.5] text-pretty min-[900px]:text-[clamp(15px,1.05vw,18px)]" style={mutedTextStyle}>
                  {periodLabel}
                </p>
              </div>
            ) : null}

            {items.map((item, index) => {
              const top = index % 2 === 0;
              const itemTitleId = `${id}-${item.id}`;
              return (
                <article
                  key={item.id}
                  data-tl-item
                  aria-labelledby={itemTitleId}
                  className={cn("relative h-full min-w-0 px-[var(--tl-item-px)]", top ? "row-start-1" : "row-start-2")}
                  style={{ gridColumn: `${index + 2} / span 2` }}
                >
                  <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-0">
                    {top ? (
                      <>
                        <span data-tl-dot className="absolute left-0 top-0 size-[var(--tl-dot)] -translate-x-1/2 rounded-full" style={activeStyle} />
                        <span data-tl-rail className="absolute bottom-0 left-0 top-[var(--tl-dot)] w-px origin-bottom -translate-x-1/2" style={activeStyle} />
                      </>
                    ) : (
                      <>
                        <span data-tl-rail className="absolute bottom-[var(--tl-dot)] left-0 top-0 w-px origin-top -translate-x-1/2" style={activeStyle} />
                        <span data-tl-dot className="absolute bottom-0 left-0 size-[var(--tl-dot)] -translate-x-1/2 rounded-full" style={activeStyle} />
                      </>
                    )}
                  </div>

                  <div
                    className={cn(
                      "flex h-full flex-col gap-[clamp(8px,0.7vw,12px)]",
                      top ? "pb-[clamp(20px,2.2vw,36px)]" : "justify-end pt-[clamp(20px,2.2vw,36px)]"
                    )}
                  >
                    <h3
                      id={itemTitleId}
                      data-tl-title
                      className={cn(
                        "shrink-0 font-display text-[26px] leading-[1.02] [&_.tl-line-mask]:-my-[0.1em] [&_.tl-line-mask]:py-[0.1em] font-bold tracking-[-0.025em] text-balance min-[900px]:text-[clamp(22px,1.85vw,34px)]",
                        top && "-mt-[0.18em]"
                      )}
                    >
                      {item.title}
                    </h3>
                    {item.subtitle ? (
                      <p
                        data-tl-sub
                        lang={item.subtitleLang}
                        className="shrink-0 font-serif text-[16px] leading-[1.25] italic min-[900px]:text-[clamp(15px,1.15vw,20px)]"
                        style={{ color: activeColor }}
                      >
                        {item.subtitle}
                      </p>
                    ) : null}
                    <p
                      data-tl-body
                      className="mt-[clamp(2px,0.3vw,6px)] min-h-0 max-w-[46ch] overflow-hidden text-[14.5px] leading-[1.5] text-pretty min-[900px]:text-[clamp(15px,1.1vw,18.5px)] min-[900px]:leading-[1.55] data-[clipped]:[mask-image:linear-gradient(to_bottom,#000_calc(100%-2.6em),transparent)]"
                      style={mutedTextStyle}
                    >
                      {item.content}
                    </p>
                    {item.href ? (
                      <span className="-mx-2 -mt-[6px] -mb-2 block shrink-0 overflow-hidden p-2">
                        <a
                          data-tl-link
                          href={item.href}
                          className="group inline-flex items-center gap-[6px] font-display text-[15px] font-semibold underline decoration-[color-mix(in_srgb,currentColor_35%,transparent)] underline-offset-[5px] transition-colors hover:decoration-current min-[900px]:text-[clamp(14.5px,1vw,17px)]"
                        >
                          {linkLabel}
                          <span className="sr-only">: {item.title}</span>
                          <ArrowUpRight
                            aria-hidden="true"
                            className="size-[1.05em] transition-transform duration-300 group-hover:translate-x-[2px] group-hover:-translate-y-[2px]"
                            style={{ color: activeColor }}
                          />
                        </a>
                      </span>
                    ) : null}
                  </div>
                </article>
              );
            })}

            {cta ? (
              <>
                {cta.note ? (
                  <div className="row-start-1 flex flex-col justify-end pb-[clamp(20px,2.2vw,36px)] pl-[var(--tl-item-px)]" style={{ gridColumnStart: count + 3 }}>
                    <p data-tl-outro className="max-w-[22ch] font-serif text-[22px] leading-[1.2] italic text-balance min-[900px]:text-[clamp(20px,1.7vw,30px)]">
                      {cta.note}
                    </p>
                  </div>
                ) : null}
                <div className="row-start-2 flex flex-col items-start pt-[clamp(20px,2.2vw,36px)] pl-[var(--tl-item-px)]" style={{ gridColumnStart: count + 3 }}>
                  <a
                    data-tl-outro
                    href={cta.href}
                    className="group inline-flex min-h-14 items-center gap-3 rounded-full bg-(--tl-active) px-7 font-display text-[16px] font-semibold text-abyss no-underline transition-colors hover:bg-[color-mix(in_srgb,var(--tl-active)_62%,white)]"
                  >
                    {cta.label}
                    <ArrowRight aria-hidden="true" className="size-[18px] transition-transform duration-300 group-hover:translate-x-1" />
                  </a>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
