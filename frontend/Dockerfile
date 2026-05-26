FROM node:24.15.0-bookworm-slim

WORKDIR /app

# We copy package.json first because if this hasn't changed then the docker build will skip this step speeding things up.
COPY package.json package-lock.json ./
RUN npm ci

# We copy the rest of the project (these are things that will constantly be changing)
# We can also setup a volume to mount the project so when you make changes the server will pick them up automatically.
COPY . .

ARG VITE_API_URL
ARG VITE_CLOUDINARY_CLOUD_NAME
ARG VITE_CLOUDINARY_UPLOAD_PRESET
ARG VITE_FAKEBAY_AUTH_PUBLIC_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_CLOUDINARY_CLOUD_NAME=$VITE_CLOUDINARY_CLOUD_NAME
ENV VITE_CLOUDINARY_UPLOAD_PRESET=$VITE_CLOUDINARY_UPLOAD_PRESET
ENV VITE_FAKEBAY_AUTH_PUBLIC_URL=$VITE_FAKEBAY_AUTH_PUBLIC_URL

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
