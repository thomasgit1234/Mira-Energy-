# Image de l'application (déploiement / démo). Le développement quotidien n'en a pas besoin :
# `npm run dev` suffit. NON TESTÉ dans l'environnement de création.
FROM node:22-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npm ci
COPY . .
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=build /app ./
EXPOSE 3000
CMD ["npm", "run", "start"]
