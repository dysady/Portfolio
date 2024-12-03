// usersModel.js
const mongoose = require('mongoose');

// Définir le schéma du document utilisateur
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  age: {
    type: Number,
    required: true,
  },
});

// Créer un modèle basé sur ce schéma
const User = mongoose.model('User', userSchema);

module.exports = User;
