#!/usr/bin/python

from interface_main import *

bravo_machines = [
   {"name": "GPSBASE", "addr":"ddl-ntrip.stanford.edu"},
   {"name": "KITT",    "addr":"doris.ail-sv.com"},
   {"name": "TIME",    "addr":"10.152.36.31"},
   {"name": "NUVO",    "addr":"10.152.36.20"},
   {"name": "NUC1",    "addr":"10.152.36.21"},
   {"name": "NUC2",    "addr":"10.152.36.22"},
   {"name": "NUC3",    "addr":"10.152.36.23"},
   {"name": "NUC4",    "addr":"10.152.36.24"},
   {"name": "ZBOXTL",  "addr":"10.152.36.200"},
   {"name": "ZBOX01",  "addr":"10.152.36.201"},
   {"name": "ZBOX02",  "addr":"10.152.36.202"},
   {"name": "ZBOX03",  "addr":"10.152.36.203"}
]

charlie_machines = [
 {"name": "GPSBASE","addr": "ddl-ntrip.stanford.edu"},
 {"name": "KITT",   "addr": "doris.ail-sv.com"},
 {"name": "TIME",   "addr": "10.152.36.31"},
 {"name": "leafmry","addr": "10.152.36.20"},
 {"name": "mrcy01", "addr": "10.152.36.21"},
 {"name": "mrcy02", "addr": "10.152.36.22"},
 {"name": "mrcy03", "addr": "10.152.36.23"}
]

echo_machines = [

 {"name": "GPSBASE", "addr": "ddl-ntrip.stanford.edu"},
 {"name": "KITT",    "addr": "doris.ail-sv.com"},
 {"name": "TIME",    "addr": "10.152.36.31"},
 {"name": "ECHO",    "addr": "10.152.36.20"}

]

foxtrot_machines = [

 {"name": "GPSBASE", "addr": "ddl-ntrip.stanford.edu"},
 {"name": "KITT",    "addr": "doris.ail-sv.com"},
 {"name": "TIME",    "addr": "10.152.36.31"},
 {"name": "node01",  "addr": "192.168.210.11"},
 {"name": "node02",  "addr": "192.168.210.12"},
 {"name": "node03",  "addr": "192.168.210.13"},
 {"name": "node04",  "addr": "192.168.210.14"},
 {"name": "node05",  "addr": "192.168.210.15"}

]

interfaceHealth(foxtrot_machines)

