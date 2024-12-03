class AggressiveAI extends IA {
    constructor(idMecha) {
      super(idMecha);
      this.strategy = 'aggressive';
    }
  
    act(gameState) {
      const closestEnemy = this.findClosestEnemy(gameState.enemies);
      if (closestEnemy) {
        this.attack(closestEnemy);
      } else {
        this.moveTowardsEnemy(gameState);
      }
    }
  }
  