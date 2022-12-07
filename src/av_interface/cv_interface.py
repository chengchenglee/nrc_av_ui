#!/usr/bin/python

from interface_main import *

name = "CV Interface"

machines = [
 {"name": "SwiftNav",   "addr": "192.168.0.222"},
 {"name": "Self",       "addr": "localhost"},
 {"name": "TIME",       "addr": "10.152.36.31"},
 ]

sensors = [
 {"name": "Swift-GPS",   "errRate": 10,  "warnRate": 80,  "topicName": "/piksi/navsatfix_best_fix", "topicType": NavSatFix},
 {"name": "Swift-Conv",  "errRate": 10,  "warnRate": 80, "topicName": "/dynamic_global_pose",       "topicType": DynamicPoseWithCovar},
 {"name": "CAN",         "errRate": 15,  "warnRate": 35, "topicName": "/CAN_V_reader",              "topicType": CANVReader},
 {"name": "ME3Prod",     "errRate": 6,   "warnRate": 10, "topicName": "/ME3_ObjData",               "topicType": Mobileye3ObjectArray},
# {"name": "Eyeq4",      "errRate": 0.2, "warnRate": 0.3,"topicName": "/ME4_ObjData",               "topicType": Mobileye4ObjectArray},
]


algs = [
 {"name": "WOS",      "errRate": 3,    "warnRate": 7,  "topicName": "/master_filter/object_database",                                 "topicType": TrackedObjectHypothesisSet},
 {"name": "M_Rte",    "errRate": 0.5,  "warnRate": 1,  "topicName": "/modia/route_plan/health",                                       "topicType": DiagnosticArray},
 #{"name": "M_Ma_Ab", "errRate": 0.5,  "warnRate": 1,  "topicName": "/modia/information/get_extracted_metric_map...",                  "topicType": TODO},
 {"name": "M_In_Ab",  "errRate": 0.5,  "warnRate": 1,  "topicName": "/modia/information/intersection",                                "topicType": IntersectionInformation},
 {"name": "M_Ve_Ab",  "errRate": 0.5,  "warnRate": 1,  "topicName": "/modia/information/vehicle",                                     "topicType": VehicleInformation},
 {"name": "M_Pe_Ab",  "errRate": 0.5,  "warnRate": 1,  "topicName": "/modia/information/pedestrian",                                  "topicType": PedestrianInformation},
 {"name": "M_Bl_Ab",  "errRate": 3,    "warnRate": 5,  "topicName": "/modia/information/blocking",                                    "topicType": BlockingInformation},
 {"name": "M_St_St",  "errRate": 3,    "warnRate": 5,  "topicName": "/modia/decision_components/stop_stop/decisions",                 "topicType": MODIADecisions},
 {"name": "M_St_Un",  "errRate": 3,    "warnRate": 5,  "topicName": "/modia/decision_components/stop_uncontrolled/decisions",         "topicType": MODIADecisions},
 {"name": "M_Un_Un",  "errRate": 3,    "warnRate": 5,  "topicName": "/modia/decision_components/uncontrolled_uncontrolled/decisions", "topicType": MODIADecisions},
 {"name": "M_Tr_Lt",  "errRate": 3,    "warnRate": 5,  "topicName": "/modia/decision_components/traffic_light/decisions",             "topicType": MODIADecisions},
 {"name": "M_Ped",    "errRate": 3,    "warnRate": 5,  "topicName": "/modia/decision_components/pedestrian/decisions",                "topicType": MODIADecisions},
 {"name": "M_Ln_Ch",  "errRate": 3,    "warnRate": 5,  "topicName": "/modia/decision_components/lane_change/decisions",               "topicType": MODIADecisions},
 {"name": "M_Ps_Ob",  "errRate": 3,    "warnRate": 5,  "topicName": "/modia/decision_components/pass_obstacle/decisions",             "topicType": MODIADecisions},
 {"name": "M_Arb",    "errRate": 1,    "warnRate": 5,  "topicName": "/modia/decision_components/arbiter_decision",                    "topicType": DecisionList},
 {"name": "Drv_Plan", "errRate": 3,    "warnRate": 5,  "topicName": "/drive_plan",                                                    "topicType": DriveGoalList},
 {"name": "TrajP",    "errRate": 5,    "warnRate": 8,  "topicName": "/lane_planner_state",                                            "topicType": LanePlannerState},
 {"name": "TrajC",    "errRate": 60,   "warnRate": 80, "topicName": "/lane_follower_state",                                           "topicType": TrajectoryControllerState},
 {"name": "bsm",      "errRate": 10,   "warnRate": 80, "topicName": "/bsm",                                                           "topicType": BSM},
 {"name": "intent",   "errRate": 2,    "warnRate": 20, "topicName": "/intent",                                                        "topicType": INTENT},
]

cmds = [
  {"name": "ALL",           "command": " ", "nodes" : " "},
  {"name": "tf_sys",        "command": "roslaunch nrc_svcs leaf_tf_subsystem.launch sanborn:=true"},
  # {"name": "ublox-gps",   "command": "rosrun nrc_hw_svcs ublox_node.py --name ublox_gps",         "nodes": "/ublox_gps",      "inclByDef" : True},
  # {"name": "ublox-conv",  "command": "rosrun nrc_hw_svcs ublox_conv --name ublox_conv",           "nodes": "/ublox_conv",     "inclByDef" : True},
  {"name": "swiftnav-gps",  "command": "roslaunch nrc_hw_svcs swiftnav_gps.launch", "inclByDef" : True},
  # {"name": "swiftnav-conv", "command": "rosrun nrc_hw_svcs swiftnav_conv.py --node_name swiftnav_conv --map_shift --map_shift_cfg=`rospack find nrc_hw_svcs`/scripts/cfg/demo2021_mapShift.json",  "nodes": "/swiftnav_conv", "inclByDef" : True},
  {"name": "swiftnav-conv", "command": "rosrun nrc_hw_svcs swiftnav_conv.py --node_name swiftnav_conv --map_shift_cfg=`rospack find nrc_hw_svcs`/scripts/cfg/demo2021_mapShift.json",  "nodes": "/swiftnav_conv", "inclByDef" : True},
  {"name": "CAN",           "command": "roslaunch nrc_leaf can_communication_modular.launch numChannels:=4 CanVConsumer:=true CanVConsumerCh:=3 CanIcConsumer:=false CanIcConsumerCh:=1 Eyeq3Prod:=true Eyeq3ProdCh:=1 ContiRadar:=true ContiRadarCh:=1", "nodes": "/can_com_controller", "inclByDef" : True},
  {"name": "modia",         "command": "roslaunch nrc_dm_svcs modia_all.launch"},
  {"name": "traj_plan",     "command": "roslaunch nrc_ralp_svcs leaf_planner.launch use_predictor:=true publish_force_control:=true vehicle_type:=LeafFS", "inclByDef" : True},
  # {"name": "telemetry",   "command": "roslaunch nrc_svcs telemetry_bridge.launch agent_name:=NRC_Leaf_Foxtrot", "inclByDef" : False},
  {"name": "bsm_pub",       "command": "~/projects/cv-platform/swm_ws/src/ros-impl/bsm-pub.sh",     	  "nodes": "/bsm_pub",        "inclByDef" : True},
  {"name": "intent_pub",    "command": "~/projects/cv-platform/swm_ws/src/ros-impl/intent-pub.sh",  	  "nodes": "/intent_pub",     "inclByDef" : True},
  {"name": "vz-gateway",    "command": "~/projects/cv-platform/swm_ws/src/vzgateway/start_veh_vzgateway.sh", "nodes": "veh_vzgateway",   "inclByDef" : True},
  {"name": "ros-ws-bridge", "command": "roslaunch rosbridge_server rosbridge_websocket.launch", "inclByDef": True},
  {"name": "get_leade_using_ME3", "command": "rosrun nrc_ralp_svcs GetLeaderNode", "inclByDef": True},
]

dest_list = [
    {"name": "AILSV", "posX": 4800.9, "posY": -2233.1, "posTh": 0.0},
    {"name": "Corvin", "posX": 4965.1, "posY": -2246.3, "posTh": 0.0},
    {"name": "Kifer", "posX": 4848.5, "posY": -2433.1, "posTh": 0.0},
    {"name": "Parking Right Turn", "posX": 3904.0, "posY": -1438.2, "posTh": 0.0},
    {"name": "Parking Straight",   "posX": 3861.2, "posY": -1447.9, "posTh": 0.0},
]

multi_dest_list = [
    {"name": "Intelligent Intersection", "dests": [
            {"posX": 3904.0, "posY": -1438.2, "posTh": 0.0},
            {"posX": 3861.2, "posY": -1447.9, "posTh": 0.0},
        ]
    }
]

interfaceHealth(name, machines, sensors, algs, cmds, dest_list, multi_dest_list)

