/* =========================================================
   JokkoChat - Thème (clair ou sombre)
   Chargé dans le <head> de chaque page, AVANT l'affichage,
   pour éviter un flash blanc quand le thème sombre est choisi.
   Le choix est fait dans parametres.html.
   ========================================================= */
(function () {
    let theme = "clair";
    try {
        const parametres = JSON.parse(localStorage.getItem("jokko-parametres")) || {};
        // Seul « sombre » active le mode sombre (l'ancien choix « systeme » redevient clair)
        theme = parametres.theme === "sombre" ? "sombre" : "clair";
    } catch (erreur) {
        // Stockage indisponible : thème clair
    }
    document.documentElement.dataset.theme = theme;
})();
