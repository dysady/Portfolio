CREATE SCHEMA MechAI

CREATE TABLE players (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mechas (
    id SERIAL PRIMARY KEY,
    player_id INT REFERENCES players(id) ON DELETE CASCADE,
    position_x FLOAT DEFAULT 0,
    position_y FLOAT DEFAULT 0,
    orientation FLOAT DEFAULT 0,
    energy INT DEFAULT 100,
    state VARCHAR(50) DEFAULT 'idle',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE buildings (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    position_x FLOAT NOT NULL,
    position_y FLOAT NOT NULL,
    state VARCHAR(50) DEFAULT 'intact',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE actions (
    id SERIAL PRIMARY KEY,
    mecha_id INT REFERENCES mechas(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    energy_cost INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
