FROM eclipse-temurin:21-jdk-jammy AS build

WORKDIR /workspace
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw --batch-mode dependency:go-offline -DskipTests
COPY src/ src/
RUN ./mvnw --batch-mode package -DskipTests

FROM eclipse-temurin:21-jre-jammy

RUN groupadd --gid 10001 equio && useradd --uid 10001 --gid equio --no-create-home --shell /usr/sbin/nologin equio
WORKDIR /app
COPY --from=build --chown=10001:10001 /workspace/target/*.jar /app/equio.jar

ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70.0 -XX:InitialRAMPercentage=20.0 -XX:+ExitOnOutOfMemoryError -XX:ActiveProcessorCount=1"
ENV TZ=America/Lima
EXPOSE 8081
USER 10001:10001

ENTRYPOINT ["java", "-jar", "/app/equio.jar"]
