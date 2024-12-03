require('dotenv').config();

// /database/config/postgresql.js

const { Pool } = require('pg'); // Importation de Pool de pg pour gérer les connexions à PostgreSQL

// Configuration de la connexion PostgreSQL
const pool = new Pool({
    user: process.env.PGS_USER,  // Utilisation de la variable d'environnement pour l'utilisateur PostgreSQL
    host: process.env.PGS_HOST,          // Utilisation de la variable d'environnement pour l'hôte PostgreSQL
    database: process.env.PGS_DB,  // Utilisation de la variable d'environnement pour la base de données
    password: process.env.PGS_PSW,    // Utilisation de la variable d'environnement pour le mot de passe
    port: process.env.PGS_PORT,  // Utilisation de la variable d'environnement pour le port PostgreSQL
    ssl: false,  // Mettre à true si vous avez une connexion SSL pour la production
  });

// Fonction pour exécuter une requête SQL
const query = async (text, params) => {
  try {
    const res = await pool.query(text, params);  // Exécute la requête
    return res.rows;  // Retourne les résultats de la requête
  } catch (err) {
    console.error('Erreur de requête PostgreSQL:', err.stack); // Affiche une erreur si la requête échoue
    throw err;  // Lancer une exception pour propager l'erreur
  }
};

// Ajouter un joueur
async function addPlayer(username) {
  const result = await pool.query(
      `INSERT INTO players (username) VALUES ($1) RETURNING *`,
      [username]
  );
  return result.rows[0];
}
// Récupérer les joueurs
async function getPlayers() {
  const result = await pool.query(`SELECT * FROM players`);
  return result.rows;
}
// Ajouter un mécha
async function addMecha(player_id) {
  const result = await pool.query(
      `INSERT INTO mechas (player_id) VALUES ($1) RETURNING *`,
      [player_id]
  );
  return result.rows[0];
}


    
// Fonction pour fermer la connexion au pool de bases de données
const closeConnection = () => {
  pool.end();  // Ferme toutes les connexions ouvertes au pool PostgreSQL
};

module.exports = {
  query,         // Expose la fonction query pour exécuter des requêtes
  closeConnection, // Expose la fonction pour fermer les connexions
  addMecha,  
};
