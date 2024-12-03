// database/schemas/mechaSchema.js
const mongoose = require('mongoose');

const mechaSchema = new mongoose.Schema({
  name: { type: String, required: true },
  position: { x: Number, y: Number },
  energy: { type: Number, default: 100 },
  isAlive: { type: Boolean, default: true },
  actions: {
    shoot: { type: Boolean, default: false },
    sword: { type: Boolean, default: false },
  },
  // D'autres champs selon la logique du jeu
});

const Mecha = mongoose.model('Mecha', mechaSchema);

module.exports = Mecha;
