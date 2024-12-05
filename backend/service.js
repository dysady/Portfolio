

function getDistance(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

function Near(mechas, targetMechaId) {
    const targetMecha = mechas[targetMechaId];
    if (!targetMecha) {
        return {};  // Retourner un objet vide si le mécha cible n'existe pas
    }
    const nearbyMechas = {};
    for (const id in mechas) {
        if (mechas.hasOwnProperty(id) && id !== targetMechaId) {
            const mecha = mechas[id];
            const distance = getDistance(targetMecha.position, mecha.position);
            if (distance <= 50) {
                nearbyMechas[id] = mecha;
            }
        }
    }
    return nearbyMechas;  // Retourner le dictionnaire des méchas proches
  }

function getStateNorm(idMecha, mechas, bullets){
    const gameState = {mecha:mechas[idMecha] ,near: Near(mechas, idMecha),bullets:bullets};
    return stateNorm(gameState);
}

//fonction à rectifier plus tard
function stateNorm(gameState) {
        let mecha = gameState.mecha;
        const currentTimestamp = Date.now();
        // Informations du mecha
        let state = [
          mecha.position.x / 50,   // Position normalisée
          mecha.position.z / 50,   // Position normalisée
          mecha.health / 100,      // Santé normalisée
          mecha.energie / 1000,     // Énergie normalisée
          ((currentTimestamp-mecha.cdAttack-250) / 250 < 1) ? (currentTimestamp-mecha.cdAttack-250) / 250 : 1,     // Cooldown d'attaque normalisé
          ((currentTimestamp-mecha.cdShoot-50) / 50 < 1) ? (currentTimestamp-mecha.cdShoot-50) / 50 : 1     // Cooldown de tir normalisé
        ];
      
        const nearArray = Object.values(gameState.near);  // Convertir en tableau
        // Ajouter les caractéristiques des ennemis proches
        nearArray.slice(0, 6).forEach(enemy => {
          let dx = enemy.position.x - mecha.position.x;
          let dz = enemy.position.z - mecha.position.z;
          let distance = Math.sqrt(dx * dx + dz * dz);
          let angle = Math.atan2(dz, dx);
          state.push(distance / 50);
          state.push(angle / Math.PI);
          state.push(enemy.health / 100);  // Santé de l'ennemi
        });
        

        const nearArrayB = Object.values(gameState.bullets);
        // Ajouter les caractéristiques des projectiles proches
        nearArrayB.slice(0, 30).forEach(bullet => {
          let dx = bullet.position.x - mecha.position.x;
          let dz = bullet.position.z - mecha.position.z;
          let distance = Math.sqrt(dx * dx + dz * dz);
          let angle = Math.atan2(dz, dx);
          let direction = Math.atan2(bullet.direction.z, bullet.direction.x); 
      
          state.push(distance / 50);
          state.push(angle / Math.PI);
          state.push(direction / Math.PI);
        });
      
        // Remplir avec des 0 si pas assez d'ennemis ou projectiles
        while (state.length < 6 + 3 * 6 + 30 * 3) {
          state.push(0);
        }
      
        return state; // Convertir en string pour l'utiliser comme clé
}

module.exports = [getDistance,Near,getStateNorm,stateNorm];