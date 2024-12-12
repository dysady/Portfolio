#!/bin/bash

# Fonction pour vérifier si Node.js est installé
check_node_installed() {
    if command -v node &> /dev/null; then
        echo "Node.js est déjà installé"
    else
        echo "Node.js n'est pas installé. Installation en cours..."
        install_node
    fi
}

# Fonction pour vérifier si npm est installé
check_npm_installed() {
    if command -v npm &> /dev/null; then
        echo "npm est déjà installé"
    else
        echo "npm n'est pas installé. Cela devrait être installé avec Node.js."
        exit 1
    fi
}

# Fonction pour installer Node.js via NVM (Node Version Manager)
install_node() {
    # Télécharger et installer NVM (si nvm n'est pas déjà installé)
    echo "Installation de Node.js via NVM (Node Version Manager)..."

    # Installer NVM si ce n'est pas déjà fait
    if ! command -v nvm &> /dev/null; then
        echo "NVM n'est pas installé, installation de NVM..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
        # Recharger la configuration de nvm dans le terminal
        source ~/.bashrc
    fi

    # Installer la dernière version stable de Node.js
    nvm install --lts
    nvm use --lts
}

# Fonction pour installer MongoDB
install_mongodb() {
    if command -v mongod &> /dev/null; then
        echo "MongoDB est déjà installé"
    else
        echo "MongoDB n'est pas installé. Installation en cours..."

        # Installer MongoDB (pour Ubuntu/Debian)
        echo "Ajout du dépôt MongoDB à votre liste de sources..."
        sudo apt-get update
        sudo apt-get install -y mongodb

        # Démarrer MongoDB
        echo "Démarrage de MongoDB..."
        sudo systemctl start mongodb
        sudo systemctl enable mongodb

        echo "MongoDB installé et démarré."
    fi
}

# Fonction pour installer Redis
install_redis() {
    if command -v redis-server &> /dev/null; then
        echo "Redis est déjà installé"
    else
        echo "Redis n'est pas installé. Installation en cours..."

        # Installer Redis (pour Ubuntu/Debian)
        sudo apt-get update
        sudo apt-get install -y redis-server

        # Démarrer Redis
        echo "Démarrage de Redis..."
        sudo systemctl start redis
        sudo systemctl enable redis

        echo "Redis installé et démarré."
    fi
}

# Fonction pour installer les dépendances avec npm
install_dependencies() {
    echo "Installation des dépendances à partir de package.json..."
    npm install
}

# Vérifier si Node.js est installé, sinon l'installer
check_node_installed

# Vérifier si npm est installé
check_npm_installed

# Installer MongoDB si nécessaire
#install_mongodb

# Installer Redis si nécessaire
#install_redis

# Installer les dépendances du projet
install_dependencies

echo "Installation terminée !"
