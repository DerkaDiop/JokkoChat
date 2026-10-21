/* =========================================================
   Envoie un fichier SQL à la base, sans passer par le site.
   Lancer depuis le dossier JokkoChat :
     node supabase/outil/appliquer.js                         (supabase/schema.sql)
     node supabase/outil/appliquer.js supabase/autre-fichier.sql
   Seul le mot de passe de la base est demandé ; il n'est enregistré nulle part.
   ========================================================= */
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { Client } = require("pg");

function demander(question, cache) {
    return new Promise(function (resoudre) {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
        if (cache) {
            // N'affiche pas les caractères du mot de passe
            rl._writeToOutput = function (texte) {
                if (texte.includes(question)) {
                    process.stdout.write(texte);
                }
            };
        }
        rl.question(question, function (reponse) {
            rl.close();
            if (cache) {
                process.stdout.write("\n");
            }
            resoudre(reponse.trim());
        });
    });
}

async function principal() {
    const motDePasse = await demander("Mot de passe de la base (invisible) : ", true);

    // Connexion « Session pooler » du projet (Connect > Direct dans Supabase)
    const client = new Client({
        host: "aws-1-us-west-2.pooler.supabase.com",
        port: 5432,
        user: "postgres.mmkhycwynwkcteyjzzgp",
        password: motDePasse,
        database: "postgres",
        ssl: { rejectUnauthorized: false }
    });

    const fichier = process.argv[2] || path.join(__dirname, "..", "schema.sql");
    const sql = fs.readFileSync(fichier, "utf8");

    await client.connect();
    console.log("Connecté. Création des tables...");
    try {
        await client.query(sql);
        console.log("✅ Terminé : " + path.basename(fichier) + " appliqué.");
    } finally {
        await client.end();
    }
}

principal().catch(function (erreur) {
    console.error("❌ Erreur :", erreur.message);
    process.exit(1);
});
