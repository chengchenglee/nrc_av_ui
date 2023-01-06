#!/usr/bin/python

from interface_main import *

agent_name = "Charlie"

machines = [
 {"name": "GPSBASE","addr": "ddl-ntrip.stanford.edu"},
 {"name": "KITT",   "addr": "doris.ail-sv.com"},
 {"name": "TIME",   "addr": "10.152.36.31"},
 {"name": "nuvo","addr": "localhost"},
 {"name": "zbox01", "addr": "10.152.36.201"},
 {"name": "zbox02", "addr": "10.152.36.202"},
 {"name": "zbox03", "addr": "10.152.36.203"},
 {"name": "nuc01", "addr": "10.152.36.21"},
 {"name": "nuc02", "addr": "10.152.36.22"},
 {"name": "nuc03", "addr": "10.152.36.23"},
 {"name": "nuc04", "addr": "10.152.36.24"},
]

sensors = [
 {"name": "GPSCONV", "errRate": 60, "warnRate": 80, "topicName": "/dynamic_global_pose_conv",      "topicType": DynamicPoseWithCovar},
 {"name": "GPS",     "errRate": 10, "warnRate": 80, "topicName": "/dynamic_global_pose",           "topicType": DynamicPoseWithCovar},
 {"name": "VLDY",    "errRate": 1,  "warnRate": 8,  "topicName": "/velodyne_packets",              "topicType": VelodyneScan},
 {"name": "CAR",     "errRate": 3,  "warnRate": 6,  "topicName": "/CtrlStateFLG",                  "topicType": CtrlStateFLG},
 {"name": "RADAR",   "errRate": 6,  "warnRate": 10, "topicName": "/Radar_ObjData",                 "topicType": MilliWaveRadarArray},
 {"name": "ME3",     "errRate": 6,  "warnRate": 10, "topicName": "/ME3_ObjData",                   "topicType": Mobileye3ObjectArray},
 {"name": "IBEO",    "errRate": 10, "warnRate": 15, "topicName": "/ibeo_object_set",               "topicType": IbeoObjectSet},
 {"name": "TC_F",    "errRate": 3,  "warnRate": 5,  "topicName": "/tower_cam_front/image_stamped",     "topicType": DiagnosticArray},
 {"name": "TC_FR",   "errRate": 3,  "warnRate": 5,  "topicName": "/tower_cam_frontRight/image_stamped","topicType": DiagnosticArray},
 {"name": "TC_FL",   "errRate": 3,  "warnRate": 5,  "topicName": "/tower_cam_frontLeft/image_stamped", "topicType": DiagnosticArray},
 {"name": "TC_B",    "errRate": 3,  "warnRate": 5,  "topicName": "/tower_cam_back/image_stamped",      "topicType": DiagnosticArray},
 {"name": "TC_BR",   "errRate": 3,  "warnRate": 5,  "topicName": "/tower_cam_backRight/image_stamped", "topicType": DiagnosticArray},
 {"name": "TC_BL",   "errRate": 3,  "warnRate": 5,  "topicName": "/tower_cam_backLeft/image_stamped",  "topicType": DiagnosticArray},
]

algs = [
 {"name": "DRV_A",  "errRate": 3,  "warnRate": 7,  "topicName": "/drivable_area_boundary_points",     "topicType": PointCloud2},
 {"name": "VIS_SP", "errRate": 3,  "warnRate": 7,  "topicName": "/visible_space_data",                "topicType": VisibleSpace},
 {"name": "VelObj", "errRate": 3, "warnRate": 5, "topicName": "/pc_processor/multi_object_tracker/tracked_object_set", "topicType": TrackedObjectSet},
 {"name": "FrYOLO", "errRate": 3, "warnRate": 5,  "topicName": "/detection_recog_results/tower_cam_front","topicType": ImageRecogResult},
 {"name": "Fusion", "errRate": 3, "warnRate": 5, "topicName": "/object_tracker/health", "topicType": DiagnosticArray},
 {"name": "WOS",    "errRate": 0.1,  "warnRate": 0.5,  "topicName": "/master_filter/health", "topicType": DiagnosticArray},
 {"name": "TLR", "errRate": 9, "warnRate": 50, "topicName": "/traffic_light_state_simple", "topicType": ym0_traffic_light_state_simple},
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
 {"name": "TrajP",  "errRate": 5,  "warnRate": 8,  "topicName": "/lane_planner_state",                "topicType": LanePlannerState},
 {"name": "TrajC",  "errRate": 60, "warnRate": 80, "topicName": "/lane_follower_state",               "topicType": TrajectoryControllerState},
]

cmds = [
  {"name": "ALL",      "command": " ", "nodes" : " "},
  {"name": "gps_raw",  "command": "roslaunch nrc_hw_svcs gps.launch gps_machine:=nuc01 q50:=false here2016:=false sanborn:=true oh_shift:=false startNtrip:=false", "inclByDef" : True},
  {"name": "pose_est", "command": "roslaunch loc_svcs pose_estimators.launch localization_machine:=nuc01 sim_mode:=false use_map_pose:=false", "inclByDef" : True},
  {"name": "tf_sys",   "command": "roslaunch nrc_svcs leaf_tf_subsystem.launch sanborn:=true", "inclByDef" : True},
  #{"name": "telemetry","command": "roslaunch nrc_svcs telemetry_bridge.launch agent_name:=NRC_Leaf_Charlie", "inclByDef" : False},
  {"name": "can_com",  "command": " roslaunch nrc_leaf can_communication_modular.launch machine:=nuc01  Can1Consumer:=true Can2Consumer:=true Can2ConsumerCh:=1  Can1WriterHD_CTRL:=true Can1WriterHD_CTRLCh:=1", "inclByDef" : True},
  {"name": "meye",     "command": "roslaunch nrc_leaf can_communication_modular.launch machine:=nuc02 Eyeq3:=true nodeName:=meye3Consumer", "inclByDef" : True},
   #{"name": "gps_ushr",  "command": "roslaunch nrc_hw_svcs gps.launch gps_machine:=nuc01 q50:=false here2016:=false sanborn:=false ushr:=false oh_shift:=false startNtrip:=false", "inclByDef" :False},
  #{"name": "gps_shft", "command": "roslaunch nrc_hw_svcs gps.launch q50:=false here2016:=false sanborn:=true oh_shift:=true startNtrip:=false", "inclByDef" : False},
  {"name": "t-cams",   "command": "roslaunch nrc_hw_svcs time_stamp_pgr_cam.launch pgr_machine1:=zbox01 pgr_machine2:=zbox03 pgr_machine3:=zbox03 leaf_charlie:=true", "inclByDef" : True}, 
  #{"name": "ntrip",    "command": "rosrun nrc_hw_svcs ntripCommand-leaf.sh __name:=ntripNode args:=Serial NRC", "nodes" : "ntripNode"},
  {"name": "ibeo",     "command": "roslaunch nrc_hw_svcs ibeo.launch ibeoIpAddress:=10.152.36.100 ibeo_machine:=nuc02","inclByDef" : True},
  #{"name": "velodyne", "command": "roslaunch velodyne_pointcloud VLS128_points.launch velodyne_machine:=zbox02 leaf_bravo:=false leaf_charlie:=true" , "inclByDef" : False},
  #{"name": "vldy_proc","command": "roslaunch nrc_pcp_svcs pc_processor.launch velodyne_machine:=zbox02 Leaf_Charlie:=true Leaf_Foxtrot:=false publish_visible_space_overlay:=true do_visible_space_extraction:=true", "inclByDef" : False},
  {"name": "yolo_proc","command": "roslaunch nrc_perc_svcs simple_object_detectors.launch yolov1:=true pgr_machine1:=zbox01 pgr_machine2:=zbox03 pgr_machine3:=zbox03 FrCam:=true FrRCam:=true FrLCam:=true", "inclByDef" : True},                         
  #{"name": "vis_area", "command": "rosrun nrc_perc_svcs visible_space_fusion __name:=VisAreaNode", "nodes" : "VisAreaNode", "inclByDef" : True},
  {"name": "vis_area", "command": "roslaunch nrc_perc_svcs visible_space.launch vs_machine:=nuc02", "inclByDef" : True},
  {"name": "world_mdl","command": "roslaunch nrc_wm_svcs master_rbpf_store.launch runRbpfAnalyser:=false master_rbpf_store_machine:=nuc01", "inclByDef" : True},
  {"name": "TLR", "command": "roslaunch nrc_dm_svcs ym0_traffic_light_state_new.launch zbox:=true run_standalone:=true use_vehicle_feeder:=true use_yolo:=true", "inclByDef" : False},
  {"name": "simpleTLR", "command": "~/projects/nrc_ws/src/nrc_dm/nrc_dm_svcs/src/abstractions/the_simplest_simple_traffic_light_detector/the_simplest_simple_traffic_light_detector.py", "inclByDef" : False},
  {"name": "modia",     "command": "roslaunch nrc_dm_svcs modia_all.launch autonomy_level:=ad5 modia_machine:=nuc03", "inclByDef" : True},
  {"name": "traj_plan","command": "roslaunch nrc_ralp_svcs leaf_planner.launch use_predictor:=true publish_force_control:=true vehicle_type:=LeafFS laneplanner_machine:=nuc01", "inclByDef" : True},
  {"name": "Human-autonomy", "command": "roslaunch nrc_perc_svcs humanising_autonomy.launch model_performance_profile:=High vehicle_name:=Charlie camera_topic:=/tower_cam_front/image_stamped img_downscale_factor:=TwoFifths humanising_autonomy_machine:=node03", "inclByDef": False},
]

dest_list = [
    {"name": "Dest 0", "posX": 4695.0, "posY": -1138.0,  "posTh": -3.066},
    {"name": "Dest 1", "posX": 4017.0, "posY": -776.0,   "posTh":  1.607},
    {"name": "Dest 2", "posX": 3462.0, "posY": -648.0,   "posTh": -3.066},
    {"name": "Dest 3", "posX": 3336.0, "posY": -596.0,   "posTh": -1.603},
    {"name": "Dest 4", "posX": 3834.0, "posY": -1720.0,  "posTh": -1.603},
    {"name": "Dest 5", "posX": 4907.0, "posY": -1862.0,  "posTh": 0.0},
    {"name": "Dest 6", "posX": 4700.0, "posY": -2200.0,  "posTh": -3.066},
    {"name": "3400 parking 6", "posX": 4820.66015625, "posY": -2270.52368164,  "posTh": -3.1365988},
    {"name": "Cul-de-sac", "posX": 3610.3 , "posY": -735.0 , "posTh": 0.0},
    {"name": "Driver Burden", "posX": 4951.45, "posY": -2245.51, "posTh": 0.0},
    {"name": "Driver Burden 2", "posX":4896.37, "posY":-2562.77, "posTh": -3.066},
]

multi_dest_list = [
    {"name": "Autonomy 5k", "dests": [
            {"posX": 4695.0, "posY": -1138.0,  "posTh": -3.066},
            {"posX": 4017.0, "posY": -776.0,   "posTh":  1.607},
            {"posX": 3462.0, "posY": -648.0,   "posTh": -3.066},
            {"posX": 3336.0, "posY": -596.0,   "posTh": -1.603},
            {"posX": 3834.0, "posY": -1720.0,  "posTh": -1.603},
            {"posX": 4907.0, "posY": -1862.0,  "posTh": 0.0},
            {"posX": 4700.0, "posY": -2200.0,  "posTh": -3.066},
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

