// Adapted from the ScrollX UI "Contact with globe" block for Erkon Marin: the
// globe faces Istanbul and marks the office, the map data is bundled instead of
// fetched from a CDN, and the form is the service request that hands off to
// WhatsApp or e-mail (the site has no backend).
"use client";

import * as React from "react";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { MotionConfig, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { ArrowRight, Clock, Mail, MapPin, MessageCircle, Phone, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { geoDistance, geoGraticule10, geoOrthographic, geoPath } from "d3";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { Feature, FeatureCollection } from "geojson";
import atlasUrl from "world-atlas/countries-110m.json?url";

const smoothEase = [0.25, 0.1, 0.25, 1] as const;

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
}

function GlobeWireframe({
  className,
  marker,
  center = [29, 32],
  sway = 26,
  highlightId,
  enableInteraction = true,
}: GlobeWireframeProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = usePrefersReducedMotion();
  const [ready, setReady] = useState(false);
  const [cx, cy] = center;
  const { lon: mLon, lat: mLat, label: mLabel } = marker ?? {};

  useEffect(() => {
    const wrap = wrapRef.current;
    const svg = svgRef.current;
    if (!wrap || !svg) return;

    const ns = "http://www.w3.org/2000/svg";
    const add = (tag: string, cls: string, parent: Element = svg) => {
      const node = document.createElementNS(ns, tag);
      node.setAttribute("class", cls);
      parent.appendChild(node);
      return node;
    };
    svg.replaceChildren();
    const sphere = add("path", "globe-sphere");
    const grat = add("path", "globe-grat");
    const land = add("path", "globe-land");
    const hi = add("path", "globe-hi");
    const rim = add("path", "globe-rim");
    const pin = add("g", "globe-pin");
    const pulse = add("circle", "globe-pulse", pin);
    pulse.setAttribute("r", "5");
    const dot = add("circle", "globe-dot", pin);
    dot.setAttribute("r", "4.5");
    const text = add("text", "globe-label", pin);
    text.setAttribute("x", "12");
    text.setAttribute("y", "4.5");
    text.textContent = mLabel ?? "";

    // One path per layer: the whole country set is drawn as a single "d" string,
    // so a frame is a handful of attribute writes, not hundreds of nodes.
    const projection = geoOrthographic().precision(0.4);
    const path = geoPath(projection);
    const graticule = geoGraticule10();
    const sphereShape = { type: "Sphere" } as const;
    let countries: FeatureCollection | null = null;
    let highlight: Feature | null = null;

    let size = 0;
    let baseLon = -cx;
    let lat = -cy;
    let phase = 0;
    let last = 0;
    let raf = 0;
    let visible = false;
    let drag: { x: number; y: number; lon: number; lat: number; id: number } | null = null;

    const draw = () => {
      if (!size) return;
      const lon = baseLon + (reduced ? 0 : Math.sin(phase) * sway);
      projection.rotate([lon, lat]);
      const sphereD = path(sphereShape) ?? "";
      sphere.setAttribute("d", sphereD);
      rim.setAttribute("d", sphereD);
      grat.setAttribute("d", path(graticule) ?? "");
      if (countries) land.setAttribute("d", path(countries) ?? "");
      if (highlight) hi.setAttribute("d", path(highlight) ?? "");
      if (mLon !== undefined && mLat !== undefined) {
        const front = geoDistance([mLon, mLat], [-lon, -lat]) < Math.PI / 2 - 0.04;
        const p = projection([mLon, mLat]);
        if (front && p) {
          pin.setAttribute("transform", `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`);
          pin.removeAttribute("display");
        } else {
          pin.setAttribute("display", "none");
        }
      } else {
        pin.setAttribute("display", "none");
      }
    };

    const frame = (t: number) => {
      raf = 0;
      const dt = last ? Math.min(64, t - last) : 16;
      last = t;
      if (!drag) phase += dt * 0.00032;
      draw();
      if (visible && !reduced) raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (!raf && visible && !reduced) {
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
      svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
      projection.scale(size / 2 - 2).translate([size / 2, size / 2]);
      draw();
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

    const onDown = (e: PointerEvent) => {
      if (!enableInteraction || e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY, lon: baseLon, lat, id: e.pointerId };
      svg.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const k = 180 / Math.max(240, size);
      baseLon = drag.lon + (e.clientX - drag.x) * k;
      lat = Math.max(-80, Math.min(80, drag.lat - (e.clientY - drag.y) * k));
      if (!raf) draw();
    };
    const onUp = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null;
    };
    svg.addEventListener("pointerdown", onDown);
    svg.addEventListener("pointermove", onMove);
    svg.addEventListener("pointerup", onUp);
    svg.addEventListener("pointercancel", onUp);

    let alive = true;
    fetch(atlasUrl)
      .then((r) => r.json())
      .then((world: Topology<{ countries: GeometryCollection }>) => {
        if (!alive) return;
        const fc = feature(world, world.objects.countries) as FeatureCollection;
        countries = fc;
        highlight = highlightId ? (fc.features.find((f) => String(f.id) === highlightId) ?? null) : null;
        draw();
        setReady(true);
      })
      .catch(() => alive && setReady(true));

    return () => {
      alive = false;
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      svg.removeEventListener("pointerdown", onDown);
      svg.removeEventListener("pointermove", onMove);
      svg.removeEventListener("pointerup", onUp);
      svg.removeEventListener("pointercancel", onUp);
    };
  }, [reduced, cx, cy, sway, highlightId, enableInteraction, mLon, mLat, mLabel]);

  return (
    <div ref={wrapRef} className={cn("relative aspect-square w-full", className)}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-[6%] rounded-full bg-[radial-gradient(circle_at_50%_40%,rgba(43,187,229,0.22),transparent_68%)] blur-2xl"
      />
      <svg
        ref={svgRef}
        aria-hidden="true"
        className={cn(
          "relative h-full w-full touch-pan-y transition-opacity duration-1000 select-none",
          enableInteraction && "cursor-grab active:cursor-grabbing",
          ready ? "opacity-100" : "opacity-0",
          "[&_.globe-sphere]:fill-[rgba(8,17,42,0.72)]",
          "[&_.globe-grat]:fill-none [&_.globe-grat]:stroke-[rgba(143,228,251,0.13)] [&_.globe-grat]:[stroke-width:0.6]",
          "[&_.globe-land]:fill-[rgba(43,187,229,0.05)] [&_.globe-land]:stroke-[rgba(143,228,251,0.5)] [&_.globe-land]:[stroke-width:0.6]",
          "[&_.globe-hi]:fill-[rgba(43,187,229,0.32)] [&_.globe-hi]:stroke-signal-hi [&_.globe-hi]:[stroke-width:0.9]",
          "[&_.globe-rim]:fill-none [&_.globe-rim]:stroke-[rgba(143,228,251,0.5)] [&_.globe-rim]:[stroke-width:1.2]",
          "[&_.globe-dot]:fill-signal-hi",
          "[&_.globe-pulse]:fill-none [&_.globe-pulse]:stroke-signal-hi [&_.globe-pulse]:[stroke-width:1.5] [&_.globe-pulse]:origin-center [&_.globe-pulse]:animate-ping [&_.globe-pulse]:[transform-box:fill-box] motion-reduce:[&_.globe-pulse]:hidden",
          "[&_.globe-label]:fill-[#eef2fb] [&_.globe-label]:stroke-[rgba(8,17,42,0.9)] [&_.globe-label]:[stroke-width:4px] [&_.globe-label]:[paint-order:stroke] [&_.globe-label]:font-display [&_.globe-label]:text-[13px] [&_.globe-label]:font-semibold"
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
  className?: string;
}

const reveal = (delay = 0, y = 24) => ({
  initial: { opacity: 0, y },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "0px 0px -8% 0px" },
  transition: { duration: 0.8, delay, ease: smoothEase },
});

const fieldClass =
  "w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-[15.5px] text-[#eef2fb] placeholder:text-mist/70 transition-colors duration-200 hover:border-white/25 focus:border-signal focus:bg-white/[0.07] aria-[invalid=true]:border-[#ff8f86]";
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
      `Talep türü: ${val("kind")}`,
      picked.length ? `Sistem: ${picked.join(", ")}` : null,
      val("vessel") ? `Gemi: ${val("vessel")}` : null,
      val("port") ? `Liman / konum: ${val("port")}` : null,
      "",
      val("details"),
      "",
      `${val("name")}${val("phone") ? ` · ${val("phone")}` : ""}`,
    ].filter((l): l is string => l !== null);

    const submitter = e.nativeEvent.submitter as HTMLButtonElement | null;
    if (submitter?.value === "email") {
      const subject = `Servis talebi · ${val("kind")}${val("vessel") ? ` · ${val("vessel")}` : ""}`;
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
      setStatus("E-posta uygulamanız talebiniz yazılmış olarak açıldı. Göndermeyi unutmayın; açılmadıysa bizi telefonla arayın.");
    } else {
      const text = ["*Servis talebi · erkonmarin*", ...lines].join("\n");
      window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
      setStatus("WhatsApp açıldı. Mesajı göndermeyi unutmayın; açılmadıysa bizi telefonla arayın.");
    }
  };

  const clear = (key: "details" | "name") => () => errors[key] && setErrors((prev) => ({ ...prev, [key]: false }));

  return (
    <MotionConfig reducedMotion="user">
      <section
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
            <motion.h2
              {...reveal(0, 14)}
              data-motion
              id={ids.title}
              className="font-display text-[clamp(40px,5.4vw,84px)] leading-[0.96] font-extrabold tracking-[-0.035em] text-balance [&_em]:pr-[0.04em] [&_em]:font-serif [&_em]:text-[1.06em] [&_em]:font-normal [&_em]:tracking-[-0.02em] [&_em]:text-signal-hi [&_em]:[font-variation-settings:'opsz'_144]"
            >
              {title} {titleEmphasis ? <em>{titleEmphasis}</em> : null} {titleEnd}
            </motion.h2>
            {description ? (
              <motion.p
                {...reveal(0.15, 14)}
                data-motion
                className="max-w-[46ch] text-[clamp(17px,1.35vw,20px)] leading-[1.6] text-[#d7e0f5] text-pretty"
              >
                {description}
              </motion.p>
            ) : null}
          </div>

          <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-[clamp(40px,5vw,72px)] lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <motion.div {...reveal(0.1, 28)} data-motion className="flex flex-col gap-7">
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
                      <motion.li key={`${icon}-${label}`} {...reveal(0.2 + i * 0.08, 0)} data-motion className="list-none">
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
                      </motion.li>
                    );
                  })}
                </ul>
              ) : null}

              <div className="relative mx-auto aspect-[1/0.82] w-full max-w-[460px] overflow-hidden [mask-image:linear-gradient(to_bottom,#000_62%,transparent)] lg:mx-0">
                <GlobeWireframe className="absolute inset-x-0 top-0" marker={marker} center={center} highlightId="792" />
              </div>
            </motion.div>

            <motion.div
              {...reveal(0.25, 28)}
              data-motion
              className="flex flex-col gap-6 rounded-[var(--r-lg)] border border-white/12 bg-[rgba(8,17,42,0.55)] p-[clamp(22px,3vw,40px)] shadow-[0_40px_80px_-48px_rgba(0,0,0,0.8)] backdrop-blur-xl"
            >
              <div className="flex flex-col gap-1.5">
                <h3 className="font-display text-[clamp(22px,1.8vw,28px)] font-bold tracking-[-0.02em]">Servis talebi</h3>
                <p className="text-[15px] leading-[1.55] text-[#c9d4ef]">
                  Gemi adı, liman ve belirtiyi yazın; talebiniz yazılmış olarak açılır, gönder’e basmanız yeterli.
                </p>
              </div>

              <FormDots />

              <form data-request noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
                <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
                  <legend className={cn(labelClass, "mb-3")}>Talep türü</legend>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    {kinds.map((k, i) => (
                      <label
                        key={k.value}
                        className="group relative flex cursor-pointer items-start gap-3 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 transition-colors duration-200 hover:border-white/30 has-checked:border-signal has-checked:bg-signal/10 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-signal-hi has-focus-visible:outline-solid"
                      >
                        <input type="radio" name="kind" value={k.value} defaultChecked={i === 0} className="sr-only" />
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
                  <legend className={cn(labelClass, "mb-3")}>İlgili sistem</legend>
                  <div className="flex flex-wrap gap-2">
                    {systems.map((s) => (
                      <label
                        key={s}
                        className="group relative flex cursor-pointer items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 transition-colors duration-200 hover:border-white/30 has-checked:border-signal has-checked:bg-signal/10 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-signal-hi has-focus-visible:outline-solid"
                      >
                        <input type="checkbox" name="system" value={s} className="sr-only" />
                        <span aria-hidden="true" className="size-1.5 rounded-full bg-white/25 transition-colors group-has-checked:bg-lamp" />
                        <span className="font-display text-[14px] font-semibold">{s}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label htmlFor={ids.vessel} className={labelClass}>
                      Gemi adı
                    </label>
                    <input id={ids.vessel} name="vessel" type="text" autoComplete="off" placeholder="Örn. M/V …" className={fieldClass} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor={ids.port} className={labelClass}>
                      Liman / konum
                    </label>
                    <input id={ids.port} name="port" type="text" autoComplete="off" placeholder="Geminin bulunduğu yer" className={fieldClass} />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor={ids.details} className={labelClass}>
                    Kısa açıklama <span aria-hidden="true">*</span>
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
                    placeholder="Belirti, alarm kodu, etkilenen ekipman…"
                    className={cn(fieldClass, "resize-y")}
                  />
                  {errors.details ? (
                    <p id={`${ids.details}-err`} className="text-[13.5px] text-[#ffb0a9]">
                      Lütfen arızayı ya da ihtiyacı kısaca yazın.
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label htmlFor={ids.name} className={labelClass}>
                      Ad soyad <span aria-hidden="true">*</span>
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
                        Size nasıl hitap edelim?
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor={ids.phone} className={labelClass}>
                      Telefon
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
                    WhatsApp ile gönder
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
                    E-posta ile gönder
                  </Button>
                </div>
                <p role="status" aria-live="polite" className="min-h-[1.5em] text-[14.5px] text-[#c9d4ef] empty:min-h-0">
                  {status}
                </p>
              </form>
            </motion.div>
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}
