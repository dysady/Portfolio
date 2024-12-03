class IArenforcement{
    constructor() {
        // Initialisation des paramètres pour l'IA renforcée
    }

    act(gameState) {
        return { z: false, q: false, s: false, d: false, a:false, e:false, esp:false, attack:false, shoot:false, rotation:1};
    }
}

module.exports = IArenforcement;