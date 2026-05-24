(function() {
  const clientCache = {
    public: null,
    admin: null
  };

  function getConfig() {
    return window.VW_CONFIG && typeof window.VW_CONFIG === "object" ? window.VW_CONFIG : {};
  }

  function getSupabaseConfig() {
    const config = getConfig();
    return {
      url: String(config.supabaseUrl || "").trim(),
      anonKey: String(config.supabaseAnonKey || "").trim(),
      bucket: String(config.supabaseBucket || "product-images").trim() || "product-images"
    };
  }

  function isSupabaseReady() {
    const config = getSupabaseConfig();
    return Boolean(config.url && config.anonKey && window.supabase && typeof window.supabase.createClient === "function");
  }

  function ensureSupabaseSdk() {
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      throw new Error("SDK do Supabase nao carregado.");
    }
  }

  function buildClient(mode) {
    const config = getSupabaseConfig();
    if (!config.url || !config.anonKey) {
      throw new Error("Supabase nao configurado.");
    }

    ensureSupabaseSdk();

    const isPublicClient = mode === "public";
    return window.supabase.createClient(config.url, config.anonKey, {
      auth: isPublicClient
        ? {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        : {
            storageKey: "wvcouros-admin-auth",
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
    });
  }

  function getPublicClient() {
    if (!clientCache.public) {
      clientCache.public = buildClient("public");
    }
    return clientCache.public;
  }

  function getAdminClient() {
    if (!clientCache.admin) {
      clientCache.admin = buildClient("admin");
    }
    return clientCache.admin;
  }

  function createClient(options) {
    const mode = options && options.mode === "public" ? "public" : "admin";
    return mode === "public" ? getPublicClient() : getAdminClient();
  }

  function getWhatsappNumber() {
    const config = getConfig();
    return String(config.whatsappNumber || "").replace(/[^\d]/g, "");
  }

  function getRefreshInterval() {
    const config = getConfig();
    const value = Number(config.remoteRefreshIntervalMs);
    return Number.isFinite(value) && value > 0 ? value : 30000;
  }

  function encodeStoragePath(path) {
    return String(path || "")
      .split("/")
      .filter(Boolean)
      .map(function(part) {
        return encodeURIComponent(part);
      })
      .join("/");
  }

  function buildPublicStorageUrl(path) {
    const config = getSupabaseConfig();
    if (!config.url) {
      return String(path || "").trim();
    }

    const normalizedBase = config.url.replace(/\/+$/, "");
    const encodedBucket = encodeURIComponent(config.bucket);
    const encodedPath = encodeStoragePath(path);
    return normalizedBase + "/storage/v1/object/public/" + encodedBucket + "/" + encodedPath;
  }

  function resolvePublicImage(value) {
    const text = String(value || "").trim();
    if (!text) {
      return "";
    }

    if (/^(https?:)?\/\//i.test(text) || /^data:/i.test(text) || /^blob:/i.test(text)) {
      return text;
    }

    if (/^(?:\.{0,2}\/)?assets\//i.test(text) || /^\/assets\//i.test(text) || /^\.\.?\//.test(text)) {
      return text;
    }

    const config = getSupabaseConfig();
    const bucket = String(config.bucket || "").trim();
    let path = text.replace(/^\/+/, "");

    if (/^storage\/v1\/object\/public\//i.test(path)) {
      const bucketPrefix = "storage/v1/object/public/" + bucket + "/";
      if (path.indexOf(bucketPrefix) === 0) {
        path = path.slice(bucketPrefix.length);
      }
    }

    if (bucket && path.indexOf(bucket + "/") === 0) {
      path = path.slice(bucket.length + 1);
    }

    if (!/^products\//i.test(path) && path.indexOf("storage/v1/object/public/") !== 0) {
      return text;
    }

    return buildPublicStorageUrl(path);
  }

  window.VWSupabase = {
    getConfig: getConfig,
    getSupabaseConfig: getSupabaseConfig,
    isSupabaseReady: isSupabaseReady,
    createClient: createClient,
    getPublicClient: getPublicClient,
    getAdminClient: getAdminClient,
    getWhatsappNumber: getWhatsappNumber,
    getRefreshInterval: getRefreshInterval,
    resolvePublicImage: resolvePublicImage
  };
})();
