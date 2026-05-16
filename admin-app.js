(function() {
  const supabaseUtils = window.VWSupabase;
  const state = {
    client: null,
    session: null,
    settings: null,
    badges: [],
    products: [],
    currentProductId: null,
    removedColorIds: []
  };

  const els = {
    authWrap: document.getElementById("authWrap"),
    dashboard: document.getElementById("dashboard"),
    configMessage: document.getElementById("configMessage"),
    authMessage: document.getElementById("authMessage"),
    settingsMessage: document.getElementById("settingsMessage"),
    productMessage: document.getElementById("productMessage"),
    colorsMessage: document.getElementById("colorsMessage"),
    galleryMessage: document.getElementById("galleryMessage"),
    loginForm: document.getElementById("loginForm"),
    loginButton: document.getElementById("loginButton"),
    logoutButton: document.getElementById("logoutButton"),
    settingsForm: document.getElementById("settingsForm"),
    productForm: document.getElementById("productForm"),
    galleryUploadForm: document.getElementById("galleryUploadForm"),
    summaryGrid: document.getElementById("summaryGrid"),
    productList: document.getElementById("productList"),
    productSearch: document.getElementById("productSearch"),
    newProductButton: document.getElementById("newProductButton"),
    archiveProductButton: document.getElementById("archiveProductButton"),
    addColorButton: document.getElementById("addColorButton"),
    saveColorsButton: document.getElementById("saveColorsButton"),
    colorRows: document.getElementById("colorRows"),
    galleryList: document.getElementById("galleryList"),
    galleryTargetColor: document.getElementById("galleryTargetColor"),
    productBadge: document.getElementById("productBadge")
  };

  const forms = {
    settingsWhatsapp: document.getElementById("settingsWhatsapp"),
    settingsPayment: document.getElementById("settingsPayment"),
    settingsDelivery: document.getElementById("settingsDelivery"),
    productName: document.getElementById("productName"),
    productSlug: document.getElementById("productSlug"),
    productSku: document.getElementById("productSku"),
    productPrice: document.getElementById("productPrice"),
    productStatus: document.getElementById("productStatus"),
    productBadge: document.getElementById("productBadge"),
    productOrder: document.getElementById("productOrder"),
    productMaterial: document.getElementById("productMaterial"),
    productDimensions: document.getElementById("productDimensions"),
    productDescription: document.getElementById("productDescription"),
    productFeatures: document.getElementById("productFeatures"),
    galleryFiles: document.getElementById("galleryFiles"),
    galleryAlt: document.getElementById("galleryAlt")
  };

  function showMessage(element, text, type) {
    if (!element) {
      return;
    }

    const content = String(text || "").trim();
    if (!content) {
      element.textContent = "";
      element.className = "message";
      return;
    }

    element.textContent = content;
    element.className = "message show " + (type || "info");

    if (type === "error") {
      element.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }
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

  function sanitizeFileName(name) {
    return String(name || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9._-]/g, "");
  }

  function parseFeatureLines(value) {
    return String(value || "")
      .split(/\r?\n/)
      .map(function(line) {
        return line.trim();
      })
      .filter(Boolean);
  }

  function formatPrice(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function getCurrentProduct() {
    return state.products.find(function(product) {
      return product.id === state.currentProductId;
    }) || null;
  }

  function getStatusLabel(status) {
    return {
      ativo: "Ativo",
      inativo: "Inativo",
      arquivado: "Arquivado",
      disponivel: "Disponivel",
      esgotado: "Esgotado",
      sob_encomenda: "Sob encomenda"
    }[status] || status;
  }

  function setAuthView(isAuthenticated) {
    els.authWrap.classList.toggle("hidden", isAuthenticated);
    els.dashboard.classList.toggle("hidden", !isAuthenticated);
    els.logoutButton.classList.toggle("hidden", !isAuthenticated);
  }

  function fillBadgeOptions() {
    forms.productBadge.innerHTML = ['<option value="">Sem selo</option>']
      .concat(state.badges.map(function(badge) {
        return '<option value="' + escapeHtml(badge.code) + '">' + escapeHtml(badge.label) + "</option>";
      }))
      .join("");
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, function(char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
      }[char];
    });
  }

  function mapDashboardData(payload) {
    const settings = payload.settings || null;
    const badges = Array.isArray(payload.badges) ? payload.badges : [];
    const imagesByProduct = {};
    const imagesByColor = {};
    const colorsByProduct = {};

    (payload.images || []).forEach(function(image) {
      if (image.product_color_id) {
        if (!imagesByColor[image.product_color_id]) {
          imagesByColor[image.product_color_id] = [];
        }
        imagesByColor[image.product_color_id].push(image);
        return;
      }

      if (!imagesByProduct[image.product_id]) {
        imagesByProduct[image.product_id] = [];
      }
      imagesByProduct[image.product_id].push(image);
    });

    (payload.colors || []).forEach(function(color) {
      if (!colorsByProduct[color.product_id]) {
        colorsByProduct[color.product_id] = [];
      }

      colorsByProduct[color.product_id].push({
        id: color.id,
        name: String(color.color_name || "").trim(),
        slug: String(color.color_slug || "").trim(),
        stockQuantity: color.stock_quantity == null ? "" : String(color.stock_quantity),
        status: String(color.color_status || "disponivel").trim(),
        primaryImagePath: String(color.primary_image_path || "").trim(),
        primaryImageUrl: String(color.primary_image_url || "").trim(),
        sortOrder: Number(color.sort_order || 0) || 0,
        images: (imagesByColor[color.id] || []).slice().sort(sortByOrder)
      });
    });

    const products = (payload.products || []).map(function(product) {
      return {
        id: product.id,
        slug: String(product.slug || "").trim(),
        sku: String(product.sku || "").trim(),
        name: String(product.name || "").trim(),
        description: String(product.description || "").trim(),
        features: Array.isArray(product.features) ? product.features : [],
        material: String(product.material || "").trim(),
        dimensions: String(product.dimensions || "").trim(),
        price: Number(product.price || 0),
        status: String(product.catalog_status || "ativo").trim(),
        badgeCode: String(product.badge_code || "").trim(),
        sortOrder: Number(product.sort_order || 0) || 0,
        colors: (colorsByProduct[product.id] || []).slice().sort(function(a, b) {
          return (a.sortOrder || 0) - (b.sortOrder || 0);
        }),
        images: (imagesByProduct[product.id] || []).slice().sort(sortByOrder)
      };
    }).sort(function(a, b) {
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });

    return {
      settings: settings,
      badges: badges,
      products: products
    };
  }

  function sortByOrder(a, b) {
    return (Number(a.sort_order || a.sortOrder || 0) || 0) - (Number(b.sort_order || b.sortOrder || 0) || 0);
  }

  function renderSummary() {
    const products = state.products;
    const totalProducts = products.length;
    const activeProducts = products.filter(function(product) {
      return product.status === "ativo";
    }).length;
    const totalColors = products.reduce(function(total, product) {
      return total + product.colors.length;
    }, 0);
    const soldOutColors = products.reduce(function(total, product) {
      return total + product.colors.filter(function(color) {
        return color.status === "esgotado";
      }).length;
    }, 0);

    els.summaryGrid.innerHTML = [
      buildSummaryCard("Produtos", totalProducts),
      buildSummaryCard("Ativos", activeProducts),
      buildSummaryCard("Cores", totalColors),
      buildSummaryCard("Esgotadas", soldOutColors)
    ].join("");
  }

  function buildSummaryCard(label, value) {
    return (
      '<article class="panel summary-card">' +
      "<span>" + escapeHtml(label) + "</span>" +
      "<strong>" + escapeHtml(String(value)) + "</strong>" +
      "</article>"
    );
  }

  function renderSettings() {
    const settings = state.settings || {
      whatsapp_number: "",
      default_payment_text: "A combinar pelo WhatsApp",
      default_delivery_text: "Taxa de entrega a combinar pelo WhatsApp"
    };

    forms.settingsWhatsapp.value = String(settings.whatsapp_number || "");
    forms.settingsPayment.value = String(settings.default_payment_text || "");
    forms.settingsDelivery.value = String(settings.default_delivery_text || "");
  }

  function renderProductList() {
    const query = String(els.productSearch.value || "").trim().toLowerCase();
    const filteredProducts = state.products.filter(function(product) {
      if (!query) {
        return true;
      }

      return [product.name, product.sku, product.slug].some(function(value) {
        return String(value || "").toLowerCase().indexOf(query) >= 0;
      });
    });

    if (!filteredProducts.length) {
      els.productList.innerHTML = '<div class="empty-state">Nenhum produto encontrado.</div>';
      return;
    }

    els.productList.innerHTML = filteredProducts.map(function(product) {
      const isActive = product.id === state.currentProductId ? " active" : "";
      const badge = product.badgeCode
        ? '<span class="pill">' + escapeHtml(findBadgeLabel(product.badgeCode)) + "</span>"
        : "";
      return (
        '<button type="button" class="product-item' + isActive + '" data-product-id="' + escapeHtml(product.id) + '">' +
        "<strong>" + escapeHtml(product.name) + "</strong>" +
        '<div class="product-meta">' +
        '<span class="status-pill">' + escapeHtml(getStatusLabel(product.status)) + "</span>" +
        badge +
        "</div>" +
        '<div class="pill-row">' +
        '<span class="pill">SKU ' + escapeHtml(product.sku) + "</span>" +
        '<span class="pill">' + formatPrice(product.price) + "</span>" +
        "</div>" +
        "</button>"
      );
    }).join("");

    els.productList.querySelectorAll("[data-product-id]").forEach(function(button) {
      button.addEventListener("click", function() {
        state.currentProductId = button.getAttribute("data-product-id");
        state.removedColorIds = [];
        renderProductList();
        renderEditor();
      });
    });
  }

  function buildColorRow(color) {
    const wrapper = document.createElement("article");
    wrapper.className = "color-row";
    wrapper.dataset.colorId = color.id || "";
    wrapper.innerHTML =
      '<div class="color-row-top">' +
      "<div>" +
      "<strong>" + escapeHtml(color.name || "Nova cor") + "</strong>" +
      '<p style="color: var(--muted); margin-top: 4px;">Configure estoque, status e imagem principal desta cor.</p>' +
      "</div>" +
      '<div class="inline-actions">' +
      '<button class="button-light" type="button" data-role="remove-color">Remover</button>' +
      "</div>" +
      "</div>" +
      '<div class="field-grid three">' +
      '<div class="field">' +
      '<label>Cor</label>' +
      '<input type="text" data-field="name" value="' + escapeHtml(color.name || "") + '" placeholder="Caramelo" />' +
      "</div>" +
      '<div class="field">' +
      '<label>Slug da cor</label>' +
      '<input type="text" data-field="slug" value="' + escapeHtml(color.slug || "") + '" placeholder="caramelo" />' +
      "</div>" +
      '<div class="field">' +
      '<label>Ordem</label>' +
      '<input type="number" data-field="sortOrder" min="0" step="1" value="' + escapeHtml(String(color.sortOrder || 0)) + '" />' +
      "</div>" +
      "</div>" +
      '<div class="field-grid three">' +
      '<div class="field">' +
      '<label>Status</label>' +
      '<select data-field="status">' +
      '<option value="disponivel">Disponivel</option>' +
      '<option value="esgotado">Esgotado</option>' +
      '<option value="sob_encomenda">Sob encomenda</option>' +
      "</select>" +
      "</div>" +
      '<div class="field">' +
      '<label>Estoque</label>' +
      '<input type="number" data-field="stockQuantity" min="0" step="1" value="' + escapeHtml(String(color.stockQuantity || "")) + '" placeholder="0" />' +
      "</div>" +
      '<div class="field">' +
      '<label>Imagem principal</label>' +
      '<input type="file" data-field="imageFile" accept="image/*" />' +
      "</div>" +
      "</div>" +
      '<div class="field-grid three">' +
      '<div class="field">' +
      '<label>Preview atual</label>' +
      (color.primaryImageUrl
        ? '<img class="preview-thumb" src="' + escapeHtml(color.primaryImageUrl) + '" alt="' + escapeHtml(color.name || "Cor") + '" />'
        : '<div class="empty-state">Sem imagem principal.</div>') +
      "</div>" +
      '<div class="field" style="grid-column: span 2;">' +
      '<label>Status atual</label>' +
      '<div class="pill-row">' +
      '<span class="status-pill ' + escapeHtml(color.status || "disponivel") + '">' + escapeHtml(getStatusLabel(color.status || "disponivel")) + "</span>" +
      (color.primaryImageUrl ? '<span class="pill">Imagem vinculada</span>' : '<span class="pill">Sem imagem</span>') +
      "</div>" +
      "</div>" +
      "</div>";

    wrapper.querySelector('[data-field="status"]').value = color.status || "disponivel";
    wrapper.querySelector('[data-role="remove-color"]').addEventListener("click", function() {
      const colorId = wrapper.dataset.colorId;
      if (colorId) {
        state.removedColorIds.push(colorId);
      }
      wrapper.remove();
      syncGalleryColorOptions();
    });

    wrapper.querySelector('[data-field="name"]').addEventListener("input", function(event) {
      const slugInput = wrapper.querySelector('[data-field="slug"]');
      if (!String(slugInput.value || "").trim()) {
        slugInput.value = slugify(event.target.value);
      }
    });

    return wrapper;
  }

  function renderColorRows(colors) {
    els.colorRows.innerHTML = "";

    if (!colors.length) {
      els.colorRows.innerHTML = '<div class="empty-state">Nenhuma cor cadastrada ainda.</div>';
      syncGalleryColorOptions();
      return;
    }

    colors.forEach(function(color) {
      els.colorRows.appendChild(buildColorRow(color));
    });

    syncGalleryColorOptions();
  }

  function renderGalleryList(product) {
    if (!product) {
      els.galleryList.innerHTML = '<div class="empty-state">Nenhuma imagem extra enviada ainda.</div>';
      return;
    }

    const generalItems = product.images.filter(function(image) {
      return !image.is_primary;
    }).map(function(image) {
      return {
        scopeLabel: "Galeria geral",
        productColorId: "",
        image: image
      };
    });

    const colorItems = product.colors.reduce(function(list, color) {
      color.images.filter(function(image) {
        return !image.is_primary;
      }).forEach(function(image) {
        list.push({
          scopeLabel: "Cor " + color.name,
          productColorId: color.id,
          image: image
        });
      });
      return list;
    }, []);

    const items = generalItems.concat(colorItems);
    if (!items.length) {
      els.galleryList.innerHTML = '<div class="empty-state">Nenhuma imagem extra enviada ainda.</div>';
      return;
    }

    els.galleryList.innerHTML = items.map(function(item) {
      const image = item.image;
      return (
        '<article class="gallery-item">' +
        '<img class="preview-thumb" src="' + escapeHtml(image.public_url || image.publicUrl || "") + '" alt="' + escapeHtml(image.alt_text || image.altText || "Imagem do produto") + '" />' +
        "<div>" +
        '<div class="gallery-item-top">' +
        "<strong>" + escapeHtml(item.scopeLabel) + "</strong>" +
        '<div class="gallery-actions">' +
        '<button class="button-danger" type="button" data-action="delete" data-image-id="' + escapeHtml(image.id) + '" data-color-id="' + escapeHtml(item.productColorId) + '">Excluir</button>' +
        "</div>" +
        "</div>" +
        "<p>" + escapeHtml(image.alt_text || image.altText || "Sem texto alternativo") + "</p>" +
        "</div>" +
        "</article>"
      );
    }).join("");

    els.galleryList.querySelectorAll("[data-action='delete']").forEach(function(button) {
      button.addEventListener("click", function() {
        deleteGalleryImage(button.getAttribute("data-image-id"), button.getAttribute("data-color-id") || null);
      });
    });
  }

  function renderEditor() {
    const product = getCurrentProduct();
    showMessage(els.productMessage, "", "");
    showMessage(els.colorsMessage, "", "");
    showMessage(els.galleryMessage, "", "");

    if (!product) {
      forms.productName.value = "";
      forms.productSlug.value = "";
      forms.productSku.value = "";
      forms.productPrice.value = "";
      forms.productStatus.value = "ativo";
      forms.productBadge.value = "";
      forms.productOrder.value = String(state.products.length);
      forms.productMaterial.value = "";
      forms.productDimensions.value = "";
      forms.productDescription.value = "";
      forms.productFeatures.value = "";
      renderColorRows([]);
      renderGalleryList(null);
      return;
    }

    forms.productName.value = product.name;
    forms.productSlug.value = product.slug;
    forms.productSku.value = product.sku;
    forms.productPrice.value = String(product.price || "");
    forms.productStatus.value = product.status || "ativo";
    forms.productBadge.value = product.badgeCode || "";
    forms.productOrder.value = String(product.sortOrder || 0);
    forms.productMaterial.value = product.material || "";
    forms.productDimensions.value = product.dimensions || "";
    forms.productDescription.value = product.description || "";
    forms.productFeatures.value = (product.features || []).join("\n");

    renderColorRows(product.colors || []);
    renderGalleryList(product);
  }

  function syncGalleryColorOptions() {
    const previousValue = els.galleryTargetColor.value;
    const colorRows = collectColorRows();
    const options = ['<option value="">Galeria geral do produto</option>'].concat(colorRows.map(function(color) {
      const value = color.id || "temp:" + color.slug || "temp:" + color.name;
      return '<option value="' + escapeHtml(value) + '">' + escapeHtml(color.name || "Nova cor") + "</option>";
    }));
    els.galleryTargetColor.innerHTML = options.join("");

    if (Array.from(els.galleryTargetColor.options).some(function(option) {
      return option.value === previousValue;
    })) {
      els.galleryTargetColor.value = previousValue;
    }
  }

  function collectColorRows() {
    return Array.from(els.colorRows.querySelectorAll(".color-row")).map(function(row, index) {
      const name = row.querySelector('[data-field="name"]').value.trim();
      return {
        id: row.dataset.colorId || "",
        name: name,
        slug: row.querySelector('[data-field="slug"]').value.trim() || slugify(name),
        status: row.querySelector('[data-field="status"]').value,
        stockQuantity: row.querySelector('[data-field="stockQuantity"]').value.trim(),
        sortOrder: Number(row.querySelector('[data-field="sortOrder"]').value || index) || index,
        imageFile: row.querySelector('[data-field="imageFile"]').files[0] || null
      };
    }).filter(function(color) {
      return color.name;
    });
  }

  function buildUploadPath(productId, scope, fileName) {
    return "products/" + productId + "/" + scope + "/" + Date.now() + "-" + sanitizeFileName(fileName || "image");
  }

  async function uploadFile(file, path) {
    const bucket = supabaseUtils.getSupabaseConfig().bucket;
    const uploadResult = await state.client.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: true
    });

    if (uploadResult.error) {
      throw uploadResult.error;
    }

    const publicUrlResult = state.client.storage.from(bucket).getPublicUrl(path);
    return {
      storagePath: path,
      publicUrl: publicUrlResult.data.publicUrl
    };
  }

  async function upsertPrimaryImageRecord(productId, colorId, uploadInfo, altText) {
    const existing = await state.client.from("product_images")
      .select("id")
      .eq("product_id", productId)
      .eq("product_color_id", colorId)
      .eq("is_primary", true)
      .maybeSingle();

    if (existing.error) {
      throw existing.error;
    }

    const payload = {
      product_id: productId,
      product_color_id: colorId,
      storage_path: uploadInfo.storagePath,
      public_url: uploadInfo.publicUrl,
      alt_text: altText || "",
      is_primary: true,
      sort_order: 0
    };

    if (existing.data && existing.data.id) {
      const updateResult = await state.client.from("product_images")
        .update(payload)
        .eq("id", existing.data.id);

      if (updateResult.error) {
        throw updateResult.error;
      }
      return existing.data.id;
    }

    const insertResult = await state.client.from("product_images")
      .insert(payload)
      .select("id")
      .single();

    if (insertResult.error) {
      throw insertResult.error;
    }

    return insertResult.data.id;
  }

  async function saveColorPrimaryImage(productId, colorId, file, colorName) {
    const uploadInfo = await uploadFile(file, buildUploadPath(productId, "colors/" + colorId, file.name));
    const updateColorResult = await state.client.from("product_colors")
      .update({
        primary_image_path: uploadInfo.storagePath,
        primary_image_url: uploadInfo.publicUrl
      })
      .eq("id", colorId);

    if (updateColorResult.error) {
      throw updateColorResult.error;
    }

    await upsertPrimaryImageRecord(productId, colorId, uploadInfo, colorName ? "Imagem principal da cor " + colorName : "");
  }

  async function saveRemovedColors() {
    if (!state.removedColorIds.length) {
      return;
    }

    const deleteResult = await state.client.from("product_colors")
      .delete()
      .in("id", state.removedColorIds);

    if (deleteResult.error) {
      throw deleteResult.error;
    }

    state.removedColorIds = [];
  }

  function clearGalleryInputs() {
    forms.galleryFiles.value = "";
    forms.galleryAlt.value = "";
    els.galleryTargetColor.value = "";
  }

  async function uploadPendingGallerySelection(productId, baseProduct, colorIdBySlug) {
    const files = Array.from(forms.galleryFiles.files || []);
    if (!files.length) {
      return {
        uploaded: false,
        count: 0
      };
    }

    const targetColorValue = els.galleryTargetColor.value;
    let targetColorId = null;
    if (targetColorValue) {
      if (targetColorValue.indexOf("temp:") === 0) {
        const targetSlug = targetColorValue.slice(5);
        targetColorId = colorIdBySlug && colorIdBySlug[targetSlug] ? colorIdBySlug[targetSlug] : null;
        if (!targetColorId) {
          throw new Error("A cor vinculada a esta galeria ainda nao foi salva. Salve a cor e tente novamente.");
        }
      } else {
        targetColorId = targetColorValue;
      }
    }

    const currentProduct = baseProduct || getCurrentProduct();
    const existingScopeImages = targetColorId
      ? (((currentProduct && currentProduct.colors.find(function(color) {
        return color.id === targetColorId;
      })) || { images: [] }).images || [])
      : ((currentProduct && currentProduct.images) || []);

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const scope = targetColorId ? "colors/" + targetColorId + "/gallery" : "gallery";
      const uploadInfo = await uploadFile(file, buildUploadPath(productId, scope, file.name));
      const insertResult = await state.client.from("product_images").insert({
        product_id: productId,
        product_color_id: targetColorId,
        storage_path: uploadInfo.storagePath,
        public_url: uploadInfo.publicUrl,
        alt_text: forms.galleryAlt.value.trim(),
        is_primary: false,
        sort_order: existingScopeImages.length + index
      });

      if (insertResult.error) {
        throw insertResult.error;
      }
    }

    clearGalleryInputs();

      return {
        uploaded: true,
        count: files.length
      };
  }

  async function saveProductCore() {
    const currentProduct = getCurrentProduct();
    const name = forms.productName.value.trim();
    const slug = forms.productSlug.value.trim() || slugify(name);
    const sku = forms.productSku.value.trim();
    const productPayload = {
      slug: slug,
      sku: sku,
      name: name,
      description: forms.productDescription.value.trim(),
      features: parseFeatureLines(forms.productFeatures.value),
      material: forms.productMaterial.value.trim() || null,
      dimensions: forms.productDimensions.value.trim() || null,
      price: Number(forms.productPrice.value || 0),
      catalog_status: forms.productStatus.value,
      badge_code: forms.productBadge.value || null,
      sort_order: Number(forms.productOrder.value || 0),
      updated_by: state.session.user.id
    };

    if (!name || !slug || !sku) {
      throw new Error("Nome, slug e SKU sao obrigatorios.");
    }

    let savedProductId = currentProduct ? currentProduct.id : null;
    if (currentProduct) {
      const updateResult = await state.client.from("products")
        .update(productPayload)
        .eq("id", currentProduct.id);

      if (updateResult.error) {
        throw updateResult.error;
      }
    } else {
      productPayload.created_by = state.session.user.id;
      const insertResult = await state.client.from("products")
        .insert(productPayload)
        .select("id")
        .single();

      if (insertResult.error) {
        throw insertResult.error;
      }

      savedProductId = insertResult.data.id;
      state.currentProductId = savedProductId;
    }

    return savedProductId;
  }

  async function saveColorsCore(productId) {
    await saveRemovedColors();

    const colorRows = collectColorRows();
    const colorIdBySlug = {};
    for (let index = 0; index < colorRows.length; index += 1) {
      const color = colorRows[index];
      const colorPayload = {
        product_id: productId,
        color_name: color.name,
        color_slug: color.slug,
        stock_quantity: color.stockQuantity === "" ? null : Number(color.stockQuantity),
        color_status: color.status,
        sort_order: Number(color.sortOrder || index) || index
      };

      let colorId = color.id;
      if (colorId) {
        const updateColorResult = await state.client.from("product_colors")
          .update(colorPayload)
          .eq("id", colorId);

        if (updateColorResult.error) {
          throw updateColorResult.error;
        }
      } else {
        const insertColorResult = await state.client.from("product_colors")
          .insert(colorPayload)
          .select("id")
          .single();

        if (insertColorResult.error) {
          throw insertColorResult.error;
        }
        colorId = insertColorResult.data.id;
      }

      colorIdBySlug[color.slug] = colorId;

      if (color.imageFile) {
        await saveColorPrimaryImage(productId, colorId, color.imageFile, color.name);
      }
    }

    return colorIdBySlug;
  }

  async function saveProduct(event) {
    event.preventDefault();

    if (!state.session) {
      showMessage(els.productMessage, "Entre novamente para salvar.", "error");
      return;
    }

    try {
      showMessage(els.productMessage, "Salvando produto...", "info");
      await saveProductCore();
      showMessage(els.productMessage, "Produto salvo com sucesso.", "success");
      await loadDashboardData();
    } catch (error) {
      console.error(error);
      showMessage(els.productMessage, normalizeError(error, "Nao foi possivel salvar o produto."), "error");
    }
  }

  async function saveColorsSection() {
    if (!state.session) {
      showMessage(els.colorsMessage, "Entre novamente para salvar.", "error");
      return;
    }

    try {
      showMessage(els.colorsMessage, "Salvando cores e imagem principal...", "info");
      const productId = await saveProductCore();
      await saveColorsCore(productId);
      showMessage(els.colorsMessage, "Cores e imagem principal salvas com sucesso.", "success");
      await loadDashboardData();
    } catch (error) {
      console.error(error);
      showMessage(els.colorsMessage, normalizeError(error, "Nao foi possivel salvar cores e imagem principal."), "error");
    }
  }

  async function saveSettings(event) {
    event.preventDefault();

    try {
      showMessage(els.settingsMessage, "Salvando configuracoes...", "info");
      const payload = {
        id: true,
        whatsapp_number: forms.settingsWhatsapp.value.trim(),
        default_payment_text: forms.settingsPayment.value.trim(),
        default_delivery_text: forms.settingsDelivery.value.trim(),
        updated_by: state.session.user.id
      };

      const result = await state.client.from("site_settings").upsert(payload);
      if (result.error) {
        throw result.error;
      }

      showMessage(els.settingsMessage, "Configuracoes salvas.", "success");
      await loadDashboardData();
    } catch (error) {
      console.error(error);
      showMessage(els.settingsMessage, normalizeError(error, "Nao foi possivel salvar as configuracoes."), "error");
    }
  }

  async function archiveCurrentProduct() {
    const product = getCurrentProduct();
    if (!product) {
      showMessage(els.productMessage, "Escolha um produto para arquivar.", "error");
      return;
    }

    if (!window.confirm("Arquivar este produto? Ele saira do catalogo publico e continuara salvo no painel.")) {
      return;
    }

    try {
      const result = await state.client.from("products")
        .update({
          catalog_status: "arquivado",
          updated_by: state.session.user.id
        })
        .eq("id", product.id);

      if (result.error) {
        throw result.error;
      }

      showMessage(els.productMessage, "Produto arquivado com sucesso.", "success");
      await loadDashboardData();
    } catch (error) {
      console.error(error);
      showMessage(els.productMessage, normalizeError(error, "Nao foi possivel arquivar o produto."), "error");
    }
  }

  async function uploadGallery(event) {
    event.preventDefault();
    const product = getCurrentProduct();
    if (!product) {
      showMessage(els.galleryMessage, "Salve um produto antes de enviar imagens.", "error");
      return;
    }

    const files = Array.from(forms.galleryFiles.files || []);
    if (!files.length) {
      showMessage(els.galleryMessage, "Selecione pelo menos um arquivo.", "error");
      return;
    }

    const targetColorValue = els.galleryTargetColor.value;
    let targetColorId = null;
    if (targetColorValue && targetColorValue.indexOf("temp:") !== 0) {
      targetColorId = targetColorValue;
    }

    if (targetColorValue && targetColorValue.indexOf("temp:") === 0) {
      showMessage(els.galleryMessage, "Salve o produto primeiro para usar imagens extras em uma nova cor.", "error");
      return;
    }

    try {
      showMessage(els.galleryMessage, "Enviando imagens...", "info");
      await uploadPendingGallerySelection(product.id, product, {});
      showMessage(els.galleryMessage, "Imagens enviadas com sucesso.", "success");
      await loadDashboardData();
    } catch (error) {
      console.error(error);
      showMessage(els.galleryMessage, normalizeError(error, "Nao foi possivel enviar as imagens."), "error");
    }
  }

  async function setImageAsPrimary(imageId, colorId) {
    const product = getCurrentProduct();
    if (!product) {
      return;
    }

    try {
      if (colorId) {
        const clearResult = await state.client.from("product_images")
          .update({ is_primary: false })
          .eq("product_color_id", colorId);

        if (clearResult.error) {
          throw clearResult.error;
        }
      } else {
        const clearResult = await state.client.from("product_images")
          .update({ is_primary: false })
          .eq("product_id", product.id)
          .is("product_color_id", null);

        if (clearResult.error) {
          throw clearResult.error;
        }
      }

      const setPrimaryResult = await state.client.from("product_images")
        .update({ is_primary: true })
        .eq("id", imageId);

      if (setPrimaryResult.error) {
        throw setPrimaryResult.error;
      }

      if (colorId) {
        const color = product.colors.find(function(item) {
          return item.id === colorId;
        });
        const image = (color ? color.images : []).find(function(item) {
          return item.id === imageId;
        });
        if (image) {
          const updateColorResult = await state.client.from("product_colors")
            .update({
              primary_image_path: image.storage_path || image.storagePath || null,
              primary_image_url: image.public_url || image.publicUrl || null
            })
            .eq("id", colorId);

          if (updateColorResult.error) {
            throw updateColorResult.error;
          }
        }
      }

      showMessage(els.galleryMessage, "Imagem principal atualizada.", "success");
      await loadDashboardData();
    } catch (error) {
      console.error(error);
      showMessage(els.galleryMessage, normalizeError(error, "Nao foi possivel definir a imagem principal."), "error");
    }
  }

  async function deleteGalleryImage(imageId, colorId) {
    if (!window.confirm("Excluir esta imagem?")) {
      return;
    }

    try {
      const product = getCurrentProduct();
      const image = findImageById(product, imageId, colorId);
      const deleteResult = await state.client.from("product_images")
        .delete()
        .eq("id", imageId);

      if (deleteResult.error) {
        throw deleteResult.error;
      }

      if (image && image.storage_path) {
        const bucket = supabaseUtils.getSupabaseConfig().bucket;
        await state.client.storage.from(bucket).remove([image.storage_path]);
      }

      showMessage(els.galleryMessage, "Imagem excluida.", "success");
      await loadDashboardData();
    } catch (error) {
      console.error(error);
      showMessage(els.galleryMessage, normalizeError(error, "Nao foi possivel excluir a imagem."), "error");
    }
  }

  function findImageById(product, imageId, colorId) {
    if (!product) {
      return null;
    }

    if (colorId) {
      const color = product.colors.find(function(item) {
        return item.id === colorId;
      });
      return color ? color.images.find(function(image) { return image.id === imageId; }) || null : null;
    }

    return product.images.find(function(image) {
      return image.id === imageId;
    }) || null;
  }

  function findBadgeLabel(code) {
    const badge = state.badges.find(function(item) {
      return item.code === code;
    });
    return badge ? badge.label : code;
  }

  function normalizeError(error, fallbackMessage) {
    if (!error) {
      return fallbackMessage;
    }

    if (typeof error === "string") {
      return error;
    }

    if (error.message) {
      return error.message;
    }

    return fallbackMessage;
  }

  async function loadDashboardData() {
    try {
      const panelUserResult = await state.client.from("panel_users")
        .select("user_id, full_name, is_active")
        .eq("user_id", state.session.user.id)
        .maybeSingle();

      if (panelUserResult.error) {
        throw panelUserResult.error;
      }

      if (!panelUserResult.data || panelUserResult.data.is_active !== true) {
        throw new Error("Este usuario nao esta liberado para editar o painel. Entre com o usuario autorizado em panel_users.");
      }

      const [
        settingsResult,
        badgesResult,
        productsResult,
        colorsResult,
        imagesResult
      ] = await Promise.all([
        state.client.from("site_settings").select("*").maybeSingle(),
        state.client.from("badge_options").select("code, label, sort_order").order("sort_order", { ascending: true }),
        state.client.from("products").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false }),
        state.client.from("product_colors").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
        state.client.from("product_images").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: true })
      ]);

      if (settingsResult.error) {
        throw settingsResult.error;
      }
      if (badgesResult.error) {
        throw badgesResult.error;
      }
      if (productsResult.error) {
        throw productsResult.error;
      }
      if (colorsResult.error) {
        throw colorsResult.error;
      }
      if (imagesResult.error) {
        throw imagesResult.error;
      }

      const mapped = mapDashboardData({
        settings: settingsResult.data,
        badges: badgesResult.data,
        products: productsResult.data,
        colors: colorsResult.data,
        images: imagesResult.data
      });

      state.settings = mapped.settings;
      state.badges = mapped.badges;
      state.products = mapped.products;

      fillBadgeOptions();
      renderSummary();
      renderSettings();

      if (!state.currentProductId || !state.products.some(function(product) { return product.id === state.currentProductId; })) {
        state.currentProductId = state.products.length ? state.products[0].id : null;
      }

      renderProductList();
      renderEditor();
    } catch (error) {
      console.error(error);
      showMessage(els.authMessage, normalizeError(error, "Nao foi possivel carregar o painel. Verifique se este usuario esta liberado em panel_users."), "error");
      setAuthView(false);
    }
  }

  function addEmptyColor() {
    const currentRows = collectColorRows();
    const newColor = {
      id: "",
      name: "",
      slug: "",
      stockQuantity: "",
      status: "disponivel",
      primaryImageUrl: "",
      sortOrder: currentRows.length,
      images: []
    };

    const currentProduct = getCurrentProduct();
    const allColors = currentProduct ? currentProduct.colors.slice() : [];
    allColors.push(newColor);
    renderColorRows(allColors);
  }

  function resetForNewProduct() {
    state.currentProductId = null;
    state.removedColorIds = [];
    renderProductList();
    renderEditor();
  }

  async function handleLogin(event) {
    event.preventDefault();
    if (!state.client) {
      showMessage(els.authMessage, "Configure o Supabase antes de entrar.", "error");
      return;
    }

    const formData = new FormData(els.loginForm);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    try {
      els.loginButton.disabled = true;
      showMessage(els.authMessage, "Entrando...", "info");
      const result = await state.client.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (result.error) {
        throw result.error;
      }

      state.session = result.data.session;
      els.loginForm.reset();
      showMessage(els.authMessage, "", "");
      setAuthView(true);
      await loadDashboardData();
    } catch (error) {
      console.error(error);
      showMessage(els.authMessage, normalizeError(error, "Nao foi possivel entrar."), "error");
    } finally {
      els.loginButton.disabled = false;
    }
  }

  async function handleLogout() {
    if (!state.client) {
      return;
    }

    await state.client.auth.signOut();
    state.session = null;
    setAuthView(false);
  }

  function bindEvents() {
    els.loginForm.addEventListener("submit", handleLogin);
    els.logoutButton.addEventListener("click", handleLogout);
    els.settingsForm.addEventListener("submit", saveSettings);
    els.productForm.addEventListener("submit", saveProduct);
    els.galleryUploadForm.addEventListener("submit", uploadGallery);
    els.archiveProductButton.addEventListener("click", archiveCurrentProduct);
    els.newProductButton.addEventListener("click", resetForNewProduct);
    els.addColorButton.addEventListener("click", addEmptyColor);
    els.saveColorsButton.addEventListener("click", saveColorsSection);
    els.productSearch.addEventListener("input", renderProductList);

    forms.productName.addEventListener("input", function() {
      if (!forms.productSlug.value.trim()) {
        forms.productSlug.value = slugify(forms.productName.value);
      }
    });
  }

  async function init() {
    bindEvents();

    if (!supabaseUtils || !supabaseUtils.isSupabaseReady()) {
      showMessage(els.configMessage, "Preencha supabaseUrl e supabaseAnonKey em app-config.js para ativar o painel.", "info");
      return;
    }

    els.configMessage.className = "message";
    els.configMessage.textContent = "";

    try {
      state.client = supabaseUtils.createClient();
      const sessionResult = await state.client.auth.getSession();
      if (sessionResult.error) {
        throw sessionResult.error;
      }

      state.session = sessionResult.data.session;

      state.client.auth.onAuthStateChange(function(event, session) {
        state.session = session;
        if (!session) {
          setAuthView(false);
        }
      });

      if (state.session) {
        setAuthView(true);
        await loadDashboardData();
      } else {
        setAuthView(false);
      }
    } catch (error) {
      console.error(error);
      showMessage(els.authMessage, normalizeError(error, "Falha ao inicializar o painel."), "error");
      setAuthView(false);
    }
  }

  init();
})();
