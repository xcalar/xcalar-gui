FROM node:6


ENV PATH=/app/node_modules/.bin:$PATH


COPY . /app
RUN chown -R node:node /app
WORKDIR /app

USER node
RUN npm install

EXPOSE 12124

CMD ["npm","start"]
