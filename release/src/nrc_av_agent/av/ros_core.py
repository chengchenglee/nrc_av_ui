#!/usr/bin/python

from main import *

agent_name = "KellyTest"

machines = [
 {"name": "GPSBASE", "addr": "ddl-ntrip.stanford.edu"},
 ]

sensors = [
 {"name": "CAR",     "errRate": 3,  "warnRate": 6,  "topicName": "/CtrlStateFLG",                  "topicType": CtrlStateFLG},
 {"name": "GPS",     "errRate": 3, "warnRate": 8, "topicName": "/dynamic_global_pose",            "topicType": DynamicPoseWithCovar},
]

algs = [
 {"name": "DRV_A",  "errRate": 3,  "warnRate": 7,  "topicName": "/drivable_area_boundary_points",          "topicType": PointCloud2},
 {"name": "VIS_SP", "errRate": 3,  "warnRate": 5,  "topicName": "/visible_space_data",                     "topicType": VisibleSpace},
]

cmds = [
  {"name": "ALL",      "command": " ", "nodes" : " "},
  {"name": "1 sim1",   "command": "roslaunch nrc_av_ui sim1.launch", "inclByDef" : False},
  {"name": "1 sim2",   "command": "rosrun nrc_av_ui sim2", "inclByDef" : False},
]

# the dest_list refers to the finel goal point only
# (and not the starting point)
dest_list = [
    {"name": "Dest 0", "posX": 4695.0, "posY": -1138.0,  "posTh": -3.066},
]

multi_dest_list = [
    {"name": "Autonomy 5k v1", "dests": [
            {"posX": 4695.0, "posY": -1138.0,  "posTh": -3.066},
            {"posX": 4017.0, "posY": -776.0,   "posTh":  1.607},
            {"posX": 3462.0, "posY": -648.0,   "posTh": -3.066},
            {"posX": 3336.0, "posY": -596.0,   "posTh": -1.603},
            {"posX": 3834.0, "posY": -1720.0,  "posTh": -1.603},
            {"posX": 4907.0, "posY": -1862.0,  "posTh": 0.0},
            {"posX": 4700.0, "posY": -2200.0,  "posTh": -3.066},
        ]
    },
]

interfaceHealth(agent_name, machines, sensors, algs, cmds, dest_list, multi_dest_list)

