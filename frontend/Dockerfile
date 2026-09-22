FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
# ใช้ Mirror ของ NPM เพื่อความเร็วและลดโอกาสเน็ตตัด
RUN npm config set registry https://registry.npmmirror.com
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# สร้าง Non-root User เพื่อความปลอดภัย ป้องกัน RCE / Malware
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# ดึงเฉพาะไฟล์ที่จำเป็นสำหรับการรัน (แบบ Standalone)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/public ./.next/standalone/public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
