## Preparing
```
git clone https://github.com/niskyB/nrc_av_ops.git
cd ./nrc_av_ops
git submodule init
git submodule update --remote
```
## Deploy
```
docker-compose -f ./docker-compose.yml --env-file ./.env.production up -d
```