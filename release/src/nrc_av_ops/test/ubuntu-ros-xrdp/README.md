# Create an Agent in Docker

```bash
sudo apt install jq
./run.sh machines.json
```

### Create default users

This file contains 3 fields (username:password:is_sudo). Where username is the login id. Password is the password. is_sudo does the user have sudo access(only Y is recognised). It also needs a "newline" at the end of the line.

Example of a CREATEUSERS.TXT file

```
mickey:mouse:N
daisy:duke:Y
dog:flash:n
morty:rick:wubba
```

In this example 4 users will be created and only daisy will have sudo rights.
At every reboot it will check this file and ADD any new users.

### Startup commands

Example of a STARTUP.SH file to change locale.

```
apt-get update
apt-get -y install language-pack-de language-pack-gnome-de
locale-gen de_DE.UTF-8
update-locale LANG=de_DE.UTF-8
```

At every reboot it will run this file.

### SSH key

- Put your private and public file into folder **resources/.ssh**
- Modify variable **SSH_PRIVATE_KEY_PATH** and **SSH_PUBLIC_KEY_PATH** in file **run.sh**
