FROM node:hydrogen-alpine3.17 AS build

WORKDIR /app

COPY . .

RUN yarn ci
RUN yarn build

# Clean devDependencies
RUN yarn ci --prod

###################
# PRODUCTION
###################

FROM node:hydrogen-alpine3.17

WORKDIR /app

# Copy the bundled code from the build stage to the production image
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# Start the server using the production build
CMD [ "node", "dist/main.js" ]
