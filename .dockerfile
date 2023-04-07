FROM node:lts-alpine3.17

RUN apk add --no-cache tzdata

ENV TZ Europe/Moscow

WORKDIR /API

COPY package.json ./
COPY package-lock.json ./

RUN npm install

COPY . .

RUN npm rebuild bcrypt

EXPOSE 3000

# ENTRYPOINT ["startup.sh"]
# ENTRYPOINT ["npx", "prisma","generate"]
# RUN npx prisma db push
# RUN npx prisma generate


CMD ["npm","run","start:migrate"]
# CMD ["startup.sh"]