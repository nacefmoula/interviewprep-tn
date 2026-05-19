FROM maven:3.9.15-eclipse-temurin-26 AS builder
WORKDIR /app

COPY pom.xml .
RUN mvn -Dmaven.wagon.http.retryHandler.count=5 \
         -Dmaven.wagon.httpconnectionManager.ttlSeconds=25 \
         dependency:go-offline

COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app

COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8087

ENTRYPOINT ["java", "-jar", "app.jar"]
