import tensorflow as tf
import numpy as np
import sys
import json

# Charger le modèle (à adapter à vos besoins)
class IADQN:
    def __init__(self, state_size, action_size):
        self.state_size = state_size
        self.action_size = action_size
        self.model = self._build_model()

    def _build_model(self):
        model = tf.keras.Sequential([
            tf.keras.layers.Dense(24, input_shape=(self.state_size,), activation='relu'),
            tf.keras.layers.Dense(24, activation='relu'),
            tf.keras.layers.Dense(self.action_size, activation='linear')
        ])
        model.compile(optimizer='adam', loss='mean_squared_error')
        return model

    def predict(self, state):
        state = np.array(state).reshape(1, -1)
        return self.model.predict(state)

def main():
    # Lecture des arguments de la ligne de commande
    input_data = sys.stdin.read()
    data = json.loads(input_data)

    state = data['state']
    state_size = data['state_size']
    action_size = data['action_size']

    # Créer l'instance du modèle IA
    ia = IADQN(state_size, action_size)

    # Effectuer la prédiction
    q_values = ia.predict(state)
    best_action_index = np.argmax(q_values)

    # Retourner l'action choisie sous forme de dictionnaire
    response = {
        'action': best_action_index
    }

    print(json.dumps(response))

if __name__ == "__main__":
    main()
