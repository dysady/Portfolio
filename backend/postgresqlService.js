const { Pool } = require('pg');
const tf = require('@tensorflow/tfjs-node');  // Pour utiliser TensorFlow.js avec Node.js
const fs = require('fs');
const path = require('path');

class PostgresqlService {
    constructor() {
        // Créer un pool de connexions PostgreSQL
        this.pool = new Pool({
            user: 'postgres',
            host: 'localhost',
            database: 'test1',
            password: 'Angely29*',
            port: 5433,  // Port par défaut pour PostgreSQL
        });
    }

    async connect() {
        const client = await this.pool.connect();
        return client;
    }

    async createSchema() {
        const client = await this.connect();
        try {
            // Créer le schéma et la table pour stocker le modèle
            await client.query(`
                DROP SCHEMA IF EXISTS portfolio CASCADE;
                CREATE SCHEMA IF NOT EXISTS portfolio;
                
                CREATE TABLE IF NOT EXISTS portfolio.models (
                    id SERIAL PRIMARY KEY,
                    model_name VARCHAR(255) NOT NULL,
                    model_data BYTEA NOT NULL, 
                    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
                );
            `);
        } finally {
            client.release();
        }
    }

    async saveModel(model, modelName = 'default_model') {
        const client = await this.connect();
        try {
            // Sérialiser le modèle en un tableau de bytes (Buffer)
            const modelBuffer = await this.serializeModel(model);

            // Insérer le modèle dans la base de données
            const result = await client.query(`
                INSERT INTO portfolio.models (model_name, model_data)
                VALUES ($1, $2)
                RETURNING id;
            `, [modelName, modelBuffer]);

            return result.rows[0].id;  // Retourne l'ID du modèle inséré
        } finally {
            client.release();
        }
    }

    async loadModel(modelName = 'default_model') {
        const client = await this.connect();
        try {
            // Récupérer le modèle depuis la base de données
            const result = await client.query(`
                SELECT model_data FROM portfolio.models WHERE model_name = $1 LIMIT 1;
            `, [modelName]);

            if (result.rows.length === 0) {
                throw new Error('Model not found');
            }

            // Désérialiser les données du modèle
            const modelBuffer = result.rows[0].model_data;
            const model = await this.deserializeModel(modelBuffer);

            return model;
        } finally {
            client.release();
        }
    }

    // Sérialiser un modèle TensorFlow en format binaire (Buffer)
    async serializeModel(model) {
        const modelJson = await model.save('file://model_temp');
        const modelPath = path.join(__dirname, 'model_temp', 'model.json');
        const modelBuffer = fs.readFileSync(modelPath);

        // Supprimer le fichier temporaire après la lecture
        fs.rmdirSync(path.join(__dirname, 'model_temp'), { recursive: true });

        return modelBuffer;
    }

    // Désérialiser un modèle à partir du buffer binaire
    async deserializeModel(modelBuffer) {
        // Sauvegarder les données dans un fichier temporaire pour que TensorFlow puisse les lire
        const tempDir = path.join(__dirname, 'model_temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }

        const modelPath = path.join(tempDir, 'model.json');
        fs.writeFileSync(modelPath, modelBuffer);

        // Charger le modèle depuis le fichier
        const model = await tf.loadLayersModel(`file://${modelPath}`);
        return model;
    }
}

module.exports = new PostgresqlService();
