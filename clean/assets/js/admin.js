(() => {
  const LS_KEY = "khoii_admin_draft_v1";

  const titleInput = document.getElementById("titleInput");
  const defaultPosterInput = document.getElementById("defaultPosterInput");
  const cfHintInput = document.getElementById("cfHintInput");

  const idInput = document.getElementById("idInput");
  const nameInput = document.getElementById("nameInput");
  const posterInput = document.getElementById("posterInput");
  const hlsInput = document.getElementById("hlsInput");
  const seriesInput = document.getElementById("seriesInput");
  const seasonInput = document.getElementById("seasonInput");
  const episodeInput = document.getElementById("episodeInput");
  const typeInput = document.getElementById("typeInput");
  const countryInput = document.getElementById("countryInput");
  const genresInput = document.getElementById("genresInput");
  const updatedInput = document.getElementById("updatedInput");
  const featuredInput = document.getElementById("featuredInput");

  const btnLoad = document.getElementById("btnLoad");
  const btnSaveDraft = document.getElementById("btnSaveDraft");
  const btnRestoreDraft = document.getElementById("btnRestoreDraft");

  const btnUpsert = document.getElementById("btnUpsert");
  const btnClear = document.getElementById("btnClear");

  const btnSort = document.getElementById("btnSort");
  const btnExport = document.getElementById("btnExport");
  const btnDeleteAll = document.getElementById("btnDeleteAll");

  const tbody = document.getElementById("tbody");
  const jsonArea = document.getElementById("jsonArea");
  const btnApplyJson = document.getElementById("btnApplyJson");
  const btnDownloadJson = document.getElementById("btnDownloadJson");

  const state = {
    title: "khoii",
    defaultPoster: "assets/posters/ep.jpg",
    items: []
  };

  function toInt(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }

  function todayStr() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2,"0");
    const dd = String(d.getDate()).padStart(2,"0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function normalizeItem(it) {
    const out = { ...it };
    if (!out.id) out.id = "item-" + Math.random().toString(16).slice(2,8);
    if (!out.name) out.name = out.id;
    if (!out.poster) out.poster = state.defaultPoster || "assets/posters/ep.jpg";
    if (typeof out.genres === "string") {
      out.genres = out.genres.split(",").map(s => s.trim()).filter(Boolean);
    }
    if (!Array.isArray(out.genres)) out.genres = [];
    if (!out.updated) out.updated = todayStr();
    return out;
  }

  function sortItems() {
    state.items.sort((a,b) => {
      const sa = Number.isFinite(a.season) ? a.season : 0;
      const sb = Number.isFinite(b.season) ? b.season : 0;

      const sra = String(a.series || "");
      const srb = String(b.series || "");
      if (sra !== srb) return sra.localeCompare(srb);
      if (sa !== sb) return sa - sb;

      const ea = Number.isFinite(a.episode) ? a.episode : 0;
      const eb = Number.isFinite(b.episode) ? b.episode : 0;
      if (ea !== eb) return ea - eb;

      return String(a.name).localeCompare(String(b.name));
    });
  }

  function renderTable() {
    tbody.innerHTML = "";
    state.items.forEach((it) => {
      const tr = document.createElement("tr");

      const meta = [
        it.type || "",
        it.country || "",
        it.updated ? `upd:${it.updated}` : "",
        it.featured ? "featured" : ""
      ].filter(Boolean).join(" • ");

      tr.innerHTML = `
        <td>${escapeHtml(it.id)}</td>
        <td>${escapeHtml(it.name)}</td>
        <td style="word-break:break-all">${escapeHtml(it.hls || "")}</td>
        <td>${escapeHtml(it.series || "")} / ${escapeHtml(it.season ?? "")} / ${escapeHtml(it.episode ?? "")}</td>
        <td>${escapeHtml(meta)}</td>
        <td>
          <button class="btn btn-ghost" data-act="edit">Sửa</button>
          <button class="btn danger" data-act="del">Xóa</button>
        </td>
      `;

      tr.querySelector('[data-act="edit"]').onclick = () => fillForm(it);
      tr.querySelector('[data-act="del"]').onclick = () => {
        if (!confirm(`Xóa item ${it.id}?`)) return;
        state.items = state.items.filter(x => x.id !== it.id);
        syncJsonArea();
        renderTable();
      };

      tbody.appendChild(tr);
    });
  }

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[m]));
  }

  function fillForm(it) {
    idInput.value = it.id || "";
    nameInput.value = it.name || "";
    posterInput.value = it.poster || "";
    hlsInput.value = it.hls || "";
    seriesInput.value = it.series || "";
    seasonInput.value = (it.season ?? "") + "";
    episodeInput.value = (it.episode ?? "") + "";
    typeInput.value = it.type || "";
    countryInput.value = it.country || "";
    genresInput.value = Array.isArray(it.genres) ? it.genres.join(", ") : (it.genres || "");
    updatedInput.value = it.updated || "";
    featuredInput.value = it.featured ? "true" : "false";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearForm() {
    idInput.value = "";
    nameInput.value = "";
    posterInput.value = "";
    hlsInput.value = "";
    seriesInput.value = "";
    seasonInput.value = "";
    episodeInput.value = "";
    typeInput.value = "";
    countryInput.value = "";
    genresInput.value = "";
    updatedInput.value = todayStr();
    featuredInput.value = "false";
  }

  function readForm() {
    const genres = (genresInput.value || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    const it = {
      id: (idInput.value || "").trim(),
      name: (nameInput.value || "").trim(),
      poster: (posterInput.value || "").trim(),
      hls: (hlsInput.value || "").trim(),
      series: (seriesInput.value || "").trim(),
      season: toInt(seasonInput.value),
      episode: toInt(episodeInput.value),
      type: (typeInput.value || "").trim(),
      country: (countryInput.value || "").trim(),
      genres,
      updated: (updatedInput.value || "").trim(),
      featured: featuredInput.value === "true"
    };

    if (!it.series) delete it.series;
    if (!Number.isFinite(it.season)) delete it.season;
    if (!Number.isFinite(it.episode)) delete it.episode;
    if (!it.type) delete it.type;
    if (!it.country) delete it.country;
    if (!it.updated) it.updated = todayStr();

    return normalizeItem(it);
  }

  function upsertItem(it) {
    const idx = state.items.findIndex(x => x.id === it.id);
    if (idx >= 0) state.items[idx] = it;
    else state.items.push(it);
  }

  function buildJson() {
    return {
      title: state.title || "khoii",
      items: state.items
    };
  }

  function syncJsonArea() {
    jsonArea.value = JSON.stringify(buildJson(), null, 2);
  }

  function downloadJson(filename, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function loadFromMoviesJson() {
    const res = await fetch("movies.json", { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();

    state.title = data.title || "khoii";
    titleInput.value = state.title;

    const raw = Array.isArray(data.items) ? data.items : [];
    state.items = raw.map(normalizeItem);
    sortItems();

    syncJsonArea();
    renderTable();
  }

  function saveDraft() {
    const draft = {
      title: titleInput.value || "khoii",
      defaultPoster: defaultPosterInput.value || "assets/posters/ep.jpg",
      cfHint: cfHintInput.value || "",
      items: state.items
    };
    localStorage.setItem(LS_KEY, JSON.stringify(draft));
    alert("Đã lưu nháp vào localStorage.");
  }

  function restoreDraft() {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      alert("Chưa có nháp.");
      return;
    }
    const draft = JSON.parse(raw);

    titleInput.value = draft.title || "khoii";
    defaultPosterInput.value = draft.defaultPoster || "assets/posters/ep.jpg";
    cfHintInput.value = draft.cfHint || "";

    state.title = titleInput.value;
    state.defaultPoster = defaultPosterInput.value;
    state.items = Array.isArray(draft.items) ? draft.items.map(normalizeItem) : [];
    sortItems();

    syncJsonArea();
    renderTable();
    alert("Đã khôi phục nháp.");
  }

  btnLoad.onclick = async () => {
    try {
      await loadFromMoviesJson();
      alert("Load movies.json OK");
    } catch (e) {
      console.error(e);
      alert("Không load được movies.json. Kiểm tra file ở root repo và JSON hợp lệ.");
    }
  };

  btnSaveDraft.onclick = () => saveDraft();
  btnRestoreDraft.onclick = () => restoreDraft();

  btnUpsert.onclick = () => {
    state.title = (titleInput.value || "khoii").trim();
    state.defaultPoster = (defaultPosterInput.value || "assets/posters/ep.jpg").trim() || "assets/posters/ep.jpg";

    const it = readForm();
    if (!it.id) {
      alert("Thiếu id.");
      return;
    }
    if (!it.hls) {
      if (!confirm("Item chưa có link HLS. Vẫn lưu?")) return;
    }

    upsertItem(it);
    sortItems();
    syncJsonArea();
    renderTable();
    clearForm();
  };

  btnClear.onclick = () => clearForm();

  btnSort.onclick = () => {
    sortItems();
    syncJsonArea();
    renderTable();
  };

  btnExport.onclick = () => {
    state.title = (titleInput.value || "khoii").trim();
    downloadJson("movies.json", buildJson());
  };

  btnDeleteAll.onclick = () => {
    if (!confirm("Xóa toàn bộ items?")) return;
    state.items = [];
    syncJsonArea();
    renderTable();
  };

  btnApplyJson.onclick = () => {
    try {
      const obj = JSON.parse(jsonArea.value || "{}");
      state.title = obj.title || (titleInput.value || "khoii");
      titleInput.value = state.title;

      const rawItems = Array.isArray(obj.items) ? obj.items : [];
      state.items = rawItems.map(normalizeItem);
      sortItems();

      syncJsonArea();
      renderTable();
      alert("Apply JSON OK");
    } catch (e) {
      console.error(e);
      alert("JSON lỗi. Kiểm tra lại format.");
    }
  };

  btnDownloadJson.onclick = () => {
    try {
      const obj = JSON.parse(jsonArea.value || "{}");
      downloadJson("movies.json", obj);
    } catch {
      downloadJson("movies.json", buildJson());
    }
  };

  titleInput.value = "khoii";
  defaultPosterInput.value = "assets/posters/ep.jpg";
  updatedInput.value = todayStr();
  state.title = titleInput.value;
  state.defaultPoster = defaultPosterInput.value;

  loadFromMoviesJson().catch(() => {
    syncJsonArea();
    renderTable();
  });
})();
