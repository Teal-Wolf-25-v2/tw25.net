const MODRINTH_API = "https://api.modrinth.com/v2/search";
const MODRINTH_LOGO = "/images/modrinth.png";

async function loadModrinthMods() {
  const params = new URLSearchParams({
    query: "",
    facets: JSON.stringify([
      ["project_type:mod"],
      ["author:Teal_Wolf_25"]
    ]),
    limit: 40,
    index: "downloads"
  });

  const res = await fetch(`${MODRINTH_API}?${params}`, {
    headers: {
      "User-Agent": "tw25.net (contact@tw25.net)"
    }
  });

  const data = await res.json();
  renderModCards(data.hits);
}

function renderModCards(mods) {
  const container = document.querySelector(".modrinth");
  container.innerHTML = "";

  mods.forEach(mod => {
    const card = document.createElement("div");
    card.className = "mod";

    card.innerHTML = `
      <a href="https://modrinth.com/mod/${mod.slug}" title="Download on Modrinth" target="_blank">
        <img src="${MODRINTH_LOGO}" class="mr-logo">
      </a>

      <img
        src="${mod.icon_url || "/images/mods/default.png"}"
        class="mod-logo"
        alt="${mod.title}"
        loading="lazy"
      >

      <h1 class="mod-name">${mod.title}</h1>
      <p class="mod-desc">${mod.description}</p>
    `;

    container.appendChild(card);
  });
  const notice = document.createElement("footer");
  notice.className = "mr-notice";
  notice.innerText = "Modrinth logo and banner are property of Rinth, Inc.";
  container.appendChild(notice)
}

loadModrinthMods();
