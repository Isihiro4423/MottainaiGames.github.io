window.MG = (() => {
  const DATA_URL = "data/games.json";
  const PLACEHOLDER = "assets/images/placeholder.svg";

  async function loadGames(){
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if(!res.ok) throw new Error("games.json を読み込めませんでした");
    const data = await res.json();
    return Array.isArray(data.games) ? data.games : [];
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

  function safeUrl(u){
    return (typeof u === "string" && u.trim().length > 0) ? u.trim() : null;
  }

  function firstImage(game){
    return (game.images && game.images.length) ? game.images[0] : PLACEHOLDER;
  }

  async function renderIndex(){
    const grid = document.getElementById("gameGrid");
    grid.innerHTML = "";

    let games = [];
    try { games = await loadGames(); }
    catch(e){
      grid.appendChild(el("div", { class:"card" }, ["読み込みエラー：games.json を確認してください。"]));
      return;
    }

for(const g of games){
  const firstFeature = (Array.isArray(g.features) && g.features.length) ? g.features[0] : "";

  const card = el("div", { class:"gameCard", role:"listitem" }, [
    el("img", { class:"cover", src:firstImage(g), alt:`${g.title || "ゲーム"} 画像` }),

    el("div", {}, [
      el("h2", { class:"gameTitle" }, [g.title || "Untitled"]),
      el("p", { class:"muted small" }, [g.catch || ""]),

      el("div", { class:"metaRow" }, [
        el("span", { class:"badge" }, [`人数：${g.players || "-"}`]),
        el("span", { class:"badge" }, [`時間：${g.time || "-"}`]),
        el("span", { class:"badge" }, [`年齢：${g.age || "-"}`]),
      ]),

      firstFeature ? el("p", { class:"featureOne" }, [`特徴：${firstFeature}`]) : el("span", {})
    ]),

    el("a", { class:"cardBtn", href:`game.html?id=${encodeURIComponent(g.id)}` }, ["詳細を見る"])
  ]);

  grid.appendChild(card);
}


  function setBtn(id, url){
    const btn = document.getElementById(id);
    const u = safeUrl(url);
    if(!u){ btn.style.display = "none"; return; }
    btn.style.display = "inline-block";
    btn.href = u;
  }

  async function renderGame(){
    const params = new URLSearchParams(location.search);
    const id = params.get("id");
    if(!id){
      document.getElementById("gameTitle").textContent = "Game not found";
      return;
    }

    let games = [];
    try { games = await loadGames(); }
    catch(e){
      document.getElementById("gameTitle").textContent = "読み込みエラー";
      return;
    }

    const g = games.find(x => String(x.id) === String(id));
    if(!g){
      document.getElementById("gameTitle").textContent = "Game not found";
      return;
    }

    document.title = `Mottainai Games - ${g.title || "Game"}`;
    document.getElementById("gameTitle").textContent = g.title || "";
    document.getElementById("gameCatch").textContent = g.catch || "";

    document.getElementById("players").textContent = g.players || "-";
    document.getElementById("time").textContent = g.time || "-";
    document.getElementById("age").textContent = g.age || "-";

    // features
    const ul = document.getElementById("features");
    ul.innerHTML = "";
    (g.features || []).forEach(t => ul.appendChild(el("li", {}, [t])));

    // buttons
    setBtn("rulesBtn", g.rulesPdf);
    setBtn("shopBtn", g.shopUrl);
    setBtn("videoBtn", g.videoUrl);

    // gallery
    const imgs = (g.images && g.images.length) ? g.images : [PLACEHOLDER];
    const main = document.getElementById("mainImage");
    const thumbs = document.getElementById("thumbs");
    thumbs.innerHTML = "";

    function setMain(src){
      main.src = src;
      for(const im of thumbs.querySelectorAll("img")){
        im.setAttribute("aria-current", (im.src === new URL(src, location.href).href) ? "true" : "false");
      }
    }

    imgs.forEach((src, i) => {
      const t = el("img", {
        class:"thumb",
        src,
        alt:`サムネイル ${i+1}`,
        "aria-current": i===0 ? "true" : "false",
        onclick: () => setMain(src)
      });
      thumbs.appendChild(t);
    });

    setMain(imgs[0]);
  }

  return { renderIndex, renderGame };
})();

