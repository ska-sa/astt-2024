# ---- Stage 1: Build Angular App ----
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .

# Build Angular (production)
RUN npx ng build --configuration production --no-progress --delete-output-path=true

# ---- Stage 2: Serve with Nginx ----
FROM nginx:alpine

# Remove default Nginx web files
RUN rm -rf /usr/share/nginx/html/*

# Copy the built Angular app (adjusted for Angular 19 output path)
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose Angular port
EXPOSE 4200

CMD ["nginx", "-g", "daemon off;"]
