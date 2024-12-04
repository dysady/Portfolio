class IADQN{
    constructor() {
        // Initialisation des paramètres pour l'IA renforcée
        const tf = require('@tensorflow/tfjs');
    }

    buildState(gameState) {
        let mecha = gameState.mecha;
      
        // Informations du mecha
        let state = [
          mecha.position.x / 50,   // Position normalisée
          mecha.position.z / 50,   // Position normalisée
          mecha.health / 100,      // Santé normalisée
          mecha.energie / 100,     // Énergie normalisée
          mecha.cdAttack / 500,     // Cooldown d'attaque normalisé
          mecha.cdShoot / 100       // Cooldown de tir normalisé
        ];
      
        // Ajouter les caractéristiques des ennemis proches
        gameState.near.slice(0, 6).forEach(enemy => {
          let dx = enemy.position.x - mecha.position.x;
          let dz = enemy.position.z - mecha.position.z;
          let distance = Math.sqrt(dx * dx + dz * dz);
          let angle = Math.atan2(dz, dx);
      
          state.push(distance / 50);
          state.push(angle / Math.PI);
          state.push(enemy.health / 100);  // Santé de l'ennemi
        });
      
        // Ajouter les caractéristiques des projectiles proches
        gameState.bullets.slice(0, 30).forEach(bullet => {
          let dx = bullet.x - mecha.position.x;
          let dz = bullet.z - mecha.position.z;
          let distance = Math.sqrt(dx * dx + dz * dz);
          let angle = Math.atan2(dz, dx);
      
          state.push(distance / 50);
          state.push(angle / Math.PI);
          state.push(bullet.direction);
        });
      
        // Remplir avec des 0 si pas assez d'ennemis ou projectiles
        while (state.length < 6 + 3 * 6 + 30 * 3) {
          state.push(0);
        }
      
        return state;
      }

    createModel(numInputs, numActions) {
        const model = tf.sequential();
        model.add(tf.layers.dense({ units: 64, inputShape: [numInputs], activation: 'relu' }));
        model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
        model.add(tf.layers.dense({ units: numActions }));
        model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
        return model;
    }
    
    async function trainModel(state, action, reward, nextState, done, gamma = 0.99) {
        const qValues = model.predict(tf.tensor([state]));
        const qValuesTarget = qValues.arraySync();
    
        let qUpdate = reward;
        if (!done) {
            const nextQValues = targetModel.predict(tf.tensor([nextState]));
            qUpdate += gamma * Math.max(...nextQValues.arraySync()[0]);
        }
    
        qValuesTarget[0][action] = qUpdate;
    
        await model.fit(tf.tensor([state]), tf.tensor(qValuesTarget), { epochs: 1 });
    }

    function updateTargetModel() {
        targetModel.setWeights(model.getWeights());
    }

    act(gameState) {
        const model = createModel(114, 8); // 114: taille du vecteur d'état, 8 actions possibles
        const targetModel = createModel(114, 8);

        targetModel.setWeights(model.getWeights());  // Synchroniser les poids
        return { z: false, q: false, s: false, d: false, a:false, e:false, esp:false, attack:false, shoot:false, rotation:1};
    }
}

module.exports = IArenforcement;