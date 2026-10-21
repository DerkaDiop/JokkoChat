/* =========================================================
   JokkoChat - Données partagées (Supabase)
   Chargé AVANT script.js sur chaque page :
   1. vérifie qui est connecté ;
   2. charge les utilisateurs (CONTACTS), les salons (SALONS) et les messages ;
   3. écoute en temps réel les nouveaux messages, qui est en ligne et qui écrit ;
   4. lance ensuite script.js, qui affiche tout comme avant.
   ========================================================= */

// Clé « publishable » : elle peut être publique, les règles RLS protègent les données
const SUPABASE_URL = "https://mmkhycwynwkcteyjzzgp.supabase.co";
const SUPABASE_CLE = "sb_publishable_ILmd1o-MBQ9eSdthsqIRWg_vEbpNcE4";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_CLE);

// Mêmes formats qu'avant : CONTACTS[id] = { nom, statut, messages }, SALONS[id] = { nom, ..., messages }
// CONTACTS contient ma liste de contacts (estContact) et les personnes qui m'ont écrit sans y être.
const CONTACTS = {};
const SALONS = {};
const PROFILS = {};
const CHAMPS_PROFIL = "id, nom, email, bio, pseudo, telephone, photo_url";
// Retrouver un message par son numéro dans la base (réponses, réactions...)
const MESSAGES_PAR_ID = {};
let moi = null; // identifiant de l'utilisateur connecté

// Fonctions appelées par script.js quand quelque chose change
const ecouteurs = { message: [], statut: [], groupe: [], retire: [] };

function prevenir(type, ...valeurs) {
    ecouteurs[type].forEach(function (fonction) {
        fonction(...valeurs);
    });
}

/* ---------- Heure d'un message : « 14:05 », « Hier », « Lun », « 12/10 » ---------- */
const JOURS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function formaterHeure(date) {
    const quand = new Date(date);
    const aujourdhui = new Date();
    const debutJour = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate());
    const joursPasses = Math.floor((debutJour - new Date(quand.getFullYear(), quand.getMonth(), quand.getDate())) / 86400000);

    if (joursPasses <= 0) {
        return String(quand.getHours()).padStart(2, "0") + ":" + String(quand.getMinutes()).padStart(2, "0");
    }
    if (joursPasses === 1) {
        return "Hier";
    }
    if (joursPasses < 7) {
        return JOURS[quand.getDay()];
    }
    return String(quand.getDate()).padStart(2, "0") + "/" + String(quand.getMonth() + 1).padStart(2, "0");
}

/* ---------- Ligne de la base -> message affiché ---------- */
function versMessage(ligne) {
    const message = {
        id: "sb:" + ligne.id,
        sbId: ligne.id,
        auteurId: ligne.auteur_id,
        auteur: ligne.auteur_id === moi ? "Moi" : nomDe(ligne.auteur_id),
        heure: formaterHeure(ligne.cree_le),
        date: ligne.cree_le,
        texte: ligne.texte || "",
        // Message privé lu par le destinataire : ✓✓ violet
        etat: ligne.lu_le ? "lu" : "recu",
        reponseA: ligne.reponse_a,
        luParMoi: Boolean(ligne.lu_le),
        reactions: {}
    };
    if (ligne.image_url) {
        message.image = ligne.image_url;
    }
    if (ligne.audio_url) {
        message.audio = ligne.audio_url;
        message.duree = ligne.duree || 0;
    }
    if (ligne.vue_unique) {
        message.vueUnique = true;
        if (ligne.ouvert_le) {
            Object.assign(message, { ouvert: true, texte: "", image: null, audio: null });
        }
    }
    if (ligne.modifie_le) {
        message.modifie = true;
    }
    if (ligne.supprime) {
        Object.assign(message, { supprime: "tous", texte: "", image: null, audio: null, vueUnique: false });
    }
    MESSAGES_PAR_ID[ligne.id] = message;
    return message;
}

// Message envoyé depuis cette page : on le range aussi par numéro
function indexerMessage(message) {
    message.reactions = message.reactions || {};
    MESSAGES_PAR_ID[message.sbId] = message;
}

// Nom affiché : celui sous lequel je l'ai enregistré, sinon son nom de profil
function nomDe(id) {
    if (CONTACTS[id] && CONTACTS[id].estContact) {
        return CONTACTS[id].nom;
    }
    return (PROFILS[id] || { nom: "Utilisateur" }).nom;
}

// Ajoute une personne à CONTACTS (estContact : elle est dans ma liste)
// enregistrement : { prenom, nom } choisis dans « Nouveau contact »
function preparerContact(id, estContact, enregistrement) {
    const profil = PROFILS[id];
    if (!profil || id === moi) {
        return null;
    }
    if (!CONTACTS[id]) {
        const enLigne = canalPresence ? canalPresence.presenceState() : {};
        CONTACTS[id] = { nom: profil.nom, statut: enLigne[id] ? "en-ligne" : "hors-ligne", messages: [] };
    }
    Object.assign(CONTACTS[id], { nomProfil: profil.nom, pseudo: profil.pseudo, telephone: profil.telephone, photo: profil.photo_url });
    CONTACTS[id].estContact = CONTACTS[id].estContact || estContact;
    if (enregistrement) {
        const nomChoisi = [enregistrement.prenom, enregistrement.nom].filter(Boolean).join(" ").trim();
        CONTACTS[id].nom = nomChoisi || profil.nom;
    }
    return CONTACTS[id];
}

// membresIds : liste des membres d'un groupe privé (null pour un salon public)
function versSalon(salon, membres, membresIds) {
    return {
        nom: salon.nom,
        description: salon.description,
        icone: salon.icone,
        couleur: salon.couleur,
        prive: salon.prive,
        createurId: salon.createur_id,
        membres: membres,
        membresIds: membresIds,
        messages: []
    };
}

// Dans quelle discussion va ce message ? (salon, ou l'autre personne d'un message privé)
function discussionDe(ligne) {
    if (ligne.salon_id) {
        return { type: "salon", cle: ligne.salon_id, discussion: SALONS[ligne.salon_id] };
    }
    const autre = ligne.auteur_id === moi ? ligne.destinataire_id : ligne.auteur_id;
    // Quelqu'un qui n'est pas dans mes contacts peut quand même m'écrire
    return { type: "contact", cle: autre, discussion: CONTACTS[autre] || preparerContact(autre, false) };
}

/* ---------- Chargement initial ---------- */
// Renvoie true si script.js doit être lancé (false = on change de page)
async function chargerDonnees() {
    const { data: { session } } = await sb.auth.getSession();
    const pageApp = document.body.classList.contains("page-app");

    if (!session) {
        localStorage.removeItem("jokko-utilisateur");
        if (pageApp) {
            window.location.replace("index.html");
            return false;
        }
        return true;
    }
    // Déjà connecté sur la page de connexion : direction le menu
    if (!pageApp) {
        window.location.replace("menu.html");
        return false;
    }

    moi = session.user.id;

    const reponses = await Promise.all([
        sb.from("profils").select(CHAMPS_PROFIL).order("nom"),
        sb.from("contacts").select("contact_id, prenom, nom"),
        sb.from("salons").select("*").order("cree_le"),
        sb.from("salon_membres").select("salon_id, membre_id"),
        sb.from("messages").select("*").order("cree_le", { ascending: false }).limit(1000),
        sb.from("reactions").select("*")
    ]);
    const erreur = reponses.find(function (reponse) {
        return reponse.error;
    });
    if (erreur) {
        throw erreur.error;
    }
    const [profils, contacts, salons, membres, messages, reactions] = reponses;

    profils.data.forEach(function (profil) {
        PROFILS[profil.id] = profil;
    });
    // script.js lit l'utilisateur connecté ici (nom dans la barre latérale, profil...)
    localStorage.setItem("jokko-utilisateur", JSON.stringify(PROFILS[moi]));

    contacts.data.forEach(function (contact) {
        preparerContact(contact.contact_id, true, contact);
    });

    // Nombre de membres : tous les inscrits pour un salon public, la liste des membres pour un groupe
    const membresParGroupe = {};
    membres.data.forEach(function (membre) {
        (membresParGroupe[membre.salon_id] = membresParGroupe[membre.salon_id] || []).push(membre.membre_id);
    });
    salons.data.forEach(function (salon) {
        const ids = salon.prive ? membresParGroupe[salon.id] || [] : null;
        SALONS[salon.id] = versSalon(salon, ids ? ids.length : profils.data.length, ids);
    });

    messages.data.reverse().forEach(function (ligne) {
        const { discussion } = discussionDe(ligne);
        if (discussion) {
            discussion.messages.push(versMessage(ligne));
        }
    });

    reactions.data.forEach(function (reaction) {
        const message = MESSAGES_PAR_ID[reaction.message_id];
        if (message) {
            message.reactions[reaction.utilisateur_id] = reaction.emoji;
        }
    });

    ecouterTempsReel();
    return true;
}

/* ---------- Temps réel ---------- */
let canalPresence = null;
const minuteursEcriture = {};

function ecouterTempsReel() {
    // Nouveaux messages et messages supprimés « pour tous »
    sb.channel("messages")
        .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, async function (changement) {
            const ligne = changement.new;
            // Expéditeur inscrit après le chargement de la page : on récupère son profil
            if (!PROFILS[ligne.auteur_id]) {
                const { data } = await sb.from("profils").select(CHAMPS_PROFIL)
                    .eq("id", ligne.auteur_id).single();
                if (data) {
                    PROFILS[data.id] = data;
                }
            }
            const { type, cle, discussion } = discussionDe(ligne);
            if (!discussion) {
                return;
            }

            if (changement.eventType === "INSERT") {
                // Mes propres messages sont déjà affichés au moment de l'envoi
                if (ligne.auteur_id === moi) {
                    return;
                }
                // Il a fini d'écrire puisqu'il vient d'envoyer
                arreterEcriture(type, cle);
                const message = versMessage(ligne);
                discussion.messages.push(message);
                prevenir("message", type, cle, message);
            } else if (changement.eventType === "UPDATE") {
                const message = discussion.messages.find(function (element) {
                    return element.sbId === ligne.id;
                });
                if (!message) {
                    return;
                }
                if (ligne.supprime) {
                    Object.assign(message, { supprime: "tous", texte: "", image: null, audio: null, vueUnique: false, masque: false });
                } else if (ligne.vue_unique && ligne.ouvert_le) {
                    Object.assign(message, { ouvert: true, texte: "", image: null, audio: null });
                } else if (ligne.modifie_le) {
                    Object.assign(message, { texte: ligne.texte || "", modifie: true });
                }
                if (ligne.lu_le && message.auteur === "Moi") {
                    message.etat = "lu";
                }
                prevenir("statut");
            }
        })
        // On m'ajoute à un groupe : il apparaît sans recharger la page
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "salon_membres" }, async function (changement) {
            const { salon_id: salonId, membre_id: membreId } = changement.new;
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
            if (membreId !== moi) {
                return;
            }
            const { data } = await sb.from("salons").select("*").eq("id", salonId).single();
            const { data: lignes } = await sb.from("salon_membres").select("membre_id").eq("salon_id", salonId);
            if (data) {
                const ids = (lignes || []).map(function (ligne) {
                    return ligne.membre_id;
                });
                SALONS[salonId] = versSalon(data, ids.length, ids);
                prevenir("groupe", salonId);
                prevenir("statut");
            }
        })
        // Un membre quitte ou est retiré d'un groupe
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "salon_membres" }, function (changement) {
            const { salon_id: salonId, membre_id: membreId } = changement.old;
            const groupe = SALONS[salonId];
            if (!groupe) {
                return;
            }
            if (membreId === moi) {
                delete SALONS[salonId];
                prevenir("retire", salonId);
            } else if (groupe.membresIds) {
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
                groupe.nom = changement.new.nom;
                prevenir("statut");
            }
        })
        // Réactions ajoutées, changées ou retirées
        .on("postgres_changes", { event: "*", schema: "public", table: "reactions" }, function (changement) {
            const ligne = changement.eventType === "DELETE" ? changement.old : changement.new;
            const message = MESSAGES_PAR_ID[ligne.message_id];
            if (!message || ligne.utilisateur_id === moi) {
                return;
            }
            if (changement.eventType === "DELETE") {
                delete message.reactions[ligne.utilisateur_id];
            } else {
                message.reactions[ligne.utilisateur_id] = ligne.emoji;
            }
            prevenir("statut");
        })
        .subscribe();

    // Qui est en ligne (présence) et qui écrit (diffusion)
    canalPresence = sb.channel("en-ligne", { config: { presence: { key: moi } } });

    canalPresence
        .on("presence", { event: "sync" }, function () {
            const enLigne = canalPresence.presenceState();
            Object.keys(CONTACTS).forEach(function (id) {
                if (CONTACTS[id].statut !== "ecrit") {
                    CONTACTS[id].statut = enLigne[id] ? "en-ligne" : "hors-ligne";
                }
            });
            prevenir("statut");
        })
        .on("broadcast", { event: "ecrit" }, function ({ payload }) {
            // Message privé : seulement si c'est à moi qu'il écrit
            if (payload.type === "contact" && payload.vers !== moi) {
                return;
            }
            const cle = payload.type === "contact" ? payload.de : payload.vers;
            const discussion = payload.type === "contact" ? CONTACTS[cle] : SALONS[cle];
            if (!discussion) {
                return;
            }

            if (payload.type === "contact") {
                discussion.statut = "ecrit";
            } else {
                discussion.ecritPar = (PROFILS[payload.de] || { nom: "Quelqu'un" }).nom;
            }
            prevenir("statut");

            // Sans nouvelle frappe pendant 4 secondes, l'indicateur disparaît
            clearTimeout(minuteursEcriture[payload.type + cle]);
            minuteursEcriture[payload.type + cle] = setTimeout(function () {
                arreterEcriture(payload.type, cle);
                prevenir("statut");
            }, 4000);
        })
        .subscribe(function (etat) {
            if (etat === "SUBSCRIBED") {
                canalPresence.track({ depuis: new Date().toISOString() });
            }
        });
}

function arreterEcriture(type, cle) {
    clearTimeout(minuteursEcriture[type + cle]);
    if (type === "contact" && CONTACTS[cle]) {
        const enLigne = canalPresence ? canalPresence.presenceState() : {};
        CONTACTS[cle].statut = enLigne[cle] ? "en-ligne" : "hors-ligne";
    } else if (type === "salon" && SALONS[cle]) {
        SALONS[cle].ecritPar = null;
    }
}

// Prévient les autres que j'écris (au plus une fois toutes les 2 secondes)
let derniereFrappe = 0;

function signalerEcriture(type, cle) {
    if (!canalPresence || Date.now() - derniereFrappe < 2000) {
        return;
    }
    derniereFrappe = Date.now();
    canalPresence.send({ type: "broadcast", event: "ecrit", payload: { type: type, de: moi, vers: cle } });
}

/* ---------- Envoi ---------- */
// Les images et les vocaux (« data URL ») vont dans le stockage de fichiers
async function televerser(dataUrl, extension) {
    const fichier = await (await fetch(dataUrl)).blob();
    const chemin = moi + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + extension;
    const { error } = await sb.storage.from("fichiers").upload(chemin, fichier, { contentType: fichier.type });
    if (error) {
        throw error;
    }
    return sb.storage.from("fichiers").getPublicUrl(chemin).data.publicUrl;
}

// contenu : { texte, image, audio, duree, vueUnique } -> renvoie la ligne enregistrée
async function enregistrerMessage(type, cle, contenu) {
    const ligne = {
        auteur_id: moi,
        texte: contenu.texte || null,
        duree: contenu.duree || null,
        vue_unique: Boolean(contenu.vueUnique),
        reponse_a: contenu.reponseA || null
    };
    ligne[type === "salon" ? "salon_id" : "destinataire_id"] = cle;

    if (contenu.image) {
        ligne.image_url = await televerser(contenu.image, "jpg");
    }
    if (contenu.audio) {
        ligne.audio_url = await televerser(contenu.audio, "webm");
    }

    const { data, error } = await sb.from("messages").insert(ligne).select().single();
    if (error) {
        throw error;
    }
    return data;
}

// Ma réaction sur un message (emoji = null pour la retirer)
async function reagir(sbId, emoji) {
    const requete = emoji
        ? sb.from("reactions").upsert({ message_id: sbId, utilisateur_id: moi, emoji: emoji }, { onConflict: "message_id,utilisateur_id" })
        : sb.from("reactions").delete().eq("message_id", sbId).eq("utilisateur_id", moi);
    const { error } = await requete;
    if (error) {
        throw error;
    }
}

// J'ai lu les messages de cette personne (accusés de lecture)
async function marquerLus(expediteurId) {
    await sb.rpc("marquer_lus", { expediteur: expediteurId });
}

// J'ai ouvert un message à vue unique : il est effacé pour tout le monde
async function ouvrirVueUniqueBase(sbId) {
    await sb.rpc("ouvrir_vue_unique", { message: sbId });
}

/* ---------- Groupes ---------- */
async function renommerGroupe(salonId, nom) {
    const { error } = await sb.from("salons").update({ nom: nom }).eq("id", salonId);
    if (error) {
        throw error;
    }
    SALONS[salonId].nom = nom;
}

async function ajouterMembres(salonId, ids) {
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
        .update({ texte: texte, modifie_le: new Date().toISOString() })
        .eq("id", sbId);
    if (error) {
        throw error;
    }
}

async function supprimerPourTous(sbId) {
    const { error } = await sb.from("messages")
        .update({ supprime: true, texte: null, image_url: null, audio_url: null })
        .eq("id", sbId);
    if (error) {
        throw error;
    }
}

/* ---------- Comptes ---------- */
async function inscrire(email, motDePasse, infos) {
    const { data, error } = await sb.auth.signUp({ email: email, password: motDePasse, options: { data: infos } });
    if (error) {
        throw error;
    }
    return data.session; // null si Supabase demande de confirmer l'email
}

async function connecter(email, motDePasse) {
    const { error } = await sb.auth.signInWithPassword({ email: email, password: motDePasse });
    if (error) {
        throw error;
    }
}

async function deconnecter() {
    await sb.auth.signOut();
    localStorage.removeItem("jokko-utilisateur");
}

async function mettreAJourProfil(champs) {
    const { error } = await sb.from("profils").update(champs).eq("id", moi);
    if (error) {
        throw error;
    }
}

// Ajoute quelqu'un à ma liste de contacts (ou le renomme s'il y est déjà)
async function ajouterContact(id, enregistrement) {
    const noms = { prenom: enregistrement.prenom || null, nom: enregistrement.nom || null };
    const { error } = await sb.from("contacts")
        .upsert(Object.assign({ proprietaire_id: moi, contact_id: id }, noms), { onConflict: "proprietaire_id,contact_id" });
    if (error) {
        throw error;
    }
    return preparerContact(id, true, noms);
}

// Groupe privé : un salon « prive » + ses membres (moi compris)
async function creerGroupe(nom, membresIds) {
    const groupe = await creerSalon({ nom: nom, prive: true, icone: "fa-user-group", couleur: "#0ea5e9" });
    const lignes = [moi].concat(membresIds).map(function (id) {
        return { salon_id: groupe.id, membre_id: id };
    });
    const { error } = await sb.from("salon_membres").insert(lignes);
    if (error) {
        throw error;
    }
    return groupe;
}

async function creerSalon(salon) {
    const { data, error } = await sb.from("salons")
        .insert(Object.assign({ createur_id: moi }, salon))
        .select().single();
    if (error) {
        throw error;
    }
    return data;
}

/* ---------- Démarrage ---------- */
// script.js n'est lancé qu'une fois les données prêtes
chargerDonnees().catch(function (erreur) {
    console.error("Supabase :", erreur);
    alert("Impossible de charger les données. Vérifiez votre connexion Internet.");
    return true;
}).then(function (lancer) {
    if (!lancer) {
        return;
    }
    const script = document.createElement("script");
    script.src = "js/script.js";
    document.body.appendChild(script);
});
