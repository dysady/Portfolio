const tf = require('@tensorflow/tfjs-node-gpu');

(async () => {
  await tf.setBackend('tensorflow');
  await tf.ready();

  console.log("Version TensorFlow :", tf.version.tfjs);
  console.log("Backend actif :", tf.getBackend());

  const devices = tf.engine().backendInstance.binding.TF_ListPhysicalDevices();
  console.log("Périphériques physiques :", devices);

  if (tf.engine().backendInstance.isUsingGpuDevice) {
    console.log("GPU activé !");
  } else {
    console.log("GPU non activé !");
  }
})();

// Modèle simple de régression linéaire
async function run() {
    // Création d'un modèle
    const model = tf.sequential();
  
    model.add(tf.layers.dense({ units: 1, inputShape: [1] }));
  
    // Compilation du modèle
    model.compile({
      optimizer: 'sgd',
      loss: 'meanSquaredError'
    });
  
    // Données d'entraînement
    const xs = tf.tensor2d([1, 2, 3, 4, 5], [5, 1]);
    const ys = tf.tensor2d([1, 3, 5, 7, 9], [5, 1]);
  
    console.time("Training Time");
  
    // Entraînement
    await model.fit(xs, ys, {
      epochs: 500
    });
  
    console.timeEnd("Training Time");
  
    // Prédiction
    const output = model.predict(tf.tensor2d([6], [1, 1]));
    output.print();
  }
  
  //run();