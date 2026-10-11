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
        description: "Discussions générales entre étudiants.",
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
        description: "Organisation et travaux de groupe.",
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
        description: "Aide aux devoirs et révisions.",
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
        description: "Activités sportives et événements.",
        membres: 3,
        icone: "fa-futbol",
        couleur: "#f97316",
        messages: [
            { auteur: "Ali", heure: "Dim", texte: "Match de foot samedi, qui vient ?" }
        ]
    },
    aide: {
        nom: "Aide & Support",
        description: "Questions et entraide technique.",
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
    son: true,
    accusesLecture: true,
    ephemereDefaut: 0,
    resume: true,
    theme: "clair"
};
const parametres = Object.assign({}, PARAMETRES_PAR_DEFAUT, lireStockage(CLE_PARAMETRES, {}));
if (parametres.theme !== "sombre") {
    parametres.theme = "clair";
}

// Appliquer immédiatement le thème au chargement
if (parametres.theme) {
    document.documentElement.dataset.theme = parametres.theme;
}

function enregistrerParametres() {
    return ecrireStockage(CLE_PARAMETRES, parametres);
}

// Petit message temporaire en bas de l'écran (#toast)
let minuteurToast = null;
function afficherToast(texte) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = texte;
    toast.hidden = false;
    clearTimeout(minuteurToast);
    minuteurToast = setTimeout(function () {
        toast.hidden = true;
    }, 2500);
}

// Ajouter les salons créés par l'utilisateur
Object.assign(SALONS, lireStockage(CLE_SALONS, {}));

// Messages envoyés et réponses reçues
const messagesAjoutes = lireStockage(CLE_MESSAGES, {});

const CLE_MODIFICATIONS = "jokko-modifications";
const CLE_REGLAGES = "jokko-reglages";

const modificationsMessages = lireStockage(CLE_MODIFICATIONS, {});
const reglagesDiscussions = lireStockage(CLE_REGLAGES, {});

function estEfface(message) {
    return message.supprime === "moi" || Boolean(message.expire && message.expire <= Date.now());
}

function estLisible(message) {
    return !message.systeme && !message.supprime && !message.masque && !message.vueUnique;
}

function preparerDiscussions(type, liste) {
    Object.keys(liste).forEach(function (cle) {
        const discussion = liste[cle];
        const cleStockage = type + ":" + cle;
        const ajoutes = messagesAjoutes[cleStockage] || [];

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

    if (formConnexion && formInscription) {
        formConnexion.hidden = !estConnexion;
        formInscription.hidden = estConnexion;

        document.getElementById("onglet-connexion").classList.toggle("actif", estConnexion);
        document.getElementById("onglet-inscription").classList.toggle("actif", !estConnexion);
        document.getElementById("onglet-connexion").setAttribute("aria-selected", estConnexion);
        document.getElementById("onglet-inscription").setAttribute("aria-selected", !estConnexion);
    }
}

if (formConnexion && formInscription) {
    document.getElementById("onglet-connexion").addEventListener("click", function () {
        afficherOnglet("connexion");
    });
    document.getElementById("onglet-inscription").addEventListener("click", function () {
        afficherOnglet("inscription");
    });

    document.querySelectorAll("[data-onglet]").forEach(function (lien) {
        lien.addEventListener("click", function (evenement) {
            evenement.preventDefault();
            afficherOnglet(lien.dataset.onglet);
        });
    });

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
const CLE_UTILISATEUR = "jokko-utilisateur";

function lireUtilisateur() {
    try {
        return JSON.parse(localStorage.getItem(CLE_UTILISATEUR));
    } catch (erreur) {
        return null;
    }
}

function enregistrerUtilisateur(formulaire) {
    const emailInput = formulaire.querySelector("input[type=email]");
    const email = emailInput ? emailInput.value.trim() : "kader@uqac.ca";
    let utilisateur;

    if (formulaire.id === "form-inscription") {
        const nomInput = document.getElementById("nom");
        utilisateur = {
            nom: nomInput ? nomInput.value.trim() : "Kader",
            email: email
        };
    } else {
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
    } catch (erreur) {}
}

/* ---------- Validation des formulaires ---------- */
function afficherErreur(input, message) {
    const champ = input.closest(".champ");
    if (champ) {
        champ.classList.toggle("invalide", message !== "");
        const err = champ.querySelector(".erreur");
        if (err) err.textContent = message;
    }
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
        const motDePasse = document.getElementById("mdp-inscription");
        if (motDePasse && input.value !== motDePasse.value) {
            message = "Les mots de passe ne correspondent pas.";
        }
    }

    afficherErreur(input, message);
    return message === "";
}

document.querySelectorAll(".page-auth .formulaire").forEach(function (formulaire) {
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
            const premierInvalide = formulaire.querySelector(".champ.invalide input, .champ.invalide select");
            if (premierInvalide) premierInvalide.focus();
            return;
        }

        enregistrerUtilisateur(formulaire);
        window.location.href = formulaire.getAttribute("action");
    });

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
const utilisateurConnecte = lireUtilisateur();

if (document.body.classList.contains("page-app") && !utilisateurConnecte) {
    window.location.replace("index.html");
}

document.querySelectorAll("[data-deconnexion]").forEach(function (lien) {
    lien.addEventListener("click", function () {
        try {
            localStorage.removeItem(CLE_UTILISATEUR);
        } catch (erreur) {}
    });
});

if (utilisateurConnecte && utilisateurConnecte.nom) {
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
    if (panneauNotifications && btnCloche) {
        panneauNotifications.hidden = !ouvrir;
        btnCloche.setAttribute("aria-expanded", ouvrir);
    }
}

if (btnCloche && panneauNotifications) {
    btnCloche.addEventListener("click", function () {
        ouvrirNotifications(panneauNotifications.hidden);
    });

    const btnToutLu = document.getElementById("btn-tout-lu");
    if (btnToutLu) {
        btnToutLu.addEventListener("click", function () {
            panneauNotifications.querySelectorAll(".non-lue").forEach(function (notification) {
                notification.classList.remove("non-lue");
            });
            const badge = document.getElementById("badge-notifications");
            if (badge) badge.remove();
        });
    }

    document.addEventListener("click", function (evenement) {
        if (!evenement.target.closest(".notifications")) {
            ouvrirNotifications(false);
        }
    });
}

/* ---------- Recherche globale ---------- */
const donneesRecherche = [];

Object.keys(CONTACTS).forEach(function (cle) {
    const contact = CONTACTS[cle];
    const lien = "conversation.html?contact=" + cle;

    donneesRecherche.push({ type: "Contact", nom: contact.nom, detail: STATUTS[contact.statut], lien: lien, icone: "fa-user" });
    contact.messages.filter(estLisible).forEach(function (message) {
        const titre = message.auteur === "Moi" ? "Moi → " + contact.nom : contact.nom;
        donneesRecherche.push({ type: "Message", nom: titre, detail: message.texte || (message.audio ? "🎤 Message vocal" : "📷 Photo"), lien: lien, icone: "fa-comment" });
    });
});

Object.keys(SALONS).forEach(function (cle) {
    const salon = SALONS[cle];
    const lien = "conversation-salon.html?salon=" + cle;

    donneesRecherche.push({ type: "Salon", nom: "# " + salon.nom, detail: salon.membres + " membres", lien: lien, icone: "fa-hashtag" });
    salon.messages.filter(estLisible).forEach(function (message) {
        donneesRecherche.push({ type: "Message", nom: message.auteur + " (# " + salon.nom + ")", detail: message.texte || (message.audio ? "🎤 Message vocal" : "📷 Photo"), lien: lien, icone: "fa-comment" });
    });
});

function simplifier(texte) {
    return texte ? texte.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
}

const champRecherche = document.getElementById("recherche-globale");
const listeResultats = document.getElementById("resultats-recherche");

function afficherResultats() {
    if (!champRecherche || !listeResultats) return;
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
}

/* =========================================================
   Messagerie (conversation.html et conversation-salon.html)
   ========================================================= */
const typeMessagerie = document.body.dataset.type;

function heureActuelle() {
    const maintenant = new Date();
    return String(maintenant.getHours()).padStart(2, "0") + ":" + String(maintenant.getMinutes()).padStart(2, "0");
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

    function quiEcrit(discussion) {
        if (typeMessagerie === "contact") {
            return discussion.statut === "ecrit" ? discussion.nom : null;
        }
        return discussion.ecritPar || null;
    }

    function apercu(discussion) {
        const auteurEnTrain = quiEcrit(discussion);
        if (auteurEnTrain) {
            return typeMessagerie === "salon" ? auteurEnTrain + " écrit..." : "En train d'écrire...";
        }
        const dernier = discussion.messages[discussion.messages.length - 1];
        if (!dernier) return "Aucun message pour l'instant";
        if (dernier.systeme) return dernier.texte;

        let contenu;
        if (dernier.supprime === "tous") contenu = "🚫 Message supprimé";
        else if (dernier.masque) contenu = "🙈 Message masqué";
        else if (dernier.vueUnique) contenu = dernier.ouvert ? "① Ouvert" : "① Vue unique";
        else contenu = dernier.texte || (dernier.audio ? "🎤 Message vocal" : "📷 Photo");

        if (dernier.auteur === "Moi") return "Vous : " + contenu;
        return typeMessagerie === "salon" ? dernier.auteur + " : " + contenu : contenu;
    }

    function afficherListe() {
        if (!listeDiscussions) return;
        const saisie = filtreDiscussions ? simplifier(filtreDiscussions.value.trim()) : "";
        listeDiscussions.innerHTML = "";

        Object.keys(donnees).forEach(function (cle) {
            const discussion = donnees[cle];
            if (saisie && !simplifier(discussion.nom).includes(saisie)) return;

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
            if (quiEcrit(discussion)) {
                resume.classList.add("ecrit");
            } else {
                resume.classList.remove("ecrit");
            }
            resume.textContent = apercu(discussion);
            texte.append(nom, resume);

            const infos = document.createElement("div");
            infos.className = "recente-infos";
            const dernier = discussion.messages[discussion.messages.length - 1];
            const heure = document.createElement("small");
            heure.textContent = dernier ? dernier.heure : "";
            infos.appendChild(heure);

            const avatarDiv = document.createElement("div");
            remplirAvatar(avatarDiv, typeMessagerie, discussion);

            lien.append(avatarDiv, texte, infos);
            const ligne = document.createElement("li");
            ligne.appendChild(lien);
            listeDiscussions.appendChild(ligne);
        });
    }

    if (filtreDiscussions) {
        filtreDiscussions.addEventListener("input", afficherListe);
    }
    afficherListe();

    if (discussionOuverte && zoneMessages) {
        document.body.classList.add("vue-chat");
        const chatVide = document.getElementById("chat-vide");
        const chatActif = document.getElementById("chat-actif");
        if (chatVide) chatVide.hidden = true;
        if (chatActif) chatActif.hidden = false;

        const titre = typeMessagerie === "salon" ? "# " + discussionOuverte.nom : discussionOuverte.nom;
        document.title = titre + " - JokkoChat";
        const chatNom = document.getElementById("chat-nom");
        if (chatNom) chatNom.textContent = titre;

        const chatAvatar = document.getElementById("chat-avatar");
        if (chatAvatar) remplirAvatar(chatAvatar, typeMessagerie, discussionOuverte);

        function afficherMessages() {
            zoneMessages.innerHTML = "";
            const CLE_ENREGISTRES = "jokko-messages-enregistres";
            const messagesEnregistres = lireStockage(CLE_ENREGISTRES, []);

            discussionOuverte.messages.forEach(function (message) {
                const ligne = document.createElement("div");
                ligne.className = "bulle-ligne";
                if (message.auteur === "Moi") ligne.classList.add("envoye");

                const bulle = document.createElement("div");
                bulle.className = "bulle";

                const estEnregistre = messagesEnregistres.some(m => m.id === message.id);
                const btnEnregistrer = document.createElement("button");
                btnEnregistrer.className = "btn-options-message";
                btnEnregistrer.innerHTML = estEnregistre ? '<i class="fa-solid fa-bookmark" style="color: var(--primaire);"></i>' : '<i class="fa-regular fa-bookmark"></i>';
                btnEnregistrer.title = estEnregistre ? "Retirer des messages enregistrés" : "Enregistrer ce message";

                btnEnregistrer.addEventListener("click", function () {
                    let enregistres = lireStockage(CLE_ENREGISTRES, []);
                    const index = enregistres.findIndex(m => m.id === message.id);

                    if (index > -1) {
                        enregistres.splice(index, 1);
                        afficherToast("Message retiré des enregistrés");
                    } else {
                        enregistres.push({
                            id: message.id || (cleStockageOuverte + ":" + Math.random()),
                            auteur: message.auteur,
                            texte: message.texte || "[Média]",
                            heure: message.heure,
                            discussionNom: discussionOuverte.nom
                        });
                        afficherToast("Message enregistré ! 🔖");
                    }
                    ecrireStockage(CLE_ENREGISTRES, enregistres);
                    afficherMessages();
                });
                bulle.appendChild(btnEnregistrer);

                if (message.texte) {
                    const p = document.createElement("p");
                    p.textContent = message.texte;
                    bulle.appendChild(p);
                }

                const heureSpan = document.createElement("small");
                heureSpan.className = "bulle-heure";
                heureSpan.textContent = message.heure;
                bulle.appendChild(heureSpan);

                ligne.appendChild(bulle);
                zoneMessages.appendChild(ligne);
            });
            zoneMessages.scrollTop = zoneMessages.scrollHeight;
        }

        afficherMessages();

        const formMessage = document.getElementById("form-message");
        const champMessage = document.getElementById("champ-message");

        if (formMessage && champMessage) {
            formMessage.addEventListener("submit", function (e) {
                e.preventDefault();
                const texte = champMessage.value.trim();
                if (!texte) return;

                const nouveauMessage = {
                    auteur: "Moi",
                    heure: heureActuelle(),
                    texte: texte,
                    id: cleStockageOuverte + ":a" + Date.now()
                };

                discussionOuverte.messages.push(nouveauMessage);
                if (!messagesAjoutes[cleStockageOuverte]) messagesAjoutes[cleStockageOuverte] = [];
                messagesAjoutes[cleStockageOuverte].push(nouveauMessage);
                ecrireStockage(CLE_MESSAGES, messagesAjoutes);

                champMessage.value = "";
                afficherMessages();
            });
        }
    }
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

/* =========================================================
   Gestion de la page Contacts (contacts.html)
   ========================================================= */
const listeContactsPage = document.getElementById("liste-contacts");
const champRechercheContacts = document.getElementById("recherche-contacts");

if (listeContactsPage) {
    function afficherContactsPage(filtre = "") {
        listeContactsPage.innerHTML = "";
        const saisie = simplifier(filtre.trim());

        Object.keys(CONTACTS).forEach(function (cle) {
            const contact = CONTACTS[cle];
            if (saisie && !simplifier(contact.nom).includes(saisie)) {
                return;
            }

            const li = document.createElement("li");
            const lien = document.createElement("a");
            lien.href = "conversation.html?contact=" + cle;
            lien.className = "carte-contact";

            const avatarDiv = document.createElement("div");
            remplirAvatar(avatarDiv, "contact", contact);

            const infosDiv = document.createElement("div");
            infosDiv.className = "contact-infos";
            infosDiv.innerHTML = `
                <h3 class="contact-nom">${contact.nom}</h3>
                <small class="contact-statut ${contact.statut === 'ecrit' ? 'ecrit' : ''}">${STATUTS[contact.statut] || 'En ligne'}</small>
            `;

            const btnMessage = document.createElement("button");
            btnMessage.className = "btn btn-principal btn-auto";
            btnMessage.innerHTML = '<i class="fa-solid fa-message"></i> Discuter';

            lien.append(avatarDiv, infosDiv, btnMessage);
            li.appendChild(lien);
            listeContactsPage.appendChild(li);
        });
    }

    afficherContactsPage();

    if (champRechercheContacts) {
        champRechercheContacts.addEventListener("input", function () {
            afficherContactsPage(champRechercheContacts.value);
        });
    }
}

/* =========================================================
   Gestion de la page Salons (salons.html)
   ========================================================= */
const listeSalonsPage = document.getElementById("liste-salons");
const champRechercheSalons = document.getElementById("recherche-salons");

if (listeSalonsPage) {
    function afficherSalonsPage(filtre = "") {
        listeSalonsPage.innerHTML = "";
        const saisie = simplifier(filtre.trim());

        Object.keys(SALONS).forEach(function (cle) {
            const salon = SALONS[cle];
            if (saisie && !simplifier(salon.nom).includes(saisie) && !simplifier(salon.description || "").includes(saisie)) {
                return;
            }

            const li = document.createElement("li");
            const lien = document.createElement("a");
            lien.href = "conversation-salon.html?salon=" + cle;
            lien.className = "carte-salon";

            const iconeDiv = document.createElement("div");
            iconeDiv.className = "salon-icone";
            iconeDiv.style.background = salon.couleur || "#4f46e5";
            iconeDiv.innerHTML = `<i class="fa-solid ${salon.icone || 'fa-comments'}"></i>`;

            const infosDiv = document.createElement("div");
            infosDiv.className = "salon-infos";
            infosDiv.innerHTML = `
                <h3 class="salon-nom"># ${salon.nom}</h3>
                <p class="salon-description">${salon.description || 'Salon de discussion'}</p>
                <small class="salon-membres"><i class="fa-solid fa-user-group"></i> ${salon.membres || 1} membre(s)</small>
            `;

            lien.append(iconeDiv, infosDiv);
            li.appendChild(lien);
            listeSalonsPage.appendChild(li);
        });
    }

    afficherSalonsPage();

    if (champRechercheSalons) {
        champRechercheSalons.addEventListener("input", function () {
            afficherSalonsPage(champRechercheSalons.value);
        });
    }
}

/* =========================================================
   Activation des boutons de thème sur parametres.html
   ========================================================= */
document.querySelectorAll(".page-app button, [data-theme-btn], .section-parametres button").forEach(function(btn) {
    btn.addEventListener("click", function(e) {
        const texte = btn.textContent.trim().toLowerCase();
        if (texte.includes("sombre")) {
            parametres.theme = "sombre";
        } else if (texte.includes("clair")) {
            parametres.theme = "clair";
        } else {
            return;
        }
        enregistrerParametres();
        document.documentElement.dataset.theme = parametres.theme;
        afficherToast("Thème mis à jour ! 🌙");
    });
});