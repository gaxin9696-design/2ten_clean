(() => {
  const video = document.getElementById("video");
  const siteTitleEl = document.getElementById("siteTitle");
  const nowTitleEl = document.getElementById("nowTitle");
  const nowMetaEl = document.getElementById("nowMeta");
  const overlayEl = document.getElementById("playerOverlay");
  const playerHintEl = document.getElementById("playerHint");

  const qualitySelect = document.getElementById("qualitySelect");
  const speedSelect = document.getElementById("speedSelect");
  const btnPrev = document.getElementById("btnPrev");
  const btnNext = document.getElementById("btnNext");
  const btnCopyLink = document.getElementById("btnCopyLink");

  const episodesBlock = document.getElementById("episodesBlock");
  const episodesSub = document.getElementById("episodesSub");
  const episodesList = document.getElementById("episodesList");

  const catalogSub = document.getElementById("catalogSub");
  const searchInput = document.getElementById("searchInput");
  const typeSelect = document.getElementById("typeSelect");
  const countrySelect = document.getElementById("countrySelect");
  const genreSelect = document.getElementById("genreSelect");
  const btnReset = document.getElementById("btnReset");

  const gridRecommend = document.getElementById("gridRecommend");
  const gridLatest = document.getElementById("gridLatest");
  const gridFeatured = document.getElementById("gridFeatured");
  const gridAll = document.getElementById("gridAll");
  const countAll = document.getElementById("countAll");

  let hls = null;

  const state = {
    catalogTitle: "Khoii",
    items: [],
    filtered: [],
    currentItem: null,
    seriesItems: [],
    seriesIndex: -1
  };

  function esc(str) {
    return String(str ?? "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[m]));
  }

  function uniq(arr) {
    return [...new Set(arr.filter(Boolean))].sort((a,b) => a.localeCompare(b));
  }

  function toDateValue(s) {
    const t = Date.parse(s);
    return Number.isFinite(t) ? t : 0;
  }

  function normalizeItem(it, idx) {
    const out = { ...it };
    if (!out.id) out.id = `item-${idx + 1}`;
    if (!out.name) out.name = out.id;
    if (!out.poster) out.poster = "assets/posters/ep.jpg";
    if (!Array.isArray(out.genres)) {
      if (typeof out.genres === "string") {
        out.genres = out.genres.split(",").map(s => s.trim()).filter(Boolean);
      } else {
        out.genres = [];
      }
    }
    return out;
  }

  function buildMeta(it) {
    const bits = [];
    if (it.type) bits.push(it.type);
    if (it.country) bits.push(it.country);
    if (it.series) {
      const se = [];
      if (Number.isFinite(it.season)) se.push(`S${it.season}`);
      if (Number.isFinite(it.episode)) se.push(`E${String(it.episode).padStart(2,"0")}`);
      if (se.length) bits.push(se.join(""));
    }
    if (it.updated) bits.push(`Update: ${it.updated}`);
    return bits.join(" • ") || "—";
  }

  function setOverlay(show, title, sub) {
    overlayEl.style.display = show ? "grid" : "none";
    if (show) {
      overlayEl.querySelector(".overlay-title").textContent = title || "Chưa chọn tập để phát";
      overlayEl.querySelector(".overlay-sub").textContent = sub || "Hãy chọn 1 tập ở danh sách bên dưới.";
    }
  }

  function destroyHls() {
    if (hls) {
      try { hls.destroy(); } catch {}
      hls = null;
    }
  }

  function setupQualityForHls() {
    qualitySelect.innerHTML = "";
    const optAuto = document.createElement("option");
    optAuto.value = "-1";
    optAuto.textContent = "Auto";
    qualitySelect.appendChild(optAuto);

    const levels = hls.levels || [];
    levels.forEach((lvl, i) => {
      const opt = document.createElement("option");
      opt.value = String(i);
      const h = lvl.height ? `${lvl.height}p` : `Level ${i}`;
      const br = lvl.bitrate ? ` • ${(lvl.bitrate/1000/1000).toFixed(1)} Mbps` : "";
      opt.textContent = `${h}${br}`;
      qualitySelect.appendChild(opt);
    });

    qualitySelect.disabled = false;
    qualitySelect.value = "-1";
  }

  function playHls(url) {
    destroyHls();

    qualitySelect.disabled = true;
    qualitySelect.innerHTML = `<option value="-2">—</option>`;
    setOverlay(false);

    // Safari native HLS
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.play().catch(() => {});
      playerHintEl.textContent = "Đang phát bằng HLS native (Safari/iOS).";
      return;
    }

    // Hls.js
    if (window.Hls && Hls.isSupported()) {
      hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        backBufferLength: 30,
        enableWorker: true
      });

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        playerHintEl.textContent = "Đang tải manifest...";
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        playerHintEl.textContent = "Manifest OK. Bắt đầu phát...";
        setupQualityForHls();
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, () => {
        if (!qualitySelect.disabled) {
          const lvl = hls.currentLevel;
          if (hls.autoLevelEnabled) qualitySelect.value = "-1";
          else if (lvl >= 0) qualitySelect.value = String(lvl);
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        const { type, fatal } = data || {};
        console.warn("[HLS ERROR]", type, data);

        if (!fatal) return;

        if (type === Hls.ErrorTypes.NETWORK_ERROR) {
          playerHintEl.textContent = "Lỗi network khi tải segment. Đang thử lại...";
          try { hls.startLoad(); } catch {}
        } else if (type === Hls.ErrorTypes.MEDIA_ERROR) {
          playerHintEl.textContent = "Lỗi media. Đang recover...";
          try { hls.recoverMediaError(); } catch {}
        } else {
          playerHintEl.textContent = "Lỗi fatal. Dừng player.";
          destroyHls();
          setOverlay(true, "Không phát được video", "Kiểm tra link m3u8 / CORS / file trên Cloudflare Pages.");
        }
      });

      return;
    }

    setOverlay(true, "Trình duyệt không hỗ trợ", "Thiết bị của bạn không hỗ trợ HLS (không có MSE và cũng không có HLS native).");
  }

  function setNowPlaying(it) {
    state.currentItem = it;

    nowTitleEl.textContent = it?.name || "—";
    nowMetaEl.textContent = buildMeta(it);

    const url = new URL(window.location.href);
    url.searchParams.set("id", it.id);
    window.history.replaceState({}, "", url.toString());

    buildSeries(it);

    btnPrev.disabled = state.seriesIndex <= 0;
    btnNext.disabled = state.seriesIndex < 0 || state.seriesIndex >= state.seriesItems.length - 1;

    if (!it?.hls) {
      setOverlay(true, "Thiếu link HLS", "Item này không có trường 'hls' trong movies.json.");
      return;
    }

    setOverlay(false);
    playHls(it.hls);
  }

  function buildSeries(current) {
    const seriesKey = current.series || null;

    if (!seriesKey) {
      episodesBlock.style.display = "none";
      state.seriesItems = [current];
      state.seriesIndex = 0;
      return;
    }

    const same = state.items.filter(x => (x.series || "") === seriesKey);

    same.sort((a,b) => {
      const sa = Number.isFinite(a.season) ? a.season : 0;
      const sb = Number.isFinite(b.season) ? b.season : 0;
      if (sa !== sb) return sa - sb;

      const ea = Number.isFinite(a.episode) ? a.episode : 0;
      const eb = Number.isFinite(b.episode) ? b.episode : 0;
      if (ea !== eb) return ea - eb;

      return String(a.name).localeCompare(String(b.name));
    });

    state.seriesItems = same;
    state.seriesIndex = same.findIndex(x => x.id === current.id);

    episodesBlock.style.display = "block";
    episodesSub.textContent = `${seriesKey} • ${same.length} tập`;

    episodesList.innerHTML = "";
    same.forEach((ep) => {
      const btn = document.createElement("button");
      btn.className = "ep-btn" + (ep.id === current.id ? " active" : "");
      const label = ep.episode ? `Tập ${ep.episode}` : ep.name;
      btn.textContent = label;
      btn.onclick = () => setNowPlaying(ep);
      episodesList.appendChild(btn);
    });
  }

  function makeCard(it) {
    const card = document.createElement("div");
    card.className = "card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Phát: ${it.name}`);

    card.innerHTML = `
      <img class="poster" src="${esc(it.poster)}" alt="${esc(it.name)}" loading="lazy" />
      <div class="card-body">
        <div class="card-title">${esc(it.name)}</div>
        <div class="card-meta">${esc(buildMeta(it))}</div>
        <div class="badges">
          ${(it.genres || []).slice(0,2).map(g => `<span class="badge">${esc(g)}</span>`).join("")}
          ${it.featured ? `<span class="badge">Nổi bật</span>` : ``}
        </div>
      </div>
    `;

    const go = () => setNowPlaying(it);
    card.onclick = go;
    card.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        go();
      }
    };
    return card;
  }

  function renderGrid(el, items, limit = 12) {
    el.innerHTML = "";
    items.slice(0, limit).forEach(it => el.appendChild(makeCard(it)));
    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "muted";
      empty.textContent = "Không có mục nào.";
      el.appendChild(empty);
    }
  }

  function applyFilters() {
    const q = (searchInput.value || "").trim().toLowerCase();
    const type = typeSelect.value;
    const country = countrySelect.value;
    const genre = genreSelect.value;

    let arr = [...state.items];

    if (q) {
      arr = arr.filter(it => (it.name || "").toLowerCase().includes(q) || (it.series || "").toLowerCase().includes(q));
    }
    if (type) {
      arr = arr.filter(it => (it.type || "") === type);
    }
    if (country) {
      arr = arr.filter(it => (it.country || "") === country);
    }
    if (genre) {
      arr = arr.filter(it => (it.genres || []).includes(genre));
    }

    arr.sort((a,b) => toDateValue(b.updated) - toDateValue(a.updated));
    state.filtered = arr;

    countAll.textContent = `${arr.length} mục`;
    renderGrid(gridAll, arr, arr.length);
  }

  function buildFilterOptions() {
    const types = uniq(state.items.map(it => it.type));
    const countries = uniq(state.items.map(it => it.country));
    const genres = uniq(state.items.flatMap(it => it.genres || []));

    function setOptions(select, values) {
      const keep = select.value;
      const first = select.querySelector("option");
      select.innerHTML = "";
      if (first) select.appendChild(first);

      values.forEach(v => {
        const opt = document.createElement("option");
        opt.value = v;
        opt.textContent = v;
        select.appendChild(opt);
      });

      if (values.includes(keep)) select.value = keep;
    }

    setOptions(typeSelect, types);
    setOptions(countrySelect, countries);
    setOptions(genreSelect, genres);
  }

  function showHomeSections() {
    const latest = [...state.items].sort((a,b) => toDateValue(b.updated) - toDateValue(a.updated));
    renderGrid(gridLatest, latest, 12);

    const featured = state.items.filter(x => !!x.featured);
    renderGrid(gridFeatured, featured.length ? featured : latest, 12);

    const pool = [...state.items];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    renderGrid(gridRecommend, pool, 12);

    renderGrid(gridAll, latest, latest.length);
    countAll.textContent = `${latest.length} mục`;
  }

  function pickInitialItem() {
    const url = new URL(window.location.href);
    const id = url.searchParams.get("id");

    if (id) {
      const found = state.items.find(x => x.id === id);
      if (found) return found;
    }

    const latest = [...state.items].sort((a,b) => toDateValue(b.updated) - toDateValue(a.updated));
    return latest[0] || null;
  }

  function wireEvents() {
    qualitySelect.addEventListener("change", () => {
      if (!hls) return;
      const v = Number(qualitySelect.value);
      if (Number.isFinite(v)) {
        if (v === -1) {
          hls.currentLevel = -1;
          hls.autoLevelEnabled = true;
        } else {
          hls.currentLevel = v;
          hls.autoLevelEnabled = false;
        }
      }
    });

    speedSelect.addEventListener("change", () => {
      const s = Number(speedSelect.value);
      if (Number.isFinite(s)) video.playbackRate = s;
    });

    btnPrev.addEventListener("click", () => {
      if (state.seriesIndex > 0) {
        setNowPlaying(state.seriesItems[state.seriesIndex - 1]);
      }
    });

    btnNext.addEventListener("click", () => {
      if (state.seriesIndex >= 0 && state.seriesIndex < state.seriesItems.length - 1) {
        setNowPlaying(state.seriesItems[state.seriesIndex + 1]);
      }
    });

    video.addEventListener("ended", () => {
      if (state.seriesIndex >= 0 && state.seriesIndex < state.seriesItems.length - 1) {
        setNowPlaying(state.seriesItems[state.seriesIndex + 1]);
      }
    });

    btnCopyLink.addEventListener("click", async () => {
      const u = window.location.href;
      try {
        await navigator.clipboard.writeText(u);
        btnCopyLink.textContent = "Đã copy!";
        setTimeout(() => (btnCopyLink.textContent = "Copy Link"), 1200);
      } catch {
        alert("Không copy được. Bạn copy thủ công link trên thanh địa chỉ nhé.");
      }
    });

    const onFilterChange = () => applyFilters();
    searchInput.addEventListener("input", onFilterChange);
    typeSelect.addEventListener("change", onFilterChange);
    countrySelect.addEventListener("change", onFilterChange);
    genreSelect.addEventListener("change", onFilterChange);

    btnReset.addEventListener("click", () => {
      searchInput.value = "";
      typeSelect.value = "";
      countrySelect.value = "";
      genreSelect.value = "";
      applyFilters();
    });

    document.querySelectorAll(".nav-btn[data-nav]").forEach(btn => {
      btn.addEventListener("click", () => {
        const mode = btn.getAttribute("data-nav");
        if (mode === "movie") typeSelect.value = "Phim Lẻ";
        else if (mode === "series") typeSelect.value = "Phim Bộ";
        else if (mode === "country") {
          countrySelect.focus();
          return;
        } else {
          typeSelect.value = "";
        }
        applyFilters();
      });
    });

    document.querySelectorAll('button[data-action="show-all"]').forEach(btn => {
      btn.addEventListener("click", () => {
        gridAll.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  async function init() {
    setOverlay(true, "Đang tải dữ liệu...", "Đang đọc movies.json từ repo GitHub Pages.");

    try {
      const res = await fetch("movies.json", { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);

      const data = await res.json();

      state.catalogTitle = data.title || "Khoii";
      siteTitleEl.textContent = state.catalogTitle;
      document.title = `${state.catalogTitle} - Home`;

      const rawItems = Array.isArray(data.items) ? data.items : [];
      state.items = rawItems.map(normalizeItem);

      catalogSub.textContent = `Đã tải ${state.items.length} mục.`;

      buildFilterOptions();
      showHomeSections();
      wireEvents();

      const first = pickInitialItem();
      if (first) {
        setOverlay(false);
        setNowPlaying(first);
      } else {
        setOverlay(true, "Chưa có dữ liệu", "movies.json chưa có item nào.");
      }

    } catch (err) {
      console.error(err);
      catalogSub.textContent = "Không tải được movies.json";
      setOverlay(true, "Không tải được movies.json", "Kiểm tra file movies.json có nằm đúng root repo và JSON hợp lệ.");
    }
  }

  init();
})();
