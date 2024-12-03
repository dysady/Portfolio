class IA {
    constructor(idMecha, IA) {
      this.ID = idMecha;  // Associée à un Mecha
      this.strategy = IA; // Placeholder pour la stratégie
    }
  
    // La fonction 'act' doit être implémentée dans chaque sous-classe
    act(gameState) {
        return this.strategy.act(gameState);
    }
  }

//exemple IA(15611131, new IArenforcement());