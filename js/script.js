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

function enregistrerParametres() {
    return ecrireStockage(CLE_PARAMETRES, parametres);
}

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

Object.assign(SALONS, lireStockage(CLE_SALONS, {}));
const messagesAjoutes = lireStockage(CLE_MESSAGES, {});

const CLE_MODIFICATIONS = "jokko-modifications";
const CLE_REGLAGES = "jokko-reglages";
const modificationsMessages = lireStockage(CLE_MODIFICATIONS, {});
const reglagesDiscussions = lireStockage(CLE_REGLAGES, {});

function reglageDe(cleStockage) {
    return Object.assign({ ephemere: parametres.ephemereDefaut }, reglagesDiscussions[cleStockage]);
}

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

/* ---------- Connexion / Inscription ---------- */
const formConnexion = document.getElementById("form-connexion");
const formInscription = document.getElementById("form-inscription");

function afficherOnglet(nom) {
    const estConnexion = nom === "connexion";
    if (formConnexion && formInscription) {
        formConnexion.hidden = !estConnexion;
        formInscription.hidden = estConnexion;
        document.getElementById("onglet-connexion").classList.toggle("actif", estConnexion);
        document.getElementById("onglet-inscription").classList.toggle("actif", !estConnexion);
    }
}

if (formConnexion && formInscription) {
    document.getElementById("onglet-connexion").addEventListener("click", function () { afficherOnglet("connexion"); });
    document.getElementById("onglet-inscription").addEventListener("click", function () { afficherOnglet("inscription"); });
}

/* ---------- Utilisateur connecté ---------- */
const CLE_UTILISATEUR = "jokko-utilisateur";

function lireUtilisateur() {
    try {
        return JSON.parse(localStorage.getItem(CLE_UTILISATEUR));
    } catch (erreur) {
        return null;
    }
}

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

/* ---------- Recherche globale ---------- */
const donneesRecherche = [];
Object.keys(CONTACTS).forEach(function (cle) {
    const contact = CONTACTS[cle];
    const lien = "conversation.html?contact=" + cle;
    donneesRecherche.push({ type: "Contact", nom: contact.nom, detail: STATUTS[contact.statut], lien: lien, icone: "fa-user" });
});
Object.keys(SALONS).forEach(function (cle) {
    const salon = SALONS[cle];
    const lien = "conversation-salon.html?salon=" + cle;
    donneesRecherche.push({ type: "Salon", nom: "# " + salon.nom, detail: salon.membres + " membres", lien: lien, icone: "fa-hashtag" });
});

function simplifier(texte) {
    return texte.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

const champRecherche = document.getElementById("recherche-globale");
const listeResultats = document.getElementById("resultats-recherche");

if (champRecherche && listeResultats) {
    champRecherche.addEventListener("input", function() {
        const saisie = simplifier(champRecherche.value.trim());
        listeResultats.innerHTML = "";
        if (saisie === "") { listeResultats.hidden = true; return; }
        const resultats = donneesRecherche.filter(el => simplifier(el.nom).includes(saisie));
        resultats.slice(0, 8).forEach(el => {
            const li = document.createElement("li");
            const a = document.createElement("a");
            a.href = el.lien;
            a.innerHTML = `<i class="fa-solid ${el.icone}"></i> <span class="resultat-texte"><strong>${el.nom}</strong><small>${el.detail}</small></span>`;
            li.appendChild(a);
            listeResultats.appendChild(li);
        });
        listeResultats.hidden = resultats.length === 0;
    });
}

/* =========================================================
   Messagerie & Enregistrement des messages
   ========================================================= */
const typeMessagerie = document.body.dataset.type;

function heureActuelle() {
    const maintenant = new Date();
    return String(maintenant.getHours()).padStart(2, "0") + ":" + String(maintenant.getMinutes()).padStart(2, "0");
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
    const cleOuverte = new URLSearchParams(window.location.search).get(typeMessagerie);
    const discussionOuverte = donnees[cleOuverte];
    const cleStockageOuverte = typeMessagerie + ":" + cleOuverte;
    const zoneMessages = document.getElementById("messages");

    if (discussionOuverte && zoneMessages) {
        document.body.classList.add("vue-chat");
        document.getElementById("chat-vide").hidden = true;
        document.getElementById("chat-actif").hidden = false;

        const titre = typeMessagerie === "salon" ? "# " + discussionOuverte.nom : discussionOuverte.nom;
        document.getElementById("chat-nom").textContent = titre;
        remplirAvatar(document.getElementById("chat-avatar"), typeMessagerie, discussionOuverte);

        const CLE_ENREGISTRES = "jokko-messages-enregistres";

        function afficherMessages() {
            zoneMessages.innerHTML = "";
            const messagesEnregistres = lireStockage(CLE_ENREGISTRES, []);

            discussionOuverte.messages.forEach(function (message) {
                const ligne = document.createElement("div");
                ligne.className = "bulle-ligne";
                if (message.auteur === "Moi") { ligne.classList.add("envoye"); }

                const bulle = document.createElement("div");
                bulle.className = "bulle";

                // Bouton d'enregistrement (signet 🔖)
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
                            id: message.id,
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

        if (formMessage) {
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
                if (!messagesAjoutes[cleStockageOuverte]) { messagesAjoutes[cleStockageOuverte] = []; }
                messagesAjoutes[cleStockageOuverte].push(nouveauMessage);
                ecrireStockage(CLE_MESSAGES, messagesAjoutes);

                champMessage.value = "";
                afficherMessages();
            });
        }
    }
}

/* =========================================================
   Gestion de la page Contacts (contacts.html)
   ========================================================= */
const listeContactsPage = document.getElementById("liste-contacts");
const champRechercheContacts = document.getElementById("recherche-contacts");

if (listeContactsPage) {
    function afficherContacts(filtre = "") {
        listeContactsPage.innerHTML = "";
        const saisie = simplifier(filtre.trim());

        Object.keys(CONTACTS).forEach(function (cle) {
            const contact = CONTACTS[cle];
            if (!simplifier(contact.nom).includes(saisie)) return;

            const li = document.createElement("li");
            const lien = document.createElement("a");
            lien.href = "conversation.html?contact=" + cle;
            lien.className = "carte-contact";

            const avatarDiv = document.createElement("div");
            remplirAvatar(avatarDiv, "contact", contact);

            const infosDiv = document.createElement("div");
            infosDiv.className = "contact-infos";
            infosDiv.innerHTML = `<p class="contact-nom">${contact.nom}</p><p class="contact-statut ${contact.statut}">${contact.statut === 'en-ligne' ? 'En ligne' : 'Hors-ligne'}</p>`;

            lien.append(avatarDiv, infosDiv);
            li.appendChild(lien);
            listeContactsPage.appendChild(li);
        });
    }
    afficherContacts();
    if (champRechercheContacts) {
        champRechercheContacts.addEventListener("input", function () { afficherContacts(champRechercheContacts.value); });
    }
}

/* =========================================================
   Gestion de la page Profil (profil.html)
   ========================================================= */
const profilNom = document.getElementById("profil-nom");
const profilEmail = document.getElementById("profil-email");
if (profilNom && utilisateurConnecte) {
    profilNom.textContent = utilisateurConnecte.nom;
    if (profilEmail) { profilEmail.textContent = utilisateurConnecte.email || "Non renseigné"; }
}

/* =========================================================
   Gestion de la page Messages Enregistrés (messages-enregistres.html)
   ========================================================= */
const listeEnregistresPage = document.getElementById("liste-enregistres");

if (listeEnregistresPage) {
    function afficherMessagesEnregistres() {
        const enregistres = lireStockage("jokko-messages-enregistres", []);
        listeEnregistresPage.innerHTML = "";

        if (enregistres.length === 0) {
            listeEnregistresPage.innerHTML = `
                <li style="padding: 24px; text-align: center; color: var(--texte-doux); list-style: none;">
                    <i class="fa-regular fa-bookmark" style="font-size: 2rem; margin-bottom: 8px; display: block; color: var(--primaire);"></i>
                    Aucun message enregistré pour l'instant. Cliquez sur l'icône de signet (🔖) sur un message dans vos conversations pour l'enregistrer ici !
                </li>
            `;
            return;
        }

        enregistres.forEach(function (message) {
            const li = document.createElement("li");
            li.style.display = "flex";
            li.style.alignItems = "center";
            li.style.justifyContent = "space-between";
            li.style.padding = "14px 16px";
            li.style.borderBottom = "1px solid var(--bordure)";

            const infoDiv = document.createElement("div");
            infoDiv.innerHTML = `<strong style="font-size: 0.85rem; color: var(--primaire); display: block;">${message.auteur} ${message.discussionNom ? '(' + message.discussionNom + ')' : ''}</strong><p style="font-size: 0.95rem;">${message.texte}</p>`;

            const actionsDiv = document.createElement("div");
            actionsDiv.style.display = "flex";
            actionsDiv.style.alignItems = "center";
            actionsDiv.style.gap = "12px";
            actionsDiv.innerHTML = `<small style="color: var(--texte-doux);">${message.heure}</small>`;

            const btnSupprimer = document.createElement("button");
            btnSupprimer.className = "btn-icone";
            btnSupprimer.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
            btnSupprimer.title = "Retirer des enregistrés";
            btnSupprimer.addEventListener("click", function () {
                let actualises = lireStockage("jokko-messages-enregistres", []);
                actualises = actualises.filter(m => m.id !== message.id);
                ecrireStockage("jokko-messages-enregistres", actualises);
                afficherMessagesEnregistres();
                afficherToast("Message retiré des enregistrés");
            });

            actionsDiv.appendChild(btnSupprimer);
            li.append(infoDiv, actionsDiv);
            listeEnregistresPage.appendChild(li);
        });
    }

    afficherMessagesEnregistres();
}