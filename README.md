# JokkoChat

## Description

JokkoChat est une application de messagerie instantanée Web. Les utilisateurs créent un compte, ajoutent des contacts, échangent des messages privés en temps réel et discutent dans des salons publics ou des groupes privés.

## Lancer l'application

Aucune installation n'est nécessaire : il suffit d'un navigateur récent (Chrome, Firefox, Edge ou Safari) et d'une connexion Internet.

1. Ouvrir le fichier `index.html` dans le navigateur.
2. Créer un compte avec l'onglet **S'inscrire**, puis se connecter.
3. Pour discuter, il faut au moins deux comptes : on peut en créer un second dans une fenêtre de navigation privée.

Les données (comptes, messages, images) sont enregistrées en ligne avec [Supabase](https://supabase.com) : chaque utilisateur retrouve ses discussions sur n'importe quel ordinateur.

## Fonctionnalités principales

- **Inscription et connexion** des utilisateurs (vrais comptes, mots de passe chiffrés)
- **Gestion des contacts** : liste personnelle, ajout par nom de profil (@), par numéro de téléphone (avec choix du pays et indicatif) ou par **code QR**
- **Conversations privées** en temps réel
- **Salons de discussion** publics et **groupes privés** (créer, renommer, ajouter ou retirer des membres, quitter)
- **Envoi et réception de messages** : texte, émojis, images et messages vocaux
- **Affichage de l'heure** des messages
- **Statut en ligne / hors ligne** des contacts
- **Indicateur « En train d'écrire... »**
- **Partage d'images**
- **Notifications** visuelles et sonores : son, cloche de notifications, compteur dans l'onglet, badges de messages non lus

### Autour des messages

- Répondre à un message (citation), réagir avec un émoji, modifier un message envoyé
- Accusés de lecture (envoyé ✓, reçu ✓✓, lu ✓✓ violet), désactivables dans les paramètres
- Messages à vue unique et messages éphémères
- Supprimer pour moi ou pour tout le monde, masquer, enregistrer un message
- Sélectionner plusieurs messages ou discussions pour les copier, enregistrer, supprimer, mettre en sourdine…
- Trier les discussions et les ranger dans des listes (Non lues, Favoris, listes personnelles)

### Profil

- Photo de profil, nom de profil (@), numéro de téléphone, présentation
- Thème clair ou sombre

## Fonctionnalité supplémentaire : résumé automatique

Le bouton **Résumer** d'une discussion produit un résumé de la conversation : les points clés (dates, rendez-vous, échéances) et les questions posées. Les messages longs ont aussi un bouton **Résumer ce message**.

Le résumé est calculé directement dans le navigateur (`js/resume.js`) : les phrases sont notées selon les mots importants qu'elles contiennent et la présence d'informations utiles (jours, heures, examens…), puis les meilleures sont gardées dans l'ordre de la conversation.

## Organisation du code

| Fichier | Rôle |
|---|---|
| `*.html` | Les pages : connexion, menu, messages, salons, contacts, profil, paramètres… |
| `css/style.css` | Le style de toutes les pages (thème clair et sombre, version mobile) |
| `js/donnees.js` | Le lien avec Supabase : connexion, chargement des données, temps réel, envoi des messages et des fichiers |
| `js/script.js` | L'affichage et les interactions de chaque page |
| `js/resume.js` | Le résumé automatique |
| `js/theme.js` | Applique le thème choisi avant l'affichage de la page |
| `supabase/` | Scripts SQL de la base de données (tables, règles de sécurité) et outil pour les appliquer |

### Base de données (Supabase)

Les tables : `profils`, `contacts`, `salons`, `salon_membres`, `messages`, `reactions`. Les images et les vocaux sont dans le stockage de fichiers.

La sécurité est assurée par les règles **RLS** (Row Level Security) de la base : par exemple, un message privé n'est lisible que par son auteur et son destinataire, et un groupe privé seulement par ses membres. La clé présente dans `js/donnees.js` est la clé publique prévue pour le navigateur ; elle ne donne pas d'autres droits que ces règles.

Pour recréer la base : exécuter `supabase/schema.sql`, puis les fichiers `supabase/migration-*.sql` dans l'ordre, avec `node supabase/outil/appliquer.js <fichier.sql>` (le mot de passe de la base est demandé).

## Technologies utilisées

- HTML5
- CSS3
- JavaScript
- Supabase (base de données PostgreSQL, authentification, temps réel, stockage de fichiers)
- Git et GitHub

Librairies chargées depuis un CDN : Font Awesome (icônes), supabase-js, qrcode-generator et jsQR (codes QR).

## Équipe

- Abdou Kader Diene Diop
- Aissata Diongue
