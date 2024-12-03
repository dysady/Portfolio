require('dotenv').config();

const mongoose = require('mongoose');

const mongoURI = process.env.MONGO_URI;  // Utiliser la variable d'environnement

// Fonction de connexion à MongoDB
const connectMongoDB = async () => {
  try {
    await mongoose.connect(mongoURI, {
    });
    console.log('Connecté à MongoDB avec succès!');
  } catch (err) {
    console.error('Erreur de connexion à MongoDB:', err);
    process.exit(1);  // Si la connexion échoue, arrêtez le serveur
  }
};

module.exports = connectMongoDB;
