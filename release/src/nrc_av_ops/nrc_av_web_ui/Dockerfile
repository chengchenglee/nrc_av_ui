FROM node:hydrogen-alpine3.17 AS build

RUN apk add xdg-utils --update

WORKDIR /app

COPY . .

RUN yarn ci

RUN yarn build

###################
# PRODUCTION
###################

FROM nginx:stable-alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY --from=build /app/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
