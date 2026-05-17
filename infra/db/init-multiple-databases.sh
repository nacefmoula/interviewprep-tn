#!/bin/bash
set -e

echo "Création des bases de données..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    SELECT 'CREATE DATABASE userdb'
        WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'userdb')\gexec

    SELECT 'CREATE DATABASE interviewdb'
        WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'interviewdb')\gexec

    SELECT 'CREATE DATABASE trainingdb'
        WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'trainingdb')\gexec

    SELECT 'CREATE DATABASE keycloakdb'
        WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'keycloakdb')\gexec

    SELECT 'CREATE DATABASE communitydb'
        WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'communitydb')\gexec

    SELECT 'CREATE DATABASE mentorship_db'
        WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'mentorship_db')\gexec

    SELECT 'CREATE DATABASE quizdb'
        WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'quizdb')\gexec

    SELECT 'CREATE DATABASE resourcedb'
        WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'resourcedb')\gexec

    GRANT ALL PRIVILEGES ON DATABASE userdb TO $POSTGRES_USER;
    GRANT ALL PRIVILEGES ON DATABASE interviewdb TO $POSTGRES_USER;
    GRANT ALL PRIVILEGES ON DATABASE trainingdb TO $POSTGRES_USER;
    GRANT ALL PRIVILEGES ON DATABASE keycloakdb TO $POSTGRES_USER;
    GRANT ALL PRIVILEGES ON DATABASE communitydb TO $POSTGRES_USER;
    GRANT ALL PRIVILEGES ON DATABASE mentorship_db TO $POSTGRES_USER;
    GRANT ALL PRIVILEGES ON DATABASE quizdb TO $POSTGRES_USER;
    GRANT ALL PRIVILEGES ON DATABASE resourcedb TO $POSTGRES_USER;
EOSQL

echo "Bases de données créées avec succès !"
