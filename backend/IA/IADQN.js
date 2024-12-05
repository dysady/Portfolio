// Dossier: ia_dqn/IADQN.js
const tf = require('@tensorflow/tfjs-node');
//const tf = require('@tensorflow/tfjs-node-gpu');

class IADQN {
    constructor(stateSize, actionSize) {
        this.stateSize = stateSize;  // Taille de l'état d'entrée
        this.actionSize = actionSize;  // Nombre d'actions possibles
        this.memory = [];  // Mémoire pour les expériences
        this.maxMemorySize = 10000;  // Taille maximale de la mémoire
        this.gamma = 0.95;  // Facteur de discount
        this.epsilon = 1.0;  // Écart d'exploration initiale
        this.epsilonMin = 0.01;  // Écart minimum
        this.epsilonDecay = 0.995;  // Décroissance de l'exploration
        this.learningRate = 0.001;  // Taux d'apprentissage

        // Initialiser le réseau neuronal
        this.model = this._buildModel();
    }

    _buildModel() {
        const model = tf.sequential();
        model.add(tf.layers.dense({ inputShape: [this.stateSize], units: 24, activation: 'relu' }));
        model.add(tf.layers.dense({ units: 24, activation: 'relu' }));
        model.add(tf.layers.dense({ units: this.actionSize, activation: 'linear' }));
        model.compile({ optimizer: tf.train.adam(this.learningRate), loss: 'meanSquaredError' });
        return model;
    }

    async act(state) {
      // Si l'exploration est activée (selon epsilon), choisir une action aléatoire
      if (Math.random() <= this.epsilon) {
          const randomActionIndex = Math.floor(Math.random() * this.actionSize);
          //console.log(randomActionIndex);
          return this._actionToDict(randomActionIndex);
      }
      // Sinon, choisir l'action avec la plus grande valeur Q (exploitation)
      const stateTensor = tf.tensor2d([state]);
      const qValues = await this.model.predict(stateTensor).array();
      const bestActionIndex = qValues[0].indexOf(Math.max(...qValues[0]));
      console.log(bestActionIndex);
      return this._actionToDict(bestActionIndex);
  }
  
  // Convertir l'index de l'action en un dictionnaire d'actions
  _actionToDict(actionIndex) {
      // Créer un dictionnaire avec toutes les actions à 'false'
      const actionDict = {
          z: false,
          q: false,
          s: false,
          d: false,
          esp: false,
          a: false,
          e: false,
          attack: false,
          shoot: false,
          rotation: 0.0,
      };
  
      // Activer l'action correspondante en fonction de l'index choisi
      switch (actionIndex) {
          case 0: actionDict.z = true; break;
          case 1: actionDict.q = true; break;
          case 2: actionDict.s = true; break;
          case 3: actionDict.d = true; break;
          case 4: actionDict.esp = true; break;
          case 5: actionDict.a = true; break;
          case 6: actionDict.e = true; break;
          case 7: actionDict.attack = true; break;
          case 8: actionDict.shoot = true; break;
          case 9: actionDict.rotation = Math.random() * 2 - 1; break; // Rotation aléatoire entre -1 et 1
          default: break;
      }
  
      return actionDict;
  }

    // Stocker une expérience
    storeExperience(state, action, reward, nextState, done) {
      //console.log(nextState);
        if (this.memory.length >= this.maxMemorySize) {
            this.memory.shift();  // Retirer la plus ancienne expérience
        }
        this.memory.push({ state, action, reward, nextState, done });
    }

    // Entraîner le modèle à partir de la mémoire
    async train(batchSize = 32) {
        if (this.memory.length < batchSize) {
            return;
        }
        const batch = this._sampleBatch(batchSize);
        const states = batch.map(exp => exp.state);
        const nextStates = batch.map(exp => exp.nextState);

        const qValuesNext = await this.model.predict(tf.tensor2d(nextStates)).array();

        const targets = batch.map((exp, i) => {
            let target = exp.reward;
            if (!exp.done) {
                target += this.gamma * Math.max(...qValuesNext[i]);
            }
            const qUpdate = [...Array(this.actionSize).fill(0)];
            qUpdate[exp.action] = target;
            return qUpdate;
        });

        await this.model.fit(tf.tensor2d(states), tf.tensor2d(targets), { epochs: 1, verbose: 0 });

        // Réduire epsilon pour diminuer l'exploration au fil du temps
        if (this.epsilon > this.epsilonMin) {
            this.epsilon *= this.epsilonDecay;
        }
    }

    // Échantillonner un batch aléatoire
    _sampleBatch(batchSize) {
        const indices = [...Array(this.memory.length).keys()];
        indices.sort(() => Math.random() - 0.5);  // Mélanger aléatoirement
        return indices.slice(0, batchSize).map(i => this.memory[i]);
    }
}

module.exports = IADQN;
