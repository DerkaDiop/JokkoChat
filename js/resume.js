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

const MOTS_VIDES = new Set([   // mots trop courants pour être importants (sans accents)
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
    return texte.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");   // NFD sépare les accents des lettres, puis on supprime les accents
}

// Découpe un texte en phrases
function decouperPhrases(texte) {
    return texte
        .split(/(?<=[.!?…])\s+/)   // coupe après . ! ? ou … suivis d'un espace
        .map(function (phrase) { return phrase.trim(); })   // enlève les espaces autour
        .filter(function (phrase) { return phrase.length > 0; });   // ignore les morceaux vides
}

// Garde les mots importants d'une phrase (sans les mots vides)
function motsImportants(phrase) {
    const mots = normaliserTexte(phrase).match(/[a-z0-9]+/g) || [];   // tous les mots, en minuscules et sans accents
    return mots.filter(function (mot) {
        return mot.length > 2 && !MOTS_VIDES.has(mot);   // au moins 3 lettres et pas un mot vide
    });
}

// La phrase contient-elle une information utile ?
function contientInfo(phrase) {
    return REGEX_INFO.test(normaliserTexte(phrase));   // true si la phrase contient un jour, une heure, « examen »...
}

// Compte les mots importants de toutes les phrases
function compterMots(phrases) {
    const frequences = {};   // { mot: nombre d'apparitions }
    phrases.forEach(function (phrase) {
        motsImportants(phrase).forEach(function (mot) {
            frequences[mot] = (frequences[mot] || 0) + 1;   // +1 à chaque apparition
        });
    });
    return frequences;
}

// Note d'une phrase : plus elle contient de mots fréquents, plus elle est importante
function scorerPhrase(phrase, frequences) {
    const mots = motsImportants(phrase);   // les mots importants de la phrase
    if (mots.length === 0) {   // aucun mot important : note 0
        return 0;
    }
    const total = mots.reduce(function (somme, mot) {   // somme des fréquences des mots de la phrase
        return somme + frequences[mot];
    }, 0);
    const bonus = contientInfo(phrase) ? 1.5 : 1;   // +50 % si la phrase contient une date ou une heure
    return (total / Math.sqrt(mots.length)) * bonus;   // divisé par √(nombre de mots) pour ne pas avantager les phrases longues
}

// Garde les « nombre » meilleures phrases, dans l'ordre d'origine
function meilleuresPhrases(phrases, nombre) {
    const frequences = compterMots(phrases);   // fréquence de chaque mot dans tout le texte

    return phrases
        .map(function (phrase, position) {   // on note chaque phrase en gardant sa position
            return { phrase: phrase, position: position, score: scorerPhrase(phrase, frequences) };
        })
        .filter(function (element) { return element.score > 0; })   // on enlève les phrases sans intérêt
        .sort(function (a, b) { return b.score - a.score; })   // de la meilleure note à la moins bonne
        .slice(0, nombre)   // on garde les « nombre » premières
        .sort(function (a, b) { return a.position - b.position; });   // on les remet dans l'ordre du texte
}

/* ---------- Résumé d'un seul message (message long) ---------- */
function resumerTexte(texte, nombrePhrases) {
    const phrases = decouperPhrases(texte);   // le message découpé en phrases
    if (phrases.length <= nombrePhrases) {   // déjà assez court : on le garde tel quel
        return texte;
    }
    return meilleuresPhrases(phrases, nombrePhrases)   // les meilleures phrases...
        .map(function (element) { return element.phrase; })
        .join(" ");   // ...recollées en un seul texte
}

/* ---------- Résumé d'une conversation entière ----------
   Retourne un objet que la page affiche :
   { nombreMessages, nombreImages, nombreVocaux, participants, debut, fin,
     pointsCles, questions, aRetenir } */
function resumerConversation(messages) {
    const nomAffiche = function (auteur) { return auteur === "Moi" ? "Vous" : auteur; };   // « Moi » s'affiche « Vous »

    // Toutes les phrases, avec leur auteur
    const phrases = [];
    // Chaque message est découpé en phrases
    messages.forEach(function (message) {
        if (message.texte) {   // on ignore les photos et vocaux sans texte
            decouperPhrases(message.texte).forEach(function (phrase) {
                phrases.push({ auteur: nomAffiche(message.auteur), phrase: phrase });
            });
        }
    });

    const participants = [];
    // Liste des personnes qui ont parlé
    messages.forEach(function (message) {
        const nom = nomAffiche(message.auteur);
        if (!participants.includes(nom)) {   // chaque personne n'est comptée qu'une fois
            participants.push(nom);
        }
    });

    // Points clés : les 3 phrases les plus importantes (au moins 2 mots importants)
    const phrasesUtiles = phrases.filter(function (element) {
        return motsImportants(element.phrase).length >= 2;   // au moins 2 mots importants
    });
    const pointsCles = meilleuresPhrases(phrasesUtiles.map(function (e) { return e.phrase; }), 3)   // les 3 meilleures phrases...
        .map(function (element) { return phrasesUtiles[element.position]; });   // ...avec leur auteur

    const dejaCites = pointsCles.map(function (element) { return element.phrase; });   // pour ne pas répéter une phrase deux fois

    // Questions posées par les autres participants (les 3 dernières)
    const questions = phrases
        .filter(function (element) {
            return element.auteur !== "Vous" && element.phrase.endsWith("?") && !dejaCites.includes(element.phrase);   // phrases d'un autre qui finissent par « ? »
        })
        .slice(-3);   // les 3 dernières

    // Dates, heures et échéances qui ne sont pas déjà citées plus haut
    questions.forEach(function (element) {
        dejaCites.push(element.phrase);
    });
    const aRetenir = phrases
        .filter(function (element) {
            return contientInfo(element.phrase) && !dejaCites.includes(element.phrase);   // contient une date, une heure... pas encore citée
        })
        .slice(-4);   // les 4 dernières

    return {
        nombreMessages: messages.length,
        nombreImages: messages.filter(function (message) { return message.image; }).length,   // nombre de photos
        nombreVocaux: messages.filter(function (message) { return message.audio; }).length,   // nombre de vocaux
        participants: participants,
        debut: messages.length ? messages[0].heure : "",   // heure du premier message
        fin: messages.length ? messages[messages.length - 1].heure : "",   // heure du dernier message
        pointsCles: pointsCles,
        questions: questions,
        aRetenir: aRetenir
    };
}
