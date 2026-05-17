# ----------- BUILD STAGE -----------
FROM maven:3.9.14-eclipse-temurin-25 AS build
WORKDIR /app

COPY pom.xml ./
RUN mvn -B -DskipTests dependency:go-offline

COPY src ./src
RUN mvn -B -DskipTests clean package

# ----------- RUNTIME STAGE -----------
FROM gcr.io/distroless/java21-debian12

WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8082

ENTRYPOINT ["java", "-jar", "/app/app.jar"]