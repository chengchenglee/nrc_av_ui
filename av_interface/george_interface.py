#!/usr/bin/python

from interface_main import *

agent_name = "George"

machines = [
 {"name": "Self","addr": "localhost"},
]

sensors = [
 {"name": "uBlxGPS", "errRate": 0.2,"warnRate": 0.3,"topicName": "/gps_state",                        "topicType": GpsState},
 {"name": "DGP",     "errRate": 0.2,"warnRate": 0.3,"topicName": "/dynamic_global_pose",              "topicType": DynamicPoseWithCovar},
 {"name": "CAN",     "errRate": 0.2,"warnRate": 0.3,"topicName": "/controller_state",                 "topicType": ControllerState},
 {"name": "Mabx",    "errRate": 0.2,"warnRate": 0.3,"topicName": "/mabx_intelligent_pedal",           "topicType": UInt8MultiArray}, 
 {"name": "Eyeq3",  "errRate": 0.2,"warnRate": 0.3,"topicName": "/ME3_ObjData",                       "topicType": Mobileye3ObjectArray},
 {"name": "Eyeq4",  "errRate": 0.2,"warnRate": 0.3,"topicName": "/ME4_ObjData",                       "topicType": Mobileye4ObjectArray},
 {"name": "Camera", "errRate": 0.2,"warnRate": 0.3,"topicName": "/front_camera/image_stamped", "topicType": DiagnosticArray},
 {"name": "SEye", "errRate": 5,"warnRate": 7,"topicName": "/smart_eye_driver_state", "topicType": SmartEyeData},
]

algs = [
 {"name": "TBD",    "errRate": 3,  "warnRate": 7,  "topicName": "/drivable_area_boundary_points",     "topicType": PointCloud2},
 # Humanising Autonomy
 {"name": "HuAu", "errRate": 3,    "warnRate": 5,  "topicName": "/humanising_autonomy",           "topicType": HumanisingAutonomy},
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
 {"name": "iPedal", "errRate": 3,  "warnRate": 7,  "topicName": "/ie_poi",                            "topicType": PolygonStamped},
]

cmds = [
 {"name": "ALL",        "command": " ", "nodes" : " "},
 {"name": "tf_sys",     "command": "roslaunch nrc_svcs leaf_tf_subsystem.launch sanborn:=true", "inclByDef" : True},
 {"name": "ublox-gps",  "command": "rosrun nrc_hw_svcs ublox_node.py --name ublox_gps","nodes": "/ublox_gps", "inclByDef" : True},
 {"name": "ublox-conv", "command": "rosrun nrc_hw_svcs ublox_conv _use_filter:=false --name ublox_conv","nodes": "/ublox_conv", "inclByDef" : True},
 {"name": "CAN",        "command": "roslaunch nrc_leaf can_communication_modular.launch numChannels:=5 CanVConsumer:=true CanIntelPedalWriter:=true CanIntelPedalWriterCh:=1 CanIcConsumer:=true CanIcConsumerCh:=1 Eyeq3Prod:=true Eyeq3ProdCh:=2 Eyeq4Dev:=true Eyeq4DevCh:=3 Eyeq4DevWrite:=true Eyeq4DevWriteCh:=3 Eyeq4DevFS:=true Eyeq4DevFSCh:=4 ContiRadar:=true ContiRadarCh:=2", "nodes": "/can_com_controller", "inclByDef" : True},
 {"name": "iPedal",     "command": "rosrun nrc_ralp_svcs IntelligentPedal2Node", "nodes": "/IntelligentPedal2", "inclByDef" : False},
 {"name": "camera",     "command": "roslaunch nrc_hw_svcs pgr_gige_camera_george.launch", "nodes": "/front_camera/front_camera_nodelet_manager", "inclByDef" : True},
 {"name": "Human-autonomy", "command": "roslaunch nrc_perc_svcs humanising_autonomy.launch model_performance_profile:=High vehicle_name:=George img_downscale_factor:=TwoThirds"},
 {"name": "modia",     "command": "roslaunch nrc_dm_svcs modia_all.launch autonomy_level:=ad5"},
 {"name": "SmartEye",   "command": "rosrun nrc_hw_svcs smart_eye_ros_node.py", "nodes": "/smart_eye_data_node", "inclByDef" : True},
 {"name": "world_mdl",  "command": "roslaunch nrc_wm_svcs master_rbpf_store.launch runRbpfAnalyser:=false", "inclByDef" : True},
 {"name": "TLR", 	"command": "rosrun nrc_dm_svcs mobileye_traffic_light_converter", "inclByDef" : True},
 {"name": "ePedal WOZ", "command": "gnome-terminal -- rosrun nrc_svcs epedal_keyboard_woz_node.py", "nodes": "/keyboard_woz_node", "inclByDef" : False}
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
    {"name": "Autonomy 5k v3 Return", "dests": [
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
