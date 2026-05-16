(function() {
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

  function createClient() {
    const config = getSupabaseConfig();
    if (!config.url || !config.anonKey) {
      throw new Error("Supabase nao configurado.");
    }

    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      throw new Error("SDK do Supabase nao carregado.");
    }

    return window.supabase.createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
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

  function resolvePublicImage(value) {
    const text = String(value || "").trim();
    return text;
  }

  window.VWSupabase = {
    getConfig: getConfig,
    getSupabaseConfig: getSupabaseConfig,
    isSupabaseReady: isSupabaseReady,
    createClient: createClient,
    getWhatsappNumber: getWhatsappNumber,
    getRefreshInterval: getRefreshInterval,
    resolvePublicImage: resolvePublicImage
  };
})();
