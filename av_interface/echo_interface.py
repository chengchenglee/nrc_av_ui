#!/usr/bin/python

from interface_main import *

agent_name = "Echo"

machines = [
 {"name": "GPSBASE", "addr": "ddl-ntrip.stanford.edu"},
 #{"name": "KITT",    "addr": "doris.ail-sv.com"},
 #{"name": "TIME",    "addr": "10.152.36.31"},
 #{"name": "node01",  "addr": "192.168.210.11"},
 #{"name": "node02",  "addr": "192.168.210.12"},
 #{"name": "node03",  "addr": "192.168.210.13"},
 #{"name": "node04",  "addr": "192.168.210.14"},
 #{"name": "node05",  "addr": "192.168.210.15"},
 ]

sensors = [
 {"name": "CAR",     "errRate": 3,  "warnRate": 6,  "topicName": "/CtrlStateFLG",                  "topicType": CtrlStateFLG},
 {"name": "GPSCONV", "errRate": 60, "warnRate": 80, "topicName": "/dynamic_global_pose_conv",          "topicType": DynamicPoseWithCovar},
 {"name": "GPS",     "errRate": 10, "warnRate": 80, "topicName": "/dynamic_global_pose",               "topicType": DynamicPoseWithCovar},
 {"name": "ME3Prod",     "errRate": 6,  "warnRate": 10, "topicName": "/ME3_ObjData",                   "topicType": Mobileye3ObjectArray},
 {"name": "Eyeq5",  "errRate": 0.2,"warnRate": 0.3,"topicName": "/ME5_ObjData",                        "topicType": Mobileye5ObjectArray},
 {"name": "SmRadar", "errRate": 1,  "warnRate": 8,  "topicName": "/smartmicro_health",                 "topicType": DiagnosticArray},
 #{"name": "LUM_FT",    "errRate": 1,  "warnRate": 8,  "topicName": "/velodyne_health",                   "topicType": DiagnosticArray},
 #{"name": "vz_bsm",  "errRate": 1,  "warnRate": 8,   "topicName": "/vzmode/bsm",                       "topicType": BSM},
]

algs = [
 {"name": "DRV_A",  "errRate": 3,  "warnRate": 7,  "topicName": "/drivable_area_boundary_points",          "topicType": PointCloud2},
 {"name": "VIS_SP", "errRate": 3,  "warnRate": 5,  "topicName": "/visible_space_data",                     "topicType": VisibleSpace},
 {"name": "LuminarObj", "errRate": 3, "warnRate": 7,  "topicName": "/pc_processor/multi_object_tracker/tracked_object_set",   "topicType": TrackedObjectSet},
 {"name": "Fusion", "errRate": 3, "warnRate": 5, "topicName": "/object_tracker/health", "topicType": DiagnosticArray},
 {"name": "WOS",    "errRate": 0.1,  "warnRate": 0.5,  "topicName": "/master_filter/health", "topicType": DiagnosticArray},
 {"name": "TLR", "errRate": 0.5, "warnRate": 0.9, "topicName": "/traffic_light/detection/health", "topicType": DiagnosticArray},
 {"name": "M_Rte",    "errRate": 0.5,  "warnRate": 1,  "topicName": "/modia/route_plan/health",                                       "topicType": DiagnosticArray},
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
 {"name": "TrajP",  "errRate": 5,  "warnRate": 8,  "topicName": "/lane_planner_state",                "topicType": LanePlannerState},
 {"name": "TrajC",  "errRate": 60, "warnRate": 80, "topicName": "/lane_follower_state",               "topicType": TrajectoryControllerState},
 {"name": "bsm",     "errRate": 1,"warnRate": 8,   "topicName": "/bsm",                               "topicType": BSM},
]

cmds = [
  {"name": "ALL",      "command": " ", "nodes" : " "},
  {"name": "1 tf_sys",   "command": "roslaunch nrc_svcs leaf_tf_subsystem.launch sanborn:=true"},
  #{"name": "telemetry","command": "roslaunch nrc_svcs telemetry_bridge_v6.launch agent_name:=NRC_Leaf_Echo", "inclByDef" : False},
  {"name": "1 can_com",  "command": "roslaunch nrc_leaf can_communication_modular.launch numChannels:=4 CanZe1SvConsumer:=true CanZe1SvWriter:=true Eyeq3Prod:=true Eyeq3ProdCh:=1", "inclByDef" : False},
  {"name": "1 eyeq5",  "command": "roslaunch nrc_leaf can_communication_modular.launch machine:=node03 numChannels:=2 Eyeq5DevCh0:=true Eyeq5DevCh0Ch:=0 Eyeq5DevWrite:=true Eyeq5DevWriteCh:=0 Eyeq5DevCh1:=true Eyeq5DevCh1Ch:=1 nodeName:=eyeq5_node", "inclByDef" : False},
  {"name": "1 SmRadar",  "command": "roslaunch nrc_hw_svcs smartmicro_radar.launch radar_machine:=node02", "inclByDef" : False},
  {"name": "1 leaf_ard", "command": "roslaunch nrc_hw_svcs leaf_interface_arduino.launch arduino_machine:=node02"},
  {"name": "1 gps_raw",  "command": "roslaunch nrc_hw_svcs gps.launch q50:=false here2016:=false sanborn:=true oh_shift:=false startNtrip:=false", "inclByDef" : False},
  {"name": "1 pose_est", "command": "roslaunch loc_svcs pose_estimators.launch sim_mode:=false use_map_pose:=false", "inclByDef" : True},
  {"name": "2 telemetry","command": "roslaunch nrc_svcs telemetry_bridge_v6.launch agent_name:=NRC_Leaf_Echo"},
  {"name": "2 luminars", "command": "roslaunch luminar_ros luminar_lidars.launch", "inclByDef" : True},
  {"name": "2 luminar_proc","command": "roslaunch nrc_pcp_svcs pc_processor.launch Leaf_Echo:=true Leaf_Foxtrot:=false  enable_ignore_points_by_overlap_with_prioritized_sensors:=true", "inclByDef" : True},
  {"name": "2 vis_area", "command": "roslaunch nrc_perc_svcs visible_area.launch va_machine:=node02", "inclByDef" : True},  
  #{"name": "TowerCams","command": "roslaunch nrc_hw_svcs pgr_gige_cameras.launch FrRCam:=true FrLCam:=true FrCam:=true BaRCam:=false BaLCam:=false BaCam:=false enableArduino:=true video_preprocess:=true leaf_echo:=true", "inclByDef" : True},
  #{"name": "TowerCamsALL","command": "roslaunch nrc_hw_svcs pgr_gige_cameras.launch FrRCam:=true FrLCam:=true FrCam:=true BaRCam:=true BaLCam:=true BaCam:=true enableArduino:=true video_preprocess:=true leaf_echo:=true", "inclByDef" : True},
  {"name": "2 TLR", "command": "rosrun nrc_dm_svcs mobileye_traffic_light_converter", "inclByDef" : True},
  #{"name": "FwdYOLO",  "command": "roslaunch nrc_perc_svcs simple_object_detectors.launch yolov3:=true FrCam:=true FrRCam:=true FrLCam:=true", "inclByDef" : True},
  {"name": "3 world_mdl","command": "roslaunch nrc_wm_svcs master_rbpf_store.launch runRbpfAnalyser:=false"},
  {"name": "3 world_mdl2", "command": "roslaunch nrc_wm2_svcs leaf_pred.launch"},
  {"name": "3 modia",     "command": "roslaunch nrc_dm_svcs modia_all.launch modia_machine:=node02"},
  {"name": "3 traj_plan","command": "roslaunch nrc_ralp_svcs leaf_planner.launch use_predictor:=true publish_force_control:=true vehicle_type:=LeafFS", "inclByDef" : True},
  #{"name": "vz-mode",  "command": "~/projects/swm_ws/src/vjames/start_vzgateway.sh", "nodes": "vzmodepub vzmodesub", "inclByDef" : False},
]

# the dest_list refers to the finel goal point only
# (and not the starting point)
dest_list = [
    {"name": "Dest 0", "posX": 4695.0, "posY": -1138.0,  "posTh": -3.066},
    {"name": "Dest 1", "posX": 4017.0, "posY": -776.0,   "posTh":  1.607},
    {"name": "Dest 2", "posX": 3462.0, "posY": -648.0,   "posTh": -3.066},
    {"name": "Dest 3", "posX": 3336.0, "posY": -596.0,   "posTh": -1.603},
    {"name": "Dest 4", "posX": 3834.0, "posY": -1720.0,  "posTh": -1.603},
    {"name": "Dest 5", "posX": 4907.0, "posY": -1862.0,  "posTh": 0.0},
    {"name": "Dest 6", "posX": 4700.0, "posY": -2200.0,  "posTh": -3.066},
    {"name": "3400 parking", "posX": 4820.66015625, "posY": -2270.52368164,  "posTh": -3.1365988},
    {"name": "Santa Ynez St & Duane Ct", "posX": 4049.863, "posY": -949.668,  "posTh": -3.090},
    {"name": "Cul-de-sac", "posX": 3610.3 , "posY": -735.0 , "posTh": 0.0},
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
    {"name": "Autonomy 5k v2", "dests": [
            {"posX": 4482.0, "posY": -1688.0,  "posTh": 0.0},
            {"posX": 4482.0, "posY": -1242.0,  "posTh": 0.0},
            {"posX": 4017.0, "posY": -776.0,   "posTh": -3.066},
            {"posX": 3462.0, "posY": -648.0,   "posTh": -3.066},
            {"posX": 3336.0, "posY": -596.0,   "posTh": -1.603},
            {"posX": 3834.0, "posY": -1720.0,  "posTh": -1.603},
            {"posX": 4907.0, "posY": -1862.0,  "posTh": 0.0},
            {"posX": 4700.0, "posY": -2200.0,  "posTh": -3.066},
        ]
    },
    {"name": "Autonomy 5k v3", "dests": [
            {"posX": 4735.066, "posY": -1827.617, "posTh": 0.0},
            {"posX": 4590.261, "posY": -1319.800, "posTh": 0.0},
            {"posX": 4053.639, "posY": -1085.373, "posTh": 0.0},
            {"posX": 4020.345, "posY": -789.602, "posTh": 0.0},
            {"posX": 3469.775, "posY": -647.087, "posTh": 0.0},
            {"posX": 3332.936, "posY": -531.918, "posTh": 0.0},
            {"posX": 4071.159, "posY": -1348.208, "posTh": 0.0},
            {"posX": 4104.929, "posY": -1859.477, "posTh": 0.0},
            {"posX": 4556.954, "posY": -1862.619, "posTh": 0.0},
            {"posX": 4961.606, "posY": -2097.672, "posTh": 0.0},
            {"posX": 4715.133, "posY": -2198.377, "posTh": 0.0},
        ]
    },
    {"name": "Luis' TL Route", "dests": [
            {"posX": 4473.414, "posY": -1235.817, "posTh": 0.0},
            {"posX": 4476.126, "posY": -1562.341, "posTh": 0.0},
            {"posX": 4692.290, "posY": -2199.514, "posTh": 0.0},
        ]
    }
]

interfaceHealth(agent_name, machines, sensors, algs, cmds, dest_list, multi_dest_list)

