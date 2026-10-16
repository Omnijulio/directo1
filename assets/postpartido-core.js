(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Postpartido = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function event(raw) {
    return raw && Array.isArray(raw.programa) ? raw.programa.find(item => item.id === "postpartido") : null;
  }
  function currentEvent(raw, now) {
    const list = raw && raw.programa;
    if (!Array.isArray(list) || !list.length) return null;
    return list.reduce((active, item) => Date.parse(item.desde) <= now ? item : active, list[0]);
  }
  function resolve(raw, requested) {
    const post = event(raw);
    if (!post) return null;
    const mode = ["auto", "espera", "visitante", "local"].includes(requested) ? requested : "auto";
    const index = mode === "visitante" ? 1 : mode === "local" ? 2 : mode === "espera" ? 0 : Number(post.hablando) || 0;
    const speaker = index > 0 && (post.ponentes || [])[index - 1];
    const team = speaker && (raw.equipos || {})[speaker.equipo] || {};
    return {
      mode: speaker ? index === 1 ? "visitante" : "local" : "espera",
      title: speaker ? speaker.nombre : post.titulo || "Declaraciones de los entrenadores",
      subtitle: speaker ? speaker.cargo : post.subtitulo || "En breve · Tras el partido",
      venue: post.ubicacion || "El Plantío · Burgos",
      image: speaker ? team.escudo || "" : "assets/radio-evolucion.png",
      imageAlt: speaker ? "Escudo de " + (team.nombre || speaker.equipo) : "Radio Evolución",
      fallback: speaker ? team.siglas || "" : "RE",
      radio: !speaker
    };
  }
  return {event, currentEvent, resolve};
});
