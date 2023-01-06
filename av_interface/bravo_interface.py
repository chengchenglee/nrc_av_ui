#!/usr/bin/python

from interface_main import *
from cda_msgs.msg import *

agent_name = "NRC_Leaf_Bravo"

machines = [
 {"name": "GPSBASE", "addr": "ddl-ntrip.stanford.edu"},
 {"name": "DORIS",   "addr": "doris.ail-sv.com"},
 {"name": "TIME",    "addr": "10.152.36.31"},
 #{"name": "node01",  "addr": "192.168.210.11"},
 #{"name": "node02",  "addr": "192.168.210.12"},
 #{"name": "node03",  "addr": "192.168.210.13"},
 #{"name": "node04",  "addr": "192.168.210.14"},
 #{"name": "node05",  "addr": "192.168.210.15"},
]

sensors = [
 {"name": "GPSCONV", "errRate": 60, "warnRate": 80, "topicName": "/dynamic_global_pose_conv",          "topicType": DynamicPoseWithCovar},
 {"name": "GPS",     "errRate": 10, "warnRate": 80, "topicName": "/dynamic_global_pose",               "topicType": DynamicPoseWithCovar},
 {"name": "VLDY",    "errRate": 1,  "warnRate": 8,  "topicName": "/velodyne_packets",                  "topicType": VelodyneScan},
 {"name": "CAR",     "errRate": 3,  "warnRate": 6,  "topicName": "/CtrlStateFLG",                      "topicType": CtrlStateFLG},
 {"name": "RADAR",   "errRate": 6,  "warnRate": 10, "topicName": "/Radar_ObjData",                     "topicType": MilliWaveRadarArray},
 {"name": "Eyeq4",   "errRate": 0.2,"warnRate": 0.3,"topicName": "/ME4_ObjData",                       "topicType": Mobileye4ObjectArray},
 {"name": "IBEO",    "errRate": 10, "warnRate": 15, "topicName": "/ibeo_object_set",                   "topicType": IbeoObjectSet},
 {"name": "TC_F",    "errRate": 1,  "warnRate": 2,  "topicName": "/tower_cam_front/image_stamped",     "topicType": DiagnosticArray},
 {"name": "TC_FR",   "errRate": 1,  "warnRate": 2,  "topicName": "/tower_cam_frontRight/image_stamped","topicType": DiagnosticArray},
 {"name": "TC_FL",   "errRate": 1,  "warnRate": 2,  "topicName": "/tower_cam_frontLeft/image_stamped", "topicType": DiagnosticArray},
 {"name": "TC_B",    "errRate": 1,  "warnRate": 2,  "topicName": "/tower_cam_back/image_stamped",      "topicType": DiagnosticArray},
 {"name": "TC_BR",   "errRate": 1,  "warnRate": 2,  "topicName": "/tower_cam_backRight/image_stamped", "topicType": DiagnosticArray},
 {"name": "TC_BL",   "errRate": 1,  "warnRate": 2,  "topicName": "/tower_cam_backLeft/image_stamped",  "topicType": DiagnosticArray},
]

algs = [
 {"name": "DRV_A",   "errRate": 3,   "warnRate": 7,  "topicName": "/drivable_area_boundary_points",                                 "topicType": PointCloud2},
 {"name": "VIS_SP",  "errRate": 3,   "warnRate": 5,  "topicName": "/visible_space_data",                                            "topicType": VisibleSpace},
 {"name": "VldyObj", "errRate": 3,   "warnRate": 7,  "topicName": "/pc_processor/multi_object_tracker/tracked_object_set",          "topicType": TrackedObjectSet},
 {"name": "FrYOLO",  "errRate": 1,   "warnRate": 2,  "topicName": "/detection_recog_results/tower_cam_front",                       "topicType": ImageRecogResult},
 {"name": "FrRYOLO", "errRate": 1,   "warnRate": 2,  "topicName": "/detection_recog_results/tower_cam_frontRight",                  "topicType": ImageRecogResult},
 {"name": "FrLYOLO", "errRate": 1,   "warnRate": 2,  "topicName": "/detection_recog_results/tower_cam_frontLeft",                   "topicType": ImageRecogResult},
 {"name": "Fusion",  "errRate": 3,   "warnRate": 5,  "topicName": "/object_tracker/health",                                         "topicType": DiagnosticArray},
 {"name": "WOS",     "errRate": 0.1, "warnRate": 0.5,"topicName": "/master_filter/health",                                          "topicType": DiagnosticArray},
 {"name": "TLR",     "errRate": 9,   "warnRate": 50, "topicName": "/traffic_light_state_simple",                                    "topicType": ym0_traffic_light_state_simple},
 {"name": "M_Rte",   "errRate": 0.5, "warnRate": 1,  "topicName": "/modia/route_plan/health",                                       "topicType": DiagnosticArray},
 #{"name": "M_Ma_Ab", "errRate": 0.5,  "warnRate": 1,  "topicName": "/modia/information/get_extracted_metric_map...",                  "topicType": TODO},
 {"name": "M_In_Ab", "errRate": 0.5, "warnRate": 1,  "topicName": "/modia/information/intersection",                                "topicType": IntersectionInformation},
 {"name": "M_Ve_Ab", "errRate": 0.5, "warnRate": 1,  "topicName": "/modia/information/vehicle",                                     "topicType": VehicleInformation},
 {"name": "M_Pe_Ab", "errRate": 0.5, "warnRate": 1,  "topicName": "/modia/information/pedestrian",                                  "topicType": PedestrianInformation},
 {"name": "M_Bl_Ab", "errRate": 3,   "warnRate": 5,  "topicName": "/modia/information/blocking",                                    "topicType": BlockingInformation},
 {"name": "M_St_St", "errRate": 3,   "warnRate": 5,  "topicName": "/modia/decision_components/stop_stop/decisions",                 "topicType": MODIADecisions},
 {"name": "M_St_Un", "errRate": 3,   "warnRate": 5,  "topicName": "/modia/decision_components/stop_uncontrolled/decisions",         "topicType": MODIADecisions},
 {"name": "M_Un_Un", "errRate": 3,   "warnRate": 5,  "topicName": "/modia/decision_components/uncontrolled_uncontrolled/decisions", "topicType": MODIADecisions},
 {"name": "M_Tr_Lt", "errRate": 3,   "warnRate": 5,  "topicName": "/modia/decision_components/traffic_light/decisions",             "topicType": MODIADecisions},
 {"name": "M_Ped",   "errRate": 3,   "warnRate": 5,  "topicName": "/modia/decision_components/pedestrian/decisions",                "topicType": MODIADecisions},
 {"name": "M_Ln_Ch", "errRate": 3,   "warnRate": 5,  "topicName": "/modia/decision_components/lane_change/decisions",               "topicType": MODIADecisions},
 {"name": "M_Ps_Ob", "errRate": 3,   "warnRate": 5,  "topicName": "/modia/decision_components/pass_obstacle/decisions",             "topicType": MODIADecisions},
 {"name": "TrajP",   "errRate": 5,   "warnRate": 8,  "topicName": "/lane_planner_state",                                            "topicType": LanePlannerState},
 {"name": "TrajC",   "errRate": 60,  "warnRate": 80, "topicName": "/lane_follower_state",                                           "topicType": TrajectoryControllerState},
 {"name": "bsm",     "errRate": 3,   "warnRate": 5,  "topicName": "/bsm",                                                           "topicType": BSM},
 {"name": "intent",  "errRate": 3,   "warnRate": 5,  "topicName": "/intent",                                                        "topicType": INTENT},
]

cmds = [
  {"name": "ALL",      "command": " ", "nodes" : " "},
  
  {"name": "1 - tf_sys",   "command": "roslaunch nrc_svcs leaf_tf_subsystem.launch sanborn:=true", "inclByDef" : True},
  {"name": "1 - can_com",  "command": "roslaunch nrc_leaf can_communication_modular.launch numChannels:=5 Can1Consumer:=true Can1ConsumerCh:=0 Can2Consumer:=true Can2ConsumerCh:=1  Can1WriterHD_CTRL:=true Can1WriterHD_CTRLCh:=1 Eyeq4Dev:=true Eyeq4DevCh:=2 Eyeq4DevWrite:=true Eyeq4DevWriteCh:=2 ARS300Consumer:=true ARS300ConsumerCh:=0", "inclByDef" : True},
  {"name": "1 - gps_raw",  "command": "roslaunch nrc_hw_svcs gps.launch q50:=false here2016:=false sanborn:=true oh_shift:=false startNtrip:=false", "inclByDef" : True},
  {"name": "1 - pose_est", "command": "roslaunch loc_svcs pose_estimators.launch sim_mode:=false use_map_pose:=false", "inclByDef" : True},
  
  {"name": "2 - telemetry","command": "roslaunch nrc_svcs telemetry_bridge_v6.launch agent_name:=NRC_Leaf_Bravo"},
  {"name": "2 - velodyne", "command": "roslaunch velodyne_pointcloud VLS128_points.launch velodyne_machine:=local", "inclByDef" : True},
  {"name": "2_vldy_proc","command": "roslaunch nrc_pcp_svcs pc_processor.launch Leaf_Foxtrot:=true", "inclByDef" : True},
  {"name": "2 - vis_area", "command": "roslaunch nrc_perc_svcs visible_area.launch va_machine:=node02", "inclByDef" : True},
  {"name": "2 - TowerCamsF",     "command": "roslaunch nrc_hw_svcs pgr_gige_cameras.launch FrRCam:=true FrLCam:=true FrCam:=true BaRCam:=false BaLCam:=false BaCam:=false enableArduino:=true video_preprocess:=true leaf_bravo:=true", "inclByDef" : False},
  {"name": "2 - FwdYOLO",       "command": "roslaunch nrc_perc_svcs simple_object_detectors.launch yolov3:=true FrCam:=true FrRCam:=true FrLCam:=true targetSkippedMsgs:=0", "inclByDef" : True},
  {"name": "2 - TLR", "command": "rosrun nrc_dm_svcs mobileye_traffic_light_converter", "inclByDef" : True},
    
  {"name": "2b - VideoEncoders",  "command": "roslaunch video_streamer video_encoders.launch", "inclByDef" : False},
  {"name": "2b - VideoStreamer",  "command": "roslaunch video_streamer video_streamer.launch", "inclByDef" : False},
  #{"name": "swm_node","command": "rosrun nrc_wm_svcs SWMMultiSourceNode.jl", "nodes": "swm_node", "inclByDef" : True},
  #{"name": "swm_demo_node","command": "rosrun nrc_wm_svcs SWMMultiSourceNode_SWM_Demo.jl", "nodes": "swm_node", "inclByDef" : False},
  
  {"name": "3 - world_mdl",     "command": "roslaunch nrc_wm_svcs master_rbpf_store.launch runRbpfAnalyser:=false", "inclByDef" : True},
  {"name": "3 - modia",         "command": "roslaunch nrc_dm_svcs modia_all.launch autonomy_level:=ad5 modia_machine:=node02"},
  {"name": "3 - traj_plan",     "command": "roslaunch nrc_ralp_svcs leaf_planner.launch use_predictor:=true publish_force_control:=true vehicle_type:=LeafFS"},
  
  {"name": "4 - bsm_pub",       "command": "cd `rospack find ros-impl` && ./bsm-pub.sh",                "nodes": "/bsm_pub",      "inclByDef": False},
  {"name": "4 - intent_pub",    "command": "cd `rospack find ros-impl` && ./intent-pub.sh",             "nodes": "/intent_pub",   "inclByDef": False},
  {"name": "4 - vz-gateway",    "command": "cd `rospack find vzgateway`&& ./start_sensor_vzgateway.sh", "nodes": "veh_vzgateway", "inclByDef": False},
  {"name": "to_bsm_pub",    "command": "cd `rospack find ros-impl` && ./to-bsm-pub.sh",             "nodes": "/to_bsm_pub",   "inclByDef": False},
  {"name": "TowerCamsB",     "command": "roslaunch nrc_hw_svcs pgr_gige_cameras.launch FrRCam:=false FrLCam:=false FrCam:=false BaRCam:=true BaLCam:=true BaCam:=true enableArduino:=false video_preprocess:=false leaf_bravo:=true", "inclByDef" : False},
  {"name": "Human-autonomy", "command": "roslaunch nrc_perc_svcs humanising_autonomy.launch model_performance_profile:=High vehicle_name:=Bravo camera_topic:=/tower_cam_front/image_stamped img_downscale_factor:=TwoFifths humanising_autonomy_machine:=node03", "inclByDef": False},

]

# the dest_list refers to the finel goal point only
# (and not the starting point)
dest_list = [
    {"name": "AILSV",              "posX": 4800.9, "posY": -2233.1, "posTh": 0.0},
    {"name": "Corvin",             "posX": 4961.5, "posY": -2543.0, "posTh": 0.0},
    {"name": "Kifer",              "posX": 4848.5, "posY": -2433.1, "posTh": 0.0},
    {"name": "Parking Right Turn", "posX": 3904.0, "posY": -1438.2, "posTh": 0.0},
    {"name": "Parking Straight",   "posX": 3861.2, "posY": -1447.9, "posTh": 0.0},
    {"name": "3400 parking", "posX": 4820.66015625, "posY": -2270.52368164,  "posTh": -3.1365988},
    {"name": "Santa Ynez St & Duane Ct", "posX": 4049.863, "posY": -949.668,  "posTh": -3.090},
]

multi_dest_list = [
    {"name": "Auto5k, Short San Miguel", "dests": [
            {"posX": 4735.066, "posY": -1827.617, "posTh": 1.54}, #Arques
            {"posX": 4590.261, "posY": -1319.800, "posTh": 0.0}, #Midas
            {"posX": 4053.639, "posY": -1085.373, "posTh": 0.0},#Right on Duane
            {"posX": 4020.345, "posY": -789.602, "posTh": 0.0},#North on San Tomas
            {"posX": 3469.775, "posY": -647.087, "posTh": 0.0},#West on Amador, before San Ramon
            {"posX": 3338.210, "posY": -755.072, "posTh": 3.14},#South on Santa Paula, before Coachella 
            {"posX": 4071.159, "posY": -1348.208, "posTh": 0.0},#South on Stewart
            {"posX": 4191.960, "posY": -1856.890, "posTh": -1.56},#East on Arques, before Lawrence
            {"posX": 4556.954, "posY": -1862.619, "posTh": -1.64},#East on Arques, after lakeside
            {"posX": 4961.606, "posY": -2097.672, "posTh": 3.15},#South on corvin, before central
            {"posX": 4799.710, "posY": -2235.900, "posTh": 1.55},#In SV pkg lot, main entry road
            {"posX": 4781.070, "posY": -2262.660, "posTh": 3.15},#Demo PUDO location
        ]
    },
]

interfaceHealth(agent_name, machines, sensors, algs, cmds, dest_list, multi_dest_list)


