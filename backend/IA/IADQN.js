// Dossier: ia_dqn/IADQN.js
const tf = require('@tensorflow/tfjs-node');
//inutilisable par des gpu amd: 
//const tf = require('@tensorflow/tfjs-node-gpu');

class IADQN {
    constructor(stateSize, actionSize) {
        if (IADQN.instance) {
            return IADQN.instance; // Retourner l'instance existante
        }
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
        IADQN.instance = this; // Définir l'instance unique
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
        // Générer un tableau de `this.actionSize - 1` booléens avec 30% de probabilité pour `true`
        const randomBooleans = Array.from({ length: this.actionSize - 1 }, () => Math.random() < 0.03);
        
        // Ajouter un float entre -1 et 1 comme dernière valeur
        const randomFloat = Math.random() * 2 - 1;
    
        // Combiner les deux pour former le tableau final
        const randomActionIndex = [...randomBooleans, randomFloat];
        
        //console.log("Random Action Index:", randomActionIndex);
        return this._actionToDict(randomActionIndex);
    }
      // Sinon, choisir l'action avec la plus grande valeur Q (exploitation)
      const stateTensor = tf.tensor2d([state]);
      const qValues = await this.model.predict(stateTensor).array();
      // Transformer qValues en tableau de booléens avec traitement spécifique pour la dernière valeur
        const bestActionIndex = qValues[0].map((value, index) => {
            if (index === qValues[0].length - 1) {
                // Si c'est la dernière valeur, on l'ajoute telle quelle
                return value;
            }
            // Sinon, ajouter true ou false selon la condition
            return value > 0;
        });

        //console.log("Transformed bestActionIndex:", bestActionIndex);

      return this._actionToDict(bestActionIndex);
  }
  
  // Convertir un tableau d'actions en un dictionnaire d'actions
    _actionToDict(actionIndex) {
        // Créer un dictionnaire avec toutes les actions initialisées
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

        // Transformer le tableau en valeurs pour le dictionnaire
        const actionKeys = ['z', 'q', 's', 'd', 'esp', 'a', 'e', 'attack', 'shoot'];
        actionKeys.forEach((key, index) => {
            if (index < actionIndex.length - 1) {
                actionDict[key] = actionIndex[index]; // Copier les booléens
            }
        });

        // La dernière valeur est affectée à `rotation`
        actionDict.rotation = actionIndex[actionIndex.length - 1];

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
            //console.log(this.memory.length,"\r");
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