const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { promises } = require('dns');

const IArenforcement = require('./IA/IArenforcement'); // Chemin relatif au fichier
const IAaleatoire = require('./IA/IAaleatoire');       // Chemin relatif au fichier
const IADQN = require('./IA/IADQN');
const [getDistance,Near,getStateNorm,stateNorm] = require('./service');

//const db = require('../database/config/postgresql');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware pour servir des fichiers statiques (comme les fichiers front-end)
// Servir les fichiers statiques depuis le dossier "frontend"
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
///////////////// INDEX fin ///////////
const gameSpeed = 1;
const cooldownAttack = 500/gameSpeed;
const cooldownShoot = 100/gameSpeed;
const regenEnergie = 1;
const energieAux = 0.3;
const energieShieldA = 1.2;
const energieShieldE = 1;
const energieAttack = 15;
const energieShoot = 8;
const mechaSpeed = 0.1;
let multSpeed = 1;
const mapSize = 50;
const currentTimestamp = Date.now(); // Récupère l'heure actuelle
const mechas = {};
let mechaBot = {
  id: 'testbot',
  position: { x: 0, y: 0, z: 0 },
  rotation: 0,
  health: 100,
  energie:10000000,
  blockTir: false,
  blockAttack:false,
  flame:false,
  cdAttack:0,
  cdShoot:0,
};
//mechas['testbot'] = mechaBot;

// Serveur de fichiers statiques
app.use(express.static('public'));

// Gestion de l'événement de création de mécha
io.on('connection', (socket) => {
    console.log('Un utilisateur est connecté');
    let userMechaId = socket.id;  // Utiliser l'ID du socket comme identifiant unique pour le mécha

    socket.on('getObs',()=>{
      //let rand = 'testbot'; // Génère un indice pseudo aléatoire
      let keys = Object.keys(mechas); // Obtenir les clés de l'objet `mechas`
      let rand = keys[Math.floor(Math.random() * keys.length)]; // Sélectionner une clé aléatoire
      socket.emit('obs', mechas[rand]);
    })

    socket.on('updateObs',(id)=>{
      obsNear = Near(mechas,id);
      obsNear[id]=mechas[id];
      socket.emit('Obs_live', obsNear);
    })

    // Créer un mécha avec une position aléatoire
    socket.on('createMecha', () => {
        const randomX = Math.random() * 20 - 10;  // Position X entre -10 et 10
        const randomZ = Math.random() * 20 - 10;  // Position Z entre -10 et 10
        const mechaData = {
            id: userMechaId,
            position: { x: randomX, y: 0, z: randomZ },
            rotation: 0,
            health: 100,
            energie:100,
            blockTir: false,
            blockAttack:false,
            flame:false,
            cdAttack:0,
            cdShoot:0,
        };
        mechas[userMechaId] = mechaData;
        console.log("mecha ajouté :", userMechaId);
        socket.emit('mechaCreated', mechaData);  // Envoyer la position du mécha au client
    });

    socket.on('deleteMyMecha',() => {
      delete mechas[socket.id];
    });
    
    // Mettre à jour la position du mécha
    socket.on('updateMechaPosition', (dict) => {
      let data = dict['mecha'];
      let Attack = dict['Attack'];
      let Shoot = dict['Shoot'];
      let boost = dict['Esp'];
      let ShieldA = dict['ShieldA'];
      let ShieldE = dict['ShieldE'];
      if (mechas[data.id]) {
        mechas[data.id].position = data.position;
        mechas[data.id].rotation = data.rotation;
        if (boost && mechas[data.id].energie>energieAux) {
          mechas[data.id].energie += -energieAux;
        }
        if (ShieldA && mechas[data.id].energie>energieShieldA) {
          mechas[data.id].energie += -energieShieldA;
          mechas[data.id].blockAttack = ShieldA;
        }else{
          mechas[data.id].blockAttack = false;
        }
        if (ShieldE && mechas[data.id].energie>energieShieldE) {
          mechas[data.id].energie += -energieShieldE;
          mechas[data.id].blockTir = ShieldE;
        }else{
          mechas[data.id].blockTir = false;
        }
        const currentTimestamp = Date.now();
        if (Attack && mechas[data.id].energie>energieAttack) {
          if (currentTimestamp - mechas[data.id].cdAttack >= cooldownAttack) {
            mechas[data.id].flame=true;
          }else{
            mechas[data.id].flame=false;
          }
        }else{
          mechas[data.id].flame=false;
        }
        // Synchroniser les autres clients avec la nouvelle position
        socket.emit('mechaMoved', Near(mechas,data.id));
        socket.emit('userhealth', mechas[data.id].health);
        
        if (mechas[data.id].flame) {
            mechas[data.id].energie += -energieAttack;
            attack(data.id);
            mechas[data.id].cdAttack = currentTimestamp;
        }
        if (Shoot && mechas[data.id].energie>energieShoot) {
          //console.log(`ct: ${currentTimestamp} cd: ${mechas[data.id].cdShoot} delta: ${currentTimestamp - mechas[data.id].cdShoot} cds : ${cooldownShoot} `)
          if (currentTimestamp - mechas[data.id].cdShoot >= cooldownShoot) {
            mechas[data.id].energie += -energieShoot;
            shoot(data.id);
            mechas[data.id].cdShoot = currentTimestamp;
          }
        }
      }else {
        // Si le mécha n'existe pas, on peut ajouter un log d'erreur
        console.error(`Mecha avec l'ID ${data.id} introuvable.`);
        let keys = Object.keys(mechas); // Obtenir les clés de l'objet `mechas`
        let rand = keys[Math.floor(Math.random() * keys.length)]; // Sélectionner une clé aléatoire
        socket.emit('obs', mechas[rand]);
      }
    });

    // Gestion de la déconnexion
    socket.on('disconnect', (MechaId) => {
        console.log('Un utilisateur est déconnecté');
        if (mechas[socket.id]) {
          delete mechas[socket.id]; // Supprime le mécha dans l'objet local
      }
      // Émettre un événement pour notifier les autres clients de la déconnexion
    socket.broadcast.emit('mechaDisconnected', { id: socket.id });
    });
});

// Fonction pour vérifier si la cible est devant l'attaquant
function isInFront(attacker, target) {
  const dx = target.position.x - attacker.position.x;
  const dz = target.position.z - attacker.position.z;

  // Calcul de l'angle entre la direction de l'attaquant et la cible
  const angleToTarget = Math.atan2(dz, dx);
  const attackerFacing = -attacker.rotation;

  // Différence d'angle
  const angleDifference = Math.abs(attackerFacing - angleToTarget);

  // Vérification si l'angle est à moins de 90 degrés (donc dans un cône de 180 degrés devant l'attaquant)
  return angleDifference <= Math.PI / 2 || angleDifference >= 3 * Math.PI / 2;
}

// Gestion des promesses rejetées non gérées
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Ici, vous pouvez aussi fermer proprement le serveur ou effectuer une autre action si nécessaire
});

function attack(attackerId) {
  const attacker = mechas[attackerId];
  attacker.flame=true;
  if (!attacker) return; // Vérification de sécurité

  const attackerPosition = attacker.position;
  //const attackerRotationY = attacker.rotation.y; // Orientation en radians

  for (let targetId in mechas) {
      if (targetId !== attackerId) {
          //console.log(targetId,attackerId);
          const target = mechas[targetId];
          const distance = getDistance(attackerPosition, target.position);
          // Vérifier si le mécha cible est à moins de 10 unités de distance
          if (distance <= 5) {
              // Vérifier si le mécha cible est à 180 degrés devant le mécha attaquant
              if (isInFront(attacker, target)) {
                let point=2;
                if (!target.blockAttack) {
                  target.health -= 20; // Réduire les points de vie
                  point+=6;
                }
                  // Si la santé tombe à 0 ou en dessous
                  if (target.health <= 0) {
                      console.log(`${targetId} a été détruit par ${attackerId}`);
                      delete mechas[targetId];
                      io.emit('mechaDestroyed', ( targetId )); // Informer tous les clients
                      point+=30;
                    } else {
                      io.emit('mechaDamaged', { targetId, health: target.health }); // Informer les clients
                  }
                  return point;
              }
          }
      }
  }
}

const bullets = {};

function shoot(attackerId) {
  const attacker = mechas[attackerId];

  if (!attacker) return 0; // Vérification de sécurité

  const bulletId = `${attackerId}_${Date.now()}`; // Identifiant unique pour la balle
  const position = { ...attacker.position };
  const rotationY = attacker.rotation + Math.PI/2; // Orientation de la balle

  bullets[bulletId] = {
      id: bulletId,
      position: position,
      direction: { x: Math.sin(rotationY), z: Math.cos(rotationY) },
      attackerId: attackerId,
      lifetime: 2000/gameSpeed, // Durée de vie en ms
  };

  //console.log(`Shoot: ${attackerId} a tiré un projectile: ${mechas[attackerId].energie}`);

  // Met à jour la position de la balle pendant sa durée de vie
  return updateBullet(bulletId);
}

function updateBullet(bulletId) {
  const bullet = bullets[bulletId];

  if (!bullet) return 0;

  const speed = 2; // Vitesse de la balle
  const interval = 50/gameSpeed; // Intervalle de mise à jour en ms

  const bulletInterval = setInterval(() => {
      // Avance la balle en ligne droite
      bullet.position.x += bullet.direction.x * speed;
      bullet.position.z += bullet.direction.z * speed;
      io.emit('bullet', {id: bulletId, x:bullet.position.x, z:bullet.position.z, direction:bullet.direction });
      // Vérifie les collisions avec les méchas
      for (let targetId in mechas) {
          if (targetId !== bullet.attackerId) {
              const target = mechas[targetId];
              if (getDistance(bullet.position, target.position) <= 1) { // Si la balle touche un mécha
                io.emit('endBullet', bulletId);
                  let point = 1;
                  if (!target.blockTir) {
                    target.health -= 5;
                    point+=4
                  }
                
                  if (target.health <= 0) {
                    point += 25;
                      target.health = 0;
                      console.log(`${targetId} a été détruit par un tir de ${bullet.attackerId}`);
                      delete mechas[targetId];
                      io.emit('mechaDestroyed', ( targetId )); // Informer tous les clients
                  }
                  //console.log(`Shoot: ${bullet.attackerId} a infligé 5 dégâts à ${targetId}`);
                  io.emit('mechaDamaged', { targetId, health: target.health }); // Informer les clients
                  clearInterval(bulletInterval); // Arrêter la balle
                  delete bullets[bulletId]; // Supprimer la balle
                  return point;
              }
          }
      }

      // Réduit la durée de vie de la balle
      bullet.lifetime -= interval;

      // Supprime la balle si sa durée de vie est écoulée
      if (bullet.lifetime <= 0) {
          clearInterval(bulletInterval);
          delete bullets[bulletId];
          io.emit('endBullet', bulletId);
          //console.log(`Bullet ${bulletId} destroyed (lifetime expired).`);
      }
  }, interval);
}

///automatisation

async function updateMechaHealthEverySecond() {
  while (true) { // Boucle infinie pour mettre à jour en continu
      // Parcourir tous les méchas
      for (let id in mechas) {
          if (mechas[id].health < 100) {
              mechas[id].health+=0.2; // Met à jour l'affichage de la barre de vie
          }
      }
      await new Promise(resolve => setTimeout(resolve, 100/gameSpeed)); // Attendre 1 seconde
  }
}

async function updateMechaEnergieEverySecond() {
  while (true) { // Boucle infinie pour mettre à jour en continu
      // Parcourir tous les méchas
      for (let id in mechas) {
          if (mechas[id].energie < 100) {
              mechas[id].energie+=regenEnergie; // Met à jour l'affichage de la barre de vie
          }
      }
      //attack("testbot");
      //shoot("testbot");
      await new Promise(resolve => setTimeout(resolve, 100/gameSpeed)); // Attendre 1 seconde
  }
}

// Lancer la mise à jour continue
updateMechaHealthEverySecond();
updateMechaEnergieEverySecond();

/////IA

async function createMecha(id, currentTimestamp) {
  // Fonction pour créer un mecha auto
  const randomX = Math.random() * 20 - 10;  // Position X entre -10 et 10
        const randomZ = Math.random() * 20 - 10;  // Position Z entre -10 et 10
        const mechaData = {
            id: id,
            position: { x: randomX, y: 0, z: randomZ },
            rotation: 0,
            health: 100,
            energie: 100,
            blockTir: false,
            blockAttack:false,
            flame:false,
            cdAttack:currentTimestamp,
            cdShoot:currentTimestamp,
        };
        mechas[id] = mechaData;
  //console.log("create : ", id);
}

const desiredRefreshPerSec = 60;
const refreshDelay = 1000 / desiredRefreshPerSec / gameSpeed;
const stateSize = 114;  // Taille de l'état normalisé
const actionSize = 10;   // Par exemple: rotation, déplacement, etc.
const mechaIA = [{id:"iaRenforcement1",strat: new IADQN(stateSize, actionSize)},{id:"ia2", strat: new IADQN(stateSize, actionSize)},{id:"ia3", strat: new IADQN(stateSize, actionSize)},{id:"ia4", strat: new IADQN(stateSize, actionSize)}];
//const mechaIA = [{id:"iaaleatoire", strat: new IAaleatoire()}];
//,{id:"ia5", strat:new IAaleatoire()}
async function runIA(mechaIA) {
  try {
  while (true) {
    for (const element of mechaIA) {
      // Si le mecha n'existe pas encore, on le crée
      const currentTimestamp = Date.now();
      if (!mechas[element.id]) {
        await createMecha(element.id, currentTimestamp);  // Appel à la création du mecha
      }
      let reward = 0;
      const gameState = getStateNorm(element.id, mechas, bullets);
      //console.log(gameState);
      const keys = await element.strat.act(gameState);
      //console.log(keys);
      
      if (mechas[element.id]) {
        mechas[element.id].rotation = keys.rotation * Math.PI;
        
        if (keys.esp && mechas[element.id].energie>energieAux) {
          mechas[element.id].energie += -energieAux;
          multSpeed = 1.7;
        }else{
          multSpeed = 1;
        }
        if (keys.z && mechas[element.id].position.z -mechaSpeed * multSpeed>-mapSize+1) mechas[element.id].position.z -= mechaSpeed * multSpeed;
        if (keys.s && mechas[element.id].position.z + mechaSpeed * multSpeed<mapSize-1) mechas[element.id].position.z += mechaSpeed * multSpeed;
        if (keys.q && mechas[element.id].position.x - mechaSpeed * multSpeed >-mapSize+1) mechas[element.id].position.x -= mechaSpeed * multSpeed;
        if (keys.d && mechas[element.id].position.x + mechaSpeed * multSpeed<mapSize-1) mechas[element.id].position.x += mechaSpeed * multSpeed;
        
        if (keys.a && mechas[element.id].energie>energieShieldA) {
          mechas[element.id].energie += -energieShieldA;
          mechas[element.id].blockAttack = keys.a;
          reward+=-5;
        }else{
          mechas[element.id].blockAttack = false;
        }
        if (keys.e && mechas[element.id].energie>energieShieldE) {
          mechas[element.id].energie += -energieShieldE;
          mechas[element.id].blockTir = keys.e;
          reward+=-5;
        }else{
          mechas[element.id].blockTir = false;
        }

        
        if (keys.attack && mechas[element.id].energie>energieAttack) {
          reward+=-4;
          if (currentTimestamp - mechas[element.id].cdAttack >= cooldownAttack) {
            mechas[element.id].flame=true;
          }else{
            mechas[element.id].flame=false;
          }
        }else{
          mechas[element.id].flame=false;
        }
        
        if (mechas[element.id].flame) {
            mechas[element.id].energie += -energieAttack;
            reward+=attack(element.id);
            mechas[element.id].cdAttack = currentTimestamp;
        }
        if (keys.shoot && mechas[element.id].energie>energieShoot) {
          reward+=-3;
          if (currentTimestamp - mechas[element.id].cdShoot >= cooldownShoot) {
            mechas[element.id].energie += -energieShoot;
            reward+=shoot(element.id);
            mechas[element.id].cdShoot = currentTimestamp;
          }
        }
        let previousHealth = mechas[element.id].health;
        await delay(refreshDelay);
        if (!mechas[element.id]) {
          await createMecha(element.id, currentTimestamp);
          reward+=-20;
        }
        if (previousHealth>mechas[element.id].health) {
          reward+=-6;
        }

        if (element.strat instanceof  IADQN) {
        const nextState = getStateNorm(element.id, mechas, bullets);
        //console.log(nextState);
        const done = checkIfDone(gameState);  // Vérifier si le jeu est terminé
        //console.log("1");
        element.strat.storeExperience(gameState, keys, reward, nextState, done);
        //console.log("2");
        await element.strat.train(1000);  // Entraîner l'IA
        //console.log("3");
        }
        
      }else {
        console.log("error BOT introuvable");
      }
    }
    await new Promise(resolve => setTimeout(resolve, refreshDelay));
  }
  } catch (error) {
    console.error("Erreur dans runIA :", error);

    // Attendre un moment avant de redémarrer
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 secondes d'attente

    // Redémarrer la fonction runIA
    runIA(mechaIA);
  }
}

runIA(mechaIA);

function checkIfDone(gameState) {
  return false;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
// Exporter le serveur pour l'utiliser dans le fichier `server.js`
module.exports = { app, server };