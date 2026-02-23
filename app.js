(function () {
  "use strict";

  const DEFAULT_POKEMON = "Gruikui";
  const API_BASE_URL = "https://pokebuildapi.fr/api/v1/pokemon/";
  const CACHE_PREFIX = "pokeflex_";

  let searchForm;
  let pokemonInput;
  let errorMessage;
  let cardsContainer;
  let cardTemplate;

  document.addEventListener("DOMContentLoaded", function () {
    searchForm = document.getElementById("search-form");
    pokemonInput = document.getElementById("pokemon-input");
    errorMessage = document.getElementById("error-message");
    cardsContainer = document.getElementById("cards-container");
    cardTemplate = document.getElementById("pokemon-card-template");

    if (
      !searchForm ||
      !pokemonInput ||
      !errorMessage ||
      !cardsContainer ||
      !cardTemplate
    ) {
      console.error(
        "PokéCSS: Éléments HTML manquants. Vérifie que tu n'as pas modifié les IDs.",
      );
      return;
    }

    searchForm.addEventListener("submit", handleSearch);

    if (DEFAULT_POKEMON && DEFAULT_POKEMON.trim()) {
      loadDefaultPokemon(DEFAULT_POKEMON.trim());
    }
  });

  async function loadDefaultPokemon(name) {
    try {
      const pokemon = await fetchPokemon(name);
      createOrMovePokemonCard(pokemon);
    } catch (error) {
      console.warn(
        "PokéCSS: Impossible de charger le Pokémon par défaut:",
        error.message,
      );
    }
  }

  async function handleSearch(event) {
    event.preventDefault();
    const searchValue = pokemonInput.value.trim();
    if (!searchValue) return;
    hideError();
    try {
      const pokemon = await fetchPokemon(searchValue);
      createOrMovePokemonCard(pokemon);
      pokemonInput.value = "";
    } catch (error) {
      showError(error.message);
    }
  }

  function getCacheKey(name) {
    return CACHE_PREFIX + name.toLowerCase();
  }

  function getFromCache(name) {
    try {
      const key = getCacheKey(name);
      const cached = localStorage.getItem(key);
      if (cached) return JSON.parse(cached);
    } catch (error) {
      console.warn("PokéCSS: Erreur lecture cache:", error.message);
    }
    return null;
  }

  function saveToCache(name, data) {
    try {
      const key = getCacheKey(name);
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn("PokéCSS: Erreur écriture cache:", error.message);
    }
  }

  async function fetchPokemon(name) {
    const cached = getFromCache(name);
    if (cached) return cached;

    const encodedName = encodeURIComponent(name);
    const url = API_BASE_URL + encodedName;

    try {
      const response = await fetch(url);
      if (response.status === 404) {
        throw new Error("Pokémon introuvable. Vérifie l'orthographe.");
      }
      if (!response.ok) {
        throw new Error(
          "Erreur de connexion ou Pokémon introuvable. Réessaie plus tard.",
        );
      }
      const data = await response.json();
      saveToCache(name, data);
      return data;
    } catch (error) {
      if (error.name === "TypeError") {
        throw new Error("Erreur de connexion. Vérifie ta connexion internet.");
      }
      throw error;
    }
  }

  /**
   * Crée une carte ou remonte l'existante en tête si elle existe déjà
   */
  function createOrMovePokemonCard(pokemon) {
    let foundCard = null;
    const allCards = cardsContainer.querySelectorAll(".card");
    allCards.forEach((c) => {
      const nameEl = c.querySelector('[data-field="name"]');
      if (
        nameEl &&
        nameEl.textContent.toLowerCase() === pokemon.name.toLowerCase()
      ) {
        foundCard = c;
      }
    });

    if (foundCard) {
      cardsContainer.prepend(foundCard);
    } else {
      createPokemonCard(pokemon);
    }
  }

  function createPokemonCard(pokemon) {
    const cardClone = cardTemplate.content.cloneNode(true);
    const card = cardClone.querySelector(".card");

    const imageEl = card.querySelector('[data-field="image"]');
    if (imageEl) {
      const imageUrl = pokemon.image || "";
      const pokemonName = pokemon.name || "Pokémon";
      imageEl.src = imageUrl;
      imageEl.alt = "Image de " + pokemonName;
    }

    const nameEl = card.querySelector('[data-field="name"]');
    if (nameEl) nameEl.textContent = pokemon.name || "Inconnu";

    const idEl = card.querySelector('[data-field="id"]');
    if (idEl) idEl.textContent = pokemon.id != null ? pokemon.id : "—";

    const generationEl = card.querySelector('[data-field="generation"]');
    if (generationEl) {
      let gen = pokemon.apiGeneration || pokemon.generation || "—";
      if (typeof gen === "number") generationEl.textContent = gen;
      else if (typeof gen === "string") generationEl.textContent = gen;
      else generationEl.textContent = "—";
    }

    const typesContainer = card.querySelector('[data-field="types-container"]');
    if (typesContainer) {
      const types = extractTypes(pokemon);
      typesContainer.innerHTML = "";
      types.forEach(function (typeName) {
        const badge = document.createElement("span");
        badge.className = "type-badge";
        badge.textContent = typeName;
        typesContainer.appendChild(badge);
      });
    }

    const stats = extractStats(pokemon);
    const hpEl = card.querySelector('[data-stat="hp"]');
    if (hpEl) hpEl.textContent = stats.hp;
    const attackEl = card.querySelector('[data-stat="attack"]');
    if (attackEl) attackEl.textContent = stats.attack;
    const defenseEl = card.querySelector('[data-stat="defense"]');
    if (defenseEl) defenseEl.textContent = stats.defense;
    const spAttackEl = card.querySelector('[data-stat="special-attack"]');
    if (spAttackEl) spAttackEl.textContent = stats.specialAttack;
    const spDefenseEl = card.querySelector('[data-stat="special-defense"]');
    if (spDefenseEl) spDefenseEl.textContent = stats.specialDefense;
    const speedEl = card.querySelector('[data-stat="speed"]');
    if (speedEl) speedEl.textContent = stats.speed;

    // Ajoute la carte en tête
    cardsContainer.prepend(card);
  }

  function extractTypes(pokemon) {
    if (pokemon.apiTypes && Array.isArray(pokemon.apiTypes)) {
      return pokemon.apiTypes.map(function (t) {
        return t.name || "Type";
      });
    }
    if (pokemon.types && Array.isArray(pokemon.types)) {
      return pokemon.types.map(function (t) {
        if (typeof t === "object" && t.name) return t.name;
        if (typeof t === "string") return t;
        return "Type";
      });
    }
    return ["—"];
  }

  function extractStats(pokemon) {
    const defaultStats = {
      hp: "—",
      attack: "—",
      defense: "—",
      specialAttack: "—",
      specialDefense: "—",
      speed: "—",
    };
    if (!pokemon.stats) return defaultStats;
    const s = pokemon.stats;
    return {
      hp: s.HP != null ? s.HP : s.hp != null ? s.hp : "—",
      attack: s.attack != null ? s.attack : s.Attack != null ? s.Attack : "—",
      defense:
        s.defense != null ? s.defense : s.Defense != null ? s.Defense : "—",
      specialAttack:
        s.special_attack != null
          ? s.special_attack
          : s.specialAttack != null
            ? s.specialAttack
            : s["special-attack"] != null
              ? s["special-attack"]
              : "—",
      specialDefense:
        s.special_defense != null
          ? s.special_defense
          : s.specialDefense != null
            ? s.specialDefense
            : s["special-defense"] != null
              ? s["special-defense"]
              : "—",
      speed: s.speed != null ? s.speed : s.Speed != null ? s.Speed : "—",
    };
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.removeAttribute("hidden");
  }

  function hideError() {
    errorMessage.textContent = "";
    errorMessage.setAttribute("hidden", "");
  }
})();
