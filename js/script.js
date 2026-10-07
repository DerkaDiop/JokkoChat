/* =========================================================
   JokkoChat - Script principal
   Chaque bloc ne s'exécute que si les éléments existent
   sur la page courante.
   ========================================================= */

/* ---------- Données fictives ----------
   En attendant un serveur, toutes les pages lisent les contacts,
   les salons et les messages ici. Les clés (ali, fatou, general...)
   sont utilisées dans les liens : conversation.html?contact=fatou */
const STATUTS = {
    "en-ligne": "En ligne",
    "hors-ligne": "Hors ligne",
    "ecrit": "En train d'écrire..."
};

const CONTACTS = {
    ali: {
        nom: "Ali",
        statut: "en-ligne",
        messages: [
            { auteur: "Moi", heure: "10:16", texte: "Bonjour ! 😊" },
            { auteur: "Ali", heure: "10:17", texte: "Comment ça va ?" },
            { auteur: "Moi", heure: "10:18", texte: "Très bien, merci ! Et toi ?" },
            { auteur: "Ali", heure: "10:19", texte: "Ça va super ! Tu as vu l'image ?" },
            { auteur: "Moi", heure: "10:20", texte: "Oui, elle est géniale ! 👍" }
        ]
    },
    fatou: {
        nom: "Fatou",
        statut: "ecrit",
        messages: [
            { auteur: "Fatou", heure: "09:40", texte: "Salut ! Tu as fini l'exercice 3 ?" },
            { auteur: "Moi", heure: "09:42", texte: "Presque, il me reste la dernière question." },
            { auteur: "Fatou", heure: "09:45", texte: "OK, on compare nos réponses après ?" },
            { auteur: "Fatou", heure: "09:46", texte: "Le code de la salle d'étude réservée : 4821 🔐", vueUnique: true }
        ]
    },
    moussa: {
        nom: "Moussa",
        statut: "hors-ligne",
        messages: [
            { auteur: "Moi", heure: "Hier", texte: "Je t'ai envoyé les notes du cours." },
            { auteur: "Moussa", heure: "Hier", texte: "D'accord, merci !" }
        ]
    },
    awa: {
        nom: "Awa",
        statut: "en-ligne",
        messages: [
            { auteur: "Awa", heure: "Lun", texte: "Petit point sur le projet avant la remise. Tu t'occupes des pages de connexion et du menu, et moi je termine les contacts et le profil. Le professeur a rappelé que la remise est vendredi à 23 h 59 sur Moodle. Il faut aussi préparer la démonstration de 10 minutes pour la semaine prochaine. N'oublie pas de faire un git pull avant de commencer pour éviter les conflits." },
            { auteur: "Awa", heure: "Lun", texte: "On se voit demain à la bibliothèque ?" },
            { auteur: "Moi", heure: "Lun", texte: "Oui, vers 14 h !" }
        ]
    },
    ibrahim: {
        nom: "Ibrahim",
        statut: "hors-ligne",
        messages: [
            { auteur: "Ibrahim", heure: "Dim", texte: "Bon week-end !" }
        ]
    }
};

const SALONS = {
    general: {
        nom: "Général",
        membres: 5,
        icone: "fa-users",
        couleur: "#4f46e5",
        messages: [
            { auteur: "Fatou", heure: "10:15", texte: "Bonjour tout le monde ! 👋" },
            { auteur: "Moussa", heure: "10:16", texte: "Salut Fatou ! Comment allez-vous ?" },
            { auteur: "Moi", heure: "10:17", texte: "Ça va bien ! Content de vous retrouver ici 😊" },
            { auteur: "Awa", heure: "10:18", texte: "Bienvenue dans le salon Général ! 🎉" }
        ]
    },
    projets: {
        nom: "Projets",
        membres: 4,
        icone: "fa-diagram-project",
        couleur: "#10b981",
        messages: [
            { auteur: "Awa", heure: "Hier", texte: "Je viens de rejoindre le salon !" },
            { auteur: "Moussa", heure: "Hier", texte: "On se retrouve demain pour le TP ?" }
        ]
    },
    etudes: {
        nom: "Études",
        membres: 6,
        icone: "fa-book",
        couleur: "#8b5cf6",
        messages: [
            { auteur: "Ibrahim", heure: "Lun", texte: "Quelqu'un a compris l'exercice 3 ?" },
            { auteur: "Fatou", heure: "Lun", texte: "Oui, je peux partager ma solution." }
        ]
    },
    sports: {
        nom: "Sports",
        membres: 3,
        icone: "fa-futbol",
        couleur: "#f97316",
        messages: [
            { auteur: "Ali", heure: "Dim", texte: "Match de foot samedi, qui vient ?" }
        ]
    },
    aide: {
        nom: "Aide & Support",
        membres: 8,
        icone: "fa-circle-question",
        couleur: "#ec4899",
        messages: [
            { auteur: "Awa", heure: "Sam", texte: "Comment changer sa photo de profil ?" }
        ]
    }
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
    const toast = document.getElementById("toast");
    if (!toast) {
        return;
    }
    toast.textContent = texte;
    toast.hidden = false;
    clearTimeout(minuteurToast);
    minuteurToast = setTimeout(function () {
        toast.hidden = true;
    }, 2500);
}

// Ajouter les salons créés par l'utilisateur
Object.assign(SALONS, lireStockage(CLE_SALONS, {}));

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
            message.id = cleStockage + ":" + position;
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

/* ---------- Utilisateur connecté (stocké dans le navigateur) ---------- */
// En attendant un vrai serveur, on garde le nom et l'email dans le localStorage.
const CLE_UTILISATEUR = "jokko-utilisateur";

function lireUtilisateur() {
    try {
        return JSON.parse(localStorage.getItem(CLE_UTILISATEUR));
    } catch (erreur) {
        return null;
    }
}

function enregistrerUtilisateur(formulaire) {
    const email = formulaire.querySelector("input[type=email]").value.trim();
    let utilisateur;

    if (formulaire.id === "form-inscription") {
        utilisateur = {
            nom: document.getElementById("nom").value.trim(),
            email: email
        };
    } else {
        // Connexion : on garde le nom connu si c'est le même email,
        // sinon on prend la partie avant le @ (ex : kader@uqac.ca -> Kader)
        const ancien = lireUtilisateur();
        if (ancien && ancien.email === email) {
            utilisateur = ancien;
        } else {
            const debut = email.split("@")[0];
            utilisateur = { nom: debut.charAt(0).toUpperCase() + debut.slice(1), email: email };
        }
    }

    try {
        localStorage.setItem(CLE_UTILISATEUR, JSON.stringify(utilisateur));
    } catch (erreur) {
        // Stockage indisponible (navigation privée...) : on continue sans
    }
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

        enregistrerUtilisateur(formulaire);

        // Pas encore de serveur : on va directement au menu
        // (sans mettre le mot de passe dans l'adresse de la page)
        window.location.href = formulaire.getAttribute("action");
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
    lien.addEventListener("click", function () {
        try {
            localStorage.removeItem(CLE_UTILISATEUR);
        } catch (erreur) {
            // Stockage indisponible : rien à effacer
        }
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
        element.textContent = prenom.charAt(0).toUpperCase();
    });
}

/* ---------- Cloche de notifications ---------- */
const btnCloche = document.getElementById("btn-cloche");
const panneauNotifications = document.getElementById("panneau-notifications");

function ouvrirNotifications(ouvrir) {
    panneauNotifications.hidden = !ouvrir;
    btnCloche.setAttribute("aria-expanded", ouvrir);
}

if (btnCloche && panneauNotifications) {
    btnCloche.addEventListener("click", function () {
        ouvrirNotifications(panneauNotifications.hidden);
    });

    document.getElementById("btn-tout-lu").addEventListener("click", function () {
        panneauNotifications.querySelectorAll(".non-lue").forEach(function (notification) {
            notification.classList.remove("non-lue");
        });
        document.getElementById("badge-notifications").remove();
    });

    // Fermer le panneau en cliquant ailleurs
    document.addEventListener("click", function (evenement) {
        if (!evenement.target.closest(".notifications")) {
            ouvrirNotifications(false);
        }
    });
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

function remplirAvatar(avatar, type, discussion) {
    avatar.innerHTML = "";

    if (type === "contact") {
        avatar.className = "avatar";
        avatar.textContent = discussion.nom.charAt(0).toUpperCase();

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
    const discussionOuverte = donnees[cleOuverte];
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

        /* ---------- Enregistrement des messages ---------- */
        function enregistrerMessages() {
            return ecrireStockage(CLE_MESSAGES, messagesAjoutes);
        }

        function enregistrerReglage(champs) {
            reglagesDiscussions[cleStockageOuverte] = Object.assign({}, reglageDe(cleStockageOuverte), champs);
            ecrireStockage(CLE_REGLAGES, reglagesDiscussions);
        }

        // Message envoyé ou reçu pendant l'utilisation (et non message d'origine)
        function estAjoute(message) {
            return (messagesAjoutes[cleStockageOuverte] || []).includes(message);
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

        function ajouterMessage(message) {
            message.id = message.id || nouvelIdentifiant();
            appliquerEphemere(message);
            discussionOuverte.messages.push(message);
            messagesAjoutes[cleStockageOuverte] = (messagesAjoutes[cleStockageOuverte] || []).concat(message);
            return enregistrerMessages();
        }

        // Change un message (masqué, supprimé, ouvert...) et l'enregistre
        function modifierMessage(message, champs) {
            Object.assign(message, champs);
            if (estAjoute(message)) {
                return enregistrerMessages();
            }
            modificationsMessages[message.id] = Object.assign({}, modificationsMessages[message.id], champs);
            return ecrireStockage(CLE_MODIFICATIONS, modificationsMessages);
        }

        // Efface un message de cet appareil, définitivement
        function effacerPourMoi(message) {
            discussionOuverte.messages = discussionOuverte.messages.filter(function (element) {
                return element !== message;
            });
            if (estAjoute(message)) {
                messagesAjoutes[cleStockageOuverte] = messagesAjoutes[cleStockageOuverte].filter(function (element) {
                    return element !== message;
                });
                enregistrerMessages();
            } else {
                modificationsMessages[message.id] = { supprime: "moi" };
                ecrireStockage(CLE_MODIFICATIONS, modificationsMessages);
            }
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

            // Dans un salon, on montre qui parle (avatar + nom)
            if (!estMoi && typeMessagerie === "salon") {
                const avatar = document.createElement("div");
                avatar.className = "avatar avatar-petit";
                avatar.textContent = message.auteur.charAt(0).toUpperCase();
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
                ouvrirMenu(boutonOptions, actionsMessage(message));
            });
            bulle.appendChild(boutonOptions);

            if (!estMoi && typeMessagerie === "salon") {
                const auteur = document.createElement("strong");
                auteur.className = "bulle-auteur";
                auteur.textContent = message.auteur;
                bulle.appendChild(auteur);
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
            ligne.appendChild(bulle);
            return ligne;
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
        function ouvrirMenu(ancre, actions) {
            fermerMenu();
            menuFlottant.innerHTML = "";
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

            if (message.texte && !message.masque && !message.vueUnique && message.supprime !== "tous" && navigator.clipboard) {
                actions.push({ icone: "fa-copy", texte: "Copier le texte", faire: function () {
                    navigator.clipboard.writeText(message.texte).then(function () {
                        afficherToast("Texte copié.");
                    });
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

            ouvrirMenu(bouton, [
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
            ]);
        });

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

        /* ---------- Réponses simulées ----------
           En attendant un vrai serveur, le contact (ou un membre du salon)
           « tape » puis répond. Un contact hors ligne ne répond pas :
           son message reste « envoyé » (une seule coche). */
        const REPONSES = [
            { mots: /\b(ca va|comment vas|comment allez)\b/, phrases: ["Ça va bien, merci ! Et toi ?", "Très bien ! Et de ton côté ?"] },
            { mots: /\b(salut|bonjour|bonsoir|coucou|hello|allo)\b/, phrases: ["Salut ! 😊", "Bonjour ! Quoi de neuf ?"] },
            { mots: /\bmerci\b/, phrases: ["De rien ! 😊", "Avec plaisir !"] },
            { mots: /\b(bye|a plus|a demain|bonne nuit|bonne soiree)\b/, phrases: ["À plus ! 👋", "À demain !"] },
            { mots: /\b(projet|tp|devoir|examen|exercice|cours|remise)\b/, phrases: ["On peut travailler dessus ensemble demain.", "J'ai commencé, je t'envoie ce que j'ai ce soir."] },
            { mots: /\?/, phrases: ["Bonne question… je regarde et je te dis ça.", "Oui, je pense que c'est possible !", "Je ne suis pas sûr, on en parle demain ?"] }
        ];
        const REPONSES_PAR_DEFAUT = ["D'accord 👍", "Ah oui, je vois !", "OK, ça marche !", "Haha 😄"];
        const REPONSES_IMAGE = ["Belle photo ! 😍", "Oh, c'est joli !", "Merci pour l'image 👍"];
        const REPONSES_VUE_UNIQUE = ["Vu 👀", "OK, j'ai vu !", "Bien reçu 😉"];
        const REPONSES_VOCAL = ["Je viens d'écouter ton vocal, merci ! 👍", "Bien reçu, je te réponds tout à l'heure.", "D'accord, c'est noté !"];

        function auHasard(liste) {
            return liste[Math.floor(Math.random() * liste.length)];
        }

        function choisirReponse(message) {
            if (message.vueUnique) {
                return auHasard(REPONSES_VUE_UNIQUE);
            }
            if (message.audio) {
                return auHasard(REPONSES_VOCAL);
            }
            if (message.image && !message.texte) {
                return auHasard(REPONSES_IMAGE);
            }
            const texte = simplifier(message.texte);
            const regle = REPONSES.find(function (element) {
                return element.mots.test(texte);
            });
            return auHasard(regle ? regle.phrases : REPONSES_PAR_DEFAUT);
        }

        // Dans un salon, un membre au hasard (parmi ceux qui ont déjà parlé) répond
        function choisirRepondant() {
            if (typeMessagerie === "contact") {
                return discussionOuverte.nom;
            }
            const membres = [];
            discussionOuverte.messages.forEach(function (message) {
                if (message.auteur !== "Moi" && !membres.includes(message.auteur)) {
                    membres.push(message.auteur);
                }
            });
            return auHasard(membres.length ? membres : ["Awa", "Fatou", "Moussa", "Ali"]);
        }

        let minuteries = [];

        function plusTard(delai, action) {
            minuteries.push(setTimeout(action, delai));
        }

        function changerEtat(message, etat) {
            message.etat = etat;
            enregistrerMessages();
            afficherMessages(false);
        }

        function simulerReponse(dernierMessage) {
            // Un nouveau message annule la réponse en attente : on répond au dernier
            minuteries.forEach(clearTimeout);
            minuteries = [];

            if (typeMessagerie === "contact" && discussionOuverte.statut === "hors-ligne") {
                return;
            }

            const repondant = choisirRepondant();
            const reponse = choisirReponse(dernierMessage);
            const delaiEcriture = 1500 + Math.random() * 1500;

            plusTard(600, function () {
                changerEtat(dernierMessage, "recu");
            });

            plusTard(1200, function () {
                if (typeMessagerie === "contact") {
                    discussionOuverte.statut = "ecrit";
                } else {
                    discussionOuverte.ecritPar = repondant;
                }
                // Le contact a ouvert la conversation : tous mes messages sont lus
                discussionOuverte.messages.forEach(function (message) {
                    if (message.auteur !== "Moi" || message.systeme) {
                        return;
                    }
                    message.etat = "lu";
                    // Vue unique : une fois ouvert, le contenu est effacé
                    if (message.vueUnique && !message.ouvert) {
                        Object.assign(message, { ouvert: true }, CONTENU_VIDE);
                    }
                    // Éphémère « après lecture » : le compte à rebours démarre
                    if (message.ephemereLecture && !message.expire) {
                        message.expire = Date.now() + DELAI_APRES_LECTURE * 1000;
                    }
                });
                enregistrerMessages();
                afficherStatut();
                afficherMessages(false);
                afficherListe();
            });

            plusTard(1200 + delaiEcriture, function () {
                if (typeMessagerie === "contact") {
                    discussionOuverte.statut = "en-ligne";
                } else {
                    discussionOuverte.ecritPar = null;
                }
                ajouterMessage({ auteur: repondant, heure: heureActuelle(), texte: reponse });
                afficherStatut();
                afficherMessages(true);
                afficherListe();
                notifier();
            });
        }

        /* ---------- Envoi d'un message (texte, image ou vocal) ---------- */
        // contenu : { texte, image } ou { audio, duree }
        function envoyerMessage(contenu) {
            const message = Object.assign({ auteur: "Moi", heure: heureActuelle(), texte: "", etat: "envoye" }, contenu);
            if (vueUniqueActive) {
                message.vueUnique = true;
                activerVueUnique(false); // la vue unique ne vaut que pour un message
            }

            const sauvegarde = ajouterMessage(message);
            montrerErreur(sauvegarde ? "" : "Message envoyé, mais il ne sera pas gardé après un rechargement (mémoire du navigateur pleine).");

            afficherMessages(true);
            afficherListe();
            simulerReponse(message);
        }

        formMessage.addEventListener("submit", function (evenement) {
            evenement.preventDefault();
            preparerSon();

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
        membres.textContent = salon.membres + (salon.membres > 1 ? " membres" : " membre");
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
        // Clé utilisée dans l'adresse : « Maths & Physique » -> « maths-physique »
        const cle = simplifier(nom).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

        if (nom === "" || cle === "") {
            afficherErreur(champNomSalon, "Donnez un nom au salon.");
            return;
        }
        if (SALONS[cle]) {
            afficherErreur(champNomSalon, "Ce salon existe déjà.");
            return;
        }

        const nouveauSalon = {
            nom: nom,
            membres: 1,
            icone: "fa-hashtag",
            couleur: COULEURS_SALONS[Object.keys(SALONS).length % COULEURS_SALONS.length],
            messages: []
        };
        const salonsEnregistres = lireStockage(CLE_SALONS, {});
        salonsEnregistres[cle] = nouveauSalon;
        ecrireStockage(CLE_SALONS, salonsEnregistres);

        // Ouvrir directement le nouveau salon
        window.location.href = "conversation-salon.html?salon=" + cle;
    });
}
