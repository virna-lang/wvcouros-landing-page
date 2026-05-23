(function() {
  const supabaseUtils = window.VWSupabase;
  const config = supabaseUtils ? supabaseUtils.getConfig() : {};
  const WHATSAPP_NUMBER = supabaseUtils && supabaseUtils.getWhatsappNumber()
    ? supabaseUtils.getWhatsappNumber()
    : "5585997586148";
  const REMOTE_REFRESH_INTERVAL_MS = supabaseUtils ? supabaseUtils.getRefreshInterval() : 30000;
  const DEFAULT_PAYMENT_TEXT = "A combinar pelo WhatsApp";
  const DEFAULT_DELIVERY_TEXT = "Taxa de entrega a combinar pelo WhatsApp";
  const THEME_STORAGE_KEY = "wvcouros-theme";
  const MODAL_QUERY_PARAM = "produto";
  const HISTORY_ROOT_STATE_KEY = "__wvCatalog";
  const HISTORY_MODAL_PRODUCT_KEY = "__wvModalProduct";
  const HISTORY_MODAL_ENTRY_KEY = "__wvModalEntry";
  const THEME_PREVIEW = new URLSearchParams(window.location.search).get("theme");
  const DEFAULT_STATUS_LABELS = {
    disponivel: "Disponível",
    esgotado: "Esgotado",
    sob_encomenda: "Sob consulta"
  };
  const PRODUCT_DISPLAY_STATUS_LABELS = {
    ativo: "Ativo",
    esgotado: "Esgotado",
    sob_encomenda: "Sob encomenda",
    lancamento: "Lançamento",
    inativo: "Inativo",
    arquivado: "Arquivado"
  };
  const DEFAULT_BADGE_LABELS = {
    lancamento: "Lançamento",
    mais_vendida: "Mais vendida",
    edicao_limitada: "Edição limitada",
    promocao: "Promoção"
  };
  const PRODUCT_TYPE_OPTIONS = ["bolsa", "carteira", "mochila"];
  const PRODUCT_TYPE_LABELS = {
    bolsa: "Bolsa",
    carteira: "Carteira",
    mochila: "Mochila"
  };
  const META_STATUS_PREFIX = "__wv:status:";
  const META_TYPE_PREFIX = "__wv:type:";
  const COLOR_MAP = {
    preto: "#1a1a1a",
    caramelo: "#aa5b2f",
    whisky: "#b4652b",
    bordo: "#6f1b1b",
    cafe: "#4b3025",
    tabaco: "#7b5535"
  };

  const productsGrid = document.getElementById("productsGrid");
  const catalogTypeFilters = document.getElementById("catalogTypeFilters");
  const themeToggle = document.getElementById("themeToggle");
  const navWhatsapp = document.getElementById("navWhatsapp");
  const ctaWhatsapp = document.getElementById("ctaWhatsapp");
  const modal = document.getElementById("modal");
  const modalImage = document.getElementById("modalImage");
  const modalThumbs = document.getElementById("modalThumbs");
  const modalPrev = document.getElementById("modalPrev");
  const modalNext = document.getElementById("modalNext");
  const modalVisualFrame = document.getElementById("modalVisualFrame");
  const modalName = document.getElementById("modalName");
  const modalDescription = document.getElementById("modalDescription");
  const modalPrice = document.getElementById("modalPrice");
  const modalColors = document.getElementById("modalColors");
  const modalFeatures = document.getElementById("modalFeatures");
  const modalPayment = document.getElementById("modalPayment");
  const modalDelivery = document.getElementById("modalDelivery");
  const modalWhatsapp = document.getElementById("modalWhatsapp");
  const modalColorsSection = document.getElementById("modalColorsSection");
  const modalBadge = document.getElementById("modalBadge");
  const modalStatusNote = document.getElementById("modalStatusNote");
  const modalVisualStatus = document.getElementById("modalVisualStatus");

  let products = [];
  let siteSettings = {
    whatsapp_number: WHATSAPP_NUMBER,
    default_payment_text: DEFAULT_PAYMENT_TEXT,
    default_delivery_text: DEFAULT_DELIVERY_TEXT
  };
  let badgeLabels = Object.assign({}, DEFAULT_BADGE_LABELS);
  let currentProduct = null;
  let currentColorId = null;
  let currentImage = null;
  let currentGallery = [];
  let activeProductType = "all";
  let remoteRefreshTimer = null;
  let isRemoteLoading = false;

  function ensureCatalogHistoryState() {
    if (!window.history || typeof window.history.replaceState !== "function") {
      return;
    }

    const baseState = Object.assign({}, window.history.state || {});
    if (baseState[HISTORY_ROOT_STATE_KEY]) {
      return;
    }

    baseState[HISTORY_ROOT_STATE_KEY] = true;
    window.history.replaceState(baseState, "", window.location.href);
  }

  function readProductRouteId() {
    return String(new URLSearchParams(window.location.search).get(MODAL_QUERY_PARAM) || "").trim();
  }

  function getProductRouteId(product) {
    if (!product) {
      return "";
    }

    return String(product.slug || product.id || "").trim();
  }

  function buildCatalogUrl(productRouteId) {
    const url = new URL(window.location.href);

    if (productRouteId) {
      url.searchParams.set(MODAL_QUERY_PARAM, productRouteId);
    } else {
      url.searchParams.delete(MODAL_QUERY_PARAM);
    }

    return url.toString();
  }

  function buildHistoryState(productRouteId, entryType) {
    const nextState = Object.assign({}, window.history.state || {});
    nextState[HISTORY_ROOT_STATE_KEY] = true;

    delete nextState[HISTORY_MODAL_PRODUCT_KEY];
    delete nextState[HISTORY_MODAL_ENTRY_KEY];

    if (productRouteId) {
      nextState[HISTORY_MODAL_PRODUCT_KEY] = productRouteId;
      nextState[HISTORY_MODAL_ENTRY_KEY] = entryType || "push";
    }

    return nextState;
  }

  function findProductByRouteId(routeId) {
    const normalizedRouteId = String(routeId || "").trim();
    if (!normalizedRouteId) {
      return null;
    }

    return products.find(function(product) {
      return product.id === normalizedRouteId || product.slug === normalizedRouteId;
    }) || null;
  }

  function finalizeModalClose() {
    modal.classList.remove("active");
    document.body.style.overflow = "";
    currentProduct = null;
    currentColorId = null;
    currentImage = null;
    currentGallery = [];
    modalImage.src = "";
    modalImage.alt = "";
    modalThumbs.innerHTML = "";
    updateNavButtons();
  }

  function syncModalWithLocation() {
    const routeProductId = readProductRouteId();
    const productFromRoute = findProductByRouteId(routeProductId);

    if (!productFromRoute) {
      if (routeProductId && window.history && typeof window.history.replaceState === "function") {
        window.history.replaceState(buildHistoryState(), "", buildCatalogUrl());
      }
      if (modal.classList.contains("active")) {
        finalizeModalClose();
      }
      return false;
    }

    const currentState = window.history ? (window.history.state || {}) : {};
    if (!currentState[HISTORY_MODAL_PRODUCT_KEY] && window.history && typeof window.history.replaceState === "function") {
      window.history.replaceState(
        buildHistoryState(routeProductId, "direct"),
        "",
        buildCatalogUrl(routeProductId)
      );
    }

    openModal(productFromRoute, { skipHistory: true });
    return true;
  }

  function readStoredThemePreference() {
    try {
      return window.localStorage.getItem(THEME_STORAGE_KEY) || "";
    } catch (error) {
      return "";
    }
  }

  function saveThemePreference(theme) {
    try {
      if (theme === "light" || theme === "dark") {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
      } else {
        window.localStorage.removeItem(THEME_STORAGE_KEY);
      }
    } catch (error) {
      // Se o navegador bloquear storage, o tema segue funcional so nesta visita.
    }
  }

  function resolveThemePreference(preference) {
    if (THEME_PREVIEW === "dark" || THEME_PREVIEW === "light") {
      return THEME_PREVIEW;
    }
    return preference === "dark" ? "dark" : "light";
  }

  function applyTheme(theme) {
    const resolvedTheme = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", resolvedTheme);
    document.documentElement.style.colorScheme = resolvedTheme;

    if (!themeToggle) {
      return;
    }

    const nextLabel = resolvedTheme === "dark" ? "Ativar modo claro" : "Ativar modo escuro";
    themeToggle.dataset.theme = resolvedTheme;
    themeToggle.setAttribute("aria-label", nextLabel);
    themeToggle.setAttribute("title", nextLabel);
  }

  function initializeThemeToggle() {
    applyTheme(resolveThemePreference(readStoredThemePreference()));

    if (!themeToggle) {
      return;
    }

    themeToggle.addEventListener("click", function() {
      const currentTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      saveThemePreference(nextTheme);
      applyTheme(nextTheme);
    });
  }

  function parseList(value) {
    if (Array.isArray(value)) {
      return value.map(function(item) {
        return String(item || "").trim();
      }).filter(Boolean);
    }

    const text = String(value || "").trim();
    if (!text) {
      return [];
    }

    const separator = text.indexOf("|") >= 0 ? "|" : (text.indexOf("\n") >= 0 ? "\n" : ",");
    return text.split(separator).map(function(item) {
      return String(item || "").trim();
    }).filter(Boolean);
  }

  function uniqueList(items) {
    const seen = new Set();
    return (Array.isArray(items) ? items : []).reduce(function(list, item) {
      const value = String(item || "").trim();
      if (!value || seen.has(value)) {
        return list;
      }
      seen.add(value);
      list.push(value);
      return list;
    }, []);
  }

  function parsePrice(value) {
    if (typeof value === "number") {
      return value;
    }

    const normalized = String(value || "")
      .replace(/\./g, "")
      .replace(",", ".")
      .replace(/[^\d.-]/g, "");

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function slugify(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function formatPrice(value) {
    return Number(value).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function(char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
      }[char];
    });
  }

  function colorHex(name) {
    return COLOR_MAP[slugify(name)] || "#b38d73";
  }

  function inferProductTypes(name) {
    const normalized = slugify(name);
    if (normalized.indexOf("carteira") >= 0) {
      return ["carteira"];
    }
    if (normalized.indexOf("mochila") >= 0) {
      return ["mochila"];
    }
    return ["bolsa"];
  }

  function normalizeProductTypes(values, productName) {
    const allowed = new Set(PRODUCT_TYPE_OPTIONS);
    const seen = new Set();
    const normalized = (Array.isArray(values) ? values : []).reduce(function(list, value) {
      const code = slugify(value);
      if (!allowed.has(code) || seen.has(code)) {
        return list;
      }
      seen.add(code);
      list.push(code);
      return list;
    }, []);

    return normalized.length ? normalized : inferProductTypes(productName);
  }

  function extractProductMeta(features, catalogStatus, badgeCode, productName) {
    const visibleFeatures = [];
    const productTypes = [];
    let displayStatus = "";

    (Array.isArray(features) ? features : []).forEach(function(item) {
      const value = String(item || "").trim();
      if (!value) {
        return;
      }
      if (value.indexOf(META_TYPE_PREFIX) === 0) {
        productTypes.push(value.slice(META_TYPE_PREFIX.length));
        return;
      }
      if (value.indexOf(META_STATUS_PREFIX) === 0) {
        displayStatus = value.slice(META_STATUS_PREFIX.length) || displayStatus;
        return;
      }
      visibleFeatures.push(value);
    });

    const normalizedCatalogStatus = String(catalogStatus || "ativo").trim();
    if (!displayStatus) {
      if (normalizedCatalogStatus === "arquivado" || normalizedCatalogStatus === "inativo") {
        displayStatus = normalizedCatalogStatus;
      } else if (String(badgeCode || "").trim() === "lancamento") {
        displayStatus = "lancamento";
      } else {
        displayStatus = "ativo";
      }
    }

    return {
      visibleFeatures: visibleFeatures,
      productTypes: normalizeProductTypes(productTypes, productName),
      displayStatus: displayStatus
    };
  }

  function buildDefaultWhatsappLink() {
    return buildWhatsappUrl("Olá! Quero atendimento sobre as bolsas da VW Couros.");
  }

  function currentWhatsappNumber() {
    return String(siteSettings.whatsapp_number || WHATSAPP_NUMBER).replace(/[^\d]/g, "") || WHATSAPP_NUMBER;
  }

  function buildWhatsappUrl(message) {
    return "https://wa.me/" + currentWhatsappNumber() + "?text=" + encodeURIComponent(message);
  }

  function refreshGlobalWhatsappLinks() {
    navWhatsapp.href = buildDefaultWhatsappLink();
    ctaWhatsapp.href = buildDefaultWhatsappLink();
  }

  function buildWhatsappLink(product, colorRecord, availabilityState) {
    const colorPart = colorRecord ? " na cor " + colorRecord.name : "";
    const currentAvailability = availabilityState || getAvailabilityState(product, colorRecord);
    const isConsultation = currentAvailability.code !== "disponivel";
    const message = isConsultation
      ? "Olá! Quero consultar a disponibilidade da " + product.name + colorPart + "."
      : "Olá, estou interessada na " + product.name + colorPart + " no valor de " + formatPrice(product.price) + ".";

    return buildWhatsappUrl(message);
  }

  function statusLabel(code) {
    return DEFAULT_STATUS_LABELS[code] || "Disponível";
  }

  function productStatusLabel(code) {
    return PRODUCT_DISPLAY_STATUS_LABELS[code] || PRODUCT_DISPLAY_STATUS_LABELS.ativo;
  }

  function badgeLabel(code) {
    return badgeLabels[code] || DEFAULT_BADGE_LABELS[code] || "";
  }

  function getExtraBadgeLabel(product) {
    if (!product || !product.badgeLabel) {
      return "";
    }
    if (product.displayStatus === "lancamento" && product.badgeCode === "lancamento") {
      return "";
    }
    return product.badgeLabel;
  }

  function getCardStatus(product, colorRecord) {
    const productStatus = String(product && product.displayStatus || "ativo").trim();
    const colorStatus = colorRecord ? colorRecord.status : "disponivel";

    if (productStatus === "esgotado") {
      return { code: "esgotado", label: productStatusLabel(productStatus) };
    }
    if (colorStatus === "esgotado") {
      return { code: "esgotado", label: colorRecord.statusLabel || statusLabel(colorStatus) };
    }
    if (productStatus === "sob_encomenda") {
      return { code: "sob_encomenda", label: productStatusLabel(productStatus) };
    }
    if (colorStatus === "sob_encomenda") {
      return { code: "sob_encomenda", label: colorRecord.statusLabel || statusLabel(colorStatus) };
    }
    return null;
  }

  function getAvailabilityState(product, colorRecord) {
    const productStatus = String(product && product.displayStatus || "ativo").trim();
    const colorStatus = colorRecord ? colorRecord.status : "disponivel";

    if (productStatus === "esgotado") {
      return { code: "esgotado", label: productStatusLabel(productStatus) };
    }
    if (colorStatus === "esgotado") {
      return { code: "esgotado", label: colorRecord.statusLabel || statusLabel(colorStatus) };
    }
    if (productStatus === "sob_encomenda") {
      return { code: "sob_encomenda", label: productStatusLabel(productStatus) };
    }
    if (colorStatus === "sob_encomenda") {
      return { code: "sob_encomenda", label: colorRecord.statusLabel || statusLabel(colorStatus) };
    }

    return { code: "disponivel", label: statusLabel("disponivel") };
  }

  function getFilteredProducts() {
    if (activeProductType === "all") {
      return products.slice();
    }

    return products.filter(function(product) {
      return Array.isArray(product.productTypes) && product.productTypes.indexOf(activeProductType) >= 0;
    });
  }

  function renderTypeFilters() {
    if (!catalogTypeFilters) {
      return;
    }

    const options = [{ value: "all", label: "Todos" }].concat(PRODUCT_TYPE_OPTIONS.map(function(type) {
      return {
        value: type,
        label: PRODUCT_TYPE_LABELS[type]
      };
    }));

    catalogTypeFilters.innerHTML = options.map(function(option) {
      const className = option.value === activeProductType ? "catalog-filter-btn active" : "catalog-filter-btn";
      return '<button type="button" class="' + className + '" data-type-filter="' + escapeHtml(option.value) + '">' + escapeHtml(option.label) + "</button>";
    }).join("");

    catalogTypeFilters.querySelectorAll("[data-type-filter]").forEach(function(button) {
      button.addEventListener("click", function() {
        activeProductType = button.getAttribute("data-type-filter") || "all";
        renderTypeFilters();
        renderProducts();
      });
    });
  }

  function getDefaultColor(product) {
    if (!product || !Array.isArray(product.colors) || !product.colors.length) {
      return null;
    }

    return product.colors.find(function(color) {
      return color.status === "disponivel";
    }) || product.colors[0];
  }

  function getColorById(product, colorId) {
    if (!product || !Array.isArray(product.colors) || !colorId) {
      return null;
    }

    return product.colors.find(function(color) {
      return color.id === colorId;
    }) || null;
  }

  function getPrimaryImage(product, colorRecord) {
    const color = colorRecord || getDefaultColor(product);

    if (color && color.primaryImageUrl) {
      return color.primaryImageUrl;
    }

    if (color && Array.isArray(color.images) && color.images.length) {
      return color.images[0];
    }

    if (Array.isArray(product.images) && product.images.length) {
      return product.images[0];
    }

    return "";
  }

  function getGalleryImages(product, colorRecord) {
    const seen = new Set();
    const list = [];

    function add(url) {
      const value = String(url || "").trim();
      if (!value || seen.has(value)) {
        return;
      }
      seen.add(value);
      list.push(value);
    }

    add(getPrimaryImage(product, colorRecord));

    if (colorRecord) {
      (Array.isArray(colorRecord.images) ? colorRecord.images : []).forEach(add);

      // Se a cor ainda nao tiver galeria propria suficiente, aproveita a galeria geral como apoio.
      if (list.length <= 1) {
        (Array.isArray(product.images) ? product.images : []).forEach(add);
      }
    } else {
      (Array.isArray(product.images) ? product.images : []).forEach(add);
    }

    return list;
  }

  function showCatalogMessage(message) {
    productsGrid.innerHTML =
      '<p style="grid-column: 1 / -1; text-align: center; color: var(--muted); font-size: 14px;">' +
      escapeHtml(message) +
      "</p>";
  }

  function showCatalogLoading() {
    productsGrid.innerHTML =
      '<div class="catalog-loader-shell" role="status" aria-live="polite">' +
      '<div class="catalog-loader" aria-label="Carregando catálogo">' +
      '<div class="catalog-loader-word" data-word="VW COUROS" aria-hidden="true">VW COUROS</div>' +
      '<div class="catalog-loader-label">Carregando catálogo</div>' +
      '<p class="catalog-loader-subcopy">Preparando modelos, cores e acabamentos para você.</p>' +
      "</div>" +
      "</div>";
  }

  function setModalImage(url, alt) {
    currentImage = String(url || "").trim();
    modalImage.src = currentImage;
    modalImage.alt = alt || "";
    refreshGalleryControls();
  }

  function refreshGalleryControls() {
    if (!currentProduct) {
      currentGallery = [];
      modalThumbs.innerHTML = "";
      updateNavButtons();
      return;
    }

    const colorRecord = getColorById(currentProduct, currentColorId) || getDefaultColor(currentProduct);
    currentGallery = getGalleryImages(currentProduct, colorRecord);
    if (currentGallery.length && currentGallery.indexOf(currentImage) < 0) {
      currentImage = currentGallery[0];
      modalImage.src = currentImage;
      modalImage.alt = currentProduct ? currentProduct.name : "";
    }
    if (!currentGallery.length) {
      currentImage = "";
      modalImage.src = "";
      modalImage.alt = "";
    }
    renderModalThumbs();
    updateNavButtons();
  }

  function updateNavButtons() {
    const hasMultiple = currentGallery.length > 1;
    if (modalPrev) {
      modalPrev.hidden = !hasMultiple;
    }
    if (modalNext) {
      modalNext.hidden = !hasMultiple;
    }
  }

  function goToGalleryDelta(delta) {
    if (!currentGallery.length) {
      return;
    }

    const currentIndex = currentGallery.indexOf(currentImage);
    const baseIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (baseIndex + delta + currentGallery.length) % currentGallery.length;
    const nextUrl = currentGallery[nextIndex];
    const altLabel = currentProduct
      ? currentProduct.name + " (foto " + (nextIndex + 1) + " de " + currentGallery.length + ")"
      : "";
    setModalImage(nextUrl, altLabel);
  }

  function renderModalThumbs() {
    if (!currentProduct || currentGallery.length <= 1) {
      modalThumbs.innerHTML = "";
      return;
    }

    modalThumbs.innerHTML = currentGallery.map(function(url) {
      const activeClass = url === currentImage ? "modal-thumb active" : "modal-thumb";
      return (
        '<button type="button" class="' +
        activeClass +
        '" data-thumb="' +
        escapeHtml(url) +
        '">' +
        '<img src="' +
        escapeHtml(url) +
        '" alt="' +
        escapeHtml(currentProduct.name) +
        '" />' +
        "</button>"
      );
    }).join("");

    modalThumbs.querySelectorAll("[data-thumb]").forEach(function(button) {
      button.addEventListener("click", function() {
        setModalImage(button.getAttribute("data-thumb"), currentProduct.name);
      });
    });
  }

  function renderProducts() {
    if (!products.length) {
      showCatalogMessage("Nenhum produto disponível no momento.");
      return;
    }

    const visibleProducts = getFilteredProducts();
    if (!visibleProducts.length) {
      showCatalogMessage("Nenhum produto encontrado neste tipo.");
      return;
    }

    productsGrid.innerHTML = visibleProducts.map(function(product) {
      const defaultColor = getDefaultColor(product);
      const primaryImage = getPrimaryImage(product, defaultColor);
      const extraBadgeLabel = getExtraBadgeLabel(product);
      const cardStatus = getCardStatus(product, defaultColor);
      const availabilityState = getAvailabilityState(product, defaultColor);
      const productBadgeLabel = extraBadgeLabel || (product.displayStatus === "lancamento" ? productStatusLabel("lancamento") : "");
      const productBadge = productBadgeLabel
        ? '<span class="product-badge">' + escapeHtml(productBadgeLabel) + "</span>"
        : "";
      const statusBadge = cardStatus
        ? '<span class="product-status-badge is-' + escapeHtml(cardStatus.code) + '">' + escapeHtml(cardStatus.label) + "</span>"
        : "";
      const imageClass = availabilityState.code === "esgotado"
        ? "product-photo is-muted"
        : "product-photo";

      return (
        '<article class="product-card">' +
        '<button type="button" data-product="' + escapeHtml(product.id) + '">' +
        '<div class="product-image">' +
        productBadge +
        statusBadge +
        '<img class="' + imageClass + '" src="' + escapeHtml(primaryImage) + '" alt="' + escapeHtml(product.name) + '" />' +
        "</div>" +
        '<h3 class="product-name">' + escapeHtml(product.name) + "</h3>" +
        '<div class="product-price">' + formatPrice(product.price) + "</div>" +
        "</button>" +
        "</article>"
      );
    }).join("");

    productsGrid.querySelectorAll("[data-product]").forEach(function(button) {
      button.addEventListener("click", function() {
        const product = products.find(function(item) {
          return item.id === button.getAttribute("data-product");
        });
        openModal(product);
      });
    });
  }

  function setCtaState(product, colorRecord, availabilityState) {
    const currentAvailability = availabilityState || getAvailabilityState(product, colorRecord);
    const isSoldOut = currentAvailability.code === "esgotado";
    const isConsultation = currentAvailability.code === "sob_encomenda" || currentAvailability.code === "esgotado";

    modalWhatsapp.textContent = isConsultation ? "Sob consulta" : "Comprar pelo WhatsApp";
    modalWhatsapp.classList.toggle("is-disabled", isSoldOut);
    modalWhatsapp.setAttribute("aria-disabled", isSoldOut ? "true" : "false");

    if (isSoldOut) {
      modalWhatsapp.removeAttribute("href");
      modalWhatsapp.setAttribute("tabindex", "-1");
    } else {
      modalWhatsapp.href = buildWhatsappLink(product, colorRecord, currentAvailability);
      modalWhatsapp.removeAttribute("tabindex");
    }
  }

  function renderCurrentStatus(product, colorRecord) {
    const availabilityState = getAvailabilityState(product, colorRecord);
    const currentStatus = availabilityState.code;
    const currentLabel = availabilityState.label;
    const isMuted = currentStatus === "esgotado";
    const launchBadge = product.displayStatus === "lancamento";
    const extraBadgeLabel = getExtraBadgeLabel(product);

    modalImage.classList.toggle("is-muted", isMuted);
    modalVisualStatus.hidden = currentStatus === "disponivel";
    modalVisualStatus.textContent = currentStatus === "disponivel" ? "" : currentLabel;

    if (launchBadge || extraBadgeLabel) {
      modalBadge.hidden = false;
      modalBadge.textContent = launchBadge ? productStatusLabel("lancamento") : extraBadgeLabel;
      modalBadge.classList.toggle("is-lancamento", launchBadge);
    } else {
      modalBadge.hidden = true;
      modalBadge.textContent = "";
      modalBadge.classList.remove("is-lancamento");
    }

    if (currentStatus === "esgotado") {
      modalStatusNote.hidden = false;
      modalStatusNote.textContent = "Esta cor continua visível no catálogo, mas está indisponível no momento.";
    } else if (currentStatus === "sob_encomenda") {
      modalStatusNote.hidden = false;
      modalStatusNote.textContent = "Esta cor está disponível sob consulta.";
    } else {
      modalStatusNote.hidden = true;
      modalStatusNote.textContent = "";
    }

    setCtaState(product, colorRecord, availabilityState);
  }

  function renderModalColors(product) {
    if (!product.colors || !product.colors.length) {
      modalColorsSection.style.display = "none";
      return;
    }

    modalColorsSection.style.display = "";
    modalColors.innerHTML = product.colors.map(function(color) {
      const activeClass = color.id === currentColorId ? "color-option active" : "color-option";
      const statusChip = color.status !== "disponivel"
        ? '<span class="color-status is-' + escapeHtml(color.status) + '">' + escapeHtml(color.statusLabel) + "</span>"
        : "";

      return (
        '<button type="button" class="' + activeClass + '" data-color-id="' + escapeHtml(color.id) + '">' +
        '<span class="color-dot" style="background:' + colorHex(color.name) + '"></span>' +
        '<span>' + escapeHtml(color.name) + "</span>" +
        statusChip +
        "</button>"
      );
    }).join("");

    modalColors.querySelectorAll("[data-color-id]").forEach(function(button) {
      button.addEventListener("click", function() {
        currentColorId = button.getAttribute("data-color-id");
        const colorRecord = getColorById(product, currentColorId);
        const colorImage = getPrimaryImage(product, colorRecord);
        setModalImage(colorImage, product.name + " na cor " + colorRecord.name);
        renderModalColors(product);
        renderCurrentStatus(product, colorRecord);
      });
    });
  }

  function openModal(product, options) {
    if (!product) {
      return;
    }

    const modalOptions = options || {};
    const productRouteId = getProductRouteId(product);

    currentProduct = product;
    const defaultColor = getDefaultColor(product);
    currentColorId = defaultColor ? defaultColor.id : null;

    const initialImage = getPrimaryImage(product, defaultColor);
    setModalImage(initialImage, product.name);
    modalName.textContent = product.name;
    modalDescription.textContent = product.description;
    modalPrice.textContent = formatPrice(product.price);
    modalPayment.textContent = product.payment;
    modalDelivery.textContent = product.delivery;
    modalFeatures.innerHTML = (Array.isArray(product.features) ? product.features : []).map(function(feature) {
      return "<li>" + escapeHtml(feature) + "</li>";
    }).join("");

    renderModalColors(product);
    renderCurrentStatus(product, defaultColor);
    modal.classList.add("active");
    document.body.style.overflow = "hidden";

    if (!modalOptions.skipHistory && productRouteId && window.history) {
      window.history.pushState(
        buildHistoryState(productRouteId, "push"),
        "",
        buildCatalogUrl(productRouteId)
      );
    }
  }

  function closeModal(options) {
    if (!modal.classList.contains("active")) {
      return;
    }

    const modalOptions = options || {};
    const currentState = window.history ? (window.history.state || {}) : {};
    const modalEntryType = String(currentState[HISTORY_MODAL_ENTRY_KEY] || "").trim();

    if (!modalOptions.skipHistory && window.history) {
      if (modalEntryType === "push" && typeof window.history.back === "function") {
        window.history.back();
        return;
      }

      if (modalEntryType === "direct" && typeof window.history.replaceState === "function") {
        window.history.replaceState(buildHistoryState(), "", buildCatalogUrl());
      }
    }

    finalizeModalClose();
  }

  window.closeModal = closeModal;

  document.addEventListener("keydown", function(event) {
    if (!modal.classList.contains("active")) {
      return;
    }

    if (event.key === "Escape") {
      closeModal();
      return;
    }

    if (event.key === "ArrowLeft") {
      goToGalleryDelta(-1);
    } else if (event.key === "ArrowRight") {
      goToGalleryDelta(1);
    }
  });

  if (modalPrev) {
    modalPrev.addEventListener("click", function() {
      goToGalleryDelta(-1);
    });
  }

  window.addEventListener("popstate", function() {
    syncModalWithLocation();
  });

  if (modalNext) {
    modalNext.addEventListener("click", function() {
      goToGalleryDelta(1);
    });
  }

  if (modalVisualFrame) {
    let touchStartX = 0;
    let touchStartY = 0;
    let trackingTouch = false;

    modalVisualFrame.addEventListener("touchstart", function(event) {
      if (!event.touches || event.touches.length !== 1) {
        trackingTouch = false;
        return;
      }
      trackingTouch = true;
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
    }, { passive: true });

    modalVisualFrame.addEventListener("touchend", function(event) {
      if (!trackingTouch) {
        return;
      }
      trackingTouch = false;

      const touch = (event.changedTouches && event.changedTouches[0]) || null;
      if (!touch) {
        return;
      }

      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;

      if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
        goToGalleryDelta(deltaX > 0 ? -1 : 1);
      }
    });
  }

  function applySupabaseData(result) {
    if (!result || !Array.isArray(result.products) || !result.products.length) {
      return false;
    }

    products = result.products;
    if (result.siteSettings) {
      siteSettings = result.siteSettings;
    }
    if (result.badgeLabels) {
      badgeLabels = Object.assign({}, DEFAULT_BADGE_LABELS, result.badgeLabels);
    }

    renderTypeFilters();
    renderProducts();
    refreshGlobalWhatsappLinks();

    if (currentProduct) {
      const updatedProduct = products.find(function(item) {
        return item.id === currentProduct.id;
      });

      if (updatedProduct) {
        openModal(updatedProduct, { skipHistory: true });
      } else {
        if (window.history && typeof window.history.replaceState === "function") {
          window.history.replaceState(buildHistoryState(), "", buildCatalogUrl());
        }
        closeModal({ skipHistory: true });
      }
    } else {
      syncModalWithLocation();
    }

    return true;
  }

  function applyFallbackProducts() {
    products = [];
    siteSettings = {
      whatsapp_number: WHATSAPP_NUMBER,
      default_payment_text: DEFAULT_PAYMENT_TEXT,
      default_delivery_text: DEFAULT_DELIVERY_TEXT
    };
    badgeLabels = Object.assign({}, DEFAULT_BADGE_LABELS);
    if (catalogTypeFilters) {
      catalogTypeFilters.innerHTML = "";
    }
    refreshGlobalWhatsappLinks();
    showCatalogMessage("Não foi possível carregar o catálogo agora. Tente novamente em instantes.");
  }

  async function loadSupabaseProducts() {
    if (!supabaseUtils || !supabaseUtils.isSupabaseReady()) {
      showCatalogMessage("O catálogo ainda não foi configurado com o Supabase.");
      return;
    }

    if (isRemoteLoading) {
      return;
    }

    isRemoteLoading = true;
    try {
      const client = supabaseUtils.createClient();
      const [
        settingsResult,
        badgesResult,
        productsResult
      ] = await Promise.all([
        client.from("site_settings").select("*").maybeSingle(),
        client.from("badge_options").select("code, label").eq("is_active", true),
        client.from("products")
          .select("id, slug, sku, name, description, features, material, dimensions, price, badge_code, catalog_status, sort_order")
          .eq("catalog_status", "ativo")
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false })
      ]);

      if (productsResult.error) {
        throw productsResult.error;
      }

      const productRows = Array.isArray(productsResult.data) ? productsResult.data : [];
      const productIds = productRows.map(function(item) {
        return item.id;
      });

      let colorRows = [];
      let imageRows = [];
      if (productIds.length) {
        const [colorsResult, imagesResult] = await Promise.all([
          client.from("product_colors")
            .select("id, product_id, color_name, color_slug, stock_quantity, color_status, primary_image_url, sort_order")
            .in("product_id", productIds)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true }),
          client.from("product_images")
            .select("id, product_id, product_color_id, public_url, alt_text, is_primary, sort_order")
            .in("product_id", productIds)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true })
        ]);

        if (colorsResult.error) {
          throw colorsResult.error;
        }
        if (imagesResult.error) {
          throw imagesResult.error;
        }

        colorRows = Array.isArray(colorsResult.data) ? colorsResult.data : [];
        imageRows = Array.isArray(imagesResult.data) ? imagesResult.data : [];
      }

      const normalized = normalizeSupabaseProducts({
        siteSettings: settingsResult.data || null,
        badges: Array.isArray(badgesResult.data) ? badgesResult.data : [],
        products: productRows,
        colors: colorRows,
        images: imageRows
      });

      if (!applySupabaseData(normalized)) {
        applyFallbackProducts();
      }
    } catch (error) {
      console.error("Falha ao carregar catálogo do Supabase:", error);
      applyFallbackProducts();
    } finally {
      isRemoteLoading = false;
    }
  }

  function normalizeSupabaseProducts(payload) {
    const settings = payload.siteSettings || {};
    const paymentText = String(settings.default_payment_text || DEFAULT_PAYMENT_TEXT).trim();
    const deliveryText = String(settings.default_delivery_text || DEFAULT_DELIVERY_TEXT).trim();
    const mappedBadges = (payload.badges || []).reduce(function(map, badge) {
      const code = String(badge.code || "").trim();
      if (code) {
        map[code] = String(badge.label || badgeLabel(code) || code).trim();
      }
      return map;
    }, {});
    const imagesByProduct = {};
    const imagesByColor = {};

    (payload.images || []).forEach(function(image) {
      const row = {
        id: image.id,
        url: supabaseUtils.resolvePublicImage(image.public_url),
        isPrimary: Boolean(image.is_primary),
        sortOrder: Number(image.sort_order || 0) || 0
      };

      if (image.product_color_id) {
        if (!imagesByColor[image.product_color_id]) {
          imagesByColor[image.product_color_id] = [];
        }
        imagesByColor[image.product_color_id].push(row);
        return;
      }

      if (!imagesByProduct[image.product_id]) {
        imagesByProduct[image.product_id] = [];
      }
      imagesByProduct[image.product_id].push(row);
    });

    const colorsByProduct = {};
    (payload.colors || []).forEach(function(color) {
      if (!colorsByProduct[color.product_id]) {
        colorsByProduct[color.product_id] = [];
      }

      const colorImages = uniqueList([
        color.primary_image_url
      ].concat((imagesByColor[color.id] || []).sort(sortByPrimaryThenOrder).map(function(item) {
        return item.url;
      })));

      colorsByProduct[color.product_id].push({
        id: color.id,
        name: String(color.color_name || "").trim(),
        slug: String(color.color_slug || "").trim(),
        stockQuantity: color.stock_quantity == null ? null : Number(color.stock_quantity),
        status: String(color.color_status || "disponivel").trim(),
        statusLabel: statusLabel(String(color.color_status || "disponivel").trim()),
        primaryImageUrl: String(color.primary_image_url || "").trim(),
        images: colorImages,
        sortOrder: Number(color.sort_order || 0) || 0
      });
    });

    const normalizedProducts = (payload.products || []).map(function(product) {
      const catalogStatus = String(product.catalog_status || "ativo").trim();
      const meta = extractProductMeta(product.features, catalogStatus, product.badge_code, product.name);
      const generalImages = uniqueList((imagesByProduct[product.id] || []).sort(sortByPrimaryThenOrder).map(function(item) {
        return item.url;
      }));

      const productColors = (colorsByProduct[product.id] || []).sort(function(a, b) {
        return (a.sortOrder || 0) - (b.sortOrder || 0);
      });

      return {
        id: product.id,
        slug: String(product.slug || "").trim(),
        sku: String(product.sku || "").trim(),
        name: String(product.name || "").trim(),
        description: String(product.description || "").trim(),
        material: String(product.material || "").trim(),
        dimensions: String(product.dimensions || "").trim(),
        price: Number(product.price || 0),
        catalogStatus: catalogStatus,
        displayStatus: meta.displayStatus,
        badgeCode: String(product.badge_code || "").trim(),
        badgeLabel: badgeLabel(String(product.badge_code || "").trim()),
        payment: paymentText,
        delivery: deliveryText,
        productTypes: meta.productTypes,
        features: meta.visibleFeatures,
        images: generalImages,
        colors: productColors,
        sortOrder: Number(product.sort_order || 0) || 0
      };
    }).sort(function(a, b) {
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });

    return {
      siteSettings: {
        whatsapp_number: String(settings.whatsapp_number || WHATSAPP_NUMBER).trim(),
        default_payment_text: paymentText,
        default_delivery_text: deliveryText
      },
      badgeLabels: mappedBadges,
      products: normalizedProducts
    };
  }

  function sortByPrimaryThenOrder(a, b) {
    if (a.isPrimary === b.isPrimary) {
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    }
    return a.isPrimary ? -1 : 1;
  }

  function loadCatalog() {
    return loadSupabaseProducts();
  }

  function startRemoteAutoRefresh() {
    if (remoteRefreshTimer) {
      return;
    }

    remoteRefreshTimer = window.setInterval(function() {
      loadCatalog();
    }, REMOTE_REFRESH_INTERVAL_MS);
  }

  document.getElementById("year").textContent = new Date().getFullYear();
  ensureCatalogHistoryState();
  initializeThemeToggle();
  refreshGlobalWhatsappLinks();
  showCatalogLoading();
  loadCatalog();
  startRemoteAutoRefresh();

  document.addEventListener("visibilitychange", function() {
    if (!document.hidden) {
      loadCatalog();
    }
  });
})();
