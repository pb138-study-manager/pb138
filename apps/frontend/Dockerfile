FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

# Copy the rest of the source. This includes apps/frontend/.env, which Vite
# loads at build time and inlines every VITE_* var into the client bundle.
# (.env is NOT excluded by .dockerignore — keep it that way.)
COPY . .

# Fail the build loudly if the env file is missing, instead of silently
# baking undefined Supabase keys into the bundle ("Invalid API Key" at runtime).
RUN test -f .env || (echo "ERROR: apps/frontend/.env is missing — VITE_SUPABASE_* would be undefined" && exit 1)

RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Ensure you have this nginx.conf in your frontend folder to handle SPA routing!
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
