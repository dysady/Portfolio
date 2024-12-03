class IAaleatoire{
    constructor() {
        // Initialisation des paramètres pour l'IA renforcée
    }

    act(gameState) {
        // Fonction utilitaire pour générer un booléen aléatoire
        const randomBool = () => Math.random() > 0.8;

        // Fonction utilitaire pour choisir une direction de rotation aléatoire (-1, 0, 1)
        const randomRotation = () => Math.floor(Math.random() * 3) - 1; // -1 (gauche), 0 (pas de rotation), 1 (droite)

        // Retourne des actions aléatoires
        return {
            z: randomBool(),        // Aller en avant
            q: randomBool(),        // Aller à gauche
            s: randomBool(),        // Aller en arrière
            d: randomBool(),        // Aller à droite
            a: randomBool(),        // Action secondaire (ex : esquive)
            e: randomBool(),        // Action secondaire (ex : bouclier)
            esp: randomBool(),      // Action spéciale (espace, peut-être sauter ou booster)
            attack: randomBool(),   // Attaque de mêlée
            shoot: randomBool(),    // Tirer un projectile
            rotation: randomRotation() // Rotation aléatoire
        };
    }
}

module.exports = IAaleatoire; // Exporter la classe