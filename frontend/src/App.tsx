import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, ComponentType, FormEvent } from "react";
import axios from "axios";
import type { ApiAnalysis, ApiPackagingParam, ApiPackagingSheet, ApiProducer, ApiSampleCollection } from "./appTypes";
import { VIDEO_TOKEN } from "./appTypes";
import { api, isLikelyJwt, STORAGE_ACCESS_TOKEN } from "./api";
import {
  calculateDiscountLocal,
  loadVideoSnapshot,
  saveVideoSnapshot,
  type VideoSnapshot,
} from "./videoPresentation";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  FlaskConical,
  Leaf,
  LineChart,
  Loader2,
  LogOut,
  Menu,
  Moon,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import {
  clampStr,
  LIMITS,
  normalizeEmail,
  validateLoginFields,
  validateProfileImageFile,
  validateProfileName,
} from "./validation";

type Role = "ANALISTA" | "COMPRAS" | "COMPRA_MATERIA_PRIMA";
type User = { id: number; name: string; email: string; role: Role };
type Section = "analises" | "produtores" | "fichas" | "coletas" | "relatorios" | "perfil";

const LOGO_ASSET = "/assets/logo_verdelandia-removebg-preview.png";

const sections: {
  id: Section;
  label: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  { id: "analises", label: "Análises", icon: LineChart },
  { id: "produtores", label: "Produtores", icon: Leaf },
  { id: "fichas", label: "Fichas", icon: ClipboardList },
  { id: "coletas", label: "Coletas", icon: FlaskConical },
  { id: "relatorios", label: "Relatórios", icon: BarChart3 },
  { id: "perfil", label: "Perfil", icon: UserRound },
];

const pageTitles: Record<Section, string> = {
  analises: "Análises",
  produtores: "Cadastro de produtor",
  fichas: "FORQSE001",
  coletas: "Registro de coleta",
  relatorios: "Relatórios",
  perfil: "Perfil do usuário",
};

function tableWrapClass(theme: "dark" | "light") {
  return theme === "dark"
    ? "overflow-x-auto rounded-xl border border-zinc-600/70 shadow-inner shadow-black/20"
    : "overflow-x-auto rounded-xl border border-slate-200 shadow-sm";
}

function thClass(theme: "dark" | "light") {
  return `whitespace-nowrap px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide sm:px-4 ${
    theme === "dark" ? "bg-emerald-900/90 text-emerald-50" : "bg-emerald-700 text-white"
  }`;
}

function tdClass(theme: "dark" | "light") {
  return `border-t px-3 py-2.5 text-center text-sm sm:px-4 ${
    theme === "dark" ? "border-zinc-700/80 text-zinc-200" : "border-slate-200 text-slate-800"
  }`;
}

function inputClass(theme: "dark" | "light") {
  return `w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition ${
    theme === "dark"
      ? "border-zinc-700 bg-zinc-900/60 text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
      : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
  }`;
}

function loginGlassInput(theme: "dark" | "light") {
  return theme === "dark"
    ? "w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3.5 text-sm text-stone-100 placeholder:text-stone-400/75 outline-none backdrop-blur-md transition focus:border-emerald-400/45 focus:ring-2 focus:ring-emerald-400/20"
    : "w-full rounded-xl border border-emerald-900/12 bg-white/75 px-4 py-3.5 text-sm text-slate-800 placeholder:text-slate-500 outline-none backdrop-blur-md transition focus:border-emerald-600/35 focus:ring-2 focus:ring-emerald-500/20";
}

type ToastState = { message: string; kind: "success" | "error" } | null;

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err) && err.response?.data && typeof err.response.data === "object" && err.response.data !== null) {
    const d = err.response.data as { message?: string };
    if (typeof d.message === "string" && d.message.trim()) {
      return d.message;
    }
  }
  return fallback;
}

function ToastHost({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  if (!toast) {
    return null;
  }
  const isError = toast.kind === "error";
  return (
    <div
      role="alert"
      className={`fixed right-4 top-4 z-[100] flex max-w-sm translate-x-0 items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl transition-all duration-300 ease-out ${
        isError ? "bg-red-600 ring-1 ring-red-500/80" : "bg-emerald-600 ring-1 ring-emerald-500/80"
      }`}
    >
      {isError ? <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />}
      <p className="min-w-0 flex-1 leading-snug">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="-m-1 shrink-0 rounded-lg p-1 opacity-90 hover:bg-white/15 hover:opacity-100"
        aria-label="Fechar notificação"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [token, setToken] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);
  const [active, setActive] = useState<Section>("analises");
  const [history, setHistory] = useState<Section[]>(["analises"]);
  const [menuOpen, setMenuOpen] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const [producers, setProducers] = useState<ApiProducer[]>([]);
  const [analyses, setAnalyses] = useState<ApiAnalysis[]>([]);
  const [fichas, setFichas] = useState<ApiPackagingSheet[]>([]);
  const [coletas, setColetas] = useState<ApiSampleCollection[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [analysisProducerId, setAnalysisProducerId] = useState("");
  const [analysisStick, setAnalysisStick] = useState("");

  const [payload, setPayload] = useState({
    email: "analista@verdelandia.com",
    password: "ScqVerde2026!",
  });
  const [sessionReady, setSessionReady] = useState(false);

  const videoIdsRef = useRef({ nextId: 1 });
  const videoMode = token === VIDEO_TOKEN;

  const isAnalista = user?.role === "ANALISTA";

  function flushVideoSnapshot(override?: Partial<VideoSnapshot>) {
    const snap: VideoSnapshot = {
      nextId: override?.nextId ?? videoIdsRef.current.nextId,
      producers: override?.producers ?? producers,
      analyses: override?.analyses ?? analyses,
      fichas: override?.fichas ?? fichas,
      coletas: override?.coletas ?? coletas,
    };
    saveVideoSnapshot(snap);
  }

  function enterPresentationMode() {
    const snap = loadVideoSnapshot();
    videoIdsRef.current.nextId = snap.nextId;
    const u: User = { id: 0, name: "Apresentação SCQ", email: "presentacao@local", role: "ANALISTA" };
    sessionStorage.setItem("scq.video.active", "1");
    sessionStorage.setItem("scq.video.user", JSON.stringify(u));
    setToken(VIDEO_TOKEN);
    setUser(u);
    setProfileName(u.name);
    setProducers(snap.producers);
    setAnalyses(snap.analyses);
    setFichas(snap.fichas);
    setColetas(snap.coletas);
    showToast("Modo vídeo: dados guardados só neste navegador (localStorage). API não é necessária.", "success");
  }

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (token && user) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [token, user]);

  useEffect(() => {
    const storedName = localStorage.getItem("scq.profileName");
    const storedImage = localStorage.getItem("scq.profileImage");
    if (storedName) {
      setProfileName(storedName);
    }
    if (storedImage) {
      setProfileImage(storedImage);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (sessionStorage.getItem("scq.video.active") === "1") {
          const rawUser = sessionStorage.getItem("scq.video.user");
          const u = rawUser ? (JSON.parse(rawUser) as User) : null;
          const snap = loadVideoSnapshot();
          if (!cancelled) {
            videoIdsRef.current.nextId = snap.nextId;
            setToken(VIDEO_TOKEN);
            if (u) {
              setUser(u);
              setProfileName((n) => n || u.name);
            }
            setProducers(snap.producers);
            setAnalyses(snap.analyses);
            setFichas(snap.fichas);
            setColetas(snap.coletas);
          }
        } else {
          const stored = sessionStorage.getItem(STORAGE_ACCESS_TOKEN);
          if (stored && isLikelyJwt(stored)) {
            const { data, status } = await api.get<{ user: User }>("/auth/me");
            if (cancelled) {
              return;
            }
            if (status === 200 && data?.user) {
              setToken(stored);
              setUser(data.user);
              setProfileName((n) => n || data.user.name);
            } else {
              sessionStorage.removeItem(STORAGE_ACCESS_TOKEN);
            }
          }
        }
      } catch {
        sessionStorage.removeItem(STORAGE_ACCESS_TOKEN);
      } finally {
        if (!cancelled) {
          setSessionReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!token || !user || videoMode || !isLikelyJwt(token)) {
      return;
    }
    let cancelled = false;
    (async () => {
      setDataLoading(true);
      try {
        const [prRes, anRes, pkRes, scRes] = await Promise.all([
          api.get<ApiProducer[]>("/producers"),
          api.get<{ items: ApiAnalysis[] }>("/analyses?page=1&pageSize=100"),
          api.get<{ items: ApiPackagingSheet[] }>("/packaging-sheets?page=1&pageSize=100"),
          api.get<{ items: ApiSampleCollection[] }>("/sample-collections?page=1&pageSize=100"),
        ]);
        if (cancelled) {
          return;
        }
        setProducers(prRes.data);
        setAnalyses(anRes.data.items);
        setFichas(pkRes.data.items);
        setColetas(scRes.data.items);
      } catch {
        if (!cancelled) {
          showToast("Erro ao carregar dados do servidor. Confirme se a API está em execução.", "error");
        }
      } finally {
        if (!cancelled) {
          setDataLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, user, videoMode]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  function showToast(message: string, kind: "success" | "error") {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ message, kind });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 4500);
  }

  function dismissToast() {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(null);
  }

  const canGoBack = history.length > 1;

  function navigateTo(section: Section) {
    setActive(section);
    setHistory((prev) => (prev[prev.length - 1] === section ? prev : [...prev, section]));
    setMenuOpen(false);
  }

  function goBack() {
    setHistory((prev) => {
      if (prev.length <= 1) {
        return prev;
      }
      const next = prev.slice(0, -1);
      setActive(next[next.length - 1]);
      return next;
    });
  }

  function profileDisplayName() {
    if (profileName.trim()) {
      return profileName.trim();
    }
    return user?.name ?? "Usuário";
  }

  function saveProfileName(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const err = validateProfileName(profileName);
    if (err) {
      showToast(err, "error");
      return;
    }
    localStorage.setItem("scq.profileName", profileName.trim());
    showToast("Nome de perfil atualizado.", "success");
  }

  function handleProfileImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    const err = validateProfileImageFile(file);
    if (err) {
      showToast(err, "error");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      if (result) {
        setProfileImage(result);
        localStorage.setItem("scq.profileImage", result);
        showToast("Imagem de perfil atualizada.", "success");
      }
    };
    reader.readAsDataURL(file);
  }

  async function login(e: FormEvent) {
    e.preventDefault();
    const loginErr = validateLoginFields(payload.email, payload.password);
    if (loginErr) {
      showToast(loginErr, "error");
      return;
    }
    try {
      const response = await api.post<{ token: string; user: User }>("/auth/login", {
        email: normalizeEmail(payload.email),
        password: payload.password,
      });
      sessionStorage.setItem(STORAGE_ACCESS_TOKEN, response.data.token);
      setToken(response.data.token);
      setUser(response.data.user);
      setProfileName(response.data.user.name);
      localStorage.setItem("scq.profileName", response.data.user.name);
      showToast("Login realizado com sucesso.", "success");
    } catch (err) {
      showToast(apiErrorMessage(err, "Credenciais inválidas ou servidor indisponível."), "error");
    }
  }

  /** Modo vídeo sem botão no ecrã: abrir `/?modo=video` (apenas para fallback sem API). */
  useEffect(() => {
    if (!sessionReady) return;
    if (token || user) return;
    const q = new URLSearchParams(window.location.search);
    if (q.get("modo") !== "video" && q.get("video") !== "1") return;
    enterPresentationMode();
    window.history.replaceState({}, "", `${window.location.pathname}${window.location.hash}`);
  }, [sessionReady, token, user]);

  async function addProducer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = clampStr(String(formData.get("name") ?? ""), LIMITS.producerNameMax);
    const city = clampStr(String(formData.get("city") ?? ""), LIMITS.producerCityMax);
    const phone = clampStr(String(formData.get("phone") ?? ""), LIMITS.producerPhoneMax);
    if (name.length < 3 || city.length < 2 || phone.length < 8) {
      showToast("Preencha nome (mín. 3), cidade (mín. 2) e telefone (mín. 8 caracteres).", "error");
      return;
    }
    if (videoMode) {
      const id = videoIdsRef.current.nextId++;
      const row: ApiProducer = { id, name, city, phone };
      const next = [...producers, row];
      setProducers(next);
      flushVideoSnapshot({ producers: next });
      showToast("Produtor guardado (modo vídeo).", "success");
      e.currentTarget.reset();
      return;
    }
    try {
      await api.post("/producers", { name, city, phone });
      showToast("Produtor registado na base de dados.", "success");
      e.currentTarget.reset();
      const prRes = await api.get<ApiProducer[]>("/producers");
      setProducers(prRes.data);
    } catch (err) {
      showToast(apiErrorMessage(err, "Não foi possível registar o produtor."), "error");
    }
  }

  async function submitAnalysis(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const pid = Number.parseInt(analysisProducerId, 10);
    const stick = Number.parseFloat(String(analysisStick).replace(",", "."));
    if (!Number.isFinite(pid) || pid < 1) {
      showToast("Selecione um produtor.", "error");
      return;
    }
    if (!Number.isFinite(stick) || stick < 0 || stick > 100) {
      showToast("Informe o teor de palito entre 0 e 100.", "error");
      return;
    }
    if (videoMode) {
      const prod = producers.find((p) => p.id === pid);
      if (!prod) {
        showToast("Selecione um produtor válido.", "error");
        return;
      }
      const discount = calculateDiscountLocal(stick);
      const id = videoIdsRef.current.nextId++;
      const row: ApiAnalysis = {
        id,
        producerId: prod.id,
        stickPercent: stick,
        discountPercent: discount,
        createdAt: new Date().toISOString(),
        producer: prod,
      };
      const next = [row, ...analyses];
      setAnalyses(next);
      flushVideoSnapshot({ analyses: next });
      showToast(`Análise guardada (modo vídeo). Desconto: ${discount}%.`, "success");
      setAnalysisProducerId("");
      setAnalysisStick("");
      return;
    }
    try {
      await api.post("/analyses", { producerId: pid, stickPercent: stick });
      showToast("Análise registada. Desconto calculado automaticamente.", "success");
      setAnalysisProducerId("");
      setAnalysisStick("");
      const anRes = await api.get<{ items: ApiAnalysis[] }>("/analyses?page=1&pageSize=100");
      setAnalyses(anRes.data.items);
    } catch (err) {
      showToast(apiErrorMessage(err, "Não foi possível registar a análise."), "error");
    }
  }

  async function addFicha(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const lot = clampStr(String(formData.get("lot") ?? ""), 80);
    const supplier = clampStr(String(formData.get("supplier") ?? ""), 120);
    const densidade = clampStr(String(formData.get("densidade") ?? ""), LIMITS.fichaTextMax);
    const dimensoes = clampStr(String(formData.get("dimensoes") ?? ""), LIMITS.fichaTextMax);
    const visual = clampStr(String(formData.get("visual") ?? ""), LIMITS.fichaTextMax);
    const codigoBarras = clampStr(String(formData.get("codigoBarras") ?? ""), LIMITS.fichaTextMax);
    const observations = clampStr(String(formData.get("observations") ?? ""), LIMITS.fichaTextMax);
    if (lot.length < 2 || supplier.length < 2 || densidade.length < 1 || dimensoes.length < 1 || visual.length < 1 || codigoBarras.length < 1) {
      showToast("Preencha todos os campos obrigatórios da ficha.", "error");
      return;
    }
    const parametersTpl = [
      { name: "Densidade", result: densidade },
      { name: "Dimensões", result: dimensoes },
      { name: "Visual / impressões", result: visual },
      { name: "Código de barras", result: codigoBarras },
    ];
    if (videoMode) {
      const sheetId = videoIdsRef.current.nextId++;
      const parameters: ApiPackagingParam[] = parametersTpl.map((t) => ({
        id: videoIdsRef.current.nextId++,
        sheetId,
        name: t.name,
        result: t.result,
        unit: "-",
        standard: "Especificação interna",
        status: "C" as const,
      }));
      const sheet: ApiPackagingSheet = {
        id: sheetId,
        formCode: "FORQSE001",
        lot,
        supplier,
        observations: observations || null,
        overallStatus: "C",
        createdAt: new Date().toISOString(),
        parameters,
      };
      const next = [sheet, ...fichas];
      setFichas(next);
      flushVideoSnapshot({ fichas: next });
      showToast("Ficha guardada (modo vídeo).", "success");
      e.currentTarget.reset();
      return;
    }
    const parameters = parametersTpl.map((t) => ({
      name: t.name,
      result: t.result,
      unit: "-",
      standard: "Especificação interna",
      status: "C" as const,
    }));
    try {
      await api.post("/packaging-sheets", {
        lot,
        supplier,
        ...(observations ? { observations } : {}),
        parameters,
      });
      showToast("Ficha FORQSE001 registada na base de dados.", "success");
      e.currentTarget.reset();
      const pkRes = await api.get<{ items: ApiPackagingSheet[] }>("/packaging-sheets?page=1&pageSize=100");
      setFichas(pkRes.data.items);
    } catch (err) {
      showToast(apiErrorMessage(err, "Não foi possível registar a ficha."), "error");
    }
  }

  async function addColeta(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const productType = clampStr(String(formData.get("productType") ?? ""), 200);
    const destination = clampStr(String(formData.get("destination") ?? ""), 200);
    const notes = clampStr(String(formData.get("notes") ?? ""), LIMITS.coletaTextMax);
    if (productType.length < 2 || destination.length < 2) {
      showToast("Tipo de produto e destino devem ter pelo menos 2 caracteres.", "error");
      return;
    }
    if (videoMode) {
      const id = videoIdsRef.current.nextId++;
      const row: ApiSampleCollection = {
        id,
        productType,
        destination,
        notes: notes || null,
        createdAt: new Date().toISOString(),
      };
      const next = [row, ...coletas];
      setColetas(next);
      flushVideoSnapshot({ coletas: next });
      showToast("Coleta guardada (modo vídeo).", "success");
      e.currentTarget.reset();
      return;
    }
    try {
      await api.post("/sample-collections", {
        productType,
        destination,
        ...(notes ? { notes } : {}),
      });
      showToast("Coleta registada na base de dados.", "success");
      e.currentTarget.reset();
      const scRes = await api.get<{ items: ApiSampleCollection[] }>("/sample-collections?page=1&pageSize=100");
      setColetas(scRes.data.items);
    } catch (err) {
      showToast(apiErrorMessage(err, "Não foi possível registar a coleta."), "error");
    }
  }

  function handleLogout() {
    sessionStorage.removeItem(STORAGE_ACCESS_TOKEN);
    sessionStorage.removeItem("scq.video.active");
    sessionStorage.removeItem("scq.video.user");
    setToken("");
    setUser(null);
    setProducers([]);
    setAnalyses([]);
    setFichas([]);
    setColetas([]);
    dismissToast();
    setMenuOpen(true);
  }

  const pageTitle = pageTitles[active];

  if (!sessionReady) {
    return (
      <>
        <ToastHost toast={toast} onDismiss={dismissToast} />
        <main
          className={`flex min-h-dvh items-center justify-center px-6 ${
            theme === "dark" ? "bg-zinc-950 text-zinc-300" : "bg-slate-100 text-slate-600"
          }`}
        >
          <p className="text-sm font-medium">A verificar a sessão…</p>
        </main>
      </>
    );
  }

  if (!token || !user) {
    return (
      <>
        <ToastHost toast={toast} onDismiss={dismissToast} />
        <main
          className={`relative isolate flex min-h-dvh flex-col overflow-hidden font-[family-name:var(--font-sans)] [--font-sans:'Source_Sans_3',system-ui,sans-serif] md:flex-row ${
            theme === "dark"
              ? "bg-[#0f1612] text-stone-100"
              : "bg-gradient-to-br from-emerald-50 via-stone-100 to-emerald-100/90 text-slate-800"
          }`}
          style={{ fontFamily: "'Source Sans 3', system-ui, sans-serif" }}
        >
          <div
            className={`pointer-events-none absolute inset-0 ${
              theme === "dark"
                ? "bg-[linear-gradient(165deg,#1a2e22_0%,#0f1814_38%,#142018_62%,#0c1210_100%),radial-gradient(ellipse_90%_70%_at_20%_30%,rgba(52,211,153,0.14),transparent_55%),radial-gradient(ellipse_70%_50%_at_100%_80%,rgba(0,0,0,0.35),transparent),url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E\")]"
                : "bg-[radial-gradient(ellipse_80%_60%_at_30%_20%,rgba(16,185,129,0.15),transparent),radial-gradient(ellipse_60%_50%_at_100%_100%,rgba(120,113,108,0.12),transparent)]"
            }`}
          />
          <Leaf
            className={`pointer-events-none absolute -left-6 bottom-16 h-40 w-40 rotate-[-18deg] md:bottom-24 md:left-4 ${
              theme === "dark" ? "text-emerald-600/[0.12]" : "text-emerald-700/[0.1]"
            }`}
            aria-hidden
          />

          <button
            type="button"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            className={`absolute right-4 top-4 z-20 rounded-full border p-2.5 shadow-lg backdrop-blur-md transition md:right-6 md:top-6 ${
              theme === "dark"
                ? "border-white/15 bg-black/25 text-amber-200/90 hover:bg-white/10"
                : "border-emerald-900/15 bg-white/60 text-indigo-800 hover:bg-white/90"
            }`}
            aria-label={theme === "dark" ? "Alternar para tema claro" : "Alternar para tema escuro"}
          >
            {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>

          <div
            className={`relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-10 md:w-[55%] md:max-w-none md:px-12 md:py-16 lg:px-20 ${
              theme === "dark" ? "" : "md:border-r md:border-emerald-900/10"
            }`}
          >
            <img
              src={LOGO_ASSET}
              alt=""
              className={`pointer-events-none absolute left-1/2 top-1/2 w-[min(100%,380px)] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-[0.07] md:w-[420px] ${
                theme === "dark" ? "mix-blend-soft-light" : "mix-blend-multiply"
              }`}
              aria-hidden
            />
            <div className="relative mx-auto w-full max-w-lg text-center">
              <p
                className={`font-[family-name:var(--font-serif)] text-[11px] font-semibold uppercase tracking-[0.35em] md:text-xs ${
                  theme === "dark" ? "text-stone-400" : "text-emerald-900/70"
                }`}
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                Indústria Ervateira
              </p>
              <div className="mt-6 flex justify-center md:mt-8">
                <img
                  src={LOGO_ASSET}
                  alt="Verdelândia"
                  className={`h-28 w-auto object-contain drop-shadow-[0_4px_24px_rgba(0,0,0,0.45)] sm:h-36 md:h-44 ${
                    theme === "dark" ? "brightness-[1.15] contrast-105 saturate-[1.1]" : "drop-shadow-md"
                  }`}
                />
              </div>
              <h1
                className={`mt-6 font-[family-name:var(--font-serif)] text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl md:mt-8 md:text-6xl ${
                  theme === "dark" ? "text-stone-50" : "text-emerald-950"
                }`}
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                Verdelândia
              </h1>
              <p className={`mt-2 text-sm font-medium sm:text-base ${theme === "dark" ? "text-stone-400" : "text-emerald-900/75"}`}>
                Sistema de Controle de Qualidade
              </p>
              <p
                className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${
                  theme === "dark"
                    ? "border-emerald-500/35 bg-emerald-950/40 text-emerald-200/90"
                    : "border-emerald-600/25 bg-emerald-50/90 text-emerald-900"
                }`}
              >
                Sprint 2 · Interface refinada
              </p>
            </div>
          </div>

          <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 pb-12 pt-4 md:w-[45%] md:px-8 md:pb-16 md:pt-16 lg:px-14">
            <section
              className={`relative w-full max-w-sm overflow-hidden rounded-3xl border p-8 shadow-2xl backdrop-blur-2xl sm:p-10 ${
                theme === "dark"
                  ? "border-white/20 bg-white/[0.12] shadow-black/50 ring-1 ring-emerald-500/15"
                  : "border-white/70 bg-white/60 shadow-[0_24px_80px_-12px_rgba(16,185,129,0.18)] ring-1 ring-emerald-600/10"
              }`}
            >
              <div
                className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${
                  theme === "dark" ? "from-emerald-600/80 via-emerald-400/60 to-teal-500/70" : "from-emerald-600 via-emerald-500 to-teal-500"
                }`}
              />
              <div className="relative space-y-6 pt-1">
                <h2 className={`text-lg font-semibold tracking-tight ${theme === "dark" ? "text-stone-50" : "text-emerald-950"}`}>Entrar</h2>
                <form onSubmit={login} className="space-y-4" noValidate>
                  <input
                    className={loginGlassInput(theme)}
                    value={payload.email}
                    onChange={(e) => setPayload((s) => ({ ...s, email: e.target.value }))}
                    placeholder="E-mail"
                    autoComplete="email"
                    maxLength={LIMITS.emailMax}
                    inputMode="email"
                  />
                  <input
                    className={loginGlassInput(theme)}
                    value={payload.password}
                    onChange={(e) => setPayload((s) => ({ ...s, password: e.target.value }))}
                    type="password"
                    placeholder="Senha (mín. 8 caracteres)"
                    autoComplete="current-password"
                    maxLength={LIMITS.passwordMax}
                    minLength={LIMITS.passwordMin}
                  />
                  <button
                    type="submit"
                    className={`w-full rounded-xl px-4 py-3.5 text-sm font-semibold tracking-wide shadow-lg transition ${
                      theme === "dark"
                        ? "bg-gradient-to-r from-stone-100 to-stone-200 text-emerald-950 shadow-black/30 hover:from-white hover:to-stone-100"
                        : "bg-gradient-to-r from-emerald-700 to-emerald-800 text-white shadow-emerald-900/25 hover:from-emerald-600 hover:to-emerald-700"
                    }`}
                  >
                    Entrar no sistema
                  </button>
                </form>
              </div>
            </section>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <ToastHost toast={toast} onDismiss={dismissToast} />
      <div
        className={`fixed inset-0 z-0 flex flex-col overflow-hidden ${
          theme === "dark" ? "bg-zinc-950 text-zinc-100" : "bg-slate-100 text-slate-900"
        }`}
      >
        <header
          className={`relative z-[45] flex shrink-0 items-center justify-between gap-3 border-b px-3 py-2.5 md:px-4 ${
            theme === "dark" ? "border-zinc-800 bg-zinc-900" : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2.5 md:gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className={`shrink-0 rounded-lg border p-2 transition ${
                theme === "dark" ? "border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
              }`}
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <img src={LOGO_ASSET} alt="" className="hidden h-9 w-9 shrink-0 rounded-md object-contain sm:block" />
            <div className="min-w-0 flex-1">
              <p className={`truncate text-[10px] font-medium uppercase tracking-wide ${theme === "dark" ? "text-zinc-500" : "text-slate-500"}`}>
                SCQ Verdelândia
              </p>
              <h1 className={`truncate text-base font-bold leading-tight md:text-lg ${theme === "dark" ? "text-zinc-50" : "text-slate-900"}`}>{pageTitle}</h1>
              <p className={`truncate text-xs ${theme === "dark" ? "text-zinc-400" : "text-slate-600"}`}>
                {profileDisplayName()} · {user.role}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={goBack}
              disabled={!canGoBack}
              className={`rounded-lg px-2.5 py-2 text-xs font-medium transition md:px-3 ${
                canGoBack
                  ? "bg-emerald-600 text-white hover:bg-emerald-500"
                  : theme === "dark"
                    ? "bg-zinc-800 text-zinc-500"
                    : "bg-slate-100 text-slate-400"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Voltar</span>
              </span>
            </button>
            <button
              type="button"
              className={`rounded-lg border p-2 transition ${
                theme === "dark"
                  ? "border-zinc-600 text-amber-300 hover:bg-zinc-800"
                  : "border-slate-300 text-indigo-700 hover:bg-slate-50"
              }`}
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              aria-label={theme === "dark" ? "Alternar para tema claro" : "Alternar para tema escuro"}
            >
              {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>
          </div>
        </header>

        <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-3 pt-2 md:px-4 md:pb-4">
          <section
            className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border shadow-lg ${
              theme === "dark" ? "border-zinc-700 bg-zinc-900/90" : "border-slate-200 bg-white"
            }`}
          >
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-5 md:py-5">
              <div className="mx-auto w-full max-w-5xl space-y-6">
                {videoMode && (
                  <div
                    className={`rounded-xl border px-3 py-2 text-center text-xs ${
                      theme === "dark" ? "border-zinc-600 bg-zinc-800/50 text-zinc-400" : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    Dados locais (sem servidor)
                  </div>
                )}

                {dataLoading && (
                  <div
                    className={`flex items-center justify-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
                      theme === "dark" ? "border-emerald-500/25 bg-emerald-950/30 text-emerald-100/90" : "border-emerald-200 bg-emerald-50/90 text-emerald-950"
                    }`}
                  >
                    <Loader2 className="h-5 w-5 shrink-0 animate-spin text-emerald-500" aria-hidden />
                    <span>A sincronizar dados com o servidor…</span>
                  </div>
                )}

                {active === "produtores" && (
                  <section className="space-y-6">
                    <div className="text-center md:text-left">
                      <p className={`text-sm ${theme === "dark" ? "text-zinc-400" : "text-slate-600"}`}>
                        Produtores registados na base de dados (API). {!isAnalista && "Apenas visualização — cadastro é exclusivo do perfil Analista."}
                      </p>
                    </div>
                    {isAnalista ? (
                      <form
                        className={`grid gap-3 rounded-2xl border p-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end ${
                          theme === "dark" ? "border-zinc-700 bg-zinc-950/40" : "border-slate-200 bg-slate-50/80"
                        }`}
                        onSubmit={addProducer}
                      >
                        <div className="sm:col-span-1">
                          <label className={`mb-1 block text-xs font-medium ${theme === "dark" ? "text-zinc-400" : "text-slate-600"}`}>Nome</label>
                          <input className={inputClass(theme)} name="name" placeholder="Nome" required maxLength={LIMITS.producerNameMax} />
                        </div>
                        <div className="sm:col-span-1">
                          <label className={`mb-1 block text-xs font-medium ${theme === "dark" ? "text-zinc-400" : "text-slate-600"}`}>Cidade</label>
                          <input className={inputClass(theme)} name="city" placeholder="Cidade" required maxLength={LIMITS.producerCityMax} />
                        </div>
                        <div className="sm:col-span-1">
                          <label className={`mb-1 block text-xs font-medium ${theme === "dark" ? "text-zinc-400" : "text-slate-600"}`}>Telefone</label>
                          <input className={inputClass(theme)} name="phone" placeholder="Telefone" required maxLength={LIMITS.producerPhoneMax} />
                        </div>
                        <div className="flex sm:col-span-2 lg:col-span-1">
                          <button type="submit" className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500">
                            Adicionar produtor
                          </button>
                        </div>
                      </form>
                    ) : null}
                    <div className={tableWrapClass(theme)}>
                      <table className="w-full min-w-[520px] border-collapse text-left">
                        <thead>
                          <tr>
                            <th className={thClass(theme)}>Nome</th>
                            <th className={thClass(theme)}>Cidade</th>
                            <th className={thClass(theme)}>Telefone</th>
                          </tr>
                        </thead>
                        <tbody>
                          {producers.map((p) => (
                            <tr key={p.id}>
                              <td className={`${tdClass(theme)} text-left font-medium`}>{p.name}</td>
                              <td className={`${tdClass(theme)} text-left`}>{p.city}</td>
                              <td className={`${tdClass(theme)} text-left`}>{p.phone}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {producers.length === 0 && !dataLoading && (
                      <p className={`text-center text-sm ${theme === "dark" ? "text-zinc-500" : "text-slate-500"}`}>Nenhum produtor registado.</p>
                    )}
                  </section>
                )}

                {active === "analises" && (
                  <section className="space-y-6">
                    <div className="text-center md:text-left">
                      <p className={`text-sm ${theme === "dark" ? "text-zinc-400" : "text-slate-600"}`}>
                        Nova análise: escolha o produtor e o teor de palito (%). O desconto é calculado na API. Lista abaixo vem da base de dados.
                      </p>
                    </div>
                    {isAnalista ? (
                      <form
                        onSubmit={submitAnalysis}
                        className={`grid gap-3 rounded-2xl border p-4 md:grid-cols-2 lg:grid-cols-4 lg:items-end ${
                          theme === "dark" ? "border-zinc-700 bg-zinc-950/40" : "border-slate-200 bg-slate-50/80"
                        }`}
                      >
                        <div className="md:col-span-2 lg:col-span-2">
                          <label className={`mb-1 block text-xs font-medium ${theme === "dark" ? "text-zinc-400" : "text-slate-600"}`}>Produtor</label>
                          <select
                            className={inputClass(theme)}
                            value={analysisProducerId}
                            onChange={(e) => setAnalysisProducerId(e.target.value)}
                            required
                          >
                            <option value="">Selecione…</option>
                            {producers.map((p) => (
                              <option key={p.id} value={String(p.id)}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={`mb-1 block text-xs font-medium ${theme === "dark" ? "text-zinc-400" : "text-slate-600"}`}>Teor de palito (%)</label>
                          <input
                            className={inputClass(theme)}
                            inputMode="decimal"
                            value={analysisStick}
                            onChange={(e) => setAnalysisStick(e.target.value)}
                            placeholder="ex.: 24"
                            required
                          />
                        </div>
                        <div className="flex md:col-span-2 lg:col-span-1">
                          <button type="submit" className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500">
                            Registar análise
                          </button>
                        </div>
                      </form>
                    ) : (
                      <p className={`rounded-xl border px-4 py-3 text-sm ${theme === "dark" ? "border-zinc-600 bg-zinc-950/50" : "border-slate-200 bg-slate-50"}`}>
                        Novas análises apenas para o perfil <strong>Analista</strong>.
                      </p>
                    )}
                    <div className={tableWrapClass(theme)}>
                      <table className="w-full min-w-[640px] border-collapse">
                        <thead>
                          <tr>
                            <th className={thClass(theme)}>Data</th>
                            <th className={thClass(theme)}>Produtor</th>
                            <th className={thClass(theme)}>Palito %</th>
                            <th className={thClass(theme)}>Desconto %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...analyses]
                            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                            .map((row) => (
                              <tr key={row.id}>
                                <td className={tdClass(theme)}>
                                  {new Date(row.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                                </td>
                                <td className={`${tdClass(theme)} text-left font-medium`}>{row.producer.name}</td>
                                <td className={tdClass(theme)}>{Number(row.stickPercent).toFixed(2)}%</td>
                                <td className={tdClass(theme)}>{Number(row.discountPercent).toFixed(2)}%</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                    {analyses.length === 0 && !dataLoading && (
                      <p className={`text-center text-sm ${theme === "dark" ? "text-zinc-500" : "text-slate-500"}`}>Nenhuma análise na base.</p>
                    )}
                  </section>
                )}

                {active === "fichas" && (
                  <section className="space-y-6">
                    <div className="text-center md:text-left">
                      <p className={`text-sm ${theme === "dark" ? "text-zinc-400" : "text-slate-600"}`}>
                        FORQSE001 — dados gravados via API. Quatro parâmetros obrigatórios (espécificação interna).
                      </p>
                    </div>
                    {isAnalista ? (
                      <form
                        onSubmit={addFicha}
                        className={`grid gap-3 rounded-2xl border p-4 md:grid-cols-2 ${
                          theme === "dark" ? "border-zinc-700 bg-zinc-950/40" : "border-slate-200 bg-slate-50/80"
                        }`}
                      >
                        <div>
                          <label className={`mb-1 block text-xs font-medium ${theme === "dark" ? "text-zinc-400" : "text-slate-600"}`}>Lote</label>
                          <input className={inputClass(theme)} name="lot" placeholder="Lote" required maxLength={80} />
                        </div>
                        <div>
                          <label className={`mb-1 block text-xs font-medium ${theme === "dark" ? "text-zinc-400" : "text-slate-600"}`}>Fornecedor</label>
                          <input className={inputClass(theme)} name="supplier" placeholder="Fornecedor" required maxLength={120} />
                        </div>
                        <div>
                          <label className={`mb-1 block text-xs font-medium ${theme === "dark" ? "text-zinc-400" : "text-slate-600"}`}>Densidade</label>
                          <input className={inputClass(theme)} name="densidade" placeholder="Densidade" required maxLength={LIMITS.fichaTextMax} />
                        </div>
                        <div>
                          <label className={`mb-1 block text-xs font-medium ${theme === "dark" ? "text-zinc-400" : "text-slate-600"}`}>Dimensões</label>
                          <input className={inputClass(theme)} name="dimensoes" placeholder="Dimensões" required maxLength={LIMITS.fichaTextMax} />
                        </div>
                        <div>
                          <label className={`mb-1 block text-xs font-medium ${theme === "dark" ? "text-zinc-400" : "text-slate-600"}`}>Visual / impressões</label>
                          <input className={inputClass(theme)} name="visual" placeholder="Visual" required maxLength={LIMITS.fichaTextMax} />
                        </div>
                        <div>
                          <label className={`mb-1 block text-xs font-medium ${theme === "dark" ? "text-zinc-400" : "text-slate-600"}`}>Código de barras</label>
                          <input className={inputClass(theme)} name="codigoBarras" placeholder="Código de barras" required maxLength={LIMITS.fichaTextMax} />
                        </div>
                        <div className="md:col-span-2">
                          <label className={`mb-1 block text-xs font-medium ${theme === "dark" ? "text-zinc-400" : "text-slate-600"}`}>Observações</label>
                          <textarea className={inputClass(theme)} name="observations" placeholder="Observações" rows={2} maxLength={LIMITS.fichaTextMax} />
                        </div>
                        <div className="md:col-span-2">
                          <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500">
                            Registar ficha
                          </button>
                        </div>
                      </form>
                    ) : (
                      <p className={`rounded-xl border px-4 py-3 text-sm ${theme === "dark" ? "border-zinc-600 bg-zinc-950/50" : "border-slate-200 bg-slate-50"}`}>
                        Registo de fichas apenas para o perfil <strong>Analista</strong>.
                      </p>
                    )}
                    <div className={tableWrapClass(theme)}>
                      <table className="w-full min-w-[720px] border-collapse text-left">
                        <thead>
                          <tr>
                            <th className={thClass(theme)}>Lote</th>
                            <th className={thClass(theme)}>Fornecedor</th>
                            <th className={thClass(theme)}>Conformidade</th>
                            <th className={thClass(theme)}>Data</th>
                            <th className={thClass(theme)}>Parâmetros</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fichas.map((f) => (
                            <tr key={f.id}>
                              <td className={`${tdClass(theme)} text-left font-medium`}>{f.lot}</td>
                              <td className={`${tdClass(theme)} text-left`}>{f.supplier}</td>
                              <td className={tdClass(theme)}>{f.overallStatus === "C" ? "C" : "NC"}</td>
                              <td className={tdClass(theme)}>
                                {new Date(f.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                              </td>
                              <td className={`${tdClass(theme)} max-w-[280px] truncate text-left text-xs`} title={f.parameters.map((p) => `${p.name}: ${p.result}`).join(" · ")}>
                                {f.parameters.map((p) => `${p.name}: ${p.result}`).join(" · ")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {fichas.length === 0 && !dataLoading && (
                      <p className={`text-center text-sm ${theme === "dark" ? "text-zinc-500" : "text-slate-500"}`}>Nenhuma ficha registada.</p>
                    )}
                  </section>
                )}

                {active === "coletas" && (
                  <section className="space-y-6">
                    <div className="text-center md:text-left">
                      <p className={`text-sm ${theme === "dark" ? "text-zinc-400" : "text-slate-600"}`}>Coletas de amostra registadas na API.</p>
                    </div>
                    {isAnalista ? (
                      <form
                        onSubmit={addColeta}
                        className={`grid gap-3 rounded-2xl border p-4 md:grid-cols-3 md:items-end ${
                          theme === "dark" ? "border-zinc-700 bg-zinc-950/40" : "border-slate-200 bg-slate-50/80"
                        }`}
                      >
                        <div className="md:col-span-1">
                          <label className={`mb-1 block text-xs font-medium ${theme === "dark" ? "text-zinc-400" : "text-slate-600"}`}>Tipo de produto</label>
                          <input className={inputClass(theme)} name="productType" placeholder="Tipo de produto" required maxLength={200} />
                        </div>
                        <div className="md:col-span-1">
                          <label className={`mb-1 block text-xs font-medium ${theme === "dark" ? "text-zinc-400" : "text-slate-600"}`}>Destino</label>
                          <input className={inputClass(theme)} name="destination" placeholder="Destino" required maxLength={200} />
                        </div>
                        <div className="flex md:col-span-1">
                          <button type="submit" className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500">
                            Registrar coleta
                          </button>
                        </div>
                        <div className="md:col-span-3">
                          <label className={`mb-1 block text-xs font-medium ${theme === "dark" ? "text-zinc-400" : "text-slate-600"}`}>Observações</label>
                          <textarea className={inputClass(theme)} name="notes" placeholder="Observações" rows={2} maxLength={LIMITS.coletaTextMax} />
                        </div>
                      </form>
                    ) : (
                      <p className={`rounded-xl border px-4 py-3 text-sm ${theme === "dark" ? "border-zinc-600 bg-zinc-950/50" : "border-slate-200 bg-slate-50"}`}>
                        Novas coletas apenas para o perfil <strong>Analista</strong>.
                      </p>
                    )}
                    <div className={tableWrapClass(theme)}>
                      <table className="w-full min-w-[560px] border-collapse text-left">
                        <thead>
                          <tr>
                            <th className={thClass(theme)}>Data</th>
                            <th className={thClass(theme)}>Produto</th>
                            <th className={thClass(theme)}>Destino</th>
                            <th className={thClass(theme)}>Observações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {coletas.map((c) => (
                            <tr key={c.id}>
                              <td className={tdClass(theme)}>
                                {new Date(c.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                              </td>
                              <td className={`${tdClass(theme)} text-left font-medium`}>{c.productType}</td>
                              <td className={`${tdClass(theme)} text-left`}>{c.destination}</td>
                              <td className={`${tdClass(theme)} max-w-[200px] truncate text-left`} title={c.notes ?? ""}>
                                {c.notes || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {coletas.length === 0 && !dataLoading && (
                      <p className={`text-center text-sm ${theme === "dark" ? "text-zinc-500" : "text-slate-500"}`}>Nenhuma coleta registada.</p>
                    )}
                  </section>
                )}

                {active === "relatorios" && (
                  <section className="space-y-6 text-center md:text-left">
                    <p className={`text-sm ${theme === "dark" ? "text-zinc-400" : "text-slate-600"}`}>
                      Resumo com contagens actuais da base de dados (sincronizado com a API).
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {[
                        { title: "Análises", value: String(analyses.length), caption: "Registos na API" },
                        { title: "Produtores", value: String(producers.length), caption: "Cadastrados" },
                        { title: "Coletas", value: String(coletas.length), caption: "Registos na API" },
                        { title: "Fichas FORQSE001", value: String(fichas.length), caption: "Registos na API" },
                      ].map((card) => (
                        <article
                          key={card.title}
                          className={`rounded-xl border p-4 text-left ${theme === "dark" ? "border-zinc-700 bg-zinc-900/70" : "border-slate-200 bg-slate-50"}`}
                        >
                          <p className={`text-xs ${theme === "dark" ? "text-zinc-400" : "text-slate-500"}`}>{card.title}</p>
                          <p className={`mt-1 text-2xl font-bold ${theme === "dark" ? "text-zinc-100" : "text-slate-900"}`}>{card.value}</p>
                          <p className={`mt-2 text-xs ${theme === "dark" ? "text-zinc-500" : "text-slate-500"}`}>{card.caption}</p>
                        </article>
                      ))}
                    </div>
                  </section>
                )}

                {active === "perfil" && (
                  <section className="mx-auto max-w-lg space-y-4 text-center sm:text-left">
                    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                      <div className={`h-20 w-20 shrink-0 overflow-hidden rounded-full border ${theme === "dark" ? "border-zinc-700" : "border-slate-300"}`}>
                        {profileImage ? (
                          <img src={profileImage} alt="Imagem de perfil" className="h-full w-full object-cover" />
                        ) : (
                          <div
                            className={`flex h-full w-full items-center justify-center ${theme === "dark" ? "bg-zinc-800 text-zinc-400" : "bg-slate-100 text-slate-500"}`}
                          >
                            <UserRound className="h-8 w-8" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <label className={`block text-sm ${theme === "dark" ? "text-zinc-300" : "text-slate-700"}`}>Foto de perfil</label>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleProfileImageChange}
                          className={`block w-full text-sm ${theme === "dark" ? "text-zinc-300 file:bg-zinc-800 file:text-zinc-100" : "text-slate-700 file:bg-slate-100 file:text-slate-800"} file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-2`}
                        />
                      </div>
                    </div>
                    <form className="space-y-3" onSubmit={saveProfileName}>
                      <label className={`block text-sm ${theme === "dark" ? "text-zinc-300" : "text-slate-700"}`}>Nome de exibição</label>
                      <input
                        className={inputClass(theme)}
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="Digite o nome do perfil"
                        maxLength={LIMITS.profileNameMax}
                      />
                      <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500">
                        Salvar perfil
                      </button>
                    </form>
                  </section>
                )}
              </div>
            </div>
          </section>
        </main>

        <div
          className={`fixed inset-0 z-40 bg-black/40 transition ${menuOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
          onClick={() => setMenuOpen(false)}
        />
        <aside
          className={`fixed left-0 top-0 z-50 h-full w-[290px] rounded-r-2xl border p-4 shadow-2xl transition-transform duration-300 ${
            theme === "dark" ? "border-zinc-700 bg-zinc-900/95" : "border-slate-200 bg-white/95"
          } ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className={`font-semibold ${theme === "dark" ? "text-zinc-100" : "text-slate-900"}`}>Menu</h3>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className={`rounded-lg border p-1.5 ${
                theme === "dark" ? "border-zinc-700 text-zinc-100 hover:bg-zinc-800" : "border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
              aria-label="Fechar menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex h-[calc(100%-3rem)] flex-col">
            <div className="space-y-2">
              {sections.map((item) => {
                const selected = item.id === active;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateTo(item.id)}
                    className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                      selected
                        ? "border-emerald-500 bg-emerald-500/15"
                        : theme === "dark"
                          ? "border-zinc-700 hover:bg-zinc-800"
                          : "border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span className={`flex items-center gap-2 text-sm font-semibold ${theme === "dark" ? "text-zinc-100" : "text-slate-900"}`}>
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-500"
            >
              <LogOut className="h-4 w-4" />
              Deslogar
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}

export default App;
