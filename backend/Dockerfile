FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
# ก๊อปปี้ไฟล์ที่ Build เสร็จจากเครื่องเราเข้าไปใน Docker
COPY target/*.jar app.jar
EXPOSE 8070
ENTRYPOINT ["java", "-jar", "app.jar"]
