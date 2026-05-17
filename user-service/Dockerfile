FROM maven:3.9.14-eclipse-temurin-25 AS build
WORKDIR /app

COPY pom.xml ./
RUN mvn -DskipTests dependency:go-offline

COPY src ./src
RUN mvn -DskipTests clean package

FROM eclipse-temurin:21-jre
WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8081
ENTRYPOINT ["java", "-jar", "/app/app.jar"]