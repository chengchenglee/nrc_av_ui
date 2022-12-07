#!/usr/bin/python

from interface_main import *

agent_name = "Serena"

machines = [
# {"name": "GPSBASE", "addr": "ddl-ntrip.stanford.edu"},
# {"name": "KITT",    "addr": "doris.ail-sv.com"},
# {"name": "TIME",    "addr": "10.152.36.31"},
# {"name": "node01",  "addr": "192.168.210.11"},
  {"name": "node01","addr": "localhost"},
  {"name": "internet","addr": "google.com"},
 ]

sensors = [
# {"name": "Car",     "errRate": 15,"warnRate": 35,"topicName": "/controller_state", "topicType": ControllerState},
# {"name": "GPSCONV", "errRate": 60, "warnRate": 80, "topicName": "/dynamic_global_pose_conv", "topicType": DynamicPoseWithCovar},
# {"name": "GPS",     "errRate": 10, "warnRate": 80, "topicName": "/dynamic_global_pose", "topicType": DynamicPoseWithCovar},
 {"name": "gps_state", "errRate": 0.2,  "warnRate": 0.5, "topicName": "/gps_state", "topicType": GpsState},
 {"name": "ev_can", "errRate": 10,  "warnRate": 20, "topicName": "/evcan_data", "topicType": SerenaEVcan},
 {"name": "its_can", "errRate": 10,  "warnRate": 20, "topicName": "/itscan_data", "topicType": SerenaITScan},
 {"name": "v_can", "errRate": 10,  "warnRate": 20, "topicName": "/vcan_data", "topicType": SerenaVcan},
]

algs = [
 {"name": "monitor", "errRate": 0.2,  "warnRate": 0.5, "topicName": "/serena/epower_status", "topicType": SerenaStatus},
 {"name": "flares", "errRate": 0.2,  "warnRate": 0.5, "topicName": "/serena/engine_request", "topicType": SerenaEngineRequest},
#{"name": "bsm", "errRate": 0.2,  "warnRate": 0.5, "topicName": "/serena/bsm", "topicType": BSM},
]

cmds = [
  {"name": "ALL",      "command": " ", "nodes" : " "},
#  {"name": "tf_sys",   "command": "roslaunch nrc_svcs leaf_tf_subsystem.launch sanborn:=true"},
#  {"name": "telemetry","command": "roslaunch nrc_svcs telemetry_bridge.launch agent_name:=NRC_Leaf_Foxtrot", "inclByDef" : False},
  {"name": "serena_can_readers", "command": "roslaunch nrc_leaf serena_can_com.launch", "nodes": "/can_com_controller"},
  {"name": "serena_gps",         "command": "rosrun online gps_node.py --port /dev/ttyUSB1", "nodes": "/serena_gps"},
  {"name": "serena_monitor",     "command": "rosrun online serena_can_monitor.py", "nodes": "/can_monitor"},
  {"name": "relays",             "command": "rosrun online engine_actuation.py", "nodes": "/engine_actuation"
       },
#  {"name": "flares",  "command": "~~~ TBD ~~~"},
]

interfaceHealth(agent_name, machines, sensors, algs, cmds)
