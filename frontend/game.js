//bug bouclier à la mort, detruire les bouclier
const socket = io();  // Connecte au serveur Socket.IO

const regenEnergie = 1;
const energieAux = 0.3;
const energieShieldA = 1.2;
const energieShieldE = 1;
const cooldownAttack = 500;
const energieAttack = 15;
const cooldownShoot = 100;
const energieShoot = 8;

const mapSize = 50;
const scaleFactor = 1;
let mecha = {};
const bullets = {}; // Dictionnaire des bullets affichées
let cdShoot = 0; // Dernier timestamp du tir
let cdAttack = 0;
let keys = { z: false, q: false, s: false, d: false, a:false, e:false, esp:false, attack:false, shoot:false};
let mechaSpeed = 0.1;
let multSpeed = 1;
let camera, scene, renderer;
let userMechaId;  // ID du mécha de l'utilisateur
let obsMechaId;  // ID mecha observé

// Variables pour gérer la souris
let mouse = new THREE.Vector2();
let raycaster = new THREE.Raycaster(); // Utilisé pour projeter la souris sur le plan 3D

// Gestionnaire d'événements pour mettre à jour les coordonnées de la souris
document.addEventListener('mousemove', (event) => {
    // Normaliser les coordonnées de la souris entre -1 et 1
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

// Initialisation de la scène Three.js
function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    // Ajouter une lumière pour éclairer la scène
    const light = new THREE.AmbientLight(0x404040); // Lumière douce blanche
    scene.add(light);

    renderer.setClearColor(0x333333);

    // Créer le plan 2D représentant la carte
    const mapTexture = new THREE.TextureLoader().load('maptest.jpeg'); // Charger une image de carte
    const mapMaterial = new THREE.MeshBasicMaterial({ map: mapTexture, side: THREE.DoubleSide });
    const mapGeometry = new THREE.PlaneGeometry(mapSize, mapSize); // Taille du plan
    const map = new THREE.Mesh(mapGeometry, mapMaterial);
    map.rotation.x = -Math.PI / 2; // Ordonner la carte à être horizontale
    //scene.add(map);

    // Créer une grille de test
    const gridHelper = new THREE.GridHelper(mapSize*2, 10); // Grille de 50x50 avec 10 subdivisions
    scene.add(gridHelper);

    // Créer la scène de jeu
    //createMechaUser();
    getObs();

    animate();
}

function getObs() {
    socket.emit('getObs');
    socket.on('obs', (mechaData)=> {
        deleteMyMecha();
        deleteMecha(obsMechaId);
        obsMechaId = mechaData.id;
        deleteMecha(obsMechaId);
        createMecha(obsMechaId,mechaData.position.x, mechaData.position.y, mechaData.position.z, mechaData.rotation, mechaData.health,mechaData.energie, 0x0000ff);
        setCamMecha(obsMechaId);
        //console.log("obs : ", obsMechaId);
    });
} 

function updateObs() {
    socket.emit('updateObs', obsMechaId);
}

// Fonction pour mettre à jour l'orientation du mécha utilisateur
function updateMechaOrientation() {
    if (!mecha[userMechaId]) return; // Vérifier que le mécha existe

    // Position actuelle du mécha utilisateur
    const mechaPosition = mecha[userMechaId].position;

    // Configurer le raycaster pour projeter la souris sur un plan au niveau du mécha
    raycaster.setFromCamera(mouse, camera);

    // Calculer l'intersection avec un plan horizontal au niveau du mécha
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -mechaPosition.y); // Plan horizontal
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersection);

    // Calculer l'angle entre le mécha et la position de l'intersection
    const dx = intersection.x - mechaPosition.x;
    const dz = intersection.z - mechaPosition.z;
    const angle = Math.atan2(dz, dx);

    // Appliquer la rotation au mécha (autour de l'axe Y)
    mecha[userMechaId].rotation.y = -angle; // L'axe Y pointe vers le haut
}

function setCamMecha(id) {
    camera.position.set(mecha[id].position.x, mecha[id].position.y + 20, mecha[id].position.z + 5);
    camera.lookAt(mecha[id].position);
}

// Fonction pour créer le mécha de User (cube)
function createMechaUser() {
    socket.emit('createMecha');
    socket.on('mechaCreated',(mechaData)=>{
        deleteMecha(userMechaId);
        deleteMecha(obsMechaId);
        userMechaId = mechaData.id;
        createMecha(userMechaId,
            mechaData.position.x, mechaData.position.y, mechaData.position.z,
            mechaData.rotation, mechaData.health, mechaData.energie, color=0x00ff00);
        camera.position.set(mecha[userMechaId].position.x, mecha[userMechaId].position.y + 20, mecha[userMechaId].position.z + 5);
        camera.lookAt(mecha[userMechaId].position);
        obsMechaId = 0;
    })
}

function createMecha(id,x,y,z,rotation = 0,health = 100, energie=100, color = 0xff0000) {
    //const geometry = new THREE.BoxGeometry(1, 2, 1); // Cube représentant le mécha
    //const material = new THREE.MeshBasicMaterial({ color: color });

    // Créer un groupe pour tout le drone
    const droneGroup = new THREE.Group();

    // Corps du drone (sphère stylisée)
    const bodyGeometry = new THREE.SphereGeometry(1*scaleFactor, 16*scaleFactor, 16*scaleFactor);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: color });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.scale.set(scaleFactor, scaleFactor, scaleFactor); // Appliquer le facteur d'échelle
    droneGroup.add(body);

    // Canon long à gauche (cylindre long et fin)
    const leftCannonGeometry = new THREE.CylinderGeometry(0.05*scaleFactor, 0.1*scaleFactor, 2*scaleFactor, 32*scaleFactor);
    const leftCannonMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
    const leftCannon = new THREE.Mesh(leftCannonGeometry, leftCannonMaterial);
    leftCannon.rotation.z = Math.PI / 2; // Rotation horizontale
    leftCannon.position.set(0.5 * scaleFactor, 0, -0.1*scaleFactor); // Déplacer à gauche du drone
    droneGroup.add(leftCannon);//-2.5 * scaleFactor

    // Gros canon à droite (cylindre épais et court)
    const rightCannonGeometry = new THREE.CylinderGeometry(0.2*scaleFactor, 0.2*scaleFactor, 1.2*scaleFactor, 32*scaleFactor);
    const rightCannonMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const rightCannon = new THREE.Mesh(rightCannonGeometry, rightCannonMaterial);
    rightCannon.rotation.z = Math.PI / 2; // Rotation horizontale
    rightCannon.position.set(0.5 * scaleFactor, 0, 0.5*scaleFactor); // Déplacer à droite du drone
    droneGroup.add(rightCannon);

    // Ailes (une à l'avant, une à l'arrière, légèrement orientées vers le haut)
    const wingGeometry = new THREE.BoxGeometry(0.8 * scaleFactor, 1.2 * scaleFactor, 0.1 * scaleFactor);
    const wingMaterial = new THREE.MeshStandardMaterial({ color: 0x999999 });

    // Aile avant
    const frontWing = new THREE.Mesh(wingGeometry, wingMaterial);
    frontWing.position.set(0, 1 * scaleFactor, 1 * scaleFactor); // Position avant du drone
    frontWing.rotation.x = Math.PI / 3; // Légère rotation vers le haut
    droneGroup.add(frontWing);

    // Aile arrière
    const backWing = new THREE.Mesh(wingGeometry, wingMaterial);
    backWing.position.set(0, 1 * scaleFactor, -1 * scaleFactor); // Position arrière du drone
    backWing.rotation.x = -Math.PI / 3; // Légère rotation vers le haut
    droneGroup.add(backWing);

    // Aile avant 2
    const frontWing2 = new THREE.Mesh(wingGeometry, wingMaterial);
    frontWing2.position.set(0, 0 * scaleFactor, 1 * scaleFactor); // Position avant du drone
    frontWing2.rotation.x = -Math.PI / 3; // Légère rotation vers le haut
    droneGroup.add(frontWing2);

    // Aile arrière 2
    const backWing2 = new THREE.Mesh(wingGeometry, wingMaterial);
    backWing2.position.set(0, 0 * scaleFactor, -1 * scaleFactor); // Position arrière du drone
    backWing2.rotation.x = Math.PI / 3; // Légère rotation vers le haut
    droneGroup.add(backWing2);

    // Ajout des moteurs (en bas du drone)
    const motorGeometry = new THREE.SphereGeometry(0.5*scaleFactor, 8*scaleFactor, 8*scaleFactor);
    const motorMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
    const leftMotor = new THREE.Mesh(motorGeometry, motorMaterial);
    const rightMotor = new THREE.Mesh(motorGeometry, motorMaterial);

    leftMotor.position.set(-0.8 * scaleFactor, 0, -0.8 * scaleFactor); // Moteur gauche
    rightMotor.position.set(-0.8 * scaleFactor, 0, 0.8 * scaleFactor); // Moteur droit

    droneGroup.add(leftMotor);
    droneGroup.add(rightMotor);

    mecha[id]= droneGroup;
    //mecha[id] = new THREE.Mesh(geometry, material);
    mecha[id].position.set(x,y,z);
    mecha[id].rotation.y = rotation;
    mecha[id].health = health;
    mecha[id].energie = energie;
    mecha[id].shield = {};

    scene.add(mecha[id]);
    //console.log("mech add", id);
    // Créer un canvas pour le texte de l'id
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 128;

    // Ajouter l'id du mécha comme texte sur le canvas
    context.fillStyle = 'white'; // Couleur du texte
    context.font = '40px Arial'; // Police du texte
    context.textAlign = 'center'; // Aligner le texte au centre
    context.fillText(id, canvas.width / 2, canvas.height / 2);

    // Fonction pour dessiner le texte et la barre de vie sur le canvas
    function drawHUD() {
        // Effacer le canvas
        context.clearRect(0, 0, canvas.width, canvas.height);

        // Dessiner le texte (l'ID)
        context.fillStyle = 'white';
        context.font = '40px Arial';
        context.textAlign = 'center';
        context.fillText(id, canvas.width / 2, 40);

        // Dessiner la barre de vie
        const maxBarWidth = 200;
        const barHeight = 20;
        const healthPercentage = Math.max(0, Math.min(1, mecha[id].health / 100)); // Clamp health between 0 and 1
        const currentBarWidth = maxBarWidth * healthPercentage;

        // Contour de la barre de vie (en rouge)
        context.fillStyle = 'red';
        context.fillRect((canvas.width - maxBarWidth) / 2, 80, maxBarWidth, barHeight);

        // Barre de vie actuelle (en vert)
        context.fillStyle = 'green';
        context.fillRect((canvas.width - maxBarWidth) / 2, 80, currentBarWidth, barHeight);
    }

    // Dessiner le HUD initial
    drawHUD();

    // Créer une texture à partir du canvas
    const texture = new THREE.CanvasTexture(canvas);

    // Créer un sprite avec la texture du texte
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);

    // Positionner le sprite au-dessus du mécha
    sprite.position.set(0, 1.5, 0); // Ajuster en fonction de la taille du mécha
    sprite.scale.set(2, 1, 1); // Ajuster l'échelle pour que le texte soit lisible
    // Attacher le sprite au mécha (il suivra ses déplacements et rotations)
    mecha[id].add(sprite);

    // Mettre à jour le HUD lorsque la santé change
    mecha[id].updateHUD = function () {
        drawHUD();
        texture.needsUpdate = true; // Indiquer que la texture doit être mise à jour
    };
}

function deleteMecha(id) {
    scene.remove(mecha[id]);
    delete mecha[id];
}

function deleteMyMecha() {
    socket.emit('deleteMyMecha');
    deleteMecha(userMechaId);
}

function removeMechasNotInMechaObject() {
    // Parcourir tous les enfants de la scène
    scene.children.forEach((child) => {
        // Vérifier si c'est un objet de type Mesh avec une propriété spécifique (par exemple: health)
        if (child.isMesh && child.health !== undefined) {
            // Vérifier si l'objet est encore dans la collection 'mecha'
            const isStillInMecha = Object.values(mecha).includes(child);
            // Si l'objet n'est pas dans la collection 'mecha', le retirer de la scène
            if (!isStillInMecha) {
                scene.remove(child);
                //console.log("Mecha removed from scene:", child);
            }
        }
    });
}

function createShield(idMecha,idShield) {
    if (!mecha[idMecha]) {
      console.error(`Mecha avec l'ID ${idMecha} n'existe pas.`);
      return;
    }
  
    // Vérifier si un bouclier existe déjà pour ce mécha
    if (mecha[idMecha].shield[idShield]) {
        mecha[idMecha].shield[idShield].position.copy(mecha[idMecha].position);
      //console.log(`Bouclier déjà actif pour le mécha ${idMecha}.`);
      return;
    }
    
    if (idShield=="e") {
        color=0x0000ff;
    }else if (idShield=="a") {
        color=0xff0000;
    }else{
        color=0x00ff00;
    }

    // Création de la géométrie de la sphère
    const shieldGeometry = new THREE.SphereGeometry(1.5, 32, 32); // Sphère autour du mécha
    const shieldMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.3, // Transparence du bouclier
      wireframe: true, // Style fil de fer pour l'effet
    });
  
    // Création du mesh pour le bouclier
    const shieldMesh = new THREE.Mesh(shieldGeometry, shieldMaterial);
  
    // Positionner le bouclier au centre du mécha
    shieldMesh.position.copy(mecha[idMecha].position);
  
    // Ajouter le bouclier au mécha et à la scène
    scene.add(shieldMesh);
    mecha[idMecha].shield[idShield] = shieldMesh;
  
    //console.log(`Bouclier ajouté pour le mécha ${idMecha}.`);
  }
  function deleteShield(idMecha,idShield) {
    if (!mecha[idMecha]) {
      console.error(`Mecha avec l'ID ${idMecha} n'existe pas.`);
      return;
    }
    // Vérifier si le mécha a un bouclier actif
    if (!mecha[idMecha].shield[idShield]) {
      //console.log(`Pas de bouclier actif pour le mécha ${idMecha}.`);
      return;
    }
  
    // Supprimer le bouclier de la scène et du mécha
    scene.remove(mecha[idMecha].shield[idShield]);
    mecha[idMecha].shield[idShield].geometry.dispose(); // Libérer la mémoire associée à la géométrie
    mecha[idMecha].shield[idShield].material.dispose(); // Libérer la mémoire associée au matériau
    delete mecha[idMecha].shield[idShield];
  
    //console.log(`Bouclier supprimé pour le mécha ${idMecha}.`);
  }

function launchFlame(idMecha) {
    // Créer un groupe pour la flamme
    const flameGroup = new THREE.Group();
    
    // Créer la géométrie du cône représentant la flamme
    const flameGeometry = new THREE.ConeGeometry(7, 5, 32, 1, true, 0, Math.PI ); // Cône avec 120° d'ouverture (Math.PI / 3)
    const flameMaterial = new THREE.MeshBasicMaterial({
        color: 0xff6600, // Couleur de la flamme (orange)
        opacity: 0.8, // Transparence
        transparent: true,
        //emissive: 0xff6600, // Effet lumineux
        wireframe: false
    });

    // Créer le cône de la flamme
    const flame = new THREE.Mesh(flameGeometry, flameMaterial);

    // Positionner la flamme devant le mécha
    const mechaUse = mecha[idMecha]; // Assurez-vous que vous avez un tableau de méchas
    flame.position.set(2, mechaUse.position.y, 0); // Placer la flamme devant le mécha

    // Orienter le cône dans la direction du lance-flammes (en direction de l'axe Z du mécha)
    flame.rotation.x = -Math.PI/8 ; // L'orientation du cône sur l'axe X pour l'aligner avec le lance-flammes
    flame.rotation.z = Math.PI / 2; // Ajustement supplémentaire selon le besoin

    flame.boolFlame = true;
    
    // Ajouter la flamme au groupe du mécha
    mechaUse.add(flameGroup);
    flameGroup.add(flame);

    // Animation de la flamme
    let scaleFactor = 0;
    let expanding = true;
    let live = true;

    function animateFlame() {
        if (expanding) {
            scaleFactor += 0.05; // Agrandir le cône pour simuler l'effet de la flamme
            if (scaleFactor > 0.5) { // Limiter la taille maximale de la flamme
                expanding = false;
            }
        } else {
            scaleFactor -= 0.05; // Réduire la taille du cône pour simuler la fin de l'effet
            if (scaleFactor < 0) {
                live = false; // Réinitialiser l'animation de la flamme
            }
        }

        // Appliquer l'échelle à la flamme
        flame.scale.set(scaleFactor, scaleFactor, scaleFactor);

        // Modifier la transparence pour simuler la disparition de la flamme
        flame.material.opacity = scaleFactor > 0.5 ? 0.6 : scaleFactor * 0.4;

        // Appeler à nouveau cette fonction pour continuer l'animation
        if (live) {
            requestAnimationFrame(animateFlame);
        }else{
            scene.remove(flameGroup);
        }
    }
    animateFlame();
}



// Gérer les mouvements via les touches ZQSD
document.addEventListener('keydown', (event) => {
    if (event.key === 'z') keys.z = true;
    if (event.key === 's') keys.s = true;
    if (event.key === 'q') keys.q = true;
    if (event.key === 'd') keys.d = true;
    if (event.key === 'a') keys.a = true;
    if (event.key === 'e') keys.e = true;
    if (event.key === ' ') keys.esp = true;
});

document.addEventListener('keyup', (event) => {
    if (event.key === 'z') keys.z = false;
    if (event.key === 's') keys.s = false;
    if (event.key === 'q') keys.q = false;
    if (event.key === 'd') keys.d = false;
    if (event.key === 'a') keys.a = false;
    if (event.key === 'e') keys.e = false;
    if (event.key === ' ') keys.esp = false;
});
// Gérer le clic gauche de la souris (shoot)
document.addEventListener('mousedown', (event) => {
    if (event.button === 0) { // Clic gauche
        keys.shoot = true;
        //console.log("shoot:", keys.shoot);
    }
});

// Gérer le relâchement du clic gauche
document.addEventListener('mouseup', (event) => {
    if (event.button === 0) { // Clic gauche
        keys.shoot = false;
        //console.log("shoot:", keys.shoot);
    }
});

// Gérer le clic droit de la souris (attack)
document.addEventListener('contextmenu', (event) => {
    event.preventDefault(); // Empêche l'ouverture du menu contextuel
});
document.addEventListener('keydown', (event) => {
    if (event.key === ' ') { // Si la touche espace est pressée
        event.preventDefault(); // Empêche le comportement par défaut (ex. défilement de la page)
    }
});

// Empêcher la sélection de texte via un événement
document.addEventListener('selectstart', (event) => {
    event.preventDefault(); // Empêche la sélection
  });

document.addEventListener('mousedown', (event) => {
    if (event.button === 2) { // Clic gauche
        keys.attack = true;
        //console.log("attack:", keys.attack);
    }
});

// Gérer le relâchement du clic droit
document.addEventListener('mouseup', (event) => {
    if (event.button === 2) { // Clic droit
        keys.attack = false;
        //console.log("attack:", keys.attack);
    }
});

// Déplacer le mécha
function moveMechaUser() {
    if (keys.esp) {
        if (mecha[userMechaId].energie>energieAux) {
            mecha[userMechaId].energie += -energieAux;
            multSpeed = 1.7;
        }else{
            multSpeed = 1;
        }
    }else{
        multSpeed = 1;
    }
    if (keys.a) {
        if (mecha[userMechaId].energie>energieShieldA) {
            mecha[userMechaId].energie += -energieShieldA;
            createShield(userMechaId,"a");
        }else{
            deleteShield(userMechaId,"a");
        }
    }else{
        deleteShield(userMechaId,"a");
    }
    if (keys.e) {
        if (mecha[userMechaId].energie>energieShieldE) {
            mecha[userMechaId].energie += -energieShieldE;
            createShield(userMechaId,"e");
        }else{
            deleteShield(userMechaId,"e");
        }
    }else{
        deleteShield(userMechaId,"e");
    }
    if (keys.z && mecha[userMechaId].position.z -mechaSpeed * multSpeed>-mapSize+1) mecha[userMechaId].position.z -= mechaSpeed * multSpeed;
    if (keys.s && mecha[userMechaId].position.z + mechaSpeed * multSpeed<mapSize-1) mecha[userMechaId].position.z += mechaSpeed * multSpeed;
    if (keys.q && mecha[userMechaId].position.x - mechaSpeed * multSpeed >-mapSize+1) mecha[userMechaId].position.x -= mechaSpeed * multSpeed;
    if (keys.d && mecha[userMechaId].position.x + mechaSpeed * multSpeed<mapSize-1) mecha[userMechaId].position.x += mechaSpeed * multSpeed;
    const currentTimestamp = performance.now(); // Récupère l'heure actuelle
    if (keys.shoot) {
        if (mecha[userMechaId].energie>energieShoot) {
            if (currentTimestamp - cdShoot >= cooldownShoot) {
                mecha[userMechaId].energie += -energieShoot;
                cdShoot = currentTimestamp;
            }
        }
    }
    if (keys.attack) {
        if (mecha[userMechaId].energie>energieAttack) {
            if (currentTimestamp - cdAttack >= cooldownAttack) {
                mecha[userMechaId].energie += -energieAttack;
                cdAttack = currentTimestamp;
                launchFlame(userMechaId);
            }
        }
    }
    // Envoie la position au serveur pour la synchronisation
    socket.emit('updateMechaPosition', {mecha: {id: userMechaId,position: mecha[userMechaId].position, rotation: mecha[userMechaId].rotation.y,health: mecha[userMechaId].health}, Attack: keys.attack,Shoot: keys.shoot, Esp: keys.esp, ShieldA:keys.a, ShieldE:keys.e});
}

// Mettre à jour ou créer des méchas en fonction des données reçues
function createOrUpdateMecha(mechaDataExt) {
    if (mecha[mechaDataExt.id]) {
        // Mise à jour du mécha existant
        mecha[mechaDataExt.id].position.set(mechaDataExt.position.x, mechaDataExt.position.y, mechaDataExt.position.z);
        mecha[mechaDataExt.id].rotation.set(0,mechaDataExt.rotation,0);
        mecha[mechaDataExt.id].health = mechaDataExt.health;
        //console.log(mechaDataExt.blockTir, mechaDataExt.blockAttack);
        if (mechaDataExt.blockTir) {
            createShield(mechaDataExt.id,"e");
        }else{
            deleteShield(mechaDataExt.id,"e");
        }
        if (mechaDataExt.blockAttack) {
            createShield(mechaDataExt.id,"a");
        }else{
            deleteShield(mechaDataExt.id,"a");
        }
        if (mechaDataExt.flame) {
            launchFlame(mechaDataExt.id);
        }

    } else {
        // Création d'un nouveau mécha
        createMecha(mechaDataExt.id,mechaDataExt.position.x, mechaDataExt.position.y, mechaDataExt.position.z, mechaDataExt.rotation, mechaDataExt.health)
        
        //console.log(mechaDataExt);
    }
}

let lastRenderTime = 0;  // Timestamp du dernier rendu
const desiredFPS = 60;   // Fréquence désirée (par exemple 30 FPS)
const frameInterval = 1000 / desiredFPS; // Intervalle en millisecondes entre chaque frame

// Animation de la scène
function animate(timestamp) {
    // Calculer le temps écoulé depuis le dernier rendu
    const timeSinceLastRender = timestamp - lastRenderTime;

    if (timeSinceLastRender >= frameInterval) {
        lastRenderTime = timestamp;
    
    
    if (mecha[userMechaId]) {
        moveMechaUser();
        updateMechaOrientation();
        setCamMecha(userMechaId);
        mecha[userMechaId].updateHUD();
        deleteMechaFar(userMechaId);
        //console.log(mecha[userMechaId].position);
    }else if(mecha[obsMechaId]){
        updateObs();
        deleteMechaFar(obsMechaId);
    }else{
        console.log("waiting");
        if (Math.random()>0.9) {
            getObs();
        }
    }
    removeMechasNotInMechaObject();
    updateLife();
    updateBullets();
    renderer.render(scene, camera);}
    requestAnimationFrame(animate);
}

socket.on('Obs_live',(nearbyMechasData)=>{
    for (const id in nearbyMechasData) {
        if (nearbyMechasData.hasOwnProperty(id)) {
            createOrUpdateMecha(nearbyMechasData[id]);
        }
    }
    setCamMecha(obsMechaId);

});

socket.on('mechaMoved', (nearbyMechasData) => {
    for (const id in nearbyMechasData) {
        if (nearbyMechasData.hasOwnProperty(id)) {
            createOrUpdateMecha(nearbyMechasData[id]);
        }
    }
});

socket.on('userhealth',(data)=>{
    mecha[userMechaId].health=data;
});

socket.on('mechaDisconnected', (data) => {
    let idDisconnected = data.id;
    if (mecha[idDisconnected]) {
       deleteMecha(idDisconnected);
       if (idDisconnected = obsMechaId) {
        getObs();
       }
        console.log(`Mécha avec l'ID ${idDisconnected} supprimé de la scène.`);
    }
});

// Mise à jour des dégâts
socket.on('mechaDamaged', (data) => {
    const { id, health } = data;
    if (mecha[id]) {
        mecha[id].health = health;
        mecha[id].updateHUD();
        console.log(`Mécha ${id} a ${health} points de vie restants.`);
        // Mettre à jour une barre de vie ou autre indicateur visuel
    }
});

// Suppression d'un mécha détruit
socket.on('mechaDestroyed', (data) => {
    let idDestroyed = data;
    if (mecha[idDestroyed]) {
        deleteMecha(idDestroyed);
        if (idDestroyed = obsMechaId) {
            getObs();
           }
        console.log(`Mécha ${idDestroyed} a été détruit.`);
    }
});

function createOrUpdateBullet(data) {
    const { id, x, z, direction } = data;
    
    if (!bullets[id]) {
        // La bullet n'existe pas, création d'un nouvel objet 3D pour la bullet
        const geometry = new THREE.SphereGeometry(0.1, 16, 16); // Petit cercle pour représenter la bullet
        const material = new THREE.MeshBasicMaterial({ color: 0xffff00 }); // Jaune
        const bulletMesh = new THREE.Mesh(geometry, material);

        // Initialisation de la position
        bulletMesh.position.set(x, 0.5, z); // La hauteur est fixe à 0.5

        // Ajout de la bullet à la scène
        scene.add(bulletMesh);

        // Sauvegarde dans le dictionnaire des bullets
        bullets[id] = {
            mesh: bulletMesh,
            direction: direction,
            timestamp: performance.now()
        };
    } else {
        // Si la bullet existe déjà, on met simplement à jour sa position
        bullets[id].mesh.position.set(x, 0.5, z);
    }
}
function updateBullets() {
    const bulletSpeed = 1; // Vitesse des bullets

    Object.keys(bullets).forEach(id => {
        const bullet = bullets[id];
        const direction = bullet.direction;

        // Déplacer la bullet dans la direction donnée
        bullet.mesh.position.x += direction.x * bulletSpeed;
        bullet.mesh.position.z += direction.z * bulletSpeed;
        if (performance.now() - bullet.timestamp>1000) {
            scene.remove(bullet.mesh); // Retirer de la scène
            delete bullets[id]; // Supprimer du dictionnaire
            //console.log("bullet end");
        }

        // Supprimer la bullet si elle dépasse les limites de la scène
        if (bullet.mesh.position.x > mapSize || bullet.mesh.position.x < -mapSize ||
            bullet.mesh.position.z > mapSize || bullet.mesh.position.z < -mapSize) {
            scene.remove(bullet.mesh); // Retirer de la scène
            delete bullets[id]; // Supprimer du dictionnaire
        }
    });
}
socket.on('bullet',(data)=>{
    createOrUpdateBullet(data);
});
socket.on('endBullet', (id)=>{
    scene.remove(bullets[id].mesh); // Retirer de la scène
    delete bullets[id];
});

//
function updateLife() {
    for (let id in mecha) {
        mecha[id].updateHUD();
    }
}

// Lancer l'initialisation de la scène
init();

// Gérer le clic sur le bouton "Tester"
document.getElementById('test-button').addEventListener('click', () => {
    deleteMyMecha();
    createMechaUser();  // Émettre un événement "tester" pour créer un mécha côté serveur
});

function updateBarreEnergie() {
    const barre = document.getElementById('barreEnergieVide');
    const barreEnergie = document.getElementById('barreEnergie');

    if (mecha[userMechaId] && mecha[userMechaId].energie !== undefined) {
        const energie = mecha[userMechaId].energie;
        const energieMax = 100; // Valeur maximale d'énergie

        // Affiche la barre
        barre.style.display = 'block';

        // Calcule la largeur en pourcentage en fonction de l'énergie actuelle
        const pourcentage = Math.max(0, Math.min(energie / energieMax * 100, 100));
        barreEnergie.style.width = `${pourcentage}%`;

        // Change la couleur selon l'énergie restante (ex : vert, orange, rouge)
        if (pourcentage > 50) {
            barreEnergie.style.backgroundColor = '#00ff00'; // Vert
        } else if (pourcentage > 25) {
            barreEnergie.style.backgroundColor = '#ff9900'; // Orange
        } else {
            barreEnergie.style.backgroundColor = '#ff0000'; // Rouge
        }

        if (mecha[userMechaId].energie<100) {
            mecha[userMechaId].energie+=regenEnergie;
        }
    } else {
        // Cache la barre si l'énergie n'est pas définie
        barre.style.display = 'none';
    }
}

// Fonction pour calculer la distance entre deux positions
function getDistance(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

function deleteMechaFar(id) {
    for (let idMecha in mecha ){  
        if (getDistance(mecha[idMecha].position,mecha[id].position)>50) {
            deleteMecha(idMecha);
        }    
    }
}

// Mettre à jour la barre d'énergie toutes les 100 ms
setInterval(updateBarreEnergie, 100);

window.addEventListener('beforeunload', (event) => {
    // Exemple d'action : notifier le serveur de la déconnexion
    socket.emit('disconnect', { userMechaId });
});




