# Utilise la même version que ton collègue pour éviter les bugs
FROM maven:3.9.15-eclipse-temurin-26-alpine AS builder
WORKDIR /app

# On copie le pom.xml pour télécharger les dépendances (cache)
COPY pom.xml .
COPY src ./src
RUN mvn -B -DskipTests package

# Image finale légère pour l'exécution
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar

# ATTENTION : Ton Quiz Service utilise le port 8082
EXPOSE 8082
ENTRYPOINT ["java", "-jar", "app.jar"]