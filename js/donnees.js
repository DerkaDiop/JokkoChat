/* =========================================================
   JokkoChat - Données partagées (Supabase)
   Chargé AVANT script.js sur chaque page :
   1. vérifie qui est connecté ;
   2. charge les utilisateurs (CONTACTS), les salons (SALONS) et les messages ;
   3. écoute en temps réel les nouveaux messages, qui est en ligne et qui écrit ;
   4. lance ensuite script.js, qui affiche tout comme avant.
   ========================================================= */

// Clé « publishable » : elle peut être publique, les règles RLS protègent les données
const SUPABASE_URL = "https://mmkhycwynwkcteyjzzgp.supabase.co";   // adresse de notre projet Supabase
const SUPABASE_CLE = "sb_publishable_ILmd1o-MBQ9eSdthsqIRWg_vEbpNcE4"; // clé publique prévue pour le navigateur
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_CLE);       // le client : toutes les requêtes passent par « sb »

// Mêmes formats qu'avant : CONTACTS[id] = { nom, statut, messages }, SALONS[id] = { nom, ..., messages }
// CONTACTS contient ma liste de contacts (estContact) et les personnes qui m'ont écrit sans y être.
const CONTACTS = {};   // discussions privées, rangées par identifiant de la personne
const SALONS = {};     // salons publics et groupes privés, rangés par identifiant du salon
const PROFILS = {};    // tous les profils inscrits (nom, @, numéro, photo...)
const CHAMPS_PROFIL = "id, nom, email, bio, pseudo, telephone, photo_url"; // colonnes lues dans « profils »
// Retrouver un message par son numéro dans la base (réponses, réactions...)
const MESSAGES_PAR_ID = {};
let moi = null; // identifiant de l'utilisateur connecté

// Fonctions appelées par script.js quand quelque chose change
// (script.js s'inscrit avec ecouteurs.message.push(...), donnees.js les appelle avec prevenir)
const ecouteurs = { message: [], statut: [], groupe: [], retire: [] };

// Appelle toutes les fonctions inscrites pour ce type d'événement
function prevenir(type, ...valeurs) {
    ecouteurs[type].forEach(function (fonction) {   // pour chaque fonction inscrite...
        fonction(...valeurs);                        // ...on l'appelle avec les informations reçues
    });
}

/* ---------- Heure d'un message : « 14:05 », « Hier », « Lun », « 12/10 » ---------- */
const JOURS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]; // getDay() renvoie 0 pour dimanche

function formaterHeure(date) {
    const quand = new Date(date);                    // date du message
    const aujourdhui = new Date();                   // date actuelle
    const debutJour = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate()); // aujourd'hui à minuit
    // Nombre de jours entre le message et aujourd'hui (86 400 000 ms = 1 jour)
    const joursPasses = Math.floor((debutJour - new Date(quand.getFullYear(), quand.getMonth(), quand.getDate())) / 86400000);

    if (joursPasses <= 0) {                          // aujourd'hui : on affiche l'heure « 14:05 »
        return String(quand.getHours()).padStart(2, "0") + ":" + String(quand.getMinutes()).padStart(2, "0");
    }
    if (joursPasses === 1) {                         // hier
        return "Hier";
    }
    if (joursPasses < 7) {                           // cette semaine : le jour « Lun »
        return JOURS[quand.getDay()];
    }
    // Plus ancien : la date « 12/10 » (getMonth() commence à 0, d'où le + 1)
    return String(quand.getDate()).padStart(2, "0") + "/" + String(quand.getMonth() + 1).padStart(2, "0");
}

/* ---------- Ligne de la base -> message affiché ---------- */
// Transforme une ligne de la table « messages » en objet utilisé par script.js
function versMessage(ligne) {
    const message = {
        id: "sb:" + ligne.id,                        // identifiant utilisé dans le navigateur
        sbId: ligne.id,                              // numéro du message dans la base
        auteurId: ligne.auteur_id,                   // identifiant de l'auteur
        auteur: ligne.auteur_id === moi ? "Moi" : nomDe(ligne.auteur_id), // « Moi » ou le nom de l'auteur
        heure: formaterHeure(ligne.cree_le),         // heure affichée sous la bulle
        date: ligne.cree_le,                         // date complète (pour trier)
        texte: ligne.texte || "",                    // texte (vide pour une photo seule)
        // Message privé lu par le destinataire : ✓✓ violet
        etat: ligne.lu_le ? "lu" : "recu",
        reponseA: ligne.reponse_a,                   // numéro du message auquel il répond
        luParMoi: Boolean(ligne.lu_le),              // déjà signalé comme lu ?
        reactions: {}                                // réactions : { idPersonne: "❤️" }
    };
    if (ligne.image_url) {                           // message avec une photo
        message.image = ligne.image_url;
    }
    if (ligne.audio_url) {                           // message vocal
        message.audio = ligne.audio_url;
        message.duree = ligne.duree || 0;            // durée en secondes
    }
    if (ligne.vue_unique) {                          // message à vue unique
        message.vueUnique = true;
        if (ligne.ouvert_le) {                       // déjà ouvert : le contenu a été effacé
            Object.assign(message, { ouvert: true, texte: "", image: null, audio: null });
        }
    }
    if (ligne.modifie_le) {                          // message modifié : mention « modifié »
        message.modifie = true;
    }
    if (ligne.supprime) {                            // supprimé pour tout le monde : on vide le contenu
        Object.assign(message, { supprime: "tous", texte: "", image: null, audio: null, vueUnique: false });
    }
    MESSAGES_PAR_ID[ligne.id] = message;             // on le range par numéro (réponses, réactions)
    return message;
}

// Message envoyé depuis cette page : on le range aussi par numéro
function indexerMessage(message) {
    message.reactions = message.reactions || {};    // pas encore de réactions
    MESSAGES_PAR_ID[message.sbId] = message;
}

// Nom affiché : celui sous lequel je l'ai enregistré, sinon son nom de profil
function nomDe(id) {
    if (CONTACTS[id] && CONTACTS[id].estContact) {  // dans mes contacts : le nom que j'ai choisi
        return CONTACTS[id].nom;
    }
    return (PROFILS[id] || { nom: "Utilisateur" }).nom; // sinon son nom de profil
}

// Ajoute une personne à CONTACTS (estContact : elle est dans ma liste)
// enregistrement : { prenom, nom } choisis dans « Nouveau contact »
function preparerContact(id, estContact, enregistrement) {
    const profil = PROFILS[id];
    if (!profil || id === moi) {                     // profil inconnu, ou moi-même : rien à faire
        return null;
    }
    if (!CONTACTS[id]) {                             // première fois : on crée la discussion
        const enLigne = canalPresence ? canalPresence.presenceState() : {}; // qui est connecté en ce moment
        CONTACTS[id] = { nom: profil.nom, statut: enLigne[id] ? "en-ligne" : "hors-ligne", messages: [] };
    }
    // On recopie les informations du profil (elles peuvent avoir changé)
    Object.assign(CONTACTS[id], { nomProfil: profil.nom, pseudo: profil.pseudo, telephone: profil.telephone, photo: profil.photo_url });
    CONTACTS[id].estContact = CONTACTS[id].estContact || estContact; // une fois dans ma liste, il y reste
    if (enregistrement) {                            // nom choisi dans « Nouveau contact »
        const nomChoisi = [enregistrement.prenom, enregistrement.nom].filter(Boolean).join(" ").trim(); // « Prénom Nom »
        CONTACTS[id].nom = nomChoisi || profil.nom;  // sinon on garde son nom de profil
    }
    return CONTACTS[id];
}

// Transforme une ligne de la table « salons » en salon utilisé par script.js
// membresIds : liste des membres d'un groupe privé (null pour un salon public)
function versSalon(salon, membres, membresIds) {
    return {
        nom: salon.nom,
        description: salon.description,
        icone: salon.icone,                          // icône Font Awesome (ex. fa-users)
        couleur: salon.couleur,                      // couleur de l'avatar du salon
        prive: salon.prive,                          // true = groupe privé
        createurId: salon.createur_id,               // seul le créateur gère le groupe
        membres: membres,                            // nombre de membres affiché
        membresIds: membresIds,
        messages: []
    };
}

// Dans quelle discussion va ce message ? (salon, ou l'autre personne d'un message privé)
function discussionDe(ligne) {
    if (ligne.salon_id) {                            // message de salon ou de groupe
        return { type: "salon", cle: ligne.salon_id, discussion: SALONS[ligne.salon_id] };
    }
    // Message privé : la discussion porte le nom de « l'autre » (destinataire si c'est moi qui écris)
    const autre = ligne.auteur_id === moi ? ligne.destinataire_id : ligne.auteur_id;
    // Quelqu'un qui n'est pas dans mes contacts peut quand même m'écrire
    return { type: "contact", cle: autre, discussion: CONTACTS[autre] || preparerContact(autre, false) };
}

/* ---------- Chargement initial ---------- */
// Renvoie true si script.js doit être lancé (false = on change de page)
async function chargerDonnees() {
    const { data: { session } } = await sb.auth.getSession();       // y a-t-il quelqu'un de connecté ?
    const pageApp = document.body.classList.contains("page-app");   // page réservée aux connectés ?

    if (!session) {                                  // personne n'est connecté
        localStorage.removeItem("jokko-utilisateur");
        if (pageApp) {                               // page protégée : retour à la connexion
            window.location.replace("index.html");
            return false;
        }
        return true;                                 // page de connexion : on peut l'afficher
    }
    // Déjà connecté sur la page de connexion : direction le menu
    if (!pageApp) {
        window.location.replace("menu.html");
        return false;
    }

    moi = session.user.id;                           // identifiant de la personne connectée

    // Toutes les lectures en même temps (Promise.all attend qu'elles soient toutes finies).
    // Les règles RLS de la base ne renvoient que ce que j'ai le droit de voir.
    const reponses = await Promise.all([
        sb.from("profils").select(CHAMPS_PROFIL).order("nom"),        // tous les profils, triés par nom
        sb.from("contacts").select("contact_id, prenom, nom"),        // MA liste de contacts
        sb.from("salons").select("*").order("cree_le"),               // salons publics + mes groupes
        sb.from("salon_membres").select("salon_id, membre_id"),       // membres de mes groupes
        sb.from("messages").select("*").order("cree_le", { ascending: false }).limit(1000), // 1000 derniers messages
        sb.from("reactions").select("*")                              // réactions des messages visibles
    ]);
    const erreur = reponses.find(function (reponse) {  // une des lectures a-t-elle échoué ?
        return reponse.error;
    });
    if (erreur) {
        throw erreur.error;                          // l'erreur est affichée au démarrage (tout en bas)
    }
    const [profils, contacts, salons, membres, messages, reactions] = reponses; // on nomme chaque réponse

    profils.data.forEach(function (profil) {         // on range les profils par identifiant
        PROFILS[profil.id] = profil;
    });
    // script.js lit l'utilisateur connecté ici (nom dans la barre latérale, profil...)
    localStorage.setItem("jokko-utilisateur", JSON.stringify(PROFILS[moi]));

    contacts.data.forEach(function (contact) {       // ma liste de contacts, avec les noms choisis
        preparerContact(contact.contact_id, true, contact);
    });

    // Nombre de membres : tous les inscrits pour un salon public, la liste des membres pour un groupe
    const membresParGroupe = {};                     // { idGroupe: [idMembre, ...] }
    membres.data.forEach(function (membre) {
        (membresParGroupe[membre.salon_id] = membresParGroupe[membre.salon_id] || []).push(membre.membre_id);
    });
    salons.data.forEach(function (salon) {
        const ids = salon.prive ? membresParGroupe[salon.id] || [] : null; // membres seulement pour un groupe
        SALONS[salon.id] = versSalon(salon, ids ? ids.length : profils.data.length, ids);
    });

    // Les messages arrivent du plus récent au plus ancien : on inverse pour les ranger dans l'ordre
    messages.data.reverse().forEach(function (ligne) {
        const { discussion } = discussionDe(ligne);  // la discussion à laquelle il appartient
        if (discussion) {
            discussion.messages.push(versMessage(ligne));
        }
    });

    reactions.data.forEach(function (reaction) {     // on accroche chaque réaction à son message
        const message = MESSAGES_PAR_ID[reaction.message_id];
        if (message) {
            message.reactions[reaction.utilisateur_id] = reaction.emoji;
        }
    });

    ecouterTempsReel();                              // à partir de maintenant, on reçoit les changements en direct
    return true;                                     // script.js peut être lancé
}

/* ---------- Temps réel ---------- */
let canalPresence = null;      // canal « en ligne » et « en train d'écrire »
const minuteursEcriture = {};  // minuteurs qui effacent « en train d'écrire » après 4 secondes

function ecouterTempsReel() {
    // Abonnement aux changements de la base : Supabase nous envoie chaque ajout ou modification
    sb.channel("messages")
        // Nouveaux messages et messages modifiés (supprimés, lus, ouverts...)
        .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, async function (changement) {
            const ligne = changement.new;            // la ligne telle qu'elle est maintenant dans la base
            // Expéditeur inscrit après le chargement de la page : on récupère son profil
            if (!PROFILS[ligne.auteur_id]) {
                const { data } = await sb.from("profils").select(CHAMPS_PROFIL)
                    .eq("id", ligne.auteur_id).single();
                if (data) {
                    PROFILS[data.id] = data;
                }
            }
            const { type, cle, discussion } = discussionDe(ligne); // dans quelle discussion ?
            if (!discussion) {
                return;
            }

            if (changement.eventType === "INSERT") { // un nouveau message a été ajouté
                // Mes propres messages sont déjà affichés au moment de l'envoi
                if (ligne.auteur_id === moi) {
                    return;
                }
                // Il a fini d'écrire puisqu'il vient d'envoyer
                arreterEcriture(type, cle);
                const message = versMessage(ligne);  // ligne de la base -> message affichable
                discussion.messages.push(message);   // on l'ajoute à la discussion
                prevenir("message", type, cle, message); // script.js l'affiche, joue le son...
            } else if (changement.eventType === "UPDATE") { // un message existant a changé
                const message = discussion.messages.find(function (element) { // on retrouve notre copie
                    return element.sbId === ligne.id;
                });
                if (!message) {
                    return;
                }
                if (ligne.supprime) {                // supprimé pour tout le monde
                    Object.assign(message, { supprime: "tous", texte: "", image: null, audio: null, vueUnique: false, masque: false });
                } else if (ligne.vue_unique && ligne.ouvert_le) { // vue unique ouverte par le destinataire
                    Object.assign(message, { ouvert: true, texte: "", image: null, audio: null });
                } else if (ligne.modifie_le) {       // texte modifié par son auteur
                    Object.assign(message, { texte: ligne.texte || "", modifie: true });
                }
                if (ligne.lu_le && message.auteur === "Moi") { // mon message a été lu : ✓✓ violet
                    message.etat = "lu";
                }
                prevenir("statut");                  // script.js redessine
            }
        })
        // On m'ajoute à un groupe : il apparaît sans recharger la page
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "salon_membres" }, async function (changement) {
            const { salon_id: salonId, membre_id: membreId } = changement.new; // quel groupe, quel membre
            const groupe = SALONS[salonId];
            if (groupe) {
                // Nouveau membre dans un groupe que je connais déjà
                if (groupe.membresIds && !groupe.membresIds.includes(membreId)) {
                    groupe.membresIds.push(membreId);
                    groupe.membres = groupe.membresIds.length;
                    prevenir("statut");
                }
                return;
            }
            if (membreId !== moi) {                  // groupe inconnu et ce n'est pas moi : rien à faire
                return;
            }
            // C'est moi qu'on vient d'ajouter : on charge le groupe et ses membres
            const { data } = await sb.from("salons").select("*").eq("id", salonId).single();
            const { data: lignes } = await sb.from("salon_membres").select("membre_id").eq("salon_id", salonId);
            if (data) {
                const ids = (lignes || []).map(function (ligne) { // liste des identifiants des membres
                    return ligne.membre_id;
                });
                SALONS[salonId] = versSalon(data, ids.length, ids);
                prevenir("groupe", salonId);
                prevenir("statut");
            }
        })
        // Un membre quitte ou est retiré d'un groupe
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "salon_membres" }, function (changement) {
            const { salon_id: salonId, membre_id: membreId } = changement.old; // la ligne supprimée
            const groupe = SALONS[salonId];
            if (!groupe) {
                return;
            }
            if (membreId === moi) {                  // c'est moi qui suis retiré : le groupe disparaît
                delete SALONS[salonId];
                prevenir("retire", salonId);
            } else if (groupe.membresIds) {          // un autre membre : on l'enlève de la liste
                groupe.membresIds = groupe.membresIds.filter(function (id) {
                    return id !== membreId;
                });
                groupe.membres = groupe.membresIds.length;
            }
            prevenir("statut");
        })
        // Groupe renommé
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "salons" }, function (changement) {
            const groupe = SALONS[changement.new.id];
            if (groupe) {
                groupe.nom = changement.new.nom;     // nouveau nom
                prevenir("statut");
            }
        })
        // Réactions ajoutées, changées ou retirées
        .on("postgres_changes", { event: "*", schema: "public", table: "reactions" }, function (changement) {
            // Pour une suppression, la ligne est dans « old » ; sinon dans « new »
            const ligne = changement.eventType === "DELETE" ? changement.old : changement.new;
            const message = MESSAGES_PAR_ID[ligne.message_id];
            if (!message || ligne.utilisateur_id === moi) { // mes réactions sont déjà affichées
                return;
            }
            if (changement.eventType === "DELETE") {
                delete message.reactions[ligne.utilisateur_id]; // réaction retirée
            } else {
                message.reactions[ligne.utilisateur_id] = ligne.emoji; // réaction ajoutée ou changée
            }
            prevenir("statut");
        })
        .subscribe();                                // on démarre l'abonnement

    // Qui est en ligne (présence) et qui écrit (diffusion)
    // Rien n'est enregistré dans la base : ce sont des informations « du moment »
    canalPresence = sb.channel("en-ligne", { config: { presence: { key: moi } } }); // je m'annonce avec mon identifiant

    canalPresence
        // « sync » : la liste des personnes connectées a changé
        .on("presence", { event: "sync" }, function () {
            const enLigne = canalPresence.presenceState(); // { idPersonne: [...] } pour chaque connecté
            Object.keys(CONTACTS).forEach(function (id) {
                if (CONTACTS[id].statut !== "ecrit") { // on ne cache pas « en train d'écrire »
                    CONTACTS[id].statut = enLigne[id] ? "en-ligne" : "hors-ligne";
                }
            });
            prevenir("statut");
        })
        // Quelqu'un signale qu'il est en train d'écrire
        .on("broadcast", { event: "ecrit" }, function ({ payload }) {
            // Message privé : seulement si c'est à moi qu'il écrit
            if (payload.type === "contact" && payload.vers !== moi) {
                return;
            }
            // Discussion concernée : la personne (privé) ou le salon
            const cle = payload.type === "contact" ? payload.de : payload.vers;
            const discussion = payload.type === "contact" ? CONTACTS[cle] : SALONS[cle];
            if (!discussion) {
                return;
            }

            if (payload.type === "contact") {
                discussion.statut = "ecrit";         // « En train d'écrire... »
            } else {
                discussion.ecritPar = (PROFILS[payload.de] || { nom: "Quelqu'un" }).nom; // « Awa écrit... »
            }
            prevenir("statut");

            // Sans nouvelle frappe pendant 4 secondes, l'indicateur disparaît
            clearTimeout(minuteursEcriture[payload.type + cle]);           // on annule l'ancien minuteur
            minuteursEcriture[payload.type + cle] = setTimeout(function () { // et on en relance un
                arreterEcriture(payload.type, cle);
                prevenir("statut");
            }, 4000);
        })
        .subscribe(function (etat) {
            if (etat === "SUBSCRIBED") {             // connecté au canal :
                canalPresence.track({ depuis: new Date().toISOString() }); // j'annonce que je suis en ligne
            }
        });
}

// Enlève « en train d'écrire » d'une discussion
function arreterEcriture(type, cle) {
    clearTimeout(minuteursEcriture[type + cle]);
    if (type === "contact" && CONTACTS[cle]) {       // privé : on remet « en ligne » ou « hors ligne »
        const enLigne = canalPresence ? canalPresence.presenceState() : {};
        CONTACTS[cle].statut = enLigne[cle] ? "en-ligne" : "hors-ligne";
    } else if (type === "salon" && SALONS[cle]) {    // salon : plus personne n'écrit
        SALONS[cle].ecritPar = null;
    }
}

// Prévient les autres que j'écris (au plus une fois toutes les 2 secondes)
let derniereFrappe = 0;                              // heure du dernier signal envoyé

function signalerEcriture(type, cle) {
    if (!canalPresence || Date.now() - derniereFrappe < 2000) { // signal déjà envoyé il y a moins de 2 s
        return;
    }
    derniereFrappe = Date.now();
    // Diffusion à tous les connectés ; seul le destinataire (ou les membres du salon) en tient compte
    canalPresence.send({ type: "broadcast", event: "ecrit", payload: { type: type, de: moi, vers: cle } });
}

/* ---------- Envoi ---------- */
// Les images et les vocaux (« data URL ») vont dans le stockage de fichiers
async function televerser(dataUrl, extension) {
    const fichier = await (await fetch(dataUrl)).blob(); // texte « data URL » -> vrai fichier
    // Chemin unique : monIdentifiant/heure-hasard.jpg (chacun dépose dans son propre dossier)
    const chemin = moi + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + extension;
    const { error } = await sb.storage.from("fichiers").upload(chemin, fichier, { contentType: fichier.type }); // envoi
    if (error) {
        throw error;
    }
    return sb.storage.from("fichiers").getPublicUrl(chemin).data.publicUrl; // adresse publique du fichier
}

// contenu : { texte, image, audio, duree, vueUnique } -> renvoie la ligne enregistrée
async function enregistrerMessage(type, cle, contenu) {
    // La ligne à ajouter dans la table « messages »
    const ligne = {
        auteur_id: moi,                              // c'est moi qui envoie (vérifié par la règle RLS)
        texte: contenu.texte || null,
        duree: contenu.duree || null,                // durée d'un vocal
        vue_unique: Boolean(contenu.vueUnique),
        reponse_a: contenu.reponseA || null          // message auquel je réponds
    };
    // Soit un salon, soit une personne : jamais les deux
    ligne[type === "salon" ? "salon_id" : "destinataire_id"] = cle;

    if (contenu.image) {                             // la photo va d'abord dans le stockage
        ligne.image_url = await televerser(contenu.image, "jpg");
    }
    if (contenu.audio) {                             // le vocal aussi
        ligne.audio_url = await televerser(contenu.audio, "webm");
    }

    // Ajout dans la base ; .select().single() renvoie la ligne créée (avec son numéro)
    const { data, error } = await sb.from("messages").insert(ligne).select().single();
    if (error) {
        throw error;                                 // script.js affichera « Le message n'a pas pu être envoyé »
    }
    return data;
}

// Ma réaction sur un message (emoji = null pour la retirer)
async function reagir(sbId, emoji) {
    const requete = emoji
        // upsert : ajoute ma réaction, ou la remplace si j'en avais déjà une
        ? sb.from("reactions").upsert({ message_id: sbId, utilisateur_id: moi, emoji: emoji }, { onConflict: "message_id,utilisateur_id" })
        // sinon : on supprime ma réaction
        : sb.from("reactions").delete().eq("message_id", sbId).eq("utilisateur_id", moi);
    const { error } = await requete;
    if (error) {
        throw error;
    }
}

// J'ai lu les messages de cette personne (accusés de lecture)
async function marquerLus(expediteurId) {
    await sb.rpc("marquer_lus", { expediteur: expediteurId }); // appelle la fonction SQL marquer_lus
}

// J'ai ouvert un message à vue unique : il est effacé pour tout le monde
async function ouvrirVueUniqueBase(sbId) {
    await sb.rpc("ouvrir_vue_unique", { message: sbId }); // appelle la fonction SQL ouvrir_vue_unique
}

/* ---------- Groupes ---------- */
async function renommerGroupe(salonId, nom) {
    const { error } = await sb.from("salons").update({ nom: nom }).eq("id", salonId); // seul le créateur y a droit (RLS)
    if (error) {
        throw error;
    }
    SALONS[salonId].nom = nom;
}

async function ajouterMembres(salonId, ids) {
    // Une ligne par nouveau membre dans « salon_membres »
    const { error } = await sb.from("salon_membres").insert(ids.map(function (id) {
        return { salon_id: salonId, membre_id: id };
    }));
    if (error) {
        throw error;
    }
}

// Retirer quelqu'un (créateur) ou quitter le groupe (id = moi)
async function retirerMembre(salonId, id) {
    const { error } = await sb.from("salon_membres").delete().eq("salon_id", salonId).eq("membre_id", id);
    if (error) {
        throw error;
    }
}

// Nouveau texte d'un message que j'ai envoyé
async function modifierTexte(sbId, texte) {
    const { error } = await sb.from("messages")
        .update({ texte: texte, modifie_le: new Date().toISOString() }) // nouveau texte + date de modification
        .eq("id", sbId);                             // seulement ce message (et la RLS vérifie que c'est le mien)
    if (error) {
        throw error;
    }
}

// « Supprimer pour tout le monde » : on vide le message et on le marque comme supprimé
async function supprimerPourTous(sbId) {
    const { error } = await sb.from("messages")
        .update({ supprime: true, texte: null, image_url: null, audio_url: null })
        .eq("id", sbId);
    if (error) {
        throw error;
    }
}

/* ---------- Comptes ---------- */
// Inscription : infos = { nom, niveau, specialite, departement } (copiées dans « profils » par la base)
async function inscrire(email, motDePasse, infos) {
    const { data, error } = await sb.auth.signUp({ email: email, password: motDePasse, options: { data: infos } });
    if (error) {
        throw error;
    }
    return data.session; // null si Supabase demande de confirmer l'email
}

// Connexion avec email et mot de passe
async function connecter(email, motDePasse) {
    const { error } = await sb.auth.signInWithPassword({ email: email, password: motDePasse });
    if (error) {
        throw error;                                 // ex. invalid_credentials : mauvais mot de passe
    }
}

// Déconnexion : fin de la session Supabase et oubli du profil gardé dans le navigateur
async function deconnecter() {
    await sb.auth.signOut();
    localStorage.removeItem("jokko-utilisateur");
}

// Modifie mon profil (nom, bio, @, numéro, photo)
async function mettreAJourProfil(champs) {
    const { error } = await sb.from("profils").update(champs).eq("id", moi);
    if (error) {
        throw error;                                 // ex. 23505 : @nomdeprofil déjà pris
    }
}

// Ajoute quelqu'un à ma liste de contacts (ou le renomme s'il y est déjà)
async function ajouterContact(id, enregistrement) {
    const noms = { prenom: enregistrement.prenom || null, nom: enregistrement.nom || null };
    const { error } = await sb.from("contacts")
        // upsert : ajoute le contact, ou met à jour son nom s'il existe déjà
        .upsert(Object.assign({ proprietaire_id: moi, contact_id: id }, noms), { onConflict: "proprietaire_id,contact_id" });
    if (error) {
        throw error;
    }
    return preparerContact(id, true, noms);
}

// Groupe privé : un salon « prive » + ses membres (moi compris)
async function creerGroupe(nom, membresIds) {
    const groupe = await creerSalon({ nom: nom, prive: true, icone: "fa-user-group", couleur: "#0ea5e9" });
    const lignes = [moi].concat(membresIds).map(function (id) { // moi + les membres choisis
        return { salon_id: groupe.id, membre_id: id };
    });
    const { error } = await sb.from("salon_membres").insert(lignes);
    if (error) {
        throw error;
    }
    return groupe;
}

// Crée un salon (ou un groupe) dont je suis le créateur
async function creerSalon(salon) {
    const { data, error } = await sb.from("salons")
        .insert(Object.assign({ createur_id: moi }, salon))
        .select().single();                          // renvoie le salon créé (avec son identifiant)
    if (error) {
        throw error;                                 // ex. 23505 : nom déjà pris
    }
    return data;
}

/* ---------- Démarrage ---------- */
// script.js n'est lancé qu'une fois les données prêtes
chargerDonnees().catch(function (erreur) {           // si le chargement échoue...
    console.error("Supabase :", erreur);
    alert("Impossible de charger les données. Vérifiez votre connexion Internet.");
    return true;                                     // ...on lance quand même la page
}).then(function (lancer) {
    if (!lancer) {                                   // on change de page : inutile de lancer script.js
        return;
    }
    // On ajoute <script src="js/script.js"> à la page : il s'exécute avec les données prêtes
    const script = document.createElement("script");
    script.src = "js/script.js";
    document.body.appendChild(script);
});
