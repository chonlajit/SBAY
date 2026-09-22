FROM maven:3.9.5-eclipse-temurin-17 AS builder
WORKDIR /app

# คัดลอก pom.xml และ src
COPY pom.xml .
COPY src ./src

# ป้องกันปัญหา SSL peer shut down / MTU packet drop ด้วย IPv4 และ Retry flags
RUN mvn -B clean package -DskipTests \
    -Djava.net.preferIPv4Stack=true \
    -Dhttps.protocols=TLSv1.2,TLSv1.3 \
    -Dhttp.keepAlive=false \
    -Dmaven.wagon.http.pool=false \
    -Dmaven.wagon.http.retryHandler.count=5 \
    -Dmaven.wagon.http.ssl.insecure=true \
    -Dmaven.wagon.http.ssl.allowall=true

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8070
ENTRYPOINT ["java", "-jar", "app.jar"]
