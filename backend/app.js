const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

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
const cooldownAttack = 500;
const cooldownShoot = 100;
const regenEnergie = 1;
const energieAux = 0.3;
const energieShieldA = 1.2;
const energieShieldE = 1;
const energieAttack = 15;
const energieShoot = 8;
const currentTimestamp = Date.now(); // Récupère l'heure actuelle
let mechas = {};
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
mechas['testbot'] = mechaBot;

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

// Fonction pour calculer la distance euclidienne entre deux points
function calculateDistance(position1, position2) {
  const dx = position2.x - position1.x;
  const dy = position2.y - position1.y;
  const dz = position2.z - position1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
// Fonction pour calculer la distance entre deux positions
function getDistance(pos1, pos2) {
  const dx = pos1.x - pos2.x;
  const dz = pos1.z - pos2.z;
  return Math.sqrt(dx * dx + dz * dz);
}
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

// Fonction pour récupérer les méchas proches dans un rayon de 70 unités
function Near(mechas, targetMechaId) {
  const targetMecha = mechas[targetMechaId];
  if (!targetMecha) {
      return {};  // Retourner un objet vide si le mécha cible n'existe pas
  }

  const nearbyMechas = {};
  for (const id in mechas) {
      if (mechas.hasOwnProperty(id) && id !== targetMechaId) {
          const mecha = mechas[id];
          const distance = calculateDistance(targetMecha.position, mecha.position);
          if (distance <= 50) {
              nearbyMechas[id] = mecha;
          }
      }
  }

  return nearbyMechas;  // Retourner le dictionnaire des méchas proches
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
  const attackerRotationY = attacker.rotation.y; // Orientation en radians

  for (let targetId in mechas) {
      if (targetId !== attackerId) {
          const target = mechas[targetId];
          const distance = getDistance(attackerPosition, target.position);
          // Vérifier si le mécha cible est à moins de 10 unités de distance
          if (distance <= 5) {
              // Vérifier si le mécha cible est à 180 degrés devant le mécha attaquant
              if (isInFront(attacker, target)) {
                if (!target.blockAttack) {
                  target.health -= 20; // Réduire les points de vie
                }
                  // Si la santé tombe à 0 ou en dessous
                  if (target.health <= 0) {
                      console.log(`${targetId} a été détruit par ${attackerId}`);
                      delete mechas[targetId];
                      io.emit('mechaDestroyed', ( targetId )); // Informer tous les clients
                      if (targetId=="testbot") {
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
                        mechas['testbot'] = mechaBot;
                      }
                  } else {
                      io.emit('mechaDamaged', { targetId, health: target.health }); // Informer les clients
                  }
              }
          }
      }
  }
}

const bullets = {};

function shoot(attackerId) {
  const attacker = mechas[attackerId];

  if (!attacker) return; // Vérification de sécurité

  const bulletId = `${attackerId}_${Date.now()}`; // Identifiant unique pour la balle
  const position = { ...attacker.position };
  const rotationY = attacker.rotation + Math.PI/2; // Orientation de la balle

  bullets[bulletId] = {
      id: bulletId,
      position: position,
      direction: { x: Math.sin(rotationY), z: Math.cos(rotationY) },
      attackerId: attackerId,
      lifetime: 2000, // Durée de vie en ms
  };

  //console.log(`Shoot: ${attackerId} a tiré un projectile: ${mechas[attackerId].energie}`);

  // Met à jour la position de la balle pendant sa durée de vie
  updateBullet(bulletId);
}

function updateBullet(bulletId) {
  const bullet = bullets[bulletId];

  if (!bullet) return;

  const speed = 2; // Vitesse de la balle
  const interval = 50; // Intervalle de mise à jour en ms

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
                  if (!target.blockTir) {
                    target.health -= 5;
                  }
                
                  if (target.health <= 0) {
                      target.health = 0;
                      console.log(`${targetId} a été détruit par un tir de ${bullet.attackerId}`);
                      delete mechas[targetId];
                      io.emit('mechaDestroyed', ( targetId )); // Informer tous les clients
                      if (targetId=="testbot") {
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
                        mechas['testbot'] = mechaBot;
                      }
                  }
                  //console.log(`Shoot: ${bullet.attackerId} a infligé 5 dégâts à ${targetId}`);
                  io.emit('mechaDamaged', { targetId, health: target.health }); // Informer les clients
                  clearInterval(bulletInterval); // Arrêter la balle
                  delete bullets[bulletId]; // Supprimer la balle
                  return;
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
      await new Promise(resolve => setTimeout(resolve, 100)); // Attendre 1 seconde
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
      await new Promise(resolve => setTimeout(resolve, 100)); // Attendre 1 seconde
  }
}

// Lancer la mise à jour continue
updateMechaHealthEverySecond();
updateMechaEnergieEverySecond()

// Exporter le serveur pour l'utiliser dans le fichier `server.js`
module.exports = { app, server };