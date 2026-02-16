window.MG = (() => {
  const GAME_INDEX_URL = "data/games/index.json";
  const ANNOUNCE_URL = "data/announcements.json";
  const PLACEHOLDER = "assets/images/placeholder.svg";

  async function loadJSON(url){
    const res = await fetch(url, { cache: "no-store" });
    if(!res.ok) throw new Error(`Failed: ${url}`);
    return await res.json();
  }

  async function loadGameIds(){
    const idx = await loadJSON(GAME_INDEX_URL);
    return Array.isArray(idx.games) ? idx.games : [];
  }

  async function loadGame(id){
    return await loadJSON(`data/games/${id}.json`);
  }

async function loadAllGames(){
  const ids = await loadGameIds();
  const results = await Promise.allSettled(ids.map(loadGame));
  return results
    .filter(r => r.status === "fulfilled")
    .map(r => r.value);
}

  function el(tag, attrs = {}, children = []){
    const n = document.createElement(tag);
    for(const [k,v] of Object.entries(attrs)){
      if(k === "class") n.className = v;
      else if(k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else if(v !== null && v !== undefined) n.setAttribute(k, v);
    }
    for(const c of children){
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return n;
  }

  function nonEmpty(v){
    return typeof v === "string" && v.trim().length > 0;
  }

  function firstImage(game){
    return (Array.isArray(game.images) && game.images.length) ? game.images[0] : PLACEHOLDER;
  }

  function badgeIf(label, value){
    if(!nonEmpty(value)) return null;
    return el("span", { class:"badge" }, [`${label}：${value}`]);
  }


 // games.html：一覧（検索＆タグ絞り込み対応）
async function renderGamesList(){
  const grid = document.getElementById("gameGrid");
  grid.innerHTML = "";

  let games = [];
  try {
    games = await loadAllGames();
  } catch(e){
    grid.appendChild(el("div", { class:"card" }, ["読み込みエラー：data/games/ を確認してください。"]));
    return;
  }

  // ---- フィルタUIを挿入----
  const parent = grid.parentElement || grid;
  let bar = document.getElementById("filterBar");
  if(!bar){
    bar = el("div", { id:"filterBar", class:"card filterBar", role:"region", "aria-label":"検索と絞り込み" }, []);
    parent.insertBefore(bar, grid);
  }
  bar.innerHTML = "";

  const selected = new Set();

  const input = el("input", {
    id:"searchInput",
    type:"search",
    placeholder:"検索（タイトル・キャッチ・説明）"
  });

  const clearBtn = el("button", {
    type:"button",
    class:"btn",
    onclick: () => { input.value = ""; selected.clear(); update(); }
  }, ["クリア"]);

  const tagWrap = el("div", { class:"tagWrap" }, []);
  const allTags = [...new Set(
    games.flatMap(g => Array.isArray(g.tags) ? g.tags : [])
  )].filter(t => typeof t === "string" && t.trim().length > 0);

  const allBtn = el("button", {
    type:"button",
    class:"btn tagBtn",
    "aria-pressed":"true",
    onclick: () => { selected.clear(); update(); }
  }, ["すべて"]);
  allBtn.dataset.tag = "__all__";
  tagWrap.appendChild(allBtn);

  for(const t of allTags){
    const btn = el("button", {
      type:"button",
      class:"btn tagBtn",
      "aria-pressed":"false",
      onclick: () => {
        if(selected.has(t)) selected.delete(t);
        else selected.add(t);
        update();
      }
    }, [t]);
    btn.dataset.tag = t;
    tagWrap.appendChild(btn);
  }

  const count = el("span", { class:"muted small", id:"resultCount" }, [""]);

  bar.appendChild(input);
  bar.appendChild(clearBtn);
  bar.appendChild(tagWrap);
  bar.appendChild(count);

  input.addEventListener("input", () => update());

  // ---- 絞り込みロジック ----
  function matchQuery(g, q){
    if(!q) return true;
    const s = (v)=> (typeof v === "string" ? v : "");
    const hay = (s(g.title) + " " + s(g.catch) + " " + s(g.feature1) + " " + s(g.description)).toLowerCase();
    return hay.includes(q);
  }

  function matchTags(g){
    if(selected.size === 0) return true; // 何も選ばれてない＝全部表示
    const tags = Array.isArray(g.tags) ? g.tags : [];
    return tags.some(t => selected.has(t)); // OR条件（どれか一致）
  }

  function updateTagButtons(){
    allBtn.setAttribute("aria-pressed", selected.size === 0 ? "true" : "false");
    tagWrap.querySelectorAll("button[data-tag]").forEach(btn => {
      const t = btn.dataset.tag;
      if(t === "__all__") return;
      btn.setAttribute("aria-pressed", selected.has(t) ? "true" : "false");
    });
  }

  function renderCards(list){
    grid.innerHTML = "";
    if(list.length === 0){
      grid.appendChild(el("div", { class:"card" }, ["該当する作品がありません。"]));
      return;
    }

    for(const g of list){
      const tagBadges = (Array.isArray(g.tags) ? g.tags : []).slice(0, 3)
        .map(t => el("span", { class:"badge" }, [t]));

      const card = el("div", { class:"gameCard", role:"listitem" }, [
        el("img", { class:"cover", src:firstImage(g), alt:`${g.title || "ゲーム"} 画像` }),
        el("div", {}, [
          el("h2", { class:"gameTitle" }, [g.title || "Untitled"]),
          nonEmpty(g.catch) ? el("p", { class:"muted small" }, [g.catch]) : el("span", {}),
          el("div", { class:"metaRow" }, [
            badgeIf("人数", g.players),
            badgeIf("時間", g.time),
            ...tagBadges
          ].filter(Boolean)),
          nonEmpty(g.feature1) ? el("p", { class:"featureOne" }, [`特徴：${g.feature1}`]) : el("span", {})
        ]),
        el("a", { class:"cardBtn", href:`game.html?id=${encodeURIComponent(g.id)}` }, ["詳細を見る"])
      ]);

      grid.appendChild(card);
    }
  }

  function update(){
    const q = input.value.trim().toLowerCase();
    const filtered = games
      .filter(g => g && g.id)
      .filter(g => matchQuery(g, q) && matchTags(g));

    updateTagButtons();
    count.textContent = `表示：${filtered.length} / ${games.length}`;
    renderCards(filtered);
  }

  update();
}

  // index.html：トップ
  async function renderHome(){
    // お知らせ：空なら非表示
    const newsSection = document.getElementById("newsSection");
    const newsList = document.getElementById("newsList");
    if(newsSection && newsList){
      try{
        const a = await loadJSON(ANNOUNCE_URL);
        const items = Array.isArray(a.items) ? a.items : [];
        if(items.length === 0){
          newsSection.style.display = "none";
        }else{
          newsSection.style.display = "";
          newsList.innerHTML = "";
          items.forEach(it => {
            const line = `${it.date ? it.date + "： " : ""}${it.text || ""}`;
            if(line.trim()) newsList.appendChild(el("li", {}, [line]));
          });
        }
      }catch(_){
        newsSection.style.display = "none";
      }
    }

    // 最新ゲーム
    const latestBox = document.getElementById("latestGame");
    if(latestBox){
      try{
        let games = await loadAllGames();
        games = games.filter(g => g && g.id);

        games.sort((a,b) => {
          const da = nonEmpty(a.publishedAt) ? Date.parse(a.publishedAt) : 0;
          const db = nonEmpty(b.publishedAt) ? Date.parse(b.publishedAt) : 0;
          return db - da;
        });

        const g = games[0];
        if(!g){
          latestBox.style.display = "none";
          return;
        }

        latestBox.innerHTML = "";
        latestBox.appendChild(
          el("div", { class:"gameCard" }, [
            el("img", { class:"cover", src:firstImage(g), alt:`${g.title || "最新ゲーム"} 画像` }),
            el("div", {}, [
              el("h2", { class:"gameTitle" }, [g.title || "Untitled"]),
              nonEmpty(g.catch) ? el("p", { class:"muted small" }, [g.catch]) : el("span", {}),
              el("div", { class:"metaRow" }, [
                badgeIf("人数", g.players),
                badgeIf("時間", g.time),
                badgeIf("年齢", g.age),
              ].filter(Boolean)),
              nonEmpty(g.feature1) ? el("p", { class:"featureOne" }, [`特徴：${g.feature1}`]) : el("span", {})
            ]),
            el("a", { class:"cardBtn", href:`game.html?id=${encodeURIComponent(g.id)}` }, ["詳細を見る"])
          ])
        );
      }catch(_){
        latestBox.style.display = "none";
      }
    }
  }

  // game.html：詳細
  function setLinkBtn(id, url){
    const btn = document.getElementById(id);
    if(!btn) return;
    if(!nonEmpty(url)){ btn.style.display = "none"; return; }
    btn.style.display = "inline-block";
    btn.href = url.trim();
  }

  async function renderGame(){
    const params = new URLSearchParams(location.search);
    const id = params.get("id");
    if(!id){
      document.getElementById("gameTitle").textContent = "Game not found";
      return;
    }

    let g;
    try { g = await loadGame(id); }
    catch(_){
      document.getElementById("gameTitle").textContent = "読み込みエラー";
      return;
    }

    document.title = `Mottainai Games - ${g.title || "Game"}`;
    document.getElementById("gameTitle").textContent = g.title || "";
    document.getElementById("gameCatch").textContent = g.catch || "";

    // 基本情報：無い項目は非表示
    const rows = [
      ["playersRow", g.players],
      ["timeRow", g.time],
      ["ageRow", g.age],
    ];
    rows.forEach(([rowId, value]) => {
      const row = document.getElementById(rowId);
      if(!row) return;
      if(nonEmpty(value)) row.querySelector("dd").textContent = value;
      else row.style.display = "none";
    });

    const desc = document.getElementById("description");
    if(desc){
      if(nonEmpty(g.description)) desc.textContent = g.description;
      else desc.style.display = "none";
    }

    // リンク（無いものは非表示）
    setLinkBtn("rulesBtn", g.links?.rulesPdf);
    setLinkBtn("shopBtn", g.links?.shopUrl);
    setLinkBtn("videoBtn", g.links?.videoUrl);

    // 画像切替（左右ボタン）
    const images = (Array.isArray(g.images) && g.images.length) ? g.images : [PLACEHOLDER];
    const main = document.getElementById("mainImage");
    const prev = document.getElementById("prevBtn");
    const next = document.getElementById("nextBtn");

    let i = 0;
    function show(){
      main.src = images[i];
      if(prev) prev.disabled = images.length <= 1;
      if(next) next.disabled = images.length <= 1;
    }
    if(prev) prev.addEventListener("click", () => { i = (i - 1 + images.length) % images.length; show(); });
    if(next) next.addEventListener("click", () => { i = (i + 1) % images.length; show(); });

    show();
  }

  return { renderGamesList, renderHome, renderGame };
})();
