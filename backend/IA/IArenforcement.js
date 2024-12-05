class IArenforcement{
    constructor() {
        // Table des Q-valeurs pour l'apprentissage
        this.Q = {};  
        this.alpha = 0.1;  // Taux d'apprentissage
        this.gamma = 0.9;  // Facteur de discount
        this.epsilon = 0.1;  // Stratégie epsilon-greedy
        this.previousState = null;  // État précédent
        this.previousAction = null;  // Action précédente
        this.previousReward = 0;
    }

    initializeState(state) {
        if (!this.Q[state]) {
            this.Q[state] = {
                z: 0, q: 0, s: 0, d: 0, 
                esp:0, a: 0, e: 0,
                attack: 0, shoot: 0, rotation:0
            };
        }
    }

    chooseAction1(state) {
        this.initializeState(state);
        if (Math.random() < this.epsilon) {
            // Choisir une action aléatoire
            let actions = Object.keys(this.Q[state]);
            return actions[Math.floor(Math.random() * actions.length)];
        } else {
            // Choisir la meilleure action (greedy)
            let maxQ = Math.max(...Object.values(this.Q[state]));
            let bestActions = Object.keys(this.Q[state]).filter(a => this.Q[state][a] === maxQ);
            return bestActions[Math.floor(Math.random() * bestActions.length)];
        }
    }

    chooseAction(state) {
        this.initializeState(state);
        let actions = Object.keys(this.Q[state]);
        
        // Epsilon-greedy avec possibilité de sélectionner plusieurs actions
        if (Math.random() < this.epsilon) {
            // Choisir des actions aléatoires, plusieurs actions peuvent être sélectionnées
            let selectedActions = {};
            actions.forEach(action => {
                // Choisir une action avec une probabilité basée sur l'epsilon
                selectedActions[action] = Math.random() < 0.01; // 5% de chance de choisir une action
                if (action=="rotation") {
                    selectedActions[action] = Math.random()*2 -1;
                }
            });
            return selectedActions;
        } else {
            // Choisir les meilleures actions selon les Q-values
            let maxQ = Math.max(...Object.values(this.Q[state]));
            let bestActions = actions.filter(a => this.Q[state][a] === maxQ);
            
            let selectedActions = {};
            bestActions.forEach(action => {
                selectedActions[action] = true; // Sélectionner toutes les meilleures actions
            });
            return selectedActions;
        }
    }

    updateQ(state, selectedActions, reward, nextState) {
        this.initializeState(nextState);
        let maxQNext = Math.max(...Object.values(this.Q[nextState]));

        // Mettre à jour les Q-values pour chaque action sélectionnée
        for (let action in selectedActions) {
            if (selectedActions[action]) {
                this.Q[state][action] += this.alpha * (reward + this.gamma * maxQNext - this.Q[state][action]);
            }
        }
    }

    act(gameState) {
        let currentState = gameState;
        let selectedActions = this.chooseAction(currentState);

        // Si ce n'est pas le premier cycle
        if (this.previousState !== null && this.previousAction !== null) {
            let reward = this.previousReward;
            this.updateQ(this.previousState, this.previousAction, reward, currentState);
        }

        // Met à jour l'état et l'action précédents
        this.previousState = currentState;
        this.previousAction = selectedActions;

        // Convertir les actions sélectionnées en touches appuyées
        const actionMapping = {
            z: { z: true, q: false, s: false, d: false, esp: false, a: false, e: false, attack: false, shoot: false },
            q: { z: false, q: true, s: false, d: false, esp: false, a: false, e: false, attack: false, shoot: false },
            s: { z: false, q: false, s: true, d: false, esp: false, a: false, e: false, attack: false, shoot: false },
            d: { z: false, q: false, s: false, d: true, esp: false, a: false, e: false, attack: false, shoot: false },
            esp: { z: false, q: false, s: false, d: false, esp: true, a: false, e: false, attack: false, shoot: false },
            a: { z: false, q: false, s: false, d: false, esp: false, a: true, e: false, attack: false, shoot: false },
            e: { z: false, q: false, s: false, d: false, esp: false, a: false, e: true, attack: false, shoot: false },
            attack: { z: false, q: false, s: false, d: false, esp: false, a: false, e: false, attack: true, shoot: false },
            shoot: { z: false, q: false, s: false, d: false, esp: false, a: false, e: false, attack: false, shoot: true }
        };

        // Renvoie un dictionnaire avec plusieurs actions possibles activées en même temps
        let result = { z: false, q: false, s: false, d: false, esp: false, a: false, e: false, attack: false, shoot: false, rotation:0};
        for (let action in selectedActions) {
            if (selectedActions[action]) {
                Object.assign(result, actionMapping[action]);
            }
        }
        return result;
    }
}

module.exports = IArenforcement;