# ---- Shared dependencies ----
FROM node:20-alpine AS dependencies

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

# ---- Development server with file watching ----
FROM dependencies AS development

COPY . .

EXPOSE 4200

CMD ["npm", "start", "--", "--host", "0.0.0.0", "--poll", "1000"]

# ---- Production build ----
FROM dependencies AS build

COPY . .

RUN npx ng build --configuration production --no-progress --delete-output-path=true

# ---- Production server ----
FROM nginx:alpine AS production

RUN rm -rf /usr/share/nginx/html/*

COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 4200

CMD ["nginx", "-g", "daemon off;"]
