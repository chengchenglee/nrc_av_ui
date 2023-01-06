#!/usr/bin/python

from interface_main import *

name = "Charlie Interface"

machines = [
 {"name": "GPSBASE","addr": "ddl-ntrip.stanford.edu"},
 {"name": "KITT",   "addr": "doris.ail-sv.com"},
 {"name": "TIME",   "addr": "10.152.36.31"},
 {"name": "leafmry","addr": "10.152.36.20"},
 {"name": "mrcy01", "addr": "10.152.36.21"},
 {"name": "mrcy02", "addr": "10.152.36.22"},
 {"name": "mrcy03", "addr": "10.152.36.23"}
]

sensors = [
 {"name": "GPSCONV", "errRate": 60, "warnRate": 80, "topicName": "/dynamic_global_pose_conv",      "topicType": DynamicPoseWithCovar},
 {"name": "GPS",     "errRate": 10, "warnRate": 80, "topicName": "/dynamic_global_pose",           "topicType": DynamicPoseWithCovar},
 {"name": "VLDY",    "errRate": 1,  "warnRate": 8,  "topicName": "/velodyne_packets",              "topicType": VelodyneScan},
 {"name": "CAR",     "errRate": 3,  "warnRate": 6,  "topicName": "/CtrlStateFLG",                  "topicType": CtrlStateFLG},
 {"name": "RADAR",   "errRate": 6,  "warnRate": 10, "topicName": "/Radar_ObjData",                 "topicType": MilliWaveRadarArray},
 {"name": "ME3",     "errRate": 6,  "warnRate": 10, "topicName": "/ME3_ObjData",                   "topicType": Mobileye3ObjectArray},
 {"name": "IBEO",    "errRate": 10, "warnRate": 15, "topicName": "/ibeo_object_set",               "topicType": IbeoObjectSet},
 {"name": "TC_F",    "errRate": 3,  "warnRate": 5,  "topicName": "/tower_cam_front/image_raw",     "topicType": CompressedImage},
 {"name": "TC_FR",   "errRate": 3,  "warnRate": 5,  "topicName": "/tower_cam_frontRight/image_raw","topicType": CompressedImage},
 {"name": "TC_FL",   "errRate": 3,  "warnRate": 5,  "topicName": "/tower_cam_frontLeft/image_raw", "topicType": CompressedImage},
 {"name": "TC_B",    "errRate": 3,  "warnRate": 5,  "topicName": "/tower_cam_back/image_raw",      "topicType": CompressedImage},
 {"name": "TC_BR",   "errRate": 3,  "warnRate": 5,  "topicName": "/tower_cam_backRight/image_raw", "topicType": CompressedImage},
 {"name": "TC_BL",   "errRate": 3,  "warnRate": 5,  "topicName": "/tower_cam_backLeft/image_raw",  "topicType": CompressedImage},
]

algs = [
 {"name": "DRV_A",  "errRate": 3,  "warnRate": 7,  "topicName": "/drivable_area_boundary_points",     "topicType": PointCloud2},
 {"name": "VIS_SP", "errRate": 3,  "warnRate": 7,  "topicName": "/visible_space_data",                "topicType": VisibleSpace},
 {"name": "FUSION", "errRate": 10, "warnRate": 15, "topicName": "/target_tracker/tracked_object_set", "topicType": TrackedObjectSet},
 {"name": "WOS",    "errRate": 3,  "warnRate": 7,  "topicName": "/master_filter/object_database",     "topicType": TrackedObjectHypothesisSet},
 {"name": "LLRP",   "errRate": 3,  "warnRate": 6,  "topicName": "/route_plan/lane_level_route_plan",  "topicType": LaneLevelRoutePlan},
 {"name": "LSD",    "errRate": 3,  "warnRate": 6,  "topicName": "/lane_selection_decisions",          "topicType": DriveDecisionList},
 {"name": "EXEC",   "errRate": 3,  "warnRate": 6,  "topicName": "/plan_state_tracking/plan_state",    "topicType": PlanState},
 {"name": "TrajP",  "errRate": 5,  "warnRate": 8,  "topicName": "/lane_planner_state",                "topicType": LanePlannerState},
 {"name": "TrajC",  "errRate": 60, "warnRate": 80, "topicName": "/lane_follower_state",               "topicType": TrajectoryControllerState},
]

cmds = [
  {"name": "ALL",      "command": " ", "nodes" : " "},
  {"name": "tf_sys",   "command": "roslaunch nrc_svcs leaf_tf_subsystem.launch sanborn:=true"},
  {"name": "telemetry","command": "roslaunch nrc_svcs telemetry_bridge.launch agent_name:=NRC_Leaf_Charlie"},
  {"name": "can_com",  "command": "roslaunch nrc_leaf can_communication.launch ctrl_machine1:=nuc01 vehicleType:=Q50_GEN1 controlMode:=FS_CTRL"},
  {"name": "gps_raw",  "command": "roslaunch nrc_hw_svcs gps.launch gps_machine:=nuc01 q50:=false here2016:=false sanborn:=true"},
  {"name": "pose_est", "command": "roslaunch loc_svcs pose_estimators.launch localization_machine:=nuc01 sim_mode:=false use_map_pose:=false"},
  {"name": "velodyne", "command": "roslaunch velodyne_pointcloud VLS128_points.launch velodyne_machine:=local"},
  {"name": "vldy_proc","command": "roslaunch nrc_pcp_svcs pc_processor.launch Leaf_Foxtrot:=true Leaf_Charlie:=false"},
  {"name": "vis_area", "command": "rosrun nrc_perc_svcs visible_space_fusion __name:=VisAreaNode", "nodes" : "VisAreaNode"},
  {"name": "world_mdl","command": "roslaunch nrc_wm_svcs master_rbpf_store.launch runRbpfAnalyser:=false"},
  {"name": "rte_plan", "command": "rosrun nrc_dm_svcs sam_route_manager_node __name:=sam_route_manager", "nodes" : "sam_route_manager"}, 
  {"name": "rte_mgr", "command": "roslaunch nrc_dm_svcs route_planner.launch route_planner_machine:=local use_ym0_route_planner:=true"},
  {"name": "DM",       "command": "roslaunch nrc_dm_svcs behavior_exec.launch enable_meta_reasoning_and_exception_handling:=true"},
  {"name": "traj_plan","command": "roslaunch nrc_ralp_svcs leaf_planner.launch use_predictor:=true publish_force_control:=true vehicle_type:=LeafFS"},
]
  
interfaceHealth(name, machines, sensors, algs, cmds)

