FROM node:20-alpine3.22 AS builder

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_API_URL=$VITE_API_URL

COPY frontend/ ./

RUN rm -f .env .env.local .env.production .env.production.local

RUN npm run build

FROM nginx:1.28-alpine AS production

COPY --from=builder /app/dist /usr/share/nginx/html/chord-shift

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]