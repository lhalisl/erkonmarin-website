// Adapted from the ScrollX UI "Contact with globe" block for Erkon Marin: the
// globe faces Istanbul and marks the office, the map data is bundled instead of
// fetched from a CDN, and the form is the service request that hands off to
// WhatsApp or e-mail (the site has no backend). Entrances use the site's own
// [data-reveal] CSS so the server-rendered markup is never hidden waiting on
// this island's script.
"use client";

import * as React from "react";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { ArrowRight, Clock, Mail, MapPin, MessageCircle, Phone, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { geoDistance, geoGraticule, geoOrthographic, geoPath } from "d3-geo";
import { feature, mesh } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { Feature, FeatureCollection, MultiLineString } from "geojson";
import atlasUrl from "world-atlas/countries-110m.json?url";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const subscribeToReducedMotion = (callback: () => void) => {
  if (typeof window === "undefined") return () => {};
  const mql = window.matchMedia(REDUCED_MOTION_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
};
const usePrefersReducedMotion = () =>
  useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false
  );

/* ------------------------------------------------------------------ */
/* Globe                                                               */
/* ------------------------------------------------------------------ */

export type GlobeMarker = { lon: number; lat: number; label?: string };

interface GlobeWireframeProps {
  className?: string;
  marker?: GlobeMarker;
  /** [longitude, latitude] the globe faces; it sways gently around it. */
  center?: [number, number];
  /** Sway amplitude in degrees of longitude. */
  sway?: number;
  /** world-atlas numeric id of a country to tint (792 = Türkiye). */
  highlightId?: string;
  enableInteraction?: boolean;
  /** Stop the sway while focus is inside this element (e.g. a form being filled in). */
  pauseWithin?: React.RefObject<HTMLElement | null>;
}

const GLOBE = {
  sphere: "rgba(8, 17, 42, 0.72)",
  graticule: "rgba(143, 228, 251, 0.13)",
  land: "rgba(143, 228, 251, 0.5)",
  highlightFill: "rgba(43, 187, 229, 0.32)",
  highlight: "#8fe4fb",
  rim: "rgba(143, 228, 251, 0.5)",
  pin: "#8fe4fb",
  label: "#eef2fb",
  halo: "rgba(8, 17, 42, 0.9)",
};
// The sway moves a pixel or two per redraw at these rates; phones get fewer redraws
const FRAME_MS = 50;
const FRAME_MS_COARSE = 80;

function GlobeWireframe({
  className,
  marker,
  center = [29, 32],
  sway = 26,
  highlightId,
  enableInteraction = true,
  pauseWithin,
}: GlobeWireframeProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();
  const [ready, setReady] = useState(false);
  const [cx, cy] = center;
  const { lon: mLon, lat: mLat, label: mLabel } = marker ?? {};

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!wrap || !canvas || !ctx) return;

    // Canvas, not SVG: d3 draws straight into the context, so a frame never builds
    // (and the browser never parses) a 100 KB path string. Borders come from the
    // topology mesh (each arc once, not twice per shared border) and resampling is
    // off: 110m data is already dense enough at this size. About 3 ms a frame.
    const projection = geoOrthographic().precision(0);
    const path = geoPath(projection, ctx);
    const graticule = geoGraticule().step([15, 15])();
    const frameMs = window.matchMedia("(pointer: coarse)").matches ? FRAME_MS_COARSE : FRAME_MS;
    const sphere = { type: "Sphere" } as const;
    const font = `600 13px ${getComputedStyle(document.documentElement).getPropertyValue("--f-display") || "sans-serif"}`;
    let borders: MultiLineString | null = null;
    let highlight: Feature | null = null;

    let size = 0;
    let dpr = 1;
    let baseLon = -cx;
    let lat = -cy;
    let phase = 0;
    let last = 0;
    let lastDraw = 0;
    let raf = 0;
    let visible = false;
    let paused = false;
    let drag: { x: number; y: number; lon: number; lat: number; id: number; touch: boolean } | null = null;

    const draw = (now: number) => {
      if (!size) return;
      const lon = baseLon + (reduced ? 0 : Math.sin(phase) * sway);
      projection.rotate([lon, lat]);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      ctx.beginPath();
      path(sphere);
      ctx.fillStyle = GLOBE.sphere;
      ctx.fill();

      ctx.beginPath();
      path(graticule);
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = GLOBE.graticule;
      ctx.stroke();

      if (borders) {
        ctx.beginPath();
        path(borders);
        ctx.lineWidth = 0.6;
        ctx.strokeStyle = GLOBE.land;
        ctx.stroke();
      }
      if (highlight) {
        ctx.beginPath();
        path(highlight);
        ctx.fillStyle = GLOBE.highlightFill;
        ctx.fill();
        ctx.lineWidth = 0.9;
        ctx.strokeStyle = GLOBE.highlight;
        ctx.stroke();
      }

      ctx.beginPath();
      path(sphere);
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = GLOBE.rim;
      ctx.stroke();

      if (mLon === undefined || mLat === undefined) return;
      if (geoDistance([mLon, mLat], [-lon, -lat]) > Math.PI / 2 - 0.04) return;
      const p = projection([mLon, mLat]);
      if (!p) return;
      if (!reduced) {
        const k = (now % 1400) / 1400;
        ctx.beginPath();
        ctx.arc(p[0], p[1], 5 + k * 11, 0, Math.PI * 2);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = `rgba(143, 228, 251, ${(1 - k).toFixed(3)})`;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(p[0], p[1], 4.5, 0, Math.PI * 2);
      ctx.fillStyle = GLOBE.pin;
      ctx.fill();
      if (mLabel) {
        ctx.font = font;
        ctx.textBaseline = "middle";
        ctx.lineJoin = "round";
        ctx.lineWidth = 4;
        ctx.strokeStyle = GLOBE.halo;
        ctx.strokeText(mLabel, p[0] + 12, p[1]);
        ctx.fillStyle = GLOBE.label;
        ctx.fillText(mLabel, p[0] + 12, p[1]);
      }
    };

    const running = () => visible && !reduced && !paused && !document.hidden;
    const frame = (t: number) => {
      raf = 0;
      const dt = last ? Math.min(64, t - last) : 16;
      last = t;
      if (!drag) phase += dt * 0.00032;
      if (drag || t - lastDraw >= frameMs) {
        lastDraw = t;
        draw(t);
      }
      if (running()) raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (!raf && running()) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const resize = () => {
      size = wrap.clientWidth;
      if (!size) return;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
      projection.scale(size / 2 - 2).translate([size / 2, size / 2]);
      draw(performance.now());
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    });
    io.observe(wrap);
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);

    const holder = pauseWithin?.current ?? null;
    const onFocusIn = () => {
      paused = true;
      stop();
    };
    const onFocusOut = (e: FocusEvent) => {
      if (holder?.contains(e.relatedTarget as Node | null)) return;
      paused = false;
      start();
    };
    holder?.addEventListener("focusin", onFocusIn);
    holder?.addEventListener("focusout", onFocusOut);

    let dragFrame = 0;
    const redrawSoon = () => {
      if (raf || dragFrame) return;
      dragFrame = requestAnimationFrame((t) => {
        dragFrame = 0;
        draw(t);
      });
    };
    const onDown = (e: PointerEvent) => {
      if (!enableInteraction || e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY, lon: baseLon, lat, id: e.pointerId, touch: e.pointerType === "touch" };
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const k = 180 / Math.max(240, size);
      baseLon = drag.lon + (e.clientX - drag.x) * k;
      // vertical touch movement belongs to page scrolling (touch-action: pan-y)
      if (!drag.touch) lat = Math.max(-80, Math.min(80, drag.lat - (e.clientY - drag.y) * k));
      redrawSoon();
    };
    const onUp = (e: PointerEvent) => {
      if (drag && e.pointerId === drag.id) drag = null;
    };
    // the browser took the gesture for scrolling: undo whatever the first move did
    const onCancel = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      baseLon = drag.lon;
      lat = drag.lat;
      drag = null;
      redrawSoon();
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onCancel);

    let alive = true;
    fetch(atlasUrl)
      .then((r) => r.json())
      .then((world: Topology<{ countries: GeometryCollection }>) => {
        if (!alive) return;
        borders = mesh(world, world.objects.countries);
        if (highlightId) {
          const fc = feature(world, world.objects.countries) as FeatureCollection;
          highlight = fc.features.find((f) => String(f.id) === highlightId) ?? null;
        }
        draw(performance.now());
        setReady(true);
      })
      .catch(() => alive && setReady(true));

    return () => {
      alive = false;
      stop();
      if (dragFrame) cancelAnimationFrame(dragFrame);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      holder?.removeEventListener("focusin", onFocusIn);
      holder?.removeEventListener("focusout", onFocusOut);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onCancel);
    };
  }, [reduced, cx, cy, sway, highlightId, enableInteraction, mLon, mLat, mLabel, pauseWithin]);

  return (
    <div ref={wrapRef} className={cn("relative aspect-square w-full", className)}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-[6%] rounded-full bg-[radial-gradient(circle_at_50%_40%,rgba(43,187,229,0.22),transparent_68%)] blur-2xl"
      />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={cn(
          "relative block h-full w-full touch-pan-y touch-pinch-zoom transition-opacity duration-1000 select-none",
          enableInteraction && "cursor-grab active:cursor-grabbing",
          ready ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dotted separator                                                    */
/* ------------------------------------------------------------------ */

const FormDots = React.forwardRef<
  React.ComponentRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = "horizontal", decorative = true, ...props }, ref) => {
  const isHorizontal = orientation === "horizontal";
  return (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden",
        isHorizontal ? "w-full" : "h-full",
        className
      )}
      {...props}
    >
      <div className={cn("relative", isHorizontal ? "h-4 w-full" : "h-full w-4")}>
        <div
          className="absolute inset-0 bg-repeat text-white/25"
          style={{
            backgroundImage: "radial-gradient(circle, currentColor 0.8px, transparent 0.8px)",
            backgroundSize: isHorizontal ? "6px 100%" : "100% 6px",
            maskImage: isHorizontal
              ? "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)"
              : "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
          }}
        />
      </div>
    </SeparatorPrimitive.Root>
  );
});
FormDots.displayName = "FormDots";

/* ------------------------------------------------------------------ */
/* Contact section                                                     */
/* ------------------------------------------------------------------ */

const ICONS: Record<ContactLink["icon"], LucideIcon> = {
  phone: Phone,
  mail: Mail,
  whatsapp: MessageCircle,
  pin: MapPin,
  clock: Clock,
};

export type ContactLink = {
  icon: "phone" | "mail" | "whatsapp" | "pin" | "clock";
  label: string;
  href?: string;
  external?: boolean;
};

export type RequestKind = { value: string; label: string; hint?: string; urgent?: boolean };

/** Every piece of text the form shows or composes, so the section can run in any language. */
export type ContactCopy = {
  formTitle: string;
  formIntro: string;
  kind: string;
  system: string;
  vessel: string;
  vesselPlaceholder: string;
  port: string;
  portPlaceholder: string;
  details: string;
  detailsPlaceholder: string;
  detailsError: string;
  name: string;
  nameError: string;
  phone: string;
  sendWhatsApp: string;
  sendEmail: string;
  sentWhatsApp: string;
  sentEmail: string;
  /** Lines of the composed message */
  msgTitle: string;
  msgSubject: string;
  msgKind: string;
  msgSystem: string;
  msgVessel: string;
  msgPort: string;
};

const TR_COPY: ContactCopy = {
  formTitle: "Servis talebi",
  formIntro: "Gemi adı, liman ve belirtiyi yazın; talebiniz yazılmış olarak açılır, gönder’e basmanız yeterli.",
  kind: "Talep türü",
  system: "İlgili sistem",
  vessel: "Gemi adı",
  vesselPlaceholder: "Örn. M/V …",
  port: "Liman / konum",
  portPlaceholder: "Geminin bulunduğu yer",
  details: "Kısa açıklama",
  detailsPlaceholder: "Belirti, alarm kodu, etkilenen ekipman…",
  detailsError: "Lütfen arızayı ya da ihtiyacı kısaca yazın.",
  name: "Ad soyad",
  nameError: "Size nasıl hitap edelim?",
  phone: "Telefon",
  sendWhatsApp: "WhatsApp ile gönder",
  sendEmail: "E-posta ile gönder",
  sentWhatsApp: "WhatsApp açıldı. Mesajı göndermeyi unutmayın; açılmadıysa bizi telefonla arayın.",
  sentEmail: "E-posta uygulamanız talebiniz yazılmış olarak açıldı. Göndermeyi unutmayın; açılmadıysa bizi telefonla arayın.",
  msgTitle: "*Servis talebi · erkonmarin*",
  msgSubject: "Servis talebi",
  msgKind: "Talep türü",
  msgSystem: "Sistem",
  msgVessel: "Gemi",
  msgPort: "Liman / konum",
};

interface ContactWithGlobeProps {
  id?: string;
  title?: string;
  /** Middle of the title, set in the serif italic. */
  titleEmphasis?: string;
  titleEnd?: string;
  description?: string;
  infoTitle?: string;
  infoText?: string;
  links?: ContactLink[];
  /** Digits only, as used by wa.me */
  whatsappNumber: string;
  email: string;
  kinds: RequestKind[];
  systems: string[];
  marker?: GlobeMarker;
  center?: [number, number];
  copy?: ContactCopy;
  className?: string;
}

/** Entrance via the site-wide [data-reveal] observer (Base.astro); delay in ms. */
const reveal = (delay = 0) => ({ "data-reveal": "", style: { "--d": delay } as React.CSSProperties });

const fieldClass =
  "w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-[17px] text-[#eef2fb] placeholder:text-mist transition-colors duration-200 hover:border-white/25 focus:border-signal focus:bg-white/[0.07] aria-[invalid=true]:border-[#ff8f86]";
const labelClass = "font-display text-[12px] font-semibold tracking-[0.12em] text-mist uppercase";

export default function ContactWithGlobe({
  id = "contact",
  title = "Arızayı anlatın,",
  titleEmphasis = "gerisini",
  titleEnd = "bize bırakın.",
  description,
  infoTitle = "Bize ulaşın",
  infoText,
  links = [],
  whatsappNumber,
  email,
  kinds,
  systems,
  marker,
  center,
  copy = TR_COPY,
  className,
}: ContactWithGlobeProps) {
  const uid = useId().replace(/:/g, "");
  const ids = {
    title: `${id}-title`,
    vessel: `${uid}-vessel`,
    port: `${uid}-port`,
    details: `${uid}-details`,
    name: `${uid}-name`,
    phone: `${uid}-phone`,
  };
  const sectionRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLTextAreaElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<{ details?: boolean; name?: boolean }>({});
  const [status, setStatus] = useState("");

  const onSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const d = new FormData(form);
    const val = (k: string) => String(d.get(k) ?? "").trim();
    const next = { details: !val("details"), name: !val("name") };
    setErrors(next);
    if (next.details || next.name) {
      (next.details ? detailsRef : nameRef).current?.focus();
      setStatus("");
      return;
    }
    const picked = d.getAll("system").map(String);
    const lines = [
      `${copy.msgKind}: ${val("kind")}`,
      picked.length ? `${copy.msgSystem}: ${picked.join(", ")}` : null,
      val("vessel") ? `${copy.msgVessel}: ${val("vessel")}` : null,
      val("port") ? `${copy.msgPort}: ${val("port")}` : null,
      "",
      val("details"),
      "",
      `${val("name")}${val("phone") ? ` · ${val("phone")}` : ""}`,
    ].filter((l): l is string => l !== null);

    const submitter = e.nativeEvent.submitter as HTMLButtonElement | null;
    if (submitter?.value === "email") {
      const subject = `${copy.msgSubject} · ${val("kind")}${val("vessel") ? ` · ${val("vessel")}` : ""}`;
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
      setStatus(copy.sentEmail);
    } else {
      const text = [copy.msgTitle, ...lines].join("\n");
      window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
      setStatus(copy.sentWhatsApp);
    }
  };

  const clear = (key: "details" | "name") => () => errors[key] && setErrors((prev) => ({ ...prev, [key]: false }));

  // Base.astro's observer reveals [data-reveal] from the server markup; if this
  // island ever re-rendered from scratch, its fresh nodes would be missed.
  useEffect(() => {
    const pending = sectionRef.current?.querySelectorAll("[data-reveal]:not(.is-in)");
    if (!pending?.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    pending.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
      <section
        ref={sectionRef}
        id={id}
        aria-labelledby={ids.title}
        className={cn(
          "relative w-full overflow-hidden py-[clamp(96px,12vw,180px)] text-[#eef2fb]",
          "bg-[radial-gradient(60%_80%_at_0%_100%,rgba(43,187,229,0.18),transparent_70%),linear-gradient(160deg,#1d3388_0%,var(--c-navy-deep)_55%,#0f1f57_100%)]",
          className
        )}
      >
        <div className="relative mx-auto w-full max-w-[var(--maxw)] px-[var(--gutter)]">
          <div className="mx-auto mb-[clamp(48px,6vw,88px)] flex max-w-3xl flex-col items-center gap-6 text-center">
            <h2
              {...reveal(0)}
              id={ids.title}
              className="font-display text-[clamp(40px,5.4vw,84px)] leading-[0.96] font-extrabold tracking-[-0.035em] text-balance [&_em]:pr-[0.04em] [&_em]:font-serif [&_em]:text-[1.06em] [&_em]:font-normal [&_em]:tracking-[-0.02em] [&_em]:text-signal-hi [&_em]:[font-variation-settings:'opsz'_144]"
            >
              {title} {titleEmphasis ? <em>{titleEmphasis}</em> : null} {titleEnd}
            </h2>
            {description ? (
              <p
                {...reveal(120)}
                className="max-w-[46ch] text-[clamp(17px,1.35vw,20px)] leading-[1.6] text-[#d7e0f5] text-pretty"
              >
                {description}
              </p>
            ) : null}
          </div>

          <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-[clamp(40px,5vw,72px)] lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <div {...reveal(80)} className="flex flex-col gap-7">
              <div className="flex flex-col gap-2">
                <h3 className="font-display text-[clamp(24px,2vw,30px)] font-bold tracking-[-0.02em]">{infoTitle}</h3>
                {infoText ? <p className="max-w-[34ch] text-[16px] leading-[1.6] text-[#c9d4ef]">{infoText}</p> : null}
              </div>

              {links.length ? (
                <ul role="list" className="m-0 flex flex-col gap-3 p-0">
                  {links.map(({ icon, label, href, external }, i) => {
                    const Icon = ICONS[icon];
                    const inner = (
                      <>
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/[0.05] transition-colors duration-200 group-hover:border-signal/60 group-hover:bg-signal/10">
                          <Icon aria-hidden="true" className="size-[17px] text-mist transition-colors duration-200 group-hover:text-signal-hi" />
                        </span>
                        <span className="min-w-0">{label}</span>
                      </>
                    );
                    return (
                      <li key={`${icon}-${label}`} {...reveal(160 + i * 70)} className="list-none">
                        {href ? (
                          <a
                            href={href}
                            {...(external ? { target: "_blank", rel: "noopener" } : {})}
                            className="group flex w-fit items-center gap-3 font-display text-[16px] font-semibold text-[#eef2fb] no-underline transition-colors duration-200 hover:text-signal-hi"
                          >
                            {inner}
                          </a>
                        ) : (
                          <span className="group flex w-fit items-center gap-3 font-display text-[16px] font-semibold text-[#eef2fb]">{inner}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              <div className="relative mx-auto aspect-[1/0.82] w-full max-w-[460px] overflow-hidden [mask-image:linear-gradient(to_bottom,#000_62%,transparent)] lg:mx-0">
                <GlobeWireframe className="absolute inset-x-0 top-0" marker={marker} center={center} highlightId="792" pauseWithin={cardRef} />
              </div>
            </div>

            <div
              ref={cardRef}
              {...reveal(200)}
              className="order-first flex flex-col gap-6 rounded-[var(--r-lg)] border lg:order-none border-white/12 bg-[rgba(8,17,42,0.55)] p-[clamp(22px,3vw,40px)] shadow-[0_40px_80px_-48px_rgba(0,0,0,0.8)] backdrop-blur-xl"
            >
              <div className="flex flex-col gap-1.5">
                <h3 className="font-display text-[clamp(22px,1.8vw,28px)] font-bold tracking-[-0.02em]">{copy.formTitle}</h3>
                <p className="text-[15px] leading-[1.55] text-[#c9d4ef]">{copy.formIntro}</p>
              </div>

              <FormDots />

              {/* method="dialog": a submit before hydration (or without scripts) goes nowhere instead of putting the fields in the URL */}
              <form data-request method="dialog" noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
                <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
                  <legend className={cn(labelClass, "mb-3")}>{copy.kind}</legend>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    {kinds.map((k, i) => (
                      <label
                        key={k.value}
                        className="group relative flex cursor-pointer items-start gap-3 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 transition-colors duration-200 hover:border-white/30 has-checked:border-signal has-checked:bg-signal/10 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-signal-hi has-focus-visible:outline-solid"
                      >
                        <input type="radio" name="kind" value={k.value} defaultChecked={i === 0} className="absolute inset-0 m-0 size-full cursor-pointer appearance-none opacity-0" />
                        <span
                          aria-hidden="true"
                          className={cn(
                            "mt-[7px] size-2 shrink-0 rounded-full bg-white/25 transition-colors",
                            k.urgent
                              ? "group-has-checked:bg-amber group-has-checked:shadow-[0_0_10px_var(--c-amber)]"
                              : "group-has-checked:bg-lamp group-has-checked:shadow-[0_0_10px_var(--c-lamp-green)]"
                          )}
                        />
                        <span className="flex flex-col">
                          <b className="font-display text-[15px] font-semibold">{k.label}</b>
                          {k.hint ? <small className="text-[13px] text-mist">{k.hint}</small> : null}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
                  <legend className={cn(labelClass, "mb-3")}>{copy.system}</legend>
                  <div className="flex flex-wrap gap-2">
                    {systems.map((s) => (
                      <label
                        key={s}
                        className="group relative flex cursor-pointer items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 transition-colors duration-200 hover:border-white/30 has-checked:border-signal has-checked:bg-signal/10 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-signal-hi has-focus-visible:outline-solid"
                      >
                        <input type="checkbox" name="system" value={s} className="absolute inset-0 m-0 size-full cursor-pointer appearance-none opacity-0" />
                        <span aria-hidden="true" className="size-1.5 rounded-full bg-white/25 transition-colors group-has-checked:bg-lamp" />
                        <span className="font-display text-[14px] font-semibold">{s}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label htmlFor={ids.vessel} className={labelClass}>
                      {copy.vessel}
                    </label>
                    <input id={ids.vessel} name="vessel" type="text" autoComplete="off" placeholder={copy.vesselPlaceholder} className={fieldClass} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor={ids.port} className={labelClass}>
                      {copy.port}
                    </label>
                    <input id={ids.port} name="port" type="text" autoComplete="off" placeholder={copy.portPlaceholder} className={fieldClass} />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor={ids.details} className={labelClass}>
                    {copy.details} <span aria-hidden="true">*</span>
                  </label>
                  <textarea
                    ref={detailsRef}
                    id={ids.details}
                    name="details"
                    rows={4}
                    required
                    aria-invalid={errors.details ? true : undefined}
                    aria-describedby={errors.details ? `${ids.details}-err` : undefined}
                    onInput={clear("details")}
                    placeholder={copy.detailsPlaceholder}
                    className={cn(fieldClass, "resize-y")}
                  />
                  {errors.details ? (
                    <p id={`${ids.details}-err`} className="text-[13.5px] text-[#ffb0a9]">
                      {copy.detailsError}
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label htmlFor={ids.name} className={labelClass}>
                      {copy.name} <span aria-hidden="true">*</span>
                    </label>
                    <input
                      ref={nameRef}
                      id={ids.name}
                      name="name"
                      type="text"
                      autoComplete="name"
                      required
                      aria-invalid={errors.name ? true : undefined}
                      aria-describedby={errors.name ? `${ids.name}-err` : undefined}
                      onInput={clear("name")}
                      className={fieldClass}
                    />
                    {errors.name ? (
                      <p id={`${ids.name}-err`} className="text-[13.5px] text-[#ffb0a9]">
                        {copy.nameError}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor={ids.phone} className={labelClass}>
                      {copy.phone}
                    </label>
                    <input id={ids.phone} name="phone" type="tel" autoComplete="tel" inputMode="tel" className={fieldClass} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Button
                    type="submit"
                    name="via"
                    value="whatsapp"
                    className="group h-14 gap-3 rounded-full px-7 font-display text-[16px] font-semibold hover:bg-signal-hi focus-visible:ring-0 focus-visible:ring-offset-0"
                  >
                    <MessageCircle aria-hidden="true" className="size-[18px]" />
                    {copy.sendWhatsApp}
                    <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </Button>
                  <Button
                    type="submit"
                    name="via"
                    value="email"
                    variant="outline"
                    className="h-14 gap-3 rounded-full border-white/25 bg-transparent px-7 font-display text-[16px] font-semibold text-[#eef2fb] hover:border-signal hover:bg-white/[0.05] hover:text-signal-hi focus-visible:ring-0 focus-visible:ring-offset-0"
                  >
                    <Mail aria-hidden="true" className="size-[18px]" />
                    {copy.sendEmail}
                  </Button>
                </div>
                <p role="status" aria-live="polite" className="min-h-[1.5em] text-[14.5px] text-[#c9d4ef] empty:min-h-0">
                  {status}
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>
  );
}
