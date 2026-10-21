/* =========================================================
   JokkoChat - Script principal
   Chaque bloc ne s'exécute que si les éléments existent
   sur la page courante.
   ========================================================= */

/* ---------- Données ----------
   CONTACTS, SALONS et les messages viennent de Supabase (js/donnees.js).
   Les clés sont les identifiants de la base : conversation.html?contact=<id> */
const STATUTS = {
    "en-ligne": "En ligne",
    "hors-ligne": "Hors ligne",
    "ecrit": "En train d'écrire..."
};

/* ---------- Salons créés et messages envoyés ----------
   Ils sont gardés dans le navigateur (localStorage) pour rester
   affichés après un rechargement de la page. */
const CLE_SALONS = "jokko-salons";
const CLE_MESSAGES = "jokko-messages";

function lireStockage(cle, valeurParDefaut) {
    try {
        return JSON.parse(localStorage.getItem(cle)) || valeurParDefaut;
    } catch (erreur) {
        return valeurParDefaut;
    }
}

// Retourne false si l'enregistrement a échoué (stockage plein ou indisponible)
function ecrireStockage(cle, valeur) {
    try {
        localStorage.setItem(cle, JSON.stringify(valeur));
        return true;
    } catch (erreur) {
        return false;
    }
}

/* ---------- Paramètres de l'utilisateur (parametres.html) ---------- */
const CLE_PARAMETRES = "jokko-parametres";
const PARAMETRES_PAR_DEFAUT = {
    son: true,              // son à l'arrivée d'un message
    accusesLecture: true,   // coches violettes « lu »
    ephemereDefaut: 0,      // messages éphémères par défaut (0 = désactivés)
    resume: true,           // bouton « Résumer »
    theme: "clair"          // "clair" ou "sombre" (appliqué par js/theme.js)
};
const parametres = Object.assign({}, PARAMETRES_PAR_DEFAUT, lireStockage(CLE_PARAMETRES, {}));
if (parametres.theme !== "sombre") {
    parametres.theme = "clair"; // l'ancien choix « systeme » n'existe plus
}

function enregistrerParametres() {
    return ecrireStockage(CLE_PARAMETRES, parametres);
}

// Petit message temporaire en bas de l'écran (élément #toast de la page)
let minuteurToast = null;
function afficherToast(texte) {
    let toast = document.getElementById("toast");
    if (!toast) {
        // Page sans zone de toast : on la crée
        toast = document.createElement("div");
        toast.className = "toast";
        toast.id = "toast";
        toast.setAttribute("role", "status");
        document.body.appendChild(toast);
    }
    toast.textContent = texte;
    toast.hidden = false;
    clearTimeout(minuteurToast);
    minuteurToast = setTimeout(function () {
        toast.hidden = true;
    }, 2500);
}

// Messages envoyés et réponses reçues. Format : { "contact:fatou": [...], "salon:general": [...] }
const messagesAjoutes = lireStockage(CLE_MESSAGES, {});

/* ---------- Modifications et réglages ----------
   - Modifications des messages d'origine (masqué, supprimé, ouvert...) :
     { "contact:ali:2": { masque: true } }
   - Réglages de chaque discussion (sourdine, messages éphémères) :
     { "contact:ali": { sourdine: true, ephemere: 3600 } }
   ephemere vaut "lecture" (effacé après lecture) ou une durée en secondes. */
const CLE_MODIFICATIONS = "jokko-modifications";
const CLE_REGLAGES = "jokko-reglages";
const DELAI_APRES_LECTURE = 15; // secondes avant d'effacer un message éphémère « après lecture »

const modificationsMessages = lireStockage(CLE_MODIFICATIONS, {});
const reglagesDiscussions = lireStockage(CLE_REGLAGES, {});

/* ---------- Messages enregistrés (messages-enregistres.html) ----------
   On garde une copie du message pour pouvoir l'afficher sans rouvrir la discussion. */
const CLE_ENREGISTRES = "jokko-messages-enregistres";

function lireEnregistres() {
    return lireStockage(CLE_ENREGISTRES, []);
}

function estEnregistre(message) {
    return lireEnregistres().some(function (enregistre) {
        return enregistre.id === message.id;
    });
}

function basculerEnregistrement(message, nomDiscussion, lien) {
    const enregistres = lireEnregistres();
    const position = enregistres.findIndex(function (enregistre) {
        return enregistre.id === message.id;
    });

    if (position > -1) {
        enregistres.splice(position, 1);
        afficherToast("Message retiré des enregistrés.");
    } else {
        enregistres.push({
            id: message.id,
            auteur: message.auteur,
            texte: message.texte || (message.audio ? "🎤 Message vocal" : "📷 Photo"),
            heure: message.heure,
            discussionNom: nomDiscussion,
            lien: lien
        });
        afficherToast("Message enregistré 🔖");
    }
    ecrireStockage(CLE_ENREGISTRES, enregistres);
}

function nouvelIdentifiant() {
    return "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Réglages d'une discussion. Sans choix pour cette discussion,
// on prend les messages éphémères par défaut des paramètres.
function reglageDe(cleStockage) {
    return Object.assign({ ephemere: parametres.ephemereDefaut }, reglagesDiscussions[cleStockage]);
}

// Effacé pour de bon : supprimé « pour moi » ou délai éphémère dépassé
function estEfface(message) {
    return message.supprime === "moi" || Boolean(message.expire && message.expire <= Date.now());
}

// Message dont le texte peut être cherché ou résumé
function estLisible(message) {
    return !message.systeme && !message.supprime && !message.masque && !message.vueUnique;
}

function preparerDiscussions(type, liste) {
    Object.keys(liste).forEach(function (cle) {
        const discussion = liste[cle];
        const cleStockage = type + ":" + cle;
        const ajoutes = messagesAjoutes[cleStockage] || [];

        // Chaque message reçoit un identifiant qui ne change plus
        discussion.messages.forEach(function (message, position) {
            message.id = message.id || cleStockage + ":" + position;
        });
        ajoutes.forEach(function (message, position) {
            message.id = message.id || cleStockage + ":a" + position;
        });

        discussion.messages = discussion.messages.concat(ajoutes);
        discussion.messages.forEach(function (message) {
            Object.assign(message, modificationsMessages[message.id]);
        });

        // On retire définitivement les messages effacés
        discussion.messages = discussion.messages.filter(function (message) {
            return !estEfface(message);
        });
        if (messagesAjoutes[cleStockage]) {
            messagesAjoutes[cleStockage] = ajoutes.filter(function (message) {
                return !estEfface(message);
            });
        }
    });
}

preparerDiscussions("contact", CONTACTS);
preparerDiscussions("salon", SALONS);
ecrireStockage(CLE_MESSAGES, messagesAjoutes);

/* ---------- Onglets Connexion / Inscription (index.html) ---------- */
const formConnexion = document.getElementById("form-connexion");
const formInscription = document.getElementById("form-inscription");

function afficherOnglet(nom) {
    const estConnexion = nom === "connexion";

    formConnexion.hidden = !estConnexion;
    formInscription.hidden = estConnexion;

    document.getElementById("onglet-connexion").classList.toggle("actif", estConnexion);
    document.getElementById("onglet-inscription").classList.toggle("actif", !estConnexion);
    document.getElementById("onglet-connexion").setAttribute("aria-selected", estConnexion);
    document.getElementById("onglet-inscription").setAttribute("aria-selected", !estConnexion);
}

if (formConnexion && formInscription) {
    document.getElementById("onglet-connexion").addEventListener("click", function () {
        afficherOnglet("connexion");
    });
    document.getElementById("onglet-inscription").addEventListener("click", function () {
        afficherOnglet("inscription");
    });

    // Liens « Créez-en un » / « Connectez-vous » en bas des formulaires
    document.querySelectorAll("[data-onglet]").forEach(function (lien) {
        lien.addEventListener("click", function (evenement) {
            evenement.preventDefault();
            afficherOnglet(lien.dataset.onglet);
        });
    });

    // Ouvrir directement l'inscription avec index.html#inscription
    if (window.location.hash === "#inscription") {
        afficherOnglet("inscription");
    }
}

/* ---------- Afficher / masquer le mot de passe ---------- */
document.querySelectorAll(".btn-oeil").forEach(function (bouton) {
    bouton.addEventListener("click", function () {
        const champ = bouton.parentElement.querySelector("input");
        const icone = bouton.querySelector("i");
        const estMasque = champ.type === "password";

        champ.type = estMasque ? "text" : "password";
        icone.className = estMasque ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
        bouton.setAttribute("aria-label", estMasque ? "Masquer le mot de passe" : "Afficher le mot de passe");
    });
});

/* ---------- Utilisateur connecté ---------- */
// donnees.js garde le profil de l'utilisateur connecté dans le localStorage
const CLE_UTILISATEUR = "jokko-utilisateur";

function lireUtilisateur() {
    try {
        return JSON.parse(localStorage.getItem(CLE_UTILISATEUR));
    } catch (erreur) {
        return null;
    }
}

// Messages d'erreur de Supabase traduits pour l'utilisateur
const ERREURS_COMPTE = {
    invalid_credentials: "Email ou mot de passe incorrect.",
    user_already_exists: "Un compte existe déjà avec cet email.",
    email_exists: "Un compte existe déjà avec cet email.",
    email_not_confirmed: "Confirmez d'abord votre email (lien reçu par courriel).",
    weak_password: "Mot de passe trop faible.",
    over_email_send_rate_limit: "Trop de tentatives. Réessayez dans quelques minutes."
};

// Crée le compte ou ouvre la session avec Supabase
async function envoyerFormulaireCompte(formulaire) {
    const email = formulaire.querySelector("input[type=email]").value.trim();
    const motDePasse = formulaire.querySelector("input[type=password]").value;

    if (formulaire.id === "form-inscription") {
        const session = await inscrire(email, motDePasse, {
            nom: document.getElementById("nom").value.trim(),
            niveau: document.getElementById("niveau").value,
            specialite: document.getElementById("specialite").value.trim(),
            departement: document.getElementById("departement").value.trim()
        });
        return session !== null;
    }
    await connecter(email, motDePasse);
    return true;
}

/* ---------- Validation des formulaires ---------- */
function afficherErreur(input, message) {
    const champ = input.closest(".champ");
    champ.classList.toggle("invalide", message !== "");
    champ.querySelector(".erreur").textContent = message;
}

function validerChamp(input) {
    let message = "";

    if (input.validity.valueMissing) {
        message = "Ce champ est obligatoire.";
    } else if (input.validity.typeMismatch && input.type === "email") {
        message = "Adresse email invalide.";
    } else if (input.validity.tooShort) {
        message = "Au moins " + input.minLength + " caractères.";
    } else if (input.id === "confirmation") {
        const motDePasse = document.getElementById("mdp-inscription").value;
        if (input.value !== motDePasse) {
            message = "Les mots de passe ne correspondent pas.";
        }
    }

    afficherErreur(input, message);
    return message === "";
}

document.querySelectorAll(".page-auth .formulaire").forEach(function (formulaire) {
    // Seuls les champs qui ont une zone d'erreur sont vérifiés
    const champs = Array.from(formulaire.querySelectorAll("input, select")).filter(function (input) {
        return input.closest(".champ") && input.closest(".champ").querySelector(".erreur");
    });

    formulaire.addEventListener("submit", function (evenement) {
        let toutEstValide = true;
        champs.forEach(function (input) {
            if (!validerChamp(input)) {
                toutEstValide = false;
            }
        });

        evenement.preventDefault();

        if (!toutEstValide) {
            formulaire.querySelector(".champ.invalide input, .champ.invalide select").focus();
            return;
        }

        const bouton = formulaire.querySelector("[type=submit]");
        const champMotDePasse = formulaire.querySelector("input[type=password]");
        bouton.disabled = true;

        envoyerFormulaireCompte(formulaire).then(function (connecte) {
            if (connecte) {
                window.location.href = formulaire.getAttribute("action");
                return;
            }
            // Confirmation d'email activée dans Supabase
            afficherErreur(champMotDePasse, "Compte créé ! Cliquez sur le lien reçu par email, puis connectez-vous.");
            bouton.disabled = false;
        }).catch(function (erreur) {
            afficherErreur(champMotDePasse, ERREURS_COMPTE[erreur.code] || "Erreur : " + erreur.message);
            champMotDePasse.focus();
            bouton.disabled = false;
        });
    });

    // On retire l'erreur dès que l'utilisateur corrige le champ
    champs.forEach(function (input) {
        input.addEventListener("input", function () {
            if (input.closest(".champ").classList.contains("invalide")) {
                validerChamp(input);
            }
        });
    });
});

/* =========================================================
   Menu (menu.html)
   ========================================================= */

/* ---------- Pages réservées aux utilisateurs connectés ---------- */
// Les pages avec <body class="page-app"> renvoient à la connexion
// si personne n'est connecté.
const utilisateurConnecte = lireUtilisateur();

if (document.body.classList.contains("page-app") && !utilisateurConnecte) {
    window.location.replace("index.html");
}

/* ---------- Déconnexion ---------- */
// Tout lien avec l'attribut data-deconnexion oublie l'utilisateur
document.querySelectorAll("[data-deconnexion]").forEach(function (lien) {
    lien.addEventListener("click", function (evenement) {
        evenement.preventDefault();
        deconnecter().finally(function () {
            window.location.href = lien.getAttribute("href");
        });
    });
});

/* ---------- Afficher le nom de l'utilisateur ---------- */
if (utilisateurConnecte && utilisateurConnecte.nom) {
    // Prénom seulement pour le message de bienvenue et la barre latérale
    const prenom = utilisateurConnecte.nom.split(" ")[0];

    document.querySelectorAll(".nom-utilisateur").forEach(function (element) {
        element.textContent = prenom;
    });
    document.querySelectorAll(".initiale-utilisateur").forEach(function (element) {
        // Garder la pastille « en ligne » si l'avatar en a une
        const pastille = element.querySelector(".pastille");
        mettrePhoto(element, utilisateurConnecte.photo_url, prenom);
        if (pastille) {
            element.appendChild(pastille);
        }
    });

    document.querySelectorAll(".nom-complet-utilisateur").forEach(function (element) {
        element.textContent = utilisateurConnecte.nom;
    });
    const profilEmail = document.getElementById("profil-email");
    if (profilEmail && utilisateurConnecte.email) {
        profilEmail.textContent = utilisateurConnecte.email;
    }
    const profilBio = document.getElementById("profil-bio");
    if (profilBio && utilisateurConnecte.bio) {
        profilBio.textContent = utilisateurConnecte.bio;
    }
    const profilPseudo = document.getElementById("profil-pseudo-texte");
    if (profilPseudo && utilisateurConnecte.pseudo) {
        profilPseudo.textContent = "@" + utilisateurConnecte.pseudo;
    }
    const profilTelephone = document.getElementById("profil-telephone-texte");
    if (profilTelephone && utilisateurConnecte.telephone) {
        profilTelephone.textContent = utilisateurConnecte.telephone;
    }
}

/* ---------- Cloche de notifications ---------- */
// Les derniers messages reçus. Ceux arrivés depuis « Tout marquer comme lu » sont non lus.
const btnCloche = document.getElementById("btn-cloche");
const panneauNotifications = document.getElementById("panneau-notifications");
const CLE_NOTIFICATIONS_LUES = "jokko-notifications-lues";

function ouvrirNotifications(ouvrir) {
    panneauNotifications.hidden = !ouvrir;
    btnCloche.setAttribute("aria-expanded", ouvrir);
}

// Tous les messages reçus (pas les miens), du plus récent au plus ancien
function messagesRecus() {
    const recus = [];
    [["contact", CONTACTS], ["salon", SALONS]].forEach(function ([type, liste]) {
        Object.keys(liste).forEach(function (cle) {
            liste[cle].messages.forEach(function (message) {
                if (message.auteur !== "Moi" && message.date) {
                    recus.push({ type: type, cle: cle, message: message });
                }
            });
        });
    });
    return recus.sort(function (a, b) {
        return b.message.date.localeCompare(a.message.date);
    });
}

function afficherNotifications() {
    const liste = document.getElementById("liste-notifications");
    const badge = document.getElementById("badge-notifications");
    const luesJusqua = lireStockage(CLE_NOTIFICATIONS_LUES, "");
    const recus = messagesRecus();
    liste.innerHTML = "";

    recus.slice(0, 8).forEach(function ({ type, cle, message }) {
        const lien = document.createElement("a");
        lien.href = (type === "salon" ? "conversation-salon.html?salon=" : "conversation.html?contact=") + cle;
        const icone = document.createElement("i");
        icone.className = type === "salon" ? "fa-solid fa-hashtag" : "fa-solid fa-comment";
        const texte = document.createElement("span");
        const auteur = document.createElement("strong");
        auteur.textContent = message.auteur;
        texte.append(auteur, type === "salon" ? " dans # " + SALONS[cle].nom : " vous a envoyé un message");
        const heure = document.createElement("small");
        heure.textContent = message.heure;
        lien.append(icone, texte, heure);

        const ligne = document.createElement("li");
        if (message.date > luesJusqua) {
            ligne.className = "non-lue";
        }
        ligne.appendChild(lien);
        liste.appendChild(ligne);
    });

    if (recus.length === 0) {
        const vide = document.createElement("li");
        vide.className = "aucun-resultat";
        vide.textContent = "Aucune notification.";
        liste.appendChild(vide);
    }

    const nonLues = recus.filter(function ({ message }) {
        return message.date > luesJusqua;
    }).length;
    badge.textContent = nonLues > 9 ? "9+" : nonLues;
    badge.hidden = nonLues === 0;
}

if (btnCloche && panneauNotifications) {
    afficherNotifications();
    ecouteurs.message.push(afficherNotifications);

    btnCloche.addEventListener("click", function () {
        ouvrirNotifications(panneauNotifications.hidden);
    });

    document.getElementById("btn-tout-lu").addEventListener("click", function () {
        ecrireStockage(CLE_NOTIFICATIONS_LUES, new Date().toISOString());
        afficherNotifications();
    });

    // Fermer le panneau en cliquant ailleurs
    document.addEventListener("click", function (evenement) {
        if (!evenement.target.closest(".notifications")) {
            ouvrirNotifications(false);
        }
    });
}

/* ---------- Conversations récentes (menu.html) ---------- */
const listeRecentes = document.getElementById("liste-recentes");

function afficherRecentes() {
    const discussions = [];
    [["contact", CONTACTS], ["salon", SALONS]].forEach(function ([type, liste]) {
        Object.keys(liste).forEach(function (cle) {
            const dernier = liste[cle].messages[liste[cle].messages.length - 1];
            if (dernier && dernier.date) {
                discussions.push({ type: type, cle: cle, discussion: liste[cle], dernier: dernier });
            }
        });
    });
    discussions.sort(function (a, b) {
        return b.dernier.date.localeCompare(a.dernier.date);
    });

    listeRecentes.innerHTML = "";
    discussions.slice(0, 5).forEach(function ({ type, cle, discussion, dernier }) {
        const lien = document.createElement("a");
        lien.href = (type === "salon" ? "conversation-salon.html?salon=" : "conversation.html?contact=") + cle;

        const texte = document.createElement("div");
        texte.className = "recente-texte";
        const nom = document.createElement("p");
        nom.className = "recente-nom";
        nom.textContent = discussion.nom;
        const apercu = document.createElement("p");
        apercu.className = "recente-apercu";
        const contenu = dernier.supprime === "tous" ? "🚫 Message supprimé"
            : dernier.vueUnique ? "① Vue unique"
            : dernier.texte || (dernier.audio ? "🎤 Message vocal" : "📷 Photo");
        apercu.textContent = (dernier.auteur === "Moi" ? "Vous" : dernier.auteur) + " : " + contenu;
        texte.append(nom, apercu);

        const infos = document.createElement("div");
        infos.className = "recente-infos";
        const heure = document.createElement("small");
        heure.textContent = dernier.heure;
        infos.appendChild(heure);

        lien.append(creerAvatar(type, discussion), texte, infos);
        const ligne = document.createElement("li");
        ligne.appendChild(lien);
        listeRecentes.appendChild(ligne);
    });

    if (discussions.length === 0) {
        const vide = document.createElement("li");
        vide.className = "aucun-resultat";
        vide.textContent = "Aucune conversation pour l'instant. Écrivez à un contact ou dans un salon !";
        listeRecentes.appendChild(vide);
    }
}

if (listeRecentes) {
    afficherRecentes();
    ecouteurs.message.push(afficherRecentes);
    ecouteurs.statut.push(afficherRecentes);
}

/* ---------- Recherche globale ---------- */
// La liste de recherche est construite à partir de CONTACTS et SALONS (en haut du fichier)
const donneesRecherche = [];

Object.keys(CONTACTS).forEach(function (cle) {
    const contact = CONTACTS[cle];
    const lien = "conversation.html?contact=" + cle;

    donneesRecherche.push({ type: "Contact", nom: contact.nom, detail: STATUTS[contact.statut],
                            lien: lien, icone: "fa-user" });
    contact.messages.filter(estLisible).forEach(function (message) {
        const titre = message.auteur === "Moi" ? "Moi → " + contact.nom : contact.nom;
        donneesRecherche.push({ type: "Message", nom: titre, detail: message.texte || (message.audio ? "🎤 Message vocal" : "📷 Photo"),
                                lien: lien, icone: "fa-comment" });
    });
});

Object.keys(SALONS).forEach(function (cle) {
    const salon = SALONS[cle];
    const lien = "conversation-salon.html?salon=" + cle;

    donneesRecherche.push({ type: "Salon", nom: "# " + salon.nom, detail: salon.membres + " membres",
                            lien: lien, icone: "fa-hashtag" });
    salon.messages.filter(estLisible).forEach(function (message) {
        donneesRecherche.push({ type: "Message", nom: message.auteur + " (# " + salon.nom + ")",
                                detail: message.texte || (message.audio ? "🎤 Message vocal" : "📷 Photo"), lien: lien, icone: "fa-comment" });
    });
});

// Met en minuscules et retire les accents : « Études » -> « etudes »
function simplifier(texte) {
    return texte.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

const champRecherche = document.getElementById("recherche-globale");
const listeResultats = document.getElementById("resultats-recherche");

function afficherResultats() {
    const saisie = simplifier(champRecherche.value.trim());
    listeResultats.innerHTML = "";

    if (saisie === "") {
        listeResultats.hidden = true;
        return;
    }

    const resultats = donneesRecherche.filter(function (element) {
        return simplifier(element.nom).includes(saisie) || simplifier(element.detail).includes(saisie);
    });

    if (resultats.length === 0) {
        const vide = document.createElement("li");
        vide.className = "aucun-resultat";
        vide.textContent = "Aucun résultat pour « " + champRecherche.value.trim() + " »";
        listeResultats.appendChild(vide);
    }

    resultats.slice(0, 8).forEach(function (element) {
        const ligne = document.createElement("li");
        const lien = document.createElement("a");
        lien.href = element.lien;

        const icone = document.createElement("i");
        icone.className = "fa-solid " + element.icone;

        const texte = document.createElement("span");
        texte.className = "resultat-texte";
        const nom = document.createElement("strong");
        nom.textContent = element.nom;
        const detail = document.createElement("small");
        detail.textContent = element.detail;
        texte.append(nom, detail);

        const type = document.createElement("span");
        type.className = "resultat-type";
        type.textContent = element.type;

        lien.append(icone, texte, type);
        ligne.appendChild(lien);
        listeResultats.appendChild(ligne);
    });

    listeResultats.hidden = false;
}

if (champRecherche && listeResultats) {
    champRecherche.addEventListener("input", afficherResultats);
    champRecherche.addEventListener("focus", afficherResultats);

    // Flèche du bas : aller au premier résultat ; Échap : fermer
    champRecherche.addEventListener("keydown", function (evenement) {
        if (evenement.key === "ArrowDown") {
            const premier = listeResultats.querySelector("a");
            if (premier) {
                evenement.preventDefault();
                premier.focus();
            }
        } else if (evenement.key === "Escape") {
            listeResultats.hidden = true;
        }
    });

    // Naviguer dans les résultats avec les flèches
    listeResultats.addEventListener("keydown", function (evenement) {
        const liens = Array.from(listeResultats.querySelectorAll("a"));
        const position = liens.indexOf(document.activeElement);

        if (evenement.key === "ArrowDown" && position < liens.length - 1) {
            evenement.preventDefault();
            liens[position + 1].focus();
        } else if (evenement.key === "ArrowUp") {
            evenement.preventDefault();
            if (position > 0) {
                liens[position - 1].focus();
            } else {
                champRecherche.focus();
            }
        } else if (evenement.key === "Escape") {
            listeResultats.hidden = true;
            champRecherche.focus();
        }
    });

    // Fermer la liste en cliquant ailleurs
    document.addEventListener("click", function (evenement) {
        if (!evenement.target.closest(".zone-recherche")) {
            listeResultats.hidden = true;
        }
    });
}

// Touche Échap : fermer aussi les notifications
document.addEventListener("keydown", function (evenement) {
    if (evenement.key === "Escape" && panneauNotifications && !panneauNotifications.hidden) {
        ouvrirNotifications(false);
        btnCloche.focus();
    }
});

/* =========================================================
   Messagerie (conversation.html et conversation-salon.html)
   Les deux pages ont la même structure. L'attribut data-type
   du <body> indique quoi afficher : "contact" ou "salon".
   La discussion ouverte est dans l'adresse :
   conversation.html?contact=fatou  /  conversation-salon.html?salon=projets
   ========================================================= */
const typeMessagerie = document.body.dataset.type;

// Heure actuelle au format 10:05
function heureActuelle() {
    const maintenant = new Date();
    return String(maintenant.getHours()).padStart(2, "0") + ":" +
           String(maintenant.getMinutes()).padStart(2, "0");
}

// Durée au format 1:05
function formaterDuree(secondes) {
    return Math.floor(secondes / 60) + ":" + String(secondes % 60).padStart(2, "0");
}

// Petit cercle avec l'initiale du contact ou l'icône du salon
function creerAvatar(type, discussion) {
    const avatar = document.createElement("div");
    remplirAvatar(avatar, type, discussion);
    return avatar;
}

// Photo de profil en fond, sinon l'initiale
function mettrePhoto(avatar, photo, nom) {
    avatar.classList.toggle("avatar-photo", Boolean(photo));
    avatar.style.backgroundImage = photo ? "url(\"" + photo + "\")" : "";
    avatar.textContent = photo ? "" : nom.charAt(0).toUpperCase();
}

function remplirAvatar(avatar, type, discussion) {
    avatar.innerHTML = "";
    avatar.style.backgroundImage = "";

    if (type === "contact") {
        avatar.className = "avatar";
        mettrePhoto(avatar, discussion.photo || discussion.photo_url, discussion.nom);

        const pastille = document.createElement("span");
        pastille.className = discussion.statut === "hors-ligne" ? "pastille" : "pastille en-ligne";
        avatar.appendChild(pastille);
    } else {
        avatar.className = "avatar avatar-salon";
        avatar.style.background = discussion.couleur;

        const icone = document.createElement("i");
        icone.className = "fa-solid " + discussion.icone;
        avatar.appendChild(icone);
    }
}

if (typeMessagerie) {
    const donnees = typeMessagerie === "contact" ? CONTACTS : SALONS;
    const pageMessagerie = typeMessagerie === "contact" ? "conversation.html" : "conversation-salon.html";
    const cleOuverte = new URLSearchParams(window.location.search).get(typeMessagerie);
    // On peut écrire à un inscrit qui n'est pas (encore) dans ses contacts
    const discussionOuverte = donnees[cleOuverte]
        || (typeMessagerie === "contact" ? preparerContact(cleOuverte, false) : undefined);
    const cleStockageOuverte = typeMessagerie + ":" + cleOuverte;

    const listeDiscussions = document.getElementById("liste-discussions");
    const filtreDiscussions = document.getElementById("filtre-discussions");
    const zoneMessages = document.getElementById("messages");

    // Libellés des durées de messages éphémères
    const LIBELLES_EPHEMERE = {
        lecture: "après lecture",
        60: "1 minute",
        3600: "1 heure",
        86400: "24 heures",
        604800: "7 jours"
    };

    /* ---------- Qui est en train d'écrire ? ---------- */
    // Contact : son statut vaut "ecrit". Salon : le nom est dans ecritPar.
    function quiEcrit(discussion) {
        if (typeMessagerie === "contact") {
            return discussion.statut === "ecrit" ? discussion.nom : null;
        }
        return discussion.ecritPar || null;
    }

    // Petite icône (sourdine, éphémère...) avec une info-bulle
    function creerIndicateur(icone, description) {
        const element = document.createElement("i");
        element.className = "fa-solid " + icone;
        element.title = description;
        element.setAttribute("aria-label", description);
        return element;
    }

    /* ---------- Liste de gauche ---------- */
    function apercu(discussion) {
        const auteurEnTrain = quiEcrit(discussion);
        if (auteurEnTrain) {
            return typeMessagerie === "salon" ? auteurEnTrain + " écrit..." : "En train d'écrire...";
        }
        const dernier = discussion.messages[discussion.messages.length - 1];
        if (!dernier) {
            return "Aucun message pour l'instant";
        }
        if (dernier.systeme) {
            return dernier.texte;
        }

        let contenu;
        if (dernier.supprime === "tous") {
            contenu = "🚫 Message supprimé";
        } else if (dernier.masque) {
            contenu = "🙈 Message masqué";
        } else if (dernier.vueUnique) {
            contenu = dernier.ouvert ? "① Ouvert" : "① Vue unique";
        } else {
            contenu = dernier.texte || (dernier.audio ? "🎤 Message vocal" : "📷 Photo");
        }

        if (dernier.auteur === "Moi") {
            return "Vous : " + contenu;
        }
        return typeMessagerie === "salon" ? dernier.auteur + " : " + contenu : contenu;
    }

    function afficherListe() {
        const saisie = simplifier(filtreDiscussions.value.trim());
        listeDiscussions.innerHTML = "";

        Object.keys(donnees).forEach(function (cle) {
            const discussion = donnees[cle];
            if (!simplifier(discussion.nom).includes(saisie)) {
                return;
            }
            const reglage = reglageDe(typeMessagerie + ":" + cle);

            const lien = document.createElement("a");
            lien.href = pageMessagerie + "?" + typeMessagerie + "=" + cle;
            if (cle === cleOuverte) {
                lien.className = "actif";
                lien.setAttribute("aria-current", "page");
            }

            const texte = document.createElement("div");
            texte.className = "recente-texte";
            const nom = document.createElement("p");
            nom.className = "recente-nom";
            nom.textContent = typeMessagerie === "salon" ? "# " + discussion.nom : discussion.nom;
            const resume = document.createElement("p");
            resume.className = "recente-apercu";
            resume.textContent = apercu(discussion);
            if (quiEcrit(discussion)) {
                resume.classList.add("ecrit");
            }
            texte.append(nom, resume);

            const infos = document.createElement("div");
            infos.className = "recente-infos";
            const dernier = discussion.messages[discussion.messages.length - 1];
            const heure = document.createElement("small");
            heure.textContent = dernier ? dernier.heure : "";
            const icones = document.createElement("span");
            icones.className = "indicateurs";
            if (reglage.ephemere) {
                icones.appendChild(creerIndicateur("fa-stopwatch", "Messages éphémères"));
            }
            if (reglage.sourdine) {
                icones.appendChild(creerIndicateur("fa-bell-slash", "En sourdine"));
            }
            infos.append(heure, icones);

            lien.append(creerAvatar(typeMessagerie, discussion), texte, infos);
            const ligne = document.createElement("li");
            ligne.appendChild(lien);
            listeDiscussions.appendChild(ligne);
        });

        if (listeDiscussions.children.length === 0) {
            const vide = document.createElement("li");
            vide.className = "aucun-resultat";
            vide.textContent = "Aucun résultat.";
            listeDiscussions.appendChild(vide);
        }
    }

    filtreDiscussions.addEventListener("input", afficherListe);
    afficherListe();

    // Nouveau message ou changement de statut : la liste de gauche suit
    ecouteurs.message.push(afficherListe);
    ecouteurs.statut.push(afficherListe);

    /* ---------- Visionneuse d'image (image en grand) ---------- */
    const visionneuse = document.getElementById("visionneuse");

    function ouvrirVisionneuse(source, description) {
        const image = document.getElementById("visionneuse-image");
        image.src = source;
        image.alt = description;
        visionneuse.showModal();
    }

    // Fermer en cliquant n'importe où
    visionneuse.addEventListener("click", function () {
        visionneuse.close();
    });

    if (discussionOuverte) {
        document.body.classList.add("vue-chat");
        document.getElementById("chat-vide").hidden = true;
        document.getElementById("chat-actif").hidden = false;

        const titre = typeMessagerie === "salon" ? "# " + discussionOuverte.nom : discussionOuverte.nom;
        const titrePage = titre + " - JokkoChat";
        document.title = titrePage;
        document.getElementById("chat-nom").textContent = titre;
        remplirAvatar(document.getElementById("chat-avatar"), typeMessagerie, discussionOuverte);

        const formMessage = document.getElementById("form-message");
        const champMessage = document.getElementById("champ-message");
        const erreurSaisie = document.getElementById("erreur-saisie");
        const placeholderNormal = "Écrire un message à " + titre + "...";
        champMessage.placeholder = placeholderNormal;

        function montrerErreur(texte) {
            erreurSaisie.textContent = texte;
            erreurSaisie.hidden = texte === "";
        }

        /* ---------- Réglages de la discussion ---------- */
        function enregistrerReglage(champs) {
            reglagesDiscussions[cleStockageOuverte] = Object.assign({}, reglageDe(cleStockageOuverte), champs);
            ecrireStockage(CLE_REGLAGES, reglagesDiscussions);
        }

        // Applique le réglage « messages éphémères » à un nouveau message
        function appliquerEphemere(message) {
            const mode = reglageDe(cleStockageOuverte).ephemere;
            if (!mode || message.systeme) {
                return;
            }
            if (mode === "lecture") {
                if (message.auteur === "Moi") {
                    message.ephemereLecture = true; // le délai démarre quand il sera lu
                } else {
                    message.expire = Date.now() + DELAI_APRES_LECTURE * 1000; // on est en train de le lire
                }
            } else {
                message.expire = Date.now() + mode * 1000;
            }
        }

        // Les messages sont gardés dans Supabase : ici on ne fait que les afficher
        function ajouterMessage(message) {
            message.id = message.id || nouvelIdentifiant();
            appliquerEphemere(message);
            discussionOuverte.messages.push(message);
        }

        // Change un message sur cet appareil (masqué, ouvert, éphémère...) et le retient
        function modifierMessage(message, champs) {
            Object.assign(message, champs);
            modificationsMessages[message.id] = Object.assign({}, modificationsMessages[message.id], champs);
            return ecrireStockage(CLE_MODIFICATIONS, modificationsMessages);
        }

        // Le délai éphémère est propre à cet appareil : on le retient pour après un rechargement
        function retenirEphemere(message) {
            if (message.expire || message.ephemereLecture) {
                modifierMessage(message, { expire: message.expire, ephemereLecture: message.ephemereLecture });
            }
        }

        // Efface un message de cet appareil, définitivement
        function effacerPourMoi(message) {
            discussionOuverte.messages = discussionOuverte.messages.filter(function (element) {
                return element !== message;
            });
            modificationsMessages[message.id] = { supprime: "moi" };
            ecrireStockage(CLE_MODIFICATIONS, modificationsMessages);
        }

        // Retire le contenu (texte, image, son) : utilisé par « supprimer pour tous » et la vue unique
        const CONTENU_VIDE = { texte: "", image: null, audio: null };

        /* ---------- Bulles de messages ---------- */
        // États d'un message envoyé : envoyé (✓), reçu (✓✓ gris), lu (✓✓ violet)
        const ETATS = {
            envoye: { icone: "fa-check", texte: "Envoyé" },
            recu: { icone: "fa-check-double", texte: "Reçu" },
            lu: { icone: "fa-check-double lu", texte: "Lu" }
        };
        const LONGUEUR_MESSAGE_LONG = 200;

        // Temps restant avant l'effacement : « 0:42 », « 12 min », « 3 h », « 6 j »
        function tempsRestant(expire) {
            const secondes = Math.max(0, Math.ceil((expire - Date.now()) / 1000));
            if (secondes >= 86400) {
                return Math.round(secondes / 86400) + " j";
            }
            if (secondes >= 3600) {
                return Math.round(secondes / 3600) + " h";
            }
            if (secondes >= 600) {
                return Math.round(secondes / 60) + " min";
            }
            return formaterDuree(secondes);
        }

        function typeDeContenu(message) {
            if (message.image) {
                return "Photo";
            }
            return message.audio ? "Message vocal" : "Message";
        }

        function creerContenuImage(message, estMoi) {
            const image = document.createElement("img");
            image.className = "bulle-image";
            image.src = message.image;
            image.alt = "Image envoyée par " + (estMoi ? "vous" : message.auteur);
            image.addEventListener("click", function () {
                ouvrirVisionneuse(message.image, image.alt);
            });
            return image;
        }

        function creerContenuAudio(message, estMoi) {
            const vocal = document.createElement("div");
            vocal.className = "bulle-audio";

            const icone = document.createElement("i");
            icone.className = "fa-solid fa-microphone";

            const lecteur = document.createElement("audio");
            lecteur.controls = true;
            lecteur.preload = "metadata";
            lecteur.src = message.audio;
            lecteur.setAttribute("aria-label", "Message vocal de " + (estMoi ? "vous" : message.auteur));

            // Bug connu de Chrome : la durée d'un enregistrement vaut « Infinity ».
            // On saute à la fin puis on revient au début pour qu'il la calcule.
            lecteur.addEventListener("loadedmetadata", function () {
                if (lecteur.duration === Infinity) {
                    lecteur.currentTime = 1e101;
                    lecteur.addEventListener("timeupdate", function revenirAuDebut() {
                        lecteur.removeEventListener("timeupdate", revenirAuDebut);
                        lecteur.currentTime = 0;
                    });
                }
            });

            const duree = document.createElement("span");
            duree.className = "duree-audio";
            duree.textContent = formaterDuree(message.duree || 0);

            vocal.append(icone, lecteur, duree);
            return vocal;
        }

        // Texte, image et vocal d'un message normal
        function remplirContenu(bulle, message, estMoi) {
            if (message.image) {
                bulle.appendChild(creerContenuImage(message, estMoi));
            }
            if (message.audio) {
                bulle.appendChild(creerContenuAudio(message, estMoi));
            }
            if (message.texte) {
                const texte = document.createElement("p");
                texte.textContent = message.texte;
                bulle.appendChild(texte);
            }

            // Message long : bouton pour en afficher un résumé
            if (parametres.resume && message.texte && message.texte.length > LONGUEUR_MESSAGE_LONG) {
                const boutonResume = document.createElement("button");
                boutonResume.type = "button";
                boutonResume.className = "btn-resume-message";
                boutonResume.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Résumer ce message';

                const resume = document.createElement("p");
                resume.className = "bulle-resume";
                resume.hidden = true;
                resume.textContent = resumerTexte(message.texte, 2);

                boutonResume.addEventListener("click", function () {
                    resume.hidden = !resume.hidden;
                    boutonResume.lastChild.textContent = resume.hidden ? " Résumer ce message" : " Masquer le résumé";
                });
                bulle.append(boutonResume, resume);
            }
        }

        // Message à vue unique : on ne montre jamais le contenu dans la bulle
        function remplirVueUnique(bulle, message, estMoi) {
            const bloc = document.createElement(estMoi || message.ouvert ? "div" : "button");
            bloc.className = "vue-unique";

            const icone = document.createElement("span");
            icone.className = "icone-vue-unique";
            icone.textContent = "1";

            const texte = document.createElement("span");
            if (message.ouvert) {
                texte.textContent = "Ouvert";
                bloc.classList.add("ouvert");
            } else if (estMoi) {
                texte.textContent = typeDeContenu(message) + " à vue unique";
            } else {
                bloc.type = "button";
                texte.textContent = "Appuyer pour voir · " + typeDeContenu(message);
                bloc.addEventListener("click", function () {
                    ouvrirVueUnique(message);
                });
            }

            bloc.append(icone, texte);
            bulle.appendChild(bloc);
        }

        function creerBulle(message) {
            // Message du système (ex. « Vous avez activé les messages éphémères »)
            if (message.systeme) {
                const info = document.createElement("p");
                info.className = message.capture ? "message-systeme capture" : "message-systeme";
                info.textContent = message.texte;
                return info;
            }

            const estMoi = message.auteur === "Moi";
            const ligne = document.createElement("div");
            ligne.className = estMoi ? "bulle-ligne envoye" : "bulle-ligne recu";
            if (message.sbId) {
                ligne.dataset.sbId = message.sbId;
            }

            // Dans un salon, on montre qui parle (avatar + nom)
            if (!estMoi && typeMessagerie === "salon") {
                const avatar = document.createElement("div");
                avatar.className = "avatar avatar-petit";
                mettrePhoto(avatar, (PROFILS[message.auteurId] || {}).photo_url, message.auteur);
                ligne.appendChild(avatar);
            }

            const bulle = document.createElement("div");
            bulle.className = "bulle";

            // Bouton ⌄ qui ouvre le menu du message
            const boutonOptions = document.createElement("button");
            boutonOptions.type = "button";
            boutonOptions.className = "btn-options-message";
            boutonOptions.setAttribute("aria-label", "Options du message");
            boutonOptions.setAttribute("aria-haspopup", "menu");
            boutonOptions.setAttribute("aria-expanded", "false");
            boutonOptions.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';
            boutonOptions.addEventListener("click", function () {
                const peutReagir = message.sbId && message.supprime !== "tous";
                ouvrirMenu(boutonOptions, actionsMessage(message), peutReagir ? function (emoji) {
                    basculerReaction(message, emoji);
                } : null);
            });
            bulle.appendChild(boutonOptions);

            if (!estMoi && typeMessagerie === "salon") {
                const auteur = document.createElement("strong");
                auteur.className = "bulle-auteur";
                auteur.textContent = message.auteur;
                bulle.appendChild(auteur);
            }

            // Message auquel celui-ci répond
            if (message.reponseA && message.supprime !== "tous") {
                bulle.appendChild(creerCitation(message.reponseA));
            }

            if (message.supprime === "tous") {
                bulle.classList.add("bulle-supprimee");
                const texte = document.createElement("p");
                texte.innerHTML = '<i class="fa-solid fa-ban"></i> ';
                texte.append(estMoi ? "Vous avez supprimé ce message" : "Ce message a été supprimé");
                bulle.appendChild(texte);
            } else if (message.masque) {
                bulle.classList.add("bulle-masquee");
                const texte = document.createElement("p");
                texte.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Message masqué ';
                const afficher = document.createElement("button");
                afficher.type = "button";
                afficher.className = "lien-bouton";
                afficher.textContent = "Afficher";
                afficher.addEventListener("click", function () {
                    modifierMessage(message, { masque: false });
                    afficherMessages(false);
                    afficherListe();
                });
                texte.appendChild(afficher);
                bulle.appendChild(texte);
            } else if (message.vueUnique) {
                remplirVueUnique(bulle, message, estMoi);
            } else {
                remplirContenu(bulle, message, estMoi);
            }

            const heure = document.createElement("span");
            heure.className = "bulle-heure";

            // Compte à rebours des messages éphémères
            if (message.expire && message.supprime !== "tous") {
                const rebours = document.createElement("span");
                rebours.className = "compte-rebours";
                rebours.dataset.expire = message.expire;
                rebours.title = "Ce message s'effacera automatiquement";
                rebours.innerHTML = '<i class="fa-solid fa-stopwatch"></i> ';
                rebours.append(tempsRestant(message.expire));
                heure.append(rebours, " ");
            } else if (message.ephemereLecture) {
                heure.appendChild(creerIndicateur("fa-stopwatch", "S'effacera après lecture"));
                heure.append(" ");
            }

            if (estEnregistre(message)) {
                heure.appendChild(creerIndicateur("fa-bookmark", "Message enregistré"));
                heure.append(" ");
            }

            if (message.modifie && message.supprime !== "tous") {
                const mention = document.createElement("span");
                mention.className = "mention-modifie";
                mention.textContent = "modifié";
                heure.append(mention, " ");
            }

            heure.append(message.heure);
            if (estMoi && message.supprime !== "tous") {
                let etat = ETATS[message.etat] || ETATS.lu;
                // Accusés de lecture désactivés : on ne voit plus quand les autres ont lu
                if (etat === ETATS.lu && !parametres.accusesLecture) {
                    etat = ETATS.recu;
                }
                const icone = document.createElement("i");
                icone.className = "fa-solid " + etat.icone;
                icone.title = etat.texte;
                icone.setAttribute("aria-label", etat.texte);
                heure.append(" ", icone);
            }

            bulle.appendChild(heure);

            const reactions = creerReactions(message);
            if (reactions) {
                bulle.classList.add("avec-reactions");
                bulle.appendChild(reactions);
            }

            ligne.appendChild(bulle);
            return ligne;
        }

        /* ---------- Répondre à un message ---------- */
        function apercuDe(message) {
            if (!message || message.supprime === "tous") {
                return "🚫 Message supprimé";
            }
            if (message.vueUnique) {
                return "① Vue unique";
            }
            return message.texte || (message.audio ? "🎤 Message vocal" : "📷 Photo");
        }

        // Petit encadré « Awa : texte cité » ; un clic remonte jusqu'au message
        function creerCitation(sbId) {
            const cite = MESSAGES_PAR_ID[sbId];
            const bloc = document.createElement("button");
            bloc.type = "button";
            bloc.className = "citation";
            const auteur = document.createElement("strong");
            auteur.textContent = cite ? (cite.auteur === "Moi" ? "Vous" : cite.auteur) : "Message";
            const extrait = document.createElement("span");
            extrait.textContent = cite ? apercuDe(cite) : "Message indisponible";
            bloc.append(auteur, extrait);
            bloc.addEventListener("click", function () {
                const cible = zoneMessages.querySelector('[data-sb-id="' + sbId + '"]');
                if (cible) {
                    cible.scrollIntoView({ behavior: "smooth", block: "center" });
                    cible.classList.remove("surligne");
                    void cible.offsetWidth; // relance l'animation
                    cible.classList.add("surligne");
                }
            });
            return bloc;
        }

        const bandeauReponse = document.getElementById("bandeau-reponse");
        let messageEnReponse = null;

        function commencerReponse(message) {
            if (messageEnModification) {
                annulerModification();
            }
            messageEnReponse = message;
            document.getElementById("reponse-auteur").textContent =
                "Répondre à " + (message.auteur === "Moi" ? "vous-même" : message.auteur);
            document.getElementById("reponse-extrait").textContent = apercuDe(message);
            bandeauReponse.hidden = false;
            champMessage.focus();
        }

        function annulerReponse() {
            messageEnReponse = null;
            bandeauReponse.hidden = true;
        }

        document.getElementById("btn-annuler-reponse").addEventListener("click", function () {
            annulerReponse();
            champMessage.focus();
        });

        /* ---------- Réactions ---------- */
        const EMOJIS_REACTION = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

        // Pastilles sous la bulle : « ❤️ 2  😂 »
        function creerReactions(message) {
            const parEmoji = {};
            Object.keys(message.reactions || {}).forEach(function (id) {
                (parEmoji[message.reactions[id]] = parEmoji[message.reactions[id]] || []).push(id);
            });
            if (Object.keys(parEmoji).length === 0) {
                return null;
            }

            const zone = document.createElement("div");
            zone.className = "reactions-bulle";
            Object.keys(parEmoji).forEach(function (emoji) {
                const ids = parEmoji[emoji];
                const pastille = document.createElement("button");
                pastille.type = "button";
                pastille.className = ids.includes(moi) ? "reaction moi" : "reaction";
                pastille.textContent = emoji + (ids.length > 1 ? " " + ids.length : "");
                pastille.title = ids.map(function (id) {
                    return id === moi ? "Vous" : nomDe(id);
                }).join(", ");
                // Cliquer sur ma réaction la retire ; sur une autre, je réagis pareil
                pastille.addEventListener("click", function () {
                    basculerReaction(message, emoji);
                });
                zone.appendChild(pastille);
            });
            return zone;
        }

        function basculerReaction(message, emoji) {
            const avant = message.reactions[moi];
            const nouvelle = avant === emoji ? null : emoji;
            if (nouvelle) {
                message.reactions[moi] = nouvelle;
            } else {
                delete message.reactions[moi];
            }
            afficherMessages(false);
            reagir(message.sbId, nouvelle).catch(function () {
                if (avant) {
                    message.reactions[moi] = avant;
                } else {
                    delete message.reactions[moi];
                }
                afficherMessages(false);
                afficherToast("Réaction impossible. Réessayez.");
            });
        }

        // animerDernier : petite animation sur le message qui vient d'arriver
        function afficherMessages(animerDernier) {
            zoneMessages.innerHTML = "";
            discussionOuverte.messages.forEach(function (message) {
                zoneMessages.appendChild(creerBulle(message));
            });

            if (animerDernier && zoneMessages.lastElementChild) {
                zoneMessages.lastElementChild.classList.add("nouveau");
            }

            // Indicateur « en train d'écrire... » (trois points animés)
            const auteurEnTrain = quiEcrit(discussionOuverte);
            if (auteurEnTrain) {
                const ligne = document.createElement("div");
                ligne.className = "bulle-ligne recu";
                const bulle = document.createElement("div");
                bulle.className = "bulle bulle-ecrit";
                bulle.setAttribute("aria-label", auteurEnTrain + " est en train d'écrire");
                bulle.innerHTML = "<span></span><span></span><span></span>";
                ligne.appendChild(bulle);
                zoneMessages.appendChild(ligne);
            }

            // Toujours afficher le message le plus récent
            zoneMessages.scrollTop = zoneMessages.scrollHeight;
        }

        function afficherStatut() {
            const statut = document.getElementById("chat-statut");
            if (typeMessagerie === "salon") {
                const membres = discussionOuverte.membres + (discussionOuverte.membres > 1 ? " membres" : " membre");
                statut.textContent = discussionOuverte.ecritPar
                    ? discussionOuverte.ecritPar + " est en train d'écrire..."
                    : membres;
            } else {
                statut.textContent = STATUTS[discussionOuverte.statut];
            }
            statut.classList.toggle("ecrit", Boolean(quiEcrit(discussionOuverte)));

            // Icônes à côté du nom : messages éphémères, sourdine
            const reglage = reglageDe(cleStockageOuverte);
            const indicateurs = document.getElementById("chat-indicateurs");
            indicateurs.innerHTML = "";
            if (reglage.ephemere) {
                indicateurs.appendChild(creerIndicateur("fa-stopwatch",
                    "Messages éphémères : " + LIBELLES_EPHEMERE[reglage.ephemere]));
            }
            if (reglage.sourdine) {
                indicateurs.appendChild(creerIndicateur("fa-bell-slash", "Discussion en sourdine"));
            }
        }

        afficherStatut();
        afficherMessages(false);

        // Résumé automatique désactivé dans les paramètres : on cache le bouton
        document.getElementById("btn-resumer").hidden = !parametres.resume;

        /* ---------- Menu flottant (options d'un message ou de la discussion) ---------- */
        const menuFlottant = document.getElementById("menu-flottant");
        let ancreMenu = null;

        // actions : [{ icone, texte, danger, faire }]
        // surReaction : si présent, une rangée d'emojis s'affiche en haut du menu
        function ouvrirMenu(ancre, actions, surReaction) {
            fermerMenu();
            menuFlottant.innerHTML = "";
            if (surReaction) {
                const barre = document.createElement("div");
                barre.className = "barre-reactions";
                EMOJIS_REACTION.forEach(function (emoji) {
                    const bouton = document.createElement("button");
                    bouton.type = "button";
                    bouton.setAttribute("role", "menuitem");
                    bouton.setAttribute("aria-label", "Réagir " + emoji);
                    bouton.textContent = emoji;
                    bouton.addEventListener("click", function () {
                        fermerMenu();
                        surReaction(emoji);
                    });
                    barre.appendChild(bouton);
                });
                menuFlottant.appendChild(barre);
            }
            actions.forEach(function (action) {
                const bouton = document.createElement("button");
                bouton.type = "button";
                bouton.setAttribute("role", "menuitem");
                if (action.danger) {
                    bouton.className = "danger";
                }
                const icone = document.createElement("i");
                icone.className = "fa-solid " + action.icone;
                bouton.append(icone, " " + action.texte);
                bouton.addEventListener("click", function () {
                    fermerMenu();
                    action.faire();
                });
                menuFlottant.appendChild(bouton);
            });

            // Placer le menu sous le bouton, sans sortir de l'écran
            menuFlottant.hidden = false;
            const zone = ancre.getBoundingClientRect();
            const largeur = menuFlottant.offsetWidth;
            const hauteur = menuFlottant.offsetHeight;
            let gauche = Math.min(zone.right - largeur, window.innerWidth - largeur - 8);
            let haut = zone.bottom + 4;
            if (haut + hauteur > window.innerHeight - 8) {
                haut = zone.top - hauteur - 4;
            }
            menuFlottant.style.left = Math.max(8, gauche) + "px";
            menuFlottant.style.top = Math.max(8, haut) + "px";

            ancreMenu = ancre;
            ancre.setAttribute("aria-expanded", "true");
            menuFlottant.querySelector("button").focus();
        }

        function fermerMenu() {
            menuFlottant.hidden = true;
            if (ancreMenu) {
                ancreMenu.setAttribute("aria-expanded", "false");
                ancreMenu = null;
            }
        }

        document.addEventListener("click", function (evenement) {
            if (!evenement.target.closest("#menu-flottant, .btn-options-message, #btn-options-discussion")) {
                fermerMenu();
            }
        });

        document.addEventListener("keydown", function (evenement) {
            if (evenement.key === "Escape" && !menuFlottant.hidden) {
                const ancre = ancreMenu;
                fermerMenu();
                if (ancre) {
                    ancre.focus();
                }
            }
        });

        /* ---------- Fenêtre « Supprimer ? » ----------
           Retourne une promesse : "tous", "moi" ou null (annulé) */
        const fenetreSupprimer = document.getElementById("fenetre-supprimer");
        let choisirSuppression = null;

        function demanderSuppression(options) {
            document.getElementById("supprimer-titre").textContent = options.titre;
            document.getElementById("supprimer-texte").textContent = options.texte;
            document.getElementById("btn-supprimer-tous").hidden = !options.pourTous;
            document.getElementById("btn-supprimer-moi").textContent = options.libelleMoi || "Supprimer pour moi";
            fenetreSupprimer.showModal();
            return new Promise(function (resoudre) {
                choisirSuppression = resoudre;
            });
        }

        function terminerSuppression(choix) {
            if (choisirSuppression) {
                choisirSuppression(choix);
                choisirSuppression = null;
            }
            if (fenetreSupprimer.open) {
                fenetreSupprimer.close();
            }
        }

        document.getElementById("btn-supprimer-tous").addEventListener("click", function () {
            terminerSuppression("tous");
        });
        document.getElementById("btn-supprimer-moi").addEventListener("click", function () {
            terminerSuppression("moi");
        });
        document.getElementById("btn-supprimer-annuler").addEventListener("click", function () {
            terminerSuppression(null);
        });
        // Échap ferme la fenêtre : on considère que c'est « Annuler »
        fenetreSupprimer.addEventListener("close", function () {
            terminerSuppression(null);
        });

        /* ---------- Actions sur un message ---------- */
        function supprimerMessage(message) {
            const estMoi = message.auteur === "Moi";
            // « à Ali » ou « aux membres du salon »
            const autre = typeMessagerie === "salon" ? "aux membres du salon" : "à " + discussionOuverte.nom;

            demanderSuppression({
                titre: "Supprimer le message ?",
                texte: estMoi && message.supprime !== "tous"
                    ? "« Pour tout le monde » le remplace par « Ce message a été supprimé » chez tous les participants. « Pour moi » l'efface seulement de votre appareil, définitivement."
                    : "Le message sera effacé de votre appareil, définitivement. Aucune notification n'est envoyée " + autre + ".",
                pourTous: estMoi && message.supprime !== "tous"
            }).then(function (choix) {
                if (choix === "tous") {
                    modifierMessage(message, Object.assign({ supprime: "tous", masque: false, vueUnique: false }, CONTENU_VIDE));
                    if (message.sbId) {
                        supprimerPourTous(message.sbId).catch(function () {
                            afficherToast("Suppression impossible pour les autres. Réessayez.");
                        });
                    }
                } else if (choix === "moi") {
                    effacerPourMoi(message);
                } else {
                    return;
                }
                afficherMessages(false);
                afficherListe();
            });
        }

        function actionsMessage(message) {
            const actions = [];

            if (message.supprime !== "tous") {
                if (message.masque) {
                    actions.push({ icone: "fa-eye", texte: "Afficher le message", faire: function () {
                        modifierMessage(message, { masque: false });
                        afficherMessages(false);
                        afficherListe();
                    } });
                } else {
                    // Masquer = mettre le message « en sourdine » : seulement chez moi, l'autre ne le sait pas
                    actions.push({ icone: "fa-eye-slash", texte: "Masquer (seulement pour moi)", faire: function () {
                        modifierMessage(message, { masque: true });
                        afficherMessages(false);
                        afficherListe();
                        afficherToast("Message masqué. Personne d'autre n'en est informé.");
                    } });
                }
            }

            if (message.sbId && message.supprime !== "tous") {
                actions.unshift({ icone: "fa-reply", texte: "Répondre", faire: function () {
                    commencerReponse(message);
                } });
            }

            // Modifier : mes messages texte déjà enregistrés dans la base
            if (message.auteur === "Moi" && message.texte && message.sbId && !message.vueUnique && message.supprime !== "tous") {
                actions.splice(1, 0, { icone: "fa-pen", texte: "Modifier", faire: function () {
                    commencerModification(message);
                } });
            }

            if (message.texte && !message.masque && !message.vueUnique && message.supprime !== "tous" && navigator.clipboard) {
                actions.push({ icone: "fa-copy", texte: "Copier le texte", faire: function () {
                    navigator.clipboard.writeText(message.texte).then(function () {
                        afficherToast("Texte copié.");
                    });
                } });
            }

            if (message.supprime !== "tous" && !message.vueUnique) {
                const enregistre = estEnregistre(message);
                actions.push({ icone: "fa-bookmark", texte: enregistre ? "Retirer des enregistrés" : "Enregistrer le message", faire: function () {
                    basculerEnregistrement(message, discussionOuverte.nom, pageMessagerie + "?" + typeMessagerie + "=" + cleOuverte);
                    afficherMessages(false);
                } });
            }

            actions.push({ icone: "fa-trash-can", texte: "Supprimer...", danger: true, faire: function () {
                supprimerMessage(message);
            } });
            return actions;
        }

        /* ---------- Vue unique ---------- */
        // Bouton ① : le prochain message (texte, image ou vocal) ne pourra être ouvert qu'une fois
        const btnVueUnique = document.getElementById("btn-vue-unique");
        let vueUniqueActive = false;

        function activerVueUnique(actif) {
            vueUniqueActive = actif;
            btnVueUnique.setAttribute("aria-pressed", actif);
            champMessage.placeholder = actif ? "Message à vue unique..." : placeholderNormal;
        }

        btnVueUnique.addEventListener("click", function () {
            activerVueUnique(!vueUniqueActive);
            afficherToast(vueUniqueActive
                ? "Vue unique activée : le prochain message ne pourra être ouvert qu'une fois."
                : "Vue unique désactivée.");
            champMessage.focus();
        });

        // Ouvrir un message à vue unique reçu : il est effacé dès qu'on ferme la fenêtre
        const fenetreVueUnique = document.getElementById("fenetre-vue-unique");
        const contenuVueUnique = document.getElementById("contenu-vue-unique");
        let messageVueUnique = null;

        function ouvrirVueUnique(message) {
            messageVueUnique = message;
            contenuVueUnique.innerHTML = "";
            remplirContenu(contenuVueUnique, message, false);
            fenetreVueUnique.showModal();
        }

        document.getElementById("btn-fermer-vue-unique").addEventListener("click", function () {
            fenetreVueUnique.close();
        });

        fenetreVueUnique.addEventListener("close", function () {
            if (!messageVueUnique) {
                return;
            }
            modifierMessage(messageVueUnique, Object.assign({ ouvert: true }, CONTENU_VIDE));
            // Message privé : l'expéditeur voit « Ouvert » et le contenu disparaît de la base
            if (typeMessagerie === "contact" && messageVueUnique.sbId) {
                ouvrirVueUniqueBase(messageVueUnique.sbId);
            }
            messageVueUnique = null;
            contenuVueUnique.innerHTML = "";
            afficherMessages(false);
            afficherListe();
        });

        /* ---------- Captures d'écran ----------
           Une page web ne peut PAS empêcher ni détecter à coup sûr une capture.
           On repère seulement les raccourcis clavier, quand la page est au premier plan :
           - Windows : touche Impr. écran, ou Win + Maj + S (outil Capture)
           - Mac : Cmd + Maj + 3, 4 ou 5
           Les captures faites sur téléphone ou avec une autre application ne sont pas vues.
           Quand on en repère une, on prévient la discussion. Avec un vrai serveur,
           l'autre personne verrait « Kader a fait une capture d'écran ». */
        let derniereCapture = 0;

        function estRaccourciCapture(evenement) {
            if (evenement.key === "PrintScreen") {
                return true;
            }
            // metaKey = touche Cmd (Mac) ou Windows (PC)
            if (!evenement.metaKey || !evenement.shiftKey) {
                return false;
            }
            // On regarde la touche physique (code) : sur un clavier AZERTY, Maj + 3 ne donne pas « 3 »
            return ["Digit3", "Digit4", "Digit5", "KeyS"].includes(evenement.code);
        }

        function signalerCapture() {
            // Un même raccourci peut déclencher plusieurs événements : un seul signalement
            if (Date.now() - derniereCapture < 3000) {
                return;
            }
            derniereCapture = Date.now();

            const informe = typeMessagerie === "salon"
                ? "La capture a été signalée aux membres du salon."
                : "La capture a été signalée à " + discussionOuverte.nom + ".";
            const surVueUnique = fenetreVueUnique.open;

            ajouterMessage({
                systeme: true,
                capture: true,
                heure: heureActuelle(),
                texte: "📸 Vous avez fait une capture d'écran" +
                       (surVueUnique ? " d'un message à vue unique" : "") + ". " + informe
            });
            afficherMessages(true);
            afficherListe();
            afficherToast("Capture d'écran signalée.");
        }

        ["keydown", "keyup"].forEach(function (typeEvenement) {
            document.addEventListener(typeEvenement, function (evenement) {
                if (estRaccourciCapture(evenement)) {
                    signalerCapture();
                }
            });
        });

        // Message à vue unique ouvert : on le floute dès que la page perd le focus
        // (c'est souvent ce qui se passe quand un outil de capture s'ouvre)
        function flouterVueUnique(flou) {
            contenuVueUnique.classList.toggle("floute", flou && fenetreVueUnique.open);
        }

        window.addEventListener("blur", function () {
            flouterVueUnique(true);
        });
        window.addEventListener("focus", function () {
            flouterVueUnique(false);
        });
        document.addEventListener("visibilitychange", function () {
            flouterVueUnique(document.hidden);
        });

        /* ---------- Options de la discussion (bouton ⋮) ---------- */
        const fenetreEphemere = document.getElementById("fenetre-ephemere");
        const formEphemere = document.getElementById("form-ephemere");

        function effacerDiscussion() {
            // « à Ali » ou « aux membres du salon »
            const autre = typeMessagerie === "salon" ? "aux membres du salon" : "à " + discussionOuverte.nom;
            demanderSuppression({
                titre: "Effacer la discussion ?",
                texte: "Tous les messages seront effacés de votre appareil, définitivement. Aucune notification n'est envoyée " + autre + ".",
                pourTous: false,
                libelleMoi: "Effacer la discussion"
            }).then(function (choix) {
                if (choix !== "moi") {
                    return;
                }
                discussionOuverte.messages.slice().forEach(effacerPourMoi);
                afficherMessages(false);
                afficherListe();
                afficherToast("Discussion effacée.");
            });
        }

        document.getElementById("btn-options-discussion").addEventListener("click", function () {
            const bouton = this;
            const reglage = reglageDe(cleStockageOuverte);

            const optionsGroupe = discussionOuverte.prive ? [{
                icone: "fa-circle-info",
                texte: "Infos du groupe",
                faire: ouvrirInfosGroupe
            }] : [];

            ouvrirMenu(bouton, optionsGroupe.concat([
                {
                    // La sourdine coupe le son et les notifications ; l'autre personne n'est pas prévenue
                    icone: reglage.sourdine ? "fa-bell" : "fa-bell-slash",
                    texte: reglage.sourdine ? "Réactiver les notifications" : "Mettre en sourdine",
                    faire: function () {
                        enregistrerReglage({ sourdine: !reglage.sourdine });
                        afficherStatut();
                        afficherListe();
                        afficherToast(reglage.sourdine
                            ? "Notifications réactivées."
                            : "Discussion en sourdine. Aucune notification n'est envoyée à " + (typeMessagerie === "salon" ? "ce salon" : discussionOuverte.nom) + ".");
                    }
                },
                {
                    icone: "fa-stopwatch",
                    texte: "Messages éphémères" + (reglage.ephemere ? " (" + LIBELLES_EPHEMERE[reglage.ephemere] + ")" : ""),
                    faire: function () {
                        const valeur = String(reglage.ephemere || 0);
                        formEphemere.querySelectorAll("input[name=ephemere]").forEach(function (choix) {
                            choix.checked = choix.value === valeur;
                        });
                        fenetreEphemere.showModal();
                    }
                },
                {
                    icone: "fa-trash-can",
                    texte: "Effacer la discussion",
                    danger: true,
                    faire: effacerDiscussion
                }
            ]));
        });

        /* ---------- Infos du groupe (groupes privés) ----------
           Tout le monde voit les membres et peut quitter.
           Le créateur peut renommer, ajouter et retirer des membres. */
        const fenetreInfos = document.getElementById("fenetre-groupe-infos");

        function ouvrirInfosGroupe() {
            afficherInfosGroupe();
            fenetreInfos.showModal();
        }

        // garderNom : ne pas toucher au champ du nom (le créateur est peut-être en train de le taper)
        function afficherInfosGroupe(garderNom) {
            const groupe = discussionOuverte;
            const estCreateur = groupe.createurId === moi;
            const champNom = document.getElementById("infos-nom");

            if (!garderNom) {
                champNom.value = groupe.nom;
                champNom.readOnly = !estCreateur;
                document.getElementById("btn-renommer").hidden = !estCreateur;
                afficherErreur(champNom, "");
            }
            document.getElementById("infos-nombre").textContent = "(" + groupe.membresIds.length + ")";

            // Membres
            const liste = document.getElementById("infos-membres");
            liste.innerHTML = "";
            groupe.membresIds.forEach(function (id) {
                const profil = PROFILS[id] || { nom: "Utilisateur" };
                const personne = Object.assign({ statut: "hors-ligne" }, CONTACTS[id] || profil, { nom: id === moi ? "Vous" : nomDe(id) });
                let aDroite = null;
                if (estCreateur && id !== moi) {
                    aDroite = document.createElement("button");
                    aDroite.type = "button";
                    aDroite.className = "btn btn-secondaire btn-auto";
                    aDroite.textContent = "Retirer";
                    aDroite.addEventListener("click", function () {
                        aDroite.disabled = true;
                        retirerMembre(cleOuverte, id).then(function () {
                            groupe.membresIds = groupe.membresIds.filter(function (autre) {
                                return autre !== id;
                            });
                            groupe.membres = groupe.membresIds.length;
                            afficherInfosGroupe(true);
                            afficherStatut();
                        }).catch(function () {
                            aDroite.disabled = false;
                            afficherToast("Impossible de retirer ce membre.");
                        });
                    });
                }
                liste.appendChild(ligneChoix(personne, id === groupe.createurId ? "Créateur du groupe" : (profil.pseudo ? "@" + profil.pseudo : ""), aDroite));
            });

            // Ajouter : mes contacts qui ne sont pas encore membres
            const zoneAjout = document.getElementById("zone-ajout-membres");
            const listeAjout = document.getElementById("infos-ajout");
            listeAjout.innerHTML = "";
            Object.keys(CONTACTS).forEach(function (id) {
                if (!CONTACTS[id].estContact || groupe.membresIds.includes(id)) {
                    return;
                }
                const caseACocher = document.createElement("input");
                caseACocher.type = "checkbox";
                caseACocher.value = id;
                listeAjout.appendChild(ligneChoix(CONTACTS[id], STATUTS[CONTACTS[id].statut], caseACocher));
            });
            zoneAjout.hidden = !estCreateur || listeAjout.children.length === 0;
        }

        if (fenetreInfos) {
            fenetreInfos.querySelector("[data-fermer]").addEventListener("click", function () {
                fenetreInfos.close();
            });

            document.getElementById("form-renommer").addEventListener("submit", function (evenement) {
                evenement.preventDefault();
                const champNom = document.getElementById("infos-nom");
                const nom = champNom.value.trim();
                if (nom === "" || nom === discussionOuverte.nom) {
                    afficherErreur(champNom, nom === "" ? "Donnez un nom au groupe." : "");
                    return;
                }
                renommerGroupe(cleOuverte, nom).then(function () {
                    document.getElementById("chat-nom").textContent = "# " + nom;
                    afficherListe();
                    afficherToast("Groupe renommé.");
                }).catch(function (erreur) {
                    afficherErreur(champNom, erreur.code === "23505" ? "Ce nom est déjà pris." : "Impossible de renommer.");
                });
            });

            document.getElementById("btn-ajouter-membres").addEventListener("click", function () {
                const ids = Array.from(document.querySelectorAll("#infos-ajout input:checked")).map(function (caseACocher) {
                    return caseACocher.value;
                });
                if (ids.length === 0) {
                    return;
                }
                ajouterMembres(cleOuverte, ids).then(function () {
                    ids.forEach(function (id) {
                        if (!discussionOuverte.membresIds.includes(id)) {
                            discussionOuverte.membresIds.push(id);
                        }
                    });
                    discussionOuverte.membres = discussionOuverte.membresIds.length;
                    afficherInfosGroupe(true);
                    afficherStatut();
                    afficherToast(ids.length > 1 ? ids.length + " membres ajoutés." : "Membre ajouté.");
                }).catch(function () {
                    afficherToast("Ajout impossible. Réessayez.");
                });
            });

            document.getElementById("btn-quitter-groupe").addEventListener("click", function () {
                fenetreInfos.close();
                demanderSuppression({
                    titre: "Quitter le groupe ?",
                    texte: "Vous ne verrez plus ce groupe ni ses messages. Un membre pourra vous ajouter à nouveau.",
                    pourTous: false,
                    libelleMoi: "Quitter le groupe"
                }).then(function (choix) {
                    if (choix !== "moi") {
                        return;
                    }
                    retirerMembre(cleOuverte, moi).then(function () {
                        window.location.href = "salons.html";
                    }).catch(function () {
                        afficherToast("Impossible de quitter le groupe. Réessayez.");
                    });
                });
            });
        }

        document.getElementById("btn-annuler-ephemere").addEventListener("click", function () {
            fenetreEphemere.close();
        });

        formEphemere.addEventListener("submit", function (evenement) {
            evenement.preventDefault();
            const choix = formEphemere.querySelector("input[name=ephemere]:checked").value;
            const nouveau = choix === "lecture" ? "lecture" : Number(choix);
            fenetreEphemere.close();

            if (nouveau === (reglageDe(cleStockageOuverte).ephemere || 0)) {
                return;
            }
            enregistrerReglage({ ephemere: nouveau });

            // Message d'information dans la discussion (visible par tous les participants)
            ajouterMessage({
                systeme: true,
                heure: heureActuelle(),
                texte: nouveau
                    ? "⏱ Vous avez activé les messages éphémères (" + LIBELLES_EPHEMERE[nouveau] + "). Les nouveaux messages s'effaceront pour tout le monde."
                    : "Vous avez désactivé les messages éphémères."
            });
            afficherStatut();
            afficherMessages(true);
            afficherListe();
        });

        /* ---------- Effacement automatique des messages éphémères ---------- */
        setInterval(function () {
            const expires = discussionOuverte.messages.filter(function (message) {
                return message.expire && message.expire <= Date.now();
            });

            if (expires.length > 0) {
                expires.forEach(effacerPourMoi);
                afficherMessages(false);
                afficherListe();
                return;
            }

            // Sinon, on met seulement à jour les comptes à rebours
            zoneMessages.querySelectorAll(".compte-rebours").forEach(function (rebours) {
                rebours.lastChild.textContent = tempsRestant(Number(rebours.dataset.expire));
            });
        }, 1000);

        /* ---------- Emojis ---------- */
        const EMOJIS = ["😀", "😂", "😊", "😍", "🥰", "😎", "🤔", "😅", "😢", "😡",
                        "👍", "👎", "👏", "🙏", "💪", "👋", "🤝", "🔥", "🎉", "❤️",
                        "💯", "✅", "📚", "✏️", "💻", "☕", "🍕", "⚽", "🎵", "😴"];
        const btnEmoji = document.getElementById("btn-emoji");
        const panneauEmojis = document.getElementById("panneau-emojis");

        EMOJIS.forEach(function (emoji) {
            const bouton = document.createElement("button");
            bouton.type = "button";
            bouton.textContent = emoji;
            bouton.setAttribute("aria-label", "Insérer " + emoji);
            bouton.addEventListener("click", function () {
                // Insère l'emoji là où se trouve le curseur
                champMessage.setRangeText(emoji, champMessage.selectionStart, champMessage.selectionEnd, "end");
                champMessage.focus();
            });
            panneauEmojis.appendChild(bouton);
        });

        function ouvrirEmojis(ouvrir) {
            panneauEmojis.hidden = !ouvrir;
            btnEmoji.setAttribute("aria-expanded", ouvrir);
        }

        btnEmoji.addEventListener("click", function () {
            ouvrirEmojis(panneauEmojis.hidden);
        });

        document.addEventListener("click", function (evenement) {
            if (!evenement.target.closest("#panneau-emojis, #btn-emoji")) {
                ouvrirEmojis(false);
            }
        });

        document.addEventListener("keydown", function (evenement) {
            if (evenement.key === "Escape" && !panneauEmojis.hidden) {
                ouvrirEmojis(false);
                btnEmoji.focus();
            }
        });

        /* ---------- Partage d'images ---------- */
        const champFichier = document.getElementById("fichier-image");
        const apercuImage = document.getElementById("apercu-image");
        let imageChoisie = null; // image prête à être envoyée (format texte « data URL »)

        // Réduit l'image (800 px maximum) pour qu'elle tienne dans le navigateur
        function preparerImage(fichier) {
            return new Promise(function (resoudre, rejeter) {
                if (!fichier.type.startsWith("image/")) {
                    rejeter("Ce fichier n'est pas une image.");
                    return;
                }
                if (fichier.size > 10 * 1024 * 1024) {
                    rejeter("Image trop lourde (10 Mo maximum).");
                    return;
                }

                const image = new Image();
                const adresse = URL.createObjectURL(fichier);
                image.onload = function () {
                    const echelle = Math.min(1, 800 / Math.max(image.width, image.height));
                    const canvas = document.createElement("canvas");
                    canvas.width = Math.round(image.width * echelle);
                    canvas.height = Math.round(image.height * echelle);

                    const contexte = canvas.getContext("2d");
                    contexte.fillStyle = "#ffffff"; // fond blanc pour les images transparentes
                    contexte.fillRect(0, 0, canvas.width, canvas.height);
                    contexte.drawImage(image, 0, 0, canvas.width, canvas.height);

                    URL.revokeObjectURL(adresse);
                    resoudre(canvas.toDataURL("image/jpeg", 0.8));
                };
                image.onerror = function () {
                    URL.revokeObjectURL(adresse);
                    rejeter("Impossible de lire cette image.");
                };
                image.src = adresse;
            });
        }

        function retirerImage() {
            imageChoisie = null;
            champFichier.value = "";
            apercuImage.hidden = true;
        }

        document.getElementById("btn-image").addEventListener("click", function () {
            champFichier.click();
        });

        champFichier.addEventListener("change", function () {
            const fichier = champFichier.files[0];
            if (!fichier) {
                return;
            }
            preparerImage(fichier).then(function (image) {
                imageChoisie = image;
                document.getElementById("apercu-image-img").src = image;
                apercuImage.hidden = false;
                montrerErreur("");
                champMessage.focus();
            }).catch(function (erreur) {
                retirerImage();
                montrerErreur(erreur);
            });
        });

        document.getElementById("btn-retirer-image").addEventListener("click", retirerImage);

        /* ---------- Notification (son + titre de l'onglet) ---------- */
        let contexteAudio = null;
        let nonLus = 0;

        // Le navigateur n'autorise le son qu'après une action de l'utilisateur :
        // on prépare donc le son au moment où il envoie un message.
        function preparerSon() {
            try {
                contexteAudio = contexteAudio || new AudioContext();
            } catch (erreur) {
                contexteAudio = null;
            }
        }

        function jouerSon() {
            if (!contexteAudio) {
                return;
            }
            try {
                const oscillateur = contexteAudio.createOscillator();
                const volume = contexteAudio.createGain();
                const debut = contexteAudio.currentTime;

                oscillateur.frequency.value = 880;
                volume.gain.setValueAtTime(0.15, debut);
                volume.gain.exponentialRampToValueAtTime(0.001, debut + 0.25);
                oscillateur.connect(volume).connect(contexteAudio.destination);
                oscillateur.start(debut);
                oscillateur.stop(debut + 0.25);
            } catch (erreur) {
                // Pas de son disponible : on continue sans
            }
        }

        function notifier() {
            // Discussion en sourdine : aucune notification
            if (reglageDe(cleStockageOuverte).sourdine) {
                return;
            }
            if (parametres.son) {
                jouerSon();
            }
            // Si l'utilisateur regarde un autre onglet : « (2) Fatou - JokkoChat »
            if (document.hidden) {
                nonLus++;
                document.title = "(" + nonLus + ") " + titrePage;
            }
        }

        document.addEventListener("visibilitychange", function () {
            if (!document.hidden) {
                nonLus = 0;
                document.title = titrePage;
            }
        });

        /* ---------- Temps réel (js/donnees.js) ---------- */
        // Message reçu d'un autre utilisateur
        ecouteurs.message.push(function (type, cle, message) {
            if (type === typeMessagerie && cle === cleOuverte) {
                appliquerEphemere(message);
                retenirEphemere(message);
                afficherMessages(true);
                notifier();
                signalerLecture();
            }
        });

        /* ---------- Accusés de lecture (messages privés) ----------
           Discussion ouverte et onglet visible : les messages reçus sont « lus ».
           Paramètre désactivé : on n'envoie rien (et on ne voit pas ceux des autres). */
        function signalerLecture() {
            if (typeMessagerie !== "contact" || !parametres.accusesLecture || document.hidden) {
                return;
            }
            const nonLus = discussionOuverte.messages.filter(function (message) {
                return message.auteur !== "Moi" && message.sbId && !message.luParMoi;
            });
            if (nonLus.length === 0) {
                return;
            }
            nonLus.forEach(function (message) {
                message.luParMoi = true;
            });
            marquerLus(cleOuverte);
        }

        signalerLecture();
        document.addEventListener("visibilitychange", signalerLecture);

        // Quelqu'un se connecte, écrit, ou supprime un message
        ecouteurs.statut.push(function () {
            afficherStatut();
            // Groupe renommé
            document.getElementById("chat-nom").textContent =
                typeMessagerie === "salon" ? "# " + discussionOuverte.nom : discussionOuverte.nom;
            remplirAvatar(document.getElementById("chat-avatar"), typeMessagerie, discussionOuverte);
            afficherMessages(false);
            // Fenêtre « Infos du groupe » ouverte : membres à jour
            if (fenetreInfos && fenetreInfos.open) {
                afficherInfosGroupe(true);
            }
        });

        // Retiré du groupe ouvert : retour à la liste des salons
        ecouteurs.retire.push(function (salonId) {
            if (typeMessagerie === "salon" && salonId === cleOuverte) {
                afficherToast("Vous ne faites plus partie de ce groupe.");
                setTimeout(function () {
                    window.location.href = "salons.html";
                }, 1500);
            }
        });

        // Prévenir l'autre personne que j'écris (pas pendant une modification)
        champMessage.addEventListener("input", function () {
            if (champMessage.value.trim() !== "" && !messageEnModification) {
                signalerEcriture(typeMessagerie, cleOuverte);
            }
        });

        /* ---------- Envoi d'un message (texte, image ou vocal) ---------- */
        // contenu : { texte, image } ou { audio, duree }
        function envoyerMessage(contenu) {
            const message = Object.assign({ auteur: "Moi", heure: heureActuelle(), date: new Date().toISOString(), texte: "", etat: "envoye" }, contenu);
            if (vueUniqueActive) {
                message.vueUnique = true;
                activerVueUnique(false); // la vue unique ne vaut que pour un message
            }
            if (messageEnReponse) {
                message.reponseA = messageEnReponse.sbId;
                annulerReponse();
            }
            message.reactions = {};

            ajouterMessage(message);
            montrerErreur("");
            afficherMessages(true);
            afficherListe();

            // Envoi à Supabase : ✓ en attendant, ✓✓ une fois enregistré
            enregistrerMessage(typeMessagerie, cleOuverte, message).then(function (ligne) {
                message.sbId = ligne.id;
                message.id = "sb:" + ligne.id;
                indexerMessage(message);
                retenirEphemere(message);
                message.image = ligne.image_url || message.image;
                message.audio = ligne.audio_url || message.audio;
                message.etat = "recu";
                afficherMessages(false);
            }).catch(function (erreur) {
                console.error(erreur);
                discussionOuverte.messages = discussionOuverte.messages.filter(function (element) {
                    return element !== message;
                });
                afficherMessages(false);
                afficherListe();
                montrerErreur("Le message n'a pas pu être envoyé. Vérifiez votre connexion et réessayez.");
            });
        }

        /* ---------- Modifier un message envoyé ----------
           Le texte revient dans la zone de saisie ; « Envoyer » enregistre la nouvelle version. */
        const bandeauModification = document.getElementById("bandeau-modification");
        let messageEnModification = null;

        function commencerModification(message) {
            annulerReponse();
            messageEnModification = message;
            document.getElementById("texte-avant-modification").textContent = message.texte;
            bandeauModification.hidden = false;
            retirerImage();
            champMessage.value = message.texte;
            champMessage.focus();
        }

        function annulerModification() {
            messageEnModification = null;
            bandeauModification.hidden = true;
            champMessage.value = "";
        }

        function terminerModification() {
            const message = messageEnModification;
            const texte = champMessage.value.trim();
            annulerModification();
            if (texte === "" || texte === message.texte) {
                return;
            }

            const avant = { texte: message.texte, modifie: message.modifie };
            Object.assign(message, { texte: texte, modifie: true });
            afficherMessages(false);
            afficherListe();
            modifierTexte(message.sbId, texte).catch(function () {
                Object.assign(message, avant);
                afficherMessages(false);
                montrerErreur("La modification n'a pas pu être enregistrée. Réessayez.");
            });
        }

        document.getElementById("btn-annuler-modification").addEventListener("click", function () {
            annulerModification();
            champMessage.focus();
        });

        document.addEventListener("keydown", function (evenement) {
            if (evenement.key === "Escape" && messageEnModification) {
                annulerModification();
            } else if (evenement.key === "Escape" && messageEnReponse) {
                annulerReponse();
            }
        });

        formMessage.addEventListener("submit", function (evenement) {
            evenement.preventDefault();
            preparerSon();

            if (messageEnModification) {
                terminerModification();
                return;
            }

            // Pendant un enregistrement, le bouton Envoyer envoie le vocal
            if (enregistreur && enregistreur.state === "recording") {
                arreterEnregistrement(false);
                return;
            }

            const texte = champMessage.value.trim();
            if (texte === "" && !imageChoisie) {
                return;
            }

            const contenu = { texte: texte };
            if (imageChoisie) {
                contenu.image = imageChoisie;
            }
            envoyerMessage(contenu);

            champMessage.value = "";
            retirerImage();
            ouvrirEmojis(false);
            champMessage.focus();
        });

        /* ---------- Messages vocaux ----------
           On enregistre le micro avec MediaRecorder (1 minute maximum),
           puis on garde le son au format texte (« data URL »), comme les images. */
        const DUREE_MAX_VOCAL = 60;
        const btnMicro = document.getElementById("btn-micro");
        const dureeEnregistrement = document.getElementById("duree-enregistrement");
        let enregistreur = null;
        let fluxMicro = null;
        let morceauxAudio = [];
        let debutEnregistrement = 0;
        let minuteurEnregistrement = null;
        let enregistrementAnnule = false;

        // Navigateur trop ancien : on cache le bouton
        if (!navigator.mediaDevices || !window.MediaRecorder) {
            btnMicro.hidden = true;
        }

        function secondesEcoulees() {
            return Math.floor((Date.now() - debutEnregistrement) / 1000);
        }

        function afficherModeEnregistrement(actif) {
            formMessage.classList.toggle("en-enregistrement", actif);
            document.getElementById("barre-enregistrement").hidden = !actif;
        }

        async function demarrerEnregistrement() {
            montrerErreur("");
            ouvrirEmojis(false);

            try {
                fluxMicro = await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (erreur) {
                montrerErreur("Accès au micro refusé. Autorisez le micro dans le navigateur pour envoyer un vocal.");
                return;
            }

            morceauxAudio = [];
            enregistrementAnnule = false;
            enregistreur = new MediaRecorder(fluxMicro);
            enregistreur.addEventListener("dataavailable", function (evenement) {
                if (evenement.data.size > 0) {
                    morceauxAudio.push(evenement.data);
                }
            });
            enregistreur.addEventListener("stop", terminerEnregistrement);
            enregistreur.start();

            debutEnregistrement = Date.now();
            dureeEnregistrement.textContent = "0:00";
            afficherModeEnregistrement(true);

            minuteurEnregistrement = setInterval(function () {
                const secondes = secondesEcoulees();
                dureeEnregistrement.textContent = formaterDuree(secondes);
                if (secondes >= DUREE_MAX_VOCAL) {
                    arreterEnregistrement(false); // 1 minute atteinte : on envoie
                }
            }, 250);
        }

        // annuler = true : on jette l'enregistrement au lieu de l'envoyer
        function arreterEnregistrement(annuler) {
            enregistrementAnnule = annuler;
            if (enregistreur && enregistreur.state !== "inactive") {
                enregistreur.stop(); // déclenche terminerEnregistrement
            }
        }

        function terminerEnregistrement() {
            const duree = Math.min(secondesEcoulees(), DUREE_MAX_VOCAL);
            clearInterval(minuteurEnregistrement);
            fluxMicro.getTracks().forEach(function (piste) {
                piste.stop(); // éteint le micro
            });
            afficherModeEnregistrement(false);
            champMessage.focus();

            if (enregistrementAnnule || morceauxAudio.length === 0) {
                return;
            }
            if (duree < 1) {
                montrerErreur("Message vocal trop court.");
                return;
            }

            const son = new Blob(morceauxAudio, { type: enregistreur.mimeType || "audio/webm" });
            const lecteurFichier = new FileReader();
            lecteurFichier.onload = function () {
                envoyerMessage({ audio: lecteurFichier.result, duree: duree });
            };
            lecteurFichier.readAsDataURL(son);
        }

        btnMicro.addEventListener("click", demarrerEnregistrement);

        document.getElementById("btn-annuler-vocal").addEventListener("click", function () {
            arreterEnregistrement(true);
        });

        // Échap pendant l'enregistrement : annuler
        document.addEventListener("keydown", function (evenement) {
            if (evenement.key === "Escape" && enregistreur && enregistreur.state === "recording") {
                arreterEnregistrement(true);
            }
        });

        /* ---------- Résumé automatique de la conversation ---------- */
        const fenetreResume = document.getElementById("fenetre-resume");
        const contenuResume = document.getElementById("contenu-resume");

        function ajouterSection(titreSection, elements) {
            if (elements.length === 0) {
                return;
            }
            const titreH3 = document.createElement("h3");
            titreH3.textContent = titreSection;
            const liste = document.createElement("ul");
            elements.forEach(function (element) {
                const ligne = document.createElement("li");
                const auteur = document.createElement("strong");
                auteur.textContent = element.auteur + " : ";
                ligne.append(auteur, element.phrase);
                liste.appendChild(ligne);
            });
            contenuResume.append(titreH3, liste);
        }

        document.getElementById("btn-resumer").addEventListener("click", function () {
            const resume = resumerConversation(discussionOuverte.messages.filter(estLisible));
            contenuResume.innerHTML = "";

            const statistiques = document.createElement("p");
            statistiques.className = "resume-stats";
            let infos = resume.nombreMessages + (resume.nombreMessages > 1 ? " messages" : " message") +
                        " · " + resume.participants.join(", ");
            if (resume.debut === "") {
                // Aucun message : pas de période à afficher
            } else if (resume.debut === resume.fin) {
                infos += " · " + resume.debut;
            } else {
                infos += " · de " + resume.debut + " à " + resume.fin;
            }
            if (resume.nombreVocaux > 0) {
                infos += " · " + resume.nombreVocaux + (resume.nombreVocaux > 1 ? " vocaux" : " vocal");
            }
            if (resume.nombreImages > 0) {
                infos += " · " + resume.nombreImages + (resume.nombreImages > 1 ? " images" : " image");
            }
            statistiques.textContent = infos;
            contenuResume.appendChild(statistiques);

            if (resume.pointsCles.length === 0) {
                const vide = document.createElement("p");
                vide.className = "aucun-resultat";
                vide.textContent = "Pas assez de texte à résumer pour l'instant.";
                contenuResume.appendChild(vide);
            }

            ajouterSection("Points clés", resume.pointsCles);
            ajouterSection("Questions posées", resume.questions);
            ajouterSection("À retenir (dates, heures)", resume.aRetenir);

            fenetreResume.showModal();
        });

        document.getElementById("btn-fermer-resume").addEventListener("click", function () {
            fenetreResume.close();
        });
    }
}

/* =========================================================
   Paramètres (parametres.html)
   Chaque réglage est enregistré dès qu'on le change.
   ========================================================= */
const formParametres = document.getElementById("form-parametres");

if (formParametres) {
    // Remplir le formulaire avec les réglages actuels
    formParametres.elements.son.checked = parametres.son;
    formParametres.elements.accusesLecture.checked = parametres.accusesLecture;
    formParametres.elements.resume.checked = parametres.resume;
    formParametres.elements.ephemereDefaut.value = String(parametres.ephemereDefaut);

    formParametres.addEventListener("change", function (evenement) {
        const champ = evenement.target;

        if (champ.type === "checkbox") {
            parametres[champ.name] = champ.checked;
        } else if (champ.name === "ephemereDefaut") {
            parametres.ephemereDefaut = champ.value === "lecture" ? "lecture" : Number(champ.value);
        }

        afficherToast(enregistrerParametres() ? "Réglage enregistré." : "Impossible d'enregistrer (stockage indisponible).");
    });

    /* ---------- Thème : appliqué seulement quand on clique sur un bouton ---------- */
    const boutonsTheme = document.querySelectorAll(".choix-segmente button");

    function afficherThemeChoisi() {
        boutonsTheme.forEach(function (bouton) {
            bouton.setAttribute("aria-pressed", bouton.dataset.theme === parametres.theme);
        });
    }

    boutonsTheme.forEach(function (bouton) {
        bouton.addEventListener("click", function () {
            parametres.theme = bouton.dataset.theme;
            document.documentElement.dataset.theme = parametres.theme; // appliqué tout de suite
            afficherThemeChoisi();
            afficherToast(enregistrerParametres() ? "Thème enregistré." : "Impossible d'enregistrer (stockage indisponible).");
        });
    });

    afficherThemeChoisi();

    /* ---------- Stockage utilisé ---------- */
    const LIMITE_STOCKAGE = 5 * 1024 * 1024; // environ 5 Mo

    // Taille approximative : chaque caractère compte pour 2 octets
    function tailleStockage() {
        let total = 0;
        try {
            for (let position = 0; position < localStorage.length; position++) {
                const cle = localStorage.key(position);
                if (cle.startsWith("jokko-")) {
                    total += (cle.length + localStorage.getItem(cle).length) * 2;
                }
            }
        } catch (erreur) {
            return 0;
        }
        return total;
    }

    function formaterTaille(octets) {
        if (octets < 1024 * 1024) {
            return Math.max(1, Math.round(octets / 1024)) + " Ko";
        }
        return (octets / 1024 / 1024).toFixed(1).replace(".", ",") + " Mo";
    }

    function afficherStockage() {
        const taille = tailleStockage();
        const pourcentage = Math.min(100, Math.round((taille / LIMITE_STOCKAGE) * 100));

        let messages = 0;
        let images = 0;
        let vocaux = 0;
        Object.keys(messagesAjoutes).forEach(function (cle) {
            messagesAjoutes[cle].forEach(function (message) {
                if (message.systeme) {
                    return;
                }
                messages++;
                if (message.image) {
                    images++;
                }
                if (message.audio) {
                    vocaux++;
                }
            });
        });

        document.getElementById("stockage-utilise").textContent =
            formaterTaille(taille) + " utilisés sur environ 5 Mo (" + pourcentage + " %)";
        document.getElementById("stockage-detail").textContent =
            messages + " message(s) ajouté(s), dont " + images + " image(s) et " + vocaux + " vocal(aux)";

        const jauge = document.getElementById("jauge-stockage");
        jauge.setAttribute("aria-valuenow", pourcentage);
        jauge.classList.toggle("presque-pleine", pourcentage >= 80);
        document.getElementById("jauge-remplie").style.width = pourcentage + "%";
    }

    afficherStockage();

    /* ---------- Fenêtre de confirmation ---------- */
    const fenetreConfirmer = document.getElementById("fenetre-confirmer");
    let actionConfirmee = null;

    function demanderConfirmation(titre, texte, action) {
        document.getElementById("confirmer-titre").textContent = titre;
        document.getElementById("confirmer-texte").textContent = texte;
        actionConfirmee = action;
        fenetreConfirmer.showModal();
    }

    document.getElementById("btn-confirmer-annuler").addEventListener("click", function () {
        fenetreConfirmer.close();
    });

    document.getElementById("btn-confirmer-ok").addEventListener("click", function () {
        fenetreConfirmer.close();
        if (actionConfirmee) {
            actionConfirmee();
        }
    });

    fenetreConfirmer.addEventListener("close", function () {
        actionConfirmee = null;
    });

    // Supprime des clés du stockage du navigateur
    function oublier(cles) {
        cles.forEach(function (cle) {
            try {
                localStorage.removeItem(cle);
            } catch (erreur) {
                // Stockage indisponible : rien à effacer
            }
        });
    }

    document.getElementById("btn-effacer-messages").addEventListener("click", function () {
        demanderConfirmation(
            "Effacer vos messages ?",
            "Tous les messages que vous avez envoyés ou reçus ici (avec les images et les vocaux) seront effacés définitivement. Les discussions de démonstration reviennent à leur état de départ.",
            function () {
                oublier([CLE_MESSAGES, CLE_MODIFICATIONS]);
                Object.keys(messagesAjoutes).forEach(function (cle) {
                    delete messagesAjoutes[cle];
                });
                afficherStockage();
                afficherToast("Messages effacés.");
            }
        );
    });

    document.getElementById("btn-reinitialiser").addEventListener("click", function () {
        demanderConfirmation(
            "Réinitialiser l'application ?",
            "Messages, salons créés, réglages des discussions et paramètres seront effacés. Votre session reste ouverte.",
            function () {
                oublier([CLE_MESSAGES, CLE_MODIFICATIONS, CLE_REGLAGES, CLE_SALONS, CLE_PARAMETRES]);
                window.location.reload();
            }
        );
    });
}

/* =========================================================
   Liste des salons (salons.html)
   ========================================================= */
const listeSalons = document.getElementById("liste-salons");

function afficherSalons() {
    const saisie = simplifier(document.getElementById("filtre-salons").value.trim());
    listeSalons.innerHTML = "";

    Object.keys(SALONS).forEach(function (cle) {
        const salon = SALONS[cle];
        if (!simplifier(salon.nom).includes(saisie)) {
            return;
        }

        const lien = document.createElement("a");
        lien.className = "carte-salon";
        lien.href = "conversation-salon.html?salon=" + cle;

        const texte = document.createElement("div");
        texte.className = "recente-texte";
        const nom = document.createElement("p");
        nom.className = "recente-nom";
        nom.textContent = salon.nom;
        const membres = document.createElement("p");
        membres.className = "recente-apercu";
        const description = salon.prive ? "🔒 Groupe privé" : salon.description;
        membres.textContent = (description ? description + " · " : "")
            + salon.membres + (salon.membres > 1 ? " membres" : " membre");
        texte.append(nom, membres);

        const fleche = document.createElement("i");
        fleche.className = "fa-solid fa-chevron-right fleche";

        lien.append(creerAvatar("salon", salon), texte, fleche);
        const ligne = document.createElement("li");
        ligne.appendChild(lien);
        listeSalons.appendChild(ligne);
    });

    document.getElementById("aucun-salon").hidden = listeSalons.children.length > 0;
}

if (listeSalons) {
    document.getElementById("filtre-salons").addEventListener("input", afficherSalons);
    afficherSalons();
    // Groupe où l'on vient d'être ajouté
    ecouteurs.statut.push(afficherSalons);

    /* ---------- Créer un salon ---------- */
    const fenetreSalon = document.getElementById("fenetre-salon");
    const formSalon = document.getElementById("form-salon");
    const champNomSalon = document.getElementById("nom-salon");
    const COULEURS_SALONS = ["#4f46e5", "#10b981", "#8b5cf6", "#f97316", "#ec4899", "#0ea5e9"];

    document.getElementById("btn-creer-salon").addEventListener("click", function () {
        formSalon.reset();
        afficherErreur(champNomSalon, "");
        fenetreSalon.showModal();
    });

    document.getElementById("btn-annuler-salon").addEventListener("click", function () {
        fenetreSalon.close();
    });

    formSalon.addEventListener("submit", function (evenement) {
        evenement.preventDefault();

        const nom = champNomSalon.value.trim().replace(/^#\s*/, "");
        if (nom === "") {
            afficherErreur(champNomSalon, "Donnez un nom au salon.");
            return;
        }
        const existe = Object.keys(SALONS).some(function (cle) {
            return simplifier(SALONS[cle].nom) === simplifier(nom);
        });
        if (existe) {
            afficherErreur(champNomSalon, "Ce salon existe déjà.");
            return;
        }

        creerSalon({
            nom: nom,
            icone: "fa-hashtag",
            couleur: COULEURS_SALONS[Object.keys(SALONS).length % COULEURS_SALONS.length]
        }).then(function (salon) {
            // Ouvrir directement le nouveau salon
            window.location.href = "conversation-salon.html?salon=" + salon.id;
        }).catch(function (erreur) {
            afficherErreur(champNomSalon, erreur.code === "23505" ? "Ce salon existe déjà." : "Création impossible. Réessayez.");
        });
    });
}

/* =========================================================
   Numéros de téléphone : pays + indicatif
   (Nouveau contact et Modifier le profil)
   ========================================================= */
const PAYS = [
    ["Canada", "+1", "🇨🇦"], ["Sénégal", "+221", "🇸🇳"], ["France", "+33", "🇫🇷"],
    ["Belgique", "+32", "🇧🇪"], ["Suisse", "+41", "🇨🇭"], ["États-Unis", "+1", "🇺🇸"],
    ["Mali", "+223", "🇲🇱"], ["Côte d'Ivoire", "+225", "🇨🇮"], ["Guinée", "+224", "🇬🇳"],
    ["Mauritanie", "+222", "🇲🇷"], ["Gambie", "+220", "🇬🇲"], ["Guinée-Bissau", "+245", "🇬🇼"],
    ["Cap-Vert", "+238", "🇨🇻"], ["Burkina Faso", "+226", "🇧🇫"], ["Niger", "+227", "🇳🇪"],
    ["Bénin", "+229", "🇧🇯"], ["Togo", "+228", "🇹🇬"], ["Cameroun", "+237", "🇨🇲"],
    ["Gabon", "+241", "🇬🇦"], ["Congo", "+242", "🇨🇬"], ["RD Congo", "+243", "🇨🇩"],
    ["Tchad", "+235", "🇹🇩"], ["Madagascar", "+261", "🇲🇬"], ["Comores", "+269", "🇰🇲"],
    ["Djibouti", "+253", "🇩🇯"], ["Rwanda", "+250", "🇷🇼"], ["Burundi", "+257", "🇧🇮"],
    ["Maroc", "+212", "🇲🇦"], ["Algérie", "+213", "🇩🇿"], ["Tunisie", "+216", "🇹🇳"],
    ["Haïti", "+509", "🇭🇹"], ["Royaume-Uni", "+44", "🇬🇧"], ["Espagne", "+34", "🇪🇸"],
    ["Italie", "+39", "🇮🇹"], ["Allemagne", "+49", "🇩🇪"], ["Portugal", "+351", "🇵🇹"],
    ["Brésil", "+55", "🇧🇷"], ["Chine", "+86", "🇨🇳"], ["Inde", "+91", "🇮🇳"]
];

function chiffres(texte) {
    return (texte || "").replace(/\D/g, "");
}

// Liste déroulante « 🇨🇦 Canada (+1) »
function remplirPays(select) {
    PAYS.forEach(function ([nom, indicatif, drapeau], position) {
        const option = document.createElement("option");
        option.value = position;
        option.textContent = drapeau + " " + nom + " (" + indicatif + ")";
        select.appendChild(option);
    });
}

function indicatifDe(select) {
    return PAYS[select.value][1];
}

// Pays dont l'indicatif correspond au début du numéro (le plus long gagne : +221 avant +2)
function paysDuNumero(numero, positionActuelle) {
    const numeroChiffres = chiffres(numero);
    let meilleur = -1;
    PAYS.forEach(function ([, indicatif], position) {
        const code = chiffres(indicatif);
        if (numeroChiffres.startsWith(code) && (meilleur === -1 || code.length > chiffres(PAYS[meilleur][1]).length)) {
            meilleur = position;
        }
    });
    // Canada et États-Unis partagent le +1 : on garde le choix actuel
    if (meilleur !== -1 && PAYS[positionActuelle][1] === PAYS[meilleur][1]) {
        return positionActuelle;
    }
    return meilleur;
}

// Choisir un pays écrit son indicatif dans le champ Mobile ; taper « +221 » choisit le pays
function relierPaysMobile(select, champ, numeroDeDepart) {
    let indicatif = indicatifDe(select);

    function placer(numero) {
        const position = numero ? paysDuNumero(numero, Number(select.value)) : -1;
        if (position !== -1) {
            select.value = position;
        }
        indicatif = indicatifDe(select);
        champ.value = numero || indicatif + " ";
    }

    select.addEventListener("change", function () {
        const nouveau = indicatifDe(select);
        const reste = champ.value.trim().startsWith(indicatif)
            ? champ.value.trim().slice(indicatif.length).trim()
            : champ.value.trim().replace(/^\+\d*\s*/, "");
        champ.value = nouveau + " " + reste;
        indicatif = nouveau;
        champ.focus();
    });

    champ.addEventListener("input", function () {
        if (champ.value.trim().startsWith("+")) {
            const position = paysDuNumero(champ.value, Number(select.value));
            if (position !== -1 && position !== Number(select.value)) {
                select.value = position;
                indicatif = indicatifDe(select);
            }
        }
    });

    placer(numeroDeDepart);
    return placer;
}

// Le numéro tapé, ou "" s'il n'y a que l'indicatif
function numeroSaisi(select, champ) {
    const numero = champ.value.trim();
    return chiffres(numero).length > chiffres(indicatifDe(select)).length ? numero : "";
}

/* ---------- Mon code QR ----------
   Il contient « JOKKOCHAT: » suivi de mon identifiant. */
const PREFIXE_QR = "JOKKOCHAT:";

function dessinerMonQr(conteneur) {
    if (typeof qrcode === "undefined" || !utilisateurConnecte) {
        return;
    }
    const code = qrcode(0, "M");
    code.addData(PREFIXE_QR + utilisateurConnecte.id);
    code.make();
    conteneur.innerHTML = code.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
    conteneur.querySelector("svg").setAttribute("aria-label", "Mon code QR JokkoChat");
}

/* =========================================================
   Liste des contacts (contacts.html)
   ========================================================= */
const listeContacts = document.getElementById("liste-contacts");

// Recherche par nom, numéro (chiffres seulement) ou @nomdeprofil
function correspond(personne, saisie) {
    const texte = simplifier(saisie.trim()).replace(/^@/, "");
    if (texte === "") {
        return true;
    }
    const numero = chiffres(texte);
    return simplifier(personne.nom).includes(texte)
        || (personne.pseudo && personne.pseudo.includes(texte))
        || (numero.length >= 3 && chiffres(personne.telephone).includes(numero));
}

// « @awa · En ligne »
function detailContact(contact) {
    const statut = STATUTS[contact.statut];
    return contact.pseudo ? "@" + contact.pseudo + " · " + statut : statut;
}

function mesContacts() {
    return Object.keys(CONTACTS).filter(function (cle) {
        return CONTACTS[cle].estContact;
    });
}

function afficherContacts() {
    const saisie = document.getElementById("recherche-contacts").value;
    listeContacts.innerHTML = "";

    mesContacts().forEach(function (cle) {
        const contact = CONTACTS[cle];
        if (!correspond(contact, saisie)) {
            return;
        }

        const lien = document.createElement("a");
        lien.className = "carte-contact";
        lien.href = "conversation.html?contact=" + cle;

        const infos = document.createElement("div");
        infos.className = "contact-infos";
        const nom = document.createElement("h3");
        nom.className = "contact-nom";
        nom.textContent = contact.nom;
        const statut = document.createElement("small");
        statut.className = contact.statut === "ecrit" ? "contact-statut ecrit" : "contact-statut";
        statut.textContent = detailContact(contact);
        infos.append(nom, statut);

        const bouton = document.createElement("span");
        bouton.className = "btn btn-principal btn-auto";
        bouton.innerHTML = '<i class="fa-solid fa-message"></i> Discuter';

        lien.append(creerAvatar("contact", contact), infos, bouton);
        const ligne = document.createElement("li");
        ligne.appendChild(lien);
        listeContacts.appendChild(ligne);
    });

    document.getElementById("aucun-contact").hidden = mesContacts().length > 0;
    if (mesContacts().length > 0 && listeContacts.children.length === 0) {
        const vide = document.createElement("li");
        vide.className = "aucun-resultat";
        vide.textContent = "Aucun contact ne correspond.";
        listeContacts.appendChild(vide);
    }
}

// Une ligne cliquable : avatar + nom + détail (+ élément à droite)
function ligneChoix(contact, detail, aDroite) {
    const ligne = document.createElement("li");
    const element = document.createElement(aDroite && aDroite.tagName === "INPUT" ? "label" : "div");
    element.className = "option-nouvelle";

    const texte = document.createElement("span");
    texte.className = "recente-texte";
    const nom = document.createElement("span");
    nom.className = "recente-nom";
    nom.textContent = contact.nom;
    const sousTitre = document.createElement("span");
    sousTitre.className = "recente-apercu";
    sousTitre.textContent = detail;
    texte.append(nom, sousTitre);

    element.append(creerAvatar("contact", contact), texte);
    if (aDroite) {
        element.appendChild(aDroite);
    }
    ligne.appendChild(element);
    return ligne;
}

if (listeContacts) {
    document.getElementById("recherche-contacts").addEventListener("input", afficherContacts);
    afficherContacts();
    ecouteurs.statut.push(afficherContacts);

    const fenetreNouvelle = document.getElementById("fenetre-nouvelle");
    const fenetreContact = document.getElementById("fenetre-contact");
    const fenetreGroupe = document.getElementById("fenetre-groupe");

    // Passer d'une fenêtre à l'autre (une seule ouverte à la fois)
    function ouvrirFenetre(fenetre) {
        [fenetreNouvelle, fenetreContact, fenetreGroupe, document.getElementById("fenetre-qr")].forEach(function (autre) {
            if (autre.open) {
                autre.close();
            }
        });
        fenetre.showModal();
    }

    document.querySelectorAll("[data-fermer]").forEach(function (bouton) {
        bouton.addEventListener("click", function () {
            bouton.closest("dialog").close();
        });
    });
    document.querySelectorAll("[data-retour]").forEach(function (bouton) {
        bouton.addEventListener("click", function () {
            afficherNouvelle();
        });
    });

    /* ---------- Nouvelle discussion ---------- */
    function afficherNouvelle() {
        const liste = document.getElementById("nouvelle-liste-contacts");
        liste.innerHTML = "";
        mesContacts().forEach(function (cle) {
            const ligne = ligneChoix(CONTACTS[cle], detailContact(CONTACTS[cle]));
            ligne.firstChild.addEventListener("click", function () {
                window.location.href = "conversation.html?contact=" + cle;
            });
            liste.appendChild(ligne);
        });
        if (liste.children.length === 0) {
            const vide = document.createElement("li");
            vide.className = "aucun-resultat";
            vide.textContent = "Pas encore de contacts. Ajoutez-en avec « Nouveau contact ».";
            liste.appendChild(vide);
        }
        ouvrirFenetre(fenetreNouvelle);
    }

    document.getElementById("btn-nouvelle-discussion").addEventListener("click", afficherNouvelle);

    /* ---------- Nouveau contact ----------
       On enregistre la personne sous le prénom/nom de son choix.
       Son nom de profil ou son numéro sert à la retrouver parmi les inscrits. */
    const formContact = document.getElementById("form-contact");
    const champPrenom = document.getElementById("contact-prenom");
    const champNomContact = document.getElementById("contact-nom");
    const champPseudoContact = document.getElementById("contact-pseudo");
    const selectPays = document.getElementById("contact-pays");
    const champMobile = document.getElementById("contact-mobile");
    const indice = document.getElementById("indice-contact");

    remplirPays(selectPays);
    const placerNumero = relierPaysMobile(selectPays, champMobile);

    // Qui correspond au nom de profil ou au numéro tapé ?
    function personneCherchee() {
        const pseudo = champPseudoContact.value.trim().replace(/^@/, "").toLowerCase();
        const numero = chiffres(numeroSaisi(selectPays, champMobile));
        if (!pseudo && !numero) {
            return { vide: true };
        }
        const trouve = function (critere) {
            return Object.keys(PROFILS).find(function (id) {
                return id !== moi && critere(PROFILS[id]);
            });
        };
        const parPseudo = pseudo ? trouve(function (profil) { return profil.pseudo === pseudo; }) : null;
        const parNumero = numero ? trouve(function (profil) { return chiffres(profil.telephone) === numero; }) : null;
        if (parPseudo && parNumero && parPseudo !== parNumero) {
            return { conflit: true };
        }
        return { id: parPseudo || parNumero || null };
    }

    function afficherIndice() {
        const resultat = personneCherchee();
        indice.className = "indice-contact";
        indice.hidden = Boolean(resultat.vide);
        if (resultat.conflit) {
            indice.classList.add("indice-erreur");
            indice.textContent = "Ce nom de profil et ce numéro correspondent à deux personnes différentes.";
        } else if (resultat.id) {
            const deja = CONTACTS[resultat.id] && CONTACTS[resultat.id].estContact;
            indice.classList.add("indice-ok");
            indice.textContent = "✓ " + PROFILS[resultat.id].nom + " est sur JokkoChat"
                + (deja ? " (déjà dans vos contacts : son nom sera mis à jour)" : "");
        } else if (!resultat.vide) {
            indice.textContent = "Aucun utilisateur JokkoChat avec ce nom de profil ou ce numéro pour l'instant.";
        }
        return resultat;
    }

    [champPseudoContact, champMobile].forEach(function (champ) {
        champ.addEventListener("input", afficherIndice);
    });
    selectPays.addEventListener("change", afficherIndice);
    champPrenom.addEventListener("input", function () {
        afficherErreur(champPrenom, "");
    });

    // Ouvre le formulaire, vide ou pré-rempli (code QR scanné)
    function ouvrirNouveauContact(profil) {
        formContact.reset();
        afficherErreur(champPrenom, "");
        const mots = profil ? profil.nom.split(" ") : [];
        champPrenom.value = mots[0] || "";
        champNomContact.value = mots.slice(1).join(" ");
        champPseudoContact.value = profil && profil.pseudo ? profil.pseudo : "";
        placerNumero(profil ? profil.telephone : "");
        afficherIndice();
        ouvrirFenetre(fenetreContact);
        champPrenom.focus();
    }

    document.getElementById("btn-nouveau-contact").addEventListener("click", function () {
        ouvrirNouveauContact(null);
    });

    formContact.addEventListener("submit", function (evenement) {
        evenement.preventDefault();
        if (champPrenom.value.trim() === "") {
            afficherErreur(champPrenom, "Le prénom est obligatoire.");
            champPrenom.focus();
            return;
        }
        const resultat = afficherIndice();
        if (resultat.vide) {
            indice.hidden = false;
            indice.className = "indice-contact indice-erreur";
            indice.textContent = "Indiquez son nom de profil ou son numéro pour le retrouver.";
            return;
        }
        if (!resultat.id) {
            indice.classList.add("indice-erreur");
            return;
        }

        const bouton = formContact.querySelector("[type=submit]");
        bouton.disabled = true;
        ajouterContact(resultat.id, {
            prenom: champPrenom.value.trim(),
            nom: champNomContact.value.trim()
        }).then(function (contact) {
            fenetreContact.close();
            afficherContacts();
            afficherToast(contact.nom + " est enregistré dans vos contacts.");
        }).catch(function () {
            afficherToast("Enregistrement impossible. Réessayez.");
        }).finally(function () {
            bouton.disabled = false;
        });
    });

    /* ---------- Ajouter via un code QR ---------- */
    const fenetreQr = document.getElementById("fenetre-qr");
    const video = document.getElementById("camera-qr");
    const aideScanner = document.getElementById("aide-scanner");
    let fluxCamera = null;

    function arreterCamera() {
        if (fluxCamera) {
            fluxCamera.getTracks().forEach(function (piste) {
                piste.stop();
            });
            fluxCamera = null;
        }
    }

    // Lit un code QR dans une image (caméra ou fichier)
    function lireQr(source, largeur, hauteur) {
        const canvas = document.createElement("canvas");
        canvas.width = largeur;
        canvas.height = hauteur;
        const contexte = canvas.getContext("2d", { willReadFrequently: true });
        contexte.drawImage(source, 0, 0, largeur, hauteur);
        const code = jsQR(contexte.getImageData(0, 0, largeur, hauteur).data, largeur, hauteur);
        return code ? code.data : null;
    }

    async function codeTrouve(texte) {
        if (!texte.startsWith(PREFIXE_QR)) {
            aideScanner.textContent = "Ce code QR n'est pas un code JokkoChat.";
            return false;
        }
        const id = texte.slice(PREFIXE_QR.length);
        if (id === moi) {
            aideScanner.textContent = "C'est votre propre code 🙂";
            return false;
        }
        if (!PROFILS[id]) {
            const { data } = await sb.from("profils").select("id, nom, email, bio, pseudo, telephone").eq("id", id).maybeSingle();
            if (!data) {
                aideScanner.textContent = "Utilisateur introuvable.";
                return false;
            }
            PROFILS[id] = data;
        }
        arreterCamera();
        ouvrirNouveauContact(PROFILS[id]);
        return true;
    }

    async function demarrerCamera() {
        aideScanner.textContent = "Placez le code QR dans le cadre.";
        try {
            fluxCamera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        } catch (erreur) {
            aideScanner.textContent = "Caméra indisponible : importez plutôt une image du code.";
            return;
        }
        video.srcObject = fluxCamera;
        await video.play();

        const analyser = async function () {
            if (!fluxCamera) {
                return;
            }
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                const texte = lireQr(video, video.videoWidth, video.videoHeight);
                if (texte && await codeTrouve(texte)) {
                    return;
                }
            }
            requestAnimationFrame(analyser);
        };
        requestAnimationFrame(analyser);
    }

    function afficherOngletQr(scanner) {
        document.getElementById("onglet-mon-qr").classList.toggle("actif", !scanner);
        document.getElementById("onglet-scanner").classList.toggle("actif", scanner);
        document.getElementById("onglet-mon-qr").setAttribute("aria-selected", !scanner);
        document.getElementById("onglet-scanner").setAttribute("aria-selected", scanner);
        document.getElementById("vue-mon-qr").hidden = scanner;
        document.getElementById("vue-scanner").hidden = !scanner;
        if (scanner) {
            demarrerCamera();
        } else {
            arreterCamera();
        }
    }

    document.getElementById("btn-ouvrir-qr").addEventListener("click", function () {
        dessinerMonQr(document.getElementById("mon-qr"));
        document.getElementById("mon-qr-pseudo").textContent = utilisateurConnecte.pseudo ? "@" + utilisateurConnecte.pseudo : "";
        ouvrirFenetre(fenetreQr);
        afficherOngletQr(true);
    });
    document.getElementById("onglet-mon-qr").addEventListener("click", function () {
        afficherOngletQr(false);
    });
    document.getElementById("onglet-scanner").addEventListener("click", function () {
        afficherOngletQr(true);
    });
    document.getElementById("btn-retour-qr").addEventListener("click", function () {
        arreterCamera();
        ouvrirFenetre(fenetreContact);
    });
    // Fermer la fenêtre (croix, Échap) éteint la caméra
    fenetreQr.addEventListener("close", arreterCamera);

    document.getElementById("image-qr").addEventListener("change", function () {
        const fichier = this.files[0];
        this.value = "";
        if (!fichier) {
            return;
        }
        const image = new Image();
        const adresse = URL.createObjectURL(fichier);
        image.onload = function () {
            const echelle = Math.min(1, 1000 / Math.max(image.width, image.height));
            const texte = lireQr(image, Math.round(image.width * echelle), Math.round(image.height * echelle));
            URL.revokeObjectURL(adresse);
            if (texte) {
                codeTrouve(texte);
            } else {
                aideScanner.textContent = "Aucun code QR trouvé dans cette image.";
            }
        };
        image.src = adresse;
    });

    /* ---------- Nouveau groupe : nom + membres parmi mes contacts ---------- */
    const formGroupe = document.getElementById("form-groupe");
    const champNomGroupe = document.getElementById("nom-groupe");
    const listeMembres = document.getElementById("membres-groupe");
    const erreurMembres = document.getElementById("erreur-membres");

    function compterMembres() {
        const nombre = listeMembres.querySelectorAll("input:checked").length;
        document.getElementById("nombre-membres").textContent = nombre ? "(" + nombre + " choisi" + (nombre > 1 ? "s" : "") + ")" : "";
        if (nombre > 0) {
            erreurMembres.textContent = "";
        }
    }

    document.getElementById("btn-nouveau-groupe").addEventListener("click", function () {
        formGroupe.reset();
        afficherErreur(champNomGroupe, "");
        erreurMembres.textContent = "";
        listeMembres.innerHTML = "";

        mesContacts().forEach(function (cle) {
            const caseACocher = document.createElement("input");
            caseACocher.type = "checkbox";
            caseACocher.value = cle;
            caseACocher.addEventListener("change", compterMembres);
            listeMembres.appendChild(ligneChoix(CONTACTS[cle], detailContact(CONTACTS[cle]), caseACocher));
        });
        if (listeMembres.children.length === 0) {
            const vide = document.createElement("li");
            vide.className = "aucun-resultat";
            vide.textContent = "Ajoutez d'abord des contacts pour créer un groupe.";
            listeMembres.appendChild(vide);
        }
        compterMembres();
        ouvrirFenetre(fenetreGroupe);
        champNomGroupe.focus();
    });

    champNomGroupe.addEventListener("input", function () {
        afficherErreur(champNomGroupe, "");
    });

    formGroupe.addEventListener("submit", function (evenement) {
        evenement.preventDefault();
        const nom = champNomGroupe.value.trim();
        const membres = Array.from(listeMembres.querySelectorAll("input:checked")).map(function (caseACocher) {
            return caseACocher.value;
        });

        if (nom === "") {
            afficherErreur(champNomGroupe, "Donnez un nom au groupe.");
            champNomGroupe.focus();
            return;
        }
        if (membres.length === 0) {
            erreurMembres.textContent = "Choisissez au moins un membre.";
            return;
        }

        const bouton = formGroupe.querySelector("[type=submit]");
        bouton.disabled = true;
        creerGroupe(nom, membres).then(function (groupe) {
            window.location.href = "conversation-salon.html?salon=" + groupe.id;
        }).catch(function (erreur) {
            bouton.disabled = false;
            afficherErreur(champNomGroupe, erreur.code === "23505" ? "Ce nom est déjà pris." : "Création impossible. Réessayez.");
        });
    });

    // contacts.html#nouveau : ouvre directement la fenêtre (bouton de la messagerie)
    if (window.location.hash === "#nouveau") {
        afficherNouvelle();
    }
}

/* =========================================================
   Messages enregistrés (messages-enregistres.html)
   ========================================================= */
const listeEnregistres = document.getElementById("liste-enregistres");

function afficherEnregistres() {
    const enregistres = lireEnregistres();
    if (enregistres.length === 0) {
        return; // On garde le message « Aucun message enregistré » du HTML
    }
    listeEnregistres.innerHTML = "";

    enregistres.slice().reverse().forEach(function (enregistre) {
        const lien = document.createElement("a");
        lien.href = enregistre.lien || "#";

        const texte = document.createElement("div");
        texte.className = "recente-texte";
        const titre = document.createElement("p");
        titre.className = "recente-nom";
        titre.textContent = enregistre.auteur + " · " + enregistre.discussionNom;
        const contenu = document.createElement("p");
        contenu.className = "recente-apercu";
        contenu.textContent = enregistre.texte;
        texte.append(titre, contenu);

        const infos = document.createElement("div");
        infos.className = "recente-infos";
        const heure = document.createElement("small");
        heure.textContent = enregistre.heure;

        const retirer = document.createElement("button");
        retirer.type = "button";
        retirer.className = "btn-icone";
        retirer.setAttribute("aria-label", "Retirer des enregistrés");
        retirer.innerHTML = '<i class="fa-solid fa-bookmark"></i>';
        retirer.addEventListener("click", function (evenement) {
            evenement.preventDefault();
            basculerEnregistrement(enregistre);
            if (lireEnregistres().length === 0) {
                window.location.reload();
            } else {
                afficherEnregistres();
            }
        });

        infos.append(heure, retirer);
        lien.append(texte, infos);
        const ligne = document.createElement("li");
        ligne.appendChild(lien);
        listeEnregistres.appendChild(ligne);
    });
}

if (listeEnregistres) {
    afficherEnregistres();
}

/* =========================================================
   Modifier le profil (modifier-profil.html)
   ========================================================= */
const formProfil = document.getElementById("form-profil");

if (formProfil && utilisateurConnecte) {
    const champNom = document.getElementById("profil-nom");
    const champEmail = document.getElementById("profil-email-champ");
    const champBio = document.getElementById("profil-bio-champ");
    const champPseudo = document.getElementById("profil-pseudo");
    const champTelephone = document.getElementById("profil-telephone");
    const selectPaysProfil = document.getElementById("profil-pays");

    champNom.value = utilisateurConnecte.nom || "";
    champEmail.value = utilisateurConnecte.email || "";
    champBio.value = utilisateurConnecte.bio || "";
    champPseudo.value = utilisateurConnecte.pseudo || "";
    remplirPays(selectPaysProfil);
    relierPaysMobile(selectPaysProfil, champTelephone, utilisateurConnecte.telephone || "");

    // @nomdeprofil : 3 à 20 caractères, minuscules, chiffres, « _ » et « . »
    function lirePseudo() {
        return champPseudo.value.trim().replace(/^@/, "").toLowerCase();
    }

    function validerPseudo() {
        const pseudo = lirePseudo();
        const message = pseudo === "" || /^[a-z0-9_.]{3,20}$/.test(pseudo)
            ? ""
            : "3 à 20 caractères : lettres minuscules, chiffres, « _ » ou « . ».";
        afficherErreur(champPseudo, message);
        return message === "";
    }

    function validerTelephone() {
        const telephone = numeroSaisi(selectPaysProfil, champTelephone);
        const message = telephone === "" || /^\+[0-9 ().-]{7,20}$/.test(telephone) ? "" : "Numéro invalide.";
        afficherErreur(champTelephone, message);
        return message === "";
    }

    champPseudo.addEventListener("input", validerPseudo);
    champTelephone.addEventListener("input", validerTelephone);

    /* ---------- Photo de profil ----------
       Recadrée en carré de 256 px, envoyée seulement à l'enregistrement. */
    const apercuPhoto = document.getElementById("apercu-photo");
    const erreurPhoto = document.getElementById("erreur-photo");
    const btnRetirerPhoto = document.getElementById("btn-retirer-photo");
    let photo = utilisateurConnecte.photo_url || null; // adresse actuelle, ou image choisie (data URL)

    function afficherPhoto() {
        mettrePhoto(apercuPhoto, photo, champNom.value.trim() || utilisateurConnecte.nom);
        btnRetirerPhoto.hidden = !photo;
    }

    function recadrerPhoto(fichier) {
        return new Promise(function (resoudre, rejeter) {
            if (!fichier.type.startsWith("image/")) {
                rejeter("Ce fichier n'est pas une image.");
                return;
            }
            const image = new Image();
            const adresse = URL.createObjectURL(fichier);
            image.onload = function () {
                const cote = Math.min(image.width, image.height);
                const canvas = document.createElement("canvas");
                canvas.width = 256;
                canvas.height = 256;
                canvas.getContext("2d").drawImage(image,
                    (image.width - cote) / 2, (image.height - cote) / 2, cote, cote, 0, 0, 256, 256);
                URL.revokeObjectURL(adresse);
                resoudre(canvas.toDataURL("image/jpeg", 0.85));
            };
            image.onerror = function () {
                URL.revokeObjectURL(adresse);
                rejeter("Impossible de lire cette image.");
            };
            image.src = adresse;
        });
    }

    document.getElementById("champ-photo").addEventListener("change", function () {
        const fichier = this.files[0];
        this.value = "";
        if (!fichier) {
            return;
        }
        recadrerPhoto(fichier).then(function (image) {
            photo = image;
            erreurPhoto.textContent = "";
            afficherPhoto();
        }).catch(function (message) {
            erreurPhoto.textContent = message;
        });
    });

    btnRetirerPhoto.addEventListener("click", function () {
        photo = null;
        afficherPhoto();
    });
    champNom.addEventListener("input", afficherPhoto);
    afficherPhoto();

    champNom.addEventListener("input", function () {
        if (champNom.closest(".champ").classList.contains("invalide")) {
            validerChamp(champNom);
        }
    });

    formProfil.addEventListener("submit", function (evenement) {
        evenement.preventDefault();
        const champInvalide = [
            [champNom, validerChamp(champNom)],
            [champPseudo, validerPseudo()],
            [champTelephone, validerTelephone()]
        ].find(function ([, valide]) {
            return !valide;
        });
        if (champInvalide) {
            champInvalide[0].focus();
            return;
        }

        const bouton = formProfil.querySelector("[type=submit]");
        bouton.disabled = true;
        // Nouvelle photo : on l'envoie d'abord dans le stockage
        const photoPrete = photo && photo.startsWith("data:") ? televerser(photo, "jpg") : Promise.resolve(photo);

        photoPrete.then(function (adressePhoto) {
            return mettreAJourProfil({
                nom: champNom.value.trim(),
                bio: champBio.value.trim(),
                pseudo: lirePseudo() || null,
                telephone: numeroSaisi(selectPaysProfil, champTelephone) || null,
                photo_url: adressePhoto
            });
        }).then(function () {
            window.location.href = formProfil.getAttribute("action");
        }).catch(function (erreur) {
            bouton.disabled = false;
            if (erreur.code === "23505") {
                afficherErreur(champPseudo, "Ce @nomdeprofil est déjà pris.");
                champPseudo.focus();
            } else {
                afficherErreur(champNom, "Enregistrement impossible. Vérifiez votre connexion.");
            }
        });
    });
}

/* =========================================================
   Nouveau message reçu ailleurs que dans la messagerie
   ========================================================= */
if (document.body.classList.contains("page-app") && !typeMessagerie) {
    ecouteurs.message.push(function (type, cle, message) {
        const ou = type === "salon" ? " dans # " + SALONS[cle].nom : "";
        afficherToast("💬 Nouveau message de " + message.auteur + ou);
    });
}

/* ---------- Mon code QR (profil.html) ---------- */
const btnMonQr = document.getElementById("btn-mon-qr");

if (btnMonQr) {
    const fenetreMonQr = document.getElementById("fenetre-mon-qr");
    btnMonQr.addEventListener("click", function () {
        dessinerMonQr(document.getElementById("mon-qr"));
        document.getElementById("mon-qr-pseudo").textContent = utilisateurConnecte.pseudo ? "@" + utilisateurConnecte.pseudo : "";
        fenetreMonQr.showModal();
    });
    fenetreMonQr.querySelector("[data-fermer]").addEventListener("click", function () {
        fenetreMonQr.close();
    });
}
