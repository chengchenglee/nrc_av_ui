## 🏗️ Preparing

```
git clone https://github.com/niskyB/nrc_av_ops.git
```

## 🎯 Deployment

```
cd ./nrc_av_ops
git submodule init
git submodule update --remote
```

#### ⚓ For production

- Go to folder **nrc_av_ops/production**
- Modify **FRONTEND_HOST** and **BACKEND_HOST** in environment file **nrc_av_ops/production/.env.production** to point to correct IP or domain name.
- Then run command below:

```
docker-compose --env-file ./.env.production -p nrc_av_deploy_prod up -d
```

**Note**: we can also configure other environment variables in the **.env.production** file depending on our environment.

**Note**: we can use **./docker-manager.sh** for easier deployment.

#### ⚓ For development

- Go to folder **nrc_av_ops/development**
- Modify **FRONTEND_HOST** and **BACKEND_HOST** in environment file **nrc_av_ops/development/.env.development** to point to correct IP or domain name.
- Then run command below:

```
docker-compose --env-file ./.env.development -p nrc_av_deploy_dev up -d
```

**Note**: we can also configure other environment variables in the **.env.development** file depending on our environment.

**Note**: we can use **./docker-manager-dev.sh** for easier deployment.
