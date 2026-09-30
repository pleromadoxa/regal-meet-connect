/**
 * Bundled Neural voice lines for Regal Meeting.
 * Multi-path playback so autoplay policies / format quirks don’t silence them.
 */

export type VoiceClip = 'powered_by' | 'lobby' | 'lobby_admitted';

const CLIP_SOURCES: Record<VoiceClip, readonly [string, string]> = {
  powered_by: [
    '/sounds/powered-by-spatial-regal.mp3',
    '/sounds/powered-by-spatial-regal.wav',
  ],
  lobby: ['/sounds/lobby-wait.mp3', '/sounds/lobby-wait.wav'],
  lobby_admitted: ['/sounds/lobby-admitted.mp3', '/sounds/lobby-admitted.wav'],
};

const VOLUME = 0.92;
const MAX_ATTEMPTS = 6;

type ClipCache = {
  htmlPool: HTMLAudioElement[];
  arrayBuffers: ArrayBuffer[];
  decodedBuffers: AudioBuffer[];
  preloadPromise: Promise<void> | null;
};

let audioCtx: AudioContext | null = null;
let unlockPromise: Promise<void> | null = null;
let playingClip: VoiceClip | null = null;
const caches = new Map<VoiceClip, ClipCache>();

function getCache(clip: VoiceClip): ClipCache {
  let c = caches.get(clip);
  if (!c) {
    c = { htmlPool: [], arrayBuffers: [], decodedBuffers: [], preloadPromise: null };
    caches.set(clip, c);
  }
  return c;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new Ctx();
  }
  return audioCtx;
}

function delay(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function makeHtmlAudio(src: string): HTMLAudioElement {
  const el = new Audio();
  el.preload = 'auto';
  el.setAttribute('playsinline', 'true');
  el.setAttribute('webkit-playsinline', 'true');
  (el as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
  el.crossOrigin = 'anonymous';
  el.volume = VOLUME;
  el.src = src;
  try {
    el.load();
  } catch {
    /* ignore */
  }
  return el;
}

async function playHtml(el: HTMLAudioElement): Promise<void> {
  el.pause();
  try {
    el.currentTime = 0;
  } catch {
    /* ignore */
  }
  el.muted = false;
  el.volume = VOLUME;
  await el.play();
  await new Promise<void>((resolve, reject) => {
    const done = () => {
      cleanup();
      resolve();
    };
    const fail = () => {
      cleanup();
      reject(new Error('html audio error'));
    };
    const cleanup = () => {
      el.removeEventListener('ended', done);
      el.removeEventListener('error', fail);
    };
    el.addEventListener('ended', done, { once: true });
    el.addEventListener('error', fail, { once: true });
  });
}

async function playDecoded(buffer: AudioBuffer): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx) throw new Error('no audio context');
  if (ctx.state === 'suspended') await ctx.resume();

  await new Promise<void>((resolve, reject) => {
    try {
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.value = VOLUME;
      source.buffer = buffer;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.onended = () => resolve();
      source.start(0);
    } catch (err) {
      reject(err);
    }
  });
}

async function decodeClip(clip: VoiceClip): Promise<void> {
  const cache = getCache(clip);
  const ctx = getAudioContext();
  if (!ctx || cache.arrayBuffers.length === 0) return;
  if (cache.decodedBuffers.length > 0) return;

  for (const raw of cache.arrayBuffers) {
    try {
      const decoded = await ctx.decodeAudioData(raw.slice(0));
      cache.decodedBuffers.push(decoded);
    } catch {
      /* try next */
    }
  }
}

/** Warm caches + unlock autoplay (safe to call from any user gesture). */
export function unlockBrandAnnouncement(): void {
  if (typeof window === 'undefined') return;
  if (!unlockPromise) {
    unlockPromise = (async () => {
      const ctx = getAudioContext();
      if (ctx?.state === 'suspended') {
        try {
          await ctx.resume();
        } catch {
          /* ignore */
        }
      }

      for (const clip of Object.keys(CLIP_SOURCES) as VoiceClip[]) {
        const cache = getCache(clip);
        if (cache.htmlPool.length === 0) {
          cache.htmlPool = CLIP_SOURCES[clip].map((src) => makeHtmlAudio(src));
        }
        for (const el of cache.htmlPool) {
          try {
            el.muted = true;
            el.volume = 0.001;
            await el.play();
            el.pause();
            el.currentTime = 0;
            el.muted = false;
            el.volume = VOLUME;
          } catch {
            /* still try later */
          }
        }
        await decodeClip(clip);
      }
    })().catch(() => {
      unlockPromise = null;
    });
  }
}

export function preloadVoiceClip(clip: VoiceClip): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  const cache = getCache(clip);
  if (!cache.preloadPromise) {
    cache.preloadPromise = (async () => {
      if (cache.htmlPool.length === 0) {
        cache.htmlPool = CLIP_SOURCES[clip].map((src) => makeHtmlAudio(src));
      }
      const fetched: ArrayBuffer[] = [];
      await Promise.all(
        CLIP_SOURCES[clip].map(async (src) => {
          try {
            const res = await fetch(src, { cache: 'force-cache', credentials: 'same-origin' });
            if (!res.ok) return;
            fetched.push(await res.arrayBuffer());
          } catch {
            /* ignore */
          }
        }),
      );
      cache.arrayBuffers = fetched;
      await decodeClip(clip);
    })().catch(() => {
      cache.preloadPromise = null;
    });
  }
  return cache.preloadPromise;
}

/** Prefetch meeting + lobby lines. */
export function preloadBrandAnnouncement(): Promise<void> {
  return Promise.all([
    preloadVoiceClip('powered_by'),
    preloadVoiceClip('lobby'),
    preloadVoiceClip('lobby_admitted'),
  ]).then(() => undefined);
}

function sessionKey(clip: VoiceClip, meetingId?: string) {
  return meetingId ? `regal:voice:${clip}:${meetingId}` : null;
}

export async function playVoiceClip(
  clip: VoiceClip,
  opts?: { meetingId?: string; force?: boolean },
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const key = sessionKey(clip, opts?.meetingId);
  if (!opts?.force && key && sessionStorage.getItem(key) === '1') {
    return true;
  }
  if (playingClip) return false;
  playingClip = clip;

  const sources = CLIP_SOURCES[clip];
  const cache = getCache(clip);

  try {
    unlockBrandAnnouncement();
    await preloadVoiceClip(clip);
    if (unlockPromise) await unlockPromise.catch(() => undefined);

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      for (const el of cache.htmlPool) {
        try {
          await playHtml(el);
          if (key) sessionStorage.setItem(key, '1');
          return true;
        } catch {
          /* next */
        }
      }

      for (const src of sources) {
        try {
          const el = makeHtmlAudio(src);
          await playHtml(el);
          if (key) sessionStorage.setItem(key, '1');
          return true;
        } catch {
          /* next */
        }
      }

      await decodeClip(clip);
      for (const buf of cache.decodedBuffers) {
        try {
          await playDecoded(buf);
          if (key) sessionStorage.setItem(key, '1');
          return true;
        } catch {
          /* next */
        }
      }

      for (const src of sources) {
        try {
          const ctx = getAudioContext();
          if (!ctx) break;
          if (ctx.state === 'suspended') await ctx.resume();
          const res = await fetch(src, { cache: 'reload', credentials: 'same-origin' });
          if (!res.ok) continue;
          const raw = await res.arrayBuffer();
          const decoded = await ctx.decodeAudioData(raw.slice(0));
          await playDecoded(decoded);
          if (key) sessionStorage.setItem(key, '1');
          return true;
        } catch {
          /* next */
        }
      }

      await delay(180 * (attempt + 1));
      unlockBrandAnnouncement();
    }

    return false;
  } finally {
    playingClip = null;
  }
}

/** “This meeting is powered by Spatial Regal.” */
export async function playBrandAnnouncement(opts?: {
  meetingId?: string;
  force?: boolean;
}): Promise<boolean> {
  return playVoiceClip('powered_by', opts);
}

/** Lobby wait line. */
export async function playLobbyAnnouncement(opts?: {
  meetingId?: string;
  force?: boolean;
}): Promise<boolean> {
  return playVoiceClip('lobby', opts);
}

/** Host admitted the guest. */
export async function playLobbyAdmittedAnnouncement(opts?: {
  meetingId?: string;
  force?: boolean;
}): Promise<boolean> {
  return playVoiceClip('lobby_admitted', opts);
}
