/* =========================================================
   JokkoChat - Résumé automatique (fonctionnalité supplémentaire)

   Méthode « extractive » : au lieu d'écrire de nouvelles phrases,
   on garde les phrases les plus importantes du texte.
   1. On découpe le texte en phrases.
   2. On compte combien de fois chaque mot important apparaît
      (on ignore les « mots vides » comme le, de, et, je...).
   3. Une phrase qui contient des mots fréquents obtient un bon score.
      Une phrase avec une date, une heure ou une échéance gagne un bonus.
   4. On garde les meilleures phrases, dans leur ordre d'origine.

   Tout se passe dans le navigateur. Plus tard, on pourra remplacer
   ce calcul par un service externe sans changer l'interface.
   ========================================================= */

const MOTS_VIDES = new Set([
    "les", "des", "une", "est", "son", "sa", "ses", "mon", "mes", "ton", "tes",
    "nous", "vous", "ils", "elle", "elles", "lui", "leur", "leurs", "eux",
    "que", "qui", "quoi", "dont", "pour", "par", "sur", "sous", "dans", "avec", "sans",
    "mais", "donc", "car", "pas", "plus", "moins", "tres", "trop", "bien", "aussi",
    "tout", "tous", "toute", "toutes", "cette", "ces", "cet", "ceci", "cela",
    "suis", "es", "sommes", "etes", "sont", "etait", "ete", "etre",
    "ai", "as", "avons", "avez", "ont", "avoir", "fait", "faire",
    "comme", "quand", "alors", "encore", "deja", "ici", "oui", "non", "ok",
    "salut", "bonjour", "merci", "moi", "toi", "the", "and"
]);

// Repère les informations utiles : jours, heures, échéances...
const REGEX_INFO = /\b(demain|ce soir|aujourd'?hui|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|semaine prochaine|examen|rendez-vous|rdv|\d{1,2} ?h ?\d{0,2})\b/;

// Minuscules et sans accents : « Études » -> « etudes »
function normaliserTexte(texte) {
    return texte.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function decouperPhrases(texte) {
    return texte
        .split(/(?<=[.!?…])\s+/)
        .map(function (phrase) { return phrase.trim(); })
        .filter(function (phrase) { return phrase.length > 0; });
}

function motsImportants(phrase) {
    const mots = normaliserTexte(phrase).match(/[a-z0-9]+/g) || [];
    return mots.filter(function (mot) {
        return mot.length > 2 && !MOTS_VIDES.has(mot);
    });
}

function contientInfo(phrase) {
    return REGEX_INFO.test(normaliserTexte(phrase));
}

// Compte les mots importants de toutes les phrases
function compterMots(phrases) {
    const frequences = {};
    phrases.forEach(function (phrase) {
        motsImportants(phrase).forEach(function (mot) {
            frequences[mot] = (frequences[mot] || 0) + 1;
        });
    });
    return frequences;
}

function scorerPhrase(phrase, frequences) {
    const mots = motsImportants(phrase);
    if (mots.length === 0) {
        return 0;
    }
    const total = mots.reduce(function (somme, mot) {
        return somme + frequences[mot];
    }, 0);
    const bonus = contientInfo(phrase) ? 1.5 : 1;
    return (total / Math.sqrt(mots.length)) * bonus;
}

// Garde les « nombre » meilleures phrases, dans l'ordre d'origine
function meilleuresPhrases(phrases, nombre) {
    const frequences = compterMots(phrases);

    return phrases
        .map(function (phrase, position) {
            return { phrase: phrase, position: position, score: scorerPhrase(phrase, frequences) };
        })
        .filter(function (element) { return element.score > 0; })
        .sort(function (a, b) { return b.score - a.score; })
        .slice(0, nombre)
        .sort(function (a, b) { return a.position - b.position; });
}

/* ---------- Résumé d'un seul message (message long) ---------- */
function resumerTexte(texte, nombrePhrases) {
    const phrases = decouperPhrases(texte);
    if (phrases.length <= nombrePhrases) {
        return texte;
    }
    return meilleuresPhrases(phrases, nombrePhrases)
        .map(function (element) { return element.phrase; })
        .join(" ");
}

/* ---------- Résumé d'une conversation entière ----------
   Retourne un objet que la page affiche :
   { nombreMessages, nombreImages, nombreVocaux, participants, debut, fin,
     pointsCles, questions, aRetenir } */
function resumerConversation(messages) {
    const nomAffiche = function (auteur) { return auteur === "Moi" ? "Vous" : auteur; };

    // Toutes les phrases, avec leur auteur
    const phrases = [];
    messages.forEach(function (message) {
        if (message.texte) {
            decouperPhrases(message.texte).forEach(function (phrase) {
                phrases.push({ auteur: nomAffiche(message.auteur), phrase: phrase });
            });
        }
    });

    const participants = [];
    messages.forEach(function (message) {
        const nom = nomAffiche(message.auteur);
        if (!participants.includes(nom)) {
            participants.push(nom);
        }
    });

    // Points clés : les 3 phrases les plus importantes (au moins 2 mots importants)
    const phrasesUtiles = phrases.filter(function (element) {
        return motsImportants(element.phrase).length >= 2;
    });
    const pointsCles = meilleuresPhrases(phrasesUtiles.map(function (e) { return e.phrase; }), 3)
        .map(function (element) { return phrasesUtiles[element.position]; });

    const dejaCites = pointsCles.map(function (element) { return element.phrase; });

    // Questions posées par les autres participants (les 3 dernières)
    const questions = phrases
        .filter(function (element) {
            return element.auteur !== "Vous" && element.phrase.endsWith("?") && !dejaCites.includes(element.phrase);
        })
        .slice(-3);

    // Dates, heures et échéances qui ne sont pas déjà citées plus haut
    questions.forEach(function (element) {
        dejaCites.push(element.phrase);
    });
    const aRetenir = phrases
        .filter(function (element) {
            return contientInfo(element.phrase) && !dejaCites.includes(element.phrase);
        })
        .slice(-4);

    return {
        nombreMessages: messages.length,
        nombreImages: messages.filter(function (message) { return message.image; }).length,
        nombreVocaux: messages.filter(function (message) { return message.audio; }).length,
        participants: participants,
        debut: messages.length ? messages[0].heure : "",
        fin: messages.length ? messages[messages.length - 1].heure : "",
        pointsCles: pointsCles,
        questions: questions,
        aRetenir: aRetenir
    };
}
