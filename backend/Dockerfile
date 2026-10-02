FROM maven:3.9.6-eclipse-temurin-17 AS builder
WORKDIR /app

# 1. คัดลอก pom.xml เพื่อทำ cache layer ของ dependencies
COPY pom.xml .

# 2. ดาวน์โหลด dependencies และ plugins เก็บไว้ใน BuildKit cache
RUN --mount=type=cache,target=/root/.m2 mvn dependency:go-offline -B || true

# 3. คัดลอก src แล้ว build jar
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -B clean package -DskipTests \
    -Djava.net.preferIPv4Stack=true \
    -Dmaven.wagon.http.pool=true \
    -Dmaven.wagon.http.retryHandler.count=3

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8070
ENTRYPOINT ["java", "-jar", "app.jar"]

