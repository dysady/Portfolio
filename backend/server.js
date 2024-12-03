// server.js

const { server } = require('./app'); // Importer le serveur configuré dans app.js


// Définir le port d'écoute
const PORT = process.env.PORT || 3000;

// Démarrer le serveur
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

