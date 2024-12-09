const { spawn } = require('child_process');
const path = require('path');

class IADQNpy {
    constructor(stateSize, actionSize) {
        if (IADQNpy.instance) {
            return IADQNpy.instance; // Retourner l'instance existante
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
        IADQN.instance = this; // Définir l'instance unique
    }

    async act(state) {
        if (Math.random() <= this.epsilon) {
            // Choisir une action aléatoire
            return this._randomAction();
        }

        // Appel à Python pour effectuer le calcul de l'IA
        const action = await this._callPythonForAction(state);
        return action;
    }

    // Fonction pour appeler Python et obtenir l'action
    _callPythonForAction(state) {
        return new Promise((resolve, reject) => {
            const pythonProcess = spawn('python3', [path.join(__dirname, 'ai_model_dqn.py')]);

            // Envoyer l'état à Python sous forme JSON
            const input = {
                state: state,
                state_size: this.stateSize,
                action_size: this.actionSize
            };

            pythonProcess.stdin.write(JSON.stringify(input));
            pythonProcess.stdin.end();

            // Lire la réponse de Python
            let result = '';
            pythonProcess.stdout.on('data', (data) => {
                result += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                reject(`Python error: ${data}`);
            });

            pythonProcess.on('close', () => {
                try {
                    const response = JSON.parse(result);
                    resolve(response.action);
                } catch (error) {
                    reject(`Error parsing response: ${error}`);
                }
            });
        });
    }

    // Exemple d'action aléatoire (à ajuster)
    _randomAction() {
        const randomIndex = Math.floor(Math.random() * this.actionSize);
        return randomIndex;
    }

    // Les autres méthodes de votre classe IADQNpy...
}

module.exports = IADQNpy;
